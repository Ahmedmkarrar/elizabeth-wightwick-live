gmgps.cloud.ui.views.propertypicker = function (args) {
    var me = this;

    me.selectedIds = [];
    me.search = null;

    me.$root = args.$root;
    me.init();

    return this;
};

gmgps.cloud.ui.views.propertypicker.prototype = {
    init: function () {
        var me = this;

        me.$root.off();

        //Style dropdowns.
        me.$root.find('select').customSelect();

        me.initMatchAreas();

        //Group Checkbox > Click
        me.$root.on('click', '.search-list .tickbox input', function () {
            $('.search-list .tickbox input')
                .not(this)
                .attr('checked', false)
                .trigger('prog-change');
        });

        //Init Type Tree
        me.$root.find('.types-tree').jstree({
            plugins: ['themes', 'html_data', 'checkbox'],
            themes: { theme: 'default', dots: true, icons: false },
            checkbox: { two_state: false },
            core: { animation: 0 }
        });

        //Init Accordion
        me.$root.find('.accordion').accordion({
            heightStyle: 'fill',
            collapsible: false
        });

        //Init Tabs
        me.$root.find('#picker-tabs').tabs({
            activate: function () {
                me.getMatchList();
            }
        });

        //Init Sort order context menu
        me.destroyContextMenu();
        $.contextMenu({
            selector: 'div.content .property-picker-form .sort-order',
            trigger: 'left',
            build: function () {
                return {
                    callback: function (key, options) {
                        me.getMatchList({
                            SearchPage: {
                                Index: 1,
                                Size: C.SearchPageSize.Default
                            },
                            SearchOrder: {
                                By: options.items[key].sortKey,
                                Type: options.items[
                                    'sortAscending'
                                ].$input.prop('checked')
                                    ? C.SearchOrderType.Ascending
                                    : C.SearchOrderType.Descending
                            }
                        });
                    },
                    items: {
                        sortAscending: {
                            name: 'Sort Ascending',
                            type: 'checkbox',
                            selected:
                                parseInt(
                                    me.$root
                                        .find(
                                            '.property-match-list #SearchOrder_Type'
                                        )
                                        .val()
                                ) === C.SearchOrderType.Ascending
                        },
                        sep1: '---------',
                        price: {
                            name: 'Price',
                            sortKey: C.SearchOrderBy.Price,
                            type:
                                parseInt(
                                    me.$root
                                        .find(
                                            '.property-match-list #SearchOrder_By'
                                        )
                                        .val()
                                ) === C.SearchOrderBy.Price
                                    ? 'radio'
                                    : '',
                            selected:
                                parseInt(
                                    me.$root
                                        .find(
                                            '.property-match-list #SearchOrder_By'
                                        )
                                        .val()
                                ) === C.SearchOrderBy.Price
                        },
                        beds: {
                            name: 'Bedrooms',
                            sortKey: C.SearchOrderBy.Beds,
                            type:
                                parseInt(
                                    me.$root
                                        .find(
                                            '.property-match-list #SearchOrder_By'
                                        )
                                        .val()
                                ) === C.SearchOrderBy.Beds
                                    ? 'radio'
                                    : '',
                            selected:
                                parseInt(
                                    me.$root
                                        .find(
                                            '.property-match-list #SearchOrder_By'
                                        )
                                        .val()
                                ) === C.SearchOrderBy.Beds
                        },
                        bathrooms: {
                            name: 'Bathrooms',
                            sortKey: C.SearchOrderBy.Bathrooms,
                            type:
                                parseInt(
                                    me.$root
                                        .find(
                                            '.property-match-list #SearchOrder_By'
                                        )
                                        .val()
                                ) === C.SearchOrderBy.Bathrooms
                                    ? 'radio'
                                    : '',
                            selected:
                                parseInt(
                                    me.$root
                                        .find(
                                            '.property-match-list #SearchOrder_By'
                                        )
                                        .val()
                                ) === C.SearchOrderBy.Bathrooms
                        },
                        receptions: {
                            name: 'Receptions',
                            sortKey: C.SearchOrderBy.Receptions,
                            type:
                                parseInt(
                                    me.$root
                                        .find(
                                            '.property-match-list #SearchOrder_By'
                                        )
                                        .val()
                                ) === C.SearchOrderBy.Receptions
                                    ? 'radio'
                                    : '',
                            selected:
                                parseInt(
                                    me.$root
                                        .find(
                                            '.property-match-list #SearchOrder_By'
                                        )
                                        .val()
                                ) === C.SearchOrderBy.Receptions
                        },
                        sep2: '---------',
                        date: {
                            name: 'Time On Market',
                            sortKey: C.SearchOrderBy.OnMarketDate,
                            type:
                                parseInt(
                                    me.$root
                                        .find(
                                            '.property-match-list #SearchOrder_By'
                                        )
                                        .val()
                                ) === C.SearchOrderBy.OnMarketDate
                                    ? 'radio'
                                    : '',
                            selected:
                                parseInt(
                                    me.$root
                                        .find(
                                            '.property-match-list #SearchOrder_By'
                                        )
                                        .val()
                                ) === C.SearchOrderBy.OnMarketDate
                        }
                    }
                };
            }
        });

        //Match Option > Change
        me.$root.on('keyup change', '.opt-match', function () {
            setTimeout(function () {
                me.getMatchList();
            }, 100);
        });

        //Requirement Tab > Tenure > Change
        me.$root.on(
            'change',
            '#Requirements_Requirement_TenureId',
            function () {
                var val = parseInt($(this).val());
                switch (val) {
                    case C.TenureType.Unspecified:
                        me.$root
                            .find('#Requirements_Requirement_Leasehold')
                            .val('True');
                        me.$root
                            .find('#Requirements_Requirement_Freehold')
                            .val('True');
                        break;
                    case C.TenureType.Freehold:
                        me.$root
                            .find('#Requirements_Requirement_Leasehold')
                            .val('False');
                        me.$root
                            .find('#Requirements_Requirement_Freehold')
                            .val('True');
                        break;
                    case C.TenureType.Leasehold:
                        me.$root
                            .find('#Requirements_Requirement_Leasehold')
                            .val('True');
                        me.$root
                            .find('#Requirements_Requirement_Freehold')
                            .val('False');
                        break;
                }
            }
        );

        //Requirement Tab > RecordType > Change
        me.$root.on(
            'change prog-change',
            '#Requirement_RecordTypeId',
            function () {
                var val = parseInt($(this).val());

                if (val === C.PropertyRecordType.Sale) {
                    //Store values
                    me.rentMin = me.$root
                        .find('#Requirements_Requirement_PriceMin')
                        .val();
                    me.rentMax = me.$root
                        .find('#Requirements_Requirement_PriceMax')
                        .val();

                    //Set values
                    if (me.saleMin) {
                        me.$root
                            .find('#Requirements_Requirement_PriceMin')
                            .val(me.saleMin);
                        me.$root
                            .find('#Requirements_Requirement_PriceMax')
                            .val(me.saleMax);
                    } else {
                        me.$root
                            .find('#Requirements_Requirement_PriceMin')
                            .val('£0');
                        me.$root
                            .find('#Requirements_Requirement_PriceMax')
                            .val('£0');
                    }

                    me.$root.find('.tag-rent').hide();
                    me.$root.find('.tag-sale').show();
                } else {
                    //Store values
                    me.saleMin = me.$root
                        .find('#Requirements_Requirement_PriceMin')
                        .val();
                    me.saleMax = me.$root
                        .find('#Requirements_Requirement_PriceMax')
                        .val();

                    //Set values
                    if (me.rentMin) {
                        me.$root
                            .find('#Requirements_Requirement_PriceMin')
                            .val(me.rentMin);
                        me.$root
                            .find('#Requirements_Requirement_PriceMax')
                            .val(me.rentMax);
                    } else {
                        me.$root
                            .find('#Requirements_Requirement_PriceMin')
                            .val('£0');
                        me.$root
                            .find('#Requirements_Requirement_PriceMax')
                            .val('£0');
                    }

                    me.$root.find('.tag-rent').show();
                    me.$root.find('.tag-sale').hide();
                }

                me.getMatchList();
            }
        );

        //Beds
        var min = parseInt(
            me.$root.find('#Requirements_Requirement_BedsMin').val()
        );
        var max = parseInt(
            me.$root.find('#Requirements_Requirement_BedsMax').val()
        );

        if (isNaN(min)) min = 0;
        if (isNaN(max) || max === 0) max = 10;

        me.$root.find('.beds-slider').slider({
            range: true,
            min: 0,
            max: 10,
            values: [min, max],
            slide: function (event, ui) {
                var label =
                    ui.values[1] === 10 ? ' or more' : ' to ' + ui.values[1];
                $(this)
                    .closest('.row')
                    .find('.beds-slider-text')
                    .html(ui.values[0] + label);
            },
            stop: function (event, ui) {
                var newMin = ui.values[0] === 0 ? 0 : ui.values[0];
                var newMax = ui.values[1] === 10 ? 0 : ui.values[1];
                $(this)
                    .closest('.row')
                    .find('#Requirements_Requirement_BedsMin')
                    .val(newMin);
                $(this)
                    .closest('.row')
                    .find('#Requirements_Requirement_BedsMax')
                    .val(newMax);
                me.getMatchList();
            }
        });

        //Baths
        min = parseInt(
            me.$root.find('#Requirements_Requirement_Bathrooms').val()
        );
        if (isNaN(min)) min = 0;
        me.$root.find('.baths-slider').slider({
            range: false,
            min: 0,
            max: 5,
            value: min,
            slide: function (event, ui) {
                var label = ui.value === 0 ? 'Any' : ui.value + ' or more';
                $(this).closest('.row').find('.baths-slider-text').html(label);
            },
            stop: function (event, ui) {
                var newMin = ui.value === 0 ? 0 : ui.value;
                $(this)
                    .closest('.row')
                    .find('#Requirements_Requirement_Bathrooms')
                    .val(newMin);
                me.getMatchList();
            }
        });

        //Receptions
        min = parseInt(
            me.$root.find('#Requirements_Requirement_Receptions').val()
        );
        if (isNaN(min)) min = 0;
        me.$root.find('.receps-slider').slider({
            range: false,
            min: 0,
            max: 5,
            value: min,
            slide: function (event, ui) {
                var label = ui.value === 0 ? 'Any' : ui.value + ' or more';
                $(this).closest('.row').find('.receps-slider-text').html(label);
            },
            stop: function (event, ui) {
                var newMin = ui.value === 0 ? 0 : ui.value;
                $(this)
                    .closest('.row')
                    .find('#Requirements_Requirement_Receptions')
                    .val(newMin);
                me.getMatchList();
            }
        });

        //Parking
        min = parseInt(
            me.$root.find('#Requirements_Requirement_MinParking').val()
        );
        if (isNaN(min)) min = 0;
        me.$root.find('.parking-slider').slider({
            range: false,
            min: 0,
            max: 5,
            value: min,
            slide: function (event, ui) {
                var label =
                    ui.value === 0
                        ? 'Any'
                        : 'Space for ' + ui.value + ' or more';
                $(this)
                    .closest('.row')
                    .find('.parking-slider-text')
                    .html(label);
            },
            stop: function (event, ui) {
                var newMin = ui.value === 0 ? 0 : ui.value;
                $(this)
                    .closest('.row')
                    .find('#Requirements_Requirement_MinParking')
                    .val(newMin);
                me.getMatchList();
            }
        });

        //Floor Area
        min = parseInt(
            me.$root.find('#Requirements_Requirement_FloorAreaMin').val()
        );
        max = parseInt(
            me.$root.find('#Requirements_Requirement_FloorAreaMax').val()
        );
        if (isNaN(min)) min = 0;
        if (isNaN(max) || max === 0) max = 25000;
        me.$root.find('.floorarea-slider').slider({
            range: true,
            min: 500,
            max: 25000,
            step: 500,
            values: [min, max],
            slide: function (event, ui) {
                var label =
                    ui.values[1] === 25000
                        ? 'sq ft or more'
                        : ' to ' + ui.values[1] + 'sq ft';
                $(this)
                    .closest('.row')
                    .find('.floorarea-slider-text')
                    .html(ui.values[0] + label);
            },
            stop: function (event, ui) {
                var newMin = ui.values[0] === 500 ? 0 : ui.values[0];
                var newMax = ui.values[1] === 25000 ? 0 : ui.values[1];
                $(this)
                    .closest('.row')
                    .find('#Requirements_Requirement_FloorAreaMin')
                    .val(newMin);
                $(this)
                    .closest('.row')
                    .find('#Requirements_Requirement_FloorAreaMax')
                    .val(newMax);
                me.getMatchList();
            }
        });

        //Land
        var landMin = parseFloat(
            me.$root.find('#Requirements_Requirement_LandMin').val()
        );
        var landMax = parseFloat('0'); //simontiger change this when requirement_landmax is available.
        var landValues = [0, 0.25, 0.5, 1, 2, 3, 5, 10, 25, 50, 100, 101];
        var valueCount = landValues.length - 1;
        var minIndex = landValues.indexOf(landMin);
        var maxIndex = landValues.indexOf(landMax);
        if (isNaN(min)) min = 0;
        me.$root.find('.land-slider').slider({
            range: true,
            min: 0,
            max: valueCount,
            values: [
                minIndex === -1 ? 0 : minIndex,
                maxIndex == -1 ? 0 : maxIndex
            ],
            slide: function (event, ui) {
                var label =
                    landValues[ui.values[0]] +
                    (ui.values[1] === valueCount
                        ? ' acres or more'
                        : ' to ' + landValues[ui.values[1]] + ' acres');

                $(this).closest('.row').find('.land-slider-text').html(label);
            },
            stop: function (event, ui) {
                var newMin = landValues[ui.values[0]];
                var newMax = landValues[ui.values[1]];

                $(this)
                    .closest('.row')
                    .find('#Requirements_Requirement_LandMin')
                    .val(newMin);
                $(this)
                    .closest('.row')
                    .find('#Requirements_Requirement_LandMax')
                    .val(newMax);
                me.getMatchList();
            }
        });

        //Areas > Changed
        me.$root.on(
            'changed',
            '.checklist[data-type="match-areas"] input',
            function () {
                var total = $(this)
                    .closest('.checklist')
                    .find('input[type="checkbox"]').length;
                var count = $(this)
                    .closest('.checklist')
                    .find('input[type="checkbox"]:checked').length;
                me.$root
                    .find('.areas-header .insight')
                    .text(
                        count === 0 || count === total
                            ? 'All'
                            : count + ' of ' + total
                    );
                me.getMatchList();
            }
        );

        //Types > Changed
        me.$root.find('.types-tree').on('loaded.jstree', function () {
            me.$root.find('.types-tree').on('change_state.jstree', function () {
                var total = me.$root.find(
                    '.types-tree li[data-type="subType"]'
                ).length;
                var count = me.$root.find(
                    '.types-tree li[data-type="subType"].jstree-checked'
                ).length;
                me.$root
                    .find('.subtypes-header .insight')
                    .text(
                        count === 0 || count === total
                            ? 'All'
                            : count + ' of ' + total
                    );
                me.getMatchList();
            });
        });

        //Features > vtabs
        me.$root.on('click pseudo-click', '.vtabs .tab', function () {
            //tabs
            $(this).closest('.vtabs').find('.tab').removeClass('on');
            $(this).addClass('on');

            var type = $(this).data('type');
            var $features = $(this)
                .closest('.vtabs-container')
                .find('.checklist[data-type="features"]');
            $features.find('.item').hide();
            $features.find('.item[data-type="' + type + '"]').show();
        });
        me.$root.on(
            'changed',
            '.vtabs-container .checklist[data-type="features"] input',
            function () {
                //items
                var type = $(this).closest('.item').data('type');
                var $list = $(this)
                    .closest('.vtabs-container')
                    .find('.checklist[data-type="features"]');
                var count = $list.find(
                    '.item[data-type="' +
                        type +
                        '"] input[type="checkbox"]:checked'
                ).length;
                var globalTotal = $list.find(
                    '.item input[type="checkbox"]'
                ).length;
                var globalCount = $list.find(
                    '.item input[type="checkbox"]:checked'
                ).length;
                var $counter = $(this)
                    .closest('.vtabs-container')
                    .find('.tab.on span');

                if (count === 0) $counter.removeClass('on');
                else $counter.text(count).addClass('on');

                me.$root
                    .find('.features-header .insight')
                    .text(
                        globalCount === 0 || globalCount === globalTotal
                            ? 'None'
                            : globalCount + ' of ' + globalTotal
                    );

                me.getMatchList();
            }
        );

        me.getMatchList();
    },

    getMatchList: function (searchArgs) {
        var me = this;

        if (!searchArgs) {
            searchArgs = {
                SearchPage: {
                    Index: 1,
                    Size: C.SearchPageSize.Default
                },
                SearchOrder: {
                    By: C.SearchOrderBy.Price,
                    Type: C.SearchOrderType.Ascending
                }
            };
        }

        var recordTypeId = parseInt(
            me.$root.find('#Requirement_RecordTypeId').val()
        );

        //Areas
        var areaIds = me.matchAreasTool.getAreaIds();

        var totalAreas = me.$root.find(
            '.checklist[data-type="match-areas"] input'
        ).length;

        //If all areas required then its the same as not supplying any areas
        if (totalAreas === areaIds.length) {
            areaIds = [];
        }

        //SubTypes
        var subTypeIds = [];
        me.$root
            .find('.types-tree')
            .jstree('get_checked', null, true)
            .each(function (i, v) {
                if ($(v).data('type') === 'subType')
                    subTypeIds.push($(v).data('id'));
            });

        // If all subtypes have been selected then empty the array so that 'all' property including those without a subtype get returned
        var total = me.$root.find('.types-tree li[data-type="subType"]').length;
        var count = me.$root.find(
            '.types-tree li[data-type="subType"].jstree-checked'
        ).length;

        if (count !== 0 && count === total) {
            subTypeIds = [];
        }

        // Status
        var statusIdList = [];

        me.$root
            .find('.checklist[data-type="match-status"] .item input:checked')
            .each(function (i, v) {
                statusIdList.push($(v).val());
            });

        //Features
        var featureList = [];
        me.$root
            .find('.checklist[data-type="features"] .item input:checked')
            .each(function (i, v) {
                var type = $(v).data('type');
                var id = $(v).data('id');
                featureList.push({
                    CodeType: type,
                    InstanceId: id
                });
            });
        var totalFeatureCount = me.$root.find(
            '.checklist[data-type="features"] .item input'
        ).length;
        var selectedFeatureCount = me.$root.find(
            '.checklist[data-type="features"] .item input:checked'
        ).length;
        if (
            selectedFeatureCount !== 0 &&
            selectedFeatureCount === totalFeatureCount
        ) {
            featureList = [];
        }

        //Set min/max price to use.  For rental searches, conditionally convert PW pricing into PCM.
        var priceMin = gmgps.cloud.utility.getMatchFieldN(
            me.$root.find('#Requirements_Requirement_PriceMin')
        );
        var priceMax = gmgps.cloud.utility.getMatchFieldN(
            me.$root.find('#Requirements_Requirement_PriceMax')
        );

        if (recordTypeId === C.PropertyRecordType.Rent) {
            var freq = parseInt(
                me.$root
                    .find(
                        'input[name="Requirement.RentalPriceFrequency"]:checked'
                    )
                    .val()
            );
            if (freq === C.Frequency.Weekly) {
                priceMin = priceMin * (52 / 12);
                priceMax = priceMax * (52 / 12);
            }
        }

        var index = me.$root.find('#picker-tabs').tabs('option', 'active');
        var searchId = me.$root
            .find('ul.search-list .searches.tickbox.ticked')
            .closest('li')
            .data('id');

        me.search = {
            statusIdList: statusIdList,
            SearchId: index === 1 ? searchId : 0,
            PriceMin: priceMin,
            PriceMax: priceMax,
            BedsMin: me.$root.find('#Requirements_Requirement_BedsMin').val(),
            BedsMax: me.$root.find('#Requirements_Requirement_BedsMax').val(),
            Bathrooms: me.$root
                .find('#Requirements_Requirement_Bathrooms')
                .val(),
            Receptions: me.$root
                .find('#Requirements_Requirement_Receptions')
                .val(),
            ParkingMin: me.$root
                .find('#Requirements_Requirement_MinParking')
                .val(),
            LandMin: me.$root.find('#Requirements_Requirement_LandMin').val(),
            RecordType: recordTypeId,
            FloorAreaMin: me.$root
                .find('#Requirements_Requirement_FloorAreaMin')
                .val(),
            FloorAreaMax: me.$root
                .find('#Requirements_Requirement_FloorAreaMax')
                .val(),
            IncludeFeatureIds: true,
            MatchAreaIds: areaIds,
            SubTypeIdList: subTypeIds,
            FeatureList: featureList,
            TenureId: me.$root.find('#Requirements_Requirement_TenureId').val(),
            FurnishedId:
                recordTypeId === C.PropertyRecordType.Rent
                    ? me.$root
                          .find('#Requirements_Requirement_RentalFurnishedId')
                          .val()
                    : 0,
            BenefitClaimantsAllowed:
                recordTypeId === C.PropertyRecordType.Rent
                    ? me.$root
                          .find('#Requirements_Requirement_RentalDSS')
                          .prop('checked')
                    : false,
            SmokersAllowed:
                recordTypeId === C.PropertyRecordType.Rent
                    ? me.$root
                          .find('#Requirements_Requirement_RentalSmoker')
                          .prop('checked')
                    : false,
            PetsAllowed:
                recordTypeId === C.PropertyRecordType.Rent
                    ? me.$root
                          .find('#Requirements_Requirement_RentalPets')
                          .prop('checked')
                    : false,
            ChildrenAllowed:
                recordTypeId === C.PropertyRecordType.Rent
                    ? me.$root
                          .find('#Requirements_Requirement_RentalChildren')
                          .prop('checked')
                    : false,
            SearchPage: searchArgs.SearchPage,
            SearchOrder: searchArgs.SearchOrder,
            ReturnCountOnly: false,
            IncludeAdvertisingDetails: me.includeAdvertDetails,
            FeatureMatchMode: C.MatchMode.All
        };

        //Get results
        new gmgps.cloud.http("propertypicker-getMatchList").ajax(
            {
                args: me.search,
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/Contact/GetMatchList'
            },
            function (response) {
                me.displayMatchList(response);
            }
        );
    },

    displayMatchList: function (response) {
        var me = this;

        //Insert list (if there is a response).
        me.$root.find('.matching-property')[0].innerHTML = response.Data;

        //Create a new list object.
        var args =
            me.matchList == null
                ? {
                      ids: [],
                      disableSelectAll: false,
                      selectionMode: C.ListSelectionMode.None,
                      selectedItemName: 'Property',
                      selectedItemPluralName: 'Properties'
                  }
                : me.matchList.getState();
        args.$root = me.$root.find('.matching-property');

        me.matchList = new gmgps.cloud.ui.controls.list(args);

        me.matchList.onPageRequest.handle(function (args) {
            me.getMatchList(args);
        });
    },

    action: function () {
        var me = this;
        me.destroyContextMenu();

        if (me.matchList.selectionMode === C.ListSelectionMode.None) {
            //Return the selected ids.
            me.selectedIds = me.matchList.ids;
        } else {
            //Resolve the selection using a search.
            me.search.Ids = me.matchList.ids;
            me.search.excludeIds = true;
            me.search.SearchPage = {
                Index: 1,
                Size: 0
            };

            new gmgps.cloud.http("propertypicker-action").ajax(
                {
                    args: me.search,
                    async: false,
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: '/Property/GetPropertyIds'
                },
                function (response) {
                    me.selectedIds = response.Data.List;
                }
            );
        }
    },

    cancel: function () {
        var me = this;
        me.destroyContextMenu();
    },

    destroyContextMenu: function () {
        $.contextMenu(
            'destroy',
            'div.content .property-picker-form .sort-order'
        );
    },

    initMatchAreas: function () {
        var me = this;
        me.matchAreasTool = gmgps.cloud.helpers.matchAreas.create({
            $treeElement: me.$root.find('div[data-type="match-areas"]'),
            onChange: function () {
                me.getMatchList(null);
            }
        });
    }
};
