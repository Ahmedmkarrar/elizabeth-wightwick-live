gmgps.cloud.ui.views.editChargeFeeHandler = function (args) {
    var me = this;
    me.linkedId = args.linkedId;
    me.linkedTypeId = args.linkedTypeId;
    me.propertyId = args.propertyId;
    me.historyEventId = args.historyEventId;
    me.chargeId = args.chargeId;
    me.chargeType = args.chargeType;
    me.onComplete = args.onComplete;
    me.title = args.title;
    me.windowId = args.windowId;

    return me.init(args);
};

gmgps.cloud.ui.views.editChargeFeeHandler.prototype = {
    init: function () {
        var me = this;
        return me;
    },

    controller: function (args) {
        var me = this;

        me.$root = args.$root;

        me.params = args.data;

        me.$window = args.$window;

        var currencySymbol = me.$root.find('#CurrencySymbol').val();

        if (me.params.chargeId === 0) {
            me.$root
                .find('#Charge_FrequencyId')
                .val(C.Frequency.AdHoc)
                .trigger('change');
        }

        if (me.params.chargeId > 0) {
            me.$window
                .find('.bottom .buttons')
                .prepend(
                    '<div data-chargeid="{0}" class="btn delete-button bgg-property" style="min-width: 100px; float: left;">Delete Charge</div>'.format(
                        me.params.chargeId
                    )
                );
            me.$deleteButton = me.$window.find(
                '.bottom .buttons .delete-button'
            );
            me.$deleteButton.on('click', function () {
                showDialog({
                    type: 'question',
                    title: 'Delete Charge',
                    msg: 'Are you sure you want to remove this charge ?',
                    buttons: {
                        Yes: function () {
                            me.deleteCharge().done(function (r) {
                                if (r && r.Data) {
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
        }

        me.$root.find('select').customSelect();

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

        me.$root.on('change', '.vatRateList', function () {
            me.recalculateVAT();
        });

        me.$root.on(
            'change',
            '.date-picker.date-vat-rate',
            function (eventData) {
                var selectedDate = $(eventData.currentTarget).datepicker(
                    'getDate'
                );
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
            }
        );

        me.$root.find('.opt-inputmask-integer').inputmask('currency', {
            suffix: '',
            prefix: '',
            digits: 0,
            autoGroup: false,
            rightAlign: false,
            min: 0,
            max: 999
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
            .find('.opt-inputmask-numeric.amount-input')
            .inputmask('currency', {
                prefix: currencySymbol,
                suffix: '',
                radixPoint: '.',
                groupSeparator: ',',
                digits: 2,
                autoGroup: true,
                rightAlign: false,
                min: 0.0
            });

        me.$root.find('.calculateFees, .vatRateList').on('change', function () {
            me.calculateFeeAmounts();
            me.recalculateVAT();
        });

        me.$root.on('change', '#Charge_TransactionNet', function () {
            me.recalculateVAT();
        });
        me.$root.on('change', '#Charge_TransactionVat', function () {
            me.recalculateTotal();
        });

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

        this.calculateFeeAmounts = function () {
            var rentalCost = new Decimal(
                parseFloat(
                    me.$root.find('#Charge_LetFee_RentalAmount').asNumber()
                ) || 0.0
            );
            var rentalTerm =
                parseInt(
                    me.$root.find('#Charge_LetFee_RentalTermMonths').asNumber()
                ) || 0;
            var totalRental = new Decimal(rentalCost * rentalTerm);
            var commissionFee = new Decimal(
                parseFloat(me.$root.find('#Charge_LetFee_LetPercent').val()) ||
                    0
            );

            me.$root
                .find('#totalTermsRent')
                .text('{0}{1}'.format(currencySymbol, totalRental.toFixed(2)));

            var calculatedFee = new Decimal(
                totalRental.mul(commissionFee.div(100))
            );

            me.$root.find('#Charge_TransactionNet').val(calculatedFee);
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
                    prefix: currencySymbol
                })
            );
        };

        this.action = function (onComplete, $btn) {
            $btn.addClass('disabled');
            //Init validation engine.
            me.$root
                .addClass('opt-validate')
                .validationEngine({ scroll: false });

            var valid = me.$root.validationEngine('validate');

            if (valid) {
                if (me.$root.find('#Charge_AccountId').asNumber() === -1) {
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
            }

            if (valid) {
                this.updateCharge(me.$root).done(function (r) {
                    if (r && r.Data) {
                        me.chargeId = r.Data.Id;
                        me.$root.find('#Charge_Id').val(me.chargeId);
                        onComplete(false);
                        return true;
                    } else {
                        $btn.removeClass('disabled');
                    }
                });
            } else {
                $btn.removeClass('disabled');
            }

            return false;
        };

        this.deleteCharge = function () {
            return new gmgps.cloud.http(
                "editChargeFeeHandler-deleteCharge"
            ).ajax({
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
            return new gmgps.cloud.http(
                "editChargeFeeHandler-updateCharge"
            ).ajax({
                args: {
                    model: createForm($f).serializeObject()
                },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/Accounting/UpdateCharge'
            });
        };

        // force recalc when new fee being shown
        if (parseInt(me.$root.find('#Charge_Id').val()) === 0) {
            var selectedVATRateId = me.$root.find('#DefaultVATRateId').val();
            me.$root
                .find('#Charge_VATRateId')
                .val(selectedVATRateId)
                .trigger('change');
        }
    },

    show: function () {
        var me = this;

        var action = me.chargeId === 0 ? 'AddChargeFee' : 'EditChargeFee';

        new gmgps.cloud.ui.controls.window({
            title: me.title,
            windowId: me.windowId,
            controller: me.controller,
            url: 'Accounting/' + action,
            urlArgs: {
                linkedTypeId: me.linkedTypeId,
                linkedId: me.linkedId,
                chargeId: me.chargeId
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
                me.onComplete ||
                function () {
                    return false;
                },
            postActionCallback: function () {
                me.onComplete();
            }
        });
    }
};
