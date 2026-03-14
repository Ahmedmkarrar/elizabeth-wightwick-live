((function() {
    'use strict';
    angular.module('common.directives').directive('bigNumber', function () {
        /*
         * Attached to an input element, this directive forces the user to input an integer
         * It will automatically insert commas every thousandth unit.
         * It will allow the user to enter 'k'/'t', 'm', or 'b' to denote a thousand, million or billion
         */

        return {
            restrict: 'A',
            require: 'ngModel',
            link: function (scope, elem, attr, ngModel) {
                if (!ngModel) return;

                ngModel.$parsers.push(function (value) {
                    if (!value) return;

                    var lastChar = value.slice(-1).toLowerCase();
                    var clean = value.replace(/[^0-9]+/g, '');

                    if (!clean.length) {
                        value = '';
                        ngModel.$setViewValue(value);
                        ngModel.$render();

                        return value;
                    }

                    clean = parseInt(clean);

                    switch (lastChar) {
                        case 'k':
                        case 't':
                            clean *= 1000;
                            break;
                        case 'm':
                            clean *= 1000000;
                            break;
                        case 'b':
                            clean *= 1000000000;
                            break;
                    }

                    clean = formatNumber(clean + '');

                    if (clean !== value) {
                        ngModel.$setViewValue(clean);
                        ngModel.$render();
                    }

                    return clean;
                });

                function formatNumber(num) {
                    num = parseInt(num) + '';

                    if (num > 1000000000) {
                        num = num.substr(0, 10);
                    }

                    for (var i = num.length - 1, j = 1; i >= 0; i--, j++) {
                        if (!i || j % 3) continue;

                        num = num.substr(0, i) + ',' + num.substr(i);
                    }

                    return num;
                }
            }
        };
    });
}))();
