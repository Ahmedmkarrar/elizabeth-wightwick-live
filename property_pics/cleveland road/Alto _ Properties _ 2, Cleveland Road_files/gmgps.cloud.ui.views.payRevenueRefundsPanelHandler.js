((function() {
    gmgps.cloud.ui.views.payRevenueRefundsPanelHandler = RefundsPanel;

    function RefundsPanel(args) {
        var me = this;
        me.$root = args.$root;
        me.id = args.id;

        me.http = args.http || new gmgps.cloud.http('payRevenueRefundsPanelHandler-RefundsPanel');
        return me;
    }
    RefundsPanel.prototype = {
        init: function () {
            return this;
        },
        initControls: function () {
            var me = this;

            gmgps.cloud.helpers.ui.initDatePickers(me.$root);
            gmgps.cloud.helpers.ui.initInputs(me.$root);

            me.$root.find('.customStyleSelectBox').css('width', '');

            me.initEvents();
        },
        initEvents: function () {
            var me = this,
                namespace = '.refundsPanelHandler';
            me.$root
                .off(namespace)
                .on('change' + namespace, '#BranchId', doSearch)
                //.find('#SearchRefunds')
                //.off(namespace)
                .on(
                    'keyup' + namespace,
                    '#SearchRefunds',
                    $.debounce(350, false, doSearch)
                )
                .on('click' + namespace, '.item-row', openRefundsModal);

            function doSearch() {
                me.search(
                    me.$root.find('#BranchId').val(),
                    me.$root.find('#SearchRefunds').val()
                );
            }
            function openRefundsModal(e) {
                me.showRefundDetails($(e.currentTarget).data());
            }
        },
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
                    url: '/Accounts/GetPayRevenueRefundDetail'
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
        },
        search: function (branch, value) {
            var me = this;
            var rows = me.$root.find('.refund-detail-content tr').hide();
            if (branch) {
                rows = rows.filter('[data-branchid={0}]'.format(branch));
            }
            if (value) {
                rows = rows
                    .find(
                        '[data-id={0}], td.contact:containsi({0}), td.certificate:containsi({0})'.format(
                            value
                        )
                    )
                    .closest('tr');
            }
            rows.show();
        },
        showRefundDetails: function (data) {
            var me = this;
            new gmgps.cloud.ui.views.payRevenueRefundsWindowHandler({
                windowId: 'payRevenueRefundsModal',
                title: 'Refunds for: ' + data.contact,
                contactId: data.id,
                groupBankAccountId: me.id
            })
                .show()
                .done(function () {
                    console.log(arguments);
                    me.refresh();
                });
        }
    };
}))();
