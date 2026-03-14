((function() {
    angular
        .module('propertyfile.admin')
        .component('propertyfile.admin.enablepropertyfile', {
            bindings: {
                onEnable: '&'
            },
            templateUrl:
                'scripts/app/angular/propertyfile/admin/enablepropertyfile.html?' +
                window.appVersion,
            controller: controller,
            controllerAs: 'vm'
        });

    controller.$inject = ['$log', 'ModalService'];

    function controller($log, modalService) {
        var vm = this;
        vm.enable = enable;

        function enable() {
            return modalService
                .confirm(
                    'You are enabling PropertyFile Integration.  ' +
                        'This will allow you to begin the process of creating a PropertyFile website. ' +
                        'Please confirm that you wish to proceed (you are consenting to send data about your agency to PropertyFile).',
                    {
                        title: 'Enable PropertyFile Integration'
                    }
                )
                .then(function (confirmed) {
                    if (confirmed) {
                        return vm.onEnable();
                    }
                });
        }
    }
}))();
