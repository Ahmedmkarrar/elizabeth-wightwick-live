gmgps.cloud.ui.views.tools.exporter = function (args) {
    var me = this;

    me.$root = args.root;
    me.init();
    me.propertyPicker = null;

    return true;
};

gmgps.cloud.ui.views.tools.exporter.prototype = {
    init: function () {
        var me = this;

        me.$root.find('#ActionPane').hide();

        me.tabColumn = new gmgps.cloud.ui.controls.tabColumn({
            $root: me.$root.find('.tab-column'),
            entityType: 'export'
        });

        me.tabColumn.onTabClicked.handle(function ($item) {
            var id = $item.attr('data-id');
            me.changeColumnTab(id);
        });

        me.tabColumn.selectTab('rolling-screen', null, null, false);
    },

    changeColumnTab: function (id) {
        var me = this;

        me.$root.find('.export-layer').hide();
        me.$root.find('#ActionButton').off('click', '**');

        switch (id) {
            case 'rolling-screen':
                new gmgps.cloud.http("exporter-changeColumnTab").getView({
                    url: '/Property/GetPropertyPicker',
                    post: true,
                    onSuccess: function (response) {
                        me.$root
                            .find('.export-layer[data-id="rolling-screen"]')
                            .empty()
                            .html(response.Data)
                            .show();

                        me.propertyPicker =
                            new gmgps.cloud.ui.views.propertypicker({
                                $root: me.$root.find(
                                    '.export-layer[data-id="rolling-screen"]'
                                )
                            });

                        me.$root.find('#ActionPane').show();
                        me.$root.find('#ActionButton').val('Download');
                    },
                    complex: true
                });

                me.$root.find('#ActionButton').on('click', function () {
                    //The exporter uses the picker outside of the window, so action() needs to be called in order to produce the ids.
                    me.propertyPicker.action();
                    var propertyIds = me.propertyPicker.selectedIds;

                    if (propertyIds.length > 0) {
                        if (propertyIds.length > 100) {
                            propertyIds = propertyIds.slice(0, 100);
                        }

                        var $form = gmgps.cloud.utility.buildForm(
                            'Tools/RollingScreenQuickZip',
                            {
                                PropertyIdList: propertyIds,
                                AddPriceQualifier: me.$root
                                    .find('#AddPriceQualifier')
                                    .prop('checked')
                            }
                        );

                        $.fileDownload('/Tools/RollingScreenQuickZip', {
                            formHtml: $form.html(),
                            httpMethod: 'POST',
                            preparingMessageHtml:
                                'Export file is being prepared. Please wait. Note that there is a limit of 100 properties per export.',
                            failMessageHtml:
                                'An error has occurred preparing the export.'
                        });
                    }
                });

                break;
        }
    }
};
