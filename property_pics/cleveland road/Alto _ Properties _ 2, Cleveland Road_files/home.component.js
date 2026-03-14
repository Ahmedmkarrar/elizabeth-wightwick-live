((function() {
    'use strict';

    angular
        .module('propertyfile.admin', [])
        .component('propertyfile.admin.home', {
            bindings: {},
            templateUrl:
                'scripts/app/angular/propertyfile/admin/home.html?' +
                window.appVersion,
            controllerAs: 'vm'
        });
}))();
