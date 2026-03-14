gmgps.cloud.ui.views.twoStepVerification = function (args) {
    var me = this;
    me.$root = args.$root.closest('.window');
    me.init();
    me.closeMyWindow = args.closeMyWindow;

    me.$actionButton = me.$root.find('.bottom .buttons .action-button');
    me.$actionButton.addClass('bgg-maroon');
    me.$actionButton.removeClass('grey');

    return true;
};

gmgps.cloud.ui.views.twoStepVerification.prototype.init = function () {
    var me = this;
    me.$root.find('.two-step-verification-setup').on('click', function () {
        me.closeMyWindow();
        me.loadStartTwoStepSetup(me);
    });
};

gmgps.cloud.ui.views.twoStepVerification.prototype.loadStartTwoStepSetup =
    function () {
        new gmgps.cloud.ui.controls.window({
            title: '2-Step Verification Setup',
            windowId: 'twostepVerSetupModal',
            controller: gmgps.cloud.ui.views.twoStepVerificationSetUp,
            url: 'AccountSettings/StartTwoStepSetup',
            post: true,
            width: 500,
            draggable: true,
            modal: true,
            actionButton: 'Next >>',
            cancelButton: 'Cancel',
            thirdButton: '<< Back',
            onAction: function (e, twoStepSetup) {
                twoStepSetup.next();
                return false;
            },
            onCancel: function () {
                gmgps.cloud.helpers.user.openAccountSettings();
            }
        });
    };
