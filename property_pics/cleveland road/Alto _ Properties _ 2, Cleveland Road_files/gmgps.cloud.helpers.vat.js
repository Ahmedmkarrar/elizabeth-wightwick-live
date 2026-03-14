gmgps.cloud.helpers.vat = function (http) {
    var _http = http || new gmgps.cloud.http("vat-vat");

    function _updateVatRatesDropdownForDate(date, $dropdown) {
        var deferred = Q.defer();

        if ($dropdown.length === 0) {
            return deferred.resolve();
        }

        var selectedValue = $dropdown.val();
        //ajax call to get current rates - either just for today or with ranges...

        _http.ajax(
            {
                args: {
                    itemDate: date
                },
                background: true,
                complex: true,
                dataType: 'json',
                type: 'get',
                url: '/Accounting/GetVATRatesForDay'
            },
            function (response) {
                if (!response) {
                    deferred.reject();
                    return;
                }

                if (!response.Data) {
                    deferred.reject();
                    return;
                }

                var data = response.Data;
                _populateDropdownWithVatValues($dropdown, data);
                $dropdown
                    .find('option[value=' + selectedValue + ']')
                    .prop('selected', true);

                deferred.resolve();
            }
        );

        return deferred.promise;
    }

    function _populateDropdownWithVatValues($dropdown, data) {
        $dropdown.find('option').remove();
        data.forEach(function (item) {
            $dropdown.append(
                $(
                    "<option value ='" +
                        item.Id +
                        "' data-vatrate='" +
                        item.Rate +
                        "' >" +
                        item.Name +
                        '</option >'
                )
            );
        });
    }

    return {
        updateVatRatesDropdownForDate: _updateVatRatesDropdownForDate
    };
};
