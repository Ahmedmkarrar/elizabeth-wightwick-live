gmgps.cloud.ui.views.quickCreateContact = function (args) {
    var me = this;
    me.settings = args.settings;
    me.onComplete = args.onComplete;
    me.visible = false;
    me.init();

    return me;
};

gmgps.cloud.ui.views.quickCreateContact.prototype = {
    init: function () {
        return this;
    },

    show: function ($container, $offset) {
        var me = this;

        if (me.visible === true) {
            return true;
        }

        me.visible = true;

        me.getForm(me.settings).done(function (r) {
            if (r && r.Data) {
                me.setupForm(r.Data, $container, $offset);
            }
        });
    },

    setupForm: function (form, $container, $offset) {
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

        $ip.find('select').customSelect();

        $ip.on('click', '.manual-address-link', function () {
            $ip.find('.address-line').show();
            $ip.find('.manual-address-container').remove();
            $ip.find('.address-selection-line').hide();
        });

        $ip.on('click', '.ip-cancel-button', function () {
            $ip.slideUp('fast')
                .promise()
                .done(function () {
                    $ip.remove();
                    me.visible = false;
                });
        });

        $ip.on('click', '.ip-add-button', function () {
            me.saveContact($ip).done(function (r) {
                if (r && r.Data) {
                    if (me.onComplete) {
                        me.onComplete(r.Data.Id, r.Data);
                    }
                    me.visible = false;
                    $ip.remove();
                }
            });
        });

        var populateAddressFieldsFromFoundAddress = function (
            address,
            $postcode
        ) {
            var $row = $postcode.closest('.quick-create-contact');
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

            $row.find('.manual-address-container').fadeOut();
            $row.find('.address-selection-line').fadeOut();

            gmgps.cloud.ui.controls.PostcodePicker.HighlightNameNoFieldAndWarnIfEmpty(
                $nameNo
            );
        };

        me.postcodePicker = new gmgps.cloud.ui.controls.PostcodePicker({
            findUi: function ($target) {
                return $target.closest('.quick-create-contact');
            },
            eventSource: $ip,
            includeCounty: false,
            populateFieldsFromFoundAddress:
                populateAddressFieldsFromFoundAddress
        });


        $ip.slideDown('fast');
    },

    getForm: function (settings) {
        return new gmgps.cloud.http("quickCreateContact-getForm").ajax({
            args: settings,
            complex: true,
            dataType: 'json',
            type: 'post',
            url: '/Contact/GetQuickCreateContactDialog'
        });
    },

    saveContact: function ($form) {
        $form = createForm($form, '/Contact/QuickCreateContactEx');

        return new gmgps.cloud.http("quickCreateContact-saveContact").postForm(
            $form
        );
    }
};
