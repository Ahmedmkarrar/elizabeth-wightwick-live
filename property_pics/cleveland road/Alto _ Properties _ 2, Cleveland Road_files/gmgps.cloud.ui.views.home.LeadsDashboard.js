gmgps.cloud.ui.views.home.LeadsDashboard = function (args) {
    var me = this;

    me.$leadsOptions = args.$leadsOptions;
    me.$leadsOptionsMenu = args.$leadsOptionsMenu;
    me.$maOptions = args.$maOptions;
    me.$viewingEnquiryOptions = args.$viewingEnquiryOptions;
    me.$viewingEnquiryPropertyRecordTypeFilter =
        args.$viewingEnquiryPropertyRecordTypeFilter;

    this.$root = args.$root;
    this.leadSearches = [];
    this.branchId = args.branchId;
    this.userId = args.userId || shell.userId;

    this.views = [];
    this.views[C.LeadType.PortalLead] =
        new gmgps.cloud.ui.views.home.ApplicantLeadsList(args);
    this.views[C.LeadType.MarketAppraisalEnquiry] =
        new gmgps.cloud.ui.views.home.OwnerLeadsList(args);
    this.views[C.LeadType.ViewingEnquiry] =
        new gmgps.cloud.ui.views.home.ViewingEnquiryLeads(args);
    me.header = 'Enquiries';

    me.init();
};

gmgps.cloud.ui.views.home.LeadsDashboard.typeName =
    'gmgps.cloud.ui.views.home.LeadsDashboard';

gmgps.cloud.ui.views.home.LeadsDashboard.prototype = {
    init: function () {
        var me = this;

        // Prevent leads drop-down options menu from closing on click
        me.$leadsOptionsMenu.on('click', function (e) {
            e.stopPropagation();
        });

        // Leads filtering (checkboxes) > Change
        me.$leadsOptionsMenu.on('click', '.opt-outer', function (e) {
            e.stopPropagation();
            $(this).toggleClass('active');
            $(this).find('.label').toggleClass('active');
            $(this)
                .find('.fa')
                .toggleClass('fa-check')
                .toggleClass('fa-remove');

            var dateFilterSelected = $(this).attr('data-datefilter');

            if (dateFilterSelected == C.DateFilter.All) {
                if ($(this).hasClass('active')) {
                    me.$leadsOptionsMenu.find('.chosen-day').text('');
                    me.$leadsOptionsMenu.find('#leads-datepicker').val('');

                    me.$leadsOptionsMenu.find('#select-date').hide();
                }

                me.resetToggle(
                    me.$leadsOptionsMenu.find(
                        '.opt-outer[data-datefilter="{0}"]'.format(
                            C.DateFilter.Before
                        )
                    )
                );
                me.resetToggle(
                    me.$leadsOptionsMenu.find(
                        '.opt-outer[data-datefilter="{0}"]'.format(
                            C.DateFilter.After
                        )
                    )
                );
            } else if (dateFilterSelected == C.DateFilter.Before) {
                me.resetToggle(
                    me.$leadsOptionsMenu.find(
                        '.opt-outer[data-datefilter="{0}"]'.format(
                            C.DateFilter.All
                        )
                    )
                );
                me.resetToggle(
                    me.$leadsOptionsMenu.find(
                        '.opt-outer[data-datefilter="{0}"]'.format(
                            C.DateFilter.After
                        )
                    )
                );

                me.$leadsOptionsMenu.find('#select-date').show();
            } else {
                me.resetToggle(
                    me.$leadsOptionsMenu.find(
                        '.opt-outer[data-datefilter="{0}"]'.format(
                            C.DateFilter.All
                        )
                    )
                );
                me.resetToggle(
                    me.$leadsOptionsMenu.find(
                        '.opt-outer[data-datefilter="{0}"]'.format(
                            C.DateFilter.Before
                        )
                    )
                );
                me.$leadsOptionsMenu.find('#select-date').show();
            }

            var selectedToggle = me.getSelectedToggle();

            if (!selectedToggle) {
                me.$leadsOptionsMenu
                    .find(
                        '.opt-outer[data-datefilter="{0}"]'.format(
                            C.DateFilter.All
                        )
                    )
                    .trigger('click');
            }

            me.refreshAll();
        });

        me.$leadsOptionsMenu.on(
            'change',
            '#leads-duplicate-selection input:radio',
            function (e) {
                me.$leadsOptionsMenu
                    .find('#leads-duplicate-selection .coloured-radio')
                    .removeClass('active');
                $(e.target).closest('.coloured-radio').toggleClass('active');
                me.refreshAll();
            }
        );

        me.$leadsOptionsMenu.on(
            'change',
            '#leads-source-selection input:checkbox',
            function (e) {
                $(e.target)
                    .closest('.lead-source-filter')
                    .toggleClass('active');
                me.refreshAll();
            }
        );

        me.$leadsOptionsMenu.on('click', '#select-date', function (e) {
            e.stopPropagation();
            me.$leadsOptionsMenu.find('#leads-datepicker').datepicker('show');
        });

        me.$leadsOptionsMenu.find('#leads-datepicker').datepicker({
            dateFormat: 'dd M yy',
            showButtonPanel: true,
            beforeShow: function (input, inst) {
                setTimeout(function () {
                    var offsets = me.$leadsOptionsMenu
                        .find('#select-date')
                        .offset();
                    var top = offsets.top + 30;
                    var left = offsets.left;
                    inst.dpDiv.css({
                        top: top,
                        left: left
                    });

                    me.$leadsOptionsMenu.append(inst.dpDiv);
                });
            },
            onSelect: function (dateText) {
                me.setSelectedDateButton(
                    $(this).datepicker('getDate'),
                    dateText
                );

                me.refreshAll();
            },
            onClose: function (dateText, inst) {
                // return global datepicker html fragment to body tag, else it stops other datepickers working...
                me.$leadsOptionsMenu.closest('body').append(inst.dpDiv);
            }
        });

        me.$maOptions.on('change', '#PropertyTypeFilter', function () {
            me.refreshAll();
        });

        me.$viewingEnquiryPropertyRecordTypeFilter.change(function () {
            me.refreshSingleView(C.LeadType.ViewingEnquiry);
        });
    },

    resetToggle(toggleOption) {
        toggleOption.removeClass('active');
        toggleOption.find('.label').removeClass('active');
        toggleOption.find('.fa').removeClass('fa-check').addClass('fa-remove');
    },

    getSelectedToggle() {
        var me = this;
        var selectedToggle = null;
        var $checkedCheckboxes = me.$leadsOptionsMenu.find('.opt-outer');

        $checkedCheckboxes.each(function (i, v) {
            if ($(v).hasClass('active')) {
                selectedToggle = $(v).attr('data-datefilter');
            }
        });

        return selectedToggle;
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
                me.$leadsOptionsMenu.find('.chosen-day').text('Today');
                break;
            }
            case yesterday.valueOf(): {
                me.$leadsOptionsMenu.find('.chosen-day').text('Yesterday');
                break;
            }
            case tomorrow.valueOf(): {
                me.$leadsOptionsMenu.find('.chosen-day').text('Tomorrow');
                break;
            }
            default: {
                me.$leadsOptionsMenu.find('.chosen-day').text(selectedDate);
            }
        }
    },

    activate: function (forceRefreshOnNextActivation, tabName) {
        var me = this;

        if (!tabName) tabName = 'portal-leads';

        alto.router.navigationComplete('home', { section: 'enquiries', tab: tabName })
        alto.application.setTitle('Home | Enquiries | ' + tabName.toProperCase());

        var tabId = C.LeadType.PortalLead;
        switch (tabName) {
            case 'appraisals': tabId = C.LeadType.MarketAppraisalEnquiry; break;
            case 'viewings': tabId = C.LeadType.ViewingEnquiry; break;
        }

        var activations = [];
        _.each(me.views, function (view, leadType) {
            if (view) {
                me.prepViewDataForActivation(view, leadType);
                activations.push(view.activate());
            }
        });

        $.when(activations).done(function () {
            me.postViewActivationHook(tabId);
        });
    },

    prepViewDataForActivation: function (view, leadType) {
        var me = this;
        view.branchId = me.branchId;

        if (leadType === C.LeadType.PortalLead) {
            view.dateFilter = me.getSelectedToggle();
            view.beforeOrAfterDate = me.$leadsOptionsMenu
                .find('#leads-datepicker')
                .datepicker('getDate');
            view.duplicateFilter = me.$leadsOptionsMenu
                .find('input[type="radio"]:checked')
                .val();
        }

        if (leadType === C.LeadType.MarketAppraisalEnquiry) {
            view.propertyTypeFilter = me.$maOptions
                .find('#PropertyTypeFilter')
                .val();
        }

        if (leadType === C.LeadType.ViewingEnquiry) {
            view.propertyRecordType =
                me.$viewingEnquiryPropertyRecordTypeFilter.val();
        }
    },

    postViewActivationHook(activeTabId) {
        var me = this;

        me.$leadsOptions.hide();
        me.$maOptions.hide();
        me.$viewingEnquiryOptions.hide();

        me.$root
            .find('.nav-tabs li a[data-tabid="{0}"]'.format(activeTabId))
            .tab('show');

        if (activeTabId === C.LeadType.PortalLead) {
            me.$leadsOptions.show();
        } else if (activeTabId === C.LeadType.MarketAppraisalEnquiry) {
            me.$maOptions.show();
        } else if (activeTabId === C.LeadType.ViewingEnquiry) {
            me.$viewingEnquiryOptions.show();
        }
    },

    refreshSingleView: function (leadType) {
        var me = this;
        var view = me.views[leadType];

        me.showDataLoading();
        me.prepViewDataForRefresh(view, leadType);

        return $.when(view.refresh()).done(function () {
            me.hideDataLoading();
        });
    },

    refreshAll: function () {
        var me = this;

        me.showDataLoading();

        var refreshes = [];
        _.each(me.views, function (view, leadType) {
            if (view) {
                me.prepViewDataForRefresh(view, leadType);
                refreshes.push(view.refresh());
            }
        });

        return $.when(refreshes).done(function () {
            me.hideDataLoading();
        });
    },

    prepViewDataForRefresh: function (view, leadType) {
        var me = this;
        view.branchId = me.branchId;

        if (leadType === C.LeadType.PortalLead) {
            view.dateFilter = me.getSelectedToggle();
            view.beforeOrAfterDate = me.$leadsOptionsMenu
                .find('#leads-datepicker')
                .datepicker('getDate');
            view.duplicateFilter = me.$leadsOptionsMenu
                .find('#leads-duplicate-selection input[type="radio"]:checked')
                .val();
            view.sourceFilters = [];
            $.each(
                me.$leadsOptionsMenu.find(
                    '#leads-source-selection input[type="checkbox"]:checked'
                ),
                function (ix, e) {
                    var values = JSON.parse($(e).val());
                    view.sourceFilters = view.sourceFilters.concat(values);
                }
            );
        }

        if (leadType === C.LeadType.MarketAppraisalEnquiry) {
            view.propertyTypeFilter = me.$maOptions
                .find('#PropertyTypeFilter')
                .val();
        }

        if (leadType === C.LeadType.ViewingEnquiry) {
            view.propertyRecordType =
                me.$viewingEnquiryPropertyRecordTypeFilter.val();
        }
    },

    showDataLoading: function () {
        var me = this;
        me.$root
            .find('#dashboard-leads .tabbable')
            .append(
                '<div class="busybee"><div class="home-spinner"></div></div>'
            );
    },

    hideDataLoading: function () {
        var me = this;
        me.$root.find('#dashboard-leads .tabbable .busybee').remove();
    },

    pnUpdate: function (pushNotification) {
        if (pushNotification.ModelType === C.ModelType.BookingRequest) {
            this.views[
                C.LeadType.MarketAppraisalEnquiry
            ].updateFromPushNotification(pushNotification);
        }
    }
};
