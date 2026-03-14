((function() {
    angular
        .module('propertyfile.admin')
        .controller('Propertyfile.Admin.HomeController', homeController);

    homeController.$inject = ['propertyFileService'];

    function homeController(propertyFileService) {
        var vm = this;

        //Properties
        vm.busy = false;
        vm.isEnabled = false;
        vm.isAdmin = false;
        vm.showActivatedBanner = false;
        vm.apiUrl = '';
        vm.view = '';

        //Functions
        vm.enablePropertyFile = enablePropertyFile;

        activate();

        function activate() {
            getPropertyFileInfo();
        }

        function enablePropertyFile() {
            showHideSpinner(true);
            propertyFileService
                .enablePropertyFile()
                .then(function success() {
                    vm.showActivatedBanner = true;
                    vm.isEnabled = true;

                    loadView();
                })
                .finally(function () {
                    showHideSpinner(false);
                });
        }

        function getPropertyFileInfo() {
            showHideSpinner(true);
            propertyFileService
                .getPropertyFileInfo()
                .then(function success(propertyFileInfo) {
                    console.log('PropertyFileInfo: ', propertyFileInfo);
                    vm.isEnabled = propertyFileInfo.productEnabledForGroup;
                    vm.isAdmin = propertyFileInfo.userIsGroupAdministrator;
                    vm.apiUrl = propertyFileInfo.apiUrl;

                    loadView();
                })
                .finally(function () {
                    showHideSpinner(false);
                });
        }

        function loadView() {
            if (!vm.isAdmin) {
                vm.view = 'no-access';
                return;
            }

            if (!vm.isEnabled) {
                vm.view = 'enable';
                return;
            }

            vm.view = 'siteManagement';
        }

        function showHideSpinner(show) {
            if (show) {
                $('#spinner').css({ display: 'block' });
            } else {
                $('#spinner').css({ display: 'none' });
            }
        }
    }
}))();
