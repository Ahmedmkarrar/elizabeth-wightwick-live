gmgps.cloud.ui.views.home.esignaturesWidget = function (args) {
    this.branchId = 0;
    this.userId = 0;
    this.period = 0;

    var widget = this;
    var _showLayerCallback = args.showLayerCallback || function () {};

    function View() {
        var _jqueryRoot = null;
        var _statisticsContainer = null;
        var _chartContainer = null;
        var _this = this;

        Object.defineProperty(this, 'root', {
            get: function () {
                return _jqueryRoot;
            },
            set: function (value) {
                _jqueryRoot = value;
                _jqueryRoot.on(
                    'change',
                    '#dashboard-esignatures-period',
                    _this.periodChangedListener
                );
                _jqueryRoot.on(
                    'click',
                    '.esignatures-stat',
                    _this.statusSelectClickListener
                );
            }
        });

        Object.defineProperty(this, 'statisticsContainer', {
            get: function () {
                if (_statisticsContainer === null) {
                    _statisticsContainer = _jqueryRoot.find(
                        '#SigningRequestsWidgetStatistics'
                    );
                }
                return _statisticsContainer;
            },
            set: function (val) {
                _statisticsContainer = val;
            }
        });

        Object.defineProperty(this, 'chartContainer', {
            get: function () {
                if (_chartContainer === null) {
                    _chartContainer = _jqueryRoot.find('#SigningRequestsChart');
                }
                return _chartContainer;
            },
            set: function (val) {
                _chartContainer = val;
            }
        });

        Object.defineProperty(this, 'periodChangedListener', {
            value: function () {
                var target = $(this);
                var period = _this.getPeriod(target);
                _this.onPeriodChanged(period);
            },
            writable: false
        });

        Object.defineProperty(this, 'statusSelectClickListener', {
            value: function () {
                var target = $(this);
                var status = _this.getStatus(target);
                _this.onStatusSelected(status);
            },
            writable: false
        });

        this.getPeriod = function (ddl) {
            if (!ddl) {
                return _jqueryRoot.find('#dashboard-esignatures-period').val();
            }
            return ddl.val();
        };

        this.getStatus = function (button) {
            return button.attr('data-status');
        };

        this.showNoPermissionMessage = function (message) {
            var formattedMessage =
                '<div class="no-items-to-display"><div class="outer"><div class="icon fa fa-ban"></div><div class="message">' +
                message +
                '</div></div></div>';
            _chartContainer.html(formattedMessage);
            _statisticsContainer.hide();
        };

        this.showStatisticsContainer = function () {
            _statisticsContainer.show();
        };

        this.hideStatisticsContainer = function () {
            _statisticsContainer.hide();
        };

        this.onPeriodChanged = function (period) {
            widget.period = period;
            widget.refresh();
        };

        this.onStatusSelected = function (status) {
            _showLayerCallback({ status: status, period: widget.period });
        };
    }

    this.view = new View();
    this.view.root = args.$root;
    this.period = this.view.getPeriod();

    var esignApiClient =
        args.api || new gmgps.cloud.services.EsignaturesApi(args.http);
    this.statistics = new gmgps.cloud.ui.views.home.esignaturesStats(
        this.view.statisticsContainer,
        esignApiClient
    );

    this.chart = new gmgps.cloud.ui.views.home.esignaturesTimePeriodChart(
        this.view.chartContainer,
        esignApiClient
    );
    this.chart.onClick = function () {
        _showLayerCallback({
            status: C.SigningRequestStatus.InFlight,
            period: C.SigningRequestsPeriod.PastMonth
        });
    };

    this.redrawCharts = function () {
        this.refresh();
    };

    this.refresh = function () {
        var widget = this;
        widget.view.hideStatisticsContainer();

        var hasAltoESign = $('#HasESign').val() === 'True';

        return esignApiClient
            .getSigningRequestsPermissions(this.branchId)
            .then(function (permissions) {
                var message;
                if (!hasAltoESign) {
                    if (
                        !permissions.IsPropertyFileEnabledForGroup ||
                        !permissions.IsModuleOn
                    ) {
                        message =
                            'Esignatures is not enabled for ' +
                            (widget.branchId !== 0
                                ? 'the selected branch'
                                : 'any branches');

                        widget.view.showNoPermissionMessage(message);
                        return Q.reject();
                    }

                    if (!permissions.IsBranchEnabledForPropertyFile) {
                        message =
                            'The selected branch is not within the PropertyFile domain';

                        widget.view.showNoPermissionMessage(message);
                        return Q.reject();
                    }
                }

                widget.view.showStatisticsContainer();

                return Q.all([
                    widget.statistics.refresh({
                        branchId: widget.branchId,
                        userId: widget.userId,
                        period: widget.period
                    }),

                    widget.chart.refresh({
                        branchId: widget.branchId,
                        userId: widget.userId
                    })
                ]);
            });
    };
};
