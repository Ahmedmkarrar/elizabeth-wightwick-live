gmgps.cloud.ui.views.editManagementDatesGroupHandler = function (args) {
    var me = this;
    me.cfg = args;
    me.$root = args.$root;
    me.$window = null;

    me.init(args);

    return true;
};

gmgps.cloud.ui.views.editManagementDatesGroupHandler.prototype = {
    init: function () {
        var me = this;

        me.isNew = me.$root.find('#Group_SearchId').val() === '0';

        me.$window = me.$root.closest('.window');

        me.$root.on('change', '.mandatory-toggle', function () {
            if (me.$root.find('#Group_Attributes_Critical').val() == 'True') {
                $(this).addClass('on');
            }

            me.$root
                .find('#Group_Attributes_Required')
                .val($(this).hasClass('on') ? 'True' : 'False');
        });

        me.$root.on('change', '.critical-toggle', function () {
            me.$root
                .find('#Group_Attributes_Critical')
                .val($(this).hasClass('on') ? 'True' : 'False');

            if (me.$root.find('#Group_Attributes_Critical').val() == 'True') {
                if (
                    me.$root.find('#Group_Attributes_Required').val() == 'False'
                ) {
                    me.$root.find('.mandatory-toggle').trigger('change');
                }
            }
        });

        me.$root.on('change', '.recurring-toggle', function () {
            me.$root.find('.x-recurring').toggle();
        });

        me.$root.find('select').customSelect();

        if (me.isNew) {
            var userSearch = {
                modelType: C.ModelType.Contact,
                includeUsers: true,
                includeContacts: false,
                includeDiaryUserGroups: false,
                QueryMatchOnNameOnly: true,
                displayCompanyName: false
            };
            //Setup Auto-Suggest
            var getUsersASData = function (query, callback) {
                userSearch.query = query;
                gmgps.cloud.helpers.general.getAutoCompleteList(
                    C.ModelType.User,
                    userSearch,
                    callback
                );
            };

            me.$root.find('#negotiatorIds').autoSuggest(getUsersASData, {
                startText: '',
                preFill: [],
                queryParam: 'term',
                minChars: 1,
                canGenerateNewSelections: false,
                selectedValuesProp: 'id',
                selectedItemProp: 'value',
                searchObjProps: 'value',
                selectionAdded: function () {
                    //Remove any validation prompt.
                    me.$root.find('.negotiators').validationEngine('hide');
                },
                selectionRemoved: function (elem) {
                    //Remove element.
                    elem.remove();
                },
                formatList: function (data, elem) {
                    return gmgps.cloud.helpers.general.formatAutoSuggestItem(
                        data,
                        elem
                    );
                }
            });
        }
    },

    action: function (onComplete) {
        var me = this;

        var valid = false;

        //Init validation engine.
        me.$root.addClass('opt-validate').validationEngine({ scroll: false });
        valid = me.$root.validationEngine('validate');

        if (me.isNew) {
            if (me.$root.find('.negotiators .as-selection-item').length == 0) {
                me.$root
                    .find('.negotiators')
                    .validationEngine(
                        'showPrompt',
                        'Please assign at least one negotiator to this group.',
                        'x',
                        'topLeft',
                        true
                    );
                valid = false;
            }
        }

        if (valid) {
            me.updateManagementDate(me.$root).done(function (result) {
                if (result && result.Data) {
                    me.cfg.callback(result.Data);
                    me.cfg.closeMyWindow();
                    onComplete(true);
                    return true;
                }
            });
        }

        return false;
    },

    updateManagementDate: function ($f) {
        var me = this;

        if (me.isNew) {
            $f.find('.negotiators .as-selection-item').map(function (i, v) {
                $f.append(
                    $(
                        '<input type="hidden" value="{0}" name="Group.UserIdList[{1}]" />'.format(
                            $(v).data('value'),
                            i
                        )
                    )
                );
            });
        }
        return new gmgps.cloud.http(
            "editManagementDatesGroupHandler-updateManagementDate"
        ).ajax({
            args: {
                dateGroup: createForm($f).serializeObject()
            },
            complex: true,
            dataType: 'json',
            type: 'post',
            url: '/SavedSearch/UpdateManagementDateGroup'
        });
    }
};
