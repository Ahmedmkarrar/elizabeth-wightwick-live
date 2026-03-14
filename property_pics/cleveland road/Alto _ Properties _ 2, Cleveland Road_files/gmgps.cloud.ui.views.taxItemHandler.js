gmgps.cloud.ui.views.contact.taxItemHandler = function (args) {
    var me = this;
    me.id = args.id;

    me.$root = args.$root;
    me.setDirty = args.dirtyHandler;
    me.init();

    return me;
};

gmgps.cloud.ui.views.contact.taxItemHandler.prototype = {
    init: function () {
        var me = this;

        me.$root.off();

        me.$root
            .find('.opt-inputmask-numeric.amount-input')
            .inputmask('currency', {
                radixPoint: '.',
                groupSeparator: ',',
                digits: 2,
                autoGroup: true,
                prefix: '£',
                rightAlign: false
            });

        me.$root
            .find('.opt-inputmask-numeric.percent-input')
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

        me.$root.on('click', '.add-exemption:not(.disabled)', function () {
            me.getTaxExemptionDialog({
                settings: {
                    contactId: me.id,
                    exemptionId: 0,
                    onComplete: function (complete) {
                        if (complete) {
                            me.refreshList();
                        }
                    }
                }
            });
        });

        me.$root.on('click', '.exemption-list .body table tr', function () {
            me.getTaxExemptionDialog({
                settings: {
                    contactId: me.id,
                    exemptionId: $(this).attr('data-id'),
                    onComplete: function (complete) {
                        if (complete) {
                            me.refreshList();
                        }
                    }
                }
            });
        });

        me.$root.on('change', '#Contact_Landlord_VATStatus', function (e) {
            var $this = $(this);

            if (parseInt($this.val()) !== C.VATStatus.Yes) {
                CheckLandlordOutstandingCharges().then(function (
                    hasOutstandingCharges
                ) {
                    if (hasOutstandingCharges) {
                        $(e.currentTarget)
                            .val(C.VATStatus.Yes)
                            .trigger('prog-change');

                        showInfo(
                            "There are landlord income charges to be raised with VAT. Please remove VAT from these charges before updating the landlord's VAT registration status."
                        );
                    } else {
                        me.$root.find('.row.vatno').hide();
                        me.setDirty(true, e);
                    }
                });
            } else {
                me.$root.find('.vatno').show();
                me.setDirty(true, e);
            }
        });

        function CheckLandlordOutstandingCharges() {
            var deferred = $.Deferred();

            new gmgps.cloud.http("taxItemHandler-init").ajax(
                {
                    args: {
                        contactId: me.id
                    },
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: '/Accounting/ValidateTaxStatusChange'
                },
                function (response) {
                    deferred.resolve(response.Data);
                },
                function () {
                    deferred.resolve(false);
                }
            );

            return deferred;
        }

        return me;
    },

    refreshList: function () {
        var me = this;

        $.when(me.getExemptionsList()).done(function (html) {
            if (html) {
                me.$root.find('.exemption-list').empty().html($(html));
            }
        });
    },

    controller: function (args) {
        var me = this;

        var $root = args.$root;
        var $window = args.$window;
        var $callContext = args.data;

        me.closeWindowHandler = args.closeMyWindow;

        $root.find('.date-picker').each(function (i, v) {
            $(v).datepicker({
                numberOfMonths: 2,
                showButtonPanel: true,
                dateFormat: 'dd/mm/yy',
                defaultDate: 0
            });
        });

        $root.on('change', '#NoEndDate', function () {
            var $txt = $window.find('#OverseasEndDate');

            if ($(this).prop('checked') === true) {
                $txt.attr('disabled', 'disabled');
                $txt.val('');
            } else {
                $txt.removeAttr('disabled');
                $txt.val($txt.attr('data-original-value'));
            }
        });

        $root
            .find('.opt-inputmask-numeric.percent-input')
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

        $root.on('input', '#CertificateNumber', function () {
            var $taxInput = $root.find('#NRLTaxPercent');
            var $taxDisplay = $root.find('#NRLTaxPercentDisplay');

            if ($(this).val().length > 0) {
                $taxInput.val('0').prop('disabled', 'disabled');

                if ($taxDisplay.length) {
                    $taxDisplay.text('0%');
                }

            } else {
                var originalValueString = $taxInput.attr('data-value');

                $taxInput
                    .val(originalValueString)
                    .prop('disabled', '');

                if ($taxDisplay.length) {
                    // Apply formatting for the visible label
                    var formattedValue = parseFloat(originalValueString).toFixed(2);
                    $taxDisplay.text(formattedValue + '%');
                }
            }
        });

        $root.on('keyup', '#NRLTaxPercent', function () {
            $(this).attr('data-value', $(this).inputmask('unmaskedvalue'));
        });
        this.action = function (onComplete) {
            $.when($callContext.updateTaxExemption($root)).done(function (res) {
                if (res) {
                    onComplete(false);
                } else {
                    onComplete(true); //cancel closing the dialog
                }
            });

            return false;
        };
    },

    getExemptionsList: function () {
        var me = this;

        var deferred = $.Deferred();

        new gmgps.cloud.http("taxItemHandler-getExemptionsList").ajax(
            {
                args: {
                    contactId: me.id
                },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/Contact/GetTaxExemptions'
            },
            function (response) {
                deferred.resolve(response.Data);
            },
            function () {
                deferred.resolve(false);
            }
        );

        return deferred;
    },

    updateTaxExemption: function ($root) {
        var deferred = $.Deferred();

        new gmgps.cloud.http("taxItemHandler-updateTaxExemption").postForm(
            createForm($root, '/Contact/UpdateTaxExemption'),
            function (response) {
                deferred.resolve(response);
            },
            function () {
                deferred.resolve(false);
            }
        );

        return deferred;
    },

    getTaxExemptionDialog: function (args) {
        var me = this;

        new gmgps.cloud.ui.controls.window({
            title:
                args.settings.exemptionId == 0
                    ? 'Add Overseas Period'
                    : 'Edit Overseas Period',
            windowId: 'taxExemptionModal',
            controller: me.controller,
            data: me,
            url: '/Contact/GetEditTaxExemptionDialog',
            urlArgs: args.settings,
            post: true,
            complex: true,
            nopadding: true,
            width: 450,
            draggable: true,
            modal: true,
            actionButton: args.settings.exemptionId == 0 ? 'Add' : 'Update',
            cancelButton: 'Cancel',
            onAction: args.onComplete,
            sourceZIndex: 100
        });
    }
};
