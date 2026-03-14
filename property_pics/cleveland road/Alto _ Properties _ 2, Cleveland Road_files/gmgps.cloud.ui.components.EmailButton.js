gmgps.cloud.ui.components.EmailButton = function (element, model) {
    var recipientId = model.recipientId;
    var category = model.gaCategory;

    this.sendEmail = function () {
        gmgps.cloud.helpers.general.createEmail({
            contactIds: [recipientId],
            ContentType: C.DocumentContentType.Html,
            templateId: 0,
            showAssociateProperty: true,
            placeOnQueue: true,
            category: category
        });
    };

    return this;
};
