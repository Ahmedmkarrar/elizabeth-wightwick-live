((function() {
    angular.module('propertyfile').service('propertyFileService', service);

    service.$inject = ['$log', 'ApiService', '$http', '$q', '$timeout'];

    function service($log, apiService, $http, $q, $timeout) {
        var propertyFileService = {
            getPropertyFileInfo: getPropertyFileInfo,
            enablePropertyFile: enablePropertyFile,
            getPropertyFileMicrosites: getPropertyFileMicrosites,
            checkSubdomain: checkSubdomain,
            addMicrosite: addMicrosite,
            getAdminHash: getAdminHash,
            checkIfBranchIsEnabled: checkIfBranchIsEnabled,
            loadActivityStatus: loadActivityStatus,
            invite: invite,
            resendInvite: resendInvite,
            deactivateAccount: deactivateAccount,
            resetPassword: resetPassword,
            logInAsAdmin: logInAsAdmin,
            propertyFileGroupByContact: propertyFileGroupByContact,
            getBranchesAndAvailability: getBranchesAndAvailability,
            getViewingFeedbackBranchConfig: getViewingFeedbackBranchConfig,
            saveTimeslotsForBranch: saveTimeslotsForBranch,
            saveViewingFeedbackConfigForBranch:
                saveViewingFeedbackConfigForBranch,
            updateMicrosite: updateMicrosite
        };

        return propertyFileService;

        function getPropertyFileInfo() {
            var $g = apiService.get.bind({componentName: "PropertyFile-getPropertyFileInfo"});
            return $g('PropertyFile', 'GetPropertyFileInfo');
        }

        function enablePropertyFile() {
            var $p = apiService.post.bind({componentName: "PropertyFile-enablePropertyFile"});
            return $p('PropertyFile', 'ActivatePropertyFile');
        }

        function getPropertyFileMicrosites() {
            var $g = apiService.get.bind({componentName: "PropertyFile-getPropertyFileMicrosites"});
            return $g('PropertyFile', 'GetGroupInformation');
        }

        function checkSubdomain(subdomain) {
            var $g = apiService.get.bind({componentName: "PropertyFile-checkSubdomain"});
            return $g('PropertyFile', 'CheckSubdomain', {
                subdomain: subdomain
            });
        }

        function addMicrosite(microsite) {
            var $p = apiService.post.bind({componentName: "PropertyFile-addMicrosite"});
            return $p('PropertyFile', 'AddMicrosite', {
                microsite: microsite
            });
        }

        function getAdminHash(groupId) {
            var $g = apiService.get.bind({componentName: "PropertyFile-getAdminHash"});
            return $g('PropertyFile', 'GetAdminHash', {
                integrationId: groupId
            });
        }

        function checkIfBranchIsEnabled(branchId) {
            var $g = apiService.get.bind({componentName: "PropertyFile-checkIfBranchIsEnabled"});
            return $g('PropertyFile', 'IsBranchEnabled', {
                branchId: branchId
            });
        }

        function loadActivityStatus(contactId) {
            var $g = apiService.get.bind({componentName: "PropertyFile-loadActivityStatus"});
            return $g('PropertyFile', 'GetActivityStatus', {
                contactId: contactId
            });
        }

        function invite(contactId) {
            var $p = apiService.post.bind({componentName: "PropertyFile-invite"});
            return $p(
                'PropertyFile',
                'Invite',
                { contactId: contactId },
                true
            );
        }

        function resendInvite(contactId) {
            var $p = apiService.post.bind({componentName: "PropertyFile-resendInvite"});
            return $p(
                'PropertyFile',
                'ResendInvite',
                { contactId: contactId },
                true
            );
        }

        function deactivateAccount(contactId) {
            var $p = apiService.post.bind({componentName: "PropertyFile-deactivateAccount"});
            return $p(
                'PropertyFile',
                'DeactivateAccount',
                { contactId: contactId },
                true
            );
        }

        function resetPassword(contactId) {
            var $p = apiService.post.bind({componentName: "PropertyFile-resetPassword"});
            return $p(
                'PropertyFile',
                'ResetPassword',
                { contactId: contactId },
                true
            );
        }

        function logInAsAdmin(contactId) {
            var $g = apiService.get.bind({componentName: "PropertyFile-logInAsAdmin"});
            return $g('PropertyFile', 'LogInAsAdmin', {
                contactId: contactId
            });
        }

        function propertyFileGroupByContact(contactId) {
            var $g = apiService.get.bind({componentName: "PropertyFile-propertyFileGroupByContact"});
            return $g(
                'PropertyFile',
                'PropertyFileGroupByContact',
                { contactId: contactId },
                true
            );
        }

        function getBranchesAndAvailability(groupId) {
            var $g = apiService.get.bind({componentName: "PropertyFile-getBranchesAndAvailability"});
            return $g(
                'PropertyFile',
                'GetAvailability',
                { integrationId: groupId },
                true
            );
        }

        function getViewingFeedbackBranchConfig(integrationId) {
            var $g = apiService.get.bind({componentName: "PropertyFile-getViewingFeedbackBranchConfig"});
            return $g(
                'PropertyFile',
                'GetViewingFeedbackBranchConfig',
                { integrationId: integrationId },
                true
            );
        }

        function saveViewingFeedbackConfigForBranch(branch, integrationId) {
            var $p = apiService.post.bind({componentName: "PropertyFile-saveViewingFeedbackConfigForBranch"});
            return $p(
                'PropertyFile',
                'SaveViewingFeedbackConfigForBranch',
                {
                    integrationId: integrationId,
                    branchId: branch.branchId,
                    autoRequestSalesViewingFeedback:
                        branch.autoRequestSalesViewingFeedback,
                    autoRequestRentalViewingFeedback:
                        branch.autoRequestRentalViewingFeedback,
                    autoCopyViewingFeedbackForLandlord:
                        branch.autoCopyViewingFeedbackForLandlord,
                    autoCopyViewingFeedbackForVendor:
                        branch.autoCopyViewingFeedbackForVendor
                }
            );
        }

        function saveTimeslotsForBranch(branch, id) {
            var newBranch = {
                availabilitySet: branch.availabilitySet,
                branchId: branch.branchId,
                branchName: branch.branchName,
                days: []
            };

            angular.forEach(branch.days, function (p) {
                var f = format(p);
                newBranch.days.push(f);
            });

            //Having to move the $http call to here as this POST requires a combination of query strings
            //and post body in order for the model binding on the server to work

            var url =
                'api/1/propertyfile/savetimeslotsforbranch?integrationId=' + id;

            var config = {
                method: 'POST',
                url: url,
                data: newBranch
            };

            var debugPause = 0;

            var deferred = $q.defer();
            $http(config).then(onSuccess, onError);
            return deferred.promise;

            function onSuccess(result) {
                $timeout(function () {
                    deferred.resolve(result.data);
                }, debugPause);
            }

            function onError(error) {
                deferred.reject(error);
            }
        }

        function format(timeslot) {
            var d = {
                active: timeslot.active,
                day: timeslot.day,
                id: timeslot.id,
                propertyFileTimeslots: []
            };

            angular.forEach(timeslot.propertyFileTimeslots, function (t) {
                if (t.from !== undefined || t.to !== undefined) {
                    var e = {
                        id: t.id,
                        dayId: t.dayId,
                        from: t.from,
                        to: t.to
                    };
                    d.propertyFileTimeslots.push(e);
                }
            });

            return d;
        }

        function updateMicrosite(microsite) {
            var $p = apiService.post.bind({componentName: "PropertyFile-updateMicrosite"});
            return $p('PropertyFile', 'UpdateMicrosite', {
                microsite: microsite
            });
        }
    }
}))();
