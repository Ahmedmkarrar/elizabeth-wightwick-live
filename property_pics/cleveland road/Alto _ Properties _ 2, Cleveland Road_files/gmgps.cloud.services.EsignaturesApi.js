gmgps.cloud.services.EsignaturesApi = function (http) {
    var _http = http || new gmgps.cloud.http("EsignaturesApi-EsignaturesApi");
    var _componentFactory = new gmgps.cloud.ui.ComponentFactory();

    this.getOpenSigningRequestData = function (search) {
        var deferred = Q.defer();

        _http.ajax(
            {
                args: {
                    branchId: search.branchId,
                    negotiatorId: search.userId,
                    homePeriod: search.period
                },
                background: true,
                complex: true,
                dataType: 'json',
                type: 'get',
                url: '/SigningRequestDashboard/GetOpenSigningRequestData'
            },
            function (response) {
                if (!response) {
                    deferred.reject();
                    return;
                }

                if (!response.Data) {
                    deferred.reject();
                    return;
                }

                deferred.resolve(response.Data);
            }
        );

        return deferred.promise;
    };

    this.getSigningRequestsStats = function (search) {
        var deferred = Q.defer();

        _http.ajax(
            {
                args: {
                    branchId: search.branchId,
                    negotiatorId: search.userId,
                    homePeriod: search.period
                },
                background: true,
                complex: true,
                dataType: 'json',
                type: 'get',
                url: '/SigningRequestDashboard/GetSigningRequestsStats'
            },
            function (response) {
                if (!response) {
                    deferred.reject();
                    return;
                }

                if (!response.Data) {
                    deferred.reject();
                    return;
                }

                deferred.resolve(response.Data);
            }
        );

        return deferred.promise;
    };

    this.getSigningRequestsHtml = function (search) {
        var deferred = Q.defer();

        _http.ajax(
            {
                args: search,
                background: true,
                complex: true,
                dataType: 'json',
                type: 'get',
                url: '/SigningRequestDashboard/GetSigningRequests'
            },
            function (response) {
                if (!response) {
                    deferred.reject();
                    return;
                }

                if (!response.Data) {
                    deferred.reject();
                    return;
                }

                var html = $(response.Data);

                _componentFactory.hoist(html);

                deferred.resolve(html);
            }
        );

        return deferred.promise;
    };

    this.getSignatoriesHtml = function (id) {
        var deferred = Q.defer();

        _http.ajax(
            {
                args: {
                    id: id
                },
                background: true,
                complex: true,
                dataType: 'json',
                type: 'get',
                url: '/SigningRequestDashboard/GetSignatories'
            },
            function (response) {
                if (!response) {
                    deferred.reject();
                    return;
                }

                if (!response.Data) {
                    deferred.reject();
                    return;
                }

                var html = $(response.Data);

                _componentFactory.hoist(html);

                deferred.resolve(html);
            }
        );

        return deferred.promise;
    };

    this.getSigningRequestsPermissions = function (searchBranchId) {
        var deferred = Q.defer();

        _http.ajax(
            {
                args: {
                    branchId: searchBranchId
                },
                background: true,
                complex: true,
                dataType: 'json',
                type: 'get',
                url: '/SigningRequestDashboard/GetSigningRequestsPermissions'
            },
            function (response) {
                if (!response) {
                    deferred.reject();
                    return;
                }

                if (!response.Data) {
                    deferred.reject();
                    return;
                }

                deferred.resolve(response.Data);
            }
        );

        return deferred.promise;
    };
};
