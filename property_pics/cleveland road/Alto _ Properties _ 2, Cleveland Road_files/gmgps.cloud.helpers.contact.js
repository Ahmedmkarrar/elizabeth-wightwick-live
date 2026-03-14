gmgps.cloud.helpers.contact = {
    editContact: function (args) {
        if (args.id == 0) {
            alto.router.goto('newEntity', {
                collection: 'contacts',
                route: 'new'
            });
        } else {
            alto.router.goto('entity', { collection: 'contacts', id: args.id });
        }
    },

    refreshContact: function (args) {
        shell.views.contact.refreshContact(
            { id: args.id },
            args.tabColumnName,
            args.tabName
        );
    },

    createFSReferral: function (args) {
        new gmgps.cloud.ui.controls.window({
            title: 'Financial Services Referral',
            windowId: 'contactCreateFSReferralModal',
            controller: gmgps.cloud.ui.views.contactFSReferral,
            url: '/Contact/CreateFSReferral',
            urlArgs: args,
            post: true,
            complex: true,
            width: 696,
            draggable: true,
            modal: true,
            actionButton: 'Send',
            cancelButton: 'Cancel',
            onReady: function () {},
            onAction: function () {}
        });
    },

    createSolicitorReferral: function (args) {
        new gmgps.cloud.ui.controls.window({
            title: 'Solicitor Referral',
            windowId: 'contactSolicitorReferralModal',
            controller: gmgps.cloud.ui.views.contactSolicitorReferral,
            url: '/Contact/CreateSolicitorReferral',
            urlArgs: args,
            post: true,
            complex: true,
            width: 696,
            draggable: true,
            modal: true,
            actionButton: 'Send',
            cancelButton: 'Cancel',
            onReady: function () {},
            onAction: function () {}
        });
    },

    createVendorReport: function (id) {
        new gmgps.cloud.ui.controls.window({
            title: 'Create Activity Report',
            windowId: 'contactCreateActivityReportModal',
            controller: gmgps.cloud.ui.views.contactvendorreport,
            url: '/VendorReport/ForContact',
            urlArgs: { contactId: id },
            post: true,
            complex: true,
            width: 600,
            draggable: true,
            modal: true,
            actionButton: 'Create Report',
            cancelButton: 'Cancel',
            onReady: function () {},
            onAction: function () {}
        });
    },

    setActiveState: function (args) {
        new gmgps.cloud.ui.controls.window({
            title: args.active ? 'Set Contact as Active' : 'Archive Contact',
            windowId: 'contactSetStateModal',
            callback: args.callback,
            controller: gmgps.cloud.ui.views.contactStatus,
            url: 'Contact/SetContactActiveStatus',
            urlArgs: {
                contactId: args.contactId,
                active: args.active
            },
            width: 440,
            draggable: true,
            modal: true,
            actionButton: 'OK',
            cancelButton: 'Cancel',
            onAction: function () {},
            onCancel: function () {
                return false;
            }
        });
    },

    transferContact: function (args) {
        new gmgps.cloud.ui.controls.window({
            title: 'Transfer Contact to another Branch',
            controller: gmgps.cloud.ui.views.transferContact,
            windowId: 'contactTransferModal',
            url: 'Contact/GetTransferContact',
            urlArgs: {
                contactId: args.id
            },
            width: 300,
            draggable: true,
            modal: true,
            post: true,
            data: args,
            actionButton: 'OK',
            cancelButton: 'Cancel',
            onAction: function () {
                return false;
            },
            onCancel: function () {
                return false;
            }
        });
    },

    createDiaryEvent: function (args) {
        //start time round up to 0/15/30/45 minute slot and add one hour
        var start = new Date();
        start.setMinutes(15 * Math.ceil(start.getMinutes() / 15));
        start.addHours(1);
        //end time 30 minutes later
        var end = new Date(start.getTime()).addMinutes(30);

        var req = {
            start: start,
            end: end,
            preSelectedParties: [
                { modelType: C.ModelType.Contact, id: args.id }
            ]
        };

        gmgps.cloud.helpers.diary.getAppointment(req);
    },

    checkReferralEligability: function (branchId, postcode) {
        var me = this;

        if (postcode.length === 0) return false; //no postcode provided so don't offer refer until we have been able to establish it is eligible

        var referringBranch = $(document).find(
            '#_referringBranches input[data-id="' + branchId + '"]'
        );

        if (referringBranch.length === 0) return false; //selected branch is not referring

        var branch = referringBranch[0];
        var branchMatchingPostcodes = branch.value.split(',');

        if (branchMatchingPostcodes.length === 0) return true; //branch is referring but has no postcodes to not refer so behaviour is too offer refer on all contact postcodes

        var referralEligible = true;
        for (var i = 0; i < branchMatchingPostcodes.length; i++) {
            var branchPostcode = branchMatchingPostcodes[i];
            if (me.postcodeMatch(postcode, branchPostcode)) {
                referralEligible = false; //if the branch serves this postcode then don't refer as they want it themselves
            }
        }
        return referralEligible;
    },

    postcodeMatch: function (postcode, match) {
        //if we have a short stub to match on then only match on whole first part so BA22 is not a match for BA2
        var spaceIndex = postcode.indexOf(' ');
        var mLength = match.length;
        var pLength = postcode.length;

        //london codes can have only 2 char stub e.g. W1
        if (mLength == 2 && (spaceIndex == 3 || pLength == 3)) return false;

        if (mLength == 3 && (spaceIndex == 4 || pLength == 4)) return false;

        return postcode.startsWith(match);
    },

    referAsVendor: function (contactDetails) {
        var isDirty =
            contactDetails.$root.find('#IsDirty').val().toLowerCase() ===
            'true';
        if (!isDirty) {
            contactDetails.$root
                .find('.referral-container .referVendor')
                .remove();
            contactDetails.$root
                .find('.referral-container')
                .append(
                    '<div class="referred">Contact was referred to Relocation Agent Network just now <input type="hidden" id="Contact_Referred" /><a href="http://www.relocation-agent-network.co.uk/login-agent.aspx" target="_blank">Manage</a></div>'
                );
            window.open('/Contact/ReferVendor?contactId=' + contactDetails.id);
        } else showError('You must save the contact before referring them.');
    },
    refreshReviewNotes: function (id, $contactDetails) {
        new gmgps.cloud.http("contact-refreshReviewNotes").ajax(
            {
                args: {
                    id: id
                },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/Contact/GetReviewNotes'
            },
            function (r) {
                if (r && r.Data) {
                    $contactDetails
                        .find('#Contact_VersionNumber')
                        .val(r.Data.versionNumber);
                    $contactDetails
                        .find('.reviewnotes')
                        .replaceWith(r.Data.reviewNotes);
                }
            }
        );
    },

    sendPeriodStatement: function (contactId, branchId) {
        new gmgps.cloud.ui.controls.window({
            title: 'Send Period Statement',
            windowId: 'sendPeriodStatementModal',
            controller: gmgps.cloud.ui.views.contactperiodstatement,
            url: '/Contact/GetPeriodStatementDialog',
            urlArgs: {
                contactId: contactId,
                branchId: branchId
            },
            post: true,
            complex: true,
            width: 846,
            draggable: true,
            modal: true,
            actionButton: '<div class="fa fa-paper-plane"></div>Send Report',
            cancelButton: 'Cancel',
            onReady: function () {},
            onAction: function () {}
        });
    },

    sendMtdIncomeTaxCsv: function (contactId, branchId) {
        new gmgps.cloud.ui.controls.window({
            title: 'Send Making Tax Digital Statement',
            windowId: 'sendMtdIncomeTaxCsvModal',
            controller: gmgps.cloud.ui.views.contactmtdincometaxcsv,
            url: '/Contact/GetMtdIncomeTaxCsvDialog',
            urlArgs: {
                contactId: contactId,
                branchId: branchId
            },
            post: true,
            complex: true,
            width: 846,
            draggable: true,
            modal: true,
            actionButton: '<div class="fa fa-paper-plane"></div>Send',
            cancelButton: 'Cancel',
            onReady: function () {},
            onAction: function () {}
        });
    }
};