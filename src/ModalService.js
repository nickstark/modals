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

    /**
     * Modal Service constructor
     *
     * @class ModalService
     * @constructor
     */
    var ModalService = function(config) {
    };

    return ModalService;
}));
