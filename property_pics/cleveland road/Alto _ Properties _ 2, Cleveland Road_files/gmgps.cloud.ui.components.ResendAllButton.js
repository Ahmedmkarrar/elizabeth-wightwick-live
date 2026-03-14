gmgps.cloud.ui.components.ResendAllButton = function (element, model) {
    var signingRequestId = model.signingRequestId;

    this.api = new gmgps.cloud.services.EsignaturesCommandApi();

    this.resendAll = function () {
        this.api.resendAll(signingRequestId).then(function () {
            $.jGrowl(
                'Your request to resend the document to all signatories has been queued.',
                { header: 'Electronic Signing', theme: 'growl-system' }
            );
        });
    };

    return this;
};
