gmgps.cloud.ui.views.propertyDetails = function (args) {
    var me = this;
    me.def = 'ui.views.propertyDetails';

    me.cfg = args;
    me.$root = args.$root;
    me.id = args.id;

    //Events
    me.onChanged = new gmgps.cloud.common.event();
    me.onTabColumnItemLabelChangeRequest = new gmgps.cloud.common.event();
    me.onSubTabClicked = new gmgps.cloud.common.event();
    me.onTimelineBoxToggleClicked = new gmgps.cloud.common.event();

    me.tabColumn = new gmgps.cloud.ui.controls.NavigableTabColumn({
        $root: me.$root.find('.tab-column'),
        entityType: 'property',
        collection: 'properties',
        id: me.id
    });

    me.viewChanged = false;
    me.lastCopyTime = null; // Track when copy operations occur
    me.views = {};
    me.layers = new alto.ui.LayersCollection(me.id, 'Property/GetPropertyLayer', 'property');

    me.http =
        args.http || new gmgps.cloud.http("propertydetails-propertyDetails");

    me.toggleNotesBehaviour =
        new gmgps.cloud.ui.behaviours.ToggleViewingNotesBehaviour();

    //Set some member variables based upon dom values.
    me.isDirty = me.$root.find('#IsDirty').val() == 'True';
    me.isMADirty = me.$root.find('#IsMADirty').val() == 'True';

    me.userId = parseInt($('#_userid').val());

    me.init(args, false);

    me.total = 0;
    me.totals = '';

    if (!me.cfg.inStepThrough) {
        var title = me.$root.find('#_description').val();
        alto.application.setTitle('Properties | ' + title);
    }

    return this;
};

gmgps.cloud.ui.views.propertyDetails.prototype = {

    setupToolbar: function () {
        var me = this;

        var $tb = $('#toolbar .group[data-group="property"] .detail');

        var recordType = parseInt(me.$root.find('#RecordTypeId_').val());
        var saleStatus = parseInt(me.$root.find('#SaleStatus_').val());
        var rentStatus = parseInt(me.$root.find('#RentStatus_').val());

        if (me.$root.find('#Property_Archived').val() == 'True') {
            saleStatus = C.SaleStatus.Archived;
            rentStatus = C.RentStatus.Archived;
        }

        var $b = null;
        var items = null;

        var recordTypeByName = recordType == C.PropertyRecordType.Sale ? "sales" : "lettings";
        $tb.find('li[data-id="create-offer"]').attr('data-pendo', 'property_action_create_offer-' + recordTypeByName);

        $('#toolbar .group[data-group="property"] .list').hide();

        //Actions
        $b = $tb.find('div[data-id="action"]');
        $b.show().find('.item').hide();
        if (recordType == C.PropertyRecordType.Sale) {
            switch (saleStatus) {
                case C.SaleStatus.Appraisal:
                    items = [
                        C.SaleStatus.Instructed,
                        C.SaleStatus.NotInstructed,
                        C.EventSubType.DetailsToVendor,
                        C.EventSubType.DetailsApproved,
                        C.EventSubType.TermsSent
                    ];
                    $tb.find('li[data-id="create-ma"]').show();
                    $tb.find('li[data-id="draft-details-to-vendor"]').show();
                    $tb.find('li[data-id="planup-import"]').show();
                    break;

                case C.SaleStatus.Instructed:
                    items = [
                        C.EventSubType.AccountPayment,
                        C.EventSubType.Disbursement,
                        C.EventSubType.BoardChange,
                        C.EventSubType.TermsSent,
                        C.EventSubType.TermsSigned,
                        C.EventSubType.DetailsToVendor,
                        C.EventSubType.LogEPCOrder,
                        C.EventSubType.DetailsApproved
                    ];
                    $tb.find('li[data-id="set-status-sale"]').show();
                    $tb.find(
                        'li[data-id="draft-details-to-vendor"],li[data-id="create-viewing"]'
                    ).show();
                    $tb.find('li[data-id="planup-import"]').show();
                    break;

                case C.SaleStatus.NotInstructed:
                    items = [C.SaleStatus.Instructed];
                    $tb.find('li[data-id="set-status-sale"]').show();
                    break;

                case C.SaleStatus.New: //Same as available for now.
                    $tb.find('li[data-id="set-status-sale"]').show();
                    break;

                case C.SaleStatus.Available:
                    items = [
                        C.EventSubType.AccountPayment,
                        C.EventSubType.Disbursement,
                        C.EventSubType.BoardChange,
                        C.EventSubType.TermsSent,
                        C.EventSubType.TermsSigned,
                        C.EventSubType.DetailsToVendor,
                        C.EventSubType.LogEPCOrder,
                        C.EventSubType.DetailsApproved
                    ];
                    $tb.find('li[data-id="set-status-sale"]').show();
                    $tb.find(
                        'li[data-id="create-viewing"], li[data-id="create-offer"], li[data-id="draft-details-to-vendor"]'
                    ).show();
                    $tb.find('li[data-id="planup-import"]').show();
                    break;

                case C.SaleStatus.Reserved:
                    items = [
                        C.EventSubType.AccountPayment,
                        C.EventSubType.Disbursement,
                        C.EventSubType.BoardChange
                    ];
                    $tb.find('li[data-id="set-status-sale"]').show();
                    break;

                case C.SaleStatus.ExternallySold:
                    items = [
                        C.EventSubType.AccountPayment,
                        C.EventSubType.Disbursement,
                        C.EventSubType.BoardChange
                    ];
                    $tb.find('li[data-id="set-status-sale"]').show();
                    break;

                case C.SaleStatus.Suspended:
                    items = [
                        C.EventSubType.AccountPayment,
                        C.EventSubType.Disbursement,
                        C.EventSubType.BoardChange
                    ];
                    $tb.find('li[data-id="set-status-sale"]').show();
                    break;

                case C.SaleStatus.Withdrawn:
                    items = [
                        C.EventSubType.AccountPayment,
                        C.EventSubType.Disbursement,
                        C.EventSubType.BoardChange
                    ];
                    $tb.find('li[data-id="set-status-sale"]').show();
                    break;

                case C.SaleStatus.UnderOffer:
                    items = [
                        C.EventSubType.AccountPayment,
                        C.EventSubType.Disbursement,
                        C.EventSubType.BoardChange
                    ];
                    $tb.find('li[data-id="set-status-sale"]').show();
                    $tb.find(
                        'li[data-id="create-viewing"], li[data-id="create-offer"], li[data-id="sale-progression"]'
                    ).show();
                    $tb.find('li[data-id="planup-import"]').show();
                    break;

                case C.SaleStatus.UnderOfferMarketing:
                    items = [
                        C.EventSubType.AccountPayment,
                        C.EventSubType.Disbursement,
                        C.EventSubType.BoardChange
                    ];
                    $tb.find('li[data-id="set-status-sale"]').show();
                    $tb.find(
                        'li[data-id="create-viewing"], li[data-id="create-offer"], li[data-id="sale-progression"]'
                    ).show();
                    $tb.find('li[data-id="planup-import"]').show();
                    break;

                case C.SaleStatus.UnderOfferAvailable:
                    items = [
                        C.EventSubType.AccountPayment,
                        C.EventSubType.Disbursement,
                        C.EventSubType.BoardChange
                    ];
                    $tb.find('li[data-id="set-status-sale"]').show();
                    $tb.find(
                        'li[data-id="create-viewing"], li[data-id="create-offer"], li[data-id="sale-progression"]'
                    ).show();
                    $tb.find('li[data-id="planup-import"]').show();
                    break;

                case C.SaleStatus.Exchanged:
                    items = [
                        C.EventSubType.AccountPayment,
                        C.EventSubType.Disbursement,
                        C.EventSubType.BoardChange
                    ];
                    $tb.find('li[data-id="set-status-sale"]').show();
                    $tb.find('li[data-id="sale-progression"]').show();
                    break;

                case C.SaleStatus.Completed:
                    items = [
                        C.EventSubType.AccountPayment,
                        C.EventSubType.Disbursement,
                        C.EventSubType.BoardChange
                    ];
                    $tb.find('li[data-id="set-status-sale"]').show();
                    $tb.find('li[data-id="sale-progression"]').show();
                    break;

                case C.SaleStatus.Archived:
                    if (
                        parseInt(me.$root.find('#SaleStatus_').val()) ==
                        C.SaleStatus.Withdrawn
                    )
                        $tb.find(
                            'li[data-id="' +
                            C.SaleStatus.Withdrawn +
                            '"][data-data="' +
                            C.PropertyRecordType.Sale +
                            '"]:contains("Unarchive...")'
                        ).show();
                    break;

                default:
                    alert('SYS: Unknown SaleStatus - ' + saleStatus);
                    break;
            }

            //advert run
            if (
                saleStatus != C.SaleStatus.Archived &&
                saleStatus != C.SaleStatus.Withdrawn
            )
                $tb.find('div[data-id="advert-run"]').show();

            //Display available sale actions.
            if (items) {
                $.each(items, function (i, v) {
                    $b.find(
                        '.item[data-id="' +
                        v +
                        '"][data-data="' +
                        C.PropertyRecordType.Sale +
                        '"]'
                    ).show();
                });
            }
        }

        //Rent Statuses
        if (recordType == C.PropertyRecordType.Rent) {
            switch (rentStatus) {
                case C.RentStatus.Appraisal:
                    items = [
                        C.RentStatus.Instructed,
                        C.RentStatus.NotInstructed,
                        C.EventSubType.DetailsApproved,
                        C.EventSubType.TermsSent
                    ];
                    $tb.find('li[data-id="create-ma"]').show();
                    $tb.find('li[data-id="planup-import"]').show();
                    $tb.find('li[data-id="draft-details-to-landlord"]').show();
                    break;
                case C.RentStatus.Instructed:
                    items = [
                        C.EventSubType.AccountPayment,
                        C.EventSubType.Disbursement,
                        C.EventSubType.BoardChange,
                        C.EventSubType.TermsSent,
                        C.EventSubType.TermsSigned,
                        C.EventSubType.DetailsToVendor,
                        C.EventSubType.LogEPCOrder,
                        C.EventSubType.DetailsApproved
                    ];
                    $tb.find('li[data-id="set-status-rent"]').show();
                    $tb.find('li[data-id="draft-details-to-landlord"]').show();
                    $tb.find('li[data-id="planup-import"]').show();
                    break;
                case C.RentStatus.NotInstructed:
                    $tb.find('li[data-id="set-status-rent"]').show();
                    break;
                case C.RentStatus.New:
                    $tb.find('li[data-id="set-status-rent"]').show();
                    $tb.find('li[data-id="let-agreed"]').show();
                    break;
                case C.RentStatus.Available:
                    items = [
                        C.EventSubType.AccountPayment,
                        C.EventSubType.Disbursement,
                        C.EventSubType.BoardChange,
                        C.EventSubType.TermsSent,
                        C.EventSubType.TermsSigned,
                        C.EventSubType.DetailsToVendor,
                        C.EventSubType.LogEPCOrder,
                        C.EventSubType.DetailsApproved
                    ];
                    $tb.find('li[data-id="set-status-rent"]').show();
                    $tb.find(
                        'li[data-id="create-viewing"], li[data-id="create-offer"], li[data-id="draft-details-to-landlord"]'
                    ).show();
                    $tb.find('li[data-id="planup-import"]').show();
                    $tb.find('li[data-id="let-agreed"]').show();
                    break;
                case C.RentStatus.Suspended:
                    items = [
                        C.EventSubType.AccountPayment,
                        C.EventSubType.Disbursement,
                        C.EventSubType.BoardChange
                    ];
                    $tb.find('li[data-id="set-status-rent"]').show();
                    break;
                case C.RentStatus.Withdrawn:
                    items = [
                        C.EventSubType.AccountPayment,
                        C.EventSubType.Disbursement,
                        C.EventSubType.BoardChange
                    ];
                    $tb.find('li[data-id="set-status-rent"]').show();
                    break;
                case C.RentStatus.UnderOffer:
                    items = [
                        C.EventSubType.AccountPayment,
                        C.EventSubType.Disbursement,
                        C.EventSubType.BoardChange
                    ];
                    $tb.find('li[data-id="set-status-rent"]').show();
                    $tb.find(
                        'li[data-id="create-viewing"], li[data-id="create-offer"], li[data-id="rent-progression"]'
                    ).show();
                    $tb.find('li[data-id="planup-import"]').show();
                    break;
                case C.RentStatus.Let:
                case C.RentStatus.LetAgreed:
                    items = [C.EventSubType.BoardChange];
                    $tb.find('li[data-id="set-status-rent"]').show();
                    $tb.find('li[data-id="rent-progression"]').show();
                    break;
                case C.RentStatus.LetMarketing:
                    items = [
                        C.EventSubType.AccountPayment,
                        C.EventSubType.Disbursement,
                        C.EventSubType.BoardChange
                    ];
                    $tb.find('li[data-id="set-status-rent"]').show();
                    $tb.find(
                        'li[data-id="create-viewing"], li[data-id="create-offer"], li[data-id="rent-progression"]'
                    ).show();
                    break;
                case C.RentStatus.Completed:
                    items = [
                        C.EventSubType.AccountPayment,
                        C.EventSubType.Disbursement,
                        C.EventSubType.BoardChange
                    ];
                    $tb.find('li[data-id="set-status-rent"]').show();
                    $tb.find('li[data-id="rent-progression"]').show();
                    break;
                case C.RentStatus.LetNoticeServed:
                    $tb.find('li[data-id="set-status-rent"]').show();
                    $tb.find('li[data-id="rent-progression"]').show();
                    break;
                case C.RentStatus.Archived:
                    $tb.find(
                        'li[data-id="' +
                        C.RentStatus.Withdrawn +
                        '"][data-data="' +
                        C.PropertyRecordType.Rent +
                        '"]'
                    ).show();
                    break;
                case C.RentStatus.ExternallyLet:
                    items = [
                        C.EventSubType.BoardChange,
                        C.RentStatus.Available
                    ];
                    $tb.find('li[data-id="set-status-rent"]').show();
                    break;
                default:
                    alert('SYS: Unknown RentStatus - ' + saleStatus);
                    break;
            }

            //advert run
            if (
                rentStatus != C.RentStatus.Archived &&
                rentStatus != C.RentStatus.Withdrawn
            )
                $tb.find('div[data-id="advert-run"]').show();

            //Display available rental actions.
            if (items) {
                $.each(items, function (i, v) {
                    $b.find(
                        '.item[data-id="' +
                        v +
                        '"][data-data="' +
                        C.PropertyRecordType.Rent +
                        '"]'
                    ).show();
                });
            }
            $tb.find('li[data-id="pm-add-workorder"]').show();
        }

        if (shell.pmInstalled && recordType == C.PropertyRecordType.Rent) {
            $tb.find('li[data-id="pm-charge"]').show();
        }

        //PhoneCall & FileNote logging.
        $tb.find(
            'li[data-id="log-phonecall"], li[data-id="log-filenote"]'
        ).show();

        //Documents
        $tb.find('div[data-id="documents"]').show();

        //Send
        $tb.find('div[data-id="photo-slideshow"]').show();

        //Sticky
        $tb.find(
            'div[data-id="add-note"], div[data-id="show-hide-notes"]'
        ).show();

        //General Appointment
        $tb.find('li[data-id="new-appointment"]').show();

        //Clone (always available)
        $tb.find('li[data-id="clone-property"]').show();

        //Transfer (only if testmode)
        $tb.find('li[data-id="transfer-property"]').show();

        //Hide the archive action if the property is already archived (the sale or rent status could be different).
        if (me.$root.find('#Property_Archived').val() == 'True') {
            $b.find(
                '.item[data-id="' +
                C.SaleStatus.Archived +
                '"][data-data="' +
                C.PropertyRecordType.Sale +
                '"]'
            ).hide();
            $b.find(
                '.item[data-id="' +
                C.RentStatus.Archived +
                '"][data-data="' +
                C.PropertyRecordType.Rent +
                '"]'
            ).hide();
        }

        me.showPrintTimelineButton($tb);

        // strip out permission enabled menu items
        if (shell.pmInstalled) {
            shell.uiPermissions.menuItemPermissions($tb);
        }

        $tb.attr('data-loaded', true);
        $tb.show();

        me.showPortalPublishingButton($tb, saleStatus, rentStatus);
    },

    setupToolbarForEvents: function () {
        var me = this;

        var $tb = $('#toolbar .group[data-group="property"] .detail');

        if (me.$root.find('#HasDetailsApprovedEvent').val() == 'True')
            $tb.find(
                'li[data-id="{0}"]'.format(C.EventSubType.DetailsApproved)
            ).hide();
        if (me.$root.find('#HasTermsSignedEvent').val() == 'True')
            $tb.find(
                'li[data-id="{0}"]'.format(C.EventSubType.TermsSigned)
            ).hide();
        if (
            me.$root.find('#HasTermsSentEvent').val() == 'True' ||
            me.$root.find('#HasTermsSignedEvent').val() == 'True'
        )
            $tb.find(
                'li[data-id="{0}"]'.format(C.EventSubType.TermsSent)
            ).hide();
        if (me.$root.find('#HasLogEPCOrderEvent').val() == 'True')
            $tb.find(
                'li[data-id="{0}"]'.format(C.EventSubType.LogEPCOrder)
            ).hide();
    },

    showPrintTimelineButton: function (toolbar) {
        var printTimelineButton = toolbar.find('div[data-id="print-options"]');

        if (printTimelineButton.length > 0) {
            printTimelineButton.show();
        }
    },

    showPortalPublishingButton: function (toolbar, saleStatus, rentStatus) {
        var $button = toolbar.find('#publish-listing-launcher');

        if ($button.length === 0) {
            return;
        }

        var id = this.id;

        $button.hide();

        var showSales = saleStatus != 0 && saleStatus != C.SaleStatus.Appraisal && saleStatus != C.SaleStatus.Instructed && saleStatus != C.SaleStatus.Archived;
        var showRental = rentStatus != 0 && rentStatus != C.RentStatus.Appraisal && rentStatus != C.RentStatus.Instructed && rentStatus != C.RentStatus.Archived;

        if (showSales || showRental) {
            new gmgps.cloud.http("propertypublishing-button").ajax(
                {
                    args: { propertyId: id },
                    complex: true,
                    dataType: 'json',
                    type: 'get',
                    url: '/PropertyListing/GetIsPropertyPublished',
                },
                function (response) {
                    var $anchor = $button.find('a');

                    var href = $anchor.attr('data-href-template');

                    if (response.Data == true) {
                        $anchor.attr('href', href.replace('{id}/{page}', id + '/publish'));
                    } else {
                        $anchor.attr('href', href.replace('{id}/{page}', id + '/review'));
                    }

                    $button.show();
                }
            );
        }
    },
    init: function (args, reinit) {
        var me = this;
        me.reinit = reinit;

        me.$root.off();
        me.setupToolbar();
        me.setupToolbarForEvents();
        me.configureStickyNotes();

        // Track keydown events to detect copy/select operations (not cut)
        me.$root.on('keydown:not([readonly])', function (e) {
            if (e.ctrlKey || e.metaKey) {
                // Only track copy (C) and select all (A) operations, not cut (X)
                if (e.keyCode === 67 || e.keyCode === 65) { // C, A
                    me.lastCopyTime = Date.now();
                }
            }
        });
        
        me.$root.on('click:not([readonly])', function () {
            if (me.lastCopyTime && (Date.now() - me.lastCopyTime) < 100) {
                return; // Ignore clicks after copy/select operations
            }
            if (me.viewChanged === false) me.viewChanged = true;
        });
        
        me.$root.on('keyup:not([readonly])', function (e) {
            // Only ignore copy (C) and select all (A) shortcuts, allow cut (X) to trigger save
            if ((e.ctrlKey || e.metaKey) && (e.keyCode === 67 || e.keyCode === 65)) {
                return; // Ignore only C and A shortcuts
            }
            if (me.viewChanged === false) me.viewChanged = true;
        });

        //Dirty triggers (include all events capable of changing the record).
        me.$root.on(
            'change',
            'select:not(.opt-noDirtyTrigger, [readonly])',
            function (e) {
                me.setDirty(true, e);
            }
        );
        me.$root.on(
            'keyup',
            'input:not(:checkbox, .opt-noDirtyTrigger, [readonly])',
            function (e) {
                if (!gmgps.cloud.helpers.general.isDeadKey(e)) {
                    me.setDirty(true, e);
                }
            }
        );
        me.$root.on(
            'change',
            'input:not(.opt-noDirtyTrigger, [readonly])',
            function (e) {
                me.setDirty(true, e);
            }
        );
        me.$root.on(
            'paste',
            'textarea:not(.opt-noDirtyTrigger),input:not(.opt-noDirtyTrigger)',
            function (e) {
                me.setDirty(true, e);
            }
        );
        me.$root.on(
            'keyup',
            'textarea:not(.opt-noDirtyTrigger):not([readonly])',
            function (e) {
                if (!gmgps.cloud.helpers.general.isDeadKey(e)) {
                    me.setDirty(true, e);
                }
            }
        );

        me.$root
            .find('.layer[data-id="propertyinfo"]')
            .on('change', '.toggle', function (e) {
                me.setDirty(true, e);
            });

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
                onComplete: function () { }
            });
        });

        function geocodeLookup(e) {
            if (!gmgps.cloud.helpers.general.isDeadKey(e)) {
                gmgps.cloud.helpers.general.geolocationFromAddress(
                    me.$root,
                    function (results, status) {
                        if (status === 'OK' && results.length > 0) {
                            //me.initialMapViewChanged = false;
                            //me.initialPovChanged = false;
                            //me.initialPositionChanged = false;

                            me.writeMapValues({
                                mapPos: {
                                    lat: results[0].geometry.location.lat(),
                                    lng: results[0].geometry.location.lng()
                                },
                                svPos: {
                                    lat: results[0].geometry.location.lat(),
                                    lng: results[0].geometry.location.lng(),
                                    pov: {
                                        heading: 0,
                                        pitch: 10,
                                        zoom: 1
                                    }
                                }
                            });
                        }
                    }
                );
            }
        }

        var debounced = $.debounce(1000, false, geocodeLookup);

        me.$root.on(
            'keyup',
            '.layer[data-id="propertyinfo"] .property-address, .layer[data-id="marketappraisal"] .property-address',
            debounced
        );

        //Letter selection/generation from timeline item (click on negotiator)
        me.$root.on('click', '.timeline-list .neg-col', function () {
            var $row = $(this).closest('tr');

            gmgps.cloud.helpers.general.promptForLetters({
                eventHeaders: [
                    {
                        Id: parseInt($row.attr('data-id')),
                        Category: parseInt($row.attr('data-eventcategoryid')),
                        NoOutput: false
                    }
                ]
            });
        });

        //MA Dirty Triggers
        me.$root.on(
            'change keyup',
            '.layer[data-id="marketappraisal"]',
            function () {
                me.setMADirty(true);
            }
        );

        //TabColumn --> Click
        me.tabColumn.onTabClicked.handle(function ($item) {

            var id = $item.attr('data-id');
            var arg = $item.attr('data-arg');
            var filter = parseInt($item.attr('data-filter'));

            //Show the detail layer if it's available.
            if (!$item.hasClass('disabled')) {

                me.showDetailLayer({
                    id: id,
                    subTab: arg,
                    subId: filter
                });

                //Remove arg and filter attributes from the tab-column tab.
                $item.removeAttr('data-arg').removeAttr('data-filter');
            }

            me.$root.find('#Property_BoardRequired').on('change', function () {
                if (me.$root.find('#Property_BoardRequired')[0].checked) {
                    me.$root.find('.propertyCurrentBoard').show();

                    me.$root.find('.change-board-button').hide();
                } else {
                    me.$root.find('.propertyCurrentBoard').hide();
                }
            });
        });

        //Owner contact tips.
        me.$root.on(
            'mouseover',
            '.phone-link, .email-link, .price-status-link, .icon-furnished-overview',
            function (e) {
                e.stopPropagation();

                $(this).qtip({
                    content: $.trim($(this).children('.item-list').html()),
                    position: {
                        my: 'top middle',
                        at: 'bottom middle'
                    },
                    show: {
                        solo: true,
                        ready: true,
                        delay: 200,
                        effect: true
                    },
                    hide: {
                        delay: 0,
                        effect: false
                    },
                    style: {
                        tip: true,
                        classes: 'qtip-dark'
                    },
                    events: {
                        hidden: function () {
                            $(this).qtip('destroy');
                        }
                    }
                });
            }
        );

        //Overview Events;
        me.$root.on('click', '.timeline-header .cancel-button', function () {
            me.$root.find('.timeline-header .note').fadeOut();
        });

        me.$root.on('click', '.propertyinfo-link', function () {
            if (!me.isAtAppraisalStage()) {
                me.tabColumn.selectTab('propertyinfo', 'property');
            }
        });

        me.$root.on('click', '.contained-copy-button', function (event) {
            event.stopPropagation();

            const getPropertyAddress = () => {
                var propertyAddressLine1 = document.getElementById(
                    'propertyAddressLine1'
                ).textContent;
                var propertyAddressLine2 = document.getElementById(
                    'propertyAddressLine2'
                ).textContent;
                return `${propertyAddressLine1} ${propertyAddressLine2}`;
            };

            const copyToClipboard = (textToCopy) => {
                const temporalElementToCopy =
                    document.createElement('textarea');
                temporalElementToCopy.value = textToCopy;
                document.body.appendChild(temporalElementToCopy);
                temporalElementToCopy.select();
                document.execCommand('copy');
                document.body.removeChild(temporalElementToCopy);
            };

            copyToClipboard(getPropertyAddress());
            document.getElementById('copy-button-text-property').innerText =
                'Copied';
            setTimeout(() => {
                document.getElementById('copy-button-text-property').innerText =
                    'Copy';
            }, 500);
        });

        me.$root.on('click', '.price-status-link', function () {
            if (!me.isAtAppraisalStage()) {
                me.tabColumn.selectTab('propertyinfo', 'marketing');
            }
        });

        me.$root.on('click', '.hazzard-status-link', function () {
            me.tabColumn.selectTab('propertyinfo', 'property');
        });

        me.$root.on('click', '.management-link', function () {
            me.tabColumn.selectTab('propertyinfo', 'agency');
        });

        me.$root.on('click', '.owner-link', function () {
            gmgps.cloud.helpers.contact.editContact({
                id: $(this).attr('data-id')
            });
        });

        //Timeline Link > Click (offers, viewings, marketing)
        me.$root.on('click', '.timeline-link', function () {
            var eventFilterType = parseInt($(this).attr('data-id'));
            me.tabColumn.selectTab('timeline', null, eventFilterType);
        });

        //Matches Link > Click
        me.$root.on('click', '.matches-link', function () {
            me.tabColumn.selectTab('matches');
        });

        me.$root.on('click', '.price-link', function () {
            if (!me.isAtAppraisalStage()) {
                me.tabColumn.selectTab('timeline', null);
            }
        });

        me.$root.on('click', '.letter-link', function (e) {
            e.stopPropagation();

            gmgps.cloud.helpers.property.viewLetter({
                historyEventId: parseInt($(this).attr('data-id'))
            });
        });

        me.$root.on(
            'click',
            '.summary .email-link[data-action="create"]',
            function (e) {
                var category = $(e.target).attr('ga-category');
                var ownerContactIds = [];
                var ownerCarbonCopyContactIds = [];
                me.$root.find('.owner-contact-details .email-link').each(function (i, v) {
                    var $owner = $(v);
                    if ($owner.attr('data-contact-protocol') == 'Direct') {
                        ownerContactIds.push($owner.attr('data-id'));
                    } else if ($owner.attr('data-contact-protocol') == 'CC') {
                        ownerCarbonCopyContactIds.push($owner.attr('data-id'));
                    }
                });

                gmgps.cloud.helpers.general.createEmail({
                    propertyId: me.id,
                    ContentType: C.DocumentContentType.Html,
                    contactIds: ownerContactIds,
                    carbonCopyContactIds: ownerCarbonCopyContactIds,
                    category: category
                });
            }
        );

        me.$root.on('click', '.phonenote-link', function (e) {
            e.stopPropagation();

            var contactId = $(this).closest('tr').data('id');
            var propertyId = me.id;

            var settings = {
                propertyId: propertyId,
                originatingEventId: 0,
                originatingEventCategory: 0,
                allowPartiesToBeAdded: false,
                contactId: contactId,
                eventSubType: C.EventSubType.PhoneCall,
                noteSource: C.NoteSourceType.Contact
            };

            new gmgps.cloud.ui.controls.window({
                title: 'Add Notes from Telephone Conversation',
                windowId: 'propertyNotesTelConvModal',
                controller: gmgps.cloud.ui.views.sharedNote,
                url: '/Event/CreateNote',
                urlArgs: settings,
                post: true,
                complex: true,
                width: 600,
                draggable: true,
                modal: true,
                actionButton: 'Save',
                cancelButton: 'Cancel',
                onCancel: function () {
                    return false;
                }
            });
        });

        me.$root.on('click', '.filenote-link', function (e) {
            e.stopPropagation();

            var id = $(this).closest('tr').data('id');
            var propertyId = me.id;

            gmgps.cloud.helpers.general.createNote({
                title: 'Add File Note',
                settings: {
                    propertyId: propertyId,
                    originatingEventId: 0,
                    originatingEventCategory: 0,
                    allowPartiesToBeAdded: false,
                    contactId: id,
                    eventSubType: C.EventSubType.FileNote,
                    noteSource: C.NoteSourceType.Contact
                },
                onComplete: function () { }
            });
        });

        me.$root.on('click', '.reject-match, .unreject-match', function (e) {
            e.stopPropagation();

            var contactId = $(this).closest('tr').data('id');
            var propertyId = me.id;

            var rejected = true;
            if ($(this).hasClass('unreject-match')) {
                rejected = false;
            }

            new gmgps.cloud.http("propertydetails-init").ajax(
                {
                    args: {
                        contactId: contactId,
                        propertyId: propertyId,
                        rejected: rejected
                    },
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: '/Property/SetContactRejection',
                    background: false
                },
                function (response) {
                    if (response.Data == true) {
                        me.queueMatchCountUpdate({
                            search: {
                                SearchPage: {
                                    Index: 1,
                                    Size: me.$root
                                        .find(
                                            '.match-form #MatchProfileViewModel_SearchPage_Size'
                                        )
                                        .val()
                                }
                            }
                        });
                        me.savedMatchListManager.onUpdate();
                    }
                }
            );
        });

        me.$root.on('click', '#deposit-calculator.fa-calculator', function () {
            var rent = gmgps.cloud.accounting.RentalCalculator.parseRent(
                me.getRent()
            );
            var rentPerWeek = me.getRentPerWeekDecimal();
            var rentPerMonth = me.getRentPerMonthDecimal();

            new gmgps.cloud.ui.controls.window({
                title: 'Deposit Calculator',
                windowId: 'depositCalculatorModal',
                controller: gmgps.cloud.ui.views.depositCalculator,
                url: 'Tenancy/DepositCalculator',
                urlArgs: {
                    rent: rent,
                    rentPerWeek: rentPerWeek,
                    rentPerMonth: rentPerMonth,
                    rentalFrequency: me.$root
                        .find('#Property_PropertyRental_RentalFrequency')
                        .val(),
                    currencySymbol: me.$root.find('#CurrencySymbol').val()
                },
                post: true,
                width: 300,
                draggable: true,
                modal: true,
                cancelButton: 'Close',
                actionButton: 'Update',
                callback: function (calculatedDeposit) {
                    if (calculatedDeposit) {
                        var currencySymbol = me.$root
                            .find('#CurrencySymbol')
                            .val();
                        me.$root
                            .find('#Property_PropertyRental_DepositRequired')
                            .val(
                                currencySymbol + Math.floor(calculatedDeposit)
                            );
                        me.initDepositChecks();
                        me.setDirty(true);
                    }
                },
                onAction:
                    me.onComplete ||
                    function () {
                        return true;
                    },
                onCancel:
                    me.onComplete ||
                    function () {
                        return false;
                    }
            });
        });

        me.$root.on('click', '#fee-quoted-calculator.fa-calculator', function () {

            var proposedAmount = me.$root.find('#MarketAppraisalViewModel_Valuation_ProposedAmount').val();
            var commission = me.$root.find('#MarketAppraisalViewModel_Valuation_Commission').val();
            var currencySymbol = me.$root.find('#CurrencySymbol').val();

            new gmgps.cloud.ui.controls.window({
                title: 'Fee Quoted Calculator',
                windowId: 'feeQuotedCalculatorModal',
                url: 'Property/FeeQuotedCalculator',
                urlArgs: {
                    proposedPrice: parseFloat(proposedAmount.replace(/[^\d.]/g, '')),
                    commission: parseFloat(commission.replace(/[^\d.]/g, '')),
                    currencySymbol: currencySymbol
                },
                post: true,
                width: 300,
                draggable: true,
                modal: true,
                cancelButton: 'Close',
                actionButton: 'Update',
                onAction:
                    me.onComplete ||
                    function () {
                        me.$root
                            .find('#MarketAppraisalViewModel_Valuation_FeeQuoted')
                            .val(
                                $('#fee-quoted-calculator-value').text()
                            );
                        me.setDirty(true);
                        me.setMADirty(true);
                        return true;
                    },
                onCancel:
                    me.onComplete ||
                    function () {
                        return false;
                    }
            });
        });

        me.$root.on(
            'click',
            '.timeline-list tr td.status-col.signatory-status',
            function () {
                var id = $(this).attr('data-event-id');
                var dialog = new gmgps.cloud.ui.controls.SignatoryDialog({
                    id: id
                });
                dialog.open();
            }
        );

        me.initLayers(reinit);

        me.$offset = me.$root.offset();

        var recordType = parseInt(me.$root.find('#RecordTypeId_').val());

        if (recordType == C.PropertyRecordType.Sale) {
            me.$root.on('keyup', '.sales-fees input', function () {
                var agreedOfferId = me.$root.find('#AgreedOfferId').val();
                var hasAgreedOffer =
                    agreedOfferId != null &&
                    agreedOfferId != '' &&
                    agreedOfferId != '0';

                if (hasAgreedOffer) {
                    me.$root.find('#FeeDataChanged').val('true');
                }
            });
        }

        if (shell.pmInstalled) {
            // only check after instructed
            if (recordType === C.PropertyRecordType.Rent) {
                var isAppraisal = me.isAtAppraisalStage();

                if (!isAppraisal) {
                    gmgps.cloud.helpers.general.growlManagementDateAlerts(
                        'property',
                        me.id
                    );
                }
            }
        }

        me.$root.on(
            'keyup change',
            '#Property_PropertyRental_RentalFrequency, #Property_PropertyRental_DepositRequired, #Property_PropertyRental_Price, #MarketAppraisalViewModel_Valuation_ProposedRent',
            function () {
                var displayDepositWarning = getBoolean(
                    me.$root.find('#RequiresDepositWarning')
                );

                if (displayDepositWarning) {
                    me.checkDepositDoesNotExceedLegalLimit();
                }
            }
        );

        me.$root.on('click', '.edit-appraiser-notes', function () {
            me.$root.find('[href="#pricing-tab"]').click();
            me.$root.find("#MarketAppraisalViewModel_Valuation_ValuerNotes").focus();
        });

        me.$root.on('keyup change paste drop', '#Property_PropertyLease_GroundRentValue, #Property_PropertyLease_ServiceChargeValue', function () {
            me.showWarningIfFieldNotNumericalOnly($(this));
            me.updateLegacyNTSField($(this));
        });

        var asyncContent = new alto.AsyncContent();
        asyncContent.render(me.$root, me);
    },

    configureStickyNotes: function () {
        var me = this;

        //Make saved sticky notes draggable.
        me.$root.find('.sticky-note').draggable({
            cursor: 'move',
            containment: me.$root.find('.layers'),
            stop: function () {
                shell.saveStickyNote($(this));
            }
        });
    },

    ownerCount: function () {
        var me = this;

        var numberOfOwners = 0;

        me.$root.find('.owners .row .owner-ac').each(function (i, row) {
            var contactId = $(row).attr('data-id');
            if (contactId != '0') {
                numberOfOwners++;
            }
        });

        return numberOfOwners;
    },

    setupOwnerAC: function ($e) {
        var me = this;

        $e.autoCompleteEx({
            modelType: C.ModelType.Contact,
            search: {
                CategoryIdList: [
                    C.ContactCategory.Client,
                    C.ContactCategory.Solicitor,
                    C.ContactCategory.ManagingAgent,
                    C.ContactCategory.Developer
                ],
                ApplyFurtherFilteringtoIds: true
            },
            includeContacts: true,
            includeUsers: false,
            placeholder: 'Search for Contact...',
            onSelected: function (args) {
                if (!args.isSetupCallback) {
                    if (!me.setDirty(true)) {
                        return false;
                    }
                }
            },
            onBeforeRemoved: function (id, proceedCallback) {
                showDialog({
                    type: 'question',
                    title: 'Remove Owner?',
                    msg: 'You are about to change one of the owners of this property.  Proceed?',
                    buttons: {
                        'Yes - Remove this Owner': function () {
                            proceedCallback();
                            $(this).dialog('close');
                        },
                        No: function () {
                            $(this).dialog('close');
                        }
                    }
                });
            },
            onRemoved: function () {
                if (!me.setDirty(true)) {
                    return false;
                }
            }
        });
    },

    setupTenantAC: function ($e) {
        var me = this;

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
                if (!args.isSetupCallback) {
                    if (!me.setDirty(true)) {
                        return false;
                    }
                }
            },
            onRemoved: function () {
                if (!me.setDirty(true)) {
                    return false;
                }
            }
        });
    },

    setUIState: function (state) {
        var me = this;
        // set the state of any expanded rooms (or anything else you want to return state to after save)

        if (state.selectedRoomsIdList && state.selectedRoomsIdList.length) {
            var $roomsTab = me.$root.find(
                '.layer[data-id="details"] #rooms-tab'
            );

            var $rooms = $roomsTab.find('.rooms .room');

            // if all rooms expanded before, just click the 'expand all' to reset them

            if ($rooms.length === state.selectedRoomsIdList.length) {
                $roomsTab.find('.expand-collapse-button').trigger('click');
            } else {
                $.each(
                    me.$root.find(
                        '.layer[data-id="details"] #rooms-tab .rooms .room'
                    ),
                    function (i, v) {
                        var $room = $(v);

                        if (state.selectedRoomsIdList.indexOf(i) !== -1) {
                            $room.addClass('selected');
                            $room.find('.body').show();
                        }
                    }
                );
            }
        }
    },

    getUIState: function () {
        var me = this;

        var activeLayer = me.$root
            .find('.tab-column ul li.selected')
            .attr('data-id');

        // layer may have tabs too
        var selectedTabAnchor = me.$root
            .find('.layers .layer[data-id="' + activeLayer + '"]')
            .find('ul.ui-tabs-nav li[tabindex="0"] a');

        var selectedTab = selectedTabAnchor.attr('data-route-value-tab') || selectedTabAnchor.attr('href');

        // save index of any expanded rooms too , so we can restore after save

        var selectedRoomsIdList = [];

        $.each(
            me.$root.find(
                '.layer[data-id="details"] #rooms-tab .rooms .room.selected'
            ),
            function () {
                selectedRoomsIdList.push(parseInt($(this).index()));
            }
        );

        return {
            activeLayer: activeLayer,
            selectedTab: selectedTab,
            selectedRoomsIdList: selectedRoomsIdList
        };
    },

    initLayer: function ($layer) {
        var me = this;

        var name = $layer.attr('data-id');

        if (me.layers.isConfigured(name) === true) {
            console.debug('Layer ' + name + ' already initialised');
            return;
        }

        console.debug('Layer ' + name + ' initialising');
        $layer.off();

        //Init tabs
        $layer.find('.tabs').tabs({
            create: function (event, ui) {
                if (shell.pmInstalled) {
                    shell.uiPermissions.tabContentPermissions(ui.tab, ui.panel);
                }
            },
            beforeActivate: function (event, ui) {
                var $linkElement = ui.newTab.find('a');

                //If a URL to MFE exists for the menu option, send the user to MFE instead of the Alto page. The feature flags are checked on the respective page
                var mfeUrl = $linkElement.data('mfe-url');
                if (mfeUrl) {
                    event.preventDefault();
                    window.open(mfeUrl, '_self');
                    return;
                }

                var layer = me.tabColumn.getTab(me.selectedLayer).find('a').attr('data-route-value-layer');
                var tab = $linkElement.attr('data-route-value-tab');
                if (tab) {
                    alto.router.navigationChanged('entity-layer', { collection: 'properties', id: me.id, layer: layer, tab: tab });

                    var title = me.$root.find('#_description').val();
                    alto.application.setTitle('Properties | ' + title);
                }

                if (shell.pmInstalled) {
                    shell.uiPermissions.tabContentPermissions(
                        ui.newTab,
                        ui.newPanel
                    );
                }
            },
            activate: function (event, ui) {
                me.onSubTabClicked.raise(ui.newTab);

                var label = ui.newTab.attr('galabel');
                if (label) {
                    googleAnalytics.sendEvent('properties', 'tab_click', label);
                }

                if (shell.pmInstalled) {
                    if (!me.reinit) {
                        shell.uiPermissions.tabPermissions(me.$root.find('.tabs'));
                    }
                }
            }
        });

        //Date Pickers
        $layer.find('.date-picker.hasDatepicker').removeClass('hasDatepicker');
        $layer.find('.date-picker').each(function (i, v) {
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

        //Select boxes
        $layer
            .find('select:not(.opt-standard):not(.opt-locked)')
            .customSelect();

        //Select boxes pre-locked
        $layer.find('select.opt-locked:not(.opt-standard)').customSelect(true);

        $layer
            .find('.opt-inputmask-numeric.percent-input')
            .each(function (i, v) {
                $(v).inputmask('currency', {
                    suffix: '%',
                    allowMinus: false,
                    prefix: '',
                    radixPoint: '.',
                    groupSeparator: ',',
                    digits: 2,
                    autoGroup: true,
                    rightAlign: false,
                    min: 0,
                    max: 100
                });
            });

        //Layer specific
        switch (name) {
            case 'overview':

                if (alto.optimizelyClient.isFeatureEnabledForGroup('property_overview_counts_async', $('#_groupid').val())) {
                    me.refreshPropertyOverviewCounts();
                    me.refreshFollowUps();
                    me.callOnComplete(true);
                }
                else {
                    $.when(
                        me.refreshPropertyOverviewCounts(),
                        me.refreshFollowUps()
                    )
                        .done(function () {
                            me.callOnComplete(true);
                        })
                        .fail(function () {
                            me.callOnComplete(true);
                        });
                }

                break;

            case 'management':
                if (shell.pmInstalled) {
                    // build list of deletable dates based on conditions known about certain critical dates

                    me.views.managementDatesHandler =
                        new gmgps.cloud.ui.views.managementDatesHandler({
                            $root: $layer.find('.managementevents'),
                            linkedId: me.id,
                            linkedTypeId: C.ModelType.Property,
                            linkedTypeIdList: [C.ModelType.Property],
                            dirtyHandler: function (isDirty, target) {
                                me.setDirty(isDirty, target);
                            }
                        });

                    me.views.propertyInsuranceHandler =
                        new gmgps.cloud.ui.views.property.propertyInsuranceHandler(
                            {
                                $root: $layer.find('.insurance'),
                                id: me.id,
                                dirtyHandler: function (isDirty, target) {
                                    me.setDirty(isDirty, target);
                                }
                            }
                        );

                    me.views.propertyUtilitiesHandler =
                        new gmgps.cloud.ui.views.property.propertyUtilitiesHandler(
                            {
                                $root: $layer.find('.utilities'),
                                id: me.id,
                                dirtyHandler: function (isDirty, target) {
                                    me.setDirty(isDirty, target);
                                }
                            }
                        );

                    me.views.supplierHandler =
                        new gmgps.cloud.ui.views.property.supplierHandler({
                            $root: $layer.find('.suppliers'),
                            id: me.id,
                            dirtyHandler: function (isDirty, target) {
                                me.setDirty(isDirty, target);
                            }
                        });

                    me.views.workordersHandler =
                        new gmgps.cloud.ui.views.workordersHandler({
                            $root: $layer.find('.workorders'),
                            linkedId: me.id,
                            linkedTypeId: C.ModelType.Property,
                            dirtyHandler: function (isDirty, target) {
                                me.setDirty(isDirty, target);
                            }
                        });
                }
                break;

            case 'propertyinfo':

                if (me.$root.find('#PropertyNtsViewModel_IsLoaded').val() === "False") {
                    var url = '/NTS/data';
                    me.http.ajax({
                        url: url,
                        args: { propertyId: me.id },
                        dataType: "json",
                        post: false,
                        complex: true,
                        contentType: "application/json",
                        background: true,
                        silentErrors: true
                    },
                        function (response) {

                            var json = response.Data;
                            if (json.IsLoaded === true) {
                                var ntsView = new gmgps.cloud.ui.views.PropertyNtsBinder(me.$root);
                                ntsView.bind(json);

                                me.$root.find('.nts.async').removeClass('hidden');
                                me.$root.find('#PropertyNtsViewModel_IsLoaded').val("True");
                            } else {
                                me.$root.find('#PropertyNtsViewModel_IsLoaded').val("False");
                                me.$root.find('.nts.async.heading').removeClass('hidden');
                                me.$root.find('.nts.async:not(.heading)').hide();
                                me.$root.find('.nts-api-warning').removeClass("hidden");
                            }
                        },
                        function () {
                            me.$root.find('#PropertyNtsViewModel_IsLoaded').val("False");
                            me.$root.find('.nts.async.heading').removeClass('hidden');
                            me.$root.find('.nts.async:not(.heading)').hide();
                            me.$root.find('.nts-api-warning').removeClass("hidden");

                        });
                }

                //Set the initial recordType for the UI.
                me.setRecordType(
                    parseInt($layer.find('#Property_RecordTypeId').val())
                );

                //Owner Autocomplete
                me.setupOwnerAC(me.$root.find('.owner-ac'));

                //Tenant Autocomplete
                me.setupTenantAC(me.$root.find('.tenant-ac'));

                //Summary char counter.
                $layer.find('#summary-charcounter').charCounter({
                    $src: me.$root.find('#Property_Summary')
                });

                //Advert Summary char counter.
                $layer.find('#adsummary-charcounter').charCounter({
                    $src: me.$root.find('#Property_AdvertDetails')
                });

                // ARCHITECTURAL CHANGE: AddressUIStateManager now handles all address state management
                // - Automatically detects existing address data on initialization
                // - Switches between preview/edit/lookup modes based on data and feature flags
                // - No manual DOM manipulation or state checking needed here
                // Previous manual address field checks and UPRN clearing logic removed

                var $btnlookUpProperty = me.$root.find('.btn-lookup');

                if ($btnlookUpProperty.length > 0) {

                    $btnlookUpProperty.on('click', function () {

                        var $appsDomain, $htmlDecodedAddressJSON, $address, $uprn, $defaultUrl;
                        $appsDomain = $btnlookUpProperty.attr('data-apps-domain');
                        $htmlDecodedAddressJSON = $('<div></div>').html($btnlookUpProperty.attr('data-address')).text();
                        $address = JSON.parse($htmlDecodedAddressJSON);
                        $uprn = $btnlookUpProperty.attr('data-uprn').trim();
                        $defaultUrl = $appsDomain + '/property-valuation-report';

                        if ($uprn !== '' && $uprn !== '0' && $address.Postcode !== '') {
                            window.open($appsDomain + '/property-valuation-report' + '?uprn=' + $uprn + '&postcode=' + $address.Postcode);
                            return false;
                        } else if ($address.Postcode) {

                            var $correlationId = $btnlookUpProperty.attr('data-correlation-id');

                            $('#btnLookUpSpinner').show();

                            //This won't work on local as the AuthenticationType will always be "Forms" rather than "Auth0" in the GetToken method inside Authentication controller, you will get 404
                            altoTokenService.getToken({ correlationId: $correlationId })
                                .then(function (token) {
                                    var $webApiBaseUrl = $('#_webApiBaseUrl').val();

                                    $.ajax({
                                        url: $webApiBaseUrl + '/inventory/addresslookup/postcodes/' + $address.Postcode,
                                        type: 'GET',
                                        async: false, //Synchronous so that the outer AJAX call's complete waits for this and then hides the spinner
                                        headers: {
                                            'Authorization': 'Bearer ' + token,
                                            'Alto-Version': alto.version
                                        },
                                        dataType: 'json',
                                        contentType: 'application/json',

                                        success: function (result) {

                                            //Note we're also converting empty strings to nulls as we want to normalise the address data in the property view model in order to better compare with the address lookup response
                                            const normalise = (value) => value && value !== '' ? value.toString().toUpperCase() : null;

                                            const matchedAddresses = result.addresses
                                                .map((lookupAddress) => ({
                                                    ...lookupAddress,
                                                    postcode: normalise(lookupAddress.postcode),
                                                    subBuildingName: normalise(lookupAddress.subBuildingName),
                                                    streetName: normalise(lookupAddress.streetName),
                                                    number: normalise(lookupAddress.number),
                                                    buildingName: normalise(lookupAddress.buildingName),
                                                }))
                                                .filter((lookupAddress) =>
                                                    lookupAddress.postcode === normalise($address.Postcode) &&
                                                    lookupAddress.subBuildingName === normalise($address.SubDwelling) &&
                                                    lookupAddress.streetName === normalise($address.Street) &&
                                                    (lookupAddress.number || lookupAddress.buildingName) === normalise($address.NameNo)
                                                );

                                            if (matchedAddresses.length === 1) {
                                                const uprn = matchedAddresses[0].uprn.trim();
                                                const postcode = matchedAddresses[0].postcode.trim();

                                                window.open($appsDomain + '/property-valuation-report/' + '?uprn=' + uprn + '&postcode=' + postcode);
                                                return false;
                                            } else {
                                                window.open($defaultUrl);
                                                return false;
                                            }

                                        },

                                        error: function () {
                                            window.open($defaultUrl);
                                            return false;
                                        }

                                    });
                                })
                                .catch(function (error) {
                                    console.error('Token error:', error);
                                    window.open($defaultUrl);
                                    return false;
                                })
                                .finally(function () {
                                    $('#btnLookUpSpinner').hide();
                                });

                        } else {
                            window.open($defaultUrl);
                            return false;
                        }

                    });

                }

                // Alto AI Property Summary
                var $btnAltoAI = me.$root.find('.btn-alto-ai');
                var $btnAltoAISpinner = me.$root.find('#btnAltoAISpinner');
                if ($btnAltoAI.length > 0) {
                    $btnAltoAI.on('click', function (e) {
                        me.handleAltoAIPropertySummaryClick(e, $btnAltoAI, $btnAltoAISpinner);
                    });
                }

                // altotree

                // click on parent checkbox
                $('[data-id="altotree-match-group-checkbox"]').on('change', function () {
                    var $this = $(this);
                    var isChecked = $this.prop('checked');

                    if ($this.val() === '-1') {
                        $('[data-id="altotree-match-group-checkbox"]').prop('indeterminate', false).prop('checked', isChecked);
                        $('[data-id="altotree-match-area-checkbox"]').prop('indeterminate', false).prop('checked', isChecked);
                    } else {
                        // Check/uncheck all children checkboxes
                        $(this).closest('li').find('[data-id="altotree-match-area-checkbox"]').not(this).prop('checked', isChecked).trigger("change");
                    }
                });

                // when clicking on child check parent inteterminate or all on/off
                $('[data-id="altotree-match-area-checkbox"]').on('change', function () {
                    var $this = $(this);
                    //get all checkboxes with this value:
                    var isChecked = $(this).prop('checked');
                    $('input[value="' + $this.val() + '"]').prop('checked', isChecked);
                    var elements = $('input[value="' + $this.val() + '"]');
                    elements.each(function (index, element) {
                        me.setAltoTreeViewParentState(element);
                    });
                });

                // Set indeterminate state for parent checkboxes
                $('[data-id="altotree-match-group-checkbox"].indeterminate').each(function (index, element) {
                    $(element).prop('indeterminate', true).removeClass("indeterminate");
                });

                me.wireUpClickEventsForChildrenPets();

                //Change Board Button > Click
                me.$root.find('.change-board-button').on('click', function () {
                    me.createBoardChange();
                });

                me.initFeaturesAndAreas();

                if (shell.pmInstalled) {
                    new gmgps.cloud.ui.views.clientAccountHandler({
                        $root: $layer.find('.client-accounts'),
                        linkedId: me.id,
                        linkedTypeId: C.ModelType.Property,
                        dirtyHandler: function (isDirty, target) {
                            me.setDirty(isDirty, target);
                        }
                    });
                }
                break;

            case 'details':
                //Rooms Sortable
                me.initSortableRooms();
                break;

            case 'media':
                //Media - Sortable.
                me.initSortableMedia();

                //epc exemption
                var exempt = $layer.find('.epc-exemption input:checkbox')[0]
                    .checked;
                if (exempt) {
                    $layer.find('.epc-required').hide();
                } else {
                    $layer.find('.epc-exemption-div').hide();
                }

                $layer.on(
                    'click',
                    '.epc-exemption input:checkbox',
                    function () {
                        var chk = $(this)[0];
                        if (chk.checked) {
                            //show exemption div and hide epc div
                            $layer.find('.epc-required').fadeOut(function () {
                                $layer.find('.epc-exemption-div').fadeIn();
                            });
                        } else {
                            //hide exemption div and show epc div
                            $layer
                                .find('.epc-exemption-div')
                                .fadeOut(function () {
                                    $layer.find('.epc-required').fadeIn();
                                });
                        }
                    }
                );

                //persist edits to scrollable text area to hidden field
                $layer.on('blur', '.captionScroller', function () {
                    $(this).siblings('.caption').val($(this).val());
                });

                //Put EPC markers into initial position.
                var eec = $layer.find('#Property_EPC_EERatingCurrent').val();
                var eep = $layer.find('#Property_EPC_EERatingPotential').val();
                var eic = $layer.find('#Property_EPC_EIRatingCurrent').val();
                var eip = $layer.find('#Property_EPC_EIRatingPotential').val();

                eec = eec == '' ? 0 : eec;
                eep = eep == '' ? 0 : eep;
                eic = eic == '' ? 0 : eic;
                eip = eip == '' ? 0 : eip;

                me.setEPCMarker(
                    $layer.find(
                        '.value[data-type="EE"][data-subtype="Current"]'
                    ),
                    eec
                );
                me.setEPCMarker(
                    $layer.find(
                        '.value[data-type="EE"][data-subtype="Potential"]'
                    ),
                    eep
                );
                me.setEPCMarker(
                    $layer.find(
                        '.value[data-type="EI"][data-subtype="Current"]'
                    ),
                    eic
                );
                me.setEPCMarker(
                    $layer.find(
                        '.value[data-type="EI"][data-subtype="Potential"]'
                    ),
                    eip
                );

                $layer.on(
                    'mouseenter mouseleave',
                    '.floorplans .floorplan',
                    function (e) {
                        if (e && e.type == 'mouseenter') {
                            $(this).find('.options').fadeIn();
                        } else {
                            $(this).find('.options').fadeOut();
                        }
                    }
                );

                $layer.on(
                    'mouseenter mouseleave',
                    '.virtualTours .virtualTour',
                    function (e) {
                        if (e && e.type == 'mouseenter') {
                            $(this).find('.options').fadeIn();
                        } else {
                            $(this).find('.options').fadeOut();
                        }
                    }
                );

                $layer.on(
                    'click',
                    '.floorplans .floorplan .delete-button',
                    function () {
                        var self = this;

                        showDialog({
                            type: 'question',
                            title: 'Delete Floorplan?',
                            msg: 'Are you sure you would you like to delete this floorplan?',
                            buttons: {
                                Yes: function () {
                                    $(this).dialog('close');

                                    if (!me.setDirty(true)) {
                                        return false;
                                    }

                                    $(self).closest('li').remove();
                                },
                                No: function () {
                                    $(this).dialog('close');
                                }
                            }
                        });
                    }
                );

                $layer.on('click', '.edit-epc-button', function () {
                    if ($(this).hasClass('on')) {
                        //Close
                        $(this)
                            .text($(this).attr('data-label'))
                            .removeClass('on');
                        $('.epc-edit-cell').toggle();
                        $layer
                            .find('.epc .value')
                            .addClass('ui-state-disabled');
                    } else {
                        //Open
                        $(this).attr('data-label', $(this).text());
                        $(this).text('End Editing').addClass('on');
                        $('.epc-edit-cell').toggle();
                        $layer
                            .find('.epc .value')
                            .removeClass('ui-state-disabled');
                    }
                });

                $layer.on(
                    'mouseenter mouseleave',
                    '.epcs .epc .front',
                    function (e) {
                        if (e && e.type == 'mouseenter') {
                            $(this)
                                .find('.options')
                                .fadeIn({ duration: 'fast' });
                        } else {
                            $(this)
                                .find('.options')
                                .fadeOut({ duration: 'slow' });
                        }
                    }
                );

                $layer.on('click', '.epcs .epc .image', function () {
                    var mediaId = parseInt(
                        $(this).closest('.epc').attr('data-id')
                    );
                    var fileIsSaved = mediaId > 0;

                    if (fileIsSaved) {
                        var docUrl = $(this)
                            .closest('.epc')
                            .find('.media-alt-url')
                            .val();

                        if (!docUrl) {
                            docUrl = $(this)
                                .closest('.epc')
                                .find('.media-url')
                                .val();
                        }

                        if (docUrl) {
                            window.open(docUrl, '_blank');
                        }
                    } else {
                        showInfo(
                            'The selected EPC image has not yet been saved, please save the property record before attempting to view the EPC image.'
                        );
                        return false;
                    }
                });

                $layer.on('click', '.epcs .epc .delete-button', function () {
                    var self = this;

                    showDialog({
                        type: 'question',
                        title: 'Delete EPC Media?',
                        msg: 'Are you sure you would you like to delete this EPC Media?',
                        buttons: {
                            Yes: function () {
                                $(this).dialog('close');

                                if (!me.setDirty(true)) {
                                    return false;
                                }

                                $(self).closest('li').remove();
                            },
                            No: function () {
                                $(this).dialog('close');
                            }
                        }
                    });
                });

                $layer.on(
                    'mouseenter mouseleave',
                    '.public-brochures .public-brochure .front',
                    function (e) {
                        if (e && e.type == 'mouseenter') {
                            $(this)
                                .find('.options')
                                .fadeIn({ duration: 'fast' });
                            $(this)
                                .find('.options-bottom')
                                .fadeIn({ duration: 'fast' });
                        } else {
                            $(this)
                                .find('.options')
                                .fadeOut({ duration: 'slow' });
                            $(this)
                                .find('.options-bottom')
                                .fadeOut({ duration: 'slow' });
                        }
                    }
                );

                $layer.on(
                    'mouseenter mouseleave',
                    '.files .file .front',
                    function (e) {
                        if (e && e.type == 'mouseenter') {
                            $(this)
                                .find('.options')
                                .fadeIn({ duration: 'fast' });
                            $(this)
                                .find('.options-bottom')
                                .fadeIn({ duration: 'fast' });
                        } else {
                            $(this)
                                .find('.options')
                                .fadeOut({ duration: 'slow' });
                            $(this)
                                .find('.options-bottom')
                                .fadeOut({ duration: 'slow' });
                        }
                    }
                );

                $layer.on(
                    'click',
                    '.public-brochures .public-brochure .image',
                    function () {
                        var id = parseInt(
                            $(this).closest('.public-brochure').attr('data-id'),
                            10
                        );

                        if (id < 0) {
                            showInfo(
                                'This brochure has not yet been saved, please save the property record before previewing.'
                            );
                            return;
                        }
                        var docUrl = $(this)
                            .closest('.public-brochure')
                            .find('.media-url')
                            .val();
                        if (docUrl) {
                            window.open(docUrl, '_blank');
                        }
                    }
                );

                $layer.on('click', '.files .file .image', function () {
                    var docUrl = $(this).closest('.file').attr('data-url');
                    if (docUrl) {
                        window.open(docUrl, '_blank');
                    }
                });

                $layer.on(
                    'click',
                    '.public-brochures .public-brochure .custom-brochure',
                    function () {
                        $(this)
                            .closest('.public-brochure')
                            .find('.image')
                            .trigger('click');
                    }
                );

                $layer.on(
                    'click',
                    '.public-brochures .public-brochure .brochure',
                    function () {
                        var $chk = $(this)
                            .prev('.tickbox')
                            .find('.tickbox-hidden');
                        $chk.trigger('click');
                        me.applyCustomBrochureLabel();
                    }
                );

                // only allow one brochure to be set as the default brochure
                $layer.on(
                    'change',
                    '.public-brochures .public-brochure .tickbox-hidden.brochure',
                    function () {
                        if ($(this).prop('checked') == true) {
                            $layer
                                .find(
                                    '.public-brochures .public-brochure .tickbox-hidden:checked'
                                )
                                .not(this)
                                .prop('checked', false)
                                .trigger('prog-change');
                        }
                    }
                );

                $layer.on(
                    'click',
                    '.public-brochures .public-brochure .brochure-default',
                    function () {
                        var $chk = $(this)
                            .prev('.tickbox')
                            .find('.tickbox-hidden');
                        if ($chk.hasClass('ticked')) {
                            $chk.prop('checked', false);
                        } else {
                            $chk.prop('checked', true);
                        }

                        $chk.trigger('click');
                    }
                );

                // only allow one public brochure to be set as the default brochure
                $layer.on(
                    'change',
                    '.public-brochures .public-brochure .tickbox-hidden .brochure',
                    function () {
                        if ($(this).prop('checked') == true) {
                            $layer
                                .find(
                                    '.public-brochures .public-brochure .tickbox-hidden .brochure:checked'
                                )
                                .not(this)
                                .prop('checked', false)
                                .trigger('prog-change');
                        }
                    }
                );

                $layer.on(
                    'click',
                    '.public-brochures .public-brochure .delete-button',
                    function () {
                        var self = this;

                        showDialog({
                            type: 'question',
                            title: 'Delete Custom Brochure',
                            msg: 'Are you sure you would you like to delete this custom brochure?',
                            buttons: {
                                Yes: function () {
                                    $(this).dialog('close');

                                    if (!me.setDirty(true)) {
                                        return false;
                                    }

                                    $(self).closest('li').remove();
                                },
                                No: function () {
                                    $(this).dialog('close');
                                }
                            }
                        });
                    }
                );

                $layer.on('click', '.files .file .delete-button', function () {
                    var self = this;

                    showDialog({
                        type: 'question',
                        title: 'Delete Media File',
                        msg: 'Are you sure you would you like to delete this media file?',
                        buttons: {
                            Yes: function () {
                                $(this).dialog('close');

                                if (!me.setDirty(true)) {
                                    return false;
                                }

                                $(self).closest('li').remove();
                            },
                            No: function () {
                                $(this).dialog('close');
                            }
                        }
                    });
                });

                //delete selected files
                $layer.on(
                    'click',
                    '#public-brochure-tab .delete-selected-button',
                    function () {
                        var files = $layer.find(
                            '.public-brochures .public-brochure .selector:checked'
                        );

                        if (files.length == 0) {
                            showInfo(
                                'No brochures have been selected to delete, please select at least one file first.'
                            );
                            return false;
                        }

                        showDialog({
                            type: 'question',
                            title: 'Delete Brochures',
                            msg: 'Are you sure you would you like to delete the {0} selected brochures?'.format(
                                files.length
                            ),
                            buttons: {
                                Yes: function () {
                                    $(this).dialog('close');

                                    if (!me.setDirty(true)) {
                                        return false;
                                    }

                                    for (var i = 0; i < files.length; i++) {
                                        var file = files[i];
                                        $(file)
                                            .closest('li.public-brochure')
                                            .remove();
                                    }
                                },
                                No: function () {
                                    $(this).dialog('close');
                                }
                            }
                        });
                    }
                );

                //delete selected files
                $layer.on(
                    'click',
                    '#files-tab .delete-selected-button',
                    function () {
                        var files = $layer.find(
                            '.files .file .selector:checked'
                        );

                        if (files.length == 0) {
                            showInfo(
                                'No files have been selected to delete, please select at least one file first.'
                            );
                            return false;
                        }

                        showDialog({
                            type: 'question',
                            title: 'Delete Media Files',
                            msg: 'Are you sure you would you like to delete the {0} selected media files?'.format(
                                files.length
                            ),
                            buttons: {
                                Yes: function () {
                                    $(this).dialog('close');

                                    if (!me.setDirty(true)) {
                                        return false;
                                    }

                                    for (var i = 0; i < files.length; i++) {
                                        var file = files[i];
                                        $(file).closest('li.file').remove();
                                    }
                                },
                                No: function () {
                                    $(this).dialog('close');
                                }
                            }
                        });
                    }
                );

                //single brochure email
                $layer.on(
                    'click',
                    '.public-brochures .public-brochure .email-button',
                    function () {
                        var dId = $(this)
                            .closest('.public-brochure')
                            .attr('data-id');
                        if (dId < 0) {
                            showInfo(
                                'The selected brochure has not yet been saved, please save the property record before emailing.'
                            );
                            return false;
                        }

                        var fileArrays = new Array();
                        fileArrays.push({
                            id: dId,
                            name: $(this)
                                .closest('.public-brochure')
                                .attr('data-caption'),
                            icon: $(this)
                                .closest('.public-brochure')
                                .attr('data-icon'),
                            url: $(this)
                                .closest('.public-brochure')
                                .attr('data-url'),
                            type: 'Brochure',
                            modeltypeid: C.ModelType.MediaFile,
                            filetypeid: $(this)
                                .closest('.public-brochure')
                                .attr('data-filetypeid'),
                            displaytype: $(this)
                                .closest('.public-brochure')
                                .attr('data-displaytype'),
                            category: $(this)
                                .closest('.public-brochure')
                                .attr('data-category')
                        });

                        gmgps.cloud.helpers.general.createEmail({
                            complex: false,
                            contentType: 'application/json; charset=utf-8',
                            data: JSON.stringify({
                                propertyId: me.id,
                                medias: fileArrays
                            })
                        });
                    }
                );

                //single file email
                $layer.on('click', '.files .file .email-button', function () {
                    var dId = $(this).closest('.file').attr('data-id');
                    if (dId < 0) {
                        showInfo(
                            'The selected file has not yet been saved, please save the property record before emailing.'
                        );
                        return false;
                    }

                    var fileArrays = new Array();
                    fileArrays.push({
                        id: dId,
                        name: $(this).closest('.file').attr('data-caption'),
                        icon: $(this).closest('.file').attr('data-icon'),
                        url: $(this).closest('.file').attr('data-url'),
                        type: 'File',
                        modeltypeid: C.ModelType.MediaFile,
                        filetypeid: $(this)
                            .closest('.file')
                            .attr('data-filetypeid'),
                        displaytype: $(this)
                            .closest('.file')
                            .attr('data-displaytype'),
                        category: $(this).closest('.file').attr('data-category')
                    });

                    gmgps.cloud.helpers.general.createEmail({
                        complex: false,
                        contentType: 'application/json; charset=utf-8',
                        data: JSON.stringify({
                            propertyId: me.id,
                            medias: fileArrays
                        })
                    });
                });

                //email selected files
                $layer.on(
                    'click',
                    '#files-tab .email-selected-button',
                    function () {
                        var files = $layer.find(
                            '.files .file .selector:checked'
                        );

                        if (files.length == 0) {
                            showInfo(
                                'No files have been selected to email, please select at least one file first.'
                            );
                            return false;
                        }

                        var someNotSaved = false;

                        var fileArrays = new Array();
                        for (var i = 0; i < files.length; i++) {
                            var file = files[i];
                            var dId = $(file).closest('.file').attr('data-id');

                            if (dId < 0) {
                                someNotSaved = true;
                            } else {
                                fileArrays.push({
                                    id: dId,
                                    name: $(file)
                                        .closest('.file')
                                        .attr('data-caption'),
                                    icon: $(file)
                                        .closest('.file')
                                        .attr('data-icon'),
                                    url: $(file)
                                        .closest('.file')
                                        .attr('data-url'),
                                    type: 'File',
                                    modeltypeid: C.ModelType.MediaFile,
                                    filetypeid: $(file)
                                        .closest('.file')
                                        .attr('data-filetypeid'),
                                    displaytype: $(file)
                                        .closest('.file')
                                        .attr('data-displaytype'),
                                    category: $(file)
                                        .closest('.file')
                                        .attr('data-category')
                                });
                            }
                        }

                        if (someNotSaved) {
                            showInfo(
                                'One or more files have not yet been saved, please save the property record before emailing.'
                            );
                        } else {
                            gmgps.cloud.helpers.general.createEmail({
                                complex: false,
                                contentType: 'application/json; charset=utf-8',
                                data: JSON.stringify({
                                    propertyId: me.id,
                                    medias: fileArrays
                                })
                            });
                        }
                    }
                );

                //email selected brochures
                $layer.on(
                    'click',
                    '#public-brochure-tab .email-selected-button',
                    function () {
                        var files = $layer.find(
                            '.public-brochures .public-brochure .selector:checked'
                        );

                        if (files.length == 0) {
                            showInfo(
                                'No brochures have been selected to email, please select at least one brochure first.'
                            );
                            return false;
                        }

                        var someNotSaved = false;

                        var fileArrays = new Array();
                        for (var i = 0; i < files.length; i++) {
                            var file = files[i];
                            var dId = $(file)
                                .closest('.public-brochure')
                                .attr('data-id');

                            if (dId < 0) {
                                someNotSaved = true;
                            } else {
                                fileArrays.push({
                                    id: dId,
                                    name: $(file)
                                        .closest('.public-brochure')
                                        .attr('data-caption'),
                                    icon: $(file)
                                        .closest('.public-brochure')
                                        .attr('data-icon'),
                                    url: $(file)
                                        .closest('.public-brochure')
                                        .attr('data-url'),
                                    type: 'Brochure',
                                    modeltypeid: C.ModelType.MediaFile,
                                    filetypeid: $(file)
                                        .closest('.public-brochure')
                                        .attr('data-filetypeid'),
                                    displaytype: $(file)
                                        .closest('.public-brochure')
                                        .attr('data-displaytype'),
                                    category: $(file)
                                        .closest('.public-brochure')
                                        .attr('data-category')
                                });
                            }
                        }

                        if (someNotSaved) {
                            showInfo(
                                'One or more brochures have not yet been saved, please save the property record before emailing.'
                            );
                        } else {
                            gmgps.cloud.helpers.general.createEmail({
                                complex: false,
                                contentType: 'application/json; charset=utf-8',
                                data: JSON.stringify({
                                    propertyId: me.id,
                                    medias: fileArrays
                                })
                            });
                        }
                    }
                );

                //select all brochures
                $layer.on(
                    'click',
                    '#public-brochure-tab .all-selector',
                    function () {
                        if (this.checked) {
                            $layer
                                .find('.public-brochure .selector')
                                .prop('checked', true)
                                .closest('.tickbox')
                                .addClass('ticked');
                        } else {
                            $layer
                                .find('.public-brochure .selector')
                                .prop('checked', false)
                                .closest('.tickbox')
                                .removeClass('ticked');
                        }
                    }
                );

                //select all files
                $layer.on('click', '#files-tab .all-selector', function () {
                    if (this.checked) {
                        $layer
                            .find('.file .selector')
                            .prop('checked', true)
                            .closest('.tickbox')
                            .addClass('ticked');
                    } else {
                        $layer
                            .find('.file .selector')
                            .prop('checked', false)
                            .closest('.tickbox')
                            .removeClass('ticked');
                    }
                });

                //select one brochure and check for all selected
                $layer.on('click', '.public-brochure .selector', function () {
                    if (!this.checked) {
                        $layer
                            .find('#public-brochure-tab .all-selector')
                            .prop('checked', false)
                            .closest('.tickbox')
                            .removeClass('ticked');
                    } else {
                        var selectors = $layer.find(
                            '.public-brochure .selector'
                        );
                        var selectorsChecked = $layer.find(
                            '.public-brochure .selector:checked'
                        );
                        if (selectors.length == selectorsChecked.length) {
                            $layer
                                .find('#public-brochure-tab .all-selector')
                                .prop('checked', true)
                                .closest('.tickbox')
                                .addClass('ticked');
                        }
                    }
                });
                //select one file and check for all selected
                $layer.on('click', '.file .selector', function () {
                    if (!this.checked) {
                        $layer
                            .find('#files-tab .all-selector')
                            .prop('checked', false)
                            .closest('.tickbox')
                            .removeClass('ticked');
                    } else {
                        var selectors = $layer.find('.file .selector');
                        var selectorsChecked = $layer.find(
                            '.file .selector:checked'
                        );
                        if (selectors.length == selectorsChecked.length) {
                            $layer
                                .find('#files-tab .all-selector')
                                .prop('checked', true)
                                .closest('.tickbox')
                                .addClass('ticked');
                        }
                    }
                });

                $layer.find('.epc .value').draggable({
                    axis: 'y',
                    containment: 'parent',
                    stop: function () {
                        if (!me.setDirty(true)) {
                            return false;
                        }
                    },
                    drag: function () {
                        var $slider = $(this);
                        var y = parseInt($slider.position().top);

                        y = y + 30;

                        //Define the upper and lower limits of each band (the scales).
                        var scales = [
                            [92, 199],
                            [81, 91],
                            [69, 80],
                            [55, 68],
                            [39, 54],
                            [21, 38],
                            [0, 20]
                        ];
                        var coloursEE = [
                            '#007E2D',
                            '#2C9F29',
                            '#A1D20E',
                            '#F8F400',
                            '#F1C300',
                            '#E77C17',
                            '#DF0024'
                        ];
                        var coloursEI = [
                            '#CDE3F4',
                            '#97C0E6',
                            '#73A2D6',
                            '#4E84C4',
                            '#A5A6A9',
                            '#919194',
                            '#807F83'
                        ];
                        var coloursInk = [
                            '#fff',
                            '#fff',
                            '#fff',
                            '#444',
                            '#fff',
                            '#fff',
                            '#fff'
                        ];
                        var upper = 0;
                        var lower = 0;
                        var scale = 0;
                        var value = '';
                        var barHeight = 26;

                        //Default bar height is 26, the separator is 4px, totalling 30px for each "band".

                        //Set the colours to use (EE or EI)
                        var colours =
                            $slider.attr('data-type') == 'EE'
                                ? coloursEE
                                : coloursEI;

                        //Determine the container height (minus the slider).
                        var containerHeight =
                            $slider.parent().height() - $slider.height();

                        //Calculate percentage.
                        var perc = 1 - y / containerHeight;
                        value = Math.round(perc * 100);

                        var barY = y % 30; //vertical distance from the bottom of the closest bar.
                        barY = barY > barHeight ? barHeight : barY; //ensure
                        var band = parseInt(y / 30) - 1;
                        band =
                            band > scales.length - 1 ? scales.length - 1 : band;

                        lower = scales[band][0];
                        upper = scales[band][1];
                        scale = upper - lower;
                        var perPixel = scale / barHeight;
                        value = parseInt(upper - perPixel * barY);

                        $slider
                            .css('background-color', colours[band])
                            .css('color', coloursInk[band])
                            .text(value);

                        $layer
                            .find(
                                '#Property_EPC_' +
                                $slider.attr('data-type') +
                                'Rating' +
                                $slider.attr('data-subtype')
                            )
                            .val(value);
                    }
                });

                // make initially disabled until edit EPC btn is clicked
                $layer.find('.epc .value').addClass('ui-state-disabled');

                // add web link media click handler
                $layer.on('click', '#web-tab .add-link', function () {
                    if (!me.setDirty(true)) {
                        return false;
                    }

                    var $row = $layer
                        .find('#web-tab .weblinks .template')
                        .clone();
                    $row.removeClass('hidden template');
                    $layer.find('#web-tab ul').append($row);
                    $row.find('.header').trigger('click');
                });

                // delete weblink handler
                $layer.on('click', '#web-tab li .delete-button', function () {
                    if (!me.setDirty(true)) {
                        return false;
                    }

                    $(this).closest('li').remove();
                });

                // jump to entered url
                $layer.on('click', '#web-tab li .link', function () {
                    var url = $(this)
                        .closest('table')
                        .find('.external-link')
                        .val();

                    if (url.length > 0) {
                        if (url.indexOf('http') !== 0) {
                            url = 'http://' + url;
                        }
                        window.open(url, '_blank');
                    }
                });

                // repeat caption in title
                $layer.on('keyup', '.weblink .name', function () {
                    $(this)
                        .closest('.weblink')
                        .find('.title')
                        .html($(this).val());
                });

                $layer.on('click', '.weblinks .weblink .header', function () {
                    var $link = $(this).parent();
                    if ($link.hasClass('selected')) {
                        $link.removeClass('selected');
                        $link.find('.body').hide();
                    } else {
                        $layer
                            .find('.weblinks .weblink')
                            .removeClass('selected')
                            .find('.body')
                            .hide();
                        $link.addClass('selected');
                        $link.find('.body').fadeIn(500);
                    }
                });

                // add web link media click handler
                $layer.on('click', '#virtual-tours-tab .add-link', function () {
                    var $row = $layer
                        .find('#virtual-tours-tab .vtlinks .template')
                        .clone();
                    $row.removeClass('hidden template');
                    $layer.find('#virtual-tours-tab ul.vtlinks').append($row);
                    $row.find('.header').trigger('click');
                    me.setDirty(true);
                });

                // delete weblink handler
                $layer.on(
                    'click',
                    '#virtual-tours-tab li .delete-button',
                    function () {
                        if (!me.setDirty(true)) {
                            return false;
                        }

                        $(this).closest('li').remove();
                    }
                );

                // jump to entered url
                $layer.on('click', '#virtual-tours-tab li .link', function () {
                    var url = $(this)
                        .closest('table')
                        .find('.external-link')
                        .val();

                    if (url.length > 0) {
                        if (url.indexOf('http') !== 0) {
                            url = 'http://' + url;
                        }
                        window.open(url, '_blank');
                    }
                });

                // repeat caption in title
                $layer.on('keyup', '.vtlink .name', function () {
                    $(this)
                        .closest('.vtlink')
                        .find('.title')
                        .html($(this).val());
                });

                $layer.on('click', '.vtlinks .vtlink .header', function () {
                    var $link = $(this).parent();
                    if ($link.hasClass('selected')) {
                        $link.removeClass('selected');
                        $link.find('.body').hide();
                    } else {
                        $layer
                            .find('.vtlinks .vtlink')
                            .removeClass('selected')
                            .find('.body')
                            .hide();
                        $link.addClass('selected');
                        $link.find('.body').fadeIn(500);
                    }
                });

                break;

            case 'marketing':
                break;

            case 'digitalmaps':
                break;

            case 'timeline':
                me.orderBy = C.SearchOrderBy.StartDate;
                me.orderType = C.SearchOrderType.Descending;

                if (me.cfg.inStepThrough) {
                    me.setStepThroughTimeLineFilterState();
                }

                me.refreshTimeline(1);

                $layer.on('change', '.box-toggle', function () {
                    me.refreshTimeline(1);
                    me.onTimelineBoxToggleClicked.raise(
                        me.getEventSearchFilters()
                    );
                });
                $layer.on('click', '.page-button:not(.disabled)', function () {
                    me.refreshTimeline(parseInt($(this).attr('data-page')));
                });

                var toggleNotesBehaviour =
                    new gmgps.cloud.ui.behaviours.ToggleViewingNotesBehaviour();
                toggleNotesBehaviour.apply($layer, function (changedMode) {
                    me.notesOrFeedback = changedMode;
                });
                me.notesOrFeedback =
                    me.toggleNotesBehaviour.getSelectedMode($layer);

                $layer.on(
                    'click',
                    '.timeline-header th.sortable',
                    function (e) {
                        var $target = $(e.target);

                        var orderBy = $target.attr('data-id');

                        if (!orderBy) {
                            return false;
                        }

                        if ($.isNumeric(orderBy)) {
                            orderBy = parseInt(orderBy);
                        }

                        //Set the sort order.  If this column is already the sort column, flip the order, else default to ascending.
                        if (orderBy === me.orderBy) {
                            me.orderType =
                                me.orderType === C.SearchOrderType.Ascending
                                    ? C.SearchOrderType.Descending
                                    : C.SearchOrderType.Ascending;
                        } else {
                            //When the orderby changes, begin with ascending order.
                            me.orderType = C.SearchOrderType.Ascending;
                        }

                        me.orderBy = orderBy;

                        //Remove Arrow indicator (to give some kind of feedback whilst sort takes place on server)
                        $(this)
                            .closest('tr')
                            .find('.sort-asc, .sort-desc')
                            .removeClass('sort-asc sort-desc');
                        me.refreshTimeline(1);
                    }
                );
                break;

            case 'upload':
                break;

            case 'tenancy':
                if (shell.pmInstalled) {
                    $layer.on(
                        'click',
                        '.body td:not(.checkbox-container)',
                        function () {
                            gmgps.cloud.helpers.tenancy.gotoTenancy({
                                id: parseInt(
                                    $(this)
                                        .closest('tr')
                                        .attr('data-firsttermtenancyid')
                                )
                            });
                        }
                    );
                }

                break;
            case 'matches':
                $layer.on(
                    'click',
                    '.contact-match-list .row .line0',
                    function () {
                        gmgps.cloud.helpers.contact.editContact({
                            id: parseInt($(this).closest('tr').attr('data-id'))
                        });
                    }
                );

                $layer.on(
                    'click',
                    '.contact-match-list .row .detail-container .toggle',
                    function () {
                        var $arrow = $(this);

                        $(this)
                            .closest('.pl10')
                            .find('.more-info')
                            .slideToggle();

                        if ($arrow.hasClass('up-arrow')) {
                            $arrow
                                .removeClass('up-arrow')
                                .addClass('down-arrow');
                        } else if ($arrow.hasClass('down-arrow')) {
                            $arrow
                                .removeClass('down-arrow')
                                .addClass('up-arrow');
                        }
                    }
                );

                $layer.on(
                    'click',
                    '.contact-match-list .book-viewing-link',
                    function () {
                        gmgps.cloud.helpers.property.getViewing({
                            contextModelType: C.ModelType.Property,
                            propertyId: parseInt(me.id),
                            contactId: parseInt($(this).attr('data-contact-id'))
                        });
                    }
                );

                $layer.find('.match-date-picker').datepicker({
                    numberOfMonths: 2,
                    showButtonPanel: true,
                    dateFormat: 'dd/mm/yy',
                    onSelect: function () {
                        me.queueMatchCountUpdate(false);
                    }
                });

                $layer.find('.accordion').accordion({
                    active: 1,
                    autoHeight: false,
                    collapsible: false,
                    clearStyle: true,
                    heightStyle: 'fill'
                });
                //.accordion('refresh');

                $layer.on('keyup change', '.opt-refresh', function () {
                    me.queueMatchCountUpdate({
                        search: {
                            SearchPage: {
                                Index: 1,
                                Size: $layer.find('#PageSize').val()
                            }
                        }
                    });
                });

                me.setupSavedMatchLists(me.cfg);
                break;

            case 'keys':
                break;

            case 'marketappraisal':
                //Initial appointment UI state (disabled if valuation Id is zero)
                if (parseInt(me.$root.find('#Valuation_Id').val()) == 0) {
                    me.$root
                        .find('.appointment-fields input')
                        .attr('disabled', 'disabled');
                    me.$root
                        .find('.appointment-fields .customStyleSelectBox')
                        .addClass('disabled');
                }

                //Initial alternative rental freq labels.
                setTimeout(function () {
                    me.updateMARentalPriceAutoLabels();
                }, 500);

                $layer.find('.match-date-picker').datepicker({
                    numberOfMonths: 2,
                    showButtonPanel: true,
                    dateFormat: 'dd/mm/yy',
                    onSelect: function (text) {
                        this.previousValue = text;
                        me.queueMatchCountUpdate(false);
                    },
                    onClose: function (text) {
                        if (text.length == 0 && this.previousValue.length > 0) {
                            me.queueMatchCountUpdate(false);
                        }
                    }
                });

                me.initMAFollowUps();
                break;

            case 'transactions':
                if (shell.pmInstalled) {
                    me.views[name] =
                        new gmgps.cloud.ui.views.transactionsHandler({
                            $root: $layer.find('.transactions'),
                            linkedId: me.id,
                            linkedTypeId: C.ModelType.Property
                        });
                }

                break;

            default:
                break;
        }

        console.debug('Layer ' + name + ' initialised');
    },

    initLayers: function (reinit) {
        var me = this;

        //Initialise each layer.
        me.layers.init(me.$root, function($layer) { me.initLayer($layer); });

        if (!reinit && me.cfg.tabLayerToLoad) {
            me.tabColumn.selectTab(me.cfg.tabLayerToLoad, me.cfg.tabToSelect, me.cfg.filter);
        }

        //Ready - callback.
        me.cfg.callback();

        me.setupTips();
    },

    sendDraftDetails: function () {
        var me = this;
        gmgps.cloud.helpers.property.sendDraftDetails(me.id);
    },

    bookAppointment: function (newAppointment) {
        var me = this;

        var eventId = 0;

        var isArchived =
            me.$root.find('#Property_Archived').val().toLowerCase() === 'true';

        if (isArchived && newAppointment) {
            showInfo(
                'Archived properties cannot have a Marketing Appraisal. Please Clone the property first.',
                'Archived Property'
            );
            return;
        }
        if (!newAppointment) {
            eventId = parseInt(me.$root.find('#ValuationDiaryEventId').val());
        }

        gmgps.cloud.helpers.property.getMarketAppraisalAppointment(
            {
                propertyId: me.id,
                eventId: eventId,
                allowCancel: false
            },
            function (id, $f) {
                //Update the appraisal appointment with details from the completed form.
                me.setDirty(false); // saving MA needs to reset Dirty state
                //Update the appointment summary.
                var $summary = me.$root.find('.yes-appointment');
                var start = Date.parse($f.find('#StartDate').val());
                var end = Date.parse($f.find('#EndDate').val());

                //Hide any cancelled-specific html, show active-specific.
                me.$root
                    .find(
                        '.layer[data-id="marketappraisal"] .cancelled-specific'
                    )
                    .hide();
                me.$root
                    .find('.layer[data-id="marketappraisal"] .active-specific')
                    .show();
                me.$root.find('.no-appointment').hide();

                $summary
                    .find('.apt-date')
                    .html(start.toString('ddd dd MMM yyyy'));
                $summary
                    .find('.apt-time')
                    .html(
                        start.toString('HH:mm') + ' - ' + end.toString('HH:mm')
                    );
                $summary
                    .find('.apt-appraiser')
                    .html($f.find('#NegotiatorId option:selected').text());
                $summary
                    .find('.apt-type')
                    .html($f.find('#ValuationTypeId option:selected').text());
                $summary
                    .find('.apt-leadsource')
                    .html($f.find('#LeadSourceId option:selected').text());
                $summary.find('.apt-notes').html($f.find('#Notes').val());

                $summary.show();

                //Update the ValuationDiaryEventId field with the id returned from the server.
                me.$root.find('#ValuationDiaryEventId').val(id);
                me.$root.find('#MarketAppraisalViewModel_Valuation_Id').val(id);
                me.$root.find('#MAValuationEventStatusCancelled').val('False');

                me.initMAFollowUps();
            }
        );
    },

    isAtAppraisalStage: function () {
        return this.$root.find('#IsAtAppraisalStage').val() === 'True';
    },

    getRecordTypeId: function () {
        var recordTypeElement = this.$root.find('#Property_RecordTypeId');
        if (recordTypeElement.length === 0) {
            recordTypeElement = this.$root.find('#RecordTypeId_');
        }

        return parseInt(recordTypeElement.val(), 10);
    },

    getCategoryId: function () {
        var categoryTypeElement = this.$root.find('#Property_CategoryId');
        return parseInt(categoryTypeElement.val(), 10);
    },

    maShift: function () {
        //Shift certain parts of the UI into the appraisal tab (for ma stage properties).
        var me = this;

        //Check that the market appraisal layer has loaded and is ready.  If not, try again shortly.
        //this needs changing!!
        if (me.$root.find('.market-appraisal').length == 0) {
            setTimeout(function () {
                me.maShift();
            }, 50); //50ms retry.  Alternatively we could have set bools on me, but they'd have needed to be persisted to the dom also.
            return false;
        }

        //DOM Shifting
        if (me.isAtAppraisalStage()) {
            var $src, $dst;

            //Move the property details.
            // - Hide the review date, because it relates to the property as a property and not an appraisal.
            // - Change the address h1 from "address" to "property address" - context is unclear in the embedded MA form.
            // - Hide anything marked as 'not-ma' (not market appraisal).
            $dst = me.$root.find('#ma-property-details-container');
            $src = me.$root.find('#property-details-container:first-child');

            $src.find('.review-line').hide().prev().addClass('mb20');
            $src.find('.about-property-h1:first()').text(
                'About the Property / Current Status'
            );

            $src.find('.address-h1').text('Property Address');
            $src.find('.not-ma').hide();
            $src.appendTo($dst);

            //...Also inject the rental specific fields for the "acceptable" group.
            me.$root
                .find('.rentalType-row')
                .appendTo(me.$root.find('#ma-property-rental-placeholder'));
            me.$root
                .find('.term-row')
                .appendTo(me.$root.find('#ma-property-rental-placeholder'));
            me.$root
                .find('.acceptable-row')
                .appendTo(me.$root.find('#ma-property-rental-placeholder'));

            //Move RentalFrequency to the pricing tab (MA).
            me.$root
                .find('.row[data-row="rentalFrequency"]')
                .prependTo(me.$root.find('#pricing-tab .rental-pricing'));

            //Move PriceType to the pricing tab (MA).
            me.$root
                .find('.row[data-row="priceTypeId"]')
                .prependTo(me.$root.find('#pricing-tab .rental-pricing'));

            //Move FurnishedId to the pricing tab (MA).
            me.$root
                .find('.row[data-row="furnishedId"]')
                .appendTo(me.$root.find('#pricing-tab .rental-pricing'));

            //Ensure notes are last.
            me.$root
                .find('.row[data-row="appraiserNotes"]')
                .appendTo(me.$root.find('#pricing-tab .sale-rent-fields'));

            //Build the Rental Management column.
            var $managementCol = me.$root.find('.management-col');
            me.$root
                .find('.row[data-row="rentDeposit"]')
                .appendTo($managementCol);
            me.$root
                .find('.row[data-row="rentManagement"]')
                .appendTo($managementCol);
            me.$root
                .find('.row[data-row="rentalFee"]')
                .appendTo($managementCol);
            me.$root
                .find('.row[data-row="dateAvailable"]')
                .appendTo($managementCol);

            //Move owners from PropertyInfo to MA
            $src = me.$root.find('#property-owners-container').children();
            $src.find('.col-1').remove();
            $src.appendTo(me.$root.find('#ma-owners-container'));

            //
            me.$root
                .find('#ma-property-situation')
                .appendTo(me.$root.find('#ma-property-situation-placeholder'))
                .show();

            //Move the features (and hide the match areas).
            // - Pre-select the "condition" category.
            $src = me.$root.find('div.features-tab').children();
            $dst = me.$root.find('#ma-features-tab');
            $src.find('#match-areas').hide();
            $src.appendTo($dst);
            $src.find(
                '.vtabs[data-type="featurecategories"] .tab[data-type="123"]'
            ).trigger('click');
        }

    },

    getEventSearchFilters: function () {
        var me = this;

        var filterTypes = [];

        var $layer = me.$root.find('.layer[data-id="timeline"]');

        if (me.viewingSubTypes == null) {
            me.viewingSubTypes = [
                C.ViewingTimelineFilterType.Cancelled,
                C.ViewingTimelineFilterType.Confirmed,
                C.ViewingTimelineFilterType.Unconfirmed
            ];
        }

        var totalFilterCount = $layer.find(
            '.box-toggle:not(.master,.viewing)'
        ).length;

        //Determine which filter switches are activated (on).
        $layer
            .find('.box-toggle.on:not(.master,.viewing)')
            .each(function (i, v) {
                var typeId = parseInt($(v).attr('data-typeId'));

                filterTypes.push(typeId);

                if (
                    typeId === C.EventType.Viewing &&
                    $layer.find('.box-toggle.viewing:not(.master)').length > 0
                ) {
                    if (
                        $layer.find('.box-toggle.on.viewing:not(.master)')
                            .length > 0
                    ) {
                        me.viewingSubTypes = [];

                        $layer
                            .find('.box-toggle.on.viewing:not(.master)')
                            .each(function (i, v) {
                                var viewingTypeId = parseInt(
                                    $(v).attr('data-typeId')
                                );
                                me.viewingSubTypes.push(viewingTypeId);
                            });
                    } else if (!me.viewingSubTypes) {
                        me.viewingSubTypes = [
                            C.ViewingTimelineFilterType.Cancelled,
                            C.ViewingTimelineFilterType.Confirmed,
                            C.ViewingTimelineFilterType.Unconfirmed
                        ];
                    }
                }
            });

        if ($layer.find('.box-toggle.viewing:not(.master)').length > 0) {
            if ($layer.find('.box-toggle.on.viewing:not(.master)').length > 0) {
                me.viewingSubTypes = [];

                $layer
                    .find('.box-toggle.on.viewing:not(.master)')
                    .each(function (i, v) {
                        var viewingTypeId = parseInt($(v).attr('data-typeId'));
                        me.viewingSubTypes.push(viewingTypeId);
                    });
            } else if (me.viewingSubTypes.length === 0) {
                me.viewingSubTypes = [
                    C.ViewingTimelineFilterType.Cancelled,
                    C.ViewingTimelineFilterType.Confirmed,
                    C.ViewingTimelineFilterType.Unconfirmed
                ];
            }
        }

        me.eventTypes = filterTypes;
        me.allFiltersSelected = filterTypes.length === totalFilterCount;

        return {
            eventTypes: filterTypes,
            viewingSubTypes: me.viewingSubTypes
        };
    },

    setStepThroughTimeLineFilterState: function () {
        var me = this;

        if (me.cfg.initialTimelineFilters) {
            var $this = me.$root.find('.tag-history');

            $this
                .find('.box-toggles[data-type="property"] .box-toggle')
                .removeClass('on bg-property mixed');

            var $mainToggles = $this.find(
                '.box-toggles[data-type="property"]:not(.viewing)'
            );

            var $masterToggle = $mainToggles.find('.box-toggle.master');

            $.each(me.cfg.initialTimelineFilters.eventTypes, function (i, v) {
                $mainToggles
                    .find('.box-toggle[data-typeid="{0}"]'.format(v))
                    .addClass('on bg-property');
            });

            var toggleCount = $mainToggles.find('.box-toggle').length - 1; // ignoring master toggle

            var toggleOnCount = me.cfg.initialTimelineFilters.eventTypes.length;

            if (toggleCount === toggleOnCount) {
                $masterToggle.addClass('on bg-property');
            } else if (toggleOnCount < toggleCount && toggleOnCount > 0) {
                $masterToggle.addClass('mixed');
            }

            var $viewingToggles = $this.find('.box-toggles.viewing');

            if ($viewingToggles.length > 0) {
                $.each(
                    me.cfg.initialTimelineFilters.viewingSubTypes,
                    function (i, v) {
                        $viewingToggles
                            .find('.box-toggle[data-typeid="{0}"]'.format(v))
                            .addClass('on bg-property');
                    }
                );
            } else {
                me.viewingSubTypes =
                    me.cfg.initialTimelineFilters.viewingSubTypes;
            }
        }
    },


    printTimeline: function () {
        var me = this;

        me.layers.load("timeline", "common")
            .then(function () {
                me.getEventSearchFilters();
            })
            .then(function () {
                if (
                    me.eventTypes == null ||
                    me.eventTypes.length == 0
                ) {
                    $.jGrowl(
                        'At least one timeline filter must be set in order to print the timeline.',
                        {
                            header: 'Print Timeline',
                            theme: 'growl-system',
                            life: 3000
                        }
                    );
                    return;
                }

                var args = {
                    search: {
                        PropertyId: me.id,
                        ContextModelType: C.ModelType.Property,
                        SearchOrder: {
                            By: C.SearchOrderBy.StartDate,
                            Type: C.SearchOrderType.Descending
                        }
                    },
                    settings: {
                        TimeLineFilters: me.eventTypes,
                        ViewingTimeLineFilters: me.viewingSubTypes,
                        AllTimeLineFiltersSelected:
                            me.allFiltersSelected
                    }
                };

                var $form = gmgps.cloud.utility.buildForm(
                    'Property/PrintTimeline',
                    args
                );

                $form.submit();
                $form.remove();
            });
    },
    refreshTimeline: function (page) {
        var me = this;
        var $c = me.$root.find(
            '.layer[data-id="timeline"] .timeline-list-container'
        );

        //Get the event filters.
        var eventFilters = me.getEventSearchFilters();

        if (eventFilters.eventTypes.length === 0) {
            $c.empty();
            return;
        }

        if (me.outstandingTimelineRequest) {
            me.outstandingTimelineRequest.abort();
            delete me.outstandingTimelineRequest;
        }

        if (
            eventFilters.eventTypes.length === 1 &&
            eventFilters.eventTypes[0] === C.TimeLineFilterType.Viewing
        ) {
            if (!me.notesOrFeedback) {
                me.notesOrFeedback =
                    me.toggleNotesBehaviour.getSelectedMode($c);
            }

            //Get viewing timeline.
            var containerDoesNotContainViewingTimeline =
                !$c.find('.viewing').length;

            if (containerDoesNotContainViewingTimeline) {
                $c.empty();
            }

            me.outstandingTimelineRequest = me.http
                .ajax(
                    {
                        args: {
                            search: {
                                PropertyId: me.id,
                                ContextModelType: C.ModelType.Property,
                                SearchPage: {
                                    Index: page,
                                    Size: 25
                                },
                                SearchOrder: {
                                    By: me.orderBy,
                                    Type: me.orderType
                                }
                            },
                            settings: {
                                ShowFooter: true,
                                TimeLineFilters: eventFilters.eventTypes,
                                ViewingTimeLineFilters:
                                    eventFilters.viewingSubTypes,
                                NotesOrFeedback: me.notesOrFeedback
                            }
                        },
                        complex: true,
                        dataType: 'json',
                        type: 'post',
                        url: '/Diary/GetViewingTimeline',
                        listType: C.ListType.Standard
                    },
                    function (response) {
                        $c.html(response.Data);
                    }
                )
                .done(function () {
                    delete me.outstandingTimelineRequest;
                });
        } else {
            //Get timeline.
            me.outstandingTimelineRequest = me.http
                .ajax(
                    {
                        args: {
                            search: {
                                PropertyId: me.id,
                                TimelineSearchType: C.EventSearchType.TimelineFull,
                                ContextModelType: C.ModelType.Property,
                                SearchPage: {
                                    Index: page,
                                    Size: 25
                                },
                                SearchOrder: {
                                    By: C.SearchOrderBy.Created,
                                    Type: C.SearchOrderType.Descending
                                }
                            },
                            settings: {
                                ShowFooter: true,
                                TimeLineFilters: eventFilters.eventTypes
                            }
                        },
                        complex: true,
                        dataType: 'json',
                        type: 'post',
                        url: '/Timelines/Property',
                        listType: C.ListType.Standard
                    },
                    function (response) {
                        $c.html(response.Data);
                    }
                )
                .done(function () {
                    delete me.outstandingTimelineRequest;
                });
        }
    },

    printTransactions: function (orderByCreateDate) {
        var me = this;

        me.layers.load('transactions')
            .then(function ($layers) {
                new gmgps.cloud.ui.views.transactionsHandler({
                    $root: $layers[0].find('.transactions'),
                    linkedId: me.id,
                    linkedTypeId: C.ModelType.Property
                }).printTransactions(orderByCreateDate);
            });
    },

    refreshTransactions: function () {
        var me = this,
            pageIndex = 1;
        var recordType = me.$root.find('#Property_RecordTypeId');
        if (recordType.asNumber() === C.PropertyRecordType.Rent) {
            if (recordType.is('select')) {
                var txt = recordType.siblings('.select-text');
                if (txt.length === 0) {
                    recordType.hide();
                    if (recordType.hasClass('is-customised')) {
                        recordType.siblings('.customStyleSelectBox').hide();
                    }
                    recordType.after(
                        '<label class="select-text">{0}</label>'.format(
                            recordType.find('option:selected').text()
                        )
                    );
                }
            }
        }

        if (me.views.transactions) {
            me.views.transactions.updatePageIndex(pageIndex);
            return me.views.transactions.renderTransactions(pageIndex);
        }
    },

    refreshTenancies: function () {
        var me = this;
        var $c = me.$root.find('.layer[data-id=tenancy]');
        if ($c.length > 0) {
            return new gmgps.cloud.http(
                "propertydetails-refreshTenancies"
            ).ajax(
                {
                    args: {
                        Id: me.id,
                        Name: 'tenancies'
                    },
                    complex: true,
                    background: true,
                    dataType: 'json',
                    type: 'post',
                    url: '/Property/GetPropertyLayer'
                },
                function (response) {
                    var $newHtml = $(response.Data);
                    if (
                        me.id ===
                        parseInt(
                            $newHtml
                                .find('.opt-u-parent')
                                .data('contextlinkedid'),
                            10
                        )
                    ) {
                        //make sure response is same as current property and replace data
                        $c.empty().html($newHtml);
                        me.initLayer($c);
                    }
                }
            );
        }
    },

    initUploader: function (type) {
        var me = this;
        var maxFileSize, filters;
        var branchId, entityId;

        branchId = me.$root.find('#Property_BranchId').val();
        entityId = me.id;

        var optimisationMode = me.$root
            .find('#PublisherOptimisationMode')
            .val();

        var screenSize = {
            width: 1920,
            height: 1080,
            quality: 90,
            crop: false,
            enabled: true,
            preserve_headers: true
        };
        var printSize = {
            width: 7016,
            height: 7016,
            quality: 90,
            crop: false,
            enabled: true,
            preserve_headers: true
        };

        switch (type) {
            case 'photo':
                maxFileSize = '50mb';
                filters = [
                    { title: 'Image files', extensions: 'jpg,gif,png,jpeg' }
                ];
                break;
            case 'floorplan':
                maxFileSize = '50mb';
                filters = [
                    {
                        title: 'Floorplans',
                        extensions: 'jpg,gif,png,pdf, doc, docx,jpeg'
                    }
                ];
                break;
            case 'virtualTour':
                maxFileSize = '50mb';
                filters = [
                    { title: 'Virtual Tours', extensions: 'jpg,gif,png,jpeg' }
                ];
                break;
            case 'file':
                maxFileSize = '50mb';
                filters = [
                    {
                        title: 'Files',
                        extensions:
                            'jpg,gif,png,doc,docx,txt,rtf,pdf,xls,xlsx,xlw,wma,mp4,mp3,jpeg,msg'
                    }
                ];
                break;
            case 'public-brochure':
                maxFileSize = '50mb';
                filters = [{ title: 'Brochure PDFs', extensions: 'pdf' }];
                break;
            case 'epc':
                maxFileSize = '50mb';
                filters = [
                    {
                        title: 'EPC documents',
                        extensions: 'jpg,gif,png,pdf,rtf,doc,docx,txt,jpeg'
                    }
                ];
                break;
        }

        var configureUploader = function (modelTypeId, mediaTypeId, thisType) {
            var thisUploader = me.$root
                .find('.uploader[data-type="' + thisType + '"]')
                .pluploadQueue();

            thisUploader.settings.resize =
                optimisationMode == C.PublisherOptimisationMode.Print
                    ? printSize
                    : screenSize;

            thisUploader.settings.multipart_params = {
                modelTypeId: modelTypeId,
                mediaTypeId: mediaTypeId,
                branchId: branchId,
                entityId: entityId
            };

            thisUploader.bind('BeforeUpload', function (uploader, file) {
                thisUploader.settings.multipart_params.originalFileName =
                    file.name;

                var $btn = me.$root.find(
                    '.upload-open-button[data-type="' + thisType + '"]'
                );
                $btn.text('Uploading...').addClass('disabled');

                //Don't allow any UI interaction whilst a file is uploaded (ALT-2553)
                glass(true);
            });

            thisUploader.bind('FilesAdded', function (uploader, files) {
                $.jGrowl(files.length + ' file(s) queued for upload', {
                    theme: 'growl-system',
                    header: 'Media Uploader'
                });

                if (type == 'photo') {
                    var warnings = new Array();
                    var oneMeg = 1048576;
                    var softLimitPerFile = oneMeg * 10;
                    var softLimitTotal = oneMeg * 50;
                    var totalSize = 0;
                    for (var i = 0; i < files.length; i++) {
                        var file = files[i];
                        totalSize += file.size;

                        if (file.size > softLimitPerFile) {
                            warnings.push([file.name, file.size]);
                        }
                    }

                    var message = '';
                    if (totalSize > softLimitTotal) {
                        message +=
                            '<p>The total size of the files you are about to upload is quite large and may take some time.</p>';
                    }

                    if (warnings.length > 0) {
                        message +=
                            '<p>The following files are quite large and may take some time to upload.</p>';
                        for (var j = 0; j < warnings.length; j++) {
                            message +=
                                '<p>File ' +
                                warnings[j][0] +
                                ' is ' +
                                Math.round(warnings[j][1] / 1024) +
                                'Kb</p>';
                        }
                    }

                    if (message.length > 0) {
                        showInfo(message, 'Large files warning');
                    }
                }
            });

            thisUploader.bind('FileUploaded', function (uploader, file, info) {
                if (!me.setDirty(true)) {
                    return false;
                }

                if (info.status !== 200) {
                    var $info = $.parseJSON(info.response);

                    if ($info.error) {
                        file.status = 4; // set pl upload STATUS.FAILED so we can exclude from completed successfully count
                        $.jGrowl($info.error, {
                            header: 'Error uploading a file',
                            theme: 'growl-contact',
                            sticky: true
                        });
                        return void 0;
                    }
                }

                //need to set orderIndex and webOrderIndex hidden fields and mixItUp attribute to ensure appended to end
                //we could just get a simple count, however if an item has been deleted the count will be less than max index
                //we do reindex on delete but only for one order mode, this ensures we get the true next number
                var brochureIndexes = $(
                    me.$root.find('.' + thisType + 's' + ' .' + thisType)
                )
                    .map(function () {
                        return (
                            parseFloat(
                                this.getAttribute('data-brochureorder')
                            ) || 0
                        );
                    })
                    .toArray();

                var maxBrochureIndex = Math.max.apply(Math, brochureIndexes);

                //we don't know after deleteions which order index has the highest value remaining
                var webIndexes = $(
                    me.$root.find('.' + thisType + 's' + ' .' + thisType)
                )
                    .map(function () {
                        return (
                            parseFloat(this.getAttribute('data-weborder')) || 0
                        );
                    })
                    .toArray();

                var maxWebIndex = Math.max.apply(Math, webIndexes);

                var nextIndex = Math.max(maxBrochureIndex, maxWebIndex, 0) + 1;

                var $html = $(info.response);
                $html.find('input.order-Index').val(nextIndex);
                $html.attr('data-brochureorder', nextIndex);
                $html.find('input.web-Order-Index').val(nextIndex);
                $html.attr('data-weborder', nextIndex);

                me.$root.find('.' + thisType + 's').append($html);

                me.initSortableMedia();
            });

            thisUploader.bind('UploadComplete', function (uploader, files) {
                //Destroy the uploader.
                me.$root
                    .find('.uploader[data-type="' + thisType + '"]')
                    .clear();

                var successCount = 0;

                $.each(files, function (index, file) {
                    if (file.status !== 4) {
                        successCount++;
                    }
                });

                $.jGrowl(successCount + ' file(s) uploaded.', {
                    theme: 'growl-system'
                });

                var $btn = me.$root.find(
                    '.upload-open-button[data-type="' + thisType + '"]'
                );

                if ($btn.hasClass('on')) {
                    $btn.text('Choose File(s)')
                        .removeClass('disabled')
                        .trigger('click');
                }

                //Re-enable UI interaction now that the upload is complete.
                glass(false);
            });

            thisUploader.bind('Error'),
                function () {
                    //Re-enable UI interaction now that the upload is complete.
                    glass(false);
                };

            thisUploader.bind('QueueChanged', function () { });

            return thisUploader;
        };

        //Create uploader
        me.$root.find('.uploader[data-type="' + type + '"]').pluploadQueue({
            runtimes: 'html5,flash,silverlight,html4',
            url: '/Upload/AcceptFile',
            max_file_size: maxFileSize,
            unique_names: true,
            resize: screenSize,
            filters: filters,
            flash_swf_url: '/scripts/jquery/plugins/plupload/moxie.swf',
            silverlight_xap_url: '/scripts/jquery/plugins/plupload/moxie.xap'
        });

        switch (type) {
            case 'photo':
                me.photoUploader = configureUploader(
                    C.ModelType.Property,
                    C.MediaType.Photo,
                    type
                );
                break;
            case 'floorplan':
                me.floorplanUploader = configureUploader(
                    C.ModelType.Property,
                    C.MediaType.Floorplan,
                    type
                );
                break;
            case 'virtualTour':
                me.virtualTourUploader = configureUploader(
                    C.ModelType.Property,
                    C.MediaType.VirtualTour,
                    type
                );
                break;
            case 'file':
                me.fileUploader = configureUploader(
                    C.ModelType.Property,
                    C.MediaType.File,
                    type
                );
                break;
            case 'public-brochure':
                me.fileUploader = configureUploader(
                    C.ModelType.Property,
                    C.MediaType.Brochure,
                    type
                );
                break;
            case 'epc':
                me.fileUploader = configureUploader(
                    C.ModelType.Property,
                    C.MediaType.EPC,
                    type
                );
                break;
        }

        /*
        me.photoUploader.bind('UploadFile', function (uploader, file) { });
        me.photoUploader.bind('UploadProgress', function (uploader, file) { });
        me.photoUploader.bind('FilesRemoved', function (uploader, files) { });
        me.photoUploader.bind('Init', function (uploader) { });
        me.photoUploader.bind('PostInit', function (uploader) { });
        me.photoUploader.bind('QueueChanged', function (uploader) { });
        me.photoUploader.bind('Refresh', function (uploader) { });
        me.photoUploader.bind('StateChanged', function (uploader) { });
        me.photoUploader.bind('ChunkUploaded', function (uploader, file, response) { });
        me.photoUploader.bind('Destroy', function (uploader) { });
        me.photoUploader.bind('Error', function (uploader, error) { });
        */
    },

    applyMainPhotoLabel: function () {
        var me = this;

        var $photos = me.$root.find('.layer[data-id="media"] .photos');
        $photos.find('.main-label').remove();

        var firstBrochurePhoto;
        switch (me.photoSortMode) {
            case C.PhotoOrder.Brochure:
                firstBrochurePhoto = $photos.find(
                    '.photo[data-brochureorder=1]'
                );
                break;
            case C.PhotoOrder.Web:
                firstBrochurePhoto = $photos.find('.photo[data-weborder=1]');
                break;
            default:
                firstBrochurePhoto = null;
                break;
        }

        if (!firstBrochurePhoto)
            firstBrochurePhoto = $photos.find('.photo:first'); //incase they are not indexed for whatever reason
        if (!firstBrochurePhoto) return;

        firstBrochurePhoto.append('<div class="main-label">Main Photo</div>');
    },

    getPropertyAddress: function () {
        var me = this;
        return {
            subDwelling: $.trim(
                me.$root.find('#Property_Address_SubDwelling').val()
            ),
            nameNo: $.trim(me.$root.find('#Property_Address_NameNo').val()),
            street: $.trim(me.$root.find('#Property_Address_Street').val()),
            locality: $.trim(me.$root.find('#Property_Address_Locality').val()),
            town: $.trim(me.$root.find('#Property_Address_Town').val()),
            county: $.trim(me.$root.find('#Property_Address_County').val()),
            postcode: $.trim(me.$root.find('#Property_Address_Postcode').val()),
            countryCode: $.trim(
                me.$root.find('#Property_Address_CountryCode').val()
            )
        };
    },

    applyCustomBrochureLabel: function () {
        var me = this;

        var $items = me.$root.find('.layer[data-id="media"] .public-brochures');
        $items.find('.custom-brochure').css('display', 'none');

        var $item = $items.find('.public-brochure .brochure:checked:first');
        if ($item.length === 1) {
            $item
                .closest('li')
                .find('.custom-brochure')
                .css('display', 'block');
        }
    },

    queueMatchCountUpdate: function (args) {
        var me = this;

        // Cancel any pending request.
        if (me.matchCountTimeout) {
            clearTimeout(me.matchCountTimeout);
        }

        if (me.matchListTabsTimeout) {
            clearTimeout(me.matchListTabsTimeout);
        }

        // Schedule request.
        me.matchCountTimeout = setTimeout(function () {
            me.getMatches(args);
            clearTimeout(me.matchCountTimeout);
            me.matchCountTimeout = null;
        }, 500);
    },

    getRecordTypeDescription: function (recordTypeId) {
        var desc;

        switch (recordTypeId) {
            case C.PropertyRecordType.Sale:
                desc = 'Sale';
                break;
            case C.PropertyRecordType.Rent:
                desc = 'Rent';
                break;
        }

        return desc;
    },

    getOwnerDescription: function (recordTypeId) {
        var desc;

        switch (recordTypeId) {
            case C.PropertyRecordType.Sale:
                desc = 'Vendor';
                break;
            case C.PropertyRecordType.Rent:
                desc = 'Landlord';
                break;
        }

        return desc;
    },

    updateMARentalPriceAutoLabels: function () {
        var me = this;

        var recordTypeId = me.getRecordTypeId();
        if (recordTypeId != C.PropertyRecordType.Rent) {
            return false;
        }
        var currencySymbol = me.$root.find('#CurrencySymbol').val();

        var freq = parseInt(
            me.$root.find('#Property_PropertyRental_RentalFrequency').val()
        );
        var dstFreq;
        var priceLow = me.$root
            .find('#MarketAppraisalViewModel_Valuation_LowerRent')
            .asNumber();
        var priceHigh = me.$root
            .find('#MarketAppraisalViewModel_Valuation_UpperRent')
            .asNumber();
        var priceOwner = me.$root
            .find('#MarketAppraisalViewModel_Valuation_OwnerRent')
            .asNumber();
        var priceProposed = me.$root
            .find('#MarketAppraisalViewModel_Valuation_ProposedRent')
            .asNumber();
        var suffix = '';

        //Depending on the currently selected frequency, convert the inputted prices into the most useful alternative, for display.
        switch (freq) {
            case C.Frequency.Weekly:
                //Display monthly.
                dstFreq = C.Frequency.Monthly;
                suffix = 'per month';
                break;
            case C.Frequency.Monthly:
                //Display weekly.
                dstFreq = C.Frequency.Weekly;
                suffix = 'per week';
                break;
            case C.Frequency.Quarterly:
                //Display yearly
                dstFreq = C.Frequency.Yearly;
                suffix = 'per annum';
                break;
            case C.Frequency.Yearly:
                //Display Quarterly.
                dstFreq = C.Frequency.Quarterly;
                suffix = 'per quarter';
                break;
        }

        //Perform the conversions.
        priceLow = gmgps.cloud.helpers.general.convertFreqAmount(
            freq,
            dstFreq,
            priceLow,
            0
        );
        priceHigh = gmgps.cloud.helpers.general.convertFreqAmount(
            freq,
            dstFreq,
            priceHigh,
            0
        );
        priceOwner = gmgps.cloud.helpers.general.convertFreqAmount(
            freq,
            dstFreq,
            priceOwner,
            0
        );
        priceProposed = gmgps.cloud.helpers.general.convertFreqAmount(
            freq,
            dstFreq,
            priceProposed,
            0
        );

        me.$root.find('#AutoLowerRent').text(
            priceLow == 0
                ? ''
                : '(' +
                $.formatNumber(priceLow, {
                    format: '{0}#,###'.format(currencySymbol),
                    locale: 'gb'
                }) +
                ' ' +
                suffix +
                ')'
        );
        me.$root.find('#AutoUpperRent').text(
            priceHigh == 0
                ? ''
                : '(' +
                $.formatNumber(priceHigh, {
                    format: '{0}#,###'.format(currencySymbol),
                    locale: 'gb'
                }) +
                ' ' +
                suffix +
                ')'
        );
        me.$root.find('#AutoOwnerRent').text(
            priceOwner == 0
                ? ''
                : '(' +
                $.formatNumber(priceOwner, {
                    format: '{0}#,###'.format(currencySymbol),
                    locale: 'gb'
                }) +
                ' ' +
                suffix +
                ')'
        );
        me.$root.find('#AutoProposedRent').text(
            priceProposed == 0
                ? ''
                : '(' +
                $.formatNumber(priceProposed, {
                    format: '{0}#,###'.format(currencySymbol),
                    locale: 'gb'
                }) +
                ' ' +
                suffix +
                ')'
        );
    },

    setRecordType: function (recordTypeId) {
        var me = this;

        me.$root
            .find('a[href="#owner-tab"]')
            .text(me.getOwnerDescription(recordTypeId));

        me.$root.find('#RecordTypeId').val(recordTypeId);

        switch (recordTypeId) {
            case C.PropertyRecordType.Sale:
                me.$root.find('.sale-specific').show();
                me.$root.find('.rent-specific').hide();
                break;
            case C.PropertyRecordType.Rent:
                me.$root.find('.sale-specific').hide();
                me.$root.find('.rent-specific').show();
                me.setPropertyTenancyFields();
                break;
        }
    },

    setMapMode: function (mode) {
        var me = this;

        if (mode == 'map') {
            me.$root.find('.update-map-pos-button-container').show();
            me.$root.find('.open-streetview-button-container').show();
            me.$root.find('.update-streetview-pos-button-container').hide();
            me.$root.find('.close-streetview-button-container').hide();
            me.$root.find('.map').show();
            me.$root.find('.streetview').hide();
        } else {
            me.$root.find('.update-map-pos-button-container').hide();
            me.$root.find('.open-streetview-button-container').hide();
            me.$root.find('.update-streetview-pos-button-container').show();
            me.$root.find('.close-streetview-button-container').show();
            me.$root.find('.map').hide();
            me.$root.find('.streetview').show();
        }
    },

    deletePhoto: function ($item) {
        var me = this;

        if (!me.setDirty(true)) {
            return false;
        }

        //Remove any roommedia items that referenced this photo.
        var mediaId = parseInt($item.attr('data-id'));
        me.$root
            .find(
                '.roommedias .roommedia .roommedia-mediaid[value="{0}"]'.format(
                    mediaId
                )
            )
            .each(function (index, value) {
                var $roomMedias = $(value).closest('.roommedias');
                $(value).closest('.roommedia').remove();

                //If sibling roommedias remain, set the thumb to be the first one; else set the "Link Photos" image.
                if ($roomMedias.children().length > 0) {
                    var newMediaId = $roomMedias
                        .find('.roommedia:first')
                        .find('.roommedia-mediaid')
                        .val();

                    var src = me.$root
                        .find(
                            '.photos .photo[data-id="{0}"] img'.format(
                                newMediaId
                            )
                        )
                        .attr('src');
                    if (src == undefined) {
                        $roomMedias
                            .closest('.room')
                            .find('.photo-preview img')
                            .attr(
                                'src',
                                '/content/media/images/gui/common/backgrounds/choose.photo.png'
                            )
                            .show();
                    } else {
                        $roomMedias
                            .closest('.room')
                            .find('.photo-preview img')
                            .attr('src', src);
                    }
                } else {
                    $roomMedias
                        .closest('.room')
                        .find('.photo-preview img')
                        .attr(
                            'src',
                            '/content/media/images/gui/common/backgrounds/choose.photo.png'
                        )
                        .show();
                }
            });

        $item.remove();

        me.reindexPhotoOrder();
    },

    createRoom: function (roomRecordType) {
        var me = this;

        var $rooms = me.$root.find('.rooms');

        var onComplete = function ($newRoom) {
            if (!me.setDirty(true)) {
                return false;
            }

            //Add the new room.
            $rooms.find('.rooms .room').removeClass('selected');
            $rooms.append($newRoom).show();
            $newRoom.find('.header').trigger('click');
            $rooms
                .closest('.scrollable')
                .animate({ scrollTop: $newRoom.offset().top - 195 }, 500);

            setTimeout(function () {
                $newRoom.find('.name').focus();
            }, 100);

            me.initSortableRooms();
        };

        if (roomRecordType == C.RoomRecordType.Room) {
            new gmgps.cloud.http("propertydetails-createRoom").ajax(
                {
                    args: {},
                    dataType: 'json',
                    type: 'post',
                    url: '/Property/GetNewRoomHtml'
                },
                function (response) {
                    onComplete($(response.Data));
                }
            );
        } else {
            //Clone the room template.
            var $para = me.$root.find('.paragraph-template').find('li').clone();

            onComplete($para);
        }
    },

    deleteRoom: function ($item) {
        var me = this;

        if (!me.setDirty(true)) {
            return false;
        }

        $item.remove();
    },

    setDirty: function (isDirty, target) {
        //Set the Dirty flag on this object and in the dom.
        var me = this;

        if (
            me.cfg.dirtyLimitCheckCallback &&
            !me.cfg.dirtyLimitCheckCallback()
        ) {
            return false;
        }

        if (target) {
            var found = false;
            var $tabContainer = $(target.currentTarget).closest(
                '.content.ui-tabs-panel[data-tabupdateenabled="true"]'
            );

            if ($tabContainer.length == 1) {
                if (isDirty) {
                    $tabContainer.attr('data-istabdirty', true);
                } else {
                    $tabContainer.attr('data-istabdirty', false);
                }

                found = true;
            }

            if (!found) {
                var $layerContainer = $(target.currentTarget).closest(
                    '.layer[data-layerupdateenabled="true"]'
                );

                if ($layerContainer.length == 1) {
                    if (isDirty) {
                        $layerContainer.attr('data-islayerdirty', true);
                    } else {
                        $layerContainer.attr('data-islayerdirty', false);
                    }

                    found = true;
                }
            }
        }
        if (isDirty && !me.isDirty) {
            me.$root.find('#IsDirty').val('True');
            me.isDirty = true;
            me.onChanged.raise();
        }

        if (!isDirty && me.isDirty) {
            me.$root.find('#IsDirty').val('False');
            me.isDirty = false;
            
            // Transition address UI to preview mode after successful save
            if (me.propertyAddressManager && me.propertyAddressManager.useNewAddressUi) {
                me.propertyAddressManager.showPreview();
            }
        }

        return true;
    },

    setMADirty: function (isDirty) {
        //Set the MA Dirty flag on this object and in the dom.
        // - Upon saving the property, if this flag is true, then the Market Appraisal is also saved, else it is not.
        // - This function does not raise the onChanged event, because it will be raised by setDirty already, which is
        //   also called via handlers which are listening over the entire form.
        var me = this;

        if (isDirty && !me.isMADirty) {
            me.$root.find('#IsMADirty').val('True');
            me.isMADirty = true;
        }

        if (!isDirty && me.isMADirty) {
            me.$root.find('#IsMADirty').val('False');
            me.isMADirty = false;
        }
    },

    setEPCMarker: function ($marker, value) {
        var scales = [
            [92, 199],
            [81, 91],
            [69, 80],
            [55, 68],
            [39, 54],
            [21, 38],
            [0, 20]
        ];
        var coloursEE = [
            '#007E2D',
            '#2C9F29',
            '#A1D20E',
            '#F8F400',
            '#F1C300',
            '#E77C17',
            '#DF0024'
        ];
        var coloursEI = [
            '#CDE3F4',
            '#97C0E6',
            '#73A2D6',
            '#4E84C4',
            '#A5A6A9',
            '#919194',
            '#807F83'
        ];
        var coloursInk = [
            '#fff',
            '#fff',
            '#fff',
            '#444',
            '#fff',
            '#fff',
            '#fff'
        ];
        var band = 0;

        if (!isNaN(value) && value >= 0 && value <= 199) {
            $marker.show();

            for (var i = 0; i < scales.length; i++) {
                if (value >= scales[i][0] && value <= scales[i][1]) {
                    band = i;
                    break;
                }
            }

            var lower = scales[band][0];
            var upper = scales[band][1];
            var scale = upper - lower;
            var perPixel = 26 / scale;

            var y = parseInt(band * 30 + 26);
            var extra = perPixel * (value - scales[band][0]);
            y = y - extra;

            //Update arrow.
            var colours =
                $marker.attr('data-type') == 'EE' ? coloursEE : coloursEI;
            $marker
                .css('background-color', colours[band])
                .css('color', coloursInk[band])
                .css('top', y)
                .html(value);
        } else {
            $marker.hide();
        }
    },

    loadLayer: function (name) {
        var me = this;

        return me.layers.load(name);
    },

    showDetailLayer: function (args) {
        var me = this;

        //Store the selected layer name (unless it is the uploader layer - we don't care about that one).
        if (args.id != 'upload') {
            me.selectedLayer = args.id;
        }


        var onLoaded = function (id) {
            me.callOnComplete(true);

            if (args.subTab) {
                me.$root.find('div[data-id="' + id + '"] a[data-route-value-tab="' + args.subTab + '"]').trigger('click');
                // TEMP for gradual introduction of fourth-level routing, otherwise previously selected tab not re-selected
                me.$root.find('div[data-id="' + id + '"] a[href="' + args.subTab + '"]').trigger('click');
            }

            switch (id) {
                case 'propertyinfo':
                    me.wireUpPropertyLeaseSharedOwnershipChangeEvent();

                    me.initDepositChecks();

                    // Initialize AddressUIStateManager for Property Details
                    me.propertyAddressManager = new gmgps.cloud.ui.controls.AddressUIStateManager('[data-address-type="property-details"]');

                    // Initialize PostcodePicker with AddressUIStateManager integration
                    me.postcodePicker = new gmgps.cloud.ui.controls.PostcodePicker({
                        eventSource: me.propertyAddressManager.getContainer(),
                        populateFieldsFromFoundAddress: function () {
                            me.propertyAddressManager.populateFieldsFromFoundAddress();
                            
                            // Add property-specific geolocation check trigger
                            var $nameNo = me.$root.find('#Property_Address_NameNo');
                            if ($nameNo.length) {
                                var $e = jQuery.Event('keyup', { keyCode: 64 });
                                $nameNo.trigger($e);
                            }
                        },
                        showNewDropdownCallback: function($postcode, addresses) {
                            me.propertyAddressManager.showNewAddressDropdown($postcode, addresses);
                        },
                        clearNewDropdownCallback: function() {
                            me.propertyAddressManager.clearNewAddressDropdown();
                        }
                    });
                    me.postcodePicker.includeCounty = false;

                    // NTS Checks
                    me.applyTaxBandNTSValidation();

                    me.showWarningIfFieldNotNumericalOnly(me.$root.find('#Property_PropertyLease_GroundRentValue'));
                    me.showWarningIfFieldNotNumericalOnly(me.$root.find('#Property_PropertyLease_ServiceChargeValue'));
                    me.wireUpDropdownElementTextNTSWarnings(me.$root.find('#Property_PropertySale_PriceQualifierId'), me.$root.find('#property-sale-qualifier-warning'), ['poa', 'price on application']);
                    me.wireUpDropdownElementTextNTSWarnings(me.$root.find('#Property_PropertyRental_PriceTypeId'), me.$root.find('#property-rent-qualifier-warning'), ['poa', 'price on application']);
                    me.wireUpDropdownElementValueNTSWarnings(me.$root.find('#Property_PropertySale_TenureId'), me.$root.find('#property-sale-tenure-ff-info'), [C.TenureType.FlyingFreehold]);
                    me.applyTenureNTSValidation();
                    me.wireUpNTSContentEvents();

                    break;

                case 'details':
                    if (me.layers.isConfigured(id) === false) {
                        //Iterate rooms
                        me.$root
                            .find('.rooms .room')
                            .each(function (roomIndex, room) {
                                var $roomMedias = $(this)
                                    .closest('.room')
                                    .find('.roommedias .roommedia');

                                //Display the roommedias +count if more than one photo assigned to this room.
                                if ($roomMedias.length > 1) {
                                    $(room)
                                        .find('.count')
                                        .show()
                                        .html('+' + ($roomMedias.length - 1));
                                }

                                //If there is at least one photo assigned to this room, use the first available image as the thumb.
                                if ($roomMedias.length != 0) {
                                    var mediaId = $roomMedias
                                        .first()
                                        .find('.roommedia-mediaid')
                                        .val();
                                    var src = me.$root
                                        .find(
                                            '.photos .photo[data-id="' +
                                            mediaId +
                                            '"] img'
                                        )
                                        .attr('src');
                                    $(room)
                                        .find('.photo-preview img')
                                        .attr('src', src);
                                }
                            });
                    }

                    break;

                case 'digitalmaps':
                    me.showMapLayer(
                        me.layers.isConfigured(id) === true,
                        function () {
                            me.layers.setConfigured(id);
                        }
                    );
                    break;

                case 'marketappraisal':
                    if (me.layers.isConfigured(id) === false) {
                        //me.getMarketAppraisal();                        
                        me.layers.setConfigured(id);
                    }

                    if (me.$root.find('#IsAtAppraisalStage').val() == 'True') {
                        me.maShift();
                        
                        // Initialize AddressUIStateManager for Market Appraisal (after maShift moves the address section)
                        me.propertyAddressManager = new gmgps.cloud.ui.controls.AddressUIStateManager('[data-address-type="property-details"]');
                        
                        // Initialize PostcodePicker with AddressUIStateManager integration
                        me.postcodePicker = new gmgps.cloud.ui.controls.PostcodePicker({
                            eventSource: me.propertyAddressManager.getContainer(),
                            populateFieldsFromFoundAddress: function () {
                                me.propertyAddressManager.populateFieldsFromFoundAddress();
                                
                                // Add property-specific geolocation check trigger
                                var $nameNo = me.$root.find('#Property_Address_NameNo');
                                if ($nameNo.length) {
                                    var $e = jQuery.Event('keyup', { keyCode: 64 });
                                    $nameNo.trigger($e);
                                }
                            },
                            showNewDropdownCallback: function($postcode, addresses) {
                                me.propertyAddressManager.showNewAddressDropdown($postcode, addresses);
                            },
                            clearNewDropdownCallback: function() {
                                me.propertyAddressManager.clearNewAddressDropdown();
                            }
                        });
                        me.postcodePicker.includeCounty = false;

                        me.setPropertyTenancyFields();
                    }
                    break;

                case 'matches':

                    if (me.savedMatchListManager) {
                        me.savedMatchListManager.activate();
                    }

                    //Get matching contacts for this property.
                    if (me.layers.isConfigured(id) === false) {
                        me.queueMatchCountUpdate(false);
                        me.layers.setConfigured(id);
                    }

                    me.$root.find('.accordion').accordion('refresh');
                    break;

                case 'media':
                    //Assign linked rooms
                    me.$root.find('.photos .photo').each(function (index, value) {
                        var mediaId = $(value).attr('data-id');

                        //Find this mediaId in the rooms list (use :first, but there should only be one!).
                        var roomId = me.$root
                            .find(
                                '.roommedia-mediaid[value="' + mediaId + '"]:first'
                            )
                            .closest('.room')
                            .attr('data-id');
                        if (roomId != undefined) {
                            //This photo is being referenced by a room.  Store it in the photo in case it is flipped.
                            $(value).attr('data-roomid', roomId);
                        }
                    });

                    me.setupUploader();

                    //Apply main label on photos.
                    me.applyMainPhotoLabel();

                    // Show label on any custom brochure set in Files media section
                    me.applyCustomBrochureLabel();
                    me.mixItUpInitialise();

                    me.layers.setConfigured(id);
                    break;

                case 'timeline':
                    var $this = me.$root.find('.tag-history');

                    if (args.subId) {
                        //Turn off all toggles.
                        $this.find('.box-toggle.on').removeClass('on bg-property');

                        //Turn on the desired toggle.
                        $this
                            .find(
                                '.box-toggle[data-eventtype="' + args.subId + '"]'
                            )
                            .trigger('click');
                    }

                    break;

                default:

                    if (me.savedMatchListManager) {
                        me.savedMatchListManager.deactivate();
                    }

                    if (me.layers.isConfigured(id) === false) {
                        me.layers.setConfigured(id);
                    }
                    break;
            }
        };

        me.layers.show(args.id, onLoaded, function($layer) { me.initLayer($layer); });
    },

    showMapLayer: function (alreadyConfigured, callback) {
        var me = this;

        if (!alreadyConfigured) {
            me.map = null;
            me.mapMarker = null;
            me.streetView = null;
            me.streetViewReady = false;

            //Sync StreetView Button > Click
            me.$root.on('click', '.sync-streetview', function () {
                me.mapMarker.setPosition(me.streetView.getPosition());
            });

            //Sync MapView Button > Click
            me.$root.on('click', '.sync-mapview', function () {
                me.streetView.setPosition(me.mapMarker.getPosition());
            });

            //Load google api
            $.when(loadGoogleMaps(3, shell.googleMapsApiKey, null)).then(
                function () {
                    !!google.maps; // true
                    me.setupMapAndStreetView(function () {
                        callback();
                    });
                }
            );
        } else {
            me.initMapView();
            me.initStreetView();
        }
    },

    setupMapAndStreetView: function (callback) {
        var me = this;

        //Get map settings from fields.
        var mapValues = me.readMapValues();

        if (mapValues.mapPos.lat === 0 && mapValues.mapPos.lng === 0) {
            //No Lat/Long defined yet.  Use address to lookup.
            gmgps.cloud.helpers.general.geolocationFromAddress(
                me.$root,
                function (results, status) {
                    if (!me.setDirty(true)) {
                        return false;
                    }

                    if (status === 'OK' && results.length > 0) {
                        //Set the map pos and the streetview pos the same.
                        mapValues.mapPos.lat =
                            results[0].geometry.location.lat();
                        mapValues.mapPos.lng =
                            results[0].geometry.location.lng();
                        mapValues.svPos.lat = mapValues.mapPos.lat;
                        mapValues.svPos.lng = mapValues.mapPos.lng;
                        mapValues.svPos.pov.heading = 0;
                        mapValues.svPos.pov.pitch = 10;
                        mapValues.svPos.pov.zoom = 1;

                        me.writeMapValues(mapValues);

                        $.jGrowl(
                            'We used the property address to lookup the map position for you.',
                            {
                                header: 'Map Position Discovery',
                                theme: 'growl-property',
                                duration: 7000
                            }
                        );

                        me.initMapView();
                        me.initStreetView();

                        callback();
                    }
                }
            );
        } else {
            //Existing Lat/Long found.
            if (mapValues.svPos.lat === 0 || mapValues.svPos.lng === 0) {
                //StreetView pos does not exist yet.  Use pos from map to create one.
                mapValues.svPos = {
                    lat: mapValues.mapPos.lat,
                    lng: mapValues.mapPos.lng,
                    pov: {
                        heading: 0,
                        pitch: 10,
                        zoom: 1
                    }
                };

                me.writeMapValues(mapValues);

                $.jGrowl(
                    'We created a Google StreetView position for you, based upon the existing map marker.',
                    {
                        header: 'StreetView Discovery',
                        theme: 'growl-property',
                        duration: 7000
                    }
                );
                me.setDirty(true);
            }
            me.initMapView();
            me.initStreetView();

            callback();
        }
    },

    initMapView: function () {
        var me = this;

        me.initialMapViewChanged = true;

        var mapValues = me.readMapValues();

        var latLng = new google.maps.LatLng(
            mapValues.mapPos.lat,
            mapValues.mapPos.lng
        );

        me.map = new google.maps.Map(me.$root.find('.map')[0], {
            zoom: 17,
            center: latLng,
            mapTypeId: google.maps.MapTypeId.ROADMAP,
            streetViewControl: false,
            mapTypeControl: false
        });

        me.mapMarker = new google.maps.Marker({
            map: me.map,
            draggable: true,
            animation: google.maps.Animation.DROP,
            position: latLng
        });

        google.maps.event.addListener(me.mapMarker, 'dragend', function (e) {
            me.mapPositionChangedHandler(e);
        });

        setTimeout(function () {
            var infowindow = new google.maps.InfoWindow({
                content:
                    '<b>Drag the marker to re-position<br/>this property if required!'
            });
            infowindow.open(me.map, me.mapMarker);
        }, 5000);

        return;
    },

    initStreetView: function () {
        var me = this;

        me.initialPovChanged = true;
        me.initialPositionChanged = true;

        var mapValues = me.readMapValues();

        me.streetView = new google.maps.StreetViewPanorama(
            me.$root.find('.streetview')[0],
            {
                position: new google.maps.LatLng(
                    mapValues.svPos.lat,
                    mapValues.svPos.lng
                ),
                pov: mapValues.svPos.pov,
                visible: true
            }
        );

        google.maps.event.addListener(
            me.streetView,
            'pov_changed',
            function () {
                me.svPositionChangedHandler(
                    'pov_changed',
                    me.streetView.getPov()
                );
                me.initialPovChanged = false;
            }
        );

        google.maps.event.addListener(
            me.streetView,
            'position_changed',
            function () {
                me.svPositionChangedHandler(
                    'position_changed',
                    me.streetView.getPosition()
                );
                me.initialPositionChanged = false;
            }
        );

        return;
    },

    mapPositionChangedHandler: function (data) {
        var me = this;

        var mapValues = me.readMapValues();

        if (!me.setDirty(true)) {
            return false;
        }

        mapValues.mapPos.lat = data.latLng.lat();
        mapValues.mapPos.lng = data.latLng.lng();

        me.writeMapValues(mapValues);
    },

    svPositionChangedHandler: function (event, data) {
        var me = this;

        var mapValues = me.readMapValues();

        switch (event) {
            case 'pov_changed':
                if (me.initialPovChanged === false) {
                    if (!me.setDirty(true)) {
                        return false;
                    }
                }

                mapValues.svPos.pov.heading = data.heading;
                mapValues.svPos.pov.pitch = data.pitch;
                mapValues.svPos.pov.zoom = Math.round(data.zoom);

                break;

            case 'position_changed':
                if (me.initialPositionChanged === false) {
                    if (!me.setDirty(true)) {
                        return false;
                    }
                }
                mapValues.svPos.lat = data.lat();
                mapValues.svPos.lng = data.lng();

                break;
        }

        me.writeMapValues(mapValues);
    },

    readMapValues: function () {
        var me = this;

        me.cacheMapValueElements();

        return {
            mapPos: {
                lat: parseFloat(me.mapValueElements.$mapLat.val() || 0),
                lng: parseFloat(me.mapValueElements.$mapLng.val() || 0)
            },
            svPos: {
                lat: parseFloat(me.mapValueElements.$svLat.val() || 0),
                lng: parseFloat(me.mapValueElements.$svLng.val() || 0),
                pov: {
                    heading: parseFloat(
                        me.mapValueElements.$svHeading.val() || 0
                    ),
                    pitch: parseFloat(me.mapValueElements.$svPitch.val() || 10),
                    zoom: parseInt(me.mapValueElements.$svZoom.val() || 1)
                }
            }
        };
    },

    writeMapValues: function (mapValues) {
        var me = this;

        me.cacheMapValueElements();

        me.mapValueElements.$mapLat.val(mapValues.mapPos.lat);
        me.mapValueElements.$mapLng.val(mapValues.mapPos.lng);
        me.mapValueElements.$svLat.val(mapValues.svPos.lat);
        me.mapValueElements.$svLng.val(mapValues.svPos.lng);
        me.mapValueElements.$svHeading.val(mapValues.svPos.pov.heading);
        me.mapValueElements.$svPitch.val(mapValues.svPos.pov.pitch);
        me.mapValueElements.$svZoom.val(mapValues.svPos.pov.zoom);
    },

    cacheMapValueElements: function () {
        var me = this;

        if (!me.mapValueElements) {
            me.mapValueElements = {
                $mapLat: me.$root.find('#Property_LatLng_Lat'),
                $mapLng: me.$root.find('#Property_LatLng_Lng'),
                $svLat: me.$root.find('#Property_StreetViewPOV_LatLng_Lat'),
                $svLng: me.$root.find('#Property_StreetViewPOV_LatLng_Lng'),
                $svHeading: me.$root.find('#Property_StreetViewPOV_Heading'),
                $svPitch: me.$root.find('#Property_StreetViewPOV_Pitch'),
                $svZoom: me.$root.find('#Property_StreetViewPOV_Zoom')
            };
        }
    },

    initSortableRooms: function () {
        var me = this;

        me.$root.find('.rooms').sortable({
            scroll: true,
            delay: 50,
            revert: 200,
            handle: $('.header'),
            axis: 'y',
            update: function () {
                if (!me.setDirty(true)) {
                    return false;
                }
            }
        });

        me.$root.find('.para-selector').on('change', function () {
            var $this = $(this);
            if ($this.val().length > 0) {
                $this
                    .closest('li')
                    .find('.name')
                    .val($this.find(':selected').text());
                $this.closest('li').find('.para-text').val($this.val());
                $(this)
                    .closest('.room')
                    .find('.title')
                    .html($this.find(':selected').text());
            }
        });
    },

    initSortableMedia: function () {
        var me = this;

        me.updateMediaPhotoSyncStatus();

        me.$root.on('click', 'button.web-order', function () {
            me.photoSortMode = C.PhotoOrder.Web;

            $(this).addClass('bgg-property');
            $(this).find('.anim-down-arrow').slideDown();
            me.$root.find('button.brochure-order').removeClass('bgg-property');
            me.$root
                .find('button.brochure-order')
                .find('.anim-down-arrow')
                .hide();
            me.applyMainPhotoLabel();
            me.updateMediaPhotoSyncStatus();
        });

        me.$root.on('click', 'button.brochure-order', function () {
            me.photoSortMode = C.PhotoOrder.Brochure;

            $(this).addClass('bgg-property');
            $(this).find('.anim-down-arrow').slideDown();
            me.$root.find('button.web-order').removeClass('bgg-property');
            me.$root.find('button.web-order').find('.anim-down-arrow').hide();
            me.applyMainPhotoLabel();
            me.updateMediaPhotoSyncStatus();
        });

        me.$root.on('click', 'button.sync-order', function () {
            me.syncMediaPhotoSortOrder();
        });

        me.$root.find('.photos').sortable({
            helper: 'clone',
            scroll: true,
            delay: 50,
            revert: 200,
            handle: me.$root.find('.photos .photo .drag-handle'),
            update: function () {
                if (!me.setDirty(true)) {
                    return false;
                }

                //reindex before applying main phot label as that is dependent on indexing now
                me.reindexPhotoOrder();

                //Re-apply main label on photos.
                me.applyMainPhotoLabel();
            }
        });

        me.$root.find('.floorplans').sortable({
            helper: 'clone',
            scroll: true,
            delay: 50,
            revert: 200,
            handle: me.$root.find('.floorplans .floorplan .image'),
            update: function () {
                if (!me.setDirty(true)) {
                    return false;
                }

                me.reindexFloorplanOrder();
            }
        });

        me.$root.find('.weblinks').sortable({
            scroll: true,
            delay: 50,
            revert: 200,
            handle: me.$root.find('.weblinks .weblink .header'),
            axis: 'y',
            update: function () {
                if (!me.setDirty(true)) {
                    return false;
                }
            }
        });
    },

    getHistory: function (args) {
        new gmgps.cloud.http("propertydetails-getHistory").ajax(
            {
                args: {
                    eventType: args.eventType,
                    viewName: args.viewName,
                    propertyId: args.propertyId,
                    branchId: args.branchId,
                    pageIndex: args.pageIndex,
                    pageSize: args.pageSize,
                    orderBy: args.orderBy,
                    orderAsc: args.orderAsc
                },
                dataType: 'json',
                type: 'post',
                url: '/Property/GetDiaryEventList'
            },
            function (response) {
                args.$container.html(response.Data);
            },
            function (error) {
                alert(error);
            }
        );
    },

    getMatchAreas: function () {
        var me = this;
        var areas = new Array();
        var $areas = me.$root.find(
            '.checklist[data-type="match-areas"] input[type="checkbox"]:checked'
        );
        $areas.each(function (i, v) {
            var id = parseInt($(v).val());
            areas.push(id);
        });
        return areas;
    },

    editMatchSelection: function ($tab, ids, add) {
        var me = this;
        var idSelectedList = $tab.attr('data-selected-ids');
        var tmpIdList;

        if (!idSelectedList) {
            tmpIdList = [];
        } else {
            tmpIdList = idSelectedList.split(',');
        }

        for (var i = 0; i < ids.length; i++) {
            var index = tmpIdList.indexOf(ids[i]);

            if (index == -1 && add) {
                tmpIdList.push(parseInt(ids[i]));
            }

            if (index != -1 && !add) {
                tmpIdList.splice(index, 1);
            }
        }

        $tab.attr('data-selected-ids', tmpIdList.join(','));

        me.setSelectedText($tab, tmpIdList);
    },

    setSelectedText: function ($tab, ids) {
        if (ids.length > 0) {
            $tab.find('.selections-header')
                .html(
                    ids.length +
                    (ids.length == 1 ? ' Contact' : ' Contacts') +
                    ' Selected'
                )
                .show('highlight', { color: '#289ad5' }, 500);
        } else {
            $tab.find('.selections-header').hide();
        }
    },

    _onMatchListPageRequest: function (args) {
        var me = this;

        me.getMatches({
            ids: args.ids,
            selectionMode: args.selectionMode,
            search: args
        });
    },

    displayMatchList: function (html, ids, selectionMode) {
        var me = this;

        //Insert list (if there is a response).
        if (html) {
            me.$root.find('.matches-container')[0].innerHTML = html;
        }

        me.setupTips();

        //Create a new matchlist object (unless one was passed in).
        me.matchList = new gmgps.cloud.ui.controls.list({
            $root: me.$root.find('.matches-container'),
            ids: ids,
            selectionMode: selectionMode,
            selectedItemName: 'Contact',
            selectedItemPluralName: 'Contacts',
            PageSize: 10
        });

        me.$root.find('select:not(.opt-standard)').customSelect();

        //List: onPageRequest
        me.matchList.onPageRequest.handle(function (args) {
            args.SearchPage.Size = me.$root.find('#PageSize').val();
            me._onMatchListPageRequest(args);
        });

        //List: onSelectionChanged
        me.matchList.onSelectionChanged.handle(function () {
            me.writeMatchListData(me.$root);
        });
    },

    writeMatchListData: function ($root) {
        //Set serialized data for the match list into the tab content node.
        var me = this;

        var matchListJson = JSON.stringify(me.matchList.ids);
        var lastMatchSearchArgsJson = JSON.stringify(me.lastMatchSearchArgs);
        $root
            .attr('data-matchList', matchListJson)
            .attr('data-match-lastMatchSearchArgs', lastMatchSearchArgsJson);
    },

    getMatchForm: function (args) {
        var me = this;

        var pageIndex = args && args.search ? args.search.SearchPage.Index : 1;
        var pageSize = args && args.search ? args.search.SearchPage.Size : 10;

        me.$root
            .find('.match-form #MatchProfileViewModel_SearchPage_Index')
            .val(pageIndex);
        me.$root
            .find('.match-form #MatchProfileViewModel_SearchPage_Size')
            .val(pageSize);

        return me.$root.find('.match-form').clone();
    },

    getMatches: function (args) {
        var me = this;

        var $formData = me.getMatchForm(args);

        me.$lastMatchFormData = $formData;

        new gmgps.cloud.http("propertydetails-getMatches").postForm(
            createForm($formData, 'Property/GetMatchList', true),
            function (response) {
                me.lastMatchSearchArgs = response.Data.Search;
                var ids = args ? args.ids : [];
                var selectionMode = args
                    ? args.selectionMode
                    : C.ListSelectionMode.None;
                me.$root
                    .find('.summary .match-count')
                    .html(response.Data.MatchCount);

                if (me.savedMatchListManager) {
                    if (!response.Data.Search.MarkedRejectedForProperty) {
                        if (response.Data.MatchCount > 500) {
                            me.savedMatchListManager.enableCreateListButton(
                                false,
                                'You must reduce your results to 500 matches or less before you can create a match list.'
                            );
                        } else {
                            me.savedMatchListManager.enableCreateListButton(
                                true
                            );
                            me.$root
                                .find('#btn-create-match-list')
                                .removeClass('disabled')
                                .removeAttr('title');
                        }
                    } else {
                        me.savedMatchListManager.enableCreateListButton(
                            false,
                            'You cannot create a match list containing contacts who have rejected this property.'
                        );
                    }
                }

                me.displayMatchList(response.Data.Html, ids, selectionMode);
            }
        );
    },

    setupUploader: function () {
        var me = this;

        me.uploader = new gmgps.cloud.ui.controls.uploader({
            maxWidth: 1920,
            maxHeight: 1080,
            maxThumbnailWidth: 120,
            maxThumbnailHeight: 120,
            uploadResizedImages: true,
            uploadOriginalImages: false,
            rowCount: 1,
            columnCount: 5,
            enableDescription: true
        });

        me.uploader.onUploadComplete.handle(function () {
            if (!me.setDirty(true)) {
                return false;
            }

            me.$root.find('.no-photos').hide();
        });
    },

    openPreview: function ($e) {
        var me = this;

        me.$previewElement = $e;

        //Postion the preview relative to the trigger.
        var offset = $e.offset();
        me.$root
            .find('.room-photo-preview')
            .css('position', 'fixed')
            .css('left', offset.left - 130)
            .css('top', offset.top - 235);

        me.$root
            .find('.room-photo-preview img')
            .attr('src', $e.attr('src').replace('[1]', '[2]'));

        if ($.browser.msie) me.$root.find('.room-photo-preview').show();
        else me.$root.find('.room-photo-preview').fadeIn(250);

        me.isVisible = true;
    },

    closePreview: function () {
        var me = this;
        me.$root.find('.room-photo-preview').hide();
        me.isVisible = false;
    },

    addNote: function ($sticky) {
        var me = this;
        shell.addStickyNote({
            $sticky: $sticky,
            linkedId: me.id,
            modelType: C.ModelType.Property,
            branchId: me.$root.find('#Property_BranchId').val(),
            $container: me.$root,
            containment: me.$root.find('.layers')
        });
    },

    addWorkOrder: function () {
        var me = this;

        me.layers.show('management', function() {
            me.views.workordersHandler.addWorkOrder();
        },
        function ($layer) { me.initLayer($layer); })
    },

    refreshWorkOrders: function (id) {
        var me = this;
        if (id != me.id) {
            return;
        }
        me.views.workordersHandler &&
            me.views.workordersHandler.updateWorkOrderList(1);
    },

    setupTips: function () {
        var me = this;
        me.$root.find('.tip').each(function (i, v) {
            var $this = $(v);
            me.addTip($this);
        });
    },

    addTip: function ($button) {
        $button.qtip({
            content: $button.data('tip'),
            position: {
                my: 'top middle',
                at: 'bottom middle'
            },
            show: {
                event: 'mouseenter',
                delay:
                    $button.data('delay') == undefined
                        ? 0
                        : $button.data('delay'),
                effect: function () {
                    $(this).fadeIn(50);
                },
                solo: true
            },
            hide: 'mouseleave',
            style: {
                tip: true,
                classes: 'qtip-dark'
            }
        });
    },

    initFeaturesAndAreas: function () {
        var me = this;
        me.matchAreasTool = gmgps.cloud.helpers.matchAreas.create({
            $treeElement: me.$root.find('div[data-type="match-areas"]'),
            onChange: function () {
                if (!me.setDirty(true)) {
                    return false;
                }
            }
        });
    },

    reindexFloorplanOrder: function () {
        var me = this;

        var orderIndex = 1;
        me.$root.find('.floorplans .floorplan').each(function () {
            $(this).find('input.order-Index').val(orderIndex);
            orderIndex += 1;
        });
    },

    reindexPhotoOrder: function () {
        var me = this;

        //update order index or web order index depending what mode we are in
        var orderIndex = 1;
        me.$root.find('.photos .photo').each(function () {
            //update hidden field value and mix it up data attr for sorting by
            if (me.photoSortMode == C.PhotoOrder.Brochure) {
                $(this).find('input.order-Index').val(orderIndex);
                $(this).attr('data-brochureorder', orderIndex);
            } else if (me.photoSortMode == C.PhotoOrder.Web) {
                $(this).find('input.web-Order-Index').val(orderIndex);
                $(this).attr('data-weborder', orderIndex);
            }

            orderIndex += 1;
        });

        me.updateMediaPhotoSyncStatus();
    },

    ensureMarketingPartialsLoaded: function () {
        //When lease or market type dropdowns are changed, we need to ensure that the supporting html is loaded.
        var me = this;
        var recordType = parseInt(
            me.$root.find('#Property_RecordTypeId').val()
        );
        var leasehold = parseInt(
            me.$root.find('#Property_PropertySale_TenureId').val()
        );

        var get = function (type, controllerAction) {
            new gmgps.cloud.http(
                "propertydetails-ensureMarketingPartialsLoaded"
            ).getView({
                url: controllerAction, 
                post: true,
                args: { id: me.id },
                onSuccess: function (e) {
                    me.$root
                        .find('.marketing-{0}-container'.format(type))
                        .html(e.Data);

                    //Init selects and date pickers.
                    me.$root
                        .find('.marketing-{0}-container'.format(type))
                        .find('select')
                        .customSelect();
                    me.$root
                        .find('.marketing-{0}-container'.format(type))
                        .find('.date-picker')
                        .each(function (i, v) {
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
                    me.wireUpPropertyLeaseSharedOwnershipChangeEvent();
                    me.wireUpPropertyLeaseSharedOwnershipNTSContentChangeEvent();
                    me.wireUpPropertySaleTenureNTSContentChangeEvent();

                    //Ensure visible.
                    switch (type) {
                        case 'sale':
                            me.$root.find('.sale-specific').show();
                            break;
                        case 'rent':
                            me.$root.find('.rent-specific').show();
                            me.setPropertyTenancyFields();
                            break;
                        case 'lease':
                            me.$root.find('.x-lease').show();
                            break;
                    }
                }
            });
        };

        if (
            recordType === C.PropertyRecordType.Sale &&
            me.$root.find('.marketing-sale-container').children().length == 0
        ) {
            get('sale', 'Property/getpropertymarketinginfosale');
            me.$root.find('.rent-specific').hide();
        }

        if (
            recordType === C.PropertyRecordType.Rent &&
            me.$root.find('.marketing-rent-container').children().length == 0
        ) {
            get('rent', 'Property/getpropertymarketinginforent');
            me.$root.find('.sale-specific').hide();
            me.$root.find('.x-lease').hide();
        }

        if (
            (leasehold === C.TenureType.LeaseholdWithShareOfFreehold ||
                leasehold === C.TenureType.Leasehold) &&
            me.$root.find('.marketing-lease-container').children().length == 0
        ) {
            get('lease', 'Property/getpropertymarketinginfolease');
        }
    },

    reloadBranchPropertyPortalDefaults: function () {
        var me = this;

        var branchId = parseInt(me.$root.find('#Property_BranchId').val());

        new gmgps.cloud.http(
            "propertydetails-reloadBranchPropertyPortalDefaults"
        ).ajax(
            {
                args: { branchId: branchId },
                dataType: 'json',
                type: 'post',
                url: '/property/GetBranchPropertyPortals'
            },
            function (response) {
                if (!me.setDirty(true)) {
                    return false;
                }

                var $portals = me.$root.find('.property-portals .portal');

                $.each(response.Data, function (i, portal) {
                    var $portal = $portals.eq(i);

                    $portal
                        .find(
                            'input[name="PropertyPortals[{0}].DelayInHours"]'.format(
                                i
                            )
                        )
                        .val(portal.DelayInHours);
                    var excludedCheckbox = $portal.find(
                        'input[name="PropertyPortals[{0}].Exclude"]'.format(i)
                    );
                    excludedCheckbox.prop('checked', portal.Exclude);

                    if (excludedCheckbox.is(':checked')) {
                        excludedCheckbox.parent().addClass('ticked');
                    } else {
                        excludedCheckbox.parent().removeClass('ticked');
                    }
                });

                me.$root
                    .find('.property-portals #restorePortals-button')
                    .addClass('hidden');
            }
        );
    },

    setupSavedMatchLists: function (args) {
        var me = this;

        $.extend(args, {
            dirtyCallback: function (dirty) {
                me.setDirty(dirty);
            },
            onListDeleted: function () {
                me.queueMatchCountUpdate({
                    search: {
                        SearchPage: {
                            Index: 1,
                            Size: me.$root
                                .find(
                                    '.match-form #MatchProfileViewModel_SearchPage_Size'
                                )
                                .val()
                        }
                    }
                });
            },
            onListChanged: function () {
                me.refreshMatches();
            }
        });

        me.savedMatchListManager =
            new gmgps.cloud.ui.views.savedMatchListManager(args);
    },

    refreshMatches: function () {
        var me = this;
        me.queueMatchCountUpdate({
            search: {
                SearchPage: {
                    Index: 1,
                    Size: me.$root
                        .find(
                            '.match-form #MatchProfileViewModel_SearchPage_Size'
                        )
                        .val()
                }
            }
        });
    },

    refreshFollowUps: function () {
        var me = this;

        var isArchived = me.$root.find('#Property_Archived').val() === 'True';

        var deferred = new $.Deferred();

        me.$root
            .find('.layer[data-id="overview"] .followups')
            .followUpDropdown({
                linkedType: C.ModelType.Property,
                linkedId: me.id,
                display: 'slide',
                allowCreate: isArchived === false,
                onReady: function () {
                    deferred.resolve();
                }
            });

        return deferred.promise();
    },

    refreshPropertyOverviewCounts: function () {
        var me = this;

        var deferred = new $.Deferred();

        new gmgps.cloud.http(
            "propertydetails-refreshPropertyOverviewCounts"
        ).ajax(
            {
                args: { propertyId: me.id },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/Property/GetPropertyOverviewCounts',
                background: true
            },
            function (response) {
                deferred.resolve();

                if (alto.optimizelyClient.isFeatureEnabledForGroup('property_overview_counts_async', $('#_groupid').val())) {
                    $('.countfor[data-countfornew="' + me.id + '-marketing"]').html(response.Data[0]);
                    $('.countfor[data-countfornew="' + me.id + '-viewings"]').html(response.Data[1]);
                    $('.countfor[data-countfornew="' + me.id + '-offers"]').html(response.Data[2]);
                    $('.countfor[data-countfornew="' + me.id + '-matchingcontacts"]').html(response.Data[3]);
                }
                else {
                    var countUpOptions = {
                        useEasing: true,
                        useGrouping: true,
                        separator: ','
                    };
                    var countUpElementsAndValues = [
                        {
                            element: me.$root.find(
                                '.countfor[data-countfor="marketing"]'
                            )[0],
                            countValue: response.Data[0]
                        },
                        {
                            element: me.$root.find(
                                '.countfor[data-countfor="viewings"]'
                            )[0],
                            countValue: response.Data[1]
                        },
                        {
                            element: me.$root.find(
                                '.countfor[data-countfor="offers"]'
                            )[0],
                            countValue: response.Data[2]
                        },
                        {
                            element: me.$root.find(
                                '.countfor[data-countfor="matchingcontacts"]'
                            )[0],
                            countValue: response.Data[3]
                        }
                    ];
                    for (var i = 0; i < countUpElementsAndValues.length; i++) {
                        var countUp = new CountUp(
                            countUpElementsAndValues[i].element,
                            0,
                            countUpElementsAndValues[i].countValue,
                            0,
                            1,
                            countUpOptions
                        );
                        countUp.start();
                    }
                }
            },
            function () {
                deferred.resolve();
            }
        );

        return deferred.promise();
    },

    initMAFollowUps: function () {
        //This is a subset of tasks for the property; being only those associated with the MA.
        var me = this;

        var valuationDiaryEventId = parseInt(
            me.$root.find('#ValuationDiaryEventId').val()
        );
        var diaryEventAppointmentCancelled =
            me.$root.find('#MAValuationEventStatusCancelled').val() === 'True';

        // Note: if no MA recorded yet on property or it exists but the appointment is cancelled dont show yet
        // except when we specifically want to create/recreate the dropdown (after adding an MA appointment)
        if (valuationDiaryEventId === 0 || diaryEventAppointmentCancelled)
            return;

        //FollowUp Dropdown
        me.$root
            .find('.layer[data-id="marketappraisal"] .followups')
            .followUpDropdown({
                linkedType: C.ModelType.DiaryEvent,
                linkedId: valuationDiaryEventId,
                display: 'normal',
                reInitialise: true
            });
    },

    removeMAFollowUps: function () {
        var me = this;
        me.$root
            .find('.layer[data-id="marketappraisal"] .followups')
            .followUpDropdown()
            .data('followUpDropdown')
            .destroy();
    },

    updateMediaPhotoSyncStatus: function () {
        var me = this;

        var $photos = me.$root.find(
            '.layer[data-id="media"] .photos .photo.mix'
        );
        var $syncBtn = me.$root.find('button.sync-order');
        var $syncIcon = $syncBtn.find('#sync-btn-icon');

        var synced = true;
        $photos.each(function (index, element) {
            var $element = $(element);
            var brochureOrder = $element.attr('data-brochureorder');
            var webOrder = $element.attr('data-weborder');

            if (brochureOrder !== webOrder) {
                synced = false;
                return false;
            }
            return true;
        });

        $syncIcon.removeClass();
        if (synced) {
            $syncBtn.prop('disabled', true);
            $syncBtn.removeClass('bgg-green');
            $syncBtn.attr('title', 'Brochure and Web photo order match');
            $syncIcon.addClass('fa fa-lg fa-exchange');
        } else {
            $syncBtn.prop('disabled', false);
            $syncBtn.addClass('bgg-green');
            switch (me.photoSortMode) {
                case C.PhotoOrder.Web:
                    $syncBtn.attr('title', 'Copy photo order to Brochure');
                    $syncIcon.addClass('fa fa-lg fa-random fa-flip-horizontal');
                    break;
                case C.PhotoOrder.Brochure:
                    $syncBtn.attr('title', 'Copy photo order to Web');
                    $syncIcon.addClass('fa fa-lg fa-random');
                    break;
                default:
            }
        }
    },

    syncMediaPhotoSortOrder: function () {
        var me = this;

        var $syncIcon = me.$root.find('#sync-btn-icon');
        $syncIcon.removeClass();
        $syncIcon.addClass('fa fa-lg fa-circle-o-notch fa-spin');

        function getCopyFor(fromAttr, toAttr, toInput) {
            return function (index, element) {
                var $element = $(element);
                var orderIndex = $element.attr(fromAttr);
                $element.attr(toAttr, orderIndex);
                $element.find(toInput).val(orderIndex);
            };
        }

        var copyPhotoOrder;
        switch (me.photoSortMode) {
            case C.PhotoOrder.Web:
                copyPhotoOrder = getCopyFor(
                    'data-weborder',
                    'data-brochureorder',
                    'input.order-Index'
                );
                break;
            case C.PhotoOrder.Brochure:
                copyPhotoOrder = getCopyFor(
                    'data-brochureorder',
                    'data-weborder',
                    'input.web-Order-Index'
                );
                break;
            default:
                copyPhotoOrder = function () { };
                break;
        }

        var $photos = me.$root.find(
            '.layer[data-id="media"] .photos .photo.mix'
        );
        $photos.each(copyPhotoOrder);

        me.setDirty(true);
        me.updateMediaPhotoSyncStatus();
    },

    refreshLayer: function (layerName) {
        var me = this;
        return me.layers.refresh(layerName, function($layer) { me.initLayer($layer); });
    },

    createBoardChange: function () {
        var me = this;

        gmgps.cloud.helpers.property.createBoardChange({
            id: me.id,
            boardType: me.$root.find('#Property_BoardType').val(),
            callback: function (boardRequired, boardTypeId, sent) {
                var boardTypeDesc =
                    gmgps.cloud.helpers.property.getBoardTypeDescription(
                        boardTypeId
                    );
                var $row = me.$root.find('.pending-board-change-row');
                var $boardTypeName = me.$root.find('.current-boardtype-name');
                var $boardRequired = me.$root.find('#Property_BoardRequired');

                if (sent) {
                    $row.hide();

                    if (boardTypeId === C.BoardType.ReErectBoard) {
                        return false;
                    }

                    if (boardTypeId === C.BoardType.TakeDownBoard) {
                        $boardTypeName.text('No Board');
                    } else {
                        $boardTypeName.text(boardTypeDesc);
                    }

                    if (boardRequired !== null) {
                        $boardRequired
                            .prop('checked', boardRequired)
                            .trigger('prog-change');
                    }
                } else {
                    me.$root
                        .find('.pending-board-change-desc')
                        .text(
                            'Note: A change request is pending ({0})'.format(
                                boardTypeDesc
                            )
                        );
                    $row.show();
                }
            }
        });
    },

    mixItUpInitialise: function () {
        var me = this;

        me.$root
            .find('.layer[data-id="media"] #photos-mix-it-up')
            .mixItUp('forceRefresh');
        me.$root
            .find('.layer[data-id="media"] #photos-mix-it-up')
            .mixItUp('destroy', true);
        me.$root.find('.layer[data-id="media"] #photos-mix-it-up').mixItUp();

        var $selectedButton = me.$root
            .find('.layer[data-id="media"] .order-button')
            .filter(function (i, v) {
                return $(v).hasClass('bgg-property');
            })
            .first();

        $selectedButton.trigger('click');
    },

    initDepositChecks: function () {
        var me = this;

        var displayDepositWarning =
            me.$root.find('#RentStatus_').val() > 0 &&
            getBoolean(me.$root.find('#RequiresDepositWarning'));

        if (displayDepositWarning) {
            me.checkDepositDoesNotExceedLegalLimit();
        } else {
            me.setDepositWarningStatus(false, '');
        }
    },

    checkDepositDoesNotExceedLegalLimit: function () {
        var me = this;

        var maxDepositPermitted = me.getMaxPermittedDeposit();
        var requestedDeposit = me.$root
            .find('#Property_PropertyRental_DepositRequired')
            .asNumber();

        if (requestedDeposit > maxDepositPermitted) {
            var currencySymbol = me.$root.find('#CurrencySymbol').val();
            var maxDepositMessage =
                'In accordance with the Tenant Fees Act 2019, and based on the rental price and frequency, you should not hold more than ' +
                currencySymbol +
                maxDepositPermitted;

            me.setDepositWarningStatus(true, maxDepositMessage);
        } else {
            me.setDepositWarningStatus(false, '');
        }
    },

    getMaxPermittedDeposit: function () {
        var me = this;
        var weeklyRent = me.getRentPerWeekDecimal();
        var maxPermitted =
            gmgps.cloud.accounting.RentalCalculator.calculateMaxPermittedDeposit(
                weeklyRent
            );
        return gmgps.cloud.accounting.RentalCalculator.roundDownDeposit(
            maxPermitted
        );
    },

    getRentPerWeekDecimal: function () {
        var me = this;

        var rent = me.getRent();

        var rentPerWeek =
            gmgps.cloud.accounting.RentalCalculator.calculateRentPerWeek(
                me.$root.find('#Property_PropertyRental_RentalFrequency').val(),
                rent
            );
        return rentPerWeek;
    },

    getRentPerMonthDecimal: function () {
        var me = this;

        var rent = me.getRent();

        var rentPerWeek =
            gmgps.cloud.accounting.RentalCalculator.calculateRentPerMonth(
                me.$root.find('#Property_PropertyRental_RentalFrequency').val(),
                rent
            );
        return rentPerWeek;
    },

    getRent: function () {
        var me = this;

        var $proposedRentAmountInput = me.$root.find(
            '#MarketAppraisalViewModel_Valuation_ProposedRent'
        );
        var $rentAmountInput = me.$root.find('#Property_PropertyRental_Price');
        var $rentInput =
            $proposedRentAmountInput && $proposedRentAmountInput.length > 0
                ? $proposedRentAmountInput.val()
                : $rentAmountInput.val();

        if (!$rentInput) {
            $rentInput = 0;
        }

        return $rentInput;
    },

    setDepositWarningStatus: function (showWarningIcon, tooltipMessage) {
        var me = this;

        var $depositWarning = me.$root.find('#deposit-info');

        if (showWarningIcon) {
            $depositWarning.show().attr('data-tooltip', tooltipMessage);

            $depositWarning.off().qtip({
                content: tooltipMessage,
                position: {
                    my: 'bottom middle',
                    at: 'top middle'
                },
                show: {
                    solo: true,
                    ready: false,
                    delay: 200,
                    effect: true
                },
                hide: {
                    delay: 0,
                    effect: false
                },
                style: {
                    tip: true,
                    classes: 'qtip-dark',
                    width: 300
                }
            });
        } else {
            $depositWarning.hide().attr('data-tooltip', '');
            $depositWarning.off();
        }
    },

    showWarningIfFieldNotNumericalOnly: function (element) {
        var $element = $(element);
        if (!$element.length) return false;
        var newValue = $element.val();
        var valueOnLoad = $element.data('valueonload').toString();
        var legacyValue = $(
            'input[data-ntsreplacementfield=' + $element.attr('id') + ']'
        )
            .data('originalvalue')
            .toString();

        if (
            ((!valueOnLoad || !valueOnLoad.length > 0) &&
                legacyValue.length > 0) ||
            !this.isValueNumericalOrEmpty(newValue)
        ) {
            $element.next('.fa-warning').show();
        } else {
            $element.next('.fa-warning').hide();
        }
    },

    isValueNumericalOrEmpty: function (value) {
        if (!value) {
            return true;
        } else {
            return $.isNumeric(this.filterCurrencyValue(value.toString()));
        }
    },

    updateLegacyNTSField: function (element) {
        var $element = $(element);
        if (!$element.length) return false;
        var filteredValue = this.filterCurrencyValue($element.val());
        var formattedValue =
            $.isNumeric(filteredValue) && filteredValue.length > 0
                ? Number(filteredValue).toFixed(2)
                : '';
        $('input[data-ntsreplacementfield=' + $element.attr('id') + ']').val(
            formattedValue
        );
    },

    filterCurrencyValue: function (value) {
        return value.replace('£', '').replace(/,/g, '');
    },

    showWarningIfPreviousTaxBandNotInDropdown: function (taxBandDropdown) {
        var me = this;
        var pleaseSelect = 'Please select';

        var warning = me.$root.find('#tax-band-warning');
        var previousTaxBandValue = me.$root.find('#previous-tax-band').text();
        $(taxBandDropdown).find('option[value=""]').text(pleaseSelect);

        if (
            previousTaxBandValue.length == 0 ||
            (previousTaxBandValue.length > 0 &&
                $(taxBandDropdown).find(
                    `option[value="${previousTaxBandValue}"]`
                ).length > 0 &&
                $(taxBandDropdown)
                    .find(`option[value="${previousTaxBandValue}"]`)
                    .text() !== pleaseSelect)
        ) {
            warning.hide();
        } else {
            $(taxBandDropdown)
                .find('option[value=""]')
                .val(previousTaxBandValue)
                .prop('selected', true);
            $(taxBandDropdown)
                .siblings('.customStyleSelectBox')
                .find('.customStyleSelectBoxInner')
                .text(pleaseSelect); //workaround to show the right value in the dropdown UI
            warning.show();
        }
    },

    showTaxBandPairedItems: function (taxBandDropdown, taxBandRefCode, itemToToggle) {
        var customSelectorText = $(taxBandDropdown).siblings('.customStyleSelectBox').find('.customStyleSelectBoxInner').text();
        if (customSelectorText.contains(taxBandRefCode)) {
            $(itemToToggle).show();
        } else {
            $(itemToToggle).hide();
        }
    },

    wireUpPropertyLeaseSharedOwnershipChangeEvent: function () {
        var me = this;
        me.$root.find('#Property_PropertyLease_SharedOwnership').change(function () {
            if (this.checked) {
                $('#sharedOwnershipContainer').show();
            } else {
                $('#sharedOwnershipContainer').hide();
                $('#Property_PropertyLease_SharedOwnershipPercentageShare').val(
                    ''
                );
                $('#Property_PropertyLease_SharedOwnershipRent').val('');
                $(
                    '#Property_PropertyLease_SharedOwnershipRentFrequency option:contains("Monthly")'
                )
                    .prop('selected', true)
                    .change();
            }
        });
    },

    applyTaxBandNTSValidation: function () {
        var me = this;
        var $taxBand = me.$root.find('#Property_TaxBand');

        var $domesticRateReferenceCode = "Northern Ireland";
        var $domesticRateContainer = me.$root.find('#northern-ireland-domestic-rate');

        var $exemptionBandReferenceCode = "Exempt";
        var $exemptionReasonContainer = me.$root.find('#tax-band-exemption-reason');

        me.showWarningIfPreviousTaxBandNotInDropdown($taxBand);
        me.showTaxBandPairedItems($taxBand, $domesticRateReferenceCode, $domesticRateContainer);
        me.showTaxBandPairedItems($taxBand, $exemptionBandReferenceCode, $exemptionReasonContainer);

        var $notSpecified = $taxBand.find('option:contains(Please select)');

        if ($taxBand.prop('selectedIndex') > 1) {
            $notSpecified.remove(); // remove not specified option
        }

        // Event Handler for conditional tax bands
        $taxBand.change(function () {
            $('#myselect option:selected').text();
            if ($taxBand.find('option:selected').text() !== 'Please select') {
                $notSpecified.remove();
            }

            // Northern Ireland Domestic Rate field
            $domesticRateContainer.hide();

            //Exempt - Exemption Reason field
            $('#Property_TaxBandExemptReason').val(null);
            $exemptionReasonContainer.hide();


            switch (this.value) {
                case $domesticRateReferenceCode:
                    $domesticRateContainer.show();
                    break;

                case $exemptionBandReferenceCode:
                    $exemptionReasonContainer.show();
                    break;
            }
        });
    },

    applyTenureNTSValidation: function () {
        var $tenure = this.$root.find('#Property_PropertySale_TenureId');

        var $notSpecified = $tenure.find('[value="0"]');
        if ($tenure.val() == C.TenureType.Unspecified) { // replace not specified option
            $tenure.next('.customStyleSelectBox').find('.customStyleSelectBoxInner').text('Please select');
            $notSpecified.text('Please select').prop("disabled", true);
            $tenure.prepend($notSpecified);
        } else {
            $notSpecified.remove(); // remove not specified option
        }

        $tenure.change(function () {
            if (this.value > 0) {
                $notSpecified.remove();
            }
        });
    },

    wireUpDropdownElementValueNTSWarnings: function (
        $targetElement,
        $warningElement,
        invalidValues
    ) {
        invalidValues.indexOf($targetElement.val()) > -1
            ? $warningElement.show()
            : $warningElement.hide();

        $targetElement.change(function () {
            (invalidValues.indexOf(parseInt(this.value)) > -1) ? $warningElement.show() : $warningElement.hide();
        });
    },

    wireUpDropdownElementTextNTSWarnings: function (
        $targetElement,
        $warningElement,
        invalidValues
    ) {
        invalidValues.indexOf(
            $targetElement.find('option:selected').text().toLowerCase()
        ) > -1
            ? $warningElement.show()
            : $warningElement.hide();

        $targetElement.change(function () {
            invalidValues.indexOf(
                $targetElement.find('option:selected').text().toLowerCase()
            ) > -1
                ? $warningElement.show()
                : $warningElement.hide();
        });
    },

    wireUpPropertyLeaseSharedOwnershipNTSContentChangeEvent: function () {
        var $sharedOwnership = this.$root.find(
            '#Property_PropertyLease_SharedOwnership'
        );
        var $sharedOwnershipNTSContent = this.$root.find(
            '.nts-shared-ownership-content'
        );

        $sharedOwnership.on('change', function () {
            if (this.checked) {
                $sharedOwnershipNTSContent.removeClass('hide').addClass('show');
            } else {
                $sharedOwnershipNTSContent.removeClass('show').addClass('hide');
            }
        });
    },

    wireUpPropertySaleTenureNTSContentChangeEvent: function () {
        var $tenure = this.$root.find('#Property_PropertySale_TenureId');
        var $tenureNTSContent = this.$root.find('.nts-tenure-content');

        $tenure.on('change',
            function () {
                if (this.value == C.TenureType.Leasehold || this.value == C.TenureType.LeaseholdWithShareOfFreehold) {
                    $tenureNTSContent.removeClass('hide').addClass('show');
                } else {
                    $tenureNTSContent.removeClass('show').addClass('hide');
                }
            }
        );
    },

    wireUpNTSContentEvents: function () {
        var me = this;
        var $collapsableNTSInfo = me.$root.find('.nts-category.collapsible');

        $collapsableNTSInfo.on('click', function () {
            var target = $(this).data('collapsible-target');
            $(target).toggleClass('show hide');
        });

        me.wireUpPropertyLeaseSharedOwnershipNTSContentChangeEvent();
        me.wireUpPropertySaleTenureNTSContentChangeEvent();
    },

    selectTab: function (layer, tab) {
        var me = this;

        if (!me.tabColumn) {
            return;
        }

        me.tabColumn.selectTab(layer, tab);
    },

    // Alto AI Property Summaries
    handleAltoAIPropertySummaryClick(e, btnAltoAI, btnAltoAISpinner) {
        var me = this;
        if ($(btnAltoAI).hasClass("disabled")) {
            e.preventDefault();
        }
        else {
            $(btnAltoAI).addClass("disabled");
            $(btnAltoAISpinner).addClass("loading");

            var $correlationId = $(btnAltoAI).attr('data-correlation-id');
            var propertyId = $(btnAltoAI).data("propertyid");
            var propertyFeatures = me.buildPropertyFeaturesForAIPropertySummary();

            altoTokenService.getToken({ correlationId: $correlationId })
                .then(function (token) {
                    var $webApiBaseUrl = $('#_webApiBaseUrl').val();
                    $.ajax({
                        url: $webApiBaseUrl + '/genai/property/' + propertyId + '/summary?' + propertyFeatures,
                        type: 'GET',
                        async: false,
                        headers: {
                            'Authorization': 'Bearer ' + token,
                            'Alto-Version': alto.version
                        },
                        dataType: 'json',
                        contentType: 'application/json',
                        success: function (result) {
                            if (result.success) {
                                me.printOutTextByWord($('#Property_Summary'), result.propertySummary, function () {
                                    me.setDirty(true);
                                    $(btnAltoAI).removeClass("disabled");
                                    $('#Property_Summary').keyup();
                                });
                                $(btnAltoAISpinner).removeClass("loading");
                            }
                            else {
                                me.showSummaryErrorAndResetButton(btnAltoAI, btnAltoAISpinner);
                            }
                        },
                        error: function () {
                            me.showSummaryErrorAndResetButton(btnAltoAI, btnAltoAISpinner);
                        }
                    });
                })
                .catch(function (error) {
                    console.error('Token error:', error);
                    me.showSummaryErrorAndResetButton(btnAltoAI, btnAltoAISpinner);
                });
        }
    },
    buildPropertyFeaturesForAIPropertySummary: function () {
        var propertyFeatures = '';
        $('.alto-ai-property-feature').each(function () {
            if (this.value !== '') {
                propertyFeatures += '&propertyfeatures=' + encodeURIComponent(this.value);
            }
        });
        return propertyFeatures.slice(1);
    },
    showSummaryErrorAndResetButton: function (btnAltoAI, btnAltoAISpinner) {
        $(btnAltoAI).removeClass("disabled");
        $(btnAltoAISpinner).removeClass("loading");
        showDialog({
            type: 'error',
            title: 'AI Summary Generator',
            width: 460,
            msg: 'We couldn’t generate a summary due to a technical issue at our end.<br /><br />Please close this message and try again',
            buttons: {
                OK: function () {
                    $(this).dialog('close');
                }
            }
        });
    },
    printOutTextByWord: function (target, value, callback) {
        $(target).val('');
        var index = 0;
        const timer = setInterval(() => {
            $(target).val(function () {
                return this.value + value[index];
            });
            index++;
            if (index === value.length) {
                clearInterval(timer);
                callback();
            }
        }, 0);
    },

    setAltoTreeViewParentState: function (element) {
        var parent = $(element).data("parent");
        var $parent = $('#' + parent);
        var $children = $('input[data-parent="' + parent + '"]');
        var checked = $children.filter(':checked').length;
        var total = $children.length;

        if (checked === 0) {
            $parent.prop('indeterminate', false);
            $parent.prop('checked', false);
        } else if (checked === total) {
            $parent.prop('indeterminate', false);
            $parent.prop('checked', true);
        } else {
            $parent.prop('indeterminate', true);
            $parent.prop('checked', false);
        }
    },

    hasCustomBrochure: function () {
        var me = this;

        var customBrochureElement = me.$root.find('#HasPublicBrochure');

        return customBrochureElement.val() === "True";
    },

    callOnComplete: function (val) {
        var me = this;

        if (me.cfg.onComplete) {
            me.cfg.onComplete(val);
            delete me.cfg.onComplete;
        }
    },

    isPropertyAPT: function () {
        const me = this;
        const tenancyTypeId = parseInt(me.$root.find('#Property_ContractTypeId').val(), 10);
        return tenancyTypeId === C.PropertyContractType.AssuredPeriodicTenancy;
    },

    toggleRestrictionVisibility: function (isRent, isResidential) {
        const me = this;
        const restrictionFieldsAreRelevant = isRent && isResidential && me.isPropertyAPT();

        const ui = {
            childReason: me.$root.find('#childrenRestrictionReasonContainer'),
            petReason: me.$root.find('#petsRestrictionReasonContainer'),
            chkChildren: me.$root.find('#Property_PropertyRental_Children'),
            chkPets: me.$root.find('#Property_PropertyRental_Pets')
        };

        const showChild = restrictionFieldsAreRelevant && ui.chkChildren.length && !ui.chkChildren.prop('checked');
        const showPet = restrictionFieldsAreRelevant && ui.chkPets.length && !ui.chkPets.prop('checked');

        ui.childReason.toggle(!!showChild);
        ui.petReason.toggle(!!showPet);
    },

    setPropertyTenancyFields: function (options) {
        const me = this;
        if (!alto.optimizelyClient.isFeatureEnabledForGroup('assured_periodic_tenancies', $('#_groupid').val()))
            return;
        const settings = options || {};
        const isRent = me.getRecordTypeId() === C.PropertyRecordType.Rent;
        const isResidential = me.getCategoryId() === C.PropertyCategoryType.Residential;

        if (settings.propertyCategoryHasChanged && isResidential) {
            me.$root.find('#Property_ContractTypeId').val(C.PropertyContractType.AssuredPeriodicTenancy).customSelect();
        }
        me.$root.find('.tenancytype-row').toggle(isRent && isResidential);
        me.$root.find('.term-row').toggle(!(isRent && isResidential && me.isPropertyAPT()));
        me.toggleRestrictionVisibility(isRent, isResidential);
        if (isRent) {
            me.updateRentalDropdownFields(isResidential);
        }
    },

    wireUpClickEventsForChildrenPets: function () {
        const me = this;
        if (!alto.optimizelyClient.isFeatureEnabledForGroup('assured_periodic_tenancies', $('#_groupid').val()))
            return;

        me.$root.find('#Property_PropertyRental_Children, #Property_PropertyRental_Pets')
                .on('change', () => {
                    const isRent = me.getRecordTypeId() === C.PropertyRecordType.Rent;
                    const isResidential = me.getCategoryId() === C.PropertyCategoryType.Residential;

                    me.toggleRestrictionVisibility(isRent, isResidential);
                });
    },

    updateRentalDropdownFields: function (isResidential) {
        const me = this;
        if (me.isDirty || me.isMADirty) {
            const aptMonthlyFrequencyDefault = '2';
            const aptPerMonthPriceQualifierDefault = '20';
            const isAPT = me.isPropertyAPT();

            const syncDropdown = (selector, templateId, aptDefaultValue = '') => {
                const $dropdown = me.$root.find(selector);
                if (!$dropdown.length) return;

                const currentValue = $dropdown.val();
                const finalTargetId = isResidential && isAPT ? `${templateId}APT` : templateId;
                const $template = me.$root.find(`template[data-template-id="${finalTargetId}"]`);

                if ($template.length) {
                    const newOptions = $($template[0].content).find('select').html();
                    $dropdown.html(newOptions);

                    const containsExistingValue = $dropdown.find(`option[value="${currentValue}"]`).length > 0;

                    if (containsExistingValue) {
                        $dropdown.val(currentValue);
                    } else {
                        const defaultValue = isResidential && isAPT ? aptDefaultValue : '';
                        const containsDefaultValue = $dropdown.find(`option[value="${defaultValue}"]`).length > 0;

                        if (containsDefaultValue) {
                            $dropdown.val(defaultValue);
                        } else {
                            $dropdown.val($dropdown.find('option:first').val());
                        }
                    }
                    $dropdown.customSelect();
                }
            };

            syncDropdown('#Property_PropertyRental_RentalFrequency', 'RentalFrequencies', aptMonthlyFrequencyDefault);
            syncDropdown('#Property_PropertyRental_PriceTypeId', 'RentalPriceQualifiers', aptPerMonthPriceQualifierDefault);
        }
    }
};
