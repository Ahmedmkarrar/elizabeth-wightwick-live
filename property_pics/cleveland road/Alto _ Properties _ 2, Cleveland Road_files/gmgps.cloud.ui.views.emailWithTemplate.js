gmgps.cloud.ui.views.emailWithTemplate = function (args) {
    var me = this;
    me.cfg = args;
    me.$root = args.$root;
    me.$emailEditor = null;
    me.$window = me.$root.closest('.window');
    me.http =
        args.http ||
        new gmgps.cloud.http("emailWithTemplate-emailWithTemplate");
    me.minimumEmailLength = 8;
    me.templateId = 0;
    me.closeMyWindow = args.closeMyWindow;
    me.populateMergeCodes = true;
    // Atm GA that template was changed from drop down should be pushed only once
    me.wasAdhocTemplateSelectionUsed = false;
    me.beePluginContainerId = 'bee-plugin-email-container';
    me.isShowingEmailMissingInfo = false;
    me.emailHelpUrl = me.$root.find('#EmailHelpUrl').val();
    me.beePlugin = null;
    me.subject = '';
    me.init(args);

    return this;
};

gmgps.cloud.ui.views.emailWithTemplate.typeName =
    'gmgps.cloud.ui.views.emailWithTemplate';

gmgps.cloud.ui.views.emailWithTemplate.prototype = {
    init: function (args) {
        var me = this;

        me.$window = me.$root.closest('.window');

        me.attachmentBrowser = new gmgps.cloud.ui.controls.AttachmentBrowser({
            container: me.$root
        });

        var nextButton =
            '<div class="btn grey sml next-button" id="use-template-btn">Use the Template</div>';
        me.$window.find('.cancel-button').after(nextButton);

        me.$window.on('click', '.next-button', function () {
            me.showEmailModal();
            me.sendEventUseTheTemplate(me.checkIfBlankTemplate());
        });

        me.$window.find('.cancel-button').css('float', 'left');

        var backButton =
            '<div class="btn grey sml back-button" style="float:left;">Back</div>';
        me.$window.find('.action-button').after(backButton);

        me.$window.on('click', '.back-button', function () {
            me.back();
        });

        me.$window.find('.cancel-button').css('float', 'left');

        me.$window.on('change', '.template-selector', function () {
            me.templateId = $(this).val() || 0;
            
            var selectedOption = $(this).find('option:selected');
            me.subject = selectedOption.data('subject');
            
            if (!me.wasAdhocTemplateSelectionUsed) {
                me.sendEventChangeTemplateSelection();
            }
        });

        var templateSelector = me.$root.find('select.template-selector');
        var defaultTemplateId = me.$root.find('input#DefaultTemplateId').val();
        templateSelector.val(defaultTemplateId);
        me.templateId = defaultTemplateId;
        
        var defaultOption = templateSelector.find('option:selected');
        me.subject = defaultOption.data('subject');

        me.$root.find('select').customSelect();

        me.$root.on('click', '.delete-attachment-button', function () {
            $(this).closest('.attachment').remove();

            if (me.$root.find('.attachments .attachment').length == 0) {
                me.$root.find('.attachments').hide();
            }
        });

        me.$root.on('click', '.add-brochure-button', function () {
            var propertyId = me.$root.find('#PropertyId').val();

            me.http.ajax(
                {
                    args: {
                        ContextModelType: C.ModelType.Property,
                        PropertyId: propertyId,
                        MediaType: C.MediaType.Brochure
                    },
                    dataType: 'json',
                    type: 'post',
                    url: '/Document/GetDocumentInfo'
                },
                function (response) {
                    me.attachmentBrowser.addAttachmentRowFromData(
                        response.Data
                    );
                    me.attachmentBrowser.showAttachments();
                },
                function () {}
            );
        });

        me.$root.on('click', '.add-attachment-button', function () {
            var propertyId = me.$root.find('#PropertyId').val();
            var contacts = me.getContactsFromToRecipients();

            // we want to check if it happens that we are in tenancy dashboard
            const hash =  window.location.hash;
            let tenancyId = null;
            const match = hash.match(/#tenancies\/(\d+)\/overview/);
            if (match) {
                tenancyId = match[1];
            }

            me.attachmentBrowser.open(contacts, { id: propertyId }, {id: tenancyId});
        });

        me.$root.on('mouseenter', '.as-selection-item', function () {
            if ($(this).attr('data-value') > '0') {
                if ($(this).find('.emailSelector').length == 0) {
                    $(this).append(
                        '<div class="emailSelector" style="display:none;">Choose email address</div>'
                    );
                }
                if ($('.as-selection-item .emailSelector:hidden'))
                    $(this).children().slideDown();
            }
        });

        me.$root.on('mouseleave', '.as-selection-item', function () {
            setTimeout(function () {
                $('.as-selection-item .emailSelector').slideUp();
            }, 1500);
        });

        me.$root.on('click', '.emailSelector', function () {
            me.selectRecipientAddress($(this).parent());
        });

        me.$root.on('click', '.btn-recipient-address-selector', function () {
            me.selectRecipientAddress(this);
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

        //set up a contact ac so we can easily add recipients

        var contactSearch = {
            modelType: C.ModelType.Contact,
            includeUsers: false,
            includeContacts: true,
            includeDiaryUserGroups: false,
            displayCompanyName: true
        };

        var existingContacts = $.parseJSON(
            me.$root.find('#_recipientsDC').val()
        );
        var parties = [];
        $.each(existingContacts, function (i, v) {
            parties.push(v);
        });

        var contactsAutoSuggestData = function (query, callback) {
            contactSearch.query = query;
            gmgps.cloud.helpers.general.getAutoCompleteList(
                C.ModelType.Contact,
                contactSearch,
                callback
            );
        };

        me.$root.find('#DcContactIds').autoSuggest(contactsAutoSuggestData, {
            startText: '',
            preFill: parties,
            queryParam: 'term',
            minChars: 2,
            canGenerateNewSelections: false,
            selectedValuesProp: 'id',
            selectedItemProp: 'value',
            searchObjProps: args.data || 'value',
            selectionAdded: function () {
                //Remove any validation prompt.
                me.$root.find('.contactASList').validationEngine('hide');
                me.checkEmailAddresses();
                me.checkConsents();
            },
            selectionRemoved: function (elem) {
                //Remove element.
                elem.remove();
                me.checkConsents();
            },
            formatList: function (data, elem) {
                return gmgps.cloud.helpers.general.formatAutoSuggestItem(data, elem);
            }
        })
            .on('keydown', function (e) {
                var behaviour = new TabInputBehaviour(this);
                behaviour.respond(e);
            });

        var existingCcContacts = $.parseJSON(
            me.$root.find('#_recipientsCC').val()
        );
        var ccParties = [];
        $.each(existingCcContacts, function (i, v) {
            ccParties.push(v);
        });

        me.$root.find('#CcContactIds').autoSuggest(contactsAutoSuggestData, {
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
                me.$root.find('.contactASList').validationEngine('hide');
                me.checkEmailAddresses();
                me.checkConsents();
            },
            selectionRemoved: function (elem) {
                //Remove element.
                elem.remove();
                me.checkConsents();
            },
            formatList: function (data, elem) {
                return gmgps.cloud.helpers.general.formatAutoSuggestItem(data, elem);
            }
        })
            .on('keydown', function (e) {
                var behaviour = new TabInputBehaviour(this);
                behaviour.respond(e);
            });

        // Setup Recent Autocomplete
        me.setupRecipientAC(me.$root.find('.dccontactlist .as-selections'));
        me.setupRecipientAC(me.$root.find('.cccontactlist .as-selections'));

        //hide attachment pane if we don't have any
        if (me.$root.find('.attachments .attachment').length == 0) {
            me.$root.find('.attachments').hide();
        }

        setupTips(me.$root);
        me.setupPropertyAC();

        const copyToClipboard = (str) => {
            const el = document.createElement('textarea');
            var singleBrRegex = /<br\s*[/]?>/gi;
            const singleSpace  = '\r\n';
            var parsedStr = str.replace(
                singleBrRegex,
                singleSpace // This replaces <br> with one space
            );
            
            el.value = parsedStr;
            document.body.appendChild(el);
            el.select();
            document.execCommand('copy');
            document.body.removeChild(el);
        };

        const indicateSuccessfulCopy = (e) => {
            // indicate that the copy worked using an animated text change of the element
            e.fadeOut(function () {
                $(this).html('Copied');
            }).fadeIn(function () {
                $(this)
                    .fadeOut(function () {
                        $(this).html('Copy To Clipboard');
                    })
                    .fadeIn();
            });
        };

        me.$root.find('#para-select').on('click', function () {
            var selectedOption = me.$root
                .find('.emailpara')
                .children('option:selected')
                .val();
            copyToClipboard(selectedOption);

            var btnText = $(this).find('.btn-content');

            indicateSuccessfulCopy(btnText);
        });

        me.$root.on('click', '.as-close', function () {
            $(this).closest('li').remove();
            me.checkConsents();
        });

        $.each(existingContacts, function (i, v) {
            if (me.$root.find("li[data-value='" + v.id + "']")) {
                me.$root
                    .find("li[data-value='" + v.id + "']")
                    .css('padding-right', '5px');
            }
        });
        me.setupHelpLink();
        me.showTemplateSelection();
        new gmgps.cloud.ui.views.fileUploaderFromComputer(
            $('.upload-file').attr('id'),
            me.getContactsFromToRecipients,
            me.attachmentBrowser
        );
    },

    getContactsFromToRecipients: () => {
        var contacts = [];
        var row, id;
        var recipients = $('.row[data-type=email] .recipient');
        for (var i = 0; i < recipients.length; i++) {
            row = recipients[i];
            if (
                $(row).closest('.row').find('.recipientType').val() == 'Contact'
            ) {
                id = $(row).closest('.row').find('.recipientId').val();
                if (id > 0) {
                    contacts.push({ id: id });
                }
            }
        }

        recipients = $('.contactASList li');
        for (var j = 0; j < recipients.length; j++) {
            row = recipients[j];
            if ($(row).find('.as-values').length > 1) {
                id = $(row).find('.as-values')[0].val().replace(',', '');
                if (id > 0) {
                    contacts.push({ id: id });
                }
            } else {
                id = $(row).attr('data-value');
                if (id > 0) {
                    contacts.push({ id: id });
                }
            }
        }

        return contacts;
    },

    setupHelpLink: function () {
        var me = this;
        //Inject link into title bar.
        me.$helpLink = $(
            '<div class="branding" title="Help...">What\'s this<i class="ml7 fa fa-info-circle fa-lg"></i></div>'
        );
        me.$window.find('.top').append(me.$helpLink);

        //link > Click
        me.$helpLink.on('click', function () {
            // open link to support page.  It's confirmed that this url is static and will not change
            window.open(me.emailHelpUrl);
        });
    },

    checkConsents: function () {
        var me = this;

        var binding = new gmgps.cloud.ui.binding.ConsentMessageBinding(
            '.contactASList li.as-selection-item',
            me.$root
        );
        binding.activate(['general-marketing', 'property-matching']);
    },

    checkEmailAddresses: function () {
        var me = this;

        //warn if we have a contact provided but they do not have an email address
        var missingAddress = false;
        var recipients = $('.row[data-type=email] .recipient');
        for (var i = 0; i < recipients.length; i++) {
            var row = recipients[i];
            if (
                $(row).closest('.row').find('.recipientType').val() ==
                    'Contact' &&
                $(row).closest('.row').find('.recipientId').val() > 0 &&
                $(row).val() == ''
            ) {
                missingAddress = true;
            }
        }

        $('.contactASList li.as-selection-item').each(function (i, v) {
            var isMissingOrNullEmailAddress =
                $(v).attr('data-udf2') == '' ||
                $(v).attr('data-udf2') == 'null';

            if ($(v).attr('data-udf2').indexOf('@') < 1) missingAddress = true;

            if (
                isMissingOrNullEmailAddress ||
                $(v).attr('data-udf2').length < me.minimumEmailLength
            )
                missingAddress = true;
        });

        if (missingAddress) {
            if (!me.isShowingEmailMissingInfo) {
                me.isShowingEmailMissingInfo = true;
                showInfo(
                    'One or more of the intended contact recipients does not have an email address, you can type it in now to use just this once or edit the contact to add an email address that will be saved for future use.',
                    'Information',
                    10000,
                    function () {
                        me.isShowingEmailMissingInfo = false;
                    }
                );
            }
            return false;
        }

        return true;
    },

    setupRecipientAC: function ($e) {
        var me = this;

        //set up ac
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
                    '<li class="as-selection-item blur" data-value="{0}" data-udf2="{1}" data-modeltype="2"><a class="as-close"></a>{2}</li>'.format(
                        args.id,
                        args.udf2,
                        args.udf6
                    )
                ).attr('data-consents', JSON.stringify(args.consents));

                args.$e.find('.as-original').before(newSelectionItem);

                me.checkConsents();

                return false; //so we get to decide what to set thet value of the input to
            },
            onRemoved: function () {}
        }).off('keyup keydown keypress input');
    },

    reindexRecipients: function ($form) {
        var reindex = function (inputs) {
            var subscript = 0;
            //old logic to iterate through the inputs
            inputs.each(function (inputIndex, value) {
                if ($(value).val().length > 0) {
                    var name = $(value).attr('name');
                    name = name.replace('[]', '[' + subscript + ']');
                    $(value).attr('name', name);
                    subscript++;
                }
            });
            //new logic to iterate through the listitems
            inputs.each(function (inputIndex, value) {
                if ($(value).val().length > 0) {
                    var name = $(value).attr('name');
                    name = name.replace('[]', '[' + subscript + ']');
                    $(value).attr('name', name);
                    subscript++;
                }
            });
        };

        var $row = $form.find('.row[data-type="email"]');
        reindex($row.find('input.recipient'));
        reindex($row.find('input.recipientType'));
        reindex($row.find('input.recipientId'));
        reindex($row.find('input.recipientProtocol'));
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
    },

    sendEmail: function (callback) {
        var me = this;

        me.$window.find('.action-button').lock();

        if (me.$root.find('.contactASList li.as-selection-item').length == 0) {
            showInfo('Please select a recipient');
            me.$window.find('.action-button').unlock();
            return false;
        }

        if (me.checkEmailAddresses() == false) {
            me.$window.find('.action-button').unlock();
            return false;
        }

        me.reindexAttachments(me.$root);

        var emailForm = createForm(me.$root, '/email/sendemail');

        var createRecipients = function (selector, elementName) {
            var userIndex = 0;
            emailForm
                .find(selector + ' li.as-selection-item')
                .each(function (i, v) {
                    var id = parseInt($(v).attr('data-value'));
                    emailForm.append(
                        '<input type="hidden" name="{2}[{0}].Id" value="{1}" />'.format(
                            userIndex,
                            id,
                            elementName
                        )
                    );
                    var udf1 = $(v).attr('data-udf1');
                    if (udf1) {
                        emailForm.append(
                            '<input type="hidden" name="{2}[{0}].udf1" value="{1}" />'.format(
                                userIndex,
                                udf1,
                                elementName
                            )
                        );
                    }
                    var udf2 = $(v).attr('data-udf2');
                    if (udf2) {
                        emailForm.append(
                            '<input type="hidden" name="{2}[{0}].udf2" value="{1}" />'.format(
                                userIndex,
                                udf2,
                                elementName
                            )
                        );
                        emailForm.append(
                            '<input type="hidden" name="{2}[{0}].value" value="{1}" />'.format(
                                userIndex,
                                udf2,
                                elementName
                            )
                        );
                    }
                    userIndex++;
                });

            // mop-up un-inserted email address
            emailForm
                .find(selector + ' li.as-original input[type="text"]')
                .each(function (i, v) {
                    var udf2 = $(v).val();
                    if (udf2 && udf2.length > 0) {
                        emailForm.append(
                            '<input type="hidden" name="{2}[{0}].Id" value="{1}" />'.format(
                                userIndex,
                                0,
                                elementName
                            )
                        );
                        emailForm.append(
                            '<input type="hidden" name="{2}[{0}].udf2" value="{1}" />'.format(
                                userIndex,
                                udf2,
                                elementName
                            )
                        );
                        emailForm.append(
                            '<input type="hidden" name="{2}[{0}].value" value="{1}" />'.format(
                                userIndex,
                                udf2,
                                elementName
                            )
                        );
                        userIndex++;
                    }
                });
        };

        //Build To recipients.
        createRecipients('.dccontactlist', 'RecipientSuggestions');
        //Build CC recipients.
        createRecipients('.cccontactlist', 'CCRecipientSuggestions');

        var emailToBeQueued = me.$root.find('#PlaceOnQueue').val() === 'True';
        var mailSentMessage = emailToBeQueued
            ? 'Email queued for delivery'
            : 'Email sent';
        var mailNotSentMessage = 'E-Mail Not Sent';

        me.sendEventEmailSent(me.checkIfBlankTemplate());

        me.http.postForm(
            emailForm,
            function (response) {
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
                    if (callback) {
                        callback(false);
                    }
                }
            },
            function (response) {
                me.$window.find('.action-button').unlock();
                $.jGrowl(response, {
                    header: mailNotSentMessage,
                    theme: 'growl-overdue'
                });
                if (callback) {
                    callback(true);
                }
            }
        );

        return false;
    },

    cancel: function (onComplete) {
        var me = this;
        me.$root.find('form').validationEngine('hideAll');

        me.sendEventCancel();

        onComplete(false);
    },

    destroy: function () {
        var me = this;
        me.$root.empty().unbind();
    },

    setupPropertyAC: function () {
        var me = this;

        me.$root.find('div.add-brochure-button').hide();

        me.$root.find('.property-ac').autoCompleteEx({
            modelType: C.ModelType.Property,
            search: {
                StatusIdList: [
                    C.SaleStatus.Available,
                    C.SaleStatus.UnderOffer,
                    C.SaleStatus.UnderOfferMarketing,
                    C.SaleStatus.UnderOfferAvailable,
                    C.SaleStatus.Instructed,
                    C.SaleStatus.Appraisal,
                    C.SaleStatus.Exchanged,
                    C.SaleStatus.Completed,
                    C.RentStatus.Available,
                    C.RentStatus.UnderOffer,
                    C.RentStatus.Let,
                    C.RentStatus.LetAgreed,
                    C.RentStatus.LetMarketing,
                    C.RentStatus.Instructed,
                    C.RentStatus.Appraisal
                ],
                ApplyFurtherFilteringtoIds: true
            },
            placeholder: 'Search for Property...',
            onSelected: function (args) {
                me.$root.find('#PropertyId').val(args.id);
                me.$root.find('div.add-brochure-button').show();

                var $subject = me.$root.find('#Subject');
                var subject = $subject.val() + " - " + args.udf9;
                $subject.val(subject);
           },
            onBeforeRemoved: function (id, callback, $picker) {
                var $subject = me.$root.find('#Subject');
                var address = $picker.attr('data-udf9');
                var subject = $subject.val().replace(' - ' + address, '');
                $subject.val(subject);

                callback();
            },
            onRemoved: function () {
                me.$root.find('#PropertyId').val('0');
                me.$root.find('div.add-brochure-button').hide();
            }
        });
    },

    selectRecipientAddress: function (sender) {
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
                onCancel: function () {}
            });
        } else
            showInfo(
                'Please select a recipient first, in order to choose an address.'
            );
    },

    // eslint-disable-next-line no-unused-vars
    saveHtml: function (json, html, beeTemplateId) {
        var me = this;

        me.$root.find('#Body').val(html);

        me.sendEmail(function () {
            me.closeMyWindow();
        });
    },

    initBeeEditor: function () {
        var me = this;
        var uid = me.$root.find('#Uid').val();

        me.beePlugin = new gmgps.cloud.integration.BeePluginGateway(
            me.$root.get(0).ownerDocument,
            {
                templateId: me.templateId,
                populateMergeCodes: me.populateMergeCodes,
                uid: uid,
                containerId: me.beePluginContainerId,
                helpUrl: me.emailHelpUrl,
                roleHash: '1a3f89dk0e01kffj92',
                onSave: function (json, html, beeTemplateId) {
                    me.saveHtml(json, html, beeTemplateId);
                },
                onChange: function () {
                    //me.setDirty(true);
                },
                onLoad: function () {
                    me.resizeBeePluginHeight();
                }
            }
        );

        me.beePlugin.load();
    },

    moveWindow: function (moveUpPercent) {
        var me = this;
        var moveUpPixels = 0;

        if (moveUpPercent) {
            moveUpPixels = ($(window).height() / 100) * moveUpPercent;
        }

        var newTop =
            $(window).height() / 2 - me.$window.height() / 2 - moveUpPixels;

        // set a minimum to stop the modal going off the screen
        newTop = newTop < 0 ? 10 : newTop;

        me.$window.css('top', newTop);
    },

    showEmailModal: function () {
        var me = this;

        me.initBeeEditor();
        me.beePlugin.loadTemplate(me.templateId, me.subject);

        me.$window.find('.template-panel').hide();
        me.$window.find('.next-button').hide();
        me.$window.find('.back-button').show();
        me.$window.find('.action-button').show();
        me.$window.find('.email-form').show();
        me.$window
            .find('.title')
            .replaceWith(
                '<div class="title">Send an email (step 2 of 2)</div>'
            );
        me.moveWindow(me.cfg.windowConfiguration.percentHigher);
        me.setupAccordion();
        me.displayPendo();
    },

    showTemplateSelection: function () {
        var me = this;

        me.$window.find('.back-button').hide();
        me.$window.find('.action-button').hide();
        me.$window.find('.email-form').hide();
        me.$window.find('.next-button').show();
        me.$window.find('.template-panel').show();
        me.$window
            .find('.title')
            .replaceWith(
                '<div class="title">Select an ad-hoc email template (step 1 of 2)</div>'
            );
        me.moveWindow(me.cfg.windowConfiguration.percentHigher);
    },

    action: function (callback, $btn) {
        $btn.lock();

        var me = this;

        me.beePlugin.save();
    },

    back: function () {
        var me = this;

        var showDialogFunc;

        if (window.parent === window) {
            showDialogFunc = showDialog;
        } else {
            showDialogFunc = window.parent.showDialog;
        }

        showDialogFunc({
            type: 'warning',
            title: '',
            msg: 'Are you sure you want to go back to select a different template? You will lose any changes you have made in this step.',
            buttons: {
                Yes: function () {
                    $(this).dialog('close');
                    me.sendEventBack();
                    me.showTemplateSelection();
                },
                No: function () {
                    $(this).dialog('close');
                }
            }
        });

        return false;
    },

    sendEventChangeTemplate: function (isBlankTemplate) {
        var me = this;
        var label = isBlankTemplate ? 'blank' : 'template';

        googleAnalytics.sendEvent(
            me.cfg.windowConfiguration.category +
                '.' +
                me.cfg.windowConfiguration.windowId,
            'change',
            label
        );
    },

    sendEventCancel: function () {
        var me = this;

        googleAnalytics.sendEvent(
            me.cfg.windowConfiguration.category +
                '.' +
                me.cfg.windowConfiguration.windowId,
            'click',
            'cancel'
        );
    },

    sendEventBack: function () {
        var me = this;

        googleAnalytics.sendEvent(
            me.cfg.windowConfiguration.category +
                '.' +
                me.cfg.windowConfiguration.windowId,
            'click',
            'back'
        );
    },

    sendEventUseTheTemplate: function (isBlankTemplate) {
        var me = this;
        var label = isBlankTemplate ? 'blank' : 'template';

        googleAnalytics.sendEvent(
            me.cfg.windowConfiguration.category +
                '.' +
                me.cfg.windowConfiguration.windowId,
            'use_the_template_click',
            label
        );
    },

    sendEventChangeTemplateSelection: function () {
        var me = this;
        me.wasAdhocTemplateSelectionUsed = true;

        googleAnalytics.sendEvent(
            me.cfg.windowConfiguration.category +
                '.' +
                me.cfg.windowConfiguration.windowId,
            'click',
            'change'
        );
    },

    sendEventEmailSent: function (isBlankTemplate) {
        var me = this;
        var label = isBlankTemplate ? 'blank' : 'template';

        googleAnalytics.sendEvent(
            me.cfg.windowConfiguration.category +
                '.' +
                me.cfg.windowConfiguration.windowId,
            'email_send_click',
            label
        );
    },

    checkIfBlankTemplate: function () {
        var me = this;
        var selectedOption = $(
            'option:selected',
            me.$root.find('select.template-selector')
        );

        return selectedOption.data('blank-template');
    },

    calculateBeePluginHeightInPx: function (includingToolbar) {
        var detailsHeight = $('#details-container').height();
        var attachmentsHeight = $('#attachments-container').height();
        var consentHeight =
            $('#consent-container').height() < 48
                ? 48
                : $('#consent-container').height();
        var beeToolbarHeight = $('#bee-plugin-toolbar').height();
        // 170 is the size of the window bar, bottom button bar and margins
        var contentHeight =
            170 +
            attachmentsHeight +
            consentHeight +
            detailsHeight +
            beeToolbarHeight;
        if (includingToolbar) {
            contentHeight -= beeToolbarHeight;
        }
        return 'calc(100vh - ' + Math.ceil(contentHeight) + 'px)';
    },

    resizeBeePluginHeight: function () {
        var me = this;
        var heightContainer = me.calculateBeePluginHeightInPx(true);
        $('#bee-container').css('height', heightContainer);
        var height = me.calculateBeePluginHeightInPx(false);
        $('#' + me.beePluginContainerId).css('height', height);
        $('#' + me.beePluginContainerId + ' iframe').css('height', height);
    },

    setupAccordion: function () {
        var me = this;
        $('#details-container').accordion({
            collapsible: true,
            activate: function () {
                me.resizeBeePluginHeight();
            },
            create: function () {
                me.resizeBeePluginHeight();
            }
        });
    },

    displayPendo: function () {
        // eslint-disable-next-line no-undef
        pendo.showGuideByName(
            'Feature release | Email template - details accordion'
        );
    }
};
