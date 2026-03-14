((function() {
    angular.module('propertyfile.contact').service('tenanciesService', service);

    service.$inject = ['ApiService'];

    function service(ApiService) {
        function getAvailableTenancies(contactId) {
            var $g = ApiService.get.bind({componentName: "tenancies-getAvailableTenancies"});
            return $g(
                'AvailableTenancies',
                'TenanciesByTenantContactId',
                { contactId: contactId }
            );
        }

        return {
            getAvailableTenancies: getAvailableTenancies
        };
    }
}))();
