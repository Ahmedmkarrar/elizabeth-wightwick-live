gmgps.cloud.helpers.followUp = {
    //Runs every time a followup is updated via this client
    manageFollowUpUpdate: function (
        id,
        followUpType,
        linkedType,
        linkedId,
        isCompleted
    ) {
        var me = this;

        //Review
        if (isCompleted && me.followUpTypeIsAReview(followUpType)) {
            showDialog({
                type: 'question',
                title: 'Completed Review',
                msg: 'Would you like to schedule another review?',
                buttons: {
                    Yes: function () {
                        $(this).dialog('close');
                        me.cloneFollowUp(id);
                    },
                    No: function () {
                        $(this).dialog('close');
                    }
                }
            });
        }

        switch (linkedType) {
            case C.ModelType.DiaryEvent:
                if (
                    followUpType === C.FollowUpType.ViewingConfirmationOwner ||
                    followUpType === C.FollowUpType.ViewingConfirmationApplicant
                ) {
                    //If all diary event parties are confirmed, conditionally offer to send confirmations to them.
                    gmgps.cloud.helpers.followUp.conditionallyPromptViewingCommunications(
                        linkedId
                    );
                }
        }

        return null;
    },

    conditionallyPromptViewingCommunications: function (diaryEventId) {
        return new gmgps.cloud.http(
            "followUp-conditionallyPromptViewingCommunications"
        ).ajax(
            {
                args: {
                    diaryEventId: diaryEventId
                },
                dataType: 'json',
                type: 'post',
                url: '/Event/GetAreAllPartiesConfirmedOnDiaryEvent'
            },
            function (response) {
                if (response.Data.AllPartiesConfirmed) {
                    return gmgps.cloud.helpers.followUp.promptForDiaryEventConfirmations(
                        response.UpdatedEvents,
                        response.Data.EventType,
                        diaryEventId
                    );
                }
            }
        );
    },

    followUpTypeIsAReview: function (followUpType) {
        return (
            followUpType === C.FollowUpType.PropertyReview ||
            followUpType === C.FollowUpType.ContactReview ||
            followUpType === C.FollowUpType.DealProgressionReview
        );
    },

    promptForDiaryEventConfirmations: function (
        eventHeaders,
        eventType,
        diaryEventId
    ) {
        var deferred = $.Deferred();

        switch (eventType) {
            case C.EventType.Viewing:
                //Prompt for email/sms confirmation.
                gmgps.cloud.helpers.general.getMultiMessager({
                    title: 'Send Confirmations and Set Up Reminders for this Viewing',
                    intent: 'viewing-confirmations',
                    settings: {
                        allowAnonymousRecipients: true,
                        eventId: diaryEventId,
                        eventCategory: C.EventCategory.Diary
                    },
                    onComplete: function () {
                        //Prompt for letters.
                        gmgps.cloud.helpers.general.promptForLetters({
                            eventHeaders: eventHeaders,
                            onClose: function () {
                                deferred.resolve();
                            }
                        });
                    }
                });
                break;

            default:
                break; //todo - General appointments could be included here in future.
        }

        return deferred.promise();
    },

    createFollowUp: function (
        type,
        title,
        description,
        linkedType,
        linkedId,
        branchId,
        contactId,
        propertyId,
        callback
    ) {
        var windowCfg = {
            title: title,
            post: true,
            controller: gmgps.cloud.ui.views.followUp,
            data: {
                excludeCancel: true,
                followUp: {
                    Type: type
                }
            },
            width: 525,
            draggable: true,
            modal: true,
            actionButton: 'Save',
            cancelButton: 'Close',
            onBeforeDisplay: function ($f, onBeforeDisplayCallback) {
                $f.find('#FollowUp_CustomTitle').val(description);

                onBeforeDisplayCallback();
            },
            onReady: function ($f) {
                $f.find('#FollowUp_CustomTitle').focus();
            },
            onAction: function ($f) {
                var $form = createForm($f, 'FollowUp/UpdateFollowUp');
                new gmgps.cloud.http("followUp-onAction").postForm(
                    $form,
                    function (response) {
                        gmgps.cloud.helpers.followUp.manageFollowUpUpdate(
                            response.Data.FollowUp.Id,
                            response.Data.FollowUp.Type,
                            response.Data.FollowUp.LinkedType,
                            response.Data.FollowUp.LinkedId,
                            response.Data.FollowUp.Status ===
                                C.FollowUpStatus.Complete
                        );

                        if (callback) {
                            callback(response);
                        }
                    }
                );
            }
        };

        windowCfg.url = '/FollowUp/GetFollowUp';
        windowCfg.urlArgs = {
            id: 0,
            followUp: {
                Type: type,
                CustomTitle: title,
                LinkedType: linkedType,
                LinkedId: linkedId,
                BranchId: branchId,
                ContactId: contactId ? contactId : 0,
                PropertyId: propertyId ? propertyId : 0
            }
        };

        new gmgps.cloud.ui.controls.window(windowCfg);
    },

    editFollowUp: function (id, type, title, settings) {
        var me = this;
        // first check and see if we've got this followup active elsewhere and preferrably switch to that one
        // otherwise things are going to get messy

        if (me.activateFollowUpDialog(id)) {
            return true;
        }

        var data = {};

        new gmgps.cloud.ui.controls.window({
            title: title,
            windowId: 'followUpModal',
            url: '/FollowUp/GetFollowUp',
            urlArgs: {
                id: id,
                followUp: null,
                settings: settings || {}
            },
            post: true,
            data: me.followUpNotesArgs(type, data),
            controller: gmgps.cloud.ui.views.followUp,
            width: 525,
            draggable: true,
            modal: true,
            actionButton: 'Save',
            cancelButton: 'Close',
            onAction: function ($f) {
                var $form = createForm($f, 'FollowUp/UpdateFollowUp');

                new gmgps.cloud.http("followUp-onAction").postForm(
                    $form,
                    function (response) {
                        gmgps.cloud.helpers.followUp.manageFollowUpUpdate(
                            response.Data.FollowUp.Id,
                            response.Data.FollowUp.Type,
                            response.Data.FollowUp.LinkedType,
                            response.Data.FollowUp.LinkedId,
                            response.Data.FollowUp.Status ===
                                C.FollowUpStatus.Complete
                        );
                    }
                );
            },
            onCancel: function () {}
        });
    },

    updateFollowUpStatusAndText: function (request) {
        // Determine diaryId from request.followUpId or request.originatingEventId existing vs just created
        var originatingEventId = request.followUpId || request.originatingEventId;

        // Check if diaryId is defined
        if (!originatingEventId) {
            alert("No diary ID available to process.");
            return;
        }

        // Helper function to update the "on" class on status boxes
        function setStatusBox(statusClass) {
            // Remove 'on' from all status boxes
            var allStatusBoxes = document.querySelectorAll('.status-box');
            allStatusBoxes.forEach(function (sb) {
                sb.classList.remove('on');
            });

            // Add 'on' to the specific status box
            var statusBox = document.querySelector('.status-box.' + statusClass);
            if (statusBox) {
                statusBox.classList.add('on');
            }
        }

        // Update the table cell for a given event
        function updateTableCell(originatingEventId, oldStatus, newStatus) {
            var row = document.querySelector('.date-event-row-detail[data-followupid="' + originatingEventId + '"]');
            if (row) {
                var cell = row.querySelector('td[data-sortval="' + oldStatus + '"]');
                if (cell) {
                    cell.setAttribute('data-sortval', newStatus);
                    cell.textContent = newStatus;
                }
            }
        }

        function changeButtonText(className, newText) {
            var button = document.querySelector(`.${className}`);
            
            if (button) {
                button.textContent = newText;
            } 
        }

        function updateInputValue(elementId, value = '') {
            var inputElement = document.getElementById(elementId);

            if (inputElement) {
                inputElement.value = value;
            }
        }

        gmgps.cloud.helpers.diary.getDiaryEvent(originatingEventId).then(function (diaryEvent) {
            let status = C.FollowUpStatus.Pending; // Default to Pending

            var statusInput = document.getElementById('FollowUp_Status');

            if (diaryEvent && diaryEvent.Id) {
                // Event exists, set status to In Progress
                setStatusBox('inprogress');
                updateTableCell(originatingEventId, 'Pending', 'In Progress');
                status = C.FollowUpStatus.InProgress;
                changeButtonText('third-button', 'View');

                if (statusInput) {
                    statusInput.value = C.FollowUpStatus.InProgress;
                }

                updateInputValue('InspectionDiaryId', diaryEvent.Id);
            } else {
                // No event, set status to Pending
                setStatusBox('pending');
                updateTableCell(originatingEventId, 'In Progress', 'Pending');
                changeButtonText('third-button', 'Book');

                if (statusInput) {
                    statusInput.value = C.FollowUpStatus.Pending;
                }

                updateInputValue('InspectionDiaryId');
            }

            new gmgps.cloud.http("dashboard-updateFollowUpStatus").ajax({
                args: {
                    id: originatingEventId,
                    status: status
                },
                background: true,
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/FollowUp/UpdateFollowUpStatus'
            }).then(
                function (error) {
                    console.log("Error updating the FollowUpStatus: ", error)
                }
            );
        });

    },

    cloneFollowUp: function (followUpId) {
        var windowCfg = {
            title: 'Schedule Review',
            post: true,
            controller: gmgps.cloud.ui.views.followUp,
            data: null,
            width: 525,
            draggable: true,
            modal: true,
            actionButton: 'Save',
            cancelButton: 'Close',
            onBeforeDisplay: function ($f, onBeforeDisplayCallback) {
                onBeforeDisplayCallback();
            },
            onReady: function ($f) {
                $f.find('#FollowUp_CustomTitle').focus();
            },
            onAction: function ($f) {
                var $form = createForm($f, 'FollowUp/UpdateFollowUp');
                new gmgps.cloud.http("followUp-onAction").postForm(
                    $form,
                    function (response) {
                        gmgps.cloud.helpers.followUp.manageFollowUpUpdate(
                            response.Data.FollowUp.Id,
                            response.Data.FollowUp.Type,
                            response.Data.FollowUp.LinkedType,
                            response.Data.FollowUp.LinkedId,
                            response.Data.FollowUp.Status ===
                                C.FollowUpStatus.Complete
                        );
                    }
                );
            }
        };

        windowCfg.url = '/FollowUp/GetClonedFollowUp';
        windowCfg.urlArgs = {
            id: followUpId
        };

        new gmgps.cloud.ui.controls.window(windowCfg);
    },

    // open existing instance of the followup dialog if one exists
    activateFollowUpDialog: function (followUpId) {
        if (followUpId === 0) return false;

        return shell.activateExistingWindow(
            $(
                '.window .follow-up-form[data-id="{0}"][data-singleinstance="1"]'.format(
                    followUpId
                )
            )
        );
    },

    followUpNotesArgs: function (followUpType, args) {
        if (!args) {
            args = {};
        }

        switch (followUpType) {
            case C.FollowUpType.ViewingFollowUpApplicant:
            case C.FollowUpType.ViewingFollowUpOwner:
                args.mirrorViewingNotes = true;
                break;
            case C.FollowUpType.ContactReview:
                args.mirrorContactReviewNotes = true;
                break;
            case C.FollowUpType.PropertyReview:
                args.mirrorPropertyReviewNotes = true;
                break;
        }

        return args;
    },

    // Filters an array of FollowUp pnUpdates to only contain those applicable to dashboard and followup dropdown updates
    filterPnUpdateTypes: function (pnUpdates) {
        var followUpTypes = [
            C.FollowUpType.PostAppraisalFollowUpOwner,
            C.FollowUpType.ViewingFollowUpApplicant,
            C.FollowUpType.ViewingFollowUpOwner,
            C.FollowUpType.OfferFollowUpOwner,
            C.FollowUpType.OfferFollowUpApplicant,
            C.FollowUpType.DealProgressionReview,
            C.FollowUpType.LostInstructionReview,
            C.FollowUpType.PropertyReview,
            C.FollowUpType.ContactReview,
            C.FollowUpType.ViewingConfirmationApplicant,
            C.FollowUpType.ViewingConfirmationOwner,
            C.FollowUpType.Todo,
            C.FollowUpType.ViewingCancelledFollowUpApplicant,
            C.FollowUpType.ViewingCancelledFollowUpOwner
        ];

        return $.grep(pnUpdates, function (e) {
            return followUpTypes.indexOf(e.Data.Type) !== -1;
        });
    },

    // Returns whether the user has permissions to see a pn FollowUp
    followUpRelevantForUser: function (followUpBranchId, userLinkedBranchIds) {
        if (Array.isArray(userLinkedBranchIds)) {
            return userLinkedBranchIds.indexOf(followUpBranchId) >= 0;
        }
        return false;
    }
};
