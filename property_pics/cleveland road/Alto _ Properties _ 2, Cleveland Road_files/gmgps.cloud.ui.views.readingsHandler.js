gmgps.cloud.ui.views.readingsHandler = function (args) {
    var me = this;

    me.setDirty = args.dirtyHandler;
    me.cfg = args;
    me.$root = args.$root;

    me.init(args);

    return true;
};

gmgps.cloud.ui.views.readingsHandler.prototype = {
    init: function (args) {
        var me = this;
        me.tenancyId = args.tenancyId;

        me.initHandlers();
    },

    initHandlers: function () {
        var me = this;

        me.$root.off();
    }
};
