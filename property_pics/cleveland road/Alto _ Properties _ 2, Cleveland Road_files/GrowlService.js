((function() {
    'use strict';

    angular.module('common.services').factory('GrowlService', [service]);

    function service() {
        function growl(args) {
            var theme = args.theme || 'growl-updater growl-system';
            var life = args.life || 2000;
            $.jGrowl(args.message, {
                header: args.title,
                theme: theme,
                life: life
            });
        }

        return {
            growl: growl
        };
    }
}))();
