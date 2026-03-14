'use strict';
(function () {
    angular.module('propertyfile.contact').service('shellService', service);

    service.$inject = [];

    function service() {
        function getCurrentContactId() {
            var contactId = shell.views.contact.stepThroughHandler
                .stepThroughModeActive
                ? shell.views.contact.stepThroughHandler.activeMatchGroup
                      .currentRecordId
                : shell.views.contact.contactDetails.id;
            return contactId;
        }

        function markContactChanged() {
            shell.views.contact.contactDetails.setDirty(true);
        }

        return {
            getCurrentContactId: getCurrentContactId,
            markContactChanged: markContactChanged,
            cacheGet: function (modelType, id) {
                return shell.cache.get(modelType, id);
            },
            cachePut: function (object) {
                shell.cache.put(object);
            },
            cacheRemove: function (modelType, id) {
                shell.cache.del(modelType, id);
            }
        };
    }
})();
