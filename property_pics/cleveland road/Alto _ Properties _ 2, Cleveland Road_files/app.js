((function() {
    'use strict';

    angular
        .module('alto', [
            // 3rd Party Modules
            'ui.bootstrap',
            'ngAnimate',
            'dndLists',

            // Application Modules
            'shell',
            'modal',
            'propertyfile',
            'common'
        ])
        .provider({
            // Update the rootElementProvider to use the <body> tag as its root. This overcomes the
            // issue of late-binding angular apps in partial views (i.e. MoveIt tab)
            $rootElement: function () {
                this.$get = function () {
                    return angular.element(document.body);
                };
            }
        });
}))();
