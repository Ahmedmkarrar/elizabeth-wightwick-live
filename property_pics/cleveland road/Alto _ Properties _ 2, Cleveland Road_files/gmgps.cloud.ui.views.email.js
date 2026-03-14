gmgps.cloud.ui.views.email = function (args) {
    var me = this;
    me.cfg = args;
    me.$root = args.$root;
    me.$emailEditor = null;
    me.http = args.http || new gmgps.cloud.http("email-email");
    me.minimumEmailLength = 8;
    me.isShowingEmailMissingInfo = false;
    me.init(args);

    return this;
};

gmgps.cloud.ui.views.email.typeName = 'gmgps.cloud.ui.views.email';

gmgps.cloud.ui.views.email.prototype = {
    init: function (args) {
        var me = this;
        me.$window = me.$root.closest('.window');

        me.attachmentBrowser = new gmgps.cloud.ui.controls.AttachmentBrowser({
            container: me.$root
        });

        me.$root.find('select').customSelect();

        me.$emailEditor = me.$root.find('#Body').cleditor({
            height: 250,
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
            // we want to check if it happens that we are in tenancy dashboard
            const hash =  window.location.hash;
            let tenancyId = null;
            const match = hash.match(/#tenancies\/(\d+)\/overview/);
            if (match) {
                tenancyId = match[1];
            } 
            
            var propertyId = me.$root.find('#PropertyId').val();
            var contacts = [];

            var row, id;

            var recipients = $('.row[data-type=email] .recipient');
            for (var i = 0; i < recipients.length; i++) {
                row = recipients[i];
                if (
                    $(row).closest('.row').find('.recipientType').val() ==
                    'Contact'
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

        me.setupRecipientAC(me.$root.find('.dccontactlist .as-selections'));
        me.setupRecipientAC(me.$root.find('.cccontactlist .as-selections'));

        //hide attachment pane if we don't have any
        if (me.$root.find('.attachments .attachment').length == 0) {
            me.$root.find('.attachments').hide();
        }

        setupTips(me.$root);
        me.setupPropertyAC();

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

        const modifyBody = (body) => {
            me.$root.find('#Body').val(body);
            me.$emailEditor[0].updateFrame();
        };
        const modifySubject = (subject) => {
            me.$root.find('#Subject').val(subject);
            me.$emailEditor[0].updateFrame();
        };

        me.cfg.windowConfiguration.initialBody &&
            modifyBody(me.cfg.windowConfiguration.initialBody);
        me.cfg.windowConfiguration.initialSubject &&
            modifySubject(me.cfg.windowConfiguration.initialSubject);
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

    action: function (callback) {
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

        if (typeof googleAnalytics === 'object' && googleAnalytics !== null) {
            googleAnalytics.sendEvent(
                me.cfg.windowConfiguration.category +
                    '.' +
                    me.cfg.windowConfiguration.windowId,
                'button_click',
                'save'
            );
        }

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
        onComplete(false);

        if (typeof googleAnalytics === 'object' && googleAnalytics !== null) {
            googleAnalytics.sendEvent(
                me.cfg.windowConfiguration.category +
                    '.' +
                    me.cfg.windowConfiguration.windowId,
                'button_click',
                'cancel'
            );
        }
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
                    C.RentStatus.Available,
                    C.RentStatus.UnderOffer,
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
    }
};

gmgps.cloud.ui.views.sms = function (args) {
    var me = this;
    me.cfg = args;
    me.$root = args.$root;
    me.http = new gmgps.cloud.http("email-sms");

    me.$branchCheckbox = me.$root.find('#BrandSignOff');
    me.$userCheckbox = me.$root.find('#NegotiatorSignOff');
    me.$body = me.$root.find('textarea');
    me.$branchName = me.$root.find('#BrandName');
    me.$userName = me.$root.find('#NegotiatorName');

    me.init(args);

    return this;
};

gmgps.cloud.ui.views.sms.prototype = {
    getSig: function () {
        var me = this;

        var user = me.$userName.val();
        var branch = me.$branchName.val();

        var sig = '';

        if (me.$userCheckbox.prop('checked')) sig += user;

        if (me.$branchCheckbox.prop('checked'))
            if (me.$userCheckbox.prop('checked')) sig += ', ' + branch;
            else sig += branch;

        me.sig = sig;

        return sig;
    },

    init: function () {
        var me = this;

        me.$root.find('select').customSelect();

        me.getSig();
        me.updateTextAreaCounter();
        me.checkConsents();

        me.$root.find('.inline-search')._inlineSearch({
            type: 'contact',
            color: 'red',
            defaultText: 'Search contacts or enter mobile number...',
            allowRAF: true,
            allowEdit: false,
            smsMode: true,
            allowCreate: false,
            $groupContainer: me.$root,
            $resultsContainer: null,
            $editContainer: me.$root.find('.mini-contact-form'),
            inputClicked: function () {},
            itemClicked: function () {},
            rafClicked: function () {},
            createClicked: function () {},
            onSelectionChanged: function () {}
        });

        //Brand --> Changed
        me.$root.on('change', '#SenderDisplayName', function () {
            me.$root.find('#BranchName').val($(this).text());
            me.getSig();
            me.updateTextAreaCounter();
        });

        //Reset the sig if either element is checked/unchecked.
        me.$branchCheckbox.on('change', function () {
            me.getSig();
            me.updateTextAreaCounter();
            if ($(this).prop('checked'))
                me.$branchName.removeClass('disabled').attr('disabled', false);
            else me.$branchName.addClass('disabled').attr('disabled', true);
        });
        me.$userCheckbox.on('change', function () {
            me.getSig();
            me.updateTextAreaCounter();
            if ($(this).prop('checked'))
                me.$userName.removeClass('disabled').attr('disabled', false);
            else me.$userName.addClass('disabled').attr('disabled', true);
        });
        me.$userName.on('keyup', function () {
            me.getSig($(this).val());
            me.updateTextAreaCounter();
        });
        me.$branchName.on('keyup', function () {
            me.getSig();
            me.updateTextAreaCounter();
        });

        me.$root.find('textarea').bind('keyup', function () {
            me.updateTextAreaCounter();
            return false;
        });

        me.$root.on('ticked', '.recipients .tickbox', function () {
            me.checkConsents();
        });

        me.$body.focus();
    },

    checkConsents: function () {
        var me = this;

        var binding = new gmgps.cloud.ui.binding.ConsentMessageBinding(
            '.recipients.row .tickbox.ticked',
            me.$root
        );
        binding.activate(['general-marketing', 'property-matching']);
    },

    updateTextAreaCounter: function () {
        var me = this;

        me.$root.find('.barbox').show();

        var text_area_box = me.$body.val(); //Get the values in the textarea
        var max_numb_of_words = 160;
        var main = (text_area_box.length + me.sig.length) * 100;

        var value = main / max_numb_of_words;
        var count = max_numb_of_words - (text_area_box.length + me.sig.length);

        if (text_area_box.length <= max_numb_of_words) {
            me.$root.find('.progressbar').css('background-color', '#5fbbde');
            me.$root.find('.count').html(count);
            me.$root.find('.progressbar').animate(
                {
                    width: value + '%'
                },
                1
            );
        } else {
            me.$root.find('.progressbar').css('background-color', 'red');
            $(this).val(text_area_box.substr(0, max_numb_of_words));
        }
    },

    action: function (onComplete) {
        var me = this;

        if (me.$root.find('.recipientPhone:checked').length == 0) {
            showInfo('Please select a recipient');
            return false;
        }

        var $form = me.$root.find('form').clone();
        var formHtml = me.$root.find('form').formhtml();
        $form.html(formHtml);

        //Post data to server.
        me.http.ajax(
            {
                args: $form.serialize(),
                dataType: 'json',
                type: 'post',
                url: $form.attr('action')
            },
            function () {
                $.jGrowl('', { header: 'SMS Sent', theme: 'growl-system' });
                if (onComplete) {
                    onComplete(true);
                }
            },
            function () {
                $.jGrowl('', { header: 'SMS Not Sent', theme: 'growl-system' });
                if (onComplete) {
                    onComplete(false);
                }
            }
        );
    },

    cancel: function (onComplete) {
        onComplete(false);
    },

    destroy: function () {
        var me = this;
        me.$root.empty().unbind();
    }
};
