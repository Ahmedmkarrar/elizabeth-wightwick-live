((function() {
    'use strict';

    angular.module('common.directives').directive('busyIndicator', [
        'TemplatesUrl',
        '$animate',
        function (TemplatesUrl, $animate) {
            return {
                restrict: 'E',
                templateUrl: TemplatesUrl + 'busy-indicator.tpl.html',
                replace: true,
                transclude: true,
                scope: {
                    show: '<'
                },
                link: function ($scope, element) {
                    // This fixes an issue where ng-show/hide waits for any animations to stop before hiding
                    $animate.enabled(false, element);
                }
            };
        }
    ]);
}))();
