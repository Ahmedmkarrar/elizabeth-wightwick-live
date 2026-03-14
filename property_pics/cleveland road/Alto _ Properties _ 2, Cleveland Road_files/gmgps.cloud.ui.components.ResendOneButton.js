gmgps.cloud.ui.components.ResendOneButton = function (element, model) {
    var signingRequestId = model.signingRequestId;
    var signatoryId = model.signatoryId;

    this.api = new gmgps.cloud.services.EsignaturesCommandApi();

    this.resend = function () {
        this.api.resend(signingRequestId, signatoryId).then(function () {
            $.jGrowl(
                'Your request to resend the document to a chosen signatory has been queued.',
                { header: 'Electronic Signing', theme: 'growl-system' }
            );
        });
    };

    return this;
};
