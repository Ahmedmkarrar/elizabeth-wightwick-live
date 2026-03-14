gmgps.cloud.ui.views.home.ViewingEnquiryLeads = function (args) {
    this.$root = args.$root;
    this.leadSearches = [];
    // eslint-disable-next-line no-undef
    this.dashboard = dashboard;
    this.branchId = args.branchId;
    this.propertyRecordType = args.propertyRecordType;
    this.userId = args.userId || shell.userId;
    this.numberOfLeads = null;
    this.viewingEnquiryIdsToSkipDuplicateContactCheckFor = [];

    this.orderType = C.SearchOrderType.Ascending;
    this.orderBy = C.SearchOrderBy.Created;
};

gmgps.cloud.ui.views.home.ViewingEnquiryLeads.typeName =
    'gmgps.cloud.ui.views.home.ViewingEnquiryLeads';

gmgps.cloud.ui.views.home.ViewingEnquiryLeads.prototype = {
    activate: function () {
        var me = this;

        me.unbindEventHandlers();

        me.$root.on('change', '#DashboardViewingEnquiryUsers', function () {
            me.userId = parseInt($(this).val());
            var target = me.$root.find(
                '#dashboard-leads-viewing .mini-diary-input'
            );
            me.setupMiniDiary(target);
        });

        me.$root.on(
            'click',
            '#dashboard-leads-viewing .accept-button',
            function () {
                me.sendAction('Accept', function () {
                    me.refresh();
                });
            }
        );

        me.loadEnquiries();
    },

    merge: function (viewingEnquiryId, contactId) {
        var me = this;
        var api = new gmgps.cloud.services.ViewingEnquiriesCommandApi();

        return api
            .merge(viewingEnquiryId, contactId)
            .then(function () {
                me.removeViewingEnquiryRow(viewingEnquiryId);
                showInfo(
                    'The lead has been successfully merged with the existing contact.'
                );
            })
            .catch(function (err) {
                showInfo(err.responseJSON.ExceptionMessage);
            });
    },

    sendAction: function (action, callback) {
        var me = this;

        if (action === 'Accept') {
            me.acceptContacts(me.list.ids, callback);
        }
    },

    acceptContacts: function (viewingEnquiryIds, callback) {
        var me = this;
        var api = new gmgps.cloud.services.ViewingEnquiriesCommandApi();
        var zIndex = 0;

        if (viewingEnquiryIds.length < 1) {
            showInfo(
                'No leads have been selected, please tick at least one row.'
            );
            return false;
        }

        var spinner = showSpinner();
        return api
            .accept(
                viewingEnquiryIds,
                me.userId,
                me.viewingEnquiryIdsToSkipDuplicateContactCheckFor
            )
            .then(function (response) {
                spinner = spinner.hide();
                if (response.Errors.length) {
                    showInfo(
                        'The system was unable to create the following contacts:<br/><br/><ul><li>' +
                            response.Errors.join('</li><li>') +
                            '</li></ul><br/>Please refresh the screen and try again',
                        'Contact could not be created',
                        zIndex,
                        function () {
                            me.refresh();
                        }
                    );
                } else {
                    if (
                        response.CreatedContactIds &&
                        response.CreatedContactIds[0]
                    ) {
                        callback(response.CreatedContactIds[0]);
                    }
                }
            })
            .catch(function (err) {
                spinner = spinner.hide();
                showInfo(err.responseJSON.ExceptionMessage);
            });
    },

    loadEnquiries: function () {
        var me = this;

        me.refresh();
    },

    decline: function (viewingEnquiryId) {
        var me = this;
        var api = new gmgps.cloud.services.ViewingEnquiriesCommandApi();

        return api
            .decline(viewingEnquiryId)
            .then(function () {
                me.removeViewingEnquiryRow(viewingEnquiryId);
            })
            .catch(function (err) {
                showInfo(err.responseJSON.ExceptionMessage);
            });
    },

    dismissDuplicates: function (viewingEnquiryId) {
        var me = this;

        var $mainRow = $('.tablex.viewingenquiry').find(
            'tr[data-id=' +
                viewingEnquiryId +
                ']:not(.extra-info-row, .potential-duplicate-row)'
        );
        var $extraInfoRow = $mainRow.next('tr.extra-info-row');
        var $trafficLight = $mainRow.find('.traffic-light');

        $trafficLight.removeClass('amber red');
        $trafficLight.addClass('green');
        $trafficLight.attr('title', 'New contact');

        $extraInfoRow.find('.matches-table td').addClass('line-through');
        $extraInfoRow
            .find('.dismiss-all-duplicates-button')
            .addClass('disabled');

        $mainRow.addClass('viewing-enquiry-row');
        $mainRow.find('.tickbox').removeClass('hidden');
        $mainRow
            .find('.request-viewing-btn-disabled')
            .removeClass('request-viewing-btn-disabled')
            .addClass('request-viewing-btn')
            .prop('disabled', false);

        me.bindRowHandlers();
        me.bindList(); // Reset list control to pick up checkbox changes

        me.viewingEnquiryIdsToSkipDuplicateContactCheckFor.push(
            viewingEnquiryId
        );
    },

    toggleRow: function (row) {
        var hiddenArea = $(row).next('tr.extra-info-row');
        hiddenArea.slideToggle();
        hiddenArea.scrollintoview({
            duration: 'slow',
            direction: 'y'
        });

        hiddenArea.toggleClass('hidden');
    },

    unbindEventHandlers() {
        var me = this;

        me.$root.off('change', '#DashboardViewingEnquiryUsers');
        me.$root.off('click', '#dashboard-leads-viewing .accept-button');
    },

    openDeclineWithEmailModal: function (viewingEnquiryId) {
        var me = this;

        new gmgps.cloud.ui.controls.window({
            title: 'Email',
            windowId: 'createDeclineEmailModal',
            controller: gmgps.cloud.ui.views.email,
            url: '/Email/CreateViewingEnquiryDeclineEmail',
            post: false,
            urlArgs: {
                viewingEnquiryId: viewingEnquiryId
            },
            complex: false,
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
                me.removeViewingEnquiryRow(viewingEnquiryId);
            }
        });
    },

    removeViewingEnquiryRow(viewingEnquiryId) {
        var me = this;
        me.list.editSelection(viewingEnquiryId, false);
        me.$root
            .find(
                '.tablex.viewingenquiry tr[data-id="{0}"]'.format(
                    viewingEnquiryId
                )
            )
            .remove();
        me.setNumberOfLeads(me.numberOfLeads - 1);
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
                '#dashboard-leads-viewing .dropdown.options > option:selected'
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

    setNumberOfLeads: function (numberOfLeads) {
        var me = this;

        var leadType = C.LeadType.ViewingEnquiry;
        var $totalRows = me.$root.find(
            '#dashboard-leads .list-totalrows[data-leadtypeid="{0}"]'.format(
                leadType
            )
        );

        me.numberOfLeads = numberOfLeads;
        if (me.list) {
            me.list.totalRows = numberOfLeads;
        }
        me.$root
            .find(
                '#dashboard-leads .list-container[data-leadtypeid="{0}"] .footer .total'.format(
                    leadType
                )
            )
            .text('{0} items found'.format(numberOfLeads));

        if (me.numberOfLeads == null) {
            $totalRows
                .addClass('nothing')
                .html('<i class="fa fa-ban fg-dark-grey"></i>');
        } else {
            $totalRows
                .removeClass('nothing')
                .css('display', 'inline-block')
                .removeClass('badge-info badge-danger')
                .text(me.numberOfLeads);
        }
    },

    promptToCreateContact: function (callBack) {
        showDialog({
            type: 'question',
            title: 'Accept contact',
            msg: 'Booking the selected timeslot will also accept the contact. Are you happy to proceed?',
            buttons: {
                Yes: function () {
                    $(this).dialog('close');
                    callBack(true);
                },
                No: function () {
                    $(this).dialog('close');
                    callBack(false);
                }
            }
        });
    },

    openViewingModel: function (viewingArgs) {
        var me = this;

        new gmgps.cloud.ui.controls.window({
            title: '',
            windowId: 'propertyViewingModal',
            controller: gmgps.cloud.ui.views.viewing,
            url: '/viewing/getviewingnav',
            urlArgs: {
                contextModelType: viewingArgs.contextModelType
                    ? viewingArgs.contextModelType
                    : C.ModelType.Unknown,
                viewingId: 0,
                propertyId: viewingArgs.propertyId ? viewingArgs.propertyId : 0,
                contactId: viewingArgs.contactId ? viewingArgs.contactId : 0,
                viewingEnquiryId: viewingArgs.viewingEnquiryId
                    ? viewingArgs.viewingEnquiryId
                    : null,
                IsForNewContact: viewingArgs.isForNewContact
                    ? viewingArgs.isForNewContact
                    : false,
                negotiatorId: viewingArgs.negotiatorId
                    ? viewingArgs.negotiatorId
                    : shell.userId,
                start: viewingArgs.start
                    ? viewingArgs.start.toString('dd MMM yyyy HH:mm')
                    : null,
                end: viewingArgs.end
                    ? viewingArgs.end.toString('dd MMM yyyy HH:mm')
                    : null
            },
            post: true,
            complex: true,
            width: 1080,
            nopadding: true,
            draggable: true,
            modal: true,
            controllerCanPreventCancel: true,
            sourceZIndex: 0,
            actionButton: 'Save Viewing',
            cancelButton: 'Close',
            onAction: function () {
                return true;
            },
            onCancel: function () {
                return false;
            },
            postActionCallback: function () {
                me.refresh();
            },
            postCancelCallback: function () {
                me.refresh();
            }
        });
    },

    bindRowHandlers: function () {
        var me = this;

        me.$root
            .find('.tablex.viewingenquiry tr td .sublist-row-opener')
            .off('click')
            .click(function () {
                var closestRow = $(this).closest('tr');
                me.toggleRow(closestRow);
            });

        me.$root
            .find('.viewing-enquiry-declined')
            .off('click')
            .click(function () {
                var parentTr = $(this).closest('tr');
                var viewingEnquiryId = parentTr.attr('data-id');

                showDialog({
                    type: 'question',
                    title: 'Decline Viewing Enquiry',
                    msg: 'Are you sure you want to decline this viewing enquiry?',
                    buttons: {
                        Yes: function () {
                            var $this = $(this);
                            me.decline(viewingEnquiryId);
                            $this.dialog('close');
                        },
                        No: function () {
                            $(this).dialog('close');
                        }
                    }
                });
            });

        me.$root
            .find('.viewing-enquiry-declined-with-email')
            .off('click')
            .click(function () {
                var parentTr = $(this).closest('tr');
                var viewingEnquiryId = parentTr.attr('data-id');

                me.openDeclineWithEmailModal(viewingEnquiryId);
            });

        me.$root
            .find('.request-viewing-btn')
            .off('click')
            .click(function () {
                var viewingArgs = {};
                viewingArgs.negotiatorId = me.userId;

                var timeSlot = $(this).attr('data-viewing-request-start');
                var durationField = me.$root.find('#DefaultViewingDuration');

                if (timeSlot && durationField) {
                    var duration = durationField.val();
                    var startTime = moment(
                        timeSlot,
                        'DD-MM-YYYY hh:mm:ss'
                    ).toDate();
                    var endTime = moment(startTime).add(duration, 'm').toDate();

                    viewingArgs.start = startTime;
                    viewingArgs.end = endTime;
                }

                var parentTr = $(this).closest('tr');
                if (parentTr) {
                    viewingArgs.propertyId = parentTr.attr('data-property-id');
                    viewingArgs.contactId =
                        parentTr.attr('data-contact-id') === ''
                            ? 0
                            : parentTr.attr('data-contact-id');
                    viewingArgs.viewingEnquiryId = parentTr.attr('data-id');
                }

                if (viewingArgs.contactId === 0) {
                    me.promptToCreateContact(function (canCreateContact) {
                        if (
                            canCreateContact &&
                            viewingArgs.viewingEnquiryId > 0
                        ) {
                            me.acceptContacts(
                                [viewingArgs.viewingEnquiryId],
                                function (contactId) {
                                    viewingArgs.isForNewContact = true;
                                    viewingArgs.contactId = contactId;
                                    me.openViewingModel(viewingArgs);
                                }
                            );
                        }
                    });
                } else {
                    me.openViewingModel(viewingArgs);
                }
            });

        me.$root
            .find('.tablex.viewingenquiry .merge-lead')
            .off('click')
            .click(function () {
                var $parentTr = $(this).closest('tr');

                var viewingEnquiryId = $parentTr.attr('data-id');
                var contactId = $parentTr.attr('data-duplicatecontact-id');
                me.merge(viewingEnquiryId, contactId);
            });

        me.$root
            .find('.tablex.viewingenquiry .dismiss-all-duplicates-button')
            .off('click')
            .click(function () {
                var viewingEnquiryId = $(this).attr('data-id');
                me.dismissDuplicates(viewingEnquiryId);
            });
    },

    refresh: function () {
        var me = this;

        var leadType = C.LeadType.ViewingEnquiry;

        var options = {
            leadType: leadType,
            propertyRecordType: me.propertyRecordType,
            branchId: me.branchId,
            SearchOrder: {
                By: me.orderBy,
                Type: me.orderType
            }
        };

        new gmgps.cloud.http("ViewingEnquiryLeads-refresh").ajax(
            {
                args: options,
                background: true,
                complex: true,
                dataType: 'json',
                type: 'get',
                url: '/ViewingEnquiries/GetViewingEnquiries'
            },
            function (response) {
                var $container = me.$root.find(
                    '#dashboard-leads .list-container[data-leadtypeid="{0}"]'.format(
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
                    !response.Data.PropertyFileIsEnabledForTheGroup ||
                    !response.Data.ViewingModuleIsOn
                ) {
                    message =
                        'The PropertyFile Request Viewings Online module is not enabled for ' +
                        (me.branchId !== 0
                            ? 'the selected branch'
                            : 'any branches');
                    var formattedMessage =
                        '<div class="no-leads-data-to-display no-items-to-display"><div class="outer"><div class="icon fa fa-ban"></div><div class="message">' +
                        message +
                        '</div></div></div>';
                    $body.html(formattedMessage);
                    me.setNumberOfLeads(null);
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

                me.bindList();
                me.bindRowHandlers();
                me.setNumberOfLeads(response.Data.TotalRows);
                me.viewingEnquiryIdsToSkipDuplicateContactCheckFor = [];
            }
        );

        return;
    },

    _onPageRequest: function (args) {
        var me = this;
        me.orderBy = args.SearchOrder.By;
        me.orderType = args.SearchOrder.Type;
        me.refresh();
    },

    bindList: function () {
        var me = this;
        var $body = me.$root.find(
            '#dashboard-leads .list-container[data-leadtypeid="{0}"] .dashboard-list-body'.format(
                C.LeadType.ViewingEnquiry
            )
        );

        me.list = new gmgps.cloud.ui.controls.list({
            $root: $body,
            ids: [],
            disablePaging: true,
            disableSelectAll: true,
            selectedItemName: 'ViewingEnquiry',
            selectedItemPluralName: 'ViewingEnquiries',
            rowSelector: '.viewing-enquiry-row'
        });

        me.list.onPageRequest.handle(function (args) {
            me._onPageRequest(args);
        });
    }
};
