gmgps.cloud.updaters.followUp = {
    //Note: Unlike the home page which has a branch and user context, there is not required knowlege for these.
    //      All followups will faithfully display regardless of user/branch/rights/etc as the visible view is not filtered in the way that the home page is, with its user/branch selectors.

    processPushNotifications: function (pnList) {
        // Only a subset of FollowUp signalR updates are processed here for the FollowUp Dropdown (tasks) feature and dashboard

        pnList = gmgps.cloud.helpers.followUp.filterPnUpdateTypes(pnList);

        // build distinct list of LinkedType, LinkedId from followups

        // get distinct LinkedType/LinkedId combinations
        // and distinct PropertyId (not linked to a Property directly) combinations
        // and distinct ContactId (not linked to a Contact directly) combinations

        var combinedList = [];

        var addToCombinedList = function (linkedType, linkedId) {
            if (
                $.grep(combinedList, function (e) {
                    return (
                        linkedType === e.LinkedType && linkedId === e.LinkedId
                    );
                }).length === 0
            ) {
                combinedList.push({
                    LinkedType: linkedType,
                    LinkedId: linkedId
                });
            }
        };

        $.each(pnList, function (index, pn) {
            addToCombinedList(pn.Data.LinkedType, pn.Data.LinkedId);

            if (
                pn.Data.PropertyId &&
                pn.Data.LinkedType !== C.ModelType.Property
            ) {
                addToCombinedList(C.ModelType.Property, pn.Data.PropertyId);
            }
            if (
                pn.Data.ContactId &&
                pn.Data.LinkedType !== C.ModelType.Contact
            ) {
                addToCombinedList(C.ModelType.Contact, pn.Data.ContactId);
            }
        });

        $.each(combinedList, function (index, pn) {
            gmgps.cloud.updaters.followUp.processPushNotification(
                pn.LinkedType,
                pn.LinkedId
            );
        });
    },

    processPushNotification: function (linkedType, linkedId) {
        var $select = $(
            '.followUpDropdown[data-linkedtypeid="{0}"][data-linkedid="{1}"]:not(".off")'.format(
                linkedType,
                linkedId
            )
        );

        if ($select.length !== 0) {
            $.each($select.parent(), function () {
                $(this).data('followUpDropdown').processPushNotification({
                    LinkedType: linkedType,
                    LinkedId: linkedId
                });
            });
        }
    }
};
