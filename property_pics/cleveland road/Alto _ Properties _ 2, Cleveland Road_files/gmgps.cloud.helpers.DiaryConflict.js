gmgps.cloud.helpers.EventPartyCollection = function (conflictedParties) {
    var me = this;
    me.conflictedParties = conflictedParties;
    me.length = me.conflictedParties.length;
};

gmgps.cloud.helpers.EventPartyCollection.prototype = {
    getNames: function (linkedType) {
        var me = this;
        var items = me.get(linkedType);
        var names = [];
        items.map(function (party) {
            names.push(party.Name);
        });
        return names.join(', ');
    },

    contains: function (linkedType) {
        var me = this;
        var count = me.countOf(linkedType);
        return count > 0;
    },

    countOf: function (linkedType) {
        var me = this;
        var items = me.get(linkedType);
        return items.length;
    },

    get: function (linkedType) {
        var me = this;
        var items = me.conflictedParties.filter(function (val) {
            return val.LinkedType == linkedType;
        });
        return items;
    }
};

gmgps.cloud.helpers.DiaryConflict = function (conflictedParties) {
    var me = this;
    me.conflictedParties = new gmgps.cloud.helpers.EventPartyCollection(
        conflictedParties
    );
};

gmgps.cloud.helpers.DiaryConflict.prototype = {
    getConflictDescriptionHtml: function () {
        var me = this;

        var plural;
        var clashInfo = '';
        if (me.conflictedParties.contains(C.ModelType.User)) {
            var userNames = me.conflictedParties.getNames(C.ModelType.User);
            plural = me.conflictedParties.countOf(C.ModelType.User) != 1;
            clashInfo +=
                'Negotiator{0} <strong>{1}</strong> already ha{2} one or more appointments overlapping the selected time<br/>'.format(
                    plural ? 's' : '',
                    userNames,
                    plural ? 've' : 's'
                );
        }

        if (me.conflictedParties.contains(C.ModelType.Contact)) {
            var contactNames = me.conflictedParties.getNames(
                C.ModelType.Contact
            );
            plural = me.conflictedParties.countOf(C.ModelType.Contact) != 1;
            clashInfo +=
                'Contact{0} <strong>{1}</strong> already ha{2} one or more appointments overlapping the selected time<br/>'.format(
                    plural ? 's' : '',
                    contactNames,
                    plural ? 've' : 's'
                );
        }

        if (me.conflictedParties.contains(C.ModelType.Property)) {
            var propertyNames = me.conflictedParties.getNames(
                C.ModelType.Property
            );
            plural = me.conflictedParties.countOf(C.ModelType.Property) != 1;
            clashInfo +=
                'Propert{0} <strong>{1}</strong> {2} already the subject of one or more appointments overlapping the selected time<br/>'.format(
                    plural ? 'ies' : 'y',
                    propertyNames,
                    plural ? 'are' : 'is'
                );
        }

        return clashInfo;
    },

    resolve: function ($form, onContinue, onReject) {
        var me = this;

        if (me.conflictedParties.length > 0) {
            var clashInfo = me.getConflictDescriptionHtml();

            showDialog({
                type: 'question',
                title: 'Confirm Details',
                msg:
                    'There is a potential diary clash for this appointment:<br/><br/>' +
                    clashInfo +
                    '<br/>Would you still like to book the Appointment?',
                buttons: {
                    Yes: function () {
                        $(this).dialog('close');
                        onContinue();
                    },
                    No: function () {
                        $(this).dialog('close');
                        if (onReject) {
                            onReject();
                        }
                    }
                },
                zIndex: 200049
            });
        } else {
            onContinue();
        }
    }
};
