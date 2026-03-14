'use strict';
(function (alto) {

    function KeyfloIntegration() {

        const VIEWINGS_AND_OFFERS_MODULE_NAME = 'ViewingsAndOffers';
        const SALES_PROGRESSION_MODULE_NAME = 'SalesProgression';
        var _modules;
        var _connected = false;

        var openModuleRequest = null;

        var getModules = function () {

            if (openModuleRequest) {
                return openModuleRequest;
            }

            var deferred = Q.defer();
            openModuleRequest = deferred.promise;

            if (_modules !== undefined) {
                console.debug('Modules loaded');
                deferred.resolve(_modules);
                openModuleRequest = null;
            }
            else {
                console.debug('Loading modules');
                fetch("/api/1/keyflo/Modules")
                    .then(function (response) {
                        console.debug('Loading modules - responded');
                        return response.json();
                    })
                    .then(function (body) {
                        console.debug('Loading modules - resolved');
                        _modules = body;
                        deferred.resolve(_modules);
                        openModuleRequest = null;
                    })
                    .catch(function () {
                        console.debug('Loading modules - failed');
                        openModuleRequest = null;
                    })
            }

            console.debug('Loading modules - waiting');
            return deferred.promise;
        }

        async function hasModule(name) {
            var modules = await getModules();
            return modules.includes(name);
        }

        this.hidePropertyFileTabForContact = function (contactNavigation) {
            var roles = contactNavigation.getRoles();
            if (roles.length === 0) return;

            if (roles.length === 1 && roles[0] === "Vendor") {
                contactNavigation.hidePropertyFileTab();
            } else if (roles.length === 2 && roles.includes("Vendor") && roles.includes("Applicant")) {
                var invitationIsActive = contactNavigation.isInvitationActive();
                if (invitationIsActive) return;

                contactNavigation.hidePropertyFileTab();
            }
        }

        this.hideContactPropertiesList = function (contactPropertyFileLayer) {

            var roles = contactPropertyFileLayer.getRoles();
            if (roles.length === 0) return;

            if (roles.length === 2 && roles.includes("Vendor") && roles.includes("Tenant")) {
                contactPropertyFileLayer.hidePropertiesList();
            } else if (roles.length === 2 && roles.includes("Vendor") && roles.includes("Landlord")) {
                contactPropertyFileLayer.hideLettingsPropertiesByStatus();
            }
        }

        this.hideVendorInvitationIndicator = function (contactOverviewLayer) {
            var roles = contactOverviewLayer.getRoles();
            if (roles.length === 0) return;

            if (roles.length === 1 && roles[0] === "Vendor") {
                contactOverviewLayer.hidePropertyFileStatus();
            } else if (roles.length === 2 && roles[0] === "Vendor" && roles[1] === "Applicant") {
                var invitationIsActive = contactOverviewLayer.isInvitationActive();
                if (invitationIsActive) return;

                contactOverviewLayer.hidePropertyFileStatus();
            }
        }

        this.hideVendorAndApplicantStatusIndicators = function (viewingDialog) {
            viewingDialog.hidePropertyFileStatusForVendorsAndApplicants();
        }

        this.hideAdminViewingControls = function (dashboard) {
            dashboard.hideViewingControls();
        }

        this.hidePropertyStatusDialogBanner = function (propertyStatusDialog) {
            propertyStatusDialog.hideBanner();
            propertyStatusDialog.disableInvites();
        }
        this.connect = function () {

            _modules = undefined;

            if (!_connected) {

                alto.application.events.listen('view-loaded', { viewName: 'contact', type: 'detail' }, async e => {
                    var hasViewingAndOffers = await hasModule(VIEWINGS_AND_OFFERS_MODULE_NAME);
                    var hasSalesProgression = await hasModule(SALES_PROGRESSION_MODULE_NAME);

                    if (hasViewingAndOffers && hasSalesProgression) {
                        var view = new alto.Keyflo.UI.ContactNavigation(e.target);
                        this.hidePropertyFileTabForContact(view);
                    }
                });

                alto.application.events.listen('view-loaded', { viewName: 'contact', type: 'layer', name: 'propertyfile' }, async e => {
                    var hasSellers = await hasModule(VIEWINGS_AND_OFFERS_MODULE_NAME);
                    if (hasSellers) {
                        var view = new alto.Keyflo.UI.ContactPropertyFileDashboard(e.target);
                        this.hideContactPropertiesList(view);
                        view.tailorCopy();
                    }
                });

                alto.application.events.listen('view-loaded', { viewName: 'contact', type: 'layer', name: 'overview' }, async e => {
                    var hasSellers = await hasModule(VIEWINGS_AND_OFFERS_MODULE_NAME);
                    if (hasSellers) {
                        var view = new alto.Keyflo.UI.ContactDetails(e.target);
                        this.hideVendorInvitationIndicator(view);
                    }
                });

                alto.application.events.listen('view-loaded', { viewName: 'contact', type: 'layer', name: 'contactinfo' }, async e => {

                    var view = new alto.Keyflo.UI.ContactDetails(e.target);
                    view.SetDefaultKeyfloViewingPreference(e.detail.id);

                    var hasViewingAndOffers = await hasModule(VIEWINGS_AND_OFFERS_MODULE_NAME);
                    if (hasViewingAndOffers) {
                        view.showKeyfloPreferences(view);
                    }
                });

                alto.application.events.listen('view-loaded', { viewName: 'propertyViewingModal', type: 'dialog' }, async e => {
                    var hasSellers = await hasModule(VIEWINGS_AND_OFFERS_MODULE_NAME);
                    if (hasSellers) {
                        var view = new alto.Keyflo.UI.ViewingDialog(e.target);
                        this.hideVendorAndApplicantStatusIndicators(view);
                    }
                });

                alto.application.events.listen('view-loaded', { viewName: 'propertyStatusModal', type: 'dialog' }, async e => {
                    var hasSellers = await hasModule(SALES_PROGRESSION_MODULE_NAME);
                    if (hasSellers) {
                        var view = new alto.Keyflo.UI.PropertyStatusDialog(e.target);
                        this.hidePropertyStatusDialogBanner(view);
                    }
                });

                alto.application.events.listen('view-loaded', { viewName: 'tools', type: 'sub-section', name: 'PropertyFile.ViewingFeedback.Branch' }, async e => {
                    var hasSellers = await hasModule(VIEWINGS_AND_OFFERS_MODULE_NAME);
                    if (hasSellers) {
                        var view = new alto.Keyflo.UI.AdminDashboard(e.target);
                        this.hideAdminViewingControls(view);
                    }
                });

                alto.application.events.listen('view-loaded', { viewName: 'tools', type: 'section', name: 'PropertyFile' }, async e => {
                    var hasSellers = await hasModule(VIEWINGS_AND_OFFERS_MODULE_NAME);
                    if (hasSellers) {
                        var view = new alto.Keyflo.UI.AdminDashboard(e.target);
                        view.tailorCopy();
                    }
                });

                alto.application.events.listen('view-loaded', { viewName: 'getMultiMessagerModal', type: 'dialog' }, '[data-intent="viewing-confirmations"]', async e => {
                    var viewingsSentViaKeyFlo = alto.optimizelyClient.isFeatureEnabled('viewing_emails_sent_via_keyflo', shell.userId);
                    if (viewingsSentViaKeyFlo === false) return;

                    var view = new alto.Keyflo.UI.ViewingConfirmationDialog(e.target, _modules);
                    var hasSellers = await hasModule(VIEWINGS_AND_OFFERS_MODULE_NAME);
                    if (hasSellers) {
                        view.showEmailSendingInformationBar(`Owner confirmation and reminder emails are now sent automatically via Keyflo <a href="https://${shell.appsDomain}/tools/keyflo/viewings-offers">Learn more</a>`);
                        view.removeReminderEmailOptions();
                        view.disableConfirmationEmails();
                    } else {
                        view.showEmailSendingInformationBar(`Owner confirmation and reminder emails can now be sent automatically via Keyflo <a href="<a href="https://${shell.appsDomain}/tools/keyflo/viewings-offers">View settings</a>`);
                    }
                });

                alto.application.events.listen('view-loaded', { viewName: 'progression', type: 'detail' }, async e => {
                    var hasSellers = await hasModule(SALES_PROGRESSION_MODULE_NAME);
                    if (hasSellers) {
                        var view = new alto.Keyflo.UI.SaleProgressionTransaction(e.target);
                        view.showKeyfloMessaging(view);
                    }
                });

                alto.application.events.listen('view-loaded', { viewName: 'followup', type: 'dialog' }, async e => {
                    var hasSellers = await hasModule(SALES_PROGRESSION_MODULE_NAME);
                    if (hasSellers) {
                        var view = new alto.Keyflo.UI.SalesProgressionFollowup(e.target);
                        view.showKeyfloMessaging(view);
                    }
                });

                _connected = true;
            }
        }



        return this;
    }



    alto.Keyflo = alto.Keyflo || {};
    alto.Keyflo.Integration = new KeyfloIntegration();

    alto.application.onStarted.subscribe(function () {
        alto.Keyflo.Integration.connect();
    })

})(window.alto = window.alto || {})