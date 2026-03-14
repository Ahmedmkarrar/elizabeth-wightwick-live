((function() {
    'use strict';

    angular
        .module('common.wizard')
        .service('common.wizard.wizardService', [
            '$rootScope',
            '$state',
            service
        ]);

    function service($rootScope, $state) {
        var wizard = this,
            _state = {},
            _currentIndex = 0,
            _steps = [];

        Object.defineProperty(wizard, 'state', {
            get: function () {
                return _state;
            }
        });

        Object.defineProperty(wizard, 'steps', {
            get: function () {
                return _steps;
            },
            set: function (value) {
                _steps = value;
            }
        });

        Object.defineProperty(wizard, 'current', {
            get: function () {
                return _steps[_currentIndex];
            }
        });

        var goto = function (stepIndex) {
            // TODO validate direction parameter for over/underflow
            _currentIndex = stepIndex;

            _.each(_steps, function (s) {
                s.disabled = true;
            });

            wizard.current.disabled = false;
            $state.go(wizard.current.name, _state);
        };

        var move = function (direction) {
            var newIndex = (_currentIndex += direction);
            goto(newIndex);
        };

        wizard.goto = goto;

        wizard.close = function (data) {
            $rootScope.$broadcast('wizard::close', data);
        };

        wizard.reset = function () {
            _state = {};
            _currentIndex = 0;
            $state.go(wizard.current.name, _state);
        };

        wizard.start = function () {
            goto(0);
        };

        wizard.last = function () {
            goto(_steps.length - 1);
        };

        wizard.next = function () {
            move(1);
        };

        wizard.previous = function () {
            move(-1);
        };

        return wizard;
    }
}))();
