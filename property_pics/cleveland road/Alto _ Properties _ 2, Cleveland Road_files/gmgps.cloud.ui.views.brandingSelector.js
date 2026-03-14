gmgps.cloud.ui.views.brandingSelector = function (args) {
    var me = this;
    me.cfg = args;
    me.$root = args.$root;

    me.$brandStore = me.$root.find('.brand-store');
    me.$branches = me.$root.find('.branches');
    me.$brands = me.$root.find('.brands');

    me.branchId = 0;
    me.brandId = 0;
    me.branchName = '';
    me.brandName = '';

    me.init(args);

    return true;
};

gmgps.cloud.ui.views.brandingSelector.prototype = {
    init: function () {
        var me = this;

        //Branch > Click
        me.$root.on('click', '.branches .item', function () {
            var id = parseInt($(this).attr('data-id'));
            me.selectBranch(id);
        });

        //Brand > Click
        me.$root.on('click', '.brands .item', function () {
            var id = parseInt($(this).attr('data-id'));
            me.selectBrand(id);
        });

        //Programmatically‎ select the branch which was highlighted by the server.
        me.branchId = parseInt(me.$branches.find('.item.on').attr('data-id'));
        me.selectBranch(me.branchId);
    },

    selectBranch: function (id) {
        var me = this;
        var $branch = me.$branches.find('.item[data-id="{0}"]'.format(id));

        me.branchId = id;
        me.branchName = $branch.text();

        //De-select the currently branch, select the required one.
        me.$branches.find('.item.on').removeClass('on');
        $branch.addClass('on').scrollintoview();

        //Get the brandIds and the defaultBrandId for the branch.
        var brandIds = $branch.attr('data-brandIds').split(',');
        me.brandId = parseInt($branch.attr('data-defaultBrandId'));

        //Clear brands.
        me.$brands.empty();

        //Fetch brands from the brand store.
        $.each(brandIds, function (i, v) {
            var $brand = me.$brandStore
                .find('.item[data-id="{0}"]'.format(v))
                .clone();
            $brand.appendTo(me.$brands);
        });
        me.$brands.find('.item').fadeIn();

        //Select the default brand for the branch.
        me.selectBrand(me.brandId);
    },

    selectBrand: function (id) {
        var me = this;

        var $brand = me.$brands.find('.item[data-id="{0}"]'.format(id));

        me.brandId = id;
        me.brandName = $brand.text();

        //De-select the currently branch, select the required one.
        me.$brands.find('.item.on').removeClass('on');
        $brand.addClass('on').scrollintoview();
    }
};
