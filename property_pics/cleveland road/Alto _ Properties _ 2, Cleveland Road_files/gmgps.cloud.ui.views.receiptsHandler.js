gmgps.cloud.ui.views.receiptsHandler = function (args) {
    var me = this;
    me.linkedId = args.linkedId;
    me.linkedTypeId = args.linkedTypeId;
    me.onComplete = args.onComplete;
    me.onCancel = args.onCancel;
    me.title = args.title;
    return me.init();
};
gmgps.cloud.ui.views.receiptsHandler.prototype = {
    init: function () {
        var me = this;
        return me;
    },

    controller: function (args) {
        var me = this;

        me.params = args.data;
        me.$root = args.$root;
        me.$window = args.$window;
        me.tds = new gmgps.cloud.helpers.tds.ReceiptHandler();

        me.inNegativeReceiptMode = false;
        me.warnedOnceAboutPendingTenancy = false;

        me.currencySymbol = me.$root.find('#CurrencySymbol').val();

        me.$window
            .find('.bottom .buttons .action-button')
            .removeClass('grey')
            .addClass('bgg-property disabled');

        me.$window
            .find('.bottom .buttons .action-button')
            .after(
                '<div class="preview-button html-preview btn fr">Preview</div>'
            );
        // add a print button
        me.$window
            .find('.bottom .buttons .preview-button')
            .before(
                '<div class="print-button bgg-property btn hidden" style="float:left">Print Receipt</div>'
            );

        me.$root.find('select').customSelect();

        me.$window.on('click', '.print-button', function () {
            me.previewReceiptDocument(me.$root.find('.receipt-summary'));
        });

        me.$window.on('click', '.preview-button:not(.disabled)', function () {
            if ($(this).hasClass('preview-on')) {
                //Turn off preview mode.
                $(this).removeClass('preview-on').text('Preview');
                me.$window
                    .find('.buttons .btn')
                    .not($(this))
                    .removeClass('disabled');

                me.$window.find('.buttons .btn.print-button').hide();

                me.$root
                    .find('#receipt-preview-layer')
                    .fadeOut(250, function () {
                        me.$root
                            .find('#receipt-preview-frame')
                            .contents()
                            .find('body')
                            .html('');
                    });
            } else {
                me.$window
                    .find('.buttons .btn:not(.hidden)')
                    .not($(this))
                    .addClass('disabled');
                //Turn on preview mode.
                $(this).addClass('preview-on').text('Exit Preview');
                me.$window.find('.buttons .btn.print-button').show();

                me.$root.find('#receipt-preview-layer').show();

                me.previewReceiptHtml(me.$root.find('.receipt-summary')).done(
                    function (r) {
                        var entityMap = {
                            '&': '&amp;',
                            '<': '&lt;',
                            '>': '&gt;',
                            '"': '&quot;',
                            "'": '&#39;',
                            '/': '&#x2F;'
                        };

                        var escapeHtml = function (string) {
                            // eslint-disable-next-line no-useless-escape
                            return String(string).replace(/[&<>"'\/]/g,
                                function (s) {
                                    return entityMap[s];
                                }
                            );
                        };

                        if (r && r.Data) {
                            gmgps.cloud.helpers.general.openPublisher({
                                $target: me.$root.find(
                                    '#receipt-preview-frame'
                                ),
                                settings: {
                                    brandId: r.Data.BrandId,
                                    branchId: r.Data.BranchId,
                                    createNew: false,
                                    isPreview: true,
                                    forPrint: true,
                                    forThumb: false,
                                    isDraft: false,
                                    testMode: true,
                                    designMode: C.PublisherDesignMode.Document,
                                    templateType:
                                        C.DocumentTemplateType
                                            .PublisherStationery,
                                    templateId: r.Data.TemplateId,
                                    printFormat: 0,
                                    sampleDocumentContent: escapeHtml(
                                        r.Data.Content
                                    )
                                }
                            });
                        }
                    }
                );
            }
        });

        me.$root.on('click', '.proprow', function () {
            $(this).find('.receipt-item-form').slideToggle('fast');
        });

        me.$root.on('click', '.proprow input', function (e) {
            e.stopImmediatePropagation();
        });

        me.$root.on('change', '.box-toggles .box-toggle', function () {
            var selectedRoleTypeIdList = $.map(
                me.$root.find('.box-toggles .box-toggle.on'),
                function (v) {
                    return $(v).data('roletypeid');
                }
            );

            me.$root.find('.txbody .proprow').each(function () {
                var $this = $(this);

                if (
                    selectedRoleTypeIdList.indexOf($this.data('roletypeid')) !==
                    -1
                ) {
                    $this.show();
                } else {
                    $this.hide();
                }
            });

            me.resetAllocations();
            me.populateContactAccounts();
        });

        me.$root.on('change', '#BankAccountId', function () {
            //ALTOPM-968
            me.updateHeldFundsValue();
            //ALTOPM-908
            me.lockReceiptsWithNoMatchingBankAccount($(this).val());
            me.$root.find('#AmountReceived').val(0.0);
            me.autoAllocateAmountReceived();
        });

        me.$root.on(
            'keyup',
            '#AmountReceived',
            $.debounce(50, false, function () {
                me.autoAllocateAmountReceived();
            })
        );
        me.$root.on('change', '#UseHeld', function () {
            me.autoAllocateAmountReceived();
        });

        me.$root.on('change', '.allocate .tickbox-hidden', function (e) {
            var $row = $(this).closest('.proprow');

            me.checkIfAllocatingCredits($row);

            if (me.inNegativeReceiptMode) {
                me.negativeReceiptsTickedHandler($(this));
            } else {
                me.receiptsTickedHandler(e, $(this));
            }
        });

        me.$root.on(
            'keyup',
            '.debit-amount',
            $.debounce(50, false, function (e) {
                if (e.which === 109) {
                    return;
                }

                var $row = $(this).closest('.proprow');

                if ($row.hasClass('warn-once')) {
                    me.warnAboutPendingTenancy();
                }

                me.checkIfAllocatingCredits($row, true);

                if (me.inNegativeReceiptMode) {
                    me.negativeReceiptAmountChangedHandler($(this));
                } else {
                    me.receiptAmountChangedHandler($(this));
                }
            })
        );

        me.$root.on('change', '#SendReceipts', function () {
            var $this = $(this);

            $this.val($this.prop('checked'));

            if ($this.prop('checked')) {
                me.$window
                    .find('.buttons .preview-button')
                    .removeClass('disabled');
            } else {
                me.$window
                    .find('.buttons .preview-button')
                    .addClass('disabled');
            }
        });

        (this.negativeReceiptAmountChangedHandler = function (el) {
            var amountInput = el.asNumber();

            var $row = el.closest('.proprow');

            var $checkbox = $row.find('.tickbox-hidden');

            var isDebitValue = parseFloat($row.data('debit')) > 0;
            var isCreditValue = parseFloat($row.data('credit')) > 0;

            var outstandingValue = $row.find('.outstandingGross').asNumber();

            if (isDebitValue) {
                if (amountInput > outstandingValue) {
                    amountInput = outstandingValue;
                }
            } else if (isCreditValue) {
                if (amountInput < outstandingValue) {
                    amountInput = outstandingValue;
                }
            }

            if (isCreditValue && amountInput === 0) {
                $checkbox.prop('checked', false).trigger('prog-change');
                me.checkIfAllocatingCredits($row);
            } else if (isCreditValue && amountInput !== 0) {
                $checkbox.prop('checked', true).trigger('prog-change');
                me.resetNegativeAllocatedDebits();
            } else {
                var totalAvailableToAllocate = me.$root
                    .find('.tx-container .txbody .proprow:visible')
                    .filter(function () {
                        return parseFloat($(this).data('credit')) > 0;
                    })
                    .filter(function () {
                        return $(this).find('.debit-amount:visible').length > 0;
                    })
                    .find('.debit-amount')
                    .asNumber();

                var totalAllocated = 0;

                me.$root
                    .find('.tx-container .txbody .proprow:visible')
                    .not($row)
                    .filter(function () {
                        return parseFloat($(this).data('debit')) > 0;
                    })
                    .filter(function () {
                        return (
                            $(this).find('.tickbox.ticked:visible').length > 0
                        );
                    })
                    .each(function () {
                        totalAllocated += $(this)
                            .find('.debit-amount')
                            .asNumber();
                    });

                var remainingToAllocate =
                    Math.abs(totalAvailableToAllocate) - totalAllocated;

                if (amountInput !== 0 && amountInput > remainingToAllocate) {
                    amountInput = remainingToAllocate;
                }

                if (amountInput === 0) {
                    if ($checkbox.prop('checked')) {
                        $checkbox.prop('checked', false).trigger('prog-change');
                    }
                } else if (amountInput !== 0) {
                    if (!$checkbox.prop('checked')) {
                        $checkbox.prop('checked', true).trigger('prog-change');
                    }
                }
            }

            el.val(amountInput);

            me.calculateTotals();
            me.setNegativeAllocatedColors();

            me.setUntickedItemsState();
        }),
            (this.receiptAmountChangedHandler = function (el) {
                var debitDifference = el.asNumber() - el.attr('max');
                var useHeld = me.useHeld();
                var checkbox = el.closest('.proprow').find('.tickbox-hidden');

                function deallocate() {
                    if (checkbox.prop('checked')) {
                        checkbox.prop('checked', false).trigger('prog-change');
                    }
                    el.val(0);
                }
                function allocate() {
                    if (!checkbox.prop('checked')) {
                        checkbox.prop('checked', true).trigger('prog-change');
                    }
                }

                if (debitDifference > 0 && el.asNumber() > 0) {
                    showInfo(
                        'You can not receive more than the outstanding amount.'
                    );
                    deallocate();
                } else {
                    if (el.asNumber() === 0) {
                        deallocate();
                    } else {
                        allocate();
                    }

                    var receivedTotal = 0;
                    var amountReceived = me.$root
                        .find('#AmountReceived')
                        .asNumber();

                    if (useHeld) {
                        amountReceived += me.$root
                            .find('#MoniesHeld')
                            .asNumber();
                    }

                    me.$root
                        .find('.proprow .tickbox-hidden:checked')
                        .each(function (i, v) {
                            receivedTotal += $(v)
                                .closest('.proprow')
                                .find('.debit-amount')
                                .asNumber();
                        });

                    if (receivedTotal > amountReceived) {
                        showInfo(
                            'You cannot allocate more than the Amount Received.'
                        );
                        deallocate();
                    }
                }

                me.calculateTotals();
                me.setAllocatedColors();
            }),
            (this.useHeld = function () {
                return me.$root.find('#UseHeld').prop('checked');
            }),
            (this.setSendReceiptsInputState = function (enable) {
                var $sendReceiptsTickBox = me.$root.find('#SendReceipts');

                if (enable) {
                    $sendReceiptsTickBox.prop('disabled', false);
                } else {
                    $sendReceiptsTickBox
                        .prop('checked', false)
                        .trigger('change');
                    $sendReceiptsTickBox.prop('disabled', true);
                }
            });

        (this.setUseHeldInputState = function (enable) {
            var $useHeld = me.$root.find('#UseHeld');

            if (enable) {
                // only enable if we've got some to use and something to allocate it to

                if (
                    me.$root.find('.moniesheld').asNumber() > 0 &&
                    me.$root.find('.tx-container .txbody .proprow').length > 0
                ) {
                    $useHeld
                        .prop('checked', false)
                        .prop('disabled', false)
                        .trigger('prog-change');
                    me.autoAllocateAmountReceived();
                }
            } else {
                $useHeld
                    .prop('checked', false)
                    .prop('disabled', true)
                    .trigger('prog-change');
                me.autoAllocateAmountReceived();
            }
        }),
            (this.receiptsTickedHandler = function (e, checkbox) {
                var row = checkbox.closest('.proprow');

                var held = me.$root.find('.totalNonAllocated').asNumber();
                var totalAllocated = me.$root
                    .find('.totalAllocated')
                    .asNumber();
                var amountReceivedEl = me.$root.find('#AmountReceived');
                var amountReceived = amountReceivedEl.asNumber();

                var outstandingItemValue = row
                    .find('.outstandingGross')
                    .asNumber();
                var received = row.find('#Received');
                var itemAmount =
                    held > outstandingItemValue ? outstandingItemValue : held;

                if (checkbox.prop('checked')) {
                    if (itemAmount === 0) {
                        checkbox.prop('checked', false).trigger('prog-change');
                        showInfo(
                            'Please add some ' +
                                (totalAllocated >= amountReceived &&
                                amountReceived > 0
                                    ? 'more'
                                    : '') +
                                ' funds before allocating.'
                        );
                        e.stopPropagation();
                        return false;
                    } else {
                        if (row.hasClass('warn-once')) {
                            me.warnAboutPendingTenancy();
                        }

                        if (received.asNumber() === 0) {
                            received.val(itemAmount);
                        } else {
                            if (received.asNumber() > received.prop('max')) {
                                received.val(itemAmount);
                            } else {
                                if (received.asNumber() > itemAmount) {
                                    received.val(itemAmount);
                                }
                            }
                        }
                    }
                } else {
                    received.val(0);
                }

                me.calculateTotals();
                me.setAllocatedColors();
            }),
            (this.resetNegativeAllocatedDebits = function () {
                me.$root
                    .find('.tx-container .txbody .proprow:visible')
                    .filter(function () {
                        return (
                            parseFloat($(this).data('debit')) > 0 &&
                            $(this).find('.debit-amount').is(':visible')
                        );
                    })
                    .each(function () {
                        var $this = $(this);
                        $this.find('.debit-amount').val(0);
                        $this
                            .find('.tickbox-hidden')
                            .prop('checked', false)
                            .trigger('prog-change');
                    });
            });

        this.negativeReceiptsTickedHandler = function ($checkbox) {
            var $row = $checkbox.closest('.proprow');

            var received = $row.find('#Received');

            var totalAllocated = me.$root.find('.totalAllocated').asNumber();

            var debitValue = $row.find('.outstandingGross').asNumber();

            if (!$checkbox.prop('checked')) {
                debitValue = 0;
            } else {
                debitValue =
                    debitValue >= Math.abs(totalAllocated)
                        ? Math.abs(totalAllocated)
                        : debitValue;
            }

            var chargeTotal = 0;

            me.$root
                .find('.proprow .tickbox.ticked:visible')
                .each(function (i, v) {
                    chargeTotal += $(v)
                        .closest('.proprow')
                        .find('.debit-amount')
                        .asNumber();
                });

            if (chargeTotal === 0 && debitValue > 0) {
                $checkbox.prop('checked', false).trigger('prog-change');
                return false;
            }

            received.val(debitValue);

            if ($checkbox.prop('checked') && debitValue < 0) {
                me.allocateNegativeCharge(debitValue);
            }

            me.calculateTotals();
            me.setNegativeAllocatedColors();

            me.setUntickedItemsState();

            return true;
        };

        (this.setUntickedItemsState = function () {
            var totalAllocated = me.$root.find('.totalAllocated').asNumber();

            var $tickedItems = me.$root.find(
                '.proprow .tickbox-hidden:checked:visible'
            );

            var $unTickedItems = me.$root.find(
                '.proprow .tickbox-hidden:not(:checked):visible'
            );

            if (totalAllocated === 0 && $tickedItems.length > 1) {
                $unTickedItems.each(function () {
                    $(this).prop('disabled', true);
                });
            } else {
                $unTickedItems.each(function () {
                    $(this).prop('disabled', false);
                });
            }
        }),
            (this.allocateNegativeCharge = function (availableToAllocate) {
                me.$root
                    .find('.tx-container .txbody .proprow:visible')
                    .filter(function () {
                        return (
                            $(this).find('.debit-amount').is(':visible') &&
                            parseFloat($(this).data('debit')) > 0
                        );
                    })
                    .each(function (i, v) {
                        var $v = $(v);

                        availableToAllocate = Math.abs(availableToAllocate);

                        var toAllocate = $v
                            .find('.outstandingGross')
                            .asNumber();

                        if (toAllocate > availableToAllocate)
                            toAllocate = availableToAllocate;

                        availableToAllocate -= toAllocate;

                        $v.find('.debit-amount').val(toAllocate);
                        $v.find('.tickbox-hidden')
                            .prop('checked', true)
                            .trigger('prog-change');

                        if (availableToAllocate === 0) return false;
                    });
            }),
            (this.setReceivingInputsState = function (enabled) {
                if (enabled) {
                    me.$root
                        .find('#AmountReceived')
                        .val(0)
                        .prop('disabled', false);
                } else {
                    me.$root
                        .find('#AmountReceived')
                        .val(0)
                        .prop('disabled', true);
                }

                me.setUseHeldInputState(enabled);
            }),
            (this.setAllocatingCreditsState = function ($row, allocating) {
                if (allocating) {
                    me.setReceivingInputsState(false);

                    //go through each line and find charges that meet the matching criteria to allocate a negative charge
                    //to a charge with the same charge item and role type
                    //to an expense charge for the same charge item AND the same supplier.
                    //allocate a negative charge/expense charge to an expense charge for the same role type

                    me.$root
                        .find('.proprow:visible')
                        .not($row)
                        .each(function () {
                            var $this = $(this);

                            $this
                                .find('.tickbox .tickbox-hidden')
                                .prop('checked', false)
                                .trigger('prog-change');
                            $this
                                .find('.tickbox .tickbox-hidden')
                                .prop('disabled', true);
                            $this.find('.tickbox').hide();
                            $this
                                .find('.debit-amount')
                                .val(0)
                                .prop('disabled', true);
                            $this.find('.debit-amount').hide();

                            var unlockItem = false;

                            var chargeTypeMatches =
                                $row.attr('data-chargetype') ===
                                $this.attr('data-chargetype');
                            var roleTypeIdMatches =
                                $row.attr('data-roletypeid') ===
                                $this.attr('data-roletypeid');
                            var vatRateMatches =
                                $row.attr('data-vatrateid') ===
                                $this.attr('data-vatrateid');

                            var isExpense =
                                parseInt($this.attr('data-nominaltypeid')) ===
                                C.AccountsNominalType.Expenses;

                            var nominalTypeIdMatches =
                                $row.attr('data-nominaltypeid') ===
                                    $this.attr('data-nominaltypeid') &&
                                $row.attr('data-chargetype') ===
                                    $this.attr('data-chargetype') &&
                                $row.attr('data-supplierContactId') ===
                                    $this.attr('data-supplierContactId') &&
                                $row.attr('data-vatrateid') ===
                                    $this.attr('data-vatrateid');

                            var notCreditItem = !(
                                parseFloat($this.data('credit')) > 0
                            );

                            if (isExpense) {
                                if (nominalTypeIdMatches && notCreditItem) {
                                    unlockItem = true;
                                }
                            } else {
                                if (
                                    chargeTypeMatches &&
                                    roleTypeIdMatches &&
                                    vatRateMatches &&
                                    notCreditItem
                                ) {
                                    unlockItem = true;
                                }
                            }

                            if (unlockItem) {
                                $this.find('.tickbox').show();
                                $this.find('.debit-amount').show();
                                $this
                                    .find('.tickbox .tickbox-hidden')
                                    .prop('disabled', false);
                                $this
                                    .find('.debit-amount')
                                    .prop('disabled', false);
                            }
                        });
                } else {
                    me.setReceivingInputsState(true);

                    me.$root.find('.proprow:visible').each(function () {
                        var $this = $(this);
                        $this.find('.tickbox').show();
                        $this.find('.debit-amount').show();
                        $this
                            .find('.debit-amount')
                            .val(0)
                            .prop('disabled', false);
                        $this
                            .find('.tickbox .tickbox-hidden')
                            .prop('checked', false)
                            .prop('disabled', false)
                            .trigger('prog-change');
                    });

                    me.$root
                        .find('.totalAllocated')
                        .text('{0}{1}'.format(me.currencySymbol, '0.00'));
                }

                me.setNegativeAllocatedColors();
            }),
            (this.action = function (onComplete, $btn) {
                $btn.lock();

                setTimeout(function () {
                    me.calculateTotals();
                    var expectsCharges =
                        me.$root.find('#ExpectOutstandingCharges').val() ===
                        'True';

                    //Init validation engine.
                    me.$root
                        .addClass('opt-validate')
                        .validationEngine({ scroll: false });

                    var valid = me.$root.validationEngine('validate');

                    if (valid) {
                        var receiptDateValue = me.$root
                            .find('#ReceiptDate')
                            .val();

                        var receiptDate = moment(receiptDateValue, ['DD/MM/YY', 'DD/MM/YYYY']);
                        var currentDate = moment().startOf('day');

                        if (receiptDate > currentDate) {
                            showInfo('Please select a receipt date that is not in the future.');

                            return false;
                        }

                        var bankAccountId = me.$root
                            .find('#BankAccountId')
                            .asNumber();

                        if (bankAccountId === -1) {
                            showInfo(
                                'You must set up a bank account before you can receive any monies'
                            );
                            return false;
                        }

                        if (me.inNegativeReceiptMode === true) {
                            if (
                                me.$root.find('.totalAllocated').asNumber() !==
                                0
                            ) {
                                showInfo(
                                    'Total allocated must be zero when allocating credits.'
                                );
                                $btn.unlock();
                                return false;
                            }
                        }
                        var after = function () {
                            me.postReceipts(
                                me.$root.find('.receipt-summary')
                            ).done(function (r) {
                                $btn.unlock();
                                if (r && r.Data) {
                                    if (r.Data.Success) {
                                        if (
                                            r.Data.TDSTenanciesNotRegistered
                                                .length === 1
                                        ) {
                                            me.tds.notifyReceiptProcessed({
                                                tenancyId:
                                                    r.Data
                                                        .TDSTenanciesNotRegistered[0]
                                            });
                                        } else if (
                                            r.Data.TDSTenanciesNotRegistered
                                                .length > 1
                                        ) {
                                            me.tds.notifyMultiple();
                                        }
                                    }
                                    gmgps.cloud.helpers.general.generateAccountingDocuments(
                                        r.DocumentRequestIdList
                                    );
                                    onComplete(false);
                                } else {
                                    return false;
                                }

                                if (expectsCharges) {
                                    $.jGrowl(
                                        'Outstanding credits have been allocated to outstanding charges',
                                        {
                                            header: 'Outstanding Charges',
                                            theme: 'growl-contact'
                                        }
                                    );
                                }
                                return true;
                            });
                        };

                        var nonAllocated = me.$root.find('#TotalNonAllocated');

                        if (nonAllocated.asNumber() > 0) {
                            var dialog = function (extraHtml) {
                                var template = [
                                    '<div>You have ' +
                                        formatCurrency(
                                            nonAllocated.asNumber()
                                        ) +
                                        ' not allocated to charges</div>',
                                    '<div class="fields"><div class="row"><div class="col-1" style="width: 215px"><label for="JSFundsDescription" class="fl mr10">Please enter a description for these funds</label></div><div class="col-2"><input type="text" name="JSFundsDescription" id="JSFundsDescription" maxlength="50" style="width: 150px" value="Held Monies" /></div></div></div>'
                                ];
                                if (extraHtml) {
                                    template.push(extraHtml);
                                }
                                template.push(
                                    '<div>Do you wish to continue?</div>'
                                );

                                showDialog({
                                    type: 'question',
                                    title: 'Monies Held',
                                    dialogClass: 'monies-held-dialog',
                                    msg: template.join(''),
                                    buttons: {
                                        Yes: function () {
                                            var $el = $(this);
                                            var description = $el.find(
                                                '#JSFundsDescription'
                                            );
                                            var whereTo = $el.find(
                                                '[name="JSWhereTo"]:checked'
                                            );
                                            var paymentgroup =
                                                $el.find('#JSPaymentGroup');
                                            me.$root
                                                .find('#HeldItemDescription')
                                                .val(description.val());
                                            if (
                                                whereTo.length > 0 &&
                                                whereTo.asNumber() === 2
                                            ) {
                                                me.$root
                                                    .find('#HeldPaymentGroupId')
                                                    .val(paymentgroup.val());
                                            } else {
                                                me.$root
                                                    .find('#HeldPaymentGroupId')
                                                    .val(0);
                                            }

                                            after();
                                            $el.dialog('close');
                                        },
                                        No: function () {
                                            $(this).dialog('close');
                                            $btn.unlock();
                                            return false;
                                        }
                                    },
                                    create: create
                                });

                                function create(event) {
                                    var el = $(event.target);
                                    var toggles = el.find('.toggle');
                                    var whereTo = el.find('[name="JSWhereTo"]');
                                    var paymentGroup = el
                                        .find('#JSPaymentGroup')
                                        .customSelect();
                                    if (!me.useHeld()) {
                                        paymentGroup
                                            .siblings('.customStyleSelectBox')
                                            .addClass('disabled');
                                    }

                                    toggles.on(
                                        'change',
                                        function (e, toggleValue) {
                                            var $target = $(e.target);
                                            var $radio =
                                                $target.siblings(':radio');

                                            if (toggleValue.on) {
                                                $radio.prop('checked', true);
                                                toggles
                                                    .not(this)
                                                    .removeClass('on');
                                            } else {
                                                if ($radio.is(':checked')) {
                                                    //you can't untick a ticked radio, so keep this toggle on.
                                                    $target.addClass('on');
                                                }
                                            }
                                            if ($radio.val() !== '2') {
                                                paymentGroup
                                                    .attr(
                                                        'disabled',
                                                        'disabled'
                                                    )
                                                    .siblings(
                                                        '.customStyleSelectBox'
                                                    )
                                                    .addClass('disabled');
                                            } else {
                                                paymentGroup
                                                    .removeAttr('disabled')
                                                    .siblings(
                                                        '.customStyleSelectBox'
                                                    )
                                                    .removeClass('disabled');
                                            }
                                        }
                                    );

                                    whereTo.on('change', function (e) {
                                        var toggle = $(e.target).siblings(
                                            '.toggle'
                                        );
                                        toggle.trigger('click');
                                    });
                                }
                                function formatCurrency(value) {
                                    return $.inputmask.format(
                                        value.toFixed(2),
                                        {
                                            alias: 'currency',
                                            prefix: me.currencySymbol
                                        }
                                    );
                                }
                            };

                            if (
                                me.params.linkedTypeId ===
                                    C.ModelType.Contact &&
                                me.$root.find(
                                    '[data-roletypeid={0}]'.format(
                                        C.EventPartyRoleType.Landlord
                                    )
                                ).length > 0
                            ) {
                                new gmgps.cloud.http(
                                    "receiptsHandler-action"
                                ).ajax(
                                    {
                                        args: { contactId: me.params.linkedId },
                                        complex: false,
                                        dataType: 'json',
                                        type: 'post',
                                        async: false,
                                        url: '/Contact/GetContactPaymentGroupsList',
                                        timeout: 6000
                                    },
                                    function (response) {
                                        if (
                                            response.Status ===
                                            C.ResponseStatusType.Success
                                        ) {
                                            var options = [],
                                                i,
                                                option;
                                            var extra = '';
                                            for (
                                                i = 0;
                                                i < response.Data.length;
                                                i++
                                            ) {
                                                option = response.Data[i];
                                                options.push(
                                                    '<option value="' +
                                                        option.Key +
                                                        '">' +
                                                        option.Value +
                                                        '</option>'
                                                );
                                            }
                                            if (options.length > 0) {
                                                extra =
                                                    '<div class="fields"><div class="row"><div class="col-1" style="width:215px; text-align: left;position:relative">' +
                                                    '<input type="radio" name="JSWhereTo" class="radio-hidden" id="r1" value="1" checked />' +
                                                    '<div class="toggle fl on"></div>' +
                                                    '<span class="radio-label-one ml15 fl"><label for="r1" style="line-height: 1em;padding:0 !important">Receive as Held Funds</label></span></div></div></div>' +
                                                    '<div class="fields"><div class="row"><div class="col-1" style="width:215px; text-align:left; position:relative">' +
                                                    '<input type="radio" name="JSWhereTo" class="radio-hidden" id="r2" value="2" />' +
                                                    '<div class="toggle fl"></div>' +
                                                    '<span class="radio-label-one ml15 fl"><label for="r2" style="line-height:1em; padding: 0 !important">Receive into payment group</label></span></div>' +
                                                    '<div class="col-2"><select id="JSPaymentGroup" name="paymentGroup" style="width: 150px;" disabled >' +
                                                    (options.length > 1
                                                        ? '<option value="0">Select...</option>'
                                                        : '') +
                                                    options.join('') +
                                                    '</select></div></div></div>';
                                            }
                                            dialog(extra);
                                        }
                                    }
                                );
                            } else {
                                dialog();
                            }
                        } else {
                            after();
                        }
                    } else {
                        $btn.unlock();
                    }
                }, 50);
                return false;
            });

        this.updateHeldFundsValue = function () {
            var groupBankAccountId = parseInt(
                me.$root.find('#BankAccountId').val()
            );

            if (groupBankAccountId > 0) {
                me.getHeldFundsForAccount(groupBankAccountId).done(function (
                    r
                ) {
                    if (r && r.Data) {
                        me.$root.find('#MoniesHeld').val(r.Data.result);
                        me.$root
                            .find('.moniesheld')
                            .text(r.Data.formattedResult);

                        if (r.Data.result > 0) {
                            me.setUseHeldInputState(true);
                        } else {
                            me.setUseHeldInputState(false);
                        }
                    }
                });
            }
        };

        this.postReceipts = function ($root) {
            var $form = this.createPostbackForm($root);

            return new gmgps.cloud.http("receiptsHandler-postReceipts").ajax({
                args: $form.serializeObject(),
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/Accounting/PostReceipts'
            });
        };

        this.populateContactAccounts = function () {
            var $accountsList = me.$root.find('#BankAccounts');

            var $selectedFilters = me.$root.find('.box-toggle.on');

            var optionList = {};

            $.each($selectedFilters, function (i1, v1) {
                var $roleAccounts = $(v1).find('ul li');

                $.each($roleAccounts, function (i2, v2) {
                    var $li = $(v2);
                    // this de-dupes any accounts added more than once, depending on selected contact roles
                    optionList[parseInt($li.data('accountid'))] = {
                        accountid: parseInt($li.data('accountid')),
                        accountname: $li.data('accountname'),
                        isdefault: $li.data('isdefault')
                    };
                });
            });

            // clear select
            $accountsList.html('');

            if (Object.keys(optionList).length === 0) {
                $accountsList.append(
                    '<option value="-1">No accounts available</option>'
                );
            } else {
                $.each(Object.keys(optionList), function (i, v) {
                    $accountsList.append(
                        '<option value="{0}">{1}{2}</option>'.format(
                            optionList[v].accountid,
                            optionList[v].accountname,
                            optionList[v].isdefault === true ? ' [D]' : ''
                        )
                    );
                });
            }

            $accountsList.customSelect();
        };

        this.resetAllocations = function () {
            me.$root.find('.proprow').each(function () {
                $(this).find('.debit-amount').val(0);
                $(this)
                    .find('.tickbox .tickbox-hidden')
                    .prop('checked', false)
                    .trigger('prog-change');
            });
            me.setAllocatingCreditsState(null, false);

            me.calculateTotals();
            me.setAllocatedColors();
            me.setUntickedItemsState();
        };

        this.setAllocatedColors = function () {
            me.$root.find('.proprow:visible').each(function (i, v) {
                var $row = $(v);

                if ($row.find('.debit-amount').is(':visible')) {
                    $row.find('.debit-amount')
                        .removeClass('partial')
                        .removeClass('full');
                    $row.find('.tickbox').removeClass('amber');

                    var ticked = $row
                        .find('.tickbox .tickbox-hidden')
                        .prop('checked');

                    if (ticked) {
                        var val =
                            $row.find('.outstandingGross').asNumber() -
                            $row.find('.debit-amount').asNumber();

                        if (val === 0) {
                            $row.find('.debit-amount').addClass('full');
                        } else if (val > 0) {
                            $row.find('.debit-amount').addClass('partial');
                            $row.find('.tickbox').addClass('amber');
                        }
                    }
                }
            });
        };

        this.setNegativeAllocatedColors = function () {
            me.$root.find('.proprow:visible').each(function (i, v) {
                var $row = $(v);

                if ($row.find('.debit-amount').is(':visible')) {
                    $row.find('.debit-amount')
                        .removeClass('partial')
                        .removeClass('full');
                    $row.find('.tickbox').removeClass('amber');

                    var ticked = $row
                        .find('.tickbox .tickbox-hidden')
                        .prop('checked');

                    if (ticked) {
                        var isDebit = parseFloat($row.data('debit')) > 0;
                        var isCredit = parseFloat($row.data('credit')) > 0;

                        var val =
                            $row.find('.outstandingGross').asNumber() -
                            $row.find('.debit-amount').asNumber();

                        if (val === 0) {
                            $row.find('.debit-amount').addClass('full');
                        }

                        if (isDebit) {
                            if (val > 0) {
                                $row.find('.debit-amount').addClass('partial');
                                $row.find('.tickbox').addClass('amber');
                            }
                        } else if (isCredit) {
                            if (val < 0) {
                                $row.find('.debit-amount').addClass('partial');
                                $row.find('.tickbox').addClass('amber');
                            }
                        }
                    }
                }
            });
        };

        this.calculateTotals = function () {
            var $amountReceived = me.$root.find('#AmountReceived');

            var totalOutstanding = 0;
            me.$root.find('.proprow').each(function () {
                var outstandingGross = $(this)
                    .closest('.proprow')
                    .find('.outstandingGross')
                    .asNumber({ roundToDecimalPlace: 2 });
                totalOutstanding += outstandingGross;
            });

            //Sum of auto allocations or manual allocations
            var amountAvailable = $amountReceived.asNumber({
                roundToDecimalPlace: 2
            });
            var heldamount = me.$root.find('#MoniesHeld').asNumber();
            var useHeldChecked = me.useHeld();

            if (heldamount > 0 && useHeldChecked) {
                amountAvailable += heldamount;
            }

            var totalAllocated = 0;

            var $tickedCheckBoxes = me.$root.find(
                '.proprow:visible .tickbox-hidden:checked:visible'
            );

            $tickedCheckBoxes.each(function () {
                var outstandingGross = $(this)
                    .closest('.proprow')
                    .find('.outstandingGross')
                    .asNumber({ roundToDecimalPlace: 2 });

                if (outstandingGross !== 0) {
                    totalAllocated += $(this)
                        .closest('.proprow')
                        .find('.debit-amount')
                        .asNumber({ roundToDecimalPlace: 2 });
                }
            });

            //Sum of amount Received less Total Allocated
            var totalNonAllocated = $amountReceived.prop('disabled')
                ? 0
                : amountAvailable - totalAllocated;
            var totalNonAllocatedToSave = 0;
            if (useHeldChecked) {
                totalNonAllocatedToSave = totalNonAllocated - heldamount; //we don't want to re-add held monies when saving
            } else {
                totalNonAllocatedToSave = totalNonAllocated;
            }

            me.$root
                .find('td.totalAllocated')
                .html(me.currencySymbol + totalAllocated.toFixed(2));
            me.$root
                .find('td.totalNonAllocated')
                .html(me.currencySymbol + totalNonAllocated.toFixed(2));
            me.$root
                .find('td.totalOutstanding')
                .html(
                    me.$root.find('#CurrencySymbol').val() +
                        totalOutstanding.toFixed(2)
                );

            me.$root.find('#TotalAllocated').val(totalAllocated.toFixed(2));
            me.$root
                .find('#TotalNonAllocated')
                .val(totalNonAllocatedToSave.toFixed(2));
            me.$root.find('#TotalOutstanding').val(totalOutstanding.toFixed(2));

            var disablePostReceipts = me.inNegativeReceiptMode
                ? $tickedCheckBoxes.length !== 0 && totalAllocated !== 0
                : totalAllocated === 0 && totalNonAllocated === 0;

            var disableSendReceipts =
                disablePostReceipts ||
                (totalAllocated > 0 && $amountReceived.asNumber() === 0) ||
                me.inNegativeReceiptMode;

            if (disablePostReceipts) {
                me.$window.find('.bottom .buttons .action-button').lock();
            } else {
                me.$window.find('.bottom .buttons .action-button').unlock();
            }

            me.setSendReceiptsInputState(!disableSendReceipts);
        };

        this.lockReceiptsWithNoMatchingBankAccount = function (bankAccountId) {
            me.$root.find('.proprow').each(function (i, v) {
                if (
                    parseInt($(v).attr('data-nominalTypeId')) !==
                    C.AccountsNominalType.LandlordIncome
                ) {
                    return true;
                }
                var bankAccountList = $(v)
                    .find('#BankAccountIdList')
                    .val()
                    .split(',');
                bankAccountList.some(function (entry) {
                    if (parseInt(entry) !== parseInt(bankAccountId)) {
                        $(v).addClass('disabled').addClass('no-bank-account');
                        $(v).find('#Received').prop('disabled', true).val(0);
                        $(v)
                            .find('.tickbox .tickbox-hidden')
                            .prop('checked', false)
                            .prop('disabled', true)
                            .trigger('prog-change');
                    } else {
                        $(v).removeClass('disabled');
                        $(v).find('#Received').prop('disabled', false);
                        $(v)
                            .find('.tickbox .tickbox-hidden')
                            .prop('disabled', false);
                        return true;
                    }
                }, this);
            });
        };

        this.autoAllocateAmountReceived = function () {
            var outstandingFund = me.$root.find('#AmountReceived').asNumber();
            var useHeldChecked = me.useHeld();
            var heldamount = me.$root.find('#MoniesHeld').asNumber();

            if (heldamount > 0 && useHeldChecked) {
                outstandingFund += heldamount;
            }

            me.setNegativeCreditsVisibility(outstandingFund !== 0);

            //allocate all monies based on pay oldest charge first
            // but not landlord income types when the tenancy is pending
            me.$root
                .find('.proprow:visible')
                .not('.warn-once')
                .each(function (i, v) {
                    var $v = $(v);
                    if (!$v.hasClass('disabled')) {
                        var outstandingGross = $(this)
                            .find('.outstandingGross')
                            .asNumber();
                        if (outstandingGross < 0) {
                            return true;
                        }
                        if (outstandingGross <= outstandingFund) {
                            outstandingFund -= outstandingGross;
                            $v.find('.tickbox .tickbox-hidden')
                                .prop('checked', true)
                                .trigger('prog-change');
                            $v.find('.debit-amount').val(
                                outstandingGross.toFixed(2)
                            );
                        } else {
                            if (outstandingFund > 0) {
                                //we have allocated all we can
                                $v.find('.debit-amount').val(
                                    me.currencySymbol +
                                        outstandingFund.toFixed(2)
                                );
                                $v.find('.tickbox .tickbox-hidden')
                                    .prop('checked', true)
                                    .trigger('prog-change');
                                outstandingFund = 0;
                            } else {
                                $v.find('.debit-amount').val(0);
                                $v.find('.tickbox .tickbox-hidden')
                                    .prop('checked', false)
                                    .trigger('prog-change');
                            }
                        }
                    }
                });

            me.calculateTotals();

            me.setAllocatedColors();
        };

        this.getHeldFundsForAccount = function (groupBankAccountId) {
            var $useHeld = me.$root.find('#UseHeld');
            $useHeld.prop('checked', false).trigger('prog-change');
            me.autoAllocateAmountReceived();
            return new gmgps.cloud.http(
                "receiptsHandler-getHeldFundsForAccount"
            ).ajax({
                args: {
                    linkedTypeId: me.params.linkedTypeId,
                    linkedId: me.params.linkedId,
                    groupBankAccountId: groupBankAccountId
                },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/Accounting/GetHeldFundsForBankAccount'
            });
        };

        (this.setNegativeCreditsVisibility = function (hide) {
            me.$root
                .find('.tx-container .txbody .proprow:visible')
                .filter(function () {
                    return parseFloat($(this).data('credit')) > 0;
                })
                .each(function (i, v) {
                    var $v = $(v);
                    if (hide) {
                        $v.find('#Received').val(0).hide();
                        $v.find('.tickbox-hidden')
                            .prop('checked', false)
                            .trigger('prog-change');
                        $v.find('.tickbox.allocate').hide();
                    } else {
                        $v.find('#Received').show();
                        $v.find('.tickbox.allocate').show();
                    }
                });
        }),
            (this.checkIfAllocatingCredits = function ($row, includeRow) {
                var amountReceived = me.$root
                    .find('#AmountReceived')
                    .asNumber();

                var notUsingHeld = me.useHeld() === false;

                var negativeReceiptRowsTicked = me.$root
                    .find('.tx-container .txbody .proprow:visible')
                    .filter(function () {
                        if (includeRow) {
                            return (
                                parseFloat($(this).data('credit')) > 0 &&
                                ($(this)
                                    .find('.tickbox-hidden')
                                    .prop('checked') === true ||
                                    $row.find('.debit-amount').asNumber() < 0)
                            );
                        }
                        return (
                            parseFloat($(this).data('credit')) > 0 &&
                            $(this).find('.tickbox-hidden').prop('checked') ===
                                true
                        );
                    });

                var newState =
                    amountReceived === 0 &&
                    notUsingHeld === true &&
                    negativeReceiptRowsTicked.length > 0;

                if (me.inNegativeReceiptMode === true && newState === false) {
                    me.setAllocatingCreditsState($row, false);
                } else if (
                    me.inNegativeReceiptMode === false &&
                    newState === true
                ) {
                    me.setAllocatingCreditsState($row, true);
                }

                me.inNegativeReceiptMode = newState;
            });

        (this.createPostbackForm = function ($root, url) {
            var $form = createForm($root.clone(), url);

            $form
                .find('.proprow .tickbox.ticked')
                .closest('.proprow')
                .each(function (i) {
                    $(this)
                        .find('input[name*="Receipts["]')
                        .each(function () {
                            var currentName = $(this).attr('name');
                            if (currentName == null) return true;
                            var newName = currentName.replace(
                                'Receipts[]',
                                'Receipts[' + i + ']'
                            );
                            if (currentName.indexOf('Receipts[') < 0) {
                                newName = 'Receipts[' + i + '].' + currentName;
                            }
                            $(this).attr('name', newName);
                        });
                });

            return $form;
        }),
            (this.previewReceiptHtml = function ($root) {
                var $form = this.createPostbackForm($root);

                return new gmgps.cloud.http(
                    "receiptsHandler-previewReceiptHtml"
                ).ajax({
                    args: $form.serializeObject(),
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: '/Accounting/PreviewReceiptHtml'
                });
            });

        this.previewReceiptDocument = function ($root) {
            var $form = this.createPostbackForm(
                $root,
                '/Accounting/PreviewReceiptDocument'
            );

            var ua = window.navigator.userAgent;

            var isIE = ua.indexOf('MSIE ') > -1 || ua.indexOf('Trident/') > -1;

            if (!isIE) {
                $form.attr('target', '_blank');
            }

            $form.appendTo('body').submit().remove();
        };

        me.$root.find('.date-picker').each(function (i, v) {
            $(v).datepicker({
                numberOfMonths: 2,
                showButtonPanel: true,
                dateFormat: 'dd/mm/yy',
                minDate:
                    $(v).attr('data-datePickerMode') === 'future'
                        ? new Date()
                        : null,
                maxDate:
                    $(v).attr('id') === 'ReceiptDate'
                        ? 'today'
                        : null
            });
        });

        me.$root
            .find('.opt-inputmask-numeric.amount-input')
            .inputmask('currency', {
                radixPoint: '.',
                groupSeparator: ',',
                digits: 2,
                autoGroup: true,
                prefix: me.currencySymbol,
                rightAlign: false,
                allowMinus: false
            });

        me.$root
            .find('.opt-inputmask-numeric.amount-input-neg')
            .inputmask('currency', {
                radixPoint: '.',
                groupSeparator: ',',
                digits: 2,
                autoGroup: true,
                prefix: me.currencySymbol,
                rightAlign: false,
                allowMinus: true,
                max: 0
            });

        switch (me.params.linkedTypeId) {
            // Tenancy accounts are set on server and dont change according to any filters, so only do contacts here
            case C.ModelType.Contact:
                me.populateContactAccounts();
                break;
        }

        me.lockReceiptsWithNoMatchingBankAccount(
            me.$root.find('#BankAccountId').val()
        );

        me.calculateTotals();

        me.updateHeldFundsValue();

        me.$root.find('#AmountReceived').focus();
        me.$root.find('#AmountReceived')[0].setSelectionRange(2, 2);

        me.$root.find('.proprow .warn').qtip({
            content: {
                text: 'This charge is for a Proposed tenancy. Allocations to this item<br/> can be paid to the Landlord before the Tenancy is finalised.'
            },
            position: {
                viewport: $(window),
                my: 'bottom center',
                at: 'top center'
            },
            show: {
                event: 'mouseenter',
                delay: 0,
                effect: function () {
                    $(this).fadeIn(50);
                },
                solo: true
            },
            hide: 'mouseleave',
            style: {
                tip: true,
                classes: 'qtip-dark'
            }
        });

        this.warnAboutPendingTenancy = function () {
            if (!me.warnedOnceAboutPendingTenancy) {
                showDialog({
                    type: 'info',
                    title: 'WARNING',
                    msg: 'This charge is for a proposed tenancy. You should only continue if you are happy for this receipt to be paid to the Landlord. <br/><br/>(Remove the tick for items displaying this warning if you would prefer to add the receipt as monies held)',
                    buttons: {
                        OK: function () {
                            $(this).dialog('close');
                        }
                    }
                });
            }
            me.warnedOnceAboutPendingTenancy = true;
        };

        me.preventDoubleSubmit = true;
    },

    show: function () {
        var me = this;

        new gmgps.cloud.ui.controls.window({
            title: me.title,
            windowId: 'ReceiptsModal',
            controller: me.controller,
            url: 'Accounting/GetReceiptSummary',
            urlArgs: {
                linkedId: me.linkedId,
                linkedTypeId: me.linkedTypeId
            },
            data: me,
            post: true,
            complex: true,
            width: 1015,
            draggable: true,
            modal: true,
            cancelButton: 'Cancel',
            actionButton: 'Update',
            onAction:
                me.onComplete ||
                function () {
                    return false;
                },
            onCancel:
                me.onCancel ||
                function () {
                    return false;
                },
            postActionCallback: function (r) {
                me.onComplete(r);
            }
        });
    }
};
