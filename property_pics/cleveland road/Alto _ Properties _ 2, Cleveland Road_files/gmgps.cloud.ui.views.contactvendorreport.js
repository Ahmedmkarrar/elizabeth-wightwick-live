gmgps.cloud.ui.views.contactvendorreport = function (args) {
    var me = this;
    me.cfg = args;
    me.$root = args.$root;
    me.$window = null;
    me.init(args);
    me.closeMyWindow = args.closeMyWindow;

    return true;
};

gmgps.cloud.ui.views.contactvendorreport.prototype = {
    init: function () {
        var me = this;

        me.$window = me.$root.closest('.window');

        me.$root.find('select').customSelect();

        me.$root.on('change', '#due-tab .all-properties', function () {
            var checked = $(this).prop('checked') === true;

            me.$root
                .find(
                    '#due-tab .vendor-property .tickbox-hidden[data-sold="1"]'
                )
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
                .find(
                    '#adhoc-tab .vendor-property .tickbox-hidden[data-sold="1"]'
                )
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
                .find(
                    '#due-tab .vendor-property .tickbox-hidden[data-sold="1"]'
                )
                .prop('checked', !checked)
                .trigger('prog-change');
        });

        me.$root.on('change', '#due-tab #due-instructed-check', function () {
            var checked = $(this).prop('checked') === true;

            me.$root
                .find(
                    '#due-tab .vendor-property .tickbox-hidden[data-instructed="1"]'
                )
                .prop('checked', !checked)
                .trigger('prog-change');
        });

        me.$root.on('change', '#adhoc-tab #adhoc-sold-check', function () {
            var checked = $(this).prop('checked') === true;

            me.$root
                .find(
                    '#adhoc-tab .vendor-property .tickbox-hidden[data-sold="1"]'
                )
                .prop('checked', !checked)
                .trigger('prog-change');
        });

        me.$root.on(
            'change',
            '#adhoc-tab #adhoc-instructed-check',
            function () {
                var checked = $(this).prop('checked') === true;

                me.$root
                    .find(
                        '#adhoc-tab .vendor-property .tickbox-hidden[data-instructed="1"]'
                    )
                    .prop('checked', !checked)
                    .trigger('prog-change');
            }
        );

        me.$root.on(
            'change',
            '.output-format .tickbox-hidden.group',
            function () {
                me.$root
                    .find('.output-format .tickbox-hidden')
                    .not(this)
                    .prop('checked', false)
                    .trigger('prog-change');
            }
        );

        me.$root.on('change', '.select-ticks', function () {
            me.toggleChecked($(this));
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

    resizeForm: function () {
        var me = this;
        me.$root
            .find('.vendor-report-form.vendor-report-contact')
            .animate({ height: '465px' }, 500);
    },

    action: function (onComplete) {
        var me = this;

        var fromDate = '';
        var toDate = '';

        var $tab = me.$root.find('.report-tabs');
        var tabIndex = $tab.tabs('option', 'active');

        var $root = $tab.find('.ui-tabs-panel').eq(tabIndex);

        // checks commons to both tabs
        if (
            $root.find('.vendor-property .tickbox-hidden:checked').length === 0
        ) {
            showInfo('Please select at least one property');
            return false;
        }

        if (
            $root.find('.output-format .tickbox-hidden.group:checked')
                .length !== 1
        ) {
            showInfo('Please choose an output format');
            return false;
        }

        // tab specific checks
        switch (tabIndex) {
            case 0: // first tab
                break;
            case 1: // second tab
                fromDate = $root.find('#adhoc-fromdate').val();
                toDate = $root.find('#adhoc-todate').val();

                if (fromDate.length === 0) {
                    showInfo('Please supply a From Date for the report');
                    return false;
                }

                if (toDate.length === 0) {
                    showInfo('Please supply a To Date for the report');
                    return false;
                }

                break;
        }

        var args = me.getFieldValues();

        var outputType = parseInt(
            $root.find('.output-format .tickbox-hidden.group:checked').val()
        );

        // do an ajax call for email sending. Post to a new window for print processing (so PDF stream can be returned)

        if (args.SelectedProperties.length > 1) {
            me.batchProcess(outputType, args);
        } else {
            switch (outputType) {
                case 1: // email
                    new gmgps.cloud.http("contactvendorreport-action").ajax(
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
                                    args.ids.length +
                                    ' Message(s) Queued For Delivery',
                                theme: 'growl-updater growl-system',
                                life: 2000
                            });

                            if (onComplete) {
                                onComplete();
                            }
                        }
                    );
                    break;

                case 2: // print
                    var $form = gmgps.cloud.utility.buildForm(
                        'VendorReport/Print',
                        args
                    );

                    $form.submit();
                    $form.remove();

                    break;
            }
        }
    },

    cancel: function (onComplete) {
        onComplete();
    },

    getFieldValues: function () {
        var me = this;
        var fromDate, toDate, excludeMarketing, excludeTelephoneCalls;
        var ids = [];

        var $tab = me.$root.find('.report-tabs');
        var tabIndex = $tab.tabs('option', 'active');

        var $root = $tab.find('.ui-tabs-panel').eq(tabIndex);

        var activityReportType =
            tabIndex === 0
                ? C.ActivityReportType.Due
                : C.ActivityReportType.Adhoc;

        var brandId = parseInt($root.find('#BrandId').val());
        var branchId = parseInt($root.find('#BranchId').val());
        var templateId = parseInt(
            $root.find('#DefaultStationeryTemplateId').val()
        );
        var contactId = parseInt(me.$root.find('#ContactId').val());

        switch (tabIndex) {
            case 0: // due reports
                excludeMarketing = $root
                    .find('.exclude-marketing #ExcludeMarketingEventsDue')
                    .prop('checked');
                excludeTelephoneCalls = $root
                    .find('.exclude-marketing #ExcludeTelephoneCallsDue')
                    .prop('checked');
                break;

            case 1: // adhoc reports
                fromDate = $root.find('#adhoc-fromdate').val();
                toDate = $root.find('#adhoc-todate').val();
                excludeMarketing = $root
                    .find('.exclude-marketing #ExcludeMarketingEventsAdhoc')
                    .prop('checked');
                excludeTelephoneCalls = $root
                    .find('.exclude-marketing #ExcludeTelephoneCallsAdhoc')
                    .prop('checked');
                break;
        }

        $root
            .find('.vendor-property .tickbox-hidden:checked')
            .each(function (i, v) {
                var propertyId = parseInt($(v).attr('data-propertyId'));
                if (!isNaN(propertyId)) {
                    ids.push(propertyId);
                }
            });

        var outputType = parseInt(
            $root.find('.output-format .tickbox-hidden.group:checked').val()
        );

        return {
            SelectedProperties: ids,
            SelectedPropertiesToPrint: outputType === 2 ? ids : [],
            SelectedPropertiesToEmail: outputType === 1 ? ids : [],
            ActivityReportType: activityReportType,
            SelectedBrandId: brandId,
            SelectedBranchId: branchId,
            SelectedStationeryTemplateId: templateId,
            ContactId: contactId,
            StartDate: fromDate,
            EndDate: toDate,
            ExcludeMarketingEvents: excludeMarketing,
            ExcludeTelephoneCalls: excludeTelephoneCalls,
            IncludeAllVendors: false
        };
    },

    validate: function () {
        var me = this;
        var $tab = me.$root.find('.report-tabs');
        var tabIndex = $tab.tabs('option', 'active');
        var $root = $tab.find('.ui-tabs-panel').eq(tabIndex);

        if (
            $root.find('.output-format .tickbox-hidden.group:checked').length !=
            1
        ) {
            showInfo('Please choose an output format');
            return false;
        }

        if (
            $root.find('.vendor-property .tickbox-hidden:checked').length == 0
        ) {
            showInfo('Please select at least one property');
            return false;
        }

        var selection = parseInt(
            $root.find('input[type="radio"]:checked').val()
        );

        switch (tabIndex) {
            case 0: // first tab
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

    batchProcess: function (outputType, args) {
        new gmgps.cloud.http("contactvendorreport-batchProcess").ajax(
            {
                args: args,
                dataType: 'json',
                complex: true,
                type: 'post',
                async: false,
                url: 'VendorReport/Batch'
            },
            function (response) {
                if (response && response.Data) {
                    $.jGrowl('Periodic Activity Reports', {
                        header: 'Periodic Activity Report generation request submitted',
                        theme: 'growl-updater growl-system',
                        life: 2000
                    });

                    // eslint-disable-next-line no-undef
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
        $toggle
            .closest('.props-container')
            .find('input[type="checkbox"]')
            .not($toggle)
            .prop('checked', $toggle.prop('checked'))
            .trigger('change');
    }
};
