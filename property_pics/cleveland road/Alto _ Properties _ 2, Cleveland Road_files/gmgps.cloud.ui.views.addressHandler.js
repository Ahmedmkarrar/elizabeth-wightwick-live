gmgps.cloud.ui.views.contact.addressHandler = function (args) {
    var me = this;

    me.id = args.id;
    me.$root = args.$root;
    me.contactDetails = args.contactDetails;
    me.setDirty = args.dirtyHandler;
    me.addresses = [];
    me.addressManagers = []; // Store AddressUIStateManager instances for each address item

    me.init();

    return me;
};

gmgps.cloud.ui.views.contact.addressHandler.prototype = {
    initializeAddressManager: function($row, rowId) {
        var me = this;
        
        // Find the address container within this row using data attribute
        var $addressContainer = $row.find('[data-address-type="other"]');
        
        if ($addressContainer.length > 0) {
            // Create AddressUIStateManager for this address item - pass the actual DOM element
            var addressUIStateManager = new gmgps.cloud.ui.controls.AddressUIStateManager($addressContainer[0]);
            
            // Create PostcodePicker for this address container
            var postcodePicker = new gmgps.cloud.ui.controls.PostcodePicker({
                eventSource: addressUIStateManager.getContainer(), // Scope to specific address container
                includeCounty: false,
                populateFieldsFromFoundAddress: addressUIStateManager.populateFieldsFromFoundAddress(),
                showNewDropdownCallback: function($postcode, addresses) {
                    addressUIStateManager.showNewAddressDropdown($postcode, addresses);
                },
                clearNewDropdownCallback: function() {
                    addressUIStateManager.clearNewAddressDropdown();
                }
            });
            
            me.addressManagers.push({
                rowId: rowId,
                manager: addressUIStateManager,
                postcodePicker: postcodePicker,
                $row: $row
            });
            
            return addressUIStateManager;
        }
        
        return null;
    },

    getAddressManagerForRow: function($row) {
        var me = this;
        var rowId = $row.data('id') || $row.find('[data-id]').first().data('id');
        
        var managerData = me.addressManagers.find(function(item) {
            return item.rowId === rowId;
        });
        
        return managerData ? managerData.manager : null;
    },

    updateHeaderDetails: function ($target) {
        var $c = $target.closest('.contact-row');
        var s =
            $c.find('.title').val() +
            ' ' +
            $c.find('.firstname').val() +
            ' ' +
            $c.find('.lastname').val();
        $c.find('.name-label').html(s);

        var selectedTypeId = parseInt($c.find('.row .relationship-type').val());

        if (
            selectedTypeId == C.ContactRelationshipType.ForwardingAddress &&
            parseInt($c.find('#Relationship_ContactId1').val()) !== 0
        ) {
            $c.find('.use-address').show();
        } else {
            $c.find('.use-address').hide();
        }
    },

    mergeForwardingAddress: function ($r) {
        var me = this;

        // reindex into a single Contact object
        var $row = $r.find('.detail-section').clone();

        //Each input
        $row.find('input,textarea,select').each(function (inputIndex, value) {
            var name = $(value).attr('name');
            if (name) {
                name = name.replace('Addresses.Contacts[].RelatedContact.', '');
                $(value).attr('name', name);
            }
        });

        $row.find('.phones input.phone').each(function (i, v) {
            var s = $.trim($(v).val());
            if (s == '') $(v).closest('.row').remove();
        });

        $row.find('.email-addresses input.email').each(function (i, v) {
            var s = $.trim($(v).val());
            if (s == '') $(v).closest('.row').remove();
        });

        reindexHtmlArray($row, '.phones div[data-type="phone"]');
        reindexHtmlArray($row, '.email-addresses div[data-type="email"]');

        // add in the contact.id and delivery method defaults too

        $row.append(
            '<input type="text" name="Id" value="{0}" />'.format(me.id)
        );

        var $form = createForm($row, '/Contact/UpdateContactForwardingDetails');

        return new gmgps.cloud.http(
            "addressHandler-mergeForwardingAddress"
        ).postForm($form);
    },

    init: function () {
        var me = this;

        me.$root.off();

        me.$root.on('click', '.row .header-section', function () {
            $(this).next('.detail-section').slideToggle('fast');
        });

        me.$root.on(
            'blur',
            '.contact-row #RelatedContact_Salutation',
            function (e) {
                var target = $(e.target);
                target.attr('data-salutation-state', 'set');
            }
        );

        me.$root.on('blur', '.contact-row .salutation-trigger', function (e) {
            var target = $(e.target);
            var $row = $(this).closest('.contact-row');
            var salutation = $row.find('#RelatedContact_Salutation');
            if (
                salutation.attr('data-salutation-state') != 'set' &&
                target.val().length != 0
            ) {
                new gmgps.cloud.http("addressHandler-init").ajax(
                    {
                        args: {
                            contact: {
                                person1: {
                                    title: $row
                                        .find('#RelatedContact_Person1_Title')
                                        .val(),
                                    forename: $row
                                        .find(
                                            '#RelatedContact_Person1_Forename'
                                        )
                                        .val(),
                                    surname: $row
                                        .find('#RelatedContact_Person1_Surname')
                                        .val()
                                },
                                person2: {
                                    title: '',
                                    forename: '',
                                    surname: ''
                                }
                            }
                        },
                        complex: true,
                        dataType: 'json',
                        type: 'post',
                        url: '/Contact/GetSalutation'
                    },
                    function (response) {
                        var text = response.Data;
                        if (text.length != 0) {
                            salutation.val(text);
                        }
                    }
                );
            }
        });

        me.$root.on(
            'change',
            '.contact-row .row .relationship-type',
            function updateUIBasedOnRelationshipType() {
                var $this = $(this);
                var $root = $this.closest('.contact-row');

                var isLandlord = $root.find('#IsLandlord').val() === 'True';
                var $deliveryMethods = $root.find('.delivery-methods').show();
                var $copyStatement = $root.find('.copy-statement').hide();
                // set header text of new selected type
                $root
                    .find('.relationship-label')
                    .html($(this).find('option:selected').text());

                var selectedTypeId = parseInt($this.val());
                switch (selectedTypeId) {
                    case C.ContactRelationshipType.ContactAccountant:
                    case C.ContactRelationshipType.Unspecified:
                    case C.ContactRelationshipType.Executor:
                    case C.ContactRelationshipType.PowerOfAttorney:
                    case C.ContactRelationshipType.NextOfKin:
                        if (isLandlord) {
                            $copyStatement.show();
                        }
                        break;
                    case C.ContactRelationshipType.ForwardingAddress:
                        $deliveryMethods.hide();
                        break;
                }

                if (
                    selectedTypeId ===
                    C.ContactRelationshipType.ContactAccountant
                ) {
                    $root.find('.name-label').text('');

                    $root.find('.personal-contact').hide();
                    $root.find('.accountant-contact').show();
                    $root.find('.display-address').show();
                    $root.find('.edit-address').hide();
                } else {
                    $root.find('.personal-contact').show();
                    $root.find('.accountant-contact').hide();
                    $root.find('.display-address').hide();
                    $root.find('.edit-address').show();
                }

                me.updateHeaderDetails($root);
            }
        );

        me.$root.on('keyup', '.row .name', function () {
            me.updateHeaderDetails($(this).closest('.row'));
        });

        me.$root.on(
            'click',
            '.row .delete-address:not(.disabled)',
            function (e) {
                e.stopPropagation();

                var $root = $(this).closest('.contact-row');

                showDialog({
                    type: 'question',
                    title: 'Delete Contact Address ?',
                    msg: 'Are you sure you would you like to delete this address ?',
                    buttons: {
                        Yes: function () {
                            me.setDirty(true, e);
                            $root.remove();
                            $(this).dialog('close');
                        },
                        No: function () {
                            $(this).dialog('close');
                        }
                    }
                });
            }
        );

        me.$root.on('click', '.add-address:not(.disabled)', function (e) {
            me.getNewAddress(me.id).done(function (r) {
                if (r && r.Data) {
                    var $newAddress = $(r.Data);
                    me.$root.find('.row .detail-section').slideUp();
                    me.$root.find('.body').prepend($newAddress);
                    $newAddress.find('.detail-section').slideDown();
                    me.initControls();
                    me.setDirty(true, e);
                }
            });
        });

        me.$root.on('click', '.use-address', function (e) {
            e.stopPropagation();

            var $this = $(this);

            var $row = $this.closest('.contact-row');

            showDialog({
                type: 'question',
                title: 'Update Contact Address',
                msg: 'Are you sure you would like to update the contact address with this forwarding address ?',
                buttons: {
                    Yes: function () {
                        $(this).dialog('close');

                        me.mergeForwardingAddress($row).done(function (s) {
                            if (s && s.Data) {
                                var $html = $(s.Data);

                                $html.find('select').customSelect();

                                $this
                                    .closest('.contact-row')
                                    .fadeOut(300, function () {
                                        $(this).remove();
                                    });
                                me.contactDetails.$root
                                    .find(
                                        '.layer[data-id="contactinfo"] .name-and-address'
                                    )
                                    .empty()
                                    .html($html);

                                me.contactDetails.$root
                                    .find('.address-line')
                                    .show();
                                me.contactDetails.$root
                                    .find('.manual-address-container')
                                    .hide();

                                me.setDirty(true, e);
                            }
                        });
                    },
                    No: function () {
                        $(this).dialog('close');
                    }
                }
            });
        });
        
        // Initialize AddressUIStateManager for existing "Other Addresses" on the page
        me.initControls();
    },

    initControls: function () {
        var me = this;

        // Properly destroy existing managers before recreating them
        me.addressManagers.forEach(function(item) {
            if (item.manager && item.manager.destroy) {
                item.manager.destroy();
            }
        });
        me.addressManagers = [];

        // Initialize AddressUIStateManager for all address items
        me.$root.find('.contact-row').each(function(index) {
            var $row = $(this);
            var $addressContainer = $row.find('[data-address-type="other"]');
            
            // Use the row's position/index as the unique identifier
            var rowId = 'address-' + index;
            
            if ($addressContainer.length > 0) {
                me.initializeAddressManager($row, rowId);
            }
        });

        me.$root
            .find('.autocomplete')
            .not('.has-autocomplete')
            .autoCompleteEx({
                modelType: C.ModelType.Contact,
                includeContacts: true,
                includeUsers: false,
                allowCreate: true,
                search: {
                    CategoryIdList: [C.ContactCategory.Accountant],
                    ApplyFurtherFilteringtoIds: true,
                    FullQuery: true,
                    displayCompanyName: true
                },
                placeholder: 'Search for Accountant...',
                newContactCategory: C.ContactCategory.Accountant,
                onSelected: function (args) {
                    if (args.isSetupCallback) return;

                    var searcher =
                        new gmgps.cloud.ui.views.contact.contactSearcher();

                    $.when(
                        searcher.performSearch({
                            Ids: [args.id],
                            CategoryIdList: [C.ContactCategory.Accountant],
                            ApplyFurtherFilteringtoIds: false
                        })
                    ).done(function (res) {
                        if (res && res.List.length == 1) {
                            var addr = res.List[0].Address;

                            var $row = args.$e.closest('.contact-row');

                            // set the contactId in the hidden form field

                            $row.find('#Relationship_ContactId1').val(args.id);
                            $row.find('.name-label').text(
                                res.List[0].CompanyName
                            );

                            $row.find('.sub-dwelling').text(addr.SubDwelling);
                            $row.find('.name-no').text(addr.NameNo);
                            $row.find('.street').text(addr.Street);
                            $row.find('.locality').text(addr.Locality);
                            $row.find('.town').text(addr.Town);
                            $row.find('.county').text(addr.County);
                            $row.find('.postcode').text(addr.Postcode);
                            $row.find('.countrycode').text(addr.CountryCode);

                            $row.find('.display-address').show();
                            $row.find('.save-row').show();
                        }
                    });
                },
                onRemoved: function (id, $ctrl) {
                    var $row = $ctrl.closest('.contact-row');

                    me.clearAddress($row);

                    me.updateHeaderDetails($row);
                }
            });

        me.$root.find('select').not('.is-customised').customSelect();
    },

    clearAddress: function ($row) {
        // reset the contactId in the hidden form field

        $row.find('#Relationship_ContactId1').val(0);
        $row.find('.address-label').text('');
    },

    getNewAddress: function (id) {
        return new gmgps.cloud.http("addressHandler-getNewAddress").ajax({
            args: {
                contactId: id
            },
            complex: true,
            dataType: 'json',
            type: 'post',
            url: '/Contact/GetContactNewOtherAddress'
        });
    },

    transitionAddressManagersToPreview: function() {
        var me = this;
        me.addressManagers.forEach(function(managerData) {
            if (managerData.manager && managerData.manager.useNewAddressUi) {
                managerData.manager.showPreview();
            }
        });
    }
};
