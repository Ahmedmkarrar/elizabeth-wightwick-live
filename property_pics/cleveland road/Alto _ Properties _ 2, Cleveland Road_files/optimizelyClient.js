'use strict';
(function (alto) {
    function createOptimizelyInstance() {
        var optimizelyClientInstance = optimizelySdk.createInstance({
            datafile: window.optimizelyDatafile
        });
        return optimizelyClientInstance;
    }

    var environment = document.head
        .querySelector('meta[name="environment"]')
        .getAttribute('content');

    alto.optimizelyClient = {
        isFeatureEnabled: function (featureName, userId) {
            try {
                var client = createOptimizelyInstance();
                var userAttributes =
                    alto.FeatureContext.getUserAudienceMetadata();
                return client.isFeatureEnabled(
                    featureName,
                    'User:' + userId,
                    userAttributes
                );
            } catch (exc) {
                return false;
            }
        },
        isFeatureEnabledForGroup: function (featureName, groupId, attributes) {
            try {
                const urlParams = new URLSearchParams(window.location.search);
                var featureIsProgrammaticallyActivated =
                    urlParams.get('force_feature_flag-' + featureName) ==
                    'true';
                if (featureIsProgrammaticallyActivated) {
                    console.log(
                        `Feature ${featureName} turned on for group ${groupId} by flag.`
                    );
                    return true;
                }

                var client = createOptimizelyInstance();
                return client.isFeatureEnabled(
                    featureName,
                    'Group:' + groupId,
                    {
                        ...attributes,
                        GroupId: parseInt(groupId),
                        Environment: environment
                    }
                );
            } catch (exc) {
                return false;
            }
        },
        isFeatureEnabledForGroupOrUser: function (featureName, groupId, userId, attributes) {
            try {
                const urlParams = new URLSearchParams(window.location.search);
                var featureIsProgrammaticallyActivated =
                    urlParams.get('force_feature_flag-' + featureName) ==
                    'true';
                if (featureIsProgrammaticallyActivated) {
                    console.log(
                        `Feature ${featureName} turned on for group ${groupId} by flag.`
                    );
                    return true;
                }

                var client = createOptimizelyInstance();
                var userAttributes =
                alto.FeatureContext.getUserAudienceMetadata();

                var enabledForUser = client.isFeatureEnabled(
                    featureName,
                    'User:' + userId,
                    userAttributes
                );

                if(enabledForUser) return true;

                var enabledForGroup = client.isFeatureEnabled(
                    featureName,
                    'Group:' + groupId,
                    {
                        ...attributes,
                        GroupId: parseInt(groupId),
                        Environment: environment
                    }
                );

                return enabledForGroup;
            } catch (exc) {
                return false;
            }
        },
        isFeatureEnabledForBranch: function (featureName, groupId, branchId, attributes) {
            try {
                const urlParams = new URLSearchParams(window.location.search);
                var featureIsProgrammaticallyActivated =
                    urlParams.get('force_feature_flag-' + featureName) ==
                    'true';
                if (featureIsProgrammaticallyActivated) {
                    console.log(
                        `Feature ${featureName} turned on for branch ${branchId} by flag.`
                    );
                    return true;
                }

                var client = createOptimizelyInstance();
                return client.isFeatureEnabled(
                    featureName,
                    'Branch:' + branchId,
                    {
                        ...attributes,
                        GroupId: parseInt(groupId),
                        BranchId: parseInt(branchId),
                        Environment: environment
                    }
                );
            } catch (exc) {
                return false;
            }
        },
        getFeatureVariable: function (
            featureName,
            featureVariableName,
            userId
        ) {
            try {
                var client = createOptimizelyInstance();
                var userAttributes =
                    alto.FeatureContext.getUserAudienceMetadata();
                return client.getFeatureVariable(
                    featureName,
                    featureVariableName,
                    userId,
                    userAttributes
                );
            } catch (exc) {
                return null;
            }
        },
        getVariation: function (experimentKey, userId) {
            try {
                var client = createOptimizelyInstance();
                var userAttributes =
                    alto.FeatureContext.getUserAudienceMetadata();
                return client.getVariation(
                    experimentKey,
                    userId,
                    userAttributes
                );
            } catch (exc) {
                return null;
            }
        },
        trackEvent: function (eventName, userId) {
            try {
                var client = createOptimizelyInstance();
                var userAttributes =
                    alto.FeatureContext.getUserAudienceMetadata();
                var user = client.createUserContext(userId, userAttributes);

                user.trackEvent(eventName);
            } catch (exc) {}
        }
    };
})((window.alto = window.alto || {}));
