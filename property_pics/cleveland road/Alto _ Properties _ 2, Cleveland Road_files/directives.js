((function() {
    'use strict';
    var module = angular.module('common.directives', []);

    module.constant(
        'TemplatesUrl',
        '/scripts/app/angular/common/directives/templates/'
    );

    module.directive('infiniteScroll', [
        '$rootScope',
        '$window',
        '$timeout',
        function ($rootScope, $window, $timeout) {
            return {
                link: function (scope, elem, attrs) {
                    var checkWhenEnabled,
                        handler,
                        scrollDistance,
                        scrollEnabled;
                    $window = angular.element($window);
                    scrollDistance = 0;
                    if (attrs.infiniteScrollDistance != null) {
                        scope.$watch(
                            attrs.infiniteScrollDistance,
                            function (value) {
                                return (scrollDistance = parseInt(value, 10));
                            }
                        );
                    }
                    scrollEnabled = true;
                    checkWhenEnabled = false;
                    if (attrs.infiniteScrollDisabled != null) {
                        scope.$watch(
                            attrs.infiniteScrollDisabled,
                            function (value) {
                                scrollEnabled = !value;
                                if (scrollEnabled && checkWhenEnabled) {
                                    checkWhenEnabled = false;
                                    return handler();
                                }
                            }
                        );
                    }
                    handler = function () {
                        var elementBottom,
                            remaining,
                            shouldScroll,
                            windowBottom;
                        windowBottom = $window.height() + $window.scrollTop();
                        elementBottom = elem.offset().top + elem.height();
                        remaining = elementBottom - windowBottom;
                        shouldScroll =
                            remaining <= $window.height() * scrollDistance;
                        if (shouldScroll && scrollEnabled) {
                            if ($rootScope.$$phase) {
                                return scope.$eval(attrs.infiniteScroll);
                            } else {
                                return scope.$apply(attrs.infiniteScroll);
                            }
                        } else if (shouldScroll) {
                            return (checkWhenEnabled = true);
                        }
                    };
                    $window.on('scroll', handler);
                    scope.$on('$destroy', function () {
                        return $window.off('scroll', handler);
                    });
                    return $timeout(function () {
                        if (attrs.infiniteScrollImmediateCheck) {
                            if (
                                scope.$eval(attrs.infiniteScrollImmediateCheck)
                            ) {
                                return handler();
                            }
                        } else {
                            return handler();
                        }
                    }, 0);
                }
            };
        }
    ]);

    module.directive('ellipsis', [
        '$document',
        '$timeout',
        function ($document, $timeout) {
            return {
                restrict: 'C',
                link: function (scope, element) {
                    var $body = angular.element(document).find('body');

                    element.css('position', 'relative');

                    $timeout(function () {
                        var tip = angular
                            .element('<span/>')
                            .addClass('ellipsis-popover');
                        tip.html(element.clone().html());
                        tip.css('font-size', element.css('font-size'));
                        tip.css('padding', element.css('padding'));

                        element.bind('mouseenter', function () {
                            var winOffset = element.offset();
                            if (this.scrollWidth > this.offsetWidth) {
                                $body.append(tip[0]);
                                var top = winOffset.top;
                                top += element.height() / 2 - tip.height() / 2;

                                var left = winOffset.left;
                                left += element.width() / 2 - tip.width() / 2;

                                tip.css('top', top);
                                tip.css('left', left);
                            }
                        });

                        element.bind('mouseleave remove', function () {
                            tip.remove();
                        });
                    });
                }
            };
        }
    ]);
}))();
