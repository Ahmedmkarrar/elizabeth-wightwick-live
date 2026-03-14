gmgps.cloud.ui.components.ProgressionButton = function (element, model) {
    var chainLinkId = model.chainLinkId;
    var eventId = model.eventId;
    var recordTypeId = model.recordTypeId;

    this.openProgression = function () {
        gmgps.cloud.helpers.property.gotoProgression({
            $row: $(
                '<span data-modelType="{0}"></span>'.format(
                    C.ModelType.ChainLink
                )
            ),
            id: chainLinkId,
            recordType: recordTypeId,
            secondaryId: eventId
        });
    };

    return this;
};
