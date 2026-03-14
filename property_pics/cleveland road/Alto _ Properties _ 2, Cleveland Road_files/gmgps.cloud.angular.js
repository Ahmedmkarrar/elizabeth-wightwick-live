gmgps.cloud.angular.$rootScope = null;
gmgps.cloud.angular.$compile = null;
gmgps.cloud.angular.applicationService = null;
gmgps.cloud.angular.compileElement = null;
gmgps.cloud.angular.$q = null;

$(document).ready(function () {
    var $injector = angular.bootstrap(document, ['ng', 'alto']);
    gmgps.cloud.angular.applicationService =
        $injector.get('ApplicationService');
    gmgps.cloud.angular.eventService = $injector.get('common.eventService');
    gmgps.cloud.angular.$rootScope = $injector.get('$rootScope');
    gmgps.cloud.angular.$compile = $injector.get('$compile');
    gmgps.cloud.angular.$q = $injector.get('$q');

    gmgps.cloud.angular.destroyChildScopes = function (element) {
        var scopes = getChildScopes(element);
        scopes.forEach(function (scope) {
            scope.$destroy();
        });
    };

    gmgps.cloud.angular.compileElement = function (element) {

        var deferred = gmgps.cloud.angular.$q.defer();

        $injector.invoke([
            '$compile',
            '$rootScope',
            function ($compile, $rootScope) {
                var compiled = $compile(element)($rootScope);                

                compiled.on('render-complete', function () {
                    deferred.resolve(compiled);
                })

                $rootScope.$apply();
            }
        ]);

        return deferred.promise;
    };

    function getChildScopes(element) {
        // if element doesn't have its own scope, then assume this is an incorrect call
        if (!$(element).hasClass('ng-scope')) {
            return [];
        }

        var $element = $(element);

        // Fetch all descendant elements
        var scopes = [angular.element(element).scope()]; // Add root element scope so we can skip it later

        var elements = $element.find('*');
        for (var i = 0; i < elements.length; i++) {
            var e = elements[i];
            var scope = angular.element(e).scope();
            if (!_.some(scopes, { $id: scope.$id })) {
                scopes.push(scope);
            }
        }

        // Remove the root element's scope from the array
        scopes.shift();

        return scopes;
    }
});
