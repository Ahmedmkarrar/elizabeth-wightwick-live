gmgps.cloud.ui.views.previewvendorreport = function (args) {
    var me = this;

    me.$window = null;

    // args are only passed when this object is instantiated via the window.js as a controller
    if (args !== undefined) {
        me.$root = args.$root;
        me.init(args);
    }

    return true;
};

gmgps.cloud.ui.views.previewvendorreport.prototype = {
    init: function (args) {
        var me = this;

        if (args != null) {
            me.closeWindowHandler = args.closeMyWindow;
        }
    },

    show: function (args) {
        new gmgps.cloud.http("previewvendorreport-show").ajax(
            {
                args: args,
                dataType: 'json',
                complex: true,
                type: 'post',
                url: '/VendorReport/Preview'
            },
            function (response) {
                gmgps.cloud.helpers.general.openPublisher({
                    settings: {
                        cssOverrides: ['/content/styles/vendor-report.less'],
                        brandId: args.SelectedBrandId,
                        branchId: args.SelectedBranchId,
                        createNew: false,
                        isPreview: true,
                        forPrint: true,
                        forThumb: false,
                        isDraft: false,
                        testMode: true,
                        designMode: C.PublisherDesignMode.Template,
                        templateType:
                            C.DocumentTemplateType.PublisherStationery,
                        templateId: 0,
                        printFormat: 0,
                        sampleDocumentContent: response.Data
                    }
                });
            }
        );
    }
};
