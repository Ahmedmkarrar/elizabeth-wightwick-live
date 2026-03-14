gmgps.cloud.ui.views.transferProperty = function (args) {
    var me = this;
    me.$root = args.$root;
    me.gotoPropertyHandler =
        args && args.data ? args.data.gotoPropertyHandler : undefined;
    me.init(args);
    me.closeMyWindow = args.closeMyWindow;
    return this;
};

gmgps.cloud.ui.views.transferProperty.prototype = {
    init: function () {
        var me = this;

        me.$root.find('select').customSelect();
    },

    action: function (onComplete) {
        var me = this;
        var branchName = me.$root.find('#BranchId option:selected').text();
        var branchId = parseInt(me.$root.find('#BranchId').val());
        var originalBranchId = parseInt(
            me.$root.find('#OriginalBranchId').val()
        );

        //Check that the branch is different.
        if (branchId == originalBranchId) {
            showInfo(
                'This property is already owned by the {0} branch.'.format(
                    branchName
                )
            );
            return false;
        }

        showDialog({
            type: 'question',
            title: 'Transfer Property',
            msg: 'Are you sure you would like to move this property to the {0} branch?'.format(
                branchName
            ),
            buttons: {
                Yes: function () {
                    new gmgps.cloud.http("transferProperty-Yes").ajax(
                        {
                            args: {
                                propertyId: parseInt(
                                    me.$root.find('#PropertyId').val()
                                ),
                                branchId: parseInt(
                                    me.$root.find('#BranchId').val()
                                ),
                                notes: me.$root.find('#Notes').val()
                            },
                            complex: true,
                            dataType: 'json',
                            type: 'post',
                            url: '/Property/TransferProperty'
                        },
                        function (response) {
                            if (response.Data) {
                                me.gotoPropertyHandler();
                            }
                            onComplete();
                        }
                    );

                    $(this).dialog('close');
                },
                No: function () {
                    $(this).dialog('close');
                }
            }
        });
    }
};
