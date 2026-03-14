gmgps.cloud.ui.views.editChargeHandler = function (args) {
    var me = this;
    me.linkedId = args.linkedId;
    me.linkedTypeId = args.linkedTypeId;
    me.propertyId = args.propertyId;
    me.historyEventId = args.historyEventId;
    me.chargeId = args.chargeId;
    me.chargeType = args.chargeType;
    me.groupBankAccountId = args.groupBankAccountId || 0;
    me.chargeUsageType = args.chargeUsageType || 0; // refunds and refund charge items are also added/maintained here, as well as opening balance and arrears charges !
    me.onComplete = args.onComplete;
    me.onCancel = args.onCancel;
    me.title = args.title;
    me.windowId = args.windowId;
    me.readOnly = args.readOnly;
    me.vatRegistrationHelper = null;
    me.currencySymbol = null;
    me.sharedCharge = false;
    me.isSharedChargeAllowed = false;
    me.showRegisterLandlordForVATMessage = false;
    me.chargeRaised = false;
    me.isWorkOrderCharge = args.isWorkOrderCharge;
    me.invoiceDescriptions = '';
    me.selectedTargetRoleType = args.selectedTargetRoleType || 0;
    me.defaultItemDate = args.defaultItemDate || undefined;
    return me.init(args);
};

gmgps.cloud.ui.views.editChargeHandler.prototype = {
    init: function () {
        var me = this;
        return me;
    },

    controller: function (args) {
        var me = this,
            view;

        me.$root = args.$root;
        me.params = args.data;
        me.$window = args.$window;
        view = {
            buttons: me.$window.find('.bottom .buttons'),
            chargeTransactionNet: me.$root.find('#Charge_TransactionNet'),
            chargeTransactionVat: me.$root.find('#Charge_TransactionVat'),
            chargeNominalType: me.$root.find('#Charge_NominalTypeId'),
            chargeRoleType: me.$root.find('#Charge_TargetRoleType'),
            parties: me.$root.find('.party-content .lbox'),
            sumNet: me.$root.find('.charges .sum-net'),
            sumVat: me.$root.find('.charges .sum-val'),
            sumTotal: me.$root.find('.charges .sum-tot')
        };

        if (me.readOnly !== true) {
            var overrideReadOnlyAsChargeHasTransaction = false;
            var transactionIdFieldValueAsInt = parseInt(
                me.$root.find('#Charge_TransactionId').val()
            );
            overrideReadOnlyAsChargeHasTransaction =
                !isNaN(transactionIdFieldValueAsInt) &&
                transactionIdFieldValueAsInt > 0;
            if (overrideReadOnlyAsChargeHasTransaction) {
                me.params.readOnly = true;
                me.readOnly = true;
            }
        }

        view.actionButton = view.buttons.find('.action-button');
        view.cancelButton = view.buttons.find('.cancel-button');

        me.vatRegistrationHelper = new gmgps.cloud.helpers.vatRegistration(
            args
        );

        me.currencySymbol = me.$root.find('#CurrencySymbol').val();
        me.isSharedChargeAllowed =
            me.$root.find('#SharedChargeAllowed').val().toLowerCase() ===
            'true';
        me.invoiceDescriptions = JSON.parse(
            me.$root.find('#FrequencyDescriptionsJson').val()
        );
        view.actionButton.removeClass('grey').addClass('bgg-property');

        if (me.params.chargeId === 0 && me.params.selectedTargetRoleType > 0) {
            view.chargeRoleType.val(me.params.selectedTargetRoleType);
        }

        if (me.params.chargeId > 0) {
            var btnText = '';

            switch (me.params.chargeUsageType) {
                case C.ChargeToPostUsageType.Charge:
                    btnText = 'Charge';
                    break;
                case C.ChargeToPostUsageType.RefundItem:
                    btnText = 'Refund';
                    break;
                case C.ChargeToPostUsageType.OpeningBalanceCharge:
                    btnText = 'Opening Balance';
                    break;
                case C.ChargeToPostUsageType.ArrearsCharge:
                    btnText = 'Arrears';
                    break;
            }

            view.deleteButton = $(
                '<div data-chargeid="{0}" class="btn delete-button bgg-property" style="min-width: 100px; float: left;">Delete {1}</div>'.format(
                    me.params.chargeId,
                    btnText
                )
            );
            view.buttons.prepend(view.deleteButton);
            view.deleteButton.on('click', function (e) {
                if ($(e.currentTarget).hasClass('disabled')) {
                    return;
                }
                showDialog({
                    type: 'question',
                    title: 'Delete ' + btnText,
                    msg: 'Are you sure you want to delete this {0} ?'.format(
                        btnText
                    ),
                    buttons: {
                        Yes: function () {
                            me.deleteCharge().done(function (r) {
                                if (r && r.Data) {
                                    $.jGrowl(
                                        'The {0} has been deleted.'.format(
                                            btnText
                                        ),
                                        {
                                            header: 'Delete ' + btnText,
                                            theme: 'growl-system',
                                            life: 3000
                                        }
                                    );
                                    me.params.chargeCancelled = r.Data;
                                    me.params.onComplete(true);
                                    me.$window
                                        .find('.cancel-button')
                                        .trigger('click');
                                }
                            });
                            $(this).dialog('close');
                        },
                        No: function () {
                            $(this).dialog('close');
                        }
                    }
                });
            });

            if (me.params.isWorkOrderCharge) {
                view.raiseButton = $(
                    '<div data-chargeid="{0}" class="btn raise-button bgg-property" style="min-width: 100px; float: left;">Raise Charge</div>'.format(
                        me.params.chargeId
                    )
                );
                view.buttons.prepend(view.raiseButton);

                view.raiseButton.on('click', function (e) {
                    if ($(e.currentTarget).hasClass('disabled')) {
                        return;
                    }

                    var $f = me.$root.clone();

                    var valid = me.validate($f);

                    if (valid) {
                        me.raiseWorkOrderCharge(
                            parseInt($(this).data('chargeid'))
                        ).done(function (r) {
                            if (r && r.Data) {
                                me.params.chargeRaised = r.Data;
                                me.params.onComplete(true);
                                me.$window
                                    .find('.cancel-button')
                                    .trigger('click');
                            }
                        });
                    }
                });
            }

            //ensure the linkedId are maintained, when editing.
            me.$root
                .find('#LinkedId')
                .val(me.$root.find('#Charge_ModelId').val());
            me.linkedId =
                args.linkedId =
                me.params.linkedId =
                me.$root.find('#Charge_ModelId').val();
            me.$root
                .find('#LinkedType')
                .val(me.$root.find('#Charge_ModelTypeId').val());
            me.linkedTypeId =
                args.linkedTypeId =
                me.params.linkedTypeId =
                me.$root.find('#Charge_ModelTypeId').val();
        }

        if (me.params.defaultItemDate && me.params.chargeId === 0) {
            me.$root.find('#Charge_ItemDate').val(me.params.defaultItemDate);
        }

        me.$root.find('.tabs').tabs({
            activate: function (event, ui) {
                if (ui.newPanel.attr('id') === 'options-tab') {
                    view.actionButton.hide();
                    view.cancelButton.hide();

                    if (view.sharedChargeButton) {
                        view.sharedChargeButton.hide();
                    }
                } else {
                    view.actionButton.show();
                    view.cancelButton.show();

                    if (view.sharedChargeButton) {
                        view.sharedChargeButton.show();
                    }
                }
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

        var updateVatRatesFromDate = function () {
            var selectedDate = me.$root
                .find('#Charge_ItemDate')
                .datepicker('getDate');
            selectedDate.setMinutes(
                selectedDate.getMinutes() - selectedDate.getTimezoneOffset()
            ); //ignore timezones
            var $vatDropdown = me.$root.find('.vatRateList');
            var vatHelper = gmgps.cloud.helpers.vat();
            vatHelper
                .updateVatRatesDropdownForDate(selectedDate, $vatDropdown)
                .then(function () {
                    me.recalculateVAT();
                });
        };

        me.$root
            .find('#Charge_ItemDate')
            .datepicker('option', 'onSelect', function (dateString) {
                me.$root.find('#Charge_FirstItemStartDate').val(dateString);
                updateVatRatesFromDate();
            });

        me.$root.on('change', '.date-picker.date-vat-rate', function () {
            updateVatRatesFromDate();
        });

        me.$root.on('change', '#Charge_FrequencyId', function () {
            var $chargeUntilDate = me.$root.find('.charge-untils');

            if (parseInt($(this).val()) !== C.Frequency.AdHoc) {
                $chargeUntilDate.val('').prop('disabled', false);
            } else {
                $chargeUntilDate.val('').prop('disabled', true);
            }

            me.updateDescription();
        });

        me.$root.on(
            'change',
            '#Charge_TargetRoleType',
            charge_TargetRoleType_Changed
        );

        me.$root.on('keyup', '.netamount', function () {
            me.recalculateSharedCharge($(this).closest('.charges'));
        });

        me.$root.on('keyup', '.vatamount', function () {
            me.recalculateSharedCharge($(this).closest('.charges'));
        });

        me.$root.on('click', '.vtabs .tab', function () {
            $(this).closest('.vtabs').find('.tab').removeClass('on');
            $(this).addClass('on');

            var nominaltypeid = $(this).data('nominaltypeid');
            var $items = $(this).closest('.vtabs-container').find('.checklist');
            $items.find('.item').hide();
            $items
                .find('.item[data-nominaltypeid="' + nominaltypeid + '"]')
                .show();
        });

        me.$root.on(
            'changed',
            '.vtabs-container .checklist input',
            function () {
                var $this = $(this);

                // dismiss any errors
                me.$root.find('.selecteditem').validationEngine('hide');

                // uncheck the others
                var $ticks = $(this)
                    .closest('.vtabs-container')
                    .find('.tickbox');
                $ticks.each(function (i, v) {
                    var $tick = $(v);
                    var $check = $tick.find('input');

                    if (!$check.is($this)) {
                        $tick.removeClass('ticked');
                        $check.prop('checked', false);
                    }
                });

                var nominalCodeId = $this.val();
                var nominaltypeid = $this
                    .closest('.item')
                    .data('nominaltypeid');
                var chargetopostypeid = $this
                    .closest('.item')
                    .data('chargetopostypeid');
                var chargeItemVATRateType = $this
                    .closest('.item')
                    .data('vatratetypeid');

                var $select = $this
                    .closest('.vtabs-container')
                    .find('.selecteditem');
                var $list = $(this)
                    .closest('.vtabs-container')
                    .find('.checklist');
                var count = $list.find(
                    '.item[data-nominaltypeid="' +
                    nominaltypeid +
                    '"] input[type="checkbox"]:checked'
                ).length;

                if (count > 0) {
                    me.$root.find('#Charge_NominalCodeId').val(nominalCodeId);
                    me.$root.find('#Charge_NominalTypeId').val(nominaltypeid);
                    me.$root.find('#Charge_TypeId').val(chargetopostypeid);

                    $select.text($this.data('name'));
                    toggleSelect();
                } else {
                    me.resetNominalList(false);
                }

                var linkedType;

                if (nominaltypeid === C.AccountsNominalType.Expenses) {
                    me.$root.find('.supplierinfo').show();
                    linkedType = me.$root.find('#LinkedType').val();
                    if (
                        me.params.linkedTypeId === C.ModelType.Supplier ||
                        linkedType === 'Supplier'
                    ) {
                        me.$root
                            .find('.row.charge-enddate')
                            .css('visibility', 'hidden');
                        me.setOptionsTabVisibility(false);
                        me.$root.find('.chargeSelection').show();
                    }
                } else {
                    linkedType = me.$root.find('#LinkedType').val();
                    if (
                        me.params.linkedTypeId !== C.ModelType.Supplier ||
                        linkedType !== 'Supplier'
                    ) {
                        me.$root
                            .find('.row.charge-enddate')
                            .css('visibility', 'visible');
                    }
                    me.$root.find('.supplierinfo').hide();
                    me.setOptionsTabVisibility(true);
                }

                if (count > 0) {
                    me.$root
                        .find('#Charge_VATRateId')
                        .val(chargeItemVATRateType)
                        .trigger('change');
                }

                me.updateDescription();
                checkNegativePermitted();
            }
        );

        me.$root.on('click', '.vtabs-selector', function () {
            toggleSelect();
        });

        me.$root.find('select').customSelect();

        me.$root.on('change', '#SupplierChargeTo', function () {
            me.$root.find('ul.ui-autocomplete').hide();

            me.$root
                .find('.records.properties,.records.contacts,.records.tenancy')
                .hide();

            var selectedText = me.$root
                .find('#SupplierChargeTo option:selected')
                .text();
            var propertyId = me.$root.find('#Charge_PropertyId').asNumber();
            var tenancyId = me.$root.find('#Charge_TenancyId').asNumber();
            var tenantContactId = me.$root
                .find('#Charge_TenantContactId')
                .asNumber();
            var supplierContactId = me.$root
                .find('#Charge_SupplierContactId')
                .asNumber();
            if (supplierContactId === 0) {
                supplierContactId =
                    me.$root.find('#LinkedId').asNumber() > 0
                        ? me.$root.find('#LinkedId').asNumber()
                        : parseInt(
                            me.$root.find('.supplier-ac').attr('data-id')
                        );
            }
            me.$root.find('.supplierinfo .row').css('visibility', 'visible');
            switch (parseInt($(this).val())) {
                case C.ModelType.Property:
                    me.$root
                        .find('.records.properties, .row.chargeSelection')
                        .show();
                    me.$root.find('.chargeToLabel').html(selectedText);
                    me.$root.find('.propertyBankAccounts').show();

                    me.setOptionsTabVisibility(false);

                    me.$root
                        .find('.row.charge-enddate')
                        .css('visibility', 'visible');

                    me.$root
                        .find('.bankAccountSelector')
                        .css('visibility', 'visible');

                    if (propertyId > 0) {
                        me.getWorkOrdersForProperty(
                            propertyId,
                            supplierContactId
                        );
                    }
                    break;
                case C.ModelType.Tenancy:
                    me.$root
                        .find('.records.tenancy, .row.chargeSelection')
                        .show();
                    me.$root.find('.chargeToLabel').html(selectedText);

                    me.setOptionsTabVisibility(true);

                    me.$root
                        .find('.bankAccountSelector')
                        .css('visibility', 'hidden');
                    me.$root
                        .find('.row.charge-enddate')
                        .css('visibility', 'hidden');
                    me.getWorkOrdersForTenancyOrSupplier(
                        tenancyId,
                        supplierContactId
                    );
                    break;
                case C.ModelType.Tenant:
                    me.$root
                        .find('.records.contacts, .row.chargeSelection')
                        .show();
                    me.$root.find('.chargeToLabel').html(selectedText);
                    me.setOptionsTabVisibility(true);
                    me.$root
                        .find('.bankAccountSelector')
                        .css('visibility', 'hidden');
                    me.$root
                        .find('.row.charge-enddate')
                        .css('visibility', 'hidden');
                    me.getWorkOrdersForContactOrSupplier(
                        tenantContactId,
                        supplierContactId,
                        propertyId
                    );
                    break;
            }
        });

        me.$root.on('change', '#Charge_Client_ExcludeFromArrears', function () {
            if ($(this).prop('checked')) {
                me.$root
                    .find('#Charge_Client_ShowInArrearsAfter')
                    .attr('disabled', 'disabled');
            } else {
                me.$root
                    .find('#Charge_Client_ShowInArrearsAfter')
                    .removeAttr('disabled');
            }
        });

        me.$root.on('change', '#Charge_TransactionNet', function () {
            me.recalculateVAT();
            me.distributeSharedCharge();
        });

        me.$root.on(
            'keyup',
            '#Charge_TransactionNet',
            $.debounce(250, false, checkNegativePermitted)
        );

        me.$root.on('change', '#Charge_TransactionVat', function () {
            me.checkVATPermitted(true);
            me.recalculateTotal();
        });

        me.$root.on('change', '#Charge_VATRateId', function () {
            if (me.landLordVatApplies()) {
                if (!me.ExemptVatRateSelected()) {
                    me.checkVATPermitted();
                } else {
                    me.recalculateVAT();
                }
            } else {
                me.recalculateVAT();
            }
        });

        me.$root.on('change', '.charge-until-property', function () {
            me.$root.find('.charge-until-options').val($(this).val());
        });

        var previouslyCheckedSupplierId = me.$root.find('#Charge_SupplierContactId').val();
        var previouslyCheckedSupplierReference = me.$root.find('#Charge_Client_SupplierReference').val();

        this.displayDuplicateChargesBySupplierInvoiceReference = function () {
            var chargesBySupplierInvoiceReferenceFound = false;
            var supplierId = me.$root.find('#Charge_SupplierContactId').val();
            if (!supplierId || supplierId == 0) {
                supplierId = me.$root.find('input.supplier-ac').data('id');
            }
            var supplierReference = me.$root.find('#Charge_Client_SupplierReference').val();
            var currentChargeId = me.$root.find('#Charge_Id').val();

            if (supplierId && supplierReference && (supplierId != previouslyCheckedSupplierId || supplierReference != previouslyCheckedSupplierReference)) {
                previouslyCheckedSupplierId = supplierId;
                previouslyCheckedSupplierReference = supplierReference;
                me.getDuplicateChargesBySupplierInvoiceReference(
                    supplierId,
                    supplierReference,
                    currentChargeId
                ).done(function (r) {
                    if (r && r.Data && r.Data.trim()) {
                        $('#chargesBySupplierInvoiceReference').html(r.Data);
                        $(window).trigger('resize');
                        chargesBySupplierInvoiceReferenceFound = true;
                    }
                    else {
                        me.$root.find('#chargesBySupplierInvoiceReference').hide();
                    }
                }
                ).complete(function () {
                    return chargesBySupplierInvoiceReferenceFound;
                });
            }
            return chargesBySupplierInvoiceReferenceFound;
        }

        this.getDuplicateChargesBySupplierInvoiceReference = function (supplierId, supplierReference, currentChargeId) {
            return new gmgps.cloud.http('editChargeHandler-getDuplicateChargesBySupplierInvoiceReference').ajax({
                args: {
                    supplierId: supplierId,
                    supplierReference: supplierReference,
                    currentChargeId: currentChargeId
                },
                complex: false,
                async: false,
                silentErrors: true,
                dataType: 'json',
                type: 'post',
                url: '/Accounting/GetDuplicateChargesBySupplierInvoiceReference'
            });
        }
        $(window).resize(function () {
            me.setScrollableDuplicateInvoiceTable();
        });

        this.setScrollableDuplicateInvoiceTable = function () {
            $(window).height() < 780
                ? me.$root.find('#duplicate-supplier-invoice-table-wrapper').addClass('invoice-table-scrollable')
                : me.$root.find('#duplicate-supplier-invoice-table-wrapper').removeClass('invoice-table-scrollable');
        }

        this.raiseWorkOrderCharge = function (chargeId) {
            return new gmgps.cloud.http(
                "editChargeHandler-raiseWorkOrderCharge"
            ).ajax({
                args: {
                    chargeId: chargeId
                },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/Accounting/RaiseCharge'
            });
        };

        this.checkLandlordVATRegistered = function (onComplete) {
            var $targetRole = me.$root.find(
                '#Charge_TargetRoleType option:selected'
            );

            if ($targetRole.length === 1) {
                var tenancyId = $targetRole.data('tenancyid');

                if (tenancyId) {
                    me.vatRegistrationHelper
                        .areLandlordsVATRegistered(tenancyId)
                        .done(function (r) {
                            if (r && !r.Data) {
                                // not registered - prompt to set landlords registered or not

                                me.vatRegistrationHelper.promptToRegisterLandlordVAT(
                                    tenancyId,
                                    function (registered) {
                                        onComplete(registered);
                                    }
                                );
                            } else {
                                onComplete(true);
                            }
                        });
                } else {
                    onComplete(true);
                }
            } else {
                onComplete(true);
            }
        };

        this.checkVATPermitted = function (skipVATRecalculation) {
            var netValue = me.$root.find('#Charge_TransactionNet').asNumber();
            var vatValue = me.$root.find('#Charge_TransactionVat').asNumber();

            // cant have a VAT value without a net
            if (netValue === 0 && vatValue !== 0) {
                me.$root.find('#Charge_TransactionVat').val(0);
                me.recalculateTotal();
                return;
            }

            // we need to ensure that VAT value is of the same sign as the net value - cant have +100.00 net with -20.00 vat !
            if (!(netValue < 0 === vatValue < 0)) {
                // are they of same sign ?
                vatValue =
                    netValue < 0 ? Math.abs(vatValue) * -1 : Math.abs(vatValue);
                me.$root.find('#Charge_TransactionVat').val(vatValue);
            }

            if (me.landLordVatApplies()) {
                me.checkLandlordVATRegistered(function (success) {
                    if (success) {
                        if (!skipVATRecalculation) {
                            me.recalculateVAT();
                        }

                        me.recalculateTotal();
                        me.distributeSharedCharge();
                    } else {
                        me.$root
                            .find('#Charge_VATRateId')
                            .val(0)
                            .trigger('prog-change');
                        me.$root.find('#Charge_TransactionVat').val(0);
                        me.recalculateTotal();
                    }
                });
            }
        };

        this.recalculateVAT = function () {
            var $vatRates = me.$root.find('#Charge_VATRateId option:selected');

            if ($vatRates.length === 1) {
                var vatRate = new Decimal($vatRates.data('vatrate'));
                var netValue = new Decimal(
                    me.$root.find('#Charge_TransactionNet').asNumber()
                );

                var vatValue = new Decimal(netValue.div(100).mul(vatRate));

                me.$root
                    .find('#Charge_TransactionVat')
                    .val(vatValue.toFixed(2));
            }

            me.recalculateTotal();
        };

        this.recalculateTotal = function () {
            var netValue = new Decimal(
                me.$root.find('#Charge_TransactionNet').asNumber()
            );
            var vatValue = new Decimal(
                me.$root.find('#Charge_TransactionVat').asNumber()
            );

            me.$root.find('.totalcharge').text(
                $.inputmask.format(netValue.add(vatValue).toFixed(2), {
                    alias: 'currency',
                    prefix: me.currencySymbol
                })
            );
        };

        this.landLordVatApplies = function () {
            return (
                C.AccountsNominalType.LandlordIncome ===
                parseInt(me.$root.find('#Charge_NominalTypeId').val())
            );
        };

        this.ExemptVatRateSelected = function () {
            return (
                C.SalesTaxRateType.Exempt ===
                parseInt(me.$root.find('#Charge_VATRateId').val())
            );
        };

        (this.setOptionsTabVisibility = function (showOptions) {
            // never show options for refund charge items

            if (
                showOptions &&
                me.params.chargeUsageType !==
                C.ChargeToPostUsageType.RefundItem &&
                me.params.chargeUsageType !==
                C.ChargeToPostUsageType.OpeningBalanceCharge &&
                me.params.chargeUsageType !==
                C.ChargeToPostUsageType.ArrearsCharge &&
                me.params.chargeUsageType !==
                C.ChargeToPostUsageType.RefundCharge &&
                me.params.linkedTypeId !== C.ModelType.Property
            ) {
                me.$root.find('.options-selector').css('visibility', 'visible');
            } else {
                me.$root.find('.options-selector').css('visibility', 'hidden');
                me.$root.find('#options-tab').hide();
            }
        }),
            (this.updateDescription = function () {
                //update description:
                var chargeDesc =
                    me.$root.find('.vtabs-content .tickbox-hidden:checked')
                        .length > 0
                        ? me.$root.find('.vtabs-selector .selecteditem').text()
                        : '';
                if (
                    me.$root.find('#Charge_NominalCodeId').val() > 0 &&
                    me.$root.find('#Charge_FrequencyId').val() !==
                    C.Frequency.AdHoc
                ) {
                    var nominaldescription = '';
                    me.invoiceDescriptions.some(function (entry) {
                        if (
                            entry.InstanceId ===
                            parseInt(me.$root.find('#Charge_FrequencyId').val())
                        ) {
                            nominaldescription = entry.InvoiceDescription;
                            return true;
                        }
                    }, this);
                    me.$root
                        .find('#Charge_OriginalItemDescription')
                        .val(chargeDesc + ' ' + nominaldescription);
                } else {
                    me.$root
                        .find('#Charge_OriginalItemDescription')
                        .val(chargeDesc);
                }
            }),
            (this.validate = function ($f) {
                //Init validation engine.
                me.$root
                    .addClass('opt-validate')
                    .validationEngine({ scroll: false });

                var valid = me.$root.validationEngine('validate');

                //Update supplier information if available.
                var isLandlordCharge =
                    parseInt(me.$root.find('#Charge_NominalTypeId').val()) ===
                    C.AccountsNominalType.LandlordIncome;
                var isSupplierOrWorkOrder =
                    parseInt(me.$root.find('#Charge_TargetRoleType').val()) ===
                    C.EventPartyRoleType.Supplier ||
                    me.$root.find('#LinkedType').val() === 'Supplier';
                var isExpenses =
                    parseInt(me.$root.find('#Charge_NominalTypeId').val()) ===
                    C.AccountsNominalType.Expenses;
                if (isExpenses && isSupplierOrWorkOrder) {
                    var propertyId = 0;
                    var tenancyId = 0;
                    var tenantContactId = 0;

                    $f.find('#Charge_TypeId').val(C.ChargeToPostType.Client);
                    var selectedItem = me.$root.find('#SupplierChargeTo').val();
                    switch (parseInt(selectedItem)) {
                        case C.ModelType.Property:
                            //Update property Id AND SET TypeId and RoleType
                            propertyId = parseInt(
                                me.$root
                                    .find('.property-ac')
                                    .parent()
                                    .find('.text')
                                    .attr('data-Id')
                            );
                            $f.find('#Charge_TargetRoleType').val(
                                C.EventPartyRoleType.Property
                            );
                            if (!$.isNumeric(propertyId) || propertyId < 1) {
                                me.$root
                                    .find('.property-ac')
                                    .validationEngine(
                                        'showPrompt',
                                        'A selection is required.',
                                        'x',
                                        'topLeft',
                                        true
                                    );
                                valid = false;
                            }
                            break;
                        case C.ModelType.Tenancy:
                            //Update tenancy Id
                            tenancyId = parseInt(
                                me.$root
                                    .find('.tenancy-ac')
                                    .parent()
                                    .find('.text')
                                    .attr('data-Id')
                            );
                            $f.find('#Charge_TargetRoleType').val(
                                C.EventPartyRoleType.Tenancy
                            );
                            if (!$.isNumeric(tenancyId) || tenancyId < 1) {
                                me.$root
                                    .find('.tenancy-ac')
                                    .validationEngine(
                                        'showPrompt',
                                        'A selection is required.',
                                        'x',
                                        'topLeft',
                                        true
                                    );
                                valid = false;
                            }
                            break;
                        case C.ModelType.Tenant:
                            //Update tenant Id
                            tenancyId = me.$root
                                .find('#Charge_TenancyId')
                                .asNumber();
                            tenantContactId = parseInt(
                                me.$root
                                    .find('.contact-ac')
                                    .parent()
                                    .find('.text')
                                    .attr('data-Id')
                            );
                            $f.find('#Charge_TargetRoleType').val(
                                C.EventPartyRoleType.Tenant
                            );
                            $f.find('#Charge_ApplicantContactId').val(0);
                            if (
                                !$.isNumeric(tenantContactId) ||
                                tenantContactId < 1
                            ) {
                                me.$root
                                    .find('.contact-ac')
                                    .validationEngine(
                                        'showPrompt',
                                        'A selection is required.',
                                        'x',
                                        'topLeft',
                                        true
                                    );
                                valid = false;
                            }
                            break;
                    }
                    $f.find('#Charge_PropertyId').val(propertyId);
                    $f.find('#Charge_TenancyId').val(tenancyId);
                    $f.find('#Charge_TenantContactId').val(tenantContactId);
                }

                if (isLandlordCharge) {
                    //$f.find('#Charge_PropertyId').val(0);
                }

                if (
                    parseInt(me.$root.find('#Charge_NominalCodeId').val()) ===
                    C.AccountsNominalCode.Deposit
                ) {
                    $f.find('#Charge_PropertyId').val(0);
                    $f.find('#Charge_LandlordContactId').val(0);
                }

                var supplierContactId = parseInt(
                    me.$root
                        .find('.supplier-ac')
                        .parent()
                        .find('.text')
                        .attr('data-Id')
                );
                if ($.isNumeric(supplierContactId)) {
                    $f.find('#Charge_SupplierContactId').val(supplierContactId);
                }

                if (
                    parseInt(me.$root.find('#Charge_NominalCodeId').val()) === 0
                ) {
                    me.$root
                        .find('.selecteditem')
                        .validationEngine(
                            'showPrompt',
                            'Please choose a Charge Item type',
                            'x',
                            'topLeft',
                            true
                        );
                    valid = false;
                }

                if (me.$root.find('.totalcharge').asNumber() === 0) {
                    me.$root
                        .find('.totalcharge')
                        .validationEngine(
                            'showPrompt',
                            'Charge cannot be zero',
                            'x',
                            'topLeft',
                            true
                        );
                    valid = false;
                }

                //blank the propertyId for Tenancy and Tenants
                var targetType = parseInt(
                    me.$root.find('#Charge_TargetRoleType').val()
                );
                if (
                    isExpenses &&
                    (targetType === C.EventPartyRoleType.Tenant ||
                        targetType === C.EventPartyRoleType.Tenancy)
                ) {
                    $f.find('#Charge_PropertyId').val(0);
                }

                if (
                    me.$root.find('#Charge_AccountId').css('visibility') !==
                    'hidden' &&
                    me.$root.find('#Charge_AccountId').asNumber() === -1
                ) {
                    me.$root
                        .find('#Charge_AccountId')
                        .validationEngine(
                            'showPrompt',
                            'A bank account is required.',
                            'x',
                            'topLeft',
                            true
                        );
                    valid = false;
                }

                if (
                    me.$root.find('#SupplierChargeTo').val() < 1 &&
                    isSupplierOrWorkOrder &&
                    isExpenses
                ) {
                    me.$root
                        .find('#SupplierChargeTo')
                        .validationEngine(
                            'showPrompt',
                            'A selection is required.',
                            'x',
                            'topLeft',
                            true
                        );
                    valid = false;
                }

                if (!me.validateChargeFrequencyItemDate()) {
                    valid = false;
                }

                if (!validateSharedChargeValues()) {
                    valid = false;
                }
                if (!checkNegativePermitted()) {
                    valid = false;
                }

                if (me.displayDuplicateChargesBySupplierInvoiceReference()) {
                    valid = false;
                }

                $f.find('.row.showArrears input').removeAttr('disabled');

                if ($f.find('.chargeFileUploader .file-panel').length > 0) {
                    var mediaId = $f
                        .find(
                            '.chargeFileUploader .file-panel .media-info input[name="MediaItems[].Id"]'
                        )
                        .asNumber();
                    $f.find('#Charge_Client_MediaId').val(mediaId);
                }

                // remove bank account if not visible so it doesnt send back an inappropriate account id

                if (
                    me.$root.find('#Charge_AccountId').css('visibility') ===
                    'hidden'
                ) {
                    $f.find('#Charge_AccountId').remove();
                }

                // finally remove form element from simple uploader else dup form gets created
                $f.find('form').remove();

                return valid;
            }),
            (this.action = function (onComplete, $btn) {
                var $this = this;

                if ($btn.hasClass('disabled')) {
                    return true;
                }

                $btn.addClass('disabled');

                var $f = me.$root.clone();

                var valid = me.validate($f);

                if (valid) {
                    var updateAction = function () {
                        // remove duplicate Charge_ChargeUntil input before posting!

                        $f.find('.charge-until-property').remove();

                        $this.updateCharge($f).done(function (r) {
                            if (r && r.Data) {
                                me.params.chargeId = r.Data.Id;
                                onComplete(false);
                                return true;
                            } else {
                                $btn.removeClass('disabled');
                            }
                        });
                    };

                    // need to check for potential dups for opening balances and arrears charges
                    if (
                        me.params.chargeUsageType ===
                        C.ChargeToPostUsageType.OpeningBalanceCharge ||
                        me.params.chargeUsageType ===
                        C.ChargeToPostUsageType.ArrearsCharge
                    ) {
                        var value = new Decimal(
                            me.$root.find('.totalcharge').asNumber()
                        );

                        var balanceType =
                            me.params.chargeUsageType ===
                                C.ChargeToPostUsageType.OpeningBalanceCharge
                                ? C.OpeningBalanceAuditRowType.OpeningBalance
                                : C.OpeningBalanceAuditRowType.Arrears;
                        var handler =
                            new gmgps.cloud.ui.views.duplicateEntryHandler();

                        handler.duplicateEntryExists(
                            me.params.linkedId,
                            me.params.linkedTypeId,
                            balanceType,
                            value.toFixed(2),
                            function (cancelUpdate) {
                                // if dups and replied dont continue then dont add/change
                                if (cancelUpdate) {
                                    $btn.removeClass('disabled');
                                    return false;
                                }

                                updateAction();
                            }
                        );
                    } else {
                        updateAction();
                    }
                } else {
                    $btn.removeClass('disabled');
                }

                return false;
            });

        this.distributeSharedCharge = function () {
            if (me.sharedCharge) {
                var net = new Decimal(view.chargeTransactionNet.asNumber()),
                    vat = new Decimal(view.chargeTransactionVat.asNumber()),
                    tenantCount = view.parties.length,
                    netShare = net.div(tenantCount),
                    vatShare = vat.div(tenantCount),
                    netDiff = net.sub(netShare.mul(tenantCount)),
                    vatDiff = vat.sub(vatShare.mul(tenantCount));

                me.allocateSharedValues(
                    view.parties,
                    netShare,
                    vatShare,
                    netDiff,
                    vatDiff
                );

                //finally calculate totals!
                updateTotals(view.parties);
            }
        };

        this.allocateSharedValues = function (
            $rows,
            netShare,
            vatShare,
            netDiff,
            vatDiff
        ) {
            $rows.each(function (i, v) {
                var $row = $(v);
                var net, vat;

                if (i === 0) {
                    net = new Decimal(netShare.add(netDiff));
                    vat = new Decimal(vatShare.add(vatDiff));
                } else {
                    net = netShare;
                    vat = vatShare;
                }

                $row.find('.netamount').val(net.toFixed(2));
                $row.find('.vatamount').val(vat.toFixed(2));
                $row.find('.charge.total').html(net.add(vat).toFixed(2));
            });
        };

        this.recalculateSharedCharge = function (tenantContainer) {
            tenantContainer = $(tenantContainer);
            var net = tenantContainer.find('.netamount').asNumber();
            var vat = tenantContainer.find('.vatamount').asNumber();
            tenantContainer.find('.charge.total').html(total(net, vat));
            updateTotals();
        };

        this.deleteCharge = function () {
            return new gmgps.cloud.http("editChargeHandler-deleteCharge").ajax({
                args: {
                    chargeId: parseInt(me.$root.find('#Charge_Id').val())
                },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/Accounting/DeleteCharge'
            });
        };

        this.updateCharge = function ($f) {
            return new gmgps.cloud.http("editChargeHandler-updateCharge").ajax({
                args: {
                    model: createForm($f).serializeObject()
                },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/Accounting/UpdateCharge'
            });
        };

        this.setupSupplier = function ($e) {
            var $supplier = me.$root.find('#Charge_SupplierContactId');

            $e.autoCompleteEx({
                modelType: C.ModelType.Contact,
                search: {
                    CategoryIdList: [C.ContactCategory.Supplier],
                    ApplyFurtherFilteringtoIds: true,
                    FullQuery: true
                },
                allowCreate: true,
                includeContacts: true,
                includeUsers: false,
                displayCompanyName: true,
                placeholder: 'Search for Supplier...',
                newContactCategory: C.ContactCategory.Supplier,
                onSelected: function (args) {
                    $supplier.val(args.id);
                },
                onRemoved: function () {
                    $supplier.val(0);
                }
            });
        };

        this.updateNominalTypeList = function (
            branchId,
            roleType,
            landlordContactId,
            isSupplier,
            excludeSupplierFees
        ) {
            me.getNominalTypes(
                branchId,
                roleType,
                landlordContactId,
                excludeSupplierFees
            ).done(function (r) {
                me.$root.find('.vtabs-content').replaceWith(r.Data);

                me.resetNominalList(false);
                if (isSupplier) {
                    setupSupplierDefaultChargeItem();
                }
            });
        };

        this.resetNominalList = function (disable) {
            me.$root.find('.selecteditem').text('Select...');

            // reset any selections
            me.$root.find('#Charge_NominalCodeId').val(0);
            me.$root.find('#Charge_TypeId').val(0);

            if (disable) {
                me.$root.find('.chargeitem-row').hide();
            } else {
                me.$root.find('.chargeitem-row').show();
            }

            me.$root.find('.supplierinfo').hide();

            toggleSelect(true);
        };

        this.getNominalTypes = function (
            branchId,
            roleType,
            landlordContactId,
            excludeSupplierExpense
        ) {
            return new gmgps.cloud.http(
                "editChargeHandler-getNominalTypes"
            ).ajax({
                args: {
                    branchId: branchId,
                    type: roleType,
                    landlordContactId: landlordContactId,
                    excludeSupplierExpense: excludeSupplierExpense,
                    chargeUsageType: me.params.chargeUsageType
                },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/Accounting/GetNominalCodeListForType'
            });
        };

        this.setupPropertyAC = function ($e) {
            $e.autoCompleteEx({
                modelType: C.ModelType.Property,
                search: {
                    RecordType: C.PropertyRecordType.Rent,
                    ApplyFurtherFilteringtoIds: true
                },
                placeholder: 'Search for Property...',
                onSelected: function (acArgs) {
                    var $row = acArgs.$e.closest('.row');
                    $row.attr('data-id', acArgs.id);
                    $row.find('input[data-id="propertyId"]').val(acArgs.id);
                    if (!acArgs.isSetupCallback) {
                        me.getPropertyBankAccounts(acArgs.id);
                        var supplierContactId = me.$root
                            .find('#Charge_SupplierContactId')
                            .asNumber();
                        if (supplierContactId === 0) {
                            supplierContactId =
                                me.$root.find('#LinkedId').asNumber() > 0
                                    ? me.$root.find('#LinkedId').asNumber()
                                    : parseInt(
                                        me.$root
                                            .find('.supplier-ac')
                                            .attr('data-id')
                                    );
                        }
                        me.getWorkOrdersForProperty(
                            acArgs.id,
                            supplierContactId
                        );
                    }
                }
            });
            if (me.params.linkedTypeId === C.ModelType.WorkOrder) {
                me.$root
                    .find('.property-ac')
                    .addClass('text')
                    .parent()
                    .find('.text')
                    .attr(
                        'data-Id',
                        me.$root.find('#Charge_PropertyId').asNumber()
                    )
                    .end()
                    .find('.selection')
                    .find('.text')
                    .css({ right: 0 })
                    .end()
                    .find('.cancel')
                    .remove();
            }
        };

        this.setupContactAC = function ($e, categoryType) {
            $e.autoCompleteEx({
                modelType: C.ModelType.Contact,
                includeContacts: true,
                includeUsers: false,
                search: {
                    ApplyFurtherFilteringtoIds: true,
                    CategoryIdList: [categoryType]
                },
                displayCompanyName: categoryType === C.ContactCategory.Supplier,
                placeholder: 'Search for Contact...',
                onSelected: function (acArgs) {
                    var $row = acArgs.$e.closest('.row');
                    $row.attr('data-id', acArgs.id);
                    $row.find('input[data-id="contactId"]').val(acArgs.id);
                    if (acArgs.modelSubType === undefined) {
                        return false;
                    }
                    if (acArgs.modelSubType === C.ContactCategory.Supplier) {
                        var targetRoleTypeId = me.$root
                            .find('#Charge_TargetRoleType')
                            .asNumber();
                        if (targetRoleTypeId > 0) {
                            switch (targetRoleTypeId) {
                                case C.EventPartyRoleType.Property:
                                case C.EventPartyRoleType.Tenancy:
                                    me.getWorkOrdersForProperty(
                                        me.$root
                                            .find('#Charge_PropertyId')
                                            .asNumber(),
                                        acArgs.id
                                    );
                                    break;
                                case C.EventPartyRoleType.Tenant:
                                    me.getWorkOrdersForContactOrSupplier(
                                        me.$root
                                            .find('#Charge_TenantContactId')
                                            .val(),
                                        acArgs.id,
                                        me.$root
                                            .find('#Charge_PropertyId')
                                            .val()
                                    );
                                    break;
                                case C.EventPartyRoleType.Supplier:
                                    break;
                            }
                        }
                    } else {
                        var supplierContactId = me.$root
                            .find('#Charge_SupplierContactId')
                            .asNumber();
                        if (supplierContactId === 0) {
                            supplierContactId =
                                me.$root.find('#LinkedId').asNumber() > 0
                                    ? me.$root.find('#LinkedId').asNumber()
                                    : parseInt(
                                        me.$root
                                            .find('.supplier-ac')
                                            .attr('data-id')
                                    );
                        }
                        me.getWorkOrdersForContactOrSupplier(
                            acArgs.id,
                            supplierContactId,
                            me.$root.find('#Charge_PropertyId').val()
                        );
                    }
                },
                onRemoved: function (id) {
                    if (me.$root.find('.contacts .row').length > 1) {
                        me.$root
                            .find('.contacts .row[data-id="' + id + '"]')
                            .remove();
                    }
                }
            });
        };

        this.setupTenancyAC = function ($e) {
            var $propertyId = 0;
            if (
                me.params.isWorkOrderCharge &&
                me.$root.find('#Charge_PropertyId').asNumber() > 0
            ) {
                $propertyId = me.$root.find('#Charge_PropertyId').asNumber();
                $e.on('focus', function () {
                    if ($e.val() === '') {
                        var options = $e.autocomplete('option');
                        $e.autocomplete({ minLength: 0 })
                            .autocomplete('search', '')
                            .autocomplete({ minLength: options.minLength });
                    }
                });
            }

            var tenancyIds = null;
            if (me.$root.find('#PropertyTenancyIdsJson').val() !== '') {
                tenancyIds = JSON.parse(
                    me.$root.find('#PropertyTenancyIdsJson').val()
                );
            }

            $e.autoCompleteEx({
                modelType: C.ModelType.Tenancy,
                search: {
                    ApplyFurtherFilteringtoIds: true,
                    PropertyId: $propertyId,
                    SearchOrder: {
                        By: C.SearchOrderBy.StartDate,
                        Type: C.SearchOrderType.Descending
                    }
                },
                placeholder: 'Search for Tenancy...',
                showRAF: me.$root.find('#PropertyTenancyIdsJson').val() !== '',
                ids: tenancyIds,
                onSelected: function (acArgs) {
                    var $row = acArgs.$e.closest('.row');
                    $row.attr('data-id', acArgs.id);
                    $row.find('input[data-id="tenancyId"]').val(acArgs.id);
                    var supplierContactId = me.$root
                        .find('#Charge_SupplierContactId')
                        .asNumber();
                    if (supplierContactId === 0) {
                        supplierContactId =
                            me.$root.find('#LinkedId').asNumber() > 0
                                ? me.$root.find('#LinkedId').asNumber()
                                : parseInt(
                                    me.$root
                                        .find('.supplier-ac')
                                        .attr('data-id')
                                );
                    }
                    me.getWorkOrdersForTenancyOrSupplier(
                        acArgs.id,
                        supplierContactId
                    );
                },
                onRemoved: function (id) {
                    if (me.$root.find('.contacts .row').length > 1) {
                        me.$root
                            .find('.contacts .row[data-id="' + id + '"]')
                            .remove();
                    }
                }
            });
        };

        this.setupTenantAC = function ($e) {
            var tenantsIds = []; // should be tenancy ids (the search is for tenancies, then contacts)
            if (me.$root.find('#PropertyTenancyIdsJson').val() !== '') {
                tenantsIds = JSON.parse(
                    me.$root.find('#PropertyTenancyIdsJson').val()
                );
            }
            var $tenant = me.$root.find('#Charge_TenantContactId');
            var $tenancy = me.$root.find('#Charge_TenancyId');
            var $propertyId = 0;
            if (
                me.params.isWorkOrderCharge &&
                me.$root.find('#Charge_PropertyId').asNumber() > 0
            ) {
                tenantsIds.length = 0;
                $propertyId = me.$root.find('#Charge_PropertyId').asNumber();
                $e.on('focus', function () {
                    if ($e.val() === '') {
                        var options = $e.autocomplete('option');
                        $e.autocomplete({ minLength: 0 })
                            .autocomplete('search', '')
                            .autocomplete({ minLength: options.minLength });
                    }
                });
            }
            $e.autoCompleteEx({
                modelType: C.ModelType.Tenant,
                search: {
                    CategoryIdList: [C.ContactCategory.Client],
                    ApplyFurtherFilteringtoIds: true,
                    FullQuery: true,
                    PropertyId: $propertyId,
                    ids: tenantsIds,
                    SearchOrder: {
                        By: C.SearchOrderBy.StartDate,
                        Type: C.SearchOrderType.Descending
                    }
                },
                allowCreate: false,
                includeContacts: true,
                includeUsers: false,
                showRAF: me.$root.find('#PropertyTenantsIdsJson').val() !== '',
                displayCompanyName: true,
                placeholder: 'Search for Tenant...',
                onSelected: function (args) {
                    if (!args.isSetupCallback) {
                        $tenant.val(args.id);
                        $tenancy.val(args.udf1);
                    }
                },
                onRemoved: function () {
                    $tenant.val(0);
                    $tenancy.val(0);
                }
            });
        };

        this.setupSupplierInfo = function () {
            me.$root.find('.records.contacts,.records.tenancy').hide();
            me.$root.find('.propertyBankAccounts').show();
            me.$root.find('#SupplierChargeTo').prepend(
                $('<option>', {
                    value: -1,
                    text: 'Select...'
                })
            );
            me.$root.find('#SupplierChargeTo').val(-1).trigger('change');

            setupSupplierDefaultChargeItem();
        };

        this.getPropertyBankAccounts = function (propertyId) {
            new gmgps.cloud.http(
                "editChargeHandler-getPropertyBankAccounts"
            ).ajax(
                {
                    args: {
                        propertyId: propertyId
                    },
                    complex: false,
                    dataType: 'json',
                    type: 'post',
                    url: '/Accounting/GetPropertyBankAccounts'
                },
                function (response) {
                    if (response.Data) {
                        me.$root.find('#Charge_AccountId option').remove();
                        me.$root
                            .find('#Charge_AccountId')
                            .html($(response.Data).html());
                        var selectedItem = me.$root
                            .find('#Charge_AccountId option:selected')
                            .val();
                        me.$root
                            .find('#Charge_AccountId')
                            .val(selectedItem)
                            .trigger('change');
                    }
                }
            );
        };

        this.getWorkOrdersForProperty = function (propertyId, supplierId) {
            if (me.params.isWorkOrderCharge) return;

            new gmgps.cloud.http(
                "editChargeHandler-getWorkOrdersForProperty"
            ).ajax(
                {
                    args: {
                        modelType: C.ModelType.Property,
                        propertyId: propertyId,
                        supplierId: supplierId
                    },
                    complex: false,
                    dataType: 'json',
                    type: 'post',
                    url: '/Accounting/GetUnAllocatedWorkOrdersForCharge'
                },
                function (response) {
                    if (response.Data) {
                        me.processWorkOrderListHtml(response.Data);
                    }
                }
            );
        };

        this.getWorkOrdersForContactOrSupplier = function (
            contactId,
            supplierId,
            propertyId
        ) {
            if (
                contactId === 0 ||
                contactId === supplierId ||
                me.params.isWorkOrderCharge
            ) {
                return;
            }
            new gmgps.cloud.http(
                "editChargeHandler-getWorkOrdersForContactOrSupplier"
            ).ajax(
                {
                    args: {
                        modelType: C.ModelType.Tenant,
                        tenantId: contactId,
                        supplierId: supplierId,
                        propertyId: propertyId
                    },
                    complex: false,
                    dataType: 'json',
                    type: 'post',
                    url: '/Accounting/GetUnAllocatedWorkOrdersForCharge'
                },
                function (response) {
                    if (response.Data) {
                        me.processWorkOrderListHtml(response.Data);
                    }
                }
            );
        };

        this.getWorkOrdersForTenancyOrSupplier = function (
            tenancyId,
            supplierId
        ) {
            if (tenancyId === 0 || me.params.isWorkOrderCharge) {
                return;
            }
            new gmgps.cloud.http(
                "editChargeHandler-getWorkOrdersForTenancyOrSupplier"
            ).ajax(
                {
                    args: {
                        modelType: C.ModelType.Tenancy,
                        tenancyId: tenancyId,
                        supplierId: supplierId
                    },
                    complex: false,
                    dataType: 'json',
                    type: 'post',
                    url: '/Accounting/GetUnAllocatedWorkOrdersForCharge'
                },
                function (response) {
                    if (response.Data) {
                        me.processWorkOrderListHtml(response.Data);
                    }
                }
            );
        };

        this.processWorkOrderListHtml = function (data) {
            var woSelect = me.$root.find('#Charge_Client_WorkOrderId');
            var selectedChild = woSelect.find(':selected');
            woSelect.children().remove();
            if (selectedChild.length > 0) {
                woSelect.append(selectedChild.outerHtml());
            } else {
                woSelect.append('<option>Select...</option>');
            }
            if (data.length > 0) {
                data.forEach(function (childElement) {
                    woSelect.append(
                        '<option ' +
                        (childElement.Key === woSelect.attr('dataval')
                            ? 'selected'
                            : '') +
                        ' value="' +
                        childElement.Key +
                        '">' +
                        childElement.Value +
                        '</option>'
                    );
                });
            }
            woSelect.trigger('change');
        };

        this.setUpInputMasks = function () {
            me.$root
                .find('.opt-inputmask-numeric.amount-input.any')
                .inputmask('currency', {
                    radixPoint: '.',
                    groupSeparator: ',',
                    digits: 2,
                    autoGroup: true,
                    prefix: me.currencySymbol,
                    rightAlign: false
                });

            me.$root
                .find('.opt-inputmask-numeric.amount-input.positive')
                .inputmask('currency', {
                    radixPoint: '.',
                    groupSeparator: ',',
                    digits: 2,
                    autoGroup: true,
                    prefix: me.currencySymbol,
                    rightAlign: false,
                    allowMinus: false,
                    min: 0
                });

            me.$root
                .find('.opt-inputmask-numeric.percentage')
                .inputmask('currency', {
                    suffix: '%',
                    prefix: '',
                    radixPoint: '.',
                    groupSeparator: ',',
                    digits: 2,
                    autoGroup: true,
                    rightAlign: false,
                    min: 0,
                    max: 100
                });

            me.$root
                .find('.opt-inputmask-numeric.percentage.positive')
                .inputmask('currency', {
                    suffix: '%',
                    prefix: '',
                    radixPoint: '.',
                    groupSeparator: ',',
                    digits: 2,
                    autoGroup: true,
                    rightAlign: false,
                    min: 0,
                    max: 100,
                    allowMinus: false
                });

            me.$root
                .find('.opt-inputmask-numeric.daysselection')
                .inputmask('currency', {
                    suffix: '',
                    prefix: '',
                    radixPoint: '',
                    groupSeparator: '',
                    digits: 0,
                    autoGroup: true,
                    rightAlign: false,
                    min: 0,
                    max: 365
                });
        };

        (this.setChargeFrequencyEnabled = function () {
            if (me.params.chargeUsageType !== C.ChargeToPostUsageType.Charge) {
                me.$root.find('.frequency-row').css('visibility', 'hidden');
            }
        }),
            (this.setUpOptions = function () {
                me.$root
                    .find('#Charge_TargetAccountId')
                    .val(me.params.groupBankAccountId);

                if (
                    me.params.chargeUsageType ===
                    C.ChargeToPostUsageType.RefundItem ||
                    me.params.chargeUsageType ===
                    C.ChargeToPostUsageType.OpeningBalanceCharge
                ) {
                    me.setOptionsTabVisibility(false);
                }
                if (
                    me.$root
                        .find('#Charge_Client_ExcludeFromArrears')
                        .prop('checked')
                ) {
                    me.$root
                        .find('#Charge_Client_ShowInArrearsAfter')
                        .prop('disabled', 'disabled');
                }

                if (me.$root.find('#Charge_TargetRoleType option').Count > 1) {
                    me.$root.find('.chargeitem-row').hide();
                }

                if (this.params.linkedTypeId === C.ModelType.Property) {
                    me.$root.find('.chargeitem-row').show();
                }
            });

        this.disableFormEntry = function () {
            me.$window
                .find('input[type=text], select, .action-button, .bgg-property')
                .addClass('disabled')
                .prop('disabled', 'disabled');
        };

        this.validateChargeFrequencyItemDate = function () {
            var frequencyId = me.$root.find('#Charge_FrequencyId').val();
            var itemDate = me.$root.find('#Charge_ItemDate').val();
            return new gmgps.cloud.http(
                "editChargeHandler-validateChargeFrequencyItemDate"
            ).ajax(
                {
                    args: {
                        chargeitemDate: itemDate,
                        chargeFrequency: frequencyId
                    },
                    complex: false,
                    dataType: 'json',
                    type: 'post',
                    url: '/Accounting/ValidateChargeFrequencyItemDate'
                },
                function () { },
                function () {
                    me.$root
                        .find('#Charge_ItemDate')
                        .validationEngine(
                            'showPrompt',
                            'Please enter a new date',
                            'x',
                            'bottomLeft',
                            true
                        );
                }
            );
        };

        me.setUpOptions();

        me.setChargeFrequencyEnabled();

        me.setUpInputMasks();

        me.setupSupplier(me.$root.find('#SupplierId'));

        me.setupPropertyAC(me.$root.find('.property-ac'));

        me.setupTenantAC(me.$root.find('.contact-ac'));

        me.setupTenancyAC(me.$root.find('.tenancy-ac'));

        me.setupContactAC(
            me.$root.find('.supplier-ac'),
            C.ContactCategory.Supplier
        );

        me.setupSupplierInfo();

        setUpSharedCharges();

        if (me.params.chargeId === 0) {
            charge_TargetRoleType_Changed.call(
                me.$root.find('#Charge_TargetRoleType')
            );
        }

        var fileUploadArgs = {
            $root: me.$root,
            fileNameField: me.$root.find('.files-panel'),
            uploadButton: me.$root.find('.add-pdf-button'),
            linkedId:
                me.params.chargeId > 0
                    ? me.params.chargeId
                    : 0 - Math.floor(Math.random() * 1000 + 1),
            linkedType: C.ModelType.Charge,
            branchId: parseInt(me.$root.find('#Charge_BranchId').val()),
            mediaIdField: me.$root.find('#Charge_Client_MediaId'),
            callback: null
        };

        if (!me.params.readOnly) {
            new gmgps.cloud.ui.controls.chargeFileUploader(fileUploadArgs);
        }

        if (me.params.readOnly) {
            me.disableFormEntry();
        }

        if (me.$root.find('.chargeFileUploader .file-panel').length > 0) {
            me.$root
                .find('.add-pdf-button')
                .prop('disabled', true)
                .css('visibility', 'hidden');
        }

        function setUpSharedCharges() {
            if (!me.isSharedChargeAllowed) {
                return;
            }
            view.sharedCharges = me.$root.find('.share-charge');
            view.isChargeShared = me.$root.find('#IsChargeShared');
            view.sharedChargeButton = $(
                '<div id="share-btn" class="btn bgg-property" style="min-width: 100px; float: left;">Share Charge...</div>'
            );
            view.buttons.prepend(view.sharedChargeButton);
            view.sharedChargeButton.on('click', toggleSharedCharges);
            toggleShareButtonDisplay();
        }

        function toggleSharedCharges() {
            var top = $(window).height() / 2 - me.$window.height() / 2;
            var left = $(window).width() / 2 - (me.sharedCharge ? 500 : 370);

            me.sharedCharge = !me.sharedCharge;
            view.sharedCharges.toggle();
            view.isChargeShared.val(me.sharedCharge);
            view.sharedChargeButton.html(
                me.sharedCharge ? 'Unshare Charge...' : 'Share Charge...'
            );

            me.$window.css({ top: top, left: left });

            if (me.sharedCharge) {
                me.distributeSharedCharge();
            }
        }

        function setupSupplierDefaultChargeItem() {
            var defaultChargeId = me.$root
                .find('#DefaultNominalChargeId')
                .asNumber();
            if (defaultChargeId > 0) {
                var $defaultChargeItem = me.$root.find(
                    '.vtabs-container .checklist input[value="' +
                    defaultChargeId +
                    '"]'
                );
                $defaultChargeItem.val(defaultChargeId);
                $defaultChargeItem.click();
                toggleSelect(true, true);
            }
        }

        function precision(value) {
            return new Decimal(value).toFixed(2);
        }

        function formatCurrency(value) {
            return $.inputmask.format(precision(value), {
                alias: 'currency',
                prefix: me.currencySymbol
            });
        }

        function updateTotals($rows) {
            var sumNet = 0,
                sumVat = 0;
            $rows = $rows || view.parties;
            $rows.each(function (i, v) {
                var $row = $(v),
                    net = $row.find('.netamount').asNumber(),
                    vat = $row.find('.vatamount').asNumber();

                sumNet += net;
                sumVat += vat;
            });

            view.sumNet.html(formatCurrency(sumNet));
            view.sumVat.html(formatCurrency(sumVat));
            view.sumTotal.html(total(sumNet, sumVat));
        }

        function validateSharedChargeValues() {
            function showInfo(msg) {
                showDialog({
                    type: 'info',
                    title: 'Shared charges are incorrect',
                    msg: msg,
                    buttons: {
                        'Re-Allocate': function () {
                            me.distributeSharedCharge();
                            $(this).dialog('close');
                        },
                        Close: function () {
                            $(this).dialog('close');
                        }
                    }
                });
            }

            if (me.sharedCharge) {
                if (
                    view.chargeTransactionNet.asNumber() !==
                    view.sumNet.asNumber()
                ) {
                    showInfo(
                        'The total Net amount for shared charges does not match the Net amount required'
                    );
                    return false;
                } else {
                    if (
                        view.chargeTransactionVat.asNumber() !==
                        view.sumVat.asNumber()
                    ) {
                        showInfo(
                            'The total VAT amount for shared charges does not match the VAT amount required'
                        );
                        return false;
                    }
                }
            }
            return true;
        }

        function total(net, vat) {
            return formatCurrency(net + vat);
        }

        function toggleSelect(reset, immediate) {
            var $sel = me.$root.find('.vtabs-selector');

            if (reset) {
                $sel.removeClass('on');
                me.$root
                    .find('.vtabs-content')
                    .hide(immediate ? undefined : 'fast');
            } else {
                $sel.toggleClass('on');
                me.$root.find('.vtabs-content').slideToggle('fast');
            }
        }

        function toggleShareButtonDisplay() {
            if (!me.isSharedChargeAllowed) {
                return;
            }
            if (
                view.chargeRoleType.asNumber() === C.EventPartyRoleType.Tenancy
            ) {
                view.sharedChargeButton.show();
            } else {
                view.sharedChargeButton.hide();
                if (me.sharedCharge) {
                    toggleSharedCharges();
                }
            }
        }

        function charge_TargetRoleType_Changed() {
            var $this = $(this);

            if ($this.val() === '') {
                me.resetNominalList(true);
            } else {
                var $option = $this.find(':selected');

                if ($option.length === 1) {
                    me.$root
                        .find('#Charge_ApplicantContactId')
                        .val($option.data('applicantcontactid'));
                    me.$root
                        .find('#Charge_LandlordContactId')
                        .val($option.data('landlordcontactid'));
                    me.$root
                        .find('#Charge_SupplierContactId')
                        .val($option.data('suppliercontactid'));
                    me.$root
                        .find('#Charge_TenantContactId')
                        .val($option.data('tenantcontactid'));
                    me.$root
                        .find('#Charge_TenancyId')
                        .val($option.data('tenancyid'));
                    me.$root
                        .find('#Charge_PropertyId')
                        .val($option.data('propertyid'));
                }

                var isLandlord =
                    $this.asNumber() === C.EventPartyRoleType.Landlord;
                var isSupplier =
                    $this.asNumber() === C.EventPartyRoleType.Supplier;

                var excludeSupplierFees = false;

                if (
                    isSupplier &&
                    (me.params.chargeUsageType ===
                        C.ChargeToPostUsageType.OpeningBalanceCharge ||
                        me.params.chargeUsageType ===
                        C.ChargeToPostUsageType.ArrearsCharge ||
                        me.params.chargeUsageType ===
                        C.ChargeToPostUsageType.RefundCharge ||
                        me.params.chargeUsageType ===
                        C.ChargeToPostUsageType.RefundItem)
                ) {
                    excludeSupplierFees = true;
                }

                if (
                    isLandlord &&
                    (me.params.chargeUsageType ===
                        C.ChargeToPostUsageType.RefundCharge ||
                        me.params.chargeUsageType ===
                        C.ChargeToPostUsageType.RefundItem)
                ) {
                    excludeSupplierFees = true;
                }

                me.updateNominalTypeList(
                    parseInt(me.$root.find('#Charge_BranchId').val()),
                    $this.val(),
                    isLandlord
                        ? me.$root.find('#Charge_LandlordContactId').asNumber()
                        : 0,
                    isSupplier,
                    excludeSupplierFees
                );

                toggleShareButtonDisplay();
            }

            if (
                me.params.chargeUsageType ===
                C.ChargeToPostUsageType.OpeningBalanceCharge ||
                me.params.chargeUsageType ===
                C.ChargeToPostUsageType.ArrearsCharge
            ) {
                if (
                    parseInt(me.$root.find('#Charge_TargetRoleType').val()) ===
                    C.EventPartyRoleType.Supplier
                ) {
                    me.$root.find('.charge-date-row').css('margin-top', '33px');
                }
            }
        }

        function checkNegativePermitted() {
            var errorMsg;

            view.chargeTransactionNet.validationEngine('hide');
            if (
                (view.chargeRoleType.asNumber() !==
                    C.EventPartyRoleType.Property &&
                    C.AccountsNominalType.Expenses ===
                    view.chargeNominalType.asNumber()) ||
                me.params.chargeUsageType ===
                C.ChargeToPostUsageType.RefundCharge ||
                me.params.chargeUsageType === C.ChargeToPostUsageType.RefundItem
            ) {
                if (view.chargeTransactionNet.asNumber() < 0) {
                    if (
                        view.chargeNominalType.asNumber() ===
                        C.AccountsNominalType.Expenses
                    ) {
                        errorMsg =
                            'Negative values are not allowed for expenses';
                    } else {
                        errorMsg = 'Negative values are not allowed';
                    }
                    view.chargeTransactionNet.validationEngine(
                        'showPrompt',
                        errorMsg,
                        'x',
                        'topLeft',
                        true
                    );

                    return false;
                }
            }
            return true;
        }
    },

    show: function () {
        var me = this;

        var action = me.chargeId === 0 ? 'AddCharge' : 'EditCharge';

        new gmgps.cloud.ui.controls.window({
            title: me.title,
            windowId: me.windowId,
            controller: me.controller,
            url: 'Accounting/' + action,
            urlArgs: {
                linkedTypeId: me.linkedTypeId,
                linkedId: me.linkedId,
                usageType: me.chargeUsageType,
                chargeId: me.chargeId,
                isFromWorksOrder: me.isWorkOrderCharge
            },
            data: me,
            post: true,
            complex: true,
            nopadding: true,
            draggable: true,
            modal: true,
            actionButton: 'OK',
            cancelButton: 'Cancel',
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
            postActionCallback: function () {
                me.onComplete(me);
            }
        });
    }
};
