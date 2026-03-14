gmgps.cloud.ui.views.contact.PreferenceCentreHandler = function (args) {
    var me = this;

    me.id = args.id;
    me.branchId = args.branchId;
    me.api = args.api || new gmgps.cloud.services.ApiService();
    me.$root = args.$root;
    me.contactDetails = args.contactDetails;
    me.setDirty = args.dirtyHandler;

    me.init();

    return me;
};

gmgps.cloud.ui.views.contact.PreferenceCentreHandler.prototype = {
    init: function () {
        var me = this;

        var updateLocalStatusSettings = function (
            container,
            statusElement,
            newStatus,
            dateActioned
        ) {
            statusElement.val(newStatus);
            container.attr('data-consent-status', newStatus);

            var dateMark = container.find('td.consent-given-date');
            dateMark.text(dateActioned);
        };

        me.$root.on('click', 'div.consent-button', function (e) {
            var button = $(e.target).closest('div.consent-button');
            var container = button.closest('tr');
            var statusElement = container.find('input.consent-status');

            var currentStatus = statusElement.val();
            var newStatus = button.attr('data-status');

            if (currentStatus === newStatus) {
                return;
            }

            container
                .find('.consent-buttons .action-button')
                .removeClass('on')
                .addClass('off');
            button.find('.action-button').removeClass('off').addClass('on');

            var today = moment().format('DD/MM/YYYY');
            updateLocalStatusSettings(
                container,
                statusElement,
                newStatus,
                today
            );

            me.setDirty(true, e);

            var consentFor = container.attr('data-consent-for');
            me.contactDetails.onConsentChanged(consentFor, newStatus);
        });
    }
};
