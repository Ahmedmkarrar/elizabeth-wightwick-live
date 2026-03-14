((function() {
    angular
        .module('propertyfile.management')
        .controller(
            'Propertyfile.Management.SiteManagementController',
            siteManagementController
        );

    siteManagementController.$inject = ['propertyFileService', '$window'];

    function siteManagementController(propertyFileService, $window) {
        var vm = this;

        vm.propertyFileGroups = [];
        vm.busy = false;
        vm.availableBranches = [];
        vm.reset = false;
        vm.addDomain = false;
        vm.addMicrosite = false;
        vm.showBranches = true;

        vm.savePropertyFileGroup = savePropertyFileGroup;
        vm.updatePropertyFileGroup = updatePropertyFileGroup;
        vm.clearPropertyFileGroup = clearPropertyFileGroup;
        vm.showHideAddMicrosite = showHideAddMicrosite;
        vm.displayMicrositePanel = displayMicrositePanel;
        vm.goToPropertyFile = goToPropertyFile;

        vm.saveTimeslotsForBranch = saveTimeslotsForBranch;
        vm.saveViewingFeedbackConfigForBranch =
            saveViewingFeedbackConfigForBranch;
        activate();

        function activate() {
            showHideSpinner(true);

            propertyFileService
                .getPropertyFileMicrosites()
                .then(function (groupBranchesAndMicrosites) {
                    vm.propertyFileGroups =
                        groupBranchesAndMicrosites.propertyFileGroups;
                    vm.availableBranches =
                        groupBranchesAndMicrosites.availableBranches.filter(
                            function (item) {
                                return item.status;
                            }
                        );

                    if (vm.propertyFileGroups.length > 0) {
                        vm.addMicrosite = true;
                        showHideAddMicrosite();
                        //Don't need to show the button if there is already a microsite
                        vm.addDomain = false;
                    } else {
                        vm.addMicrosite = true;
                    }
                })
                .finally(function () {
                    showHideSpinner(false);
                });
        }

        function savePropertyFileGroup(microsite) {
            showHideSpinner(true);

            propertyFileService.addMicrosite(microsite).then(
                function (addMicrositeResult) {
                    var newSite = addMicrositeResult.propertyFileGroups[0];
                    newSite.integrationId =
                        addMicrositeResult.propertyFileGroups[0].integrationId;
                    newSite.branches = microsite.branches;
                    updatePropertyFileGroup(newSite);
                },
                function () {
                    $.jGrowl(
                        'There was an error saving your PropertyFile website. Please try again',
                        {
                            header: 'PropertyFile',
                            theme: 'growl-system',
                            life: 2000
                        }
                    );
                }
            );
        }

        function updatePropertyFileGroup(microsite) {
            showHideSpinner(true);

            propertyFileService
                .updateMicrosite(microsite)
                .then(
                    function (addMicrositeResult) {
                        vm.addMicrosite = false;
                        if (addMicrositeResult.hasErrors === true) {
                            $.jGrowl(
                                'Your PropertyFile website has been created with some errors. Not all branches have been added.',
                                {
                                    header: 'PropertyFile',
                                    theme: 'growl-system',
                                    life: 4000
                                }
                            );
                        } else {
                            $.jGrowl(
                                'Your PropertyFile website has been created successfully',
                                {
                                    header: 'PropertyFile',
                                    theme: 'growl-system',
                                    life: 2000
                                }
                            );
                        }
                    },
                    function () {
                        $.jGrowl(
                            'There was an error updating your PropertyFile website. Please try again',
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
                    activate();
                });
        }

        function saveTimeslotsForBranch(branch, integrationId) {
            showHideSpinner(true);
            vm.reload = false;

            propertyFileService
                .saveTimeslotsForBranch(branch, integrationId)
                .then(
                    function () {
                        $.jGrowl(
                            'The timeslots have been updated successfully',
                            {
                                header: 'PropertyFile',
                                theme: 'growl-system',
                                life: 2000
                            }
                        );
                        vm.reload = true;
                    },
                    function () {
                        $.jGrowl(
                            'There was an error saving the timeslots for the branch. Please try again',
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

        function saveViewingFeedbackConfigForBranch(branch, integrationId) {
            showHideSpinner(true);
            vm.reload = false;

            propertyFileService
                .saveViewingFeedbackConfigForBranch(branch, integrationId)
                .then(
                    function () {
                        $.jGrowl(
                            'The viewing feedback config have been updated successfully',
                            {
                                header: 'PropertyFile',
                                theme: 'growl-system',
                                life: 2000
                            }
                        );
                        vm.reload = true;
                    },
                    function () {
                        $.jGrowl(
                            'There was an error saving the viewing feedback config for the branch. Please try again',
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

        function clearPropertyFileGroup() {
            if (vm.propertyFileGroups.length > 0) {
                showHideAddMicrosite();
            }
        }

        function showHideAddMicrosite() {
            if (vm.addMicrosite) {
                vm.addDomain = true;
                vm.addMicrosite = false;
            } else {
                vm.addDomain = false;
                vm.addMicrosite = true;
                angular.forEach(vm.propertyFileGroups, function (pfGroup) {
                    pfGroup.display = false;
                });
            }
        }

        function displayMicrositePanel(group) {
            if (group.display) {
                group.display = false;
            } else {
                angular.forEach(vm.propertyFileGroups, function (pfGroup) {
                    if (group !== pfGroup) {
                        pfGroup.display = false;
                    }
                });

                group.display = true;
                if (vm.addMicrosite) {
                    showHideAddMicrosite();
                }
            }
        }

        function goToPropertyFile(groupId) {
            showHideSpinner(true);
            propertyFileService
                .getAdminHash(groupId)
                .then(function (redirectUrl) {
                    $window.open(redirectUrl, '_blank');
                })
                .finally(function () {
                    showHideSpinner(false);
                });
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
