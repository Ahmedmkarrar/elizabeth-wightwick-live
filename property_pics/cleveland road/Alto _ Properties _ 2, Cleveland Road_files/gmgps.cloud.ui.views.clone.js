gmgps.cloud.ui.views.clone = function (args) {
    var me = this;
    me.$root = args.$root;
    me.srcRecordType = args.data.srcRecordType;
    me.srcArchived = args.data.srcArchived;
    me.nameNoChecked = true;

    me.init(args);
};

gmgps.cloud.ui.views.clone.prototype = {
    init: function () {
        var me = this;

        if (!me.srcArchived) {
            me.checkNameNo();

            me.$root.on(
                'click',
                'input:radio[name=TargetRecordType]',
                function () {
                    me.checkNameNo();
                }
            );

            me.$root.on('click', '#CopyAddressNameNo', function () {
                me.nameNoChecked = $(this).prop('checked') === true;
            });
        }
    },

    checkNameNo: function () {
        var me = this;
        var targetType = me.$root
            .find('input:radio[name=TargetRecordType]:checked')
            .val();
        var nameNo = me.$root.find('#CopyAddressNameNo');

        if (me.srcRecordType == targetType) {
            nameNo.val(false);
            nameNo.removeAttr('checked');
            nameNo.attr('disabled', 'disabled');
            nameNo.parent().siblings().find('label').addClass('line-through');
        } else {
            nameNo.val(me.nameNoChecked); //do not tick it back for them if they have unticked it
            if (me.nameNoChecked) nameNo.attr('checked', 'checked');
            else nameNo.removeAttr('checked');

            nameNo.removeAttr('disabled');
            nameNo
                .parent()
                .siblings()
                .find('label')
                .removeClass('line-through');
        }

        nameNo.trigger('prog-change');
    }
};
