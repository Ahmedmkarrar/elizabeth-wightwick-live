gmgps.cloud.ui.views.smsHomeMessager = function (args) {
    var me = this;
    me.cfg = args;
    me.$root = args.$root;
    me.$window = null;

    me.init(args);

    return this;
};

gmgps.cloud.ui.views.smsHomeMessager.prototype = {
    init: function (args) {
        var me = this;

        me.$root.find('.charCounter').charCounter({
            $src: me.$root.find('.sms-editor')
        });

        me.$root.find('select').customSelect();

        if (args.tab == null || args.tab != 'progression')
            me.$root.find('.updateLastContactedDateContainer').hide();
        me.$window = me.$root.closest('.window');
        me.$window
            .find('.bottom .buttons .action-button')
            .removeClass('grey')
            .addClass('bgg-property');

        me.$window.find('#contact-search').autoCompleteEx({
            modelType: C.ModelType.Contact,
            includeContacts: true,
            includeUsers: true,
            placeholder: 'Search Contacts or enter mobile number ...',
            search: {
                SearchPage: {
                    Index: 1,
                    Size: 100
                }
            },
            onAfterSelected: function () {
                me.checkConsents();
            },
            onRemoved: function () {
                me.checkConsents();
            }
        });

        me.$window.find('.raf').css('background', 'none');
        me.$window.find('.sms-dbox').css('border-bottom', 'none');

        me.$window.on('change', '#Paragraph', function () {
            var $this = $(this);

            me.$window.find('.sms-editor').val($this.val()).trigger('keyup');
        });
    },

    action: function (callback) {
        var me = this;

        var $contact = me.$root.find('#contact-search');

        var contactId = parseInt($contact.attr('data-id'));
        var contactBranchId = parseInt($contact.attr('data-branchId'));

        var input = $contact.val();

        if (!me.validate(contactId, input)) return false;

        if (contactId === 0) {
            me.sendSimple(input, callback);
        } else {
            var modelTypeId = $contact.attr('data-modeltype');

            me.contactHasMobileNumber(contactId, modelTypeId).done(function (
                response
            ) {
                if (response && response.Data) {
                    me.send(
                        contactId,
                        response.Data,
                        callback,
                        contactBranchId
                    );
                } else {
                    showInfo('Selected recipient has no mobile number');
                }
            });
        }
    },

    validate: function (contactId, input) {
        var me = this;

        if (contactId === 0 && input.length === 0) {
            showInfo('There are no recipients for the SMS');
            return false;
        }

        if (
            contactId === 0 &&
            !(input.startsWith('07') || input.startsWith('+'))
        ) {
            showInfo('Invalid mobile number specified');
            return false;
        }

        var $editor = me.$root.find('.sms-editor');

        if ($editor.val().length === 0) {
            showInfo('Please supply some content for the SMS');
            return false;
        }
        return true;
    },

    contactHasMobileNumber: function (id, modelTypeId) {
        return new gmgps.cloud.http(
            "smsHomeMessager-contactHasMobileNumber"
        ).ajax({
            args: {
                modelTypeId: modelTypeId,
                id: id
            },
            complex: true,
            dataType: 'json',
            type: 'post',
            url: 'SMS/GetContactOrUserMobileNumber'
        });
    },

    cancel: function () {},

    sendSimple: function (mobileNumber, callback) {
        var me = this;

        var message = me.$root.find('.sms-editor').val();

        new gmgps.cloud.http("smsHomeMessager-sendSimple").ajax(
            {
                args: {
                    recipientNumber: mobileNumber,
                    message: message
                },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/SMS/SendSMSSimple'
            },
            function (response) {
                if (response && response.Data) {
                    $.jGrowl('SMS Request Generated', {
                        header: 'Message Queued For Delivery',
                        theme: 'growl-updater growl-system',
                        life: 2000
                    });
                }

                if (callback) callback();
            }
        );
    },

    send: function (contactId, mobilePhoneNumber, callback, contactBranchId) {
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

        var recipient = {
            contactId: contactId,
            recipientName: me.$root
                .find('.auto-complete .selection .text')
                .text(),
            phoneNumber: mobilePhoneNumber,
            branchId: contactBranchId
        };

        request.Recipients.push(recipient);

        //Send messages.
        new gmgps.cloud.http("smsHomeMessager-send").ajax(
            {
                args: request,
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/Comms/SendSMSMessages'
            },
            function (response) {
                if (response && response.Data) {
                    $.jGrowl('SMS Request Generated', {
                        header: 'Message Queued For Delivery',
                        theme: 'growl-updater growl-system',
                        life: 2000
                    });
                }

                if (callback) callback();
            }
        );
    },

    checkConsents: function () {
        var me = this;

        var binding = new gmgps.cloud.ui.binding.ConsentMessageBinding(
            '#contact-search:not([data-value="0"])',
            me.$root
        );
        binding.activate(['general-marketing', 'property-matching']);
    }
};
