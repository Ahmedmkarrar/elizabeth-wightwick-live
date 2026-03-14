gmgps.cloud.ui.views.home.chartsmodal = function (args) {
    var me = this;

    me.branchId = args.branchId;
    me.userId = args.userId;

    me.onComplete = args.onComplete;
    me.onCancel = args.onCancel;

    me.chart = args.chart;
    me.chartData = args.chartData;

    return me.init();
};

gmgps.cloud.ui.views.home.chartsmodal.prototype = {
    init: function () {
        var me = this;
        return me;
    },

    controller: function (args) {
        var me = this;

        me.$root = args.$root;
        me.$window = args.$window;

        me.chart = args.data.chart;
        me.chartData = args.data.chartData;
        me.title = me.chart.title;

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
                    sliceVisibilityThreshold: 0
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
                    legend: { position: 'bottom' }
                }
            },
            {
                id: C.HomeChartType.VerticalBar,
                summary: 'Bar Chart',
                options: {
                    chartArea: {
                        left: 50,
                        top: 20,
                        bottom: 150,
                        right: 20,
                        width: '90%',
                        height: '100%'
                    },
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
                    vAxis: { showTextEvery: 0 },
                    chartArea: {
                        left: 150,
                        top: 20,
                        right: 20,
                        bottom: 20,
                        width: '100%',
                        height: '100%'
                    },
                    bar: { groupWidth: '100%' },
                    legend: { position: 'none' }
                    //hAxis: { showTextEvery: 1, slantedText: false, slantedTextAngle: 90 }
                }
            }
        ];

        me.$window.find('.top').css('background-color', '#2dc3e8 !important');
        me.$window.find('.middle').css('background-color', '#ffffff');

        $(window).on('resize', function () {
            clearTimeout(me.resizeTimer);
            me.resizeTimer = setTimeout(function () {
                if (me.$root.is(':visible')) {
                    me.resizeWindow();
                }
            }, 250);
        });

        (this.resizeWindow = function () {
            var initialHeight = $(window).height() - 120;
            me.$window.css('height', initialHeight);

            var initialWidth = $(window).width() - 60;
            me.$window.css('width', initialWidth);

            me.$window.css('top', '25px');
            me.$window.css('left', '25px');

            var chartContainerHeight = initialHeight - 30;
            chartContainerHeight += 'px';

            me.$window
                .find('#userchartmodal')
                .css('height', chartContainerHeight);

            var chartSettings = me.getChartTypeSettings(me.chart.chartType);
            var googleChartData = me.convertToGoogleDataTable(me.chartData);

            me.drawChart(chartSettings, googleChartData);
        }),
            (this.convertToGoogleDataTable = function (data) {
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
            }),
            (this.drawChart = function (chartType, googleChartData) {
                var chart = null;

                var chartTarget = me.$window.find('#userchartmodal')[0];

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

                    case me.chartTypes[C.HomeChartType.VerticalBar]:
                        chart = new google.visualization.ColumnChart(
                            chartTarget
                        );
                        break;

                    case me.chartTypes[C.HomeChartType.HeadLineCurved]:
                        chart = new google.visualization.LineChart(chartTarget);
                        break;

                    case me.chartTypes[C.HomeChartType.HeadlineVerticalBar]:
                        chart = new google.visualization.ColumnChart(
                            chartTarget
                        );
                        break;
                }

                if (chart != null) {
                    chart.draw(googleChartData.data, chartType.options);
                }
            }),
            (this.getChartTypeSettings = function (chartTypeId) {
                return me.chartTypes[chartTypeId];
            }),
            // Delay window resize and initial chart drawdue to Window fade in effect
            setTimeout(function () {
                me.resizeWindow();

                var chartSettings = me.getChartTypeSettings(me.chart.chartType);
                var googleChartData = me.convertToGoogleDataTable(me.chartData);

                me.drawChart(chartSettings, googleChartData);
            }, 100);
    },

    show: function () {
        var me = this;

        new gmgps.cloud.ui.controls.window({
            title: me.chart.title,
            windowId: 'homechartmodalzoom',
            controller: me.controller,
            url: 'Home/GetUserChartTemplate',
            data: me,
            post: true,
            complex: true,
            draggable: true,
            modal: true,
            cancelButton: 'Close',
            onCancel:
                me.onCancel ||
                function () {
                    return true;
                }
        });
    }
};
