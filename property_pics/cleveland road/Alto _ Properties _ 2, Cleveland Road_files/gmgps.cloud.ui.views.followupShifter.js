gmgps.cloud.ui.views.followUpShifter = function (args) {
    var me = this;
    me.cfg = args;
    me.$root = args.$root;
    me.$window = null;

    me.eventId = parseInt(me.$root.find('#DiaryEvent_Id').val());
    me.days = parseInt(me.$root.find('#Days').val());
    me.init(args);

    return this;
};

gmgps.cloud.ui.views.followUpShifter.typeName =
    'gmgps.cloud.ui.views.followUpShifter';

gmgps.cloud.ui.views.followUpShifter.prototype = {
    init: function () {
        var me = this;

        me.$window = me.$root.closest('.window');
        me.$window
            .find('.action-button')
            .removeClass('grey')
            .addClass('bgg-diary');
    },

    action: function (onComplete) {
        var me = this;

        new gmgps.cloud.http("followupShifter-action").ajax(
            {
                args: { eventId: me.eventId, numberOfDaysMovedBy: me.days },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/followUp/MoveEventFollowUpsForward'
            },
            function (response) {
                if (response.Data != true) {
                    showError('Moving of the task(s) failed');
                }

                if (onComplete) {
                    onComplete();
                }
            }
        );
    }
};
