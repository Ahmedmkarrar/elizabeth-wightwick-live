gmgps.cloud.ui.views.payLandlordHandler = function (args) {
    var me = this;

    me.id = args.id;

    me.onComplete = args.onComplete;
    me.onCancel = args.onCancel;
    me.title = args.title;

    return me.init();
};

gmgps.cloud.ui.views.payLandlordHandler.prototype = {
    init: function () {
        var me = this;

        return me;
    },

    controller: function (args) {
        var me = this;

        var pendingCalls = 0;

        function hideUpdateButton() {
            me.$window.find('.action-button:contains("Update")').hide();
        }

        function showUpdateButton() {
            me.$window.find('.action-button:contains("Update")').show();
        }

        function track(promise) {

            pendingCalls++;
            hideUpdateButton();

            promise.always(function () {
                pendingCalls--;

                if (pendingCalls <= 0) {
                    pendingCalls = 0;
                    showUpdateButton();
                }
            });

            return promise;
        }

        me.params = args.data;

        me.$root = args.$root;

        me.$window = args.$window;

        me.$window
            .find('.bottom .buttons .action-button')
            .removeClass('grey')
            .addClass('bgg-property');

        me.$window
            .find('.bottom .buttons .action-button')
            .after(
                '<div class="preview-button html-preview btn fr">Preview</div>'
            );

        // add a print button
        me.$window
            .find('.bottom .buttons .preview-button')
            .before(
                '<div class="print-button bgg-property btn hidden" style="float:left">Print Statement</div>'
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

        me.$root.find('.tabs').tabs({
            activate: function (event, ui) {
                if (ui.newPanel.attr('id') == 'options-tab') {
                    me.$window.find('.bottom .buttons .action-button').hide();
                } else {
                    me.$window.find('.bottom .buttons .action-button').show();
                }
            }
        });

        me.$window.on('click', '.print-button', function () {
            var txVersionList = me.getTransactionsToPay();

            if (txVersionList.length === 0) return false;

            me.previewStatementDocument(me.$root.find('.payment-landlord'));
        });

        me.$window.on('click', '.preview-button', function () {
            var txVersionList = me.getTransactionsToPay();

            if (txVersionList.length === 0) return false;

            if ($(this).hasClass('preview-on')) {
                //Turn off preview mode.
                $(this).removeClass('preview-on').text('Preview');
                me.$window
                    .find('.buttons .btn')
                    .not($(this))
                    .removeClass('disabled');

                me.$window.find('.buttons .btn.print-button').hide();

                me.$root
                    .find('#statement-preview-layer')
                    .fadeOut(250, function () {
                        me.$root
                            .find('#statement-preview-frame')
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

                me.$root.find('#statement-preview-layer').show();

                track(me.previewStatementHtml(
                    me.$root.find('.payment-landlord')
                )).done(function (r) {
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
                            $target: me.$root.find('#statement-preview-frame'),
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
                                    C.DocumentTemplateType.PublisherStationery,
                                templateId: r.Data.TemplateId,
                                printFormat: 0,
                                sampleDocumentContent: escapeHtml(
                                    r.Data.Content
                                )
                            }
                        });
                    }
                });
            }
        });

        me.$root.on('change', '#Selected', function () {
            var $balanceCarriedForward = me.$root
                .find('#BalanceCarriedForward')
                .data('dirty', false);
            me.selectLinked($(this).closest('.txrow'));
            me.refreshCounts(
                parseFloat($balanceCarriedForward.data('balancecarriedforward'))
            );
            me.refreshTaxDeductions();
        });




        me.$root.on('change', '#SelectedPaymentGroup', function (e) {

            var $option = $(e.target.options[e.target.selectedIndex]);

            track(new gmgps.cloud.http("payLandlordHandler-controller")
                .ajax({
                    args: {
                        referenceCode: $option.data('statementremark')
                    },
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: '/Contact/GetStatementRemark'
                })
                .done(function (result) {
                    if (result.Data) {
                        me.$root
                            .find('#StatementRemark')
                            .val(result.Data.Description);
                    }
                }));

            me.$root
                .find('.in-attachsupplierinvoices')
                .prop('checked', $option.data('attachsupplierinvoice'))
                .trigger('prog-change');
            me.$root
                .find('.in-showarrears')
                .prop('checked', $option.data('showarrears'))
                .trigger('prog-change');
        });

        me.$root.on('change', '#PaymentMethodId', function () {
            if ($(this).find(':selected').data('isbacs') === 1) {
                me.$root.find('#BankReference').val('Bacs');
                me.$root.find('#BankReference').attr('readonly', 'readonly');
            } else {
                me.$root.find('#BankReference').val('');
                me.$root.find('#BankReference').removeAttr('readonly');
            }
        });

        me.$root.on('blur', '#BalanceCarriedForward', function () {
            me.refreshCounts($(this).asNumber());
        });
        me.$root.on('keyup', '#BalanceCarriedForward', function () {
            $(this).data('dirty', true);
        });

        me.$root.on('change', '#IncludeIncomeUpTo', function () {
            if ($(this).prop('checked')) {
                me.$root.find('#TransactionsInvoicedToDate').show();
            } else {
                me.$root.find('#TransactionsInvoicedToDate').val('').hide();
            }
        });

        me.$root.on('keyup change', '.refreshable', function () {
            var transactionDate,
                invoiceDate,
                paymentGroupId,
                defaultPaymentMethod,
                bankAccountId;

            var enabledInvoicesUpTo = me.$root
                .find('#IncludeIncomeUpTo')
                .prop('checked');

            transactionDate = me.$root.find('#TransactionsToDate').val();
            paymentGroupId = me.$root.find('#SelectedPaymentGroup').val();
            bankAccountId = me.$root.find('#SelectedBankAccount').val();

            if (enabledInvoicesUpTo) {
                invoiceDate = me.$root
                    .find('#TransactionsInvoicedToDate')
                    .val();
            }

            track(me.refreshList(
                me.params.id,
                transactionDate,
                invoiceDate,
                paymentGroupId,
                bankAccountId
            )).done(function (r) {
                if (r && r.Data) {
                    me.$root.find('.body').empty().html(r.Data);
                    me.initCurrencyInputs();
                    //me.setupTips();
                    me.refreshCounts(
                        parseFloat(
                            me.$root
                                .find('#BalanceCarriedForward')
                                .data('balancecarriedforward')
                        )
                    );
                    me.refreshTaxDeductions();
                }
            });

            defaultPaymentMethod = me.$root
                .find('#SelectedPaymentGroup')
                .find(':selected')
                .data('defaultpaymentmethod');

            me.$root.find('#PaymentMethodId').val(defaultPaymentMethod);
            me.$root.find('#PaymentMethodId').trigger('change');
        });

        me.$root.on('click', '.txrow .detcol', function (e) {
            if ($(e.target).hasClass('detcol')) {
                $(this).parent().next().slideToggle('fast');
            }
        });

        me.$root.on('click', '.body .nrltax-info', function () {
            me.showTaxPopup();
        });

        this.action = function (onComplete) {
            var txVersionList = this.getTransactionsToPay();

            if (txVersionList.length === 0) return false;

            track(me.makePayments(me.$root.find('.payment-landlord'))).done(function (
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
                    return false;
                }
            });

            return false;
        };

        this.getUntickedIncome = function () {
            var txIdList = [];

            $.map(me.$root.find('#Selected:not(:checked)'), function (v) {
                var nominaltype = parseInt($(v).data('nominaltype'));

                if (nominaltype === 1) {
                    var id = parseInt($(v).data('transactionid'));
                    txIdList.push(id);
                }
            });

            return txIdList;
        };

        this.getTransactionsToPay = function () {
            var txIdList = [];
            var txVersionList = [];

            $.map(me.$root.find('#Selected:checked'), function (v) {
                var id = parseInt($(v).data('txid'));
                var versionNumber = parseInt($(v).data('txversionnumber'));

                if (txIdList.indexOf(id) === -1) {
                    txIdList.push(id);

                    txVersionList.push({
                        id: id,
                        versionNumber: versionNumber
                    });
                }
            });

            // add related tax items
            // first the income related items where the income is included in the payment
            $.map(
                me.$root.find(
                    '#Selected:checked[data-linkedtaxdeductionid!="0"]'
                ),
                function (v) {
                    var id = parseInt($(v).data('linkedtaxdeductionid'));
                    var versionNumber = parseInt(
                        $(v).data('linkedtaxversionnumber')
                    );

                    if (txIdList.indexOf(id) === -1) {
                        txIdList.push(id);

                        txVersionList.push({
                            id: id,
                            versionNumber: versionNumber
                        });
                    }
                }
            );

            //then the tax credits against fees and expenses (all of them regardless of whether there is a related item
            var $taxLineExpenses = me.$root.find(
                '.body .nlrtax-popup .taxline.expense'
            );

            $taxLineExpenses.each(function (i, v) {
                var $v = $(v);
                var id = parseInt($v.data('taxdeductionid'));
                var versionNumber = parseInt($v.data('taxversionnumber'));
                txIdList.push(id);

                txVersionList.push({
                    id: id,
                    versionNumber: versionNumber
                });
            });

            //then any additional tax items
            var $taxLineAdditional = me.$root.find(
                '.body .nlrtax-popup .taxline.additional'
            );

            $taxLineAdditional.each(function (i, v) {
                var $v = $(v);
                var id = parseInt($v.data('taxdeductionid'));
                var versionNumber = parseInt($v.data('taxversionnumber'));
                txIdList.push(id);

                txVersionList.push({
                    id: id,
                    versionNumber: versionNumber
                });
            });

            // add previous statement tx id list (should only be one but in future maybe more)
            var idString = me.$root
                .find('.summary-container')
                .attr('data-previousbalancetxlist');

            if (idString.length > 0) {
                var previousStatementIdList = idString.split(',');

                $.map(previousStatementIdList, function (v) {
                    var parts = v.split('|');
                    var id = parseInt(parts[0]);
                    var versionNumber = parseInt(parts[1]);

                    if (txIdList.indexOf(id) === -1) {
                        txIdList.push(id);

                        txVersionList.push({
                            id: id,
                            versionNumber: versionNumber
                        });
                    }
                });
            }

            return txVersionList;
        };

        (this.createPostbackForm = function ($root, url) {
            var txVersionList = this.getTransactionsToPay();

            var $form = createForm($root.clone(), url);

            for (var x = 0; x < txVersionList.length; x++) {
                $form.append(
                    $(
                        '<input type="hidden" name="TransactionList[{0}].Id" value="{1}" />'.format(
                            x,
                            txVersionList[x].id
                        )
                    )
                );
                $form.append(
                    $(
                        '<input type="hidden" name="TransactionList[{0}].VersionNumber" value="{1}" />'.format(
                            x,
                            txVersionList[x].versionNumber
                        )
                    )
                );
            }

            var txUntickedIncomeList = this.getUntickedIncome();

            for (var y = 0; y < txUntickedIncomeList.length; y++) {
                $form.append(
                    $(
                        '<input type="hidden" name="UntickedIncomeList[{0}]" value="{1}" />'.format(
                            y,
                            txUntickedIncomeList[y]
                        )
                    )
                );
            }

            return $form;
        }),
            (this.makePayments = function ($root) {
                var $form = this.createPostbackForm($root);

                return new gmgps.cloud.http(
                    "payLandlordHandler-makePayments"
                ).ajax({
                    args: $form.serializeObject(),
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: '/Accounting/PayLandlord'
                });
            });

        this.refreshList = function (
            contactId,
            transactionDate,
            invoiceDate,
            paymentGroupId,
            bankAccountId
        ) {
            return new gmgps.cloud.http("payLandlordHandler-refreshList").ajax({
                args: {
                    contactId: contactId,
                    transactionDate: transactionDate,
                    invoiceDate: invoiceDate,
                    paymentGroupId: paymentGroupId,
                    bankAccountId: bankAccountId
                },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/Accounting/GetPayLandlordTransactions'
            });
        };

        this.selectLinked = function ($this) {
            var checkedState = $this.find('#Selected').prop('checked');

            var id = parseInt($this.data('linkedid'));

            if (id > 0) {
                var $linkedIdList = me.$root.find(
                    '.txrow[data-linkedid="{0}"]'.format(id)
                );
                $linkedIdList.find('#Selected').prop('checked', checkedState);

                if (checkedState) {
                    $linkedIdList.find('#Selected').parent().addClass('ticked');
                } else {
                    $linkedIdList
                        .find('#Selected')
                        .parent()
                        .removeClass('ticked');
                }
            }
        };

        this.refreshTaxDeductions = function () {
            var currencySymbol = me.$root.find('#CurrencySymbol').val();

            var $ticked = me.$root.find('.txrow .tickbox-hidden:checked');

            var $list = me.$root.find('.nlrtax-popup .taxline');

            $list.hide();

            var netDeduction = new Decimal(0),
                totalIncome = new Decimal(0),
                totalExpense = new Decimal(0),
                totalAdditional = new Decimal(0),
                totalIncomeItems = {};

            if ($ticked.length > 0) {
                $ticked.each(function (i, v) {
                    var $v = $(v);
                    var linkedTxId = parseInt(
                        $v.closest('.txrow').data('linkedid')
                    );
                    var nominaltype = parseInt($v.data('nominaltype'));

                    if (linkedTxId > 0 && nominaltype === 1) {
                        //netDeduction
                        var $items = me.$root.find(
                            '.nlrtax-popup .item[data-linkedid="{0}"]'.format(
                                linkedTxId
                            )
                        );

                        $items.each(function (i, v) {
                            var $item = $(v);

                            $item.show();

                            if ($item.hasClass('income')) {
                                if (
                                    totalIncomeItems[linkedTxId] === undefined
                                ) {
                                    totalIncomeItems[linkedTxId] = new Decimal(
                                        parseFloat(
                                            $item.data('taxdeductionvalue')
                                        )
                                    );
                                } else {
                                    totalIncomeItems[linkedTxId] =
                                        totalIncomeItems[linkedTxId].add(
                                            new Decimal(
                                                parseFloat(
                                                    $item.data(
                                                        'taxdeductionvalue'
                                                    )
                                                )
                                            )
                                        );
                                }
                            }
                        });
                    }
                });
            }

            var $taxLineExpenses = me.$root.find('.taxline.expense');

            $taxLineExpenses.each(function (i, v) {
                var $v = $(v);
                $taxLineExpenses.show();
                totalExpense = totalExpense.add(
                    parseFloat($v.data('taxdeductionvalue'))
                );
            });

            var $taxLineAdditional = me.$root.find('.taxline.additional');

            $taxLineAdditional.each(function (i, v) {
                var $v = $(v);
                $taxLineAdditional.show();
                totalAdditional = totalAdditional.add(
                    parseFloat($v.data('taxdeductionvalue'))
                );
            });

            for (var key in totalIncomeItems) {
                // eslint-disable-next-line no-prototype-builtins
                if (totalIncomeItems.hasOwnProperty(key)) {
                    totalIncome = totalIncome.add(
                        totalIncomeItems[key].mul(-1)
                    );
                }
            }

            netDeduction = totalIncome.sub(totalExpense).sub(totalAdditional);

            me.$root
                .find('.net-deductions')
                .text('{0}{1}'.format(currencySymbol, netDeduction.toFixed(2)));
        };

        this.refreshCounts = function (balanceCarriedForward) {
            balanceCarriedForward = new Decimal(balanceCarriedForward);
            var $balanceCarriedForward = me.$root.find(
                '#BalanceCarriedForward'
            );
            var retainAll = parseInt(
                $balanceCarriedForward.data('retainall'),
                10
            );

            var totalDue = new Decimal(0),
                totalPayable = new Decimal(0),
                deductedTax = new Decimal(0);

            var currencySymbol = me.$root.find('#CurrencySymbol').val();

            var previousStatementBalance = new Decimal(
                parseFloat(
                    me.$root.find('.summary-container').data('previousbalance')
                )
            );

            var $ticked = me.$root.find('.txrow .tickbox-hidden:checked');

            var linkedTaxValues = {};

            if ($ticked.length > 0) {
                me.$root
                    .find('.txrow .tickbox-hidden:checked')
                    .each(function (i, v) {
                        var $v = $(v);

                        totalDue = totalDue.add(parseFloat($v.data('txgross')));

                        var linkedId = parseInt(
                            $v.closest('.txrow').data('linkedid')
                        );
                        var nominaltype = parseInt($v.data('nominaltype'));

                        if (linkedId > 0 && nominaltype === 1) {
                            var $taxItems = me.$root.find(
                                '.nlrtax-popup .item[data-linkedid=' +
                                    linkedId +
                                    ']'
                            );

                            $taxItems.each(function (i, txitem) {
                                var $txitem = $(txitem);

                                if (linkedTaxValues[linkedId] === undefined) {
                                    linkedTaxValues[linkedId] = new Decimal(
                                        parseFloat(
                                            $txitem.data('taxdeductionvalue')
                                        )
                                    );
                                } else {
                                    linkedTaxValues[linkedId] = linkedTaxValues[
                                        linkedId
                                    ].add(
                                        new Decimal(
                                            parseFloat(
                                                $txitem.data(
                                                    'taxdeductionvalue'
                                                )
                                            )
                                        )
                                    );
                                }
                            });
                        }
                    });

                for (var key in linkedTaxValues) {
                    // eslint-disable-next-line no-prototype-builtins
                    if (linkedTaxValues.hasOwnProperty(key)) {
                        deductedTax = deductedTax.add(
                            linkedTaxValues[key].mul(-1)
                        );
                    }
                }
            }

            var $taxLineExpenses = me.$root.find('.taxline.expense');

            $taxLineExpenses.each(function (i, v) {
                var $v = $(v);
                deductedTax = deductedTax.sub(
                    parseFloat($v.data('taxdeductionvalue'))
                );
            });

            var $taxLineAdditional = me.$root.find('.taxline.additional');

            $taxLineAdditional.each(function (i, v) {
                var $v = $(v);
                deductedTax = deductedTax.sub(
                    parseFloat($v.data('taxdeductionvalue'))
                );
            });

            totalPayable = previousStatementBalance.add(
                totalDue.sub(deductedTax)
            );

            if (totalPayable <= 0) {
                $balanceCarriedForward.val(0);
            }
            if (totalPayable > 0) {
                if (retainAll && !$balanceCarriedForward.data('dirty')) {
                    balanceCarriedForward = totalPayable;
                    totalPayable = new Decimal(0);
                    $balanceCarriedForward.val(
                        balanceCarriedForward.toFixed(2)
                    );
                } else {
                    if (totalPayable.sub(balanceCarriedForward) < 0) {
                        balanceCarriedForward = totalPayable;
                    } else {
                        if (balanceCarriedForward.sub(totalPayable) > 0) {
                            balanceCarriedForward =
                                balanceCarriedForward.sub(totalPayable);
                        }
                    }
                    totalPayable = totalPayable.sub(balanceCarriedForward);

                    $balanceCarriedForward.val(
                        balanceCarriedForward.toFixed(2)
                    );
                }
            }

            var totalDueIncBfwd = new Decimal(
                totalDue.add(previousStatementBalance)
            );

            me.$root.find('.total-tax').text(
                '{0}'.format(
                    $.inputmask.format(deductedTax.toFixed(2), {
                        alias: 'currency',
                        prefix: currencySymbol
                    })
                )
            );
            me.$root.find('.total-due').text(
                '{0}'.format(
                    $.inputmask.format(totalDueIncBfwd.toFixed(2), {
                        alias: 'currency',
                        prefix: currencySymbol
                    })
                )
            );

            if (totalPayable < 0) {
                me.$root
                    .find('.total-payable-label')
                    .addClass('reclaimed')
                    .text('Total To Be Reclaimed');
                me.$root
                    .find('.total-payable')
                    .addClass('reclaimed')
                    .text(
                        '{0}'.format(
                            $.inputmask.format(totalPayable.toFixed(2), {
                                alias: 'currency',
                                prefix: currencySymbol
                            })
                        )
                    );
            } else {
                me.$root
                    .find('.total-payable-label')
                    .removeClass('reclaimed')
                    .text('Total Payable');
                me.$root
                    .find('.total-payable')
                    .removeClass('reclaimed')
                    .text(
                        '{0}'.format(
                            $.inputmask.format(totalPayable.toFixed(2), {
                                alias: 'currency',
                                prefix: currencySymbol
                            })
                        )
                    );
            }
        };

        this.initCurrencyInputs = function () {
            me.$root
                .find('.opt-inputmask-numeric.amount-input')
                .inputmask('currency', {
                    radixPoint: '.',
                    groupSeparator: ',',
                    digits: 2,
                    autoGroup: true,
                    prefix: me.$root.find('#CurrencySymbol').val(),
                    rightAlign: true,
                    allowMinus: false
                });
        };

        (this.showTaxPopup = function () {
            me.$root.find('.summary-container .info').qtip({
                show: {
                    ready: true
                },
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
                    text: me.$root.find('.body .nlrtax-popup').clone()
                },
                style: {
                    classes: 'qtip-bootstrap',
                    tip: {
                        corner: true,
                        height: 14,
                        width: 24
                    }
                },
                events: {
                    hide: function (e, a) {
                        a.destroy(true);
                    }
                }
            });
        }),
            (this.previewStatementHtml = function ($root) {
                var $form = this.createPostbackForm($root);

                return new gmgps.cloud.http(
                    "payLandlordHandler-previewStatementHtml"
                ).ajax({
                    args: $form.serializeObject(),
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: '/Accounting/previewStatementHtml'
                });
            });

        this.previewStatementDocument = function ($root) {
            var $form = this.createPostbackForm(
                $root,
                '/Accounting/PreviewStatementDocument'
            );

            var ua = window.navigator.userAgent;

            var isIE = ua.indexOf('MSIE ') > -1 || ua.indexOf('Trident/') > -1;

            if (!isIE) {
                $form.attr('target', '_blank');
            }

            $form.appendTo('body').submit().remove();
        };

        me.initCurrencyInputs();

        me.refreshCounts(
            parseFloat(
                me.$root
                    .find('#BalanceCarriedForward')
                    .data('balancecarriedforward')
            )
        );

        me.refreshTaxDeductions();
    },

    show: function () {
        var me = this;

        new gmgps.cloud.ui.controls.window({
            title: me.title,
            windowId: 'payLandlordModal',
            controller: me.controller,
            url: 'Accounting/GetPayLandlordSummary',
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
