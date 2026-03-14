gmgps.cloud.ui.views.ImportChargesHandler = function (args) {
    var me = this;
    me.http =
        args.http ||
        new gmgps.cloud.http("ImportChargesHandler-ImportChargesHandler");
    me.$root = args.$root;
    me.container = args.container;
    me.args = args;

    return me;
};

gmgps.cloud.ui.views.ImportChargesHandler.typeName =
    'gmgps.cloud.ui.views.ImportChargesHandler';

gmgps.cloud.ui.views.ImportChargesHandler.prototype = {
    init: function (onComplete) {
        var me = this;
        me.initControls();
        me.refreshClientAccounts();
        me.initEvents();

        if (onComplete) {
            onComplete();
        }
    },

    initControls: function () {
        var me = this;

        gmgps.cloud.helpers.ui.initInputs(me.$root);

        me.$root.find('.date-picker').each(function (i, v) {
            $(v).datepicker({
                numberOfMonths: 2,
                showButtonPanel: true,
                dateFormat: 'dd/mm/yy',
                minDate:
                    $(v).attr('data-datePickerMode') === 'future'
                        ? new Date()
                        : null
            });
        });
    },

    initEvents: function () {
        var me;
        me = this;

        me.$root.on('click', '#startImport', function () {
            if (me.$root.find('#startImport').hasClass('disabled')) {
                return true;
            }

            me.getJupixClientsForGroup();
        });

        me.$root.on('click', '#importReport', function () {
            me.http
                .ajax({
                    args: {},
                    complex: true,
                    type: 'post',
                    url: '/Accounts/ImportReport'
                })
                .done(function (response) {
                    me.$root.hide().html(response.Data);
                    me.$root.show();
                    me.initControls();
                    return response;
                });
        });
    },

    refreshClientAccounts: function (onComplete) {
        var me = this;
        me.refresh().done(function (s) {
            if (onComplete && onComplete instanceof Function) {
                onComplete(me);
            }
            return s;
        });
    },

    refresh: function () {
        var me = this;

        return me.http
            .ajax({
                args: me.args,
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/Accounts/GetNewImportLayer'
            })
            .done(function (response) {
                me.$root.hide().html(response.Data);
                me.$root.show();
                me.initControls();
                return response;
            });
    },

    getJupixClientsForGroup: function () {
        var me = this;
        var allowToImport = me.$root.find('#AllowToImport').val();
        var importFileStatus = parseInt(
            me.$root.find('#ImportFileStatus').val()
        );
        var importStartDate = me.$root.find('#ImportStartDate').val();
        var datePickerStartDate = me.$root.find('.date-picker').val();

        if (!Date.parse(datePickerStartDate)) {
            showInfo('Invalid date. Please try to select again.');
            return false;
        }

        if (
            Date.parse(datePickerStartDate).setHours(0, 0, 0, 0) -
                Date.parse(new Date()).setHours(0, 0, 0, 0) <
            0
        ) {
            showInfo('Invalid date. Date cannot be in the past.');
            return false;
        }

        if (allowToImport == 'False') {
            showInfo(
                'Unfortunately this option is currently unavailable. Please contact our Support team for more information.'
            );
            me.$root.find('#startImport').addClass('disabled');
            return false;
        }

        if (
            importFileStatus &&
            importFileStatus <= C.ImportFileStatus.Imported
        ) {
            var status = Object.keys(C.ImportFileStatus).find(
                (k) => C.ImportFileStatus[k] === importFileStatus
            );
            showInfo(
                'Your import has been already started on the ' +
                    importStartDate +
                    '. Current status: ' +
                    status
            );
            me.$root.find('#startImport').addClass('disabled');
            return false;
        }

        var confirmStartingImport = function () {
            var dialogTitle = 'Import Charges';
            var msg =
                'Are you sure you would like to import rent and commission charges with a start date of {0}?'.format(
                    datePickerStartDate
                );

            showDialog({
                type: 'question',
                title: dialogTitle,
                msg: msg,
                buttons: {
                    Yes: function () {
                        me.$root.find('#startImport').addClass('disabled');
                        me.$root
                            .find('#ImportStartDate')
                            .val(datePickerStartDate);
                        me.importCharges(datePickerStartDate);
                        $(this).dialog('close');
                    },
                    No: function () {
                        $(this).dialog('close');
                    }
                }
            });
        };

        confirmStartingImport();
    },

    importCharges: function (datePickerStartDate) {
        var me = this;

        me.http
            .ajax({
                args: {
                    startDate: datePickerStartDate
                },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/Accounts/ImportCharges'
            })
            .done(function () {
                showInfo(
                    'We’re collecting your data from Jupix. We’ll let you know when the import is complete'
                );
            });
    }
};
