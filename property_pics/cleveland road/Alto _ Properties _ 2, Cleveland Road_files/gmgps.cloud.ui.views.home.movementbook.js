gmgps.cloud.ui.views.home.movementBook = function (args) {
    var me = this;
    me.initialised = false;
    me.forceRefreshOnNextActivation = false;

    me.header = 'Movement Book';
    me.$root = args.$root;

    me.$movementOptionsMenu = args.$movementOptionsMenu;
    me.$dateSliderRoot = args.$dateRangeSliderRoot;
    me.$movementOptionsButton = args.$movementOptionsButton;

    me.dateRangeSider = null;

    me.branchId = 0 || args.branchId;

    me.init();

    return true;
};

gmgps.cloud.ui.views.home.movementBook.prototype = {
    init: function () {
        var me = this;

        me.setupDateRangeSlider();
        me.setUpEventTypeSelection();

        // Prevent Movement Book drop-down options menu from closing on click
        me.$movementOptionsMenu.on('click', function (e) {
            e.stopPropagation();
        });

        // Movement book options change
        var onSelectedEventTypeChanged = function () {
            me.refreshList();
            me.saveEventTypeSelection();
        };

        var debouncedUpdate = $.debounce(
            500,
            false,
            onSelectedEventTypeChanged
        );

        me.$movementOptionsMenu.on('click', '.opt-outer', function (e) {
            e.stopPropagation();
            $(this).toggleClass('active');
            $(this).find('.label').toggleClass('active');
            debouncedUpdate();
        });

        // Slider needs to be refreshed after shown
        me.$movementOptionsButton.on('click', function () {
            setTimeout(function () {
                me.dateRangeSider.dateRangeSlider('resize');
            }, 1);
        });

        // Movement book date range change
        me.$dateSliderRoot.on('valuesChanged', function (e, data) {
            me.$dateSliderRoot.attr('data-startdate', data.values.min);
            me.$dateSliderRoot.attr('data-enddate', data.values.max);
            me.refreshList();
        });
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
        me.$root.find('.opt-spinner').html('<div class="home-spinner"></div>');

        $.when(me.refreshList())
            .done(function () {
                deferred.resolve();
                me.lockUI(false);
            })
            .fail(function () {
                me.lockUI(false);
            });

        return deferred.promise();
    },

    setupDateRangeSlider: function () {
        var me = this;

        var months = [
            'Jan',
            'Feb',
            'Mar',
            'Apr',
            'May',
            'Jun',
            'Jul',
            'Aug',
            'Sept',
            'Oct',
            'Nov',
            'Dec'
        ];

        var todaysDate = new Date();

        var minDate = new Date(todaysDate.valueOf());
        minDate.add(-1).months();

        var defaultDaysBackDate = new Date(todaysDate.valueOf());
        defaultDaysBackDate.add(-3).days();

        me.$dateSliderRoot.attr('data-startdate', defaultDaysBackDate);
        me.$dateSliderRoot.attr('data-enddate', todaysDate);

        me.dateRangeSider = me.$dateSliderRoot.dateRangeSlider({
            bounds: { min: minDate, max: todaysDate },
            defaultValues: { min: defaultDaysBackDate, max: todaysDate },
            range: {
                min: { days: 1 },
                max: { days: 7 }
            },
            scales: [
                {
                    first: function (value) {
                        return value;
                    },
                    end: function (value) {
                        return value;
                    },
                    next: function (value) {
                        var next = new Date(value);
                        return new Date(next.setMonth(value.getMonth() + 1));
                    },
                    label: function (value) {
                        return months[value.getMonth()];
                    }
                }
            ],
            formatter: function (val) {
                var days = val.getDate(),
                    month = months[val.getMonth()],
                    year = val.getFullYear().toString().substr(2, 2);
                return (
                    days +
                    me.getDateOrdinal(val.getDate()) +
                    ' ' +
                    month +
                    ' ' +
                    year
                );
            }
        });
    },

    applyEventsSelectionToOptionsMenu: function (eventTypeList) {
        var me = this;

        if (!eventTypeList) {
            return;
        }

        var $options = me.$movementOptionsMenu;

        if (!$options) {
            return;
        }

        $.each(eventTypeList, function (i, eventType) {
            var eventTypeId = eventType.Key;

            $.each(eventType.Value, function (i, subtypeId) {
                var eventTypeElements = $(
                    '.opt-outer[data-typeid="{0}"]'.format(eventTypeId),
                    $options
                );

                eventTypeElements
                    .filter(function () {
                        if (!subtypeId) {
                            return true;
                        }

                        var dataSubType = $(this).data('subtypeid');
                        if (Array.isArray(dataSubType)) {
                            return (
                                dataSubType.indexOf(subtypeId.toString()) > -1
                            );
                        }
                        return dataSubType === subtypeId;
                    })
                    .addClass('active')
                    .find('.label')
                    .addClass('active');
            });
        });
    },

    setUpEventTypeSelection: function () {
        var me = this;

        gmgps.cloud.helpers.user.getPersonalisationData(
            C.UiPersonalisation.MovementbookFilter,
            function (storedSelection) {
                me.processReturnedEventTypes(storedSelection);
            }
        );
    },

    processReturnedEventTypes: function (storedSelection) {
        var me = this;

        var search = {
            EventTypesList: []
        };

        if (storedSelection && storedSelection.EventTypesList) {
            search = storedSelection;
        } else {
            me.assignDefaultEventTypesList(search);
        }

        me.applyEventsSelectionToOptionsMenu(search.EventTypesList);
    },

    saveEventTypeSelection: function () {
        var me = this;

        var search = {
            EventTypesList: []
        };

        var $options = me.$movementOptionsMenu;
        me.getSelectedEventTypes($options, search);

        gmgps.cloud.helpers.user.putPersonalisationData(
            C.UiPersonalisation.MovementbookFilter,
            search,
            false
        );
    },

    getDateOrdinal: function (d) {
        if (d > 3 && d < 21) return 'th';
        switch (d % 10) {
            case 1:
                return 'st';
            case 2:
                return 'nd';
            case 3:
                return 'rd';
            default:
                return 'th';
        }
    },

    refreshList: function () {
        var me = this;

        var deferred = new $.Deferred();
        var daysToLoadByDefault = 2;

        var search = {
            EventTypesList: []
        };

        var $options = me.$movementOptionsMenu;

        me.getSelectedEventTypes($options, search);

        if ($options) {
            search.StartDate = new Date(
                $options.find('#date-range-slider').attr('data-startdate')
            );
            search.EndDate = new Date(
                $options.find('#date-range-slider').attr('data-enddate')
            );
        } else {
            search.StartDate = new Date();
            search.EndDate = new Date();
            search.EndDate.setDate(
                search.StartDate.getDate() - daysToLoadByDefault
            );
        }

        me.$root.find('.timeline').animate({ opacity: 0.5 }, 300);

        new gmgps.cloud.http("movementbook-refreshList").ajax(
            {
                args: {
                    branchId: me.branchId,
                    search: search
                },
                background: true,
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/home/getmovementbooklist'
            },
            function (response) {
                deferred.resolve();

                me.$root
                    .find('.timeline')
                    .html('')
                    .scrollTop(0)
                    .html(response.Data);
                me.$root.find('.home-spinner').remove();
                me.$root.find('.timeline').animate({ opacity: 1 }, 200);
            }
        );

        return deferred.promise();
    },

    getSelectedEventTypes: function ($options, search) {
        var me = this;

        if ($options) {
            var kvp;

            kvp = me.getEventTypesKeyValuePair($options, C.EventType.General);
            if (kvp) search.EventTypesList.push(kvp);

            kvp = me.getEventTypesKeyValuePair($options, C.EventType.Offer);
            if (kvp) search.EventTypesList.push(kvp);

            kvp = me.getEventTypesKeyValuePair(
                $options,
                C.EventType.AgreedOffer
            );
            if (kvp) search.EventTypesList.push(kvp);

            kvp = me.getEventTypesKeyValuePair($options, C.EventType.Viewing);
            if (kvp) search.EventTypesList.push(kvp);

            kvp = me.getEventTypesKeyValuePair($options, C.EventType.Valuation);
            if (kvp) search.EventTypesList.push(kvp);

            kvp = me.getEventTypesKeyValuePair(
                $options,
                C.EventType.AuditedChange
            );
            if (kvp) search.EventTypesList.push(kvp);

            if (search.EventTypesList.length === 0) {
                return;
            }
        } else {
            // Build default search options
            me.assignDefaultEventTypesList(search);
        }
    },

    getEventTypesKeyValuePair: function ($options, eventTypeId) {
        var subTypeIds = [];
        var $items = $options.find(
            '.opt-outer.active[data-typeid="{0}"]'.format(eventTypeId)
        );

        if ($items.length === 0) {
            return false;
        }

        var addSubtypeId = function (id) {
            var subTypeId = parseInt(id);
            subTypeIds.push(subTypeId);
        };

        $items.each(function (i, v) {
            var subType = $(v).data('subtypeid');

            if (Array.isArray(subType)) {
                subType.forEach(addSubtypeId);
            } else {
                addSubtypeId(subType);
            }
        });

        if (subTypeIds.length === 0) {
            subTypeIds.push(0);
        }

        return {
            Key: eventTypeId,
            Value: subTypeIds
        };
    },

    assignDefaultEventTypesList: function (search) {
        search.EventTypesList.push({
            Key: C.EventType.Offer,
            Value: [C.EventSubType.OfferMade, C.EventSubType.OfferRevised]
        });
        search.EventTypesList.push({
            Key: C.EventType.AgreedOffer,
            Value: [C.EventSubType.OfferAccepted]
        });
        search.EventTypesList.push({ Key: C.EventType.Viewing, Value: [''] });
        search.EventTypesList.push({ Key: C.EventType.Valuation, Value: [''] });
        search.EventTypesList.push({
            Key: C.EventType.AuditedChange,
            Value: [
                C.EventSubType.PersonRegistered,
                C.EventSubType.OfferWithdrawn,
                C.EventSubType.OfferRejected,
                C.EventSubType.PropertyInstructed,
                C.EventSubType.PropertyAvailable,
                C.EventSubType.PropertyAvailableAgain,
                C.EventSubType.SalePriceChange,
                C.EventSubType.RentalPriceChange,
                C.EventSubType.LetAgreed,
                C.EventSubType.PropertyLet,
                C.EventSubType.ExternallyLet
            ]
        });
    }
};
