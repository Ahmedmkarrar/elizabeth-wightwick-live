gmgps.cloud.ui.views.home.esignaturesTimePeriodChart = function (
    container,
    esignaturesApi
) {
    var _container = container;
    var _esignaturesApi = esignaturesApi;

    this.refresh = function (search) {
        var chart = new google.visualization.PieChart(_container[0]);

        var component = this;
        google.visualization.events.addListener(chart, 'select', function () {
            if (component.onClick) {
                component.onClick();
            }
        });

        google.visualization.events.addListener(
            chart,
            'onmouseover',
            function () {
                _container.css({ cursor: 'pointer' });
            }
        );

        google.visualization.events.addListener(
            chart,
            'onmouseout',
            function () {
                _container.css({ cursor: 'default' });
            }
        );

        _esignaturesApi
            .getOpenSigningRequestData(search)
            .then(function (chartData) {
                if (chartData.Total > 0) {
                    var datatable = convertToDatatable(chartData);

                    chart.draw(datatable, {
                        title: 'Awaiting Signature (' + chartData.Total + ')',
                        titleTextStyle: {
                            color: '#11b1d9',
                            fontSize: 25,
                            textAlign: 'center'
                        },
                        chartArea: { left: 0, top: 60, bottom: 10, right: 0 },
                        legend: {
                            position: 'right',
                            alignment: 'center',
                            textStyle: { fontSize: 10 }
                        },
                        pieHole: 0.5,
                        colors: ['#3366cc', '#53a93f', '#ff9900', '#f3414a'],
                        backgroundColor: 'transparent',
                        pieSliceText: 'percentage',
                        tooltip: {
                            text: 'both'
                        }
                    });
                } else {
                    var message =
                        'There are no signing requests for the selected branch and/or negotiator';
                    var content =
                        '<div class="no-leads-data-to-display"><div class="outer"><div class="icon fa fa-pie-chart"></div><div class="message">{0}</div></div></div>'.format(
                            message
                        );
                    container.html(content);
                    container.addClass('disabled');
                }
            });
    };

    function convertToDatatable(chartData) {
        var datatable = new google.visualization.DataTable();
        datatable.addColumn('string', 'TimeWindow');
        datatable.addColumn('number', 'Count');
        datatable.addRow([
            '0 to 7 Days (' + chartData.AwaitingSignatureFor0to7Days + ')',
            chartData.AwaitingSignatureFor0to7Days
        ]);
        datatable.addRow([
            '8 to 14 Days (' + chartData.AwaitingSignatureFor8to14Days + ')',
            chartData.AwaitingSignatureFor8to14Days
        ]);
        datatable.addRow([
            '15 to 21 Days (' + chartData.AwaitingSignatureFor15to21Days + ')',
            chartData.AwaitingSignatureFor15to21Days
        ]);
        datatable.addRow([
            'Expiring within 7 Days (' + chartData.ExpiringWithin7Days + ')',
            chartData.ExpiringWithin7Days
        ]);

        return datatable;
    }
};
