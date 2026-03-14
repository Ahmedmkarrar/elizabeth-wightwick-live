gmgps.cloud.ui.views.bankTransferHandler = function (args) {
    var me = this;

    me.$root = args.$root;

    return me;
};
gmgps.cloud.ui.views.bankTransferHandler.prototype = {
    init: function (onComplete) {
        var me = this;

        me.initControls(function () {
            onComplete();
        });
    },
    initControls: function (onComplete) {
        onComplete();
    }
};
