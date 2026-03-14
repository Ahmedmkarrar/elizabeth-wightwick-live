gmgps.cloud.ui.views.savedMatchListManager = function (args) {
    var me = this;
    me.cfg = args;
    me.$root = args.$root;
    me.httpUtility =
        args.httpUtility ||
        new gmgps.cloud.http("savedMatchListManager-savedMatchListManager");

    me.search = null;
    me.list = null;
    me.hasChanges = false;
    me.statusRequests = {};
    me.fetchingRowsViaAjax = false;
    me.scrollMargin = 244; // equal to 4 rows for debugging. Change to n rows eqv.
    me.scrollIntervals = 200; // tweak for best performance

    me.activeBandMaxScroll = null;
    me.completedBandMaxScroll = null;
    me.rejectedBandMaxScroll = null;

    me.onListDeleted = args.onListDeleted;
    me.onListChanged = args.onListChanged;

    me.$tabs = me.$root.find('#matchListTabs');

    me.propertyId = me.cfg.id;

    // These values mactch the SavedmatchList column order enum
    me.DatabaseListCols = {
        Band: 4,
        BookMarked: 6,
        Notes: 10,
        PhoneCallNotes: 11,
        Appointment: 9,
        SMS: 7,
        Email: 8
    };

    me.init();

    return this;
};

gmgps.cloud.ui.views.savedMatchListManager.prototype = {
    init: function () {
        var me = this;

        // Event Handlers

        me.$root.on('click', '#matchlist-root .notes-save', function (e) {
            e.stopPropagation();

            var $container = $(this).closest('.notes').find('.text-container');
            var $buttons = $(this).closest('.notes').find('.save-undo');
            var $textArea = $(this).closest('.notes').find('.matchlist-notes');

            var currentState = $textArea.val();
            $textArea.attr('data-last-save-state', currentState);

            me.setNotesEditStateDirty(false, $container, $buttons, $textArea);

            var $row = $(this).closest('.match-list-item');
            var listId = $row.closest('.matchlist').attr('data-matchlist-id');
            var rowId = $row.attr('data-matchlistrow-id');

            me.DB_saveMatchListNotes(listId, rowId, currentState);
        });

        me.$root.on('click', '#matchlist-root .notes-undo', function (e) {
            e.stopPropagation();

            var $container = $(this).closest('.notes').find('.text-container');
            var $buttons = $(this).closest('.notes').find('.save-undo');
            var $textArea = $(this).closest('.notes').find('.matchlist-notes');

            var previousState = $textArea.attr('data-last-save-state');
            $textArea.val(previousState);

            me.setNotesEditStateDirty(false, $container, $buttons, $textArea);
        });

        me.$root.on(
            'input propertychange paste',
            '#matchlist-root .matchlist-notes',
            function () {
                var $container = $(this).closest('.text-container');
                var $buttons = $(this).closest('.notes').find('.save-undo');
                var $textArea = $(this);

                var lastSaveState = $(this).attr('data-last-save-state');
                var currentState = $(this).val();

                if (lastSaveState == currentState) {
                    me.setNotesEditStateDirty(
                        false,
                        $container,
                        $buttons,
                        $textArea
                    );
                } else {
                    me.setNotesEditStateDirty(
                        true,
                        $container,
                        $buttons,
                        $textArea
                    );
                }
            }
        );

        me.$root.on('click', '#btn-create-match-list', function () {
            if (!$(this).hasClass('disabled')) {
                me.getNewMatchListContactIds();
            }
        });

        me.$root.on('click', '#matchlist-root .reassign', function () {
            var listId = $(this)
                .closest('.matchlist')
                .attr('data-matchlist-id');
            var negId = $(this).closest('.matchlist').attr('data-neg-id');
            me.getExistingMatchListContactIds(listId, negId);
        });

        me.$root.on('click', '#matchlist-root .print', function () {
            var listId = $(this)
                .closest('.matchlist')
                .attr('data-matchlist-id');
            var negId = $(this).closest('.matchlist').attr('data-neg-id');
            me.selectPrintOptions(listId, negId);
        });

        me.$root.on('click', '#matchlist-root .btn-delete-list', function () {
            var $targetList = $(this).closest('.matchlist');
            me.confirmDeleteMatchList($targetList);
        });

        me.$root.on('click', '#matchlist-root .btn-locate', function () {
            var $targetList = $(this).closest('.matchlist');
            var $activeBand = $targetList.find('.band-active');

            var bookmarkedId = $(this).attr('data-bookmarked-row');

            var $bookMarkedRow = $activeBand.find(
                'div.match-list-item[data-matchlistrow-id="{0}"]'.format(
                    bookmarkedId
                )
            );
            var bookmarkedRowIsLoaded = $bookMarkedRow.length > 0;

            var bandNumber = $activeBand.attr('data-band-num');
            var matchListId = $targetList.attr('data-matchlist-id');
            var negotiatorId = $(document).find('#_userid').val();

            var loadRowsUntilBookmarkPresent = function () {
                while (!bookmarkedRowIsLoaded) {
                    var rowsLoaded = $activeBand.find('div.loaded').length;
                    me.$root
                        .find(
                            'h3.band[data-band-id="{0}"] .band-title'.format(
                                bandNumber
                            )
                        )
                        .addClass('loading');
                    me.DB_loadRowsForBand(
                        $activeBand,
                        rowsLoaded,
                        bandNumber,
                        matchListId,
                        negotiatorId,
                        true
                    );
                    $bookMarkedRow = $activeBand.find(
                        'div.match-list-item[data-matchlistrow-id="{0}"]'.format(
                            bookmarkedId
                        )
                    );
                    bookmarkedRowIsLoaded = $bookMarkedRow.length > 0;
                }

                var topOfRow = $bookMarkedRow.position().top;
                var curentScroll = $activeBand.scrollTop();
                var newScrollPos = curentScroll + topOfRow;

                $activeBand.scrollTo(newScrollPos);
                me.flashRow($bookMarkedRow);
            };

            var displayingActiveBand =
                $activeBand.closest('.bandContent').attr('aria-hidden') ==
                'false'
                    ? true
                    : false;
            if (displayingActiveBand) {
                loadRowsUntilBookmarkPresent();
            } else {
                $targetList.one('accordionactivate', function () {
                    loadRowsUntilBookmarkPresent();
                });

                $targetList.find('.band.active').trigger('click');
            }
        });

        me.$root.on('click', '#matchlist-root .expand', function () {
            if (!$(this).hasClass('disabled')) {
                var $targetList = me.$activeList();
                var $activeBand = $targetList
                    .find('.bandContent.band-expanded')
                    .find('.scroll-region');

                var bandRowsExpanded =
                    me.getActiveBandExpandedState($targetList);

                if (bandRowsExpanded === true) {
                    $activeBand.attr('data-all-rows-expanded', 'false');
                    me.expandCollpaseAllRowsInBand(
                        $activeBand,
                        !bandRowsExpanded
                    );
                } else {
                    $activeBand.attr('data-all-rows-expanded', 'true');
                    me.expandCollpaseAllRowsInBand(
                        $activeBand,
                        !bandRowsExpanded
                    );
                }
            }
        });

        me.$root.on('click', '#matchlist-root .salutation', function (e) {
            e.stopPropagation();
            gmgps.cloud.helpers.contact.editContact({
                id: $(this).closest('.match-list-item').attr('data-contact-id')
            });
        });

        me.$root.on('click', '#matchlist-root .static-area', function () {
            var clickedRow = $(this).closest('.match-list-item');
            var $panel = clickedRow.find('.expandable-area');
            var $band = clickedRow.closest('.scroll-region');
            var icon = clickedRow.find('.expand-icon');

            var $notesArea = clickedRow.find('.text-container');
            me.setNotesAreaHeight($notesArea);

            if ($panel.css('display') == 'none') {
                $panel.stop().slideDown('300', 'easeOutExpo', function () {
                    me.recalculateScrollRange($band);
                });
                icon.addClass('up');
            } else {
                $panel.stop().slideUp('200', 'easeOutExpo', function () {
                    me.recalculateScrollRange($band);
                });
                icon.removeClass('up');
            }
        });

        me.$root.on('click', '#matchlist-root .ui-tabs-nav', function () {
            var $notesArea = $(this)
                .closest('.match-list-item')
                .find('.text-container');
            me.setNotesAreaHeight($notesArea);
        });

        me.$root.on('click', '#matchlist-root .btn-thumbup', function (e) {
            e.stopPropagation();

            var $thisButton = $(this);
            var alreadyTicked = $thisButton.find('.ticked').hasClass('active')
                ? true
                : false;

            var $thisRow;
            var $targetList = me.$activeList();

            if (!alreadyTicked) {
                $thisRow = $thisButton.closest('.match-list-item');
                var $completedBand = me.$activeList().find('.band-completed');

                $thisButton.find('.ticked').addClass('active');
                $thisRow
                    .find('.btn-thumbdown')
                    .find('.ticked')
                    .removeClass('active');

                me.moveRowToBand($thisRow, $completedBand, $targetList);
            } else {
                $thisRow = $thisButton.closest('.match-list-item');
                var $activeBand = me.$activeList().find('.band-active');

                $thisButton.find('.ticked').removeClass('active');
                me.moveRowToBand($thisRow, $activeBand, $targetList);
            }

            $thisButton.closest('.scroll-region').trigger('content-changed');
        });

        me.$root.on('click', '#matchlist-root .btn-thumbdown', function (e) {
            e.stopPropagation();

            me.hasChanges = true;

            var $thisButton = $(this);
            var alreadyTicked = $thisButton.find('.ticked').hasClass('active')
                ? true
                : false;

            var $targetList = me.$activeList();

            var $thisRow;
            if (!alreadyTicked) {
                $thisRow = $thisButton.closest('.match-list-item');
                var $rejectedBand = $targetList.find('.band-rejected');

                $thisButton.find('.ticked').addClass('active');
                $thisRow
                    .find('.btn-thumbup')
                    .find('.ticked')
                    .removeClass('active');

                me.moveRowToBand($thisRow, $rejectedBand, $targetList);
            } else {
                $thisRow = $thisButton.closest('.match-list-item');
                var $activeBand = $targetList.find('.band-active');

                $thisButton.find('.ticked').removeClass('active');
                me.moveRowToBand($thisRow, $activeBand, $targetList);
            }

            $thisButton.closest('.scroll-region').trigger('content-changed');
        });

        me.$root.on('click', '#matchlist-root .bookmark', function (e) {
            e.stopPropagation();

            var $row = $(this).closest('.match-list-item');
            var $targetList = me.$activeList();

            var listId = $row.closest('.matchlist').attr('data-matchlist-id');
            var rowId = $row.attr('data-matchlistrow-id');
            var propertyId = me.propertyId;

            if (!$(this).hasClass('active')) {
                $targetList.find('.bookmark').removeClass('active');
                $(this).addClass('active');
                me.$root
                    .find('#matchlist-root .btn-locate')
                    .attr('data-bookmarked-row', rowId);

                me.DB_setRowAsBookmarked(
                    $targetList,
                    propertyId,
                    listId,
                    rowId,
                    true
                );
            } else {
                $(this).removeClass('active');
                me.$root
                    .find('#matchlist-root .btn-locate')
                    .removeAttr('data-bookmarked-row');

                me.DB_setRowAsBookmarked(
                    $targetList,
                    propertyId,
                    listId,
                    rowId,
                    false
                );
            }
        });

        me.$root.on(
            'click',
            '#matchlist-root .btn-book-appointment',
            function (e) {
                e.stopPropagation();

                var $targetList = me.$activeList();
                var $row = $(this).closest('.match-list-item');
                var contactId = $row.attr('data-contact-id');
                var listId = $row
                    .closest('.matchlist')
                    .attr('data-matchlist-id');
                var rowId = $row.attr('data-matchlistrow-id');
                var propertyId = parseInt(me.propertyId);

                var args = {
                    propertyId: parseInt(me.propertyId),
                    contactId: contactId,
                    contextModelType: C.ModelType.Property
                };
                var zIndex = 0;

                new gmgps.cloud.ui.controls.window({
                    title: '',
                    windowId: 'matchListModal1',
                    controller: gmgps.cloud.ui.views.viewing,
                    url: '/Viewing/getviewingnav',
                    urlArgs: {
                        contextModelType: args.contextModelType
                            ? args.contextModelType
                            : C.ModelType.Unknown,
                        viewingId: args.viewingId ? args.viewingId : 0,
                        propertyId: args.propertyId ? args.propertyId : 0,
                        contactId: args.contactId ? args.contactId : 0,
                        userId: args.userId ? args.userId : shell.userId,
                        start: args.start
                            ? args.start.toString('dd MMM yyyy HH:mm')
                            : null,
                        end: args.end
                            ? args.end.toString('dd MMM yyyy HH:mm')
                            : null
                    },
                    post: true,
                    complex: true,
                    width: 1000,
                    nopadding: true,
                    draggable: true,
                    modal: true,
                    controllerCanPreventCancel: true,
                    sourceZIndex: zIndex,
                    actionButton: 'Save Viewing',
                    cancelButton: 'Close',
                    onCancel: function () {
                        return false;
                    },
                    onAction: function () {
                        return false;
                    },
                    postActionCallback: function () {
                        // Call-back method 'onAction' does not fire because '/Property/getviewingnav :action' always returns false.
                        // As a result, window.js wont call the onAction callback method we pass in. Not great hey!?
                        // To get around this we have to assume that if the user uses the complete button, then they added a viewing.
                        // ** Please note that its possible the amended a previous appointment on the property, not added a new one
                        // for the given contact.

                        $row.find('.btn-book-appointment')
                            .find('.ticked')
                            .addClass('active');
                        me.DB_setRowAsHavingAppointment(
                            $targetList,
                            propertyId,
                            listId,
                            rowId
                        );
                    }
                });
            }
        );

        me.$root.on(
            'click',
            '#matchlist-root .btn-add-file-note',
            function (e) {
                e.stopPropagation();

                var contactId = $(this)
                    .closest('.match-list-item')
                    .attr('data-contact-id');
                var $row = $(this).closest('.match-list-item');
                var $targetList = me.$activeList();

                var args = {
                    settings: {
                        propertyId: parseInt(me.propertyId),
                        originatingEventId: 0,
                        originatingEventCategory: 0,
                        allowPartiesToBeAdded: false,
                        contactId: contactId,
                        eventSubType: C.EventSubType.FileNote,
                        noteSource: C.NoteSourceType.Contact
                    },
                    onComplete: function () {
                        me.markRowAsHavingNotes($row, $targetList);
                    },
                    onCancel: function () {
                        return false;
                    }
                };

                new gmgps.cloud.ui.controls.window({
                    title: 'Add File Note',
                    windowId: 'matchlistAddFileNoteModal',
                    controller: gmgps.cloud.ui.views.sharedNote,
                    url: '/Event/CreateNote',
                    urlArgs: args.settings,
                    post: true,
                    complex: true,
                    width: 600,
                    draggable: true,
                    modal: true,
                    actionButton: 'Save',
                    cancelButton: 'Cancel',
                    onAction: args.onComplete,
                    onCancel: args.onCancel,
                    postActionCallback: function () {}
                });
            }
        );

        me.$root.on(
            'click',
            '#matchlist-root .btn-add-call-note, #matchlist-root .phonenumber',
            function (e) {
                e.stopPropagation();

                var contactId = $(this)
                    .closest('.match-list-item')
                    .attr('data-contact-id');
                var $row = $(this).closest('.match-list-item');
                var $targetList = me.$activeList();

                var args = {
                    settings: {
                        propertyId: parseInt(me.propertyId),
                        originatingEventId: 0,
                        originatingEventCategory: 0,
                        allowPartiesToBeAdded: false,
                        contactId: contactId,
                        eventSubType: C.EventSubType.PhoneCall,
                        noteSource: C.NoteSourceType.Contact
                    },
                    onComplete: function () {
                        me.markRowAsHavingPhoneCallNotes($row, $targetList);
                    },
                    onCancel: function () {
                        return false;
                    }
                };

                new gmgps.cloud.ui.controls.window({
                    title: 'Add Notes from Telephone Conversation',
                    windowId: 'matchlistNotesModal',
                    controller: gmgps.cloud.ui.views.sharedNote,
                    url: '/Event/CreateNote',
                    urlArgs: args.settings,
                    post: true,
                    complex: true,
                    width: 600,
                    draggable: true,
                    modal: true,
                    actionButton: 'Save',
                    cancelButton: 'Cancel',
                    onAction: args.onComplete,
                    onCancel: args.onCancel
                });
            }
        );

        me.$root.on(
            'click',
            '#matchlist-root .btn-send-email, #matchlist-root .emailaddress',
            function (e) {
                e.stopPropagation();

                var $targetList = me.$activeList();
                var $row = $(this).closest('.match-list-item');
                var listId = $row
                    .closest('.matchlist')
                    .attr('data-matchlist-id');
                var rowId = $row.attr('data-matchlistrow-id');
                var propertyId = parseInt(me.propertyId);

                var contactId = $(this)
                    .closest('.match-list-item')
                    .attr('data-contact-id');
                var ownerContactIds = [];
                ownerContactIds.push(contactId);

                var args = {
                    propertyId: parseInt(me.propertyId),
                    ContentType: C.DocumentContentType.Html,
                    contactIds: ownerContactIds
                };

                new gmgps.cloud.ui.controls.window({
                    title: 'Email',
                    windowId: 'matchlistEmailModal',
                    controller: gmgps.cloud.ui.views.email,
                    url: args.url || '/Email/CreateEmail',
                    contentType: args.contentType,
                    post: true,
                    urlArgs: args,
                    complex: true,
                    width: 800,
                    draggable: true,
                    modal: true,
                    actionButton: 'Send',
                    cancelButton: 'Cancel',
                    onAction: function () {
                        $row.find('.btn-send-email')
                            .find('.ticked')
                            .addClass('active');
                        me.DB_setRowAsHavingEmail(
                            $targetList,
                            propertyId,
                            listId,
                            rowId
                        );
                    },
                    onCancel: function () {
                        return false;
                    }
                });
            }
        );

        me.$root.on('click', '#matchlist-root .btn-send-sms', function (e) {
            e.stopPropagation();

            var $targetList = me.$activeList();
            var $row = $(this).closest('.match-list-item');
            var listId = $row.closest('.matchlist').attr('data-matchlist-id');
            var rowId = $row.attr('data-matchlistrow-id');

            var propertyId = parseInt(me.propertyId);
            var contactId = $(this)
                .closest('.match-list-item')
                .attr('data-contact-id');

            var recipientContactIds = [];
            recipientContactIds.push(contactId);

            var contentPropertyIds = [];
            contentPropertyIds.push(propertyId);

            var args = {
                contentPropertyIds: contentPropertyIds,
                templateId: 1,
                recipientContactIds: recipientContactIds
            };

            new gmgps.cloud.ui.controls.window({
                title: 'SMS Message',
                windowId: 'matchlistSMSModal',
                controller: gmgps.cloud.ui.views.sms,
                url: 'SMS/CreateSMS',
                post: true,
                urlArgs: args,
                complex: true,
                width: 430,
                draggable: true,
                modal: true,
                actionButton: 'Send',
                cancelButton: 'Cancel',
                onAction: function () {
                    $row.find('.btn-send-sms')
                        .find('.ticked')
                        .addClass('active');
                    me.DB_setRowAsHavingSMS(
                        $targetList,
                        propertyId,
                        listId,
                        rowId
                    );
                },
                onCancel: function () {
                    return false;
                }
            });
        });

        // List - Tab switching
        me.$tabs.tabs({
            activate: function (event, ui) {
                var index = ui.newTab.index();

                me.activateTab(index);
            }
        });

        // Setup pre-loaded accordians
        me.setupAccordions();

        // Resize accordion heights on window resize
        $(window).on('resize', function (e) {
            if (e.target == window) {
                me.sizeUI();
            }
        });
    },

    refreshSourceList: function () {
        var me = this;

        if (me.hasChanges == true) {
            me.hasChanges = false;
            me.onListChanged();
        }
    },

    // Functions

    $activeTab: function () {
        var me = this;
        return $(me.$root.find('#matchListTabs .ui-tabs-active'));
    },

    $tabFromTargetList: function ($targetList) {
        var me = this;
        var tabID = $targetList.attr('data-matchlist-id');
        var selector = '.matchlist[data-id-saved-match-list="' + tabID + '"]';
        var $targetTab = me.$root.find(selector);
        return $targetTab;
    },

    $activeList: function () {
        var me = this;
        var activeListSelector =
            '#matchListTab-' + me.$activeTab().attr('data-id-saved-match-list');
        return $(me.$root.find(activeListSelector));
    },

    isInitialDataLoaded: function ($targetList) {
        if ($targetList.attr('data-initial-data-loaded') == 'true') {
            return true;
        } else {
            return false;
        }
    },

    // Methods

    setNotesEditStateDirty: function (state, $container, $buttons, $textArea) {
        if (state) {
            $container.addClass('edit-mode');
            $textArea.addClass('dirty');
            $buttons.addClass('enabled');
        } else {
            $buttons.removeClass('enabled');
            $container.removeClass('edit-mode');
            $textArea.removeClass('dirty');
        }
    },

    askToIncludeAllBands: function (listId, negId) {
        var me = this;

        showDialog({
            type: 'question',
            title: 'Include Completed / Rejected?',
            msg: 'Would you like to include Completed / Rejected contacts?',
            buttons: {
                Yes: function () {
                    me.printSavedMatchList(listId, negId, true);

                    $(this).dialog('close');
                },
                No: function () {
                    me.printSavedMatchList(listId, negId, false);

                    $(this).dialog('close');
                    return false;
                }
            }
        });
    },

    printSavedMatchList: function (options) {
        var form = $(
            '<form method="POST" target="_blank" action="/PropertyMatchLists/Print" class="printSavedmatchList"/>>'
        );
        $.each(options, function (k, v) {
            form.append(
                $('<input type="hidden" name="' + k + '" value="' + v + '">')
            );
        });
        form.appendTo('body');
        form.submit();
        form.remove();
    },

    selectPrintOptions: function (matchlistId, negId) {
        var me = this;

        var title = 'Print Saved Match List Options..';

        // PRESENT MODAL PRINT OPTIONS PICKER!!
        new gmgps.cloud.ui.controls.window({
            title: title,
            windowId: 'matchlistPrintModal',
            controller: gmgps.cloud.ui.views.savedMatchListPrintOptions,
            url:
                '/PropertyMatchLists/PrintOptions?matchListID=' +
                matchlistId +
                '&propertyID=' +
                me.propertyId +
                '&negotiatorId=' +
                negId,
            post: true,
            complex: true,
            width: 910,
            height: 350,
            draggable: true,
            modal: true,
            actionButton: 'Print List',
            cancelButton: 'Cancel',
            onAction: function () {
                return true;
            },
            onCancel: function () {
                return false;
            },
            data: {
                CallBack: function (optionsObject) {
                    me.printSavedMatchList(optionsObject);
                }
            }
        });
    },

    getExistingMatchListContactIds: function (matchListId, negId) {
        var me = this;

        var propertyId = parseInt(
            me.$root
                .find('#matchlist-root')
                .closest('.layer')
                .attr('data-propertyid')
        );

        me.httpUtility.ajax(
            {
                args: {
                    matchlistId: matchListId
                },
                complex: false,
                dataType: 'json',
                type: 'post',
                url: '/PropertyMatchLists/GetContactIdsForSavedMatchList',
                background: false,
                cache: false
            },
            function (response) {
                if (response.Data.length > 0) {
                    me.selectNegotiatorsToReassignList(
                        propertyId,
                        response.Data,
                        matchListId,
                        negId
                    );
                } else {
                    me.warnNoContactsAvailable();
                }
            }
        );
    },

    selectNegotiatorsToReassignList: function (
        propertyId,
        ContactIds,
        matchlistId,
        negId
    ) {
        var me = this;

        var title =
            'Who would you like to re-assign the ' +
            ContactIds.length +
            ' contacts to?';

        var currentLists = me.getCurrentMatchListNegIds();

        // PRESENT MODAL NEGOTIATOR PICKER!!
        new gmgps.cloud.ui.controls.window({
            title: title,
            windowId: 'matchlistNegotiatorModal',
            controller: gmgps.cloud.ui.views.negotiatorPicker,
            url: '/PropertyMatchLists/GetAvailableNegotiators',
            post: true,
            complex: true,
            width: 600,
            height: 400,
            draggable: true,
            modal: true,
            actionButton: 'Reassign List',
            cancelButton: 'Cancel',
            onAction: function () {
                return true;
            },
            onCancel: function () {
                return false;
            },
            data: {
                ContactIds: ContactIds,
                PropertyId: propertyId,
                MatchListId: matchlistId,
                CurrentListOwner: negId,
                CurrentLists: currentLists,
                CallBack: function (
                    propertyId,
                    contactIds,
                    negotiatorIds,
                    matchlistId,
                    negId
                ) {
                    me.reassignSavedMatchList(
                        propertyId,
                        contactIds,
                        negotiatorIds,
                        matchlistId,
                        negId
                    );
                }
            }
        });
    },

    reassignSavedMatchList: function (
        propertyId,
        contactIds,
        negotiatorIds,
        matchlistId,
        oldNegId
    ) {
        var me = this;
        me.httpUtility.ajax(
            {
                args: {
                    matchlistId: matchlistId,
                    contactIds: contactIds,
                    negotiatorIds: negotiatorIds,
                    propertyId: propertyId,
                    oldNegId: oldNegId
                },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/PropertyMatchLists/Reassign',
                background: false,
                cache: false
            },
            function (response) {
                // Need to remove the old list from the UI, then..
                var tabSelector = 'li[data-neg-id="' + oldNegId + '"]';
                me.$tabs.find(tabSelector).remove();
                var panelSelector =
                    '.matchlist[data-neg-id="' + oldNegId + '"]';
                me.$root.find(panelSelector).remove();

                me.addNewMatchListsToUI(response);
                me.$root.find('div.listed-flag').show();
            }
        );
    },

    getCurrentMatchListNegIds: function () {
        var me = this;
        var currentTabsNegIds = [];
        me.$tabs.find('li').each(function () {
            var negId = parseInt($(this).attr('data-neg-id'));
            if (negId > 0) {
                currentTabsNegIds.push(negId);
            }
        });
        return currentTabsNegIds;
    },

    getNewMatchListContactIds: function () {
        var me = this;

        var propertyId = parseInt(
            me.$root
                .find('#matchlist-root')
                .closest('.layer')
                .attr('data-propertyid')
        );

        var $formData = me.$root
            .find('#matchlist-root')
            .find('.match-form')
            .clone();

        var $form = createForm($formData, '/PropertyMatchLists/Create', true);
        var formSerialized = $form.serialize();

        // Get the selected contact-ids[] from the PropertySearchProfile,
        // excluding those already in a SML for this property
        me.httpUtility.ajax(
            {
                args: formSerialized,
                complex: false,
                dataType: 'json',
                type: 'post',
                url: '/PropertyMatchLists/SearchForContacts',
                background: false,
                cache: false
            },
            function (response) {
                if (response.Data.length > 0) {
                    me.selectNegotiatorsForNewLists(propertyId, response.Data);
                } else {
                    me.warnNoContactsAvailable();
                }
            }
        );
    },

    selectNegotiatorsForNewLists: function (propertyId, ContactIds) {
        var me = this;

        var title =
            'Who would you like to assign the ' +
            ContactIds.length +
            ' contacts to?';
        var matchlistId = 0; // NEW LISTS

        var currentLists = me.getCurrentMatchListNegIds();

        // PRESENT MODAL NEGOTIATOR PICKER!!
        new gmgps.cloud.ui.controls.window({
            title: title,
            windowId: 'matchlistNegModal',
            controller: gmgps.cloud.ui.views.negotiatorPicker,
            url: '/PropertyMatchLists/GetAvailableNegotiators',
            post: true,
            complex: true,
            width: 600,
            height: 400,
            draggable: true,
            modal: true,
            actionButton: 'Create List',
            cancelButton: 'Cancel',
            onAction: function () {
                return true;
            },
            onCancel: function () {
                return false;
            },
            data: {
                ContactIds: ContactIds,
                PropertyId: propertyId,
                MatchListId: matchlistId,
                CurrentListOwner: 0,
                CurrentLists: currentLists,
                CallBack: function (
                    propertyId,
                    contactIds,
                    negotiatorIds,
                    matchlistId
                ) {
                    me.createNewSavedMatchList(
                        propertyId,
                        contactIds,
                        negotiatorIds,
                        matchlistId,
                        0
                    );
                }
            }
        });
    },

    createNewSavedMatchList: function (
        propertyId,
        contactIds,
        negotiatorIds
    ) {
        var me = this;

        me.httpUtility.ajax(
            {
                args: {
                    contactIds: contactIds,
                    negotiatorIds: negotiatorIds,
                    propertyId: propertyId
                },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/PropertyMatchLists/Create',
                background: false,
                cache: false
            },
            function (response) {
                me.$root.find('div.listed-flag').show();

                me.addNewMatchListsToUI(response);
            }
        );
    },

    addNewMatchListsToUI: function (response) {
        var me = this;

        me.$tabs.find('li:first').trigger('click');

        var $newTabs = $(response.Data.TabsHTML);
        var $newPanes = $(response.Data.PanelsHTML);

        // IMPORTANT !! Delete any Tabs, Panels that belong to Negotiators picked
        // because they will be re-loaded with extra contacts!

        // Maintain ordering
        var currentTabsNegIds = me.getCurrentMatchListNegIds();

        $newTabs.each(function () {
            var $tab = $(this);
            var newNegId = parseInt($tab.attr('data-neg-id'));

            if ($.inArray(newNegId, currentTabsNegIds) > -1) {
                var tabSelector = 'li[data-neg-id="' + newNegId + '"]';
                me.$tabs.find(tabSelector).remove();
                var panelSelector =
                    '.matchlist[data-neg-id="' + newNegId + '"]';
                me.$root.find(panelSelector).remove();
            }
        });

        // Add new tabs / panels to the DOM
        var lastTab = me.$tabs.find('ul').first();
        lastTab.append($newTabs);
        me.$root.find('#matches-tab').after($newPanes);

        me.$tabs.tabs('refresh');
        me.setupAccordions();
        me.minimiseNonActiveMatchListTabs();

        //$newPanes.each(function () {
        //    var $pane = $(this);
        //    var matchListId = parseInt($pane.attr('data-matchlist-id'));
        //    $pane.find('div.match-list-item').each(function (ix, el) {
        //        var contactId = $(el).attr('data-contact-id');
        //        me.$root.find('div.contact-match-list tr.row[data-id="{0}"] div.listed-flag'.format(contactId))
        //            .show()
        //            .attr('data-saved-in-matchlist', matchListId);
        //    });
        //});

        var $currentTabs = me.$root
            .find('#matchListTabs')
            .children('.matchlist');
        $currentTabs.each(function () {
            // We need to call this status update because the reassignment changes wouldnt have been commited in the controller block
            var matchListId = parseInt($(this).attr('data-matchlist-id'));
            if (matchListId > 0) {
                var currentListSelector = '#matchListTab-' + matchListId;
                var $targetList = $(me.$root.find(currentListSelector));
                me.DB_getListStatusAndUpdateUI($targetList, matchListId);
            }
        });
    },

    warnNoContactsAvailable: function () {
        showDialog({
            type: 'information',
            title: 'No Contacts Available',
            msg: 'All contacts matching the current search profile have been assigned to existing saved match lists.',
            buttons: {
                OK: function () {
                    $(this).dialog('close');
                    return false;
                }
            }
        });
    },

    flashRow: function ($row) {
        var backColor = $row.css('background-color');

        setTimeout(function () {
            $row.animate(
                { 'background-color': '#84C7FF' },
                250,
                'easeOutExpo'
            ).animate({ 'background-color': backColor }, 100);
            $row.animate(
                { 'background-color': '#84C7FF' },
                250,
                'easeOutExpo'
            ).animate({ 'background-color': backColor }, 100);
        }, 350);
    },

    setBandScrollLimits: function ($band) {
        var me = this;
        var targetBandAsInt = parseInt($band.attr('data-band-num'));

        $band.off('scroll content-changed');

        var previousScrollTop = 0;
        $band.on('scroll content-changed', function () {
            var scrollRegion = $(this);

            var currentScrollTop = scrollRegion.scrollTop();
            var scrollingDownwards = currentScrollTop > previousScrollTop;
            var notScrolling = currentScrollTop == 0;

            var allRowsLoaded =
                scrollRegion.attr('data-all-rows-loaded') == 'true';
            var roughHeightOfTwoRows = 120;
            var moreRowsNeeded =
                !allRowsLoaded &&
                scrollRegion.scrollTop() + scrollRegion.innerHeight() >=
                    scrollRegion[0].scrollHeight - roughHeightOfTwoRows;

            if (moreRowsNeeded && (notScrolling || scrollingDownwards)) {
                var rowsLoaded = scrollRegion.find('div.loaded').length;

                me.$root
                    .find(
                        'h3.band[data-band-id="{0}"] .band-title'.format(
                            targetBandAsInt
                        )
                    )
                    .addClass('loading');

                var $activeList = me.$activeList();
                var matchListId = parseInt(
                    $activeList.attr('data-matchlist-id')
                );
                var negotiatorId = parseInt($(document).find('#_userid').val());

                me.DB_loadRowsForBand(
                    $band,
                    rowsLoaded,
                    targetBandAsInt,
                    matchListId,
                    negotiatorId
                );
            }

            previousScrollTop = scrollRegion.scrollTop();
        });
    },

    recalculateScrollRange: function ($targetBand) {
        var me = this;

        var targetBandAsInt = parseInt($targetBand.attr('data-band-num'));
        var $lastItem = $targetBand.children('.loaded').last();

        // Had to delay the calculation to allow for accordians and rows to fully expand
        setTimeout(function () {
            if ($lastItem.length > 0) {
                var bandHeight = $targetBand.height();
                var lastRowBottom =
                    $lastItem.position().top + $lastItem.outerHeight(true);
                var maxScroll = lastRowBottom - bandHeight;

                maxScroll += $targetBand.scrollTop(); // Handle bands that are already partially scrolled through

                //console.log('set maxscroll for ' + targetBandAsInt + ' to ' + maxScroll);

                switch (targetBandAsInt) {
                    default:
                    case 0: {
                        me.activeBandMaxScroll = maxScroll;
                        break;
                    }
                    case 1: {
                        me.completedBandMaxScroll = maxScroll;
                        break;
                    }
                    case 2: {
                        me.rejectedBandMaxScroll = maxScroll;
                        break;
                    }
                }
            } else {
                switch (targetBandAsInt) {
                    default:
                    case 0: {
                        me.activeBandMaxScroll = 0;
                        break;
                    }
                    case 1: {
                        me.completedBandMaxScroll = 0;
                        break;
                    }
                    case 2: {
                        me.rejectedBandMaxScroll = 0;
                        break;
                    }
                }
            }

            me.setBandScrollLimits($targetBand);
        }, 200);
    },

    initScrollRanges: function () {
        var me = this;
        var $list = me.$activeList();

        $list.find('.scroll-region').each(function () {
            var $band = $(this);
            var bandHasRowsToLoad =
                $band.attr('data-all-rows-loaded') == 'true' ? false : true;

            if (bandHasRowsToLoad) {
                me.recalculateScrollRange($band);
            }
        });
    },

    askToSaveSavedMatchListNotes: function ($targetList) {
        var me = this;
        var $targetTab = me.$tabFromTargetList($targetList);
        var listId = $targetList.attr('data-matchlist-id');
        var propertyId = parseInt(me.propertyId);

        showDialog({
            type: 'question',
            title: 'Save Notes?',
            msg: 'Would you like to save any notes added against contacts"?',
            buttons: {
                Yes: function () {
                    me.DB_deleteSavedMatchList(
                        listId,
                        propertyId,
                        true,
                        $targetList,
                        $targetTab
                    );

                    $(this).dialog('close');
                    return false;
                },
                No: function () {
                    me.DB_deleteSavedMatchList(
                        listId,
                        propertyId,
                        false,
                        $targetList,
                        $targetTab
                    );

                    $(this).dialog('close');
                    return false;
                }
            }
        });
    },

    confirmDeleteMatchList: function ($targetList) {
        var me = this;
        var $targetTab = me.$tabFromTargetList($targetList);

        var negName = $targetTab.closest('li').attr('data-long-name');
        var listId = $targetList.attr('data-matchlist-id');

        showDialog({
            type: 'question',
            title: 'Confirm Saved Match List Deletion',
            msg: 'Delete Saved Match List for "' + negName + '"?',
            buttons: {
                Yes: function () {
                    me.$root
                        .find(
                            'div.listed-flag[data-saved-in-matchlist="{0}"]'.format(
                                listId
                            )
                        )
                        .hide();

                    me.askToSaveSavedMatchListNotes($targetList);

                    $(this).dialog('close');
                },
                No: function () {
                    $(this).dialog('close');
                    return false;
                }
            }
        });
    },

    removeTabAndListFromDOM: function ($targetList, $targetTab) {
        // switch to 1st general matching contacts tab
        $targetTab.closest('ul').find('li:first').trigger('click');
        // animate collapse of tab to be deleted
        $targetTab
            .closest('li')
            .animate(
                { width: '0px', opacity: '0' },
                500,
                'easeOutExpo',
                function () {
                    $targetList.remove();
                    $targetTab.closest('li').remove();
                }
            );
    },

    minimiseNonActiveMatchListTabs: function () {
        var me = this;

        // Refresh the tabs list
        me.$tabs = me.$root.find('#matchListTabs');

        me.$tabs.find('.expandable-tab').each(function () {
            var shortName = $(this).attr('data-short-name');
            var longName = $(this).attr('data-long-name');

            var isActive = $(this).hasClass('ui-tabs-active') ? true : false;

            if (isActive) {
                $(this).find('.list-owner').text(longName);
                $(this).find('.list-complete-label').removeClass('hidden');
            } else {
                $(this).find('.list-owner').text(shortName);
                $(this).find('.list-complete-label').addClass('hidden');
            }
        });
    },

    showRowBookmark: function ($targetList, $row, state) {
        var me = this;
        var $bookmark = $row.find('.bookmark');

        if (state === false) {
            if ($bookmark.hasClass('active')) {
                var listId = $row
                    .closest('.matchlist')
                    .attr('data-matchlist-id');
                var rowId = $row.attr('data-matchlistrow-id');
                $bookmark.css('display', 'none');
                $bookmark.removeClass('active');

                me.DB_setRowAsBookmarked(
                    $targetList,
                    me.propertyId,
                    listId,
                    rowId,
                    false
                );
            } else {
                $bookmark.css('display', 'none');
                $bookmark.removeClass('active');
            }
        } else {
            $bookmark.css('display', 'inline-block');
        }
    },

    disableMatchListNotesInput: function ($row, state) {
        var $notesArea = $row.find('#notes-textarea');
        if (state === true) {
            $notesArea.attr('disabled', 'disabled');
        } else {
            $notesArea.removeAttr('disabled');
        }
    },

    expandCollpaseAllRowsInBand: function ($targetBand, expanded) {
        var me = this;

        $targetBand.find('.match-list-item').each(function () {
            var item = $(this);
            var $panel = item.find('.expandable-area');

            if ($panel.css('display') == 'none' && expanded == true) {
                $panel.stop().slideDown('50', 'easeOutExpo', function () {
                    var $notesArea = item.find('.text-container');
                    me.setNotesAreaHeight($notesArea, $panel);
                });
                item.find('.expand-icon').addClass('up');
            }

            if ($panel.css('display') == 'block' && expanded == false) {
                $panel.stop().slideUp('50', 'easeOutExpo', function () {
                    var $notesArea = item.find('.text-container');
                    me.setNotesAreaHeight($notesArea, $panel);
                });
                item.find('.expand-icon').removeClass('up');
            }
        });

        // Delay re-calculation of scroll limits to allow bands to animate
        setTimeout(function () {
            me.setExpandButtonState(me.$activeList(), expanded);
            me.recalculateScrollRange($targetBand);
        }, 500);
    },

    getActiveBandExpandedState: function ($targetList) {
        var $activeBand = $targetList
            .find('.bandContent.band-expanded')
            .find('.scroll-region');
        var bandRowsExpanded =
            $activeBand.attr('data-all-rows-expanded') === 'true'
                ? true
                : false;

        return bandRowsExpanded;
    },

    getActiveBandEmptyState: function ($targetList) {
        var $activeBand = $targetList
            .find('.bandContent.band-expanded')
            .find('.scroll-region');
        var bandIsEmpty =
            $activeBand.find('.emptyband').length === 0 ? true : false;

        return bandIsEmpty;
    },

    setExpandButtonState: function ($targetList, state) {
        var btnLabel = state == true ? 'Collapse All' : 'Expand All';
        $targetList.find('.btn-expand-rows').find('span').text(btnLabel);
    },

    enableExpandButton: function ($targetList, state) {
        var $btn = $targetList.find('.btn-expand-rows');

        if (state === false) {
            $btn.addClass('disabled');
        } else {
            $btn.removeClass('disabled');
        }
    },

    setLocateBookmarkButtonState: function ($targetList, bookmarkedRowId) {
        var $btn = $targetList.find('.btn-locate');

        if (!bookmarkedRowId) {
            $btn.addClass('disabled');
            $btn.removeAttr('data-bookmarked-row');
        } else {
            $btn.removeClass('disabled');
            $btn.attr('data-bookmarked-row', bookmarkedRowId);
        }
    },

    setEmptyBandMessages: function ($targetList, active, completed, rejected) {
        if (active == 0) {
            var $noActiveItemsHtml =
                "<div class='emptyband'>There are no active items to display</div>";
            $targetList
                .find('.band-active')
                .empty()
                .prepend($noActiveItemsHtml);
            $targetList.find('.band-active').find('.emptyband').fadeIn(500);
        } else {
            $targetList.find('.band-active').find('.emptyband').remove();
        }

        if (completed == 0) {
            var $noCompletedItemsHtml =
                "<div class='emptyband'>There are no completed items to display</div>";
            $targetList
                .find('.band-completed')
                .empty()
                .prepend($noCompletedItemsHtml);
            $targetList.find('.band-completed').find('.emptyband').fadeIn(500);
        } else {
            $targetList.find('.band-completed').find('.emptyband').remove();
        }

        if (rejected == 0) {
            var $noRejectedItemsHtml =
                "<div class='emptyband'>There are no rejected items to display</div>";
            $targetList
                .find('.band-rejected')
                .empty()
                .prepend($noRejectedItemsHtml);
            $targetList.find('.band-rejected').find('.emptyband').fadeIn(500);
        } else {
            $targetList.find('.band-rejected').find('.emptyband').remove();
        }
    },

    updateBandCounts: function (
        $targetList,
        activeCount,
        completedCount,
        rejectedCount
    ) {
        var me = this;

        me.setBandCount($targetList, 0, activeCount);
        me.setBandCount($targetList, 1, completedCount);
        me.setBandCount($targetList, 2, rejectedCount);

        me.setEmptyBandMessages(
            $targetList,
            activeCount,
            completedCount,
            rejectedCount
        );
    },

    locateIndexForRowMove: function ($row, $targetband) {
        var rowsInBand = [];

        // Add inital row to array
        var inForename = $row.attr('data-forename');
        var inSurname = $row.attr('data-surname');
        var inIdrow = $row.attr('data-matchlistrow-id');
        rowsInBand.push([inIdrow, inSurname, inForename]);

        // Iterate through all rows currently in the target band
        $targetband.find('.loaded').each(function () {
            var forename = $(this).attr('data-forename');
            var surname = $(this).attr('data-surname');
            var idrow = $(this).attr('data-matchlistrow-id');
            rowsInBand.push([idrow, surname, forename]);
        });

        // Sort the array using surname, forename as order
        rowsInBand.sort(function (a, b) {
            if (a[1].toLowerCase() === b[1].toLowerCase()) {
                var x = a[2].toLowerCase();
                var y = b[2].toLowerCase();
                return x < y ? -1 : x > y ? 1 : 0;
            }
            return a[1] < b[1] ? -1 : a[1] > b[1] ? 1 : 0;
        });

        // Locate the sorted index of the row to be inserted
        var rowSortedIndex;
        for (var i = 0, len = rowsInBand.length; i < len; i++) {
            if (rowsInBand[i][0] === inIdrow) {
                rowSortedIndex = i;
                break;
            }
        }

        return rowSortedIndex;
    },

    moveRowToIndexedLocation: function ($row, $targetband) {
        var me = this;

        var index = me.locateIndexForRowMove($row, $targetband);
        if (index == 0) {
            // row needs to be appended as 1st row in target band
            $row.prependTo($targetband);
            $row.fadeIn(0);
        } else {
            // row needs to be appended after specific existing row
            var $targetRow = $targetband.find('.match-list-item').eq(index - 1);
            $targetRow.after($row);

            $row.fadeIn(0);
        }

        // me.recalculateScrollRange($targetband);
    },

    moveRowToBand: function ($row, $targetband, $targetList, notifiedUpdate) {
        var me = this;

        var rowExpanded =
            $row.find('.expandable-area').css('display') == 'none'
                ? false
                : true;

        var targetBandAsInt = parseInt($targetband.attr('data-band-num'));

        var bandCountSelector, tempCSS;
        switch (targetBandAsInt) {
            default:
            case 0:
                {
                    bandCountSelector = '.band-active-count';
                    tempCSS = 'temp-active';
                }
                break;
            case 1:
                {
                    bandCountSelector = '.band-completed-count';
                    tempCSS = 'temp-completed';
                }
                break;
            case 2:
                {
                    bandCountSelector = '.band-rejected-count';
                    tempCSS = 'temp-rejected';
                }
                break;
        }

        var $targetBandCounter = $targetband
            .closest('.matchlist')
            .find(bandCountSelector);
        me.flashBandCount($targetBandCounter);

        var listId = $row.closest('.matchlist').attr('data-matchlist-id');
        var rowId = $row.attr('data-matchlistrow-id');
        var contactId = $row.attr('data-contact-id');
        var propertyId = me.propertyId;

        var autoExpand = false;
        if (rowExpanded) {
            var firstRowID = $row
                .closest('.scroll-region')
                .find('.match-list-item')
                .first()
                .attr('data-matchlistrow-id');
            var rowIsFirst = rowId == firstRowID ? true : false;

            if (rowIsFirst) {
                autoExpand = true;
            }
        }

        var $currentBand = $row.closest('.scroll-region');

        if (targetBandAsInt != 0) {
            me.disableMatchListNotesInput($row, true);
        } else {
            me.disableMatchListNotesInput($row, false);
        }

        if (!rowExpanded) {
            // Just fadeout/slideup the row
            $row.addClass(tempCSS);
            $row.animate(
                { height: 'toggle', opacity: 'toggle' },
                500,
                'easeOutExpo',
                function () {
                    if (targetBandAsInt !== 0) {
                        me.showRowBookmark($targetList, $row, false);
                    } else {
                        me.showRowBookmark($targetList, $row, true);
                    }

                    $row.removeClass(tempCSS);

                    me.moveRowToIndexedLocation($row, $targetband);

                    if (!notifiedUpdate) {
                        me.DB_notifyDatabaseOfRowBandChange(
                            $targetList,
                            propertyId,
                            contactId,
                            listId,
                            rowId,
                            targetBandAsInt
                        );
                    }

                    if (autoExpand) {
                        $currentBand
                            .find('.match-list-item')
                            .first()
                            .find('.expand-icon')
                            .trigger('click');
                    }

                    var listIsEmpty = me.getActiveBandEmptyState($targetList);
                    me.enableExpandButton($targetList, listIsEmpty);
                }
            );
        } else {
            // Slideup the expandable region before dealing with the row
            $row.addClass(tempCSS);
            $row.find('.expand-icon').removeClass('up');
            $row.find('.expandable-area')
                .stop()
                .slideUp('200', 'easeOutExpo', function () {
                    $row.animate(
                        { height: 'toggle', opacity: 'toggle' },
                        300,
                        'linear',
                        function () {
                            if (targetBandAsInt !== 0) {
                                me.showRowBookmark($targetList, $row, false);
                            } else {
                                me.showRowBookmark($targetList, $row, true);
                            }

                            $row.removeClass(tempCSS);

                            me.moveRowToIndexedLocation($row, $targetband);

                            if (!notifiedUpdate) {
                                me.DB_notifyDatabaseOfRowBandChange(
                                    $targetList,
                                    propertyId,
                                    contactId,
                                    listId,
                                    rowId,
                                    targetBandAsInt
                                );
                            }

                            var $newTopBand = $currentBand
                                .find('.match-list-item')
                                .first();
                            var newTopBandAlreadyExpanded = $newTopBand
                                .find('.expand-icon')
                                .hasClass('up')
                                ? true
                                : false;

                            if (
                                autoExpand &&
                                newTopBandAlreadyExpanded == false
                            ) {
                                $newTopBand
                                    .find('.expand-icon')
                                    .trigger('click');
                            }

                            var listIsEmpty =
                                me.getActiveBandEmptyState($targetList);
                            me.enableExpandButton($targetList, listIsEmpty);
                        }
                    );
                });
        }
    },

    activate: function () {
        var me = this;
        me.dataRequest = null;
        me.statusRequests = {};

        me.activateTab(me.$tabs.tabs('option', 'active'));
        me.refreshOtherMatchAccordions();
    },

    deactivate: function () {
        var me = this;
        me.dataRequest = null;
        me.statusRequests = {};
    },

    setTabTitle: function ($targetList, percentage) {
        var me = this;

        var $targetTab = me.$tabFromTargetList($targetList);
        var negName = $targetTab.closest('li').attr('data-long-name');

        var newTitle = '<span class="list-owner">' + negName + '</span>';
        newTitle += '<span class="list-status"> / ' + percentage + '%</span>';
        newTitle += '<span class="list-complete-label"> processed</span>';

        $targetTab.html(newTitle);
    },

    setListTitles: function ($targetList, contactCount, subtitle) {
        var newTitle = 'Matching Contacts ' + contactCount;
        $targetList.find('.contact-count').text(newTitle);
        $targetList.find('.list-status').text(subtitle);
    },

    flashBandCount: function ($targetCounter) {
        $targetCounter.css('background-color', '#03B3FF');
        $targetCounter.stop().animate({ 'background-color': '#C3C3C3' }, 1000);
    },

    setBandCount: function ($targetList, band, count) {
        var bandSelector;

        switch (band) {
            default:
            case 0:
                bandSelector = '.band-active-count';
                break;
            case 1:
                bandSelector = '.band-completed-count';
                break;
            case 2:
                bandSelector = '.band-rejected-count';
                break;
        }

        $targetList.find(bandSelector).text(count);
    },

    enableCreateListButton: function (enableButton, title) {
        var createListButton = $('#btn-create-match-list');
        if (enableButton) {
            createListButton.removeClass('disabled');
        } else {
            createListButton.addClass('disabled');
        }

        if (!title) {
            createListButton.removeAttr('title');
        } else {
            createListButton.attr('title', title);
        }
    },

    activateTab: function (index) {
        var me = this;

        // We dont load data for tab index=0 because thats the main matches tab, not a list
        if (index != 0) {
            // get the Current Match List
            var $cml = me.$activeList();

            // Check to see if the CML has Data, load initial data where necessary
            if (me.isInitialDataLoaded($cml) == false) {
                me.DB_loadInitialData($cml);
            }

            me.enableCreateListButton(false);
        } else {
            me.$root.find('#match-groups .accordion').accordion('refresh');
            me.refreshSourceList();
            me.enableCreateListButton(true);
        }

        me.minimiseNonActiveMatchListTabs();
        me.refreshListAccordions();
        me.initScrollRanges();
    },

    sizeUI: function () {
        var me = this;
        me.refreshListAccordions();
        me.initScrollRanges();
        me.refreshActiveNotesAreaHeight();
    },

    refreshListAccordions: function () {
        var me = this;

        var $listAccordians = me.$root.find('.saved-match-list-accordian');

        if (
            $listAccordians.length > 0 &&
            $listAccordians.data('ui-accordion')
        ) {
            $listAccordians.accordion('refresh');
        }
    },

    refreshOtherMatchAccordions: function () {
        var me = this;
        me.$tabs.find('.accordion').accordion('refresh');
    },

    setupAccordions: function () {
        var me = this;

        me.$root.find('.saved-match-list-accordian').each(function () {
            var prevMatchListBand = $(this)
                .closest('.matchlist-container')
                .attr('data-last-active-band');

            if (prevMatchListBand == undefined) {
                prevMatchListBand = 0;
            } else {
                prevMatchListBand = parseInt(prevMatchListBand);
            }

            $(this).accordion({
                active: prevMatchListBand,
                autoHeight: false,
                collapsible: false,
                clearStyle: true,
                heightStyle: 'fill',
                animate: 200,
                easing: 'easeOutExpo'
            });

            $(this).on('accordionactivate', function (event, ui) {
                if (ui.oldPanel.length > 0 && ui.newPanel.length > 0) {
                    ui.oldPanel.removeClass('band-expanded');
                    ui.newPanel.addClass('band-expanded');
                    ui.newPanel
                        .find('.scroll-region')
                        .trigger('content-changed');
                }
            });
        });
    },

    markRowAsHavingNotes: function ($row, $targetList) {
        var me = this;
        $row.find('.btn-add-file-note').find('.ticked').addClass('active');

        var listId = $row.closest('.matchlist').attr('data-matchlist-id');
        var rowId = $row.attr('data-matchlistrow-id');
        var propertyId = me.propertyId;

        me.DB_setRowAsHavingNotes($targetList, propertyId, listId, rowId);
    },

    markRowAsHavingPhoneCallNotes: function ($row, $targetList) {
        var me = this;
        $row.find('.btn-add-call-note').find('.ticked').addClass('active');

        var listId = $row.closest('.matchlist').attr('data-matchlist-id');
        var rowId = $row.attr('data-matchlistrow-id');
        var propertyId = me.propertyId;

        me.DB_setRowAsHavingPhoneCallNotes(
            $targetList,
            propertyId,
            listId,
            rowId
        );
    },

    setNotesAreaHeight: function ($target, $expandableArea) {
        var amountToShrinkBy = 58;

        if (!$expandableArea) {
            $expandableArea = $target.closest('.expandable-area');
        }

        var outerBoxHeight = $expandableArea.height();
        var newHeight = parseInt(outerBoxHeight) - amountToShrinkBy + 'px';

        $target.css('height', newHeight);
    },

    refreshActiveNotesAreaHeight: function () {
        var me = this;

        me.$root.find('.expand-icon.up').each(function () {
            var $target = $(this)
                .closest('.match-list-item')
                .find('.text-container');
            me.setNotesAreaHeight($target);
        });
    },

    onUpdate: function (matchListId) {
        var me = this;

        if (matchListId && me.$tabs.tabs('option', 'active') > 0) {
            var $cml = me.$activeList();

            if ($cml.attr('data-matchlist-id') == matchListId) {
                me.DB_loadInitialData($cml);
                me.minimiseNonActiveMatchListTabs();
                me.refreshListAccordions();
                me.initScrollRanges();
            }
        } else if (matchListId) {
            var activeListSelector =
                '#matchListTab-' + matchListId + '.matchlist-container';
            me.$root
                .find(activeListSelector)
                .attr('data-initial-data-loaded', 'false');
        } else {
            me.$root
                .find('.matchlist.matchlist-container')
                .attr('data-initial-data-loaded', 'false');
        }
    },

    // Methods that talk to the DB / controllers

    DB_saveMatchListNotes: function (matchlistId, rowId, notes) {
        var me = this;

        me.httpUtility.ajax(
            {
                args: {
                    matchlistId: parseInt(matchlistId),
                    rowId: rowId,
                    notes: notes
                },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/PropertyMatchLists/SaveNotes',
                background: false
            },
            function () {}
        );
    },

    DB_loadRowsForBand: function (
        $targetBand,
        currentRowCount,
        bandNumber,
        matchListId,
        negotiatorId,
        synchronous
    ) {
        var me = this;

        if (me.dataRequest) {
            return;
        }

        var args = {
            matchlistId: matchListId,
            negotiatorId: negotiatorId,
            targetBand: bandNumber,
            currentLoadedRows: currentRowCount
        };

        var dataRequest = me.httpUtility
            .ajax(
                {
                    args: args,
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: '/PropertyMatchLists/GetRows',
                    background: currentRowCount > 0,
                    cache: false,
                    async: !synchronous
                },
                function (response) {
                    if (response.Data.ReturnedRowCount > 0) {
                        var $lastLoadedRow = $targetBand.find('.loaded').last();

                        $lastLoadedRow.after(response.Data.LoadedRowsHtml);

                        if (
                            $targetBand.attr('data-all-rows-expanded') == 'true'
                        ) {
                            me.expandCollpaseAllRowsInBand($targetBand, true);
                        }

                        $targetBand.find('.ml-profile-tabs').tabs();
                    } else {
                        $targetBand.attr('data-all-rows-loaded', 'true');
                    }

                    me.recalculateScrollRange($targetBand);
                    me.$root
                        .find(
                            'h3.band[data-band-id="{0}"] .band-title'.format(
                                bandNumber
                            )
                        )
                        .removeClass('loading');
                }
            )
            .done(function () {
                me.dataRequest = null;
            });

        if (!synchronous) {
            me.dataRequest = dataRequest;
        }
    },

    DB_getListStatusAndUpdateUI: function ($targetList, matchlistId) {
        var me = this;

        if (me.statusRequests[matchlistId]) {
            me.statusRequests[matchlistId].abort();
            delete me.statusRequests[matchlistId];
        }

        me.statusRequests[matchlistId] = me.httpUtility
            .ajax(
                {
                    args: {
                        matchlistId: parseInt(matchlistId)
                    },
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: '/PropertyMatchLists/GetStatus',
                    background: false,
                    cache: false
                },
                function (response) {
                    me.updateBandCounts(
                        $targetList,
                        response.Data.ActiveCount,
                        response.Data.CompletedCount,
                        response.Data.RejectedCount
                    );
                    me.setEmptyBandMessages(
                        $targetList,
                        response.Data.ActiveCount,
                        response.Data.CompletedCount,
                        response.Data.RejectedCount
                    );
                    me.setLocateBookmarkButtonState(
                        $targetList,
                        response.Data.ActiveBookmarkRow
                    );

                    var totalContacts = parseInt(
                        response.Data.ActiveCount +
                            response.Data.CompletedCount +
                            response.Data.RejectedCount
                    );
                    me.setListTitles(
                        $targetList,
                        totalContacts,
                        response.Data.Subtitle
                    );
                    me.setTabTitle(
                        $targetList,
                        response.Data.PercentageComplete
                    );

                    me.minimiseNonActiveMatchListTabs();
                }
            )
            .done(function () {
                delete me.statusRequests[matchlistId];
            });
    },

    DB_updateFieldForRow: function (
        $targetList,
        matchlistId,
        rowId,
        columnEnum,
        newValue
    ) {
        var me = this;

        me.httpUtility.ajax(
            {
                args: {
                    matchlistId: parseInt(matchlistId),
                    rowId: parseInt(rowId),
                    column: parseInt(columnEnum),
                    newValue: newValue
                },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/PropertyMatchLists/UpdateRow',
                background: false
            },
            function () {
                me.DB_getListStatusAndUpdateUI($targetList, matchlistId);
            }
        );
    },

    DB_loadInitialData: function ($targetList) {
        var me = this;
        var propertyID = $targetList.attr('data-idproperty');
        var matchListID = $targetList.attr('data-matchlist-id');
        var negotiatorID = $(document).find('#_userid').val();

        me.httpUtility.ajax(
            {
                args: {
                    propertyId: propertyID,
                    matchlistId: matchListID,
                    negotiatorID: negotiatorID
                },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/PropertyMatchLists/Get',
                background: false
            },
            function (response) {
                $targetList.attr('data-initial-data-loaded', true);
                $targetList
                    .find('.saved-match-list-accordian')
                    .html(response.Data.BandsHtml);

                // Init the search profile tabs
                $targetList.find('.ml-profile-tabs').tabs();

                // This may be hacky, but it was the only way to get the 1st band to fully expand on 1st draw
                // * Init the accordion with no band animation, then afterwards set the animation to 200ms
                $targetList
                    .find('.saved-match-list-accordian')
                    .accordion({
                        active: 0,
                        autoHeight: false,
                        collapsible: false,
                        clearStyle: true,
                        heightStyle: 'fill',
                        animate: 0,
                        easing: 'easeOutExpo',
                        activate: function (event, ui) {
                            // Get new accordion band index after switching bands
                            var activeAccordianBandIDX = $(this).accordion(
                                'option',
                                'active'
                            );

                            // Assign it to the attr of the parent match list container so we can use it next time
                            $(this)
                                .closest('.matchlist-container')
                                .attr(
                                    'data-last-active-band',
                                    activeAccordianBandIDX
                                );

                            $targetList = me.$activeList();

                            var bandRowsExpandedState =
                                me.getActiveBandExpandedState($targetList);
                            me.setExpandButtonState(
                                $targetList,
                                bandRowsExpandedState
                            );

                            var listIsEmpty =
                                me.getActiveBandEmptyState($targetList);
                            me.enableExpandButton($targetList, listIsEmpty);

                            var $deactivatedBand = me
                                .$activeList()
                                .find('.scroll-region.band-active');
                            me.recalculateScrollRange($deactivatedBand);

                            var $activatedBand = ui.newPanel.find(
                                '.scroll-region:not(.band-active)'
                            );
                            me.recalculateScrollRange($activatedBand);
                        }
                    })
                    .accordion('refresh')
                    .accordion('option', 'animate', 200);

                me.setLocateBookmarkButtonState(
                    $targetList,
                    response.Data.ActiveBookmarkRow
                );
                me.updateBandCounts(
                    $targetList,
                    response.Data.ActiveCount,
                    response.Data.CompletedCount,
                    response.Data.RejectedCount
                );

                var $activeBand = me.$activeList().find('.band-active');
                $activeBand
                    .find('.match-list-item')
                    .first()
                    .find('.expand-icon')
                    .trigger('click');

                me.initScrollRanges();
            }
        );
    },

    DB_deleteSavedMatchList: function (
        matchlistId,
        propertyId,
        saveNotes,
        $targetList,
        $targetTab
    ) {
        var me = this;

        var negotiatorID = $(document).find('#_userid').val();

        me.httpUtility.ajax(
            {
                args: {
                    matchlistId: parseInt(matchlistId),
                    createNotes: saveNotes,
                    negotiatorId: negotiatorID,
                    propertyId: propertyId
                },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/PropertyMatchLists/Delete',
                background: false
            },
            function () {
                me.removeTabAndListFromDOM($targetList, $targetTab);

                me.onListDeleted();
            }
        );
    },

    DB_setRowAsHavingNotes: function (
        $targetList,
        propertyId,
        matchlistId,
        rowId
    ) {
        var me = this;
        me.DB_updateFieldForRow(
            $targetList,
            matchlistId,
            rowId,
            me.DatabaseListCols.Notes,
            1
        );
    },

    DB_setRowAsHavingPhoneCallNotes: function (
        $targetList,
        propertyId,
        matchlistId,
        rowId
    ) {
        var me = this;
        me.DB_updateFieldForRow(
            $targetList,
            matchlistId,
            rowId,
            me.DatabaseListCols.PhoneCallNotes,
            1
        );
    },

    DB_setRowAsHavingAppointment: function (
        $targetList,
        propertyId,
        matchlistId,
        rowId
    ) {
        var me = this;
        me.DB_updateFieldForRow(
            $targetList,
            matchlistId,
            rowId,
            me.DatabaseListCols.Appointment,
            1
        );
    },

    DB_setRowAsHavingEmail: function (
        $targetList,
        propertyId,
        matchlistId,
        rowId
    ) {
        var me = this;
        me.DB_updateFieldForRow(
            $targetList,
            matchlistId,
            rowId,
            me.DatabaseListCols.Email,
            1
        );
    },

    DB_notifyDatabaseOfRowBandChange: function (
        $targetList,
        propertyId,
        contactId,
        matchlistId,
        rowId,
        newBand
    ) {
        var me = this;

        me.httpUtility.ajax(
            {
                args: {
                    matchlistId: matchlistId,
                    rowId: rowId,
                    targetBand: newBand,
                    propertyId: propertyId,
                    contactId: contactId
                },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/PropertyMatchLists/UpdateRowBand',
                background: false
            },
            function () {
                me.DB_getListStatusAndUpdateUI($targetList, matchlistId);
            }
        );
    },

    DB_setRowAsBookmarked: function (
        $targetList,
        propertyId,
        matchlistId,
        rowId,
        state
    ) {
        var me = this;
        var newState = state ? 1 : 0;
        me.DB_updateFieldForRow(
            $targetList,
            matchlistId,
            rowId,
            me.DatabaseListCols.BookMarked,
            newState
        );
    },

    DB_setRowAsHavingSMS: function (
        $targetList,
        propertyId,
        matchlistId,
        rowId
    ) {
        var me = this;
        me.DB_updateFieldForRow(
            $targetList,
            matchlistId,
            rowId,
            me.DatabaseListCols.SMS,
            1
        );
    }
};
