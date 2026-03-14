((gmgps.cloud.ui.views.receiptImportsSummaryHandler = function (args) {
    var me = this;

    me.title = args.title;
    me.$content = args.$content;

    me.branchId = args.branchId;
    me.userId = args.userId;

    me.onComplete = args.onComplete;
    me.onCancel = args.onCancel;

    return me.init();
})),
    (gmgps.cloud.ui.views.receiptImportsSummaryHandler.prototype = {
        init: function () {
            var me = this;
            return me;
        },

        controller: function (args) {
            var me = this;

            me.params = args.data;
            me.$root = args.$root;
            me.$window = args.$window;

            me.$root = args.$root;
            me.$window = args.$window;

            me.$window
                .find('.top')
                .css('background-color', '#3399ff !important');
            me.$window.find('.middle').css('background-color', '#ffffff');

            me.$root.on('click', '.action-btn.manual', function () {
                me.loadReport();
            });

            this.action = function (onComplete) {
                onComplete();
            };
        },

        show: function () {
            var me = this;

            new gmgps.cloud.ui.controls.window({
                title: 'Receipt Import Post Results',
                windowId: 'receiptImportPostResults',
                controller: me.controller,
                data: me,
                $content: me.$content,
                post: false,
                complex: false,
                width: 510,
                draggable: true,
                modal: true,
                actionButton: 'Close',
                postActionCallback:
                    me.onComplete ||
                    function () {
                        return false;
                    },
                onCancel:
                    me.onCancel ||
                    function () {
                        return false;
                    }
            });
        }
    });
