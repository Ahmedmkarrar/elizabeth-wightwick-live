gmgps.cloud.ui.views.emailTracking = function (args) {
    var me = this;
    me.cfg = args;
    me.$root = args.$root;

    me.init(args);

    return this;
};

gmgps.cloud.ui.views.emailTracking.typeName =
    'gmgps.cloud.ui.views.emailTracking';

gmgps.cloud.ui.views.emailTracking.prototype = {
    init: function () {},

    action: function () {
        return true;
    },

    cancel: function (onComplete) {
        onComplete(false);
    },

    destroy: function () {
        var me = this;
        me.$root.empty().unbind();
    }
};
