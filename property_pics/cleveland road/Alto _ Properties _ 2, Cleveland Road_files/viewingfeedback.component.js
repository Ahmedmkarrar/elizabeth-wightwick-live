((function() {
    angular
        .module('propertyfile.management')
        .component('propertyfile.management.viewingfeedback', {
            bindings: {
                micrositeId: '<',
                reload: '<',
                showViewingFeedbackTab: '<',
                onSave: '&'
            },
            templateUrl:
                'scripts/app/angular/propertyfile/management/viewingfeedback.html?' +
                window.appVersion,
            controller: controller,
            controllerAs: 'vm'
        });

    controller.$inject = ['propertyFileService', '$element'];

    function controller(propertyFileService, $element) {
        var vm = this;

        vm.$onChanges = onChanges;
        vm.save = save;
        vm.onCancel = onCancel;
        vm.moveToEditScreen = moveToEditScreen;
        vm.branches = [];
        vm.showBranches = true;
        vm.selectedBranch = {};

        activate();

        function onChanges(changesObj) {
            if (changesObj.reload && !changesObj.reload.isFirstChange()) {
                vm.reload = changesObj.reload.currentValue;
                if (vm.reload) {
                    triggerReload();
                }
            }
        }

        function activate() {
            triggerReload();
        }

        function triggerReload() {
            showHideSpinner(true);
            propertyFileService
                .getViewingFeedbackBranchConfig(vm.micrositeId)
                .then(
                    function (response) {
                        vm.branches =
                            response.viewingFeedbackBranchConfigurations;
                        vm.groupCanAccessPropertyManagement =
                            response.groupCanAccessPropertyManagement;
                        vm.showBranches = true;
                    },
                    function () {
                        $.jGrowl(
                            'There was an error retrieving the branches. Please try again',
                            {
                                header: 'PropertyFile',
                                theme: 'growl-system',
                                life: 2000
                            }
                        );
                    }
                )
                .finally(function () {
                    showHideSpinner(false);
                });
        }

        function moveToEditScreen(branch) {
            vm.selectedBranch = branch;
            vm.showBranches = false;
            vm.branchName = branch.branchName;

            alto.application.events.raise('view-loaded', $element[0], { viewName: 'tools', type: 'sub-section', name: 'PropertyFile.ViewingFeedback.Branch', id: branch.branchId })
        }

        function save() {
            vm.onSave({
                branch: vm.selectedBranch,
                integrationId: vm.micrositeId
            });
        }

        function onCancel() {
            triggerReload();
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
