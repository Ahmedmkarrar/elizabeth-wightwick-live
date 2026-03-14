((function() {
    'use strict';
    angular
        .module('common.filters')
        .filter('customcurrency', function ($filter) {
            return function (numberToFormat, currencySymbol, decimalPlaces) {
                numberToFormat = _.replace(numberToFormat, /,/g, '');

                if (isNaN(numberToFormat)) {
                    return numberToFormat;
                }

                if (!currencySymbol || angular.isUndefined(currencySymbol)) {
                    currencySymbol = '£';
                }

                if (!decimalPlaces || angular.isUndefined(decimalPlaces)) {
                    decimalPlaces = 0;
                }

                var formattedNumber = $filter('currency')(
                    numberToFormat,
                    currencySymbol,
                    decimalPlaces
                );

                return formattedNumber;
            };
        });
}))();
