gmgps.cloud.ui.views.WizardStep = function (name, stepIndex, onShow, onNext) {
    var me = this;
    me.name = name;
    me.stepIndex = stepIndex;
    me.onShow = onShow;
    me.onNext = onNext;
};

gmgps.cloud.ui.views.WizardStep.prototype = {
    show: function () {
        var me = this;
        if (me.onShow) {
            me.onShow();
        }
    },

    next: function () {
        var me = this;
        if (me.onNext) {
            me.onNext();
        }
    },

    getStepIndex: function () {
        var me = this;
        return me.stepIndex;
    }
};

gmgps.cloud.ui.views.writeAdHocLetterFromTemplate = function (args) {
    var me = this;
    me.cfg = args;
    me.$root = args.$root;
    me.$window = null;
    me.http = new gmgps.cloud.http(
        "writeadhocletter-writeAdHocLetterFromTemplate"
    );
    me.documentService = new gmgps.cloud.ui.publishing.DocumentService();
    me.searchId = args.data.search.SearchId;
    me.numberOfContacts = null;
    me.searchGroupName = args.data.search.SearchGroupName;
    me.templateId = 0;
    me.contacts = null;
    me.contactIds = args.data.search.Ids;
    me.brandId = 0;
    me.branchId = 0;
    me.propertyId = 0;
    me.branchIdList = args.data.search.BranchIdList;
    me.categoryIdList = args.data.search.CategoryIdList;
    me.descriptionTypeIdList = args.data.search.DescriptionTypeIdList;
    me.tenancyId = 0;
    me.currentTimestamp = me.$root.find('#current-timestamp').val();
    me.containerId = '#Template_Content_' + me.currentTimestamp;
    me.parentContainerId = '#Template_Parent_' + me.currentTimestamp;

    me.steps = [
        new gmgps.cloud.ui.views.WizardStep('templates', 1),
        new gmgps.cloud.ui.views.WizardStep(
            'preview',
            2,
            function () {
                me.templateId = me.$root
                    .find('.document-template-list .row.on')
                    .data('id');
                me.setupEditor();
            },
            function () {
                me.checkEmailAddresses();
                me.checkConsents();
            }
        ),
        new gmgps.cloud.ui.views.WizardStep('objects', 3, null, function () {
            var delivery = me.$root.find('.output-means:checked').val();
            if (delivery.toLowerCase() == 'email') {
                me.buildEmailEditor();
            } else if (delivery.toLowerCase() == 'print') {
                me.finish();
            }
        }),
        new gmgps.cloud.ui.views.WizardStep(
            'email editor',
            4,
            null,
            function () {
                me.finish();
            }
        )
    ];

    me.currentStep = 1;

    me.init(args);

    return true;
};

gmgps.cloud.ui.views.writeAdHocLetterFromTemplate.typeName =
    'gmgps.cloud.ui.views.writeAdHocLetterFromTemplate';

gmgps.cloud.ui.views.writeAdHocLetterFromTemplate.prototype = {
    init: function () {
        var me = this;

        me.$root.find('select').customSelect();
        me.$window = me.$root.closest('.window');
        me.numberOfContacts = parseInt(
            me.$root.find('input#number-of-contacts').val()
        );
        me.excludeIds =
            me.$root.find('input#ExcludeIds').val().toLowerCase() == 'true';

        //Next/Prev > Click
        me.$window.on('click', '.next-button', function () {
            me.nextStep();
        });
        me.$window.on('click', '.prev-button', function () {
            me.prevStep();
        });

        //Cancel button
        me.$window.on('click', '.cancel-button', function () {
            me.editor.closeEditor();
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
            me.templateId = parseInt($(this).data('id'));
        });

        //Document Template List > DblClick (preview)
        me.$root.on('dblclick', '.document-template-list .row', function () {
            var id = parseInt($(this).data('id'));
            me.previewDocumentTemplate(id);
        });

        //DocumentTemplateList Filtering
        me.$root.on(
            'change',
            '#wlft-brand-filter, #wlft-branch-filter, #wlft-propertyrecordtype-filter',
            function () {
                me.brandId = parseInt(
                    me.$root.find('#wlft-brand-filter').val()
                );
                me.branchId = parseInt(
                    me.$root.find('#wlft-branch-filter').val()
                );
                var propertyRecordTypeId = parseInt(
                    me.$root.find('#wlft-propertyrecordtype-filter').val()
                );
                var $list = me.$root.find('.document-template-list');

                $list.find('.row').show();

                if (me.brandId != 0) {
                    // TODO https://zpgltd.atlassian.net/browse/AD-14789
                    // eslint-disable-next-line no-undef
                    $list.find('.row[data-brandId!={0}]'.format(brandId)).hide();
                }
                if (me.branchId != 0) {
                    // TODO https://zpgltd.atlassian.net/browse/AD-14789
                    // eslint-disable-next-line no-undef
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
            }
        );

        me.$root.find('.property-ac').autoCompleteEx({
            modelType: C.ModelType.Property,
            includeContacts: true,
            includeUsers: false,
            placeholder: 'Search Properties ...',
            onSelected: function (e) {
                me.propertyId = e.id;
            }
        });

        me.$root.find('.tenancy-ac').autoCompleteEx({
            modelType: C.ModelType.Tenancy,
            includeContacts: false,
            includeUsers: false,
            placeholder: 'Search Tenancies ...',
            onSelected: function (e) {
                me.tenancyId = e.id;
            }
        });

        //Fetch document merge codes.
        new gmgps.cloud.http("writeadhocletter-init").ajax(
            {
                async: false,
                args: {
                    sourceDataType:
                        parseInt(
                            me.$root.find('#Template_SourceDataType').val()
                        ) || 0,
                    recipientType:
                        parseInt(
                            me.$root.find('#Template_RecipientType').val()
                        ) || 0,
                    templateType:
                        parseInt(
                            me.$root.find('#Template_TemplateTypeId').val()
                        ) || 0,
                    propertyRecordType:
                        parseInt(me.$root.find('#Template_SaleOrRent').val()) ||
                        0
                },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/Document/GetDocumentMergeCodeDatums',
                background: true
            },
            function (response) {
                me.documentMergeCodes = response.Data;
            }
        );

        //Show the first step.
        me.gotoStep(me.currentStep);
        me.$window.find('.next-button').addClass('disabled');
    },

    checkEmailAddresses: function () {
        var me = this;

        me.http.ajax(
            {
                args: {
                    contactIdList: me.contactIds,
                    searchId: me.searchId,
                    searchGroupName: me.searchGroupName,
                    excludeIds: me.excludeIds
                },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/AdhocDocuments/CountContactEmailAddresses'
            },
            function (response) {
                var numberOfAddresses = response.Data;
                if (me.numberOfContacts != numberOfAddresses) {
                    var shortfall = me.numberOfContacts - numberOfAddresses;
                    me.$root
                        .find('div#missing-addresses')
                        .show()
                        .find('span.count')
                        .text(
                            '{0} contact{1} do{2} not have {3}email address{4}.'.format(
                                shortfall,
                                shortfall == 1 ? '' : 's',
                                shortfall == 1 ? 'es' : '',
                                shortfall == 1 ? 'an ' : '',
                                shortfall == 1 ? '' : 'es'
                            )
                        );
                } else {
                    me.$root.find('div#missing-addresses').hide();
                }
            }
        );
    },

    checkConsents: function () {
        var me = this;

        var binding = new gmgps.cloud.ui.binding.ConsentMessageBinding(
            '.recipients .recipient',
            me.$root
        );
        binding.activate(['general-marketing', 'property-matching']);
    },

    buildEmailEditor: function () {
        var me = this;

        me.http.ajax(
            {
                args: {
                    contactIdList: me.contactIds,
                    searchId: me.searchId,
                    searchGroupName: me.searchGroupName,
                    excludeIds: me.excludeIds
                },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/AdhocDocuments/GetMailDetailsForContacts'
            },
            function (response) {
                me.contacts = response.Data;

                var settings = {
                    ContactIdList: me.contacts,
                    SearchId: me.searchId,
                    ContactGroupName: me.searchGroupName,
                    originatingEventCategory: C.EventCategory.Unspecified,
                    propertyId: me.propertyId,
                    tenancyId: me.tenancyId,
                    hideAttachments: true
                };

                me.http.ajax(
                    {
                        args: settings,
                        complex: true,
                        dataType: 'json',
                        type: 'post',
                        url: '/Comms/GetMailMessager'
                    },
                    function (response) {
                        var html = response.Data;

                        var editorContainer = me.$window.find(
                            'div.wlft-email-template'
                        );
                        editorContainer.html(html);
                        editorContainer
                            .find('div.email-dbox')
                            .css('height', 'auto');
                        editorContainer
                            .find('.cleditorMain')
                            .replaceWith(
                                '<textarea class="html-editor"></textarea>'
                            );
                        me.setupHtmlEditor(
                            editorContainer.find('.html-editor')
                        );
                    }
                );
            }
        );
    },

    setupHtmlEditor: function ($editor) {
        $editor.cleditor({
            height: 446,
            width: 695,
            controls:
                'bold italic underline strikethrough superscript | font size | ' +
                'color highlight | bullets | outdent ' +
                'indent | alignleft center | undo redo | ' +
                'link unlink | pastetext',
            colors:
                'FFF FCC FC9 FF9 FFC 9F9 9FF CFF CCF FCF ' +
                'CCC F66 F96 FF6 FF3 6F9 3FF 6FF 99F F9F ' +
                'BBB F00 F90 FC6 FF0 3F3 6CC 3CF 66C C6C ' +
                '999 C00 F60 FC3 FC0 3C0 0CC 36F 63F C3C ' +
                '666 900 C60 C93 990 090 399 33F 60C 939 ' +
                '333 600 930 963 660 060 366 009 339 636 ' +
                '000 300 630 633 330 030 033 006 309 303',
            fonts:
                'Segoe UI, Arial,Arial Black,Comic Sans MS,Courier New,Narrow,Garamond,' +
                'Georgia,Impact,Sans Serif,Serif,Tahoma,Trebuchet MS,Verdana',
            sizes: '1,2,3,4,5,6,7',
            styles: [
                ['Paragraph', '<p>'],
                ['Header 1', '<h1>'],
                ['Header 2', '<h2>'],
                ['Header 3', '<h3>'],
                ['Header 4', '<h4>'],
                ['Header 5', '<h5>'],
                ['Header 6', '<h6>']
            ],
            useCSS: false,
            docType:
                '<!DOCTYPE HTML PUBLIC "-//W3C//DTD HTML 4.01 Transitional//EN" "http://www.w3.org/TR/html4/loose.dtd">',
            docCSSFile: '',
            bodyStyle:
                'margin:4px; font:9pt Segoe UI,Arial,Verdana; cursor:text'
        });
    },

    setupEditor: function () {
        var me = this;
        // If editor is already setup then close it first
        if (me.editor) {
            me.editor.closeEditor();
        }
        var editorFactory = alto.integration.helpers.LetterEditorFactory({
            groupId: $('#_groupid').val()
        });

        var onInit = function () {
            var getPublisherPackageParameters = {
                brandId: me.$root
                    .find('.document-template-list .row.on')
                    .data('brandid'),
                branchId: me.$root
                    .find('.document-template-list .row.on')
                    .data('branchid'),
                documentId: 0,
                createNew: false,
                printFormatId: 0,
                templateId: me.$root
                    .find('.document-template-list .row.on')
                    .data('stationeryid'),
                templateSource: 0,
                templateType: C.DocumentTemplateType.PublisherStationery,
                letterContent: me.editor.getEditorContent(),
                silentErrors: false,
                usePublisherGroupStationery: false,
                isPreview: true
            };
            alto.integration.helpers.LetterEditor.updateEditorWithStationeryDetails(
                me.editor,
                getPublisherPackageParameters
            );
        };

        var setup = function () {
            me.http.ajax(
                {
                    async: false,
                    args: {
                        originalTemplateId: me.templateId
                    },
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: 'adhocdocuments/gettemplatetext',
                    background: true
                },
                function (response) {
                    me.editor.setContent(response.Data);
                }
            );
            me.editor.setMergeCodePrompt(me.promptForMergeCode, { me: me });
        };

        me.editor = editorFactory.getEditor({
            groupFonts: $('#publisher-fonts').val(),
            containerId: me.containerId,
            parentContainerId: me.parentContainerId,
            container: me.$root.find(me.containerId),
            setupCallback: setup,
            setupArgs: null,
            initCallback: onInit,
            launchFullScreen: false,
            width: 720,
            height: 390
        });

        me.editor.init();
    },

    promptForMergeCode: function (args) {
        var me = args.me;
        var $ac = $(
            '<div class="document-merge-code-ac"><div class="container"><div class="close-mergecode-section-button btn bgg-grey">Cancel</div><div class="prompt">Describe the merge code you need (e.g. "applicant mobile", "property street" or "lease years"):</div><input type="text" class="typeahead"/></div></div>'
        );
        me.$root.append($ac);
        $ac.show();

        var $input = $ac.find('.typeahead');

        $input.typeahead({
            name: 'documentMergeCodes',
            local: me.documentMergeCodes,
            limit: 20,
            template: [
                '<p class="mergecode-ac-item-name">{{name}}</p>',
                '<p class="mergecode-ac-item-description">{{description}}</p>',
                '<p class="mergecode-ac-item-example">{{example}}</p>'
            ].join(''),
            engine: Hogan
        });

        //Input > Escape pressed
        $input.one('keyup', function (e) {
            if (e.keyCode == 27) {
                $ac.remove();

                me.editor.focusEditor();
            }
        });

        $input.on('typeahead:selected', function (object, datum) {
            $ac.remove();

            if (args.callback) {
                args.callback(datum.name);
            }

            setTimeout(function () {
                var text = datum.synonymousWith || datum.name;
                var textToInsert = '{0} '.format(text);

                me.editor.insertTextInEditor(textToInsert.substr(1));
            }, 50);
        });

        setTimeout(function () {
            $input.val('').focus();
        }, 50);
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
            windowId: 'adHocPreviewModal',
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

    getCurrentStep: function () {
        var me = this;
        var step = me.steps[me.currentStep - 1];
        return step;
    },

    nextStep: function () {
        var me = this;
        var step = me.getCurrentStep();
        step.next();
        me.gotoStep(me.currentStep + 1);
    },

    prevStep: function () {
        var me = this;
        me.gotoStep(me.currentStep - 1);
    },

    gotoStep: function (stepIndex) {
        var me = this;
        if (stepIndex == 0) return;

        me.currentStep = stepIndex;
        var step = me.getCurrentStep();

        if (step) {
            step.show();
        } else {
            return;
        }

        me.$root.find('.step').hide();
        me.$root.find('.step[data-id="{0}"]'.format(me.currentStep)).show();

        var $next = me.$window.find('.next-button');
        var $prev = me.$window.find('.prev-button');

        if (step.getStepIndex() == 1) {
            $prev.prop('disabled', true).addClass('disabled');
            $next.prop('disabled', false).removeClass('disabled');
        } else {
            $next.prop('disabled', false).removeClass('disabled');
            $prev.prop('disabled', false).removeClass('disabled');
        }

        $next.text('Next >>');
    },

    finish: function () {
        var me = this;

        var contactIds = me.contactIds || [];
        //if (me.contacts) {
        //    contactIds = me.contacts.map(
        //        function (e, i) {
        //            if (e.ContactId > 0) {
        //                return e.ContactId;
        //            } else {
        //                return null;
        //            }
        //        }
        //    );
        //};

        var contextModelType = parseInt(
            me.$root.find('#ContextModelType').val()
        );
        var adhocHtml = me.editor.getEditorContent();
        var sentByUserId = me.$root.find('#SentByUserId').val();

        var emailSubject = '';
        if (me.$root.find('input.email-subject').length > 0) {
            emailSubject = me.$root.find('input.email-subject').val();
        }

        var $clEditor = me.$root.find('.html-editor').cleditor()[0];
        var emailBody = '';
        if ($clEditor) {
            emailBody = $clEditor.$area.val();
        }

        var delivery = me.$root
            .find('.output-means:checked')
            .val()
            .toLowerCase();

        var args = {
            contactSearchId: me.searchId,
            templateId: me.templateId,
            contactIds: contactIds,
            propertyId: me.propertyId,
            tenancyId: me.tenancyId,
            propertyRecordTypeId: 0,
            branchId: me.branchId,
            brandId: me.brandId,
            contextModelType: contextModelType,
            letterHtml: adhocHtml,
            emailText: emailBody,
            emailSubject: emailSubject,
            outputtype: delivery,
            sentByUserId: sentByUserId,
            excludeIds: me.excludeIds,
            contactSearchBranchIdList: me.branchIdList,
            contactSearchCategoryIdList: me.categoryIdList || [],
            contactSearchDescriptionTypeList: me.descriptionTypeIdList
        };

        me.deliver(delivery, args);

        me.editor.closeEditor();
    },

    deliver: function (deliveryMethod, args) {
        var me = this;

        if (deliveryMethod == 'email') {
            me.email(args);
        } else {
            me.print(args);
        }
    },

    sendEmail: function (args) {
        var me = this;

        me.http.ajax(
            {
                async: true,
                args: args,
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/adhocletter/email'
            },
            function (response) {
                var count = response.Data;
                $.jGrowl('', {
                    header: count + ' emails queued',
                    theme: 'growl-updater growl-system',
                    life: 2000
                });

                setTimeout(function () {
                    me.cfg.closeMyWindow();
                }, 10);
            },
            function (error) {
                console.log(error);
            }
        );
    },

    email: function (args) {
        var me = this;

        if (args.excludeIds) {
            var contactsToExclude = args.contactIds;

            me.http.ajax(
                {
                    async: true,
                    args: {
                        searchPage: { Size: 0 },
                        searchId: args.contactSearchId,
                        archived: 1,
                        branchIdList: args.contactSearchBranchIdList,
                        categoryIdList: args.contactSearchCategoryIdList,
                        descriptionTypeIdList:
                            args.contactSearchDescriptionTypeIdList
                    },
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: '/contact/getcontactsearchresult'
                },
                function (response) {
                    if (
                        response.Data &&
                        response.Data.List &&
                        response.Data.List.length > 0
                    ) {
                        var contactIds = response.Data.List.map((x) => x.Id);
                        var filteredContacts = contactIds.filter(
                            (contactId) =>
                                !contactsToExclude.includes(contactId)
                        );

                        args.contactIds = filteredContacts;
                        me.sendEmail(args);
                    }
                }
            );
        } else {
            me.sendEmail(args);
        }
    },

    print: function (args) {
        var me = this;

        me.http.ajax(
            {
                async: true,
                args: args,
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/adhocdocuments/create'
            },
            function (response) {
                var pendingDocumentIds = response.Data;
                setTimeout(function () {
                    me.cfg.closeMyWindow();
                }, 10);

                me.documentService.print(pendingDocumentIds);
            }
        );
    }
};
