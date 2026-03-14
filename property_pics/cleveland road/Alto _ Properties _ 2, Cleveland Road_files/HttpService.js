((function() {
    'use strict';

    angular
        .module('common.services')
        .factory('HttpService', [
            '$rootScope',
            '$http',
            '$q',
            '$timeout',
            service
        ]);

    function service($rootScope, $http, $q, $timeout) {
        var debugPause = false; // Set this to 'true' delay all HTTP requests by a random amount (useful for testing busy indicators)

        return {
            send: send
        };

        function send(config) {
            var deferred = $q.defer();
            $http(config).then(onSuccess, onError);
            return deferred.promise;

            function onSuccess(result) {
                resolve(deferred, result.data);
            }

            function onError(error) {
                var httpError = {
                    error: error.statusText,
                    status: error.status
                };
                $rootScope.$broadcast('http::fault', httpError);
                deferred.reject(httpError);
            }
        }

        function resolve(deferred, result) {
            if (debugPause) {
                var timeout = Math.floor(Math.random() * 10 + 1) * 500;
                $timeout(function () {
                    console.warn(
                        'HTTP Requests are being artificially delayed (did you leave the debug switch on?)'
                    );
                    deferred.resolve(result);
                }, timeout);
            } else {
                deferred.resolve(result);
            }
        }
    }
}))();
