gmgps.cloud.ui.views.termsHandler = function (args) {
    var me = this;

    me.setDirty = args.dirtyHandler;
    me.cfg = args;
    me.$root = args.$root;

    me.init(args);

    return true;
};

gmgps.cloud.ui.views.termsHandler.prototype = {
    init: function () {
        var me = this;

        me.initHandlers();
    },

    expandTermDetail: function (termNumber) {
        var me = this;

        var $row = me.$root.find(
            '.detail-container .item[data-termnumber="' + termNumber + '"]'
        );

        if ($row.hasClass('selected')) {
            $row.next().slideUp('fast', function () {
                $row.removeClass('selected');
            });
        } else {
            // slide up any other open rows
            var $otherRows = $row
                .closest('.detail-container')
                .find('.opt-u .item')
                .not($row);

            $otherRows.next().slideUp('fast', function () {
                $otherRows.removeClass('selected');
            });

            $row.addClass('selected');
            $row.next().slideDown('fast');
        }
    },

    initHandlers: function () {
        var me = this;

        me.$root.off();

        me.$root.on('click', '.btn.renew-tenancy:not(.disabled)', function () {
            var id = parseInt(me.$root.find('#LatestTerm_Tenancy_Id').val());
            var newStatus = C.TenancyStatus.Renewal;

            me.checkIfRequiredToDisplayDepositDialog(newStatus, id).then(
                function (displayDialog) {
                    if (displayDialog) {
                        var dialogData = me.getDepositWarningDialogTitles();

                        showDialog({
                            type: dialogData.DialogType,
                            title: dialogData.Title,
                            msg: dialogData.Message,
                            buttons: {
                                Continue: function () {
                                    $(this).dialog('close');
                                    gmgps.cloud.helpers.tenancy.changeTenancyStatus(
                                        id,
                                        newStatus
                                    );
                                },
                                Cancel: function () {
                                    $(this).dialog('close');
                                }
                            }
                        });
                    } else {
                        gmgps.cloud.helpers.tenancy.changeTenancyStatus(
                            id,
                            newStatus
                        );
                    }
                }
            );
        });

        me.$root.on(
            'click',
            '.btn.change-periodic:not(.disabled)',
            function () {
                var id = parseInt(
                    me.$root.find('#LatestTerm_Tenancy_Id').val()
                );
                var newStatus = C.TenancyStatus.Periodic;

                me.checkIfRequiredToDisplayDepositDialog(newStatus, id).then(
                    function (displayDialog) {
                        if (displayDialog) {
                            var dialogData = me.getDepositWarningDialogTitles();

                            showDialog({
                                type: dialogData.DialogType,
                                title: dialogData.Title,
                                msg: dialogData.Message,
                                buttons: {
                                    Continue: function () {
                                        $(this).dialog('close');
                                        gmgps.cloud.helpers.tenancy.changeTenancyStatus(
                                            id,
                                            newStatus
                                        );
                                    },
                                    Cancel: function () {
                                        $(this).dialog('close');
                                    }
                                }
                            });
                        } else {
                            gmgps.cloud.helpers.tenancy.changeTenancyStatus(
                                id,
                                newStatus
                            );
                        }
                    }
                );
            }
        );

        me.$root.on(
            'click',
            '.btn.vacate-property:not(.disabled)',
            function () {
                var id = parseInt(
                    me.$root.find('#LatestTerm_Tenancy_Id').val()
                );
                gmgps.cloud.helpers.tenancy.changeTenancyStatus(
                    id,
                    C.TenancyStatus.Vacate
                );
            }
        );

        //Edit Tenancy Button > Click
        me.$root.on('click', '.btn.edit-tenancy:not(.disabled)', function () {
            var id = parseInt(me.$root.find('#LatestTerm_Tenancy_Id').val());
            gmgps.cloud.helpers.tenancy.editTenancy(id, true, false, false);
        });

        me.$root.on('click', '.detail-container .item', function () {
            var $row = $(this);

            me.expandTermDetail(parseInt($row.data('termnumber')));
        });

        me.$root.on('click', '.detail-container .progress .btn', function () {
            var $this = $(this);
            var eventId = parseInt($this.attr('data-historyeventid'));

            gmgps.cloud.helpers.property.gotoProgression({
                $row: $(
                    '<span data-modelType="{0}"></span>'.format(
                        C.ModelType.ChainLink
                    )
                ),
                id: 0,
                recordType: C.PropertyRecordType.Rent,
                secondaryId: eventId
            });

            //prevent propagation
            return false;
        });
    },

    checkIfRequiredToDisplayDepositDialog: function (newStatus, tenancyId) {
        var $deferred = $.Deferred();

        if (
            newStatus == C.TenancyStatus.Renewal ||
            newStatus == C.TenancyStatus.Periodic
        ) {
            new gmgps.cloud.http(
                "termsHandler-checkIfRequiredToDisplayDepositDialog"
            ).ajax(
                {
                    args: {
                        tenancyId: tenancyId
                    },
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: '/tenancy/GetTenancyDepositHeldWarning'
                },
                function (response) {
                    $deferred.resolve(response.Data);
                },
                function () {
                    $deferred.resolve(false);
                }
            );
        } else {
            return $deferred.resolve(false);
        }

        return $deferred.promise();
    },

    getDepositWarningDialogTitles: function () {
        var me = this;

        var weeklyRent = parseFloat(me.$root.find('#WeeklyRent').val());
        var maxDeposit =
            gmgps.cloud.accounting.RentalCalculator.calculateMaxPermittedDeposit(
                weeklyRent
            );
        var symbol = me.$root.find('#CurrencySymbol').val();

        var depositOnlyMessage =
            'In accordance with the Tenant Fees Act 2019, and based on the rent amount recorded on the tenancy details, you should not hold more than ' +
            symbol +
            gmgps.cloud.accounting.RentalCalculator.roundDownDeposit(
                maxDeposit
            ) +
            ' total deposit for this tenancy. Do you wish to continue?';

        var dialogData = {
            Title: 'Tenant Fees Act 2019',
            Message: depositOnlyMessage,
            DialogType: 'warning'
        };

        return dialogData;
    }
};
