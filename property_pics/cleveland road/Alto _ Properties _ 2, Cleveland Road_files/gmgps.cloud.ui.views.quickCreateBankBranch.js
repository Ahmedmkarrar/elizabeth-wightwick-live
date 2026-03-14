gmgps.cloud.ui.views.quickCreateBankBranch = function (args) {
    var me = this;
    me.settings = args.settings;
    me.onComplete = args.onComplete;
    me.init();

    return me;
};

gmgps.cloud.ui.views.quickCreateBankBranch.prototype = {
    init: function () {
        return this;
    },

    show: function ($container, $offset) {
        var me = this;

        $.when(me.getForm(me.settings)).done(function (html) {
            me.initForm(html, $container, $offset);
        });
    },

    initForm: function (form, $container, $offset) {
        var me = this;

        var $ip = $(form);

        if ($offset) {
            $ip.offset($offset);
        }

        $ip.css('z-index', 10)
            .css('position', 'absolute')
            .css('display', 'none')
            .draggable({ containment: $container });

        $ip.prependTo($container);

        $ip.find('input.placeholder').placeholder();

        $ip.find('select').customSelect();

        $ip.on('click', '.manual-address-link', function () {
            $ip.find('.address-line').show();
            $ip.find('.manual-address-container').remove();
            $ip.find('.address-selection-line').hide();
        });

        $ip.on('click', '.ip-cancel-button', function () {
            $.when($ip.slideUp('fast')).done(function () {
                $ip.remove();
            });
        });

        $ip.on('click', '.ip-add-button', function () {
            $.when(me.saveBranch($ip)).done(function (s) {
                if (s) {
                    if (me.onComplete) {
                        me.onComplete(s);
                    }
                    $ip.remove();
                }
            });
        });

        var populateAddressFieldsFromFoundAddress = function (
            address,
            $postcode
        ) {
            var $row = $postcode.closest('.quick-create-bank-branch');

            $row.find('.address-line').show();

            $row.find('input[data-field="SubDwelling"]').val(
                address.SubDwelling
            );
            var $nameNo = $row
                .find('input[data-field="NameNo"]')
                .val(address.NameNo)
                .focus();
            $row.find('input[data-field="Street"]').val(address.Street);
            $row.find('input[data-field="Town"]').val(address.Town);
            $row.find('input[data-field="County"]').val(address.County);
            $row.find('select[data-field="CountryCode"]')
                .val(address.CountryCode)
                .change(); //change required for custom select

            $row.find('.manual-address-container').fadeOut();
            $row.find('.address-selection-line').fadeOut();

            gmgps.cloud.ui.controls.PostcodePicker.HighlightNameNoFieldAndWarnIfEmpty(
                $nameNo
            );
        };

        new gmgps.cloud.ui.controls.PostcodePicker({
            findUi: function ($target) {
                return $target.closest('.quick-create-bank-branch');
            },
            eventSource: $ip,
            populateFieldsFromFoundAddress:
                populateAddressFieldsFromFoundAddress
        });

        $ip.slideDown('fast');
    },

    getForm: function (settings) {
        var deferred = $.Deferred();

        new gmgps.cloud.http("quickCreateBankBranch-getForm").ajax(
            {
                args: settings,
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/Contact/GetQuickCreateBankBranch'
            },
            function (response) {
                deferred.resolve(response.Data);
            },
            function () {
                deferred.resolve(false);
            }
        );

        return deferred;
    },

    saveBranch: function ($form) {
        var deferred = $.Deferred();

        // move split sort codes into hidden single

        $form
            .find('#Branch_SortCode')
            .val(
                $form.find('#S1').val() +
                    $form.find('#S2').val() +
                    $form.find('#S3').val()
            );

        $form = createForm($form, '/Contact/QuickCreateBankBranch');

        $.when(
            new gmgps.cloud.http("quickCreateBankBranch-saveBranch").postForm(
                $form
            )
        ).done(function (s) {
            deferred.resolve(s);
        });

        return deferred;
    }
};
