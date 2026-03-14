gmgps.cloud.ui.views.diary = function (args) {
    var me = this;
    me.cfg = args;
    me.$root = args.$root;
    me.calendar = null;
    me.onToolbarSetContext = new gmgps.cloud.common.event();

    me.$toolbar = $('#toolbar #toolbar-diary-contextual');
    me.$diaryPrintButton = $('div[data-group="diary"] div[data-id="print"]');

    var now = new Date();
    me.month = now.getMonth();
    me.year = now.getFullYear();

    me.viewName = null;
    me.pickerSelectionStartId = 0;

    me.defaultEventDurations = {
        marketAppraisal: parseInt(
            me.$root.find('#_defaultMarketAppraisalMinutes').val()
        ),
        viewing: parseInt(me.$root.find('#_defaultViewingMinutes').val())
    };

    me.$monthPicker = null;
    me.$calendarPicker = null;
    me.initControls();
    me.init(args);

    return true;
};

gmgps.cloud.ui.views.diary.prototype = {
    initControls: function () {
        var me = this;

        //Panel
        me.panel = new gmgps.cloud.ui.controls.panel({
            $root: me.$root.find('.panel[data-id="diary"]'),
            entityType: 'diary',
            defaultLayer: 'list'
        });
    },

    init: function () {
        var me = this;

        me.panel.onPanelItemClicked.handle(function ($item) {
            me._panelItemClicked($item);
        });

        me.$root.find('select').customSelect();
        me.$monthPicker = me.$root.find('.panel-container .month-picker');
        me.$calendarPicker = me.$root.find('.panel-container .calendar-picker');

        me.$calendarPicker.disableSelection();

        //Month-Year > Inner > Click (Up/Down Control)
        me.$root.on('click', '.month-year .inner', function () {
            if (me.$monthPicker.hasClass('on')) {
                me.$monthPicker.removeClass('on').slideUp(250);
            } else {
                me.$monthPicker.addClass('on').slideDown(250);
            }
        });

        //Month-Up / Month-Down > Click
        me.$root.on('click', '.year-up, .year-down', function () {
            var $dropdown = me.$root.find('.year-dropdown');
            var min = parseInt($dropdown.find('option:first').val());
            var max = parseInt($dropdown.find('option:last').val());
            var year = parseInt($dropdown.val());
            if ($(this).hasClass('year-up')) {
                year++;
            } else {
                year--;
            }
            if (!(year < min || year > max)) {
                $dropdown.val(year).trigger('prog-change');
            }
        });

        //Month-Picker > Year > Change
        me.$root.on('change', '.year-dropdown', function () {
            //The year isn't set here - it's only set once the month is clicked.
            // - Flash the months to prompt a selection.
            me.$monthPicker
                .find('.month .inner')
                .show('highlight', { color: '#8ac23d' }, 500);
        });

        //Month-Picker > Month > Click
        me.$root.on('click', '.month-picker .month .inner', function () {
            var month = parseInt($(this).closest('.month').attr('data-month'));
            var year = parseInt(me.$monthPicker.find('.year-dropdown').val());

            if (me.mode != C.CalendarMode.ManagementDate) {
                //Set the month and year attributes on the month-picker.
                me.$monthPicker
                    .attr('data-year', year)
                    .attr('data-month', month);

                //Hide the month-picker.
                me.$monthPicker.removeClass('on').slideUp(250);

                //Goto date on the calendar(s) and configure the calendar-picker.
                // - Auto switch to month view if possible, else agendaWeek.
                me.calendar.changeViewAndGotoDate(
                    me.mode == C.CalendarMode.Group ||
                        me.mode == C.CalendarMode.BranchResource
                        ? 'agendaWeek'
                        : 'month',
                    year,
                    month,
                    1,
                    true
                );

                me.showCalendarPicker(month, year, function () {
                    //me.updateCalendarPickerCellHighlights(state.view);
                });
            } else {
                me.showManagementDates(
                    me.lastEventTypeId,
                    me.lastEventTitle,
                    function () {
                        //Hide the month-picker.
                        me.$monthPicker.removeClass('on').slideUp(250);
                    },
                    year,
                    month,
                    1
                );
            }
        });

        //Calendar Picker > Day > Click
        me.$root.on('click', '.calendar-picker td', function () {
            var $this = $(this);
            var day = parseInt($this.attr('data-day'));
            var month = parseInt($this.attr('data-month'));
            var year = parseInt($this.attr('data-year'));

            me.spinner(true);

            if (me.mode != C.CalendarMode.ManagementDate) {
                //Change to "day" view.
                //  - This isn't strictly required, but always feels odd when choosing a day and the calendar is in "month" or "week" view.
                //  - Year, month and day attributes have been written to the calendar picker cells.  Read them and pass in.
                me.calendar.changeViewAndGotoDate(
                    'agendaDay',
                    year,
                    month,
                    day,
                    true
                );
            } else {
                me.showManagementDates(
                    me.lastEventTypeId,
                    me.lastEventTitle,
                    function () {
                        me.spinner(false);
                    },
                    year,
                    month,
                    day
                );
            }
        });

        //Calendar Picker > Day > MouseDown
        me.$root.on('mousedown', '.calendar-picker td', function () {
            //About to start a custom period selection.  Exit early if an unsupported mode is being used.
            // - Unsupported modes are those which create multiple calendar instances.
            if (
                me.mode == C.CalendarMode.BranchResource ||
                me.mode == C.CalendarMode.Group
            ) {
                return;
            }

            me.pickerSelectionStartId = parseInt($(this).attr('data-id'));
        });

        //Calendar Picker > Day > MouseEnter
        me.$root.on('mouseenter', '.calendar-picker td', function () {
            //Exit early if there's no selectionStartId currently (mouse is up).
            if (me.pickerSelectionStartId == 0) return;

            //Exit early if this is the starting cell.
            var id = parseInt($(this).attr('data-id'));

            //Calc start and end cells (allowing for backward selections as well as forward.
            var start =
                id < me.pickerSelectionStartId ? id : me.pickerSelectionStartId;
            var end =
                id < me.pickerSelectionStartId ? me.pickerSelectionStartId : id;

            //Remove current highlighted selection.
            me.$calendarPicker.find('td.selected').removeClass('selected');

            //Create new highlighted selection.
            var $cells = me.$calendarPicker.find('td').filter(function () {
                var thisId = parseInt($(this).attr('data-id'));
                return thisId >= start && thisId <= end;
            });
            $cells.addClass('selected');
        });

        //Calendar (via root) Picker > Day > MouseUp
        me.$root.on('mouseup', function () {
            //Exit early if there was no selection going on.
            if (me.pickerSelectionStartId == 0) return;

            //Reset the selectionStartId.
            me.pickerSelectionStartId = 0;

            var $selectedDays = me.$calendarPicker.find('td.selected');
            var $firstSelectedDay = $selectedDays.first();
            var $lastSelectedDay = $selectedDays.last();
            var selectedDayCount = $selectedDays.length;

            //Exit early if only one day was selected.
            if (selectedDayCount <= 1) return;

            //Turn off all "on" cells.
            me.$calendarPicker.find('td.on').removeClass('on');

            //Decide whether to go to a week view, a month view or a period view.
            if (
                selectedDayCount == 7 &&
                $firstSelectedDay.hasClass('first-day-week') &&
                $lastSelectedDay.hasClass('last-day-week')
            ) {
                me.calendar.changeViewAndGotoDate(
                    'agendaWeek',
                    parseInt($firstSelectedDay.attr('data-year')),
                    parseInt($firstSelectedDay.attr('data-month')),
                    parseInt($firstSelectedDay.attr('data-day')),
                    true
                );
            } else if (
                $firstSelectedDay.hasClass('first-day-month') &&
                $lastSelectedDay.hasClass('last-day-month')
            ) {
                me.calendar.changeViewAndGotoDate(
                    'month',
                    parseInt($firstSelectedDay.attr('data-year')),
                    parseInt($firstSelectedDay.attr('data-month')),
                    parseInt($firstSelectedDay.attr('data-day')),
                    true
                );
            } else {
                //Go to the start date with the selected period.
                me.renderCalendars(
                    null,
                    null,
                    null,
                    null,
                    {
                        year: parseInt($firstSelectedDay.attr('data-year')),
                        month: parseInt($firstSelectedDay.attr('data-month')),
                        day: parseInt($firstSelectedDay.attr('data-day'))
                    },
                    selectedDayCount
                );
            }
        });

        //Panel Plugin: Toggle button clicked
        me.$root.on('click', '.diary-controls .toggle-button', function () {
            $(this).parent().children().removeClass('selected');
            $(this).addClass('selected');

            var viewMode = $(this).data('id');
            me.setViewMode(viewMode);
            //Set this view as the default for next time.
            $.cookie('diary.lastViewMode', viewMode);
        });

        //Panel > Filter Dropdown > Change
        me.$root.on('change', '.panel .filter-dropdown', function (event) {
            var $item = $(this).closest('.item');
            var eventValue =
                event.target.value === 'branch'
                    ? 'branch_view'
                    : 'resource_view';

            googleAnalytics.sendEvent('diaries', 'menu_item_click', eventValue);

            me.processSidePanelRequest($item);
        });

        //Event Filters > Change
        me.$toolbar.on('change', '.toggle', function () {
            //Count the selected filters.  Recurring filter does not count.
            var count = me.$toolbar.find(
                '.toolbar-toggle[data-id!="recurring"] .toggle.on'
            ).length;

            if (count == 0) {
                //All searchable inclusions are off, force general appointments to be on.
                me.$toolbar
                    .find('.toolbar-toggle[data-id="general"] .toggle')
                    .addClass('on');
                me.calendar.clear();
            }

            //Alter the search.
            me.calendar.refresh(me.getSearchFilters());
        });

        me.$root.on('click', '.management-events .header', function () {
            $(this).next('.content').slideToggle('fast');
        });

        me.$root.on(
            'click',
            '.management-events .content .rowitem.editable',
            function (e) {
                var $this = $(this);
                if (!$(e.target).hasClass('preview-link')) {
                    gmgps.cloud.helpers.diary.getManagementDate(
                        $this.data('linkedid'),
                        $this.data('linkedtypeid'),
                        $this.data('id'),
                        [],
                        function () {
                            me.$calendarPicker.find('.on').trigger('click');
                        }
                    );
                    e.stopPropagation();
                }
            }
        );

        me.$root.find('.calendars').on('click', '.fc-button', (event) => {
            var diaryType = '';

            switch (event.target.innerText) {
                case 'Day':
                    diaryType = 'day_view';
                    break;
                case 'Day Summary':
                    diaryType = 'day_summary';
                    break;
                case 'Week':
                    diaryType = 'week_view';
                    break;
                case 'Week Summary':
                    diaryType = 'week_summary';
                    break;
                case 'Month':
                    diaryType = 'month_view';
                    break;
            }

            var eventValue = diaryType + me.getCalendarToggleStatus();

            googleAnalytics.sendEvent('diaries', 'button_click', eventValue);
        });

        me.$diaryPrintButton.on('click', function () {
            var diaryType = document.querySelector(
                '.fc-button.fc-state-active'
            ).innerText;
            var eventValue =
                'print; ' + diaryType + me.getCalendarToggleStatus();

            googleAnalytics.sendEvent('diaries', 'button_click', eventValue);
        });

        //Click the server-applied selection (one-time operation)
        setTimeout(function () {
            me.panel.selectDefaultItem();
        }, 1);

        //Setup the clock.
        me.setupClock();

        me.setupToolbar();
    },

    setupToolbar: function () {
        var $tb = $('#toolbar .group[data-group="diary"] .detail');

        var $b = $tb.find('div[data-id="actions"]');
        $b.show().find('.item').hide(); //hide all status items to begin with.

        $b.find('.item[data-id="manage-diary-groups"]').show();
        $b.find('.item[data-id="save-diary-default"]').show();

        if (shell.pmInstalled) {
            $b.find('.item[data-id="manage-eventdate-groups"]').show();
        }
    },

    action: function (args) {
        var me = this;

        switch (args.action) {
            case 'manage-eventdate-groups':
                gmgps.cloud.helpers.user.openManagementGroupManager({
                    userGroupType: C.UserGroupType.Management,
                    title: 'Edit Management Dates'
                });
                break;

            case 'manage-diary-groups':
                gmgps.cloud.helpers.user.openUserGroupManager({
                    userGroupType: C.UserGroupType.Diary,
                    title: 'Diary Group Manager'
                });
                break;
            case 'save-diary-default':
                var key = 'diary.item';
                var data = me.$root.find('li.on h3').text();

                new gmgps.cloud.http("diary-action").ajax(
                    {
                        args: { key: key, data: JSON.stringify(data) },
                        complex: false,
                        dataType: 'json',
                        type: 'post',
                        background: true,
                        url: '/user/PutUiPersonalisation',
                        async: true
                    },
                    function (response) {
                        if (response.Data) {
                            //Store current active diary view type
                            var start =
                                me.$root
                                    .find('.fc-state-active')
                                    .attr('class')
                                    .indexOf('fc-button-') + 10;
                            var end = me.$root
                                .find('.fc-state-active')
                                .attr('class')
                                .indexOf(' ', start);
                            var data = me.$root
                                .find('.fc-state-active')
                                .attr('class')
                                .substring(start, end);
                            var key = 'diary.view';

                            new gmgps.cloud.http("diary-action").ajax(
                                {
                                    args: {
                                        key: key,
                                        data: JSON.stringify(data)
                                    },
                                    complex: false,
                                    dataType: 'json',
                                    type: 'post',
                                    background: true,
                                    url: '/user/PutUiPersonalisation',
                                    async: true
                                },
                                function (response) {
                                    if (response.Data) {
                                        //Store current filter state
                                        var key = 'diary.filters';
                                        var data = {
                                            viewingsA: me.$toolbar
                                                .find(
                                                    '.toolbar-toggle[data-id="viewing-a"] .toggle'
                                                )
                                                .hasClass('on'),
                                            viewingsU: me.$toolbar
                                                .find(
                                                    '.toolbar-toggle[data-id="viewing-u"] .toggle'
                                                )
                                                .hasClass('on'),
                                            appraisals: me.$toolbar
                                                .find(
                                                    '.toolbar-toggle[data-id="appraisal"] .toggle'
                                                )
                                                .hasClass('on'),
                                            general: me.$toolbar
                                                .find(
                                                    '.toolbar-toggle[data-id="general"] .toggle'
                                                )
                                                .hasClass('on'),
                                            recurring: me.$toolbar
                                                .find(
                                                    '.toolbar-toggle[data-id="recurring"] .toggle'
                                                )
                                                .hasClass('on')
                                        };
                                        new gmgps.cloud.http(
                                            "diary-action"
                                        ).ajax(
                                            {
                                                args: {
                                                    key: key,
                                                    data: JSON.stringify(data)
                                                },
                                                complex: false,
                                                dataType: 'json',
                                                type: 'post',
                                                background: true,
                                                url: '/user/PutUiPersonalisation',
                                                async: true
                                            },
                                            function (response) {
                                                if (response.Data) {
                                                    $.jGrowl(
                                                        'Your current diary view has been saved as your default.',
                                                        {
                                                            header: 'Diary View Saved',
                                                            theme: 'growl-diary'
                                                        }
                                                    );
                                                }
                                            }
                                        );
                                    }
                                }
                            );
                        }
                    }
                );

                break;
            case 'print':
                //Clone the cached search object from the calendar.
                var search = {};
                $.extend(search, me.calendar.search);

                //Alter the start and end dates so that they are a true representation of what is being displayed on the screen.
                var view = me.calendar.getView();
                search.startDate = view.start;
                search.endDate = view.end;

                //Subtract one second from the end date in order not to include the endDate day in the list.
                search.endDate.add(-1).seconds();

                gmgps.cloud.helpers.diary.openPrintableDiary({
                    id: me.id,
                    mode: me.mode,
                    view: me.calendar.viewName,
                    search: search,
                    searchFilters: me.getSearchFilters(),
                    title: me.$root.find('.fc-header h3').text()
                });

                break;
        }
    },

    createEvent: function (req) {
        var me = this;

        //Property & Contact Id's are unknown.
        req.propertyId = 0;
        req.contactId = 0;

        //Use the linkedId to set the appointed userId.
        if (me.mode == C.CalendarMode.Branch || me.mode == C.CalendarMode.GroupWeekView) {
            //In branch mode, the linkedId is that of the branch, not a user (except in BranchResource mode).
            //Likewise, in GroupWeekView mode, the linkedId is that of the Diary Group Id (ie. SearchId), we cannot use this as the userId when passing it to the GetAppointment as it is not supported but more importantly not relevant for when creating an appointment
            //So, the userId is set to the shell userId instead.
            req.userId = shell.userId;
        } else {
            req.userId = req.linkedId;
        }

        var notAllDay = function (req, eventType) {
            var durationMins;
            switch (eventType) {
                case C.EventType.Valuation:
                    durationMins = me.defaultEventDurations.marketAppraisal;
                    break;
                case C.EventType.Viewing:
                    durationMins = me.defaultEventDurations.viewing;
                    break;
                default:
                    durationMins = 60;
                    break;
            }

            //If the req is all day, change it so that it's one hour instead, with the start time being 9am.
            if (req.allDay) {
                req.start.setHours(9, 0, 0);
                req.end.setHours(9, 0, 0);
                req.end.addMinutes(durationMins);
            }
        };

        switch (req.type) {
            case C.EventType.Viewing:
                notAllDay(req, C.EventType.Viewing);
                gmgps.cloud.helpers.property.getViewing(req);
                break;
            case C.EventType.Valuation:
                notAllDay(req, C.EventType.Valuation);
                gmgps.cloud.helpers.property.createMarketAppraisal(req);
                break;
            case C.EventType.General:
                //Add the linkedId as a default negotiator (can be changed once displayed).
                req.preSelectedParties = [
                    { modelType: C.ModelType.User, id: req.userId }
                ];
                gmgps.cloud.helpers.diary.getAppointment(req);
                break;
        }
    },

    getSearchFilters: function () {
        var me = this;

        var searchFilters = {
            viewingsA: me.$toolbar
                .find('.toolbar-toggle[data-id="viewing-a"] .toggle')
                .hasClass('on'),
            viewingsU: me.$toolbar
                .find('.toolbar-toggle[data-id="viewing-u"] .toggle')
                .hasClass('on'),
            appraisals: me.$toolbar
                .find('.toolbar-toggle[data-id="appraisal"] .toggle')
                .hasClass('on'),
            general: me.$toolbar
                .find('.toolbar-toggle[data-id="general"] .toggle')
                .hasClass('on'),
            recurring: me.$toolbar
                .find('.toolbar-toggle[data-id="recurring"] .toggle')
                .hasClass('on')
        };

        return searchFilters;
    },

    monthPickerGoto: function (month, year) {
        var me = this;
        var d = new Date(year, month, 1);

        //Set the month and year attributes on the month-picker.
        me.$monthPicker.attr('data-year', year).attr('data-month', month);

        //Update the year dropdown and trigger a prog-change.
        me.$monthPicker.find('select').val(year).trigger('prog-change');

        //Update the description of the month/year in the header.
        var $target = me.$root.find('.panel-container .month-year .inner');
        $target.html(
            '{0} <span class="down"></span>'.format(d.toString('MMMM yyyy'))
        );
    },

    _panelItemClicked: function (args) {
        var me = this;
        me.processSidePanelRequest(args.$item, args.onComplete);
        return;
    },

    persist: function () {
        //todo
    },

    processSidePanelRequest: function ($item, callback) {
        var me = this;

        //Get the mode from the panel item and the id from the dropdown.
        me.mode = parseInt($item.attr('data-id'));
        var id;
        var title = '';

        switch (me.mode) {
            case C.CalendarMode.Me:
                id = parseInt($item.attr('data-data'));
                title = shell.userName;
                break;

            case C.CalendarMode.User:
                //todo, if req.
                id = parseInt($item.attr('data-data'));
                break;

            case C.CalendarMode.Branch:
            case C.CalendarMode.BranchResource:
                var style = $item.find('#Style').val();
                title = $item.find('#Branch option:selected').text();

                //Resource/Branch mode setting.
                switch (style) {
                    case 'resource':
                        me.mode = C.CalendarMode.BranchResource;
                        title += ' (Resource View)';
                        break;
                    case 'branch':
                        //
                        break;
                }

                //Use branchId.
                id = parseInt($item.find('#Branch option:selected').val());
                me.selectedBranchId = id;
                break;

            case C.CalendarMode.ManagementDate:
                id = parseInt($item.attr('data-data'));
                title = $item.find('h3').text();
                break;

            case C.CalendarMode.Group:
            case C.CalendarMode.GroupWeekView:

                //Use "data" data attribute, to get groupId.
                var userId = parseInt($item.find('#View').val());
                if (userId === 0) {
                    //Use groupId.
                    id = parseInt($item.attr('data-data'));
                    title = '{0} (Group - User view)'.format($item.find('h3').text());

                /* As we want to preserve the original "Group" mode, but also add a "Group (week view)" to the drop down of the same PanelItem (where each PanelItem can only have 1 CalendarMode)
                   We use -1 to differentiate the original "Group" mode and indicate to the FE that we now want Group (week view) mode */
                } else if (userId === -1) {
                    id = parseInt($item.attr('data-data')); //This will be the saved search / diary group Id
                    me.mode = C.CalendarMode.GroupWeekView;

                    title = '{0} (Group - Week view)'.format($item.find('h3').text());

                } else {
                    //Use userId (and switch to user mode)
                    id = userId;
                    me.mode = C.CalendarMode.User;
                    title = '{0} > {1}'.format(
                        $item.find('h3').text(),
                        $item.find('#View option:selected').text()
                    );
                }
                break;

            default:
                //Other
                id = parseInt($item.attr('data-data'));
                break;
        }

        if (me.mode !== C.CalendarMode.ManagementDate) {
            me.showCalendars(me.mode, id, title, callback);
        } else {
            me.$root.find('.content-container.list').hide();
            me.lastEventTypeId = id;
            me.lastEventTitle = title;
            me.showManagementDates(
                me.lastEventTypeId,
                me.lastEventTitle,
                callback
            );
        }
    },

    pnUpdate: function (pn) {
        var me = this;
        me.calendar.pnUpdate(pn, me.getSearchFilters());
    },

    refresh: function () {
        var me = this;
        me.calendar.refresh();
    },

    redisplayed: function () {
        var me = this;

        me.calendar.rerender();
    },

    getCalendarToggleStatus: function () {
        var me = this;
        var eventSeparator = '; ';
        var dateTime = new Date()
            .toLocaleString()
            .replace(/\//g, '-')
            .replace(',', '');

        var isToggleEnabled = function (toggleDataId) {
            return me.$toolbar.find(
                '.toolbar-toggle[data-id="' + toggleDataId + '"] .toggle.on'
            ).length > 0
                ? 'true'
                : 'false';
        };

        var toolbarTogglesStatus = [
            'Viewing (a) - ' + isToggleEnabled('viewing-a'),
            'Viewing (u)- ' + isToggleEnabled('viewing-u'),
            'Appraisal - ' + isToggleEnabled('appraisal'),
            'General - ' + isToggleEnabled('general'),
            'Recurring - ' + isToggleEnabled('recurring')
        ];

        return (
            eventSeparator +
            dateTime +
            ' (Diary Options) - ' +
            toolbarTogglesStatus.join(eventSeparator)
        );
    },

    renderCalendars: function (
        mode,
        id,
        title,
        calendarDefinitions,
        start,
        customDays,
        callback
    ) {
        var me = this;

        //If settings weren't supplied, use the ones from last time.
        if (!mode) mode = me.mode;
        if (!id) id = me.id;
        if (!title) title = me.title;
        if (!calendarDefinitions) calendarDefinitions = me.calendarDefinitions;

        //Store current settings.
        me.mode = mode;
        me.id = id;
        me.title = title;
        me.calendarDefinitions = calendarDefinitions;

        //If there is an existing calendar in existence, destroy it.
        if (me.calendar) {
            me.calendar.destroy();
        }
        me.calendar = null;

        //Empty the calendars container.
        var $calendars = me.$root.find('.calendars');
        $calendars.empty();

        //If any filters had been programatically unticked previously, tick them.
        me.$root
            .find('.event-filters .prog-unticked')
            .addClass('ticked')
            .removeClass('prog-unticked')
            .find('input')
            .prop('checked', true);

        //Create an instance of the calendar controller.
        var defaults = {};

        // Load current view from cookie when in Me mode
        if (calendarDefinitions[0].mode == C.CalendarMode.Me) {

            defaults.viewName = $.cookie('diary.viewName');
        }

        //Always pull current viewed date from cookies
        defaults.start = Date.parse($.cookie('diary.start'));
        defaults.customDays = parseInt(
            Date.parse($.cookie('diary.customDays'))
        );

        if (isNaN(defaults.customDays)) {
            defaults.customDays = null;
        }

        //Was a start date supplied? (override)
        if (start) {
            defaults.start = new Date(start.year, start.month, start.day);
        }
        if (customDays) {
            defaults.customDays = customDays;
        }

        me.calendar = new gmgps.cloud.ui.controls.calendar({
            $root: me.$root.find('.calendars'),
            title: title,
            calendarDefinitions: calendarDefinitions,
            allowCreate: true,
            allowEdit: true,
            defaults: defaults,
            userReferenceCode: shell.userReferenceCode,
            searchFilters: me.getSearchFilters(),
            onRebuildRequired: function (viewName) {
                //Expire cookie at midnight.
                var expires = Date.today().add(1).days();

                $.cookie('diary.viewName', viewName, expires);
                $.cookie('diary.customDays', null, expires);
                me.renderCalendars(
                    null,
                    null,
                    null,
                    null,
                    null,
                    null,
                    callback
                );
            },
            onEventMoved: function (eventData, info) {
                var originalDate = new Date(eventData.start.valueOf());
                originalDate.add(info.dayDelta * -1).days();

                gmgps.cloud.helpers.diary.promptToMoveFollowUps(
                    eventData.id,
                    originalDate,
                    eventData.start,
                    function () {
                        //Prompt for email/sms confirmation.
                        if (
                            eventData.data.Type == C.EventType.Valuation ||
                            (eventData.data.Type == C.EventType.Viewing &&
                                eventData.data.ConfirmationStatus == 2)
                        ) {
                            gmgps.cloud.helpers.general.getMultiMessager({
                                title: 'Send Confirmations and Set Up Reminders for this updated Appointment',
                                settings: {
                                    allowAnonymousRecipients: true,
                                    eventId: eventData.id,
                                    eventCategory: C.EventCategory.Diary
                                },
                                onComplete: function () {
                                    //Prompt for letters.
                                    gmgps.cloud.helpers.general.promptForLetters(
                                        {
                                            eventHeaders: [
                                                {
                                                    Id: eventData.id,
                                                    Category:
                                                        C.EventCategory.Diary,
                                                    NoOutput: false
                                                }
                                            ]
                                        }
                                    );
                                }
                            });
                        }
                    }
                );
            },
            onCreateEvent: function (req) {
                me.createEvent(req);
            },
            onEditEvent: function () {
                //todo?  Depends if only the full diary can edit events.  Safer to allow all instances (including mini) to edit events, for now.
            },
            onViewChanged: function (state) {
                //Store the view name.
                me.viewName = state.view.name;

                //If the month-picker is on show, close it.
                if (me.$monthPicker.hasClass('on')) {
                    me.$monthPicker.removeClass('on').slideUp(250);
                }

                //Callback to say calendar is rendered.
                if (callback) callback();

                if (!state.lastGotoExternal) {
                    //The trigger for this was internal to the calendar (external to the diary), or the first render.
                    me.showCalendarPicker(
                        state.view.start.getMonth(),
                        state.view.start.getFullYear(),
                        function () {
                            me.updateCalendarPickerCellHighlights(state);
                        }
                    );
                } else {
                    if (
                        state.mode == C.CalendarMode.BranchResource ||
                        state.mode == C.CalendarMode.Group
                    ) {
                        //The trigger for this change was external to the calendar and we have multiple instances (internal to the diary).
                        // - Wait 350ms (calendar picker will be scrolling into position) then update cell highlights).
                        setTimeout(function () {
                            me.updateCalendarPickerCellHighlights(state);
                        }, 350);
                    } else {
                        me.updateCalendarPickerCellHighlights(state);
                    }
                }

                // Persist date and view for ALL modes
                //Expire cookie at midnight.
                var expires = Date.today().add(1).days();
                var start = state.view.start.toString('dd MMM yyyy');

                //Create cookies.
                //The calendar library has a start.end date system without a keeping track real "current" date.
                //when in a week or month view the start date is the start of that week/month
                //in order to keep UX/Visual clarity around datetime persistence between view transitions if we are looking at the current week or month the start date in the cookie should be today.
                var today = Date.today();
                switch (state.view.name) {
                    case 'agendaDay':
                    case 'basicDay':
                        $.cookie('diary.start', start, expires);
                        break;
                    case 'agendaWeek':
                    case 'basicWeek':
                        if (today.between(state.view.start, state.view.end)) {
                            $.cookie('diary.start', today.toString('dd MMM yyyy'), expires);
                        } else {
                            $.cookie('diary.start', start, expires);
                        }
                        $.cookie('diary.customDays', customDays, expires);
                        break;
                    case 'month':
                        if (today.between(state.view.start, state.view.end)) {
                            $.cookie('diary.start', today.toString('dd MMM yyyy'), expires);
                        } else {
                            $.cookie('diary.start', start, expires);
                        }
                        break;
                }
                $.cookie('diary.viewName', state.view.name, expires);

                me.spinner(false);
            }
        });
    },

    setupClock: function () {
        var me = this;

        var $clock = me.$root.find('#diary-clock');
        $clock.appendTo('#toolbar .group[data-group="diary"]');
        var $date = $clock.find('#date');
        var $time = $clock.find('#time');

        //Show the date (and refresh every 5 seconds).
        var now = new Date();
        $date.html(now.toString('ddd d MMM yyyy'));
        $time.html(now.toString('HH:mm'));
        me.dateInterval = setInterval(function () {
            var now = new Date();
            $date.html(now.toString('ddd d MMM yyyy'));
            $time.html(now.toString('HH:mm'));
        }, 5000);
    },

    showCalendars: function (mode, id, title, callback) {
        var me = this;

        me.$root.find('.content-container.detail').hide();
        me.$root.find('.content-container.list').show();
        me.$toolbar.show();

        //Get calendar definitions (groups are done remotely), then render the calendar(s).
        gmgps.cloud.helpers.diary.getCalendarDefinitions(
            mode,
            id,
            function (calendarDefinitions) {
                me.calendarDefinitions = calendarDefinitions;
                me.renderCalendars(
                    mode,
                    id,
                    title,
                    calendarDefinitions,
                    null,
                    null,
                    function () {
                        if (callback) callback();
                    }
                );
            }
        );
    },

    showCalendarPicker: function (month, year, onComplete) {
        //Show the calendar picker relevant to the month/year.
        var me = this;

        //Determine any movement direction based on the requested month+year combo (later = upward, earlier = downward).
        var thisMonth = new Date(year, month, 1);
        var prevMonth = new Date(me.year, me.month, 1);
        var direction;
        switch (thisMonth.compareTo(prevMonth)) {
            case -1:
                direction = C.Direction.Up;
                break;
            case 0:
                direction = C.Direction.Unspecified;
                break;
            case 1:
                direction = C.Direction.Down;
                break;
        }

        //If not month or year was supplied, use the current month.
        if (month === undefined || year === undefined) {
            var d = new Date();
            month = d.getMonth();
            year = d.getFullYear();
        }

        var after = function (instant) {
            //Setup the calendar picker.
            me.$calendarPicker.calendarPicker({
                month: month,
                year: year,
                showTitle: false
            });

            //Change the month-picker.
            me.monthPickerGoto(month, year);

            if (!instant) {
                me.$calendarPicker.find('table').show(
                    'slide',
                    {
                        direction:
                            direction == C.Direction.Up ? 'left' : 'right'
                    },
                    300,
                    function () {
                        if (onComplete) onComplete();
                    }
                );
            } else {
                if (onComplete) onComplete();
            }

            me.month = month;
            me.year = year;
        };

        //If this is the first show of the picker or the month/year combo remains unchanged, show the change instantly - otherwise, fade out, change and fade in.
        if (
            me.$calendarPicker.find('table').length === 0 ||
            direction == C.Direction.Unspecified
        ) {
            after(true);
        } else {
            me.$calendarPicker.find('table').hide(
                'slide',
                {
                    direction: direction == C.Direction.Down ? 'left' : 'right'
                },
                300,
                function () {
                    after(false);
                }
            );
        }
    },

    spinner: function (spin) {
        var me = this;
        if (spin) {
            me.$root.find('.diary-spinner').show();
            me.$root.find('.month-year down').hide();
        } else {
            me.$root.find('.diary-spinner').hide();
            me.$root.find('.month-year down').show();
        }
    },

    updateCalendarPickerCellHighlights: function (state) {
        var me = this;

        var selDay = state.view.calendar.getDate().getDate();
        var selMonth = state.view.calendar.getDate().getMonth();
        var selYear = state.view.calendar.getDate().getFullYear();

        me.clearPickerDate();

        //Turn on required cells.
        switch (state.view.name) {
            case 'agendaWeek':
            case 'basicWeek':
            case 'month':
                var tempDate = new Date(state.view.start.valueOf());
                for (
                    var d = tempDate;
                    d < state.view.end;
                    d.setDate(d.getDate() + 1)
                ) {
                    me.setPickerDate(
                        d.getFullYear(),
                        d.getMonth(),
                        d.getDate()
                    );
                }
                break;
            case 'agendaDay':
            case 'basicDay':
                me.setPickerDate(selYear, selMonth, selDay);
                break;
        }
    },

    clearPickerDate: function () {
        var me = this;

        var $table = me.$calendarPicker.find('table');

        //Remove any highlighted selection.
        $table.find('td.selected').removeClass('selected');

        //Turn off all cells currently on.
        $table.find('td.on').removeClass('on');
    },

    setPickerDate: function (year, month, day) {
        var me = this;
        var $table = me.$calendarPicker.find('table');
        var $cell = $table.find(
            'td[data-year={0}][data-month={1}][data-day={2}]'.format(
                year,
                month,
                day
            )
        );
        $cell.addClass('on');
    },

    showManagementDates: function (
        typeId,
        title,
        onComplete,
        year,
        month,
        day
    ) {
        var me = this;

        me.$root.find('.content-container.list').hide();
        me.$toolbar.hide();

        me.$root.find('.content-container.detail').show();
        me.clearPickerDate();

        if (!year && !month && !day) {
            var sysDate = new Date();
            year = sysDate.getFullYear();
            month = sysDate.getMonth();
            day = sysDate.getDate();
        }

        me.getManagementDates(typeId, year, month, day).done(function (r) {
            var pointInTime = moment(
                '{0}-{1}-{2}'.format(day, month + 1, year),
                'DD-MM-YYYY'
            ).format('dddd, MMMM Do YYYY');

            me.$root.find('.management-events').empty().html(r.Data);
            me.$root
                .find('.management-events .title')
                .text(title + ' at ' + pointInTime);
        });

        me.showCalendarPicker(month, year, function () {
            onComplete();
            me.setPickerDate(year, month, day);
        });
    },

    getManagementDates: function (typeId, year, month, day) {
        return new gmgps.cloud.http("diary-getManagementDates").ajax({
            args: {
                ManagementDateType: typeId,
                EffectiveDate: '{0}/{1}/{2}'.format(day, month + 1, year),
                IncludeCompleted: true
            },
            complex: true,
            dataType: 'json',
            type: 'post',
            url: '/Diary/GetManagementDates'
        });
    }
};
