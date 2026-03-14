gmgps.cloud.ui.views.followUp = function (args) {
    var me = this;
    me.cfg = args;
    me.$root = args.$root;
    me.$window = null;
    me.id = null;
    me.hasAvailableTypes = me.$root.find('#HasAvailableTypes').val() === 'True';
    me.initialStatus = parseInt(me.$root.find('#FollowUp_Status').val());

    me.init(args);

    return this;
};

gmgps.cloud.ui.views.followUp.prototype = {
    init: function (args) {
        var me = this;

        me.id = parseInt(me.$root.find('#FollowUp_Id').val());
        me.followUpType = parseInt(me.$root.find('#FollowUp_Type').val());

        me.$window = me.$root.closest('.window');

        me.$root.off();

        if (args.data && args.data.mirrorViewingNotes) {
            me.mirroringViewingNotes = me.initViewingNotesMirror();
        }

        if (args.data && args.data.mirrorContactReviewNotes) {
            me.mirroringContactReviewNotes = me.initContactReviewNotesMirror();
        }

        if (args.data && args.data.mirrorPropertyReviewNotes) {
            me.mirroringPropertyReviewNotes =
                me.initPropertyReviewNotesMirror();
        }
        //Dropdowns
        me.$root.find('select').customSelect();

        //Date Pickers
        me.$root.find('#FollowUp_CompletionDate').datepicker({
            numberOfMonths: 2,
            showButtonPanel: true,
            dateFormat: 'dd/mm/yy',
            minDate: null
            //minDate: $(v).attr('data-datePickerMode') == 'future' ? new Date() : null
        });

        //Setup AC's.
        me.setupPropertyAC(me.$root.find('.property-ac'));
        me.setupContactAC(me.$root.find('.contact-ac'));

        // When the user changes the follow up date to future and the current status is confirmed,
        // it should prompt them to see if they want to change it back in progress.
        me.$root.find('#FollowUp_DueDate').datepicker({
            onSelect: function (value) {
                var dueDate = parseUKDate(value);

                if (dueDate > new Date()) {
                    if (me.$root.find('.status-box.complete').hasClass('on')) {
                        ShowAreYouSure(
                            'Confirm',
                            'Would you like to set this follow up back to In Progress?',
                            function () {
                                me.$root.find('.status-box.inprogress').click();
                            }
                        );
                    }
                }
            },
            numberOfMonths: 2,
            showButtonPanel: true,
            dateFormat: 'dd/mm/yy',
            minDate: null
        });

        //For existing items, add a cancellation button into the footer.
        if (me.initialStatus === C.FollowUpStatus.Cancelled) {
            if (me.followUpType !== C.FollowUpType.Todo) {
                me.$window
                    .find('.bottom .buttons')
                    .prepend(
                        '<div class="btn restore-followup-button" style="min-width: 100px; float: left;">Undo Cancellation</div>'
                    );
            }
        } else {
            if (
                me.id !== 0 &&
                (me.cfg.data === null ||
                    (me.cfg.data && !me.cfg.data.excludeCancel))
            ) {
                me.$window
                    .find('.bottom .buttons')
                    .prepend(
                        '<div class="btn cancel-followup-button bgg-contact" style="min-width: 100px; float: left;">Cancel</div>'
                    );
            }
            if (
                me.id === 0 &&
                (me.cfg.data === null ||
                    (me.cfg.data && !me.cfg.data.excludeCancel))
            ) {
                me.$window
                    .find('.bottom .buttons')
                    .prepend(
                        '<div class="btn remove-followup-button" style="min-width: 100px; float: left;">Remove</div>'
                    );
            }
        }

        // cancelled ToDo Tasks cant be resaved again, so hide save button and disable inputs/clickable things

        if (
            me.initialStatus === C.FollowUpStatus.Cancelled &&
            me.followUpType === C.FollowUpType.Todo
        ) {
            me.$window.find('.bottom .buttons .action-button').hide();
            me.$root.find('input, select, textarea').prop('disabled', true);
            me.$root.find('.status-box').addClass('disabled');
        }

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
                    classes: 'qtip-dark'
                }
            });
        });

        me.initHandlers();

        if (me.followUpType == C.FollowUpType.OwnerProgressionToDoItem || me.followUpType == C.FollowUpType.ApplicantProgressionToDoItem) {
            alto.application.events.raise('view-loaded', me.$root[0], { viewName: 'followup', type: 'dialog' });
        }
    },

    initViewingNotesMirror: function () {
        var me = this;

        var linkedId = parseInt(me.$root.find('#FollowUp_LinkedId').val());

        var $viewingWindow = $('.viewing-form[data-id="{0}"]'.format(linkedId));

        if ($viewingWindow.length === 0) return false;

        var $internalNotes = $viewingWindow.find('#Viewing_InternalNotes');

        // bring notes into this form to pick up any new unsaved additions/changes
        // store the intial state in case we dont save

        me.savedInternalNotes = $internalNotes.val();

        me.$root.find('#ViewingInternalNotes').val(me.savedInternalNotes);

        me.$root.find('#ViewingInternalNotes').on('change keyup', function () {
            $internalNotes.val($(this).val());
        });

        var $feedbackNotes = $viewingWindow.find('#ApplicantComments');

        // bring notes into this form to pick up any new unsaved additions/changes
        // store the intial state in case we dont save

        me.savedFeedbackNotes = $feedbackNotes.val();

        me.$root.find('#ViewingFeedback').val(me.savedFeedbackNotes);

        me.$root.find('#ViewingFeedback').on('change keyup', function () {
            $feedbackNotes.val($(this).val());
        });

        return true;
    },

    resetMirroredViewingNotes: function () {
        var me = this;

        var linkedId = parseInt(me.$root.find('#FollowUp_LinkedId').val());

        var $viewingWindow = $('.viewing-form[data-id="{0}"]'.format(linkedId));

        if ($viewingWindow.length === 0) return;

        $viewingWindow
            .find('#Viewing_InternalNotes')
            .val(me.savedInternalNotes);

        $viewingWindow.find('#ApplicantComments').val(me.savedFeedbackNotes);
    },

    initContactReviewNotesMirror: function () {
        var me = this;

        var linkedId = parseInt(me.$root.find('#FollowUp_LinkedId').val());

        var $contactDetails = $(
            '.body .views .form[data-type="contact-details"][data-id="{0}"]'.format(
                linkedId
            )
        );

        if ($contactDetails.length === 0) return false;

        var $reviewNotes = $contactDetails.find('#Contact_ReviewNotes');

        // bring notes into this form to pick up any new unsaved additions/changes
        // store the intial state in case we dont save

        if ($reviewNotes.length === 1) {
            me.savedContactReviewNotes = $reviewNotes.val();

            me.$root
                .find('#ContactReviewNotes')
                .val(me.savedContactReviewNotes);

            me.$root
                .find('#ContactReviewNotes')
                .on('change keyup', function () {
                    $reviewNotes.val($(this).val());
                });
        }
        return true;
    },

    initPropertyReviewNotesMirror: function () {
        var me = this;

        var linkedId = parseInt(me.$root.find('#FollowUp_LinkedId').val());

        var $propertyDetails = $(
            '.body .views .detail[data-type="property-details"][data-id="{0}"]'.format(
                linkedId
            )
        );

        if ($propertyDetails.length === 0) return false;

        var $reviewNotes = $propertyDetails.find('#Property_ReviewNotes');

        // bring notes into this form to pick up any new unsaved additions/changes
        // store the intial state in case we dont save

        if ($reviewNotes.length === 1) {
            me.savedPropertyReviewNotes = $reviewNotes.val();

            me.$root
                .find('#PropertyReviewNotes')
                .val(me.savedPropertyReviewNotes);

            me.$root
                .find('#PropertyReviewNotes')
                .on('change keyup', function () {
                    $reviewNotes.val($(this).val());
                });
        }
        return true;
    },

    resetContactMirroredReviewNotes: function () {
        var me = this;

        var linkedId = parseInt(me.$root.find('#FollowUp_LinkedId').val());

        var $contactDetails = $(
            '.body .views .form[data-type="contact-details"][data-id="{0}"]'.format(
                linkedId
            )
        );

        if ($contactDetails.length === 0) return false;

        var $reviewNotes = $contactDetails.find('#Contact_ReviewNotes');

        $reviewNotes.val(me.savedContactReviewNotes);
    },

    resetPropertyMirroredReviewNotes: function () {
        var me = this;

        var linkedId = parseInt(me.$root.find('#FollowUp_LinkedId').val());

        var $propertyDetails = $(
            '.body .views .detail[data-type="property-details"][data-id="{0}"]'.format(
                linkedId
            )
        );

        if ($propertyDetails.length === 0) return false;

        var $reviewNotes = $propertyDetails.find('#Property_ReviewNotes');

        $reviewNotes.val(me.savedPropertyReviewNotes);
    },

    setFollowUpPostWorkActions: function () {
        var me = this;

        if (me.mirroringViewingNotes) {
            me.$root
                .find('#FollowUpViewModelSettings_MirroredViewingNotes')
                .val('True');
        }
        if (me.mirroringContactReviewNotes) {
            me.$root
                .find('#FollowUpViewModelSettings_MirroredContactReviewNotes')
                .val('True');
        }
        if (me.mirroringPropertyReviewNotes) {
            me.$root
                .find('#FollowUpViewModelSettings_MirroredPropertyReviewNotes')
                .val('True');
        }
    },

    initHandlers: function () {
        var me = this;

        //Status Box > Click
        me.$root.on('click', '.status-box:not(.disabled)', function () {
            var id = parseInt($(this).attr('data-id'));

            me.$root.find('.status-box').removeClass('on');
            $(this).addClass('on');

            me.$root.find('#FollowUp_Status').val(id);
            var $completeBox = me.$root.find('#FollowUp_CompletionDate');

            if (id === C.FollowUpStatus.Complete) {
                $completeBox.removeClass('disabled').prop('disabled', false);

                var date = new Date();
                var completedDate =
                    date.getDate() +
                    '/' +
                    (date.getMonth() + 1) +
                    '/' +
                    date.getFullYear();

                if ($completeBox.val() === '') {
                    $completeBox.val(completedDate);
                }

                $completeBox.addClass('validate[required]');
            } else {
                $completeBox.addClass('disabled').prop('disabled', true);

                $completeBox.removeClass('validate[required]');
            }
        });

        //Cancel Followup Button > Click
        me.$window.on('click', '.cancel-followup-button', function () {
            showDialog({
                type: 'question',
                title: 'Cancel This Task ?',
                msg: 'You are about to cancel this task. Proceed ?',
                buttons: {
                    'Yes - Cancel This Task': function () {
                        $(this).dialog('close');
                        me.$root
                            .find('#FollowUp_Status')
                            .val(C.FollowUpStatus.Cancelled);
                        me.$window.find('.action-button').trigger('click');
                    },
                    No: function () {
                        $(this).dialog('close');
                    }
                }
            });
        });

        //Remove Followup Button > Click
        me.$window.on('click', '.remove-followup-button', function () {
            me.$root.attr('data-remove-item', true);
            me.$window.find('.cancel-button').trigger('click');
        });

        //Restore Followup Button > Click
        me.$window.on('click', '.restore-followup-button', function () {
            me.$root.find('#FollowUp_Status').val(C.FollowUpStatus.Pending);
            me.$window.find('.action-button').trigger('click');
        });

        me.$root.on('click', '#copy-feedback-received-to-owners', function () {
            var feedback = me.$root.find('#ApplicantFeedback').val();
            me.$root
                .find('#ViewingFeedback')
                .val(function (i, text) {
                    me.$root.off('click', '#copy-feedback-received-to-owners');
                    return text + (text.length > 0 ? '\n' : '') + feedback;
                })
                .change();
        });
    },

    action: function () {
        var me = this;

        if (!me.validate()) return false;

        me.setFollowUpPostWorkActions();
    },

    cancel: function (onComplete) {
        var me = this;

        if (me.mirroringViewingNotes) {
            me.resetMirroredViewingNotes();
        }

        if (me.mirroringContactReviewNotes) {
            me.resetContactMirroredReviewNotes();
        }

        if (me.mirroringPropertyReviewNotes) {
            me.resetPropertyMirroredReviewNotes();
        }
        onComplete(true);
    },

    validate: function () {
        var me = this;

        //Set assoc ids.
        var $propertyAC = me.$root.find('.property-ac');
        if ($propertyAC.length !== 0) {
            me.$root
                .find('#FollowUp_PropertyId')
                .val(parseInt($propertyAC.attr('data-id')));
        }
        var $contactAC = me.$root.find('.contact-ac');
        if ($contactAC.length !== 0) {
            me.$root
                .find('#FollowUp_ContactId')
                .val(parseInt($contactAC.attr('data-id')));
        }

        //Init validation engine.
        me.$root.addClass('opt-validate').validationEngine({ scroll: false });
        var valid = me.$root.validationEngine('validate');
        if (!valid) {
            return false;
        }

        return valid;
    },

    setupContactAC: function ($e) {
        $e.autoCompleteEx({
            modelType: C.ModelType.Contact,
            includeContacts: true,
            includeUsers: false,
            search: {
                ApplyFurtherFilteringtoIds: true
            },
            placeholder: 'Search for Contact...',
            onSelected: function () {},
            onRemoved: function () {}
        });
    },

    setupPropertyAC: function ($e) {
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
                    C.SaleStatus.Exchanged,
                    C.RentStatus.Available,
                    C.RentStatus.UnderOffer,
                    C.RentStatus.LetMarketing,
                    C.RentStatus.Instructed,
                    C.RentStatus.Appraisal,
                    C.RentStatus.Let,
                    C.RentStatus.LetAgreed
                ],
                ApplyFurtherFilteringtoIds: true
            },
            placeholder: 'Search for Property...',
            onSelected: function () {},
            onRemoved: function () {}
        });
    }
};
