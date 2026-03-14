((function() {
    function TransferDepositHandler(args) {
        var me = this;
        me.def = 'ui.views.transferDepositHandler';
        me.cfg = args;
        me.$root = args.$root;
        me.title = args.title;
        me.id = args.linkedId;
        me.linkedTypeId = args.linkedTypeId;
        me.sourceAccountVal = -1;
    }

    $.extend(TransferDepositHandler.prototype, {
        show: initWindow
    });

    gmgps.cloud.ui.views.transferDepositHandler = TransferDepositHandler;

    function initWindow() {
        var me = this;
        var tenancyId = me.linkedTypeId == C.ModelType.Tenancy ? me.id : 0;
        var tenantContactId =
            me.linkedTypeId == C.ModelType.Contact ? me.id : 0;

        me.window = new gmgps.cloud.ui.controls.window({
            title: me.title,
            windowId: 'depositTransferModal',
            controller: ModalController,
            url: 'Accounting/TransferDeposit',
            urlArgs: {
                linkedTypeId: me.linkedTypeId,
                tenantContactId: tenantContactId,
                tenancyId: tenancyId
            },
            data: me,
            post: true,
            complex: true,
            width: 650,
            draggable: true,
            modal: true,
            actionButton: 'Update',
            cancelButton: 'Cancel',
            onAction:
                me.onComplete ||
                function () {
                    return false;
                },
            onCancel: function () {
                return false;
            }
        });
    }

    //#endregion

    //#region Controller

    function ModalController(args) {
        var me = this;
        me.params = args.data;
        me.$root = args.$root;
        me.$window = args.$window;
        me.currency = me.$root.find('#CurrencySymbol').val();
        me.initControls();

        return me;
    }

    $.extend(ModalController.prototype, {
        action: doAction,
        validate: validate,
        initControls: initControls
    });

    function initControls() {
        var me = this,
            $root = me.$root;
        $root.css('overflow', 'visible');
        $root.addClass('opt-validate').validationEngine({
            scroll: false,
            showArrow: true,
            promptPosition: 'topLeft',
            autoPositionUpdate: true
        });

        if (me.params.linkedTypeId === C.ModelType.Tenancy) {
            me.$root.find('.target-role-selector').hide();
        }

        me.$root.on('change', '#TargetRoles', function (e) {
            var $option = $(e.target.options[e.target.selectedIndex]);

            var linkedTypeId = $option.val();
            var tenantContactId = $option.attr('data-tenantContactId');
            var tenancyId = $option.attr('data-tenancyId');

            refreshData(linkedTypeId, tenantContactId, tenancyId).done(
                function (r) {
                    if (r && r.Data) {
                        me.$root
                            .find('.transferDepositContent')
                            .empty()
                            .html(r.Data);
                        setUpDatePicker();
                        setUpCurrencyFields();
                        setTransferAmountFromBankAccount();
                    }
                }
            );
        });

        $root.find('select').customSelect();

        setUpDatePicker();
        setUpCurrencyFields();

        $root.on('change', '.source-account', setTransferAmountFromBankAccount);
        $root.on(
            'change',
            '.destination-account',
            $.proxy(validateDestination, me)
        );
        $root.on('change, blur', '.transfer-amount', makePositive);
        setTransferAmountFromBankAccount();

        function setUpCurrencyFields() {
            $root
                .find('.opt-inputmask-numeric.amount-input')
                .inputmask('currency', {
                    radixPoint: '.',
                    groupSeparator: ',',
                    digits: 2,
                    autoGroup: true,
                    prefix: $root.find('#CurrencySymbol').val(),
                    rightAlign: false,
                    allowMinus: true
                });
        }

        function setUpDatePicker() {
            $root.find('.date-picker').each(function (i, v) {
                var $v = $(v);
                $v.datepicker({
                    numberOfMonths: 2,
                    showButtonPanel: true,
                    dateFormat: 'dd/mm/yy'
                }).val(moment().format('DD/MM/YYYY'));
            });
        }

        function setTransferAmountFromBankAccount(e) {
            // This handler is being fired simply by the fact of tabbing into the control, which is not the desired behaviour. So we first confirm that a change has occured.
            if (me.sourceAccountVal === me.$root.find('.source-account').val())
                return;
            var transferAmount = $root.find('.transfer-amount');
            var value =
                e &&
                e.currentTarget.options[
                    e.currentTarget.selectedIndex
                ].getAttribute('data-balance');
            if (value === undefined) {
                value = $root
                    .find('.source-account option:selected')
                    .data('balance');
            }

            if (value === undefined) {
                transferAmount.val('0.00');
            } else {
                transferAmount.val(value);
            }
            me.sourceAccountVal = me.$root.find('.source-account').val();
        }

        function makePositive(e) {
            var $el = $(e.currentTarget);
            if ($el.asNumber() < 0) {
                $el.val($el.asNumber() * -1);
            }
        }
    }

    function refreshData(linkedTypeId, tenantContactId, tenancyId) {
        return new gmgps.cloud.http('transferDepositHandler-refreshData').ajax({
            args: {
                linkedTypeId: linkedTypeId,
                tenantContactId: tenantContactId,
                tenancyId: tenancyId
            },
            complex: true,
            dataType: 'json',
            type: 'post',
            url: '/Accounting/TransferDepositContent'
        });
    }

    function doAction(onComplete, $btn) {
        var me, valid;
        if ($btn.hasClass('disabled')) {
            return false;
        }
        me = this;
        valid = me.validate();
        if (valid) {
            $btn.prop('disabled', true).addClass('disabled');
            transferDeposit(me.$root.find('.bankTransferForm'))
                .done(function (r) {
                    if (r && r.Data) {
                        onComplete(false);
                    }
                    return r;
                })
                .always(function () {
                    $btn.prop('disabled', false).removeClass('disabled');
                });
        }
    }

    function validateDestination() {
        var me = this;
        var destinationAccount = me.$root.find('.destination-account');
        var sourceAccount = me.$root.find('.source-account');

        if (destinationAccount.val() === sourceAccount.val()) {
            destinationAccount.validationEngine(
                'showPrompt',
                'Destination Bank Account cannot be the same as the Source Bank Account',
                null,
                null,
                true
            );

            return false;
        } else {
            var selectionTest = validateSelectNonZero(destinationAccount);
            if (selectionTest) {
                destinationAccount.validationEngine(
                    'showPrompt',
                    selectionTest
                );
            } else {
                destinationAccount.validationEngine('hide');
            }
        }
        return true;
    }

    function validate() {
        var me = this;
        var $target = me.$root.find('.transfer-amount');

        var sourceAccount = me.$root.find('.source-account');
        var sourceAccountOptions = sourceAccount.find('option:selected');
        var result = true;

        result = validateDestination.call(me);

        if ($target.asNumber() <= 0) {
            $target.validationEngine(
                'showPrompt',
                'Transfer Amount must be greater than zero',
                null,
                null,
                true
            );
            result = false;
        } else {
            if (
                $target.asNumber() >
                parseFloat(sourceAccountOptions.data('balance'))
            ) {
                $target.validationEngine(
                    'showPrompt',
                    'You are attempting to transfer an amount exceeding the deposit balance of ({0}) held in {1}. You cannot transfer more than {0} out of this account.'.format(
                        formatCurrency(
                            me.currency,
                            sourceAccountOptions.data('balance')
                        ),
                        sourceAccountOptions[0].text.substr(
                            0,
                            sourceAccountOptions[0].text.indexOf('(')
                        )
                    ),
                    null,
                    null,
                    true
                );

                result = false;
            } else {
                $target.validationEngine('hide');
            }
        }
        return result & me.$root.validationEngine('validate');
    }

    function transferDeposit($f) {
        return new gmgps.cloud.http('transferDepositHandler-transferDeposit').ajax({
            args: createForm($f).serializeObject(),
            complex: true,
            dataType: 'json',
            type: 'POST',
            url: '/Accounting/PostDepositTransfer'
        });
    }

    function formatCurrency(currency, value) {
        return $.inputmask.format(new Decimal(value).toFixed(2), {
            alias: 'currency',
            prefix: currency
        });
    }
}))();
