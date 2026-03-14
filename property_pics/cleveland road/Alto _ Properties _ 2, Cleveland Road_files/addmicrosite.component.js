((function() {
    angular
        .module('propertyfile.management')
        .component('propertyfile.management.addmicrosite', {
            bindings: {
                isNew: '<',
                microsite: '<',
                group: '<',
                availableBranches: '<',
                reset: '<',
                onSave: '&',
                clearSite: '&',
                onUpdate: '&'
            },
            templateUrl:
                'scripts/app/angular/propertyfile/management/addmicrosite.html?' +
                window.appVersion,
            controller: controller,
            controllerAs: 'vm'
        });

    controller.$inject = [
        '$log',
        'propertyFileService',
        '$timeout',
        '$filter',
        'ModalService'
    ];

    function controller(
        $log,
        propertyFileService,
        $timeout,
        $filter,
        modalService
    ) {
        var vm = this;

        // excludes special characters(except the hypen), spaces and ensures that the string is between 5 and 210 characters in length
        var specialCharacterRegex = /^[a-zA-Z\d-]{5,210}$/;

        // ensures that the string doesn't start with http or www
        var httpRegex = /^(http|https|www)/;

        vm.showAvailableSelectAll = true;
        vm.showSelectedSelectAll = true;
        vm.isUpdate = false;
        vm.edit = false;

        var storedMicrosite = {};
        var storedBranches = [];
        var boxHeight = '';

        vm.$onChanges = onChanges;
        vm.$onInit = init;

        vm.checkSubDomain = checkSubDomain;
        vm.runningCheck = runningCheck;
        vm.isDisabled = isDisabled;
        vm.clear = clear;
        vm.checkEmailAddress = checkEmailAddress;

        vm.savePropertyFileGroup = savePropertyFileGroup;
        vm.getItemsForDragging = getItemsForDragging;
        vm.onDragStart = onDragStart;
        vm.onDrop = onDrop;
        vm.onMoved = onMoved;
        vm.onDropToSelectedBranches = onDropToSelectedBranches;
        vm.onDropToAvailableBranches = onDropToAvailableBranches;
        vm.selectAll = selectAll;
        vm.prepareForUpdate = prepareForUpdate;
        vm.isMovable = isMovable;
        vm.resetMicrosite = resetMicrosite;
        vm.onBranchSelected = onBranchSelected;
        vm.updatePropertyFileGroup = updatePropertyFileGroup;

        //Having to set a random number so that the css is set on the elements in this instance of the component on the page
        vm.uniqueIdSuffix = Math.floor(Math.random() * 99999999 + 1);
        var available = angular.element(
            '#availableBranches' + vm.uniqueIdSuffix
        );
        var selected = angular.element('#selectedBranches' + vm.uniqueIdSuffix);

        function init() {}

        function onChanges(changesObj) {
            if (changesObj.reset) {
                if (!changesObj.reset.isFirstChange()) {
                    clear(false);
                }
            }

            if (changesObj.availableBranches) {
                if (changesObj.availableBranches.isFirstChange()) {
                    if (changesObj.availableBranches.currentValue.length > 0) {
                        //Needing to set the timeout for it to be picked up on the next digest cycle
                        storedBranches = angular.copy(
                            changesObj.availableBranches.currentValue
                        );

                        $timeout(function () {
                            setMatchingHeights();
                        }, false);
                    }
                }
            }

            if (changesObj.microsite) {
                if (changesObj.microsite.isFirstChange()) {
                    initialiseMicrosite();
                }
                if (changesObj.microsite.currentValue) {
                    vm.microsite = changesObj.microsite.currentValue;
                    console.log('The microsite: ', vm.microsite);
                }
            }
        }

        function initialiseMicrosite() {
            vm.microsite = {
                subdomain: '',
                contactInformation: {
                    firstName: '',
                    lastName: '',
                    emailAddress: '',
                    contactNumber: '',
                    isValid: function () {
                        if (
                            vm.microsite.contactInformation.firstName.length >
                                0 &&
                            vm.microsite.contactInformation.lastName.length >
                                0 &&
                            vm.microsite.contactInformation.contactNumber
                                .length > 0
                        ) {
                            return true;
                        }

                        return false;
                    }
                },
                branches: []
            };

            storedMicrosite = angular.copy(vm.microsite);
        }

        function setMatchingHeights() {
            if (vm.isNew || vm.isUpdate) {
                if (available[0] === undefined) {
                    available = angular.element(
                        '#availableBranches' + vm.uniqueIdSuffix
                    );
                    selected = angular.element(
                        '#selectedBranches' + vm.uniqueIdSuffix
                    );
                }

                $timeout(function () {
                    if (boxHeight.length > 0) {
                        setHeight(boxHeight);
                    } else if (
                        available[0].offsetHeight >= selected[0].offsetHeight
                    ) {
                        setHeight(available[0].offsetHeight + 'px');
                    } else {
                        setHeight(selected[0].offsetHeight + 'px');
                    }
                }, false);
            }
        }

        function setHeight(height) {
            available.css('min-height', height);
            selected.css('min-height', height);

            //This sets the height for the draggable areas for both the selected and available branch lists
            angular
                .element('#ablist' + vm.uniqueIdSuffix)
                .css('min-height', height);
            angular
                .element('#sblist' + vm.uniqueIdSuffix)
                .css('min-height', height);

            //Set the local variable to the height so that it doesn't have to keep getting re- calculated
            if (boxHeight.length === 0) {
                boxHeight = height;
            }
        }

        function isDisabled() {
            var result = true;
            if (vm.subdomainResult === 'success') {
                if (vm.microsite.branches.length > 0) {
                    if (
                        vm.microsite.contactInformation.isValid() &&
                        checkEmailAddress()
                    ) {
                        result = false;
                    }
                }
            }
            return result;
        }

        function checkSubDomain() {
            vm.microsite.subdomain = vm.microsite.subdomain.toLowerCase();
            vm.subdomainResult = 'loading';
            propertyFileService.checkSubdomain(vm.microsite.subdomain).then(
                function (isSubdomainValid) {
                    if (!isSubdomainValid) {
                        vm.subdomainResult = 'error';
                        vm.subdomainError =
                            'This domain name has already been registered, please use a unique domain name';
                    } else {
                        vm.subdomainResult = 'success';
                    }
                },
                function () {
                    $.jGrowl(
                        'There was an error communicating with PropertyFile',
                        {
                            header: 'PropertyFile',
                            theme: 'growl-system',
                            life: 2000
                        }
                    );
                    vm.subdomainResult = '';
                }
            );
        }

        function runningCheck() {
            if (
                !specialCharacterRegex.test(vm.microsite.subdomain) ||
                httpRegex.test(vm.microsite.subdomain) ||
                vm.microsite.subdomain.endsWith('-')
            ) {
                vm.subdomainResult = 'error';
                vm.subdomainError =
                    'Domain names must be in the format: alphanumeric (can include a hyphen), ending in .propertyfile.co.uk. ' +
                    'It cannot be the TLD (e.g. .co.uk) part or assets or contact www. Length must be between 5 and 210 characters';
            } else {
                checkSubDomain();
            }
        }

        function checkEmailAddress() {
            if (vm.microsite.contactInformation.emailAddress.length > 0) {
                var atpos =
                    vm.microsite.contactInformation.emailAddress.indexOf('@');
                var dotpos =
                    vm.microsite.contactInformation.emailAddress.lastIndexOf(
                        '.'
                    );
                if (
                    atpos < 1 ||
                    dotpos < atpos + 2 ||
                    dotpos + 2 >=
                        vm.microsite.contactInformation.emailAddress.length
                ) {
                    vm.invalidEmail = true;
                    return false;
                } else {
                    vm.invalidEmail = false;
                    return true;
                }
            }
        }

        function clear(result) {
            if (result) {
                angular.forEach(vm.microsite.branches, function (branch, key) {
                    vm.availableBranches.push(branch);
                    vm.microsite.branches.splice(key, 1);
                });
            }

            initialiseMicrosite();
            vm.subdomainResult = '';

            if (result) {
                vm.clearSite();
            }
        }

        function prepareForUpdate() {
            vm.edit = true;
            vm.isUpdate = true;
            angular.forEach(vm.microsite.branches, function (branch) {
                branch.movable = 'false';
            });

            $timeout(function () {
                setMatchingHeights();
            }, false);

            storedMicrosite = angular.copy(vm.microsite);
            storedBranches = angular.copy(vm.availableBranches);
        }

        function resetMicrosite() {
            $timeout(function () {
                vm.microsite = angular.copy(storedMicrosite);
                vm.availableBranches = angular.copy(storedBranches);
            }, false);

            vm.edit = false;
            vm.isUpdate = false;
        }

        function savePropertyFileGroup() {
            return modalService
                .confirm(
                    'You are adding a PropertyFile Microsite.  ' +
                        'Please check that the inputted information is correct. ' +
                        'Upon clicking confirm, you will not be able to change any of the details entered.',
                    {
                        title: 'Add PropertyFile Microsite'
                    }
                )
                .then(function (confirmed) {
                    if (confirmed) {
                        vm.onSave({ microsite: vm.microsite });
                    }
                });
        }

        function updatePropertyFileGroup() {
            return modalService
                .confirm(
                    'You are about to update your PropertyFile Microsite. ' +
                        'Please check that the inputted information is correct',
                    {
                        title: 'Update PropertyFile Microsite'
                    }
                )
                .then(function (confirmed) {
                    if (confirmed) {
                        vm.onUpdate({ microsite: vm.microsite });
                    }
                });
        }

        //Drag and drop code
        function getItemsForDragging(list, item) {
            console.log('getItemsForDragging');
            item.selected = true;
            return list.filter(function (item) {
                return item.selected;
            });
        }

        function onDragStart(list) {
            console.log('dragStart');
            list.dragging = true;
        }

        function onDrop(list, items, index, event) {
            console.log('onDrop');
            console.log('drop-X: ' + event.X + ', drop-Y: ' + event.Y);
            angular.forEach(items, function (item) {
                item.selected = false;
            });
            return true;
        }

        function onDropToSelectedBranches(items, event) {
            console.log(
                'drop-X: ' + event.clientX + ', drop-Y: ' + event.clientY
            );

            angular.forEach(items, function (item) {
                var doesBranchExist = $filter('filter')(vm.microsite.branches, {
                    branchId: item.branchId
                })[0];
                if (!doesBranchExist) {
                    var branchToRemove = $filter('filter')(
                        vm.availableBranches,
                        { branchId: item.branchId }
                    )[0];
                    var index = vm.availableBranches.indexOf(branchToRemove);
                    vm.availableBranches.splice(index, 1);
                    item.selected = false;
                    console.log('The Branch: ', item);
                    vm.microsite.branches.push(item);
                }
            });

            return true;
        }

        function onDropToAvailableBranches(items) {
            angular.forEach(items, function (item) {
                var doesBranchExist = $filter('filter')(vm.availableBranches, {
                    branchId: item.branchId
                })[0];
                if (!doesBranchExist) {
                    var branchToRemove = $filter('filter')(
                        vm.microsite.branches,
                        { branchId: item.branchId }
                    )[0];
                    var index = vm.microsite.branches.indexOf(branchToRemove);
                    vm.microsite.branches.splice(index, 1);
                    item.selected = false;

                    if (vm.isUpdate) {
                        if (item.movable === true) {
                            $timeout(function () {
                                vm.availableBranches.push(item);
                            }, false);
                        } else {
                            $timeout(function () {
                                vm.microsite.branches.push(item);
                            }, false);
                        }
                    } else {
                        vm.availableBranches.push(item);
                    }
                }
            });

            return true;
        }

        function onMoved(list, listName) {
            if (listName === 'available') {
                vm.showAvailableSelectAll = true;
            } else {
                vm.showSelectedSelectAll = true;
            }
        }

        function selectAll(listName, selected) {
            if (listName === 'available') {
                makeSelectedAction(vm.availableBranches, selected);
                vm.showAvailableSelectAll = !selected;
            } else {
                makeSelectedAction(vm.microsite.branches, selected);
                vm.showSelectedSelectAll = !selected;
            }
        }

        function makeSelectedAction(list, selected) {
            angular.forEach(list, function (listItem) {
                listItem.selected = selected;
            });
        }

        function isMovable(branch) {
            var preventMoving = true;

            if (branch.movable === null || branch.movable === undefined) {
                branch.movable = true;
            }

            if (branch.movable) {
                preventMoving = false;
            } else {
                vm.microsite.branches.push(branch);
            }

            return preventMoving;
        }

        function onBranchSelected(branch) {
            branch.selected = !branch.selected;
        }

        //--End of drag and drop code
    }
}))();
