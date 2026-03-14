gmgps.cloud.ui.views.writeLetterFromEvent = function (args) {
    var me = this;
    me.cfg = args;
    me.$root = args.$root;
    me.$window = null;

    me.init(args);
    return true;
};

gmgps.cloud.ui.views.writeLetterFromEvent.prototype = {
    init: function () {
        var me = this;

        me.$window = me.$root.closest('.window');

        me.$root.on('click', '.timeline-list .row', function () {
            var $row = $(this);

            me.$root.find('.timeline-list .row').removeClass('on');
            $row.addClass('on');

            me.$window.find('.action-button').removeClass('disabled');
        });

        //Start with the next button disabled.
        me.$window.find('.action-button').addClass('disabled');
    },

    action: function (callback) {
        var me = this;
        var $row = me.$root.find('.timeline-list .row.on');

        var afterChecks = function () {
            //Run the prompt for letters for the selected event.
            var eventId = parseInt($row.attr('data-id'));
            var eventCategoryId = parseInt($row.attr('data-eventCategoryId'));

            gmgps.cloud.helpers.general.promptForLetters({
                eventHeaders: [
                    {
                        Id: eventId,
                        Category: eventCategoryId,
                        NoOutput: false
                    }
                ],
                callback: function (hasLetters) {
                    if (hasLetters) {
                        callback();
                    } else {
                        showDialog({
                            type: 'info',
                            title: 'Nothing to Produce',
                            msg: 'There are no letters which are set to be associated with the selected entry in the timeline.<br/><br/>If you would like to produce letters for this type of event in future, you can copy an existing template and amend the associated event on the new template.',
                            buttons: {
                                Ok: function () {
                                    $(this).dialog('close');
                                }
                            }
                        });
                    }
                }
            });
        };

        if ($row.find('.view-document, .edit-document').length != 0) {
            showDialog({
                type: 'question',
                title: 'Existing Letter',
                msg: 'There is already a letter which has been generated for this event in the past.<br/><br/>Are you sure you would like to create another?  Alternatively, you can open the existing one from the timeline.',
                buttons: {
                    Yes: function () {
                        afterChecks();
                        $(this).dialog('close');
                    },
                    No: function () {
                        $(this).dialog('close');
                        return false;
                    }
                }
            });
        } else {
            afterChecks();
        }
    }
};

gmgps.cloud.ui.views.writeLetterFromTemplate = function (args) {
    var me = this;
    me.cfg = args;
    me.$root = args.$root;
    me.$window = null;
    me.http = new gmgps.cloud.http("writeletter-writeLetterFromTemplate");

    me.steps = {
        templates: 1,
        objects: 2
    };
    me.currentStep = me.steps.templates;

    me.defaultLetterViewToBranch =
        me.$root.find('#DefaultLetterViewToBranch').val() === 'True';

    me.init(args);

    return true;
};

gmgps.cloud.ui.views.writeLetterFromTemplate.prototype = {
    init: function () {
        var me = this;

        me.$root.find('select').customSelect();
        me.$window = me.$root.closest('.window');

        //Next/Prev > Click
        me.$window.on('click', '.next-button', function () {
            me.nextStep();
        });
        me.$window.on('click', '.prev-button', function () {
            me.prevStep();
        });

        //Inject Next/Prev buttons.
        me.$window
            .find('.bottom .buttons')
            .prepend(
                '<div class="btn prev-button bgg-grey" style="float: right;"><< Prev</div>'
            )
            .prepend(
                '<div class="btn next-button bgg-grey" style="float: right;">Next >></div>'
            )
            .prepend(me.$window.find('.cancel-button'));

        //Hide the original action button - not required.
        me.$window.find('.action-button').hide();

        //Document Template List > Click
        me.$root.on('click', '.document-template-list .row', function () {
            me.$root.find('.document-template-list .row.on').removeClass('on');
            $(this).addClass('on');
            me.$window.find('.next-button').removeClass('disabled');
        });

        //Document Template List > DblClick (preview)
        me.$root.on('dblclick', '.document-template-list .row', function () {
            var id = parseInt($(this).attr('data-id'));
            me.previewDocumentTemplate(id);
        });

        me.$root.on('change', '.tenancy-selector select', function (e) {
            var ddl = $(e.target);
            ddl.closest('.tenancy-selector').attr('data-id', ddl.val());
        });

        //DocumentTemplateList Filtering
        me.$root.on(
            'change',
            '#wlft-brand-filter, #wlft-branch-filter, #wlft-propertyrecordtype-filter',
            function () {
                me.processFilterChange();
            }
        );

        //AC's
        me.$root.find('.contact-ac').autoCompleteEx({
            modelType: C.ModelType.Contact,
            includeContacts: true,
            includeUsers: false,
            placeholder: 'Search Contacts ...',
            onSelected: function () {},
            onAfterSelected: function () {
                me.checkConsents();
            },
            onRemoved: function () {
                me.checkConsents();
            }
        });

        me.$root.find('.property-ac').autoCompleteEx({
            modelType: C.ModelType.Property,
            includeContacts: true,
            includeUsers: false,
            placeholder: 'Search Properties ...',
            onSelected: function () {},
            onAfterSelected: function () {
                var tenancySelector = me.$root.find('.tenancy-selector');
                if (tenancySelector.length === 0) {
                    return;
                }

                var propertyId = parseInt(
                    me.$root.find('.property-ac').attr('data-id'),
                    10
                );
                var currentTenancyPropertyId = parseInt(
                    tenancySelector.attr('data-property-id'),
                    10
                );

                if (propertyId === currentTenancyPropertyId) {
                    return;
                }

                me.http.ajax(
                    {
                        url: '/Tenancies/ForProperty',
                        args: {
                            propertyId: propertyId
                        },
                        complex: true,
                        dataType: 'json',
                        type: 'post'
                    },
                    function (response) {
                        tenancySelector.replaceWith(response.Data);

                        var newTenancySelector =
                            me.$root.find('.tenancy-selector');
                        newTenancySelector.find('select').customSelect();
                        newTenancySelector.show();
                    }
                );
            },
            onRemoved: function () {
                me.$root
                    .find('.tenancy-selector')
                    .attr('data-property-id', 0)
                    .hide();
            }
        });

        me.$root.find('.tenancy-ac').autoCompleteEx({
            modelType: C.ModelType.Tenancy,
            includeContacts: false,
            includeUsers: false,
            placeholder: 'Search Tenancies ...',
            onSelected: function () {}
        });

        me.$root.find('.supplier-ac').autoCompleteEx({
            modelType: C.ModelType.Supplier,
            includeContacts: true,
            includeUsers: false,
            placeholder: 'Search Suppliers ...',
            displayCompanyName: true,
            onSelected: function () {}
        });

        //Show the first step.
        me.gotoStep(me.currentStep);

        if (me.defaultLetterViewToBranch) {
            me.$root
                .find('#wlft-branch-filter')
                .val(shell.branchId)
                .trigger('prog-change');
            me.processFilterChange();
        }

        me.$window.find('.next-button').addClass('disabled');
    },

    processFilterChange: function () {
        var me = this;
        var brandId = parseInt(me.$root.find('#wlft-brand-filter').val());
        var branchId = parseInt(me.$root.find('#wlft-branch-filter').val());
        var propertyRecordTypeId = parseInt(
            me.$root.find('#wlft-propertyrecordtype-filter').val()
        );
        var $list = me.$root.find('.document-template-list');

        $list.find('.row').show();

        if (brandId != 0) {
            $list.find('.row[data-brandId!={0}]'.format(brandId)).hide();
        }
        if (branchId != 0) {
            $list.find('.row[data-branchId!={0}]'.format(branchId)).hide();
        }
        if (propertyRecordTypeId != 0) {
            $list
                .find(
                    '.row[data-propertyRecordTypeId!={0}]'.format(
                        propertyRecordTypeId
                    )
                )
                .hide();
        }

        //If, following filtering, the selected row is no longer visible, disable the next button.
        if ($list.find('.on:visible').length == 0) {
            me.$window.find('.next-button').addClass('disabled');
        }
    },

    checkConsents: function () {
        var me = this;

        var binding = new gmgps.cloud.ui.binding.ConsentMessageBinding(
            '.recipients .recipient input.contact-ac:not([data-value="0"])',
            me.$root
        );
        binding.activate(['general-marketing', 'property-matching']);
    },

    previewDocumentTemplate: function (id) {
        var me = this;

        me.$root.find('#wlft-letter-template-preview-layer').show();

        var html =
            '<div id="document-template-preview" style="height: 594px; width: 820px; background-color: #efefef; z-index: 99;">' +
            '<iframe id="document-template-preview-frame" name="document-template-preview-frame" style="height: 594px; width: 820px;"></iframe>' +
            '</div>';

        new gmgps.cloud.ui.controls.window({
            title: 'Template Preview',
            windowId: 'documentPreviewModal',
            $content: $(html),
            width: 844,
            draggable: true,
            modal: true,
            actionButton: null,
            cancelButton: 'Close',
            onReady: function ($f) {
                //Generate the preview and send the output ($target) to the iframe.
                gmgps.cloud.helpers.general.openPublisher({
                    $target: $f.find('#document-template-preview-frame'),
                    settings: {
                        brandId: me.$root
                            .find('.document-template-list .row.on')
                            .data('brandid'),
                        branchId: me.$root
                            .find('.document-template-list .row.on')
                            .data('branchid'),
                        createNew: false,
                        isPreview: true,
                        forPrint: true,
                        forThumb: false,
                        isDraft: false,
                        testMode: true,
                        designMode: C.PublisherDesignMode.Template,
                        templateType:
                            C.DocumentTemplateType.PublisherStationery,
                        templateId: me.$root
                            .find('.document-template-list .row.on')
                            .data('stationeryid'),
                        printFormat: 0,
                        sampleDocumentContent: '*get*{0}'.format(id)
                    }
                });
            },
            onCancel: function () {}
        });
    },

    nextStep: function () {
        var me = this;
        var step = 0;

        switch (me.currentStep) {
            case me.steps.templates:
                step = me.steps.objects;
                break;
            case me.steps.objects:
                me.finish();
                break;
        }

        me.gotoStep(step);
    },

    prevStep: function () {
        var me = this;
        var step = 0;

        switch (me.currentStep) {
            case me.steps.templates:
                break;
            case me.steps.objects:
                step = me.steps.templates;
                break;
        }

        me.gotoStep(step);
    },

    gotoStep: function (step) {
        var me = this;

        if (step == 0) return;

        me.$root.find('.step').hide();
        me.$root.find('.step[data-id="{0}"]'.format(step)).show();

        var $next = me.$window.find('.next-button');
        var $prev = me.$window.find('.prev-button');

        if (step == me.steps.templates) {
            $prev.prop('disabled', true).addClass('disabled');
            $next.prop('disabled', false).removeClass('disabled');
        } else {
            $next.prop('disabled', false).removeClass('disabled');
            $prev.prop('disabled', false).removeClass('disabled');
        }

        $next.text('Next >>');
        switch (step) {
            case me.steps.templates:
                break;
            case me.steps.objects:
                $next.text('Finish');
                break;
        }

        me.currentStep = step;
    },

    finish: function () {
        var me = this;
        var contactId = parseInt(
            me.$root.find('.contact-ac').attr('data-id'),
            10
        );
        var propertyId = parseInt(
            me.$root.find('.property-ac').attr('data-id'),
            10
        );
        var tenancyId = parseInt(
            me.$root.find('.tenancy-id[data-id]').attr('data-id'),
            10
        );
        var supplierId = parseInt(
            me.$root.find('.supplier-ac').attr('data-id'),
            10
        );

        var userGroupId = parseInt($('#_groupid').val(), 10);
        var userBranchId = parseInt($('#_branchid').val(), 10);
        var branchId = parseInt(me.$root.find('#BranchId').val(), 10);
        var brandId = parseInt(me.$root.find('#BrandId').val(), 10);
        var contextModelType = parseInt(
            me.$root.find('#ContextModelType').val(),
            10
        );
        var templateId = parseInt(
            me.$root.find('.document-template-list .row.on').attr('data-id')
        );
        var sentByUserId = me.$root.find('#SentByUserId').val();

        if (contactId === 0) {
            showInfo('Please choose a recipient for the letter.');
            return false;
        }
        var hasESign = alto.optimizelyClient.isFeatureEnabledForBranch(
            'alto_settings_keyflo_esign_mfe',
            userGroupId,
            userBranchId
        );
        if (hasESign && propertyId === 0) {
            showDialog({
                type: 'question',
                title: 'Property needed for e-signature',
                msg: "You'll need to associate a property to send this document for e-signature. If you're not e-signing, you can continue without one.",
                buttons: {
                    Continue: function () {
                        me.createLetter(contactId, propertyId, tenancyId, supplierId, branchId, brandId, templateId, contextModelType, sentByUserId);
                        $(this).dialog('close');
                    },
                    "Add a property": function () {
                        $(this).dialog('close');
                        return false;
                    }
                }
            });
            return false;
        }
        me.createLetter(contactId, propertyId, tenancyId, supplierId, branchId, brandId, templateId, contextModelType, sentByUserId);
    },

    createLetter: function (contactId, propertyId, tenancyId, supplierId, branchId, brandId, templateId, contextModelType, sentByUserId) {
        var me = this;
        var success = false;
        var id = 0;

        //Ask server to generate letter and return id.
        new gmgps.cloud.http("writeletter-finish").ajax(
            {
                async: false,
                args: {
                    contactId: contactId,
                    propertyId: propertyId,
                    tenancyId: tenancyId,
                    supplierId: supplierId,
                    propertyRecordTypeId: 0,
                    branchId: branchId,
                    brandId: brandId,
                    templateId: templateId,
                    contextModelType: contextModelType,
                    SentByUserId: sentByUserId
                },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/Document/CreateAdHocLetter'
            },
            function (response) {
                id = response.Data;
                success = id != 0;

                if (success) {
                    me.cfg.closeMyWindow();
                } else {
                    showInfo(
                        'Letter generation failed.<br/>' + response.ErrorData
                    );
                }
            }
        );

        if (success) {
            gmgps.cloud.helpers.docshelper.edit([id]);
        }
    }
};
