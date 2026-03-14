'use strict';
gmgps.cloud.updaters.WorksOrderSharingPreferencesReceiver = function (dom) {
    this.receive = function (message) {
        var messageId = message.Ids[0];
        var desiredButtonText =
            message.Data.State === 'Allowed' ? 'Shared' : 'Share';

        var selectorForButtonsOnList =
            '.opt-u[data-modeltype="{0}"][data-id="{1}"] .sharing-button'.format(
                C.ModelType.WorkOrder,
                messageId
            );
        var matchingListElementsIcons = dom.getMatchingElements(
            selectorForButtonsOnList
        );

        _.forEach(matchingListElementsIcons, function (icon) {
            icon.className =
                'sharing-button workorder-sharing-' +
                message.Data.State.toLowerCase();
        });

        var selectorForDialogButton =
            'div#sharing-button[data-workorder-id="{0}"]'.format(messageId);
        var matchingDialogButtonElements = dom.getMatchingElements(
            selectorForDialogButton
        );
        _.forEach(matchingDialogButtonElements, function (button) {
            button.className =
                'btn sharing-button workorder-sharing-' +
                message.Data.State.toLowerCase();
        });

        var buttonTextElements = dom.getMatchingElements(
            'span[id=workorder-sharing-text]'
        );
        _.forEach(buttonTextElements, function (buttonText) {
            buttonText.textContent = desiredButtonText;
        });
    };
};
