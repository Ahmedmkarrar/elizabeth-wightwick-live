gmgps.cloud.ui.views.letterTemplateWizard = function (args) {
    var me = this;
    me.cfg = args;
    me.$root = args.$root;
    me.$window = null;

    me.steps = {
        templateType: 1,
        recipient: 2,
        source: 3,
        event: 4,
        stationery: 5
    };

    me.currentStep = me.steps.templateType;

    me.init(args);

    return this;
};

gmgps.cloud.ui.views.letterTemplateWizard.prototype = {
    init: function () {
        var me = this;

        me.$root.find('select').customSelect();
        me.$window = me.$root.closest('.window');

        //Next/Prev > Click
        me.$window.on('click', '.next-button', function () {
            me.sendNextGaEvent();
            me.nextStep();
            me.setupGaAttributes();
        });

        me.$window.on('click', '.prev-button', function () {
            me.sendPreviousGaEvent();
            me.prevStep();
            me.setupGaAttributes();
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

        me.setupGaAttributes(me.steps.templateType);

        //Hide the original action button - not required.
        me.$window.find('.action-button').hide();

        //Radio button bits
        me.$root.on('click', 'input:radio', function () {
            //Enable children in this section.
            var $section = $(this).closest('.radio-section');
            var $children = $section.find('.radio-children');

            $children.find('*').removeClass('disabled').prop('disabled', false);

            //Disable children from other sections.
            var $step = $(this).closest('.step');
            var $otherSections = $step.find('.radio-section').not($section);
            $otherSections.each(function (i, v) {
                var $otherSection = $(v);
                var $otherChildren = $otherSection.find('.radio-children');
                $otherChildren
                    .find('*')
                    .addClass('disabled')
                    .prop('disabled', true);
            });
        });

        //DocumentTemplateList Filtering
        me.$root.on(
            'change',
            '#ltw-brand-filter, #ltw-branch-filter, #ltw-propertyrecordtype-filter',
            function () {
                me.filterTemplateList();
            }
        );

        //SourceDataTypeId > Change
        me.$root.on('change', '#SourceDataTypeId', function () {
            var sourceDataTypeId = $(this).val();

            new gmgps.cloud.http("letterTemplateWizard-init").ajax(
                {
                    args: {
                        sourceDataType: sourceDataTypeId
                    },
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: '/publisher/GetRelevantEventSubTypesForSourceDataType'
                },
                function (response) {
                    //Clear the EventSubType dropdown and re-populate with event relevant only to the selected source data type.
                    var $select = me.$root.find('#EventSubTypeId');
                    $select.empty();
                    $.each(response.Data, function (i, v) {
                        $select.append(
                            '<option value="{0}">{1}</option>'.format(
                                v.Id,
                                v.Value
                            )
                        );
                    });
                    $select.trigger('prog-change');
                }
            );
        });

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

        //Step 1 Radio Buttons > Click
        me.$root.on('click', '#ltw-templatetype-copy', function () {
            if (me.$root.find('.document-template-list .row.on').length === 0) {
                me.$window.find('.next-button').addClass('disabled');
            }
        });
        me.$root.on(
            'click',
            '#ltw-templatetype-adhoc, #ltw-templatetype-event',
            function () {
                me.$window.find('.next-button').removeClass('disabled');
            }
        );

        //Template list search box > Keyup
        me.$root.on('keyup', '#ltw-template-search', function () {
            var query = $.trim($(this).val());
            me.filterTemplateList(query);
        });

        //Show the first step.
        me.gotoStep(me.currentStep);
        me.$window.find('.next-button').addClass('disabled');

        setTimeout(function () {
            me.$root.find('#ltw-template-search').focus();
        }, 100);
    },

    filterTemplateList: function (query) {
        var me = this;

        var brandId = parseInt(me.$root.find('#ltw-brand-filter').val());
        var branchId = parseInt(me.$root.find('#ltw-branch-filter').val());
        var propertyRecordTypeId = parseInt(
            me.$root.find('#ltw-propertyrecordtype-filter').val()
        );
        var $list = me.$root.find('.document-template-list');

        //First, apply the dropdown filters.
        $list.find('.row').show();

        if (brandId !== 0) {
            $list.find('.row[data-brandId!={0}]'.format(brandId)).hide();
        }
        if (branchId !== 0) {
            $list.find('.row[data-branchId!={0}]'.format(branchId)).hide();
        }
        if (propertyRecordTypeId !== 0) {
            $list
                .find(
                    '.row[data-propertyRecordTypeId!={0}]'.format(
                        propertyRecordTypeId
                    )
                )
                .hide();
        }

        //Next, apply any text filtering (optional)
        if (query) {
            $list
                .find('.row:not([data-loweredName*="{0}"])'.format(query))
                .hide();
        }

        //If, following filtering, the selected row is no longer visible, disable the next button.
        if ($list.find('.on:visible').length === 0) {
            me.$window.find('.next-button').addClass('disabled');
        }
    },

    previewDocumentTemplate: function (id) {
        var me = this;

        me.$root.find('#ltw-letter-template-preview-layer').show();

        var html =
            '<div id="document-template-preview" style="height: 594px; width: 820px; background-color: #efefef; z-index: 99;">' +
            '<iframe id="document-template-preview-frame" name="document-template-preview-frame" style="height: 594px; width: 820px;"></iframe>' +
            '</div>';

        new gmgps.cloud.ui.controls.window({
            title: 'Template Preview',
            windowId: 'wizardPreviewModal',
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
                        brandId: 0,
                        branchId: 0,
                        createNew: false,
                        isPreview: true,
                        forPrint: true,
                        forThumb: false,
                        isDraft: false,
                        testMode: true,
                        designMode: C.PublisherDesignMode.Template,
                        templateType:
                            C.DocumentTemplateType.PublisherStationery,
                        templateId: 0,
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
            case me.steps.templateType:
                //Ad Hoc?
                if (me.$root.find('#ltw-templatetype-adhoc').prop('checked')) {
                    step = me.steps.stationery;

                    me.$root
                        .find('#TemplateTypeId')
                        .val(C.DocumentTemplateType.AdHocLetter);
                    me.$root.find('#SourceDataTypeId').val('0');
                    me.$root.find('#RecipientTypeId').val('0');
                    me.$root.find('#EventSubTypeId').val('0');
                }

                //Event-Driven?
                if (me.$root.find('#ltw-templatetype-event').prop('checked')) {
                    step = me.steps.recipient;

                    me.$root
                        .find('#TemplateTypeId')
                        .val(C.DocumentTemplateType.CustomEventDrivenLetter);
                }

                //Copy?
                if (me.$root.find('#ltw-templatetype-copy').prop('checked')) {
                    step = me.steps.stationery;

                    me.$root
                        .find('#TemplateTypeId')
                        .val(C.DocumentTemplateType.AdHocLetter);
                }

                break;
            case me.steps.recipient:
                step = me.steps.source;
                break;
            case me.steps.source:
                step = me.steps.event;
                break;
            case me.steps.event:
                step = me.steps.stationery;
                break;
            case me.steps.stationery:
                me.finish();
                break;
        }

        me.gotoStep(step);
    },

    prevStep: function () {
        var me = this;
        var step = 0;

        switch (me.currentStep) {
            case me.steps.templateType:
                break;
            case me.steps.recipient:
                step = me.steps.templateType;
                break;
            case me.steps.source:
                step = me.steps.recipient;
                break;
            case me.steps.event:
                step = me.steps.source;
                break;
            case me.steps.stationery:
                if (me.$root.find('#ltw-templatetype-adhoc').prop('checked')) {
                    step = me.steps.templateType;
                }

                if (me.$root.find('#ltw-templatetype-event').prop('checked')) {
                    step = me.steps.event;
                }

                if (me.$root.find('#ltw-templatetype-copy').prop('checked')) {
                    step = me.steps.templateType;
                }
                break;
        }

        me.gotoStep(step);
    },

    gotoStep: function (step) {
        var me = this;

        me.$root.find('.step').hide();
        me.$root.find('.step[data-id="{0}"]'.format(step)).show();

        var $next = me.$window.find('.next-button');
        var $prev = me.$window.find('.prev-button');

        if (step === me.steps.templateType) {
            $prev.prop('disabled', true).addClass('disabled');
            $next.prop('disabled', false).removeClass('disabled');
        } else {
            $next.prop('disabled', false).removeClass('disabled');
            $prev.prop('disabled', false).removeClass('disabled');
        }

        $next.text('Next >>');
        switch (step) {
            case me.steps.templateType:
                break;
            case me.steps.recipient:
                break;
            case me.steps.source:
                break;
            case me.steps.event:
                break;
            case me.steps.stationery:
                me.$root.find('.usingPublisherGroupStationery').hide();
                me.$root.find('.notUsingPublisherGroupStationery').hide();

                var usePublisherGroupStationery = me.$root
                    .find('.document-template-list .row.on')
                    .attr('data-usePublisherGroupStationery');

                if (
                    me.$root.find('#ltw-templatetype-copy').prop('checked') &&
                    usePublisherGroupStationery === 'True'
                ) {
                    me.$root.find('.usingPublisherGroupStationery').show();
                } else {
                    me.$root.find('.notUsingPublisherGroupStationery').show();
                }
                $next.text('Finish');
                break;
        }

        me.currentStep = step;
    },

    finish: function () {
        var me = this;

        var settings = {
            isNew: true,
            templateType: parseInt(me.$root.find('#TemplateTypeId').val()),
            recipientType: parseInt(me.$root.find('#RecipientTypeId').val()),
            sourceDataType: parseInt(me.$root.find('#SourceDataTypeId').val()),
            eventSubType: parseInt(me.$root.find('#EventSubTypeId').val()),
            stationeryTemplateId: parseInt(
                me.$root.find('#StationeryTemplateId').val()
            ),
            isActiveSelected: me.$root
                .find('#ltw-activeselected')
                .prop('checked'),
            templateId: 0
        };

        var windowTitle;

        //Ad Hoc?
        if (me.$root.find('#ltw-templatetype-adhoc').prop('checked')) {
            windowTitle = 'New Ad Hoc Letter Template';
        }

        //Event-Driven?
        if (me.$root.find('#ltw-templatetype-event').prop('checked')) {
            windowTitle = 'New Event-Driven Letter Template';
        }

        //Copy?
        if (me.$root.find('#ltw-templatetype-copy').prop('checked')) {
            windowTitle = 'New Letter Template (based upon another)';
            settings.copyTemplateId = parseInt(
                me.$root.find('.document-template-list .row.on').attr('data-id')
            );
        }

        //Open the letter template editor.
        gmgps.cloud.helpers.general.openLetterTemplateEditor({
            title: windowTitle,
            settings: settings
        });

        me.cfg.closeMyWindow();
    },

    setupGaAttributes: function () {
        var me = this;

        me.category = 'tools.lettertemplatewizard_' + me.currentStep;

        me.$window
            .find('.cancel-button')
            .attr('ga-category', me.category)
            .attr('ga-action', 'button_click')
            .attr('ga-label', 'cancel');
    },

    sendNextGaEvent: function () {
        var me = this;

        var action = 'button_click';
        var label = 'next';

        if (me.currentStep == me.steps.templateType) {
            action = 'next_submitted';

            if (me.$root.find('#ltw-templatetype-adhoc').prop('checked')) {
                label = 'new';
            } else if (
                me.$root.find('#ltw-templatetype-event').prop('checked')
            ) {
                label = 'new_advance';
            } else if (
                me.$root.find('#ltw-templatetype-copy').prop('checked')
            ) {
                label = 'new_copy';
            }
        } else if (me.currentStep == me.steps.stationery) {
            action = 'finish_submitted';
            label = me.$root.find('#StationeryTemplateId :selected').text();
        }

        googleAnalytics.sendEvent(me.category, action, label);
    },

    sendPreviousGaEvent: function () {
        var me = this;

        // previous button has to be sent because it doesn't get picked up when pressed to go back to the first page, where it is disabled
        googleAnalytics.sendEvent(me.category, 'button_click', 'previous');
    }
};
