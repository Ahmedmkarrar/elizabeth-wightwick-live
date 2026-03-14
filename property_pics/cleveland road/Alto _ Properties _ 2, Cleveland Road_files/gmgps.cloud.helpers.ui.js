((function() {
    function UIHelper() {}
    UIHelper.prototype = {
        initDatePickers: function ($root, minDate) {
            if (!minDate) {
                minDate = new Date();
            }
            $root.find('.date-picker').each(function (i, v) {
                var $v = $(v);
                $v.datepicker({
                    numberOfMonths: 2,
                    showButtonPanel: true,
                    dateFormat: 'dd/mm/yy',
                    minDate:
                        $v.data('datepickermode') === 'future' ? minDate : null
                });
            });
        },
        initInputs: function ($root) {
            $root.find('select').not('is-customised').customSelect();
            $root.find('.placeholders').placeholder();
        },
        disableFormAndControls: function ($form) {
            if (typeof $form === 'undefined') {
                $form = $('#main form');
            }
            $form.find(':submit').css('opacity', '0.5');
            $form.find(':input').prop('disabled', true);

            $form.submit(function (e) {
                e.preventDefault();
                return;
            });
        }
    };

    gmgps.cloud.helpers.ui = new UIHelper();
}))();
