gmgps.cloud.ui.views.orderPrintedBrochure = function (args) {
    var me = this;
    me.$window = null;
    me.$root = args.$root;
    me.id = 0;
    me.isDirty = false;
    me.brochureQuantities = [30, 40, 50, 75, 100];
    me.windowcardQuantities = [1, 2, 5, 10];
    me.http = new gmgps.cloud.http(
        "orderPrintedBrochures-orderPrintedBrochure"
    );

    me.init();

    return true;
};

gmgps.cloud.ui.views.orderPrintedBrochure.prototype = {
    init: function () {
        var me = this;
        me.id = parseInt(me.$root.find('#PropertyId').val());
        me.$window = me.$root.closest('.window');

        me.setDirty(true);
        me.$root.find('.dropdown').customSelect();

        me.$window.find('.bottom .action-button').removeClass('grey');
        me.$window.find('.bottom .action-button').addClass('bgg-red');

        me.$root.find('.windowcard-templates').fadeOut();

        var weHaveOptions =
            me.checkHasOptions(
                C.DocumentTemplateType.PublisherPropertyBrochure
            ) || me.checkHasOptions(C.DocumentTemplateType.PublisherWindowCard);

        if (weHaveOptions) {
            //we are not expecting to be fixing these things on the fly (just yet) so dont do the usual init routine
            me.updatePapers();

            me.$root.find('#DocumentType').on('change', function () {
                var type = $(this).val();
                if (type == C.DocumentTemplateType.PublisherPropertyBrochure) {
                    me.$root.find('.brochure-templates').fadeIn();
                    me.$root.find('.windowcard-templates').fadeOut();
                    me.toggleHasOptions(
                        me.checkHasOptions(
                            C.DocumentTemplateType.PublisherPropertyBrochure
                        )
                    );
                    me.setQuantitiesForDocumentType(
                        C.DocumentTemplateType.PublisherPropertyBrochure
                    );
                } else if (
                    type == C.DocumentTemplateType.PublisherPropertyWindowCard
                ) {
                    me.$root.find('.brochure-templates').fadeOut();
                    me.$root.find('.windowcard-templates').fadeIn();
                    me.toggleHasOptions(
                        me.checkHasOptions(
                            C.DocumentTemplateType.PublisherPropertyWindowCard
                        )
                    );
                    me.setQuantitiesForDocumentType(
                        C.DocumentTemplateType.PublisherPropertyWindowCard
                    );
                }
                me.updatePapers();
                //me.setDirty(true);
            });

            me.$root.find('#BrochureTemplateId').on('change', function () {
                me.updatePapers();
            });

            me.$root.find('#WindowCardTemplateId').on('change', function () {
                me.updatePapers();
            });

            me.$root.find('#PaperWeight').on('change', function () {
                me.updateFinishes();
                $(this).children('option[value="0"]').remove();
            });

            me.$root.find('#Finish').on('change', function () {
                $(this).children('option[value="0"]').remove();
                me.setDirty(false);
            });

            me.$root.find('#DeliveryBranchId').on('change', function (e) {
                var selectedBranch = $(e.target).find('option:selected');
                me.$root.find('#DeliveryBranchName').val(selectedBranch.text());
                me.$root
                    .find('#DeliveryBranchPrintCode')
                    .val(selectedBranch.attr('data-print-code'));
            });

            me.$root.find('#Submit').on('click', function () {
                me.placePrintedBrochureOrder();
            });
        } else {
            me.toggleHasOptions(false);
        }
    },

    checkHasOptions: function (type) {
        var me = this;
        if (type == C.DocumentTemplateType.PublisherPropertyBrochure)
            return me.$root.find('#BrochureTemplateId option').length > 0;
        if (type == C.DocumentTemplateType.PublisherPropertyWindowCard)
            return me.$root.find('#WindowCardTemplateId option').length > 0;
        else return false;
    },

    toggleHasOptions: function (showForm) {
        var me = this;
        if (showForm) {
            me.$root.find('#orderPrintedBrochureForm').fadeIn();
        } else {
            me.$root.find('#orderPrintedBrochureForm').hide();
        }
    },

    getSelectedPrintFormat: function () {
        var me = this;

        //var templateId;
        var printFormat;
        var selectedTemplate;
        if (
            me.$root.find('#DocumentType').val() ==
            C.DocumentTemplateType.PublisherPropertyBrochure
        ) {
            selectedTemplate = me.$root.find(
                '#BrochureTemplateId option:selected'
            );
            printFormat = $.parseJSON(selectedTemplate.attr('data-format'));
        } else {
            selectedTemplate = me.$root.find(
                '#WindowCardTemplateId option:selected'
            );
            printFormat = $.parseJSON(selectedTemplate.attr('data-format'));
        }

        return printFormat;
    },

    updatePapers: function () {
        var me = this;

        var printFormat = me.getSelectedPrintFormat();

        me.http.ajax(
            {
                url: 'PrintedBrochureOrder/GetPapersForPrintFormat',
                args: printFormat,
                type: 'post',
                complex: true,
                dataType: 'json'
            },
            function (data) {
                var select = me.$root.find('#PaperWeight');
                select.html(data.Data);
                select.val(0);

                switch (select.children('option').length) {
                    case 0: {
                        me.updateError(
                            'There are no print formats that support the selected template, please choose another.'
                        );
                        me.$root.find("dt[data-id='paperControl']").hide();
                        me.$root.find("dd[data-id='paperControl']").hide();
                        me.$root.find("dt[data-id='quantityControl']").hide();
                        me.$root.find("dd[data-id='quantityControl']").hide();
                        me.$root.find("dt[data-id='finishControl']").hide();
                        me.$root.find("dd[data-id='finishControl']").hide();
                        me.setDirty(true);
                        break;
                    }
                    case 1: {
                        me.updateError('');
                        me.checkTemplateChange();
                        me.$root.find("dt[data-id='paperControl']").show();
                        me.$root.find("dd[data-id='paperControl']").show();
                        me.$root.find("dt[data-id='quantityControl']").show();
                        me.$root.find("dd[data-id='quantityControl']").show();
                        select
                            .children('option:first-child')
                            .attr('selected', 'selected');
                        select
                            .siblings('.customStyleSelectBox')
                            .children('.customStyleSelectBoxInner')
                            .html(select.children('option:first-child').text());
                        select.change();
                        break;
                    }
                    default: {
                        me.updateError('');
                        me.checkTemplateChange();
                        me.$root.find("dt[data-id='paperControl']").show();
                        me.$root.find("dd[data-id='paperControl']").show();
                        me.$root.find("dt[data-id='quantityControl']").show();
                        me.$root.find("dd[data-id='quantityControl']").show();
                        select.prepend(
                            '<option value="0">-- Please Select --</option>'
                        );
                        select
                            .siblings('.customStyleSelectBox')
                            .children('.customStyleSelectBoxInner')
                            .html('-- Please Select --');
                        select.val(0);
                        me.$root.find("dt[data-id='finishControl']").hide();
                        me.$root.find("dd[data-id='finishControl']").hide();
                        me.setDirty(true);
                        break;
                    }
                }
            }
        );

        me.updateIcon();
    },

    updateIcon: function () {
        var me = this;

        var printFormat = me.getSelectedPrintFormat();

        var icon = me.$root.find('#FormatIcon');
        icon.fadeOut(function () {
            icon.children('#IconImage').attr(
                'src',
                '/content/media/images/gui/publisher/printformats/{0}.png'.format(
                    printFormat.Code
                )
            );
            icon.children('#IconImage').attr('alt', printFormat.FormatLabel);
            icon.children('#IconTitle').html(printFormat.FormatLabel);
            icon.fadeIn();
        });
    },

    updateFinishes: function () {
        var me = this;

        if (me.$root.find('#PaperWeight').val() == null) {
            me.$root.find("dt[data-id='finishControl']").hide();
            me.$root.find("dd[data-id='finishControl']").hide();
            return;
        }

        var printFormat = me.getSelectedPrintFormat();

        me.http.ajax(
            {
                url: 'PrintedBrochureOrder/GetFinishForPrintFormatPaper',
                args: {
                    printFormat: printFormat,
                    paperId: me.$root.find('#PaperWeight').val()
                },
                type: 'post',
                complex: true,
                dataType: 'json'
            },
            function (data) {
                var select = me.$root.find('#Finish');
                select.html(data.Data);
                select.val(0);

                switch (select.children('option').length) {
                    case 0: {
                        me.$root.find("dt[data-id='finishControl']").hide();
                        me.$root.find("dd[data-id='finishControl']").hide();
                        me.setDirty(false); //orders now support papers without finishes for light box cards
                        break;
                    }
                    case 1: {
                        me.$root.find("dt[data-id='finishControl']").show();
                        me.$root.find("dd[data-id='finishControl']").show();
                        select
                            .children('option:first-child')
                            .attr('selected', 'selected');
                        select
                            .siblings('.customStyleSelectBox')
                            .children('.customStyleSelectBoxInner')
                            .html(select.children('option:first-child').text());
                        me.setDirty(false);
                        break;
                    }
                    default: {
                        me.$root.find("dt[data-id='finishControl']").show();
                        me.$root.find("dd[data-id='finishControl']").show();
                        select.prepend(
                            '<option value="0">-- Please Select --</option>'
                        );
                        select
                            .siblings('.customStyleSelectBox')
                            .children('.customStyleSelectBoxInner')
                            .html('-- Please Select --');
                        me.setDirty(true);
                        break;
                    }
                }
            }
        );
    },

    setDirty: function (dirty) {
        var me = this;
        if (me.isDirty !== dirty) {
            me.isDirty = dirty;
            if (dirty) {
                //Dirty
                me.$root.find('#OrderBrochureActions').hide();
                me.$window.find('.bottom .action-button').addClass('disabled');
            } else {
                //Clean
                me.$root.find('#OrderBrochureActions').show();
                me.$window
                    .find('.bottom .action-button')
                    .removeClass('disabled');
            }
        }
    },

    action: function (callback) {
        var me = this;

        me.$window.find('.action-button').lock();

        var formForValidation = me.$root.find('#PrintedBrochuresForm');
        formForValidation.validationEngine({ scroll: false });
        formForValidation.validationEngine('hide');

        var isValid = formForValidation.validationEngine('validate');
        if (!isValid) {
            me.$window.find('.action-button').unlock();
            return;
        }

        var form = me.$root.find('#PrintedBrochuresForm').serialize();

        new gmgps.cloud.http("orderPrintedBrochures-action").ajax(
            {
                args: form,
                complex: false,
                dataType: 'json',
                type: 'post',
                url: '/PrintedBrochureOrder/Submit',
                timeout: 120000
            },
            function (response) {
                if (response.ErrorData == null) {
                    //showInfo('Your order has been successfully placed');
                    callback(false);
                    return true;
                } else {
                    showError(
                        'There was an issue placing your order, please try again, try a different template or contact the support team.'
                    );
                    me.$window.find('.action-button').unlock();
                }
            }
        );
    },

    checkTemplateChange: function () {
        var me = this;
        var templateChanged;
        if (
            me.$root.find('#DocumentType').val() ==
            C.DocumentTemplateType.PublisherPropertyBrochure
        )
            templateChanged =
                me.$root.find('#BrochureTemplateId').val() !=
                $('#PropertyDefaultBrochureTemplateId').val();
        else
            templateChanged =
                me.$root.find('#WindowCardTemplateId').val() !=
                $('#PropertyDefaultWindowCardTemplateId').val();

        if (templateChanged) {
            me.updateWarning(
                "The property's default template will be updated to the new template you have selected."
            );
        } else {
            me.updateWarning('');
        }

        me.updateValidationRules(me.$root.find('#DocumentType').val());
    },

    updateError: function (message) {
        var me = this;
        if (message.length > 0) {
            me.$root.find('#Warning').html('');
        }
        me.$root.find('#Error').html(message);
    },

    updateWarning: function (message) {
        var me = this;
        me.$root.find('#Warning').html(message);
    },

    updateValidation: function (message) {
        var me = this;
        me.$root.find('#Validation').html(message);
    },

    updateValidationRules: function (documentType) {
        var me = this;

        var validationQuantityInput = me.$root.find(
            '#PrintedBrochuresForm input#Quantity'
        );
        var validationText = me.$root.find(
            '#PrintedBrochuresForm p.quantity-text'
        );

        if (documentType == C.DocumentTemplateType.PublisherPropertyBrochure) {
            validationQuantityInput.removeClass(
                'validate[required,min[1],max[100]]'
            );
            validationQuantityInput.addClass(
                'validate[required,min[8],max[100]]'
            );

            if (validationQuantityInput.val() === '1') {
                validationQuantityInput.val('30');
            }

            validationText.text(
                'Please enter a quantity between 8 and 100 units'
            );
        } else {
            validationQuantityInput.removeClass(
                'validate[required,min[8],max[100]]'
            );
            validationQuantityInput.addClass(
                'validate[required,min[1],max[100]]'
            );
            if (validationQuantityInput.val() === '30') {
                validationQuantityInput.val('1');
            }

            validationText.text(
                'Please enter a quantity between 1 and 100 units'
            );
        }
    },

    setQuantitiesForDocumentType: function (type) {
        var me = this;
        var dropdown = me.$root.find('#Quantity');
        var arr;

        if (type == C.DocumentTemplateType.PublisherPropertyBrochure)
            arr = me.brochureQuantities;
        else arr = me.windowcardQuantities;

        dropdown.html('');

        for (var i = 0; i < arr.length; i++) {
            var q = arr[i];
            $(dropdown).append('<option value="' + q + '">' + q + '</option>');
        }

        dropdown.children('option:first-child').attr('selected', 'selected');
        dropdown
            .siblings('.customStyleSelectBox')
            .children('.customStyleSelectBoxInner')
            .html(dropdown.children('option:first-child').text());
    }
};
