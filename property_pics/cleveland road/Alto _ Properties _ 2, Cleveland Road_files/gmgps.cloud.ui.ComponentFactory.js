gmgps.cloud.ui.ComponentFactory = function () {
    this.constructorCache = [];
    var instanceId = 0;

    var findFunctionByName = function (
        functionName,
        context,
        constructorCache
    ) {
        if (constructorCache[functionName]) {
            console.debug('function found in cache');
            return constructorCache[functionName];
        }

        var namespaces = functionName.split('.');
        var func = namespaces.pop();
        for (var i = 0; i < namespaces.length; i++) {
            context = context[namespaces[i]];
        }

        var match = context[func];

        if (match) {
            constructorCache[functionName] = match;
            console.debug('function ' + functionName + ' added to cache');
        }

        return match;
    };

    var bindClick = function (element, component, componentName) {
        var clickFunctionName = element.attr('data-click');

        if (!clickFunctionName) {
            return;
        }

        if (element.hasClass('disabled')) {
            return;
        }

        if (!component[clickFunctionName]) {
            console.error(
                'Function ' +
                    clickFunctionName +
                    ' not recognised on ' +
                    componentName
            );
            return;
        }

        element.click(function () {
            component[clickFunctionName]();
        });
    };

    var constructComponent = function (element, constructorCache) {
        var $element = $(element);
        var constructorName = $element.attr('data-component');
        var constructorFunction = findFunctionByName(
            constructorName,
            window,
            constructorCache
        );

        if (constructorFunction) {
            instanceId++;

            var args = [$element];
            var modelRepresentation = $element.attr('data-model');
            if (modelRepresentation && modelRepresentation.length > 0) {
                var model = JSON.parse(modelRepresentation);
                args.push(model);
            }

            var object = Object.create(constructorFunction.prototype);
            var component = constructorFunction.apply(object, args);
            component._instanceId = instanceId;

            bindClick($element, component, constructorName);
        } else {
            console.error(constructorName + ' not found');
        }
    };

    this.hoist = function (content) {
        var elementsWithComponents = content.find('*[data-component]');
        var components = [];
        var cache = this.constructorCache;

        elementsWithComponents.each(function (_, element) {
            var component = constructComponent(element, cache);
            components.push(component);
        });

        return components;
    };

    return this;
};
