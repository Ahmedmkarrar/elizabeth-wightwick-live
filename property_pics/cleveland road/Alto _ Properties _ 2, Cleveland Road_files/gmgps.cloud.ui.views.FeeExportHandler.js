gmgps.cloud.ui.views.FeeExportHandler = function (args) {
    var me = this;

    me.http =
        args.http || new gmgps.cloud.http("FeeExportHandler-FeeExportHandler");

    me.$root = args.$root;

    me.container = args.container;

    return me;
};

gmgps.cloud.ui.views.FeeExportHandler.typeName =
    'gmgps.cloud.ui.views.FeeExportHandler';

gmgps.cloud.ui.views.FeeExportHandler.prototype = {
    init: function (onComplete) {
        var me = this;

        me.tabs = me.$root.find('.tabs').tabs();
        me.$root.find('.jqtip').qtip({
            content: {
                attr: 'data-tip'
            },
            position: {
                my: 'bottom middle',
                at: 'top middle'
            },
            style: {
                tip: true,
                width: '240px',
                classes: 'qtip-dark'
            }
        });

        me.loadData();

        if (onComplete && onComplete instanceof Function) {
            onComplete(me);
        }
    },

    loadData: function () {
        var me = this;

        me.http
            .ajax({
                args: {},
                complex: true,
                dataType: 'json',
                type: 'get',
                url: '/FeeExport/CompletedReports'
            })
            .done(function (r) {
                if (r && r.Data) {
                    me.$root.find('.timeline-content').html(r.Data).show();
                }
            });
    }
};
