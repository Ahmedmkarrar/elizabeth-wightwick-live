gmgps.cloud.ui.views.propertyStatus = function (args) {
    var me = this;

    me.$root = args.$root;
    me.callback = args.callback;
    me.gotoPropertyHandler =
        args && args.data ? args.data.gotoPropertyHandler : undefined;
    me.$window = null;

    me.actionCodes = {
        UserCancelledEmailInputForm: 1,
        GetEmailAddressesAlreadyInUse: 2,
        InvitesSentSuccess: 3,
        InvitesSentFail: 4,
        GetEmailAddressesAlreadyInUseFail: 5,
        PropertyStatusChangeFailed: 6,
        UserCancelledStatusChangeForm: 7
    };

    me.init();

    return true;
};

gmgps.cloud.ui.views.propertyStatus.prototype = {
    init: function () {
        var me = this;

        me.newStatusId = parseInt(me.$root.find('#NewStatusId').val());
        me.currentStatusId = parseInt(me.$root.find('#CurrentStatusId').val());
        me.propertyId = parseInt(me.$root.find('#Property_Id').val());
        me.$window = me.$root.closest('.window');

        //Date Pickers
        me.$root.find('.date-picker').each(function (i, v) {
            $(v).datepicker({
                numberOfMonths: 2,
                showButtonPanel: true,
                dateFormat: 'dd/mm/yy',
                minDate:
                    $(v).attr('data-datePickerMode') === 'future'
                        ? new Date()
                        : null
            });
        });

        me.$root.find('select').customSelect();

        //BoardChangeViewModel_BoardChange_BoardType > Change
        me.$root.on(
            'change',
            '#BoardChangeViewModel_BoardChange_BoardType',
            function () {
                var boardTypeId = parseInt($(this).val());
                if (boardTypeId !== 0) {
                    me.$root.find('.x-board-specific').show();
                } else {
                    me.$root.find('.x-board-specific').hide();
                }
            }
        );

        //NewStatusId > Change
        me.$root.on('change', '#NewStatusId', function () {
            me.newStatusId = parseInt($(this).val());
            me.onStatusChange();
        });

        //PropertyFileStatusToggle > Change
        me.$root.on(
            'change',
            "input[id^='propertyfile-status-toggle']",
            function () {
                var ctrl = $(this);
                var id = ctrl[0].id[ctrl[0].id.length - 1];
                if (ctrl.is(':checked')) {
                    me.$root
                        .find('#propertyfile-status-toggle-' + id + '-div')
                        .show();
                } else {
                    me.$root
                        .find('#propertyfile-status-toggle-' + id + '-div')
                        .hide();
                }
            }
        );

        me.$root.on('click', '.pf-status-changeable', function () {
            var ctrl = $(this);
            ctrl.toggleClass('notinvited');
            var id = ctrl.attr('pf-status-contact');
            var hidden = me.$root.find('#invite-' + id);
            var val = hidden.val();
            hidden.val(val === 'true' ? 'false' : 'true');
        });

        me.$root.on('mouseenter', '.pf-tooltip', function () {
            $(this).qtip({
                content: $(this).attr('data-tip'),
                position: {
                    my: 'top middle',
                    at: 'bottom middle'
                },
                show: {
                    event: 'mouseenter',
                    ready: true,
                    delay: 0,
                    effect: function () {
                        $(this).fadeIn(50);
                    }
                },
                hide: 'mouseout',
                style: {
                    tip: true,
                    classes: 'ui-tooltip-dark'
                }
            });
        });

        me.isMoneyLaunderingCheckRequired = function (
            currentStatusId,
            newStatusId
        ) {
            return (
                (newStatusId === C.SaleStatus.Available &&
                    currentStatusId === C.SaleStatus.Instructed) ||
                (newStatusId === C.SaleStatus.Available &&
                    currentStatusId === C.SaleStatus.Withdrawn) ||
                (newStatusId === C.SaleStatus.UnderOffer &&
                    currentStatusId === C.SaleStatus.Available) ||
                (newStatusId === C.RentStatus.Available &&
                    currentStatusId === C.RentStatus.Withdrawn) ||
                (newStatusId === C.RentStatus.Available &&
                    currentStatusId === C.RentStatus.Instructed) ||
                (newStatusId === C.RentStatus.LetAgreed &&
                    currentStatusId === C.RentStatus.Available) ||
                (newStatusId === C.RentStatus.LetAgreed &&
                    currentStatusId === C.RentStatus.UnderOffer)
            );
        };

        //Conditionally hide board inputs initially if the default is "No Board Change".
        var currentBoardTypeId = parseInt(
            me.$root.find('#BoardChangeViewModel_BoardChange_BoardType').val()
        );
        if (currentBoardTypeId === 0) {
            me.$root.find('.x-board-specific').hide();
        }

        me.onStatusChange();
    },

    destroy: function () {
        var me = this;
        me.$root.empty().unbind();
    },

    onStatusChange: function () {
        var me = this;

        if (
            shell.propertyFileEnabled &&
            me.$root.find('.propertyfile').length
        ) {
            //Configure PF UI basded upon proposed property status.
            if (
                me.newStatusId !== C.SaleStatus.Suspended &&
                me.newStatusId !== C.SaleStatus.Withdrawn &&
                me.newStatusId !== C.SaleStatus.ExternallySold &&
                me.newStatusId !== C.SaleStatus.Archived
            ) {
                //Show toggle to invite and set to ON
                me.$root
                    .find(
                        '.should-invite-contact[data-contact-status="NotInvited"]'
                    )
                    .val('true')
                    .closest('.pf-toggle-container')
                    .find('.toggle-switch')
                    .removeClass('inactive')
                    .addClass('notinvited pf-status-changeable');
            } else {
                //Hide toggle to invite and set to OFF
                me.$root
                    .find(
                        '.should-invite-contact[data-contact-status="NotInvited"]'
                    )
                    .val('false')
                    .closest('.pf-toggle-container')
                    .find('.toggle-switch')
                    .removeClass('notinvited pf-status-changeable')
                    .addClass('inactive');
            }
        }
    },

    validateEmailAddressesForPropertyFile: function (
        $f,
        $elements,
        emptyMeansInvalid
    ) {
        var valid = true;

        $elements.each(function (i, v) {
            var $textbox = $(v);
            var email = $textbox.val();
            var contactId = $textbox.data('contact-id');
            var $pfEmailValid = $f.find(
                '#pf-email-valid-{0}'.format(contactId)
            );

            if (email.length > 0 || emptyMeansInvalid) {
                if (!gmgps.cloud.helpers.general.validateEmail(email)) {
                    $textbox.validationEngine(
                        'showPrompt',
                        'Please provide a valid email for the contact.',
                        'x',
                        'topLeft',
                        true
                    );
                    $pfEmailValid.val('false');
                    valid = false;
                } else {
                    $textbox.validationEngine('hide');
                    $pfEmailValid.val('true');
                }
            } else {
                $pfEmailValid.val('false');
                valid = false;
            }
        });

        return valid;
    },

    action: function (onComplete) {
        var me = this;

        var form = createForm(me.$root, 'Property/SetPropertyStatus');

        me.$window.find('.action-button').lock();

        function chainError(code, msg) {
            return $.Deferred().reject(code, msg);
        }

        me.validate()
            .then(function () {
                return me.doMoneyLaunderingActions(form);
            }, chainError)
            .then(function () {
                return me.doPropertyFileActions();
            }, chainError)
            .then(function () {
                return me.doChangeStatusActions(form);
            }, chainError)
            .then(function () {
                return onComplete();
            })
            .done(function () {
                //Success
            })
            .fail(function (code, msg) {
                switch (code) {
                    case me.actionCodes.PropertyStatusChangeFailed:
                        break;
                    case me.actionCodes.UserCancelledStatusChangeForm:
                        me.$window.find('.bottom .cancel-button').trigger('click');
                        break;
                    default:
                        showInfo(msg);
                        break;
                }

                me.$window.find('.action-button').unlock();
            });

        //Return false to leave the StatusChange window open whilst the async ops take place.  The execution of the onComplete() callback will close the window.
        return false;
    },

    doPropertyFileActions: function () {
        var me = this;

        var deferred = $.Deferred();

        //Exit early if PropertyFile is not enabled.
        if (!shell.propertyFileEnabled) {
            return deferred.resolve();
        }

        function chainError(code, msg) {
            return deferred.reject(code, msg);
        }

        me.doPropertyFileActionsBuildInvitations()
            .then(function (invitations) {
                return me.doPropertyFileActionsResolveAnyMissingEmailAddresses(
                    invitations
                );
            }, chainError)
            .then(function (invitations) {
                return me.doPropertyFileActionsSendInvites(invitations);
            }, chainError)
            .done(function () {
                deferred.resolve();
            })
            .fail(function (code, msg) {
                deferred.reject(code, msg);
            });

        return deferred.promise();
    },

    doPropertyFileActionsBuildInvitations: function () {
        var me = this;

        var deferred = $.Deferred();

        //Populate invitations array.
        var invitations = [];
        me.$root
            .find('.should-invite-contact[value="true"]')
            .each(function (i, v) {
                var $v = $(v);
                var contactId = $v.data('contact-id');

                invitations.push({
                    ownerContactId: contactId,
                    inviteContact: true,
                    status: $v.data('contact-status'),
                    associatedPropertyId: me.propertyId
                });
            });

        deferred.resolve(invitations);

        return deferred.promise();
    },

    doPropertyFileActionsResolveAnyMissingEmailAddresses: function (
        invitations
    ) {
        var me = this;
        var deferred = $.Deferred();

        //Exit early if there are no invitations.
        if (invitations.length === 0) {
            return deferred.resolve(invitations);
        }

        //Populate and array of contactIds where the contact has no email address.
        var contactsToInviteWithoutEmailAddress = [];
        if (invitations.length > 0) {
            me.$root
                .find('.has-valid-email[value="False"]')
                .each(function (i, v) {
                    var contactId = $(v).data('contact-id');
                    //Get the contact id for any where the invite status is true
                    $.each(invitations, function (i, invitation) {
                        if (invitation.ownerContactId === contactId) {
                            contactsToInviteWithoutEmailAddress.push(
                                invitation.ownerContactId
                            );
                        }
                    });
                });
        }

        //Resolve early if there are no contacts to invite which don't have an e-mail address.
        if (contactsToInviteWithoutEmailAddress.length === 0) {
            return deferred.resolve(invitations);
        }

        //Get window html for taking e-mail addresses for contacts.
        new gmgps.cloud.http(
            "propertyStatus-doPropertyFileActionsResolveAnyMissingEmailAddresses"
        ).getView({
            url: '/Contact/GetDialogToAddContactEmail',
            args: {
                contactIds: contactsToInviteWithoutEmailAddress
            },
            post: true,
            complex: true,
            onSuccess: function (response) {
                var $content = $(response.Data);

                //Show window
                new gmgps.cloud.ui.controls.window({
                    $content: $content,
                    title: 'Add Contact E-Mail Address',
                    windowId: 'addContactEmailAddress',
                    post: true,
                    complex: false,
                    modal: true,
                    draggable: true,
                    width: 500,
                    actionButton: 'Save',
                    cancelButton: 'Cancel',
                    onReady: function ($f) {
                        var $textboxes = $f.find('.pf-contact-email-address');

                        //After a failed submit, clear all validation tips upon focus on any textbox.
                        $textboxes.on('focus', function () {
                            $f.validationEngine('hideAll');
                        });

                        //Set focus on first textbox.
                        $textboxes.first().focus();
                    },
                    onAction: function ($f) {
                        var $textboxes = $f.find('.pf-contact-email-address');
                        var contacts = [];
                        var valid = me.validateEmailAddressesForPropertyFile(
                            $f,
                            $textboxes,
                            true
                        );

                        if (!valid) {
                            return false;
                        }

                        $textboxes.each(function (i, v) {
                            var $v = $(v);
                            contacts.push({
                                id: $v.data('contact-id'),
                                emailAddress: $v.val()
                            });
                        });

                        new gmgps.cloud.http("propertyStatus-onAction").ajax(
                            {
                                args: {
                                    model: contacts
                                },
                                complex: true,
                                dataType: 'json',
                                type: 'post',
                                url: '/Contact/AddEmailsToContacts'
                            },
                            function () {
                                me.$root.find('.has-valid-email').val('True');
                                return deferred.resolve(invitations);
                            }
                        );
                    },
                    onCancel: function () {
                        me.notificationWindow = null;
                        return deferred.reject(
                            me.actionCodes.UserCancelledEmailInputForm
                        );
                    }
                });
            }
        });

        return deferred.promise();
    },

    doPropertyFileActionsSendInvites: function (invitations) {
        var me = this;
        var deferred = $.Deferred();

        //Use the original callback when there are no invitations to send.
        if (invitations.length === 0) {
            return deferred.resolve(true);
        }

        //We have invitations to send.
        var apiService = new gmgps.cloud.services.ApiService();

        var contactIds = $.map(invitations, function (invitation) {
            return invitation.ownerContactId;
        });

        var $p = apiService.post.bind({componentName: "propertyStatus-doPropertyFileActionsSendInvites"});
        $p('PropertyOwner', 'GetEmailAddressesAlreadyInUse', contactIds)
            .then(
                function (response) {
                    if (response.length > 0) {
                        me.$window.fadeIn();
                        me.notificationWindow = null;
                        return deferred.reject(
                            me.actionCodes.EmailAddressInUse,
                            'The following e-mail address(es) have already been used for a PropertyFile account:</br></br>{0}'.format(
                                response.join('</br>')
                            )
                        );
                    }

                    var spinner = showSpinner();
                    var inviteOwnersTimeoutMS = 25000;

                    var $p = apiService.post.bind({componentName: "propertyStatus-doPropertyFileActionsSendInvites"});
                    $p(
                            'PropertyOwner',
                            'InviteOwners',
                            invitations,
                            inviteOwnersTimeoutMS
                        )
                        .then(
                            function () {
                                spinner.hide();
                                return deferred.resolve(
                                    me.actionCodes.InvitesSentSuccess
                                );
                            },
                            function (e) {
                                spinner.hide();
                                return deferred.reject(
                                    me.actionCodes.InvitesSentFail,
                                    'Failed to send PropertyFile invites: ' +
                                        (!e.responseJSON
                                            ? e.statusText
                                            : e.responseJSON.ExceptionMessage ||
                                              'Unknown cause.')
                                );
                            }
                        );
                },
                function (e) {
                    return deferred.reject(
                        e.actionCodes.GetEmailAddressesAlreadyInUseFail,
                        'Failed to send PropertyFile invites: ' +
                            (!e.responseJSON
                                ? e.statusText
                                : e.responseJSON.ExceptionMessage ||
                                  'Unknown cause.')
                    );
                }
            );

        return deferred.promise();
    },

    doChangeStatusActions: function (form) {
        var me = this;

        var deferred = $.Deferred();

        new gmgps.cloud.http("propertyStatus-doChangeStatusActions").postForm(
            form,
            function (response) {
                if (response.ErrorData) {
                    return deferred.reject(
                        me.actionCodes.PropertyStatusChangeFailed,
                        response.ErrorData
                    );
                }

                if (me.callback) {
                    me.callback();
                }

                //Prompt for letters.
                setTimeout(function () {
                    gmgps.cloud.helpers.general.promptForLetters({
                        eventHeaders: response.UpdatedEvents
                    });
                }, 1000);

                me.gotoPropertyHandler();

                return deferred.resolve();
            },
            function (errResponse, errData) {
                return deferred.reject(
                    me.actionCodes.PropertyStatusChangeFailedHttp,
                    '{0} {1}'.format(errResponse, errData)
                );
            }
        );

        return deferred.promise();
    },

    cancel: function (onComplete) {
        onComplete();
    },

    validate: function () {
        var deferred = $.Deferred();
        deferred.resolve(true);
        return deferred.promise();
    },

    doMoneyLaunderingActions: function (form) {
        var me = this;
        var deferred = $.Deferred();

        //Check that the Money Laundering is visible.
        var moneyLaunderingCheckVisibility = me.$root
            .find('#MoneyLaunderingCheckVisibility')
            .val();
        var excludeApplicantsFromMoneyLaunderingChecks = me.$root
            .find('#ExcludeApplicantsFromMoneyLaunderingChecks')
            .val();

        //Do we need to perform the Money Laundering check on this status?
        var newStatusId = parseInt(me.$root.find('#NewStatusId').val());
        var currentStatusId = parseInt(me.$root.find('#CurrentStatusId').val());

        if (!me.isMoneyLaunderingCheckRequired(currentStatusId, newStatusId)) {
            //do the money checks when changing a property from ‘Instructed’ to ‘Available’ OR 'Available' to 'Under Offer'
            deferred.resolve();
            return true;
        }

        new gmgps.cloud.ui.views.moneyLaunderingCheck({
            propertyId: me.propertyId,
            callBack: function (actionType) {
                if (actionType === 'CANCEL') {
                    deferred.reject(me.actionCodes.UserCancelledStatusChangeForm);
                } else {
                    deferred.resolve();
                }
            },
            callBackForm: form,
            checkType: moneyLaunderingCheckVisibility,
            pendoTag: 'status-id-order-checks',
            statusChangeView: me,
            excludeApplicantFromChecks:
                excludeApplicantsFromMoneyLaunderingChecks
        });

        return deferred.promise();
    }
};
