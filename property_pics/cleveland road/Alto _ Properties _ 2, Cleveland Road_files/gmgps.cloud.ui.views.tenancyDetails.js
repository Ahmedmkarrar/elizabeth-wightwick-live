gmgps.cloud.ui.views.tenancyDetails = function (args) {
    var me = this;
    me.cfg = args;
    me.cfg.hasUnsavedChanges = me.cfg.hasUnsavedChanges || false;
    me.$root = args.$root;

    //Events
    me.onChanged = new gmgps.cloud.common.event();
    me.onTabColumnItemLabelChangeRequest = new gmgps.cloud.common.event();
    me.onSubTabClicked = new gmgps.cloud.common.event();
    me.onTimelineBoxToggleClicked = new gmgps.cloud.common.event();

    me.id = args.id;
    me.propertyId = parseInt(me.$root.find('#Tenancy_PropertyId').val());

    me.tabColumn = new gmgps.cloud.ui.controls.NavigableTabColumn({
        $root: me.$root.find('.tab-column'),
        entityType: 'tenancy',
        collection: 'tenancies',
        id: me.id
    });

    me.viewChanged = false;
    me.lastCopyTime = null; // Track when copy operations occur

    me.http =
        args.http || new gmgps.cloud.http("tenancydetails-tenancyDetails");

    me.isDirty =
        me.$root.find('#IsDirty').length > 0
            ? me.$root.find('#IsDirty').val() === 'True'
            : false;

    me.views = {};
    me.asyncContent = new alto.AsyncContent();
    me.layers = new alto.ui.LayersCollection(me.id, 'Tenancy/GetTenancyLayer', 'tenancy');

    me.userId = parseInt($('#_userid').val());

    me.init(false);

    return this;
};

gmgps.cloud.ui.views.tenancyDetails.prototype = {
    setupToolbar: function () {
        var me = this;
        var $tb = $('#toolbar .group[data-group="tenancy"] .detail');
        var $b;

        $('#toolbar .group[data-group="tenancy"] .list').hide();

        $tb.find('div.btn').hide();

        //Exit early (before showing any buttons) if this is a new tenancy.  There are no actions/docs available to them until saved.
        if (me.id === 0) {
            return;
        }

        //Actions
        $b = $tb.find('div[data-id="action"]');
        $b.show().find('.item').hide();

        // setup toolbar menu items

        $tb.find('li[data-id="pm-charge"]').show();
        $tb.find('li[data-id="pm-receipt"]').show();
        $tb.find('li[data-id="pm-refund"]').show();
        $tb.find('li[data-id="pm-transferDeposit"]').show();

        var tenancyStatus = parseInt(me.$root.find('#Tenancy_StatusId').val());

        if (tenancyStatus === C.TenancyStatus.Pending) {
            $tb.find('li[data-id="pm-registerTds"]').show();
        } else {
            $tb.find('li[data-id="pm-registerTds"]').hide();
        }

        //Documents
        $b = $tb.find('div[data-id="documents"]');
        $b.show().find('.item').show();

        //Sticky
        $tb.find(
            'div[data-id="add-note"], div[data-id="show-hide-notes"]'
        ).show();

        me.showPrintTimelineButton($tb);

        // strip out permission enabled menu items

        shell.uiPermissions.menuItemPermissions($tb);

        $tb.show();
    },

    initHandlers: function () {
        // only add event handler here, not any other setup
        var me = this;

        me.$root.off();

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

        //History
        me.$root.on('change', '.tag-history .text-toggle', function () {
            var on = $(this).hasClass('on');
            var type = $(this).data('type');
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

            //Show the detail layer if it's available.
            if (!$item.hasClass('disabled')) {
                me.showDetailLayer({
                    id: id,
                    subTag: arg,
                    subId: parseInt($item.attr('data-filter'))
                });

                if (arg) {
                    me.$root.find('a[href="' + arg + '"]').trigger('click');
                }

                //Remove arg and filter attributes from the tab-column tab.
                $item.removeAttr('data-arg').removeAttr('data-filter');
            }
        });

        // Letter selection/generation from timeline item (click on negotiator)
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

        //Timeline Link > Click (offers, viewings)
        me.$root.on('click', '.timeline-link', function () {
            var timeLineFilterType = parseInt($(this).attr('data-id'));
            me.tabColumn.selectTab('timeline', null, timeLineFilterType);
        });

        me.$root.on('click', '.tenancydetail-link', function () {
            me.tabColumn.selectTab('tenancyinfo', '#tenancy-tab', null);
        });

        me.$root.on('click', '.tenant-names-link', function () {
            $(this).qtip({
                content: me.$root.find('.tenant-popup').html(),
                position: {
                    viewport: $(window),
                    my: 'left middle',
                    at: 'right middle',
                    target: $('.tenant-container')
                },
                events: {
                    show: function (event, api) {
                        api.elements.content.on(
                            'mouseover',
                            '.phone-link, .email-link',
                            function () {
                                $(this).qtip({
                                    content: $(this)
                                        .children('.item-list')
                                        .html(),
                                    position: {
                                        my: 'top middle',
                                        at: 'bottom middle'
                                    },
                                    show: {
                                        event: 'mouseenter',
                                        ready: true,
                                        delay: 0,
                                        effect: function () {
                                            $(this).fadeIn(50);
                                        }
                                    },
                                    hide: {
                                        event: 'mouseleave unfocus click',
                                        leave: true
                                    },

                                    style: {
                                        tip: true,
                                        classes: 'qtip-dark'
                                    }
                                });
                                event.preventDefault();
                            }
                        );

                        api.elements.content.on(
                            'click',
                            '.email-link',
                            function () {
                                gmgps.cloud.helpers.general.createEmail({
                                    tenancyId: me.id,
                                    propertyId: me.propertyId,
                                    ContentType: C.DocumentContentType.Html,
                                    contactIds: [
                                        parseInt($(this).attr('data-contactid'))
                                    ]
                                });
                            }
                        );
                    }
                },
                show: {
                    event: 'click',
                    delay: 0,
                    ready: true,
                    effect: function () {
                        $(this).fadeIn(50);
                    }
                },
                hide: {
                    fixed: true,
                    event: 'mouseleave unfocus click',
                    leave: true,
                    target: $(window).find('.contact-popup-content .mbox')
                },
                style: {
                    tip: true,
                    classes: 'qtip-light'
                }
            });
        });
        me.$root.on('click', '.landlord-names', function () {
            $(this).qtip({
                content: me.$root.find('.landlord-popup').html(),
                position: {
                    viewport: $(window),
                    my: 'left middle',
                    at: 'right middle',
                    target: $('.landlord-container')
                },
                events: {
                    show: function (event, api) {
                        api.elements.content.on(
                            'mouseover',
                            '.phone-link, .email-link',
                            function () {

                                $(this).qtip({
                                    content: $(this)
                                        .children('.item-list')
                                        .html(),
                                    position: {
                                        my: 'top middle',
                                        at: 'bottom middle'
                                    },
                                    show: {
                                        event: 'mouseenter',
                                        ready: true,
                                        delay: 0,
                                        effect: function () {
                                            $(this).fadeIn(50);
                                        }
                                    },
                                    hide: {
                                        event: 'mouseleave unfocus click',
                                        leave: true
                                    },

                                    style: {
                                        tip: true,
                                        classes: 'qtip-dark'
                                    }
                                });
                                event.preventDefault();
                            }
                        );

                        api.elements.content.on(
                            'click',
                            '.email-link',
                            function () {
                                gmgps.cloud.helpers.general.createEmail({
                                    tenancyId: me.id,
                                    propertyId: me.propertyId,
                                    ContentType: C.DocumentContentType.Html,
                                    contactIds: [
                                        parseInt($(this).attr('data-contactid'))
                                    ]
                                });
                            }
                        );
                    }
                },
                show: {
                    event: 'click',
                    delay: 0,
                    ready: true,
                    effect: function () {
                        $(this).fadeIn(50);
                    }
                },
                hide: {
                    fixed: true,
                    event: 'mouseleave unfocus click',
                    leave: true,
                    target: $(window).find('.contact-popup-content .mbox')
                },
                style: {
                    tip: true,
                    classes: 'qtip-light'
                }
            });
        });
        me.$root.on('click', '.tenant-contact .icon-at', function () {
            var strTenantIds = $(this).attr('data-ids').split(',');
            var tenantIds = [];
            for (var i = 0; i < strTenantIds.length; i++) {
                tenantIds.push(parseInt(strTenantIds[i]));
            }
            gmgps.cloud.helpers.general.createEmail({
                tenancyId: me.id,
                propertyId: me.propertyId,
                ContentType: C.DocumentContentType.Html,
                contactIds: tenantIds
            });
        });
        me.$root.on('click', '.landlord-contact .icon-at', function () {
            var strLandLordIds = $(this).attr('data-ids').split(',');
            var landLordIds = [];
            for (var i = 0; i < strLandLordIds.length; i++) {
                landLordIds.push(parseInt(strLandLordIds[i]));
            }
            gmgps.cloud.helpers.general.createEmail({
                tenancyId: me.id,
                propertyId: me.propertyId,
                ContentType: C.DocumentContentType.Html,
                contactIds: landLordIds
            });
        });

        me.$root.on('click', '.hazzard-status-link', function () {
            gmgps.cloud.helpers.property.editProperty({
                id: parseInt($(this).data('id')),
                tabColumn: 'propertyinfo'
            });
        });

        me.$root.on('click', '.managed-status-link', function () {
            gmgps.cloud.helpers.property.editProperty({
                id: parseInt($(this).data('id')),
                tabColumn: 'propertyinfo',
                tabName: '#agency-tab'
            });
        });

        //Uploader - Show/Hide
        me.$root.on(
            'click',
            '.layer[data-id="documents"] .upload-open-button',
            function () {
                if ($(this).hasClass('disabled')) return;

                var type = $(this).data('type');

                var $uploadContainer = me.$root.find(
                    '.uploader[data-type="' + type + '"]'
                );

                if ($(this).hasClass('on')) {
                    //Close
                    $(this).text($(this).data('label')).removeClass('on');
                    $uploadContainer.slideUp();
                } else {
                    $uploadContainer.slideDown(function () {
                        me.initUploader(type);
                    });

                    $(this).data('label', $(this).text());
                    $(this).text('Cancel').addClass('on');
                }
            }
        );

        me.$root.on(
            'mouseenter mouseleave',
            '.docs .tenancydoc .front',
            function (e) {
                var tenancyDoc = $(this).closest('.tenancydoc');

                if (e && e.type === 'mouseenter') {
                    $(tenancyDoc).find('.options').fadeIn({ duration: 'fast' });
                } else {
                    $(tenancyDoc)
                        .find('.options')
                        .fadeOut({ duration: 'slow' });
                }
            }
        );

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

        me.$root.on(
            'change',
            '#Tenancy_NoticeAddress_NoticeAddressTypeId',
            function () {
                if (
                    parseInt($(this).val()) ===
                    C.NoticeAddressType.UseBranchAddress
                ) {
                    me.$root.find('#landlordAddressTypeRow').show();
                } else {
                    me.$root.find('#landlordAddressTypeRow').hide();
                }
            }
        );

        me.$root.on('click', '.tenancy-managementdate', function () {
            var recordId = parseInt($(this).data('id'));
            var linkedId = parseInt($(this).data('tenancyid'));
            gmgps.cloud.helpers.diary.getManagementDate(
                linkedId,
                C.ModelType.Tenancy,
                recordId,
                []
            );
        });

        gmgps.cloud.helpers.general.addWarningIfValueChanged(
            $('#Tenancy_PaymentReference.pinned'),
            'Clear Pinned Reference?',
            'Editing or deleting a pinned payment reference will stop imported receipts auto-matching. Do you wish to continue?'
        );

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


    },
    getActiveLayer: function () {
        var me = this;

        return me.$root
            .find('.tab-column ul li.selected')
            .attr('data-id');
    },
    getSelectedTab: function () {
        var me = this;
        return me.$root
            .find('.layers .layer[data-id="' + me.getActiveLayer() + '"]')
            .find('ul.ui-tabs-nav li[tabindex="0"] a')
            .attr('href');
    },
    getUIState: function () {
        var me = this;

        var activeLayer = me.$root
            .find('.tab-column ul li.selected')
            .attr('data-id');

        // layer may have tabs too
        var selectedTab = me.getSelectedTab();

        return {
            activeLayer: activeLayer,
            selectedTab: selectedTab
        };
    },

    setUIState: function (state) {
        var me = this;

        me.tabColumn.selectTab(
            state.activeLayer || null,
            state.selectedTab || null, null
        );
    },

    init: function (reinit) {
        var me = this;
        me.reinit = reinit;

        me.setupToolbar();
        me.initLayers(reinit);
        me.initHandlers();
        me.configureStickyNotes();

        //Date pickers
        me.initDatePickers(me.$root);

        //UI Sizing
        $(window)
            .off('resize.tenancyDetails')
            .on('resize.tenancyDetails', function (e) {
                if (e.target === window) {
                    me.sizeRecentActivity();
                }
            });

        me.$root.on(
            'change',
            '#Tenancy_NoticeAddresses_NoticeAddressTypeId',
            function () {
                if ($(this).val() == C.NoticeAddressType.UseBranchAddress) {
                    me.$root
                        .find('#Tenancy_NoticeAddresses_LandlordAddressTypeId')
                        .closest('.row')
                        .show();
                } else {
                    me.$root
                        .find('#Tenancy_NoticeAddresses_LandlordAddressTypeId')
                        .closest('.row')
                        .hide();
                }
            }
        );

        gmgps.cloud.helpers.general.growlManagementDateAlerts('tenancy', me.id);

        if (me.cfg.onComplete) {
            me.cfg.onComplete();
        }

        me.PinnedReferenceChangeWarned = false;

        me.asyncContent.render(me.$root, me);
    },

    renderReferencingTab: function () {
        var me = this;

        var enabled = me.$root.find('#IsReferencingEnabled').val();
        if (enabled == "True") {
            me.$root.find('.referencing-label').show().removeClass('hidden');
        }
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

    changeTabs: function (event, ui) {
        var me = this;
        if (ui.newTab[0].textContent === 'Deposit') {
            me.initDatePickers(ui.newPanel);
        }
    },

    sizeRecentActivity: function () {
        var me = this;
        var rh = me.$root.height();

        //Overview > Timeline
        var $ra = me.$root.find('.recent-activity');

        if ($ra.length !== 0) {
            $ra.css('height', rh - $ra.position().top - 30);
        }
    },

    validate: function () {
        var me = this;
        var valid = true;

        var test = $.trim(me.$root.find('#Tenancy_PaymentReference').val());

        if (test.length > 0 && test.length < 6) {
            me.$root
                .find('#Tenancy_PaymentReference')
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


        switch (name) {
            case 'overview':
                $layer.on(
                    'click',
                    '.summary .email-link[data-action="create"]',
                    function (e) {
                        var category = $(e.target).attr('ga-category');
                        gmgps.cloud.helpers.general.createEmail({
                            tenancyId: me.id,
                            propertyId: me.propertyId,
                            ContentType: C.DocumentContentType.Html,
                            contactIds: [
                                parseInt($(this).attr('data-contactid'))
                            ],
                            category: category
                        });
                    }
                );

                $layer.on('mouseover', '.phone-link, .email-link', function () {
                    $(this).qtip({
                        content: $(this).children('.item-list').html(),
                        position: {
                            my: 'top middle',
                            at: 'bottom middle'
                        },
                        show: {
                            event: 'mouseenter',
                            ready: true,
                            delay: 0,
                            effect: function () {
                                $(this).fadeIn(50);
                            }
                        },
                        hide: 'mouseleave',
                        style: {
                            tip: true,
                            classes: 'qtip-dark'
                        }
                    });
                });
                me.asyncContent.render($layer, me);
                me.callOnComplete(true);
                break;

            case 'timeline':
                //Exit early if this is a new, unsaved contact.
                if (me.id === 0) {
                    return false;
                }

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
                break;

            case 'documents':
                $layer.on('click', '.document-view-button', function () {
                    var type = this.dataset.view;
                    $layer
                        .find('.document-grid')
                        .toggleClass('hidden', type != 'grid');
                    $layer
                        .find('.document-list')
                        .toggleClass('hidden', type != 'list');
                    $layer
                        .find('.document-view-button[data-view="grid"]')
                        .toggleClass('active', type === 'grid');
                    $layer
                        .find('.document-view-button[data-view="list"]')
                        .toggleClass('active', type === 'list');
                });

                //delete single document
                $layer.on('click', '.tenancydoc .delete-button', function (e) {
                    var self = this;

                    showDialog({
                        type: 'question',
                        title: 'Delete Document?',
                        msg: 'Are you sure you would you like to delete this document?',
                        buttons: {
                            Yes: function () {
                                me.setDirty(true, e);
                                $(this).dialog('close');
                                deleteDocElement(self);
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
                    '.tenancydocs .delete-selected-button',
                    function (e) {
                        var files = $layer.find(
                            '.tenancydocs .documents-grid .tenancydoc .selector:checked'
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
                                    me.setDirty(true, e);
                                    for (var i = 0; i < files.length; i++) {
                                        var file = files[i];
                                        deleteDocElement(file);
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
                $layer.on('click', '.tenancydoc .email-button', function () {
                    var dId = $(this).closest('.tenancydoc').attr('data-id');
                    if (dId < 0) {
                        showInfo(
                            'The selected document has not yet been saved, please save the tenancy record before emailing.'
                        );
                        return false;
                    }

                    var fileArrays = new Array();
                    fileArrays.push({
                        id: dId,
                        name: $(this)
                            .closest('.tenancydoc')
                            .attr('data-caption'),
                        icon: $(this).closest('.tenancydoc').attr('data-icon'),
                        url: $(this).closest('.tenancydoc').attr('data-url'),
                        type: 'File',
                        modeltypeid: C.ModelType.MediaFile,
                        filetypeid: $(this)
                            .closest('.tenancydoc')
                            .attr('data-filetypeid'),
                        category: $(this)
                            .closest('.tenancydoc')
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
                    '.tenancydocs .email-selected-button',
                    function () {
                        var files = $layer.find(
                            '.tenancydocs .documents-grid .tenancydoc .selector:checked'
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
                                .closest('.tenancydoc')
                                .attr('data-id');

                            if (dId < 0) {
                                someNotSaved = true;
                            } else {
                                fileArrays.push({
                                    id: dId,
                                    name: $(file)
                                        .closest('.tenancydoc')
                                        .attr('data-caption'),
                                    icon: $(file)
                                        .closest('.tenancydoc')
                                        .attr('data-icon'),
                                    url: $(file)
                                        .closest('.tenancydoc')
                                        .attr('data-url'),
                                    type: 'File',
                                    modeltypeid: C.ModelType.MediaFile,
                                    filetypeid: $(file)
                                        .closest('.tenancydoc')
                                        .attr('data-filetypeid'),
                                    category: $(file)
                                        .closest('.tenancydoc')
                                        .attr('data-category')
                                });
                            }
                        }

                        if (someNotSaved) {
                            showInfo(
                                'One or more documents have not yet been saved, please save the tenancy record before emailing.'
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

                $layer.on(
                    'click',
                    '.tenancydoc .btn-sharing-tenants',
                    function (e) {
                        if (
                            $(this)
                                .closest('.sharable-documents.tenancy')
                                .attr(
                                    'data-propertyfile-module-tenantdocumentsharing'
                                ) === 'false'
                        ) {
                            showInfo(
                                'Please switch on Documents in Tenancy Portal Advanced Configuration to update the sharing status of the Document.<br />Go to Tools, PropertyFile.'
                            );
                            return false;
                        }

                        var $document = $(this).closest('.tenancydoc');
                        var documentId = $document.data('id');

                        var currentShareState = $document.attr(
                            'data-shared-with-tenant'
                        );
                        var newShareState =
                            currentShareState === 'true' ? 'false' : 'true';

                        var docs = $layer.find(
                            '.tenancydoc[data-id=' + documentId + ']'
                        );
                        docs.attr('data-shared-with-tenant', newShareState);
                        docs.find(
                            'input[name="Tenancy.MediaItems[].SharedWithTenantForViewModel"]'
                        ).val(newShareState);

                        me.setDirty(true, e);

                        // TODO: Do we want a GA event to record individually shared documents?
                        //googleAnalytics.sendEvent('tenancies_documents', 'documents_shared', files.length);
                    }
                );

                $layer.on(
                    'click',
                    '.tenancydoc .btn-sharing-landlord',
                    function (e) {
                        if (
                            $(this)
                                .closest('.sharable-documents.tenancy')
                                .attr(
                                    'data-propertyfile-module-landlorddocumentsharing'
                                ) === 'false'
                        ) {
                            showInfo(
                                'Please switch on Documents in Landlord Portal Advanced Configuration to update the sharing status of the Document.<br />Go to Tools, PropertyFile.'
                            );
                            return false;
                        }

                        var $document = $(this).closest('.tenancydoc');
                        var documentId = $document.data('id');

                        var currentShareState = $document.attr(
                            'data-shared-with-landlord'
                        );
                        var newShareState =
                            currentShareState === 'true' ? 'false' : 'true';

                        var docs = $layer.find(
                            '.tenancydoc[data-id=' + documentId + ']'
                        );
                        docs.attr('data-shared-with-landlord', newShareState);
                        docs.find(
                            'input[name="Tenancy.MediaItems[].SharedWithLandlordForViewModel"]'
                        ).val(newShareState);

                        me.setDirty(true, e);
                    }
                );

                //select all files
                $layer.on('click', '.tenancydocs .all-selector', function () {
                    if (this.checked) {
                        $layer
                            .find('.tenancydoc .selector')
                            .prop('checked', true)
                            .closest('.tickbox')
                            .addClass('ticked');
                    } else {
                        $layer
                            .find('.tenancydoc .selector')
                            .prop('checked', false)
                            .closest('.tickbox')
                            .removeClass('ticked');
                    }
                    $layer
                        .find('.tenancydocs .all-selector')
                        .prop('checked', this.checked)
                        .closest('.tickbox')
                        .toggleClass('ticked', this.checked);
                });

                //select one file and check for all selected
                $layer.on('click', '.tenancydoc .selector', function () {
                    var id = $(this).closest('.tenancydoc[data-id]').data('id');
                    var checkbox = $layer
                        .find('.tenancydoc[data-id="' + id + '"] .selector')
                        .prop('checked', this.checked);
                    checkbox
                        .closest('.tickbox')
                        .toggleClass('ticked', this.checked);
                    if (!this.checked) {
                        $layer
                            .find('.tenancydocs .all-selector')
                            .prop('checked', false)
                            .closest('.tickbox')
                            .removeClass('ticked');
                    } else {
                        var selectors = $layer.find('.tenancydoc .selector');
                        var selectorsChecked = $layer.find(
                            '.tenancydoc .selector:checked'
                        );
                        if (selectors.length === selectorsChecked.length) {
                            $layer
                                .find('.tenancydocs .all-selector')
                                .prop('checked', true)
                                .closest('.tickbox')
                                .addClass('ticked');
                        }
                    }
                });

                $layer.on('change', '.tenancydoc input.caption', function () {
                    var id = $(this).closest('.tenancydoc[data-id]').data('id');
                    var caption = this.value;

                    var $tr = $layer.find(
                        '.document-list tr.tenancydoc[data-id="' + id + '"]'
                    );
                    $tr.data('caption', caption)
                        .find('td.caption a')
                        .text(caption);
                }),
                    $layer.on(
                        'click',
                        '.document-list th[data-sort]',
                        function () {
                            function dateComparer(a, b) {
                                return (
                                    new Date(parseInt(b) * 1000) -
                                    new Date(parseInt(a) * 1000)
                                );
                            }

                            function stringComparer(a, b) {
                                return b.localeCompare(a);
                            }

                            var isDesc = this.dataset.sort === 'desc',
                                sourceDataAttr = this.dataset.sortdata,
                                comparer =
                                    this.dataset.sortas === 'datetime'
                                        ? dateComparer
                                        : stringComparer,
                                $tableBody = $(this)
                                    .parents('table')
                                    .find('tbody');

                            $tableBody
                                .find('tr')
                                .sort(function (a, b) {
                                    return (
                                        comparer(
                                            a.dataset[sourceDataAttr],
                                            b.dataset[sourceDataAttr]
                                        ) * (isDesc ? -1 : 1)
                                    );
                                })
                                .appendTo($tableBody);

                            this.dataset.sort = isDesc ? 'asc' : 'desc';
                            $(this)
                                .siblings('.sortable')
                                .not(this)
                                .removeClass('active');
                            $(this).addClass('active');
                        }
                    );

                break;

            case 'managementdates':
                new gmgps.cloud.ui.views.managementDatesHandler({
                    $root: $layer.find('.managementevents'),
                    linkedId: me.id,
                    linkedTypeId: C.ModelType.Tenancy,
                    linkedTypeIdList: [C.ModelType.Tenancy],
                    onCompleteHandler: findManagementDateToUpdate
                });

                break;

            case 'tenancyinfo':
                me.views[name] = {
                    termsHandler: new gmgps.cloud.ui.views.termsHandler({
                        $root: $layer.find('.tenancy-details')
                    }),
                    readingsHandler: new gmgps.cloud.ui.views.readingsHandler({
                        $root: $layer.find('.tenancy-utilities'),
                        tenancyId: me.id,
                        dirtyHandler: function (isDirty, target) {
                            me.setDirty(isDirty, target);
                        }
                    }),
                    $root: $layer
                };

                $layer.on('change', '#TdsEndOfTenancy_Status', function () {
                    $('.tds-show-nodispute').hide();
                    $('.upload-end-of-tenancy-to-tds').hide();
                    var $selectedOption = $(
                        '#TdsEndOfTenancy_Status option:selected'
                    );
                    if ($selectedOption.hasClass('tds-nodispute')) {
                        $('.tds-show-nodispute').show();
                        if (
                            $layer
                                .find('#LastTermTenancyStatusIsVacated')
                                .val() === 'True'
                        ) {
                            $('.upload-end-of-tenancy-to-tds').show();
                        }
                    } else if ($selectedOption.hasClass('tds-dispute')) {
                        if (
                            $layer
                                .find('#LastTermTenancyStatusIsVacated')
                                .val() === 'True'
                        ) {
                            $('.upload-end-of-tenancy-to-tds').show();
                        }
                    }
                });

                $layer.on(
                    'click',
                    '.btn-upload-end-of-tenancy-to-tds',
                    function () {
                        var end_type = $layer
                            .find('#TdsEndOfTenancy_Status')
                            .val();
                        var paidLandlordDate = $layer
                            .find('#TdsEndOfTenancy_PaidLandlordDate')
                            .val();
                        var paidAgencyDate = $layer
                            .find('#TdsEndOfTenancy_PaidAgencyDate')
                            .val();
                        var paidTenancyDate = $layer
                            .find('#TdsEndOfTenancy_PaidTenancyDate')
                            .val();

                        if ($('#IsDirty').val() === 'True') {
                            showInfo(
                                'Please Save before uploading information to TDS.'
                            );
                            return false;
                        }

                        if (end_type === 'no_dispute') {
                            if (
                                paidLandlordDate == '' ||
                                paidLandlordDate == 'No date set' ||
                                paidAgencyDate == '' ||
                                paidAgencyDate == 'No date set' ||
                                paidTenancyDate == '' ||
                                paidTenancyDate == 'No date set'
                            ) {
                                showInfo(
                                    'All re-paid date fields must be entered to submit a "No Dispute" status to TDS.'
                                );
                                return false;
                            }
                        }

                        new gmgps.cloud.helpers.tds.StateHandler({
                            id: me.id,
                            state: C.TDSTenancyStateType
                                .EndOfTenancyRequestQueued
                        })
                            .update()
                            .then(function () { });

                        $('.upload-end-of-tenancy-to-tds').hide();
                        me.refreshDeposit();
                        if (end_type === 'no_dispute') {
                            $('.tds-show-nodispute').show();
                        }

                        return true;
                    }
                );

                var selectedEndOfTenancyType = $layer
                    .find('select.tds-endoftenancytype')
                    .val();

                if (selectedEndOfTenancyType === 'no_dispute') {
                    $layer.find('.tds-show-nodispute').show();
                }

                $layer.on('click', '.deposit-managementdate', function () {
                    var $this = $(this);
                    var recordId = parseInt($this.data('id'));
                    var linkedId = parseInt($this.data('linkedid'));
                    gmgps.cloud.helpers.diary.getManagementDate(
                        linkedId,
                        C.ModelType.Tenancy,
                        recordId,
                        [],
                        updateManagementDate($this)
                    );
                });

                $layer.on('click', '.tds-comms', function () {
                    new gmgps.cloud.helpers.tds.CommunicationLog({
                        tenancyId: me.id
                    }).show();
                });

                $layer.on('click', '.tds-info', function () {
                    new gmgps.cloud.helpers.tds.StateHandler({
                        id: me.id,
                        state: C.TDSTenancyStateType[
                            $layer.find('#TdsCommunicationState_State').val()
                        ]
                    })
                        .update()
                        .then(function (result) {
                            me.refreshDeposit();
                            return result;
                        });
                });

                $layer.on('click', '.tds-resend', function () {
                    new gmgps.cloud.helpers.tds.StateHandler({
                        id: me.id,
                        state: C.TDSTenancyStateType.RequireData
                    })
                        .update()
                        .then(function () {
                            me.refreshDeposit();
                            return true;
                        });
                });

                me.initCurrencyFormatting($layer);

                $layer.find('#Tenancy_NoticeAddresses_LandlordAddressTypeId')
                    .closest('.row')
                    .hide();

                if ($layer.find('#Tenancy_NoticeAddresses_NoticeAddressTypeId').val() == C.NoticeAddressType.UseBranchAddress) {
                    $layer.find('#Tenancy_NoticeAddresses_LandlordAddressTypeId')
                        .closest('.row')
                        .show();
                }
                me.asyncContent.render($layer, me);
                break;
        }

        function findManagementDateToUpdate(result) {
            var record = result['FollowUp.RecordId'];
            var target = me.views['tenancyinfo'].$root.find(
                '.deposit-managementdate[data-id={0}]'.format(record)
            );
            if (record && target.length > 0) {
                updateManagementDate(target)(result);
            }
        }
        function updateManagementDate(target) {
            return function (formData) {
                target.find('.date-label').html(formData['FollowUp.DueDate']);
            };
        }
        function deleteDocElement(target) {
            var $li = $(target).closest('li.tenancydoc');
            var docId = $li.attr('data-id');
            var $tr = $layer.find(
                '.document-list tr.tenancydoc[data-id="' + docId + '"]'
            );
            $li.remove();
            $tr.remove();
        }

        if (me.layers.isConfigured(name) === false) {
            me.layers.setConfigured(name);
        }

        console.debug('Layer ' + name + ' initialised');
    },
    
    initLayers: function (reinit) {
        var me = this;

        //Initialise each layer that has been loaded in the dom
        me.layers.init(me.$root, function ($layer) { me.initLayer($layer); });

        // NOTE property implementation -
        //if (!reinit && me.cfg.tabLayerToLoad) {
        //    me.tabColumn.selectTab(me.cfg.tabLayerToLoad, me.cfg.tabToSelect, me.cfg.filter);
        //}
        // NOTE contact implementation -
        if (!me.cfg.loadedFromCache && !reinit) {
            me.tabColumn.selectTab(me.cfg.tabLayerToLoad);
        }
    },
    refreshLayer: function (layerName) {
        var me = this;
        return me.layers.refresh(layerName, function ($layer) { me.initLayer($layer); });
    },
    refreshLayers: function () {
        var me = this;

        var uiState = me.getUIState();
        me.refreshLayer('tenancyinfo');
        me.setUIState(uiState);
    },

    showDetailLayer: function (args) {
        var me = this;

        me.selectedLayer = args.id;

        var context = $(me);
        var onLoaded = function (id) {
            me.$root.find('.freeTypeAddress input[type=text]').each(function () {
                var currentName = context.attr('name');
                if (currentName == null) return true;
                var newName = currentName.replace(
                    'Tenancy.Address',
                    'Tenancy.NoticeAddresses.NoticeAddress'
                );
                context.attr('name', newName);
            });

            me.$root.find('.qtip-enabled').each(function () {
                context.qtip({
                    content: context.data('tip'),
                    position: {
                        my: 'bottom middle',
                        at: 'top middle'
                    },
                    show: {
                        event: 'mouseenter',
                        delay: 0,
                        solo: true
                    },
                    hide: 'mouseleave',
                    style: {
                        tip: true,
                        classes: 'qtip-dark'
                    }
                });
            });
            //Select boxes
            me.$root.find('select').not('.opt-standard').customSelect();


            switch (id) {
                case 'overview':
                    me.sizeRecentActivity();
                    break;
                case 'tenancyinfo':
                    me.$root.find('.tabs.tenancy-info-tabs').tabs({
                        create: function (event, ui) {
                            shell.uiPermissions.tabContentPermissions(ui.tab, ui.panel);
                        },
                        beforeActivate: function (event, ui) {
                            shell.uiPermissions.tabContentPermissions(
                                ui.newTab,
                                ui.newPanel
                            );
                        },
                        activate: function (event, ui) {
                            me.changeTabs(event, ui);
                            me.onSubTabClicked.raise(ui.newTab);

                            var label = ui.newTab.attr('galabel');
                            if (label) {
                                googleAnalytics.sendEvent('tenancies', 'tab_click', label);
                            }
                        }
                    });

                    shell.uiPermissions.tabPermissions(
                        me.$root.find('.tabs.tenancy-info-tabs')
                    );

                    break;
                case 'timeline':
                    var $this = me.$root.find('.tag-history');

                    if (args.subId) {
                        //Turn off all toggles.
                        $this.find('.box-toggle.on').removeClass('on bg-tenancy');

                        //Turn on the desired toggle.
                        $this
                            .find('.box-toggle[data-typeId="' + args.subId + '"]')
                            .trigger('click');
                    }

                    break;
                case 'transactions':
                    me.refreshTransactions();
                    break;
                default:
                    break;
            }

            //Look to see if a default tab was requested.
            if (me.tabName) {
                me.tabColumn.selectTab(
                    me.$root.find('a[href="#' + me.tabName + '-tab"]')
                );
            }
            me.callOnComplete(true);
        };

        me.layers.show(args.id, onLoaded, function ($layer) { me.initLayer($layer); });
    },
    getTransactions: function () {
        var me = this;
        return new gmgps.cloud.ui.views.transactionsHandler(
            {
                $root: me.$root.find('.layer[data-id="transactions"]').find('.transactions'),
                linkedId: this.id,
                linkedTypeId: C.ModelType.Tenancy
            })
    },

    getEventSearchFilters: function () {
        var me = this;

        var filterTypes = [];

        var $layer = me.$root.find('.layer[data-id="timeline"]');

        var totalFilterCount = $layer.find('.box-toggle:not(.master)').length;

        //Determine which filter switches are activated (on).
        $layer.find('.box-toggle.on:not(.master)').each(function (i, v) {
            var typeId = parseInt($(v).attr('data-typeId'));

            filterTypes.push(typeId);
        });

        me.eventTypes = filterTypes;
        me.allFiltersSelected = filterTypes.length === totalFilterCount;

        return {
            eventTypes: filterTypes
        };
    },

    initDatePickers: function ($root) {
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
    },

    initCurrencyFormatting: function ($root) {
        var me = this;
        $root.find('.opt-inputmask-numeric').inputmask('currency', {
            radixPoint: '.',
            groupSeparator: ',',
            digits: 2,
            autoGroup: true,
            prefix: me.$root.find('#CurrencySymbol').val(),
            rightAlign: false
        });
    },

    setStepThroughTimeLineFilterState: function () {
        var me = this;

        if (me.cfg.initialTimelineFilters) {
            var $this = me.$root.find('.tag-history');

            $this
                .find('.box-toggles[data-type="tenancy"] .box-toggle')
                .removeClass('on bg-tenancy mixed');

            var $mainToggles = $this.find('.box-toggles[data-type="tenancy"]');

            var $masterToggle = $mainToggles.find('.box-toggle.master');

            $.each(me.cfg.initialTimelineFilters.eventTypes, function (i, v) {
                $mainToggles
                    .find('.box-toggle[data-typeid="{0}"]'.format(v))
                    .addClass('on bg-tenancy');
            });

            var toggleCount = $mainToggles.find('.box-toggle').length - 1; // ignoring master toggle

            var toggleOnCount = me.cfg.initialTimelineFilters.eventTypes.length;

            if (toggleCount === toggleOnCount) {
                $masterToggle.addClass('on bg-tenancy');
            } else if (toggleOnCount < toggleCount && toggleOnCount > 0) {
                $masterToggle.addClass('mixed');
            }
        }
    },

    refreshTimeline: function (page) {
        var me = this;

        var $c = me.$root.find(
            '.layer[data-id="timeline"] .timeline-list-container'
        );

        var tenancyId = parseInt(me.$root.find('#Tenancy_Id').val());

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

        me.outstandingTimelineRequest = me.http
            .ajax(
                {
                    args: {
                        search: {
                            TenancyId: tenancyId,
                            TimelineSearchType: C.EventSearchType.TimelineFull,
                            ContextModelType: C.ModelType.Tenancy,
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
                    url: '/Timelines/Tenancy',
                    listType: C.ListType.Standard
                },
                function (response) {
                    $c.html(response.Data);
                }
            )
            .done(function () {
                delete me.outstandingTimelineRequest;
            });
    },

    refreshLoadedTransactions: function () {
        var me = this;

        if (me.views.transactions) {
            return me.refreshTransactions();
        }
    },

    refreshTransactions: function () {
        var me = this;
        var pageIndex = 1;
        if (me.views.transactions) {
            me.views.transactions.updatePageIndex(pageIndex);
        } else {
            me.views.transactions = me.getTransactions();
        }
        return me.views.transactions.renderTransactions(pageIndex);
    },

    refreshDeposit: function () {
        var me = this;

        if (me.views.tenancyinfo) {
            var uiState = me.getUIState();
            me.refreshLayer('tenancyinfo').then(
                function () { me.setUIState(uiState); }
            );
        }
    },

    initUploader: function (type) {
        var me = this;
        var maxFileSize, sizing, filters;
        var branchId, entityId;

        branchId = me.$root.find('#Tenancy_BranchId').val();
        entityId = me.$root.find('#Tenancy_Id').val();

        switch (type) {
            case 'doc':
                maxFileSize = '50mb';
                sizing = { width: 1920, height: 1080, quality: 95 };
                filters = [
                    {
                        title: 'Document files',
                        extensions:
                            'doc,pdf,docx,rtf,txt,jpg,png,gif,xls,xlsx,xlw,jpeg,msg'
                    }
                ];
                break;
        }

        var configureUploader = function (modelTypeId, mediaTypeId, thisType) {
            var $uploader = me.$root.find(
                '.uploader[data-type="' + thisType + '"]'
            );

            var thisUploader = $uploader.pluploadQueue();

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

                var $newDocument = $(info.response);
                me.$root.find('.' + thisType + 's').append($newDocument);
                me.$root
                    .find('.tenancydocs .document-list table tbody')
                    .append(
                        me.getTenancyDocumentRow(
                            me.mapDocumentGridItemToTenancyDoc($newDocument[0])
                        )
                    );

                me.setDirty(true, { currentTarget: $uploader });
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
            runtimes: 'html5,flash,silverlight,browserplus,gears,html4',
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
                    C.ModelType.Tenancy,
                    C.MediaType.Document,
                    type
                );
                break;
        }
    },

    mapDocumentGridItemToTenancyDoc: function (item) {
        function TenancyDocument() { }
        TenancyDocument.prototype = {
            id: 0,
            caption: '',
            dateCreated: new Date(),
            sharedWithTenant: false,
            sharedWithLandlord: false,
            url: '',
            sharedWithLandlordButtonTitle: '',
            sharedWithTenantButtonTitle: ''
        };

        if (!(item instanceof Element)) {
            return;
        }

        if (!item.classList.contains('tenancydoc')) {
            return;
        }

        var tenancyDoc = new TenancyDocument();
        for (var key in tenancyDoc) {
            if (Object.prototype.hasOwnProperty.call(item.dataset, key)) {
                tenancyDoc[key] = item.dataset[key];
            }
        }

        tenancyDoc.shareWithTenantButtonTitle = item.querySelector(
            '.btn-sharing-tenants'
        ).title;
        tenancyDoc.shareWithLandlordButtonTitle = item.querySelector(
            '.btn-sharing-landlord'
        ).title;

        return tenancyDoc;
    },

    getTenancyDocumentRow: function (tenancyDoc) {
        var template = document.querySelector('#document-table-row');
        var clone = template.content.cloneNode(true);
        var tr = clone.children[0];

        for (var key in tr.dataset) {
            if (Object.prototype.hasOwnProperty.call(tenancyDoc, key)) {
                tr.dataset[key] = tenancyDoc[key];
            }
        }

        var anchor = tr.querySelector('td.caption a');
        if (anchor) {
            anchor.href = tenancyDoc.url;
            anchor.innerText = tenancyDoc.caption;
        }

        tr.querySelector('td.date-created').innerHTML = new Date(
            parseInt(tenancyDoc.dateCreated) * 1000
        ).toLocaleDateString('en-GB');
        tr.querySelector('.btn-sharing-tenants').title =
            tenancyDoc.shareWithTenantButtonTitle;
        tr.querySelector('.btn-sharing-landlord').title =
            tenancyDoc.shareWithLandlordButtonTitle;

        return tr;
    },

    setDirty: function (isDirty, target) {
        //Set the Dirty flag on this object and in the dom.
        var me = this;

        if (target) {
            var found = false;
            var $tabContainer = $(target.currentTarget).closest(
                '.content.ui-tabs-panel[data-tabupdateenabled="true"]'
            );

            if ($tabContainer.length === 1) {
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

                if ($layerContainer.length === 1) {
                    if (isDirty) {
                        $layerContainer.attr('data-islayerdirty', true);
                    } else {
                        $layerContainer.attr('data-islayerdirty', false);
                    }

                    found = true;
                }
            }
        }

        //Set Dirty
        if (isDirty && !me.isDirty) {
            me.$root.find('#IsDirty').val('True');
            me.isDirty = true;
            me.onChanged.raise(me.id);
        }

        //Set Clean
        if (!isDirty && me.isDirty) {
            me.$root.find('#IsDirty').val('False');
            me.isDirty = false;
        }
    },

    showPrintTimelineButton: function (toolbar) {
        var printTimelineButton = toolbar.find('div[data-id="print-options"]');

        if (printTimelineButton.length > 0) {
            printTimelineButton.show();
        }
    },

    addNote: function ($sticky) {
        var me = this;
        shell.addStickyNote({
            $sticky: $sticky,
            linkedId: me.id,
            modelType: C.ModelType.Tenancy,
            branchId: me.$root.find('#Tenancy_BranchId').val(),
            $container: me.$root,
            containment: me.$root.find('.layers')
        });
    },

    onSaved: function () {
        gmgps.cloud.helpers.general.resetWarningIfValueChanged(
            $('#Tenancy_PaymentReference')
        );
    },

    initReferences: function () {
        var me = this;
        var enabled = me.$root.find('#IsReferencingBannerVisible').val();

        if (enabled == "True") {
            me.$root.find('.tab-column.tenancy,.layers').addClass('has-integrations');
        } else {
            return;
        }

        var $passedReferencing = me.$root.find('[data-id="referencing-passed"]');
        var $failedReferencing = me.$root.find('[data-id="referencing-failed"]');
        var $referencingReset = me.$root.find('[data-id="referencing-reset"]');

        // reset handlers if they exist (in case of dynamic reload)
        $passedReferencing.off();
        $failedReferencing.off();
        $referencingReset.off();

        $passedReferencing.on(
            'click',
            function () {
                me.updateReferencingStatus(true);
            }
        );

        $failedReferencing.on(
            'click',
            function () {
                me.updateReferencingStatus(false);
            }
        );

        $referencingReset.on(
            'click',
            function () {
                me.updateReferencingStatus(null);
            }
        );

    },

    updateReferencingStatus: function (status) {
        var me = this;

        var $referencingContent = me.$root.find(
            '[data-id="referencing-content"]'
        );

        var tenancyId = parseInt(me.$root.find('#Tenancy_Id').val());

        if (me.updateReferencingStatusRequest) {
            me.updateReferencingStatusRequest.abort();
            delete me.updateReferencingStatusRequest;
        }

        var failedContent = "<div class=\"integration-response\"><img src=\"/content/media/images/gui/icons/13x13/fail.png\" alt=\"Failed referencing\" width=\"13\" height=\"13\" /><p class=\"integrations-description\">Failed</p></div><div class=\"tab left grey btn\" data-id=\"referencing-reset\">Reset</div>";
        var passedContent = "<div class=\"integration-response\"><img src=\"/content/media/images/gui/icons/13x13/success.png\" alt=\"Passed referencing\" width=\"13\" height=\"13\" /><p class=\"integrations-description\">Passed</p></div><p class=\"integrations-confirmation\">Automatically referred to Zero Deposit</p>";
        var resetContent = "<p class=\"integrations-description\">Referencing pending - select status:</p><div class=\"tab left grey btn\" data-id=\"referencing-passed\">Passed</div><div class=\"tab left grey btn\" data-id=\"referencing-failed\">Failed</div>";

        me.updateReferencingStatusRequest = new gmgps.cloud.http("sharednote-callContact")
            .ajax(
                {
                    args: {
                        TenancyId: tenancyId,
                        Status: status,
                    },
                    complex: true,
                    dataType: 'text',
                    type: 'post',
                    url: `/api/1/referencing/status`
                }
            ).done(function (response) {
                const data = JSON.parse(response);
                if (data.Status === true) {
                    $referencingContent.html(passedContent);
                }
                else if (data.Status === false) {
                    $referencingContent.html(failedContent);
                }
                else if (data.Status === null) {
                    $referencingContent.html(resetContent);
                }
                me.initReferences();
                delete me.updateReferencingStatusRequest;
            });
    },
    printTransactions: function (tenancyId, orderByCreateDate) {
        var me = this;

        me.layers.load('transactions')
            .then(function ($layers) {

                new gmgps.cloud.ui.views.transactionsHandler({
                    $root: $layers[0].find('.transactions'),
                    linkedId: tenancyId,
                    linkedTypeId: C.ModelType.Tenancy
                }).printTransactions(orderByCreateDate);
            });
    },
    beforePutTenancy: function () {
        var me = this;

        me.$root
            .find('#Tenancy_Address_CountryCode')
            .val(
                me.$root
                    .find('#Tenancy_Address_CountryCode option:selected')
                    .val()
            );
    },
    getTenancyId: function () {
        var me = this;

        var tenancyId = parseInt(
            me.$root.find('.detail').attr('data-id')
        );

        return tenancyId;
    },
    setTenancyId: function (tenancyId) {
        var me = this;
        me.id = tenancyId;
        me.$root.find('#Tenancy_Id').val(tenancyId);
        me.$root
            .find('.followUpDropdown')
            .attr('data-linkedId', tenancyId);
    },
    getVersion: function () {
        var me = this;

        var version = parseInt(
            me.$root.find('#Tenancy_VersionNumber').val()
        );

        return version;
    },
    setVersion: function (versionNumber) {
        var me = this;

        me.$root
            .find('#Tenancy_VersionNumber')
            .val(versionNumber);
    },

    callOnComplete: function (val) {
        var me = this;

        if (me.cfg.onComplete) {
            me.cfg.onComplete(val);
            delete me.cfg.onComplete;
        }
    },

};
