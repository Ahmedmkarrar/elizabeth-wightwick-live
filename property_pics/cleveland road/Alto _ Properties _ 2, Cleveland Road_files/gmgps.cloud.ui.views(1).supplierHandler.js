gmgps.cloud.ui.views.contact.supplierHandler = function (args) {
    var me = this;

    me.id = args.id;
    me.$root = args.$root;
    me.setDirty = args.dirtyHandler;
    if (args.onSupplierAdded && args.onSupplierAdded instanceof Function) {
        me.onSupplierAdded = args.onSupplierAdded;
    }
    me.init();

    return me;
};

gmgps.cloud.ui.views.contact.supplierHandler.prototype = {
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

        me.$root.on('click', '.select-supplier', function (e) {
            var selectedIdList = [];
            var $table = me.$root.find('.body');

            me.$root.find('.contact-row').each(function () {
                selectedIdList.push($(this).find('#RelatedContact_Id').val());
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
                callback: function (selectedId) {
                    // if  selected

                    if (selectedId) {
                        me.getSupplier(me.id, selectedId).done(function (r) {
                            if (r && r.Data) {
                                me.setDirty(true, e);

                                $table.append($(r.Data));

                                me.onSupplierAdded();
                            }
                        });
                    }
                }
            });
        });
    },

    getSupplier: function (contactId, relationshipId) {
        return new gmgps.cloud.http("supplierHandler-getSupplier").ajax({
            args: {
                contactId: contactId,
                relationShipId: relationshipId
            },
            complex: true,
            dataType: 'json',
            type: 'post',
            url: '/Contact/GetNewContactSupplier'
        });
    },
    onSupplierAdded: function () {}
};
