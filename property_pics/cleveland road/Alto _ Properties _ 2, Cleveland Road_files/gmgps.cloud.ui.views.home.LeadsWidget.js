gmgps.cloud.ui.views.home.LeadsWidget = function (args, dashboard) {
    this.$root = args.$root;

    this.leadSearches = [];
    this.dashboard = dashboard;

    this.branchId = args.branchId;
    this.userId = args.userId || shell.userId;

    this.http = args.http || new gmgps.cloud.http("LeadsWidget-LeadsWidget");

    this.$applicantChart = this.$root.find('#LeadApplicantChart');
    this.$vendorChart = this.$root.find('#LeadVendorChart');

    this.$portalCounts = this.$root.find(
        '#dashboard-enquiries-headline-counts #portal-counts'
    );
    this.$valuationCount = this.$root.find(
        '#dashboard-enquiries-headline-counts .valuation-count'
    );
    this.$viewingCount = this.$root.find(
        '#dashboard-enquiries-headline-counts .viewing-count'
    );
    this.$enquiriesMessage = this.$root.find(
        '#dashboard-enquiries-headline-counts .enquiries-message'
    );

    this.showLayerCallback = function (layer, tabId) {
        alto.router.navigationChanged('home', { section: 'enquiries' });
        args.showLayerCallback(layer, tabId);
    };

    this.countUpOptions = {
        useEasing: true,
        useGrouping: true,
        separator: ','
    };

    var me = this;
    me.init();
};

gmgps.cloud.ui.views.home.LeadsWidget.typeName =
    'gmgps.cloud.ui.views.home.LeadsWidget';

gmgps.cloud.ui.views.home.LeadsWidget.prototype = {
    init: function () {
        var me = this;

        me.clearEnquiriesWidget();

        me.$root.on(
            'click',
            '#dashboard-enquiries-headline-counts .widget-body .portal-count .icon-and-count',
            function (e) {
                me.showLayerCallback(
                    'leadsdashboard',
                        $(e.target)
                            .closest('.portal-count')
                            .attr('data-leadtab')
                );
            }
        );

        me.$root.on(
            'click',
            '#dashboard-enquiries-headline-counts .widget-body .valuation-count .icon-and-count',
            function (e) {
                me.showLayerCallback(
                    'leadsdashboard',
                        $(e.target)
                            .closest('.valuation-count')
                            .attr('data-leadtab')
                );
            }
        );

        me.$root.on(
            'click',
            '#dashboard-enquiries-headline-counts .widget-body .viewing-count .icon-and-count',
            function (e) {
                me.showLayerCallback(
                    'leadsdashboard',
                        $(e.target)
                            .closest('.viewing-count')
                            .attr('data-leadtab')
                );
            }
        );
    },

    refresh: function () {
        var me = this;

        return me.http.ajax(
            {
                args: {
                    branchId: me.branchId
                },
                background: true,
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/Home/GetLeadsCounts'
            },
            function (response) {
                if (response && response.Data) {
                    me.renderEnquiriesData(response.Data.EnquiriesData);
                }
            }
        );
    },

    clearEnquiriesWidget: function () {
        var me = this;

        me.$portalCounts.find('.portal-count').hide();
        me.$portalCounts.hide();
        me.$valuationCount.hide();
        me.$viewingCount.hide();
        me.$enquiriesMessage.hide();
    },

    renderEnquiriesData: function (enquiriesData) {
        var me = this;

        me.clearEnquiriesWidget();

        if (
            !enquiriesData ||
            $.isEmptyObject(enquiriesData) ||
            enquiriesData.length === 0
        ) {
            me.$enquiriesMessage.find('.icon').removeClass('fa-ban');
            me.$enquiriesMessage
                .find('.message')
                .html('You have no enquiries to process');
            me.$enquiriesMessage.show();
        } else {
            for (var enquiryData in enquiriesData) {
                // eslint-disable-next-line no-prototype-builtins
                if (!enquiriesData.hasOwnProperty(enquiryData)) continue;

                var data = enquiriesData[enquiryData];

                if (data.LeadType === C.LeadType.MarketAppraisalEnquiry) {
                    me.renderNonPortalEnquiries(data, me.$valuationCount);
                } else if (data.LeadType === C.LeadType.ViewingEnquiry) {
                    me.renderNonPortalEnquiries(data, me.$viewingCount);
                } else {
                    me.renderPortalEnquiries(data, me.$portalCounts);
                }
            }
        }
    },

    renderPortalEnquiries: function (enquiryData, target) {
        var me = this;

        target.show();

        if (enquiryData.DisplayMessage) {
            me.$enquiriesMessage.find('.icon').addClass('fa-ban');
            me.$enquiriesMessage
                .find('.message')
                .html(enquiryData.DisplayMessage);
            me.$enquiriesMessage.show();
            return;
        }

        var countTarget = target.find(
            '.portal-count[data-sourcetype="' + enquiryData.LeadSource + '"]'
        );

        if (countTarget.length > 0) {
            countTarget.show();

            me.renderCount(countTarget.find('.count .value')[0], enquiryData.Count);
        }
    },

    renderNonPortalEnquiries: function (enquiryData, target) {
        var me = this;

        var countTarget = target.find('.count');

        countTarget.find('.icon').hide();
        countTarget.find('.text').show();
        countTarget.find('.message').html('');
        countTarget.find('.value').html('-');

        target.show();

        if (enquiryData.DisplayMessage) {
            countTarget.find('.icon').show();
            countTarget.find('.text').hide();
            countTarget.find('.message').html(enquiryData.DisplayMessage);
            countTarget.find('.value').html('');
            return;
        }

        me.renderCount(target.find('.count .value')[0], enquiryData.Count);
    },

    renderCount: function (valueElement, endValue) {
        var me = this;
        var countUp = new CountUp(
            valueElement,
            0,
            endValue,
            0,
            0.7,
            me.countUpOptions
        );
        countUp.start();
    },

    renderApplicantChart: function ($target, applicantLeadSources) {
        var me = this;

        var leadCounts = applicantLeadSources.LeadCounts;

        if (
            !leadCounts ||
            $.isEmptyObject(leadCounts) ||
            leadCounts.length === 0
        ) {
            if (applicantLeadSources.FeatureDisabledForAllBranches) {
                me.setNotConfiguredMessage(
                    'Portal applicant enquiries not enabled for ' +
                        (me.branchId !== 0
                            ? 'the selected branch'
                            : 'any branches'),
                    $target
                );
            } else if (applicantLeadSources.FeatureDisabledForSelectedBranch) {
                me.setNotConfiguredMessage(
                    'Portal applicant enquiries not enabled for the selected branch',
                    $target
                );
            } else {
                me.setNoDataMessage(
                    'You currently have no pending portal applicant enquiries for ' +
                        (me.branchId !== 0
                            ? 'the selected branch'
                            : 'any branches'),
                    $target
                );
            }

            return void 0;
        }

        me.clearMessage($target);

        var chart = new google.visualization.PieChart($target[0]);

        google.visualization.events.addListener(chart, 'select', function () {
            me.showLayerCallback(
                'leadsdashboard',
                $target.attr('data-leadtab')
            );
        });

        chart.draw(applicantLeadSources.dataTable, {
            title: 'Portal Applicant Enquiries ({0})'.format(
                applicantLeadSources.total
            ),
            titleTextStyle: { color: '#11b1d9', fontSize: 15 },
            chartArea: { left: 0, top: 60, bottom: 10, width: '100%' },
            legend: { position: 'top' },
            pieHole: 0.5,
            is3D: false,
            slices: applicantLeadSources.slicesColor,
            backgroundColor: 'transparent',
            tooltip: {
                text: 'percentage',
                isHtml: true,
                textStyle: {
                    fontName: 'Verdana',
                    fontSize: 12,
                    bold: true
                }
            }
        });
    },

    renderVendorChart: function ($target, vendorLeadSources) {
        var me = this;

        var leadCounts = vendorLeadSources.LeadCounts;

        if (
            !leadCounts ||
            $.isEmptyObject(leadCounts) ||
            leadCounts.length === 0
        ) {
            if (vendorLeadSources.FeatureDisabledForAllBranches) {
                me.setNotConfiguredMessage(
                    'PropertyFile market appraisals enquiries not enabled for ' +
                        (me.branchId !== 0
                            ? 'the selected branch'
                            : 'any branches'),
                    $target
                );
            } else if (vendorLeadSources.FeatureDisabledForSelectedBranch) {
                me.setNotConfiguredMessage(
                    'PropertyFile market appraisals enquiries not enabled for the selected branch',
                    $target
                );
            } else {
                me.setNoDataMessage(
                    'You currently have no pending market appraisal enquiries for ' +
                        (me.branchId !== 0
                            ? 'the selected branch'
                            : 'any branches'),
                    $target
                );
            }

            return void 0;
        }

        me.clearMessage($target);

        var chart = new google.visualization.PieChart($target[0]);

        google.visualization.events.addListener(chart, 'select', function () {
            me.showLayerCallback(
                'leadsdashboard',
                $target.attr('data-leadtab')
            );
        });

        chart.draw(vendorLeadSources.dataTable, {
            title: 'Market Appraisal Enquiries ({0})'.format(
                vendorLeadSources.total
            ),
            titleTextStyle: { color: '#11b1d9', fontSize: 15 },
            chartArea: { left: 0, top: 60, bottom: 10, width: '100%' },
            legend: { position: 'top' },
            pieHole: 0.5,
            is3D: false,
            backgroundColor: 'transparent',
            tooltip: {
                text: 'percentage',
                isHtml: true,
                textStyle: {
                    fontName: 'Verdana',
                    fontSize: 12,
                    bold: true
                }
            }
        });
    },

    setNoDataMessage: function (message, $target) {
        var content =
            '<div class="no-leads-data-to-display"><div class="outer"><div class="icon fa fa-pie-chart"></div><div class="message">{0}</div></div></div>'.format(
                message
            );

        $target.html(content);
        $target.addClass('disabled');
    },

    clearMessage: function ($target) {
        $target.empty();
        $target.removeClass('disabled');
    },

    setNotConfiguredMessage: function (message, $target) {
        var content =
            '<div class="no-leads-data-to-display"><div class="outer"><div class="icon fa fa-ban"></div><div class="message">{0}</div></div></div>'.format(
                message
            );
        $target.html(content);
        $target.addClass('disabled');
    },

    redrawCharts: function () {
        var me = this;
        return me.refresh();
    }
};
