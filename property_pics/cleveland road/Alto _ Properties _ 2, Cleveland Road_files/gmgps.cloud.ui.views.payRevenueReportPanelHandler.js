((function() {
    gmgps.cloud.ui.views.payRevenueReportPanelHandler = ReportPanel;

    function ReportPanel(args) {
        var me = this;
        me.$root = args.$root;
        me.http = args.http || new gmgps.cloud.http('payRevenueReportPanelHandler-ReportPanel');
        return me;
    }

    ReportPanel.prototype = {
        init: function () {
            var me = this;
            me.initEventHandlers();
            return me;
        },
        initControls: function () {
            var me = this;
            gmgps.cloud.helpers.ui.initInputs(me.$root);
            me.$root.find('.customStyleSelectBox').css('width', '');

            me.form = me.$root.find('form');
            me.form.validationEngine({
                promptPosition: 'bottomLeft',
                scroll: false
            });
        },
        initEventHandlers: function () {
            var namespace = '.reportPanel';
            var me = this;
            me.$root
                .off(namespace)
                .on('change' + namespace, '.in-reporttype', updateDateInputs)
                .on(
                    'click' + namespace,
                    '.btn-update',
                    $.proxy(me.getReport, me)
                );

            function updateDateInputs(e) {
                var value = parseInt(e.target.value, 10);
                e.stopPropagation();
                switch (value) {
                    case C.NRLDocumentType.NRL6:
                    case C.NRLDocumentType.NRLY:
                        me.$root
                            .addClass('annual-report')
                            .removeClass('quarter-report');
                        break;
                    default:
                        me.$root
                            .addClass('quarter-report')
                            .removeClass('annual-report');
                        break;
                }
            }
        },
        getReport: function () {
            var me = this;
            if (me.valid()) {
                var $root = me.$root;

                var reportId = $root.find('.in-reporttype').asNumber();
                if (reportId === C.ReportType.NRLQ) {
                    var isGroupByClientAccount = $root
                        .find('.in-groupbyclientaccount')
                        .prop('checked');
                    var reportargs = {
                        GroupByClientAccount: isGroupByClientAccount,
                        ReportId: $root.find('.in-reporttype').asNumber(),
                        Config: {
                            GroupById: isGroupByClientAccount ? 1 : 0,
                            ReportId: reportId,
                            DateTo: $root.find('.in-quarter').val()
                        }
                    };

                    return me.http
                        .ajax({
                            args: reportargs,
                            complex: true,
                            dataType: 'json',
                            type: 'post',
                            url: 'Reporting/GetReportHtml'
                        })
                        .done(function (response) {
                            var data = $(response.Data).filter(
                                '.title, .table'
                            );
                            data.find('th').css('width', '');
                            $root
                                .find('.report-detail')
                                .hide()
                                .html(data)
                                .show();
                            return response;
                        });
                } else {
                    var $form = gmgps.cloud.utility.buildForm(
                        'Accounting/GenerateNRLDocuments',
                        {
                            GroupByClientAccount: $root
                                .find('.in-groupbyclientaccount')
                                .val(),
                            DocumentId: $root.find('.in-reporttype').asNumber(),
                            DateTo: $root.find('.in-yearend').val()
                        }
                    );
                    $form.submit();
                    $form.remove();
                }
            }
        },
        valid: function () {
            var me = this;
            return me.form.validationEngine('validate', { scroll: false });
        },
        refresh: function () {
            var me = this;
            return me.http
                .ajax({
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: 'Accounts/GetPayRevenueReports'
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
