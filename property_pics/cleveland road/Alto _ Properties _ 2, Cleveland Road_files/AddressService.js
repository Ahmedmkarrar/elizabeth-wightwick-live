((function() {
    'use strict';
    angular
        .module('common.services')
        .factory('AddressService', ['ApiService', service]);

    function service(api) {
        return {
            lookup: lookup
        };

        function lookup(postcode) {
            return api.get('Address', 'Lookup', { postcode: postcode });
        }
    }
}))();
