gmgps.cloud.ui.views.batchPaySuppliersHandler = function (args) {
    var me = this;

    me.branchIds = args.branchIds;
    me.userId = args.userId;

    me.onComplete = args.onComplete;
    me.onCancel = args.onCancel;

    me.title = args.title;

    return me.init();
};

gmgps.cloud.ui.views.batchPaySuppliersHandler.prototype = {
    init: function () {
        var me = this;

        return me;
    },

    controller: function (args) {
        var me = this;

        me.selectedIds = [];
        me.paymentsMadeIds = [];

        me.singlePayDialogVisible = false;

        me.params = args.data;
        me.$root = args.$root;
        me.$window = args.$window;

        me.branchIdsArray = [];

        var ignoreTickboxChange = false;

        var waitForUIResizeComplete = (function () {
            var timer = 0;
            return function (callback, ms) {
                clearTimeout(timer);
                timer = setTimeout(callback, ms);
            };
        })();

        var waitForTypingToComplete = (function () {
            var timer = 0;
            return function (callback, ms) {
                clearTimeout(timer);
                timer = setTimeout(callback, ms);
            };
        })();

        (this.initEvents = function () {
            var activeBranchIds = me.$root
                .find('#fixed-header')
                .data('branch-ids');

            if (activeBranchIds.toString().indexOf(',') !== -1) {
                me.branchIdsArray = activeBranchIds.split(',');
            } else {
                me.branchIdsArray = [activeBranchIds];
            }

            me.$previewButton = $(
                '<div class="close-preview-button btn fr"><span class="fa fa-times"></span> Hide Preview</div>'
            );
            me.$actionButton = me.$window.find(
                '.bottom .buttons .action-button'
            );
            me.$actionButton.after(me.$previewButton);

            me.$window
                .find('.top')
                .css('background-color', '#3399ff !important');
            me.$window.find('.middle').css('background-color', '#ffffff');

            me.$window
                .find('.top .title')
                .after(
                    '<div class="cancel-payments-screen"><span class="fa fa-times"></span></div>'
                );

            me.$window
                .find('.bottom .buttons .action-button')
                .after(
                    '<div class="payment-counts"><span class="payments">0</span> Payments, <span class="amount">£0.00</span><span class="hidden-count"></span></div>'
                );

            me.$window.on('click', '.cancel-payments-screen', function () {
                me.$window
                    .find('.bottom .buttons .cancel-button')
                    .trigger('click');
            });

            me.$root.on(
                'click',
                '.suppliers-header .col-sortable',
                function () {
                    me.applySorting($(this));
                }
            );

            me.$root.on(
                'change',
                '#include-partials, #apply-terms',
                function () {
                    if (ignoreTickboxChange) {
                        ignoreTickboxChange = false;
                        return;
                    }

                    var currentState = $(this).prop('checked');
                    var $ele = $(this);

                    var selectedRows = me.$root.find(
                        '.supplier-payment-row.selected'
                    ).length;

                    if (selectedRows > 0) {
                        showDialog({
                            type: 'question',
                            title: 'Reset Selected Suppliers?',
                            msg: 'Any selections you have been made will be lost. Do you wish to continue?',
                            buttons: {
                                Yes: function () {
                                    me.loadSuppliers();
                                    me.saveFormOptions();
                                    $(this).dialog('close');
                                    return true;
                                },
                                No: function () {
                                    ignoreTickboxChange = true;
                                    $ele.prop('checked', !currentState);
                                    $(this).dialog('close');
                                    return false;
                                }
                            }
                        });
                    } else {
                        me.loadSuppliers();
                        me.saveFormOptions();
                    }
                }
            );

            me.$root.on(
                'change',
                '#PaymentMethodType, #BankAccount',
                function () {
                    me.searchForInput();
                }
            );

            me.$root.on('keyup', '#SearchSuppliers', function () {
                me.searchForInput();
            });

            me.$root.on(
                'click',
                '.col-suppliername, .supplier-selected, .col.sel, .col.action-col',
                function (e) {
                    e.stopPropagation();
                    return false;
                }
            );

            me.$root.on('click', '.col-suppliername', function () {
                gmgps.cloud.helpers.general.openPreview($(this));
            });

            me.$root.on('click', '.supplier-payment-row', function () {
                me.paySingleItem($(this));
            });

            $(window).on('resize', function () {
                if (me.$root.is(':visible')) {
                    me.sizeUI();
                }
            });

            me.$window.on('click', '.close-preview-button', function () {
                me.$root.find('#document-container').hide();
                me.$window.find('.cancel-button').removeClass('disabled');
                me.$window.find('.action-button').removeClass('disabled');
                $(this).hide();
            });

            me.$root.on('click', '.btn-preview', function () {
                var $row = $(this).closest('.supplier-payment-row');

                me.previewPaymentHtml($row).done(function (r) {
                    var entityMap = {
                        '&': '&amp;',
                        '<': '&lt;',
                        '>': '&gt;',
                        '"': '&quot;',
                        "'": '&#39;',
                        '/': '&#x2F;'
                    };

                    var escapeHtml = function (string) {
                        // eslint-disable-next-line no-useless-escape
                        return String(string).replace(/[&<>"'\/]/g,
                            function (s) {
                                return entityMap[s];
                            }
                        );
                    };

                    if (r && r.Data) {
                        me.$root.find('#document-container').show();
                        me.$window.find('.close-preview-button').show();

                        me.$window.find('.cancel-button').addClass('disabled');
                        me.$window.find('.action-button').addClass('disabled');

                        gmgps.cloud.helpers.general.openPublisher({
                            $target: me.$root.find('#supplier-preview-frame'),
                            settings: {
                                brandId: r.Data.BrandId,
                                branchId: r.Data.BranchId,
                                createNew: false,
                                isPreview: true,
                                forPrint: true,
                                forThumb: false,
                                isDraft: false,
                                testMode: true,
                                designMode: C.PublisherDesignMode.Document,
                                templateType:
                                    C.DocumentTemplateType.PublisherStationery,
                                templateId: r.Data.TemplateId,
                                printFormat: 0,
                                sampleDocumentContent: escapeHtml(
                                    r.Data.Content
                                )
                            }
                        });
                    }
                });
            });
        }),
            (this.previewPaymentHtml = function ($row) {
                var contactId = $row.attr('data-contact-id');
                var accountId = $row.attr('data-account-id');
                var balanceBF = $row.attr('data-balance-bf');
                var balanceCF = $row.attr('data-balance-cf');
                var payable = $row.attr('data-payable');
                var commission = $row.attr('data-commission');

                var IncludePartials = me.$root
                    .find('#include-partials')
                    .prop('checked');
                var ApplyTerms = me.$root.find('#apply-terms').prop('checked');

                var QuickPostSupplierPaymentItem = {
                    ContactId: contactId,
                    AccountId: accountId,
                    BalanceBroughtForward: balanceBF,
                    BalanceCarriedForward: balanceCF,
                    Payable: payable,
                    Commission: commission
                };

                var postData = {
                    includePartialPayments: IncludePartials,
                    applyPaymentTerms: ApplyTerms,
                    supplierPayment: QuickPostSupplierPaymentItem
                };

                return new gmgps.cloud.http(
                    "batchPaySuppliersHandler-previewPaymentHtml"
                ).ajax({
                    args: postData,
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: '/Accounting/DashboardPreviewSupplier'
                });
            }),
            (this.reApplyPaymentStateAfterTableUpdate = function () {
                $.each(me.paymentsMadeIds, function (i, idx) {
                    var sel =
                        '.suppliers-payment-row[data-contactid="' + idx + '"]';
                    me.$window.find(sel).addClass('tr-paid');
                });
            }),
            (this.paySingleItem = function ($row) {
                var contactName = $row.attr('data-suppliername');
                var contactId = $row.attr('data-contact-id');

                if (!me.singlePayDialogVisible) {
                    me.singlePayDialogVisible = true;

                    new gmgps.cloud.ui.views.paySupplierHandler({
                        id: contactId,
                        title: 'Payments For This Supplier: ' + contactName,
                        onComplete: function () {
                            me.loadSuppliers();
                            me.singlePayDialogVisible = false;
                        },
                        onCancel: function () {
                            me.singlePayDialogVisible = false;
                        }
                    }).show();
                }
            }),
            (this.reApplySelectedStateAfterTableUpdate = function () {
                $.each(me.selectedIds, function (i, idx) {
                    var sel =
                        '.supplier-payment-row[data-paymentid="' + idx + '"]';
                    var $row = me.$window.find(sel).addClass('tr-selected');
                    $row.find('.supplier-selected').prop('checked', true);
                });
            }),
            (this.setupSnazzyCheckboxes = function ($target) {
                var $items = $target || me.$root.find('.tickbox-row');

                $items
                    .checkboxpicker({
                        html: true,
                        offLabel: '<span class="glyphicon glyphicon-remove">',
                        onLabel: '<span class="glyphicon glyphicon-ok">'
                    })
                    .on('change', function () {
                        var checked =
                            $(this).prop('checked') === true;
                        var Id;

                        if (checked) {
                            $(this)
                                .closest('.supplier-payment-row')
                                .addClass('selected')
                                .addClass('tr-selected');
                            Id = $(this)
                                .closest('.supplier-payment-row')
                                .attr('data-index-id');
                            me.updateTrackedItems(Id, true);
                        } else {
                            $(this)
                                .closest('.supplier-payment-row')
                                .removeClass('selected')
                                .removeClass('tr-selected');
                            Id = $(this)
                                .closest('.supplier-payment-row')
                                .attr('data-index-id');
                            me.updateTrackedItems(Id, false);
                        }

                        me.updateCounts();
                    });

                var $toolbaritems = me.$root.find(
                    '#include-partials, #apply-terms'
                );

                $toolbaritems
                    .checkboxpicker({
                        html: true,
                        offLabel: '<span class="glyphicon glyphicon-remove">',
                        onLabel: '<span class="glyphicon glyphicon-ok">'
                    })
                    .on('change', function () {});

                me.$root
                    .find('#suppliers-all-selected')
                    .checkboxpicker({
                        html: true,
                        offLabel: '<span class="glyphicon glyphicon-remove">',
                        onLabel: '<span class="glyphicon glyphicon-ok">'
                    })
                    .on('change', function () {
                        var masterChecked =
                            $(this).prop('checked') === true;

                        var $rows = me.$root.find(
                            '.supplier-payment-row:not(.hidden)'
                        );

                        if (masterChecked) {
                            $rows.each(function () {
                                var $row = $(this);
                                $row.addClass('tr-selected')
                                    .find('.supplier-selected')
                                    .prop('checked', true);
                            });
                        } else {
                            $rows.each(function () {
                                var $row = $(this);
                                $row.removeClass('tr-selected')
                                    .find('.supplier-selected')
                                    .prop('checked', false);
                            });
                        }

                        me.updateCounts();
                    });
            }),
            (this.resizeTableScrollRegion = function () {
                var me = this;

                var warningMessageVisible =
                    me.$root.find('.warning-message').css('display') === 'none'
                        ? false
                        : true;

                var initialHeight = $(window).height() - 120;
                me.$window.css('height', initialHeight);

                var initialWidth = $(window).width() - 60;
                me.$window.css('width', initialWidth);

                me.$window.css('top', '40px');
                me.$window.css('left', '25px');

                var windowHeight = me.$window.height();

                var widgetWindowHeight = windowHeight - 40;
                widgetWindowHeight += 'px';

                var scrollRegionHeight = windowHeight - 110;
                if (warningMessageVisible) {
                    scrollRegionHeight -= 40;
                }
                scrollRegionHeight += 'px';

                var tableContainerHeight = windowHeight - 100;
                if (warningMessageVisible) {
                    tableContainerHeight -= 40;
                }
                tableContainerHeight += 'px';

                me.$window
                    .find('.widget-body')
                    .css('height', widgetWindowHeight);
                me.$window.find('.widget-body').css('margin-top', '-10px');
                me.$window
                    .find('.fixed-table-body')
                    .css('height', scrollRegionHeight);
                me.$window
                    .find('.fixed-table-container')
                    .css('height', tableContainerHeight)
                    .css('overflow', 'hidden');

                $('#PMHomeLoadedTable').bootstrapTable('refresh');

                me.resizeTableHeaderColumns();
            }),
            (this.resizeTableHeaderColumns = function () {
                var $cols = me.$root
                    .find(
                        '#results-content .row.supplier-payment-row:not(.hidden)'
                    )
                    .first()
                    .find('.col');
                var $headerCols = me.$root.find('#fixed-header .head-col');
                var i = 0;

                $cols.each(function () {
                    var $col = $(this);
                    var width = $col.outerWidth() + 'px';
                    $($headerCols[i]).css('width', width);
                    i++;
                });
            }),
            (this.loadSuppliers = function () {
                var me = this;

                var IncludePartials = me.$root
                    .find('#include-partials')
                    .prop('checked');
                var ApplyTerms = me.$root.find('#apply-terms').prop('checked');

                me.$root.find('.suppliers-header').attr('data-sort-col', 12);
                me.$root.find('.suppliers-header').attr('data-sort-dir', 1);

                var search = {
                    BranchIds: me.branchIds || [0],
                    UserId: 0,
                    IncludePartials: IncludePartials,
                    ApplyTerms: ApplyTerms
                };

                new gmgps.cloud.http("batchPaySuppliersHandler-loadSuppliers")
                    .ajax({
                        args: {
                            search: search
                        },
                        complex: true,
                        dataType: 'json',
                        type: 'post',
                        url: '/PMHome/GetSuppliersToPayDetail'
                    })
                    .done(function (r) {
                        me.$root.find('#results-content').empty().html(r.Data);

                        me.resetTrackedIds();
                        me.setupSnazzyCheckboxes();
                        me.updateSortOrderUI();
                        me.filterResultsBySearchTerm();
                    });
            }),
            (this.applySorting = function ($col) {
                var me = this;

                var currentSortColumnId = parseInt(
                    me.$root.find('.suppliers-header').attr('data-sort-col')
                );
                var thisColumnId = parseInt($col.attr('data-col'));

                if (currentSortColumnId !== thisColumnId) {
                    // Switching columns + set to ascending order
                    me.$root
                        .find('.suppliers-header')
                        .attr('data-sort-col', thisColumnId);
                    me.$root
                        .find('.suppliers-header')
                        .attr('data-sort-dir', C.SearchOrderType.Ascending);
                } else {
                    // Same column, switch order direction
                    var currentDirection = parseInt(
                        me.$root.find('.suppliers-header').attr('data-sort-dir')
                    );
                    var switchToDirection =
                        currentDirection === C.SearchOrderType.Ascending
                            ? C.SearchOrderType.Descending
                            : C.SearchOrderType.Ascending;
                    me.$root
                        .find('.suppliers-header')
                        .attr('data-sort-dir', switchToDirection);
                }

                me.updateSortOrderUI();
                me.performSorting();
            }),
            (this.performSorting = function () {
                var $rows = me.$root.find('.supplier-payment-row');
                var sortByString = me.$root
                    .find('.head-col.active')
                    .hasClass('string');

                if (sortByString) {
                    $rows.sort(me.sortRows).appendTo('#suppliers-body');
                } else {
                    $rows.sort(me.sortRowsNumeric).appendTo('#suppliers-body');
                }
            }),
            (this.sortRows = function (a, b) {
                var direction = parseInt(
                    me.$root.find('.suppliers-header').attr('data-sort-dir')
                );
                var dataAttrib = me.$root
                    .find('.head-col.active')
                    .attr('data-sort');

                if (direction === 1) {
                    return $(b).attr(dataAttrib) < $(a).attr(dataAttrib)
                        ? 1
                        : -1;
                } else {
                    return $(b).attr(dataAttrib) > $(a).attr(dataAttrib)
                        ? 1
                        : -1;
                }
            }),
            (this.sortRowsNumeric = function (a, b) {
                var direction = parseInt(
                    me.$root.find('.suppliers-header').attr('data-sort-dir')
                );
                var dataAttrib = me.$root
                    .find('.head-col.active')
                    .attr('data-sort');

                if (direction === 1) {
                    return parseFloat($(b).attr(dataAttrib)) <
                        parseFloat($(a).attr(dataAttrib))
                        ? 1
                        : -1;
                } else {
                    return parseFloat($(b).attr(dataAttrib)) >
                        parseFloat($(a).attr(dataAttrib))
                        ? 1
                        : -1;
                }
            }),
            (this.updateSortOrderUI = function () {
                var me = this;
                var currentSortColumnId = parseInt(
                    me.$root.find('.suppliers-header').attr('data-sort-col')
                );
                var currentDirection = parseInt(
                    me.$root.find('.suppliers-header').attr('data-sort-dir')
                );
                var directionCSS =
                    currentDirection === C.SearchOrderType.Ascending
                        ? 'fa-sort-up'
                        : 'fa-sort-down';

                // Reset All
                me.$root
                    .find('.suppliers-header .col-sortable')
                    .removeClass('active');
                me.$root
                    .find('.suppliers-header .col-sortable .fa')
                    .removeClass('fa-sort-down')
                    .removeClass('fa-sort-up')
                    .addClass('fa-sort');

                var $col = me.$root.find(
                    '.suppliers-header .col-sortable[data-col="' +
                        currentSortColumnId +
                        '"]'
                );
                var $dir = $col.find('.fa');

                $col.addClass('active');
                $dir.addClass(directionCSS).removeClass('fa-sort');
            }),
            (this.sizeUI = function () {
                var me = this;
                waitForUIResizeComplete(function () {
                    me.resizeTableScrollRegion(false);
                }, 200);
            }),
            (this.searchForInput = function () {
                var me = this;
                waitForTypingToComplete(function () {
                    me.filterResultsBySearchTerm();
                }, 500);
            }),
            (this.updateCounts = function () {
                var counter = me.$root.find(
                    '.supplier-payment-row.selected'
                ).length;

                if (counter > 0) {
                    var label =
                        counter === 1
                            ? 'Pay 1 Supplier'
                            : 'Pay ' + counter + ' Suppliers';
                    me.$window
                        .find('.bottom .buttons .action-button')
                        .text(label)
                        .removeClass('grey')
                        .addClass('bgg-property');
                } else {
                    me.$window
                        .find('.bottom .buttons .action-button')
                        .text('Pay Suppliers')
                        .addClass('grey')
                        .removeClass('bgg-property');
                }

                var summary = me.getSelectionSummary();
                me.updatePayableItems(
                    summary.selectedSuppliers,
                    summary.selectedAmount,
                    summary.hiddenSelectedSuppliers
                );
            }),
            (this.filterResultsBySearchTerm = function () {
                var searchTerm = $('#SearchSuppliers').val().toLowerCase();
                var selectedPaymentMethodId = $('#PaymentMethodType').val();
                var selectedBankAccountId = $('#BankAccount').val();

                // Show all
                $('.supplier-payment-row').removeClass('hidden');

                $('.supplier-payment-row').each(function () {
                    var $row = $(this);
                    var contents = $row.attr('data-searchterm').toLowerCase();
                    var paymentTypeId = $row.attr('data-paymenttype-id');
                    var bankAccountId = $row.attr('data-account-id');

                    if (
                        searchTerm.length > 0 &&
                        contents.indexOf(searchTerm) === -1
                    ) {
                        $row.addClass('hidden');
                    }

                    if (
                        selectedPaymentMethodId > 0 &&
                        paymentTypeId !== selectedPaymentMethodId
                    ) {
                        $row.addClass('hidden');
                    }

                    if (
                        selectedBankAccountId > 0 &&
                        bankAccountId !== selectedBankAccountId
                    ) {
                        $row.addClass('hidden');
                    }
                });

                me.resizeTableHeaderColumns();
                me.updateCounts();
            }),
            (this.resetTrackedIds = function () {
                var me = this;
                me.selectedIds = [];
                me.$root.find('#suppliers-all-selected').prop('checked', false);
                me.updateCounts();
            }),
            (this.updateTrackedItems = function (id, add) {
                var me = this;

                var masterChecked = me.$root.find('#suppliers-all-selected').prop('checked') === true;

                var idInt = parseInt(id);
                var index;

                if (!masterChecked) {
                    if (add) {
                        index = me.selectedIds.indexOf(idInt);
                        if (index === -1) {
                            me.selectedIds.push(idInt);
                        }
                    } else {
                        index = me.selectedIds.indexOf(idInt);
                        if (index > -1) {
                            me.selectedIds.splice(index, 1);
                        }
                    }
                } else {
                    if (!add) {
                        index = me.selectedIds.indexOf(idInt);
                        if (index === -1) {
                            me.selectedIds.push(idInt);
                        }
                    } else {
                        index = me.selectedIds.indexOf(idInt);
                        if (index > -1) {
                            me.selectedIds.splice(index, 1);
                        }
                    }
                }

                //console.log(me.selectedIds);
                me.updateCounts();
            }),
            (this.updatePayableItems = function (counter, amount, hidden) {
                var amountFormatted = '£' + amount.toFixed(2);

                if (counter > 0) {
                    me.$window
                        .find('.bottom .buttons .payment-counts .payments')
                        .text(counter);
                    me.$window
                        .find('.bottom .buttons .payment-counts .amount')
                        .text(amountFormatted);
                    me.$window.find('.bottom .buttons .payment-counts').show();
                } else {
                    me.$window.find('.bottom .buttons .payment-counts').hide();
                }

                if (hidden > 0) {
                    var label = '(' + hidden + ' Hidden)';
                    me.$window
                        .find('.bottom .buttons .payment-counts .hidden-count')
                        .text(label);
                    me.$window
                        .find('.bottom .buttons .payment-counts .hidden-count')
                        .show();
                } else {
                    me.$window
                        .find('.bottom .buttons .payment-counts .hidden-count')
                        .hide();
                }
            }),
            (this.getSelectionSummary = function () {
                var hiddenCheckedRows = me.$root.find(
                    '.supplier-payment-row.hidden .supplier-selected:checked'
                );
                var hiddenSelectedSuppliers = hiddenCheckedRows.length;

                var checkedRows = me.$root.find('.supplier-selected:checked');
                var selectedSuppliers = checkedRows.length;
                var amount = 0.0;
                checkedRows.each(function () {
                    amount += parseFloat(
                        $(this)
                            .closest('.supplier-payment-row')
                            .attr('data-net-payable')
                    );
                });

                return {
                    selectedSuppliers: selectedSuppliers,
                    selectedAmount: amount,
                    hiddenSelectedSuppliers: hiddenSelectedSuppliers
                };
            }),
            (this.action = function (onComplete) {
                var $btn = me.$window.find('.bottom .buttons .action-button');

                if (!$btn.hasClass('bgg-property')) {
                    return false;
                } else {
                    var summary = me.getSelectionSummary();
                    var amountFormatted =
                        '£' + summary.selectedAmount.toFixed(2);

                    showDialog({
                        type: 'info',
                        title: 'Pay Suppliers?',
                        msg:
                            'You are about to pay ' +
                            summary.selectedSuppliers +
                            ' suppliers totalling ' +
                            amountFormatted +
                            '. Do you wish to continue?',
                        buttons: {
                            Confirm: function () {
                                $(this).dialog('close');

                                var QuickPostSupplierPaymentItems =
                                    me.getSupplierPaymentPostModel();
                                var IncludePartials = me.$root
                                    .find('#include-partials')
                                    .prop('checked');
                                var ApplyTerms = me.$root
                                    .find('#apply-terms')
                                    .prop('checked');

                                new gmgps.cloud.http(
                                    "batchPaySuppliersHandler-Confirm"
                                )
                                    .ajax({
                                        args: {
                                            includePartialPayments:
                                                IncludePartials,
                                            applyPaymentTerms: ApplyTerms,
                                            supplierPaymentList:
                                                QuickPostSupplierPaymentItems
                                        },
                                        complex: true,
                                        dataType: 'json',
                                        type: 'post',
                                        url: '/Accounting/QuickPaySuppliers'
                                    })
                                    .done(function () {
                                        onComplete();
                                    });
                            },
                            Cancel: function () {
                                $(this).dialog('close');
                                return true;
                            }
                        }
                    });

                    return true;
                }
            }),
            (this.getSupplierPaymentPostModel = function () {
                var QuickPostSupplierPaymentItems = [];

                var $selectedRows = me.$root.find(
                    '.supplier-payment-row.selected'
                );

                $selectedRows.each(function () {
                    var $row = $(this);
                    var contactId = $row.attr('data-contact-id');
                    var accountId = $row.attr('data-account-id');
                    var balanceBF = $row.attr('data-balance-bf');
                    var balanceCF = $row.attr('data-balance-cf');
                    var payable = $row.attr('data-payable');
                    var commission = $row.attr('data-commission');

                    var QuickPostSupplierPaymentItem = {
                        ContactId: contactId,
                        AccountId: accountId,
                        BalanceBroughtForward: balanceBF,
                        BalanceCarriedForward: balanceCF,
                        Payable: payable,
                        Commission: commission
                    };

                    QuickPostSupplierPaymentItems.push(
                        QuickPostSupplierPaymentItem
                    );
                });

                console.log(QuickPostSupplierPaymentItems);

                return QuickPostSupplierPaymentItems;
            }),
            (this.cancel = function (onCancel) {
                var counter = me.$root.find(
                    '.supplier-payment-row.selected'
                ).length;

                if (counter > 0) {
                    showDialog({
                        type: 'question',
                        title: 'Close Suppliers Screen?',
                        msg: 'You have chosen to Close Suppliers to Pay. Any changes you have made that have not been updated will be lost. Do you wish to continue?',
                        buttons: {
                            Yes: function () {
                                $(this).dialog('close');
                                onCancel(true);
                                //return true;
                            },
                            No: function () {
                                $(this).dialog('close');
                                onCancel(false);
                                //return false;
                            }
                        }
                    });
                } else {
                    onCancel(true);
                }

                return true;
            }),
            (this.saveFormOptions = function () {
                var IncludePartials = me.$root
                    .find('#include-partials')
                    .prop('checked');
                var ApplyTerms = me.$root.find('#apply-terms').prop('checked');

                gmgps.cloud.helpers.user.putPersonalisationData(
                    'batchPaySuppliers.UIoptions',
                    {
                        ApplyTerms: ApplyTerms,
                        IncludePartials: IncludePartials
                    },
                    false,
                    null
                );
            }),
            me.$root.find('#PMHomeLoadedTable').bootstrapTable({
                onPostBody: function () {
                    me.reApplyPaymentStateAfterTableUpdate();
                    me.setupSnazzyCheckboxes();
                    me.resizeTableScrollRegion();
                }
            });

        // Delay table resize due to Window fade in effect
        setTimeout(function () {
            me.resizeTableScrollRegion();
        }, 100);

        me.initEvents();

        me.setupSnazzyCheckboxes();
    },

    show: function () {
        var me = this;

        var initialWidth = $(window).width() - 60;

        new gmgps.cloud.ui.controls.window({
            title: me.title,
            windowId: 'batchPaySupplierModal',
            controller: me.controller,
            url: 'PMHome/GetSuppliersToPaySummary',
            urlArgs: {
                branchIds: me.branchIds,
                userId: me.userId
            },
            data: me,
            post: true,
            complex: true,
            width: initialWidth,
            draggable: true,
            modal: true,
            cancelButton: 'Close',
            onCancel:
                me.onCancel ||
                function () {
                    return true;
                },
            actionButton: 'Pay Suppliers',
            postActionCallback:
                me.onComplete ||
                function () {
                    return false;
                }
        });
    }
};
