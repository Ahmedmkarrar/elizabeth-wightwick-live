gmgps.cloud.ui.views.editChargeCommission = function (args) {
    var me = this;

    me.linkedId = args.linkedId;
    me.linkedTypeId = args.linkedTypeId;
    me.propertyId = args.propertyId;
    me.historyEventId = args.historyEventId;
    me.chargeId = args.chargeId;
    me.chargeType = args.chargeType;
    me.forSupplier = args.forSupplier;
    me.onComplete = args.onComplete;

    me.title = args.title;
    me.windowId = args.windowId;

    return me.init(args);
};

gmgps.cloud.ui.views.editChargeCommission.prototype = {
    init: function () {
        var me = this;
        return me;
    },

    controller: function (args) {
        var me = this;

        me.$root = args.$root;

        me.params = args.data;

        me.$window = args.$window;

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

        if (me.params.forSupplier) {
            me.$root.find('.commission-title').html('Supplier Commission');
            me.$root.find('#Charge_ItemDescription').val('Commission');
            me.$root.find('.hide-supplier').hide();
        }

        me.$root.find('#Charge_ItemStartDate').datepicker({
            numberOfMonths: 2,
            showButtonPanel: true,
            dateFormat: 'dd/mm/yy',
            onSelect: function () {
                me.$root
                    .find('#Charge_ChargeUntil')
                    .datepicker(
                        'option',
                        'minDate',
                        me.$root
                            .find('#Charge_ItemStartDate')
                            .datepicker('getDate')
                    );
            }
        });

        me.$root.find('#Charge_ChargeUntil').datepicker({
            numberOfMonths: 2,
            showButtonPanel: true,
            dateFormat: 'dd/mm/yy',
            onSelect: function () {
                me.$root
                    .find('#Charge_ChargeUntil')
                    .datepicker(
                        'option',
                        'minDate',
                        me.$root
                            .find('#Charge_ItemStartDate')
                            .datepicker('getDate')
                    );
            }
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

        var $lastToggle = {};
        me.$root.find('.toggleswitch-input:checked').each(function (i, e) {
            $lastToggle[e.name] = $(e).siblings('.toggleswitch');
        });

        me.$root.find('.toggleswitch-input').on('change', function (e) {
            var $last = $lastToggle[e.target.name];
            if ($last) {
                $last.removeClass('on');
            }
            $lastToggle[e.target.name] = $(e.target)
                .siblings('.toggleswitch')
                .addClass('on');
        });

        me.$root.find('select').customSelect();

        (this.action = function (onComplete, $btn) {
            if ($btn.hasClass('disabled')) {
                return true;
            }

            $btn.addClass('disabled');
            //Init validation engine.
            me.$root
                .addClass('opt-validate')
                .validationEngine({ scroll: false });

            var valid = me.$root.validationEngine('validate');

            if (valid) {
                valid =
                    me.$root.find('#Charge_MgmtFee_MgmtPercent').asNumber() > 0;
                if (!valid) {
                    me.$root
                        .find('#Charge_MgmtFee_MgmtPercent')
                        .validationEngine(
                            'showPrompt',
                            'Please enter a commission percentage',
                            'x',
                            'topLeft',
                            true
                        );
                }
            }

            if (valid) {
                if (me.$root.find('#Charge_ChargeUntil').val() != '') {
                    var dateString = me.$root
                        .find('#Charge_ItemStartDate')
                        .val();
                    var splitDate = dateString.split('/');
                    var month = splitDate[1] - 1; //Javascript months are 0-11
                    var startDate = new Date(splitDate[2], month, splitDate[0]);

                    dateString = me.$root.find('#Charge_ChargeUntil').val();
                    splitDate = dateString.split('/');
                    month = splitDate[1] - 1; //Javascript months are 0-11
                    var endDate = new Date(splitDate[2], month, splitDate[0]);

                    valid = endDate.getTime() > startDate.getTime();
                    if (!valid) {
                        me.$root
                            .find('#Charge_ChargeUntil')
                            .validationEngine(
                                'showPrompt',
                                'The date must be greater than the start date',
                                'x',
                                'topLeft',
                                true
                            );
                    }
                }
            }

            //if (valid && me.params.forSupplier) {
            //        me.$root.find('#Charge_MgmtFee_NominalCodeChargeOnId').remove();
            //}

            if (valid) {
                this.updateCharge(me.$root).done(function (r) {
                    if (r && r.Data != null && r.ErrorData == null) {
                        me.chargeId = r.Data.Id;
                        var newCharge =
                            me.$root.find('#Charge_Id').val() === '0';

                        me.$root.find('#Charge_Id').val(me.chargeId);

                        //check if there are any existing rows in the database that could have commission applied, based on this new commission charge
                        if (!me.params.forSupplier) {
                            if (newCharge) {
                                me.getTotalQualifyingForCommissionCharge(
                                    me.$root
                                ).done(function (t) {
                                    if (t.Data > 0) {
                                        showDialog({
                                            type: 'question',
                                            title: 'Add commission charges',
                                            msg:
                                                'You have £' +
                                                t.Data.toFixed(2) +
                                                ' already receipted. Commission has not yet been applied to these items. Would you like to add commission now?',
                                            buttons: {
                                                Yes: function () {
                                                    me.raiseCommissionForExistingItems(
                                                        me.$root
                                                    ).done(function (r) {
                                                        if (!r.Data) {
                                                            showDialog({
                                                                type: 'warning',
                                                                title: 'Add commission charges',
                                                                msg: 'An error occurred while raising commission charges. Some data may not have been updated'
                                                            });
                                                        }
                                                    });

                                                    $(this).dialog('close');
                                                },
                                                No: function () {
                                                    $(this).dialog('close');
                                                }
                                            }
                                        });
                                    }
                                });
                            } else {
                                showDialog({
                                    type: 'info',
                                    title: 'Edit commission charges',
                                    msg: 'Changes will not be applied to existing receipts',
                                    buttons: {
                                        OK: function () {
                                            $(this).dialog('close');
                                        }
                                    }
                                });
                            }
                        }

                        onComplete(false);
                        return true;
                    }
                    return true;
                });
            } else {
                $btn.removeClass('disabled');
            }
            return false;
        }),
            (this.raiseCommissionForExistingItems = function ($f) {
                return new gmgps.cloud.http(
                    "editChargeCommission-raiseCommissionForExistingItems"
                ).ajax({
                    args: {
                        model: createForm($f).serializeObject()
                    },
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: '/Accounting/RaiseCommissionForExistingItems'
                });
            });

        this.getTotalQualifyingForCommissionCharge = function ($f) {
            return new gmgps.cloud.http(
                "editChargeCommission-getTotalQualifyingForCommissionCharge"
            ).ajax({
                args: {
                    model: createForm($f).serializeObject()
                },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/Accounting/GetTotalQualifyingForCommissionCharge'
            });
        };

        (this.deleteCharge = function () {
            return new gmgps.cloud.http(
                "editChargeCommission-deleteCharge"
            ).ajax({
                args: {
                    chargeId: parseInt(me.$root.find('#Charge_Id').val())
                },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/Accounting/DeleteCharge'
            });
        }),
            (this.updateCharge = function ($f) {
                return new gmgps.cloud.http(
                    "editChargeCommission-updateCharge"
                ).ajax({
                    args: {
                        model: createForm($f).serializeObject()
                    },
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: '/Accounting/UpdateCharge'
                });
            });
    },

    show: function () {
        var me = this;

        var action =
            me.chargeId === 0 ? 'AddChargeCommission' : 'EditChargeCommission';

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
