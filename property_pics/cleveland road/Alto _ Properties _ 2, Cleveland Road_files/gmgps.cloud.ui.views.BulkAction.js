gmgps.cloud.ui.views.BulkAction = function (args) {
    var me = this;

    var isNotSet = function (property) {
        return property === undefined || property === null;
    };

    if (isNotSet(args.actionName)) {
        throw 'actionName is not set';
    }

    if (isNotSet(args.typeName)) {
        throw 'typeName is not set';
    }

    me.actionName = args.actionName;
    me.typeName = args.typeName;
    me.maximumItems = args.maximumItems || 500;
    me.url = args.url || '/{0}/Bulk{1}'.format(me.typeName, me.actionName);
    me.getSuccessAndErrorMessages =
        args.getSuccessAndErrorMessages ||
        function () {
            return {
                successText: '',
                errorText: ''
            };
        };
    me.isReversible = args.isReversible || false;
    me.httpUtility =
        args.httpUtility || new gmgps.cloud.http("BulkAction-BulkAction");

    return true;
};

gmgps.cloud.ui.views.BulkAction.prototype = {
    action: function (list, search, onAction) {
        var me = this;

        var numberOfSelectedItems = 0;
        var actualNumberOfSelectedItems = 0;
        var evaluatedIds = [];

        var dialogTitle = 'Bulk {0} - {1}s'.format(me.actionName, me.typeName);

        var spinner;

        var doAction = function () {
            me.httpUtility.ajax(
                {
                    args: evaluatedIds,
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    background: true,
                    url: me.url
                },
                function (response) {
                    spinner.hide();

                    var successAndErrorMessages = me.getSuccessAndErrorMessages(
                        response.Data
                    );

                    var message = successAndErrorMessages.errorText
                        ? '{0} <br /> {1}'.format(
                              successAndErrorMessages.successText,
                              successAndErrorMessages.errorText
                          )
                        : successAndErrorMessages.successText;

                    if (onAction) {
                        onAction();
                    }

                    showDialog({
                        type: 'info',
                        title: dialogTitle,
                        msg: message,
                        buttons: {
                            OK: function () {
                                $(this).dialog('close');
                            }
                        }
                    });
                }
            );
        };

        var checkSelection = function () {
            var dfd = $.Deferred();

            var actionName = me.actionName.toLowerCase();

            var msg;
            if (actualNumberOfSelectedItems > me.maximumItems) {
                msg =
                    'You opted to {0} {1} records. You can only {0} a maximum of {2} at once.<br />Are you sure you would like to {0} {2} records?'.format(
                        actionName,
                        actualNumberOfSelectedItems,
                        me.maximumItems
                    );
            } else {
                msg =
                    'Are you sure you would like to {0} {1} record{2}?'.format(
                        actionName,
                        numberOfSelectedItems,
                        numberOfSelectedItems === 1 ? '' : 's'
                    );
            }

            showDialog({
                type: 'question',
                title: dialogTitle,
                msg: msg,
                create: function (event) {
                    var buttons = $(event.target)
                        .closest('.ui-dialog')
                        .find('.ui-dialog-buttonset button');
                    buttons
                        .first()
                        .attr('disabled', 'disabled')
                        .addClass('disabled');

                    setTimeout(function () {
                        buttons
                            .first()
                            .removeAttr('disabled')
                            .removeClass('disabled');
                    }, 5000);
                },
                buttons: {
                    Yes: function () {
                        $(this).dialog('close');
                        spinner = showSpinner();
                        dfd.resolve();
                    },
                    No: function () {
                        $(this).dialog('close');
                        dfd.reject();
                    }
                }
            });

            return dfd.promise();
        };

        var evaluateSelection = function (search) {
            var dfd = $.Deferred();

            var selectedIds = list.ids;
            var idsAreExcludedItems =
                list.selectionMode == C.ListSelectionMode.All &&
                selectedIds.length > 0;

            numberOfSelectedItems =
                list.selectionMode == C.ListSelectionMode.All
                    ? list.totalRows - selectedIds.length
                    : selectedIds.length;
            actualNumberOfSelectedItems = numberOfSelectedItems;
            if (actualNumberOfSelectedItems > me.maximumItems) {
                numberOfSelectedItems = me.maximumItems;

                if (list.selectionMode != C.ListSelectionMode.All) {
                    selectedIds.length = me.maximumItems;
                }
            }

            if (list.selectionMode !== C.ListSelectionMode.All) {
                evaluatedIds = selectedIds;
                dfd.resolve();
                return dfd.promise();
            }

            var search_data = _.cloneDeep(search);
            search_data.ids = selectedIds;
            search_data.excludeIds = idsAreExcludedItems;
            search_data.SearchPage = {
                Size: numberOfSelectedItems,
                Index: 1
            };

            spinner = showSpinner();

            $.ajax({
                type: 'POST',
                url: '/Bulk{0}/get{1}ids'.format(me.actionName, me.typeName),
                data: JSON.stringify(search_data),
                contentType: 'application/json',
                processData: false,
                dataType: 'json',
                headers: {
                    'X-Component-Name': 'BulkAction-evaluateSelection',
                    'Alto-Version': alto.version
                },
                success: function (response) {
                    spinner.hide();
                    evaluatedIds = response.Data;
                    dfd.resolve();
                },
                error: function (jqXHR, textStatus, errorThrown) {
                    spinner.hide();
                    console.log(
                        'Cannot mark contacts for bulk delete. Failed with status {0} ({1}).'.format(
                            jqXHR.status,
                            errorThrown
                        )
                    );
                    dfd.reject();
                }
            });

            return dfd.promise();
        };

        $.when(evaluateSelection(search)).then(checkSelection).then(doAction);
    }
};
