gmgps.cloud.ui.views.retentionHandler = function (args) {
    var me = this;

    me.id = args.id;
    me.groupBankAccountId = args.groupBankAccountId;
    me.contactId = args.contactId;
    me.defaultItemDate = args.defaultItemDate;

    me.onComplete = args.onComplete;
    me.init();

    return me;
};
gmgps.cloud.ui.views.retentionHandler.prototype = {
    init: function () {
        var me = this;
        return me;
    },

    controller: function (args) {
        var me = this;

        me.$root = args.$root;
        me.params = args.data;
        me.$window = args.$window;

        if (me.params.id === 0) {
            me.$root
                .find('#Retention_DefaultItemDate')
                .val(me.params.defaultItemDate);
        }

        if (me.params.id > 0) {
            var $buttons = me.$window.find('.bottom .buttons');

            var $deleteButton = $(
                '<div data-chargeid="{0}" class="btn delete-button bgg-property" style="min-width: 100px; float: left;">Delete Retention</div>'.format(
                    me.params.id
                )
            );

            $deleteButton.on('click', function () {
                var accountId = parseInt(
                    me.$root.find('#Retention_AccountId').val()
                );

                me.deleteRetention(accountId, me.params.id).done(function (r) {
                    if (r && r.Data) {
                        me.params.onComplete(true);
                        me.$window.find('.cancel-button').trigger('click');
                    }
                });
            });

            $buttons.prepend($deleteButton);
        }

        me.$root.find('select').customSelect();

        me.$root.find('.opt-inputmask-numeric').inputmask('currency', {
            radixPoint: '.',
            groupSeparator: ',',
            digits: 2,
            autoGroup: true,
            prefix: me.currencySymbol || '£',
            rightAlign: false
        });

        me.$root.find('.date-picker').each(function (i, v) {
            $(v).datepicker({
                numberOfMonths: 2,
                showButtonPanel: true,
                dateFormat: 'dd/mm/yy',
                minDate:
                    $(v).attr('data-datePickerMode') === 'future'
                        ? new Date()
                        : null
            });
        });

        (this.updateRetention = function ($f) {
            return new gmgps.cloud.http(
                "retentionHandler-updateRetention"
            ).ajax({
                args: {
                    model: createForm($f).serializeObject()
                },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/Accounts/updateRetention'
            });
        }),
            (this.deleteRetention = function (accountId, id) {
                return new gmgps.cloud.http(
                    "retentionHandler-deleteRetention"
                ).ajax({
                    args: {
                        accountId: accountId,
                        id: id
                    },
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: '/Accounts/DeleteRetention'
                });
            }),
            (this.action = function (onComplete) {
                var amount = me.$root.find('#Retention_Amount').asNumber();

                if (amount === 0) {
                    me.$root
                        .find('#Retention_Amount')
                        .validationEngine(
                            'showPrompt',
                            'Required',
                            'x',
                            'bottomLeft',
                            true
                        );
                    return false;
                }

                var linkedId = parseInt(
                    me.$root.find('#Retention_ContactId').val()
                );
                var linkedTypeId = C.ModelType.Contact;
                var value = new Decimal(
                    me.$root.find('#Retention_Amount').asNumber()
                );

                var handler = new gmgps.cloud.ui.views.duplicateEntryHandler();

                handler.duplicateEntryExists(
                    linkedId,
                    linkedTypeId,
                    C.OpeningBalanceAuditRowType.Retention,
                    value.toFixed(2),
                    function (cancelUpdate) {
                        // if dups and replied dont continue then dont add/change
                        if (cancelUpdate) return false;

                        me.updateRetention(me.$root.clone()).done(function (r) {
                            if (r && r.Data) {
                                onComplete(false);
                                return true;
                            }
                        });
                        return false;
                    }
                );

                return false;
            });
    },

    show: function () {
        var me = this;

        var title = me.id === 0 ? 'Add Retention' : 'Edit Retention';

        new gmgps.cloud.ui.controls.window({
            title: title,
            windowId: 'retentionModal',
            controller: me.controller,
            url: '/Accounts/EditRetention',
            urlArgs: {
                groupBankAccountId: me.groupBankAccountId,
                contactId: me.contactId,
                id: me.id
            },
            data: me,
            post: true,
            complex: true,
            draggable: true,
            modal: true,
            actionButton: 'OK',
            cancelButton: 'Cancel',
            onAction:
                me.onComplete ||
                function () {
                    return true;
                },
            onCancel: function () {
                return false;
            },
            postActionCallback: function () {
                me.onComplete(me);
            }
        });
    }
};
