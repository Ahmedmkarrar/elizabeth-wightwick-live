((function() {
    gmgps.cloud.ui.views.payRevenueHandler = PayRevenueHandler;

    function PayRevenueHandler(args) {
        var me = this;
        me.$root = args.$root;

        me.panels = {
            clientAccounts: null,
            account: null,
            timeline: null,
            reports: null
        };

        me.http = new gmgps.cloud.http('payRevenueHandler-PayRevenueHandler');
        return me;
    }

    PayRevenueHandler.prototype = {
        init: function (onComplete) {
            var me = this;
            me.initEventHandlers();
            me.initControls(function () {
                onComplete(me);
            });
        },
        initControls: function (onComplete) {
            var me = this;
            var tabId = id('accountlist');
            me.tabs = me.$root.find('.tabs');
            initTabs(me.tabs, tabId, me);

            me.panels.clientAccounts =
                new gmgps.cloud.ui.views.clientAccountsPanelHandler({
                    $root: me.$root.find(tabId),
                    url: '/Accounts/GetPayRevenueLayer',
                    http: me.http,
                    getId: id,
                    type: C.AccountCentreActionsType.PayInlandRevenue
                }).init();

            me.panels.timeline = new gmgps.cloud.ui.views.timelinePanelHandler({
                $root: me.$root.find(id('timeline')),
                url: '/Accounts/GetPayRevenueTimeline',
                http: me.http,
                getId: id
            }).init();

            me.panels.reports =
                new gmgps.cloud.ui.views.payRevenueReportPanelHandler({
                    $root: me.$root.find(id('nrlreports')),
                    http: me.http
                }).init();

            var deferreds = [
                me.panels.clientAccounts.refresh(),
                me.panels.reports.refresh()
            ];

            $.when.apply($, deferreds).done(function () {
                onComplete(me);
            });
        },
        initEventHandlers: function () {
            var me = this,
                namespace = '.PayRevenueHandler';

            me.$root.off(namespace);

            //ideally this should emit from clientAccounts tab
            me.$root.on(
                'click' + namespace,
                '.view-account',
                showClientAccountDetail
            );

            function showClientAccountDetail(e) {
                var $t = $(e.target);
                var account = $t.data('id');
                var accountName = $t.data('name');
                var accountTab = me.tabs.find('.account-detail-tab a');

                accountTab.html(
                    accountTab.data('template').format(accountName)
                );

                if (!me.panels.account) {
                    me.panels.account =
                        new gmgps.cloud.ui.views.payRevenueAccountPanelHandler({
                            http: me.http,
                            $root: me.$root.find(id('account'))
                        });
                    me.panels.account.init();
                }
                if (!me.panels.refunds) {
                    me.panels.refunds =
                        new gmgps.cloud.ui.views.payRevenueRefundsPanelHandler({
                            http: me.http,
                            $root: me.$root.find(id('Refunds'))
                        });
                    me.panels.refunds.init();
                }

                me.panels.account.id = account;
                me.panels.timeline.id = account;
                me.panels.refunds.id = account;

                me.panels.account.refresh().done(function (r) {
                    me.tabs.find('.tab-level-1').hide();
                    me.panels.clientAccounts.$root.hide();
                    me.tabs.find('.tab-level-2').show();
                    me.tabs.tabs(
                        'option',
                        'active',
                        accountTab.parent().index()
                    );
                    return r;
                });
            }
        }
    };

    function id(name) {
        return '#PayRevenue_' + name;
    }

    function initTabs(tabs, selectedTab, me) {
        var selectedTabEl = tabs.find('a[href="' + selectedTab + '"]').parent();
        var isLevel1 = selectedTabEl.hasClass('tab-level-1');
        tabs.find('.tab-level-2')[isLevel1 ? 'hide' : 'show']();
        tabs.find('.tab-level-1')[isLevel1 ? 'show' : 'hide']();
        tabs.tabs({
            active: selectedTabEl.index(),
            beforeActivate: function (event, ui) {
                if (ui.newTab.hasClass('refunds-tab')) {
                    me.panels.refunds.refresh();
                    return;
                }
                if (ui.newTab.hasClass('timeline-tab')) {
                    me.panels.timeline.refresh();
                    return;
                }
            }
        });
    }
}))();
