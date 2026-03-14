((function() {
    gmgps.cloud.ui.views.clientAccountsPanelHandler = ClientAccountPanelHandler;

    function ClientAccountPanelHandler(args) {
        var me = this;
        me.$root = args.$root;
        me.http = args.http || new gmgps.cloud.http('clientAccountsPanelHandler-ClientAccountPanelHandler');
        me.url = args.url;
        me.args = args.requestArgs || {};
        me.parse = args.parse;
        me.type = args.type;
        // eslint-disable-next-line no-prototype-builtins
        if (args.hasOwnProperty('getId') && args.getId instanceof Function) {
            me.getId = args.getId;
        }
        if (args.sortOrderType) {
            me.sortOrderType = args.sortOrderType;
        }
        if (
        // eslint-disable-next-line no-prototype-builtins
            args.hasOwnProperty('getSortOrder') && args.getSortOrder instanceof Function
        ) {
            me.getSortOrder = args.getSortOrder;
        }
        if (
        // eslint-disable-next-line no-prototype-builtins
            args.hasOwnProperty('refresh') && args.refresh instanceof Function
        ) {
            me.refresh = args.refresh;
        }

        me.sortOrder = me.sortOrderType.AccountName;
        me.http
            .ajax({
                args: {
                    key: ['accounts', me.type, 'SortOrderType'].join('-')
                },
                background: true,
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/user/GetUiPersonalisation'
            })
            .done(function (r) {
                if (r.Data) {
                    me.sortOrder = r.Data;
                }
            });

        return me;
    }

    ClientAccountPanelHandler.prototype = {
        sortOrderType: C.AccountCentreSortOrderType,
        init: function () {
            this.initEvents();
            return this;
        },
        initControls: function () {
            var me = this;
            gmgps.cloud.helpers.ui.initInputs(me.$root);
            me.initSortControl();
        },
        initEvents: function () {
            var me = this,
                namespace = '.ClientAccountPanelHandler';

            me.$root
                .off(namespace)
                .on(
                    ['keyup', ' blur', undefined].join(namespace),
                    me.getId('SearchAccounts'),
                    $.debounce(250, false, doSearch)
                )
                .on('change' + namespace, me.getId('SortOrder'), updateSorting);

            function doSearch(e) {
                me.search(e.target.value);
            }
            function updateSorting(e) {
                var value = parseInt(e.target.value, 10);
                me.http.ajax({
                    args: {
                        key: ['accounts', me.type, 'SortOrderType'].join('-'),
                        data: value
                    },
                    background: true,
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: '/user/PutUiPersonalisation'
                });

                me.sortOrder = value;
                me.sort();
            }
        },
        refresh: function () {
            var me = this;

            if (!me.url) {
                return $.Deferred()
                    .reject('Instance not initialised with a url')
                    .promise();
            }

            return me.http
                .ajax({
                    args: me.args,
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: me.url
                })
                .done(function (response) {
                    me.$root.hide().html(response.Data);
                    me.$root.show();
                    me.initControls();
                    return response;
                });
        },
        search: function (filterText) {
            var me = this;
            var trimmedText = filterText.trim().toLowerCase();
            var $allItems = me.$root.find('.clientaccount');

            if (trimmedText.length === 0) {
                $allItems.show();
                return;
            }

            var $filteredItems = $allItems.filter(function () {
                var $item = $(this);
                return (
                    $item
                        .attr('data-name')
                        .toLowerCase()
                        .indexOf(trimmedText) !== -1 ||
                    $item
                        .attr('data-number')
                        .toLowerCase()
                        .indexOf(trimmedText) !== -1
                );
            });

            $allItems.not($filteredItems).hide();
            $filteredItems.show();
        },
        getId: function (value) {
            return '#' + value;
        },
        getSortOrder: function () {
            var dataAttribute, orderDescending, parser, me;

            me = this;
            orderDescending = false;
            switch (me.sortOrder) {
                case me.sortOrderType['AccountName']:
                    dataAttribute = 'name';
                    break;
                case me.sortOrderType['AccountNumber']:
                    dataAttribute = 'number';
                    break;
                case me.sortOrderType['TransactionCount']:
                    orderDescending = true;
                    dataAttribute = 'count';
                    break;
                case me.sortOrderType['UserDefined']:
                    dataAttribute = 'order';
                    break;
                case me.sortOrderType['TotalToPay']:
                    dataAttribute = 'amount';
                    parser = parseFloat;
                    break;
                case me.sortOrderType['LastReconciled']:
                    dataAttribute = 'reconciliation-date';
                    break;
            }
            return {
                dataAttribute: dataAttribute,
                orderDescending: orderDescending,
                parser:
                    parser ||
                    function (v) {
                        return v;
                    }
            };
        },
        initSortControl: function () {
            var me = this;
            me.$root
                .find(me.getId('SortOrder'))
                .val(me.sortOrder)
                .trigger('prog-change');
            me.sort();
        },
        sort: function () {
            var me = this;

            var sorting = me.getSortOrder();

            if (sorting.dataAttribute) {
                var $allItems = me.$root.find('.accounts-list');
                $allItems
                    .find('.clientaccount')
                    .sort(function (a, b) {
                        var ad = sorting.parser(
                            $(a).data(sorting.dataAttribute)
                        );
                        var ab = sorting.parser(
                            $(b).data(sorting.dataAttribute)
                        );

                        if (ad === ab) {
                            return 0;
                        }

                        var result = 0;
                        if (ad < ab) {
                            result = 1;
                        } else {
                            result = -1;
                        }

                        if (sorting.orderDescending) {
                            return result;
                        } else {
                            return result * -1;
                        }
                    })
                    .appendTo($allItems);
            }
        }
    };
}))();
