gmgps.cloud.ui.views.property.propertyInsuranceHandler = function (args) {
    var me = this;

    me.id = args.id;
    me.$root = args.$root;
    me.setDirty = args.dirtyHandler;
    me.init();

    return me;
};

gmgps.cloud.ui.views.property.propertyInsuranceHandler.prototype = {
    init: function () {
        var me = this;

        me.$root.off();

        me.$root.on(
            'click',
            '.row .header-section:not(.sublink)',
            function (e) {
                if (e.target.className.indexOf('preview-link') == -1) {
                    $(this).next('.detail-section').slideToggle('fast');
                }
            }
        );

        me.$root.on('click', '.row .delete-insurance', function (ev) {
            ev.stopPropagation();
            var $row = $(this).closest('.contact-row');

            var deleteInsurer = function () {
                me.setDirty(true, ev);
                $row.remove();
            };

            showDialog({
                type: 'question',
                title: 'Remove Insurance',
                msg: 'Are you sure you would like to remove this insurance ?',
                buttons: {
                    Yes: function () {
                        deleteInsurer();

                        $(this).dialog('close');
                    },
                    No: function () {
                        $(this).dialog('close');
                    }
                }
            });
        });

        me.$root.on('change', '.Insurance_CoverTypeId', function () {
            var $this = $(this);
            var $row = $this.closest('.contact-row').find('.paid-by-tenant');

            parseInt($this.val()) ==
            C.ContactProvidedServicesType.ContentsInsurance
                ? $row.show()
                : $row.hide();
        });

        me.$root.on('click', '.select-insurance:not(.disabled)', function () {
            var selectedIdList = [];

            me.$root.find('.contact-row').each(function () {
                selectedIdList.push($(this).find('#Insurance_ContactId').val());
            });

            var selectInsurer = new gmgps.cloud.ui.views.contactSelector({
                $root: me.$root,
                args: {
                    settings: {
                        categoryId: C.ContactCategory.Supplier,
                        selectedIdList: selectedIdList,
                        allowAddContact: false,
                        selectByProvidedService: true,
                        serviceCategory: C.ContactSelectorServiceType.Insurance,
                        serviceIdList: []
                    }
                }
            });

            selectInsurer.show({
                title: 'Select an Insurer',
                callback: function (selectedId, selectedServiceId) {
                    me.getInsuranceForm(
                        me.id,
                        selectedId,
                        selectedServiceId
                    ).done(function (r) {
                        if (r && r.Data) {
                            var $html = $(r.Data);
                            me.$root.find('.row .detail-section').slideUp();
                            me.$root.find('.body').append($html);
                            $html.find('.detail-section').slideDown();

                            me.initControls();

                            me.setDirty(true);
                        }
                    });
                }
            });
        });

        me.$root.on('click', '.insurance-managementdate', function () {
            var recordId = parseInt($(this).data('id'));
            var linkedId = parseInt($(this).data('propertyid'));
            gmgps.cloud.helpers.diary.getManagementDate(
                linkedId,
                C.ModelType.Property,
                recordId,
                []
            );
        });
    },

    initControls: function () {
        var me = this;
        me.$root.find('select').not('.is-customised').customSelect();

        //Date Pickers
        //filter out initialized date pickers, because reinitialization doesn't occur.
        me.$root.find('.date-picker:not(.hasDatePicker)').each(function (i, v) {
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

        return me;
    },

    getInsuranceForm: function (propertyId, insurerId, serviceId) {
        return new gmgps.cloud.http(
            "propertyInsuranceHandler-getInsuranceForm"
        ).ajax({
            args: {
                propertyId: propertyId,
                insurerId: insurerId,
                providedServiceId: serviceId
            },
            complex: true,
            dataType: 'json',
            type: 'post',
            url: '/Property/GetNewPropertyInsurance'
        });
    }
};
