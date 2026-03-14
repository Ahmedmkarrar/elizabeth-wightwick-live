gmgps.cloud.ui.views.chainLink = function (args) {
    var me = this;
    me.cfg = args;
    me.$root = args.$root;

    me.plumb = null;
    me.direction = parseInt(me.$root.find('#Direction').val());
    me.viewMode = null; //todo

    me.$op = null;
    me.$opi = null;
    me.$po = null;
    me.$poi = null;

    me.init(args);

    return this;
};

gmgps.cloud.ui.views.chainLink.prototype = {
    init: function () {
        var me = this;

        me.isUnknownProperty =
            me.$root.find('#ChainLink_IsUnknownProperty').val() === 'True';

        //Get window handle.
        me.$window = me.$root.closest('.window');

        //Dropdowns
        me.$root.find('select').customSelect();

        //ControlGroups
        me.$root.find('.ui-controlgroup').controlGroup({
            onChange: function ($item) {
                var $party = $item.closest('.chainlink-party');
                var $panel = $party.find(
                    '.controlgroup-panel[data-id="' +
                        $item.attr('data-id') +
                        '"]'
                );
                $party
                    .find('.controlgroup-panel')
                    .not($panel)
                    .fadeOut(250, function () {
                        $panel.fadeIn(250);
                    });
            }
        });

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

        //Plumb setup
        me.plumb = jsPlumb.getInstance();
        me.plumb.Defaults.Container = me.$root;
        me.plumb.importDefaults({
            Connector: ['Bezier', { curviness: 50 }],
            DragOptions: { cursor: 'pointer', zIndex: 2000 },
            PaintStyle: { strokeStyle: '#d72728', lineWidth: 4 },
            EndpointStyle: {
                radius: 1,
                strokeStyle: '#4d4d4d',
                fillStyle: '#4d4d4d'
            },
            HoverPaintStyle: { strokeStyle: '#e73738' },
            EndpointHoverStyle: { fillStyle: '#ec9f2e' },
            Anchors: ['TopCenter', 'BottomCenter']
        });

        //UnknownProperty_Name > KeyUp
        me.$root.on('keyup', '#ChainLink_UnknownProperty_Name', function () {
            me.$root.find('#unknownproperty-label').text($(this).val());
        });

        //UnknownProperty.AgentContactId > Change
        me.$root.on(
            'change',
            '#ChainLink_UnknownProperty_AgentContactId',
            function () {
                var id = parseInt($(this).val());
                if (id == 0) {
                    me.$root
                        .find('#ChainLink_UnknownProperty_UnknownAgentName')
                        .val('')
                        .prop('disabled', false);
                    me.$root
                        .find('#ChainLink_UnknownProperty_UnknownAgentPhone')
                        .val('')
                        .prop('disabled', false);
                } else {
                    me.$root
                        .find('#ChainLink_UnknownProperty_UnknownAgentName')
                        .val('')
                        .prop('disabled', true);
                    me.$root
                        .find('#ChainLink_UnknownProperty_UnknownAgentPhone')
                        .val('')
                        .prop('disabled', true);
                }
            }
        );

        var isUnknownProperty = me.isUnknownProperty;
        var isKnownPropertyGoingUp =
            !me.isUnknownProperty && me.direction == C.Direction.Up;
        var isKnownPropertyGoingDown =
            !me.isUnknownProperty && me.direction == C.Direction.Down;

        var setupApplicantAC;

        //Adding a known property? -- if not going up, needs to show a different dialog with searching and selection etc...
        if (isKnownPropertyGoingUp) {
            me.$op = me.$root.find('#owner-property-list');
            me.$opi = me.$root.find('#owner-property-list .inner');
            me.$po = me.$root.find('#property-owner-list');
            me.$poi = me.$root.find('#property-owner-list .inner');

            var showSaveButton = function (show) {
                if (show) {
                    me.$window
                        .find('.action-button')
                        .removeClass('grey disabled')
                        .addClass('bgg-red');
                } else {
                    me.$window
                        .find('.action-button')
                        .removeClass('bgg-red')
                        .addClass('grey disabled');
                }
            };

            //Owner-Property Checkbox > Change
            me.$op.on('change', 'input:checkbox', function () {
                var count = me.$op.find('input:checked').length;
                showSaveButton(count != 0);

                //Untick all other selected items.
                me.$op
                    .find('input:checked')
                    .not($(this))
                    .prop('checked', false)
                    .trigger('prog-change');
            });

            //Func to setup the applicant auto-completes.
            setupApplicantAC = function ($e) {
                $e.autoCompleteEx({
                    modelType: C.ModelType.Contact,
                    search: {
                        CategoryIdList: [C.ContactCategory.Client],
                        ApplyFurtherFilteringtoIds: true
                    },
                    includeContacts: true,
                    includeUsers: false,
                    placeholder: 'Search for Contact (purchaser)...',
                    onSelected: function (args) {
                        me.$opi.empty();
                        me.$op.hide();
                        me.$poi.empty();
                        me.$root
                            .find('#search-by-property .cancel')
                            .trigger('click');

                        //Fetch property owner list.
                        new gmgps.cloud.http("chainLink-onSelected").getView({
                            url: 'Progression/GetProgressionOwnerPropertyList',
                            post: true,
                            args: {
                                id: args.id
                            },
                            onSuccess: function (response) {
                                me.$op.show();
                                me.$opi.html(response.Data);

                                var count = me.$op.find('input:checked').length;
                                showSaveButton(count != 0);
                            }
                        });
                    },
                    onRemoved: function () {
                        me.$op.hide();
                        me.$opi.empty();
                        showSaveButton(false);
                    }
                });
            };

            //Func to setup the applicant auto-completes.
            var setupPropertyAC = function ($e) {
                $e.autoCompleteEx({
                    modelType: C.ModelType.Property,
                    search: {
                        //                    StatusIdList: [
                        //                        C.SaleStatus.Available, C.SaleStatus.UnderOffer, C.SaleStatus.UnderOfferMarketing,
                        //                        C.RentStatus.Available, C.RentStatus.UnderOffer, C.RentStatus.LetMarketing
                        //                    ],
                        ApplyFurtherFilteringtoIds: true
                    },
                    placeholder: 'Search for Property...',
                    onSelected: function (args) {
                        me.$root.find('#ChainLink_PropertyId').val(args.id);
                        me.$poi.empty();
                        me.$po.hide();
                        me.$opi.empty();
                        me.$root
                            .find('#search-by-owner .cancel')
                            .trigger('click');

                        var sourceId = me.$root
                            .find('#SourceChainLinkId')
                            .val();
                        if (
                            (!sourceId || sourceId == 0) &&
                            me.$root.find('#ChainLink_Id').val()
                        ) {
                            // if source chaink link isn't present, get it from the current chainlink popup
                            sourceId = me.$root.find('#ChainLink_Id').val();
                        }

                        //Fetch owner property list.
                        new gmgps.cloud.http("chainLink-onSelected").getView({
                            url: 'Progression/GetProgressionPropertyOwnerList',
                            post: true,
                            args: {
                                sourceChainLinkId: sourceId,
                                propertyId: args.id,
                                direction: me.direction
                            },
                            onSuccess: function (response) {
                                me.$po.show();
                                me.$poi.html(response.Data);
                                showSaveButton(true);
                            }
                        });
                    },
                    onRemoved: function () {
                        me.$po.hide();
                        me.$poi.empty();
                        showSaveButton(false);
                    }
                });
            };

            //Setup the auto-complete boxes.
            setupApplicantAC(me.$root.find('.contact-ac'));
            setupPropertyAC(me.$root.find('.property-ac'));

            //Hide the save button initially, add a disabled "next" button and shift the cancel button to the end.
            var $buttons = me.$window.find('.bottom .buttons');
            $buttons.find('.action-button').addClass('disabled');

            $buttons.on('click', '.action-button:not(.disabled)', function () {
                me.prepForKnownToUnknownConnection();
            });
        }

        if (isKnownPropertyGoingDown) {
            // remove duplicate chainlink property
            me.$root.find('#ChainLink_PropertyId').remove();

            setupApplicantAC = function ($e) {
                $e.autoCompleteEx({
                    modelType: C.ModelType.Contact,
                    search: {
                        CategoryIdList: [C.ContactCategory.Client],
                        ApplyFurtherFilteringtoIds: true
                    },
                    includeContacts: true,
                    includeUsers: false,
                    placeholder: 'Search for Contact...',
                    onSelected: function (args) {
                        $e.closest('.chainlink-party')
                            .find('#party_ContactId')
                            .val(args.id);
                    },
                    onRemoved: function () {
                        $e.closest('.chainlink-party')
                            .find('#party_ContactId')
                            .val(0);
                    }
                });
            };

            setupApplicantAC(me.$root.find('.contact-ac'));
        }

        if (isUnknownProperty) {
            //Unknown Property
            //Func to setup the party auto-completes.
            var setupPartyAC = function ($e) {
                $e.autoCompleteEx({
                    modelType: C.ModelType.Contact,
                    search: {
                        CategoryIdList: [C.ContactCategory.Client],
                        ApplyFurtherFilteringtoIds: true
                    },
                    includeContacts: true,
                    includeUsers: false,
                    placeholder: 'Search for Contact...',
                    onSelected: function (args) {
                        $e.closest('.chainlink-party')
                            .find('#Party_ContactId')
                            .val(args.id);
                    },
                    onRemoved: function () {
                        $e.closest('.chainlink-party')
                            .find('#Party_ContactId')
                            .val(0);
                    }
                });
            };

            //Initial setup of solicitor fields.
            me.$root
                .find('#Party_UnknownContact_SolicitorContactId')
                .each(function (i, v) {
                    var $party = $(v).closest('.chainlink-party');
                    var id = parseInt($(v).val());
                    if (id != 0) {
                        $party
                            .find('#Party_UnknownContact_UnknownSolicitorName')
                            .prop('disabled', true);
                        $party
                            .find('#Party_UnknownContact_UnknownSolicitorPhone')
                            .prop('disabled', true);
                    }
                });

            //Setup the party ac's in a loop (must be a loop so that the id elements don't get overridden by eachother).
            me.$root.find('.party-ac').each(function (i, v) {
                setupPartyAC($(v));
            });
        }

        me.initSolicitorSearch();
    },

    initHandlers: function () {},

    prepForKnownToUnknownConnection: function () {
        var me = this;

        var propertyId = parseInt(
            me.$root.find('.property-ac').attr('data-id')
        );
        var contactId = parseInt(me.$root.find('.contact-ac').attr('data-id'));

        //Found by property?
        if (propertyId != 0) {
            //Get the purchasers and create hidden parties for them by cloning the default, existing party
            //added for the source node.
            me.$root
                .find('#property-owner-list input:checked')
                .each(function (i, v) {
                    var $party = me.$root.find('.party:first').clone();
                    var $v = $(v);

                    //Remove unknownContact fields, not req'd.
                    $party.find('.unknown-contact').remove();

                    $party
                        .find('#party_ContactBranchId')
                        .val(parseInt($v.attr('data-branchId')));
                    $party
                        .find('#party_ContactId')
                        .val(parseInt($v.attr('data-id')));
                    $party
                        .find('#party_PartyType')
                        .val(
                            me.direction == C.Direction.Up
                                ? C.ChainLinkPartyType.Seller
                                : C.ChainLinkPartyType.Buyer
                        );
                    $party.find('#party_VersionNumber').val(0);
                    me.$root.find('.parties').append($party);
                });

            //Set the property id (from the ac input).
            me.$root.find('#ChainLink_PropertyId').val(propertyId);
        }

        //Found by owner?
        if (contactId != 0) {
            //Get the purchaser and create a hidden party for them by cloning the default, existing party
            //added for the source node.
            var contactBranchId = parseInt(
                me.$root.find('.contact-ac').attr('data-branchId')
            );
            var $party = me.$root.find('.party:first').clone();

            //Remove unknownContact fields, not req'd.
            $party.find('.unknown-contact').remove();

            $party.find('#party_ContactBranchId').val(contactBranchId);
            $party.find('#party_ContactId').val(contactId);
            $party
                .find('#party_PartyType')
                .val(
                    me.direction == C.Direction.Up
                        ? C.ChainLinkPartyType.Seller
                        : C.ChainLinkPartyType.Buyer
                );
            $party.find('#party_VersionNumber').val(0);
            me.$root.find('.parties').append($party);

            //Set the property id (from the OP list - there will only be one selected property).
            propertyId = parseInt(
                me.$root
                    .find('#property-owner-list input:checked')
                    .attr('data-id')
            );
            if (!isNaN(propertyId))
                me.$root.find('#ChainLink_PropertyId').val(propertyId);
        }
    },

    initSolicitorSearch: function () {
        var me = this;

        me.$root.find('.contact-ac-sol').autoCompleteEx({
            modelType: C.ModelType.Contact,
            search: {
                CategoryIdList: [C.ContactCategory.Solicitor],
                ApplyFurtherFilteringtoIds: true,
                FullQuery: true
            },
            allowCreate: false,
            includeContacts: true,
            includeUsers: false,
            placeholder: 'Other/Unknown Solicitor',
            newContactCategory: C.ContactCategory.Solicitor,
            onSelected: function (args) {
                var $party = args.$e.closest('.chainlink-party');
                $party
                    .find('#Party_UnknownContact_UnknownSolicitorName')
                    .val('')
                    .prop('disabled', true);
                $party
                    .find('#Party_UnknownContact_UnknownSolicitorPhone')
                    .val('')
                    .prop('disabled', true);
                args.$e
                    .closest('.col-2')
                    .find('.searchSelectedSolicitor')
                    .val(args.id);
            },
            onRemoved: function (id, args) {
                var $party = args.closest('.chainlink-party');
                $party
                    .find('#Party_UnknownContact_UnknownSolicitorName')
                    .val('')
                    .prop('disabled', false);
                $party
                    .find('#Party_UnknownContact_UnknownSolicitorPhone')
                    .val('')
                    .prop('disabled', false);
                args.closest('.col-2').find('.searchSelectedSolicitor').val(0);
            }
        });
    }
};
