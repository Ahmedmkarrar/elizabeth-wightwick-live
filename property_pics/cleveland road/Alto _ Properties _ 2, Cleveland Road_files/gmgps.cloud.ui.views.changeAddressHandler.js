gmgps.cloud.ui.views.changeAddressHandler = function (args) {
    var me = this;
    me.cfg = args;
    me.$root = args.$root;
    me.$window = null;
    me.status = args.data.status;
    me.propertyId = args.data.propertyId;
    me.init(args);

    return this;
};

gmgps.cloud.ui.views.changeAddressHandler.prototype = {
    init: function () {
        var me = this;
        return me;
    },

    updateAddresses: function (contactIdList, status, propertyId) {
        return new gmgps.cloud.http(
            "changeAddressHandler-updateAddresses"
        ).ajax({
            args: {
                contactIdList: contactIdList,
                propertyId: propertyId,
                status: status
            },
            complex: true,
            dataType: 'json',
            type: 'post',
            url: '/Contact/UpdateTenantsAddress'
        });
    },

    action: function () {
        var me = this;

        var contactIdList = [];

        $.each(me.$root.find('input.tenant:checked'), function () {
            var $input = $(this);
            contactIdList.push(parseInt($input.val()));
        });

        if (contactIdList.length > 0) {
            me.updateAddresses(contactIdList, me.status, me.propertyId).done(
                function (r) {
                    if (!r.Data) {
                        showInfo('Failed to update contact addresses');
                    }

                    if (me.cfg.callback) {
                        me.cfg.callback(r.Data, contactIdList);
                    }
                }
            );
        } else {
            if (me.cfg.callback) {
                me.cfg.callback(true, []);
            }
        }

        return true;
    }
};
