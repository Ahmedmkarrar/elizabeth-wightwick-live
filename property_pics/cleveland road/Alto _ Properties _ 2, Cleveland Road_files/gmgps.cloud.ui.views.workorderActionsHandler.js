gmgps.cloud.ui.views.workorderActionsHandler = function (args) {
    var me = this;

    me.cfg = args;

    me.init(args);

    return this;
};
gmgps.cloud.ui.views.workorderActionsHandler.prototype = {
    init: function () {
        var me = this;
        return me;
    },

    updateStatus: function (onComplete) {
        var me = this;

        me.checkSupplierLiabilityInsuranceValid(me.cfg.contactId, function () {
            new gmgps.cloud.http("workorderActionsHandler-updateStatus")
                .ajax({
                    args: {
                        workOrderId: me.cfg.workOrderId,
                        newStatusId: me.cfg.newStatusId
                    },
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: 'Property/UpdateWorkOrderProgression'
                })
                .done(function (r) {
                    onComplete(r);
                });
        });
    },

    checkSupplierLiabilityInsuranceValid: function (contactId, onContinue) {
        var dateEventSearcher =
            new gmgps.cloud.ui.views.managementDatesSearcher({
                linkedTypeId: C.ModelType.Contact,
                linkedId: contactId
            });

        dateEventSearcher
            .find(C.ManagementDateType.PublicLiabilityInsurance)
            .done(function (d) {
                if (!d.Data) {
                    // no valid liability insurance found

                    showDialog({
                        type: 'warning',
                        title: 'No valid Public Liability Insurance',
                        msg: 'This supplier does not have an active Public Liability Insurance. Are you sure you would like to use this supplier ?',
                        buttons: {
                            Yes: function () {
                                onContinue();
                                $(this).dialog('close');
                            },
                            No: function () {
                                $(this).dialog('close');
                            }
                        }
                    });
                } else {
                    onContinue();
                }
            });
    }
};
