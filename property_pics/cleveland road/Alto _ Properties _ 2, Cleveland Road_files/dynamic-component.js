((function() {
    'use strict';

    angular.module('common.directives').directive('dynamicComponent', [
        '$compile',
        function ($compile) {
            return {
                restrict: 'E',
                replace: true,
                scope: {
                    name: '<'
                },
                link: function ($scope, element) {
                    var html = getComponentHtml($scope.name);
                    element.html(html);
                    $compile(element.contents())($scope);

                    function getComponentHtml(component) {
                        var c = camelCaseToDash(component);
                        var html = [
                            '<' + c + ' data="wizard.currentStep.data">',
                            '</' + c + '>'
                        ].join('');
                        return html;
                    }

                    function camelCaseToDash(input) {
                        // replace Capital letter with the letter + a dash: '-', then lowercase everything.
                        return input.replace(/([A-Z])/g, '-$1').toLowerCase();
                    }
                }
            };
        }
    ]);
}))();
