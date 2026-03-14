gmgps.cloud.ui.views.duplicateEntryHandler = function () {
    var me = this;

    return me;
};
gmgps.cloud.ui.views.duplicateEntryHandler.prototype = {
    duplicateEntryExists: function (
        linkedId,
        linkedTypeId,
        balanceType,
        amount,
        onComplete
    ) {
        var me = this;

        me.duplicateCheck(linkedId, linkedTypeId, balanceType, amount).done(
            function (r) {
                if (r && r.Data) {
                    if (r.Data.length > 0) {
                        showDialog({
                            type: 'question',
                            title: 'Balances / Arrears Duplicate Check',
                            msg: 'A transaction for the same value has previously been posted. Do you wish to continue ?',
                            buttons: {
                                Yes: function () {
                                    onComplete(false); // dont cancel
                                    $(this).dialog('close');
                                },
                                No: function () {
                                    onComplete(true); // do cancel
                                    $(this).dialog('close');
                                }
                            }
                        });
                    } else {
                        onComplete(false); // no duplicates found
                    }
                }
            }
        );
    },

    duplicateCheck: function (linkedId, linkedTypeId, balanceType, amount) {
        return new gmgps.cloud.http(
            "duplicateEntryHandler-duplicateCheck"
        ).ajax({
            args: {
                linkedId: linkedId,
                linkedType: linkedTypeId,
                amount: amount,
                balanceType: balanceType
            },
            complex: true,
            dataType: 'json',
            type: 'post',
            url: '/Accounts/GetDuplicateItems'
        });
    }
};
