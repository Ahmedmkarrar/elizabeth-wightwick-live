gmgps.cloud.ui.views.home.diary = function (args) {
    var me = this;
    me.initialised = false;
    me.forceRefreshOnNextActivation = false;

    me.header = 'Appointments';
    me.$root = args.$root;
    me.$diaryRoot = me.$root.find('#diary-root');
    me.$diaryOptions = args.$diaryOptions;

    me.branchId = 0 || args.branchId;
    me.userId = 0 || args.userId;

    me.monthNames = [
        'JAN',
        'FEB',
        'MAR',
        'APR',
        'MAY',
        'JUN',
        'JUL',
        'AUG',
        'SEP',
        'OCT',
        'NOV',
        'DEC'
    ];

    me.init();

    return true;
};

gmgps.cloud.ui.views.home.diary.prototype = {
    init: function () {
        var me = this;

        me.$root.on('click', '.open-button', function () {
            var $appointment = $(this).closest('.appointment');

            var type = parseInt($appointment.attr('data-eventtypeid'));
            var repeating = $appointment.attr('data-isreccurring') === 'True';
            var eventId = parseInt($appointment.attr('data-id'));
            var instanceId = parseInt($appointment.attr('data-instanceid'));
            var zIndex = 0;

            if (repeating) {
                showDialog({
                    type: 'question',
                    title: 'Recurring Appointment',
                    zIndex: zIndex,
                    msg: 'This is a recurring appointment.<br/><br/>Do you want to open only this occurrence or the series?',
                    buttons: {
                        'Open this Occurrence': function () {
                            $(this).dialog('close');
                            me.openReminderItem(
                                type,
                                eventId,
                                instanceId,
                                zIndex
                            );
                        },
                        'Open the Series': function () {
                            $(this).dialog('close');
                            instanceId = 0;
                            me.openReminderItem(
                                type,
                                eventId,
                                instanceId,
                                zIndex
                            );
                        },
                        Cancel: function () {
                            $(this).dialog('close');
                        }
                    }
                });
            } else {
                instanceId = 0;
                me.openReminderItem(type, eventId, instanceId, zIndex);
            }
        });

        me.$diaryOptions.on('click', '#select-date', function () {
            me.$diaryOptions.find('#diary-datepicker').datepicker('show');
        });

        me.$diaryOptions.find('#diary-datepicker').datepicker({
            dateFormat: 'd/M/y',
            showButtonPanel: true,
            beforeShow: function (input, inst) {
                setTimeout(function () {
                    var offsets = me.$diaryOptions
                        .find('#select-date')
                        .offset();
                    var top = offsets.top + 30;
                    var left = offsets.left;
                    inst.dpDiv.css({
                        top: top,
                        left: left
                    });
                });
            },
            onSelect: function (dateText) {
                var dateObject = $('#diary-datepicker').datepicker('getDate');
                me.setSelectedDateButton(dateObject, dateText);
                me.refreshDiaryEvents();
            }
        });
    },

    setSelectedDateButton: function (dateObject, selectedDate) {
        var me = this;

        var today = new Date();
        today.setHours(0, 0, 0, 0);
        var tomorrow = new Date();
        tomorrow.setHours(0, 0, 0, 0);
        tomorrow.setDate(tomorrow.getDate() + 1);
        var yesterday = new Date();
        yesterday.setHours(0, 0, 0, 0);
        yesterday.setDate(yesterday.getDate() - 1);

        switch (dateObject.valueOf()) {
            case today.valueOf(): {
                me.$diaryOptions.find('.chosen-day').text('Today');
                break;
            }
            case yesterday.valueOf(): {
                me.$diaryOptions.find('.chosen-day').text('Yesterday');
                break;
            }
            case tomorrow.valueOf(): {
                me.$diaryOptions.find('.chosen-day').text('Tomorrow');
                break;
            }
            default: {
                me.$diaryOptions.find('.chosen-day').text(selectedDate);
            }
        }
    },

    refreshDiaryEvents: function () {
        var me = this;

        var deferred = new $.Deferred();

        var eventTypesList = [];

        eventTypesList.push({ Key: C.EventType.Viewing, Value: [0] });
        eventTypesList.push({ Key: C.EventType.Valuation, Value: [0] });
        eventTypesList.push({ Key: C.EventType.General, Value: [0] });

        var viewingType = C.ViewingType.Unspecified;

        var searchMode;
        var searchId = 0;

        if (me.userId === 0) {
            // All users selected, thus use BRANCH level search
            searchMode = C.CalendarMode.Branch;
            searchId = me.branchId;
        } else {
            // A specific user has been picked, use USER specific search
            searchMode = C.CalendarMode.User;
            searchId = me.userId;
        }

        var search = {
            id: searchId,
            mode: searchMode,
            eventTypesList: eventTypesList,
            statusList: [C.EventStatus.Active],
            viewingType: viewingType,
            includeRecurringEvents: true,
            StartDate: $('#diary-datepicker').datepicker('getDate')
        };

        //Fetch events from the server.
        new gmgps.cloud.http("diary-refreshDiaryEvents").ajax(
            {
                args: {
                    Id: searchId,
                    Mode: searchMode,
                    search: search
                },
                complex: true,
                background: true,
                dataType: 'json',
                type: 'post',
                url: '/home/GetAppointmentList'
            },
            function (response) {
                deferred.resolve();

                me.$diaryRoot.empty();

                if (response.Data.length == 0) {
                    me.$root.find('.no-apps').show();
                    return;
                } else {
                    me.$root.find('.no-apps').hide();
                }

                me.$diaryRoot.html(response.Data);
            }
        );

        return deferred.promise();
    },

    openReminderItem: function (type, eventId, instanceId, zIndex) {
        var me = this;

        //1  = general, 2 = apraisal, 3 = viewing
        switch (type) {
            case 1:
                //call event window
                gmgps.cloud.helpers.diary.getAppointment(
                    {
                        id: eventId,
                        instanceId: instanceId,
                        sourceZIndex: zIndex
                    },
                    function () {
                        me.refreshDiaryEvents();
                    }
                );
                break;

            case 2:
                gmgps.cloud.helpers.property.getMarketAppraisalAppointment(
                    {
                        eventId: eventId,
                        allowCancel: true,
                        sourceZIndex: zIndex
                    },
                    function () {
                        me.refreshDiaryEvents();
                    }
                );
                break;

            case 3:
                gmgps.cloud.helpers.property.getViewing(
                    {
                        viewingId: eventId,
                        sourceZIndex: zIndex
                    },
                    function () {
                        me.refreshDiaryEvents();
                    }
                );
                break;
        }
    },

    lockUI: function (lock) {
        glass(lock);
    },

    activate: function (forceRefresh) {
        var me = this;

        if (forceRefresh || !me.initialised) {
            me.refreshAll();
        }
    },

    refreshAll: function () {
        var me = this;

        var deferred = new $.Deferred();

        me.initialised = true;
        me.lockUI(true);

        //Refreshing everything means a top-level change or initial load, so everything which wants a spinner gets one.  As each section completes, these get replaced.
        me.$root
            .find('.opt-spinner')
            .not('.opt-refresh-all-exclude')
            .html('<div class="home-spinner"></div>');

        $.when(me.refreshDiaryEvents())
            .done(function () {
                deferred.resolve();
                me.lockUI(false);
            })
            .fail(function () {
                me.lockUI(false);
            });

        return deferred.promise();
    }
};
