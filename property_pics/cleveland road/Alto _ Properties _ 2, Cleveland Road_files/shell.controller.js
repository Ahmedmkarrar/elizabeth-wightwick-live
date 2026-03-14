((function() {
    'use strict';

    angular.module('shell').controller('shell.ShellController', controller);

    function controller() {
        var shell = this;

        shell.test = 'test';
    }
}))();
