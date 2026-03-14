'use strict';

gmgps.cloud.accounting.RentalCalculator = {
    parseRent: function (rentAmountValue) {
        return typeof rentAmountValue === 'number'
            ? rentAmountValue
            : parseFloat(rentAmountValue.replace(/[^\d.]/g, ''));
    },

    calculateMaxPermittedDeposit: function (weeklyRent) {
        var rentIsBelow50KPerYear = parseFloat(weeklyRent) * 52 < 50000;
        var maxPermitted = rentIsBelow50KPerYear
            ? weeklyRent * 5
            : weeklyRent * 6;

        return maxPermitted;
    },

    calculateRentPerWeek: function (frequencyValue, rentAmountValue) {
        var me = this;

        var rent = me.parseRent(rentAmountValue);

        if (isNaN(rent) || rent === 0) {
            return 0;
        }

        var freq = parseInt(frequencyValue);
        if (freq === C.Frequency.Weekly) {
            return rent;
        }

        var multiple = me.getRentMultiple(freq);

        var rentPerWeek = new Decimal(rent).mul(multiple).div(52);
        return rentPerWeek;
    },

    calculateRentPerMonth: function (frequencyValue, rentAmountValue) {
        var me = this;

        var rent = me.parseRent(rentAmountValue);

        if (isNaN(rent) || rent === 0) {
            return 0;
        }

        var freq = parseInt(frequencyValue);
        if (freq === C.Frequency.Monthly) {
            return rent;
        }

        var multiple = me.getRentMultiple(freq);

        var rentPerMonth = new Decimal(rent).mul(multiple).div(12);
        return rentPerMonth;
    },

    getRentMultiple: function (freq) {
        var multiple = 0;
        switch (freq) {
            case C.Frequency.AdHoc:
                multiple = 0;
                break;
            case C.Frequency.Daily:
                multiple = 365;
                break;
            case C.Frequency.Weekly:
                multiple = 52;
                break;
            case C.Frequency.Fortnightly:
                multiple = 52 / 2;
                break;
            case C.Frequency.FourWeekly:
                multiple = 52 / 4;
                break;
            case C.Frequency.Monthly:
            case C.Frequency.MonthlyOnLastDay:
                multiple = 12;
                break;
            case C.Frequency.Quarterly:
            case C.Frequency.QuarterlyOnQuarterDays:
                multiple = 4;
                break;
            case C.Frequency.HalfYearly:
            case C.Frequency.HalfYearlyOnQuarterDays:
                multiple = 2;
                break;
            case C.Frequency.Yearly:
                multiple = 1;
                break;
        }

        return multiple;
    },

    roundDownDeposit: function (deposit) {
        return (Math.floor(deposit * 100) / 100).toFixed(2);
    }
};
