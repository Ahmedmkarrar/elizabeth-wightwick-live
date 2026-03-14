//gmgps.cloud.ui.controls.calendar
// - This is our calendar wrapper, which can contain one or many calendars.
// - When there is more than one calendar, they appear side by side.  The first one is the "master" and the UI controls for any further instances are hidden.

gmgps.cloud.ui.controls.calendar = function (args) {
    var me = this;
    me.cfg = args;

    me.$root = me.cfg.$root;

    me.viewName = ''; //The current view name for the calendar(s).
    me.mode =
        args.calendarDefinitions.length != 0
            ? args.calendarDefinitions[0].mode
            : C.CalendarMode.Unspecified;
    me.customPeriod = false;
    me.multi = false; //Whether or not there is a master and slaves (i.e. multiple resource mode).
    me.instanceCount = 0;
    me.cfg.allowEdit = args.allowEdit == undefined ? false : args.allowEdit;
    me.cfg.disableDragging =
        args.disableDragging == undefined ? false : args.disableDragging;
    me.cfg.allowCreate =
        args.allowCreate == undefined ? false : args.allowCreate;
    me.cfg.promptBeforeEventMove = false;
    me.cfg.printable = args.printable == undefined ? false : args.printable;

    //Use supplied search filters if supplied, otherwise use defaults.
    if (args.searchFilters) {
        me.searchFilters = args.searchFilters;
    } else {
        me.searchFilters = {
            viewingsA: true,
            viewingsU: true,
            appraisals: true,
            general: true,
            recurring: true
        };
    }

    me.init(args);
    return this;
};

gmgps.cloud.ui.controls.calendar.prototype = {
    init: function () {
        var me = this;

        //Calculate required dimensions.
        // - Once the calendar(s) are rendered, the size is checked using ensureSpace() and widened if required.
        me.instanceCount = me.cfg.calendarDefinitions.length;
        var instanceWidth = parseFloat((100 / me.instanceCount).toFixed(3));
        var totalWidth = me.$root.outerWidth();
        me.multi = me.instanceCount > 1;

        //Add/Remove multi class to/from root.
        // - Check that is required room to display all resources.
        if (me.multi) {
            me.$root.addClass('multi');
        } else {
            me.$root.removeClass('multi');
        }

        //Window > Resize
        $(window).on('resize', function (e) {
            if (e.target == window) {
                //Maintain the height of the calendar rendering one by one, to allow the height offsets of each to be retained.
                me.$calendars.each(function (i, v) {
                    var $calendar = $(v);

                    $calendar.fullCalendar(
                        'option',
                        'height',
                        $calendar.outerHeight()
                    );
                });

                //Stretch the master header.
                // - fc-header is already defined as 100%, but this header needs to span across multiple containers.
                //   For that reason, it needs to be manually specified.
                if (me.multi) {
                    me.$root
                        .find('.master table.fc-header')
                        .css(
                            'width',
                            '{0}px !important'.format(
                                me.$root.outerWidth() - 100
                            )
                        );
                }
            }
        });

        //Header and instance framework (multi mode only).
        if (me.multi) {
            me.$root.append(
                '<div class="header fc"></div>' +
                    '<div class="body">' +
                    '<div class="instances"></div>' +
                    '<div class="agenda fc-agenda"></div>' +
                    '</div>'
            );
        }

        //Inject calendar definitions.
        var $injectionPoint = me.multi ? me.$root.find('.instances') : me.$root;
        $.each(me.cfg.calendarDefinitions, function (i, v) {
            $injectionPoint.append(
                $(
                    '<div class="calendar" data-id="{0}" data-view="{1}" data-mode="{2}" data-title="{3}"></div>'.format(
                        v.id,
                        v.view,
                        v.mode,
                        v.title
                    )
                )
            );
        });

        //Setup calendar references.
        me.$calendars = me.$root.find('.calendar');
        me.$masterCalendar = me.$root.find('.calendar:first');

        //Render each calendar.
        var calendars = new gmgps.cloud.ui.controls.CalendarCollection();
        me.$calendars.each(function (i, v) {
            var calendar = me.createCalendar(
                i,
                $(v),
                instanceWidth,
                totalWidth,
                calendars
            );
            calendars.push(calendar);
        });

        //Add (+week/-week) buttons (for use within agendaDay and basicDay views only)
        // - Also includes initial display/hide so that this code doesn't need to be placed in the viewDisplay callback.
        var buttonHtml =
            '<span class="fc-button fc-button-{0} fc-state-default fc-corner-right"><span class="fc-button-inner"><span class="fc-button-content">{1}</span><span class="fc-button-effect"><span></span></span></span></span>';
        var $nextWeekButton = $(buttonHtml.format('nextWeek', '&gt;&gt;'));
        var $prevWeekButton = $(buttonHtml.format('prevWeek', '&lt;&lt;'));
        $nextWeekButton.insertAfter(me.$masterCalendar.find('.fc-button-next'));
        $prevWeekButton.insertBefore(
            me.$masterCalendar.find('.fc-button-prev')
        );
        if (me.viewName == 'agendaDay' || me.viewName == 'basicDay') {
            $nextWeekButton.show();
            $prevWeekButton.show();
        } else {
            $nextWeekButton.hide();
            $prevWeekButton.hide();
        }

        //Post-render multi mode configuration.
        if (me.multi) {
            //Ensure that there's adequate space for all instances.
            me.ensureSpace(true);

            //Move the header out.
            me.$root.find('.header, .agenda').empty();
            me.$masterCalendar
                .find('.fc-header')
                .appendTo(me.$root.find('.header'));

            //Move all the slot scrollers into the agenda container.
            me.$root.find('.slot-scroller').appendTo(me.$root.find('.agenda'));
            var $s = me.$root.find('.agenda .slot-scroller');
            $s.css('float', 'left');
            $s.css('width', '{0}%'.format(instanceWidth));
            me.$root.find('.agenda').append('<div class="clear"></div>');
        }

        //Insert the title, if supplied.
        if (me.cfg.title !== undefined && me.cfg.title != '') {
            //Remove the top margin from the date label.
            var $header = me.$root.find('.fc-header-title');
            $header.find('h2').css('margin-top', '0px');

            //Insert a title element.
            $header.append('<h3>{0}</h3>'.format(me.cfg.title));
        }

        //Next Week / Prev Week buttons > Click
        me.$root.on(
            'click',
            '.fc-button-nextWeek, .fc-button-prevWeek',
            function () {
                var date = me.getDate();
                var newDate = new Date(date.valueOf());
                if ($(this).hasClass('fc-button-nextWeek')) {
                    newDate.add(7).days();
                } else {
                    newDate.add(-7).days();
                }

                //Move back/fwd 7 days.
                me.$calendars.fullCalendar('gotoDate', newDate);
            }
        );
    },

    // eslint-disable-next-line no-unused-vars
    addEvents: function (events, ghosted) {
        var me = this;

        $.each(events, function (i, event, stick) {
            if (me.multi) {
                //Find the correct calendar instance for the event.
                //todo
            } else {
                me.$calendars.fullCalendar('renderEvent', event, stick);
            }
        });
    },

    changeView: function (viewName) {
        var me = this;
        me.$calendars.fullCalendar('changeView', viewName);
    },

    changeViewAndGotoDate: function (
        viewName,
        year,
        month,
        day,
        lastGotoExternal,
        customDays
    ) {
        var me = this;

        me.lastGotoExternal = lastGotoExternal;
        me.setCustomPeriodMode(customDays != undefined && customDays > 1);

        if (viewName === me.$calendars.first().fullCalendar('getView').name) {
            me.$calendars.fullCalendar(
                'gotoDate',
                year,
                month,
                day,
                customDays
            );
        } else {
            me.$calendars
                .fullCalendar('gotoDate', year, month, day, customDays, true)
                .fullCalendar('changeView', viewName);
        }
    },

    clear: function () {
        var me = this;
        me.$calendars.fullCalendar('removeEvents');
    },

    createCalendar: function (
        i,
        $calendar,
        instanceWidth,
        totalWidth,
        calendars
    ) {
        var me = this;

        var isMaster = i == 0;

        //For multi-mode, only the two day views are available (agenda and basic).
        // - For single-instance mode (non-multi), all views are available.
        var views = !me.multi
            ? 'agendaDay,agendaWeek,month basicDay,basicWeek'
            : 'agendaDay,basicDay';

        if (me.multi) {
            //Apply master tag.
            $calendar.addClass(isMaster ? 'master' : 'slave');
        }

        //Set the width of this calendar.
        $calendar.css('width', '{0}%'.format(instanceWidth));

        //Determine the default view (from a cookie if available, otherwise read from the data attribute of the calendar element).
        var defaultView =
            me.cfg.defaults && me.cfg.defaults.viewName
                ? me.cfg.defaults.viewName
                : $calendar.attr('data-view');

        //Determine the initial view name. (pt.2)
        //  - If the data attribute didn't yield a default view to use, use agendaDay or agendaWeek as a default.
        //  - Multi mode = agendaWeek, agendaDay otherwise.
        me.viewName = !defaultView
            ? !me.multi
                ? 'agendaWeek'
                : 'agendaDay'
            : defaultView;

        //Determine the default start date.
        var today = new Date();
        var defaultStart = me.cfg.defaults.start
            ? {
                  day: me.cfg.defaults.start.getDate(),
                  month: me.cfg.defaults.start.getMonth(),
                  year: me.cfg.defaults.start.getFullYear()
              }
            : {
                  day: today.getDate(),
                  month: today.getMonth(),
                  year: today.getFullYear()
              };

        me.customPeriod = me.cfg.defaults.customDays != undefined;
        var customDays = me.cfg.defaults.customDays
            ? me.cfg.defaults.customDays
            : 7;

        //If customPeriod is enabled, ensure a week view.
        if (
            me.customPeriod &&
            (me.viewName != 'basicWeek' || me.viewName != 'agendaWeek')
        ) {
            //Default to basicWeek if the custom period is over 14 days, otherwise agendaWeek.
            me.viewName = customDays > 14 ? 'basicWeek' : 'agendaWeek';
        }

        ////Get working day hours from branch settings, with fallback to defaults
        var $diaryRoot = me.$root.closest('#diary');
        var officeStartHour = 8; // default
        var officeEndHour = 19; // default
        var officeStartMinute = 0; // default
        var officeEndMinute = 0; // default

        
        if ($diaryRoot.length > 0) {
            var startHourVal = $diaryRoot.find('#_workingDayStartHour').val();
            var startMinuteVal = $diaryRoot.find('#_workingDayStartMinute').val();
            var endHourVal = $diaryRoot.find('#_workingDayEndHour').val();
            var endMinuteVal = $diaryRoot.find('#_workingDayEndMinute').val();
            
            if (startHourVal && !isNaN(startHourVal)) {
                officeStartHour = parseInt(startHourVal, 10);
            }

            if (endHourVal && !isNaN(endHourVal)) {
                officeEndHour = parseInt(endHourVal, 10);
            }

            if (startMinuteVal && !isNaN(startMinuteVal)) {
                var startMinutes = parseInt(startMinuteVal, 10);
                // Round up to nearest 15 minutes
                officeStartMinute = Math.ceil(startMinutes / 15) * 15;
            }

            // 4. Process End Minute (New Logic)
            if (endMinuteVal && !isNaN(endMinuteVal)) {
                var endMinutes = parseInt(endMinuteVal, 10);
                officeEndMinute = Math.floor(endMinutes / 15) * 15;
            }
        }

        //Render the calendar, apply settings and configure callbacks.
        var $fullCalendar = $calendar.fullCalendar({
            customDays: customDays,
            customPeriod: me.customPeriod,
            date: defaultStart.day,
            month: defaultStart.month,
            year: defaultStart.year,
            multi: me.multi,
            defaultView: me.viewName,
            officeStartHour: officeStartHour,
            officeStartMinute: officeStartMinute,
            officeEndHour: officeEndHour,
            officeEndMinute: officeEndMinute,
            minTime: 6,
            maxTime: 23,
            header: isMaster
                ? {
                      //Master - include buttons and title.
                      left: 'today prev,next',
                      center: 'title',
                      right: views
                  }
                : {
                      //Slave - no buttons or title.
                      left: '',
                      center: '',
                      right: ''
                  },
            firstDay: 1, //Monday,
            allDayText: me.multi ? 'all<br/>day' : 'all-day',
            height: $calendar.outerHeight(),
            viewDisplay: function (view) {
                //If the previous view name was a week one and we're in custom period mode,
                //  cancel custom mode now.
                if (
                    (me.viewName == 'agendaWeek' ||
                        me.viewName == 'basicWeek') &&
                    me.customPeriod
                ) {
                    if (view.name != 'agendaWeek' && view.name != 'basicWeek') {
                        me.setCustomPeriodMode(false);

                        //Custom mode has ended - calendar(s) must be restructured.
                        // Supply the desired view name for use after restructuring.
                        // - Exit early here, if a handler for onRebuildRequired exists, which will then
                        //   trigger a totally fresh calendar to be rendered.
                        if (me.cfg.onRebuildRequired) {
                            me.cfg.onRebuildRequired(view.name);
                            return false;
                        }
                    }
                }

                //Special view considerations.
                switch (view.name) {
                    case 'agendaDay':
                    case 'basicDay':
                        //Show next/prev week buttons.
                        me.$masterCalendar
                            .find('.fc-button-nextWeek, .fc-button-prevWeek')
                            .show();
                        break;
                    default:
                        //Hide next/prev week buttons.
                        me.$masterCalendar
                            .find('.fc-button-nextWeek, .fc-button-prevWeek')
                            .hide();
                        break;
                }

                //Update the stored view name.
                me.viewName = view.name;

                //Re-apply title in multi mode, then exit if this was raised by a slave.
                // - Exit early during this branch if this is a slave.
                if (me.multi) {
                    //Re-apply the title or this instance, else it will revert to the date.
                    // - Note the different targets depending on whether the calendar is in agenda or basic mode for the day.
                    var title = $calendar.attr('data-title');
                    var $target =
                        view.name == 'agendaDay'
                            ? $calendar.find(
                                  '.fc-view-agendaDay .fc-widget-header.fc-col0'
                              )
                            : $calendar.find(
                                  '.fc-view-basicDay .fc-widget-header'
                              );

                    $target.addClass('processed').text(title);

                    //No more work to do here if this was raised by a slave (the master has control).
                    if ($calendar.hasClass('slave')) {
                        return false;
                    }

                    //Increase the height of the master calendar main td (to cater for the removal of its header).
                    // - This function needs to complete before the second instance exists and the height can
                    //   be queried, hence the timeout.
                    setTimeout(function () {
                        var height = me.$calendars
                            .not($calendar)
                            .first()
                            .find('.fc-view-basicDay td > div')
                            .outerHeight();
                        $calendar
                            .find('.fc-view-basicDay td > div')
                            .css('height', height);
                    }, 1);

                    //If "day summary" is the selection, hide the agenda element.  Otherwise, show it.
                    if (view.name == 'basicDay') {
                        me.$root.find('.agenda').hide();
                    } else {
                        me.$root.find('.agenda').show();
                    }
                }

                //Callback to the parent to notify that the view has been changed.
                if (
                    me.cfg.onViewChanged &&
                    (!me.multi || $calendar.hasClass('master'))
                ) {
                    me.cfg.onViewChanged({
                        mode: me.mode,
                        view: view,
                        lastGotoExternal: me.lastGotoExternal
                    });
                }

                //Reset the lastGotoExternal flag.
                me.lastGotoExternal = false;

                //If there are slaves, switch their view also.
                if (me.multi) {
                    me.$calendars
                        .not($calendar)
                        .fullCalendar('changeView', view.name);
                    if (view.name == 'agendaDay' || view.name == 'basicDay') {
                        me.$calendars
                            .not($calendar)
                            .fullCalendar('gotoDate', view.start);
                    }
                }
            },
            slotMinutes: 15,
            defaultEventMinutes: 60,
            firstHour: me.cfg.useStartForFirstHour
                ? me.cfg.defaults.start.getHours()
                : me.getFirstHour(defaultStart),
            columnFormat: {
                month: 'ddd',
                week: 'ddd d MMM',
                day: 'dddd d MMM'
            },
            timeFormat: {
                agenda: 'HH:mm{-HH:mm}', //5:00 - 6:30 - For agendaWeek and agendaDay events.
                month: 'HH:mm{-HH:mm}',
                '': 'HH:mm' //For all other views. - 'HH(:mm)'
            },
            axisFormat: 'HH:mm', //For the time axis
            buttonText: {
                prev: '&lt;',
                next: '&gt;',
                today: 'Today',
                basicWeek: me.customPeriod ? 'Period Summary' : 'Week Summary',
                agendaWeek: me.customPeriod ? 'Period' : 'Week',
                basicDay: 'Day Summary',
                agendaDay: 'Day',
                month: 'Month'
            },
            editable: me.cfg.allowEdit,
            disableDragging: me.cfg.disableDragging,
            selectable: me.cfg.allowCreate,
            printable: me.cfg.printable,
            selectHelper: true,
            allowDropOutOfBounds: me.multi,
            // eslint-disable-next-line no-unused-vars
            eventDragStart: function (eventElement, event, ev, ui) {
                if (me.multi) {
                    var $movingElement = $(this);
                    calendars.beginTransfer($movingElement, ev);
                }
            },

            dropOutOfBounds: function (
                event,
                dayDelta,
                minuteDelta,
                allDay,
                revertFunc,
                jsEvent,
                ui,
                view
            ) {
                if (me.multi) {
                    var destinationCalendar = calendars.getCalendar(ui);

                    if (destinationCalendar != null) {
                        ui.sourceCalendar = view.calendar;
                        destinationCalendar.calendar.options.eventDrop(
                            event,
                            dayDelta,
                            minuteDelta,
                            allDay,
                            revertFunc,
                            jsEvent,
                            ui,
                            destinationCalendar.calendar.getView()
                        );
                    } else {
                        revertFunc();
                    }
                }
            },

            events: function (start, end, callback) {
                var id = parseInt($calendar.attr('data-id'));
                var mode = parseInt($calendar.attr('data-mode')); //is this req'd? (mode set in constructor now).
                me.getEvents(id, mode, start, end, callback);
            },
            select: function (start, end, allDay) {
                //Our "allDay" event times terminate at 23:59:59 instead of 00:00:00, so alter the end time if this is an all day event.
                if (allDay) {
                    end = Date.parse(end.toString('dd MMM yyyy') + ' 23:59:59');
                }

                //Is internal handling of selected periods being overridden?
                if (me.cfg.onPeriodSelected) {
                    //External - callback.
                    me.cfg.onPeriodSelected({
                        id: 0,
                        linkedId: parseInt($calendar.attr('data-id')),
                        mode: me.mode,
                        start: start,
                        end: end,
                        allDay: allDay
                    });
                } else {
                    //Internal - Prompt for event type first, then callback.
                    me.createEvent(
                        {
                            id: 0,
                            linkedId: parseInt($calendar.attr('data-id')),
                            mode: me.mode,
                            start: start,
                            end: end,
                            allDay: allDay
                        },
                        function (req) {
                            if (me.cfg.onCreateEvent) {
                                me.cfg.onCreateEvent(req);
                            }
                        }
                    );
                }
            },
            // eslint-disable-next-line no-unused-vars
            eventClick: function (event, e, view) {
                me.editEvent(event);
            },
            // eslint-disable-next-line no-unused-vars
            eventDragStop: function (event, jsEvent, ui, view) {
                if (me.multi) {
                    calendars.addCheckForUnhandledTransfer(
                        $(jsEvent.target),
                        ui
                    );
                }
            },
            eventDrop: function (
                event,
                dayDelta,
                minuteDelta,
                allDay,
                revertFunc,
                jsEvent,
                ui,
                view
            ) {
                var calendarUserId = parseInt(
                    view.element.closest('.calendar').attr('data-id')
                );
                var eventDraggedFromAnotherCalendar =
                    me.multi &&
                    ui.sourceCalendar != null &&
                    ui.sourceCalendar.getView() != view;

                var transfer = null;
                if (me.multi) {
                    var thisCalendar = calendars.getCalendar(ui);
                    transfer = calendars.completeTransfer(
                        $(jsEvent.target),
                        thisCalendar,
                        ui
                    );
                }

                var after = function (moveGranted) {
                    if (!moveGranted) {
                        revertFunc();
                        return false;
                    }

                    //If the event has been dropped into the all-day cell, set the start and end times to our special
                    //times of 00:00:00 and 23:59:59.
                    if (allDay) {
                        event.start = Date.parse(
                            event.start.toString(
                                'dd MMM yyyy {0}'.format('00:00:00')
                            )
                        );
                        event.end = Date.parse(
                            event.end.toString(
                                'dd MMM yyyy {0}'.format('23:59:59')
                            )
                        );
                    } else {
                        //If this event used to be all day, change it's duration to 1hr.
                        if (event.data.ServerAssignedAllDay) {
                            //Server side event.
                            event.end = new Date(event.start.valueOf())
                                .add(1)
                                .hours();
                        } else {
                            //Client side event (as yet unsaved).
                            var span = new TimeSpan(event.end - event.start);
                            if (
                                span.hours == 23 &&
                                span.minutes == 59 &&
                                span.seconds == 59
                            ) {
                                //With a span of 23:59:59, this was an unsaved, all-day event before it was moved.
                                event.end = new Date(event.start.valueOf())
                                    .add(1)
                                    .hours();
                            }
                        }
                    }

                    var fromCalendarUserId = calendarUserId;

                    if (eventDraggedFromAnotherCalendar) {
                        var sourceView = ui.sourceCalendar.getView();
                        fromCalendarUserId = parseInt(
                            sourceView.element
                                .closest('.calendar')
                                .attr('data-id')
                        );
                    }

                    //Event dropped into a new position.
                    me.moveEvent(
                        event,
                        dayDelta,
                        minuteDelta,
                        allDay,
                        fromCalendarUserId,
                        calendarUserId,
                        revertFunc,
                        function () {
                            if (me.cfg.onEventMoved) {
                                me.cfg.onEventMoved(event, {
                                    dayDelta: dayDelta,
                                    minuteDelta: minuteDelta,
                                    allDay: allDay,
                                    revertFunc: revertFunc
                                });
                            }
                        }
                    );
                };

                if (eventDraggedFromAnotherCalendar) {
                    var revert = revertFunc;

                    revertFunc = function () {
                        transfer.revert();
                        revert();
                    };

                    showDialog({
                        type: 'question',
                        title: 'Edit Appointment',
                        msg: "Would you like to move this appointment to another user's calendar?",
                        buttons: {
                            Yes: function () {
                                $(this).dialog('close');
                                me.checkMove(event, after);
                            },
                            No: function () {
                                $(this).dialog('close');
                                revertFunc();
                            }
                        }
                    });
                } else {
                    me.checkMove(event, after);
                }
            },
            eventResize: function (
                event,
                dayDelta,
                minuteDelta,
                revertFunc,
                jsEvent,
                ui,
                view
            ) {
                var calendarUserId = parseInt(
                    view.element.closest('.calendar').attr('data-id')
                );

                var after = function (moveGranted) {
                    if (!moveGranted) {
                        revertFunc();
                        return false;
                    }

                    //Event resized, to form a new time period.
                    // - allDay is not supplied in this instance as it's not applicable, so false is passed for that param.
                    me.moveEvent(
                        event,
                        dayDelta,
                        minuteDelta,
                        false,
                        calendarUserId,
                        calendarUserId,
                        revertFunc,
                        function () {
                            if (me.cfg.onEventMoved) {
                                me.cfg.onEventMoved(event, {
                                    dayDelta: dayDelta,
                                    minuteDelta: minuteDelta,
                                    allDay: false,
                                    revertFunc: revertFunc
                                });
                            }
                        }
                    );
                };

                me.checkMove(event, after);
            },
            eventRender: function (event, element) {
                me.renderEvent(event, element);
            }
        });

        //Post-render modifications.
        //Fetch the title for this calendar.
        if (me.multi) {
            var title = $calendar.attr('data-title');
            if (title != undefined) {
                $calendar.find('.fc-widget-header.fc-col0').text(title);
            }
        }

        //If this is the master, stretch the header.
        if (isMaster) {
            $calendar
                .find('table.fc-header')
                .css('width', '{0}px'.format(totalWidth));
        }

        return $fullCalendar.data('fullCalendar');
    },

    checkMove: function (event, callback) {
        if (event.id == 0 || event.data.IsGhost) {
            //New, unsaved event.  No move checks required.
            callback(true);
        }
        else
        {
            event.editable = false;
            //Check with the user that they'd really like to move/edit the event.
            // - Existing events only.
                showDialog({
                    type: 'question',
                    title: 'Edit Appointment',
                    msg: 'Are you sure you would like to change this appointment?',
                    buttons: {
                        Yes: function () {
                            $(this).dialog('close');

                            // For future appointments, check for conflicts
                            var serverAssignedStart = new Date(event.data.ServerAssignedStart);
                            if (serverAssignedStart < new Date()) {
                                callback(true);
                            }
                            else
                            {
                                var http = new gmgps.cloud.http("calendar-checkMove");

                                http.ajax(
                                    {
                                        url: '/diary/GetCalendarConflicts',
                                        args: event,
                                        dataType: 'json',
                                        type: 'post',
                                        complex: true,
                                        async: true
                                    },
                                    function (response) {
                                        var conflictedParties = response.Data;
                                        var conflict = new gmgps.cloud.helpers.DiaryConflict(
                                            conflictedParties
                                        );

                                        conflict.resolve(
                                            null,
                                            function () {
                                                callback(true);
                                            },
                                            function () {
                                                event.editable = true;
                                                callback(false);
                                            }
                                        );
                                    }
                                );
                            }
                        },
                        No: function () {
                            event.editable = true;
                            $(this).dialog('close');
                            callback(false);
                        }
                    }
                });
        }
    },

    createEvent: function (req, callback) {
        var me = this;

        //Get the form template.
        var $form = me.getCreateEventForm();

        //Clone the span and discard the time portion.
        var startDate = new Date(req.start);
        var endDate = new Date(req.end);
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(0, 0, 0, 0);

        //Func to continue after a conditional prompt if the selected period is in the past.
        var after = function () {
            //Build a description of the period, for display.
            var desc;
            if (startDate.compareTo(endDate) == 0) {
                //Same day.
                desc = req.allDay
                    ? req.start.toString('ddd d MMM yyyy') + ' (All day event)'
                    : '{0} to {1}'.format(
                          req.start.toString('ddd d MMM yyyy HH:mm'),
                          req.end.toString('HH:mm')
                      );
            } else {
                //Different day.
                var days = Math.round((endDate - startDate) / 8.64e7) + 1;
                desc = '{0}<br/>to {1} ({2} {3})'.format(
                    req.start.toString('ddd d MMM yyyy'),
                    req.end.toString('ddd d MMM yyyy'),
                    days,
                    days == 1 ? 'day' : 'days'
                );
            }

            $form.find('#datetime').html(desc);

            new gmgps.cloud.ui.controls.window({
                title: 'Schedule Appointment',
                windowId: 'calendarModal',
                $content: $form,
                width: 347,
                draggable: true,
                modal: true,
                actionButton: null,
                cancelButton: 'Cancel',
                onReady: function ($f) {
                    $f.on('click', '.event-button', function () {
                        //Callback with the desired event type by extending the original req.
                        req.type = parseInt($(this).attr('data-type'));
                        callback(req);
                        $f.closest('.window')
                            .find('.cancel-button')
                            .trigger('click');
                    });
                },
                onCancel: function () {}
            });
        };

        //If the selected period is in the past, get confirmation first.
        if (req.start < new Date()) {
            if (req.allDay) {
                if (req.end < Date()) {
                    showDialog({
                        type: 'warning',
                        title: 'Confirm Period Selection',
                        msg: 'The day you have chosen on the diary is the past.<br/><br/>{0}<br/><br/>Ok to use this day?'.format(
                            req.start.toString('dd MMM yyyy')
                        ),
                        buttons: {
                            Yes: function () {
                                $(this).dialog('close');
                                after();
                            },
                            No: function () {
                                $(this).dialog('close');
                            }
                        }
                    });
                } else {
                    after();
                }
            } else {
                showDialog({
                    type: 'warning',
                    title: 'Confirm Period Selection',
                    msg:
                        'The start of the period you have chosen on the diary is the past.<br/><br/>' +
                        '{0} to {1}<br/><br/>Ok to use this period?'.format(
                            req.start.toString('dd MMM yyyy HH:mm'),
                            req.end.toString('HH:mm')
                        ),
                    buttons: {
                        Yes: function () {
                            $(this).dialog('close');
                            after();
                        },
                        No: function () {
                            $(this).dialog('close');
                        }
                    }
                });
            }
        } else {
            after();
        }
    },

    editEvent: function (event, suppressRecurringPromptAndDefaultToSeries) {
        //Open an event for viewing/editing.
        var me = this;

        me.killTooltips();

        var after = function (createException) {
            //Open the event for viewing/editing.
            switch (event.data.Type) {
                case C.EventType.General:
                    if (createException) {
                        //Note that the start and end dates are supplied if this is an instance, so that they
                        //  can be reflected during the edit, without needing to work out what they were from the instanceId.
                        var end = event.end
                            ? event.end.toString('dd MMM yyyy HH:mm:ss')
                            : '';
                        gmgps.cloud.helpers.diary.getAppointment({
                            id: event.id,
                            instanceId: event.data.InstanceId,
                            start: event.start.toString('dd MMM yyyy HH:mm:ss'),
                            end: end
                        });
                    } else {
                        //Not creating an exception.
                        gmgps.cloud.helpers.diary.getAppointment({
                            id: event.id
                        });
                    }
                    break;
                case C.EventType.Viewing:
                    gmgps.cloud.helpers.property.getViewing({
                        viewingId: event.id
                    });
                    break;
                case C.EventType.Valuation:
                    gmgps.cloud.helpers.property.getMarketAppraisalAppointment({
                        eventId: event.id,
                        allowCancel: true
                    });
                    break;
            }

            if (me.cfg.onEditEvent) {
                me.cfg.onEditEvent(event);
            }
        };

        if (event.data.IsRecurring) {
            //Recurring event.  First, ask whether to view/edit this instance or the series (if not supressed).
            if (!suppressRecurringPromptAndDefaultToSeries) {
                showDialog({
                    type: 'question',
                    title: 'Recurring Appointment',
                    msg: '{0} on {1} is a recurring appointment.<br/><br/>Do you want to open only this occurrence or the series?'.format(
                        event.title,
                        event.start.toString('dd MMM yyyy')
                    ),
                    buttons: {
                        'Open this Occurrence': function () {
                            $(this).dialog('close');
                            after(true);
                        },
                        'Open the Series': function () {
                            $(this).dialog('close');
                            after(false);
                        },
                        Cancel: function () {
                            $(this).dialog('close');
                        }
                    }
                });
            } else {
                //Calling function asked for the prompt to be suppressed - open the series, do not ask about opening the occurence.
                after(true);
            }
        } else {
            //Not a recurring event, open normally.
            after(event.data.IsException);
        }
    },

    destroy: function () {
        var me = this;

        //Destroy all calendar instances.
        me.$calendars.each(function (i, v) {
            $(v).fullCalendar('destroy');
        });

        //Empty the root.
        me.$root.empty();
    },

    ensureSpace: function (instant) {
        //Ensure that each calendar instance is wide enough to be practical.
        // - minWidth is the lower limit.  This func widens the outer container if needed and introduces
        //   sideways scrolling.
        var me = this;

        //Cancel any pending ensureSpaceTimeout.
        if (me.ensureSpaceTimeout) {
            clearTimeout(me.ensureSpaceTimeout);
        }

        var sizeInstances = function () {
            me.ensureSpaceTimeout = null;
            clearTimeout(me.ensureSpaceTimeout);

            var minWidth = 160;
            var scrollbarWidth = 17;
            var currentWidth = me.$masterCalendar.outerWidth();
            var containerWidth = me.$root.outerWidth();

            if (currentWidth < minWidth) {
                //Add some more space and enable sideways scrolling.
                // - The amount of space added is calculated below by seeing how many calendars we could fit
                //   in theory within the current space, subtracting that from our count and then
                //   adding more pixels to cater for the remainder, multiplied by the assumed minWidth
                //   of each instance.
                var currentRecommendedMax = parseInt(containerWidth / minWidth);
                var pixelsRequired = parseInt(
                    (me.instanceCount - currentRecommendedMax) * minWidth
                );

                var $body = me.$root.find('.body');

                //Add extra pixels to the instances and agenda containers, then enable a scrollbar
                //on the x axis of the body.
                $body.find('.instances').css('right', pixelsRequired * -1);
                $body
                    .find('.agenda')
                    .css('right', pixelsRequired * -1 - scrollbarWidth);
                $body.css('overflow-x', 'auto');
            }
        };

        if (instant) {
            sizeInstances();
        } else {
            me.ensureSpaceTimeout = setTimeout(function () {
                sizeInstances();
            }, 250);
        }
    },

    getCalendarModeCssClass: function (mode) {
        switch (mode) {
            case C.CalendarMode.Me:
                return 'me';
            case C.CalendarMode.User:
                return 'user';
            case C.CalendarMode.Branch:
                return 'branch';
            case C.CalendarMode.Group:
                return 'group';
            case C.CalendarMode.BranchResource:
                return 'group';
            case C.CalendarMode.GroupWeekView:
                return 'branch';
        }
    },

    getCreateEventForm: function () {
        var html =
            '<div id="eventtype-selection-form">' +
            '<div id="datetime" class="mb20" style="font-size: 20px; text-align: center;"></div>' +
            '<div style="width: 133px; height: 148px; background-color: #fff;" class="fl">' +
            '<img src="/content/media/images/gui/common/calendar.jpg" />' +
            '</div>' +
            '<div class="fl ml20">' +
            '<div class="h2 mb10">Which type of appointment?</div>' +
            '<div class="btn event-button bgg-property" data-type="{0}" style="display: block; min-width: 120px; margin-bottom: 17px;">Viewing</div>'.format(
                C.EventType.Viewing
            ) +
            '<div class="btn event-button bgg-property" data-type="{0}" style="display: block; min-width: 120px; margin-bottom: 17px;">Market Appraisal</div>'.format(
                C.EventType.Valuation
            ) +
            '<div class="btn event-button bgg-diary" data-type="{0}" style="display: block; min-width: 120px; margin-bottom: 17px;">General Appointment</div>'.format(
                C.EventType.General
            ) +
            '</div>' +
            '</div>';

        return $(html);
    },

    getDate: function () {
        var me = this;
        return me.$calendars.first().fullCalendar('getDate');
    },

    addOrUpdateEventOnCalendar: function ($calendars, event) {
        $calendars.each(function (i, v) {
            var $calendar = $(v);

            //Remove any existing event.
            $calendar.fullCalendar('removeEvents', [event.id]);

            //Add event (if returned from server).
            if (event) {
                $calendar.fullCalendar('renderEvent', event);
                //me.setupTips(); //todo - update the tips for just one | me.$root.find('.fc-event[data-id="{0}"]'.format(event.id)).qtip('destroy', true);
            }
        });
    },

    addOrUpdateRecurringEventOnCalendar: function ($calendars, recurringEvent) {
        $calendars.each(function (i, v) {
            var $calendar = $(v);

            // Remove any existing recurringEvent (this will remove all instances and exceptions in one go).
            $calendar.fullCalendar('removeEvents', [recurringEvent.id]);

            if (recurringEvent) {
                //Remove any existing recurringEvent (this will remove all instances and exceptions in one go).
                $.each(recurringEvent, function (i, event) {
                    $calendar.fullCalendar('removeEvents', [event.id]);
                });

                //Add instances and exceptions from recurringEvent.
                $.each(recurringEvent, function (i, event) {
                    $calendar.fullCalendar('renderEvent', event);
                });
            }
        });
    },

    getEvent: function ($calendars, diaryEventId, callback) {
        var me = this;

        var eventTypesList = [];
        var viewingType = C.ViewingType.Unspecified;

        if (me.searchFilters.viewingsA || me.searchFilters.viewingsU) {
            eventTypesList.push({ Key: C.EventType.Viewing, Value: [0] });

            if (me.searchFilters.viewingsA && !me.searchFilters.viewingsU) {
                viewingType = C.ViewingType.Accompanied;
            } else if (
                !me.searchFilters.viewingsA &&
                me.searchFilters.viewingsU
            ) {
                viewingType = C.ViewingType.Unaccompanied;
            }
        }
        if (me.searchFilters.appraisals) {
            eventTypesList.push({ Key: C.EventType.Valuation, Value: [0] });
        }
        if (me.searchFilters.general) {
            eventTypesList.push({ Key: C.EventType.General, Value: [0] });
        }

        //All calendar instances will be showing the same range and same mode, so just take the visible range from the first.
        // - (There is only more than one instance in resource mode or diary group mode.)
        var view = $calendars[0].fullCalendar('getView');

        me.search = {
            startDate: Date.parse(view.start),
            endDate: Date.parse(view.end),
            eventTypesList: eventTypesList,
            statusList: [C.EventStatus.Active],
            viewingType: viewingType,
            includeRecurringEvents: me.searchFilters.recurring
        };

        //Get the event once and apply to all calendar instances.
        new gmgps.cloud.http("calendar-getEvent").ajax(
            {
                args: {
                    diaryEventId: diaryEventId,
                    settings: {
                        id: $calendars[0].data('id'), //We only care about this when it's a branch, so taking the id from the first instance is OK and allows us to fetch the event just once.
                        mode: $calendars[0].data('mode'), //All modes would be identical.
                        search: me.search,
                        highlightedEventIds: me.cfg.highlightedEventIds,
                        highlightedInstanceId: me.cfg.highlightedInstanceId,
                        printable: me.cfg.printable
                    }
                },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/diary/getcalendarevent'
            },
            function (response) {
                callback(response.Data);
            }
        );
    },

    getRecurringEvent: function ($calendars, diaryEventId, callback) {
        var me = this;

        //All calendar instances will be showing the same range and same mode, so just take the visible range from the first.
        // - (There is only more than one instance in resource mode or diary group mode.)
        var view = $calendars[0].fullCalendar('getView');

        me.search = {
            eventId: diaryEventId,
            startDate: Date.parse(view.start),
            endDate: Date.parse(view.end),
            eventTypesList: [{ Key: C.EventType.General, Value: [0] }],
            statusList: [C.EventStatus.Active],
            includeRecurringEvents: true
        };

        //Get the recurring event once and apply to all calendar instances.
        new gmgps.cloud.http("calendar-getRecurringEvent").ajax(
            {
                args: {
                    settings: {
                        id: $calendars[0].data('id'),
                        mode: $calendars[0].data('mode'),
                        search: me.search,
                        highlightedEventIds: me.cfg.highlightedEventIds,
                        highlightedInstanceId: me.cfg.highlightedInstanceId,
                        printable: me.cfg.printable
                    }
                },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/diary/getcalendarevents'
            },
            function (response) {
                callback(response.Data);
            }
        );
    },

    getEvents: function (id, mode, start, end, callback) {
        var me = this;

        //Build eventTypeList.
        var eventTypesList = [];
        var viewingType = C.ViewingType.Unspecified; //Default to all viewings (acc and unacc)

        //Build eventTypeList.
        if (me.searchFilters.viewingsA || me.searchFilters.viewingsU) {
            eventTypesList.push({ Key: C.EventType.Viewing, Value: [0] });

            if (me.searchFilters.viewingsA && !me.searchFilters.viewingsU) {
                //Accompanied only.
                viewingType = C.ViewingType.Accompanied;
            } else if (
                !me.searchFilters.viewingsA &&
                me.searchFilters.viewingsU
            ) {
                //Unaccompanied only.
                viewingType = C.ViewingType.Unaccompanied;
            }
        }
        if (me.searchFilters.appraisals) {
            eventTypesList.push({ Key: C.EventType.Valuation, Value: [0] });
        }
        if (me.searchFilters.general) {
            eventTypesList.push({ Key: C.EventType.General, Value: [0] });
        }

        me.search = {
            startDate: start,
            endDate: end,
            eventTypesList: eventTypesList,
            statusList: [C.EventStatus.Active],
            viewingType: viewingType,
            includeRecurringEvents: me.searchFilters.recurring
        };

        //Fetch events from the server.
        new gmgps.cloud.http("calendar-getEvents").ajax(
            {
                args: {
                    id: id,
                    mode: mode,
                    search: me.search,
                    highlightedEventIds: me.cfg.highlightedEventIds,
                    highlightedInstanceId: me.cfg.highlightedInstanceId,
                    printable: me.cfg.printable
                },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/diary/getcalendarevents'
            },
            function (response) {
                //Append any supplied events (for example, ghost events).
                //If additional events were supplied, concatenate them to the fetched events.
                // - Only if the linkedId is a match.
                if (me.cfg.events && me.cfg.events.length > 0) {
                    $.each(me.cfg.events, function (i, additionalEvent) {
                        if (additionalEvent.linkedId == id) {
                            //Remove any server returned event which exists in the additional events (by id).
                            // - e.g. An existing apt opened in a mini diary which has had a ghosted event created for it, else you'll see it twice.
                            for (var x = 0; x < response.Data.length; x++) {
                                var e = response.Data[x];
                                if (e.id == additionalEvent.id) {
                                    response.Data.splice(x, 1);
                                }
                            }

                            //Add the additional event.
                            response.Data.push(additionalEvent);
                        }
                    });
                }

                callback(response.Data);
            }
        );
    },

    getFirstHour: function (calendarStartDate) {
        //Decide what the first hour should be on the calendar.
        var me = this;

        if (me.viewName == 'agendaDay' || me.viewName == 'agendaWeek') {
            //If the selected date is today, use the current hour.  Otherwise, the default.
            var selectedDate = new Date(
                calendarStartDate.year,
                calendarStartDate.month,
                calendarStartDate.day
            );
            var today = Date.today();
            var thisHour = new Date().getHours();

            //Wipe the time element from both dates.
            selectedDate.setHours(0, 0, 0, 0);

            if (me.viewName == 'agendaDay') {
                //Compare today vs selectedDate.  If the same, return the current hour - 1, else return the default.
                if (selectedDate.compareTo(today) == 0) {
                    return thisHour - 1;
                } else {
                    return 8;
                }
            } else {
                //Find monday (either today, or the last Monday).
                var monday =
                    today.getDay() == 0
                        ? today
                        : Date.today().previous().monday();
                var sunday = new Date(monday).next().sunday();

                //If the selected date is between monday and sunday, return the current hour - 1, else return the default.
                if (selectedDate.between(monday, sunday)) {
                    return thisHour - 1;
                } else {
                    return 8;
                }
            }
        } else {
            //Not in agendaDay/agendaWeek view - first hour not applicable.
            return 8;
        }
    },

    getView: function () {
        //Return the view from the master calendar.
        var me = this;
        return me.$calendars.first().fullCalendar('getView');
    },

    gotoDate: function (year, month, day, lastGotoExternal, customDays) {
        //Goto a specific day.
        var me = this;
        me.lastGotoExternal = lastGotoExternal;
        me.setCustomPeriodMode(customDays != undefined && customDays > 1);
        me.$calendars.fullCalendar('gotoDate', year, month, day, customDays);
    },

    moveEvent: function (
        event,
        dayDelta,
        minuteDelta,
        allDay,
        fromUserId,
        toUserId,
        revertFunc,
        callback
    ) {
        var me = this;

        //Is this a ghost event or real event?
        if (event.data && event.data.IsGhost) {
            //Change the period of a ghost event.
            // - The caller already has the event object.  We're effectively quitting early without triggering an actual change to the underlying event (if not unsaved).
            callback();
        } else {
            //Change the period of a real event.
            var after = function (createException) {
                new gmgps.cloud.http("calendar-moveEvent").ajax(
                    {
                        args: {
                            id: event.id,
                            instanceId: createException
                                ? event.data.InstanceId
                                : 0,
                            start: event.start,
                            end: event.end,
                            originalPartyId: fromUserId,
                            newPartyId: toUserId
                        },
                        complex: true,
                        dataType: 'json',
                        type: 'post',
                        url: '/Diary/UpdateEventPeriod'
                    },
                    function (response) {
                        callback(response.Data);
                    }
                );
            };

            var confirmChangeEvent = function () {
                //If the event is recurring, ask whether to move the instance or the series.
                // - Don't ask if the instance is already an exception.
                if (event.data.IsRecurring && !event.data.IsException) {
                    //If the recurring event was moved to a different day, explain that only the instance can be moved in this way, not the series.
                    if (dayDelta != 0) {
                        showDialog({
                            type: 'question',
                            title: 'Recurring Appointment',
                            msg:
                                '{0}<br/><br/>This is a recurring appointment.<br/><br/>'.format(
                                    me.getEventDescription(event)
                                ) +
                                'This occurrence can be moved to the new day, but to change the day for the whole series, choose "Amend Series".',
                            buttons: {
                                'Move this Occurrence': function () {
                                    $(this).dialog('close');
                                    after(true);
                                },
                                'Amend Series': function () {
                                    $(this).dialog('close');
                                    me.editEvent(event, true);
                                },
                                Cancel: function () {
                                    $(this).dialog('close');
                                    revertFunc();
                                }
                            }
                        });
                    } else {
                        showDialog({
                            type: 'question',
                            title: 'Recurring Appointment',
                            msg: '{0}<br/><br/>This is a recurring appointment.<br/><br/>Move this occurrence or the series?'.format(
                                me.getEventDescription(event)
                            ),
                            buttons: {
                                'Move this Occurrence': function () {
                                    $(this).dialog('close');
                                    after(true);
                                },
                                'Move the Series': function () {
                                    $(this).dialog('close');
                                    after(false);
                                },
                                Cancel: function () {
                                    $(this).dialog('close');
                                    revertFunc();
                                }
                            }
                        });
                    }
                } else {
                    //Non-recurring event or exception.
                    // - Note that event.data.IsException is passed to after() so that if this is an exception, it will continue to be treated as such.
                    if (me.cfg.promptBeforeEventMove) {
                        //Prompt required - ask before moving/rescheduling the event.
                        showDialog({
                            type: 'question',
                            title: 'Move Appointment?',
                            msg: '{0}<br/><br/>Permanently reschedule this appointment?'.format(
                                me.getEventDescription(event)
                            ),
                            buttons: {
                                Yes: function () {
                                    $(this).dialog('close');
                                    after(event.data.IsException);
                                },
                                No: function () {
                                    $(this).dialog('close');
                                    revertFunc();
                                }
                            }
                        });
                    } else {
                        //No prompt required, go ahead and move/reschedule the event.
                        after(event.data.IsException);
                    }
                }
            };

            confirmChangeEvent();
        }
    },

    getEventDescription: function (event) {
        var s;

        if (event.allDay) {
            s = event.start.toString('ddd dd MMM yyyy') + ' - All Day';
        } else {
            s =
                event.start.toString('ddd dd MMM yyyy HH:mm') +
                ' to ' +
                event.end.toString('HH:mm');
        }

        return '<div class="bold">{0}</div>{1}'.format(event.title, s);
    },

    pnUpdate: function (pn) {
        var me = this;

        var $interestedCalendars = $([]);

        //Exit without fetching the updated event if any of our conditions below are true.
        me.$calendars.each(function (i, v) {
            var $calendar = $(v);

            if (me.canEventBeIgnored($calendar, pn)) {
                //When an event can be ignored, it may be the case that it is currently visible and now needs to be removed.
                //This can happen for lots of reasons (e.g. moved out of range, party changes, cancelled, etc)
                //so a good catch-all is to ask the fullCalendar to remove it always.
                $calendar.fullCalendar('removeEvents', pn.Ids[0]);
            } else {
                //This calendar can not ignore this event.  Schedule an add or update.
                $interestedCalendars.push($calendar);
            }
        });

        if ($interestedCalendars.length !== 0) {
            if (pn.Data.IsRecurring) {
                //Process a recurring event (instances and exceptions)
                me.getRecurringEvent(
                    $interestedCalendars,
                    pn.Ids[0],
                    function (recurringEvent) {
                        if (recurringEvent) {
                            me.addOrUpdateRecurringEventOnCalendar(
                                $interestedCalendars,
                                recurringEvent
                            );
                        }
                    }
                );
            } else {
                //Process a single event.
                me.getEvent($interestedCalendars, pn.Ids[0], function (event) {
                    if (event) {
                        me.addOrUpdateEventOnCalendar(
                            $interestedCalendars,
                            event
                        );
                    }
                });
            }
        }
    },

    canEventBeIgnored: function ($calendar, pn) {
        var me = this;

        //Given a calendar, see if the pn can be ignored based upon some rules.
        if (me.canEventBeIgnored_EventIsNotActive($calendar, pn)) {
            return true;
        }
        if (
            me.canEventBeIgnored_IsOutsideScopeOfCurrentToolbarToggles(
                $calendar,
                pn
            )
        ) {
            return true;
        }
        if (
            me.canEventBeIgnored_BranchCalendarMode_UsersBranchListDoesNotIntersectBranchVisibilityList(
                $calendar,
                pn
            )
        ) {
            return true;
        }
        if (
            me.canEventBeIgnored_BranchCalendarMode_ButEventIsNotVisibleToBranch(
                $calendar,
                pn
            )
        ) {
            return true;
        }

        if (pn.Data.IsRecurring) {
            //It's possible SingleUserCalendarModeButUserIsNotAParty could also be used for rec.events in future, prior to quitting here.
            //For this to happen, the server would need to send back all parties for the root instance and all exceptions.  It could be that it does already.
            return false;
        }

        if (
            me.canEventBeIgnored_SingleUserCalendarModeButUserIsNotAParty(
                $calendar,
                pn
            )
        ) {
            return true;
        }
        if (me.canEventBeIgnored_FallsOutsideOfVisibleRange($calendar, pn)) {
            return true;
        }

        return false;
    },

    canEventBeIgnored_EventIsNotActive: function ($calendar, pn) {
        return pn.Data.Status !== C.EventStatus.Active;
    },

    canEventBeIgnored_BranchCalendarMode_UsersBranchListDoesNotIntersectBranchVisibilityList:
        function ($calendar, pn) {
            var me = this;

            if (me.mode === C.CalendarMode.Branch) {
                //Get the user's allowed branches from the shell and attempt to intersect them with the branch
                //visibility list. If there are no matches then the event can be ignored
                var userHasAccessToBranch =
                    pn.Data.BranchVisibilityList.filter(
                        (x) => shell.linkedBranchIds.indexOf(x) !== -1
                    ).length !== 0;

                return !userHasAccessToBranch;
            }

            return false;
        },

    canEventBeIgnored_BranchCalendarMode_ButEventIsNotVisibleToBranch:
        function ($calendar, pn) {
            var me = this;

            if (me.mode === C.CalendarMode.Branch) {
                var calendarBranchId = parseInt($calendar.data('id'));

                //For 'All Branches' calendar view - don't ignore the event, as we already determined
                //the user has access to this event's branch
                if (calendarBranchId === 0) {
                    return false;
                }

                //Otherwise ignore the event if the currently displayed branch calendar
                //is not included in the branch visibility list of the event
                var branchIsInTheVisibilityList =
                    pn.Data.BranchVisibilityList.indexOf(calendarBranchId) !==
                    -1;
                return !branchIsInTheVisibilityList;
            }

            return false;
        },

    canEventBeIgnored_SingleUserCalendarModeButUserIsNotAParty: function (
        $calendar,
        pn
    ) {
        var me = this;

        if (
            me.mode === C.CalendarMode.Me ||
            me.mode === C.CalendarMode.User ||
            me.mode === C.CalendarMode.Group ||
            me.mode === C.CalendarMode.BranchResource
        ) {
            var calendarUserId = parseInt($calendar.data('id'));

            var calendarUserIsAParty =
                $.grep(pn.Data.Parties, function (item) {
                    return (
                        item.ContextModelTypeId === C.ModelType.User &&
                        item.ModelId === calendarUserId
                    );
                }).length !== 0;

            return !calendarUserIsAParty;
        }

        return false;
    },

    canEventBeIgnored_IsOutsideScopeOfCurrentToolbarToggles: function (
        $calendar,
        pn
    ) {
        var me = this;

        if (pn.Data.IsRecurring && !me.searchFilters.recurring) {
            return false;
        }

        switch (pn.Data.EventTypeId) {
            case C.EventType.General:
                return !me.searchFilters.general;
            case C.EventType.Viewing:
                return !(
                    me.searchFilters.viewingsA || me.searchFilters.viewingsU
                );
            case C.EventType.Valuation:
                return !me.searchFilters.appraisals;
            default:
                return false;
        }
    },

    canEventBeIgnored_FallsOutsideOfVisibleRange: function ($calendar, pn) {
        //Is the event outside of the range of the current, visible view?
        var view = $calendar.fullCalendar('getView');
        var viewStart = Date.parse(view.start);
        var viewEnd = Date.parse(view.end);
        var eventStart = Date.parse(pn.Data.StartDate);
        var eventEnd = Date.parse(pn.Data.EndDate);
        if (!(eventStart <= viewEnd && eventEnd >= viewStart)) {
            //No overlap.
            return true;
        }

        return false;
    },

    refresh: function (searchFilters) {
        var me = this;

        //If new searchFilters were supplied, set them now.
        if (searchFilters) {
            me.searchFilters = searchFilters;
        }

        //Ask the calendar(s) to re-fetch their events.
        me.$calendars.fullCalendar('refetchEvents');
    },

    rerender: function () {
        var me = this;

        setTimeout(function () {
            me.$calendars.fullCalendar('rerenderEvents');
        }, 1);
    },

    renderCalendars: function () {
        var me = this;

        //Setup calendar Picker.
        me.showCalendarPicker(me.month, me.year, function () {
            me.updateCalendarPickerCellHighlights();
        });
    },

    renderEvent: function (event, $e) {
        var me = this;

        //Add a class to signify the calendar view name and mode.
        $e.addClass('v-{0}'.format(me.viewName)).addClass(
            'm-{0}'.format(me.getCalendarModeCssClass(me.mode))
        );

        $e.attr('data-id', event.id);
        $e.attr('data-instance-id', event.data.InstanceId);
        var negCodes;
        if (event.data && event.data.NegotiatorReferenceCodes) {
            //Do not render neg reference codes if this is the diary for the current user and there's only one associated
            //  user on the event, that being the current user.
            if (
                !(
                    event.data.NegotiatorReferenceCodes.length == 1 &&
                    event.data.NegotiatorReferenceCodes[0] ==
                        me.cfg.userReferenceCode &&
                    me.mode == C.CalendarMode.Me
                )
            ) {
                negCodes = '<div class="neg-codes">';
                $.each(event.data.NegotiatorReferenceCodes, function (i, v) {
                    negCodes += '<div class="{0}">{1}</div>'.format(
                        me.cfg.userReferenceCode == v ? 'on' : '',
                        v
                    );
                });
                negCodes += '</div>';
            }
        }

        var $t = $e.find('.fc-event-title');

        switch (me.viewName) {
            case 'agendaDay':
                switch (event.data.Type) {
                    case C.EventType.Viewing:
                        $t[0].innerHTML = 'View: {0} - {1} - {2}'.format(
                            event.data.Location,
                            event.PreviewNames,
                            event.data.Notes
                        );
                        break;
                    case C.EventType.Valuation:
                        $t[0].innerHTML = 'MA: {0} {1}'.format(
                            event.data.Location,
                            event.data.Notes
                        );
                        break;
                    case C.EventType.General:
                        $t[0].innerHTML += ': {0} {1}'.format(
                            event.data.Location,
                            event.data.Notes
                        );
                        break;
                    default:
                        break;
                }
                break;
            case 'agendaWeek':
                switch (event.data.Type) {
                    case C.EventType.Viewing:
                        $t[0].innerHTML = 'View: {0} - {1} - {2}'.format(
                            event.data.Location,
                            event.PreviewNames,
                            event.data.Notes
                        );
                        break;
                    case C.EventType.Valuation:
                        $t[0].innerHTML = 'MA: {0} {1}'.format(
                            event.data.Location,
                            event.data.Notes
                        );
                        break;
                    case C.EventType.General:
                        $t[0].innerHTML += ': {0} {1}'.format(
                            event.data.Location || '',
                            event.data.Notes
                        );
                        break;
                    default:
                        break;
                }
                break;
            case 'month':
                switch (event.data.Type) {
                    case C.EventType.Viewing:
                        $t[0].innerHTML = 'View: {0} - {1}'.format(
                            event.data.Location,
                            event.PreviewNames
                        );
                        break;
                    case C.EventType.Valuation:
                        $t[0].innerHTML = 'MA: {0}'.format(event.data.Location);
                        break;
                    case C.EventType.General:
                        $t[0].innerHTML += ' {0} {1}'.format(
                            event.data.Location,
                            event.data.Notes
                        );
                        break;
                    default:
                        break;
                }
                break;
            case 'basicDay':
                switch (event.data.Type) {
                    case C.EventType.Viewing:
                        $t[0].innerHTML = 'View: {0} - {1}'.format(
                            event.data.Location,
                            event.PreviewNames
                        );
                        break;
                    case C.EventType.Valuation:
                        $t[0].innerHTML = 'MA: {0}'.format(event.data.Location);
                        break;
                    case C.EventType.General:
                        $t[0].innerHTML += ' {0} {1}'.format(
                            event.data.Location,
                            event.data.Notes
                        );
                        break;
                    default:
                        break;
                }
                break;
            case 'basicWeek':
                switch (event.data.Type) {
                    case C.EventType.Viewing:
                        $t[0].innerHTML = 'View: {0} - {1}'.format(
                            event.data.Location,
                            event.PreviewNames
                        );
                        break;
                    case C.EventType.Valuation:
                        $t[0].innerHTML = 'MA: {0}'.format(event.data.Location);
                        break;
                    case C.EventType.General:
                        $t[0].innerHTML += ' {0} {1}'.format(
                            event.data.Location,
                            event.data.Notes
                        );
                        break;
                    default:
                        break;
                }
                break;
        }

        //Append neg codes.
        if (negCodes) {
            if (event.data && event.data.NegotiatorReferenceCodes) {
                $e.find('.fc-event-title').append($(negCodes));
            }
        }

        //Viewing Specific
        if (event.data.Type == C.EventType.Viewing) {
            //Append confirmed symbol (future viewings only);
            if (
                event.data.ConfirmationStatus !=
                C.PartyConfirmationStatus.NotRequired
            ) {
                if (
                    event.data.ConfirmationStatus ==
                    C.PartyConfirmationStatus.Confirmed
                ) {
                    $t[0].innerHTML += '<span class="bold"> ✔<span>';
                } else {
                    $t[0].innerHTML += '<span class="bold"> U/C</span>';
                }
            }

            //Append keys symbol (ony set on future viewings, always false otherwise);
            if (event.data.ViewingPropertyHasKeys) {
                $e.append('<div class="t-key"></div>');
            }

            //Meet at Property (ony set on future viewings);
            if (
                event.data.ViewingMeetingPlaceType ==
                C.ViewingMeetingPlaceType.AtTheProperty
            ) {
                $e.append('<div class="t-property"></div>');
            }

            //Meet at Office (ony set on future viewings);
            if (
                event.data.ViewingMeetingPlaceType ==
                C.ViewingMeetingPlaceType.AtTheOffice
            ) {
                $e.append('<div class="t-office"></div>');
            }
        }

        //Append recurring symbol.
        if (event.data && event.data.IsRecurring) {
            $e.append('<div class="t-r"></div>');
        }

        me.addClasses(event, $e);

        $e.data('previewtitle', event.PreviewTitle).data(
            'previewsubtitle',
            event.PreviewSubTitle
        );

        //Tooltips
        var tooltipTitleTemplate =
            '<div style="font-size: 15px; font-weight: bold;">{0}</div><div style="font-size: 12px;">{1}</div>';
        $e.one('mouseenter', function () {
            var $f = $(this);
            var diaryEventId = event.id;

            var instanceId = event.data.InstanceId;

            if (diaryEventId === 0) {
                return false;
            }

            $f.qtip({
                overwrite: false,
                content: {
                    title: tooltipTitleTemplate.format(
                        $f.data('previewtitle'),
                        $f.data('previewsubtitle') || ''
                    ),
                    text: function (e, api) {
                        me.getPreview(diaryEventId, instanceId).then(function (
                            html
                        ) {
                            api.set('content.text', html);
                        });
                    }
                },
                show: {
                    delay: 333,
                    solo: true,
                    ready: true,
                    effect: function () {
                        $(this).fadeIn(); // "this" refers to the tooltip
                    }
                },
                hide: { delay: 0 },
                position: {
                    target: 'mouse',
                    adjust: { x: 15, y: 15 },
                    viewport: $('#diary')
                },
                style: {
                    classes: 'qtip-bootstrap qtip-shadow'
                }
            });
        });

        return $e;
    },

    getPreview: function (diaryEventId, instanceId) {
        var deferred = $.Deferred();

        new gmgps.cloud.http("calendar-getPreview").ajax(
            {
                args: {
                    diaryEventId: diaryEventId,
                    settings: {
                        id: 0,
                        mode: 0,
                        search: null,
                        truncateNotes: true,
                        previewInstanceId: instanceId
                    }
                },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/diary/getcalendareventpreview'
            },
            function (response) {
                deferred.resolve(response.Data);
            }
        );

        return deferred.promise();
    },

    killTooltips: function () {
        $('div[id^="qtip-"]').each(function () {
            var $q = $(this);

            var q = $q.data('qtip');

            if (q != undefined) {
                q.destroy(true);
            }

            $q.remove();
        });
    },

    addClasses: function (event, $e) {
        switch (event.data.ConfirmationStatus) {
            case C.PartyConfirmationStatus.Unconfirmed:
                $e.addClass('cal-entry-unconfirmed');
                break;
            case C.PartyConfirmationStatus.Confirmed:
                $e.addClass('cal-entry-confirmed');
                break;
        }

        switch (event.data.ViewingType) {
            case C.ViewingType.Accompanied:
                $e.addClass('cal-entry-accompanied');
                break;
            case C.ViewingType.Unaccompanied:
                $e.addClass('cal-entry-unaccompanied');
                break;
        }
    },

    setCustomPeriodMode: function (on) {
        var me = this;

        //Exit early if the requested mode is already set.
        if (me.customPeriod == on) return;

        //Set the customPeriod flag.
        me.customPeriod = on;

        var agendaWeekText = on ? 'Period' : 'Week';
        var basicWeekText = on ? 'Period Summary' : 'Week Summary';

        //Edit the button text to reflect the customPeriod mode.
        me.$masterCalendar
            .find('.fc-button-agendaWeek .fc-button-content')
            .text(agendaWeekText);
        me.$masterCalendar
            .find('.fc-button-basicWeek .fc-button-content')
            .text(basicWeekText);
    }
};
