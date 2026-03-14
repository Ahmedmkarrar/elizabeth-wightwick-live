((function() {
    angular
        .module('propertyfile.contact')
        .component('propertyfile.contact.dashboard', {
            bindings: {},
            templateUrl:
                'scripts/app/angular/propertyfile/contact/dashboard.html?' +
                window.appVersion,
            controller: dashboardController,
            controllerAs: 'vm'
        });

    dashboardController.$inject = [
        'propertyFileService',
        '$window',
        'ModalService'
    ];

    function dashboardController(propertyFileService, $window, modalService) {
        var vm = this;

        vm.resendInvite = resendInvite;
        vm.deactivateAccount = deactivateAccount;
        vm.resetPassword = resetPassword;
        vm.logInAsAdmin = logInAsAdmin;
        vm.invite = invite;
        vm.showLastActiveAt = false;
        vm.validEmailAddress = true;
        vm.isActive = false;
        vm.statusChecked = false;
        vm.isLandlordsOrSellersModuleActive = false;
        vm.isTenantsModuleActive = false;

        vm.$onInit = init;

        var contactId;

        function init() {
            contactId = shell.views.contact.stepThroughHandler
                .stepThroughModeActive
                ? shell.views.contact.stepThroughHandler.activeMatchGroup
                      .currentRecordId
                : shell.views.contact.contactDetails.id;

            showHideSpinner(true);

            propertyFileService
                .propertyFileGroupByContact(contactId)
                .then(
                    function (propertyFileGroup) {
                        if (propertyFileGroup) {
                            if (propertyFileGroup.modules) {
                                vm.isLandlordsOrSellersModuleActive =
                                    propertyFileGroup.modules.some(function (
                                        module
                                    ) {
                                        return (
                                            module.moduleName === 'landlords' ||
                                            module.moduleName === 'sellers'
                                        );
                                    });
                                vm.isTenantsModuleActive =
                                    propertyFileGroup.modules.some(function (
                                        module
                                    ) {
                                        return module.moduleName === 'tenants';
                                    });
                            }
                            loadActivityStatus();
                            vm.isActive = true;
                        } else {
                            vm.isActive = false;
                        }
                    },
                    function () {}
                )
                .finally(function () {
                    vm.statusChecked = true;
                    showHideSpinner(false);
                });
        }

        function loadActivityStatus() {
            contactId = shell.views.contact.stepThroughHandler
                .stepThroughModeActive
                ? shell.views.contact.stepThroughHandler.activeMatchGroup
                      .currentRecordId
                : shell.views.contact.contactDetails.id;

            showHideSpinner(true);

            propertyFileService
                .loadActivityStatus(contactId)
                .then(
                    function (success) {
                        vm.status = success.propertyFileActivityStatus;
                        console.log('Status: ', vm.status);
                        vm.emailAddress = success.emailAddress;
                        if (vm.emailAddress.length > 0) {
                            vm.validEmailAddress = true;
                        } else {
                            vm.validEmailAddress = false;
                        }

                        var lastActiveDate = new Date(vm.status.lastActiveAt);

                        if (lastActiveDate.getTime() > 1) {
                            vm.showLastActiveAt = true;
                        }
                    },
                    function () {}
                )
                .finally(function () {
                    showHideSpinner(false);
                });
        }

        function invite() {
            showHideSpinner(true);
            propertyFileService
                .invite(contactId)
                .then(
                    function () {
                        vm.status.status = 1;
                        $.jGrowl(
                            'An invite to use PropertyFile has been sent successfully',
                            {
                                header: 'PropertyFile',
                                theme: 'growl-system',
                                life: 2000
                            }
                        );
                        //This is where I need to add the class to the relevant email address
                        markEmailAsUsedForPropertyFile();
                        updateStatusField('Pending');
                    },
                    function (error) {
                        $.jGrowl(
                            'There was an error sending an invite to use PropertyFile: ' +
                                error.data.exceptionMessage,
                            {
                                header: 'PropertyFile',
                                theme: 'growl-system',
                                life: 2000
                            }
                        );
                    }
                )
                .finally(function () {
                    loadActivityStatus();
                });
        }

        function resendInvite() {
            showHideSpinner(true);
            propertyFileService
                .resendInvite(contactId)
                .then(
                    function () {
                        $.jGrowl(
                            'An invite to use PropertyFile has been sent successfully',
                            {
                                header: 'PropertyFile',
                                theme: 'growl-system',
                                life: 2000
                            }
                        );
                        updateStatusField('Pending');
                    },
                    function () {
                        $.jGrowl(
                            'There was an error sending an invite to use PropertyFile',
                            {
                                header: 'PropertyFile',
                                theme: 'growl-system',
                                life: 2000
                            }
                        );
                    }
                )
                .finally(function () {
                    loadActivityStatus();
                });
        }

        function deactivateAccount() {
            return modalService
                .confirm(
                    'You are deactivating this users account in PropertyFile.  ' +
                        'To reactivate the account, you will need to re-invite the contact',
                    {
                        title: 'Deactivate Account'
                    }
                )
                .then(function (confirmed) {
                    if (confirmed) {
                        showHideSpinner(true);
                        propertyFileService
                            .deactivateAccount(contactId)
                            .then(
                                function () {
                                    vm.status.status = 3;
                                    $.jGrowl(
                                        'The account has been successfully deactivated in PropertyFile',
                                        {
                                            header: 'PropertyFile',
                                            theme: 'growl-system',
                                            life: 2000
                                        }
                                    );
                                    removePropertyFileClassFromEmail();
                                    updateStatusField('Deactivated');
                                },
                                function () {
                                    $.jGrowl(
                                        'There was an error deactivating the account in PropertyFile',
                                        {
                                            header: 'PropertyFile',
                                            theme: 'growl-system',
                                            life: 2000
                                        }
                                    );
                                }
                            )
                            .finally(function () {
                                loadActivityStatus();
                            });
                    }
                });
        }

        function resetPassword() {
            showHideSpinner(true);
            propertyFileService
                .resetPassword(contactId)
                .then(
                    function () {
                        $.jGrowl(
                            'A request to change the password has been successfully received',
                            {
                                header: 'PropertyFile',
                                theme: 'growl-system',
                                life: 2000
                            }
                        );
                    },
                    function () {
                        $.jGrowl(
                            'There was an error sending a request to change the password for PropertyFile',
                            {
                                header: 'PropertyFile',
                                theme: 'growl-system',
                                life: 2000
                            }
                        );
                    }
                )
                .finally(function () {
                    showHideSpinner(false);
                });
        }

        function logInAsAdmin() {
            showHideSpinner(true);
            propertyFileService
                .logInAsAdmin(contactId)
                .then(
                    function (redirectUrl) {
                        $window.open(redirectUrl, '_blank');
                    },
                    function () {
                        $.jGrowl(
                            'There was an error sending a request to log in as an admin with PropertyFile',
                            {
                                header: 'PropertyFile',
                                theme: 'growl-system',
                                life: 2000
                            }
                        );
                    }
                )
                .finally(function () {
                    showHideSpinner(false);
                });
        }

        function markEmailAsUsedForPropertyFile() {
            var emailTextboxes = angular.element('.email');
            for (var i = 0; i < emailTextboxes.length; i++) {
                if (emailTextboxes[i].value === vm.emailAddress) {
                    if (
                        !emailTextboxes[i].classList.contains(
                            'propertyfile-email-address'
                        )
                    ) {
                        emailTextboxes[i].classList.add(
                            'propertyfile-email-address'
                        );
                    }
                }
            }
        }

        function removePropertyFileClassFromEmail() {
            var email = angular.element('.propertyfile-email-address');
            email[0].classList.remove('propertyfile-email-address');
        }

        function updateStatusField(newStatus) {
            var $root = shell.views.contact.stepThroughHandler
                .stepThroughModeActive
                ? shell.views.contact.stepThroughHandler.activeMatchGroup
                      .detailsHandler.$root
                : shell.views.contact.contactDetails.$root;

            $root.find('.propertyfile-activity-status').html(': ' + newStatus);
            $root.find('#propertyFileActivityStatus').val(newStatus);
        }

        function showHideSpinner(show) {
            if (show) {
                $('#spinner').css({ display: 'block' });
            } else {
                $('#spinner').css({ display: 'none' });
            }
        }
    }
}))();
