'use strict';
(function (alto) {

    function ContactDetailsViewShim(contactOverviewLayer) {

        this.getRoles = function () {
            var roles = JSON.parse(contactOverviewLayer.querySelector('div.contact-overview').getAttribute('data-contact-types'));
            return roles || [];
        }

        this.isInvitationActive = function () {
            var link = contactOverviewLayer.querySelector('.propertyfile-link[data-invitation-active="active"]');
            return link != null;
        }

        this.hidePropertyFileStatus = function () {
            var link = contactOverviewLayer.querySelector('.propertyfile-link');
            if (!link) return;

            link.style.display = 'none';
        }

        this.showKeyfloPreferences = function () {
            var keylfoPreferences = contactOverviewLayer.querySelector('#consentpreferences-tab .keyflo-consents');
            if (!keylfoPreferences) return;

            keylfoPreferences.style.display = 'block';
        }

        this.SetDefaultKeyfloViewingPreference = function (contactId) {

            const keylfoViewingPreferenceWrapper = contactOverviewLayer.querySelector('.keyflo-consents  tr[data-consent-for="keyflo-viewing-notifications"]');

            if (!keylfoViewingPreferenceWrapper) return;

            const acceptButton = keylfoViewingPreferenceWrapper.querySelector('.accept-button');
            const rejectButton = keylfoViewingPreferenceWrapper.querySelector('.reject-button');
            const statusInput = keylfoViewingPreferenceWrapper.querySelector(' input.consent-status');

            const shouldToggleToGranted = contactId === 0 || (rejectButton.classList.contains('off') && acceptButton.classList.contains('off'));

            if (shouldToggleToGranted) {

                acceptButton.classList.remove('off');
                acceptButton.classList.add('on');

                rejectButton.classList.remove('on')
                rejectButton.classList.add('off');

                keylfoViewingPreferenceWrapper.setAttribute('data-consent-status', 1);
                statusInput.value = 1;
            }
        }

        return this;
    }

    function ContactNavigationShim(contactDetail) {

        this.getRoles = function () {
            var tabColumn = contactDetail.querySelector('.tab-column');
            if (!tabColumn) return [];

            var roles = JSON.parse(tabColumn.getAttribute('data-contact-types'));
            if (!roles) return [];

            return roles;
        }

        this.isInvitationActive = function () {
            var tab = contactDetail.querySelector('.tab-column ul > li[data-id="propertyfile"][data-invitation-active="active"]');
            return tab != null;
        }
        this.hidePropertyFileTab = function () {
            var tab = contactDetail.querySelector('.tab-column ul > li[data-id="propertyfile"]');
            if (!tab) return;

            tab.style.display = 'none';
        }

        return this;
    }

    function ContactPropertyFileDashboardShim(contactPropertyFileLayer) {

        this.getRoles = function () {
            var roles = JSON.parse(contactPropertyFileLayer.getAttribute('data-contact-types'));
            return roles || [];
        }

        this.hidePropertiesList = function () {
            var propertiesList = contactPropertyFileLayer.querySelector('div.propertyfile-contact-properties');
            if (!propertiesList) return;

            propertiesList.style.display = 'none';
        }

        this.hideLettingsPropertiesByStatus = function () {
            var propertiesList = contactPropertyFileLayer.querySelector('div.propertyfile-contact-properties');
            if (!propertiesList) return;

            var toLetproperties = propertiesList.querySelectorAll('div.row[data-market="To Let"]');
            _.each(toLetproperties, property => {
                var status = parseInt(property.getAttribute("data-status"));
                if (status !== C.PropertyRentalStatus.Let) {
                    property.remove();
                }
            })
        }
        this.tailorCopy = function () {
            var span = contactPropertyFileLayer.querySelector('span.viewing-feedback');
            if (span) {
                span.style.display = 'none';
            }
        }

        return this;
    }

    function ViewingDialogShim(viewingDialog) {

        this.hidePropertyFileStatusForVendorsAndApplicants = function () {
            var ownerPropertyFileStatusCards = viewingDialog.querySelectorAll('.propertyfile.viewing-card[data-contact-role="owner"]');
            _.each(ownerPropertyFileStatusCards, card => card.style.display = 'none');
        }

        return this;
    }

    function PropertyStatusDialogShim(propertyStatusDialog) {

        this.hideBanner = function () {
            var propertyFileBanner = propertyStatusDialog.querySelector('div.property-preview div.banner.with-propertyfile');
            propertyFileBanner.style.display = 'none'

            var nonPropertyFileBanner = propertyStatusDialog.querySelector('div.property-preview div.banner.without-propertyfile');
            nonPropertyFileBanner.style.display = 'initial';
        }

        this.disableInvites = function () {
            var propertyFileBanner = propertyStatusDialog.querySelector('div.property-preview div.banner.with-propertyfile');
            var intendedInvites = propertyFileBanner.querySelectorAll('.should-invite-contact[data-contact-status="NotInvited"]')
            intendedInvites.forEach((invitee) => {
                invitee.dataset.contactStatus = "";
                invitee.value = false;
            });
        }

        return this;
    }

    function AdminDashboardShim(dashboard) {

        this.hideViewingControls = function () {
            var feedbackControls = dashboard.querySelector('.autoCopyViewingFeedbackForLandlord')
            if (feedbackControls) {
                feedbackControls.style.display = 'none';
            }
        }

        this.tailorCopy = function () {
            var span = dashboard.querySelector('span.viewing-feedback');
            if (span) {
                span.style.display = 'none';
            }
        }
    }
    function ViewingConfirmationDialogShim(dialog, modules) {

        this.showEmailSendingInformationBar = function (message) {
            var recipientsList = dialog.querySelector('div.recipients-container');
            recipientsList.classList.add('with-keyflo-notification');
            var span = document.createElement('span');
            span.classList.add('keyflo-notification');
            span.setAttribute('data-keyflo-modules', modules.join(' '));
            span.innerHTML = message;
            recipientsList.append(span);
        }

        this.removeReminderEmailOptions = function () {
            var emailOptions = dialog.querySelectorAll('tr[data-recipienttype="2"] select.reminder-type option[value="1"]');
            _.each(emailOptions, option => option.remove());

            var bothOptions = dialog.querySelectorAll('tr[data-recipienttype="2"] select.reminder-type option[value="3"]');
            _.each(bothOptions, option => option.remove());

            $(dialog.querySelectorAll('tr[data-recipienttype="2"] select.reminder-type')).customSelect();
        }

        this.disableConfirmationEmails = function () {
            var vendorEmailCheckboxes = dialog.querySelectorAll('tr[data-recipienttype="2"] td.email-control div.tickbox.ticked');
            _.each(vendorEmailCheckboxes, checkbox => {
                checkbox.classList.remove("ticked");
                checkbox.querySelector('input[type="checkbox"]').removeAttribute("checked");
                checkbox.querySelector('input[type="checkbox"]').disabled = true;
            });
        }
    }

    function SaleProgressionTransactionShim(salesProgression) {

        this.showKeyfloMessaging = function () {
            var tabs = salesProgression.querySelector('div.transaction .tabs');
            tabs.style.top = '210px';

            var keyfloBox = salesProgression.querySelector('div.keyflo-box');

            if (keyfloBox == null) {

                var progress = salesProgression.querySelector('#progression-progress');

                keyfloBox = createKeyfloMessageBox('Sales progression is active in Keyflo', 'All milestones are visible to vendors.');

                progress.after(keyfloBox);
            }
        }
    }


    function SalesProgressionFollowupShim(dialog) {

        this.showKeyfloMessaging = function () {
            var main = dialog.querySelector('div.follow-up-form');

            var keyfloBox = createKeyfloMessageBox(null, 'All milestones are visible to vendors in Keyflo.');

            main.after(keyfloBox);
        }
    }

    function createKeyfloMessageBox(statusText, subText) {
        const box = document.createElement('div');
        box.classList.add('keyflo-box');

        const logoImg = document.createElement('img');
        logoImg.src = '/content/media/images/gui/keyflo/keyflo-logo.png';
        logoImg.alt = 'keyflo';
        logoImg.classList.add('keyflo-logo');
        box.appendChild(logoImg);

        const dividerImg = document.createElement('img');
        dividerImg.src = '/content/media/images/gui/keyflo/divider.svg';
        dividerImg.classList.add('keyflo-divider');
        box.appendChild(dividerImg);

        const tickImg = document.createElement('img');
        tickImg.src = '/content/media/images/gui/keyflo/tick.png';
        tickImg.classList.add('keyflo-tick');
        box.appendChild(tickImg);

        const textContainer = document.createElement('div');
        textContainer.classList.add('keyflo-text');

        if (statusText != null) {
            const status = document.createElement('div');
            status.textContent = statusText;
            status.classList.add('keyflo-status');
            textContainer.appendChild(status);
        }

        if (subText != null) {
            const sub = document.createElement('div');
            sub.textContent = subText;
            sub.classList.add('keyflo-subtext');
            textContainer.appendChild(sub);
        }

        box.appendChild(textContainer);

        return box;
    }


    alto.Keyflo = alto.Keyflo || {
        UI: {}
    };

    alto.Keyflo.UI.ContactNavigation = ContactNavigationShim;
    alto.Keyflo.UI.ContactDetails = ContactDetailsViewShim;
    alto.Keyflo.UI.ContactPropertyFileDashboard = ContactPropertyFileDashboardShim;
    alto.Keyflo.UI.ViewingDialog = ViewingDialogShim;
    alto.Keyflo.UI.PropertyStatusDialog = PropertyStatusDialogShim;
    alto.Keyflo.UI.AdminDashboard = AdminDashboardShim;
    alto.Keyflo.UI.ViewingConfirmationDialog = ViewingConfirmationDialogShim;
    alto.Keyflo.UI.SaleProgressionTransaction = SaleProgressionTransactionShim;
    alto.Keyflo.UI.SalesProgressionFollowup = SalesProgressionFollowupShim;

})(window.alto = window.alto || {})