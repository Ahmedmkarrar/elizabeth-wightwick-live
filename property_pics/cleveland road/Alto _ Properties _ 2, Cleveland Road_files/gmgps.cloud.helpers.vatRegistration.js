gmgps.cloud.helpers.vatRegistration = function (args) {
    var me = this;
    me.init(args);
};

gmgps.cloud.helpers.vatRegistration.prototype = {
    init: function (args) {
        var me = this;

        me.currencySymbol = args.currencySymbol;
    },

    promptToRegisterLandlordVAT: function (tenancyId, onComplete) {
        var me = this;

        showDialog({
            type: 'info',
            title: 'Landlord(s) not registered for VAT.',
            msg: 'Landlord(s) are not VAT registered, you can only charge VAT on this item if they are registered. Would you like to update their VAT status to Registered ?',
            buttons: {
                Yes: function () {
                    var $this = $(this);

                    me.registerLandlordsAsVATRegistered(tenancyId).done(
                        function (r) {
                            if (r && r.Data) {
                                $this.dialog('close');
                                onComplete(true);
                            }
                        }
                    );
                },
                No: function () {
                    $(this).dialog('close');
                    onComplete(false);
                }
            }
        });
    },

    registerLandlordsAsVATRegistered: function (tenancyId) {
        return new gmgps.cloud.http(
            "vatRegistration-registerLandlordsAsVATRegistered"
        ).ajax({
            args: {
                tenancyId: tenancyId
            },
            complex: true,
            dataType: 'json',
            type: 'post',
            url: '/Accounting/RegisterLandlordsAsVATRegistered'
        });
    },

    areLandlordsVATRegistered: function (tenancyId) {
        return new gmgps.cloud.http(
            "vatRegistration-areLandlordsVATRegistered"
        ).ajax({
            args: {
                tenancyId: tenancyId
            },
            complex: true,
            dataType: 'json',
            type: 'post',
            url: '/Accounting/AreLandlordsVATRegistered'
        });
    }
};
