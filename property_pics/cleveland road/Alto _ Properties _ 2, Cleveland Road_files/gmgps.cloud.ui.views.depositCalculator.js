'use strict';

gmgps.cloud.ui.views.depositCalculator = function (args) {
    var me = this;
    me.cfg = args;
    me.$root = args.$root;
    me.$window = null;

    me.init();

    return true;
};

gmgps.cloud.ui.views.depositCalculator.prototype = {
    init: function () {
        var me = this;

        me.calcDeposit();

        me.$root.on('input', '#deposit-calculator-period-length', function () {
            me.calcDeposit();
        });

        me.$root.on('input', '#deposit-calculator-period', function () {
            me.calcDeposit();
        });
    },

    calcDeposit: function () {
        var me = this;

        var dcv = me.$root.find('#deposit-calculator-value');
        var weeklyPeriod =
            me.$root.find('#deposit-calculator-period')[0].selectedIndex == 0;
        var length = me.$root.find('#deposit-calculator-period-length').val();

        var weeklyRent = me.$root.find('#WeeklyRent').val();
        var monthlyRent = me.$root.find('#MonthlyRent').val();
        var currencySymbol = me.$root.find('#CurrencySymbol').val();

        var deposit;

        if (weeklyPeriod) {
            deposit = length * weeklyRent;
        } else {
            deposit = length * monthlyRent;
        }

        deposit =
            gmgps.cloud.accounting.RentalCalculator.roundDownDeposit(deposit);

        me.$root.find('#CalculatedDeposit').val(deposit);
        dcv[0].innerHTML = currencySymbol + deposit;
    },

    action: function (onComplete) {
        var me = this;

        var calculatedDeposit = me.$root.find('#CalculatedDeposit');

        me.cfg.callback(calculatedDeposit.val());
        me.cfg.closeMyWindow();
        onComplete(true);
        return true;
    }
};
