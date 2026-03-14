((function() {
    angular
        .module('propertyfile.management')
        .component('propertyfile.management.setavailability', {
            bindings: {
                appointmentType: '<',
                micrositeId: '<',
                reload: '<',
                showOfficeHoursTab: '<',
                onSave: '&'
            },
            templateUrl:
                'scripts/app/angular/propertyfile/management/setavailability.html?' +
                window.appVersion,
            controller: controller,
            controllerAs: 'vm'
        });

    controller.$inject = ['propertyFileService'];

    function controller(propertyFileService) {
        var vm = this;

        vm.$onChanges = onChanges;
        vm.$onInit = init;
        vm.save = save;
        vm.onCancel = onCancel;
        vm.moveToTimeslotScreen = moveToTimeslotScreen;
        vm.showHeader = showHeader;
        vm.updateTimeslot = updateTimeslot;
        vm.branches = [];
        vm.selectedBranchId = 0;
        vm.formInvalid = false;
        vm.showBranches = true;
        vm.days = [];
        vm.selectedBranch = {};

        // C# DayOfWeek enum is zero- indexed and begins with Sunday- we need to list days from Monday- Sunday
        vm.daysOfWeek = [1, 2, 3, 4, 5, 6, 0];

        activate();

        function onChanges(changesObj) {
            if (changesObj.reload && !changesObj.reload.isFirstChange()) {
                vm.reload = changesObj.reload.currentValue;
                if (vm.reload) {
                    triggerReload();
                }
            }
        }

        function init() {}

        function activate() {
            triggerReload();
        }

        function triggerReload() {
            showHideSpinner(true);
            //Using the integration id, get branches and their availability status/ settings
            // 1 = Market Appraisal
            propertyFileService
                .getBranchesAndAvailability(vm.micrositeId)
                .then(
                    function (branches) {
                        vm.branches = branches;
                        vm.showBranches = true;
                    },
                    function () {
                        //Handle this error
                    }
                )
                .finally(function () {
                    showHideSpinner(false);
                });
        }

        function moveToTimeslotScreen(branch) {
            vm.selectedBranch = branch;
            vm.days = [];
            angular.forEach(vm.daysOfWeek, function (dayOfWeek) {
                var selectedDay = vm.selectedBranch.days.filter(function (p) {
                    return p.day === dayOfWeek;
                });

                if (selectedDay.length === 0) {
                    selectedDay.push({
                        active: false,
                        propertyFileTimeslots: []
                    });
                }

                //Sort the period timeslots
                selectedDay[0].propertyFileTimeslots.sort(function (a, b) {
                    var convertedA = moment(a.from, 'HH:mm');
                    var convertedB = moment(b.from, 'HH:mm');

                    return convertedA - convertedB;
                });

                if (selectedDay[0].propertyFileTimeslots.length > 0) {
                    angular.forEach(
                        selectedDay[0].propertyFileTimeslots,
                        function (t) {
                            if (t.from !== undefined) {
                                t.fromDisplayValue = moment(t.from, [
                                    'HH:mm'
                                ]).format('h:mma');
                            }

                            if (t.to !== undefined) {
                                t.toDisplayValue = moment(t.to, [
                                    'HH:mm'
                                ]).format('h:mma');
                            }
                        }
                    );
                }

                vm.days.push({
                    day: dayOfWeek,
                    timeslots: selectedDay[0].propertyFileTimeslots,
                    active: selectedDay[0].active
                });
            });
            vm.showBranches = false;
            vm.branchName = branch.branchName;
        }

        function save() {
            var canSave = true;

            angular.forEach(vm.selectedBranch.days, function (p) {
                if (canSave) {
                    if (p.active && p.propertyFileTimeslots.length <= 0) {
                        canSave = false;
                    }

                    if (p.active && p.propertyFileTimeslots.length > 0) {
                        angular.forEach(p.propertyFileTimeslots, function (t) {
                            if (t.from === undefined || t.to === undefined) {
                                canSave = false;
                            }
                        });
                    }
                }
            });

            if (!canSave) {
                $.jGrowl(
                    'Active timeslots cannot be empty.  The timeslots have not been saved.',
                    {
                        header: 'PropertyFile',
                        theme: 'growl-system',
                        life: 4000
                    }
                );
            } else {
                vm.onSave({
                    branch: vm.selectedBranch,
                    integrationId: vm.micrositeId
                });
            }
        }

        function onCancel() {
            vm.showBranches = true;
        }

        function updateTimeslot(daywithtimeslots) {
            vm.formInvalid = false;

            //Using keepGoing as you can't use 'break' in angular.forEach
            var keepGoing = true;
            angular.forEach(vm.selectedBranch.days, function (p) {
                if (keepGoing) {
                    if (p.day === daywithtimeslots.day) {
                        p.active = daywithtimeslots.active;
                    }

                    if (p.active && daywithtimeslots.timeslots.length > 0) {
                        angular.forEach(
                            daywithtimeslots.timeslots,
                            function (t) {
                                if (
                                    keepGoing &&
                                    t.Error !== undefined &&
                                    t.Error.length > 1
                                ) {
                                    vm.formInvalid = true;
                                    keepGoing = false;
                                }
                            }
                        );
                    }
                }
            });
        }

        function showHeader(dayIndex) {
            if (dayIndex === 1) {
                return true;
            }

            return false;
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
