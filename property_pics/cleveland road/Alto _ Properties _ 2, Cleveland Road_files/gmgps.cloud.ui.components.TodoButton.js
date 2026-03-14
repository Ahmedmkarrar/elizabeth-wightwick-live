gmgps.cloud.ui.components.TodoButton = function (element, model) {
    var contactId = model.contactId;
    var propertyId = model.propertyId;
    var title = model.title;

    this.addTask = function () {
        gmgps.cloud.helpers.followUp.createFollowUp(
            C.FollowUpType.Todo,
            title,
            '',
            C.ModelType.User,
            shell.userId,
            shell.branchId,
            contactId,
            propertyId,
            function () {}
        );
    };

    return this;
};
