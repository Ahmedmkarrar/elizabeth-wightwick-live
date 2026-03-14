gmgps.cloud.ui.components.SmsButton = function (element, model) {
    var recipientId = model;

    this.sendSms = function () {
        gmgps.cloud.helpers.general.createSMS({
            contentPropertyIds: [],
            recipientContactIds: [recipientId],
            templateId: 1
        });
    };

    return this;
};
