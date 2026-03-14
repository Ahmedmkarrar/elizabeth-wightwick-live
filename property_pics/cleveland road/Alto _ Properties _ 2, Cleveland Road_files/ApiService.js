((function() {
    'use strict';

    angular
        .module('common.services')
        .factory('ApiService', ['$http', '$q', '$timeout', service]);

    function service($http, $q, $timeout) {
        var debugPause = 0; // Set this value (ms) to delay all api calls - Useful for testing busy indicators

        function setSignalRHeader(config) {
            if (!config.headers) {
                config.headers = {};
            }

            //Set signalR connectionId in a custom http header.
            if (
                window.shell !== undefined &&
                shell.connection !== undefined &&
                shell.connection.signalRConnectionId !== undefined
            ) {
                config.headers.signalRConnectionId =
                    shell.connection.signalRConnectionId;
            }
        }

        return {
            get: get,
            post: post,
            getUrl: getUrl
        };

        function getUrl(controller, action) {
            return 'api/1/' + controller.toLowerCase() + '/' + action + '/';
        }

        function get(controller, action, data) {
            if (!controller || !action)
                throw Error('Controller or Action is undefined');

            var config = {
                method: 'GET',
                url: getUrl(controller, action),
                params: data,
                headers: {
                    "X-Component-Name": this.componentName,
                    'Alto-Version' : alto.version
                }
            };

            setSignalRHeader(config);

            var deferred = $q.defer();
            $http(config).then(onSuccess, onError);
            return deferred.promise;

            function onSuccess(result) {
                $timeout(function () {
                    deferred.resolve(result.data);
                }, debugPause);
            }

            function onError(error) {
                deferred.reject(error);
            }
        }

        function post(controller, action, data, asParams) {
            if (!controller || !action)
                throw Error('Controller or Action is undefined');

            var config = {
                method: 'POST',
                url: getUrl(controller, action),
                headers: {
                    "X-Component-Name": this.componentName,
                    'Alto-Version': alto.version
                }
            };

            setSignalRHeader(config);

            if (asParams) config.params = data;
            else config.data = data;

            var deferred = $q.defer();
            $http(config).then(onSuccess, onError);
            return deferred.promise;

            function onSuccess(result) {
                $timeout(function () {
                    deferred.resolve(result.data);
                }, debugPause);
            }

            function onError(error) {
                deferred.reject(error);
            }
        }
    }
}))();
