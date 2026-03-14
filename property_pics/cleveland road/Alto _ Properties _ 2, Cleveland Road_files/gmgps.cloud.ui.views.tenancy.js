gmgps.cloud.ui.views.tenancy = function (args) {
    var me = this;
    me.def = 'ui.views.tenancy';
    me.cfg = args;
    me.$root = args.$root;

    me.onSearchBoxFocusRequest = new gmgps.cloud.common.event();
    me.onBeforeSearchBoxFocusRequest = new gmgps.cloud.common.event();
    me.onViewModeChanged = new gmgps.cloud.common.event();
    me.onCounterChangeRequested = new gmgps.cloud.common.event();
    me.onToolbarSetContext = new gmgps.cloud.common.event();
    me.tds = new gmgps.cloud.helpers.tds.ReceiptHandler();
    me.init(args);

    Object.defineProperty(this, 'detailController', {
        get: function () {
            return me.tenancyDetails;
        }
    });

    return this;
};

gmgps.cloud.ui.views.tenancy.prototype = {
    init: function (args) {
        var me = this;

        me.$root.off();

        me.initControls();
        me.initHandlers();

        //Click the first item in the detail layer and the default item in the list layer.
        me.setViewMode(me.cfg.viewMode);

        //Auto-select the first item in the list, unless preventDefault is true.
        if (!args.preventDefault) {
            var $db = me.$root
                .find(
                    '.panel[data-id="tenancy"] .layer[data-id="detail"] li:not(.hidden) > .button'
                )
                .first(); //first in list (detail)
            $db.trigger('auto-navigate');
        }

        me.searchTipsHtml = me.$root
            .parent()
            .find('#search-tenancy-tips-container')
            .html();
    },

    initHandlers: function () {
        var me = this;

        //Panel: Events
        me.panel.onPanelItemClicked.handle(function (args) {
            me._panelItemClicked(args);
        });
        me.panel.onPanelItemStarred.handle(function ($item) {
            me._panelItemStarred($item);
        });
        me.panel.onPanelItemSaved.handle(function (args) {
            me._panelItemSaved(args);
        });
        me.panel.onPanelItemUndone.handle(function (args) {
            me._panelItemUndone(args);
        });
        me.panel.onPanelItemFilterChanged.handle(function (args) {
            me._onPanelItemFilterChanged(args);
        });
        me.panel.onPanelStepThroughClicked.handle(function ($item) {
            me._panelStepThroughClicked($item);
        });

        me.onBeforeSearchBoxFocusRequest.handle(function ($searchBox) {
            return me._beforeSearchBoxFocusRequest($searchBox);
        });

        me.$root.on(
            'change',
            '#TdsCommunicationState_AreUploadsEnabled',
            function (e) {
                var schemeRegistrationNumberBox = me.$root.find(
                    '#Tenancy_DepositProtection_SchemeRegistrationNumber'
                );

                var ticked = $(e.target).is(':checked');

                if (ticked) {
                    schemeRegistrationNumberBox.addClass(
                        'lockcontrols disabled'
                    );
                } else {
                    schemeRegistrationNumberBox.removeClass(
                        'lockcontrols disabled'
                    );
                }

                if (ticked) {
                    if (schemeRegistrationNumberBox.val() !== '') {
                        showInfo(
                            'The deposit registration number will no longer be editable and may be overwritten by TDS in future.'
                        );
                    }
                }
            }
        );

        me.$root.on('click', '.sublist-row-opener', function () {
            var hiddenArea = $(this).closest('tr').next('tr.sublist-row');

            var expand = true;
            if (hiddenArea.is(':visible')) expand = false;

            if (expand) {
                var dataId = $(this).data('id');

                if (dataId < 1) {
                    showInfo(
                        'This tenancy is not saved, please save the tenancy first.'
                    );
                    return;
                }

                new gmgps.cloud.http("tenancy-initHandlers").ajax(
                    {
                        args: { tenancyId: dataId },
                        complex: false,
                        dataType: 'json',
                        type: 'post',
                        async: false,
                        url: '/Tenancy/GetListItemExtra',
                        timeout: 6000
                    },
                    function (response) {
                        if (response.Status == C.ResponseStatusType.Success) {
                            hiddenArea
                                .find('td.extra-info-container')
                                .html(response.Data);
                            hiddenArea.slideDown();
                            hiddenArea.scrollintoview({
                                duration: 'slow',
                                direction: 'y'
                            });
                        }
                    }
                );
            } else hiddenArea.slideUp();
        });

        //Window > beforeunload
        $(window).on('beforeunload', function () {
            //Conditionally persist any unsaved tenancy. (e.g. one where changes have been made against the current record)
            // - The true flag here denotes that the persisting must be immediate, as the browser is closing.
            me.persist(true);
        });
    },

    initControls: function () {
        var me = this;

        me.panel = new gmgps.cloud.ui.controls.NavigablePanel({
            $root: me.$root.find('.panel[data-id="tenancy"]'),
            defaultTitle: 'Tenancies',
            entityType: 'tenancy',
            defaultLayer: 'detail'
        });

        me.stepThroughHandler = new gmgps.cloud.ui.views.stepThroughHandler({
            $root: me.$root,
            shell: shell,
            $spinner: $('#spinner'),
            modelType: C.ModelType.Tenancy,
            panel: me.panel,
            onNavigated: function (activeDetailsHandler) {
                me.tenancyDetails = activeDetailsHandler;
            },
            onUpdateToolBar: function (showMenu, viewMode, menuMode) {
                me.onViewModeChanged.raise({
                    newViewMode: viewMode,
                    menuMode: menuMode,
                    showMenu: showMenu,
                    group: 'tenancy'
                });
            },
            onExit: function (matchGroup) {
                matchGroup.searchArgs.search.ReturnFirstTermId = false;

                me.lastSearchArgs = matchGroup.searchArgs;
                me.tenancyDetails = me.stepThroughHandler.getDetailsHandler(
                    matchGroup.detailsHandler,
                    me.cfg.viewMode,
                    'list'
                );

                me.onViewModeChanged.raise({
                    newViewMode: 'list',
                    menuMode: 'list',
                    showMenu: true,
                    group: 'tenancy'
                });

                if (matchGroup.id !== C.FactorySearchId.SearchResults) {
                    matchGroup.$panelItem
                        .find('.button')
                        .trigger('pseudo-click');
                    return;
                }

                me.clearSearchResults();
            },
            onSave: function (onAfterSavePerformed) {
                me.performTenancySave({
                    onValidationComplete: function (success) {
                        if (success === true) {
                            glass(true);
                        }
                    },
                    onError: function () {
                        glass(false);
                        onAfterSavePerformed(false);
                    },
                    onComplete: function () {
                        glass(false);
                        onAfterSavePerformed(true);
                    }
                });
            }
        });
    },

    refreshForced: function () {
        //Called when the view was forced to be refreshed, by clicking the currently selected top-level navtab.
        var me = this;

        me.persist(true);
    },

    persist: function (immediate) {
        var me = this;
        me.persistTenancy(immediate);
    },

    action: function (args) {
        var me = this;

        if (args.action === 'list' || args.action === 'detail') {
            me.tenancyDetails = me.stepThroughHandler.getDetailsHandler(
                me.tenancyDetails,
                me.cfg.viewMode,
                args.action
            );
        }

        var category;

        switch (args.action) {
            case 'add-note':
                if (me.tenancyDetails !== undefined) {
                    me.tenancyDetails.addNote();
                }
                break;
            case 'list':
                if (!me.$listPanelItem) {
                    var $lb = me.$root.find(
                        '.panel[data-id="tenancy"] .layer[data-id="list"] .item.on .button'
                    );
                    $lb.trigger('pseudo-click');
                }

                me.setViewMode('list');
                break;

            case 'detail':
                if (!me.$tenantPanelItem) {
                    var $db = me.$root
                        .find(
                            '.panel[data-id="tenancy"] .layer[data-id="detail"] li:not(.hidden) > .button'
                        )
                        .first(); //first in list (detail)

                    $db.trigger('prog-click');
                }
                me.setViewMode('detail');
                break;

            case 'print-timeline':
                me.printTimeline(me.tenancyDetails.id);
                googleAnalytics.sendEvent(
                    'tenancies',
                    'menu_item_click',
                    'print_timeline'
                );
                break;

            case 'print-transactions-order-createdate':
                me.printTransactions(me.tenancyDetails.id, true);
                googleAnalytics.sendEvent(
                    'tenancies',
                    'menu_item_click',
                    'print_transaction_id'
                );
                break;

            case 'print-transactions-order-itemdate':
                me.printTransactions(me.tenancyDetails.id, false);
                googleAnalytics.sendEvent(
                    'tenancies',
                    'menu_item_click',
                    'print_transaction_date'
                );
                break;

            case 'pm-accounting-documents':
                new gmgps.cloud.ui.views.accountingDocumentsHandler({
                    title: 'Accounting Documents'
                }).show();
                googleAnalytics.sendEvent(
                    'tenancies',
                    'menu_click_item',
                    'pm_accounting_documents'
                );
                break;

            case 'create-letter':
                var id =
                    me.tenancyDetails !== undefined ? me.tenancyDetails.id : 0;
                gmgps.cloud.helpers.general.showWriteLetterPrompt({
                    id: id,
                    contextModelType: C.ModelType.Tenancy
                });
                googleAnalytics.sendEvent(
                    'tenancies',
                    'menu_click_item',
                    'create_letter'
                );
                break;

            case 'pm-charge':
                new gmgps.cloud.ui.views.chargesHandler({
                    linkedTypeId: C.ModelType.Tenancy,
                    linkedId: me.tenancyDetails.id,
                    title: 'Charges For This Tenancy',
                    subject: 'This Tenancy'
                }).show();
                break;

            case 'pm-receipt':
                new gmgps.cloud.ui.views.receiptsHandler({
                    linkedTypeId: C.ModelType.Tenancy,
                    linkedId: me.tenancyDetails.id,
                    title: 'Receipt from this tenancy',
                    onComplete: function () {}
                }).show();
                break;
            case 'pm-refund':
                new gmgps.cloud.ui.views.refundsHandler({
                    linkedTypeId: C.ModelType.Tenancy,
                    linkedId: me.tenancyDetails.id,
                    title: 'Refunds For This Tenancy',
                    onComplete: function () {}
                }).show();
                break;
            case 'pm-transferDeposit':
                new gmgps.cloud.ui.views.transferDepositHandler({
                    linkedTypeId: C.ModelType.Tenancy,
                    linkedId: me.tenancyDetails.id,
                    title: 'Transfer Deposit',
                    onComplete: function () {}
                }).show();
                break;
            case 'pm-registerTds':
                me.registerTds(me.tenancyDetails.id);
                break;

            case 'email-landlords':
                category = 'email_landlords';
                googleAnalytics.sendEvent(
                    'tenancies',
                    'menu_item_click',
                    category
                );
                me.showEmailMessagerPopup(true, false, category);
                break;

            case 'email-tenants':
                category = 'email_tenants';
                googleAnalytics.sendEvent(
                    'tenancies',
                    'menu_item_click',
                    category
                );
                me.showEmailMessagerPopup(false, true, category);
                break;

            case 'email-landlords-and-tenants':
                category = 'email_landlords_and_tenants';
                googleAnalytics.sendEvent(
                    'tenancies',
                    'menu_item_click',
                    category
                );
                me.showEmailMessagerPopup(true, true, category);
                break;

            case 'sms-landlords':
                me.showSmsMessagerPopup(true, false);
                break;

            case 'sms-tenants':
                me.showSmsMessagerPopup(false, true);
                break;

            case 'sms-landlords-and-tenants':
                me.showSmsMessagerPopup(true, true);
                break;

            default:
                break;
        }
    },

    showEmailMessagerPopup: function (
        includeLandlords,
        includeTenants,
        category
    ) {
        var me = this;

        me.showMessagerPopup(
            '/contact/GetMailDetailsForContacts',
            'Send Mail',
            'an email address',
            gmgps.cloud.helpers.general.getMailMessager,
            includeLandlords,
            includeTenants,
            category
        );
    },

    showSmsMessagerPopup: function (includeLandlords, includeTenants) {
        var me = this;

        me.showMessagerPopup(
            '/contact/GetSmsDetailsForContacts',
            'Send SMS',
            'a mobile phone number',
            gmgps.cloud.helpers.general.getSMSMessager,
            includeLandlords,
            includeTenants
        );
    },

    showMessagerPopup: function (
        getContactsUrl,
        popupTitle,
        missingItemDescription,
        popupFunc,
        includeLandlords,
        includeTenants,
        category
    ) {
        var me = this;

        var searchDescription =
            (includeLandlords ? 'landlords' : '') +
            (includeLandlords && includeTenants ? '/' : '') +
            (includeTenants ? 'tenants' : '');

        return me
            .getSelectedTenancyContactIds(includeLandlords, includeTenants)
            .then(function (contactIds) {
                return Q(
                    new gmgps.cloud.http("tenancy-showMessagerPopup").ajax({
                        args: {
                            search: {
                                ExcludeIds: false,
                                Ids: contactIds
                            }
                        },
                        complex: true,
                        dataType: 'json',
                        type: 'post',
                        url: getContactsUrl
                    })
                ).then(function (response) {
                    if (response.Data.length === 0) {
                        showInfo(
                            'None of the selected ' +
                                searchDescription +
                                ' has ' +
                                missingItemDescription +
                                '.'
                        );
                        return;
                    }

                    if (
                        !me.containsRequiredContacts(response.Data, contactIds)
                    ) {
                        $.jGrowl(
                            'One or more of the selected ' +
                                searchDescription +
                                ' is missing ' +
                                missingItemDescription +
                                '.',
                            { header: 'Not Added', theme: 'growl-contact' }
                        );
                    }

                    popupFunc({
                        title: popupTitle,
                        settings: {
                            ContactIdList: response.Data,
                            originatingEventCategory: 0,
                            originatingEventId: 0,
                            showAssociatedProperty: true
                        },
                        category: category,
                        onComplete: function () {}
                    });
                });
            })
            .catch(function (error) {
                showInfo(error);
            });
    },

    getSelectedTenancyContactIds: function (includeLandlords, includeTenants) {
        var me = this;
        var ids = me.list.ids;

        if (
            (me.list.selectionMode === C.ListSelectionMode.None &&
                ids.length == 0) ||
            (me.list.selectionMode === C.ListSelectionMode.All &&
                ids.length == me.list.totalRows)
        ) {
            return Q.reject('Please select some tenancies first.');
        }

        var searchDescription =
            (includeLandlords ? 'landlord' : '') +
            (includeLandlords && includeTenants ? ' or ' : '') +
            (includeTenants ? 'tenant' : '');

        var searchArgs = jQuery.extend(true, {}, me.lastSearchArgs.search, {
            Ids: ids,
            ExcludeIds: me.list.selectionMode === C.ListSelectionMode.All,
            SearchPage: { Size: 0 },
            Query: '',
            ReturnFirstTermId: true,
            UseLatestTerm: true,
            IncludeLandlords: includeLandlords,
            IncludeTenants: includeTenants
        });

        return Q(
            new gmgps.cloud.http("tenancy-getSelectedTenancyContactIds").ajax({
                args: searchArgs,
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/Tenancy/GetTenancyContacts'
            })
        ).then(function (response) {
            if (response.Data.length === 0) {
                throw (
                    'None of the selected tenancies has a valid ' +
                    searchDescription +
                    ' contact.'
                );
            }

            return response.Data;
        });
    },

    containsRequiredContacts: function (contacts, requiredContactIds) {
        if (!Array.isArray(contacts) || !Array.isArray(requiredContactIds)) {
            return false;
        }

        return requiredContactIds.every(function (contactId) {
            return (
                contacts.findIndex(function (contact) {
                    return contact.ContactId === contactId;
                }) >= 0
            );
        });
    },

    registerTds: function (tenancyId) {
        var me = this;

        showDialog({
            type: 'question',
            title: 'TDS Registration',
            width: 600,
            msg: 'Would you like to proceed to register your deposit with TDS?',
            buttons: {
                Yes: function () {
                    $(this).dialog('close');
                    me.checkAndUpdateTdsStateForPendingTenancy(tenancyId).done(
                        function (r) {
                            if (r && r.Data) {
                                me.tds.notifyProposedTenancyRegistrationStatus({
                                    tenancyId: r.Data.MissingDetailsId,
                                    message: r.Data.Message,
                                    sent: r.Data.Sent
                                });
                            }
                        }
                    );
                },
                No: function () {
                    $(this).dialog('close');
                }
            }
        });
    },

    checkAndUpdateTdsStateForPendingTenancy: function (tenancyId) {
        return new gmgps.cloud.http(
            "tenancy-checkAndUpdateTdsStateForPendingTenancy"
        ).ajax({
            args: { tenancyId: tenancyId },
            complex: true,
            dataType: 'json',
            type: 'post',
            url: '/TDS/CheckAndUpdateTdsStateForPendingTenancy'
        });
    },

    printTimeline: function (tenancyId) {
        var me = this;

        if (
            me.tenancyDetails.eventTypes == null ||
            me.tenancyDetails.eventTypes.length == 0
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
                TenancyId: tenancyId,
                ContextModelType: C.ModelType.Tenancy,
                SearchOrder: {
                    By: C.SearchOrderBy.StartDate,
                    Type: C.SearchOrderType.Descending
                }
            },
            settings: {
                TimeLineFilters: me.tenancyDetails.eventTypes,
                AllTimeLineFiltersSelected: me.tenancyDetails.allFiltersSelected
            }
        };

        var $form = gmgps.cloud.utility.buildForm(
            'Tenancy/PrintTimeline',
            args
        );

        $form.submit();
        $form.remove();
    },

    printTransactions: function (tenancyId, orderByCreateDate) {
        var me = this;
        me.tenancyDetails.printTransactions(tenancyId, orderByCreateDate);
    },

    reindexMedias: function ($form) {
        var subscript = 0;
        var groups = ['.tenancy .tenancydoc'];
        for (var group in groups) {
            var orderIndex = 1;
            $form.find(groups[group]).each(function (arrayIndex, value) {
                $(value)
                    .find('input.forindex')
                    .each(function (inputIndex, value) {
                        var name = $(value).attr('name');
                        name = name.replace('[]', '[' + subscript + ']');
                        $(value).attr('name', name);

                        if (name.indexOf('OrderIndex') != -1) {
                            $(value).val(orderIndex);
                            orderIndex++;
                        }
                    });
                subscript++;
            });
        }
    },

    reindexUtilities: function ($form) {
        $form
            .find('.tenancy-utilities .utility')
            .each(function (arrayIndex, v) {
                //Each input
                $(v)
                    .find('input,textarea,select')
                    .each(function (inputIndex, value) {
                        var name = $(value).attr('name');
                        name = name.replace(
                            'UtilityReadings.Utilities[]',
                            'UtilityReadings.Utilities[' + arrayIndex + ']'
                        );
                        $(value).attr('name', name);
                    });
            });
    },

    getUnsavedRecordCount: function () {
        var me = this;
        return me.$root.find(
            '.panel .layer[data-id="detail"] .item[data-isdirty="1"]'
        ).length;
    },

    _tenancyDetailsChanged: function (id) {
        var me = this;
        me.panel.showSaveButton({
            id: id,
            modelType: C.ModelType.Tenancy,
            show: true,
            callback: function () {
                me.onCounterChangeRequested.raise(me.getUnsavedRecordCount());
            }
        });
    },

    showMatchGroup: function (name) {
        var me = this;

        me.$root.find('.content[data-id="detail"]').hide();
        me.setViewMode('list');
        
        var $matchGroupItem = me.$root.find(
            '.panel .layer[data-id="list"] ul li[data-type="list"][data-unique-id="' +
                name +
                '"]'
        );

        $matchGroupItem.find('.button').trigger('prog-click');
    },

    show: function (viewMode) {
        var me = this;
        me.$root.show();
        me.setViewMode(viewMode);
    },

    setViewMode: function (viewMode, withEmpty) {
        var me = this;

        if (me.cfg.viewMode == viewMode) {
            return;
        } else {
            me.cfg.viewMode = viewMode;
        }

        //Display the panel for this view
        me.panel.showLayer(viewMode);

        me.$root.find('.content-container > div').hide();

        var $content = me.$root.find(
            '.content-container > .content[data-id="' + viewMode + '"]'
        );

        if (withEmpty) $content.empty();

        $content.show();

        var menuMode = me.stepThroughHandler.stepThroughModeActive
            ? 'detail'
            : viewMode;

        me.onViewModeChanged.raise({
            newViewMode: viewMode,
            menuMode: menuMode,
            showMenu: true,
            group: 'tenancy'
        });

        if (viewMode === 'list' && me.$listPanelItem) {
            alto.router.navigationChanged('groups', {
                collection: 'tenancies',
                name: me.$listPanelItem.attr('data-unique-id')
            });
        } else if (
            viewMode === 'detail' &&
            me.tenancyDetails &&
            !me.tenancyDetails.cfg.inStepThrough
        ) {
            alto.router.navigationChanged('entity', {
                collection: 'tenancies',
                id: me.tenancyDetails.id
            });
        }
    },

    getList: function (args, onSuccess) {
        var me = this;

        args.search = me.applyPanelFilters(args);

        me.lastSearchArgs = args;

        new gmgps.cloud.http("tenancy-getList").ajax(
            {
                args: args.search,
                complex: true,
                dataType: 'json',
                type: 'post',
                background: true,
                url: '/Tenancy/GetTenancyList',
                listType: C.ListType.Standard
            },
            function (response) {
                me.lastSearchArgs.search.TotalRows = parseInt(
                    $('<span>{0}</span'.format(response.Data))
                        .find('#TotalRows')
                        .val()
                );

                me.displayList(
                    response,
                    args.$panelItem,
                    args.ids,
                    args.selectionMode,
                    args.search.Query,
                    args.disablePaging
                );
                if (onSuccess) {
                    onSuccess();
                }
            }
        );
    },

    create: function () {
        var me = this;
        me._onDetailsRequest({
            id: 0
        });
        return;
    },

    getTenancy: function (args, onSuccess) {
        var me = this;
        console.log('getTenancy:args', args);

        me.onToolbarSetContext.raise({
            group: 'tenancy',
            type: 'detail',
            id: args.id,
            modelType: C.ModelType.Tenancy
        });

        //Check cache first.
        var object;
        if (!args.forceRefresh) {
            object = shell.cache.get(C.ModelType.Tenancy, args.id);
            if (object && object.html) {
                console.log('getTenancy:cache,calling displayTenancy');
                me.displayTenancy({
                    Data: object.html,
                    id: args.id,
                    tabColumnTabName: object.uiState.tabColumnTabName,
                    tabName: object.uiState.tabName,
                    loadedFromCache: true,
                    onComplete: args.onComplete
                });

                if (onSuccess) onSuccess();

                return;
            }
        }

        var tabColumnTabName = object
            ? object.uiState.tabColumnTabName
            : args.tabColumnTabName
            ? args.tabColumnTabName
            : 'overview';

        //Fetch from server
        var url = 'Tenancy/GetTenancy';

        var layerArgs = {
            DefaultLayer: tabColumnTabName,
            TenancyId: args.id
        };

        new gmgps.cloud.http("tenancy-getTenancy").ajax(
            {
                args: layerArgs,
                complex: true,
                background: true,
                dataType: 'json',
                type: 'post',
                url: url
            },
            function (response) {
                console.log('getTenancy:nocache,calling displayTenancy', tabColumnTabName);
                me.displayTenancy({
                    Data: response.Data.Html
                        ? response.Data.Html
                        : response.Data,
                    id: args.id,
                    tabColumnTabName: response.Data.Html
                        ? null
                        : tabColumnTabName,
                    tabName: object ? object.uiState.tabName : args.tabName,
                    layersLoaded: response.Data.Html ? true : false,
                    onComplete: args.onComplete
                });

                if (onSuccess) onSuccess();
            },
            function () {
                me.$root
                    .find('.content-container > .content[data-id="detail"]')
                    .empty();
            }
        );
    },

    getPageTenancyHtmlVersion: function () {
        var me = this;
        return parseInt(
            me.$root
                .find('.content-container > .content .detail')
                .attr('data-htmlversion')
        );
    },

    tenancyHtmlIsOutOfDate: function () {
        var me = this;
        return (
            me.getPageTenancyHtmlVersion() <
            shell.getCurrentTenancyHtmlVersion()
        );
    },

    beforePutTenancy: function () {
        var me = this;

        if (me.tenancyHtmlIsOutOfDate()) {
            showInfo(
                'Updates to Alto mean that this tenancy is now out of date so cannot be saved. Please Undo your changes and refresh to get the latest property changes'
            );
            return false;
        }

        me.tenancyDetails.beforePutTenancy();

        return true;
    },

    putTenancy: function ($item, onSuccess, onError) {
        var me = this;

        var $form = createForm(me.tenancyDetails.$root, '/tenancy/update');

        me.reindexMedias($form);

        me.reindexUtilities($form);

        //Send data.
        new gmgps.cloud.http("tenancy-putTenancy").postForm(
            $form,
            function (response) {
                me.update(response.Data.TenancyId, response.Data.VersionNumber);

                if (response.Data.ShowSharingDocumentMessage) {
                    $.jGrowl('', {
                        header: 'Your contacts will see your requested changes in PropertyFile in 10-15 minutes',
                        theme: 'growl-system'
                    });
                }

                if (onSuccess) {
                    onSuccess(response);
                }
            },
            function (errResponse) {
                if (onError) {
                    onError(errResponse);
                }
            }
        );
    },

    update: function (id, versionNumber) {
        var me = this;

        me.id = id;
        me.tenancyDetails.setTenancyId(id);
        me.tenancyDetails.setVersion(versionNumber);
        console.log('update');
        me.tenancyDetails.refreshLayer('overview');
        me.tenancyDetails.refreshLayer('documents');
    },
    persistTenancy: function () {
        var me = this;

        if (!me.tenancyDetails) {
            return; //Nothing loaded at present.
        }
        // TODO : this need input from Alex
        //Put to local cache?
        if (me.tenancyDetails.viewChanged || me.tenancyDetails.isDirty) {
            //Persist unsaved record.
            var $tenancyDetails = me.$root.find(
                '.content-container > .content[data-id="detail"]'
            );
            var versionNumber = me.tenancyDetails.getVersion();

            var t1 = me.$root.find('.tab-column li.selected').attr('data-id');
            var t2 = me.$root
                .find(
                    '.layers .layer[data-id="' +
                        t1 +
                        '"] .tabs .ui-tabs-selected a'
                )
                .attr('href');
            if (t2) t2 = t2.replace('#', '').replace('-tab', '');

            var tenancyId = me.tenancyDetails.getTenancyId();

            var html = $tenancyDetails.formhtml();

            if (tenancyId !== me.tenancyDetails.id) return;

            //Add to cache.
            shell.cache.put({
                modelType: C.ModelType.Tenancy,
                id: tenancyId,
                versionNumber: versionNumber,
                html: html,
                isDirty: me.tenancyDetails.isDirty,
                uiState: { tabColumnTabName: t1, tabName: t2 },
                description: $tenancyDetails.find('#_description').val()
            });
        }
    },

    setDirty: function (id) {
        var me = this;
        me._tenancyDetailsChanged(id);
        me.onCounterChangeRequested.raise(me.getUnsavedRecordCount());
    },

    displayTenancy: function (args) {
        var me = this;
        console.log('displayTenancy:args', args);
        var $detailContainer = me.$root.find(
            '.content-container > .content[data-id="detail"]'
        );

        $detailContainer[0].innerHTML = args.Data;
        $detailContainer.show();

        //Create a tenancy Details object to look after this content.
        me.tenancyDetails = new gmgps.cloud.ui.views.tenancyDetails({
            id: args.id,
            $root: $detailContainer,
            loadedFromCache: args.loadedFromCache,
            tabLayerToLoad: args.tabColumnTabName,
            onComplete: function () {
                if (args.onComplete) {
                    args.onComplete()
                }

                alto.application.events.raise('view-loaded', $detailContainer[0], { viewName: 'tenancy', type: 'detail', id: args.id });
            }
        });

        me.stepThroughHandler.updateDetailsHandler(me.tenancyDetails);

        //Tenancy Details > Changed
        me.tenancyDetails.onChanged.handle(function (tenancyId) {
            me.setDirty(tenancyId);
        });

        //If this is a new tenancy, set dirty now.
        if (args.id == 0) {
            me.setDirty(0);
        }

        //Callback for changes to the tab column label (future)
        me.tenancyDetails.onTabColumnItemLabelChangeRequest.handle(function (
            args
        ) {
            var $tab = me.$root.find(
                '.tab-column li[data-id="' + args.id + '"]'
            );
            $tab.html(
                args.value +
                    ($tab.hasClass('selected')
                        ? '<div class="pointer"></div>'
                        : '')
            );
        });

        //If an explicit tabColumnTab was passed in, hide all layers and show the chosen one.
        if (args.tabColumnTabName) {
            me.tenancyDetails.showDetailLayer({ id: args.tabColumnTabName });
        } else {
            //If new, default to the tenancyinfo layer, else the overview layer.
            if (args.id == 0) args.tabColumnTabName = 'tenancyinfo';
            else if (!args.loadedFromCache) args.tabColumnTabName = 'overview';
        }


        //Server sends the default tab column usually.  However, this can be overridden with arg.tabColumnTabName
        if (args.tabColumnTabName) {
            me.tenancyDetails.tabColumn.selectTab(args.tabColumnTabName);
            me.tenancyDetails.tabName = args.tabName; //picked up later.
        }

        //Ask the panel to display the save/undo buttons if this record is dirty.
        if (me.tenancyDetails.isDirty)
            me.panel.showSaveButton({
                id: args.id,
                modelType: C.ModelType.Tenancy,
                show: true
            });
    },

    getActiveTenancyDetails: function () {
        var me = this;
        var details = [];

        if (!me.tenancyDetails) return details;

        if (me.stepThroughHandler.stepThroughModeActive) {
            details.push(me.stepThroughHandler.activeMatchGroup.detailsHandler);
            details.push(me.stepThroughHandler.savedDetailsHandler);
        } else {
            details.push(me.tenancyDetails);
        }

        return details;
    },

    pnRefreshTransactions: function (id, refreshDeposit) {
        var me = this;

        var details = me.getActiveTenancyDetails();

        $.each(details, function (i, tenancyDetails) {
            if (tenancyDetails.id === id) {
                tenancyDetails.refreshLoadedTransactions();

                if (refreshDeposit) {
                    tenancyDetails.refreshDeposit();
                }
            } else {
                shell.cache.del(C.ModelType.Tenancy, id);
            }
        });
    },

    refreshTenancy: function (args, selectedLayer) {
        var me = this;
        console.log('refreshTenancy:args', args, selectedLayer);
        var details = me.getActiveTenancyDetails();

        _.forEach(details, function (tenancyDetails) {
            shell.cache.del(C.ModelType.Tenancy, tenancyDetails.id);
            if (tenancyDetails.id === args.id) {
                me.getTenancy({
                    id: args.id,
                    tabColumnTabName: tenancyDetails.selectedLayer || selectedLayer || 'overview',
                    tabName: tenancyDetails.tabColumn.tabName,
                    forceRefresh: true,
                }, function () {
                    me.onCounterChangeRequested.raise(me.getUnsavedRecordCount());
                });
            } else {
                var tenancyElementSelector = '.content-container div[data-id="detail"] div[data-id="{0}"].detail, .content-container .opt-u[data-id="{0}"][data-modelType="{1}"]'.format(tenancyDetails.id, C.ModelType.Tenancy);
                var tenancyElementsToRemove = me.$root.find(tenancyElementSelector);
                tenancyElementsToRemove.remove();
            }
        });
    },

    pnResizeUI: function (id) {
        var me = this;

        var details = me.getActiveTenancyDetails();

        $.each(details, function (i, tenancyDetails) {
            if (tenancyDetails.id === id) {
                tenancyDetails.sizeRecentActivity();
            }
        });
    },

    pnUpdateToolbar: function (id) {
        var me = this;

        var details = me.getActiveTenancyDetails();

        $.each(details, function (i, tenancyDetails) {
            if (tenancyDetails.id === id) {
                tenancyDetails.setupToolbar();
            }
        });
    },


    pnUpdate: function (pn) {
        var me = this;
        var eventAffectsThisTenancy = false;
        var details = me.getActiveTenancyDetails();

        $.each(details, function (i, tenancyDetails) {
            switch (pn.ModelType) {
                case C.ModelType.Tenancy:
                    //Detail
                    if ($.inArray(tenancyDetails.id, pn.Ids) !== -1) {
                        if (
                            pn.SrcSignalRConnectionId !==
                            pn.connection.signalRConnectionId
                        ) {
                            var tenancyUpdatedDialogId =
                                'tenancyUpdatedDialog_' + me.tenancyDetails.id;

                            if ($('#' + tenancyUpdatedDialogId).length === 0) {

                                var updatedBy = '';
                                if (pn.Data && pn.Data.UpdatedBy) {
                                    updatedBy = ' by ' + pn.Data.UpdatedBy;
                                }

                                showDialog({
                                    type: 'info',
                                    title: 'Tenancy Updated',
                                    msg: '{0} has been updated{1}.  This record has been refreshed to the latest version.'.format(
                                        me.$tenantPanelItem.find('h3').text(),
                                        updatedBy
                                    ),
                                    buttons: {
                                        OK: function () {
                                            $(this).dialog('close');
                                        }
                                    },
                                    id: tenancyUpdatedDialogId
                                });
                            }

                            me._panelItemClicked({
                                $item: me.$tenantPanelItem,
                                onComplete: function () {
                                    //
                                },
                                selected: true
                            });

                            //Remove any locally cached copy of yours.
                            shell.cache.del(
                                C.ModelType.Tenancy,
                                tenancyDetails.id
                            );
                        }
                    }
                    break;
                case C.ModelType.Contact:
                    if (tenancyDetails.$root.find(
                            '[data-modeltype={0}][data-id={1}]'.format(
                                C.ModelType.Contact,
                                pn.Ids[0]
                            )
                        ).length > 0
                    ) {
                        me.refreshTenancy({ id: tenancyDetails.id });
                    }

                    break;

                case C.ModelType.SigningRequest:
                    $.each(pn.Data.Parties, function (i, party) {
                        if (
                            party.ContextModelTypeId === C.ModelType.Tenancy &&
                            party.ModelId === tenancyDetails.id
                        ) {
                            shell.cache.del(
                                C.ModelType.Tenancy,
                                tenancyDetails.id
                            );
                            eventAffectsThisTenancy = true;
                        }
                    });

                    if (eventAffectsThisTenancy) {
                        me.refreshTenancy({ id: tenancyDetails.id });
                    }

                    break;
            }
        });
    },

    displayList: function (
        response,
        $panelItem,
        ids,
        selectionMode,
        query,
        disablePaging
    ) {
        var me = this;

        me.$root
            .find('.content-container > .content[data-id="list"]')
            .html(response.Data);

        me.list = new gmgps.cloud.ui.controls.list({
            $root: me.$root.find(
                '.content-container > .content[data-id="list"]'
            ),
            ids: ids,
            selectionMode: selectionMode,
            selectedItemName: 'Tenancy',
            selectedItemPluralName: 'Tenancies',
            searchString: query,
            disablePaging: disablePaging
        });

        //List: onDetailsRequest
        me.list.onDetailsRequest.handle(function (args) {
            me._onDetailsRequest(args);
        });

        //List: onPageRequest
        me.list.onPageRequest.handle(function (args) {
            me._onPageRequest(args);
        });
    },

    showSearchResultsPanelItem: function (show) {
        var me = this;
        me.$listPanelItem = me.panel.showSearchResultsPanelItem(show);

        if (show) {
            me.stepThroughHandler.resetSearchMatchGroup(me.$listPanelItem);
        }
    },

    clearSearchResults: function () {
        var me = this;
        me.stepThroughHandler.resetSearchMatchGroup(null);
        me.$root.find(
            '.content-container > .content[data-id="list"]'
        )[0].innerHTML = me.searchTipsHtml;
    },

    performTenancySave: function (args) {
        var me = this;

        if (me.tenancyDetails.validate() == false) {
            args.onValidationComplete(false);
            return false;
        }

        if (!me.beforePutTenancy()) return false;

        args.onValidationComplete(true);

        gmgps.cloud.utility.showBusy(
            me.$root.find('.content-container > .content[data-id="detail"]')
        );

        me.$root.find('input').blur();

        me.putTenancy(
            args.$item,
            function (response) {
                //Remove from cache.
                shell.cache.del(C.ModelType.Tenancy, response.Data.TenancyId);

                //Clear the dirty flag and callback to the side panel to notify complete.
                me.tenancyDetails.id = response.Data.TenancyId;

                me.tenancyDetails.setDirty(false);

                args.onComplete(response.Data.TenancyId, function () {
                    //Counter change.
                    me.onCounterChangeRequested.raise(
                        me.getUnsavedRecordCount()
                    );
                });

                //Prompt for letters.
                gmgps.cloud.helpers.general.promptForLetters({
                    eventHeaders: response.UpdatedEvents
                });
            },
            function () {
                // onError
                args.onError && args.onError();
            }
        );
    },

    redisplayed: function () {
        var me = this;
        if (me.tenancyDetails && me.tenancyDetails.sizeRecentActivity) {
            me.tenancyDetails.sizeRecentActivity();
        }

        if (me.tenancyDetails) {
            window.dispatchEvent(
                new CustomEvent('alto:item-show', {
                    detail: { category: 'tenancies', item: me.tenancyDetails }
                })
            );
        }
    },

    setQuery: function (query, filters, callback) {
        var me = this;

        var id = parseInt(me.$listPanelItem.attr('data-id'));

        me.query = query.replace(/\s/g, '');

        //Exit early if too short.
        if (me.query.length < 3) {
            me.clearSearchResults();
            callback(query);
            return false;
        }

        me.stepThroughHandler.resetSearchMatchGroup(me.$listPanelItem, true);

        var search = {
            SearchId: id,
            Query: query,
            Name: me.$listPanelItem.find('.content').text(),
            StatusIdList: filters.idList,
            Archived: filters.records,
            ListType: C.ListType.Standard,
            disablePaging: true,
            SearchPage: {
                Index: 1,
                Size: 100
            },
            SearchOrder: {
                By: C.SearchOrderBy.SearchScore,
                Type: C.SearchOrderType.Ascending
            }
        };

        me.getList(
            {
                $panelItem: me.$listPanelItem,
                search: search
            },
            function () {
                var newMatchGroup = me.stepThroughHandler.constructMatchGroup(
                    id,
                    me.$listPanelItem,
                    { $panelItem: me.$listPanelItem, search: search },
                    me.list.ids
                );
                me.stepThroughHandler.addMatchGroup(newMatchGroup);

                if (callback) {
                    callback(query);
                }
            }
        );
    },

    _onDetailsRequest: function (args, tabColumnTabName, tabName) {
        var me = this;

        me.setViewMode('detail');

        //Find the panel item relating to the requested item.
        var $item = me.$root
            .find(
                '.panel .layer[data-id="detail"] ul li[data-type="detail"][data-id="' +
                    args.id +
                    '"]'
            )
            .not('.hidden');

        if ($item.length == 0) {
            //Clear the detail container.
            me.$root.find('.content[data-id="detail"]').hide();

            if (args.id == 0) {
                //Ensure there is no ID:0 tenancy hanging around in the local cache.
                shell.cache.del(C.ModelType.Tenancy, 0);
            }

            //No existing panel item for this record - insert one.
            $item = me.$root
                .find(
                    '.panel .layer[data-id="detail"] ul li[data-type="detail"][data-id="-1"]'
                )
                .clone();
            $item
                .attr('data-id', args.id)
                .find('.content h3')
                .html(args.id == 0 ? 'New Tenancy' : '');

            if (args.id != 0) $item.attr('data-refresh', 1);

            if (
                me.$root.find('.panel .layer[data-id="detail"] ul li.recent')
                    .length > 0
            ) {
                $item.insertBefore(
                    me.$root
                        .find('.panel .layer[data-id="detail"] ul li.recent')
                        .first()
                );
            } else {
                //Only 1 recent.  Always position at the bottom.
                $item.append($item.siblings().last());
            }
            $item.removeClass('hidden').show();
        } else {
            if (args.id == 0) {
                //A new tenancy already exists, unsaved.  Must save first.
                showInfo(
                    'Please save your recently added tenancy before adding another.',
                    'Add Tenancy'
                );
                return;
            } else {
                //Item already exists... move to top of panel (but don't interfere if it's a fav)
                if ($item.hasClass('recent')) {
                    if (
                        me.$root.find(
                            '.panel .layer[data-id="detail"] ul li.recent'
                        ).length > 0
                    ) {
                        //Only shift position if this item is not already at the top.
                        if (
                            !args.preservePosition &&
                            $item.attr('data-id') !=
                                me.$root
                                    .find(
                                        '.panel .layer[data-id="detail"] ul li.recent'
                                    )
                                    .first()
                                    .attr('data-id')
                        ) {
                            $item.insertBefore(
                                me.$root
                                    .find(
                                        '.panel .layer[data-id="detail"] ul li.recent'
                                    )
                                    .first()
                            );
                        }
                    } else {
                        //Only 1 recent.  Always position at the bottom.
                        $item.append($item.siblings().last());
                    }
                }
            }
        }

        //Setup default tab column and tab name, if any.
        var $button = $item.find('.button');
        if (tabColumnTabName) $button.attr('data-tabcolumn', tabColumnTabName);

        if (tabName) $button.attr('data-tab', tabName);

        //Click the panel item.
        $button.trigger('prog-click');
    },

    _onPageRequest: function (args) {
        var me = this;

        var search = me.lastSearchArgs.search;
        search.SearchPage = args.SearchPage;
        search.SearchOrder = args.SearchOrder;

        me.getList({
            ids: args.ids,
            selectionMode: args.selectionMode,
            $panelItem: me.$listPanelItem,
            search: search
        });
    },

    _onPanelItemFilterChanged: function ($item) {
        var me = this;

        $item = $item.$root.closest('.item');

        var searchId = parseInt($item.attr('data-id'));

        var search =
            searchId !== C.FactorySearchId.AdhocMatchGroup
                ? {
                      SearchId: searchId,
                      ListType: C.ListType.Standard,
                      SearchPage: {
                          Index: 1,
                          Size: C.SearchPageSize.Default
                      },
                      SearchOrder: {
                          By: C.SearchOrderBy.StartDate,
                          Type: C.SearchOrderType.Descending
                      }
                  }
                : me.panel.adhocMatchGroupSearch;

        me.query = '';
        me.getList({
            $panelItem: $item,
            search: search
        });
    },

    _panelStepThroughClicked: function ($item) {
        var me = this;
        me.stepThroughHandler.stepThroughButtonClicked(
            $item,
            me.lastSearchArgs,
            me.list.ids
        );
    },

    _panelItemClicked: function (args) {
        var me = this;
        var id = parseInt(args.$item.attr('data-id'));

        switch (args.$item.attr('data-type')) {
            case 'detail':
                if (!args.selected) {
                    me.persistTenancy();
                }

                me.getTenancy(
                    {
                        id: id,
                        tabColumnTabName: args.$item
                            .find('.button')
                            .attr('data-tabcolumn'),
                        tabName: args.$item.find('.button').attr('data-tab'),
                        forceRefresh: args.selected,
                        onComplete: function () {
                            if (args.onComplete) {
                                args.onComplete();
                            }

                            if (args.eventType === 'auto-navigate') {
                                alto.router.navigationComplete('entity-layer', {
                                    collection: 'tenancies',
                                    id: id,
                                    layer: 'overview'
                                });
                            }
                        }
                    },

                    function () {
                        me.onCounterChangeRequested.raise(
                            me.getUnsavedRecordCount()
                        );
                    }
                );

                me.$tenantPanelItem = args.$item;

                googleAnalytics.sendEvent(
                    'tenancies',
                    'list_click',
                    'tenancy_item'
                );
                break;

            case 'list':
                me.persistTenancy();
                me.$listPanelItem = args.$item;

                if (me.stepThroughHandler.canNavigate()) {
                    me.stepThroughHandler
                        .navigate(id, C.StepThroughDirection.Current)
                        .done(function () {
                            args.onComplete();
                        });
                    return;
                }

                switch (id) {
                    case C.FactorySearchId.SearchResults: //search
                        me.clearSearchResults();
                        me.onSearchBoxFocusRequest.raise();
                        args.onComplete();
                        alto.router.navigationChanged('groups', {
                            collection: 'tenancies',
                            name: me.$listPanelItem.attr('data-unique-id')
                        });
                        break;

                    default:
                        me.query = '';

                        //RAF lists display in natural order to start.
                        var searchOrderBy =
                            id === C.FactorySearchId.Recents
                                ? C.SearchOrderBy.Natural
                                : C.SearchOrderBy.StartDate;

                        var search =
                            id === C.FactorySearchId.AdhocMatchGroup
                                ? me.panel.adhocMatchGroupSearch
                                : {
                                      SearchId: parseInt(
                                          args.$item.attr('data-id')
                                      ),
                                      ListType: C.ListType.Standard,
                                      SearchPage: {
                                          Index: 1,
                                          Size: C.SearchPageSize.Default
                                      },
                                      SearchOrder: {
                                          By: searchOrderBy,
                                          Type: C.SearchOrderType.Descending
                                      }
                                  };

                        me.getList(
                            {
                                $panelItem: args.$item,
                                search: search
                            },
                            function () {
                                args.onComplete();
                                alto.router.navigationChanged('groups', {
                                    collection: 'tenancies',
                                    name: me.$listPanelItem.attr('data-unique-id')
                                });
                            }
                        );
                        break;
                }
                break;
            case 'newselectionaction':
                args.onComplete();
                break;
            default:
                args.onComplete();
                break;
        }
    },

    _beforeSearchBoxFocusRequest: function ($searchBox) {
        var me = this;

        return me.stepThroughHandler.onMatchGroupLosingFocus($searchBox);
    },

    _panelItemStarred: function () {
        return false;
    },

    _panelItemSaved: function (args) {
        var me = this;
        me.performTenancySave(args);
    },

    _panelItemUndone: function (args) {
        var me = this;

        var isSelectedItem = args.$item.hasClass('on');
        var id = parseInt(args.$item.attr('data-id'));

        //If this was a new record (unsaved), clear the details section.
        if (id == 0) {
            me.$root
                .find('.content-container > .content[data-id="detail"]')
                .empty();
        }

        //If this is the selected item, remove dirty flag.
        if (isSelectedItem) me.tenancyDetails.setDirty(false);

        //Remove the item from local storage.
        shell.cache.del(C.ModelType.Tenancy, id);

        args.$item.addClass('tag-do-not-persist');

        gmgps.cloud.helpers.user.deleteUnsavedData(
            C.ModelType.Tenancy,
            id,
            function () {
                $.jGrowl('Changes to tenancy were undone.', {
                    header: 'Undo Changes',
                    theme: 'growl-tenancy'
                });
                args.onSuccess();
                me.onCounterChangeRequested.raise(me.getUnsavedRecordCount());
            }
        );

        return false;
    },

    applyPanelFilters: function (args) {
        if (args.$panelItem.find('#Branches').length === 1) {
            var branchId = parseInt(args.$panelItem.find('#Branches').val());

            args.search.BranchIdList = branchId === 0 ? [] : [branchId];
        }

        return args.search;
    }
};
