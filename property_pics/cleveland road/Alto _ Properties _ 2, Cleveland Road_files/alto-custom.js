function validateChargeFeeTermLength(field, rules, i, options) {
    var thisFieldValue = parseInt(field.val());
    var otherTermValue = parseInt(
        field
            .closest('.fields')
            .find('#' + rules[i + 2])
            .val()
    );

    if (thisFieldValue + otherTermValue === 0) {
        return 'Please supply a term length';
    }
}

function validateAgreedOfferTermLength(field, rules, i, options) {
    var thisFieldValue = parseInt(field.val());
    var otherTermValue = parseInt(
        field
            .closest('.agreedoffer-let-status-change')
            .find('#' + rules[i + 2])
            .val()
    );

    if (thisFieldValue + otherTermValue === 0) {
        return 'Please supply a term length';
    }
}

function validateTermLength(field, rules, i, options) {
    if (field.prop('readonly')) return true;

    var thisFieldValue = parseInt(field.val()) || 0;
    var otherTermValue =
        parseInt(
            field
                .closest('.edit-tenancy')
                .find('#' + rules[i + 2])
                .val()
        ) || 0;

    if (isNaN(thisFieldValue)) {
        return 'Please supply a term length';
    }

    if (isNaN(otherTermValue)) {
        return 'Please supply a term length';
    }

    if (thisFieldValue > 12 || thisFieldValue < 0) {
        return 'Term months can be 0-12 only';
    }

    if (otherTermValue > 99 || otherTermValue < 0) {
        return 'Term years can be 0-99 only';
    }

    if (thisFieldValue + otherTermValue === 0) {
        return 'Please supply a term length';
    }

    return true;
}

function validateCurrencyNonZero(field, rules, i, options) {
    if (field.prop('readonly') || field.prop('no_readonly_null')) return true;

    if (field.asNumber() == 0) {
        rules.push('required');
        return 'Value must be greater than zero';
    }
}

// Validates that the proposed rental amount does not exceed the property's rental price
// by converting both to a per week basis for comparison using the rental frequencies.
function validateRentalAmountForAPT(field, rules, i, options) {
    if (field.prop('readonly') || field.prop('no_readonly_null')) return true;

    var propertyPriceFieldId = rules[i + 2];
    var propertyFreqFieldId = rules[i + 3];
    var proposedFreqFieldId = rules[i + 4];

    var $form = field.closest('.edit-tenancy').length ? field.closest('.edit-tenancy') : field.closest('#offer');

    // if property price is less than or equal to zero, skip validation
    var $propertyPriceField = $form.find('#' + propertyPriceFieldId);
    if (!$propertyPriceField.length) {
        $propertyPriceField = $('#' + propertyPriceFieldId);
    }
    var propertyRentalPrice = parseFloat($propertyPriceField.val()) || 0;
    if (propertyRentalPrice <= 0) {
        return true;
    }
    
    var $propertyFreqField = propertyFreqFieldId ? $form.find('#' + propertyFreqFieldId) : $();
    if (propertyFreqFieldId && !$propertyFreqField.length) {
        $propertyFreqField = $('#' + propertyFreqFieldId);
    }

    var $proposedFreqField = proposedFreqFieldId ? $form.find('#' + proposedFreqFieldId) : $();
    if (proposedFreqFieldId && !$proposedFreqField.length) {
        $proposedFreqField = $('#' + proposedFreqFieldId);
    }

    if (!$propertyPriceField.length || !$propertyFreqField.length || !$proposedFreqField.length) {
        return true;
    }

    var propertyRentalFreq = parseInt($propertyFreqField.val(), 10);

    var proposedRent = parseFloat(field.asNumber()) || 0;
    var proposedFreq = parseInt($proposedFreqField.val(), 10);

    var propertyRentPerWeek = new Decimal(gmgps.cloud.accounting.RentalCalculator.calculateRentPerWeek(propertyRentalFreq, propertyRentalPrice));
    var proposedRentPerWeek = new Decimal(gmgps.cloud.accounting.RentalCalculator.calculateRentPerWeek(proposedFreq, proposedRent));

    if (propertyRentPerWeek <= 0) {
        return true;
    }

    if (proposedRentPerWeek.gt(propertyRentPerWeek)) {
        return 'Proposed rent per week cannot exceed the property rental price per week (property: ' + String.fromCharCode(163) + propertyRentPerWeek.toFixed(2) + ' per week).';
    }

    return true;
}

function validateSelectNonZero(field, rules, i, options) {
    if (field.prop('readonly')) return true;

    if (field.asNumber() == 0) {
        return 'Please supply a value';
    }
}

function nonPMInstalledAPTRentalAmountValidation(field, rules, i, options) {
    var proposedFreqId = rules[i + 3];
    var propertyPriceId = rules[i + 4];
    var propertyFreqId = rules[i + 5];

    var getVal = function (id) {
        var selector = id.startsWith('#') ? id : '#' + id;
        return $(selector).val();
    };

    var propertyPrice = parseFloat(getVal(propertyPriceId)) || 0;
    var propertyFrequency = parseInt(getVal(propertyFreqId), 10) || 0;
    var proposedFrequency = parseInt(getVal(proposedFreqId), 10) || 0;

    var proposedRent = field.asNumber ? field.asNumber() : parseFloat(field.val()) || 0;

    if (propertyPrice <= 0) return true;

    var calc = gmgps.cloud.accounting.RentalCalculator;
    var propertyRentPerWeek = new Decimal(calc.calculateRentPerWeek(propertyFrequency, propertyPrice));
    var proposedRentPerWeek = new Decimal(calc.calculateRentPerWeek(proposedFrequency, proposedRent));

    if (proposedRentPerWeek.gt(propertyRentPerWeek)) {
        return 'Proposed rent per week cannot exceed the property rental price per week (property: ' + String.fromCharCode(163) + propertyRentPerWeek.toFixed(2) + ' per week).';
    }

    return true;
}
