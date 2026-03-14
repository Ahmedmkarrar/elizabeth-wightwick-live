((function() {
    angular
        .module('propertyfile.management')
        .component('propertyfile.management.branch', {
            bindings: {
                branch: '<'
            },
            templateUrl:
                'scripts/app/angular/propertyfile/management/branch.html?' +
                window.appVersion,
            controllerAs: 'vm'
        });
}))();
