gmgps.cloud.ui.views.contactSelector = function (settings) {
    var me = this;

    me.$root = settings.$root;
    me.args = settings.args;

    me.init();

    return me;
};

gmgps.cloud.ui.views.contactSelector.prototype = {
    init: function () {
        return this;
    },

    controller: function (args) {
        var me = this;

        me.$root = args.$root;
        me.$window = args.$window;
        me.callContext = args.data;
        me.settings = args.data.args.settings;

        me.onContactSelected = args.callback;

        me.$window.find('.action-button').addClass('disabled');

        // add a search results count
        me.$window
            .find('.bottom .buttons')
            .prepend('<div class="result-text fl ml10 mt10"></div>');
        me.$resultText = me.$window.find('.bottom .buttons .result-text');

        me.$window.find('select').customSelect();
        me.$window.find('.placeholders').placeholder();

        me.lastResults = null;

        this.action = function (onComplete) {
            var $r = me.$root.find('.row.chosen');

            if ($r.length == 0) {
                showInfo('Please select a contact');
                onComplete(true);
            }

            onComplete(false);

            me.onContactSelected(
                parseInt($r.attr('data-id')),
                parseInt($r.attr('data-selectedserviceid')),
                $r.attr('data-contactname')
            );
        };

        this.setResultCount = function ($results) {
            var count = $results.length;
            me.$resultText.text(
                count == 0
                    ? 'No results'
                    : count == 1
                    ? count + ' result'
                    : count + ' results'
            );
        };

        this.filterUIFromSearchResult = function ($results) {
            me.lastResults = $results;

            // find all rows in list
            var $rows = me.$root.find('.detail .row');

            // get rows in list that are in results
            var $rowsInResults = $rows.filter(function (x, row) {
                var $row = $(row);
                return $results.filter(function (y, result) {
                    return result.Id === parseInt($row.data('id'));
                }).length;
            });

            // hide the rest
            $rows.not($rowsInResults).hide();

            // show the new results
            $rowsInResults.show();

            // update totals
            me.setResultCount($rowsInResults);
        };

        var executeSearch = function (onComplete) {
            var selectedFilters = me.$root
                .find('.header .filter-settings .item .filter-item:checked')
                .map(function () {
                    return parseInt($(this).val());
                })
                .get();

            var searcher = new gmgps.cloud.ui.views.contact.contactSearcher();

            var $searchField = me.$root.find('.search');
            // make sure we dont search on the placeholder text!
            var searchText =
                $searchField.val() !== $searchField.attr('placeholder')
                    ? $searchField.val()
                    : '';

            $.when(
                searcher.performSearch({
                    Query: searchText,
                    QueryMatchOnNameAndAddressOnly: true,
                    CategoryIdList: [me.settings.categoryId],
                    ProvidedServiceIdList: selectedFilters,
                    Archived: C.ArchivedSelectionType.ActiveRecordsOnly,
                    ApplyFurtherFilteringtoIds: true
                })
            ).done(function (results) {
                me.filterUIFromSearchResult($(results.List));
                me.$root.find('.search-container .search').focus();
                if (onComplete) onComplete();
            });
        };

        var rollFiltersDown = function ($drop) {
            me.$root.find('.filter-settings').slideDown('fast');
            $drop.addClass('dropped');
        };

        var rollFiltersUp = function ($drop) {
            me.$root.find('.filter-settings').slideUp('fast');
            $drop.removeClass('dropped');
        };

        var rollServicesUp = function ($serviceList, hideFirst) {
            if (hideFirst) {
                $serviceList.hide();
            }
            $serviceList.slideUp('fast').removeClass('on');
            $serviceList.parent().find('.drop').removeClass('dropped');
        };

        var rollServicesDown = function ($serviceList) {
            // roll up any others first
            rollServicesUp(me.$root.find('.services-container.on'));

            $serviceList.slideDown('fast').addClass('on');
            $serviceList.parent().find('.drop').addClass('dropped');
        };

        var setSelectedItemState = function ($row, selectedServiceId) {
            $row.addClass('chosen');
            $row.find('.btn-container').hide();

            $row.find('.btn-selected').show();
            $row.find('.btn-cancel').show();

            // set selected service descriptions
            $row.find('.category, .available, .isFavourite').hide();

            // hide other rows
            me.$root.find('.detail .row').not($row).hide();
            me.$root.find('.header').slideUp('fast');

            $row.attr('data-selectedserviceid', selectedServiceId);

            me.$window.find('.action-button').removeClass('disabled');
        };

        var debouncedExecuteSearch = $.debounce(1000, false, executeSearch);

        me.$window.on('keyup', '.search', debouncedExecuteSearch);

        me.$root.on('click', '.header .filter-container .dropper', function () {
            var $drop = me.$root.find('.header .filter-container .drop');

            if ($drop.hasClass('dropped')) {
                rollFiltersUp($drop);
            } else {
                rollFiltersDown($drop);
                // monitor mouse leave from filter to auto rollup
                me.$root.on(
                    'mouseleave',
                    '.header .filter-container',
                    function () {
                        me.$root.off('mouseleave');
                        rollFiltersUp($drop);
                    }
                );
            }
        });

        me.$root.on(
            'change',
            '.header .filter-settings input.tickbox-hidden',
            function () {
                // dont need to debounce, that's only for keystrokes and not checkbox clicks
                var $filterText = me.$root.find(
                    '.header .filter-container .filter-text'
                );

                var selectedFilters = me.$root
                    .find('.header .filter-settings .item .filter-item:checked')
                    .map(function () {
                        return $(this)
                            .closest('.box')
                            .find('.filter-name')
                            .text();
                    })
                    .get();

                $filterText.text(
                    selectedFilters.length == 0
                        ? 'Filters'
                        : selectedFilters.join(', ')
                );
                $filterText.attr('title', selectedFilters.join(', '));
                executeSearch();
            }
        );

        me.$root.on('click', '.btn-container.selectable', function () {
            var $row = $(this).closest('.row');
            var $this = $(this);

            if (
                !$this.hasClass('selected') &&
                !$this.hasClass('previouslySelected')
            ) {
                setSelectedItemState($row, $row.attr('data-serviceid'));
            }
        });

        me.$root.on('click', '.btn-cancel', function () {
            var $this = $(this);
            var $r = $(this).closest('.row');

            $r.removeClass('chosen');
            $r.attr('data-selectedserviceid', null);

            $r.find('.btn-container').show();
            $r.find('.btn-selected').hide();

            $r.find('.category, .available, .isFavourite').show();
            $r.find('.category .selected').text('').hide();

            // reset state of last search results
            if (me.lastResults) {
                me.filterUIFromSearchResult(me.lastResults);
            } else {
                me.$root.find('.detail .row').show();
            }

            me.$root.find('.header').slideDown('fast');
            me.$window.find('.action-button').addClass('disabled');

            $this.hide();
        });

        me.$root.on('click', '.btn-container.droppable', function () {
            var $serviceList = $(this).parent().find('.services-container');

            if ($serviceList.hasClass('on')) {
                rollServicesUp($serviceList);
            } else {
                rollServicesDown($serviceList);
            }
        });

        me.$root.on(
            'click',
            '.row .state .services-container .item',
            function () {
                var $r = $(this).closest('.row');
                var $this = $(this);

                if (
                    !$this.hasClass('selected') &&
                    !$this.hasClass('previouslySelected')
                ) {
                    setSelectedItemState($r, parseInt($this.attr('data-id')));

                    $r.find('.category .selected').text($this.text()).show();

                    rollServicesUp($r.find('.services-container'), true);
                }
            }
        );

        me.$root.on('click', '.add-button', function () {
            // only allow one instance to be added at a time
            if (me.$window.find('.quick-create-contact').length == 0) {
                var contactCreator =
                    new gmgps.cloud.ui.views.quickCreateContact({
                        settings: {
                            Title: 'Create Supplier',
                            CategoryId: me.settings.categoryId,
                            CompanyDetails: true,
                            AddressDetails: true,
                            ServiceDetails: true
                        },
                        onComplete: function (supplierContactId) {
                            if (supplierContactId) {
                                me.callContext
                                    .refreshList(me.settings)
                                    .done(function (r) {
                                        if (r && r.Data) {
                                            me.$root
                                                .find('.detail')
                                                .empty()
                                                .replaceWith($(r.Data));
                                            me.$root
                                                .find(
                                                    '.row[data-id="' +
                                                        supplierContactId +
                                                        '"] .btn-container'
                                                )
                                                .trigger('click');
                                        }
                                    });
                            }
                        }
                    });

                contactCreator.show($(this).closest('.window'), {
                    top: 85,
                    left: 235
                });
            }
        });

        // pretick any filters passed in
        if (me.settings.serviceIdList && me.settings.serviceIdList.length > 0) {
            $(me.settings.serviceIdList).each(function (i, v) {
                var $item = me.$root.find(
                    '.header .filter-settings .tickbox-hidden:checkbox[value="{0}"]'.format(
                        v
                    )
                );
                if ($item.length == 1) {
                    $item.attr('checked', 'checked');
                    $item.parent().addClass('ticked');
                }
            });
        }

        //executeSearch(function() {
        // me.setResultCount(me.$window.find('.row'));
        //me.$root.find('.search-container .search').focus();

        //});

        me.setResultCount(me.$window.find('.row'));
    },

    show: function (args) {
        var me = this;

        new gmgps.cloud.ui.controls.window({
            title: args.title || 'Select a Contact',
            windowId: 'contactSelectorModal',
            controller: me.controller,
            data: me,
            url: '/Contact/GetContactSelector',
            urlArgs: me.args.settings,
            post: true,
            complex: true,
            callback: args.callback,
            width: 750,
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
    },

    refreshList: function (settings) {
        return new gmgps.cloud.http("contactSelector-refreshList").ajax({
            args: settings,
            complex: true,
            dataType: 'json',
            type: 'post',
            url: '/Contact/GetContactSelectorResults'
        });
    }
};
