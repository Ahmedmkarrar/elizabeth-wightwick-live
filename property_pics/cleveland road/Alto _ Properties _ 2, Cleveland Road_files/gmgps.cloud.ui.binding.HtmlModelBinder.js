((function() {
    function HtmlModelBinder() {
        this.bind = function (model, root) {
            if (model === null) {
                throw new Error('Model cannot be null');
            }

            if (root === null) {
                throw new Error('Root element cannot be null');
            }

            $.each(root.find('[data-model-name]'), function (ix, e) {
                var element = $(e);
                var modelName = element.attr('data-model-name');
                var bindingMode = element.attr('data-model-bind-as') || 'auto';

                var notationParts = modelName.split('.');

                var modelElement = model;
                for (var n = 0; n < notationParts.length; n++) {
                    modelElement = modelElement[notationParts[n]];
                    if (modelElement === undefined) {
                        break;
                    }
                }

                if (modelElement) {
                    if (bindingMode === 'text') {
                        element.text(modelElement);
                    } else if (element.is('select.is-customised')) {
                        element.val(modelElement);
                        element.trigger('change');
                    } else if (element.is(':input')) {
                        element.val(modelElement);
                    } else {
                        element.html(modelElement);
                    }

                    element.show();
                }
            });
        };
    }

    gmgps.cloud.ui.binding.HtmlModelBinder = HtmlModelBinder;
}))();
