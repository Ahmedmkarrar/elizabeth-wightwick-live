gmgps.cloud.ui.views.multiMessager = function (args) {
    var me = this;
    me.cfg = args;
    me.$root = args.$root;
    me.$window = null;

    me.init(args);

    return this;
};

gmgps.cloud.ui.views.multiMessager.typeName =
    'gmgps.cloud.ui.views.multiMessager';

gmgps.cloud.ui.views.multiMessager.prototype = {
    init: function () {
        var me = this;

        //UI Setup
        me.$root.find('select').customSelect();
        me.$window = me.$root.closest('.window');

        var eventTriggeredByAppraisalRequest = me.$root
            .find('#EventTriggeredByAppraisalRequest')
            .val();

        if (eventTriggeredByAppraisalRequest === 'True') {
            //As the request has come from PropertyFile we need to force the email sending
            //so we've prevented the un- ticking of the email tick box and disabled the cancel button

            me.$root.on(
                'click',
                '.email-control .tickbox .by-email',
                function (e) {
                    var checkbox = $(this);
                    if (!checkbox.is(':checked')) {
                        // do the confirmation thing here
                        e.preventDefault();
                        return false;
                    }
                }
            );

            me.$window
                .find('.bottom .buttons .cancel-button')
                .prop('disabled', true)
                .hide();
        }

        me.$window
            .find('.bottom .buttons .action-button')
            .removeClass('grey')
            .addClass('bgg-red');

        var smsCounter = new gmgps.cloud.ui.controls.CharacterCounter(
            160,
            false
        );
        smsCounter.apply(me.$root.find('.sms-content'));

        me.$root.find('select.opt-locked').each(function (i, v) {
            $(v).customSelect(true);
        });

        //Real-time rcpt-to updating on anonymous rows.
        me.$root.on('keyup', 'input.name', function () {
            var id = parseInt($(this).closest('.row').attr('data-id'));
            var val = $(this).val();
            me.$root
                .find('.output[data-id="{0}"] .rcpt-to'.format(id))
                .text(val);
        });

        //Items Row > Click
        me.$root.on('click', '.items .row', function () {
            me.selectRow($(this));
        });

        //Email/SMS Address > KeyUp (Auto Checking/Unchecking of email/sms options)
        me.$root.on(
            'keyup',
            '.email-cell input[type="text"], .phone-cell input[type="text"]',
            function () {
                var val = $(this).val();
                var $chk = $(this)
                    .closest('td')
                    .prev()
                    .find('input[type="checkbox"]');
                var on = $chk.prop('checked');
                var id = parseInt($(this).closest('.row').attr('data-id'));
                var type = $(this).attr('data-type');

                if (val == '' && on) {
                    //Ensure off.
                    $chk.prop('checked', false).trigger('prog-change');
                    me.$root
                        .find(
                            '.output[data-id="{0}"] .{1}-dbox'.format(id, type)
                        )
                        .disable('0.7');
                }

                if (val != '' && !on) {
                    //Ensure on.
                    $chk.prop('checked', true).trigger('prog-change');
                    me.$root
                        .find(
                            '.output[data-id="{0}"] .{1}-dbox'.format(id, type)
                        )
                        .enable();
                }
            }
        );

        //Add Recipient Button > Click
        me.$root.on('click', '.add-recipient-button', function () {
            //Clone the last row.
            var $row = me.$root.find('.items tbody tr:last').clone();
            var newId = me.$root.find('.items tbody tr').length + 1;

            //Clone the last output, alter it and append.
            var $output = me.$root.find('.outputs .output:last').clone();
            $output
                .attr('data-id', newId)
                .attr('data-contact-id', 0)
                .attr('data-person-id', 0)
                .attr('data-recipientType', 0);
            $output.find('textarea').val('');
            $output.find('.rcpt-to').text('');
            me.$root.find('.outputs').append($output);

            //Setup email editor.
            $output
                .find('.cleditorMain')
                .replaceWith('<textarea class="html-editor"></textarea>');
            me.setupHtmlEditor($output.find('.html-editor'));

            //Alter the cloned row.
            $row.attr('data-id', newId)
                .attr('data-contactId', 0)
                .attr('data-personId', 0)
                .attr('data-recipientType', C.DocumentRecipientType.Contact)
                .find('.name-cell')
                .attr('data-input', 'input')
                .html(
                    '<input id="name{0}" type="text" class="name" style="width: 154px; padding: 3px;" />'.format(
                        newId
                    )
                )
                .end()
                .find('.description-cell label')
                .text('N/A')
                .end()
                .find('.email-cell')
                .attr('data-input', 'input')
                .html(
                    '<input id="email{0}" type="text" class="email" data-type="email" />'.format(
                        newId
                    )
                )
                .end()
                .find('.phone-cell')
                .attr('data-input', 'input')
                .html(
                    '<input id="phone{0}" type="text" class="phone" data-type="sms" />'.format(
                        newId
                    )
                )
                .end();

            $row.find('.reminder-type').attr('id', 'ReminderType' + newId);

            //Append the new row and select it.
            me.$root.find('.items tbody').append($row);

            //Uncheck email/sms options by default.
            $row.find('.by-email')
                .prop('checked', false)
                .trigger('prog-change');
            $row.find('.by-sms')
                .prop('checked', false)
                .trigger('prog-change')
                .end();

            $row.find('select').val('0');
            $row.find('select').customSelect(
                $row.find('select').hasClass('opt-locked')
            );

            //Select the new row.
            me.selectRow($row);

            //Focus on the name box.
            $row.find('input.name').focus();

            $row.find('input.name').autoCompleteEx({
                modelType: C.ModelType.Contact,
                includeContacts: true,
                includeUsers: false,
                onSelected: function (contact) {
                    var formalName = contact.udf6;
                    var email = contact.udf2;
                    var mobile = contact.udf3;

                    $row.attr(
                        'data-recipientType',
                        C.DocumentRecipientType.Contact
                    );
                    $row.attr('data-contactid', contact.id);
                    $row.find('input.email').val(email);
                    $row.find('input.phone').val(mobile);
                    $output.find('.rcpt-to').text(formalName);

                    if (email.length > 0) {
                        $row.find('.by-email')
                            .prop('checked', true)
                            .trigger('prog-change');
                    }

                    if (mobile.length > 0) {
                        $row.find('.by-sms')
                            .prop('checked', true)
                            .trigger('prog-change');
                    }

                    //if (email.length > 0 && mobile.length == 0) {
                    //    $row.find('.reminder-type').val(1).trigger('prog-change');
                    //}

                    //if (email.length == 0 && mobile.length > 0) {
                    //    $row.find('.reminder-type').val(2).trigger('prog-change');
                    //}

                    //if (email.length > 0 && mobile.length > 0) {
                    //    $row.find('.reminder-type').val(3).trigger('prog-change');
                    //}

                    me.selectRow($row);
                },
                onRemoved: function () {
                    $row.attr('data-recipientType', 0);
                    $row.attr('data-contactid', 0);
                    $row.find('input.email').val('');
                    $row.find('input.phone').val('');
                    $output.find('.rcpt-to').text('');
                    $row.find('.by-email')
                        .prop('checked', false)
                        .trigger('prog-change');
                    $row.find('.by-sms')
                        .prop('checked', false)
                        .trigger('prog-change');
                    $row.find('.reminder-type').val(0).trigger('prog-change');
                }
            });
        });

        //Select the first row.
        me.selectRow(me.$root.find('.items .row:first'));
    },
    selectRow: function ($row) {
        var me = this;
        var id = parseInt($row.attr('data-id'));

        //Deselect selected row.
        me.$root.find('.items .row.on').removeClass('on');

        //Select new row and display the linked content.
        $row.addClass('on');

        //Fade out the previously linked content, fade in the new content.
        me.$root.find('.output.on').removeClass('on').hide();

        var $output = me.$root.find('.output[data-id="{0}"]'.format(id));
        $output.addClass('on').show();

        //Optionally disable sections.
        if ($row.find('.by-email').prop('checked')) {
            $output.find('.email-dbox').enable();
        } else {
            $output.find('.email-dbox').disable('0.7');
        }
        if ($row.find('.by-sms').prop('checked')) {
            $output.find('.sms-dbox').enable();
        } else {
            $output.find('.sms-dbox').disable('0.7');
        }

        if (!$output.hasClass('html-ready')) {
            me.setupHtmlEditor($output.find('.html-editor'));
            $output.addClass('html-ready');
        }
    },

    action: function (callback) {
        var me = this;

        if (!me.validate()) return false;

        me.send(callback);
    },

    validate: function () {
        var me = this;

        var emailValidationClass =
            'validate[custom[email], required, maxsize[255]]';
        var phoneValidationClass = 'validate[custom[phone], required]';

        //Apply/remove validation on email/phone inputs, if they're checked.
        me.$root.find('.items input[type="checkbox"]').each(function () {
            var type = $(this).attr('data-type');
            var vClass =
                type == 'email' ? emailValidationClass : phoneValidationClass;

            var $input = $(this).closest('td').next().find('input');
            if ($(this).prop('checked')) {
                //Add validation class.
                $input.addClass(vClass);
            } else {
                //Remove validation class.
                $input.removeClass(vClass);
            }
        });

        me.$root.find('.items .reminder-type').each(function (i, v) {
            var itemValue = parseInt($(v).val());

            if (itemValue > 0) {
                switch (itemValue) {
                    case 1: // Email
                        $(v)
                            .closest('tr')
                            .find('.email-cell')
                            .find('input')
                            .addClass(emailValidationClass);

                        break;
                    case 2: // Phone
                        $(v)
                            .closest('tr')
                            .find('.phone-cell')
                            .find('input')
                            .addClass(phoneValidationClass);

                        break;
                    case 3: // Both
                        $(v)
                            .closest('tr')
                            .find('.email-cell')
                            .find('input')
                            .addClass(emailValidationClass);
                        $(v)
                            .closest('tr')
                            .find('.phone-cell')
                            .find('input')
                            .addClass(phoneValidationClass);

                        break;
                }
            }
        });

        //Validate.
        me.$root.find('.opt-validate').validationEngine({ scroll: false });
        var valid = me.$root.find('.opt-validate').validationEngine('validate');

        return valid;
    },

    cancel: function () {},

    send: function (callback) {
        var me = this;
        var messages = [];

        var emailCount = 0;
        var smsCount = 0;
        var updateLastContactedDate = me.$root
            .find('#UpdateLastContactedDate')
            .val();

        var reminders = [];
        var eventId;
        var eventCategoryId;

        //Build messages list.
        // - Loop through the items.  Each item is capable of resulting in 0, 1 or 2 messages (none, email/sms, email+sms).
        var id = 1;
        me.$root.find('.items .row').each(function (i, v) {
            var $row = $(v);
            var rowId = parseInt($(v).attr('data-id'));
            var $output = me.$root.find('.output[data-id="{0}"]'.format(rowId));

            if (eventId == null) {
                eventId = parseInt($row.attr('data-eventid'));
                eventCategoryId = parseInt($row.attr('data-eventcategory'));
            }

            //Create a message for sending by email?
            var $rcptToInput, message;

            if ($row.find('.by-email').prop('checked')) {
                var $email = $output.find('.email-content');
                $rcptToInput = $row.find(
                    '.email-cell {0}'.format(
                        $row.find('.email-cell').attr('data-input')
                    )
                );

                message = {
                    id: id,
                    branchId: parseInt($row.attr('data-branchId')),
                    brandId: parseInt($row.attr('data-brandId')),
                    personId: parseInt($row.attr('data-personId')),
                    contactId: parseInt($row.attr('data-contactId')),
                    carbonCopyRecipients: JSON.parse($row.attr('data-cc')),
                    rcptName: $row.find('.name-cell').text(),
                    type: C.CommunicationDeliveryType.Email,
                    rcptTo: $rcptToInput.is('label')
                        ? $rcptToInput.text()
                        : $rcptToInput.val(),
                    updateLastContactedDate: updateLastContactedDate,
                    msgSubject: $email.find('.email-subject').val(),
                    msgBody: $email.find('textarea').val(),
                    templateId: parseInt($row.attr('data-templateId'))
                };

                messages.push(message);
                $row.find('.email-control').attr('data-messageId', id);
                id++;
                emailCount++;
            }

            //Create a message for sending by text?
            if ($row.find('.by-sms').prop('checked')) {
                var $sms = $output.find('.sms-content');
                $rcptToInput = $row.find(
                    '.phone-cell {0}'.format(
                        $row.find('.phone-cell').attr('data-input')
                    )
                );
                var rcptTo = $rcptToInput.is('input')
                    ? $rcptToInput.val()
                    : $rcptToInput.is('select')
                    ? $rcptToInput.find('option:selected').attr('data-number')
                    : $rcptToInput.attr('data-number');

                message = {
                    id: id,
                    branchId: parseInt($row.attr('data-branchId')),
                    brandId: parseInt($row.attr('data-brandId')),
                    personId: parseInt($row.attr('data-personId')),
                    contactId: parseInt($row.attr('data-contactId')),
                    rcptName: $row.find('.name-cell').text(),
                    type: C.CommunicationDeliveryType.SMS,
                    rcptTo: rcptTo,
                    msgSubject: '',
                    updateLastContactedDate: updateLastContactedDate,
                    msgBody: $sms.find('textarea').val()
                };

                messages.push(message);
                $row.find('.phone-control').attr('data-messageId', id);
                id++;
                smsCount++;
            }

            var hasReminder = parseInt($row.find('.reminder-type').val()) > 0;

            if (hasReminder) {
                var inputMobile = $row.find(
                    '.phone-cell {0}'.format(
                        $row.find('.phone-cell').attr('data-input')
                    )
                );
                var inputEmail = $row.find(
                    '.email-cell {0}'.format(
                        $row.find('.email-cell').attr('data-input')
                    )
                );
                var inputName = $row.find(
                    '.name-cell {0}'.format(
                        $row.find('.email-cell').attr('data-input')
                    )
                );

                var rcptMobile = inputMobile.is('label')
                    ? inputMobile.attr('data-number')
                    : inputMobile.val();
                var rcptEmail = inputEmail.is('label')
                    ? inputEmail.text()
                    : inputEmail.val();
                var rcptName = inputName.is('label')
                    ? inputName.text()
                    : inputName.val();

                var reminder = {
                    id: id,
                    deliveryType: parseInt($row.find('.reminder-type').val()),
                    branchId: parseInt($row.attr('data-branchId')),
                    personId: parseInt($row.attr('data-personId')),
                    contactId: parseInt($row.attr('data-contactId')),
                    recipientType: parseInt($row.attr('data-recipienttype')),
                    rcptName: rcptName,
                    rcptEmail: rcptEmail,
                    rcptMobile: rcptMobile,
                    deliverydatetime: $row.attr('data-reminderdeliverydatetime')
                };

                reminders.push(reminder);
                id++;
            }
        });

        if (reminders.length > 0) {
            var MultiMessagerReminders = {
                eventCategoryId: eventCategoryId,
                eventid: eventId,
                reminders: reminders
            };

            new gmgps.cloud.http("multiMessager-send").ajax(
                {
                    args: MultiMessagerReminders,
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: '/Comms/CreateMultiMessageReminders'
                },
                function (response) {
                    var emailReminderCount = 0;
                    var smsReminderCount = 0;

                    $.each(response.Data, function (i, v) {
                        if (v.Success) {
                            switch (v.Type) {
                                case 1:
                                    emailReminderCount++;
                                    break;
                                case 2:
                                    smsReminderCount++;
                                    break;
                                case 3:
                                    emailReminderCount++;
                                    smsReminderCount++;
                                    break;
                            }
                        }
                    });

                    $.jGrowl(
                        '{0} e-mail(s), {1} text message(s)'.format(
                            emailReminderCount,
                            smsReminderCount
                        ),
                        {
                            header: 'Reminders Created',
                            theme: 'growl-updater growl-system',
                            life: 2000
                        }
                    );
                }
            );
        } else {
            new gmgps.cloud.http("multiMessager-send").ajax({
                args: {
                    eventCategory: eventCategoryId,
                    eventId: eventId
                },
                complex: false,
                dataType: 'json',
                type: 'post',
                url: '/Comms/DeleteMultiMessageReminders'
            });
        }

        //Send messages.
        new gmgps.cloud.http("multiMessager-send").ajax(
            {
                args: messages,
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/Comms/SendMultiMessages'
            },
            function (response) {
                var success = true;

                $.each(response.Data, function (i, v) {
                    var $control = me.$root.find(
                        'td[data-messageId="{0}"]'.format(v.Id)
                    );
                    var $row = $control.closest('.row');

                    if (v.Success) {
                        //Message sent successfully - clear it's target and control from the table.
                        if (v.Type == C.CommunicationDeliveryType.Email) {
                            $row.find('.email-cell, .email-control')
                                .empty()
                                .removeClass('error');
                        } else {
                            $row.find('.phone-cell, .phone-control')
                                .empty()
                                .removeClass('error');
                        }
                    } else {
                        //Send failed.  Set the overall success flag to false.
                        success = false;

                        //Highlight the failed message and add a flag to the row, "has-error".
                        $row.addClass('has-error');
                        if (v.Type == C.CommunicationDeliveryType.Email) {
                            $row.find('.email-cell').addClass('error');
                        } else {
                            $row.find('.phone-cell').addClass('error');
                        }
                    }
                });

                //All messages have been processed.  Now remove entire rows which were not found to contain any errors.
                me.$root.find('.items .row:not(.has-error)').remove();

                if (success) {
                    $.jGrowl(
                        '{0} e-mail(s), {1} text message(s)'.format(
                            emailCount,
                            smsCount
                        ),
                        {
                            header: 'Messages Sent',
                            theme: 'growl-updater growl-system',
                            life: 2000
                        }
                    );
                    callback();
                } else {
                    //Auto-select the first row.
                    me.selectRow(me.$root.find('.items .row:first'));

                    //Tell that one or messages failed.
                    showError(
                        'One or more messages failed to send.<br/><br/>The messages that failed have been highlighted.  Please check email addresses/phone numbers and try again.'
                    );
                    callback(true);
                }
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
