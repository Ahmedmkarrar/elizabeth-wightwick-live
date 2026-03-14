((function() {
    'use strict';

    angular
        .module('common.directives')

        .directive('qtip', function ($http, $templateCache, $compile) {
            return {
                restrict: 'A',
                link: function (scope, element, attrs) {
                    var elementRef = $(element);
                    scope.targetElement = elementRef;

                    var position = scope.$eval(attrs['qtipPosition']) || {};

                    if (!position.my) {
                        position.my = 'top middle';
                    }
                    if (!position.at) {
                        position.at = 'bottom middle';
                    }

                    var container = attrs['qtipContainer'];
                    if (container) {
                        position.container = elementRef.closest(container);
                    }

                    var style = scope.$eval(attrs['qtipStyle']) || {
                        classes: 'qtip-dark'
                    };
                    var url = attrs['qtipUrl'];

                    if (url) {
                        $http
                            .get(url, { cache: $templateCache })
                            .success(function (content) {
                                var compiledContent = $compile(content)(scope);

                                var tip = $(element).qtip({
                                    suppress: false,
                                    content: compiledContent,
                                    position: position,
                                    style: style,
                                    show: {
                                        event: 'click'
                                    },
                                    hide: {
                                        event: 'unfocus',
                                        leave: false
                                    }
                                });

                                scope.tip = tip.qtip();
                            });
                    } else {
                        var tipText = elementRef.html();
                        elementRef.empty();

                        elementRef.qtip({
                            content: {
                                text: tipText
                            },
                            position: position,
                            style: {
                                tip: true,
                                classes: style.classes
                            }
                        });
                    }
                }
            };
        });
}))();
