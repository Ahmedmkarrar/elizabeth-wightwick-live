((function() {
    angular
        .module('propertyfile.contact')
        .service('propertiesService', service);

    service.$inject = ['ApiService'];

    function service(ApiService) {
        function getOwnedProperties(contactId) {
            var $g = ApiService.get.bind({componentName: "properties-getOwnedProperties"});
            return $g('PropertyOwner', 'OwnedProperties', {
                contactId: contactId
            });
        }

        return {
            getOwnedProperties: getOwnedProperties
        };
    }
}))();
