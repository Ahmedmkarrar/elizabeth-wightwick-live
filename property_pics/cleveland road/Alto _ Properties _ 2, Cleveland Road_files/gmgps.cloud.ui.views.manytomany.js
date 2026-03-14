gmgps.cloud.ui.views.manytomany = function (args) {
    var me = this;
    me.def = 'ui.views.manytomany';
    me.cfg = args;
    me.id = args.id;

    me.matchGroupHandler = args.data.matchGroupHandler;

    me.init(args);

    return this;
};

gmgps.cloud.ui.views.manytomany.typeName = 'gmgps.cloud.ui.views.manytomany';

gmgps.cloud.ui.views.manytomany.prototype = {
    init: function (args) {
        var me = this;

        me.$root = args.$root;

        me.$window = args.$window;

        me.initHandlers();
        me.initMatchGroups();

        setupTips(me.$root);

        me.checkBranchReferralBindings();
    },

    getMatchList: function (me) {
        var searchPage = '';
        var $form = me.$root.find('.form').clone();

        // this ensures we just execute a one off search instead of potentially comparing to a saved match group search
        $form.find('#SearchId').val(0);

        me.$root.find('#manytomany-count').html('Total Found: . . .');

        //GA needs to know the origin of the request eg via properties or tools
        me.$root
            .find('#CompletionDateSince')
            .attr('ga-category', me.matchGroupHandler.category);
        me.$root
            .find('#CompletionDateBefore')
            .attr('ga-category', me.matchGroupHandler.category);
        me.$root
            .find('#ExchangeDateSince')
            .attr('ga-category', me.matchGroupHandler.category);
        me.$root
            .find('#ExchangeDateBefore')
            .attr('ga-category', me.matchGroupHandler.category);

        if (me.selectionType === C.SelectionType.Contact) {
            searchPage = 'ManyToMany/ContactSearch';
        } else if (me.selectionType === C.SelectionType.Property) {
            searchPage = 'ManyToMany/PropertySearch';
            me.insertFeaturesHtml($form);
        } else if (me.selectionType === C.SelectionType.Tenancy) {
            searchPage = 'ManyToMany/TenancySearch';
        }

        me.insertMatchAreasHtml($form);

        new gmgps.cloud.http("manytomany-getMatchList").ajax(
            {
                args: createForm($form, searchPage, true).serialize(),
                dataType: 'json',
                type: 'post',
                url: searchPage,
                background: true, // dont display alto spinner blocking layer
                async: true
            },
            function (response) {
                var count = parseInt(response.Data);

                me.$root.find('#manytomany-results-container').show();

                var $container = me.$root.find('#manytomany-count');
                $container.html('Total Found: {0}'.format(count));
                $container.show('highlight', { color: '#CB955B' }, 500);

                if (count > 0) {
                    me.$window
                        .find('.bottom .buttons .view-button')
                        .removeClass('disabled');
                }
            }
        );
    },

    insertMatchAreasHtml: function ($form) {
        var me = this;
        if (me.matchAreasTool) {
            var selectedAreaIds = me.matchAreasTool.getAreaIds();
            var html = '';
            $.each(selectedAreaIds, function (index, areaId) {
                html += '<input type="hidden" name="MatchAreaIds[{0}]" value="{1}"/>'.format(index, areaId);
            });
            $form.append(html);
        }
    },

    insertFeaturesHtml: function ($form) {
        var me = this;
        var html = '';

        var $selectedItems = me.$root.find(
            '.featureitem input[type="checkbox"]:checked'
        );

        $selectedItems.each(function (i, v) {
            html +=
                '<input type="hidden" name="MatchFeatures[{0}].CodeType" value="{1}"/>'.format(
                    i,
                    $(v).attr('data-codetype')
                );
            html +=
                '<input type="hidden" name="MatchFeatures[{0}].InstanceId" value="{1}"/>'.format(
                    i,
                    $(v).val()
                );
        });

        $form.append(html);
    },

    initHandlers: function () {
        var me = this;

        me.initCommon();

        if (me.selectionType === C.SelectionType.Property) {
            me.initProperty();
        } else if (me.selectionType === C.SelectionType.Contact) {
            me.initContact();
        } else if (me.selectionType === C.SelectionType.Tenancy) {
            me.initTenancy();
        }
    },

    initCommon: function () {
        var me = this;

        var allowAdhocCreation = me.matchGroupHandler.allowAdhocCreation;

        me.selectionType = parseInt(me.$root.find('#SelectionType').val(), 10);

        me.$root.find('.placeholder').placeholder();

        me.$root.find('select:not(.opt-standard)').customSelect();

        me.tabColumn = new gmgps.cloud.ui.controls.tabColumn({
            $root: me.$root.find('.tab-column'),
            entityType: 'manytomany'
        });

        me.tabColumn.onTabClicked.handle(function ($item) {
            var id = $item.data('id');

            //Show the detail layer if it's available.
            if (!$item.hasClass('disabled')) {
                me.showDetailLayer({
                    id: id,
                    subId: $item.data('filter')
                });

                var arg = $item.data('arg');
                if (arg) {
                    me.$root.find('a[href="' + arg + '"]').trigger('click'); //todo: qualify this to the layer level.
                }

                $item.removeAttr('arg');
                $item.removeAttr('filter');
            }
        });

        me.triggerGetMatchList = $.debounce(500, false, function (ev) {
            var e = window.event || ev;
            var k = e.charCode || e.keyCode;

            if (e.type === 'keyup' && isControlKeyCode(k)) return;

            me.getMatchList(me);
        });

        // Match triggers
        me.$root.on('change keyup', '.opt-match', function (e) {
            me.$root.find('#manytomany-count').html('Total Found: . . .');
            me.$window
                .find('.bottom .buttons .view-button')
                .addClass('disabled');
            me.triggerGetMatchList(e);
        });

        me.$root.on('ticked', '#match-branches .tickbox', function () {
            me.checkBranchReferralBindings();
        });

        if (allowAdhocCreation) {
            me.$root
                .find('#AccessRights option:not(:selected)')
                .attr('disabled', 'disabled');
            me.$root
                .find('#AccessRights')
                .next('.customStyleSelectBox')
                .addClass('disabled');
            me.$root
                .find('#UserId option:not(:selected)')
                .attr('disabled', 'disabled');
            me.$root
                .find('#UserId')
                .next('.customStyleSelectBox')
                .addClass('disabled');

            me.$root.find('.tab-column .checklist').hide();

            var $actionButton = me.$window.find(
                '.bottom .buttons .action-button'
            );

            me.$viewButton = $(
                '<div class="btn fr grey view-button">View Results</div>'
            );

            $actionButton.after(me.$viewButton);

            me.$viewButton.on('click', function () {
                if ($(this).hasClass('disabled')) return;

                var $form = me.$root.find('.form');

                me.insertFeaturesHtml($form);

                var allowsBulkArchive =
                    $form.find('#Archivable').prop('checked') === true;
                var allowsBulkDelete =
                    $form.find('#BulkDeletable').prop('checked') === true;

                if (allowsBulkArchive || allowsBulkDelete) {
                    showDialog({
                        type: 'info',
                        title: 'Bulk Actions',
                        msg: 'Bulk actions have been selected. The match group must be saved first.',
                        buttons: {
                            OK: function () {
                                $(this).dialog('close');
                                return false;
                            }
                        }
                    });
                } else {
                    me.matchGroupHandler.saveMatchGroup(
                        true,
                        me.$root.find('.form'),
                        function () {
                            me.cfg.closeMyWindow();
                        }
                    );
                }
            });
        }
    },

    checkBranchReferralBindings: function () {
        var me = this;

        var branches = me.$root.find('#match-branches .tickbox');
        var branchesChecked = branches.filter('.ticked');
        var branchesReferralEnabled = branches.filter('[data-referral="True"]');
        var branchesCheckedReferralEnabled = branchesChecked.filter(
            '[data-referral="True"]'
        );

        var noFilterButHasReferralBranches =
            branchesChecked.length === 0 && branchesReferralEnabled.length > 0;
        var hasReferralBranchesChecked =
            branchesCheckedReferralEnabled.length > 0;

        // n.b. We trigger a change event to use logic held in shell to recalc counts...
        var controlFilter = me.$root.find(
            '#match-consent [data-binding="branch-referral"]'
        );
        if (noFilterButHasReferralBranches || hasReferralBranchesChecked) {
            if (controlFilter.length === 0 && me.relocationAgentNetworkFilter) {
                controlFilter = me.relocationAgentNetworkFilter.appendTo(
                    '#match-consent .checklist .body'
                );
            }

            // Only show if the filter has been expanded and is currently showing all filters
            if (me.$root.find('#match-consent .head .eye.on').length === 0) {
                controlFilter.show();
            }
            controlFilter.find('input:checkbox').trigger('change');
        } else if (controlFilter.length !== 0) {
            me.relocationAgentNetworkFilter = controlFilter.remove();
            me.relocationAgentNetworkFilter
                .find('input:checkbox')
                .prop('checked', false);
            me.$root.find('#match-consent input').trigger('change');
        }
    },

    setupAccessDropdown: function () {
        var me = this;

        var selectedValue = parseInt(me.$root.find('#AccessRights').val(), 10);

        switch (selectedValue) {
            case C.GroupFilterAccessType.SpecificBranch:
                me.$root.find('.selectedbranch').fadeIn();
                me.$root.find('.selecteduser').hide();
                break;

            case C.GroupFilterAccessType.Private:
                me.$root.find('.selecteduser').fadeIn();
                me.$root.find('.selectedbranch').hide();
                break;

            case C.GroupFilterAccessType.AllBranches:
                me.$root.find('.selecteduser').hide();
                me.$root.find('.selectedbranch').hide();
                break;
        }
        if (selectedValue === C.GroupFilterAccessType.SpecificBranch) {
            //
        } else {
            me.$root.find('.selectedbranch').fadeOut();
        }
    },

    setSupplierChecklistStatus: function () {
        // disable supplier selections if not a chosen category
        var me = this;
        var supplierChecked = me.$root
            .find(
                '#match-category .checklist .body .item .tickbox-hidden[value="4000"]'
            )
            .prop('checked');
        if (supplierChecked) {
            me.enableFilter('match-supplier');
        } else {
            me.disableFilter(
                'match-supplier',
                'Tick Category "supplier" to allow selection'
            );
        }
    },

    enableFilter: function (filterId) {
        var me = this;
        var selector = '#' + filterId;
        me.$root.find(selector).find('.section:last-child').enable(true);
    },

    disableFilter: function (filterId, titleString) {
        var me = this;
        var selector = '#' + filterId;
        var filter = me.$root.find(selector);
        filter
            .find('.section:last-child')
            .css('position', 'relative')
            .disable(0.3, true, false, titleString);
        filter
            .find('.section:last-child input[type="checkbox"]')
            .prop('checked', false)
            .trigger('change');
    },

    setConsentChecklistStatus: function () {
        var me = this;
        var matchCategories = me.$root.find(
            '#match-category .checklist .body .item .tickbox-hidden:checked'
        );
        var clientSelected = matchCategories.filter('[value="1"]:checked');
        if (clientSelected.length === 1) {
            me.enableFilter('match-consent');
        } else {
            me.disableFilter(
                'match-consent',
                'Tick Category "client" to allow selection'
            );
        }
    },

    initProperty: function () {
        var me = this;

        me.setupAccessDropdown();

        me.$root.on('change', '#AccessRights', function () {
            me.setupAccessDropdown();
        });

        me.$root.on(
            'click pseudo-click',
            '.features-tab .vtabs .tab',
            function () {
                $(this).closest('.vtabs').find('.tab').removeClass('on');
                $(this).addClass('on');

                var type = $(this).data('type');
                var $features = me.$root.find(
                    '.features-tab .checklist[data-type="features"]'
                );
                $features.find('.item').hide();
                $features.find('.item[data-type="' + type + '"]').show();
            }
        );

        me.$root.on(
            'changed',
            '.features-tab .checklist[data-type="features"] input',
            function () {
                var type = $(this).closest('.item').attr('data-type');
                var count = me.$root.find(
                    '.features-tab .checklist[data-type="features"] .item[data-type="' +
                        type +
                        '"] input[type="checkbox"]:checked'
                ).length;
                var $counter = me.$root
                    .find('.features-tab .vtabs')
                    .find('.tab.on span');

                if (count === 0) $counter.text(count).removeClass('on');
                else $counter.text(count).addClass('on');

                var total = 0;
                me.$root
                    .find('.features-tab .vtabs .tab span')
                    .each(function (i, v) {
                        total += parseInt($(v).text());
                    });

                me.$root
                    .find('.features-tab .h1[data-type="features"]')
                    .text('Features (' + total + ')');
            }
        );

        me.tabColumn.selectTab('property');

        me.getMatchList(me);
    },

    initContact: function () {
        var me = this;

        me.setupAccessDropdown();

        me.setSupplierChecklistStatus();
        me.setConsentChecklistStatus();

        me.$root.on(
            'change',
            '#match-category .checklist .body .item .tickbox-hidden[value="4000"]',
            function () {
                me.setSupplierChecklistStatus();
            }
        );

        me.$root.on(
            'change',
            '#match-category .checklist .body .item .tickbox-hidden',
            function () {
                me.setConsentChecklistStatus();
            }
        );

        me.$root.on('change', '#AccessRights', function () {
            me.setupAccessDropdown();
        });

        me.tabColumn.selectTab('contact');

        me.getMatchList(me);
    },

    initTenancy: function () {
        var me = this;

        me.setupAccessDropdown();

        me.$root.on('change', '#AccessRights', function () {
            me.setupAccessDropdown();
        });

        me.tabColumn.selectTab('tenancy');

        me.getMatchList(me);
    },

    showDetailLayer: function (args) {
        var me = this;

        if (!me.layerConfigured) {
            me.layerConfigured = new Array();
        }

        me.$root.find('.layers .layer').hide();
        me.$root.find('.layer[data-id="' + args.id + '"]').show();

        me.selectedLayer = args.id;

        switch (args.id) {
            case 'dates':
                if (me.layerConfigured[args.id] == undefined) {
                    me.$root.find('.date-picker').datepicker({
                        changeMonth: true,
                        changeYear: true,
                        dateFormat: 'dd/mm/yy',
                        minDate: new Date(2000, 0, 1),
                        onSelect: function () {
                            me.getMatchList(me);
                        },
                        onClose: function (e) {
                            $(this).val(e);
                            me.getMatchList(me);
                        }
                    });

                    me.layerConfigured[args.id] = true;
                }

                break;

            default:
                break;
        }
    },

    initMatchGroups: function () {
        var me = this;
        me.matchAreasTool = gmgps.cloud.helpers.matchAreas.create({
            $treeElement: me.$root.find('div[data-type="match-areas"]'),
            onChange: function () {
                me.$root.find('#manytomany-count').html('Total Found: . . .');
                me.$window
                    .find('.bottom .buttons .view-button')
                    .addClass('disabled');
                me.triggerGetMatchList(me);
            }
        });
    },

    action: function (onComplete) {
        var me = this;

        var $form = me.$root.find('.form');

        var hasStepThroughGroup =
            $form.find('#HasExistingStepThrough').val() === 'True';

        var isAdhocMatchGroup =
            parseInt($form.find('#SearchId').val()) ===
            C.FactorySearchId.AdhocMatchGroup;

        if ($form.find('#Name').val().trim().length === 0) {
            showDialog({
                type: 'warning',
                title: 'Validation Error',
                msg: 'Please provide a name for the group',
                width: 350,
                buttons: {
                    Ok: function () {
                        $(this).dialog('close');
                    }
                }
            });

            return false;
        }

        var proceedWithSave = function (deleteStepThroughGroup) {
            $form
                .find('#DeleteExistingStepThrough')
                .val(deleteStepThroughGroup ? 'True' : 'False');

            me.insertFeaturesHtml($form);

            me.matchGroupHandler.saveMatchGroup(false, $form, onComplete);
        };

        if (
            hasStepThroughGroup === true &&
            me.matchGroupHandler.allowAdhocCreation === true &&
            !isAdhocMatchGroup
        ) {
            showDialog({
                type: 'question',
                title: 'This match group has a pinned list ?',
                msg: 'This match group has a pinned list. Would you like to keep the existing pinned list ?',
                buttons: {
                    'Yes - Keep the pinned list': function () {
                        $(this).dialog('close');
                        proceedWithSave(false);
                    },
                    'No - Delete the pinned list': function () {
                        $(this).dialog('close');
                        proceedWithSave(true);
                    },
                    Cancel: function () {
                        $(this).dialog('close');
                    }
                },
                hideCloseButton: true
            });
        } else {
            proceedWithSave(false);
        }

        return false;
    }
};
