'use strict';

(function () {
    angular
        .module('propertyfile.contact')
        .component('propertyfile.contact.properties', {
            bindings: {},
            templateUrl:
                'scripts/app/angular/propertyfile/contact/properties.html?' +
                window.appVersion,
            controller: propertiesController,
            controllerAs: 'vm'
        });

    propertiesController.$inject = [
        'propertiesService',
        'shellService'
    ];

    function propertiesController(propertiesService, shellService) {
        var contactId = shellService.getCurrentContactId();

        var model = this;
        model.contactId = contactId;
        model.loaded = false;
        model.properties = [];
        model.isDirty = false;
        model.allPropertiesIncluded = true;

        this.$onInit = init;

        function init() {
            function parseCachedContactHtmlForUnsavedData(properties) {
                var cachedData = shellService.cacheGet(
                    C.ModelType.Contact,
                    contactId
                );

                if (cachedData && cachedData.html) {
                    var cachedHtml = $(cachedData.html);
                    var ticks = cachedHtml.find(
                        'div.tick-and-cross.property-included > input[type="checkbox"]'
                    );

                    angular.forEach(ticks, function (tick) {
                        var checkbox = angular.element(tick);
                        var propertyId = parseInt(checkbox.val());
                        var property = _.find(properties, { Id: propertyId });
                        if (property) {
                            property.Included = checkbox.hasClass('ticked');
                        }
                    });
                }
            }

            propertiesService
                .getOwnedProperties(model.contactId)
                .then(function (result) {
                    model.properties = result;
                    parseCachedContactHtmlForUnsavedData(model.properties);

                    model.loaded = true;
                });
        }

        this.setInclusionState = function (property, include) {
            property.Included = include;
            shellService.markContactChanged();
            model.isDirty = true;
        };

        this.setIncludeAllProperties = function (include) {
            model.allPropertiesIncluded = include;
            model.properties.forEach(function (property) {
                if (property.Included !== include) {
                    model.setInclusionState(property, include);
                }
            });
        };

        return this;
    }
})();
