((function() {
    'use strict';

    angular.module('modal').service('ModalService', service);

    service.$inject = ['$rootScope', '$document', '$q', '$uibModal'];

    function service($rootScope, $document, $q, $uibModal) {
        var templatesUrl = '/scripts/app/angular/modal/templates/';
        var appendToTarget = '#bootstrap-modal-container';

        function open(options) {
            if (!options) throw Error('No modal options defined');
            var modalOptions = prepare(options);

            var instance = $uibModal.open(modalOptions);

            return instance.result;
        }

        function confirm(message, options) {
            /// <summary>
            /// Displays a confirmation dialog with a specified message, with a Yes and No button
            /// </summary>
            /// <param name="message"></param>
            /// <param name="options"></param>
            /// <returns type=""></returns>

            var modalOptions = prepare(options);
            modalOptions.templateUrl = templatesUrl + 'confirm.tpl.html';

            var container = $document.find(appendToTarget).eq(0);

            modalOptions.appendTo = container;
            modalOptions.controller = [
                '$scope',
                '$uibModalInstance',
                'modalParams',
                function ($scope, $uibModalInstance, p) {
                    $scope.message = p.message;

                    $scope.confirmText = 'OK';
                    $scope.cancelText = 'Cancel';

                    if (p.options) {
                        $scope.title = p.options.title;
                        $scope.iconCss = p.options.iconCss;
                        $scope.icon = p.options.icon;
                        $scope.confirmText =
                            p.options.confirmText || $scope.confirmText;
                        $scope.cancelText =
                            p.options.cancelText || $scope.cancelText;
                    }

                    $scope.yes = function () {
                        $uibModalInstance.close(true);
                    };

                    $scope.no = function () {
                        $uibModalInstance.close(false);
                    };

                    $scope.cancel = function () {
                        $uibModalInstance.dismiss();
                    };
                }
            ];

            modalOptions.resolve = {
                modalParams: function () {
                    return { message: message, options: options };
                }
            };
            return $uibModal.open(modalOptions).result;
        }

        function prompt(message, options) {
            /// <summary>
            /// Displays a dialog, prompting the user to enter a single value
            /// </summary>
            /// <param name="options"></param>
            /// <returns type=""></returns>

            var modalOptions = prepare(options);
            modalOptions.templateUrl = templatesUrl + 'prompt.tpl.html';
            modalOptions.controller = [
                '$scope',
                '$uibModalInstance',
                'modalParams',
                function ($scope, $modalInstance, p) {
                    $scope.label = p.message;

                    $scope.confirmText = 'OK';
                    $scope.cancelText = 'Cancel';

                    $scope.result = { value: '' };

                    if (p.options) {
                        $scope.title = p.options.title;
                        $scope.placeholder = p.options.placeholder;
                        $scope.iconCss = p.options.iconCss;
                        $scope.icon = p.options.icon;
                        $scope.inputType = p.options.inputType || 'text';
                        $scope.confirmText =
                            p.options.confirmText || $scope.confirmText;
                        $scope.cancelText =
                            p.options.cancelText || $scope.cancelText;
                        $scope.inputMandatory =
                            p.options.inputMandatory === true;
                        $scope.mandatoryText = p.options.inputMandatory
                            ? p.options.mandatoryText &&
                              p.options.mandatoryText.length
                                ? p.options.mandatoryText
                                : 'This is a required field'
                            : '';

                        $scope.showMandatoryText = false;
                    }

                    $scope.ok = function () {
                        $scope.showMandatoryText = false;
                        if (p.options && p.options.inputMandatory) {
                            if (
                                !$scope.result.value ||
                                $scope.result.value.length === 0
                            ) {
                                $scope.showMandatoryText = true;
                                return false;
                            }
                        }
                        $modalInstance.close($scope.result.value);
                    };

                    $scope.textChanged = function () {
                        if (
                            $scope.result.value &&
                            $scope.result.value.length > 0 &&
                            $scope.result.value !== ' '
                        ) {
                            $scope.showMandatoryText = false;
                        }
                    };

                    $scope.cancel = function () {
                        $modalInstance.dismiss();
                    };
                }
            ];
            modalOptions.resolve = {
                modalParams: function () {
                    return { message: message, options: options };
                }
            };
            return $uibModal.open(modalOptions).result;
        }

        function error(message, options) {
            if (!options) options = {};
            options.keyboard = false;
            options.backdrop = false;

            var modalOptions = prepare(options);
            modalOptions.templateUrl = templatesUrl + 'error.tpl.html';
            modalOptions.controller = [
                '$scope',
                '$uibModalInstance',
                'modalParams',
                function ($scope, $modalInstance, p) {
                    $scope.friendlyError =
                        'The MoveIt integration is not available at this time';
                    $scope.message = p.message;
                    $scope.confirmText = 'OK';

                    if (p.options) {
                        $scope.title = p.options.title;
                        $scope.status = p.options.status;
                        $scope.placeholder = p.options.placeholder;
                        $scope.iconCss = p.options.iconCss;
                        $scope.icon = p.options.icon;
                        $scope.confirmText =
                            p.options.confirmText || $scope.confirmText;
                    }

                    $scope.ok = function () {
                        $modalInstance.close(true);
                    };
                }
            ];
            modalOptions.resolve = {
                modalParams: function () {
                    return { message: message, options: options };
                }
            };
            return $uibModal.open(modalOptions).result;
        }

        function prepare(options) {
            // This will add a new container to the body element. A conflict with
            // jQueryUI causes a pre-made container to render before the jQuery UI elements
            var container = $document.find('#bootstrap-modal-container');
            var defaults = {
                //animation: false,
                backdrop: true,
                keyboard: true,
                appendTo: container,
                windowTemplateUrl: templatesUrl + 'modal.tpl.html'
            };
            return Object.assign(defaults, options);
        }

        return {
            open: open,
            confirm: confirm,
            prompt: prompt,
            error: error
        };
    }
}))();
