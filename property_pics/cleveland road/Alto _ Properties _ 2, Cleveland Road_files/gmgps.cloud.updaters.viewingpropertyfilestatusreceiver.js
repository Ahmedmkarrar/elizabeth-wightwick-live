'use strict';
gmgps.cloud.updaters.ViewingPropertyFileStatusReceiver = function (dom) {
    this.receive = function (message) {
        var messageId = message.Ids[0];

        var selectorForInviteButton =
            'div.btn.invite-to-propertyfile-btn[data-id="{0}"]'.format(
                messageId
            );
        var matchingInviteButtonElements = dom.getMatchingElements(
            selectorForInviteButton
        );

        _.forEach(matchingInviteButtonElements, function (button) {
            button.textContent = '';
            button.className = 'activity-status pending pf-tooltip fl mt2';
            button.setAttribute('data-tip', 'Pending');
        });

        var selectorForStatusText = 'div#pf-status-text[data-id="{0}"]'.format(
            messageId
        );
        var matchingStatusTextElements = dom.getMatchingElements(
            selectorForStatusText
        );

        _.forEach(matchingStatusTextElements, function (pfStatusText) {
            pfStatusText.textContent = 'Linked To PropertyFile';
        });
    };
};
