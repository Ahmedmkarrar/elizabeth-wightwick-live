gmgps.cloud.updaters.worksorderpreferences = {
    rebindSharingBehaviour: function (addedElement) {
        var icon = addedElement.find('.sharing-button');
        var id = parseInt(addedElement.data('id'));
        var isWorkOrderSharingConfigurationEnabled =
            addedElement.data('workorder-sharing-enabled') === 'True';
        var sharingButton =
            new gmgps.cloud.ui.controls.WorkOrderSharingPreferencesButton(
                icon,
                {
                    id: id,
                    isWorkOrderSharingConfigurationEnabled:
                        isWorkOrderSharingConfigurationEnabled
                }
            );
        sharingButton.bind();
    }
};
