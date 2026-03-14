'use strict';

(function () {
    angular
        .module('propertyfile')
        .directive('propertyfile.terminal', function ($timeout) {
            return {
                restrict: 'A',
                link: {
                    post: function ($scope, $element) {
                        $timeout(function () {
                            $element.trigger('render-complete');
                        })
                    }
                }
            }
        });
})();