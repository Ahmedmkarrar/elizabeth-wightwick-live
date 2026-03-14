gmgps.cloud.ui.views.changeAgreedOfferSolicitor = function (args) {
    var me = this;

    me.$root = args.$root;
    me.$window = null;
    me.init();

    return true;
};

gmgps.cloud.ui.views.changeAgreedOfferSolicitor.prototype = {
    init: function () {
        var me = this;

        me.$root.find('#SolicitorSearch').autoCompleteEx({
            modelType: C.ModelType.Contact,
            search: {
                CategoryIdList: [C.ContactCategory.Solicitor],
                ApplyFurtherFilteringtoIds: true,
                FullQuery: true
            },
            allowCreate: true,
            includeContacts: true,
            includeUsers: false,
            placeholder: 'Search for Solicitor...',
            newContactCategory: C.ContactCategory.Solicitor,
            onSelected: function (args) {
                me.$root.find('#SolicitorId').val(args.id);
            },
            onRemoved: function () {
                me.$root.find('#SolicitorId').val('');
            }
        });
    },

    action: function (onComplete) {
        var me = this;

        me.$root.addClass('opt-validate').validationEngine({ scroll: false });

        var valid = me.$root.validationEngine('validate');
        if (!valid) return;

        new gmgps.cloud.http("changeAgreedOfferSolicitor-action").postForm(
            createForm(
                me.$root,
                'Progression/UpdateProgressionChangeSolicitor'
            ),
            function () {
                me.progression.getProgressionDetail(
                    me.$root.find('#HistoryEventId').val(),
                    me.$root.find('#ChainLinkItemId').val()
                );
                onComplete();
            },
            function (error) {
                alert(error);
            }
        );
    },

    cancel: function (onComplete) {
        onComplete();
    }
};
