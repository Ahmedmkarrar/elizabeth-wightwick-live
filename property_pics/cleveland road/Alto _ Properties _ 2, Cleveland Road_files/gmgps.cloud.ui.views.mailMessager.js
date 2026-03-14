gmgps.cloud.ui.views.mailMessager = function (args) {
    var me = this;
    me.cfg = args;
    me.$root = args.$root;
    me.$window = null;

    me.init(args);

    return this;
};

gmgps.cloud.ui.views.mailMessager.typeName =
    'gmgps.cloud.ui.views.mailMessager';

gmgps.cloud.ui.views.mailMessager.prototype = {
    init: function () {
        var me = this;

        me.$window = me.$root.closest('.window');

        me.$window
            .find('.bottom .buttons .action-button')
            .removeClass('grey')
            .addClass('bgg-red');

        me.$window.find('.bottom .buttons .cancel-button').css('float', 'left');

        me.$root
            .find('.cleditorMain')
            .replaceWith('<textarea class="html-editor"></textarea>');
        me.setupHtmlEditor(me.$root.find('.html-editor'));

        me.$root.on('click', '.add-attachment-button', function () {
            var contacts = [];
            var property = {
                id: me.$root.find('input#PropertyId').val()
            };
            var recipients = $('ul.as-selections li.as-selection-item');
            for (var i = 0; i < recipients.length; i++) {
                var row = recipients[i];
                var id = parseInt($(row).attr('data-contactid'));
                var name = $(row).attr('data-recipient-name');
                if (id > 0) {
                    contacts.push({ id: id, name: name });
                }
            }

            var attachmentBrowser =
                new gmgps.cloud.ui.controls.AttachmentBrowser({
                    container: me.$root
                });

            attachmentBrowser.open(contacts, property);
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

        me.checkConsents();
    },

    checkConsents: function () {
        var me = this;

        var binding = new gmgps.cloud.ui.binding.ConsentMessageBinding(
            '.as-selections li.as-selection-item',
            me.$root
        );
        binding.activate(['general-marketing', 'property-matching']);
    },

    action: function (callback) {
        var me = this;

        if (!me.validate()) return false;

        if (typeof googleAnalytics === 'object' && googleAnalytics !== null) {
            googleAnalytics.sendEvent(
                me.cfg.windowConfiguration.category +
                    '.' +
                    me.cfg.windowConfiguration.windowId,
                'button_click',
                'save'
            );
        }

        me.send(callback);
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

        var $clEditor = me.$root.find('.html-editor').cleditor()[0];

        if ($clEditor.$area.val().length == 0) {
            showInfo('Please supply some content for the email');
            return false;
        }
        return isValid;
    },

    cancel: function () {
        var me = this;

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

    send: function () {
        var me = this;

        var $clEditor = me.$root.find('.html-editor').cleditor()[0];

        var request = {
            Subject: me.$root.find('.email-subject').val(),
            OriginatingEventId: parseInt(
                me.$root.find('#OriginatingEventId').val()
            ),
            OriginatingEventCategory: me.$root
                .find('#OriginatingEventCategory')
                .val(),
            MessageBody: $clEditor.$area.val(),
            PropertyId: me.$root.find('#PropertyId').val(),
            UpdateLastContactedDate: me.$root
                .find('#UpdateLastContactedDate')
                .is(':checked'),
            Recipients: [],
            Attachments: [],
            IsBeeDocument: me.$root.find('#IsBeeDocument').val(),
            EmailCreationMethod: me.$root.find('#EmailCreationMethod').val()
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

        //me.reindexAttachments();

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

        //Send messages.
        new gmgps.cloud.http("mailMessager-send").ajax(
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
            }
        );
    },

    setupHtmlEditor: function ($editor) {
        var $emailEditor = $editor.cleditor({
            height: 196,
            width: 585,
            controls:
                'bold italic underline strikethrough superscript | font size | ' +
                'color highlight | bullets | outdent ' +
                'indent | alignleft center | undo redo | ' +
                'link unlink | pastetext',
            colors:
                'FFF FCC FC9 FF9 FFC 9F9 9FF CFF CCF FCF ' +
                'CCC F66 F96 FF6 FF3 6F9 3FF 6FF 99F F9F ' +
                'BBB F00 F90 FC6 FF0 3F3 6CC 3CF 66C C6C ' +
                '999 C00 F60 FC3 FC0 3C0 0CC 36F 63F C3C ' +
                '666 900 C60 C93 990 090 399 33F 60C 939 ' +
                '333 600 930 963 660 060 366 009 339 636 ' +
                '000 300 630 633 330 030 033 006 309 303',
            fonts:
                'Segoe UI, Arial,Arial Black,Comic Sans MS,Courier New,Narrow,Garamond,' +
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
                '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">',
            docCSSFile: '',
            bodyStyle:
                'margin:4px; font:9pt Segoe UI,Arial,Verdana; cursor:text'
        });

        var ClEditorContextMenuActionsBehaviour =
            new gmgps.cloud.ui.behaviours.ClEditorContextMenuActionsBehaviour();

        ClEditorContextMenuActionsBehaviour.apply($emailEditor[0]);
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
    }
};
