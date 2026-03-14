gmgps.cloud.ui.views.contactChangeAddress = function (args) {
    var me = this;
    me.cfg = args;
    me.$root = args.$root;
    me.init(args);
    me.closeMyWindow = args.closeMyWindow;

    return this;
};

gmgps.cloud.ui.views.contactChangeAddress.prototype = {
    init: function () {
        var me = this;
        //Manual Address Link > Click
        me.$root.on('click', '.manual-address-link', function () {
            me.$root.find('.address-line').show();
            me.$root.find('.manual-address-container').remove();
            me.$root.find('.address-selection-line').hide();
        });

        me.$root.find('select').not('.opt-standard').customSelect();
        me.$root.find('#Postcode').val('');

        var populateAddressFieldsFromFoundAddress = function (address) {
            me.$root.find('.address-line').show();

            me.$root
                .find('#Contact_Address_SubDwelling')
                .val(address.SubDwelling);
            var $nameNo = me.$root
                .find('#Contact_Address_NameNo')
                .val(address.NameNo)
                .focus();
            me.$root.find('#Contact_Address_Street').val(address.Street);
            me.$root.find('#Contact_Address_Locality').val(address.Locality);
            me.$root.find('#Contact_Address_Town').val(address.Town);
            me.$root.find('#Contact_Address_County').val(address.County);
            me.$root
                .find('#Contact_Address_CountryCode')
                .val(address.CountryCode)
                .change(); //change required for custom select

            gmgps.cloud.ui.controls.PostcodePicker.HighlightNameNoFieldAndWarnIfEmpty(
                $nameNo
            );

            $(this).closest('.row').hide();
            me.$root.find('.manual-address-container').hide();
        };

        var postcodePicker = new gmgps.cloud.ui.controls.PostcodePicker({
            eventSource: me.$root,
            populateFieldsFromFoundAddress:
                populateAddressFieldsFromFoundAddress
        });

        postcodePicker.findPostcode(
            me.$root.find('#Contact_Address_Postcode'),
            me.$root
        );
    },

    action: function () {
        var me = this;

        var getVal = function (id) {
            return me.$root.find('#' + id).val();
        };

        var newAddress = {
            SubDwelling: getVal('Contact_Address_SubDwelling'),
            NameNo: getVal('Contact_Address_NameNo'),
            Street: getVal('Contact_Address_Street'),
            Locality: getVal('Contact_Address_Locality'),
            Town: getVal('Contact_Address_Town'),
            County: getVal('Contact_Address_County'),
            Postcode: getVal('Contact_Address_Postcode'),
            CountryCode: getVal('Contact.Address.CountryCode')
        };

        var summary = '';
        if (newAddress.SubDwelling) summary += newAddress.SubDwelling + ', ';
        if (newAddress.NameNo) summary += newAddress.NameNo + ', ';
        if (newAddress.Street) summary += newAddress.Street + ', ';
        if (newAddress.Locality) summary += newAddress.Locality + ', ';
        if (newAddress.Town) summary += newAddress.Town + ', ';
        if (newAddress.County) summary += newAddress.County + ', ';
        if (newAddress.Postcode) summary += newAddress.Postcode + ', ';

        summary = summary.trim();
        summary = summary.trimEnd(',');

        me.updateAddress(
            me.$root.find('#Contact_Id').val(),
            summary,
            newAddress,
            me.caller
        );
    }
};
