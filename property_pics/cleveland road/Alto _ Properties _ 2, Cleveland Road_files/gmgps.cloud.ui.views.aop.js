// I'm sooo sorry.  Poluting the global scope.  I feel dirty.. BUT JQuery ValidateEngine needs a global
// function for using its custom function functionality. So, i'm sticking it as close to the required js
// We use this function to ensure that an address has been supplied via the postcode lookup until the
// address details have been revealed.

window.aop_AddressValidationCustomFunction = function (
    field,
    rules,
    i,
    options
) {
    if (
        $.trim(field.val()).length === 0 &&
        options.InvalidFields.length > 0 &&
        $(options.InvalidFields[0]).is(':visible') == false
    ) {
        rules.push('required');
        return 'Please supply a postcode or manually enter address details';
    } else {
        rules.pop('required');
    }
};

gmgps.cloud.ui.views.aop = function (args) {
    var me = this;

    me.$root = args.$root;
    me.http = args.http || new gmgps.cloud.http("aop-aop");
    
    me.settings = args;
    me.$window = null;
    me.$actionButton = null;
    me.$thirdButton = null;
    me.propertySelected = false;
    me.vendorSelected = false;
    me.gotoContactHandler =
        args && args.data ? args.data.gotoContactHandler : undefined;
    me.propertyIsDirty = false;

    me.modelBinder = new gmgps.cloud.ui.binding.HtmlModelBinder();
    me.appraisalRequest = args.data.AppraisalRequest;

    me.init();

    return true;
};

gmgps.cloud.ui.views.aop.typeName = 'gmgps.cloud.ui.views.aop';

gmgps.cloud.ui.views.aop.prototype = {
    init: function () {
        var me = this;
        me.setAppointment(false);

        me.$window = me.$root.closest('.window');
        me.$actionButton = me.$window.find('.bottom .buttons .action-button');
        me.$thirdButton = me.$window.find('.bottom .buttons .third-button');

        me.$actionButton.addClass('disabled');
        me.$thirdButton.addClass('disabled');

        $('#form-property').validationEngine({ scroll: false });
        $('#form-owner').validationEngine({ scroll: false });

        //Third Button (back) > Click
        me.$thirdButton.on('click', function () {
            if ($(this).hasClass('disabled')) {
                return;
            }
            $('#form-property').validationEngine('hideAll');
            $('#form-owner').validationEngine('hideAll');

            if (me.lastStep.name === 'overview') {
                me.$thirdButton.addClass('disabled');
            }

            me.gotoStep({
                viewMode: me.lastStep.viewMode,
                name: me.lastStep.name,
                dir: C.Direction.Right
            });
        });

        //Steps
        me.$overview = me.$root.find('.step[data-id="overview"]');
        me.$owner = me.$root.find('.step[data-id="owner"]');
        me.$property = me.$root.find('.step[data-id="property"]');
        me.$apt = me.$root.find('.step[data-id="apt"]');

        me.$stepsEditor = me.$root.find('.steps');

        // Initialize AddressUIStateManager instances for AOP address sections
        me.ownerAddressManager = new gmgps.cloud.ui.controls.AddressUIStateManager('[data-address-type="aop-owner"]');
        me.propertyAddressManager = new gmgps.cloud.ui.controls.AddressUIStateManager('[data-address-type="aop-property"]');

        //Setup custom dropdowns.
        me.$root.find('select').customSelect();

        me.$root.find('.date-picker').datepicker({
            numberOfMonths: 2,
            showButtonPanel: true,
            dateFormat: 'dd/mm/yy'
        });

        //FollowUp Dropdown
        me.$followUps = me.$root.find('.followups').followUpDropdown({
            linkedType: C.ModelType.DiaryEvent,
            linkedId: 0,
            display: 'normal'
        });

        //ReminderMins Dropdown > Change
        me.$root.on('change', '#ReminderMins', function () {
            var mins = parseInt($(this).val());
            if (mins == 0) {
                me.$root.find('.reminder-method').hide();
            } else {
                me.$root.find('.reminder-method').show();
            }
        });

        //Setup Inline searches.
        me.setupInlineSearchForOwner(
            me.$overview.find('.section[data-id="owner"] .inline-search'),
            me
        );
        me.setupInlineSearchForProperty(
            me.$overview.find('.section[data-id="property"] .inline-search'),
            me
        );
        me.initContactMA();

        //Setup mini diary.
        if (!me.appraisalRequest) {
            me.setupMiniDiary(me.$root.find('.mini-diary-placeholder'));
        }

        //Overview: Create button > Click
        me.$overview.on('click', '.create-button', function () {
            var type = $(this).closest('.inline-search').attr('data-type');

            if (type === 'owner') {
                me.resetOwner();
                me.gotoStep({
                    viewMode: C.ViewMode.Create,
                    name: 'owner',
                    dir: C.Direction.Left,
                    title: 'Add New Vendor/Landlord'
                });

                if (me.AppraisalRequestData) {
                    me.modelBinder.bind(
                        me.AppraisalRequestData.Contact,
                        me.$root.find('#form-owner div[data-id="first"]')
                    );
                    me.modelBinder.bind(
                        me.AppraisalRequestData.Contact,
                        me.$root.find('#form-owner div.position')
                    );

                    if (me.AppraisalRequestData) {
                        $('#Owner_Address_Postcode').validationEngine('detach');
                        me.showOwnerAddressInputs(true);

                        me.modelBinder.bind(
                            me.AppraisalRequestData.Property,
                            me.$root.find('#form-owner')
                        );
                    }
                }
            } else {
                me.resetProperty();
                me.gotoStep({
                    viewMode: C.ViewMode.Create,
                    name: 'property',
                    dir: C.Direction.Left,
                    title: 'Add New Property'
                });

                if (me.AppraisalRequestData) {
                    $('#Property_Address_Postcode').validationEngine('detach');
                    me.showPropertyAddressInputs(true);

                    me.modelBinder.bind(
                        me.AppraisalRequestData.Property,
                        me.$root.find('#form-property')
                    );
                }
            }
        });

        //Overview: Delete button > Click
        me.$overview.on('click', '.delete-button', function () {
            if ($(this).closest('.section').attr('data-id') === 'apt') {
                //No appointment
                me.setAppointment(false);

                $(this).closest('.section').find('.set').show();
                $(this).closest('.section').find('.selection').hide();
                $(this)
                    .closest('.section')
                    .find('div.diary-clash-warning')
                    .hide();
            } else {
                var $s = $(this).closest('.inline-search');
                var type = $s.attr('data-type');
                if (type === 'owner') {
                    me.resetOwner();
                } else {
                    me.resetProperty();
                }
                $s.find('.selection').hide();
                $s.find('.search-box')
                    .show()
                    .attr('data-on', 1)
                    .find('input')
                    .val('');
            }
        });

        //Overview: Book button > Click
        me.$overview.on('click', '.book-button', function () {
            me.gotoStep({
                viewMode: C.ViewMode.Create,
                name: 'apt',
                dir: C.Direction.Left,
                title: 'Book Appointment for a Market Appraisal'
            });
        });

        var populateAddressFieldsFromFoundAddress = function (address) {
            var $currentStep = me.$root.find('.step.on');
            var type = $currentStep.attr('data-id').toProperCase();
            
            // Get the appropriate AddressUIStateManager based on current step
            var addressUIStateManager = null;
            if (type === 'Owner') {
                addressUIStateManager = me.ownerAddressManager;
            } else if (type === 'Property') {
                addressUIStateManager = me.propertyAddressManager;
            }
            
            if (addressUIStateManager) {
                addressUIStateManager.populateAddress(address);
                
                // Keep the PostcodePicker highlight logic
                var $nameNo = $currentStep.find('#' + type + '_Address_NameNo');
                gmgps.cloud.ui.controls.PostcodePicker.HighlightNameNoFieldAndWarnIfEmpty($nameNo);
            }
        };

        me.postcodePicker = new gmgps.cloud.ui.controls.PostcodePicker({
            eventSource: me.$root,
            findUi: function ($postcode) {
                return $postcode.closest('.step');
            },
            populateFieldsFromFoundAddress: populateAddressFieldsFromFoundAddress,
            showNewDropdownCallback: function($postcode, addresses) {
                var $currentStep = me.$root.find('.step.on');
                var type = $currentStep.attr('data-id').toProperCase();
                
                // Get the appropriate AddressUIStateManager based on current step
                var addressUIStateManager = null;
                if (type === 'Owner') {
                    addressUIStateManager = me.ownerAddressManager;
                } else if (type === 'Property') {
                    addressUIStateManager = me.propertyAddressManager;
                }
                
                if (addressUIStateManager) {
                    addressUIStateManager.showNewAddressDropdown($postcode, addresses);
                }
            },
            clearNewDropdownCallback: function() {
                var $currentStep = me.$root.find('.step.on');
                var type = $currentStep.attr('data-id').toProperCase();
                
                // Get the appropriate AddressUIStateManager based on current step
                var addressUIStateManager = null;
                if (type === 'Owner') {
                    addressUIStateManager = me.ownerAddressManager;
                } else if (type === 'Property') {
                    addressUIStateManager = me.propertyAddressManager;
                }
                
                if (addressUIStateManager) {
                    addressUIStateManager.clearNewAddressDropdown();
                }
            }
        });
        me.postcodePicker.includeCounty = false;

        //Property: Monitor for text input changes and set dirty if so

        me.$property.on('keyup', '.opt-dirtyTrigger', function () {
            me.propertyIsDirty = true;
        });
        //Add tel/email buttons
        me.$root.on('click', '.add-telemail-button', function () {
            me.addTelEmailRow($(this), true);
        });
        me.$root.on('click', '.delete-telemail-button', function () {
            $(this).closest('.row').remove();
        });
        me.$root.on('click', '.expand-telemail-button', function () {
            var $row = $(this).closest('.row');
            var $parent = $row.parent();
            $parent.find('.row[data-type="phone"]').show();
            $(this)
                .removeClass('expand-telemail-button')
                .removeClass('expand')
                .addClass('add-telemail-button')
                .addClass('plus');
        });

        //Set focus on section when clicked.
        me.$root.on('click', '.search-section', function () {
            me.sectionFocus($(this));
        });

        me.$root.on('click', '.change-button', function () {
            //Slide up any open "about" divs.
            me.$root.find('.about.dropped').removeClass('dropped').slideUp();

            //Fade the selection out and the inline-search back in (and clear the search box).
            $(this)
                .closest('.selection')
                .hide()
                .siblings('.inline-search')
                .show()
                .removeClass('populated')
                .removeClass('copy')
                .find('input')
                .val('');
        });

        //Negotiator Dropdown > Change
        me.$apt.on('change', '.x-negotiatorId', function () {
            var userId = parseInt($(this).val());

            //Update the userId specified in the userId attribute of the mini-diary input.
            me.$root
                .find('.mini-diary-input')
                .attr('data-userId', userId)
                .attr('data-userName', $(this).find('option:selected').text());

            //Change working followups (owner changed)
            me.resetChaseInstructionFollowUps(userId);
        });

        //Copy Address (Owner --> Property)
        me.$overview.on('click', '.copy-owner-address-button', function () {
            var $src = me.$owner.find('.address');
            var $dst = me.$property.find('.address');
            me.copyAddress($src, $dst, C.ModelType.Owner);
        });

        //Copy Address (Property --> Owner)
        me.$overview.on('click', '.copy-property-address-button', function () {
            var $src = me.$property.find('.address');
            var $dst = me.$owner.find('.address');
            me.copyAddress($src, $dst, C.ModelType.Property);
        });

        //Overview:  Edit owner button > Click
        me.$overview.on('click', '.edit-button', function () {
            var id = $(this).closest('.section').attr('data-id');
            var title = '';

            switch (id) {
                case 'owner':
                    title = 'Amend Vendor/Landlord';
                    break;
                case 'property':
                    title = 'Amend Property';
                    break;
                case 'apt':
                    title = 'Amend Market Appraisal Appointment';
                    break;
            }

            me.gotoStep({
                viewMode: C.ViewMode.Edit,
                name: id,
                dir: C.Direction.Left,
                title: title
            });
        });

        me.$root.find('button.timeslot').on('click', function () {
            me.$root.find('button.timeslot').removeClass('bg-diary');
            $(this).addClass('bg-diary');

            if (me.appraisalRequest && me.AppraisalRequestData) {
                var whichAppointment = parseInt($(this).attr('data-index'));
                var selectedAppointment =
                    me.AppraisalRequestData.Timeslots[whichAppointment];

                me.$root
                    .find('#StartDate')
                    .val(
                        selectedAppointment.TimeslotStart.toString(
                            'ddd dd MMM yyyy'
                        )
                    );
                me.$root
                    .find('#EndDate')
                    .val(
                        selectedAppointment.TimeslotEnd.toString(
                            'ddd dd MMM yyyy'
                        )
                    );

                me.updateAptSelection();

                me.$root
                    .find('.mini-diary-input')
                    .attr(
                        'data-startDateTime',
                        selectedAppointment.TimeslotStart.toString(
                            'ddd dd MMM yyyy HH:mm'
                        )
                    );
                me.$root
                    .find('.mini-diary-input')
                    .attr(
                        'data-endDateTime',
                        selectedAppointment.TimeslotEnd.toString(
                            'ddd dd MMM yyyy HH:mm'
                        )
                    );

                me.setupMiniDiary(me.$root.find('.mini-diary-input'));
            }
        });

        //If a period has been supplied, start with the appointment step.  Otherwise, start at the overview step.
        var beginAtAptStep =
            me.$root.find('#BeginAtAppointmentStep').val().toProperCase() ===
            'True';

        me.gotoStep({
            viewMode: C.ViewMode.Unspecified,
            name: 'overview',
            dir: C.Direction.Left
        });

        if (beginAtAptStep) {
            me.updateAptSelection();
        }

        me.loadAppraisalRequest();
    },

    loadAppraisalRequest: function () {
        var me = this;
        if (!me.appraisalRequest) {
            return;
        }

        me.appraisalRequest.then(function (response) {
            me.AppraisalRequestData = response;

            if (me.AppraisalRequestData) {
                me.$root
                    .find('#AppointmentBookingRequestId')
                    .val(me.AppraisalRequestData.BookingRequest.Id);

                me.$window.css('width', '940px');
                me.$overview.css('margin-left', '310px');
                me.$overview.css('width', '500px');

                me.$stepsEditor.css('position', 'unset');
                me.$owner.css('margin-left', '215px');
                me.$owner.css('padding-top', '10px');

                me.$property.css('margin-left', '246px');
                me.$property.css('padding-top', '10px');

                me.$apt.css('margin-left', '277px');
                me.$apt.css('padding-top', '10px');

                me.AppraisalRequestData.Contact.FullName =
                    me.AppraisalRequestData.Contact.Title +
                    ' ' +
                    me.AppraisalRequestData.Contact.Forename +
                    ' ' +
                    me.AppraisalRequestData.Contact.Surname;

                me.AppraisalRequestData.Property.Line1 = '';
                me.AppraisalRequestData.Property.Line2 = '';

                if (me.AppraisalRequestData.Property.NameNo)
                    me.AppraisalRequestData.Property.Line1 +=
                        me.AppraisalRequestData.Property.NameNo + ', ';

                if (me.AppraisalRequestData.Property.Street)
                    me.AppraisalRequestData.Property.Line1 +=
                        me.AppraisalRequestData.Property.Street;

                me.AppraisalRequestData.Property.Line1 =
                    me.AppraisalRequestData.Property.Line1.replace(/,\s*$/, '');

                if (me.AppraisalRequestData.Property.Locality)
                    me.AppraisalRequestData.Property.Line2 =
                        me.AppraisalRequestData.Property.Locality;

                if (
                    me.AppraisalRequestData.Property.Line2.length === 0 &&
                    me.AppraisalRequestData.Property.Town
                )
                    me.AppraisalRequestData.Property.Line2 =
                        me.AppraisalRequestData.Property.Town;

                me.modelBinder.bind(
                    me.AppraisalRequestData,
                    me.$root.find('#appraisalRequestDetail')
                );

                me.modelBinder.bind(
                    me.AppraisalRequestData.Contact,
                    me.$root.find('#form-appointment')
                );

                if (me.AppraisalRequestData.Timeslots) {
                    var chosen = _.find(me.AppraisalRequestData.Timeslots, {
                        Chosen: true
                    });
                    var appointmentTimeSlot =
                        chosen || me.AppraisalRequestData.Timeslots[0];
                    if (appointmentTimeSlot) {
                        var index = _.indexOf(
                            me.AppraisalRequestData.Timeslots,
                            chosen
                        );

                        me.$root
                            .find(
                                '#timeslotSection .timeslot:nth-child(' +
                                    (index + 1) +
                                    ')'
                            )
                            .addClass('bg-diary');

                        me.$root
                            .find('#StartDate')
                            .val(
                                appointmentTimeSlot.TimeslotStart.toString(
                                    'ddd dd MMM yyyy'
                                )
                            );
                        me.$root
                            .find('#EndDate')
                            .val(
                                appointmentTimeSlot.TimeslotEnd.toString(
                                    'ddd dd MMM yyyy'
                                )
                            );

                        me.updateAptSelection();

                        me.$root
                            .find('.mini-diary-placeholder')
                            .attr(
                                'data-startDateTime',
                                appointmentTimeSlot.TimeslotStart.toString(
                                    'ddd dd MMM yyyy HH:mm'
                                )
                            );
                        me.$root
                            .find('.mini-diary-placeholder')
                            .attr(
                                'data-endDateTime',
                                appointmentTimeSlot.TimeslotEnd.toString(
                                    'ddd dd MMM yyyy HH:mm'
                                )
                            );
                    }

                    me.setupMiniDiary(me.$root.find('.mini-diary-placeholder'));
                }

                me.$root.find('#appraisalRequestDetail').show();
                me.$root.find('#aop').addClass('fl');
            }
        });
    },

    setupMiniDiary: function ($target) {
        var me = this;

        $target.miniDiary({
            userId: shell.userId,
            mode: C.CalendarMode.Me,
            allowCreate: false,
            allowEdit: true,
            $start: me.$root.find('#StartDate'),
            $end: me.$root.find('#EndDate'),
            highlightedEventIds: [0],
            useStartForFirstHour: true,
            onPeriodSelected: function (req, authoriseCallback) {
                //Use the period.
                authoriseCallback(true);
            },
            onEventMoved: function () {},
            ghostEvents: [],
            onChanged: function () {
                me.refreshFollowUpsValuationDateChanged(
                    Date.parse(
                        me.$root
                            .find('.mini-diary-input')
                            .attr('data-startdatetime')
                    )
                );
            }
        });
    },

    addTelEmailRow: function ($btn, setFocus) {
        //Clone the current row, alter it to suit and append to the bottom of the list.
        var $row = $btn.closest('.row');
        var $parent = $row.parent();
        var $newRow = $row.clone();
        var style = $newRow.find('span.customStyleSelectBox').attr('style');
        $newRow.find('span.customStyleSelectBox').remove();
        $newRow.find('span.customStyleSelectBox').attr('style', style);
        var type = $row.attr('data-type');
        var count = $row.parent().find('.row[data-type="' + type + '"]').length;
        var isEmail = type === 'email';
        var max = isEmail ? 2 : 3;
        if (count < max) {
            $newRow
                .find('.pm-button')
                .removeClass('add-telemail-button')
                .removeClass('plus')
                .addClass('delete-telemail-button')
                .addClass('minus');
            //replace all name fields with correct index
            var $inputsThatNeedRenaming = isEmail
                ? $newRow.find(":input[name*='EmailAddresses[']")
                : $newRow.find(":input[name*='Phones[']");
            $inputsThatNeedRenaming.each(function (index, element) {
                var $element = $(element);
                var newNameForInput = isEmail
                    ? $element
                          .attr('name')
                          .replace(
                              'EmailAddresses[0]',
                              'EmailAddresses[' + count + ']'
                          )
                    : $element
                          .attr('name')
                          .replace('Phones[0]', 'Phones[' + count + ']');
                $element.attr('name', newNameForInput);
            });
            $newRow.find('label').html('&nbsp;');
            $newRow.find('input[type=text]').val('');
            $newRow.insertAfter(
                $parent.find('.row[data-type="' + type + '"]:last')
            );
            $newRow.find('select').removeClass('is-customised').customSelect(); //must call after placement.
            if (setFocus) {
                $newRow.find('input').focus(); //set focus to new row input box.
            }
        }
    },

    displayOwnerSelection: function (args) {
        var me = this;

        var $sel = me.$overview.find(
            '.section[data-id="owner"] .inline-search'
        );

        $sel.find('.search-box').hide().attr('data-on', 0);
        $sel.find('.selection').show();

        $sel.find('.selection .field1').text(args.line1);
        $sel.find('.selection .field2').text(args.line2);

        $sel.find('.selection .edit-button').text('Amend...').show();

        if (
            parseInt(
                me.$overview
                    .find('.section[data-id="property"] .search-box')
                    .attr('data-on')
            ) === 1
        ) {
            me.$overview.find('.copy-owner-address-button').show();
        }
        me.$overview.find('.copy-property-address-button').hide();

        if (me.propertySelected && me.vendorSelected) {
            me.$actionButton.removeClass('disabled');
        }

        //Show the "Saveable Add a property" MFA launcher button AND set the href with contact Id if it is an existing contact and there is no appointment booked, could also have used "me.$owner.find('#Owner_Id').val()"
        if (args.id > 0 && !me.setAppointment()) {
            var addAPropertySaveableContainer = me.$overview.find('#add-a-property-saveable');
            var btnLookup = addAPropertySaveableContainer.find('.btn-lookup');
            var lookupUrl = btnLookup.attr("data-properties-lookup-url");
            btnLookup.attr("href", lookupUrl + args.id);
            addAPropertySaveableContainer.show();
        }

    },

    displayPropertySelection: function (args) {
        var me = this;

        var $sel = me.$overview.find(
            '.section[data-id="property"] .inline-search'
        );

        $sel.find('.search-box').hide().attr('data-on', 0);
        $sel.find('.selection').show();

        $sel.find('.selection .field1').text(args.line1);
        $sel.find('.selection .field2').text(args.line2);

        $sel.find('.selection .edit-button').text('Amend...').show();

        if (
            parseInt(
                me.$overview
                    .find('.section[data-id="owner"] .search-box')
                    .attr('data-on')
            ) === 1
        ) {
            me.$overview.find('.copy-property-address-button').show();
        }
        me.$overview.find('.copy-owner-address-button').hide();

        if (me.propertySelected && me.vendorSelected) {
            me.$actionButton.removeClass('disabled');
        }
    },

    clearInlineSearch: function ($target) {
        $target
            .attr('data-line1', '')
            .attr('data-line2', '')
            .removeClass('populated');
    },

    showPropertyAddressInputs: function (show) {
        var me = this;

        if (show) {
            me.propertyAddressManager.showEditMode();
        } else {
            me.propertyAddressManager.showLookupMode();
        }
    },

    showOwnerAddressInputs: function (show) {
        var me = this;
        if (show) {
            me.ownerAddressManager.showEditMode();
        } else {
            me.ownerAddressManager.showLookupMode();
        }
    },

    copyAddress: function ($src, $dst, srcType) {
        var me = this;
        $dst.find('[data-field="SubDwelling"]').val(
            $src.find('[data-field="SubDwelling"]').val()
        );
        $dst.find('[data-field="NameNo"]').val(
            $src.find('[data-field="NameNo"]').val()
        );
        $dst.find('[data-field="Street"]').val(
            $src.find('[data-field="Street"]').val()
        );
        $dst.find('[data-field="Locality"]').val(
            $src.find('[data-field="Locality"]').val()
        );
        $dst.find('[data-field="Town"]').val(
            $src.find('[data-field="Town"]').val()
        );
        $dst.find('[data-field="County"]').val(
            $src.find('[data-field="County"]').val()
        );
        $dst.find('[data-field="Postcode"]').val(
            $src.find('[data-field="Postcode"]').val()
        );
        $dst.find('[data-field="Uprn"]').val(
            $src.find('[data-field="Uprn"]').val()
        );
        $dst.find('[data-field="UPRN"]').val(
            $src.find('[data-field="UPRN"]').val()
        );
        $dst.find('[data-field="CountryCode"]')
            .val($src.find('[data-field="CountryCode"]').val())
            .change(); //change required for custom select;

        if (srcType == C.ModelType.Property) {
            //Property --> Owner
            var name = me.$overview
                .find('.section[data-id="owner"] .field1')
                .html();
            if (name === '') {
                me.showOwnerAddressInputs(true);
                //me.$overview.find('.section[data-id="owner"] .edit-button').trigger('click');
                me.gotoStep({
                    viewMode: C.ViewMode.Create,
                    name: 'owner',
                    dir: C.Direction.Left,
                    title: 'Add New Vendor/Landlord'
                });
            } else {
                me.displayOwnerSelection({
                    line1: name,
                    line2: 'baaa'
                });
            }
        } else {
            //Owner --> Property
            me.showPropertyAddressInputs(true);
            me.gotoStep({
                viewMode: C.ViewMode.Create,
                name: 'property',
                dir: C.Direction.Left,
                title: 'Add New Property'
            });
        }
    },

    fail: function (errorMessage) {
        showDialog({
            type: 'error',
            title: 'Error',
            msg: errorMessage,
            buttons: {
                Ok: function () {
                    $(this).dialog('close');
                }
            }
        });
    },

    validate: function () {
        return true;
    },

    reindexFormLists: function ($f) {
        //Re-index phones and emails.
        reindexHtmlArray(
            $f,
            '.person[data-id="first"] .phones div[data-type="phone"]',
            null,
            true
        );
        reindexHtmlArray(
            $f,
            '.person[data-id="first"] .email-addresses div[data-type="email"]',
            null,
            true
        );
        reindexHtmlArray(
            $f,
            '.person[data-id="second"] .phones div[data-type="phone"]',
            null,
            true
        );
        reindexHtmlArray(
            $f,
            '.person[data-id="second"] .email-addresses div[data-type="email"]',
            null,
            true
        );
    },

    put: function ($f, onSuccess) {
        var me = this;

        //Remove empty phones and emails.
        $f.find('.phones input.phone').each(function (i, v) {
            var s = $.trim($(v).val());
            if (s === '') $(v).closest('.row').remove();
        });
        $f.find('.email-addresses input.email').each(function (i, v) {
            var s = $.trim($(v).val());
            if (s === '') $(v).closest('.row').remove();
        });

        me.reindexFormLists($f);

        gmgps.cloud.helpers.general.geolocationFromAddress(
            $f,
            function (results, status) {
                if (status === 'OK' && results.length > 0) {
                    $f.find('#Property_LatLng_Lat').val(
                        results[0].geometry.location.lat()
                    );
                    $f.find('#Property_LatLng_Lng').val(
                        results[0].geometry.location.lng()
                    );
                    $f.find('#Property_StreetViewPOV_LatLng_Lat').val(
                        results[0].geometry.location.lat()
                    );
                    $f.find('#Property_StreetViewPOV_LatLng_Lng').val(
                        results[0].geometry.location.lng()
                    );
                }

                var $form = createForm(
                    $f,
                    'MarketAppraisal/CreateAppraisalOrProperty'
                );

                me.http.postForm(
                    $form,
                    function (response) {
                        if (shell.pmInstalled) {
                            if (
                                me.$property.find('#Property_Id').val() > 0 &&
                                response.Data.Property.RecordTypeId ===
                                    C.PropertyRecordType.Rent
                            ) {
                                showInfo(
                                    'Please review the ownership share of this property.',
                                    'Ownership share'
                                );
                            }
                        }

                        //If an appointment was set, prompt to send communiations.
                        if (me.setAppointment()) {
                            me.setFollowUpChildrenIds(response.Data);

                            if (response.Data.OutputValuationId !== 0) {
                                me.saveFollowUps(
                                    response.Data.OutputValuationId
                                );

                                var isFromAppraisalRequest =
                                    me.$root
                                        .find('#AppointmentBookingRequestId')
                                        .val() !==
                                    '00000000-0000-0000-0000-000000000000';

                                //Prompt for email/sms confirmation.
                                gmgps.cloud.helpers.general.getMultiMessager({
                                    title: 'Send Confirmations and Set Up Reminders for this Market Appraisal',
                                    settings: {
                                        allowAnonymousRecipients: true,
                                        eventId:
                                            response.Data.OutputValuationId,
                                        eventCategory: C.EventCategory.Diary,
                                        updateLastContactedDate:
                                            response.Data
                                                .UpdateContactsLastUpdatedDate,
                                        isFromAppraisalRequest:
                                            isFromAppraisalRequest
                                    },
                                    onComplete: function () {
                                        var onclose = function () {
                                            shell.domainEvents.raise({
                                                type: C.DomainEventType
                                                    .MarketAppraisalCreated,
                                                id: response.Data.Owner.Id,
                                                propertyType: me.$property
                                                    .find(
                                                        '#Property_RecordTypeId'
                                                    )
                                                    .val()
                                            });
                                        };

                                        //Prompt for letters.
                                        gmgps.cloud.helpers.general.promptForLetters(
                                            {
                                                eventHeaders:
                                                    response.UpdatedEvents,
                                                onClose: onclose
                                            }
                                        );
                                    }
                                });
                            }
                        }

                        if (onSuccess) {
                            onSuccess(response);
                        }
                    },
                    function () {
                        me.$actionButton.unlock();
                    }
                );
            }
        );
    },

    destroy: function () {
        var me = this;
        me.$root.empty().unbind();
    },

    action: function (onComplete) {
        var me = this;

        var text = me.$actionButton.text();
        if (text !== 'Finish') {
            me.gotoStep({
                viewMode: C.ViewMode.Unspecified,
                title: 'Add a Market Appraisal or Property',
                name: 'overview',
                dir: C.Direction.Left
            });

            return false;
        }

        if (me.$actionButton.hasClass('disabled')) {
            return false;
        }
        //Validation
        if (!me.validate()) return false;

        var proceedToPut = function () {
            //Put
            me.$actionButton.lock();
            me.put(me.$root, function (response) {
                //Open the new property and jump to the valuation section. (called after valuation and its associated data has been saved)
                // - Also, delete any existing version from the local cache.
                shell.cache.del(
                    C.ModelType.Property,
                    response.Data.Property.Id
                );
                gmgps.cloud.helpers.property.editProperty({
                    id: response.Data.Property.Id,
                    tabColumn: 'marketappraisal'
                });

                //Open the new or existing contact, silently. (optional)
                // - Also, delete any existing version from the local cache.
                // - This ensures continuity with the AOP contact being pushed into the forefront and ensures it's in the RAF panel.
                if (response.Data.Owner.Id !== 0) {
                    shell.cache.del(
                        C.ModelType.Contact,
                        response.Data.Owner.Id
                    );

                    if (me.gotoContactHandler) {
                        me.gotoContactHandler({
                            id: response.Data.Owner.Id,
                            silent: true
                        });
                    }
                }

                //Callback.
                onComplete();
            });
        };

        if (me.setAppointment()) {
            var $form = createForm(
                me.$root,
                '/MarketAppraisal/GetAppraisalDiaryConflicts'
            );
            me.reindexFormLists($form);

            me.http.postForm($form, function (response) {
                var conflictedParties = response.Data;
                var conflict = new gmgps.cloud.helpers.DiaryConflict(
                    conflictedParties
                );
                conflict.resolve($form, function () {
                    proceedToPut();
                });
            });
        } else {
            proceedToPut();
        }

        return true;
    },

    cancel: function (onComplete) {
        onComplete();
    },

    updateOwnerForm: function (args) {
        var me = this;

        me.$owner.find('#Owner_Id').val(args.id || 0);
        me.$owner.find('#Owner_Person1_Title').val(args.title1);
        me.$owner.find('#Owner_Person1_Forename').val(args.forename1);
        me.$owner.find('#Owner_Person1_Surname').val(args.surname1);
        me.$owner.find('#Owner_Person2_Title').val(args.title2);
        me.$owner.find('#Owner_Person2_Forename').val(args.forename2);
        me.$owner.find('#Owner_Person2_Surname').val(args.surname2);
        me.$owner.find('#Owner_Address_SubDwelling').val(args.subDwelling);
        me.$owner.find('#Owner_Address_NameNo').val(args.nameNo);
        me.$owner.find('#Owner_Address_Street').val(args.street);
        me.$owner.find('#Owner_Address_Locality').val(args.locality);
        me.$owner.find('#Owner_Address_Town').val(args.town);
        me.$owner.find('#Owner_Address_County').val(args.county);
        me.$owner.find('#Owner_Address_Postcode').val(args.postcode);
        me.$owner
            .find('#Owner_Address_CountryCode')
            .val(args.countryCode)
            .change(); //change required for custom select

        // Handle UPRN defensively - only set if provided and not empty
        // Note: Contact only has Address.Uprn (lowercase), not a separate UPRN field like Property
        if (args.uprn && args.uprn !== '') {
            me.$owner.find('#Owner_Address_Uprn').val(args.uprn);
        }

        //Phones & emails
        for (var x = 1; x <= 2; x++) {
            var firstPhone = true;
            var firstEmail = true;
            for (var y = 1; y <= 3; y++) {
                var s = '';

                //Phones
                s = args['phones' + x + 'number' + y];
                var $row;

                if (s) {
                    var $phones = me.$owner.find(
                        '.person[data-id="' +
                            (x === 1 ? 'first' : 'second') +
                            '"] .phones'
                    );
                    if (!firstPhone) {
                        me.addTelEmailRow(
                            $phones.find('.add-telemail-button'),
                            false
                        );
                    }
                    $row = $phones.find('.row:last');
                    $row.find('input[data-id="number"]').val(s);
                    $row.find('input[data-id="type"]').val(
                        args['phones' + x + 'type' + y]
                    );
                    $row.find('input[data-id="description"]').val(
                        args['phones' + x + 'description' + y]
                    );
                    firstPhone = false;
                }

                //Emails
                if (y < 3) {
                    s = args['emails' + x + 'address' + y];
                    if (s) {
                        var $emails = me.$owner.find(
                            '.person[data-id="' +
                                (x === 1 ? 'first' : 'second') +
                                '"] .email-addresses'
                        );
                        if (!firstEmail) {
                            me.addTelEmailRow(
                                $emails.find('.add-telemail-button'),
                                false
                            );
                        }
                        $row = $emails.find('.row:last');
                        $row.find('input[data-id="address"]').val(s);
                        firstEmail = false;
                    }
                }
            }
        }

        me.$owner.find('#Owner_IntentionId').val(0);
        me.$owner.find('#Owner_SituationId').val(0);
        me.$owner.find('#Owner_DisposalId').val(0);
        me.$owner.find('#Owner_TimescaleDate').val('');
        me.$owner.find('#Owner_RatingId').val(0);

        me.showOwnerAddressInputs(true);

        me.vendorSelected = true;
    },

    updatePropertyForm: function (args, paf) {
        var me = this;

        me.$property.find('#Property_Id').val(paf ? 0 : args.id);

        if (!paf) {
            me.$property.find('#Property_BranchId').val(args.branchId);
            me.$property.find('#Property_OwnerId').val(args.userId);
            me.$property.find('#Property_RecordTypeId').val(args.recordTypeId);
            me.$property.find('#Property_CategoryId').val(args.categoryId);
            me.$property.find('#Property_SubTypeId').val(args.subTypeId);
            me.$property.find('#Property_Bedrooms').val(args.bedrooms);
            me.$owner.find('#Property_Bathrooms').val(args.bathrooms);
            me.$owner.find('#Property_Receptions').val(args.receptions);
        }

        me.$property
            .find('#Property_Address_SubDwelling')
            .val(args.subDwelling);
        me.$property.find('#Property_Address_NameNo').val(args.nameNo);
        me.$property.find('#Property_Address_Street').val(args.street);
        me.$property.find('#Property_Address_Locality').val(args.locality);
        me.$property.find('#Property_Address_Town').val(args.town);
        me.$property.find('#Property_Address_Postcode').val(args.postcode);
        me.$property
            .find('#Property_Address_CountryCode')
            .val(args.countryCode)
            .change(); //change required for custom select

        // Handle UPRN defensively - only set if provided and not empty
        if (args.uprn && args.uprn !== '') {
            me.$property.find('#Property_Address_Uprn').val(args.uprn);
            me.$property.find('#Property_Address_UPRN').val(args.uprn);
        }

        me.showPropertyAddressInputs(true);

        me.propertySelected = true;
    },

    updateOwnerSelection: function () {
        //Update the owner selection.  Called after an update on the owner step.
        var me = this;

        var s = me.getOwnerSummary();
        var $s = me.$overview.find('.inline-search[data-type="owner"]');

        $s.find('.selection').show();
        $s.find('.search-box').hide().attr('data-on', 0);
        $s.find('.selection .field1').html(s.line1);
        $s.find('.selection .field2').html(s.line2);

        if (
            parseInt(
                me.$overview
                    .find('.section[data-id="property"] .search-box')
                    .attr('data-on')
            ) === 1
        ) {
            me.$overview.find('.copy-owner-address-button').show();
        }
        me.$overview.find('.copy-property-address-button').hide();

        me.vendorSelected = true;

        if (me.propertySelected && me.vendorSelected) {
            me.$actionButton.removeClass('disabled');
        }

        //Show the "Add a property" MFA launcher button if it is an new contact
        var ownerId = parseInt(me.$owner.find('#Owner_Id').val());
        if (ownerId <= 0) {
            me.$overview.find('#add-a-property').show();
        }

    },

    updateAptSelection: function () {
        //Update the appointment section.  Called after an update on the appointment step.
        var me = this;

        //Set appointment.
        me.setAppointment(true);

        var appointment = me.getAppointmentInfo();
        var s = me.getAptSummary(appointment);

        var $s = me.$overview.find('.section[data-id="apt"]');

        $s.find('.selection').show();
        $s.find('.set').hide();
        $s.find('.selection .field1').html(s.line1);
        $s.find('.selection .field2').html(s.line2);
    },

    updatePropertySelection: function () {
        //Update the property selection.  Called after an update on the property step.
        var me = this;

        var s = me.getPropertySummary();
        var $s = me.$overview.find('.inline-search[data-type="property"]');

        $s.find('.selection').show();
        $s.find('.search-box').hide().attr('data-on', 0);
        $s.find('.selection .field1').text(s.line1);
        $s.find('.selection .field2').text(s.line2);

        if (
            parseInt(
                me.$overview
                    .find('.section[data-id="owner"] .search-box')
                    .attr('data-on')
            ) === 1
        ) {
            me.$overview.find('.copy-property-address-button').show();
        }
        me.$overview.find('.copy-owner-address-button').hide();

        me.propertySelected = true;

        if (me.propertySelected && me.vendorSelected) {
            me.$actionButton.removeClass('disabled');
        }
    },

    gotoStep: function (args) {
        var me = this;

        me.$currentStep = me.$root.find('.step.on');

        var backTitle = me.lastStep
            ? me.lastStep.title
            : me.$window.find('.top .title').text();

        if (me.lastStep && me.lastStep.name !== 'overview') {
            me.$thirdButton.removeClass('disabled');
        }

        //Prepare the next step based on this one.
        if (args.dir == C.Direction.Left) {
            //forward
            switch (args.name) {
                case 'overview':
                    switch (me.$root.find('.step.on').attr('data-id')) {
                        case 'owner':
                            if (
                                !$('#form-owner').validationEngine('validate')
                            ) {
                                return;
                            }

                            //Update the owner selection on the overview.
                            me.updateOwnerSelection();
                            break;

                        case 'property':
                            if (
                                !$('#form-property').validationEngine(
                                    'validate'
                                )
                            ) {
                                return;
                            }

                            var id = parseInt(
                                me.$property.find('#Property_Id').val(),
                                10
                            );

                            // if a pre-existing property has NOT been chosen from overview page, Id will be zero so perform a dup property check

                            if (id === 0) {
                                // get to see if an existing property record already exists and prompt to use

                                var postCode = me.$property
                                    .find('#Property_Address_Postcode')
                                    .val();
                                var subDwelling = me.$property
                                    .find('#Property_Address_SubDwelling')
                                    .val();
                                var nameNo = me.$property
                                    .find('#Property_Address_NameNo')
                                    .val();
                                var street = me.$property
                                    .find('#Property_Address_Street')
                                    .val();
                                var recordTypeId = parseInt(
                                    me.$property
                                        .find('#Property_RecordTypeId')
                                        .val()
                                );

                                gmgps.cloud.helpers.property.propertyAddressExists(
                                    postCode,
                                    subDwelling,
                                    nameNo,
                                    street,
                                    recordTypeId,
                                    function (response) {
                                        var propertyId = response.Data;

                                        if (propertyId !== 0) {
                                            showDialog({
                                                type: 'Info',
                                                title: 'Duplicate Property',
                                                msg: 'An un-archived property with this address already exists. Use the existing property?',
                                                buttons: {
                                                    Yes: function () {
                                                        $(this).dialog('close');
                                                        me.$property
                                                            .find(
                                                                '#Property_Id'
                                                            )
                                                            .val(propertyId);
                                                        //Update the property selection on the overview.
                                                        me.updatePropertySelection();
                                                    },
                                                    No: function () {
                                                        $(this).dialog('close');
                                                        me.resetProperty();
                                                    }
                                                }
                                            });
                                        } else {
                                            me.updatePropertySelection();
                                        }
                                    }
                                );
                            } else {
                                // we changed something so any previously matched existing property
                                // becomes invalid
                                if (me.propertyIsDirty) {
                                    me.propertyIsDirty = false;
                                    me.$property.find('#Property_Id').val(0);
                                }
                                //Update the property selection on the overview.
                                me.updatePropertySelection();
                            }

                            break;

                        case 'apt':
                            //Update the apt selection on the overview.

                            me.updateAptSelection();

                            break;
                    }
                    break;
                case 'owner':
                    break;
                case 'property':
                    me.propertyIsDirty = false;
                    break;
            }
        }

        //Store this current step.
        me.lastStep = {
            viewMode: parseInt(me.$root.find('.step.on').attr('data-viewMode')),
            name: me.$root.find('.step.on').attr('data-id'),
            title: me.$window.find('.top .title').text()
        };

        //
        if (isNaN(me.lastStep.viewMode)) {
            me.lastStep.viewMode = 0;
            me.lastStep.name = 'overview';
        }

        //Change to the new step and set the view mode.
        var $step = me.$root.find('.step[data-id="' + args.name + '"]');
        $step.attr('data-viewMode', args.viewMode);

        //Configure UI
        switch (args.name) {
            case 'overview':
                me.$thirdButton.addClass('disabled');
                me.$actionButton.text('Finish');

                if (!me.propertySelected || !me.vendorSelected) {
                    me.$actionButton.addClass('disabled');
                } else {
                    me.$actionButton
                        .removeClass('disabled')
                        .addClass('bgg-red');
                }
                break;
            case 'owner':
                me.$thirdButton.show();
                me.$actionButton
                    .removeClass('grey')
                    .addClass('bgg-red')
                    .text('Next >>')
                    .removeClass('disabled');
                break;
            case 'property':
                me.$actionButton
                    .removeClass('grey')
                    .addClass('bgg-red')
                    .text('Next >>')
                    .removeClass('disabled');
                break;
            case 'apt':
                me.$actionButton
                    .removeClass('grey')
                    .addClass('bgg-red')
                    .text('Next >>')
                    .removeClass('disabled');
                break;
        }

        var setTitle = function (title) {
            var $title = me.$window.find('.top .title');
            $title.fadeOut(500, function () {
                $title.html(title).fadeIn(500);
            });
        };

        //Shift the current step out and the requested step in.
        if (args.dir == C.Direction.Left) {
            setTitle(args.title);

            //Shift Left (forward)
            if (me.$currentStep.length !== 0) {
                me.$currentStep.removeClass('on').fadeOut(300, function () {
                    $step.css('left', '0').addClass('on').fadeIn(300);
                    if (args.$elementToSetFocusOn) {
                        args.$elementToSetFocusOn.focus();
                    }
                });
            } else {
                $step.css('left', '0').addClass('on');
            }
        } else {
            setTitle(backTitle);

            //Shift Right (backward)
            if (me.$currentStep.length !== 0) {
                me.$currentStep.removeClass('on').fadeOut(300, function () {
                    $step.addClass('on').fadeIn(300);
                    if (args.$elementToSetFocusOn) {
                        args.$elementToSetFocusOn.focus();
                    }
                });
            } else {
                $step.css('left', '0').addClass('on');
            }
        }
    },

    //Inline Search (Property)
    setupInlineSearchForProperty: function ($target, me) {
        $target._inlineSearch({
            type: 'property',
            color: 'cyan',
            defaultText: 'Enter a Postcode or Partial Address',
            $groupContainer: me.$root,
            $groupActionButton: me.$root
                .closest('.window')
                .find('.action-button'),
            $selection: me.$root.find('.property-search .selection'),
            inputClicked: function () {},
            itemClicked: function ($item) {
                var id = parseInt($item.attr('data-id'));
                me.$property.find('#PropertyId').val(id);
            },
            rafClicked: function () {},
            onCreateClicked: function () {
                me.gotoStep({
                    viewMode: C.ViewMode.Create,
                    name: 'property',
                    dir: C.Direction.Left,
                    title: 'Add New Property'
                });
            },
            onSelectionRemoved: function () {
                me.configureAddCopyButtons('property');
            },
            onSelectionChanged: function (args, paf) {
                me.updatePropertyForm(args, paf);
                if (paf) {
                    me.gotoStep({
                        viewMode: C.ViewMode.Create,
                        name: 'property',
                        dir: C.Direction.Left,
                        title: 'Add New Property',
                        $elementToSetFocusOn: me.$root.find(
                            '#Property_Address_NameNo'
                        )
                    });
                    gmgps.cloud.ui.controls.PostcodePicker.HighlightNameNoFieldAndWarnIfEmpty(
                        me.$root.find('#Property_Address_NameNo')
                    );
                } else {
                    me.displayPropertySelection(args);
                }
            }
        });
    },

    //Inline Search (Owner)
    setupInlineSearchForOwner: function ($target, me) {
        $target._inlineSearch({
            type: 'contact',
            subTypeList: [
                C.ContactCategory.Client,
                C.ContactCategory.Developer,
                C.ContactCategory.ManagingAgent,
                C.ContactCategory.Solicitor
            ],
            color: 'red',
            defaultText: 'Enter a Name or Partial Address',
            $groupContainer: me.$root,
            $groupActionButton: me.$root
                .closest('.window')
                .find('.action-button'),
            $selection: me.$root.find('.owner-search .selection'),
            actionChange: function (action, onComplete) {
                me.$window = me.$root.closest('.window');

                me.$window
                    .find('.action-button')
                    .removeClass('grey')
                    .addClass('bgg-contact')
                    .text('Next >>');
                onComplete();
            },
            $resultsContainer: null,
            inputClicked: function () {},
            rafClicked: function () {},
            onCreateClicked: function () {
                me.resetOwner();
                me.gotoStep({
                    viewMode: C.ViewMode.Create,
                    name: 'owner',
                    dir: C.Direction.Left,
                    title: 'Add New Vendor/Landlord'
                });
            },
            onSelectionRemoved: function () {
                me.configureAddCopyButtons('owner');
                me.vendorSelected = false;
            },
            onSelectionChanged: function (args, paf) {
                me.updateOwnerForm(args);
                if (paf) {
                    me.gotoStep({
                        viewMode: C.ViewMode.Create,
                        name: 'owner',
                        dir: C.Direction.Left,
                        title: 'Add New Vendor/Landlord',
                        $elementToSetFocusOn: me.$root.find(
                            '#Owner_Address_NameNo'
                        )
                    });
                    gmgps.cloud.ui.controls.PostcodePicker.HighlightNameNoFieldAndWarnIfEmpty(
                        me.$root.find('#Owner_Address_NameNo')
                    );
                } else {
                    me.displayOwnerSelection(args);
                }
            }
        });
    },

    resetOwner: function () {
        var me = this;

        //Clear all text inputs and remove error states.
        me.$owner.find('input[type="text"]').remove('error').val('');

        //ResetId
        me.$owner.find('#Owner_Id').val(0);

        //Reset address inputs.
        me.ownerAddressManager.showLookupMode();

        //Remove email and telephone rows (except the first ones).
        me.$owner
            .find(
                '.person[data-id="first"] .email-addresses .row:not(:first), .person[data-id="first"] .phones .row:not(:first)'
            )
            .remove();
        me.$owner
            .find(
                '.person[data-id="second"] .email-addresses .row:not(:first), .person[data-id="second"] .phones .row:not(:first)'
            )
            .remove();

        //Hide the address copy button.
        me.$overview.find('.copy-owner-address-button').hide();
        me.$overview
            .find(
                '.section[data-id="owner"] .field1, .section[data-id="owner"] .field2'
            )
            .html('');

        if (
            parseInt(
                me.$overview
                    .find('.section[data-id="property"] .search-box')
                    .attr('data-on')
            ) !== 1
        ) {
            me.$overview.find('.copy-property-address-button').show();
        }

        //Hide both "Add a property" divs when the owner is reset
        me.$overview.find('.add-a-property').hide();

        me.$actionButton.addClass('disabled');
        me.vendorSelected = false;
    },

    resetProperty: function () {
        var me = this;

        //Clear all text inputs and remove error states.
        me.$property.find('input[type="text"]').remove('error').val('');

        //ResetId
        me.$property.find('#Property_Id').val(0);

        //Reset address inputs.
        me.propertyAddressManager.showLookupMode();

        //Hide the address copy button.
        me.$overview.find('.copy-property-address-button').hide();
        me.$overview
            .find(
                '.section[data-id="property"] .field1, .section[data-id="property"] .field2'
            )
            .html('');

        if (
            parseInt(
                me.$overview
                    .find('.section[data-id="owner"] .search-box')
                    .attr('data-on')
            ) !== 1
        ) {
            me.$overview.find('.copy-owner-address-button').show();
        }

        me.$actionButton.addClass('disabled');

        me.propertySelected = false;
    },

    //Parse property form and return a summary for the overview.
    getPropertySummary: function () {
        var me = this;
        var $textboxes = me.$property.find('.address-line input');
        var line1 = '';
        var line2 = '';

        $textboxes.each(function (index, value) {
            var id = $(value).attr('id');
            var text = $.trim($(value).val());
            if (
                id === 'Property_Address_SubDwelling' ||
                id === 'Property_Address_NameNo' ||
                id === 'Property_Address_Street'
            )
                line1 += text !== '' ? text + ', ' : '';
            else line2 += text !== '' ? text + ', ' : '';
        });

        return {
            line1: me.cleanLine(line1),
            line2: me.cleanLine(line2)
        };
    },

    //Parse owner form and return a summary for the overview.
    getOwnerSummary: function () {
        var me = this;
        var $textboxes = me.$owner.find('.address-line input');
        var line1 = '';
        var line2 = '';

        var person1 =
            me.$owner.find('#Owner_Person1_Title').val() +
            ' ' +
            me.$owner.find('#Owner_Person1_Forename').val() +
            ' ' +
            me.$owner.find('#Owner_Person1_Surname').val();

        var person2 = $.trim(
            me.$owner.find('#Owner_Person2_Title').val() +
                ' ' +
                me.$owner.find('#Owner_Person2_Forename').val() +
                ' ' +
                me.$owner.find('#Owner_Person2_Surname').val()
        );

        line1 = person2 === '' ? person1 : person1 + ' & ' + person2; //Address
        $textboxes.each(function (index, value) {
            line2 += $(value).val() + ', ';
        });
        line2 = me.cleanLine(line2);

        return {
            line1: line1,
            line2: line2
        };
    },

    getAppointmentInfo: function () {
        var me = this;
        var appointment = {};
        appointment.negotiatorId = parseInt(
            me.$apt.find('#NegotiatorId').val()
        );
        appointment.negotiator2Id = parseInt(
            me.$apt.find('#NegotiatorId').val()
        );
        appointment.start = Date.parse(me.$root.find('#StartDate').val());
        appointment.end = Date.parse(me.$root.find('#EndDate').val());
        appointment.valuationType = me.$apt
            .find('#ValuationTypeId option:selected')
            .text();

        return appointment;
    },

    getAptSummary: function (appointment) {
        var me = this;

        //Build summary.
        var line1 = appointment.start.toString('ddd dd MMM yyyy');
        var line2 =
            appointment.start.toString('HH:mm') +
            ' - ' +
            appointment.end.toString('HH:mm') +
            '<br />' +
            '<span>' +
            me.$apt.find('#NegotiatorId option:selected').text() +
            '</span>';

        //If a second negotiator exists, also add their name.
        if (
            appointment.negotiator2Id !== 0 &&
            appointment.negotiator2Id !== appointment.negotiatorId
        ) {
            line2 +=
                ' & ' +
                '<span>' +
                me.$apt.find('#Negotiator2Id option:selected').text() +
                '</span>';
        }

        line2 +=
            '<br /><br />' +
            me.$apt.find('#ValuationTypeId option:selected').text();

        return {
            line1: line1,
            line2: line2
        };
    },

    cleanLine: function (str) {
        var me = this;
        str = str.replace(/undefined/g, '');
        str = str.replace(/(^\s*,)|(,\s*$)/g, '');
        str = str.replace(/(,\s,)/g, ',');
        str = $.trim(str);
        if (str.startsWith(',') || str.endsWith(',')) {
            str = me.cleanLine(str);
        }
        return str;
    },

    initContactMA: function () {
        var me = this;
        if (me.settings.data.contactIds == null) return;

        var search = {
            Ids: me.settings.data.contactIds,
            ListType: C.ListType.Dropdown,
            SearchOrder: {
                Type: C.SearchOrderType.Ascending
            } //no length limit here - show all RAF items.
        };

        me.http.getView({
            url: 'contact/getcontactList',
            post: true,
            complex: true,
            args: search,
            onSuccess: function (response) {
                var $contact = $($(response.Data).find('.row')[0]);
                var args = {
                    id: parseInt($contact.attr('data-id')),
                    line1: $contact.attr('data-line1'),
                    line2: $contact.attr('data-line2'),
                    branchId: $contact.attr('data-branchId'),
                    userId: $contact.attr('data-userId'),
                    recordTypeId: $contact.attr('data-recordTypeId'),
                    caregoryId: $contact.attr('data-caregoryId'),
                    subTypeId: $contact.attr('data-subTypeId'),
                    bedrooms: $contact.attr('data-bedrooms'),
                    bathrooms: $contact.attr('data-bathrooms'),
                    receptions: $contact.attr('data-receptions'),
                    subDwelling: $contact.attr('data-subDwelling'),
                    nameNo: $contact.attr('data-nameNo'),
                    street: $contact.attr('data-street'),
                    locality: $contact.attr('data-locality'),
                    town: $contact.attr('data-town'),
                    county: $contact.attr('data-county'),
                    postcode: $contact.attr('data-postcode'),
                    countryCode: $contact.attr('data-countryCode'),
                    uprn: $contact.attr('data-uprn') || $contact.attr('data-Uprn') || ''
                };

                me.updateOwnerForm(args);
                me.displayOwnerSelection(args);
            }
        });
    },

    setAppointment: function (value) {
        var me = this;
        return getOrSetBooleanFormField(
            me.$root.find('#SetAppointment'),
            value
        );
    },

    refreshFollowUpsValuationDateChanged: function (newValuationDate) {
        var me = this;

        me.$followUps
            .data('followUpDropdown')
            .refreshWithAdjustedDueDates(newValuationDate);
    },

    setFollowUpChildrenIds: function (responseData) {
        //Property and Contact records are both capable of being created for the first time within AOP.  So, set children id's in case.
        var me = this;

        me.$followUps
            .data('followUpDropdown')
            .setPropertyIds(responseData.Property.Id);
        me.$followUps
            .data('followUpDropdown')
            .setContactIds(responseData.Owner.Id);

        return;
    },

    saveFollowUps: function (linkedId, callback) {
        var me = this;

        me.$followUps
            .data('followUpDropdown')
            .saveFollowUps(linkedId, callback);
    },

    resetChaseInstructionFollowUps: function (targetUserId) {
        var me = this;

        var $dropdown = me.$followUps.data('followUpDropdown');

        $dropdown
            .cancelFollowUps({
                types: [C.FollowUpType.PostAppraisalFollowUpOwner]
            })
            .done(function () {
                $dropdown
                    .refreshWithAdjustedTargetUserId(targetUserId, [
                        C.FollowUpType.Todo
                    ])
                    .done(function () {
                        me.addChaseInstructionFollowUp(targetUserId);
                    });
            });
    },

    chaseInstructionFollowUpRequired: function () {
        var me = this;

        var days = me.$root
            .find('#NegotiatorId option:selected')
            .attr('data-followupdays');
        if (days === undefined || days === '') return false;

        return true;
    },

    addChaseInstructionFollowUp: function (targetUserid) {
        var me = this;

        if (me.chaseInstructionFollowUpRequired()) {
            var branchId = parseInt(
                me.$root
                    .find('#NegotiatorId option:selected')
                    .attr('data-branchid')
            );

            var addedfollowUps = [];

            addedfollowUps.push({
                branchId: branchId,
                targetUserId: targetUserid,
                type: C.FollowUpType.PostAppraisalFollowUpOwner,
                linkedType: C.ModelType.DiaryEvent,
                linkedId: 0,
                propertyId: 0,
                contactId: 0
            });

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

    getOwnerIdList: function () {
        var me = this;

        return $.map(
            me.$root.find('input[name^="OwnerId"][type="hidden"]'),
            function (e) {
                return parseInt($(e).val());
            }
        );
    }
};
