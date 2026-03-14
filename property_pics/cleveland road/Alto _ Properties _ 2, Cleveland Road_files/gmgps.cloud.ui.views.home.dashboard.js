gmgps.cloud.ui.views.home.dashboard = function (args) {
    var me = this;
    me.initialised = false;
    me.forceRefreshOnNextActivation = false;
    me.isADashboard = true;
    me.dashboardId = 'main';
    me.homeControllers = args.controllers;

    me.header = 'Dashboard';
    me.$root = args.$root;

    me.saveUserSettingsCallback = args.saveUserSettingsCallback;

    me.branchId = 0 || args.branchId;
    me.userId = 0 || args.userId;
    me.dashboardStatsPeriod = parseInt(
        me.$root.find('#dashboard-stats-period').val()
    );
    me.dashboardPendingDealsType = parseInt(
        me.$root.find('#DashboardPendingDealsType').val()
    );
    me.marketingStatsUserContext = parseInt(
        me.$root.find('#dashboard-emailmarketing-usercontext').val()
    );
    me.marketingStatsPeriod = parseInt(
        me.$root.find('#dashboard-emailmarketing-period').val()
    );

    me.documentService = new gmgps.cloud.ui.publishing.DocumentService();
    me.emailService = new gmgps.cloud.ui.communication.EmailService();

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

    me.followUpExpiryDays = parseInt(
        me.$root.find('#FollowUpExpiryDays').val()
    );
    me.followUpSearches = [];
    me.followUpPageSize = 10;

    me.resizeTimer = null;

    me.chartCache = {
        headlines: null,
        stock: null,
        sales: null
    };

    me.leadsComponent = 1;
    me.esignaturesComponent = 2;

    me.widgets = {};

    me.widgets[me.leadsComponent] = new gmgps.cloud.ui.views.home.LeadsWidget(
        args,
        me
    );
    me.widgets[me.esignaturesComponent] =
        new gmgps.cloud.ui.views.home.esignaturesWidget({
            $root: me.$root.find('#dashboard-esignatures-widget'),
            http: me.http,
            showLayerCallback: function (layerArgs) {
                alto.router.navigationChanged('home', {
                    section: 'esignatures'
                });
                args.showLayerCallback('esignatures', layerArgs);
            }
        });

    me.$widgets = me.$root.find('.widget');
    me.sizeWidgets();
    me.sizeResponsiveElements();
    me.init(args);

    return true;
};

gmgps.cloud.ui.views.home.dashboard.prototype = {
    init: function (args) {
        var me = this;
        me.followUpListSelector =
            '#dashboard-followups .dashboard-followup-list[data-dashboardfollowuptypeid="{0}"]';

        me.$root.find('.widgets').sortable({
            cursor: 'move',
            handle: '.widget-header',
            placeholder:
                'widget-container col-xl-4 col-lg-6 col-md-6 col-sm-12 col-xs-12',
            start: function (e, ui) {
                ui.placeholder.html(
                    '<div class="home-drop-zone" style="height: {0}px;"></div>'.format(
                        me.widgetHeight
                    )
                );
            },
            update: function () {
                me.saveUserSettingsCallback();
            }
        });

        // trap tab changes on followup headers
        me.$root.find('.tabbable .nav-tabs').on('shown.bs.tab', function () {
            me.saveUserSettingsCallback();
        });

        // Respond to tab changes
        $('a[data-toggle="tab"]').on('shown.bs.tab', function () {
            me.sizeResponsiveElements();
        });

        //Custom selects.
        me.$root.find('.selectpicker').selectpicker();

        // set custom tool tip on each option in the custom selectpicker
        me.$root.find('#dashboard-followups-mode option').each(function () {
            var $this = $(this);
            me.$root
                .find('#dashboard-followups-mode')
                .next()
                .find(
                    '.dropdown-menu ul li[data-original-index="{0}"] a'.format(
                        $this.index()
                    )
                )
                .attr('title', $this.attr('data-tooltip'));
        });

        me.$root.find('.selectpicker.options').each(function (i, v) {
            var x = $(v).find('option:selected').length;
            var y = $(v).find('option[data-divider!="true"]').length;
            $(v)
                .next()
                .find('.filter-option')
                .html(
                    '<i class="fa fa-sliders"></i> <span class="hidden-md">{0} of {1}</span>'.format(
                        x,
                        y
                    )
                );
        });

        me.$root.find('.opt-spinner').html('<div class="home-spinner"></div>');

        //DashboardStatsPeriod > Change
        me.$root.on('change', '#dashboard-stats-period', function () {
            me.dashboardStatsPeriod = parseInt($(this).val());
            me.refreshHeadlineBoxes();
        });

        //Email Marketing > drill down
        me.$root.on(
            'click',
            '#dashboard-ma-headline-counts .widget-body .email-stat',
            function () {
                alto.router.navigationChanged('home', {
                    section: 'email-marketing'
                });
                args.showLayerCallback('emailmarketing');
            }
        );

        //Email Marketing > Change
        me.$root.on(
            'change',
            '#dashboard-emailmarketing-usercontext',
            function () {
                me.marketingStatsUserContext = parseInt($(this).val());
                me.refreshMarketingStats();
            }
        );

        me.$root.on('change', '#dashboard-emailmarketing-period', function () {
            me.marketingStatsPeriod = parseInt($(this).val());
            me.refreshMarketingStats();
        });

        //DashboardPendingDealsType > Change
        me.$root.on('change', '#DashboardPendingDealsType', function () {
            me.dashboardPendingDealsType = parseInt($(this).val());
            me.refreshDealProgressions();
        });

        // Progression property link
        me.$root.on(
            'click',
            '.dashboard-dealprogression-box .deal-link',
            function () {
                var $item = $(this).closest('.dashboard-dealprogression-box');

                gmgps.cloud.helpers.property.gotoProgression({
                    $row: $(
                        '<span data-modelType="{0}"></span>'.format(
                            C.ModelType.ChainLink
                        )
                    ),
                    id: 0,
                    recordType: $item.data('propertyrecordtypeid'),
                    secondaryId: $item.data('id')
                });
            }
        );

        me.$root.on(
            'click',
            '.row.dashboard-followup-box .followup .deal-link',
            function () {
                var linkedHistoryEventId = parseInt(
                    $(this)
                        .closest('.row.deal-review')
                        .data('linkedhistoryeventid')
                );
                var $item = $(this).closest('.row.followup');

                gmgps.cloud.helpers.property.gotoProgression({
                    $row: $(
                        '<span data-modelType="{0}"></span>'.format(
                            C.ModelType.ChainLink
                        )
                    ),
                    id: parseInt($item.data('linkedid')),
                    recordType: parseInt($item.data('propertyrecordtypeid')),
                    secondaryId: linkedHistoryEventId
                });
            }
        );

        //Todo Title > Click (alt)
        me.$root.on(
            'click',
            '.dashboard-followup-box.todo .title',
            function () {
                var id = parseInt($(this).attr('data-id'));
                var typeId = parseInt($(this).attr('data-typeid'));

                gmgps.cloud.helpers.followUp.editFollowUp(id, typeId);
            }
        );

        //FollowUps > Mode > Change
        me.$root.on('change', '#dashboard-followups-mode', function () {
            var $this = $(this);
            $this
                .next()
                .find('button')
                .attr(
                    'title',
                    $this.find('option:checked').attr('data-tooltip')
                );
            me.refreshFollowUpsAll();
        });

        //FollowUp > Offer Link > Click
        me.$root.on('click', '.open-offer-button', function () {
            gmgps.cloud.helpers.property.editOffer({
                id: parseInt($(this).attr('data-id'))
            });
        });

        //FollowUp > Viewing Link > Click
        me.$root.on('click', '.open-viewing-button', function () {
            gmgps.cloud.helpers.property.getViewing({
                viewingId: parseInt($(this).attr('data-id'))
            });
        });

        //FollowUp > Appraisal Link > Click
        me.$root.on('click', '.open-appraisal-button', function () {
            gmgps.cloud.helpers.property.getMarketAppraisalAppointment({
                eventId: parseInt($(this).attr('data-id')),
                allowCancel: true
            });
        });

        //FollowUp Link
        me.$root.on('click', '.followup-link', function () {
            var id = parseInt($(this).closest('.followup').attr('data-id'));
            var typeId = parseInt(
                $(this).closest('.followup').attr('data-typeid')
            );
            var title =
                typeId === C.FollowUpType.Todo
                    ? 'Manage Todo'
                    : $(this).closest('.followup').attr('data-item-text');

            gmgps.cloud.helpers.followUp.editFollowUp(id, typeId, title);
        });

        me.$root.on('click', '.dropdown-toggle.defer-button', function () {
            var $this = $(this);
            // ensure defer menu is visible when at bottom of list. Chrome and FF wont let you scroll to show all options, without the button being dismissed
            setTimeout(function () {
                $this.siblings('.dropdown-menu').scrollintoview({
                    duration: 'slow',
                    direction: 'y'
                });
            }, 300);
        });
        //FollowUp Defer (date) - N.B. Opens followup form.  No point re-creating date selection.
        me.$root.on('click', '.defer-date', function () {
            var id = parseInt($(this).closest('.followup').attr('data-id'));
            var typeId = parseInt(
                $(this).closest('.followup').attr('data-typeid')
            );

            gmgps.cloud.helpers.followUp.editFollowUp(id, typeId);
        });

        //FollowUp Quick-Complete > Click
        me.$root.on('click', '.complete-button', function () {
            var id = parseInt($(this).closest('.followup').attr('data-id'));
            me.updateFollowUpSetCompleted(id, true);
        });

        //FollowUp Undo-Complete > Click
        me.$root.on('click', '.uncomplete-button', function () {
            var id = parseInt($(this).closest('.followup').attr('data-id'));
            me.updateFollowUpSetCompleted(id, false);
        });

        //FollowUp Defer > Click
        me.$root.on('click', '.defer-link', function () {
            var id = parseInt($(this).closest('.followup').attr('data-id'));
            var interval = parseInt($(this).attr('data-interval'));
            me.updateFollowUpSetDueDate(id, interval, 1);
        });

        //News Feed > Change
        me.$root.on('change keyup', '#dashboard-rssNewsUrl', function () {
            me.saveNewsFeedUrl(
                $(this).val(),
                $(this).find('option:selected').text(),
                function () {
                    me.refreshNews();
                }
            );
        });

        //News Feed > refresh
        me.$root.on('click', '.refresh-news', function () {
            me.refreshNews();
        });

        //Letter Rack Status > Change
        me.$root.on(
            'change keyup',
            '#dashboard-letterrack-status',
            function () {
                // change action options accordingly
                var $actions = me.$root.find('#letter-rack-actions-menu');

                var status = parseInt($(this).val());

                me.$root
                    .find('.select-all-button-group input[type=checkbox]')
                    .prop('checked', false);

                me.refreshLetterRack();

                $actions.find('li').hide();
                $actions
                    .find('li[data-actiontype="{0}"]'.format(status))
                    .show();
            }
        );

        //Letter Rack Order By > Change
        me.$root.on(
            'change keyup',
            '#dashboard-letterrack-sort-order',
            function () {
                me.$root
                    .find('.select-all-button-group input[type=checkbox]')
                    .prop('checked', false);
                me.refreshLetterRack();
            }
        );

        me.$root.on('click', '#letter-rack-actions-menu .action', function () {
            var $checkedItemList = me.$root.find(
                '#dashboard-letterrack-widget .list-container .dashboard-letterrack-listitem input[type="checkbox"]:checked'
            );

            if ($checkedItemList.length === 0) {
                showInfo('Please select letter(s) to process first.');
                return;
            }

            var letterRackItems = $checkedItemList
                .closest('.dashboard-letterrack-listitem')
                .map(function () {
                    var $item = $(this);
                    return {
                        PendingDocumentId: parseInt($item.attr('data-id')),
                        HistoryEventId: parseInt(
                            $item.attr('data-historyEventId')
                        ),
                        ContactIds: $item.attr('data-contactids').split(','),
                        MediaId: parseInt($item.attr('data-mediaid')),
                        SenderId: parseInt($item.attr('data-senderid')),
                        TemplateId: parseInt($item.attr('data-templateid'))
                    };
                })
                .get();

            var action = $(this).attr('data-action');

            me.processLetters(action, letterRackItems);
        });

        me.$root.on(
            'change',
            '.select-all-button-group input[type=checkbox]',
            function () {
                me.setLetterRackItemsChecked(
                    $(this).prop('checked') === true
                );
            }
        );

        me.$root.on(
            'click',
            '.dashboard-letterrack-listitem .text, .dashboard-letterrack-listitem input',
            function (e) {
                //from BS home
                e.stopPropagation(); // to prevent clicking on checkbox from opening letter
            }
        );

        me.$root.on('click', '.dashboard-letterrack-listitem', function () {
            //from BS home

            var documentType = parseInt(
                me.$root.find('#dashboard-letterrack-status').val()
            );

            var id = 0;
            var hasESignTag = 0;
            switch (documentType) {
              
                case C.LetterRackFilterType.Pending:
                    id = parseInt($(this).attr('data-id'));
                    hasESignTag = parseInt($(this).attr('data-hasAlpTag')) || parseInt($(this).attr('data-hasKeyfloTag'));
                    break;
                case C.LetterRackFilterType.Finalised:
                    id = parseInt($(this).attr('data-historyeventid'));
                    break;
            }

            if (id) {
                me.viewLetterRackItem(id, documentType, hasESignTag);
            }
        });

        //me.$root.on('click', '#dashboard-letterrack-widget .select-all-button-group', function (e, a, b, c) {
        //    // This event does nothing
        //});

        //List Paging
        me.$root.on(
            'click',
            '.dashboard-list .pagination li:not(.disabled)',
            function () {
                me.refreshList($(this));
            }
        );

        //Add todo button > Click
        me.$root.on(
            'click',
            '#dashboard-add-todo-button, #dashboard-add-todo-button-help',
            function () {
                me.addTodoFollowUp();
            }
        );

        //List filtering (checkboxes) > Change
        me.$root.on('change', '.dashboard-list-options-filter', function () {
            me.refreshList($(this));
        });

        //List sort order > Change
        me.$root.on('change', '.dashboard-list-options-sortorder', function () {
            me.refreshList($(this));
        });

        //List sort direction > Click
        me.$root.on('click', '.dashboard-sortdir-button', function () {
            var dir = $(this).data('dir');
            if (dir === C.SearchOrderType.Ascending) {
                $(this).data('dir', C.SearchOrderType.Descending);
                $(this)
                    .find('i')
                    .removeClass('fa-arrow-up')
                    .addClass('fa-arrow-down');
            } else {
                $(this).data('dir', C.SearchOrderType.Ascending);
                $(this)
                    .find('i')
                    .removeClass('fa-arrow-down')
                    .addClass('fa-arrow-up');
            }
            me.refreshList($(this));
        });

        //List sort direction > Click - letter rack
        me.$root.on('click', '.letterrack-sort-dir-button', function () {
            var dir = $(this).data('dir');
            if (dir === C.SearchOrderType.Ascending) {
                $(this).data('dir', C.SearchOrderType.Descending);
                $(this)
                    .find('i')
                    .removeClass('fa-arrow-up')
                    .addClass('fa-arrow-down');
            } else {
                $(this).data('dir', C.SearchOrderType.Ascending);
                $(this)
                    .find('i')
                    .removeClass('fa-arrow-down')
                    .addClass('fa-arrow-up');
            }
            me.refreshLetterRack($(this));
        });

        //List options > Change
        me.$root.on('change', '.selectpicker.options', function () {
            var x = $(this).find('option:selected').length;
            $(this)
                .next()
                .find('.filter-option')
                .html(
                    '<i class="fa fa-sliders"></i> {0} of {1}'.format(
                        x,
                        $(this).find('option[data-divider!="true"]').length
                    )
                );

            me.refreshList($(this));
        });

        //Refresh items which are branch/user agnostic.
        me.refreshNews();

        me.initAutoRefreshables();

        //UI Sizing
        $(window).on('resize', function () {
            clearTimeout(me.resizeTimer);
            me.resizeTimer = setTimeout(function () {
                if (me.$root.is(':visible')) {
                    me.sizeWidgets();
                    me.sizeUI();
                    me.sizeResponsiveElements();
                }
            }, 250);
        });
    },

    pnUpdate: function (pn) {
        var me = this;

        setTimeout(function () {
            switch (pn.ModelType) {
                case C.ModelType.LetterRackItem:
                    // just refresh letter rack with current filters
                    me.refreshLetterRack();
                    break;

                case C.ModelType.FollowUp:
                    // this will be a list of _all_ followups to process, so iterate through each

                    // Only a subset of FollowUp signalR updates are processed here for the FollowUp Dropdown (tasks) feature and dashboard

                    var followUps =
                        gmgps.cloud.helpers.followUp.filterPnUpdateTypes(
                            pn.Data
                        );

                    $.each(followUps, function (index, value) {
                        me.pnFollowUpUpdate(value);
                    });

                    break;

                case C.ModelType.DiaryEvent:
                case C.ModelType.HistoryEvent:
                    me.pnEventUpdate(pn);
                    break;

                case C.ModelType.Lead:
                    me.widgets[me.leadsComponent].refresh();
                    break;

                default:
                    break;
            }
        }, 100);
    },

    pnEventUpdate: function (pn) {
        var me = this;

        var linkedId = pn.Ids[0];
        var linkedType = pn.ModelType;
        // if event updated with or without changes to followups we need to refresh the group heading

        var $groupbox = me.$root.find(
            '.listitem.dashboard-followup-box[data-linkedid="{0}"][data-linkedtype="{1}"]'.format(
                linkedId,
                linkedType
            )
        );

        if ($groupbox.length > 0) {
            new gmgps.cloud.http("dashboard-pnEventUpdate").ajax(
                {
                    args: {
                        linkedType: linkedType,
                        linkedId: linkedId,
                        type: $groupbox.first().data('type')
                    },
                    background: true,
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: '/Home/GetDashboardFollowUpBoxHeader'
                },
                function (response) {
                    if (response && response.Data) {
                        $groupbox.find('.row.info').each(function () {
                            $(this).replaceWith(response.Data);
                        });
                    }
                }
            );
        }

        return true;
    },

    pnFollowUpUpdate: function (pn) {
        var me = this;

        var followUpId = pn.Ids[0];
        var followUpType = pn.Data.Type;
        var linkedId = pn.Data.LinkedId;
        var linkedType = pn.Data.LinkedType;
        var dashboardFollowUpType = me.getDashboardFollowUpTypeFromFollowUpType(
            pn.Data
        );

        if (dashboardFollowUpType === C.DashboardFollowUpType.Unspecified) {
            return false;
        }

        var $list = me.$root.find(
            '.dashboard-followup-list[data-dashboardFollowUpTypeId="{0}"] .dashboard-list-body'.format(
                dashboardFollowUpType
            )
        );

        if (
            gmgps.cloud.helpers.followUp.followUpRelevantForUser(
                pn.Data.BranchId,
                shell.linkedBranchIds
            )
        ) {
            $.when(me.updateFollowUpCount(dashboardFollowUpType)).done(
                function (pageInfo) {
                    var $existingFollowUp = null;
                    var $existingBox = $();

                    var options = me.getFollowUpOptions(dashboardFollowUpType);

                    var isGroupedFollowUp =
                        (pn.Data.LinkedType === C.ModelType.DiaryEvent ||
                            pn.Data.LinkedType === C.ModelType.HistoryEvent) &&
                        options.sortBy !== C.SearchOrderBy.DueDate;

                    switch (pn.Type) {
                        case C.PushNotificationType.Create:
                            //Look for this box.
                            if (isGroupedFollowUp) {
                                $existingBox = $list.find(
                                    '.dashboard-followup-box[data-linkedtype="{0}"][data-linkedid="{1}"]'.format(
                                        linkedType,
                                        linkedId
                                    )
                                );
                            }
                            break;

                        case C.PushNotificationType.Update:
                        case C.PushNotificationType.Delete:
                            //Look for this box and followup.
                            $existingFollowUp = $list.find(
                                '.followup[data-typeid="{0}"][data-id="{1}"]'.format(
                                    followUpType,
                                    followUpId
                                )
                            );
                            $existingBox = $existingFollowUp.closest(
                                '.dashboard-followup-box'
                            );
                            break;
                    }

                    //Out of context vs view settings? (e.g. out of date range, different user, status, etc)
                    if (!me.validateViewContext(pn)) {
                        var sourceIsLoggedInUser =
                            pn.Data.Information[pn.Ids[0]].UpdatedByUserId ===
                            shell.userId;
                        if (
                            sourceIsLoggedInUser &&
                            me.$root.is(':visible') &&
                            (pn.Data.Status === C.FollowUpStatus.Pending ||
                                pn.Data.Status === C.FollowUpStatus.InProgress)
                        ) {
                            $.jGrowl(
                                '...not visible at the moment due to your selected options.',
                                {
                                    header: 'Task Saved',
                                    theme: 'growl-diary',
                                    life: 5000
                                }
                            );
                        }
                        me.processOutOfContextFollowUp(
                            followUpId,
                            $existingBox,
                            $existingFollowUp,
                            pn,
                            dashboardFollowUpType,
                            pageInfo
                        );
                    } else {
                        me.processInContextFollowUp(
                            followUpId,
                            $existingBox,
                            $existingFollowUp,
                            pn,
                            dashboardFollowUpType,
                            isGroupedFollowUp
                        );
                    }
                }
            );
        }
        return true;
    },

    processInContextFollowUp: function (
        followUpId,
        $existingBox,
        $existingFollowUp,
        pn,
        dashboardFollowUpType,
        isGroupedFollowUp
    ) {
        var me = this;

        //In context/valid - create/update/delete.
        me.getFollowUpBox(followUpId, function ($box) {
            var $list;

            //Re-check for existence of box.
            if ($existingBox.length === 0) {
                $list = me.$root.find(
                    '.dashboard-followup-list[data-dashboardFollowUpTypeId="{0}"] .dashboard-list-body'.format(
                        dashboardFollowUpType
                    )
                );

                if (isGroupedFollowUp) {
                    $existingBox = $list.find(
                        '.dashboard-followup-box[data-linkedtype="{0}"][data-linkedid="{1}"]'.format(
                            pn.Data.LinkedType,
                            pn.Data.LinkedId
                        )
                    );
                }
            }

            if ($existingBox.length !== 0) {
                // update the box 'header' info since that might have changed based on the history event change

                var $boxHeader = $box.find('.info-row');
                var $existingBoxHeader = $existingBox.find('.info-row');

                if ($boxHeader.length === 1 && $existingBoxHeader.length >= 1) {
                    $existingBoxHeader.replaceWith($boxHeader);
                }

                //Update box with individual followup (by adding or updating it)
                var $newFollowUp = $box.find(
                    '.followup[data-id="{0}"]'.format(followUpId)
                );

                if (pn.Type === C.PushNotificationType.Create) {
                    $existingBox.find('.boxed-followups').append($newFollowUp);
                } else {
                    // if followup is being uncancelled it comes through as an C.PushNotificationType.Update, but there wont be an existing item to replace, so insert when not found
                    var $existingItem = $existingBox.find(
                        '.followup[data-id="{0}"]'.format(followUpId)
                    );

                    if ($existingItem.length === 0) {
                        $existingBox
                            .find('.boxed-followups')
                            .append($newFollowUp);
                    } else {
                        $existingBox
                            .find('.followup[data-id="{0}"]'.format(followUpId))
                            .replaceWith($newFollowUp);
                    }
                }
            } else {
                //Insert box
                $list = me.$root.find(
                    '.dashboard-followup-list[data-dashboardFollowUpTypeId="{0}"] .dashboard-list-body'.format(
                        dashboardFollowUpType
                    )
                );

                if ($list.find('.followup').length === 0) {
                    //List is empty, hide no tasks msg and insert box.
                    me.setNoTaskItemsToDisplayMessage(
                        false,
                        dashboardFollowUpType
                    );
                    $list.prepend($box);
                } else {
                    //List not empty - find the correct position for it to be inserted.
                    var inserted = false;

                    //Chrono
                    var thisTime = pn.Data.DueDate;
                    $list.find('.dashboard-followup-box').each(function (i, v) {
                        var $thatBox = $(v);
                        var thatTime = $thatBox.data('minduedate');
                        if (thisTime <= thatTime) {
                            $box.insertBefore($thatBox);
                            inserted = true;
                            return false;
                        }
                    });

                    if (!inserted) {
                        me.$root
                            .find(
                                '.dashboard-followup-list[data-dashboardFollowUpTypeId="{0}"] .dashboard-list-body'.format(
                                    dashboardFollowUpType
                                )
                            )
                            .append($box);
                    }
                }
            }
        });
    },

    processOutOfContextFollowUp: function (
        followUpId,
        $existingBox,
        $existingFollowUp,
        pn,
        dashboardFollowUpType,
        pageInfo
    ) {
        var me = this;

        //Exit early if we don't have this box on display.
        if ($existingBox === null) {
            return false;
        }

        var emptyListCheck = function () {
            var $list = me.$root.find(
                '.dashboard-followup-list[data-dashboardFollowUpTypeId="{0}"] .dashboard-list-body'.format(
                    dashboardFollowUpType
                )
            );

            if ($list.find('.followup').length === 0) {
                //List is empty, show no tasks msg.
                me.setNoTaskItemsToDisplayMessage(true, dashboardFollowUpType);
            } else {
                // nearly empty list check....

                // if the user quick-completes many followups without ever getting to the end of the
                // infinite scroll, then we can run out of items in the list even though there are more still to display
                // so ensure we get some more items by refreshing the list, but only do that when there is no longer
                // an overflow to minimise the number of refreshes and potential UI effect of suddenly repopulating the list
                var remainingBoxCount = $list.find(
                    '.row.dashboard-followup-box'
                ).length;

                // any more to render ?
                if (
                    remainingBoxCount < pageInfo.PageSize &&
                    pageInfo.TotalRows > remainingBoxCount
                ) {
                    // no more scrollbar, so lets go refresh as its obvious now we're at end of the current visible list
                    if ($list[0].scrollHeight - 5 < $list[0].offsetHeight) {
                        me.lockUI(true);
                        $.when(
                            me.refreshFollowUps(
                                me.$root.find(
                                    me.followUpListSelector.format(
                                        dashboardFollowUpType
                                    )
                                )
                            )
                        )
                            .done(function () {
                                me.lockUI(false);
                            })
                            .fail(function () {
                                me.lockUI(false);
                            });
                    }
                }
            }
        };

        //If the followup has gone out of context due to completion or cancellation then replace and retain it for a moment in order to give a bit of visual feedback.
        if (
            pn.Data.Status === C.FollowUpStatus.Complete ||
            pn.Data.Status === C.FollowUpStatus.Cancelled ||
            pn.Type === C.PushNotificationType.Delete
        ) {
            //If this followup was previously on show, update it and then remove it.  If that leaves an empty box, remove that also.
            if ($existingFollowUp !== null) {
                var removeDeadFollowUp = function ($deadFollowUp) {
                    $deadFollowUp.slideUp(function () {
                        $deadFollowUp.remove();

                        if ($existingBox.find('.followup').length === 0) {
                            $existingBox.slideUp(function () {
                                $existingBox.remove();
                                emptyListCheck();
                            });
                        } else {
                            emptyListCheck();
                        }
                    });
                };

                if (pn.Type === C.PushNotificationType.Delete) {
                    // no new status to get for deleted followup so go ahead and remove without getting

                    var $deadFollowUp = $existingBox.find(
                        '.followup[data-id="{0}"]'.format(followUpId)
                    );
                    removeDeadFollowUp($deadFollowUp);
                } else {
                    me.getFollowUpBox(followUpId, function ($box) {
                        var $deadFollowUp = $box.find(
                            '.followup[data-id="{0}"]'.format(followUpId)
                        );
                        $existingBox
                            .find('.followup[data-id="{0}"]'.format(followUpId))
                            .replaceWith($deadFollowUp);
                        removeDeadFollowUp($deadFollowUp);
                    });
                }
            }
        } else {
            //For any other status type on the out of context followup, just remove it.
            if ($existingFollowUp !== null) {
                $existingFollowUp.remove();
                if ($existingBox.find('.followup').length === 0) {
                    $existingBox.remove();
                    emptyListCheck();
                }
            }
        }

        return true;
    },

    updateFollowUpCount: function (dashboardFollowUpType) {
        var me = this;

        var $deferred = $.Deferred();

        var $count = me.$root.find(
            '#dashboard-followups .list-totalrows[data-dashboardfollowuptypeid="{0}"]'.format(
                dashboardFollowUpType
            )
        );

        if (me.followUpSearches[dashboardFollowUpType] === undefined) {
            return $deferred.resolve(false);
        }

        new gmgps.cloud.http("dashboard-updateFollowUpCount").ajax(
            {
                args: me.followUpSearches[dashboardFollowUpType],
                background: true,
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/Home/GetDashboardFollowUpCount'
            },
            function (response) {
                if (response.Data.TotalRows === 0) {
                    $count
                        .addClass('nothing')
                        .html('<i class="fa fa-check"></i>');
                } else {
                    $count.removeClass('nothing').text(response.Data.TotalRows);
                }
                return $deferred.resolve(response.Data);
            },
            function () {
                return $deferred.resolve(false);
            }
        );

        return $deferred.promise();
    },

    validateViewContext: function (pn) {
        var me = this;

        var datesFilter = me.$root
            .find('#dashboard-followups-mode option:selected')
            .data();
        var dashboardFollowUpType = me.getDashboardFollowUpTypeFromFollowUpType(
            pn.Data
        );
        var allBranchesSelected = me.branchId === 0;
        var allUsersSelected = me.userId === 0;
        var selectedBranchId = me.branchId;
        var selectedUserId = me.userId;
        var taskBranchId = pn.Data.BranchId;
        var targetUserId = pn.Data.TargetUserId;

        // followup being removed so its going out of context

        if (pn.Type === C.PushNotificationType.Delete) return false;

        //All branches is not selected and the selected branch is not the target user's default branch.
        if (!allBranchesSelected && selectedBranchId !== taskBranchId) {
            return false;
        }

        //All users is not selected and the selected user is not the target user. (Todo's have an 'Assigned To' filter that needs separate attention)
        if (
            !allUsersSelected &&
            selectedUserId !== targetUserId &&
            dashboardFollowUpType !== C.DashboardFollowUpType.Todo
        ) {
            return false;
        }

        //Options based checks from here.
        var options = me.getFollowUpOptions(dashboardFollowUpType);

        //Is the status in context?
        if ($.inArray(pn.Data.Status, options.statuses) === -1) {
            return false;
        }

        //Is the date within range?
        if (
            pn.Data.DueDate < datesFilter.fromdate ||
            pn.Data.DueDate > datesFilter.todate
        ) {
            return false;
        }

        //Checkbox filtering
        switch (dashboardFollowUpType) {
            case C.DashboardFollowUpType.Todo:
                if (!options.subTypes.todoProperty && pn.Data.PropertyId) {
                    return false;
                }
                if (!options.subTypes.todoContact && pn.Data.ContactId) {
                    return false;
                }
                if (
                    !options.subTypes.todoGeneral &&
                    (pn.Data.PropertyId || pn.Data.ContactId)
                ) {
                    return false;
                }
                if (
                    !allUsersSelected &&
                    selectedUserId === targetUserId &&
                    options.delegatedOn === true
                ) {
                    return false;
                }

                if (
                    !allUsersSelected &&
                    selectedUserId !== targetUserId &&
                    options.delegatedOn === false
                ) {
                    return false;
                }

                break;

            case C.DashboardFollowUpType.Appraisal:
                if (
                    !options.subTypes.appraisalFollowUp &&
                    pn.Data.Type === C.FollowUpType.PostAppraisalFollowUpOwner
                ) {
                    return false;
                }
                if (
                    !options.subTypes.appraisalReview &&
                    pn.Data.Type === C.FollowUpType.LostInstructionReview
                ) {
                    return false;
                }
                break;

            case C.DashboardFollowUpType.Viewing:
                if (
                    !options.subTypes.viewingFollowUp &&
                    (pn.Data.Type === C.FollowUpType.ViewingFollowUpApplicant ||
                        pn.Data.Type === C.FollowUpType.ViewingFollowUpOwner)
                ) {
                    return false;
                }
                if (
                    !options.subTypes.viewingConfirmation &&
                    (pn.Data.Type ===
                        C.FollowUpType.ViewingConfirmationApplicant ||
                        pn.Data.Type ===
                            C.FollowUpType.ViewingConfirmationOwner)
                ) {
                    return false;
                }
                if (
                    !options.subTypes.viewingCancelled &&
                    (pn.Data.Type ===
                        C.FollowUpType.ViewingCancelledFollowUpApplicant ||
                        pn.Data.Type ===
                            C.FollowUpType.ViewingCancelledFollowUpOwner)
                ) {
                    return false;
                }
                break;

            case C.DashboardFollowUpType.Review:
                if (
                    !options.subTypes.propertyReview &&
                    pn.Data.Type === C.FollowUpType.PropertyReview
                ) {
                    return false;
                }
                if (
                    !options.subTypes.contactReview &&
                    pn.Data.Type === C.FollowUpType.ContactReview
                ) {
                    return false;
                }
                if (
                    !options.subTypes.dealProgressionReview &&
                    pn.Data.Type === C.FollowUpType.DealProgressionReview
                ) {
                    return false;
                }

                break;

            default:
                break;
        }

        return true;
    },

    getFollowUpOptions: function (dashboardFollowUpTypeId) {
        var me = this;

        var $list = me.$root.find(
            '.dashboard-followup-list[data-dashboardfollowuptypeid="{0}"]'.format(
                dashboardFollowUpTypeId
            )
        );
        var $options = $list.find('.options');

        var options = {
            statuses: $options
                .find('option[data-isstatus="1"]:selected')
                .map(function () {
                    return parseInt($(this).val());
                })
                .get()
        };

        switch (dashboardFollowUpTypeId) {
            case C.DashboardFollowUpType.Todo:
                options.delegatedOn = $options
                    .find(
                        'option[value="{0}"]'.format(
                            C.DashboardFollowUpOptions.Delegated
                        )
                    )
                    .prop('selected');
                break;

            default:
                options.delegatedOn = false;
                break;
        }

        var getSubTypeSetting = function (subType) {
            return $list
                .find(
                    '.dashboard-list-options .dashboard-list-options-filter[data-filterid="{0}"]'.format(
                        subType
                    )
                )
                .prop('checked');
        };

        //Subtypes (per dashboard followup type)
        switch (dashboardFollowUpTypeId) {
            case C.DashboardFollowUpType.Todo:
                options.subTypes = {
                    todoGeneral: getSubTypeSetting(
                        C.DashboardFollowUpSubType.TodoGeneral
                    ),
                    todoProperty: getSubTypeSetting(
                        C.DashboardFollowUpSubType.TodoProperty
                    ),
                    todoContact: getSubTypeSetting(
                        C.DashboardFollowUpSubType.TodoContact
                    )
                };
                break;

            case C.DashboardFollowUpType.Appraisal:
                options.subTypes = {
                    appraisalFollowUp: getSubTypeSetting(
                        C.DashboardFollowUpSubType.AppraisalFollowUp
                    ),
                    appraisalReview: getSubTypeSetting(
                        C.DashboardFollowUpSubType.AppraisalReview
                    )
                };
                break;

            case C.DashboardFollowUpType.Viewing:
                options.subTypes = {
                    viewingConfirmation: getSubTypeSetting(
                        C.DashboardFollowUpSubType.ViewingConfirmation
                    ),
                    viewingFollowUp: getSubTypeSetting(
                        C.DashboardFollowUpSubType.ViewingFollowUp
                    ),
                    viewingCancelled: getSubTypeSetting(
                        C.DashboardFollowUpSubType.ViewingCancelled
                    )
                };
                break;

            case C.DashboardFollowUpType.Review:
                options.subTypes = {
                    propertyReview: getSubTypeSetting(
                        C.DashboardFollowUpSubType.PropertyReview
                    ),
                    contactReview: getSubTypeSetting(
                        C.DashboardFollowUpSubType.ContactReview
                    ),
                    dealProgressionReview: getSubTypeSetting(
                        C.DashboardFollowUpSubType.DealProgressionReview
                    )
                };
                break;
        }

        //Sorting
        options.sortBy = parseInt(
            $list.find('.dashboard-list-options-sortorder').val()
        );
        options.sortDirection = parseInt(
            $list.find('.dashboard-sortdir-button').data('dir')
        );

        return options;
    },

    lockUI: function (lock) {
        glass(lock);
    },

    activate: function (forceRefresh) {
        var me = this;

        if (forceRefresh || !me.initialised) {
            setTimeout(function () {
                me.refreshAll();
            }, 250);
        } else {
            setTimeout(function () {
                me.sizeUI();
            }, 250);
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

        var refreshPromises = [];

        refreshPromises.push(me.refreshHeadlineBoxes());
        refreshPromises.push(me.refreshFollowUpsAll());
        refreshPromises.push(me.refreshFinancialReferrals());
        refreshPromises.push(me.refreshLetterRack());
        refreshPromises.push(me.refreshHotApplicants());
        refreshPromises.push(me.refreshDealProgressions());
        refreshPromises.push(me.refreshDashboardStockPie());
        refreshPromises.push(me.refreshDashboardSalesChart());
        refreshPromises.push(me.refreshMarketingStats());

        for (var component in me.widgets) {
            // eslint-disable-next-line no-prototype-builtins
            if (!me.widgets.hasOwnProperty(component)) continue;

            me.widgets[component].branchId = me.branchId;

            if (me.widgets[component].userId !== undefined) {
                me.widgets[component].userId = me.userId;
            }

            refreshPromises.push(me.widgets[component].refresh());
        }

        $.when(refreshPromises)
            .done(function () {
                me.lockUI(false);
                deferred.resolve();
            })
            .fail(function () {
                me.lockUI(false);
            });

        return deferred.promise();
    },

    refreshFollowUpsAll: function () {
        var me = this;

        var deferred = new $.Deferred();

        me.initialised = true;
        me.lockUI(true);

        $.when(
            me.refreshFollowUps(
                me.$root.find(
                    me.followUpListSelector.format(C.DashboardFollowUpType.Todo)
                )
            ),
            me.refreshFollowUps(
                me.$root.find(
                    me.followUpListSelector.format(
                        C.DashboardFollowUpType.Appraisal
                    )
                )
            ),
            me.refreshFollowUps(
                me.$root.find(
                    me.followUpListSelector.format(
                        C.DashboardFollowUpType.Viewing
                    )
                )
            ),
            me.refreshFollowUps(
                me.$root.find(
                    me.followUpListSelector.format(
                        C.DashboardFollowUpType.Offer
                    )
                )
            ),
            me.refreshFollowUps(
                me.$root.find(
                    me.followUpListSelector.format(
                        C.DashboardFollowUpType.Review
                    )
                )
            )
        )
            .done(function () {
                me.lockUI(false);
                me.saveUserSettingsCallback();
                deferred.resolve();
            })
            .fail(function () {
                me.lockUI(false);
            });

        return deferred.promise();
    },

    sizeWidgets: function () {
        var me = this;

        var docH = $(document).height();

        me.widgetHeight = (docH - 130) / 2;

        if (me.widgetHeight < 575) me.widgetHeight = 575;

        me.$widgets.height(me.widgetHeight);
    },

    sizeUI: function () {
        var me = this;

        for (var component in me.widgets) {
            // eslint-disable-next-line no-prototype-builtins
            if (!me.widgets.hasOwnProperty(component)) continue;

            me.widgets[component].redrawCharts();
        }

        if (me.chartCache.stock && me.chartCache.stock !== 'nodata') {
            me.refreshDashboardStockPie(me.chartCache.stock);
        }

        if (me.chartCache.sales && me.chartCache.sales !== 'nodata') {
            me.refreshDashboardSalesChart(me.chartCache.sales);
        }

        if (me.chartCache.headlines) {
            me.refreshHeadlineBoxes(me.chartCache.headlines);
        }
    },

    sizeResponsiveElements: function () {
        var me = this;

        // 'data-moo' (move-on-overflow) will move all <li/> elements to the appropriate <ul/>
        // if the inline-list element width exceeds that of its parent (i.e overflows)
        // The value of this attribute is optional and contains a comma delimited string of the
        // container selectors. These elements are shown/hidden depending on whether they contain
        // the required content.
        // - The first selector is treated as the expanded container (the element that is shown when NOT overflowed)

        // Accompanying this data attribute, 2 child elements must be marked with 'data-moo-expanded' and
        // 'data-moo-collapsed' respectively
        var $elementsToMoo = me.$widgets.find('[data-moo]');

        $elementsToMoo.each(function (i, e) {
            var $moo = $(e);

            var selectors = $moo
                .data('moo')
                .split(',')
                .map(function (s) {
                    return s.trim();
                });

            if (selectors.length !== 2) {
                return;
            }

            var $expandedContent = $moo.find('[data-moo-expanded]');
            if ($expandedContent.length === 0) return;

            var $collapsedContent = $moo.find('[data-moo-collapsed]');
            if ($collapsedContent.length === 0) return;

            var parentWidth = $moo.parent().width();
            var expandedWidth = -1;
            if (!$moo.data('moo-width')) {
                $moo.data('moo-width', $expandedContent.width()); // Store the rendered width of the list
            } else {
                expandedWidth = $moo.data('moo-width');
            }

            var $expandedContainer = $moo.find(selectors[0]);
            var $collapsedContainer = $moo.find(selectors[1]);

            if (expandedWidth > parentWidth) {
                $expandedContent.contents().appendTo($collapsedContent);
                $expandedContainer.hide();
                $collapsedContainer.show();
            } else {
                $collapsedContent.contents().appendTo($expandedContent);
                $collapsedContainer.hide();
                $expandedContainer.show();
            }
        });
    },

    initAutoRefreshables: function () {
        var me = this;

        //Refresh news every 15 mins.
        me.refreshNewsInterval = setInterval(function () {
            me.refreshNews();
        }, 900000);
    },

    refreshList: function ($source) {
        //This is a general refresh function which will refresh any list following paging/filtering/etc.
        var me = this;

        //Determine list type and current page index.
        var $list = $source.closest('.dashboard-list');
        var listType = $list.attr('data-listType');
        var pageIndex = parseInt($list.attr('data-pageindex'));

        if (isNaN(pageIndex)) pageIndex = 1;

        //Paging (adjust pageindex if required)
        if ($source.hasClass('next') || $source.hasClass('prev')) {
            var dir = $source.hasClass('next') ? 'next' : 'prev';
            pageIndex =
                dir === 'next'
                    ? pageIndex + 1
                    : pageIndex > 1
                    ? pageIndex - 1
                    : pageIndex;
        }

        //Sorting
        var sortOrderId = parseInt(
            $list.find('.dashboard-list-options-sortorder').val()
        );
        var sortDir = parseInt(
            $list.find('.dashboard-sortdir-button').data('dir')
        );

        //Filtering
        var listOptionExclusionIds = me.getListOptionExclusionIds($list);

        me['refresh{0}'.format(listType)](
            $list,
            pageIndex,
            listOptionExclusionIds,
            sortOrderId,
            sortDir
        );

        // followup filter/sort options are sticky
        if (listType === 'FollowUps') {
            me.saveUserSettingsCallback();
        }
    },

    getFollowUpBox: function (followUpId, callback) {
        new gmgps.cloud.http("dashboard-getFollowUpBox").getView({
            url: 'Home/GetDashboardFollowUpBox',
            args: {
                id: followUpId
            },
            automated: true,
            post: true,
            background: true,
            onSuccess: function (response) {
                callback($(response.Data));
            }
        });
    },

    refreshFollowUps: function ($list) {
        var me = this;

        var deferred = new $.Deferred();

        me.$root
            .find('#dashboard-followups .tabbable')
            .append(
                '<div class="busybee"><div class="home-spinner"></div></div>'
            );

        var dashboardFollowUpTypeId = parseInt(
            $list.attr('data-dashboardFollowUpTypeId')
        );
        var options = me.getFollowUpOptions(dashboardFollowUpTypeId);

        var search = {
            saleOrRent: C.PropertyRecordType.Unspecified,
            searchOrder: {
                by: options.sortBy,
                type: options.sortDirection
            },
            searchPage: {
                index: 1,
                size: me.followUpPageSize
            },
            delegatedOnly: false,
            statusList: [],
            userAssociationType: C.FollowUpUserAssociationType.AssignedUser,
            userId: me.userId
        };

        var listOptionExclusionIds = me.getListOptionExclusionIds($list);

        search.statusList = options.statuses;
        search.delegatedOnly = options.delegatedOn;

        if (options.delegatedOn) {
            search.userAssociationType = C.FollowUpUserAssociationType.Creator;
        }
        if (search.statusList.length === 0) {
            search.statusList.push(255); //Push a dummy value into the array in order to produce an empty list, else the server side will set defaults.
        }

        var mode = parseInt(me.$root.find('#dashboard-followups-mode').val());

        var args = {
            branchId: me.branchId,
            userId: me.userId,
            dashboardFollowUpType: dashboardFollowUpTypeId,
            dashboardFollowUpSubTypeExclusions: listOptionExclusionIds,
            search: search,
            mode: mode
        };

        // BS: AD-3311 - Hide info message thats displayed when task list is empty
        me.setNoTaskItemsToDisplayMessage(false, dashboardFollowUpTypeId);

        //Cache search(es)
        me.followUpSearches[dashboardFollowUpTypeId] = args;

        new gmgps.cloud.http("dashboard-refreshFollowUps").ajax(
            {
                args: args,
                background: true,
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/Home/GetDashboardFollowUpBoxes'
            },
            function (response) {
                deferred.resolve();

                var pagedList = response.Data;

                me.$root
                    .find('#dashboard-followups .tabbable .busybee')
                    .remove();

                var $container = me.$root.find(
                    '#dashboard-followups .list-container[data-dashboardfollowuptypeid="{0}"]'.format(
                        pagedList.DashboardFollowUpType
                    )
                );
                var $totalRows = me.$root.find(
                    '#dashboard-followups .list-totalrows[data-dashboardfollowuptypeid="{0}"]'.format(
                        pagedList.DashboardFollowUpType
                    )
                );
                var $body = $container.find('.dashboard-list-body');

                $body[0].innerHTML = response.Data.Html;

                if (response.Data.PageInfo.TotalRows === 0) {
                    $totalRows
                        .addClass('nothing')
                        .html('<i class="fa fa-check"></i>');
                } else {
                    $totalRows
                        .removeClass('nothing')
                        .css('display', 'inline-block')
                        .removeClass('badge-info badge-danger')
                        .text(pagedList.PageInfo.TotalRows);
                }

                // BS: AD-3311 - No Task Items to display? Will show info message instead of empty list container
                me.setNoTaskItemsToDisplayMessage(
                    response.Data.PageInfo.TotalRows === 0,
                    dashboardFollowUpTypeId
                );

                $body.animate(
                    {
                        scrollTop: 0
                    },
                    0
                );

                $body.simpleInfiniteScroll({
                    offset: 5,
                    totalPages: pagedList.PageInfo.TotalPages,
                    ajaxOptions: {
                        url: '/Home/GetDashboardFollowUpBoxes',
                        async: false,
                        type: 'POST',
                        background: true,
                        dataType: 'json',
                        data: {
                            branchId: me.branchId,
                            userId: me.userId,
                            dashboardFollowUpType:
                                pagedList.DashboardFollowUpType,
                            dashboardFollowUpSubTypeExclusions:
                                listOptionExclusionIds,
                            search: search,
                            mode: mode
                        },
                        beforeSend: function (xhr) {
                            xhr.setRequestHeader(
                                'X-CSRF-Token',
                                $('meta[name="csrf-token"]').attr('content')
                            );
                        }
                    },
                    callback: function (scrollResponse) {
                        $body.append(scrollResponse.Data.Html);
                    }
                });
            }
        );

        return deferred.promise();
    },

    setNoTaskItemsToDisplayMessage: function (displayMessage, followUpTypeId) {
        var me = this;

        var messageHtml = me.$root
            .find(
                '#dashboard-followups .no-items-to-display-message[data-dashboardfollowuptypeid="{0}"]'.format(
                    followUpTypeId
                )
            )
            .html();
        var message = $('<div class="no-items-to-display"></div>').html(
            messageHtml
        );

        if (displayMessage) {
            var $messageContainer = me.$root.find(
                '#dashboard-followups .dashboard-list[data-dashboardfollowuptypeid="{0}"] .dashboard-list-body'.format(
                    followUpTypeId
                )
            );

            if ($messageContainer.find('.no-items-to-display').length === 0) {
                me.$root
                    .find(
                        '#dashboard-followups .dashboard-list[data-dashboardfollowuptypeid="{0}"] .dashboard-list-body'.format(
                            followUpTypeId
                        )
                    )
                    .append(message);
                me.$root
                    .find(
                        '#dashboard-followups .dashboard-list[data-dashboardfollowuptypeid="{0}"] .no-items-to-display'.format(
                            followUpTypeId
                        )
                    )
                    .fadeIn(300);
            }
        } else {
            me.$root
                .find(
                    '#dashboard-followups .dashboard-list[data-dashboardfollowuptypeid="{0}"] .no-items-to-display'.format(
                        followUpTypeId
                    )
                )
                .remove();
        }
    },

    refreshHotApplicants: function ($list, pageIndex) {
        var me = this;

        var deferred = new $.Deferred();

        var search = {
            branchIdList: [me.branchId],
            userIdList: [me.userId],
            searchOrder: {
                by: C.SearchOrderBy.Name,
                type: C.SearchOrderType.Ascending
            },
            searchPage: {
                index: pageIndex,
                size: 10
            },
            propertyRecordType: C.PropertyRecordType.Sale
        };

        new gmgps.cloud.http("dashboard-refreshHotApplicants").ajax(
            {
                args: {
                    search: search
                },
                background: true,
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/home/getdashboardhotapplicants'
            },
            function (response) {
                deferred.resolve();

                var $container = me.$root.find('#dashboard-hotapplicants');
                var $body = $container.find('.dashboard-list-body');

                $body.html(response.Data.Html);
                $container
                    .closest('.dashboard-box, .dashboard-widget')
                    .find('.list-totalrows')
                    .text(response.Data.PageInfo.TotalRows)
                    .show();

                $body.simpleInfiniteScroll({
                    offset: 5,
                    totalPages: response.Data.PageInfo.TotalPages,
                    ajaxOptions: {
                        url: '/home/getdashboardhotapplicants',
                        async: false,
                        type: 'POST',
                        background: true,
                        dataType: 'json',
                        data: {
                            search: search
                        }
                    },
                    callback: function (scrollResponse) {
                        $body.append(scrollResponse.Data.Html);
                    }
                });
            }
        );

        return deferred.promise();
    },

    refreshFinancialReferrals: function (pageIndex) {
        var me = this;

        var deferred = new $.Deferred();

        var search = {
            branchIdList: [me.branchId],
            FSReferralUserId: me.userId,
            searchOrder: {
                by: 0,
                type: C.SearchOrderType.Ascending
            },
            searchPage: {
                index: pageIndex,
                size: 10
            }
        };

        new gmgps.cloud.http("dashboard-refreshFinancialReferrals").ajax(
            {
                args: {
                    search: search
                },
                background: true,
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/home/getdashboardfinancialreferrals'
            },
            function (response) {
                deferred.resolve();

                var $container = me.$root.find(
                    '#dashboard-followups-financialreferrals'
                );
                var $body = $container.find('.dashboard-list-body');

                $body.html(response.Data.Html);

                //Treated in a custom way, since these FS entries live inside the Task widget for the time being; until they become a task one day.
                var $totalRows = me.$root.find(
                    '#dashboard-followups .list-totalrows[data-dashboardfollowuptypeid="{0}"]'.format(
                        C.DashboardFollowUpType.FinancialReferral
                    )
                );
                var totalRows = response.Data.PageInfo.TotalRows;

                if (totalRows === 0) {
                    $totalRows
                        .addClass('nothing')
                        .html('<i class="fa fa-check"></i>');
                    // BS: AD-3311 - No Task Items to display? Will show info message instead of empty list container
                    me.setNoTaskItemsToDisplayMessage(
                        true,
                        C.DashboardFollowUpType.FinancialReferral
                    );
                } else {
                    $totalRows
                        .removeClass('nothing')
                        .css('display', 'inline-block')
                        .removeClass('badge-info badge-danger')
                        .text(totalRows);

                    me.setNoTaskItemsToDisplayMessage(
                        false,
                        C.DashboardFollowUpType.FinancialReferral
                    );
                }

                $body.simpleInfiniteScroll({
                    offset: 5,
                    totalPages: response.Data.PageInfo.TotalPages,
                    ajaxOptions: {
                        url: '/home/getdashboardfinancialreferrals',
                        async: false,
                        type: 'POST',
                        background: true,
                        dataType: 'json',
                        data: {
                            search: search
                        }
                    },
                    callback: function (scrollResponse) {
                        $body.append(scrollResponse.Data.Html);
                    }
                });
            }
        );

        return deferred.promise();
    },

    refreshMarketingStats: function () {
        var me = this;

        var deferred = new $.Deferred();

        if (me.homeControllers.emailmarketing) {
            me.homeControllers.emailmarketing
                .getStats(
                    me.branchId,
                    me.userId,
                    me.marketingStatsUserContext,
                    me.marketingStatsPeriod
                )
                .done(function (response) {
                    me.$root
                        .find(
                            '#dashboard-ma-headline-counts .widget-body .email-stat .count .value'
                        )
                        .each(function (i, v) {
                            var $count = $(v);
                            var name = $count.data('name');

                            var counter = new CountUp(
                                $count[0],
                                0,
                                response.Data[name],
                                0,
                                0.7,
                                {
                                    useEasing: true,
                                    useGrouping: true,
                                    separator: ',',
                                    suffix:
                                        name.indexOf('Percent') >= 0 ? '%' : ''
                                }
                            );

                            counter.start();
                        });

                    deferred.resolve();
                });
        }

        return deferred.promise();
    },

    refreshDealProgressions: function ($list, pageIndex) {
        var me = this;

        var deferred = new $.Deferred();

        var search = {
            branchIdList: [me.branchId],
            negotiatorId: me.userId,
            propertyRecordType: me.dashboardPendingDealsType,
            searchOrder: {
                by: C.SearchOrderBy.ReviewDate,
                type: C.SearchOrderType.Ascending
            },
            searchPage: {
                index: pageIndex,
                size: 6
            }
        };

        new gmgps.cloud.http("dashboard-refreshDealProgressions").ajax(
            {
                args: {
                    search: search
                },
                background: true,
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/home/getdashboarddealprogressions'
            },
            function (response) {
                deferred.resolve();

                var $container = me.$root.find(
                    '#dashboard-dealprogressions-widget'
                );
                var $body = $container.find('.dashboard-list-body');

                $body.html(response.Data.Html);
                $container
                    .closest('.dashboard-box, .dashboard-widget')
                    .find('.list-totalrows')
                    .text(response.Data.PageInfo.TotalRows)
                    .show();

                InitiateEasyPieChart.init();

                $body.simpleInfiniteScroll({
                    offset: 5,
                    totalPages: response.Data.PageInfo.TotalPages,
                    ajaxOptions: {
                        url: '/home/getdashboarddealprogressions',
                        async: false,
                        type: 'POST',
                        background: true,
                        dataType: 'json',
                        data: {
                            search: search
                        }
                    },
                    callback: function (scrollResponse) {
                        $body.append(scrollResponse.Data.Html);
                        InitiateEasyPieChart.init();
                    }
                });
            }
        );

        return deferred.promise();
    },

    refreshLetterRack: function ($list, pageIndex) {
        var me = this;

        var deferred = new $.Deferred();

        new gmgps.cloud.http("dashboard-refreshLetterRack").ajax(
            {
                args: {
                    BranchIdList: [me.branchId],
                    UserIdList: [me.userId],
                    searchOrder: {
                        by: parseInt(
                            me.$root
                                .find(
                                    '#dashboard-letterrack-widget #dashboard-letterrack-sort-order'
                                )
                                .val()
                        ),
                        type: parseInt(
                            me.$root
                                .find(
                                    '#dashboard-letterrack-widget .letterrack-sort-dir-button'
                                )
                                .data('dir')
                        )
                    },
                    searchPage: {
                        index: pageIndex || 1,
                        size: 10
                    },
                    searchFilterType: parseInt(
                        me.$root.find('#dashboard-letterrack-status').val()
                    )
                },
                background: true,
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/home/getdashboardletterracklist'
            },
            function (response) {
                deferred.resolve();

                var $container = me.$root.find(
                    '#dashboard-letterrack-widget .list-container'
                );

                $container[0].innerHTML = response.Data;
                me.refreshWidgetCounter($container);
                me.unselectLetterRackItems();
            }
        );

        return deferred.promise();
    },

    refreshNews: function () {
        var me = this;

        return (async function () {
            const getPersonalisationDataAsync = () =>
                new Promise((resolve) => {
                    gmgps.cloud.helpers.user.getPersonalisationData('widget.rss', resolve);
                });

            const getRssFeedAsync = (feedId) =>
                new Promise((resolve) => {
                    new gmgps.cloud.http("dashboard-refreshNews").getView({
                        url: '/rss/getrssfeedbyid',
                        background: true,
                        args: { feedId },
                        onSuccess: resolve
                    });
                });

            var settings = await getPersonalisationDataAsync();
            var preselected = settings?.feed;
            var $select = me.$root.find('#dashboard-rssNewsUrl');
            var $options = me.$root.find('#dashboard-rssNewsUrl option');
            var $widgetBody = me.$root.find('#dashboard-news-widget .list-container');

            if ($options.length === 0) {
                $widgetBody[0].innerHTML = "";
                return;
            }

            var feedId = $options.filter((i, o) => o.value === preselected).length
                ? preselected
                : $select.val();

            if (!feedId || isNaN(parseInt(feedId))) {
                feedId = 1;
            }

            var response = await getRssFeedAsync(feedId);
            $select.val(feedId);
            $select.selectpicker('refresh'); // because the Bootstrap-Select plugin supplants the select element
            $widgetBody[0].innerHTML = response.Data;
            $widgetBody.scrollTop(0);
            $widgetBody.find('a').attr('target', '_blank');
        })();
    },

    saveNewsFeedUrl: function (id, title, callback) {
        gmgps.cloud.helpers.user.putPersonalisationData(
            'widget.rss',
            {
                feed: id,
                name: title,
                interval: 0
            },
            false,
            callback
        );
    },

    refreshWidgetCounter: function ($container) {
        var totalRows = parseInt(
            $container.find('.dashboard-list').attr('data-totalrows')
        );
        var $count = $container
            .closest('.dashboard-box, .dashboard-widget')
            .find('.list-totalrows');

        if (totalRows > 0) {
            $count.text(totalRows).show();
        } else {
            $count.hide();
        }
    },

    getListOptionExclusionIds: function ($list) {
        var ids = [];

        var $options = $list.find('.dashboard-list-options');
        var $uncheckedCheckboxes = $options.find(
            '.dashboard-list-options-filter:not(:checked)'
        );

        $uncheckedCheckboxes.each(function (i, v) {
            ids.push(parseInt($(v).attr('data-filterId')));
        });

        return ids;
    },

    addTodoFollowUp: function () {
        gmgps.cloud.helpers.followUp.createFollowUp(
            C.FollowUpType.Todo,
            'Create Task',
            '',
            C.ModelType.User,
            shell.userId,
            shell.branchId,
            null,
            null,
            function () {
                //
            }
        );
    },

    updateFollowUpSetCompleted: function (id, completed) {
        var me = this;

        var $followUp = me.$root.find('.followup[data-id="{0}"]'.format(id));
        var linkedType = parseInt($followUp.attr('data-linkedType'));
        var linkedId = parseInt($followUp.attr('data-linkedId'));
        var type = parseInt($followUp.attr('data-typeid'));

        //Strike-thru
        $followUp.css('text-decoration', 'line-through');

        new gmgps.cloud.http("dashboard-updateFollowUpSetCompleted").ajax(
            {
                args: {
                    id: id,
                    completed: completed
                },
                background: true,
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/FollowUp/UpdateFollowUpSetCompleted'
            },
            function (response) {
                if (response) {
                    gmgps.cloud.helpers.followUp.manageFollowUpUpdate(
                        id,
                        type,
                        linkedType,
                        linkedId,
                        completed
                    );
                }
            }
        );
    },

    updateFollowUpSetDueDate: function (id, interval, count) {
        new gmgps.cloud.http("dashboard-updateFollowUpSetDueDate").ajax(
            {
                args: {
                    id: id,
                    interval: interval,
                    count: count,
                    date: null
                },
                background: true,
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/FollowUp/UpdateFollowUpSetDueDate'
            },
            function () {}
        );
    },

    getDashboardFollowUpTypeFromFollowUpType: function (pnData) {
        switch (pnData.Type) {
            //Todo
            case C.FollowUpType.Todo:
                switch (pnData.LinkedType) {
                    case C.ModelType.User:
                    case C.ModelType.Property:
                    case C.ModelType.Contact:
                    case C.ModelType.ChainLink:
                        return C.DashboardFollowUpType.Todo;
                    case C.ModelType.DiaryEvent:
                    case C.ModelType.HistoryEvent:
                        switch (pnData.LinkedEventTypeId) {
                            case C.EventType.Viewing:
                                return C.DashboardFollowUpType.Viewing;
                            case C.EventType.Valuation:
                                return C.DashboardFollowUpType.Appraisal;
                            case C.EventType.Offer:
                                return C.DashboardFollowUpType.Offer;
                        }
                }
                break;
            //Review
            case C.FollowUpType.ContactReview:
            case C.FollowUpType.DealProgressionReview:
            case C.FollowUpType.PropertyReview:
                return C.DashboardFollowUpType.Review;

            //Offer
            case C.FollowUpType.OfferFollowUpApplicant:
            case C.FollowUpType.OfferFollowUpOwner:
                return C.DashboardFollowUpType.Offer;

            //Appraisals
            case C.FollowUpType.PostAppraisalFollowUpOwner:
            case C.FollowUpType.LostInstructionReview:
                return C.DashboardFollowUpType.Appraisal;

            //Viewing
            case C.FollowUpType.ViewingConfirmationApplicant:
            case C.FollowUpType.ViewingConfirmationOwner:
            case C.FollowUpType.ViewingFollowUpApplicant:
            case C.FollowUpType.ViewingFollowUpOwner:
            case C.FollowUpType.ViewingCancelledFollowUpOwner:
            case C.FollowUpType.ViewingCancelledFollowUpApplicant:
                return C.DashboardFollowUpType.Viewing;

            //Other
            default:
                return C.DashboardFollowUpType.Unspecified;
        }
    },

    convertToGoogleDataTable: function (data, valueFormat) {
        // Create Data Table
        var dataTable = new google.visualization.DataTable();

        var columns = data.Columns;
        var rows = data.Rows;

        var i;

        // Add columns
        for (i = 0; i < columns.length; i++) {
            dataTable.addColumn(columns[i].type, columns[i].name);
        }
        // Add rows
        for (i = 0; i < rows.length; i++) {
            if (valueFormat) {
                dataTable.addRow([
                    rows[i].label,
                    {
                        v: rows[i].value,
                        f: valueFormat.format(rows[i].value.toLocaleString())
                    }
                ]);
            } else {
                dataTable.addRow([rows[i].label, rows[i].value]);
            }
        }

        return dataTable;
    },

    drawHeadlineChart: function ($target, data) {
        // Create Data Table
        var dataTable = new google.visualization.DataTable();

        var columns = data.Columns;
        var rows = data.Rows;
        var i;

        // Add columns
        for (i = 0; i < columns.length; i++) {
            dataTable.addColumn(columns[i].type, columns[i].name);
        }

        // Add rows
        for (i = 0; i < rows.length; i++) {
            dataTable.addRow([rows[i].label, rows[i].prevValue, rows[i].value]);
        }

        var $container = $(
            [
                '<div class="chart-area databox-left"></div>',
                '<div class="databox-right bordered bordered-platinum">',
                '<span class="databox-number sky"></span>',
                '<div class="databox-text darkgray"></div>',
                '</div>'
            ].join('\n')
        );

        $target.html($container);
        var chartTarget = $target.find('.chart-area')[0];

        var chart = new google.visualization.LineChart(chartTarget);
        chart.draw(dataTable, {
            tooltip: { textStyle: { fontSize: 11 }, isHtml: true },
            animation: {
                startup: true,
                duration: 1000,
                easing: 'out'
            },
            chartArea: {
                left: 0,
                top: 0,
                width: '90%',
                height: '80%'
            },
            curveType: 'function',
            legend: 'none',
            vAxis: {
                gridlines: {
                    textPosition: 'none',
                    color: 'transparent'
                }
            },
            axisFontSize: 0,
            backgroundColor: 'transparent',
            series: {
                0: {
                    color: '#d0d0d0',
                    tooltip: false,
                    enableInteractivity: false
                },
                1: { color: '#3366CC', tooltip: true }
            }
        });
    },

    refreshDashboardStockPie: function (cachedChartData) {
        var me = this;
        var deferred = new $.Deferred();
        var $target = me.$root.find('#HomePropertyStock');

        var renderChart = function (responseData) {
            var chartData = me.convertToGoogleDataTable(responseData);
            var chart = new google.visualization.PieChart($target[0]);

            chart.draw(chartData, {
                title: 'Stock ({0} Properties)'.format(
                    responseData.Totals[0].value
                ),
                titleTextStyle: { color: '#11b1d9', fontSize: 15 },
                chartArea: { left: 0, top: 60, bottom: 10, width: '100%' },
                legend: { position: 'top' },
                pieHole: 0.5,
                is3D: false,
                backgroundColor: 'transparent',
                tooltip: {
                    isHtml: true,
                    text: 'percentage',
                    textStyle: {
                        fontName: 'Verdana',
                        fontSize: 12,
                        bold: true
                    }
                }
            });
        };

        if (cachedChartData) {
            renderChart(cachedChartData);
            return deferred.promise();
        } else {
            me.chartCache.stock = null;

            new gmgps.cloud.http("dashboard-refreshDashboardStockPie").ajax(
                {
                    args: {
                        branchId: me.branchId,
                        userId: me.userId
                    },
                    background: true,
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: '/home/GetDashboardStockPieData'
                },
                function (response) {
                    if (response.Data.Rows.length > 0) {
                        me.setNoPropertyStockPieMessage(false, $target);

                        me.chartCache.stock = response.Data;
                        renderChart(response.Data);
                    } else {
                        me.setNoPropertyStockPieMessage(true, $target);
                        me.chartCache.stock = 'nodata';
                    }

                    deferred.resolve();
                }
            );
        }

        return deferred.promise();
    },

    setNoPropertyStockPieMessage: function (displayMessage, $target) {
        if (displayMessage) {
            var message =
                '<div class="no-stock-data-to-display"><div class="outer"><div class="icon fa fa-pie-chart"></div><div class="message">No property stock data to display</div></div></div>';
            $target.html(message);
        } else {
            $target.clear();
        }
    },

    refreshDashboardSalesChart: function (cachedChartData) {
        var me = this;
        var $target = me.$root.find('#HomeSalesChart');
        var deferred = new $.Deferred();

        var renderChart = function (responseData) {
            var chartData = me.convertToGoogleDataTable(responseData, '£{0}');
            var chart = new google.visualization.ColumnChart($target[0]);

            chart.draw(chartData, {
                tooltip: {
                    isHtml: true,
                    textStyle: {
                        fontName: 'Verdana',
                        fontSize: 12,
                        bold: true
                    }
                },
                title: 'Rolling 12M Sales ({0})'.format(
                    responseData.Totals[0].value
                ),
                titleTextStyle: { color: '#11b1d9', fontSize: 16, bold: true },
                chartArea: { left: 0, top: 20, width: '100%', height: '100%' },
                bar: { groupWidth: '90%' },
                legend: { position: 'none' },
                colors: ['#5DB2FF'],
                animation: {
                    startup: true,
                    duration: 250,
                    easing: 'out'
                },
                vAxis: {
                    gridlines: {
                        textPosition: 'none',
                        color: '#a0a0a0'
                    }
                },
                backgroundColor: 'transparent'
            });
        };

        if (cachedChartData) {
            renderChart(cachedChartData);
            return deferred.promise();
        } else {
            me.chartCache.sales = null;

            new gmgps.cloud.http("dashboard-refreshDashboardSalesChart").ajax(
                {
                    args: {
                        branchId: me.branchId,
                        userId: me.userId
                    },
                    background: true,
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: '/home/GetDashboardSalesChartData'
                },
                function (response) {
                    if (response.Data.Totals[0].value === '£0') {
                        me.setNoSalesFiguresMessage(true, $target);
                        me.chartCache.sales = 'nodata';
                    } else {
                        me.setNoSalesFiguresMessage(false, $target);
                        me.chartCache.sales = response.Data;
                        renderChart(response.Data);
                    }

                    deferred.resolve();
                }
            );
        }

        return deferred.promise();
    },

    setNoSalesFiguresMessage: function (displayMessage, $target) {
        if (displayMessage) {
            var message =
                '<div class="no-sales-data-to-display"><div class="outer"><div class="icon fa fa-bar-chart"></div><div class="message">No sales data to display</div></div></div>';
            $target.clear().append(message);
        } else {
            $target.clear();
        }
    },

    refreshHeadlineBoxes: function (cachedChartData) {
        var me = this;
        var deferred = new $.Deferred();
        var period = parseInt(me.$root.find('#dashboard-stats-period').val());

        var renderCharts = function (responseData) {
            me.$root
                .find('#legend-this')
                .text(me.$root.find('#statsthis{0}'.format(period)).val());
            me.$root
                .find('#legend-last')
                .text(me.$root.find('#statslast{0}'.format(period)).val());

            $.each(responseData, function (boxType, data) {
                var $box = me.$root.find(
                    '#dashboard-stats-headlinefigures .databox[data-type="{0}"]'.format(
                        boxType
                    )
                );
                me.drawHeadlineChart($box, data);

                $box.find('.databox-text').html(data.Totals[0].label);

                var countUp = new CountUp(
                    $box.find('.databox-number')[0],
                    0,
                    data.Totals[0].value,
                    0,
                    0.7,
                    {
                        useEasing: true,
                        useGrouping: true,
                        separator: ',',
                        decimal: '.',
                        prefix: '',
                        suffix: ''
                    }
                );
                countUp.start();
            });
        };

        if (cachedChartData) {
            renderCharts(cachedChartData);
            return deferred.promise();
        } else {
            me.chartCache.headlines = null;

            new gmgps.cloud.http("dashboard-refreshHeadlineBoxes").ajax(
                {
                    args: {
                        branchId: me.branchId,
                        userId: me.userId,
                        dashboardStatsPeriod: period
                    },
                    background: true,
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: '/home/GetDashboardHeadlineBoxesData'
                },
                function (response) {
                    deferred.resolve();

                    me.$root
                        .find('#legend-this')
                        .text(
                            me.$root.find('#statsthis{0}'.format(period)).val()
                        );
                    me.$root
                        .find('#legend-last')
                        .text(
                            me.$root.find('#statslast{0}'.format(period)).val()
                        );

                    me.chartCache.headlines = response.Data;
                    renderCharts(response.Data);
                }
            );
        }

        return deferred.promise();
    },

    unselectLetterRackItems: function () {
        var me = this;
        me.setLetterRackItemsChecked(false);
        me.$root
            .find('.select-all-button-group input[type=checkbox]')
            .prop('checked', false);
    },

    setLetterRackItemsChecked: function (checked) {
        var me = this;

        me.$root
            .find(
                '#dashboard-letterrack-widget .list-container .dashboard-letterrack-listitem'
            )
            .each(function () {
                var $checkBox = $(this).find('input[type=checkbox]');
                $checkBox.prop('checked', checked);
            });
    },

    viewLetterRackItem: function (id, documentType, hasESignTag) {
        switch (documentType) {
            case C.LetterRackFilterType.Pending:
                if (hasESignTag){
                    window.location.href = '/Document/edit/'+ id;
                    return;
                }
                gmgps.cloud.helpers.docshelper.edit([id]);
                break;

            case C.LetterRackFilterType.Finalised:
                var baseUrl = '/Document/GetLetter/';
                var url = baseUrl + id;
                window.open(url, C_DOC_WINDOWNAME);
                break;
        }
    },

    processLetters: function (action, selectedLetterList) {
        var me = this;
        var x;

        // the list is going to be all of one type or the other... pending vs completed letters
        var pendingDocumentIdList = $.map(selectedLetterList, function (v) {
            return v.PendingDocumentId;
        });
        var historyEventIdList = $.map(selectedLetterList, function (v) {
            return v.HistoryEventId;
        });

        switch (action) {
            case 'cancel':
                gmgps.cloud.helpers.general.cancelDocuments(
                    pendingDocumentIdList,
                    function () {
                        me.refreshLetterRack();

                        showDialog({
                            type: 'info',
                            title: 'Letters Cancelled',
                            msg: 'The letter(s) were cancelled successfully.',
                            buttons: {
                                Close: function () {
                                    $(this).dialog('close');
                                }
                            }
                        });
                    }
                );
                break;

            case 'finalise-print':
                me.documentService.print(pendingDocumentIdList, true);
                me.refreshLetterRack();
                break;

            case 'finalise-print-email':
                me.documentService.print(pendingDocumentIdList, false);
                me.emailService.emailAndFinaliseLetters(
                    pendingDocumentIdList,
                    function () {
                        me.refreshLetterRack();
                    }
                );
                break;

            case 'finalise-email':
                me.emailService.emailAndFinaliseLetters(
                    pendingDocumentIdList,
                    function () {
                        me.refreshLetterRack();
                    }
                );
                break;

            case 'email':
                me.emailService.emailLetters(selectedLetterList, function () {
                    me.refreshLetterRack();
                });
                break;

            case 'print':
                var docUrl = '/Document/GetDocuments';

                for (x = 0; x < historyEventIdList.length; x++) {
                    docUrl +=
                        x === 0
                            ? '?ids=' + historyEventIdList[x]
                            : '&ids=' + historyEventIdList[x];
                }
                window.open(docUrl, '_blank');
                me.refreshLetterRack();
                break;
        }
    },

    getWidgetOrder: function () {
        var me = this;
        var $widgets = me.$root.find('.widgets').children();

        var order = [];

        $widgets.each(function (i, v) {
            order += $(v).data('id') + ',';
        });

        order = order.replace(/,\s*$/, '');

        return order;
    },

    getTaskSettings: function () {
        var me = this;

        var $f = me.$root.find('#dashboard-followups');

        return {
            SelectedFollowUpType: parseInt(
                $f
                    .find('.tabbable ul li.active a .list-totalrows')
                    .attr('data-dashboardfollowuptypeid')
            ),
            FollowUpsMode: parseInt($f.find('#dashboard-followups-mode').val()),
            TodoSearchOrderType: parseInt(
                $f
                    .find('#dashboard-followups-todo .dashboard-sortdir-button')
                    .data('dir')
            ),
            TodoSearchOrderBy: parseInt(
                $f
                    .find(
                        '#dashboard-followups-todo .dashboard-list-options-sortorder'
                    )
                    .val()
            ),
            TodoFollowUpStatus: $f
                .find('#dashboard-followups-todo .options option:selected')
                .map(function () {
                    return parseInt($(this).val());
                })
                .get(),
            AppraisalSearchOrderType: parseInt(
                $f
                    .find(
                        '#dashboard-followups-appraisal .dashboard-sortdir-button'
                    )
                    .data('dir')
            ),
            AppraisalSearchOrderBy: parseInt(
                $f
                    .find(
                        '#dashboard-followups-appraisal .dashboard-list-options-sortorder'
                    )
                    .val()
            ),
            AppraisalFollowUpStatus: $f
                .find('#dashboard-followups-appraisal .options option:selected')
                .map(function () {
                    return parseInt($(this).val());
                })
                .get(),
            ViewingSearchOrderType: parseInt(
                $f
                    .find(
                        '#dashboard-followups-viewing .dashboard-sortdir-button'
                    )
                    .data('dir')
            ),
            ViewingSearchOrderBy: parseInt(
                $f
                    .find(
                        '#dashboard-followups-viewing .dashboard-list-options-sortorder'
                    )
                    .val()
            ),
            ViewingFilters: $f
                .find(
                    '#dashboard-followups-viewing input[type="checkbox"]:checked'
                )
                .map(function () {
                    return parseInt($(this).attr('data-filterid'));
                })
                .get(),
            ViewingFollowUpStatus: $f
                .find('#dashboard-followups-viewing .options option:selected')
                .map(function () {
                    return parseInt($(this).val());
                })
                .get(),
            OfferSearchOrderType: parseInt(
                $f
                    .find(
                        '#dashboard-followups-offer .dashboard-sortdir-button'
                    )
                    .data('dir')
            ),
            OfferSearchOrderBy: parseInt(
                $f
                    .find(
                        '#dashboard-followups-offer .dashboard-list-options-sortorder'
                    )
                    .val()
            ),
            OfferFollowUpStatus: $f
                .find('#dashboard-followups-offer .options option:selected')
                .map(function () {
                    return parseInt($(this).val());
                })
                .get(),
            ReviewSearchOrderType: parseInt(
                $f
                    .find(
                        '#dashboard-followups-review .dashboard-sortdir-button'
                    )
                    .data('dir')
            ),
            ReviewSearchOrderBy: parseInt(
                $f
                    .find(
                        '#dashboard-followups-review .dashboard-list-options-sortorder'
                    )
                    .val()
            ),
            ReviewFilters: $f
                .find(
                    '#dashboard-followups-review input[type="checkbox"]:checked'
                )
                .map(function () {
                    return parseInt($(this).attr('data-filterid'));
                })
                .get(),
            ReviewFollowUpStatus: $f
                .find('#dashboard-followups-review .options option:selected')
                .map(function () {
                    return parseInt($(this).val());
                })
                .get()
        };
    }
};
