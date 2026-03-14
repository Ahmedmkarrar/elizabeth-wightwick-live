gmgps.cloud.ui.views.batchPayArrearsHandler = function (args) {
    var me = this;

    me.branchIds = args.branchIds;
    me.userId = args.userId;

    me.sectionId = args.sectionId;
    me.sourceId = args.sourceId;

    me.onComplete = args.onComplete;
    me.onCancel = args.onCancel;

    me.title = args.title;

    return me.init();
};

gmgps.cloud.ui.views.batchPayArrearsHandler.prototype = {
    init: function () {
        var me = this;

        return me;
    },

    controller: function (args) {
        var me = this;

        var ignoreNextCheckStateChange = false;

        me.closeWindowHandler = args.closeMyWindow;
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
                '<div class="payment-counts"><span class="payments">0</span> Receipts, <span class="amount">£0.00</span></div>'
            );

        me.$window
            .find('.top .title')
            .after(
                '<div class="cancel-payments-screen"><span class="fa fa-times"></span></div>'
            );

        me.$root.find('select').customSelect();

        (this.searchWithinRows = function (searchTerm) {
            var me = this;

            if (searchTerm.length > 0) {
                var $rows = me.$root.find('.arrears-payment-row');

                $rows.each(function () {
                    var searchIndex = $(this).attr('data-search-index');

                    if (searchIndex.indexOf(searchTerm) < 0) {
                        $(this).addClass('hidden-by-search');
                    } else {
                        $(this).removeClass('hidden-by-search');
                    }
                });
            } else {
                $('.arrears-payment-row').removeClass('hidden-by-search');
            }
        }),
            (this.showWarningMessage = function () {
                var me = this;
                me.$window.find('.warning-message').slideDown(200);
            }),
            (this.markAsFailed = function (Id, RecordType) {
                var sel, $row;

                if (RecordType === C.ModelType.Tenancy) {
                    sel = '.arrears-payment-row[data-tenancyid="' + Id + '"]';
                    $row = $(sel);
                    $row.addClass('tr-failed');
                } else {
                    sel = '.arrears-payment-row[data-contactid="' + Id + '"]';
                    $row = $(sel);
                    $row.addClass('tr-failed');
                }
            }),
            (this.setAllocationStvate = function ($item, level) {
                if (level === 'FULL') {
                    $item
                        .removeClass('none')
                        .removeClass('partial')
                        .addClass('full');
                    $item.attr('data-marked-for-payment', true);
                }

                if (level === 'PARTIAL') {
                    $item
                        .removeClass('none')
                        .addClass('partial')
                        .removeClass('full');
                    $item.attr('data-marked-for-payment', true);
                }

                if (level === 'NONE') {
                    $item
                        .addClass('none')
                        .removeClass('partial')
                        .removeClass('full');
                    $item.attr('data-marked-for-payment', false);
                }
            }),
            (this.allocateHeldFunds = function ($row) {
                var me = this;

                Decimal.config({
                    rounding: 4
                });

                var heldFundsAvail = parseFloat(
                    $row.attr('data-held-available')
                );
                var totalDue = parseFloat($row.attr('data-amount-due'));
                var heldUsed = 0.0;

                var d_totalDue = new Decimal(totalDue);
                var d_heldFundsAvail = new Decimal(heldFundsAvail);
                var d_autoReceiptAmount = new Decimal(0.0);
                var d_heldused = new Decimal(heldUsed);

                if (heldFundsAvail >= totalDue) {
                    heldUsed = totalDue;
                    d_heldused = d_totalDue;
                } else if (heldFundsAvail > 0 && heldFundsAvail < totalDue) {
                    heldUsed = heldFundsAvail;
                    d_heldused = d_heldFundsAvail;
                    d_autoReceiptAmount = d_totalDue.sub(d_heldFundsAvail);

                    $row.attr('data-amount-allocated', d_autoReceiptAmount);
                    $row.find('.row-amount-input').val(d_autoReceiptAmount);
                } else {
                    d_autoReceiptAmount = d_totalDue.sub(d_heldFundsAvail);

                    $row.attr('data-amount-allocated', d_autoReceiptAmount);
                    $row.find('.row-amount-input').val(d_autoReceiptAmount);
                }

                $row.find('.held-used')
                    .find('.held-used-info')
                    .text(me.currencyWithCommas(d_heldused));
                $row.attr('data-held-used', parseFloat(d_heldused)); // format currency
            }),
            (this.calculateTotalBeingPaid = function ($row) {
                var amountDue = new Decimal(0);
                var $items = $row
                    .find('.row-allocated-amount')
                    .find('.txn-item');

                $items.each(function () {
                    var isLandlordIcome =
                        $(this).attr('data-is-income') == 'True' ? true : false;
                    var tenancyIsPending =
                        $(this).attr('data-tenancy-status') == 'Pending'
                            ? true
                            : false;

                    if (tenancyIsPending && isLandlordIcome) {
                        return;
                    } else {
                        var outstandingOnItem = new Decimal(
                            parseFloat($(this).attr('data-amount-allocated'))
                        );
                        amountDue = amountDue.add(outstandingOnItem);
                    }
                });

                $row.attr('data-actual-allocation-sum', amountDue);
            }),
            (this.calculatePayableTotal = function ($row) {
                var amountDue = new Decimal(0);
                var $items = $row
                    .find('.row-allocated-amount')
                    .find('.txn-item');

                $items.each(function () {
                    var isLandlordIcome =
                        $(this).attr('data-is-income') == 'True' ? true : false;
                    var tenancyIsPending =
                        $(this).attr('data-tenancy-status') == 'Pending'
                            ? true
                            : false;

                    if (tenancyIsPending && isLandlordIcome) {
                        return;
                    } else {
                        var outstandingOnItem = new Decimal(
                            parseFloat($(this).attr('data-amount'))
                        );
                        amountDue = amountDue.add(outstandingOnItem);
                    }
                });

                $row.attr('data-total-payable', amountDue);
            }),
            (this.allocateAmounts = function ($row) {
                var heldAllocated = parseFloat($row.attr('data-held-used'));
                var inputAllocated = parseFloat(
                    $row.attr('data-amount-allocated')
                );

                var d_heldAllocated = new Decimal(heldAllocated);
                var d_inputAllocated = new Decimal(inputAllocated);
                var d_amountToAllocate = new Decimal(
                    d_heldAllocated.add(d_inputAllocated)
                );

                var totalDue = parseFloat($row.attr('data-amount-due'));
                var d_totalDue = new Decimal(totalDue);

                var $allocatedCol = $row.find('.row-allocated-amount');

                if (d_amountToAllocate.greaterThanOrEqualTo(d_totalDue)) {
                    me.setAllocationStvate($allocatedCol, 'FULL');
                } else if (d_amountToAllocate.greaterThan(0)) {
                    me.setAllocationStvate($allocatedCol, 'PARTIAL');
                } else {
                    me.setAllocationStvate($allocatedCol, 'NONE');
                }

                var $items = $row
                    .find('.row-allocated-amount')
                    .find('.txn-item');

                $items.each(function () {
                    var outstandingOnItem = parseFloat(
                        $(this).attr('data-amount')
                    );
                    var d_outstandingOnItem = new Decimal(outstandingOnItem);

                    if (d_amountToAllocate.greaterThan(0)) {
                        var isLandlordIcome =
                            $(this).attr('data-is-income') == 'True'
                                ? true
                                : false;
                        var tenancyIsPending =
                            $(this).attr('data-tenancy-status') == 'Pending'
                                ? true
                                : false;

                        if (tenancyIsPending && isLandlordIcome) {
                            me.setAllocationStvate($(this), 'NONE');
                            return true;
                        } else {
                            // Full amount available, subtract from available amount
                            // mark as fully paid
                            if (
                                d_amountToAllocate.greaterThanOrEqualTo(
                                    d_outstandingOnItem
                                ) &&
                                d_outstandingOnItem.greaterThan(0)
                            ) {
                                $(this).attr(
                                    'data-amount-allocated',
                                    d_outstandingOnItem
                                );
                                $(this)
                                    .find('.amount-allocated-info')
                                    .text(
                                        me.currencyWithCommas(
                                            d_outstandingOnItem
                                        )
                                    );
                                d_amountToAllocate =
                                    d_amountToAllocate.sub(d_outstandingOnItem);

                                me.setAllocationStvate($(this), 'FULL');
                                return true;
                            }

                            // Partial amount due, subtract from available amount
                            // mark as partially paid
                            if (
                                d_amountToAllocate.lessThan(
                                    d_outstandingOnItem
                                ) &&
                                d_outstandingOnItem.greaterThan(0)
                            ) {
                                $(this).attr(
                                    'data-amount-allocated',
                                    d_amountToAllocate
                                );
                                $(this)
                                    .find('.amount-allocated-info')
                                    .text(
                                        me.currencyWithCommas(
                                            d_amountToAllocate
                                        )
                                    );

                                d_amountToAllocate = new Decimal(0);

                                me.setAllocationStvate($(this), 'PARTIAL');
                                return true;
                            }
                        }
                    } else {
                        // Nothing available. Nothing allocated.
                        // mark as not paid
                        $(this).attr('data-amount-allocated', 0);
                        $(this)
                            .find('.amount-allocated-info')
                            .text(me.currencyWithCommas(0));

                        me.setAllocationStvate($(this), 'NONE');
                        return true;
                    }
                });

                var $adjust;

                if (d_amountToAllocate.greaterThan(0)) {
                    $adjust = $row.next().find('.monies-held-adjustment');
                    $adjust.css('display', 'table-row');
                    $adjust
                        .find('.currency-col')
                        .text(me.currencyWithCommas(d_amountToAllocate));
                    $row.attr(
                        'data-held-funds-postback',
                        parseFloat(d_amountToAllocate)
                    );
                } else {
                    $adjust = $row.next().find('.monies-held-adjustment');
                    $adjust
                        .find('.currency-col')
                        .text(me.currencyWithCommas(0));
                    $adjust.css('display', 'none');
                    $row.attr('data-held-funds-postback', 0);
                }

                me.calculateTotalBeingPaid($row);
                me.updateCounts();
            }),
            (this.processStateChange = function ($row, reAllocateHeldFunds) {
                me.calculatePayableTotal($row);

                if (reAllocateHeldFunds) {
                    me.allocateHeldFunds($row);
                }

                me.allocateAmounts($row);
            }),
            (this.setWindowTitle = function () {
                var me = this;

                me.$window
                    .find('.title')
                    .text('Batch Receipts');
            }),
            (this.setupSnazzyCheckboxes = function ($target) {
                var $items = $target || me.$root.find('.arrear-selected');

                $items
                    .checkboxpicker({
                        html: true,
                        offLabel: '<span class="glyphicon glyphicon-remove">',
                        onLabel: '<span class="glyphicon glyphicon-ok">'
                    })
                    .on('change', function () {
                        var checked =
                            $(this).prop('checked') === true;
                        var $row,
                            paymentId = 0;

                        if (!ignoreNextCheckStateChange) {
                            if (checked) {
                                $row = $(this).closest('tr');
                                $row.addClass('tr-selected');

                                paymentId = $row.attr('data-paymentid');

                                var heldAvailable =
                                    $row.attr('data-held-funds');
                                $row.attr('data-held-available', heldAvailable);

                                me.updateTrackedPaymentItems(paymentId, true);
                                me.processStateChange($row, true);
                                me.calculateTotalBeingPaid($row);
                            } else {
                                $row = $(this).closest('tr');
                                $row.removeClass('tr-selected');

                                paymentId = $row.attr('data-paymentid');

                                $row.attr('data-amount-allocated', 0.0);
                                $row.attr('data-held-used', 0.0);
                                $row.attr('data-held-available', 0.0);
                                $row.find('.row-amount-input').val(0.0);
                                $row.find('.held-used')
                                    .find('.held-used-info')
                                    .text(me.currencyWithCommas(0));
                                me.updateTrackedPaymentItems(paymentId, false);
                                me.processStateChange($row, false);
                                me.calculateTotalBeingPaid($row);
                            }
                        } else {
                            ignoreNextCheckStateChange = false;

                            $row = $(this).closest('tr');
                            if (checked) {
                                $row.addClass('tr-selected');
                                me.updateTrackedPaymentItems(paymentId, true);
                                me.calculateTotalBeingPaid($row);
                            } else {
                                $row.removeClass('tr-selected');
                                me.updateTrackedPaymentItems(paymentId, false);
                                me.calculateTotalBeingPaid($row);
                            }
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
                                .find('tr:not(.hidden-by-search) input.arrear-selected') 
                                .prop('checked', true)
                                .closest('tr')
                                .addClass('tr-selected');
                        } else {
                            me.$root
                                .find('.arrear-selected')
                                .prop('checked', false)
                                .closest('tr')
                                .removeClass('tr-selected');
                        }

                        me.updateCounts();
                    });
            }),
            (this.updateTrackedPaymentItems = function (id, add) {
                var index = me.selectedIds.indexOf(id);

                if (add) {
                    if (index == -1) {
                        me.selectedIds.push(id);
                    }
                } else {
                    if (index > -1) {
                        me.selectedIds.splice(index, 1);
                    }
                }
            }),
            (this.updatePaidTrackedItems = function (id, add) {
                var me = this;
                var index = me.paymentsMadeIds.indexOf(id);

                if (add) {
                    if (index == -1) {
                        me.paymentsMadeIds.push(id);
                    }
                } else {
                    if (index > -1) {
                        me.paymentsMadeIds.splice(index, 1);
                    }
                }
            }),
            (this.resizeTableScrollRegion = function () {
                var me = this;

                var warningMessageVisible =
                    me.$root.find('.warning-message').css('display') == 'none'
                        ? false
                        : true;

                var initialHeight = $(window).height() - 120;
                me.$window.css('height', initialHeight);

                var initialWidth = $(window).width() - 60;
                me.$window.css('width', initialWidth);

                me.$window.css('top', '40px');
                me.$window.css('left', '25px');

                var windowHeight = me.$window.height();

                var widgetWindowHeight = windowHeight - 40;
                widgetWindowHeight += 'px';

                var scrollRegionHeight = windowHeight - 110;
                if (warningMessageVisible) {
                    scrollRegionHeight -= 40;
                }
                scrollRegionHeight += 'px';

                var tableContainerHeight = windowHeight - 100;
                if (warningMessageVisible) {
                    tableContainerHeight -= 40;
                }
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

                $('#PMHomeLoadedTable').bootstrapTable('refresh');
            }),
            (this.paySingleItem = function ($row) {
                var me = this;

                if (!me.singlePayDialogVisible) {
                    me.singlePayDialogVisible = true;

                    var linkedTypeId =
                        args.data.sourceId == 0
                            ? C.ModelType.Tenancy
                            : C.ModelType.Contact;
                    var linkedId =
                        args.data.sourceId == 0
                            ? $row.attr('data-tenancyid')
                            : $row.attr('data-contactid');

                    var address = $row.attr('data-address');

                    new gmgps.cloud.ui.views.receiptsHandler({
                        linkedTypeId: linkedTypeId,
                        linkedId: linkedId,
                        title: 'Receipt : ' + address,
                        onComplete: function () {
                            me.updateArrearsRow(
                                $row.data('linkedtypeid'),
                                $row.data('linkedid')
                            ).done(function (r) {
                                if (r) {
                                    if (r.Data.length > 0) {
                                        // Remove row from selected items prior to table re-load
                                        var $newRow = $(r.Data);
                                        me.setupSnazzyCheckboxes(
                                            $newRow.find('.arrear-selected')
                                        );
                                        $row.replaceWith($newRow);
                                        me.updateTrackedPaymentItems(
                                            $newRow.attr('data-paymentid'),
                                            false
                                        );
                                        me.setUpInputMasks();
                                    } else {
                                        $row.remove();
                                    }
                                }

                                me.updateCounts();
                                me.singlePayDialogVisible = false;
                            });
                        },
                        onCancel: function () {
                            me.singlePayDialogVisible = false;
                        }
                    }).show();
                }
            }),
            (this.updateArrearsRow = function (linkedTypeId, linkedId) {
                return new gmgps.cloud.http(
                    "batchPayArrearsHandler-updateArrearsRow"
                ).ajax({
                    args: {
                        branchIds: me.params.branchIds,
                        userId: me.params.userId,
                        section: args.data.sectionId,
                        source: args.data.sourceId,
                        linkedTypeId: linkedTypeId,
                        linkedId: linkedId
                    },
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: '/PMHome/GetArrearsToPayRow'
                });
            }),
            (this.updateCounts = function () {
                var selectedLandlords = me.$root.find(
                    '.arrear-selected:checked'
                ).length;
                me.updateActionButton(selectedLandlords);

                var amount = 0.0;
                me.$root.find('.arrear-selected:checked').each(function () {
                    amount += parseFloat(
                        $(this)
                            .closest('.arrears-payment-row')
                            .attr('data-amount-allocated')
                    );
                });

                me.updatePayableItems(selectedLandlords, amount);
            }),
            (this.updateActionButton = function (counter) {
                if (counter > 0) {
                    me.$window
                        .find('.bottom .buttons .action-button')
                        .text('Batch Receipts')
                        .removeClass('grey')
                        .addClass('bgg-property');
                } else {
                    me.$window
                        .find('.bottom .buttons .action-button')
                        .text('Batch Receipts')
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
            (this.refreshData = function (failedItems) {
                var me = this;

                new gmgps.cloud.http("batchPayArrearsHandler-refreshData").ajax(
                    {
                        args: {
                            branchIds: me.params.branchIds,
                            userId: me.params.userId,
                            section: args.data.sectionId,
                            source: args.data.sourceId
                        },
                        complex: true,
                        dataType: 'html',
                        type: 'post',
                        url: '/PMHome/GetArrearsToPayDetail'
                    },
                    function (response) {
                        me.$root
                            .find('#batch-pay-arrears')
                            .find('arrears-list')
                            .html('')
                            .append(response);

                        me.$root.find('#PMHomeLoadedTable').bootstrapTable({
                            onPostBody: function () {
                                me.setupSnazzyCheckboxes();
                                me.updateCounts();
                                me.resizeTableScrollRegion();
                                $('.monies-held-adjustment').css(
                                    'display',
                                    'none'
                                );
                            }
                        });

                        me.setUpInputMasks();

                        if (failedItems) {
                            me.showWarningMessage();

                            $.each(failedItems, function (i, item) {
                                me.markAsFailed(item.Key, item.Value);
                            });
                        }
                    }
                );
            }),
            (this.action = function (onComplete, $btn) {
                $btn.lock();
                if (!$btn.hasClass('bgg-property')) {
                    $btn.unlock();
                    return false;
                }

                var receiptDateValue = me.$root
                    .find('#ArrearsDate')
                    .val();

                var receiptDate = moment(receiptDateValue, ['DD/MM/YY', 'DD/MM/YYYY']);
                var currentDate = moment().startOf('day');

                if (receiptDate > currentDate) {
                    showInfo('Please select a receipt date that is not in the future.');

                    $btn.unlock();
                    return false;
                }

                me.processSelectedArrears(function () {
                    $btn.unlock();
                });
            }),
            (this.setUpInputMasks = function () {
                var me = this;
                me.$root.find('.row-amount-input').inputmask('currency', {
                    radixPoint: '.',
                    groupSeparator: ',',
                    digits: 2,
                    autoGroup: true,
                    prefix: '£',
                    rightAlign: false,
                    allowMinus: false
                });
            }),
            (this.clearSearchBeforePosting = function () {
                var me = this;
                me.$root
                    .find('#PMHomeLoadedTable')
                    .bootstrapTable('resetSearch', '');
            }),
            (this.getPaymentInfomationIds = function () {
                var me = this;

                var QuickPostReceiptItems = [];

                me.$root.find('.arrear-selected:checked').each(function () {
                    var $row = $(this).closest('.arrears-payment-row');

                    var heldFunds = parseFloat($row.attr('data-held-funds'));
                    var heldUsed = parseFloat($row.attr('data-held-used'));
                    var heldPostBack = parseFloat(
                        $row.attr('data-held-funds-postback')
                    );
                    var d_heldAmount = new Decimal(heldFunds);

                    if (heldUsed > 0) {
                        d_heldAmount = d_heldAmount.sub(heldUsed);
                    }
                    if (heldPostBack > 0) {
                        // eslint-disable-next-line no-unused-vars
                        d_heldAmount = d_heldAmount.add(heldPostBack);
                    }

                    var receiptItem = {
                        AccountId: parseInt($row.attr('data-accountid')),
                        LinkedId:
                            args.data.sourceId == 0
                                ? parseInt($row.attr('data-tenancyid'))
                                : parseInt($row.attr('data-contactid')),
                        LinkedTypeId:
                            args.data.sourceId == 0
                                ? C.ModelType.Tenancy
                                : C.ModelType.Contact,
                        AmountReceived: $row
                            .find('input.row-amount-input')
                            .asNumber(),
                        //HeldAmount: parseFloat(d_heldAmount.valueOf()),
                        Transactions: []
                    };

                    var $transactions = $row
                        .find('.row-allocated-amount')
                        .find('.txn-item');

                    $transactions.each(function () {
                        var $item = $(this);

                        var makedForPayment =
                            $item.attr('data-marked-for-payment') == 'true'
                                ? true
                                : false;

                        if (makedForPayment) {
                            var txnVersion = parseInt(
                                $item.attr('data-version')
                            );
                            var allocatedAmount = parseFloat(
                                $item.attr('data-amount-allocated')
                            );
                            var receiptId = parseInt($item.attr('data-txnid'));

                            receiptItem.Transactions.push({
                                allocated: allocatedAmount,
                                id: receiptId,
                                versionNumber: txnVersion
                            });
                        }
                    });

                    QuickPostReceiptItems.push(receiptItem);
                });

                return QuickPostReceiptItems;
            }),
            (this.processSelectedArrears = function (callback) {
                var me = this;

                var QuickPostReceiptItems = me.getPaymentInfomationIds();

                var BankRef = me.$window.find('#BankReference').val();
                var ReceiptRef = me.$window.find('#ReceiptReference').val();
                var ReceiptDate = me.$window.find('#ArrearsDate').val();
                var SendReceipts = me.$window
                    .find('.sendreceipt.tickbox')
                    .hasClass('ticked');
                var ReceiptPaymentType = me.$window
                    .find('#PaymentMethod')
                    .val();

                var QuickPostReceiptsModel = {
                    Items: QuickPostReceiptItems,
                    BankReference: BankRef != null ? BankRef : '',
                    ReceiptReference: ReceiptRef != null ? ReceiptRef : '',
                    ReceiptDate: ReceiptDate,
                    ReceiptPaymentMethodType: parseInt(ReceiptPaymentType),
                    SendReceipts: SendReceipts
                };

                new gmgps.cloud.http(
                    "batchPayArrearsHandler-processSelectedArrears"
                )
                    .ajax({
                        args: {
                            model: QuickPostReceiptsModel
                        },
                        complex: true,
                        dataType: 'json',
                        type: 'post',
                        url: '/Accounting/QuickPostReceipts'
                    })
                    .done(function (r) {
                        if (r && r.Data) {
                            var failedItems;
                            var tdsTenanciesNotSubmitted;
                            if (r.Data) {
                                failedItems = r.Data.FailedItems;
                                tdsTenanciesNotSubmitted =
                                    r.Data.TDSTenanciesNotRegistered;
                                if (tdsTenanciesNotSubmitted.length > 0) {
                                    new gmgps.cloud.helpers.tds.ReceiptHandler().notifyMultiple();
                                }
                                if (failedItems.length > 0) {
                                    me.refreshData(failedItems);
                                    callback();
                                    return false;
                                } else {
                                    me.closeWindowHandler();
                                    args.data.onCancel();
                                    callback();
                                    return true;
                                }
                            }
                        }

                        callback();
                    });
            }),
            (this.currencyWithCommas = function (x) {
                return '£' + x.toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, '$1,');
            }),
            (this.focusOnFirstInput = function () {
                var $firstRowInput = me.$root.find('.row-amount-input').first();
                if ($firstRowInput) {
                    $firstRowInput.focus();
                    $firstRowInput.trigger('click');
                }
            }),
            (this.tableCellSortingComparer = function (
                index,
                isCurrency,
                isFromTextbox
            ) {
                return function (a, b) {
                    var valA = me.getCellSortingValue(a, index, isFromTextbox),
                        valB = me.getCellSortingValue(b, index, isFromTextbox);
                    if (isCurrency) {
                        // eslint-disable-next-line no-useless-escape
                        valA = valA === '' ? 0 : valA.replace(/[^\d.\-]+/g, '');
                        // eslint-disable-next-line no-useless-escape
                        valB = valB === '' ? 0 : valB.replace(/[^\d.\-]+/g, '');
                    }
                    return $.isNumeric(valA) && $.isNumeric(valB)
                        ? valA - valB
                        : valA.toString().localeCompare(valB);
                };
            }),
            (this.getCellSortingValue = function (row, index, isFromTextbox) {
                var $tableCell = $(row).children('td').eq(index);
                var definedSortVal = $tableCell.data('sortval');
                if (definedSortVal) {
                    return definedSortVal;
                }
                if (isFromTextbox) {
                    return $tableCell.find('input:first').val();
                }
                return $.trim($(row).children('td').eq(index).text());
            }),
            (this.sortTable = function (
                thIndex,
                isAscending,
                isCurrency,
                isSortValueFromTextbox
            ) {
                var $tableBody = $('#PMHomeLoadedTable > tbody');
                var rows = $tableBody.children('tr').toArray();

                rows = rows.sort(
                    me.tableCellSortingComparer(
                        thIndex,
                        isCurrency,
                        isSortValueFromTextbox
                    )
                );

                if (!isAscending) {
                    rows = rows.reverse();
                }

                for (var i = 0; i < rows.length; i++) {
                    $tableBody.append(rows[i]);
                }
            }),
            (this.setUpTableSortingEvents = function () {
                $('#PMHomeLoadedTable > thead > tr:first > th.isCustomSortable')
                    //relies on bootstrap table theming for inner th > dev.th-inner element with 'both', 'asc' or 'desc' class
                    .click(function (e) {
                        e.stopPropagation();
                        var $th = $(this);
                        var $thInner = $th.find('.th-inner');
                        var isAscending = !$thInner.hasClass('asc');
                        $th.closest('tr')
                            .find(' > th.isCustomSortable .th-inner')
                            .removeClass('asc')
                            .removeClass('desc');
                        me.sortTable(
                            $th.index(),
                            isAscending,
                            $th.hasClass('isCurrency'),
                            $th.hasClass('sortValueFromTextbox')
                        );
                        $thInner.addClass(isAscending ? 'asc' : 'desc');
                    })
                    .find('.th-inner')
                    .addClass('sortable both');
            });

        me.$window.find('.date-picker').each(function (i, v) {
            $(v).datepicker({
                numberOfMonths: 2,
                showButtonPanel: true,
                dateFormat: 'dd/mm/yy',
                minDate:
                    $(v).attr('data-datePickerMode') == 'future'
                        ? new Date()
                        : null,
                maxDate:
                    $(v).attr('id') === 'ArrearsDate'
                        ? 'today'
                        : null
            });
        });

        me.$root.on('click', 'tr .checkbox-item', function (e) {
            e.stopPropagation();
            return false;
        });

        me.$root.on('click', '.row-amount-input', function (e) {
            e.stopPropagation();
            return false;
        });

        me.$root.on('change', '.row-amount-input', function () {
            var $row = $(this).closest('.arrears-payment-row');

            var inputVal = $(this).val();

            inputVal = inputVal.replace('£', '');
            inputVal = inputVal.replace(',', '');
            inputVal = inputVal.replace(',', '');
            inputVal = inputVal.replace(',', '');

            var amountAllocated = parseFloat(inputVal);
            var heldUsed = parseFloat($row.attr('data-held-used'));

            if (amountAllocated < 0 || isNaN(amountAllocated)) {
                amountAllocated = 0.0;
                $(this).val(amountAllocated);
            }

            // update selected state if changed to 0
            var checked = $row.find('.arrear-selected').prop('checked');
            var checkedState = checked === true;

            if (amountAllocated == 0 && checkedState == true && heldUsed == 0) {
                ignoreNextCheckStateChange = true;
                $row.find('.arrear-selected').prop('checked', false);
            } else if (amountAllocated > 0 && checkedState == false) {
                ignoreNextCheckStateChange = true;
                $row.find('.arrear-selected').prop('checked', true);
            }

            $row.attr('data-amount-allocated', amountAllocated);
            me.allocateAmounts($row);
        });

        // On TAB or ENTER, jump to next input field, positioned ready for input
        me.$root.on('keydown', '.row-amount-input', function (e) {
            if (e.keyCode == 13 || e.keyCode == 9) {
                e.preventDefault();

                var $nextRow = $(this)
                    .closest('.arrears-payment-row')
                    .next('.arrears-payment-row');
                var $input = $nextRow.find('.row-amount-input');
                $input.focus();
                $input.trigger('click');
            }
        });

        me.$root.on('keyup', '#SearchTerm', function () {
            var inputVal = $(this).val().replace(/[\s',-]/g, '').toUpperCase();
            me.searchWithinRows(inputVal);
        });

        me.$root.on('click', '.detail-toggle', function (e) {
            e.stopPropagation();
            var $detailrow = $(this).closest('tr').next('tr');

            var thisRowExpanded = $detailrow.hasClass('show-detail');

            if (thisRowExpanded) {
                $detailrow.removeClass('show-detail');
            } else {
                me.$root.find('tr').removeClass('show-detail');
                $detailrow.addClass('show-detail');
            }
        });

        me.$window.on('click', '.cancel-payments-screen', function () {
            // Couldnt find how to call the hide / close / dispose method on Window.js
            me.$window.find('.bottom .buttons .cancel-button').trigger('click');
        });

        $(window).on('resize', function () {
            me.resizeTableScrollRegion(false);
        });

        me.$root.on('click', '.arrears-payment-row', function () {
            me.paySingleItem($(this));
        });

        me.$root.find('#PMHomeLoadedTable').bootstrapTable({
            onPostBody: function () {
                me.setupSnazzyCheckboxes();
                me.setUpInputMasks();
                $('.monies-held-adjustment').css('display', 'none');
                //bootstrap table sorting unsuitable due to changing values of cells and hidden nested elements within them
                me.setUpTableSortingEvents();
            }
        });

        // Delay table resize due to Window fade in effect
        setTimeout(function () {
            me.resizeTableScrollRegion();
        }, 100);

        me.updateCounts();

        me.setWindowTitle();

        me.setUpInputMasks();

        me.focusOnFirstInput();
    },

    show: function () {
        var me = this;

        var initialWidth = $(window).width() - 60;

        new gmgps.cloud.ui.controls.window({
            title: me.title,
            controller: me.controller,
            url: 'PMHome/GetArrearsSummary',
            urlArgs: {
                branchIds: me.branchIds,
                userId: me.userId,
                section: me.sectionId,
                source: me.sourceId
            },
            data: me,
            post: true,
            complex: true,
            width: initialWidth,
            draggable: true,
            modal: true,
            cancelButton: 'Close',
            actionButton: 'Batch Receipts',
            onCancel:
                me.onCancel ||
                function () {
                    return false;
                }
        });
    }
};
