gmgps.cloud.ui.views.smsMessager = function (args) {
    var me = this;
    me.cfg = args;
    me.$root = args.$root;
    me.$window = null;

    me.init(args);

    return this;
};

gmgps.cloud.ui.views.smsMessager.prototype = {
    init: function (args) {
        var me = this;

        me.$root.find('.charCounter').charCounter({
            $src: me.$root.find('.sms-editor')
        });

        if (args.tab == null || args.tab != 'progression')
            me.$root.find('.updateLastContactedDateContainer').hide();
        me.$window = me.$root.closest('.window');
        me.$window
            .find('.bottom .buttons .action-button')
            .removeClass('grey')
            .addClass('bgg-red');
        me.checkConsents();
        me.$root.on('click', '.as-close', function () {
            $(this).closest('li').remove();
            me.checkConsents();
        });
    },

    action: function (callback) {
        var me = this;

        if (!me.validate()) return false;

        me.send(callback);
    },

    validate: function () {
        var me = this;

        var isValid = true;

        if (me.$root.find('.as-selections li').length == 0) {
            showInfo('There are no recipients for the SMS');
            return false;
        }

        var $editor = me.$root.find('.sms-editor');

        if ($editor.val().length == 0) {
            showInfo('Please supply some content for the SMS');
            return false;
        }
        return isValid;
    },

    cancel: function () {},

    send: function () {
        var me = this;

        var request = {
            Message: me.$root.find('.sms-editor').val(),
            OriginatingEventId: parseInt(
                me.$root.find('#OriginatingEventId').val()
            ),
            OriginatingEventCategory: me.$root
                .find('#OriginatingEventCategory')
                .val(),
            UpdateLastContactedDate: me.$root
                .find('#UpdateLastContactedDate')
                .is(':checked'),
            Recipients: []
        };

        me.$root.find('.as-selections li').each(function (i, v) {
            var $row = $(v);

            var recipient = {
                contactId: parseInt($row.attr('data-contactId')),
                recipientName: $row.attr('data-recipient-name'),
                phoneNumber: $row.attr('data-phonenumber'),
                branchId: $row.attr('data-branchid')
            };

            request.Recipients.push(recipient);
        });

        //Send messages.
        new gmgps.cloud.http("smsMessager-send").ajax(
            {
                args: request,
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/Comms/SendSMSMessages'
            },
            function () {
                $.jGrowl('SMS Request Generated', {
                    header: 'Message Queued For Delivery',
                    theme: 'growl-updater growl-system',
                    life: 2000
                });
            }
        );
    },

    checkConsents: function () {
        var me = this;
        var binding = new gmgps.cloud.ui.binding.ConsentMessageBinding(
            '.as-selections li[data-contactcategory="' +
                C.ContactCategory.Client +
                '"]',
            me.$root
        );
        binding.activate(['general-marketing', 'property-matching']);
    }
};
