gmgps.cloud.ui.views.home = function () {
    var me = this;
    me.$root = $('#home');

    me.branchId = 0;
    me.branchIds = [0];
    me.userId = 0;
    me.propertyManagerIds = [];

    me.controllers = {};

    me.defaultDashboard = me.$root.find('#DefaultDashboard').val();

    me.$branch = me.$root.find('#HomeBranchId');
    me.$branches = me.$root.find('#HomeBranchIds');

    me.$user = me.$root.find('#HomeUserId');
    me.$propertyManagerIds = me.$root.find('#PropertyManagerIds');
    me.$propertyTypeFilter = me.$root.find('#PropertyTypeFilter');

    me.$refreshButton = me.$root.find('#home-refresh-button');

    me.$dashboardLeadsLeadTab = me.$root.find('#dashboardLeadsLeadTab');
    me.$dashboardLeadsAppraisalTab = me.$root.find(
        '#dashboardLeadsAppraisalTab'
    );
    me.$dashboardLeadsViewingTab = me.$root.find('#dashboardLeadsViewingTab');
    me.$leadsOptions = me.$root.find('#LeadsOptions');
    me.$maOptions = me.$root.find('#MarketAppraisalOptions');
    me.$viewingEnquiryOptions = me.$root.find('#ViewingEnquiryOptions');
    me.$viewingEnquiryPropertyRecordTypeFilter = me.$viewingEnquiryOptions.find(
        '#PropertyRecordType'
    );

    me.activeLayer = null;
    me.dateRangeSider = null;

    me.refreshSecs = 300;
    me.refresher = null;
    me.ready = Q.defer();

    me.init();

    return true;
};

gmgps.cloud.ui.views.home.prototype = {
    init: function () {
        //Main init routine.
        var me = this;

        if (!shell.googleChartsLoaded) {
            shell.googleChartsLoading =
                shell.googleChartsLoading ||
                google.charts
                    .load('43', { packages: ['corechart'] })
                    .then(function () {
                        me.initHome();
                        shell.googleChartsLoaded = true;
                        me.ready.resolve();
                    });
        } else {
            me.initHome();
            me.ready.resolve();
        }

        me.$dashboardLeadsLeadTab.on('click', function () {
            alto.router.navigationChanged('home', { section: 'enquiries', tab: 'portal-leads' })
            alto.application.setTitle('Home | Enquiries | Portal-Leads');
            me.$leadsOptions.show();
            me.$maOptions.hide();
            me.$viewingEnquiryOptions.hide();
        });

        me.$dashboardLeadsAppraisalTab.on('click', function () {
            alto.router.navigationChanged('home', { section: 'enquiries', tab: 'appraisals' })
            alto.application.setTitle('Home | Enquiries | Appraisals');
            me.$leadsOptions.hide();
            me.$maOptions.show();
            me.$viewingEnquiryOptions.hide();
        });

        me.$dashboardLeadsViewingTab.on('click', function () {
            alto.router.navigationChanged('home', { section: 'enquiries', tab: 'viewings' })
            alto.application.setTitle('Home | Enquiries | Viewings');
            me.$leadsOptions.hide();
            me.$maOptions.hide();
            me.$viewingEnquiryOptions.show();
        });
    },

    initHome: function () {
        var me = this;

        //Init some home page basics and then hand off to the various sub init routines.

        //Custom selects.

        me.$branch.selectpicker({
            style: 'bg-blue fg-white',
            'live-search': true
        });

        me.$branches.selectpicker({
            style: 'bg-blue fg-white',
            'live-search': true
        });

        me.$user.selectpicker({
            style: 'bg-blue fg-white',
            'live-search': true
        });

        me.$propertyManagerIds.selectpicker({
            style: 'bg-blue fg-white',
            'live-search': true
        });

        me.$propertyTypeFilter.selectpicker({
            style: 'bg-blue fg-white',
            'live-search': true
        });

        me.$viewingEnquiryPropertyRecordTypeFilter.selectpicker({
            style: 'bg-blue fg-white',
            'live-search': true
        });

        if (me.$branch) {
            me.branchId = parseInt(me.$branch.val());
            if (isNaN(me.branchId)) {
                me.branchId = 0;
            }
        }

        if (me.$branches && me.$branches.val()) {
            var initialValue = me.$branches.val();
            me.branchIds =
                initialValue.length === 0 ? [0] : initialValue.map(Number);
        } else {
            me.branchIds = [me.branchId];
        }

        me.userId = parseInt(me.$root.find('#HomeUserId').val());
        me.propertyManagerIds = me.$propertyManagerIds
            .find('option[value=0]')
            .is(':selected')
            ? []
            : me.$propertyManagerIds.val();
        if (isNaN(me.userId)) me.userId = 0;

        me.initEventHandlers();
        me.initControllers();
        me.initRefresher();

        if (!me.activeLayer) {
            var layer =
                me.defaultDashboard === 'main'
                    ? 'dashboard'
                    : 'pmdashboardproxy';
            me.showLayer(layer);

            var section =
                me.defaultDashboard === 'main'
                    ? 'dashboard'
                    : 'property-management-dashboard';
            alto.router.navigationComplete('home', { section: section });
        }

        /*
        //Kick off initial population of the layers in the background.
        setTimeout(function () {
            //Show the dashboard to start.
        }, 500); //Timed to wait until the busy shell is ready and give a smooth transition and display of the dash.
        */
    },

    initRefresher: function () {
        var me = this;

        //Init the refresher.
        // - Runs every me.refreshSecs seconds
        // - Refreshes the visible, active layer if a push notification of any kind has been rcvd since the last check.
        // - If the active layer is not visible, the refresh is postponed until redisplayed() is called, from shell.

        if (me.refresher && me.refresher.interval) {
            window.clearInterval(me.refresher.interval);
        }

        me.refresher = {
            pnRcvdSinceLastRefresh: false,
            interval: window.setInterval(function () {
                me.triggerRefresher(true);
            }, me.refreshSecs * 1000)
        };
    },

    redisplayed: function () {
        var me = this;

        // until pm dashboard uses signalR for refreshing, we need to ensure it is always refreshed when returned to

        if (me.activeLayer === 'pmdashboardproxy') {
            me.controllers['pmdashboardproxy'].activate(false);
        } else {
            if (me.refresher.pnRcvdSinceLastRefresh) {
                me.triggerRefresher(false);
                me.initRefresher();
            }
        }
    },

    triggerRefresher: function (triggeredByInterval) {
        var me = this;

        //Quit early if there haven't been any push notifications since the last refresh.
        if (triggeredByInterval && !me.refresher.pnRcvdSinceLastRefresh) {
            return false;
        }

        me.refresher.pnRcvdSinceLastRefresh = false;

        $.each(me.controllers, function (i, v) {
            v.forceRefreshOnNextActivation = true;
        });

        //If the active layer is visible, refresh it now.  All other layers will refresh next time they are displayed.
        //PPT-620: if a Report Table is open on the pm dashboard, do not refresh!
        if (me.activeLayerIsVisible() && !me.pmModalRowPresent()) {
            me.refreshActiveLayer(triggeredByInterval);
        }
    },

    pmModalRowPresent: function () {
        var me = this;

        return me.activeLayer === 'pmdashboardproxy' && me.$root.find('#modal-row').children().length > 0;
    },

    refreshActiveLayer: function (triggeredByInterval) {
        //Refreshes the active layer.  Triggered either by user/branch selection or the refresher.
        //If this was triggered by the refresher interval then we
        //simply ask the active controller to refresh all (via it's own implementation).  Otherwise, we
        //also re-initialise the refresher so as to reset it to zero.

        var me = this;

        if (!triggeredByInterval) {
            me.initRefresher();
        }

        me.controllers[me.activeLayer]
            .refreshAll(triggeredByInterval)
            .done(function () {
                me.$refreshButton
                    .removeClass('on')
                    .find('.fa')
                    .removeClass('fa-spin');
            });
    },

    initControllers: function () {
        var me = this;

        //Hybrid Dashboard
        me.controllers.dashboard = new gmgps.cloud.ui.views.home.dashboard({
            $root: me.$root.find('.home-layer[data-id="dashboard"]'),
            branchId: me.branchId,
            userId: me.userId,
            controllers: me.controllers,
            saveUserSettingsCallback: function () {
                me.saveUserSettings();
            },
            showLayerCallback: function (layerName, args) {
                me.showLayer(layerName, args);
            }
        });

        //PM Dashboard
        me.controllers.pmdashboardproxy =
            new gmgps.cloud.ui.views.home.pmdashboardproxy({
                $root: me.$root.find('.home-layer[data-id="pmdashboardproxy"]'),
                branchIds: me.branchIds,
                userId: me.userId,
                propertyManagerIds: me.propertyManagerIds
            });

        //Appointments (diary)
        me.controllers.diarydashboard = new gmgps.cloud.ui.views.home.diary({
            $root: me.$root.find('.home-layer[data-id="diarydashboard"]'),
            branchId: me.branchId,
            userId: me.userId,
            $diaryOptions: me.$root.find('#diary-options')
        });

        //Movement Book
        me.controllers.movementbook =
            new gmgps.cloud.ui.views.home.movementBook({
                $root: me.$root.find('.home-layer[data-id="movementbook"]'),
                branchId: me.branchId,
                $movementOptionsMenu: me.$root.find('#movement-options-menu'),
                $dateRangeSliderRoot: me.$root.find('#date-range-slider'),
                $movementOptionsButton: me.$root.find('#MovementOptions')
            });

        //Property Map
        me.controllers.propertymap = new gmgps.cloud.ui.views.home.propertyMap({
            $root: me.$root.find('.home-layer[data-id="propertymap"]'),
            branchId: me.branchId,
            userId: me.userId,
            $mapOptionsMenu: me.$root.find('#map-options-menu')
        });

        //Charts Dashboard
        me.controllers.chartsdashboard =
            new gmgps.cloud.ui.views.home.chartsdashboard({
                $root: me.$root.find('.home-layer[data-id="chartsdashboard"]'),
                branchId: me.branchId,
                userId: me.userId,
                $addChartButton: me.$root.find('#home-add-chart')
            });

        me.controllers.leadsdashboard =
            new gmgps.cloud.ui.views.home.LeadsDashboard({
                $root: me.$root.find('.home-layer[data-id="leadsdashboard"]'),
                branchId: me.branchId,
                userId: me.userId,
                $leadsOptions: me.$leadsOptions,
                $leadsOptionsMenu: me.$root.find('#leads-options-menu'),
                $maOptions: me.$maOptions,
                $viewingEnquiryOptions: me.$viewingEnquiryOptions,
                $viewingEnquiryPropertyRecordTypeFilter:
                    me.$viewingEnquiryPropertyRecordTypeFilter
            });

        me.controllers.emailmarketing =
            new gmgps.cloud.ui.views.home.emailmarketing({
                $root: me.$root.find('.home-layer[data-id="emailmarketing"]'),
                branchId: me.branchId,
                userId: me.userId
            });

        me.controllers.esignatures = new gmgps.cloud.ui.views.home.esignatures({
            $root: me.$root.find('.home-layer[data-id="esignatures"]'),
            branchId: me.branchId,
            userId: me.userId
        });
    },

    onlyThatElement: function (array, element) {
        return array.length === 1 && array.indexOf(element) > -1;
    },

    initEventHandlers: function () {
        var me = this;

        //Default Dashboard Pin > Click
        me.$root.on('click', '.dashboard-pin', function () {
            var $this = $(this);

            if ($this.hasClass('on')) {
                $this.removeClass('on');
                me.defaultDashboard =
                    me.activeLayer === 'dashboard' ? 'pm' : 'main';
            } else {
                $this.addClass('on');
                me.defaultDashboard =
                    me.activeLayer === 'dashboard' ? 'main' : 'pm';
            }
            me.saveUserSettings();

            var name =
                me.defaultDashboard === 'main' ? 'Main' : 'Property Management';

            $.jGrowl(
                'Your default dashboard has been set to {0}'.format(name),
                { header: 'Default Dashboard', theme: 'growl-system' }
            );
        });

        //Home BranchId > Change/KeyUp
        me.$branch.on('change', function () {
            me.branchId = parseInt($(this).val() || 0);

            if (!me.$branches || me.$branches.length === 0) {
                me.branchIds = [me.branchId];
            }

            for (var key in me.controllers) {
                // eslint-disable-next-line no-prototype-builtins
                if (me.controllers.hasOwnProperty(key)) {
                    me.controllers[key].branchId = me.branchId;
                    me.controllers[key].branchIds = me.branchIds;
                }
            }

            //me.saveUserSettings();
            me.refreshActiveLayer();
        });

        //Home BranchIds > Change/KeyUp (Multiple)
        me.$branches.on('change', function () {
            var dropdownValues = $(this).val();
            var allOption = $(this).find('option[value=0]');
            let allBranchesBefore = me.onlyThatElement(me.branchIds, 0);
            if (
                dropdownValues.length === 0 ||
                (allOption.is(':selected') && !allBranchesBefore)
            ) {
                $(this)
                    .next()
                    .find('ul.dropdown-menu > li')
                    .removeClass('selected');
                $(this)
                    .next()
                    .find('ul.dropdown-menu > li:first')
                    .addClass('selected');
                me.branchIds = [0];
            } else {
                $(this)
                    .next()
                    .find('ul.dropdown-menu > li:first')
                    .removeClass('selected');
                //we check if the zero value (all branches option) is in the array, and we remove it
                let indexAll = dropdownValues.indexOf('0');
                if (indexAll !== -1) {
                    dropdownValues.splice(indexAll, 1);
                }
                me.branchIds = dropdownValues.map(Number);
            }
            $(this).val(me.branchIds);
            $(this).selectpicker('refresh');

            //Not more calls, when they click on al branches where was already in all branches
            if (!(allBranchesBefore && me.onlyThatElement(me.branchIds, 0))) {
                for (var key in me.controllers) {
                    if (
                        Object.prototype.hasOwnProperty.call(
                            me.controllers,
                            key
                        )
                    ) {
                        me.controllers[key].branchIds = me.branchIds;
                    }
                }
                me.refreshActiveLayer();
                me.saveUserSettings();
            }
        });

        //Home Refresh Button > Click
        me.$refreshButton.on('click', function () {
            if (me.$refreshButton.hasClass('on')) {
                return false;
            }

            me.$refreshButton.addClass('on').find('.fa').addClass('fa-spin');
            me.refreshActiveLayer();
        });

        //Home UserId > Change/KeyUp
        me.$user.on('change', function () {
            me.userId = parseInt($(this).val() || 0);

            for (var key in me.controllers) {
                // eslint-disable-next-line no-prototype-builtins
                if (me.controllers.hasOwnProperty(key)) {
                    me.controllers[key].userId = me.userId;
                }
            }

            me.refreshActiveLayer();
        });

        //Home propertyManagerIds > Change/KeyUp
        me.$propertyManagerIds.on('change', function () {
            var selectedOptions = $(this).val();
            var all = $(this).find('option[value=0]');
            var allText = all.html();

            if (
                selectedOptions.length === 0 ||
                (all.is(':selected') && me.propertyManagerIds.length > 0)
            ) {
                $(this).val([]);
                $(this)
                    .next()
                    .find('ul.dropdown-menu > li')
                    .removeClass('selected');
                $(this)
                    .next()
                    .find('ul.dropdown-menu > li:first')
                    .addClass('selected');
                $(this).find('option[value=0]').prop('selected', true);
                $(this).next().find('span.filter-option').html(allText);
            } else {
                $(this)
                    .next()
                    .find('ul.dropdown-menu > li:first')
                    .removeClass('selected');
                $(this).find('option[value=0]').prop('selected', false);
                $(this).selectpicker('refresh');
            }

            me.propertyManagerIds = $(this)
                .find('option[value=0]')
                .is(':selected')
                ? []
                : $(this).val();

            for (var key in me.controllers) {
                // eslint-disable-next-line no-prototype-builtins
                if (me.controllers.hasOwnProperty(key)) {
                    me.controllers[key].propertyManagerIds =
                        me.propertyManagerIds;
                }
            }

            me.refreshActiveLayer();
            me.saveUserSettings();
        });

        //Options that get persisted (additional event handlers)
        me.$root.on(
            'change',
            '#dashboard-stats-period, #DashboardPendingDealsType',
            function () {
                me.saveUserSettings();
            }
        );

        //Sidebar
        me.$root.on('click', '.page-sidebar .sidebar-menu-item', function () {
            //e.preventDefault();
            //me.showLayer($(this).attr('data-id'), tab);
        });

        //SMS
        me.$root.on('click', '#home-quick-sms', function () {
            var args = {
                title: 'Quick Send SMS',
                settings: {
                    ContactIdList: [],
                    originatingEventCategory: 0,
                    originatingEventId: 0
                }
            };

            new gmgps.cloud.ui.controls.window({
                title: args.title,
                controller: gmgps.cloud.ui.views.smsHomeMessager,
                url: '/Comms/GetHomePageSMSMessager',
                urlArgs: { settings: args.settings },
                post: true,
                complex: true,
                width: 640,
                draggable: true,
                modal: true,
                actionButton: 'Send',
                cancelButton: 'Cancel',
                onAction: function () {
                    return false;
                },
                onCancel:
                    args.onComplete ||
                    function () {
                        return false;
                    }
            });
        });

        //EMail
        me.$root.on('click', '#home-quick-email', function (e) {
            var category = $(e.target).attr('ga-category');
            gmgps.cloud.helpers.general.createEmail({
                contactIds: [],
                ContentType: C.DocumentContentType.Html,
                templateId: 0,
                showAssociateProperty: false,
                placeOnQueue: true,
                searchObjProps: 'udf6',
                category: category
            });
        });
    },

    pnUpdate: function (pn) {
        var me = this;

        if (_.has(me, 'refresher.pnRcvdSinceLastRefresh')) {
            me.refresher.pnRcvdSinceLastRefresh = true;
        }

        //Dashboard and other layers respond to some notifications as they arrive (if visible).
        if (
            _.isFunction(me.activeLayerIsVisible) &&
            me.activeLayerIsVisible()
        ) {
            if (
                me.controllers[me.activeLayer] &&
                me.controllers[me.activeLayer].pnUpdate
            ) {
                me.controllers[me.activeLayer].pnUpdate(pn);
                me.controllers.leadsdashboard.pnUpdate(pn);
            }
        }
    },

    activeLayerIsVisible: function () {
        var me = this;
        return me.$root.find(
            '.home-layer[data-id="{0}"]:visible'.format(me.activeLayer)
        ).length;
    },

    showLayer: function (id, tab) {
        var me = this;

        me.$root.find('.page-sidebar .sidebar-menu-item').removeClass('on');
        me.$root
            .find('.page-sidebar .sidebar-menu-item[data-id="{0}"]'.format(id))
            .addClass('on');

        //Show applicable toolbar buttons.
        me.$root.find('.toolbar-item').hide();
        me.$root
            .find('.toolbar-item.for-{0}'.format(id))
            .css('display', 'inline');

        //Show layer.
        me.activeLayer = id;
        var $header = me.$root.find('#home-toolbar .header');
        $header.text(me.controllers[id].header);
        me.$root.find('.home-layer').hide();
        me.$root.find('.home-layer[data-id="{0}"]'.format(id)).show(250);

        if (shell.pmInstalled) {
            me.setupDashboardPin($header, id);
        }

        //Activate layer.
        var controller = me.controllers[id];
        controller.activate(controller.forceRefreshOnNextActivation, tab);
        controller.forceRefreshOnNextActivation = false;
    },

    setupDashboardPin: function ($header, id) {
        var me = this;
        var $dashboardPin = me.$root.find('#home-toolbar .dashboard-pin');

        if (me.controllers[id].isADashboard) {
            $dashboardPin.show();
            $header.addClass('with-pin');
            if (me.controllers[id].dashboardId === me.defaultDashboard) {
                $dashboardPin.addClass('on');
            } else {
                $dashboardPin.removeClass('on');
            }
        } else {
            $dashboardPin.hide();
            $header.removeClass('with-pin');
        }
    },

    saveUserSettings: function () {
        var me = this;

        new gmgps.cloud.http("home-saveUserSettings").ajax(
            {
                args: {
                    key: C.UiPersonalisation.Dashboard,
                    data: JSON.stringify({
                        branchId: me.branchId,
                        branchIds: me.branchIds,
                        userId: me.userId,
                        propertyManagerIds: me.propertyManagerIds,
                        defaultDashboard: me.defaultDashboard,
                        dashboardStatsPeriod:
                            me.controllers.dashboard.dashboardStatsPeriod,
                        dashboardPendingDealsType:
                            me.controllers.dashboard.dashboardPendingDealsType,
                        dashboardWidgetOrder:
                            me.controllers.dashboard.getWidgetOrder(),
                        dashboardTaskSettings:
                            me.controllers.dashboard.getTaskSettings()
                    })
                },
                background: true,
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/user/PutUiPersonalisation'
            },
            function () {}
        );
    }
};
