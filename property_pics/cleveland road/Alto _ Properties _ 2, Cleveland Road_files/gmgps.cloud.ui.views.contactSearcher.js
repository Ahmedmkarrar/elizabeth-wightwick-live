gmgps.cloud.ui.views.contact.contactSearcher = function () {
    return this.init();
};

gmgps.cloud.ui.views.contact.contactSearcher.prototype = {
    init: function () {
        return this;
    },

    performSearch: function (search) {
        var me = this;

        var deferred = $.Deferred();

        me.callService(search).done(function (r) {
            if (r && r.Data) {
                deferred.resolve(r.Data);
            }
        });

        return deferred;
    },

    callService: function (search) {
        return new gmgps.cloud.http("contactSearcher-callService").ajax({
            args: search,
            complex: true,
            dataType: 'json',
            type: 'post',
            url: '/Contact/GetContactSearchResult'
        });
    }
};
