gmgps.cloud.ui.views.appointment = function (args) {
    var me = this;
    me.cfg = args;
    me.$root = args.$root;

    me.id = 0;
    me.isRecurring = false;
    me.isUrgent = false;
    me.isException = false;
    me.instanceId = 0;
    me.status = 0;

    me.$emailNotificationSubject = me.$root.find('#EmailNotificationSubject');
    me.$emailToggle = me.$root.find('.email-toggle');

    me.windowMovedOnce = false;

    me.init(args);

    return true;
};

gmgps.cloud.ui.views.appointment.typeName = 'gmgps.cloud.ui.views.appointment';

gmgps.cloud.ui.views.appointment.prototype = {
    init: function () {
        var me = this;

        me.id = parseInt(me.$root.find('#Event_Id').val());
        me.isRecurring = me.$root.find('#Event_IsRecurring').val() == 'True';
        me.isUrgent = me.$root.find('#Event_IsUrgent').val() == 'True';
        me.isException = me.$root.find('#IsException').val() == 'True';
        me.$window = me.$root.closest('.window');
        me.subTypeId = me.$root.find('#Event_SubTypeId').val();

        //Before setting the instanceId away from it's default value of zero, make sure it exists.
        // - It will if this is an instance of a recurring event, it won't otherwise.
        var instanceId = parseInt(
            me.$root.find('#RecurringException_InstanceId').val()
        );
        if (!isNaN(instanceId)) {
            me.instanceId = instanceId;
        }

        //Set status
        me.status = me.isException
            ? parseInt(me.$root.find('#RecurringException_Status').val()) //use the event status
            : parseInt(me.$root.find('#Event_Status').val()); //use the exception status

        //Set RecurringException entry type
        if (me.isException) {
            var exceptionTitle = me.$root.find('#RecurringException_Title').val();
            
            me.$root.find(`#Event_SubTypeId option:contains(${exceptionTitle})`).prop('selected', true);
        }

        //Custom selects.
        me.$root.find('select').customSelect();

        //Mini diary.
        me.setupMiniDiary(me.$root.find('.mini-diary-placeholder'));

        var ensureTimes = function (who, $start, $end) {
            var d = new Date();
            var srctime = $start.val();
            var dsttime = $end.val();

            var sh = parseInt(srctime.substring(0, srctime.indexOf(':')), 10);
            var sm = parseInt(srctime.substring(srctime.indexOf(':') + 1), 10);

            var dh = parseInt(dsttime.substring(0, dsttime.indexOf(':')), 10);
            var dm = parseInt(dsttime.substring(dsttime.indexOf(':') + 1), 10);

            var start = sh * 60 + sm;
            var end = dh * 60 + dm;

            if (who === 'start') {
                if (start > end) {
                    d.setHours(sh, sm, 0, 0);
                    $end.timepicker('setTime', d);
                    //$end.val($start.val());
                }
            } else if (who === 'end') {
                if (end < start) {
                    d.setHours(dh, dm, 0, 0);
                    $start.timepicker('setTime', d);
                }
            }
        };

        me.$root
            .find('#rec-startTime')
            .timepicker({
                minTime: '7:00am',
                maxTime: '11:00pm',
                timeFormat: 'H:i',
                step: 15
            })
            .on('changeTime', function () {
                ensureTimes(
                    'start',
                    me.$root.find('#rec-startTime'),
                    me.$root.find('#rec-endTime')
                );
            });

        me.$root
            .find('#rec-endTime')
            .timepicker({
                minTime: '7:00am',
                maxTime: '11:00pm',
                timeFormat: 'H:i',
                step: 15
            })
            .on('changeTime', function () {
                ensureTimes(
                    'end',
                    me.$root.find('#rec-startTime'),
                    me.$root.find('#rec-endTime')
                );
            });

        //Date Pickers
        me.$root.find('.date-picker').each(function (i, v) {
            $(v).datepicker({
                numberOfMonths: 2,
                showButtonPanel: true,
                dateFormat: 'dd/mm/yy',
                minDate:
                    $(v).attr('data-datePickerMode') == 'future'
                        ? new Date()
                        : new Date(2000, 0, 1)
            });
        });

        //Setup AC's.
        me.setupPropertyAC(me.$root.find('.property-ac'));
        me.setupContactAC(me.$root.find('.contact-ac'));

        var userSearch = {
            modelType: C.ModelType.Contact,
            includeUsers: true,
            includeContacts: false,
            includeDiaryUserGroups: true,
            QueryMatchOnNameOnly: true,
            displayCompanyName: false
        };

        //Parse existing parties (json).
        var negotiators = $.parseJSON(me.$root.find('#_negotiators').val());
        var parties = [];
        $.each(negotiators, function (i, v) {
            parties.push(v);
        });

        //Setup Auto-Suggest
        var getUsersASData = function (query, callback) {
            userSearch.query = query;
            gmgps.cloud.helpers.general.getAutoCompleteList(
                C.ModelType.User,
                userSearch,
                callback
            );
        };
        me.$root.find('#negotiatorIds').autoSuggest(getUsersASData, {
            startText: '',
            preFill: parties,
            queryParam: 'term',
            minChars: 1,
            canGenerateNewSelections: false,
            selectedValuesProp: 'id',
            selectedItemProp: 'value',
            searchObjProps: 'value',
            selectionAdded: function () {
                //Remove any validation prompt.
                me.$root.find('.negotiators').validationEngine('hide');
            },
            selectionRemoved: function (elem) {
                //Remove element.
                elem.remove();
            },
            formatList: function (data, elem) {
                return gmgps.cloud.helpers.general.formatAutoSuggestItem(
                    data,
                    elem
                );
            }
        });

        //Setup email notification message box.
        me.$editor = me.$root.find('#EmailNotificationMessage').cleditor({
            height: 120,
            width: 725,
            controls:
                'bold italic underline strikethrough superscript | font size | ' +
                'color highlight | bullets | outdent ' +
                'indent | alignleft center | undo redo | ' +
                'link unlink | pastetext',
            colors:
                'FFF FCC FC9 FF9 FFC 9F9 9FF CFF CCF FCF ' +
                'CCC F66 F96 FF6 FF3 6F9 3FF 6FF 99F F9F ' +
                'BBB F00 F90 FC6 FF0 3F3 6CC 3CF 66C C6C ' +
                '999 C00 F60 FC3 FC0 3C0 0CC 36F 63F C3C ' +
                '666 900 C60 C93 990 090 399 33F 60C 939 ' +
                '333 600 930 963 660 060 366 009 339 636 ' +
                '000 300 630 633 330 030 033 006 309 303',
            fonts:
                'Segoe UI, Arial,Arial Black,Comic Sans MS,Courier New,Narrow,Garamond,' +
                'Georgia,Impact,Sans Serif,Serif,Tahoma,Trebuchet MS,Verdana',
            sizes: '1,2,3,4,5,6,7',
            styles: [
                ['Paragraph', '<p>'],
                ['Header 1', '<h1>'],
                ['Header 2', '<h2>'],
                ['Header 3', '<h3>'],
                ['Header 4', '<h4>'],
                ['Header 5', '<h5>'],
                ['Header 6', '<h6>']
            ],
            useCSS: false,
            docType:
                '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">',
            docCSSFile: '',
            bodyStyle:
                'margin:4px; font:9pt Segoe UI,Arial,Verdana; cursor:text'
        });

        var ClEditorContextMenuActionsBehaviour =
            new gmgps.cloud.ui.behaviours.ClEditorContextMenuActionsBehaviour();

        ClEditorContextMenuActionsBehaviour.apply(me.$editor[0]);

        //Email Toggle > Change
        me.$root.on('change', '.email-toggle', function () {
            var $box = me.$root.find('.email-box');
            var on = $(this).hasClass('on');
            var windowX = me.$window.position().top;

            //If there's room, move the apt window upward to compensate for the increase in height which is about to occur.
            if (!me.windowMovedOnce) {
                if (windowX > 83) {
                    //83 is 50% of 166, the height of the containing box.
                    me.$window.animate(
                        { top: windowX - 83 },
                        {
                            duration: 250,
                            easing: 'easeOutBack',
                            complete: function () {}
                        }
                    );
                }
                me.windowMovedOnce = true;
            }

            if (on) {
                //Toggle on - show the email notification section.
                me.autoBuildEmailNotificationSubject();

                $box.show().animate(
                    { height: 166 },
                    {
                        duration: 250,
                        easing: 'easeOutBack',
                        complete: function () {
                            me.$editor.focus();
                        }
                    }
                );
            } else {
                //Toggle off - hide the email notification section.
                $box.animate(
                    { height: 0 },
                    {
                        duration: 250,
                        easing: 'easeOutBack',
                        complete: function () {
                            $box.hide();
                        }
                    }
                );
            }
        });

        //ReminderMins Dropdown > Change
        me.$root.on('change', '#ReminderMins', function () {
            var mins = parseInt($(this).val());
            if (mins == 0) {
                me.$root.find('.reminder-method').hide();
            } else {
                me.$root.find('.reminder-method').show();
            }
        });

        //Recurring Toggle > Change
        me.$root.on('change', '.recurring-toggle', function () {
            if ($(this).hasClass('on')) {
                //Take the time portions of the mini diary input and use them to pre-select start/end times for the recurring appointment.
                //var datetimes =
                me.isRecurring = true;
                me.$root.find('.x-recurring').show();
                me.$root.find('.x-non-recurring').hide();
            } else {
                me.isRecurring = false;
                me.$root.find('.x-recurring').hide();
                me.$root.find('.x-non-recurring').show();
            }

            me.autoBuildEmailNotificationSubject();
        });

        //Recurring Toggle > Change
        me.$root.on('change', '.urgent-toggle', function () {
            if ($(this).hasClass('on')) {
                me.isUrgent = true;
            } else {
                me.isUrgent = false;
            }
        });

        //Recurring Freq > Change/Prog Change
        me.$root.on('change prog-change', '#EventFrequency', function () {
            var id = parseInt($(this).val());
            me.$root.find('.freq:visible').hide();
            me.$root.find('.freq[data-id="{0}"]'.format(id)).show();

            //todo - set defaults if empty.
        });

        //Radio Button > Change
        me.$root.on('change prog-change', 'input:radio', function () {
            var $row = $(this).closest('.row');
            var $freq = $row.closest('.freq, .x-start-end');
            var selector = '.customStyleSelectBox, input:not(:radio)';
            $freq.find(selector).addClass('disabled').prop('disabled', true);
            $row.find(selector).removeClass('disabled').prop('disabled', false);
        });

        //Month Dropdown > Change/Prog Change
        me.$root.on('change prog-change', '.monthDropdown', function () {
            //Look on the row hosting this dropdown to see if there's a day number dropdown to refresh.
            var month = parseInt($(this).val()) - 1;
            var $dayOfMonth = $(this).closest('.row').find('select.dayOfMonth');
            if ($dayOfMonth.length !== 0) {
                //Build some new option elements for the dayOfMonth dropdown.
                var daysInMonth = Date.getDaysInMonth(2001, month); //2001 safe to use as a constant - not a leap year.
                var html = '';
                for (var i = 1; i <= daysInMonth; i++) {
                    var text = new Date(2001, month, i).getOrdinal();
                    html += '<option value="{0}">{1}{2}</option>'.format(
                        i,
                        i,
                        text
                    );
                }

                //Populate the dayOfMonth dropdown.
                $dayOfMonth.empty().html(html).trigger('prog-change');
            }
        });

        //All Day Event > Change/Prog Change
        me.$root.on('change prog-change', '#rec-allDayEvent', function () {
            var $row = $(this).closest('.row');
            if ($(this).prop('checked')) {
                $row.find('.customStyleSelectBox')
                    .addClass('disabled')
                    .prop('disabled', true);
            } else {
                $row.find('.customStyleSelectBox')
                    .removeClass('disabled')
                    .prop('disabled', false);
            }
        });

        //No End Date > Change/Prog Change
        me.$root.on('change prog-change', '#rec-noEndDate', function () {
            var $row = $(this).closest('.row');
            if ($(this).prop('checked')) {
                $row.find('#rec-end')
                    .addClass('disabled')
                    .prop('disabled', true)
                    .val('');
            } else {
                $row.find('#rec-end')
                    .removeClass('disabled')
                    .prop('disabled', false);
            }
        });

        //StartTime/EndTime Dropdown > Change (recurring only)
        //me.$root.on('change', '#rec-startTime, #rec-endTime', function() {
        //    //Ensure a valid period.
        //    gmgps.cloud.helpers.general.ensureTimePeriodIsValid(
        //        me.$root.find('#rec-startTime'),
        //        me.$root.find('#rec-endTime'),
        //        1);
        //});

        //Plus-Minus button (for contacts/properties) > Click
        me.$root.on('click', '.plus-minus-button.on', function () {
            //Create a new contact/property row.
            var type = $(this).attr('data-type');

            //If there's already an autocomplete input available and ununsed, ignore.
            if (
                $(this).closest('.records').find('input:visible').length !== 0
            ) {
                return false;
            }

            var $row = $(
                '<tr class="row" data-id="0">' +
                    '<td colspan="2" style="padding-right: 0px;"><input type="text" class="{0}-ac" style="width: 300px;" data-id="0" data-pre=""/></td>'.format(
                        type
                    ) +
                    '</tr>'
            );

            //Append the row to the associated records table.
            $(this).closest('.records').find('tbody').append($row);

            //Setup auto-complete on the new row.
            if (type == 'contact') {
                me.setupContactAC($row.find('input'));
            } else {
                me.setupPropertyAC($row.find('input'));
            }
        });

        //Cancel Event Button > Click
        me.$window.on('click', '.cancel-event-button', function () {
            var type = me.isException
                ? 'this occurrence'
                : me.isRecurring
                ? 'the series'
                : 'this appointment';

            showDialog({
                type: 'question',
                title: 'Cancel Appointment?',
                msg: 'Are you sure you would you like to cancel {0}?'.format(
                    type
                ),
                buttons: {
                    Yes: function () {
                        if (me.isException) {
                            //Cancel the exception.
                            me.$root
                                .find('#RecurringException_Status')
                                .val(C.EventStatus.CancelledByOffice);
                        } else {
                            //Cancel the event.
                            me.$root
                                .find('#Event_Status')
                                .val(C.EventStatus.CancelledByOffice);
                        }
                        $(this).dialog('close');
                        me.$window.find('.action-button').trigger('click');
                    },
                    No: function () {
                        $(this).dialog('close');
                    }
                }
            });
        });

        //Force a prog-change event on controls which affect disabled elements, so that their state is initially set.
        me.$root
            .find(
                '#EventFrequency, .monthDropdown, #rec-allDayEvent, input:radio:checked, input:checkbox:checked'
            )
            .trigger('prog-change');

        //UI setup.
        if (me.id !== 0) {
            //When creating an exception on a recurring schedule, change the title to suit.
            if (me.isException) {
                me.$window
                    .find('.top .title')
                    .text('Exception Details on Recurring Appointment');
            } else if (me.isRecurring) {
                me.$window
                    .find('.top .title')
                    .text('Recurring Appointment Details');
            }

            //If the event is not cancelled, show a cancellation button in the window footer.
            if (
                me.status === C.EventStatus.Pending ||
                me.status === C.EventStatus.Active ||
                (me.isRecurring && me.isException)
            ) {
                var buttonTemplate =
                    '<div class="btn cancel-event-button bgg-grey" style="min-width: 100px; float: left;">{0}</div>';

                if (me.isRecurring) {
                    //Recurring event - cancellation buttons.
                    if (me.isException) {
                        me.$window
                            .find('.bottom .buttons')
                            .prepend(
                                buttonTemplate.format('Cancel Occurrence')
                            );
                    } else {
                        me.$window
                            .find('.bottom .buttons')
                            .prepend(buttonTemplate.format('Cancel Series'));
                    }
                } else {
                    //Non-recurring event.
                    me.$window
                        .find('.bottom .buttons')
                        .prepend(buttonTemplate.format('Cancel Appointment'));
                }
            }
        }

        //Exception lock-downs.
        if (me.isException) {
            me.$root.find('.negotiators').disable();
        }

        me.getRecurringSchedule();

        //Initial focus on negotiators.
        me.$root.find('.as-input').focus();

        //Auto build subject on change of inputs
        me.$root.on(
            'change click keyup',
            'select, input, .open-button, textarea',
            function () {
                me.autoBuildEmailNotificationSubject();
            }
        );
    },

    autoBuildEmailNotificationSubject: function () {
        var me = this;

        //Exit early if email notify is off.
        if (!me.$emailToggle.hasClass('on')) {
            return false;
        }

        var s =
            me.$root.find('#Event_SubTypeId option:selected').text() + ' - ';
        if (me.$root.find('.recurring-toggle').hasClass('on')) {
            s += 'Recurring {0} Appointment starting '.format(
                me.$root.find('#EventFrequency option:selected').text()
            );
            s += Date.parse(me.$root.find('#rec-start').val()).toString(
                'ddd dd MMM yyyy'
            );
        } else {
            s += Date.parse(
                me.$root.find('.mini-diary-input').attr('data-startdatetime')
            ).toString('ddd dd MMM yyyy HH:mm');
        }

        var location = $.trim(me.$root.find('#Location').val());
        if (location != '') {
            s += ' @ ' + location;
        }

        me.$emailNotificationSubject.val(s);
    },

    getRecurringSchedule: function () {
        var me = this;

        //Regardless of the specified schedule (if any), we need to setup all four versions of recurring events so that
        //  they are available to be used with sensible defaults, if selected.
        // - For the selected freq, values will be already present.  For unselected ones, defaults are assigned.
        // - Because the client side knows how to setup the UI as the various options are clicked, the server doesn't preset this.
        var freq = parseInt(me.$root.find('#EventFrequency').val());
        var scheduleType = parseInt(
            me.$root.find('#Event_RecurringSchedule_ScheduleType').val()
        );

        var startDateTime = Date.parse(
            me.$root.find('.mini-diary-input').attr('data-startDateTime')
        );
        var endDateTime = Date.parse(
            me.$root.find('.mini-diary-input').attr('data-endDateTime')
        );
        var startTime = startDateTime.toString('HH:mm');
        var endTime = endDateTime.toString('HH:mm');

        //Setup daily.
        if (freq == C.Frequency.Daily) {
            //Actual
            switch (scheduleType) {
                case C.RecurringDiaryEventScheduleType.DailyEveryNDays:
                    me.$root
                        .find('#rec-day-dailyEveryNDays-days')
                        .val(
                            me.$root
                                .find('#Event_RecurringSchedule_Interval')
                                .val()
                        );
                    me.$root.find('#rec-day-dailyEveryNDays').trigger('click');
                    break;
                case C.RecurringDiaryEventScheduleType.DailyEveryWeekday:
                    me.$root
                        .find('#rec-day-dailyEveryWeekday')
                        .trigger('click');
                    break;
            }
        } else {
            //Defaults
            me.$root.find('#rec-day-dailyEveryNDays-days').val(1);
            me.$root.find('#rec-day-dailyEveryNDays').trigger('click');
        }

        //Setup weekly.
        if (freq == C.Frequency.Weekly) {
            //Actual
            me.$root
                .find('#rec-week-weeklyEveryNWeeks-week')
                .val(me.$root.find('#Event_RecurringSchedule_Interval').val());
            me.$root
                .find('#rec-week-weeklyEveryNWeeks-day')
                .val(
                    parseInt(
                        me.$root
                            .find('#Event_RecurringSchedule_WeekdayType')
                            .val(),
                        10
                    ) - 1
                )
                .trigger('prog-change');
        } else {
            //Defaults
            me.$root.find('#rec-week-weeklyEveryNWeeks-week').val(1);
            me.$root
                .find('#rec-week-weeklyEveryNWeeks-day')
                .val(startDateTime.getDay())
                .trigger('prog-change');
        }

        //Setup monthly.
        if (freq == C.Frequency.Monthly) {
            //Actual
            switch (scheduleType) {
                case C.RecurringDiaryEventScheduleType
                    .MonthlyOnSpecificDateEveryNMonths:
                    me.$root
                        .find(
                            '#rec-month-monthlyOnSpecificDateEveryNMonths-day'
                        )
                        .val(
                            me.$root
                                .find('#Event_RecurringSchedule_DayInMonth')
                                .val()
                        );
                    me.$root
                        .find(
                            '#rec-month-monthlyOnSpecificDateEveryNMonths-months'
                        )
                        .val(
                            me.$root
                                .find('#Event_RecurringSchedule_Interval')
                                .val()
                        );
                    me.$root
                        .find('#rec-month-monthlyOnSpecificDateEveryNMonths')
                        .trigger('click');
                    break;
                case C.RecurringDiaryEventScheduleType
                    .MonthlyOnOccurrenceOfDayEveryNMonths:
                    me.$root
                        .find(
                            '#rec-month-monthlyOnOccurrenceOfDayEveryNMonths-occurrence'
                        )
                        .val(
                            me.$root
                                .find('#Event_RecurringSchedule_OccurrenceType')
                                .val()
                        )
                        .trigger('prog-change');
                    me.$root
                        .find(
                            '#rec-month-monthlyOnOccurrenceOfDayEveryNMonths-weekday'
                        )
                        .val(
                            me.$root
                                .find('#Event_RecurringSchedule_WeekdayType')
                                .val()
                        )
                        .trigger('prog-change');
                    me.$root
                        .find(
                            '#rec-month-monthlyOnOccurrenceOfDayEveryNMonths-month'
                        )
                        .val(
                            me.$root
                                .find('#Event_RecurringSchedule_Interval')
                                .val()
                        );
                    me.$root
                        .find('#rec-month-monthlyOnOccurrenceOfDayEveryNMonths')
                        .trigger('click');
                    break;
            }
        } else {
            //Defaults
            me.$root
                .find('#rec-month-monthlyOnSpecificDateEveryNMonths-day')
                .val(startDateTime.getDate());
            me.$root
                .find('#rec-month-monthlyOnSpecificDateEveryNMonths-months')
                .val(1);
            me.$root
                .find('#rec-month-monthlyOnSpecificDateEveryNMonths')
                .trigger('click');
        }

        //Setup yearly.
        if (freq == C.Frequency.Yearly) {
            //Actual
            switch (scheduleType) {
                case C.RecurringDiaryEventScheduleType
                    .YearlyOnSpecificDateEveryNYears:
                    me.$root
                        .find('#rec-year-yearlyOnSpecificDateEveryNYears-month')
                        .val(
                            me.$root
                                .find('#Event_RecurringSchedule_MonthInYear')
                                .val()
                        )
                        .trigger('prog-change');
                    me.$root
                        .find('#rec-year-yearlyOnSpecificDateEveryNYears-day')
                        .val(
                            me.$root
                                .find('#Event_RecurringSchedule_DayInMonth')
                                .val()
                        )
                        .trigger('prog-change');
                    me.$root
                        .find('#rec-year-yearlyOnSpecificDateEveryNYears')
                        .trigger('click');
                    break;
                case C.RecurringDiaryEventScheduleType
                    .YearlyOnOccurrenceOfDayAndMonthEveryNYears:
                    me.$root
                        .find(
                            '#rec-year-yearlyOnOccurrenceOfDayAndMonthEveryNYears-occurrence'
                        )
                        .val(
                            me.$root
                                .find('#Event_RecurringSchedule_OccurrenceType')
                                .val()
                        )
                        .trigger('prog-change');
                    me.$root
                        .find(
                            '#rec-year-yearlyOnOccurrenceOfDayAndMonthEveryNYears-weekday'
                        )
                        .val(
                            me.$root
                                .find('#Event_RecurringSchedule_WeekdayType')
                                .val()
                        )
                        .trigger('prog-change');
                    me.$root
                        .find(
                            '#rec-year-yearlyOnOccurrenceOfDayAndMonthEveryNYears-month'
                        )
                        .val(
                            me.$root
                                .find('#Event_RecurringSchedule_MonthInYear')
                                .val()
                        )
                        .trigger('prog-change');
                    me.$root
                        .find(
                            '#rec-year-yearlyOnOccurrenceOfDayAndMonthEveryNYears'
                        )
                        .trigger('click');
                    break;
            }
        } else {
            //Defaults
            me.$root
                .find('#rec-year-yearlyOnSpecificDateEveryNYears-month')
                .val(startDateTime.getMonth() + 1)
                .trigger('prog-change');
            me.$root
                .find('#rec-year-yearlyOnSpecificDateEveryNYears-day')
                .val(startDateTime.getDate())
                .trigger('prog-change');
            me.$root
                .find(
                    '#rec-year-yearlyOnOccurrenceOfDayAndMonthEveryNYears-occurrence'
                )
                .val(1)
                .trigger('prog-change');
            me.$root
                .find(
                    '#rec-year-yearlyOnOccurrenceOfDayAndMonthEveryNYears-weekday'
                )
                .val(startDateTime.getDay())
                .trigger('prog-change');
            me.$root
                .find(
                    '#rec-year-yearlyOnOccurrenceOfDayAndMonthEveryNYears-month'
                )
                .val(startDateTime.getMonth())
                .trigger('prog-change');
            me.$root
                .find('#rec-year-yearlyOnSpecificDateEveryNYears')
                .trigger('click');
        }

        //Setup times, dates and all day events.
        me.$root.find('#rec-startTime').val(startTime).trigger('prog-change');
        me.$root.find('#rec-endTime').val(endTime).trigger('prog-change');

        // - All day event.
        if (
            startDateTime.toString('HH:mm:ss') == '00:00:00' &&
            endDateTime.toString('HH:mm:ss') == '23:59:59'
        ) {
            me.$root.find('#rec-allDayEvent').trigger('click');
        }
    },

    setRecurringSchedule: function ($form) {
        //Examine the recurring schedule fields and set the hidden inputs for RecurringSchedule.
        // - Note: For a recurring event, the start/end event dates of the event are both 1 Jan 1900 - only the time is important.
        //         The recurring schedule then holds the start of the recurring instances and either the end, or null (for no end).
        var me = this;

        var req;
        //Set specific fields.
        var freq = parseInt($form.find('#EventFrequency').val());
        var typeId;

        switch (freq) {
            case C.Frequency.Daily:
                typeId = parseInt(
                    $form
                        .find('input[name="rec-day-scheduleType"]:checked')
                        .val()
                );
                switch (typeId) {
                    //Every [x] day(s)
                    case C.RecurringDiaryEventScheduleType.DailyEveryNDays:
                        req = {
                            dayInMonth: 0,
                            interval: parseInt(
                                $form
                                    .find('#rec-day-dailyEveryNDays-days')
                                    .val()
                            ),
                            maxOccurrenceCount: 0,
                            monthInYear: 0,
                            occurrenceType:
                                C.RecurringDiaryEventOccurrenceType.Unspecified,
                            scheduleType: typeId,
                            weekdayType:
                                C.RecurringDiaryEventWeekdayType.Unspecified
                        };
                        break;

                    //Every Weekday
                    case C.RecurringDiaryEventScheduleType.DailyEveryWeekday:
                        req = {
                            dayInMonth: 0,
                            interval: 0,
                            maxOccurrenceCount: 0,
                            monthInYear: 0,
                            occurrenceType:
                                C.RecurringDiaryEventOccurrenceType.Unspecified,
                            scheduleType: typeId,
                            weekdayType:
                                C.RecurringDiaryEventWeekdayType.Unspecified
                        };
                        break;
                }
                break;

            case C.Frequency.Weekly:
                //Every [x] week(s) on [dayname]
                req = {
                    dayInMonth: 0,
                    interval: parseInt(
                        $form.find('#rec-week-weeklyEveryNWeeks-week').val()
                    ),
                    maxOccurrenceCount: 0,
                    monthInYear: 0,
                    occurrenceType:
                        C.RecurringDiaryEventOccurrenceType.Unspecified,
                    scheduleType:
                        C.RecurringDiaryEventScheduleType.WeeklyEveryNWeeks,
                    weekdayType:
                        parseInt(
                            $form.find('#rec-week-weeklyEveryNWeeks-day').val()
                        ) + 1 //WeekdayType starts at 1.
                };
                break;

            case C.Frequency.Monthly:
                typeId = parseInt(
                    $form
                        .find('input[name="rec-month-scheduleType"]:checked')
                        .val()
                );
                switch (typeId) {
                    //Day [x] of every [y] month(s)
                    case C.RecurringDiaryEventScheduleType
                        .MonthlyOnSpecificDateEveryNMonths:
                        req = {
                            dayInMonth: parseInt(
                                $form
                                    .find(
                                        '#rec-month-monthlyOnSpecificDateEveryNMonths-day'
                                    )
                                    .val()
                            ),
                            interval: parseInt(
                                $form
                                    .find(
                                        '#rec-month-monthlyOnSpecificDateEveryNMonths-months'
                                    )
                                    .val()
                            ),
                            maxOccurrenceCount: 0,
                            monthInYear: 0,
                            occurrenceType:
                                C.RecurringDiaryEventOccurrenceType.Unspecified,
                            scheduleType: typeId,
                            weekdayType:
                                C.RecurringDiaryEventWeekdayType.Unspecified
                        };
                        break;

                    //The [first/second/third/fourth/last] [day/weekday/dayname] of every [x] months
                    case C.RecurringDiaryEventScheduleType
                        .MonthlyOnOccurrenceOfDayEveryNMonths:
                        req = {
                            dayInMonth: 0,
                            interval: parseInt(
                                $form
                                    .find(
                                        '#rec-month-monthlyOnOccurrenceOfDayEveryNMonths-month'
                                    )
                                    .val()
                            ),
                            maxOccurrenceCount: 0,
                            monthInYear: 0,
                            occurrenceType: parseInt(
                                $form
                                    .find(
                                        '#rec-month-monthlyOnOccurrenceOfDayEveryNMonths-occurrence'
                                    )
                                    .val()
                            ),
                            scheduleType: typeId,
                            weekdayType: parseInt(
                                $form
                                    .find(
                                        '#rec-month-monthlyOnOccurrenceOfDayEveryNMonths-weekday'
                                    )
                                    .val()
                            )
                        };
                        break;
                }

                break;

            case C.Frequency.Yearly:
                typeId = parseInt(
                    $form
                        .find('input[name="rec-year-scheduleType"]:checked')
                        .val()
                );
                switch (typeId) {
                    //Every [monthname] [day]
                    case C.RecurringDiaryEventScheduleType
                        .YearlyOnSpecificDateEveryNYears:
                        req = {
                            dayInMonth: parseInt(
                                $form
                                    .find(
                                        '#rec-year-yearlyOnSpecificDateEveryNYears-day'
                                    )
                                    .val()
                            ),
                            interval: 1,
                            maxOccurrenceCount: 0,
                            monthInYear: parseInt(
                                $form
                                    .find(
                                        '#rec-year-yearlyOnSpecificDateEveryNYears-month'
                                    )
                                    .val()
                            ),
                            occurrenceType:
                                C.RecurringDiaryEventOccurrenceType.Unspecified,
                            scheduleType: typeId,
                            weekdayType:
                                C.RecurringDiaryEventWeekdayType.Unspecified
                        };
                        break;

                    //The [first/second/third/fourth/last] [day/weekday/dayname] of [monthname]
                    case C.RecurringDiaryEventScheduleType
                        .YearlyOnOccurrenceOfDayAndMonthEveryNYears:
                        req = {
                            dayInMonth: 0,
                            interval: 0,
                            maxOccurrenceCount: 0,
                            monthInYear: parseInt(
                                $form
                                    .find(
                                        '#rec-year-yearlyOnOccurrenceOfDayAndMonthEveryNYears-month'
                                    )
                                    .val()
                            ),
                            occurrenceType: parseInt(
                                $form
                                    .find(
                                        '#rec-year-yearlyOnOccurrenceOfDayAndMonthEveryNYears-occurrence'
                                    )
                                    .val()
                            ),
                            scheduleType: typeId,
                            weekdayType: parseInt(
                                $form
                                    .find(
                                        '#rec-year-yearlyOnOccurrenceOfDayAndMonthEveryNYears-weekday'
                                    )
                                    .val()
                            )
                        };
                        break;
                }
                break;
        }

        //Set common fields.
        req.startTime = $form.find('#rec-allDayEvent').prop('checked')
            ? Date.parse('1 Jan 1900 00:00:00') //00:00:00 = all day event (start)
            : Date.parse(
                  '1 Jan 1900 {0}'.format($form.find('#rec-startTime').val())
              );
        req.endTime = $form.find('#rec-allDayEvent').prop('checked')
            ? Date.parse('1 Jan 1900 23:59:59') //23:59:59 = all day event (end)
            : Date.parse(
                  '1 Jan 1900 {0}'.format($form.find('#rec-endTime').val())
              );

        if (!me.isException) {
            req.startDate = $form.find('#rec-start').val();
            req.endDate = $form.find('#rec-end').val();
        } else {
            req.startDate = $form
                .find('#Event_RecurringSchedule_StartDate')
                .val();
            req.endDate = $form.find('#Event_RecurringSchedule_EndDate').val();
        }

        //Apply values to hidden inputs.
        // - Note that not all inputs are changed from their original values so aren't listed here.  Only changeable
        //   from within the various freq boxes are.
        if (!me.isException) {
            $form
                .find('#Event_StartDate')
                .val(req.startTime.toString('dd MMM yyyy HH:mm:ss'));
            $form
                .find('#Event_EndDate')
                .val(req.endTime.toString('dd MMM yyyy HH:mm:ss'));
        }

        $form.find('#Event_RecurringSchedule_DayInMonth').val(req.dayInMonth);
        $form.find('#Event_RecurringSchedule_EndDate').val(req.endDate);
        $form.find('#Event_RecurringSchedule_Interval').val(req.interval);
        $form
            .find('#Event_RecurringSchedule_MaxOccurrenceCount')
            .val(req.maxOccurrenceCount);
        $form.find('#Event_RecurringSchedule_MonthInYear').val(req.monthInYear);
        $form
            .find('#Event_RecurringSchedule_OccurrenceType')
            .val(req.occurrenceType);
        $form
            .find('#Event_RecurringSchedule_ScheduleType')
            .val(req.scheduleType);
        $form.find('#Event_RecurringSchedule_StartDate').val(req.startDate);
        $form.find('#Event_RecurringSchedule_WeekdayType').val(req.weekdayType);
    },

    setupContactAC: function ($e) {
        var me = this;

        $e.autoCompleteEx({
            modelType: C.ModelType.Contact,
            includeContacts: true,
            includeUsers: false,
            search: {
                ApplyFurtherFilteringtoIds: true //?
            },
            placeholder: 'Search for Contact...',
            onSelected: function (args) {
                var $row = args.$e.closest('.row');
                $row.attr('data-id', args.id);
                $row.find('input[data-id="contactId"]').val(args.id);
            },
            onRemoved: function (id) {
                if (me.$root.find('.contacts .row').length > 1) {
                    me.$root
                        .find('.contacts .row[data-id="' + id + '"]')
                        .remove();
                }
            }
        });
    },

    setupPropertyAC: function ($e) {
        var me = this;

        $e.autoCompleteEx({
            modelType: C.ModelType.Property,
            search: {
                StatusIdList: [
                    C.SaleStatus.Available,
                    C.SaleStatus.UnderOffer,
                    C.SaleStatus.UnderOfferMarketing,
                    C.SaleStatus.UnderOfferAvailable,
                    C.SaleStatus.Instructed,
                    C.SaleStatus.Appraisal,
                    C.SaleStatus.Exchanged,
                    C.RentStatus.Available,
                    C.RentStatus.UnderOffer,
                    C.RentStatus.LetMarketing,
                    C.RentStatus.Instructed,
                    C.RentStatus.Appraisal,
                    C.RentStatus.Let,
                    C.RentStatus.LetAgreed
                ],
                ApplyFurtherFilteringtoIds: true
            },
            displayRecordType: true,
            placeholder: 'Search for Property...',
            onSelected: function (args) {
                var $row = args.$e.closest('.row');
                $row.attr('data-id', args.id);
                $row.find('input[data-id="contactId"]').val(args.id);
            },
            onRemoved: function (id) {
                if (me.$root.find('.properties .row').length > 1) {
                    me.$root
                        .find('.properties .row[data-id="' + id + '"]')
                        .remove();
                }
            }
        });
    },

    setupMiniDiary: function ($targets) {
        var me = this;

        $targets.miniDiary({
            userId: shell.userId,
            mode: C.CalendarMode.Me,
            allowCreate: false,
            allowEdit: true,
            highlightedEventIds: [me.id], //even if new (zero)
            highlightedInstanceId: me.instanceId,
            useStartForFirstHour: true,
            onPeriodSelected: function (req, authoriseCallback) {
                //Use the period.
                authoriseCallback(true);
            },
            onEventMoved: null
        });
    },

    _getActionType: function ($button) {
        var me = this;

        //This func is here because the "Cancel" / "Cancel Series" button on the appointment form just set the cancellation
        //status to CancelledByOffice - then it triggers the click event of the Save button.

        var intendedAction = $button.text();
        var status = me.isException
            ? parseInt(me.$root.find('#RecurringException_Status').val())
            : parseInt(me.$root.find('#Event_Status').val());

        if (status === C.EventStatus.CancelledByOffice) {
            intendedAction = 'Cancel';
        }

        return intendedAction;
    },

    action: function (callback, $button) {
        var me = this;

        var intendedAction = me._getActionType($button);

        var send = function ($form) {
            $form.prop('action', '/diary/updateappointment');

            //Post form.
            new gmgps.cloud.http("appointment-action").postForm(
                $form,
                function (response) {
                    if (response.Data) {
                        //Send email notifications
                        if (me.$emailToggle.hasClass('on')) {
                            var after = function () {
                                //Build request.
                                var request = {
                                    subject: me.$root
                                        .find('#EmailNotificationSubject')
                                        .val(),
                                    originatingEventId: response.Data.Id,
                                    originatingEventCategory:
                                        C.EventCategory.Diary,
                                    messageBody:
                                        '<p><b>{0}</b></p><p>{1}</p>'.format(
                                            me.$root
                                                .find(
                                                    '#EmailNotificationSubject'
                                                )
                                                .val(),
                                            me.$editor[0].$area.val()
                                        ),
                                    recipients: [],
                                    exemptFromCamsIntegration: true
                                };

                                //Build negotiator recipients.
                                me.$root
                                    .find('.as-selections li')
                                    .each(function (i, v) {
                                        var $row = $(v);

                                        if (
                                            $row.attr('data-udf2') !== undefined
                                        ) {
                                            var modelType = parseInt(
                                                $row.attr('data-modelType')
                                            );

                                            switch (modelType) {
                                                case C.ModelType.SavedSearch: //(UserGroup)
                                                    var userIds = $row
                                                        .attr('data-udf1')
                                                        .split(',');
                                                    var emailAddresses = $row
                                                        .attr('data-udf2')
                                                        .split(',');
                                                    var names = $row
                                                        .attr('data-udf3')
                                                        .split(',');

                                                    $.each(
                                                        emailAddresses,
                                                        function (
                                                            i,
                                                            emailAddress
                                                        ) {
                                                            var recipient = {
                                                                userId: parseInt(
                                                                    userIds[i]
                                                                ),
                                                                recipientType:
                                                                    C.DocumentRecipientType.User,
                                                                recipientName:
                                                                    names[i],
                                                                emailAddress:
                                                                    emailAddress
                                                            };

                                                            request.recipients.push(
                                                                recipient
                                                            );
                                                        }
                                                    );
                                                    break;

                                                case C.ModelType.User:
                                                    var recipient = {
                                                        userId: parseInt(
                                                            $row.attr(
                                                                'data-value'
                                                            )
                                                        ),
                                                        recipientType:
                                                            C.DocumentRecipientType.User,
                                                        recipientName:
                                                            $row.text(),
                                                        emailAddress:
                                                            $row.attr(
                                                                'data-udf2'
                                                            )
                                                    };

                                                    request.recipients.push(
                                                        recipient
                                                    );
                                                    break;

                                            }
                                        }
                                    });

                                //Build contact recipients
                                var contactIdsToSearch = [];
                                me.$root.find('.records.contacts tbody input.contact-ac').each(function (i, v) {
                                    var $row = $(v);
                                    if ($row.data('id') !== undefined && $row.data('modeltype') == C.ModelType.Contact) {
                                        if ($row.data('udf2') == undefined) {
                                            contactIdsToSearch.push($row.data('id'));
                                        }
                                        else {
                                            var recipientContact = {
                                                contactId: parseInt($row.data('id')),
                                                recipientType: C.DocumentRecipientType.Contact,
                                                recipientName: $row.data('udf6'),
                                                emailAddress: $row.data('udf2')
                                            };

                                            request.recipients.push(recipientContact);
                                        }

                                    }
                                })

                                var sendMailMessages = function () {
                                    //Append notes and attendees.
                                    request.messageBody += '<p>{0}</p>'.format(
                                        me.$root.find('#Notes').val()
                                    );
                                    request.messageBody += '<p>{0}</p>'.format(
                                        '<b>Attendees:</b>'
                                    );
                                    $.each(
                                        request.recipients,
                                        function (i, recipient) {
                                            request.messageBody +=
                                                '<br/>{0}<br/>'.format(
                                                    recipient.recipientName
                                                );
                                        }
                                    );

                                    //Send messages.
                                    new gmgps.cloud.http("appointment-action").ajax(
                                        {
                                            args: request,
                                            complex: true,
                                            dataType: 'json',
                                            type: 'post',
                                            url: '/Comms/SendMailMessages'
                                        },
                                        function () {
                                            $.jGrowl('E-mail Notification Queued', {
                                                header: 'Message queued for delivery to the attendees.',
                                                theme: 'growl-updater growl-system',
                                                life: 2000
                                            });
                                        }
                                    );
                                };

                                //Search Contact emails if needed
                                if (contactIdsToSearch.length > 0) {
                                    new gmgps.cloud.http("appointment-action").ajax(
                                        {
                                            args: {
                                                ids: contactIdsToSearch
                                            },
                                            complex: true,
                                            dataType: 'json',
                                            type: 'post',
                                            url: '/contact/GetMailDetailsForContacts'
                                        },
                                        function (response) {
                                            if (response.Data.length === 0) {
                                                showInfo(
                                                    'None of the property owners have an email address.'
                                                );
                                                return;
                                            }

                                            if (response.Data && response.Data.length > 0) {
                                                $.each(
                                                    response.Data,
                                                    function (i, contactEmail) {
                                                        var recipientContact = {
                                                            contactId: contactEmail.ContactId,
                                                            recipientType: C.DocumentRecipientType.Contact,
                                                            recipientName: contactEmail.RecipientName,
                                                            emailAddress: contactEmail.EmailAddress
                                                        };

                                                        request.recipients.push(
                                                            recipientContact
                                                        );
                                                    }
                                                );
                                            }

                                            sendMailMessages();
                                        }
                                    );
                                } else {
                                    sendMailMessages();
                                }
                            };

                            //Resolve users in any specified groups, before constructing the message.
                            after();
                        }
                    }

                    //Conditionally shift Follow Ups
                    var originalDate = Date.parse(
                        me.$root.find('#Event_StartDate').val()
                    );
                    var newDate = Date.parse(
                        me.$root
                            .find('.mini-diary-input')
                            .attr('data-startDateTime')
                    );
                    gmgps.cloud.helpers.diary.promptToMoveFollowUps(
                        response.Data.Id,
                        originalDate,
                        newDate
                    );

                    if (callback) {
                        callback();
                    }
                }
            );
        };

        //The action is postponed until validation has taken place.  It is done as a callback because validation may require an async prompt to be displayed.
        var afterValidation = function (valid) {
            //Exit if validtion failed.
            if (!valid) return false;

            var $form = createForm(me.$root, '/diary/getdiaryconflicts');

            //Recurring/Non-Recurring prep (dates, times, etc).
            var recurring = $form.find('.recurring-toggle').hasClass('on');
            $form
                .find('#Event_IsRecurring')
                .val(recurring.toString().toProperCase());

            var urgent = $form.find('.urgent-toggle').hasClass('on');
            $form.find('#Event_IsUrgent').val(urgent.toString().toProperCase());

            if (recurring) {
                //Recurring, populate recurringSchedule data.
                me.setRecurringSchedule($form);
            } else {
                //Non-Recurring, remove recurringSchedule data.
                $form.find('.x-recurring').remove();
                $form
                    .find('#Event_StartDate')
                    .val(
                        $form
                            .find('.mini-diary-input')
                            .attr('data-startDateTime')
                    );
                $form
                    .find('#Event_EndDate')
                    .val(
                        $form.find('.mini-diary-input').attr('data-endDateTime')
                    );
            }

            //Exception prep.
            if (me.isException) {
                //This is an exception, populate recurringException data.
                $form
                    .find('#RecurringException_StartDate')
                    .val(
                        $form
                            .find('.mini-diary-input')
                            .attr('data-startDateTime')
                    );
                $form
                    .find('#RecurringException_EndDate')
                    .val(
                        $form.find('.mini-diary-input').attr('data-endDateTime')
                    );
                $form
                    .find('#RecurringException_Location')
                    .val($form.find('#Location').val());
                $form
                    .find('#RecurringException_Notes')
                    .val($form.find('#Notes').val());
                $form
                    .find('#RecurringException_Title')
                    .val($form.find('#Event_SubTypeId option:selected').text());
                // Set recurring event subtypeId as the id from the initial load
                $form
                    .find('#Event_SubTypeId')
                    .val(me.subTypeId); 
            } else {
                //This is not an exception to a recurring event.  Remove recurringException data.
                $form.find('.x-recurring-ex').remove();

                //Apply location, notes and subtype fields to the event.
                $form
                    .find('#Event_Location')
                    .val($form.find('#Location').val());
                $form
                    .find('#Event_Notes')
                    .val($form.find('#Notes').val());
                $form
                    .find('#Event_Title')
                    .val($form.find('#Event_SubTypeId option:selected').text());
            }

            //Add associated data (parties) - Contacts.
            $form.find('.contacts .contact-ac').each(function (i, v) {
                var id = parseInt($(v).attr('data-id'));
                if (id != 0) {
                    $form.append(
                        '<input type="hidden" name="Contacts[{0}].Id" value="{1}" />'.format(
                            i,
                            id
                        )
                    );
                }
            });

            //Add associated data (parties) - Properties.
            $form.find('.properties .property-ac').each(function (i, v) {
                var id = parseInt($(v).attr('data-id'));
                if (id != 0) {
                    $form.append(
                        '<input type="hidden" name="Properties[{0}].Id" value="{1}" />'.format(
                            i,
                            id
                        )
                    );
                }
            });

            //Negotiators & UserGroups.
            // eslint-disable-next-line no-unused-vars
            var contactIndex = 0;
            var userIndex = 0;
            var userGroupIndex = 0;
            $form.Negotiators = new Array();
            $form
                .find('.negotiators li.as-selection-item')
                .each(function (i, v) {
                    var id = parseInt($(v).attr('data-value'));
                    var modelType = parseInt($(v).attr('data-modelType'));

                    switch (modelType) {
                        case C.ModelType.Contact:
                            // eslint-disable-next-line no-unused-vars
                            contactIndex++;
                            break;

                        case C.ModelType.User:
                            $form.append(
                                '<input type="hidden" name="Negotiators[{0}].Id" value="{1}" />'.format(
                                    userIndex,
                                    id
                                )
                            );
                            userIndex++;
                            break;

                        case C.ModelType.SavedSearch:
                            $form.append(
                                '<input type="hidden" name="UserGroups[{0}].Id" value="{1}" />'.format(
                                    userGroupIndex,
                                    id
                                )
                            );
                            userGroupIndex++;
                            break;
                    }
                });

            if (intendedAction === 'Save') {
                new gmgps.cloud.http("appointment-action").postForm(
                    $form,
                    function (response) {
                        var conflictedParties = response.Data;
                        var conflict = new gmgps.cloud.helpers.DiaryConflict(
                            conflictedParties
                        );

                        conflict.resolve($form, function () {
                            send($form);
                        });
                    }
                );
            } else {
                send($form);
            }
        };

        me.validate(afterValidation);
    },

    validate: function (callback) {
        var me = this;
        var valid = true;

        //Func to run basic validation.
        //  - Anything involving questions has to be done first.
        var after = function (valid) {
            //Init validation engine.
            me.$root.addClass('opt-validate').validationEngine({
                scroll: false
            });
            valid = me.$root.validationEngine('validate');

            //Must be at least one negotiator specified.
            if (me.$root.find('.negotiators .as-selection-item').length == 0) {
                me.$root
                    .find('.negotiators')
                    .validationEngine(
                        'showPrompt',
                        'Please assign at least one negotiator or diary group for this appointment.',
                        'x',
                        'topLeft',
                        true
                    );
                valid = false;
            }

            callback(valid);
        };

        var now = new Date();

        //Non-recurring only.
        if (!me.isRecurring) {
            //Date period - warn if period is in the past.
            var end = Date.parse(
                me.$root.find('.mini-diary-input').attr('data-endDateTime')
            );
            var start = Date.parse(
                me.$root.find('.mini-diary-input').attr('data-startDateTime')
            );

            var msg =
                end < now
                    ? 'The selected period for this appointment is in the past.'
                    : start < now
                    ? 'The selected period for this appointment begins in the past.'
                    : '';
            if (msg != '') {
                showDialog({
                    type: 'question',
                    title: 'Confirm Period',
                    msg: '{0}<br/></br>Is this ok?'.format(msg),
                    buttons: {
                        Yes: function () {
                            $(this).dialog('close');
                            after(true);
                        },
                        No: function () {
                            $(this).dialog('close');
                            //Callback early - user has chosen to adjust dates.
                            callback(false);
                        }
                    }
                });
            } else {
                //Date passed validation.
                after(valid);
            }
        } else {
            var recurringStart = Date.parse(me.$root.find('#rec-start').val());
            var daysAgo = parseInt(
                (now - recurringStart) / (1000 * 60 * 60 * 24)
            );

            if (daysAgo > 365 && me.id === 0) {
                showDialog({
                    type: 'question',
                    title: 'Confirm Period',
                    msg: 'The recurring event start date is too far in the past, please use a start date within the last year.',
                    buttons: {
                        Ok: function () {
                            $(this).dialog('close');
                            callback(false);
                        }
                    }
                });
            } else {
                if (me.instanceId == 0) {
                    //Recurring Series
                    switch (parseInt(me.$root.find('#EventFrequency'))) {
                        case C.Frequency.Daily:
                            break;
                        case C.Frequency.Weekly:
                            break;
                        case C.Frequency.Monthly:
                            break;
                        case C.Frequency.Yearly:
                            break;
                    }
                    after(valid);
                } else {
                    //Recurring Instance.
                    after(valid);
                }
            }
        }
    }
};
