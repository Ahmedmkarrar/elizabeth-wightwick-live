'use strict';

gmgps.cloud.services.EsignaturesCommandApi = function (api) {
    var _api = api || new gmgps.cloud.services.ApiService();

    this.resendAll = function (requestId) {
        return _api.post('SignedDocument', 'ResendAll', requestId);
    };

    this.resend = function (requestId, signatoryId) {
        var args = {
            signingRequestId: requestId,
            signatoryId: signatoryId
        };

        return _api.post('SignedDocument', 'Resend', args);
    };

    this.void = function (requestId, reason) {
        var args = {
            signingRequestId: requestId,
            reason: reason
        };

        return _api.post('SignedDocument', 'Void', args);
    };

    this.agentSign = function (requestId, signatoryId) {
        var args = {
            signingRequestId: requestId,
            signatoryId: signatoryId
        };

        return _api.post('SignedDocument', 'AgentSign', args);
    };

    return this;
};
