gmgps.cloud.ui.views.boardManagement = function (args) {
    var me = this;

    me.$root = args.$root;
    me.tools = args.tools;

    me.$changesTab = me.$root.find(
        'li[data-id={0}]'.format(C.BoardManagementViewMode.Changes)
    );
    me.$warningsTab = me.$root.find(
        'li[data-id={0}]'.format(C.BoardManagementViewMode.Warnings)
    );
    me.$outofdateTab = me.$root.find(
        'li[data-id={0}]'.format(C.BoardManagementViewMode.OutOfDate)
    );
    me.$transactionsTab = me.$root.find(
        'li[data-id={0}]'.format(C.BoardManagementViewMode.Transactions)
    );

    me.$branchFilter = me.tools.$root.find(
        'select[data-dataname=bm-branch-filter]'
    );
    me.$boardFilter = me.tools.$root.find(
        'select[data-dataname=bm-board-filter]'
    );
    me.$contractorFilter = me.tools.$root.find(
        'select[data-dataname=bm-supplier-filter]'
    );
    me.$propertyRecordTypeFilter = me.tools.$root.find(
        'select[data-dataname=bm-property-record-type]'
    );
    me.$fromFilter = me.tools.$root.find('input[data-dataname=bm-from]');
    me.$toFilter = me.tools.$root.find('input[data-dataname=bm-to]');

    me.currentTab = C.BoardManagementViewMode.Changes;

    me.$listContainer = me.$root.find('#board-list-container');

    me.ids = [];

    me.init();
};

gmgps.cloud.ui.views.boardManagement.prototype = {
    init: function () {
        var me = this;

        me.initTabs();
        me.configureToolbar();

        me.refreshCounts().then(function () {
            me.displayList(me.getSearch());
        });
    },

    refreshCounts: function () {
        var me = this;

        var search = me.getSearch();

        var deferred = $.Deferred();

        new gmgps.cloud.http("boardmanagement-refreshCounts").ajax(
            {
                args: { search: search },
                dataType: 'json',
                type: 'post',
                complex: true,
                url: '/Board/GetCounts'
            },
            function (response) {
                var tab = '.tab-column li[data-id="{0}"] .count';

                me.$root
                    .find(tab.format(C.BoardManagementViewMode.Changes))
                    .text('({0})'.format(response.Data.changes));
                me.$root
                    .find(tab.format(C.BoardManagementViewMode.OutOfDate))
                    .text('({0})'.format(response.Data.outOfDates));
                me.$root
                    .find(tab.format(C.BoardManagementViewMode.Warnings))
                    .text('({0})'.format(response.Data.warnings));
                me.$root
                    .find(tab.format(C.BoardManagementViewMode.Transactions))
                    .text('({0})'.format(response.Data.transactions));

                deferred.resolve();
            }
        );

        return deferred.promise();
    },

    displayList: function (search) {
        var me = this;

        var selectedIds = search.Ids;
        search.Ids = [];

        new gmgps.cloud.http("boardmanagement-displayList").ajax(
            {
                args: { search: search },
                dataType: 'json',
                type: 'post',
                complex: true,
                url: '/Board/GetList'
            },
            function (response) {
                me.$listContainer[0].innerHTML = response.Data;

                var $list = me.$root.find(
                    '.list[data-viewMode="{0}"]'.format(me.currentTab)
                );
                var thisViewMode = $list.data('viewmode');

                me.$root
                    .find(
                        '#BoardManagement .tab-column li[data-id="{0}"] .count'.format(
                            thisViewMode
                        )
                    )
                    .text('({0})'.format($list.attr('data-count')));

                if (thisViewMode === me.currentTab) {
                    $list.show();
                    me.initList(selectedIds);
                }
            }
        );
    },

    initList: function (ids, selectionMode) {
        var me = this;

        me.list = new gmgps.cloud.ui.controls.list({
            $root: me.$root.find('.list'),
            disableSelectAll: false,
            ids: ids,
            selectionMode: selectionMode,
            selectedItemName: 'Board Change',
            selectedItemPluralName: 'Board Changes'
        });

        me.list.onPageRequest.handle(function (args) {
            var search = me.getSearch();
            search.SearchPage = args.SearchPage;
            search.SearchOrder = args.SearchOrder;
            me.displayList(search);
        });
    },

    initTabs: function () {
        var me = this;

        me.tabColumn = new gmgps.cloud.ui.controls.tabColumn({
            $root: me.$root.find('.tab-column'),
            entityType: 'boardmanagement'
        });

        me.tabColumn.onTabClicked.handle(function ($item) {
            me.currentTab = $item.data('id');
            me.list.resetList();

            switch (me.currentTab) {
                case C.BoardManagementViewMode.Changes:
                    me.$branchFilter.closest('tr').show();
                    me.$boardFilter.closest('tr').show();
                    me.$contractorFilter.closest('tr').show();
                    me.$propertyRecordTypeFilter.closest('tr').show();
                    me.$fromFilter.closest('tr').show();
                    me.$toFilter.closest('tr').show();
                    break;
                case C.BoardManagementViewMode.OutOfDate:
                    me.$branchFilter.closest('tr').show();
                    me.$boardFilter.closest('tr').hide();
                    me.$contractorFilter.closest('tr').hide();
                    me.$propertyRecordTypeFilter.closest('tr').show();
                    me.$fromFilter.closest('tr').hide();
                    me.$toFilter.closest('tr').hide();
                    break;
                case C.BoardManagementViewMode.Transactions:
                    me.$branchFilter.closest('tr').show();
                    me.$boardFilter.closest('tr').show();
                    me.$contractorFilter.closest('tr').show();
                    me.$propertyRecordTypeFilter.closest('tr').show();
                    me.$fromFilter.closest('tr').show();
                    me.$toFilter.closest('tr').show();
                    break;
                case C.BoardManagementViewMode.Warnings:
                    me.$branchFilter.closest('tr').show();
                    me.$boardFilter.closest('tr').hide();
                    me.$contractorFilter.closest('tr').hide();
                    me.$propertyRecordTypeFilter.closest('tr').show();
                    me.$fromFilter.closest('tr').hide();
                    me.$toFilter.closest('tr').hide();
            }

            me.refresh();
        });

        me.tabColumn.selectTab(me.currentTab, null, null, true);
    },

    refresh: function () {
        var me = this;
        me.configureToolbar();
        me.displayList(me.getSearch());
    },

    getSearch: function () {
        var me = this;

        var branchId = parseInt(me.$branchFilter.val());

        var search = {
            Mode: me.currentTab,
            BranchIdList: branchId === 0 ? [] : [branchId],
            BoardType: parseInt(me.$boardFilter.val()),
            ContractorId: parseInt(me.$contractorFilter.val()),
            PropertyStatusId: 0,
            PropertyRecordType: parseInt(me.$propertyRecordTypeFilter.val()),
            From: me.$fromFilter.val() !== '' ? me.$fromFilter.val() : null,
            To: me.$toFilter.val() !== '' ? me.$toFilter.val() : null,
            ExcludeIds: false,
            Ids: null
        };

        if (typeof me.list !== 'undefined') {
            search.ExcludeIds =
                me.list.selectionMode === C.ListSelectionMode.All;
            search.Ids = me.list.ids;
        }

        search.SearchPage = {
            Size: 25,
            Index: 1
        };

        search.SearchOrder = {
            By: C.SearchOrderBy.StatusChangedDate,
            Type: C.SearchOrderType.Descending
        };

        return search;
    },

    configureToolbar: function () {
        var me = this;

        var $b = $(
            '#toolbar .group[data-group="tools"] .detail div[data-id="actions"]'
        );

        $b.show().find('.item').hide();

        switch (me.currentTab) {
            //Ready to Send
            case C.BoardManagementViewMode.Changes:
                $b.find('.item[data-data="board-management-send"]').show();
                $b.find('.item[data-data="board-management-dismiss"]').show();
                break;

            //Take Down?
            case C.BoardManagementViewMode.OutOfDate:
                $b.find('.item[data-data="board-management-send"]').show();
                $b.find('.item[data-data="board-management-dismiss"]').show();
                break;
        }

        $b.find('.item[data-data="board-management-print"]').show();
        $b.find('.item[data-data="board-management-export"]').show();
    },

    sendBoardChanges: function (contractorId) {
        var me = this;

        if (
            (!me.list.ids || me.list.ids.length === 0) &&
            me.list.selectionMode !== C.ListSelectionMode.All
        ) {
            showInfo('Please select changes to send.');
            return;
        }

        ShowAreYouSure(
            'Send Board Change(s)',
            'Are you sure you want to send the selected board change(s)',
            function () {
                if (me.currentTab === C.BoardManagementViewMode.Changes) {
                    new gmgps.cloud.http(
                        "boardmanagement-sendBoardChanges"
                    ).ajax(
                        {
                            args: {
                                contractorId: contractorId,
                                viewMode: me.currentTab,
                                search: me.getSearch()
                            },
                            dataType: 'json',
                            type: 'post',
                            complex: true,
                            url: '/Board/SendBoardChanges'
                        },
                        function () {
                            me.list.resetList();
                            me.refresh();
                            me.refreshCounts();
                        }
                    );
                } else {
                    me.getBoardContractors().then(function (boardContractors) {
                        if (boardContractors.length === 0) {
                            showError(
                                'There are no board contractors setup, please setup your board contractor(s) before sending changes'
                            );
                            return;
                        } else {
                            me.chooseContractorAndSend(boardContractors);
                        }
                    });
                }
            }
        );
    },

    chooseContractorAndSend: function (boardContractors) {
        var me = this;

        var dropDownList =
            '<select id="boardContractor"><option value="">Please select a contractor</option>';
        var $dialog = null;

        $.each(boardContractors, function (i, boardContractor) {
            dropDownList += '<option value="{0}">{1}</option>'.format(
                boardContractor.Id,
                boardContractor.CompanyName
            );
        });

        dropDownList += '</select>';

        showDialog({
            type: 'question',
            title: 'Board Change Select Contractor',
            msg:
                '<div class="boardChangeSelectContractor"><div class="boardChangeContractor fl"><label for="boardContractor">Contractor:</label>' +
                dropDownList +
                '</div></div>',
            create: function (event) {
                $dialog = $(event.target);
            },
            buttons: {
                'Send Now': function () {
                    var selectedContractorId = parseInt(
                        $dialog.find('#boardContractor').val()
                    );
                    if (!selectedContractorId) {
                        showError('Please select a board contractor.');
                        return;
                    }

                    new gmgps.cloud.http('boardmanagement-SendNow').ajax(
                        {
                            args: {
                                contractorId: selectedContractorId,
                                viewMode: me.currentTab,
                                search: me.getSearch()
                            },
                            dataType: 'json',
                            type: 'post',
                            complex: true,
                            url: '/Board/SendBoardChanges'
                        },
                        function () {
                            me.list.resetList();
                            me.refresh();
                            me.refreshCounts();
                        }
                    );

                    $(this).dialog('close');
                    return;
                },
                Close: function () {
                    $(this).dialog('close');
                    return false;
                }
            }
        });
    },

    dismissBoardChanges: function () {
        var me = this;

        if (
            (!me.list.ids || me.list.ids.length === 0) &&
            me.list.selectionMode !== C.ListSelectionMode.All
        ) {
            showInfo('Please select changes to dismiss.');
            return;
        }

        switch (me.currentTab) {
            //Ready to Send
            case C.BoardManagementViewMode.Changes:
                ShowAreYouSure(
                    'Dismiss Board Change(s)',
                    'Are you sure you want to dismiss the selected board change(s)',
                    function () {
                        new gmgps.cloud.http(
                            "boardmanagement-dismissBoardChanges"
                        ).ajax(
                            {
                                args: {
                                    ids: me.list.ids,
                                    selectAll:
                                        me.list.selectionMode ===
                                        C.ListSelectionMode.All
                                },
                                dataType: 'json',
                                type: 'post',
                                complex: true,
                                url: '/Board/DismissBoardChanges'
                            },
                            function () {
                                me.list.resetList();
                                me.refresh();
                                me.refreshCounts();
                            }
                        );
                    }
                );
                break;

            //Take Down?
            case C.BoardManagementViewMode.OutOfDate:
                if (me.list.selectionMode === C.ListSelectionMode.All) {
                    showInfo(
                        'For safety reasons, you cannot dismiss mutliple pages of property take down suggestions.'
                    );
                    return false;
                }

                ShowAreYouSure(
                    'Dismiss Board Change(s)',
                    'Continue only if the board is/has been taken down by some means other than sending an email to the board contractor.<br><br>The selected properties will have their board set to "No Board".  Are you sure?',
                    function () {
                        new gmgps.cloud.http(
                            "boardmanagement-dismissBoardChanges"
                        ).ajax(
                            {
                                args: { ids: me.list.ids },
                                dataType: 'json',
                                type: 'post',
                                complex: true,
                                url: '/Board/ManualTakeDowns'
                            },
                            function () {
                                me.list.resetList();
                                me.refresh();
                                me.refreshCounts();
                            }
                        );
                    }
                );
                break;
        }
    },

    exportToExcel: function () {
        var me = this;

        if (
            (!me.list.ids || me.list.ids.length === 0) &&
            me.list.selectionMode !== C.ListSelectionMode.All
        ) {
            showInfo('Please select rows to export.');
            return;
        }

        var $form = me.getForm('ExportToExcel');
        $form.appendTo('body');
        $form.submit();
        $form.remove();

        me.list.resetList();
        me.clearCheckboxes();
    },

    print: function () {
        var me = this;

        if (
            (!me.list.ids || me.list.ids.length === 0) &&
            me.list.selectionMode !== C.ListSelectionMode.All
        ) {
            showInfo('Please select rows to print.');
            return;
        }

        var $form = me.getForm('GetPrintableView');
        $form.appendTo('body');
        $form.submit();
        $form.remove();

        me.list.resetList();
        me.clearCheckboxes();
    },

    getForm: function (action) {
        var me = this;

        var search = me.getSearch();

        var html =
            '<form id="boardmanagementform" target="boardmanagement" method="post" action="/board/{0}">'.format(
                action
            ) +
            '<input name="search.Mode" type="hidden" value="{0}" />'.format(
                me.currentTab
            ) +
            '<input name="search.SearchOrder.By" type="hidden" value="{0}" />'.format(
                me.$root.find('#SearchOrder_By').val()
            ) +
            '<input name="search.SearchOrder.Type" type="hidden" value="{0}" />'.format(
                me.$root.find('#SearchOrder_Type').val()
            ) +
            '<input name="search.ExcludeIds" type="hidden" value="{0}" />'.format(
                me.list.selectionMode === C.ListSelectionMode.All
            );

        $.each(me.list.ids, function (i, v) {
            html +=
                '<input name="search.Ids[{0}]" type="hidden" value="{1}" />'.format(
                    i,
                    v
                );
        });

        $.each(search.BranchIdList, function (i, v) {
            html +=
                '<input name="search.BranchIdList[{0}]" type="hidden" value="{1}" />'.format(
                    i,
                    v
                );
        });

        html += '</form>';

        return $(html);
    },

    clearCheckboxes: function () {
        var me = this;

        me.$root.find('input[type=checkbox]').removeAttr('checked');
        me.$root.find('.tickbox').removeClass('ticked');
        me.$root.find('tr').removeClass('on');
    },

    getBoardContractors: function () {
        var deferred = $.Deferred();

        new gmgps.cloud.http("boardmanagement-getBoardContractors").ajax(
            {
                args: {},
                dataType: 'json',
                type: 'post',
                complex: true,
                url: '/Board/GetBoardContractors'
            },
            function (response) {
                deferred.resolve(response.Data);
            }
        );

        return deferred.promise();
    }
};
