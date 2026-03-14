((function() {
    'use strict';

    angular.module('common.directives').directive('addressLookup', [
        '$compile',
        'AddressService',
        function ($compile, address) {
            var dropdownTemplate =
                '<ul class="dropdown-results" ng-show="dropdownVisible"><li ng-repeat="item in items"><a href="" ng-mousedown="onItemMouseDown()" ng-click="selectItem(item)">{{ item.line }}</a></li></ul>';

            return {
                restrict: 'A',
                require: 'ngModel',
                scope: {
                    addressLookup: '=?',
                    model: '=ngModel',
                    onSelect: '&'
                },
                link: function (scope, elem, attr, ngModel) {
                    var options = scope.addressLookup,
                        itemMouseDown = false;

                    if (!ngModel) return;

                    scope.dropdownVisible = false;

                    var resultHtml = angular.element(dropdownTemplate);
                    resultHtml.insertAfter(elem);
                    $compile(resultHtml)(scope);

                    elem.on('focus', function () {
                        if (
                            !angular.isUndefined(scope.items) &&
                            scope.items.length > 0
                        ) {
                            showDropdown();
                        }
                    });

                    elem.on('blur', function () {
                        if (itemMouseDown) {
                            itemMouseDown = false;
                            return;
                        }
                        hideDropdown();
                    });

                    scope.items = [];

                    scope.$watch('model', function (n, o) {
                        if (n === o) return;

                        if (/^[a-zA-Z\d]+\s[a-zA-Z\d]+$/.test(n)) {
                            lookupAddress(n);
                        }
                    });

                    if (options) {
                        if (options.position)
                            resultHtml.css('float', options.position);

                        if (options.width)
                            resultHtml.css('width', options.width);
                    }

                    scope.selectItem = function (item) {
                        hideDropdown();

                        if (scope.onSelect) {
                            scope.onSelect({ item: item });
                        }
                    };

                    scope.onItemMouseDown = function () {
                        itemMouseDown = true;
                    };

                    function showDropdown() {
                        scope.dropdownVisible = true;
                        console.log('Showing');
                    }

                    function hideDropdown() {
                        scope.dropdownVisible = false;
                        console.log('Hiding');
                    }

                    function lookupAddress(postcode) {
                        address.lookup(postcode).then(function (result) {
                            var addresses = angular.forEach(
                                result,
                                function (a) {
                                    var line = '';

                                    if (a.subDwelling)
                                        line += a.subDwelling + ', ';

                                    line += a.nameNo + ', ';

                                    line += a.street + ', ';

                                    if (a.locality) line += a.locality + ', ';

                                    line += a.town;

                                    a.line = line;
                                    return a;
                                }
                            );
                            scope.items = addresses;

                            console.log(scope.items);

                            if (
                                !angular.isUndefined(scope.items) &&
                                scope.items.length > 0
                            )
                                showDropdown();
                            else hideDropdown();
                        });
                    }
                }
            };
        }
    ]);
}))();
