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

    var modalCounter = 0;
    var focusableElements = "a[href],area[href],input:not([disabled]),select:not([disabled]),textarea:not([disabled]),button:not([disabled]),iframe,object,embed,[tabindex],[contenteditable]";

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
        disableScroll: true,
        contentSelector: '[data-modal-content]',
        closeSelector: '[data-modal-close]',
        classes: {
            hidden: 'modal_isHidden',
            positioned: 'modal_isPositioned',
            active: 'modal_isActive'
        },
        templates: null,
        templateNames: {
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

    /**
     * Util function to check if element matches selector
     */
    var matches = (function() {
        var funcName;
        // matches
        if (typeof Element.prototype.matches === 'function') {
            return function(node, selector) {
                return node.matches(selector);
            }
        }
        // matchesSelector
        var prefixes = ['webkit', 'ms', 'moz'];
        for (var prefix in prefixes) {
            funcName = prefixes[prefix] + 'MatchesSelector';
            if (typeof Element.prototype[funcName] === 'function') {
                return function(node, selector) {
                    return node[funcName](selector);
                }
            }
        }
        // use querySelectorAll
        if (typeof proto.querySelectorAll === 'function') {
            return function(node, selector) {
                var matches = (node.parentNode || document).querySelectorAll(selector);
                var i = 0;
                while (matches[i] && matches[i] !== node) {
                    ++i;
                }
                return !!matches[i];
            };
        }

        throw new Error('Modals Unsupported: unable to match selectors.')
    }());

    /**
     * Modal Instance constructor
     *
     * @class ModalInstance
     * @constructor
     */
    var ModalInstance = function(templateName, data, service) {
        this.id = modalCounter;
        this.service = service;
        this.config = service.config;
        this.isOpen = false;
        this.data = data;

        this.handleExitEnd = this._onExitEnd.bind(this);
        this.handleModalClick = this._onModalClick.bind(this);
        this.handleTabDown = this._onTabDown.bind(this);

        this._loadTemplate(templateName);
    };

    ModalInstance.prototype._loadTemplate = function(templateName) {
        var wrapper = document.createElement('div');
        var config = this.config;
        var labelProp = 'label';
        var label = this.data.label;
        var desc = this._createDescription();

        if (!(templateName in config.templates)) {
            throw new Error('Unable to find template (' + templateName + ')');
        }

        if (label.length && label.charAt(0) === '#') {
            labelProp = 'labelledby';
            label = label.substring(1);
        }

        wrapper.innerHTML = config.templates[config.skeleton]({
            content: config.templates[templateName](this.data)
        });
        this.modal = wrapper.children[0];
        this.modalContent = this.modal.querySelector(config.contentSelector);
        this.modal.insertBefore(desc, this.modalContent);
        document.body.appendChild(this.modal);

        // aria
        this.modal.setAttribute('aria-hidden', 'true');
        this.modal.setAttribute('role', 'alertdialog');
        this.modal.setAttribute('aria-' + labelProp, label); //TODO
        this.modal.setAttribute('aria-describedby', desc.id); //TODO
        this.modal.setAttribute('tabindex', '-1');
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

        // aria
        this.modal.setAttribute('aria-hidden', 'false');
        this.previousFocus = document.activeElement;
        this.modal.focus();

        // add listeners
        this.modal.addEventListener('click', this.handleModalClick, false);
        this.modal.addEventListener('keydown', this.handleTabDown, true);
    };

    ModalInstance.prototype.exit = function() {
        if (!this.isOpen) {
            return;
        }
        this.isOpen = false;

        // aria
        this.modal.setAttribute('aria-hidden', 'true');

        // remove after animation
        if (hasTransitions) {
            this.modal.addEventListener('transitionend', this.handleExitEnd, false);
            this.modal.addEventListener('webkitTransitionEnd', this.handleExitEnd, false);
        }

        // animate out
        this.modal.classList.remove(this.config.classes.active);

        // remove click handler
        this.modal.removeEventListener('click', this.handleModalClick, false);
        this.modal.removeEventListener('keydown', this.handleTabDown, true);

        // remove from modal stack
        this.service._removeFromStack(this);

        if (!hasTransitions) {
            this.handleExitEnd();
        }
    };

    ModalInstance.prototype.remove = function() {
        this.modal.parentNode.removeChild(this.modal);
        this.modal = null;
        this.modalContent = null;
    };

    ModalInstance.prototype._onExitEnd = function() {
        // remove from DOM
        this.modal.classList.remove(this.config.classes.positioned);

        if (this.previousFocus) {
            this.previousFocus.focus();
            this.previousFocus = null;
        }

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

    ModalInstance.prototype._onTabDown = function(event) {
        if (event.keyCode !== 9) {
            return;
        }
        var modal = this.modal;
        var els = modal.querySelectorAll(focusableElements);
        var active = document.activeElement;
        var forward = !event.shiftKey;
        var numElements = els.length;
        if (!numElements) {
            event.preventDefault();
            return;
        }
        if (!forward && (active === modal || active === els[0])) {
            event.preventDefault();
            els[numElements - 1].focus();
        } else if (forward && active === els[numElements - 1]) {
            event.preventDefault();
            els[0].focus();
        }
    };

    ModalInstance.prototype._createDescription = function() {
        var desc = this.data.desc;
        var description = document.createElement('span');

        description.id = 'modal' + this.id + '-description';
        description.style.position = 'absolute';
        description.style.top = '-9999px';
        description.style.left = '-9999px';
        description.innerHTML = desc;

        return description;
    };

    /**
     * Modal Service constructor
     *
     * @class ModalService
     * @constructor
     */
    var ModalService = function(config) {
        if (!config.templates) {
            throw new Error('ModalError: templates object must be supplied to service');
        }
        this.config = extend(defaults, config);
        this._modalStack = [];

        this.handleEscDown = this._onEscDown.bind(this);

        document.body.addEventListener('keydown', this.handleEscDown, false);
    };

    ModalService.prototype.create = function(templateName, data) {
        if (!data || typeof data.label !== 'string' || typeof data.desc !== 'string') {
            throw new Error('ModalError: label and desc properties must be supplied to modals.');
        }
        var modal = new ModalInstance(templateName, data, this);
        this._modalStack.push(modal);
        modalCounter++;
        return modal;
    };

    ModalService.prototype.alert = function(alertText) {
        return this.create(this.config.templateNames.alert, {
            alertText: alertText,
            label: 'Alert',
            desc: alertText
        });
    };

    ModalService.prototype.confirm = function(confirmText) {
        return this.create(this.config.templateNames.confirm, {
            confirmText: confirmText,
            label: 'Confirm',
            desc: confirmText
        });
    };

    ModalService.prototype.prompt = function(promptText, defaultInput) {
        return this.create(this.config.templateNames.prompt, {
            promptText: promptText,
            defaultInput: defaultInput,
            label: 'Confirm',
            desc: promptText
        });
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
