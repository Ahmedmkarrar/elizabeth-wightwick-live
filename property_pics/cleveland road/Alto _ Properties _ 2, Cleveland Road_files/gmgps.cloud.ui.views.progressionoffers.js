gmgps.cloud.ui.views.progressionoffers = function (args) {
    var me = this;

    me.cfg = args;
    me.$root = args.$root;

    me.closeMyWindow = args.closeMyWindow;

    me.init(args);

    return this;
};

gmgps.cloud.ui.views.progressionoffers.prototype = {
    init: function () {
        var me = this;

        me.$root.on('click', '.offers tbody tr', function () {
            var $this = $(this);

            gmgps.cloud.helpers.property.gotoProgression({
                $row: $(
                    '<span data-modelType="{0}"></span>'.format(
                        C.ModelType.ChainLink
                    )
                ),
                id: parseInt($this.attr('data-chainlinkid')),
                recordType: C.PropertyRecordType.Sale,
                secondaryId: parseInt($this.attr('data-agreedofferid'))
            });

            me.closeMyWindow();
        });

        return me;
    },

    action: function () {}
};
