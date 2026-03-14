gmgps.cloud.ui.views.SigningDialog = function (args) {
    // experiemental alternative version with coloured blocks
    var me = this;
    me.cfg = args;
    me.$root = args.$root;
    me.$emailEditor = null;
    me.http = args.http || new gmgps.cloud.http("SigningDialog-SigningDialog");
    me.api = args.api || new gmgps.cloud.services.ApiService();
    me.minimumEmailLength = 8;
    me.preventDoubleSubmit = true;
    me.init(args);

    return this;
};

gmgps.cloud.ui.views.SigningDialog.typeName =
    'gmgps.cloud.ui.views.SigningDialog';

gmgps.cloud.ui.views.SigningDialog.prototype = {
    init: function () {
        var me = this;
        me.$window = me.$root.closest('.window');

        me.documentId = me.$root.find('#SourcePendingDocumentId').val();
        me.isAltoESign = me.$root.find('#IsAltoESign').val() === 'True';
        me.isTobESign = me.$root.find('#IsToBESign').val() === 'True';

        me.$root.find('select').customSelect();

        me.$emailEditor = me.$root.find('#Body').cleditor({
            height: 220,
            width: 670,
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
        });

        var ClEditorContextMenuActionsBehaviour =
            new gmgps.cloud.ui.behaviours.ClEditorContextMenuActionsBehaviour();

        ClEditorContextMenuActionsBehaviour.apply(me.$emailEditor[0]);

        // Initialize AttachmentBrowser for attachment management
        me.attachmentBrowser = new gmgps.cloud.ui.controls.AttachmentBrowser({
            container: me.$root
        });

        // Hide attachment pane if we don't have any
        if (me.$root.find('.attachments .attachment').length == 0) {
            me.$root.find('.attachments').hide();
        }

        // Delete attachment button handler
        me.$root.on('click', '.delete-attachment-button', function () {
            $(this).closest('.attachment').remove();

            if (me.$root.find('.attachments .attachment').length == 0) {
                me.$root.find('.attachments').hide();
            }
        });

        // Browse Alto attachment button handler
        me.$root.on('click', '.add-attachment-button', function () {
            var contacts = me.getContactsFromSignatories();
            var propertyId = me.$root.find('#PropertyId').val();
            var property = propertyId ? { id: propertyId } : null;
            var tenancyId = me.$root.find('#TenancyId').val();
            var tenancy = tenancyId ? { id: tenancyId } : null;

            me.attachmentBrowser.open(contacts, property, tenancy);
        });

        // Initialize file uploader from computer (only if upload button exists)
        if (me.$root.find('.upload-file').length > 0) {
            new gmgps.cloud.ui.views.fileUploaderFromComputer(
                me.$root.find('.upload-file').attr('id'),
                me.getContactsFromSignatories.bind(me),
                me.attachmentBrowser
            );
        }

        me.$root.on('click', '.dccontactlist .emailSelector', function () {
            $(this).slideUp();
            me.selectRecipientAddress($(this).parent());
        });

        me.$root.on('click', 'td .email-choice', function (e) {
            e.preventDefault();

            var id = $(e.target).closest('tr').attr('data-id');
            var personId = $(e.target).closest('tr').attr('data-person');
            var $recipient = me.$root.find(
                '.dccontactlist .signatory[data-value="{0}"][data-person={1}]'.format(
                    id,
                    personId
                )
            );

            me.selectRecipientAddress($recipient, function (address) {
                $(e.target)
                    .closest('tr')
                    .find('td.email-cell span')
                    .html(address);
            });
        });

        me.$root.on(
            'click',
            '.dccontactlist .btn-recipient-address-selector',
            function () {
                $(this).slideUp();
                me.selectRecipientAddress(this);
            }
        );

        me.$root.on('click', '.cccontactlist .emailSelector', function () {
            $(this).slideUp();
            me.selectCCRecipientAddress($(this).parent());
        });

        me.$root.on(
            'click',
            '.cccontactlist .btn-recipient-address-selector',
            function () {
                $(this).slideUp();
                me.selectCCRecipientAddress(this);
            }
        );

        me.$root.on(
            'mouseenter',
            '.cccontactlist .as-selection-item',
            function () {
                var $item = $(this);
                if ($item.attr('data-value') > '0') {
                    if ($item.find('.emailSelector').length == 0) {
                        $item.append(
                            '<div class="emailSelector" style="display:none;">Choose email address</div>'
                        );
                    }
                    if ($('.as-selection-item .emailSelector:hidden')) {
                        $item.children().slideDown();
                    }
                }
            }
        );

        me.$root.on('click', '.dccontactlist > .edit-signatories', function () {
            if ($(this).find('.button').hasClass('closed')) {
                me.$root.find('div.signatory-grid-rollout').slideDown();
            } else {
                me.$root.find('div.signatory-grid-rollout').slideUp();
            }

            $(this).find('.button').toggleClass('closed').toggleClass('open');
        });

        var agentTicked = false;

        me.$root.on('change prog-change', '.add-agent', function () {
            const $this = $(this);

            if (agentTicked) {
                //Need to disable
                me.resetRecipients();
                me.$root.find('#AuthorisedSignatories').prop('disabled', true);
                me.$root.find('.as-dropdown-container').css('opacity', '0.6');
                me.updateAgentAndLandlordRows(false);
                me.$root.find('#AuthorisedSignatories').val('0');
                me.$root
                    .find('.as-dropdown-container .customStyleSelectBoxInner')
                    .text('Select Agent...');
                me.$root.find('div.signatory-warning').slideUp();
            } else {
                const emaiNotPresentErrorMsg = "One or more landlords are missing an email address. Click the down arrow to the right of the email input to add them. Each must be unique. <br/><br/> You can then sign on their behalf - they won't receive a notification to sign."
                if (me.checkEmailAddresses('Add missing email addresses', emaiNotPresentErrorMsg, false, null, null) == false) {
                    $this.removeClass('ticked');

                    let checkbox = $this.find('input');
                    if (checkbox.is(':checked')) {
                        checkbox.prop('checked', false);
                    }

                    return false;
                }

                //Need to enable
                me.$root.find('#AuthorisedSignatories').prop('disabled', false);
                me.$root.find('.as-dropdown-container').css('opacity', '1');
                me.$root.find('div.signatory-warning').slideDown();
            }

            agentTicked = !agentTicked;
        });

        me.$root.on('change', '#AuthorisedSignatories', function () {
            //Clears existing rows
            me.$root.find('.agent-row').remove();
            me.$root.find('.agent-signatory').remove();

            var selected = $('#AuthorisedSignatories').find(':selected');

            if (selected.hasClass('select-agent-option')) {
                return;
            }

            me.updateAgentAndLandlordRows(true);

            //Get the grid table
            var signatoryGrid = me.$root.find('.signatory-grid > table');

            var noOfRows = signatoryGrid.find('tbody > tr').length;
            console.log('No of rows:', noOfRows);
            console.log('Grid: ', signatoryGrid);
            signatoryGrid
                .find('tbody:last-child')
                .append(
                    '<tr class="agent-row" data-id="' +
                    selected.attr('data-recipient-id') +
                    '">' +
                    '<td>' +
                    selected.attr('data-recipient-type-display') +
                    '</td>' +
                    '<td class="name-cell">' +
                    selected[0].innerText +
                    '</td>' +
                    '<td>' +
                    '</td>' +
                    '<td class="email-cell">' +
                    selected.attr('data-email') +
                    '</td>' +
                    '<td>' +
                    '<div class="tickbox" style="margin-top: 0px;">' +
                    '<input type="checkbox" checked="checked" data-type="email" class="by-email tickbox-hidden" />' +
                    '</div>' +
                    '</td>' +
                    '</tr>'
                );

            me.$root.find('.agent-row .tickbox').addClass('ticked');

            var firstLandlordUpdated = false;

            //See if there is already a negotiator, and if so, update the current values
            var existingAgent = me.$root
                .find('.signing-role-ManagingAgent')
                .closest('li');
            if (existingAgent.length > 0) {
                var jqAgent = $(existingAgent);

                jqAgent.children('.signatory-name').text(selected[0].innerText);

                //Set negotiatorId on the model
                var model = jqAgent.data('model');
                model.NegotiatorId = selected.attr('data-recipient-id');
                jqAgent.data('model', model);

                firstLandlordUpdated = true;
            }

            //Get all landlord blobs- based on the '.signing-role-Landlord' class
            var landlords = me.$root
                .find('.signing-role-Landlord')
                .closest('li');

            _.each(landlords, function (landlord) {
                var jqLandlord = $(landlord);

                //Only change the display of the first landlord, otherwise set display to none
                if (!firstLandlordUpdated) {
                    //Get the landlord name
                    var nameBlock = jqLandlord.children('.signatory-name');
                    //Set it to an attribute
                    jqLandlord.attr('display-name', nameBlock.text());
                    //Change name to negotiator
                    nameBlock.text(selected[0].innerText);

                    //Change class to look like a negotiator
                    jqLandlord
                        .find('.signing-role-key')
                        .removeClass('signing-role-Landlord');
                    jqLandlord
                        .find('.signing-role-key')
                        .addClass('signing-role-ManagingAgent');

                    firstLandlordUpdated = true;

                    var emailChoice = jqLandlord.children('.email-choice');
                    emailChoice.prop('disabled', true);

                    if (emailChoice.hasClass('fa-warning')) {
                        emailChoice.removeClass('fa-warning').addClass('fa-at');
                    }

                    emailChoice.attr('title', selected.attr('data-email'));
                } else {
                    if ($(jqLandlord).css('display') != 'none') {
                        jqLandlord.toggle();
                    }
                }

                var model = jqLandlord.data('model');
                model.NegotiatorId = selected.attr('data-recipient-id');
                jqLandlord.data('model', model);
            });
        });

        var TabInputBehaviour = function (elem) {
            var TAB = 9;
            var element = elem;

            this.respond = function (e) {
                var keyCode = e.keyCode || e.which;

                if (keyCode != TAB) {
                    return;
                }

                var $this = $(element);
                var adhocAddress = $this.val();
                if (adhocAddress.length > 0) {
                    e.preventDefault();
                    $this
                        .parent()
                        .before(
                            '<li class="as-selection-item blur" data-value="{0}" data-udf2="{1}" data-modeltype="0"><a class="as-close"></a>{2}</li>'.format(
                                0,
                                adhocAddress,
                                adhocAddress
                            )
                        );
                    $this.val('');
                }
            };
        };

        me.http.ajax(
            {
                args: { pendingDocumentId: me.documentId },
                complex: true,
                post: true,
                dataType: 'json',
                type: 'post',
                url: '/Signing/GetSignatories'
            },
            function (response) {
                var signatoryList = me.$root.find(
                    '.dccontactlist .as-selections'
                );
                var signatoryGrid = me.$root.find('.signatory-grid > table');

                var num = 0;
                _.each(response.Data.Receipients, function (r) {
                    var template = '';
                    var emailButtonTemplate = '';
                    var emailPicker = '';
                    if (me.isTobESign) {
                        template =
                            '<li class="as-selection-item signatory" id="as-selection-{1}" data-id="{2}" data-person="{5}" data-selected="true" data-value="{2}">{4}<div class="signatory-name" title="{0}">{3}</div></li>';
                        emailButtonTemplate =
                            '<div class="signing-role-key signing-role-{0} mr5">&nbsp;&nbsp;&nbsp;</div>';
                        emailPicker = emailButtonTemplate.format(r.RecipientType);
                    } else {
                        template =
                            '<li class="as-selection-item signatory" id="as-selection-{1}" data-id="{2}" data-person="{5}" data-selected="true" data-value="{2}">{4}<div class="signatory-name" title="{0}">{3}</div><a class="fa fa-remove pr5 include"></a></li>';
                        emailButtonTemplate =
                            '<div class="signing-role-key signing-role-{0} mr5">&nbsp;&nbsp;&nbsp;</div><a class="fa fa-{1} mr2 email-choice" title="{2}"></a>';
                        emailPicker = emailButtonTemplate.format(
                            r.RecipientType,
                            r.EmailAddress === null ? 'warning' : 'at',
                            r.EmailAddress !== null
                                ? r.EmailAddress
                                : 'No email address available'
                        );
                    }
                    var composedItemHtml = template.format(
                        r.RecipientType,
                        num,
                        r.RecipientId,
                        r.DisplayName,
                        emailPicker,
                        r.PersonId
                    );

                    var signatory = $(composedItemHtml);
                    signatory.data('model', r);
                    signatoryList.append(signatory);
                    if (me.isTobESign) {
                        $('input.by-email').prop("disabled", true);
                    }
                    num++;
                });

                var changeTick = function (icon) {
                    var selected =
                        icon.parent().attr('data-selected') === 'true';
                    var newState = !selected;
                    if (newState === false) {
                        icon.parent().hide();
                    } else {
                        icon.parent().show();
                    }
                    icon.parent().attr('data-selected', newState);
                };

                signatoryGrid.on(
                    'change prog-change',
                    '.tickbox',
                    function (e) {
                        var id = $(e.target).closest('tr').attr('data-id');
                        var personId = $(e.target)
                            .closest('tr')
                            .attr('data-person');
                        //$(e.target).trigger('prog-change');
                        var icon;

                        if (personId === undefined) {
                            icon = signatoryList
                                .find('.signatory .signing-role-ManagingAgent')
                                .siblings('a.include');
                        } else {
                            icon = signatoryList.find(
                                '.signatory[data-value="{0}"][data-person="{1}"] a.include'.format(
                                    id,
                                    personId
                                )
                            );
                        }

                        changeTick(icon);
                    }
                );

                signatoryList.on('click', 'a.include', function (e) {
                    var id = $(e.target).closest('li').attr('data-value');
                    var personId = $(e.target)
                        .closest('li')
                        .attr('data-person');
                    changeTick($(e.target));

                    var tickbox = signatoryGrid.find(
                        'tr.agent-row> td > div.tickbox > input'
                    );

                    if (tickbox.length === 0) {
                        tickbox = signatoryGrid.find(
                            'tr[data-id="{0}"][data-person="{1}"] > td > div.tickbox > input'.format(
                                id,
                                personId
                            )
                        );
                    }

                    tickbox.trigger('mirror-change');
                });

                signatoryList.on('click', 'a.email-choice', function () {
                    var contactItem = $(this).parent();
                    me.selectRecipientAddress(contactItem);
                });

                var contactSearch = {
                    modelType: C.ModelType.Contact,
                    includeUsers: false,
                    includeContacts: true,
                    includeDiaryUserGroups: false,
                    displayCompanyName: true
                };

                var contactsAutoSuggestData = function (query, callback) {
                    contactSearch.query = query;
                    gmgps.cloud.helpers.general.getAutoCompleteList(
                        C.ModelType.Contact,
                        contactSearch,
                        callback
                    );
                };

                var existingCcContacts = _.filter(response.Data.Receipients, {
                    ContactProtocol: 2
                });
                var ccParties = [];
                $.each(existingCcContacts, function (i, v) {
                    ccParties.push(v);
                });

                me.$root
                    .find('#CcContactIds')
                    .autoSuggest(contactsAutoSuggestData, {
                        startText: '',
                        preFill: ccParties,
                        queryParam: 'term',
                        minChars: 2,
                        canGenerateNewSelections: false,
                        selectedValuesProp: 'id',
                        selectedItemProp: 'value',
                        searchObjProps: 'value',
                        selectionAdded: function () {
                            //Remove any validation prompt.
                            me.$root
                                .find('.contactASList')
                                .validationEngine('hide');
                            const missingEmailErrorMessage = 'One or more of the intended contact recipients does not have an email address, you can type it in now to use just this once or edit the contact to add an email address that will be saved for future use.';
                            const duplicateEmailErrorMessage = 'You have duplicate email addresses. Each party needs a unique email address to send. Please update them to continue.';
                            me.checkEmailAddresses('Information', missingEmailErrorMessage, true, 'Update duplicate email addresses', duplicateEmailErrorMessage);
                        },
                        selectionRemoved: function (elem) {
                            //Remove element.
                            elem.remove();
                        },
                        formatList: function (data, elem) {
                            return gmgps.cloud.helpers.general.formatAutoSuggestItem(
                                data,
                                elem
                            );
                        }
                    })
                    .on('keydown', function (e) {
                        var behaviour = new TabInputBehaviour(this);
                        behaviour.respond(e);
                    });

                me.setupRecipientAC(
                    me.$root.find('.cccontactlist .as-selections')
                );
            }
        );

        setupTips(me.$root);

        me.$root.find('.emailpara').on('change', function () {
            var $this = $(this);
            var $text = me.$root.find('#Body');
            var $subject = me.$root.find('#Subject');

            if ($this.val().length > 0) {
                //if body already has content do we prompt warn that it will be overwritten or just append???
                if ($text.val().length > 0) {
                    showDialog({
                        type: 'question',
                        title: 'Standard Paragraph',
                        msg: 'The email message already contains some content, would you like to replace the content or append the paragraph to the end?',
                        buttons: {
                            Replace: function () {
                                $text.val($this.val());
                                $subject.val($this.find(':selected').text());
                                me.$emailEditor[0].updateFrame();
                                $(this).dialog('close');
                            },
                            Append: function () {
                                $text.val($text.val() + ' ' + $this.val());
                                $subject.val(
                                    $subject.val() +
                                    ' ' +
                                    $this.find(':selected').text()
                                );
                                me.$emailEditor[0].updateFrame();
                                $(this).dialog('close');
                            },
                            Cancel: function () {
                                $(this).dialog('close');
                            }
                        }
                    });
                } else {
                    $text.val($this.val());
                    $subject.val($this.find(':selected').text());
                    me.$emailEditor[0].updateFrame();
                }
            }
        });
    },

    resetRecipients: function () {
        var me = this;
        //Get all hidden landlords
        var landlords = me.$root.find('.signing-role-Landlord').closest('li');
        _.each(landlords, function (landlord) {
            var jqLandlord = $(landlord);

            var model = jqLandlord.data('model');
            model.NegotiatorId = null;
            jqLandlord.data('model', model);

            if (jqLandlord.is(':hidden')) {
                jqLandlord.show();
            }

            var emailChoice = jqLandlord.children('.email-choice');
            emailChoice.prop('disabled', false);

            if (model.EmailAddress === null) {
                emailChoice.removeClass('fa-at').addClass('fa-warning');
                emailChoice.attr('title', 'no email address available');
            } else {
                emailChoice.attr('title', model.EmailAddress);
            }
        });

        //Reset the updated landlord. There should only be one but will do a loop anyway
        //TODO: Change to .first()
        var agent = me.$root.find('.signing-role-ManagingAgent').closest('li');
        _.each(agent, function (a) {
            var jqAgent = $(a);

            console.log(jqAgent.data('model'));

            var model = jqAgent.data('model');
            model.NegotiatorId = null;
            jqAgent.data('model', model);

            var nameBlock = jqAgent.children('.signatory-name');
            //Change name to negotiator
            nameBlock.text(jqAgent.attr('display-name'));

            jqAgent.find('.signing-role-key').addClass('signing-role-Landlord');
            jqAgent
                .find('.signing-role-key')
                .removeClass('signing-role-ManagingAgent');

            if (jqAgent.is(':hidden')) {
                jqAgent.show();
            }

            var emailChoice = jqAgent.children('.email-choice');
            emailChoice.prop('disabled', false);

            if (model.EmailAddress === null) {
                emailChoice.removeClass('fa-at').addClass('fa-warning');
                emailChoice.attr('title', 'no email address available');
            } else {
                emailChoice.attr('title', model.EmailAddress);
            }
        });
    },

    updateAgentAndLandlordRows: function (addAgentRow) {
        var me = this;

        me.$root.find('.agent-row').remove();
        me.$root.find('.agent-signatory').remove();

        //Re-select the landlords
        var landlords = me.$root.find("tr[data-recipient-type*='Landlord']");
        _.each(landlords, function (landlord) {
            var tickbox = $(landlord).find('.tickbox');
            if (addAgentRow) {
                if (tickbox.hasClass('ticked')) {
                    tickbox.removeClass('ticked');
                }
            } else {
                tickbox.addClass('ticked');
            }
            $(landlord).find('.tickbox-hidden').prop('disabled', addAgentRow);
        });
    },

    checkEmailAddresses: function (missingEmailErrorTitle, missingEmailErrorMessage, validateDuplicate, duplicateEmailErrorTitle, duplicateEmailErrorMessage) {
        var me = this;

        var missingAddress = false;
        const signatoryEmailList = [];

        $('.contactASList li.as-selection-item').each(function (i, el) {
            var $el = $(el);
            if ($el.data('model') !== undefined) {
                var signatory = $el.data('model');
                if ($el.attr('data-selected') === 'true' && (signatory.EmailAddress === null || signatory.EmailAddress === '') && signatory.NegotiatorId === null) {
                    missingAddress = true;
                }

                if ($el.attr('data-selected') === 'true' && !missingAddress) {
                    signatoryEmailList.push(signatory.EmailAddress.toLowerCase());
                }

                return;
            }

            var emailAddress = $el.attr('data-udf2');
            var isMissingOrNullEmailAddress = emailAddress === '' || emailAddress === 'null';

            if (emailAddress.indexOf('@') < 1) {
                missingAddress = true;
            }

            if (isMissingOrNullEmailAddress || emailAddress.length < me.minimumEmailLength) {
                missingAddress = true;
            }

            if (!missingAddress) {
                signatoryEmailList.push(emailAddress.toLowerCase())
            }

        });

        if (missingAddress) {
            showInfo(missingEmailErrorMessage, missingEmailErrorTitle);
            return false;
        }

        if (validateDuplicate === true) {
            const hasDuplicates = new Set(signatoryEmailList).size !== signatoryEmailList.length;
            if (hasDuplicates) {
                showInfo(duplicateEmailErrorMessage, duplicateEmailErrorTitle);
                return false;
            }
        }
        return true;
    },

    checkSignatoryNames: function () {
        var me = this;
        var signatoriesWithIssues = [];

        me.$root
            .find('.dccontactlist li.as-selection-item')
            .each(function (ix, el) {
                var $signatory = $(el);
                var signatory = $signatory.data('model');

                if ($signatory.attr('data-selected') === 'true' && signatory) {
                    var issues = [];
                    var displayName = signatory.DisplayName || 'Unknown Contact';

                    if (!signatory.Forename || signatory.Forename.trim() === '') {
                        issues.push('Forename');
                    }

                    if (!signatory.Surname || signatory.Surname.trim() === '') {
                        issues.push('Surname');
                    }

                    if (issues.length > 0) {
                        signatoriesWithIssues.push({
                            displayName: displayName,
                            issues: issues
                        });
                    }
                }
            });

        if (signatoriesWithIssues.length > 0) {
            var messageParts = [];
            signatoriesWithIssues.forEach(function (item) {
                var fieldsText = item.issues.join(' or ');
                messageParts.push(item.displayName + ' is missing ' + fieldsText);
            });

            var message = 'The following signatories are missing required name information:<br><br>' +
                messageParts.join('<br>') +
                '<br><br>Please close the template window, then update the Contact record(s) with the missing information before sending the document for signing.';

            showInfo(message);
            return false;
        }

        return true;
    },

    setupRecipientAC: function ($e) {
        $e.autoCompleteEx({
            modelType: C.ModelType.Contact,
            search: {
                CategoryIdList: [C.ContactCategory.Client],
                ApplyFurtherFilteringtoIds: false
            },
            disabled: true,
            allowCreate: false,
            sourceZIndex: $e.css('z-index'),
            includeContacts: true,
            includeUsers: false,
            placeholder: 'Search for Contacts...',
            closeAfterSelect: true,
            onSelected: function (args) {
                //check if this contact has an email address (already done for either person as we have been given contacts prefered address
                if (args.udf2.length < 1) {
                    showInfo(
                        'The selected contact does not have an email address so can not be added'
                    );
                    return false;
                }

                //check for already in list to prevent dupes
                var recipients = $('.row[data-type=email] .recipient');

                for (var i = 0; i < recipients.length; i++) {
                    var address = $(recipients[i]).val();
                    if (address == args.udf2) {
                        showInfo(
                            'That email address already exists in the list so will not be added'
                        );
                        return false;
                    }
                }

                var newSelectionItem = $(
                    '<li class="as-selection-item blur" data-value="{0}" data-udf2="{1}" data-modeltype="{3}"><a class="as-close"></a>{2}</li>'.format(
                        args.id,
                        args.udf2,
                        args.udf6,
                        args.modelType
                    )
                ).attr('data-consents', JSON.stringify(args.consents));

                newSelectionItem.on('click', 'a.as-close', function (e) {
                    $(e.target).parent().remove();
                });

                args.$e.find('.as-original').before(newSelectionItem);

                return false; //so we get to decide what to set thet value of the input to
            },
            onRemoved: function () {
                console.log('remove attempted');
            }
        }).off('keyup keydown keypress input');
    },

    action: function (callback) {
        var me = this;
        me.$window.find('.action-button').lock();

        if (me.$root.find('.contactASList li.as-selection-item').length === 0) {
            showInfo('Please select a recipient');
            me.$window.find('.action-button').unlock();
            return false;
        }
        const missingEmailErrorMessage = 'One or more of the intended contact recipients does not have an email address, you can type it in now to use just this once or edit the contact to add an email address that will be saved for future use.';
        const duplicateEmailErrorMessage = 'You have duplicate email addresses. Each party needs a unique email address to send. Please update them to continue.';
        if (me.checkEmailAddresses('Information', missingEmailErrorMessage, true, 'Update duplicate email addresses', duplicateEmailErrorMessage) == false) {
            me.$window.find('.action-button').unlock();
            return false;
        }

        if (me.isAltoESign && me.checkSignatoryNames() == false) {
            me.$window.find('.action-button').unlock();
            return false;
        }

        var userGroupId = parseInt($('#_groupid').val(), 10);
        var userBranchId = parseInt($('#_branchid').val(), 10);
        var propertyId = parseInt(me.$root.find('#PropertyId').val(), 10);

        var hasESign = alto.optimizelyClient.isFeatureEnabledForBranch(
            'alto_settings_keyflo_esign_mfe',
            userGroupId,
            userBranchId
        );
        if (hasESign && me.isAltoESign && propertyId === 0) {
            showDialog({
                type: 'question',
                title: 'No property associated',
                msg: "This document needs to be associated to a property before it can be sent for e-signature. You'll need to restart and add a property to continue.",
                buttons: {
                    Restart: function () {
                        if (callback) callback(false);
                        $(this).dialog('close');
                    },
                    Cancel: function () {
                        me.$window.find('.action-button').unlock();
                        $(this).dialog('close');
                        return false;
                    }
                }
            });
            return false;
        }

        // Reindex attachments before form submission
        me.reindexAttachments(me.$root);

        var recipients = [];
        var signatories = [];

        me.$root
            .find('.dccontactlist li.as-selection-item')
            .each(function (ix, el) {
                var $signatory = $(el);
                var signatory = $signatory.data('model');
                if ($signatory.attr('data-selected') === 'true') {
                    signatories.push(signatory);
                }
            });

        var emailForm = createForm(me.$root, '/signing/send');

        emailForm
            .find('.cccontactlist li.as-selection-item')
            .each(function (i, v) {
                var $recipient = $(v);
                console.log('Recipient:', $recipient);
                var email = $(v).attr('data-udf2');
                var receipient = {
                    RecipientId: parseInt($recipient.attr('data-value')),
                    RecipientType: $recipient.attr('data-modeltype'),
                    Title: '',
                    DisplayName: $recipient.text(),
                    EmailAddress: email,
                    ContactProtocol: 'CC',
                    BranchId: $recipient.attr('data-branch-id')
                };
                recipients.push(receipient);
            });

        emailForm
            .find('.cccontactlist li.as-original input[type="text"]')
            .each(function (i, v) {
                var $recipient = $(v);
                var udf2 = $(v).val();
                if (udf2 && udf2.length > 0) {
                    var receipient = {
                        RecipientId: 0,
                        RecipientType: $recipient.attr('data-modeltype'),
                        Title: '',
                        DisplayName: $recipient.text(),
                        EmailAddress: udf2,
                        ContactProtocol: 'CC',
                        BranchId: $recipient.attr('data-branch-id')
                    };
                    recipients.push(receipient);
                }
            });

        var rix = 0;
        _.each(recipients, function (recipient) {
            _.forOwn(recipient, function (value, key) {
                emailForm.append(
                    '<input type="hidden" name="Recipients[{0}].{1}" value="{2}" />'.format(
                        rix,
                        key,
                        value
                    )
                );
            });
            rix++;
        });

        var six = 0;
        _.each(signatories, function (signatory) {
            _.forOwn(signatory, function (value, key) {
                emailForm.append(
                    '<input type="hidden" name="Signatories[{0}].{1}" value="{2}" />'.format(
                        six,
                        key,
                        value
                    )
                );
            });
            six++;
        });

        var mailSentMessage = 'Email sent';
        var mailNotSentMessage = 'E-Mail Not Sent';

        me.http.postForm(
            emailForm,
            function (response) {

                if (window.opener) {
                    window.opener.console.debug('Form post has returned');
                }
                else {
                    window.console.debug('Form post has returned');
                }

                if (response && response.Data) {
                    $.jGrowl('', {
                        header: mailSentMessage,
                        theme: 'growl-system'
                    });
                    if (callback) {
                        callback(false);
                    }
                } else {
                    $.jGrowl('', {
                        header: mailNotSentMessage,
                        theme: 'growl-overdue'
                    });
                }
            },
            function (response) {
                me.$window.find('.action-button').unlock();

                if (window.opener) {
                    window.opener.console.debug('Form post has errored');
                }
                else {
                    window.console.debug('Form post has returned');
                }

                $.jGrowl(response, {
                    header: mailNotSentMessage,
                    theme: 'growl-overdue'
                });
            }
        );

        return false;
    },

    cancel: function (onComplete) {
        var me = this;
        me.$root.find('form').validationEngine('hideAll');
        onComplete(false);
    },

    destroy: function () {
        var me = this;
        me.$root.empty().unbind();
    },

    selectRecipientAddress: function (sender, additionalCallback) {
        var me = this;
        var signatory = sender.data('model');

        var addressesChosen = function (chosenAddresses) {
            signatory.EmailAddress = chosenAddresses;
            sender.data('model', signatory);
            sender.find('.email-choice').attr('title', chosenAddresses);

            if (additionalCallback) {
                additionalCallback(chosenAddresses);
            }
        };

        var addressAdded = function (newAddress) {
            signatory.EmailAddress = newAddress;
            sender.data('model', signatory);
            sender
                .find('.email-choice')
                .removeClass('fa-warning')
                .addClass('fa-at')
                .attr('title', newAddress);

            var $p = me.api.post.bind({ componentName: "SigningDialog-addressAdded" });
            $p('Contact', 'AddEmailToPersonOnContact', {
                ContactId: signatory.RecipientId,
                PersonId: signatory.PersonId,
                EmailAddress: newAddress,
                PersonName: signatory.DisplayName
            });

            if (additionalCallback) {
                additionalCallback(newAddress);
            }
        };

        if (signatory) {
            new gmgps.cloud.ui.controls.window({
                title: 'Select Recipient Addresses',
                windowId: 'recipientModal',
                urlArgs: {
                    contactId: signatory.RecipientId,
                    personNumber: signatory.PersonId,
                    currentAddress: signatory.EmailAddress,
                    allowMultiple: false
                },
                url: '/Email/EmailRecipientAddressSelectorEx',
                complex: true,
                post: true,
                width: 700,
                draggable: true,
                modal: true,
                actionButton: 'Select',
                cancelButton: 'Cancel',
                onReady: function ($f) {
                    $f.find('.action-button')
                        .removeClass('grey')
                        .addClass('bgg-green');
                    $f.find(
                        '.email-recipient-address-selector input[type="text"]'
                    ).focus();
                },

                onAction: function ($f) {
                    var newAddresses = $f
                        .find('.address-selector:checked')
                        .map(function () {
                            return $(this)
                                .parent()
                                .next('input[type="text"]')
                                .val();
                        })
                        .get()
                        .join('; ');

                    if (newAddresses.length) {
                        addressAdded(newAddresses);
                    }

                    var existingAddresses = $f
                        .find('.address-selector:checked')
                        .map(function () {
                            return $(this).data('address');
                        })
                        .get()
                        .join('; ');

                    if (existingAddresses.length) {
                        addressesChosen(existingAddresses);
                    }
                },
                onCancel: function () { }
            });
        } else {
            showInfo(
                'Please select a recipient first, in order to choose an address.'
            );
        }
    },

    selectCCRecipientAddress: function (sender) {
        //prepare callback to update email address
        var target = $(sender);
        var callback = function (address) {
            $(sender).attr('data-udf2', address);
        };

        var recipientId = $(sender).attr('data-value');

        if (recipientId) {
            new gmgps.cloud.ui.controls.window({
                title: 'Select Recipient Addresses',
                windowId: 'recipientModal',
                urlArgs: {
                    contactId: recipientId,
                    currentAddress: $(target).attr('data-udf2')
                },
                url: '/Email/EmailRecipientAddressSelector',
                complex: true,
                post: true,
                width: 700,
                draggable: true,
                modal: true,
                actionButton: 'Select',
                cancelButton: 'Cancel',
                onReady: function ($f) {
                    $f.find('.action-button')
                        .removeClass('grey')
                        .addClass('bgg-green');
                },
                onAction: function ($f) {
                    var addresses = $f
                        .find('.address-selector:checked')
                        .map(function () {
                            return $(this).data('address');
                        })
                        .get()
                        .join('; ');
                    callback(addresses);
                },
                onCancel: function () { }
            });
        } else {
            showInfo(
                'Please select a recipient first, in order to choose an address.'
            );
        }
    },

    getContactsFromSignatories: function () {
        var me = this;
        var contacts = [];

        // Get contacts from signatories list
        me.$root.find('.dccontactlist li.as-selection-item').each(function (i, el) {
            var $item = $(el);
            var id = parseInt($item.attr('data-value'));
            if (id > 0) {
                contacts.push({ id: id });
            }
        });

        // Also get contacts from CC list
        me.$root.find('.cccontactlist li.as-selection-item').each(function (i, el) {
            var $item = $(el);
            var id = parseInt($item.attr('data-value'));
            if (id > 0) {
                contacts.push({ id: id });
            }
        });

        return contacts;
    },

    reindexAttachments: function ($form) {
        var subscript = 0;
        var $row = $form.find('.attachment');

        $row.find('input.attachmentTemplate').each(function (
            inputIndex,
            value
        ) {
            if ($(value).val().length > 0) {
                var name = $(value).attr('name');
                name = name.replace('[]', '[' + subscript + ']');
                $(value).attr('name', name);
                subscript++;
            }
        });

        subscript = 0;
        $row.find('input.attachmentIds').each(function (inputIndex, value) {
            if ($(value).val().length > 0) {
                var name = $(value).attr('name');
                name = name.replace('[].', '[' + subscript + '].');
                name = name.replace('[]', '[0]');
                $(value).attr('name', name);
                subscript++;
            }
        });

        subscript = 0;
        $row.find('input.attachmentName').each(function (inputIndex, value) {
            if ($(value).val().length > 0) {
                var name = $(value).attr('name');
                name = name.replace('[]', '[' + subscript + ']');
                $(value).attr('name', name);
                subscript++;
            }
        });

        subscript = 0;
        $row.find('input.attachmentTypeId').each(function (inputIndex, value) {
            if ($(value).val().length > 0) {
                var name = $(value).attr('name');
                name = name.replace('[]', '[' + subscript + ']');
                $(value).attr('name', name);
                subscript++;
            }
        });

        subscript = 0;
        $row.find('input.attachmentFileTypeId').each(function (
            inputIndex,
            value
        ) {
            if ($(value).val().length > 0) {
                var name = $(value).attr('name');
                name = name.replace('[]', '[' + subscript + ']');
                $(value).attr('name', name);
                subscript++;
            }
        });

        subscript = 0;
        $row.find('input.attachmentCategory').each(function (
            inputIndex,
            value
        ) {
            if ($(value).val().length > 0) {
                var name = $(value).attr('name');
                name = name.replace('[]', '[' + subscript + ']');
                $(value).attr('name', name);
                subscript++;
            }
        });
    }
};
