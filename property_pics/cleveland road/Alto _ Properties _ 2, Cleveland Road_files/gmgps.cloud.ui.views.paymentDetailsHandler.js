((function() {
    gmgps.cloud.ui.views.paymentDetailsHandler = PaymentDetailsHandler;

    function PaymentDetailsHandler(args) {
        var me = this;

        me.linkedId = args.linkedId;
        me.linkedTypeId = args.linkedTypeId;
        me.$root = args.$root;
        me.setDirty = args.dirtyHandler;
        me.currencySymbol = me.$root.find('#CurrencySymbol').val();
        me.init();
        return me;
    }

    $.extend(PaymentDetailsHandler.prototype, {
        init: function () {
            this.initEventHandlers();
            this.initControls();
        },
        initEventHandlers: function () {
            var namespace = '.paymentdetailshandler';
            this.$root.off(namespace);
            this.$root.on(
                'change' + namespace,
                '.in-retainall',
                this,
                updateRetainAllInput
            );
        },
        initControls: function () {
            this.$root.find('.opt-currency').inputmask('currency', {
                radixPoint: '.',
                groupSeparator: ',',
                digits: 2,
                autoGroup: true,
                prefix: this.currencySymbol,
                rightAlign: false,
                allowMinus: true
            });
        }
    });

    function updateRetainAllInput(e) {
        var me = e.data;
        me.$root
            .find('.in-retention-target')
            .prop('disabled', e.target.checked);
    }
}))();
