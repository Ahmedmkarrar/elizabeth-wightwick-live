/* eslint-disable no-unused-vars */
(function ($) {
    $.fn.serializeObject = function () {
        var o = {};
        var a = this.serializeArray();
        $.each(a, function () {
            if (o[this.name] !== undefined) {
                if (!o[this.name].push) {
                    o[this.name] = [o[this.name]];
                }
                o[this.name].push(this.value || '');
            } else {
                o[this.name] = this.value || '';
            }
        });
        return o;
    };
    //Reverse plugin.
    // Use with .each, e.g.: $(...).reverse().each(..
    $.fn.reverse = [].reverse;

    //Mini Diary
    $.fn.miniDiary = function (options) {
        //Defaults
        var settings = {
            autoCloseAfterEventMoved: false, //Automatically closes the mini diary when the highlighted event has been moved.
            userId: shell.userId, //Id of the launching user
            groupId: 0, //Id of the group (optional)
            mode: C.CalendarMode.Me, //Mode of the diary (Me/Group).
            allowCreate: false,
            allowEdit: false,
            $start: null, //When supplied, these fields will get updated.
            $end: null,
            defaults: {
                //Default start datetime and viewname.
                viewName: 'agendaDay',
                start: new Date()
            },
            useStartForFirstHour: false, //Force the start datetime to be used for the first hour.
            searchFilters: {
                //Events to include in the diary.
                viewingsA: true,
                viewingsU: true,
                appraisals: true,
                general: true,
                recurring: true
            },
            width: 900, //Width of the diary.
            height: 530, //Height of the diary.
            onCreateEvent: null, //Callback when an event is created (do not use in conjunction with onPeriodSelected).
            onPeriodSelected: null, //Callback when a period is selected (do not use in conjunction with onCreateEvent).
            onViewChanged: null, //Callback when the view changes.
            useTumblers: true,
            onChanged: null,
            onControlRendered: null // callback when diary control has been created/rendered
        };

        return this.each(function () {
            if (options) {
                $.extend(settings, options);
            }

            var $me = $(this);
            var $window = null;

            //Config for this instance (obtained from originally supplied source element).
            var cfg = {
                eventId: parseInt($me.attr('data-eventId')),
                isRecurring: $me.attr('data-isRecurring') == 'true',
                userId: parseInt($me.attr('data-userId')),
                userName: $me.attr('data-userName'),
                start: Date.parse($me.attr('data-startDateTime')),
                end: Date.parse($me.attr('data-endDateTime')),
                allDay: $me.attr('data-allDay') == 'True',
                ghostEvents: null
            };

            //Func to return formatted datetimes for start, end and period.
            // - Used in data attributes and display text.
            var getDateTimeStrings = function (start, end, allDay) {
                //#todo - periods stretching into another day.

                var strings;

                if (allDay) {
                    //All day event.
                    strings = {
                        start: start.toString('ddd dd MMM yyyy'),
                        end: end.toString('ddd dd MMM yyyy'),
                        period: '{0} (All Day)'.format(
                            start.toString('ddd dd MMM yyyy')
                        )
                    };
                } else {
                    //Not an all day event.
                    strings = {
                        start: start.toString('ddd dd MMM yyyy HH:mm'),
                        end: end.toString('ddd dd MMM yyyy HH:mm'),
                        period: '{0} - {1}'.format(
                            start.toString('ddd dd MMM yyyy HH:mm'),
                            end.toString('HH:mm')
                        )
                    };
                }

                return strings;
            };

            var getStartEndTimes = function () {
                //Only used in tumblers mode.
                var $date = $me.find('.date');
                var $startTime = $me.find('.start-time');
                var $endTime = $me.find('.end-time');
                var startDate = Date.parseExact($date.val(), 'dd/MM/yyyy');
                var startDateTime = Date.parse(
                    '{0} {1}'.format(
                        startDate.toString('dd MMM yyyy'),
                        $startTime.val()
                    )
                );
                var endDate = Date.parseExact($date.val(), 'dd/MM/yyyy');
                var endDateTime = Date.parse(
                    '{0} {1}'.format(
                        endDate.toString('dd MMM yyyy'),
                        $endTime.val()
                    )
                );

                //Change end times of 11:59 to 11:59:59.
                var allDay = false;
                if (
                    startDateTime.toString('h:mmtt').toLowerCase() ==
                        '12:00am' &&
                    endDateTime.toString('h:mmtt').toLowerCase() == '11:59pm'
                ) {
                    endDateTime = Date.parse(
                        endDateTime.toString('ddd dd MMM yyyy HH:mm') + ':59'
                    );
                    allDay = true;
                }

                var strings = getDateTimeStrings(
                    startDateTime,
                    endDateTime,
                    allDay
                );

                //Update the associated start/end fields.
                if (settings.$start && settings.$end) {
                    settings.$start.val(strings.start);
                    settings.$end.val(strings.end);
                }

                return {
                    start: startDateTime,
                    end: endDateTime
                };
            };

            var setStartDateEndDateAttributes = function () {
                //Only used in tumblers mode.
                var dateTimes = getStartEndTimes();

                //Set the start and end time attributes.
                $me.attr(
                    'data-startDateTime',
                    dateTimes.start.toString('ddd dd MMM yyyy HH:mm')
                ).attr(
                    'data-endDateTime',
                    dateTimes.end.toString('ddd dd MMM yyyy HH:mm')
                );

                //If the start is 12:00am and the end is 11:59pm, then set the allday flag.
                if (
                    dateTimes.start.toString('h:mmtt').toLowerCase() ==
                        '12:00am' &&
                    dateTimes.end.toString('h:mmtt').toLowerCase() == '11:59pm'
                ) {
                    //Set the allDay attribute to True and add 59 seconds.
                    $me.attr('data-allDay', 'True');
                    $me.attr(
                        'data-endDateTime',
                        dateTimes.end.toString('ddd dd MMM yyyy HH:mm') + ':59'
                    );
                } else {
                    //Set the allDay attribute to False and leave the seconds off.
                    $me.attr('data-allDay', 'False');
                }
            };
            var enforceTimeFormat;
            var ensureValidTimes = function (changed) {
                var $startTime = $me.find('.start-time');
                var $endTime = $me.find('.end-time');

                //Enforce the format.
                enforceTimeFormat($startTime);
                enforceTimeFormat($endTime);

                //Only used in tumblers mode.
                var dateTimes = getStartEndTimes();

                if (changed == 'start') {
                    //Start is the lead input.
                    if (dateTimes.start > dateTimes.end) {
                        //End needs to change.
                        var newEnd = new Date(
                            dateTimes.start.valueOf()
                        ).addHours(1);
                        $endTime.val(newEnd.toString('h:mmtt').toLowerCase());
                        $me.attr(
                            'data-endDateTime',
                            newEnd.toString('ddd dd MMM yyyy HH:mm')
                        );
                    }
                } else {
                    //End is the lead input.
                    if (dateTimes.end < dateTimes.start) {
                        //Start needs to change.
                        var newStart = new Date(
                            dateTimes.end.valueOf()
                        ).addHours(-1);
                        $startTime.val(
                            newStart.toString('h:mmtt').toLowerCase()
                        );
                        $me.attr(
                            'data-startDateTime',
                            newStart.toString('ddd dd MMM yyyy HH:mm')
                        );
                    }
                }
            };

            //Convert the supplied element.
            var strings = getDateTimeStrings(cfg.start, cfg.end, cfg.allDay);

            var $control;

            if (settings.useTumblers) {
                //Use tumblers (default).
                var html = '';
                html +=
                    '<div class="mini-diary-input fields" data-eventId="{0}" data-userId="{1}" data-userName="{2}" data-groupId="{3}" data-startDateTime="{4}" data-endDateTime="{5}" data-allDay="{6}">'.format(
                        cfg.eventId,
                        cfg.userId,
                        cfg.userName,
                        0, //#todo - groupid
                        cfg.start.toString('dd MMM yyyy HH:mm:ss'),
                        cfg.end.toString('dd MMM yyyy HH:mm:ss'),
                        cfg.allDay ? 'True' : 'False'
                    );

                html += '<div class="fl">';
                html +=
                    '<input type="text" class="date date-picker" style="width: 58px;" placeholder="date" />';
                html +=
                    '<input type="text" class="start-time opt-time12h" style="width: 44px; border-left: 0px;" placeholder="from" />';
                html +=
                    '<input type="text" class="end-time opt-time12h" style="width: 44px; border-left: 0px;" placeholder="to" />';
                html += '</div>';
                html +=
                    '<div class="open-button" style="margin-left: 1px;" title="Check Diary..."></div>';

                html += '</div>';

                $control = $(html);
            } else if (settings.buttonOnly) {
                // use just a button, no additional controls
                html = '';
                html +=
                    '<div class="mini-diary-input fields" data-eventId="{0}" data-userId="{1}" data-userName="{2}" data-groupId="{3}" data-startDateTime="{4}" data-endDateTime="{5}" data-allDay="{6}">'.format(
                        cfg.eventId,
                        cfg.userId,
                        cfg.userName,
                        0, //#todo - groupid
                        cfg.start.toString('dd MMM yyyy HH:mm:ss'),
                        cfg.end.toString('dd MMM yyyy HH:mm:ss'),
                        cfg.allDay ? 'True' : 'False'
                    );

                html +=
                    '<div class="open-button" style="margin-left: 1px;" title="Check Diary..."></div>';

                html += '</div>';

                $control = $(html);
            } else {
                //Don't use tumblers.
                $control = $(
                    '<div class="mini-diary-input" data-eventId="{0}" data-userId="{1}" data-userName="{2}" data-groupId="{3}" data-startDateTime="{4}" data-endDateTime="{5}" data-allDay="{6}">'.format(
                        cfg.eventId,
                        cfg.userId,
                        cfg.userName,
                        0, //#todo - groupid
                        cfg.start.toString('dd MMM yyyy HH:mm:ss'),
                        cfg.end.toString('dd MMM yyyy HH:mm:ss'),
                        cfg.allDay ? 'True' : 'False'
                    ) +
                        '<div class="datetime">{0}</div>'.format(
                            strings.period
                        ) +
                        '<div class="open-button"></div>' +
                        '<div class="clear"></div>' +
                        '</div>'
                );
            }

            $me.replaceWith($control);

            if (settings.onControlRendered) {
                settings.onControlRendered($control);
            }

            if (settings.useTumblers) {
                //Setup tumbler components.
                $control.find('.date').val(cfg.start.toString('dd/MM/yyyy'));

                //Date Pickers
                $control.find('.date').datepicker({
                    numberOfMonths: 2,
                    showButtonPanel: true,
                    dateFormat: 'dd/mm/yy',
                    onClose: function () {
                        setStartDateEndDateAttributes();

                        if (settings.onChanged) {
                            settings.onChanged();
                        }
                    }
                });

                //Date
                $control.on('change', '.date', function () {
                    setStartDateEndDateAttributes();
                });

                //Funcs to process changes to start and end times.
                enforceTimeFormat = function ($e) {
                    //Remove any spaces.
                    var val = $e.val().replace(/ /g, '');
                    $e.val(val);

                    //Check format.
                    var regex = /(1[0-2]|[0-9]):([0-5][0-9])(am|pm)/;
                    if (!regex.test(val)) {
                        $e.val('9:00am');
                    }
                };
                var startTimeChanged = function () {
                    ensureValidTimes('start');
                    setStartDateEndDateAttributes();
                    $control
                        .find('.end-time')
                        .timepicker(
                            'option',
                            'durationTime',
                            getStartEndTimes()
                                .start.toString('h:mmtt')
                                .toLowerCase()
                        );
                };
                var endTimeChanged = function () {
                    ensureValidTimes('end');
                    setStartDateEndDateAttributes();
                };

                //Start-Time
                $control
                    .find('.start-time')
                    .timepicker({
                        minTime: '6:00am',
                        maxTime: '11:00pm',
                        step: 15
                    })
                    .on('changeTime', function () {
                        startTimeChanged();

                        if (settings.onChanged) {
                            settings.onChanged();
                        }
                    })
                    .val(cfg.start.toString('h:mmtt').toLowerCase());

                //End Time
                $control
                    .find('.end-time')
                    .timepicker({
                        showDuration: true,
                        minTime: '6:00am',
                        maxTime: '11:00pm',
                        step: 15,
                        durationTime: cfg.start.toString('h:mmtt').toLowerCase()
                    })
                    .on('changeTime', function () {
                        endTimeChanged();

                        if (settings.onChanged) {
                            settings.onChanged();
                        }
                    })
                    .val(cfg.end.toString('h:mmtt').toLowerCase());

                //Start-Time & End-Time > Change
                $control.on('change', '.start-time', function () {
                    startTimeChanged();
                });
                $control.on('change', '.end-time', function () {
                    endTimeChanged();
                });
            }

            $me = $control;

            var setupWindow = function ($f, onReady) {
                new gmgps.cloud.ui.controls.window({
                    title: '',
                    $content: $f,
                    width: settings.width,
                    nopadding: true,
                    draggable: true,
                    modal: true,
                    actionButton: null,
                    cancelButton: 'Ok',
                    onBeforeDisplay: function ($w, callback) {
                        // eslint-disable-next-line no-unused-vars
                        $window = $w;
                        callback();
                    },
                    onReady: function ($f) {
                        onReady($f.closest('.window'));
                    },
                    onCancel: function () {}
                });
            };

            var closeWindow = function ($w) {
                $w.find('.bottom .cancel-button').trigger('click');
            };

            var renderCalendars = function (
                mode,
                id,
                title,
                calendarDefinitions,
                $w,
                callback
            ) {
                //If there is an existing calendar in existence, destroy it.
                if (calendar) {
                    calendar.destroy();
                }
                calendar = null;

                //Empty the calendars container.
                var $calendars = $w.find('.calendars');
                $calendars.empty();

                var calendar = new gmgps.cloud.ui.controls.calendar({
                    $root: $calendars,
                    title: '',
                    events: cfg.ghostEvents,
                    highlightedEventIds: settings.highlightedEventIds,
                    highlightedInstanceId: settings.highlightedInstanceId,
                    calendarDefinitions: calendarDefinitions,
                    userReferenceCode: shell.userReferenceCode,
                    allowCreate: settings.allowCreate,
                    allowEdit: settings.allowEdit,
                    promptBeforeEventMove: true,
                    defaults: {
                        viewName:
                            mode == C.CalendarMode.Group
                                ? 'agendaDay'
                                : 'agendaWeek',
                        start: Date.parse($me.attr('data-startDateTime'))
                    },
                    useStartForFirstHour: settings.useStartForFirstHour,
                    searchFilters: settings.searchFilters,
                    onPeriodSelected: function (req) {
                        if (settings.onPeriodSelected)
                            settings.onPeriodSelected(
                                req,
                                function (authorise) {
                                    //Authorise callback - the controller will determine whether the period can be used.
                                    if (authorise) {
                                        var strings = getDateTimeStrings(
                                            req.start,
                                            req.end,
                                            req.allDay
                                        );

                                        //Set the data attributes.
                                        $me.attr(
                                            'data-startDateTime',
                                            strings.start
                                        ).attr('data-endDateTime', strings.end);

                                        //Update the associated start/end fields.
                                        if (settings.$start && settings.$end) {
                                            settings.$start.val(strings.start);
                                            settings.$end.val(strings.end);
                                        }

                                        //Set the visible text.
                                        $me.find('.datetime').text(
                                            strings.period
                                        );

                                        //Update the visible inputs (tumbler mode only)
                                        if (settings.useTumblers) {
                                            $me.find('.date').val(
                                                req.start.toString('dd/MM/yyyy')
                                            );
                                            $me.find('.start-time').val(
                                                req.start
                                                    .toString('h:mmtt')
                                                    .toLowerCase()
                                            );
                                            $me.find('.end-time').val(
                                                req.end
                                                    .toString('h:mmtt')
                                                    .toLowerCase()
                                            );
                                        }
                                    }
                                }
                            );

                        //A period has been selected - close the mini diary.
                        closeWindow($w);
                    },
                    onViewChanged: function (state) {
                        //Internal callback.
                        if (callback) callback();

                        //External callback.
                        if (settings.onViewChanged)
                            settings.onViewChanged(state);
                    },
                    onEventMoved: function (event, info) {
                        //Update input.
                        strings = getDateTimeStrings(
                            event.start,
                            event.end,
                            event.allDay
                        );
                        $me.attr('data-startDateTime', strings.start).attr(
                            'data-endDateTime',
                            strings.end
                        );

                        //Update the associated start/end fields.
                        if (settings.$start && settings.$end) {
                            settings.$start.val(strings.start);
                            settings.$end.val(strings.end);
                        }

                        //Update the visible text.
                        $me.find('.datetime').text(strings.period); //todo: update the userId once this is supported.

                        //Update the visible inputs (tumbler mode only)
                        if (settings.useTumblers) {
                            $me.find('.date').val(
                                event.start.toString('dd/MM/yyyy')
                            );
                            $me.find('.start-time').val(
                                event.start.toString('h:mmtt').toLowerCase()
                            );
                            $me.find('.end-time').val(
                                event.end.toString('h:mmtt').toLowerCase()
                            );
                        }

                        //Optional callback.
                        if (settings.onEventMoved) settings.onEventMoved(event);

                        //An event has been moved - close the mini diary.
                        // - Unless the event which was moved isn't the one which the mini diary was opened to edit.
                        if (event.id == cfg.eventId) {
                            if (settings.autoCloseAfterEventMoved) {
                                closeWindow($w);
                            }
                        }
                    }
                });
            };

            var showCalendars = function (mode, id, title, $w) {
                //Switch to User mode if Me was the mode, but the userId isn't the current user.
                if (id != settings.userId && mode == C.CalendarMode.Me) {
                    mode = C.CalendarMode.User;
                }

                //UserGroups returned.  Now fetch required calendar definitions.
                gmgps.cloud.helpers.diary.getCalendarDefinitions(
                    mode,
                    id,
                    function (calendarDefinitions) {
                        //See if the userId specified exists in one of the returned definitions.
                        // - If they do, use Group mode, else continue to use User mode.
                        if (mode != C.CalendarMode.Me) {
                            //#todo
                        }

                        //Definitions are back, render the calendar(s).
                        renderCalendars(
                            mode,
                            id,
                            title,
                            calendarDefinitions,
                            $w,
                            function () {}
                        );
                    }
                );
            };

            var openMiniDiary = function () {
                //Update the cfg.userId and cfg.userName - may have been changed externally (e.g. viewing user dropdown)
                cfg.userId = parseInt($me.attr('data-userId'));
                cfg.userName = $me.attr('data-userName');

                //Create a representation of the event for this mini diary, in ghosted form.
                cfg.ghostEvents = [];
                cfg.ghostEvents.push({
                    id: cfg.eventId,
                    linkedId: cfg.userId,
                    title: 'This Event',
                    start: Date.parse($me.attr('data-startDateTime')),
                    end: Date.parse($me.attr('data-endDateTime')),
                    url: '',
                    className: 'ghost',
                    editable: true,
                    data: {
                        IsGhost: true,
                        NegotiatorReferenceCodes: [],
                        IsRecurring: cfg.isRecurring
                    },
                    color: '#ffffff', //colours must be supplied because this event does not exist yet for the server to apply them.
                    backgroundColor: '#ff0000',
                    borderColor: '#ffffff',
                    textColor: '#ffffff'
                });

                //Assign addDay, if the end time is 23:59:59.
                $.each(cfg.ghostEvents, function (i, v) {
                    v.allDay = v.end.toString('HH:mm:ss') == '23:59:59';
                });

                //Construct a skeleton form to host the diary.
                var $form = $(
                    '<div class="mini-diary" style="height: {0}px">'.format(
                        settings.height
                    ) +
                        '<div class="calendars"></div>' +
                        '</div>'
                );

                //Setup the window.
                setupWindow($form, function ($w) {
                    //Window is ready, fetch userGroups for the current user.
                    gmgps.cloud.helpers.diary.getUserGroups(function (groups) {
                        //Create a dropdown and inject into the window title bar.
                        var $wrappedDropdown = $(
                            '<div class="window-title-insert" style="width: 348px; padding-top: 4px; margin: 0 auto; position: relative; text-align: left;">' +
                                '<select class="group-dropdown" style="width: 340px;">' +
                                '<option value="{0}" data-mode="{1}">My Diary</option>'.format(
                                    settings.userId,
                                    C.CalendarMode.Me
                                ) +
                                '</select>' +
                                '</div>'
                        );
                        $w.find('.top .title').empty().append($wrappedDropdown);

                        //Adding groups.
                        var $select = $wrappedDropdown.find('select');
                        $.each(groups, function (i, v) {
                            $select.append(
                                '<option value="{0}" data-mode="{1}">{2}</option>'.format(
                                    v.SearchId,
                                    C.CalendarMode.Group,
                                    v.Name
                                )
                            );
                        });

                        //Adding other users.
                        // - If the cfg.userId != settings.userId, add the other user to the dropdown so that their diary is accessible.
                        // - Make this the selected item, also.
                        if (cfg.userId != settings.userId) {
                            $select.prepend(
                                '<option value="{0}" data-mode="{1}">{2}</option'.format(
                                    cfg.userId,
                                    C.CalendarMode.User,
                                    cfg.userName
                                )
                            );
                            $select.val(cfg.userId).trigger('prog-change');
                        }

                        $w.find('select').customSelect();

                        //Me / Group dropdown > Change
                        $select.on('change', function () {
                            var $option = $(this).find('option:selected');
                            var id = parseInt($option.val());
                            var mode = parseInt($option.attr('data-mode'));

                            showCalendars(mode, id, $option.text(), $w);
                        });

                        showCalendars(
                            settings.mode,
                            cfg.userId,
                            $select.find('option:selected').text(),
                            $w
                        );
                    });
                });
            };

            //Plugin Target Element > Click
            $me.on('click', function () {
                //If in tumblers mode, this event does not open the mini diary.  Clicking the open-button does, instead.
                if (settings.useTumblers) {
                    return;
                } else {
                    openMiniDiary();
                }
            });

            //Open Button > Click
            $me.on('click', '.open-button', function () {
                //If not in tumblers mode, this event does not open the mini diary.  Clicking the container does, instead.
                if (!settings.useTumblers) {
                    return;
                } else {
                    openMiniDiary();
                }
            });
        });
    };

    //Simple control group plugin.  Use on UL elements.
    $.fn.controlGroup = function (options) {
        //Default settings.
        var settings = {
            onChange: null
        };

        return this.each(function () {
            var $me = $(this);

            if (options) {
                $.extend(settings, options);
            }

            //Count the options and apply a width.
            var totalWidth = $me.width();
            var count = $me.find('div').length;
            var itemWidth = Math.floor(totalWidth / count) - 1;

            //Setup class names.
            $me.find('div:first').addClass('first');
            $me.find('div:last').addClass('last');
            $me.find('div').not(':first').not(':last').addClass('mid');

            $me.find('div').css('width', '{0}px'.format(itemWidth));

            $me.on('click', 'div', function () {
                //Remove the "selected" class from the selected item.
                $me.find('div.selected').removeClass('selected');

                //Apply the "selected" class to the clicked item.
                $(this).addClass('selected');

                //onChange callback (optional)
                if (settings.onChange) {
                    settings.onChange($(this));
                }
            });
        });
    };

    //applyStandardDirtyTriggers
    $.fn.applyStandardDirtyTriggers = function (options) {
        //Default settings.
        var settings = {
            onDirty: null
        };

        return this.each(function () {
            var $me = $(this);

            if (options) {
                $.extend(settings, options);
            }

            //Func to conditionally call the onDirty callback.
            var setDirty = function () {
                if (settings.onDirty) settings.onDirty();
            };

            //Dropdown > Change
            $me.on('change', 'select:not(.opt-noDirtyTrigger)', function () {
                setDirty();
            });

            //Textbox > KeyUp
            $me.on(
                'keyup',
                'input:not(:checkbox):not(.opt-noDirtyTrigger)',
                function (e) {
                    if (!gmgps.cloud.helpers.general.isDeadKey(e)) {
                        setDirty();
                    }
                }
            );

            //Textbox > Change
            $me.on('change', 'input:not(.opt-noDirtyTrigger)', function (e) {
                setDirty();
            });

            //Textbox > Paste
            $me.on('paste', function (e) {
                // need to do this way as the jQuery on(event) does not work for the paste event when a selector is specified
                if ($(e.target).hasClass('opt-noDirtyTrigger')) return;
                setDirty();
            });

            //Checkbox > Change
            $me.on('change', ':checkbox', function () {
                setDirty();
            });

            //Textarea > KeyUp
            $me.on('keyup', 'textarea:not(.opt-noDirtyTrigger)', function (e) {
                if (!gmgps.cloud.helpers.general.isDeadKey(e)) {
                    setDirty();
                }
            });
        });
    };

    //autoCompleteEx
    $.fn.autoCompleteEx = function (options) {
        //Defaults
        var settings = {
            includeContacts: true,
            includeUsers: true,
            includeDiaryUserGroups: false,
            groupId: 0,
            allowCreate: false,
            showRAF: true,
            createButtonHandler: null,
            modelType: C.ModelType.Contact,
            displayCompanyName: false,
            displayRecordType: false,
            onSelected: null,
            onAfterSelected: null,
            onBeforeRemoved: null,
            onRemoved: null,
            placeholder: null,
            closeAfterSelect: true,
            search: {
                //default search criteria if none was supplied.
                Archived: C.ArchivedSelectionType.ActiveRecordsOnly,
                QueryMatchOnNameAndAddressOnly: true,
                SearchPage: {
                    Index: 1,
                    Size: 100
                },
                SearchOrder: {
                    By: C.SearchOrderBy.SearchScore,
                    Type: C.SearchOrderType.Descending
                }
            }
        };

        return this.each(function () {
            if (options) {
                $.extend(settings, options);
            }

            var $me = $(this);

            //Copy the includeUsers & includeContacts switches onto the search object.
            settings.search.groupId = settings.groupId;
            settings.search.includeUsers = settings.includeUsers;
            settings.search.includeContacts = settings.includeContacts;
            settings.search.includeDiaryUserGroups =
                settings.includeDiaryUserGroups;
            settings.search.displayCompanyName = settings.displayCompanyName;

            //Checks
            if ($me.attr('data-id') == undefined) {
                //input field must have a data-id, even if it's zero.
                $me.attr('data-id', 0);
            }

            //If this textbox has already been converted to an auto-complete control, then we don't need to adjust the UI,
            //  only apply events and stuff.  For this, refix will be true.
            var refix = $me.hasClass('has-autocomplete');

            if (!refix) {
                $me.addClass('has-autocomplete');
            }

            //Func to fetch results (used by jQuery autocomplete instead of it's own built-in func)
            var source = function (request, callback) {
                if (request.term == '#RAF#') {
                    settings.search.Query = '';
                    settings.search.SearchId = C.FactorySearchId.Recents;
                } else {
                    settings.search.Query = request.term;
                    settings.search.SearchId = C.FactorySearchId.Unspecified;
                }

                gmgps.cloud.helpers.general.getAutoCompleteList(
                    settings.modelType,
                    settings.search,
                    callback
                );
            };

            var showSelection = function (
                id,
                branchId,
                modelType,
                value,
                udf1,
                udf2,
                udf3,
                udf4,
                udf5,
                udf6,
                udf7,
                udf8,
                consents,
                udf9
            ) {
                //Hide the textbox (unless settings say not to)
                if (settings.closeAfterSelect) $me.hide();

                var text = value;
                if (
                    modelType == C.ModelType.Contact &&
                    udf6 &&
                    !settings.displayCompanyName
                ) {
                    text = udf6;
                }
                if (
                    modelType == C.ModelType.Contact &&
                    udf8 &&
                    settings.displayCompanyName
                ) {
                    text = udf8;
                }

                var selectedClass = '';

                switch (modelType) {
                    case C.ModelType.Property:
                        selectedClass = 'property';
                        break;
                    case C.ModelType.Contact:
                        selectedClass = 'contact';
                        break;
                    case C.ModelType.Tenancy:
                        selectedClass = 'tenancy';
                        break;
                    case C.ModelType.GroupBankAccount:
                        selectedClass = 'property';
                        break;
                }

                var $sel = $me.parent().find('.selection').show();
                $sel.find('.text')
                    .removeClass('contact property tenancy')
                    .addClass(selectedClass)
                    .addClass(
                        modelType == C.ModelType.Property
                            ? 'property'
                            : modelType == C.ModelType.Contact ||
                              modelType == C.ModelType.Tenant
                            ? 'contact'
                            : 'tenancy'
                    )
                    .attr('data-id', id)
                    .attr('data-branchId', branchId)
                    .attr('data-modelType', modelType)
                    .attr('data-pre', value)
                    .html(text)
                    .show();

                //Set textbox data attributes for the selected item.
                $me.attr('data-id', id)
                    .attr('data-branchId', branchId)
                    .attr('data-modelType', modelType)
                    .attr('data-value', value)
                    .attr('data-udf1', udf1)
                    .attr('data-udf2', udf2)
                    .attr('data-udf3', udf3)
                    .attr('data-udf4', udf4)
                    .attr('data-udf5', udf5)
                    .attr('data-udf6', udf6)
                    .attr('data-udf7', udf7)
                    .attr('data-udf8', udf8)
                    .attr('data-udf9', udf9)
                    .attr('data-consents', JSON.stringify(consents));

                if (consents) {
                    $me.attr(
                        'data-consent-general-marketing',
                        consents.GeneralMarketing
                    ).attr(
                        'data-consent-property-matching',
                        consents.PropertyMatching
                    );
                }
            };

            $.fn.autoCompleteEx.showSelected = function (
                id,
                branchId,
                modelType,
                value,
                udf1,
                udf2,
                udf3,
                udf4,
                udf5,
                udf6,
                udf7,
                udf8,
                consents,
                udf9
            ) {
                showSelection(
                    id,
                    branchId,
                    modelType,
                    value,
                    udf1,
                    udf2,
                    udf3,
                    udf4,
                    udf5,
                    udf6,
                    udf7,
                    udf8,
                    consents,
                    udf9
                );
                //Callback with selected item.
                if (settings.onSelected) {
                    settings.onSelected();
                }
            };

            $me
                .autocomplete({
                    source: source,
                    minLength: 3,
                    appendTo: settings.container,
                    select: function (event, ui) {
                        //Callback with selected item.
                        if (settings.onSelected) {
                            ui.item.$e = $me;
                            var result = settings.onSelected(ui.item);
                            if (result === false) {
                                return false;
                            }
                        }

                        showSelection(
                            ui.item.id,
                            ui.item.branchId,
                            ui.item.modelType,
                            ui.item.value,
                            ui.item.udf1,
                            ui.item.udf2,
                            ui.item.udf3,
                            ui.item.udf4,
                            ui.item.udf5,
                            ui.item.udf6,
                            ui.item.udf7,
                            ui.item.udf8,
                            ui.item.consents,
                            ui.item.udf9
                        );

                        if (settings.onAfterSelected) {
                            var resultOfAfterSelected =
                                settings.onAfterSelected();
                            if (resultOfAfterSelected === false) {
                                return false;
                            }
                        }
                    }
                })
                .data('uiAutocomplete')._renderItem = function (ul, item) {
                var html = '<li>';

                switch (settings.modelType) {
                    case C.ModelType.Property:
                        html += '<a>' + item.label;
                        if (settings.displayRecordType) {
                            html += ' - ' + gmgps.cloud.helpers.property.getPropertyLabel(item.udf4);
                        }
                        html += '</a>';
                        break;
                    case C.ModelType.Contact:
                        html +=
                            '<a><div>' +
                            item.label +
                            ' (' +
                            item.desc +
                            ')</div>';
                        html += '<div class="l2">' + item.udf1 + '</div></a>';
                        break;
                    case C.ModelType.Tenancy:
                        html += '<a>' + item.desc + '</a>';
                        html += '<div class="l2">' + item.udf1 + '</div></a>';
                        break;
                    case C.ModelType.Tenant:
                        html += '<a>' + item.label + '</a>';
                        html += '<div class="l2">' + item.desc + '</div></a>';
                        break;
                    case C.ModelType.GroupBankBranch:
                        html += '<a>' + item.value + '</a>';
                        html += '<div class="l2">' + item.desc + '</div></a>';
                        break;
                    default:
                        html += '<a>' + item.label + ' (' + item.desc + ')</a>';
                        break;
                }

                html += '</li>';
                return $(html).data('item.autocomplete', item).appendTo(ul);
            };

            //Placeholder
            if (settings.placeholder)
                $me.attr('placeholder', settings.placeholder);
            $me.placeholder(); //For IE and older browsers

            var btnClass =
                settings.modelType === C.ModelType.Property
                    ? 'raf-button-property'
                    : 'raf-button-contact';

            if (settings.modelType === C.ModelType.Tenancy) {
                btnClass = 'raf-button-tenancy';
            }

            //Plugin wrapper.
            if (!refix) {
                $me.wrap(
                    '<div class="auto-complete" style="width: ' +
                        $me.outerWidth() +
                        'px;"></div>'
                );
            }

            var $container = $me.closest('.auto-complete');

            //Selection container and fav button.
            var $fav;
            var $create;
            if (!refix) {
                //Selection div.
                $(
                    '<div class="selection hidden"><div class="text preview-link"></div><div class="cancel" title="Change the Selection"></div></div>'
                ).insertAfter($me);

                if (settings.showRAF) {
                    //Raf button
                    $fav = $(
                        '<div class="raf" title="Select from your Recent & Favourites"><div class="' +
                            btnClass +
                            '"></div></div>'
                    );
                    $fav.insertAfter($me);
                }

                //Create button
                if (settings.allowCreate) {
                    $create = $(
                        '<div class="create bgg-contact" title="Add a new record">Add New</div>'
                    );
                    $create.insertAfter($me);
                    $(
                        '<div class="ip-new-contact opt-validate"></div>'
                    ).insertAfter($me);
                }
            } else {
                //Find the fav button.
                $fav = $container.find('.raf');
                $create = $container.find('.create');
            }

            var removeCurrentSelection = function ($cancelButton) {
                //Func to remove the current selection.
                var after = function () {
                    $cancelButton.closest('.selection').hide();

                    $me.val('')
                        .attr('data-pre', '')
                        .attr('data-id', 0)
                        .attr('data-branchId', 0)
                        .attr('data-modelType', 0)
                        .attr('data-value', 0)
                        .attr('data-udf1', '')
                        .attr('data-udf2', '')
                        .attr('data-udf3', '')
                        .attr('data-udf4', '')
                        .attr('data-udf5', '')
                        .attr('data-udf6', '')
                        .attr('data-udf7', '')
                        .attr('data-udf8', '')
                        .attr('data-udf9', '')
                        .data('placeholderEnabled', false) // IE fix for placeholder not working after cancel
                        .attr('data-consents', null)
                        .attr('data-consent-general-marketing', '')
                        .attr('data-consent-property-matching', '')
                        .show();
                };

                //Callback with selected item.
                if (settings.onRemoved) {
                    var id = parseInt($me.attr('data-id'));
                    if (id !== 0) {
                        if (settings.onBeforeRemoved) {
                            //The host would like to be notified before proceeding with removal.
                            settings.onBeforeRemoved(id, function () {
                                after();
                                settings.onRemoved(id);
                            }, $me);
                        } else {
                            //The host doesn't care to be notified - go ahead and remove the selection.
                            after();
                            settings.onRemoved(id, $container);
                        }
                    }
                } else {
                    //The host doesn't care to be notified - go ahead and remove the selection.
                    after();
                }
            };

            //Cancel Selection Button > Click
            $container.on('click', '.cancel', function () {
                var $cancelButton = $(this);
                removeCurrentSelection($cancelButton);
            });

            $container.on('prog-remove', function () {
                var $cancelButton = $container.find('.cancel');
                removeCurrentSelection($cancelButton);
            });

            //Fav Button > Click
            $container.on('click', '.raf', function () {
                $me.autocomplete('search', '#RAF#');

                $container.find('.ip-new-contact').hide();
            });

            //Create button > Click
            $container.on('click', '.create', function () {
                //Insert a fresh ip new contact template form.

                if (settings.createButtonHandler !== null) {
                    settings.createButtonHandler($(this));
                    return true;
                }

                var $ip = $container.find('.ip-new-contact');

                var parentModal = $(this).closest('.ui-draggable');
                var offset = parentModal.offset();
                $ip.css('left', $(this).offset().left - $ip.width())
                    .css('top', offset.top + parentModal.height() - $ip.outerHeight())
                    .css('z-index', 10)
                    .html($('#ip-new-contact-template').clone().html())
                    .draggable();

                $ip.find('select').customSelect();
                $ip.slideDown(250);
            });

            //Create > OK > Click
            $container.on('click', '.ip-add-button', function () {
                var $ip = $container.find('.ip-new-contact');

                $ip.validationEngine({ scroll: false });
                var valid = $ip.validationEngine('validate');
                if (!valid) return false;

                var newContactCategory = parseInt(
                    $container.find('#NewContact_ContactCategory').val()
                );
                if (settings.newContactCategory)
                    newContactCategory = settings.newContactCategory;

                new gmgps.cloud.http("plugins-autoCompleteEx").ajax(
                    {
                        args: {
                            contactCategory: newContactCategory,
                            title: $container.find('#NewContact_Title').val(),
                            forename: $container
                                .find('#NewContact_Forename')
                                .val(),
                            surname: $container
                                .find('#NewContact_Surname')
                                .val(),
                            phoneType: $container
                                .find('#NewContact_PhoneType')
                                .val(),
                            phoneNumber: $container
                                .find('#NewContact_PhoneNumber')
                                .val(),
                            phoneDescription: $container
                                .find('#NewContact_PhoneDescription')
                                .val(),
                            intentionId: parseInt(
                                $container.find('#NewContact_IntentionId').val()
                            ),
                            situationId: parseInt(
                                $container.find('#NewContact_SituationId').val()
                            ),
                            disposalId: parseInt(
                                $container.find('#NewContact_DisposalId').val()
                            ),
                            emailAddress: $container
                                .find('#NewContact_EmailAddress')
                                .val(),
                            company: $container
                                .find('#NewContact_Company')
                                .val(),
                            consentPreferences: {
                                propertyMatching:       { status: $container.find('#Quick_PropertyMatching_Status').val() },
                                generalMarketing: { status: $container.find('#Quick_GeneralMarketing_Status').val() },
                                conveyancingServices: { status: $container.find('#Quick_ConveyancingServices_Status').val() },
                                financialServices: { status: $container.find('#Quick_FinancialServices_Status').val() },                             
                                relocationAgentNetwork: { status: $container.find('#Quick_RelocationAgentNetwork_Status').val() },
                                keyfloViewingNotifications: { status: $container.find('#Quick_KeyfloViewingNotifications_Status').val() },
                            }
                        },
                        complex: true,
                        background: true,
                        dataType: 'json',
                        type: 'post',
                        url: '/contact/quickcreatecontact'
                    },
                    function (response) {
                        var contact = response.Data;
                        if (contact != null) {
                            showSelection(
                                contact.Id,
                                contact.BranchId,
                                C.ModelType.Contact,
                                settings.displayCompanyName
                                    ? contact.CompanyName
                                    : contact.FormattedName,
                                null
                            );

                            //ALT-1033: Fix for IE 9 issue
                            $me.data('placeholderEnabled', false);

                            settings.onSelected({
                                $e: $me,
                                id: contact.Id,
                                branchId: contact.BranchId,
                                modelType: C.ModelType.Contact,
                                value: contact.FormattedName,
                                udf1: null
                            });

                            $ip.slideUp();
                            $ip.empty();
                        } else {
                            showInfo(
                                'Unable to create contact. Possible duplicate already exists'
                            );
                        }
                    }
                );
            });

            //Create > Cancel > Click
            $container.on('click', '.ip-cancel-button', function () {
                var $ip = $container.find('.ip-new-contact');
                $ip.validationEngine('hide');
                $ip.slideUp();
                $ip.empty();
            });

            $container.on('click', 'div.qac-consent-button', function (e) {
                var button = $(e.target).closest('div.qac-consent-button');
                var container = button.closest('tr');
                var statusElement = container.find('input.consent-status');

                var currentStatus = statusElement.val();
                var newStatus = button.attr('data-status');

                if (currentStatus === newStatus) {
                    return;
                }

                container.find('.qac-consent-button .qac-action-button')
                    .removeClass('on')
                    .addClass('off');

                button.find('.qac-action-button')
                    .removeClass('off')
                    .addClass('on');

                statusElement.val(newStatus);

            });

            //Initial setup
            var id = parseInt($me.attr('data-id'));
            var branchId = parseInt($me.attr('data-branchId'));
            var consents = {
                GeneralMarketing: $me.attr('data-consent-general-marketing'),
                PropertyMatching: $me.attr('data-consent-property-matching')
            };
            if (id !== 0) {
                //Fire the initial onSelected callback with the selection. (optional)
                if (settings.onSelected) {
                    setTimeout(function () {
                        settings.onSelected({
                            $e: $me,
                            id: id,
                            branchId: branchId,
                            modelType: settings.modelType,
                            value: $me.attr('data-pre'),
                            udf1: $me.attr('data-udf1'),
                            isSetupCallback: true
                        });
                    }, 50);
                }

                if (!refix) {
                    showSelection(
                        id,
                        branchId,
                        settings.modelType,
                        $me.attr('data-pre'),
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        consents,
                        null
                    );
                }

                if (settings.onAfterSelected) {
                    setTimeout(function () {
                        settings.onAfterSelected();
                    }, 50);
                }
            }
        });
    };

    // Animate scrolling to target element
    $.fn.scrollTo = function (target, options, callback) {
        if (typeof options == 'function' && arguments.length == 2) {
            callback = options;
            options = target;
        }
        var settings = $.extend(
            {
                scrollTarget: target,
                offsetTop: 50,
                duration: 500,
                easing: 'swing'
            },
            options
        );
        return this.each(function () {
            var scrollPane = $(this);
            var scrollTarget =
                typeof settings.scrollTarget == 'number'
                    ? settings.scrollTarget
                    : $(settings.scrollTarget);
            var scrollY =
                typeof scrollTarget == 'number'
                    ? scrollTarget
                    : scrollTarget.offset().top +
                      scrollPane.scrollTop() -
                      parseInt(settings.offsetTop);
            scrollPane.animate(
                { scrollTop: scrollY },
                parseInt(settings.duration),
                settings.easing,
                function () {
                    if (typeof callback == 'function') {
                        callback.call(this);
                    }
                }
            );
        });
    };
})(jQuery);

//charCounter
(function ($) {
    $.fn.extend({
        outerHtml: function (arg) {
            var ret;

            // If no items in the collection, return
            if (!this.length) return typeof val == 'undefined' ? this : null;
            // Getter overload (no argument passed)
            if (!arg) {
                return (
                    this[0].outerHTML ||
                    ((ret = this.wrap('<div>').parent().html()),
                    this.unwrap(),
                    ret)
                );
            }
            // Setter overload
            $.each(this, function (i, el) {
                var fnRet,
                    pass = el,
                    inOrOut = el.outerHTML ? 'outerHTML' : 'innerHTML';

                if (!el.outerHTML) el = $(el).wrap('<div>').parent()[0];

                if (jQuery.isFunction(arg)) {
                    if ((fnRet = arg.call(pass, i, el[inOrOut])) !== false)
                        el[inOrOut] = fnRet;
                } else el[inOrOut] = arg;

                if (!el.outerHTML) $(el).children().unwrap();
            });

            return this;
        },

        charCounter: function (options) {
            var settings = {
                maxLength: 100
            };

            //Iterate over the current set of matched elements
            return this.each(function () {
                if (options) {
                    $.extend(settings, options);
                }

                var $me = $(this);
                var $progressBar;
                var $count;
                var refresh = function () {
                    $me.show();

                    var text = settings.$src.val();
                    var scaledUp = text.length * 100;
                    var value = scaledUp / settings.maxLength;
                    var count = settings.maxLength - text.length;

                    if (count > 0) {
                        var bgColor =
                            text.length > parseInt(settings.maxLength * 0.9)
                                ? '#f0a900'
                                : '#aaef97';
                        $progressBar.css('background-color', bgColor);
                        $progressBar.animate(
                            {
                                width: value + '%'
                            },
                            1
                        );
                        $count.text(count);
                    } else {
                        $progressBar.css('background-color', '#ff0000');
                        settings.$src.val(text.substr(0, settings.maxLength));
                        $count.text('0');
                    }
                    return false;
                };

                //settings.src = me.$root.find($(this).data('src')),
                settings.maxLength = $(this).data('maxlength');

                $me.append(
                    '<div class="progress-bar-container"><div class="progress-bar"></div></div><div class="count"></div>'
                );
                $progressBar = $me.find('.progress-bar');
                $count = $me.find('.count');
                refresh();

                settings.$src.on('keyup', function () {
                    refresh();
                });
            });
        }
    });
})(jQuery);

//Inline Search (Contact)
(function ($) {
    $.fn._inlineSearch = function (options) {
        var textboxButtonClasses =
            'size-1 size-2 size-3 size-4 size-5 size-6 fg-property fg-contact';

        //Defaults
        var settings = {
            $groupContainer: null,
            type: 'property',
            color: 'cyan',
            defaultText: 'Search',
            modelType: null, //e.g. C.ModelType.Vendor
            $resultsContainer: null,
            itemClicked: null,
            createClicked: null,
            inputClicked: null,
            rafClicked: null,
            inputKeyUp: null,
            buttonAlign: 'right',
            coloredText: true,
            inlineSaving: false,
            smsMode: false, //If true, does not perform matching when typing if the string begins with '07'.
            onSelectionChanged: null
        };

        //Populate textboxes in a mini-form from a returned address JSON object.
        var populateAddressFromJson = function ($root, address) {
            $root
                .find('input[data-field="SubDwelling"]')
                .val(address.SubDwelling);
            $root.find('input[data-field="NameNo"]').val(address.NameNo);
            $root.find('input[data-field="Street"]').val(address.Street);
            $root.find('input[data-field="Locality"]').val(address.Locality);
            $root.find('input[data-field="Town"]').val(address.Town);
            $root.find('input[data-field="County"]').val(address.County);
            $root.find('input[data-field="Postcode"]').val(address.Postcode);
            $root.find('select[data-field="Country"]').val(address.Country);
        };

        // Transform AddressLookupFinder results to match PAF dropdown HTML format
        var transformAddressesToPafHtml = function(addresses) {
            var html = '<div class="footer mt10 paf-row">Addresses (' + 
                       addresses.length + ' found) - Click to create a new record.</div>';
            
            addresses.forEach(function(item) {
                var addr = item.Address || {};
                html += '<div style="padding: 5px;" class="row dark paf-row" ' +
                    'data-index="0" ' +
                    'data-Source="Sprift" ' +  // NEW: Use Sprift to identify new API source
                    'data-SubDwelling="' + escapeHtml(addr.SubDwelling || '') + '" ' +
                    'data-NameNo="' + escapeHtml(addr.NameNo || '') + '" ' +
                    'data-Street="' + escapeHtml(addr.Street || '') + '" ' +
                    'data-Town="' + escapeHtml(addr.Town || '') + '" ' +
                    'data-County="' + escapeHtml(addr.County || '') + '" ' +
                    'data-Postcode="' + escapeHtml(addr.Postcode || '') + '" ' +
                    'data-CountryCode="GB" ' +
                    'data-Uprn="' + escapeHtml(addr.Uprn || '') + '" ' +
                    'data-UPRN="' + escapeHtml(addr.Uprn || '') + '">' +
                    '<div class="l1">' + escapeHtml(item.Line1 || '') + '</div>' +
                    '</div>';
            });
            
            return html;
        };

        // Helper to escape HTML
        var escapeHtml = function(text) {
            var map = {
                '&': '&amp;',
                '<': '&lt;',
                '>': '&gt;',
                '"': '&quot;',
                "'": '&#039;'
            };
            return text.toString().replace(/[&<>"']/g, function(m) { return map[m]; });
        };

        var populateContactFields = function ($root, $item) {
            $root
                .find('#ContactListItem_Person1_Title')
                .val($item.data('title1'));
            $root
                .find('#ContactListItem_Person1_Forename')
                .val($item.data('forename1'));
            $root
                .find('#ContactListItem_Person1_Surname')
                .val($item.data('surname1'));
            $root
                .find('#ContactListItem_Person2_Title')
                .val($item.data('title2'));
            $root
                .find('#ContactListItem_Person2_Forename')
                .val($item.data('forename2'));
            $root
                .find('#ContactListItem_Person2_Surname')
                .val($item.data('surname2'));

            $root
                .find('#ContactListItem_HomePhone')
                .val($item.data('homePhone'));
            $root
                .find('#ContactListItem_PhoneType')
                .val($item.data('phoneType'));
            $root
                .find('#ContactListItem_EmailAddress')
                .val($item.data('emailAddress'));
        };

        var removeCancel = function ($button) {
            //Remove a selection.
            //console.debug('removeCancel: ' + $button.closest('.search-section').data('id') );
            var $search = $button.closest('.inline-search').find('.search-box');
            var $selection = $button
                .closest('.inline-search')
                .find('.selection');

            $search.show();
            $selection.hide();
            $button
                .closest('.inline-search')
                .data('id', 0)
                .removeClass('populated');

            if (settings.onSelectionRemoved) {
                settings.onSelectionRemoved($button);
            }
        };

        var reset = function ($this) {
            //Operation on the group if there is one, else operate on the single instance (this).
            var $root = settings.$groupContainer
                ? settings.$groupContainer
                : $this;

            //Return any unused sections to their default state (e.g. if they have no text entered)
            $root
                .find('.search-section')
                .not($this.closest('.search-section'))
                .each(function (i, v) {
                    var $miniform = $(v).find('.mini-form');

                    var s = '';
                    if ($miniform.length != 0) {
                        $miniform
                            .find('input[type=text]')
                            .each(function (i, v) {
                                s += $.trim($(v).val());
                            });
                    }
                    if (s == '') {
                        removeCancel($(v).find('.change-button'));
                    }

                    $(v).find('.change-button').text('Remove');
                    $(v)
                        .find('.edit-button')
                        .removeClass('editing')
                        .find('.btn-label')
                        .text('Amend...');
                });

            $root
                .find('.manual-address-mode')
                .removeClass('manual-address-mode');
            $root.find('.manual-address-link').parent().show();

            //Close forms.
            $root.find('.mini-form').hide();

            //Remove "dropped" class on any dropped RAF stars.
            $root.find('.drop-button.dropped').removeClass('dropped');

            //Hide all callouts.
            hideCallout();
        };
        var cleanString;
        var getLinesFromAddressJson = function (address) {
            var line1, line2;

            if (settings.type == 'property') {
                line1 =
                    address.SubDwelling +
                    ', ' +
                    address.NameNo +
                    ', ' +
                    address.Street;
                line2 =
                    address.Locality +
                    ', ' +
                    address.Town +
                    ', ' +
                    address.County +
                    ', ' +
                    address.Postcode;
            } else {
                var person1 =
                    settings.$editContainer
                        .find('#ContactListItem_Person1_Title')
                        .val() +
                    ' ' +
                    settings.$editContainer
                        .find('#ContactListItem_Person1_Forename')
                        .val() +
                    ' ' +
                    settings.$editContainer
                        .find('#ContactListItem_Person1_Surname')
                        .val();

                var person2 = $.trim(
                    settings.$editContainer
                        .find('#ContactListItem_Person2_Title')
                        .val() +
                        ' ' +
                        settings.$editContainer
                            .find('#ContactListItem_Person2_Forename')
                            .val() +
                        ' ' +
                        settings.$editContainer
                            .find('#ContactListItem_Person2_Surname')
                            .val()
                );

                line1 = person2 == '' ? person1 : person1 + '<br />' + person2;

                line2 =
                    address.SubDwelling +
                    ', ' +
                    address.NameNo +
                    ', ' +
                    address.Street +
                    ', ' +
                    address.Locality +
                    ', ' +
                    address.Town +
                    ', ' +
                    address.County +
                    ', ' +
                    address.Postcode;
            }

            return {
                line1: cleanString(line1),
                line2: cleanString(line2)
            };
        };

        var initValidation = function () {
            //settings.$editContainer.validationEngine();
        };
        cleanString = function (str) {
            //temp

            var me = this;
            str = str.replace(/undefined/g, '');
            str = str.replace(/(^\s*,)|(,\s*$)/g, '');
            str = str.replace(/(,\s,)/g, ',');
            str = $.trim(str);
            if (str.startsWith(',') || str.endsWith(',')) {
                str = me.cleanLine(str);
            }
            return str;
        };

        //Setup each inline search.
        return this.each(function () {
            //Merge supplied options with default settings.
            if (options) {
                $.extend(settings, options);
            }

            var $me = $(this);

            //Disables all sections in the groupcontainer. except $except.
            var disableSections = function ($except) {
                settings.$groupContainer
                    .find('.search-section')
                    .hide()
                    .not($except);
                $except.show();
            };
            var enableSections = function () {
                var $sections =
                    settings.$groupContainer.find('.search-section');
                $sections.each(function (i, v) {
                    $(v).find('.disabler').remove();
                    $(v).removeClass('faded');
                });

                //If used, enable the group action button.
                if (settings.$groupActionButton) {
                    settings.$groupActionButton.removeClass('disabled');
                }
            };

            var validateSection = function ($section) {
                return $section.validationEngine('validate');
            };

            var addCommas = function (quoteString, resultArray) {
                var me = this;

                if (resultArray.indexOf(quoteString) < 0) {
                    resultArray.push(quoteString);

                    var matches = quoteString.match(/[^,](\s)/g);

                    if (matches != null) {
                        for (var i = 0; i < matches.length; i++) {
                            var newQuoteString = quoteString.replace(
                                matches[i],
                                matches[i][0] + ', '
                            );
                            me.addCommas(newQuoteString, resultArray);
                        }
                    }
                }

                return resultArray;
            };

            var highlightSearchWords = function (searchString, html) {
                var me = this;

                //split search string into words and quoted phrases for highlighting.
                var regex = /[^\s"']+|"([^"]*)"/g;
                var matches;
                var searchItems = [];

                while ((matches = regex.exec(searchString)) !== null) {
                    if (matches.index === regex.lastIndex) {
                        regex.lastIndex++;
                    }
                    searchItems.push(
                        addCommas(matches[0].split('"').join(''), [])
                    );
                }

                var $html = $(html);
                $.each(searchItems, function (i) {
                    $html.highlight(searchItems[i]);
                });

                return $html.clone().wrap('<div>').parent().html();
            };

            initValidation();

            //Func to run when a callout item is clicked.
            var itemClicked = function ($item) {
                hideCallout();

                if (settings.type == 'property') {
                    settings.onSelectionChanged(
                        {
                            id: parseInt($item.attr('data-id')),
                            line1: $item.attr('data-line1'),
                            line2: $item.attr('data-line2'),
                            branchId: $item.attr('data-branchId'),
                            userId: $item.attr('data-userId'),
                            recordTypeId: $item.attr('data-recordTypeId'),
                            caregoryId: $item.attr('data-caregoryId'),
                            subTypeId: $item.attr('data-subTypeId'),
                            bedrooms: $item.attr('data-bedrooms'),
                            bathrooms: $item.attr('data-bathrooms'),
                            receptions: $item.attr('data-receptions'),
                            subDwelling: $item.attr('data-subDwelling'),
                            nameNo: $item.attr('data-nameNo'),
                            street: $item.attr('data-street'),
                            locality: $item.attr('data-locality'),
                            town: $item.attr('data-town'),
                            county: $item.attr('data-county'),
                            postcode: $item.attr('data-postcode'),
                            countryCode: $item.attr('data-countryCode'),
                            uprn: $item.attr('data-uprn') || $item.attr('data-Uprn') || '',
                            displayName: $item.text()
                        },
                        ($item.attr('data-source') == 'PAF' || $item.attr('data-source') == 'Sprift')
                    );
                } else {
                    settings.onSelectionChanged(
                        {
                            id: parseInt($item.attr('data-id')),
                            line1: $item.attr('data-line1'),
                            line2: $item.attr('data-line2'),
                            subDwelling: $item.attr('data-subDwelling'),
                            nameNo: $item.attr('data-nameNo'),
                            street: $item.attr('data-street'),
                            locality: $item.attr('data-locality'),
                            town: $item.attr('data-town'),
                            county: $item.attr('data-county'),
                            postcode: $item.attr('data-postcode'),
                            countryCode: $item.attr('data-countryCode'),
                            uprn: $item.attr('data-uprn') || $item.attr('data-Uprn') || '',
                            title1: $item.attr('data-title1'),
                            forename1: $item.attr('data-forename1'),
                            surname1: $item.attr('data-surname1'),
                            title2: $item.attr('data-title2'),
                            forename2: $item.attr('data-forename2'),
                            surname2: $item.attr('data-surname2'),
                            phones1number1: $item.attr('data-phones1number1'),
                            phones1type1: $item.attr('data-phones1type1'),
                            phones1label1: $item.attr('data-phones1label1'),
                            phones1number2: $item.attr('data-phones1number2'),
                            phones1type2: $item.attr('data-phones1type2'),
                            phones1label2: $item.attr('data-phones1label2'),
                            phones1number3: $item.attr('data-phones1number3'),
                            phones1type3: $item.attr('data-phones1type3'),
                            phones1label3: $item.attr('data-phones1label3'),
                            phones2number1: $item.attr('data-phones2number1'),
                            phones2type1: $item.attr('data-phones2type1'),
                            phones2label1: $item.attr('data-phones2label1'),
                            phones2number2: $item.attr('data-phones2number2'),
                            phones2type2: $item.attr('data-phones2type2'),
                            phones2label2: $item.attr('data-phones2label2'),
                            phones2number3: $item.attr('data-phones2number3'),
                            phones2type3: $item.attr('data-phones2type3'),
                            phones2label3: $item.attr('data-phones2label3'),
                            emails1address1: $item.attr('data-emails1address1'),
                            emails1address2: $item.attr('data-emails1address2'),
                            emails2address1: $item.attr('data-emails2address1'),
                            emails2address2: $item.attr('data-emails2address2')
                        },
                        ($item.attr('data-source') == 'PAF' || $item.attr('data-source') == 'Sprift')
                    );
                }
            };

            //Input.Focus
            $me.find('.search-input').focus(function (e) {
                reset($me);

                if (settings.type == 'appointment') {
                    $me.find('.textbox-button')
                        .removeClass(textboxButtonClasses)
                        .addClass('size-3')
                        .addClass(settings.color)
                        .html('View Diary...')
                        .data('action', 'view')
                        .fadeIn();
                } else {
                    $me.find('.textbox-button')
                        .removeClass(textboxButtonClasses)
                        .addClass('size-1')
                        .html('Add New...')
                        .data('action', 'create')
                        .fadeIn();
                }
            });

            //Drop-button click
            $me.on('click', '.drop-button', function (e) {
                var $this = $(this);
                e.stopPropagation();

                reset($me);

                if (settings.rafClicked) settings.rafClicked();

                $this.addClass('dropped');
                var spinner = setTimeout(function () {
                    $this.addClass('ajax');
                }, 100);

                var search = {
                    SearchId: C.FactorySearchId.Recents,
                    ListType: C.ListType.Dropdown,
                    SearchOrder: {
                        Type: C.SearchOrderType.Ascending
                    } //no length limit here - show all RAF items.
                };

                //Extra params
                switch (settings.type) {
                    case 'property':
                        search.SearchOrder.By = C.SearchOrderBy.Price;
                    // eslint-disable-next-line no-fallthrough
                    case 'contact':
                        search.SearchOrder.By = C.SearchOrderBy.Name;
                        if (settings.smsMode) {
                            search.HasMobilePhone = true;
                        }
                        search.CategoryIdList = settings.subTypeList;
                        break;
                }

                new gmgps.cloud.http("plugins-_inlineSearch").getView({
                    url: settings.type + '/get' + settings.type + 'List',
                    post: true,
                    complex: true,
                    args: search,
                    background: true,
                    onSuccess: function (response) {
                        $this.removeClass('ajax');
                        clearTimeout(spinner);

                        //RAF Callout
                        showCallout({
                            $target: $this,
                            $targetRef: $this.closest('.inline-search'),
                            $container: settings.$resultsContainer,
                            content: response.Data,
                            height: 350,
                            width: 350,
                            light: true,
                            yOffset: 8,
                            pointerLeftOffset: 2,
                            itemClicked: itemClicked,
                            onReady: function ($f) {}
                        });
                    }
                });
            });

            //Textbox-Button: click
            $me.on('click', '.textbox-button', function () {
                switch ($(this).data('action')) {
                    case 'create':
                        if (settings.onCreateClicked)
                            settings.onCreateClicked();
                        break;

                    case 'view':
                        if (settings.viewClicked) settings.viewClicked($(this));
                        break;

                    case 'cancel':
                        settings.$editContainer.hide();
                        $(this).text('Add New...').data('action', 'create');
                        break;

                    default:
                        alert('Unknown action');
                        break;
                }
            });

            //Results html
            if (settings.$resultsContainer) {
                settings.$resultsContainer.html(
                    $('#callout-template').clone().html()
                );
            }

            //Result item click
            $me.on('click', 'div.row', function () {
                if (settings.itemClicked) {
                    $me.addClass('populated');
                    settings.itemClicked($(this));
                }

                hideCallout();
            });

            //Main search box: Input Key Press
            $me.find('.search-input')
                .placeholder()
                .on('keyup', function (e) {
                    if (e.keyCode == 40) {
                        //Down arrow - trigger RAF dropdown.
                        $me.find('.drop-button').trigger('click');
                        return;
                    }

                    if (e.keyCode == 13) {
                        //return key
                    } else {
                        var query = $.trim($(this).val());

                        //Postcode formatting
                        var checkedPostcode =
                            gmgps.cloud.utility.checkPostcode(query);
                        if (!checkedPostcode == false) {
                            //The postcode was valid and has been capitalised, structured, etc - display and alter the query.
                            query = checkedPostcode;
                            $(this).val(checkedPostcode);
                        }

                        if (
                            query.startsWith('07') ||
                            (query.startsWith('+') && settings.smsMode)
                        ) {
                            return; //show no matches, allow mobile number to be input - we are in sms mode.
                        }

                        //Clean the query. If this is done on the server, the client doesn't get the benefit of the clean and can't match the words!
                        query = query.replace(/[;:,./?\\-]/g, '');

                        if (query.length >= 3) {
                            var $dropButton = $(this).siblings('.drop-button');
                            var typeSpinner = setTimeout(function () {
                                $dropButton.addClass('ajax');
                            }, 100);

                            var search = {
                                ListType: C.ListType.Dropdown,
                                Query: query,
                                SearchOrder: {
                                    By: C.SearchOrderBy.SearchScore,
                                    Type: C.SearchOrderType.Ascending
                                },
                                SearchPage: {
                                    Index: 1,
                                    Size: 100
                                }
                            };

                            //Extra params
                            switch (settings.type) {
                                case 'contact':
                                    if (settings.smsMode) {
                                        search.HasMobilePhone = true;
                                    }
                                    search.CategoryIdList =
                                        settings.subTypeList;
                                    search.QueryMatchOnNameAndAddressOnly =
                                        true;
                                    search.Archived =
                                        C.ArchivedSelectionType.ActiveRecordsOnly; //ALT-1828 SJD 07/05/2014 Always exclude archived contacts
                                    break;
                            }

                            //Get matching addresses for this postcode.
                            new gmgps.cloud.http("plugins-_inlineSearch").ajax(
                                {
                                    args: search,
                                    complex: true,
                                    background: true,
                                    dataType: 'json',
                                    type: 'post',
                                    url:
                                        settings.type +
                                        '/get' +
                                        settings.type +
                                        'List'
                                },
                                function (response) {
                                    $dropButton.removeClass('ajax');
                                    clearTimeout(typeSpinner);

                                    var html = response.Data;
                                    var words = [];

                                    search.Query = $.trim(search.Query);
                                    var phrases =
                                        search.Query.match(/"(?:[^"\\]|\\.)*"/);
                                    var i;
                                    if (phrases) {
                                        for (i = 0; i < phrases.length; i++) {
                                            var phrase = phrases[i];
                                            search.Query = search.Query.replace(
                                                phrase,
                                                ''
                                            );
                                            words.push(
                                                phrase.replace(/"/g, '')
                                            );
                                        }
                                        search.Query = $.trim(search.Query);
                                    }

                                    //Response processing.
                                    if (
                                        search.Query != '' ||
                                        words.length > 0
                                    ) {
                                        html = highlightSearchWords(
                                            search.Query,
                                            html
                                        );
                                    }

                                    // Get group ID for feature flag check (same pattern as PostcodePicker)
                                    var groupId = $('#_groupid').val() || $('input[name="GroupId"]').val();
                                    var useNewAddressApi = false;

                                    if (groupId && alto.optimizelyClient && alto.optimizelyClient.isFeatureEnabledForGroup) {
                                        useNewAddressApi = alto.optimizelyClient.isFeatureEnabledForGroup('new_address_search', groupId);
                                    }

                                    if (checkedPostcode) {
                                        if (useNewAddressApi) {
                                            // NEW: Use AddressLookupFinder API
                                            var addressLookupFinder = new gmgps.cloud.helpers.AddressLookupFinder();
                                            addressLookupFinder.find(checkedPostcode, function(addresses) {
                                                if (addresses && addresses.length > 0) {
                                                    // Generate PAF HTML from new API response
                                                    var pafHtml = transformAddressesToPafHtml(addresses);
                                                    var $html = $($.parseHTML(html));
                                                    $html.find('.rows').append(pafHtml);
                                                    
                                                    showCallout({
                                                        $target: $me,
                                                        $targetRef: $me,
                                                        $container: settings.$resultsContainer,
                                                        content: $html,
                                                        height: 350,
                                                        width: 350,
                                                        light: true,
                                                        yOffset: 5,
                                                        itemClicked: itemClicked
                                                    });
                                                }
                                            });
                                        } else {
                                            // EXISTING: PAF database fallback
                                            new gmgps.cloud.http("plugins-_inlineSearch").ajax(
                                                {
                                                    args: { postcode: checkedPostcode },
                                                    dataType: 'json',
                                                    background: true,
                                                    type: 'post',
                                                    url: 'PAF/GetAddressesList/'
                                                },
                                                function (response) {
                                                    if (response.Data.length > 0) {
                                                        var pafHtml = response.Data;
                                                        var $html = $($.parseHTML(html));
                                                        $html.find('.rows').append(pafHtml);
                                                        
                                                        showCallout({
                                                            $target: $me,
                                                            $targetRef: $me,
                                                            $container: settings.$resultsContainer,
                                                            content: $html,
                                                            height: 350,
                                                            width: 350,
                                                            light: true,
                                                            yOffset: 5,
                                                            itemClicked: itemClicked
                                                        });
                                                    }
                                                },
                                                function (error) {
                                                    //alert('error getting preview data'); //todo
                                                }
                                            );
                                        }
                                    } else {
                                        //Records callout (search term)
                                        showCallout({
                                            $target: $me,
                                            $targetRef: $me,
                                            $container:
                                                settings.$resultsContainer,
                                            content: html,
                                            height: 350,
                                            width: 350,
                                            light: true,
                                            pointerLeft: 52,
                                            yOffset: 5,
                                            itemClicked: itemClicked
                                        });
                                    }
                                },
                                function (error) {
                                    alert(error);
                                }
                            );
                        } else {
                            hideCallout();
                        }
                    }
                });
        });
    };
})(jQuery);

//jQuery toDictionary() plugin
(function ($) {
    // #region String.prototype.format
    // add String prototype format function if it doesn't yet exist
    if ($.isFunction(String.prototype.format) === false) {
        String.prototype.format = function () {
            var s = this;
            var i = arguments.length;
            while (i--) {
                s = s.replace(
                    new RegExp('\\{' + i + '\\}', 'gim'),
                    arguments[i]
                );
            }
            return s;
        };
    }
    // #endregion

    // #region Date.prototype.toISOString
    // add Date prototype toISOString function if it doesn't yet exist
    if ($.isFunction(Date.prototype.toISOString) === false) {
        Date.prototype.toISOString = function () {
            var pad = function (n, places) {
                n = n.toString();
                for (var i = n.length; i < places; i++) {
                    n = '0' + n;
                }
                return n;
            };
            var d = this;
            return '{0}-{1}-{2}T{3}:{4}:{5}.{6}Z'.format(
                d.getUTCFullYear(),
                pad(d.getUTCMonth() + 1, 2),
                pad(d.getUTCDate(), 2),
                pad(d.getUTCHours(), 2),
                pad(d.getUTCMinutes(), 2),
                pad(d.getUTCSeconds(), 2),
                pad(d.getUTCMilliseconds(), 3)
            );
        };
    }
    // #endregion

    var _flatten = function (input, output, prefix, includeNulls) {
        if ($.isPlainObject(input)) {
            for (var p in input) {
                if (
                    includeNulls === true ||
                    (typeof input[p] !== 'undefined' && input[p] !== null)
                ) {
                    _flatten(
                        input[p],
                        output,
                        prefix.length > 0 ? prefix + '.' + p : p,
                        includeNulls
                    );
                }
            }
        } else {
            if ($.isArray(input)) {
                $.each(input, function (index, value) {
                    _flatten(value, output, '{0}[{1}]'.format(prefix, index));
                });
                return;
            }
            if (!$.isFunction(input)) {
                if (input instanceof Date) {
                    output.push({ name: prefix, value: input.toISOString() });
                } else {
                    var val = typeof input;
                    switch (val) {
                        case 'boolean':
                        case 'number':
                            val = input;
                            break;
                        case 'object':
                            // this property is null, because non-null objects are evaluated in first if branch
                            if (includeNulls !== true) {
                                return;
                            }
                        // eslint-disable-next-line no-fallthrough
                        default:
                            val = input || '';
                    }
                    output.push({ name: prefix, value: val });
                }
            }
        }
    };

    $.extend({
        toDictionary: function (data, prefix, includeNulls) {
            /// <summary>Flattens an arbitrary JSON object to a dictionary that Asp.net MVC default model binder understands.</summary>
            /// <param name="data" type="Object">Can either be a JSON object or a function that returns one.</param>
            /// <param name="prefix" type="String" Optional="true">Provide this parameter when you want the output names to be prefixed by something (ie. when flattening simple values).</param>
            /// <param name="includeNulls" type="Boolean" Optional="true">Set this to 'true' when you want null valued properties to be included in result (default is 'false').</param>

            // get data first if provided parameter is a function
            data = $.isFunction(data) ? data.call() : data;

            // is second argument "prefix" or "includeNulls"
            if (arguments.length === 2 && typeof prefix === 'boolean') {
                includeNulls = prefix;
                prefix = '';
            }

            // set "includeNulls" default
            includeNulls =
                typeof includeNulls === 'boolean' ? includeNulls : true;

            var result = [];
            _flatten(data, result, prefix || '', includeNulls);

            return result;
        }
    });
})(jQuery);

//Calendar Picker
(function ($) {
    function calendarPicker(el, params) {
        var now = new Date();
        var thismonth = now.getMonth();
        var thisyear = now.getYear() + 1900;
        var month;
        var year;
        var opts = {
            month: thismonth,
            year: thisyear
        };

        $.extend(opts, params);

        var monthNames = [
            'January',
            'February',
            'March',
            'April',
            'May',
            'June',
            'July',
            'August',
            'September',
            'October',
            'November',
            'December'
        ];
        var dayNames = ['M', 'T', 'W', 'T', 'F', 'S', 'Su'];
        month = i = parseInt(opts.month);
        year = parseInt(opts.year);
        var m = 0;
        var table = '';

        // next month
        var next_month;
        if (month == 11) {
            next_month =
                '<a href="?month=' +
                1 +
                '&amp;year=' +
                (year + 1) +
                '" title="' +
                monthNames[0] +
                ' ' +
                (year + 1) +
                '">' +
                monthNames[0] +
                ' ' +
                (year + 1) +
                '</a>';
        } else {
            next_month =
                '<a href="?month=' +
                (month + 2) +
                '&amp;year=' +
                year +
                '" title="' +
                monthNames[month + 1] +
                ' ' +
                year +
                '">' +
                monthNames[month + 1] +
                ' ' +
                year +
                '</a>';
        }

        // previous month
        var prev_month;
        if (month == 0) {
            prev_month =
                '<a href="?month=' +
                12 +
                '&amp;year=' +
                (year - 1) +
                '" title="' +
                monthNames[11] +
                ' ' +
                (year - 1) +
                '">' +
                monthNames[11] +
                ' ' +
                (year - 1) +
                '</a>';
        } else {
            prev_month =
                '<a href="?month=' +
                month +
                '&amp;year=' +
                year +
                '" title="' +
                monthNames[month - 1] +
                ' ' +
                year +
                '">' +
                monthNames[month - 1] +
                ' ' +
                year +
                '</a>';
        }

        //Add title (optional)
        if (opts.showTitle) {
            table +=
                '<h3 id="current-month">' +
                monthNames[month] +
                ' ' +
                year +
                '</h3>';
        }
        table +=
            '<table class="calendar-month " ' +
            'id="calendar-month' +
            i +
            ' " cellspacing="0">';

        table += '<tr>';

        for (var d = 0; d < 7; d++) {
            table += '<th class="weekday">' + dayNames[d] + '</th>';
        }

        table += '</tr>';

        var firstDayDate = new Date(year, month, 0);
        var firstDay = firstDayDate.getDay();

        var prev_m = month == 0 ? 11 : month - 1;
        var prev_y = prev_m == 11 ? year - 1 : year;
        var prev_days = getDaysInMonth(prev_m, prev_y);
        firstDay = firstDay == 0 && firstDayDate ? 7 : firstDay;

        var i = 0;
        for (var j = 0; j < 42; j++) {
            var day = 0;
            var attrs;

            if (j < firstDay) {
                //Previous month.
                day = prev_days - firstDay + j + 1;
                attrs =
                    'data-day="{0}" data-month="{1}" data-year="{2}" data-id="{3}"'.format(
                        day,
                        prev_m,
                        prev_y,
                        j + 1
                    );
                table +=
                    '<td ' +
                    attrs +
                    ' class="other-month"><span class="day">' +
                    day +
                    '</span></td>';
            } else if (j >= firstDay + getDaysInMonth(month, year)) {
                //Next month.
                i = i + 1;
                day = i;
                attrs =
                    'data-day="{0}" data-month="{1}" data-year="{2}" data-id="{3}"'.format(
                        day,
                        month == 11 ? 0 : month + 1,
                        month == 11 ? year + 1 : year,
                        j + 1
                    );
                table +=
                    '<td ' +
                    attrs +
                    ' class="other-month"><span class="day">' +
                    i +
                    '</span></td>';
            } else {
                //Current month.
                day = j - firstDay + 1;
                var dayOfWeek = new Date(year, month, day).getDay();
                attrs =
                    'data-day="{0}" data-month="{1}" data-year="{2}" data-id="{3}"'.format(
                        day,
                        month,
                        year,
                        j + 1
                    );
                table +=
                    '<td ' +
                    attrs +
                    ' class="current-month ' +
                    (day == 1 ? 'first-day-month ' : '') +
                    (day == getDaysInMonth(month, year)
                        ? 'last-day-month '
                        : '') +
                    (dayOfWeek == 1 ? 'first-day-week ' : '') +
                    (dayOfWeek == 0 ? 'last-day-week ' : '') +
                    'day' +
                    day +
                    '"><span class="day">' +
                    (j - firstDay + 1) +
                    '</span></td>';
            }
            if (j % 7 == 6) table += '</tr>';
        }

        table += '</table>';

        el.html(table);
    }

    function getDaysInMonth(month, year) {
        var daysInMonth = [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];
        if (
            month == 1 &&
            year % 4 == 0 &&
            (year % 100 != 0 || year % 400 == 0)
        ) {
            return 29;
        } else {
            return daysInMonth[month];
        }
    }

    // jQuery plugin initialisation
    $.fn.calendarPicker = function (params) {
        calendarPicker(this, params);
        return this;
    };
})(jQuery);

//Clear
// - Empties the contents of an element and removes data and event handlers.
// - Required because empty() doesn't do the latter and remove() removes the source element.
(function ($) {
    $.fn.extend({
        clear: function () {
            //Iterate over the current set of matched elements
            return this.each(function () {
                //Call off() for the target element, then it's children, then remove it's children, leaving the target in-tact but
                //with all of it's event handlers removed.  Used when a container has it's contents changed.
                $(this).off().children().off().remove();
            });
        }
    });
})(jQuery);

//Plugin to Disable/Re-enable anything.
// - Note that in order to work, the UI must support the parent of the target element being relatively positioned, for now.
(function ($) {
    $.fn.disable = function (
        opacity,
        putTheCoverInside,
        transparent,
        titleText
    ) {
        var $this = $(this);

        //Quit early if this is already disabled.
        if ($(this).hasClass('disabler-disabled')) return $this;

        if (!opacity) {
            opacity = '0.3';
        }

        //Append the disabler, then mark the element as being disabled by this plugin.
        var $cover;

        if (putTheCoverInside) {
            //Inside cover.
            $this.css('opacity', opacity);
            $this.append(
                '<div class="disabler-cover" style="position: absolute; top: 0px; bottom: 0px; left: 0px; right: 0px; z-index: 1;"></div>'
            );
            $cover = $this.find('.disabler-cover');
        } else {
            //Outside cover
            var $parent = $this.parent();
            var pos = $this.position();

            if (pos == null) return $this;

            //Get the width and height of the content to be disabled.
            var width = $this.outerWidth(true);
            var height = $this.outerHeight(true);

            //Ensure that the parent of the content is positioned relatively or absolutely.
            var position = $parent.css('position');
            if (
                position != 'absolute' &&
                position != 'relative' &&
                position != 'static'
            ) {
                $parent.css('position', 'relative');
            }

            $parent.append(
                '<div class="disabler-cover" style="width: {0}px; height: {1}px; top: {2}px; left: {3}px; opacity: {4};"></div>'.format(
                    width,
                    height,
                    pos.top,
                    pos.left,
                    opacity
                )
            );
            $cover = $parent.find('.disabled-cover');
        }

        $this.addClass('disabler-disabled');

        if (transparent === true) {
            $cover.addClass('transparent');
        }

        if (titleText) {
            $cover.prop('title', titleText);
        }

        return $this;
    };

    $.fn.enable = function (removeTheCoverFromInside) {
        var $this = $(this);
        var $parent = $this.parent();

        //Quit early if this plugin hasn't disabled this content.
        if (!$this.hasClass('disabler-disabled')) {
            return $this;
        }

        if (removeTheCoverFromInside) {
            $this.css('opacity', 1);
            $this.children('.disabler-cover').remove();
        } else {
            $parent.children('.disabler-cover').remove();
        }
        $this.removeClass('disabler-disabled');

        return $this;
    };

    $.fn.lock = function () {
        var $this = $(this);
        $this.addClass('disabled').prop('disabled', true);

        return $this;
    };

    $.fn.unlock = function () {
        var $this = $(this);
        $this.removeClass('disabled').prop('disabled', false);

        return $this;
    };
})(jQuery);

// functions to effectively hide/show options from a select element by detaching and then reattaching - regular jquery hide()/show() methods do not work cross-browser!
(function ($) {
    $.fn.extend({
        detachOptions: function (selector) {
            var me = this;
            var detached = me.data('detached') || [];
            return me.each(function () {
                me.find(selector).each(function () {
                    detached.push($(this).detach());
                });
                me.data('detached', detached);
            });
        },
        attachOptions: function (selector) {
            var me = this;
            var detached = me.data('detached') || [];
            return me.each(function () {
                var newDetached = [];
                var length = detached.length;
                for (var index = 0; index < length; index++) {
                    var detachedItem = detached[index];
                    if (detachedItem.is(selector)) {
                        me.append(detachedItem);
                    } else {
                        newDetached.push(detachedItem);
                    }
                }
                me.data('detached', newDetached);
            });
        }
    });
})(jQuery);

(function ($) {
    $.extend($.expr[':'], {
        containsi: function (elem, i, match) {
            return (
                (elem.textContent || elem.innerText || '')
                    .toLowerCase()
                    .indexOf((match[3] || '').toLowerCase()) >= 0
            );
        }
    });
})(jQuery);
