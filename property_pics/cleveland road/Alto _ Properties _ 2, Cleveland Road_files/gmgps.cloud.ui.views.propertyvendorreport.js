gmgps.cloud.ui.views.propertyvendorreport = function (args) {
    var me = this;
    me.cfg = args;
    me.$root = args.$root;
    me.$window = null;
    me.init(args);
    me.closeMyWindow = args.closeMyWindow;

    return true;
};

gmgps.cloud.ui.views.propertyvendorreport.prototype = {
    init: function () {
        var me = this;

        me.$window = me.$root.closest('.window');

        me.$root.find('select').customSelect();

        me.$root.on('change', '#due-tab .all-properties', function () {
            var checked = $(this).prop('checked') === true;

            me.$root
                .find('#due-tab .all-property .tickbox-hidden[data-sold="1"]')
                .prop('checked', !checked)
                .trigger('prog-change');

            if (!checked) {
                me.$root
                    .find('#due-tab #due-sold-check')
                    .prop('checked', checked)
                    .trigger('prog-change');
                me.$root
                    .find('#due-tab #due-instructed-check')
                    .prop('checked', checked)
                    .trigger('prog-change');
            }
        });

        me.$root.on('change', '#adhoc-tab .all-properties', function () {
            var checked = $(this).prop('checked') === true;

            me.$root
                .find('#adhoc-tab .all-property .tickbox-hidden[data-sold="1"]')
                .prop('checked', !checked)
                .trigger('prog-change');

            if (!checked) {
                me.$root
                    .find('#adhoc-tab #adhoc-sold-check')
                    .prop('checked', checked)
                    .trigger('prog-change');
                me.$root
                    .find('#adhoc-tab #adhoc-instructed-check')
                    .prop('checked', checked)
                    .trigger('prog-change');
            }
        });

        me.$root.on('change', '#due-tab #due-sold-check', function () {
            var checked = $(this).prop('checked') === true;

            me.$root
                .find('#due-tab .all-property .tickbox-hidden[data-sold="1"]')
                .prop('checked', !checked)
                .trigger('prog-change');

            me.countSelectedOfTotal(C.ActivityReportType.Due);
        });

        me.$root.on('change', '#due-tab #due-instructed-check', function () {
            var checked = $(this).prop('checked') === true;

            me.$root
                .find(
                    '#due-tab .all-property .tickbox-hidden[data-instructed="1"]'
                )
                .prop('checked', !checked)
                .trigger('prog-change');

            me.countSelectedOfTotal(C.ActivityReportType.Due);
        });

        me.$root.on('change', '.select-ticks', function () {
            me.toggleChecked($(this));
        });

        me.$root.on('change', '.tick-count', function () {
            me.countSelectedOfTotal(
                parseInt($(this).closest('.all-property').attr('data-listtype'))
            );
        });

        me.$root.on('change', '#adhoc-tab #adhoc-sold-check', function () {
            var checked = $(this).prop('checked') === true;

            me.$root
                .find('#adhoc-tab .all-property .tickbox-hidden[data-sold="1"]')
                .prop('checked', !checked)
                .trigger('prog-change');
            me.countSelectedOfTotal(C.ActivityReportType.Adhoc);
        });

        me.$root.on(
            'change',
            '#adhoc-tab #adhoc-instructed-check',
            function () {
                var checked = $(this).prop('checked') === true;

                me.$root
                    .find(
                        '#adhoc-tab .all-property .tickbox-hidden[data-instructed="1"]'
                    )
                    .prop('checked', !checked)
                    .trigger('prog-change');

                me.countSelectedOfTotal(C.ActivityReportType.Due);
            }
        );

        me.$root.on('change', '#due-tab #all-vendors-check', function () {
            if ($(this).prop('checked') == true) {
                me.$root.find('#due-tab .other-vendor-list').slideDown();
                me.resizeForm();
            } else {
                me.$root.find('#due-tab .other-vendor-list').slideUp();
                me.resizeForm();
            }
        });

        me.$root.on('change', '#adhoc-tab #all-vendors-check', function () {
            if ($(this).prop('checked') == true) {
                me.$root.find('#adhoc-tab .other-vendor-list').slideDown();
            } else {
                me.$root.find('#adhoc-tab .other-vendor-list').slideUp();
            }

            me.resizeForm();
        });

        me.$root.on('change', '.branch-selector', function () {
            var reportType = parseInt($(this).attr('data-reportType'));

            new gmgps.cloud.http("propertyvendorreport-init").ajax(
                {
                    args: {
                        branchId: $(this).val(),
                        reportType: reportType
                    },
                    dataType: 'json',
                    complex: true,
                    type: 'post',
                    url: 'Property/UpdateVendorReportPropertyList'
                },
                function (response) {
                    if (response && response.Data) {
                        var $html = $(response.Data);

                        var tab =
                            reportType === C.ActivityReportType.Due
                                ? '#due-tab'
                                : '#adhoc-tab';

                        var propertyCount = parseInt(
                            $html.attr('data-propertycount')
                        );

                        me.$root
                            .find(tab + ' .all-property')
                            .clear()
                            .html($html);
                        me.$root
                            .find(tab + ' .sold-check')
                            .prop('checked', false)
                            .trigger('prog-change');
                        me.$root
                            .find(tab + ' .exclude-instructed')
                            .prop('checked', false)
                            .trigger('prog-change');

                        me.setSelectedOfTotalCount(
                            reportType,
                            propertyCount,
                            propertyCount
                        );
                    }
                }
            );
        });

        me.$root.on('change', '#due-tab .due-report-selector', function () {
            var selected = parseInt($(this).val());
            var $tab = me.$root.find('#due-tab');

            if (selected === 2) {
                $tab.find('.all-property').slideDown();
                $tab.find('.exclude-sold-instructed').show();
                $tab.find('.vendor-list').slideUp();
                $tab.find('.all-vendors-check-container').hide();
            } else if (selected === 1) {
                $tab.find('.all-property').slideUp();
                $tab.find('.exclude-sold-instructed').hide();
                $tab.find('.vendor-list').slideDown();
                $tab.find('.all-vendors-check-container').show();
            }

            me.resizeForm();
        });

        me.$root.on('change', '#adhoc-tab .adhoc-report-selector', function () {
            var selected = parseInt($(this).val());
            var $tab = me.$root.find('#adhoc-tab');

            if (selected === 2) {
                $tab.find('.all-property').slideDown();
                $tab.find('.exclude-sold-instructed').show();
                $tab.find('.vendor-list').slideUp();
                $tab.find('.all-vendors-check-container').hide();
            } else if (selected === 1) {
                $tab.find('.all-property').slideUp();
                $tab.find('.exclude-sold-instructed').hide();
                $tab.find('.vendor-list').slideDown();
                $tab.find('.all-vendors-check-container').show();
            }

            me.resizeForm();
        });

        me.$root.find('.report-tabs').tabs({
            heightStyle: 'content',
            activate: function (event, ui) {
                me.resizeForm(ui.newPanel);
            }
        });

        me.$root.find('.date-picker').each(function (i, v) {
            $(v).datepicker({
                numberOfMonths: 2,
                showButtonPanel: true,
                dateFormat: 'dd/mm/yy'
            });
        });

        if (me.$root.find('.not-due').length) {
            me.$root
                .find('.vendor-report-form.vendor-report-property')
                .height('515px');
        }

        me.$window
            .find('.bottom .buttons')
            .prepend(
                '<div class="btn bgg-green preview-report" style="min-width: 100px; float: left;">Preview Report</div>'
            );

        me.$window.on('click', '.preview-report', function () {
            if (me.validate() === false) {
                return;
            }

            var args = me.getFieldValues();

            new gmgps.cloud.ui.views.previewvendorreport().show(args);
        });
    },

    resizeForm: function (newPanel) {
        var me = this;

        var tab = newPanel;

        if (!newPanel) {
            tab = me.$root.find("div.ui-tabs-panel[aria-hidden='false']");
        }

        if (tab.find('input[type="radio"]:checked').val() == 1) {
            me.$root
                .find('.vendor-report-form.vendor-report-property')
                .animate({ height: '400px' }, 500);
        } else {
            me.$root
                .find('.vendor-report-form.vendor-report-property')
                .animate({ height: '555px' }, 500);
        }
    },

    validate: function () {
        var me = this;
        var $tab = me.$root.find('.report-tabs');
        var tabIndex = $tab.tabs('option', 'active');
        var $root = $tab.find('.ui-tabs-panel').eq(tabIndex);

        var selection = parseInt(
            $root.find('input[type="radio"]:checked').val()
        );

        switch (tabIndex) {
            case 0: // first tab
                switch (
                    selection // single property or all properties
                ) {
                    case 1:
                        break;

                    case 2: // all props
                        if (
                            $root.find('.all-property .tickbox-hidden:checked')
                                .length == 0
                        ) {
                            showInfo('Please select at least one property');
                            return false;
                        }

                        break;
                }

                break;

            case 1: // second tab
                var fromDate = $root.find('#adhoc-fromdate').val();
                var toDate = $root.find('#adhoc-todate').val();

                if (fromDate.length == 0) {
                    showInfo('Please supply a From Date for the report');
                    return false;
                }

                if (toDate.length == 0) {
                    showInfo('Please supply a To Date for the report');
                    return false;
                }

                switch (
                    selection // single property or all properties
                ) {
                    case 1: // single prop
                        break;
                    case 2: // all props
                        if (
                            $root.find('.all-property .tickbox-hidden:checked')
                                .length == 0
                        ) {
                            showInfo('Please select at least one property');
                            return false;
                        }
                        break;
                }

                break;
        }

        return true;
    },

    getFieldValues: function () {
        var me = this;
        var fromDate = '';
        var toDate = '';

        var excludeMarketing = false;
        var excludeTelephoneCalls = false;

        var ids = [];

        var $tab = me.$root.find('.report-tabs');
        var tabIndex = $tab.tabs('option', 'active');

        var activityReportType =
            tabIndex === 0
                ? C.ActivityReportType.Due
                : C.ActivityReportType.Adhoc;

        var $root = $tab.find('.ui-tabs-panel').eq(tabIndex);

        var selection = parseInt(
            $root.find('input[type="radio"]:checked').val()
        );
        var brandId = parseInt($root.find('#BrandId').val());
        var branchId = parseInt($root.find('#BranchId').val());
        var templateId = parseInt(
            $root.find('#DefaultStationeryTemplateId').val()
        );
        var includeAllVendors =
            $root.find('#all-vendors-check').length !== 0
                ? $root.find('#all-vendors-check').prop('checked')
                : false;

        switch (tabIndex) {
            case 0: // due reports tab
                switch (
                    selection // single property or all properties
                ) {
                    case 1: // single prop
                        ids.push({
                            id: parseInt(
                                $root
                                    .find('input[type="radio"]:checked')
                                    .attr('data-propertyId')
                            ),
                            email: parseInt(
                                $root
                                    .find('input[type="radio"]:checked')
                                    .attr('data-email')
                            )
                        });
                        break;
                    case 2: // all props
                        $root
                            .find('.all-property .tickbox-hidden:checked')
                            .each(function (i, v) {
                                var propertyId = parseInt(
                                    $(v).attr('data-propertyId')
                                );
                                if (!isNaN(propertyId)) {
                                    ids.push({
                                        id: propertyId,
                                        email: parseInt($(v).attr('data-email'))
                                    });
                                }
                            });

                        break;
                }

                excludeMarketing = $root
                    .find('.exclude-marketing #ExcludeMarketingEventsDue')
                    .prop('checked');
                excludeTelephoneCalls = $root
                    .find('.exclude-marketing #ExcludeTelephoneCallsDue')
                    .prop('checked');
                break;

            case 1: // adhoc reports tab
                fromDate = $root.find('#adhoc-fromdate').val();
                toDate = $root.find('#adhoc-todate').val();

                switch (
                    selection // single property or all properties
                ) {
                    case 1: // single prop
                        ids.push({
                            id: parseInt(
                                $root
                                    .find('input[type="radio"]:checked')
                                    .attr('data-propertyId')
                            ),
                            email: parseInt(
                                $root
                                    .find('input[type="radio"]:checked')
                                    .attr('data-email')
                            )
                        });
                        break;
                    case 2: // all props
                        $root
                            .find('.all-property .tickbox-hidden:checked')
                            .each(function (i, v) {
                                var propertyId = parseInt(
                                    $(v).attr('data-propertyId')
                                );
                                if (!isNaN(propertyId)) {
                                    ids.push({
                                        id: propertyId,
                                        email: parseInt($(v).attr('data-email'))
                                    });
                                }
                            });

                        break;
                }

                excludeMarketing = $root
                    .find('.exclude-marketing #ExcludeMarketingEventsAdhoc')
                    .prop('checked');
                excludeTelephoneCalls = $root
                    .find('.exclude-marketing #ExcludeTelephoneCallsAdhoc')
                    .prop('checked');
                break;
        }

        var emailIds = [];
        var printIds = [];
        var propertyIds = [];

        $(ids).each(function (i, v) {
            propertyIds.push(v.id);
            if (v.email) {
                emailIds.push(v.id);
            } else {
                printIds.push(v.id);
            }
        });

        return {
            SelectedProperties: propertyIds,
            SelectedPropertiesToPrint: printIds,
            SelectedPropertiesToEmail: emailIds,
            ActivityReportType: activityReportType,
            SelectedBrandId: brandId,
            SelectedBranchId: branchId,
            SelectedStationeryTemplateId: templateId,
            StartDate: fromDate,
            EndDate: toDate,
            ExcludeMarketingEvents: excludeMarketing,
            ExcludeTelephoneCalls: excludeTelephoneCalls,
            IncludeAllVendors: includeAllVendors
        };
    },

    action: function (onActionComplete) {
        var me = this;

        if (me.validate() === false) {
            return false;
        }

        var onComplete = function () {
            me.$window
                .find('.bottom .buttons .action-button')
                .removeClass('disabled');
            if (onActionComplete) onActionComplete();
        };

        me.$window.find('.bottom .buttons .action-button').addClass('disabled');

        var $tab = me.$root.find('.report-tabs');
        var tabIndex = $tab.tabs('option', 'active');
        var $root = $tab.find('.ui-tabs-panel').eq(tabIndex);

        var args = me.getFieldValues();

        var outputType = parseInt($root.find('#OutputType').val());

        // do an ajax call for email sending. Post to a new window for print processing (so PDF stream can be returned)
        switch (outputType) {
            case 1: // Try and email first, Print the rest
                if (args.SelectedProperties.length > 1) {
                    me.batchProcess(args, onComplete);
                } else {
                    me.emailThenPrintReports(args, onComplete);
                }
                break;

            case 2: // Print all
                args.SelectedPropertiesToPrint =
                    args.SelectedPropertiesToPrint.concat(
                        args.SelectedPropertiesToEmail
                    );
                args.SelectedPropertiesToEmail = [];

                if (args.SelectedPropertiesToPrint.length > 1) {
                    me.batchProcess(args, onComplete);
                } else {
                    me.printReports(args, onComplete);
                }

                break;
        }
    },

    emailThenPrintReports: function (args, onComplete) {
        var me = this;

        if (args.SelectedPropertiesToEmail.length > 0) {
            new gmgps.cloud.http(
                "propertyvendorreport-emailThenPrintReports"
            ).ajax(
                {
                    args: args,
                    dataType: 'json',
                    complex: true,
                    type: 'post',
                    url: 'VendorReport/Email'
                },
                function () {
                    $.jGrowl('Periodic Activity Reports', {
                        header:
                            args.SelectedPropertiesToEmail.length +
                            ' Message(s) Queued For Delivery',
                        theme: 'growl-updater growl-system',
                        life: 2000
                    });

                    if (args.SelectedPropertiesToPrint.length > 0) {
                        me.printReports(args, onComplete);
                    } else {
                        if (onComplete) onComplete();
                    }
                }
            );
        } else {
            // nothing to email, print the rest

            me.printReports(args, onComplete);
        }
    },

    printReports: function (args, onComplete) {
        var $form = gmgps.cloud.utility.buildForm('VendorReport/Print', args);

        $form.submit();
        $form.remove();

        if (onComplete) {
            onComplete();
        }
    },

    cancel: function (onComplete) {
        onComplete();
    },

    batchProcess: function (args, onComplete) {
        new gmgps.cloud.http("propertyvendorreport-batchProcess").ajax(
            {
                args: args,
                dataType: 'json',
                complex: true,
                type: 'post',
                url: 'VendorReport/Batch'
            },
            function (response) {
                if (response && response.Data) {
                    $.jGrowl('Periodic Activity Reports', {
                        header: 'Periodic Activity Report generation request submitted',
                        theme: 'growl-updater growl-system',
                        life: 2000
                    });

                    if (onComplete) onComplete();
                } else {
                    $.jGrowl('Periodic Activity Reports Error', {
                        header: 'Failed to submit Periodic Activity Report generation request!',
                        theme: 'growl-updater growl-system',
                        life: 2000
                    });
                }
            }
        );
    },

    toggleChecked: function ($toggle) {
        var $container = $toggle.closest('.props-container');

        $container
            .find('input[type="checkbox"]')
            .not($toggle)
            .prop('checked', $toggle.prop('checked'))
            .trigger('change');
    },

    countSelectedOfTotal: function (listType) {
        var me = this;

        var tab =
            listType === C.ActivityReportType.Due ? '#due-tab' : '#adhoc-tab';

        var $checkList = me.$root.find(
            tab + ' .props-container input[type="checkbox"][data-propertyid]'
        );

        me.setSelectedOfTotalCount(
            listType,
            $checkList.filter(':checked').length,
            $checkList.length
        );
    },

    setSelectedOfTotalCount: function (reportType, selectedCount, totalCount) {
        var me = this;

        var tab =
            reportType === C.ActivityReportType.Due ? '#due-tab' : '#adhoc-tab';

        me.$root
            .find(tab + ' .all-proplabel-count')
            .text('({0}/{1})'.format(selectedCount, totalCount));
    }
};
