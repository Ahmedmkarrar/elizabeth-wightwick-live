gmgps.cloud.ui.views.reporting = function (args) {
    var me = this;
    me.cfg = args;
    me.$root = args.$root;
    me.$toolbar = $('#toolbar .group[data-group="reporting"]');

    me.onToolbarSetContext = new gmgps.cloud.common.event();
    me.configPanelInitialised = false;
    me.init(args);
    me.filterSections = null;

    return this;
};

gmgps.cloud.ui.views.reporting.prototype = {
    init: function () {
        var me = this;

        me.initControls();
        me.initHandlers();

        //Click the server-applied selection (one-time operation)
        setTimeout(function () {
            me.panel.selectDefaultItem();
        }, 100);
    },

    initHandlers: function () {
        var me = this;

        me.panel.onPanelItemClicked.handle(function ($item) {
            me._panelItemClicked($item);
        });

        me.$toolbar.on('click', '#report-requests-button', function () {
            if ($(this).hasClass('dropped')) {
                $(this).removeClass('dropped');
            } else {
                me.getListOfRecentReports();
                googleAnalytics.sendEvent(
                    'navbar_tools',
                    'button_click',
                    'pending_reports'
                );
            }
        });

        me.$root.on('click', '#contactSupport', function () {
            alto.zendeskGateway.activate();
        });

        // Click outside the modal to close it
        me.$root.on('click', '#add-column-modal', function (event) {
            if (event.target !== event.currentTarget) return;

            me.$root.find('#add-column-modal').hide();
        });

        // Show the Add Column modal
        me.$root.on('click', '.add-column-button', function () {
            var saveButton = me.$root.find('.modal-save');
            var addColumnChecklist = me.$root.find(
                '.checklist.add-column-checklist'
            );

            saveButton.addClass('disabled');
            saveButton.attr('disabled', 'disabled');
            addColumnChecklist
                .find('input[type="checkbox"]')
                .removeAttr('checked');
            addColumnChecklist.find('.tickbox').removeClass('ticked');
            me.$root.find('#add-column-modal').show();

            var reportName = me.$root.find('.report-config .name').text();
            var timestamp = new Date()
                .toISOString()
                .slice(0, 19)
                .replace('T', ' ');
            googleAnalytics.sendEvent(
                'reporting',
                'button_click_add_column',
                reportName + ': ' + timestamp
            );
        });

        // Close the Add Column Modal
        me.$root.on('click', '.modal-close', function () {
            me.$root.find('#add-column-modal').hide();
        });

        // Toggle the Save Add Column button
        me.$root.on(
            'change',
            '.checklist.add-column-checklist .item input[type="checkbox"]',
            function () {
                var checked = $(this)
                    .closest('.checklist')
                    .find('input[type="checkbox"]:checked').length;
                var saveButton = me.$root.find('.modal-save');

                // eslint-disable-next-line no-extra-boolean-cast
                if (!!checked) {
                    saveButton.removeClass('disabled');
                    saveButton.removeAttr('disabled');
                } else {
                    saveButton.addClass('disabled');
                    saveButton.attr('disabled', 'disabled');
                }
            }
        );

        // Adding the new column from the modal
        me.$root.on('click', '.modal-save', function () {
            var addColumnChecklist = me.$root.find(
                '.checklist.add-column-checklist'
            );
            var $checkboxes = addColumnChecklist.find(
                'input[type="checkbox"]:checked'
            );
            var $colsChecklist = me.$root.find(
                '.checklist[data-type="columns"]'
            );
            var $cols = $colsChecklist.find('.body');

            $checkboxes.each(function () {
                var $item = $(this).closest('.item');
                var $r = $item.clone();
                $cols.append($r);
                addColumnChecklist.find($item).remove();
            });

            me.$root.find('#add-column-modal').fadeOut();

            // Fade in the confimation modal and scroll the checklist to the bottom
            var delayAmount = 2000;
            me.$root
                .find('#add-column-confirmation')
                .fadeIn()
                .delay(delayAmount)
                .fadeOut();
            $cols
                .delay(delayAmount)
                .animate({ scrollTop: $cols[0].scrollHeight }, 1000);
            setTimeout(function () {
                me.setDirty(true);
            }, delayAmount);

            var columnLength = $cols.children().length;
            var checkedColumnLength = $colsChecklist.find(
                'input[type="checkbox"]:checked'
            ).length;
            me.$root
                .find('.cols-header .insight')
                .text(checkedColumnLength + ' of ' + columnLength);

            if (
                !me.$root
                    .find('.checklist[data-type="addcolumns"] .content')
                    .children().length
            ) {
                me.$root.find('.report-config .add-column-container').hide();
            }
        });

        //Checklist counter
        me.$root.on(
            'change',
            '.checklist .item input[type="checkbox"]',
            function () {
                var total = $(this).closest('.checklist').find('.item').length;
                var checked = $(this)
                    .closest('.checklist')
                    .find('input[type="checkbox"]:checked').length;
                var $e = $(this)
                    .closest('.ui-accordion-content')
                    .prev()
                    .find('.insight');
                $e.text(checked + ' of ' + total);
            }
        );

        me.$root.find('.ui-accordion-header .insight').each(function (i, elem) {
            var selectAllButton = new gmgps.ui.cloud.controls.SelectAllButton(
                $(elem)
            );
            selectAllButton.bind();
        });

        me.$root.on('click', '.ui-accordion-header .insight', function (e) {
            e.stopPropagation();

            var total = 0;

            var $target = $(this).closest('.users-header[data-type="users"]');
            var $includeUsersWithoutBranchPermissions = me.$root.find(
                '#IncludeUsersWithoutBranchPermissionsId'
            );
            var $includeInactiveUsersId = me.$root.find(
                '#IncludeInactiveUsersId'
            );
            var $includeNonChargeableUsersId = me.$root.find(
                '#IncludeNonChargeableUsersId'
            );
            var $includeBackgroundUsersId = me.$root.find(
                '#IncludeBackgroundUsersId'
            );

            const isIncludeUsersWithoutBranchPermissionsChecked =
                $includeUsersWithoutBranchPermissions.length > 0 &&
                $includeUsersWithoutBranchPermissions[0].checked == true;
            const isIncludeInactiveUsersIdChecked =
                $includeInactiveUsersId.length > 0 &&
                $includeInactiveUsersId[0].checked == true;
            const isIncludeNonChargeableUsersIdChecked =
                $includeNonChargeableUsersId.length > 0 &&
                $includeNonChargeableUsersId[0].checked == true;
            const isIncludeBackgroundUsersChecked =
                $includeBackgroundUsersId.length > 0 &&
                $includeBackgroundUsersId[0].checked == true;

            if (
                $target.length > 0 &&
                (isIncludeUsersWithoutBranchPermissionsChecked ||
                    isIncludeInactiveUsersIdChecked ||
                    isIncludeNonChargeableUsersIdChecked ||
                    isIncludeBackgroundUsersChecked)
            ) {
                // do the count
                total = me.$root
                    .find('.checklist[data-type="users"]')
                    .find('.item').length;
            }

            me.setDirty(false);
            var selectAllBehaviour =
                new gmgps.cloud.ui.behaviours.SelectAllBehaviour();
            selectAllBehaviour.apply($(this), total);
        });

        //Accordion
        me.$root.on('click', '.accordion .ui-accordion-header', function (e) {
            e.preventDefault();
            var header = $(this);

            var headerTitle = header
                .text()
                .trim()
                .replace(/\d+ of \d+/, '');
            var reportName = me.$root.find('.name.fg-reporting').text();
            var icon = header.find('.ui-accordion-header-icon');
            var content = header.next('.ui-accordion-content');
            var isOpen = content.is(':visible');
            var accordionAction = '';

            if (isOpen) {
                content.slideUp();
                icon.removeClass('ui-icon-triangle-1-s');
                accordionAction = 'Close';
            } else {
                content.slideDown();
                icon.addClass('ui-icon-triangle-1-s');
                accordionAction = 'Open';
            }

            googleAnalytics.sendEvent(
                'reporting',
                'button_click_report_accordion',
                reportName + ': ' + headerTitle + ' - ' + accordionAction
            );
            return false;
        });

        //Custom Report > Tool > Click
        me.$root.on('click', '.report-list .item .tool', function () {
            var toolName = $(this).attr('data-id');
            var $row = $(this).closest('.config-row');
            var id = parseInt($row.attr('data-recordId'));

            switch (toolName) {
                case 'rename':
                    var currentName = $row.find('.use-config-link').text();
                    me.renameReportConfiguration(
                        $row,
                        id,
                        currentName,
                        function () {
                            $(this)
                                .closest('.report-item')
                                .trigger('prog-click');
                        }
                    );
                    break;
                case 'delete':
                    me.deleteReportConfiguration(id, function () {
                        var category = me.$root
                            .find('.list .item.on')
                            .data('unique-id');
                        var report = $row
                            .closest('.item')
                            .attr('data-reportname');
                        alto.router.goto('reporting', { category, report });
                        $row.remove();
                    });
                    break;
            }
        });

        //Report List: Item Header > Click
        me.$root.on('prog-click', '.report-list .item .header', function () {
            me.disableControlsToSetDirtyFlag();

            var $item = $(this).closest('.item');
            var cfg = $.parseJSON($item.attr('data-config'));
            var id = parseInt($item.attr('data-reportId'));

            var cols = $.parseJSON($item.attr('data-cols'));
            var filters = $.parseJSON($item.attr('data-filters'));
            var customFilters = $.parseJSON($item.attr('data-customfilters'));
            var customFilterLabel = $item.attr('data-customfilterlabel');
            var customFilters2 = $.parseJSON($item.attr('data-customfilters2'));
            var customFilterLabel2 = $item.attr('data-customfilterlabel2');
            var customFilters3 = $.parseJSON($item.attr('data-customfilters3'));
            var customFilterLabel3 = $item.attr('data-customfilterlabel3');
            var dateFilters = $.parseJSON($item.attr('data-datefilters'));
            var removeReportSchedule = $item.attr(
                'data-remove-report-schedule'
            );

            var removeHtmlOption = $item.attr('data-remove-html-option');
            var removePdfOption = $item.attr('data-remove-pdf-option');
            var removeExcelOption = $item.attr('data-remove-excel-option');
            var removeCsvOption = $item.attr('data-remove-csv-option');

            var reportName = $(this).find('.name').text();
            // Only show the new report creation experience for the Sales Pipeline report
            var newReportCreation = [24];
            var reportCreationNew = me.$root.find('#report-creation-new');
            var reportVersionOriginal = me.$root.find(
                '#report-version-original'
            );
            var currentUserId = $('#_userid').val();
            var groupId = $('#_groupid').val();
            var isSalesPipelineReportFeatureEnabled =
                alto.optimizelyClient.isFeatureEnabled(
                    'sales_pipeline_report',
                    currentUserId
                );
            var isSalesPipelineReportFeatureEnabledForGroup =
                alto.optimizelyClient.isFeatureEnabledForGroup(
                    'sales_pipeline_report',
                    groupId
                );
            if (
                (isSalesPipelineReportFeatureEnabled ||
                    isSalesPipelineReportFeatureEnabledForGroup) &&
                newReportCreation.includes(id)
            ) {
                reportCreationNew.show();
                reportVersionOriginal.show();
                me.$root
                    .find('.new-report-content .report-name')
                    .html(reportName);
            } else {
                reportCreationNew.hide();
                reportVersionOriginal.hide();
            }

            //Move pointer to this row.
            me.$root
                .find('.report-list #pointer')
                .appendTo($item)
                .css('top', '8px')
                .show();

            //Set report info in config panel.
            me.setReportInfo(reportName, 'Standard Report');

            //De-select any custom configs.
            me.$root.find('.report-list .config-row.on').removeClass('on');

            //Set columns in config panel and sort-by/group-by dropdowns.
            var $filterBy = me.$root.find('#CustomFilterColumnId');
            var $filterBy2 = me.$root.find('#CustomFilterColumnId2');
            var $filterBy3 = me.$root.find('#CustomFilterColumnId3');
            var $dateFilterBy = me.$root.find('#DateFilterColumnId');

            $filterBy.empty();
            $filterBy2.empty();
            $filterBy3.empty();
            $dateFilterBy.empty();

            //Columns, OrderBy and GroupBy
            me.setReportColumns(cols, cfg);
            me.$root
                .find('.report-config .cols-header .insight')
                .text(cols.length + ' of ' + cols.length);

            // Add Custom Filters
            if (customFilters.length > 0) {
                if (customFilterLabel.length > 0) {
                    $('#customfilter-label label').text(customFilterLabel);
                } else {
                    $('#customfilter-label label').text('Filter By');
                }
            }
            $.each(customFilters, function (i) {
                $filterBy.append(
                    '<option value="' +
                        customFilters[i].Id +
                        '">' +
                        customFilters[i].Name +
                        '</option>'
                );
            });

            if (customFilters2.length > 0) {
                if (customFilterLabel2.length > 0) {
                    $('#customfilter2-label label').text(customFilterLabel2);
                } else {
                    $('#customfilter2-label label').text('Filter By');
                }
            }
            $.each(customFilters2, function (i) {
                $filterBy2.append(
                    '<option value="' +
                        customFilters2[i].Id +
                        '">' +
                        customFilters2[i].Name +
                        '</option>'
                );
            });

            if (customFilters3.length > 0) {
                if (customFilterLabel3.length > 0) {
                    $('#customfilter3-label label').text(customFilterLabel3);
                } else {
                    $('#customfilter3-label label').text('Filter By');
                }
            }
            $.each(customFilters3, function (i) {
                $filterBy3.append(
                    '<option value="' +
                        customFilters3[i].Id +
                        '">' +
                        customFilters3[i].Name +
                        '</option>'
                );
            });

            // Date filters
            $.each(dateFilters, function (i) {
                $dateFilterBy.append(
                    '<option value="' +
                        dateFilters[i].Id +
                        '">' +
                        dateFilters[i].Name +
                        '</option>'
                );
            });

            //Report output options
            me.$root.find('.submit-report-button').show();

            if (removeHtmlOption.length > 0 && removeHtmlOption === 'true') {
                me.$root
                    .find('.submit-report-button[data-formaturl="HTML"]')
                    .hide();
            }
            if (removePdfOption.length > 0 && removePdfOption === 'true') {
                me.$root
                    .find('.submit-report-button[data-formaturl="PDF"]')
                    .hide();
            } else {
                if (
                    me.$root.find(
                        '.submit-report-button[data-formaturl="HTML"]:hidden'
                    ).length > 0
                ) {
                    me.$root
                        .find('.submit-report-button[data-formaturl="PDF"]')
                        .removeClass('ml10');
                } else {
                    me.$root
                        .find('.submit-report-button[data-formaturl="PDF"]')
                        .addClass('ml10');
                }
            }
            if (removeExcelOption.length > 0 && removeExcelOption === 'true') {
                me.$root
                    .find('.submit-report-button[data-formaturl="Excel"]')
                    .hide();
            }
            if (removeCsvOption.length > 0 && removeCsvOption === 'true') {
                me.$root
                    .find('.submit-report-button[data-formaturl="CSV"]')
                    .hide();
            } else {
                if (
                    me.$root.find(
                        '.submit-report-button[data-formaturl="Excel"]:hidden'
                    ).length > 0
                ) {
                    me.$root
                        .find('.submit-report-button[data-formaturl="CSV"]')
                        .removeClass('ml10');
                } else {
                    me.$root
                        .find('.submit-report-button[data-formaturl="CSV"]')
                        .addClass('ml10');
                }
            }

            //Filters
            var $c = me.$root.find('.report-config');
            $c.find('.filter-section').hide();

            $.each(filters, function (i, v) {
                switch (parseInt(v)) {
                    //CommonAll
                    case C.ReportFilterType.CommonAll:
                        me.filterSections.$options.show();
                        me.filterSections.$period.show();
                        me.filterSections.$periodFrom.show();
                        me.filterSections.$periodTo.show();
                        me.filterSections.$sortBy.show();
                        me.filterSections.$sortDir.show();
                        me.filterSections.$groupBy.show();
                        me.filterSections.$branches.show();
                        me.filterSections.$users.show();
                        me.filterSections.$columns.show();
                        break;

                    // Individual Common Filters
                    case C.ReportFilterType.DatePeriod:
                        me.filterSections.$options.show();
                        me.filterSections.$period.show();
                        break;
                    case C.ReportFilterType.DateFrom:
                        me.filterSections.$options.show();
                        me.filterSections.$periodFrom.show();
                        break;
                    case C.ReportFilterType.DateTo:
                        me.filterSections.$options.show();
                        me.filterSections.$periodTo.show();
                        break;
                    case C.ReportFilterType.SortBy:
                        me.filterSections.$options.show();
                        me.filterSections.$sortBy.show();
                        break;
                    case C.ReportFilterType.SortDirection:
                        me.filterSections.$options.show();
                        me.filterSections.$sortDir.show();
                        break;
                    case C.ReportFilterType.Grouping:
                        me.filterSections.$options.show();
                        me.filterSections.$groupBy.show();
                        break;
                    case C.ReportFilterType.Branches:
                        me.filterSections.$branches.show();
                        break;
                    case C.ReportFilterType.Users:
                        me.filterSections.$users.show();
                        break;
                    case C.ReportFilterType.Columns:
                        me.filterSections.$columns.show();
                        break;
                    case C.ReportFilterType.Orientation:
                        me.filterSections.$orientation.show();
                        break;

                    //PropertyAll
                    case C.ReportFilterType.PropertyAll:
                        me.filterSections.$options.show();
                        me.filterSections.$propertyRecordType.show();
                        me.filterSections.$propertyOverseas.show();
                        break;

                    // Individual Property Filters
                    case C.ReportFilterType.PropertyRecordType:
                        me.filterSections.$options.show();
                        me.filterSections.$propertyRecordType.show();
                        break;
                    case C.ReportFilterType.PropertyOverseas:
                        me.filterSections.$options.show();
                        me.filterSections.$propertyOverseas.show();
                        break;
                    case C.ReportFilterType.PropertyCategory:
                        me.filterSections.$options.show();
                        me.filterSections.$propertyCategory.show();
                        break;

                    // ApplicantAll
                    case C.ReportFilterType.ApplicantAll:
                        me.filterSections.$options.show();
                        me.filterSections.$applicantDisposal.show();
                        me.filterSections.$applicantSituation.show();
                        me.filterSections.$archived.show();
                        break;

                    // Applicant Filters
                    case C.ReportFilterType.ApplicantDisposal:
                        me.filterSections.$options.show();
                        me.filterSections.$applicantDisposal.show();
                        break;

                    case C.ReportFilterType.ApplicantSituation:
                        me.filterSections.$options.show();
                        me.filterSections.$applicantSituation.show();
                        break;

                    case C.ReportFilterType.Archived:
                        me.filterSections.$options.show();
                        me.filterSections.$archived.show();
                        break;
                    // Landlord Income Filters
                    case C.ReportFilterType.LandlordIncomeType:
                        me.filterSections.$options.show();
                        me.filterSections.$landlordIncomeTypes.show();
                        break;
                    // Landlord Income Filters
                    case C.ReportFilterType.LandlordOverseas:
                        me.filterSections.$options.show();
                        me.filterSections.$landlordOverseas.show();
                        break;
                    // EPC Ratings
                    case C.ReportFilterType.EPCRatings:
                        me.filterSections.$options.show();
                        me.filterSections.$epcRatings.show();
                        break;
                    // Property Status
                    case C.ReportFilterType.PropertyStatus:
                        me.filterSections.$options.show();
                        me.filterSections.$propertyStatus.show();
                        break;
                    // Tenancy Status
                    case C.ReportFilterType.TenancyStatus:
                        me.filterSections.$options.show();
                        me.filterSections.$tenancyStatus.show();
                        break;
                    // Property / Rental Management Types
                    case C.ReportFilterType.PropertyManagementType:
                        me.filterSections.$options.show();
                        me.filterSections.$managementStatus.show();
                        break;
                    // Contact Category Filters
                    case C.ReportFilterType.ContactCategoryTypes:
                        me.filterSections.$options.show();
                        me.filterSections.$contactCategoryTypes.show();
                        break;

                    case C.ReportFilterType.Consent:
                        me.filterSections.$consents.show();
                        break;

                    case C.ReportFilterType.FontSize:
                        me.filterSections.$fontSize.show();
                        break;

                    case C.ReportFilterType.FeeExportProfile:
                        me.filterSections.$options.show();
                        me.filterSections.$feeExportProfile.show();
                        break;

                    case C.ReportFilterType.FeeExportDateType:
                        me.filterSections.$options.show();
                        me.filterSections.$feeExportDateType.show();
                        break;
                }
            });
            var hasCustomFilters = false;
            // Custom Filters
            if ($filterBy.children().length > 0) {
                hasCustomFilters = true;
                me.filterSections.$customFilterBy.show();
                $filterBy.val(0);
            }

            if ($filterBy2.children().length > 0) {
                hasCustomFilters = true;
                me.filterSections.$customFilterBy2.show();
                $filterBy2.val(0);
            }

            if ($filterBy3.children().length > 0) {
                hasCustomFilters = true;
                me.filterSections.$customFilterBy3.show();
                $filterBy3.val(0);
            }
            if (hasCustomFilters) {
                me.filterSections.$options.show();
            }
            // Date Filters
            if ($dateFilterBy.children().length > 0) {
                me.filterSections.$options.show();
                me.filterSections.$dateFilterBy.show();
                $dateFilterBy.val(0);
            }

            //Set the config section to the selected report id.
            me.$root
                .find(
                    '.report-config #ReportId, .report-config #Config_ReportId'
                )
                .val(id);
            me.$root.find('.report-config #Config_RecordId').val(0);
            me.$root.find('.report-config #Config_Name').val('');

            //Select boxes
            me.$root
                .find('.report-config select')
                .not('.opt-standard')
                .customSelect();

            //Date Pickers
            me.$root.find('.date-picker').each(function (i, v) {
                $(v).datepicker({
                    numberOfMonths: 2,
                    showButtonPanel: true,
                    dateFormat: 'dd/mm/yy',
                    minDate:
                        $(v).attr('data-datePickerMode') == 'future'
                            ? new Date()
                            : null
                });
            });

            //Set the selected list item.
            me.$root.find('.item .header.selected').removeClass('selected');
            me.$root.find('.submit-report-button').removeClass('selected');
            me.$root.find('#report-error').hide();
            me.$root.find('#report-loading').hide();

            me.resetAccordions();

            $(this).addClass('selected');

            //Show the config panel (unless it's already shown).
            var $rcc = me.$root.find('.report-config-container');
            if (!$rcc.hasClass('on')) {
                me.$root
                    .find('.report-list-container')
                    .animate({ right: '320px' }, 250);
                $rcc.animate({ right: '0px' }, 250, function () {
                    $rcc.addClass('on');
                    me.openItem($item);
                });
            } else {
                me.openItem($item);
            }

            if (
                removeReportSchedule.length > 0 &&
                removeReportSchedule === 'true'
            ) {
                me.$root.find('.schedule-header').hide();
            } else {
                me.$root.find('.schedule-header').show();
            }

            var statusIdList = [];
            me.$root
                .find('.report-schedule-users.checklist .item .ticked')
                .each(function (i, v) {
                    statusIdList.push($(v).children().first().val());
                });

            me.$root.find('#Schedule_ScheduledTime option').each(function () {
                $(this).val(
                    '0.{0}:00:00.0'.format($(this).text().split(':')[0])
                );
            });

            //Date Pickers
            me.$root.find('.report-date-picker').each(function (i, v) {
                var maxDate = new Date();
                maxDate.setFullYear(maxDate.getFullYear() + 5);
                $(v).datepicker({
                    numberOfMonths: 2,
                    showButtonPanel: true,
                    dateFormat: 'dd/mm/yy',
                    minDate: 0,
                    maxDate: maxDate
                });
            });

            var minDateValue = '01/01/0001 00:00:00';
            me.$root.find('.report-date-picker').each(function () {
                if ($(this).val() == minDateValue) {
                    $(this).val('');
                }
            });

            $(".report-frequency option[value='4']").remove();
            $(".report-frequency option[value='5']").remove();

            me.setDirty(false);

            me.enableControlsToSetDirtyFlag();
        });

        me.$root.on('mouseover', '.col-info', function () {
            $(this).qtip({
                content: $(this).find('.item-list').html(),
                position: {
                    my: 'top right',
                    at: 'bottom middle'
                },
                show: {
                    event: 'mouseenter',
                    ready: true,
                    delay: 0,
                    effect: function () {
                        $(this).fadeIn(50);
                    },
                    solo: true
                },
                hide: 'mouseleave',
                style: {
                    tip: true,
                    classes: 'qtip-dark'
                }
            });
        });
        me.$root.on('change', '.report-frequency', function () {
            me.$root.find('.report-schedule .options').hide();
            if ($(this).children(':selected').text() != '') {
                me.$root
                    .find(
                        '.' + $(this).children(':selected').text().toLowerCase()
                    )
                    .show();
            }
            me.clearScheduledReportFrequencySelection();
        });

        //Multi-select
        me.$root.on(
            'click',
            '.report-schedule-users.checklist .head',
            function () {
                me.toggleMultiSelect(this);
            }
        );

        me.$root.on('change', '#sendToOtherPeople', function () {
            me.clearScheduledReportUserSelection();
            if ($(this).prop('checked')) {
                $(this).parent().addClass('ticked');
                me.$root
                    .find('.report-schedule-users.checklist')
                    .removeClass('locked');
            } else {
                $(this).parent().removeClass('ticked');
                me.$root
                    .find('.report-schedule-users.checklist')
                    .addClass('locked');
            }
        });

        //Use Config > Click
        me.$root.on('prog-click', '.use-config-link', function () {
            var $row = $(this).closest('.config-row');
            me.disableControlsToSetDirtyFlag();
            me.selectReportConfiguration($row);
            me.enableControlsToSetDirtyFlag();
        });

        var debouncedSubmitReportButtonClicked = function (e) {
            var reportFormat = $(e.target)
                .closest('.submit-report-button')
                .data('formaturl');
            var $form = me.$root.find('#config-form');

            me.trackReportClick(reportFormat);
            me.trackReportAmendments($form, 'button_click_create_options');
            me.$root.find('.submit-report-button').removeClass('selected');
            if (e.shiftKey && e.ctrlKey) {
                me.executeReportImmediate($(this));
            } else {
                me.submitReportToPdfTier($(this));
            }
        };

        var executeSubmitReportRequest = $.debounce(
            250,
            false,
            debouncedSubmitReportButtonClicked
        );

        //Submit > Click
        me.$root.on(
            'click',
            '.submit-report-button:not(.disabled)',
            executeSubmitReportRequest
        );

        //Submit > Click
        me.$root.on('click', '.submit-button', function () {
            me.executeReportImmediate();
        });

        //Submit > Retry
        me.$root.on('click', '.retry-report-creation', function () {
            me.retrySubmitReportToPdfTierOnFailure($(this));
        });

        //Setup Schedule > Click
        me.$root.on('click', '.create-schedule-link', function () {
            new gmgps.cloud.ui.controls.window({
                title: 'Save Report (with optional Email Schedule)',
                windowId: 'saveReportModal',
                $content: me.$root.find('#report-email-template'),
                width: 550,
                draggable: true,
                modal: true,
                actionButton: 'OK',
                cancelButton: 'Cancel',
                onReady: function ($f) {
                    me.initEmailDialog($f);
                },
                onAction: function () {},
                onCancel: function () {}
            });
        });

        //Save Report button > Click
        me.$root.on('click', '.save-report-button', function () {
            me.saveReportConfiguration(false);
        });

        // Filter or un-filter Associated User List by Active Only or Active and Inactive
        me.$root.on('change', '.filter-user-list', function () {
            if ($(this).prop('checked')) {
                $(this).parent().addClass('ticked');
                $(this).val('true');
            } else {
                $(this).parent().removeClass('ticked');
                $(this).val('false');
            }
            me.getAssociatedUserList();
        });

        me.$root.on('prog-change', '.filter-user-list', function () {
            me.resetAssociatedUserList(false);
        });

        // Filter or un-filter Landlord Income types
        me.$root.on('change', '.landlord-user-income-item', function () {
            if ($(this).prop('checked')) {
                $(this).parent().addClass('ticked');
                //$(this).val('true');
            } else {
                $(this).parent().removeClass('ticked');
                //$(this).val('false');
            }
        });

        //Period (From & To) > Change
        me.$root.on('change', '#DateFrom, #DateTo', function () {
            me.$root.find('#PeriodTypeId').val(0).trigger('change');
        });

        //Period > Change
        me.$root.on('change prog-change', '#PeriodTypeId', function (e) {
            var id = parseInt($(this).val());
            var $from = me.$root.find('#DateFrom');
            var $to = me.$root.find('#DateTo');
            var from = new Date();
            var to = new Date();
            var now, month, year;

            var $fromRow = me.$root.find(
                '.custom-period-row[data-type="period-from"]'
            );
            var $toRow = me.$root.find(
                '.custom-period-row[data-type="period-to"]'
            );

            if (e.type == 'change') {
                if (id == C.ReportPeriodType.WeekOfYear) {
                    me.filterSections.$weekOfYear.show();
                    $fromRow.hide();
                    $toRow.hide();
                } else {
                    me.filterSections.$weekOfYear.hide();
                    $fromRow.show();
                    $toRow.show();
                }
            }

            switch (id) {
                case C.ReportPeriodType.Unspecified: //Custom Date Range
                    return;
                case C.ReportPeriodType.Today:
                    // from = from;
                    // to = to;
                    break;
                case C.ReportPeriodType.Yesterday:
                    from = from.add({ days: -1 });
                    to = from;
                    break;
                case C.ReportPeriodType.Last2Days:
                    from = from.add({ days: -1 });
                    // to = to;
                    break;
                case C.ReportPeriodType.Last7Days:
                    from = from.add({ days: -6 });
                    // to = to;
                    break;
                case C.ReportPeriodType.Last14Days:
                    from = from.add({ days: -13 });
                    // to = to;
                    break;
                case C.ReportPeriodType.Last30Days:
                    from = from.add({ days: -29 });
                    // to = to;
                    break;
                case C.ReportPeriodType.Last3Months:
                    from = from.add({ months: -3 });
                    // to = to;
                    break;
                case C.ReportPeriodType.Last6Months:
                    from = from.add({ months: -6 });
                    // to = to;
                    break;
                case C.ReportPeriodType.Last12Months:
                    from = from.add({ months: -12 });
                    // to = to;
                    break;
                case C.ReportPeriodType.Last2Years:
                    from = from.add({ years: -2 });
                    // to = to;
                    break;
                case C.ReportPeriodType.LastCalendarMonth:
                    now = new Date();
                    month = now.getMonth();
                    year = now.getFullYear();

                    if (month == 0) {
                        year += -1;
                        month = 12;
                    }

                    from = Date.parse('1/' + month + '/' + year);
                    to = from.clone();
                    to = to.moveToLastDayOfMonth();
                    break;
                case C.ReportPeriodType.MonthToDate:
                    from = from.moveToFirstDayOfMonth();
                    // to = to;
                    break;
                case C.ReportPeriodType.SaturdayToFriday:
                    day = (from.getDay() + 1) % 7; // make saturday = 0
                    from = from.add({ days: -day });
                    to = to.add({ days: 6 - day });
                    break;
                case C.ReportPeriodType.Tomorrow:
                    from = from.add({ days: 1 });
                    to = from;
                    break;
                case C.ReportPeriodType.Next2Days:
                    // from = from;
                    to = to.add({ days: 1 });
                    break;
                case C.ReportPeriodType.Next7Days:
                    // from = from;
                    to = to.add({ days: 6 });
                    break;
                case C.ReportPeriodType.Next14Days:
                    // from = from;
                    to = to.add({ days: 13 });
                    break;
                case C.ReportPeriodType.Next30Days:
                    // from = from;
                    to = to.add({ days: 29 });
                    break;
                case C.ReportPeriodType.Next3Months:
                    // from = from;
                    to = to.add({ months: 3 });
                    break;
                case C.ReportPeriodType.Next6Months:
                    // from = from;
                    to = to.add({ months: 6 });
                    break;
                case C.ReportPeriodType.Next12Months:
                    // from = from;
                    to = to.add({ months: 12 });
                    break;
                case C.ReportPeriodType.Next2Years:
                    // from = from;
                    to = to.add({ years: 2 });
                    break;
                case C.ReportPeriodType.NextCalendarMonth:
                    now = new Date();
                    month = now.getMonth() + 1;
                    year = now.getFullYear();

                    if (month == 12) {
                        year += 1;
                        month = 1;
                    } else {
                        month += 1;
                    }

                    from = Date.parse('1/' + month + '/' + year);
                    to = from.clone();
                    to = to.moveToLastDayOfMonth();
                    break;

                case C.ReportPeriodType.LastFinancialYear:
                    // Previous financial year
                    // Runs up until 5th April each year
                    now = new Date();
                    var day = now.getDate();
                    month = now.getMonth();
                    var currentyear = now.getFullYear();

                    var startYear;
                    var endYear;

                    var april = 3;

                    if (month < april) {
                        // Have not reached April so tax year can not have ended
                        startYear = currentyear - 2;
                        endYear = currentyear - 1;
                    } else if (month == april && day < 6) {
                        // In April, but still in early April before tax year ends
                        startYear = currentyear - 2;
                        endYear = currentyear - 1;
                    } else {
                        // Passed April 5th - so tax year ended
                        startYear = currentyear - 1;
                        endYear = currentyear;
                    }

                    from = new Date(startYear, april, 6); //6th April startYear
                    to = new Date(endYear, april, 5); // 5th April endYear

                    break;
            }

            $from
                .val(from.toString('dd/MM/yyyy'))
                .show('highlight', { color: '#aaa' }, 500);
            $to.val(to.toString('dd/MM/yyyy')).show(
                'highlight',
                { color: '#aaa' },
                500
            );
        });
    },

    initControls: function () {
        var me = this;

        //Panel
        me.panel = new gmgps.cloud.ui.controls.NavigablePanel({
            $root: me.$root.find('.panel[data-id="reporting"]'),
            defaultTitle: 'Reporting',
            entityType: 'reporting',
            defaultLayer: 'list'
        });
    },

    toggleMultiSelect: function (control) {
        var me = this;
        $(control).next('.body').children().show();
        $(control).next('.body').show();

        if (
            $(control).find('.eye').hasClass('on') &&
            !$(control).parent().hasClass('locked')
        ) {
            $(control).next('.body').children().show();
            $(control).next('.body').show();
        } else {
            me.hideMultiSelect($(control));
        }
    },

    hideMultiSelect: function (control) {
        //show the body - checking all checklist
        $(control).next('.body').hide();
        $(control).next('.body').children().hide();
        $(control).find('.eye').removeClass('on');
    },

    openItem: function ($item) {
        var me = this;

        me.disableControlsToSetDirtyFlag();

        me.setDirty(false);

        //Setup config panel.
        var cfg = $.parseJSON($item.attr('data-config'));
        var colsCfg = $.parseJSON($item.closest('.item').attr('data-cols'));

        // show relevant time periods for this report, and hide others
        me.$root
            .find('#PeriodTypeId')
            .detachOptions(
                '[data-date-tense!="' + $item.attr('data-date-tense') + '"]'
            );
        me.$root
            .find('#PeriodTypeId')
            .attachOptions(
                '[data-date-tense="' + $item.attr('data-date-tense') + '"]'
            );

        me.$root
            .find('#PeriodTypeId')
            .detachOptions(
                '[data-showalldate="' + $item.attr('data-showalldate') + '"]'
            );

        me.setConfig(cfg, colsCfg);

        //Close all open report configs.
        me.$root.find('.item.on').each(function (i, v) {
            // $(v).removeClass('on');
            $(v).find('.body').slideUp(250);
        });

        var c = $item.find('.config-row').length;
        if (c != 0) {
            $item.addClass('on');
            $item.find('.body').slideDown(250);
        }

        me.enableControlsToSetDirtyFlag();

        var selectedSavedReport = me.savedReport;
        if (selectedSavedReport) {
            var $savedReport = me.$root.find(
                '[data-savedreportname="{0}"]'.format(selectedSavedReport)
            );

            var $savedReportLink = $savedReport.find('.use-config-link');
            $savedReportLink.trigger('prog-click');
        }
    },

    saveReportConfiguration: function (overwriteOnly, callback) {
        var me = this;

        //var reportId = parseInt(me.$root.find('.report-config #ReportId').val());
        var recordId = parseInt(
            me.$root.find('.report-config #Config_RecordId').val()
        );
        var name = me.$root.find('.report-config #Config_Name').val();

        var startDate = me.$root.find('#Config_Schedule_StartDate');
        var endDate = me.$root.find('#Config_Schedule_EndDate');

        var hasRecipients =
            me.$root
                .find("input[name*='Config.Schedule.SendToReportOwner']")
                .prop('checked') ||
            me.$root.find('#sendToOtherPeople').prop('checked');

        if (
            hasRecipients &&
            ((startDate.val() === '' && endDate.val() === '') ||
                startDate.val() === '' ||
                endDate.val() === '')
        ) {
            showInfo(
                'Please ensure the scheduled dates have been entered',
                'Report Schedule Dates'
            );
            return;
        }

        if (!hasRecipients && startDate.val() !== '' && endDate.val() !== '') {
            showInfo(
                'Please select the recipients for the report',
                'Report Schedule Users'
            );
            return;
        }

        if (
            me.$root.find('#sendToOtherPeople').parent().hasClass('ticked') &&
            me.$root.find('.report-schedule-users .body .item .tickbox.ticked')
                .length == 0
        ) {
            showInfo(
                'Please select the other users you wish to send the report to',
                'Report Schedule Users'
            );
            return;
        }

        if (me.isDailyFrequency() || me.isWeeklyFrequency()) {
            var $f = me.$root.find('#config-form');
            $f.find('#Config_Schedule_OccurrenceDay').val(0);
            $f.find('#Config_Schedule_OccurrenceWeekNo').val(0);
            $f.find('#Config_Schedule_OccurrenceWeekDay').val(0);
        }

        var after = function (createNew, name, id, saveNewCustom) {
            var save = function () {
                //Submit > Click
                me.prepareConfigForm();

                if (!name || name == '') {
                    name = me.$root.find('#Config_Name').val();
                }

                if (saveNewCustom) {
                    var oldId = id;
                }

                if (!id || createNew) {
                    id = 0;
                }

                var $form = me.$root.find('#config-form');

                $form.find('#Config_Name').val(name);
                $form.find('#Config_RecordId').val(id);
                $form.find('input[name="Config.ReportFormat"]').val(0);

                $form.attr('action', '/reporting/savereportconfiguration');
                new gmgps.cloud.http(
                    "reporting-saveReportConfiguration"
                ).postForm($form, function (e) {
                    new gmgps.cloud.http(
                        "reporting-saveReportConfiguration"
                    ).getView({
                        url: 'Reporting/GetReportConfigurationListItem',
                        args: { recordId: e.Data.RecordId },
                        complex: true,
                        post: true,
                        onSuccess: function (response) {
                            var $newRow = $(response.Data);
                            var $row;

                            var formattedName = name
                                .replace(/[^a-zA-Z0-9-_]/g, '-')
                                .toLowerCase();

                            if (id != 0) {
                                //Update - Insert after the previous version of the row, then remove that previous version.
                                $row = me.$root.find(
                                    '.config-row[data-recordId="{0}"]'.format(
                                        id
                                    )
                                );
                                $newRow.insertAfter($row);
                                $row.remove();
                            } else {
                                //New - append.
                                me.trackReportAmendments(
                                    $form,
                                    'button_click_save_settings'
                                );
                                if (saveNewCustom) {
                                    $row = me.$root.find(
                                        '.config-row[data-recordId="{0}"]'.format(
                                            oldId
                                        )
                                    );
                                    $newRow.insertAfter($row);
                                } else {
                                    me.$root
                                        .find('.header.selected')
                                        .closest('.item')
                                        .find('.saved-reports-title')
                                        .parent()
                                        .append($newRow);
                                }
                            }

                            var category = me.$root
                                .find('.list .item.on')
                                .attr('data-unique-id');
                            var report = $newRow
                                .closest('.item')
                                .attr('data-reportname');

                            $newRow
                                .find('.use-config-link')
                                .trigger('prog-click');

                            alto.router.navigationChanged('reporting', {
                                category,
                                report,
                                savedreport: formattedName
                            });

                            if (callback) callback();
                        }
                    });
                });
            };

            if (createNew) {
                new gmgps.cloud.ui.controls.window({
                    title: 'Save Report Settings',
                    windowId: 'saveReportSettingsModal',
                    $content: me.$root.find('#report-save-template'),
                    width: 530,
                    draggable: true,
                    modal: true,
                    actionButton: 'OK',
                    cancelButton: 'Cancel',
                    onReady: function ($f) {
                        me.initSaveDialog($f);
                    },
                    onAction: function ($f) {
                        name = $.trim($f.find('#Name').val());
                        if (name != '') {
                            save();
                        }
                    },
                    onCancel: function () {}
                });
            } else {
                save(name);
            }
        };

        if (overwriteOnly) {
            //No prompt, just update.
            after(false, name, recordId);
        } else {
            if (recordId != 0 && !isNaN(recordId)) {
                //Update existing report or save as a new one?
                showDialog({
                    type: 'question',
                    title: 'Save Custom Report',
                    msg: 'Update the existing report or save as a new one?',
                    buttons: {
                        Update: function () {
                            //Update the existing custom report.
                            $(this).dialog('close');
                            after(false, name, recordId);
                        },
                        'Save as New': function () {
                            //Save as a new, custom report.
                            $(this).dialog('close');
                            after(true, name, recordId, true);
                        },
                        Cancel: function () {
                            $(this).dialog('close');
                        }
                    }
                });
            } else {
                //Save as a new, custom report.
                after(true);
            }
        }
    },

    trackReportAmendments: function ($form, eventAction) {
        var me = this;

        try {
            var reportName = $form.find('.name.fg-reporting').text();
            var reportId = $form.find('#Config_ReportId').val();
            var recordId = $form.find('#Config_RecordId').val();
            var timestamp = new Date()
                .toISOString()
                .slice(0, 19)
                .replace('T', ' ');

            var reportOptions = '';
            $form.find('[data-reportingOption]').each(function () {
                var currentOption = $(this);
                var closestRow = currentOption.closest('.row');

                if (!closestRow.is(':hidden')) {
                    if (currentOption.is('input[type="checkbox"]')) {
                        reportOptions +=
                            me.getReportCheckboxValue(currentOption);
                    } else {
                        var value = '';
                        if (currentOption.is('input')) {
                            value = currentOption.val();
                        } else {
                            value = currentOption
                                .find('option:selected')
                                .text();
                        }

                        reportOptions +=
                            closestRow.find('label').text() +
                            ': ' +
                            value +
                            '; ';
                    }
                }
            });
            me.sendGAReportAmendments(
                eventAction,
                reportName,
                reportId,
                recordId,
                timestamp,
                'Report Options',
                reportOptions
            );

            var reportColumns = me.getReportCheckboxValues($form, 'columns');
            me.sendGAReportAmendments(
                eventAction,
                reportName,
                reportId,
                recordId,
                timestamp,
                'Report Columns',
                reportColumns
            );
        } catch (e) {
            console.log(
                'Error sending report options event to Google Analytics',
                e
            );
        }
    },

    getReportCheckboxValues: function ($form, dataType) {
        var me = this;

        var values = '';
        $form
            .find('[data-type="' + dataType + '"]')
            .find('input[type=checkbox]')
            .each(function () {
                values += me.getReportCheckboxValue($(this));
            });

        return values;
    },

    getReportCheckboxValue: function ($checkbox) {
        return (
            $checkbox.closest('.item').find('.label').text() +
            ': ' +
            $checkbox.prop('checked') +
            '; '
        );
    },

    sendGAReportAmendments: function (
        eventAction,
        reportName,
        reportId,
        recordId,
        timestamp,
        section,
        options
    ) {
        var eventLabel =
            reportName +
            '; Report ID = ' +
            reportId +
            '; Record ID = ' +
            recordId +
            '; ' +
            timestamp +
            ' (' +
            section +
            ') - ' +
            options;
        googleAnalytics.sendEvent('reporting', eventAction, eventLabel);
    },

    trackReportClick: function (reportFormat) {
        var me = this;

        try {
            var name = me.$root.find('.report-config .name').text();
            googleAnalytics.sendEvent(
                'reporting',
                'button_click',
                name + ': ' + reportFormat
            );
        } catch (e) {
            console.log(
                'Error sending report click event to Google Analytics',
                e
            );
        }
    },

    submitReport: function ($activeButton, getReportType) {
        var me = this;

        me.$root.find('.report-status-right .html').hide();
        me.$root.find('.report-status-right .pdf-excel-csv').hide();
        me.$root.find('#report-loading').show();

        me.$root.find('#report-error').hide();

        switch (getReportType) {
            case C.ReportFormatType.HTML:
                me.$root.find('.report-status-right .html').show();
                break;
            case C.ReportFormatType.PDF:
                document.getElementById('pdf-excel-csv').innerHTML = 'PDF';
                me.$root.find('.report-status-right .pdf-excel-csv').show();
                break;
            case C.ReportFormatType.Excel:
                document.getElementById('pdf-excel-csv').innerHTML = 'Excel';
                me.$root.find('.report-status-right .pdf-excel-csv').show();
                break;
            case C.ReportFormatType.CSV:
                document.getElementById('pdf-excel-csv').innerHTML = 'CSV';
                me.$root.find('.report-status-right .pdf-excel-csv').show();
                break;
        }

        var reportName = me.$root.find('.report-config .info .name').text();

        me.prepareConfigForm();
        var $form = me.$root.find('#config-form').clone();

        $form.find('input[name="Config.ReportFormat"]').val(getReportType);
        $form.find('input[name="Config.ReportName"]').val(reportName);

        var postedForm = createForm($form, '/reporting/getreportremote');

        new gmgps.cloud.http("reporting-submitReport").postForm(
            postedForm,

            function () {
                $activeButton.removeClass('disabled');
                $activeButton.removeClass('selected');
            },
            function () {
                $activeButton.removeClass('disabled');
                me.$root.find('#report-error').show();
                me.$root.find('#report-loading').hide();
            },
            true
        );
    },
    submitReportToPdfTier: function ($activeButton) {
        var me = this;

        var reportDataFormat = parseInt($activeButton.attr('data-formatid'));
        me.submitReport($activeButton, reportDataFormat);
        // add selected class
        $activeButton.addClass('selected');
    },

    retrySubmitReportToPdfTierOnFailure: function ($activeButton) {
        var me = this;

        var $findSelectedButton = me.$root.find(
            '.submit-report-button.selected'
        );
        var getReportType = parseInt($findSelectedButton.attr('data-formatid'));

        me.submitReport($activeButton, getReportType);
    },

    executeReportImmediate: function ($activeButton) {
        var me = this;

        me.prepareConfigForm();
        me.$root
            .find('#config-form')
            .attr(
                'action',
                '/reporting/getreport' + $activeButton.attr('data-formaturl')
            )
            .submit();
    },

    getAssociatedUserList: function (setToDefault) {
        var me = this;
        var includeUsersWithoutBranchPermissions = me.$root
            .find('#IncludeUsersWithoutBranchPermissionsId')
            .prop('checked');
        var includeInactiveUsers = me.$root
            .find('#IncludeInactiveUsersId')
            .prop('checked');
        var includeNonChargeableUsers = me.$root
            .find('#IncludeNonChargeableUsersId')
            .prop('checked');
        var includeBackgroundUsers = me.$root
            .find('#IncludeBackgroundUsersId')
            .prop('checked');

        var selectedUsers = me.$root
            .find(
                '.checklist[data-type="users"] input[type="checkbox"]:checked'
            )
            .map(function () {
                return $(this).val();
            })
            .get();

        setToDefault = setToDefault === undefined ? false : setToDefault;

        return new gmgps.cloud.http("reporting-getAssociatedUserList").ajax(
            {
                crossDomain: true,
                args: {
                    includeUsersWithoutBranchPermissions:
                        includeUsersWithoutBranchPermissions,
                    selectedUsers: selectedUsers,
                    selectAll: setToDefault,
                    includeInactiveUsers: includeInactiveUsers,
                    includeNonChargeableUsers: includeNonChargeableUsers,
                    includeBackgroundUsers: includeBackgroundUsers
                },
                complex: false,
                dataType: 'json',
                type: 'post',
                url: 'Reporting/GetAssociatedUserList',
                timeout: 6000
            },
            function (response) {
                me.populateAssociatedUserList(response.Data);
            },

            function (xhr, textStatus) {
                showInfo(textStatus, 'error');
            }
        );
    },

    populateAssociatedUserList: function (data) {
        var me = this;
        var $u = me.$root.find('.checklist[data-type="users"]');

        $u.replaceWith(data);

        var total = me.$root
            .find('.checklist[data-type="users"]')
            .find('.item').length;
        var checked = me.$root
            .find('.checklist[data-type="users"]')
            .find('input[type="checkbox"]:checked').length;
        var $e = me.$root
            .find('.users-header[data-type="users"]')
            .find('.insight');
        $e.text(checked + ' of ' + total);
    },

    resetAssociatedUserList: function (setToDefault) {
        var me = this;
        return me.getAssociatedUserList(setToDefault);
    },

    isDailyFrequency: function () {
        var me = this;
        return (
            parseInt(
                me.$root.find('#Config_Schedule_FrequencyId').val(),
                10
            ) === C.RecurringDiaryEventScheduleType.DailyEveryNDays
        );
    },

    isWeeklyFrequency: function () {
        var me = this;
        return (
            parseInt(
                me.$root.find('#Config_Schedule_FrequencyId').val(),
                10
            ) === C.RecurringDiaryEventScheduleType.DailyEveryWeekday
        );
    },

    enableControlsToSetDirtyFlag: function () {
        var me = this;
        //Report Config: Dirty triggers
        me.$root.on(
            'change keyup',
            '.report-config input:not(".modal-input"), .report-config select',
            function () {
                me.setDirty(true);
            }
        );
    },

    disableControlsToSetDirtyFlag: function () {
        var me = this;
        //Report Config: Dirty triggers
        me.$root.off(
            'change keyup',
            '.report-config input:not(".modal-input"), .report-config select'
        );
    },

    setDirty: function (isDirty) {
        var me = this;

        if (me.isDirty == isDirty) return;

        me.isDirty = isDirty;
        var $e = me.$root.find('.report-config .save-button-container');
        if (isDirty) {
            $e.slideDown();
        } else {
            $e.slideUp();
        }
    },

    setReportInfo: function (name, config) {
        var me = this;
        var $info = me.$root.find('.report-config .info');
        $info.find('.group').html(me.selectedGroupName);
        $info.find('.name').html(name);
        $info.find('.config').text('(' + config + ')');
    },

    initSaveDialog: function ($f) {
        var me = this;

        $f.attr('id', 'report-save');

        //Determine a suitable name.
        var date = new Date();
        var name = me.$root.find('.report-config .name').text();
        $f.find('#Name')
            .val(name + ' - ' + date.toString('ddd dd MMM yyyy HH:mm:ss'))
            .focus()
            .select();
    },

    initEmailDialog: function ($f) {
        $f.attr('id', 'report-email');

        //Select boxes
        $f.find('select').not('.opt-standard').customSelect();

        //Report Schedule: Freq > Change
        $f.on('change', '#Freq', function () {
            var id = parseInt($(this).val());
            var $week = $f.find('.weekday-picker');
            var $month = $f.find('.monthday-picker');
            switch (id) {
                case 0: //Now
                    $week.hide();
                    $month.hide();
                    break;
                case 1: //Daily
                    $week.hide();
                    $month.hide();
                    break;
                case 2: //Weekly
                    $week.show();
                    $month.hide();
                    break;
                case 3: //Monthly
                    $week.hide();
                    $month.show();
                    break;
                case 4: //Quarterly
                    $week.hide();
                    $month.hide();
                    break;
                case 5: //Annually
                    $week.hide();
                    $month.hide();
                    break;
            }
        });
    },

    persist: function () {},

    activate: function (category, report, savedReport) {
        var me = this;

        me.category = category;
        me.report = report;
        me.savedReport = savedReport;

        var $item = me.$root.find('[data-unique-id="{0}"]'.format(me.category));

        var $button = $item.find('.button');
        $button.trigger('prog-click');
    },

    _panelItemClicked: function (args) {
        var me = this;
        var id = parseInt(args.$item.attr('data-id'));

        me.selectedGroupName = args.$item.find('h3').text();

        switch (args.$item.attr('data-type')) {
            case 'detail':
                break;

            case 'list':
                me.$listPanelItem = args.$item;

                switch (id) {
                    case '-2': //search
                        me.list.clear(); //ready to populate upon query typing.
                        me.onSearchBoxFocusRequest.raise();
                        args.onComplete();
                        break;

                    default:
                        me.query = '';
                        me.getList(
                            {
                                $panelItem: args.$item,
                                search: {
                                    ReportCategoryId: id,
                                    ListType: C.ListType.Standard,
                                    SearchPage: {
                                        Index: 1,
                                        Size: C.SearchPageSize.Default
                                    },
                                    SearchOrder: {
                                        By: C.SearchOrderBy.Name,
                                        Type: C.SearchOrderType.Ascending
                                    }
                                }
                            },
                            function () {
                                me.$root
                                    .find('.report-list .form-header')
                                    .text(
                                        args.$item.find('h3').text() +
                                            ' Reports'
                                    );
                                args.onComplete();
                            }
                        );
                        break;
                }
                break;
            default:
                args.onComplete();
                break;
        }

        alto.router.navigationComplete('reporting', {
            category: args.$item.attr('data-unique-id')
        });
    },

    setConfig: function (cfg, colsCfg) {
        var me = this;
        var $f = me.$root.find('#config-form');
        var $list;
        var count = 0;
        var $woyRow = me.$root.find('.week-of-year-row');
        var $fromRow = me.$root.find(
            '.custom-period-row[data-type="period-from"]'
        );
        var $toRow = me.$root.find('.custom-period-row[data-type="period-to"]');

        //Set the config section to the selected report id.
        me.$root
            .find('.report-config #ReportId, .report-config #Config_ReportId')
            .val(cfg.ReportId);
        me.$root.find('.report-config #Config_RecordId').val(cfg.RecordId);
        me.$root.find('.report-config #Config_Name').val(cfg.Name);

        me.setReportColumns(colsCfg, cfg);

        //Common
        if (cfg.PeriodTypeId == 0) {
            //Set explicit dates.
            if (me.$root.find('#PeriodTypeId').is(':visible')) {
                $f.find('#DateFrom').val(
                    new Date(parseInt(cfg.DateFrom.substr(6))).toString(
                        'dd/MM/yyyy'
                    )
                );
                $f.find('#DateTo').val(
                    new Date(parseInt(cfg.DateTo.substr(6))).toString(
                        'dd/MM/yyyy'
                    )
                );
                $fromRow.show();
                $toRow.show();
            }
            $woyRow.hide();
        } else {
            if (cfg.PeriodTypeId == C.ReportPeriodType.WeekOfYear) {
                $woyRow.show();
                $fromRow.hide();
                $toRow.hide();
            } else {
                $woyRow.hide();
                if (me.$root.find('#PeriodTypeId').is(':visible')) {
                    $fromRow.show();
                    $toRow.show();
                }
            }
        }

        //Period Type
        $f.find('#PeriodTypeId').val(cfg.PeriodTypeId).trigger('prog-change');

        //OrderBy
        if (cfg.OrderByColumnId != 0) {
            $f.find('#OrderByColumnId')
                .val(cfg.OrderByColumnId)
                .trigger('prog-change');
        } else {
            var opt = $f.find('#OrderByColumnId option').first();
            $f.find('#OrderByColumnId')
                .val(opt.attr('value'))
                .trigger('prog-change');
        }

        //Ascending/Descending
        if (cfg.OrderTypeId == 0)
            $f.find('#OrderTypeId').val(1).trigger('prog-change');
        else
            $f.find('#OrderTypeId').val(cfg.OrderTypeId).trigger('prog-change');

        //Layout/Orientation
        $f.find('#OrientationId').val(cfg.Orientation).trigger('prog-change');

        // Archived
        $f.find('#Archived').val(cfg.Archived).trigger('prog-change');

        // Font Size
        $f.find('#FontSize').val(cfg.FontSize).trigger('prog-change');

        //Grouping
        $f.find('#GroupByColumnId').val(cfg.GroupById).trigger('prog-change');

        //Custom Filter
        $f.find('#CustomFilterColumnId')
            .val(cfg.CustomFilterId)
            .trigger('prog-change');
        $f.find('#CustomFilterColumnId2')
            .val(cfg.CustomFilterId2)
            .trigger('prog-change');

        //Date Filter
        $f.find('#DateFilterColumnId')
            .val(cfg.DateFilterId)
            .trigger('prog-change');

        //Branches
        $list = $f.find('.checklist[data-type="branches"]');
        count = $list.find('input[type="checkbox"]').length;
        if (cfg.BranchIds && cfg.BranchIds.length != 0) {
            //Untick all.
            $list.find('input[type="checkbox"]').each(function (i, v) {
                $(v).prop('checked', false).trigger('prog-change');
            });
            //Tick selected.
            $.each(cfg.BranchIds, function (i, v) {
                var $t = $list.find(
                    '.item[data-id="' + v + '"] input[type="checkbox"]'
                );
                $t.prop('checked', true).trigger('prog-change');
            });
            $f.find('.branches-header .insight').text(
                cfg.BranchIds.length + ' of ' + count
            );
        } else {
            //Tick them all.
            $list.find('input[type="checkbox"]').each(function (i, v) {
                $(v).prop('checked', true).trigger('prog-change');
            });
            $f.find('.branches-header .insight').text(count + ' of ' + count);
        }

        //Users

        var includeUsersWithoutBranchPermissions;
        var includeUsersWithoutBranchPermissionsParent;

        var includeInactiveUsers;
        var includeInactiveUsersParent;

        var includeNonChargeableUsers;
        var includeNonChargeableUsersParent;

        var includeBackgroundUsers;
        var includeBackgroundUsersParent;

        if (cfg.UserIds && cfg.UserIds.length != 0) {
            //Exclude Inactive Users
            includeUsersWithoutBranchPermissions = $f.find(
                '#IncludeUsersWithoutBranchPermissionsId'
            );
            includeUsersWithoutBranchPermissions.val(
                cfg.IncludeUsersWithoutBranchPermissions ? 'True' : 'False'
            );
            includeUsersWithoutBranchPermissions
                .prop('checked', cfg.IncludeUsersWithoutBranchPermissions)
                .trigger('prog-change');

            includeUsersWithoutBranchPermissionsParent =
                includeUsersWithoutBranchPermissions.parent();
            includeUsersWithoutBranchPermissionsParent.removeClass('ticked');
            includeUsersWithoutBranchPermissionsParent
                .addClass(
                    cfg.IncludeUsersWithoutBranchPermissions ? 'ticked' : ''
                )
                .trigger('prog-change');

            //active Users
            includeInactiveUsers = $f.find('#IncludeInactiveUsersId');
            includeInactiveUsers.val(
                cfg.IncludeInactiveUsers ? 'True' : 'False'
            );
            includeInactiveUsers
                .prop('checked', cfg.IncludeInactiveUsers)
                .trigger('prog-change');

            includeInactiveUsersParent = includeInactiveUsers.parent();
            includeInactiveUsersParent.removeClass('ticked');
            includeInactiveUsersParent
                .addClass(cfg.IncludeInactiveUsers ? 'ticked' : '')
                .trigger('prog-change');

            // non chargeable users
            includeNonChargeableUsers = $f.find('#IncludeNonChargeableUsersId');
            includeNonChargeableUsers.val(
                cfg.IncludeNonChargeableUsers ? 'True' : 'False'
            );
            includeNonChargeableUsers
                .prop('checked', cfg.IncludeNonChargeableUsers)
                .trigger('prog-change');

            includeNonChargeableUsersParent =
                includeNonChargeableUsers.parent();
            includeNonChargeableUsersParent.removeClass('ticked');
            includeNonChargeableUsersParent
                .addClass(cfg.IncludeNonChargeableUsers ? 'ticked' : '')
                .trigger('prog-change');

            // background users
            includeBackgroundUsers = $f.find('#IncludeBackgroundUsersId');
            includeBackgroundUsers.val(
                cfg.IncludeBackgroundUsers ? 'True' : 'False'
            );
            includeBackgroundUsers
                .prop('checked', cfg.IncludeBackgroundUsers)
                .trigger('prog-change');

            includeBackgroundUsersParent =
                includeBackgroundUsers.parent();
            includeBackgroundUsersParent.removeClass('ticked');
            includeBackgroundUsersParent
                .addClass(cfg.IncludeBackgroundUsers ? 'ticked' : '')
                .trigger('prog-change');

            me.resetAssociatedUserList(false).done(function () {
                var $userlist = $f.find('.checklist[data-type="users"]');
                var $usercheckboxes = $userlist.find('input[type="checkbox"]');
                var noOfSelectedUsers = 0;
                //Untick all.
                $usercheckboxes.prop('checked', false).trigger('prog-change');
                //Tick selected.
                $.each(cfg.UserIds, function (i, v) {
                    var $t = $userlist.find(
                        '.item[data-id="' + v + '"] input[type="checkbox"]'
                    );
                    $t.prop('checked', true).trigger('prog-change');
                    if ($t.length > 0) {
                        noOfSelectedUsers++;
                    }
                });

                var usercount = $usercheckboxes.length;

                $f.find('.users-header .insight').text(
                    noOfSelectedUsers + ' of ' + usercount
                );
            });
        } else {
            $list = $f.find('.checklist[data-type="users"]');
            count = $list.find('input[type="checkbox"]').length;

            //Clear Exclude Inactive Users flag
            includeUsersWithoutBranchPermissions = $f.find(
                '#IncludeUsersWithoutBranchPermissionsId'
            );
            includeUsersWithoutBranchPermissions.val(
                cfg.IncludeUsersWithoutBranchPermissions ? 'True' : 'False'
            );
            includeUsersWithoutBranchPermissions.prop(
                'checked',
                cfg.IncludeUsersWithoutBranchPermissions
            );

            includeUsersWithoutBranchPermissionsParent =
                includeUsersWithoutBranchPermissions.parent();
            includeUsersWithoutBranchPermissionsParent.removeClass('ticked');
            includeUsersWithoutBranchPermissionsParent.addClass(
                cfg.IncludeUsersWithoutBranchPermissions ? 'ticked' : ''
            );

            // reset IncludeInactiveUsers flag
            includeInactiveUsers = $f.find('#IncludeInactiveUsersId');
            includeInactiveUsers.val(
                cfg.IncludeInactiveUsers ? 'True' : 'False'
            );
            includeInactiveUsers.prop(
                'checked',
                cfg.IncludeInactiveUsers || true
            );

            includeInactiveUsersParent = includeInactiveUsers.parent();
            includeInactiveUsersParent.removeClass('ticked');
            includeInactiveUsersParent.addClass(
                cfg.IncludeInactiveUsers ? 'ticked' : ''
            );

            // reset NonChargeAbleUsers flag
            includeNonChargeableUsers = $f.find('#IncludeNonChargeableUsersId');
            includeNonChargeableUsers.val(
                cfg.IncludeNonChargeableUsers ? 'True' : 'False'
            );
            includeNonChargeableUsers.prop(
                'checked',
                cfg.IncludeNonChargeableUsers || true
            );

            includeNonChargeableUsersParent =
                includeNonChargeableUsers.parent();
            includeNonChargeableUsersParent.removeClass('ticked');
            includeNonChargeableUsersParent.addClass(
                cfg.IncludeNonChargeableUsers ? 'ticked' : ''
            );

            // reset IncludeBackgroundUsers flag
            includeBackgroundUsers = $f.find('#IncludeBackgroundUsersId');
            includeBackgroundUsers.val(
                cfg.IncludeBackgroundUsers ? 'True' : 'False'
            );
            includeBackgroundUsers.prop(
                'checked',
                cfg.IncludeBackgroundUsers || false
            );

            includeBackgroundUsersParent = includeBackgroundUsers.parent();
            includeBackgroundUsersParent.removeClass('ticked');
            includeBackgroundUsersParent.addClass(
                cfg.IncludeBackgroundUsers ? 'ticked' : ''
            );

            //Tick them all.
            $list.find('input[type="checkbox"]').each(function (i, v) {
                $(v).prop('checked', true).trigger('prog-change');
            });
            $f.find('.users-header .insight').text(count + ' of ' + count);

            me.resetAssociatedUserList(true);
        }

        // If report Id (ie. report type) is not ApplicantsRegistered, then we want to hide the include background users checkbox container
        if (cfg.ReportId !== 62) {
            var $includeBackgroundUsersRow = me.$root.find('.includeBackgroundUsers-row[data-type="includeBackgroundUsers"]');
            $includeBackgroundUsersRow.hide();
        }

        // Landlord income types
        if (cfg.LandlordIncomeTypes && cfg.LandlordIncomeTypes.length != 0) {
            var $incomelist = $f.find(
                '.checklist[data-type="landlordincometypes"]'
            );
            var $incomecheckboxes = $incomelist.find('input[type="checkbox"]');
            //Untick all.
            $incomecheckboxes.prop('checked', true).trigger('prog-change');
            //Tick selected.
            $.each(cfg.LandlordIncomeTypes, function (i, v) {
                var $t = $incomelist.find(
                    '.item[data-id="' + v + '"] input[type="checkbox"]'
                );
                $t.prop('checked', false).trigger('prog-change');
            });
        } else {
            $list = $f.find('.checklist[data-type="landlordincometypes"]');
            //Tick them all.
            $list.find('input[type="checkbox"]').each(function (i, v) {
                $(v).prop('checked', true).trigger('prog-change');
            });
        }

        // Landlord Overseas during tax period
        $f.find('#LandlordOverseas')
            .val(cfg.LandlordOverseas ? 'True' : 'False')
            .trigger('prog-change');

        // Contact types
        var $contactlist, $contactcheckboxes;
        if (cfg.ContactCategoryTypes && cfg.ContactCategoryTypes.length != 0) {
            $contactlist = $f.find(
                '.checklist[data-type="contactcategorytypes"]'
            );
            $contactcheckboxes = $contactlist.find('input[type="checkbox"]');
            //Untick all.
            $contactcheckboxes.prop('checked', true).trigger('prog-change');
            //Tick selected.
            $.each(cfg.ContactCategoryTypes, function (i, v) {
                var $t = $contactlist.find(
                    '.item[data-id="' + v + '"] input[type="checkbox"]'
                );
                $t.prop('checked', false).trigger('prog-change');
            });
        } else {
            $list = $f.find('.checklist[data-type="contactcategorytypes"]');
            //Tick them all.
            $list.find('input[type="checkbox"]').each(function (i, v) {
                $(v).prop('checked', true).trigger('prog-change');
            });
        }

        // EPC Ratings
        var $checkboxes;
        if (cfg.EPCRatings && cfg.EPCRatings.length != 0) {
            $list = $f.find('.checklist[data-type="epcratings"]');
            $checkboxes = $list.find('input[type="checkbox"]');
            //Untick all.
            $checkboxes.prop('checked', true).trigger('prog-change');
            //Tick selected.
            $.each(cfg.EPCRatings, function (i, v) {
                var $t = $list.find(
                    '.item[data-id="' + v + '"] input[type="checkbox"]'
                );
                $t.prop('checked', false).trigger('prog-change');
            });
        } else {
            $list = $f.find('.checklist[data-type="epcratings"]');
            //Tick them all.
            $list.find('input[type="checkbox"]').each(function (i, v) {
                $(v).prop('checked', true).trigger('prog-change');
            });
        }

        // Property Status
        if (
            cfg.ExcludedPropertyStatus &&
            cfg.ExcludedPropertyStatus.length != 0
        ) {
            $list = $f.find('.checklist[data-type="propertystatus"]');
            $checkboxes = $list.find('input[type="checkbox"]');
            //Untick all.
            $checkboxes.prop('checked', true).trigger('prog-change');
            //Tick selected.
            $.each(cfg.ExcludedPropertyStatus, function (i, v) {
                var $t = $list.find(
                    '.item[data-id="' + v + '"] input[type="checkbox"]'
                );
                $t.prop('checked', false).trigger('prog-change');
            });
        } else {
            $list = $f.find('.checklist[data-type="propertystatus"]');
            //Tick them all.
            $list.find('input[type="checkbox"]').each(function (i, v) {
                $(v).prop('checked', true).trigger('prog-change');
            });
        }

        // Contact types
        if (cfg.ContactCategoryTypes && cfg.ContactCategoryTypes.length != 0) {
            $contactlist = $f.find(
                '.checklist[data-type="contactcategorytypes"]'
            );
            $contactcheckboxes = $contactlist.find('input[type="checkbox"]');
            //Untick all.
            $contactcheckboxes.prop('checked', true).trigger('prog-change');
            //Tick selected.
            $.each(cfg.ContactCategoryTypes, function (i, v) {
                var $t = $contactlist.find(
                    '.item[data-id="' + v + '"] input[type="checkbox"]'
                );
                $t.prop('checked', false).trigger('prog-change');
            });
        } else {
            $list = $f.find('.checklist[data-type="contactcategorytypes"]');
            //Tick them all.
            $list.find('input[type="checkbox"]').each(function (i, v) {
                $(v).prop('checked', true).trigger('prog-change');
            });
        }

        var heightPerRow, visibleRows, containerHeight;

        // These items are to be hidden from thee Property Status list and remain checked
        if (
            cfg.DisabledPropertyStatusFilterIds &&
            cfg.DisabledPropertyStatusFilterIds.length != 0
        ) {
            $list = $f.find('.checklist[data-type="propertystatus"]');
            $checkboxes = $list.find('input[type="checkbox"]');

            // Show all items in check list as they may have been hidden when viewing another report
            $list.find('input[type="checkbox"]').each(function (i, v) {
                $(v).closest('.item').show();
            });

            // Force tick disabled items and hide them
            $.each(cfg.DisabledPropertyStatusFilterIds, function (i, v) {
                var $t = $list.find(
                    '.item[data-id="' + v + '"] input[type="checkbox"]'
                );
                $t.prop('checked', true).trigger('prog-change');
                $t.closest('.item').hide();
            });

            // Resize height of filter container to accomodate the visible items
            heightPerRow = 21;
            visibleRows = $list.find('.item:visible').length;
            containerHeight = visibleRows * heightPerRow + 'px';
            $list.height(containerHeight);
        } else {
            $list = $f.find('.checklist[data-type="propertystatus"]');
            $list.find('input[type="checkbox"]').each(function (i, v) {
                $(v).closest('.item').show();
            });

            // Resize height of filter container to accomodate the visible items
            heightPerRow = 21;
            visibleRows = $list.find('.item:visible').length;
            containerHeight = visibleRows * heightPerRow + 'px';
            $list.height(containerHeight);
        }

        // Tenancy Status
        if (
            cfg.ExcludedTenancyStatues &&
            cfg.ExcludedTenancyStatues.length != 0
        ) {
            $list = $f.find('.checklist[data-type="tenancystatustype"]');
            $checkboxes = $list.find('input[type="checkbox"]');
            //Untick all.
            $checkboxes.prop('checked', true).trigger('prog-change');
            //Tick selected.
            $.each(cfg.ExcludedTenancyStatues, function (i, v) {
                var $t = $list.find(
                    '.item[data-id="' + v + '"] input[type="checkbox"]'
                );
                $t.prop('checked', false).trigger('prog-change');
            });
        } else {
            $list = $f.find('.checklist[data-type="tenancystatustype"]');
            //Tick them all.
            $list.find('input[type="checkbox"]').each(function (i, v) {
                $(v).prop('checked', true).trigger('prog-change');
            });
        }

        // These items are to be hidden from thee Tenancy Status list and remain checked
        if (
            cfg.DisabledTenancyStatusFilterIds &&
            cfg.DisabledTenancyStatusFilterIds.length != 0
        ) {
            $list = $f.find('.checklist[data-type="tenancystatustype"]');
            $checkboxes = $list.find('input[type="checkbox"]');

            // Show all items in check list as they may have been hidden when viewing another report
            $list.find('input[type="checkbox"]').each(function (i, v) {
                $(v).closest('.item').show();
            });

            // Force tick disabled items and hide them
            $.each(cfg.DisabledTenancyStatusFilterIds, function (i, v) {
                var $t = $list.find(
                    '.item[data-id="' + v + '"] input[type="checkbox"]'
                );
                $t.prop('checked', true).trigger('prog-change');
                $t.closest('.item').hide();
            });

            // Resize height of filter container to accomodate the visible items
            heightPerRow = 21;
            visibleRows = $list.find('.item:visible').length;
            containerHeight = (visibleRows * heightPerRow) / 2 + 'px';
            $list.height(containerHeight);
        } else {
            $list = $f.find('.checklist[data-type="tenancystatustype"]');
            $list.find('input[type="checkbox"]').each(function (i, v) {
                $(v).closest('.item').show();
            });
            // Resize height of filter container to accomodate the visible items
            heightPerRow = 21;
            visibleRows = $list.find('.item:visible').length;
            containerHeight = (visibleRows * heightPerRow) / 2 + 'px';
            $list.height(containerHeight);
        }

        // Management Type Status
        if (
            cfg.ExcludedPropertyManagementTypes &&
            cfg.ExcludedPropertyManagementTypes.length != 0
        ) {
            $list = $f.find('.checklist[data-type="managementtype"]');
            $checkboxes = $list.find('input[type="checkbox"]');
            //Untick all.
            $checkboxes.prop('checked', true).trigger('prog-change');
            //Tick selected.
            $.each(cfg.ExcludedPropertyManagementTypes, function (i, v) {
                var $t = $list.find(
                    '.item[data-id="' + v + '"] input[type="checkbox"]'
                );
                $t.prop('checked', false).trigger('prog-change');
            });
        } else {
            $list = $f.find('.checklist[data-type="managementtype"]');
            //Tick them all.
            $list.find('input[type="checkbox"]').each(function (i, v) {
                $(v).prop('checked', true).trigger('prog-change');
            });
        }

        // These items are to be hidden from the Management Type Status list and remain checked
        if (
            cfg.DisabledPropertyManagementStatusFilterIds &&
            cfg.DisabledPropertyManagementStatusFilterIds.length != 0
        ) {
            $list = $f.find('.checklist[data-type="managementtype"]');
            $checkboxes = $list.find('input[type="checkbox"]');

            // Show all items in check list as they may have been hidden when viewing another report
            $list.find('input[type="checkbox"]').each(function (i, v) {
                $(v).closest('.item').show();
            });

            // Force tick disabled items and hide them
            $.each(
                cfg.DisabledPropertyManagementStatusFilterIds,
                function (i, v) {
                    var $t = $list.find(
                        '.item[data-id="' + v + '"] input[type="checkbox"]'
                    );
                    $t.prop('checked', true).trigger('prog-change');
                    $t.closest('.item').hide();
                }
            );

            // Resize height of filter container to accomodate the visible items
            heightPerRow = 21;
            visibleRows = $list.find('.item:visible').length;
            containerHeight = visibleRows * heightPerRow + 'px';
            $list.height(containerHeight);
        } else {
            $list = $f.find('.checklist[data-type="managementtype"]');
            $list.find('input[type="checkbox"]').each(function (i, v) {
                $(v).closest('.item').show();
            });
            // Resize height of filter container to accomodate the visible items
            heightPerRow = 21;
            visibleRows = $list.find('.item:visible').length;
            containerHeight = visibleRows * heightPerRow + 'px';
            $list.height(containerHeight);
        }

        // Landlord Overseas during tax period
        $f.find('#LandlordOverseas')
            .val(cfg.LandlordOverseas ? 'True' : 'False')
            .trigger('prog-change');

        // Consents
        var $consents = $f.find('.report-associated-consents');
        $consents
            .find('input[type="checkbox"][data-value]')
            .prop('checked', false);
        function showConsents(chosenConsentSettings, type) {
            var $consentFilters = $consents.find(
                '.filterby-row[data-type="consents"][data-consent-type="{0}"]'.format(
                    type
                )
            );
            _.each(chosenConsentSettings, function (consentFlag) {
                $consentFilters
                    .find(
                        'input[type="checkbox"][data-value="{0}"]'.format(
                            consentFlag
                        )
                    )
                    .prop('checked', true);
            });
        }
        showConsents(cfg.Consents.PropertyMatching, 'PropertyMatching');
        showConsents(cfg.Consents.GeneralMarketing, 'GeneralMarketing');
        showConsents(cfg.Consents.ConveyancingServices, 'ConveyancingServices');
        showConsents(cfg.Consents.FinancialServices, 'FinancialServices');
        showConsents(cfg.Consents.MoveIt, 'MoveIt');
        showConsents(
            cfg.Consents.RelocationAgentNetwork,
            'RelocationAgentNetwork'
        );
        showConsents(
            cfg.Consents.KeyfloViewingNotifications,
            'KeyfloViewingNotifications'
        );

        //Columns
        $list = $f.find(
            '.checklist[data-type="columns"], .checklist[data-type="addcolumns"]'
        );
        count = $list.find('input[type="checkbox"]').length;
        var $addColumnContainer = $f.find('.add-column-container');

        if (cfg.ExcludedColumnIds && cfg.ExcludedColumnIds.length != 0) {
            //Tick all.
            $list.find('input[type="checkbox"]').each(function (i, v) {
                $(v).prop('checked', true).trigger('prog-change');
            });
            //Untick selected (note that this is different to the users and branches, which are ticked).
            $.each(cfg.ExcludedColumnIds, function (i, v) {
                var $t = $list.find(
                    '.item[data-id="' + v + '"] input[type="checkbox"]'
                );
                $t.prop('checked', false).trigger('prog-change');
            });
            $f.find('.cols-header .insight').text(
                count - cfg.ExcludedColumnIds.length + ' of ' + count
            );
        } else {
            //Tick them all.
            $list.find('input[type="checkbox"]').each(function (i, v) {
                $(v).prop('checked', true).trigger('prog-change');
            });
            $f.find('.cols-header .insight').text(count + ' of ' + count);
        }

        // Show the Add Column button if there are any extra columns
        if (
            !$f.find('.checklist[data-type="addcolumns"] .content').children()
                .length
        ) {
            $addColumnContainer.hide();
        } else {
            $addColumnContainer.show();
        }

        //Property Specific.
        $f.find('#PropertyOverseas')
            .val(cfg.PropertyOverseas ? 'True' : 'False')
            .trigger('prog-change');
        $f.find('#PropertyRecordTypeId')
            .val(cfg.PropertyRecordTypeId)
            .trigger('prog-change');

        me.$root.on('change', '.row.daily input[type="checkbox"]', function () {
            me.tickCheckbox($(this));
        });

        me.$root.on(
            'change',
            '.sendto-owner > input[type="checkbox"]',
            function () {
                me.tickCheckbox($(this));
            }
        );

        me.$root.on(
            'change',
            '.monthly.options input[name="Config.Schedule.FrequencySubId"]',
            function () {
                me.disableMonthlyOptionsSelectionsOtherThan($(this).val());
                me.enableMonthlyOptionsSelectionsFor($(this).val());
            }
        );

        if (cfg.Schedule != null) {
            //SendToReportOwner
            var sendToReportOwner = $f.find(
                "input[name*='Config.Schedule.SendToReportOwner']"
            );
            sendToReportOwner
                .val(cfg.Schedule.SendToReportOwner ? 'True' : 'False')
                .trigger('prog-change');
            sendToReportOwner.prop('checked', cfg.Schedule.SendToReportOwner);

            var sendToReportOwnerParent = sendToReportOwner.parent();
            sendToReportOwnerParent.removeClass('ticked');
            sendToReportOwnerParent
                .addClass(cfg.Schedule.SendToReportOwner ? 'ticked' : '')
                .trigger('prog-change');

            var sendToOtherPeople = $f.find('#sendToOtherPeople');
            sendToOtherPeople
                .val(cfg.Schedule.ToUserIds.length > 0 ? 'True' : 'False')
                .trigger('prog-change');
            sendToOtherPeople.prop(
                'checked',
                cfg.Schedule.ToUserIds.length > 0
            );

            var sendToOtherPeopleParent = sendToOtherPeople.parent();
            sendToOtherPeopleParent.removeClass('ticked');
            sendToOtherPeopleParent
                .addClass(cfg.Schedule.ToUserIds.length > 0 ? 'ticked' : '')
                .trigger('prog-change');

            var usersDropDown = $f.find('.report-schedule-users');
            usersDropDown.removeClass('locked');
            usersDropDown
                .addClass(cfg.Schedule.ToUserIds.length > 0 ? '' : 'locked')
                .trigger('prog-change');

            //reset all!
            usersDropDown
                .find('.body input[type="checkbox"]')
                .val('false')
                .prop('checked', false);
            usersDropDown.find('.body .item .ticked').removeClass('ticked');
            var dropdowncontrol = usersDropDown.find('.head');
            me.hideMultiSelect(dropdowncontrol);

            //Tick users that have been selected.
            if (cfg.Schedule.ToUserIds.length > 0) {
                usersDropDown
                    .find('.body input[type="checkbox"]')
                    .each(function (i, v) {
                        var dataid = $(v).parent().attr('data-id');
                        if (
                            cfg.Schedule.ToUserIds.indexOf(parseInt(dataid)) >
                            -1
                        ) {
                            $(v).prop('checked', true);
                            $(v).parent().addClass('ticked');
                        }
                    });
            }

            usersDropDown
                .find('.head .label')
                .html(
                    'Status: ' +
                        cfg.Schedule.ToUserIds.length +
                        ' of ' +
                        usersDropDown.find('.body input[type="checkbox"]')
                            .length +
                        ' selected'
                );
            usersDropDown.find('.head .eye').addClass('on');

            $f.find('#Config_Schedule_ReportFormat').val(
                cfg.Schedule.ReportFormat
            );
            $f.find('#Config_Schedule_ReportFormat').change();

            //frequency
            $f.find('#Config_Schedule_FrequencyId').val(
                cfg.Schedule.FrequencyId
            );
            $f.find('#Config_Schedule_FrequencyId').change();

            //daily
            $f.find('#Config_Schedule_WeekdaysOnly')
                .prop('checked', cfg.Schedule.WeekdaysOnly)
                .change();

            //weekly
            if (cfg.Schedule.WeekDays.length > 0) {
                $f.find('.freq_weekly input[type="checkbox"]').each(function (
                    i,
                    v
                ) {
                    //Sunday=1 and is first in the list!
                    if (cfg.Schedule.WeekDays.indexOf(i) > -1) {
                        $(v).parent().addClass('ticked');
                    }
                });
            }

            //monthly
            $f.find('#Config_Schedule_OccurrenceDay').val(
                cfg.Schedule.OccurrenceDay
            );
            $f.find('#Config_Schedule_OccurrenceWeekNo').val(
                cfg.Schedule.OccurrenceWeekNo
            );
            $f.find('#Config_Schedule_OccurrenceWeekDay').val(
                cfg.Schedule.OccurrenceWeekDay
            );
            if (cfg.Schedule.OccurrenceDay > 0) {
                $f.find('#Config_Schedule_OccurrenceDay').change();
                $f.find(
                    '.monthly.options input[name="Config.Schedule.FrequencySubId"][value="' +
                        C.RecurringDiaryEventScheduleType.DailyEveryNDays +
                        '"]'
                ).click();
            } else {
                $f.find('#Config_Schedule_OccurrenceWeekNo').change();
                $f.find('#Config_Schedule_OccurrenceWeekDay').change();
                $f.find(
                    '.monthly.options input[name="Config.Schedule.FrequencySubId"][value="' +
                        C.RecurringDiaryEventScheduleType.DailyEveryWeekday +
                        '"]'
                ).click();
            }

            //Start
            $f.find('#Config_Schedule_StartDate').val(
                new Date(cfg.Schedule.StartDate.match(/\d+/)[0] * 1).toString(
                    'dd/MM/yyyy'
                )
            );
            //end
            $f.find('#Config_Schedule_EndDate').val(
                new Date(cfg.Schedule.EndDate.match(/\d+/)[0] * 1).toString(
                    'dd/MM/yyyy'
                )
            );
            //Time
            var schedtime =
                ('0' + cfg.Schedule.ScheduledTime.Hours).substr(-2) + ':00';
            $f.find('#Config_Schedule_ScheduledTime').val(schedtime);
            $f.find('#Config_Schedule_ScheduledTime')
                .next('.customStyleSelectBox')
                .children()
                .text(schedtime);
        } else {
            //SendToReportOwner
            $f.find('#Config_Schedule_SendToReportOwner')
                .parent()
                .removeClass('ticked');
            $f.find("input[name*='Config.Schedule.SendToReportOwner']").val(
                'False'
            );
            $f.find("input[name*='Config.Schedule.SendToReportOwner']").prop(
                'checked',
                false
            );

            $f.find('#sendToOtherPeople').parent().removeClass('ticked');
            $f.find('#sendToOtherPeople').val('False');
            $f.find('#sendToOtherPeople').prop('checked', false);

            me.clearScheduledReportUserSelection();

            $f.find('#Config_Schedule_ReportFormat')
                .val(C.ReportFormatType.Excel)
                .change();

            me.clearScheduledReportFrequencySelection();

            $f.find('#Config_Schedule_FrequencyId')
                .val(C.RecurringDiaryEventScheduleType.DailyEveryNDays)
                .change();

            $f.find('#Config_Schedule_StartDate').val('');
            $f.find('#Config_Schedule_EndDate').val('');

            $f.find('.time-picker').val('00:00');
            $f.find('.time-picker')
                .next('.customStyleSelectBox')
                .children()
                .text('00:00');
            $f.find('.report-schedule-users .head .label').html(
                'Status: 0 of ' +
                    $f.find(
                        '.report-schedule-users .body input[type="checkbox"]'
                    ).length +
                    ' selected'
            );
            //Time
        }

        //Fee Export Date
        if (cfg.FeeExportDateType != 0) {
            $f.find('#FeeExportDateType')
                .val(cfg.FeeExportDateType)
                .trigger('prog-change');
        } else {
            var feeExportDateTypeOption = $f
                .find('#FeeExportDateType option')
                .first();
            $f.find('#FeeExportDateType')
                .val(feeExportDateTypeOption.attr('value'))
                .trigger('prog-change');
        }

        //Fee Export Profile
        if (cfg.FeeExportProfileId != 0) {
            $f.find('#FeeExportProfileId')
                .val(cfg.FeeExportProfileId)
                .trigger('prog-change');
        } else {
            var feeExportProfileIdOption = $f
                .find('#FeeExportProfileId option')
                .first();
            $f.find('#FeeExportProfileId')
                .val(feeExportProfileIdOption.attr('value'))
                .trigger('prog-change');
        }
    },

    setReportColumns: function (cols, cfg) {
        var me = this;
        var $cols = me.$root.find('.checklist[data-type="columns"] .body');
        var $extraCols = me.$root.find(
            '.checklist[data-type="addcolumns"] .content'
        );
        var $sortBy = me.$root.find('#OrderByColumnId');
        var $groupBy = me.$root.find('#GroupByColumnId');

        var $t = me.$root.find('#column-checklist-item-template');
        $cols.empty();
        $extraCols.empty();
        $sortBy.empty();
        $groupBy.empty();

        $groupBy.append('<option value="0">None</option>');

        //Columns, OrderBy and GroupBy
        $.each(cols, function (i) {
            var $r = $t.clone();
            $r.removeAttr('id');
            $r.attr('data-id', cols[i].Id);
            $r.find('.label').text(cols[i].Label);
            $r.find('input[type="checkbox"]').val(cols[i].Id);

            //Append non-hidden columns to column list.
            if (!cols[i].Hide) {
                if (
                    !cols[i].IsPreSelected &&
                    cfg.ExcludedColumnIds.includes(cols[i].Id)
                ) {
                    $r.find('input[type="checkbox"]').addClass('modal-input');
                    $extraCols.append($r);
                } else {
                    $cols.append($r);
                }

                //Allow to orderby list (if allowed)
                if (cols[i].AllowOrderBy === true) {
                    $sortBy.append(
                        '<option value="' +
                            cols[i].Id +
                            '">' +
                            cols[i].Label +
                            '</option>'
                    );
                }

                //Allow to groupby list (if allowed)
                if (cols[i].AllowGroupBy === true) {
                    $groupBy.append(
                        '<option value="' +
                            cols[i].Id +
                            '">' +
                            cols[i].Label +
                            '</option>'
                    );
                }
            }
        });

        $cols.find('.item').show();
        $extraCols.find('.item').show();
    },

    clearScheduledReportUserSelection: function () {
        var me = this;
        var $f = me.$root.find('#config-form');
        var usersDropDown = $f.find('.report-schedule-users');
        usersDropDown
            .find('.head .label')
            .html(
                'Status: 0 of ' +
                    usersDropDown.find('.body input[type="checkbox"]').length +
                    ' selected'
            );

        $f.find('.report-schedule-users .body input[type="checkbox"]').each(
            function () {
                $(this).parent().removeClass('ticked');
                $(this).val('false');
                $(this).prop('checked', false);
            }
        );
    },

    clearScheduledReportFrequencySelection: function () {
        var me = this;
        var $f = me.$root.find('#config-form');
        $f.find('.weekly .col-2 input[type="checkbox"]').each(function () {
            $(this).parent().removeClass('ticked');
            $(this).val('false');
            $(this).prop('checked', false);
        });

        $f.find(
            '.daily.options input[name="Config.Schedule.WeekdaysOnly"]'
        ).each(function () {
            $(this).parent().removeClass('ticked');
            $(this).val('false');
            $(this).prop('checked', false);
        });

        $f.find('#Config_Schedule_OccurrenceDay').val(0);
        $f.find('#Config_Schedule_OccurrenceWeekNo').val(0);
        $f.find('#Config_Schedule_OccurrenceWeekDay').val(0);

        $f.find('.monthly select').each(function () {
            me.setSelectNthOption($(this), 1);
        });

        $f.find(
            '.monthly.options input[name="Config.Schedule.FrequencySubId"][value="' +
                C.RecurringDiaryEventScheduleType.DailyEveryNDays +
                '"]'
        ).click();
    },

    tickCheckbox: function (checkbox) {
        var setChecked = checkbox.prop('checked');
        checkbox.val(setChecked);
        checkbox.next('input[type="hidden"]').val(setChecked);
        setChecked
            ? checkbox.parent().addClass('ticked')
            : checkbox.parent().removeClass('ticked');
    },

    disableMonthlyOptionsSelectionsOtherThan: function (value) {
        var me = this;
        var $f = me.$root.find('#config-form');

        $f.find(
            '.monthly.options input[name="Config.Schedule.FrequencySubId"][value!="' +
                value +
                '"]'
        ).each(function () {
            $(this)
                .parent()
                .find('select')
                .each(function () {
                    me.setSelectNthOption($(this), 1);
                    $(this).prop('disabled', 'disabled');
                    $(this)
                        .parent()
                        .find('.customStyleSelectBox')
                        .addClass('select-prohibited');
                });
        });
    },

    enableMonthlyOptionsSelectionsFor: function (value) {
        var me = this;
        var $f = me.$root.find('#config-form');

        $f.find(
            '.monthly.options input[name="Config.Schedule.FrequencySubId"][value="' +
                value +
                '"]'
        ).each(function () {
            $(this)
                .parent()
                .find('select')
                .each(function () {
                    $(this).removeAttr('disabled');
                    $(this)
                        .parent()
                        .find('.customStyleSelectBox')
                        .removeClass('select-prohibited');
                });
        });
    },

    setSelectNthOption: function (select, index) {
        var option = select.find(':nth-child(' + index + ')');
        option.prop('selected', true);
        select
            .siblings('.customStyleSelectBox')
            .children('.customStyleSelectBoxInner')
            .html(option.text());
    },

    prepareConfigForm: function () {
        var me = this;

        var html;
        var $c = me.$root.find('.report-config');
        var $dfs = $c.find('#DynamicFormSection');
        $dfs.empty();

        // Merge the two columns together
        var $addColumnsClone = $c.find('.checklist[data-type="addcolumns"] .content').clone();
        var $contentClone = $c.clone();
        $contentClone.find('.checklist[data-type="columns"] .body').append($addColumnsClone);

        var addCheckListHtml = function ($f, dataType, checked, name) {
            html = ''; // NOTE: this means that the HTML is reset for each group of checkboxes, so earlier groups are NOT ADDED
            var $items = $contentClone.find(
                '.checklist[data-type="' +
                    dataType +
                    '"] input[type="checkbox"]' +
                    (checked ? ':checked' : ':not(:checked)') +
                    ''
            );
            $items.each(function (i, v) {
                var id = parseInt($(v).val());
                html +=
                    '<input type="hidden" name="Config.' +
                    name +
                    '[' +
                    i +
                    ']" value="' +
                    id +
                    '"/>';
            });
            $f.append(html);
        };

        // NOTE: see move above - only ExcludedColumnIds are captured
        addCheckListHtml($dfs, 'branches', true, 'BranchIds');
        addCheckListHtml($dfs, 'users', true, 'UserIds');
        addCheckListHtml($dfs, 'columns', false, 'ExcludedColumnIds');
        addCheckListHtml(
            $dfs,
            'landlordincometypes',
            false,
            'LandlordIncomeTypes'
        );
        addCheckListHtml($dfs, 'epcratings', false, 'ExcludedEPCRatings');
        addCheckListHtml(
            $dfs,
            'propertystatus',
            false,
            'ExcludedPropertyStatus'
        );
        addCheckListHtml(
            $dfs,
            'tenancystatustype',
            false,
            'ExcludedTenancyStatues'
        );
        addCheckListHtml(
            $dfs,
            'managementtype',
            false,
            'ExcludedPropertyManagementTypes'
        );
        addCheckListHtml(
            $dfs,
            'contactcategorytypes',
            false,
            'ContactCategoryTypes'
        );

        var consentHtml = '';
        var $items = $c.find(
            '.report-associated-consents input[type="checkbox"]:checked'
        );
        $items.each(function (i, v) {
            var name = $(v).attr('name');
            consentHtml +=
                '<input type="hidden" name="Config.Consents.' +
                name +
                '" value="true"/>';
        });
        $dfs.append(consentHtml);

        $items.each(function (i, v) {
            var name = $(v).attr('name');
            var value = $(v).attr('value');
            consentHtml +=
                '<input type="hidden" name="Config.Consents.' +
                name +
                '" value="' +
                value +
                '"/>';
        });
        $dfs.append(consentHtml);

        var $sched = $c.find('.report-schedule-container');

        //clean up old inputs
        $sched.find('input[name*="Config.Schedule.WeekDays"]').remove();
        $sched.find('input[name*="Config.Schedule.ToUserIds"]').remove();
        $sched.find('input[name*="Config.ExcludedColumnIds"]').remove();
        $sched.find('input[name*="Config.LandlordIncomeTypes"]').remove();
        $sched.find('input[name*="Config.ExcludedEPCRatings"]').remove();
        $sched.find('input[name*="Config.ExcludedPropertyStatus"]').remove();
        $sched.find('input[name*="Config.ExcludedTenancyStatues"]').remove();
        $sched
            .find('input[name*="Config.ExcludedPropertyManagementTypes"]')
            .remove();
        $sched.find('input[name*="Config.ContactCategoryTypes"]').remove();

        var indexWd = 0;
        $sched.find('.freq_weekly').each(function (i) {
            if ($(this).hasClass('ticked')) {
                html +=
                    '<input type="hidden" name="Config.Schedule.WeekDays[' +
                    indexWd +
                    ']" value="' +
                    i +
                    '"/>';
                indexWd++;
            }
        });

        me.$root
            .find('.report-schedule-users.checklist .item .ticked')
            .each(function (i, v) {
                html +=
                    '<input type="hidden" name="Config.Schedule.ToUserIds[' +
                    i +
                    ']" value="' +
                    $(v).attr('data-id') +
                    '"/>';
            });

        $sched.append(html);
    },

    renameReportConfiguration: function ($row, recordId, currentName) {
        var me = this;

        gmgps.cloud.helpers.general.promptForString(
            'Name',
            currentName,
            'Rename Custom Report',
            function (value) {
                if (value != '') {
                    //Update form and save.
                    me.$root.find('.report-config #Config_Name').val(value);
                    me.saveReportConfiguration(true, function () {
                        //Update row.
                        $row.find('.use-config-link').text(value);
                        $row.attr(
                            'data-savedreportname',
                            value.replace(/ /g, '-')
                        );
                    });
                }
            }
        );
    },

    deleteReportConfiguration: function (recordId, callback) {
        var after = function () {
            new gmgps.cloud.http("reporting-deleteReportConfiguration").ajax(
                {
                    args: {
                        recordId: recordId
                    },
                    dataType: 'json',
                    type: 'post',
                    url: '/Reporting/DeleteReportConfiguration'
                },
                function () {
                    callback();
                }
            );
        };

        showDialog({
            type: 'question',
            title: 'Delete Custom Report?',
            msg: 'Are you sure you would you like to delete this custom report?',
            buttons: {
                Yes: function () {
                    $(this).dialog('close');
                    after();
                },
                No: function () {
                    $(this).dialog('close');
                }
            }
        });
    },

    selectReportConfiguration: function ($row) {
        var me = this;

        $row.closest('.item').find('.header').removeClass('selected');

        if (me.filterSections.$options.is(':visible')) {
            me.resetAccordions();
        }

        //Position the pointer.
        var $oldRow = $row.closest('.config-table').find('.config-row');

        $oldRow.removeClass('on');
        $oldRow.find('.tools').hide();

        $row.addClass('on');
        $row.find('.tools').show();

        me.setReportInfo(
            $row.closest('.item').find('.header .name').text(),
            $row.find('.use-config-link').text()
        );

        $row.closest('.item')
            .find('#pointer')
            .css('top', $row.position().top + 4);

        //Setup config panel.
        var cfg = $.parseJSON($row.attr('data-config'));
        var colsCfg = $.parseJSON($row.closest('.item').attr('data-cols'));

        me.setConfig(cfg, colsCfg);
        me.setDirty(false);
    },

    getList: function (args, onSuccess) {
        var me = this;

        me.lastSearchArgs = args;

        new gmgps.cloud.http("reporting-getList").ajax(
            {
                args: args.search,
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/Reporting/GetReportList',
                listType: C.ListType.Standard
            },
            function (response) {
                //Response processing.
                if (args.query != '') {
                    var regex = new RegExp('(' + args.query + ')', 'gi');
                    response.Data = response.Data.replace(regex, function (m) {
                        return '<span class="query-highlight">' + m + '</span>';
                    });
                }

                me.displayList(response, args.$panelItem, args.selectedIds);
                onSuccess();
            },
            function (error) {
                alert(error);
            }
        );
    },

    resetAccordions: function () {
        var me = this;

        var accordions = me.$root.find('.accordion .ui-accordion-content');
        var accordionIcons = me.$root.find('.ui-accordion-header-icon');
        var firstAccordion = accordions.first();

        firstAccordion.slideDown();
        accordionIcons.first().addClass('ui-icon-triangle-1-s');

        accordions.not(':first').slideUp();
        accordionIcons.not(':first').removeClass('ui-icon-triangle-1-s');
    },

    getListOfRecentReports: function () {
        var me = this;

        $.ajax({
            url: 'Property/GetPendingReports',
            type: 'POST',
            dataType: 'json',
            data: {},
            headers: {
                'X-Component-Name': 'reporting-getListOfRecentReports',
                'Alto-Version': alto.version
            }
        })
            .then(function (response) {
                me.displayRecentReports(response);
            })
            .catch(function (error) {
                console.log(error);
            });
    },

    displayRecentReports: function (response) {
        var me = this;
        me.$toolbar.find('#report-requests').clear().html(response.Data);
        me.$toolbar.find('#report-requests-button').addClass('dropped');
        new gmgps.cloud.ui.views.pendingReportsHandler({
            $root: me.$toolbar.find('#report-requests'),
            control: me
        }).show(true);
    },

    displayList: function (response, $panelItem, selectedIds) {
        var me = this;

        me.$root
            .find('.content-container > .content[data-id="list"]')
            .clear()
            .html(response.Data);

        me.list = new gmgps.cloud.ui.controls.list({
            $root: me.$root.find(
                '.content-container > .content[data-id="list"]'
            ),
            selectedIds: selectedIds ? selectedIds : null
        });

        var $c = me.$root.find('.report-config');
        me.filterSections = {
            $options: $c.find('.filter-section[data-type="options"]'),
            $period: $c.find('.filter-section[data-type="period"]'),
            $periodFrom: $c.find('.filter-section[data-type="period-from"]'),
            $periodTo: $c.find('.filter-section[data-type="period-to"]'),
            $weekOfYear: $c.find('.filter-section[data-type="week-of-year"]'),
            $sortBy: $c.find('.filter-section[data-type="sortby"]'),
            $sortDir: $c.find('.filter-section[data-type="sortdir"]'),
            $groupBy: $c.find('.filter-section[data-type="groupby"]'),
            $orientation: $c.find('.filter-section[data-type="orientation"]'),
            $includeUsersWithoutBranchPermissions: $c.find(
                '.filter-section[data-type="includeUsersWithoutBranchPermissions"]'
            ),

            $branches: $c.find('.filter-section[data-type="branches"]'),
            $users: $c.find('.filter-section[data-type="users"]'),
            $columns: $c.find('.filter-section[data-type="columns"]'),
            $consents: $c.find('.filter-section[data-type="consents"]'),

            $applicantDisposal: $c.find(
                '.filter-section[data-type="applicantDisposal"]'
            ),
            $applicantSituation: $c.find(
                '.filter-section[data-type="applicantSituation"]'
            ),

            $propertyRecordType: $c.find(
                '.filter-section[data-type="propertyRecordType"]'
            ),
            $propertyCategory: $c.find(
                '.filter-section[data-type="propertyCategory"]'
            ),
            $propertyOverseas: $c.find(
                '.filter-section[data-type="propertyOverseas"]'
            ),
            $archived: $c.find('.filter-section[data-type="archived"]'),
            $customFilterBy: $c.find('.filter-section[data-type="filterby"]'),
            $dateFilterBy: $c.find('.filter-section[data-type="datefilterby"]'),
            $customFilterBy2: $c.find('.filter-section[data-type="filterby2"]'),
            $customFilterBy3: $c.find('.filter-section[data-type="filterby3"]'),
            $landlordIncomeTypes: $c.find(
                '.filter-section[data-type="landlordincometypes"]'
            ),
            $landlordOverseas: $c.find(
                '.filter-section[data-type="landlordOverseas"]'
            ),
            $epcRatings: $c.find('.filter-section[data-type="epcratings"]'),
            $propertyStatus: $c.find(
                '.filter-section[data-type="propertystatus"]'
            ),
            $tenancyStatus: $c.find(
                '.filter-section[data-type="tenancystatustype"]'
            ),
            $managementStatus: $c.find(
                '.filter-section[data-type="managementtype"]'
            ),
            $contactCategoryTypes: $c.find(
                '.filter-section[data-type="contactcategorytypes"]'
            ),
            $fontSize: $c.find('.filter-section[data-type="fontsize"]'),
            $feeExportProfile: $c.find(
                '.filter-section[data-type="feeExportProfile"]'
            ),
            $feeExportDateType: $c.find(
                '.filter-section[data-type="feeExportDateType"]'
            )
        };

        var selectedReport = me.report;
        if (selectedReport) {
            var $subitem = me.$root.find(
                '[data-reportname="{0}"]'.format(selectedReport)
            );

            var $subitemHeader = $subitem.find('.header');
            $subitemHeader.trigger('prog-click');
        }
    }
};
