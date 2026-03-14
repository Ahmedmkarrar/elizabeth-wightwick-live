gmgps.cloud.ui.views.documentbrowser = function (args) {
    var me = this;
    me.$root = args.$root;
    me.init(args);

    return this;
};

gmgps.cloud.ui.views.documentbrowser.typeName =
    'gmgps.cloud.ui.views.documentbrowser';

gmgps.cloud.ui.views.documentbrowser.prototype = {
    init: function () {
        var me = this;

        //show item count
        me.showSelectedCount();

        //hide sub menus
        me.$root.find('ul li ul').hide();
        me.$root.on('click', '.source-item .expander', function () {
            $(this).closest('.source-item').find('ul').fadeToggle();
        });

        // preview property brochure

        me.$root.on('click', '.item-row .property-brochure', function () {
            var id = $(this).data('id');
            gmgps.cloud.helpers.general.openPublisher({
                settings: {
                    createNew: false,
                    forPrint: true,
                    forThumb: false,
                    designMode: C.PublisherDesignMode.Unspecified,
                    templateType:
                        C.DocumentTemplateType.PublisherPropertyBrochure,
                    templateId: 0,
                    propertyIds: [id],
                    printFormat: 0
                }
            });
        });

        //select/deselect all
        me.$root.on('click', '.section-selector', function () {
            var item = $(this).closest('.source-item');
            if (this.checked) {
                //do not select items that have been filtered out
                var filters = item.find('.filter');
                var filteredCategories = new Array();
                for (var i = 0; i < filters.length; i++) {
                    var filter = filters[i];
                    if (!$(filter).hasClass('on')) {
                        filteredCategories.push(
                            $(filter).attr('data-category')
                        );
                    }
                }
                var selectors = item.find('.selector');
                for (var n = 0; n < selectors.length; n++) {
                    var selector = selectors[n];
                    if (
                        filteredCategories.indexOf(
                            $(selector).attr('data-category')
                        ) < 0
                    ) {
                        $(selector)
                            .attr('checked', true)
                            .parent()
                            .addClass('ticked');
                    }
                }
            } else {
                item.find('.selector')
                    .attr('checked', false)
                    .parent()
                    .removeClass('ticked');
            }

            //update item count
            me.showSelectedCount();
        });

        //check if all selected
        me.$root.on('click', '.selector', function () {
            me.applyAllSelected(this);

            //update item count
            me.showSelectedCount();
        });

        //filters
        me.$root.on('click', '.filter', function () {
            var category = $(this).attr('data-category');
            var items = $(this).closest('li.source-item').find('li.item');
            for (var i = 0; i < items.length; i++) {
                var item = items[i];
                if ($(item).attr('data-category') == category) {
                    $(item).fadeToggle();
                }
            }

            //check if all selected has been effected
            me.applyAllSelected(this);
        });
    },

    showSelectedCount: function () {
        var me = this;
        var total = me.$root.find('.selector').length;
        var selected = me.$root.find('.selector:checked').length;

        var message;
        if (selected == 1) {
            message = selected + ' item of ' + total + ' selected.';
        } else {
            message = selected + ' items of ' + total + ' selected.';
        }
        me.$root.find('.selectedCount').html(message);
    },

    applyAllSelected: function (source) {
        var items = $(source).closest('li.source-item').find('.selector');
        var itemsSelected = $(source)
            .closest('li.source-item')
            .find('.selector:checked');

        if (items.length == itemsSelected.length) {
            $(source)
                .closest('.source-item')
                .find('.section-selector')
                .attr('checked', true)
                .parent()
                .addClass('ticked');
        } else {
            $(source)
                .closest('.source-item')
                .find('.section-selector')
                .attr('checked', false)
                .parent()
                .removeClass('ticked');
        }
    },

    getItems: function () {
        //get array of selected items
        var me = this;
        var selection = me.$root.find('.selector:checked');
        var items = selection.map(function () {
            return [
                [
                    $(this).attr('data-id'),
                    $(this).attr('data-name'),
                    $(this).attr('data-type'),
                    $(this).attr('data-icon'),
                    $(this).attr('data-url'),
                    $(this).attr('data-modeltypeid'),
                    $(this).attr('data-fileyypeid'),
                    $(this).attr('data-category')
                ]
            ];
        });
        return items;
    },

    action: function () {
        var me = this;
        me.items = me.getItems();
    }
};
