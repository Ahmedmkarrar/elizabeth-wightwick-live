gmgps.cloud.ui.views.receiptImportsFuzzyMatcher = (function () {
    var isFuzzyMatchRunning = false;

    // eslint-disable-next-line no-unused-vars
    var isMatchSelectionValid = function (
        $checkedMatchElements
    ) {
        var validationMessages = [];
        var $validationMessageContainer = $('#fuzzyMatchValidationMessages');
        $validationMessageContainer.empty();

        if ($checkedMatchElements.length === 0) {
            validationMessages.push('One or more matches must be ticked');
        } else {
            if ($checkedMatchElements.length > 1) {
                var recordId = $checkedMatchElements
                    .filter(':first')
                    .data('recordid');
                var recordType = $checkedMatchElements
                    .filter(':first')
                    .data('recordtype');
                var areMatchesForSameTenancyOrContact = true;
                for (var j = 0; j < $checkedMatchElements.length; j++) {
                    var $selectedMatch = $($checkedMatchElements[j]);
                    var recordIdToCheck = $selectedMatch.data('recordid');
                    var recordTypeToCheck = $selectedMatch.data('recordtype');
                    if (
                        recordIdToCheck !== recordId ||
                        recordTypeToCheck !== recordType
                    ) {
                        areMatchesForSameTenancyOrContact = false;
                    }
                }
                if (!areMatchesForSameTenancyOrContact) {
                    validationMessages.push(
                        'Selected matches must all be for the same tenancy or contact'
                    );
                }
            }
        }

        for (var i = 0; i < validationMessages.length; i++) {
            $validationMessageContainer.append(
                '<li>' + validationMessages[i] + '</li>'
            );
        }
        return validationMessages.length === 0;
    };

    var ajaxCallForReplacementRowForChargeWithMatchedItems = function (
        $checkedMatchElements,
        receiptDetails
    ) {
        var recordType = $checkedMatchElements.data('recordtype');
        var recordId = $checkedMatchElements.data('recordid');
        var heldMoniesMatchValue = null;
        var matchedCharges = [];
        for (var i = 0; i < $checkedMatchElements.length; i++) {
            var chargeId = Number($($checkedMatchElements[i]).data('chargeid'));
            var chargeMatchValue = Number(
                $($checkedMatchElements[i]).data('matchvalue')
            );
            if (chargeId === 0) {
                //allocated as held monies
                heldMoniesMatchValue = $checkedMatchElements.data('matchvalue');
            } else {
                var amountAllocatedToCharge = Decimal(
                    $($checkedMatchElements[i]).data('amountallocated')
                ).toFixed(2);
                matchedCharges.push({
                    ChargeId: chargeId,
                    AllocatedAmount: amountAllocatedToCharge,
                    MatchValue: chargeMatchValue
                });
            }
        }

        return new gmgps.cloud.http(
            "fuzzyMatcher-receiptImportsFuzzyMatcher"
        ).ajax({
            args: {
                AccountId: receiptDetails.accountId,
                ReceiptId: receiptDetails.receiptId,
                RecordType: recordType,
                RecordId: recordId,
                MatchedCharges: matchedCharges,
                HeldMoniesMatchValue: heldMoniesMatchValue
            },
            complex: true,
            dataType: 'json',
            type: 'post',
            url: '/Accounts/GetFuzzyMatchesSelectedItems'
        });
    };

    var setRemainingHeldMonies = function ($fuzzyMatchRow, receiptDetails) {
        var $checkedMatchElements = $fuzzyMatchRow.find(
            '.checkboxCell input:checked'
        );
        if ($checkedMatchElements.length === 0) {
            $fuzzyMatchRow.find('.remainingAmountToHeldFunds').hide();
            return;
        }
        var amountRemaining = Decimal(receiptDetails.receiptAmount);
        for (var i = 0; i < $checkedMatchElements.length; i++) {
            amountRemaining = amountRemaining.minus(
                Decimal($($checkedMatchElements[i]).data('amountallocated'))
            );
        }
        if (amountRemaining > 0) {
            $fuzzyMatchRow
                .find('.remainingAmountToHeldFunds .amountCell')
                .text('£' + amountRemaining.toFixed(2));
            $fuzzyMatchRow
                .find('.remainingAmountToHeldFunds .allocatedAmountCell')
                .text('£' + amountRemaining.toFixed(2));
            $fuzzyMatchRow.find('.remainingAmountToHeldFunds').show();
        } else {
            $fuzzyMatchRow.find('.remainingAmountToHeldFunds').hide();
        }
    };

    var calculateAmountToAllocate = function (
        $changedCheckbox,
        $fuzzyMatchRow,
        receiptDetails
    ) {
        if (!$changedCheckbox.is(':checked')) {
            return Decimal(0);
        }

        var amountAlreadyAllocated = Decimal(0);
        var $alreadyCheckedMatchElements = $fuzzyMatchRow
            .find('.checkboxCell input:checked')
            .not($changedCheckbox);
        for (var i = 0; i < $alreadyCheckedMatchElements.length; i++) {
            amountAlreadyAllocated = amountAlreadyAllocated.add(
                Decimal(
                    $($alreadyCheckedMatchElements[i]).data('amountallocated')
                )
            );
        }
        var amountToAllocate = 0;
        var amountLeftOnReceipt = Decimal(receiptDetails.receiptAmount).sub(
            amountAlreadyAllocated
        );
        var amountForCharge = Decimal($changedCheckbox.data('matchamount'));
        if (amountLeftOnReceipt.gte(amountForCharge)) {
            amountToAllocate = amountForCharge;
        } else {
            amountToAllocate = amountLeftOnReceipt;
        }
        return amountToAllocate;
    };

    var calculateAmountLeftOnReceipt = function (
        $fuzzyMatchRow,
        receiptDetails,
        $changedCheckbox
    ) {
        var $alreadyCheckedMatchElements = $fuzzyMatchRow.find(
            '.checkboxCell input:checked'
        );
        if ($changedCheckbox) {
            $alreadyCheckedMatchElements =
                $alreadyCheckedMatchElements.not($changedCheckbox);
        }
        var amountAlreadyAllocated = Decimal(0);
        for (var i = 0; i < $alreadyCheckedMatchElements.length; i++) {
            amountAlreadyAllocated = amountAlreadyAllocated.add(
                Decimal(
                    $($alreadyCheckedMatchElements[i]).data('amountallocated')
                )
            );
        }
        return Decimal(receiptDetails.receiptAmount).sub(
            amountAlreadyAllocated
        );
    };

    var setAmountAllocated = function (
        $changedCheckbox,
        receiptDetails,
        amountToAllocate
    ) {
        $changedCheckbox.attr(
            'data-amountallocated',
            amountToAllocate.toFixed(2)
        );
        $changedCheckbox.data('amountallocated', amountToAllocate.toFixed(2));
        $changedCheckbox
            .closest('tr')
            .find('.allocatedAmountCell')
            .text(receiptDetails.currencySymbol + amountToAllocate.toFixed(2));
    };

    var displayErrorTooltip = function ($el, text) {
        $el.attr('title', text);
        $el.qtip({
            style: { classes: 'qtip-dark' },
            show: { ready: true },
            hide: 'mouseout',
            events: {
                hidden: function (event, api) {
                    api.destroy(true);
                    $el.removeAttr('title');
                }
            }
        });
    };

    var areOtherSelectionsMadeForOtherRecords = function (
        $changedCheckbox,
        $fuzzyMatchRow
    ) {
        var areOtherSelectionsMade =
            $('#fuzzyMatchOptions .fuzzyMatch')
                .not($fuzzyMatchRow)
                .find('.checkboxCell input:checked').length > 0;
        if (areOtherSelectionsMade) {
            displayErrorTooltip(
                $changedCheckbox,
                'There are already allocations to another Tenancy or Contact'
            );
        }
        return areOtherSelectionsMade;
    };

    var processChargeSelectionChange = function (
        $changedCheckbox,
        $fuzzyMatchRow,
        receiptDetails
    ) {
        if (!$changedCheckbox.is(':checked')) {
            setAmountAllocated($changedCheckbox, receiptDetails, Decimal(0));
        } else {
            var amountLeftOnReceipt = calculateAmountLeftOnReceipt(
                $fuzzyMatchRow,
                receiptDetails,
                $changedCheckbox
            );
            if (amountLeftOnReceipt.lte(0)) {
                displayErrorTooltip(
                    $changedCheckbox,
                    'No more money left to allocate'
                );
                return false;
            }
            if (
                areOtherSelectionsMadeForOtherRecords(
                    $changedCheckbox,
                    $fuzzyMatchRow
                )
            ) {
                return false;
            }
            var amountToAllocate = calculateAmountToAllocate(
                $changedCheckbox,
                $fuzzyMatchRow,
                receiptDetails
            );
            setAmountAllocated(
                $changedCheckbox,
                receiptDetails,
                amountToAllocate
            );
        }
        setRemainingHeldMonies($fuzzyMatchRow, receiptDetails);
        return true;
    };

    var processAllAllocatedAsHeldMoniesChange = function (
        $changedCheckbox,
        $fuzzyMatchRow,
        receiptDetails
    ) {
        if (!$changedCheckbox.is(':checked')) {
            $fuzzyMatchRow
                .find('.allocatedAmountCell')
                .text(receiptDetails.currencySymbol + '0.00');
            return true;
        }
        if (
            areOtherSelectionsMadeForOtherRecords(
                $changedCheckbox,
                $fuzzyMatchRow
            )
        ) {
            return false;
        }

        $fuzzyMatchRow
            .find('.allocatedAmountCell')
            .text($fuzzyMatchRow.find('.amountCell').text());
        return true;
    };

    var setUpEvents = function ($dialogContent, receiptDetails) {
        $dialogContent
            .find('.matchingChargeRow .checkboxCell .tickbox')
            .click(function (e) {
                e.stopPropagation();
                var $changedCheckbox = $(e.currentTarget).find('input');
                var $fuzzyMatchRow = $changedCheckbox.closest('.fuzzyMatch');
                return processChargeSelectionChange(
                    $changedCheckbox,
                    $fuzzyMatchRow,
                    receiptDetails
                );
            });
        $dialogContent
            .find('.allAllocatedAsHeldMoniesRow .checkboxCell .tickbox')
            .click(function (e) {
                e.stopPropagation();
                var $changedCheckbox = $(e.currentTarget).find('input');
                var $fuzzyMatchRow = $changedCheckbox.closest('.fuzzyMatch');
                return processAllAllocatedAsHeldMoniesChange(
                    $changedCheckbox,
                    $fuzzyMatchRow,
                    receiptDetails
                );
            });
    };

    var updateChargeRowWithExistingAllocations = function (
        chargeId,
        $chargeCheckbox,
        receiptDetails
    ) {
        var $chargesOnPageWithAllocations = $(
            "#importedreceiptslist .charge-item[data-transactionid='" +
                chargeId +
                "']"
        ).filter(function () {
            var $receiptItemForThisFuzzyMatch = $(this)
                .closest('.item-collection')
                .find(
                    ".receipt-item[data-receiptid='" +
                        receiptDetails.receiptId +
                        "']"
                );
            return $receiptItemForThisFuzzyMatch.length === 0;
        });

        if ($chargesOnPageWithAllocations.length > 0) {
            var $warning = $(
                "<strong title='Charge already allocated to another Contact or Tenancy on page' class='fa fa-warning'></strong>"
            );
            $chargeCheckbox.closest('.tickbox').replaceWith($warning);
            $warning.qtip({
                style: { classes: 'qtip-dark' },
                hide: 'mouseout'
            });
        }
    };

    var updateAnyChargeAmountsWithExistingAllocations = function (
        $dialogContent,
        receiptDetails
    ) {
        $dialogContent.find('.checkboxCell input:checkbox').each(function () {
            var $chargeCheckbox = $(this);
            var chargeId = $chargeCheckbox.data('chargeid');
            if (chargeId > 0) {
                updateChargeRowWithExistingAllocations(
                    chargeId,
                    $chargeCheckbox,
                    receiptDetails
                );
            }
        });
    };

    var setupFuzzyMatchesDialog = function (
        $dialogContent,
        receiptDetails,
        $originalReceiptRow
    ) {
        if (!receiptDetails) {
            receiptDetails = {};
        }
        if (!receiptDetails.receiptReference) {
            receiptDetails.receiptReference = '';
        }
        if (receiptDetails.receiptReference.length > 30) {
            receiptDetails.receiptReference =
                receiptDetails.receiptReference.slice(0, 30) + '...';
        }

        updateAnyChargeAmountsWithExistingAllocations(
            $dialogContent,
            receiptDetails
        );

        var actionButton = null;
        if ($dialogContent.find('.fuzzyMatch').length > 0) {
            actionButton = 'Ok';
            gmgps.cloud.ui.views.receiptImportsHandler.addToolTipsForLandlordIncomWarning(
                $dialogContent.find('.landlord-income-warning')
            );
        } else {
            $dialogContent.append('<h1>No matches found for this payment</h1>');
        }

        new gmgps.cloud.ui.controls.window({
            title:
                'Matching items for charge ' +
                receiptDetails.receiptReference +
                ' - £' +
                receiptDetails.receiptAmount.toFixed(2),
            windowId: 'fuzzyMatchingWindowWrapper',
            $content: $dialogContent,
            width: 900,
            draggable: true,
            modal: true,
            cancelButton: 'Cancel',
            actionButton: actionButton,
            dontCloneContent: true,
            onAction: function ($content) {
                var $checkedMatchElements = $content.find(
                    '#fuzzyMatchOptions .checkboxCell input:checked'
                );
                if (
                    !isMatchSelectionValid(
                        $checkedMatchElements,
                        receiptDetails
                    )
                )
                    return false;
                var $ajaxCall =
                    ajaxCallForReplacementRowForChargeWithMatchedItems(
                        $checkedMatchElements,
                        receiptDetails
                    );
                $ajaxCall.done(function (response) {
                    var $responseRow = $(response.Data);
                    if ($responseRow.is('.item-collection')) {
                        gmgps.cloud.ui.views.receiptImportsHandler.addToolTipsForLandlordIncomWarning(
                            $responseRow.find('.landlord-income-warning')
                        );
                        $originalReceiptRow.replaceWith($responseRow);
                    }
                });
                return true;
            },
            onClose: function () {
                isFuzzyMatchRunning = false;
            }
        });

        setUpEvents($dialogContent, receiptDetails);
    };

    return {
        findFuzzyMatches: function (
            accountId,
            receiptReference,
            receiptAmount,
            receiptDate,
            receiptId,
            currencySymbol,
            $originalReceiptRow
        ) {
            if (isFuzzyMatchRunning) {
                return;
            }

            isFuzzyMatchRunning = true;

            var onSuccess = function (response) {
                var receiptDetails = {
                    accountId: accountId,
                    receiptReference: receiptReference,
                    receiptAmount: receiptAmount,
                    receiptDate: receiptDate,
                    receiptId: receiptId,
                    currencySymbol: currencySymbol || ''
                };
                setupFuzzyMatchesDialog(
                    $(response.Data),
                    receiptDetails,
                    $originalReceiptRow
                );
            };

            var onError = function () {
                isFuzzyMatchRunning = false;
            };

            new gmgps.cloud.http("fuzzyMatcher-findFuzzyMatches").ajax(
                {
                    args: {
                        accountId: accountId,
                        receiptReference: receiptReference,
                        receiptAmount: receiptAmount,
                        receiptDate: receiptDate,
                        currencySymbol: currencySymbol
                    },
                    complex: true,
                    dataType: 'json',
                    url: '/Accounts/GetFuzzyMatches'
                },
                onSuccess,
                onError
            );
        }
    };
})();
