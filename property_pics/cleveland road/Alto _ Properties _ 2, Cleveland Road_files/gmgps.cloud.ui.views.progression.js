gmgps.cloud.ui.views.progression = function (args) {
    var me = this;
    me.cfg = args;
    me.$root = args.$root;
    me.settings = {
        historyEventId: 0,
        chainLinkId: 0
    };
    me.apiService = args.apiService || new gmgps.cloud.services.ApiService();

    me.onSearchBoxFocusRequest = new gmgps.cloud.common.event();
    me.onViewModeChanged = new gmgps.cloud.common.event();
    me.tds = new gmgps.cloud.helpers.tds.ReceiptHandler();

    me.navPlumb = jsPlumb.getInstance();
    me.propertyPlumb = jsPlumb.getInstance();

    me.init(args);

    return this;
};

gmgps.cloud.ui.views.progression.prototype = {
    init: function () {
        var me = this;
        
        me.viewMode = me.$root.find('#ViewMode').val();

        //Window > Resize
        $(window).resize(function () {
            me.navPlumb.repaintEverything();
            me.propertyPlumb.repaintEverything();
        });

        //Panel
        me.panel = new gmgps.cloud.ui.controls.NavigablePanel({
            $root: me.$root.find('.panel[data-id="progression"]'),
            defaultTitle: 'Progressions',
            entityType: 'progression',
            defaultLayer: 'list'
        });

        me.initHandlers();

        //Select the first item in the list.
        me.setViewMode(me.cfg.viewMode);

        //Click the server-applied selection (one-time operation)
        setTimeout(function () {
            me.panel.selectDefaultItem();
        }, 100);

        //Setup toolbar.
        me.setupToolbar('list');

        me.searchSalesTipsHtml = me.$root
            .parent()
            .find('#search-sales-progression-tips-container')
            .html();
        me.searchLettingsTipsHtml = me.$root
            .parent()
            .find('#search-lettings-progression-tips-container')
            .html();
    },

    initHandlers: function () {
        //Note that live handers are initalised here for all sections.
        // - The only init we need to perform as the individual sections are updated, are those such as .tabs(), etc.
        var me = this;

        me.panel.onPanelItemClicked.handle(function (args) {
            me._panelItemClicked(args);
        });
        me.panel.onPanelItemFilterChanged.handle(function ($item) {
            me._onPanelItemFilterChanged($item);
        });

        //disable negotiator role, if the All negotiators is selected.
        me.panel.$root
            .find("select[data-dataname*='negotiatorRoles']")
            .prop('disabled', true);
        me.panel.$root
            .find("select[data-dataname*='negotiatorRoles']")
            .next('.customStyleSelectBox')
            .addClass('locked');

        me.panel.$root.on(
            'change',
            "select[data-dataname*='negotiators']",
            function () {
                var dataValue = $.parseJSON($(this).val());
                if (parseInt(dataValue.id) > 0) {
                    $(this)
                        .closest('tbody')
                        .find("select[data-dataname*='negotiatorRoles']")
                        .prop('disabled', false);
                    $(this)
                        .closest('tbody')
                        .find("select[data-dataname*='negotiatorRoles']")
                        .next('.customStyleSelectBox')
                        .removeClass('locked');
                } else {
                    $(this)
                        .closest('tbody')
                        .find("select[data-dataname*='negotiatorRoles']")
                        .prop('disabled', true);
                    $(this)
                        .closest('tbody')
                        .find("select[data-dataname*='negotiatorRoles']")
                        .next('.customStyleSelectBox')
                        .addClass('locked');
                }
            }
        );

        // Landlord > Email click
        me.$root.on('click', '.email-link[data-action="create"]', function (e) {
            var category = $(e.target).attr('ga-category');
            gmgps.cloud.helpers.general.createEmail({
                contactIds: $(this)
                    .closest('[data-contactid]')
                    .attr('data-contactid'),
                propertyId: $(this)
                    .closest('[data-propertyid]')
                    .attr('data-propertyid'),
                category: category
            });
        });

        // Landlord > Email hover
        me.$root.on('mouseover', '.email-link', function () {
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
        });

        //Node > Click
        me.$root.on('click', '.chain-browser #nav .node', function (e) {
            //Exit early if a node terminal, edit or delete button triggered the click.
            if (
                $(e.target).hasClass('terminal') ||
                $(e.target).hasClass('delete-button') ||
                $(e.target).hasClass('edit-button')
            ) {
                return false;
            }

            var historyEventId = parseInt($(this).attr('data-historyEventId'));
            var chainLinkId = parseInt($(this).attr('data-chainLinkId'));

            //For chain links, get the property and transaction section for this historyEventId.  Otherwise, display message (associated property).
            if (chainLinkId > 0) {
                //Set the selected node.
                me.$root
                    .find('.chain-browser #nav .node.selected')
                    .removeClass('selected');
                $(this).addClass('selected');

                //Display the delete and edit buttons for the selected node (if applicable).
                me.$root
                    .find('.node .delete-button, .node .edit-button')
                    .hide();
                me.$root
                    .find(
                        '.node.selected .delete-button, .node.selected .edit-button'
                    )
                    .show();

                //Display the "extra" terminal nodes.
                me.$root.find('.node .terminal.extra').hide();
                me.$root.find('.node.selected .terminal.extra').show();

                //Get the property and transaction section for this historyEventId.
                me.getChainBrowserPropertyAndTransaction(
                    historyEventId,
                    chainLinkId
                );
            } else {
                //Associated property (owned by vendor who's property is in the chain).
                showInfo(
                    'This property is displayed in the chain because it is owned by a vendor who is in the chain, but it is not part of the chain itself.'
                );
            }
        });

        //Node.Terminal > Click
        me.$root.on('click', '.chain-browser #nav .terminal', function () {
            var $node = $(this).closest('.node');
            var direction = $(this).attr('data-direction');
            var isUnknownProperty = $node.hasClass('unknown');

            //Post-op func to show the add node form.
            var after = function (marketedByUs) {
                me.showNodeForm(
                    parseInt($node.attr('data-chainLinkId')),
                    parseInt(direction),
                    $node,
                    marketedByUs,
                    false
                );
            };

            //If the clicked node relates to an unknown property, ask whether the new node is for an external property or not.
            if (
                isUnknownProperty ||
                me.viewMode == C.ProgressionDetailViewMode.Offer
            ) {
                showDialog({
                    type: 'question',
                    title: 'Add Property/Purchaser to Chain',
                    msg: 'Who is marketing the property to add to this chain?',
                    buttons: {
                        'Marketed by us': function () {
                            $(this).dialog('close');
                            after(true);
                        },
                        'Externally Marketed': function () {
                            $(this).dialog('close');
                            after(false);
                        },
                        Cancel: function () {
                            $(this).dialog('close');
                        }
                    }
                });
            } else {
                //The clicked node does not relate to an unknown property.  Only an unknown property can be added.
                after(false);
            }
        });

        //Node.Delete Button > Click
        me.$root.on('click', '.chain-browser #nav .delete-button', function () {
            var $node = $(this).closest('.node');
            var chainLinkId = parseInt($node.attr('data-chainLinkId'));

            showDialog({
                type: 'question',
                title: 'Remove Property from Chain?',
                msg:
                    'Are you sure you would you like to remove ' +
                    $node.find('.label').text() +
                    ' from the chain?',
                buttons: {
                    Remove: function () {
                        $(this).dialog('close');
                        me.removeNode(chainLinkId, function () {
                            me.refresh();
                        });
                    },
                    Cancel: function () {
                        $(this).dialog('close');
                    }
                }
            });
        });

        //Node.Edit Button > Click (external properties only)
        me.$root.on('click', '.chain-browser #nav .edit-button', function () {
            var $node = $(this).closest('.node');
            var isUnknownProperty = $node.hasClass('unknown');

            me.showNodeForm(
                parseInt($node.attr('data-chainLinkId')),
                C.Direction.Unspecified,
                $node,
                !isUnknownProperty,
                true
            );
        });

        //ChainBrowser Close Button > Click
        me.$root.on('click', '#chain-browser-close-button', function () {
            // This is used for back button when user lands directly in progression details origin "direct-url"
            // Navigate to new MFE progression screen (sales progression only)
            var appDomain = document.getElementById('_AppDomain');
            // Use the property record type to determine progression type
            // Currently we only want to navigate to sales progression in the new MFE as not everyone has ALP enabled
            var isSale = me.settings.propertyRecordType === C.PropertyRecordType.Sale;
            
            if (appDomain && appDomain.value && isSale ) {
                // Navigate to new MFE - don't call closeChainBrowser as we're leaving the page
                // rolled back change due to performace issues on the new MFE
                // TODO once sorted, revert this to window.location.href
                alto.router.navigationChanged('progression');
                me.closeChainBrowser();
                //window.location.href = appDomain.value + '/sales-progression';
            } else {
                // Fallback if _AppDomain is not available / it is a lettings progression
                alto.router.navigationChanged('progression');
                me.closeChainBrowser();
            }
        });

        //Add Note Button > Click
        me.$root.on('click', '#add-note-button', function () {
            me.addNote(me.getTransactionHistoryEventId());
        });

        //Property > Link (to property record)
        if (me.viewMode != C.ProgressionDetailViewMode.Offer) {
            me.$root.on(
                'click',
                '#property-container .property-agent',
                function () {
                    var id = parseInt(
                        $(this)
                            .closest('#property')
                            .find('#ChainLinkListItem_PropertyId')
                            .val()
                    );
                    if (id != 0) {
                        gmgps.cloud.helpers.property.editProperty({
                            id: id
                        });
                    }
                }
            );

            //Contact > Link (to contact record)
            me.$root.on(
                'click',
                '#property-container .property-contact',
                function () {
                    var id = parseInt($(this).attr('data-contactId'));
                    if (id != 0) {
                        gmgps.cloud.helpers.contact.editContact({
                            id: id
                        });
                    }
                }
            );
        }

        //Note > Click
        me.$root.on(
            'click',
            '#transaction .transaction-note-listitem.editable',
            function () {
                var historyEventId = parseInt($(this).attr('data-id'));
                me.editNote(historyEventId);
            }
        );

        //Exchange/Complete date estimate changes.
        me.$root.on(
            'change',
            '#transaction .target-date, #transaction .review-date',
            function () {
                var unknownPropertyMode =
                    me.$root.find('#transaction #UnknownPropertyMode').val() ==
                    'True';

                var reviewDate = me.$root
                    .find('#transaction .review-date')
                    .val();
                var exchangeDate = me.$root
                    .find(
                        '#transaction #target-dates .target-date[data-typeId="{0}"]'.format(
                            C.EventSubType.ContractsExchanged
                        )
                    )
                    .val();
                var completeDate =
                    me.settings.propertyRecordType == C.PropertyRecordType.Sale
                        ? me.$root.find(
                              '#transaction #target-dates .target-date[data-typeId="{0}"]'.format(
                                  C.EventSubType.PropertySaleCompleted
                              )
                          )
                        : me.$root.find(
                              '#transaction #target-dates .target-date[data-typeId="{0}"]'.format(
                                  C.EventSubType.PropertyLet
                              )
                          );

                var completeDateValue = completeDate.val();

                //If either of the dates come back as undefined, then they're hidden in the UI.  So that we don't trash any
                //  previous exchange/completion estimates, we'll pick them up from the hidden counterpart inputs.
                if (exchangeDate === undefined) {
                    exchangeDate = unknownPropertyMode
                        ? me.$root
                              .find(
                                  '#transaction #target-dates #ChainLink_ExchangeTargetDate'
                              )
                              .val()
                        : me.$root
                              .find(
                                  '#transaction #target-dates #AgreedOffer_ExchangeTargetDate'
                              )
                              .val();
                }

                if (completeDateValue === undefined) {
                    completeDateValue = unknownPropertyMode
                        ? me.$root
                              .find(
                                  '#transaction #target-dates #ChainLink_CompletionTargetDate'
                              )
                              .val()
                        : me.$root
                              .find(
                                  '#transaction #target-dates #AgreedOffer_CompletionTargetDate'
                              )
                              .val();
                }

                var id = unknownPropertyMode
                    ? parseInt(me.$root.find('#ChainLink_Id').val())
                    : parseInt(
                          me.$root
                              .find('#transaction #OriginatingEventId')
                              .val()
                      );

                // prevent vacate target date from being set to blank in pm

                if (shell.pmInstalled) {
                    var isNewDateValid = moment(
                        completeDateValue,
                        'DD/MM/YYYY',
                        true
                    ).isValid();
                    var previousTargetDate =
                        completeDate.attr('data-existingdate');

                    if (!completeDateValue || !isNewDateValid) {
                        if (previousTargetDate) {
                            completeDate.val(previousTargetDate);
                            completeDateValue = previousTargetDate;
                        }
                    } else {
                        completeDate.attr(
                            'data-existingdate',
                            completeDateValue
                        );
                    }
                }

                //Send dates
                new gmgps.cloud.http("progression-initHandlers").ajax({
                    args: {
                        id: id,
                        reviewDate: reviewDate,
                        exchangeTargetDate: exchangeDate,
                        completionTargetDate: completeDateValue,
                        unknownProperty: unknownPropertyMode
                    },
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: '/progression/updatetargetdates'
                });
            }
        );

        //Send E-Mail Button > Click
        me.$root.on('click', '#send-email-button', function () {
            var category = $(this).attr('ga-category');
            // get contactId's of parties
            new gmgps.cloud.http("progression-initHandlers").ajax(
                {
                    args: {
                        id: me.$root
                            .find(
                                '#transaction-container #transaction #ChainLink_Id'
                            )
                            .val()
                    },
                    complex: true,
                    dataType: 'json',
                    type: 'get',
                    url: '/progression/GetChainLinkContactIdList'
                },
                function (response) {
                    var contactIds = [];
                    for (var it = 0; it < response.Data.length; ++it) {
                        contactIds.push(response.Data[it].ContactId);
                    }

                    gmgps.cloud.helpers.general.createEmail({
                        contactIds: contactIds,
                        contactList: response.Data,
                        category: category,
                        historyEventId: me.getTransactionHistoryEventId(),
                        propertyId: parseInt(
                            me.$root.find('#ChainLinkListItem_PropertyId').val()
                        ),
                        isUpdateLastContactedDateVisible: true,
                        onComplete: function () {},
                        placeOnQueue: true,
                        showFrom: false,
                        showEmptySubject: true,
                        showDirectRecipientType: true,
                        addContactsWithoutEmail: false
                    });
                }
            );
        });

        //Send SMS Button > Click
        me.$root.on('click', '#send-sms-button', function () {
            // get contactId's of parties
            new gmgps.cloud.http("progression-initHandlers").ajax(
                {
                    args: {
                        id: me.$root
                            .find(
                                '#transaction-container #transaction #ChainLink_Id'
                            )
                            .val()
                    },
                    complex: true,
                    dataType: 'json',
                    type: 'get',
                    url: '/progression/GetChainLinkContactIdList'
                },
                function (response) {
                    gmgps.cloud.helpers.general.getSMSMessager({
                        title: 'Send SMS',
                        settings: {
                            contactIdList: response.Data,
                            originatingEventCategory: C.EventCategory.History,
                            originatingEventId:
                                me.getTransactionHistoryEventId()
                        },
                        onComplete: function () {}
                    });
                }
            );
        });

        //FollowUp.Datebox > Click
        me.$root.on(
            'click',
            '#transaction .followup-row .datebox',
            function () {
                var $row = $(this).closest('tr');
                var id = parseInt($row.attr('data-id'));
                var title = $row.find('.description').text();
                var followUpType = $(this)
                    .closest('table')
                    .data('followuptype');

                gmgps.cloud.helpers.followUp.editFollowUp(
                    id,
                    followUpType,
                    title
                );
            }
        );

        //Add Custom Task button(s) > Click
        me.$root.on('click', '#transaction .custom-task-button', function () {
            var followUpTypeId = parseInt($(this).attr('data-followUpTypeId'));

            //Prompt to create the custom task.
            me.createFollowUp({
                historyEventId: parseInt(
                    $('#transaction #OriginatingEventId').val()
                ),
                type: followUpTypeId
            });
        });

        //Edit Tenancy Button > Click
        me.$root.on('click', '.edit-tenancy-button', function () {
            var tenancyId = parseInt($(this).attr('data-id'));
            var enforceFields = parseInt($(this).attr('data-enforce-fields'));
            var chainlinkId = parseInt(
                me.$root.find('#transaction #ChainLink_Id').val()
            );

            gmgps.cloud.helpers.tenancy.editTenancy(
                tenancyId,
                enforceFields,
                false,
                false,
                null,
                null,
                chainlinkId,
                function () {
                    Q(
                        new gmgps.cloud.http("progression-initHandlers").ajax({
                            url: 'Progression/ClearCache',
                            args: {
                                groupId: $('#Tenancy_GroupId').val(),
                                chainLinkId: chainlinkId
                            },
                            type: 'post',
                            dataType: 'json'
                        })
                    ).then(function () {
                        me._onPanelItemFilterChanged({ $root: me.$root });
                    });
                }
            );
        });

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

        me.$root.on(
            'click',
            '#deposit-info.info, #deposit-info.fa-warning',
            function () {
                me.setDepositWarningStatus();

                new gmgps.cloud.ui.controls.window({
                    title: 'Deposit Information',
                    windowId: 'tenancyDepositInfoModal',
                    $content: me.$root.find('.deposit-popup'),
                    width: 400,
                    draggable: true,
                    modal: true,
                    cancelButton: 'Close',
                    onAction:
                        me.onComplete ||
                        function () {
                            return false;
                        },
                    onCancel:
                        me.onComplete ||
                        function () {
                            return false;
                        }
                });
            }
        );

        //Open microfrontend app 'tenant-referencing'
        me.$root.on(
            'click',
            '.start-tenant-referencing-button:not(.disabled)',
            function () {
                var tenancyId = parseInt($(this).attr('data-id'));
                var historyEventId = parseInt(
                    $(this).attr('data-historyeventid')
                );

                $.ajax({
                    type: 'GET',
                    url: '/TenancyReferencing/GetTenantReferencingAppsUrl',
                    async: true,
                    cache: false,
                    dataType: 'json',
                    headers: {
                        'X-Component-Name': 'progression-GetTenantReferencingAppsUrl',
                        'Alto-Version': alto.version
                    },
                    success: function (response) {
                        googleAnalytics.sendEvent(
                            'progression',
                            'button_click',
                            'start_tenant_referencing_check'
                        );

                        window.location.href =
                            response.url + `${tenancyId}/${historyEventId}`;
                    }
                });
            }
        );
    },

    closeChainBrowser: function (instant) {
        var me = this;

        try {
            if (instant) {
                me.$root.find('.content-container[data-id="primary"]').show();
                me.$root.find('.content-container[data-id="secondary"]').hide();
            } else {
                me.$root.find('.content-container[data-id="primary"]').show();
                me.$root.find('.content-container[data-id="secondary"]').hide();
            }
            me.setupToolbar('list');
        } catch (e) {
            console.log(e);
        }
    },

    activate: function (section) {
        var me = this;

        me.section = section;

        var $item = me.$root.find('[data-unique-id="{0}"]'.format(me.section));

        var $button = $item.find('.button');
        $button.trigger('prog-click');
    },

    // This is being used by router when chain details is accessed directly
    showProgression: function (secondaryId) {
        let me = this;
        me.settings.origin = "direct-url";
        
        //Hide the primary view (list) and show the secondary view (chain browser/detail).
        me.$root.find('.content-container[data-id="primary"]').fadeOut();
        me.$root.find('.content-container[data-id="secondary"]').fadeIn();
        me.getProgressionDetail(secondaryId);
    },

    setupToolbar: function (layer) {
        var me = this;

        //Fetch the status.
        var progressionType = parseInt(
            me.$root.find('#transaction #ProgressionType').val()
        );
        var agreedOfferStatus = parseInt(
            me.$root.find('#transaction #AgreedOffer_StatusId').val()
        );
        var tenancyEventStatus = parseInt(
            me.$root.find('#transaction #TenancyEvent_StatusId').val()
        );
        var unknownPropertyMode =
            me.$root.find('#transaction #UnknownPropertyMode').val() === 'True';

        var items = null;

        var $tb = $('#toolbar .group[data-group="progression"]');
        $tb.find('.contextual-section').hide();

        $tb.find('div.btn').hide();

        //todo:  hide exchange until both parties marked "ready to exchange"

        //Actions
        var $b = $tb.find('div[data-id="action"]');
        $b.show().find('.item').hide();

        // This needs to return the offer.
        me.showViewOfferButton($tb);

        if (me.settings.propertyRecordType == C.PropertyRecordType.Rent) {
            me.showNewLettingsProgressionButton($tb);
        }
        me.showPrintNotesButton($tb);

        switch (progressionType) {
            case C.ModelType.AgreedOffer:
                if (
                    me.settings.propertyRecordType == C.PropertyRecordType.Sale
                ) {
                    switch (agreedOfferStatus) {
                        case C.AgreedOfferStatus.InProgress:
                            items = [
                                'exchange',
                                'renegotiate',
                                'withdrawal-vendor',
                                'withdrawal-purchaser',
                                'contract-race-lost',
                                'externally-sold',
                                'under-offer-marketing',
                                'under-offer-available',
                                'under-offer-sstc',
                                'change-pipeline-status'
                            ];
                            break;
                        case C.AgreedOfferStatus.Exchanged:
                            items = [
                                'revert-to-inprogress',
                                'complete',
                                'failed',
                                'change-pipeline-status'
                            ];
                            break;
                        case C.AgreedOfferStatus.VendorWithdrew:
                            items = [
                                'revert-to-inprogress',
                                'change-pipeline-status'
                            ];
                            break;
                        case C.AgreedOfferStatus.BuyerWithdrew:
                            items = [
                                'revert-to-inprogress',
                                'change-pipeline-status'
                            ];
                            break;
                        case C.AgreedOfferStatus.FailedToComplete:
                            items = [
                                'revert-to-inprogress',
                                'change-pipeline-status'
                            ];
                            break;
                        case C.AgreedOfferStatus.ContractRaceLost:
                            items = [
                                'revert-to-inprogress',
                                'change-pipeline-status'
                            ];
                            break;
                        case C.AgreedOfferStatus.Completed:
                            items = [
                                'revert-to-exchanged',
                                'change-pipeline-status'
                            ];
                            break;
                        default:
                            break;
                    }
                } else if (
                    me.settings.propertyRecordType == C.PropertyRecordType.Rent
                ) {
                    switch (agreedOfferStatus) {
                        case C.AgreedOfferStatus.InProgress:
                            items = [
                                'withdrawal-landlord',
                                'withdrawal-applicant',
                                'externally-let',
                                'let-agreed',
                                'complete-rent',
                                'failed-rent'
                            ];

                            if (shell.pmInstalled) {
                                items.push('initial-charges-rent');
                            }

                            break;
                        case C.AgreedOfferStatus.LandlordWithdrew:
                            items = [];
                            break;
                        case C.AgreedOfferStatus.ApplicantWithdrew:
                            items = [];
                            break;
                        case C.AgreedOfferStatus.FailedToLet:
                            items = [];
                            break;
                        case C.AgreedOfferStatus.Let:
                            items = [];
                            if (!shell.pmInstalled) {
                                items.push('revert-to-inprogress-rent');
                            }
                            break;
                        default:
                            break;
                    }
                }
                break;

            case C.ModelType.TenancyEvent:
                switch (tenancyEventStatus) {
                    case C.TenancyEventStatus.RenewalInProgress:
                        items = ['complete-renewal', 'failed-renewal'];
                        break;
                    case C.TenancyEventStatus.RenewalComplete:
                        items = []; // no revert allowed
                        break;
                    case C.TenancyEventStatus.VacateInProgress:
                        items = ['vacate-complete', 'failed-vacate'];
                        break;
                    case C.TenancyEventStatus.VacateComplete:
                        items = ['revert-to-inprogress-vacate'];
                        break;
                }

                break;
        }
        $tb.find('div[data-id="action"] li').hide();

        //Display available actions.
        if (items) {
            $.each(items, function (i, v) {
                $b.find('.item[data-id="' + v + '"]').show();
            });
        }

        if (!unknownPropertyMode) {
            $tb.find('.' + layer).show();
        }

        if (shell.pmInstalled) {
            shell.uiPermissions.menuItemPermissions($tb);
        }

        var $sb = $tb.find('div.search-box');
        layer === 'detail' ? $sb.hide() : $sb.show();
    },

    showViewOfferButton: function (toolbar) {
        var viewOfferButton = toolbar.find('div[data-id="offer"]');

        if (viewOfferButton.length > 0) {
            viewOfferButton.show();
        }
    },

    showNewLettingsProgressionButton: function (toolbar) {
        var alpButton = toolbar.find('div[data-id="new-lettings-progression"]');
        if (alpButton.length > 0) {
            alpButton.show();
        }
    },

    showPrintNotesButton: function (toolbar) {
        var printNotesButton = toolbar.find('div[data-id="print-notes"]');

        if (printNotesButton.length > 0) {
            printNotesButton.show();
        }
    },

    updateSearchPlaceholder: function () {
        var me = this;

        var placeholder =
            me.settings.propertyRecordType == C.PropertyRecordType.Rent
                ? 'Search Lettings...'
                : 'Search Sales...';

        var $input = me.shell.$root.find(
            ".group[data-group='progression'] .placeholder"
        );

        $input.attr('placeholder', placeholder);
        $input.attr('data-recordtypeid', me.settings.propertyRecordType);
        $input.attr('data-id', me.settings.listGroupType);
        $input.attr('data-status', me.settings.status);
    },

    addNote: function (historyEventId) {
        gmgps.cloud.helpers.general.createNote({
            title: 'Add Transaction Note',
            settings: {
                noteSource: C.NoteSourceType.SalesProgression,
                allowPartiesToBeAdded: false,
                originatingEventId: historyEventId,
                originatingEventCategory: C.EventCategory.History,
                originatingEventPartiesToImport: [
                    { Key: C.ModelType.Property, Value: [0] },
                    { Key: C.ModelType.Tenancy, Value: [0] },
                    { Key: C.ModelType.Contact, Value: [0] },
                    { Key: C.ModelType.UnknownProperty, Value: [0] },
                    { Key: C.ModelType.UnknownContact, Value: [0] }
                ]
            },
            onComplete: function () {}
        });
    },

    connectNavNodes: function () {
        var me = this;

        //Get a fresh plumb instance.
        me.navPlumb = jsPlumb.getInstance();

        //Setup plumbs.
        me.navPlumb.Defaults.Container = me.$root.find('.chain-browser #nav');

        me.navPlumb.importDefaults({
            Connector: ['Bezier', { curviness: 50 }],
            DragOptions: { cursor: 'pointer', zIndex: 2000 },
            PaintStyle: { strokeStyle: '#909090', lineWidth: 4 },
            EndpointStyle: {
                radius: 1,
                strokeStyle: '#4d4d4d',
                fillStyle: '#4d4d4d'
            },
            HoverPaintStyle: { strokeStyle: '#e73738' },
            EndpointHoverStyle: { fillStyle: '#ec9f2e' },
            Anchors: ['TopCenter', 'BottomCenter']
        });

        //Loop through each node, connecting it to other nodes for which connections need to be made.
        me.$root.find('.chain-browser #nav .node').each(function (i, node) {
            var $node = $(node);
            var thisId = parseInt($node.attr('data-chainLinkId'));
            var fromIds = $node.attr('data-fromIds').split(',');

            $.each(fromIds, function (j, fromId) {
                if (fromId !== '') {
                    //Connect the source node to the target node (south to north).
                    me.navPlumb.connect({
                        source: 'chain-browser-nav-node-' + fromId,
                        target: 'chain-browser-nav-node-' + thisId,
                        connector: me.getNodeConnector(
                            'chain-browser-nav-node-' + fromId,
                            'chain-browser-nav-node-' + thisId
                        ),
                        overlays: [
                            [
                                'Arrow',
                                {
                                    width: 11,
                                    length: 11,
                                    location: 0.5,
                                    direction: 1,
                                    foldback: 1,
                                    paintStyle: {
                                        strokeStyle: '#d72728',
                                        fillStyle: '#d72728'
                                    }
                                }
                            ]
                        ]
                    });

                    //Get the north terminal of the source node and the south terminal of the target node, convert them into the smaller "extra" terminals.
                    var $north = me.$root.find(
                        '#chain-browser-nav-node-' + fromId + ' .north-terminal'
                    );
                    var $south = me.$root.find(
                        '#chain-browser-nav-node-' + thisId + ' .south-terminal'
                    );

                    $north
                        .addClass('extra')
                        .attr(
                            'title',
                            'Add a property to the chain for an additional vendor of ' +
                                $north.attr('data-label')
                        );
                    $south
                        .addClass('extra')
                        .attr(
                            'title',
                            'Add a property to the chain for additional purchaser of ' +
                                $north.attr('data-label')
                        );
                }
            });
        });

        //Connect any remaining terminals to their nodes.
        me.connectTerminalsToNodes(
            me.navPlumb,
            me.$root.find('#chain-browser')
        );
    },

    connectTerminalsToNodes: function (plumb, $root) {
        //Connect any remaining (visible) terminals to their nodes.
        $root
            .find('.north-terminal:visible')
            .not('.extra')
            .each(function (i, terminal) {
                plumb.connect({
                    source: $(terminal).closest('.node').attr('id'),
                    target: $(terminal).attr('id'),
                    connector: ['Straight'],
                    anchor: ['TopCenter', 'BottomCenter'],
                    overlays: [
                        [
                            'Arrow',
                            {
                                cssClass: 'arrow',
                                width: 11,
                                length: 11,
                                location: 0.5,
                                direction: 1,
                                foldback: 1,
                                paintStyle: {
                                    strokeStyle: '#d72728',
                                    fillStyle: '#d72728'
                                }
                            }
                        ]
                    ],
                    paintStyle: { strokeStyle: '#4d4d4d', lineWidth: 4 }
                });
            });
        $root
            .find('.south-terminal:visible')
            .not('.extra')
            .each(function (i, terminal) {
                plumb.connect({
                    source: $(terminal).attr('id'),
                    target: $(terminal).closest('.node').attr('id'),
                    connector: ['Straight'],
                    someData: 'st-' + $(terminal).attr('id'),
                    anchor: ['TopCenter', 'BottomCenter'],
                    overlays: [
                        [
                            'Arrow',
                            {
                                cssClass: 'arrow',
                                width: 11,
                                length: 11,
                                location: 0.5,
                                direction: 1,
                                foldback: 1,
                                paintStyle: {
                                    strokeStyle: '#d72728',
                                    fillStyle: '#d72728'
                                }
                            }
                        ]
                    ],
                    paintStyle: { strokeStyle: '#4d4d4d', lineWidth: 4 }
                });
            });
    },

    connectPropertyNodes: function (plumb, $root) {
        var me = this;

        var propertyElementId = $root
            .find('#property-row .property-agent')
            .attr('id');

        //Connect buyers to property.
        $root.find('#buyers-row .property-contact').each(function (i, node) {
            plumb.connect({
                source: $(node).attr('id'),
                target: propertyElementId,
                connector: me.getNodeConnector(
                    propertyElementId,
                    $(node).attr('id')
                )
            });
        });

        //Connect property to sellers.
        $root.find('#sellers-row .property-contact').each(function (i, node) {
            plumb.connect({
                source: propertyElementId,
                target: $(node).attr('id'),
                connector: me.getNodeConnector(
                    propertyElementId,
                    $(node).attr('id')
                )
            });
        });

        //todo - connect buyers/sellers to edge.
    },

    clearSearchResults: function () {
        var me = this;

        me.$root.find(
            '.content-container > .content[data-id="list"]'
        )[0].innerHTML =
            me.settings.propertyRecordType === C.PropertyRecordType.Sale
                ? me.searchSalesTipsHtml
                : me.searchLettingsTipsHtml;
    },

    displayList: function (
        response,
        $panelItem,
        ids,
        listSelectionMode,
        query
    ) {
        var me = this;

        me.$root
            .find('.content-container > .content[data-id="list"]')
            .clear()
            .html(response.Data);

        me.list = new gmgps.cloud.ui.controls.list({
            $root: me.$root.find(
                '.content-container > .content[data-id="list"]'
            ),
            ids: ids,
            listSelectionMode: listSelectionMode,
            selectedItemName: 'Tenancy',
            selectedItemPluralName: 'Tenancies',
            searchString: query
        });

        me.list.onDetailsRequest.handle(function (args) {
            me.settings.origin = "list";
            me._onDetailsRequest(args);
        });

        me.list.onPageRequest.handle(function (args) {
            me._onPageRequest(args);
        });
    },

    editNote: function (historyEventId) {
        gmgps.cloud.helpers.general.editNote({
            title: 'Amend Transaction Note',
            settings: {
                allowEdit: true,
                historyEventId: historyEventId
            },
            onComplete: function () {
                //signal here?
            }
        });
    },

    _onPanelItemFilterChanged: function (item) {
        var me = this;

        //Fetch the status selection from the side panel item and create a converted (sale/rent) status list.
        var statusId = parseInt(item.$root.find('#Status').val());
        var statusList =
            me.getAgreedOfferStatusListFromChainLinkStatus(statusId);
        var tenancyStatus =
            me.getTenancyEventStatusFromChainLinkStatus(statusId);

        var propertyBranchId = parseInt(
            item.$root.find('#Property_Branch').val()
        );

        var negotiator = item.$root.find('#Negotiator').val();
        if (negotiator && negotiator.indexOf('{') !== -1) {
            var negotiatorId = parseInt(jQuery.parseJSON(negotiator).id);
        }

        var negotiatorRole = parseInt(item.$root.find('#Neg__Role').val());

        //Modify the last search to include the status and reset to the first page.
        var args = me.lastSearchArgs;
        args.search.StatusList = statusList;
        args.search.TenancyStatusList = tenancyStatus;
        args.search.SearchPage = {
            Index: 1,
            Size: C.SearchPageSize.Default
        };

        args.search.NegotiatorId = negotiatorId;

        args.search.NegotiatorRole = negotiatorRole;
        args.search.Query = '';
        args.search.BranchIdList = [];

        if (propertyBranchId > 0) {
            args.search.PropertyBranchId = propertyBranchId;

            //filter negotiator list
            item.$root
                .find('#Negotiator option')
                .not('[value*=\'"branchId":' + propertyBranchId + "']")
                .hide();
            item.$root
                .find(
                    '#Negotiator option[value*=\'"branchId":' +
                        propertyBranchId +
                        "']"
                )
                .show();
            item.$root.find('#Negotiator option[value="0"]').show();
        } else {
            args.search.PropertyBranchId = 0;
            item.$root.find('#Negotiator option').show();
        }

        //Update list.
        me.getList(args);
    },

    getAgreedOfferStatusListFromChainLinkStatus: function (statusId) {
        //Convert a value of type ChainLinkFilterType to an array of type AgreedOfferStatus.
        var me = this;
        var x = [];
        if (me.settings.propertyRecordType == C.PropertyRecordType.Sale) {
            //Sale
            switch (statusId) {
                case C.ChainLinkFilterType.Unspecified:
                    x = [];
                    break;
                case C.ChainLinkFilterType.Current:
                    x = [
                        C.AgreedOfferStatus.InProgress,
                        C.AgreedOfferStatus.OnMarket,
                        C.AgreedOfferStatus.Exchanged
                    ];
                    break;
                case C.ChainLinkFilterType.Failed:
                    x = [
                        C.AgreedOfferStatus.VendorWithdrew,
                        C.AgreedOfferStatus.BuyerWithdrew,
                        C.AgreedOfferStatus.FailedToComplete,
                        C.AgreedOfferStatus.ContractRaceLost
                    ];
                    break;
                case C.ChainLinkFilterType.RecentlyCompleted:
                    x = [C.AgreedOfferStatus.Completed];
                    break;
            }
        } else {
            //Rent
            switch (statusId) {
                case C.ChainLinkFilterType.Unspecified:
                    x = [];
                    break;
                case C.ChainLinkFilterType.Current:
                    x = [
                        C.AgreedOfferStatus.InProgress,
                        C.AgreedOfferStatus.OnMarket
                    ];
                    break;
                case C.ChainLinkFilterType.Failed:
                    x = [
                        C.AgreedOfferStatus.ApplicantWithdrew,
                        C.AgreedOfferStatus.LandlordWithdrew,
                        C.AgreedOfferStatus.FailedToLet,
                        C.AgreedOfferStatus.ExternallyLet
                    ];
                    break;
                case C.ChainLinkFilterType.RecentlyCompleted:
                    x = [C.AgreedOfferStatus.Let];
                    break;
            }
        }
        return x;
    },

    getTenancyEventStatusFromChainLinkStatus: function (statusId) {
        var me = this;
        var x = [];

        if (me.settings.propertyRecordType == C.PropertyRecordType.Rent) {
            switch (statusId) {
                case C.ChainLinkFilterType.RenewUnspecified:
                    x = [
                        C.TenancyEventStatus.RenewalInProgress,
                        C.TenancyEventStatus.RenewalComplete,
                        C.TenancyEventStatus.RenewalCancelled
                    ];
                    break;
                case C.ChainLinkFilterType.Renewing:
                    x = [C.TenancyEventStatus.RenewalInProgress];
                    break;
                case C.ChainLinkFilterType.Renewed:
                    x = [C.TenancyEventStatus.RenewalComplete];
                    break;
                case C.ChainLinkFilterType.RenewCancelled:
                    x = [C.TenancyEventStatus.RenewalCancelled];
                    break;

                case C.ChainLinkFilterType.VacateUnspecified:
                    x = [
                        C.TenancyEventStatus.VacateInProgress,
                        C.TenancyEventStatus.VacateComplete,
                        C.TenancyEventStatus.VacateCancelled
                    ];
                    break;
                case C.ChainLinkFilterType.Vacating:
                    x = [C.TenancyEventStatus.VacateInProgress];
                    break;
                case C.ChainLinkFilterType.Vacated:
                    x = [C.TenancyEventStatus.VacateComplete];
                    break;
                case C.ChainLinkFilterType.VacateCancelled:
                    x = [C.TenancyEventStatus.VacateCancelled];
                    break;
            }
        }

        return x;
    },

    refresh: function () {
        //Refresh the entire chain browser.
        var me = this;
        me.getProgressionDetail(
            me.settings.historyEventId,
            me.settings.chainLinkId,
            me.settings.propertyRecordType
        );
    },

    refreshNav: function () {
        //Refresh the chain browser nav.
        var me = this;
        me.getChainBrowserNav(
            me.settings.historyEventId,
            me.settings.chainLinkId
        );
    },

    removeNode: function (chainLinkId, onSuccess) {
        new gmgps.cloud.http("progression-removeNode").ajax(
            {
                args: {
                    chainLinkId: chainLinkId
                },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/progression/removechainlink'
            },
            function (response) {
                var success = response.Data;
                if (success) {
                    onSuccess();
                }
            }
        );
    },

    createFollowUp: function (args) {
        var title;

        switch (args.type) {
            case C.FollowUpType.LettingsProgressionToDoItem:
                title = 'Agency';
                break;
            case C.FollowUpType.OwnerProgressionToDoItem:
                title = 'Vendor';
                break;
            case C.FollowUpType.ApplicantProgressionToDoItem:
                title = 'Purchaser';
                break;
            default:
                title = 'Follow Up';
                break;
        }

        new gmgps.cloud.ui.controls.window({
            title: 'Custom Task ({0})'.format(title),
            windowId: 'customTaskModal',
            url: '/FollowUp/CreateProgressionFollowUp',
            urlArgs: args,
            post: true,
            controller: gmgps.cloud.ui.views.followUp,
            width: 525,
            draggable: true,
            modal: true,
            actionButton: 'Save',
            cancelButton: 'Close',
            onAction: function ($f) {
                var $form = createForm($f, 'FollowUp/UpdateFollowUp');
                new gmgps.cloud.http("progression-onAction").postForm(
                    $form,
                    function (response) {
                        gmgps.cloud.helpers.followUp.manageFollowUpUpdate(
                            response.Data.FollowUp.Id,
                            response.Data.FollowUp.Type,
                            response.Data.FollowUp.LinkedType,
                            response.Data.FollowUp.LinkedId,
                            response.Data.FollowUp.Status ===
                                C.FollowUpStatus.Complete
                        );
                    }
                );
            }
        });
    },

    initProgressionDetail: function (propertyRecordType, $container) {
        var me = this;

        me.$root.find('.container').hide();
        me.$root
            .find(
                '.container[data-propertyRecordTypeId="{0}"]'.format(
                    propertyRecordType
                )
            )
            .show();
        me.$root.find('.container[data-propertyRecordTypeId="0"]').show();

        alto.router.navigationChanged('progression-details', {
            collection: 'progressions',
            id: me.settings.historyEventId
        });

        if (propertyRecordType == C.PropertyRecordType.Sale) {
            me.initChainBrowserNav();
            me.initChainBrowserProperty();
            me.initSolicitorEdit($container);
        }

        me.initChainBrowserTransaction();
        me.setDepositWarningStatus();
    },

    initChainBrowserNav: function () {
        var me = this;

        me.connectNavNodes();

        //Ensure that the edit and delete buttons for the active node is displayed (if applicable).
        me.$root.find('.node .delete-button, .node .edit-button').hide();
        me.$root
            .find('.node.selected .delete-button, .node.selected .edit-button')
            .show();

        //Add tooltips to terminals.
        me.$root.find('.terminal').qtip({
            style: { tip: true, classes: 'ui-tooltip-youtube' },
            position: {
                my: 'center left',
                at: 'center right'
            },
            show: { delay: 250 },
            viewport: $(window)
        });

        //Add tooltips to node delete buttons (these exist on nodes for external properties only).
        me.$root.find('.delete-button').qtip({
            style: { tip: true, classes: 'ui-tooltip-youtube' },
            content: 'Remove this property from the chain.',
            position: {
                my: 'center left',
                at: 'center right'
            },
            show: { delay: 250 },
            viewport: $(window)
        });

        //Add tooltips to node edit buttons (these exist on nodes for external properties only).
        me.$root.find('.edit-button').qtip({
            style: { tip: true, classes: 'ui-tooltip-youtube' },
            content: 'Amend the details of this external property.',
            position: {
                my: 'center left',
                at: 'center right'
            },
            show: { delay: 250 },
            viewport: $(window)
        });

        //Add tooltips to node inners (Owner/Applicant).
        me.$root.find('.node .inner').each(function (i, nodeInner) {
            var $node = $(nodeInner).closest('.node');

            $(nodeInner).qtip({
                content:
                    '<b>Vendor:</b><br />{0}<br /><br /><b>Purchaser:</b><br />{1}'.format(
                        $node.attr('data-owners'),
                        $node.attr('data-applicants')
                    ),
                style: { tip: true, classes: 'ui-tooltip-bootstrap' },
                position: {
                    my: 'center left',
                    at: 'center right',
                    adjust: { x: 3 }
                },
                show: { delay: 500 },
                viewport: $(window),
                mouse: true
            });
        });
    },

    initSolicitorEdit: function ($container) {
        var me = this;

        if (me.viewMode == C.ProgressionDetailViewMode.Offer) return;

        $container.find('.solicitor').on('click', function (e) {
            e.stopPropagation();
            var contactId = parseInt(
                $(e.target).closest('.property-contact').attr('data-contactid')
            );

            if (!contactId) return;
            if (!me.settings.historyEventId) return;

            new gmgps.cloud.ui.controls.window({
                title: 'Change Solicitor',
                windowId: 'changeSolicitorModal',
                controller: gmgps.cloud.ui.views.changeAgreedOfferSolicitor,
                url: 'Progression/GetProgressionChangeSolicitor',
                post: true,
                urlArgs: {
                    historyEventId: me.settings.historyEventId,
                    contactId: contactId
                },
                width: 700,
                draggable: true,
                modal: true,
                actionButton: 'Save',
                cancelButton: 'Cancel',
                onReady: function ($f, controller) {
                    if (controller != null) controller.progression = me;
                },
                onAction: function () {
                    return false;
                },
                onCancel: function () {
                    return false;
                }
            });
        });
    },

    initChainBrowserProperty: function () {
        var me = this;

        //Get a fresh plumb instance.
        me.propertyPlumb = jsPlumb.getInstance();

        //Setup plumb
        me.propertyPlumb.Defaults.Container = me.$root.find(
            '#chain-browser #property'
        );
        me.propertyPlumb.importDefaults({
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
            Anchors: ['TopCenter', 'BottomCenter'],
            ConnectionOverlays: [
                [
                    'Arrow',
                    {
                        width: 11,
                        length: 11,
                        location: 0.5,
                        direction: 1,
                        foldback: 1,
                        paintStyle: {
                            strokeStyle: '#d72728',
                            fillStyle: '#d72728'
                        }
                    }
                ]
            ]
        });

        me.connectPropertyNodes(
            me.propertyPlumb,
            me.$root.find('#chain-browser #property')
        );
    },

    initChainBrowserTransaction: function () {
        var me = this;

        //Tabs.
        me.$root.find('.tabs').tabs({
            active: me.activeTab || 0,
            activate: function (event, ui) {
                me.activeTab = ui.newTab.index();
            }
        });

        //Date pickers.
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

        // take from hidden input in case Nav Bar click has caused this refresh
        var chainLinkId = parseInt(
            me.$root.find('#transaction #ChainLink_Id').val()
        );

        //FollowUp Select
        me.$root.find('.followups').followUpDropdown({
            linkedType: C.ModelType.ChainLink,
            linkedId: chainLinkId,
            display: 'slide'
        });

        //Setup the toolbar (it is dependent on the details/status of the transaction so this is the point it is done.
        me.setupToolbar('detail');

        var progressionType = parseInt(
            me.$root.find('#transaction #ProgressionType').val()
        );

        if (progressionType == C.ModelType.AgreedOffer && me.settings.propertyRecordType == C.PropertyRecordType.Sale) {
            alto.application.events.raise('view-loaded', me.$root[0], { viewName: 'progression', type: 'detail' });
        }
    },

    getChainBrowserNav: function (historyEventId, chainLinkId) {
        //Fetch and update the nav section of the chain browser.
        var me = this;

        var $container = me.$root.find('#nav-container .inner-container');
        $container.empty();

        me.settings.historyEventId = historyEventId;
        me.settings.chainLinkId = chainLinkId;

        //Fetch nav content.
        new gmgps.cloud.http("progression-getChainBrowserNav").getView({
            url: 'Progression/GetChainBrowserNav',
            post: true,
            args: {
                historyEventId: historyEventId,
                chainLinkId: chainLinkId
            },
            onSuccess: function (response) {
                //Insert the nav content.
                $container.html(response.Data);

                me.initChainBrowserNav();
            }
        });
    },

    getChainBrowserProperty: function (historyEventId, chainLinkId) {
        //Fetch and update the property section of the chain browser.
        var me = this;

        var $container = me.$root.find('#property-container .inner-container');
        $container.empty();

        //Fetch property content (simultaneously).
        new gmgps.cloud.http("progression-getChainBrowserProperty").getView({
            url: 'Progression/GetChainBrowserProperty',
            post: true,
            args: {
                historyEventId: historyEventId,
                chainLinkId: chainLinkId
            },
            onSuccess: function (response) {
                //Insert the property content.
                $container.html(response.Data);

                me.initChainBrowserProperty();
            }
        });
    },

    getChainBrowserTransaction: function (historyEventId, chainLinkId) {
        //Fetch and update the transaction section of the chain browser.
        var me = this;

        var $container = me.$root.find(
            '#transaction-container .inner-container'
        );
        $container.empty();

        //Fetch transaction content (simultaneously).
        new gmgps.cloud.http("progression-getChainBrowserTransaction").getView({
            url: 'Progression/GetChainBrowserTransaction',
            post: true,
            args: {
                historyEventId: historyEventId,
                chainLinkId: chainLinkId
            },
            onSuccess: function (response) {
                //Insert the transaction content.
                $container.html(response.Data);

                me.initChainBrowserTransaction();
            }
        });
    },

    getChainBrowserPropertyAndTransaction: function (
        historyEventId,
        chainLinkId
    ) {
        var me = this;

        var $propertyContainer = me.$root.find(
            '#property-container .inner-container'
        );
        var $transactionContainer = me.$root.find(
            '#transaction-container .inner-container'
        );
        $propertyContainer.empty();
        $transactionContainer.empty();

        //Fetch combined property and transaction content.
        new gmgps.cloud.http(
            "progression-getChainBrowserPropertyAndTransaction"
        ).getView({
            url: 'Progression/GetChainBrowserPropertyAndTransaction',
            post: true,
            args: {
                historyEventId: historyEventId,
                chainLinkId: chainLinkId,
                viewMode: me.viewMode
            },
            onSuccess: function (response) {
                //Create a combined jquery object.
                var $combined = $('<div>' + response.Data + '</div>');

                //Extract the sectioned content and inject into existing containers.
                $propertyContainer.append(
                    $combined.find('#property-section').children()
                );
                $transactionContainer.append(
                    $combined.find('#transaction-section').children()
                );

                //Init sections.
                me.initChainBrowserProperty();
                me.initChainBrowserTransaction();
            }
        });
    },

    getProgressionDetail: function (historyEventId, chainLinkId) {
        //Show a chain in the chain browser.  HistoryEventId is the requested starting point.
        // - This will fetch the nav, property and transaction sections in one hit.
        var me = this;

        if (historyEventId !== 0) me.settings.historyEventId = historyEventId;
        if (chainLinkId !== 0) me.settings.chainLinkId = chainLinkId;

        var $container = me.$root.find('#chain-browser-container');
        if ($container.length === 0) $container = me.$root.closest('.content');
        $container.empty();

        //Fetch nav content.
        new gmgps.cloud.http("progression-getProgressionDetail").getView({
            url: 'Progression/GetProgressionDetail',
            post: true,
            args: {
                historyEventId: me.settings.historyEventId,
                chainLinkId: me.settings.chainLinkId
                    ? me.settings.chainLinkId
                    : 0,
                mode: me.viewMode
            },
            onSuccess: function (response) {
                //Insert the nav content.
                $container.html(response.Data);

                var propertyRecordType = parseInt(
                    $container
                        .find('#_ProgressionDetailPropertyRecordTypeId')
                        .val()
                );
                me.settings.propertyRecordType = propertyRecordType;

                me.initProgressionDetail(propertyRecordType, $container);
                setupTips(me.$root);
            }
        });
    },

    loadProgressionDetailWindow: function () {
        var me = this;
        var propertyRecordType = parseInt(
            me.$root.find('#_ProgressionDetailPropertyRecordTypeId').val()
        );
        me.settings.propertyRecordType = propertyRecordType;

        me.initProgressionDetail(propertyRecordType, me.$root);
        setupTips(me.$root);
    },

    getNodeConnector: function (sourceId, targetId) {
        //Return either a straight node connector or a curvy one, depending on which will look best.

        var me = this;
        var curvy = ['Bezier', { curviness: 50 }];
        var straight = ['Straight'];
        var type;

        //Get the source and target elements to be connected.
        var $source = me.$root.find('#' + sourceId);
        var $target = me.$root.find('#' + targetId);

        //See how many nodes there are on the rows for which the source and target nodes reside.
        var sourceTotal = $source.closest('.row').find('.node').length;
        var targetTotal = $target.closest('.row').find('.node').length;

        //Determine the index/position of the nodes in their rows.
        if (sourceTotal == targetTotal) {
            //Equal source and targets, use a straight connector.
            type = straight;
        } else {
            //Different source and target values, use a curvy connector.
            type = curvy;
        }

        return type;
    },

    _panelItemClicked: function (args) {
        var me = this,
            recordType;

        var id = parseInt(args.$item.attr('data-id'));

        if (id > 0) {
            recordType = parseInt(args.$item.attr('data-data'));
            me.settings.propertyRecordType = recordType;
            me.settings.$activePanel = args.$item;
        }

        me.updateSearchPlaceholder();

        switch (args.$item.attr('data-type')) {
            case 'detail':
                //switch to detail
                break;

            case 'list':
                me.$listPanelItem = args.$item;

                switch (id) {
                    case -2: //search
                        me.list.clear(); //ready to populate upon query typing.
                        me.onSearchBoxFocusRequest.raise();
                        args.onComplete();
                        break;

                    default:
                        //Get the list.
                        var category = 0;
                        var chainLinkType = C.ChainLinkType.AgreedOffer;

                        var orderby = C.SearchOrderBy.Name;
                        var ordertype = C.SearchOrderType.Ascending;
                        switch (id) {
                            case C.ProgressionGroupType.Contact:
                                category = C.ContactCategory.Client;
                                break;
                            case C.ProgressionGroupType.Solicitor:
                                orderby = C.SearchOrderBy.CompanyName;
                                category = C.ContactCategory.Solicitor;
                                break;
                            case C.ProgressionGroupType.Property:
                                orderby = C.SearchOrderBy.ReviewDate;
                                ordertype = C.SearchOrderType.Ascending;
                                break;
                            case C.ProgressionGroupType.UnknownProperty:
                                orderby = C.SearchOrderBy.ReviewDate;
                                ordertype = C.SearchOrderType.Ascending;
                                break;
                            case C.ProgressionGroupType.TenancyRenewal:
                            case C.ProgressionGroupType.VacateProperty:
                                chainLinkType = C.ChainLinkType.Tenancy;
                                break;
                        }

                        //Set the group type on the list.
                        if (id >= 0) {
                            me.settings.listGroupType = id;
                        } else {
                            me.settings.listGroupType = 0;
                        }

                        //Set the ChainLinkStatus and obtain a status list..
                        var chainLinkStatus =
                            id == C.ProgressionGroupType.UnknownProperty
                                ? C.ChainLinkFilterType.Current
                                : parseInt(args.$item.find('#Status').val());

                        me.settings.status = chainLinkStatus;

                        var statusList =
                            me.getAgreedOfferStatusListFromChainLinkStatus(
                                chainLinkStatus
                            );

                        var tenancyStatus =
                            me.getTenancyEventStatusFromChainLinkStatus(
                                chainLinkStatus
                            );

                        me.getList(
                            {
                                $panelItem: args.$item,
                                search: {
                                    ChainLinkType: chainLinkType,
                                    PropertyRecordType: recordType,
                                    StatusList: statusList,
                                    TenancyStatusList: tenancyStatus,
                                    Category: category,
                                    ListType: C.ListType.Standard,
                                    SearchPage: {
                                        Index: 1,
                                        Size: C.SearchPageSize.Default
                                    },
                                    SearchOrder: {
                                        By: orderby,
                                        Type: ordertype
                                    }
                                }
                            },
                            function () {
                                args.onComplete();
                            }
                        );

                        break;
                }
                break;
            default:
                args.onComplete();
                break;
        }
    },

    getTransactionHistoryEventId: function () {
        var me = this;

        var historyEventId = parseInt(
            me.$root
                .find('#property-row .property-agent')
                .attr('data-historyeventid')
        );

        if (!historyEventId)
            historyEventId = parseInt(me.$root.find('#HistoryEventId').val());

        return historyEventId;
    },

    updateAgreedOfferProgression: function (args) {
        var me = this;
        var agreedOfferId = me.getTransactionHistoryEventId();
        var offerId = parseInt(me.$root.find('#OriginatingEventId').val());
        var propertyId = parseInt(me.$root.find('#PropertyId').val());
        var appDomain = document.getElementById('_AppDomain');

        var tenancyId = me.$root.find('.edit-tenancy-button').data('id');

        if (args.action === 'new-lettings-progression') {
            if (appDomain && appDomain.value) {
                window.location.href = appDomain.value + '/lettings-progression/' + propertyId;
            }
            return;
        }

        if (args.action === 'print-notes') {
            me.printNotes(agreedOfferId, offerId);
            return;
        }

        if (args.action === 'offer') {
            gmgps.cloud.helpers.property.editOffer({
                id: offerId
            });

            return;
        }

        if (args.action === 'change-pipeline-status') {
            me.changeOfferPipelineStatus(offerId, agreedOfferId);
            return;
        }

        var dialogData;

        if (args.action === 'initial-charges-rent') {
            if (
                me.needToDisplayFeesOrDepositDialog(
                    C.TenancyEventStatus.RaiseInitalCharges
                )
            ) {
                dialogData = me.getFeesAndDepositWarningDialogTitles(
                    C.TenancyEventStatus.RaiseInitalCharges
                );

                showDialog({
                    type: dialogData.DialogType,
                    title: dialogData.Title,
                    msg: dialogData.Message,
                    buttons: {
                        Continue: function () {
                            $(this).dialog('close');
                            new gmgps.cloud.ui.views.systemInvoiceHandler().raiseBeforeFinalise(
                                tenancyId
                            );
                            return;
                        },
                        Cancel: function () {
                            $(this).dialog('close');
                            return;
                        }
                    }
                });

                return;
            } else {
                new gmgps.cloud.ui.views.systemInvoiceHandler().raiseBeforeFinalise(
                    tenancyId
                );
                return;
            }
        }

        var newPropertyStatus = null;

        //Determine the required action.
        var newStatus = C.AgreedOfferStatus.Unspecified;
        var changeType = C.AgreedOfferStatusChangeType.Unspecified;
        var title;

        if (me.settings.propertyRecordType == C.PropertyRecordType.Sale) {
            //Sale
            title = 'Sale Progression';
            switch (args.action) {
                case 'exchange':
                    newStatus = C.AgreedOfferStatus.Exchanged;
                    title = 'Exchanged';
                    changeType = C.AgreedOfferStatusChangeType.StatusChange;
                    break;
                case 'complete':
                    newStatus = C.AgreedOfferStatus.Completed;
                    title = 'Completed';
                    changeType = C.AgreedOfferStatusChangeType.StatusChange;
                    break;
                case 'renegotiate':
                    newStatus = C.AgreedOfferStatus.Unspecified;
                    title = 'Renegotiate Sale';
                    changeType = C.AgreedOfferStatusChangeType.Renegotiation;
                    break;
                case 'withdrawal-vendor':
                    title = 'Withdrawal by Vendor';
                    newStatus = C.AgreedOfferStatus.VendorWithdrew;
                    changeType = C.AgreedOfferStatusChangeType.StatusChange;
                    break;
                case 'withdrawal-purchaser':
                    title = 'Withdrawal by Purchaser';
                    newStatus = C.AgreedOfferStatus.BuyerWithdrew;
                    changeType = C.AgreedOfferStatusChangeType.StatusChange;
                    break;
                case 'failed':
                    title = 'Failed to Complete';
                    newStatus = C.AgreedOfferStatus.FailedToComplete;
                    changeType = C.AgreedOfferStatusChangeType.StatusChange;
                    break;
                case 'contract-race-lost':
                    title = 'Contract Race Lost';
                    newStatus = C.AgreedOfferStatus.ContractRaceLost;
                    changeType = C.AgreedOfferStatusChangeType.StatusChange;
                    break;
                case 'externally-sold':
                    title = 'Externally Sold';
                    newStatus = C.AgreedOfferStatus.Unspecified;
                    changeType =
                        C.AgreedOfferStatusChangeType.ExternallySoldOrLet;
                    break;
                case 'revert-to-inprogress':
                    title = 'Revert status to "In Progress"';
                    newStatus = C.AgreedOfferStatus.InProgress;
                    changeType = C.AgreedOfferStatusChangeType.StatusChange;
                    break;
                case 'revert-to-exchanged':
                    title = 'Revert status to "Exchanged"';
                    newStatus = C.AgreedOfferStatus.Exchanged;
                    changeType = C.AgreedOfferStatusChangeType.StatusChange;
                    break;
                case 'under-offer-available':
                    newPropertyStatus = C.SaleStatus.UnderOfferAvailable;
                    break;
                case 'under-offer-marketing':
                    newPropertyStatus = C.SaleStatus.UnderOfferMarketing;
                    break;
                case 'under-offer-sstc':
                    newPropertyStatus = C.SaleStatus.UnderOffer;
                    break;
            }
        } else {
            //Rent
            title = 'Letting Progression';
            switch (args.action) {
                case 'complete-rent':
                    newStatus = C.AgreedOfferStatus.Let;
                    title = 'Let';
                    changeType = C.AgreedOfferStatusChangeType.StatusChange;
                    break;
                case 'renegotiate-rent':
                    newStatus = C.AgreedOfferStatus.Unspecified;
                    title = 'Renegotiate Rental';
                    changeType = C.AgreedOfferStatusChangeType.Renegotiation;
                    break;
                case 'withdrawal-landlord':
                    title = 'Withdrawal by Landlord';
                    newStatus = C.AgreedOfferStatus.LandlordWithdrew;
                    changeType = C.AgreedOfferStatusChangeType.StatusChange;
                    break;
                case 'withdrawal-applicant':
                    title = 'Withdrawal by Applicant';
                    newStatus = C.AgreedOfferStatus.ApplicantWithdrew;
                    changeType = C.AgreedOfferStatusChangeType.StatusChange;
                    break;
                case 'failed-rent':
                    title = 'Failed to Let';
                    newStatus = C.AgreedOfferStatus.FailedToLet;
                    changeType = C.AgreedOfferStatusChangeType.StatusChange;
                    break;
                case 'externally-let':
                    title = 'Externally Let';
                    newStatus = C.AgreedOfferStatus.ExternallyLet;
                    changeType =
                        C.AgreedOfferStatusChangeType.ExternallySoldOrLet;
                    break;
                case 'let-marketing':
                    newPropertyStatus = C.SaleStatus.UnderOfferMarketing;
                    break;
                case 'let-agreed':
                    newPropertyStatus = C.SaleStatus.LetAgreed;
                    break;
                case 'revert-to-inprogress-rent':
                    title = 'Revert status to "In Progress"';
                    newStatus = C.AgreedOfferStatus.InProgress;
                    changeType = C.AgreedOfferStatusChangeType.StatusChange;
                    break;
            }
        }

        if (newPropertyStatus) {
            //Change the status of the sale.
            gmgps.cloud.helpers.property.setStatus({
                id: parseInt(
                    me.$root.find('#ChainLinkListItem_PropertyId').val()
                ),
                action: newPropertyStatus,
                callback: function () {
                    //This callback will fire after the new status has successfully been applied.
                    if (me.settings.chainLinkId != null)
                        me.getChainBrowserPropertyAndTransaction(
                            me.settings.historyEventId,
                            me.settings.chainLinkId
                        );
                }
            });
        } else {
            var replaceCommissionCharges = false;
            var pmFinalisingLet = false;

            // for lettings progression finalising intial let we show the tenancy once last time, to ensure all required values are set
            // but only for ALTO PM
            var after = function () {
                //Show the AgreedOffer management form.
                new gmgps.cloud.ui.controls.window({
                    title: title,
                    windowId: 'offerStatusChangeModal',
                    url: '/Progression/GetAgreedOfferStatusChange',
                    urlArgs: {
                        id: agreedOfferId,
                        newAgreedOfferStatus: newStatus,
                        changeType: changeType,
                        replaceCommissionCharges: replaceCommissionCharges
                    },
                    post: true,
                    controller: gmgps.cloud.ui.views.agreedOffer,
                    width:
                        me.settings.propertyRecordType ==
                        C.PropertyRecordType.Sale
                            ? 838
                            : 600,
                    draggable: true,
                    modal: true,
                    actionButton: 'Save',
                    cancelButton: 'Cancel',
                    onReady: function ($f, controller) {
                        me.connectPropertyNodes(controller.plumb, $f);
                    },
                    onAction: function ($f) {
                        var save = function () {
                            //Create a server-ready form.
                            var $form = createForm(
                                $f,
                                'Progression/SetAgreedOfferStatus'
                            );

                            //Close the chain browser.
                            // - #simontiger/#timesave - signalr should be used for this later, because although our screen is refreshing, others won't (though it's pretty much an edge case).
                            // - by closing the chain-browser (the lists will update), the refreshed chain browser would be shown upon next load from the list.
                            // - This #timesave also refreshes the toolbar menu items on next load.
                            // - Finally, we ask it to close instantly so that the user has time to see the row update via signalr.
                            me.closeChainBrowser(true);

                            //Update the status of the agreed offer.
                            new gmgps.cloud.http(
                                "progression-onAction"
                            ).postForm($form, function (response) {
                                var promptForLetters = function () {
                                    gmgps.cloud.helpers.general.promptForLetters(
                                        {
                                            eventHeaders:
                                                response.UpdatedEvents
                                        }
                                    );
                                };

                                if (
                                    pmFinalisingLet &&
                                    response &&
                                    response.Data
                                ) {
                                    me.finalisingPMActions(
                                        response.Data,
                                        function () {
                                            if (
                                                response.Data
                                                    .TDSTenanciesNotRegistered &&
                                                response.Data
                                                    .TDSTenanciesNotRegistered
                                                    .length === 1
                                            ) {
                                                me.tds.notifyFinalisedProcessed(
                                                    {
                                                        tenancyId:
                                                            response.Data
                                                                .TDSTenanciesNotRegistered[0]
                                                    },
                                                    function () {
                                                        promptForLetters();
                                                    }
                                                );
                                            } else {
                                                promptForLetters();
                                            }
                                        }
                                    );
                                } else {
                                    promptForLetters();
                                }
                            });
                        };

                        $f.addClass('opt-validate').validationEngine({
                            scroll: false
                        });
                        var valid = $f.validationEngine('validate');

                        if (!valid) return false;

                        var sellerIds = new Array();
                        var buyerIds = new Array();
                        if (
                            me.settings.propertyRecordType ==
                                C.PropertyRecordType.Sale &&
                            changeType ==
                                C.AgreedOfferStatusChangeType.StatusChange &&
                            newStatus == C.AgreedOfferStatus.Completed
                        ) {
                            $.each(
                                me.$root.find('#sellers-row .property-contact'),
                                function () {
                                    sellerIds.push(
                                        $(this).attr('data-contactid')
                                    );
                                }
                            );

                            $.each(
                                me.$root.find('#buyers-row .property-contact'),
                                function () {
                                    buyerIds.push(
                                        $(this).attr('data-contactid')
                                    );
                                }
                            );

                            me.showCompletedChangeAddress(
                                sellerIds,
                                buyerIds,
                                agreedOfferId,
                                save
                            );
                            return void 0;
                        }

                        if (shell.pmInstalled) {
                            if (
                                me.settings.propertyRecordType ===
                                    C.PropertyRecordType.Rent &&
                                changeType ===
                                    C.AgreedOfferStatusChangeType
                                        .StatusChange &&
                                newStatus === C.AgreedOfferStatus.Let
                            ) {
                                me.showLetChangeAddress(
                                    agreedOfferId,
                                    me.$root.find('#PropertyId').val(),
                                    function () {
                                        save(sellerIds, buyerIds);
                                    }
                                );

                                return void 0;
                            }
                        }

                        save(sellerIds, buyerIds);
                    },
                    onCancel: function ($f) {
                        $f.validationEngine('hideAll');
                    }
                });
            };

            if (
                shell.pmInstalled &&
                me.settings.propertyRecordType === C.PropertyRecordType.Rent &&
                newStatus === C.AgreedOfferStatus.Let
            ) {
                pmFinalisingLet = true;

                var presentTenancyForFinalChecks = function () {
                    gmgps.cloud.helpers.tenancy.editTenancy(
                        tenancyId,
                        true,
                        true,
                        false,
                        function (success) {
                            if (success) {
                                new gmgps.cloud.ui.views.systemInvoiceHandler().checkCommissionCharges(
                                    tenancyId,
                                    function (replace) {
                                        replaceCommissionCharges = replace;
                                        after();
                                    }
                                );
                            }
                        }
                    );
                };

                if (me.needToDisplayFeesOrDepositDialog(newStatus)) {
                    dialogData =
                        me.getFeesAndDepositWarningDialogTitles(newStatus);

                    showDialog({
                        type: dialogData.DialogType,
                        title: dialogData.Title,
                        msg: dialogData.Message,
                        buttons: {
                            Continue: function () {
                                $(this).dialog('close');
                                presentTenancyForFinalChecks();
                            },
                            Cancel: function () {
                                $(this).dialog('close');
                            }
                        }
                    });
                } else {
                    presentTenancyForFinalChecks();
                }
            } else {
                after();
            }
        }
    },

    finalisingPMActions: function (model, onComplete) {
        new gmgps.cloud.ui.views.systemInvoiceHandler().invoicingCompleted(
            model,
            onComplete
        );
    },

    updateTenancyEventProgression: function (args) {
        var me = this;
        var historyEventId =
            args.historyEventId !== undefined
                ? args.historyEventId
                : me.getTransactionHistoryEventId();
        var tenancyId = args.tenancyId || 0;
        var newStatus = C.TenancyEventStatus.Unspecified;
        var title = '';

        switch (args.action) {
            case 'change-periodic':
                title = 'New Periodic Term';
                newStatus = C.TenancyEventStatus.Periodic;
                break;

            case 'complete-renewal':
                title = 'Finalise Renewal';
                newStatus = C.TenancyEventStatus.RenewalComplete;
                break;
            case 'failed-renewal':
                title = 'Cancel Renewal';
                newStatus = C.TenancyEventStatus.RenewalCancelled;
                break;
            case 'revert-to-inprogress-renewal':
                title = 'Revert Renewal';
                newStatus = C.TenancyEventStatus.RenewalInProgress;
                break;
            case 'vacate-complete':
                title = 'Finalise Vacation';
                newStatus = C.TenancyEventStatus.VacateComplete;
                break;
            case 'failed-vacate':
                title = 'Cancel Vacation';
                newStatus = C.TenancyEventStatus.VacateCancelled;
                break;
            case 'revert-to-inprogress-vacate':
                title = 'Revert Vacation';
                newStatus = C.TenancyEventStatus.VacateInProgress;
                break;
        }

        // only allow revert if this progression is the latest renewal!
        if (newStatus === C.TenancyEventStatus.RenewalInProgress) {
            var isLatestTerm =
                me.$root
                    .find('#TenancyTerm_IsLatestTerm')
                    .val()
                    .toLowerCase() === 'true';

            if (!isLatestTerm) {
                showInfo('You can only revert the latest tenancy term');
                return;
            }
        }

        if (newStatus !== C.TenancyEventStatus.Unspecified) {
            var showTermStatusChangeHandler = function () {
                new gmgps.cloud.ui.views.termStatusChangeHandler({
                    historyEventId: historyEventId,
                    newStatus: newStatus,
                    title: title,
                    tenancyId: tenancyId,
                    onComplete: function (model, events) {
                        if (model) {
                            me.closeChainBrowser(true);

                            var after = function () {
                                gmgps.cloud.helpers.general.promptForLetters({
                                    eventHeaders: events
                                });
                            };

                            switch (newStatus) {
                                case C.TenancyEventStatus.RenewalComplete:
                                case C.TenancyEventStatus.Periodic:
                                    new gmgps.cloud.ui.views.systemInvoiceHandler().invoicingCompleted(
                                        model,
                                        function () {
                                            after();
                                        }
                                    );
                                    break;

                                case C.TenancyEventStatus.VacateComplete:
                                    me.showVacatedChangeAddress(
                                        historyEventId,
                                        me.$root.find('#PropertyId').val(),
                                        function () {
                                            new gmgps.cloud.ui.views.systemInvoiceHandler().invoicingCompleted(
                                                model,
                                                function () {
                                                    after();
                                                }
                                            );
                                        }
                                    );
                                    break;
                            }
                        }
                    }
                }).show();
            };

            if (me.needToDisplayFeesOrDepositDialog(newStatus)) {
                var dialogData =
                    me.getFeesAndDepositWarningDialogTitles(newStatus);

                showDialog({
                    type: dialogData.DialogType,
                    title: dialogData.Title,
                    msg: dialogData.Message,
                    buttons: {
                        Continue: function () {
                            $(this).dialog('close');
                            showTermStatusChangeHandler();
                        },
                        Cancel: function () {
                            $(this).dialog('close');
                        }
                    }
                });
            } else {
                showTermStatusChangeHandler();
            }
        }
    },

    needToDisplayFeesOrDepositDialog: function (newStatus) {
        var me = this;

        if (
            newStatus == C.TenancyEventStatus.RenewalComplete ||
            newStatus == C.TenancyEventStatus.RaiseInitalCharges ||
            newStatus == C.AgreedOfferStatus.Let
        ) {
            var requiresFeesWarning = getBoolean(
                me.$root.find('#RequiresFeesWarning')
            );
            var requiresDepositWarning =
                getBoolean(me.$root.find('#RequiresDepositWarning')) &&
                me.heldDepositExceedsMaxPermitted();

            return requiresDepositWarning || requiresFeesWarning;
        } else {
            return false;
        }
    },

    getFeesAndDepositWarningDialogTitles: function () {
        var me = this;

        var requiresFeesWarning = getBoolean(
            me.$root.find('#RequiresFeesWarning')
        );
        var requiresDepositWarning =
            getBoolean(me.$root.find('#RequiresDepositWarning')) &&
            me.heldDepositExceedsMaxPermitted();

        var currencySymbol = me.$root.find('#CurrencySymbol').val();
        var maxDeposit = currencySymbol + me.getMaxPermittedDeposit();

        var depositOnlyMessage =
            'In accordance with the Tenant Fees Act 2019, and based on the rent amount recorded on the tenancy details, you should not hold more than ' +
            maxDeposit +
            ' total deposit for this tenancy. Do you wish to continue?';
        var feesOnlyMessage =
            'You should ensure fees charged to the tenancy are in accordance with the Tenant Fees Act 2019. Do you wish to continue?';
        var combinedMessage =
            'In accordance with the Tenant Fees Act 2019:<br/><ul><li><b>&bull;</b> Based on the rent amount recorded on the tenancy details, you should not hold more than ' +
            maxDeposit +
            ' total deposit for this tenancy</li><li><b>&bull;</b> You should ensure tenancy fees comply</li></ul>';

        var message =
            requiresDepositWarning && requiresFeesWarning
                ? combinedMessage
                : requiresDepositWarning
                ? depositOnlyMessage
                : feesOnlyMessage;

        var dialogData = {
            Title: 'Tenant Fees Act 2019',
            Message: message,
            DialogType: 'warning'
        };

        return dialogData;
    },

    getMaxPermittedDeposit: function () {
        var me = this;

        var rent = me.$root.find('#Rent').val();
        var frequency = me.$root.find('#RentalFrequency').val();
        var weeklyRent =
            gmgps.cloud.accounting.RentalCalculator.calculateRentPerWeek(
                frequency,
                rent
            );
        var maxPermitted =
            gmgps.cloud.accounting.RentalCalculator.calculateMaxPermittedDeposit(
                weeklyRent
            );
        return gmgps.cloud.accounting.RentalCalculator.roundDownDeposit(
            maxPermitted
        );
    },

    heldDepositExceedsMaxPermitted: function () {
        var me = this;
        var depositHeld = parseFloat(me.$root.find('#DepositRequested').val());
        return depositHeld > me.getMaxPermittedDeposit();
    },

    setDepositWarningStatus: function () {
        var me = this;
        var requiresWarning =
            getBoolean(me.$root.find('#RequiresDepositWarning')) &&
            me.heldDepositExceedsMaxPermitted();

        if (requiresWarning) {
            me.$root
                .find('#deposit-info')
                .addClass('fa-warning')
                .addClass('fa')
                .removeClass('info');
            me.$root.find('#deposit-warning').show();

            var currencySymbol = me.$root.find('#CurrencySymbol').val();
            var maxDeposit = currencySymbol + me.getMaxPermittedDeposit();
            me.$root.find('#max-deposit-allowed').text(maxDeposit);
        } else {
            me.$root
                .find('#deposit-info')
                .removeClass('fa-warning')
                .removeClass('fa')
                .addClass('info');
            me.$root.find('#deposit-warning').hide();
        }
    },

    changeOfferPipelineStatus: function (offerId, agreedOfferId) {
        var me = this;

        new gmgps.cloud.ui.controls.window({
            title: 'Change Pipeline Status',
            windowId: 'pipelineModal',
            post: true,
            width: 400,
            draggable: true,
            modal: true,
            actionButton: 'Save',
            cancelButton: 'Cancel',
            $content: $(
                '<div class="fields labels-130">' +
                    '<div class="row">' +
                    '<div class="col-1"><label>Pipeline Status</label></div>' +
                    '<div class="col-2"><select class="fl" style="width: 145px;" id="PipelineStatusId"></select></div>' +
                    '<div class="clear"></div>' +
                    '</div>' +
                    '</div>'
            ),
            onBeforeDisplay: function ($window, displayCallBack) {
                var $categoryDropdown = $window.find('#PipelineStatusId');
                $categoryDropdown.append($('<option>'));

                var $g = me.apiService.get.bind({componentName: "progression-onBeforeDisplay"});
                $g('LookUp', 'Index', {
                        referenceCode: 'PipelineStatuses'
                    })
                    .done(function (categories) {
                        $.each(categories, function (index, category) {
                            $categoryDropdown.append(
                                $('<option>', { value: category.Id }).text(
                                    category.Value
                                )
                            );
                        });

                        var $g = me.apiService.get.bind({componentName: "progression-onBeforeDisplay"});
                        $g('Offer', 'GetPipelineStatus', {
                                originatingEventId: offerId
                            })
                            .done(function (model) {
                                $categoryDropdown.val(model.pipelineStatusId);
                                $categoryDropdown.customSelect();
                                displayCallBack();
                            });
                    });
            },
            onAction: function ($f) {
                var selectedValue = $f
                    .find('#PipelineStatusId option:selected')
                    .val();
                var data = {
                    offerHistoryEventId: offerId,
                    agreedOfferId: agreedOfferId,
                    pipelineStatusId: selectedValue
                };

                var $p = me.apiService.post.bind({componentName: "progression-onAction"});
                $p('Offer', 'SetPipelineStatus', data)
                    .fail(function (e) {
                        showInfo(
                            e.responseJSON.ExceptionMessage,
                            e.responseJSON.Message
                        );
                    });
            },
            onCancel: function () {}
        });
    },

    action: function (args) {
        var me = this;
        if (args.action === 'list') {
            return;
        }

        var progressionType = parseInt(me.$root.find('#ChainLinkType').val());

        if (progressionType === C.ChainLinkType.Tenancy) {
            me.updateTenancyEventProgression(args);
        } else {
            me.updateAgreedOfferProgression(args);
        }
    },

    printNotes: function (historyEventId, originatingEventId) {
        var $form = gmgps.cloud.utility.buildForm('Progression/PrintNotes', {
            historyEventId: historyEventId,
            originatingEventId: originatingEventId
        });
        $form.submit();
        $form.remove();
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

        me.onViewModeChanged.raise({
            newViewMode: viewMode,
            menuMode: viewMode,
            showMenu: true,
            group: 'progression'
        });
    },

    showNodeForm: function (
        chainLinkId,
        direction,
        $node,
        marketedByUs,
        editMode
    ) {
        var me = this;
        var title;

        //Clone the node which is being linked to, for later injection.
        var $sourceNode = $node.clone();
        var $clonedTerminals = $sourceNode.find('.terminal');
        $sourceNode.attr('id', 'form' + $sourceNode.attr('id'));

        //Remove terminals
        if (!marketedByUs) {
            $sourceNode.find('.terminal').remove();
        }

        var internalExternal = ' - Internal Property';
        if (!marketedByUs) internalExternal = ' - External Property';

        //Direction specific (e.g. window title).
        switch (direction) {
            case C.Direction.Up:
                title =
                    'Add Property to Chain (Seller' + internalExternal + ')';
                break;
            case C.Direction.Down:
                title = 'Add Property to Chain (Buyer' + internalExternal + ')';
                break;
            case C.Direction.Unspecified: //this value is only used for editing.
                title =
                    'Amend ' + internalExternal.trimStart(' ').trimStart('-');
                break;
        }

        //We only want the terminal which was clicked, to be included in the preview.
        $sourceNode
            .find('.terminal[data-direction!="' + direction + '"]')
            .remove();

        $clonedTerminals.each(function (i, terminal) {
            $(terminal)
                .addClass('question')
                .attr('id', 'form' + $(terminal).attr('id'));
        });

        //Hide all other unwanted elements from the cloned node.
        $sourceNode.find('.edit-button, .delete-button').remove();

        new gmgps.cloud.ui.controls.window({
            title: title,
            windowId: 'chainLinkModal',
            url: editMode
                ? '/Progression/GetChainLink'
                : '/Progression/CreateChainLink',
            urlArgs: editMode
                ? {
                      id: chainLinkId,
                      historyEventId: me.$root.find('#HistoryEventId').val()
                  }
                : {
                      sourceChainLinkId: chainLinkId,
                      direction: direction,
                      isUnknownProperty: !marketedByUs,
                      viewMode: me.viewMode,
                      historyEventId: me.$root.find('#HistoryEventId').val()
                  },
            post: true,
            controller: gmgps.cloud.ui.views.chainLink,
            width: 983,
            draggable: true,
            modal: true,
            actionButton: editMode ? 'Save' : 'Add Property to Chain',
            cancelButton: 'Cancel',
            onBeforeDisplay: function ($f, callback) {
                $f.addClass('chain-browser');

                //If we're creating (not edit mode), clone the source node to create an unknown property and display in the other container.
                // - If instead, this is editMode, then we have already picked up the other node for display, earlier (it being the actual node from the chain).
                var $otherNode;
                if (!editMode) {
                    $otherNode = $sourceNode.clone();
                } else {
                    $otherNode = $sourceNode.clone();
                }

                //Prepare helpful diagram.
                switch (direction) {
                    case C.Direction.Up:
                        $f.find('#source-node-container').append($sourceNode);
                        $f.find('#target-node-container').append($otherNode);

                        $sourceNode.removeClass('selected');
                        $otherNode.find('.label').text('New Link in Chain');
                        $otherNode.find('.status').remove();
                        $otherNode
                            .find('.image img')
                            .attr(
                                'src',
                                '/content/media/images/gui/common/unknownpropertyq.jpg'
                            );
                        break;
                    case C.Direction.Down:
                        $f.find('#target-node-container').append($sourceNode);
                        $f.find('#source-node-container').append($otherNode);

                        $sourceNode.removeClass('selected');
                        $otherNode.find('.label').text('New Link in Chain');
                        $otherNode.find('.status').remove();
                        $otherNode
                            .find('.image img')
                            .attr(
                                'src',
                                '/content/media/images/gui/common/unknownpropertyq.jpg'
                            );
                        break;
                    case C.Direction.Unspecified:
                        $f.find('#source-node-container').append($sourceNode);

                        //Remove "buying" and "selling" diagram labels.
                        $f.find('.diagram-label').remove();

                        $sourceNode.removeClass('selected');
                        break;
                }

                callback();

                if ($f.find('#noPropertiesToSell').val() == 'true') {
                    $f.find('.action-button').hide();
                } else {
                    $f.find('.action-button').show();
                }
            },
            onReady: function ($f, controller) {
                if (!editMode) {
                    //Connect the terminals to the nodes.
                    if (!marketedByUs) {
                        //temp
                        $f.find('#source-node-container .node').attr(
                            'id',
                            'source-node'
                        );
                        $f.find('#source-node-container .node').attr(
                            'id',
                            'target-node'
                        );

                        //Connect the source and target nodes.
                        controller.plumb.connect({
                            source: $f.find('#source-node-container .node'),
                            target: $f.find('#target-node-container .node'),
                            connector: ['Straight'],
                            anchor: ['RightMiddle', 'LeftMiddle'],
                            overlays: [
                                [
                                    'Arrow',
                                    {
                                        cssClass: 'arrow',
                                        width: 22,
                                        length: 22,
                                        location: 0.5,
                                        direction: 1,
                                        foldback: 1,
                                        paintStyle: {
                                            strokeStyle: '#d72728',
                                            fillStyle: '#d72728'
                                        }
                                    }
                                ]
                            ],
                            paintStyle: { strokeStyle: '#4d4d4d', lineWidth: 4 }
                        });
                    }
                }
            },
            onAction: function ($f) {
                var $form = createForm($f, 'Progression/UpdateChainLink');

                //Remove unused contact panels for each party (by getting the group selection and removing any panels which aren't of that type).
                $form.find('.chainlink-party').each(function (i, v) {
                    var $party = $(v);
                    var typeId = $party
                        .find('.ui-controlgroup .selected')
                        .attr('data-id');
                    $party
                        .find('.controlgroup-panel[data-id!="' + typeId + '"]')
                        .remove();
                });

                //Create html required for successful de-serialization into objects for on the server.
                reindexHtmlArray(
                    $form,
                    '.chainlink-party',
                    'ChainLink.Parties',
                    true
                );

                //remove unused property ids
                $form
                    .find('#ChainLink_PropertyId[value="0"]')
                    .each(function (i, propertyInput) {
                        $(propertyInput).remove();
                    });

                var valid = true;
                direction = $form.find('#Direction').val();

                if (marketedByUs && direction == C.Direction.Down) {
                    var val = $form.find('#party_ContactId').val();
                    if (val == null || val == '' || val == '0') {
                        showInfo(
                            'Please specify an applicant for the chain item.'
                        );
                        valid = false;
                    }
                }

                if (!valid) return false;

                //Save the ChainLink.
                new gmgps.cloud.http("progression-onAction").postForm(
                    $form,
                    function (response) {
                        //Refresh the chain browser, setting the focal point to the edited node.
                        me.getProgressionDetail(0, response.Data.Id);
                    }
                );
            },
            onCancel: function () {}
        });
    },

    _onPageRequest: function (args) {
        var me = this;

        var search;

        var embedded = args.$root.attr('data-embedded') === 'True';

        if (!embedded) {
            //Main List - Update the previous search criteria.
            search = me.lastSearchArgs.search;
            search.SearchPage = args.SearchPage;
            search.SearchOrder = args.SearchOrder;

            me.getList({
                ids: args.ids,
                listSelectionMode: args.listSelectionMode,
                $panelItem: me.$listPanelItem,
                search: search
            });
        } else {
            //Embedded List - Reconstitute the search criteria using the supplied $root attributes.
            search = {
                StatusList: me.lastSearchArgs.search.StatusList,
                PropertyKnownType: C.ChainLinkPropertyKnownType.Known,
                ContactId: parseInt(args.$root.attr('data-contactId')),
                SolicitorContactId: parseInt(
                    args.$root.attr('data-solicitorContactId')
                ),
                SearchPage: {
                    Index: parseInt(args.SearchPage.Index),
                    Size: 10
                },
                SearchOrder: args.SearchOrder
            };

            //Get the embedded list (and display).
            me.getEmbeddedList({
                $container: args.$root.closest('.embedded-list-container'),
                $panelItem: me.$listPanelItem,
                search: search
            });
        }
    },

    _onDetailsRequest: function (args) {
        var me = this;
        var gotoProgressionDetail = function () {
            //Hide the primary view (list) and show the secondary view (chain browser/detail).
            me.$root.find('.content-container[data-id="primary"]').fadeOut();
            me.$root.find('.content-container[data-id="secondary"]').fadeIn();
            
            me.getProgressionDetail(args.secondaryId, args.id);
        };

        switch (me.settings.listGroupType) {
            case C.ProgressionGroupType.Contact:
            case C.ProgressionGroupType.Solicitor:
                var modelType = parseInt(args.$row.attr('data-modelType'));
                if (modelType == C.ModelType.ChainLink) {
                    //ChainLink
                    gotoProgressionDetail();
                } else {
                    var expandSubRow = function () {
                        //ChainLink Group
                        var $table = args.$row.closest('table');
                        $table.find('.sublist-row:visible').hide();

                        //Select row.
                        var selected = args.$row.hasClass('selected');

                        //Reset selected row.
                        $table
                            .find('.row.selected')
                            .removeClass('selected')
                            .find('.expander')
                            .removeClass('i-minus')
                            .addClass('i-plus');

                        //Select row (unless it was previously the selected one).
                        if (!selected) {
                            args.$row
                                .addClass('selected')
                                .find('.expander')
                                .removeClass('i-plus')
                                .addClass('i-minus');

                            var $sublistRow = args.$row.next();
                            $sublistRow.fadeIn();
                        }
                    };

                    var subrowExists = parseInt(
                        args.$row.attr('data-subrow-fetched')
                    );

                    if (subrowExists) {
                        expandSubRow();
                    } else {
                        var contactId = parseInt(args.$row.attr('data-id'));

                        var search = me.lastSearchArgs.search;

                        search.ContactId = contactId;

                        me.getPartyChainList(search).done(function (r) {
                            if (r && r.Data) {
                                var $html = $(r.Data);
                                args.$row.after($html);
                                args.$row.attr('data-subrow-fetched', '1');
                                expandSubRow();
                            }
                        });
                    }
                }

                break;
            case C.ProgressionGroupType.Property:
                gotoProgressionDetail();
                break;
            case C.ProgressionGroupType.UnknownProperty:
                break;
            case C.ProgressionGroupType.TenancyRenewal:
                gotoProgressionDetail();
                break;
            case C.ProgressionGroupType.VacateProperty:
                gotoProgressionDetail();
                break;
            default:
                break;
        }
    },

    getList: function (args, onSuccess) {
        var me = this;

        var url, negotiatorId;

        //Assign listGroup specific search settings.
        switch (me.settings.listGroupType) {
            case C.ProgressionGroupType.Contact:
                url = 'Progression/GetChainLinkPartyList';
                args.search.PropertyKnownType =
                    C.ChainLinkPropertyKnownType.Known;
                break;
            case C.ProgressionGroupType.Solicitor:
                url = 'Progression/GetChainLinkPartyList';
                args.search.PropertyKnownType =
                    C.ChainLinkPropertyKnownType.Known;
                break;
            case C.ProgressionGroupType.Property:
                url = 'Progression/GetChainLinkList';
                args.search.PropertyKnownType =
                    C.ChainLinkPropertyKnownType.Known;
                break;
            case C.ProgressionGroupType.VacateProperty:
                url = 'Progression/GetChainLinkList';
                args.search.PropertyKnownType =
                    C.ChainLinkPropertyKnownType.Known;
                break;
            case C.ProgressionGroupType.TenancyRenewal:
                url = 'Progression/GetChainLinkList';
                args.search.PropertyKnownType =
                    C.ChainLinkPropertyKnownType.Known;
                break;
            default:
                url = 'Progression/GetChainLinkList';
                break;
        }

        var negotiator = args.$panelItem.find('#Negotiator').val();

        if (negotiator && negotiator.indexOf('{') === 0) {
            negotiatorId = parseInt(jQuery.parseJSON(negotiator).id);
        }

        var negotiatorType = parseInt(args.$panelItem.find('#Neg__Role').val());

        args.search.NegotiatorId = negotiatorId;
        args.search.NegotiatorType = negotiatorType;

        var propertyBranchId = parseInt(
            args.$panelItem.find('#Property_Branch').val()
        );
        args.search.PropertyBranchId = propertyBranchId;

        //Store this search.
        me.lastSearchArgs = args;

        new gmgps.cloud.http("progression-getList").ajax(
            {
                args: {
                    search: args.search,
                    displayContext: me.settings.listGroupType
                },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: url,
                listType: C.ListType.Standard
            },
            function (response) {
                me.displayList(
                    response,
                    args.$panelItem,
                    args.ids,
                    args.listSelectionMode,
                    args.search.Query
                );
                if (onSuccess) {
                    onSuccess();
                }
            },
            function () {
                if (onSuccess) {
                    onSuccess(false);
                }
            }
        );
    },

    getEmbeddedList: function (args, onSuccess) {
        //Fetch and refresh an embedded chain link list.
        var me = this;

        var url = 'Progression/GetChainLinkList';

        var negotiatorId = 0;
        var negotiator = args.$panelItem.find('#Negotiator').val();
        if (negotiator) {
            negotiatorId = parseInt(jQuery.parseJSON(negotiator).id);
        }
        args.search.NegotiatorId = negotiatorId;

        args.search.PropertyRecordType = parseInt(
            args.$panelItem.attr('data-data')
        );
        args.search.ChainLinkType = C.ChainLinkType.AgreedOffer;
        args.search.PropertyKnownType = C.ChainLinkPropertyKnownType.Known;
        args.search.NegotiatorType = parseInt(
            args.$panelItem.find('#Neg__Role').val()
        );
        args.search.PropertyBranchId = parseInt(
            args.$panelItem.find('#Property_Branch').val()
        );
        args.search.IncludeContactDetails = true;

        new gmgps.cloud.http("progression-getEmbeddedList").getView({
            url: url,
            post: true,
            complex: true,
            args: {
                search: args.search,
                displayContext: me.settings.listGroupType,
                embedded: true
            },
            onSuccess: function (response) {
                args.$container.html(response.Data);
                if (onSuccess) onSuccess();
            }
        });
    },

    showCompletedChangeAddress: function (
        sellerIds,
        buyerIds,
        historyEventId,
        saveCallBack
    ) {
        var completedAddressController = null;

        new gmgps.cloud.ui.controls.window({
            title: 'Completed Change of Address',
            windowId: 'changeOfAddressModal',
            url: '/Progression/GetCompletedChangeAddress',
            urlArgs: {
                sellerIds: sellerIds,
                buyerIds: buyerIds,
                historyEventId: historyEventId
            },
            post: true,
            controller: gmgps.cloud.ui.views.completedChangeAddress,
            width: 838,
            draggable: true,
            modal: true,
            actionButton: 'Save',
            cancelButton: 'Cancel',
            onReady: function ($f, controller) {
                completedAddressController = controller;
            },
            onAction: function () {
                completedAddressController.save();
                saveCallBack(this.urlArgs.sellerIds, this.urlArgs.buyerIds);
            },
            onCancel: function () {}
        });
    },

    showVacatedChangeAddress: function (
        historyEventId,
        propertyId,
        onComplete
    ) {
        var me = this;

        new gmgps.cloud.ui.controls.window({
            title: 'Update Tenant Addresses',
            windowId: 'tenantAddressesModal',
            url: '/Progression/GetVacatedChangeAddress',
            urlArgs: {
                historyEventId: historyEventId
            },
            post: true,
            controller: gmgps.cloud.ui.views.changeAddressHandler,
            data: {
                status: C.TenancyEventStatus.VacateComplete,
                propertyId: propertyId
            },
            width: 600,
            draggable: true,
            modal: true,
            actionButton: 'Update',
            onAction: function () {
                return true;
            },
            callback: function (success, updatedContactIdList) {
                if (success) {
                    if (updatedContactIdList.length > 0) {
                        var fakePn = {
                            SrcSignalRConnectionId: 'fakeconnectionid',
                            ModelType: C.ModelType.Contact,
                            Ids: updatedContactIdList,
                            Type: C.PushNotificationType.Update,
                            connection: {
                                signalRConnectionId: 'other-fakeconnectionid' // ensure different to Src
                            },
                            Data: {
                                UpdatedBy:
                                    'the action of updating the tenant address'
                            },
                            Silent: true
                        };

                        if (me.shell.views.contact) {
                            me.shell.views.contact.pnUpdate(fakePn);
                        }
                    }

                    onComplete();
                }
            }
        });
    },

    showLetChangeAddress: function (historyEventId, propertyId, onComplete) {
        var me = this;

        new gmgps.cloud.ui.controls.window({
            title: 'Update Tenant Addresses',
            windowId: 'updateTenantAddressesModal',
            url: '/Progression/GetLetChangeAddress',
            urlArgs: {
                historyEventId: historyEventId
            },
            post: true,
            data: { status: C.TenancyEventStatus.Let, propertyId: propertyId },
            controller: gmgps.cloud.ui.views.changeAddressHandler,
            width: 600,
            draggable: true,
            modal: true,
            actionButton: 'Update',
            onAction: function () {
                return true;
            },
            callback: function (success, updatedContactIdList) {
                if (success) {
                    onComplete();

                    var fakePn = {
                        SrcSignalRConnectionId: 'fakeconnectionid',
                        ModelType: C.ModelType.Contact,
                        Ids: updatedContactIdList,
                        Type: C.PushNotificationType.Update,
                        connection: {
                            signalRConnectionId: 'other-fakeconnectionid' // ensure different to Src
                        },
                        Data: {
                            UpdatedBy:
                                'the action of updating the tenant address'
                        },
                        Silent: true
                    };

                    if (me.shell.views.contact) {
                        me.shell.views.contact.pnUpdate(fakePn);
                    }
                }
            }
        });
    },

    showSearchResultsPanelItem: function (show) {
        var me = this;
        me.$listPanelItem = me.panel.showSearchResultsPanelItem(show);
    },

    setQuery: function (query, filters, callback) {
        var me = this;
        me.query = query.replace(/\s/g, '');

        //Exit early if too short.
        if (me.query.length < 3) {
            me.clearSearchResults();
            callback(query);
            return false;
        }

        var $input = me.shell.$root.find(
            ".group[data-group='progression'] .placeholder"
        );
        var recordType = parseInt($input.attr('data-recordtypeid'));
        var id = parseInt($input.attr('data-id'));

        me.$listPanelItem = me.settings.$activePanel;

        me.settings.propertyRecordType = recordType;

        var category = 0;
        var chainLinkType = C.ChainLinkType.AgreedOffer;

        switch (id) {
            case C.ProgressionGroupType.Contact:
                category = C.ContactCategory.Client;
                break;
            case C.ProgressionGroupType.Solicitor:
                category = C.ContactCategory.Solicitor;
                break;
            case C.ProgressionGroupType.TenancyRenewal:
            case C.ProgressionGroupType.VacateProperty:
                chainLinkType = C.ChainLinkType.Tenancy;
                break;
        }

        //Set the ChainLinkStatus and obtain a status list..
        var chainLinkStatus =
            id === C.ProgressionGroupType.UnknownProperty
                ? C.ChainLinkFilterType.Current
                : me.settings.status;

        var statusList =
            me.getAgreedOfferStatusListFromChainLinkStatus(chainLinkStatus);

        var tenancyStatus =
            me.getTenancyEventStatusFromChainLinkStatus(chainLinkStatus);

        me.getList(
            {
                $panelItem: me.$listPanelItem,
                disablePaging: true,
                search: {
                    ChainLinkType: chainLinkType,
                    PropertyRecordType: recordType,
                    StatusList: statusList,
                    IncludeContactDetails: true,
                    TenancyStatusList: tenancyStatus,
                    Query: query,
                    Category: category,
                    ListType: C.ListType.Standard,
                    SearchPage: {
                        Index: 1,
                        Size: 100
                    },
                    SearchOrder: {
                        By: C.SearchOrderBy.SearchScore,
                        Type: C.SearchOrderType.Ascending
                    }
                }
            },
            function () {
                if (callback) {
                    callback(query);
                }
            },
            function () {
                if (callback) {
                    callback(false);
                }
            }
        );
    },

    getPartyChainList: function (search) {
        return new gmgps.cloud.http("progression-getPartyChainList").ajax({
            args: {
                search: search
            },
            complex: true,
            dataType: 'json',
            type: 'post',
            url: '/Progression/GetChainLinkPartyListDetail'
        });
    }
};
