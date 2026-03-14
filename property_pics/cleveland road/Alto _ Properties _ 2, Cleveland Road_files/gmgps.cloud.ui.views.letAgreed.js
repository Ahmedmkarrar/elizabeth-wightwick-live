gmgps.cloud.ui.views.letAgreed = function (args) {
    var me = this;

    me.$root = args.$root;
    me.$window = null;

    me.id = 0;
    me.init();

    return true;
};

gmgps.cloud.ui.views.letAgreed.prototype = {
    init: function () {
        var me = this;

        me.id = parseInt(me.$root.find('#Offer_Id').val());
        me.$window = me.$root.closest('.window');

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

        me.$root.find('select').customSelect();

        me.$followUps = me.$root.find('.followups').followUpDropdown({
            linkedType: C.ModelType.ChainLink,
            linkedId: 0,
            display: 'normal'
        });

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
                    $row.attr('data-id', args.id);
                    $row.find('input[data-id="property"]').val(args.id);

                    //Also, set the PropertyId hidden input.
                    me.$root.find('#Property_Id').val(args.id);

                    //Display the embedded property preview.
                    //  - This also returns pricing information which is needed for percentage calcs and the pie.
                    new gmgps.cloud.http("letAgreed-onSelected").getView({
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

                            //Show the edit button.
                            me.$root.find('.property-container .ipe').show();
                        }
                    });
                }
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
                allowCreate: true,
                includeContacts: true,
                includeUsers: false,
                placeholder: 'Search for Applicant...',
                onSelected: function (args) {
                    var $row = args.$e.closest('.row');
                    $row.attr('data-id', args.id);
                    $row.find('input[data-id="contactId"]').val(args.id);
                },
                onRemoved: function () {
                    if (me.$root.find('.applicants .ipe-form .row').length > 1)
                        $e.closest('.row').find('.pm-button').trigger('click');
                }
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

            var $row = $table.find('.row:last').clone();
            $row.find('.auto-complete').replaceWith(
                me.getNewACHtml(C.ModelType.Contact)
            );
            $table.append($row);
            $row.find('input[data-id="contactId"]').val(0);
            setupApplicantAC($row.find('.applicant-ac'));
            $row.find('select').customSelect();
        });

        //Remove Applicant > Click
        me.$root.on('click', '.applicants .pm-button.minus', function () {
            var $table = $(this).closest('.ipe-form');

            var $row = $(this).closest('tr.row');

            var $applicant = $row.find('input[data-id="contactId"]');

            var id = parseInt($applicant.val());

            if ($table.find('tr.row').length === 1) {
                var $new = $row.clone();
                $row.remove();
                $new.attr('data-id', 0);
                $new.find('.auto-complete').replaceWith(
                    me.getNewACHtml(C.ModelType.Contact)
                );
                $table.append($new);
                setupApplicantAC($new.find('.applicant-ac'));
                $new.find('select').customSelect();
            } else {
                $row.remove();
            }

            if (id !== 0) {
                $applicant.val(0);
            }
        });
    },

    getNewACHtml: function (modelType) {
        if (modelType == C.ModelType.Contact) {
            return '<input type="text" class="applicant-ac" style="width: 334px;" data-id="0"/>';
        }
    },

    destroy: function () {
        var me = this;
        me.$root.empty().unbind();
    },

    action: function (onComplete) {
        var me = this;
        var progressionStatus = parseInt($('#ProgressionStatus').val());
        var propertyId = parseInt(me.$root.find('#Property_Id').val());

        if (!me.validate()) return false;

        var updateOffer = function () {
            //Prep
            me.$root
                .find('#ProgressionNotes')
                .val(me.$root.find('#Notes').val()); //Notes
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

            var $form = createForm(me.$root, '/offer/updateoffer');

            //Stop any updatable items from updating.
            me.$root.find('.opt-u').removeClass('opt-u');

            reindexHtmlArray($form, '.applicants .row');

            new gmgps.cloud.http("letAgreed-action").postForm(
                $form,
                function (response) {
                    if (onComplete) {
                        onComplete();
                    }

                    var followUpDropdown =
                        me.$followUps.data('followUpDropdown');
                    if (followUpDropdown) {
                        followUpDropdown.saveFollowUps(
                            response.Data.ChainLink.Id
                        );
                    }

                    //Open the tenancy for editing.
                    if (response.Data.OutTenancyId) {
                        gmgps.cloud.helpers.tenancy.editTenancy(
                            response.Data.OutTenancyId,
                            false,
                            false,
                            false,
                            undefined,
                            response.UpdatedEvents
                        );
                    } else {
                        showInfo('Creation of the tenancy failed.');
                    }
                }
            );
        };

        var args = {
            applicantId: parseInt(
                me.$root.find('.applicants .row:first').attr('data-id')
            ),
            propertyId: parseInt(me.$root.find('#Property_Id').val())
        };

        gmgps.cloud.queries.property
            .applicantDoesNotHaveExistingOffer(args)
            .then(() => {
                //get a list of applicants ready for the Money Laundering check
                var applicantIds = new Array();
                me.$root
                    .find('.applicants .row')
                    .each(function (i, applicantRow) {
                        applicantIds.push($(applicantRow).attr('data-id'));
                    });

                //Money Laundering checks.
                var moneyLaunderingCheckVisibility = me.$root
                    .find('#MoneyLaunderingCheckVisibility')
                    .val();
                var excludeApplicantsFromMoneyLaunderingChecks = me.$root
                    .find('#ExcludeApplicantsFromMoneyLaunderingChecks')
                    .val();
                new gmgps.cloud.ui.views.moneyLaunderingCheck({
                    $root: me.$root,
                    propertyId: propertyId,
                    callBack: updateOffer,
                    applicantIds: applicantIds,
                    pendoTag: 'offer-id-order-checks',
                    checkType: moneyLaunderingCheckVisibility,
                    excludeApplicantFromChecks:
                        excludeApplicantsFromMoneyLaunderingChecks
                });
            });
    },

    cancel: function (onComplete) {
        onComplete();
    },

    validate: function () {
        var me = this;
        var valid = true;
        var propertyId = parseInt(me.$root.find('#Property_Id').val());

        //Check that a property been selected.
        if (propertyId == 0) {
            showInfo('Please specify a property for the offer.');
            valid = false;
        }
        if (!valid) return false;

        //Check that at least one applicant has been selected.
        if (
            parseInt(me.$root.find('.applicants .row:first').attr('data-id')) ==
            0
        ) {
            showInfo('Please specify at least one proposed tenant.');
            valid = false;
        }
        if (!valid) return false;

        //Init validation engine.
        me.$root.addClass('opt-validate').validationEngine({ scroll: false });
        valid = me.$root.validationEngine('validate');
        if (!valid) return false;

        return valid;
    }
};
