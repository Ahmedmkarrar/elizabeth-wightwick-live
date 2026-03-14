gmgps.cloud.ui.views.bankBranchSelector = function () {
    var me = this;

    me.init();

    return me;
};

gmgps.cloud.ui.views.bankBranchSelector.prototype = {
    init: function () {
        var me = this;

        return me;
    },

    controller: function (args) {
        var me = this;

        me.$root = args.$root;
        me.$window = args.$window;

        me.onBranchSelected = args.callback;

        me.$window.find('.action-button').addClass('disabled');

        var setStateNotChosen = function ($rows) {
            $rows.removeClass('chosen').addClass('available');
            $rows.find('.select-col .selectable').addClass('hidden');
            $rows.find('.select-col .btn-cancel').addClass('hidden');
            $rows.find('.select-col .btn').removeClass('hidden');
            $rows.removeClass('default-on');
        };

        var setStateChosen = function ($row, $otherrows) {
            $row.removeClass('available').addClass('chosen');
            $row.find('.select-col .selectable').removeClass('hidden');
            $row.find('.select-col .btn-cancel').removeClass('hidden');
            $row.find('.select-col .btn').addClass('hidden');
            setStateNotChosen($otherrows);
            $otherrows.hide();

            me.$window.find('.action-button').removeClass('disabled');
        };

        var cancelSelection = function ($row, $rows) {
            setStateNotChosen($row);
            $rows.show();

            me.$window.find('.action-button').addClass('disabled');
        };

        var rollFiltersUp = function ($filters) {
            $filters.slideUp('fast');
        };

        var rollFiltersDown = function ($filters) {
            $filters.slideDown('fast');
        };

        me.$root.on('click', '.select-col .btn', function () {
            var $this = $(this);

            var $row = $this.closest('.row');
            var $branchlist = $this.closest('.branch-container');
            var $rows = $branchlist.find('.row').not($row);

            setStateChosen($row, $rows);

            rollFiltersUp(me.$root.find('.filter-container'));
        });

        me.$root.on('click', '.select-col .btn-cancel', function () {
            var $this = $(this);

            var $row = $this.closest('.row');
            var $branchlist = $this.closest('.branch-container');
            var $rows = $branchlist.find('.row').not($row);

            cancelSelection($row, $rows);

            rollFiltersDown(me.$root.find('.filter-container'));
        });

        me.$root.on('click', '.add-button', function () {
            // only allow one instance to be added at a time
            if (me.$window.find('.quick-create-bank-branch').length === 0) {
                new gmgps.cloud.ui.views.quickCreateBankBranch({
                    onComplete: function (s) {
                        if (s) {
                            me.refreshList().done(function (r) {
                                if (r && r.Data) {
                                    me.$root
                                        .find('.branch-list')
                                        .empty()
                                        .html($(r.Data));
                                    me.$root
                                        .find(
                                            '.row[data-groupbankid="' +
                                                s.Data.GroupBankId +
                                                '"][data-groupbankbranchid="' +
                                                s.Data.GroupBankBranchId +
                                                '"] .btn'
                                        )
                                        .trigger('click');
                                }
                            });
                        }
                    }
                }).show($(this).closest('.window'), { top: 85, left: 152 });
            }
        });

        me.$root.find('.placeholders').placeholder();

        var executeSearch = function () {
            me.search({
                BySortCode: true,
                ByBranchName: true,
                ByBankName: true,
                text: $(this).val()
            }).done(function (r) {
                if (r && r.Data) {
                    me.$root.find('table').empty().html($(r.Data));
                }
            });
        };

        var debouncedExecuteSearch = $.debounce(350, false, executeSearch);

        me.$window.on('keyup', '.filter', debouncedExecuteSearch);

        this.action = function (onComplete) {
            var $rows = me.$root.find('.branch-list .row.chosen');

            if ($rows.length !== 1) {
                showInfo('Please select a branch');
                onComplete(true);
            }

            onComplete(false);

            me.onBranchSelected(
                $rows.attr('data-groupbankid'),
                $rows.attr('data-groupbankbranchid')
            );
        };

        this.search = function (settings) {
            return new gmgps.cloud.http("bankBranchSelector-search").ajax({
                args: settings,
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/Contact/BankBranchSearch'
            });
        };

        this.refreshList = function () {
            return new gmgps.cloud.http("bankBranchSelector-refreshList").ajax({
                args: {},
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/Contact/GetBankBranchSelectorContent'
            });
        };
    },

    show: function (args) {
        var me = this;

        new gmgps.cloud.ui.controls.window({
            title: 'Select Branch',
            windowId: 'branchSelectorModal',
            controller: me.controller,
            url: '/Contact/GetBankBranchSelector',
            callback: args.callback,
            post: true,
            complex: true,
            width: 550,
            draggable: true,
            modal: true,
            actionButton: 'Confirm',
            cancelButton: 'Cancel',
            onAction:
                args.onComplete ||
                function () {
                    return false;
                },
            onCancel:
                args.onComplete ||
                function () {
                    return false;
                }
        });
    }
};
