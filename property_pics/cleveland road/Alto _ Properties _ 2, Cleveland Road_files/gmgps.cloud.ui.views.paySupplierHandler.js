gmgps.cloud.ui.views.paySupplierHandler = function (args) {
    var me = this;

    me.id = args.id;

    me.onComplete = args.onComplete;
    me.onCancel = args.onCancel;
    me.title = args.title;

    return me.init();
};

gmgps.cloud.ui.views.paySupplierHandler.prototype = {
    init: function () {
        var me = this;

        return me;
    },

    controller: function (args) {
        var me = this;

        me.params = args.data;

        me.$root = args.$root;

        me.$window = args.$window;

        me.$actionButton = me.$window
            .find('.bottom .buttons .action-button')
            .removeClass('grey')
            .addClass('bgg-property')
            .addClass('disabled');
        me.$previewButton = $(
            '<div class="preview-button html-preview btn fr">Preview</div>'
        );
        me.$printButton = $(
            '<div class="print-button bgg-property btn hidden" style="float:left">Print Document</div>'
        );
        me.$actionButton.after(me.$printButton, me.$previewButton);

        me.$root.find('select').customSelect();

        me.$window.on('click', '.print-button', function () {
            me.previewPaymentDocument(me.$root.find('.payment-supplier'));
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
                    .find('#supplier-preview-layer')
                    .fadeOut(250, function () {
                        me.$root
                            .find('#supplier-preview-frame')
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

                me.$root.find('#supplier-preview-layer').show();

                me.previewPaymentHtml(me.$root.find('.payment-supplier')).done(
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
                                    '#supplier-preview-frame'
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

        me.$root.find('.date-picker').each(function (i, v) {
            $(v).datepicker({
                numberOfMonths: 2,
                showButtonPanel: true,
                dateFormat: 'dd/mm/yy',
                minDate:
                    $(v).attr('data-datePickerMode') === 'future'
                        ? new Date()
                        : null
            });
        });

        me.$root.find('.tabs').tabs({
            activate: function (event, ui) {
                if (ui.newPanel.attr('id') === 'options-tab') {
                    me.$actionButton.hide();
                } else {
                    me.$actionButton.show();
                }
            }
        });

        me.$root.on('change', '#Selected', function () {
            var $this = $(this);
            if ($this.hasClass('negative-amount')) {
                $this.prop('checked', true);
                return;
            }
            var $row = $(this).closest('.item-row');

            if ($row.data('splitpayment')) {
                var $rows = $row
                    .closest('.item-rows')
                    .find('.txdetail .item-rows .item-row');

                if (!$this.prop('checked')) {
                    $row.find('#Payment_Allocated').val(0);
                    me.setSplitPaymentsRowState($rows, false);
                } else {
                    me.calculateAutoAllocatedSplitRows($rows);
                    me.setSplitPaymentsRowState($rows, true);
                    $row.find('#Payment_Allocated').val(
                        me.totalSplitChargeAllocated($rows)
                    );
                }
            } else {
                if (!$this.prop('checked')) {
                    $row.find('#Payment_Allocated').val(0);
                } else {
                    me.calculateAutoAllocated($row);
                }
            }

            me.resetGroupPaymentState();

            me.setRowState($row);

            me.recalculateTotalPayable(
                parseFloat(
                    me.$root
                        .find('#BalanceCarriedForward')
                        .data('balancecarriedforward')
                )
            );
        });

        me.$root.on('focus', '.ui-autocomplete-input', function () {
            $(this).autocomplete('search', '');
        });

        me.$root.on('change', '.refreshable', function () {
            var accountId = me.$root.find('#GroupBankAccountId').val();
            var statementDate = me.$root.find('#StatementDate').val();

            me.refreshPayList(accountId, statementDate);
        });

        me.$root.on('change', '#Payment_Allocated', function () {
            setTimeout(
                (function ($this) {
                    return function () {
                        var $row = $this.closest('.item-row');

                        if ($row.data('splitpayment') !== 1) {
                            me.calculateAllocated($row);
                            var $checkbox = $row.find('#Selected');
                            var checked = $checkbox.prop('checked');
                            var changeCheck = $this.asNumber() !== 0;
                            if (checked !== changeCheck) {
                                $checkbox
                                    .prop('checked', changeCheck)
                                    .trigger('prog-change');
                            }

                            var transactionvatpercentage = parseFloat(
                                $row.data('transactionvatpercentage')
                            );
                            var nominalCodeId = $row.data('nominalcodeid');
                            me.resetGroupPaymentState();

                            me.setRowState($row);

                            me.getUpdatedCommissionValue(
                                $this.asNumber(),
                                transactionvatpercentage,
                                nominalCodeId
                            ).done(function (r) {
                                var symbol = me.$root
                                    .find('#CurrencySymbol')
                                    .val();

                                if (r && r.Data) {
                                    $row.find('#CommissionNet').val(
                                        r.Data.commissionNet
                                    );
                                    $row.find('#CommissionVat').val(
                                        r.Data.commissionVat
                                    );
                                    $row.find('#CommissionGross').val(
                                        r.Data.commissionGross
                                    );

                                    var $popup = me.$root.find(
                                        '.commission-popup div[data-linkedid="{0}"] table[data-contactid="{1}"]'.format(
                                            $row.data('linkedid'),
                                            $row.data('contactid')
                                        )
                                    );

                                    if ($popup.length === 1) {
                                        $popup.find('.commission-net').text(
                                            $.inputmask.format(
                                                r.Data.commissionNet,
                                                {
                                                    alias: 'currency',
                                                    prefix: symbol
                                                }
                                            )
                                        );
                                        $popup.find('.commission-vat').text(
                                            $.inputmask.format(
                                                r.Data.commissionVat,
                                                {
                                                    alias: 'currency',
                                                    prefix: symbol
                                                }
                                            )
                                        );
                                        $popup.find('.commission-gross').text(
                                            $.inputmask.format(
                                                r.Data.commissionGross,
                                                {
                                                    alias: 'currency',
                                                    prefix: symbol
                                                }
                                            )
                                        );
                                    }

                                    me.recalculateTotalPayable(
                                        parseFloat(
                                            me.$root
                                                .find('#BalanceCarriedForward')
                                                .data('balancecarriedforward')
                                        )
                                    );
                                }
                            });
                        }
                    };
                })($(this)),
                200
            );
        });

        me.$root.on('change', '#SplitPayment_Allocated', function () {
            var $this = $(this);
            var $row = $this.closest('.item-row');

            var $container = $row.closest('.txdetail').closest('.item-rows');
            var transactionvatpercentage = parseFloat(
                $container.find('.item-row').data('transactionvatpercentage')
            );
            var nominalCodeId = $container.find('.txrow').data('nominalcodeid');

            me.calculateSplitAllocated($row);

            var total = me.totalSplitChargeAllocated(
                $row.closest('.item-rows').find('.item-row')
            );

            $container
                .find('#Selected')
                .prop('checked', total === 0 ? false : true)
                .trigger('prog-change');

            $container.find('#Payment_Allocated').val(total).trigger('change');

            me.setRowState($row);

            me.getUpdatedCommissionValue(
                $this.asNumber(),
                transactionvatpercentage,
                nominalCodeId
            ).done(function (r) {
                var symbol = me.$root.find('#CurrencySymbol').val();

                if (r && r.Data) {
                    $row.find('#CommissionNet').val(r.Data.commissionNet);
                    $row.find('#CommissionVat').val(r.Data.commissionVat);
                    $row.find('#CommissionGross').val(r.Data.commissionGross);

                    var $popup = me.$root.find(
                        '.commission-popup div[data-linkedid="{0}"] table[data-contactid="{1}"]'.format(
                            $row.data('linkedid'),
                            $row.data('contactid')
                        )
                    );

                    if ($popup.length === 1) {
                        $popup.find('.commission-net').text(
                            $.inputmask.format(r.Data.commissionNet, {
                                alias: 'currency',
                                prefix: symbol
                            })
                        );
                        $popup.find('.commission-vat').text(
                            $.inputmask.format(r.Data.commissionVat, {
                                alias: 'currency',
                                prefix: symbol
                            })
                        );
                        $popup.find('.commission-gross').text(
                            $.inputmask.format(r.Data.commissionGross, {
                                alias: 'currency',
                                prefix: symbol
                            })
                        );
                    }

                    me.recalculateTotalPayable(
                        parseFloat(
                            me.$root
                                .find('#BalanceCarriedForward')
                                .data('balancecarriedforward')
                        )
                    );
                }
            });
        });

        me.$root.on('change', '#PaymentMethodType', function () {
            if ($(this).find(':selected').data('isbacs') === 1) {
                me.$root.find('#BankReference').val('Bacs');
                me.$root.find('#BankReference').attr('readonly', 'readonly');
            } else {
                me.$root.find('#BankReference').val('');
                me.$root.find('#BankReference').removeAttr('readonly');
            }
        });

        me.$root.on('click', '.txrow .detcol', function (e) {
            if ($(e.target).hasClass('detcol')) {
                $(this).closest('.item-row').next().slideToggle('fast');
            }
        });

        me.$root.on('focus', '.txrow :input[readonly]', function () {
            var $this = $(this);
            var $row = $(this).closest('.item-row').next('.txdetail');

            var onAnimated = function () {
                $row.find('.item-row:first-child')
                    .find('.allocated-item')
                    .focus();
                $this.blur();
            };

            if ($row.is(':hidden')) {
                $row.slideToggle('fast', onAnimated);
            } else {
                setTimeout(function () {
                    onAnimated();
                }, 0);
            }
        });

        me.$root.on('blur', '#BalanceCarriedForward', function () {
            me.recalculateTotalPayable($(this).asNumber());
        });

        this.action = function (onComplete, $btn) {
            $btn.addClass('disabled');
            me.makePayments(me.$root.find('.payment-supplier')).done(function (
                r
            ) {
                if (r && r.Data) {
                    gmgps.cloud.helpers.general.generateAccountingDocuments(
                        r.DocumentRequestIdList
                    );
                    onComplete(false);
                    gmgps.cloud.helpers.general.promptForLetters({
                        eventHeaders: r.UpdatedEvents
                    });
                    return true;
                } else {
                    $btn.removeClass('disabled');
                    return false;
                }
            });

            return false;
        };

        (this.makePayments = function ($root) {
            var $form = this.createPostbackForm($root);

            return new gmgps.cloud.http("paySupplierHandler-makePayments").ajax(
                {
                    args: $form.serializeObject(),
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: '/Accounting/PaySupplier'
                }
            );
        }),
            (this.getUpdatedCommissionValue = function (
                allocatedValue,
                transactionVatPercentage,
                nominalCodeId
            ) {
                var commissionList = $.map(
                    me.$root.find('.commission-items .commission-item'),
                    function (item) {
                        var $item = $(item);

                        return {
                            Percentage: $item.data('percentage'),
                            DeductOnGross: $item.data('deductongross'),
                            NominalCodeToChargeOn: $item.data(
                                'nominalcodetochargeon'
                            ),
                            VATPercent: $item.data('vatpercent')
                        };
                    }
                );

                return new gmgps.cloud.http(
                    "paySupplierHandler-getUpdatedCommissionValue"
                ).ajax({
                    args: {
                        allocatedValue: allocatedValue,
                        transactionVatPercentage: transactionVatPercentage,
                        nominalCodeId: nominalCodeId,
                        commissionToPost: commissionList
                    },
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: '/Accounting/ReCalculateSupplierCommissionValue'
                });
            }),
            (this.refreshPayList = function (accountId, paymentDate) {
                me.getPaySupplierList(accountId, paymentDate).done(function (
                    r
                ) {
                    if (r && r.Data) {
                        me.$root
                            .find('.payment-content .body')
                            .empty()
                            .html(r.Data);
                        me.initCurrencyInputs();
                        me.setupTips();
                        me.resetGroupPaymentState();
                        me.recalculateTotalPayable(
                            parseFloat(
                                me.$root
                                    .find('#BalanceCarriedForward')
                                    .data('balancecarriedforward')
                            )
                        );
                    }
                });
            }),
            (this.getPaySupplierList = function (accountId, paymentDate) {
                return new gmgps.cloud.http(
                    "paySupplierHandler-getPaySupplierList"
                ).ajax({
                    args: {
                        contactId: me.params.id,
                        accountId: accountId,
                        paymentDate: paymentDate
                    },
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: '/Accounting/GetPaySupplierTransactions'
                });
            }),
            (this.getRemittanceRemarkList = function () {
                return new gmgps.cloud.http(
                    "paySupplierHandler-getRemittanceRemarkList"
                ).ajax({
                    args: {},
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: '/Accounting/GetRemittanceRemarkList'
                });
            }),
            (this.setupTips = function () {
                me.$root.find('.item-rows  .commission-info').each(function () {
                    var $this = $(this);

                    $this.qtip({
                        show: 'click',
                        hide: 'unfocus',
                        position: {
                            viewport: $(window),
                            my: 'top center',
                            at: 'bottom center',
                            effect: function () {
                                $(this).fadeIn('fast');
                            }
                        },
                        content: {
                            text: $('<div style="width:300px;"></div>').append(
                                me.$root.find(
                                    '.commission-popup div[data-linkedid="{0}"] table[data-contactid="{1}"]'.format(
                                        parseInt($this.data('linkedid')),
                                        parseInt($this.data('contactid'))
                                    )
                                )
                            )
                        },
                        style: {
                            classes: 'qtip-bootstrap',
                            tip: {
                                corner: true,
                                height: 14,
                                width: 24
                            }
                        }
                    });
                });

                me.$root.find('.payment-not-due').each(function () {
                    var $this = $(this);

                    var paymentDaysUntilDue = $this
                        .closest('.item-row')
                        .data('payment-days-until-due');

                    var message =
                        paymentDaysUntilDue === 1
                            ? 'This expense is due for payment tomorrow'
                            : 'This expense is due for payment in ' +
                              paymentDaysUntilDue +
                              ' days';

                    $this.qtip({
                        show: 'click',
                        hide: 'unfocus',
                        position: {
                            viewport: $(window),
                            my: 'top right',
                            at: 'bottom center',
                            effect: function () {
                                $(this).fadeIn('fast');
                            }
                        },
                        content: {
                            text: message
                        },
                        style: {
                            classes: 'qtip-dark',
                            tip: {
                                corner: true,
                                height: 10,
                                width: 10
                            }
                        }
                    });
                });
            }),
            (this.initCurrencyInputs = function () {
                me.$root
                    .find('.opt-inputmask-numeric.amount-input.pos')
                    .inputmask('currency', {
                        radixPoint: '.',
                        groupSeparator: ',',
                        digits: 2,
                        autoGroup: true,
                        prefix: me.$root.find('#CurrencySymbol').val(),
                        rightAlign: true,
                        allowMinus: false,
                        min: 0
                    });

                me.$root
                    .find('.opt-inputmask-numeric.amount-input.neg')
                    .inputmask('currency', {
                        radixPoint: '.',
                        groupSeparator: ',',
                        digits: 2,
                        autoGroup: true,
                        prefix: me.$root.find('#CurrencySymbol').val(),
                        rightAlign: true,
                        allowMinus: true
                    });
            });

        this.totalAvailableToAutoAllocate = function (groupId, $row) {
            var allocated = new Decimal(0);
            var available = new Decimal(0);

            if (groupId !== 0) {
                me.$root
                    .find(
                        '.txbody .item-rows .txrow[data-paymentgroupid="' +
                            groupId +
                            '"], .txbody .item-rows .txdetail .txparties .partyrow[data-paymentgroupid="' +
                            groupId +
                            '"]'
                    )
                    .each(function (i, v) {
                        var $v = $(v);
                        available = available.add(
                            parseFloat($v.data('availabletoallocate'))
                        );
                    });

                me.$root
                    .find(
                        '.txbody .item-rows .txrow[data-paymentgroupid="' +
                            groupId +
                            '"], .txbody .item-rows .txdetail .txparties .partyrow[data-paymentgroupid="' +
                            groupId +
                            '"]'
                    )
                    .not($row)
                    .each(function (i, v) {
                        var $v = $(v);
                        allocated = allocated.add(
                            $v.find('.allocated-item').asNumber()
                        );
                    });
            } else {
                available = new Decimal(
                    parseFloat($row.data('availabletoallocate'))
                );
            }

            return available.sub(allocated);
        };

        this.totalAvailableToAllocate = function (groupId, $row) {
            var allocated = new Decimal(0);
            var available = new Decimal(0);

            if (groupId !== 0) {
                me.$root
                    .find(
                        '.txbody .item-rows .txrow[data-paymentgroupid="' +
                            groupId +
                            '"], .txbody .item-rows .txdetail .txparties .partyrow[data-paymentgroupid="' +
                            groupId +
                            '"]'
                    )
                    .each(function (i, v) {
                        var gTotal = parseFloat($(v).data('grouptotal'));
                        if (gTotal > 0) {
                            available = new Decimal(gTotal);
                        }
                    });

                me.$root
                    .find(
                        '.txbody .item-rows .txrow[data-paymentgroupid="' +
                            groupId +
                            '"], .txbody .item-rows .txdetail .txparties .partyrow[data-paymentgroupid="' +
                            groupId +
                            '"]'
                    )
                    .not($row)
                    .each(function (i, v) {
                        var $v = $(v);
                        allocated = allocated.add(
                            $v.find('.allocated-item').asNumber()
                        );
                    });
            } else {
                available = new Decimal(parseFloat($row.data('grouptotal')));
            }

            return available.sub(allocated);
        };

        this.totalSplitChargeAllocated = function ($rows) {
            var allocated = new Decimal(0);

            $rows.each(function (i, v) {
                allocated = allocated.add(
                    $(v).find('#SplitPayment_Allocated').asNumber()
                );
            });

            return allocated;
        };

        this.recalculateTotalPayable = function (balanceCarriedForward) {
            Decimal.config({
                rounding: 4
            });

            balanceCarriedForward = new Decimal(balanceCarriedForward);

            var retainAll = parseInt(
                me.$root.find('#BalanceCarriedForward').data('retainall')
            );
            var currencySymbol = me.$root.find('#CurrencySymbol').val();
            var totalPayable = new Decimal(0);
            var totalCommission = new Decimal(0);

            var rowtotal = 0;

            var $rows = me.$root.find('.txrow');

            $rows.each(function (i, v) {
                var $v = $(v); //.txrow
                var checked = $v.find('#Selected:checked').prop('checked');
                var $paymentAllocated;
                if ($v.data('splitpayment') === 1) {
                    $v.siblings('.txdetail')
                        .find('.partyrow')
                        .each(function (i, p) {
                            var $p = $(p); //.partyrow
                            var $splitPayment = $p.find(
                                '#SplitPayment_Allocated'
                            );
                            rowtotal = $splitPayment.asNumber();

                            if (
                                (checked && rowtotal > 0) ||
                                $splitPayment.data('maxvalue') < 0
                            ) {
                                totalPayable = totalPayable.add(rowtotal);
                                totalCommission = totalCommission.add(
                                    $p.find('#CommissionGross').asNumber()
                                );
                            }
                        });
                } else {
                    $paymentAllocated = $v.find('#Payment_Allocated');
                    rowtotal = $paymentAllocated.asNumber();

                    if (
                        (checked && rowtotal > 0) ||
                        $paymentAllocated.data('maxvalue') < 0
                    ) {
                        totalPayable = totalPayable.add(rowtotal);
                        totalCommission = totalCommission.add(
                            $v.find('#CommissionGross').asNumber()
                        );
                    }
                }
            });

            var bfwd = new Decimal(
                parseFloat(me.$root.find('#BalanceBroughtForward').val())
            );
            var netPayable = new Decimal(
                totalPayable.add(bfwd).sub(totalCommission)
            );

            if (netPayable <= 0) {
                me.$root
                    .find('#BalanceCarriedForward')
                    .val(0)
                    .attr('disabled', 'disabled');
            }
            if (netPayable > 0) {
                if (retainAll) {
                    balanceCarriedForward = netPayable;
                    netPayable = new Decimal(0);
                    me.$root
                        .find('#BalanceCarriedForward')
                        .val(balanceCarriedForward.toFixed(2))
                        .attr('disabled', 'disabled');
                } else {
                    if (netPayable.sub(balanceCarriedForward) < 0) {
                        balanceCarriedForward = netPayable;
                    } else {
                        if (balanceCarriedForward.sub(netPayable) > 0) {
                            balanceCarriedForward =
                                balanceCarriedForward.sub(netPayable);
                        }
                    }
                    netPayable = netPayable.sub(balanceCarriedForward);

                    me.$root
                        .find('#BalanceCarriedForward')
                        .val(balanceCarriedForward.toFixed(2))
                        .removeAttr('disabled');
                }
            }

            me.$root.find('.gross-payable').text(
                '{0}'.format(
                    $.inputmask.format(totalPayable.toFixed(2), {
                        alias: 'currency',
                        prefix: currencySymbol
                    })
                )
            );
            me.$root.find('.net-payable').text(
                '{0}'.format(
                    $.inputmask.format(netPayable.toFixed(2), {
                        alias: 'currency',
                        prefix: currencySymbol
                    })
                )
            );
            me.$root.find('.total-commission').text(
                '{0}'.format(
                    $.inputmask.format(totalCommission * -1, {
                        alias: 'currency',
                        prefix: currencySymbol
                    })
                )
            );

            var enable =
                netPayable.gte(0) &&
                (!bfwd.eq(0) ||
                    !totalPayable.eq(0) ||
                    !totalCommission.eq(0) ||
                    !balanceCarriedForward.eq(0));
            if (
                !enable &&
                netPayable.eq(0) &&
                me.$root.find('.negative-amount:checked').length > 0
            ) {
                enable = true; // things are checked that are negative so they allow payable to be zero, and require update to be enabled.
            }

            me.enableButtons(enable);
        };

        (this.enableButtons = function (enable) {
            var action = enable ? 'removeClass' : 'addClass';
            me.$actionButton[action]('disabled');
            me.$previewButton[action]('disabled');
        }),
            (this.resetGroupPaymentState = function () {
                var available = new Decimal(0);
                var groupId = new Decimal(0);

                me.$root.find('.txrow #Selected').each(function (i, v) {
                    var $v = $(v);

                    var $row = $v.closest('.txrow');

                    if (!$v.prop('checked')) {
                        if ($v.data('splitpayment')) {
                            $v.closest('.txrows')
                                .find('.txdetail .txparties .partyrow')
                                .each(function (idx, val) {
                                    var $check = $v
                                        .closest('.item-rows')
                                        .find('#Selected');

                                    groupId = parseInt(
                                        $row.data('paymentgroupid')
                                    );
                                    available = new Decimal(
                                        me.totalAvailableToAutoAllocate(
                                            groupId,
                                            $(val)
                                        )
                                    );

                                    if (!$check.prop('checked')) {
                                        if (available === 0) {
                                            $check.prop('disabled', 'disabled');
                                            $check
                                                .closest('.txrow')
                                                .find('#Payment_Allocated')
                                                .removeClass('amber green')
                                                .val(0);
                                        } else {
                                            $check.removeProp('disabled');
                                        }
                                    }
                                });
                        } else {
                            groupId = parseInt($row.data('paymentgroupid'));
                            available = new Decimal(
                                me.totalAvailableToAutoAllocate(groupId, $row)
                            );

                            if (available === 0) {
                                $(v).prop('disabled', 'disabled');
                                $(v)
                                    .closest('.txrow')
                                    .find('#Payment_Allocated')
                                    .removeClass('amber green')
                                    .val(0);
                            } else {
                                $v.removeProp('disabled');
                            }
                        }
                    } else {
                        $v.removeProp('disabled');
                    }
                });
            });

        this.calculateSplitAllocated = function ($row) {
            var $input = $row.find('.allocated-item');

            var value = $input.asNumber();

            var totaldue = parseFloat($input.data('maxvalue'));

            var groupId = $row.data('paymentgroupid');
            var available = me.totalAvailableToAllocate(groupId, $row);

            if (available < value) {
                value = available;
            }

            if (value > totaldue) {
                value = totaldue;
            }

            $input.val(value);
        };

        this.calculateAllocated = function ($row) {
            var groupId = parseInt($row.data('paymentgroupid'));

            var $input = $row.find('.allocated-item');

            var value = $input.asNumber();

            var totaldue = parseFloat($input.data('maxvalue'));

            if (value > totaldue) {
                value = totaldue;
            }

            var available = me.totalAvailableToAllocate(groupId, $row);

            if (available < value) {
                value = available;
            }

            $input.val(value);
        };

        this.calculateAutoAllocatedSplitRows = function ($rows) {
            $rows.each(function (i, v) {
                var $row = $(v);
                var $input = $row.find('#SplitPayment_Allocated');

                var totaldue = parseFloat($input.data('maxvalue'));

                var value = $input.asNumber();

                var groupId = parseInt($row.data('paymentgroupid'));

                var available = me.totalAvailableToAutoAllocate(groupId, $row);

                if (available > value || value === 0) {
                    value = available;
                }

                if (value > totaldue && value !== 0) {
                    value = totaldue;
                }

                $input.val(value).trigger('change');
            });
        };

        this.calculateAutoAllocated = function ($row) {
            var groupId = parseInt($row.data('paymentgroupid'));

            var $input = $row.find('.allocated-item');

            var value = $input.asNumber();

            var totaldue = parseFloat($input.data('maxvalue'));

            var available = me.totalAvailableToAutoAllocate(groupId, $row);

            if (available < value || value === 0) {
                value = available;
            }

            if (value > totaldue && value !== 0) {
                value = totaldue;
            }

            $row.find('#Payment_Allocated').val(value).trigger('change');
        };

        this.setRowState = function ($row) {
            var $input = $row.find('.allocated-item');

            var $tickbox = $row.find('.tickbox');

            var $comminfo = $row.find('.commission-info');

            var val = $input.asNumber();
            var due = parseFloat($input.data('maxvalue'));

            if (val === 0) {
                $input.removeClass('amber green');
                $tickbox.removeClass('amber');
            } else if (val === due) {
                $input.removeClass('amber').addClass('green');
                $tickbox.removeClass('amber');
            } else if (val < due) {
                $input.removeClass('green').addClass('amber');
                $tickbox.addClass('amber');
            }

            val === 0 ? $comminfo.hide() : $comminfo.show();
        };

        this.setSplitPaymentsRowState = function ($rows, set) {
            if (!set) {
                $rows.find('#SplitPayment_Allocated').val(0);
            }

            $rows.each(function (i, v) {
                me.setRowState($(v));
            });
        };

        (this.createPostbackForm = function ($input, url) {
            var $root = $input.clone();

            var paymentVersionList = [];

            var commissionNet = 0;
            var commissionVat = 0;

            var commissionId = $root
                .find('.commission-item')
                .first('#commissionid')
                .data('commissionid');

            $.map($root.find('.txrow'), function (v) {
                var $v = $(v);
                var included = $v.find('#Selected').prop('checked');

                if ($v.data('splitpayment') === 1) {
                    var $items = $v
                        .closest('.item-row')
                        .next('.txdetail')
                        .find('.txparties .partyrow');

                    $items.each(function (idx, val) {
                        var $v2 = $(val);

                        var id = parseInt($v2.data('txid'));
                        var versionNumber = parseInt(
                            $v2.data('txversionnumber')
                        );
                        var allocated = $v2
                            .find('#SplitPayment_Allocated')
                            .asNumber();

                        if (allocated !== 0 && included) {
                            paymentVersionList.push({
                                id: id,
                                versionNumber: versionNumber,
                                allocated: allocated
                            });

                            commissionNet += $v2
                                .find('#CommissionNet')
                                .asNumber();
                            commissionVat += $v2
                                .find('#CommissionVat')
                                .asNumber();
                        }
                    });
                } else {
                    var id = parseInt($v.data('txid'));
                    var versionNumber = parseInt($v.data('txversionnumber'));
                    var allocated = $v.find('#Payment_Allocated').asNumber();
                    if (allocated !== 0 && included) {
                        paymentVersionList.push({
                            id: id,
                            versionNumber: versionNumber,
                            allocated: allocated
                        });

                        commissionNet += $v
                            .closest('.txrow')
                            .find('#CommissionNet')
                            .asNumber();
                        commissionVat += $v
                            .closest('.txrow')
                            .find('#CommissionVat')
                            .asNumber();
                    }
                }
            });

            var $form = createForm($input, url);

            $form.append(
                $(
                    '<input type="hidden" name="CommissionId" value="{0}" />'.format(
                        commissionId
                    )
                )
            );
            $form.append(
                $(
                    '<input type="hidden" name="PayableCommissionNet" value="{0}" />'.format(
                        commissionNet
                    )
                )
            );
            $form.append(
                $(
                    '<input type="hidden" name="PayableCommissionVat" value="{0}" />'.format(
                        commissionVat
                    )
                )
            );

            for (var x = 0; x < paymentVersionList.length; x++) {
                $form.append(
                    $(
                        '<input type="hidden" name="Expenses[{0}].Id" value="{1}" />'.format(
                            x,
                            paymentVersionList[x].id
                        )
                    )
                );
                $form.append(
                    $(
                        '<input type="hidden" name="Expenses[{0}].VersionNumber" value="{1}" />'.format(
                            x,
                            paymentVersionList[x].versionNumber
                        )
                    )
                );
                $form.append(
                    $(
                        '<input type="hidden" name="Expenses[{0}].Allocated" value="{1}" />'.format(
                            x,
                            paymentVersionList[x].allocated
                        )
                    )
                );
            }

            $form.find('.exclude-post').remove();

            return $form;
        }),
            (this.previewPaymentHtml = function ($root) {
                var $form = this.createPostbackForm($root);

                return new gmgps.cloud.http(
                    "paySupplierHandler-previewPaymentHtml"
                ).ajax({
                    args: $form.serializeObject(),
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: '/Accounting/PreviewSupplierPaymentHtml'
                });
            }),
            (this.previewPaymentDocument = function ($root) {
                var $form = this.createPostbackForm(
                    $root,
                    '/Accounting/PreviewSupplierPaymentDocument'
                );

                var ua = window.navigator.userAgent;

                var isIE =
                    ua.indexOf('MSIE ') > -1 || ua.indexOf('Trident/') > -1;

                if (!isIE) {
                    $form.attr('target', '_blank');
                }

                $form.appendTo('body').submit().remove();
            }),
            me.initCurrencyInputs();

        me.setupTips();

        me.resetGroupPaymentState();

        me.recalculateTotalPayable(
            parseFloat(
                me.$root
                    .find('#BalanceCarriedForward')
                    .data('balancecarriedforward')
            )
        );
    },

    show: function () {
        var me = this;

        new gmgps.cloud.ui.controls.window({
            title: me.title,
            windowId: 'paySupplierSummaryModal',
            controller: me.controller,
            url: 'Accounting/GetPaySupplierSummary',
            urlArgs: {
                contactId: me.id
            },
            data: me,
            post: true,
            complex: true,
            width: 950,
            draggable: true,
            modal: true,
            cancelButton: 'Close',
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
