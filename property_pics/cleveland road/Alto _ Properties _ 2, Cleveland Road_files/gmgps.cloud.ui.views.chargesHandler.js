gmgps.cloud.ui.views.chargesHandler = function (args) {
    var me = this;
    me.linkedId = args.linkedId;
    me.linkedTypeId = args.linkedTypeId;
    me.onComplete = args.onComplete;
    me.title = args.title;
    me.subject = args.subject;
    me.params = args.data;
    me.$root = args.$root;
    me.$window = args.$window;
    me.addChargeClicked = false;
    me.finaliseTenancyCharges = args.finaliseTenancyCharges;
    return me.init();
};

gmgps.cloud.ui.views.chargesHandler.prototype = {
    init: function () {
        var me = this;
        return me;
    },

    controller: function (args) {
        var me = this;
        var supplierFeeButton;
        me.params = args.data;
        me.$root = args.$root;
        me.$window = args.$window;
        me.$window
            .find('.bottom .buttons .cancel-button')
            .after(
                '<div class="btn raise-button bgg-property fr">Raise selected</div>'
            );

        me.raiseButton = me.$window.find('.bottom .buttons .raise-button');

        me.raiseButton.on('click', function () {
            var chargeIdList = $.map(
                me.$root.find(
                    '.txbody .proprow:visible .charge-checkbox:checked'
                ),
                function (v) {
                    return {
                        id: $(v).data('chargeid'),
                        versionNumber: $(v).data('chargeversionnumber')
                    };
                }
            );

            if (chargeIdList.length === 0) {
                showInfo('Please select one or more charges to raise');
                return false;
            }

            if (args.data.linkedTypeId !== C.ModelType.Property) {
                me.raiseCharges(chargeIdList);
            } else {
                me.raiseChargesForProperty(chargeIdList);
            }
        });

        me.$root.on('change', '.box-toggles .box-toggle', function () {
            me.params.filterSummaryItems(me.$root);
        });

        me.$root.on('click', '.add-charge', function () {
            $(this).prop('disabled', true);
            var $btn = $(this);
            me.showEditCharge(0);
            setTimeout(function () {
                unlockUIButton($btn);
            }, 1000);
        });

        me.$root.on('change', '#SelectAllNone', function () {
            me.$root
                .find(
                    '.proprow .tickbox:visible .tickbox-hidden:not(.exclude-tick)'
                )
                .prop('checked', $(this).prop('checked'))
                .trigger('prog-change');
        });

        me.$root.on('click', '.btn-blocked', function () {
            var $this = $(this);

            showDialog({
                type: 'question',
                title: 'Unblock this Charge ?',
                msg: 'Charges for this tenancy have been blocked. Do you want to unblock this charge ?',
                buttons: {
                    Yes: function () {
                        $this
                            .closest('.proprow ')
                            .find('.tickbox')
                            .removeClass('hidden');
                        $this.hide();
                        $(this).dialog('close');
                    },
                    No: function () {
                        $(this).dialog('close');
                    }
                }
            });
        });
        me.$root.on('click', '.amend-charge', function () {
            $(this).prop('disabled', true);
            var $btn = $(this);
            var chargeId = $(this).data('chargeid');
            var typeId = $(this).data('chargetype');
            var forsupplier = $(this).data('forsupplier');
            switch (typeId) {
                case C.ChargeToPostType.MgmtFee:
                    if (forsupplier === 'True') {
                        me.showEditCommission(chargeId, forsupplier);
                    } else {
                        me.showEditCommission(chargeId);
                    }
                    break;
                case C.ChargeToPostType.LettingFee:
                    me.showEditFee(chargeId);
                    break;
                default:
                    me.showEditCharge(chargeId);
                    break;
            }
            setTimeout(function () {
                unlockUIButton($btn);
            }, 1000);
        });

        me.$root.on('change', '#SelectedInvoiceRemarkId', function () {
            me.updateDefaultInvoiceSettings(
                $(this).val(),
                me.$root.find('#ShowAccountBalance').prop('checked')
            );
        });

        me.$root.on('change', '#ShowAccountBalance', function () {
            me.updateDefaultInvoiceSettings(
                me.$root.find('#SelectedInvoiceRemarkId').val(),
                $(this).prop('checked')
            );
        });

        me.$root.on('click', '.add-commission', function () {
            $(this).prop('disabled', true);
            var $btn = $(this);

            me.showEditCommission(0);

            setTimeout(function () {
                unlockUIButton($btn);
            }, 1000);
        });

        me.$root.on('click', '.add-fee', function () {
            $(this).prop('disabled', true);
            var $btn = $(this);

            me.showEditFee(0);

            setTimeout(function () {
                unlockUIButton($btn);
            }, 1000);
        });

        me.$root.on('click', '.add-supplierfee', function () {
            me.showEditSupplierFee(0);
        });

        this.updateDefaultInvoiceSettings = function (
            invoiceRemarkId,
            showAccountBalance
        ) {
            new gmgps.cloud.http(
                "chargesHandler-updateDefaultInvoiceSettings"
            ).ajax({
                args: {
                    modelType: me.params.linkedTypeId,
                    linkedId: me.params.linkedId,
                    invoiceRemarkId: invoiceRemarkId,
                    showAccountBalance: showAccountBalance
                },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/Contact/UpdateInvoiceDefaults'
            });
        };

        this.action = function (onComplete) {
            onComplete(false);
        };

        this.showEditCharge = function (chargeId) {
            new gmgps.cloud.ui.views.editChargeHandler({
                linkedTypeId: me.params.linkedTypeId,
                linkedId: me.params.linkedId,
                chargeId: chargeId,
                title:
                    chargeId === 0
                        ? 'Add Charge for ' + me.params.subject
                        : 'Edit Charge for  ' + me.params.subject,
                windowId: 'showEditCharge',
                onComplete: function () {
                    me.params.refreshList(
                        me.$root,
                        me.params.linkedTypeId,
                        me.params.linkedId
                    );
                }
            }).show();
        };

        this.showEditCommission = function (chargeId, forSupplier) {
            new gmgps.cloud.ui.views.editChargeCommission({
                linkedTypeId: me.params.linkedTypeId,
                linkedId: me.params.linkedId,
                chargeId: chargeId,
                forSupplier: forSupplier,
                title:
                    chargeId === 0
                        ? 'Add Commission for ' + me.params.subject
                        : 'Edit Commission for ' + me.params.subject,
                windowId: 'showEditCommission',
                onComplete: function () {
                    me.params.refreshList(
                        me.$root,
                        me.params.linkedTypeId,
                        me.params.linkedId
                    );
                }
            }).show();
        };

        this.showEditFee = function (chargeId) {
            new gmgps.cloud.ui.views.editChargeFeeHandler({
                linkedTypeId: me.params.linkedTypeId,
                linkedId: me.params.linkedId,
                chargeId: chargeId,
                title:
                    chargeId === 0
                        ? 'Add Letting Fee for ' + me.params.subject
                        : 'Edit Letting Fee for ' + me.params.subject,
                windowId: 'showEditFee',
                onComplete: function () {
                    me.params.refreshList(
                        me.$root,
                        me.params.linkedTypeId,
                        me.params.linkedId
                    );
                }
            }).show();
        };

        this.showEditSupplierFee = function (chargeId) {
            new gmgps.cloud.ui.views.editChargeCommission({
                linkedTypeId: me.params.linkedTypeId,
                linkedId: me.params.linkedId,
                chargeId: chargeId,
                forSupplier: true,
                title: me.params.title.replace('Charges', 'Add Supplier Fee'),
                windowId: 'showEditSupplierFee',
                onComplete: function () {
                    me.params.refreshList(
                        me.$root,
                        me.params.linkedTypeId,
                        me.params.linkedId
                    );
                }
            }).show();
        };

        this.raiseCharges = function (chargeIdList) {
            //window id for raise charges set in the handler already.
            new gmgps.cloud.ui.views.raiseChargesHandler({
                linkedTypeId: me.params.linkedTypeId,
                linkedId: me.params.linkedId,
                chargeIdList: chargeIdList,
                showAccountBalance: me.$root
                    .find('#ShowAccountBalance')
                    .prop('checked'),
                title: me.params.title.replace('Charges', 'Raise Charges'),
                onComplete: function () {
                    me.params.refreshList(
                        me.$root,
                        me.params.linkedTypeId,
                        me.params.linkedId
                    );
                }
            }).show();
        };

        this.raiseChargesForProperty = function (transactions) {
            new gmgps.cloud.http("chargesHandler-raiseChargesForProperty").ajax(
                {
                    args: {
                        transactions: transactions
                    },
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: '/Accounting/RaisePropertyCharges'
                },
                function (response) {
                    if (response.ErrorData == null) {
                        $.jGrowl(
                            'The charge(s) have been raised successfully.',
                            {
                                header: 'Charges raised',
                                theme: 'growl-system',
                                life: 3000
                            }
                        );
                        me.params.refreshList(
                            me.$root,
                            me.params.linkedTypeId,
                            me.params.linkedId
                        );
                    }
                }
            );
        };

        me.$root.find('select').customSelect();

        if (me.params.linkedTypeId === C.ModelType.Contact) {
            // eslint-disable-next-line no-unused-vars
            supplierFeeButton = me.$root.find('.add-supplierfee');
        }
    },

    show: function () {
        var me = this;
        new gmgps.cloud.ui.controls.window({
            title: me.title,
            windowId: 'ChargeSummary',
            controller: me.controller,
            url: 'Accounting/GetChargeSummary',
            urlArgs: {
                linkedId: me.linkedId,
                linkedTypeId: me.linkedTypeId,
                finaliseTenancyCharges: me.finaliseTenancyCharges
            },
            data: me,
            post: true,
            complex: true,
            width: 950,
            draggable: true,
            modal: true,
            cancelButton: 'Close',
            onAction:
                me.onComplete ||
                function () {
                    return false;
                },
            onCancel:
                me.onComplete ||
                function () {
                    return false;
                }
        });
    },

    filterSummaryItems: function ($root) {
        //ignore filtering when no toggles there to ... toggle!
        if ($root.find('.box-toggles').length === 0) return;

        var selectedRoleTypeIdList = $.map(
            $root.find('.box-toggles .box-toggle.on'),
            function (v) {
                return $(v).data('roletypeid');
            }
        );

        //if (selectedRoleTypeIdList.length === 0) return;

        $root.find('.txbody .proprow').each(function () {
            var $this = $(this);
            if (
                selectedRoleTypeIdList.indexOf($this.data('roletypeid')) !== -1
            ) {
                $this.show();
            } else {
                $this.hide();
            }
        });
    },

    refreshList: function ($root, linkedTypeId, linkedId) {
        var me = this;

        return me.getUpdatedSummary(linkedTypeId, linkedId).done(function (r) {
            $root.find('.charge-content').empty().html(r.Data);
            me.filterSummaryItems($root);
            return r;
        });
    },

    getUpdatedSummary: function (linkedTypeId, linkedId) {
        var me = this;
        return new gmgps.cloud.http("chargesHandler-getUpdatedSummary").ajax({
            args: {
                linkedTypeId: linkedTypeId,
                linkedId: linkedId,
                finaliseTenancyCharges: me.finaliseTenancyCharges
            },
            complex: true,
            dataType: 'json',
            type: 'post',
            url: '/Accounting/GetChargeSummaryContent'
        });
    }
};
