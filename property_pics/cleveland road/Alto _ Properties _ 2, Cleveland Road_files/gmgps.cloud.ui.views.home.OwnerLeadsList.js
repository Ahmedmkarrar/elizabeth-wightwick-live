gmgps.cloud.ui.views.home.OwnerLeadsList = function (args, dashboard) {
    this.$root = args.$root;
    this.leadSearches = [];
    this.dashboard = dashboard;
    this.branchId = args.branchId;
    this.userId = args.userId || shell.userId;
};

gmgps.cloud.ui.views.home.OwnerLeadsList.typeName =
    'gmgps.cloud.ui.views.home.OwnerLeadsList';

gmgps.cloud.ui.views.home.OwnerLeadsList.prototype = {
    activate: function () {
        var me = this;

        me.unbindEventHandlers();

        me.$root.on(
            'click',
            '#dashboard-leads-appraisal .sortable',
            function () {
                $(this)
                    .find('.sorter')
                    .toggleClass('sort-desc')
                    .toggleClass('sort-asc');
                me.refresh();
            }
        );

        me.$root.on('change', '#DashboardMarketAppraisalUsers', function () {
            me.userId = parseInt($(this).val());
            me.setupMiniDiary(
                me.$root.find('#dashboard-leads-appraisal .mini-diary-input')
            );
        });

        me.$root.on(
            'click',
            '.booking-request',
            $.debounce(250, false, function () {
                var button = $(this);
                var id = button.attr('data-bookingrequest-id');
                var timeslotId = button.attr('data-bookingrequest-value');
                var branchId = button.attr('data-bookingrequest-branch');

                var appraisalPermission = new gmgps.cloud.Permission(
                    C.Permissions.TransactionRefs.Txn_Appraisal,
                    C.Permissions.UserAccessLevels.ReadWrite
                );
                appraisalPermission.demand();

                if (appraisalPermission.isGranted) {
                    var appraisalRequest = me.checkForAppraisalRequest(
                        id,
                        branchId,
                        timeslotId
                    );

                    var options = {
                        Id: id,
                        TimeslotId: timeslotId,
                        BranchId: branchId,
                        AppraisalRequest: appraisalRequest,
                        UserId: me.userId
                    };

                    gmgps.cloud.helpers.property.createMarketAppraisalFromBookingRequest(
                        options
                    );
                } else {
                    $.jGrowl(
                        'You do not have permission to add a new appraisal, please contact your system administrator to process this request',
                        {
                            header: 'Appraisal',
                            theme: 'growl-system',
                            life: 2000
                        }
                    );
                }
            })
        );

        me.$root.on('click', '.market-appraisal-declined', function () {
            var id = $(this).attr('data-booking-request-id');

            new gmgps.cloud.ui.controls.window({
                title: 'Email',
                windowId: 'createDeclineEmailModal',
                controller: gmgps.cloud.ui.views.email,
                url: '/Email/CreateMarketAppraisalDeclineEmail',
                post: true,
                urlArgs: {
                    bookingRequestId: id
                },
                complex: true,
                width: 800,
                draggable: true,
                modal: true,
                actionButton: 'Send',
                cancelButton: 'Cancel',
                onAction: function () {
                    return true;
                },
                onCancel: function () {
                    return false;
                },
                postActionCallback: function () {
                    me.$root
                        .find(
                            '.tablex.malead tr[data-booking-request-id="{0}"]'.format(
                                id
                            )
                        )
                        .remove();

                    var applicantLeadsList =
                        new gmgps.cloud.ui.views.home.ApplicantLeadsList({
                            $root: me.$root
                        });

                    applicantLeadsList.refreshTotal(
                        null,
                        C.LeadType.MarketAppraisalEnquiry
                    );
                }
            });
        });

        me.refresh();
    },

    setupMiniDiary: function ($target) {
        var me = this;

        $target.attr(
            'data-startDateTime',
            new Date().toString('ddd dd MMM yyyy')
        );
        $target.attr(
            'data-endDateTime',
            new Date().toString('ddd dd MMM yyyy')
        );
        $target.attr('data-userId', me.userId);
        var userName = me.$root
            .find(
                '#dashboard-leads-appraisal .dropdown.options > option:selected'
            )
            .text();
        $target.attr('data-userName', userName);

        $target.miniDiary({
            buttonOnly: true,
            useTumblers: false,
            mode: C.CalendarMode.User,
            allowCreate: false,
            allowEdit: true,
            highlightedEventIds: [0],
            onPeriodSelected: function (req, authoriseCallback) {
                //Use the period.
                authoriseCallback(true);
            },
            onEventMoved: function () {},
            ghostEvents: [],
            onControlRendered: function ($control) {
                $control.addClass('fr');
            }
        });
    },

    unbindEventHandlers() {
        var me = this;

        me.$root.off('change', '#DashboardMarketAppraisalUsers');
        me.$root.off('click', '.market-appraisal-declined');
        me.$root.off('click', '.booking-request');
    },

    checkForAppraisalRequest: function (id, branchId, timeslotId) {
        var me = this;

        var args = {
            id: id,
            branchId: branchId,
            timeslotId: timeslotId
        };

        return new gmgps.cloud.http(
            "OwnerLeadsList-checkForAppraisalRequest"
        ).ajax(
            {
                args: args,
                background: true,
                type: 'GET',
                url: 'api/1/AppointmentRequest/GetAppraisalRequest'
            },
            function (response) {
                me.AppraisalRequestData = response.Data;
            }
        );
    },

    refreshAll: function () {
        var me = this;
        return me.refresh();
    },

    refresh: function () {
        var me = this;

        var deferred = new $.Deferred();

        me.initialised = true;

        $.when(
            me.refreshLeads(
                C.LeadType.MarketAppraisalEnquiry,
                me.branchId,
                me.propertyTypeFilter
            )
        )
            .done(function () {
                deferred.resolve();
            })
            .fail(function () {});

        return deferred.promise();
    },

    refreshLeads: function (leadType, branchId, propertyTypeFilter) {
        var me = this;

        var deferred = new $.Deferred();

        var options = me.getLeadOptions(leadType);

        if (branchId !== null) {
            options.branchId = branchId;
        }

        options.propertyTypeFilter = propertyTypeFilter;

        //Cache search(es)
        me.leadSearches[leadType] = options;

        new gmgps.cloud.http("OwnerLeadsList-refreshLeads").ajax(
            {
                args: options,
                background: true,
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/Home/GetDashboardLeads'
            },
            function (response) {
                deferred.resolve();

                var $container = me.$root.find(
                    '#dashboard-leads .list-container[data-leadtypeid="{0}"]'.format(
                        leadType
                    )
                );
                var $totalRows = me.$root.find(
                    '#dashboard-leads .list-totalrows[data-leadtypeid="{0}"]'.format(
                        leadType
                    )
                );
                var $body = $container.find('.dashboard-list-body');

                var $listOptions = $container.find(
                    '.dashboard-lead-list[data-leadtypeid="{0}"] .dashboard-list-options'.format(
                        leadType
                    )
                );
                var $options = $listOptions.find('.dropdown.options');
                $options.empty();

                var message = '';
                if (
                    !response.Data.IsPropertyFileEnabledForGroup ||
                    !response.Data.IsMarketAppraisalModuleOn
                ) {
                    message =
                        'PropertyFile market appraisals enquiries not enabled for ' +
                        (me.branchId !== 0
                            ? 'the selected branch'
                            : 'any branches');
                    var formattedMessage =
                        '<div class="no-leads-data-to-display no-items-to-display"><div class="outer"><div class="icon fa fa-ban"></div><div class="message">' +
                        message +
                        '</div></div></div>';
                    $body.html(formattedMessage);
                    $totalRows
                        .addClass('nothing')
                        .html('<i class="fa fa-ban fg-dark-grey"></i>');
                    $listOptions.css('visibility', 'hidden');
                    return;
                } else if (!response.Data.IsBranchEnabledForPropertyFile) {
                    message =
                        '<div class="no-leads-data-to-display no-items-to-display"><div class="outer"><div class="icon fa fa-ban"></div><div class="message">This branch is not integrated with PropertyFile</div></div></div>';
                    $body.html(message);
                    $totalRows
                        .addClass('nothing')
                        .html('<i class="fa fa-ban fg-dark-grey"></i>');
                    $listOptions.css('visibility', 'hidden');
                    return;
                }

                $listOptions.css('visibility', 'visible');

                var users = response.Data.Users;
                $.each(users, function () {
                    $options.append(
                        $('<option></option>').val(this.Id).text(this.DisplayName)
                    );
                });

                $options.val(me.userId);
                me.setupMiniDiary(
                    $listOptions.find(
                        '.mini-diary-goes-here, .mini-diary-input'
                    )
                );

                $body[0].innerHTML = response.Data.Html;

                $totalRows
                    .removeClass('nothing')
                    .css('display', 'inline-block')
                    .removeClass('badge-info badge-danger')
                    .text(response.Data.TotalRows);

                $body.animate(
                    {
                        scrollTop: 0
                    },
                    0
                );
            }
        );

        return deferred.promise();
    },

    getLeadOptions: function (leadType) {
        var me = this;

        var options = {
            leadType: leadType
        };

        options.appointmentType = 'MarketAppraisal';
        options.branchId = me.branchId;

        options.orderedBy = 'DateAdded';
        options.ordered = me.$root
            .find('.sortable .sorter')
            .hasClass('sort-asc')
            ? 'Ascending'
            : 'Descending';

        return options;
    },

    updateFromPushNotification: function (pushNotification) {
        var me = this;

        if (pushNotification.ModelType !== C.ModelType.BookingRequest) {
            return;
        }

        var requestId = pushNotification.Data.BookingRequestId;

        me.$root
            .find(
                '.tablex.malead tr[data-booking-request-id="{0}"]'.format(
                    requestId
                )
            )
            .remove();
    }
};
