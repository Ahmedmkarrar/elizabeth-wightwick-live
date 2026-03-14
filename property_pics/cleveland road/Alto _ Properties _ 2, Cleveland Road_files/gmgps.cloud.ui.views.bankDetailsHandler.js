gmgps.cloud.ui.views.bankDetailsHandler = function (args) {
    var me = this;

    me.contactId = args.contactId;

    me.$root = args.$root;

    me.init();

    return me;
};

gmgps.cloud.ui.views.bankDetailsHandler.prototype = {
    init: function () {
        var me = this;

        me.initEventHandlers();
        me.initControls();
    },

    initEventHandlers: function () {
        var me = this;

        me.$root.off();

        me.$root.on('click', '.row .header-section', function () {
            $(this).next('.detail-section').slideToggle('fast');
        });

        me.$root.on('click', '.row .delete-bankaccount', function (e) {
            e.stopPropagation();

            var $row = $(this).closest('.contact-row');

            var deleteDetails = function () {
                new gmgps.cloud.ui.views.editBankDetailsHandler({
                    contactId: me.contactId,
                    bankAccountId: $row.data('id')
                })
                    .deleteBankAccount()
                    .done(function (r) {
                        if (r && r.Data) {
                            //$row.remove();
                        }
                    });
            };

            var rowCount = $row.closest('.opt-u-parent').find('tr').length;
            var isDefault = $row
                .find('.detail-section #Account_IsDefault')
                .prop('checked');

            if (isDefault && rowCount > 1) {
                showInfo(
                    'You cannot remove the default contact bank account details. Set another account as default first'
                );
                return;
            }

            showDialog({
                type: 'question',
                title: 'Remove Bank Details',
                msg: 'Are you sure you would like to remove these Bank Details ?',
                buttons: {
                    Yes: function () {
                        deleteDetails();

                        $(this).dialog('close');
                    },
                    No: function () {
                        $(this).dialog('close');
                    }
                }
            });
        });

        me.$root.on('click', '.add-bankaccount:not(.disabled)', function () {
            me.editBankAccount(0);
        });

        me.$root.on(
            'click',
            '.row .edit-bankaccount:not(.disabled)',
            function (e) {
                e.stopPropagation();
                me.editBankAccount($(this).attr('data-bankaccountid'));
            }
        );
    },

    initControls: function () {},

    editBankAccount: function (bankAccountId) {
        var me = this;

        new gmgps.cloud.ui.views.editBankDetailsHandler({
            contactId: me.contactId,
            bankAccountId: bankAccountId
        }).show();
    }
};
