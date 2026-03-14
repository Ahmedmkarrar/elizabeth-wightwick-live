gmgps.cloud.ui.views.outputWizard = function (args) {
    var me = this;
    me.$root = args.$root;
    me.http = args.http || new gmgps.cloud.http("outputwizard-outputWizard");

    //Nodes
    me.$window = null;
    me.$stepMain = me.$root.find('.step[data-id="main"]');
    me.$stepBrowseSheet = me.$root.find('.step[data-id="browseSheet"]');

    me.$emailEditor = null;
    me.$letterEditor = null;
    me.$smsEditor = me.$root.find('#smseditor');
    me.$emailSection = me.$root.find('#email-section');
    me.$letterSection = me.$root.find('#letter-section');
    me.$smsSection = me.$root.find('#sms-section');
    me.$commonEmailButton = me.$emailSection.find('.common-button');
    me.$commonLetterButton = me.$letterSection.find('.common-button');
    me.$commonSMSButton = me.$smsSection.find('.common-button');
    me.$selectedRecipientRow = null;
    me.$selectedPropertyRow = null;
    me.$quickFormatSelection = me.$root.find('#quick-format-selection');

    me.templates = null;
    me.recipients = {};

    me.$emailPropertyRowTemplate = me.$root.find('#EmailPropertyRowTemplate');

    me.consentToolTipConfig = {
        content: {
            text: function (event, api) {
                var consentItem = api.elements.target.closest('td');
                return consentItem.attr('data-consent-tooltip');
            }
        },
        position: {
            my: 'top left',
            at: 'bottom right',
            adjust: {
                x: -16
            }
        },
        style: {
            tip: true,
            classes: 'qtip-dark'
        }
    };

    me.unitCountWarningThreshold = 20;

    //Internal config.
    me.cfg = {
        smsEnabled: me.$root.find('#SMSRoleEnabled').val() == 'True',
        outputWizardMode: parseInt(me.$root.find('#OutputWizardMode').val()),
        currentStep: 'main',
        ready: false,
        branchId: parseInt(me.$root.find('#Branch_Id').val()),
        brandId: parseInt(me.$root.find('#Brand_BrandId').val()),
        branchName: me.$root.find('#Branch_Name').val(),
        brandName: me.$root.find('#Brand_Name').val(),
        ignoreMessageChangedEvent: false,
        currentCommunicationTypeId: 0,
        currentContactId: 0,
        currentPersonId: 0,
        currentMarketingOutputTypeId: 0,
        sameLetterForAll: false,
        sameEmailForAll: false,
        sameSMSForAll: false,
        browseSheetTemplateId: parseInt(
            me.$root
                .find(
                    '#BrowseSheetTemplates_BranchDefaultBrowseSheetTemplateId'
                )
                .val()
        )
    };

    me.init(args);

    return this;
};

gmgps.cloud.ui.views.outputWizard.typeName =
    'gmgps.cloud.ui.views.outputWizard';

gmgps.cloud.ui.views.outputWizard.prototype = {
    init: function (args) {
        var me = this;
        me.$window = me.$root.closest('.window');

        me.documentTemplatePermission = new gmgps.cloud.Permission(
            C.Permissions.TransactionRefs.Txn_DocumentTemplate,
            C.Permissions.UserAccessLevels.ReadOnly
        );
        me.documentTemplatePermission.demand();

        //UI
        me.$root.find('select').customSelect();
        me.$smsSection.find('.charCounter').charCounter({
            $src: me.$smsEditor
        });

        //Inject branch/brand into title bar.
        me.$brandingButton = $(
            '<div class="branding" title="Change Branding...">{0}, {1}<span class="icon"></div>'.format(
                me.cfg.brandName,
                me.cfg.branchName
            )
        );
        me.$window.find('.top').append(me.$brandingButton);

        //Branding Button > Click
        me.$brandingButton.on('click', function () {
            if (me.cfg.currentStep != 'main') {
                showInfo(
                    'You cannot change the branding now, it can only be set during the first step.'
                );
            } else {
                gmgps.cloud.helpers.general.openBrandingSelector({
                    title: 'Change Branding for Output',
                    defaultBranchId: me.cfg.branchId,
                    defaultBrandId: me.cfg.brandId,
                    callback: function (data) {
                        me.changeBranding(data);
                    }
                });
            }
        });

        //Populate the default messages.
        me.recipients = [];

        me.templates = $.parseJSON(me.$root.find('#DocumentTemplates').val());

        me.setupHtmlEditor();

        //New Recipient AutoComplete
        me.$root.find('#new-recipient').autoCompleteEx({
            modelType: C.ModelType.Contact,
            search: {
                categoryIdList: [C.ContactCategory.Client]
            },
            allowCreate: true,
            createUpwards: true,
            includeContacts: true,
            includeUsers: false,
            placeholder: 'Add a Recipient',
            onSelected: function (args) {
                var $input = me.$root.find('#new-recipient');
                $input.val('').blur().show();

                $input.closest('.auto-complete').find('.selection').hide();

                //Fetch a ready made row (or two, if there is a Person1 + Person2).
                new gmgps.cloud.http("outputwizard-onSelected").getView({
                    url: '/comms/getnewoutputwizardrecipient',
                    args: {
                        contactId: args.id,
                        outputWizardMode: me.cfg.outputWizardMode
                    },
                    post: true,
                    onSuccess: function (response) {
                        var $newRows = $(response.Data);

                        //Append the new row.
                        me.$root.find('.recipients tbody').append($newRows);
                        me.autoConfigureRecipientRows($newRows);
                        $newRows.attr('applicant', 'true');
                        $newRows.first().scrollintoview();
                        me.selectRecipient($newRows.first());

                        me.updateApplicantCount();
                        me.addToCount();

                        me.checkForApplicantConsent();
                    }
                });

                return false;
            }
        });

        //New Property AutoComplete
        me.$root.find('#new-property').autoCompleteEx({
            modelType: C.ModelType.Property,
            search: {
                StatusIdList: [
                    C.SaleStatus.Available,
                    C.SaleStatus.UnderOffer,
                    C.SaleStatus.UnderOfferMarketing,
                    C.SaleStatus.UnderOfferAvailable,
                    C.SaleStatus.Instructed,
                    C.SaleStatus.Appraisal,
                    C.RentStatus.Available,
                    C.RentStatus.UnderOffer,
                    C.RentStatus.LetMarketing,
                    C.RentStatus.Instructed,
                    C.RentStatus.Appraisal
                ],
                ApplyFurtherFilteringtoIds: true
            },
            placeholder: 'Add a Property',
            onSelected: function (args) {
                if (!me.hasPropertyId(args.id)) {
                    var $input = me.$root.find('#new-property');
                    $input.val('').blur();

                    //Fetch a ready made row.
                    new gmgps.cloud.http("outputwizard-onSelected").getView({
                        url: '/comms/getnewoutputwizardproperty',
                        args: {
                            propertyId: args.id
                        },
                        post: true,
                        onSuccess: function (response) {
                            var $newRow = $(response.Data);

                            //Append the new row.
                            me.$root.find('.properties').append($newRow);
                            $newRow.scrollintoview();
                            me.updatePropertyCount();
                            me.updateEmailSubject();

                            var awaitingApproval = $newRow.attr(
                                'data-awaiting-approval'
                            );
                            if (
                                awaitingApproval != null &&
                                awaitingApproval == 'True'
                            )
                                me.addToAwaitingApproval($newRow);
                        }
                    });

                    return false;
                } else {
                    return false;
                }
            }
        });

        //property picker search control
        me.$root
            .find('.output-wizard-property-form .search-icon')
            .on('click', function () {
                gmgps.cloud.helpers.property.propertyPicker(function (
                    propertyIds
                ) {
                    for (var i = 0; i < propertyIds.length; i++) {
                        var propertyId = propertyIds[i];

                        if (!me.hasPropertyId(propertyId)) {
                            //Fetch a ready made row.
                            new gmgps.cloud.http("outputwizard-init").getView({
                                url: '/comms/getnewoutputwizardproperty',
                                args: {
                                    propertyId: propertyId
                                },
                                post: true,
                                onSuccess: function (response) {
                                    var $newRow = $(response.Data);

                                    //Append the new row.
                                    me.$root
                                        .find('.properties')
                                        .append($newRow);
                                    $newRow.scrollintoview();
                                }
                            });
                        }
                    }

                    me.updatePropertyCount();
                });
            });

        //SMS Message > Change
        me.$smsEditor.on('keyup', function () {
            me.messageChanged(C.CommunicationType.SMS);
        });

        //Email Subject > Change
        me.$emailSection.on('keyup', '#subject', function () {
            me.messageChanged(C.CommunicationType.Email);
        });

        me.$root.on('click', 'div.property-item .remove', function (e) {
            me.removeProperty(e);
        });

        //Email Address Input > Keyup (Real-time Target input validation for the row)
        me.$root.on('keyup', '#message-pane #EmailAddress', function () {
            var $this = $(this);
            var $row = me.$selectedRecipientRow;
            var value = $this.val();
            $row.attr('data-emailAddress', value);
            if (!gmgps.cloud.helpers.general.validateEmail(value)) {
                $this.addClass('error');
            } else {
                $this.removeClass('error');
            }
            me.validateRecipientRows($row);
        });

        //Mobile Number Input > Keyup (Real-time Target input validation for the row)
        me.$root.on('keyup', '#message-pane #MobileNumber', function () {
            var $this = $(this);
            var $row = me.$selectedRecipientRow;
            var value = $this.val();
            $row.attr('data-mobileNumber', value);
            if (!gmgps.cloud.helpers.general.validateMobile(value)) {
                $this.addClass('error');
            } else {
                $this.removeClass('error');
            }
            me.validateRecipientRows($row);
        });

        //MarketingOutputType Switch > Click
        me.$root.on('click', '.marketingOutputType', function () {
            var $row = $(this).closest('.row');
            var $communicationType = $(this).closest('.communicationType');
            var communicationType = parseInt(
                $communicationType.attr('data-type')
            );

            var $currentMarketingOutputType = $(this);
            var $nextMarketingOutputType = null;

            //Clear the cycle state on the master switch for this communicationType.
            me.$root
                .find(
                    '.communicationType-master[data-type="{0}"]'.format(
                        communicationType
                    )
                )
                .attr('data-cycleState', 0);

            //If this is the final marketingOutputType listed, revert to the first, else use the next.
            if ($currentMarketingOutputType.is(':last-child')) {
                $nextMarketingOutputType = $currentMarketingOutputType
                    .closest('td')
                    .find('.marketingOutputType:first');
            } else {
                $nextMarketingOutputType = $currentMarketingOutputType.next();
            }

            $currentMarketingOutputType.fadeOut(125, function () {
                $currentMarketingOutputType.removeClass('on');
                $nextMarketingOutputType.addClass('on').fadeIn(125);
                me.selectRecipient($row);
                me.checkForApplicantConsent();
                me.validateRecipientRows($row);
                me.validateDocumentTemplateAccess($row);
            });
        });

        //Master Delivery CommunicationType (Col Header) > Click
        me.$root.on('click', '.communicationType-master', function () {
            var $rows = me.$root.find('.recipients .row');
            var communicationType = parseInt($(this).attr('data-type'));

            me.cycleMarketingOutputType($rows, communicationType);

            me.checkForApplicantConsent();

            //Validate all recipients.
            me.validateRecipientRows($rows, communicationType);

            //Update message boxes for the selected row only.
            me.updateMessageBoxes(me.$selectedRecipientRow);

            var $errorRows = me.$root.find('.recipients .row.error');
            if ($errorRows.length > 0) {
                showDialog({
                    type: 'question',
                    title: 'Missing/Invalid Data',
                    msg: '{0} of your recipients {1} a missing or invalid {2}.</br></br>Would you like to remove them from the list or will you complete their details?'.format(
                        $errorRows.length,
                        $errorRows.length == 1 ? 'has' : 'have',
                        communicationType == C.CommunicationType.Email
                            ? 'email address'
                            : 'mobile number'
                    ),
                    buttons: {
                        'Remove those recipients': function () {
                            $errorRows.closest('.row').remove();
                            me.updateApplicantCount();
                            me.selectRecipient(
                                me.$root.find('.recipients .row:first')
                            );
                            $(this).dialog('close');
                        },
                        "I'll add their details...": function () {
                            $(this).dialog('close');
                        }
                    }
                });
            }
        });

        //Template Cloners (common-html/common-sms) > Click
        me.$root.on('click', '.common-button', function () {
            var communicationTypeId = parseInt(
                $(this).closest('.message-section').attr('data-type')
            );
            var content, query;

            //Update the applicable common template.
            // - Note:  The act of this will set all marketingOutputTypes to the same text for any given communicationType, else the user would need to be asked whether to change
            //          just the current marketingOutputTypes, which would get too confusing.
            switch (communicationTypeId) {
                case C.CommunicationType.Email:
                    content = me.$emailEditor[0].$area.val();
                    query = '$.CommunicationType == {0}'.format(
                        C.CommunicationType.Email
                    );
                    Enumerable.From(me.templates)
                        .Where(query)
                        .ForEach(function (x) {
                            x.Content = content;
                        });
                    break;

                case C.CommunicationType.Letter:
                    content = me.$letterEditor[0].$area.val();
                    query = '$.CommunicationType == {0}'.format(
                        C.CommunicationType.Letter
                    );
                    Enumerable.From(me.templates)
                        .Where(query)
                        .ForEach(function (x) {
                            x.Content = content;
                        });
                    break;

                case C.CommunicationType.SMS:
                    content = me.$smsEditor.val();
                    query = '$.CommunicationType == {0}'.format(
                        C.CommunicationType.SMS
                    );
                    Enumerable.From(me.templates)
                        .Where(query)
                        .ForEach(function (x) {
                            x.Content = content;
                        });
                    break;
            }

            //Clear any special text for this communicationType currently held for any recipeints.
            for (var i in me.recipients) {
                var recipient = me.recipients[i];

                for (var personId = 1; personId <= 2; personId++) {
                    switch (communicationTypeId) {
                        case C.CommunicationType.Email:
                            recipient.emailText = null;
                            recipient.emailSubject = null;
                            break;
                        case C.CommunicationType.SMS:
                            recipient.smsText = null;
                            break;
                        case C.CommunicationType.Letter:
                            recipient.letterText = null;
                            break;
                    }
                }
            }

            $(this).hide();
        });

        //Recipients Row > Click (by name)
        me.$root.on(
            'click',
            '.recipients .row:not(.on) .name-cell',
            function () {
                var $row = $(this).closest('.row');
                me.selectRecipient($row);
            }
        );

        //Recipients Row > Remove Button > Click
        me.$root.on('click', '.recipients .remove', function () {
            var $row = $(this).closest('tr');

            var contactId = parseInt($row.attr('data-contactId'));
            var personId = parseInt($row.attr('data-personid'));

            $row.remove();

            if (me.recipients['C{0}P{1}'.format(contactId, personId)]) {
                delete me.recipients['C{0}P{1}'.format(contactId, personId)];
            }

            var $nextRow = me.$root.find('.recipients .row:first');
            if ($nextRow.length != 0) {
                me.selectRecipient($nextRow);
            } else {
                showInfo('No recipients remain.');
            }

            me.updateApplicantCount();
            if ($row.attr('applicant') == 'true') me.removeFromCount();

            me.checkForApplicantConsent();
        });

        //Auto-Configure Recipient Rows (communicationType & marketingOutputType)
        me.autoConfigureRecipientRows();

        //Select the first recipient row.
        me.selectRecipient(me.$root.find('.recipients .row:first'));

        //Initial row validation.
        me.validateRecipientRows();

        me.closeWindowHandler = args.closeMyWindow;

        (function () {
            var timers = {};
            return function (callback, ms, uniqueId) {
                if (!uniqueId) {
                    uniqueId = 'x';
                }
                if (timers[uniqueId]) {
                    clearTimeout(timers[uniqueId]);
                }
                timers[uniqueId] = setTimeout(callback, ms);
            };
        })();

        $(window).on('resize', function () {
            me.sizeMe();
            me.split.setSizes([60, 40]);
        });

        me.split = Split(['#entity-pane', '#message-pane'], {
            direction: 'vertical',
            sizes: [60, 40],
            onDrag: function () {
                me.sizeMe();
            }
        });

        setTimeout(function () {
            me.sizeMe();

            // Manually reset the position of the modal as the late
            // loading of the content causes it to go off-screen
            var viewportHeight = Math.max(
                document.documentElement.clientHeight,
                window.innerHeight || 0
            );
            var modalHeight = $('#propertyOutputWizardModal1').height();

            var top = (viewportHeight - modalHeight) / 2;
            $('#propertyOutputWizardModal1').css({ top: top + 'px' });
        }, 10);

        me.configureConsentToolTips();

        if (me.$root.find('.recipients tr').length > 0) {
            me.checkForApplicantConsent();
        }

        me.updateEmailSubject();

        me.cfg.ready = true;
    },

    configureConsentToolTips: function () {
        var me = this;

        me.$root
            .find('td.name-cell[data-consent] label')
            .qtip(me.consentToolTipConfig);
    },

    action: function (callback) {
        var me = this;
        var actionButton = me.$root.closest('.window').find('.action-button');

        me.validate(function () {
            actionButton.addClass('disabled');

            //See if another step is required.
            switch (me.cfg.currentStep) {
                case 'main':
                    //See if browse sheets are being used at all.  If they are, move to the the browsesheet step.
                    var browseSheetSelectionRequired =
                        me.isMarketingOutputTypeUsed(
                            C.CommunicationType.Letter,
                            C.MarketingOutputType.BrowseSheet
                        );

                    if (browseSheetSelectionRequired) {
                        actionButton.removeClass('disabled');
                        me.$stepMain.hide();
                        me.$stepBrowseSheet.show();
                        me.cfg.currentStep = 'browseSheet';

                        //Setup the template browser.
                        me.setupTemplateBrowser();
                    } else {
                        me.send(callback);
                    }
                    break;

                case 'browseSheet':
                    me.send(callback);
                    break;
            }
        });
    },

    isMarketingOutputTypeUsed: function (
        communicationType,
        marketingOutputType
    ) {
        var me = this;

        //See if a particular communicationType+marketingOutputType is used.
        var x = me.$root.find(
            '.recipients .row td[data-type="{0}"] .marketingOutputType.on[data-type="{1}"]'.format(
                communicationType,
                marketingOutputType
            )
        ).length;

        //Where x is greater than 0, the marketingOutputType has been used.
        return x != 0;
    },

    autoConfigureRecipientRows: function ($rows) {
        //Set the delivery communicationType and marketingOutputType based on what's available on the contact.
        // - forcedDelivery: Optional.  Force the delivery communicationType to a particular type rather than automatic.
        var me = this;

        //If a list of rows were not supplied assume we're working on all rows.
        if (!$rows) {
            $rows = me.$root.find('.recipients .row');
        }

        var mx = {
            email: '#m_{0}'.format(C.CommunicationType.Email),
            sms: '#m_{0}'.format(C.CommunicationType.SMS),
            letter: '#m_{0}'.format(C.CommunicationType.Letter)
        };

        var fx = {
            none: '#f_0',
            fullDetails: '#f_{0}'.format(C.MarketingOutputType.FullDetails),
            embeddedHtml: '#f_{0}'.format(C.MarketingOutputType.EmbeddedHTML),
            browseSheet: '#f_{0}'.format(C.MarketingOutputType.BrowseSheet),
            message: '#f_{0}'.format(C.MarketingOutputType.Message)
        };

        var propertyCount = me.getPropertyIds(); //todo: get for contact, or once if not in many2many mode. (read from row/build array).

        //For each recipient row;
        // - Optionally set the delivery communicationType, then set the marketingOutputType.
        $rows.each(function (i, row) {
            var $row = $(row);

            //Reset row.
            $row.find('.marketingOutputType').hide().removeClass('on');

            var hasEmail = $row.attr('data-emailAddress') != '';
            var hasSMS = $row.attr('data-mobileNumber') != '';
            var $communicationType = null;

            //Set the most appropriate communicationType and marketingOutputType.
            // - For speed on many rows, these items which we search upon all have id's.

            //Email? (shown if email)
            $communicationType = $row.find(mx.email);
            if (hasEmail) {
                if (
                    propertyCount <= 3 ||
                    me.cfg.outputWizardMode ==
                        C.OutputWizardMode.PropertyDetailsToOwner
                ) {
                    $communicationType
                        .find(fx.fullDetails)
                        .addClass('on')
                        .show();
                } else {
                    $communicationType
                        .find(fx.embeddedHtml)
                        .addClass('on')
                        .show();
                }
            } else {
                $communicationType.find(fx.none).addClass('on').show();
            }

            //SMS? (shown if no email but mobile number)
            $communicationType = $row.find(mx.sms);
            if (hasSMS && !hasEmail) {
                if (propertyCount <= 3) {
                    $communicationType.find(fx.message).addClass('on').show(); //same
                } else {
                    $communicationType.find(fx.message).addClass('on').show(); //same
                }
            } else {
                $communicationType.find(fx.none).addClass('on').show();
            }

            //Letter? (shown if no email or mobile number)
            $communicationType = $row.find(mx.letter);
            if (!hasEmail && !hasSMS) {
                if (
                    propertyCount <= 3 ||
                    me.cfg.outputWizardMode ==
                        C.OutputWizardMode.PropertyDetailsToOwner
                ) {
                    $communicationType
                        .find(fx.fullDetails)
                        .addClass('on')
                        .show();
                } else {
                    $communicationType
                        .find(fx.browseSheet)
                        .addClass('on')
                        .show();
                }
            } else {
                $communicationType.find(fx.none).addClass('on').show();
            }
        });

        me.configureConsentToolTips();
    },

    changeBranding: function (args) {
        var me = this;

        showDialog({
            type: 'question',
            title: 'Change Branding',
            msg: 'The e-mail, sms and letter templates for {0}, {1} will need to be fetched and used for your output.</br></br>Any changed text so far will be replaced.'.format(
                args.brandName,
                args.branchName
            ),
            buttons: {
                OK: function () {
                    //Update branding button.
                    me.$brandingButton.html(
                        '{0}, {1}<span class="icon">'.format(
                            args.brandName,
                            args.branchName
                        )
                    );

                    //Update internal config.
                    me.cfg.branchId = args.branchId;
                    me.cfg.brandId = args.brandId;
                    me.cfg.branchName = args.branchName;
                    me.cfg.brandName = args.brandName;

                    me.replaceTemplates(args.branchId, args.brandId);

                    $(this).dialog('close');
                },
                Cancel: function () {
                    $(this).dialog('close');
                }
            }
        });
    },

    createLetters: function (lettersBundle) {
        var me = this;

        //Quit early if there are no letters to create.
        if (lettersBundle.messages.length == 0) {
            return false;
        }

        var maxProperties = 0;
        $.each(lettersBundle.messages, function (i, message) {
            if (message.propertyIds.length > maxProperties)
                maxProperties = message.propertyIds.length;
        });

        if (
            lettersBundle.messages.length > me.unitCountWarningThreshold ||
            maxProperties > me.unitCountWarningThreshold
        ) {
            var message =
                'This may take a while to render the browse sheets, please wait for the operation to complete and do not close the page.';

            var pluralisedLetters =
                lettersBundle.messages.length > 1 ? 'letters' : 'letter';
            var pluralisedProperties =
                maxProperties > 1 ? 'properties' : 'property';

            if (
                maxProperties > me.unitCountWarningThreshold &&
                lettersBundle.messages.length > me.unitCountWarningThreshold
            )
                message =
                    'You have selected {0} {1} to be sent to {2} recipients as {3}. '.format(
                        maxProperties,
                        pluralisedProperties,
                        lettersBundle.messages.length,
                        pluralisedLetters
                    ) + message;
            else if (maxProperties > me.unitCountWarningThreshold)
                message =
                    'You have selected {0} {1}. '.format(
                        maxProperties,
                        pluralisedProperties
                    ) + message;
            else if (
                lettersBundle.messages.length > me.unitCountWarningThreshold
            )
                message =
                    'You have selected {0} recipients to be sent {1}. '.format(
                        lettersBundle.messages.length,
                        pluralisedLetters
                    ) + message;

            showDialog({
                type: 'question',
                title: 'Long Running Process',
                msg: message,
                buttons: {
                    Proceed: function () {
                        $(this).dialog('close');

                        me.sendLetters(lettersBundle);
                    },
                    Cancel: function () {
                        $(this).dialog('close');
                        return false;
                    }
                }
            });
        } else me.sendLetters(lettersBundle);
    },

    sendLetters: function (lettersBundle) {
        var me = this;
        //Create empty form for posting to a new window/tab.
        var args = {
            request: {
                OutputWizardMode: me.cfg.outputWizardMode,
                Draft: lettersBundle.draft,
                RecipientType: lettersBundle.recipientType,
                BranchId: lettersBundle.branchId,
                BrandId: lettersBundle.brandId,
                BrowseSheetTemplateId: lettersBundle.browseSheetTemplateId,
                OrderBy: lettersBundle.orderBy,
                OrderType: lettersBundle.orderType,
                DefaultTemplates: me.templates.map(function (v) {
                    return {
                        Id: v.Id,
                        CommunicationType: v.CommunicationType,
                        DocumentTemplateType: v.DocumentTemplateType,
                        Content: gmgps.cloud.utility.HtmlUtility.escapeHtml(
                            v.Content,
                            true
                        )
                    };
                }),
                Messages: lettersBundle.messages.map(function (message) {
                    return {
                        CommunicationType: C.CommunicationType.Letter,
                        ContactId: message.contactId,
                        PersonId: message.personId,
                        MarketingOutputType: message.marketingOutputType,
                        Body: message.body,
                        Type: C.CommunicationType.Letter,
                        OriginalTemplateId: message.originalTemplateId,
                        PropertyIds: message.propertyIds
                    };
                })
            }
        };

        var $form = gmgps.cloud.utility.buildForm(
            'Comms/CreateOutputWizardLetters',
            args
        );

        $form.submit();
        $form.remove();
    },

    cycleMarketingOutputType: function ($rows, communicationType) {
        //Cycle through the available marketingOutputTypes of a delivery communicationType.
        var me = this;

        //Exit early if there are no rows.
        if ($rows.length == 0) {
            return false;
        }

        //Get the current cycle state for this communicationType.
        var $communicationTypeMaster = me.$root.find(
            '.communicationType-master[data-type="{0}"]'.format(
                communicationType
            )
        );
        var currentCycleState = parseInt(
            $communicationTypeMaster.attr('data-cycleState')
        );

        //Get the communicationType marketingOutputTypes.
        var communicationTypes =
            me.getCommunicationTypeMarketingOutputTypes(communicationType);

        //Get the pos of the next marketingOutputType in the array for this communicationType, or cycle back to the first.
        var pos = communicationTypes.indexOf(currentCycleState);
        if (pos == communicationTypes.length - 1) {
            pos = 0;
        } else {
            pos++;
        }
        var newCycleState = communicationTypes[pos];

        //Store the updated cycle state in the master switch for the communicationType.
        $communicationTypeMaster.attr('data-cycleState', newCycleState);

        //Turn off all marketingOutputTypes for this communicationType, turn on the new one (for all rows).
        $rows
            .find(
                '.communicationType[data-type="{0}"] .marketingOutputType.on'.format(
                    communicationType
                )
            )
            .removeClass('on')
            .hide();
        $rows
            .find(
                '.communicationType[data-type="{0}"] .marketingOutputType[data-type="{1}"]'.format(
                    communicationType,
                    newCycleState
                )
            )
            .addClass('on')
            .show();
    },

    getMessageText: function (
        contactId,
        personId,
        communicationType,
        marketingOutputType
    ) {
        //Return message text for a given recipient.  If no special text exists, return the templated default.
        var me = this;

        var recipient = me.recipients['C{0}P{1}'.format(contactId, personId)];
        var text;

        switch (communicationType) {
            //Email?
            case C.CommunicationType.Email:
                if (recipient && recipient.emailText) {
                    //Custom email text.
                    text = {
                        isCustom: true,
                        text: recipient.emailText,
                        subject: recipient.emailSubject
                    };
                } else {
                    //Standard email text.
                    switch (marketingOutputType) {
                        case C.MarketingOutputType.Unspecified:
                            text = {
                                isCustom: false,
                                text: '',
                                subject: ''
                            };
                            break;
                        case C.MarketingOutputType.FullDetails:
                            text = {
                                isCustom: false,
                                text:
                                    me.cfg.outputWizardMode ==
                                    C.OutputWizardMode.PropertyDetailsToOwner
                                        ? Enumerable.From(me.templates).First(
                                              '$.DocumentTemplateType == {0}'.format(
                                                  C.DocumentTemplateType
                                                      .EmailParticularsForApproval
                                              )
                                          ).Content
                                        : Enumerable.From(me.templates).First(
                                              '$.DocumentTemplateType == {0}'.format(
                                                  C.DocumentTemplateType
                                                      .EmailOutputWizardAttachedBrochures
                                              )
                                          ).Content,
                                subject: 'Property Details'
                            };
                            break;
                        case C.MarketingOutputType.EmbeddedHTML:
                            text = {
                                isCustom: false,
                                text: Enumerable.From(me.templates).First(
                                    '$.DocumentTemplateType == {0}'.format(
                                        C.DocumentTemplateType
                                            .EmailOutputWizardEmbeddedUrls
                                    )
                                ).Content,
                                subject: 'Property Details'
                            };
                            break;
                    }
                }
                break;

            //SMS?
            case C.CommunicationType.SMS:
                if (recipient && recipient.smsText) {
                    //Custom sms text.
                    text = {
                        isCustom: true,
                        text: recipient.smsText
                    };
                } else {
                    //Standard sms text.
                    switch (marketingOutputType) {
                        case C.MarketingOutputType.Unspecified:
                            text = {
                                isCustom: false,
                                text: ''
                            };
                            break;
                        case C.MarketingOutputType.Message:
                            text = {
                                isCustom: false,
                                text:
                                    me.cfg.outputWizardMode ==
                                    C.OutputWizardMode.PropertyDetailsToOwner
                                        ? Enumerable.From(me.templates).First(
                                              '$.DocumentTemplateType == {0}'.format(
                                                  C.DocumentTemplateType
                                                      .SMSParticularsForApproval
                                              )
                                          ).Content
                                        : Enumerable.From(me.templates).First(
                                              '$.DocumentTemplateType == {0}'.format(
                                                  C.DocumentTemplateType
                                                      .SMSOutputWizard
                                              )
                                          ).Content
                            };
                            break;
                    }
                }
                break;

            case C.CommunicationType.Letter:
                if (recipient && recipient.letterText) {
                    text = {
                        isCustom: true,
                        text: recipient.letterText
                    };
                } else {
                    switch (marketingOutputType) {
                        case C.MarketingOutputType.Unspecified:
                            text = {
                                isCustom: false,
                                text: ''
                            };
                            break;
                        case C.MarketingOutputType.FullDetails:
                            text = {
                                isCustom: false,
                                text:
                                    me.cfg.outputWizardMode ==
                                    C.OutputWizardMode.PropertyDetailsToOwner
                                        ? Enumerable.From(me.templates).First(
                                              '$.DocumentTemplateType == {0}'.format(
                                                  C.DocumentTemplateType
                                                      .ParticularsForApproval
                                              )
                                          ).Content
                                        : Enumerable.From(me.templates).First(
                                              '$.DocumentTemplateType == {0}'.format(
                                                  C.DocumentTemplateType
                                                      .CoveringLetterForBrochures
                                              )
                                          ).Content
                            };
                            break;
                        case C.MarketingOutputType.BrowseSheet:
                            text = {
                                isCustom: false,
                                text: Enumerable.From(me.templates).First(
                                    '$.DocumentTemplateType == {0}'.format(
                                        C.DocumentTemplateType
                                            .CoveringLetterForBrowseSheets
                                    )
                                ).Content
                            };
                            break;
                    }
                }
                break;
        }

        return text;
    },

    getCommunicationTypeMarketingOutputTypes: function (communicationType) {
        //Return an array of marketingOutputTypes available for the specified communicationType.
        var marketingOutputTypes = null;

        switch (communicationType) {
            case C.CommunicationType.Email:
                marketingOutputTypes = [
                    0,
                    C.MarketingOutputType.FullDetails,
                    C.MarketingOutputType.EmbeddedHTML
                ];
                break;
            case C.CommunicationType.SMS:
                marketingOutputTypes = [0, C.MarketingOutputType.Message];
                break;
            case C.CommunicationType.Letter:
                marketingOutputTypes = [
                    0,
                    C.MarketingOutputType.FullDetails,
                    C.MarketingOutputType.BrowseSheet
                ];
                break;
        }

        return marketingOutputTypes;
    },

    getTemplateFrameId: function (templateId) {
        //Return the frameId of the specified template.
        var me = this;
        var $a = me.$root.find(
            '.templates li a[data-templateId="{0}"]'.format(templateId)
        );
        if ($a.length == 0) {
            //No frame exists for the requested templateId.
            return 0;
        } else {
            return parseInt($a.attr('data-id'));
        }
    },

    getFrameTemplateId: function (id) {
        //Return the templateId of the specified frame.
        var me = this;
        var $a = me.$root.find('.templates li a[data-id="{0}"]'.format(id));
        return parseInt($a.attr('data-templateId'));
    },

    getPropertyIds: function () {
        //todo: contactId
        //Note:  When this is expanded to support many2many, it will return properties being sent on a per-applicant basis.

        var me = this;
        var propertyIds = [];

        me.$root.find('.properties .row').each(function (i, row) {
            var $row = $(row);
            propertyIds.push(parseInt($row.attr('data-id')));
        });

        return propertyIds;
    },

    hasPropertyId: function (propertyId) {
        var me = this;
        var rows = me.$root.find('.properties .row');

        for (var i = 0; i < rows.length; i++) {
            var $row = $(rows[i]);
            if (parseInt($row.attr('data-id')) == propertyId) {
                return true;
            }
        }
        return false;
    },

    getRecipientRowMarketingOutputTypes: function ($row) {
        //Returns an object depciting which marketingOutputType (0 for none) is being used for each delivery communicationType.
        var marketingOutputTypes = {
            emailMarketingOutputType: parseInt(
                $row
                    .find(
                        '.communicationType[data-type="{0}"] .marketingOutputType.on'.format(
                            C.CommunicationType.Email
                        )
                    )
                    .attr('data-type')
            ),
            smsMarketingOutputType: parseInt(
                $row
                    .find(
                        '.communicationType[data-type="{0}"] .marketingOutputType.on'.format(
                            C.CommunicationType.SMS
                        )
                    )
                    .attr('data-type')
            ),
            letterMarketingOutputType: parseInt(
                $row
                    .find(
                        '.communicationType[data-type="{0}"] .marketingOutputType.on'.format(
                            C.CommunicationType.Letter
                        )
                    )
                    .attr('data-type')
            )
        };

        return marketingOutputTypes;
    },

    messageChanged: function (communicationType) {
        //Either the current letter, email or sms content was just changed (keyup).
        var me = this;

        //If the form is not ready yet or the ignoreMessageChangedEvent flag is set, exit early.
        if (!me.cfg.ready || me.cfg.ignoreMessageChangedEvent) {
            return false;
        }

        //Depending on the type of communication, show the relevant cloner button.
        switch (communicationType) {
            case C.CommunicationType.Email:
                me.$commonEmailButton.show();
                break;
            case C.CommunicationType.Letter:
                me.$commonLetterButton.show();
                break;
            case C.CommunicationType.SMS:
                me.$commonSMSButton.show();
                break;
        }

        me.setMessageText(
            me.cfg.currentContactId,
            me.cfg.currentPersonId,
            communicationType
        );
    },

    replaceTemplates: function (branchId, brandId) {
        var me = this;

        me.http.ajax(
            {
                args: {
                    branchId: branchId,
                    brandId: brandId,
                    smsRoleEnabled: me.cfg.smsEnabled
                },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/comms/getOutputWizardTemplates'
            },
            function (response) {
                //Clear out any special, changed text.
                me.recipients = [];

                me.templates = response.Data.Templates;

                //Select the first recipient.
                me.selectRecipient(me.$root.find('.recipients .row:first'));

                me.setupEmailPropertyRowSelect(
                    response.Data.EmailPropertyRowTemplates.Templates,
                    response.Data.EmailPropertyRowTemplates.DefaultTemplateId
                );

                showInfo(
                    'The replacement templates have been applied successfully.'
                );
            }
        );
    },

    setupEmailPropertyRowSelect: function (templates, defaultTemplateId) {
        var me = this;
        var options = $.map(templates, function (template) {
            var isSelected = template.Id === defaultTemplateId;
            return new Option(
                template.Name,
                template.Id,
                isSelected,
                isSelected
            );
        });
        me.$emailPropertyRowTemplate.empty().append(options).trigger('change');
    },

    sizeMe: function () {
        var me = this;
        var h = $(window).height();
        if (h > 750) {
            var nh = 500 + (h - 750);
            me.$root.find('#step-container').height(nh);
            me.$root.find('.step').height(nh);
        } else {
            me.$root.find('#step-container').height(500);
            me.$root.find('.step').height(500);
        }

        var msh = me.$root.find('#message-pane').height();
        me.$root.find('#email-section .cleditorMain').height(msh - 71 - 54);
        me.$root.find('#email-section iframe').height(msh - 97 - 54);

        me.$root.find('#letter-section .cleditorMain').height(msh - 25 - 14);
        me.$root.find('#letter-section iframe').height(msh - 52 - 14);

        me.$root.find('#sms-section #smseditor').height(msh - 75 - 14);
    },

    setMessageText: function (contactId, personId, communicationType) {
        var me = this;

        //Refresh the recipient model.
        var key = 'C{0}P{1}'.format(
            me.cfg.currentContactId,
            me.cfg.currentPersonId
        );
        var recipient = me.recipients[key];
        if (!recipient) {
            //No exception for this recipient, add one now.
            me.recipients[key] = {};
            recipient = me.recipients[key];
        }

        switch (communicationType) {
            case C.CommunicationType.Email:
                recipient.emailText = me.$emailEditor[0].$area.val();
                recipient.emailSubject = me.$emailSection
                    .find('#subject')
                    .val();
                break;
            case C.CommunicationType.SMS:
                recipient.smsText = me.$smsEditor.val();
                break;
            case C.CommunicationType.Letter:
                recipient.letterText = me.$letterEditor[0].$area.val();
                break;
        }
    },

    selectRecipient: function ($row) {
        var me = this;

        //Hide clone buttons.
        me.$root.find('#common-html-button, #common-sms-button').hide();

        //Clear row selection.
        me.$root.find('.recipients .row.on').removeClass('on');

        //Select new row and display the linked content.
        $row.addClass('on');

        //Store this as the currently selected row.
        me.$selectedRecipientRow = $row;

        //Setup/update message boxes, according to this recipient.
        me.updateMessageBoxes($row);

        //
        me.$root.find('#sep').show().effect('highlight'); //todo - change to the splitter bar
    },

    send: function (callback) {
        var me = this;

        var originalTemplates = {
            //temp until letter system changes.
            email: Enumerable.From(me.templates).FirstOrDefault(
                null,
                '$.CommunicationType == {0}'.format(C.CommunicationType.Email)
            ),
            sms: Enumerable.From(me.templates).FirstOrDefault(
                null,
                '$.CommunicationType == {0}'.format(C.CommunicationType.SMS)
            ),
            letter: Enumerable.From(me.templates).FirstOrDefault(
                null,
                '$.CommunicationType == {0}'.format(C.CommunicationType.Letter)
            )
        };

        var originalTemplateIds = {
            //temp until letter system changes.
            email: originalTemplates.email ? originalTemplates.email.Id : 0,
            sms: originalTemplates.sms ? originalTemplates.sms.Id : 0,
            letter: originalTemplates.letter ? originalTemplates.letter.Id : 0
        };

        var letterBundle = {
            outputWizardMode: me.cfg.outputWizardMode,
            defaultTemplates: me.templates,
            draft: me.$root.find('#Draft').val(),
            branchId: me.cfg.branchId,
            brandId: me.cfg.brandId,
            propertyIds: me.getPropertyIds(),
            recipientType: me.$root.find('#RecipientType').val(),
            browseSheetTemplateId: me.cfg.browseSheetTemplateId,
            sortOrderBy: me.sortOrderBy,
            sortOrderType: me.sortOrderType,
            messages: []
        };

        var messageBundle = {
            outputWizardMode: me.cfg.outputWizardMode,
            defaultTemplates: me.templates,
            draft: me.$root.find('#Draft').val(),
            branchId: me.cfg.branchId,
            brandId: me.cfg.brandId,
            messages: [],
            EmailPropertyRowTemplateId: me.$root
                .find('#EmailPropertyRowTemplate')
                .val()
        };
        var emailCount = 0;
        var smsCount = 0;

        //Build messages list.
        // - Loop through email and SMS outputs and construct messages
        // eslint-disable-next-line no-unused-vars
        var id = 1;

        //Loop recipients.
        me.$root.find('.recipients .row').each(function (i, row) {
            var $row = $(row);
            var contactId = parseInt($row.attr('data-contactId'));
            var personId = parseInt($row.attr('data-personId'));

            //Determine the communicationType and marketingOutputType.
            var marketingOutputTypes =
                me.getRecipientRowMarketingOutputTypes($row);

            //Look to see if there is a custom message for this recipient.  If not, use the default template (the server assigns the content later - we just set it to empty here).
            var recipient =
                me.recipients['C{0}P{1}'.format(contactId, personId)];

            //The body of the message (and the subject, for emails only) starts life empty.
            // - If it hits the server and it's still empty for this message, the template text (supplied below this part) is used.  Otherwise,
            //   the custom text is used.
            var body;
            var subject;

            var documentTemplateType;
            var templateId;
            var message;

            //Add an email message to the bundle for this recipient?
            if (marketingOutputTypes.emailMarketingOutputType != 0) {
                documentTemplateType = $row
                    .find(
                        '#f_{0}'.format(
                            marketingOutputTypes.emailMarketingOutputType
                        )
                    )
                    .attr('data-documenttemplatetype');
                templateId = $.grep(me.templates, function (e) {
                    return e.DocumentTemplateType == documentTemplateType;
                })[0].Id;

                if (recipient && recipient.emailText) {
                    subject = recipient.emailSubject;
                    body = recipient.emailText;
                } else {
                    subject = me.$root.find('#subject').val();
                    body = '';
                }

                message = {
                    marketingOutputType:
                        marketingOutputTypes.emailMarketingOutputType,
                    communicationType: C.CommunicationType.Email,
                    originalTemplateId: templateId,
                    personId: personId,
                    contactId: contactId,
                    rcptName: $row.find('.name-cell').text(),
                    rcptTo: $row.attr('data-emailAddress'),
                    subject: subject,
                    body: body,
                    propertyIds: me.getPropertyIds() //contactId many2manytodo
                };

                messageBundle.messages.push(message);
                id++;
                emailCount++;
            }

            //Add an sms message to the bundle for this recipient?
            if (marketingOutputTypes.smsMarketingOutputType != 0) {
                documentTemplateType = $row
                    .find(
                        '#f_{0}'.format(
                            marketingOutputTypes.smsMarketingOutputType
                        )
                    )
                    .attr('data-documenttemplatetype');
                templateId = $.grep(me.templates, function (e) {
                    return e.DocumentTemplateType == documentTemplateType;
                })[0].Id;

                if (recipient && recipient.smsText) {
                    body = recipient.smsText;
                } else {
                    body = '';
                }

                message = {
                    marketingOutputType:
                        marketingOutputTypes.smsMarketingOutputType,
                    communicationType: C.CommunicationType.SMS,
                    originalTemplateId: originalTemplateIds.sms,
                    personId: personId,
                    contactId: contactId,
                    rcptName: $row.find('.name-cell').text(),
                    rcptTo: $row.attr('data-mobileNumber'),
                    body: body,
                    propertyIds: me.getPropertyIds() //contactId many2manytodo
                };
                messageBundle.messages.push(message);

                // eslint-disable-next-line no-unused-vars
                id++;
                smsCount++;
            }

            //Add a letter message to the bundle for this recipient?
            if (marketingOutputTypes.letterMarketingOutputType != 0) {
                documentTemplateType = $row
                    .find(
                        '#f_{0}'.format(
                            marketingOutputTypes.letterMarketingOutputType
                        )
                    )
                    .attr('data-documenttemplatetype');
                templateId = $.grep(me.templates, function (e) {
                    return e.DocumentTemplateType == documentTemplateType;
                })[0].Id;

                if (recipient && recipient.letterText) {
                    body = recipient.letterText;
                } else {
                    body = '';
                }

                message = {
                    marketingOutputType:
                        marketingOutputTypes.letterMarketingOutputType,
                    communicationType: C.CommunicationType.Letter,
                    originalTemplateId: originalTemplateIds.letter,
                    personId: personId,
                    contactId: contactId,
                    rcptName: $row.find('.name-cell').text(),
                    rcptTo: $row.attr('data-mobileNumber'),
                    body: body,
                    propertyIds: me.getPropertyIds() //contactId many2manytodo
                };

                letterBundle.messages.push(message);
            }
        });

        //Send messages.
        if (messageBundle.messages.length == 0) {
            //Only letters to send.
            me.createLetters(letterBundle);
            if (callback) {
                callback();
            }
        } else {
            //Emails/SMS to send and maybe letters afterwards.
            new gmgps.cloud.http("outputwizard-send").ajax(
                {
                    args: messageBundle,
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    async: false,
                    url: '/Comms/SendOutputWizardMessages'
                },
                function () {
                    if (emailCount > 0 || smsCount > 0) {
                        $.jGrowl(
                            '{0} e-mail(s), {1} text message(s)'.format(
                                emailCount,
                                smsCount
                            ),
                            {
                                header: 'Messages Queued For Delivery',
                                theme: 'growl-updater growl-system',
                                life: 2000
                            }
                        );
                    }

                    //Now produce letters.
                    me.createLetters(letterBundle);

                    if (callback) {
                        callback();
                    }

                    return true;
                }
            );
        }
    },

    setupTemplateBrowser: function () {
        var me = this;

        var frameId = me.getTemplateFrameId(me.cfg.browseSheetTemplateId);
        if (frameId == 0) {
            frameId = 1;
            setTimeout(function () {
                //The default template assigned to the branch can't be found.  If there are any templates, just select the first one.
                if (me.$quickFormatSelection.find('option').length != 0) {
                    me.$quickFormatSelection
                        .val(
                            me.$quickFormatSelection.find('option:first').val()
                        )
                        .trigger('change');
                }
            }, 500);
        }

        me.$root.find('.templates').boutique({
            container_width: '100%',
            front_img_width: 350,
            front_img_height: 350,
            starter: frameId,
            speed: 250,
            hovergrowth: 0,
            behind_opac: 0.5,
            back_opac: 0.3,
            behind_size: 0.7,
            behind_distance: 70,
            back_size: 0.4,
            autointerval: 0,
            freescroll: true,
            text_front_only: true,
            keyboard: false,
            move_callback: function (id) {
                me.cfg.browseSheetTemplateId = me.getFrameTemplateId(id);
                me.$quickFormatSelection
                    .val(me.cfg.browseSheetTemplateId)
                    .trigger('prog-change');
            }
        });

        //Initial value in quick format selection.
        me.$quickFormatSelection
            .val(me.cfg.browseSheetTemplateId)
            .trigger('prog-change');

        //Quick Format Selection > Change
        me.$quickFormatSelection.on('change', function () {
            me.cfg.browseSheetTemplateId = parseInt($(this).val());
            var frameId = me.getTemplateFrameId(me.cfg.browseSheetTemplateId);
            if (frameId && frameId > 0) {
                // eslint-disable-next-line no-undef
                coverflow_goto(frameId);
            }
        });

        me.$sortOrderSelection = me.$root.find('#sort-order-selection');

        //Move Sort Order drop down to action bar.
        var $useButton = me.$root.parent().siblings().find('.action-button');
        me.$root.find('.sort-order').insertAfter($useButton);

        //Sort Order Selection > Change
        me.$sortOrderSelection.on('change', function () {
            var opt = $(this.options[this.selectedIndex]);
            me.sortOrderBy = parseInt(opt.data('order'));
            me.sortOrderType = parseInt(opt.data('type'));
        });

        //Initial value in sort order selection.
        me.$sortOrderSelection.trigger('change');
    },

    setupHtmlEditor: function () {
        var me = this;

        //Setup the email editor.
        me.$emailEditor = me.$root
            .find('#email-editor')
            .cleditor({
                //height: 152,
                //width: 385,
                controls:
                    'bold italic underline strikethrough superscript | font size ' +
                    'color | bullets | outdent ' +
                    'indent | alignleft center | ' +
                    'link | pastetext',
                colors:
                    'FFF FCC FC9 FF9 FFC 9F9 9FF CFF CCF FCF ' +
                    'CCC F66 F96 FF6 FF3 6F9 3FF 6FF 99F F9F ' +
                    'BBB F00 F90 FC6 FF0 3F3 6CC 3CF 66C C6C ' +
                    '999 C00 F60 FC3 FC0 3C0 0CC 36F 63F C3C ' +
                    '666 900 C60 C93 990 090 399 33F 60C 939 ' +
                    '333 600 930 963 660 060 366 009 339 636 ' +
                    '000 300 630 633 330 030 033 006 309 303',
                // font names in the font popup
                fonts:
                    'Arial,Arial Black,Comic Sans MS,Courier New,Narrow,Garamond,' +
                    'Georgia,Impact,Sans Serif,Serif,Tahoma,Trebuchet MS,Verdana',
                sizes: '1,2,3,4,5,6,7',
                styles: [
                    ['Paragraph', '<p>'],
                    ['Header 1', '<h1>'],
                    ['Header 2', '<h2>'],
                    ['Header 3', '<h3>'],
                    ['Header 4', '<h4>'],
                    ['Header 5', '<h5>'],
                    ['Header 6', '<h6>']
                ],
                useCSS: false,
                docType:
                    '<!DOCTYPE html> <html xmlns="http://www.w3.org/1999/xhtml">',
                docCSSFile: '',
                bodyStyle:
                    'margin:4px; font:9pt Segoe UI,Arial,Verdana; cursor:text'
            })
            .change(function () {
                me.messageChanged(C.CommunicationType.Email);
            });

        var ClEditorContextMenuActionsBehaviour =
            new gmgps.cloud.ui.behaviours.ClEditorContextMenuActionsBehaviour();

        ClEditorContextMenuActionsBehaviour.apply(me.$emailEditor[0]);

        //Setup the letter editor.
        me.$letterEditor = me.$root
            .find('#letter-editor')
            .cleditor({
                height: 198,
                width: 385,
                controls:
                    'bold italic underline strikethrough superscript | size ' +
                    'color | bullets | outdent ' +
                    'indent | alignleft center | ' +
                    'link | pastetext',
                colors:
                    'FFF FCC FC9 FF9 FFC 9F9 9FF CFF CCF FCF ' +
                    'CCC F66 F96 FF6 FF3 6F9 3FF 6FF 99F F9F ' +
                    'BBB F00 F90 FC6 FF0 3F3 6CC 3CF 66C C6C ' +
                    '999 C00 F60 FC3 FC0 3C0 0CC 36F 63F C3C ' +
                    '666 900 C60 C93 990 090 399 33F 60C 939 ' +
                    '333 600 930 963 660 060 366 009 339 636 ' +
                    '000 300 630 633 330 030 033 006 309 303',
                sizes: '1,2,3,4,5,6,7',
                styles: [
                    ['Paragraph', '<p>'],
                    ['Header 1', '<h1>'],
                    ['Header 2', '<h2>'],
                    ['Header 3', '<h3>'],
                    ['Header 4', '<h4>'],
                    ['Header 5', '<h5>'],
                    ['Header 6', '<h6>']
                ],
                useCSS: false,
                docType:
                    '<!DOCTYPE html> <html xmlns="http://www.w3.org/1999/xhtml">',
                docCSSFile: '',
                bodyStyle:
                    'margin:4px; font:9pt Segoe UI,Arial,Verdana; cursor:text'
            })
            .change(function () {
                me.messageChanged(C.CommunicationType.Letter);
            });

        ClEditorContextMenuActionsBehaviour.apply(me.$letterEditor[0]);
    },

    validate: function (onSuccess) {
        var me = this;

        //Validation is only performed when we are on the main step.
        if (me.cfg.currentStep != 'main') {
            onSuccess();
            return;
        }

        //Ensure at least one property and at least one recipient.
        if (me.$root.find('.recipients .row').length == 0) {
            showInfo(
                'There must be at least one recipient in order to continue.'
            );
            return;
        }
        if (me.$root.find('.properties .row').length == 0) {
            showInfo(
                'There must be at least one property in order to continue.'
            );
            return;
        }

        if (!me.validateSMSRoleEnabled()) {
            showInfo(
                'You do not have permission to send SMS messages.',
                'Permissions Error'
            );
            return;
        }

        if (!me.validateRecipientRows()) {
            showInfo(
                'One or more recipients has a missing or invalid email address or mobile number.</br></br>Correct or remove recipients highlighted in red, or set them to print/post only.'
            );
            return;
        }

        me.validateDocumentTemplateAccess();

        var browseSheetPrintRequired = me.isMarketingOutputTypeUsed(
            C.CommunicationType.Letter,
            C.MarketingOutputType.BrowseSheet
        );
        var brochuresPrintRequired = me.isMarketingOutputTypeUsed(
            C.CommunicationType.Letter,
            C.MarketingOutputType.FullDetails
        );
        var browseSheetEmailRequired = me.isMarketingOutputTypeUsed(
            C.CommunicationType.Email,
            C.MarketingOutputType.BrowseSheet
        );
        var brochuresEmailRequired = me.isMarketingOutputTypeUsed(
            C.CommunicationType.Email,
            C.MarketingOutputType.FullDetails
        );

        var anyDocumentOutputRequired =
            browseSheetPrintRequired ||
            brochuresPrintRequired ||
            browseSheetEmailRequired ||
            brochuresEmailRequired;

        if (
            !me.documentTemplatePermission.isGranted &&
            anyDocumentOutputRequired
        ) {
            showInfo(
                'You do not have permission to create documents, so you cannot email or print browse-sheets or brochures.',
                'Permissions Error'
            );
            return;
        }

        //Check that each recipient has at least one communicationType of delivery selected.
        var $nullRows = me.$root.find('.recipients .row').filter(function () {
            return $(this).find('.marketingOutputType.yes:visible').length == 0;
        });

        if ($nullRows.length > 0) {
            showDialog({
                type: 'question',
                title: 'Missing Delivery Method',
                msg: '{0} of your recipients {1} no delivery communicationType chosen.</br></br>Would you like to remove them from the list?'.format(
                    $nullRows.length,
                    $nullRows.length == 1 ? 'has' : 'have'
                ),
                buttons: {
                    'Remove those recipients': function () {
                        $nullRows.remove();
                        me.updateApplicantCount();
                        me.selectRecipient(
                            me.$root.find('.recipients .row:first')
                        );
                        $(this).dialog('close');
                    },
                    "I'll choose delivery methods...": function () {
                        $(this).dialog('close');
                    }
                }
            });

            return;
        }

        var checkPropertiesAwaitingDetailApproval = function () {
            // If send details to owner and not copying in applicants, then don't need to warn about details approval
            if (
                me.cfg.outputWizardMode ==
                    C.OutputWizardMode.PropertyDetailsToOwner &&
                me.getApplicantCount() == 0
            ) {
                onSuccess();
                return;
            }

            var propertiesAwaitingDetailApproval = me.$root
                .find('#PropertiesIdsAwaitingApproval')
                .val();

            if (
                propertiesAwaitingDetailApproval != null &&
                propertiesAwaitingDetailApproval != ''
            ) {
                var properties = me.$root
                    .find('#PropertiesAwaitingApproval')
                    .val()
                    .split('~');

                if (properties.length == 1) {
                    ShowAreYouSure(
                        'Warning',
                        "The property '" +
                            properties[0].trimStart(' ') +
                            "' has not had its details approved, are you sure you would like to send it?</p>",
                        function () {
                            onSuccess();
                        }
                    );
                } else {
                    var propertyDescriptions = '';

                    $.each(properties, function (i, property) {
                        propertyDescriptions +=
                            '' + property.trimStart(' ') + '<br/>';
                    });

                    ShowAreYouSure(
                        'Warning',
                        'Properties: <p>' +
                            propertyDescriptions +
                            '</p><p>have not had their details approved, are you sure you would like to send them?</p>',
                        function () {
                            onSuccess();
                        }
                    );
                }
            } else {
                onSuccess();
            }
        };

        checkPropertiesAwaitingDetailApproval();
    },

    updateApplicantCount: function () {
        var me = this;

        var count = me.$root.find('.recipients .row').length;
        var $x = me.$root.find('#applicant-count');
        $x.text('{0} ({1})'.format($x.attr('data-description'), count));
    },

    addToCount: function () {
        var me = this;
        var $applicantCount = me.$root.find('#applicant-count');
        var count = 0;
        if ($applicantCount.attr('data-applicant-count') != null)
            count = $applicantCount.attr('data-applicant-count');
        count++;
        $applicantCount.attr('data-applicant-count', count);
    },

    removeFromCount: function () {
        var me = this;
        var $applicantCount = me.$root.find('#applicant-count');
        var count = 1;
        if ($applicantCount.attr('data-applicant-count') != null)
            count = $applicantCount.attr('data-applicant-count');
        count--;
        $applicantCount.attr('data-applicant-count', count);
    },

    getApplicantCount: function () {
        var me = this;
        var applicantCount = me.$root
            .find('#applicant-count')
            .attr('data-applicant-count');
        if (applicantCount == null) return 0;
        return parseInt(applicantCount);
    },

    updatePropertyCount: function () {
        var me = this;

        var count = me.$root.find('.properties .row').length;
        me.$root.find('#property-count').text('Properties ({0})'.format(count));
    },

    updateEmailSubject: function (propertyAddressToRemove) {
        var me = this;

        var subjectTextBox = me.$root.find('#subject');
        var subject = subjectTextBox.val();

        if (propertyAddressToRemove) {
            subject = subject.replace(" - " + propertyAddressToRemove, '');
        }

        var count = me.$root.find('.properties .row').length;
        var firstPropertyAddress = me.$root.find('.properties .row:first .propertyDisplayAddress').val();
        if (count === 1) {
            subjectTextBox.val(subject + " - " + firstPropertyAddress);
        } else {
            subject = subject.replace(" - " + firstPropertyAddress, '');
            subjectTextBox.val(subject);
        }
    },

    updateMessageBoxes: function ($row) {
        //Update the editor content based on the delivery communicationType, marketingOutputType and underlying content within the recipient.
        var me = this;

        var emailAddress, mobileNumber;

        //Exit early if no recipient row was supplied.
        if ($row.length == 0) {
            me.$emailSection.disable(null, true);
            me.$smsSection.disable(null, true);
            me.$letterSection.disable(null, true);
            return false;
        }

        var contactId = parseInt($row.attr('data-contactId'));
        var personId = parseInt($row.attr('data-personId'));

        me.cfg.currentPersonId = personId;
        me.cfg.currentContactId = contactId;

        //Get the recipient row marketingOutputTypes.
        var marketingOutputTypes = me.getRecipientRowMarketingOutputTypes($row);

        //Display the email address and mobile number.
        emailAddress = $row.attr('data-emailAddress');
        mobileNumber = $row.attr('data-mobileNumber');
        me.$emailSection.find('#EmailAddress').val(emailAddress);
        me.$smsSection.find('#MobileNumber').val(mobileNumber);

        //Set a flag to ignore the CLEditor change event, which will fire as we programatically set the textarea content and call updateFrame().
        // - This otherwise results us thinking that the user has altered the content.
        me.cfg.ignoreMessageChangedEvent = true;

        //Set text for all communicationTypes (regardless of the currently selected communicationType)
        //Email
        var emailText = me.getMessageText(
            contactId,
            personId,
            C.CommunicationType.Email,
            marketingOutputTypes.emailMarketingOutputType
        );
        if (emailText) {
            me.$emailSection.find('#Subject').val(emailText.emailSubject);
            me.$emailEditor[0].$area.val(emailText.text);
            me.$emailEditor[0].updateFrame();
        }

        //SMS

        // Can be disabled at transaction level
        if (me.cfg.smsEnabled === true) {
            var smsText = me.getMessageText(
                contactId,
                personId,
                C.CommunicationType.SMS,
                marketingOutputTypes.smsMarketingOutputType
            );
            if (smsText && smsText != '') {
                me.$smsEditor.val(smsText.text);
            }
        }

        //Letter
        var letterText = me.getMessageText(
            contactId,
            personId,
            C.CommunicationType.Letter,
            marketingOutputTypes.letterMarketingOutputType
        );
        if (letterText) {
            me.$letterEditor[0].$area.val(letterText.text);
            me.$letterEditor[0].updateFrame();
        }

        me.cfg.ignoreMessageChangedEvent = false;

        //Email?
        if (marketingOutputTypes.emailMarketingOutputType != 0) {
            //Enable email section.
            me.$emailSection.enable(true);

            if (emailText && emailText.isCustom) {
                me.$emailSection.find('.common-button').fadeIn();
            } else {
                me.$emailSection.find('.common-button').fadeOut();
            }

            //Display and validate email address.
            emailAddress = $row.attr('data-emailAddress');
            me.$emailSection.find('#EmailAddress').val(emailAddress);
            if (!gmgps.cloud.helpers.general.validateEmail(emailAddress)) {
                me.$emailSection
                    .find('#EmailAddress')
                    .addClass('error')
                    .focus();
            } else {
                me.$emailSection.find('#EmailAddress').removeClass('error');
            }
        } else {
            //Disable email section.
            me.$emailSection.find('.error').removeClass('error');
            me.$emailSection.disable(null, true);
            me.$emailSection.find('.common-button').fadeOut();
        }

        //SMS?
        if (marketingOutputTypes.smsMarketingOutputType != 0) {
            //Enable SMS section.
            me.$smsSection.enable(true);

            if (smsText && smsText.isCustom) {
                me.$smsSection.find('.common-button').fadeIn();
            } else {
                me.$smsSection.find('.common-button').fadeOut();
            }

            //Display and validate mobile number.
            mobileNumber = $row.attr('data-mobileNumber');
            me.$smsSection.find('#MobileNumber').val(mobileNumber);
            if (!gmgps.cloud.helpers.general.validateMobile(mobileNumber)) {
                me.$smsSection.find('#MobileNumber').addClass('error').focus();
            } else {
                me.$smsSection.find('#MobileNumber').removeClass('error');
            }
        } else {
            //Disable SMS section.
            me.$smsSection.find('.error').removeClass('error');
            me.$smsSection.disable(null, true);
            me.$smsSection.find('.common-button').fadeOut();
        }

        //Letter?
        if (marketingOutputTypes.letterMarketingOutputType != 0) {
            //Enable letter section.
            me.$letterSection.enable(true);

            if (letterText && letterText.isCustom) {
                me.$letterSection.find('.common-button').fadeIn();
            } else {
                me.$letterSection.find('.common-button').fadeOut();
            }
        } else {
            //Disable letter section.
            me.$letterSection.find('.error').removeClass('error');
            me.$letterSection.disable(null, true);
            me.$letterSection.find('.common-button').fadeOut();
        }
    },

    validateSMSRoleEnabled: function ($rows, onlyThisCommunicationType) {
        var me = this;

        if (!$rows) {
            $rows = me.$root.find('.recipients .row');
        }

        var smsRoleEnabled = true;
        $rows.each(function (i, row) {
            if (!smsRoleEnabled) return;

            var $row = $(row);
            var marketingOutputTypes =
                me.getRecipientRowMarketingOutputTypes($row);
            if (
                !onlyThisCommunicationType ||
                onlyThisCommunicationType == C.CommunicationType.SMS
            ) {
                if (marketingOutputTypes.smsMarketingOutputType != 0) {
                    if ($row.attr('data-smsRoleEnabled') == 'False')
                        smsRoleEnabled = false;
                }
            }
        });

        return smsRoleEnabled;
    },

    validateRecipientRows: function ($rows, onlyThisCommunicationType) {
        var me = this;

        if (!$rows) {
            $rows = me.$root.find('.recipients .row');
        }

        var listHasError = false;

        //Loop through each row.
        $rows.each(function (i, row) {
            var rowHasError = false;
            var $row = $(row);
            var $communicationType = null;

            //Get marketingOutputTypes.
            var marketingOutputTypes =
                me.getRecipientRowMarketingOutputTypes($row);

            //Email?
            if (
                !onlyThisCommunicationType ||
                onlyThisCommunicationType == C.CommunicationType.Email
            ) {
                if (marketingOutputTypes.emailMarketingOutputType != 0) {
                    $communicationType = $row.find(
                        '.communicationType[data-type="{0}"]'.format(
                            C.CommunicationType.Email
                        )
                    );
                    if (
                        !gmgps.cloud.helpers.general.validateEmail(
                            $row.attr('data-emailAddress')
                        )
                    ) {
                        listHasError = true;
                        rowHasError = true;
                        $communicationType.addClass('error');
                    } else {
                        $communicationType.removeClass('error');
                    }
                }
            }

            //SMS?
            if (
                !onlyThisCommunicationType ||
                onlyThisCommunicationType == C.CommunicationType.SMS
            ) {
                if (marketingOutputTypes.smsMarketingOutputType != 0) {
                    $communicationType = $row.find(
                        '.communicationType[data-type="{0}"]'.format(
                            C.CommunicationType.SMS
                        )
                    );
                    if (
                        !gmgps.cloud.helpers.general.validateMobile(
                            $row.attr('data-mobileNumber')
                        )
                    ) {
                        listHasError = true;
                        rowHasError = true;
                        $communicationType.addClass('error');
                    } else {
                        $communicationType.removeClass('error');
                    }
                }
            }

            if (rowHasError) {
                $row.addClass('error');
            } else {
                $row.removeClass('error');
            }
        });

        return !listHasError;
    },

    validateDocumentTemplateAccess: function ($rows) {
        var me = this;

        if (!$rows) {
            $rows = me.$root.find('.recipients .row');
        }

        var listHasError = false;

        $rows.each(function (i, row) {
            var rowHasError = false;
            var $row = $(row);

            var marketingOutputTypes =
                me.getRecipientRowMarketingOutputTypes($row);

            var userAttemptingToEmailDocument =
                marketingOutputTypes.emailMarketingOutputType ==
                    C.MarketingOutputType.BrowseSheet ||
                marketingOutputTypes.emailMarketingOutputType ==
                    C.MarketingOutputType.FullDetails;

            var userAttemptingToPrintDocument =
                marketingOutputTypes.letterMarketingOutputType ==
                    C.MarketingOutputType.BrowseSheet ||
                marketingOutputTypes.letterMarketingOutputType ==
                    C.MarketingOutputType.FullDetails;

            if (
                (userAttemptingToEmailDocument ||
                    userAttemptingToPrintDocument) &&
                !me.documentTemplatePermission.isGranted
            ) {
                if (userAttemptingToEmailDocument) {
                    $row.find(
                        '.communicationType[data-type="{0}"]'.format(
                            C.CommunicationType.Email
                        )
                    )
                        .addClass('error')
                        .find('.on')
                        .attr(
                            'title',
                            'You do not have permission to create documents'
                        );
                }
                if (userAttemptingToPrintDocument) {
                    $row.find(
                        '.communicationType[data-type="{0}"]'.format(
                            C.CommunicationType.Letter
                        )
                    )
                        .addClass('error')
                        .find('.on')
                        .attr(
                            'title',
                            'You do not have permission to create documents'
                        );
                }
                listHasError = true;
                rowHasError = true;
            }

            if (rowHasError) {
                $row.addClass('error');
            } else {
                $row.removeClass('error');
            }
        });

        return !listHasError;
    },

    removeProperty: function (e) {
        var me = this;
        var $propertyToRemove = $(e.target).closest('.property-item');
        var propertyId = $propertyToRemove.attr('data-id');
        var propertyIds = me.getPropertyIds();

        if ($.inArray(propertyId, propertyIds)) {
            // remove from awaiting approval list
            var $propertyIdsAwaitingApproval = me.$root.find(
                '#PropertiesIdsAwaitingApproval'
            );
            if ($propertyIdsAwaitingApproval.val().contains(propertyId)) {
                var $propertyDescriptionsAwaitingApproval = me.$root.find(
                    '#PropertiesAwaitingApproval'
                );

                var idsAwaitingApproval = $propertyIdsAwaitingApproval
                    .val()
                    .split('~');
                var descriptionsAwaitingApproval =
                    $propertyDescriptionsAwaitingApproval.val().split('~');

                var indexOfId = $.inArray(propertyId, idsAwaitingApproval);
                idsAwaitingApproval.splice(indexOfId, 1);
                descriptionsAwaitingApproval.splice(indexOfId, 1);

                $propertyIdsAwaitingApproval.val(idsAwaitingApproval.join('~'));
                $propertyDescriptionsAwaitingApproval.val(
                    descriptionsAwaitingApproval.join('~')
                );
            }

            $propertyToRemove.remove();
            me.updatePropertyCount();
            me.updateEmailSubject($propertyToRemove.find(".propertyDisplayAddress").val());
        }
    },

    addToAwaitingApproval: function ($row) {
        var me = this;
        var id = $row.attr('data-id');
        var description = $row.find('.propertySummaryLabel').val();
        var idsAwaitingApproval = me.$root
            .find('#PropertiesIdsAwaitingApproval')
            .val();
        var descriptionsAwaitingApproval = me.$root
            .find('#PropertiesAwaitingApproval')
            .val();

        if (idsAwaitingApproval != null && idsAwaitingApproval != '')
            idsAwaitingApproval += '~';
        if (
            descriptionsAwaitingApproval != null &&
            descriptionsAwaitingApproval != ''
        )
            descriptionsAwaitingApproval += '~';

        me.$root
            .find('#PropertiesIdsAwaitingApproval')
            .val(idsAwaitingApproval + id);
        me.$root
            .find('#PropertiesAwaitingApproval')
            .val(descriptionsAwaitingApproval + description);

        $row.find('.remove').on('click', function (e) {
            me.removeProperty(e);
        });
    },

    checkForApplicantConsent: function () {
        var me = this;

        var okButton = me.$window.find('.buttons .action-button');

        var applicantsWithoutConsent = me.$root.find(
            '#recipient-body-table td.name-cell[data-consent="Denied"]'
        );
        var applicantsWithoutConsentWithEmailSelected = applicantsWithoutConsent
            .closest('tr')
            .find('td div[data-communicationtype="1"].yes.on');
        var applicantsWithoutConsentWithSMSSelected = applicantsWithoutConsent
            .closest('tr')
            .find('td div[data-communicationtype="3"].yes.on');

        var totalRowsWithInappropriateConsentSettings =
            applicantsWithoutConsentWithEmailSelected.length +
            applicantsWithoutConsentWithSMSSelected.length;

        if (
            applicantsWithoutConsent &&
            totalRowsWithInappropriateConsentSettings > 0
        ) {
            okButton.prop('disabled', true).addClass('disabled');
            okButton.qtip({
                content:
                    "You have applicants included in the list who have denied consent to property matching. You must remove them before you continue, or change their delivery option to 'Print/Post'.",
                position: {
                    my: 'center right',
                    at: 'center left'
                },
                style: {
                    tip: true,
                    width: '400px',
                    classes: 'qtip-dark'
                }
            });
        } else {
            okButton.prop('disabled', false).removeClass('disabled');
            var qtipApi = okButton.qtip('api');
            if (qtipApi != null) {
                qtipApi.destroy(true);
            }
        }
    }
};
