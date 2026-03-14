window.contact_CompanyValidationCustomFunction = function (field) {
    if (
        $.trim(field.val()).length === 0 &&
        parseInt($('#Contact_Category').val()) !== C.ContactCategory.Client
    ) {
        return 'Please provide a Company Name';
    }
};

gmgps.cloud.ui.views.contactDetails = function (args) {
    var me = this;

    me.cfg = args;
    me.cfg.hasUnsavedChanges = me.cfg.hasUnsavedChanges || false;
    me.$root = args.$root;
    me.matchLists = [];
    me.matching = null;
    me.views = {};
    me.id = args.id;
    me.http =
        args.http || new gmgps.cloud.http("contactdetails-contactDetails");

    me.asyncContent = new alto.AsyncContent();

    //Events
    me.onChanged = new gmgps.cloud.common.event();
    me.onTabColumnItemLabelChangeRequest = new gmgps.cloud.common.event();
    me.onSubTabClicked = new gmgps.cloud.common.event();
    me.onTimelineBoxToggleClicked = new gmgps.cloud.common.event();

    me.tabColumn = new gmgps.cloud.ui.controls.NavigableTabColumn({
        $root: me.$root.find('.tab-column'),
        entityType: 'contact',
        collection: 'contacts',
        id: me.id
    });

    me.toggleNotesBehaviour =
        new gmgps.cloud.ui.behaviours.ToggleViewingNotesBehaviour();

    me.layers = new alto.ui.LayersCollection(me.id, 'Contact/GetContactLayer', 'contact');

    me.emailRegex =
        /^[_A-Za-z0-9 -]+(\.[_A-Za-z0-9-]+)*@[A-Za-z0-9-]+(\.[A-Za-z0-9-]+)*(\.[A-Za-z]{2,50})$/;
    me.viewChanged = false;
    me.lastCopyTime = null; // Track when copy operations occur
    me.isDirty = me.$root.find('#IsDirty').val() === 'true';
    me.userId = parseInt($('#_userid').val());
    me.init(args, false);

    if (!me.cfg.inStepThrough) {
        var title = me.$root.find('#_description').val();
        alto.application.setTitle('Contacts | ' + title);
    }

    return this;
};

gmgps.cloud.ui.views.contactDetails.prototype = {
    init: function (args, reinit) {
        var me = this;
        me.reinit = reinit;

        me.setupToolbar();
        me.initRootEvents();
        me.initLayers(reinit);
        me.configureStickyNotes();

        if (shell.pmInstalled) {
            gmgps.cloud.helpers.general.growlManagementDateAlerts(
                'contact',
                me.id
            );
        }

        //Moved this out of the initControls() func as it was being bound but not triggered there.
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

        //UI Sizing
        $(window)
            .off('resize.contactDetails')
            .on('resize.contactDetails', function (e) {
                if (e.target === window) {
                    me.sizeUI();
                }
            });

        me.$root
            .addClass('opt-validate')
            .validationEngine({ scroll: false, autoPositionUpdate: true });

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

        //Set dirty if new (no listeners at this point if this is contained inside contact object - which does it's own dirty callback).
        if (me.cfg.id === 0) {
            me.setDirty(true);
        }

        me.sizeUI();

        me.$propertyFileTab = me.$root.find(
            '.tab-column li[data-id="propertyfile"]'
        );

        me.$offset = me.$root.offset();

        if (me.cfg.onComplete) {
            me.cfg.onComplete();
        }

        me.PinnedReferenceChangeWarned = false;

        me.asyncContent.render(me.$root, me);
    },

    configureStickyNotes: function () {
        var me = this;

        me.$root.find('.sticky-note').draggable({
            cursor: 'move',
            containment: me.$root.find('.layers'),
            stop: function () {
                shell.saveStickyNote($(this));
            }
        });
    },

    initLayers: function (reinit) {
        var me = this;

        me.layers.init(me.$root, function ($layer) { return me.initLayer($layer); });

        if (!me.cfg.loadedFromCache && !reinit) {
            me.tabColumn.selectTab(me.cfg.tabLayerToLoad);
        }
    },

    /**
     * Called by the entity-layer route handler when the URL hash changes to a different tab
     * while the same contact is already displayed (e.g. from Overview to Contact tab).
     */
    selectTab: function (layer, tab) {
        var me = this;

        if (!me.tabColumn) {
            return;
        }

        var subId = tab;
        if (layer === 'contactinfo' && !subId) {
            subId = '#contact-tab';
        }
        me.tabColumn.selectTab(layer, subId, null, false);
    },

    getBranchId: function () {
        var me = this;
        var branchId = parseInt(
            me.$root.find('#Contact_BranchId').val()
        );
        return branchId;
    },

    setContactId: function (contactId) {
        var me = this;
        me.$root.find('#Contact_Id').val(contactId);
        me.$root
            .find('.followUpDropdown')
            .attr('data-linkedId', contactId);
    },

    setVersion: function (versionNumber) {
        var me = this;

        me.$root
            .find('#Contact_VersionNumber')
            .val(versionNumber);
    },

    initMatching: function () {
        var me = this;

        if (me.matching == null) {
            var args = _.clone(me.cfg);

            $.extend(args, {
                dirtyCallback: function (dirty) {
                    return me.setDirty(dirty);
                },
                matchCountCallback: function (count, animated) {

                    var matchCountElement = me.$root.find('#match-count');

                    if (!animated) {
                        matchCountElement.html(count);
                    } else {
                        var options = {
                            useEasing: true,
                            useGrouping: true,
                            separator: ','
                        };

                        if (matchCountElement.length > 0) {
                            var countUp = new CountUp(
                                matchCountElement[0],
                                0,
                                count,
                                0,
                                1,
                                options
                            );
                            countUp.start();
                        }
                    }
                },
                clientIntentionCallback: function () {
                    me.updateClientIntention();
                }
            });

            me.matching = new gmgps.cloud.ui.views.contactDetails.matching(args);
        }

        var $tb = $('#toolbar .group[data-group="contact"] .detail');
        me.showMatches($tb);
    },

    countMatches: function () {
        var me = this;

        if (me.canOwnProperty(me.getCategoryId())) {
            me.matching.requestMatchCountCallback();
        } else {
            me.$root.find('#match-count').text('N/A');
        }
    },

    getContactConsentPreferences: function () {
        var me = this;
        var result = {};
        me.$root
            .find('#consentpreferences-tab table.consents tr')
            .each(function () {
                var consentName = $(this).attr('data-consent-for');
                var consentStatus = $(this).attr('data-consent-status');
                if (consentName) {
                    result[consentName] = consentStatus;
                }
            });
        return result;
    },

    showMatches: function ($tb) {
        // Matches button can only be shown for people opted-in to property matching
        var me = this;
        var preferences = me.getContactConsentPreferences();
        var matchesToolbar = $tb.find('.btn[data-id="matches"]').show();
        if (preferences['property-matching'] == C.ConsentOptInOption.Denied) {
            matchesToolbar
                .find('li[data-id="view-property-browse-sheet"]')
                .hide()
                .next('.sep')
                .hide();
        } else {
            matchesToolbar
                .find('li[data-id="view-property-browse-sheet"]')
                .show()
                .next('.sep')
                .show();
        }
    },

    hideMatches: function ($tb) {
        $tb.find('.btn[data-id="matches"]').hide();
    },

    showSendBrochure: function ($tb) {
        var me = this;
        var preferences = me.getContactConsentPreferences();
        if (preferences['property-matching'] != C.ConsentOptInOption.Denied) {
            $tb.find('li[data-id="send-brochure"]').show();
        }
    },

    initControls: function ($root) {
        var me = this;
        $root = $root || me.$root;

        me.initTabs($root);

        //Select boxes
        $root.find('select').not('.opt-standard').customSelect();
        $root.find('.bootstrap .customStyleSelectBox').width('auto');
        //Date Pickers
        $root.find('.date-picker.hasDatepicker').removeClass('hasDatepicker');
        $root.find('.date-picker').each(function (i, v) {
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
        //Time pickers
        $root.find('.time-picker').each(function (i, v) {
            $(v).timepicker({
                addSliderAccess: true,
                sliderAccessArgs: { touchonly: false }
            });
        });

        $root.on(
            'focus',
            '.ui-autocomplete-input:not(.property-ac):not(.contact-ac)',
            function () {
                $(this).autocomplete('search', '');
            }
        );

        me.setPropertyAddFromContactVisibility();

        me.setConsentedItemsStatus('financial-services');
        me.setConsentedItemsStatus('conveyancing-services');
        me.setConsentedItemsStatus('relocation-agent-network');
    },

    initTabs: function ($container) {
        var me = this;

        $container.find('.tabs.contact-info-tabs').tabs({
            create: function (event, ui) {
                if (shell.pmInstalled) {
                    shell.uiPermissions.tabContentPermissions(ui.tab, ui.panel);
                }
            },
            beforeActivate: function (event, ui) {
                if (shell.pmInstalled) {
                    shell.uiPermissions.tabContentPermissions(
                        ui.newTab,
                        ui.newPanel
                    );
                }
            },
            activate: function (event, ui) {
                ui.oldPanel.validationEngine('hide');

                if (me.isDirty) {
                    ui.newPanel.validationEngine('validate');
                    ui.newPanel.validationEngine(
                        'updatePromptsPosition',
                        null,
                        true
                    );
                }

                me.onSubTabClicked.raise(ui.newTab);

                var label = ui.newTab.attr('galabel');
                if (label) {
                    googleAnalytics.sendEvent('contacts', 'tab_click', label);
                }
            }
        });

    },


    setSalesProgressionConveyancerReferralsMfeVisibility: function () {
        var me = this;
        var contactId = me.id;
        var btnAddProperty = me.$root.find('.btn-conveyancer-referrals');

        if (btnAddProperty.length > 0) {
            var lookupUrl = btnAddProperty.attr("data-conveyancer-referrals");
            btnAddProperty.attr("href", lookupUrl + contactId);
        }
    },

    setPropertyAddFromContactVisibility: function () {
        var me = this;

        var addPropertyFromContactSaveableContainer = me.$root.find('#add-a-property-saveable');

        var pcode = $.trim(me.$root.find('#Contact_Address_Postcode').val());
        var category = me.getCategoryId();
        var entityId = me.$root.find('#Contact_Id').val();

        if (pcode.length !== 0 && category == C.ContactCategory.Client) {
            var btnAddProperty = addPropertyFromContactSaveableContainer.find('.btn-property-add-from-contact');
            var lookupUrl = btnAddProperty.attr("data-properties-lookup-url");
            btnAddProperty.attr("href", lookupUrl + entityId);
            addPropertyFromContactSaveableContainer.show();
        } else {
            addPropertyFromContactSaveableContainer.hide();
        }
    },

    onConsentChanged: function (consentFor, updatedStatus) {
        var me = this;

        var consentBoundControls = me.$root.find('.consent-bound');

        var visibilityBinding =
            new gmgps.cloud.ui.binding.ConsentControlBinding(
                gmgps.cloud.ui.binding.ConsentControlBinding.VISIBLE
            );
        visibilityBinding.bind(consentBoundControls, consentFor, updatedStatus);

        var enabledBinding = new gmgps.cloud.ui.binding.ConsentControlBinding(
            gmgps.cloud.ui.binding.ConsentControlBinding.ENABLED
        );
        enabledBinding.bind(consentBoundControls, consentFor, updatedStatus);

        if (consentFor == 'relocation-agent-network') {
            me.checkReferralEligible();
        }
    },

    setConsentedItemsStatus: function (consent) {
        var me = this;

        var consentBoundControls = me.$root.find('.consent-bound');

        if (!consentBoundControls) {
            return;
        }

        var controlsForThisConsent =
            gmgps.cloud.ui.binding.ConsentControlBinding.forConsent(
                consentBoundControls,
                consent
            );
        var status = controlsForThisConsent.hasClass('disabled')
            ? C.ConsentOptInOption.Denied
            : C.ConsentOptInOption.Granted;

        var enabledBinding = new gmgps.cloud.ui.binding.ConsentControlBinding(
            gmgps.cloud.ui.binding.ConsentControlBinding.ENABLED
        );
        enabledBinding.bind(consentBoundControls, consent, status);
    },

    initRootEvents: function () {
        var me = this;
        me.$root.off();

        me.$root.on('click', '.referVendor', function () {
            me.referVendor();
        });

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
            me.viewChanged = true;
        });
        
        me.$root.on('keyup:not([readonly])', function (e) {
            // Only ignore copy (C) and select all (A) shortcuts, allow cut (X) to trigger save
            if ((e.ctrlKey || e.metaKey) && (e.keyCode === 67 || e.keyCode === 65)) {
                return; // Ignore only C and A shortcuts
            }
            me.viewChanged = true;
        });
        //Enable/disable FS referral dropdowns if referred by negotiator is not set
        me.$root.on(
            'change',
            '#Contact_Applicant_FSReferredByUserId',
            function () {
                var $this = $(this);

                if ($this.val() === '0') {
                    me.$root
                        .find('#Contact_Applicant_FSReferredToContactId')
                        .prop('disabled', true)
                        .val('0')
                        .trigger('prog-change');
                    me.$root
                        .find('#Contact_Applicant_FSReferredToUserId')
                        .prop('disabled', true)
                        .val('0')
                        .trigger('prog-change');
                } else {
                    me.$root
                        .find('#Contact_Applicant_FSReferredToContactId')
                        .prop('disabled', false);
                    me.$root
                        .find('#Contact_Applicant_FSReferredToUserId')
                        .prop('disabled', false);
                }
            }
        );

        //Open microfrontend app 'aml-contacts'
        me.$root.on('click', '.start-aml-button:not(.disabled)', function () {
            $.ajax({
                type: 'GET',
                url: '/ContactAml/GetContactAmlAppsUrl',
                async: true,
                cache: false,
                dataType: 'json',
                headers: {
                    'X-Component-Name': 'contactdetails-GetContactAmlAppsUrl',
                    'Alto-Version': alto.version
                },
                success: function (response) {
                    googleAnalytics.sendEvent(
                        'contacts',
                        'button_click',
                        'start_aml_check'
                    );

                    window.location.href = response.url + me.id;
                }
            });
        });

        //Open microfrontend app 'aml-contacts'
        me.$root.on('click', '.start-idcheck-button:not(.disabled)', function () {
            const url = gmgps.cloud.ui.views.moneyLaunderingCheck.getContactIdCheckAppsUrl(null);
            window.location.href = `${url}/?contactId=${me.id}`;
        });

        //Print Button - should this be moved to gmgps.cloud.ui.views.contactdetails.matching?
        me.$root
            .find('.layer[data-id="matches"]')
            .on('click', '.print-button', function () {
                var id = parseInt($(this).closest('.row').attr('data-id'));
                gmgps.cloud.helpers.property.viewPropertyBrochure({
                    propertyId: id
                });
            });

        //Tel/EMail Buttons > Click
        me.$root.on('click', '.add-telemail-button', function () {
            //Clone the current row, alter it to suit and append to the bottom of the list.
            var $row = $(this).closest('.row');
            var $parent = $row.parent();
            var $newRow = $row.clone();
            var style = $newRow.find('span.customStyleSelectBox').attr('style');
            $newRow.find('span.customStyleSelectBox').remove();
            $newRow.find('span.customStyleSelectBox').attr('style', style);
            var type = $row.attr('data-type');
            var count = $row
                .parent()
                .find('.row[data-type="' + type + '"]').length;
            var isEmail = type === 'email';
            var max = isEmail ? 2 : 4;
            if (count < max) {
                $newRow
                    .find('.pm-button')
                    .removeClass('add-telemail-button plus')
                    .addClass('delete-telemail-button minus');
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
                $newRow.find('input[type="text"]').val('');
                $newRow.insertAfter(
                    $parent.find('.row[data-type="' + type + '"]:last')
                );
                $newRow
                    .find('select')
                    .removeClass('is-customised')
                    .customSelect();
                $newRow
                    .find('input[type="text"]')
                    .removeClass('propertyfile-email-address');
                $newRow.find('input').focus();
                $newRow.find('.pm-button').attr('title', 'Delete');
                $newRow.find('input[data-id="tel-email-id"]').val('0');
            }
        });
        me.$root.on('click', '.delete-telemail-button', function (e) {
            if (!me.setDirty(true, e)) {
                return false;
            }

            $(this).closest('.row').remove();
        });
        me.$root.on('click', '.expand-telemail-button', function () {
            var $row = $(this).closest('.row');
            var $parent = $row.parent();
            var type = $row.attr('data-type');
            $parent.find('.row[data-type="' + type + '"]').show();
            $(this)
                .removeClass('expand-telemail-button')
                .removeClass('expand')
                .addClass('add-telemail-button')
                .addClass('plus');
        });

        // When Contact Intention Changes , create requirement profiles accordingly
        me.$root.on('change', '#Contact_Applicant_IntentionId', function (e) {
            //Exit early if this isn't a client contact.
            if (me.getCategoryId() !== C.ContactCategory.Client) {
                return false;
            }

            if (!me.setDirty(true)) {
                return false;
            }

            me.intentionId = parseInt($(this).val());
            var existingProfiles = me.matching.existingProfileTypes();

            //If the intention has been changed
            //  - and this is a new contact,
            //  - and there is only one profile currently, then change the intention on that profile instead of adding a new one.
            if (
                me.id === 0 &&
                existingProfiles.buyCount + existingProfiles.rentCount === 1
            ) {
                var recordType =
                    me.intentionId === C.ClientIntentionType.Buy
                        ? C.PropertyRecordType.Sale
                        : me.intentionId === C.ClientIntentionType.Rent
                            ? C.PropertyRecordType.Rent
                            : 0;

                if (recordType !== 0) {
                    me.$root
                        .find('.requirement #Requirement_RecordTypeId')
                        .val(recordType)
                        .trigger('prog-change');

                    return;
                }
            }

            //Not looking?  Warn if there are active profiles
            if (me.intentionId === C.ClientIntentionType.NotLooking) {
                var $checked = me.$root.find('.include-checkbox:checked');

                if ($checked.length > 0) {
                    var msg =
                        $checked.length === 1
                            ? 'There is 1 active requirement profile for this customer.<br/><br/>Would you like to deactivate it?'
                            : 'There are {0} active requirement profiles for this customer.<br/><br/>Would you like to deactivate them?'.format(
                                $checked.length
                            );

                    showDialog({
                        type: 'question',
                        title: 'Deactivate Requirement Profiles?',
                        msg: msg,
                        buttons: {
                            Yes: function () {
                                if (!me.setDirty(true, e)) {
                                    return false;
                                }

                                $(this).dialog('close');
                                $checked
                                    .prop('checked', false)
                                    .trigger('prog-change');
                            },
                            No: function () {
                                $(this).dialog('close');
                            }
                        }
                    });
                }
            }

            switch (me.intentionId) {
                case C.ClientIntentionType.Buy:
                    if (existingProfiles.buyCount === 0) {
                        me.matching.createNewProfile(
                            'Buy',
                            C.PropertyRecordType.Sale,
                            true
                        );
                    } else {
                        // re-enable any existing buy profiles
                        me.matching.setProfileTypesEnabled(
                            C.PropertyRecordType.Sale
                        );
                    }
                    break;

                case C.ClientIntentionType.Rent:
                    if (existingProfiles.rentCount === 0) {
                        me.matching.createNewProfile(
                            'Rent',
                            C.PropertyRecordType.Rent,
                            true
                        );
                    } else {
                        // re-enable any existing rent profiles
                        me.matching.setProfileTypesEnabled(
                            C.PropertyRecordType.Rent
                        );
                    }
                    break;

                case C.ClientIntentionType.BuyOrRent:
                    if (existingProfiles.buyCount === 0) {
                        me.matching.createNewProfile(
                            'Buy',
                            C.PropertyRecordType.Sale,
                            true
                        );
                    } else {
                        // re-enable any existing profiles
                        me.matching.setProfileTypesEnabled(
                            C.PropertyRecordType.Sale
                        );
                    }

                    if (existingProfiles.rentCount === 0) {
                        me.matching.createNewProfile(
                            'Rent',
                            C.PropertyRecordType.Rent,
                            true
                        );
                    } else {
                        // re-enable any existing rent profiles
                        me.matching.setProfileTypesEnabled(
                            C.PropertyRecordType.Rent
                        );
                    }
                    break;
            }
        });

        //ContactCategoryId > Change
        me.$root.on('change', '#Contact_Category', function () {
            me.setupUIForCategory();
            me.setPropertyAddFromContactVisibility();
        });

        //Postcode > Change
        me.$root.on('change', '#Contact_Address_Postcode', function () {
            me.setPropertyAddFromContactVisibility();
        });

        //Selected Branch > Change - Need to re-populate the match areas (Only applicable for a New unsaved contact)
        me.$root.on('change', '#BranchId', function () {

            var branchInput = $(this);
            var branchId = parseInt(branchInput.val());
            me.$root.find('#Contact_BranchId').val(branchId);

            new gmgps.cloud.http("contactdetails-initRootEvents").ajax(
                {
                    args: {
                        branchId: branchId
                    },
                    dataType: 'json',
                    type: 'get',
                    url: '/contact/GetMatchAreasForBranchId'
                },
                function (response) {
                    // remove existing accordion data - The H3 and the following <div>
                    me.$root
                        .find('.layer[data-id="matches"] h3.areas-header')
                        .remove();
                    me.$root
                        .find('.layer[data-id="matches"] .areas-content')
                        .remove();
                    me.$root
                        .find('.layer[data-id="matches"] .areas-anchor')
                        .after(response.Data);
                    // refresh updated accordion
                    me.$root
                        .find('.layer[data-id="matches"] .ui-accordion')
                        .accordion('refresh');
                }
            );

            //check if that effects the referral eligibility
            me.checkReferralEligible();
        });

        //Telephone/email addresses: Add New
        me.$root.on('click', '.add-contactmethod-button', function (e) {
            var type = parseInt($(this).attr('data-id'));
            var templateClass = type + '-template';

            //Quit if there is already an unused, new item awaiting input.
            if (
                me.$root.find('.' + type + '-default:text[value=""]').length > 1
            ) {
                return;
            }

            if (!me.setDirty(true, e)) {
                return false;
            }

            me.$root
                .find('.' + templateClass)
                .clone()
                .removeClass(templateClass)
                .removeClass('hidden')
                .insertAfter(me.$root.find('.' + type + '-insert'));
        });

        //Telephones: Delete
        me.$root.on('click', '.delete-telephone-button', function (e) {
            if (!me.setDirty(true, e)) {
                return false;
            }

            var $item = $(this).closest('.telephone');
            if (parseInt($item.attr('data-id')) === 0) {
                $item.remove();
            } else {
                me.deleteTelephone($item);
            }
        });

        //Email addresses: Delete
        me.$root.on('click', '.delete-emailaddress-button', function (e) {
            if (!me.setDirty(true, e)) {
                return false;
            }

            var $item = $(this).closest('.emailaddress');
            if (parseInt($item.attr('data-id')) === 0) {
                $item.remove();
            } else {
                me.deleteEMailAddress($item);
            }
        });

        me.$root.on(
            'click',
            '.manage-email-history:not(.disabled)',
            function () {
                me.viewEmailHistory(me.id);
            }
        );

        //History
        me.$root.on('change', '.tag-history .text-toggle', function () {
            var on = $(this).hasClass('on');
            var type = parseInt($(this).attr('data-type'));
            var $list = me.$root.find('.tag-history');

            if (on) $list.find('.row[data-type="' + type + '"]').show();
            else $list.find('.row[data-type="' + type + '"]').hide();

            //Hide the header if there are no items to display.
            if ($list.find('.row:visible').length === 0) {
                me.$root.find('thead').hide();
                me.$root.find('.tag-timeline-empty').show();
            } else {
                me.$root.find('thead').show();
                me.$root.find('.tag-timeline-empty').hide();
            }
        });

        //TabColumn --> Click
        me.tabColumn.onTabClicked.handle(function ($item) {
            var id = $item.attr('data-id');
            var arg = $item.attr('data-arg');
            var filter = parseInt($item.attr('data-filter'));

            //Show the detail layer if it's available.
            if (!$item.hasClass('disabled')) {
                me.showDetailLayer({
                    id: id,
                    subId: filter
                });

                if (arg) {
                    me.$root.find('a[href="{0}"]'.format(arg)).trigger('click');
                }

                //Remove arg and filter attributes from the tab-column tab.
                $item.removeAttr('data-arg').removeAttr('data-filter');
            }
        });

        //Owner contact tips.
        me.$root.on(
            'mouseover',
            '.phone-link, .email-link, .sms-link',
            function () {
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

        //Overview Events;
        me.$root.on('click', '.contact-notes .notes-icon', function () {
            var $container = me.$root.find(
                '.contact-notes .contact-notes-container'
            );
            if ($container.hasClass('on')) {
                $container.removeClass('on');
                $container.fadeOut();
            } else {
                $container.addClass('on');
                $container.fadeIn();
            }
        });

        //Category Link > Click
        me.$root.on('click', '.contactinfo-link, .category-link', function () {
            me.tabColumn.selectTab('contactinfo', '#contact-tab');
        });

        //Price Status Link > Click
        me.$root.on('click', '.price-status-link', function () {
            me.tabColumn.selectTab('propertyinfo', '#propertyinfo-tab');
        });

        //Matches Link > Click
        me.$root.on('click', '.matches-link', function () {
            me.tabColumn.selectTab('matches');
        });

        //Properties Link > Click
        me.$root.on('click', '.properties-link', function () {
            me.tabColumn.selectTab('properties');
        });

        //PropertyFile Link > Click
        me.$root.on('click', '.propertyfile-link', function () {
            me.tabColumn.selectTab('propertyfile');
        });

        //Email Link > Click
        me.$root.on('click', '.email-link[data-action="create"]', function (e) {
            var category = $(e.target).attr('ga-category');
            gmgps.cloud.helpers.general.createEmail({
                contactIds: [me.id],
                ContentType: C.DocumentContentType.Html,
                templateId: 0,
                showAssociateProperty: true,
                placeOnQueue: true,
                category: category
            });
        });

        //Email Link > Click
        me.$root.on('click', '.sms-link[data-action="create"]', function (e) {
            var hasMobile = $(e.target).attr('data-hasmobile');
            if (hasMobile.toLowerCase() === 'false') {
                showInfo('Contact does not have a mobile number.');
                return;
            }

            gmgps.cloud.helpers.general.createSMS({
                recipientContactIds: [me.id]
            });
        });

        //Timeline Link > Click (offers, viewings)
        me.$root.on('click', '.timeline-link', function () {
            var timeLineFilterType = parseInt($(this).attr('data-id'));
            me.tabColumn.selectTab('timeline', null, timeLineFilterType);
        });

        //Internal/External FS Referrals
        // - If one dropdown is set, clear the other.
        me.$root.on(
            'change',
            '#Contact_Applicant_FSReferredToContactId',
            function () {
                var id = parseInt($(this).val());
                if (id !== 0) {
                    me.$root
                        .find('#Contact_Applicant_FSReferredToUserId')
                        .val(0)
                        .trigger('prog-change');
                }
            }
        );
        me.$root.on(
            'change',
            '#Contact_Applicant_FSReferredToUserId',
            function () {
                var id = parseInt($(this).val());
                if (id !== 0) {
                    me.$root
                        .find('#Contact_Applicant_FSReferredToContactId')
                        .val(0)
                        .trigger('prog-change');
                }
            }
        );

        //Internal/External Solicitor Referrals
        // - If one dropdown is set, clear the other.
        me.$root.on(
            'change',
            '#Contact_Applicant_SolicitorReferredToContactId',
            function () {
                var id = parseInt($(this).val());
                if (id !== 0) {
                    me.$root
                        .find('#Contact_Applicant_SolicitorReferredToUserId')
                        .val(0)
                        .trigger('prog-change');
                }
            }
        );
        me.$root.on(
            'change',
            '#Contact_Applicant_SolicitorReferredToUserId',
            function () {
                var id = parseInt($(this).val());
                if (id !== 0) {
                    me.$root
                        .find('#SolicitorReferredExt')
                        .trigger('prog-remove');
                    me.$root
                        .find('#Contact_Applicant_SolicitorReferredToContactId')
                        .val(0)
                        .trigger('prog-change prog-remove');
                }
            }
        );

        //Uploader - Show/Hide
        me.$root.on(
            'click',
            '.layer[data-id="documents"] .upload-open-button',
            function () {
                if ($(this).hasClass('disabled')) return;

                var type = $(this).attr('data-type');

                var $uploadContainer = me.$root.find(
                    '.uploader[data-type="' + type + '"]'
                );

                if ($(this).hasClass('on')) {
                    //Close
                    $(this).text($(this).attr('data-label')).removeClass('on');
                    $uploadContainer.slideUp();
                } else {
                    //Open
                    $uploadContainer.slideDown();
                    me.initUploader(type);
                    $(this).attr('data-label', $(this).text());
                    $(this).text('Cancel').addClass('on');
                }
            }
        );

        me.$root.on('mouseenter mouseleave', '.docs .contactdoc', function (e) {
            if (e && e.type === 'mouseenter') {
                $(this).find('.options').fadeIn({ duration: 'fast' });
            } else {
                $(this).find('.options').fadeOut({ duration: 'slow' });
            }
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

        me.$root.on('focus', '.email', function (e) {
            if (gmgps.cloud.helpers.general.validateEmail(e.target.value)) {
                e.target.oldValue = e.target.value;
            }
        });

        me.$root.on('change', '.email', function (e) {
            if (
                e.target.oldValue &&
                e.target.oldValue.length > 0 &&
                e.target.oldValue !== e.target.value &&
                gmgps.cloud.helpers.general.validateEmail(e.target.oldValue) &&
                gmgps.cloud.helpers.general.validateEmail(e.target.value)
            ) {
                me.emailHistoryHasChanged = true;
            }

            if (gmgps.cloud.helpers.general.validateEmail(e.target.value)) {
                e.target.oldValue = e.target.value;
            }
        });

        me.$root.on('blur', '#Contact_Salutation', function (e) {
            var target = $(e.target);
            target.attr('data-salutation-state', 'set');
        });

        me.$root.on('blur', '.salutation-trigger', function (e) {
            var target = $(e.target);
            var salutation = me.$root.find('#Contact_Salutation');
            if (
                salutation.attr('data-salutation-state') !== 'set' &&
                target.val().length !== 0
            ) {
                new gmgps.cloud.http("contactdetails-initRootEvents").ajax(
                    {
                        args: {
                            contact: {
                                category: me.getCategoryId(),
                                person1: {
                                    title: me.$root
                                        .find('#Contact_Person1_Title')
                                        .val(),
                                    forename: me.$root
                                        .find('#Contact_Person1_Forename')
                                        .val(),
                                    surname: me.$root
                                        .find('#Contact_Person1_Surname')
                                        .val()
                                },
                                person2: {
                                    title: me.$root
                                        .find('#Contact_Person2_Title')
                                        .val(),
                                    forename: me.$root
                                        .find('#Contact_Person2_Forename')
                                        .val(),
                                    surname: me.$root
                                        .find('#Contact_Person2_Surname')
                                        .val()
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
                        if (text.length !== 0) {
                            salutation.val(text);
                        }
                    }
                );
            }
        });

        //Properties > Row > Click
        me.$root.on(
            'click',
            '.layer[data-id="properties"] td:not(.checkbox-container)',
            function () {
                gmgps.cloud.helpers.property.editProperty({
                    id: parseInt($(this).closest('tr').attr('data-id'))
                });
            }
        );

        if (shell.pmInstalled) {
            //Tenancies > Row > Click
            me.$root.on(
                'click',
                '.layer[data-id="tenancies"] td:not(.checkbox-container)',
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

            me.$root.on(
                'change',
                '.layer[data-id="contactinfo"] .delivery-methods .delivery-email',
                function () {
                    //check validEmail
                    if ($(this).prop('checked')) {
                        if (
                            !gmgps.cloud.helpers.general.validateEmail(
                                me.$root
                                    .find('.person-1 .email-addresses .email')
                                    .val()
                            )
                        ) {
                            me.$root
                                .find('.person-1 .email-addresses .email')
                                .validationEngine(
                                    'showPrompt',
                                    'Please provide a valid email for the contact.',
                                    'x',
                                    'topLeft',
                                    true
                                );
                        }
                    }
                }
            );

            gmgps.cloud.helpers.general.addWarningIfValueChanged(
                $('#Contact_PaymentReference.pinned'),
                'Clear Pinned Reference?',
                'Editing or deleting a pinned payment reference will stop imported receipts auto-matching. Do you wish to continue?'
            );
        }

        me.$root.on('click', '.contained-copy-button', function (event) {
            event.stopPropagation();

            const getPropertyAddress = () => {
                const contactDisplayName = document.getElementById(
                    'contact-display-name'
                ).textContent;
                const $contactCompanyName = document.getElementById(
                    'contact-company-name'
                );
                const contactCompanyName = $contactCompanyName
                    ? $contactCompanyName.textContent
                    : '';
                const propertyAddressLine1 = document.getElementById(
                    'contact-address-line1'
                ).textContent;
                const propertyAddressLine2 = document.getElementById(
                    'contact-address-line2'
                ).textContent;
                const contactFullAddress = `${propertyAddressLine1} ${propertyAddressLine2}`;
                return `${contactDisplayName} ${contactCompanyName} ${contactFullAddress}`;
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
            document.getElementById('copy-button-text-contact').innerText =
                'Copied';
            setTimeout(() => {
                document.getElementById('copy-button-text-contact').innerText =
                    'Copy';
            }, 500);
        });

        me.$root.on('click', '.btn-property-add-from-contact:not(.hidden)',
            function (e) {
                if (me.isDirty) {
                    showInfo('Please Save before adding a property.');
                    e.preventDefault();
                }
            }
        );

        // Compliance: Manual Checks

        me.$root.on('click', '#compliance-tab #manual-checks .ofsi-add-check', function (event) {
            event.stopPropagation();

            var $manualChecks = me.$root.find('#compliance-tab #manual-checks');
            var $checksTable = $manualChecks.find('.ofsi-checks-table');

            if (!$checksTable.is(':visible')) {
                $checksTable.show();
            }

            var $addNewRow = $checksTable.find('.ofsi-new-check-row');

            if (!$addNewRow.is(':visible')) {                
                $addNewRow.show();
            }

            var timestamp = moment().format('HH:mm D/MM/YYYY');

            $addNewRow.find('.ofsi-new-check-timestamp').text(timestamp);
        });

        me.$root.on('click', '#compliance-tab #manual-checks .aml-check-confirmation .btn', function (event) {
            event.stopPropagation();

            var $this = $(this);

            var isSuccessful = $this.find('.accept-button').length == 1;

            var $manualChecks = me.$root.find('#compliance-tab #manual-checks');
            var $acceptButton = $manualChecks.find('.aml-check-confirmation .accept-button');
            var $rejectButton = $manualChecks.find('.aml-check-confirmation .reject-button');

            $acceptButton.toggleClass('on', isSuccessful);
            $acceptButton.toggleClass('off', !isSuccessful);
            $rejectButton.toggleClass('on', !isSuccessful);
            $rejectButton.toggleClass('off', isSuccessful);

            me.$root.find('#Contact_MoneyLaunderingCheckComplete').val(isSuccessful);

            var $mlCheckDate = me.$root.find('.aml-check-date');
            var $mlCheckedBy = me.$root.find('.aml-checked-by');

            var username = me.$root.find('#manual-checks').attr('data-currentuser');
            var timestamp = moment().format('HH:mm D/MM/YYYY');

            $mlCheckDate.text(timestamp);
            $mlCheckedBy.text(username);

            me.setDirty(true, event);
        });

        me.$root.on('click', '#compliance-tab #manual-checks .ofsi-new-check-row .btn', function (event) {
            event.stopPropagation();

            var $this = $(this);
            var $row = $this.closest('.ofsi-new-check-row');

            var isSuccessful = $this.find('.accept-button').length == 1;

            var $acceptButton = $row.find('.accept-button');
            var $rejectButton = $row.find('.reject-button');

            $acceptButton.toggleClass('on', isSuccessful);
            $acceptButton.toggleClass('off', !isSuccessful);
            $rejectButton.toggleClass('on', !isSuccessful);
            $rejectButton.toggleClass('off', isSuccessful);

            $row.find('.ofsi-new-check-outcome').val(isSuccessful);

            me.setDirty(true, event);
        });
    },

    setupToolbar: function () {
        var me = this;
        var $tb = $('#toolbar .group[data-group="contact"] .detail');
        var categoryId = me.getCategoryId();
        var $landlord = me.$root.find('#IsLandlord');
        var hasAnyRoles =
            parseInt(me.$root.find('#ContactRoleCount').val()) > 0;
        var isLandlord =
            $landlord.length > 0
                ? $landlord.val().toLowerCase() === 'true'
                : false;
        var $Tenant = me.$root.find('#HasBeenTenantOrProspectiveTenant');
        var isTenant =
            $Tenant.length > 0 ? $Tenant.val().toLowerCase() === 'true' : false;
        var isSittingTenantOnly = me.isContactSittingTenantOnly();

        var $b = null;

        $('#toolbar .group[data-group="contact"] .list').hide();

        $tb.find('div.btn').removeClass('disabled').hide();

        //Exit early (before showing any buttons) if this is a new contact.  There are no actions/docs available to them until saved.
        if (me.id === 0) {
            return;
        }

        //Actions
        $b = $tb.find('div[data-id="action"]');
        $b.show().find('.item').hide();
        switch (categoryId) {
            case C.ContactCategory.Client:
                $tb.find(
                    'li[data-id="create-viewing"], li[data-id="create-offer"]'
                ).show();

                if (shell.pmInstalled && (hasAnyRoles || isLandlord)) {
                    $tb.find('li[data-id="pm-charge"]').show();
                    $tb.find('li[data-id="pm-receipt"]').show();
                    $tb.find('li[data-id="pm-refund"]').show();
                }

                if (shell.pmInstalled && isLandlord) {
                    $tb.find('li[data-id="pm-paylandlord"]').show();
                }

                if (shell.pmInstalled && isTenant) {
                    $tb.find('li[data-id="pm-transferDeposit"]').show();
                }

                break;

            case C.ContactCategory.Supplier:
                if (shell.pmInstalled) {
                    $tb.find(
                        'li[data-id="pm-charge"], li[data-id="pm-paysupplier"], li[data-id="pm-receipt"], li[data-id="pm-refund"], li[data-id="pm-add-workorder"]'
                    ).show();
                }
                break;
        }

        if (me.canOwnProperty(categoryId)) {
            $tb.find('li[data-id="create-appraisal"]').show();
        }

        //Documents
        $b = $tb.find('div[data-id="documents"]');
        $b.show().find('.item').hide();
        if (categoryId == C.ContactCategory.Client) {
            me.showSendBrochure($tb);
            $tb.find('li[data-id="send-brochure"]').next('.sep').show();
        } else {
            $tb.find('li[data-id="send-brochure"]').next('.sep').hide();
        }

        if (me.canOwnProperty(categoryId)) {
            $tb.find('li[data-id="create-vendor-report"]').show();
            $tb.find('li[data-id="create-vendor-report"]').next('.sep').show();
        } else {
            $tb.find('li[data-id="create-vendor-report"]').next('.sep').hide();
        }

        $tb.find('li[data-id="create-letter"]').show();

        if (shell.pmInstalled && !isSittingTenantOnly) {
            $tb.find('li[data-id="pm-accounting-documents"]').show();
            $tb.find('li[data-id="pm-accounting-documents"]')
                .next('.sep')
                .show();
        } else {
            $tb.find('li[data-id="pm-accounting-documents"]')
                .next('.sep')
                .hide();
        }

        if (shell.pmInstalled && isLandlord) {
            $tb.find('li[data-id="send-period-statement"]').show();
            $tb.find('li[data-id="send-period-statement"]').next('.sep').show();
        } else {
            $tb.find('li[data-id="send-period-statement"]').next('.sep').hide();
        }

        if (shell.pmInstalled && isLandlord) {
            $tb.find('li[data-id="send-mtd-income-tax-csv"]').show();
            $tb.find('li[data-id="send-mtd-income-tax-csv"]').next('.sep').show();
        } else {
            $tb.find('li[data-id="send-mtd-income-tax-csv"]').next('.sep').hide();
        }

        //adverts
        if (categoryId === C.ContactCategory.Publication) {
            $b = $tb.find('div[data-id="advert-run"]');
            $b.show();
            $tb.find('li[data-id="contact-advert-runs"]').show();
        }

        //Archive/Unarchive
        if (me.$root.find('#Contact_Archived').val() === 'True') {
            $tb.find('li[data-id="archive"]').hide();
            $tb.find('li[data-id="unarchive"]').show();
        } else {
            $tb.find('li[data-id="archive"]').show();
            $tb.find('li[data-id="unarchive"]').hide();
        }

        $tb.find('li[data-id="personal-information-delete"]').show();

        $tb.find('li[data-id="transfer-contact"]').show();

        //PhoneCall & FileNote logging.
        $tb.find(
            'li[data-id="log-phonecall"], li[data-id="log-filenote"]'
        ).show();

        //Status & Items
        $b = $tb.find('div[data-id="status"]');
        $b.show().find('.item').hide(); //hide all status items to begin with.

        //General Appointment
        $tb.find('li[data-id="new-appointment"]').show();

        //Documents
        $tb.find('div[data-id="documents"]').show();

        //Personal Information Request
        $tb.find('li[data-id="personal-information-request"]').show();

        //Sticky
        $tb.find(
            'div[data-id="add-note"], div[data-id="show-hide-notes"]'
        ).show();

        me.showPrintTimelineButton($tb);

        // strip out permission enabled menu items
        if (shell.pmInstalled) {
            shell.uiPermissions.menuItemPermissions($tb);
        }

        $tb.show();

        me.showVoidManagementSetupButton($tb, isLandlord);
    },

    setupRemittanceRemarks: function () {
        var me = this;
        var $ac = me.$root.find('#RemittanceRemark');
        if ($ac.length > 0) {
            new gmgps.cloud.http("contactdetails-setupRemittanceRemarks")
                .ajax({
                    args: {},
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: '/Accounting/GetRemittanceRemarkList'
                })
                .done(function (r) {
                    if ($ac.val().length > 0) {
                        var exists = $.grep(r.Data, function (e) {
                            return e.Value === $ac.val();
                        });

                        if (exists.length === 0) {
                            r.Data.push({
                                Id: $ac.val(),
                                Value: $ac.val()
                            });
                        }
                    } else {
                        if (me.id === 0) {
                            var val;
                            $.each(r.Data, function (i, d) {
                                if (d.Id === $ac.data('default-remittance')) {
                                    val = d;
                                    return false;
                                }
                            });
                            if (val) {
                                $ac.val(val.Value);
                            }
                        }
                    }
                    $ac.autocomplete({
                        source: $.map(r.Data, function (dataItem) {
                            return {
                                value: dataItem.Value,
                                label: dataItem.Value
                            };
                        }),
                        minLength: 3
                    });
                });
        }
    },

    canOwnProperty: function (categoryId) {
        return (
            categoryId === C.ContactCategory.Client ||
            categoryId === C.ContactCategory.Solicitor ||
            categoryId === C.ContactCategory.Developer ||
            categoryId === C.ContactCategory.ManagingAgent
        );
    },

    showPrintTimelineButton: function (toolbar) {
        var me = this;
        var printTimelineButton = toolbar.find('div[data-id="print-options"]');
        if (shell.pmInstalled) {
            var printTransactionOptions = printTimelineButton.find(
                'li[data-id="print-transactions-order-createdate"], li[data-id="print-transactions-order-itemdate"]'
            );
            if (me.isContactSittingTenantOnly()) {
                printTransactionOptions.hide();
            } else {
                printTransactionOptions.show();
            }
        }
        if (printTimelineButton.length > 0) {
            printTimelineButton.show();
        }
    },

    showVoidManagementSetupButton: function (toolbar, isLandlord) {
        var me = this;
        var contactId = me.$root.find('#Contact_Id').val();
        var voidManagementSetupButton = toolbar.find('#void-management-setup');
        if (voidManagementSetupButton.length === 0) {
            return;
        }
        voidManagementSetupButton.hide();
        if (isLandlord) {
            var atag = voidManagementSetupButton.find('a');
            var href = atag.attr('data-href-template');
            atag.attr('href', href.replace('{id}', contactId));
            voidManagementSetupButton.show();
        }
    },

    setBankDetailTabVisibility: function () {
        var me = this;

        var $bankDetailTab = me.$root
            .find('.layer[data-id="contactinfo"] a[href="#bankdetails-tab"]')
            .parent();

        $bankDetailTab.hide();

        if (!shell.pmInstalled) return;

        // cant show tab until contact is saved as we dont have a contactId until then....

        if (me.id === 0) return;

        var categoryId = me.getCategoryId();

        var isSupplier = categoryId === C.ContactCategory.Supplier;

        var isLandlord = false;
        var isTenant = false;
        var isProspectiveTenant = false;
        var isApplicant = false;
        var isSittingTenantOnly = false;

        if (categoryId === C.ContactCategory.Client) {
            isLandlord =
                me.$root.find('#IsLandlord').val().toLowerCase() === 'true';

            isTenant =
                me.$root.find('#HasBeenTenant').length > 0
                    ? me.$root.find('#HasBeenTenant').val().toLowerCase() ===
                    'true'
                    : 'false' === 'true';

            isProspectiveTenant =
                me.$root.find('#HasBeenTenantOrProspectiveTenant').length > 0
                    ? me.$root
                        .find('#HasBeenTenantOrProspectiveTenant')
                        .val()
                        .toLowerCase() === 'true'
                    : false;

            isApplicant =
                me.$root.find('#IsApplicant').val().toLowerCase() === 'true';

            isSittingTenantOnly = me.isContactSittingTenantOnly();
        }
        if (
            (isSupplier ||
                isLandlord ||
                isTenant ||
                isProspectiveTenant ||
                isApplicant) &&
            !isSittingTenantOnly
        ) {
            $bankDetailTab.show();
        }
    },

    setupUIForCategory: function () {
        //Setup the UI according to the category of the contact.
        var me = this;

        var titleValidationClass = 'validate[required, maxSize[20]]';

        var categoryId = me.getCategoryId();
        var $supplier = me.$root.find('.supplier-row');
        var $review = me.$root.find('.review-row');
        var $company = me.$root.find('.company-row');
        var $dx = me.$root.find('.dx-row');
        var $website = me.$root.find('.website-row');
        var $intention = me.$root.find('.intention-row');
        var $leadSource = me.$root.find('.leadsource-row');
        var $relocation = me.$root.find('.referral-container');
        var $solicitor = me.$root.find('.solicitor-row');
        var $firstPersonTitle = me.$root.find('#Contact_Person1_Title');
        var $matchesTab = me.$root.find('.tab-column li[data-id="matches"]');
        var $paymentDetailTab = me.$root.find(
            '.tab-column li[data-id="payments"]'
        );
        var $propertiesTab = me.$root.find(
            '.tab-column li[data-id="properties"]'
        );
        var $contactPositionTab = me.$root
            .find('.layer[data-id="contactinfo"] a[href="#position-tab"]')
            .parent();
        var $publication = me.$root.find(
            '.layer[data-id="contactinfo"] .publication-container'
        );
        var $vendorReferal = me.$root.find(
            '.layer[data-id="contactinfo"] .referral-container'
        );

        $matchesTab.hide(); //hide matches tab initially, then show if "client".
        $paymentDetailTab.hide(); // pm users only

        $propertiesTab.show();
        $solicitor.hide();
        $supplier.hide();

        $review.hide();

        me.$root.find('[name=validatePerson]').val('true');

        //Hide/Show dynamic parts of the form depending on contact category.
        switch (categoryId) {
            case C.ContactCategory.Publication:
                $publication.show();
                $vendorReferal.hide();
                $company.show();
                $intention.hide();
                $leadSource.hide();
                $review.show();
                break;
            case C.ContactCategory.Client:
                $company.hide();
                $website.hide();
                $intention.show();
                $dx.hide();
                $leadSource.show();
                $matchesTab.show();
                $solicitor.show();
                $publication.hide();
                $contactPositionTab.show();
                $review.show();
                me.$root.find('.client-specific').show();
                break;

            case C.ContactCategory.Supplier:
                me.$root.find('[name=validatePerson]').val('');
                $company.hide();
                $propertiesTab.hide();
                $contactPositionTab.hide();
                $intention.hide();
                $leadSource.hide();
                $relocation.hide();

                $website.show();
                $supplier.show();

                me.$root.find('.client-specific').hide();
                break;

            case C.ContactCategory.Solicitor:
            case C.ContactCategory.Accountant:
                $company.show();
                $website.show();
                $intention.hide();
                $dx.show();
                $leadSource.hide();
                $publication.hide();
                $contactPositionTab.hide();
                $vendorReferal.hide();
                if ($firstPersonTitle.hasClass(titleValidationClass)) {
                    $firstPersonTitle.removeClass(titleValidationClass);
                }
                me.$root.find('.client-specific').hide();
                if (categoryId === C.ContactCategory.Solicitor) {
                    $review.show();
                }
                break;
            default:
                $company.show();
                $review.show();
                $website.show();

                $dx.hide();
                $relocation.hide();
                $intention.hide();
                $leadSource.hide();
                $contactPositionTab.hide();
                $publication.hide();
                $vendorReferal.hide();

                if ($firstPersonTitle.hasClass(titleValidationClass)) {
                    $firstPersonTitle.removeClass(titleValidationClass);
                }
                me.$root.find('.client-specific').hide();
                break;
        }

        me.setPMControlVisibility(categoryId);
        me.$root.validationEngine('updatePromptsPosition', undefined, true);
    },

    setPMControlVisibility: function (selectedCategoryTypeId) {
        if (!shell.pmInstalled) return;

        var me = this;

        me.setBankDetailTabVisibility();

        var isLandlord =
            me.$root.find('#IsLandlord').val().toLowerCase() === 'true' &&
            selectedCategoryTypeId === C.ContactCategory.Client;
        var isTenant =
            (me.$root.find('#HasBeenTenant').length > 0
                ? me.$root.find('#HasBeenTenant').val().toLowerCase() === 'true'
                : false) && selectedCategoryTypeId === C.ContactCategory.Client;
        var isApplicant =
            (me.$root.find('#IsApplicant').length > 0
                ? me.$root.find('#IsApplicant').val().toLowerCase() === 'true'
                : false) && selectedCategoryTypeId === C.ContactCategory.Client;
        var isProspectiveTenant =
            (me.$root.find('#HasBeenTenantOrProspectiveTenant').length > 0
                ? me.$root
                    .find('#HasBeenTenantOrProspectiveTenant')
                    .val()
                    .toLowerCase() === 'true'
                : false) && selectedCategoryTypeId === C.ContactCategory.Client;
        var isSupplier = selectedCategoryTypeId === C.ContactCategory.Supplier;
        var isSittingTenantOnly = me.isContactSittingTenantOnly();

        var nonTransactional = [
            C.ContactCategory.Bank,
            C.ContactCategory.BuildingSociety,
            C.ContactCategory.Accountant,
            C.ContactCategory.Solicitor
        ];
        var hasTransactions =
            (selectedCategoryTypeId === C.ContactCategory.Supplier ||
                isLandlord ||
                isTenant ||
                isProspectiveTenant ||
                isApplicant) &&
            $.inArray(selectedCategoryTypeId, nonTransactional) === -1 &&
            !isSittingTenantOnly;
        var hasPaymentGroups = isLandlord;
        var hasEventDates =
            selectedCategoryTypeId === C.ContactCategory.Supplier ||
            isLandlord ||
            isTenant;
        var hasAddressesTab =
            !isSittingTenantOnly &&
            (isLandlord || isTenant || isProspectiveTenant || isApplicant);

        var $tenanciesTab = me.$root.find(
            '.tab-column li[data-id="tenancies"]'
        );
        var $transactionsTab = me.$root.find(
            '.tab-column li[data-id="transactions"]'
        );
        var $managementTab = me.$root.find(
            '.tab-column li[data-id="management"]'
        );
        var $addressesTab = me.$root
            .find('.layer[data-id="contactinfo"] a[href="#addresses-tab"]')
            .parent();
        var $clientAccounts = me.$root
            .find('.layer[data-id="contactinfo"] a[href="#clientaccounts-tab"]')
            .parent();
        var $paymentDetailTab = me.$root
            .find('.layer[data-id="contactinfo"] a[href="#paymentdetails-tab"]')
            .parent();
        var $paymentGroupsTab = me.$root
            .find('.layer[data-id="contactinfo"] a[href="#paymentgroup-tab"]')
            .parent();
        var $suppliersTab = me.$root
            .find('.layer[data-id="management"] a[href="#suppliers-tab"]')
            .parent();
        var $taxTab = me.$root
            .find('.layer[data-id="contactinfo"] a[href="#taxexemptions-tab"]')
            .parent();
        var $eventDatesTab = me.$root.find(
            '.tab-column li[data-id="managementevents"]'
        );

        function setVisibility(tab, showTab) {
            tab[showTab ? 'show' : 'hide']();
        }

        setVisibility($transactionsTab, hasTransactions);
        setVisibility($managementTab, isSupplier || isLandlord || isTenant);
        setVisibility($eventDatesTab, hasEventDates);
        setVisibility($paymentGroupsTab, hasPaymentGroups);
        setVisibility($addressesTab, hasAddressesTab);
        setVisibility($paymentDetailTab, isSupplier);
        setVisibility($tenanciesTab, isTenant || isProspectiveTenant);
        setVisibility($taxTab, isLandlord);
        setVisibility($suppliersTab, isLandlord);
        setVisibility($clientAccounts, isLandlord);
    },

    sizeUI: function () {
        //var me = this;
        //var rh = me.$root.height();
        //if (rh > 0) {
        //    //Overview > Timeline
        //    var $ra = me.$root.find('.recent-activity');
        //    if ($ra.length !== 0) {
        //        $ra.css('height', rh - $ra.position().top - 30);
        //    }
        //}
    },

    validate: function () {
        var me = this;

        var validEmail = true;

        $.each(
            me.$root.find(
                'input[name="Contact.Person1.EmailAddresses[].Address"]'
            ),
            function () {
                var firstPersonEmail = $(this).val();

                if (
                    firstPersonEmail == null ||
                    firstPersonEmail === '' ||
                    !validEmail
                )
                    return;

                if (
                    !gmgps.cloud.helpers.general.validateEmail(firstPersonEmail)
                ) {
                    showInfo(
                        'The First Person email address is invalid, please enter a valid email address.'
                    );
                    validEmail = false;
                }
            }
        );

        if (!validEmail) return false;

        $.each(
            me.$root.find(
                'input[name="Contact.Person2.EmailAddresses[].Address"]'
            ),
            function () {
                var secondPersonEmail = $(this).val();

                if (
                    secondPersonEmail == null ||
                    secondPersonEmail === '' ||
                    !validEmail
                )
                    return;

                if (
                    !gmgps.cloud.helpers.general.validateEmail(
                        secondPersonEmail
                    )
                ) {
                    showInfo(
                        'The Second Person email address is invalid, please enter a valid email address.'
                    );
                    validEmail = false;
                }
            }
        );

        if (!validEmail) return false;

        var companyNameIsValid = function () {
            var companyName = $.trim(
                me.$root.find('#Contact_CompanyName').val()
            );

            if (companyName.length == 0) {
                showInfo('Please supply the name of the company');
                return false;
            } else {
                return true;
            }
        };

        var paymentReferenceValid = function () {
            var valid = true;
            var test = $.trim(me.$root.find('#Contact_PaymentReference').val());

            if (test.length > 0 && test.length < 6 && shell.pmInstalled) {
                me.$root
                    .find('#Contact_PaymentReference')
                    .validationEngine(
                        'showPrompt',
                        'Payment references, where specified, must be at least 6 characters',
                        'red',
                        'topLeft',
                        true,
                        false
                    );
                valid = false;
            }

            return valid;
        };

        var personDetailsAreValid = function () {
            var valid = true;

            if (
                !me.$root.find('#contact-tab .delivery-methods .tickbox.ticked')
                    .length > 0 &&
                shell.pmInstalled
            ) {
                me.$root
                    .find('.delivery-email')
                    .validationEngine(
                        'showPrompt',
                        'Please provide a default delivery method for the contact.',
                        'x',
                        'topLeft',
                        true
                    );
                valid = false;
            }

            if (
                me.$root
                    .find('#contact-tab .delivery-methods .delivery-email')
                    .prop('checked') &&
                shell.pmInstalled
            ) {
                //check validEmail
                if (
                    !gmgps.cloud.helpers.general.validateEmail(
                        me.$root.find('.person-1 .email-addresses .email').val()
                    ) ||
                    (me.$root.find('.person-1 .email-addresses .email').val() ==
                        '' &&
                        me.$root
                            .find('.person-2 .email-addresses .email')
                            .val() == '')
                ) {
                    me.$root
                        .find('.person-1 .email-addresses .email')
                        .validationEngine(
                            'showPrompt',
                            'Please provide a valid email for the contact.',
                            'x',
                            'topLeft',
                            true
                        );
                    valid = false;
                }
            }

            if (
                me.$root
                    .find('#contact-tab .delivery-methods .confirmation-sms')
                    .prop('checked') &&
                shell.pmInstalled
            ) {
                //check valid sms phone
                if (
                    !me.personHasValidPhoneOfType(
                        me.$root.find('.person-1'),
                        'Mobile'
                    ) &&
                    !me.personHasValidPhoneOfType(
                        me.$root.find('.person-2'),
                        'Mobile'
                    )
                ) {
                    me.$root
                        .find('.person-1 .phones')
                        .validationEngine(
                            'showPrompt',
                            'Please provide a mobile phone number for the contact.',
                            'x',
                            'topLeft',
                            true
                        );
                    valid = false;
                }
            }

            return valid;
        };

        var categoryId = me.getCategoryId();

        switch (categoryId) {
            case C.ContactCategory.Client:
                if (!personDetailsAreValid()) return false;
                break;

            case C.ContactCategory.Supplier:
                if (!companyNameIsValid()) return false;
                break;
            case C.ContactCategory.Accountant:
                if (!personDetailsAreValid()) return false;
                break;
            default:
                if (!companyNameIsValid()) return false;
                break;
        }

        var isSupplier = categoryId === C.ContactCategory.Supplier;

        var isLandlord = false;
        var isTenant = false;
        var isProspectiveTenant = false;
        var isApplicant = false;

        if (categoryId === C.ContactCategory.Client) {
            isLandlord =
                me.$root.find('#IsLandlord').val().toLowerCase() === 'true';

            isTenant =
                me.$root.find('#HasBeenTenant').length > 0
                    ? me.$root.find('#HasBeenTenant').val().toLowerCase() ===
                    'true'
                    : 'false' === 'true';

            isProspectiveTenant =
                me.$root.find('#HasBeenTenantOrProspectiveTenant').length > 0
                    ? me.$root
                        .find('#HasBeenTenantOrProspectiveTenant')
                        .val()
                        .toLowerCase() === 'true'
                    : false;

            isApplicant =
                me.$root.find('#IsApplicant').val().toLowerCase() === 'true';
        }
        if (
            isSupplier ||
            isLandlord ||
            isTenant ||
            isProspectiveTenant ||
            isApplicant
        ) {
            if (!paymentReferenceValid()) return false;
        }

        var financialServicesDataMandatory =
            me.$root
                .find('input.financialServicesInfoIsMandatory')
                .val()
                .toLowerCase() === 'true';
        var contactType = me.getCategoryId();
        if (
            financialServicesDataMandatory &&
            contactType === C.ContactCategory.Client
        ) {
            var financialServicesAction = me.$root
                .find('#Contact_Applicant_FSStatusId')
                .val();
            if (financialServicesAction === '0') {
                showInfo(
                    'Please select a value other than "Not specified" for the Financial Services Action.'
                );
                return false;
            }

            var financialServicesReferralNotes = me.$root
                .find('#Contact_Applicant_FSNonReferralNotes')
                .val();
            if (financialServicesReferralNotes.length === 0) {
                showInfo(
                    'Please enter some Financial Services referral notes.'
                );
                return false;
            }
        }

        //Money laundering if checked - notes must be added
        if (
            me.$root
                .find('#Contact_MoneyLaunderingCheckComplete')
                .val() === 'true' &&
            me.$root.find('#Contact_MoneyLaunderingNotes').val() == ''
        ) {
            showInfo('Please add some notes for the Money Laundering Check.');
            return false;
        }

        // OFSI - if one OFSI outcome is set then all must be set
        //      - if notes are set then all outcomes must be set
        var hasOfsiNotesSet = me.$root.find('.ofsi-new-check-notes').filter(function () { return $(this).val() != ''; }).length > 0;
        var hasOfsiOutcomesSet = me.$root.find('.ofsi-new-check-outcome[value!=""]').length > 0;
        var hasOfsiOutcomesNotSet = me.$root.find('.ofsi-new-check-outcome[value=""]').length > 0;

        if ((hasOfsiOutcomesSet && hasOfsiOutcomesNotSet) || (hasOfsiNotesSet && !hasOfsiOutcomesSet)) {
            showInfo('Please select an outcome for each person for the OFSI check.');

            return false;
        }

        me.$root.find('.opt-validate').validationEngine({
            scroll: false
        });

        var valid = me.$root
            .find('.opt-validate')
            .andSelf()
            .validationEngine('validate');

        if (!valid) {
            return false;
        }

        return true;
    },

    personHasValidPhoneOfType: function ($personRoot, phoneType) {
        var $option = $personRoot.find(
            '.phones .row[data-type="phone"] .phoneType option[value="' +
            phoneType +
            '"]:selected'
        );
        if ($option.length) {
            if ($option.parent().find('.phone').val() !== '') {
                return true;
            }
        }
        return false;
    },

    initLayer: function ($layer) {
        var me = this;
        var name = $layer.attr('data-id');

        if (me.layers.isConfigured(name) === true) {
            console.debug('Layer ' + name + ' already initialised');
            return;
        }

        var isTenant =
            me.$root.find('#HasBeenTenant').length > 0
                ? me.$root.find('#HasBeenTenant').val().toLowerCase() === 'true'
                : 'false' === 'true';
        var isSupplier = me.getCategoryId() === C.ContactCategory.Supplier;
        var isLandlord =
            me.$root.find('#IsLandlord').val().toLowerCase() === 'true';

        $layer.off();
        $layer.trigger('compile-angular');

        me.initControls($layer);

        me.asyncContent.render($layer, me);

        me.setupRemittanceRemarks();

        if (shell.pmInstalled) {
            if (!me.reinit) {
                shell.uiPermissions.tabPermissions(
                    $layer.find('.tabs.contact-info-tabs')
                );
            }
        }

        if (me.$root.find('#IsAnonymised').val() === 'True') {
            me.lockdownContact();
        }

        switch (name) {
            case 'overview':
                me.initMatching();
                me.countMatches();
                me.refreshFollowUps();
                break;

            case 'contactinfo':
                me.setupSolicitor(me.$root.find('#SolicitorIdentity'));
                me.setupSolicitorReferredExt(me.$root.find('#SolicitorReferredExt'));

                me.setupBankDetails(me.$root.find('#BankAccountIdentity'));

                me.setBankDetailTabVisibility();

                me.checkReferralEligible();
                
                // Initialize AddressUIStateManager after HTML content is loaded
                if (!me.addressUIStateManager) {
                    me.addressUIStateManager = new gmgps.cloud.ui.controls.AddressUIStateManager('[data-address-type="main-contact"]');
                    
                    // Initialize PostcodePicker with AddressUIStateManager integration
                    if (!me.postcodePicker) {
                        me.postcodePicker = new gmgps.cloud.ui.controls.PostcodePicker({
                            eventSource: me.addressUIStateManager.getContainer(), // Scope to specific address container
                            onComplete: function () {
                                me.checkReferralEligible();
                            },
                            includeCounty: false,
                            populateFieldsFromFoundAddress: me.addressUIStateManager.populateFieldsFromFoundAddress(),
                            showNewDropdownCallback: function($postcode, addresses) {
                                me.addressUIStateManager.showNewAddressDropdown($postcode, addresses);
                            },
                            clearNewDropdownCallback: function() {
                                me.addressUIStateManager.clearNewAddressDropdown();
                            }
                        });
                    }
                }

                me.intentionId = parseInt(
                    $layer.find('#Contact_Applicant_IntentionId').val()
                );

                var referredByUserId = parseInt(
                    $layer.find('#Contact_Applicant_FSReferredByUserId').val()
                );

                if (
                    !$layer
                        .find('#Contact_Applicant_FSReferredByUserId')
                        .hasClass('disabled')
                ) {
                    if (referredByUserId === 0) {
                        $layer
                            .find('#Contact_Applicant_FSReferredToContactId')
                            .prop('disabled', true);
                        $layer
                            .find('#Contact_Applicant_FSReferredToUserId')
                            .prop('disabled', true);
                    } else {
                        $layer
                            .find('#Contact_Applicant_FSReferredToContactId')
                            .prop('disabled', false);
                        $layer
                            .find('#Contact_Applicant_FSReferredToUserId')
                            .prop('disabled', false);
                    }
                }

                me.views['preferences'] =
                    new gmgps.cloud.ui.views.contact.PreferenceCentreHandler({
                        $root: $layer.find('.consent-preferences'),
                        id: me.id,
                        branchId: me.$root.find('#BranchId').val(),
                        dirtyHandler: function (isDirty, target) {
                            me.setDirty(isDirty, target);
                        },
                        contactDetails: me
                    });

                var showPreferences = function (categoryId) {
                    if (categoryId === C.ContactCategory.Client) {
                        me.$root.find('.category-link-Client').show();
                    } else {
                        me.$root.find('.category-link-Client').hide();
                    }
                };

                var categoryId = me.getCategoryId();
                showPreferences(categoryId);

                $layer.find('#Contact_Category').on('change', function (e) {
                    var selectedCategoryId = parseInt($(e.target).val());
                    me.setCategoryId(selectedCategoryId);
                    showPreferences(selectedCategoryId);
                });

                if (shell.pmInstalled) {
                    shell.uiPermissions
                        .getPermissions()
                        .done(function (permissions) {
                            if (!permissions) return;

                            // only create handlers for things user has permissions to access
                            if (
                                permissions['contactaddress'] &&
                                permissions['contactaddress'] >
                                C.Permissions.UserAccessLevels.None
                            ) {
                                me.views['addresses'] =
                                    new gmgps.cloud.ui.views.contact.addressHandler(
                                        {
                                            $root: $layer.find('.addresses'),
                                            id: me.id,
                                            dirtyHandler: function (
                                                isDirty,
                                                target
                                            ) {
                                                me.setDirty(isDirty, target);
                                            },
                                            contactDetails: me
                                        }
                                    );
                            }

                            if (
                                permissions['bankaccount'] &&
                                permissions['bankaccount'] >
                                C.Permissions.UserAccessLevels.None
                            ) {
                                me.views['bankDetails'] =
                                    new gmgps.cloud.ui.views.bankDetailsHandler(
                                        {
                                            $root: $layer.find('.bank-details'),
                                            contactId: me.id
                                        }
                                    );
                            }

                            if (
                                permissions['supplierpaymentdetail'] &&
                                permissions['supplierpaymentdetail'] >
                                C.Permissions.UserAccessLevels.None
                            ) {
                                me.views['paymentDetails'] =
                                    new gmgps.cloud.ui.views.paymentDetailsHandler(
                                        {
                                            $root: $layer.find(
                                                '.payment-details'
                                            ),
                                            linkedId: me.id,
                                            linkedTypeId: C.ModelType.Contact,
                                            dirtyHandler: $.proxy(
                                                me.setDirty,
                                                me
                                            )
                                        }
                                    );
                            }

                            if (
                                permissions['clientaccount'] &&
                                permissions['clientaccount'] >
                                C.Permissions.UserAccessLevels.None
                            ) {
                                me.views['clientAccount'] =
                                    new gmgps.cloud.ui.views.clientAccountHandler(
                                        {
                                            $root: $layer.find(
                                                '.client-accounts'
                                            ),
                                            linkedId: me.id,
                                            linkedTypeId: C.ModelType.Contact,
                                            dirtyHandler: function (
                                                isDirty,
                                                target
                                            ) {
                                                me.setDirty(isDirty, target);
                                            }
                                        }
                                    );
                            }

                            if (
                                permissions['paymentgroup'] &&
                                permissions['paymentgroup'] >
                                C.Permissions.UserAccessLevels.None
                            ) {
                                me.views['paymentGroups'] =
                                    new gmgps.cloud.ui.views.contact.paymentGroupHandler(
                                        {
                                            $root: $layer.find(
                                                '.payment-groups'
                                            ),
                                            id: me.id
                                        }
                                    );
                            }

                            if (
                                permissions['landlordtax'] &&
                                permissions['landlordtax'] >
                                C.Permissions.UserAccessLevels.None
                            ) {
                                me.views['landlordTaxes'] =
                                    new gmgps.cloud.ui.views.contact.taxItemHandler(
                                        {
                                            $root: $layer.find(
                                                '.landord-taxes'
                                            ),
                                            id: me.id,
                                            dirtyHandler: $.proxy(
                                                me.setDirty,
                                                me
                                            )
                                        }
                                    );
                            }
                        });
                }
                break;

            case 'timeline':
                //Exit early if this is a new, unsaved contact.
                if (me.id === 0) {
                    return false;
                }

                me.orderBy = C.SearchOrderBy.StartDate;
                me.orderType = C.SearchOrderType.Descending;

                me.toggleNotesBehaviour.apply($layer, function (changedMode) {
                    me.notesOrFeedback = changedMode;
                });
                me.notesOrFeedback =
                    me.toggleNotesBehaviour.getSelectedMode($layer);

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

            case 'matches':

                me.initMatching();

                me.matching.initLayer();

                break;

            case 'documents':
                //persist edits to scrollable text area to hidden field
                $layer.on('blur', '.captionScroller', function () {
                    $(this).siblings('.caption').val($(this).val());
                });

                //delete single document
                $layer.on('click', '.contactdoc .delete-button', function (e) {
                    var self = this;

                    showDialog({
                        type: 'question',
                        title: 'Delete Document?',
                        msg: 'Are you sure you would you like to delete this document?',
                        buttons: {
                            Yes: function () {
                                $(this).dialog('close');

                                if (!me.setDirty(true, e)) {
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
                    '.contactdocs .delete-selected-button',
                    function (e) {
                        var files = $layer.find(
                            '.contactdocs .contactdoc .selector:checked'
                        );

                        if (files.length === 0) {
                            showInfo(
                                'No documents have been selected to delete, please select at least one file first.'
                            );
                            return false;
                        }

                        showDialog({
                            type: 'question',
                            title: 'Delete Documents',
                            msg: 'Are you sure you would you like to delete the {0} selected documents?'.format(
                                files.length
                            ),
                            buttons: {
                                Yes: function () {
                                    $(this).dialog('close');

                                    if (!me.setDirty(true, e)) {
                                        return false;
                                    }

                                    for (var i = 0; i < files.length; i++) {
                                        var file = files[i];
                                        $(file)
                                            .closest('li.contactdoc')
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

                //single file email
                $layer.on('click', '.contactdoc .email-button', function () {
                    var dId = $(this).closest('.contactdoc').attr('data-id');
                    if (dId < 0) {
                        showInfo(
                            'The selected document has not yet been saved, please save the contact record before emailing.'
                        );
                        return false;
                    }

                    var fileArrays = new Array();
                    fileArrays.push({
                        id: dId,
                        name: $(this)
                            .closest('.contactdoc')
                            .attr('data-caption'),
                        icon: $(this).closest('.contactdoc').attr('data-icon'),
                        url: $(this).closest('.contactdoc').attr('data-url'),
                        type: 'File',
                        modeltypeid: C.ModelType.MediaFile,
                        filetypeid: $(this)
                            .closest('.contactdoc')
                            .attr('data-filetypeid'),
                        category: $(this)
                            .closest('.contactdoc')
                            .attr('data-category')
                    });

                    gmgps.cloud.helpers.general.createEmail({
                        complex: false,
                        contentType: 'application/json; charset=utf-8',
                        data: JSON.stringify({
                            contactIds: [me.id],
                            medias: fileArrays
                        })
                    });
                });

                //email selected files
                $layer.on(
                    'click',
                    '.contactdocs .email-selected-button',
                    function () {
                        var files = $layer.find(
                            '.contactdocs .contactdoc .selector:checked'
                        );

                        if (files.length === 0) {
                            showInfo(
                                'No documents have been selected to email, please select at least one file first.'
                            );
                            return false;
                        }

                        var someNotSaved = false;

                        var fileArrays = new Array();
                        for (var i = 0; i < files.length; i++) {
                            var file = files[i];
                            var dId = $(file)
                                .closest('.contactdoc')
                                .attr('data-id');

                            if (dId < 0) {
                                someNotSaved = true;
                            } else {
                                fileArrays.push({
                                    id: dId,
                                    name: $(file)
                                        .closest('.contactdoc')
                                        .attr('data-caption'),
                                    icon: $(file)
                                        .closest('.contactdoc')
                                        .attr('data-icon'),
                                    url: $(file)
                                        .closest('.contactdoc')
                                        .attr('data-url'),
                                    type: 'File',
                                    modeltypeid: C.ModelType.MediaFile,
                                    filetypeid: $(file)
                                        .closest('.contactdoc')
                                        .attr('data-filetypeid'),
                                    category: $(file)
                                        .closest('.contactdoc')
                                        .attr('data-category')
                                });
                            }
                        }

                        if (someNotSaved) {
                            showInfo(
                                'One or more documents have not yet been saved, please save the contact record before emailing.'
                            );
                        } else {
                            gmgps.cloud.helpers.general.createEmail({
                                complex: false,
                                contentType: 'application/json; charset=utf-8',
                                data: JSON.stringify({
                                    contactIds: [me.id],
                                    medias: fileArrays
                                })
                            });
                        }
                    }
                );

                //select all files
                $layer.on('click', '.contactdocs .all-selector', function () {
                    if (this.checked) {
                        $layer
                            .find('.contactdoc .selector')
                            .prop('checked', true)
                            .closest('.tickbox')
                            .addClass('ticked');
                    } else {
                        $layer
                            .find('.contactdoc .selector')
                            .prop('checked', false)
                            .closest('.tickbox')
                            .removeClass('ticked');
                    }
                });

                //select one file and check for all selected
                $layer.on('click', '.contactdoc .selector', function () {
                    if (!this.checked) {
                        $layer
                            .find('.contactdocs .all-selector')
                            .prop('checked', false)
                            .closest('.tickbox')
                            .removeClass('ticked');
                    } else {
                        var selectors = $layer.find('.contactdoc .selector');
                        var selectorsChecked = $layer.find(
                            '.contactdoc .selector:checked'
                        );
                        if (selectors.length === selectorsChecked.length) {
                            $layer
                                .find('.contactdocs .all-selector')
                                .prop('checked', true)
                                .closest('.tickbox')
                                .addClass('ticked');
                        }
                    }
                });
                break;

            case 'tenancies':
                break;

            case 'transactions':
                if (shell.pmInstalled) {
                    me.views[name] = new gmgps.cloud.ui.views.transactionsHandler(
                        {
                            $root: $layer.find('.transactions'),
                            linkedId: me.id,
                            linkedTypeId: C.ModelType.Contact
                        }
                    );
                }
                break;

            case 'management':
                if (shell.pmInstalled) {
                    $layer.find('.tabs').tabs({
                        create: function (event, ui) {
                            shell.uiPermissions.tabContentPermissions(
                                ui.tab,
                                ui.panel
                            );
                        },
                        beforeActivate: function (event, ui) {
                            shell.uiPermissions.tabContentPermissions(
                                ui.newTab,
                                ui.newPanel
                            );
                        },
                        activate: function (event, ui) {
                            me.onSubTabClicked.raise(ui.newTab);

                            var label = ui.newTab.attr('galabel');
                            if (label) {
                                googleAnalytics.sendEvent(
                                    'contacts',
                                    'tab_click',
                                    label
                                );
                            }
                        }
                    });

                    shell.uiPermissions.tabPermissions($layer.find('.tabs'));

                    if (isTenant || isSupplier || isLandlord) {
                        var modelTypeIdList = [];

                        if (isTenant) modelTypeIdList.push(C.ModelType.Tenant);
                        if (isSupplier)
                            modelTypeIdList.push(C.ModelType.Supplier);
                        if (isLandlord)
                            modelTypeIdList.push(C.ModelType.Landlord);

                        me.views['managementEvents'] =
                            new gmgps.cloud.ui.views.managementDatesHandler({
                                $root: $layer.find('.managementevents'),
                                linkedId: me.id,
                                linkedTypeId: C.ModelType.Contact,
                                linkedTypeIdList: modelTypeIdList,
                                dirtyHandler: function (isDirty, target) {
                                    me.setDirty(isDirty, target);
                                }
                            });
                    }

                    me.views['suppliers'] =
                        new gmgps.cloud.ui.views.contact.supplierHandler({
                            $root: $layer.find('.suppliers'),
                            id: me.id,
                            dirtyHandler: function (isDirty, target) {
                                me.setDirty(isDirty, target);
                            }
                        });

                    me.views['workordersHandler'] =
                        new gmgps.cloud.ui.views.workordersHandler({
                            $root: $layer.find('.workorders'),
                            linkedId: me.id,
                            linkedTypeId: C.ModelType.Contact,
                            dirtyHandler: function (isDirty, target) {
                                me.setDirty(isDirty, target);
                            }
                        });
                }
                break;
            case 'propertyfile':
                return me._loadPropertyFileDashboard();                
        }
    },

    refreshLayer: function (layerName) {
        var me = this;
        return me.layers.refresh(layerName, function ($layer) { return me.initLayer($layer); });
    },

    setUIState: function (state) {
        var me = this;

        me.tabColumn.selectTab(
            state.activeLayer || null,
            state.selectedTab || null
        );
    },

    getUIState: function () {
        var me = this;

        var activeLayer = me.$root
            .find('.tab-column ul li.selected')
            .attr('data-id');

        // layer may have tabs too
        var selectedTab = me.$root
            .find('.layers .layer[data-id="' + activeLayer + '"]')
            .find('ul.ui-tabs-nav li[tabindex="0"] a')
            .attr('href');

        return {
            activeLayer: activeLayer,
            selectedTab: selectedTab
        };
    },

    setStepThroughTimeLineFilterState: function () {
        var me = this;

        if (me.cfg.initialTimelineFilters) {
            var $this = me.$root.find('.tag-history');

            $this
                .find('.box-toggles[data-type="contact"] .box-toggle')
                .removeClass('on bg-contact mixed');

            var $mainToggles = $this.find(
                '.box-toggles[data-type="contact"]:not(.viewing)'
            );

            var $masterToggle = $mainToggles.find('.box-toggle.master');

            $.each(me.cfg.initialTimelineFilters.eventTypes, function (i, v) {
                $mainToggles
                    .find('.box-toggle[data-typeid="{0}"]'.format(v))
                    .addClass('on bg-contact');
            });

            var toggleCount = $mainToggles.find('.box-toggle').length - 1; // ignoring master toggle

            var toggleOnCount = me.cfg.initialTimelineFilters.eventTypes.length;

            if (toggleCount === toggleOnCount) {
                $masterToggle.addClass('on bg-contact');
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
                            .addClass('on bg-contact');
                    }
                );
            } else {
                me.viewingSubTypes =
                    me.cfg.initialTimelineFilters.viewingSubTypes;
            }
        }
    },

    getLayer: function (layerId) {
        var me = this;

        return me.$root.find(
            '.layer[data-id="' + layerId + '"]'
        );
    },
    showSpecifiedLayer: function (tabColumnTabName) {
        var me = this;

        me.$root.find('.content-container .layer').hide();
        me.$root
            .find(
                '.content-container .layer[data-id="' +
                tabColumnTabName +
                '"]'
            )
            .show();
    },

    showDetailLayer: function (args) {
        var me = this;

        //Store the selected layer name (unless it is the uploader layer - we don't care about that one).
        if (args.id !== 'upload') {
            me.selectedLayer = args.id;
        }

        var onLoaded = function (id) {
            // only enable matches toolbar when Requirements selected
            var $toolbar = $('#toolbar .group[data-group="contact"] .detail');
            me.hideMatches($toolbar);

            me.setupUIForCategory();

            switch (id) {
                case 'contactinfo':

                    me.setSalesProgressionConveyancerReferralsMfeVisibility();

                    break;

                case 'matches':
                    me.showMatches($toolbar);
                    me.matching.activate();

                    break;

                case 'timeline':
                    var $this = me.$root.find('.tag-history');

                    if (args.subId) {
                        //Turn off all toggles.
                        $this.find('.box-toggle.on').removeClass('on bg-contact');

                        //Turn on the desired toggle.
                        $this
                            .find('.box-toggle[data-typeid="' + args.subId + '"]')
                            .trigger('click');
                    }

                    break;

                case 'documents':
                    break;
                case 'transactions':
                    // Render transactions list on click
                    if (me.views.transactions)
                        me.views.transactions.renderTransactions(1);
                    else
                        me.views.transactions = me.getContactTransactions();
                    break;

                default:
                    break;
            }

            //Look to see if a default tab was requested.
            if (me.tabName) {
                var tabName = me.tabName;
                //Clear
                me.tabName = undefined;

                //Switch to tab (todo: this will require the tab group name to be sent in, not just the tab name (e.g. property-info-tabs).  until then, try to make tab names unique...)
                me.tabColumn.selectTab(
                    me.$root.find('a[href="#' + tabName + '-tab"]')
                );
            }
        }

        me.layers.show(args.id, onLoaded, function ($layer) { return me.initLayer($layer); });
    },
    getContactTransactions: function () {
        var me = this;
        return new gmgps.cloud.ui.views.transactionsHandler(
            {
                $root: me.$root.find('.layer[data-id="transactions"]').find('.transactions'),
                linkedId: this.id,
                linkedTypeId: C.ModelType.Contact
            })
    },

    initUploader: function (type) {
        var me = this;
        var maxFileSize, sizing, filters;
        var branchId = me.$root.find('#Contact_BranchId').val();
        var entityId = me.$root.find('#Contact_Id').val();

        switch (type) {
            case 'doc':
                maxFileSize = '50mb';
                sizing = { width: 1920, height: 1080, quality: 95 };
                filters = [
                    {
                        title: 'Document files',
                        extensions:
                            'doc,pdf,docx,rtf,txt,jpg,png,gif,xls,xlsx,xlw,wma,mp3,mp4,jpeg,msg'
                    }
                ];
                break;
        }

        var configureUploader = function (modelTypeId, mediaTypeId, thisType) {
            var thisUploader = me.$root
                .find('.uploader[data-type="' + thisType + '"]')
                .pluploadQueue();

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
                    theme: 'growl-system'
                });
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
                me.$root.find('.' + thisType + 's').append($(info.response));
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

            return thisUploader;
        };

        //Create uploader
        me.$root.find('.uploader[data-type="' + type + '"]').pluploadQueue({
            runtimes: 'html5,flash,silverlight,gears,html4',
            url: '/Upload/AcceptFile',
            max_file_size: maxFileSize,
            unique_names: false,
            resize: sizing,
            filters: filters,
            flash_swf_url: '/scripts/jquery/plugins/plupload/moxie.swf',
            silverlight_xap_url: '/scripts/jquery/plugins/plupload/moxie.xap'
        });

        switch (type) {
            case 'doc':
                me.photoUploader = configureUploader(
                    C.ModelType.Contact,
                    C.MediaType.Document,
                    type
                );
                break;
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
                                ContactId: me.id,
                                ContextModelType: C.ModelType.Contact,
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
                                ContactId: me.id,
                                TimelineSearchType: C.EventSearchType.TimelineFull,
                                ContextModelType: C.ModelType.Contact,
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
                        url: '/Timelines/Contact',
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
                        ContactId: me.id,
                        ContextModelType: C.ModelType.Contact,
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
                    'Contact/PrintTimeline',
                    args
                );

                $form.submit();
                $form.remove();
            });
    },
    setDirty: function (isDirty, target) {
        var me = this;

        if (
            me.cfg.dirtyLimitCheckCallback &&
            !me.cfg.dirtyLimitCheckCallback()
        ) {
            return false;
        }

        // mark the closest tab as dirty, but if not contained in tab, mark the layer dirty instead
        if (target) {
            var found = false;
            var $tabContainer = $(target.currentTarget).closest(
                '.content.ui-tabs-panel[data-tabupdateenabled="true"]'
            );

            if ($tabContainer.length === 1) {
                $tabContainer.attr('data-istabdirty', isDirty);
                found = true;
            }

            if (!found) {
                var $layerContainer = $(target.currentTarget).closest(
                    '.layer[data-layerupdateenabled="true"]'
                );

                if ($layerContainer.length === 1) {
                    $tabContainer.attr('data-istabdirty', isDirty);
                }
            }
        }

        //Set Dirty
        if (isDirty && !me.isDirty) {
            me.$root.find('#IsDirty').val(isDirty);
            me.isDirty = true;
            me.onChanged.raise();
        }

        //Set Clean
        if (!isDirty && me.isDirty) {
            me.$root.find('#IsDirty').val('');
            me.isDirty = false;
            
            // Transition address UI to preview mode after successful save
            if (me.addressUIStateManager && me.addressUIStateManager.useNewAddressUi) {
                me.addressUIStateManager.showPreview();
            }
            
            // Transition other addresses to preview mode using clean public method
            if (me.views['addresses']) {
                me.views['addresses'].transitionAddressManagersToPreview();
            }
        }

        return true;
    },

    deleteTelephone: function ($item) {
        var me = this;
        $item.removeClass('telephone').addClass('deleted-telephone');
        $item.appendTo(me.$root.find('.deleted-telephones'));
        var html = $item.html();
        html = html.replace(/Telephones/g, 'DeletedTelephones');
        $item.html(html);
    },

    deleteEMailAddress: function ($item) {
        var me = this;
        $item.removeClass('emailaddress').addClass('deleted-emailaddress');
        $item.appendTo(me.$root.find('.deleted-emailaddresses'));
        var html = $item.html();
        html = html.replace(/EmailAddresses/g, 'DeletedEmailAddresses');
        $item.html(html);
    },

    getHistory: function (args) {
        new gmgps.cloud.http("contactdetails-getHistory").ajax(
            {
                args: {
                    eventType: args.eventType,
                    viewName: args.viewName,
                    contactId: args.contactId,
                    branchId: args.branchId,
                    pageIndex: args.pageIndex,
                    pageSize: args.pageSize,
                    orderBy: args.orderBy,
                    orderAsc: args.orderAsc
                },
                dataType: 'json',
                type: 'post',
                url: '/Contact/GetHomeTimeline'
            },
            function (response) {
                args.$container[0].innerHTML = response.Data;
            },
            function (error) {
                alert(error);
            }
        );
    },

    addNote: function ($sticky) {
        var me = this;
        shell.addStickyNote({
            $sticky: $sticky,
            linkedId: me.id,
            modelType: C.ModelType.Contact,
            branchId: me.$root.find('#Contact_BranchId').val(),
            $container: me.$root,
            containment: me.$root.find('.layers')
        });
    },

    addWorkOrder: function () {
        var me = this;
        me.layers.show('management', function () {
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

    refreshOverview: function () {
        var me = this;

        return me.layers.load('overview')
            .then(function () {
                me.sizeUI();

                setTimeout(function () {
                    me.$root.find('.followups').followUpDropdown({
                        linkedType: C.ModelType.Contact,
                        linkedId: me.id,
                        display: 'slide'
                    });
                }, 100);

                if (me.$root.find('#IsAnonymised').val() === 'True') {
                    me.lockdownContact();
                }
            });
    },
    refreshTransactions: function () {
        var me = this,
            pageIndex = 1;
        if (me.views.transactions) {
            me.views.transactions.updatePageIndex(pageIndex);
            return me.views.transactions.renderTransactions(pageIndex);
        }
    },

    printTransactions: function (orderByCreateDate) {
        var me = this;

        me.layers.load('transactions')
            .then(function ($layers) {
                new gmgps.cloud.ui.views.transactionsHandler({
                    $root: $layers[0].find('.transactions'),
                    linkedId: me.id,
                    linkedTypeId: C.ModelType.Contact
                }).printTransactions(orderByCreateDate);
            });
    },
    refreshPaymentGroups: function () {
        var me = this;
        if (me.views.paymentGroups) {
            me.views.paymentGroups.refreshLayer().done(function () {
                me.setupUIForCategory();
            });
        }
    },

    refreshContact: function () {
        var me = this;
        return Q.all([
            me.layers.refresh('overview', $layer => me.initLayer($layer)),
            me.layers.refresh('core', $layer => me.initLayer($layer))
        ]);
    },

    getCategoryId: function () {
        var me = this;

        return parseInt(me.$root.find('#ContactCategoryId').val());
    },

    setCategoryId: function (category) {
        var me = this;

        me.$root.find('#ContactCategoryId').val(category);
    },

    refreshNewContactLayers: function (newId) {
        var me = this;

        me.setContactId(newId);
        me.layers.load('overview');
    },

    updateClientIntention: function () {
        var me = this;

        var $clientIntention = me.$root.find('.client-intention');

        var profileTypes = me.matching.existingProfileTypes();

        if (profileTypes.buyCount > 0 && profileTypes.rentCount > 0) {
            $clientIntention.val(C.ClientIntentionType.BuyOrRent.toString());
            $clientIntention.trigger('prog-change');
        } else if (profileTypes.buyCount > 0 && profileTypes.rentCount === 0) {
            $clientIntention.val(C.ClientIntentionType.Buy.toString());
            $clientIntention.trigger('prog-change');
        } else if (profileTypes.buyCount === 0 && profileTypes.rentCount > 0) {
            $clientIntention.val(C.ClientIntentionType.Rent.toString());
            $clientIntention.trigger('prog-change');
        }
    },

    setupSolicitor: function ($e) {
        var me = this;

        if ($e.hasClass('has-autocomplete')) return;

        $e.autoCompleteEx({
            modelType: C.ModelType.Contact,
            search: {
                CategoryIdList: [C.ContactCategory.Solicitor],
                ApplyFurtherFilteringtoIds: true,
                FullQuery: true
            },
            allowCreate: true,
            includeContacts: true,
            includeUsers: false,
            placeholder: 'Search for Solicitor...',
            newContactCategory: C.ContactCategory.Solicitor,
            onSelected: function (args) {
                if (args.isSetupCallback) return false;

                if (!me.setDirty(true)) {
                    return false;
                }

                me.$root
                    .find('#UpdateContactsSalesWithNewSolicitor')
                    .val('false');

                if (me.id === 0) {
                    me.$root.find('#Contact_SolicitorContactId').val(args.id);
                    me.$root
                        .find('#UpdateContactsSalesWithNewSolicitor')
                        .val('false');
                    return;
                }

                new gmgps.cloud.http("contactdetails-onSelected").ajax(
                    {
                        args: { contactId: me.id },
                        complex: true,
                        dataType: 'json',
                        type: 'post',
                        url: '/Progression/ContactHasOutstandingProgressions'
                    },
                    function (response) {
                        if (!response.Data) {
                            me.$root
                                .find('#UpdateContactsSalesWithNewSolicitor')
                                .val('true');
                            me.$root
                                .find('#Contact_SolicitorContactId')
                                .val(args.id);
                            return;
                        }

                        showDialog({
                            type: 'question',
                            title: 'Update Existing Sales',
                            msg: "Would you like to update all of this contact's sales in progress with the new Solicitor?",
                            buttons: {
                                Yes: function () {
                                    me.$root
                                        .find(
                                            '#UpdateContactsSalesWithNewSolicitor'
                                        )
                                        .val('true');
                                    me.$root
                                        .find('#Contact_SolicitorContactId')
                                        .val(args.id);
                                    $(this).dialog('close');
                                },
                                No: function () {
                                    me.$root
                                        .find('#Contact_SolicitorContactId')
                                        .val(args.id);
                                    me.$root
                                        .find(
                                            '#UpdateContactsSalesWithNewSolicitor'
                                        )
                                        .val('false');
                                    $(this).dialog('close');
                                }
                            }
                        });
                    }
                );
            },
            onRemoved: function () {
                if (!me.setDirty(true)) {
                    return false;
                }

                me.$root.find('#Contact_SolicitorContactId').val(0);
            }
        });
    },

    setupSolicitorReferredExt: function ($e) {
        var me = this;

        $e.autoCompleteEx({
            modelType: C.ModelType.Solicitor,
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
                if (args.isSetupCallback) return false;

                if (!me.setDirty(true)) {
                    return false;
                }

                me.$root
                    .find('#Contact_Applicant_SolicitorReferredToContactId')
                    .val(args.id)
                    .trigger('change');
            },
            onRemoved: function () {
                if (!me.setDirty(true)) {
                    return false;
                }

                me.$root
                    .find('#Contact_Applicant_SolicitorReferredToContactId')
                    .val(0);
            }
        });
    },

    setupBankDetails: function ($e) {
        var me = this;

        $e.autoCompleteEx({
            modelType: C.ModelType.Contact,
            search: {
                CategoryIdList: [C.ContactCategory.Bank],
                ApplyFurtherFilteringtoIds: true,
                FullQuery: true
            },
            allowCreate: true,
            includeContacts: true,
            displayCompanyName: true,
            includeUsers: false,
            placeholder: 'Search for Bank...',
            newContactCategory: C.ContactCategory.Bank,
            onSelected: function (args) {
                if (!args.isSetupCallback) {
                    me.setDirty(true);
                }
            },
            onRemoved: function () {
                me.setDirty(true);
            }
        });
    },

    checkReferralEligible: function () {
        var me = this;

        var category = me.getCategoryId();
        if (category !== C.ContactCategory.Client) {
            me.updateReferralEligibleUI(false);
            return false;
        }

        //check for referral
        var branchId = me.$root.find('#BranchId').val();
        var postcode = me.$root.find('#Contact_Address_Postcode').val();
        var referralEligible =
            gmgps.cloud.helpers.contact.checkReferralEligability(
                branchId,
                postcode
            );
        me.updateReferralEligibleUI(referralEligible);
        return referralEligible;
    },

    updateReferralEligibleUI: function (eligible) {
        var me = this;

        var consentPreferences = me.getContactConsentPreferences();
        var referralConsentGranted =
            consentPreferences['relocation-agent-network'] ==
            C.ConsentOptInOption.Granted;

        if (eligible) {
            me.$root.find('.referral-container').fadeIn();
        } else {
            me.$root.find('.referral-container').fadeOut();
        }

        if (eligible && referralConsentGranted) {
            //only show menu item on contacts not already referred
            var alreadyReferred = me.$root.find('#Contact_Referred');
            if (!alreadyReferred.length > 0)
                $(
                    '#toolbar .group[data-group="contact"] .detail div[data-id="action"] li[data-id="refer-as-vendor"]'
                ).show();
        } else {
            $(
                '#toolbar .group[data-group="contact"] .detail div[data-id="action"] li[data-id="refer-as-vendor"]'
            ).hide();
        }
    },

    referVendor: function () {
        var me = this;
        gmgps.cloud.helpers.contact.referAsVendor(me);
    },

    viewEmailHistory: function (contactId) {
        var me = this;

        new gmgps.cloud.ui.controls.window({
            title: 'Manage Email Address History',
            windowId: 'contactEmailAddressHistoryModal',
            controller: gmgps.cloud.ui.views.contact,
            url: 'Contact/GetEmailAddressHistoryManagementWindow',
            urlArgs: { contactId: contactId },
            post: false,
            complex: false,
            nopadding: false,
            width: 500,
            draggable: true,
            modal: true,
            actionButton: 'Save',
            cancelButton: 'Cancel',
            onReady: function ($window) {
                $window.on('click', '.add-telemail-button', function () {
                    //Clone the current row, alter it to suit and append to the bottom of the list.
                    var $row = $(this).closest('.row');
                    var $parent = $row.parent();
                    var $newRow = $row.clone().removeClass('template');
                    $row.find('.pm-button')
                        .removeClass('add-telemail-button plus')
                        .addClass('delete-telemail-button minus');
                    $row.find('#item_EmailAddress').attr('type', 'text');
                    $row.find('#item_FromDate').attr('type', 'text');
                    $row.find('#item_ToDate').attr('type', 'text');

                    $parent.append($newRow);
                });

                $window.on('click', '.delete-telemail-button', function () {
                    $(this).closest('.row').attr('data-deleted', 'true');
                    $(this).closest('.row').hide();

                    var liveRows = $window.find(
                        '.row:not([data-deleted="true"]):not(.template)'
                    );
                    if (liveRows.length == 0) {
                        me.$root
                            .find('.manage-email-history')
                            .removeClass('grey')
                            .addClass('disabled');
                    }
                });

                $window.on('change', 'input', function () {
                    $(this).closest('.row').attr('data-modified', 'true');
                });
            },
            onAction: function ($window) {
                var modifiedRows = $window.find(
                    '.row[data-modified="true"]:not([data-deleted="true"])'
                );

                //Date Validation
                var datesAreInvalid = false;
                try {
                    $.each(modifiedRows, function (i, v) {
                        datesAreInvalid =
                            Date.parse($(v).find('#item_FromDate')[0].value) ===
                            null;

                        if (datesAreInvalid) {
                            return false;
                        }
                        datesAreInvalid =
                            Date.parse($(v).find('#item_ToDate')[0].value) ===
                            null;

                        if (!datesAreInvalid) {
                            return false;
                        }
                        return true;
                    });
                } catch (e) {
                    datesAreInvalid = true;
                }

                if (datesAreInvalid) {
                    showInfo('Dates are not in the correct format.');
                } else {
                    var args = {
                        modifiedHistory: [],
                        historyIdsForDeletion: []
                    };

                    args.modifiedHistory = $.map(modifiedRows, function (row) {
                        return {
                            id: $(row).find('#item_Id')[0].value,
                            emailAddress:
                                $(row).find('#item_EmailAddress')[0].value,
                            fromDate: $(row).find('#item_FromDate')[0].value,
                            toDate: $(row).find('#item_ToDate')[0].value
                        };
                    });

                    args.historyIdsForDeletion = $.map(
                        $window.find('.row[data-deleted="true"]'),
                        function (row) {
                            return $(row).find('#item_Id')[0].value;
                        }
                    );

                    args.contactId = $window.find('#ContactId')[0].value;

                    new gmgps.cloud.http("contactdetails-onAction").ajax(
                        {
                            args: args,
                            complex: true,
                            dataType: 'json',
                            type: 'post',
                            url: '/Contact/SaveEmailAddressHistory'
                        },
                        function (response) {
                            if (response.Data == true) {
                                $.jGrowl(
                                    'Email Address History changes saved.',
                                    {
                                        header: 'Changes Saved',
                                        theme: 'growl-contact'
                                    }
                                );
                            } else {
                                $.jGrowl(
                                    'Email Address History update failed.',
                                    {
                                        header: 'Update Failed',
                                        theme: 'growl-contact'
                                    }
                                );
                            }
                        }
                    );
                    return true;
                }
                return false;
            },
            onCancel: function () {
                return false;
            }
        });
    },

    onSaved: function () {
        var me = this;
        if (me.emailHistoryHasChanged) {
            me.$root
                .find('.manage-email-history')
                .removeClass('disabled')
                .addClass('grey');
            me.emailHistoryHasChanged = false;
        }

        me.resetOfsiForm();

        gmgps.cloud.helpers.general.resetWarningIfValueChanged(
            $('#Contact_PaymentReference')
        );
    },

    resetOfsiForm: function () {
        var me = this;

        // Get all OFSI elements

        var $manualChecks = me.$root.find('#compliance-tab #manual-checks');
        var $table = $manualChecks.find('.ofsi-checks-table');
        var $newCheckRows = $table.find('.ofsi-new-check-row');
        var $pastCheckRows = $table.find('.ofsi-past-check');

        // Check to see if values were set for all rows

        var hasSetAllOutcomes = $table.find('.ofsi-new-check-outcome[value!=""]').length === $newCheckRows.length;
        var hasAddedNewRows = false;

        if (hasSetAllOutcomes) {
            var timestamp = moment().format('HH:mm D/MM/YYYY');
            var currentUser = $manualChecks.attr('data-currentuser');

            var newRows = '';

            for (var row of $newCheckRows) {
                var outcomeValue = $(row).find('.ofsi-new-check-outcome').val();
                var notesValue = $(row).find('.ofsi-new-check-notes').val();
                var personValue = $(row).find('.ofsi-new-check-person').val();

                var isSuccess = outcomeValue === 'true';

                var successClass = isSuccess ? 'on' : '';
                var rejectClass = isSuccess ? '' : 'on';

                newRows += `
<tr class="ofsi-past-check">
    <td>${timestamp}</td>
    <td>${personValue}</td>
    <td>
        <div class="ofsi-past-outcome">
            <div class="ofsi-outcome-badge ofsi-outcome-success ${successClass}">&nbsp;</div>
        </div>
        <div class="ofsi-past-outcome">
            <div class="ofsi-outcome-badge ofsi-outcome-failure ${rejectClass}">&nbsp;</div>
        </div>
    </td>
    <td>${currentUser}</td>
    <td class="ofsi-outcome-notes">${notesValue}</td>
</tr>
`;         
            }

            $newCheckRows.last().after(newRows);
            hasAddedNewRows = true;
        }

        // Clear form fields

        $table.find('.ofsi-new-check-outcome').val('');
        $table.find('.ofsi-new-check-notes').val('');

        // Set all action buttons to their default state
        var $actionButtons = $table.find('.action-button');

        $actionButtons.removeClass('on');
        $actionButtons.addClass('off');

        // Hide the new check rows, and the table if no other rows are present

        $newCheckRows.hide();

        if ($pastCheckRows.length === 0 && !hasAddedNewRows) {
            $table.hide();
        }
    },

    forceReloadPropertyFileTab: function () {
        var me = this;

        if (me.id === 0) {
            return;
        }

        var $layer = me.$root.find('.layer[data-id="propertyfile"]');
        $layer.attr('data-loaded', 'false');

        me._loadPropertyFileDashboard();
    },

    refreshFollowUps: function () {
        var me = this;

        setTimeout(function () {
            me.$root
                .find('.layer[data-id="overview"] .followups')
                .followUpDropdown({
                    linkedType: C.ModelType.Contact,
                    linkedId: me.id,
                    display: 'slide'
                });
        }, 100);
    },

    _loadPropertyFileDashboard: function ($layer) {
        var me = this;

        if (!$layer) {
            $layer = me.$root.find('.layer[data-id="propertyfile"]');
        }

        if ($layer.attr('data-loaded') === 'true') {
            return;
        }

        gmgps.cloud.angular.destroyChildScopes($layer);
        return gmgps.cloud.angular.compileElement($layer)
            .then(function (element) {
                element.attr('data-loaded', 'true');
            });
    },

    possiblyDeleteContact: function () {
        var me = this;

        if (!shell.pmInstalled) {
            me.deleteContact(0);
            return;
        }

        new gmgps.cloud.http("contactdetails-possiblyDeleteContact").ajax(
            {
                complex: true,
                background: true,
                dataType: 'json',
                type: 'get',
                url: 'Accounting/GetAccountingRetentionPeriod'
            },
            function (response) {
                var accountingRetentionPeriod = response.Data;

                me.accountingCheck(function (response) {
                    if (response.Data == false) {
                        showInfo(
                            'This Contact record is not available for deletion.<br/><br/> ' +
                            'Your Accounting retention period is set to {0} years.'.format(
                                accountingRetentionPeriod
                            )
                        );
                        return;
                    }

                    me.deleteContact(accountingRetentionPeriod);
                });
            }
        );
    },

    accountingCheck: function (callback) {
        var me = this;

        var url = 'Accounting/ContactHasNoAccounts';
        new gmgps.cloud.http("contactdetails-accountingCheck").ajax(
            {
                args: {
                    ContactId: me.id
                },
                complex: true,
                background: true,
                dataType: 'json',
                type: 'post',
                url: url
            },
            function (response) {
                callback(response);
            },
            function () {
                $.jGrowl('Contact accounting check failed.', {
                    header: 'Error',
                    theme: 'growl-contact'
                });
            }
        );
    },

    deleteContact: function (accountingRetentionPeriod) {
        var me = this;

        var name = me.$root.find('input#_description')[0].value;

        var pmMessage = '';

        if (shell.pmInstalled) {
            pmMessage =
                '<p>Your Accounting retention period is set to {0} years</p>'.format(
                    accountingRetentionPeriod
                );
        }

        var message =
            '<p>This Process cannot be reversed</p>{0}'.format(pmMessage) +
            '<p>Before deleting this contact please make sure you have no need to retain them. There may be a number of reasons you would want to retain the contact, you should check:</p>' +
            '<ul style="list-style:disc;padding:0px 10px 10px 20px;">' +
            '<li>The contact information does not need to be retained for any legal requirement</li>' +
            '<li>The documents sent to the contact do not need to be retained</li>' +
            '<li>The contact does not have a pending or accepted offer</li>' +
            '<li>The contact does not have a property currently being marketed for sale or rent</li>' +
            '<li>The contact is not a prospective tenant</li>' +
            '<li>If the contact is a supplier, are they currently linked to landlord or property as preferred supplier?</li>' +
            '<li>If the contact is a solicitor, are they currently linked to any other client records?</li>' +
            '<li>If the contact is a financial advisor, are they currently linked to any other client records?</li>' +
            '<li>Has the contact been introduced to a property that has not yet been sold?</li></ul>' +
            '<p>If you need to check before proceeding with the delete, please click cancel and review the contact.</p>';

        showDialog({
            type: 'info',
            title: 'Delete {0}?'.format(name),
            width: 600,
            msg: message,
            id: 'individualDeleteModal',
            create: function (event) {
                var button = $(event.target.nextSibling).find('button')[0];
                button.disabled = true;
                var counter = 10;

                var countDown = function () {
                    if (counter > 0) {
                        button.innerText = 'Proceed ({0})'.format(counter);
                    } else {
                        button.innerText = 'Proceed';
                        button.disabled = false;
                        return;
                    }
                    counter -= 1;

                    setTimeout(countDown, 1000);
                    return;
                };

                countDown();
            },
            buttons: {
                Continue: function () {
                    //Fetch from server
                    var url = 'Contact/AnonymiseContact';
                    new gmgps.cloud.http("contactdetails-Continue").ajax(
                        {
                            args: {
                                ContactId: me.id
                            },
                            complex: true,
                            background: true,
                            dataType: 'json',
                            type: 'post',
                            url: url
                        },
                        function () {
                            me.$root.find('.sticky-note').remove();
                            $.jGrowl('Contact successfully deleted.', {
                                header: 'Deleted',
                                theme: 'growl-contact'
                            });
                        },
                        function () {
                            $.jGrowl('Contact deletion failed.', {
                                header: 'Error',
                                theme: 'growl-contact'
                            });
                        }
                    );

                    $(this).dialog('close');
                },
                Cancel: function () {
                    $(this).dialog('close');
                }
            }
        });
    },

    lockdownContact: function () {
        var me = this;

        me.tabColumn.selectTab('overview');

        me.$root
            .find(
                '.tab-column li:not(.selected), .mbox.bg-contact, .contact-notes, .followups, .timeline-header, .recent-activity'
            )
            .remove();

        shell.$root
            .find('div[data-group="contact"] .detail .btns .btn')
            .addClass('disabled');

        me.$root.find('.mbox.contactinfo-link').removeClass('contactinfo-link');
    },

    isContactSittingTenantOnly: function () {
        var me = this;
        return (
            (
                me.$root.find('#IsSittingTenantOnly').val() || ''
            ).toLowerCase() === 'true'
        );
    },

    promptDefaultClientAccountChanged: function () {
        var me = this;

        var $deferred = $.Deferred();

        var originalDefaultAccountId = parseInt(
            me.$root.find('#DefaultClientAccountId').val()
        );
        var newDefaultAccountId = me.$root
            .find(
                '.layer[data-id="contactinfo"] .client-accounts .body tr.row[data-isdefault="True"]'
            )
            .data('groupbankaccountid');

        if (
            originalDefaultAccountId &&
            newDefaultAccountId &&
            originalDefaultAccountId !== newDefaultAccountId
        ) {
            showDialog({
                type: 'question',
                title: 'The Default Bank Account has changed',
                msg: 'Update ALL properties for this landlord ?',
                buttons: {
                    Yes: function () {
                        me.$root
                            .find('#UpdateDefaultClientAccounts')
                            .val('True');
                        me.$root
                            .find('#DefaultClientAccountId')
                            .val(newDefaultAccountId);
                        $(this).dialog('close');
                        $deferred.resolve(true);
                    },
                    No: function () {
                        $(this).dialog('close');
                        $deferred.resolve(false);
                    }
                }
            });
        } else {
            return $deferred.resolve(true);
        }
        return $deferred.promise();
    },

    promptClientAccountChanges: function () {
        var me = this;

        var $deferred = $.Deferred();

        var content = me.$root
            .find('#ClientAccountIdList')
            .val();

        if (!content) return $deferred.resolve(true);

        var originalList = content.split(',').map(function (v) {
            return parseInt(v);
        });
        var newList = me.$root
            .find('.layer[data-id="contactinfo"] .client-accounts .body tr.row')
            .map(function (i, v) {
                return parseInt($(v).data('groupbankaccountid'));
            })
            .get();

        var removedAccounts = originalList.filter(function (v) {
            return newList.indexOf(v) === -1;
        });

        if (removedAccounts.length > 0) {
            showDialog({
                type: 'question',
                title: 'One or more Client Accounts have been Deleted',
                msg: 'Update ALL properties for this landlord ?',
                buttons: {
                    Yes: function () {
                        me.$root
                            .find('#RemoveClientAccountsFromLandLordProperties')
                            .val('True');
                        me.$root
                            .find('#RemovedClientAccountList')
                            .val(removedAccounts.join(','));
                        $(this).dialog('close');
                        $deferred.resolve(true);
                    },
                    No: function () {
                        $(this).dialog('close');
                        $deferred.resolve(false);
                    }
                }
            });
        } else {
            return $deferred.resolve(true);
        }
        return $deferred.promise();
    },

    promptSuppliersAdded: function () {
        var me = this;

        var $deferred = $.Deferred();

        var $newSupplierRows = me.$root.find(
            '.layer[data-id="management"] .suppliers .contact-row[data-id="0"]'
        );

        if ($newSupplierRows.length === 0) return $deferred.resolve(true);

        showDialog({
            type: 'question',
            title: 'One or more new Suppliers Added',
            msg: 'Update ALL properties for this landlord ?',
            buttons: {
                Yes: function () {
                    me.$root
                        .find('.suppliers #AddNewSuppliersToLandlordProperties')
                        .val('True');
                    $(this).dialog('close');
                    $deferred.resolve(true);
                },
                No: function () {
                    me.$root
                        .find('.suppliers #AddNewSuppliersToLandlordProperties')
                        .val('False');
                    $(this).dialog('close');
                    $deferred.resolve(false);
                }
            }
        });

        return $deferred.promise();
    },

    insertSupplierHiddenFields: function ($form, s) {
        var fields = [];

        fields.push(
            '<input type="hidden" name="Contact.Supplier.Id" value="' +
            s.Id +
            '"/>'
        );
        fields.push(
            '<input type="hidden" name="Contact.Supplier.GroupId" value="' +
            s.GroupId +
            '"/>'
        );
        fields.push(
            '<input type="hidden" name="Contact.Supplier.RecordId" value="' +
            s.RecordId +
            '"/>'
        );
        fields.push(
            '<input type="hidden" name="Contact.Supplier.ContactId" value="' +
            s.ContactId +
            '"/>'
        );
        fields.push(
            '<input type="hidden" name="Contact.Supplier.VersionNumber" value="' +
            s.VersionNumber +
            '"/>'
        );

        $form.append(fields.join(''));
    },

    updateSupplierHiddenFields: function (s) {
        var me = this;

        me.$root
            .find('input[name="Contact.Supplier.GroupId"]')
            .val(s.GroupId);
        me.$root
            .find('input[name="Contact.Supplier.Id"]')
            .val(s.Id);
        me.$root
            .find('input[name="Contact.Supplier.RecordId"]')
            .val(s.RecordId);
        me.$root
            .find('input[name="Contact.Supplier.ContactId"]')
            .val(s.ContactId);
        me.$root
            .find('input[name="Contact.Supplier.VersionNumber"]')
            .val(s.VersionNumber);
    },

    setLastContactedDate: function (lastContactedDate) {
        var me = this;
        me.$root
            .find(
                'input[type="text"][name="Contact.LastContactedDate"]'
            )
            .val(lastContactedDate);
    },

    getSolicitorReferralNotes: function () {
        var me = this;
        return me.$root
            .find('#Contact_SolicitorNotes')
            .val();
    },

    updateReferralValues: function (c) {
        var me = this;

        //Update the originalValue attributes on each field so that they can be used for comparison on a subsequent change.
        me.$root
            .find('#Contact_Applicant_FSReferredToUserId')
            .attr('data-originalValue', c.Applicant.FSReferredToUserId);
        me.$root
            .find('#Contact_Applicant_FSReferredToContactId')
            .attr('data-originalValue', c.Applicant.FSReferredToContactId);
        me.$root
            .find('#Contact_Applicant_SolicitorReferredToUserId')
            .attr(
                'data-originalValue',
                c.Applicant.SolicitorReferredToUserId
            );
        me.$root
            .find('#Contact_Applicant_SolicitorReferredToContactId')
            .attr(
                'data-originalValue',
                c.Applicant.SolicitorReferredToContactId
            );
    },

    emailAddressIsUsedForPropertyFile: function () {
        var me = this;

        var result = false;

        var propertyFileEnabled = me.$root
            .find('#propertyFileEnabled')
            .val();
        var propertyFileEnabledForBranch = me.$root
            .find('#propertyFileEnabledForBranch')
            .val();

        if (
            propertyFileEnabled === 'True' &&
            propertyFileEnabledForBranch === 'True'
        ) {
            var activityStatus = me.$root
                .find('#propertyFileActivityStatus')
                .val()
                .toLowerCase();

            if (activityStatus === 'active' || activityStatus === 'pending') {
                var propertyFileEmailAddress = '';
                if (
                    me.$root.find('#propertyFileEmailAddress')
                        .val !== undefined
                ) {
                    propertyFileEmailAddress = me.$root
                        .find('#propertyFileEmailAddress')
                        .val()
                        .toLowerCase();
                }

                var markedPropertyFileEmailAddress = '';
                if (
                    me.$root
                        .find('.propertyfile-email-address')
                        .val() !== undefined
                ) {
                    markedPropertyFileEmailAddress = me.$root
                        .find('.propertyfile-email-address')
                        .val()
                        .toLowerCase();
                }

                if (
                    propertyFileEmailAddress !==
                    markedPropertyFileEmailAddress &&
                    propertyFileEmailAddress.length > 0
                ) {
                    result = true;
                }
            }
        }

        return result;
    },

    getNames: function () {
        var me = this;

        return {
            displayName: me.$root
                .find('#Contact_DisplayName')
                .val(),
            companyName: me.$root
                .find('#Contact_CompanyName')
                .val(),
            alternateDisplayName: me.$root
                .find('#Contact_DisplayNameEx')
                .val()
        };
    },

    possiblyInsertNewSupplier: function ($form) {
        var me = this;

        if (me.id === 0 ||
            (!shell.pmInstalled &&
                me.$root.find(
                    'input[name="Contact.Supplier.Id"]'
                ).length === 0)
        ) {
            me.insertNewSupplierHtml($form);
        }
    },

    insertNewSupplierHtml: function ($form) {
        // ensures a Contact.Supplier object is returned for the new supplier
        $form.append(
            '<input type="hidden" name="Contact.Supplier.Id" value="0"/>'
        );
    },

    upsertSupplierInfo: function (supplier) {
        var me = this;

        var hiddenFields = me.$root.find(
            'div.form div[data-uiformattype=' +
            C.UIFormatType.HiddenFields +
            ']'
        );

        if (
            hiddenFields.find('input[name^="Contact.Supplier"]').length ===
            0
        ) {
            me.insertSupplierHiddenFields(hiddenFields, supplier);
        } else {
            me.updateSupplierHiddenFields(supplier);
        }
    },

    getFinancialServicesReferral: function () {
        var me = this;

        var userId = parseInt(
            me.$root
                .find('#Contact_Applicant_FSReferredByUserId')
                .val()
        );

        var notes = me.$root
            .find('#Contact_Applicant_FSNonReferralNotes')
            .val();

        return { referredByUserId: userId, nonReferralNotes: notes };
    },

    initMoneyLaunderingTabs: function () {
        var me = this;
        var $container = me.$root.find('div.automated-id-checks');
        me.initTabs($container);
    },

    showTopBanner: function () {
        var me = this;

        var idCheckDiv = me.$root.find('div.id-check');
        var clientPaymentDiv = me.$root.find('div.client-payment');
        if (idCheckDiv.length === 0 && clientPaymentDiv.length === 0) return;

        me.$root.find('.layers').addClass('has-top-banner');
        me.$root.find('.tab-column').addClass('has-top-banner');
        me.$root.find('div.top-banner').removeClass('hidden');
    }
};
