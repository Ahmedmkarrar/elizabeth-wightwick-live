((function() {
    var _this;
    var statusRegistry = [];
    statusRegistry[C.ContactDescriptionType.Applicants] = [
        C.MoneyLaunderingFilterType.OffersAccepted
    ];
    statusRegistry[C.ContactDescriptionType.Vendors] = [
        C.MoneyLaunderingFilterType.All,
        C.MoneyLaunderingFilterType.Instructed,
        C.MoneyLaunderingFilterType.Available,
        C.MoneyLaunderingFilterType.PendingOffers,
        C.MoneyLaunderingFilterType.OffersAccepted,
        C.MoneyLaunderingFilterType.CompletedLet
    ];
    statusRegistry[C.ContactDescriptionType.Landlords] = [
        C.MoneyLaunderingFilterType.All,
        C.MoneyLaunderingFilterType.Instructed,
        C.MoneyLaunderingFilterType.Available,
        C.MoneyLaunderingFilterType.PendingOffers,
        C.MoneyLaunderingFilterType.OffersAccepted,
        C.MoneyLaunderingFilterType.CompletedLet
    ];

    function Filter() {}

    Filter.prototype = {
        apply: function ($target) {
            _this = this;

            _this.moneyLaunderingContactTypePicker = $target.find(
                'select[data-dataname="categoryIdList[0]"]'
            );
            _this.statusPicker = $target.find(
                'select[data-dataname="moneyLaunderingContactFilter"]'
            );
            _this.statusPickerClone = this.statusPicker
                .clone()
                .attr('data-dataname', 'moneyLaunderingContactFilterClone');

            _this.moneyLaunderingContactTypePicker.on(
                'change prog-change',
                _onchange
            );

            return function off() {
                _this.moneyLaunderingContactTypePicker.off(
                    'change prog-change',
                    _onchange
                );
            };
        }
    };

    function _onchange(e) {
        var contactType = $(e.target).val();
        showStatusesForSelectedContactType(contactType);
    }

    function showStatusesForSelectedContactType(contactType) {
        var statuses = statusRegistry[contactType];
        showStatuses(statuses, contactType);
        resetOptions();
    }

    function resetOptions() {
        _this.statusPicker
            .val(_this.statusPicker.find('option:first').val())
            .trigger('prog-change');
    }

    function showStatuses(statuses, contactType) {
        _this.statusPicker.empty();

        if (statuses.length > 0) {
            if (parseInt(contactType) !== C.ContactDescriptionType.Applicants) {
                _this.statusPicker.closest('tr').show();
            } else {
                _this.statusPicker.closest('tr').hide();
            }

            _.forEach(statuses, function (status) {
                var source = _this.statusPickerClone
                    .find('option[value="' + status + '"]')
                    .clone();
                _this.statusPicker.append(source);
            });
        } else {
            _this.statusPicker.closest('tr').hide();
        }
    }

    gmgps.cloud.ui.filters.MoneyLaunderingSearchFilter = Filter;
}))();
