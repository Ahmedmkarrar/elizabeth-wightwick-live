gmgps.cloud.ui.views.help = function (args) {
    var me = this;
    me.cfg = args;
    me.$root = args.$root;

    //Set the default mode.
    me.mode = C.HelpMode.SystemInfo;

    me.onToolbarSetContext = new gmgps.cloud.common.event();
    me.init(args);

    return this;
};

gmgps.cloud.ui.views.help.prototype = {
    init: function () {
        var me = this;

        me.initControls();
        me.initHandlers();

        //Click the server-applied selection (one-time operation)
        setTimeout(function () {
            me.panel.selectDefaultItem();
        }, 100);

        me.setupToolbar();
    },

    initHandlers: function () {
        var me = this;

        me.panel.onPanelItemClicked.handle(function ($item) {
            me._panelItemClicked($item);
        });
        me.panel.onPanelItemFilterChanged.handle(function ($item) {
            me._onPanelItemFilterChanged($item);
        });

        //Product Documentation > Row > Click
        me.$root.on('click', '.help .row', function () {
            var $row = $(this);
            var documentId = parseInt($row.attr('data-id'));

            var url = '/ProductDocumentation/GetDocument/' + documentId;
            window.open(url, 'pdfb' + documentId);
        });
    },

    setupToolbar: function (status) {
        var me = this;
        var $tb = $('#toolbar .group[data-group="help"] .detail');

        var $b = $tb.find('div[data-id="actions"]');
        $b.show().find('.item').hide(); //hide all status items to begin with.

        if (status !== undefined) {
            switch (me.mode) {
                case C.HelpMode.SystemInfo:
                    switch (status) {
                        default:
                            break;
                    }
                    break;
            }
        }
    },

    initControls: function () {
        var me = this;

        //Panel
        me.panel = new gmgps.cloud.ui.controls.panel({
            $root: me.$root.find('.panel[data-id="help"]'),
            entityType: 'help',
            defaultLayer: 'list'
        });
    },

    _onPanelItemFilterChanged: function (item) {
        var me = this;

        switch (me.mode) {
            case C.HelpMode.LetterRack:
                me.letterRack.selectedStatusId = parseInt(
                    item.$root.find('#Status').val()
                );
                me.letterRack.selectedOwnerFilter = parseInt(
                    item.$root.find('#Show').val()
                );
                me.letterRackHandler({
                    OwnerFilter: me.letterRack.selectedOwnerFilter,
                    SearchOrder: {
                        By: me.$root.find('#SearchOrder_By').val(),
                        Type: me.$root.find('#SearchOrder_Type').val()
                    },
                    SearchFilterType: me.letterRack.selectedStatusId
                });
                break;
        }
    },

    persist: function () {},

    action: function () {},

    speedTestHandler: function () {
        var me = this;

        new gmgps.cloud.http("help-speedTestHandler").ajax(
            {
                args: null,
                dataType: 'json',
                type: 'post',
                complex: false,
                url: '/Help/GetSpeedTest'
            },
            function (response) {
                me.$root
                    .find('.content-container > .content[data-id="list"]')
                    .clear()
                    .html(response.Data);
            },
            function () {}
        );
    },

    _panelItemClicked: function (args) {
        args.$item.find('.spinner').hide();

        var me = this;
        me.mode = parseInt(args.$item.data('id'));

        me.$root
            .find('.content-container > .content[data-id="detail"]')
            .empty();

        switch (args.$item.data('type')) {
            case 'detail':
                break;

            case 'list':
                me.$listPanelItem = args.$item;

                switch (me.mode) {
                    case C.HelpMode.SystemInfo:
                        // initial search filter is set to Pending Letters
                        new gmgps.cloud.http("help-_panelItemClicked").getView({
                            url: '/System/GetSystemInfo',
                            post: false,
                            onSuccess: function (response) {
                                var $container = me.$root.find(
                                    '.content-container > .content[data-id="list"]'
                                );
                                $container.empty().html(response.Data).show();
                            }
                        });
                        break;

                    case C.HelpMode.SpeedTest:
                        me.speedTestHandler();
                        break;

                    case C.HelpMode.SupportContacts:
                        //
                        new gmgps.cloud.http("help-_panelItemClicked").getView({
                            url: '/Help/GetSupportContacts',
                            post: false,
                            onSuccess: function (response) {
                                var $container = me.$root.find(
                                    '.content-container > .content[data-id="list"]'
                                );
                                $container.empty().html(response.Data).show();
                            }
                        });
                        break;

                    case C.HelpMode.ProductManual:
                        //
                        new gmgps.cloud.http("help-_panelItemClicked").getView({
                            url: '/Help/GetProductDocumentation',
                            post: true,
                            onSuccess: function (response) {
                                var $container = me.$root.find(
                                    '.content-container > .content[data-id="list"]'
                                );
                                $container.empty().html(response.Data).show();
                            }
                        });
                        break;
                }

            // eslint-disable-next-line no-fallthrough
            default:
                var $container = me.$root.find(
                    '.content-container > .content[data-id="list"]'
                );
                $container.empty();
                break;
        }

        args.onComplete();
    }
};
