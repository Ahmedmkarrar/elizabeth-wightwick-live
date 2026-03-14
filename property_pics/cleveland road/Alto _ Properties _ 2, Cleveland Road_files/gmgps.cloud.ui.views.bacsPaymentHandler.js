gmgps.cloud.ui.views.bacsPaymentHandler = function (args) {
    var me = this;

    me.$root = args.$root;

    me.container = args.container;
    me.panels = {
        clientAccounts: null
    };

    return me;
};

gmgps.cloud.ui.views.bacsPaymentHandler.prototype = {
    init: function (onComplete) {
        var me = this;

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
                new gmgps.cloud.ui.views.clientAccountsPanelHandler({
                    $root: me.$root.find('#accountlist'),
                    http: me.http,
                    url: '/Accounts/GetBacsPaymentLayer',
                    type: C.AccountCentreActionsType.BacsPaymentUpdate
                }).init();
        }
        me.refreshClientAccounts(onComplete);
    },
    initEvents: function () {
        var me, namespace;
        me = this;
        namespace = '.BacsPaymentHandler';
        me.$root.off(namespace);
        me.$root.on('click' + namespace, '.view-account', function () {
            var $this = $(this);
            var accountId = $this.data('id');
            var accountName = $this.data('name');

            me.getTabsContent(
                ['paymentdetail', 'timeline'],
                accountId
            ).done(function (s) {
                // hide all tabs first - we want to hide the Account List Tab, so if we update its not 'out of date'
                me.$root.find('.tabs li').hide();
                me.$root.find('#accountdetail-name').text(accountName);
                me.initTabContents(s.Data, 'paymentdetail');
            });
        });
    },
    initTabEvents: function () {
        var me, namespace;
        me = this;
        namespace = '.BacsPaymentAccountHandler';
        me.$root.off(namespace);

        me.$root.on('click' + namespace, '.icon-thumbs.down', function (e) {
            e.stopPropagation();

            var $this = $(this);
            var $item = $this.closest('.payment-item');

            me.moveItemBetweenGroups(
                $item,
                me.$root.find('.held .content'),
                '#fe3a5a',
                function () {
                    $this
                        .removeClass('down')
                        .addClass('up')
                        .attr('title', 'Include Payment');
                    me.updateCounts();
                }
            );
        });

        me.$root.on('click' + namespace, '.icon-thumbs.up', function (e) {
            e.stopPropagation();

            var $this = $(this);
            var $item = $this.closest('.payment-item');

            me.moveItemBetweenGroups(
                $item,
                me.$root.find('.included .content'),
                '#98fb98',
                function () {
                    $this
                        .removeClass('up')
                        .addClass('down')
                        .attr('title', 'Hold Payment');
                    me.updateCounts();
                }
            );
        });

        me.$root.on(
            'click' + namespace,
            '.header-row, .payment-account:not(.subtype)',
            function () {
                $(this).next().slideToggle('fast');
            }
        );

        me.$root.on(
            'click' + namespace,
            '.create-payment:not(.disabled)',
            function () {
                var $this = $(this);
                var selectedTotal = me.$root.find(
                    '.included .payment-item'
                ).length;

                var bacsFileTypeId = parseInt(
                    me.$root.find('#BacsFileTypeId').val()
                );

                if (bacsFileTypeId === 0) {
                    showInfo(
                        'No BACS Payment File type configured for this account'
                    );
                    return;
                }

                if (selectedTotal == 0) {
                    showInfo('No payments included');
                    return;
                }

                $this.addClass('disabled');

                me.createBacsPaymentFile().done(function (r) {
                    if (r && r.Data) {
                        me.refreshClientAccounts();
                    }

                    $this.removeClass('disabled');
                });
            }
        );

        me.$root.on('change' + namespace, '#BatchPayments', function () {

            var BatchPayments = me.$root.find('#BatchPayments').prop('checked');

            gmgps.cloud.helpers.user.putPersonalisationData(
                'bacsPayment.UIoptions',
                {
                    BatchPayments: BatchPayments
                },
                false,
                null
            );

            me.refreshAccount();
        });

        me.$root.on('click' + namespace, 'a.pmdownload', function () {
            var $this = $(this);

            var downloadFile = function () {
                gmgps.cloud.helpers.general.requestBACSFileDownload(
                    parseInt($this.attr('data-historyeventid')),
                    true
                );
            };

            showDialog({
                type: 'question',
                title: 'Bacs Payment File Download',
                msg: 'You are about to request a download of this BACS payment file.  Proceed?',
                buttons: {
                    Yes: function () {
                        $(this).dialog('close');
                        downloadFile();
                    },
                    No: function () {
                        $(this).dialog('close');
                    }
                }
            });
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

    updateCounts: function () {
        var me = this;

        var currencySymbol = me.$root.find('#CurrencySymbol').val();

        var sumIncluded = 0;

        var $included = me.$root.find('.included .payment-item');
        var $held = me.$root.find('.held .payment-item');

        me.$root.find('.included .payment-account').each(function () {
            sumIncluded += parseFloat($(this).data('paymenttotal'));
        });

        me.$root
            .find('.held .header-row')
            .text('Held Payments ({0})'.format($held.length));
        me.$root
            .find('.included .header-row')
            .text('Included Payments ({0})'.format($included.length));

        me.$root.find('.total-included').text($included.length);
        me.$root.find('.total-included-value').text(
            $.inputmask.format(sumIncluded.toFixed(2), {
                alias: 'currency',
                prefix: currencySymbol
            })
        );
    },

    initTabControls: function (selectedTab) {
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

        me.tabs.tabs(
            'option',
            'active',
            me.$root
                .find('.tabs  a[href="#' + selectedTab + '"]')
                .parent()
                .index()
        );
    },

    refreshAccount: function () {
        var me = this;
        var accountId = parseInt(
            me.$root.find('#SelectedGroupBankAccountId').val()
        );

        me.getTabsContent(['paymentdetail'], accountId).done(
            function (s) {
                me.initTabContents(s.Data, 'paymentdetail');
            }
        );
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
        return new gmgps.cloud.http("bacsPaymentHandler-getTabsContent").ajax({
            args: {
                tabNames: tabs,
                groupBankAccountId: groupBankAccountId
            },
            complex: true,
            dataType: 'json',
            type: 'post',
            url: '/Accounts/GetBacsPaymentTabs'
        });
    },
    getSummaryTab: function () {
        return new gmgps.cloud.http("bacsPaymentHandler-getSummaryTab").ajax({
            args: {},
            complex: true,
            dataType: 'json',
            type: 'post',
            url: '/Accounts/GetBacsPaymentLayer'
        });
    },
    createBacsPaymentFile: function () {
        var me = this;

        var paymentVersionList = [];
        var paymentItemList = [];

        var paidTotal = 0;

        me.$root
            .find('.included .payment-item .transactions .transaction')
            .each(function (idx, val) {
                var $v = $(val);
                var id = parseInt($v.data('txid'));
                var versionNumber = parseInt($v.data('txversion'));

                paymentVersionList.push({
                    id: id,
                    versionNumber: versionNumber
                });
            });

        me.$root
            .find('.included .payment-item .payment-account')
            .each(function (idx, val) {
                var $v = $(val);
                paymentItemList.push({
                    accountName: $v.data('accountname'),
                    accountNumber: $v.data('accountnumber'),
                    sortCode: $v.data('sortcode'),
                    paymenttotal: $v.data('paymenttotal'),
                    paymentreference: $v.data('paymentreference'),
                    bdcNumber: $v.data('bdcnumber')
                });

                paidTotal += parseFloat($v.data('paymenttotal'));
            });

        var bacsFileTypeId = parseInt(me.$root.find('#BacsFileTypeId').val());
        var accountId = parseInt(
            me.$root.find('#SelectedGroupBankAccountId').val()
        );
        var processDate = me.$root.find('#ProcessDate').val();

        return new gmgps.cloud.http("bacsPaymentHandler-createBacsPaymentFile")
            .ajax({
                args: {
                    processDate: processDate,
                    bacsFileTypeId: bacsFileTypeId,
                    accountId: accountId,
                    items: paymentVersionList,
                    paymentTotal: paidTotal,
                    paymentCount: paymentItemList.length,
                    paymentItems: paymentItemList
                },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/Accounts/CreateBacsPayment'
            })
            .always(function (r) {
                if (r && !r.Data) {
                    $('.text', '#error-info').each(function (i, v) {
                        var $v = $(v);
                        $v.html(
                            $v
                                .html()
                                .replace(
                                    /please reload the page/i,
                                    function (x) {
                                        return (
                                            x +
                                            ' <span class="fa fa-refresh" onclick="top.location.reload()"></span>'
                                        );
                                    }
                                )
                        );
                    });
                }
                return r;
            });
    },

    getBacsFile: function (historyEventId) {
        var $form = gmgps.cloud.utility.buildForm(
            'Accounts/GetBacsFileStream',
            { HistoryEventId: historyEventId }
        );
        $form.submit();
        $form.remove();
    },

    moveItemBetweenGroups: function (
        $items,
        $destination,
        bgColor,
        onComplete
    ) {
        $destination.slideDown('fast', function () {
            $items.css('background-color', bgColor);
            $items.animate(
                { height: 'toggle', opacity: 0 },
                'fast',
                'linear',
                function () {
                    $items.appendTo($destination);
                    $items
                        .css('background-color', '#FFFFFF')
                        .css('opacity', 1)
                        .show();

                    // flash newly moved item, but not if all items being moved else it doesnt look nice
                    if ($items.length === 1) {
                        $items.effect('highlight', { color: '#ffffe0' }, 950);
                    }
                    onComplete();
                }
            );
        });
    }
};
