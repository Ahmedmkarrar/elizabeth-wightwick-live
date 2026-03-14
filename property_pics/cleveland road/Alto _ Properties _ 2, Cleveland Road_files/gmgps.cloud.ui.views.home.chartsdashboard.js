gmgps.cloud.ui.views.home.chartsdashboard = function (args) {
    var me = this;
    me.initialised = false;
    me.forceRefreshOnNextActivation = false;

    me.header = 'Charts';
    me.Charts_Persistance_Key = 'homepage-charts-v1.10';

    me.$root = args.$root;
    me.$chartsRoot = me.$root.find('#charts-area');
    me.$chartOptions = me.$root.find('#chart-options-root');
    me.$chartOptionsMenu = me.$root.find('#options-menu');
    me.$addChartButton = args.$addChartButton;

    me.branchId = 0 || args.branchId;
    me.userId = 0 || args.userId;

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

    me.chartBeingEdited = null;
    me.chartPosStart = null;
    me.chartRollBack = null;

    me.resizeTimer = null;

    me.chartTypes = [
        {
            id: C.HomeChartType.PieChart,
            summary: '2D Pie Chart',
            options: {
                chartArea: {
                    left: 20,
                    top: 20,
                    width: '100%',
                    height: '100%'
                },
                legend: {
                    position: 'right'
                },
                is3D: false,
                tooltip: { isHtml: true },
                sliceVisibilityThreshold: 0
            }
        },
        {
            id: C.HomeChartType.PieChart3D,
            summary: '3D Pie Chart',
            options: {
                chartArea: {
                    left: 20,
                    top: 20,
                    width: '100%',
                    height: '100%'
                },
                legend: {
                    position: 'right'
                },
                is3D: true,
                sliceVisibilityThreshold: 0,
                tooltip: { isHtml: true }
            }
        },
        {
            id: C.HomeChartType.PieChartHole,
            summary: '2D Pie Chart with Hole',
            options: {
                chartArea: {
                    left: 20,
                    top: 20,
                    width: '100%',
                    height: '100%'
                },
                legend: {
                    position: 'right'
                },
                pieHole: 0.5,
                is3D: false,
                tooltip: { isHtml: true },
                sliceVisibilityThreshold: 0
            }
        },
        {
            id: C.HomeChartType.CurvedLine,
            summary: 'Curved Line Chart',
            options: {
                chartArea: {
                    left: 20,
                    top: 20,
                    width: '100%',
                    height: '100%'
                },
                curveType: 'function',
                legend: { position: 'bottom' },
                tooltip: { isHtml: true }
            }
        },
        {
            id: C.HomeChartType.VerticalBar,
            summary: 'Bar Chart',
            options: {
                chartArea: {
                    left: 50,
                    top: 40,
                    bottom: 100,
                    right: 30,
                    width: '100%',
                    height: '100%'
                },
                bar: { groupWidth: '90%' },
                legend: { position: 'none' },
                hAxis: {
                    showTextEvery: 1,
                    slantedText: true,
                    slantedTextAngle: 90
                }
            }
        },
        {
            id: C.HomeChartType.HorizontalBar,
            summary: 'Horizontal Bar',
            options: {
                chartArea: {
                    left: 100,
                    top: 10,
                    bottom: 5,
                    right: 10,
                    width: '100%',
                    height: '100%'
                },
                bar: { groupWidth: '90%' },
                legend: { position: 'none' }
                //hAxis: { showTextEvery: 1, slantedText: false, slantedTextAngle: 90 }
            }
        }
    ];

    me.chartConfigs = [
        {
            id: C.HomeChartConfig.ActiveProperty,
            reportId: C.ReportType.CurrentStockActive,
            sectionId: 0,
            summary: 'Active Property',
            availableTypes: [
                C.HomeChartType.HorizontalBar,
                C.HomeChartType.PieChart3D,
                C.HomeChartType.PieChartHole,
                C.HomeChartType.PieChart
            ],
            PickBranch: true,
            PickUser: false,
            PickAxis: false,
            PickSaleOrRent: false,
            PickDateRange: false,
            PickPeriod: false,
            PickOrderBy: true,
            PickDisplayItems: false,
            MenuHeight: '330px'
        },
        {
            id: C.HomeChartConfig.AllProperty,
            reportId: C.ReportType.CurrentStock,
            sectionId: 0,
            summary: 'All Property',
            availableTypes: [
                C.HomeChartType.VerticalBar,
                C.HomeChartType.PieChart3D,
                C.HomeChartType.PieChartHole,
                C.HomeChartType.PieChart
            ],
            PickBranch: true,
            PickUser: false,
            PickAxis: false,
            PickSaleOrRent: false,
            PickDateRange: false,
            PickPeriod: false,
            PickOrderBy: true,
            PickDisplayItems: false,
            MenuHeight: '330px'
        },
        {
            id: C.HomeChartConfig.BranchActivity,
            reportId: C.ReportType.UserActivityBreakdown,
            sectionId: 2,
            summary: 'Branch Activity',
            availableTypes: [
                C.HomeChartType.VerticalBar,
                C.HomeChartType.PieChart3D,
                C.HomeChartType.PieChartHole,
                C.HomeChartType.PieChart
            ],
            PickBranch: true,
            PickUser: false,
            PickAxis: false,
            PickSaleOrRent: true,
            PickDateRange: true,
            PickPeriod: true,
            PickOrderBy: true,
            PickDisplayItems: true,
            MenuHeight: '548px'
        },
        {
            id: C.HomeChartConfig.CompletedSales,
            reportId: C.ReportType.SalesCompleted,
            sectionId: 0,
            summary: 'Completed Sales',
            availableTypes: [
                C.HomeChartType.VerticalBar,
                C.HomeChartType.PieChart3D,
                C.HomeChartType.PieChartHole,
                C.HomeChartType.PieChart
            ],
            PickBranch: true,
            PickUser: false,
            PickAxis: true,
            PickSaleOrRent: false,
            PickDateRange: true,
            PickPeriod: true,
            PickOrderBy: true,
            PickDisplayItems: false,
            MenuHeight: '410px'
        },
        {
            id: C.HomeChartConfig.ExchangedSales,
            reportId: C.ReportType.SalesExchanged,
            sectionId: 0,
            summary: 'Exchanged Sales',
            availableTypes: [
                C.HomeChartType.VerticalBar,
                C.HomeChartType.PieChart3D,
                C.HomeChartType.PieChartHole,
                C.HomeChartType.PieChart
            ],
            PickBranch: true,
            PickUser: false,
            PickAxis: true,
            PickSaleOrRent: false,
            PickDateRange: true,
            PickPeriod: true,
            PickOrderBy: true,
            PickDisplayItems: false,
            MenuHeight: '410px'
        },
        {
            id: C.HomeChartConfig.Instructed,
            reportId: C.ReportType.CurrentStockNew,
            sectionId: 2,
            summary: 'Instructed',
            availableTypes: [
                C.HomeChartType.VerticalBar,
                C.HomeChartType.PieChart3D,
                C.HomeChartType.PieChartHole,
                C.HomeChartType.PieChart
            ],
            PickBranch: true,
            PickUser: false,
            PickAxis: true,
            PickSaleOrRent: false,
            PickDateRange: true,
            PickPeriod: true,
            PickOrderBy: true,
            PickDisplayItems: false,
            MenuHeight: '410px'
        },
        {
            id: C.HomeChartConfig.MANegotiatorBooked,
            reportId: C.ReportType.MarketAppraisalsNegotiatorBooked,
            sectionId: 0,
            summary: 'Market Appraisals Negotiator Booked',
            availableTypes: [
                C.HomeChartType.VerticalBar,
                C.HomeChartType.PieChart3D,
                C.HomeChartType.PieChartHole,
                C.HomeChartType.PieChart
            ],
            PickBranch: true,
            PickUser: false,
            PickAxis: true,
            PickSaleOrRent: false,
            PickDateRange: true,
            PickPeriod: true,
            PickOrderBy: false,
            PickDisplayItems: false,
            MenuHeight: '370px'
        },
        {
            id: C.HomeChartConfig.MANegotiatorDates,
            reportId: C.ReportType.MarketAppraisalsNegotiatorDate,
            sectionId: 0,
            summary: 'Market Appraisals Negotiator Dates',
            availableTypes: [
                C.HomeChartType.VerticalBar,
                C.HomeChartType.PieChart3D,
                C.HomeChartType.PieChartHole,
                C.HomeChartType.PieChart
            ],
            PickBranch: true,
            PickUser: false,
            PickAxis: true,
            PickSaleOrRent: false,
            PickDateRange: true,
            PickPeriod: true,
            PickOrderBy: false,
            PickDisplayItems: false,
            MenuHeight: '370px'
        },
        {
            id: C.HomeChartConfig.MAAppraisalsBooked,
            reportId: C.ReportType.MarketAppraisalsPropertyBooked,
            sectionId: 0,
            summary: 'Market Appraisals Property Booked',
            availableTypes: [
                C.HomeChartType.VerticalBar,
                C.HomeChartType.PieChart3D,
                C.HomeChartType.PieChartHole,
                C.HomeChartType.PieChart
            ],
            PickBranch: true,
            PickUser: false,
            PickAxis: true,
            PickSaleOrRent: false,
            PickDateRange: true,
            PickPeriod: true,
            PickOrderBy: false,
            PickDisplayItems: false,
            MenuHeight: '370px'
        },
        {
            id: C.HomeChartConfig.MAAppraisalsDates,
            reportId: C.ReportType.MarketAppraisalsPropertyDate,
            sectionId: 0,
            summary: 'Market Appraisals Property Dates',
            availableTypes: [
                C.HomeChartType.VerticalBar,
                C.HomeChartType.PieChart3D,
                C.HomeChartType.PieChartHole,
                C.HomeChartType.PieChart
            ],
            PickBranch: true,
            PickUser: false,
            PickAxis: true,
            PickSaleOrRent: false,
            PickDateRange: true,
            PickPeriod: true,
            PickOrderBy: false,
            PickDisplayItems: false,
            MenuHeight: '370px'
        },
        {
            id: C.HomeChartConfig.MyActivity,
            reportId: C.ReportType.UserActivityBreakdown,
            sectionId: 0,
            summary: 'My Activity',
            availableTypes: [C.HomeChartType.VerticalBar],
            PickBranch: false,
            PickUser: false,
            PickAxis: false,
            PickSaleOrRent: true,
            PickDateRange: true,
            PickPeriod: true,
            PickOrderBy: true,
            PickDisplayItems: false,
            MenuHeight: '370px'
        },
        {
            id: C.HomeChartConfig.OffersMade,
            reportId: C.ReportType.SalesOffersMade,
            sectionId: 0,
            summary: 'Offers Made',
            availableTypes: [
                C.HomeChartType.VerticalBar,
                C.HomeChartType.PieChart3D,
                C.HomeChartType.PieChartHole,
                C.HomeChartType.PieChart
            ],
            PickBranch: true,
            PickUser: false,
            PickAxis: true,
            PickSaleOrRent: false,
            PickDateRange: true,
            PickPeriod: true,
            PickOrderBy: true,
            PickDisplayItems: false,
            MenuHeight: '410px'
        },
        {
            id: C.HomeChartConfig.SalesAgreed,
            reportId: C.ReportType.AcceptedOffersFromSameOffice,
            sectionId: 0,
            summary: 'Sales Agreed',
            availableTypes: [
                C.HomeChartType.VerticalBar,
                C.HomeChartType.PieChart3D,
                C.HomeChartType.PieChartHole,
                C.HomeChartType.PieChart
            ],
            PickBranch: true,
            PickUser: false,
            PickAxis: true,
            PickSaleOrRent: false,
            PickDateRange: true,
            PickPeriod: true,
            PickOrderBy: true,
            PickDisplayItems: false,
            MenuHeight: '410px'
        },
        {
            id: C.HomeChartConfig.UserActivity,
            reportId: C.ReportType.UserActivityBreakdown,
            sectionId: 3,
            summary: 'User Activity',
            availableTypes: [C.HomeChartType.VerticalBar],
            PickBranch: false,
            PickUser: true,
            PickAxis: false,
            PickSaleOrRent: true,
            PickDateRange: true,
            PickPeriod: true,
            PickOrderBy: false,
            PickDisplayItems: false,
            MenuHeight: '370px'
        }
    ];

    me.usercharts = [];

    me.init();

    return true;
};

gmgps.cloud.ui.views.home.chartsdashboard.prototype = {
    init: function () {
        var me = this;

        me.$addChartButton.on('click', function () {
            me.presentChartOptions(null);
        });

        me.$chartsRoot.on('click', '.edit-user-chart', function () {
            var chartId = $(this).closest('.user-chart-root').attr('data-id');
            me.presentChartOptions(chartId);
        });

        //UI Sizing
        $(window).on('resize', function () {
            clearTimeout(me.resizeTimer);
            me.resizeTimer = setTimeout(function () {
                me.sizeUI();
            }, 250);
        });

        me.$root.on('change', '#chart-dataset', function () {
            var dataset_key = $(this).find('option:selected').val();

            me.chartBeingEdited.dataset = parseInt(dataset_key);
            me.refreshChartOptions();
            me.formulateChartTitle();
        });

        me.$root.on('change', '#ChartBranchId', function () {
            var branchId = parseInt($(this).find('option:selected').val());

            if (branchId > 0) {
                me.chartBeingEdited.branchId = branchId;
            } else {
                me.chartBeingEdited.branchId = 0;
            }
            me.formulateChartTitle();
        });

        me.$root.on('change', '#ChartUserId', function () {
            var userId = parseInt($(this).find('option:selected').val());

            if (userId > 0) {
                me.chartBeingEdited.userId = userId;
            } else {
                me.chartBeingEdited.userId = 0;
            }
            me.formulateChartTitle();
        });

        me.$root.on('change', '#ChartYAxisId', function () {
            var yaxis = parseInt($(this).find('option:selected').val());

            if (yaxis > -1) {
                me.chartBeingEdited.yaxis = yaxis;
            } else {
                me.chartBeingEdited.yaxis = 0;
            }
            me.formulateChartTitle();
        });

        me.$root.on('change', '#ChartOrderId', function () {
            var order = parseInt($(this).find('option:selected').val());

            if (order > -1) {
                me.chartBeingEdited.orderby = order;
            } else {
                me.chartBeingEdited.orderby = 0;
            }
            me.formulateChartTitle();
        });

        me.$root.on('change', '#ChartPeriodId', function () {
            var period = parseInt($(this).find('option:selected').val());
            var dates, dateFrom, dateTo;

            if (period > -1) {
                if (period === 0) {
                    // Custom date range
                    me.chartBeingEdited.period = period;

                    dates = me.getDatePeriod(
                        parseInt(C.ReportPeriodType.Last30Days),
                        '',
                        ''
                    );
                    dateFrom = dates.dateFrom;
                    dateTo = dates.dateTo;

                    me.chartBeingEdited.dateFrom = dateFrom;
                    me.chartBeingEdited.dateTo = dateTo;
                } else {
                    dates = me.getDatePeriod(period, '', '');
                    dateFrom = dates.dateFrom;
                    dateTo = dates.dateTo;

                    me.chartBeingEdited.period = period;
                    me.chartBeingEdited.dateFrom = dateFrom;
                    me.chartBeingEdited.dateTo = dateTo;
                }
            } else {
                // Default
                me.chartBeingEdited.period = parseInt(
                    C.ReportPeriodType.Last30Days
                );
                dates = me.getDatePeriod(
                    parseInt(C.ReportPeriodType.Last30Days),
                    '',
                    ''
                );
                dateFrom = dates.dateFrom;
                dateTo = dates.dateTo;

                me.chartBeingEdited.dateFrom = dateFrom;
                me.chartBeingEdited.dateTo = dateTo;
            }

            me.$chartOptionsMenu
                .find('#ChartDateFrom')
                .datepicker(
                    'setDate',
                    me.chartBeingEdited.dateFrom.toString('dd/MM/yyyy')
                );
            me.$chartOptionsMenu
                .find('#ChartDateTo')
                .datepicker(
                    'setDate',
                    me.chartBeingEdited.dateTo.toString('dd/MM/yyyy')
                );

            me.formulateChartTitle();
            me.refreshChartOptions();
        });

        me.$root.on('change', '#ChartSaleRentId', function () {
            var sor = parseInt($(this).find('option:selected').val());

            if (sor > -1) {
                me.chartBeingEdited.saleorrent = sor;
            } else {
                me.chartBeingEdited.saleorrent = 0;
            }
            me.formulateChartTitle();
        });

        me.$root.on('change', '#chart-style', function () {
            var style_key = $(this).find('option:selected').val();
            me.chartBeingEdited.chartType = parseInt(style_key);

            me.formulateChartTitle();
        });

        me.$root.on('click', '#save-chart', function () {
            if (me.chartBeingEdited.chartId !== 'TEMP-ID') {
                for (var i = 0, iLen = me.usercharts.length; i < iLen; i++) {
                    if (
                        me.usercharts[i].chartId === me.chartBeingEdited.chartId
                    ) {
                        me.usercharts[i] = jQuery.extend(
                            {},
                            me.chartBeingEdited
                        ); // clone!
                    }
                }

                me.clearChartCache(me.chartBeingEdited.chartId);
                me.drawUserCharts(me.chartBeingEdited.chartId);
                me.dismissChartOptions();
                me.saveUserCharts();
            } else {
                // Get new UUID for user chart
                me.chartBeingEdited.chartId = me.newGuid();
                me.usercharts.push(me.chartBeingEdited);

                me.drawUserCharts(me.chartBeingEdited.chartId);
                me.dismissChartOptions();
                me.saveUserCharts();
            }
            me.chartRollBack = null;
        });

        me.$root.on('click', '#chart-delete', function () {
            // Get new UUID for user chart
            var id = me.chartBeingEdited.chartId;

            var del = null;

            for (var i = 0, iLen = me.usercharts.length; i < iLen; i++) {
                if (me.usercharts[i].chartId === id) {
                    del = i;
                }
            }

            if (del != null) {
                me.usercharts.splice(del, 1);
            } else {
                if (me.usercharts.length === 1) {
                    me.usercharts = [];
                }
            }

            var $target = me.$chartsRoot.find('#' + id);
            $target.fadeOut(500);
            $target.remove();
            me.dismissChartOptions();
            me.saveUserCharts();

            me.chartRollBack = null;
            me.chartBeingEdited = null;
        });

        me.$root.on('click', '#save-chart-close', function () {
            me.dismissChartOptions();
        });

        me.$root.on('change', '#ChartDateFrom', function () {
            var date = me.$root.find('#ChartDateFrom').datepicker('getDate');
            me.chartBeingEdited.dateFrom = date;
            me.formulateChartTitle();
        });

        me.$root.on('change', '#ChartDateTo', function () {
            var date = me.$root.find('#ChartDateTo').datepicker('getDate');
            me.chartBeingEdited.dateTo = date;
            me.formulateChartTitle();
        });

        me.$root.on('change', '.chart-options-filter', function () {
            var filterIds = [];

            me.$chartOptionsMenu
                .find('.chart-options-filter:checked')
                .each(function () {
                    filterIds.push($(this).data('filterid'));
                });

            me.chartBeingEdited.displayitems = filterIds;
        });

        me.$root.on('click', '.expand-chart', function () {
            var chartId = $(this).closest('.user-chart-root').attr('data-id');
            var chartData = $(this)
                .closest('.user-chart-root')
                .data('chartdata');
            var chartObject = null;

            me.usercharts.forEach(function (chart) {
                if (chart.chartId == chartId) {
                    chartObject = chart;
                    return false;
                }
            });

            if (chartObject != null) {
                me.zoomUserChart(chartObject, chartData);
            }
        });
    },

    zoomUserChart: function (chart, chartData) {
        new gmgps.cloud.ui.views.home.chartsmodal({
            chart: chart,
            chartData: chartData
        }).show();
    },

    activate: function (forceRefresh) {
        var me = this;

        if (forceRefresh || !me.initialised) {
            me.refreshAll();
        }
    },

    getChartTypeFromString: function (chartType) {
        return chartType === 'Default'
            ? C.HomeChartType.PieChart
            : C.HomeChartType.HorizontalBar;
    },

    getLegacyDataset: function (reportname) {
        var me = this;
        var idx = -1;

        me.chartConfigs.some(function (el) {
            if (el.summary === reportname) {
                idx = el.id;
                return true;
            }
        });

        return idx;
    },

    migrateChartConfigs: function () {
        var me = this;
        me.migratedCharts = 0;

        console.log('** START Migration **');

        for (var i = 1; i < 9; i++) {
            me.checkLegacyChartConfig(i);
        }

        console.log('** Migration queued **');
    },

    checkLegacyChartConfig: function (id) {
        var me = this;
        new gmgps.cloud.http("chartsdashboard-checkLegacyChartConfig").ajax(
            {
                args: {
                    key: 'widget.chart' + id
                },
                background: true,
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/user/GetUiPersonalisation'
            },
            function (response) {
                if (response.Data != null) {
                    var chartConfig = response.Data; //'{"selectionid":"UserActivityBreakdown-3","reportid":"SalesCompleted","sectionid":"3","style":"HorizontalBar","reportname":"SalesCompleted","interval":"-1","sort":"1","userid":"11839","username":"Alison Hurst","propertyrecordtypeid":"0","dateto":"2016-08-18T00:00:00.000Z","datefrom":"2014-08-12T00:00:00.000Z","period":"4","datadisplays":[]}';

                    // Migrate it!
                    try {
                        var migratedChart =
                            me.convertLegacyChartConfig(chartConfig);
                        migratedChart.chartId = me.newGuid();
                        me.chartBeingEdited = migratedChart;
                        me.refreshChartOptions();
                        me.formulateChartTitle();
                        me.usercharts.push(migratedChart);
                    } catch (e) {
                        console.log(
                            'Migration failed: ',
                            e.toString(),
                            ' - Data: ',
                            chartConfig
                        );
                    }
                }

                me.incrementMigrationCounter();
            }
        );
    },

    convertLegacyChartConfig: function (data) {
        var me = this;
        var chartConfig = JSON.parse(data);

        var convertedChart = {
            title: chartConfig.reportname,
            chartId: '',
            dataset: me.getLegacyDataset(chartConfig.reportname),
            branchId: 0,
            userId: 0,
            chartType: me.getChartTypeFromString(chartConfig.style),
            dateFrom: new Date(chartConfig.datefrom),
            dateTo: new Date(chartConfig.dateto),
            yaxis: 0,
            orderby: chartConfig.sort == '2' ? 1 : 0,
            saleorrent: chartConfig.propertyrecordtypeid,
            period: 0,
            periodDescription: '',
            displayitems: chartConfig.datadisplays
        };

        convertedChart.period =
            parseInt(chartConfig.period) > -2
                ? parseInt(chartConfig.period)
                : 6;
        convertedChart.yaxis =
            parseInt(chartConfig.yaxis) > -1 ? parseInt(chartConfig.yaxis) : 0;
        convertedChart.branchId =
            parseInt(chartConfig.branchid) > -1
                ? parseInt(chartConfig.branchid)
                : 0;
        convertedChart.userId =
            parseInt(chartConfig.userid) > -1
                ? parseInt(chartConfig.userid)
                : 0;

        var dates = me.getDatePeriod(
            convertedChart.period,
            convertedChart.dateFrom,
            convertedChart.dateTo
        );
        convertedChart.dateFrom = dates.dateFrom;
        convertedChart.dateTo = dates.dateTo;
        convertedChart.periodDescription = dates.dateRange;

        var title = chartConfig.reportname + convertedChart.periodDescription;
        convertedChart.title = title;

        return convertedChart;
    },

    clearLegacyChartConfig: function (id) {
        new gmgps.cloud.http("chartsdashboard-clearLegacyChartConfig").ajax(
            {
                args: {
                    key: 'widget.chart' + id,
                    data: ''
                },
                background: true,
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/user/PutUiPersonalisation'
            },
            function () {}
        );
    },

    incrementMigrationCounter: function () {
        var me = this;
        me.migratedCharts++;

        if (me.migratedCharts == 8) {
            console.log('** END Migration **');

            if (me.usercharts.length === 0) {
                me.displayNoCharts(true);
            } else {
                me.displayNoCharts(false);
                me.drawUserCharts();
                me.saveUserCharts();
            }

            // Clear the old EIGHT chart configs as we are now using a single UIPersonalisation Key
            for (var i = 1; i < 9; i++) {
                me.clearLegacyChartConfig(i);
            }
        }
    },

    loadUserCharts: function () {
        var me = this;

        var deferred = new $.Deferred();

        new gmgps.cloud.http("chartsdashboard-loadUserCharts").ajax(
            {
                args: {
                    key: me.Charts_Persistance_Key
                },
                background: true,
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/user/GetUiPersonalisation'
            },
            function (response) {
                deferred.resolve();

                if (response.Data != null) {
                    me.usercharts = JSON.parse(response.Data);
                    me.usercharts = _.filter(me.usercharts, c => c != null);

                    if (me.usercharts.length === 0) {
                        me.displayNoCharts(true);
                    } else {
                        // fix dates (stringify/parse doesn't handle dates properly)
                        me.usercharts.forEach(function (chart, i) {
                            me.usercharts[i].dateFrom = new Date(
                                me.usercharts[i].dateFrom
                            );
                            me.usercharts[i].dateTo = new Date(
                                me.usercharts[i].dateTo
                            );
                        });
                        me.displayNoCharts(false);
                    }

                    me.drawUserCharts();
                } else {
                    me.usercharts = [];
                    me.displayNoCharts(true);
                    // Only gets called when the 'new key' does not exist
                    me.migrateChartConfigs();
                }
            }
        );

        return deferred.promise();
    },

    saveUserCharts: function () {
        var me = this;
        me.usercharts = _.filter(me.usercharts, c => c != null);
        var dataToSave = JSON.stringify(me.usercharts);

        new gmgps.cloud.http("chartsdashboard-saveUserCharts").ajax(
            {
                args: {
                    key: me.Charts_Persistance_Key,
                    data: dataToSave
                },
                background: true,
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/user/PutUiPersonalisation'
            },
            function () {}
        );

        if (me.usercharts.length === 0) {
            me.displayNoCharts(true);
        } else {
            me.displayNoCharts(false);
        }
    },

    dismissChartOptions: function () {
        var me = this;
        me.$addChartButton.removeClass('disabled');
        me.$chartOptions.fadeOut(200);
    },

    presentChartOptions: function (id) {
        var me = this;
        me.chartRollBack = null;

        me.$addChartButton.addClass('disabled');

        if (id) {
            // Set target chart
            for (var i = 0, iLen = me.usercharts.length; i < iLen; i++) {
                if (me.usercharts[i].chartId === id) {
                    me.chartBeingEdited = $.extend({}, me.usercharts[i]); // clone!
                }
            }
            me.$chartOptionsMenu.find('#chart-delete').show();
        } else {
            // create new default chart object, use temp Id
            // will only save if user clicks 'save and exit'

            me.chartRollBack = null;

            var dates = me.getDatePeriod(
                parseInt(C.ReportPeriodType.Last30Days),
                '',
                ''
            );

            var tempChart = {
                title: '',
                chartId: 'TEMP-ID',
                dataset: 1, //C.HomeChartConfig.OffersMade,
                branchId: me.branchId,
                userId: me.userId,
                chartType: C.HomeChartType.PieChart3D,
                dateFrom: dates.dateFrom,
                dateTo: dates.dateTo,
                yaxis: 0,
                orderby: 0,
                saleorrent: 0,
                period: parseInt(C.ReportPeriodType.Last7Days),
                periodDescription: dates.dateRange,
                displayitems: []
            };
            me.$chartOptionsMenu.find('#chart-delete').hide();
            me.chartBeingEdited = tempChart;
        }

        var datePickerOptions = {
            numberOfMonths: 2,
            showButtonPanel: true,
            changeMonth: false,
            changeYear: false,
            dateFormat: 'dd/mm/yy'
        };

        me.$chartOptionsMenu
            .find('#ChartDateFrom')
            .datepicker(datePickerOptions);
        me.$chartOptionsMenu.find('#ChartDateTo').datepicker(datePickerOptions);

        me.$chartOptionsMenu
            .find('#ChartDateFrom')
            .datepicker('option', 'showAnim', 'slide');
        me.$chartOptionsMenu
            .find('#ChartDateTo')
            .datepicker('option', 'showAnim', 'slide');

        me.$chartOptionsMenu
            .find('#ChartDateFrom')
            .datepicker(
                'setDate',
                me.chartBeingEdited.dateFrom.toString('dd/MM/yyyy')
            );
        me.$chartOptionsMenu
            .find('#ChartDateTo')
            .datepicker(
                'setDate',
                me.chartBeingEdited.dateTo.toString('dd/MM/yyyy')
            );

        me.refreshChartOptions();

        me.$chartOptions.fadeIn(300);
    },

    refreshChartOptions: function () {
        var me = this;

        me.drawChartComboBox_DataSet();
        me.drawChartComboBox_ChartStyle();

        var chartConfig = me.getChartConfig(me.chartBeingEdited.dataset);

        //>> Refactor to single method!
        me.setChartOptionState(
            '#ChartBranchId',
            chartConfig.PickBranch,
            me.chartBeingEdited.branchId
        );
        me.setChartOptionState(
            '#ChartUserId',
            chartConfig.PickUser,
            me.chartBeingEdited.userId
        );
        me.setChartOptionState(
            '#ChartYAxisId',
            chartConfig.PickAxis,
            me.chartBeingEdited.yaxis
        );
        me.setChartOptionState(
            '#ChartOrderId',
            chartConfig.PickOrderBy,
            me.chartBeingEdited.orderby
        );
        me.setChartOptionState(
            '#ChartPeriodId',
            chartConfig.PickPeriod,
            me.chartBeingEdited.period
        );
        me.setChartOptionState(
            '#ChartSaleRentId',
            chartConfig.PickSaleOrRent,
            me.chartBeingEdited.saleorrent
        );

        me.setActivityDisplayItems(
            chartConfig.PickDisplayItems,
            me.chartBeingEdited.displayitems
        );

        me.setDateRangePickerStates(
            chartConfig.PickPeriod,
            me.chartBeingEdited.period == 0
        );

        me.setOptionsMenuHeight(me.chartBeingEdited.dataset);
    },

    formulateChartTitle: function () {
        var me = this;

        var dataSet = me.$chartOptionsMenu
            .find('#chart-dataset')
            .find('option:selected')
            .text();
        var chartConfig = me.getChartConfig(
            me.$chartOptionsMenu
                .find('#chart-dataset')
                .find('option:selected')
                .val()
        );

        var user = me.$chartOptionsMenu
            .find('#ChartUserId')
            .find('option:selected')
            .text();
        var branch = me.$chartOptionsMenu
            .find('#ChartBranchId')
            .find('option:selected')
            .text();

        // create branch,user of title
        var titleBranchUser = '';
        if (chartConfig.PickBranch) titleBranchUser = branch;
        if (chartConfig.PickUser)
            titleBranchUser += (chartConfig.PickBranch ? ', ' : '') + user;
        if (titleBranchUser.length > 0)
            titleBranchUser = ' (' + titleBranchUser + ') ';

        // create period of title
        var titlePeriod = '';
        if (chartConfig.PickPeriod) {
            var dates = me.getDatePeriod(
                me.chartBeingEdited.period,
                me.chartBeingEdited.dateFrom,
                me.chartBeingEdited.dateTo
            );
            me.chartBeingEdited.periodDescription = dates.dateRange;
            titlePeriod = me.chartBeingEdited.periodDescription;
        }

        var title = dataSet + titleBranchUser + titlePeriod;
        me.chartBeingEdited.title = title;
    },

    drawChartComboBox_DataSet: function () {
        var me = this;
        var chart = me.chartBeingEdited;

        var s = $('<select id="chart-dataset" />');

        $.each(me.chartConfigs, function (k, v) {
            if (v.id == chart.dataset) {
                $('<option></option>', { value: v.id, text: v.summary })
                    .attr('selected', 'selected')
                    .appendTo(s);
            } else {
                $('<option></option>', { value: v.id, text: v.summary }).appendTo(s);
            }
        });

        me.$chartOptionsMenu.find('#chart-dataset-div').html(s);
    },

    drawChartComboBox_ChartStyle: function () {
        var me = this;
        var chart = me.chartBeingEdited;
        var chartConfig = me.getChartConfig(chart.dataset);

        var s = $(
            '<select id="chart-style" class="selectpicker option-input"></select>'
        );

        $.each(me.chartTypes, function (k, v) {
            var valid_for_dataset =
                chartConfig.availableTypes.indexOf(k) !== -1;

            if (valid_for_dataset) {
                if (v.id == chart.chartType) {
                    $('<option></option>', { value: k, text: v.summary })
                        .attr('selected', 'selected')
                        .appendTo(s);
                } else {
                    $('<option></option>', { value: k, text: v.summary }).appendTo(s);
                }
            }
        });

        me.$chartOptionsMenu.find('#chart-style-div').html(s);

        // get newly selected option (may be new default) and update chart object
        var style_key = me.$root
            .find('#chart-style')
            .find('option:selected')
            .val();
        me.chartBeingEdited.chartType = parseInt(style_key);
    },

    setActivityDisplayItems: function (state) {
        var me = this;

        if (state) {
            me.$chartOptionsMenu
                .find('.chart-options-filter')
                .removeAttr('disabled')
                .removeClass('disabled');
            me.$chartOptionsMenu.find('.display-items-group').show();
        } else {
            me.$chartOptionsMenu
                .find('.chart-options-filter')
                .attr('disabled', 'disabled')
                .addClass('disabled');
            me.$chartOptionsMenu.find('.display-items-group').hide();
        }

        // Need to set the checked state for each....
        me.$chartOptionsMenu
            .find('.chart-options-filter')
            .removeAttr('checked');

        for (var i = 0; i < me.chartBeingEdited.displayitems.length; i++) {
            var sel =
                '.chart-options-filter[data-filterid="' +
                me.chartBeingEdited.displayitems[i] +
                '"]';
            me.$chartOptionsMenu.find(sel).prop('checked', true);
        }
    },

    setOptionsMenuHeight: function (configId) {
        var me = this;
        var chartConfig = me.getChartConfig(configId);
        //me.$chartOptionsMenu.css('height', dataset.MenuHeight);
        me.$chartOptionsMenu.animate(
            { height: chartConfig.MenuHeight },
            300,
            'easeOutExpo'
        );
    },

    setChartOptionState: function (target, state, selected) {
        var me = this;
        var selectEl = me.$chartOptionsMenu.find(target);

        if (state) {
            selectEl.removeAttr('disabled').removeClass('disabled');
            selectEl.closest('.options-outer-item').show(300, 'easeOutExpo');

            // All Branches/Negotiators have a value of "" rather than 0
            if (
                0 == selected &&
                selectEl.find("option[value='0']").length == 0
            ) {
                selectEl.val(selectEl[0][0].value);
            } else {
                selectEl.val(selected);
            }
        } else {
            selectEl.attr('disabled', 'disabled').addClass('disabled');
            selectEl.closest('.options-outer-item').hide(300, 'easeOutExpo');
        }
    },

    setDateRangePickerStates: function (show, state) {
        var me = this;

        if (show) {
            if (state) {
                // enable pickers!
                me.$chartOptionsMenu
                    .find('#ChartDateFrom')
                    .parent()
                    .removeAttr('disabled')
                    .removeClass('disabled');
                me.$chartOptionsMenu
                    .find('#ChartDateTo')
                    .parent()
                    .removeAttr('disabled')
                    .removeClass('disabled');

                me.$chartOptionsMenu
                    .find('#ChartDateFrom')
                    .datepicker('option', 'disabled', false)
                    .datepicker('refresh');
                me.$chartOptionsMenu
                    .find('#ChartDateTo')
                    .datepicker('option', 'disabled', false)
                    .datepicker('refresh');

                me.$chartOptionsMenu
                    .find('#ChartDateFrom')
                    .closest('.options-outer-item')
                    .show(300, 'easeOutExpo');
            } else {
                me.$chartOptionsMenu
                    .find('#ChartDateFrom')
                    .parent()
                    .attr('disabled', 'disabled')
                    .addClass('disabled');
                me.$chartOptionsMenu
                    .find('#ChartDateTo')
                    .parent()
                    .attr('disabled', 'disabled')
                    .addClass('disabled');

                me.$chartOptionsMenu
                    .find('#ChartDateFrom')
                    .datepicker()
                    .datepicker('option', 'disabled', true)
                    .datepicker('refresh');
                me.$chartOptionsMenu
                    .find('#ChartDateTo')
                    .datepicker()
                    .datepicker('option', 'disabled', true)
                    .datepicker('refresh');
            }
        } else {
            me.$chartOptionsMenu
                .find('#ChartDateFrom')
                .closest('.options-outer-item')
                .hide(300, 'easeOutExpo');
        }
    },

    clearChartCache: function (id) {
        var me = this;

        var $targets;

        if (id) {
            $targets = me.$chartsRoot.find('#{0}'.format(id));
        } else {
            $targets = me.$chartsRoot.find('.user-chart-root');
        }

        $targets.removeData('chartdata');
    },

    drawUserCharts: function (id) {
        var me = this;

        me.usercharts.forEach(function (chart) {
            if (chart.chartId == id || id == undefined) {
                var $target = me.$chartsRoot.find('#{0}'.format(chart.chartId));

                if ($target.length === 0) {
                    me.$chartsRoot.append(
                        me.getChartContainerHTML(chart.chartId)
                    );
                    $target = me.$chartsRoot.find('#{0}'.format(chart.chartId));
                }
                me.renderChart($target, chart);
            }
        });

        me.$chartsRoot.sortable({
            cursor: 'move',
            placeholder:
                'chart-drop-zone col-lg-4 col-md-6 col-sm-12 col-xs-12',
            start: function (e, ui) {
                ui.placeholder.html("<div class='inner-drop-zone'></div>");
                me.chartPosStart = ui.item.index();
            },
            update: function (event, ui) {
                if (ui.item.index() !== me.chartPosStart) {
                    me.swapChartsPosition(me.chartPosStart, ui.item.index());
                }
            }
        });
    },

    swapChartsPosition: function (oldindex, newindex) {
        var me = this;

        var temp = me.usercharts[newindex];
        me.usercharts[newindex] = me.usercharts[oldindex];
        me.usercharts[oldindex] = temp;
        me.saveUserCharts();
    },

    renderStockChart: function ($targetDiv, chart) {
        var me = this;

        new gmgps.cloud.http("chartsdashboard-renderStockChart").ajax(
            {
                args: {
                    branchId: chart.branchId,
                    userId: chart.userId
                },
                background: true,
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/home/GetDashboardStockPieData'
            },
            function (response) {
                me.drawChart(
                    $targetDiv,
                    chart.chartType,
                    response.Data,
                    chart.title
                );
            }
        );
    },

    getDatePeriod: function (id, dateFrom, dateTo) {
        var from = new Date();
        from.setHours(0, 0, 0, 0);
        var to = new Date();
        to.setHours(23, 59, 59, 0);
        var dateRange = '';

        switch (id) {
            case C.ReportPeriodType.Unspecified: //Custom Date Range
                dateRange = '- {0} to {1}'.format(
                    dateFrom.toString('dd/MM/yyyy'),
                    dateTo.toString('dd/MM/yyyy')
                );
                from = new Date(dateFrom);
                to = new Date(dateTo);
                break;
            case C.ReportPeriodType.Today:
                dateRange = ' - Today';
                // from = from;
                // to = to;
                break;
            case C.ReportPeriodType.Yesterday:
                dateRange = ' - Yesterday';
                from = from.add({ days: -1 });
                to = from;
                break;
            case C.ReportPeriodType.Last2Days:
                dateRange = ' - Last 2 days';
                from = from.add({ days: -1 });
                // to = to;
                break;
            case C.ReportPeriodType.Last7Days:
                dateRange = ' - Last 7 days';
                from = from.add({ days: -6 });
                // to = to;
                break;
            case C.ReportPeriodType.Last14Days:
                dateRange = ' - Last 14 days';
                from = from.add({ days: -13 });
                // to = to;
                break;
            case C.ReportPeriodType.Last30Days:
                dateRange = ' - Last 30 days';
                from = from.add({ days: -29 });
                // to = to;
                break;
            case C.ReportPeriodType.Last3Months:
                dateRange = ' - Last 3 months';
                from = from.add({ months: -3 });
                // to = to;
                break;
            case C.ReportPeriodType.Last6Months:
                dateRange = ' - Last 6 months';
                from = from.add({ months: -6 });
                // to = to;
                break;
            case C.ReportPeriodType.Last12Months:
                dateRange = ' - Last 12 months';
                from = from.add({ months: -12 });
                // to = to;
                break;
            case C.ReportPeriodType.Last2Years:
                dateRange = ' - Last 2 years';
                from = from.add({ years: -2 });
                // to = to;
                break;
            case C.ReportPeriodType.LastCalendarMonth:
                var now = new Date();
                var month = now.getMonth();
                var year = now.getFullYear();

                if (month === 0) {
                    year += -1;
                    month = 12;
                }

                from = Date.parse(month + '/1/' + year);
                to = from.clone();
                to = to.moveToLastDayOfMonth();
                dateRange = ' - {0}'.format(to.toString('MMMM'));
                break;
            case C.ReportPeriodType.MonthToDate:
                from = from.moveToFirstDayOfMonth();
                // to = to;
                dateRange = ' - Month to Date';
                break;
            case C.ReportPeriodType.SaturdayToFriday:
                var day = (from.getDay() + 1) % 7; // make saturday = 0
                from = from.add({ days: -day });
                to = to.add({ days: 6 - day });
                dateRange = ' - Saturday to Friday';
                break;
        }
        return { dateFrom: from, dateTo: to, dateRange: dateRange };
    },

    getChartTypeSettings: function (chartTypeId) {
        var me = this;
        return me.chartTypes[chartTypeId];
    },

    getChartConfig: function (chartConfigId) {
        var me = this;
        var config = null;

        me.chartConfigs.forEach(function (el) {
            if (el.id == chartConfigId) {
                config = el;
                return true;
            }
        });

        if (config == null)
            console.log('Failed to find chartConfig id: ', chartConfigId);

        return config;
    },

    renderChart: function ($targetDiv, chart) {
        var me = this;

        var chartConfig = me.getChartConfig(chart.dataset);
        var branches = [];
        var users = [];

        if (!chart.title) chart.title = chartConfig.summary;

        var config = {
            reportId: chartConfig.reportId,
            dateFrom: chart.dateFrom,
            dateTo: chart.dateTo,
            periodTypeId: chart.period,
            orderTypeId: chartConfig.PickOrderBy ? chart.orderby : 0,
            sectionId: chartConfig.sectionId,
            yaxis: chart.yaxis,
            chartDataOnly: true,
            propertyRecordTypeId: chart.saleorrent,
            datadisplays: chart.displayitems
        };

        if (chart.branchId != undefined) {
            branches.push(chart.branchId);
            config.branchIds = branches;
        }

        if (chart.userId != undefined) {
            users.push(chart.userId);
            config.userIds = users;
        }

        if (chart.dataset === C.HomeChartConfig.MyActivity) {
            config.userIds = $('#_userid').val();
        }

        if (chart.dataset === C.HomeChartConfig.BranchActivity) {
            config.userIds = [];
            branches.push(chart.branchId);
            config.branchIds = branches;
        }

        $targetDiv
            .find('.opt-spinner')
            .html('<div class="home-spinner"></div>');

        var datePeriod = me.getDatePeriod(
            config.periodTypeId,
            config.dateFrom,
            config.dateTo
        );

        config.dateFrom = datePeriod.dateFrom;
        config.dateTo = datePeriod.dateTo;

        var cachedChartData = $targetDiv.data('chartdata');

        me.validateConfig(config);

        if (cachedChartData) {
            me.drawChart(
                $targetDiv,
                me.getChartTypeSettings(chart.chartType),
                cachedChartData,
                chart.title
            );
        } else {
            new gmgps.cloud.http("chartsdashboard-renderChart").getView({
                url: 'Home/GetChartDashboardGoogleDataTable',
                post: true,
                args: {
                    reportConfig: config
                },
                complex: true,
                background: true,
                onSuccess: function (response) {
                    me.drawChart(
                        $targetDiv,
                        me.getChartTypeSettings(chart.chartType),
                        response.Data,
                        chart.title
                    );
                    $targetDiv.data('chartdata', response.Data);
                }
            });
        }
    },

    validateConfig: function (config) {
        var me = this;

        //When no branch is specified, supply all of the available branchIds instead.  Not saved into the config.
        if (config.branchIds.length === 1 && config.branchIds[0] === 0) {
            var availableBranchIds = me.$root
                .find('#AvailableChartBranchIds')
                .val()
                .split(',');
            config.branchIds = availableBranchIds;
        }
    },

    renderSalesChart: function ($targetDiv, chart) {
        var me = this;

        new gmgps.cloud.http("chartsdashboard-renderSalesChart").ajax(
            {
                args: {
                    branchId: chart.branchId,
                    userId: chart.userId
                },
                background: true,
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/home/GetDashboardSalesChartData'
            },
            function (response) {
                me.drawChart(
                    $targetDiv,
                    chart.chartType,
                    response.Data,
                    chart.title
                );
            }
        );
    },

    renderHistoryChart: function ($target, boxType, chart) {
        var me = this;

        new gmgps.cloud.http("chartsdashboard-renderHistoryChart").ajax(
            {
                args: {
                    branchId: chart.branchId,
                    userId: chart.userId,
                    boxType: boxType
                },
                background: true,
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/home/GetDashboardHeadlineBoxFigures'
            },
            function (response) {
                me.drawChart(
                    $target,
                    chart.chartType,
                    response.Data,
                    chart.title
                );

                var total1Title = response.Data.Totals[0].label;

                total1Title = total1Title.replace('<br>', ' ');
                total1Title = 'Total ' + total1Title;
                total1Title = me.correctCase(total1Title);

                $target
                    .find('.databox-number.left')
                    .text(response.Data.Totals[0].value);
                $target.find('.databox-text.left').html(total1Title);

                var monthlyAvg = parseInt(response.Data.Totals[0].value);
                monthlyAvg = monthlyAvg / 12;
                monthlyAvg = monthlyAvg.toFixed(2);

                $target.find('.databox-number.right').text(monthlyAvg);
                $target.find('.databox-text.right').html('Monthly Average');
            }
        );
    },

    correctCase: function (str) {
        return str.replace(/\w\S*/g, function (txt) {
            return txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase();
        });
    },

    newGuid: function () {
        return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'
            .replace(/[xy]/g, function (c) {
                var r = (Math.random() * 16) | 0,
                    v = c == 'x' ? r : (r & 0x3) | 0x8;
                return v.toString(16);
            })
            .toUpperCase();
    },

    convertToGoogleDataTable: function (data) {
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
            dataTable.addRow([rows[i].label, rows[i].value]);
        }

        return { data: dataTable, columnCount: rows.length };
    },

    getChartContainerHTML: function (id) {
        return '<div id="{0}" data-id="{0}" class="user-chart-root col-lg-4 col-md-6 col-sm-12 col-xs-12"></div>'.format(
            id
        );
    },

    getChartTemplateHTML: function (id, chartType, title) {
        var me = this;

        var htmlLarge = [
            '<div id="' +
                id +
                '" style="height:375px; width:100%; background-image:none; background-color:white;" class="databox databox-inverted radius-bordered databox-shadowed databox-graded databox-vertical">',
            '<div class="databox-titlespace no-padding"><span class="databox-title" style="text-overflow: ellipsis; white-space: nowrap; overflow: hidden; height: 20px; width:90%; margin-left: 5px; float:left; font-size:13px; color:#1D1D1D; margin: 5px 0px 0px 7px;">' +
                title +
                '</span><div class="edit-user-chart i-17 i-cogs" style="float:right; margin:4px; cursor:pointer; margin: 6px 6px -5px 0px;"></div></div>',
            '<div style="height:300px; width:100%;" class="chart-area databox-top no-padding opt-spinner"></div>',
            '<div class="databox-bottom no-padding">',
            '<div class="databox-row">',
            '<div class="left-total databox-cell cell-6 text-align-left" style="float:left">',
            '<span class="databox-text left"></span>',
            '<span class="databox-number left"></span>',
            '</div>',
            '<div class="right-total databox-cell cell-6 text-align-right" style="float:left">',
            '<span class="databox-text right"></span>',
            '<span class="databox-number font-70 right"><div class="expand-chart"><div class="fa fa-expand"></div></div></span>',
            '</div>',
            '</div>',
            '</div>',
            '</div>'
        ].join('\n');

        var htmlSmall = [
            '<div id="' +
                id +
                '" class="chart-area databox-left bg-white" style="height:65px; width:110px; padding:5px !important;"></div>',
            '<div class="databox-right bg-white bordered bordered-platinum">',
            '<span class="databox-number sky"></span>',
            '<div class="databox-text darkgray"></div>',
            '</div>'
        ].join('\n');

        if (
            chartType != me.chartTypes.HeadlineVerticalBar &&
            chartType != me.chartTypes.HeadLineCurved
        ) {
            return htmlLarge;
        } else {
            return htmlSmall;
        }
    },

    drawChart: function ($target, chartType, viewModelData, title) {
        var me = this;

        //console.log(viewModelData);

        var googleTable = me.convertToGoogleDataTable(viewModelData);

        var chartData = googleTable.data;
        var columnCount = googleTable.columnCount;

        //console.log(viewModelData);

        var uniqueID = me.newGuid();
        var $container = $(me.getChartTemplateHTML(uniqueID, chartType, title));

        var dataAvailable = false;

        $target.html($container);

        var chartTarget = $target.find('.chart-area')[0];

        // Add summaries / totals
        if (viewModelData.Totals.length > 0) {
            $target
                .find('.left-total')
                .find('.databox-text')
                .html(viewModelData.Totals[0].label);
            $target
                .find('.left-total')
                .find('.databox-number')
                .html(viewModelData.Totals[0].value);
        }

        if (viewModelData.Totals.length > 1) {
            $target
                .find('.right-total .databox-text')
                .html(viewModelData.Totals[1].label);
            $target
                .find('.right-total .databox-number')
                .html(viewModelData.Totals[1].value);
        }

        // Check to see if any row value > 0
        for (var i = 0; i < viewModelData.Rows.length; i++) {
            if (viewModelData.Rows[i].value > 0) {
                dataAvailable = true;
                break;
            }
        }

        if (columnCount > 0 && dataAvailable) {
            // Draw requested chart
            var chart = null;

            switch (chartType) {
                case me.chartTypes[C.HomeChartType.HorizontalBar]:
                    chart = new google.visualization.BarChart(chartTarget);
                    break;

                case me.chartTypes[C.HomeChartType.PieChart]:
                    chart = new google.visualization.PieChart(chartTarget);
                    break;

                case me.chartTypes[C.HomeChartType.PieChart3D]:
                    chart = new google.visualization.PieChart(chartTarget);
                    break;

                case me.chartTypes[C.HomeChartType.PieChartHole]:
                    chart = new google.visualization.PieChart(chartTarget);
                    break;

                case me.chartTypes[C.HomeChartType.CurvedLine]:
                    chart = new google.visualization.LineChart(chartTarget);
                    break;

                case me.chartTypes[C.HomeChartType.VerticalBar]: {
                    chart = new google.visualization.ColumnChart(chartTarget);

                    if (viewModelData.Rows.length > 20) {
                        chartType.options.chartArea = {
                            left: 50,
                            top: 40,
                            bottom: 10,
                            right: 30
                        };
                    }

                    break;
                }

                case me.chartTypes[C.HomeChartType.HeadLineCurved]:
                    chart = new google.visualization.LineChart(chartTarget);
                    break;

                case me.chartTypes[C.HomeChartType.HeadlineVerticalBar]:
                    chart = new google.visualization.ColumnChart(chartTarget);
                    break;
            }

            if (chart != null) {
                chart.draw(chartData, chartType.options);
            }
        } else {
            $target
                .find('.chart-area')
                .html(
                    '<div style="font-size: 20px; margin-top: 145px; padding:0 20px;">Sorry, there is no data to display at this time</div>'
                );
        }
    },

    displayNoCharts: function (state) {
        var me = this;

        if (state) {
            me.$root.find('.no-apps').show();
        } else {
            me.$root.find('.no-apps').hide();
        }
    },

    lockUI: function (lock) {
        glass(lock);
    },

    refreshAll: function () {
        var me = this;

        var deferred = new $.Deferred();

        me.initialised = true;
        me.clearChartCache();

        me.lockUI(true);

        //Refreshing everything means a top-level change or initial load, so everything which wants a spinner gets one.  As each section completes, these get replaced.
        me.$root
            .find('.opt-spinner')
            .not('.opt-refresh-all-exclude')
            .html('<div class="home-spinner"></div>');

        $.when(me.loadUserCharts())
            .done(function () {
                deferred.resolve();
                me.lockUI(false);
            })
            .fail(function () {
                me.lockUI(false);
            });

        return deferred.promise();
    },

    sizeUI: function () {
        var me = this;
        me.drawUserCharts();
    }
};
