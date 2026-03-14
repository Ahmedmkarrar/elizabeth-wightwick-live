gmgps.cloud.ui.views.receiptImportsOpenBankingWindowHander = function (args) {
    var me = this;

    me.title = args.title;

    me.importResults = args.importResults;

    me.onComplete = args.onComplete;
    me.onCancel = args.onCancel;

    return me.init();
};

gmgps.cloud.ui.views.receiptImportsOpenBankingWindowHander.prototype = {
    init: function () {
        var me = this;
        return me;
    },

    controller: function (args) {
        var me = this;

        me.params = args.data;
        me.$root = args.$root;
        me.$window = args.$window;

        me.$window
            .find('.top')
            .css('background-color', '#3399ff !important');
        me.$window.find('.middle').css('background-color', '#ffffff');

        me.$window.find('.bottom .action-button').hide();

        me.$root.find('#get_cancel').on('click', function () {
            $('.cancel-button').trigger('click');
        });
    },

    show: function () {
        var me = this;

        new gmgps.cloud.ui.controls.window({
            title: me.title,
            windowId: 'receiptImportOpenBankingDialog',
            controller: me.controller,
            url: 'Accounts/GetOpenBankingDialog',
            urlArgs: {
                importResults: me.importResults
            },
            post: true,
            complex: true,
            width: 510,
            draggable: true,
            modal: true,
            cancelButton: 'Close',
            onCancel:
                me.onCancel ||
                function () {
                    return true;
                },
            actionButton: 'Refresh',
            postActionCallback:
                me.onComplete ||
                function () {
                    return false;
                }
        });
    }
}