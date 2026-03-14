gmgps.cloud.helpers.emailTracking = {
    showSendGridEventsForEvent: function (eventId, eventType) {
        var url = '';

        switch (eventType) {
            case C.EventType.Communication:
                url =
                    '/emailtracking/getsendgrideventlistforcommunicationevent';
                break;
            case C.EventType.Marketing:
                url = '/emailtracking/getsendgrideventlistformarketingevent';
                break;
            default:
                return false;
        }

        new gmgps.cloud.ui.controls.window({
            title: 'Email Tracking',
            windowId: 'SendGridListModal',
            url: url,
            urlArgs: {
                eventId: eventId
            },
            post: true,
            data: null,
            controller: gmgps.cloud.ui.views.emailTracking,
            width: 700,
            draggable: true,
            modal: true,
            nopadding: true,
            actionButton: null,
            cancelButton: 'Close',
            onAction: function () {},
            onCancel: function () {}
        });

        return true;
    }
};
