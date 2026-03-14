gmgps.cloud.ui.views.mailMessagerWithTemplate = function (args) {
    var me = this;
    me.cfg = args;
    me.$root = args.$root;
    me.$window = null;
    me.templateId = 0;
    me.closeMyWindow = args.closeMyWindow;
    me.populateMergeCodes = true;
    me.beePluginContainerId = 'bee-plugin-messager-container';
    me.emailHelpUrl = me.$root.find('#EmailHelpUrl').val();
    me.beePlugin = null;
    me.init(args);
    // Atm GA that template was changed from drop down should be pushed only once
    me.wasAdhocTemplateSelectionUsed = false;

    return this;
};

gmgps.cloud.ui.views.mailMessagerWithTemplate.typeName =
    'gmgps.cloud.ui.views.mailMessagerWithTemplate';

gmgps.cloud.ui.views.mailMessagerWithTemplate.prototype = {
    init: function () {
        var me = this;

        me.$window = me.$root.closest('.window');

        me.$window.find('.middle .content').css('overflow-y: scroll');

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
            if (!me.wasAdhocTemplateSelectionUsed) {
                me.sendEventChangeTemplateSelection();
            }
        });

        var templateSelector = me.$root.find('select.template-selector');
        var defaultTemplateId = me.$root.find('input#DefaultTemplateId').val();
        templateSelector.val(defaultTemplateId);
        me.templateId = defaultTemplateId;

        templateSelector.customSelect();

        me.$window
            .find('.bottom .buttons .action-button')
            .removeClass('grey')
            .addClass('bgg-red');

        me.$window.find('.bottom .buttons .cancel-button').css('float', 'left');

        me.$root.on('click', '.add-attachment-button', function () {
            var contacts = me.getContactsFromToRecipients();
            var property = {
                id: me.$root.find('input#PropertyId').val()
            };
            me.attachmentBrowser.open(contacts, property);
        });

        me.setupPropertyAC();

        me.$root.on('click', '.delete-attachment-button', function () {
            $(this).closest('.attachment').remove();

            if (me.$root.find('.attachments .attachment').length == 0) {
                me.$root.find('.attachments').hide();
            }
        });

        //hide attachment pane if we don't have any
        if (me.$root.find('.attachments .attachment').length == 0) {
            me.$root.find('.attachments').hide();
        }

        me.attachmentBrowser = new gmgps.cloud.ui.controls.AttachmentBrowser({
            container: me.$root
        });
        me.checkConsents();
        me.showTemplateSelection();
        new gmgps.cloud.ui.views.fileUploaderFromComputer(
            $('.upload-file').attr('id'),
            me.getContactsFromToRecipients,
            me.attachmentBrowser
        );
    },

    getContactsFromToRecipients: () => {
        var contacts = [];
        var recipients = $('ul.as-selections li.as-selection-item');
        for (var i = 0; i < recipients.length; i++) {
            var row = recipients[i];
            var id = parseInt($(row).attr('data-contactid'));
            var name = $(row).attr('data-recipient-name');
            if (id > 0) {
                contacts.push({ id: id, name: name });
            }
        }
        return contacts;
    },

    checkConsents: function () {
        var me = this;

        var binding = new gmgps.cloud.ui.binding.ConsentMessageBinding(
            '.as-selections li.as-selection-item',
            me.$root
        );
        binding.activate(['general-marketing', 'property-matching']);
    },

    action: function (callback, $btn) {
        $btn.lock();

        var me = this;

        if (!me.validate()) {
            $btn.unlock();
            return false;
        }

        me.beePlugin.save();
    },

    validate: function () {
        var me = this;

        var isValid = true;

        if (me.$root.find('.email-subject').val().length == 0) {
            showInfo('Please supply a subject for the email');
            return false;
        }

        if (me.$root.find('.as-selections li').length == 0) {
            showInfo('There are no recipients for the email');
            return false;
        }

        return isValid;
    },

    cancel: function () {
        var me = this;
        me.sendEventCancel();
    },

    sendEmail: function (callback) {
        var me = this;

        var html = me.$root.find('#Body').val();

        var request = {
            Subject: me.$root.find('.email-subject').val(),
            OriginatingEventId: parseInt(
                me.$root.find('#OriginatingEventId').val()
            ),
            OriginatingEventCategory: me.$root
                .find('#OriginatingEventCategory')
                .val(),
            MessageBody: html,
            PropertyId: me.$root.find('#PropertyId').val(),
            UpdateLastContactedDate: me.$root
                .find('#UpdateLastContactedDate')
                .is(':checked'),
            Recipients: [],
            Attachments: [],
            IsBeeDocument: me.$root.find('#IsBeeDocument').val(),
            EmailCreationMethod: me.$root.find('#EmailCreationMethod').val(),
            DocumentTemplateId: parseInt(
                me.$root.find('#bee-template-id').val()
            )
        };

        me.$root.find('.as-selections li').each(function (i, v) {
            var $row = $(v);

            var recipient = {
                contactId: parseInt($row.attr('data-contactId')),
                recipientType: parseInt($row.attr('data-recipient-type')),
                recipientName: $row.attr('data-recipient-name'),
                emailAddress: $row.attr('data-emailaddress')
            };

            request.Recipients.push(recipient);
        });

        me.$root.find('.attachments .attachment').each(function (ix, el) {
            var $row = $(el);

            var attachment = {
                displayName: $row.find('input.attachmentName').val(),
                category: $row.find('input.attachmentCategory').val(),
                modelTypeId: parseInt(
                    $row.find('input.attachmentTypeId').val()
                ),
                fileTypeId: parseInt(
                    $row.find('input.attachmentFileTypeId').val()
                ),
                linkedIds: [],
                templateId: parseInt(
                    $row.find('input.attachmentTemplate').val()
                )
            };

            var linkedIds = $row.find('input.attachmentIds').val();
            $.each(linkedIds.split(','), function (i, item) {
                attachment.linkedIds.push(parseInt(item));
            });

            request.Attachments.push(attachment);
        });

        me.sendEventEmailSent(me.checkIfBlankTemplate());

        new gmgps.cloud.http("mailMessagerWithTemplate-sendEmail").ajax(
            {
                args: request,
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/Comms/SendMailMessages'
            },
            function () {
                $.jGrowl('E-mail Request Generated', {
                    header: 'Message Queued For Delivery',
                    theme: 'growl-updater growl-system',
                    life: 2000
                });
                if (callback) {
                    callback(false);
                }
            },
            function () {
                $.jGrowl('E-mail Request Not Generated', {
                    header: 'Message Not Sent',
                    theme: 'growl-overdue',
                    life: 2000
                });
                if (callback) {
                    callback(true);
                }
            }
        );
    },

    reindexAttachments: function () {
        var me = this;
        var subscript = 0;
        var $row = me.$root.find('.attachment');

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

    setupPropertyAC: function () {
        var me = this;

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
            },
            onRemoved: function () {
                me.$root.find('#PropertyId').val('0');
            }
        });
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

    // eslint-disable-next-line no-unused-vars
    saveHtml: function (json, html, beeTemplateId) {
        var me = this;

        console.debug('parse HTML...');
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
                    console.debug('save HTML...');
                    me.saveHtml(json, html, beeTemplateId);
                },
                onChange: function () {
                    //me.setDirty(true);
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
        me.beePlugin.loadTemplate(me.templateId);

        me.$window.find('.template-panel').hide();
        me.$window.find('.next-button').hide();
        me.$window.find('.back-button').show();
        me.$window.find('.action-button').show();
        me.$window.find('.email-content').show();
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
        me.$window.find('.email-content').hide();
        me.$window.find('.next-button').show();
        me.$window.find('.template-panel').show();
        me.$window
            .find('.title')
            .replaceWith(
                '<div class="title">Select an ad-hoc email template (step 1 of 2)</div>'
            );
        me.moveWindow(me.cfg.windowConfiguration.percentHigher);
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

    setupAccordion: function () {
        $('#details-container').accordion({
            collapsible: true,
            activate: function (event, ui) {
                var height = ui.oldHeader.size()
                    ? 'calc(100vh - 300px)'
                    : 'calc(100vh - 430px)';

                $('#bee-container').css('height', height);

                var frame = $('#bee-plugin-messager-container iframe');
                //frame.attr("height", height);
                frame.css('height', height);
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
