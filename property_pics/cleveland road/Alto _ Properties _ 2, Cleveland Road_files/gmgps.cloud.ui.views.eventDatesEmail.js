gmgps.cloud.ui.views.eventDatesEmail = function (args) {
    var me = this;
    me.cfg = args;
    me.$root = args.$root;
    me.$window = null;

    me.init(args);

    return this;
};

gmgps.cloud.ui.views.eventDatesEmail.typeName =
    'gmgps.cloud.ui.views.eventDatesEmail';

gmgps.cloud.ui.views.eventDatesEmail.prototype = {
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

        var recipients = [];

        me.$root.find('.as-selections li').each(function (i, v) {
            var $row = $(v);

            var recipient = {
                followUpId: $row.attr('data-followupid'),
                email: $row.attr('data-emailaddress'),
                contactId: parseInt($row.attr('data-contactId')),
                type: parseInt($row.attr('data-recipient-type')),
                name: $row.attr('data-recipient-name')
            };

            recipients.push(recipient);
        });

        var $clEditor = me.$root.find('.html-editor').cleditor()[0];

        var request = {
            subject: me.$root.find('.email-subject').val(),
            messageBody: $clEditor.$area.val(),
            recipients: recipients,
            eventDateModelType:
                me.cfg.windowConfiguration.urlArgs.settings.EventModelType
        };

        new gmgps.cloud.http("eventDatesEmail-send").ajax(
            {
                args: request,
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/EventDatesEmail/SendEmail'
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
    }
};
