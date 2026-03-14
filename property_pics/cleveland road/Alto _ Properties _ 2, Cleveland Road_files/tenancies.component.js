'use strict';

(function () {
    angular
        .module('propertyfile.contact')
        .component('propertyfile.contact.tenancies', {
            bindings: {},
            templateUrl:
                'scripts/app/angular/propertyfile/contact/tenancies.html?' +
                window.appVersion,
            controller: tenanciesController,
            controllerAs: 'vm'
        });

    tenanciesController.$inject = ['tenanciesService', 'shellService'];

    function tenanciesController(tenanciesService, shellService) {
        var contactId = shellService.getCurrentContactId();

        var model = this;
        model.contactId = contactId;
        model.loaded = false;
        model.tenancies = [];
        model.isDirty = false;
        model.allTenanciesIncluded = true;

        this.$onInit = init;

        function init() {
            function parseCachedContactHtmlForUnsavedData(tenancies) {
                var cachedData = shellService.cacheGet(
                    C.ModelType.Contact,
                    contactId
                );

                if (cachedData && cachedData.html) {
                    var cachedHtml = $(cachedData.html);
                    var ticks = cachedHtml.find(
                        'div.tick-and-cross.tenancy-included > input[type="checkbox"]'
                    );

                    angular.forEach(ticks, function (tick) {
                        var checkbox = angular.element(tick);
                        var firstTermTenancyId = parseInt(checkbox.val());
                        var firstTermTenancy = _.find(tenancies, {
                            FirstTermTenancyId: firstTermTenancyId
                        });
                        if (firstTermTenancy) {
                            firstTermTenancy.Included =
                                checkbox.hasClass('ticked');
                        }
                    });
                }
            }

            tenanciesService
                .getAvailableTenancies(model.contactId)
                .then(function (result) {
                    model.tenancies = result;
                    parseCachedContactHtmlForUnsavedData(model.tenancies);

                    model.loaded = true;
                });
        }

        this.toggleInclusion = function (tenancy) {
            tenancy.Included = !tenancy.Included;
            shellService.markContactChanged();
            model.isDirty = true;
        };

        this.setInclusionState = function (tenancy, include) {
            tenancy.Included = include;
            shellService.markContactChanged();
            model.isDirty = true;
        };

        this.setIncludeAllTenancies = function (include) {
            model.allTenanciesIncluded = include;
            model.tenancies.forEach(function (tenancy) {
                if (tenancy.Included !== include) {
                    model.setInclusionState(tenancy, include);
                }
            });
        };

        return this;
    }
})();
