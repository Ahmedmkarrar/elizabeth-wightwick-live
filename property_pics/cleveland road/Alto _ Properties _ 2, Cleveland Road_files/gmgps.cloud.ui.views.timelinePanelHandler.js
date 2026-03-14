((function() {
    gmgps.cloud.ui.views.timelinePanelHandler = TimelinePanel;

    function TimelinePanel(args) {
        var me = this;
        me.$root = args.$root;
        me.url = args.url;
        me.id = args.id || 0;

        me.http = args.http || new gmgps.cloud.http('timelinePanelHandler-TimelinePanel');
        return me;
    }
    TimelinePanel.prototype = {
        init: function () {
            return this;
        },
        initControls: function () {},
        refresh: function () {
            var me = this;
            return me.http
                .ajax({
                    args: {
                        groupBankAccountId: me.id
                    },
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: me.url
                })
                .done(function (response) {
                    var visible = me.$root.is(':visible');
                    me.$root.hide().html(response.Data);
                    if (visible) {
                        me.$root.show();
                    }
                    me.initControls();

                    return response;
                });
        }
    };
}))();
