gmgps.cloud.ui.views.termStatusChangeHandler = function (args) {
    var me = this;

    me.cfg = args;
    me.$root = args.$root;

    me.init(args);

    return this;
};

gmgps.cloud.ui.views.termStatusChangeHandler.prototype = {
    init: function (args) {
        var me = this;

        me.historyEventId = args.historyEventId;
        me.newStatus = args.newStatus;
        me.title = args.title;
        me.tenancyId = args.tenancyId || 0;
        return me;
    },

    controller: function (args) {
        var me = this;

        me.$root = args.$root;

        me.params = args.data;

        me.$window = args.$window;

        me.$root.find('.date-picker').each(function (i, v) {
            $(v).datepicker({
                numberOfMonths: 2,
                showButtonPanel: true,
                dateFormat: 'dd/mm/yy',
                minDate:
                    $(v).attr('data-datePickerMode') === 'future'
                        ? new Date()
                        : null
            });
        });

        if (
            me.$root
                .find('#ShowOutstandingChargesMessageForTenantChange')
                .val() === 'True' &&
            me.$root.find('#OutstandingChargeContacts').val() !== ''
        ) {
            showInfo(
                'There are charges set to be raised for contact(s): {0}. Please ensure these charges are removed if they are no longer required.'.format(
                    me.$root.find('#OutstandingChargeContacts').val()
                )
            );
        }

        if (me.$root.find('#NewStatus').val() == 'ChangeToPeriodic') {
            me.$window.find('.bottom .buttons .cancel-button').hide();
        }

        this.action = function (onComplete) {
            me.$root
                .addClass('opt-validate')
                .validationEngine({ scroll: false });
            var valid = me.$root.validationEngine('validate');

            if (!valid) return false;

            me.$window.find('.action-button').lock();

            new gmgps.cloud.http("termStatusChangeHandler-action").postForm(
                createForm(me.$root, 'Tenancy/UpdateTenancyEventStatus'),
                function (response) {
                    if (onComplete) {
                        onComplete(!response.Data);
                    }

                    me.params.cfg.onComplete(
                        response.Data,
                        response.UpdatedEvents
                    );
                },
                function () {
                    me.$window.find('.action-button').unlock();
                }
            );
        };
    },

    show: function () {
        var me = this;

        new gmgps.cloud.ui.controls.window({
            title: me.title,
            windowId: 'tenancyTermModal',
            controller: me.controller,
            url: 'Tenancy/GetTenancyEventStatusChange',
            urlArgs: {
                historyEventId: me.historyEventId,
                newStatus: me.newStatus,
                tenancyId: me.tenancyId
            },
            data: me,
            post: true,
            complex: true,
            draggable: true,
            modal: true,
            actionButton: 'OK',
            cancelButton: 'Cancel',
            onAction:
                me.onComplete ||
                function () {
                    return false;
                },
            onCancel:
                me.onComplete ||
                function () {
                    return false;
                }
        });
    }
};
