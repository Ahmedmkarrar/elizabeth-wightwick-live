gmgps.cloud.ui.views.accounts = function (args) {
    var me = this;
    me.cfg = args;
    me.$root = args.$root;
    me.settings = {};

    me.onViewModeChanged = new gmgps.cloud.common.event();

    me.init(args);

    return this;
};

gmgps.cloud.ui.views.accounts.prototype = {
    init: function () {
        var me = this;

        //Panel
        me.panel = new gmgps.cloud.ui.controls.panel({
            $root: me.$root.find('.panel[data-id="accounts"]'),
            entityType: 'accounts',
            defaultLayer: 'list'
        });

        me.initHandlers();

        setTimeout(function () {
            me.panel.selectDefaultItem();
        }, 100);

        me.setupToolbar('list');
    },

    initHandlers: function () {
        //Note that live handers are initalised here for all sections.
        // - The only init we need to perform as the individual sections are updated, are those such as .tabs(), etc.
        var me = this;

        me.panel.onPanelItemClicked.handle(function (args) {
            me._panelItemClicked(args);
        });
        me.panel.onPanelItemFilterChanged.handle(function ($item) {
            me._onPanelItemFilterChanged($item);
        });

        me.handlers = {};
    },
    refreshView: function () {
        var me = this;
        new gmgps.cloud.http("accounts-refreshView").getView({
            url: 'Panel/GetAccountsPanel',
            automated: true,
            background: true,
            complex: true,
            post: true,
            onSuccess: function (response) {
                var $new = $(response.Data);
                var lastButtonId = me.panel.$root.find('.on').data('id');
                me.panel.$root.replaceWith($new);
                me.panel.cfg.$root = me.panel.$root = $new;
                me.panel.init(me.panel.cfg);

                var newButton = $new.find('.on');
                if (lastButtonId !== newButton.data('id')) {
                    var button = $new.find(
                        '.item[data-id="' + lastButtonId + '"]'
                    );
                    if (button.length > 0) {
                        //button is available select it - no need to refresh detail view.
                        me.panel.selectButton(me.panel.$root, button);
                    } else {
                        //button removed, select the one set by the server.
                        setTimeout(function () {
                            me.panel.selectDefaultItem();
                        });
                    }
                }
            }
        });
    },
    setupToolbar: function (layer) {
        var items = null;

        var $tb = $('#toolbar .group[data-group="accounts"]');
        $tb.find('.contextual-section').hide();

        $tb.find('div.btn').hide();

        //Actions
        var $b = $tb.find('div[data-id="action"]');
        $b.show().find('.item').hide();

        $tb.find('div[data-id="action"] li').hide();

        //Display available actions.
        if (items) {
            $.each(items, function (i, v) {
                $b.find('.item[data-id="' + v + '"]').show();
            });
        }

        $tb.find('.' + layer).show();
    },

    _onPanelItemFilterChanged: function () {},

    _panelItemClicked: function (args) {
        var me = this;

        var id = parseInt(args.$item.attr('data-id'));

        switch (args.$item.attr('data-type')) {
            case 'detail':
                break;

            case 'list':
                me.$root.find('.layers .layer').hide();

                if (!me.handlers[id]) {
                    me.handlers[id] = me.getHandler(id);
                }

                if (me.handlers[id]) {
                    me.handlers[id].init(function () {
                        me.handlers[id].$root.show();
                        args.onComplete();
                    });
                }
                break;
            default:
                args.onComplete();
                break;
        }
    },

    reinitHandler: function (id) {
        var me = this;
        me.handlers[id].init(function () {});
    },

    getHandler: function (id) {
        var me = this;

        switch (id) {
            case C.AccountCentreActionsType.BacsPaymentUpdate:
                return new gmgps.cloud.ui.views.bacsPaymentHandler({
                    $root: me.$root.find(
                        '.content-container .layers .bacspayment'
                    ),
                    container: me
                });

            case C.AccountCentreActionsType.BankReconciliation:
                return new gmgps.cloud.ui.views.bankReconciliationHandler({
                    $root: me.$root.find(
                        '.content-container .layers .reconciliation'
                    ),
                    container: me
                });

            case C.AccountCentreActionsType.PayAgencyFees:
                return new gmgps.cloud.ui.views.payAgencyHandler({
                    $root: me.$root.find(
                        '.content-container .layers .payagency'
                    ),
                    container: me
                });

            case C.AccountCentreActionsType.OpeningBalances:
                return new gmgps.cloud.ui.views.openBalancesHandler({
                    $root: me.$root.find(
                        '.content-container .layers .openbalances'
                    ),
                    container: me
                });

            case C.AccountCentreActionsType.PayInlandRevenue:
                return new gmgps.cloud.ui.views.payRevenueHandler({
                    $root: me.$root.find(
                        '.content-container .layers .payrevenue'
                    )
                });

            case C.AccountCentreActionsType.BankTransfer:
                return new gmgps.cloud.ui.views.bankTransferHandler({
                    $root: me.$root.find(
                        '.content-container .layers .banktransfer'
                    )
                });

            case C.AccountCentreActionsType.PeriodStatements:
                return new gmgps.cloud.ui.views.periodStatementsHandler({
                    $root: me.$root.find(
                        '.content-container .layers .periodstatements'
                    )
                });

            case C.AccountCentreActionsType.ImportReceipts:
                return new gmgps.cloud.ui.views.receiptImportsHandler({
                    $root: me.$root.find(
                        '.content-container .layers .importreceipts'
                    )
                });

            case C.AccountCentreActionsType.FeeExport:
                return new gmgps.cloud.ui.views.FeeExportHandler({
                    $root: me.$root.find(
                        '.content-container .layers .feeexports'
                    ),
                    container: me
                });

            case C.AccountCentreActionsType.ImportCharges:
                return new gmgps.cloud.ui.views.ImportChargesHandler({
                    $root: me.$root.find(
                        '.content-container .layers .importcharges'
                    ),
                    container: me
                });

            case C.AccountCentreActionsType.ImportFranchiseCharges:
                return new gmgps.cloud.ui.views.ImportFranchiseChargesHandler({
                    $root: me.$root.find(
                        '.content-container .layers .importfranchisecharges'
                    ),
                    container: me
                });
        }
    },

    action: function () {}
};
