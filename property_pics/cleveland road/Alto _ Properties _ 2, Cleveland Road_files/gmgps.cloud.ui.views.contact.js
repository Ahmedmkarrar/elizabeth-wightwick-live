gmgps.cloud.ui.views.contactStatus = function (args) {
    var me = this;

    me.$root = args.$root;
    me.callback = args.callback;
    me.$window = null;
    me.init();

    return true;
};

gmgps.cloud.ui.views.contactStatus.prototype = {
    init: function () {
        var me = this;
        me.$window = me.$root.closest('.window');
    },

    destroy: function () {
        var me = this;
        me.$root.empty().unbind();
    },

    action: function (onComplete) {
        var me = this;

        me.$window.find('.action-button').lock();

        var postedForm = createForm(me.$root, 'Contact/SetContactActiveStatus');
        new gmgps.cloud.http("contact-action").postForm(
            postedForm,
            function (response) {
                //Prompt for letters.
                gmgps.cloud.helpers.general.promptForLetters({
                    eventHeaders: response.UpdatedEvents
                });

                if (onComplete) {
                    onComplete();
                }
                if (me.callback) {
                    me.callback();
                }
            },
            function () {
                me.$window.find('.action-button').unlock();
            }
        );
    },

    cancel: function (onComplete) {
        onComplete();
    }
};

gmgps.cloud.ui.views.contactFSReferral = function (args) {
    var me = this;

    me.$root = args.$root;
    me.$window = null;
    me.windowMovedOnce = false;

    me.isInternalReferral =
        me.$root.find('#IsInternalReferral').val().toUpperCase() == 'TRUE';
    me.$emailToggle = me.$root.find('.email-toggle');

    me.init();

    return true;
};

gmgps.cloud.ui.views.contactFSReferral.prototype = {
    init: function () {
        var me = this;
        me.$window = me.$root.closest('.window');

        //Custom selects.
        me.$root.find('select').customSelect();
        me.$root.find('.placeholders').placeholder();

        //Mini diary.
        me.setupMiniDiary(me.$root.find('.mini-diary-placeholder'));

        //Date Pickers
        me.$root.find('.date-picker').each(function (i, v) {
            $(v).datepicker({
                numberOfMonths: 2,
                showButtonPanel: true,
                dateFormat: 'dd/mm/yy',
                minDate:
                    $(v).attr('data-datePickerMode') == 'future'
                        ? new Date()
                        : null
            });
        });

        //Time pickers
        me.$root.find('.time-picker').each(function (i, v) {
            $(v).timepicker({
                addSliderAccess: true,
                sliderAccessArgs: { touchonly: false }
            });
        });

        //Setup AC's.
        me.setupPropertyAC(me.$root.find('.property-ac'));
        me.setupContactAC(me.$root.find('.contact-ac'));

        //ReminderMins Dropdown > Change
        me.$root.on('change', '#ReminderMins', function () {
            var mins = parseInt($(this).val());
            if (mins == 0) {
                me.$root.find('.reminder-method').hide();
            } else {
                me.$root.find('.reminder-method').show();
            }
        });

        //Setup email notification message box.
        me.$editor = me.$root.find('#EmailNotificationMessage').cleditor({
            height: 120,
            width: 641,
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

        ClEditorContextMenuActionsBehaviour.apply(me.$editor[0]);

        //Email Toggle > Change
        me.$root.on('change', '.email-toggle', function () {
            var $box = me.$root.find('.email-box');
            var on = $(this).hasClass('on');

            if (on) {
                $box.show().animate(
                    { height: 166 },
                    {
                        duration: 250,
                        easing: 'easeOutBack',
                        complete: function () {
                            me.$editor.focus();
                        }
                    }
                );
            } else {
                //Toggle off - hide the email notification section.
                $box.animate(
                    { height: 0 },
                    {
                        duration: 250,
                        easing: 'easeOutBack',
                        complete: function () {
                            $box.hide();
                        }
                    }
                );
            }
        });

        //Appointment Toggle > Change
        me.$root.on('change', '.apt-toggle', function () {
            me.updateEmailBodyContent();
            var $box = me.$root.find('.apt-box');
            var on = $(this).hasClass('on');

            if (on) {
                $box.enable(false);
            } else {
                $box.disable('0.7');
            }
        });

        //Plus-Minus button (for contacts/properties) > Click
        me.$root.on('click', '.plus-minus-button.on', function () {
            //Create a new contact/property row.
            var type = $(this).attr('data-type');

            //If there's already an autocomplete input available and ununsed, ignore.
            if (
                $(this).closest('.records').find('input:visible').length !== 0
            ) {
                return false;
            }

            var $row = $(
                '<tr class="row" data-id="0">' +
                '<td colspan="2" style="padding-right: 0px;"><input type="text" class="{0}-ac" style="width: 300px;" data-id="0" data-pre=""/></td>'.format(
                    type
                ) +
                '</tr>'
            );

            //Append the row to the associated records table.
            $(this).closest('.records').find('tbody').append($row);

            //Setup auto-complete on the new row.
            if (type == 'contact') {
                me.setupContactAC($row.find('input'));
            } else {
                me.setupPropertyAC($row.find('input'));
            }
        });

        //Initial UI settings.
        if (!me.isInternalReferral) {
            me.$root.find('.apt-box').disable('0.7');
        }
    },

    updateEmailBodyContent: function (newContactId, newPropertyId) {
        var me = this;

        var contactId = newContactId
            ? newContactId
            : me.$root.find('.contact-ac').attr('data-id');
        var propertyId = newPropertyId
            ? newPropertyId
            : me.$root.find('.property-ac').attr('data-id');

        var hasAppointment = me.$root.find('.apt-toggle').hasClass('on');

        new gmgps.cloud.http("contact-updateEmailBodyContent").ajax(
            {
                args: {
                    contactId: contactId,
                    propertyId: propertyId,
                    referredBy: me.$root.find('#ReferredByUser_UserId').val(),
                    notes: me.$root.find('#Notes').val(),
                    referredToContactId: me.$root
                        .find('#ExternalAdvisor_Id')
                        .val(),
                    referredToUserId: me.$root
                        .find('#InternalAdvisor_UserId')
                        .val(),
                    appointmentStart: hasAppointment
                        ? me.$root
                            .find('.mini-diary-input')
                            .attr('data-startdatetime')
                        : null,
                    appointmentEnd: hasAppointment
                        ? me.$root
                            .find('.mini-diary-input')
                            .attr('data-enddatetime')
                        : null
                },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/Contact/GetFSReferralEmailContent'
            },
            function (response) {
                me.$root.find('#EmailNotificationMessage').val(response.Data);
                me.$editor[0].updateFrame();
            }
        );
    },

    setupContactAC: function ($e) {
        var me = this;

        $e.autoCompleteEx({
            modelType: C.ModelType.Contact,
            includeContacts: true,
            includeUsers: false,
            search: {
                ApplyFurtherFilteringtoIds: true
            },
            placeholder: 'Search for Contact...',
            onSelected: function (args) {
                var $row = args.$e.closest('.row');
                $row.attr('data-id', args.id);
                $row.find('input[data-id="contactId"]').val(args.id);
                me.updateEmailBodyContent(args.id, undefined);

                var $btn = me.$root.find('.email-toggle');
                if (!$btn.hasClass('on')) {
                    $btn.trigger('click');
                }
            },
            onRemoved: function () {
                me.$root.find('#EmailNotificationMessage').val('');
                me.$editor[0].updateFrame();

                var $btn = me.$root.find('.email-toggle');
                if ($btn.hasClass('on')) {
                    $btn.trigger('click');
                }
            }
        });
    },

    setupPropertyAC: function ($e) {
        var me = this;

        $e.autoCompleteEx({
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
            placeholder: 'Search for Property...',
            onSelected: function (args) {
                var $row = args.$e.closest('.row');
                $row.attr('data-id', args.id);
                $row.find('input[data-id="propertyId"]').val(args.id);
                me.updateEmailBodyContent(undefined, args.id);
            },
            onRemoved: function () {
                me.updateEmailBodyContent();
            }
        });
    },

    setupMiniDiary: function ($targets) {
        var me = this;

        $targets.miniDiary({
            userId: shell.userId,
            mode: C.CalendarMode.Me,
            allowCreate: false,
            allowEdit: true,
            highlightedEventIds: [me.id], //even if new (zero)
            highlightedInstanceId: me.instanceId,
            useStartForFirstHour: true,
            onPeriodSelected: function (req, authoriseCallback) {
                //Use the period.
                authoriseCallback(true);
            },
            onChanged: function () {
                me.updateEmailBodyContent();
            },
            onEventMoved: null
        });
    },

    destroy: function () {
        var me = this;
        me.$root.empty().unbind();
    },

    action: function (onComplete) {
        var me = this;

        if (
            !me.$root.find('.email-toggle').hasClass('on') &&
            !me.$root.find('.apt-toggle').hasClass('on')
        ) {
            showInfo(
                'You must at least send an email to the financial advisor'
            );
            return false;
        }

        if (me.$root.find('.email-toggle').hasClass('on')) {
            if (parseInt(me.$root.find('.contact-ac').attr('data-id')) === 0) {
                showInfo('Please choose an Applicant to refer');
                return false;
            }
            if (me.$root.find('#EmailAddress').val().length === 0) {
                showInfo('Please supply an email address');
                return false;
            }

            if (me.$root.find('#EmailNotificationSubject').val().length === 0) {
                showInfo('Please supply a subject');
                return false;
            }
        }

        me.$window.find('.action-button').lock();

        var $form = createForm(me.$root, '/Contact/UpdateFSReferral');

        $form
            .find('#Event_StartDate')
            .val($form.find('.mini-diary-input').attr('data-startdatetime'));
        $form
            .find('#Event_EndDate')
            .val($form.find('.mini-diary-input').attr('data-enddatetime'));
        $form
            .find('#CreateDiaryEvent')
            .val($form.find('.apt-toggle').hasClass('on') ? true : false);
        $form
            .find('#SendMail')
            .val($form.find('.email-toggle').hasClass('on') ? true : false);
        $form.find('#ContactId').val($form.find('.contact-ac').attr('data-id'));
        $form
            .find('#PropertyId')
            .val($form.find('.property-ac').attr('data-id'));

        new gmgps.cloud.http("contact-action").postForm(
            $form,
            function () {
                if (onComplete) {
                    onComplete();
                }
                if (me.callback) {
                    me.callback();
                }
            },
            function () {
                me.$window.find('.action-button').unlock();
            }
        );
    },

    cancel: function (onComplete) {
        onComplete();
    }
};

gmgps.cloud.ui.views.contactSolicitorReferral = function (args) {
    var me = this;

    me.$root = args.$root;
    me.$window = null;
    me.windowMovedOnce = false;

    me.isInternalReferral =
        me.$root.find('#IsInternalReferral').val().toUpperCase() == 'TRUE';
    me.$emailToggle = me.$root.find('.email-toggle');

    me.init();

    return true;
};

gmgps.cloud.ui.views.contactSolicitorReferral.prototype = {
    init: function () {
        var me = this;
        me.$window = me.$root.closest('.window');

        //Custom selects.
        me.$root.find('select').customSelect();
        me.$root.find('.placeholders').placeholder();

        //Mini diary.
        me.setupMiniDiary(me.$root.find('.mini-diary-placeholder'));

        //Date Pickers
        me.$root.find('.date-picker').each(function (i, v) {
            $(v).datepicker({
                numberOfMonths: 2,
                showButtonPanel: true,
                dateFormat: 'dd/mm/yy',
                minDate:
                    $(v).attr('data-datePickerMode') == 'future'
                        ? new Date()
                        : null
            });
        });

        //Setup AC's.
        me.setupPropertyAC(me.$root.find('.property-ac'));
        me.setupContactAC(me.$root.find('.contact-ac'));

        //ReminderMins Dropdown > Change
        me.$root.on('change', '#ReminderMins', function () {
            var mins = parseInt($(this).val());
            if (mins == 0) {
                me.$root.find('.reminder-method').hide();
            } else {
                me.$root.find('.reminder-method').show();
            }
        });

        //Setup email notification message box.
        me.$editor = me.$root.find('#EmailNotificationMessage').cleditor({
            height: 120,
            width: 641,
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

        ClEditorContextMenuActionsBehaviour.apply(me.$editor[0]);

        //Email Toggle > Change
        me.$root.on('change', '.email-toggle', function () {
            var $box = me.$root.find('.email-box');
            var on = $(this).hasClass('on');

            if (on) {
                $box.show().animate(
                    { height: 166 },
                    {
                        duration: 250,
                        easing: 'easeOutBack',
                        complete: function () {
                            me.$editor.focus();
                        }
                    }
                );
            } else {
                //Toggle off - hide the email notification section.
                $box.animate(
                    { height: 0 },
                    {
                        duration: 250,
                        easing: 'easeOutBack',
                        complete: function () {
                            $box.hide();
                        }
                    }
                );
            }
        });

        //Appointment Toggle > Change
        me.$root.on('change', '.apt-toggle', function () {
            me.updateEmailBodyContent();
            var $box = me.$root.find('.apt-box');
            var on = $(this).hasClass('on');

            if (on) {
                $box.enable(false);
            } else {
                $box.disable('0.7');
            }
        });

        //Plus-Minus button (for contacts/properties) > Click
        me.$root.on('click', '.plus-minus-button.on', function () {
            //Create a new contact/property row.
            var type = $(this).attr('data-type');

            //If there's already an autocomplete input available and ununsed, ignore.
            if (
                $(this).closest('.records').find('input:visible').length !== 0
            ) {
                return false;
            }

            var $row = $(
                '<tr class="row" data-id="0">' +
                '<td colspan="2" style="padding-right: 0px;"><input type="text" class="{0}-ac" style="width: 300px;" data-id="0" data-pre=""/></td>'.format(
                    type
                ) +
                '</tr>'
            );

            //Append the row to the associated records table.
            $(this).closest('.records').find('tbody').append($row);

            //Setup auto-complete on the new row.
            if (type == 'contact') {
                me.setupContactAC($row.find('input'));
            } else {
                me.setupPropertyAC($row.find('input'));
            }
        });

        //Initial UI settings.
        if (!me.isInternalReferral) {
            me.$root.find('.apt-box').disable('0.7');
        }
    },

    updateEmailBodyContent: function (newContactId, newPropertyId) {
        var me = this;

        var contactId = newContactId
            ? newContactId
            : me.$root.find('.contact-ac').attr('data-id');
        var propertyId = newPropertyId
            ? newPropertyId
            : me.$root.find('.property-ac').attr('data-id');

        var hasAppointment = me.$root.find('.apt-toggle').hasClass('on');

        new gmgps.cloud.http("contact-updateEmailBodyContent").ajax(
            {
                args: {
                    contactId: contactId,
                    propertyId: propertyId,
                    referredBy: me.$root.find('#ReferredByUser_UserId').val(),
                    notes: me.$root.find('#Notes').val(),
                    referredToContactId: me.$root
                        .find('#ExternalAdvisor_Id')
                        .val(),
                    referredToUserId: me.$root
                        .find('#InternalAdvisor_UserId')
                        .val(),
                    appointmentStart: hasAppointment
                        ? me.$root
                            .find('.mini-diary-input')
                            .attr('data-startdatetime')
                        : null,
                    appointmentEnd: hasAppointment
                        ? me.$root
                            .find('.mini-diary-input')
                            .attr('data-enddatetime')
                        : null
                },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/Contact/GetSolicitorReferralEmailContent'
            },
            function (response) {
                me.$root.find('#EmailNotificationMessage').val(response.Data);
                me.$editor[0].updateFrame();
            }
        );
    },

    setupContactAC: function ($e) {
        var me = this;

        $e.autoCompleteEx({
            modelType: C.ModelType.Contact,
            includeContacts: true,
            includeUsers: false,
            search: {
                ApplyFurtherFilteringtoIds: true //?
            },
            placeholder: 'Search for Contact...',
            onSelected: function (args) {
                var $row = args.$e.closest('.row');
                $row.attr('data-id', args.id);
                $row.find('input[data-id="contactId"]').val(args.id);
                me.updateEmailBodyContent(args.id, undefined);

                var $btn = me.$root.find('.email-toggle');
                if (!$btn.hasClass('on')) {
                    $btn.trigger('click');
                }
            },
            onRemoved: function () {
                me.$root.find('#EmailNotificationMessage').val('');
                me.$editor[0].updateFrame();

                // if you removed the contact then you cant send an email!
                var $btn = me.$root.find('.email-toggle');
                if ($btn.hasClass('on')) {
                    $btn.trigger('click');
                }
            }
        });
    },

    setupPropertyAC: function ($e) {
        var me = this;

        $e.autoCompleteEx({
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
            placeholder: 'Search for Property...',
            onSelected: function (args) {
                var $row = args.$e.closest('.row');
                $row.attr('data-id', args.id);
                $row.find('input[data-id="propertyId"]').val(args.id);
                me.updateEmailBodyContent(undefined, args.id);
            },
            onRemoved: function () {
                me.updateEmailBodyContent();
            }
        });
    },

    setupMiniDiary: function ($targets) {
        var me = this;

        $targets.miniDiary({
            userId: shell.userId,
            mode: C.CalendarMode.Me,
            allowCreate: false,
            allowEdit: true,
            highlightedEventIds: [me.id], //even if new (zero)
            highlightedInstanceId: me.instanceId,
            useStartForFirstHour: true,
            onPeriodSelected: function (req, authoriseCallback) {
                //Use the period.
                authoriseCallback(true);
            },
            onChanged: function () {
                me.updateEmailBodyContent();
            },
            onEventMoved: null
        });
    },

    destroy: function () {
        var me = this;
        me.$root.empty().unbind();
    },

    action: function (onComplete) {
        var me = this;

        if (
            !me.$root.find('.email-toggle').hasClass('on') &&
            !me.$root.find('.apt-toggle').hasClass('on')
        ) {
            showInfo('You must at least send an email to the solicitor');
            return false;
        }

        if (me.$root.find('.email-toggle').hasClass('on')) {
            if (parseInt(me.$root.find('.contact-ac').attr('data-id')) === 0) {
                showInfo('Please choose an Applicant to refer');
                return false;
            }
            if (me.$root.find('#EmailAddress').val().length === 0) {
                showInfo('Please supply an email address');
                return false;
            }

            if (me.$root.find('#EmailNotificationSubject').val().length === 0) {
                showInfo('Please supply a subject');
                return false;
            }
        }

        me.$window.find('.action-button').lock();

        var $form = createForm(me.$root, '/Contact/UpdateSolicitorReferral');

        $form
            .find('#Event_StartDate')
            .val($form.find('.mini-diary-input').attr('data-startdatetime'));
        $form
            .find('#Event_EndDate')
            .val($form.find('.mini-diary-input').attr('data-enddatetime'));
        $form
            .find('#CreateDiaryEvent')
            .val($form.find('.apt-toggle').hasClass('on'));
        $form.find('#SendMail').val($form.find('.email-toggle').hasClass('on'));
        $form.find('#ContactId').val($form.find('.contact-ac').attr('data-id'));
        $form
            .find('#PropertyId')
            .val($form.find('.property-ac').attr('data-id'));

        new gmgps.cloud.http("contact-action").postForm(
            $form,
            function () {
                if (onComplete) {
                    onComplete();
                }
                if (me.callback) {
                    me.callback();
                }
            },
            function () {
                me.$window.find('.action-button').unlock();
            }
        );
    },

    cancel: function (onComplete) {
        onComplete();
    }
};

gmgps.cloud.ui.views.transferContact = function (args) {
    var me = this;
    me.$root = args.$root;
    me.gotoContactHandler =
        args && args.data ? args.data.gotoContactHandler : undefined;
    me.init(args);
    me.closeMyWindow = args.closeMyWindow;
    return this;
};

gmgps.cloud.ui.views.transferContact.prototype = {
    init: function () {
        var me = this;

        me.$root.find('select').customSelect();
    },

    action: function (onComplete) {
        var me = this;
        var branchName = me.$root.find('#BranchId option:selected').text();
        var branchId = parseInt(me.$root.find('#BranchId').val());
        var originalBranchId = parseInt(
            me.$root.find('#OriginalBranchId').val()
        );

        //Check that the branch is different.
        if (branchId == originalBranchId) {
            showInfo(
                'This contact is already owned by the {0} branch.'.format(
                    branchName
                )
            );
            return false;
        }

        showDialog({
            type: 'question',
            title: 'Transfer Contact',
            msg: 'Are you sure you would like to move this contact to the {0} branch?'.format(
                branchName
            ),
            buttons: {
                Yes: function () {
                    new gmgps.cloud.http("contact-Yes").ajax(
                        {
                            args: {
                                contactId: parseInt(
                                    me.$root.find('#ContactId').val()
                                ),
                                branchId: parseInt(
                                    me.$root.find('#BranchId').val()
                                ),
                                notes: me.$root.find('#Notes').val()
                            },
                            complex: true,
                            dataType: 'json',
                            type: 'post',
                            url: '/Contact/TransferContact'
                        },
                        function (response) {
                            if (response.Data == 0) {
                                showError('The transfer operation failed.');
                            } else {
                                me.gotoContactHandler({
                                    id: response.Data
                                });
                                onComplete();
                            }
                        }
                    );

                    $(this).dialog('close');
                },
                No: function () {
                    $(this).dialog('close');
                }
            }
        });
    }
};

gmgps.cloud.ui.views.contact = function (args) {
    var me = this;
    me.def = 'ui.views.contact';
    me.cfg = args;
    me.$root = args.$root;

    me.onSearchBoxFocusRequest = new gmgps.cloud.common.event();
    me.onBeforeSearchBoxFocusRequest = new gmgps.cloud.common.event();
    me.onViewModeChanged = new gmgps.cloud.common.event();
    me.onCounterChangeRequested = new gmgps.cloud.common.event();
    me.onToolbarSetContext = new gmgps.cloud.common.event();
    me.init(args);

    Object.defineProperty(this, 'detailController', {
        get: function () {
            return me.contactDetails;
        }
    });

    return this;
};

gmgps.cloud.ui.views.contact.prototype = {
    init: function (args) {
        var me = this;

        me.$root.off();

        me.initControls();
        me.initHandlers();

        //Click the first item in the detail layer and the default item in the list layer.
        me.setViewMode(me.cfg.viewMode);

        //Auto-select the first item in the list, unless preventDefault is true.
        if (!args.preventDefault) {
            var $db = me.$root
                .find(
                    '.panel[data-id="contact"] .layer[data-id="detail"] li:not(.hidden) > .button'
                )
                .first(); //first in list (detail)
            $db.trigger('auto-navigate');
        }

        me.searchTipsHtml = me.$root
            .parent()
            .find('#search-tips-container[data-type="contact"]')
            .html();
    },

    initHandlers: function () {
        var me = this;

        //Panel: Events
        me.panel.onPanelItemClicked.handle(function (args) {
            me._panelItemClicked(args);
        });
        me.panel.onPanelItemStarred.handle(function ($item) {
            me._panelItemStarred($item);
        });
        me.panel.onPanelItemSaved.handle(function (args) {
            me._panelItemSaved(args);
        });
        me.panel.onPanelItemUndone.handle(function (args) {
            me._panelItemUndone(args);
        });
        me.panel.onPanelItemFilterChanged.handle(function (args) {
            me._onPanelItemFilterChanged(args);
        });
        me.panel.onPanelStepThroughClicked.handle(function ($item) {
            me._panelStepThroughClicked($item);
        });

        me.onBeforeSearchBoxFocusRequest.handle(function ($searchBox) {
            return me._beforeSearchBoxFocusRequest($searchBox);
        });

        me.$root.on('click', '.sublist-row-opener', function () {
            var hiddenArea = $(this).closest('tr').next('tr.sublist-row');

            var expand = true;
            if (hiddenArea.is(':visible')) expand = false;

            if (expand) {
                var dataId = $(this).data('id');

                if (dataId < 1) {
                    //contact row maybe a pending unsaved contact
                    showInfo(
                        'This contact is not saved, please save the contact first.'
                    );
                    return;
                }

                new gmgps.cloud.http("contact-initHandlers").ajax(
                    {
                        args: { contactId: dataId },
                        complex: false,
                        dataType: 'json',
                        type: 'post',
                        async: false,
                        url: '/Contact/GetListItemExtra',
                        timeout: 6000
                    },
                    function (response) {
                        if (response.Status == C.ResponseStatusType.Success) {
                            hiddenArea
                                .find('td.extra-info-container')
                                .html(response.Data);
                            hiddenArea.slideDown();
                            hiddenArea.scrollintoview({
                                duration: 'slow',
                                direction: 'y'
                            });
                        }
                    }
                );
            } else hiddenArea.slideUp();
        });

        me.$root.on('click', '.all-row-opener', function () {
            var sender = $(this);
            var expand = true;
            if (sender.data('expanded')) expand = false;

            var rows = me.$root.find('.tablex.list.contact table tr.row');

            if (rows.length == 0) {
                showInfo('There are no rows in the list to expand');
                return;
            }

            if (!expand) {
                for (var i = 0; i < rows.length; i++) {
                    var row = rows[i];
                    var hiddenArea = $(row).next('tr.sublist-row');
                    hiddenArea.slideUp();
                }

                sender.data('expanded', false);

                sender
                    .removeClass('spy-glass-minus')
                    .addClass('spy-glass-plus');

                return;
            } else {
                var contactIds = $.map(rows, function (r) {
                    return parseInt($(r).data('id'));
                });

                new gmgps.cloud.http("contact-initHandlers").ajax(
                    {
                        args: { contactIds: contactIds },
                        complex: false,
                        dataType: 'json',
                        type: 'post',
                        async: false,
                        url: '/Contact/GetListItemExtrasArray',
                        timeout: 6000
                    },
                    function (response) {
                        if (response.Status == C.ResponseStatusType.Success) {
                            for (var r = 0; r < response.Data.length; r++) {
                                var html = $(response.Data[r]);
                                if (html.length > 0) {
                                    var id = html.data('contact-id');
                                    var rRow = $.grep(rows, function (e) {
                                        return $(e).data('id') == id;
                                    });
                                    var rHiddenArea =
                                        $(rRow).next('tr.sublist-row');
                                    rHiddenArea
                                        .find('td.extra-info-container')
                                        .html(html);
                                    rHiddenArea.slideDown();
                                }
                            }

                            sender.data('expanded', true);

                            sender
                                .removeClass('spy-glass-plus')
                                .addClass('spy-glass-minus');
                        }
                    }
                );
            }
        });

        //Window > beforeunload
        $(window).on('beforeunload', function () {
            //Conditionally persist any unsaved property. (e.g. one where changes have been made against the current record)
            // - The true flag here denotes that the persisting must be immediate, as the browser is closing.
            me.persist(true);
        });

        me.$root.on('mousedown', '.down-button', function () {
            me.$root
                .find('.tablex.contact .body')
                .scrollTop(
                    me.$root.find('.tablex.contact .body').scrollTop() + 50
                );
        });

        me.$root.on('mousedown', '.up-button', function () {
            me.$root
                .find('.tablex.contact .body')
                .scrollTop(
                    me.$root.find('.tablex.contact .body').scrollTop() - 50
                );
        });
    },

    initControls: function () {
        var me = this;

        //Panel
        me.panel = new gmgps.cloud.ui.controls.NavigablePanel({
            $root: me.$root.find('.panel[data-id="contact"]'),
            defaultTitle: 'Contacts',
            entityType: 'contact',
            defaultLayer: 'detail'
        });

        me.stepThroughHandler = new gmgps.cloud.ui.views.stepThroughHandler({
            $root: me.$root,
            shell: shell,
            $spinner: $('#spinner'),
            modelType: C.ModelType.Contact,
            panel: me.panel,
            onNavigated: function (activeDetailsHandler) {
                me.contactDetails = activeDetailsHandler;
            },
            onUpdateToolBar: function (showMenu, viewMode, menuMode) {
                me.onViewModeChanged.raise({
                    newViewMode: viewMode,
                    menuMode: menuMode,
                    showMenu: showMenu,
                    group: 'contact'
                });
            },
            onExit: function (matchGroup) {
                me.lastSearchArgs = matchGroup.searchArgs;
                me.contactyDetails = me.stepThroughHandler.getDetailsHandler(
                    matchGroup.detailsHandler,
                    me.cfg.viewMode,
                    'list'
                );

                me.onViewModeChanged.raise({
                    newViewMode: 'list',
                    menuMode: 'list',
                    showMenu: true,
                    group: 'contact'
                });

                if (matchGroup.id !== C.FactorySearchId.SearchResults) {
                    matchGroup.$panelItem
                        .find('.button')
                        .trigger('pseudo-click');
                    return;
                }

                me.clearSearchResults();
            },
            onSave: function (onAfterSavePerformed) {
                me.performContactSave({
                    onValidationComplete: function (success) {
                        if (success === true) {
                            glass(true);
                        }
                    },
                    onError: function () {
                        glass(false);
                        onAfterSavePerformed(false);
                    },
                    onComplete: function () {
                        glass(false);
                        onAfterSavePerformed(true);
                    },
                    displayAfterSave: false
                });
            }
        });

        var moneyLaunderingFilter =
            new gmgps.cloud.ui.filters.MoneyLaunderingSearchFilter();
        moneyLaunderingFilter.apply(
            me.$root.find(
                'li[data-id="{0}"]'.format(
                    C.FactorySearchId.NotPassedMoneyLaunderingCheck
                )
            )
        );
    },

    gotoContact: function (args) {
        var me = this;

        if (me.contactDetails.cfg.inStepThrough === true) {
            me.stepThroughHandler.reloadCurrentRecord(
                me.stepThroughHandler.activeMatchGroup
            );
        } else {
            gmgps.cloud.helpers.contact.editContact(args);
        }
    },

    refreshForced: function () {
        //Called when the view was forced to be refreshed, by clicking the currently selected top-level navtab.
        var me = this;

        me.persist(true);
    },

    persist: function (immediate) {
        var me = this;
        me.persistContact(immediate);
    },

    action: function (args) {
        var me = this;

        var id, noneSelected, propertyIds, contactSearch, contactId, name;

        if (args.action === 'list' || args.action === 'detail') {
            me.contactDetails = me.stepThroughHandler.getDetailsHandler(
                me.contactDetails,
                me.cfg.viewMode,
                args.action
            );
        }

        switch (args.action) {
            case 'log-phonecall':
                gmgps.cloud.helpers.general.createNote({
                    title: 'Add Notes from Telephone Conversation',
                    settings: {
                        propertyId: null,
                        contactId: me.contactDetails.id,
                        eventSubType: C.EventSubType.PhoneCall,
                        noteSource: C.NoteSourceType.PhoneCallContact
                    },
                    onComplete: function () { }
                });
                break;

            case 'log-filenote':
                gmgps.cloud.helpers.general.createNote({
                    title: 'Add File Note',
                    settings: {
                        propertyId: null,
                        contactId: me.contactDetails.id,
                        noteSource: C.NoteSourceType.PhoneCallContact,
                        eventSubType: C.EventSubType.FileNote
                    },
                    onComplete: function () { }
                });
                break;

            case 'create-offer':
                gmgps.cloud.helpers.property.createOffer({
                    propertyId: null,
                    contactIds: [me.contactDetails.id],
                    redirectToAlp: false
                });
                break;

            case 'let-agreed':
                gmgps.cloud.helpers.property.createLetAgreed({
                    propertyId: null,
                    contactIds: [me.contactDetails.id]
                });
                break;

            case 'create-appraisal':
                args.id = id;
                gmgps.cloud.helpers.property.createMarketAppraisal({
                    propertyId: null,
                    contactIds: [me.contactDetails.id],
                    gotoContactHandler: function (args) {
                        me.gotoContact(args);
                    }
                });
                break;

            case 'create-contact':
                if (me.panel.newItemExists()) {
                    showInfo(
                        'Please save your recently added contact before adding another.',
                        'Add Contact'
                    );
                } else {
                    gmgps.cloud.helpers.contact.editContact({
                        id: 0,
                        tabColumnName: 'contactinfo'
                    });
                }

                googleAnalytics.sendEvent(
                    'contacts',
                    'button_click',
                    'add_contact'
                );
                break;

            case 'add-note':
                if (me.contactDetails !== undefined) {
                    me.contactDetails.addNote();
                }
                break;

            case 'list':
                if (!me.$listPanelItem) {
                    var $lb = me.$root.find(
                        '.panel[data-id="contact"] .layer[data-id="list"] .item.on .button'
                    );
                    $lb.trigger('pseudo-click');
                }

                me.setViewMode('list');
                googleAnalytics.sendEvent('contacts', 'button_click', 'groups');
                break;

            case 'detail':
                if (!me.$contactPanelItem) {
                    var $db = me.$root
                        .find(
                            '.panel[data-id="contact"] .layer[data-id="detail"] li:not(.hidden) > .button'
                        )
                        .first(); //first in list (detail)

                    $db.trigger('prog-click');
                }

                me.setViewMode('detail');
                break;

            case 'create-new':
                me.create();
                break;

            case 'pm-accounting-documents':
                new gmgps.cloud.ui.views.accountingDocumentsHandler({
                    title: 'Accounting Documents'
                }).show();
                googleAnalytics.sendEvent(
                    'contact',
                    'menu_click_item',
                    'pm_accounting_documents'
                );
                break;

            case 'create-letter':
                id = me.contactDetails !== undefined ? me.contactDetails.id : 0; //gmgps.cloud.helpers.general.newAdHocDocument({ contactId: id });

                gmgps.cloud.helpers.general.showWriteLetterPrompt({
                    id: id,
                    contextModelType: C.ModelType.Contact
                });
                googleAnalytics.sendEvent(
                    'contact',
                    'menu_click_item',
                    'create_letter'
                );
                break;

            case 'create-vendor-report':
                id = me.contactDetails !== undefined ? me.contactDetails.id : 0;
                gmgps.cloud.helpers.contact.createVendorReport(id);
                googleAnalytics.sendEvent(
                    'contact',
                    'menu_click_item',
                    'create_vendor_report'
                );
                break;

            case 'send-period-statement':
                contactId = me.contactDetails !== undefined ? me.contactDetails.id : 0;
                var branchId = me.contactDetails !== undefined ? me.contactDetails.getBranchId() : 0;

                gmgps.cloud.helpers.contact.sendPeriodStatement(
                    contactId,
                    branchId
                );
                googleAnalytics.sendEvent(
                    'contact',
                    'menu_click_item',
                    'send_period_statement'
                );
                break;
            case 'send-mtd-income-tax-csv':
                contactId = me.contactDetails !== undefined ? me.contactDetails.id : 0;
                branchId = me.contactDetails !== undefined ? me.contactDetails.getBranchId() : 0;

                gmgps.cloud.helpers.contact.sendMtdIncomeTaxCsv(
                    contactId,
                    branchId
                );
                googleAnalytics.sendEvent(
                    'contact',
                    'menu_click_item',
                    'send_mtd_income_tax_csv'
                );
                break;

            case 'contact-advert-runs':
                contactId =
                    me.contactDetails !== undefined ? me.contactDetails.id : 0;
                new gmgps.cloud.helpers.general.advert({
                    editContextModelType: C.ModelType.Contact,
                    editContextModelId: contactId
                });
                break;

            case 'property-navigator':
                propertyIds =
                    me.contactDetails.matching.getSelectedPropertyIds();

                if (propertyIds.length === 0) {
                    showInfo('Please select some matching properties first.');
                    return;
                }
                gmgps.cloud.helpers.property.viewPropertyNavigator({
                    propertyIds: propertyIds,
                    contactId: me.contactDetails.id,
                    recordType: me.contactDetails.matching.search.RecordType,
                    contactDetails: me.contactDetails
                });

                break;

            case 'view-property-browse-sheet':
                propertyIds =
                    me.contactDetails.matching.getSelectedPropertyIds();

                if (propertyIds.length === 0) {
                    showInfo('Please select some matching properties first.');
                    return;
                }
                gmgps.cloud.helpers.property.openOutputWizard({
                    settings: {
                        outputWizardMode: C.OutputWizardMode.Standard,
                        propertyIds: propertyIds,
                        contactIds: [me.contactDetails.id]
                    }
                });
                break;

            case 'create-viewing':
                gmgps.cloud.helpers.property.getViewing({
                    contextModelType: C.ModelType.Contact,
                    contactId: me.contactDetails.id
                });
                break;

            case 'archive':
                gmgps.cloud.helpers.contact.setActiveState({
                    contactId: me.contactDetails.id,
                    active: false
                });
                break;

            case 'delete':
                console.log('Delete clicked');
                break;

            case 'unarchive':
                gmgps.cloud.helpers.contact.setActiveState({
                    contactId: me.contactDetails.id,
                    active: true
                });
                break;

            case 'transfer-contact':
                new gmgps.cloud.helpers.contact.transferContact({
                    id: me.contactDetails.id,
                    gotoContactHandler: function (args) {
                        me.gotoContact(args);
                    }
                });
                break;

            case 'property-output-wizard':
                if (
                    me.list.ids.length == 0 &&
                    me.list.selectionMode == C.ListSelectionMode.None
                ) {
                    showInfo('Please select some contacts first.');
                    return;
                }

                gmgps.cloud.helpers.property.openOutputWizard({
                    settings: {
                        outputWizardMode: C.OutputWizardMode.Standard,
                        contactSearch:
                            me.list.selectionMode === C.ListSelectionMode.None
                                ? null
                                : me.lastSearchArgs.search,
                        contactIds: me.list.ids
                    }
                });
                googleAnalytics.sendEvent(
                    'contacts',
                    'menu_item_click',
                    'output_wizard'
                );
                break;

            case 'send-brochure':
                gmgps.cloud.helpers.property.openOutputWizard({
                    settings: {
                        outputWizardMode: C.OutputWizardMode.Standard,
                        propertySearch: true,
                        propertyIds: [],
                        contactIds: [me.contactDetails.id]
                    }
                });

                break;

            case 'create-adhoc-letter':
                noneSelected =
                    (me.list.selectionMode === C.ListSelectionMode.None &&
                        me.list.ids.length == 0) ||
                    (me.list.selectionMode === C.ListSelectionMode.All &&
                        me.list.ids.length == me.list.totalRows);
                if (noneSelected) {
                    showInfo('Please select some contacts first.');
                    return;
                }

                me.getSelectedContactIDs(function (data) {
                    var contactSearch = new Object();
                    contactSearch.SearchId = C.FactorySearchId.Unspecified;
                    contactSearch.ExcludeIds = false;
                    contactSearch.Ids = data;

                    gmgps.cloud.helpers.general.openWriteLettersFromTemplateForm(
                        {
                            search: contactSearch,
                            mode: me.list.selectionMode,
                            contextModelType: C.ModelType.Contact
                        }
                    );
                });

                googleAnalytics.sendEvent(
                    'contacts',
                    'menu_item_click',
                    'adhoc_letter'
                );
                break;

            case 'bulk-invite-propertyfile':
                noneSelected =
                    (me.list.selectionMode === C.ListSelectionMode.None &&
                        me.list.ids.length === 0) ||
                    (me.list.selectionMode === C.ListSelectionMode.All &&
                        me.list.ids.length === me.list.totalRows);

                if (noneSelected) {
                    showInfo('Please select some contacts first.');
                    return;
                }

                contactSearch = jQuery.extend(
                    true,
                    {},
                    me.lastSearchArgs.search
                );

                contactSearch.ExcludeIds =
                    me.list.selectionMode === C.ListSelectionMode.All;
                contactSearch.Ids = me.list.ids;
                contactSearch.SearchPage.Size = 0;

                new gmgps.cloud.ui.controls.window({
                    title: 'Invite to PropertyFile',
                    windowId: 'sendPropertyFileInvitesModal',
                    url: 'Contact/GetBulkPropertyFileInviteModal',
                    post: false,
                    width: 600,
                    draggable: true,
                    modal: true,
                    actionButton: 'Invite Contacts',
                    cancelButton: 'Cancel',
                    onCancel: function () {
                        return false;
                    },
                    onBeforeDisplay: function ($window, onComplete) {
                        var canSendInvites = $window.find('div[data-can-send-invites]').data('can-send-invites');

                        if (canSendInvites !== 'True') {
                            $window.find('.action-button').addClass('disabled');
                        }

                        var contactCount = contactSearch.ExcludeIds
                            ? contactSearch.TotalRows - contactSearch.Ids.length
                            : contactSearch.Ids.length;
                        var contactDescription = contactCount == 1
                            ? '1 contact'
                            : contactCount + ' contacts';

                        $window.find('.propertyfile-contact-invite-description').html(contactDescription);

                        onComplete();
                    },
                    onAction: function () {
                        new gmgps.cloud.http("contact-action").ajax({
                            args: {
                                search: contactSearch
                            },
                            async: true,
                            complex: true,
                            dataType: 'json',
                            type: 'post',
                            url: '/Contact/SendBulkPropertyFileInvite'
                        }, function () {
                            $.jGrowl('Contacts Queued For Invitation to PropertyFile', {
                                header: 'PropertyFile Invites Generated',
                                theme: 'growl-updater growl-system',
                                life: 2000
                            });
                        });

                        googleAnalytics.sendEvent(
                            'contacts.send_bulk_propertyfile_invite',
                            'button_click',
                            'invite'
                        );

                        return true;
                    }
                });

                googleAnalytics.sendEvent(
                    'contacts',
                    'menu_item_click',
                    'send_bulk_propertyfile_invite'
                );

                break;

            case 'send-mail':
                var category = 'contacts';

                noneSelected =
                    (me.list.selectionMode === C.ListSelectionMode.None &&
                        me.list.ids.length === 0) ||
                    (me.list.selectionMode === C.ListSelectionMode.All &&
                        me.list.ids.length === me.list.totalRows);
                if (noneSelected) {
                    showInfo('Please select some contacts first.');
                    return;
                }

                contactSearch = jQuery.extend(
                    true,
                    {},
                    me.lastSearchArgs.search
                );

                contactSearch.ExcludeIds =
                    me.list.selectionMode === C.ListSelectionMode.All;
                contactSearch.Ids = me.list.ids;
                contactSearch.SearchPage.Size = 0;

                new gmgps.cloud.http("contact-action").ajax(
                    {
                        args: {
                            search: contactSearch
                        },
                        complex: true,
                        dataType: 'json',
                        type: 'post',
                        url: '/contact/GetMailDetailsForContacts'
                    },
                    function (response) {
                        if (response.Data.length === 0) {
                            showInfo(
                                'None of the selected contacts has an email address'
                            );
                            return;
                        }

                        var returnedLessItemsThanSelected =
                            (me.list.selectionMode ==
                                C.ListSelectionMode.None &&
                                response.Data.length < me.list.ids.length) ||
                            (me.list.selectionMode ===
                                C.ListSelectionMode.All &&
                                response.Data.length <
                                me.list.totalRows - me.list.ids.length);

                        if (returnedLessItemsThanSelected) {
                            $.jGrowl(
                                'One or more of the selected contacts does not have an email address.',
                                { header: 'Not Added', theme: 'growl-contact' }
                            );
                        }

                        gmgps.cloud.helpers.general.getMailMessager({
                            title: 'Send Mail',
                            settings: {
                                ContactIdList: response.Data,
                                originatingEventCategory: 0,
                                originatingEventId: 0,
                                showAssociatedProperty: true
                            },
                            category: category,
                            onComplete: function () { }
                        });
                    }
                );
                googleAnalytics.sendEvent(
                    category,
                    'menu_item_click',
                    'send_email'
                );
                break;

            case 'send-sms':
                noneSelected =
                    (me.list.selectionMode === C.ListSelectionMode.None &&
                        me.list.ids.length == 0) ||
                    (me.list.selectionMode === C.ListSelectionMode.All &&
                        me.list.ids.length == me.list.totalRows);
                if (noneSelected) {
                    showInfo('Please select some contacts first.');
                    return;
                }
                contactSearch = jQuery.extend(
                    true,
                    {},
                    me.lastSearchArgs.search
                );

                contactSearch.ExcludeIds =
                    me.list.selectionMode === C.ListSelectionMode.All;
                contactSearch.Ids = me.list.ids;
                contactSearch.SearchPage.Size = 0;

                new gmgps.cloud.http("contact-action").ajax(
                    {
                        args: {
                            search: contactSearch
                        },
                        complex: true,
                        dataType: 'json',
                        type: 'post',
                        url: '/contact/GetSMSDetailsForContacts'
                    },
                    function (response) {
                        if (response.Data.length === 0) {
                            showInfo(
                                'None of the selected contacts has a mobile phone'
                            );
                            return;
                        }

                        var returnedLessItemsThanSelected =
                            (me.list.selectionMode ==
                                C.ListSelectionMode.None &&
                                response.Data.length < me.list.ids.length) ||
                            (me.list.selectionMode ===
                                C.ListSelectionMode.All &&
                                response.Data.length <
                                me.list.totalRows - me.list.ids.length);

                        if (returnedLessItemsThanSelected) {
                            $.jGrowl(
                                'One or more of the selected contacts does not have a mobile phone.',
                                { header: 'Not Added', theme: 'growl-contact' }
                            );
                        }

                        gmgps.cloud.helpers.general.getSMSMessager({
                            title: 'Send SMS',
                            settings: {
                                ContactIdList: response.Data,
                                originatingEventCategory: 0,
                                originatingEventId: 0
                            },
                            onComplete: function () { }
                        });
                    }
                );

                googleAnalytics.sendEvent(
                    'contacts',
                    'menu_item_click',
                    'send_sms'
                );
                break;

            case 'refer-as-vendor':
                gmgps.cloud.helpers.contact.referAsVendor(me.contactDetails);

                break;

            case 'personal-information-delete':
                me.contactDetails.possiblyDeleteContact();
                break;

            case 'print-timeline':
                me.printTimeline(me.contactDetails.id);
                googleAnalytics.sendEvent(
                    'contacts',
                    'menu_item_click',
                    'print_timeline'
                );
                break;

            case 'personal-information-request':
                me.personalInformationRequestPersonCheck(me.contactDetails.id);
                googleAnalytics.sendEvent(
                    'contact',
                    'menu_click_item',
                    'personal_information_request'
                );
                break;

            case 'print-transactions-order-createdate':
                me.printTransactions(me.contactDetails.id, true);
                googleAnalytics.sendEvent(
                    'contacts',
                    'menu_item_click',
                    'print_transaction-id'
                );
                break;

            case 'print-transactions-order-itemdate':
                me.printTransactions(me.contactDetails.id, false);
                googleAnalytics.sendEvent(
                    'contacts',
                    'menu_item_click',
                    'print_transaction-date'
                );
                break;

            case 'print-list':
                if (
                    me.list.ids.length == 0 &&
                    me.list.selectionMode == C.ListSelectionMode.None
                ) {
                    showInfo('Please select some contacts first.');
                    return;
                }

                new gmgps.cloud.ui.controls.window({
                    title: 'Print List Options',
                    windowId: 'contactPrintListOptionsModal',
                    url: 'Contact/GetPrintListDialogMessage',
                    post: false,
                    width: 300,
                    draggable: true,
                    modal: true,
                    actionButton: 'Next',
                    cancelButton: 'Cancel',
                    onCancel: function () {
                        return false;
                    },
                    onBeforeDisplay: function ($window, onComplete) {
                        $window.find('select').customSelect();
                        onComplete();
                    },
                    onAction: function ($w) {
                        contactSearch = jQuery.extend(
                            true,
                            {},
                            me.lastSearchArgs.search
                        );

                        contactSearch.ExcludeIds =
                            me.list.selectionMode === C.ListSelectionMode.All;
                        contactSearch.Ids = me.list.ids;
                        (contactSearch.SearchOrder = {
                            By: parseInt(
                                $w.find('#sort-order-by-selection').val()
                            ),
                            Type: parseInt(
                                $w.find('#sort-order-type-selection').val()
                            )
                        }),
                            (args = {
                                search: contactSearch
                            });

                        var $form = gmgps.cloud.utility.buildForm(
                            '/Contact/PrintList',
                            args
                        );

                        $form.submit();
                        $form.remove();
                        return true;
                    }
                });
                break;

            case 'bulk-archive':
                me.bulkArchive();
                break;

            case 'bulk-delete':
                me.bulkDelete();
                break;

            case 'pm-paylandlord':
                name = me.contactDetails.getNames().displayName;
                new gmgps.cloud.ui.views.payLandlordHandler({
                    id: me.contactDetails.id,
                    title: 'Payments For This Landlord: ' + name,
                    onComplete: function () { }
                }).show();
                break;

            case 'pm-paysupplier':
                name = me.contactDetails.getNames().companyName;
                new gmgps.cloud.ui.views.paySupplierHandler({
                    id: me.contactDetails.id,
                    title: 'Payments For This Supplier: ' + name,
                    onComplete: function () { }
                }).show();
                break;

            case 'pm-charge':
                name = me.contactDetails.getNames().alternateDisplayName;
                new gmgps.cloud.ui.views.chargesHandler({
                    linkedTypeId: C.ModelType.Contact,
                    linkedId: me.contactDetails.id,
                    title:
                        'Charges For: ' + name,
                    subject: name
                }).show();
                break;

            case 'pm-receipt':
                name = me.contactDetails.getNames().displayName;
                new gmgps.cloud.ui.views.receiptsHandler({
                    linkedTypeId: C.ModelType.Contact,
                    linkedId: me.contactDetails.id,
                    title: 'Receive From: ' + name,
                    onComplete: function () { }
                }).show();
                break;

            case 'pm-refund':
                name = me.contactDetails.getNames().displayName;

                new gmgps.cloud.ui.views.refundsHandler({
                    linkedTypeId: C.ModelType.Contact,
                    linkedId: me.contactDetails.id,
                    title: 'Refunds for: ' + name,
                    onComplete: function () { }
                }).show();
                break;

            case 'pm-add-workorder':
                me.contactDetails && me.contactDetails.addWorkOrder();
                break;

            case 'pm-transferDeposit':
                new gmgps.cloud.ui.views.transferDepositHandler({
                    linkedTypeId: C.ModelType.Contact,
                    linkedId: me.contactDetails.id,
                    title: 'Transfer Deposit',
                    onComplete: function () { }
                }).show();
                break;

            default:
                break;
        }
    },

    printTimeline: function () {
        var me = this;

        if (!me.contactDetails) return;

        me.contactDetails.printTimeline();
    },

    printTransactions: function (contactId, orderByCreateDate) {
        var me = this;

        if (!me.contactDetails) return;

        me.contactDetails.printTransactions(orderByCreateDate);
    },

    personalInformationRequestDialog: function (
        contactId,
        usePerson2,
        requestType
    ) {
        var title = '';
        if (requestType === 'sar') {
            title = 'Subject Access Request';
        } else {
            title = 'Data Portability Request';
        }

        new gmgps.cloud.ui.controls.window({
            title: title,
            windowId: 'personalInformationRequestModal',
            url: 'Contact/GetPersonalInformationRequestModal',
            urlArgs: {
                contactId: contactId,
                usePerson2: usePerson2,
                requestType: requestType
            },
            post: false,
            width: 600,
            draggable: true,
            modal: true,
            actionButton: 'Download',
            cancelButton: 'Cancel',
            onCancel: function () {
                return false;
            },
            onAction: function () {
                var url = '';
                if (requestType === 'sar') {
                    url = 'Contact/PrintSubjectAccessRequest';
                } else {
                    url = 'Contact/GetDataPortabilityRequest';
                }

                var $form = gmgps.cloud.utility.buildForm(url, {
                    contactId: contactId,
                    usePerson2: usePerson2,
                    requestType: requestType
                });

                $form.submit();
                $form.remove();

                return true;
            }
        });
    },

    personalInformationRequestPersonCheck: function (contactId) {
        var me = this;
        new gmgps.cloud.ui.controls.window({
            title: 'Personal Information Request',
            windowId: 'personalInformationRequestPersonSelectorModal',
            url: 'Contact/GetPersonalInformationRequestPersonSelectorModal',
            urlArgs: {
                contactId: contactId
            },
            post: false,
            width: 300,
            draggable: true,
            modal: true,
            actionButton: 'OK',
            cancelButton: 'Cancel',
            onCancel: function () {
                return false;
            },
            onAction: function ($window) {
                var isPerson2 =
                    parseInt($window.find('#person-selection').val()) === 2;
                var requestType = $window
                    .find("input[name='request-type']:checked")
                    .val();

                me.personalInformationRequestDialog(
                    contactId,
                    isPerson2,
                    requestType
                );

                return true;
            }
        });
    },

    performContactSave: function (args) {
        var me = this;

        if (me.contactDetails.validate() === false) {
            args.onValidationComplete(false);
            return;
        }

        me.beforePutContact(function (success) {
            if (!success) return false;

            args.onValidationComplete(true);

            //gmgps.cloud.utility.showBusy(me.$root.find('.content-container > .content[data-id="detail"]'));

            me.contactDetails.$root.find('input').blur();

            var spinner = showSpinner();

            me.putContact(
                args.$item,
                function (response) {
                    spinner = spinner.hide();

                    var onNewContactAdded = null;

                    //UI and opt-u updates for a brand new contact.
                    if (me.contactDetails.id === 0) {
                        //Remove from cache.
                        shell.cache.del(C.ModelType.Contact, 0);

                        //Update opt-u elements with the new ID (only required for contacts because they can be added directly and not via a form).
                        me.contactDetails.$root
                            .find(
                                '.opt-u[data-modelType={0}][data-id="0"]'.format(
                                    C.ModelType.Contact
                                )
                            )
                            .attr('data-id', response.Data.Id);
                        me.contactDetails.$root
                            .find(
                                '.opt-u[data-modelType={0}][data-contextlinkedid="0"]'.format(
                                    C.ModelType.Contact
                                )
                            )
                            .attr('data-contextlinkedid', response.Data.Id);

                        me.contactDetails.$root
                            .find(
                                '.opt-u[data-contextmodeltypeid="{0}"][data-contextlinkedid="0"]'.format(
                                    C.ModelType.Contact
                                )
                            )
                            .attr('data-contextlinkedid', response.Data.Id);

                        //Display the full tab-column tab set if this contact has been saved for the very first time.
                        var $tc = me.contactDetails.$root.find('.tab-column');
                        $tc.find('li[data-id="overview"]').show();
                        $tc.find('li[data-id="timeline"]').show();
                        $tc.find('li[data-id="documents"]').show();

                        //Can this new contact own property?
                        if (response.Data.CanOwnProperty) {
                            //Show the properties tab-column tab.
                            $tc.find('li[data-id="properties"]').show();
                        }

                        //Populate (replace) the previously locked layers.
                        me.contactDetails.refreshNewContactLayers(
                            response.Data.Id
                        );

                        onNewContactAdded = function () {
                            shell.domainEvents.raise({
                                type: C.DomainEventType.ContactCreated,
                                id: response.Data.Id,
                                intentionId: me.contactDetails.intentionId
                            });
                        };
                    } else {
                        shell.domainEvents.raise({
                            type: C.DomainEventType.ContactUpdated,
                            id: me.contactDetails.id
                        });
                    }

                    //Remove from cache.
                    shell.cache.del(C.ModelType.Contact, response.Data.Id);

                    //Clear the dirty flag and callback to the side panel to notify complete.
                    me.contactDetails.id = response.Data.Id;
                    me.contactDetails.setDirty(false);

                    args.onComplete(response.Data.Id, function () {
                        //Counter change.
                        me.onCounterChangeRequested.raise(
                            me.getUnsavedRecordCount()
                        );
                    });

                    me.contactDetails.onSaved();

                    //Prompt for letters.
                    gmgps.cloud.helpers.general.promptForLetters({
                        eventHeaders: response.UpdatedEvents,
                        onClose: onNewContactAdded
                    });
                },
                function () {
                    // onError
                    spinner = spinner.hide();
                    args.onError && args.onError();
                },
                args.displayAfterSave
            );

            return true;
        });
    },

    getSelectedContactIDs: function (callback) {
        var me = this;

        var contactSearch = jQuery.extend(true, {}, me.lastSearchArgs.search);
        contactSearch.ExcludeIds =
            me.list.selectionMode === C.ListSelectionMode.All;
        contactSearch.Ids = me.list.ids;
        contactSearch.SearchPage.Size = 0;
        contactSearch.Query = ''; // never any need to rerun the search query as we are passing in id's

        new gmgps.cloud.http("contact-getSelectedContactIDs").ajax(
            {
                args: {
                    search: contactSearch
                },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/contact/GetContactIds'
            },
            function (response) {
                if (response.Data.List.length === 0) {
                    showInfo('No contacts were found for provided selection.');
                } else {
                    callback(response.Data.List);
                }
            }
        );
    },

    bulkArchive: function () {
        var me = this;

        var noneSelected =
            (me.list.selectionMode === C.ListSelectionMode.None &&
                me.list.ids.length == 0) ||
            (me.list.selectionMode === C.ListSelectionMode.All &&
                me.list.ids.length == me.list.totalRows);
        if (noneSelected) {
            showInfo('Please select some contacts first.');
            return;
        }

        var archiver = new gmgps.cloud.ui.views.BulkArchiver({
            typeName: 'Contact'
        });

        var search = me.lastSearchArgs.search;

        archiver.archive(me.list, search, function () {
            me._resetSelectedSearchIds();
            me.getList(me.lastSearchArgs);
        });
    },

    bulkDelete: function () {
        var me = this;

        var noneSelected =
            (me.list.selectionMode === C.ListSelectionMode.None &&
                me.list.ids.length == 0) ||
            (me.list.selectionMode === C.ListSelectionMode.All &&
                me.list.ids.length == me.list.totalRows);
        if (noneSelected) {
            showInfo('Please select some contacts first.');
            return;
        }

        var specification = {
            actionName: 'Delete',
            typeName: 'Contact',
            url: '/BulkDelete/Contacts',
            getSuccessAndErrorMessages: function (responseData) {
                var successText =
                    '{0} record{1} {2} been successfully marked for deletion.'.format(
                        responseData.SucceededCount,
                        responseData.SucceededCount === 1 ? '' : 's',
                        responseData.SucceededCount === 1 ? 'has' : 'have'
                    );
                var errorText;
                if (responseData.FailedCount > 0) {
                    errorText =
                        '{0} record{1} could not be marked for deletion.'.format(
                            responseData.FailedCount,
                            responseData.FailedCount === 1 ? '' : 's'
                        );
                }

                return {
                    successText: successText,
                    errorText: errorText
                };
            },
            isReversible: true,
            maximumItems: 5000
        };

        var deleter = new gmgps.cloud.ui.views.BulkAction(specification);

        var search = me.lastSearchArgs.search;

        deleter.action(me.list, search, function () {
            me._resetSelectedSearchIds();
            me.getList(me.lastSearchArgs);
        });
    },

    refreshContact: function (args, selectedLayer, selectedTab) {
        var me = this;

        var details = me.getActiveContactDetails();

        _.forEach(details, function (contactDetails) {
            shell.cache.del(C.ModelType.Contact, contactDetails.id);

            if (contactDetails.id === args.id) {
                me.getContact({
                    id: contactDetails.id,
                    tabColumnTabName: contactDetails.selectedLayer || selectedLayer || 'overview',
                    tabName: contactDetails.tabColumn.tabName || selectedTab,
                    forceRefresh: true,
                });
            } else {
                var contactElementSelector = '.content-container div[data-id="detail"] div[data-id="{0}"].detail, .content-container .opt-u[data-id="{0}"][data-modelType="{1}"]'.format(contactDetails.id, C.ModelType.Contact);
                var contactElementsToRemove = me.$root.find(contactElementSelector);
                contactElementsToRemove.remove();
            }
        });
    },

    _resetSelectedSearchIds: function () {
        var me = this;
        me.lastSearchArgs.ids = [];
    },

    _onDetailsRequest: function (args, tabColumnTabName, tabName) {
        var me = this;

        me.setViewMode('detail');

        //Find the panel item relating to the requested item.
        var $item = me.$root
            .find(
                '.panel .layer[data-id="detail"] ul li[data-type="detail"][data-id="' +
                args.id +
                '"]'
            )
            .not('.hidden');

        if ($item.length == 0) {
            //Clear the detail container.
            me.$root.find('.content[data-id="detail"]').hide();

            if (args.id == 0) {
                //Ensure there is no ID:0 contact hanging around in the local cache.
                shell.cache.del(C.ModelType.Contact, 0);
            }

            //No existing panel item for this record - insert one.
            $item = me.$root
                .find(
                    '.panel .layer[data-id="detail"] ul li[data-type="detail"][data-id="-1"]'
                )
                .clone();
            $item
                .attr('data-id', args.id)
                .addClass('on')
                .find('.content h3')
                .html(args.id == 0 ? 'New Contact' : '');

            if (args.id != 0) $item.attr('data-refresh', 1);

            if (
                me.$root.find('.panel .layer[data-id="detail"] ul li.recent')
                    .length > 0
            ) {
                $item.insertBefore(
                    me.$root
                        .find('.panel .layer[data-id="detail"] ul li.recent')
                        .first()
                );
            } else {
                //Only 1 recent.  Always position at the bottom.
                $item.append($item.siblings().last());
            }
            $item.removeClass('hidden').show();
        } else {
            //Item already exists... move to top of panel (but don't interfere if it's a fav)
            if ($item.hasClass('recent')) {
                if (
                    me.$root.find(
                        '.panel .layer[data-id="detail"] ul li.recent'
                    ).length > 0
                ) {
                    //Only shift position if this item is not already at the top.
                    if (
                        !args.preservePosition &&
                        $item.attr('data-id') !=
                        me.$root
                            .find(
                                '.panel .layer[data-id="detail"] ul li.recent'
                            )
                            .first()
                            .attr('data-id')
                    ) {
                        $item.insertBefore(
                            me.$root
                                .find(
                                    '.panel .layer[data-id="detail"] ul li.recent'
                                )
                                .first()
                        );
                    }
                } else {
                    //Only 1 recent.  Always position at the bottom.
                    $item.append($item.siblings().last());
                }
            }
        }

        //Setup default tab column and tab name, if any.
        var $button = $item.find('.button');
        if (tabColumnTabName) $button.attr('data-tabcolumn', tabColumnTabName);

        if (tabName) $button.attr('data-tab', tabName);

        //Click the panel item.
        $button.trigger('prog-click');
    },

    _onPageRequest: function (args) {
        var me = this;

        var search = me.lastSearchArgs.search;
        search.SearchPage = args.SearchPage;
        search.SearchOrder = args.SearchOrder;

        me.getList({
            ids: args.ids,
            selectionMode: args.selectionMode,
            $panelItem: me.$listPanelItem,
            search: search
        });
    },

    _onPanelItemFilterChanged: function ($item) {
        var me = this;

        //Get the full panel item, only the controls portion is passed in.
        var controlsPortion = $item;
        $item = $item.$root.closest('.item');

        var categoryId =
            $item.find('#Category').length == 1
                ? parseInt($item.find('#Category').val())
                : 0;
        var descriptionTypeId =
            $item.find('#Contact_Type').length == 1
                ? parseInt($item.find('#Contact_Type').val())
                : 0;
        var timePeriodId =
            $item.find('#Created').length == 1
                ? parseInt($item.find('#Created').val())
                : 0;
        var hasPendingOffers = 0;
        var now = new Date();
        var startDate = new Date();
        var endDate = new Date();
        startDate.setHours(0);
        startDate.setMinutes(0);
        startDate.setSeconds(0);
        endDate.setHours(23);
        endDate.setMinutes(59);
        endDate.setSeconds(59);

        var from, to;

        if (timePeriodId < 0) {
            //this is a custom period
            from = $item.find('#time-period-from');
            to = $item.find('#time-period-to');

            if (from.val().length == 0 && to.val().length == 0) {
                //don't run search now, just display datepickers for from and to dates

                $item.find('.time-period-custom').fadeIn();

                from.datepicker({
                    showButtonPanel: true,
                    dateFormat: 'dd/mm/yy'
                });
                to.datepicker({
                    showButtonPanel: true,
                    dateFormat: 'dd/mm/yy'
                });

                from.off('change');
                from.on('change', function () {
                    me._onPanelItemFilterChanged(controlsPortion);
                });

                to.off('change');
                to.on('change', function () {
                    me._onPanelItemFilterChanged(controlsPortion);
                });

                return;
            }

            if (from.val().length != 0 && to.val().length != 0) {
                if (from.datepicker('getDate') > to.datepicker('getDate')) {
                    showInfo(
                        'Please select a from date that is before the to date.'
                    );
                    return;
                }
            }

            //if they have dates then set start and end dates to those dates and proceed
            if (from.val().length > 0) {
                startDate.setYear(from.datepicker('getDate').getFullYear());
                startDate.setMonth(from.datepicker('getDate').getMonth());
                startDate.setDate(from.datepicker('getDate').getDate());
            } else startDate.setYear(2000);

            if (to.val().length > 0) {
                endDate.setYear(to.datepicker('getDate').getFullYear());
                endDate.setMonth(to.datepicker('getDate').getMonth());
                endDate.setDate(to.datepicker('getDate').getDate());
            } else endDate.setYear(3000);
        } else {
            //if not custom i.e. > 0 then we need to hide the datepickers
            from = $item.find('#time-period-from');
            to = $item.find('#time-period-to');
            from.val('');
            to.val('');
            $item.find('.time-period-custom').fadeOut();
        }

        switch (timePeriodId) {
            case C.TimePeriodFilter.Today:
            case C.TimePeriodFilter.Custom:
                break;
            case C.TimePeriodFilter.Yesterday:
                startDate.setDate(now.getDate() - 1);
                endDate.setDate(now.getDate() - 1);
                break;
            case C.TimePeriodFilter.ThisWeek:
                startDate.setDate(now.getDate() - now.getDay());
                break;
            case C.TimePeriodFilter.ThisMonth:
                startDate.setDate(1);
                break;
            case C.TimePeriodFilter.All:
            default:
                startDate.setYear(2000);
                endDate.setYear(3000);
                break;
        }

        var notCompletedMoneyLaundering = 0;
        var moneyLaunderingContactFilter = null;
        var searchId = parseInt($($item).attr('data-id'));
        if (searchId === C.FactorySearchId.NotPassedMoneyLaunderingCheck) {
            notCompletedMoneyLaundering = 1;

            var moneyLaunderingContactFilterSelector = $item.find(
                'select[data-dataname="moneyLaunderingContactFilter"]'
            );
            if (moneyLaunderingContactFilterSelector) {
                moneyLaunderingContactFilter =
                    moneyLaunderingContactFilterSelector.val();
            }
        }

        var options = {
            CategoryIdList: categoryId == 0 ? [] : [categoryId],
            DescriptionTypeIdList:
                descriptionTypeId == 0 ? [] : [descriptionTypeId],
            PropertyRecordType: $item.attr('data-data'),
            CreatedFromDate: timePeriodId != 0 ? startDate : null,
            CreatedToDate: timePeriodId != 0 ? endDate : null,
            HasPendingOffers: hasPendingOffers != 0 ? hasPendingOffers : null,
            HasCompletedMoneyLaunderingChecks:
                notCompletedMoneyLaundering != 0 ? false : null,
            MoneyLaunderingContactFilter: moneyLaunderingContactFilter
        };

        if (searchId === C.FactorySearchId.AdhocMatchGroup) {
            me.panel.adhocMatchGroupSearch = $.extend(
                true,
                {},
                me.panel.adhocMatchGroupSearch,
                options
            );
            delete me.panel.adhocMatchGroupSearch.Consent;
        }

        var search = me.buildContactSearch(
            $item,
            searchId === C.FactorySearchId.AdhocMatchGroup
                ? me.panel.adhocMatchGroupSearch
                : options
        );

        if (searchId !== C.FactorySearchId.SearchResults) {
            me.query = '';
        } else {
            search.Query = me.query;

            search.SearchPage = {
                Index: 1,
                Size: 100
            };
            search.SearchOrder = {
                By: C.SearchOrderBy.SearchScore,
                Type: C.SearchOrderType.Ascending
            };
        }
        me.getList({
            $panelItem: $item,
            search: search
        });
    },

    buildContactSearch: function ($item, options) {
        var me = this;
        options = options === undefined ? {} : options;

        var branches = [];

        if ($item.find('#Branches').length === 1) {
            var branchId = parseInt($item.find('#Branches').val());
            branches = branchId === 0 ? [] : [branchId];

            options.BranchIdList = branches;
        }

        // Build default search parameters based on filters on the control filters
        var consent =
            $item.find('#Consent').length === 1
                ? parseInt($item.find('#Consent').val())
                : 0;
        var includeGeneralMarketing = (consent & 1) !== 0;
        var includePropertyMatching = (consent & 2) !== 0;

        var search = {
            BranchIdList: branches,
            DescriptionTypeIdList: [],
            SearchId: parseInt($item.attr('data-id')),
            Name: $item.find('.content').text(),
            ListType: C.ListType.Standard,
            SearchPage: {
                Index: 1,
                Size: C.SearchPageSize.Default
            },
            SearchOrder: {
                By: C.SearchOrderBy.Created,
                Type: C.SearchOrderType.Descending
            },
            Consent: {
                PropertyMatching: {
                    IncludeGranted: includePropertyMatching
                },
                GeneralMarketing: {
                    IncludeGranted: includeGeneralMarketing
                }
            },
            AllowsBulkArchive:
                $item.attr('data-allowsbulkarchive').toLowerCase() === 'true',
            AllowsBulkDelete:
                $item.attr('data-allowsbulkdelete').toLowerCase() === 'true'
        };

        me.setBuildContactSearchDefaults($item, search);

        search = $.extend(true, {}, search, options);
        return search;
    },

    setBuildContactSearchDefaults: function ($item, options) {
        var searchId = parseInt($item.attr('data-id'));

        if (searchId == C.FactorySearchId.ConvertedFromLeads) {
            options.SearchOrder.By = C.SearchOrderBy.LastEditDate;
        }
    },

    _panelItemClicked: function (args) {
        var me = this;
        var id = parseInt(args.$item.attr('data-id'));

        me.$root.validationEngine('hideAll');

        switch (args.$item.attr('data-type')) {
            case 'detail':
                if (!args.selected) {
                    me.persistContact();
                }

                me.getContact(
                    {
                        id: id,
                        tabColumnTabName: args.$item
                            .find('.button')
                            .attr('data-tabcolumn'),
                        tabName: args.$item.find('.button').attr('data-tab'),
                        forceRefresh: args.selected,
                        onComplete: function () {
                            if (args.onComplete) {
                                args.onComplete();
                            }

                            if (args.eventType === 'auto-navigate') {
                                alto.router.navigationComplete('entity-layer', {
                                    collection: 'contacts',
                                    id: id,
                                    layer: 'overview'
                                });
                            }
                        }
                    },
                    function () {
                        me.onCounterChangeRequested.raise(
                            me.getUnsavedRecordCount()
                        );
                    },
                    function () {
                        if (args.onError) args.onError();
                    }
                );

                me.$contactPanelItem = args.$item;

                googleAnalytics.sendEvent(
                    'contacts',
                    'list_click',
                    'contact_item'
                );
                break;

            case 'list':
                me.persistContact();
                me.$listPanelItem = args.$item;

                if (me.stepThroughHandler.canNavigate()) {
                    me.stepThroughHandler
                        .navigate(id, C.StepThroughDirection.Current)
                        .done(function () {
                            args.onComplete();
                        });
                    return;
                }

                var search = me.buildContactSearch(
                    args.$item,
                    id === C.FactorySearchId.AdhocMatchGroup
                        ? me.panel.adhocMatchGroupSearch
                        : {}
                );

                switch (id) {
                    case C.FactorySearchId.NotPassedMoneyLaunderingCheck:
                        var contactPicker = args.$item.find('#Contact_Type');
                        contactPicker.trigger('prog-change');
                        search.DescriptionTypeIdList.push(contactPicker.val());
                        search.HasCompletedMoneyLaunderingChecks = false;

                        var moneyLaunderingContactFilterSelector =
                            args.$item.find(
                                'select[data-dataname="moneyLaunderingContactFilter"]'
                            );
                        if (moneyLaunderingContactFilterSelector) {
                            search.MoneyLaunderingContactFilter =
                                moneyLaunderingContactFilterSelector.val();
                        }

                        break;
                }

                switch (id) {
                    case C.FactorySearchId.SearchResults: //search
                        me.clearSearchResults();
                        me.onSearchBoxFocusRequest.raise();
                        args.onComplete();
                        alto.router.navigationChanged('groups', {
                            collection: 'contacts',
                            name: me.$listPanelItem.attr('data-unique-id')
                        });
                        break;

                    default:
                        me.query = '';
                        me.getList(
                            {
                                $panelItem: args.$item,
                                search: search
                            },
                            function () {
                                args.onComplete();
                                alto.router.navigationChanged('groups', {
                                    collection: 'contacts',
                                    name: me.$listPanelItem.attr(
                                        'data-unique-id'
                                    )
                                });
                            }
                        );
                        break;
                }
                break;
            case 'newselectionaction':
                args.onComplete();
                break;
            default:
                args.onComplete();
                break;
        }
    },

    _panelStepThroughClicked: function ($item) {
        var me = this;
        me.stepThroughHandler.stepThroughButtonClicked(
            $item,
            me.lastSearchArgs,
            me.list.ids
        );
    },

    _beforeSearchBoxFocusRequest: function ($searchBox) {
        var me = this;

        return me.stepThroughHandler.onMatchGroupLosingFocus($searchBox);
    },

    _panelItemStarred: function () {
        return false;
    },

    _panelItemSaved: function (args) {
        var me = this;
        me.performContactSave(args);
    },

    _panelItemUndone: function (args) {
        var me = this;

        var isSelectedItem = args.$item.hasClass('on');
        var id = parseInt(args.$item.attr('data-id'));

        //If this was a new record (unsaved), clear the details section.
        if (id === 0) {
            me.$root
                .find('.content-container > .content[data-id="detail"]')
                .empty();
        }

        //If this is the selected item, remove dirty flag.
        if (isSelectedItem) {
            me.contactDetails.setDirty(false);
        }

        //Remove the item from local storage.
        shell.cache.del(C.ModelType.Contact, id);

        args.$item.addClass('tag-do-not-persist');

        gmgps.cloud.helpers.user.deleteUnsavedData(
            C.ModelType.Contact,
            id,
            function () {
                if (!args.silent) {
                    $.jGrowl('Changes to contact were undone.', {
                        header: 'Undo Changes',
                        theme: 'growl-contact'
                    });
                }
                args.onSuccess();
                me.onCounterChangeRequested.raise(me.getUnsavedRecordCount());
            }
        );

        return false;
    },

    getUnsavedRecordCount: function () {
        var me = this;
        return me.$root.find(
            '.panel .layer[data-id="detail"] .item[data-isdirty="1"]'
        ).length;
    },

    _contactDetailsChanged: function (id) {
        var me = this;
        me.panel.showSaveButton({
            id: id,
            modelType: C.ModelType.Contact,
            show: true,
            callback: function () {
                me.onCounterChangeRequested.raise(me.getUnsavedRecordCount());
            }
        });
    },

    showMatchGroup: function (name) {
        var me = this;

        me.$root.find('.content[data-id="detail"]').hide();
        me.setViewMode('list');
        
        var $matchGroupItem = me.$root.find(
            '.panel .layer[data-id="list"] ul li[data-type="list"][data-unique-id="' +
            name +
            '"]'
        );

        $matchGroupItem.find('.button').trigger('prog-click');
    },

    show: function (viewMode) {
        var me = this;
        me.$root.show();
        me.setViewMode(viewMode);
    },

    setViewMode: function (viewMode, withEmpty) {
        var me = this;

        if (me.cfg.viewMode == viewMode) {
            return;
        } else {
            me.cfg.viewMode = viewMode;
        }

        //Display the panel for this view
        me.panel.showLayer(viewMode);

        me.$root.find('.content-container > div').hide();

        var $content = me.$root.find(
            '.content-container > .content[data-id="' + viewMode + '"]'
        );

        if (withEmpty) $content.empty();

        $content.show();

        var menuMode = me.stepThroughHandler.stepThroughModeActive
            ? 'detail'
            : viewMode;

        me.onViewModeChanged.raise({
            newViewMode: viewMode,
            menuMode: menuMode,
            showMenu: true,
            group: 'contact'
        });

        if (viewMode === 'list' && me.$listPanelItem) {
            alto.router.navigationChanged('groups', {
                collection: 'contacts',
                name: me.$listPanelItem.attr('data-unique-id')
            });
        } else if (
            viewMode === 'detail' &&
            me.contactDetails &&
            !me.contactDetails.cfg.inStepThrough
        ) {
            alto.router.navigationChanged('entity', {
                collection: 'contacts',
                id: me.contactDetails.id
            });
        }
    },

    setupToolbar: function () {
        var me = this;

        var bulkActionsMenuButton = me.shell.toolbar.$root.find(
            '.group[data-group="contact"] div.btn.droppable[data-id="bulk-actions"]'
        );

        if (!me.shouldShowBulkActionsMenuButton()) {
            bulkActionsMenuButton.hide();
            return;
        }

        me.showOrHideBulkArchiveMenuItem();

        me.showOrHideBulkDeleteMenuItem();

        bulkActionsMenuButton.show();
    },

    shouldShowBulkActionsMenuButton: function () {
        var me = this;

        return (
            me.shouldShowBulkArchiveMenuItem() ||
            me.shouldShowBulkDeleteMenuItem()
        );
    },

    shouldShowBulkArchiveMenuItem: function () {
        var me = this;

        if (me.lastSearchArgs && me.lastSearchArgs.search) {
            return me.lastSearchArgs.search.AllowsBulkArchive;
        }
        return false;
    },

    shouldShowBulkDeleteMenuItem: function () {
        var me = this;
        if (me.lastSearchArgs && me.lastSearchArgs.search) {
            return me.lastSearchArgs.search.AllowsBulkDelete;
        }

        return false;
    },

    showOrHideBulkArchiveMenuItem: function () {
        var me = this;

        if (me.shouldShowBulkArchiveMenuItem()) {
            me.showMenuItem('bulk-archive');
            return;
        }

        me.hideMenuItem('bulk-archive');
    },

    showOrHideBulkDeleteMenuItem: function () {
        var me = this;

        if (me.shouldShowBulkDeleteMenuItem()) {
            me.showMenuItem('bulk-delete');
            return;
        }

        me.hideMenuItem('bulk-delete');
    },

    showMenuItem: function (dataId) {
        var selector =
            '.group .contextual .sub-menu li[data-id="' + dataId + '"]';

        var menuItem = $(selector);

        if (menuItem !== undefined && menuItem !== null) {
            menuItem.show();
        }
    },

    hideMenuItem: function (dataId) {
        var selector =
            '.group .contextual .sub-menu li[data-id="' + dataId + '"]';

        var menuItem = $(selector);

        if (menuItem !== undefined && menuItem !== null) {
            menuItem.hide();
        }
    },

    getList: function (args, onSuccess) {
        var me = this;

        me.lastSearchArgs = args;

        me.setupToolbar();

        new gmgps.cloud.http("contact-getList").ajax(
            {
                args: args.search,
                complex: true,
                dataType: 'json',
                type: 'post',
                background: true,
                url: '/Contact/GetContactList',
                listType: C.ListType.Standard
            },
            function (response) {
                me.lastSearchArgs.search.TotalRows = parseInt(
                    $('<span>{0}</span'.format(response.Data))
                        .find('#TotalRows')
                        .val()
                );
                me.displayList(
                    response,
                    args.$panelItem,
                    args.ids,
                    args.selectionMode,
                    args.search.Query,
                    args.disablePaging
                );
                if (onSuccess) {
                    onSuccess();
                }
            }
        );
    },

    create: function () {
        var me = this;
        me._onDetailsRequest({
            id: 0
        });
        return;
    },

    getContact: function (args, onSuccess) {
        var me = this;

        me.onToolbarSetContext.raise({
            group: 'contact',
            type: 'detail',
            id: args.id,
            modelType: C.ModelType.Contact
        });

        //Check cache first.
        var object;
        if (!args.forceRefresh) {
            object = shell.cache.get(C.ModelType.Contact, args.id);
            if (object && object.html) {
                me.displayContact({
                    Data: object.html,
                    id: args.id,
                    tabColumnTabName: object.uiState.tabColumnTabName,
                    tabName: object.uiState.tabName,
                    loadedFromCache: true,
                    onComplete: args.onComplete
                });

                if (onSuccess) onSuccess();

                return;
            }
        }

        var tabColumnTabName = object
            ? object.uiState.tabColumnTabName
            : args.tabColumnTabName
                ? args.tabColumnTabName
                : 'overview';

        //Fetch from server
        var url = 'Contact/GetContact';
        new gmgps.cloud.http("contact-getContact").ajax(
            {
                args: {
                    DefaultLayer: tabColumnTabName,
                    ContactId: args.id
                },
                complex: true,
                background: true,
                dataType: 'json',
                type: 'post',
                url: url
            },
            function (response) {
                me.displayContact({
                    Data: response.Data.Html
                        ? response.Data.Html
                        : response.Data,
                    id: args.id,
                    tabColumnTabName: response.Data.Html
                        ? null
                        : tabColumnTabName,
                    tabName: object ? object.uiState.tabName : args.tabName,
                    loadedFromCache: false,
                    layersLoaded: response.Data.Html ? true : false,
                    onComplete: args.onComplete
                });

                if (onSuccess) onSuccess();
            },
            function () {
                me.$root
                    .find('.content-container > .content[data-id="detail"]')
                    .empty();
            }
        );
    },

    reindexMedias: function ($form) {
        var subscript = 0;
        var groups = ['.contact .contactdoc'];
        for (var group in groups) {
            var orderIndex = 1;
            $form.find(groups[group]).each(function (arrayIndex, value) {
                $(value)
                    .find('input.forindex')
                    .each(function (inputIndex, value) {
                        var name = $(value).attr('name');
                        name = name.replace('[]', '[' + subscript + ']');
                        $(value).attr('name', name);

                        if (name.indexOf('OrderIndex') != -1) {
                            $(value).val(orderIndex);
                            orderIndex++;
                        }
                    });
                subscript++;
            });
        }
    },

    reindexSuppliers: function ($form) {
        $form.find('.suppliers .contact-row').each(function (arrayIndex, v) {
            //Each input
            $(v)
                .find('input,textarea,select')
                .each(function (inputIndex, value) {
                    var name = $(value).attr('name');
                    name = name.replace(
                        'Contact.Relationships[]',
                        'Contact.Relationships[' + arrayIndex + ']'
                    );
                    $(value).attr('name', name);
                });
        });
    },

    reindexAddresses: function ($form) {
        $form.find('.addresses .contact-row').each(function (arrayIndex, v) {
            //Each input
            $(v)
                .find('input,textarea,select')
                .each(function (inputIndex, value) {
                    var name = $(value).attr('name');
                    if (name !== undefined) {
                        name = name.replace(
                            'Addresses.Contacts[]',
                            'Addresses.Contacts[' + arrayIndex + ']'
                        );
                        $(value).attr('name', name);
                    }
                });
        });

        //Remove empty phones and emails.
        $form
            .find(
                '.addresses .contact-row .personal-contact .phones input.phone'
            )
            .each(function (i, v) {
                var s = $.trim($(v).val());
                if (s == '') $(v).closest('.row').remove();
            });

        $form
            .find(
                '.addresses .contact-row .personal-contact .email-addresses input.email'
            )
            .each(function (i, v) {
                var s = $.trim($(v).val());
                if (s == '') $(v).closest('.row').remove();
            });

        reindexHtmlArray(
            $form,
            '.addresses .contact-row .personal-contact .phones div[data-type="phone"]'
        );
        reindexHtmlArray(
            $form,
            '.addresses .contact-row .personal-contact .email-addresses div[data-type="email"]'
        );
    },

    reindexClientAccounts: function ($form) {
        // Utilities
        $form
            .find('.client-accounts .body .opt-u.row')
            .each(function (arrayIndex, v) {
                //Each input
                $(v)
                    .find('input,textarea,select')
                    .each(function (inputIndex, value) {
                        var name = $(value).attr('name');
                        name =
                            'ClientAccounts.Accounts[' +
                            arrayIndex +
                            '].' +
                            name;
                        $(value).attr('name', name);
                    });
            });
    },

    getPageContactHtmlVersion: function () {
        var me = this;
        return parseInt(
            me.$root
                .find('.content-container > .content .detail')
                .attr('data-htmlversion')
        );
    },

    contactHtmlIsOutOfDate: function () {
        var me = this;
        return (
            me.getPageContactHtmlVersion() <
            shell.getCurrentContactHtmlVersion()
        );
    },

    emailAddressIsUsedForPropertyFile: function () {
        var me = this;
        return me.contactDetails.emailAddressIsUsedForPropertyFile();
    },

    // check for client account changes (removed accounts or default account changed).Not required on new contact as they wont have properties yet
    checkForClientAccountChanges: function (onComplete) {
        var me = this;

        if (shell.pmInstalled && me.contactDetails.id !== 0) {
            me.promptClientAccountChanges().then(function () {
                me.promptDefaultClientAccountChanged().then(function () {
                    me.promptSuppliersAdded().then(function () {
                        onComplete(true);
                    });
                });
            });
        } else {
            onComplete(true);
        }
    },

    beforePutContact: function (onComplete) {
        var me = this;

        if (me.contactHtmlIsOutOfDate()) {
            showInfo(
                'Updates to Alto mean that this contact is now out of date so cannot be saved. Please Undo your changes and refresh to get the latest property changes'
            );
            onComplete(false);
        }

        // check for client account changes (removed accounts or default account changed).Not required on new contact as they wont have properties yet
        if (me.emailAddressIsUsedForPropertyFile()) {
            ShowAreYouSure(
                'Change the email associated with PropertyFile',
                'You are changing the email address used by the contact to log in to PropertyFile. ' +
                'If you select SAVE, the Contact will lose access to PropertyFile and will be re-invited using this new email address. ' +
                'If there is no email address, the contact will have their PropertyFile account deactivated.',
                function () {
                    me.checkForClientAccountChanges(onComplete);
                },
                function () {
                    onComplete(false);
                }
            );
        } else {
            me.checkForClientAccountChanges(onComplete);
        }
    },

    putContact: function ($item, onSuccess, onError) {
        var me = this;

        var $form = createForm(
            me.contactDetails.$root,
            '/contactupdate/receive'
        );

        //Remove empty phones and emails.
        $form.find('.phones input.phone').each(function (i, v) {
            var s = $.trim($(v).val());
            if (s == '') $(v).closest('.row').remove();
        });
        $form.find('.email-addresses input.email').each(function (i, v) {
            var s = $.trim($(v).val());
            if (s == '') $(v).closest('.row').remove();
        });

        // reindex media
        me.reindexMedias($form);

        //Re-index phones and emails.
        reindexHtmlArrayV2($form, '.person-1 .phones div[data-type="phone"]');
        reindexHtmlArray(
            $form,
            '.person-1 .email-addresses div[data-type="email"]'
        );
        reindexHtmlArrayV2($form, '.person-2 .phones div[data-type="phone"]');
        reindexHtmlArray(
            $form,
            '.person-2 .email-addresses div[data-type="email"]'
        );
        reindexHtmlArray($form, '.services .tickbox.ticked');

        //Prep client-specific data.
        var contactCategoryId = parseInt($form.find('#Contact_Category').val());
        if (contactCategoryId == C.ContactCategory.Client) {
            me.reindexApplicantRequirements($form);
            me.insertCodedItemsHtml($form);
        }

        if (contactCategoryId == C.ContactCategory.Supplier) {
            me.contactDetails.possiblyInsertNewSupplier($form);
        }

        me.collatePropertyFilePropertyExclusions($form);
        me.collatePropertyFileTenancyExclusions($form);

        if (shell.pmInstalled) {
            me.reindexAddresses($form);
            me.reindexSuppliers($form);
            me.reindexClientAccounts($form);
        }

        $form.find('.app-info').remove();
        //Send data.
        new gmgps.cloud.http("contact-putContact").postForm(
            $form,
            function (response) {
                var contactId = response.Data.Id;

                if (me.contactDetails.id == 0) {
                    //First time save of a contact, reload the record in order to get all the applicable layers.
                    // - Also, clear any id:0 from the cache.
                    $item.remove();

                    gmgps.cloud.helpers.contact.editContact({
                        id: contactId
                    });
                }

                me.promptForFSReferral($form, contactId, function () {
                    me.promptForSolicitorReferral($form, contactId);
                });

                if (onSuccess) {
                    onSuccess(response);
                }

                // always deterministically update contactDetails hidden form elements from a submit response
                me.update(response.Data);
            },
            function (errResponse) {
                if (onError) {
                    onError(errResponse);
                }
            }
        );
    },

    promptForFSReferral: function ($form, contactId, onComplete) {
        var me = this;

        //return; //parked #27 sep 2013 (pb)

        var referredByUserId = parseInt(
            $form.find('#Contact_Applicant_FSReferredByUserId').val()
        );

        //Get the current and original FS referral values.
        var internalId =
            $form.find('#Contact_Applicant_FSReferredToUserId').val() == null
                ? 0
                : parseInt(
                    $form.find('#Contact_Applicant_FSReferredToUserId').val()
                );
        var externalId = parseInt(
            $form.find('#Contact_Applicant_FSReferredToContactId').val()
        );
        var originalInternalId = parseInt(
            $form
                .find('#Contact_Applicant_FSReferredToUserId')
                .attr('data-originalValue')
        );
        var originalExternalId = parseInt(
            $form
                .find('#Contact_Applicant_FSReferredToContactId')
                .attr('data-originalValue')
        );

        var fsEnabled =
            $form.find('#Contact_Applicant_FSStatusId').prop('disabled') !==
            true;

        //If either the internal or external referral values have changed (and they are not both zero) then offer to create an FS referral.
        if (
            fsEnabled &&
            (internalId != originalInternalId ||
                externalId != originalExternalId) &&
            !(internalId == 0 && externalId == 0) &&
            referredByUserId !== 0
        ) {

            var referral = me.contactDetails.getFinancialServicesReferral();

            //Internal referral.
            // - Allow an appointment to be created.
            gmgps.cloud.helpers.contact.createFSReferral({
                contactId: contactId,
                linkedId: internalId != 0 ? internalId : externalId,
                isInternalReferral: internalId != 0,
                referringUserId: referral.referredByUserId,
                notes: referral.nonReferralNotes,
                onComplete: onComplete
            });
        } else {
            if (onComplete) {
                onComplete();
            }
        }
    },

    promptForSolicitorReferral: function ($form, contactId) {
        var me = this;

        if ($form.find('#SolicitorReferredExt').prop('disabled')) return;

        //Get the current and original FS referral values.
        var internalId =
            $form.find('#Contact_Applicant_SolicitorReferredToUserId').val() ==
                null
                ? 0
                : parseInt(
                    $form
                        .find('#Contact_Applicant_SolicitorReferredToUserId')
                        .val()
                );
        var externalId = parseInt(
            $form.find('#Contact_Applicant_SolicitorReferredToContactId').val()
        );
        var originalInternalId = parseInt(
            $form
                .find('#Contact_Applicant_SolicitorReferredToUserId')
                .attr('data-originalValue')
        );
        var originalExternalId = parseInt(
            $form
                .find('#Contact_Applicant_SolicitorReferredToContactId')
                .attr('data-originalValue')
        );

        //If either the internal or external referral values have changed (and they are not both zero) then offer to create an solicitor referral.
        if (
            (internalId != originalInternalId ||
                externalId != originalExternalId) &&
            !(internalId == 0 && externalId == 0)
        ) {
            //Internal referral.
            // - Allow an appointment to be created.
            gmgps.cloud.helpers.contact.createSolicitorReferral({
                contactId: contactId,
                linkedId: internalId != 0 ? internalId : externalId,
                isInternalReferral: internalId != 0,
                notes: me.contactDetails.getSolicitorReferralNotes()
            });
        }
    },
    //Update contact layers based on returned contact object from the server after a save.
    update: function (c) {
        var me = this;

        //Id
        me.id = c.Id;
        me.contactDetails.setContactId(c.Id);

        //Version Number
        me.contactDetails.setVersion(c.VersionNumber);

        //FS Referral (applicants only)
        if (c.Applicant) {
            me.contactDetails.updateReferralValues(c);
        }

        var $mediaLayer = me.contactDetails.getLayer('documents');

        $.each(c.Medias, function (i, media) {

            var $media = $mediaLayer.find('.contactdoc[data-id="' + media.Id + '"]');
            if (!$media.length) {
                $media = $mediaLayer.find('.contactdoc[data-id="' + media.TemporaryId + '"]');
            }

            if ($media) {
                $media.attr('data-id', media.Id);
                $media.find('input[name="Contact.Medias[].Id"]').val(media.Id);
                $media
                    .find('input[name="Contact.Medias[].TempGuid"]')
                    .val(media.TempGuid);
                $media
                    .find('input[name="Contact.Medias[].FileName"]')
                    .val(media.FileName);
                $media
                    .find('input[name="Contact.Medias[].FileTypeId"]')
                    .val(media.FileTypeId);
                $media
                    .find('input[name="Contact.Medias[].MediaTypeId"]')
                    .val(media.MediaTypeId);
                $media
                    .find('input[name="Contact.Medias[].Height"]')
                    .val(media.Height);
                $media
                    .find('input[name="Contact.Medias[].Width"]')
                    .val(media.Width);
                $media
                    .find('input[name="Contact.Medias[].FileStorageId"]')
                    .val(media.FileStorageId);
                $media.find('.media-url').val(media.Url);

                $media.find('.doc-url').attr('href', media.Url);
            }
        });

        //Update the toolbar.
        me.contactDetails.id = c.Id;

        // until the HiddenFields.cshtml can be signalR refreshed upon first save, we need to populate supplier hiddens from the returned object

        if (c.Supplier) {
            me.contactDetails.upsertSupplierInfo(c.Supplier);
        }

        me.contactDetails.setupToolbar();
    },
    insertSupplierHiddenFields: function ($form, s) {
        var fields = [];

        fields.push(
            '<input type="hidden" name="Contact.Supplier.Id" value="' +
            s.Id +
            '"/>'
        );
        fields.push(
            '<input type="hidden" name="Contact.Supplier.GroupId" value="' +
            s.GroupId +
            '"/>'
        );
        fields.push(
            '<input type="hidden" name="Contact.Supplier.RecordId" value="' +
            s.RecordId +
            '"/>'
        );
        fields.push(
            '<input type="hidden" name="Contact.Supplier.ContactId" value="' +
            s.ContactId +
            '"/>'
        );
        fields.push(
            '<input type="hidden" name="Contact.Supplier.VersionNumber" value="' +
            s.VersionNumber +
            '"/>'
        );

        $form.append(fields.join(''));
    },

    updateSupplierHiddenFields: function (s) {
        var me = this;
        me.contactDetails.updateSupplierHiddenFields(s);
    },

    insertNewSupplierHtml: function ($form) {
        // ensures a Contact.Supplier object is returned for the new supplier
        $form.append(
            '<input type="hidden" name="Contact.Supplier.Id" value="0"/>'
        );
    },

    insertCodedItemsHtml: function ($form) {
        var html = '';

        //Each populated requirement profile.
        $form
            .find('.contact-requirements-tabs .profile-tab.tag-populated')
            .each(function (tabIndex, tab) {
                var codedItemIndex = 0;
                var total = 0;
                var $selectedItems;
                var t =
                    '<input type="hidden" name="Contact.Applicant.Requirements[{0}].CodedItems[{1}].{2}" value="{3}"/>';

                //Add codeditems (subtypes)
                $selectedItems = $(tab).find(
                    '.types-tree li[data-type="subType"].jstree-checked'
                );
                total = $(tab).find(
                    '.types-tree li[data-type="subType"]'
                ).length;
                if (
                    $selectedItems.length > 0 &&
                    $selectedItems.length < total
                ) {
                    $selectedItems.each(function (i, v) {
                        html += t.format(
                            tabIndex,
                            codedItemIndex,
                            'RequirementId',
                            0
                        );
                        html += t.format(
                            tabIndex,
                            codedItemIndex,
                            'TypeId',
                            C.CodeListSubType.PropertySubType
                        );
                        html += t.format(
                            tabIndex,
                            codedItemIndex,
                            'InstanceId',
                            $(v).attr('data-id')
                        );
                        codedItemIndex++;
                    });
                    $(tab).append(html);
                }

                //Add codeditems (features)
                $selectedItems = $(tab).find(
                    '.checklist[data-type="features"] input[type="checkbox"]:checked'
                );
                total = $(tab).find(
                    '.checklist[data-type="features"] input[type="checkbox"]'
                ).length;
                if (
                    $selectedItems.length > 0 &&
                    $selectedItems.length < total
                ) {
                    $selectedItems.each(function (i, v) {
                        html += t.format(
                            tabIndex,
                            codedItemIndex,
                            'RequirementId',
                            0
                        );
                        html += t.format(
                            tabIndex,
                            codedItemIndex,
                            'TypeId',
                            $(v).attr('data-type')
                        );
                        html += t.format(
                            tabIndex,
                            codedItemIndex,
                            'InstanceId',
                            $(v).attr('data-id')
                        );
                        codedItemIndex++;
                    });
                }

                //Add codeditems (matchareas)
                $selectedItems = $(tab).find(
                    '.jstree[data-type="match-areas"] li[data-type="subType"].jstree-checked'
                );
                total = $(tab).find(
                    '.jstree[data-type="match-areas"] li[data-type="subType"]'
                ).length;
                if (
                    $selectedItems.length > 0 &&
                    $selectedItems.length < total
                ) {
                    var areaIds = $selectedItems
                        .map(function () {
                            return parseInt($(this).attr('data-id'));
                        })
                        .get()
                        .unique();
                    $.each(areaIds, function (i, areaId) {
                        html += t.format(
                            tabIndex,
                            codedItemIndex,
                            'RequirementId',
                            0
                        );
                        html += t.format(
                            tabIndex,
                            codedItemIndex,
                            'TypeId',
                            C.CodeListSubType.MatchArea
                        );
                        html += t.format(
                            tabIndex,
                            codedItemIndex,
                            'InstanceId',
                            areaId
                        );
                        codedItemIndex++;
                    });
                }

                $(tab).append(html);
            });
    },

    reindexApplicantRequirements: function ($form) {
        $form
            .find('.contact-requirements-tabs .profile-tab.tag-populated')
            .each(function (tabIndex, tab) {
                $(tab)
                    .find('input,select,textarea')
                    .each(function (inputIndex, input) {
                        var name = $(input).attr('name');
                        if (name != undefined) {
                            //Remove "requirement" prefix (it is re-added on the next line).
                            name = name.replace('Requirement.', '');

                            // RentalPriceFrequency has an appended underscore to make radio groups for each requirement tab. Remove now
                            var idx = name.indexOf('_');
                            if (idx !== -1) name = name.substring(0, idx);

                            if ($(input).val() == 'on') $(input).val('true');

                            var newName =
                                'Contact.Applicant.Requirements[' +
                                tabIndex +
                                '].' +
                                name;
                            $(input).attr('name', newName);
                        }
                    });
            });
    },

    persistContact: function () {
        var me = this;

        if (!me.contactDetails) {
            return; //Nothing loaded at present.
        }

        //Put to local cache?
        if (
            me.contactDetails.viewChanged &&
            !me.contactDetails.dirtyLimitLock
        ) {
            //Persist unsaved record.
            var $contactDetails = me.$root.find(
                '.content-container > .content[data-id="detail"]'
            );
            var contactId = parseInt(
                $contactDetails.find('.detail').attr('data-id')
            );

            // check that there was previous record and not coming from undo of a new client
            if (!contactId) return;

            var versionNumber = $contactDetails
                .find('#Contact_VersionNumber')
                .val();

            var t1 = me.$root.find('.tab-column li.selected').attr('data-id');
            var t2 = me.$root
                .find(
                    '.layers .layer[data-id="' +
                    t1 +
                    '"] .tabs .ui-tabs-selected a'
                )
                .attr('href');
            if (t2) t2 = t2.replace('#', '').replace('-tab', '');

            contactId = parseInt(
                $contactDetails.find('.detail').attr('data-id')
            );
            var html = $contactDetails.formhtml();
            var isDirty =
                $contactDetails.find('#IsDirty').val().toLowerCase() === 'true';

            if (contactId !== me.contactDetails.id) return;

            //Clear information that will not be persisted.
            $contactDetails.find('#match-list').empty();

            //Add to cache.
            shell.cache.put({
                modelType: C.ModelType.Contact,
                id: contactId,
                versionNumber: versionNumber,
                html: html,
                isDirty: isDirty,
                uiState: { tabColumnTabName: t1, tabName: t2 },
                description: $contactDetails.find('#_description').val()
            });
        } else {
            //Nothing dirty and the view is unchanged.
            return;
        }
    },

    dirtyLimitCheck: function () {
        var me = this;

        var dirtyCount = me.getUnsavedRecordCount();

        //Disallow changes to a 4th record if there are already 3 unsaved records - though allow further changes to the original 3.
        if (dirtyCount >= 3 && !me.contactDetails.isDirty) {
            me.contactDetails.dirtyLimitLock = true; //This lock is used to stop any partial change from being cached.

            if (!me.dirtyLimitLock) {
                me.dirtyLimitLock = true; //This lock ensures that the msg below is shown only once at a time, even if multiple events fire.
                showInfo(
                    'There are three unsaved contacts in your recent and favourites list.<br><br>Please Save or Undo changes on one of those records before making further changes.',
                    null,
                    null,
                    function () {
                        me.dirtyLimitLock = false;
                    }
                );
            }
            return false;
        }

        return true;
    },

    displayContact: function (args) {
        var me = this;
        console.debug('Displaying contact details...');
        var $detailContainer = me.$root.find(
            '.content-container > .content[data-id="detail"]'
        );

        gmgps.cloud.angular.destroyChildScopes($detailContainer[0]);

        $detailContainer[0].innerHTML = args.Data;
        $detailContainer.show();

        //Create a contactDetails object to look after this content.
        me.contactDetails = new gmgps.cloud.ui.views.contactDetails({
            id: args.id,
            $root: $detailContainer,
            loadedFromCache: args.loadedFromCache,
            tabLayerToLoad: args.tabColumnTabName,
            dirtyLimitCheckCallback: function () {
                return me.dirtyLimitCheck();
            },
            onComplete: function () {
                if (args.onComplete) {
                    args.onComplete()
                }

                alto.application.events.raise('view-loaded', $detailContainer[0], { viewName: 'contact', type: 'detail', id: args.id });
            }
        });

        me.stepThroughHandler.updateDetailsHandler(me.contactDetails);

        //If this is a new contact, set dirty now.
        if (args.id === 0) {
            me.contactDetails.setDirty(0);
        }

        //ContactDetails > Changed
        me.contactDetails.onChanged.handle(function () {
            me._contactDetailsChanged(args.id);
        });

        //Callback for changes to the tab column label (future)
        me.contactDetails.onTabColumnItemLabelChangeRequest.handle(function (
            args
        ) {
            var $tab = me.$root.find(
                '.tab-column li[data-id="' + args.id + '"]'
            );
            $tab.html(
                args.value +
                ($tab.hasClass('selected')
                    ? '<div class="pointer"></div>'
                    : '')
            );
        });

        // If no explicit tabColumnTab was passed in, hide all layers and show the default.
        if (!args.tabColumnTabName) {
            //If new, default to the contactinfo layer, else the overview layer.
            if (args.id == 0) args.tabColumnTabName = 'contactinfo';
            else if (!args.loadedFromCache)
                //for contacts, full state is preserved so only set overview as the default layer if this was not loaded from the cache.
                args.tabColumnTabName = 'overview';
        }

        //Server sends the default tab column usually.  However, this can be overridden with arg.tabColumnTabName
        if (
            args.tabColumnTabName &&
            me.contactDetails.selectedLayer !== args.tabColumnTabName
        ) {
            me.contactDetails.tabColumn.selectTab(args.tabColumnTabName);
            me.contactDetails.tabName = args.tabName; //picked up later.
        }

        //Ask the panel to display the save/undo buttons if this record is dirty.
        if (me.contactDetails.isDirty)
            me.panel.showSaveButton({
                id: args.id,
                modelType: C.ModelType.Contact,
                show: true
            });
    },

    refreshLayer: function (id, layerName) {
        var me = this;
        if (me.contactDetails.id === id) {
            me.contactDetails.refreshLayer(layerName);
        }
    },
    getActiveContactDetails: function () {
        var me = this;
        var details = [];

        if (!me.contactDetails) return details;

        if (me.stepThroughHandler.stepThroughModeActive) {
            details.push(me.stepThroughHandler.activeMatchGroup.detailsHandler);
            details.push(me.stepThroughHandler.savedDetailsHandler);
        } else {
            details.push(me.contactDetails);
        }
        return details;
    },

    propertyFileTabPnUpdate: function (id) {
        var me = this;

        var details = me.getActiveContactDetails();

        $.each(details, function (i, contactDetails) {
            if (contactDetails.id === id) {
                contactDetails.forceReloadPropertyFileTab();
            }
        });
    },

    pnResizeUI: function (id) {
        var me = this;

        var details = me.getActiveContactDetails();

        $.each(details, function (i, contactDetails) {
            if (contactDetails.id === id) {
                contactDetails.sizeUI();
            }
        });
    },
    pnUpdateToolbar: function (id) {
        var me = this;

        var details = me.getActiveContactDetails();

        $.each(details, function (i, contactDetails) {
            if (contactDetails.id === id) {
                contactDetails.setupToolbar();
                contactDetails.setupUIForCategory();
            }
        });
    },

    pnTimeLineUpdate: function (id) {
        var me = this;

        var details = me.getActiveContactDetails();

        $.each(details, function (i, contactDetails) {
            if (contactDetails.id === id) {
                contactDetails.refreshTimeline(1);
            }
        });
    },

    pnRefreshPaymentGroups: function (id) {
        var me = this;

        var details = me.getActiveContactDetails();

        $.each(details, function (i, contactDetails) {
            if (contactDetails.id === id) {
                contactDetails.refreshPaymentGroups();
            }
        });
    },

    pnRefreshTransactions: function (id, isSupplierPayment) {
        var me = this;

        var details = me.getActiveContactDetails();

        $.each(details, function (i, contactDetails) {
            if (contactDetails.id === id) {
                contactDetails.refreshTransactions();

                if (isSupplierPayment) {
                    if (
                        contactDetails.getCategoryId() ===
                        C.ContactCategory.Supplier
                    ) {
                        contactDetails.refreshContact();
                    }
                }
            } else {
                shell.cache.del(C.ModelType.Contact, id);
            }
        });
    },

    pnSavedMatchLists: function (pn) {
        var me = this;

        var details = me.getActiveContactDetails();

        $.each(details, function (i, contactDetails) {
            if (
                contactDetails.matching &&
                pn.Data.ContactId === contactDetails.id
            ) {
                if (
                    pn.SrcSignalRConnectionId !==
                    shell.connection.signalRConnectionId
                ) {
                    contactDetails.matching.refreshMatches();
                }
            }
        });
    },

    pnUpdate: function (pn) {
        var me = this;

        // need to run any updates against My Contacts and any Step Through contactDetails
        var details = me.getActiveContactDetails();

        $.each(details, function (i, contactDetails) {
            if ($.inArray(contactDetails.id, pn.Ids) !== -1) {
                if (
                    pn.SrcSignalRConnectionId !==
                    pn.connection.signalRConnectionId
                ) {
                    var contactDescription = contactDetails.$root
                        .find('.panel-title')
                        .val();

                    var isAnonymised = contactDescription === '';

                    if (!pn.Silent && !isAnonymised) {
                        var contactUpdatedDialogId =
                            'contactUpdatedDialog_' + contactDetails.id;
                        var dialogAlreadyExists =
                            $('#' + contactUpdatedDialogId).length > 0;

                        if (!dialogAlreadyExists) {

                            var updatedBy = '';
                            if (pn.Data && pn.Data.UpdatedBy) {
                                updatedBy = ' by ' + pn.Data.UpdatedBy;
                            }

                            showDialog({
                                type: 'info',
                                title: 'Contact Updated',
                                msg: '{0} has been updated{1}.  This record has been refreshed to the latest version.'.format(
                                    contactDescription, updatedBy
                                ),
                                buttons: {
                                    OK: function () {
                                        $(this).dialog('close');
                                    }
                                },
                                id: contactUpdatedDialogId
                            });
                        }
                    }

                    if (contactDetails.cfg.inStepThrough !== true) {
                        me._panelItemClicked({
                            $item: me.$contactPanelItem,
                            onComplete: function () { },
                            selected: true
                        });
                    }

                    if (contactDetails.cfg.inStepThrough === true) {
                        me.stepThroughHandler.reloadCurrentRecord(
                            me.stepThroughHandler.activeMatchGroup
                        );
                    }

                    //Remove any locally cached copy of yours.
                    shell.cache.del(C.ModelType.Contact, contactDetails.id);
                } else {
                    contactDetails.refreshOverview();

                    if (pn.Data.RefreshLayers) {
                        contactDetails.refreshContact();
                    }

                    if (
                        pn.Data !== null &&
                        pn.Data.LastContactedChange !== null &&
                        pn.Data.LastContactedChange
                    ) {
                        contactDetails.setLastContactedDate(pn.Data.LastContactedDate);
                    }
                }
            }

            if (pn.ModelType === C.ModelType.SigningRequest) {
                var eventAffectsThisContact = false;
                $.each(pn.Data.Parties, function (i, party) {
                    if (
                        party.ContextModelTypeId === C.ModelType.Contact &&
                        party.ModelId === contactDetails.id
                    ) {
                        shell.cache.del(C.ModelType.Contact, contactDetails.id);
                        eventAffectsThisContact = true;
                    }
                });

                if (eventAffectsThisContact) {
                    contactDetails.refreshTimeline(1);
                    contactDetails.refreshOverview();
                }
            }
        });
    },

    displayList: function (
        response,
        $panelItem,
        ids,
        selectionMode,
        query,
        disablePaging
    ) {
        var me = this;

        me.$root.find(
            '.content-container > .content[data-id="list"]'
        )[0].innerHTML = response.Data;

        me.list = new gmgps.cloud.ui.controls.list({
            $root: me.$root.find(
                '.content-container > .content[data-id="list"]'
            ),
            ids: ids,
            selectionMode: selectionMode,
            selectedItemName: 'Contact',
            selectedItemPluralName: 'Contacts',
            searchString: query,
            disablePaging: disablePaging
        });

        //List: onDetailsRequest
        me.list.onDetailsRequest.handle(function (args) {
            me._onDetailsRequest(args);
        });

        //List: onPageRequest
        me.list.onPageRequest.handle(function (args) {
            me._onPageRequest(args);
        });
    },

    newSelection: function () {
        alert('New selection goes here.');
    },

    showSearchResultsPanelItem: function (show) {
        var me = this;
        me.$listPanelItem = me.panel.showSearchResultsPanelItem(show);

        if (show) {
            me.stepThroughHandler.resetSearchMatchGroup(me.$listPanelItem);
        }
    },

    clearSearchResults: function () {
        var me = this;
        me.stepThroughHandler.resetSearchMatchGroup(null);
        me.$root.find(
            '.content-container > .content[data-id="list"]'
        )[0].innerHTML = me.searchTipsHtml;
    },

    setQuery: function (query, filters, callback) {
        var me = this;
        me.query = query.replace(/\s/g, '');

        var id = parseInt(me.$listPanelItem.attr('data-id'));

        //Exit early if too short.
        if (me.query.length < 3) {
            me.clearSearchResults();
            callback(query);
            return false;
        }

        me.stepThroughHandler.resetSearchMatchGroup(me.$listPanelItem, true);

        var contactSearch = me.buildContactSearch(me.$listPanelItem, {
            SearchId: id,
            CategoryIdList: filters.idList,
            Name: me.$listPanelItem.find('.content').text(),
            Query: query,
            Archived: filters.records,
            ListType: C.ListType.Standard,
            SearchPage: {
                Index: 1,
                Size: 100
            },
            SearchOrder: {
                By: C.SearchOrderBy.SearchScore,
                Type: C.SearchOrderType.Ascending
            }
        });

        me.getList(
            {
                $panelItem: me.$listPanelItem,
                disablePaging: true,
                search: contactSearch
            },
            function () {
                var newMatchGroup = me.stepThroughHandler.constructMatchGroup(
                    id,
                    me.$listPanelItem,
                    { $panelItem: me.$listPanelItem, search: contactSearch },
                    me.list.ids
                );
                me.stepThroughHandler.addMatchGroup(newMatchGroup);
                if (callback) {
                    callback(query);
                }
            }
        );
    },

    redisplayed: function () {
        var me = this;
        me.setupToolbar();

        window.dispatchEvent(
            new CustomEvent('alto:item-show', {
                detail: { category: 'contacts', item: me.contactDetails }
            })
        );

        setTimeout(function () {
            me.$root.find('.accordion').accordion('refresh');
        }, 1);
    },

    promptSuppliersAdded: function () {
        var me = this;
        return me.contactDetails.promptSuppliersAdded();
    },

    promptClientAccountChanges: function () {
        var me = this;
        return me.contactDetails.promptClientAccountChanges();
    },

    promptDefaultClientAccountChanged: function () {
        var me = this;
        return me.contactDetails.promptDefaultClientAccountChanged();
    },

    collatePropertyFilePropertyExclusions: function ($form) {
        var me = this;

        me.$root
            .find(
                '.propertyfile-panel .owned-properties .tick-and-cross.property-included .tickbox.hidden:not(.ticked)'
            )
            .each(function (ix, el) {
                $form.append(
                    '<input name="ExcludedProperties[{0}]" type="hidden" value="{1}" />'.format(
                        ix,
                        $(el).val()
                    )
                );
            });
    },

    collatePropertyFileTenancyExclusions: function ($form) {
        var me = this;

        me.$root
            .find(
                '.propertyfile-panel .available-tenancies .tick-and-cross.tenancy-included .tickbox.hidden:not(.ticked)'
            )
            .each(function (ix, el) {
                $form.append(
                    '<input name="ExcludedTenancies[{0}]" type="hidden" value="{1}" />'.format(
                        ix,
                        $(el).val()
                    )
                );
            });
    }
};
