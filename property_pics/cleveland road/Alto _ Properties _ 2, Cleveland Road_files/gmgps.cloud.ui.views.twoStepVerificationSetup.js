gmgps.cloud.ui.views.twoStepVerificationSetUp = function (args) {
    var me = this;
    me.closeMyWindow = args.closeMyWindow;
    me.$root = args.$root.closest('.window');
    me.$actionButton = me.$root.find('.bottom .buttons .action-button');
    me.$thirdButton = me.$root.find('.bottom .buttons .third-button');
    me.$confirmCode = me.$root.find('#confirmCode');
    me.$complete = me.$root.find('#complete');
    me.$passwordCheck = me.$root.find('#passwordCheck');
    me.$mobileConfirmation = me.$root.find('#mobileConfirmation');

    me.$actionButton.addClass('bgg-maroon');
    me.$actionButton.removeClass('grey');

    me.Views = {
        Instructions: 0,
        Password: 1,
        Mobile: 2,
        Code: 3,
        Complete: 4
    };

    me.view = me.Views.Password;

    me.CodeSendResult = {
        Success: 0,
        FailedBecauseInLockOutPeriod: 1,
        ErrorOccuredSendingSMS: 2
    };

    me.confirmPassword = function () {
        if (me.$currentPassword.val() == '') {
            me.validationError(
                'You must complete your password before completing the 2-Step Verification setup.'
            );
            return;
        }

        var args = { password: me.$currentPassword.val() };

        new gmgps.cloud.http("twoStepVerificationSetup-confirmPassword").ajax(
            {
                args: args,
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/AccountSettings/ConfirmPassword'
            },
            function (response) {
                if (!response.Data) {
                    me.validationError(
                        'The password you have entered is incorrect, please try again.'
                    );
                    return;
                }

                me.$currentPassword.val('');
                me.view++;
                me.showStep();
            }
        );
    };

    me.confirmMobile = function () {
        me.mobileVal = me.$mobile.val();
        me.mobileVal = me.mobileVal.replace(' ', '');
        me.mobileVal = me.mobileVal.replace('+44', '0');
        me.mobileVal = me.mobileVal.replace('(+44)', '0');

        var matchPattern = /07\d{9}$/;

        if (me.mobileVal == '' || !matchPattern.test(me.mobileVal)) {
            me.validationError(
                'Please enter a valid UK mobile telephone number.'
            );
            return;
        }

        var args = { mobile: me.mobileVal };

        new gmgps.cloud.http("twoStepVerificationSetup-confirmMobile").ajax(
            {
                args: args,
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/AccountSettings/SaveMobileNumberAndSendCode'
            },
            function (response) {
                me.sendResult = response.Data;
                me.$mobile.val('');
                me.view++;
                me.showStep();
            }
        );
    };

    me.confirmCode = function () {
        if (me.$code.val() == '') {
            me.validationError('Please enter a code.');
            return;
        }

        new gmgps.cloud.http("twoStepVerificationSetup-confirmCode").ajax(
            {
                args: { code: me.$code.val() },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/AccountSettings/ConfirmCode'
            },
            function (response) {
                var result = response.Data;

                if (!result) {
                    me.validationError(
                        'The code you have entered is incorrect'
                    );
                    return;
                }

                me.$code.val('');
                me.validationError('');
                me.view++;
                me.showStep();
            }
        );
    };

    me.init();
    return true;
};

gmgps.cloud.ui.views.twoStepVerificationSetUp.prototype.init = function () {
    var me = this;

    me.$thirdButton.on('click', function () {
        me.back();
    });

    me.showStep();
};

gmgps.cloud.ui.views.twoStepVerificationSetUp.prototype.validationError =
    function (error) {
        var me = this;
        me.$root.find('.two-step-verification-setup-error').html(error);
    };

gmgps.cloud.ui.views.twoStepVerificationSetUp.prototype.next = function () {
    var me = this;
    var confirmationMethod = null;

    if (me.view == me.Views.Complete) {
        me.closeMyWindow();
        gmgps.cloud.helpers.user.openAccountSettings();
    } else {
        if (me.view == me.Views.Instructions)
            confirmationMethod = function () {};
        if (me.view == me.Views.Password)
            confirmationMethod = me.confirmPassword;
        if (me.view == me.Views.Mobile) confirmationMethod = me.confirmMobile;
        if (me.view == me.Views.Code) confirmationMethod = me.confirmCode;
        confirmationMethod();
    }
};

gmgps.cloud.ui.views.twoStepVerificationSetUp.prototype.back = function () {
    var me = this;
    me.view--;
    me.showStep();
};

gmgps.cloud.ui.views.twoStepVerificationSetUp.prototype.showStep = function () {
    var me = this;

    me.$confirmCode.hide();
    me.$complete.hide();
    me.$confirmCode.hide();
    me.$mobileConfirmation.hide();

    me.$root.find('#complete').hide();
    me.$root.find('#passwordCheck').hide();

    if (me.view == me.Views.Instructions) {
        me.showInstructions();
    }

    if (me.view == me.Views.Password) {
        me.showConfirmPassword();
        me.$thirdButton.removeClass('disabled');
    }

    if (me.view == me.Views.Mobile) {
        me.showConfirmMobile();
    }

    if (me.view == me.Views.Code) {
        me.showConfirmCode();
        me.$actionButton.text('Next >>');
        me.$thirdButton.removeClass('disabled');
    }

    if (me.view == me.Views.Complete) {
        me.showComplete();
        me.$actionButton.text('Finish');
        me.$thirdButton.addClass('disabled');
    }
};

gmgps.cloud.ui.views.twoStepVerificationSetUp.prototype.showInstructions =
    function () {
        var me = this;
        me.closeMyWindow();

        new gmgps.cloud.ui.controls.window({
            title: '2-Step Verification',
            windowId: 'twostepVerModal',
            controller: gmgps.cloud.ui.views.twoStepVerification,
            url: 'AccountSettings/TwoStepVerification',
            post: true,
            width: 1000,
            draggable: true,
            modal: true,
            actionButton: 'Next >>',
            cancelButton: 'Cancel',
            onAction: function (e, twoStepVerfication) {
                twoStepVerfication.loadStartTwoStepSetup();
            },
            onCancel: function () {
                gmgps.cloud.helpers.user.openAccountSettings();
            }
        });
    };

gmgps.cloud.ui.views.twoStepVerificationSetUp.prototype.showConfirmPassword =
    function () {
        var me = this;
        me.$passwordCheck.show();
        me.$currentPassword = me.$root.find('#currentPassword');

        me.$root.find('.confirm-two-set-setup').on('click', function () {
            me.next();
        });

        me.$currentPassword.on('keydown', function (e) {
            if (e.keyCode == 13) me.next();
        });

        setTimeout(function () {
            me.$currentPassword.focus();
        }, 100);
    };

gmgps.cloud.ui.views.twoStepVerificationSetUp.prototype.showConfirmMobile =
    function () {
        var me = this;
        me.$mobileConfirmation.show();
        me.$mobile = me.$root.find('#mobile');
        me.validationError('');

        me.$mobile.on('keydown', function (e) {
            if (e.keyCode == 13) me.next();
        });

        setTimeout(function () {
            me.$mobile.focus();
        }, 100);
    };

gmgps.cloud.ui.views.twoStepVerificationSetUp.prototype.showConfirmCode =
    function () {
        var me = this;
        me.$confirmCode.show();
        me.validationError('');
        me.$code = me.$root.find('#code');
        me.$mobileNumberDisplay = me.$root.find('.mobileNumberDisplay');

        setTimeout(function () {
            me.$code.focus();
        }, 100);

        me.$mobileNumberDisplay.html(me.mobileVal);

        me.$code.on('keydown', function (e) {
            if (e.keyCode == 13) me.next();
        });

        me.$root.find('.confirm-two-step-setup_code').on('click', function () {
            me.next();
        });

        me.$root.find('.resend-two-step-setup_code').on('click', function () {
            new gmgps.cloud.http(
                "twoStepVerificationSetup-showConfirmCode"
            ).ajax(
                {
                    args: null,
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: '/AccountSettings/ReSendCode'
                },
                function (response) {
                    me.sendResult = response.Data;
                    me.showCodeSendResult(true);
                }
            );
        });
    };

gmgps.cloud.ui.views.twoStepVerificationSetUp.prototype.showCodeSendResult =
    function (notifySuccess) {
        var me = this;
        if (
            me.sendResult.Result == me.CodeSendResult.Success &&
            notifySuccess
        ) {
            me.validationError('A code has been sent to your mobile phone.');
            setTimeout(function () {
                me.validationError('');
            }, 1500);
            return;
        }

        if (me.sendResult.Result == me.CodeSendResult.Success) return;

        if (
            me.sendResult.Result ==
            me.CodeSendResult.FailedBecauseInLockOutPeriod
        ) {
            me.validationError(
                'This functionality has been temporarily disabled due to the number of requests in quick succession, you will be able to send codes again in <strong>' +
                    me.sendResult.NumberOfMinutesLeftInLockOutPeriod +
                    ' minutes</strong>' +
                    ', however if you do need to access this functionaltiy urgently, please contact the site administrator.'
            );
        }

        if (me.sendResult.Result == me.CodeSendResult.ErrorOccuredSendingSMS) {
            me.validationError(
                'An error occurred when trying to send an SMS text message, please check your mobile phone number and if you are still experiencing problems, please contact the ' +
                    'site administrator.'
            );
        }
    };

gmgps.cloud.ui.views.twoStepVerificationSetUp.prototype.showComplete =
    function () {
        var me = this;
        me.$complete.show();
    };
