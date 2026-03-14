gmgps.cloud.ui.views.viewing = function (args) {
    var me = this;

    me.$root = args.$root;
    me.$window = null;
    me.http = args.http || new gmgps.cloud.http("viewing-viewing");
    me.api = args.api || new gmgps.cloud.services.ApiService();

    me.closeMyWindow = args.closeMyWindow;
    me.onContentLoaded = args.onContentLoaded;

    me.map = null;
    me.mapReady = false;
    me.markers = new Array();
    me.dirty = false;

    me.contextModelType = parseInt(me.$root.find('#ContextModelType').val());
    me.contextLinkedId = parseInt(me.$root.find('#ContextLinkedId').val());
    me.initialPropertyId = parseInt(me.$root.find('#InitialPropertyId').val());
    me.initialContactId = parseInt(me.$root.find('#InitialContactId').val());
    me.contactIsNew = me.$root.find('#IsForNewContact').val();
    me.initialNegotiatorId = parseInt(
        me.$root.find('#InitialNegotiatorId').val()
    );
    me.viewingId = parseInt(me.$root.find('#InitialViewingId').val());

    var viewingEnquiryField = me.$root.find('#InitialViewingEnquiryId');
    if (viewingEnquiryField) {
        me.viewingEnquiryId = parseInt(viewingEnquiryField.val());
        if (
            args.windowConfiguration &&
            args.windowConfiguration.postCancelCallback
        ) {
            me.postCancelCallback = args.windowConfiguration.postCancelCallback;
        }
    }

    me.$itemsContainer = me.$root.find('.nav .items-container');
    me.$items = me.$root.find('.nav .items');
    me.$viewingFormContainer = me.$root.find('.viewing-form-container');

    me.$saveButton = null;
    me.$offerButton = null;
    me.$cancelButton = null;
    me.$closeButton = null;
    me.$viewingButton = null;

    me.init();

    return true;
};

gmgps.cloud.ui.views.viewing.typeName = 'gmgps.cloud.ui.views.viewing';

gmgps.cloud.ui.views.viewing.prototype = {
    init: function () {
        var me = this;

        me.id = 0;
        me.previousId = -1;
        me.applicantIds = null;
        me.$root.off();
        me.$window = me.$root.closest('.window');

        me.$window
            .find('.top .title')
            .text(me.$root.find('#WindowTitle').val());

        me.setupCarousel();

        //Select the nav item according to the initialViewingId on the viewModel.
        var intialViewingId = parseInt(
            me.$root.find('#InitialViewingId').val()
        );
        me.selectNavItem(
            me.$items.find('.item[data-id="{0}"]'.format(intialViewingId))
        );

        //Nav back/fwd.
        me.$root.on('click', '.bck-fwd', function () {
            var $btn = $(this);
            var $sel = me.$root.find('.nav .item.on');
            var $new = null;

            if ($btn.hasClass('bck')) {
                //Back
                if ($sel.prev().prev().prev().length === 0) {
                    if ($sel.prev().prev().length === 0) {
                        if ($sel.prev().length === 0) {
                            //end
                        } else {
                            $new = $sel.prev();
                        }
                    } else {
                        $new = $sel.next().prev();
                    }
                } else {
                    $new = $sel.prev().prev().prev();
                }
            } else {
                //Forward
                if ($sel.next().next().next().length === 0) {
                    if ($sel.next().next().length === 0) {
                        if ($sel.next().length === 0) {
                            //end
                        } else {
                            $new = $sel.next();
                        }
                    } else {
                        $new = $sel.next().next();
                    }
                } else {
                    $new = $sel.next().next().next();
                }
            }

            if ($new) {
                me.selectNavItem($new);
            }
        });

        // Reminder > Change
        me.$root.on('change', '#ReminderMins', function () {
            var val = parseInt($(this).val());

            // Show / Hide the ReminderType selection.

            if (val !== 0) {
                me.$root
                    .find('#ReminderTypeDiv')
                    .animate({ width: ['show', 'linear'] }, 400);
            } else {
                me.$root
                    .find('#ReminderTypeDiv')
                    .animate({ width: ['hide', 'linear'] }, 400);
            }
        });

        //Window buttons
        me.$saveButton = me.$window.find('.bottom .buttons .action-button');
        me.$closeButton = me.$window.find('.bottom .buttons .cancel-button');

        //Add cancellation button.
        me.$window
            .find('.bottom .buttons')
            .prepend(
                '<div class="btn cancel-apt-button grey hidden" style="min-width: 100px; float: left;">Cancel Viewing</div>'
            );
        me.$cancelButton = me.$window.find(
            '.bottom .buttons .cancel-apt-button'
        );

        //Add offer button.
        me.$window
            .find('.bottom .buttons')
            .prepend(
                '<div class="btn offer-button bgg-property hidden" style="min-width: 100px; float: left;">Make an Offer...</div>'
            );
        me.$offerButton = me.$window.find('.bottom .buttons .offer-button');

        //Add reinstate button.
        me.$window
            .find('.bottom .buttons')
            .prepend(
                '<div class="btn reinstate-apt-button grey hidden" style="min-width: 100px; float: left;">Reinstate Viewing</div>'
            );
        me.$reinstateButton = me.$window.find(
            '.bottom .buttons .reinstate-apt-button'
        );

        //Add (another) viewing button.
        me.$window
            .find('.bottom .buttons')
            .prepend(
                '<div class="btn repeat-viewing-button bgg-diary hidden" style="min-width: 140px; float: left;">Book a Repeat Viewing...</div>'
            );
        me.$viewingButton = me.$window.find(
            '.bottom .buttons .repeat-viewing-button'
        );

        //Button handers
        me.$offerButton.on('click', function () {
            me.beforeViewingClose(function (save) {
                if (save) {
                    me.saveViewing(true, true, function () {
                        me.makeOffer();
                    });
                } else {
                    me.makeOffer();
                }
            });
        });

        //Cancel/Reinstate Buttons > Click
        me.$cancelButton.on('click', function () {
            me.cancelViewing();
        });
        me.$reinstateButton.on('click', function () {
            me.reinstateViewing();
        });

        //Repeat Viewing Button > Click
        me.$viewingButton.on('click', function () {
            me.repeatViewing({
                repeatViewing: true,
                propertyId: me.propertyId,
                applicantIds: me.applicantIds,
                originatingEventId: me.id
            });
        });

        //Dirty triggers.
        me.$root.on(
            'change keyup',
            'input, select, textarea, .toggle',
            function () {
                me.setDirty(true);
            }
        );

        me.$root.on('click', '.email-link.send-viewing-feedback', function () {
            var diaryEventId = parseInt($(this).attr('data-id'));

            gmgps.cloud.helpers.general.getMultiMessager({
                title: 'Send Viewing Feedback',
                settings: {
                    allowAnonymousRecipients: false,
                    eventId: diaryEventId,
                    eventCategory: C.EventCategory.Diary,
                    isFromSendViewingFeedback: true
                },
                onComplete: function () {}
            });
        });

        var negotiatorChangeEventHandler = function () {
            //Update the userId specified in the userId attribute of the mini-diary input.

            me.setDirty(true);

            var $this = $(this);

            var targetUserId = parseInt($this.val());

            var $option = $this.find('option:selected');
            var branchId = parseInt($option.attr('data-branchid'));

            me.$root
                .find('.mini-diary-input')
                .attr('data-userId', targetUserId)
                .attr('data-userName', $option.text());

            // if negotiator changes then potentially the feedback followups arent required
            // now, because its the negotiator branch id that will own the viewing and therefore also the
            // followups. So if the viewing isnt saved yet, remove and re-add according

            if (me.id === 0) {
                me.resetViewingFollowUps(targetUserId);
            } else {
                me.updateViewingFollowUpsUserAndBranchId(
                    targetUserId,
                    branchId
                );
            }
        };
        //Negotiator dropdown > Change
        me.$root.on('change', '#NegotiatorId', negotiatorChangeEventHandler);

        //Applicant Delete Button > Click
        me.$root.on(
            'click',
            '#applicant-tab-applicants .delete-button',
            function () {
                var id = parseInt($(this).closest('li').attr('data-id'));
                me.removeApplicant(id);
            }
        );

        //Applicant Add Button > Click
        me.$root.on(
            'click',
            '#applicant-tab-applicants .add-button',
            function () {
                me.addApplicant();
            }
        );

        me.$root.on('click', '.email-link[data-action="create"]', function () {
            gmgps.cloud.helpers.general.createEmail({
                propertyId: 0,
                contactIds: $(this).attr('data-contactId'),
                personId: $(this).attr('data-personId'),
                emailPreferenceNumber: $(this).attr(
                    'data-emailPreferenceNumber'
                )
            });
        });

        me.$root.on('click', '#send-viewing-feedback-btn', function () {
            if (me.dirty) {
                me.saveViewing(false, true, function () {
                    me.sendViewingFeedback();
                });
            } else {
                me.sendViewingFeedback();
            }
        });

        me.$root.on('click', '#copy-feedback-received-to-owners', function () {
            var feedback = me.$root.find('#ApplicantFeedback').val();
            me.$root
                .find('#ApplicantComments')
                .val(function (i, text) {
                    me.$root.off('click', '#copy-feedback-received-to-owners');
                    return text + (text.length > 0 ? '\n' : '') + feedback;
                })
                .change();
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
                    classes: 'qtip-dark'
                }
            });
        });

        me.$root.on(
            'click',
            '.invite-to-propertyfile-btn:not(.disabled)',
            function (e) {
                var contactId = $(e.target).attr('data-id');

                var $p = me.api.post.bind({componentName: "viewing-negotiatorChangeEventHandler"});
                $p('PropertyFile', 'InviteFromViewing', contactId)
                    .then(
                        function () {
                            $.jGrowl(
                                'An invite to use PropertyFile has been sent successfully',
                                {
                                    header: 'PropertyFile',
                                    theme: 'growl-system'
                                }
                            );
                        },
                        function () {
                            $.jGrowl(
                                'There was an error sending an invite to use PropertyFile.',
                                {
                                    header: 'PropertyFile',
                                    theme: 'growl-system'
                                }
                            );
                        }
                    );
            }
        );

        me.$root.on('click', '#request-viewing-feedback-btn', function (e) {
            var emailLinks = me.$window.find(
                '#applicant-tab-feedback #contact-container .persons .person .email-link'
            );

            if (emailLinks && emailLinks.length > 0) {
                var growlHeader = 'Viewing Feedback';
                var growlTheme = 'growl-system';

                if (me.viewingId) {
                    var $p = me.api.post.bind({componentName: "viewing-feedback"});
                    $p(
                            'PropertyFile',
                            'RequestViewingFeedback',
                            me.viewingId
                        )
                        .then(
                            function (response) {
                                $(e.target)
                                    .prop('disabled', true)
                                    .addClass('disabled');

                                var message = '';
                                if (
                                    response.numberOfApplicantsContacted &&
                                    response.numberOfApplicantsContacted > 0
                                ) {
                                    message +=
                                        'A feedback request has been sent to {0} applicant(s)'.format(
                                            response.numberOfApplicantsContacted
                                        );
                                }

                                if (
                                    response.numberOfApplicantsNotContacted &&
                                    response.numberOfApplicantsNotContacted > 0
                                ) {
                                    if (message.length > 0) {
                                        message += '<br/><br/>';
                                    }

                                    message +=
                                        '{0} applicant(s) could not be contacted due to a missing email address'.format(
                                            response.numberOfApplicantsNotContacted
                                        );
                                }

                                $.jGrowl(
                                    message,
                                    { header: growlHeader, theme: growlTheme },
                                    1000
                                );
                            },
                            function () {
                                $.jGrowl(
                                    'There was an error requesting viewing feedback',
                                    { header: growlHeader, theme: growlTheme }
                                );
                            }
                        );
                } else {
                    console.log('Viewing Id not found');

                    $.jGrowl('There was an error requesting viewing feedback', {
                        header: growlHeader,
                        theme: growlTheme
                    });
                }
            } else {
                var feedbackPersons = me.$window.find(
                    '#applicant-tab-feedback #contact-container .persons .person'
                );
                if (feedbackPersons && feedbackPersons.length > 1) {
                    showInfo(
                        'The applicants of this viewing do not have an email address associated with their contact record. Please update the contact records and retry.'
                    );
                } else {
                    showInfo(
                        'The applicant of this viewing does not have an email address associated with their contact record. Please update the contact record and retry.'
                    );
                }

                $(e.target).prop('disabled', true).addClass('disabled');
            }
        });
    },

    refreshFollowUpsViewingDateChanged: function (
        newViewingDate,
        excludedTypeIdList
    ) {
        var me = this;

        me.$followUps
            .data('followUpDropdown')
            .refreshWithAdjustedDueDates(newViewingDate, excludedTypeIdList);
    },

    setApplicantFollowUpPropertyId: function (propertyId) {
        var me = this;
        me.$followUps.data('followUpDropdown').setPropertyIds(propertyId);
    },

    addFollowUps: function (followUps) {
        var me = this;

        var branchId = parseInt(
            me.$root.find('#NegotiatorId option:selected').attr('data-branchid')
        );
        var targetUserid = parseInt(me.$root.find('#NegotiatorId').val());

        var addedfollowUps = [];

        $.each(followUps, function (i, followUp) {
            addedfollowUps.push({
                branchId: branchId,
                targetUserId: targetUserid,
                type: followUp.type,
                linkedType: C.ModelType.DiaryEvent,
                linkedId: me.id,
                propertyId: me.propertyId,
                contactId: followUp.contactId
            });
        });

        if (addedfollowUps.length > 0) {
            me.$followUps
                .data('followUpDropdown')
                .addFollowUps(
                    addedfollowUps,
                    Date.parse(
                        me.$root
                            .find('.mini-diary-input')
                            .attr('data-startdatetime')
                    )
                );
        }
    },

    saveFollowUps: function (viewing, callback) {
        var me = this;

        me.$followUps
            .data('followUpDropdown')
            .saveFollowUps(viewing.Id, callback);
    },

    updateViewingFollowUpsUserAndBranchId: function (targetUserId, branchId) {
        var me = this;

        var args = {
            targetUserId: targetUserId,
            branchId: branchId,
            types: [
                C.FollowUpType.ViewingFollowUpOwner,
                C.FollowUpType.ViewingFollowUpApplicant,
                C.FollowUpType.ViewingConfirmationOwner,
                C.FollowUpType.ViewingConfirmationApplicant
            ]
        };
        var $dropdown = me.$followUps.data('followUpDropdown');

        $dropdown.updateFollowUpsTargetUserAndBranch(args);
    },

    resetViewingFollowUps: function (targetUserId) {
        var me = this;

        var $dropdown = me.$followUps.data('followUpDropdown');

        $dropdown
            .cancelFollowUps({
                types: [
                    C.FollowUpType.ViewingFollowUpOwner,
                    C.FollowUpType.ViewingFollowUpApplicant,
                    C.FollowUpType.ViewingConfirmationOwner,
                    C.FollowUpType.ViewingConfirmationApplicant
                ]
            })
            .done(function () {
                var followUps = [];

                $dropdown
                    .refreshWithAdjustedTargetUserId(targetUserId, [
                        C.FollowUpType.Todo
                    ])
                    .done(function () {
                        // always add Viewing Confirmations...

                        var applicantIds = me.getApplicantIds();
                        var ownerIds = me.getPropertyOwnerIds();

                        $.each(applicantIds, function (i, contactId) {
                            followUps.push({
                                type: C.FollowUpType
                                    .ViewingConfirmationApplicant,
                                contactId: contactId
                            });
                        });

                        $.each(ownerIds, function (i, contactId) {
                            followUps.push({
                                type: C.FollowUpType.ViewingConfirmationOwner,
                                contactId: contactId
                            });
                        });

                        // conditionally add post-viewing followup
                        if (me.viewingFollowUpRequired()) {
                            $.each(applicantIds, function (i, contactId) {
                                followUps.push({
                                    type: C.FollowUpType
                                        .ViewingFollowUpApplicant,
                                    contactId: contactId
                                });
                            });

                            $.each(ownerIds, function (i, contactId) {
                                followUps.push({
                                    type: C.FollowUpType.ViewingFollowUpOwner,
                                    contactId: contactId
                                });
                            });
                        }

                        me.addFollowUps(followUps);
                    });
            });
    },

    initApplicantAC: function ($e) {
        var me = this;

        $e.autoCompleteEx({
            modelType: C.ModelType.Contact,
            includeContacts: true,
            includeUsers: false,
            allowCreate: true,
            container: me.$root.find('#applicant-tab-applicants'),
            search: {
                CategoryIdList: [C.ContactCategory.Client],
                ApplyFurtherFilteringtoIds: true
            },
            placeholder: 'Search for Applicant...',
            onSelected: function (args) {
                //Add the id stored within the button to the applicantIds array.
                if ($.inArray(args.id, me.applicantIds) === -1) {
                    me.applicantIds.push(args.id);
                    me.getApplicants();

                    if (!args.isSetupCallback) {
                        me.setDirty(true);
                        me.addFollowupsForApplicant(args.id);
                    }
                } else {
                    //Already in array (so therefore, on the viewing)
                    showInfo(
                        'This applicant is already on the viewing record.'
                    );
                }
            }
        });
    },

    addFollowupsForApplicant: function (applicantContactId) {
        var me = this;
        var followUps = [];

        followUps.push({
            type: C.FollowUpType.ViewingConfirmationApplicant,
            contactId: applicantContactId
        });

        if (me.viewingFollowUpRequired()) {
            followUps.push({
                type: C.FollowUpType.ViewingFollowUpApplicant,
                contactId: applicantContactId
            });
        }

        me.addFollowUps(followUps);
    },

    viewingIsInThePast: function () {
        var me = this;

        var viewingDate = Date.parse(
            me.$viewingFormContainer
                .find('.mini-diary-input')
                .attr('data-startdatetime')
        );
        var serverDate = Date.parse(me.$root.find('#ServerDateTime').val());

        return viewingDate < serverDate;
    },

    initPropertyAC: function ($e) {
        var me = this;

        $e.autoCompleteEx({
            modelType: C.ModelType.Property,
            search: {
                StatusIdList: [
                    C.SaleStatus.Available,
                    C.SaleStatus.UnderOffer,
                    C.SaleStatus.UnderOfferMarketing,
                    C.SaleStatus.UnderOfferAvailable,
                    C.RentStatus.Available,
                    C.RentStatus.UnderOffer,
                    C.RentStatus.LetMarketing
                ],
                ApplyFurtherFilteringtoIds: true
            },
            displayRecordType: true,
            placeholder: 'Search for Property...',
            onSelected: function (args) {
                //Add the id stored within the button to the applicantIds array.
                me.getProperty(args.id, function () {
                    me.propertyId = args.id;
                    me.$root.find('#Viewing_PropertyId').val(args.id);
                    me.setDirty(true);

                    me.setApplicantFollowUpPropertyId(me.propertyId);

                    var viewingFollowUpRequired = me.viewingFollowUpRequired();

                    var followUps = [];

                    $.each(me.getPropertyOwnerIds(), function (i, contactId) {
                        followUps.push({
                            type: C.FollowUpType.ViewingConfirmationOwner,
                            contactId: contactId
                        });

                        if (viewingFollowUpRequired) {
                            followUps.push({
                                type: C.FollowUpType.ViewingFollowUpOwner,
                                contactId: contactId
                            });
                        }
                    });
                    me.addFollowUps(followUps);
                });
            }
        });
    },

    getApplicantIds: function () {
        var me = this;
        return $.unique(
            me.$root
                .find('.applicants .tabs ul li[data-id!="0"]')
                .map(function () {
                    return $(this).data('id');
                })
                .get()
        );
    },

    getPropertyOwnerIds: function () {
        var me = this;
        return $.unique(
            me.$root
                .find('.owners-container .owner-info')
                .map(function () {
                    return $(this).data('contactid');
                })
                .get()
        );
    },

    enableButton: function ($btn, enabled) {
        if (enabled) {
            $btn.prop('disabled', false).removeClass('disabled');
        } else {
            $btn.prop('disabled', true).addClass('disabled');
        }
    },

    setupCarousel: function () {
        var me = this;

        //Calculate the total width required to contain the items div,
        //  set it and make it draggable along the x axis.
        var itemsWidth = 0;
        me.$root.find('.nav .item').each(function (i, v) {
            itemsWidth += $(v).outerWidth(true);
        });
        me.$root.find('.nav .items').outerWidth(itemsWidth).draggable({
            //some day...
            delay: 100,
            axis: 'x'
        });

        //Item > Click
        me.$root.on('click', '.nav .item', function () {
            me.selectNavItem($(this));
        });
    },

    setDirty: function (dirty) {
        var me = this;
        me.dirty = dirty;

        if (dirty) {
            me.enableButton(me.$saveButton, true);
            me.$saveButton.addClass('bgg-red').removeClass('grey');
        } else {
            me.enableButton(me.$saveButton, true);
            me.$saveButton.removeClass('bgg-red').addClass('grey');
        }

        me.setSendViewingFeedbackBtnState();
    },

    setSendViewingFeedbackBtnState: function () {
        var me = this;

        var emailBtn = me.$root.find('#send-viewing-feedback-btn');
        var comments = me.$root.find('#ApplicantComments');

        if (emailBtn.length && comments.length) {
            me.enableButton(emailBtn, comments.val().length > 0);
        }
    },

    selectNavItem: function ($item, positionOnly) {
        //Align the selected item with the indicator.
        // - positionOnly: The item will be positioned above the indicator, but the record will not be loaded or auto selected.

        var me = this;
        var id = parseInt($item.attr('data-id'));

        //Func to select nav item.
        var after = function () {
            //Calculate x for the item.
            var itemX = $item.position().left;
            var indicatorXOffset =
                Math.floor(me.$itemsContainer.outerWidth(true) / 2) - 6;
            var itemXOffset = Math.floor($item.outerWidth(true) / 2);
            var left = indicatorXOffset - (itemX + itemXOffset);

            //Turn off any previously selected item (unless positionOnly was specified).
            if (!positionOnly) {
                me.$items.find('.on').removeClass('on');
            }

            //Move the selecteditem to the middle and mark as selected.
            me.$root.find('.nav .items').animate(
                {
                    left: left
                },
                {
                    duration: 250,
                    complete: function () {
                        //Unless positionOnly was specified, select and load the viewing.
                        if (!positionOnly) {
                            $item.addClass('on');

                            //Fetch the viewing.
                            // - If the viewing nav was launched within the context of a property or contact, we can
                            //   pass the id of it here, to pre-populate a new viewing (if it is new).
                            //   Alternatively, a newViewingDefaults object could be available (repeat viewings only).
                            if (me.newViewingDefaults) {
                                //Repeat Viewing.
                                me.getViewing(
                                    {
                                        id: 0,
                                        originatingEventId:
                                            me.newViewingDefaults
                                                .originatingEventId,
                                        propertyId:
                                            me.newViewingDefaults.propertyId,
                                        contactIds:
                                            me.newViewingDefaults.applicantIds,
                                        repeatViewing:
                                            me.newViewingDefaults.repeatViewing,
                                        viewingEnquiryId: me.viewingEnquiryId,
                                        negotiatorId: me.initialNegotiatorId
                                    },
                                    function () {
                                        //Clear the me.newViewingDefaults.
                                        me.newViewingDefaults = null;

                                        //Make the repeat viewing savable without any changes, though the date would probably be changed anyway.
                                        me.setDirty(true);
                                    }
                                );
                            } else {
                                //Standard.
                                var settings = {
                                    id: id,
                                    propertyId: me.initialPropertyId,
                                    contactIds: [me.initialContactId],
                                    viewingEnquiryId: me.viewingEnquiryId,
                                    negotiatorId: me.initialNegotiatorId
                                };

                                //If an initial period was supplied, use it and then discard.
                                var hasInitialPeriod =
                                    $item.attr('data-hasInitialPeriod') ==
                                    'True';
                                if (hasInitialPeriod) {
                                    settings.start = Date.parse(
                                        $item.attr('data-initialStart')
                                    ).toString('dd MMM yyyy HH:mm');
                                    settings.end = Date.parse(
                                        $item.attr('data-initialEnd')
                                    ).toString('dd MMM yyyy HH:mm');
                                    $item.removeAttr(
                                        'data-hasInitialPeriod data-initialStart data-initialEnd'
                                    );
                                }

                                me.getViewing(settings);
                            }
                        }
                    }
                }
            );
        };

        //Check for changes.
        me.beforeViewingClose(function (save) {
            if (save) {
                me.saveViewing(false, true, function () {
                    after();
                });
            } else {
                after();
            }
        });
    },

    getViewing: function (args, callback) {
        var me = this;

        //Get the viewing form requested.
        new gmgps.cloud.http("viewing-getViewing").getView({
            url: '/viewing/getviewing',
            args: args,
            post: true,
            onSuccess: function (response) {
                me.$viewingFormContainer[0].innerHTML = response.Data;
                me.initViewing();
                if (callback) callback();
            }
        });
    },

    initViewingNotesMirror: function () {
        var me = this;

        if (me.id === 0) return void 0;

        var $followUpWindow = $(
            '.follow-up-form[data-linkedid="{0}"][data-linkedtypeid="{1}"][data-singleinstance="1"]'.format(
                me.id,
                C.ModelType.DiaryEvent
            )
        );

        if ($followUpWindow.length === 0) return false;

        var $internalNotes = $followUpWindow.find('#ViewingInternalNotes');

        // bring notes into this form to pick up any new unsaved additions/changes
        // store the intial state in case we dont save

        me.savedInternalNotes = $internalNotes.val();

        me.$root.find('#Viewing_InternalNotes').val(me.savedInternalNotes);

        me.$root.find('#Viewing_InternalNotes').on('change keyup', function () {
            $internalNotes.val($(this).val());
        });

        var $feedbackNotes = $followUpWindow.find('#ViewingFeedback');

        // bring notes into this form to pick up any new unsaved additions/changes
        // store the intial state in case we dont save

        me.savedFeedbackNotes = $feedbackNotes.val();

        me.$root.find('#ApplicantComments').val(me.savedFeedbackNotes);

        me.$root.find('#ApplicantComments').on('change keyup', function () {
            $feedbackNotes.val($(this).val());
        });

        return true;
    },

    initViewing: function () {
        var me = this;

        //Custom dropdowns (dark)
        me.$root.find('select').customSelect();
        me.$root
            .find('.customStyleSelectBox')
            .addClass('dark')
            .css('margin-top', '5px');

        //Mini diary (dark)
        me.setupMiniDiary(me.$root.find('.mini-diary-placeholder'));
        me.$root
            .find('.mini-diary-input')
            .addClass('dark')
            .css('margin-top', '4px');

        me.id = parseInt(me.$root.find('#Viewing_Id').val());
        me.propertyId = parseInt(me.$root.find('#Viewing_PropertyId').val());
        me.propertyType = parseInt(
            me.$viewingFormContainer.find('#Property_RecordTypeId').val()
        );

        var isRepeatViewing = me.$root.find('#RepeatViewing').val() === 'True';

        //FollowUp Select
        me.$followUps = me.$root.find('.followups').followUpDropdown({
            adderColor: '#363636',
            linkedType: C.ModelType.DiaryEvent,
            linkedId: me.id,
            display: 'normal',
            onBeforeQuickComplete: function () {
                //If new viewing, the confirmation email dialog appears after the property viewing dialog is closed
                var isNewViewing = me.id === 0;
                if (!me.dirty || isNewViewing) return true;

                var $deferred = $.Deferred();
                
                showDialog({
                    type: 'question',
                    title: 'Save Changes?',
                    msg: 'This viewing has unsaved changes.<br/><br/>Save these changes before confirming?',
                    buttons: {
                        Save: function () {
                            $(this).dialog('close');
                            me.saveViewing(false, true, function () {
                                $deferred.resolve();
                            });
                        },
                        Cancel: function () {
                            $(this).dialog('close');
                            $deferred.reject();
                        }
                    }
                });               

                return $deferred.promise();
            },
            onFollowupUpdated: function (followupType, followupStatus) {
              
                var $deferred = $.Deferred();
                me.saveIfLastViewingFollowupCompleted(
                    followupType,
                    followupStatus
                ).then(function () {
                    $deferred.resolve();
                });

                return $deferred.promise();
            }
        });

        me.initViewingNotesMirror();

        var serverAssignedApplicantIds = [];

        if (me.$root.find('#_applicantIds').length > 0) {
            serverAssignedApplicantIds = me.$root
                .find('#_applicantIds')
                .val()
                .split(',');
        } else {
            return;
        }

        for (var id in serverAssignedApplicantIds) {
            // eslint-disable-next-line no-prototype-builtins
            if (serverAssignedApplicantIds.hasOwnProperty(id)) {
                serverAssignedApplicantIds[id] = parseInt(
                    serverAssignedApplicantIds[id]
                );
            }
        }

        if (me.id === 0 && me.previousId === 0) {
            //Special case.  "New Viewing" clicked twice in succession, so do not use a default applicant.
            if (isNaN(serverAssignedApplicantIds[0])) {
                me.applicantIds = [];
            } else {
                me.applicantIds = serverAssignedApplicantIds;
            }
        } else {
            if (me.id === 0) {
                //New Viewing - determine which applicants to assign.
                if (me.applicantIds == null) {
                    //We haven't assigned any applicants to date - this is the first viewing being shown.
                    if (isNaN(serverAssignedApplicantIds[0])) {
                        me.applicantIds = [];
                    } else {
                        me.applicantIds = serverAssignedApplicantIds;
                    }
                } else {
                    //is new viewing after existing - populate followups for existing applicants

                    if (!isRepeatViewing) {
                        for (var j = 0; j < me.applicantIds.length; j++) {
                            var applicantContactId = parseInt(
                                me.applicantIds[j]
                            );
                            if (!isNaN(applicantContactId)) {
                                me.addFollowupsForApplicant(applicantContactId);
                            }
                        }
                    }
                }
            } else {
                //otherwise, return the last applicantIds list, this isn't the first viewing to be shown.
                //Existing viewing - use the server assigned applicants.
                me.applicantIds = serverAssignedApplicantIds;
            }
        }

        me.previousId = me.id;

        me.dirty = false;
        me.mapReady = false;

        //Available buttons.
        if (me.id === 0) {
            //New event.
            var isViewingReadyForSaving = me.validate(false);
            if (isViewingReadyForSaving) {
                me.setDirty(true);
            } else {
                me.enableButton(me.$saveButton, false);
            }

            me.$offerButton.hide();
            me.$cancelButton.hide();
            me.$reinstateButton.hide();
            me.$viewingButton.hide();
        } else {
            if (me.viewingIsInThePast()) {
                //Post event (existing).
                me.enableButton(me.$saveButton, false);
                me.$reinstateButton.hide();
                if (!me.isCancelled()) {
                    me.$viewingButton.show();
                    me.$offerButton.show();
                    me.$cancelButton.show();
                } else {
                    me.$viewingButton.hide();
                    me.$offerButton.hide();
                    me.$cancelButton.hide();
                }
            } else {
                //Pre event (existing).
                me.enableButton(me.$saveButton, false);
                me.$offerButton.hide();

                if (me.isCancelled()) {
                    me.$reinstateButton.show();
                    me.$cancelButton.hide();
                } else {
                    me.$reinstateButton.hide();
                    me.$cancelButton.show();
                }
                me.$viewingButton.hide();
            }
        }

        //Property section tabs
        me.$propertyTabs = me.$root.find('.property-section > .tabs');
        me.$propertyTabs.tabs({
            activate: function (event, ui) {
                if (ui.newPanel.attr('id') == 'property-tab-map') {
                    var lat = parseFloat(
                        me.$root.find('#Map_LatLng_Lat').val()
                    );
                    var lng = parseFloat(
                        me.$root.find('#Map_LatLng_Lng').val()
                    );
                    var address = me.$root.find('#Map_Address').val();
                    me.showMap(lat, lng, address);
                }
            }
        });

        //Applicant section tabs.
        me.$root.find('.applicant-section > .tabs').tabs();

        //Trim textarea boxes.
        me.$root.find('textarea').each(function (i, v) {
            $(v).val($.trim($(v).val()));
        });

        Q.all([
            //Get the property and contact records.
            me.getProperty(me.propertyId),
            me.getApplicants()

        ]).then(function () {

            me.onContentLoaded();
        })
        //me.initFollowUps(); //##PERF0 Remove
    },

    repeatViewing: function (newViewingDefaults) {
        var me = this;

        //Assign the newViewingDefaults, ready for use when the new viewings is created.
        me.newViewingDefaults = newViewingDefaults;

        //Select the "New Viewing" nav item.
        var $item = me.$items.find('.item[data-id="0"]');
        me.selectNavItem($item);
    },

    getProperty: function (id, callback) {
        var me = this;

        var deferred = Q.defer();

        if (id === 0) {
            //No property exists, inject an auto-complete to find one.
            var html =
                '<div style="width: 460px; margin-left: 22px; margin-top: 30px;">';
            html +=
                '<div class="mt20 mb5">Select the property to be viewed.</div>';
            html +=
                '<input type="text" class="property-ac" style="width: 452px;" data-id="0" data-pre=""/>';
            html += '</div>';
            me.$root.find('#property-tab-property').html(html);
            me.initPropertyAC(
                me.$root.find('#property-tab-property .property-ac')
            );
            deferred.resolve();
        } else {
            //Property exists - fetch ready-made ui.
            me.http.getView({
                url: '/viewing/getviewingproperty',
                args: { id: id },
                post: true,
                onSuccess: function (response) {
                    var $html = $(response.Data);

                    //Setup the tabs.
                    me.propertyType = parseInt(
                        $html.children('#_PropertyRecordTypeId').val()
                    );
                    me.$viewingFormContainer
                        .find('#Property_RecordTypeId')
                        .val(me.propertyType);
                    if (me.propertyType == C.PropertyRecordType.Sale) {
                        //Sale
                        me.$root
                            .find('a[href="#property-tab-owners"]')
                            .text('Vendor(s)')
                            .parent()
                            .show();
                        me.$root.find('.owner-desc').html('Vendor');
                    } else {
                        //Rental
                        me.$root
                            .find('a[href="#property-tab-owners"]')
                            .text('Landlord(s)')
                            .parent()
                            .show();
                        me.$root
                            .find('a[href="#property-tab-tenants"]')
                            .parent()
                            .show();
                        me.$root.find('.owner-desc').html('Landlord');
                    }
                    me.$root
                        .find('a[href="#property-tab-map"]')
                        .parent()
                        .show();

                    //Insert the property tab content.
                    me.$root
                        .find('#property-tab-property')
                        .html($html.children('#property-tab-property').html());

                    //Insert the owners tab content.
                    me.$root
                        .find('#property-tab-owners')
                        .html($html.children('#property-tab-owners').html());

                    //Insert the tenants tab content (rental only).
                    me.$root
                        .find('#property-tab-tenants')
                        .html($html.children('#property-tab-tenants').html());

                    me.initProperty();

                    if (callback) callback();
                    deferred.resolve();
                }
            });
        }

        return deferred.promise;
    },

    getApplicants: function () {
        var me = this;
        var deferred = Q.defer();

        if (me.applicantIds.length == 0) {
            //No applicants exist, inject an auto-complete to find/create one.
            var html = me.getApplicantACHtml();
            me.$root.find('#applicant-tab-applicants').html(html);
            me.initApplicantAC(
                me.$root.find('#applicant-tab-applicants .applicant-ac')
            );

            deferred.resolve();
        } else {
            //Applicants exist - fetch ready-made ui.
            new gmgps.cloud.http("viewing-getApplicants").getView({
                url: '/viewing/getviewingapplicants',
                args: {
                    ids: me.applicantIds,
                    propertyId: me.propertyId,
                    allowAdd: !me.viewingIsInThePast()
                },
                post: true,
                onSuccess: function (response) {
                    //Insert the property tab content.
                    me.$root
                        .find('#applicant-tab-applicants')
                        .html(response.Data);

                    me.initApplicants();
                    deferred.resolve();
                }
            });
        }

        return deferred.promise;
    },

    getApplicantACHtml: function () {
        var html =
            '<div style="width: 350px; margin-left: 22px; margin-top: 30px;">';
        html +=
            '<div class="mt20 mb5">Add an applicant for this viewing.</div>';
        html +=
            '<input type="text" class="applicant-ac" style="width: 342px;" data-id="0" data-pre=""/>';
        html += '</div>';

        return html;
    },

    initApplicants: function () {
        var me = this;

        //Setup the applicant tabs.
        me.$root
            .find('.applicant-section #applicant-tab-applicants .tabs')
            .tabs();

        //Mirror applicant info in the feedback tab (post event only).
        if (me.viewingIsInThePast()) {
            var $container = me.$root.find(
                '#applicant-tab-feedback .cloned-applicants'
            );
            var $applicants = me.$root
                .find('#applicant-tab-applicants .applicants')
                .clone();

            //Remove timelines, info boxes and delete buttons.
            $applicants.find('.timeline').remove();
            $applicants.find('.info').remove();
            $applicants.find('.delete-button').remove();

            //The applicants may contain tabs, find and setup.
            $applicants.find('.tabs').tabs();

            //Append the applicants the clone container.
            $container.append($applicants);

            me.setSendViewingFeedbackBtnState();

            $container.find('#contact-container').removeClass('contact');
        }
    },

    initProperty: function () {
        var me = this;

        //Owner & Tenant tabs.
        me.$root.find('#property-tab-owners .tabs').tabs();
        me.$root.find('#property-tab-tenants .tabs').tabs();
    },

    addApplicant: function () {
        var me = this;

        var html = me.getApplicantACHtml();

        var $tabs = me.$root.find('#applicant-tab-applicants .tabs');
        $tabs.find('.ui-tabs-panel[data-id="0"]').html(html);
        me.initApplicantAC($tabs.find('.applicant-ac'));

        //$tabs.tabs('refresh');
    },

    sendViewingFeedback: function () {
        var me = this;

        var diaryEventId = me.$root.find('.postevent-notes').attr('data-id');

        gmgps.cloud.helpers.general.getMultiMessager({
            title: 'Send Viewing Feedback',
            settings: {
                allowAnonymousRecipients: false,
                eventId: diaryEventId,
                eventCategory: C.EventCategory.Diary,
                isFromSendViewingFeedback: true
            },
            onComplete: function () {}
        });
    },

    removeApplicant: function (id) {
        var me = this;

        //Func to remove the applicant.
        var after = function () {
            var $tabs = me.$root.find('#applicant-tab-applicants .tabs');

            //Remove from the array.
            var i = me.applicantIds.indexOf(id);
            me.applicantIds.splice(i, 1);

            //Remove the tab and the tab content.
            $tabs.find('li[data-id="{0}"]'.format(id)).remove();
            $tabs.find('.ui-tabs-panel[data-id="{0}"]'.format(id)).remove();

            //Refresh tabs.
            $tabs.tabs('refresh');

            //Remove any followups for this applicant.
            me.$followUps.data('followUpDropdown').cancelFollowUps({
                contactId: id
            });

            me.setDirty(true);
        };

        showDialog({
            type: 'question',
            title: 'Remove Applicant',
            msg: 'Are you sure you would like to remove this applicant from the viewing?',
            buttons: {
                Yes: function () {
                    after();
                    $(this).dialog('close');
                },
                No: function () {
                    $(this).dialog('close');
                }
            }
        });
    },

    getPropertyInfo: function (id) {
        var me = this;

        var eventTypesList = [];

        eventTypesList.push({ Key: C.EventType.Viewing, Value: [0] });
        eventTypesList.push({
            Key: C.EventType.Offer,
            Value: [
                C.EventSubType.OfferMade,
                C.EventSubType.OfferRevised,
                C.EventSubType.OfferMadeRental,
                C.EventSubType.OfferRevisedRental
            ]
        });
        eventTypesList.push({
            Key: C.EventType.AuditedChange,
            Value: [
                C.EventSubType.SalePriceChange,
                C.EventSubType.RentalPriceChange,
                C.EventSubType.OfferWithdrawn,
                C.EventSubType.OfferAccepted,
                C.EventSubType.OfferRejected
            ]
        });

        new gmgps.cloud.http("viewing-getPropertyInfo").ajax(
            {
                args: {
                    id: id,
                    eventTypesList: eventTypesList
                },
                dataType: 'json',
                type: 'post',
                url: '/property/getinfo'
            },
            function (response) {
                me.$root.find('#property-info').html(response.Data);

                me.$root.find('#property-info .info-tabs').tabs();
            }
        );
    },

    selectRow: function ($row) {
        var me = this;

        //Turn on the new row (and any others, off).
        var $selectedRow = me.$root.find('#viewings .row.on');
        $selectedRow.removeClass('on bg-property');
        $selectedRow.find('.radio-toggle').removeClass('on bg-property');

        $row.addClass('on');
        $row.find('.radio-toggle').addClass('on bg-property');
        $row.find('.blanker').remove();

        var propertyId = parseInt($row.find('.property-ac').attr('data-id'));
        me.getPropertyInfo(propertyId);
    },

    setupMiniDiary: function ($target) {
        var me = this;

        $target.miniDiary({
            userId: shell.userId,
            mode: C.CalendarMode.Me,
            allowCreate: false,
            allowEdit: true,
            $start: me.$viewingFormContainer.find('#Viewing_StartDate'),
            $end: me.$viewingFormContainer.find('#Viewing_EndDate'),
            highlightedEventIds: [me.id], //even if new (zero)
            highlightedInstanceId: me.instanceId,
            useStartForFirstHour: true,
            onPeriodSelected: function (req, authoriseCallback) {
                authoriseCallback(true);
                me.setDirty(true);
            },
            onEventMoved: function () {
                me.setDirty(true);
                me.refreshFollowUpsViewingDateChanged(
                    Date.parse(
                        me.$root
                            .find('.mini-diary-input')
                            .attr('data-startdatetime')
                    ),
                    [
                        C.FollowUpType.ViewingConfirmationApplicant,
                        C.FollowUpType.ViewingConfirmationOwner
                    ]
                );
            },
            onChanged: function () {
                me.refreshFollowUpsViewingDateChanged(
                    Date.parse(
                        me.$root
                            .find('.mini-diary-input')
                            .attr('data-startdatetime')
                    ),
                    [
                        C.FollowUpType.ViewingConfirmationApplicant,
                        C.FollowUpType.ViewingConfirmationOwner
                    ]
                );
            },
            ghostEvents: []
        });
    },

    showMap: function (lat, lng, address) {
        var me = this;

        var after = function () {
            me.$root.find('#map-cover').hide();

            //Move marker and pan to position.
            var latLng = new google.maps.LatLng(lat, lng);
            me.marker.setPosition(latLng);
            me.map.panTo(latLng);
        };

        if (!me.mapReady) {
            me.loadMap(lat, lng, address, after);
        } else {
            after();
        }
    },

    loadMap: function (lat, lng, address) {
        var me = this;

        var setupMap = function () {
            var latLng = new google.maps.LatLng(lat, lng);
            var mapOptions = {
                zoom: 16,
                mapTypeId: google.maps.MapTypeId.ROADMAP,
                center: latLng,
                panControl: false,
                mapTypeControl: true,
                streetViewControl: false
            };
            me.map = new google.maps.Map(
                me.$root.find('#map').get(0),
                mapOptions
            );

            //Display initial marker.
            me.addPropertyMarker(latLng, address);

            me.mapReady = true;

            setTimeout(function () {
                me.$root.find('#map-cover').fadeOut(250);
            }, 50);
        };
        $.when(loadGoogleMaps(3, shell.googleMapsApiKey, null)).then(
            function () {
                !!google.maps;
                setupMap();
            }
        );
    },

    addPropertyMarker: function (latLng, address, callback) {
        var me = this;

        var geocoder = new google.maps.Geocoder();

        //Func to add marker.
        var addMarker = function (latLng) {
            me.marker = new google.maps.Marker({
                position: latLng,
                map: me.map,
                title: address,
                icon: '/content/media/images/gui/maps/home-sales.png'
            });

            if (callback)
                // eslint-disable-next-line no-undef
                callback(point);
        };
        if (!isNaN(latLng.lat())) {
            //This property has a stored latLng, so use it.
            addMarker(latLng);
        } else {
            //Try and obtain a latLng using the textual address of the property.
            geocoder.geocode(
                { address: address + ', UK' },
                function (results, status) {
                    if (status === 'OK') {
                        if (results.length == 0) {
                            //alert("Geocoder did not recognise the address: " + longAddress);
                        } else {
                            var loc = results[0].geometry.location;
                            var latLng = new google.maps.LatLng(
                                loc.lat(),
                                loc.lng()
                            );
                            addMarker(latLng);
                        }
                    } else if (status === 'ZERO_RESULTS') {
                        alert('no results');
                    } else {
                        alert('Geocoder returned error: ' + status);
                    }
                }
            );
        }
    },

    clearInlineSearch: function ($target) {
        $target.data('line1', '').data('line2', '').removeClass('populated');
    },

    destroy: function () {
        var me = this;
        me.$root.empty().unbind();
    },

    action: function (callback) {
        var me = this;

        me.saveViewing(true, false, callback);

        //Return false so that the window remains open, we don't close this window upon the action
        //button being clicked.
        return false;
    },

    cancel: function (callback) {
        var me = this;

        //Close viewing nav.
        me.beforeViewingClose(function (save) {
            if (save) {
                me.saveViewing(true, true, function () {
                    callback(true);
                    if (me.viewingEnquiryId && me.postCancelCallback) {
                        me.postCancelCallback();
                    }
                });
            } else {
                callback(true);
                if (me.contactIsNew && me.postCancelCallback) {
                    me.postCancelCallback();
                }
            }
        });
    },

    performConfirmationActions: function (response) {
        // Note: This only executes when the viewing is confirmed before it has been saved for the first time.
        // Else, this work is picked up directly by helpers.followUp.manageFollowUpUpdate()
        return gmgps.cloud.helpers.followUp.promptForDiaryEventConfirmations(
            response.UpdatedEvents,
            response.Data.EventType,
            response.Data.Id
        );
    },

    performFinalClosureActions: function () {
        var me = this;

        shell.domainEvents.raise({
            type: C.DomainEventType.ViewingCreated,
            ids: me.applicantIds,
            propertyType: me.propertyType
        });
    },

    saveIfLastViewingFollowupCompleted: function (
        followupType,
        followupStatus
    ) {
        var me = this;
        var $deferred = $.Deferred();

        var isFollowupCompletedViewingConfirmation =
            (followupType === C.FollowUpType.ViewingConfirmationApplicant ||
                followupType === C.FollowUpType.ViewingConfirmationOwner) &&
            followupStatus === C.FollowUpStatus.Complete;
        var followupDropdown = me.$followUps.data('followUpDropdown');
        var isFollowupLastRemainingViewingConfirmationFollowup =
            followupDropdown.countActiveFollowUps(
                C.FollowUpType.ViewingConfirmationApplicant
            ) +
                followupDropdown.countActiveFollowUps(
                    C.FollowUpType.ViewingConfirmationOwner
                ) ===
            1;
        var isUnsavedNewViewing = me.id === 0;

        if (
            !me.dirty ||
            isUnsavedNewViewing ||
            !isFollowupCompletedViewingConfirmation ||
            !isFollowupLastRemainingViewingConfirmationFollowup
        ) {
            return $deferred.resolve();
        }

        var $form = createForm(
            me.$root.find('#viewing-form'),
            '/viewing/getviewingdiaryconflicts'
        );

        //Insert applicants.
        $.each(me.applicantIds, function (i, v) {
            $form.append(
                '<input type="hidden" name="ApplicantIds" value="{1}" />'.format(
                    i,
                    v
                )
            );
        });

        var saveViewingDetailsOnly = function () {
            $form.prop('action', '/viewing/saveviewing');
            me.http.postForm($form, function (response) {
                me.setDirty(false);
                me.enableButton(me.$saveButton, false);
                me.$root
                    .find('#Viewing_VersionNumber')
                    .val(response.Data.VersionNumber); //update version number so subsequent saves target correct record
                $deferred.resolve();
            });
        };

        new gmgps.cloud.http(
            "viewing-saveIfLastViewingFollowupCompleted"
        ).postForm($form, function (response) {
            var conflict = new gmgps.cloud.helpers.DiaryConflict(response.Data);
            conflict.resolve(
                $form,
                function () {
                    saveViewingDetailsOnly();
                },
                function () {
                    me.setDirty(true);
                    $deferred.resolve();
                }
            );
        });

        return $deferred.promise();
    },

    saveViewing: function (windowIsClosing, updateOnly, callback) {
        var me = this;

        if (!me.validate()) return;

        me.$window.find('.action-button').lock();

        UpdateTickBoxOnToTrue('#UpdatedApplicantLastContactedDate', me.$root);
        UpdateTickBoxOnToTrue('#UpdatedOwnerLastContactedDate', me.$root);

        var $form = createForm(
            me.$root.find('#viewing-form'),
            '/viewing/getviewingdiaryconflicts'
        );

        var doSaveViewing = function () {
            const model = {};
            for (const [name, value] of new FormData($form[0])) {
                if (model[name] === undefined) {
                    model[name] = value;
                } else if (Array.isArray(model[name])) {
                    model[name].push(value);
                } else {
                    model[name] = [model[name], value];
                }
            }
            var $dropdown = me.$followUps.data('followUpDropdown');

            new gmgps.cloud.http("viewing-viewing").ajax(
            {
                async: false,
                args: {
                    viewModel: model,
                    followUps: followUps,
                    settings: $dropdown.settings.followUpSettings
                },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/Viewing/SaveViewingAndFollowUps',
                background: false
            }, function (response) {
                me.setDirty(false);
                me.$window.find('.action-button').unlock();
                me.enableButton(me.$saveButton, false);

                if (callback) {
                    callback();
                }

                var isNewViewing = me.id === 0;

                var originalDate = Date.parse(
                    $form.find('#OriginalStartDate').val()
                );

                var viewingFollowUpShifter = function () {
                    if (isNewViewing) return;

                    var newDate = Date.parse(
                        $form
                            .find('.mini-diary-input')
                            .attr('data-startdatetime')
                    );
                    gmgps.cloud.helpers.diary.promptToMoveFollowUps(
                        me.id,
                        originalDate,
                        newDate,
                        function () {
                            if (newDate.getTime() === originalDate.getTime())
                                return;

                            gmgps.cloud.helpers.followUp.conditionallyPromptViewingCommunications(
                                me.id
                            );
                        }
                    );
                };

                if (!me.id) {
                    var activeFollowUpCount =
                        me.$followUps
                            .data('followUpDropdown')
                            .countActiveFollowUps(
                                C.FollowUpType.ViewingConfirmationApplicant
                            ) +
                        me.$followUps
                            .data('followUpDropdown')
                            .countActiveFollowUps(
                                C.FollowUpType.ViewingConfirmationOwner
                            );

                    if (activeFollowUpCount === 0) {
                        me.performConfirmationActions(response).then(
                            function () {
                                me.performFinalClosureActions();
                            }
                        );
                    } else {
                        me.performFinalClosureActions();
                    }
                }

                if (!windowIsClosing) {
                    me.updateFormAfterSave(
                        response.Data.Id,
                        updateOnly,
                        viewingFollowUpShifter
                    );
                } else {
                    viewingFollowUpShifter();
                }
            });
        };

        //Insert applicants.
        $.each(me.applicantIds, function (i, v) {
            $form.append(
                '<input type="hidden" name="ApplicantIds" value="{1}" />'.format(
                    i,
                    v
                )
            );
        });

        //Find unconfirmed parties - server side needs to know as for viewings, parties are re-created.
        var followUps = me.$followUps
            .data('followUpDropdown')
            .getFollowUpObjects();
        var a = 0;
        var o = 0;
        $.each(followUps, function (i, followUp) {
            if (
                followUp.Type === C.FollowUpType.ViewingConfirmationApplicant &&
                (followUp.Status === C.FollowUpStatus.Pending ||
                    followUp.Status === C.FollowUpStatus.InProgress)
            ) {
                $form.append(
                    '<input type="hidden" name="UnconfirmedApplicantIds[{0}]" value="{1}" />'.format(
                        a,
                        followUp.ContactId
                    )
                );
                a++;
            }
            if (
                followUp.Type === C.FollowUpType.ViewingConfirmationOwner &&
                (followUp.Status === C.FollowUpStatus.Pending ||
                    followUp.Status === C.FollowUpStatus.InProgress)
            ) {
                $form.append(
                    '<input type="hidden" name="UnconfirmedOwnerIds[{0}]" value="{1}" />'.format(
                        o,
                        followUp.ContactId
                    )
                );
                o++;
            }
        });

        //This initial post is to check for conflicts.
        new gmgps.cloud.http("viewing-saveViewing").postForm(
            $form,
            function (response) {
                var conflict = new gmgps.cloud.helpers.DiaryConflict(
                    response.Data
                );

                conflict.resolve(
                    $form,
                    function () {
                        doSaveViewing();
                    },
                    function () {
                        me.setDirty(true);
                    }
                );
            }
        );
    },

    updateFormAfterSave: function (newId, updateOnly) {
        var me = this;

        me.id = newId;
        var originalId = parseInt(me.$root.find('#Viewing_Id').val());

        //Update the open form.
        me.$root.find('#Viewing_Id').val(newId);

        //Update the nav.
        var $item = me.$items.find('.item[data-id="{0}"]'.format(originalId));

        me.http.getView({
            url: '/viewing/getviewingnavitem',
            args: {
                id: newId,
                on: $item.hasClass('on')
            },
            post: true,
            complex: true,
            onSuccess: function (response) {
                //Insert/refresh/re-position the nav item.
                me.positionNavItem(newId, $(response.Data), updateOnly);
            }
        });
    },

    positionNavItem: function (id, $item, updateOnly) {
        var me = this;

        //Look for existing item.
        var $existingItem = me.$items.find('.item[data-id="{0}"]'.format(id));

        if ($existingItem.length === 0) {
            //Insert new item.
            var $dummyItem = me.$items.find('.item[data-id="0"]');
            $item.insertBefore($dummyItem);

            //Increase the width of the items container to allow room for this item.
            var extraWidth = $item.outerWidth(true);
            me.$items.outerWidth(me.$items.outerWidth(true) + extraWidth);
        } else {
            //Update existing item.
            $existingItem.replaceWith($item);
        }

        //Ensure that the item is slotted into the correct chronological order.
        // - It's already been placed/updated at this point, this is a check to see if it needs to be shifted to
        //   another position in the list based on the datetime of the viewing.
        var thisDate = Date.parse($item.attr('data-start'));
        var $afterItem = null;
        me.$items
            .find('.item[data-id!="0"][data-id!="{0}"]'.format(id))
            .each(function (i, v) {
                //Every item except this one and the "New Viewing" item.
                var $thatItem = $(v);
                var thatDate = Date.parse($thatItem.attr('data-start'));

                if (thatDate <= thisDate) {
                    $afterItem = $thatItem;
                }
            });
        if ($afterItem) {
            $item.insertAfter($afterItem);
        }

        //Select the item and reload.
        // - If it's not reloaded, buttons need to be worked out, tabs may need to be hidden/shown, it's easier to reload.
        // - UpdateOnly will be true if the item only needed to be updated - the user had moved on to another item and so we don't want to re-select this one once
        //   it's saved.
        if (!updateOnly) {
            me.selectNavItem($item);
        }
    },

    reinstateViewing: function () {
        var me = this;

        //Reinstate the cancelled viewing.
        new gmgps.cloud.http("viewing-reinstateViewing").ajax(
            {
                args: {
                    diaryEventId: me.id
                },
                dataType: 'json',
                type: 'post',
                url: 'Viewing/ReinstateViewing'
            },
            function (response) {
                if (response && response.Data) {
                    //Re-select this item.
                    var $item = me.$items.find(
                        '.item[data-id="{0}"]'.format(me.id)
                    );
                    me.selectNavItem($item);

                    //Growl
                    $.jGrowl('The viewing was reinstated successfully.', {
                        header: 'Viewing Reinstated',
                        theme: 'growl-property'
                    });
                }
            }
        );
    },

    cancelViewing: function () {
        var me = this;

        //save first, else user is prompted to save on window close after the cancelation, upon which it gets reinstated by that save
        if (me.dirty) me.saveViewing(false, true);

        var recordType = parseInt(
            me.$root.find('#Property_RecordTypeId').val()
        );

        var after = function (status, cancellationNotes) {
            //Cancel the diary event.

            new gmgps.cloud.http("viewing-cancelViewing").ajax(
                {
                    args: {
                        diaryEventId: me.id,
                        status: status,
                        cancellationNotes: cancellationNotes
                    },
                    dataType: 'json',
                    type: 'post',
                    url: 'Diary/CancelDiaryEvent'
                },
                function (response) {
                    if (response.Data == true) {
                        //Remove nav item.
                        var $item = me.$items.find(
                            '.item[data-id="{0}"]'.format(me.id)
                        );
                        var $next = $item.next();
                        var $prev = $item.prev();

                        if (
                            $next.length != 0 &&
                            parseInt($next.attr('data-id')) != 0
                        ) {
                            //Auto-select next item.
                            me.selectNavItem($next);
                        } else {
                            if ($prev.length != 0) {
                                //Auto-select previous item.
                                me.selectNavItem($item.prev());
                            } else {
                                //Nothing to select, close the viewing form.
                                me.$window
                                    .find('.buttons .cancel-button')
                                    .trigger('click');
                            }
                        }

                        //Get the width of the item, then remove it.
                        var width = $item.outerWidth(true);
                        $item.remove();

                        //Shrink the items container now that this item has gone.
                        me.$items.outerWidth(me.$items.outerWidth() - width);

                        //Growl
                        $.jGrowl('The viewing was cancelled successfully.', {
                            header: 'Viewing Cancelled',
                            theme: 'growl-property'
                        });

                        //Prompt for email/sms confirmation of cancellation of viewing.
                        gmgps.cloud.helpers.general.getMultiMessager({
                            title: 'Send Confirmations and Set Up Reminders for this Viewing',
                            intent: 'viewing-confirmations',
                            settings: {
                                allowAnonymousRecipients: true,
                                eventId: me.id,
                                eventCategory: C.EventCategory.Diary,
                                eventCancelled: true
                            },
                            onComplete: function () {}
                        });
                    }
                }
            );
        };

        var ownerText =
            recordType == C.PropertyRecordType.Sale ? 'Vendor' : 'Landlord';

        showDialog({
            type: 'question',
            title: 'Cancel Viewing',
            msg:
                'Select the reason why this viewing is being cancelled:<br/><br/>' +
                '<div class="ml20">' +
                '<form id="cancelViewingForm">' +
                '<div class="radio-and-label"><input type="radio" name="cancelled-by" id="vcb3" value="{0}" checked="checked" /><label class="ml5" for="vcb3">Cancelled by Applicant</label></div>'.format(
                    C.EventStatus.CancelledByApplicant
                ) +
                '<div class="radio-and-label"><input type="radio" name="cancelled-by" id="vcb2" value="{0}" /><label class="ml5" for="vcb2">Cancelled by {1}</label></div>'.format(
                    C.EventStatus.CancelledByOwner,
                    ownerText
                ) +
                '<div class="radio-and-label"><input type="radio" name="cancelled-by" id="vcb1" value="{0}" /><label class="ml5" for="vcb1">Cancelled by Office</label></div>'.format(
                    C.EventStatus.CancelledByOffice
                ) +
                '</form>' +
                '</div>' +
                '<p></p>' +
                '<p>Notes for the cancellation: (optional)</p>' +
                '<div><textarea name="cancellation-notes" id="cancellation-notes" maxlength="250" placeholder="Max. 250 characters"></textarea></div>' +
                '<br/>' +
                '<p>To continue without cancelling, click undo.</p>',
            //#todo - add checkboxes to give option to notify by email/sms
            buttons: {
                'Confirm Cancellation': function () {
                    var status = parseInt(
                        $(this)
                            .closest('.dialog')
                            .find('input[name="cancelled-by"]:checked')
                            .val()
                    );
                    var notes = $(this)
                        .closest('.dialog')
                        .find('#cancellation-notes')
                        .val();
                    after(status, notes);
                    $(this).dialog('close');
                },
                Undo: function () {
                    $(this).dialog('close');
                    return false;
                }
            }
        });
    },

    makeOffer: function () {
        var me = this;

        //Func to open the offer window and close this viewing window.
        var after = function () {
            gmgps.cloud.helpers.property.createOffer({
                propertyId: me.propertyId,
                contactIds: me.applicantIds,
                redirectToAlp: false
            });

            setTimeout(function () {
                me.closeMyWindow();
            }, 1000);
        }; //Confirm make offer.
        showDialog({
            type: 'question',
            title: 'Make Offer',
            msg: 'Make an offer on this property using the details from this viewing?',
            buttons: {
                Yes: function () {
                    after();
                    $(this).dialog('close');
                },
                No: function () {
                    $(this).dialog('close');
                }
            }
        });
    },

    beforeViewingClose: function (callback) {
        var me = this;

        //Check the dirty flag.
        // - Callback with true if the viewing is dirty and the user wishes to save.
        // - Callback with false if the vieiwng is not dirty or the user didn't wish to save.
        if (me.dirty) {
            showDialog({
                type: 'question',
                title: 'Save Changes?',
                msg: 'This viewing has unsaved changes.<br/><br/>Save these changes now?',
                buttons: {
                    Save: function () {
                        callback(true);
                        $(this).dialog('close');
                    },
                    Discard: function () {
                        $(this).dialog('close');
                        callback(false);
                    }
                }
            });
        } else {
            callback(false);
        }
    },

    isCancelled: function () {
        //Returns true if this viewing has an eventStatus of cancelled (by way of any of the various cancelled states).
        var me = this;

        var eventStatus = parseInt(me.$root.find('#Viewing_Status').val());

        return (
            eventStatus === C.EventStatus.CancelledByApplicant ||
            eventStatus === C.EventStatus.CancelledByContact ||
            eventStatus === C.EventStatus.CancelledByOffice ||
            eventStatus === C.EventStatus.CancelledByOwner
        );
    },

    validate: function (shouldDisplayErrorMessages) {
        var me = this;
        if (shouldDisplayErrorMessages !== false) {
            shouldDisplayErrorMessages = true;
        }
        //Check that at least one property has been selected.
        if (me.propertyId == 0) {
            if (shouldDisplayErrorMessages) {
                showInfo('Please specify at least one property to be viewed.');
            }
            return false;
        }

        //Check that at least one applicant has been selected.
        if (me.applicantIds.length == 0) {
            if (shouldDisplayErrorMessages) {
                showInfo('Please specify an applicant for the viewing.');
            }
            return false;
        }

        return true;
    },

    viewingFollowUpRequired: function () {
        var me = this;

        var days = me.$root
            .find('#NegotiatorId option:selected')
            .attr('data-followupdays');
        if (days === undefined || days === '') return false;

        return true;
    }
};
