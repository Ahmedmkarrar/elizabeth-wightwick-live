gmgps.cloud.ui.views.offer = function (args) {
    var me = this;

    me.$root = args.$root;

    me.apiService = args.apiService || new gmgps.cloud.services.ApiService();

    me.http = args.http || new gmgps.cloud.http("offer-offer"); // TODO replace other inline constructor calls
    me.$window = null;
    me.$offerPerc = me.$root.find('.offer-perc');
    me.$propertySalePrice = me.$root.find('#Property_PropertySale_Price');
    me.$propertyRentalPrice = me.$root.find('#Property_PropertyRental_Price');
    me.$offerPrice = me.$root.find('#Offer_Amount');
    me.$summary = me.$root.find('#summary');
    //Lease
    me.closeMyWindow = args.closeMyWindow;

    me.currencySymbol = me.$root.find('#_CurrencySymbol').val();
    me.rentalFrequency = me.$root.find('#_RentalFrequency').val();
    me.appDomain = me.$root.find('#_AppDomain').val();
    me.propertyRecordType = me.$root.find('#Property_RecordTypeId').asNumber();
    me.propertyRecordTypeByName = me.propertyRecordType === C.PropertyRecordType.Sale ? "sales" : "lettings";
    me.dealProgressionFollowUpRequired = me.$root.find('#DealProgressionFollowUpDays').val().length !== 0;
    me.id = 0;
    me.propertyId = parseInt(me.$root.find('#Property_Id').val());
    me.isWithdrawOfferAllowed = me.$root.find('#IsWithdrawOfferAvailable').val() === 'True';

    me.originalOffer = 0;
    me.init();
    me.isDirty = false;

    return true;
};

gmgps.cloud.ui.views.offer.typeName = 'gmgps.cloud.ui.views.offer';

gmgps.cloud.ui.views.offer.prototype = {
    init: function () {
        var me = this;

        me.id = parseInt(me.$root.find('#Offer_Id').val());
        me.originalOffer = parseInt(me.$offerPrice.asNumber());
        me.$window = me.$root.closest('.window');

        //Input restrictions.
        me.$root.find('#Offer_Amount').numeric();

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

        me.$root.applyStandardDirtyTriggers({
            onDirty: function () {
                me.setDirty(true);
            }
        });

        me.$root.find('select').customSelect();
        me.$root.find('.timeline-tabs').tabs();

        //Inject user and datetime.
        var $ownership = $(
            '<div class="ownership">' +
            me.$root.find('#ModelUser').val() +
            (me.id == 0
                ? ''
                : '<br/>' + me.$root.find('#ModelDateTime').val()) +
            '</div>'
        );
        me.$window.find('.top').append($ownership);

        var addAcceptRejectButtons = function () {
            me.$window
                .find('.bottom .buttons')
                .prepend(
                    '<div data-pendo="property_offer_reject-' + me.propertyRecordTypeByName + '" class="btn progression-button bgg-red" data-id="' +
                    C.OfferStatus.Rejected +
                    '" style="min-width: 100px; float: left;">Reject Offer</div>'
                )
                .prepend(
                    '<div data-pendo="property_offer_accept-' + me.propertyRecordTypeByName + '" class="btn progression-button bgg-green" data-id="' +
                    C.OfferStatus.Accepted +
                    '" style="min-width: 100px; float: left;">Accept Offer</div>'
                )
                .prepend(
                    '<div data-pendo="property_offer_reset-' + me.propertyRecordTypeByName + '" class="hidden btn progression-button bgg-grey" data-id="' +
                    C.OfferStatus.Unspecified +
                    '" style="min-width: 100px; float: left;">Reset</div>'
                );
        };

        if (me.propertyRecordType === C.PropertyRecordType.Rent){
            const isAlpEnabled = alto.optimizelyClient.isFeatureEnabledForBranch(
                'alto_alp_navigation',
                $('#_groupid').val(),
                $('#_branchid').val()
            );

            if (isAlpEnabled){
                const href = me.appDomain + '/lettings-progression/' + me.propertyId

                me.$window.find('.bottom .buttons').prepend(`
                    <div id="lettings-progressions-button" class="btn grey external">
                        <a href="${href}" target="_blank">Lettings Progressions Beta</a> 
                    </div>
                `);
            }
        }


        if (me.isWithdrawOfferAllowed) {
            me.$window
                .find('.bottom .buttons')
                .prepend(
                    '<div data-pendo="property_offer_withdraw-' + me.propertyRecordTypeByName + '" class="btn progression-button bgg-grey" data-id="' +
                    C.OfferStatus.Withdrawn +
                    '" style="min-width: 100px; float: left;">Withdraw Offer</div>'
                );
        }

        //Inject Offer Buttons (if the offer has a status of Received)
        var originalStatus = parseInt(me.$root.find('#OriginalStatus').val());

        //Status dependent inits.
        var $status;
        switch (originalStatus) {
            //Received
            case C.OfferStatus.Received:
                if (me.id != 0) {
                    $status = $(
                        '<div class="status fg-white" style="background-color: #ff6600;">Received</div>'
                    );
                }

                //Add Accept/Reject buttons for new and existing offers.
                addAcceptRejectButtons();

                me.lock({
                    all: false,
                    applicants: false,
                    step: me.propertyId === 0 ? true : false,
                    notes: false
                });

                break;

            //Accepted
            case C.OfferStatus.Accepted:
                $status = $(
                    '<div class="status bg-green fg-white">Accepted</div>'
                );
                me.showStep(C.OfferStatus.Accepted);
                setTimeout(function () {
                    me.$window.find('.bottom .cancel-button').text('Close');
                }, 100);
                me.lock({
                    all: true
                });

                me.$window
                    .find('#Notes')
                    .val(me.$window.find('#ProgressionNotes').val()); // Notes

                break;

            //Rejected
            case C.OfferStatus.Rejected:
                $status = $(
                    '<div class="status bg-red fg-white">Rejected</div>'
                );
                me.$window.find('.middle .read-only').show();
                me.$window.find('.bottom .action-button').hide();
                setTimeout(function () {
                    me.$window.find('.bottom .cancel-button').text('Close');
                }, 100);
                me.$window
                    .find('.bottom .buttons')
                    .prepend(
                        '<div data-pendo="property_offer_revise-' + me.propertyRecordTypeByName + '" class="btn revise-button bgg-green" style="min-width: 100px; float: left;">Revise Offer</div>'
                    );
                me.lock({
                    all: false,
                    applicants: true,
                    step: true,
                    notes: false
                });
                break;

            //Withdrawn
            case C.OfferStatus.Withdrawn:
                $status = $('<div class="status bg-grey">Withdrawn</div>');
                me.$window.find('.middle .read-only').show();
                me.$window.find('.bottom .action-button').hide();
                setTimeout(function () {
                    me.$window.find('.bottom .cancel-button').text('Close');
                }, 100);
                me.lock({
                    all: false,
                    applicants: true,
                    step: true,
                    notes: false
                });
                break;

            //Revised
            case C.OfferStatus.Revised:
                $status = $('<div class="status bg-khaki">Revised</div>');

                //Disable all window content - offer has been revised.  Also, hide OK and Cancel becomes Close.
                setTimeout(function () {
                    me.$window.find('.bottom .cancel-button').text('Close');
                }, 100);
                break;
        }
        me.$window.find('.top').append($status);

        me.setSalesProgressionConveyancerReferralsMfeVisibility();          

        //Revise button > Click
        me.$window.on('click', '.revise-button', function () {
            $(this).remove();
            me.lock({
                all: false,
                applicant: true,
                step: false,
                notes: false
            });
            addAcceptRejectButtons();
            me.$root
                .find('.notes input[type="checkbox"]')
                .prop('checked', false)
                .trigger('change');
        });

        //Func to setup the applicant auto-completes.
        var setupPropertyAC = function ($e) {
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
                placeholder: 'Search for Property...',
                onSelected: function (args) {
                    var $row = args.$e.closest('.row');

                    me.propertyId = args.id;
                    $row.attr('data-id', args.id);
                    $row.find('input[data-id="property"]').val(args.id);

                    //Also, set the PropertyId hidden input and type
                    me.$root.find('[name="Property.Id"]').val(args.id);
                    me.propertyRecordType = args.udf4;
                    me.$root
                        .find('#Property_RecordTypeId')
                        .val(me.propertyRecordType);
                    me.$root.find('#Property_BranchId').val(args.branchId);
                    me.currencySymbol = args.udf7;
                    me.rentalFrequency = args.udf8;

                    me.showInfo(
                        C.ModelType.Property,
                        args.id,
                        args.value,
                        args.isSetupCallback
                    );
                    if (!args.isSetupCallback) {
                        me.setDirty(true);
                    }

                    //Display the embedded property preview.
                    //  - This also returns pricing information which is needed for percentage calcs and the pie.
                    new gmgps.cloud.http("offer-onSelected").getView({
                        url: 'Property/GetPropertyEmbeddedPreview',
                        post: true,
                        args: { id: args.id },
                        onSuccess: function (response) {
                            //Remove the old property-container and insert the new one.
                            me.$root
                                .find('.property-container .property-preview')
                                .remove();
                            me.$root
                                .find('.property-container .ipe-form')
                                .hide();
                            me.$root
                                .find('.property-container')
                                .append($(response.Data));
                            me.$root
                                .find('.property-container .property-preview')
                                .addClass('ipe-cover');

                            //Set the property prices.
                            me.$propertySalePrice.val(
                                me.$root
                                    .find('.property-container')
                                    .find('#Property_PropertySale_Price_')
                                    .val()
                            );
                            me.$propertyRentalPrice.val(
                                me.$root
                                    .find('.property-container')
                                    .find('#Property_PropertyRental_Price_')
                                    .val()
                            );

                            me.updateOfferPercSliderForAPT();

                            //Show the edit button.
                            me.$root.find('.property-container .ipe').show();

                            me.addFollowUpOwner();

                            me.$followUps
                                .data('followUpDropdown')
                                .setPropertyIds(me.propertyId);
                            me.$followUps
                                .data('followUpDropdown')
                                .setBranchIds(args.branchId);

                            me.lock({
                                all: false,
                                applicants: false,
                                step: false,
                                notes: false
                            });
                        }
                    });

                    // Get the new offer accepted section based on new property
                    new gmgps.cloud.http("offer-onSelected").getView({
                        url: 'Offer/GetOfferAccepted',
                        post: true,
                        args: { propertyid: args.id },
                        onSuccess: function (response) {
                            me.$root
                                .find(
                                    '.offer-accepted-container .offer-accepted'
                                )
                                .remove();
                            me.$root
                                .find('.offer-accepted-container')
                                .append($(response.Data));

                            //Date Pickers
                            me.$root
                                .find('.offer-accepted-container .date-picker')
                                .each(function (i, v) {
                                    $(v).datepicker({
                                        numberOfMonths: 2,
                                        showButtonPanel: true,
                                        dateFormat: 'dd/mm/yy',
                                        minDate:
                                            $(v).attr('data-datePickerMode') ==
                                            'future'
                                                ? new Date()
                                                : null
                                    });
                                });

                            me.$root
                                .find('.offer-accepted-container select')
                                .customSelect();

                            var $thirdButton = me.$window.find('.third-button');

                            if (
                                parseInt(
                                    me.$root.find('#OriginalStatus').val()
                                ) == C.OfferStatus.Received &&
                                me.propertyRecordType ==
                                C.PropertyRecordType.Sale
                            ) {
                                $thirdButton.show();
                                me.$window
                                    .find('.buttons')
                                    .css({ marginRight: '' });
                                $thirdButton.removeClass('grey');
                                $thirdButton.addClass('bgg-property');
                            } else {
                                $thirdButton.hide();
                                me.$window
                                    .find('.buttons')
                                    .css({ marginRight: '7px' });
                            }
                        }
                    });

                    //Show/Hide note sections
                    me.updateNoteSection();
                },
                onRemoved: function () {
                    me.propertyId = 0;
                    me.$root.find('[name="Property.Id"]').val(0);
                    me.cancelFollowUps();
                    me.setDirty(true);
                },
                container: me.$window
            });
        };

        //Func to setup the applicant auto-completes.
        var setupApplicantAC = function ($e) {
            $e.autoCompleteEx({
                modelType: C.ModelType.Contact,
                search: {
                    CategoryIdList: [C.ContactCategory.Client],
                    ApplyFurtherFilteringtoIds: true
                },
                includeContacts: true,
                includeUsers: false,
                placeholder: 'Search for Applicant...',
                onSelected: function (args) {
                    var $row = args.$e.closest('.row');
                    $row.attr('data-id', args.id);
                    $row.find('input[data-id="contactId"]').val(args.id);
                    me.showInfo(
                        C.ModelType.Contact,
                        args.id,
                        args.value,
                        args.isSetupCallback
                    );

                    if (!args.isSetupCallback) {
                        me.setDirty(true);

                        me.addFollowUps(
                            [C.FollowUpType.OfferFollowUpApplicant],
                            C.ModelType.HistoryEvent,
                            me.id,
                            me.propertyId,
                            args.id
                        );
                    }

                    me.refreshSolicitorsList(me.getApplicantSolicitorOptions());
                },
                onRemoved: function (id) {
                    me.removeApplicantInfo(id);
                    me.refreshSolicitorsList(me.getApplicantSolicitorOptions());
                    me.setDirty(true);
                },
                container: me.$window
            });
        };

        //Setup the applicant auto-complete, and optionally, the property one (if no property exists on this offer yet).
        setupApplicantAC(me.$root.find('.applicant-ac'));
        if (parseInt(me.$root.find('#Property_Id').val()) == 0) {
            setupPropertyAC(me.$root.find('.property-ac'));
        }

        //Applicants In-Place Edit > Click
        me.$root.on('click', '.ipe', function () {
            var $ipe = $(this).closest('.ipe-root');
            $(this).hide();
            $ipe.find('.ipe-form').show();
            $ipe.find('.ipe-cover').hide();
        });

        //Add Applicant > Click
        me.$root.on('click', '.applicants .pm-button.plus', function () {
            var $table = me.$root.find('.applicants table');

            if ($table.find('.row').length >= 2) {
                showInfo(
                    'You can choose a maximum of 2 applicants for the offer.',
                    null,
                    parseInt(me.$window.css('z-index')) + 100
                );
                return false;
            }

            var $row = $table.find('.row:last').clone();
            $row.find('.auto-complete').replaceWith(
                me.getNewACHtml(C.ModelType.Contact)
            );
            $table.append($row);
            $row.find('input[data-id="contactId"]').val(0);
            setupApplicantAC($row.find('.applicant-ac'));
            $row.find('select').customSelect();
            me.setDirty(true);
        });

        //Remove Applicant > Click
        me.$root.on('click', '.applicants .pm-button.minus', function () {
            var $row = $(this).closest('.row');
            var id = parseInt($row.find('input[data-id="contactId"]').val());

            var $table = $row.closest('table');
            if ($table.find('.row').length == 1) {
                var $new = $row.clone();
                $row.remove();
                $new.attr('data-id', 0);
                $new.find('.auto-complete').replaceWith(
                    me.getNewACHtml(C.ModelType.Contact)
                );
                $table.append($new);
                $new.find('input[data-id="contactId"]').val('0');
                setupApplicantAC($new.find('.applicant-ac'));
                $new.find('select').customSelect();
            } else {
                $row.remove();
            }
            if (id !== 0) {
                me.removeApplicantInfo(id);
            }

            me.refreshSolicitorsList(me.getApplicantSolicitorOptions());
            me.setDirty(true);
        });

        //Func to refresh the offer pie.
        var getPieColour = function (perc, percRemainder) {
            const intensity = perc > 100 ? 255 : parseInt(225 - percRemainder * 2);
            return intensity == 255
                ? 'rgb(255, 0, 0)'
                : 'rgb({0}, {1}, {2})'.format(
                    intensity - 128,
                    intensity - 64,
                    intensity
                )
        }
        var refreshPie = function (data) {
            me.offerPie = $.plot(me.$root.find('.offer-pie'), data, {
                series: {
                    pie: {
                        innerRadius: 0.5,
                        show: true,
                        radius: 1,
                        label: {
                            show: false
                        }
                    }
                },
                legend: {
                    show: false
                }
            });
        };

        //Progression Buttons > Click
        me.$window.on('click', '.progression-button', function () {
            var $button = $(this);
            var offerStatusId = parseInt($(this).attr('data-id'));

            //Validate first, before progressing (except when undo-ing acceptance)
            if (
                offerStatusId !== C.OfferStatus.Unspecified &&
                offerStatusId !== C.OfferStatus.Withdrawn
            ) {
                if (!me.validate()) return false;
            }

            var buttonText = $button.text();

            var completeOffer = function () {
                var $step = me.$root.find(
                    '.step[data-id="{0}"]'.format(offerStatusId)
                );

                //Get the offer amount from the textbox.
                var offerAmount = me.$offerPrice.val();

                //For rentals, add the price type as a suffix.
                if (me.propertyRecordType == C.PropertyRecordType.Rent) {
                    offerAmount += ' {0}'.format(me.rentalFrequency);
                }

                //Apply the offer amount so that it's visible.
                $step.find('.offer-amount').text(offerAmount);

                me.setDirty(true);

                me.lock({
                    all: false,
                    applicants: true,
                    step: false,
                    notes: false
                });

                //Hide this progression button and show the others.
                me.$window.find('.progression-button').show();
                $button.hide();

                var desc;
                switch (offerStatusId) {
                    case C.OfferStatus.Unspecified:
                        // we are  undo-ing either acceptance or rejection, so add back in owner followup if an unsaved offer
                        if (me.id === 0) {
                            me.addFollowUpOwner();
                        }
                        break;

                    case C.OfferStatus.Accepted:
                        desc = 'Acceptance';

                        //Rentals only.
                        if (
                            me.propertyRecordType == C.PropertyRecordType.Rent
                        ) {
                            //Default to "Not Looking" for the new intention of the applicant.
                            me.$root
                                .find('#AcceptNewApplicantIntention')
                                .val(C.ClientIntentionType.NotLooking)
                                .trigger('prog-change');
                            me.$root
                                .find('#Property_PropertyRental_Status')
                                .val(C.RentStatus.LetAgreed)
                                .trigger('prog-change');
                        }

                        me.setupFollowUpsAO();
                        me.setupSolicitors();

                        // if we are accepting before having even saved offer, then remove followup to owner
                        if (me.id === 0) {
                            me.removeFollowUpOwner();
                        }

                        me.$window.find('.third-button').hide();
                        me.$window.find('.buttons').css({ marginRight: '7px' });

                        break;
                    case C.OfferStatus.Rejected:
                        desc = 'Rejection';
                        me.$window.find('.third-button').hide();
                        me.$window.find('.buttons').css({ marginRight: '7px' });

                        me.cancelAOFollowUps();

                        // if we are rejecting before having even saved offer, then remove followup to owner
                        if (me.id === 0) {
                            me.removeFollowUpOwner();
                        }

                        break;
                    case C.OfferStatus.Withdrawn:
                        desc = 'Withdrawal';
                        break;
                }

                if (offerStatusId !== C.OfferStatus.Unspecified) {
                    //Show the "Reset" button.
                    me.$window
                        .find(
                            '.progression-button[data-id="' +
                            C.OfferStatus.Unspecified +
                            '"]'
                        )
                        .text('Undo ' + desc)
                        .show();
                }

                //Set the progression status.
                me.$root.find('#ProgressionStatus').val(offerStatusId);

                //Show the step.
                me.$root.find('.step').hide();

                if (
                    buttonText === 'Undo Acceptance' ||
                    buttonText === 'Undo Rejection'
                ) {
                    const $thirdButton = me.$window.find('.third-button');
                    if (me.propertyRecordType == C.PropertyRecordType.Sale) {
                        $thirdButton.show();
                        me.$window.find('.buttons').css({ marginRight: '' });
                        $thirdButton.removeClass('grey');
                        $thirdButton.addClass('bgg-property');
                    } else {
                        $thirdButton.hide();
                        me.$window.find('.buttons').css({ marginRight: '7px' });
                    }                    

                    if (buttonText === 'Undo Acceptance') {
                        me.cancelAOFollowUps();
                    }
                }

                //If the offer is new, allow editing.  If not, lock editing.
                if (me.id === 0) {
                    $step.find('.ipe').hide();
                } else {
                    $step.find('.ipe').hide();
                }

                $step.fadeIn(250);

                if (
                    parseInt(
                        me.$root.find('#OriginalStatus').val()
                    ) == C.OfferStatus.Received &&
                    me.propertyRecordType ==
                    C.PropertyRecordType.Sale
                ) {
                    me.$root.find('.applicantSolicitorContainer > .col-2 > span').attr('data-pendo','property_offer-applicant-solicitor');
                }
            };

            //Only run Money Laundering Check on "Accept offer"!
            if (offerStatusId === C.OfferStatus.Accepted) {
                // a previously created offer, now being accepted needs to be saved first
                if (me.isDirty && me.id !== 0) {
                    ShowAreYouSure(
                        'Save',
                        'Before you can Accept the offer, it must first be saved, would you like to save this offer?',
                        function () {
                            me.action(
                                function () {
                                    me.closeMyWindow();
                                },
                                null,
                                false
                            );
                        }
                    );

                    return void 0;
                }

                //get a list of applicants ready for the Money Laundering check
                var applicantIds = new Array();

                me.$root
                    .find('.applicants input[data-id="contactId"]')
                    .each(function (i, $input) {
                        applicantIds.push($($input).val());
                    });

                var progressionStatus = parseInt(
                    me.$root.find('#ProgressionStatus').val()
                );
                var isAcceptAction = progressionStatus === C.OfferStatus.Received; //checking if we're accepting the offer or just saving it

                //do the money checks for the applicants if accepted.
                var moneyLaunderingCheckVisibility = me.$root
                    .find('#MoneyLaunderingCheckVisibility')
                    .val();
                var excludeApplicantsFromMoneyLaunderingChecks = me.$root
                    .find('#ExcludeApplicantsFromMoneyLaunderingChecks')
                    .val();

                new gmgps.cloud.ui.views.moneyLaunderingCheck({
                    $root: me.$root,
                    propertyId: me.propertyId,
                    callBack: completeOffer,
                    applicantIds: applicantIds,
                    pendoTag: 'offer-id-order-checks',
                    checkType: moneyLaunderingCheckVisibility,
                    excludeApplicantFromChecks: excludeApplicantsFromMoneyLaunderingChecks,       
                    offerView: me,
                    isAcceptAction: isAcceptAction
                });
            } else {
                completeOffer();
            }
        });

        //Offer IPE > Click (return to offer details)
        me.$root.on('click', '.ipe-offer', function () {
            me.$root.find('.step').hide();
            me.$root
                .find('.step[data-id="' + C.OfferStatus.Unspecified + '"]')
                .fadeIn(500);

            //Clear the progression status.
            me.$root.find('#ProgressionStatus').val(C.OfferStatus.Unspecified);

            //Re-enable the progression buttons.
            me.$window
                .find('.progression-button')
                .prop('disabled', false)
                .removeClass('disabled');
        });

        //OfferAmount > KeyUp
        me.$root.on('keyup pseudo-keydown', '#Offer_Amount', function () {
            var offer = parseInt($(this).asNumber());
            var price =
                me.propertyRecordType == C.PropertyRecordType.Sale
                    ? parseInt(me.$propertySalePrice.val())
                    : parseInt(me.$propertyRentalPrice.val());
            var perc = (offer / price) * 100;
            var percRemainder = 100 - perc;
            var pieColour = getPieColour(perc, percRemainder);
            if (!isNaN(offer)) {
                refreshPie([
                    {
                        data: perc,
                        color: pieColour
                    },
                    { data: percRemainder, color: '#d8d8d8' }
                ]);
                me.$offerPerc.text(perc.toFixed(1) + '%');
                me.$root.find('.perc-slider').slider('value', perc);
                me.updateSummary();
            }
        });

        //Offer Amount Slider.
        me.$root.find('.perc-slider').slider({
            animate: true,
            range: false,
            min: 50,
            max: me.isOfferForAPTResidentialProperty() ? 100 : 120,
            value: 100,
            slide: function (event, ui) {
                var progressionStatus = parseInt(
                    me.$root.find('#ProgressionStatus').val()
                );
                if (
                    me.propertyId === 0 ||
                    progressionStatus === C.OfferStatus.Withdrawn
                )
                    return false;

                var perc = ui.value;
                var percRemainder = 100 - perc;
                var price =
                    me.propertyRecordType == C.PropertyRecordType.Sale
                        ? parseInt(
                            (parseInt(me.$propertySalePrice.val()) * perc) /
                            100
                        )
                        : parseInt(
                            (parseInt(me.$propertyRentalPrice.val()) * perc) /
                            100
                        );
                me.$offerPrice.val(price);
                me.$offerPerc.text(perc.toFixed(1) + '%');
                const pieColour = getPieColour(ui.value, percRemainder);
                refreshPie([
                    {
                        data: perc,
                        color: pieColour
                    },
                    { data: percRemainder, color: '#d8d8d8' }
                ]);
                me.$offerPrice.val(
                    $.formatNumber(price, {
                        format: '{0}#,###'.format(me.currencySymbol),
                        locale: 'gb'
                    })
                );
            },
            stop: function (event, ui) {
                var progressionStatus = parseInt(
                    me.$root.find('#ProgressionStatus').val()
                );
                if (
                    me.propertyId === 0 ||
                    progressionStatus === C.OfferStatus.Withdrawn
                )
                    return false;

                var perc = ui.value;
                var price =
                    me.propertyRecordType == C.PropertyRecordType.Sale
                        ? parseInt(
                            (parseInt(me.$propertySalePrice.val()) * perc) /
                            100
                        )
                        : parseInt(
                            (parseInt(me.$propertyRentalPrice.val()) * perc) /
                            100
                        );
                me.$offerPrice.val(
                    $.formatNumber(price, {
                        format: '{0}#,###'.format(me.currencySymbol),
                        locale: 'gb'
                    })
                );
                me.$offerPerc.text(perc.toFixed(1) + '%');
                me.updateSummary();
                me.setDirty(true);
            }
        });

        //Set defaults.
        if (me.id == 0) {
            //New
            me.$offerPrice.val(me.currencySymbol);
            refreshPie([
                { data: 100, color: '#d8d8d8' },
                { data: 0, color: '#00abea' }
            ]);
        } else {
            setTimeout(function () {
                //Edit
                me.$root.find('#Offer_Amount').trigger('pseudo-keydown');
            }, 100);
        }

        //Select the first tab - This Offer's History, or the Property history if it's a new offer.
        me.$root
            .find('.timeline-tabs')
            .tabs('option', 'active', me.id != 0 ? '#tab-1' : '#tab-2');

        //Disable the save button.
        me.$window.find('.bottom .action-button').addClass('disabled');

        //FollowUp Select
        me.$followUps = me.$root.find('.followups').followUpDropdown({
            //adderColor: '#363636'
            linkedType: C.ModelType.HistoryEvent,
            linkedId: me.id,
            display: 'normal'
        });

        me.updateNoteSection();

        // add pendo data attributes to default buttons
        me.$window.find('.bottom .buttons .cancel-button').attr('data-pendo', 'property_offer_cancel-' + me.propertyRecordTypeByName);
        me.$window.find('.bottom .buttons .action-button').attr('data-pendo', 'property_offer_save-' + me.propertyRecordTypeByName);
        me.$window.find('.bottom .buttons .third-button').attr('data-pendo', 'property_offer_chain-' + me.propertyRecordTypeByName);
    },

    setupFollowUpsAO: function () {
        var me = this;

        if (!me.dealProgressionFollowUpRequired) return;

        me.addFollowUps(
            [C.FollowUpType.DealProgressionReview],
            C.ModelType.ChainLink,
            0,
            me.propertyId,
            0,
            me.$followUps
        );
    },

    onReady: function () {
        var me = this;
        var $thirdButton = me.$window.find('.third-button');

        const originalStatus = parseInt(me.$root.find('#OriginalStatus').val());

        if (
            (originalStatus == C.OfferStatus.Received ||
                originalStatus == C.OfferStatus.Withdrawn) &&
            me.propertyRecordType == C.PropertyRecordType.Sale
        ) {
            $thirdButton.removeClass('grey');
            $thirdButton.addClass('bgg-property');
        } else {
            $thirdButton.hide();
            me.$window.find('.buttons').css({ marginRight: '7px' });
        }
    },

    setDirty: function (dirty) {
        var me = this;
        me.isDirty = dirty;
        if (dirty) {
            me.$window.find('.bottom .action-button').removeClass('disabled');
        } else {
            me.$window.find('.bottom .action-button').addClass('disabled');
        }
    },

    //Lock/Unlock the whole or parts of the form.
    // - params: all, applicants, step, notes
    lock: function (args) {
        var me = this;

        //AD-4605: Ensure text is black on disabled inputs to make easier to read
        var addImportantstyle = function (i, s) {
            return s + 'color:#000 !important;';
        };
        var removeImportantstyle = function (i, s) {
            return s !== undefined
                ? s.replace('color:#000 !important;', '')
                : s;
        };

        //Whole form.
        if (args.all == true) {
            me.$window
                .find('.middle input, .middle textarea, .middle select')
                .attr('disabled', 'disabled')
                .attr('style', addImportantstyle);

            me.$window
                .find('.middle .customStyleSelectBox')
                .addClass('disabled')
                .attr('style', addImportantstyle);

            me.$window.find('.bottom .action-button').hide();
        } else {
            me.$window.find('.middle .read-only').hide();
            me.$window.find('.bottom .action-button').show().text('Save');
            me.$window.find('.bottom .cancel-button').show().text('Cancel');
        }

        //Parts of form.
        if (args.applicants || args.all == true) {
            me.$root.find('.applicants .ipe').hide();
        } else {
            me.$root.find('.applicants .ipe').show();
        }
        if (args.step || args.all == true) {
            me.$root.find('.step .ipe').hide();

            me.$window
                .find('.step input, .step textarea, .step select')
                .attr('disabled', 'disabled')
                .attr('style', addImportantstyle);

            me.$window
                .find('.step .customStyleSelectBox')
                .addClass('disabled')
                .attr('style', addImportantstyle);
        } else {
            me.$root.find('.step .ipe').show();

            me.$window
                .find('.step input, .step textarea, .step select')
                .removeAttr('disabled')
                .attr('style', removeImportantstyle);

            me.$window
                .find('.step .customStyleSelectBox')
                .removeClass('disabled')
                .attr('style', removeImportantstyle);
        }
        if (args.notes || args.all == true) {
            me.$window
                .find('.notes input, .notes textarea, .notes select')
                .attr('disabled', 'disabled')
                .attr('style', addImportantstyle);

            me.$window
                .find('.notes .customStyleSelectBox')
                .addClass('disabled')
                .attr('style', addImportantstyle);
        } else {
            me.$window
                .find('.notes input, .notes textarea, .notes select')
                .removeAttr('disabled')
                .attr('style', removeImportantstyle);

            me.$window
                .find('.notes .customStyleSelectBox')
                .removeClass('disabled')
                .attr('style', removeImportantstyle);
        }
    },

    //Show offer step (accept/reject/withdraw).
    showStep: function (id) {
        var me = this;
        me.$root.find('.step').hide();
        var $step = me.$root.find('.step[data-id="' + id + '"]'); //FF errors here with:  NS_ERROR_FAILURE: Component returned failure code
        $step.show();
    },

    showInfo: function (modelType, id, label) {
        var me = this;

        var $tabs = me.$root.find('.timeline-tabs');

        //Label concat.
        if (label.length > 20) {
            label = label.substring(0, 20) + '...';
        }

        //Checks (contacts only - only one property allowed on an offer).
        if (modelType == C.ModelType.Contact) {
            if (
                me.$root.find('input[data-id="contactId"][value="' + id + '"]')
                    .length == 2
            ) {
                me.$root
                    .find('input[data-id="contactId"][value="' + id + '"]:last')
                    .closest('.row')
                    .find('.pm-button')
                    .trigger('click');
                showInfo('That applicant is already listed.');
                return false;
            }
        }

        //Add tab for property or contact.
        var tabId = 'tab-{0}-{1}'.format(modelType, id);
        var $tab = $(
            '<li><a href="{0}"><span class="{1}">{2}</span></a></li>'.format(
                '#' + tabId,
                modelType == C.ModelType.Contact ? 'fg-contact' : 'fg-property',
                modelType == C.ModelType.Contact
                    ? 'Offers: ' + label
                    : 'Property Offer History'
            )
        );
        $tabs.find('.ui-tabs-nav').append($tab);
        $tabs.append('<div id="{0}"></div>'.format(tabId));
        $tabs.removeClass('hidden');
        $tabs.tabs('refresh');

        var args = {
            search: {
                EventTypesList: [{ Key: C.EventType.Offer, Value: [0] }],
                ContactId: modelType == C.ModelType.Contact ? id : null,
                PropertyId: modelType == C.ModelType.Property ? id : null,
                ContextModelType: modelType,
                SearchPage: {
                    Index: 1,
                    Size: 0 //#todo check 0 is unlim
                },
                SearchOrder: {
                    By: C.SearchOrderBy.StartDate,
                    Type: C.SearchOrderType.Descending
                }
            },
            settings: {
                ShowHeader: false,
                ShowFooter: false,
                NoScroll: false,
                StyleClass: 'info'
            }
        };

        //Post data to server.
        new gmgps.cloud.http("offer-showInfo").ajax(
            {
                args: args,
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/diary/gettimeline'
            },
            function (response) {
                me.$root.find('#' + tabId).html(response.Data);
                $tab.trigger('click');
            }
        );

        return true;
    },

    removeApplicantInfo: function (id) {
        var me = this;

        var $dropdown = me.$followUps.data('followUpDropdown');

        $dropdown.cancelFollowUps({ contactId: id });

        // remove the id from the <tr> for the applicant

        me.$root
            .find('.applicants .row[data-id="' + id + '"]')
            .attr('data-id', 0);
        var $tabs = me.$root.find('.timeline-tabs');
        var elemId = 'tab-{0}-{1}'.format(C.ModelType.Contact, id);

        $tabs.find('li[aria-controls="{0}"]'.format(elemId)).remove();
        $tabs.find('#' + elemId).remove();
        $tabs.tabs('refresh');

        //All tabs removed?
        if ($tabs.find('.ui-tabs-nav li').length === 0) {
            $tabs.addClass('hidden');
        }
    },

    getNewACHtml: function (modelType) {
        if (modelType == C.ModelType.Contact) {
            return '<input type="text" class="applicant-ac" style="width: 181px;" data-id="0"/>';
        }
    },

    updateSummary: function () {
        var me = this;
        var price =
            me.propertyRecordType == C.PropertyRecordType.Sale
                ? parseInt(me.$propertySalePrice.val())
                : parseInt(me.$propertyRentalPrice.val());
        var offer = parseInt(me.$offerPrice.asNumber());
        var perc = (offer / price) * 100;
        var percRemainder = 100 - perc;
        var priceF = $.formatNumber(price, {
            format: '{0}#,###'.format(me.currencySymbol),
            locale: 'gb'
        });
        var s = '';

        //Quit if the perc is less than 11.  If it is, the user is probably still typing.
        if (perc < 11) {
            me.$summary.html('');
            return false;
        }

        if (offer == price) {
            //Same
            s +=
                'The offer is <span class="bold">Equal</span> to the asking price of ' +
                priceF;
        } else {
            if (offer > price) {
                //Higher
                s +=
                    'The offer is <span class="bold" style="color: #eb3d35; font-size: 14px;">' +
                    $.formatNumber(offer - price, {
                        format: '{0}#,###'.format(me.currencySymbol),
                        locale: 'gb'
                    }) +
                    ' ' +
                    (me.propertyRecordType == C.PropertyRecordType.Sale
                        ? ''
                        : me.rentalFrequency) +
                    ' (' +
                    (percRemainder * -1).toFixed(1) +
                    '%) Higher</span></br>than the asking price of ' +
                    priceF +
                    ' ' +
                    (me.propertyRecordType == C.PropertyRecordType.Sale
                        ? ''
                        : me.rentalFrequency);
            } else {
                //Lower
                s +=
                    'The offer is <span class="bold" style="color: #00abea; font-size: 14px;">' +
                    $.formatNumber(price - offer, {
                        format: '{0}#,###'.format(me.currencySymbol),
                        locale: 'gb'
                    }) +
                    ' ' +
                    (me.propertyRecordType == C.PropertyRecordType.Sale
                        ? ''
                        : me.rentalFrequency) +
                    ' (' +
                    percRemainder.toFixed(1) +
                    '%) Lower</span></br>than the asking price of ' +
                    priceF +
                    ' ' +
                    (me.propertyRecordType == C.PropertyRecordType.Sale
                        ? ''
                        : me.rentalFrequency);
            }
        }

        me.$summary.html(s);
    },

    destroy: function () {
        var me = this;
        me.$root.empty().unbind();
    },

    action: function (onComplete, $item, storeLetterPromptUpdateEvents) {
        var me = this;
        var progressionStatus = parseInt(
            me.$root.find('#ProgressionStatus').val()
        );

        if (!me.validate()) return false;

        //Func to save the offer.
        var save = function () {
            var saveBody = function () {
                me.$window.find('.action-button').lock();

                var isNewOffer = me.id === 0;

                var $form = createForm(me.$root, '/offer/updateoffer');

                //Stop any updatable items from updating.
                me.$root.find('.opt-u').removeClass('opt-u');

                reindexHtmlArray($form, '.applicants .row');
                $form.find(':disabled').removeAttr('disabled');

                me.http.postForm(
                    $form,
                    function (response) {
                        var offer = response.Data.Offer;
                        me.id = offer.Id;

                        if (onComplete) {
                            onComplete();
                        }

                        // remove various followups here from dropdown to stop them saving - we're going to handle
                        // updates to them server-side

                        // set any applicant follow up state to cancelled if we're withdrawing offer
                        if (offer.Status === C.OfferStatus.Withdrawn) {
                            me.removeFollowUpTypes(
                                offer.Id,
                                C.ModelType.HistoryEvent,
                                [C.FollowUpType.OfferFollowUpApplicant]
                            );

                            // if there is a C.FollowUpType.OfferFollowUpOwner which has already been completed, this needs resetting to in progress
                            // as it will now be converted to a 'Notify Owner of Withdrawal'
                            me.resetCompleteOfferFollowUpOwner();
                        }

                        // set any outstanding Offer Followups to owners as cancelled - they've rejected
                        if (
                            offer.Status === C.OfferStatus.Rejected ||
                            offer.Status === C.OfferStatus.Accepted
                        ) {
                            me.removeFollowUpTypes(
                                offer.Id,
                                C.ModelType.HistoryEvent,
                                [C.FollowUpType.OfferFollowUpOwner]
                            );
                        }

                        // set any outstanding Offer Followups to applicants as cancelled - they've revised and there will be a new offer created
                        if (
                            offer.Status === C.OfferStatus.Received &&
                            offer.SubType === C.EventSubType.OfferRevised
                        ) {
                            me.removeFollowUpTypes(
                                offer.OriginatingEventId,
                                C.ModelType.HistoryEvent,
                                [
                                    C.FollowUpType.OfferFollowUpApplicant,
                                    C.FollowUpType.OfferFollowUpOwner
                                ]
                            );
                        }

                        // save what's left
                        me.saveFollowUps(response.Data, isNewOffer);

                        if (storeLetterPromptUpdateEvents) {
                            me.letterPromptUpdatevents = response.UpdatedEvents;
                            return;
                        }
                        //Prompt for letters.
                        gmgps.cloud.helpers.general.promptForLetters({
                            eventHeaders: response.UpdatedEvents
                        });

                        //unlock form
                        me.$window.find('.action-button').unlock();
                        me.setDirty(false);
                    },
                    function () {
                        //error
                        //unlock form
                        me.$window.find('.action-button').unlock();
                        me.setDirty(false);
                    }
                );
            };

            if (progressionStatus === C.OfferStatus.Withdrawn) {
                saveBody();
            } else {
                // if solicitors doenst exist then just call save, however it they do exist call the save solicitor process, which will call back to the save process.
                if (me.$root.find('#BuyerSolicitorContactId').length == 0) {
                    saveBody();
                } else {
                    me.saveNewSolicitorToContact(saveBody);
                }
            }
        };

        //Prep
        me.$root.find('#ProgressionNotes').val(
            me.$root
                .find('.step[data-id="' + progressionStatus + '"]')
                .find('#Notes')
                .val()
        ); //Notes
        switch (progressionStatus) {
            case C.OfferStatus.Unspecified:
                break;
            case C.OfferStatus.Accepted:
                break;
            case C.OfferStatus.Rejected:
                break;
            case C.OfferStatus.Withdrawn:
                break;
        }

        var args = {
            applicantId: parseInt(
                me.$root.find('.applicants .row:first').attr('data-id')
            ),
            propertyId: me.propertyId
        };
        if ($item === "amlPopupAlreadyDisplayed") {
            gmgps.cloud.queries.property
                .applicantDoesNotHaveExistingOffer(args)                
                .then(() => me.checkDepositDoesNotExceedLegalLimit())
                .then(() => me.checkOfferAmountRevised())
                .then(() => {
                    save();
                    return true;
                })
                .catch(() => {
                    return false;
                });
        }
        else {
            gmgps.cloud.queries.property
                .applicantDoesNotHaveExistingOffer(args)
                .then(() => me.checkApplicantsMeetIdCheckRequirement(progressionStatus))
                .then(() => me.checkDepositDoesNotExceedLegalLimit())
                .then(() => me.checkOfferAmountRevised())
                .then(() => {
                    save();
                    return true;
                })
                .catch(() => {
                    return false;
                });
        }
    },

    checkApplicantsMeetIdCheckRequirement: function (progressionStatus) {
        //Any applicant require id check?
        var me = this;
        var deferred = Q.defer();
        const groupId = $('#_groupid').val();

        if (progressionStatus == C.OfferStatus.Withdrawn || progressionStatus == C.OfferStatus.Rejected) {
            return deferred.resolve();
        }

        var isNonOwnerIdCheckFeatureEnabled = alto.optimizelyClient.isFeatureEnabledForGroup('keyflo_non_owner_id_check', groupId);
        if (!isNonOwnerIdCheckFeatureEnabled) {
            return deferred.resolve();
        }

        const isIdCheckModuleEnabled = gmgps.cloud.ui.views.moneyLaunderingCheck.isIdCheckModuleEnabled();
        if (!isIdCheckModuleEnabled) {
            return deferred.resolve();
        }

        var moneyLaunderingCheckVisibility = me.$root
            .find('#MoneyLaunderingCheckVisibility')
            .val();


        // Not mandatory for adding new offer
        if (moneyLaunderingCheckVisibility == C.MoneyLaunderingCheckOptions.Mandatory) { //in case we are just saving, there is no "mandatory" check
            moneyLaunderingCheckVisibility = C.MoneyLaunderingCheckOptions.Show;
        }

        new gmgps.cloud.ui.views.moneyLaunderingCheck({
            $root: me.$root,
            propertyId: me.propertyId,
            callBack: function () {
                deferred.resolve();
            },
            applicantIds: me.getApplicantIds(),
            checkType: moneyLaunderingCheckVisibility,
            pendoTag: 'offers-id-order-checks',            
        });

        return deferred.promise;
    },

    setSalesProgressionConveyancerReferralsMfeVisibility: function () {
        var me = this;
        var contactId = me.getPropertyOwnerIds()[0];
        var btnAddProperty = me.$root.find('.btn-conveyancer-referrals');

        if (btnAddProperty.length > 0) {
            var lookupUrl = btnAddProperty.attr("data-conveyancer-referrals");
            btnAddProperty.attr("href", lookupUrl + contactId);
        }
    },

    checkOfferAmountRevised: function () {
        //Has an existing offer been revised?

        var me = this;
        var deferred = Q.defer();

        var offer = parseInt(me.$offerPrice.asNumber());
        if (offer !== me.originalOffer && me.id !== 0) {
            //Revised offer.
            showDialog({
                type: 'question',
                title: 'Offer Revised',
                msg: 'The offer amount has been revised.<br/><br/>Please specify the reason.',
                buttons: {
                    'Revised offer from applicant': function () {
                        //Revised Offer - Set the originatingHistoryEventId to this one and set this one to zero.
                        me.$root
                            .find('#ProgressionStatus')
                            .val(C.OfferStatus.Received);
                        me.$root.find('#Offer_Id').val(0);

                        //Set
                        me.$root
                            .find('#Offer_OriginatingEventCategory')
                            .val(C.EventCategory.History);
                        me.$root.find('#Offer_OriginatingEventId').val(me.id);
                        $(this).dialog('close');
                        deferred.resolve();
                    },
                    'Previously incorrect amount': function () {
                        //Amendment
                        me.$root
                            .find('#ProgressionStatus')
                            .val(C.OfferStatus.Received);
                        $(this).dialog('close');
                        deferred.resolve();
                    }
                }
            });
        } else {
            //New offer.
            return deferred.resolve();
        }
        return deferred.promise;
    },

    action2: function () {
        var me = this;
        me.loadChainBuilder();
    },

    cancel: function (onComplete) {
        onComplete();
    },

    validate: function () {
        var me = this;
        var valid = true;

        //Check that a property been selected.
        if (me.propertyId === 0) {
            showInfo('Please specify a property for the offer.');
            valid = false;
        }
        if (!valid) return;

        //Check that at least one applicant has been selected.

        if (
            parseInt(
                me.$root.find('.applicants .row:first').attr('data-id')
            ) === 0
        ) {
            showInfo('Please specify an applicant for the offer.');
            valid = false;
        }

        if (!valid) return;

        // Check that offer amount is not greater than the asking price for rentals that are Assured Periodic Tenancies
        
        if (me.isOfferForAPTResidentialProperty()) {
            var askingPrice = parseInt(me.$propertyRentalPrice.val(), 10);
            var offerAmount = parseInt(me.$offerPrice.asNumber(), 10);
            if (offerAmount > askingPrice) {
                showInfo('The offer amount cannot be greater than the asking price.');
                valid = false;
            }
        }

        if (!valid) return;

        //Init validation engine.
        me.$root.addClass('opt-validate').validationEngine({ scroll: false });
        valid = me.$root.validationEngine('validate');
        if (!valid) return;

        return valid;
    },

    isOfferForAPTResidentialProperty: function () {
        const groupId = $('#_groupid').val();
        const propertyRecordTypeId = parseInt(this.$root.find('#Property_RecordTypeId').asNumber(), 10);
        var propertyCategoryTypeId;
        var isPropertyContractTypeApt;
        var $preview = this.$root.find('.property-container .property-preview');
        if ($preview.length) {
            propertyCategoryTypeId = parseInt($preview.find('#PropertyEmbeddedPreview_CategoryId').val() || 0, 10);
            isPropertyContractTypeApt = $preview.find('#PropertyEmbeddedPreview_ContractTypeIsAPT').val() === 'True';
        } else {
            propertyCategoryTypeId = parseInt(this.$root.find('#Property_CategoryId').asNumber(), 10);
            isPropertyContractTypeApt = this.$root.find('#Property_ContractTypeIsAPT').val() === 'True';
        }
        return alto.optimizelyClient.isFeatureEnabledForGroup('assured_periodic_tenancies', groupId)
            && propertyRecordTypeId == C.PropertyRecordType.Rent
            && propertyCategoryTypeId == C.PropertyCategoryType.Residential
            && isPropertyContractTypeApt;
    },

    updateOfferPercSliderForAPT: function () {
        var me = this;
        var $slider = me.$root.find('.perc-slider');
        if (!$slider.length || !$slider.data('ui-slider')) return;
        var max = me.isOfferForAPTResidentialProperty() ? 100 : 120;
        var totalSegments = max === 100 ? 5 : 7;
        var totalWidth = 500;
        var $scale = this.$root.find('.perc-slider').siblings('.scale');
        if (!$scale.length) $scale = this.$root.find('.scale').first();
        $scale.empty();
        for (var x = 50, i = 0; x <= max; x += 10, i++) {
            var positionLeft = (i * totalWidth) / totalSegments;
            $scale.append($('<div class="line" style="left: ' + positionLeft + 'px;"></div>'));
            $scale.append($('<div class="legend" style="left: ' + positionLeft + 'px;">' + x + '%</div>'));
        }
        $slider.slider('option', 'max', max);
        var $offerAmount = me.$root.find('#Offer_Amount');
        if ($offerAmount.val()) {
            $offerAmount.trigger('keyup');
        }
    },

    applyToolTip: function ($dropDown) {
        $dropDown.qtip({
            content: $dropDown.find('option:selected').text(),
            position: {
                my: 'top middle',
                at: 'bottom middle'
            },
            show: {
                event: 'mouseenter',
                delay:
                    $dropDown.data('delay') == undefined
                        ? 0
                        : $dropDown.data('delay'),
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

    setupSolicitors: function () {
        var me = this;
        me.setupSolicitorList(me.getApplicantSolicitorOptions());
        me.setupSolicitorList(me.getVendorSolicitorOptions());
    },

    getApplicantSolicitorOptions: function () {
        var me = this;

        return {
            getContactList: function () {
                var contactIds = new Array();

                me.$root
                    .find('.applicants input[data-id="contactId"]')
                    .each(function (i, $input) {
                        contactIds[i] = $($input).val();
                    });
                return contactIds;
            },
            dropDownSelect: '#BuyerSolicitorContactId',
            solicitorSearchContainer: '.applicantSolicitorSearchContainer',
            solicitorSearch: '#BuyerSolicitorSearch'
        };
    },

    getApplicantIds: function () {
        var me = this;
        var contactIds = [];
        var $applicantContacts = me.$root.find(
            '.applicants table.records tr.row[data-id!="0"]'
        );

        $.each($applicantContacts, function () {
            contactIds.push(parseInt($(this).attr('data-id')));
        });

        return contactIds;
    },
    getPropertyOwnerIds: function () {
        var me = this;
        var contactIds = [];

        me.$root
            .find('.owners .owner[data-modelTypeid="103"]')
            .each(function (i, v) {
                contactIds.push(parseInt($(v).attr('data-id')));
            });

        return contactIds;
    },

    getVendorSolicitorOptions: function () {
        var me = this;

        return {
            getContactList: function () {
                var contactIds = new Array();

                me.$root
                    .find('.property-preview .fg-contact')
                    .each(function (i, $div) {
                        contactIds[i] = $($div).attr('data-id');
                    });

                return contactIds;
            },
            dropDownSelect: '#VendorSolicitorContactId',
            solicitorSearchContainer: '.VendorSolicitorSearchContainer',
            solicitorSearch: '#VendorSolicitorSearch'
        };
    },

    setupSolicitorList: function (options) {
        var me = this;
        var $dropDown = me.$root.find(options.dropDownSelect);
        if ($dropDown.length == 0) return;

        $dropDown.on('change', function () {
            if ($dropDown.val() == null || $dropDown.val() == undefined) return;
            if ($dropDown.val() == '0') {
                me.applySolicitorSearchBox(options);
                me.$root.find(options.solicitorSearchContainer).show();
                focusWithGlow(me.$root.find(options.solicitorSearch));
                me.applyToolTip($dropDown);
                return;
            } else {
                me.$root.find(options.solicitorSearchContainer).hide();
                me.applyToolTip($dropDown);
                return;
            }
        });

        me.refreshSolicitorsList(options);
    },

    applySolicitorSearchBox: function (options) {
        var me = this;
        var $dropDown = me.$root.find(options.dropDownSelect);
        var $searchBox = me.$root.find(options.solicitorSearch);

        var $searchBoxCancelButton = me.$root
            .find(options.solicitorSearchContainer)
            .find('.cancel');
        if ($searchBoxCancelButton.length > 0) {
            $searchBoxCancelButton.click();
            return;
        }

        $searchBox.autoCompleteEx({
            modelType: C.ModelType.Contact,
            search: {
                CategoryIdList: [C.ContactCategory.Solicitor],
                ApplyFurtherFilteringtoIds: true,
                FullQuery: true
            },
            allowCreate: false,
            includeContacts: true,
            includeUsers: false,
            placeholder: 'Search for Solicitor...',
            newContactCategory: C.ContactCategory.Solicitor,
            onSelected: function (args) {
                $dropDown.find('option').removeAttr('selected');

                if (
                    $dropDown.find("option[value='" + args.id + "']").length > 0
                ) {
                    $dropDown
                        .find("option[value='" + args.id + "']")
                        .attr('selected', 'selected');
                    $dropDown.trigger('change');
                    return;
                }

                $dropDown.append(
                    '<option value="' +
                    args.id +
                    '" selected="selected" >' +
                    args.value +
                    '</option>'
                );
                $dropDown.trigger('prog-change');
                me.$root.find(options.solicitorSearchContainer).hide();
                me.applyToolTip($dropDown);
            },
            onRemoved: function () {
                me.setDirty(true);
            }
        });
    },

    refreshSolicitorsList: function (options) {
        var me = this;
        var $dropDown = me.$root.find(options.dropDownSelect);
        if ($dropDown.length == 0) return;
        var selectionBeforeRefresh = null;

        if (
            $dropDown.val() != undefined &&
            $dropDown.val() != null &&
            $dropDown.val() != ''
        ) {
            selectionBeforeRefresh = $dropDown.val();
        }

        var ids = options.getContactList();
        var dropDownIds = new Array();
        $dropDown.find('option').each(function () {
            dropDownIds.push(this.value);
        });

        $.each(dropDownIds, function () {
            if (!this || this == '' || this == '0') return;

            var $option = $dropDown.find("option[value='" + this + "']");
            var optionContactId = $option.attr('data-contact-id');
            if (!optionContactId || optionContactId == null) return;
            if ($.inArray(optionContactId, ids) < 0) {
                $option.remove();
                $dropDown.trigger('prog-change');
            }
        });

        new gmgps.cloud.http("offer-refreshSolicitorsList").ajax(
            {
                args: {
                    search: {
                        Ids: ids,
                        includeUsers: false,
                        includeContacts: true,
                        includeDiaryUserGroups: false
                    }
                },
                background: true,
                complex: true,
                dataType: 'json',
                type: 'post',
                url: 'Contact/GetContactsSolicitors'
            },
            function (response) {
                $.each(response.Data, function (i) {
                    if ($.inArray(this.Id.toString(), dropDownIds) > -1) return;

                    if (
                        (i == 0 && selectionBeforeRefresh == null) ||
                        this.Id == selectionBeforeRefresh
                    ) {
                        $dropDown.append(
                            '<option data-contact-id="' +
                            this.ContactId +
                            '" value="' +
                            this.Id +
                            '" selected="selected">' +
                            this.FullDisplayName +
                            '</option>'
                        );
                        return;
                    }

                    $dropDown.append(
                        '<option data-contact-id="' +
                        this.ContactId +
                        '"  value="' +
                        this.Id +
                        '">' +
                        this.FullDisplayName +
                        '</option>'
                    );
                });

                $dropDown.trigger('prog-change');
                me.applyToolTip($dropDown);
            }
        );
    },

    saveNewSolicitorToContact: function (save) {
        var me = this;
        var $buyerDropDown = me.$root.find('#BuyerSolicitorContactId');
        var $vendorDropDown = me.$root.find('#VendorSolicitorContactId');

        var buyerContactId = $buyerDropDown
            .find('option:selected')
            .attr('data-contact-id');
        var vendorContactId = $vendorDropDown
            .find('option:selected')
            .attr('data-contact-id');
        var buyerContactName = $buyerDropDown.find('option:selected').text();
        var vendorContactName = $vendorDropDown.find('option:selected').text();

        var showApplicantSolicitorSaveOption =
            $buyerDropDown[0].selectedIndex > 1 &&
            (!buyerContactId || buyerContactId == '');
        var showVendorSolicitorSaveOption =
            $vendorDropDown[0].selectedIndex > 1 &&
            (!vendorContactId || vendorContactId == '');

        if (showApplicantSolicitorSaveOption || showVendorSolicitorSaveOption) {
            var form = '';
            if (showApplicantSolicitorSaveOption) {
                var applicantContacts = me.$root.find('.applicants .contact');

                $.each(applicantContacts, function () {
                    var description =
                        'Set  &lsquo;<strong>' +
                        buyerContactName +
                        '</strong>&rsquo; as Solicitor for <span class="fg-contact">' +
                        $(this).text() +
                        '</span>';
                    form +=
                        '<div class="mb7 saveSolicitorBackRow"><div class="tickbox ticked"><input type="checkbox" id="saveApplicantSolicitor' +
                        $(this).attr('data-id') +
                        '" value="' +
                        $(this).attr('data-id');
                    form +=
                        '" name="saveApplicantSolicitor" checked="checked" class="tickbox-hidden" /></div><label for="saveApplicantSolicitor' +
                        $(this).attr('data-id') +
                        '">' +
                        description +
                        '</label></div>';
                });

                form += '</div>';
            }

            if (showVendorSolicitorSaveOption) {
                var vendorContacts = me.$root.find(
                    '.property-preview .fg-contact'
                );

                $.each(vendorContacts, function () {
                    var description =
                        'Set  &lsquo;<strong>' +
                        vendorContactName +
                        '</strong>&rsquo; as Solicitor for <span class="fg-contact">' +
                        $(this).text() +
                        '</span>';
                    form +=
                        '<div class="mb7 saveSolicitorBackRow"><div class="tickbox ticked"><input type="checkbox" id="saveVendorSolicitor' +
                        $(this).attr('data-id') +
                        '" value="' +
                        $(this).attr('data-id');
                    form +=
                        '" id="saveVendorSolicitor" name="saveVendorSolicitor" checked="checked" class="tickbox-hidden" /></div><label for="saveVendorSolicitor' +
                        $(this).attr('data-id') +
                        '">' +
                        description +
                        '</label></div>';
                });

                form += '</div>';
            }

            var $dialogRoot;

            showDialog({
                type: 'question',
                title: 'Update the Solicitor on the Contact Record?',
                msg: form,
                create: function (event) {
                    $dialogRoot = $(event.target);
                },
                buttons: {
                    Yes: function () {
                        var applicantCheckBoxes = $dialogRoot.find(
                            'input[name=saveApplicantSolicitor]:checked'
                        );
                        var vendorCheckBoxes = $dialogRoot.find(
                            'input[name=saveVendorSolicitor]:checked'
                        );
                        var selectedApplicant = '';
                        var selectedVendor = '';

                        $.each(applicantCheckBoxes, function () {
                            if (selectedApplicant != '')
                                selectedApplicant += ',';
                            selectedApplicant += $(this).val();
                        });

                        $.each(vendorCheckBoxes, function () {
                            if (selectedVendor != '') selectedVendor += ',';
                            selectedVendor += $(this).val();
                        });

                        me.$root
                            .find('#SaveVendorSolicitorToContactId')
                            .val(selectedVendor);
                        me.$root
                            .find('#SaveBuyerSolicitorToContactId')
                            .val(selectedApplicant);

                        $(this).dialog('close');
                        save();
                    },
                    No: function () {
                        $(this).dialog('close');
                        save();
                    }
                }
            });
            return;
        }

        save();
    },

    loadChainBuilder: function (letterPromptUpdatevents) {
        var me = this;
        me.letterPromptUpdatevents = letterPromptUpdatevents;

        var showChainBuilder = function () {
            me.$root.closest('.window').hide();

            new gmgps.cloud.http("offer-loadChainBuilder").ajax(
                {
                    args: {
                        offerHistoryEventId: me.$root.find('#Offer_Id').val()
                    },
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: '/Progression/CreateSavedOfferChainLink'
                },
                function () {
                    new gmgps.cloud.ui.controls.window({
                        title: 'Chain Builder',
                        windowId: 'chainBuilderModal',
                        url: '/Progression/GetProgressionDetail',
                        urlArgs: {
                            historyEventId: me.$root.find('#Offer_Id').val(),
                            chainLinkId: 0,
                            mode: C.ProgressionDetailViewMode.Offer
                        },
                        post: true,
                        height: 650,
                        controller: gmgps.cloud.ui.views.progression,
                        width: 1000,
                        draggable: true,
                        modal: true,
                        cancelButton: 'Done',
                        onReady: function ($f, controller) {
                            controller.settings.historyEventId = me.$root
                                .find('#Offer_Id')
                                .val();
                            controller.loadProgressionDetailWindow();

                            //place window in middle of screen
                            var top = $(window).height() / 2 - $f.height() / 2;
                            $f.css('top', top);
                        },
                        onAction: function () {
                            if (me.letterPromptUpdatevents != null)
                                gmgps.cloud.helpers.general.promptForLetters({
                                    eventHeaders: me.letterPromptUpdatevents
                                });
                        },
                        onCancel: function () {
                            me.$root.closest('.window').show();
                            if (me.letterPromptUpdatevents != null)
                                gmgps.cloud.helpers.general.promptForLetters({
                                    eventHeaders: me.letterPromptUpdatevents
                                });
                        }
                    });
                }
            );
        };

        if (me.id === 0 || me.isDirty) {
            ShowAreYouSure(
                'Save',
                'Before you can build a chain the offer must first be saved, would you like to save this offer?',
                function () {
                    me.action(
                        function () {
                            me.closeMyWindow();
                            gmgps.cloud.helpers.property.editOffer({
                                id: me.id,
                                onReady: function (controller) {
                                    controller.loadChainBuilder(
                                        me.letterPromptUpdatevents
                                    );
                                }
                            });
                        },
                        null,
                        true
                    );
                }
            );

            return;
        }

        showChainBuilder();
    },

    addFollowUps: function (
        followUpTypes,
        linkedType,
        linkedId,
        propertyId,
        contactId,
        $dropdown
    ) {
        var me = this;

        var branchId = parseInt(me.$root.find('#Property_BranchId').val());

        var followUps = [];

        $.each(followUpTypes, function (i, followUpType) {
            followUps.push({
                branchId: branchId,
                targetUserId:
                    parseInt(me.$root.find('#NegotiatorId').val()) || 0,
                type: followUpType,
                linkedType: linkedType,
                linkedId: linkedId,
                propertyId: propertyId,
                contactId: contactId
            });
        });

        var $followUps = $dropdown || me.$followUps;

        $followUps
            .data('followUpDropdown')
            .addFollowUps(
                followUps,
                Date.parse(me.$root.find('#FollowUpDefaultDueDate').val())
            );
    },

    removeFollowUpTypes: function (linkedId, linkedType, followUpTypes) {
        var me = this;

        me.$followUps
            .data('followUpDropdown')
            .removeFollowUps(linkedId, linkedType, followUpTypes);
    },
    saveFollowUps: function (model, isNewOffer) {
        var me = this;

        var linkedModelList = [];

        if (model.Offer && isNewOffer) {
            linkedModelList.push({
                linkedType: C.ModelType.HistoryEvent,
                linkedId: model.Offer.Id
            });
        }

        if (model.ChainLink) {
            linkedModelList.push({
                linkedType: C.ModelType.ChainLink,
                linkedId: model.ChainLink.Id
            });
        }

        me.$followUps
            .data('followUpDropdown')
            .saveFollowUpsByModelType(linkedModelList);
    },

    resetCompleteOfferFollowUpOwner: function () {
        var me = this;

        var followUps = me.$followUps
            .data('followUpDropdown')
            .getFollowUpObjects(false);

        var newDueDate = Date.parse(
            me.$root.find('#FollowUpDefaultDueDate').val()
        );

        var ownerFollowUps = $.grep(followUps, function (v) {
            return v.Type === C.FollowUpType.OfferFollowUpOwner;
        });

        $.each(ownerFollowUps, function () {
            this.Status = C.FollowUpStatus.Pending;
            this.CompletionUserId = 0;
            this.DueDate = newDueDate;
            this.TempDueDate = null;
            this.TempCompletionDate = null;
            this.CompletionDate = null;

            me.$followUps.data('followUpDropdown').updateFollowUpObject(this);
        });
    },
    addFollowUpOwner: function () {
        var me = this;

        //Add followups for property owner(s) and applicants.
        $.each(me.getPropertyOwnerIds(), function (i, contactId) {
            me.addFollowUps(
                [C.FollowUpType.OfferFollowUpOwner],
                C.ModelType.HistoryEvent,
                me.id,
                me.propertyId,
                contactId
            );
        });
    },
    removeFollowUpOwner: function () {
        var me = this;

        var $dropdown = me.$followUps.data('followUpDropdown');

        $dropdown.cancelFollowUps({
            types: [C.FollowUpType.OfferFollowUpOwner]
        });
    },
    cancelFollowUps: function () {
        var me = this;

        var $dropdown = me.$followUps.data('followUpDropdown');

        $dropdown.cancelFollowUps({
            types: [
                C.FollowUpType.OfferFollowUpApplicant,
                C.FollowUpType.OfferFollowUpOwner,
                C.FollowUpType.DealProgressionReview
            ]
        });
    },
    cancelAOFollowUps: function () {
        var me = this;

        var $dropdown = me.$followUps.data('followUpDropdown');

        $dropdown.cancelFollowUps({
            types: [C.FollowUpType.DealProgressionReview]
        });
    },

    updateNoteSection: function () {
        var me = this;

        if (me.propertyRecordType == C.PropertyRecordType.Sale) {
            me.$root.find('.notes .sale-notes').show();
            me.$root.find('.notes .rent-notes').hide();
        } else {
            me.$root.find('.notes .sale-notes').hide();
            me.$root.find('.notes .rent-notes').show();
        }
    },

    checkDepositDoesNotExceedLegalLimit: function () {
        var me = this;
        var deffered = Q.defer();

        if (me.propertyRecordType !== C.PropertyRecordType.Rent) {
            return deffered.resolve();
        }
        var displayDepositWarning = getBoolean(
            me.$root.find('#Property_ShowDepositWarning_')
        );
        if (!displayDepositWarning) {
            return deffered.resolve();
        }

        var maxDepositPermitted = me.getMaxPermittedDeposit();
        var requestedDeposit = me.$root
            .find('#Property_PropertyRental_DepositRequired_')
            .asNumber();

        if (requestedDeposit <= maxDepositPermitted) {
            return deffered.resolve();
        }

        var maxDepositMessage =
            'In accordance with the Tenant Fees Act 2019, and based on the rental price and frequency, you should not hold more than ' +
            me.currencySymbol +
            maxDepositPermitted +
            ' total deposit for this tenancy. Do you wish to continue?';

        showDialog({
            type: 'warning',
            title: 'Deposit Exceeds Permitted',
            msg: maxDepositMessage,

            buttons: {
                Continue: function () {
                    $(this).dialog('close');
                    deffered.resolve();
                },
                Cancel: function () {
                    $(this).dialog('close');
                    deffered.reject();
                }
            }
        });

        return deffered.promise;
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

        var rentPerWeek =
            gmgps.cloud.accounting.RentalCalculator.calculateRentPerWeek(
                me.$root
                    .find('#Property_PropertyRental_RentalFrequency_')
                    .val(),
                me.$offerPrice.asNumber()
            );
        return rentPerWeek;
    }
};
