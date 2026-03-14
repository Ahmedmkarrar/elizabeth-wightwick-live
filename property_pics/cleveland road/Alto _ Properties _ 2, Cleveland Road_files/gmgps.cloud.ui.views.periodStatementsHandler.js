gmgps.cloud.ui.views.periodStatementsHandler = function (args) {
    var me = this;

    me.$root = args.$root;
    me.container = args.container;

    me.selectedIds = [];

    // eslint-disable-next-line no-unused-vars
    var search = {
        fromDate: null,
        toDate: null,
        incArch: false,
        branchId: 0,
        custom: ''
    };

    // eslint-disable-next-line no-unused-vars
    var waitForUIResizeComplete = (function () {
        var timer = 0;
        return function (callback, ms) {
            clearTimeout(timer);
            timer = setTimeout(callback, ms);
        };
    })();

    me.http = new gmgps.cloud.http(
        "periodStatementsHandler-periodStatementsHandler"
    );
    return me;
};

gmgps.cloud.ui.views.periodStatementsHandler.prototype = {
    init: function (onComplete) {
        var me = this;

        me.initControls(onComplete);
        me.initEvents();

        me.displayMessage(
            'Select Statement From and To dates to see a list of Landlords'
        );
        me.updateCounts();
        me.setupCheckboxes();
        me.adjustColumnWidths();
    },

    initControls: function (onComplete) {
        var me = this;

        //Date Pickers
        me.$root.find('.date-picker').each(function (i, v) {
            $(v).datepicker({
                numberOfMonths: 1,
                showButtonPanel: true,
                dateFormat: 'dd/mm/yy',
                minDate:
                    $(v).attr('data-datePickerMode') == 'future'
                        ? new Date()
                        : null
            });
        });

        if (onComplete && onComplete instanceof Function) {
            onComplete(me);
        }
    },

    initEvents: function () {
        var me, namespace;
        me = this;
        namespace = '.PeriodStatements';

        me.$root.off(namespace);

        $(window).on('resize' + namespace, function () {
            if (me.$root.is(':visible')) {
                me.sizeUI();
            }
        });

        me.$root.on(
            'click' + namespace,
            '.nextprev.next, .nextprev.prev',
            function () {
                if (!$(this).hasClass('disabled')) {
                    var page = parseInt($(this).attr('data-page'));
                    me.loadStatements(page);
                }
            }
        );

        me.$root.on('click' + namespace, '.statement-selected', function (e) {
            e.stopPropagation();
            return false;
        });

        me.$root.on(
            'change' + namespace,
            '#StatementsBranchId, #FromDate, #ToDate, #include-archived',
            function () {
                if (me.selectedIds.length > 0) {
                    showDialog({
                        type: 'question',
                        title: 'Clear Selected Landlords',
                        msg:
                            'Updating the search will clear the ' +
                            me.selectedIds.length +
                            ' selected landlords. Proceed?',
                        buttons: {
                            Yes: function () {
                                $(this).dialog('close');
                                me.resetTrackedIds();
                                me.loadStatements(1);
                                me.saveSearch();
                            },
                            No: function () {
                                $(this).dialog('close');
                                me.revertSearch();
                                return false;
                            }
                        }
                    });
                } else {
                    me.resetTrackedIds();
                    me.loadStatements(1);
                    me.saveSearch();
                }
            }
        );

        me.$root.on('keyup' + namespace, '#SearchStatements', function (e) {
            if (e.keyCode == 13) {
                if (me.selectedIds.length > 0) {
                    showDialog({
                        type: 'question',
                        title: 'Clear Selected Landlords',
                        msg:
                            'Updating the search will clear the ' +
                            me.selectedIds.length +
                            ' selected landlords. Proceed?',
                        buttons: {
                            Yes: function () {
                                $(this).dialog('close');
                                me.resetTrackedIds();
                                me.loadStatements(1);
                                me.saveSearch();
                            },
                            No: function () {
                                $(this).dialog('close');
                                me.revertSearch();
                                return false;
                            }
                        }
                    });
                } else {
                    me.resetTrackedIds();
                    me.loadStatements(1);
                    me.saveSearch();
                }
            }
        });

        me.$root.on('click' + namespace, '.preview-btn', function () {
            me.previewReport($(this).closest('.statement-row'));
        });

        me.$root.on(
            'click' + namespace,
            '.statements-header .col-sortable',
            function () {
                me.applySorting($(this));
            }
        );

        me.$root.on('click' + namespace, '.btn-close-preview', function () {
            me.removeStatementPreview();
        });

        me.$root.on('click' + namespace, '#create-statements', function () {
            if (!$(this).hasClass('disabled')) {
                me.processStatements();
            }
        });

        me.$root.on('click' + namespace, '#include-prop-analysis', function () {
            var $itemised = me.$root.find('#itemised-group');
            var $expenditure = me.$root.find('#expenditure-group');

            if ($(this).prop('checked')) {
                $itemised.show();
                $expenditure.show();
            } else {
                $itemised.hide();
                $expenditure.hide();
            }
        });

        me.$root.on('mouseover' + namespace, '.info', function () {
            $(this).qtip({
                content: $(this).attr('data-info'),
                position: {
                    my: 'top right',
                    at: 'bottom middle'
                },
                show: {
                    event: 'mouseenter',
                    ready: true,
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
        });
    },

    revertSearch: function () {
        var me = this;
        me.$root.find('#StatementsBranchId').val(me.search.branchId);
        me.$root.find('#FromDate').datepicker('setDate', me.search.fromDate);
        me.$root.find('#ToDate').datepicker('setDate', me.search.toDate);
        me.$root.find('#include-archived').prop('checked', me.search.incArch);
        me.$root.find('#SearchStatements').val(me.search.custom);

        if (me.search.incArch) {
            me.$root
                .find('#include-archived')
                .closest('.tickbox')
                .addClass('ticked');
        } else {
            me.$root
                .find('#include-archived')
                .closest('.tickbox')
                .removeClass('ticked');
        }
    },

    saveSearch: function () {
        var me = this;
        var branchId = me.$root.find('#StatementsBranchId').val()
            ? me.$root.find('#StatementsBranchId').val()
            : 0;
        var fromDate = me.$root.find('#FromDate').datepicker('getDate');
        var toDate = me.$root.find('#ToDate').datepicker('getDate');
        var includeArchived = me.$root
            .find('#include-archived')
            .prop('checked');
        var custom = me.$root.find('#SearchStatements').val();

        me.search = {
            fromDate: fromDate,
            toDate: toDate,
            incArch: includeArchived,
            branchId: branchId,
            custom: custom
        };
    },

    applySorting: function ($col) {
        var me = this;

        var currentSortColumnId = parseInt(
            me.$root.find('.statements-header').attr('data-sort-col')
        );
        var thisColumnId = parseInt($col.attr('data-col'));

        // Switching columns + set to ascending order
        if (currentSortColumnId != thisColumnId) {
            //var switchToColumn = (thisColumnId == C.SearchOrderBy.Name) ? C.SearchOrderBy.Address : C.SearchOrderBy.Name;
            me.$root
                .find('.statements-header')
                .attr('data-sort-col', thisColumnId);
            me.$root
                .find('.statements-header')
                .attr('data-sort-dir', C.SearchOrderType.Ascending);
        } else {
            // Same column, switch order direction
            var currentDirection = parseInt(
                me.$root.find('.statements-header').attr('data-sort-dir')
            );
            var switchToDirection =
                currentDirection === C.SearchOrderType.Ascending
                    ? C.SearchOrderType.Descending
                    : C.SearchOrderType.Ascending;
            me.$root
                .find('.statements-header')
                .attr('data-sort-dir', switchToDirection);
        }

        me.loadStatements(1);
    },

    updateSortOrderUI: function () {
        var me = this;
        var currentSortColumnId = parseInt(
            me.$root.find('.statements-header').attr('data-sort-col')
        );
        var currentDirection = parseInt(
            me.$root.find('.statements-header').attr('data-sort-dir')
        );
        var directionCSS =
            currentDirection == C.SearchOrderType.Ascending
                ? 'fa-sort-up'
                : 'fa-sort-down';

        // Reset All
        me.$root.find('.statements-header .col-sortable').removeClass('active');
        me.$root
            .find('.statements-header .col-sortable .fa')
            .removeClass('fa-sort-down')
            .removeClass('fa-sort-up')
            .addClass('fa-sort');

        var $col = me.$root.find(
            '.statements-header .col-sortable[data-col="' +
                currentSortColumnId +
                '"]'
        );
        var $dir = $col.find('.fa');

        $col.addClass('active');
        $dir.addClass(directionCSS).removeClass('fa-sort');
    },

    resetTrackedIds: function () {
        var me = this;
        me.selectedIds = [];
    },

    setupCheckboxes: function () {
        var me = this;

        var $items = me.$root.find('.statement-selected');

        $items
            .checkboxpicker({
                html: true,
                offLabel: '<span class="glyphicon glyphicon-remove">',
                onLabel: '<span class="glyphicon glyphicon-ok">'
            })
            .on('change', function () {
                var checked =
                    $(this).prop('checked') === true;
                var id;

                if (checked) {
                    $(this).closest('.statement-row').addClass('selected');
                    id = $(this)
                        .closest('.statement-row')
                        .attr('data-contact-id');
                    me.updateTrackedItems(id, true);
                } else {
                    $(this).closest('.statement-row').removeClass('selected');
                    id = $(this)
                        .closest('.statement-row')
                        .attr('data-contact-id');
                    me.updateTrackedItems(id, false);
                }

                me.updateCounts();
            });

        me.$root
            .find('#statement-all-selected')
            .checkboxpicker({
                html: true,
                offLabel: '<span class="glyphicon glyphicon-remove">',
                onLabel: '<span class="glyphicon glyphicon-ok">'
            })
            .on('change', function () {
                var masterChecked =
                    $(this).prop('checked') === true;

                if (masterChecked) {
                    me.resetTrackedIds();
                    me.$root
                        .find('.statement-row')
                        .addClass('selected')
                        .find('.statement-selected')
                        .prop('checked', true);
                } else {
                    me.resetTrackedIds();
                    me.$root
                        .find('.statement-row')
                        .removeClass('selected')
                        .find('.statement-selected')
                        .prop('checked', false);
                }

                me.updateCounts();
            });
    },

    updateCounts: function () {
        var me = this;
        var total = parseInt(
            me.$root.find('.controls').attr('data-total-rows')
        );
        var selected = 0;

        var masterChecked =
            me.$root.find('#statement-all-selected').prop('checked') === true;

        selected = masterChecked
            ? total - me.selectedIds.length
            : me.selectedIds.length;

        if (selected > 0) {
            var label =
                selected == 1
                    ? 'Create Statement'
                    : 'Create ' + selected + ' Statements';
            me.$root
                .find('#create-statements')
                .text(label)
                .removeClass('disabled');
        } else {
            me.$root
                .find('#create-statements')
                .text('Create Statements')
                .addClass('disabled');
        }
    },

    loadStatements: function (pageNumber) {
        var me = this;

        var branchId = me.$root.find('#StatementsBranchId').val()
            ? me.$root.find('#StatementsBranchId').val()
            : 0;
        var fromDate = me.$root.find('#FromDate').datepicker('getDate');
        var toDate = me.$root.find('#ToDate').datepicker('getDate');
        var includeArchived = me.$root
            .find('#include-archived')
            .prop('checked');

        var sortCol = parseInt(
            me.$root.find('.statements-header').attr('data-sort-col')
        );
        var sortDir = parseInt(
            me.$root.find('.statements-header').attr('data-sort-dir')
        );

        if (fromDate == null || toDate == null) {
            return false;
        }

        new gmgps.cloud.http("periodStatementsHandler-loadStatements")
            .ajax({
                args: {
                    branchId: branchId,
                    dateFrom: fromDate,
                    dateTo: toDate,
                    includeArchived: includeArchived,
                    page: pageNumber,
                    searchstring: me.$root.find('#SearchStatements').val(),
                    sortDirection: sortDir,
                    sortCol: sortCol
                },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/Accounts/GetBulkPeriodStatementContactPagedList'
            })
            .done(function (r) {
                me.$root.find('#results-content').empty().html(r.Data);

                var total = parseInt(
                    me.$root.find('.controls').attr('data-total-rows')
                );

                if (total > 0) {
                    me.reApplySelectedStateAfterTableUpdate();
                    me.setupCheckboxes();
                    me.updateSortOrderUI();

                    me.$root.find('#message-stage').hide();
                    me.$root.find('#main-stage').show();

                    me.adjustColumnWidths();
                } else {
                    me.displayMessage(
                        'No landlords statements are available for the date range / options selected'
                    );
                    me.updateCounts();
                }
            });
    },

    updateTrackedItems: function (id, add) {
        var me = this;

        var masterChecked =
            me.$root.find('#statement-all-selected').prop('checked') === true;

        var idInt = parseInt(id);
        var index;

        if (!masterChecked) {
            if (add) {
                index = me.selectedIds.indexOf(idInt);
                if (index == -1) {
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
                if (index == -1) {
                    me.selectedIds.push(idInt);
                }
            } else {
                index = me.selectedIds.indexOf(idInt);
                if (index > -1) {
                    me.selectedIds.splice(index, 1);
                }
            }
        }
    },

    reApplySelectedStateAfterTableUpdate: function () {
        var me = this;

        var masterChecked =
            me.$root.find('#statement-all-selected').prop('checked') === true;

        if (!masterChecked) {
            me.$root
                .find('.statement-row')
                .removeClass('selected')
                .find('.statement-selected')
                .prop('checked', false);

            $.each(me.selectedIds, function (i, idx) {
                var sel = '.statement-row[data-contact-id="' + idx + '"]';
                var $row = me.$root.find(sel).addClass('selected');
                $row.find('.statement-selected').prop('checked', true);
            });
        } else {
            me.$root
                .find('.statement-row')
                .addClass('selected')
                .find('.statement-selected')
                .prop('checked', true);

            $.each(me.selectedIds, function (i, idx) {
                var sel = '.statement-row[data-contact-id="' + idx + '"]';
                var $row = me.$root.find(sel).removeClass('selected');
                $row.find('.statement-selected').prop('checked', false);
            });
        }
    },

    displayMessage: function (message) {
        var me = this;
        me.$root.find('#message-stage .message').text(message);

        //me.$root.find('#main-stage').hide();
        me.$root.find('#message-stage').show();
    },

    adjustColumnWidths: function () {
        var me = this;

        var actionCol = 98;
        var selCol = 40;

        var $nameHeader = me.$root.find('#main-stage .statements-header .name');
        var $addressHeader = me.$root.find(
            '#main-stage .statements-header .address'
        );
        var $actionHeader = me.$root.find(
            '#main-stage .statements-header .action'
        );

        var $nameRow = me.$root.find('#results-content .statement-row .name');
        var $addressRow = me.$root.find(
            '#results-content .statement-row .address'
        );

        var availableWidth = parseInt(
            me.$root.find('.main-container').width() - 20
        );

        if (me.scrollBarIsVisible()) {
            availableWidth -= me.getScrollBarWidth();
            var width = 196 + me.getScrollBarWidth() + 'px';
            $actionHeader.css('width', width);
        } else {
            $actionHeader.css('width', '196px');
        }

        $nameRow.css(
            'width',
            parseInt((availableWidth / 100) * 40 - actionCol - selCol)
        );
        $addressRow.css(
            'width',
            parseInt((availableWidth / 100) * 60 - actionCol - selCol)
        );

        $nameHeader.css(
            'width',
            parseInt((availableWidth / 100) * 40 - actionCol - selCol)
        );
        $addressHeader.css(
            'width',
            parseInt((availableWidth / 100) * 60 - actionCol - selCol)
        );
    },

    scrollBarIsVisible: function () {
        var me = this;
        return (
            me.$root.find('#results-content .statements-list').get(0)
                .scrollHeight >
            me.$root.find('#results-content .statements-list').height()
        );
    },

    getScrollBarWidth: function () {
        var $outer = $('<div>')
                .css({ visibility: 'hidden', width: 100, overflow: 'scroll' })
                .appendTo('body'),
            widthWithScroll = $('<div>')
                .css({ width: '100%' })
                .appendTo($outer)
                .outerWidth();
        $outer.remove();
        return 100 - widthWithScroll;
    },

    sizeUI: function () {
        var me = this;
        // eslint-disable-next-line no-undef
        waitForUIResizeComplete(function () {
            me.adjustColumnWidths();
        }, 200);
    },

    openLandlordRecord: function (id) {
        gmgps.cloud.helpers.contact.editContact({
            id: parseInt(id)
        });
    },

    previewReport: function ($statement) {
        var me = this;

        var groupId = parseInt($statement.attr('data-group-id'));
        var branchId = parseInt($statement.attr('data-branch-id'));
        var contactId = parseInt($statement.attr('data-contact-id'));

        var fromDate = me.$root.find('#FromDate').datepicker('getDate');
        var toDate = me.$root.find('#ToDate').datepicker('getDate');
        var includenrltax = me.$root.find('#include-nrltax').prop('checked');

        var includePropAnalysis = me.$root
            .find('#include-prop-analysis')
            .prop('checked');
        var itemisedIncome = me.$root.find('#print-itemised').prop('checked');
        var itemisedExp = me.$root.find('#print-expenditure').prop('checked');
        var delivery = me.$root.find('input[name=delivery]:checked').val();

        new gmgps.cloud.http("periodStatementsHandler-previewReport").ajax(
            {
                args: {
                    groupId: groupId,
                    branchId: branchId,
                    contactId: contactId,
                    DateFrom: fromDate,
                    DateTo: toDate,
                    IncludeNrlTax: includenrltax,
                    IncludePropertyAnalysis: includePropAnalysis,
                    ItemisedIncome: itemisedIncome,
                    ItemisedExpenditure: itemisedExp,
                    DeliveryMethod: delivery
                },
                dataType: 'json',
                complex: true,
                type: 'post',
                url: '/Accounting/PreviewPeriodStatementHtml'
            },
            function (response) {
                if (response.Data && response.Data.Content.length > 0) {
                    me.presentStatementPreview(response);
                }
            }
        );
    },

    presentStatementPreview: function (r) {
        var me = this;

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
            return String(string).replace(/[&<>"'\/]/g, function (s) {
                return entityMap[s];
            });
        };

        if (r && r.Data) {
            // Hide messages and grid...
            me.$root.find('#main-stage').hide();
            me.$root.find('#message-stage').hide();
            me.$root.find('.search-statements').hide();

            me.$root.find('#accounts-period-report-preview-area').show();

            gmgps.cloud.helpers.general.openPublisher({
                $target: me.$root.find('#accounts-period-report-preview-frame'),
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
                    templateType: C.DocumentTemplateType.PublisherStationery,
                    templateId: r.Data.TemplateId,
                    printFormat: 0,
                    sampleDocumentContent: escapeHtml(r.Data.Content)
                }
            });
        }
    },

    removeStatementPreview: function () {
        var me = this;

        me.$root.find('#accounts-period-report-preview-area').hide();
        me.$root
            .find('#accounts-period-report-preview-frame')
            .contents()
            .find('html')
            .html('');
        me.$root.find('#main-stage').show();
        me.$root.find('#message-stage').hide();
        me.$root.find('.search-statements').show();
    },

    processStatements: function () {
        var me = this;

        var masterChecked =
            me.$root.find('#statement-all-selected').prop('checked') === true;

        var fromDate = me.$root.find('#FromDate').datepicker('getDate');
        var toDate = me.$root.find('#ToDate').datepicker('getDate');
        var includeNRL = me.$root.find('#include-nrltax').prop('checked');
        var includePropAnalysis = me.$root
            .find('#include-prop-analysis')
            .prop('checked');
        var itemisedIncome = me.$root.find('#print-itemised').prop('checked');
        var itemisedExp = me.$root.find('#print-expenditure').prop('checked');
        var delivery = me.$root.find('input[name=delivery]:checked').val();
        var contactids = me.selectedIds;

        var ProcessModel = {
            ContactIds: contactids,
            PeriodStatementOptions: {
                DateFrom: fromDate,
                DateTo: toDate,
                IncludeNrlTax: includeNRL,
                IncludePropertyAnalysis: includePropAnalysis,
                ItemisedIncome: itemisedIncome,
                ItemisedExpenditure: itemisedExp,
                DeliveryMethod: delivery
            }
        };

        if (masterChecked) {
            me.getContactIds().done(function (contactids) {
                ProcessModel.ContactIds = contactids;
                me.postPeriodStatements(ProcessModel);
            });
        } else {
            me.postPeriodStatements(ProcessModel);
        }
    },

    postPeriodStatements: function (ProcessModel) {
        var me = this;

        new gmgps.cloud.http("periodStatementsHandler-postPeriodStatements")
            .ajax({
                args: {
                    model: ProcessModel
                },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/Accounts/ProcessPeriodStatements'
            })
            .done(function (r) {
                if (r.Data.OverallResult == true) {
                    me.resetForm();
                } else {
                    me.showProcessErrors(r.Data);
                }
            });
    },

    getContactIds: function () {
        var me = this;

        var branchId = me.$root.find('#StatementsBranchId').val()
            ? me.$root.find('#StatementsBranchId').val()
            : 0;
        var fromDate = me.$root.find('#FromDate').datepicker('getDate');
        var toDate = me.$root.find('#ToDate').datepicker('getDate');
        var includeArchived = me.$root
            .find('#include-archived')
            .prop('checked');

        var deferred = $.Deferred();

        new gmgps.cloud.http("periodStatementsHandler-getContactIds")
            .ajax({
                args: {
                    branchId: branchId,
                    dateFrom: fromDate,
                    dateTo: toDate,
                    includeArchived: includeArchived,
                    searchstring: me.$root.find('#SearchStatements').val(),
                    contactIdsToExclude: me.selectedIds
                },
                complex: true,
                dataType: 'json',
                type: 'get',
                url: '/Accounts/GetBulkPeriodStatementContactIds'
            })
            .done(function (r) {
                if (r && r.Data) {
                    deferred.resolve(r.Data);
                }
            });

        return deferred.promise();
    },

    showProcessErrors: function (response) {
        var me = this;

        var successfulPosts = [];
        var failedPosts = [];

        $.each(response.Results, function (k, v) {
            if (v.Result == true) {
                successfulPosts.push(parseInt(v.ContactId));
            } else {
                failedPosts.push(parseInt(v.ContactId));
            }
        });

        showDialog({
            type: 'information',
            title: 'Process Statements Status',
            msg:
                successfulPosts.length +
                ' Period Statements successfully created!<br/>' +
                failedPosts.length +
                ' Period Statements failed to create  – the failed records will remain selected for you to try again',
            buttons: {
                Continue: function () {
                    $(this).dialog('close');
                    me.untickSuccessfulContactPosts(successfulPosts);
                    me.updateCounts();
                }
            }
        });
    },

    untickSuccessfulContactPosts: function (successfulPosts) {
        var me = this;
        var masterChecked =
            me.$root.find('#statement-all-selected').prop('checked') === true;

        if (!masterChecked) {
            // Un-tick processed statements
            $.each(successfulPosts, function (k, v) {
                var sel = '.statement-row[data-contact-id="' + v + '"]';
                me.$root
                    .find(sel)
                    .removeClass('selected')
                    .find('.statement-selected')
                    .prop('checked', false);
                // Remove from tracked Ids
                me.updateTrackedItems(parseInt(v), false);
            });
        } else {
            // Un-tick processed statements
            $.each(successfulPosts, function (k, v) {
                var sel = '.statement-row[data-contact-id="' + v + '"]';
                me.$root
                    .find(sel)
                    .removeClass('selected')
                    .find('.statement-selected')
                    .prop('checked', false);
                // Remove from tracked Ids
                me.updateTrackedItems(parseInt(v), false);
            });
        }
    },

    resetForm: function () {
        var me = this;

        me.search = {
            fromDate: null,
            toDate: null,
            incArch: false,
            branchId: 0,
            custom: ''
        };

        me.revertSearch();
        me.selectedIds = [];

        me.$root.find('.statements-list').html('');
        me.$root.find('.pageitems').html('0 items found');

        me.displayMessage(
            'Select Statement From and To dates to see a list of Landlords'
        );
        me.updateCounts();
    }
};
