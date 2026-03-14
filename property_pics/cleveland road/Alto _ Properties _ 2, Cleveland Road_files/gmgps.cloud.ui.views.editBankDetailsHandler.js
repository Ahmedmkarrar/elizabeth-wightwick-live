gmgps.cloud.ui.views.editBankDetailsHandler = function (args) {
    var me = this;

    me.bankAccountId = args.bankAccountId;
    me.contactId = args.contactId;

    return me;
};

gmgps.cloud.ui.views.editBankDetailsHandler.prototype = {
    controller: function (args) {
        var me = this;

        me.params = args.data;
        me.$root = args.$root;
        me.$window = args.$window;

        me.wasDefaultBankAccountId = me.$root
            .find('#Account_IsDefault')
            .prop('checked');

        me.$root.on('change', '#Account_IsDefault', function () {
            var $this = $(this);

            if ($this.prop('checked')) {
                me.existingDefaultBankAccount(
                    me.params.contactId,
                    parseInt(me.params.bankAccountId)
                ).done(function (r) {
                    if (r && r.Data) {
                        showDialog({
                            type: 'question',
                            title: 'Remove Default Bank ?',
                            msg: '<p>Click continue to confirm you want this bank account to become the new default instead of: </p><p>Bank: {0}, Sort Code: {1}, Acct Name: {2}, Acct No: {3}</p>'.format(
                                r.Data.Branch.BankName,
                                r.Data.Branch.FormattedSortCode,
                                r.Data.Account.AccountName,
                                r.Data.Account.AccountNumber
                            ),
                            buttons: {
                                Continue: function () {
                                    me.$root
                                        .find('#ReplacesDefaultBankAccountId')
                                        .val(r.Data.Account.BankAccountId);
                                    $(this).dialog('close');
                                },
                                Cancel: function () {
                                    $this
                                        .prop('checked', false)
                                        .trigger('prog-change');
                                    $(this).dialog('close');
                                }
                            }
                        });
                    }
                });
            } else {
                if (me.wasDefaultBankAccountId) {
                    showInfo(
                        'You cannot leave a client without a default bank account. Set the default bank account on another bank record instead'
                    );
                    $this.prop('checked', true).trigger('prog-change');
                    return false;
                }

                me.$root.find('#ReplacesDefaultBankAccountId').val(0);
            }
        });

        (this.existingDefaultBankAccount = function (
            contactId,
            thisBankAccountId
        ) {
            return new gmgps.cloud.http(
                "editBankDetailsHandler-existingDefaultBankAccount"
            ).ajax({
                args: {
                    contactId: contactId,
                    excludeBankAccountId: thisBankAccountId
                },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/Contact/ContactExistingDefaultBankAccount'
            });
        }),
            (this.saveBankDetails = function ($form) {
                return new gmgps.cloud.http(
                    "editBankDetailsHandler-saveBankDetails"
                ).ajax({
                    args: createForm($form).serializeObject(),
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: '/Contact/UpdateBankDetails'
                });
            }),
            (this.action = function (onComplete) {
                if (!me.validate()) return false;

                me.saveBankDetails(me.$root).done(function (r) {
                    if (r && r.Data) {
                        onComplete(false);
                    }
                });
            });

        this.validate = function () {
            //Init validation engine.
            me.$root
                .addClass('opt-validate')
                .validationEngine({ scroll: false });

            var valid = me.$root.validationEngine('validate');

            return valid;
        };
    },

    show: function () {
        var me = this;

        if (me.bankAccountId !== 0) {
            me.editBankAccount();
        } else {
            me.selectBankBranch(function (groupBankId, groupBankBranchId) {
                me.addBankAccount(groupBankId, groupBankBranchId);
            });
        }
    },

    editBankAccount: function () {
        var me = this;

        new gmgps.cloud.ui.controls.window({
            title: 'Manage Bank Account Details',
            windowId: 'editBankAccountModal',
            controller: me.controller,
            url: 'Contact/EditBankDetails',
            urlArgs: {
                bankAccountId: me.bankAccountId,
                contactId: me.contactId
            },
            data: me,
            post: true,
            complex: true,
            width: 750,
            draggable: true,
            modal: true,
            actionButton: 'Update',
            cancelButton: 'Cancel',
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

    addBankAccount: function (groupBankId, groupBankBranchId) {
        var me = this;

        new gmgps.cloud.ui.controls.window({
            title: 'Add Bank Account Details',
            windowId: 'addBankAccountModal',
            controller: me.controller,
            url: 'Contact/AddBankDetails',
            urlArgs: {
                groupBankBranchId: groupBankBranchId,
                contactId: me.contactId
            },
            data: me,
            post: true,
            complex: true,
            width: 750,
            draggable: true,
            modal: true,
            actionButton: 'Add',
            cancelButton: 'Cancel',
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

    deleteBankAccount: function () {
        var me = this;

        return new gmgps.cloud.http(
            "editBankDetailsHandler-deleteBankAccount"
        ).ajax({
            args: {
                bankAccountId: me.bankAccountId,
                contactId: me.contactId
            },
            complex: true,
            dataType: 'json',
            type: 'post',
            url: '/Contact/DeleteBankDetails'
        });
    },

    selectBankBranch: function (onComplete) {
        var branchSelector = new gmgps.cloud.ui.views.bankBranchSelector();

        branchSelector.show({
            callback: function (groupBankId, groupBankBranchId) {
                onComplete(groupBankId, groupBankBranchId);
            }
        });
    }
};
