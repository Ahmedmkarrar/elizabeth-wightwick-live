gmgps.cloud.ui.views.sharedNote = function (args) {
    var me = this;

    me.cfg = args;
    me.$root = args.$root;
    me.$window = null;
    me.viewMode = null;

    me.init(args);

    return this;
};

gmgps.cloud.ui.views.sharedNote.typeName = 'gmgps.cloud.ui.views.sharedNote';

gmgps.cloud.ui.views.sharedNote.prototype = {
    init: function () {
        var me = this;

        me.$window = me.$root.closest('.window');
        var viewMode = parseInt(me.$root.find('#Mode').val());

        //View mode considerations.
        if (viewMode === C.ViewMode.EditUnlockable) {
            me.$window
                .find('.bottom .buttons')
                .prepend(
                    '<div class="btn unlock-button bgg-grey" style="min-width: 100px; float: left;">Unlock for Editing</div>'
                );

            me.$window.find('.bottom .buttons .action-button').hide();
        }

        //Unlock button > Click
        me.$window.on('click', '.unlock-button', function () {
            if ($(this).hasClass('on')) {
                me.$root.find('.opt-editable').hide();
                me.$root.find('.opt-locked').show();
                me.$window.find('.bottom .buttons .action-button').hide();
                $(this).text('Unlock for Editing').removeClass('on');
            } else {
                me.$root.find('.opt-editable').show();
                me.$root.find('.opt-locked').hide();
                me.$window.find('.bottom .buttons .action-button').show();
                $(this).text('Cancel Editing').addClass('on');
                me.$root.find('#HistoryEvent_Notes').focus();
            }
        });

        //CallContact > Click
        me.$window.on('click', '.tapi-call', function () {
            var contactId = $(this).attr('data-contact');
            var telephoneNumber = $(this).attr('data-number');
            me.callContact(contactId, telephoneNumber);
        });

        //set up ac
        var createNewRow;
        var createHiddenElementsForNewParty;
        var setupApplicantAC = function ($e) {
            $e.autoCompleteEx({
                modelType: C.ModelType.Contact,
                search: {
                    CategoryIdList: [C.ContactCategory.Client],
                    ApplyFurtherFilteringtoIds: true
                },
                allowCreate: false,
                includeContacts: true,
                includeUsers: false,
                placeholder: 'Search for Contacts...',
                closeAfterSelect: false,
                onSelected: function (args) {
                    //check for already in list to prevent dupes
                    var exists = false;
                    $('.partiesTable tr').each(function () {
                        var id = $(this).attr('data-id');
                        var type = $(this).attr('data-modelTypeId');
                        if (args.id == id && args.modelType == type) {
                            showInfo(
                                'That contact already exists in the list so will not be added'
                            );
                            exists = true;
                        }
                    });

                    if (!exists) {
                        var newRow = createNewRow(
                            args.id,
                            args.modelType,
                            'Contact',
                            args.udf6,
                            args.udf4,
                            args.udf5
                        );
                        $('.partiesTable tbody').append(newRow);

                        var newHiddens = createHiddenElementsForNewParty(
                            args.id,
                            args.modelType,
                            'Contact'
                        );
                        $('.hidden-parties').append(newHiddens);
                    }

                    //$('#contactPartySearchAutoComplete').attr('data-value', 'test');
                    //$('#contactPartySearchAutoComplete').attr('data-id', '0');
                },
                onRemoved: function () {}
            });
        };

        var setupPropertyAC = function ($e) {
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
                        C.RentStatus.Appraisal,
                        C.RentStatus.Let,
                        C.RentStatus.ExternallyLet,
                        C.RentStatus.LetAgreed
                    ],
                    ApplyFurtherFilteringtoIds: true
                },
                placeholder: 'Search for Property...',
                onSelected: function (args) {
                    $('#addProperty').hide();
                    var newRow = createNewRow(
                        args.id,
                        args.modelType,
                        'Property',
                        args.udf5,
                        args.udf6,
                        ''
                    );
                    $('.partiesTable tbody').append(newRow);

                    var newHiddens = createHiddenElementsForNewParty(
                        args.id,
                        args.modelType,
                        'Property'
                    );
                    $('.hidden-parties').append(newHiddens);
                },
                onRemoved: function () {}
            });
        };

        setupApplicantAC(me.$root.find('.contact-ac'));
        setupPropertyAC(me.$root.find('.property-ac'));
        createNewRow = function (
            partyId,
            partyType,
            type,
            title,
            subtitle1,
            subtitle2
        ) {
            var clone = $('#hiddenTemplates').find('.partyRow').clone();
            clone.attr('data-id', partyId);
            clone.attr('data-modelTypeId', partyType);
            clone.find('.type').html(type);
            clone.find('.title').html(title);
            clone.find('.subtitle1').html(subtitle1);
            clone.find('.subtitle2').html(subtitle2);
            return clone;
        };
        createHiddenElementsForNewParty = function (partyId, partyType, type) {
            var clone = $('#hiddenTemplates .hidden-party-template').clone();
            clone.removeClass('hidden-party-template');
            clone.addClass('hidden-party');
            clone.attr('data-linkedId', partyId);
            clone.attr('data-modelTypeId', partyType);
            clone.children('#party_LinkedId').val(partyId);
            clone.children('#party_LinkedType').val(type);
            clone.children('#party_RoleType').val(type);
            return clone;
        };
    },

    action: function (onComplete) {
        var me = this;

        me.preventDoubleSubmit = true;

        me.$root.find('.form').validationEngine({ scroll: false });
        if (!me.$root.find('.form').validationEngine('validate')) {
            return false;
        }

        UpdateTickBoxOnToTrue('#UpdateLastContactedDate', me.$root);

        //Create a server-ready form.

        var notes = me.$root.find('#HistoryEvent_Notes');
        notes.val(encodeURIComponent(notes.val()));
        var $form = createForm(me.$root, 'Event/UpdateNote');

        //Remove unwanted parties from the form (create mode only).
        var viewMode = parseInt(me.$root.find('#Mode').val());
        if (viewMode === C.ViewMode.Create) {
            me.removeUnwantedParties($form);

            //Ensure that at least one party is selected.
            var count = $form.find(
                '.note-form input[type=checkbox]:checked'
            ).length;
            if (count === 0) {
                showInfo(
                    'You must select at least one record to apply the note to.'
                );
                return false;
            }
        }

        //Create html required for successful de-serialization into objects for on the server.
        reindexHtmlArray($form, '.hidden-party', 'HistoryEvent.Parties', true);

        //Save the note.
        new gmgps.cloud.http("sharednote-action").postForm($form, function () {
            if (onComplete) onComplete();
        });
    },

    removeUnwantedParties: function ($form) {
        //Remove any parties from the form data which have been marked not to be associated with this note.
        $form
            .find('.party-inclusion-tickbox:checkbox:not(:checked)')
            .each(function (i, v) {
                //Get the linkedId and modelTypeId from the visible party row.
                var $row = $(v).closest('tr');
                var id = parseInt($row.attr('data-id'));
                var modelTypeId = parseInt($row.attr('data-modelTypeId'));

                //Remove the hidden party of the same linkedId and modelTypeId.
                $form
                    .find(
                        '.hidden-party[data-linkedId="{0}"][data-modelTypeId="{1}"]'.format(
                            id,
                            modelTypeId
                        )
                    )
                    .remove();
            });
    },

    callContact: function (contactId, telephoneNumber) {
        var called = {
            contactId: contactId,
            telephoneNumber: telephoneNumber
        };

        new gmgps.cloud.http("sharednote-callContact").ajax(
            {
                args: called,
                complex: true,
                dataType: 'text',
                type: 'post',
                url: '/api/1/tapi/sendcallcontext'
            },
            function () {}
        );
    },

    cancel: function (onComplete) {
        var me = this;
        me.$root.find('form').validationEngine('hideAll');
        onComplete();
    },

    destroy: function () {
        var me = this;
        me.$root.empty().unbind();
    }
};
