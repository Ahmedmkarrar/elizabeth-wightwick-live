gmgps.cloud.ui.views.payAgencyHandler = function (args) {
    var me = this;

    me.$root = args.$root;
    me.container = args.container;
    me.panels = {
        clientAccounts: null,
        accountDetail: null,
        timeline: null
    };
    me.http = new gmgps.cloud.http("payAgencyHandler-payAgencyHandler");
    return me;
};

gmgps.cloud.ui.views.payAgencyHandler.prototype = {
    init: function (onComplete) {
        var me = this;

        me.initControls(onComplete);
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
                    url: '/Accounts/GetPayAgencyLayer',
                    type: C.AccountCentreActionsType.PayAgencyFees,
                    sortOrderType: C.PayAgencySortOrderType
                }).init();
        }
        me.refreshClientAccounts(onComplete);
    },
    initEvents: function () {
        var me, namespace;
        me = this;
        namespace = '.PayAgencyHandler';

        me.$root.off(namespace);
        me.$root.on('click' + namespace, '.view-account', function () {
            var $this = $(this);
            var accountId = $this.data('id');
            var accountName = $this.data('name');

            me.getTabsContent(['paymentdetail', 'timeline'], accountId).done(
                function (s) {
                    if (s && s.Data) {
                        // hide all tabs first - we want to hide the Account List Tab, so if we update its not 'out of date'
                        me.$root.find('.tabs li').hide();
                        me.$root.find('#accountdetail-name').text(accountName);
                        me.initTabContents(s.Data, 'paymentdetail');
                        me.initTabEvents();
                    }
                }
            );
        });
    },
    initTabEvents: function () {
        var me, namespace, manuallyAllocated;
        me = this;
        namespace = '.PayAgencyAccountHandler';
        manuallyAllocated = false;
        me.$root.off(namespace);

        me.$root.on('blur' + namespace, '#BalanceCarriedForward', function () {
            me.recalculateTotalPayable($(this).asNumber());
        });

        me.$root.on('change' + namespace, '.payment-selected', function () {
            var $this = $(this);
            var $row = $this.closest('.payment-item');

            if (!$this.prop('checked')) {
                $row.find('#Transaction_Allocated').val(0);
            } else {
                if (
                    $this.data('partialallocation') === 1 &&
                    !me.$root.find('#IncludePartialPayments').is(':checked')
                ) {
                    manuallyAllocated = true;
                }
                me.calculateAutoAllocated($row);
            }
            updateSelectAll($this.is(':checked'));

            me.resetGroupPaymentState();
            me.setRowState($row);

            me.recalculateTotalPayable(
                me.$root.find('.totals-container .amount-input').asNumber()
            );
        });

        me.$root.on(
            'change' + namespace,
            '#Transaction_Allocated',
            function () {
                var $this = $(this);
                var $row = $this.closest('.payment-item');

                me.calculateAllocated($row);
                var isChecked = !($this.asNumber() === 0);
                manuallyAllocated = !manuallyAllocated && $this.asNumber() > 0;
                updateTickbox($row.find('.payment-selected'), isChecked);

                updateSelectAll(isChecked);

                me.setRowState($row);

                me.resetGroupPaymentState();
                me.recalculateTotalPayable(
                    me.$root.find('.totals-container .amount-input').asNumber()
                );
            }
        );

        me.$root.on(
            'click' + namespace,
            '.update-payments:not(.disabled)',
            function () {
                if (me.validate() === false) return false;

                var $btn = $(this);

                $btn.addClass('disabled');

                me.makePayments().done(function (r) {
                    if (r && r.Data) {
                        $.jGrowl('Pay Agency Fees Updated', {
                            theme: 'growl-tenancy',
                            header: 'Accounts Centre'
                        });
                        me.refreshClientAccounts();
                    }
                    $btn.removeClass('disabled');
                });
            }
        );

        me.$root.on('change' + namespace, '.refreshable', function () {
            me.refreshContent();
        });

        me.$root.on(
            'change' + namespace,
            '#IncludePartialPayments',
            function () {
                var $this = $(this);
                var checked = $this.prop('checked');
                var elements = me.$root.find(
                    '.payment-selected[data-partialallocation="1"]'
                );
                updateTickbox(elements, checked);
                updateAllocations(elements, checked);

                me.resetGroupPaymentState();
                me.recalculateTotalPayable(
                    me.$root.find('.totals-container .amount-input').asNumber()
                );
            }
        );

        me.$root.on('click' + namespace, '.payment-item', function (e) {
            //clicks on inputs that propapate are ingored
            if (e.target.nodeName === 'DIV') {
                $(this).next().slideToggle('fast');
            }
        });

        me.$root.on(
            'change' + namespace,
            '#SelectedPaymentMethodId',
            function () {
                var bankRef = me.$root.find('#BankReference');
                if ($(this).find(':selected').data('isbacs') === 1) {
                    bankRef.val('Bacs').attr('readonly', 'readonly');
                } else {
                    bankRef.val('').removeAttr('readonly');
                }
            }
        );

        me.$root.on(
            'change' + namespace,
            '#SelectAllPaymentItems',
            function (e) {
                if (manuallyAllocated && !e.target.checked) {
                    showDialog({
                        type: 'info',
                        zIndex: 1000,
                        title: 'Information',
                        msg: 'Manual allocation amendments will be lost.',
                        buttons: {
                            Ok: function () {
                                manuallyAllocated = false;
                                $(this).dialog('close');
                                updateCheckboxes();
                            },
                            Cancel: function () {
                                updateTickbox($(e.target), !e.target.checked);
                                $(this).dialog('close');
                            }
                        }
                    });
                } else {
                    updateCheckboxes();
                }
            }
        );

        function updateCheckboxes() {
            var includePartials = me.$root
                .find('#IncludePartialPayments')
                .is(':checked');
            var selectAll = me.$root
                .find('#SelectAllPaymentItems')
                .is(':checked');
            var query = '.payment-selected';
            if (selectAll && !includePartials) {
                query += '[data-partialallocation=0]';
            }
            var elements = me.$root.find(query);
            updateTickbox(elements, selectAll);
            updateAllocations(elements, selectAll);

            me.resetGroupPaymentState();
            me.recalculateTotalPayable(
                me.$root.find('.totals-container .amount-input').asNumber()
            );
        }

        function updateSelectAll(value) {
            var rows, selected, query, $selectAll;
            var includePartial = me.$root
                .find('#IncludePartialPayments')
                .is(':checked');
            $selectAll = me.$root.find('#SelectAllPaymentItems');
            if (value || !includePartial) {
                query = '.payment-selected';
                if (!includePartial) {
                    query += '[data-partialallocation=0]';
                }
                rows = me.$root.find(query);
                selected = rows.filter(':checked');

                value = rows.length === selected.length;
            }

            updateTickbox($selectAll, value);
        }
        function updateTickbox(element, state) {
            element.prop('checked', state).trigger('prog-change');
            return element;
        }

        function updateAllocations(elements, checked) {
            elements.closest('.payment-item').each(function (i, row) {
                var $row = $(row);
                if (checked) {
                    me.calculateAutoAllocated($row);
                } else {
                    $row.find('#Transaction_Allocated').val(0);
                }
                me.setRowState($row);
            });
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

            me.initTabs(selectedTab);
        }
    },

    initTabs: function (selectedTab) {
        var me = this;

        me.$root.find('select').not('.is-customised').customSelect();
        me.$root.find('.placeholders').placeholder();

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

        me.tabs.tabs(
            'option',
            'active',
            me.$root
                .find('.tabs  a[href="#' + selectedTab + '"]')
                .parent()
                .index()
        );

        me.$root
            .find('.opt-inputmask-numeric.amount-input.neg')
            .inputmask('currency', {
                radixPoint: '.',
                groupSeparator: ',',
                digits: 2,
                autoGroup: true,
                prefix: me.$root.find('#CurrencySymbol').val(),
                rightAlign: true,
                allowMinus: true
            });

        me.$root
            .find('.opt-inputmask-numeric.amount-input.pos')
            .inputmask('currency', {
                radixPoint: '.',
                groupSeparator: ',',
                digits: 2,
                autoGroup: true,
                prefix: me.$root.find('#CurrencySymbol').val(),
                rightAlign: true,
                allowMinus: false,
                min: 0
            });

        me.resetGroupPaymentState();

        me.recalculateTotalPayable(0);
    },

    getTabsContent: function (tabs, groupBankAccountId) {
        return new gmgps.cloud.http("payAgencyHandler-getTabsContent").ajax({
            args: {
                tabNames: tabs,
                groupBankAccountId: groupBankAccountId
            },
            complex: true,
            dataType: 'json',
            type: 'post',
            url: '/Accounts/GetPayAgencyTabs'
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
    refreshContent: function () {
        var me = this;

        var groupBankAccountId = parseInt(
            me.$root.find('#SelectedGroupBankAccountId').val()
        );

        var toDate = me.$root.find('#FeesUpToDate').val();
        var paymentDate = me.$root.find('#PaymentDate').val();

        var selectedBranchId = me.$root.find('#SelectedBranchId').val();
        var branchId = selectedBranchId !== '' ? parseInt(selectedBranchId) : 0;

        me.refreshAcountDetail(
            groupBankAccountId,
            branchId,
            paymentDate,
            toDate
        ).done(function (s) {
            me.$root.find('#paymentdetail .payments').replaceWith(s.Data);
            me.initTabs('paymentdetail');
            me.recalculateTotalPayable(
                me.$root.find('.totals-container .amount-input').asNumber()
            );
        });
    },

    refreshAcountDetail: function (
        groupBankAccountId,
        branchId,
        paymentDate,
        toDate
    ) {
        return new gmgps.cloud.http(
            "payAgencyHandler-refreshAcountDetail"
        ).ajax({
            args: {
                groupBankAccountId: groupBankAccountId,
                branchId: branchId,
                paymentDate: paymentDate,
                toDate: toDate
            },
            complex: true,
            dataType: 'json',
            type: 'post',
            url: '/Accounts/GetPayAgencyAccountDetail'
        });
    },

    setRowState: function ($row) {
        var $input = $row.find('#Transaction_Allocated');

        var $tickbox = $row.find('.tickbox');

        var val = $input.asNumber();

        var due = parseFloat($input.data('maxvalue'));

        if (val === 0) {
            $input.removeClass('amber green');
            $tickbox.removeClass('amber');
            $tickbox
                .removeClass('ticked')
                .prop('checked', false)
                .trigger('prog-change');
        } else if (val === due) {
            $input.removeClass('amber').addClass('green');
            $tickbox.removeClass('amber');
        } else if (val !== due) {
            $input.removeClass('green').addClass('amber');
            $tickbox.addClass('amber');
        }
    },

    recalculateTotalPayable: function (balanceCarriedForward) {
        var me = this;

        var currencySymbol = me.$root.find('#CurrencySymbol').val();
        var totalAllocated = new Decimal(0);
        var totalPayable = new Decimal(0);

        var $rows = me.$root.find('#paymentdetail .item-rows .amount-input');

        $rows.each(function (i, v) {
            var $input = $(v);

            var $check = $input
                .closest('.payment-item')
                .find('.payment-selected');

            if ($check.prop('checked')) {
                totalAllocated = totalAllocated.add($input.asNumber());
            }

            if ($input.data('maxvalue') < 0) {
                totalAllocated = totalAllocated.add($input.asNumber());
            }

            totalPayable = totalPayable.add($input.data('maxvalue'));
        });

        me.$root.find('.total-allocated').text(
            '{0}'.format(
                $.inputmask.format(totalAllocated.toFixed(2), {
                    alias: 'currency',
                    prefix: currencySymbol
                })
            )
        );

        me.$root.find('.total-payable').text(
            '{0}'.format(
                $.inputmask.format(totalPayable.toFixed(2), {
                    alias: 'currency',
                    prefix: currencySymbol
                })
            )
        );

        var bfwd = new Decimal(
            parseFloat(
                me.$root.find('.totals-container').data('balancebroughtforward')
            )
        );

        var netPayable = new Decimal(
            totalAllocated.add(bfwd).sub(balanceCarriedForward)
        );

        me.$root.find('.net-payable').text(
            '{0}'.format(
                $.inputmask.format(netPayable.toFixed(2), {
                    alias: 'currency',
                    prefix: currencySymbol
                })
            )
        );

        if (netPayable >= 0) {
            me.$root.find('.update-payments').removeClass('disabled');
        } else {
            me.$root.find('.update-payments').addClass('disabled');
        }
    },

    totalAvailableToAllocate: function (groupId, $row) {
        var me = this;

        var allocated = new Decimal(0);
        var available = new Decimal(0);

        if (groupId === 0) {
            available = new Decimal($row.data('availabletoallocate'));
        } else {
            me.$root
                .find(
                    '.item-rows .payment-item[data-paymentgroupid="' +
                        groupId +
                        '"]'
                )
                .each(function (i, v) {
                    var $v = $(v);
                    available = new Decimal($v.data('availabletoallocate'));
                });
            me.$root
                .find(
                    '.item-rows .payment-item[data-paymentgroupid="' +
                        groupId +
                        '"]'
                )
                .not($row)
                .each(function (i, v) {
                    var $v = $(v);
                    allocated = allocated.add(
                        $v.find('.amount-input').asNumber()
                    );
                });
        }

        return available.sub(allocated);
    },

    totalAvailableToAutoAllocate: function (groupId, $row) {
        var me = this;
        var allocated = new Decimal(0);
        var available = new Decimal(0);

        if (groupId === 0) {
            available = new Decimal($row.data('availabletoallocate'));
        } else {
            me.$root
                .find(
                    '.item-rows .payment-item[data-paymentgroupid="' +
                        groupId +
                        '"]'
                )
                .each(function (i, v) {
                    var $v = $(v);
                    available = new Decimal($v.data('availabletoallocate'));
                });

            me.$root
                .find(
                    '.item-rows .payment-item[data-paymentgroupid="' +
                        groupId +
                        '"]'
                )
                .not($row)
                .each(function (i, v) {
                    var $v = $(v);
                    allocated = allocated.add(
                        $v.find('.amount-input').asNumber()
                    );
                });
        }
        return available.sub(allocated);
    },

    calculateAllocated: function ($row) {
        var me = this;
        var groupId = parseInt($row.data('paymentgroupid'));

        var $input = $row.find('#Transaction_Allocated');

        var value = new Decimal($input.asNumber());

        var totaldue = parseFloat($input.data('maxvalue'));

        if (value > totaldue) {
            value = totaldue;
        }
        if (value < 0) {
            value = 0;
        }

        var available = new Decimal(me.totalAvailableToAllocate(groupId, $row));

        if (available.lt(value)) {
            value = available;
        }

        $input.val(value.toFixed(2));
    },

    calculateAutoAllocated: function ($row) {
        var available = new Decimal($row.attr('data-auto-allocated'));
        $row.find('#Transaction_Allocated').val(available.toFixed(2));
    },

    resetGroupPaymentState: function () {
        var me = this;
        var available = new Decimal(0);
        var groupId = new Decimal(0);

        me.$root
            .find('.payments .payment-item .payment-selected')
            .each(function (i, v) {
                var $v = $(v);

                var $row = $v.closest('.payment-item');

                if (!$v.prop('checked')) {
                    groupId = parseInt($row.data('paymentgroupid'));
                    available = new Decimal(
                        me.totalAvailableToAutoAllocate(groupId, $row)
                    );

                    if (available.eq(0)) {
                        $(v).prop('disabled', 'disabled');
                        $(v)
                            .closest('.payment-item')
                            .find('#Transaction_Allocated')
                            .removeClass('amber green')
                            .val(0);
                    } else {
                        $v.removeProp('disabled');
                    }
                } else {
                    $v.removeProp('disabled');
                }
            });
    },

    validate: function () {
        var me = this;
        me.$root.addClass('opt-validate').validationEngine({ scroll: false });
        return me.$root.validationEngine('validate');
    },

    makePayments: function () {
        var me = this;
        var paymentVersionList = [];

        var statementDate = me.$root.find('#PaymentDate').val();
        var paymentMethodId = parseInt(
            me.$root.find('#SelectedPaymentMethodId').val()
        );
        var bankAccountId = parseInt(
            me.$root.find('#SelectedGroupBankAccountId').val()
        );
        var paymentReference = me.$root.find('#BankReference').val();
        var branchId = me.$root.find('#SelectedBranchId').val();
        var bfwd = new Decimal(
            parseFloat(
                me.$root.find('.totals-container').data('balancebroughtforward')
            )
        );
        var cfwd = new Decimal(
            me.$root.find('.totals-container .amount-input').asNumber()
        );

        $.map(me.$root.find('.payment-item'), function (v) {
            var $v = $(v);

            var $check = $v.find('.payment-selected');

            // if its ticked or a credit (which dont have checkboxes) - include
            if (
                ($check.length === 1 && $check.prop('checked') === true) ||
                $check.length === 0
            ) {
                var id = parseInt($v.data('txid'));
                var versionNumber = parseInt($v.data('txversionnumber'));
                var allocated = $v.find('#Transaction_Allocated').asNumber();

                if (allocated !== 0) {
                    paymentVersionList.push({
                        id: id,
                        versionNumber: versionNumber,
                        allocated: allocated
                    });
                }
            }
        });

        return new gmgps.cloud.http("payAgencyHandler-makePayments").ajax({
            args: {
                statementDate: statementDate,
                fees: paymentVersionList,
                paymentMethodId: paymentMethodId,
                groupBankAccountId: bankAccountId,
                paymentReference: paymentReference,
                branchId: branchId,
                balancebroughtforward: bfwd,
                balanceCarriedForward: cfwd
            },
            complex: true,
            dataType: 'json',
            type: 'post',
            url: '/Accounts/PayAgency'
        });
    }
};
