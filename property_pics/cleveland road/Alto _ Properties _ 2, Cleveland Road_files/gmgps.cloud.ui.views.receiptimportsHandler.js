gmgps.cloud.ui.views.receiptImportsHandler = function (args) {
    var me = this;

    me.$root = args.$root;

    me.container = args.container;
    me.panels = {
        clientAccounts: null
    };

    me.namespace = '.ImportedReceiptsMatchHandler';

    return me;
};

gmgps.cloud.ui.views.receiptImportsHandler.prototype = {
    init: function (onComplete) {
        var me = this;

        me.$root.off();
        me.$root.off(me.namespace);

        me.initControls(function () {
            if (onComplete) {
                onComplete();
            }
        });
        me.initEvents();
    },

    initControls: function (onComplete) {
        var me = this;

        me.tabs = me.$root.find('.tabs').tabs();

        if (!me.panels.clientAccounts) {
            me.panels.clientAccounts =
                new gmgps.cloud.ui.views.receiptImportsClientAccountsPanelHandler(
                    {
                        $root: me.$root.find('#accountlist'),
                        http: me.http,
                        url: '/Accounts/GetReceiptImportsLayer',
                        type: C.AccountCentreActionsType.ImportReceipts
                    }
                ).init();
        }

        // Initialize default date range selection
        var $rangeBtn = me.$root.find('#btn-get-date-range');
        if ($rangeBtn.length && !$rangeBtn.data('selected-range')) {
            $rangeBtn.data('selected-range', 'yesterday');
        }

        me.refreshClientAccounts(onComplete);
    },

    initEvents: function () {
        var me = this;
        var accountNamespace = '.ImportedReceiptsAccountsHandler';
        me.$root.off(accountNamespace);

        me.$root.on('click' + accountNamespace, '.view-account', function () {
            var $this = $(this);

            if ($this.hasClass('disabled')) {
                return false;
            }

            var accountId = $this.data('id');
            var accountName = $this.data('name');

            me.getTabsContent(
                ['importedreceiptslist', 'timeline'],
                accountId
            ).done(function (s) {
                me.$root.find('.tabs li').hide();
                me.$root.find('#account-name').text(accountName);
                me.initTabContents(s.Data, 'importedreceiptslist');
            });
        });
    },

    initTabEvents: function () {
        var me = this;

        me.namespace = '.ImportedReceiptsMatchHandler';

        me.$root.off(me.namespace);

        me.$root.on('click' + me.namespace, '.btn.deleteitem', function () {
            var $this = $(this);

            showDialog({
                type: 'question',
                title: 'Clear imported receipts',
                msg: 'You are about to clear the imported receipts for this item. Proceed?',
                buttons: {
                    Yes: function () {
                        $(this).dialog('close');

                        var $itemCollectionClicked =
                            $this.closest('.item-collection');
                        $itemCollectionClicked.fadeOut(300, function () {
                            // Call delete method in controller
                            var receiptIdList = me.getReceiptIdsForItem(
                                $itemCollectionClicked
                            );
                            new gmgps.cloud.http("receiptImportsHandler-Yes")
                                .ajax({
                                    args: {
                                        ids: receiptIdList,
                                        ignoreErrors: false
                                    },
                                    complex: true,
                                    dataType: 'json',
                                    type: 'post',
                                    url: '/Accounts/DeleteReceiptImportTransactions'
                                })
                                .done(function (r) {
                                    if (r && r.Data) {
                                        $(this).remove();
                                        me.updateBandsCountInfo();
                                    }
                                });
                        });
                    },
                    No: function () {
                        $(this).dialog('close');
                    }
                }
            });
        });

        me.$root.on('click' + me.namespace, '.clear-unmatched', function (e) {
            e.stopPropagation();

            showDialog({
                type: 'question',
                title: 'Clear this imported receipt',
                msg: 'You are about to clear ALL unmatched imported receipts. Proceed?',
                buttons: {
                    Yes: function () {
                        $(this).dialog('close');
                        me.removeUnmatchedItems();
                    },
                    No: function () {
                        $(this).dialog('close');
                    }
                }
            });
        });

        me.$root.on('click' + me.namespace, '.accordion-toggle', function () {
            me.hideMostRecentlymatchedItem();

            if ($(this).hasClass('active')) {
                me.$root
                    .find('.accordion-toggle')
                    .not($(this))
                    .trigger('click');
                return;
            }

            //Expand this panel
            me.$root.find('.accordion-toggle').removeClass('active');
            $(this).addClass('active').next().slideToggle('fast');

            //Hide the other panels
            me.$root
                .find('.accordion-content')
                .not($(this).next())
                .slideUp('fast');
        });

        me.$root.on('click' + me.namespace, '.charge-item', function (e) {
            if (!$(e.target).hasClass('preview-link')) {
                $(this).next('.charge-expandable-details').slideToggle('fast');
            }
        });

        me.$root.on(
            'click' + me.namespace,
            '.actions > .btn.match',
            function (e) {
                e.stopPropagation();

                if ($(this).hasClass('disabled')) {
                    return false;
                }

                var $row = $(this).closest('.item-collection');
                var $target = me.$root.find('#matched-list');

                $row.fadeOut(300, function () {
                    $row.prependTo($target);
                    $row.fadeIn(300);

                    $row.closest('.item-collection')
                        .find('#action-buttons')
                        .first()
                        .removeClass('unmatched')
                        .removeClass('selectcharge')
                        .removeClass('spacer')
                        .removeClass('remembered')
                        .addClass('matched');

                    $row.show();

                    me.updateBandsCountInfo();
                    me.showMostRecentlymatchedItem();
                });
            }
        );

        me.$root.on(
            'click' + me.namespace,
            '.actions > .btn.unmatch',
            function (e) {
                e.stopPropagation();
                var $row = $(this).closest('.item-collection');
                var $target = me.$root.find('#un-matched-list');

                $row.fadeOut(300, function () {
                    $row.appendTo($target);

                    $row.closest('.item-collection')
                        .find('#action-buttons')
                        .first()
                        .removeClass('matched')
                        .removeClass('selectcharge')
                        .removeClass('spacer')
                        .removeClass('remembered')
                        .addClass('unmatched');

                    $row.show();

                    me.updateBandsCountInfo();
                    me.hideMostRecentlymatchedItem();
                });
            }
        );

        me.$root.on(
            'click' + me.namespace,
            '.actions > .btn.remember',
            function (e) {
                e.stopPropagation();
                var disablePinningToCharge = $(this)
                    .closest('#action-buttons')
                    .hasClass('charge-pinning-disabled');
                me.preparePinRererenceDialog(
                    $(this),
                    false,
                    disablePinningToCharge
                );
            }
        );

        me.$root.on(
            'click' + me.namespace,
            '.actions > .btn.forget',
            function (e) {
                e.stopPropagation();

                var $btn = $(this);

                showDialog({
                    type: 'question',
                    title: 'Review or Forget',
                    msg: 'Would you like to Review or Forget the Pinned Reference?',
                    buttons: {
                        Review: function () {
                            $(this).dialog('close');
                            me.preparePinRererenceDialog($btn, true);
                        },
                        Forget: function () {
                            $(this).dialog('close');
                            me.forgetPinnedReference($btn);
                        }
                    }
                });
            }
        );

        me.$root.on('click' + me.namespace, '#btn-upload-init', function () {
            if ($(this).hasClass('disabled')) {
                me.displayFileUploadPermissionWarning();
                return false;
            }

            if (me.willLooseMatchedSelection()) {
                showDialog({
                    type: 'question',
                    title: 'Clear manually matched receipt selection',
                    msg: 'You have a selection of manually matched receipts. This selection will be lost. Proceed?',
                    buttons: {
                        Yes: function () {
                            $(this).dialog('close');
                            me.displayFileUploadDialog();
                        },
                        No: function () {
                            $(this).dialog('close');
                        }
                    }
                });
            } else {
                me.displayFileUploadDialog();
            }
        });

        me.$root.on('click' + me.namespace, '#btn-upload-open-banking', function () {
            // Get the selected date range from the dropdown button
            var $rangeBtn = me.$root.find('#btn-get-date-range');
            var selectedRange = $rangeBtn.data('selected-range') || 'yesterday'; 
            
            me.getTransactionsWithDateRange(selectedRange);
        });

        // Dropdown toggle for date range sync
        me.$root.on('click' + me.namespace, '#btn-get-date-range', function (e) {
            e.stopPropagation();
            e.preventDefault();
            
            // Don't show dropdown if button is disabled
            if ($(this).hasClass('disabled') || $(this).hasClass('upload-disabled')) {
                return false;
            }
            
            var $dropdown = me.$root.find('#get-date-range-dropdown');
            var isVisible = $dropdown.hasClass('show');
            
            if (isVisible) {
                $(this).removeClass('show');
                $dropdown.removeClass('show');
            } else {
                $(this).addClass('show');
                $dropdown.addClass('show');
            }
        });

        // Close dropdown when clicking outside
        $(document).on('click' + me.namespace, function (e) {
            if (!$(e.target).closest('#btn-get-date-range, #get-date-range-dropdown').length) {
                me.$root.find('#btn-get-date-range').removeClass('show');
                me.$root.find('#get-date-range-dropdown').removeClass('show');
            }
        });

        // Handle date range selection from dropdown - only update the selected text
        me.$root.on('click' + me.namespace, '#get-date-range-dropdown a', function (e) {
            e.preventDefault();
            e.stopPropagation();
            var range = $(this).data('range');
            var rangeText = $(this).text();
            
            // Update button text
            var $btn = me.$root.find('#btn-get-date-range');
            $btn.find('.get-range-text').text(rangeText);
            
            // Store the selected range in a data attribute
            $btn.data('selected-range', range);
            
            // Close dropdown
            me.$root.find('#btn-get-date-range').removeClass('show');
            me.$root.find('#get-date-range-dropdown').removeClass('show');
        });

        me.$root.on(
            'click' + me.namespace,
            '#btn-back-to-accounts',
            function () {
                var action = function () {
                    me.$root.find('.tabs li').hide();
                    me.$root
                        .find('.tabs a[href="#accountlist"]')
                        .parent()
                        .show();
                    me.$root.find('.tabs').tabs('option', 'active', 0);
                };

                if (me.willLooseMatchedSelection()) {
                    showDialog({
                        type: 'question',
                        title: 'Clear manually matched receipt selection',
                        msg: 'You have a selection of manually matched receipts. This selection will be lost. Proceed?',
                        buttons: {
                            Yes: function () {
                                $(this).dialog('close');
                                action();
                            },
                            No: function () {
                                $(this).dialog('close');
                            }
                        }
                    });
                } else {
                    action();
                }
            }
        );

        me.$root.on('click' + me.namespace, '#btn-post-receipts', function () {
            if ($(this).hasClass('upload-disabled')) {
                me.displayReceiptPostingPermissionWarning();
                return false;
            }

            if ($(this).hasClass('disabled')) {
                return false;
            }

            showDialog({
                type: 'question',
                title: 'Post Matching Receipts',
                msg: 'You are about to post the matching receipts. Proceed?',
                buttons: {
                    Yes: function () {
                        $(this).dialog('close');
                        me.postReceipts();
                    },
                    No: function () {
                        $(this).dialog('close');
                    }
                }
            });
        });

        me.$root.on(
            'click' + me.namespace,
            '#timeline .pmdownload',
            function () {
                var id = $(this).attr('data-historyeventid');
                me.downloadReceiptFile(id);
            }
        );

        me.$root.on(
            ['keyup', ' blur', undefined].join(me.namespace),
            '#SearchItems',
            $.debounce(250, false, doSearch)
        );

        function doSearch(e) {
            me.search(e.target.value);
        }

        me.$root.on(
            'click' + me.namespace,
            '.init-fuzzy-match',
            me.findFuzzyMatches
        );

        me.$root.on(
            'click' + me.namespace,
            '.init-duplicate-dialog',
            function (e) {
                e.stopPropagation();
                var $btn = $(this);
                me.prepareDuplicateRererenceDialog($btn);
            }
        );

        me.setupToolTips();

        me.setupReceiptReferenceToolTips();

        me.setPostReceiptsButtonStatus();

        me.updateBandsCountInfo();
    },

    showMostRecentlymatchedItem() {
        var me = this;
        me.$root.find('#matched-list').addClass('force-first-row-visible');
    },

    hideMostRecentlymatchedItem() {
        var me = this;
        me.$root.find('#matched-list').removeClass('force-first-row-visible');
    },

    setupToolTips: function () {
        var me = this;
        gmgps.cloud.ui.views.receiptImportsHandler.addToolTipsForLandlordIncomWarning(
            me.$root.find('.charge-item .landlord-income-warning')
        );
    },

    displayFileUploadPermissionWarning: function () {
        showDialog({
            type: 'info',
            title: 'Insufficient Permissions',
            msg: 'You do not have the required user access to upload Receipt Files.',
            buttons: {
                OK: function () {
                    $(this).dialog('close');
                }
            }
        });
    },

    displayReceiptPostingPermissionWarning: function () {
        showDialog({
            type: 'info',
            title: 'Insufficient Permissions',
            msg: 'You do not have the required user access to post Receipts.',
            buttons: {
                OK: function () {
                    $(this).dialog('close');
                }
            }
        });
    },

    setupReceiptReferenceToolTips: function () {
        var me = this;

        me.$root.find('.receipt-item:not(.blank)').each(function () {
            var $receipt = $(this);
            var ref = $receipt.find('.receiptref').text();
            var qtipClass = 'qtip-dark';

            if ($receipt.hasClass('duplcate-import')) {
                ref =
                    '<span class="fa fa-warning"></span> Duplicate Import : ' +
                    ref;
                qtipClass = 'qtip-warning';
            }

            $receipt.find('.receiptref').qtip({
                content: {
                    text: ref
                },
                position: {
                    viewport: $(window),
                    my: 'middle left',
                    at: 'middle right',
                    adjust: {
                        y: 0,
                        x: 0
                    }
                },
                show: {
                    event: 'mouseenter',
                    delay: 250,
                    effect: function () {
                        $(this).fadeIn(50);
                    },
                    solo: true
                },
                hide: 'mouseleave',
                style: {
                    tip: true,
                    classes: qtipClass
                }
            });
        });
    },

    willLooseMatchedSelection: function () {
        var me = this;
        return me.$root.find('#matched-list .item-collection').length > 0;
    },

    removeUnmatchedItems: function () {
        var me = this;

        var receiptIdList = [];
        $.each(me.$root.find('#un-matched-list .item-collection'), function () {
            var idList = me.getReceiptIdsForItem($(this));
            receiptIdList.push.apply(receiptIdList, idList);
            $(this).remove();
        });

        if (receiptIdList.length > 0) {
            new gmgps.cloud.http("receiptImportsHandler-removeUnmatchedItems")
                .ajax({
                    args: {
                        ids: receiptIdList,
                        ignoreErrors: true
                    },
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: '/Accounts/DeleteReceiptImportTransactions'
                })
                .done(function () {
                    me.refreshReceiptsList();
                });
        }
    },

    updateBandsCountInfo: function () {
        var me = this;

        var $matchedRows = me.$root
            .find('#matched-list')
            .find('.item-collection');
        var matchedtotal = 0.0;

        $matchedRows.each(function () {
            matchedtotal += parseFloat($(this).attr('data-total-receipts'));
        });

        me.$root
            .find('.accordion-toggle.matched')
            .find('.count')
            .text($matchedRows.length);
        me.$root
            .find('.accordion-toggle.matched')
            .find('.amount')
            .text(
                $.inputmask.format(matchedtotal.toFixed(2), {
                    alias: 'currency',
                    prefix: '£'
                })
            );

        var matchedHidden = me.$root
            .find('#matched-list')
            .find('.item-collection.hidden').length;

        if (matchedHidden > 0) {
            me.$root
                .find('.accordion-toggle.matched')
                .find('.hiddencount')
                .text(matchedHidden + ' hidden')
                .show();
        } else {
            me.$root
                .find('.accordion-toggle.matched')
                .find('.hiddencount')
                .hide();
        }

        var $unmatchedRows = me.$root
            .find('#un-matched-list')
            .find('.item-collection');
        var unmatchedtotal = 0.0;

        $unmatchedRows.each(function () {
            unmatchedtotal += parseFloat($(this).attr('data-total-receipts'));
        });

        me.$root
            .find('.accordion-toggle.unmatched')
            .find('.count')
            .text($unmatchedRows.length);
        me.$root
            .find('.accordion-toggle.unmatched')
            .find('.amount')
            .text(
                $.inputmask.format(unmatchedtotal.toFixed(2), {
                    alias: 'currency',
                    prefix: '£'
                })
            );

        var unmatchedHidden = me.$root
            .find('#un-matched-list')
            .find('.item-collection.hidden').length;

        if (unmatchedHidden > 0) {
            me.$root
                .find('.accordion-toggle.unmatched')
                .find('.hiddencount')
                .text(unmatchedHidden + ' hidden')
                .show();
        } else {
            me.$root
                .find('.accordion-toggle.unmatched')
                .find('.hiddencount')
                .hide();
        }

        me.setPostReceiptsButtonStatus();
    },

    setPostReceiptsButtonStatus: function () {
        var me = this;
        var matchedItemsCount = me.$root
            .find('#matched-list')
            .find('.item-collection').length;
        var $postButton = me.$root.find('#btn-post-receipts');
        var postingDisabled = $postButton.hasClass('upload-disabled');

        if (matchedItemsCount > 0 && postingDisabled === false) {
            $postButton.removeClass('disabled');
        } else {
            $postButton.addClass('disabled');
        }
    },

    initTabContents: function (tabs, selectedTab, showSelectedTab = true) {
        var me = this;

        if (tabs) {
            for (var tab in tabs) {
                // eslint-disable-next-line no-prototype-builtins
                if (tabs.hasOwnProperty(tab)) {
                    var html = tabs[tab];
                    me.$root
                        .find('#' + tab)
                        .empty()
                        .html(html);
                    if (showSelectedTab) {
                        me.$root
                            .find('.tabs a[href="#' + tab + '"]')
                            .parent()
                            .show();
                    }
                }
            }
            me.initTabControls(selectedTab, showSelectedTab);
            me.initTabEvents();
        }
    },

    initTabControls: function (selectedTab, showSelectedTab) {
        var me = this;

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

        me.$root.find('select').not('.is-customised').customSelect();
        me.$root.find('.placeholders').placeholder();

        if (showSelectedTab) {
            me.tabs.tabs(
                'option',
                'active',
                me.$root
                    .find('.tabs  a[href="#' + selectedTab + '"]')
                    .parent()
                    .index()
            );
        }
    },

    refreshReceiptsList: function () {
        var me = this;
        var accountId = parseInt(
            me.$root.find('#top-bar').attr('data-account-id')
        );

        me.getTabsContent(['importedreceiptslist'], accountId).done(function (
            s
        ) {
            me.initTabContents(s.Data, 'importedreceiptslist');
            me.updateBandsCountInfo();
        });
    },

    refreshTimeline: function () {
        var me = this;
        var accountId = parseInt(
            me.$root.find('#top-bar').attr('data-account-id')
        );

        me.getTabsContent(['timeline'], accountId).done(function (s) {
            me.initTabContents(s.Data, 'timeline', false);
        });
    },

    refreshClientAccounts: function (onComplete) {
        var me = this;
        me.panels.clientAccounts.refresh().done(function (s) {
            if (onComplete && onComplete instanceof Function) {
                onComplete(me);
            }
            me.$root.find('.tabs li').hide();
            var selectedTab = me.$root
                .find('.tabs a[href="#accountlist"]')
                .parent()
                .show();
            me.tabs.tabs('option', 'active', selectedTab.index());
            return s;
        });
    },

    getTabsContent: function (tabs, groupBankAccountId) {
        return new gmgps.cloud.http(
            "receiptImportsHandler-getTabsContent"
        ).ajax({
            args: {
                tabNames: tabs,
                groupBankAccountId: groupBankAccountId
            },
            complex: true,
            dataType: 'json',
            type: 'post',
            url: '/Accounts/GetReceiptImportsTabs'
        });
    },

    displayFileUploadDialog: function () {
        var me = this;

        var accountId = me.$root.find('#top-bar').attr('data-account-id');

        //Show window
        new gmgps.cloud.ui.views.receiptImportsFileUploadWindowHander({
            accountId: accountId,
            title: 'Upload Receipt File',
            actionButton: 'OK',
            onComplete: function () {
                me.refreshReceiptsList();
                me.refreshTimeline();
            }
        }).show();
    },

    displayOpenBankingDialog: function (result) {

        //Show window
        new gmgps.cloud.ui.views.receiptImportsOpenBankingWindowHander({
            importResults: result,
            title: 'Get Transactions',
            actionButton: 'OK',
            initialResult: result
        }).show();
    },

    getTransactionsWithDateRange: function (range) {
        var me = this;

        var accountId = me.$root.find('#top-bar').attr('data-account-id');
        if (!accountId) {
            return;
        }

        // Calculate dates based on range
        var today = new Date();
        var start = new Date();
        var end = new Date();

        today.setHours(0, 0, 0, 0);
        start.setHours(0, 0, 0, 0);
        end.setHours(0, 0, 0, 0);

        // End date is always yesterday
        end.setDate(today.getDate() - 1);

        // Calculate start date based on range
        if (range === 'yesterday') {
            start.setDate(today.getDate() - 1);
        } else if (range === 'previous2') {
            start.setDate(today.getDate() - 2);
        } else if (range === 'previous3') {
            start.setDate(today.getDate() - 3);
        } else if (range === 'previous7') {
            start.setDate(today.getDate() - 7);
        }

        var fromDate = start.toISOString();
        var toDate = end.toISOString();

        // Get the checkbox value
        var includeDuplicates = me.$root.find('#chk-include-duplicates').is(':checked');
        var importOption = includeDuplicates 
            ? C.ReceiptImportFileImportOption.All 
            : C.ReceiptImportFileImportOption.ExceptDuplicates;

        var model = {
            AccountId: parseInt(accountId),
            ImportOption: importOption,
            StartDate: fromDate,
            EndDate: toDate
        };

        // Show loading indicator - disable the Get Transactions button
        var $getTransactionsBtn = me.$root.find('#btn-upload-open-banking');
        $getTransactionsBtn.addClass('disabled');

        new gmgps.cloud.http("openBankingImportsHandler-getOpenBankingTransactions")
            .ajax({
                args: {
                    model: model
                },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/Accounts/GetOpenBankingTransactions'
            })
            .done(function (response) {
                var result = response;
                if (response && response.Data) {
                    result = response.Data;
                }

                if (result && result.Status === C.ReceiptImportFileImportStatus.Success) {
                    me.displayOpenBankingDialog(result);
                    me.refreshReceiptsList();
                    me.refreshTimeline();
                } else {
                    me.displayError('Get Transactions Error', 'An error occurred while retrieving transactions. Please try again or contact Alto Support.');
                }

                $getTransactionsBtn.removeClass('disabled');
            })
            .fail(function () {
                me.displayError('Get Transactions Error', 'An error occurred while retrieving transactions. Please try again or contact Alto Support.');
                $getTransactionsBtn.removeClass('disabled');
            });
    },

    downloadReceiptFile: function (historyEventId) {
        var downloadFile = function () {
            var $input = $(
                '<input type="hidden" id="HistoryEventId" name="HistoryEventId" value="{0}"/>'.format(
                    historyEventId
                )
            );
            var $form = createForm(
                $('<div></div>'),
                'Accounts/GetReceiptImportFileStream'
            );
            $form.append($input);
            $form.append(
                $(
                    '<input type="hidden" id="LogRequest" name="LogRequest" value="true"/>'
                )
            );
            $form.appendTo('body').submit().remove();
        };

        showDialog({
            type: 'question',
            title: 'Receipt Import File Download',
            msg: 'You are about to request a download of this imported receipt file.  Proceed?',
            buttons: {
                Yes: function () {
                    $(this).dialog('close');
                    downloadFile();
                    // SignalR ? me.refreshTimeline();
                },
                No: function () {
                    $(this).dialog('close');
                }
            }
        });
    },

    search: function (filterText) {
        var me = this;
        var trimmedText = filterText.trim().toUpperCase();

        trimmedText = trimmedText.replace(/\s+/g, '');

        var $allItems = me.$root.find('.item-pair');
        me.$root.find('.item-collection').show().removeClass('hidden');

        if (trimmedText.length === 0) {
            $allItems.removeClass('hidden');
            me.updateBandsCountInfo();
            return;
        }

        var $filteredItems = $allItems.filter(function () {
            var $item = $(this);
            var searchText = $item.attr('data-search-text');
            return searchText && searchText.indexOf(trimmedText) !== -1;
        });

        $allItems.not($filteredItems).addClass('hidden');
        $filteredItems.show();

        me.$root.find('.item-collection').each(function () {
            if ($(this).find('.item-pair:not(.hidden)').length === 0) {
                $(this).hide().addClass('hidden');
            }
        });

        me.updateBandsCountInfo();
    },

    findFuzzyMatches: function (e) {
        e.preventDefault();
        e.stopPropagation();

        var $itemPairClicked = $(e.currentTarget).closest('.item-pair');

        // BS: Check receipt item is available for clicked row. If not, use 1st receipt item.
        if ($itemPairClicked.find('.chargedate').text() === '') {
            $itemPairClicked = $(e.currentTarget)
                .closest('.item-collection')
                .find('.item-pair')
                .first();
        }

        var accountId = $itemPairClicked
            .closest('.table-root')
            .data('accountid');
        var receiptReference = $.trim(
            $itemPairClicked.find('.receiptref').text()
        );
        var receiptAmount = Number(
            $itemPairClicked
                .find('.receiptamount')
                .text()
                .replace(/[^0-9.-]+/g, '')
        );
        var receiptId = $.trim(
            $itemPairClicked.find('.receipt-item').data('receiptid')
        );
        var receiptDate = parseUKDate(
            $.trim($itemPairClicked.find('.chargedate').text())
        );
        var currencySymbol = $.trim(
            $itemPairClicked.find('.receipt-item').data('currencysymbol')
        );

        gmgps.cloud.ui.views.receiptImportsFuzzyMatcher.findFuzzyMatches(
            accountId,
            receiptReference,
            receiptAmount,
            receiptDate,
            receiptId,
            currencySymbol,
            $itemPairClicked.closest('.item-collection')
        );
    },

    postReceipts: function () {
        var me = this;

        var postReceiptsModel = me.getPostReceiptsModelData();

        new gmgps.cloud.http("receiptImportsHandler-postReceipts")
            .ajax({
                args: {
                    accountId: postReceiptsModel.accountId,
                    matchList: postReceiptsModel.matchList,
                    sendReceiptOption: postReceiptsModel.sendReceiptOption
                },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/Accounts/UpdateMatchedReceipts'
            })
            .done(function () {
                me.refreshReceiptsList();

                var unmatchedCount = me.$root
                    .find('#un-matched-list')
                    .find('.item-collection').length;

                if (unmatchedCount > 0) {
                    showDialog({
                        type: 'question',
                        title: 'Clear unmatched receipts',
                        msg: 'Would you like to clear the remaining un-matched receipts?',
                        buttons: {
                            Yes: function () {
                                $(this).dialog('close');
                                me.removeUnmatchedItems();
                            },
                            No: function () {
                                $(this).dialog('close');
                            }
                        }
                    });
                }

                // TODO AD-7939 display summary to user; Not required for PHASE 1
                //me.displayReceiptPostingSummary($(r.Data));
            });
    },

    getPostReceiptsModelData: function () {
        var me = this;

        var accountId = parseInt(
            me.$root.find('#top-bar').attr('data-account-id')
        );
        var sendReceiptsOptions = parseInt(
            me.$root.find('#receipt-options').val()
        );

        var postReceiptsModel = {
            accountId: accountId,
            matchList: [],
            sendReceiptOption: sendReceiptsOptions
        };

        var $matchedRows = me.$root
            .find('#matched-list')
            .find('.item-collection');

        $matchedRows.each(function () {
            var $collection = $(this);
            var data = me.getReceiptImportUpdateMatchViewModel($collection);
            postReceiptsModel.matchList.push(data);
        });

        return postReceiptsModel;
    },

    getReceiptIdsForItem: function ($collection) {
        var me = this;
        var idList = [];
        var $linkedReceipts = $collection.find('.receipt-item:not(.blank)');
        $linkedReceipts.each(function () {
            var $receipt = $(this);
            var receiptData = me.getReceiptRowData($receipt);
            idList.push(receiptData.ReceiptImportTransactionId);
        });

        return idList;
    },

    getReceiptImportUpdateMatchViewModel: function ($collection) {
        var me = this;

        var $linkData = $collection
            .find('.charge-item > .row > .contact-tenancy > .preview-link')
            .first();

        var $heldRow = $collection.find('.charge-item.held').first();

        var HeldAmount = 0;

        if ($heldRow.length > 0) {
            HeldAmount = parseFloat($heldRow.attr('data-held-funds'));
        }

        var data = {
            BranchId: parseInt($linkData.attr('data-branchid')),
            LinkedId: parseInt($linkData.attr('data-id')),
            LinkedType: parseInt($linkData.attr('data-modeltypeid')),
            ReceiptImportTransactions: [],
            ChargeTransactions: [],
            HeldFunds: HeldAmount
        };

        var $linkedReceipts = $collection.find('.receipt-item:not(.blank)');
        $linkedReceipts.each(function () {
            var $receipt = $(this);
            var receiptData = me.getReceiptRowData($receipt);
            data.ReceiptImportTransactions.push(receiptData);
        });

        var $linkedCharges = $collection.find(
            '.charge-item:not(.blank):not(.held)'
        );
        $linkedCharges.each(function () {
            var $charge = $(this);
            var chargeData = me.getChargeRowData($charge);
            data.ChargeTransactions.push(chargeData);
        });

        return data;
    },

    getReceiptRowData: function ($receipt) {
        var data = {
            ReceiptImportTransactionId: parseInt(
                $receipt.attr('data-receiptid')
            ),
            ReceiptDate: $receipt.attr('data-receiptdate'),
            ReceiptAmount: parseFloat($receipt.attr('data-receiptamount'))
        };

        return data;
    },

    getChargeRowData: function ($charge) {
        var $linkData = $charge
            .find('.contact-tenancy > .preview-link')
            .first();

        var data = {
            ChargeTransactionId: parseInt($charge.attr('data-transactionid')),
            BranchId: parseInt($linkData.attr('data-branchid')),
            LinkedType: parseInt($linkData.attr('data-modeltypeid')),
            LinkedId: parseInt($linkData.attr('data-id')),
            OutstandingAmount: parseFloat(
                $charge.attr('data-amountoutstanding')
            ),
            VersionNumber: parseInt($charge.attr('data-versionnumber')),
            NominalCode: parseInt($charge.attr('data-nominalcode')),
            AllocatedAmount: parseFloat($charge.attr('data-allocated-amount'))
        };

        return data;
    },

    displayReceiptPostingSummary: function ($content) {
        var me = this;
        //Show window
        new gmgps.cloud.ui.views.receiptImportsSummaryHandler({
            branchId: me.branchId,
            userId: me.userId,
            title: 'Posting of Receipts is Complete',
            $content: $content,
            actionButton: 'OK',
            onComplete: function () {
                //me.refreshReceiptsList();
            }
        }).show();
    },

    forgetPinnedReference: function ($btn) {
        var me = this;
        var $collection = $btn.closest('.item-collection');

        $collection
            .find('#action-buttons')
            .first()
            .removeClass('unmatched')
            .removeClass('selectcharge')
            .removeClass('spacer')
            .removeClass('remembered')
            .addClass('matched');

        $collection.attr('data-pin-action', 'unpin');

        var modelId = $collection.attr('data-pin-to-modelid');
        var modelTypeId = $collection.attr('data-pin-to-modeltypeid');
        var selectedRef = $collection.attr('data-pin-reference');

        me.applyPinStatus(false, modelId, modelTypeId, selectedRef);
    },

    preparePinRererenceDialog: function ($btn, amend, disablePinningToCharge) {
        var me = this;

        var $row = $btn.closest('.item-collection');
        var $charge = $btn.closest('.charge-item');
        var $receipt = $row.find('.receipt-item');

        var requestPinningView = {
            chargeId: $charge.attr('data-transactionid'),
            linkedId: $charge.attr('data-linkedid'),
            modelTypeId: $charge.attr('data-modeltypeid'),
            ReceiptReference: $receipt.attr('data-receipt-reference'),
            CurrencySymbol: $charge.attr('data-currencysymbol')
        };

        new gmgps.cloud.http("receiptImportsHandler-preparePinRererenceDialog")
            .ajax({
                args: {
                    request: requestPinningView
                },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/Accounts/GetPinReferenceDialogDialog'
            })
            .done(function (r) {
                me.displayPinReferenceDialog(
                    $row,
                    $(r.Data),
                    amend,
                    disablePinningToCharge
                );
            });
    },

    displayPinReferenceDialog: function (
        $row,
        $content,
        amend,
        disablePinningToCharge
    ) {
        var me = this;
        var $btn = $row
            .closest('.item-collection')
            .find('#action-buttons')
            .first();

        var $itemCollection = $btn.closest('.item-collection');
        var pinnedToModelTypeId = $itemCollection.attr(
            'data-pin-to-modeltypeid'
        );
        var pinnedToModelId = $itemCollection.attr('data-pin-to-modelid');
        var pinnedUsingRef = $itemCollection.attr('data-pin-reference');

        new gmgps.cloud.ui.views.receiptImportsPinningHandler({
            branchId: me.branchId,
            userId: me.userId,
            $content: $content,
            amendReference: amend,
            pinnedToModelTypeId: pinnedToModelTypeId,
            pinnedUsingRef: pinnedUsingRef,
            disablePinningToCharge: disablePinningToCharge,
            actionButton: 'Pin Reference',
            onComplete: function (resp) {
                // Need to test to see if the ModelTypeId has changed
                // as the user could have switched record type.
                // If so, we need to Un-pin the old record and
                // then pin the returned one

                // --- me.processPinningResponse(resp, $btn);

                if (resp.modelTypeId === pinnedToModelTypeId) {
                    me.processPinningResponse(resp, $btn);
                } else {
                    me.processPinningResponse(resp, $btn);

                    var previousPin = {
                        selectedRef: pinnedUsingRef,
                        modelTypeId: pinnedToModelTypeId,
                        modelId: pinnedToModelId,
                        action: 'unpin'
                    };

                    if (previousPin.modelId > 0) {
                        me.processPinningResponse(previousPin, null);
                    }
                }
            },
            onCancel: function () {}
        }).show();
    },

    processPinningResponse: function (response, $btn) {
        var me = this;

        if ($btn !== null) {
            var $itemCollection = $btn.closest('.item-collection');

            $itemCollection.attr('data-pin-to-modelid', response.modelId);
            $itemCollection.attr(
                'data-pin-to-modeltypeid',
                response.modelTypeId
            );
            $itemCollection.attr('data-pin-reference', response.selectedRef);
            $itemCollection.attr('data-pin-action', response.action);

            $btn.removeClass('matched')
                .removeClass('selectcharge')
                .removeClass('spacer')
                .removeClass('unmatched')
                .addClass('remembered');
        }

        if (response.action === 'pin' || response.action === 'amendpin') {
            me.applyPinStatus(
                true,
                response.modelId,
                response.modelTypeId,
                response.selectedRef
            );
        }

        if (response.action === 'unpin') {
            me.applyPinStatus(
                false,
                response.modelId,
                response.modelTypeId,
                response.selectedRef
            );
        }
    },

    applyPinStatus: function (pin, modelid, modeltypeid, ref) {
        var requestPin = {
            applyPin: pin,
            modelId: modelid,
            modelTypeId: modeltypeid,
            receiptReference: ref
        };

        new gmgps.cloud.http("receiptImportsHandler-applyPinStatus")
            .ajax({
                args: {
                    request: requestPin
                },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/Accounts/ApplyPinnedReferenceAction'
            })
            .done(function (r) {
                console.log(r);
            });
    },

    prepareDuplicateRererenceDialog: function ($btn) {
        var me = this;

        var $row = $btn.closest('.item-collection');
        var $receipt = $row.find('.receipt-item');
        var AccountId = me.$root.find('.table-root').data('accountid');

        var duplicteRefRequest = {
            ReceiptReference: $receipt.attr('data-receipt-reference'),
            CurrencySymbol: $row.attr('data-currencysymbol'),
            AccountId: AccountId
        };

        new gmgps.cloud.http(
            "receiptImportsHandler-prepareDuplicateRererenceDialog"
        )
            .ajax({
                args: {
                    request: duplicteRefRequest
                },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/Accounts/GetDuplicateReferenceDialog'
            })
            .done(function (r) {
                me.displayDuplicateRererenceDialog($row, $(r.Data));
            });
    },

    displayDuplicateRererenceDialog: function ($row, $content) {
        var me = this;

        new gmgps.cloud.ui.views.receiptImportsDuplicateReferenceHandler({
            branchId: me.branchId,
            userId: me.userId,
            $content: $content,
            amendReference: false,
            cancelButton: 'Close',
            onCancel: function () {}
        }).show();
    },

    displayError: function (title, message) {
        showDialog({
            type: 'error',
            title: title,
            msg: message,
            dialogClass: 'openbanking-error',
            width: 500,
            buttons: {
                OK: function () {
                    $(this).dialog('close');
                }
            }
        });
    }
};

gmgps.cloud.ui.views.receiptImportsHandler.addToolTipsForLandlordIncomWarning =
    function ($elementsToApplQtipto) {
        $elementsToApplQtipto.qtip({
            content: {
                text: 'This charge is for a Proposed tenancy. Allocations to this item<br/> can be paid to the Landlord before the Tenancy is finalised.'
            },
            position: {
                viewport: $(window),
                my: 'bottom center',
                at: 'top center'
            },
            show: {
                event: 'mouseenter',
                delay: 0,
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
    };
