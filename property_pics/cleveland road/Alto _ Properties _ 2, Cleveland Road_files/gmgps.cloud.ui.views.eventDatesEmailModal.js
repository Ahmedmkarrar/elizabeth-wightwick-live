gmgps.cloud.ui.views.eventDatesEmailModal = {
    getMailMessager: function (args) {
        var featureCheck = new alto.Feature({});

        //support for legacy usages of this method
        var data;
        if (!args.data) {
            data = args;
        } else {
            data = args.data;
        }

        featureCheck
            .IsEnabledForUser('EmailTemplatingBetaTester')
            .then((enabled) => {
                var payload = {
                    title: args.title ? args.title : 'Send Messages',
                    windowId: 'getMailMessagerModal',
                    controller: gmgps.cloud.ui.views.eventDatesEmail,
                    url: '/EventDatesEmail/GetEmail',
                    urlArgs: { settings: args.settings },
                    post: true,
                    complex: true,
                    width: 640,
                    draggable: true,
                    modal: true,
                    actionButton: 'Send',
                    cancelButton: 'Cancel',
                    percentHigher: 0,
                    category: data.category,
                    windowClass: null,
                    onReady: function ($window, $controller) {
                        $window.on('click', '.email-to .as-close', function () {
                            $(this).closest('li').remove();
                            $controller.checkConsents();
                        });
                    },
                    onAction:
                        args.onComplete ||
                        function () {
                            return false;
                        },
                    onCancel:
                        args.onComplete ||
                        function () {
                            return false;
                        }
                };

                if (enabled) {
                    payload.controller =
                        gmgps.cloud.ui.views.eventDatesEmailWithTemplate;
                    payload.url = '/EventDatesEmail/GetEmailWithTemplate';
                    payload.width = 1100;
                    payload.percentHigher = 20;
                    payload.windowClass = 'beeEditorWindow';
                    payload.onAction = function () {
                        return false;
                    };
                }

                new gmgps.cloud.ui.controls.window(payload);
            });
    }
};
