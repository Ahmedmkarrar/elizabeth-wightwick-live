((gmgps.cloud.ui.views.receiptImportsDuplicateReferenceHandler = function (
    args
) {
    var me = this;

    me.title = args.title;
    me.$content = args.$content;

    me.branchId = args.branchId;
    me.userId = args.userId;
    me.amendReference = args.amendReference;

    me.onComplete = args.onComplete;
    me.onCancel = args.onCancel;

    return me.init();
})),
    (gmgps.cloud.ui.views.receiptImportsDuplicateReferenceHandler.prototype = {
        init: function () {
            var me = this;
            return me;
        },

        controller: function (args) {
            var me = this;
            var Namespace = '.ImportedReceiptsDuplicateHandler';

            me.params = args.data;
            me.$root = args.$root;
            me.$window = args.$window;

            me.$root = args.$root;
            me.$window = args.$window;

            me.amendReference = me.params.amendReference;

            me.$window
                .find('.top')
                .css('background-color', '#5d5d5d !important');
            me.$window.find('.middle').css('background-color', '#ffffff');

            me.$window
                .find('.bottom')
                .find('.action-button')
                .addClass('disabled')
                .addClass('bgg-property');

            me.$root.on('click' + Namespace, '.xyz', function () {});
        },

        show: function () {
            var me = this;

            new gmgps.cloud.ui.controls.window({
                title: 'Duplicate Reference',
                windowId: 'receiptImportDuplicateReference',
                controller: me.controller,
                data: me,
                $content: me.$content,
                amendReference: me.amendReference,
                post: false,
                complex: false,
                width: 600,
                draggable: true,
                modal: true,
                cancelButton: 'Close',
                onAction:
                    me.onComplete ||
                    function () {
                        return false;
                    },
                onCancel:
                    me.onCancel ||
                    function () {
                        return true;
                    }
            });
        }
    });
