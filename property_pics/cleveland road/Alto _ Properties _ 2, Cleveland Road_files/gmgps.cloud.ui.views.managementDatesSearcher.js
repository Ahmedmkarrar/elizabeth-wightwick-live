gmgps.cloud.ui.views.managementDatesSearcher = function (args) {
    var me = this;

    me.linkedId = args.linkedId;
    me.linkedTypeId = args.linkedTypeId;

    me.init(args);

    return true;
};

gmgps.cloud.ui.views.managementDatesSearcher.prototype = {
    init: function () {
        var me = this;

        return me;
    },

    find: function (typeId) {
        var me = this;

        return new gmgps.cloud.http("managementDatesSearcher-find").ajax({
            args: {
                linkedId: me.linkedId,
                linkedTypeId: me.linkedTypeId,
                typeId: typeId
            },
            complex: true,
            dataType: 'json',
            type: 'post',
            url: 'Diary/GetActiveManagementDateOfType'
        });
    }
};
