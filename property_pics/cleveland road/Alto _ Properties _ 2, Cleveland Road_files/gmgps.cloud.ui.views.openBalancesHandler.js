gmgps.cloud.ui.views.openBalancesHandler = function (args) {
    var me = this;

    me.$root = args.$root;

    me.container = args.container;
    me.panels = {
        clientAccounts: null
    };

    return me;
};
gmgps.cloud.ui.views.openBalancesHandler.prototype = {
    groupBankAccountId: 0,
    arrearsTarget: 0,
    clientAccountTargets: {},

    getArrearsToAllocate: function () {
        var me = this;
        var amountToPost = me.$root.find('#arrears .toallocate').asNumber();
        return amountToPost;
    },

    getClientAccountTarget: function (accountId) {
        if (this.clientAccountTargets[accountId] === undefined) {
            this.clientAccountTargets[accountId] = 0;
        }
        return this.clientAccountTargets[accountId];
    },

    setClientAccountTarget: function (accountId, target) {
        this.clientAccountTargets[accountId] = target;
    },

    getArrearsDifference: function () {
        return this.arrearsTarget - this.getArrearsToAllocate();
    },

    getClientTransactionsToAllocate: function () {
        var me = this;
        var amountToPost = me.$root
            .find('#openingbalances .toallocate')
            .asNumber();
        return amountToPost;
    },

    getClientAccountDifference: function () {
        return (
            this.getClientAccountTarget(this.groupBankAccountId) -
            this.getClientTransactionsToAllocate()
        );
    },

    formatAsCurrency: function (value) {
        return $.inputmask.format(value.toFixed(2), {
            alias: 'currency',
            prefix: this.currencySymbol || '£'
        });
    },

    init: function (onComplete) {
        var me = this;
        if (!me.panels.clientAccounts) {
            me.panels.clientAccounts =
                new gmgps.cloud.ui.views.clientAccountsPanelHandler({
                    $root: me.$root.find('#accountlist'),
                    type: C.AccountCentreActionsType.OpeningBalances,
                    refresh: function (cb) {
                        var accountsPanel = this;
                        return me.initSummary(function () {
                            accountsPanel.initSortControl();
                            if (cb && cb instanceof Function) {
                                cb();
                            }
                        });
                    }
                }).init();
        }
        me.panels.clientAccounts.refresh(onComplete);
    },

    initSummary: function (onComplete) {
        var me = this;

        return me.getSummaryTab().done(function (s) {
            me.$root.find('.tabs li').hide();
            me.initTabContents(s.Data, 'accountlist');
            if (onComplete && onComplete instanceof Function) {
                onComplete();
            }
        });
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
            me.initTabControls(selectedTab);
            me.initTabEvents();
        }
    },

    getSummaryTab: function () {
        return new gmgps.cloud.http("openBalancesHandler-getSummaryTab").ajax({
            args: {},
            complex: true,
            dataType: 'json',
            type: 'post',
            url: '/Accounts/GetOpeningBalancesLayer'
        });
    },

    initTabEvents: function () {
        var me = this;
        var namespace = '.OpeningBalancesHandler';
        me.$root.off(namespace);

        me.$root.on('click' + namespace, '.view-account', function () {
            var $this = $(this);
            var accountId = $this.data('id');
            var accountName = $this.data('name');
            me.groupBankAccountId = parseInt(accountId, 10);
            me.getTabsContent(['openingbalances'], accountId).done(function (
                s
            ) {
                // hide all tabs first - we want to hide the Account List Tab, so if we update its not 'out of date'
                me.$root.find('.tabs li').hide();
                me.$root
                    .find('#balances-accountdetail-name')
                    .text('Balances for ' + accountName);
                me.initTabContents(s.Data, 'openingbalances');
            });
        });

        me.$root.on(
            'click' + namespace,
            '#openingbalances .nextprev:not(.disabled)',
            function () {
                var $this = $(this);
                var groupBankAccountId = parseInt(
                    me.$root.find('.selectedgroupbankaccountid').val()
                );
                me.getBalancePage(
                    groupBankAccountId,
                    parseInt($this.attr('data-page'))
                );
            }
        );

        me.$root.on(
            'click' + namespace,
            '#arrears .nextprev:not(.disabled)',
            function () {
                var $this = $(this);
                me.getArrearsPage(parseInt($this.attr('data-page')));
            }
        );

        me.$root.on(
            'change' + namespace,
            '#openingbalances #TargetRoleType',
            function () {
                me.selectAutoComplete(
                    me.$root.find('#openingbalances'),
                    parseInt($(this).val())
                );
            }
        );

        me.$root.on(
            'change' + namespace,
            '#arrears #TargetRoleType',
            function () {
                me.selectAutoComplete(
                    me.$root.find('#arrears'),
                    parseInt($(this).val())
                );
            }
        );

        me.$root.on(
            'change' + namespace,
            '#openingbalances #OpeningBalanceTargetAmount',
            function () {
                var $this = $(this);
                me.setClientAccountTarget(
                    me.groupBankAccountId,
                    $this.asNumber()
                );
                me.setClientAccountDifference();
                me.setPostBalancesButtonState();
            }
        );

        me.$root.on(
            'change' + namespace,
            '#arrears #ArrearsTargetAmount',
            function () {
                var $this = $(this);
                me.arrearsTarget = $this.asNumber();
                me.setArrearsDifference();
                me.setPostArrearsButtonState();
            }
        );

        me.$root.on(
            'change' + namespace,
            '#openingbalances #OpeningBalance_DefaultItemDate',
            function () {
                var $this = $(this);
                var groupBankAccountId = parseInt(
                    me.$root.find('.selectedgroupbankaccountid').val()
                );
                me.updateBalanceDefaultDate(
                    groupBankAccountId,
                    $this.val()
                ).done(function () {
                    me.getBalancePage(groupBankAccountId, 1);
                });
            }
        );

        me.$root.on(
            'change' + namespace,
            '#arrears #Arrears_DefaultItemDate',
            function () {
                var $this = $(this);
                me.updateArrearsDefaultDate($this.val()).done(function () {
                    me.getArrearsPage(1);
                });
            }
        );

        me.$root.on(
            'click' + namespace,
            '#openingbalances .commit-charges:not(.disabled)',
            function () {
                var $this = $(this);
                var balanceAmount = new Decimal($this.data('balanceamount'));
                var heldMoneyAmount = new Decimal(
                    $this.data('heldmoneyamount')
                );
                var retentionAmount = new Decimal(
                    $this.data('retentionamount')
                );

                me.commitOpeningBalances(
                    balanceAmount.toFixed(2),
                    heldMoneyAmount.toFixed(2),
                    retentionAmount.toFixed(2)
                ).done(function () {
                    me.setClientAccountTarget(me.groupBankAccountId, 0);
                    var groupBankAccountId = parseInt(
                        me.$root.find('.selectedgroupbankaccountid').val()
                    );
                    me.getBalancePage(groupBankAccountId, 1);
                });
            }
        );

        me.$root.on(
            'click' + namespace,
            '#arrears .commit-charges:not(.disabled)',
            function () {
                var amountToPost = me.$root
                    .find('#arrears .toallocate')
                    .asNumber();
                me.commitArrears(amountToPost).done(function () {
                    me.arrearsTarget = 0;
                    me.panels.clientAccounts.refresh();
                });
            }
        );

        me.$root.on(
            'click' + namespace,
            '#openingbalances .edit-balance[data-isbalance="1"] td:not(.col6)',
            function () {
                var $this = $(this).closest('tr');

                var linkedTypeId = parseInt($this.attr('data-linkedtypeid'));

                var linkedId = parseInt($this.attr('data-linkedid'));

                var chargeId = parseInt($this.attr('data-chargeid'));

                me.editBalanceCharge(
                    0,
                    linkedTypeId,
                    linkedId,
                    chargeId,
                    'Edit opening balance for {0}'.format(
                        $this.find('.col2').text()
                    )
                );
            }
        );

        me.$root.on(
            'click' + namespace,
            '#openingbalances .edit-balance[data-ismoney="1"] td:not(.col6)',
            function () {
                var $this = $(this).closest('tr');
                var id = parseInt($this.attr('data-chargeid'));
                var linkedId = parseInt($this.attr('data-linkedid'));
                var linkedTypeId = parseInt($this.attr('data-linkedtypeid'));
                me.editHeldMoney(id, linkedId, linkedTypeId);
            }
        );

        me.$root.on(
            'click' + namespace,
            '#openingbalances .edit-balance[data-isretention="1"] td:not(.col6)',
            function () {
                var $this = $(this).closest('tr');
                var id = parseInt($this.attr('data-chargeid'));
                var contactId = parseInt($this.attr('data-linkedId'));
                me.editRetention(contactId, id);
            }
        );

        me.$root.on(
            'click' + namespace,
            '#arrears .edit-balance td:not(.col6)',
            function () {
                var $this = $(this).closest('tr');

                var linkedTypeId = parseInt($this.attr('data-linkedtypeid'));

                var linkedId = parseInt($this.attr('data-linkedid'));

                var chargeId = parseInt($this.attr('data-chargeid'));

                me.editArrearsCharge(
                    0,
                    linkedTypeId,
                    linkedId,
                    chargeId,
                    'Edit arrears item for {0}'.format(
                        $this.find('.col2').text()
                    )
                );
            }
        );

        me.$root.on(
            'click' + namespace,
            '.add-balance-container .add-balance',
            function () {
                var $this = $(this);
                var $container = $this.closest('.add-balance-container');

                var linkedId = parseInt(
                    $container
                        .find('input.ui-autocomplete-input')
                        .attr('data-id')
                );

                if (!linkedId) {
                    $container
                        .find('input.ui-autocomplete-input')
                        .validationEngine(
                            'showPrompt',
                            'A selection is required.',
                            'x',
                            'bottomLeft',
                            true
                        );
                    return;
                }

                var targetRoleTypeId = parseInt(
                    $container.find('#TargetRoleType').val()
                );

                switch (targetRoleTypeId) {
                    case C.OpeningBalanceTargetType.Landlord:
                    case C.OpeningBalanceTargetType.Tenancy:
                    case C.OpeningBalanceTargetType.Tenant:
                    case C.OpeningBalanceTargetType.Supplier:
                    case C.OpeningBalanceTargetType.Applicant:
                        me.editBalanceCharge(
                            me.eventPartyRoleTypeFromTargetType(
                                targetRoleTypeId
                            ),
                            me.modelTypeFromTargetRoleTypeId(targetRoleTypeId),
                            linkedId,
                            0,
                            'Add opening balance for {0}'.format(
                                $container
                                    .find('.preview-link')
                                    .attr('data-pre')
                            )
                        );
                        break;

                    case C.OpeningBalanceTargetType.ContactHeldMoney:
                    case C.OpeningBalanceTargetType.TenancyHeldMoney:
                        me.editHeldMoney(
                            0,
                            linkedId,
                            me.modelTypeFromTargetRoleTypeId(targetRoleTypeId)
                        );
                        break;

                    case C.OpeningBalanceTargetType.LandlordRetention:
                        me.editRetention(linkedId, 0);
                        break;
                }
            }
        );

        me.$root.on(
            'click' + namespace,
            '.add-arrear-container .add-balance',
            function () {
                var $this = $(this);

                var $container = $this.closest('.add-arrear-container');
                var linkedTypeId = parseInt(
                    $container.find('#TargetRoleType').val()
                );

                var targetRoleTypeId = parseInt(
                    $container.find('#TargetRoleType').val()
                );

                var linkedId = parseInt(
                    $container
                        .find('input.ui-autocomplete-input')
                        .attr('data-id')
                );

                if (!linkedId) {
                    $container
                        .find('input.ui-autocomplete-input')
                        .validationEngine(
                            'showPrompt',
                            'A selection is required.',
                            'x',
                            'bottomLeft',
                            true
                        );
                    return;
                }

                me.editArrearsCharge(
                    me.eventPartyRoleTypeFromTargetType(targetRoleTypeId),
                    me.modelTypeFromTargetRoleTypeId(linkedTypeId),
                    linkedId,
                    0,
                    'Add arrears item for {0}'.format(
                        $container.find('.preview-link').attr('data-pre')
                    )
                );
            }
        );

        me.$root.on(
            'click' + namespace,
            '#arrears table.header .col6',
            function () {
                var $this = $(this).find('.fa');

                if ($this.hasClass('fa-filter')) {
                    me.$root.find('#arrears #Filter_Filtering').val('True');
                    me.$root.find('#arrears .body-container .footer').hide();
                    me.$root
                        .find('#arrears .body-container')
                        .animate({ top: '89px', duration: 0 });
                    me.$root
                        .find('#arrears .header-container')
                        .animate({ height: '60px', duration: 0 });
                    me.$root
                        .find('#arrears .header-container .filter')
                        .css('visibility', 'visible');
                    $this.removeClass('fa-filter').addClass('fa-times');
                } else {
                    me.$root.find('#arrears #Filter_Filtering').val('False');
                    // clear filters
                    me.$root
                        .find(
                            '#arrears .header-container .filter input[type="text"]'
                        )
                        .val('');
                    me.$root
                        .find('#arrears .header-container .filter select')
                        .val('');
                    me.$root.find('#arrears .body-container .footer').show();
                    me.getArrearsPage(1);
                }
            }
        );

        me.$root.on(
            'click' + namespace,
            '#arrears table.filter .col6',
            function () {
                me.getArrearsPage(1);
            }
        );

        me.$root.on(
            'click' + namespace,
            '#arrears table th.sortable',
            function () {
                var $this = $(this).find('.sort');

                if ($this.hasClass('sort-asc')) {
                    $this.removeClass('sort-asc').addClass('sort-desc');

                    me.$root
                        .find('#arrears #SearchOrder_Type')
                        .val(C.SearchOrderType.Descending);
                } else if ($this.hasClass('sort-desc')) {
                    $this.removeClass('sort-desc').addClass('sort-asc');
                    me.$root
                        .find('#arrears #SearchOrder_Type')
                        .val(C.SearchOrderType.Ascending);
                } else {
                    $this.addClass('sort-asc');
                    me.$root
                        .find('#arrears #SearchOrder_Type')
                        .val(C.SearchOrderType.Ascending);
                }

                me.$root
                    .find('#arrears #SearchOrder_By')
                    .val($(this).data('orderby'));

                me.$root
                    .find('#arrears table th.sortable .sort')
                    .not($this)
                    .removeClass('sort-asc sort-desc');

                me.getArrearsPage(1);
            }
        );

        me.$root.on(
            'click' + namespace,
            '#openingbalances table.header .col6',
            function () {
                var $this = $(this).find('.fa');

                if ($this.hasClass('fa-filter')) {
                    me.$root
                        .find('#openingbalances #Filter_Filtering')
                        .val('True');
                    me.$root
                        .find('#openingbalances .body-container .footer')
                        .hide();
                    me.$root
                        .find('#openingbalances .body-container')
                        .animate({ top: '89px', duration: 0 });
                    me.$root
                        .find('#openingbalances .header-container')
                        .animate({ height: '60px', duration: 0 });
                    me.$root
                        .find('#openingbalances .header-container .filter')
                        .css('visibility', 'visible');
                    $this.removeClass('fa-filter').addClass('fa-times');
                } else {
                    me.$root
                        .find('#openingbalances #Filter_Filtering')
                        .val('False');
                    // clear filters
                    me.$root
                        .find(
                            '#openingbalances .header-container .filter input[type="text"]'
                        )
                        .val('');
                    me.$root
                        .find(
                            '#openingbalances .header-container .filter select'
                        )
                        .val('');
                    me.$root
                        .find('#openingbalances .body-container .footer')
                        .show();
                    var groupBankAccountId = parseInt(
                        me.$root.find('.selectedgroupbankaccountid').val()
                    );
                    me.getBalancePage(groupBankAccountId, 1);
                }
            }
        );

        me.$root.on(
            'click' + namespace,
            '#openingbalances table.filter .col6',
            function () {
                var groupBankAccountId = parseInt(
                    me.$root.find('.selectedgroupbankaccountid').val()
                );
                me.getBalancePage(groupBankAccountId, 1);
            }
        );

        me.$root.on(
            'click' + namespace,
            '#openingbalances table th.sortable',
            function () {
                var $this = $(this).find('.sort');

                if ($this.hasClass('sort-asc')) {
                    $this.removeClass('sort-asc').addClass('sort-desc');

                    me.$root
                        .find('#openingbalances #SearchOrder_Type')
                        .val(C.SearchOrderType.Descending);
                } else if ($this.hasClass('sort-desc')) {
                    $this.removeClass('sort-desc').addClass('sort-asc');
                    me.$root
                        .find('#openingbalances #SearchOrder_Type')
                        .val(C.SearchOrderType.Ascending);
                } else {
                    $this.addClass('sort-asc');
                    me.$root
                        .find('#openingbalances #SearchOrder_Type')
                        .val(C.SearchOrderType.Ascending);
                }

                me.$root
                    .find('#openingbalances #SearchOrder_By')
                    .val($(this).data('orderby'));

                me.$root
                    .find('#openingbalances table th.sortable .sort')
                    .not($this)
                    .removeClass('sort-asc sort-desc');
                var groupBankAccountId = parseInt(
                    me.$root.find('.selectedgroupbankaccountid').val()
                );
                me.getBalancePage(groupBankAccountId, 1);
            }
        );
    },
    initTabControls: function (selectedTab) {
        var me = this;
        me.currencySymbol = me.$root.find('#BankDetails_CurrencySymbol').val();

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

        me.$root.find('.tabs').tabs({
            active: me.$root
                .find('.tabs  a[href="#' + selectedTab + '"]')
                .parent()
                .index()
        });

        me.selectAutoComplete(
            me.$root.find('#openingbalances'),
            parseInt(me.$root.find('#openingbalances #TargetRoleType').val())
        );

        me.selectAutoComplete(
            me.$root.find('#arrears'),
            parseInt(me.$root.find('#arrears #TargetRoleType').val())
        );

        me.setArrearsDifference();

        me.setPostArrearsButtonState();

        me.setPostBalancesButtonState();

        me.initalTargetControls();
    },

    initalTargetControls: function () {
        var me = this;

        me.$root.find('.opt-inputmask-numeric').inputmask('currency', {
            radixPoint: '.',
            groupSeparator: ',',
            digits: 2,
            autoGroup: true,
            prefix: me.currencySymbol || '£',
            rightAlign: false
        });

        me.$root.find('select').customSelect();
    },

    modelTypeFromTargetRoleTypeId: function (targetType) {
        switch (targetType) {
            case C.OpeningBalanceTargetType.Landlord:
            case C.OpeningBalanceTargetType.Applicant:
            case C.OpeningBalanceTargetType.Tenant:
            case C.OpeningBalanceTargetType.ContactHeldMoney:
            case C.OpeningBalanceTargetType.Supplier:
                return C.ModelType.Contact;
            case C.OpeningBalanceTargetType.Property:
                return C.ModelType.Property;
            case C.OpeningBalanceTargetType.Tenancy:
            case C.OpeningBalanceTargetType.TenancyHeldMoney:
                return C.ModelType.Tenancy;
        }
    },

    eventPartyRoleTypeFromTargetType: function (targetType) {
        switch (targetType) {
            case C.OpeningBalanceTargetType.Landlord:
            case C.OpeningBalanceTargetType.LandlordRetention:
                return C.EventPartyRoleType.Landlord;
            case C.OpeningBalanceTargetType.Applicant:
                return C.EventPartyRoleType.Applicant;
            case C.OpeningBalanceTargetType.Tenant:
                return C.EventPartyRoleType.Tenant;
            case C.OpeningBalanceTargetType.Supplier:
                return C.EventPartyRoleType.Supplier;
            case C.OpeningBalanceTargetType.Tenancy:
            case C.OpeningBalanceTargetType.TenancyHeldMoney:
                return C.EventPartyRoleType.Tenancy;
            case C.OpeningBalanceTargetType.Property:
                return C.EventPartyRoleType.Property;
            case C.OpeningBalanceTargetType.ContactHeldMoney:
                return C.EventPartyRoleType.Contact;
        }
    },

    editRetention: function (contactId, id) {
        var me = this;
        var groupBankAccountId = parseInt(
            me.$root.find('.selectedgroupbankaccountid').val()
        );

        new gmgps.cloud.ui.views.retentionHandler({
            groupBankAccountId: groupBankAccountId,
            contactId: contactId,
            id: id,
            defaultItemDate: me.$root
                .find('#openingbalances #OpeningBalance_DefaultItemDate')
                .val(),
            onComplete: function () {
                var groupBankAccountId = parseInt(
                    me.$root.find('.selectedgroupbankaccountid').val()
                );
                var pageNumber = parseInt(
                    me.$root
                        .find('#openingbalances #Transactions_PageIndex')
                        .val()
                );
                me.getBalancePage(groupBankAccountId, pageNumber);
            }
        }).show();
    },

    editHeldMoney: function (id, linkedId, linkedTypeId) {
        var me = this;
        var groupBankAccountId = parseInt(
            me.$root.find('.selectedgroupbankaccountid').val()
        );

        new gmgps.cloud.ui.views.heldMoneyHandler({
            groupBankAccountId: groupBankAccountId,
            id: id,
            linkedId: linkedId,
            linkedTypeId: linkedTypeId,
            defaultItemDate: me.$root
                .find('#openingbalances #OpeningBalance_DefaultItemDate')
                .val(),
            onComplete: function () {
                var groupBankAccountId = parseInt(
                    me.$root.find('.selectedgroupbankaccountid').val()
                );
                var pageNumber = parseInt(
                    me.$root
                        .find('#openingbalances #Transactions_PageIndex')
                        .val()
                );
                me.getBalancePage(groupBankAccountId, pageNumber);
            }
        }).show();
    },

    editBalanceCharge: function (
        targetRoleType,
        linkedTypeId,
        linkedId,
        chargeId,
        title
    ) {
        var me = this;

        new gmgps.cloud.ui.views.editChargeHandler({
            linkedTypeId: linkedTypeId,
            linkedId: linkedId,
            chargeId: chargeId,
            selectedTargetRoleType: targetRoleType,
            groupBankAccountId: parseInt(
                me.$root.find('#SelectedGroupBankAccountId').val()
            ),
            defaultItemDate: me.$root
                .find('#openingbalances #OpeningBalance_DefaultItemDate')
                .val(),
            chargeUsageType: C.ChargeToPostUsageType.OpeningBalanceCharge,
            title: title,
            windowId: 'editBalanceCharge',
            onComplete: function () {
                var groupBankAccountId = parseInt(
                    me.$root.find('.selectedgroupbankaccountid').val()
                );
                var pageNumber = parseInt(
                    me.$root
                        .find('#openingbalances #Transactions_PageIndex')
                        .val()
                );
                me.getBalancePage(groupBankAccountId, pageNumber);
            }
        }).show();
    },

    editArrearsCharge: function (
        targetRoleType,
        linkedTypeId,
        linkedId,
        chargeId,
        title
    ) {
        var me = this;

        new gmgps.cloud.ui.views.editChargeHandler({
            linkedTypeId: linkedTypeId,
            linkedId: linkedId,
            chargeId: chargeId,
            selectedTargetRoleType: targetRoleType,
            groupBankAccountId: 0,
            chargeUsageType: C.ChargeToPostUsageType.ArrearsCharge,
            defaultItemDate: me.$root
                .find('#arrears #Arrears_DefaultItemDate')
                .val(),
            title: title,
            windowId: 'editArrearsCharge',
            onComplete: function () {
                var pageNumber = parseInt(
                    me.$root
                        .find('.arrears-content #Transactions_PageIndex')
                        .val()
                );
                me.getArrearsPage(pageNumber);
            }
        }).show();
    },

    selectAutoComplete: function ($root, roleType) {
        var autoComplete = null;

        if ($root.length === 1) {
            switch (roleType) {
                case C.OpeningBalanceTargetType.Property:
                    autoComplete = this.propertyAutoComplete()
                        .parent()
                        .css('width', '208px');
                    break;
                case C.OpeningBalanceTargetType.Landlord:
                case C.OpeningBalanceTargetType.LandlordRetention:
                    autoComplete = this.landlordAutoComplete()
                        .parent()
                        .css('width', '208px');
                    break;
                case C.OpeningBalanceTargetType.Applicant:
                    autoComplete = this.applicantAutoComplete()
                        .parent()
                        .css('width', '208px');
                    break;
                case C.OpeningBalanceTargetType.Tenant:
                    autoComplete = this.tenantAutoComplete()
                        .parent()
                        .css('width', '208px');
                    break;
                case C.OpeningBalanceTargetType.Supplier:
                    autoComplete = this.supplierAutoComplete()
                        .parent()
                        .css('width', '208px');
                    break;
                case C.OpeningBalanceTargetType.Tenancy:
                    autoComplete = this.tenancyAutoComplete()
                        .parent()
                        .css('width', '208px');
                    break;
                case C.OpeningBalanceTargetType.ContactHeldMoney:
                    autoComplete = this.contactAutoComplete()
                        .parent()
                        .css('width', '208px');
                    break;
                case C.OpeningBalanceTargetType.TenancyHeldMoney:
                    autoComplete = this.tenancyAutoComplete()
                        .parent()
                        .css('width', '208px');
                    break;
            }

            if (autoComplete) {
                $root
                    .find('.auto-complete-container')
                    .empty()
                    .html(autoComplete);
            }
        }
    },

    propertyAutoComplete: function () {
        return $('<input type="text" />')
            .attr('data-id', 0)
            .css('width', '200px')
            .autoCompleteEx({
                modelType: C.ModelType.Property,
                search: {
                    RecordType: C.PropertyRecordType.Rent,
                    ApplyFurtherFilteringtoIds: true,
                    includeUsers: false,
                    includeDiaryUserGroups: false
                },
                placeholder: 'Search Properties...',
                onSelected: function (acArgs) {
                    if (!acArgs.isSetupCallback) {
                        acArgs.$e.attr('data-id', acArgs.id);
                        acArgs.$e.validationEngine('hide');
                    }
                },
                onRemoved: function () {}
            });
    },

    landlordAutoComplete: function () {
        return $('<input type="text" />')
            .attr('data-id', 0)
            .css('width', '200px')
            .autoCompleteEx({
                modelType: C.ModelType.Contact,
                search: {
                    ApplyFurtherFilteringtoIds: true,
                    IsLandlord: 1
                },
                includeUsers: false,
                includeDiaryUserGroups: false,
                placeholder: 'Search Landlords...',
                onSelected: function (acArgs) {
                    if (!acArgs.isSetupCallback) {
                        acArgs.$e.attr('data-id', acArgs.id);
                        acArgs.$e.validationEngine('hide');
                    }
                },
                onRemoved: function () {}
            });
    },

    contactAutoComplete: function () {
        return $('<input type="text" />')
            .attr('data-id', 0)
            .css('width', '200px')
            .autoCompleteEx({
                modelType: C.ModelType.Contact,
                search: {
                    CategoryIdList: [
                        C.ContactCategory.Client,
                        C.ContactCategory.Supplier
                    ],
                    ApplyFurtherFilteringtoIds: true
                },
                includeUsers: false,
                includeDiaryUserGroups: false,
                placeholder: 'Search Contacts...',
                onSelected: function (acArgs) {
                    if (!acArgs.isSetupCallback) {
                        acArgs.$e.attr('data-id', acArgs.id);
                        acArgs.$e.validationEngine('hide');
                    }
                },
                onRemoved: function () {}
            });
    },

    applicantAutoComplete: function () {
        return $('<input type="text" />')
            .attr('data-id', 0)
            .css('width', '200px')
            .autoCompleteEx({
                modelType: C.ModelType.Contact,
                search: {
                    CategoryIdList: [C.ContactCategory.Client],
                    ApplyFurtherFilteringtoIds: true,
                    isApplicant: 1
                },
                includeUsers: false,
                includeDiaryUserGroups: false,
                placeholder: 'Search Contacts...',
                onSelected: function (acArgs) {
                    if (!acArgs.isSetupCallback) {
                        acArgs.$e.attr('data-id', acArgs.id);
                        acArgs.$e.validationEngine('hide');
                    }
                },
                onRemoved: function () {}
            });
    },

    supplierAutoComplete: function () {
        return $('<input type="text" />')
            .attr('data-id', 0)
            .css('width', '200px')
            .autoCompleteEx({
                modelType: C.ModelType.Contact,
                search: {
                    CategoryIdList: [C.ContactCategory.Supplier],
                    ApplyFurtherFilteringtoIds: true
                },
                includeUsers: false,
                includeDiaryUserGroups: false,
                placeholder: 'Search Suppliers...',
                onSelected: function (acArgs) {
                    if (!acArgs.isSetupCallback) {
                        acArgs.$e.attr('data-id', acArgs.id);
                        acArgs.$e.validationEngine('hide');
                    }
                },
                onRemoved: function () {}
            });
    },

    tenancyAutoComplete: function () {
        return $('<input type="text" />')
            .attr('data-id', 0)
            .css('width', '200px')
            .autoCompleteEx({
                modelType: C.ModelType.Tenancy,
                search: {
                    ApplyFurtherFilteringtoIds: true,
                    includeUsers: false,
                    includeDiaryUserGroups: false,
                    SearchOrder: {
                        By: C.SearchOrderBy.SearchScore,
                        Type: C.SearchOrderType.Descending
                    }
                },
                placeholder: 'Search Tenancies...',
                onSelected: function (acArgs) {
                    if (!acArgs.isSetupCallback) {
                        acArgs.id = acArgs.udf2; // use first term tenancy id!
                        acArgs.$e.validationEngine('hide');
                    }
                },
                onRemoved: function () {}
            });
    },

    tenantAutoComplete: function () {
        return $('<input type="text" />')
            .attr('data-id', 0)
            .css('width', '200px')
            .autoCompleteEx({
                modelType: C.ModelType.Tenant,
                showRAF: false,
                search: {
                    ApplyFurtherFilteringtoIds: true,
                    includeUsers: false,
                    includeDiaryUserGroups: false
                },
                placeholder: 'Search Tenants...',
                onSelected: function (acArgs) {
                    if (!acArgs.isSetupCallback) {
                        acArgs.$e.attr('data-id', acArgs.id);
                        acArgs.$e.validationEngine('hide');
                    }
                },
                onRemoved: function () {}
            });
    },

    getBalancePage: function (groupBankAccountId, pageNumber) {
        var me = this;
        me.groupBankAccountId = groupBankAccountId;
        var $filterParams = me.$root.find('#openingbalances table.filter');

        var pageSize = parseInt(
            me.$root.find('#openingbalances #Transactions_PageSize').val()
        );

        new gmgps.cloud.http("openBalancesHandler-getBalancePage")
            .ajax({
                args: {
                    groupBankAccountId: groupBankAccountId,
                    pageNumber: pageNumber,
                    pageSize: pageSize,
                    searchOrder: {
                        By: me.$root
                            .find('#openingbalances #SearchOrder_By')
                            .val(),
                        Type: parseInt(
                            me.$root
                                .find('#openingbalances #SearchOrder_Type')
                                .val()
                        )
                    },
                    filter: {
                        filtering: $filterParams
                            .find('#Filter_Filtering')
                            .val(),
                        targetRoleType: $filterParams
                            .find('#Filter_TargetRoleType')
                            .val(),
                        amount: $filterParams.find('#Filter_Amount').asNumber(),
                        nominalCodeId: $filterParams
                            .find('#Filter_NominalCodeId')
                            .val(),
                        description: $filterParams
                            .find('#Filter_Description')
                            .val(),
                        chargeTo: $filterParams.find('#Filter_ChargeTo').val()
                    }
                },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/Accounts/GetBalancePage'
            })
            .done(function (r) {
                me.$root.find('.balance-content').empty().html(r.Data);
                me.setOpeningBalanceAllocatedAmount();
                me.setClientAccountDifference();
                me.setPostBalancesButtonState();
                me.initalTargetControls();
            });
    },

    getArrearsPage: function (pageNumber) {
        var me = this;

        var $filterParams = me.$root.find('#arrears table.filter');

        var pageSize = parseInt(
            me.$root.find('#arrears #Transactions_PageSize').val()
        );

        new gmgps.cloud.http("openBalancesHandler-getArrearsPage")
            .ajax({
                args: {
                    pageNumber: pageNumber,
                    pageSize: pageSize,
                    searchOrder: {
                        By: me.$root.find('#arrears #SearchOrder_By').val(),
                        Type: parseInt(
                            me.$root.find('#arrears #SearchOrder_Type').val()
                        )
                    },
                    filter: {
                        filtering: $filterParams
                            .find('#Filter_Filtering')
                            .val(),
                        targetRoleType: $filterParams
                            .find('#Filter_TargetRoleType')
                            .val(),
                        amount: $filterParams.find('#Filter_Amount').asNumber(),
                        nominalCodeId: $filterParams
                            .find('#Filter_NominalCodeId')
                            .val(),
                        description: $filterParams
                            .find('#Filter_Description')
                            .val(),
                        chargeTo: $filterParams.find('#Filter_ChargeTo').val()
                    }
                },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/Accounts/GetArrearsPage'
            })
            .done(function (r) {
                me.$root.find('.arrears-content').empty().html(r.Data);
                me.$root.find('#ArrearsTargetAmount').val(me.arrearsTarget);
                me.setArrearsDifference();
                me.setPostArrearsButtonState();
                me.initalTargetControls();
            });
    },

    setOpeningBalanceAllocatedAmount: function () {
        var me = this;
        var allocatedAmount = me.$root
            .find('#OpeningBalance_AllocatedAmount')
            .asNumber();
        me.$root
            .find('#balanceAllocatedToDate')
            .text(me.formatAsCurrency(allocatedAmount));
    },

    setArrearsDifference: function () {
        var me = this;
        var difference = me.getArrearsDifference();
        var formattedDifference = me.formatAsCurrency(difference);
        me.$root.find('#arrears .difference').text(formattedDifference);
    },

    setClientAccountDifference: function () {
        var me = this;
        var difference = me.getClientAccountDifference();
        var formattedDifference = me.formatAsCurrency(difference);
        me.$root.find('#openingbalances .difference').text(formattedDifference);
    },

    getTabsContent: function (tabs, groupBankAccountId) {
        return new gmgps.cloud.http("openBalancesHandler-getTabsContent").ajax({
            args: {
                tabNames: tabs,
                groupBankAccountId: groupBankAccountId
            },
            complex: true,
            dataType: 'json',
            type: 'post',
            url: '/Accounts/GetOpeningBalancesTabs'
        });
    },

    getBalanceAllocated: function (groupBankAccountId) {
        return new gmgps.cloud.http(
            "openBalancesHandler-getBalanceAllocated"
        ).ajax({
            args: {
                groupBankAccountId: groupBankAccountId
            },
            complex: true,
            dataType: 'json',
            type: 'post',
            url: '/Accounts/GetBalanceAllocated'
        });
    },

    updateBalanceTarget: function (groupBankAccountId, amount) {
        return new gmgps.cloud.http(
            "openBalancesHandler-updateBalanceTarget"
        ).ajax({
            args: {
                groupBankAccountId: groupBankAccountId,
                amount: amount
            },
            complex: true,
            dataType: 'json',
            type: 'post',
            url: '/Accounts/UpdateBalanceTarget'
        });
    },

    updateBalanceDefaultDate: function (groupBankAccountId, defaultItemDate) {
        return new gmgps.cloud.http(
            "openBalancesHandler-updateBalanceDefaultDate"
        ).ajax({
            args: {
                groupBankAccountId: groupBankAccountId,
                defaultItemDate: defaultItemDate
            },
            complex: true,
            dataType: 'json',
            type: 'post',
            url: '/Accounts/UpdateBalanceItemDate'
        });
    },

    updateArrearsDefaultDate: function (defaultItemDate) {
        return new gmgps.cloud.http(
            "openBalancesHandler-updateArrearsDefaultDate"
        ).ajax({
            args: {
                defaultItemDate: defaultItemDate
            },
            complex: true,
            dataType: 'json',
            type: 'post',
            url: '/Accounts/UpdateArrearsItemDate'
        });
    },

    getArrearsAllocated: function () {
        return new gmgps.cloud.http(
            "openBalancesHandler-getArrearsAllocated"
        ).ajax({
            args: {},
            complex: true,
            dataType: 'json',
            type: 'post',
            url: '/Accounts/GetArrearsAllocated'
        });
    },

    commitOpeningBalances: function (
        balanceAmount,
        heldMoneyAmount,
        retentionAmount
    ) {
        var me = this;

        return new gmgps.cloud.http(
            "openBalancesHandler-commitOpeningBalances"
        ).ajax({
            args: {
                model: {
                    groupBankAccountId: parseInt(
                        me.$root.find('#SelectedGroupBankAccountId').val()
                    ),
                    balancesAmount: balanceAmount,
                    heldMoneyAmount: heldMoneyAmount,
                    retentionAmount: retentionAmount
                }
            },
            complex: true,
            dataType: 'json',
            type: 'post',
            url: '/Accounts/CommitOpeningBalances'
        });
    },

    commitArrears: function (amountToPost) {
        return new gmgps.cloud.http("openBalancesHandler-commitArrears").ajax({
            args: {
                model: {
                    amountToPost: amountToPost
                }
            },
            complex: true,
            dataType: 'json',
            type: 'post',
            url: '/Accounts/CommitArrears'
        });
    },

    setPostArrearsButtonState: function () {
        var me = this;

        var difference = me.getArrearsDifference();
        var toAllocate = me.getArrearsToAllocate();
        if (difference === 0 && toAllocate > 0) {
            me.$root
                .find('#arrears .btn.commit-charges')
                .removeClass('disabled');
        } else {
            me.$root.find('#arrears .btn.commit-charges').addClass('disabled');
        }
    },

    setPostBalancesButtonState: function () {
        var me = this;

        var difference = me.$root
            .find('#openingbalances .difference')
            .asNumber();
        var itemCount = me.$root.find('#openingbalances .edit-balance').length;
        if (difference === 0 && itemCount > 0) {
            me.$root
                .find('#openingbalances .btn.commit-charges')
                .removeClass('disabled');
        } else {
            me.$root
                .find('#openingbalances .btn.commit-charges')
                .addClass('disabled');
        }
    }
};
