((function() {
    angular
        .module('propertyfile.management')
        .component('propertyfile.management.timeslot', {
            bindings: {
                dayindex: '<',
                daywithtimeslots: '<',
                showheader: '<',
                onUpdate: '&'
            },
            templateUrl:
                'scripts/app/angular/propertyfile/management/timeslot.html?' +
                window.appVersion,
            controller: controller,
            controllerAs: 'vm'
        });

    controller.$inject = [];

    function controller() {
        var vm = this;

        vm.$onChanges = onChange;

        vm.removeTimeslot = removeTimeslot;
        vm.addTimeslot = addTimeslot;
        vm.isAddButtonEnabled = isAddButtonEnabled;
        vm.toggle = toggle;
        vm.isValid = isValid;

        vm.validFromTimes = getValidTimes(true);
        vm.validToTimes = getValidTimes(false);

        activate();

        function activate() {
            vm.parsedDay = getDay(vm.dayindex);
            vm.showHeader = vm.showheader;
        }

        function getValidTimes(fromTime) {
            var times = [];

            for (var hour = 6; hour < 24; hour++) {
                if ((!fromTime && hour !== 6) || fromTime) {
                    times.push(
                        moment(hour + ':' + '00', ['HH:mm']).format('h:mma')
                    );
                }

                if ((fromTime && hour !== 23) || !fromTime) {
                    times.push(
                        moment(hour + ':' + '30', ['HH:mm']).format('h:mma')
                    );
                }
            }

            return times;
        }

        function onChange(changesObj) {
            if (changesObj.daywithtimeslots) {
                if (
                    changesObj.daywithtimeslots.currentValue &&
                    !changesObj.daywithtimeslots.isFirstChange()
                ) {
                    vm.daywithtimeslots =
                        changesObj.daywithtimeslots.currentValue;
                }
            }

            if (vm.daywithtimeslots.timeslots.length === 0) {
                vm.daywithtimeslots.timeslots.push({});
            }
        }

        function getDay(dayIndex) {
            var stringDay;
            switch (dayIndex) {
                case 0:
                    stringDay = 'Sunday';
                    break;
                case 1:
                    stringDay = 'Monday';
                    break;
                case 2:
                    stringDay = 'Tuesday';
                    break;
                case 3:
                    stringDay = 'Wednesday';
                    break;
                case 4:
                    stringDay = 'Thursday';
                    break;
                case 5:
                    stringDay = 'Friday';
                    break;
                case 6:
                    stringDay = 'Saturday';
                    break;
                default:
                    stringDay = 'Invalid Day';
            }

            return stringDay;
        }

        function removeTimeslot(index) {
            if (vm.daywithtimeslots.active) {
                vm.daywithtimeslots.timeslots.splice(index, 1);
            }
        }

        function addTimeslot() {
            if (vm.daywithtimeslots.active) {
                vm.daywithtimeslots.timeslots.push({ valid: true });
            }
        }

        function isAddButtonEnabled(index) {
            if (
                (vm.daywithtimeslots.active &&
                    index === vm.daywithtimeslots.timeslots.length - 1) ||
                vm.daywithtimeslots.timeslots.length === 1
            ) {
                return true;
            }

            return false;
        }

        function toggle() {
            update();
        }

        function isValid(slot) {
            slot.Error = '';

            if (slot.fromDisplayValue !== undefined) {
                slot.from = moment(slot.fromDisplayValue, ['h:mma']).format(
                    'HH:mm'
                );
            }
            if (slot.toDisplayValue !== undefined) {
                slot.to = moment(slot.toDisplayValue, ['h:mma']).format(
                    'HH:mm'
                );
            }

            if (slot.from === undefined || slot.from.length < 1) {
                slot.fromInvalid = false;
            } else {
                slot.fromInvalid = !moment(slot.from, 'HH:mm', true).isValid();
            }

            if (slot.to === undefined || slot.to.length < 1) {
                slot.toInvalid = false;
            } else {
                slot.toInvalid = !moment(slot.to, 'HH:mm', true).isValid();
            }

            if (!slot.fromInvalid && !slot.toInvalid) {
                slot.Error = '';
                var isGreater = slot.from >= slot.to;

                slot.toInvalid = isGreater;
                slot.fromInvalid = isGreater;

                if (isGreater) {
                    slot.Error =
                        "Please ensure the 'To' time is after the 'From' time";
                }
            } else {
                slot.Error =
                    'Value needs to be in the following format: 2:30pm';
            }

            update();
        }

        function update() {
            vm.onUpdate({ daywithtimeslots: vm.daywithtimeslots });
        }
    }
}))();
