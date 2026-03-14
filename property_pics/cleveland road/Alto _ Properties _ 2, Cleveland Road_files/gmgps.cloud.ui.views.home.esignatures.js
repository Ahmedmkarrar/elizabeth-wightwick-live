gmgps.cloud.ui.views.home.esignatures = function (args) {
    var me = this;
    me.initialised = false;
    me.hasPermission = false;
    me.forceRefreshOnNextActivation = false;

    me.header = 'eSignatures';
    me.$root = args.$root;
    me.$header = args.$root.find('#signingrequests-headlinecount');

    me.$periodDropdown = args.$root.find('#signingrequests-period');

    me.branchId = 0 || args.branchId;
    me.userId = 0 || args.userId;
    me.selectedStatus = C.SigningRequestStatus.InFlight;
    me.period = parseInt(me.$periodDropdown.val());
    me.pageIndex = 1;
    me.orderType = C.SearchOrderType.Ascending;
    me.orderBy = C.SearchOrderBy.SentDate;

    me.esignaturesApi = new gmgps.cloud.services.EsignaturesApi(
        args.http || new gmgps.cloud.http("esignatures-esignatures")
    );
    me.statistics = new gmgps.cloud.ui.views.home.esignaturesStats(
        me.$header,
        me.esignaturesApi
    );

    me.init();

    return true;
};

gmgps.cloud.ui.views.home.esignatures.prototype = {
    init: function () {
        var me = this;
        me.signatoryDetailPanel = me.$root.find('#signatory-detail');

        me.$periodDropdown.selectpicker({
            'live-search': false,
            width: '200px'
        });

        me.$root.on(
            'click',
            'div.dualpanel-list-footer .nextprev.next:not(.disabled)',
            function () {
                me.pageIndex += 1;
                me.refreshAll();
            }
        );

        me.$root.on(
            'click',
            'div.dualpanel-list-footer .nextprev.prev:not(.disabled)',
            function () {
                me.pageIndex -= 1;
                me.refreshAll();
            }
        );

        me.$periodDropdown.on('change', function () {
            me.period = parseInt(me.$periodDropdown.val());
            me.refreshAll();
        });

        me.$root.on(
            'click',
            '#signingrequests .dualpanel-header .selectable-widget.clickable',
            function (e) {
                me.selectedStatus = $(e.target)
                    .closest('.selectable-widget.clickable')
                    .attr('data-status');
                me.pageIndex = 1;

                me.setHeadlineCountersToShowSelectedStatus();
                me.refreshList();
            }
        );

        me.$root.on(
            'click',
            '#signingrequest-list .esignatures-signingrequest-listitem',
            function (e) {
                me.$root
                    .find(
                        '#signingrequest-list .esignatures-signingrequest-listitem'
                    )
                    .removeClass('on');
                var signingRequestRow = $(e.target).closest(
                    '.esignatures-signingrequest-listitem'
                );
                signingRequestRow.addClass('on');
                var id = signingRequestRow.attr('data-id');
                me.loadSignatories(id);
            }
        );

        me.$root.on(
            'click',
            '.esignatures-signingrequests-header .column-header div.sortable',
            function (e) {
                var $target = $(e.target);

                var orderBy = $target.closest('.sortable').attr('data-id');

                if (!orderBy) {
                    return false;
                }

                if ($.isNumeric(orderBy)) {
                    orderBy = parseInt(orderBy);
                }

                //Set the sort order.  If this column is already the sort column, flip the order, else default to ascending.
                if (orderBy === me.orderBy) {
                    me.orderType =
                        me.orderType === C.SearchOrderType.Ascending
                            ? C.SearchOrderType.Descending
                            : C.SearchOrderType.Ascending;
                } else {
                    //When the orderby changes, begin with ascending order.
                    me.orderType = C.SearchOrderType.Ascending;
                }

                me.orderBy = orderBy;

                me.refreshList();
            }
        );

        me.$root.on(
            'click',
            '.esignatures-signatories-header .column-header div.sortable',
            function (e) {
                me.sortSignatories($(e.target));
            }
        );

        me.setHeadlineCountersToShowSelectedStatus();
    },

    sortSignatories: function (headerTarget) {
        var me = this;

        var clickedHeader = headerTarget.closest('.sortable');
        var sortArrow = clickedHeader.find('.sort');

        var listOfSignatories = me.$root.find('#signatories-child-list');

        var currentOrder = parseInt(listOfSignatories.attr('data-ordered-by'));
        var currentOrderDirection = parseInt(
            listOfSignatories.attr('data-order-direction')
        );

        var requestedOrder = parseInt(clickedHeader.attr('data-id'));
        var requestedOrderDirection = C.SearchOrderType.None;
        if (requestedOrder === currentOrder) {
            if (currentOrderDirection === C.SearchOrderType.Ascending) {
                requestedOrderDirection = C.SearchOrderType.Descending;
            } else {
                requestedOrderDirection = C.SearchOrderType.Ascending;
            }
        } else {
            requestedOrderDirection = C.SearchOrderType.Ascending;
        }

        function compare(a, b, col, direction) {
            var rowA = $(a).find('div.text:eq({0})'.format(col));
            var rowB = $(b).find('div.text:eq({0})'.format(col));

            var itemA = rowA.attr('data-sorton') || rowA.text();
            var itemB = rowB.attr('data-sorton') || rowB.text();

            var comparisonResult = 0;

            if (direction === C.SearchOrderType.Ascending) {
                comparisonResult = itemA.localeCompare(itemB);
            } else {
                comparisonResult = itemB.localeCompare(itemA);
            }

            return comparisonResult;
        }

        var columnForSorting = $(
            '.esignatures-signatories-header .column-header div.sortable'
        ).index(clickedHeader);
        listOfSignatories
            .find('div.row')
            .sort(function (a, b) {
                var comparisonResult = compare(
                    a,
                    b,
                    columnForSorting,
                    requestedOrderDirection
                );
                if (comparisonResult === 0) {
                    comparisonResult = compare(
                        a,
                        b,
                        0,
                        requestedOrderDirection
                    );
                }
                return comparisonResult;
            })
            .appendTo(listOfSignatories);

        listOfSignatories.attr('data-ordered-by', requestedOrder);
        listOfSignatories.attr('data-order-direction', requestedOrderDirection);

        $(
            '.esignatures-signatories-header .column-header div.sortable .sort'
        ).removeClass('sort-asc sort-desc sorter');
        sortArrow.addClass('sorter');
        if (requestedOrderDirection === C.SearchOrderType.Ascending) {
            sortArrow.addClass('sort-asc');
        } else {
            sortArrow.addClass('sort-desc');
        }
    },

    loadSignatories: function (id) {
        var me = this;

        me.esignaturesApi.getSignatoriesHtml(id).then(function (html) {
            me.signatoryDetailPanel.html('').scrollTop(0).html(html);
        });
    },

    setHeadlineCountersToShowSelectedStatus: function () {
        var me = this;

        me.$header
            .find('.selectable-widget')
            .removeClass('btn-selected-border')
            .addClass('btn-not-selected-border');
        me.$header
            .find('[data-status="' + me.selectedStatus + '"]')
            .addClass('btn-selected-border');
    },

    lockUI: function (lock) {
        glass(lock);
    },

    activate: function (forceRefresh, filter) {
        var me = this;
        if (filter) {
            if (me.selectedStatus !== filter.status) {
                forceRefresh = true;
            }

            if (me.period !== parseInt(filter.period)) {
                forceRefresh = true;
            }

            me.selectedStatus = filter.status;
            me.setHeadlineCountersToShowSelectedStatus();

            me.period = parseInt(filter.period);
            me.$periodDropdown.val(filter.period);
            me.refreshPeriodDropDown();
        }

        if (forceRefresh || !me.initialised) {
            me.refreshAll();
        }
    },

    refreshPeriodDropDown: function () {
        var me = this;
        var option = me.$periodDropdown.find(
            'option[value="{0}"]'.format(me.period)
        );
        var index = me.$periodDropdown.find('option').index(option);
        var bootstrapDropdown =
            me.$periodDropdown.siblings('.bootstrap-select');

        bootstrapDropdown
            .attr('title', option.text())
            .find('span.filter-option')
            .text(option.text());

        bootstrapDropdown
            .find('ul.dropdown-menu li.selected')
            .removeClass('selected');

        bootstrapDropdown
            .find('ul.dropdown-menu li:eq({0})'.format(index))
            .addClass('selected');
    },

    refreshAll: function () {
        var me = this;

        var deferred = new $.Deferred();

        $.when(me.checkPermissions()).done(function () {
            if (!me.hasPermission) {
                deferred.resolve();
                return;
            }

            me.initialised = true;
            me.refreshStats();
            me.lockUI(true);

            //Refreshing everything means a top-level change or initial load, so everything which wants a spinner gets one.  As each section completes, these get replaced.
            me.$root
                .find('.opt-spinner')
                .html('<div class="home-spinner"></div>');

            $.when(me.refreshList())
                .done(function () {
                    deferred.resolve();
                    me.lockUI(false);
                })
                .fail(function () {
                    deferred.reject();
                    me.lockUI(false);
                });
        });

        return deferred.promise();
    },

    checkPermissions: function () {
        var me = this;
        me.hasPermission = false;

        var deferred = new $.Deferred();

        var hasAltoESign = $('#HasESign').val() === 'True';

        me.esignaturesApi
            .getSigningRequestsPermissions(me.branchId)
            .then(function (permissions) {
                deferred.resolve();

                var $container = me.$root.find('#signingrequests');
                var $noPermissionContainer = $container.find(
                    '.nopermission-container'
                );
                var $dualpanelContainer = $container.find(
                    '.dualpanel-container'
                );

                $noPermissionContainer.hide();
                $dualpanelContainer.hide();

                var message = '';
                if (!hasAltoESign) {
                    if (
                        !permissions.IsPropertyFileEnabledForGroup ||
                        !permissions.IsModuleOn
                    ) {
                        message =
                            'Esignatures is not enabled for ' +
                            (me.branchId !== 0
                                ? 'the selected branch'
                                : 'any branches');
                        var formattedMessage =
                            '<div class="no-items-to-display"><div class="outer"><div class="icon fa fa-ban"></div><div class="message">' +
                            message +
                            '</div></div></div>';
                        $noPermissionContainer.html(formattedMessage);
                        $noPermissionContainer.show();
                        return;
                    } else if (!permissions.IsBranchEnabledForPropertyFile) {
                        message =
                            '<div class="no-items-to-display"><div class="outer"><div class="icon fa fa-ban"></div><div class="message">The selected branch is not within the PropertyFile domain</div></div></div>';
                        $noPermissionContainer.html(message);
                        $noPermissionContainer.show();
                        return;
                    }
                }

                me.hasPermission = true;
                $dualpanelContainer.show();
            });

        return deferred.promise();
    },

    refreshStats: function () {
        var me = this;

        var period = parseInt(me.$periodDropdown.val());

        me.statistics.refresh({
            branchId: me.branchId,
            userId: me.userId,
            period: period
        });

        var $caption = me.$root.find(
            '#signingrequests-headlinecount .widget-caption'
        );
        $caption.text(
            'eSignatures Stats for {0}'.format(
                me.$periodDropdown.find('option:selected').text()
            )
        );
    },

    refreshList: function () {
        var me = this;
        var deferred = new $.Deferred();

        var $caption = me.$root.find('.dualpanel-body .widget-caption');
        var statusText = me.$header
            .find('[data-status="' + me.selectedStatus + '"]')
            .find('.text')
            .text();
        $caption.text(
            '{0} Signing Requests for {1}'.format(
                statusText,
                me.$periodDropdown.find('option:selected').text()
            )
        );

        me.esignaturesApi
            .getSigningRequestsHtml({
                signingRequestStatus: me.selectedStatus,
                homePeriod: me.period,
                branchId: me.branchId,
                negotiatorId: me.userId,
                searchPage: {
                    size: 20,
                    index: me.pageIndex
                },
                searchOrder: {
                    by: me.orderBy,
                    type: me.orderType
                }
            })
            .then(function (html) {
                deferred.resolve();

                me.$root
                    .find('#signingrequest-list')
                    .html('')
                    .scrollTop(0)
                    .html(html);

                var firstItem = me.$root.find(
                    '#signingrequest-list .esignatures-signingrequest-listitem:nth-child(1)'
                );
                firstItem.addClass('on');
                var firstId = firstItem.attr('data-id');
                if (firstId) {
                    me.loadSignatories(firstId);
                } else {
                    me.$root.find('#signatory-detail').html('');
                }

                me.orderType = me.$root.find('.sorter').is('.sort-asc') ? 1 : 2;
                me.orderBy = parseInt(
                    me.$root
                        .find('.sorter')
                        .closest('.sortable')
                        .attr('data-id')
                );
            });

        return deferred.promise();
    },

    pnUpdate: function (pn) {
        if (pn.ModelType === C.ModelType.SigningRequest) {
            //this.refreshAll();
            //$.jGrowl('This page has been refreshed automatically because of changes made by another user.', { header: 'Page updated', theme: 'growl-updater growl-system', life: 7000 });
        }
    }
};
