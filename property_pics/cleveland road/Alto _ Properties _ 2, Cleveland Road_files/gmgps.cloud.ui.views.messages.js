gmgps.cloud.ui.views.messages = function (args) {
    var me = this;
    me.cfg = args;
    me.$root = args.$root;

    me.onToolbarSetContext = new gmgps.cloud.common.event();

    me.init(args);

    return this;
};

gmgps.cloud.ui.views.messages.prototype = {
    //-----------------------------------------------------------------------------------------------------------------------------------------
    init: function () {
        var me = this;

        me.initControls();
        me.initHandlers();

        //Click the server-applied selection (one-time operation)
        setTimeout(function () {
            me.panel.selectDefaultItem();
        }, 100);
    },

    //-----------------------------------------------------------------------------------------------------------------------------------------
    initHandlers: function () {
        var me = this;

        me.panel.onPanelItemClicked.handle(function ($item) {
            me._panelItemClicked($item);
        });
    },

    //-----------------------------------------------------------------------------------------------------------------------------------------
    initControls: function () {
        var me = this;

        //Panel
        me.panel = new gmgps.cloud.ui.controls.panel({
            $root: me.$root.find('.panel[data-id="messages"]'),
            entityType: 'messages',
            defaultLayer: 'list'
        });
    },

    persist: function () {},

    _panelItemClicked: function (args) {
        args.$item.find('.spinner').hide();
        args.onComplete();
    }
};
