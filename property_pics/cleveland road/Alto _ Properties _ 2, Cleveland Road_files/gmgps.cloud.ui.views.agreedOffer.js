gmgps.cloud.ui.views.agreedOffer = function (args) {
    var me = this;
    me.cfg = args;
    me.$root = args.$root;

    me.plumb = null;
    me.$window = null;

    me.id = parseInt(me.$root.find('#ViewModelSettings_HistoryEventId').val());

    me.init(args);

    return this;
};

gmgps.cloud.ui.views.agreedOffer.prototype = {
    init: function () {
        var me = this;

        me.$window = me.$root.closest('.window');

        //Dropdowns
        me.$root.find('select').customSelect();

        //Date Pickers
        me.$root.find('.date-picker').each(function (i, v) {
            $(v).datepicker({
                numberOfMonths: 2,
                showButtonPanel: true,
                dateFormat: 'dd/mm/yy',
                minDate:
                    $(v).attr('data-datePickerMode') === 'future'
                        ? new Date()
                        : null
            });
        });

        //Inject user and datetime.
        var $ownership = $(
            '<div class="ownership">' +
                me.$root.find('#ModelUser').val() +
                (me.id === 0
                    ? ''
                    : '<br/>' + me.$root.find('#ModelDateTime').val()) +
                '</div>'
        );
        me.$window.find('.top').append($ownership);

        //Give the elements to be connected unique names from any which may appear in the background.
        me.$root
            .find('.property-contact, .property-agent')
            .each(function (i, v) {
                $(v).attr('id', 'form-' + $(v).attr('id'));
            });

        //Plumb setup
        me.plumb = jsPlumb.getInstance();
        me.plumb.Defaults.Container = me.$root;
        me.plumb.importDefaults({
            Connector: ['Bezier', { curviness: 50 }],
            DragOptions: { cursor: 'pointer', zIndex: 2000 },
            PaintStyle: { strokeStyle: '#d72728', lineWidth: 4 },
            EndpointStyle: {
                radius: 1,
                strokeStyle: '#4d4d4d',
                fillStyle: '#4d4d4d'
            },
            HoverPaintStyle: { strokeStyle: '#e73738' },
            EndpointHoverStyle: { fillStyle: '#ec9f2e' },
            Anchors: ['TopCenter', 'BottomCenter'],
            ConnectionOverlays: [
                [
                    'Arrow',
                    {
                        width: 11,
                        length: 11,
                        location: 0.5,
                        direction: 1,
                        foldback: 1,
                        paintStyle: {
                            strokeStyle: '#d72728',
                            fillStyle: '#d72728'
                        }
                    }
                ]
            ]
        });

        //FollowUp Select
        me.$followUps = me.$root.find('.followups').followUpDropdown({
            linkedType: C.ModelType.HistoryEvent,
            linkedId: me.id,
            display: 'normal'
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

        me.$root
            .find('#ViewModelSettings_NewPropertySaleStatus')
            .change(function () {
                // if no boards present
                if (me.$root.find('#BoardChange_SuggestedBoardType').length < 1)
                    return;

                // if changed to available, then change the board selection
                if (
                    me.$root
                        .find('#ViewModelSettings_NewPropertySaleStatus')
                        .val() === C.SaleStatus.Available.toString()
                ) {
                    // set to for sale
                    me.$root
                        .find('#BoardChange_SuggestedBoardType')
                        .val(C.BoardType.ForSale);
                    me.$root
                        .find('#BoardChange_SuggestedBoardType')
                        .trigger('prog-change');
                } else {
                    // set to take down board
                    me.$root
                        .find('#BoardChange_SuggestedBoardType')
                        .val(C.BoardType.TakeDownBoard);
                    me.$root
                        .find('#BoardChange_SuggestedBoardType')
                        .trigger('prog-change');
                }
            });

        me.$root
            .find('#ViewModelSettings_NewPropertyRentalStatus')
            .change(function () {
                // if no boards present
                if (me.$root.find('#BoardChange_SuggestedBoardType').length < 1)
                    return;

                // if changed to available, then change the board selection
                if (
                    me.$root
                        .find('#ViewModelSettings_NewPropertyRentalStatus')
                        .val() === C.RentStatus.Available.toString()
                ) {
                    // set to for sale
                    me.$root
                        .find('#BoardChange_SuggestedBoardType')
                        .val(C.BoardType.ToLet);
                    me.$root
                        .find('#BoardChange_SuggestedBoardType')
                        .trigger('prog-change');
                } else {
                    // set to take down board
                    me.$root
                        .find('#BoardChange_SuggestedBoardType')
                        .val(C.BoardType.TakeDownBoard);
                    me.$root
                        .find('#BoardChange_SuggestedBoardType')
                        .trigger('prog-change');
                }
            });

        me.$root.on('change keyup', '.datechange', function () {
            var adjustmentDays =
                parseInt(me.$root.find('#RenewalDateAdjustmentDays').val()) ||
                0;
            var startDate = me.$root
                .find('#ViewModelSettings_EffectiveDate')
                .val();
            var termMonths =
                parseInt(
                    me.$root.find('#ViewModelSettings_TermMonths').val()
                ) || 0;
            var termYears =
                parseInt(me.$root.find('#ViewModelSettings_TermYears').val()) ||
                0;
            var offsetEndDate =
                me.$root
                    .find('#CalculateEndDate')
                    .val()
                    .toString()
                    .toLowerCase() === 'true';

            var dates = gmgps.cloud.helpers.tenancy.getTenancyDates(
                startDate,
                termMonths,
                termYears,
                adjustmentDays,
                offsetEndDate
            );

            me.$root
                .find('.startdate')
                .text(
                    ' from {0}'.format(
                        moment(startDate, 'DD/MM/YYYY').format('Do MMMM YYYY')
                    )
                );
            me.$root
                .find('.enddate')
                .text(
                    ' until {0}'.format(
                        moment(dates.endDate, 'DD/MM/YYYY').format(
                            'Do MMMM YYYY'
                        )
                    )
            );
        });

        //Conditionally hide board inputs initially if the default is "No Board Change".
        var currentBoardTypeId = parseInt(
            me.$root.find('#BoardChangeViewModel_BoardChange_BoardType').val()
        );
        if (currentBoardTypeId === 0) {
            me.$root.find('.x-board-specific').hide();
        }
    },

    initHandlers: function () {}
};
