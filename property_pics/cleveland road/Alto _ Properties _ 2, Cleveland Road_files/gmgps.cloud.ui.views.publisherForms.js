gmgps.cloud.ui.views.publisherTemplates = function (args) {
    var me = this;
    me.cfg = args;
    me.$root = args.$root;
    me.http =
        args.http || new gmgps.cloud.http("publisherForms-publisherTemplates");

    me.customisedTemplate =
        (me.$root.find('#_customisedTemplate').val() || '').toLowerCase() ==
        'true';
    me.propertyDefaultTemplateId = parseInt(
        me.$root.find('#_propertyDefaultTemplateId').val()
    );
    me.defaultTemplateId = parseInt(me.$root.find('#_defaultTemplateId').val());
    me.templateType = parseInt(me.$root.find('#_templateType').val());
    me.templateId = 0;

    me.branchDefaultBrochureTemplateId = parseInt(
        me.$root.find('#BranchDefaultBrochureTemplateId').val()
    );
    me.branchDefaultWindowCardTemplateId = parseInt(
        me.$root.find('#BranchDefaultWindowCardTemplateId').val()
    );
    me.branchDefaultBrowseSheetTemplateId = parseInt(
        me.$root.find('#BranchDefaultBrowseSheetTemplateId').val()
    );

    me.propertyIds = me.$root.find('#_propertyIds').val().split(',');
    for (var id in me.propertyIds) {
        me.propertyIds[id] = parseInt(me.propertyIds[id]);
    }

    me.init(args);

    return true;
};

gmgps.cloud.ui.views.publisherTemplates.typeName =
    'gmgps.cloud.ui.views.publisherTemplates';

gmgps.cloud.ui.views.publisherTemplates.prototype = {
    init: function () {
        var me = this;

        me.documentPermission = new gmgps.cloud.Permission(
            C.Permissions.TransactionRefs.Txn_DocumentTemplate,
            C.Permissions.UserAccessLevels.ReadOnly
        );
        me.documentPermission.demand();

        me.customisationPermission = new gmgps.cloud.Permission(
            C.Permissions.TransactionRefs.Txn_CustomiseTemplate,
            C.Permissions.UserAccessLevels.ReadWrite
        );
        me.customisationPermission.demand();

        me.$quickFormatSelection = me.$root.find('#quick-format-selection');

        me.$sortOrderSelection = me.$root.find('#sort-order-selection');

        me.$root.find('select').customSelect();
        me.$window = me.$root.closest('.window');

        //Locked?
        if (me.$root.find('#locked').val() == 'true') {
            showInfo(
                'You must set the default branch templates before you can use this feature.'
            );
            setTimeout(function () {
                me.$window.find('.cancel-button').trigger('click');
            }, 1);
            return false;
        }

        var caption =
            me.templateType ==
            C.DocumentTemplateType.PublisherPropertyBrowseSheet
                ? 'Create PDF'
                : 'Use this Template';

        var $useButton = $(
            '<div class="btn use-button bgg-property" style="min-width: 100px; float: right;">{0}</div>'.format(
                caption
            )
        );
        $useButton.insertAfter(me.$window.find('.buttons .cancel-button'));

        me.$root.find('.sort-order').insertAfter($useButton);

        //Determine the starting template to select.
        switch (me.templateType) {
            case C.DocumentTemplateType.PublisherPropertyBrochure:
            case C.DocumentTemplateType.PublisherPropertyWindowCard:
                if (me.propertyDefaultTemplateId > 0) {
                    //The property has a stock template assigned.
                    me.templateId = me.propertyDefaultTemplateId;
                } else {
                    if (me.customisedTemplate) {
                        //The property has a customised template assinged.
                        me.templateId = 0;
                    } else {
                        //No template assigned - use the default.
                        switch (me.templateType) {
                            case C.DocumentTemplateType
                                .PublisherPropertyBrochure:
                                me.templateId =
                                    me.branchDefaultBrochureTemplateId;
                                break;
                            case C.DocumentTemplateType
                                .PublisherPropertyWindowCard:
                                me.templateId =
                                    me.branchDefaultWindowCardTemplateId;
                                break;
                        }
                    }
                }
                break;
            case C.DocumentTemplateType.PublisherPropertyBrowseSheet:
                me.templateId = me.branchDefaultBrowseSheetTemplateId;
                break;
        }

        $useButton.on('click', function (e) {
            if ($(e.target).hasClass('disabled')) {
                return this;
            }

            //Browse sheets open right away.  For other types, a default is just being set against a property.
            if (
                me.templateType ==
                C.DocumentTemplateType.PublisherPropertyBrowseSheet
            ) {
                me.documentPermission.demand(false);
                if (me.documentPermission.isGranted) {
                    gmgps.cloud.helpers.general.openPublisher({
                        settings: {
                            testMode: e.shiftKey ? true : false,
                            createNew: false,
                            forPrint: true,
                            forThumb: false,
                            designMode: 0,
                            templateType: me.templateType,
                            templateId: me.templateId,
                            propertyIds: me.propertyIds,
                            printFormat: 0,
                            sortOrderBy: me.sortOrderBy,
                            sortOrderType: me.sortOrderType,
                            captureLog: e.ctrlKey
                        }
                    });
                }

                return false;
            }

            var after = function () {
                var brochureCheck = function (result, message) {
                    me.$root.find('.property-brochure-check-msg').remove();

                    if (
                        result ==
                        gmgps.cloud.helpers.property.BROCHURE_RENDER_TIMEOUT
                    ) {
                        return;
                    }

                    if (
                        result !==
                        gmgps.cloud.helpers.property
                            .BROCHURE_RENDER_FAILED_OUTRIGHT
                    ) {
                        gmgps.cloud.helpers.property.setPropertyTemplate(
                            {
                                templateType: me.templateType,
                                templateId: me.templateId,
                                propertyId: me.propertyIds[0]
                            },
                            function () {
                                $.jGrowl(
                                    'The template has been set successfully.',
                                    {
                                        header: 'Template Set',
                                        theme: 'growl-system'
                                    }
                                );
                            }
                        );
                    } else {
                        $.jGrowl('The template has not been set: ' + message, {
                            header: 'Template Not Set',
                            theme: 'growl-system'
                        });
                    }
                };

                // only check
                if (me.documentPermission.isGranted || me.customisationPermission.isGranted) {
                    if (
                        me.templateType ==
                        C.DocumentTemplateType.PublisherPropertyBrochure
                    ) {
                        me.$root.append(
                            '<div class="property-brochure-check-msg" style="position: absolute; bottom: 10px; right: 10px; background-color: #a0a0a0; color: #ffffff; padding: 5px; font-style: italic;">Checking Brochure...</div>'
                        );
                        gmgps.cloud.helpers.property.checkPropertyBrochure(
                            me.cfg.data.publisherIframe,
                            me.templateId,
                            me.propertyIds[0],
                            brochureCheck
                        );
                    } else {
                        brochureCheck(
                            gmgps.cloud.helpers.property.BROCHURE_RENDER_OK
                        );
                    }
                } else {
                    $.jGrowl('The template has not been set', {
                        header: 'Template Not Set',
                        theme: 'growl-system'
                    });
                }
            };

            //If the template being assigned is not specific to this property, warn that any existing, custom template will be lost.
            if (me.templateId != 0) {
                var msg =
                    'You are about to change the default template for this property.<br/><br/>Are you sure?';
                msg +=
                    '<br/><br/>Warning: If this property uses a custom, specially designed or tweaked template, it will be lost during this change.';

                showDialog({
                    type: 'question',
                    title: 'Set Template?',
                    msg: msg,
                    buttons: {
                        Yes: function () {
                            $(this).dialog('close');
                            after();
                        },
                        No: function () {
                            $(this).dialog('close');
                        }
                    }
                });
            } else {
                after();
            }
        });

        me.$root.on('click', '.preview-button', function (e) {
            var currentlySelectedTemplateId = parseInt(
                me.$quickFormatSelection.val()
            );

            gmgps.cloud.helpers.general.openPublisher({
                settings: {
                    testMode: e.shiftKey ? true : false,
                    createNew: false,
                    forPrint: true,
                    forThumb: false,
                    designMode: 0,
                    templateType: me.templateType,
                    templateId: currentlySelectedTemplateId,
                    propertyIds: me.propertyIds,
                    printFormat: 0,
                    isPreview: true,
                    captureLog: e.ctrlKey
                }
            });
        });

        me.$root.on('click', '.customise-button', function (e) {
            var action = $(e.target).text().toLowerCase();
            var currentlySelectedTemplateId = parseInt(me.templateId);

            var openPublisher = function () {
                gmgps.cloud.helpers.general.openPublisher({
                    settings: {
                        designMode: C.PublisherDesignMode.Template,
                        templateType: me.templateType,
                        templateId: currentlySelectedTemplateId,
                        templateSource: C.PublisherTemplateSources.Property,
                        propertyIds: me.propertyIds,
                        printFormat: 0,
                        captureLog: e.ctrlKey
                    }
                });
            };

            var setTemplate = function () {
                me.http.ajax(
                    {
                        url: '/property/setcustomtemplate',
                        type: 'POST',
                        dataType: 'json',
                        args: {
                            propertyId: me.propertyIds[0],
                            sourceTemplateId: currentlySelectedTemplateId,
                            templateType: me.templateType
                        }
                    },
                    function () {
                        setTimeout(function () {
                            if (action == 'edit') {
                                me.$window
                                    .find('.cancel-button')
                                    .trigger('click');
                            } else {
                                showDialog({
                                    type: 'info',
                                    title: 'Custom Template Created',
                                    msg: 'A custom template has been created',
                                    buttons: {
                                        OK: function () {
                                            $(this).dialog('close');
                                            me.$window
                                                .find('.cancel-button')
                                                .trigger('click');
                                        }
                                    }
                                });
                            }
                        }, 1);

                        openPublisher();
                    }
                );
            };

            //If the template being assigned is not specific to this property, warn that any existing, custom template will be lost.
            if (currentlySelectedTemplateId != 0) {
                showDialog({
                    type: 'question',
                    title: 'Set Template?',
                    msg:
                        'You are about to change the default template for this property.<br/><br/>Are you sure?' +
                        '<br/><br/>Warning: If this property uses a custom template, it will be lost during this change.',
                    buttons: {
                        Yes: function () {
                            $(this).dialog('close');
                            setTemplate();
                        },
                        No: function () {
                            $(this).dialog('close');
                        }
                    }
                });
            } else {
                setTemplate();
            }
        });

        //Setup template browser.
        var frameId = me.getTemplateFrameId(me.templateId);
        if (frameId == 0) {
            if (
                me.templateType !=
                C.DocumentTemplateType.PublisherPropertyBrowseSheet
            ) {
                me.templateId = 0;
                showInfo(
                    'This property was set to use a stock template which has since been deleted.'
                );
            }
            frameId = undefined;
        }

        me.$root.find('.templates').boutique({
            container_width: '100%',
            front_img_width: 300,
            front_img_height: 300,
            front_topmargin: 0,
            starter: frameId,
            speed: 250,
            hovergrowth: 0,
            behind_opac: 0.5,
            back_opac: 0.3,
            behind_size: 0.7,
            behind_distance: 70,
            back_size: 0.4,
            autointerval: 0,
            freescroll: true,
            text_front_only: true,
            keyboard: false,
            move_callback: function (id) {
                me.templateId = me.getFrameTemplateId(id);
                me.$quickFormatSelection
                    .val(me.templateId)
                    .trigger('prog-change');
                me.setCustomiseButtonText();
                me.setUseTemplateButtonEnabled();
            }
        });

        //Initial value in quick format selection.
        me.$quickFormatSelection.val(me.templateId).trigger('prog-change');

        //Quick Format Selection > Change
        me.$quickFormatSelection.on('change', function () {
            me.templateId = parseInt($(this).val());
            var frameId = me.getTemplateFrameId(me.templateId);
            if (frameId && frameId > 0) {
                // eslint-disable-next-line no-undef
                coverflow_goto(frameId);
            }

            me.setCustomiseButtonText();
            me.setUseTemplateButtonEnabled();
        });

        //Sort Order Selection > Change
        me.$sortOrderSelection.on('change', function () {
            var opt = $(this.options[this.selectedIndex]);
            me.sortOrderBy = parseInt(opt.data('order'));
            me.sortOrderType = parseInt(opt.data('type'));
        });

        //Initial value in sort order selection.
        me.$sortOrderSelection.trigger('change');

        //Sortable browse sheet items (browse sheet only).
        if (
            me.templateType ==
            C.DocumentTemplateType.PublisherPropertyBrowseSheet
        ) {
            me.$root.find('.checklist .body').sortable({
                axis: 'y'
            });
        }

        if (me.customisationPermission.isGranted) {
            $('.customise-button').show();
            me.setCustomiseButtonText();
        } else {
            $('.customise-button').hide();
        }

        me.setUseTemplateButtonEnabled();

        setupTips(me.$root);
    },

    setUseTemplateButtonEnabled: function () {
        var me = this;

        if (me.customisedTemplate && me.templateId == 0) {
            $('.use-button').addClass('disabled');
        } else {
            $('.use-button').removeClass('disabled');
        }
    },

    setCustomiseButtonText: function () {
        var me = this;

        if (me.customisedTemplate && me.templateId == 0) {
            $('.customise-button').text('Edit');
        } else {
            $('.customise-button').text('Customise');
        }
    },

    getTemplateFrameId: function (templateId) {
        //Return the frameId of the specified template.
        var me = this;
        var $a = me.$root.find(
            '.templates li a[data-templateId="{0}"]'.format(templateId)
        );
        if ($a.length == 0) {
            //No frame exists for the requested templateId.
            return 0;
        } else {
            return parseInt($a.attr('data-id'));
        }
    },

    getFrameTemplateId: function (id) {
        //Return the templateId of the specified frame.
        var me = this;
        var $a = me.$root.find('.templates li a[data-id="{0}"]'.format(id));
        return parseInt($a.attr('data-templateId'));
    }
};

gmgps.cloud.ui.views.publisherPrintFormats = function (args) {
    var me = this;
    me.cfg = args;
    me.$root = args.$root;

    me.init(args);

    return true;
};

gmgps.cloud.ui.views.publisherPrintFormats.prototype = {
    init: function () {
        var me = this;

        //Add zero value options to branch and brand dropdowns, for branch/brand agnostic templates.
        me.$root
            .find('#BranchId')
            .prepend('<option value="0">Available to all branches</option>')
            .val(0);
        me.$root
            .find('#BrandId')
            .prepend('<option value="0">For use with all brands</option>')
            .val(0);

        me.$root.find('select').customSelect();

        //Filter > Change
        me.$root.on('change', '.filter', function () {
            var pages = 'x {0} P'.format(me.$root.find('#pages').val());
            var size = me.$root.find('#page-size').val();
            var orientation = me.$root.find('#orientation').val();

            //Show all formats.
            me.$root.find('.format').show();

            //Filter.
            if (pages != 'x 0 P') {
                me.$root
                    .find('.format .description')
                    .not(':contains({0})'.format(pages))
                    .parent()
                    .hide();
            }
            if (size == '-1') {
                me.$root
                    .find(
                        '.format .description:contains("4A0"), .format .description:contains("2A0"), .format .description:contains("A1"), .format .description:contains("A2"), .format .description:contains("A3"), .format .description:contains("A4"), .format .description:contains("A5"), .format .description:contains("A6")'.format(
                            pages
                        )
                    )
                    .parent()
                    .hide();
            } else {
                if (size != '0') {
                    me.$root
                        .find('.format .description')
                        .not(':contains({0})'.format(size))
                        .parent()
                        .hide();
                }
            }
            if (orientation != '0') {
                me.$root
                    .find('.format .description')
                    .not(':contains({0})'.format(orientation))
                    .parent()
                    .hide();
            }

            //Always show the custom format, and select it.
            me.$root.find('.format.on').removeClass('on');
            me.$root.find('.format.x-custom').show().addClass('on');
        });

        //Format >> Click
        me.$root.on('click', '.format', function () {
            me.$root.find('.format.on').removeClass('on');
            $(this).addClass('on');
        });
    },

    action: function (callback) {
        var me = this;

        //Get the selected template code and document type.
        var templateType = parseInt(
            me.$root.find('#DefaultTemplateType').val()
        );
        var printFormat = parseInt(me.$root.find('.format.on').attr('data-id'));

        //Open the publisher in template design mode.
        gmgps.cloud.helpers.general.openPublisher({
            settings: {
                branchId: parseInt(me.$root.find('#BranchId').val()),
                brandId: parseInt(me.$root.find('#BrandId').val()),
                createNew: true,
                forPrint: false,
                forThumb: false,
                designMode: C.PublisherDesignMode.Template,
                templateType: templateType,
                printFormat: printFormat
            }
        });

        callback();
    }
};
