gmgps.cloud.ui.views.rollingscreen = function (args) {
    var me = this;
    me.$window = null;

    /// args are only passed when this object is instantiated via the window.js as a controller
    if (args !== undefined) {
        me.$root = args.$root;

        me.init(args);
    }

    return this;
};

gmgps.cloud.ui.views.rollingscreen.prototype = {
    init: function () {},

    action: function () {
        var me = this;

        var selectedProperty = me.$root.find('.propertylist .item');

        if (selectedProperty.length == 0) {
            showInfo('No properties included');
            return false;
        }

        var propertyIdList = selectedProperty.map(function (v) {
            return v.data('id');
        });

        var $form = gmgps.cloud.utility.buildForm(
            'Tools/RollingScreenGenerateZipFile',
            {
                model: {
                    propertyIdList: propertyIdList,
                    addPriceQualifier: me.$root
                        .find('#AddPriceQualifier')
                        .prop('checked')
                }
            }
        );

        $form.submit();
        $form.remove();
    }
};
