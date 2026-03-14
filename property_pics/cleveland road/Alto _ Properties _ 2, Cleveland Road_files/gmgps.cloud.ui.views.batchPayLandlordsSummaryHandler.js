((gmgps.cloud.ui.views.batchPayLandlordSummaryHandler = function (args) {
    var me = this;

    me.title = args.title;
    me.$content = args.$content;

    me.branchIds = args.branchIds;
    me.userId = args.userId;

    me.onComplete = args.onComplete;
    me.onCancel = args.onCancel;

    return me.init();
})),
    (gmgps.cloud.ui.views.batchPayLandlordSummaryHandler.prototype = {
        init: function () {
            var me = this;
            return me;
        },

        controller: function (args) {
            var me = this;

            me.params = args.data;
            me.$root = args.$root;
            me.$window = args.$window;

            me.$root = args.$root;
            me.$window = args.$window;

            me.$window
                .find('.top')
                .css('background-color', '#3399ff !important');
            me.$window.find('.middle').css('background-color', '#ffffff');

            me.$root.on('click', '.action-btn.bacs', function () {
                me.gotoAccountingTab();
            });

            me.$root.on('click', '.action-btn.manual', function () {
                me.loadManualPaymentsReport();
            });

            (this.loadManualPaymentsReport = function () {
                var paymentHistoryIds = me.$root
                    .find('#batchpaymentlordsresults')
                    .data('payment-ids');

                var paymentHistoryIdsArray;

                if (paymentHistoryIds.toString().indexOf(',') !== -1) {
                    paymentHistoryIdsArray = paymentHistoryIds.split(',');
                } else {
                    paymentHistoryIdsArray = [paymentHistoryIds];
                }

                var form = document.createElement('form');
                form.method = 'POST';
                form.action =
                    'Accounting/QuickPayLandlordsManualPaymentsReport';
                form.setAttribute('target', '_blank');

                var arrayLength = paymentHistoryIdsArray.length;
                for (var i = 0; i < arrayLength; i++) {
                    var IdsField = document.createElement('input');
                    IdsField.value = paymentHistoryIdsArray[i];
                    IdsField.name = 'historyEventIds';
                    form.appendChild(IdsField);
                }

                form.appendChild(IdsField);
                document.body.appendChild(form);
                form.submit();
                form.remove();
            }),
                (this.gotoAccountingTab = function () {
                    if (shell.navigation.selectedItem !== 'accounts') {
                        shell.navigation.selectTab(
                            'accounts',
                            false,
                            true,
                            function () {
                                setTimeout(function () {
                                    var $NRLTaxColumn = $(
                                        '.body .views .view[data-id="accounts"] .panel-container .item[data-unique-id="bacs-payment-update"] .button'
                                    );
                                    $NRLTaxColumn.trigger('click');
                                }, 200);
                            }
                        );
                    }
                }),
                (this.action = function (onComplete) {
                    onComplete();
                });
        },

        show: function () {
            var me = this;

            new gmgps.cloud.ui.controls.window({
                title: 'Landlord Statements Updated',
                windowId: 'quickPayLandlordsResults',
                controller: me.controller,
                data: me,
                $content: me.$content,
                post: false,
                complex: false,
                width: 510,
                draggable: true,
                modal: true,
                actionButton: 'Close',
                postActionCallback:
                    me.onComplete ||
                    function () {
                        return false;
                    },
                onCancel:
                    me.onCancel ||
                    function () {
                        return false;
                    }
            });
        }
    });
