gmgps.cloud.ui.views.property.supplierHandler = function (args) {
    var me = this;

    me.id = args.id;
    me.$root = args.$root;
    me.setDirty = args.dirtyHandler;
    me.init();

    return me;
};

gmgps.cloud.ui.views.property.supplierHandler.prototype = {
    init: function () {
        var me = this;

        me.$root.off();

        me.$root.on('click', '.row .delete-supplier', function (ev) {
            ev.stopPropagation();
            var $row = $(this).closest('.contact-row');

            var deleteSupplier = function () {
                me.setDirty(true, ev);
                $row.remove();
            };

            showDialog({
                type: 'question',
                title: 'Remove Supplier',
                msg: 'Are you sure you would like to remove this supplier ?',
                buttons: {
                    Yes: function () {
                        deleteSupplier();

                        $(this).dialog('close');
                    },
                    No: function () {
                        $(this).dialog('close');
                    }
                }
            });
        });

        me.$root.on('click', '.select-supplier:not(.disabled)', function () {
            var $table = me.$root.find('.body');
            var selectedIdList = [];

            me.$root.find('.contact-row').each(function () {
                selectedIdList.push(
                    $(this).find('#Relationship_ContactId').val()
                );
            });

            var selectSupplier = new gmgps.cloud.ui.views.contactSelector({
                $root: me.$root,
                args: {
                    settings: {
                        categoryId: C.ContactCategory.Supplier,
                        selectedIdList: selectedIdList,
                        allowAddContact: true,
                        selectByProvidedService: false,
                        serviceCategory:
                            C.ContactSelectorServiceType.Unspecified,
                        serviceIdList: []
                    }
                }
            });

            selectSupplier.show({
                title: 'Select a Supplier',
                callback: function (contactId) {
                    if (contactId) {
                        me.getSupplier(me.id, contactId).done(function (r) {
                            if (r && r.Data) {
                                $table.append($(r.Data));
                                me.setDirty(true);
                            }
                        });
                    }
                }
            });
        });
    },

    refreshLayer: function (propertyId) {
        var me = this;

        var deferred = $.Deferred();

        new gmgps.cloud.http("supplierHandler-refreshLayer").ajax(
            {
                args: {
                    propertyId: propertyId
                },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/Property/GetPropertySuppliers'
            },
            function (response) {
                me.$root.empty().html($(response.Data));
                deferred.resolve();
            }
        );

        return deferred;
    },

    getSupplier: function (propertyId, contactId) {
        return new gmgps.cloud.http("supplierHandler-getSupplier").ajax({
            args: {
                propertyId: propertyId,
                contactId: contactId
            },
            complex: true,
            dataType: 'json',
            type: 'post',
            url: '/Property/GetNewPropertySupplier'
        });
    }
};
