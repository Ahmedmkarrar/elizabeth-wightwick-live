((function() {
    'use strict';

    angular
        .module('common.directives')
        .directive('validationCss', [
            '$timeout',
            function () {
                return {
                    require: '^form',
                    restrict: 'A',
                    link: function () {}
                };
            }
        ])
        .directive('validationIndicator', [
            function () {
                return {
                    require: '^form',
                    restrict: 'E',
                    replace: true,
                    templateUrl:
                        '/scripts/app/angular/common/directives/ValidationIndicator.tpl.html',
                    scope: {
                        property: '@'
                    },
                    link: function ($scope, element, attrs, form) {
                        $scope.form = form;
                        $scope.formElement = form[$scope.property];
                    }
                };
            }
        ])
        .directive('uibBtnRadio', [
            function () {
                return {
                    require: '^form',
                    restrict: 'A',
                    link: function ($scope, element, attrs, form) {
                        element.bind('click', function () {
                            var input = element.parent().children('input')[0];
                            if (!input || !form[input.name]) {
                                return;
                            }

                            form[input.name].$setTouched();
                        });
                    }
                };
            }
        ]);
}))();
