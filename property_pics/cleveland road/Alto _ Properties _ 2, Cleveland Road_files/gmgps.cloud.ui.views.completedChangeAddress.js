gmgps.cloud.ui.views.completedChangeAddress = function (args) {
    var me = this;
    me.cfg = args;
    me.$root = args.$root;
    me.$window = null;
    me.init(args);
    me.closeMyWindow = args.closeMyWindow;
    me.http =
        args.http ||
        new gmgps.cloud.http("completedChangeAddress-completedChangeAddress");

    return this;
};

gmgps.cloud.ui.views.completedChangeAddress.prototype = {
    init: function () {
        var me = this;

        me.$root.find('.editAddress').on('click', function (e) {
            e.preventDefault();
            var $link = $(e.target);
            var $linkRow = $link.closest('.contactRow');
            var contactId = $linkRow.attr('data-id');

            new gmgps.cloud.ui.controls.window({
                title: 'Change Address',
                windowId: 'changeAddressModal',
                url: '/Contact/GetChangeAddress',
                urlArgs: {
                    id: contactId
                },
                post: true,
                controller: gmgps.cloud.ui.views.contactChangeAddress,
                width: 700,
                draggable: true,
                contentCanOverflow: true,
                modal: true,
                actionButton: 'Save',
                cancelButton: 'Cancel',
                onReady: function ($f, controller) {
                    controller.updateAddress = me.updateAddress;
                    controller.caller = me;
                },
                onAction: function () {},
                onCancel: function () {}
            });

            return false;
        });

        $.each(me.$root.find('.setAsSaleAddress'), function () {
            var $link = $(this);
            var currentProperty = $link
                .closest('.contactRow')
                .find('.existingAddressSummary')
                .val();
            if (
                currentProperty.indexOf(
                    me.$root.find('#propertyAddressSummary').val()
                ) > -1
            )
                $link.hide();
        });

        me.$root.find('.setAsSaleAddress').on('click', function (e) {
            e.preventDefault();
            var $link = $(e.target);
            var $linkRow = $link.closest('.contactRow');
            var $displayAddress = $linkRow.find('.applicantAddress');
            var newPropertyAddressSummary = me.$root
                .find('#propertyAddressSummary')
                .val();

            if ($link.text() == 'Undo') {
                var propertyAddressSummary = $linkRow
                    .find('.existingAddressSummary')
                    .val();
                $linkRow.find('.newAddress').val('');
                $link.closest('div').animate(
                    {
                        width: '140px'
                    },
                    500
                );
                $link.text('Set to Completed Property');
                $displayAddress.text(propertyAddressSummary);
            } else {
                var propertyAddress = me.$root.find('#propertyAddress').val();
                $linkRow.find('.newAddress').val(propertyAddress);
                $link.text('Undo');
                $link.closest('div').animate(
                    {
                        width: '70px'
                    },
                    500
                );
                $displayAddress.text(newPropertyAddressSummary);
            }
        });
    },

    save: function () {
        var me = this;

        $.each(me.$root.find('.contactRow'), function () {
            var $row = $(this);

            if ($row.find('.newAddress').val() != '') {
                var contactId = parseInt($row.attr('data-id'));
                me.setContactToAddress(
                    contactId,
                    JSON.parse($row.find('.newAddress').val())
                );
            }
        });
    },

    setContactToAddress: function (contactId, address, callback) {
        var me = this;

        var xhr = me.http.ajax(
            {
                args: {
                    contactId: contactId,
                    address: address
                },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/Contact/SetContactAddress'
            },
            function () {
                if (callback) callback();
            }
        );

        return xhr;
    },

    updateAddress: function (contactId, addressSummary, newAddress, me) {
        var $linkRow = me.$root.find(
            '.contactRow[data-id="' + contactId + '"]'
        );
        var $displayAddress;

        if ($linkRow.find('.applicantAddress').length > 0) {
            $displayAddress = $linkRow.find('.applicantAddress');
            $displayAddress.text(addressSummary);
            $linkRow.find('.newAddress').val(JSON.stringify(newAddress));
            me.$root
                .find('.setAsSaleAddress')
                .text('Set to Completed Property');
            me.$root.find('.setAsSaleAddress').closest('div').animate(
                {
                    width: '140px'
                },
                500
            );
        } else {
            $displayAddress = $linkRow.find('.vendorAddress');
            $displayAddress.text(addressSummary);
            $linkRow.find('.newAddress').val(JSON.stringify(newAddress));
        }
    }
};
