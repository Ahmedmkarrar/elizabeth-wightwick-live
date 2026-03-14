gmgps.cloud.ui.views.BulkArchiver = function (args) {
    var me = this;

    me.typeName = args.typeName;
    me.url = '/' + args.typeName + '/BulkArchive';

    me.httpUtility =
        args.httpUtility || new gmgps.cloud.http("BulkArchiver-BulkArchiver");

    return true;
};

gmgps.cloud.ui.views.BulkArchiver.typeName =
    'gmgps.cloud.ui.views.BulkArchiver';

gmgps.cloud.ui.views.BulkArchiver.MAXIMUM_ARCHIVABLE_ITEMS = 500;

gmgps.cloud.ui.views.BulkArchiver.prototype = {
    archive: function (list, search, onArchived) {
        var me = this;

        var selectedIds = list.ids;
        var idsAreExcludedItems =
            list.selectionMode == C.ListSelectionMode.All &&
            selectedIds.length > 0;

        var numberOfSelectedItems =
            list.selectionMode == C.ListSelectionMode.All
                ? list.totalRows - selectedIds.length
                : selectedIds.length;
        var actualNumberOfSelectedItems = numberOfSelectedItems;
        if (
            actualNumberOfSelectedItems >
            gmgps.cloud.ui.views.BulkArchiver.MAXIMUM_ARCHIVABLE_ITEMS
        ) {
            numberOfSelectedItems =
                gmgps.cloud.ui.views.BulkArchiver.MAXIMUM_ARCHIVABLE_ITEMS;

            if (list.selectionMode != C.ListSelectionMode.All) {
                selectedIds.length =
                    gmgps.cloud.ui.views.BulkArchiver.MAXIMUM_ARCHIVABLE_ITEMS;
            }
        }

        var dialogTitle = 'Bulk Archive - {0}'.format(
            me.typeName === 'Property' ? 'Properties' : 'Contacts'
        );

        var spinner;

        var bulkArchive = function () {
            me.httpUtility.ajax(
                {
                    args: {
                        ids: selectedIds,
                        excludeIds: idsAreExcludedItems,
                        searchId: search.SearchId,
                        SearchPage: {
                            Size: numberOfSelectedItems,
                            Index: 1
                        },
                        SearchOrder: search.SearchOrder
                    },
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    background: true,
                    url: me.url,
                    listType: C.ListType.Standard
                },
                function (response) {
                    spinner.hide();

                    var successText =
                        '{0} record(s) have been successfully archived.'.format(
                            response.Data.ArchivedCount
                        );
                    var errorText;
                    if (response.Data.UnArchivedCount > 0) {
                        errorText =
                            '{0} record(s) could not be archived.'.format(
                                response.Data.UnArchivedCount
                            );
                    }

                    var message = errorText
                        ? '{0} <br /> {1}'.format(successText, errorText)
                        : successText;

                    if (onArchived) {
                        onArchived();
                    }

                    showDialog({
                        type: 'info',
                        title: 'Bulk Archive - Contacts',
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

        var confirmSelection = function () {
            var dfd = $.Deferred();

            showDialog({
                type: 'question',
                title: dialogTitle,
                msg: '<strong>This action cannot be reversed</strong>, are you sure you want to archive the selected record(s)?',
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

        var checkSelection = function () {
            var dfd = $.Deferred();

            var msg;
            if (
                actualNumberOfSelectedItems >
                gmgps.cloud.ui.views.BulkArchiver.MAXIMUM_ARCHIVABLE_ITEMS
            ) {
                msg =
                    'You opted to archive {0} records. You can only archive a maximum of {1} at once.<br />Are you sure you would like to archive {1} record(s)?'.format(
                        actualNumberOfSelectedItems,
                        gmgps.cloud.ui.views.BulkArchiver
                            .MAXIMUM_ARCHIVABLE_ITEMS
                    );
            } else {
                msg =
                    'Are you sure you would like to archive {0} record(s)?'.format(
                        numberOfSelectedItems
                    );
            }

            showDialog({
                type: 'question',
                title: dialogTitle,
                msg: msg,
                buttons: {
                    Yes: function () {
                        $(this).dialog('close');
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

        checkSelection().then(confirmSelection).then(bulkArchive);
    }
};
