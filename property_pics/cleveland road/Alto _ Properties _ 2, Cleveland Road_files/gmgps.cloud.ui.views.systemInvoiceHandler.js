gmgps.cloud.ui.views.systemInvoiceHandler = function () {
    var me = this;

    me.init();

    return me;
};

gmgps.cloud.ui.views.systemInvoiceHandler.prototype = {
    init: function () {
        var me = this;

        return me;
    },

    raiseBeforeFinalise: function (tenancyId) {
        var me = this;

        me.initialChargesAdded(tenancyId).done(function (alreadyAdded) {
            if (alreadyAdded.Data) {
                showInfo('Initial invoice charges already raised');
                return;
            }

            $.when(me.confirmTenancyValues(tenancyId)).done(function (proceed) {
                if (!proceed) return;

                var after = function (replace) {
                    me.raiseInitialCharges(tenancyId, replace).done(function (
                        r
                    ) {
                        if (r && r.Data) {
                            me.invoicingCompleted(r.Data);
                        }
                    });
                };

                me.checkCommissionCharges(tenancyId, after);
            });
        });
    },

    confirmTenancyValues: function (tenancyId) {
        var $deferred = $.Deferred();

        gmgps.cloud.helpers.tenancy.editTenancy(
            tenancyId,
            true,
            false,
            true,
            function (success) {
                $deferred.resolve(success);
            }
        );

        return $deferred.promise();
    },

    raiseInitialCharges: function (tenancyId, replaceCommissionCharges) {
        return new gmgps.cloud.http(
            "systemInvoiceHandler-raiseInitialCharges"
        ).ajax({
            args: {
                tenancyId: tenancyId,
                replaceCommissionCharges: replaceCommissionCharges
            },
            complex: true,
            dataType: 'json',
            type: 'post',
            url: 'Accounting/CreateInitialInvoiceCharges'
        });
    },

    initialChargesAdded: function (tenancyId) {
        return new gmgps.cloud.http(
            "systemInvoiceHandler-initialChargesAdded"
        ).ajax({
            args: {
                tenancyId: tenancyId
            },
            complex: true,
            dataType: 'json',
            type: 'post',
            url: 'Accounting/InitialChargesAdded'
        });
    },

    commissionChargesExist: function (tenancyId) {
        return new gmgps.cloud.http(
            "systemInvoiceHandler-commissionChargesExist"
        ).ajax({
            args: {
                tenancyId: tenancyId
            },
            complex: true,
            dataType: 'json',
            type: 'post',
            url: 'Accounting/ActivePropertyCommissionExists'
        });
    },

    checkCommissionCharges: function (tenancyId, replaceResponse) {
        // can only do this check if user has permissions on 'charge' transaction
        var me = this;

        var transaction = shell.uiPermissions._permissions['charge'];

        if (transaction === undefined || transaction === 0) {
            replaceResponse(false);
            return;
        }

        me.commissionChargesExist(tenancyId).done(function (exist) {
            if (exist.Data === false) {
                replaceResponse(false);
            } else {
                showDialog({
                    type: 'question',
                    title: 'Active Rent Commission Charges',
                    msg: 'There is an existing rent commission charge within the tenancy term date period.  Replace this charge?',
                    buttons: {
                        Yes: function () {
                            $(this).dialog('close');
                            replaceResponse(true);
                        },
                        No: function () {
                            $(this).dialog('close');
                            replaceResponse(false);
                        }
                    }
                });
            }
        });
    },

    invoicingCompleted: function (model, onComplete) {
        var me = this;

        var transaction = shell.uiPermissions._permissions['charge'];

        var noChargePermission =
            transaction === undefined ||
            transaction < C.Permissions.UserAccessLevels.ReadWrite;

        if (noChargePermission) {
            if (
                model.ExistingCommissionChargesNotReplaced === true &&
                model.CommissionChargeRaised
            ) {
                ///growl that we didnt process commissions
                $.jGrowl(
                    'A new Commission charge was raised but a previously existing one was NOT replaced.',
                    {
                        header: 'Commission Charge Raised',
                        theme: 'growl-system',
                        sticky: true
                    }
                );
            }

            if (model.RaisedChargeCount > 0) {
                $.jGrowl(
                    '{0} System defined charges raised.'.format(
                        model.RaisedChargeCount
                    ),
                    { header: 'Charges Raised', theme: 'growl-system' }
                );
            }
            if (onComplete) onComplete();
            return;
        }

        var propertyChargesRaised = function () {
            if (model.PropertyChargesRaised) {
                $.when(
                    me.showChargesDialog(
                        C.ModelType.Property,
                        model.PropertyId,
                        'Charges For The Property',
                        'The Property'
                    )
                ).done(function () {
                    if (onComplete) onComplete();
                });
            } else {
                if (onComplete) onComplete();
            }
        };

        if (model.TenancyChargesRaised) {
            $.when(
                me.showChargesDialog(
                    C.ModelType.Tenancy,
                    model.TenancyId,
                    'Charges For This Tenancy',
                    'This Tenancy'
                )
            ).done(function () {
                propertyChargesRaised();
            });
        } else if (model.PropertyChargesRaised) {
            propertyChargesRaised();
        } else {
            if (onComplete) onComplete();
        }
    },

    showChargesDialog: function (linkedTypeId, linkedId, title, subject) {
        var $deferred = $.Deferred();

        new gmgps.cloud.ui.views.chargesHandler({
            linkedTypeId: linkedTypeId,
            linkedId: linkedId,
            title: title,
            subject: subject,
            finaliseTenancyCharges: true,
            onComplete: function () {
                $deferred.resolve();
            }
        }).show();

        return $deferred.promise();
    }
};
