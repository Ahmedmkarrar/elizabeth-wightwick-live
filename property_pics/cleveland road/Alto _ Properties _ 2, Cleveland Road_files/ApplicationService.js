((function() {
    'use strict';

    angular
        .module('common.services')
        .factory('ApplicationService', [
            '$q',
            '$timeout',
            '$window',
            '$rootScope',
            'ApiService',
            'AddressService',
            'ModalService',
            'HttpService',
            'constants',
            service
        ]);

    function service(
        $q,
        $timeout,
        $window,
        $rootScope,
        ApiService,
        AddressService,
        ModalService,
        HttpService,
        constants
    ) {
        return {
            $q: $q,
            $timeout: $timeout,
            $window: $window,
            $rootScope: $rootScope,
            ApiService: ApiService,
            AddressService: AddressService,
            ModalService: ModalService,
            HttpService: HttpService,
            constants: constants
        };
    }
}))();
