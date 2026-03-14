gmgps.cloud.ui.behaviours.SelectAllBehaviour = function () {};

gmgps.cloud.ui.behaviours.SelectAllBehaviour.prototype = {
    apply: function ($target, total) {
        var allCheckText =
            typeof total == 'undefined' || total == 0
                ? 'All'
                : total + ' of ' + total;

        var text = $target.text();

        var $content = $target
            .closest('.ui-accordion-header')
            .next()
            .find('.checklist, .jstree');

        if (text == allCheckText) {
            //All items currently selected, so select none.
            $target.text('None');

            //Tickboxes
            $content
                .find('.tickbox.ticked')
                .removeClass('ticked')
                .find('input')
                .prop('checked', false);

            //Tree nodes
            $content
                .find('li.jstree-checked')
                .removeClass('jstree-checked jstree-undetermined')
                .addClass('jstree-unchecked');
        } else {
            //Either none selected currently, or some.  Select all.
            $target.text(allCheckText);

            //Tickboxes
            $content
                .find('.tickbox')
                .addClass('ticked')
                .find('input')
                .prop('checked', true);

            //Tree nodes
            $content
                .find('li')
                .addClass('jstree-checked')
                .removeClass('jstree-unchecked jstree-undetermined');
        }
    }
};
