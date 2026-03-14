gmgps.cloud.ui.components.AgentSignButton = function (element, model) {
    var signingRequestId = model.signingRequestId;
    var signatoryId = model.signatoryId;

    this.api = new gmgps.cloud.services.EsignaturesCommandApi();

    this.agentSign = function () {
        this.api.agentSign(signingRequestId, signatoryId).then(function (result) {
            var modalHeight = $(window).height() - 100;
            var modalWidth = $(window).width() - 100;
            if (modalHeight < 300) { modalHeight = 300; } // Add Mininum Height
            if (modalWidth <= 1024 && modalHeight > 700) { modalHeight = 700; } // Constraint for smaller screens
            var iframeHeight = modalHeight - 34 - 40 - 30; // Removes the height of the top and bottom bars, plus the content padding
            this.modal = new gmgps.cloud.ui.controls.window({
                title: 'Sign document(s)',
                windowId: 'agent-e-sign-' + signingRequestId + '-' + signatoryId,
                $content: $('<iframe src="' + result + '" title="agent-e-sign" style="width:100%; height:' + iframeHeight + 'px;" />'),
                width: modalWidth,
                height: modalHeight,
                draggable: true,
                modal: true,
                cancelButton: 'Close',
                onBeforeDisplay: function ($window, callback) {
                    var closeModal = function (message) {
                        if (message.data == 'refetch') {
                            $('.cancel-button').click();
                            window.removeEventListener('message', closeModal);
                        }
                    }
                    window.addEventListener('message', closeModal);
                    callback();
                }
            });
        });
    };

    return this;
};
