gmgps.cloud.ui.views.property.propertyUtilitiesHandler = function (args) {
    var me = this;

    me.id = args.id;
    me.$root = args.$root;
    me.setDirty = args.dirtyHandler;

    me.init();

    return me;
};

gmgps.cloud.ui.views.property.propertyUtilitiesHandler.prototype = {
    init: function () {
        var me = this;

        me.initControls();

        me.$root.off();

        me.$root.on('click', '.utility .type-container', function () {
            $(this)
                .closest('.utility')
                .find('.utility-detail')
                .not('.noexpand')
                .slideToggle('fast');
        });

        me.$root.on('click', '.utility .remove-button', function (e) {
            var $row = $(this).closest('.utility');

            var removeUtility = function () {
                // reset provider
                $row.find('#ContactId').val(0);
                $row.find('#Utility_ContactId').val(0);
                $row.find('.name').hide();
                $row.find('.phone').hide();
                $row.find('.not-set').addClass('set');
                $row.find('.remove-button').hide();
            };

            showDialog({
                type: 'question',
                title: 'Remove Provider',
                msg: 'Are you sure you would like to remove this provider ?',
                buttons: {
                    Yes: function () {
                        me.setDirty(true, e);
                        removeUtility();

                        $(this).dialog('close');
                    },
                    No: function () {
                        $(this).dialog('close');
                    }
                }
            });
        });

        me.$root.on(
            'click',
            '.select-provider:not(.disabled)',
            function (target) {
                var $this = $(this);
                var $form = $(this).closest('.utility');

                var selectUtility = new gmgps.cloud.ui.views.contactSelector({
                    $root: me.$root,
                    args: {
                        settings: {
                            categoryId: C.ContactCategory.Supplier,
                            selectedIdList: [],
                            allowAddContact: false,
                            preventFilter: true,
                            selectByProvidedService: false,
                            serviceCategory:
                                C.ContactSelectorServiceType.Unspecified,
                            serviceIdList: [$this.attr('data-utilitytypeid')]
                        }
                    }
                });

                function GetAorAn(word) {
                    var vowels = ['a', 'e', 'i', 'o', 'u'];
                    if (
                        vowels.indexOf(word.substring(0, 1).toLowerCase()) ===
                        -1
                    )
                        return 'a ';

                    return 'an ';
                }
                selectUtility.show({
                    title:
                        'Select ' +
                        GetAorAn($this.attr('data-utilitytypename')) +
                        $this.attr('data-utilitytypename') +
                        ' Provider',
                    callback: function (contactId) {
                        $.when(me.getSupplier(contactId, $form)).done(
                            function () {
                                me.setDirty(true, target);
                            }
                        );
                    }
                });
            }
        );
    },

    initControls: function () {
        var me = this;
        me.$root.find('select').not('.is-customised').customSelect();

        $.each(me.$root.find('.tip'), function (i, v) {
            var $q = $(v);

            $q.qtip({
                content: $q.next('.item-list').html(),
                position: {
                    my: 'top middle',
                    at: 'bottom middle'
                },
                show: {
                    event: 'mouseenter',
                    ready: false,
                    delay: 0,
                    effect: function () {
                        $(this).fadeIn(50);
                    },
                    solo: true
                },
                hide: 'mouseleave',
                style: {
                    tip: true,
                    classes: 'qtip-dark'
                }
            });
        });

        return me;
    },

    getSupplier: function (contactId, $row) {
        var searcher = new gmgps.cloud.ui.views.contact.contactSearcher();

        $.when(
            searcher.performSearch({
                Ids: [contactId],
                ApplyFurtherFilteringtoIds: false
            })
        ).done(function (res) {
            if (res && res.List.length === 1) {
                var c = res.List[0];

                $row.find('#ContactId').val(c.Id);
                $row.find('#Utility_ContactId').val(c.Id);
                $row.find('.name').text(c.CompanyName).show();
                $row.find('.name').attr('data-id', c.Id);
                $row.find('.phone').show();
                $row.find('.not-set').removeClass('set');
                $row.find('.remove-button').show();
            }
        });
    }
};
