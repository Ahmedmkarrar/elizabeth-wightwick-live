((function() {
    'use strict';
    angular.module('common.filters').filter('sumOfValue', function () {
        return function (data, propertyName) {
            if (angular.isUndefined(data)) {
                return 0;
            }

            var sum = 0;

            if (angular.isUndefined(data)) {
                angular.forEach(data, function (value) {
                    sum = sum + parseFloat(value);
                });
            } else {
                angular.forEach(data, function (value) {
                    sum = sum + parseFloat(value[propertyName]);
                });
            }

            return sum;
        };
    });
}))();
