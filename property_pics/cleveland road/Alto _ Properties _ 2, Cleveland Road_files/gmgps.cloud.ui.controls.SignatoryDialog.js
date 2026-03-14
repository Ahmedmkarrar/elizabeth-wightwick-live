'use strict';

gmgps.cloud.ui.controls.SignatoryDialog = function (options) {
    this.options = options;
    this.http =
        options.http || new gmgps.cloud.http("SignatoryDialog-SignatoryDialog");
    this.api = options.api || new gmgps.cloud.services.EsignaturesCommandApi();

    function View() {
        var _this = this;
        var _jqueryRoot = null;
        var _window = null;
        var _dialog = null;
        var _userHasPermission = null;

        Object.defineProperty(this, 'dialog', {
            get: function () {
                return _dialog;
            },
            set: function (value) {
                _dialog = value;
                _window = value.$window;
                _jqueryRoot = _window.find('.content');
                _jqueryRoot.on(
                    'click',
                    'td.actions .resend:not(.disabled)',
                    _this.resendListener
                );
            }
        });

        Object.defineProperty(this, 'resendListener', {
            value: function () {
                var target = $(this);
                var id = _this.getSignatoryModel(target);
                _this.onResendClicked(id);
            },
            writable: false
        });

        this.getRequestId = function () {
            return _jqueryRoot.find('table').attr('data-request-id');
        };

        this.getRequestStatus = function () {
            return parseInt(_jqueryRoot.find('table').attr('data-status'));
        };

        Object.defineProperty(this, 'userHasPermission', {
            get: function () {
                if (_userHasPermission === null) {
                    _userHasPermission =
                        _jqueryRoot
                            .find('#HasPermissionToResendOrVoid')
                            .val() === 'True';
                }
                return _userHasPermission;
            },
            set: function (val) {
                _userHasPermission = val;
            }
        });

        this.getSignatoryModel = function (target) {
            var $td = target.closest('td');
            var id = $td.attr('data-id');
            return { id: id };
        };

        this.disableVoidButton = function () {
            _window
                .find('.action-button')
                .prop('disabled', true)
                .addClass('disabled');
        };

        this.disableResendAllButton = function () {
            _window
                .find('.third-button')
                .prop('disabled', true)
                .addClass('disabled');
        };

        // eslint-disable-next-line no-unused-vars
        this.onResendClicked = function (signatory) {};
    }

    this.view = new View();
};

gmgps.cloud.ui.controls.SignatoryDialog.typeName =
    'gmgps.cloud.ui.controls.SignatoryDialog';

gmgps.cloud.ui.controls.SignatoryDialog.prototype = {
    open: function () {
        var controller = this;
        var id = this.options.id;

        this.view.onResendClicked = function (signatory) {
            controller.resend(signatory.id);
        };

        this.view.dialog = new gmgps.cloud.ui.controls.window({
            http: this.http,
            title: 'Signatories',
            windowId: 'esign-signatories',
            controller: function () {
                return controller;
            },
            url: 'SignatoryStatus/GetSignatoryStatusTable',
            urlArgs: { signingEventId: id },
            post: true,
            width: 650,
            draggable: true,
            modal: true,
            actionButton: 'Void',
            cancelButton: 'Close',
            thirdButton: 'Resend All',
            onBeforeDisplay: function (w, callback) {
                var requestStatus = controller.view.getRequestStatus();

                var canVoidRequest =
                    requestStatus === C.SigningRequestStatus.InFlight ||
                    requestStatus === C.SigningRequestStatus.Initial;

                if (!canVoidRequest) {
                    controller.view.disableVoidButton();
                }

                var canResendRequest =
                    requestStatus === C.SigningRequestStatus.InFlight;
                if (!canResendRequest) {
                    controller.view.disableResendAllButton();
                }

                if (callback) {
                    callback();
                }
            }
        });
    },

    resend: function (signatoryId) {
        var requestId = this.view.getRequestId();

        if (!this.view.userHasPermission) {
            this.showError('Access Denied');
            return;
        }

        this.api.resend(requestId, signatoryId).then(function () {
            $.jGrowl(
                'Your request to resend the document to a chosen signatory has been queued.',
                { header: 'Electronic Signing', theme: 'growl-system' }
            );
        });
    },

    action: function (onAction, button) {
        var controller = this;

        if (!this.view.userHasPermission) {
            this.showError('Access Denied');
            return;
        }

        this.voidComponent = new gmgps.cloud.ui.components.VoidButton(button, {
            signingRequestId: controller.view.getRequestId()
        });
        this.voidComponent.void(function () {
            controller.view.disableVoidButton();
        });
    },

    action2: function () {
        var requestId = this.view.getRequestId();
        var controller = this;

        if (!this.view.userHasPermission) {
            this.showError('Access Denied');
            return;
        }

        this.api.resendAll(requestId).then(function () {
            $.jGrowl(
                'Your request to resend the document to all signatories has been queued.',
                { header: 'Electronic Signing', theme: 'growl-system' }
            );
            controller.view.disableResendAllButton();
        });
    },

    showError: function (msg) {
        var $errorsDialog = $('<div id="error-info"></div>');

        var $errors = $('<div class="server-errors"></div>');
        var $line = $(
            '<div class="error-message">' +
                '<div class="text level-1"></div>' +
                '<div class="class-name"></div>' +
                '<div class="location"></div>' +
                '<div class="property-name"></div>' +
                '<div class="error-id"></div>' +
                '</div>'
        );

        var html = '';
        html += '<div>{0}</div>'.format(msg);

        if (html !== '') {
            $line.find('.text').html(html);
            $errors.append($line);
        }

        if ($errors.length > 0) {
            $errorsDialog.append($errors);
        }

        new gmgps.cloud.ui.controls.window({
            title: 'Error Information',
            windowId: 'errorModal',
            $content: $errorsDialog,
            width: 500,
            height: 150,
            draggable: true,
            modal: true,
            actionButton: 'OK',
            cancelButton: null,
            onAction: function () {},
            onCancel: function () {},
            sourceZIndex: 99999
        });
    }
};
