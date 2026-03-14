'use strict';

gmgps.cloud.ui.controls.WorkOrderSharingPreferencesButton = function (
    target,
    args
) {
    this.unbind = function () {
        target.off('click').on('click', function () {});
    };

    this.bind = function () {
        if (args.isWorkOrderSharingConfigurationEnabled) {
            target.off('click').on('click', function (e) {
                e.stopPropagation();

                var propertyId = 0;
                if (args.getPropertyId) {
                    propertyId = args.getPropertyId();
                }

                var sharingDialog =
                    new gmgps.cloud.ui.views.WorkOrderSharingDialog({
                        id: args.id,
                        propertyId: propertyId,
                        onSave: args.onSave,
                        onSuccess: args.onSuccess,
                        selectedTenancyHasChanged:
                            args.selectedTenancyHasChanged,
                        updatedModel: args.updatedModel
                    });
                sharingDialog.open();
            });
        } else {
            target.qtip({
                content:
                    '<p class="pb8">Please switch on the Maintenance Module to share a Works Order.</p><p>Go to Tools, PropertyFile.</p>',
                position: {
                    my: 'bottom middle',
                    at: 'top middle'
                },
                style: {
                    tip: true,
                    width: '240px',
                    classes: 'qtip-dark'
                }
            });
        }
    };

    return this;
};
