((function() {
    'use strict';

    angular.module('common.directives').directive('actionButton', [
        'TemplatesUrl',
        function (TemplatesUrl) {
            return {
                restrict: 'E',
                templateUrl: TemplatesUrl + 'action-button.tpl.html',
                replace: true,
                transclude: true,
                scope: {
                    action: '&',
                    busy: '<',
                    disabledOn: '<'
                }
            };
        }
    ]);
}))();
