//##PERF3 A temporary proxy to the PM dashboard.
//        To protect against forthcoming changes and provide the expected interface to home.js

gmgps.cloud.ui.views.home.pmdashboardproxy = function (args) {
    var me = this;
    me.initialised = false;
    me.forceRefreshOnNextActivation = false;
    me.isADashboard = true;
    me.dashboardId = 'pm';
    me.loading = null;

    me.header = 'PM Dashboard';
    me.args = args;

    me.branchIds = args.branchIds || [0];
    me.userId = args.userId || 0;
    me.propertyManagerIds = args.propertyManagerIds || [];
    me.$root = args.$root;
    me.proxy = null;

    me.init();

    return true;
};

gmgps.cloud.ui.views.home.pmdashboardproxy.prototype = {
    init: function () {
        return true;
    },

    activate: function (forceRefresh) {
        var me = this;

        if (forceRefresh || !me.initialised) {
            me.loading =
                me.loading ||
                me.refreshAll().done(function () {
                    me.initialised = true;
                });
        } else {
            setTimeout(function () {
                me.proxy.refreshHomeCharts();
            }, 250);
        }
    },

    refreshAll: function () {
        var me = this;

        var deferred = new $.Deferred();
        var args = {
            $root: me.$root,
            branchIds: me.branchIds,
            userId: me.userId,
            propertyManagerIds: me.propertyManagerIds
        };
        new gmgps.cloud.http("pmdashboardproxy-refreshAll").getView({
            url: '/PMHome/GetPMDashboard',
            args: args,
            complex: true,
            background: true,
            post: true,
            onSuccess: function (response) {
                me.$root.html(response.Data);
                me.proxy = new gmgps.cloud.ui.views.pmhomeDashboard(args);
                deferred.resolve();
            }
        });

        return deferred.promise();
    }
};
