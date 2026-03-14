PasswordValidator = function () {};

PasswordValidator.prototype = {
    validate: function (newPasswordVal) {
        var regxSymbol = /[^0-9a-z]+/gi;
        var regxNumber = /[0-9]+/g;
        var regxUpper = /[A-Z]+/g;
        var regxLower = /[a-z]+/g;

        var valid = {
            length: true,
            upper: true,
            lower: true,
            number: true,
            symbol: true
        };

        if (newPasswordVal.length < 6) {
            valid.length = false;
        }

        if (!regxSymbol.test(newPasswordVal)) {
            valid.symbol = false;
        }
        if (!regxNumber.test(newPasswordVal)) {
            valid.number = false;
        }
        if (!regxUpper.test(newPasswordVal)) {
            valid.upper = false;
        }
        if (!regxLower.test(newPasswordVal)) {
            valid.lower = false;
        }

        return valid;
    }
};
