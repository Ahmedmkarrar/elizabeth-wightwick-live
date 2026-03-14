gmgps.cloud.ui.views.instruction = function (args) {
    var me = this;

    me.$root = args.$root;
    me.$window = null;
    me.gotoPropertyHandler =
        args && args.data ? args.data.gotoPropertyHandler : undefined;
    me.settings = args;
    me.init(args);

    me.instruct = me.$root.find('#Instruct').val() === 'True';

    return true;
};

gmgps.cloud.ui.views.instruction.prototype = {
    init: function () {
        var me = this;

        me.$window = me.$root.closest('.window');

        //Read-Only?
        // - #ReadOnly exists where the server decided that the instruction cannot continue at the current time.
        if (me.$root.find('#ReadOnly').length != 0) {
            me.$window.find('.bottom .action-button').hide();
        }

        //Inject user and datetime.
        var $ownership = $(
            '<div class="ownership">' +
                me.$root.find('#ModelUser').val() +
                (me.id == 0
                    ? ''
                    : '<br/>' + me.$root.find('#ModelDateTime').val()) +
                '</div>'
        );
        me.$window.find('.top').append($ownership);

        if (me.$root.find('#Valuation_Id').val() == '') {
            me.$root.closest('.window').find('.action-button').hide();
            return;
        } else {
            me.valuationId = parseInt(me.$root.find('#Valuation_Id').val());
        }

        var $recordTypeId = me.$root.find(
            '#Property_RecordTypeId, #Valuation_LostMarketType'
        );

        //Setup custom dropdowns.
        me.$root.find('select').customSelect();

        //Date Pickers
        me.$root.find('.date-picker').each(function (i, v) {
            $(v).datepicker({
                numberOfMonths: 2,
                showButtonPanel: true,
                dateFormat: 'dd/mm/yy',
                minDate:
                    $(v).attr('data-datePickerMode') == 'future'
                        ? new Date()
                        : null
            });
        });

        //RecordTypeId > Change
        $recordTypeId.on('change', function () {
            me.setupRecordTypeRows($(this).val());
            me.$root.find('.opt-validate').validationEngine('hideAll');
        });

        //Sale > Contract Length > Change
        me.$root.on('change', '#Property_SaleContractLength', function () {
            var days = parseInt($(this).val()) * 7;
            var date = Date.today().add(days).days();
            me.$root
                .find('#SaleInstructContractEndDate')
                .val(date.toString('dd/MM/yyyy'));
        });

        //Rent > Contract Length > Change
        me.$root.on('change', '#Property_RentContractLength', function () {
            var days = parseInt($(this).val()) * 7;
            var date = Date.today().add(days).days();
            me.$root
                .find(
                    'input[type="text"][name="Property.PropertyRental.ContractEndDate"]'
                )
                .val(date.toString('dd/MM/yyyy'));
        });

        //Property_BoardRequired > Change
        me.$root.on('change', '#Property_BoardRequired', function () {
            var checked = $(this).prop('checked');

            if (checked) {
                me.$root.find('.board-row').show();
            } else {
                me.$root.find('.board-row').hide();
            }
        });

        //BoardChangeViewModel_BoardChange_BoardType > Change
        me.$root.on(
            'change',
            '#BoardChangeViewModel_BoardChange_BoardType',
            function () {
                var boardTypeId = parseInt($(this).val());
                if (boardTypeId !== 0) {
                    me.$root.find('.x-board-specific').show();
                } else {
                    me.$root.find('.x-board-specific').hide();
                }
            }
        );

        //Lost inputs...
        me.$root.on('change', '#Valuation_LostToAgentContactId', function () {
            if (parseInt($(this).val()) != -3)
                me.$root
                    .find('#Valuation_LostToAgentName')
                    .val('')
                    .attr('disabled', true);
            else
                me.$root
                    .find('#Valuation_LostToAgentName')
                    .attr('disabled', false);
        });
        me.$root.on('change', '#Valuation_LostFollowUp', function () {
            var $reviewDate = me.$root.find('#Valuation_ReviewDate');
            if (parseInt($(this).val()) == 0) {
                disableInputs(
                    me.$root.find('#Valuation_LostFollowUpUserId').parent(),
                    true
                );
                $reviewDate.val('');
            } else {
                disableInputs(
                    me.$root.find('#Valuation_LostFollowUpUserId').parent(),
                    false
                );
                var days = parseInt($(this).val()) * 7;
                var date = Date.today().add(days).days();
                $reviewDate.val(date.toString('dd/MM/yyyy'));
            }
        });
        me.$root.on(
            'change',
            '#Valuation_LostToAgentContractTimescale',
            function () {
                if (parseInt($(this).val()) == 0)
                    me.$root
                        .find('#Valuation_LostToAgentContractEndDate')
                        .val('')
                        .attr('disabled', true);
                else
                    me.$root
                        .find('#Valuation_LostToAgentContractEndDate')
                        .attr('disabled', false);
            }
        );
        me.$root.on('change', '#Valuation_LostMarketType', function () {
            var saleRent = $(this).val();
            var $s = me.$root.find(
                '.tag-instruct-section[data-type="not-instructed"] .sale-specific'
            );
            var $r = me.$root.find(
                '.tag-instruct-section[data-type="not-instructed"] .rent-specific'
            );
            disableInputs($s, saleRent == C.PropertyRecordType.Rent);
            disableInputs($r, saleRent == C.PropertyRecordType.Sale);
            if (saleRent == C.PropertyRecordType.Sale) $r.val(''); //Clear inputs because we don't send the recordType to the server.
            if (saleRent == C.PropertyRecordType.Rent) $s.val('');
        });
        me.$root.on(
            'change',
            '#Valuation_LostToAgentContractTimescale',
            function () {
                var days = parseInt($(this).val()) * 7;
                var date = Date.today().add(days).days();
                me.$root
                    .find('#Valuation_LostToAgentContractEndDate')
                    .val(date.toString('dd/MM/yyyy'));
            }
        );

        var $focus = me.$root.find('.opt-focus:visible:first');
        $focus.focus().val($focus.val()); //could write a plugin for this (placing focus at end of chars in input box)

        me.$followUps = me.$root.find('.followups').followUpDropdown({
            adderColor: '#363636',
            linkedType: C.ModelType.DiaryEvent,
            linkedId: me.valuationId,
            display: 'normal'
        });

        //Hide board inputs initially.
        me.$root.find('.x-board-specific').hide();
    },

    setupRecordTypeRows: function (recordTypeId) {
        var me = this;

        me.$root
            .find(
                'div[data-type="sale"], div[data-type="rent"], .rent-specific, .sale-specific'
            )
            .hide();

        if (recordTypeId == C.PropertyRecordType.Sale) {
            //Sale
            me.$root.find('div[data-type="sale"], .sale-specific').show();
        }

        if (recordTypeId == C.PropertyRecordType.Rent) {
            //Rent
            me.$root.find('div[data-type="rent"], .rent-specific').show();
        }
    },

    validate: function () {
        var me = this;
        var isValid = true;

        me.$root.find('.tag-instruct-section').removeClass('opt-validate');

        var $f = me.instruct
            ? me.$root.find('.tag-instruct-section[data-type="instruct"]')
            : me.$root.find(
                  '.tag-instruct-section[data-type="not-instructed"]'
              );

        //Init validation engine.
        $f.addClass('opt-validate').validationEngine({ scroll: false });

        isValid = $f.validationEngine('validate');
        return isValid;
    },

    destroy: function () {
        var me = this;
        me.$root.empty().unbind();
    },

    action: function (onComplete) {
        var me = this;

        if (!me.validate()) return false;

        me.$window.find('.action-button').lock();

        new gmgps.cloud.http("instruction-action").postForm(
            createForm(me.$root, 'Property/SetInstruction'),
            function (response) {
                onComplete();

                if (me.instruct === false) {
                    if (response && response.Data) {
                        me.$followUps
                            .data('followUpDropdown')
                            .saveFollowUps(me.valuationId);
                    }
                }

                //Was the property instructed?
                if (me.instruct) {
                    me.gotoPropertyHandler();
                }

                //No output required for the updated MA event.
                gmgps.cloud.helpers.general.setNoOutputRequiredForEvent(
                    response.UpdatedEvents,
                    [C.EventSubType.MarketAppraisal]
                );

                //Prompt for letters.
                gmgps.cloud.helpers.general.promptForLetters({
                    eventHeaders: response.UpdatedEvents
                });
            }
        );
    },

    cancel: function (onComplete) {
        var me = this;
        me.$root.find('.opt-validate').validationEngine('hideAll');
        onComplete();
    }
};
