gmgps.cloud.helpers.docshelper = (function (window) {
    var DOCUMENT_WINDOWNAME = 'gpgmsdocumentswindow';
    var self = window;

    var _documentsToLoad = [];

    // create a callback function on this window that the documents child window can execute to find out which
    // documents to initially load

    window.documentsToLoad = function () {
        return _documentsToLoad;
    };

    window.emailSuccess = function () {
        $.jGrowl('E-mail Request Generated', {
            header: 'Message Queued For Delivery',
            theme: 'growl-updater growl-system',
            life: 2000
        });
    };

    // return true if we needed to create the new window, false if it already existed
    function createDocumentWindow(documents) {
        // establish if we need to create a new document window or re-use previously opened one
        if (
            self.docsWindow === undefined ||
            self.docsWindow == null ||
            self.docsWindow.closed === true
        ) {
            _documentsToLoad = documents;
            self.docsWindow = self.open(
                '/Document/',
                DOCUMENT_WINDOWNAME,
                'resizable=1, scrollbars=yes, width=948, height=700'
            );
            // return null on first invokation because the child window needs time to load
            // and it will use the documentsToLoad method to get the initial documents list when its document.ready()
            return null;
        } else {
            self.docsWindow.focus();
        }

        // subsequent invocations can use the function of the child window (signalToLoadDocument)
        // to request new documents.  This is important so that the signalR connectionId that is used
        // is the child document window, not this window.
        return self.docsWindow;
    }

    return {
        edit: function (documents) {
            var docsWindow = createDocumentWindow(documents);

            if (docsWindow !== null) {
                docsWindow.signalToLoadDocument(documents);
            }
        }
    };
})(window);
