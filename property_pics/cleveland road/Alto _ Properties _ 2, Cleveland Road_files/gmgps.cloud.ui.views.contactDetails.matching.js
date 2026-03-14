gmgps.cloud.ui.views.contactDetails.matching = function (args) {
    var me = this;
    me.cfg = args;
    me.$root = args.$root;

    me.search = null;
    me.list = null;

    me.$tabs = null;

    me.tabColumn = new gmgps.cloud.ui.controls.tabColumn({
        $root: me.$root.find('.tab-column'),
        entityType: 'contact'
    });

    me.id = args.id;
    me.setDirty = args.dirtyCallback;
    me.matchCountCallback = args.matchCountCallback;
    me.clientIntentionCallback = args.clientIntentionCallback;

    //me.init();

    return this;
};

gmgps.cloud.ui.views.contactDetails.matching.prototype = {
    init: function () {
        var me = this;

        //Init tabs for Requirement Profiles
        me.$tabs = me.$root.find('.tabs.contact-requirements-tabs');
        me.$tabs.tabs({
            //Requirement Tab > Select/Activate
            activate: function (event, ui) {
                var isNew = ui.newPanel.attr('id') == 'profile-new-tab';

                me.activateTab(ui.newTab.index(), isNew, $(ui.oldPanel));
            }
        });

        me.setNewProfilePermittedState();

        //Delete Profile > Click
        me.$tabs.on('click', '.delete-profile', function () {
            var id = $(this).closest('.profile-tab').attr('id');

            showDialog({
                type: 'question',
                title: 'Remove Profile?',
                msg: 'Are you sure you would you like to remove this profile?',
                buttons: {
                    Yes: function () {
                        me.removeRequirementProfile(id);
                        $(this).dialog('close');
                    },
                    No: function () {
                        $(this).dialog('close');
                    }
                }
            });
        });

        //Edit Profile Name > Click
        me.$tabs.on('click', '.edit-profile', function () {
            var $a = $(this).closest('li').find('a');

            gmgps.cloud.helpers.general.promptForString(
                'Profile Name',
                $a.text(),
                'Amend Profile Name',
                function (value) {
                    if (!me.setDirty(true)) {
                        return false;
                    }

                    //Update the tab label.
                    $a.text(value);

                    //Update the name field.
                    me.$root
                        .find('{0} #Requirement_Name '.format($a.attr('href')))
                        .val(value);
                }
            );
        });

        //Property Preview Image Link > Click
        me.$root
            .find('.layer[data-id="matches"]')
            .on('click', '.preview-image', function () {
                var id = parseInt($(this).closest('.row').attr('data-id'));
                gmgps.cloud.helpers.property.editProperty({
                    id: id
                });
            });

        //IncludeInMatch - duplicate value into tab content
        me.$root.on(
            'change',
            '.profile-tab-tab .include-checkbox',
            function () {
                var val = $(this).prop('checked');
                var tabId = parseInt(
                    $(this).closest('.profile-tab-tab').attr('data-id')
                );
                me.$root
                    .find(
                        '#profile-' + tabId + '-tab #Requirement_IncludeInMatch'
                    )
                    .val(val);
            }
        );

        me.$root.on('click', '.reject-match, .unreject-match', function (e) {
            e.stopPropagation();

            var propertyId = $(this).closest('tr').data('id');
            var contactId = me.id;

            var rejected = true;
            if ($(this).hasClass('unreject-match')) {
                rejected = false;
            }

            new gmgps.cloud.http("reject-property-match").ajax(
                {
                    args: {
                        contactId: contactId,
                        propertyId: propertyId,
                        rejected: rejected
                    },
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: '/Property/SetContactRejection',
                    background: false
                },
                function (response) {
                    if (response.Data == true) {
                        me.getMatchList();
                    }
                }
            );
        });

        //Init content for each profile tab
        me.$root.find('.profile-tab').each(function (i, v) {
            me.initProfileTabContent($(v));
        });

        me.$root.on('mouseover ', '.rejected-explanation.tip', function () {
            $(this).qtip({
                position: {
                    my: 'top middle',
                    at: 'bottom middle'
                },
                show: {
                    event: 'mouseenter',
                    ready: true,
                    delay: 0
                },
                hide: 'mouseleave',
                style: {
                    tip: true,
                    classes: 'qtip-dark'
                }
            });
        });
    },

    activateTab: function (index, isNew, $previousTab) {
        var me = this;

        //Conditionally persist list settings.
        if (
            $previousTab &&
            $previousTab.length != 0 &&
            !$previousTab.attr('id') == 'profile-new-tab'
        ) {
            me.writeMatchListConfig($previousTab);
        }

        //If this is the "New Profile" tab, create a new profile and exit early.
        if (isNew) {
            //Get the master intention for the contact.  Assume buy unless explicitly set to rent.
            var intention = parseInt(
                me.$root.find('#Contact_Applicant_IntentionId').val()
            );

            me.createNewProfile(
                'New Profile',
                intention === C.ClientIntentionType.Buy
                    ? C.PropertyRecordType.Sale
                    : C.PropertyRecordType.Rent
            );

            return;
        }

        //Refresh accordion (else it may collapse).
        me.$activeTab().find('.accordion').accordion('refresh');

        //Existing profile.
        me.hideProfileNameInputs();

        if (me.$activeTab().find('.matches-container').is(':empty')) {
            me.search = null;
            me.list = null;

            //Fill an empty tab with results.
            me.getMatchList();
        } else {
            //Re-apply the list config for the newly selected tab.
            var matchListConfig = me.readMatchListConfig(me.$activeTab());
            me.search = matchListConfig.search;
            me.list = new gmgps.cloud.ui.controls.list({
                $root: me.$activeTab().find('.matches-container'),
                state: matchListConfig.list
            });
        }

        //Init Sort order context menu
        var tabContentId = '#profile-{0}-tab'.format(index + 1);
        $.contextMenu(
            'destroy',
            '{0} .property-match-list .sort-order'.format(tabContentId)
        );
        $.contextMenu({
            selector: '{0} .property-match-list .sort-order'.format(
                tabContentId
            ),
            trigger: 'left',
            callback: function (key, options) {
                me.getMatchList({
                    SearchOrder: {
                        By: options.items[key].sortKey,
                        Type:
                            options.items['sortAscending'].$input.prop(
                                'checked'
                            ) === true
                                ? C.SearchOrderType.Ascending
                                : C.SearchOrderType.Descending
                    },
                    SearchPage: {
                        Index: 1,
                        Size: C.SearchPageSize.Default
                    }
                });
            },
            items: {
                sortAscending: {
                    name: 'Sort Ascending',
                    type: 'checkbox',
                    selected: true
                },
                sep1: '---------',
                price: { name: 'Price', sortKey: C.SearchOrderBy.Price },
                beds: { name: 'Bedrooms', sortKey: C.SearchOrderBy.Beds },
                bathrooms: {
                    name: 'Bathrooms',
                    sortKey: C.SearchOrderBy.Bathrooms
                },
                receptions: {
                    name: 'Receptions',
                    sortKey: C.SearchOrderBy.Receptions
                },
                sep2: '---------',
                date: {
                    name: 'Time On Market',
                    sortKey: C.SearchOrderBy.OnMarketDate
                }
            }
        });

        me.setNewProfilePermittedState();
    },

    $activeTab: function () {
        var me = this;
        var activeTabIndex = me.$tabs.tabs('option', 'active');
        return me.$tabs.find('.profile-tab').eq(activeTabIndex);
    },

    readMatchListConfig: function ($tab) {
        //Get persisted list and search objects from the profile tab root.
        var me = this;

        var serializedList = $tab.attr('data-list');
        var serializedSearch = $tab.attr('data-search');

        var list = serializedList ? JSON.parse(serializedList) : null;
        var search = serializedSearch
            ? JSON.parse(serializedSearch)
            : me.search;

        return {
            list: list,
            search: search
        };
    },

    writeMatchListConfig: function ($tab) {
        //Set persisted list and search objects back to the profile tab root.
        var me = this;

        if (me.list == null) {
            return;
        }

        $tab.attr('data-list', JSON.stringify(me.list.getState())).attr(
            'data-search',
            JSON.stringify(me.search)
        );
    },

    initProfileTabContent: function ($tabContent) {
        var me = this;
        var min, max;

        var resetList = function () {
            if (me.list) {
                me.list.ids = [];
                me.list.selectionMode = C.ListSelectionMode.None;
            }
        };

        var debouncedGetMatchList = function () {
            if (me.list) {
                resetList();
            }

            me.getMatchList();
        };
        var $attributes = $tabContent.find('.attributes');

        //Style dropdowns.
        $attributes.find('select').not('.opt-standard').customSelect();

        //Match Areas Tree
        gmgps.cloud.helpers.matchAreas.create({
            $treeElement: $attributes.find('div[data-type="match-areas"]'),
            onChange: function (e, data, tree, totalCount, selectedCount) {
                if (!me.setDirty(true)) {
                    return false;
                }

                resetList();

                $attributes
                    .find('.areas-header .insight')
                    .text(
                        selectedCount === 0 || selectedCount === totalCount
                            ? 'All'
                            : selectedCount + ' of ' + totalCount
                    );

                me.getMatchList();
            }
        });

        //Tree* > All/None > Click
        $attributes.on('click', '.ui-accordion-header .insight', function () {
            if (!me.setDirty(true)) {
                return false;
            }

            var selectAllBehaviour =
                new gmgps.cloud.ui.behaviours.SelectAllBehaviour();
            selectAllBehaviour.apply($(this));

            me.getMatchList();
        });

        //Init trees
        $attributes.find('.types-tree').each(function (i, tree) {
            if ($.jstree._reference(tree)) {
                $(tree).jstree('refresh');
            } else {
                $(tree).jstree({
                    plugins: ['themes', 'html_data', 'checkbox'],
                    themes: {
                        theme: 'default',
                        dots: true,
                        icons: false
                    },
                    checkbox: {
                        two_state: false
                    },
                    core: {
                        animation: 0
                    }
                });
            }
        });

        //Init Accordion
        $attributes.find('.accordion').accordion({
            collapsible: false,
            heightStyle: 'fill',
            create: function () {
                $(window).resize(function () {
                    var $accordion = $attributes.find('.accordion').accordion();

                    if ($accordion.data()) {
                        $accordion.accordion('refresh');
                    }
                });
            }
        });

        //Match triggers
        $attributes.on(
            'click',
            'input.opt-match:radio, input.opt-match:checkbox',
            function () {
                resetList();
                me.getMatchList();
            }
        );

        var executeGetMatchList = $.debounce(250, false, debouncedGetMatchList);

        $attributes.on(
            'keyup change',
            '.opt-match:not(:checkbox, input[name=RequirementTenureId])',
            executeGetMatchList
        );

        //Match Mode Option > Click
        $attributes.on('click', 'input.match-mode:radio', function () {
            var value = $(this).val();
            var index = $(this).attr('data-index');
            var hidden = $(this)
                .closest('.match-modes')
                .find('input:hidden[data-index=' + index + ']');
            hidden.val(value);
        });

        $attributes.on('click', '.matching .item .label', function () {
            $(this).closest('.item').find('.box input').trigger('click');
        });

        //Requirement Tab > Tenure > Change
        $attributes.on(
            'change',
            'input[name=RequirementTenureId]',
            function () {
                var val = parseInt($(this).val());
                switch (val) {
                    case C.TenureType.Unspecified:
                        $attributes.find('#Requirement_Leasehold').val('True');
                        $attributes.find('#Requirement_Freehold').val('True');
                        break;
                    case C.TenureType.Freehold:
                        $attributes.find('#Requirement_Leasehold').val('False');
                        $attributes.find('#Requirement_Freehold').val('True');
                        break;
                    case C.TenureType.Leasehold:
                        $attributes.find('#Requirement_Leasehold').val('True');
                        $attributes.find('#Requirement_Freehold').val('False');
                        break;
                }
            }
        );

        //Requirement Tab > RecordType > Change
        $attributes.on(
            'change prog-change',
            '#Requirement_RecordTypeId',
            function () {
                //Only interested in Client type contacts
                if (
                    parseInt(me.$root.find('#Contact_Category').val()) !==
                    C.ContactCategory.Client
                ) {
                    return;
                }

                me.clientIntentionCallback();

                var val = parseInt($(this).val());

                if (val === C.PropertyRecordType.Sale) {
                    //Store values
                    me.rentMin = $attributes
                        .find('#Requirement_PriceMin')
                        .val();
                    me.rentMax = $attributes
                        .find('#Requirement_PriceMax')
                        .val();

                    //Set values
                    if (me.saleMin) {
                        $attributes
                            .find('#Requirement_PriceMin')
                            .val(me.saleMin);
                        $attributes
                            .find('#Requirement_PriceMax')
                            .val(me.saleMax);
                    } else {
                        $attributes.find('#Requirement_PriceMin').val('');
                        $attributes.find('#Requirement_PriceMax').val('');
                    }

                    $attributes.find('.tag-rent').hide();
                    $attributes.find('.tag-sale').show();
                } else {
                    //Store values
                    me.saleMin = $attributes
                        .find('#Requirement_PriceMin')
                        .val();
                    me.saleMax = $attributes
                        .find('#Requirement_PriceMax')
                        .val();

                    //Set values
                    if (me.rentMin) {
                        $attributes
                            .find('#Requirement_PriceMin')
                            .val(me.rentMin);
                        $attributes
                            .find('#Requirement_PriceMax')
                            .val(me.rentMax);
                    } else {
                        $attributes.find('#Requirement_PriceMin').val('');
                        $attributes.find('#Requirement_PriceMax').val('');
                    }

                    $attributes.find('.tag-rent').show();
                    $attributes.find('.tag-sale').hide();
                }
            }
        );

        //Beds
        min = parseInt($attributes.find('#Requirement_BedsMin').val());
        max = parseInt($attributes.find('#Requirement_BedsMax').val());
        if (isNaN(min)) min = 0;
        if (isNaN(max) || max === 0) max = 10;
        $attributes.find('.beds-slider').slider({
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
                if (!me.setDirty(true)) {
                    return false;
                }

                resetList();

                var newMin = ui.values[0] === 0 ? 0 : ui.values[0];
                var newMax = ui.values[1] === 10 ? 0 : ui.values[1];
                $(this)
                    .closest('.row')
                    .find('#Requirement_BedsMin')
                    .val(newMin);
                $(this)
                    .closest('.row')
                    .find('#Requirement_BedsMax')
                    .val(newMax);
                me.getMatchList();
            }
        });

        //Baths
        min = parseInt($attributes.find('#Requirement_Bathrooms').val());
        if (isNaN(min)) min = 0;
        $attributes.find('.baths-slider').slider({
            range: false,
            min: 0,
            max: 5,
            value: min,
            slide: function (event, ui) {
                var label = ui.value === 0 ? 'Any' : ui.value + ' or more';
                $(this).closest('.row').find('.baths-slider-text').html(label);
            },
            stop: function (event, ui) {
                if (!me.setDirty(true)) {
                    return false;
                }

                resetList();

                var newMin = ui.value === 0 ? 0 : ui.value;
                $(this)
                    .closest('.row')
                    .find('#Requirement_Bathrooms')
                    .val(newMin);
                me.getMatchList();
            }
        });

        //Receptions
        min = parseInt($attributes.find('#Requirement_Receptions').val());
        if (isNaN(min)) min = 0;
        $attributes.find('.receps-slider').slider({
            range: false,
            min: 0,
            max: 5,
            value: min,
            slide: function (event, ui) {
                var label = ui.value === 0 ? 'Any' : ui.value + ' or more';
                $(this).closest('.row').find('.receps-slider-text').html(label);
            },
            stop: function (event, ui) {
                if (!me.setDirty(true)) {
                    return false;
                }

                resetList();

                var newMin = ui.value === 0 ? 0 : ui.value;
                $(this)
                    .closest('.row')
                    .find('#Requirement_Receptions')
                    .val(newMin);
                me.getMatchList();
            }
        });

        //Parking
        min = parseInt($attributes.find('#Requirement_MinParking').val());
        if (isNaN(min)) min = 0;
        $attributes.find('.parking-slider').slider({
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
                if (!me.setDirty(true)) {
                    return false;
                }

                resetList();

                var newMin = ui.value === 0 ? 0 : ui.value;
                $(this)
                    .closest('.row')
                    .find('#Requirement_MinParking')
                    .val(newMin);
                me.getMatchList();
            }
        });

        //Floor Area
        min = parseInt($attributes.find('#Requirement_FloorAreaMin').val());
        max = parseInt($attributes.find('#Requirement_FloorAreaMax').val());
        if (isNaN(min)) min = 0;
        if (isNaN(max) || max === 0) max = 25000;
        $attributes.find('.floorarea-slider').slider({
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
                if (!me.setDirty(true)) {
                    return false;
                }

                resetList();

                var newMin = ui.values[0] === 500 ? 0 : ui.values[0];
                var newMax = ui.values[1] === 25000 ? 0 : ui.values[1];
                $(this)
                    .closest('.row')
                    .find('#Requirement_FloorAreaMin')
                    .val(newMin);
                $(this)
                    .closest('.row')
                    .find('#Requirement_FloorAreaMax')
                    .val(newMax);
                me.getMatchList();
            }
        });

        //Land
        var landMin = parseFloat(
            $attributes.find('#Requirement_LandMin').val()
        );
        var landMax = parseFloat(
            $attributes.find('#Requirement_LandMax').val()
        );
        var landValues = [0, 0.25, 0.5, 1, 2, 3, 5, 10, 25, 50, 100, 101];
        var valueCount = landValues.length - 1;
        var minIndex = landValues.indexOf(landMin);
        var maxIndex = landValues.indexOf(landMax);
        if (isNaN(min)) min = 0;
        $attributes.find('.land-slider').slider({
            range: true,
            min: 0,
            max: valueCount,
            values: [
                minIndex === -1 ? 0 : minIndex,
                maxIndex === -1 ? 101 : maxIndex
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
                if (!me.setDirty(true)) {
                    return false;
                }

                resetList();

                //A min/max value of 101 is the upper bound max, so it is cancelled out to zero.
                var newMin =
                    landValues[ui.values[0]] === 101
                        ? 0
                        : landValues[ui.values[0]];
                var newMax =
                    landValues[ui.values[1]] === 101
                        ? 0
                        : landValues[ui.values[1]];

                $(this)
                    .closest('.row')
                    .find('#Requirement_LandMin')
                    .val(newMin);
                $(this)
                    .closest('.row')
                    .find('#Requirement_LandMax')
                    .val(newMax);
                me.getMatchList();
            }
        });

        //Types > Changed
        $attributes.find('.types-tree').on('loaded.jstree', function () {
            $attributes
                .find('.types-tree')
                .on('change_state.jstree', function () {
                    if (!me.setDirty(true)) {
                        return false;
                    }

                    resetList();

                    var total = $attributes.find(
                        '.types-tree li[data-type="subType"]'
                    ).length;
                    var count = $attributes.find(
                        '.types-tree li[data-type="subType"].jstree-checked'
                    ).length;
                    $attributes
                        .find('.subtypes-header .insight')
                        .text(
                            count === 0 || count === total
                                ? 'All'
                                : count + ' of ' + total
                        );
                    me.getMatchList();
                });
        });

        //Features : vtabs > Click
        $attributes.on('click pseudo-click', '.vtabs .tab', function () {
            //tabs
            $(this).closest('.vtabs').find('.tab').removeClass('on');
            $(this).addClass('on');

            var type = $(this).data('type');
            var $features = $(this)
                .closest('.vtabs-container')
                .find('.checklist[data-type="features"]');
            $features.find('.item').hide();
            $features.find('.item[data-type="{0}"]'.format(type)).show();
        });

        //Features : Checkboxes > Change
        $attributes.on(
            'changed',
            '.vtabs-container .checklist[data-type="features"] input',
            function () {
                //items

                if (!me.setDirty(true)) {
                    return false;
                }

                resetList();

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

                $attributes
                    .find('.features-header .feature-insight')
                    .text(
                        globalCount === 0 || globalCount === globalTotal
                            ? 'None'
                            : globalCount + ' of ' + globalTotal
                    );

                me.getMatchList();
            }
        );

        //Features > Select All/None > Click
        $attributes.on('click', '.feature-insight', function () {
            if (!me.setDirty(true)) {
                return false;
            }

            //toggle ticks
            var text = $(this).text();
            var $content = $(this)
                .closest('.ui-accordion-header')
                .next()
                .find('.checklist, .jstree');

            if (text === 'All') {
                //All items currently selected, so select none.
                $(this).text('None');

                //Tickboxes
                $content
                    .find('input')
                    .prop('checked', false)
                    .trigger('prog-change');

                //Tree nodes
                $content
                    .find('li.jstree-checked')
                    .removeClass('jstree-checked jstree-undetermined')
                    .addClass('jstree-unchecked');
            } else {
                //Either none selected currently, or some.  Select all.
                $(this).text('All');

                //Tickboxes
                $content
                    .find('input')
                    .prop('checked', true)
                    .trigger('prog-change');

                //Tree nodes
                $content
                    .find('li')
                    .addClass('jstree-checked')
                    .removeClass('jstree-unchecked jstree-undetermined');
            }

            //trigger a search
            me.getMatchList();

            //updates feature count in each section
            var sections = $attributes.find(
                '.vtabs[data-type=featurecategories] .tab'
            );
            for (var s = 0; s < sections.length; s++) {
                var section = sections[s];
                var type = $(section).attr('data-type');

                var $list = $(section)
                    .closest('.vtabs-container')
                    .find('.checklist[data-type="features"]');
                var count = $list.find(
                    '.item[data-type="' +
                        type +
                        '"] input[type="checkbox"]:checked'
                ).length;

                var span = $(section).find('span');
                if (count > 0) {
                    span.html(count);
                    span.addClass('on');
                } else {
                    span.html('');
                }
            }
        });
    },

    initLayer: function () {
        var me = this;

        me.init();
        // hide delete button when only a single profile remaining
        me.updateDeleteProfileButtonVisibity();
    },

    displayMatchList: function (response) {
        var me = this;

        var $matchesContainer = me.$activeTab().find('.matches-container');

        //Insert list (if there is a response).
        if (response && $matchesContainer.length > 0) {
            $matchesContainer[0].innerHTML = response.Data;
            var totalRows = parseInt(
                $matchesContainer
                    .find('.property-match-list')
                    .attr('data-totalrows')
            );
            if (!isNaN(totalRows)) {
                $matchesContainer.attr('data-totalrows', totalRows);
            }
        }

        me.callbackWithTotalMatchCount();

        //Create a new list object.
        var args =
            me.list == null
                ? {
                      ids: [],
                      disableSelectAll: false,
                      selectionMode: C.ListSelectionMode.None,
                      selectedItemName: 'Property',
                      selectedItemPluralName: 'Properties'
                  }
                : me.list.getState();

        args.$root = me.$activeTab().find('.matches-container');

        me.list = new gmgps.cloud.ui.controls.list(args);

        me.list.onPageRequest.handle(function (pageArgs) {
            me.getMatchList(pageArgs);
        });
        me.list.onSelectionChanged.handle(function () {
            me.writeMatchListConfig(me.$activeTab());
        });

        me.writeMatchListConfig(me.$activeTab());
    },

    callbackWithTotalMatchCount: function () {
        var me = this;

        var count = 0;
        var $lists = me.$root.find('.matches-container');
        $lists.each(function (i, v) {
            count += parseInt($(v).attr('data-totalrows'));
        });

        if (me.matchCountCallback) {
            me.matchCountCallback(count);
        }
    },

    rejectAContactPropertyMatch: function (contactId, propertyId) {
        var me = this;

        new gmgps.cloud.http("matching-rejectAContactPropertyMatch").ajax(
            {
                args: {
                    contactId: contactId,
                    propertyId: propertyId,
                    rejected: true
                },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/Property/SetContactRejection',
                background: false
            },
            function () {
                me.list.removeOneElementFromList(propertyId);
                me.list.updateNotification();
            }
        );
    },

    refreshMatches: function () {
        var me = this;
        me.getMatchList();
    },

    getMatchList: function (paging) {
        var me = this;
        var $activeTab = me.$activeTab();

        var searchToExecute = me.getContactSearchObject($activeTab, paging);

        if (searchToExecute === false) return void 0;

        me.search = searchToExecute;

        //Send request for match list page.
        new gmgps.cloud.http("matching-getMatchList").ajax(
            {
                args: me.search,
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/Contact/GetMatchList',
                background: true
            },
            function (response) {
                me.displayMatchList(response, paging);
            }
        );
    },

    requestMatchCountCallback: function () {
        var me = this;

        var d = $.Deferred();

        new gmgps.cloud.http("matching-requestMatchCountCallback").ajax(
            {
                args: { contactId: me.id },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/Contact/GetTotalMatchesCount',
                background: true
            },
            function (response) {
                var count = response.Data.TotalMatches;

                me.matchCountCallback(count, true);
                d.resolve(count);
            }
        );

        return d.promise;
    },

    getContactSearchObject: function ($tab, paging) {
        var me = this;

        if ($tab.length === 0) {
            return false;
        }

        if (!paging) {
            paging = {
                SearchPage: {
                    Index: 1,
                    Size: C.SearchPageSize.Default
                },
                SearchOrder: {
                    By: C.SearchOrderBy.OnMarketDate,
                    Type: C.SearchOrderType.Ascending
                }
            };
        }

        var recordTypeId = parseInt(
            $tab.find('#Requirement_RecordTypeId').val()
        );

        //Areas
        var areaIds = gmgps.cloud.helpers.matchAreas.getAreaIds(
            $tab.find('div[data-type="match-areas"]')
        );

        //SubTypes
        var subTypeIds = [];
        $tab.find('.types-tree')
            .jstree('get_checked', null, true)
            .each(function (i, v) {
                if ($(v).data('type') === 'subType')
                    subTypeIds.push($(v).data('id'));
            });
        var totalSubTypeCount = $tab.find(
            '.types-tree li[data-type="subType"]'
        ).length;
        var selectedSubTypeCount = $tab.find(
            '.types-tree li[data-type="subType"].jstree-checked'
        ).length;
        if (
            selectedSubTypeCount !== 0 &&
            selectedSubTypeCount === totalSubTypeCount
        ) {
            subTypeIds = [];
        }

        //Features
        var featureList = [];
        $tab.find('.checklist[data-type="features"] .item input:checked').each(
            function (i, v) {
                var type = $(v).data('type');
                var id = $(v).data('id');
                featureList.push({
                    CodeType: type,
                    InstanceId: id
                });
            }
        );
        var totalFeatureCount = $tab.find(
            '.checklist[data-type="features"] .item input'
        ).length;
        var selectedFeatureCount = $tab.find(
            '.checklist[data-type="features"] .item input:checked'
        ).length;
        if (
            selectedFeatureCount !== 0 &&
            selectedFeatureCount === totalFeatureCount
        ) {
            featureList = [];
        }

        var featureMatchMode = $tab.find('input.match-mode:checked').val();

        //Set min/max price to use.  For rental searches, conditionally convert PW pricing into PCM.
        var priceMin = gmgps.cloud.utility.getMatchFieldN(
            $tab.find('#Requirement_PriceMin')
        );
        var priceMax = gmgps.cloud.utility.getMatchFieldN(
            $tab.find('#Requirement_PriceMax')
        );
        if (recordTypeId === C.PropertyRecordType.Rent) {
            var freq = parseInt(
                $tab
                    .find(
                        'input[name^="Requirement.RentalPriceFrequency"]:checked'
                    )
                    .val()
            );
            if (freq === C.Frequency.Weekly) {
                priceMin = priceMin * (52 / 12);
                priceMax = priceMax * (52 / 12);
            }
        }
        var search = {
            SearchId: C.FactorySearchId.RequirementsMatch,
            PriceMin: priceMin,
            PriceMax: priceMax,
            BedsMin: $tab.find('#Requirement_BedsMin').val(),
            BedsMax: $tab.find('#Requirement_BedsMax').val(),
            Bathrooms: $tab.find('#Requirement_Bathrooms').val(),
            Receptions: $tab.find('#Requirement_Receptions').val(),
            ParkingMin: $tab.find('#Requirement_MinParking').val(),
            LandMin: $tab.find('#Requirement_LandMin').val(),
            LandMax: $tab.find('#Requirement_LandMax').val(),
            RecordType: recordTypeId,
            FloorAreaMin: $tab.find('#Requirement_FloorAreaMin').val(),
            FloorAreaMax: $tab.find('#Requirement_FloorAreaMax').val(),
            IncludeFeatureIds: true,
            MatchAreaIds: areaIds,
            SubTypeIdList: subTypeIds,
            FeatureList: featureList,
            FeatureMatchMode: featureMatchMode,
            TenureId:
                recordTypeId === C.PropertyRecordType.Sale
                    ? $tab.find('input[name=RequirementTenureId]:checked').val()
                    : 0,
            FurnishedId:
                recordTypeId === C.PropertyRecordType.Rent
                    ? $tab.find('#Requirement_RentalFurnishedId').val()
                    : 0,
            BenefitClaimantsAllowed:
                recordTypeId === C.PropertyRecordType.Rent
                    ? $tab.find('#Requirement_RentalDSS').prop('checked')
                    : false,
            SmokersAllowed:
                recordTypeId === C.PropertyRecordType.Rent
                    ? $tab.find('#Requirement_RentalSmoker').prop('checked')
                    : false,
            PetsAllowed:
                recordTypeId === C.PropertyRecordType.Rent
                    ? $tab.find('#Requirement_RentalPets').prop('checked')
                    : false,
            ChildrenAllowed:
                recordTypeId === C.PropertyRecordType.Rent
                    ? $tab.find('#Requirement_RentalChildren').prop('checked')
                    : false,
            SearchPage: paging.SearchPage,
            SearchOrder: paging.SearchOrder,
            ReturnCountOnly: false,
            ContactId: me.id,
            RequirementsMatchType: parseInt(
                $tab.find('#MatchTypeId option:selected').val()
            ),
            NewBuild: $tab.find('#Requirement_NewBuild').val(),
            LimitByPropertyRejection: $tab
                .find('#LimitByPropertyRejection')
                .prop('checked')
        };

        return search;
    },

    getNextFreeTabIndex: function () {
        // need to find the first index Id >= 1 we can use from the tabs, there may be gaps if a previous requirement tab has been removed by the user, since the record was shown
        var me = this;

        var nextFreeIndexId = 1;

        var currentIndexIdList = $.map(
            me.$tabs.find('.ui-tabs-nav li.profile-tab-tab'),
            function (v) {
                return parseInt($(v).attr('data-id'));
            }
        ).sort(function (a, b) {
            return a - b;
        });

        if (currentIndexIdList.length === 0) return nextFreeIndexId;

        var missingNumber = function (nums) {
            var out = [];

            var maxValue = Math.max.apply(Math, nums);

            for (var i = 1; i < maxValue; i++) {
                if (nums.indexOf(i) < 0) {
                    out.push(i);
                }
            }
            return out;
        };

        var values = missingNumber(currentIndexIdList);

        if (values.length === 0)
            return currentIndexIdList[currentIndexIdList.length - 1] + 1;

        return values[0];
    },

    createNewProfile: function (newProfileName, newRecordType, enabled) {
        var me = this;

        me.hideProfileNameInputs();

        var branchId =
            me.id === 0
                ? parseInt(me.$root.find('#BranchId').val())
                : parseInt(me.$root.find('#Contact_BranchId').val());

        new gmgps.cloud.http("matching-createNewProfile").getView({
            url: '/Contact/GetNewRequirementProfile',
            args: {
                branchId: branchId,
                recordType: newRecordType
            },
            onSuccess: function (response) {
                if (!me.setDirty(true)) {
                    return false;
                }

                //Determine the index and id of the new tab.
                var newTabIndex = me.getNextFreeTabIndex();
                var newTabId = 'profile-{0}-tab'.format(newTabIndex);

                //Create a new tab for insertion.
                var $newTabContent = $(
                    '<div id="{0}" class="content profile-tab tag-populated">{1}</div>'.format(
                        newTabId,
                        response.Data
                    )
                );

                //Replace indexed control names.
                $newTabContent
                    .find('.match-modes #Requirement_FeatureMatchMode')
                    .attr('data-index', newTabIndex - 1);
                $newTabContent
                    .find("input[name='Requirement.RentalPriceFrequency']")
                    .each(function (i, v) {
                        $(v).attr(
                            'name',
                            'Requirement.RentalPriceFrequency_' + newTabIndex
                        );
                    });
                $newTabContent.find('#Requirement_Index').val(newTabIndex - 1);

                var indexedInputs = $newTabContent.find(
                    '.match-modes input.match-mode'
                );
                indexedInputs.attr('data-index', newTabIndex - 1);
                indexedInputs.each(function (inputIndex, value) {
                    if ($(value).val().length > 0) {
                        var name = $(value).attr('name');
                        name = name.replace(
                            '[0]',
                            '[' + (newTabIndex - 1) + ']'
                        );
                        $(value).attr('name', name);
                    }
                });

                // Append the new tab content.
                me.$tabs.find('#profile-new-tab').before($newTabContent);

                // Now insert the tab in its vanilla style to the left of the '+' tab.
                me.$tabs
                    .find('.ui-tabs-nav li:last')
                    .before(
                        '<li><a href="{0}">{1}</a></li>'.format(
                            '#{0}'.format(newTabId),
                            'Profile {0}'.format(newTabIndex)
                        )
                    );

                //Insert "Active" checkbox into tab.
                var $anchor = me.$tabs.find('a[href="#{0}"]'.format(newTabId));
                $anchor.before(
                    '<div class="profile-name edit-profile" title="Edit Profile Name"></div>'
                );
                $anchor
                    .parent()
                    .attr('data-id', newTabIndex)
                    .addClass('profile-tab-tab');
                $anchor.addClass('mr30').text(newProfileName);

                $anchor.after(
                    '<span class="tab-checkbox" style="position: absolute; top: 2px; right: 3px;">' +
                        '<div class="tickbox">' +
                        '<input class="include-checkbox tickbox-hidden" title="Include this profile in matches" class="pt3" type="checkbox" />' +
                        '</div>' +
                        '</span>'
                );

                if (enabled) {
                    $anchor
                        .parent()
                        .find('.tickbox-hidden')
                        .prop('checked', true)
                        .trigger('prog-change');
                }

                //Init tab content and select.
                me.initProfileTabContent($newTabContent);

                me.$tabs.tabs('refresh');

                me.$tabs.tabs(
                    'option',
                    'active',
                    me.$tabs.find('.ui-tabs-nav li.profile-tab-tab').length - 1
                );

                // show hide delete profile buttons
                me.updateDeleteProfileButtonVisibity();

                me.setNewProfilePermittedState();

                //Refresh accordions.
                me.$root.find('.accordion').accordion('refresh');
            }
        });

        return false;
    },

    hideProfileNameInputs: function () {
        var me = this;

        me.$root
            .find('.contact-requirements-list .tab-checkbox.hidden')
            .each(function (i, v) {
                $(v).removeClass('hidden');
            });
    },

    existingProfileTypes: function () {
        var me = this;

        var buyProfiles = 0;
        var rentProfiles = 0;

        // get count of existing profiles by type (sale/rent)
        var requirementProfiles = me.$root.find(
            '.layer[data-id="matches"] .profile-tab'
        );

        $.each(requirementProfiles, function (i, v) {
            var intention = parseInt(
                $(v).find('#Requirement_RecordTypeId').val(),
                10
            );

            if (intention === C.PropertyRecordType.Sale) {
                buyProfiles++;
            } else if (intention === C.PropertyRecordType.Rent) {
                rentProfiles++;
            }
        });

        return {
            buyCount: buyProfiles,
            rentCount: rentProfiles
        };
    },

    removeRequirementProfile: function (id) {
        var me = this;

        if (!me.setDirty(true)) {
            return false;
        }

        //Remove tab and panel, then refresh set.
        me.$tabs.find('li[aria-controls="{0}"]'.format(id)).remove();
        me.$tabs.find('#{0}'.format(id)).remove();

        me.$tabs.tabs('refresh');

        me.updateDeleteProfileButtonVisibity();
        me.setNewProfilePermittedState();

        //Select the first tab.
        me.$tabs.tabs('option', 'active', 0);
        me.activateTab(0);
        me.$root.find('.accordion').accordion('refresh');
    },

    setProfileTypesEnabled: function (type) {
        var me = this;
        var $checks = me.$tabs.find(
            '.contact-requirements-list input:checkbox:not(:checked)'
        );

        // find the <a> tag that contains the href to this tab's content
        $checks.each(function (i, v) {
            var $check = $(v);
            var href = $check.closest('li').find('a').attr('href');

            if (href) {
                var tabType = parseInt(
                    me.$tabs.find(href + ' #Requirement_RecordTypeId').val()
                );

                if (tabType === type) {
                    $check.prop('checked', true).trigger('prog-change');
                }
            }
        });
    },

    updateDeleteProfileButtonVisibity: function () {
        var me = this;
        var tabCount = me.$root.find('.contact-requirements-list li').length;

        $.each(me.$root.find('.requirement .delete-profile'), function (i, v) {
            if (tabCount <= 2) {
                $(v).hide();
            } else {
                $(v).show();
            }
        });
    },

    setNewProfilePermittedState: function () {
        var me = this;
        // if we have maximum 5 profiles then hide '+' to prevent more being created
        var profileCount = me.$root.find(
            '.contact-requirements-list .profile'
        ).length;

        if (profileCount >= 5) {
            me.$root
                .find(
                    '.contact-requirements-list li a[href="#profile-new-tab"]'
                )
                .parent()
                .hide();
        } else {
            me.$root
                .find(
                    '.contact-requirements-list li a[href="#profile-new-tab"]'
                )
                .parent()
                .show();
        }
    },

    getSelectedPropertyIds: function () {
        var me = this;

        var ids;

        if (me.list.selectionMode === C.ListSelectionMode.None) {
            //Return the selected ids.
            ids = me.list.ids;
        } else {
            //Resolve the selection using a search.
            var search = $.extend(true, {}, me.search);
            search.Ids = me.list.ids;
            search.ExcludeIds = true;
            search.SearchPage = {
                Index: 1,
                Size: 0
            };

            new gmgps.cloud.http("matching-getSelectedPropertyIds").ajax(
                {
                    args: search,
                    async: false,
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: '/Property/GetPropertyIds'
                },
                function (response) {
                    ids = response.Data.List;
                }
            );
        }

        return ids;
    },

    activate: function () {
        var me = this;

        me.activateTab(me.$tabs.tabs('option', 'active'));

        //Refresh any accordions.
        me.$tabs.find('.accordion').accordion('refresh');

        //Does the selected profile have results in it already?
        if (!me.$activeTab().find('.matches-container').is(':empty')) {
            var creationDateTime = Date.parse(
                me
                    .$activeTab()
                    .find('.matches-container')
                    .attr('data-creationDate')
            );
            var serverDateTime = shell.getApproxServerDateTime();
            var ms = serverDateTime - creationDateTime;
            var mins = Math.floor(ms / 60000);

            if (mins > 60) {
                //Results are more than 1hr old, throw them away and refresh.
                // - 1hr buffer is in place to allow the list to be worked and allow records to be switched.
                me.getMatchList();
            } else {
                //There are usuable results but we don't have a matchList object yet, so create one.
                var matchListConfig = me.readMatchListConfig(me.$activeTab());
                me.search = matchListConfig.search;
                me.list = new gmgps.cloud.ui.controls.list({
                    $root: me.$activeTab().find('.matches-container'),
                    state: matchListConfig.list
                });
                me.displayMatchList();
            }

            //Reset the 1hr loss of results as the list is being worked.
            me.$activeTab()
                .find('.matches-container')
                .attr(
                    'data-creationDate',
                    serverDateTime.toString('dd MMM yyyy HH:mm')
                );
        }
    }
};
