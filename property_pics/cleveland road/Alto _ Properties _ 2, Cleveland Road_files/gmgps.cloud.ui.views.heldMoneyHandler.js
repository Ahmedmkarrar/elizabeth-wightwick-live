gmgps.cloud.ui.views.heldMoneyHandler = function (args) {
    var me = this;

    me.id = args.id;
    me.groupBankAccountId = args.groupBankAccountId;
    me.defaultItemDate = args.defaultItemDate;
    me.linkedId = args.linkedId;
    me.linkedTypeId = args.linkedTypeId;
    me.onComplete = args.onComplete;
    me.init();

    return me;
};
gmgps.cloud.ui.views.heldMoneyHandler.prototype = {
    init: function () {
        var me = this;
        return me;
    },

    controller: function (args) {
        var me = this;

        me.$root = args.$root;
        me.params = args.data;
        me.$window = args.$window;

        if (me.params.id > 0) {
            var $buttons = me.$window.find('.bottom .buttons');

            var $deleteButton = $(
                '<div data-chargeid="{0}" class="btn delete-button bgg-property" style="min-width: 100px; float: left;">Delete Held Money</div>'.format(
                    me.params.id
                )
            );

            $deleteButton.on('click', function () {
                var accountId = parseInt(
                    me.$root.find('#HeldMoney_AccountId').val()
                );

                me.deleteHeldMoney(accountId, me.params.id).done(function (r) {
                    if (r && r.Data) {
                        me.params.onComplete(true);
                        me.$window.find('.cancel-button').trigger('click');
                    }
                });
            });

            $buttons.prepend($deleteButton);
        }

        if (me.params.id === 0) {
            me.$root
                .find('#HeldMoney_DefaultItemDate')
                .val(me.params.defaultItemDate);
        }

        me.$root.find('.opt-inputmask-numeric').inputmask('currency', {
            radixPoint: '.',
            groupSeparator: ',',
            digits: 2,
            autoGroup: true,
            prefix: me.currencySymbol || '£',
            rightAlign: false,
            allowMinus: false,
            min: 0
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

        (this.updateHeldMoney = function ($f) {
            return new gmgps.cloud.http(
                "heldMoneyHandler-updateHeldMoney"
            ).ajax({
                args: {
                    model: createForm($f).serializeObject()
                },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/Accounts/UpdateHeldMoney'
            });
        }),
            (this.deleteHeldMoney = function (accountId, id) {
                return new gmgps.cloud.http(
                    "heldMoneyHandler-deleteHeldMoney"
                ).ajax({
                    args: {
                        accountId: accountId,
                        id: id
                    },
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: '/Accounts/DeleteHeldMoney'
                });
            }),
            (this.action = function (onComplete) {
                var amount = me.$root.find('#HeldMoney_Amount').asNumber();

                if (amount === 0) {
                    me.$root
                        .find('#HeldMoney_Amount')
                        .validationEngine(
                            'showPrompt',
                            'Required',
                            'x',
                            'bottomLeft',
                            true
                        );
                    return false;
                }

                var description = me.$root.find('#HeldMoney_Description').val();

                if (description.length === 0) {
                    me.$root
                        .find('#HeldMoney_Description')
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
                    me.$root.find('#HeldMoney_LinkedId').val()
                );
                var linkedTypeId = parseInt(
                    me.$root.find('#HeldMoney_LinkedTypeId').val()
                );
                var value = new Decimal(
                    me.$root.find('#HeldMoney_Amount').asNumber()
                );

                var handler = new gmgps.cloud.ui.views.duplicateEntryHandler();

                handler.duplicateEntryExists(
                    linkedId,
                    linkedTypeId,
                    C.OpeningBalanceAuditRowType.HeldMoney,
                    value.toFixed(2),
                    function (cancelUpdate) {
                        // if dups and replied dont continue then dont add/change
                        if (cancelUpdate) return false;

                        me.updateHeldMoney(me.$root.clone()).done(function (r) {
                            if (r && r.Data) {
                                onComplete(false);
                                return true;
                            }
                        });
                    }
                );

                return false;
            });
    },

    show: function () {
        var me = this;

        var title = me.id === 0 ? 'Add Held Money' : 'Edit Held Money';

        new gmgps.cloud.ui.controls.window({
            title: title,
            windowId: 'heldMoneyModal',
            controller: me.controller,
            url: '/Accounts/EditHeldMoney',
            urlArgs: {
                groupBankAccountId: me.groupBankAccountId,
                id: me.id,
                linkedTypeId: me.linkedTypeId,
                linkedId: me.linkedId
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
