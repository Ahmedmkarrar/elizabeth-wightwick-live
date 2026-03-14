gmgps.cloud.ui.views.bankReconciliationHandler = function (args) {
    var me = this;

    me.$root = args.$root;
    me.currencySymbol = '£';
    me.panels = {
        clientAccounts: null,
        reconciliation: null,
        filehistory: null
    };

    me.http = new gmgps.cloud.http(
        "bankReconciliationHandler-bankReconciliationHandler"
    );

    return me;
};

gmgps.cloud.ui.views.bankReconciliationHandler.prototype = {
    init: function (onComplete) {
        var me = this;

        me.initControls(function () {
            if (onComplete && onComplete instanceof Function) {
                onComplete(me);
            }
        });
        me.initEvents();
    },

    initControls: function (onComplete) {
        var me = this;
        me.tabs = me.$root.find('.tabs').tabs();
        if (!me.panels.clientAccounts) {
            me.panels.clientAccounts =
                new gmgps.cloud.ui.views.clientAccountsPanelHandler({
                    $root: me.$root.find('#accountlist'),
                    http: me.http,
                    type: C.AccountCentreActionsType.BankReconciliation,
                    refresh: function () {
                        var accountPanel = this;
                        return me
                            .getTabsContent(['accountlist'])
                            .done(function (s) {
                                me.tabs.find('li').hide();
                                me.initTabContents(s.Data, 'accountlist');
                                accountPanel.initControls();
                                return s;
                            });
                    },
                    sortOrderType: C.BankReconciliationSortOrderType
                }).init();
        }
        me.panels.clientAccounts.refresh().done(function (s) {
            onComplete();
            return s;
        });

        $.extend($.expr[':'], {
            containsi: function (elem, i, match) {
                return (
                    (elem.textContent || elem.innerText || '')
                        .toLowerCase()
                        .indexOf((match[3] || '').toLowerCase()) >= 0
                );
            }
        });
    },
    initEvents: function () {
        var me = this,
            namespace = '.BankReconciliationHandler';

        me.$root.off(namespace);

        me.$root.on(
            'click' + namespace,
            '.view-account',
            showClientAccountDetail
        );

        me.$root.on(
            'click' + namespace,
            '.payment-item .thumb-border',
            function (e) {
                e.stopPropagation();
                me.updateReconciliationFilter();
                var btn = $(e.currentTarget),
                    icon = btn.find('.icon-thumbs'),
                    $item = btn.closest('.payment-item');
                var reconcile = icon.hasClass('up');

                me.updateReconciledStatus(
                    $item,
                    reconcile,
                    updateUIHandler($item, reconcile)
                );
            }
        );

        me.$root.on('click' + namespace, '.header-row .btn', function (e) {
            e.stopPropagation();

            var $items,
                btn = $(e.currentTarget),
                icon = btn.find('.icon'),
                reconcile = icon.hasClass('up');

            if (reconcile) {
                $items = me.$root.find('.unreconciled .payment-item');
            } else {
                $items = me.$root.find('.reconciled .payment-item');
            }

            if ($items.length > 0) {
                me.updateReconciledStatus(
                    $items,
                    reconcile,
                    updateUIHandler($items, reconcile)
                );
            }
        });

        me.$root.on('click' + namespace, '.header-row', function (e) {
            if ($(e.target).hasClass('header-row')) {
                $(this).next().slideToggle('fast');
            }
        });

        me.$root.on(
            'click' + namespace,
            '.payment-item:not(.single)',
            function () {
                $(this)
                    .find('.transactions')
                    .slideToggle('fast', function () {
                        var $drop = $(this)
                            .closest('.payment-item')
                            .find('.fa:first');
                        if ($(this).is(':visible')) {
                            $drop
                                .removeClass('fa-angle-down')
                                .addClass('fa-angle-up');
                        } else {
                            $drop
                                .removeClass('fa-angle-up')
                                .addClass('fa-angle-down');
                        }
                    });
            }
        );

        me.$root.on(
            'mouseover' + namespace,
            '.partialBatchUnreconciled',
            function () {
                var $qtipElement = $(this);
                if ($qtipElement.hasClass('hasTooltip')) {
                    return;
                }
                $qtipElement
                    .qtip({
                        style: {
                            tip: true,
                            classes: 'qtip-dark'
                        },
                        content: 'Partial batch has been unreconciled',
                        show: 'mouseover',
                        hide: 'mouseout'
                    })
                    .qtip('show');
                $qtipElement.addClass('hasTooltip');
            }
        );

        me.$root.on(
            ['keyup', ' blur', undefined].join(namespace),
            '#SearchReconciliation',
            $.debounce(350, false, reconciliationSearch)
        );

        me.$root.on(
            'click' + namespace,
            '.update-reconciliation:not(.disabled)',
            function () {
                var $btn = $(this);

                $btn.addClass('disabled');

                var $f = me.$root.clone();

                var statementNumber = $f.find('#StatementNumber').val();
                if (!$.isNumeric(statementNumber) || statementNumber < 1) {
                    me.$root
                        .find('#StatementNumber')
                        .validationEngine(
                            'showPrompt',
                            'A valid statement number is required.',
                            'x',
                            'topLeft',
                            true
                        );
                    $btn.removeClass('disabled');
                    return false;
                }

                //reindex items
                //      $f.find('div.reconciled .payment-item .transaction .item').each(function (i) {
                $f.find('.payment-item .transaction .item').each(function (i) {
                    $(this)
                        .find('input[type=hidden]')
                        .each(function () {
                            $(this).attr(
                                'id',
                                $(this)
                                    .attr('id')
                                    .replace('[]', '[{0}]'.format(i))
                            );
                            $(this).attr(
                                'name',
                                $(this)
                                    .attr('name')
                                    .replace('[]', '[{0}]'.format(i))
                            );
                        });
                });

                me.updateReconciliation($f).done(function (r) {
                    if (r && r.Data) {
                        $.jGrowl('Reconciliation Updated', {
                            theme: 'growl-tenancy',
                            header: 'Accounts Centre'
                        });
                        me.panels.clientAccounts.refresh();
                    }
                    $btn.removeClass('disabled');
                });
            }
        );

        me.$root.on('change' + namespace, '#ReconciliationDate', function () {
            var reconciliationDate = me.$root.find('#ReconciliationDate').val();
            var accountId = me.$root.find('#AccountId').val();

            me.getTabsContent(
                ['reconciliation', 'filehistory'],
                accountId,
                reconciliationDate
            ).done(function (s) {
                // hide all tabs first - we want to hide the Account List Tab, so if we update its not 'out of date'
                me.$root.find('.tabs li').hide();
                me.initTabContents(s.Data, 'reconciliation');
                me.initTabControls();
            });
        });

        me.$root.on('change' + namespace, '#StatementBalance', function () {
            me.updateBalances();
            //me.toggleUpdateButton();
        });

        function showClientAccountDetail() {
            var $this = $(this);
            var accountId = $this.data('id');
            var accountName = $this.data('name');
            var paymentCount = $this.data('payment-count');

            var $accountsList = $this.closest('div.accounts-list');
            var paymentViewLimit = parseInt($accountsList.data('payment-view-limit'));

            var viewTabCallback = function () {
                me.getTabsContent(
                    ['reconciliation', 'filehistory'],
                    accountId
                ).done(function (s) {
                    // hide all tabs first - we want to hide the Account List Tab, so if we update its not 'out of date'
                    me.$root.find('.tabs li').hide();
                    me.$root.find('#accountdetail-name').text(accountName);
                    me.initTabContents(s.Data, 'reconciliation');
                    me.initTabControls();
                })
            };

            if (paymentCount <= paymentViewLimit) {
                viewTabCallback();
            } else {
                showAutoReconciliationModal(accountId, accountName, paymentCount, viewTabCallback);
            }        
        }

        function showAutoReconciliationModal(
            accountId,
            accountName,
            paymentCount,
            viewCallback
        ) {
            var startDate = new Date();
            startDate.setMonth(startDate.getMonth() - 1);
            var startDateString = startDate.getDate() + '/' + (startDate.getMonth() + 1) + '/' + startDate.getFullYear();

            var today = new Date();
            var todayString = today.getDate() + '/' + (today.getMonth() + 1) + '/' + today.getFullYear();

            showDialog({
                title: 'Bank Reconciliation - ' + accountName,
                type: 'hidden',
                msg:
                    'This bank account has ' + paymentCount + ' unreconciled transactions!<br /><br />' +
                    'Would you like to automatically reconcile ALL transactions up to a date of your choice?<br /><br />' +
                    'Select a date to reconcile up to, then click &ldquo;Auto Reconcile&rdquo;, the Bank Reconciliation screen will ' +
                    'then open showing all remaining unreconciled transactions.<br /><br />' +
                    '<div class="tr">' +
                    '<form><div>' +
                    '<input type="hidden" autofocus="autofocus" />' +
                    '<label class="mr5" for="autoRec1">Reconcile transactions up to &amp; including</label>' +
                    '<input class="p4 icon-cal" type="text" value="' + startDateString + '" id="autoRec1" name="autoRecDate" />' +
                    '</div></form>' +
                    '</div><br />' +
                    'Alternatively, select &ldquo;Attempt to Open Anyway&rdquo; to open the Bank Reconciliation with all transactions unreconciled. ' +
                    'Please note it may take several minutes to load with a large number of unreconciled transactions.<br /><br />' +
                    'Please visit &lsquo;<a href="https://support.altosoftware.co.uk/hc/en-gb/articles/360007773617-Bank-Reconciliation" ' +
                    'target="_blank">bank reconciliation article</a>&rsquo; for further details regarding Bank Reconciliation.<br /> ',
                create: function (event) {
                    var $datePickerField = $(event.target)
                        .closest('.ui-dialog')
                        .find('input[name="autoRecDate"]');

                    $datePickerField.datepicker({
                        numberOfMonths: 2,
                        showButtonPanel: true,
                        dateFormat: 'dd/mm/yy',
                        maxDate: todayString
                    });
                },
                buttons: {
                    "Auto Reconcile": function () {
                        var autoRecDate =
                            $(this)
                                .closest('.dialog')
                                .find('input[name="autoRecDate"]')
                                .val();

                        me.http.ajax({
                            args: {
                                groupBankAccountId: accountId,
                                inclusiveEndDate: autoRecDate
                            },
                            background: false,
                            complex: true,
                            dataType: 'json',
                            type: 'post',
                            url: '/Accounts/AutoReconcilePayments',
                        },
                            function () {
                                me.panels.clientAccounts.refresh().done(function () {
                                    var updatedCount = parseInt($('.view-account[data-id="' + accountId + '"]')
                                        .closest('.clientaccount')
                                        .data('count'));

                                    if (updatedCount > 0) {
                                        viewCallback();
                                    }
                                });
                            });

                        $(this).dialog('close');
                    },
                    "Attempt to Open Anyway": function () {
                        $(this).dialog('close');
                        viewCallback();

                        return true;
                    },
                    Close: function () {
                        $(this).dialog('close');

                        return false;
                    }
                }
            });
        }

        function updateUIHandler($item, reconcile) {
            return function updateUI(success) {
                var newRow = reconcile
                    ? '.reconciled .content'
                    : '.unreconciled .content';
                var color = reconcile ? '#98fb98' : '#fe3a5a';
                if (success) {
                    me.moveItemBetweenGroups(
                        $item,
                        me.$root.find(newRow),
                        color,
                        function () {
                            me.updateCounts();
                            me.updateBalances();
                        }
                    );
                }
            };
        }
        function reconciliationSearch(e) {
            me.updateReconciliationFilter(e.currentTarget.value);
        }
    },
    initTabContents: function (tabs, selectedTab) {
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
                    me.$root
                        .find('.tabs a[href="#' + tab + '"]')
                        .parent()
                        .show();
                }
            }
        }

        //tabs are already inited, set the active one.
        me.tabs.tabs(
            'option',
            'active',
            me.$root
                .find('.tabs  a[href="#' + selectedTab + '"]')
                .parent()
                .index()
        );
    },

    initTabControls: function () {
        var me = this;

        me.currencySymbol = me.$root.find('#CurrencySymbol').val(); // other tabs

        me.$root.find('select').not('.is-customised').customSelect();
        me.$root.find('.placeholders').placeholder();
        me.$root.find('.date-picker').each(function (i, v) {
            var minDate =
                me.$root.find('#LastReconciledDate').val() == null
                    ? new Date()
                    : me.$root.find('#LastReconciledDate').val();
            $(v).datepicker({
                numberOfMonths: 2,
                showButtonPanel: true,
                dateFormat: 'dd/mm/yy',
                minDate:
                    $(v).attr('data-datePickerMode') === 'future'
                        ? minDate
                        : null
            });
        });
        me.$root
            .find('.opt-inputmask-numeric.amount-input')
            .inputmask('currency', {
                radixPoint: '.',
                groupSeparator: ',',
                digits: 2,
                autoGroup: true,
                prefix: me.currencySymbol,
                rightAlign: false,
                min: 0.0
            });

        me.updateCounts();
        me.updateBalances();
    },

    getTabsContent: function (tabs, groupBankAccountId, date) {
        return new gmgps.cloud.http(
            "bankReconciliationHandler-getTabsContent"
        ).ajax({
            args: {
                tabNames: tabs,
                groupBankAccountId: groupBankAccountId,
                date: date
            },
            complex: true,
            dataType: 'json',
            type: 'post',
            url: '/Accounts/GetBankReconciliationTabs'
        });
    },

    updateBalances: function () {
        var me = this;
        var openingBalance = new Decimal(
            me.$root.find('.opening-balance').asNumber()
        );
        var statementBalance = new Decimal(
            me.$root.find('#StatementBalance').asNumber()
        );

        var differenceLabel = me.$root.find('.rec-difference');
        var unreconciledTotalLabel = me.$root.find('.total-unreconciled');
        var reconciledTotalLabel = me.$root.find('.total-reconciled');

        var unreconciledTotal = new Decimal(0);
        var reconciledTotal = new Decimal(0);

        me.$root
            .find('div.unreconciled .payment-item .receiptAmount')
            .each(function () {
                unreconciledTotal = unreconciledTotal.add(
                    new Decimal($(this).asNumber())
                );
            });

        me.$root
            .find('div.unreconciled .payment-item .paymentAmount')
            .each(function () {
                unreconciledTotal = unreconciledTotal.sub(
                    new Decimal($(this).asNumber())
                );
            });

        me.$root
            .find('div.reconciled .payment-item .receiptAmount')
            .each(function () {
                reconciledTotal = reconciledTotal.add(
                    new Decimal($(this).asNumber())
                );
            });

        me.$root
            .find('div.reconciled .payment-item .paymentAmount')
            .each(function () {
                reconciledTotal = reconciledTotal.sub(
                    new Decimal($(this).asNumber())
                );
            });

        reconciledTotal = reconciledTotal.add(openingBalance);

        var differenceTotal = new Decimal(statementBalance).sub(
            reconciledTotal
        );

        unreconciledTotalLabel.text(
            $.inputmask.format(unreconciledTotal.toFixed(2), {
                alias: 'currency',
                prefix: me.currencySymbol
            })
        );
        reconciledTotalLabel.text(
            $.inputmask.format(reconciledTotal.toFixed(2), {
                alias: 'currency',
                prefix: me.currencySymbol
            })
        );
        differenceLabel.text(
            $.inputmask.format(differenceTotal.toFixed(2), {
                alias: 'currency',
                prefix: me.currencySymbol
            })
        );

        me.$root.find('#TotalReconciled').val(reconciledTotal.toFixed(2));

        me.toggleUpdateButton();
    },

    updateCounts: function () {
        var me = this;

        var unreconciledCountLabel = me.$root.find('.unreconciled-count');
        var reconciledCountLabel = me.$root.find('.reconciled-count');

        unreconciledCountLabel.html(
            me.$root.find('div.unreconciled .payment-item').length
        );
        reconciledCountLabel.html(
            me.$root.find('div.reconciled .payment-item').length
        );
    },

    updateReconciliationFilter: function (filterText) {
        var me = this;
        var searchResult = me.$root.find('.search-results');
        var resultItems = searchResult.hide().find('.payment-item');

        var reconciled = me.$root.find('.reconciled');
        var unreconciled = me.$root.find('.unreconciled');
        var both = $().add(reconciled).add(unreconciled);

        if (!filterText) {
            me.$root.find('#SearchReconciliation').val('');
            if (resultItems.length === 0) {
                both.show();
                return;
            }
        }

        var reconciledContent = reconciled.find('.content');
        var unreconciledContent = unreconciled.find('.content');

        both.hide();

        resultItems.each(putBack);

        if (filterText) {
            var filter = both.find(
                '.col:containsi(' +
                    filterText +
                    '), .col[data-search-text*="' +
                    filterText +
                    '"]'
            );
            var results = filter
                .closest('.payment-item')
                .appendTo('.search-results .content');
            searchResult.find('.search-total').text(results.length);
            me.sortReconciliationItems(results);
            searchResult.show();
        } else {
            me.sortReconciliationItems(reconciledContent);
            me.sortReconciliationItems(unreconciledContent);
            both.show();
        }

        function putBack(i, v) {
            var $v = $(v);
            if ($v.find('.icon-thumbs.up').length > 0) {
                $v.appendTo(unreconciledContent);
            } else {
                $v.appendTo(reconciledContent);
            }
        }
    },

    sortReconciliationItems: function (v) {
        var items = v.find('.payment-item');

        items.detach().sort(sortByData).appendTo(v);

        function sortByData(a, b) {
            var aData = $(a).data('sortable');
            var bData = $(b).data('sortable');
            var result = aData[0] - bData[0];
            if (result === 0) {
                result = aData[1] - bData[1];
            }
            return result;
        }
    },

    reSort: function (sortOrder) {
        var me = this;

        var dataAttribute = null;

        var orderDescending = false;

        switch (sortOrder) {
            case C.BankReconciliationSortOrderType.LastReconciled:
                dataAttribute = 'data-reconciliation-date';
                orderDescending = true;
                break;
        }

        if (dataAttribute) {
            var $allItems = me.$root.find('.accounts-list');

            $allItems
                .find('.clientaccount')
                .sort(function (a, b) {
                    if (orderDescending) {
                        return (
                            $(b).attr(dataAttribute) - $(a).attr(dataAttribute)
                        );
                    } else {
                        return (
                            $(a).attr(dataAttribute) - $(b).attr(dataAttribute)
                        );
                    }
                })
                .appendTo($allItems);
        }
    },

    initTabs: function (selectedTab) {
        var me = this;

        me.$root.off();

        me.currencySymbol = me.$root.find('#CurrencySymbol').val();

        me.$root.find('select').not('.is-customised').customSelect();

        me.$root.find('.tabs').tabs({
            active: me.$root
                .find('.tabs  a[href="#' + selectedTab + '"]')
                .parent()
                .index()
        });

        me.$root.on('click', '.view-account', function () {
            var $this = $(this);
            var accountId = $this.data('id');
            var accountName = $this.data('name');

            me.getTabsContent(
                ['reconciliation', 'filehistory'],
                accountId
            ).done(function (s) {
                // hide all tabs first - we want to hide the Account List Tab, so if we update its not 'out of date'
                me.$root.find('.tabs li').hide();

                me.$root.find('#accountdetail-name').text(accountName);
                me.initTabContents(s.Data, 'reconciliation');
            });
        });

        me.$root.on('click', '.payment-item .thumb-border', function (e) {
            e.stopPropagation();
            me.updateReconciliationFilter();
            var btn = $(e.currentTarget),
                icon = btn.find('.icon-thumbs'),
                $item = btn.closest('.payment-item');
            var reconcile = icon.hasClass('up');
            me.updateReconciledStatus(
                $item,
                reconcile,
                updateUIHandler($item, reconcile)
            );
        });

        me.$root.on('click', '.header-row .btn', function (e) {
            e.stopPropagation();

            var $items,
                btn = $(e.currentTarget),
                icon = btn.find('.icon'),
                reconcile = icon.hasClass('up');

            if (reconcile) {
                $items = me.$root.find('.unreconciled .payment-item');
            } else {
                $items = me.$root.find('.reconciled .payment-item');
            }

            if ($items.length > 0) {
                me.updateReconciledStatus(
                    $items,
                    reconcile,
                    updateUIHandler($items, reconcile)
                );
            }
        });

        me.$root.on('click', '.header-row', function (e) {
            if ($(e.target).hasClass('header-row')) {
                $(this).next().slideToggle('fast');
            }
        });

        me.$root.on('click', '.payment-item', function () {
            $(this).find('.transactions').slideToggle('fast');
        });

        me.$root.find('.placeholders').placeholder();

        me.$root.on(
            'keyup blur',
            '#SearchAccounts',
            $.debounce(350, false, accountSearch)
        );
        me.$root.on(
            'keyup blur',
            '#SearchReconciliation',
            $.debounce(350, false, reconciliationSearch)
        );

        me.$root.on('change', '#SortOrder', function () {
            me.reSort(parseInt($(this).val()));
        });
        me.$root.find('.date-picker').each(function (i, v) {
            var minDate =
                me.$root.find('#LastReconciledDate').val() == null
                    ? new Date()
                    : me.$root.find('#LastReconciledDate').val();
            $(v).datepicker({
                numberOfMonths: 2,
                showButtonPanel: true,
                dateFormat: 'dd/mm/yy',
                minDate:
                    $(v).attr('data-datePickerMode') === 'future'
                        ? minDate
                        : null
            });
        });

        me.$root.on(
            'click',
            '.update-reconciliation:not(.disabled)',
            function () {
                var $btn = $(this);

                $btn.addClass('disabled');

                var $f = me.$root.clone();

                var statementNumber = $f.find('#StatementNumber').val();
                if (!$.isNumeric(statementNumber) || statementNumber < 1) {
                    me.$root
                        .find('#StatementNumber')
                        .validationEngine(
                            'showPrompt',
                            'A valid statement number is required.',
                            'x',
                            'topLeft',
                            true
                        );
                    $btn.removeClass('disabled');
                    return false;
                }

                //reindex items
                $f.find('.payment-item .transaction .item').each(function (i) {
                    $(this)
                        .find('input[type=hidden]')
                        .each(function () {
                            $(this).attr(
                                'id',
                                $(this)
                                    .attr('id')
                                    .replace('[]', '[{0}]'.format(i))
                            );
                            $(this).attr(
                                'name',
                                $(this)
                                    .attr('name')
                                    .replace('[]', '[{0}]'.format(i))
                            );
                        });
                });

                me.updateReconciliation($f).done(function (r) {
                    if (r && r.Data) {
                        $.jGrowl('Reconciliation Updated', {
                            theme: 'growl-tenancy',
                            header: 'Accounts Centre'
                        });
                        me.container.reinitHandler(
                            C.AccountCentreActionsType.BankReconciliation
                        );
                    }

                    $btn.removeClass('disabled');
                });
            }
        );

        me.$root
            .find('.opt-inputmask-numeric.amount-input')
            .inputmask('currency', {
                radixPoint: '.',
                groupSeparator: ',',
                digits: 2,
                autoGroup: true,
                prefix: me.currencySymbol,
                rightAlign: false,
                min: 0.0
            });

        me.$root.on('change', '#ReconciliationDate', function () {
            var reconciliationDate = me.$root.find('#ReconciliationDate').val();
            var accountId = me.$root.find('#AccountId').val();

            me.getTabsContent(
                ['reconciliation', 'filehistory'],
                accountId,
                reconciliationDate
            ).done(function (s) {
                // hide all tabs first - we want to hide the Account List Tab, so if we update its not 'out of date'
                me.$root.find('.tabs li').hide();

                me.initTabContents(s.Data, 'reconciliation');
            });
        });

        me.$root.on('change', '#StatementBalance', function () {
            me.updateBalances();
            //me.toggleUpdateButton();
        });

        me.updateCounts();
        me.updateBalances();
        //me.toggleUpdateButton();

        function updateUIHandler($item, reconcile) {
            return function updateUI(success) {
                var newRow = reconcile
                    ? '.reconciled .content'
                    : '.unreconciled .content';
                var color = reconcile ? '#98fb98' : '#fe3a5a';
                if (success) {
                    me.moveItemBetweenGroups(
                        $item,
                        me.$root.find(newRow),
                        color,
                        function () {
                            me.updateCounts();
                            me.updateBalances();
                        }
                    );
                }
            };
        }
        function reconciliationSearch(e) {
            me.updateReconciliationFilter(e.currentTarget.value);
        }
        function accountSearch(e) {
            me.updateFilter(e.currentTarget.value);
        }
    },

    updateReconciledStatus: function ($items, reconciled, onComplete) {
        var me = this;

        // update hidden input for recon status
        $items.find('.transaction .item').each(function () {
            $(this)
                .find('input[type=hidden][name="Items[].IncOnReconciliation"]')
                .each(function () {
                    $(this).val(reconciled ? 'True' : 'False');
                });
        });

        //reindex items to send after cloning
        var $f = $items.clone();

        $f.find('.transaction .item').each(function (i) {
            $(this)
                .find('input[type=hidden]')
                .each(function () {
                    $(this).attr(
                        'id',
                        $(this).attr('id').replace('[]', '[{0}]'.format(i))
                    );
                    $(this).attr(
                        'name',
                        $(this).attr('name').replace('[]', '[{0}]'.format(i))
                    );
                });
        });

        me.setItemsToBeReconciled($f).done(function (r) {
            if (r && r.Data) {
                me.updateViewAfterItemReconciling($items, reconciled);
                onComplete(true);
            } else {
                $items.each(function () {
                    $(this)
                        .find(
                            'input[type=hidden][name="Items[].IncOnReconciliation"]'
                        )
                        .each(function () {
                            $(this).val(reconciled ? 'False' : 'True');
                        });
                });
            }
            onComplete(false);
        });
    },

    updateViewAfterItemReconciling: function ($item, isReconciled) {
        var me = this;

        //increment version number
        $item
            .find(
                '.transactions input[type=hidden][name="Items[].VersionNumber"]'
            )
            .each(function () {
                $(this).val($(this).asNumber() + 1);
            });
        if (isReconciled) {
            $item
                .find('.icon-thumbs')
                .removeClass('up')
                .addClass('down')
                .attr('title', 'Unreconcile');
            $item
                .closest('.payment-item')
                .find('.partialBatchUnreconciled')
                .remove();
        } else {
            $item
                .find('.icon-thumbs')
                .removeClass('down')
                .addClass('up')
                .attr('title', 'Reconcile');
        }

        me.toggleUpdateButton();
    },

    toggleUpdateButton: function () {
        var me = this;
        var difference = me.$root.find('.rec-difference').asNumber();
        if (
            difference === 0 &&
            me.$root.find('div.reconciled .payment-item').length > 0
        ) {
            me.$root.find('.update-reconciliation').removeClass('disabled');
        } else {
            if (!me.$root.find('.update-reconciliation').hasClass('disabled')) {
                me.$root.find('.update-reconciliation').addClass('disabled');
            }
        }
    },

    updateReconciliation: function ($f) {
        return new gmgps.cloud.http(
            "bankReconciliationHandler-updateReconciliation"
        ).ajax({
            args: {
                viewModel: createForm($f).serializeObject()
            },
            complex: true,
            dataType: 'json',
            type: 'post',
            url: '/Accounts/ReconcileAccount'
        });
    },

    setItemsToBeReconciled: function ($items) {
        var me = this;

        var $reconciliationDate = me.$root.find('#ReconciliationDate').clone();
        var $accountId = me.$root.find('#AccountId').clone();

        return new gmgps.cloud.http(
            "bankReconciliationHandler-setItemsToBeReconciled"
        ).ajax({
            args: createForm(
                $('<div></div>')
                    .append($items)
                    .append($reconciliationDate)
                    .append($accountId)
            ).serializeObject(),
            complex: true,
            dataType: 'json',
            type: 'post',
            url: '/Accounts/SetItemsToBeReconciled'
        });
    },

    moveItemBetweenGroups: function (
        $items,
        $destination,
        bgColor,
        onComplete
    ) {
        $items.css('background-color', bgColor);
        $items
            .animate(
                { height: 'toggle', opacity: 0 },
                'fast',
                'linear',
                function () {
                    var item = $(this)
                        .appendTo($destination)
                        .css({ opacity: 1 })
                        .show();
                    var data = item.data('sortable');
                    data[0] = data[0] === 1 ? 0 : 1;
                }
            )
            .promise()
            .done(function () {
                // flash newly moved item, but not if all items being moved else it doesnt look nice
                if ($items.length === 1) {
                    $items.effect('highlight', { color: '#ffffe0' }, 950);
                }
                onComplete();
            });
        $items.css('background-color', '');
    }
};
