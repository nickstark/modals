(function (root, factory) {
    // UMD
    if (typeof define === 'function' && define.amd) {
        define([], factory);
    } else if (typeof exports === 'object') {
        module.exports = factory();
    } else {
        root.ModalService = factory();
    }
}(this, function () {
    'use strict';

    // check for transition support
    var hasTransitions = (function() {
        var b = document.body || document.documentElement,
            s = b.style,
            p = 'transition';

        if (typeof s[p] == 'string') { return true; }

        // Tests for vendor specific prop
        var v = ['Moz', 'webkit', 'Webkit', 'Khtml', 'O', 'ms'];
        p = p.charAt(0).toUpperCase() + p.substr(1);

        for (var i=0; i<v.length; i++) {
            if (typeof s[v[i] + p] == 'string') { return true; }
        }

        return false;
    }());

    /**
     * Service Defaults
     */
    var defaults = {
        removeOnExit: true,
        contentSelector: '[data-modal-content]',
        closeSelector: '[data-modal-close]',
        classes: {
            hidden: 'modal_isHidden',
            positioned: 'modal_isPositioned',
            active: 'modal_isActive'
        },
        templates: {
            alert: 'alertModal',
            confirm: 'confirmModal',
            prompt: 'promptModal'
        }
    };

    /**
     * Extend function for config params
     */
    var extend = function (defaults, options) {
        var extended = {};
        var prop;
        for (prop in defaults) {
            if (Object.prototype.hasOwnProperty.call(defaults, prop)) {
                if (typeof defaults[prop] === 'object') {
                    extended[prop] = extend({}, defaults[prop]);
                } else {
                    extended[prop] = defaults[prop];
                }
            }
        }
        for (prop in options) {
            if (Object.prototype.hasOwnProperty.call(options, prop)) {
                if (typeof defaults[prop] === 'object') {
                    extended[prop] = extend(extended[prop] || {}, options[prop]);
                } else {
                    extended[prop] = options[prop];
                }
            }
        }
        return extended;
    };

    var matches = (function() {
        if (typeof Element.prototype.matches === 'function') {
            return function(node, selector) {
                return node.matches(selector);
            }
        }
        var prefixes = ['webkit', 'ms', 'moz'];
        for (var prefix in prefixes) {
            if (typeof Element.prototype[prefix + 'MatchesSelector'] === 'function') {
                return function(node, selector) {
                    return node[prefix + 'MatchesSelector'](selector);
                }
            }
        }

        throw new Error('Unsupported: unable to match selectors.')
    }());

    /**
     * Modal Instance constructor
     *
     * @class ModalInstance
     * @constructor
     */
    var ModalInstance = function(templateName, service) {
        this.service = service;
        this.config = service.config;
        this.isOpen = false;

        this.handleExitEnd = this._onExitEnd.bind(this);
        this.handleModalClick = this._onModalClick.bind(this);

        this._loadTemplate(templateName);
    };

    ModalInstance.prototype._loadTemplate = function(templateName) {
        var wrapper = document.createElement('div');
        var template = document.getElementById(templateName);

        if (template === null) {
            throw new Error('Unable to find template (' + templateName + ')');
        }

        wrapper.innerHTML = this.config.skeleton;
        this.modal = wrapper.children[0];
        this.modalContent = this.modal.querySelector(this.config.contentSelector);
        this.modalContent.innerHTML = template.innerHTML;
        document.body.appendChild(this.modal);
    };

    ModalInstance.prototype.open = function() {
        var classes = this.config.classes;

        if (this.isOpen) {
            return;
        }
        this.isOpen = true;

        this.modal.classList.add(classes.positioned); // display in DOM
        this.modal.offsetWidth; // trigger layout
        this.modal.classList.add(classes.active); // animate in

        // add listeners
        this.modal.addEventListener('click', this.handleModalClick, false);
    };

    ModalInstance.prototype.exit = function() {
        if (!this.isOpen) {
            return;
        }
        this.isOpen = false;

        // remove after animation
        if (hasTransitions) {
            this.modal.addEventListener('transitionend', this.handleExitEnd, false);
            this.modal.addEventListener('webkitTransitionEnd', this.handleExitEnd, false);
        } else {
            this.modal.classList.remove(this.config.classes.positioned);
        }

        // animate out
        this.modal.classList.remove(this.config.classes.active);

        // remove click handler
        this.modal.removeEventListener('click', this.handleModalClick, false);

        // remove from modal stack
        this.service._removeFromStack(this);
    };

    ModalInstance.prototype.remove = function() {
        this.modal.parentNode.removeChild(this.modal);
        this.modal = null;
        this.modalContent = null;
    };

    ModalInstance.prototype._onExitEnd = function() {
        // remove from DOM
        this.modal.classList.remove(this.config.classes.positioned);

        // remove event listener
        if (hasTransitions) {
            this.modal.removeEventListener('transitionend', this.handleExitEnd, false);
            this.modal.removeEventListener('webkitTransitionEnd', this.handleExitEnd, false);
        }

        // check for DOM removal
        if (this.config.removeOnExit) {
            this.remove();
        }
    };

    ModalInstance.prototype._onModalClick = function(event) {
        if (!this.modalContent.contains(event.target)) {
            this.exit();
            return;
        }

        // check for close button
        var node = event.target;
        while (node !== this.modalContent) {
            if (matches(node, this.config.closeSelector)) {
                this.exit();
                break;
            }
            node = node.parentNode;
        }
    };

    /**
     * Modal Service constructor
     *
     * @class ModalService
     * @constructor
     */
    var ModalService = function(config) {
        this.config = extend(defaults, config);
        this.config.skeleton = document.getElementById(config.skeleton).innerHTML;
        this._modalStack = [];

        this.handleEscDown = this._onEscDown.bind(this);

        document.body.addEventListener('keydown', this.handleEscDown, false);
    };

    ModalService.prototype.create = function(templateName) {
        var modal = new ModalInstance(templateName, this);
        this._modalStack.push(modal);
        return modal;
    };

    ModalService.prototype.alert = function(alertText) {
        return this.create(this.config.templates.alert);
    };

    ModalService.prototype.confirm = function(confirmText) {
        return this.create(this.config.templates.confirm);
    };

    ModalService.prototype.prompt = function(promptText, defaultInput) {
        return this.create(this.config.templates.prompt);
    };

    ModalService.prototype._onEscDown = function(event) {
        if (event.keyCode !== 27 || !this._modalStack.length) {
            return;
        }
        event.preventDefault();
        this._modalStack[this._modalStack.length - 1].exit();
    };

    ModalService.prototype._removeFromStack = function(modal) {
        var idx = this._modalStack.indexOf(modal);
        if (idx > -1) {
            this._modalStack.splice(idx, 1);
        }
    };

    return ModalService;
}));
