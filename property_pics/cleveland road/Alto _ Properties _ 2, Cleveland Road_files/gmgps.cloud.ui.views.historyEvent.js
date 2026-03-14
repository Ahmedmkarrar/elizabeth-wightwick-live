gmgps.cloud.ui.views.historyEvent = function (args) {
    var me = this;

    me.$root = args.$root;
    me.$window = null;
    me.settings = args;
    me.init(args);

    return true;
};

gmgps.cloud.ui.views.historyEvent.prototype = {
    init: function () {
        var me = this;

        me.$window = me.$root.closest('.window');

        //Inject user and datetime.
        var $ownership = $(
            '<div class="ownership">' +
                me.$root.find('#ModelUser').val() +
                (me.id == 0
                    ? ''
                    : '<br/>' + me.$root.find('#ModelDateTime').val()) +
                '</div>'
        );
        me.$window.find('.top').append($ownership);

        if (me.$root.find('#Valuation_Id').val() == '') {
            me.$root.closest('.window').find('.action-button').hide();
            return;
        }

        //Setup custom dropdowns.
        me.$root.find('select').customSelect();

        //Date Pickers
        me.$root.find('.date-picker').each(function (i, v) {
            $(v).datepicker({
                numberOfMonths: 2,
                showButtonPanel: true,
                dateFormat: 'dd/mm/yy',
                minDate:
                    $(v).attr('data-datePickerMode') == 'future'
                        ? new Date()
                        : null
            });
        });
    },

    validate: function () {
        return true;
    },

    destroy: function () {
        var me = this;
        me.$root.empty().unbind();
    },

    action: function (onComplete) {
        var me = this;

        me.$window.find('.action-button').lock();

        new gmgps.cloud.http("historyEvent-action").postForm(
            createForm(me.$root, 'Property/UpdatePropertyHistoryEvent'), //simontiger (determine modelType here so not always property)
            function (response) {
                //Prompt for letters.
                gmgps.cloud.helpers.general.promptForLetters({
                    eventHeaders: response.UpdatedEvents
                });

                onComplete();
            },
            function (error) {
                console.log(error);
            }
        );
    },

    cancel: function (onComplete) {
        onComplete();
    }
};
