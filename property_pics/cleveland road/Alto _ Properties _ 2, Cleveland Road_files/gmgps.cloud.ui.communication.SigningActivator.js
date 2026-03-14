gmgps.cloud.ui.communication.SigningActivator = function () {
    this.sign = function (documentId, clickEvent, onLettersCompleteCallback) {
        new gmgps.cloud.ui.controls.window({
            title: 'Send for Electronic Signatures',
            windowId: 'signingModal2',
            controller: gmgps.cloud.ui.views.SigningDialog,
            url: '/Signing/Dialog',
            post: true,
            urlArgs: { pendingDocumentId: documentId },
            complex: true,
            width: 800,
            draggable: true,
            modal: true,
            percentHigher: 3,
            actionButton: 'Send',
            cancelButton: 'Cancel',
            postActionCallback: onLettersCompleteCallback,

            // Add Pendo anchor to the signing window header for Pricing Information badge
            onReady: function ($window) {
                var $title = $window.find('.top .title');
                var currentText = $.trim($title.text());

                $title.empty().css({
                    'position': 'relative',
                    'display': 'flex',
                    'align-items': 'center',
                    'justify-content': 'center',
                    'overflow': 'visible'
                });

                $('<span/>', {
                    text: currentText,
                    style: 'z-index: 1;'
                }).appendTo($title);

                var $btn = $('<button/>', {
                    type: 'button',
                    'data-pendo': 'data-pendo-esign-pricing',
                    'class': 'pendo-esign-pricing-btn'
                }).appendTo($title);

                $('<i/>', { class: 'fa fa-info-circle pendo-esign', 'aria-hidden': 'true' }).appendTo($btn);
                $('<span/>', { text: 'Pricing information' }).appendTo($btn);
            }
        });
    };
};
