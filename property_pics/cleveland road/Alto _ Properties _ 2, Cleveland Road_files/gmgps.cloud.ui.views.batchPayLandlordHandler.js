gmgps.cloud.ui.views.batchPayLandlordHandler = function (args) {
    var me = this;

    me.branchIds = args.branchIds;
    me.userId = args.userId;

    me.onComplete = args.onComplete;
    me.onCancel = args.onCancel;

    me.title = args.title;

    return me.init();
};

gmgps.cloud.ui.views.batchPayLandlordHandler.prototype = {
    init: function () {
        var me = this;

        return me;
    },

    controller: function (args) {
        var me = this;

        me.selectedIds = [];

        me.paymentsMadeIds = [];
        me.singlePayDialogVisible = false;

        me.params = args.data;

        me.$root = args.$root;

        me.$window = args.$window;

        me.$window.find('.top').css('background-color', '#3399ff !important');
        me.$window.find('.middle').css('background-color', '#ffffff');

        me.$window
            .find('.bottom .buttons .action-button')
            .after(
                '<div class="payment-counts"><span class="payments">0</span> Payments, <span class="amount">£0.00</span></div>'
            );

        me.$window
            .find('.top .title')
            .after(
                '<div class="cancel-payments-screen"><span class="fa fa-times"></span></div>'
            );

        me.$root.find('select').customSelect();

        me.$root.find('.date-picker').each(function (i, v) {
            $(v).datepicker({
                numberOfMonths: 2,
                showButtonPanel: true,
                dateFormat: 'dd/mm/yy',
                minDate:
                    $(v).attr('data-datePickerMode') == 'future'
                        ? new Date()
                        : null
            });
        });

        me.$root.on('click', '.landlord-payment-row', function () {
            me.paySingleLandlord($(this));
        });

        me.$root.on('click', 'tr .checkbox-item', function (e) {
            e.stopPropagation();
            return false;
        });

        me.$window.on('click', '.cancel-payments-screen', function () {
            // Couldnt find how to call the hide / close / dispose method on Window.js
            me.$window.find('.bottom .buttons .cancel-button').trigger('click');
        });

        $(window).on('resize', function () {
            me.resizeTableScrollRegion(false);
        });

        (this.displayLandlordSummary = function ($content) {
            //Show window
            new gmgps.cloud.ui.views.batchPayLandlordSummaryHandler({
                branchIds: me.branchIds,
                userId: me.userId,
                title: 'Posting of Landlord Statements is complete',
                $content: $content,
                actionButton: 'OK',
                onComplete: function () {
                    me.refreshData();
                }
            }).show();
        }),
            (this.setupSnazzyCheckboxes = function ($target) {
                var $items = $target || me.$root.find('.landlord-selected');

                $items
                    .checkboxpicker({
                        html: true,
                        offLabel: '<span class="glyphicon glyphicon-remove">',
                        onLabel: '<span class="glyphicon glyphicon-ok">'
                    })
                    .on('change', function () {
                        var checked =
                            $(this).prop('checked') === true;
                        var paymentId;

                        if (checked) {
                            $(this).closest('tr').addClass('tr-selected');
                            paymentId = $(this)
                                .closest('tr')
                                .attr('data-paymentid');
                            me.updateTrackedPaymentItems(paymentId, true);
                        } else {
                            $(this).closest('tr').removeClass('tr-selected');
                            paymentId = $(this)
                                .closest('tr')
                                .attr('data-paymentid');
                            me.updateTrackedPaymentItems(paymentId, false);
                        }

                        me.updateCounts();
                    });

                me.$root
                    .find('#sel-all-payments')
                    .checkboxpicker({
                        html: true,
                        offLabel: '<span class="glyphicon glyphicon-remove">',
                        onLabel: '<span class="glyphicon glyphicon-ok">'
                    })
                    .on('change', function () {
                        var masterChecked =
                            $(this).prop('checked') === true;

                        if (masterChecked) {
                            me.$root
                                .find('.landlord-selected')
                                .prop('checked', true)
                                .closest('tr')
                                .addClass('tr-selected');
                        } else {
                            me.$root
                                .find('.landlord-selected')
                                .prop('checked', false)
                                .closest('tr')
                                .removeClass('tr-selected');
                        }

                        me.updateCounts();
                    });

                me.reApplySelectedStateAfterTableUpdate();
            }),
            (this.reApplySelectedStateAfterTableUpdate = function () {
                $.each(me.selectedIds, function (i, idx) {
                    var sel =
                        '.landlord-payment-row[data-paymentid="' + idx + '"]';
                    var $row = me.$window.find(sel).addClass('tr-selected');
                    $row.find('.landlord-selected').prop('checked', true);
                });
            }),
            (this.reApplyPaymentStateAfterTableUpdate = function () {
                $.each(me.paymentsMadeIds, function (i, idx) {
                    var sel =
                        '.landlord-payment-row[data-paymentid="' + idx + '"]';
                    var $row = me.$window.find(sel).addClass('tr-paid');
                    $row.find('.landlord-selected').prop('checked', false);
                    $row.find('.checkbox-item').html(
                        '<div class="item-paid">PAID<span class="fa fa-check"></span></div>'
                    );
                });
            }),
            (this.updateTrackedPaymentItems = function (id, add) {
                var me = this;
                var index;

                if (add) {
                    index = me.selectedIds.indexOf(id);
                    if (index == -1) {
                        me.selectedIds.push(id);
                    }
                } else {
                    index = me.selectedIds.indexOf(id);
                    if (index > -1) {
                        me.selectedIds.splice(index, 1);
                    }
                }
            }),
            (this.updatePaidTrackedItems = function (id, add) {
                var me = this;
                var index;

                if (add) {
                    index = me.paymentsMadeIds.indexOf(id);
                    if (index === -1) {
                        me.paymentsMadeIds.push(id);
                    }
                } else {
                    index = me.paymentsMadeIds.indexOf(id);
                    if (index > -1) {
                        me.paymentsMadeIds.splice(index, 1);
                    }
                }
            }),
            (this.resizeTableScrollRegion = function () {
                var me = this;

                var initialHeight = $(window).height() - 120;
                me.$window.css('height', initialHeight);

                var initialWidth = $(window).width() - 60;
                me.$window.css('width', initialWidth);

                me.$window.css('top', '40px');
                me.$window.css('left', '25px');

                var windowHeight = me.$window.height();

                var widgetWindowHeight = windowHeight - 40;
                widgetWindowHeight += 'px';

                var scrollRegionHeight = widgetWindowHeight - 420;
                scrollRegionHeight += 'px';

                var tableContainerHeight = windowHeight - 100;
                tableContainerHeight += 'px';

                me.$window
                    .find('.widget-body')
                    .css('height', widgetWindowHeight);
                me.$window.find('.widget-body').css('margin-top', '-10px');
                me.$window
                    .find('.fixed-table-body')
                    .css('height', scrollRegionHeight);
                me.$window
                    .find('.fixed-table-container')
                    .css('height', tableContainerHeight)
                    .css('overflow', 'hidden');

                me.$root.find('#PMHomeLoadedTable').bootstrapTable('refresh');
            });

        this.paySingleLandlord = function ($row) {
            var me = this;

            var contactId = $row.attr('data-contactid');
            var landlordName = $row.attr('data-landlord-name');

            if (!me.singlePayDialogVisible) {
                me.singlePayDialogVisible = true;

                new gmgps.cloud.ui.views.payLandlordHandler({
                    id: contactId,
                    title: 'Payments For This Landlord: ' + landlordName,
                    onComplete: function () {
                        me.updatePaymentsRow($row.data('contactid')).done(
                            function (r) {
                                if (r) {
                                    if (r.Data.length > 0) {
                                        // Remove row from selected items prior to table re-load
                                        var $newRow = $(r.Data);
                                        me.setupSnazzyCheckboxes(
                                            $newRow.find('.landlord-selected')
                                        );
                                        $row.replaceWith($newRow);
                                    } else {
                                        $row.remove();
                                    }
                                }

                                me.updateCounts();
                                me.singlePayDialogVisible = false;
                            }
                        );
                    },
                    onCancel: function () {
                        me.singlePayDialogVisible = false;
                    }
                }).show();
            }
        };

        (this.updatePaymentsRow = function (contactId) {
            return new gmgps.cloud.http(
                "batchPayLandlordHandler-updatePaymentsRow"
            ).ajax({
                args: {
                    branchIds: me.params.branchIds,
                    userId: me.params.userId,
                    contactId: contactId
                },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/PMHome/GetLandlordsToPayRow'
            });
        }),
            (this.updateCounts = function () {
                var summary = me.getSelectionSummary();
                me.updateActionButton(summary.selectedLandlords);
                me.updatePayableItems(
                    summary.selectedLandlords,
                    summary.selectedAmount
                );
            }),
            (this.getSelectionSummary = function () {
                var checkedRows = me.$root.find('.landlord-selected:checked');
                var selectedLandlords = checkedRows.length;
                var amount = 0.0;
                checkedRows.each(function () {
                    amount += parseFloat(
                        $(this)
                            .closest('.landlord-payment-row')
                            .attr('data-amount')
                    );
                });

                return {
                    selectedLandlords: selectedLandlords,
                    selectedAmount: amount
                };
            }),
            (this.updateActionButton = function (counter) {
                if (counter > 0) {
                    me.$window
                        .find('.bottom .buttons .action-button')
                        .text('Pay Landlords')
                        .removeClass('grey')
                        .addClass('bgg-property');
                } else {
                    me.$window
                        .find('.bottom .buttons .action-button')
                        .text('Pay Landlords')
                        .addClass('grey')
                        .removeClass('bgg-property');
                }
            }),
            (this.updatePayableItems = function (counter, amount) {
                var amountFormatted = '£' + amount.toFixed(2);

                if (counter > 0) {
                    me.$window
                        .find('.bottom .buttons .payment-counts .payments')
                        .text(counter);
                    me.$window
                        .find('.bottom .buttons .payment-counts .amount')
                        .text(amountFormatted);
                    me.$window.find('.bottom .buttons .payment-counts').show();
                } else {
                    me.$window.find('.bottom .buttons .payment-counts').hide();
                }
            }),
            (this.refreshData = function () {
                var me = this;

                new gmgps.cloud.http(
                    "batchPayLandlordHandler-refreshData"
                ).ajax(
                    {
                        args: {
                            branchIds: me.params.branchIds,
                            userId: me.params.userId
                        },
                        complex: true,
                        dataType: 'html',
                        type: 'post',
                        url: '/PMHome/GetLandlordsToPayDetail'
                    },
                    function (response) {
                        me.$root.find('#widget-body').html('').append(response);

                        me.$root.find('#PMHomeLoadedTable').bootstrapTable();

                        me.resizeTableScrollRegion();

                        me.updateCounts();

                        me.setupSnazzyCheckboxes();
                    }
                );
            }),
            (this.action = function (onComplete, $btn) {
                if (!$btn.hasClass('bgg-property')) {
                    return false;
                } else {
                    var summary = me.getSelectionSummary();
                    var amountFormatted =
                        '£' + summary.selectedAmount.toFixed(2);
                    var infoMessage =
                        'You are about to post ' +
                        summary.selectedLandlords +
                        ' payments totalling ' +
                        amountFormatted;

                    showDialog({
                        title: 'Information',
                        type: 'info',
                        msg: infoMessage,
                        dialogClass: 'batch-pay-landlord-handler',
                        buttons: {
                            Confirm: function () {
                                me.processSelectedLandlordPayments(onComplete);
                                $(this).dialog('close');
                            },
                            Cancel: function () {
                                $(this).dialog('close');
                            }
                        }
                    });
                    return false;
                }
            }),
            (this.getPaymentInfomationIds = function () {
                var QuickPayLandlordItems = [];

                me.$root.find('.landlord-selected:checked').each(function () {
                    var $row = $(this).closest('.landlord-payment-row');

                    var contactId = parseInt($row.attr('data-contactid'));
                    var paymentGroupId = parseInt(
                        $row.attr('data-payment-groupid')
                    );
                    var bankAccountId = parseInt(
                        $row.attr('data-bank-accountid')
                    );

                    QuickPayLandlordItems.push({
                        ContactId: contactId,
                        paymentGroupId: paymentGroupId,
                        AccountId: bankAccountId
                    });
                });

                return QuickPayLandlordItems;
            }),
            (this.processSelectedLandlordPayments = function (onComplete) {
                var QuickPayLandlordItems = me.getPaymentInfomationIds();

                return new gmgps.cloud.http(
                    "batchPayLandlordHandler-processSelectedLandlordPayments"
                )
                    .ajax(
                        {
                            args: {
                                paymentList: QuickPayLandlordItems
                            },
                            complex: true,
                            background: false,
                            dataType: 'json',
                            type: 'post',
                            url: '/Accounting/QuickPayLandlords'
                        },
                        function (response) {
                            me.displayLandlordSummary($(response.Data));
                            //onComplete();
                        }
                    )
                    .done(function () {
                        onComplete();
                    });
            }),
            me.$root.find('#PMHomeLoadedTable').bootstrapTable({
                onPostBody: function () {
                    me.setupSnazzyCheckboxes();
                    //me.reApplyPaymentStateAfterTableUpdate();
                }
            });

        // Delay table resize due to Window fade in effect
        setTimeout(function () {
            me.resizeTableScrollRegion();
        }, 100);

        me.updateCounts();

        me.$root.on('mouseenter', '.supplier-icon', function () {
            $(this).qtip({
                content: $(this).attr('data-tip'),
                position: {
                    my: 'top middle',
                    at: 'bottom middle'
                },
                show: {
                    event: 'mouseenter',
                    ready: true,
                    delay: 0,
                    effect: function () {
                        $(this).fadeIn(50);
                    }
                },
                hide: 'mouseout',
                style: {
                    tip: true,
                    classes: 'ui-tooltip-dark'
                }
            });
        });
    },

    show: function () {
        var me = this;

        var initialWidth = $(window).width() - 60;

        new gmgps.cloud.ui.controls.window({
            title: me.title,
            windowId: 'batchPayLandlordModal',
            controller: me.controller,
            url: 'PMHome/GetBatchPayLandlordsSummary',
            urlArgs: {
                branchIds: me.branchIds,
                userId: me.userId
            },
            data: me,
            post: true,
            complex: true,
            width: initialWidth,
            draggable: true,
            modal: true,
            cancelButton: 'Close',
            actionButton: 'Pay Landlords',
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
};
