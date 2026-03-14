gmgps.cloud.ui.views.home.esignaturesStats = function (
    container,
    esignaturesApi
) {
    var me = this;
    me.$root = container;
    me.esignaturesApi =
        esignaturesApi || new gmgps.cloud.services.EsignaturesApi();

    return true;
};

gmgps.cloud.ui.views.home.esignaturesStats.typeName =
    'gmgps.cloud.ui.views.home.esignaturesStats';

gmgps.cloud.ui.views.home.esignaturesStats.prototype = {
    refresh: function (search) {
        var me = this;

        me.esignaturesApi.getSigningRequestsStats(search).then(function (data) {
            me.$root.find('.count').each(function (i, v) {
                var $count = $(v);
                var name = $count.data('name');

                var counter = new CountUp($count[0], 0, data[name], 0, 0.7, {
                    useEasing: true,
                    useGrouping: true,
                    separator: ','
                });

                counter.start();
            });
        });
    }
};
