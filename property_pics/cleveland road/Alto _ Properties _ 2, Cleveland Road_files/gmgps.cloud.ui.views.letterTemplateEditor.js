/*global tinymce*/
gmgps.cloud.ui.views.letterTemplateEditor = function (args) {
    var me = this;
    me.cfg = args;
    me.$root = args.$root;
    me.$window = null;
    me.http =
        args.http ||
        new gmgps.cloud.http("lettertemplateeditor-letterTemplateEditor");
    me.editor = null;
    me.id = parseInt(me.$root.find('#Template_Id').val());
    me.isSuperseded = false;
    me.documentMergeCodes = null;
    me.isDirty = false;
    me.mergeCodeTranslations = null;
    me.editorContainerId = '#Template_Content_' + me.id;
    me.parentContainerId = '#lte-editor-container-' + me.id;
    me.mainSidePanelStatus = false;
    me.configSidePanelStatus = false;
    me.previewSidePanelStatus = false;

    me.init(args);

    $(document).ready(function () {
        setTimeout(function () {
            $('#letterTemplateEditorModal').css({ opacity: 1 });
        }, 1000);
    });

    return this;
};

gmgps.cloud.ui.views.letterTemplateEditor.prototype = {
    //Note:  The usage of setTimeout within this object is to cater for the differences between browsers when it comes to dealing with the target of keypress events.

    // Constants
    CONSTANTS: {
        SELECTOR: {
            ESIGN_ENABLED_ELEMENT: '#le-psp-template-esign-enabled',
            PRE_TICKED_CHECKBOX: '#le-psp-template-lte-status-checkbox-container',
            ESIGN_HIDDEN_FIELD: 'input[name="Template.ESignEnabled"][type="hidden"]',
            TEMPLATE_NAME: '#Template_Name',
            TEMPLATE_ID: '#Template_Id',
            TEMPLATE_STATUS: '#Template_Status',
            TEMPLATE_BRANCH_ID: '#Template_BranchId',
            TEMPLATE_BRAND_ID: '#Template_BrandId',
            TEMPLATE_STATIONERY_ID: '#Template_DefaultStationeryTemplateId',
            TEMPLATE_SALE_OR_RENT: '#Template_SaleOrRent',
            TEMPLATE_EVENT_SUBTYPE_ID: '#Template_EventSubTypeId',
            TEMPLATE_TENANCY_TERM: '#Template_TenancyTerm',
            TEMPLATE_SOURCE_DATA_TYPE: '#Template_SourceDataType',
            TEMPLATE_TEMPLATE_TYPE_ID: '#Template_TemplateTypeId',
            TEMPLATE_RECIPIENT_TYPE: '#Template_RecipientType',
            TEMPLATE_CANNOT_BE_DELETED: '#Template_CannotBeDeleted',
            LTE_STATUS_ACTIVE: '#LTEStatusActiveSelected',
            LETTER_TEMPLATE_EDITOR_MODAL: '#letterTemplateEditorModal',
            PREVIEW_BUTTON: '.preview-button',
            ATTACHMENTS_BUTTON: '.attachments-button',
            DELETE_BUTTON: '.delete-button',
            ACTION_BUTTON: '.action-button',
            SAVE_BUTTON: '.le-save-btn'
        },
        TIMEOUT: {
            MODAL_OPACITY: 1000,
            EDITOR_INIT: 100,
            ESIGN_ROWS_NONEDITABLE: 200,
            ESIGN_ROWS_NONEDITABLE_ON_CHANGE: 50,
            MERGE_CODE_INSERT: 50,
            MERGE_CODE_FOCUS: 50
        },
        DEFAULT: {
            SELECT_HEIGHT: 37,
            MERGE_CODE_LIMIT: 250
        },
        REGEX: {
            ESIGNATURE_MERGE_CODE: /#esignature_\w+#/gi,
            WINMAN_TAG: /&lt;&lt;(&amp;)?[- \w]+&gt;&gt;/gi
        }
    },

    init: function () {
        var me = this;

        //Add "preview" button to the window.
        me.$window = me.$root.closest('.window');

        me.$window
            .find('.bottom .buttons')
            .prepend(
                '<div class="btn attachments-button bgg-grey" style="min-width: 110px; float: left;">Attachments</div>'
            );
        me.$window.find('.attachments-button').removeClass('disabled');

        //add buttons
        if (me.templateCanBeDeleted()) {
            me.$window
                .find('.bottom .buttons')
                .prepend(
                    '<div class="btn delete-button bgg-grey" style="min-width: 110px; float: left;">Delete Template</div>'
                );
            me.$window.find('.delete-button').removeClass('disabled');
        }
        me.$window
            .find('.bottom .buttons')
            .prepend(
                '<div class="btn preview-button bgg-grey" style="min-width: 180px; float: left;">Preview (OFF)</div>'
            );

        me.$window
            .find('.action-button')
            .attr('ga-category', 'tools.newadhoclettertemplate')
            .attr('ga-action', 'button_click')
            .attr('ga-label', 'save');
        me.$window
            .find('.le-save-btn')
            .attr('ga-category', 'tools.newadhoclettertemplate')
            .attr('ga-action', 'button_click')
            .attr('ga-label', 'save_fullscreen');
        me.$window
            .find('.le-back-btn')
            .attr('ga-category', 'tools.newadhoclettertemplate')
            .attr('ga-action', 'button_click')
            .attr('ga-label', 'back_fullscreen');
        me.$window
            .find('.btn.cancel-button')
            .attr('ga-category', 'tools.newadhoclettertemplate')
            .attr('ga-action', 'button_click')
            .attr('ga-label', 'close');
        me.$window
            .find('.le-close-btn.cancel-button')
            .attr('ga-category', 'tools.newadhoclettertemplate')
            .attr('ga-action', 'button_click')
            .attr('ga-label', 'close_fullscreen');
        me.$window
            .find(me.CONSTANTS.SELECTOR.PREVIEW_BUTTON)
            .attr('ga-category', 'tools.newadhoclettertemplate')
            .attr('ga-action', 'button_click')
            .attr('ga-label', 'preview');
        me.$window
            .find('.le-preview-btn')
            .attr('ga-category', 'tools.newadhoclettertemplate')
            .attr('ga-action', 'button_click')
            .attr('ga-label', 'preview_fullscreen');

        if (me.id != 0) {
            // Existing template, start off non-dirty.
            me.$window.find(me.CONSTANTS.SELECTOR.ACTION_BUTTON).addClass('disabled');
            me.$window.find(me.CONSTANTS.SELECTOR.SAVE_BUTTON).addClass('disabled');
        } else {
            //New template, allow save from the get go but don't allow delete or attachments
            me.$window.find(me.CONSTANTS.SELECTOR.ATTACHMENTS_BUTTON).addClass('disabled');
            me.$window.find(me.CONSTANTS.SELECTOR.DELETE_BUTTON).addClass('disabled');
            me.setDirty(true);
        }

        me.branchesWithChangedNames = [];

        //bind callback functions for setupEditor
        me.rename = function () {
            var inputField = me.$root.find('.le-name-input');
            inputField.focus();
        }.bind(this);

        me.mergeCodeButtonAction = function () {
            me.originMergeCodeButtonAction = true;
            me.editor.setMergeCodePrompt(me.promptForMergeCode, { me: me });
            me.editor.showMergeCode = true;
        }.bind(this);

        me.attachments = function () {
            new gmgps.cloud.ui.controls.window({
                title: 'Letter Template Attachments',
                windowId: 'letterAttachmentsModal',
                controller: gmgps.cloud.ui.views.documentTemplateAttachments,
                url: 'Document/DocumentTemplateAttachments',
                data: {
                    $root: me.$root,
                    templateId: me.id
                },
                post: true,
                complex: true,
                urlArgs: { documentTemplateId: me.id },
                width: 500,
                draggable: true,
                modal: true,
                fullscreen: true,
                cancelButton: 'Close',
                onCancel: function () {
                    return false;
                }
            });
        }.bind(this);

        me.delete = function () {
            showDialog({
                zIndex: 9999999,
                type: 'question',
                title: 'Delete Template',
                msg: 'Are you sure you would like to delete this template?',
                buttons: {
                    Yes: function () {
                        new gmgps.cloud.http("lettertemplateeditor-Yes").ajax(
                            {
                                args: {
                                    templateId: me.id,
                                    propertyId: 0,
                                    templateTypeId: 0
                                },
                                complex: true,
                                dataType: 'json',
                                type: 'post',
                                url: '/publisher/deletepublishertemplate'
                            },
                            function () {
                                $(me.CONSTANTS.SELECTOR.LETTER_TEMPLATE_EDITOR_MODAL).css({
                                    opacity: 0
                                });
                                me.editor.closeEditor();
                                me.cfg.closeMyWindow();
                            }
                        );
                        $(this).dialog('close');
                    },
                    No: function () {
                        $(this).dialog('close');
                    }
                }
            });
        }.bind(this);

        me.isNew = function () {
            return me.id === 0;
        }.bind(this);

        me.action = function (callback) {
            if (me.$root.find('#Template_Name').val() == '') {
                showInfo('Please give the template a name.');
                return false;
            }

            me.saveTemplate(callback);
        }.bind(this);

        //UI init.
        me.$root.find('select').customSelect();
        me.setupEditor();

        //Set focus on the name field if this is a new template.
        if (me.id === 0) {
            me.$root.find('#Template_Name').focus();
        }

        //attachments Button > Click
        me.$window.on('click', '.attachments-button', function () {
            me.attachments();
        });

        //Delete Button > Click
        me.$window.on('click', '.delete-button', function () {
            me.delete();
        });

        //Preview Button > Click
        me.$window.on('click', '.preview-button, .le-preview-btn', function () {
            me.togglePreview();
        });

        me.$window.on('click', '.le-back-btn', function () {
            if (!$('.preview-button').hasClass('on')) {
                $('#letterTemplateEditorModal').css({ opacity: 0 });
            }
        });

        me.$window.on('click', '.le-save-btn', function () {
            if (me.$root.find('#Template_Name').val() == '') {
                showInfo('Please give the template a name.');
                return false;
            }
            me.action();
        });

        me.$window.on('click', '.le-name-pencil', function () {
            me.rename();
        });

        var letterEditorSpan = document.querySelector('.le-name-input-span');
        if (letterEditorSpan.innerHTML.length == 0) {
            letterEditorSpan.innerHTML = 'Untitled template';
        }
        me.$window.on('input', '.le-name-input', function () {
            letterEditorSpan.innerHTML = $(this).val();
            $('#Template_Name').val($(this).val());
            if (letterEditorSpan.innerHTML.length == 0) {
                letterEditorSpan.innerHTML = 'Untitled template';
            }
        });

        me.$window.on('input', '#Template_Name', function () {
            letterEditorSpan.innerHTML = $(this).val();
            $('.le-name-input').val($(this).val());
        });

        me.$root.on(
            'change',
            '#Template_SaleOrRent, #le-psp-template-sale-or-rent',
            function () {
                var $this = $(this);

                if (parseInt($this.val()) === C.PropertyRecordType.Rent) {
                    me.$root.find('.term-row').show();
                } else {
                    me.$root.find('.term-row').hide();
                }
            }
        );

        //DocumentTemplateType > Change
        me.$root.on('change', '#Template_TemplateTypeId', function () {
            var id = $(this).val();

            new gmgps.cloud.http("lettertemplateeditor-init").ajax(
                {
                    args: {
                        documentTemplateType: id
                    },
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: '/publisher/GetDefaultDocumentTemplateTypeDefinition'
                },
                function (response) {
                    me.$root
                        .find('#Template_RecipientType')
                        .val(response.Data.DefaultDocumentRecipientType)
                        .trigger('prog-change');
                    me.$root
                        .find('#Template_SaleOrRent')
                        .val(response.Data.DefaultPropertyRecordType)
                        .trigger('prog-change');
                    me.$root
                        .find('#Template_EventSubTypeId')
                        .data('pendingId', response.Data.DefaultEventSubType); //data value picked up later, after items are refreshed.
                    me.$root
                        .find('#Template_SourceDataType')
                        .val(response.Data.DefaultDocumentSourceDataType)
                        .trigger('prog-change')
                        .trigger('linked-change');
                }
            );
        });

        //SourceDataTypeId > Change
        me.$root.on(
            'change linked-change',
            '#Template_SourceDataType',
            function () {
                var sourceDataTypeId = $(this).val();

                new gmgps.cloud.http("lettertemplateeditor-init").ajax(
                    {
                        args: {
                            sourceDataType: sourceDataTypeId,
                            includeNone: true
                        },
                        complex: true,
                        dataType: 'json',
                        type: 'post',
                        url: '/publisher/GetRelevantEventSubTypesForSourceDataType'
                    },
                    function (response) {
                        //Clear the EventSubType dropdown and re-populate with event relevant only to the selected source data type.
                        var $select = me.$root.find('#Template_EventSubTypeId');
                        $select.empty();
                        $.each(response.Data, function (i, v) {
                            $select.append(
                                '<option value="{0}">{1}</option>'.format(
                                    v.Id,
                                    v.Value
                                )
                            );
                        });

                        if (
                            $select.data('pendingId') != null &&
                            $select.data('pendingId') != 0
                        ) {
                            $select.val($select.data('pendingId'));
                            $select.data('pendingId', 0);
                        }

                        $select.trigger('prog-change');
                    }
                );
            }
        );

        //Fetch document merge codes.
        new gmgps.cloud.http("lettertemplateeditor-init").ajax(
            {
                async: false,
                args: {
                    sourceDataType: 0,
                    recipientType: 0,
                    templateType: 0
                },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/Document/GetDocumentMergeCodeDatums',
                background: true
            },
            function (response) {
                me.documentMergeCodes = response.Data;
                // Store original unfiltered merge codes
                me.documentMergeCodesOriginal = response.Data ? response.Data.slice(0) : [];
            }
        );

        me.getMergeCodeTranslations().done(function (r) {
            me.mergeCodeTranslations = r.Data;
        });

        me.$root.on('click', '.close-mergecode-section-button', function () {
            var $ac = me.$root.find('.document-merge-code-ac');
            $ac.remove();
            
            // Clear references when autocomplete is closed
            me.currentMergeCodeInput = null;
            me.currentMergeCodeAc = null;

            me.editor.focusEditor();
        });
    },

    loadPreview: function (target) {
        var me = this;
        //Update content and fetch from textarea.
        me.editor.updateEditor();
        var content = me.editor.getEditorContent();
        var entityMap = {
            '&': '&amp;',
            '<': '&lt;',
            '>': '&gt;',
            '"': '&quot;',
            "'": '&#39;',
            '/': '&#x2F;'
        };

        var escapeHtml = function (string) {
            // eslint-disable-next-line no-useless-escape
            return String(string).replace(/[&<>"'\/]/g, function (s) {
                return entityMap[s];
            });
        };

        //Generate the preview and send the output ($target) to the iframe.
        gmgps.cloud.helpers.general.openPublisher({
            $target: target,
            settings: {
                brandId: parseInt(me.$root.find('#Template_BrandId').val()),
                branchId: parseInt(me.$root.find('#Template_BranchId').val()),
                createNew: false,
                isPreview: true,
                forPrint: true,
                forThumb: false,
                isDraft: false,
                testMode: true,
                designMode: C.PublisherDesignMode.Template,
                templateType: C.DocumentTemplateType.PublisherStationery,
                templateId: parseInt(
                    me.$root.find('#Template_DefaultStationeryTemplateId').val()
                ),
                usePublisherGroupStationery:
                    me.$root
                        .find('#Template_PublisherGroupStationeryTemplate')
                        .val() === 'True',
                printFormat: 0,
                sampleDocumentContent: escapeHtml(content)
            }
        });
    },

    templateCanBeDeleted: function () {
        var me = this;
        return me.$root.find('#Template_CannotBeDeleted').val() !== 'True';
    },

    togglePreview: function (selector) {
        var me = this;
        if (selector === null || selector === undefined) {
            selector = '#letter-template-preview-frame';
        }

        if ($('.preview-button').hasClass('on')) {
            //Turn off preview mode.
            $('.preview-button')
                .removeClass('on bgg-green')
                .text('Preview (OFF)');
            $('.le-preview-btn').removeClass('active');

            me.$root
                .find('#letter-template-preview-layer')
                .fadeOut(250, function () {
                    me.$root
                        .find('#letter-template-preview-layer')
                        .removeClass('visible');
                    me.$root.find(selector).contents().find('body').html('');
                });
        } else {
            //Turn on preview mode.
            $('.preview-button').addClass('on bgg-green').text('Preview (ON)');
            $('.le-preview-btn').addClass('active');

            me.$root
                .find('#letter-template-preview-layer')
                .addClass('visible')
                .show();
            me.loadPreview(me.$root.find(selector));
        }
    },

    updateEditorWithStationeryDetails: function () {
        var me = this;
        var getPublisherPackageParameters = {
            brandId: parseInt(me.$root.find('#Template_BrandId').val()),
            branchId: parseInt(me.$root.find('#Template_BranchId').val()),
            documentId: 0,
            createNew: false,
            printFormatId: 0,
            templateId: parseInt(
                me.$root.find('#Template_DefaultStationeryTemplateId').val()
            ),
            templateSource: 0,
            templateType: C.DocumentTemplateType.PublisherStationery,
            letterContent: me.editor.getEditorContent(),
            silentErrors: false,
            usePublisherGroupStationery:
                me.$root
                    .find('#Template_PublisherGroupStationeryTemplate')
                    .val() === 'True',
            isPreview: true
        };
        alto.integration.helpers.LetterEditor.updateEditorWithStationeryDetails(
            me.editor,
            getPublisherPackageParameters
        );
    },

    selectDefaultStationeryTemplateForBranch: function (init) {
        var me = this;
        var stationeryId = me.$root
            .find('#Template_DefaultStationeryTemplateId')
            .val();
        var userBranchId = $('#_branchid').val();
        var defaultUserStationery = me.$root
            .find("option[data-branch-id='" + userBranchId + "']")
            .val();

        var selectOption = function (branchId) {
            return (
                "#le-psp-template-stationery-id option[data-branch-id='" +
                branchId +
                "']"
            );
        };

        var selectBranch = function (branchId, stationery) {
            var isTheBranchAlreadyIncluded = me.branchesWithChangedNames.filter(
                (branch) => branch.branchId == branchId
            );
            if (stationery) {
                if (isTheBranchAlreadyIncluded.length === 0) {
                    var originalText = $(selectOption(branchId)).text();
                    $(selectOption(branchId))
                        .text('Branch Default: ' + originalText)
                        .trigger('change');
                    me.branchesWithChangedNames.push({
                        branchId: branchId,
                        originalText: originalText.trim()
                    });
                }

                $(selectOption(branchId))
                    .attr('selected', 'selected')
                    .trigger('change');
            } else {
                var stationeryBase =
                    '#le-psp-template-stationery-id option[value=0]';

                if (!($(stationeryBase).length > 0)) {
                    $('#le-psp-template-stationery-id').append(
                        `<option value="0">No template set</option>`
                    );
                }

                $(stationeryBase)
                    .attr('selected', 'selected')
                    .trigger('change');
            }
        };

        // If this is on load
        if (init && stationeryId > 0) {
            // And user has already branch default set
            if (stationeryId == defaultUserStationery) {
                selectBranch(userBranchId, stationeryId);
            } else {
                $(
                    "#le-psp-template-stationery-id option[value='" +
                        stationeryId +
                        "']"
                )
                    .attr('selected', 'selected')
                    .trigger('change');
            }
        }

        // If this is after changes to branch
        var branchId = $('#le-psp-template-branch-id').val();
        if (branchId == 0) {
            branchId = userBranchId;
        }

        // Do we have default stationery for the branchId?
        var stationery = $(selectOption(branchId)).length > 0;

        // Housekeeping if we previously appended text on select options
        var branchesPreviouslyAppended = me.branchesWithChangedNames.filter(
            (branch) => branch.branchId != branchId
        );
        if (branchesPreviouslyAppended.length) {
            for (var i = 0; i < me.branchesWithChangedNames.length; i++) {
                if (branchId !== me.branchesWithChangedNames[i]) {
                    // Change text to original one
                    $(selectOption(me.branchesWithChangedNames[i].branchId))
                        .text(branchesPreviouslyAppended[i].originalText)
                        .trigger('change');
                    //Remove from branchesWithChangedNames array
                    me.branchesWithChangedNames.splice(i, 1);
                }
            }
        }

        selectBranch(branchId, stationery);
    },

    attachDirtyListeners: function () {
        var me = this;
        //All other things.
        // Exclude e-sign toggle from dirty listeners since it doesn't affect content
        me.$root.on('change', 'select, input', function () {
            // Don't mark as dirty if it's the e-sign toggle
            var esignToggleId = me.CONSTANTS.SELECTOR.ESIGN_ENABLED_ELEMENT.replace('#', '');
            if ($(this).attr('id') !== esignToggleId) {
                me.setDirty(true);
            }
        });
    },

    // Helper: Check if e-sign feature is enabled
    isESignFeatureEnabled: function () {
        var me = this;
        var $esignEnabledToggle = me.$root.find(me.CONSTANTS.SELECTOR.ESIGN_ENABLED_ELEMENT);
        return $esignEnabledToggle.length > 0;
    },

    // Helper: Initialize e-sign toggle default state
    initializeESignToggle: function () {
        var me = this;
        if (me.isESignFeatureEnabled()) {
            var $esignEnabledToggle = me.$root.find(me.CONSTANTS.SELECTOR.ESIGN_ENABLED_ELEMENT);
            $esignEnabledToggle.prop('checked', true);
        }
    },

    // Helper: Setup editor callbacks
    setupEditorCallbacks: function () {
        var me = this;
        return function () {
            me.editor.attachChangeListener(me.setDirty, true, me);
            me.editor.attachPasteListener(me.fixWinmanTags, me);
            me.editor.setMergeCodePrompt(me.promptForMergeCode, { me: me });
        };
    },

    // Helper: Setup editor initialization logic
    setupEditorInitialization: function () {
        var me = this;
        return function () {
            me.editor
                .getEditorInstance()
                .execCommand('togglesidebar', false, 'mainsidepanel');

            // Template needs to be saved and also can be deleted
            if (me.id !== 0 && me.templateCanBeDeleted() === true) {
                me.editor.resetDirty('delete');
            }

            // For new ad hoc templates we do not to cast to defualt stationary only if it is being set
            var stationeryId = me.$root
                .find(me.CONSTANTS.SELECTOR.TEMPLATE_STATIONERY_ID)
                .val();
            var userBranchId = $('#_branchid').val();
            var defaultUserStationery = me.$root
                .find("option[data-branch-id='" + userBranchId + "']")
                .val();

            // If this is new template set default sationary only if branch defualt was picked
            if (!me.id & (stationeryId == defaultUserStationery)) {
                me.selectDefaultStationeryTemplateForBranch(true);
            }

            // If this not new template set default sationary only if branch defualt was picked or stationary in null
            if (
                (me.id !== 0) & (stationeryId == defaultUserStationery) ||
                stationeryId == 0
            ) {
                me.selectDefaultStationeryTemplateForBranch(true);
            }

            // TinyMCE 8: Ensure editor is fully initialized before updating preview
            setTimeout(function() {
                me.updateSidePanels(true);
            }, me.CONSTANTS.TIMEOUT.EDITOR_INIT);
            me.updateEditorWithStationeryDetails();
            me.attachDirtyListeners();
        };
    },

    // Helper: Setup custom plugins (mainsidepanel, previewpanel, esignitems)
    setupCustomPlugins: function (eSignFeatureEnabled) {
        var me = this;
        return function () {
            // Setup main sidebar event listener
            document.addEventListener('main-sidebar', function (e) {
                me.mainSidePanelStatus = e.detail;
                me.updateSelectHeight(me.$root.find('#le-psp-template-branch-id'));
                me.updateSelectHeight(me.$root.find('#le-psp-template-brand-id'));
                me.updateSelectHeight(me.$root.find('#le-psp-template-stationery-id'));
                me.updateSelectHeight(me.$root.find('#le-psp-template-sale-or-rent'));
                me.updateSelectHeight(me.$root.find('#le-psp-template-event-subtype-id'));
                me.updateSelectHeight(me.$root.find('#le-psp-template-tenancy-term'));
            });

            // Register main side panel plugin
            me.setupMainSidePanelPlugin();

            // Register preview panel plugin
            me.setupPreviewPanelPlugin();

            // Register e-sign plugin if feature is enabled
            if (eSignFeatureEnabled) {
                tinymce.PluginManager.add('esignitems', function (editor) {
                    gmgps.cloud.ui.views.letterTemplateEditor.esign.init({
                        editor: editor,
                        me: me
                    });
                });
            }
        };
    },

    // Helper: Setup main side panel plugin
    setupMainSidePanelPlugin: function () {
        var me = this;
        tinymce.PluginManager.add('mainsidepanel', function (editor) {
            editor.ui.registry.addSidebar('mainsidepanel', {
                onSetup: function (api) {
                    api.element().innerHTML = me.createMainSidePanel();
                    me.setupPreferencesSidePanel(me);
                    // Ensure toggle is checked by default for all templates after sidebar is created (if feature is enabled)
                    var $esignEnabledToggle = me.$root.find(me.CONSTANTS.SELECTOR.ESIGN_ENABLED_ELEMENT);
                    if ($esignEnabledToggle.length > 0 && !$esignEnabledToggle.is(':checked')) {
                        $esignEnabledToggle.prop('checked', true);
                        // Sync hidden field
                        var hiddenField = me.$root.find(me.CONSTANTS.SELECTOR.ESIGN_HIDDEN_FIELD);
                        if (hiddenField.length > 0) {
                            hiddenField.val('true');
                        }
                    }
                    me.updateSidePanels(false);
                    // Update e-sign data attributes on toolbar buttons for Pendo tracking
                    setTimeout(function () {
                        if (me.updateESignDataAttributes) {
                            me.updateESignDataAttributes();
                        }
                    }, 100);
                },
                onShow: function () {
                    var event = new CustomEvent('main-sidebar', {
                        detail: true
                    });
                    window.parent.document.dispatchEvent(event);
                },
                onHide: function () {
                    var event = new CustomEvent('main-sidebar', {
                        detail: false
                    });
                    window.parent.document.dispatchEvent(event);
                }
            });
            editor.ui.registry.addToggleButton('configtoolbtn', {
                text: 'Config',
                tooltip: 'Config',
                icon: 'preferences',
                active: false,
                onSetup: function (api) {
                    api.setActive(true);
                    me.configSidePanelStatus = api.isActive();
                },
                onAction: function (api) {
                    api.setActive(!api.isActive());
                    me.configSidePanelStatus = api.isActive();
                    me.$root.find('.le-pref-side-panel').toggleClass('hidden');
                    me.updateSidePanels(false);
                }
            });

            // Helper function to insert checkbox based on e-sign state
            var insertCheckbox = function () {
                var isESignEnabled = me.isESignEnabled();
                if (isESignEnabled) {
                    // Insert e-sign checkbox call function from esign.js
                    // The function is set by the esign plugin during editor initialization
                    if (me.openESignCheckboxDialog && typeof me.openESignCheckboxDialog === 'function') {
                        me.openESignCheckboxDialog();
                    } else {
                        // Fallback: if function not available
                        // Trigger the menu item programmatically
                        var menuItem = editor.ui.registry.getAll().menuItems.esigncheckbox;
                        if (menuItem && menuItem.onAction) {
                            menuItem.onAction();
                        }
                    }
                } else {
                    // Insert normal checkbox
                    editor.insertContent('&nbsp;<input type="Checkbox" />&nbsp;');
                }
            };

            // Helper function to insert textbox based on e-sign state
            var insertTextbox = function () {
                var isESignEnabled = me.isESignEnabled();
                if (isESignEnabled) {
                    // Insert e-sign textbox call function from esign.js
                    // The function is set by the esign plugin during editor initialization
                    if (me.openESignTextboxDialog && typeof me.openESignTextboxDialog === 'function') {
                        me.openESignTextboxDialog();
                    } else {
                        // Fallback: if function not available
                        // Trigger the menu item programmatically
                        var menuItem = editor.ui.registry.getAll().menuItems.esigntextbox;
                        if (menuItem && menuItem.onAction) {
                            menuItem.onAction();
                        }
                    }
                } else {
                    // Using a table instead of <textarea> to avoid TinyMCE parsing issues that cause </body> corruption on save/reload
                    var textboxHtml = '<table class="textbox-block" width="100%" style="margin-top:4px;margin-bottom:4px;border:1px solid #000000;">' +
                        '<tbody>' +
                        '<tr style="height:18px;">' +
                        '<td style="padding:2px;vertical-align:top;border:none;">&nbsp;</td>' +
                        '</tr>' +
                        '</tbody>' +
                        '</table>';
                    editor.insertContent(textboxHtml);
                }
            };

            // Helper function to update data-esign-mode attributes on checkbox/textbox toolbar buttons
            // This allows Pendo tracking to differentiate between e-sign and normal control insertions
            var updateESignDataAttributes = function () {
                var isESignEnabled = me.isESignEnabled();
                var attrValue = isESignEnabled ? 'true' : 'false';

                var docs = [];
                if (window.parent && window.parent.document) {
                    docs.push(window.parent.document);
                }
                docs.push(document);

                for (var i = 0; i < docs.length; i++) {
                    var $doc = $(docs[i]);
                    $doc.find('[data-mce-name="customcheckboxbutton"]').attr('data-esign-checkbox', attrValue);
                    $doc.find('[data-mce-name="customtextboxbutton"]').attr('data-esign-textbox', attrValue);
                }
            };

            
            me.updateESignDataAttributes = updateESignDataAttributes;

            // This button is always enabled and inserts the appropriate checkbox based on e-sign state
            editor.ui.registry.addButton('customCheckboxButton', {
                tooltip: 'Insert Checkbox',
                icon: 'selected',
                onAction: insertCheckbox
            });

            // This button is always enabled and inserts the appropriate textbox based on e-sign state
            editor.ui.registry.addButton('customTextboxButton', {
                tooltip: 'Insert Text Box',
                icon: 'format',
                onAction: insertTextbox
            });

            // Override menu items with e-sign aware versions (for Insert menu)
            editor.ui.registry.addMenuItem('checkbox', {
                text: 'Checkbox',
                icon: 'selected',
                onAction: insertCheckbox
            });

            editor.ui.registry.addMenuItem('textbox', {
                text: 'Text Box',
                icon: 'format',
                onAction: insertTextbox
            });

            editor.ui.registry.addIcon(
                'addmergecode',
                '<svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg"> <path d="M5.88289 5.62592H7.87307L7.22511 8.30154H5.23492L5.88289 5.62592Z" fill="#222F3E"/> <path fill-rule="evenodd" clip-rule="evenodd" d="M4.12412 14C4.38758 14 4.63146 13.8971 4.8125 13.7254V15C4.8125 15.5523 5.26021 16 5.8125 16H14.8125C15.3648 16 15.8125 15.5523 15.8125 15V2C15.8125 1.44772 15.3648 1 14.8125 1H11.7812C11.7812 0.778175 11.7073 0.56012 11.5675 0.382154C11.3779 0.140878 11.0881 0 10.7812 0H8.96073C8.49858 0 8.09663 0.316688 7.98849 0.766007L7.98486 0.781089C7.95254 0.637028 7.88833 0.500082 7.79461 0.381127C7.60499 0.140459 7.31551 0 7.00912 0H5.18864C4.72649 0 4.32454 0.316688 4.2164 0.766007L3.72965 2.78845H1.90252C1.35024 2.78845 0.902525 3.23616 0.902525 3.78845V5.64204C0.902525 6.19433 1.35024 6.64204 1.90252 6.64204H2.81032L2.65636 7.28543H1C0.447715 7.28543 0 7.73314 0 8.28543V10.139C0 10.6913 0.447715 11.139 1 11.139H1.72954L1.33897 12.7667C1.2675 13.0645 1.33645 13.3786 1.52608 13.6191C1.7157 13.8596 2.00509 14 2.31136 14H4.12412ZM9.65498 5.64204H12V3.78845H10.1024L10.7812 1H8.96073L8.28962 3.78845H6.33801L7.00912 1H5.18864L4.51753 3.78845H1.90252V5.64204H4.07784L3.4453 8.28543H1V10.139H2.9979L2.31136 13H4.12412L4.81066 10.139H6.76999L6.08345 13H7.87307L8.56732 10.139H11.1052V8.28543H9.01473L9.65498 5.64204Z" fill="#222F3E"/> </svg>'
            );

            editor.ui.registry.addToggleButton('mergetoolbtn', {
                text: 'Merge code',
                tooltip: 'Merge code',
                icon: 'addmergecode',
                active: false,
                onSetup: function (api) {
                    api.setActive(false);
                },
                onAction: function (api) {
                    me.mergeCodeButtonAction();
                    api.setActive(true);
                }
            });

            // Update menu items with e-sign data attributes when Insert menu opens
            // This allows Pendo tracking to differentiate between e-sign and normal control insertions
            var updateMenuItemAttributes = function () {
                var isESignEnabled = me.isESignEnabled();
                var attrValue = isESignEnabled ? 'true' : 'false';

                var docs = [document];
                if (window.parent && window.parent.document && window.parent.document !== document) {
                    docs.push(window.parent.document);
                }

                for (var i = 0; i < docs.length; i++) {
                    var docBody = docs[i].body;
                    if (docBody) {
                        var $checkboxItems = $('.tox-collection__item[aria-label="Checkbox"]', docBody);
                        var $textboxItems = $('.tox-collection__item[aria-label="Text Box"]', docBody);                        
                        $checkboxItems.attr('data-esign-checkbox', attrValue);
                        $textboxItems.attr('data-esign-textbox', attrValue);
                    }
                }
            };

            // Attach click listener to Insert menu button using capture phase
            // TinyMCE uses stopPropagation so we need capture phase to intercept clicks before they are stopped
            var insertMenuClickHandler = function (e) {
                var $target = $(e.target);
                var $menuBtn = $target.closest('.tox-mbtn');
                if ($menuBtn.length > 0) {
                    var $label = $menuBtn.find('.tox-mbtn__select-label');
                    var labelText = $label.length > 0 ? $label.text().trim() : '';
                    if (labelText === 'Insert') {
                        setTimeout(updateMenuItemAttributes, 100);
                    }
                }
            };

            document.addEventListener('click', insertMenuClickHandler, true);
        });
    },

    // Helper: Setup preview panel plugin
    setupPreviewPanelPlugin: function () {
        var me = this;
        tinymce.PluginManager.add('previewpanel', function (editor) {
            editor.ui.registry.addToggleButton('previewtoolbtn', {
                text: 'Preview',
                tooltip: 'Preview',
                icon: 'preview',
                active: false,
                onSetup: function (api) {
                    api.setActive(true);
                    me.setupPreviewSidePanel(me);
                    me.previewSidePanelStatus = api.isActive();
                },
                onAction: function (api) {
                    api.setActive(!api.isActive());
                    me.previewSidePanelStatus = api.isActive();
                    me.$root.find('.le-preview-panel').toggleClass('hidden');
                    me.updateSidePanels(true);
                }
            });
        });
    },

    // Helper: Get initial e-sign state and sync hidden field
    getInitialESignState: function () {
        var me = this;
        var initialESignEnabled = false;
        var $esignEnabledToggleForInit = me.$root.find(me.CONSTANTS.SELECTOR.ESIGN_ENABLED_ELEMENT);
        if ($esignEnabledToggleForInit.length > 0) {
            initialESignEnabled = $esignEnabledToggleForInit.prop('checked');
        }
        
        // Ensure hidden field is synchronized with checkbox state
        var hiddenField = me.$root.find(me.CONSTANTS.SELECTOR.ESIGN_HIDDEN_FIELD);
        if (hiddenField.length > 0) {
            hiddenField.val(initialESignEnabled ? 'true' : 'false');
        }
        
        return initialESignEnabled;
    },

    setupEditor: function () {
        var me = this;
        
        // Check if e-sign feature is enabled and initialize checkbox
        var eSignFeatureEnabled = me.isESignFeatureEnabled();
        if (eSignFeatureEnabled) {
            me.initializeESignToggle();
        }
        
        // Initialize editor factory
        var editorFactory = alto.integration.helpers.LetterEditorFactory({
            groupId: $('#_groupid').val()
        });

        // Setup callbacks and initialization
        var setup = me.setupEditorCallbacks();
        var onInit = me.setupEditorInitialization();
        var customPlugins = me.setupCustomPlugins(eSignFeatureEnabled);

        // Get initial e-sign state
        var initialESignEnabled = me.getInitialESignState();
        
        // Create editor instance
        me.editor = editorFactory.getEditor({
            groupFonts: $('#publisher-fonts').val(),
            containerId: me.editorContainerId,
            parentContainerId: me.parentContainerId,
            container: me.$root.find(me.editorContainerId),
            setupCallback: setup,
            setupArgs: null,
            initCallback: onInit,
            customPlugins: customPlugins,
            customPluginsNames: eSignFeatureEnabled ? 'mainsidepanel, previewpanel, esignitems' : 'mainsidepanel, previewpanel',
            addFileMenu: true,
            saveCallback: me.action,
            renameCallback: me.rename,
            mergeCodeCallback: me.mergeCodeButtonAction,
            deleteCallback: me.delete,
            attachmentsCallback: me.attachments,
            isNewCallback: me.isNew,
            launchFullScreen: true,
            width: 857,
            height: 300,
            eSignEnabled: initialESignEnabled,
            showCustomFormButtons: true
        });

        me.editor.init();
    },

    updatePreviewDateTime: function () {
        var me = this;
        var dt = new Date();
        var zeroPrefixed = function (input) {
            if (input < 10) {
                return '0' + input;
            }
            return input;
        };
        var dateTime =
            zeroPrefixed(dt.getDate()) +
            '/' +
            zeroPrefixed(dt.getMonth() + 1) +
            '/' +
            dt.getFullYear() +
            ' ' +
            zeroPrefixed(dt.getHours()) +
            ':' +
            zeroPrefixed(dt.getMinutes()) +
            ':' +
            zeroPrefixed(dt.getSeconds());
        me.$root.find('.le-preview-last-updated').text(dateTime);
    },

    updateSidePanels: function (refreshPreviewArea) {
        var me = this;
        var mainSidePanel = me.$root.find('.le-main-side-panel');
        if (me.previewSidePanelStatus) {
            if (refreshPreviewArea) {
                me.$root
                    .find(
                        '.le-preview-panel .le-preview-container .le-preview-loader'
                    )
                    .removeClass('hidden');
                me.updatePreviewDateTime();
                me.loadPreview(me.$root.find('#le-preview-frame'));
            }
            if (mainSidePanel) {
                mainSidePanel.width($(window).width() / 2.2);

                me.$root
                    .find('.le-preview-panel #le-preview-frame')
                    .contents()
                    .find('body')
                    .css({
                        transform: 'scale(1)',
                        'transform-origin': 'top left'
                    });
                var contentHeight = me.$root
                    .find('.le-preview-panel #le-preview-frame')
                    .contents()
                    .find('html')
                    .height();
                var contentWidth = me.$root
                    .find('.le-preview-panel #le-preview-frame')
                    .contents()
                    .find('#Page1')
                    .width();
                me.$root
                    .find('.le-preview-panel #le-preview-frame')
                    .width(contentWidth);
                me.$root
                    .find('.le-preview-panel #le-preview-frame')
                    .height(contentHeight);

                var previewAreaWidth = 1;
                var ratio = 1;

                var calculateContainerHeight = function () {
                    previewAreaWidth =
                        me.$root
                            .find('.le-preview-panel .le-panel-button-bar')
                            .width() - 2;
                    ratio = previewAreaWidth / contentWidth;
                    var marginBottomPreview = 21;
                    me.$root
                        .find('.le-preview-panel .le-preview-container')
                        .height((contentHeight - marginBottomPreview) * ratio);
                    me.$root.find('.le-preview-panel #le-preview-frame').css({
                        transform: 'scale(' + ratio + ')',
                        'transform-origin': 'top left'
                    });
                };
                calculateContainerHeight();

                if (
                    me.$root
                        .find('.le-preview-panel .le-panel-button-bar')
                        .width() -
                        2 !=
                    me.$root.find('.le-preview-panel #le-preview-frame').width()
                ) {
                    calculateContainerHeight();
                }
                me.$root
                    .find('.le-preview-panel #le-preview-frame')
                    .contents()
                    .find('html')
                    .css({
                        overflow: 'hidden'
                    });
                if (!refreshPreviewArea) {
                    me.$root
                        .find(
                            '.le-preview-panel .le-preview-container .le-preview-loader'
                        )
                        .addClass('hidden');
                }
            }
        } else {
            if (mainSidePanel) {
                mainSidePanel.width('auto');
            }
        }
    },

    createMainSidePanel: function () {
        var me = this;
        var html = '<div class="le-main-side-panel">';
        html += $('#le-pref-side-bar-container').html();
        $('#le-pref-side-bar-container').remove();
        html += $('#le-preview-container').html();
        $('#le-preview-container').remove();
        html += '</div>';
        $('#le-preview-style').remove();
        $('<style type="text/css" id="le-preview-style"></style>').appendTo(
            'head'
        );
        var listenToPreviewDone = function (event) {
            var message = event.data;
            if (message == 'PREVIEW_RENDERED') {
                me.updateSidePanels(false);
            }
        };
        if (window.addEventListener) {
            window.addEventListener('message', listenToPreviewDone, false);
        } else if (window.attachEvent) {
            window.attachEvent('onmessage', listenToPreviewDone, false);
        }
        return html;
    },

    setupPreferencesSidePanel: function (me) {
        me.$root.find('.le-psp-setting .customStyleSelectBox').remove();
        me.$root
            .find('.le-pref-side-panel select')
            .removeClass('is-customised');
        me.$root
            .find('.le-pref-side-panel select')
            .not('.is-customised')
            .customSelect();

        me.$root.on('change', '#Template_BranchId', function () {
            me.linkSelectElements(
                me.$root.find('#le-psp-template-branch-id'),
                $(this)
            );
            me.updateEditorWithStationeryDetails();
        });
        me.$root.on('change', '#le-psp-template-branch-id', function () {
            me.linkSelectElements(me.$root.find('#Template_BranchId'), $(this));
            me.updateSelectHeight($(this));
            me.selectDefaultStationeryTemplateForBranch(false);
            me.updateEditorWithStationeryDetails();
        });

        me.$root.on('change', '#Template_BrandId', function () {
            me.linkSelectElements(
                me.$root.find('#le-psp-template-brand-id'),
                $(this)
            );
        });
        me.$root.on('change', '#le-psp-template-brand-id', function () {
            me.linkSelectElements(me.$root.find('#Template_BrandId'), $(this));
            me.updateSelectHeight($(this));
        });

        me.$root.on(
            'change',
            '#Template_DefaultStationeryTemplateId',
            function () {
                me.linkSelectElements(
                    me.$root.find('#le-psp-template-stationery-id'),
                    $(this)
                );
                me.updateEditorWithStationeryDetails();
            }
        );
        me.$root.on('change', '#le-psp-template-stationery-id', function () {
            me.linkSelectElements(
                me.$root.find('#Template_DefaultStationeryTemplateId'),
                $(this)
            );
            me.updateSelectHeight($(this));
            me.updateEditorWithStationeryDetails();
            me.updateSidePanels(true);
        });

        me.$root
            .find('.le-psp-setting #Template_SaleOrRent')
            .attr('id', 'le-psp-template-sale-or-rent');
        me.$root.on('change', '#Template_SaleOrRent', function () {
            me.linkSelectElements(
                me.$root.find('#le-psp-template-sale-or-rent'),
                $(this)
            );
        });
        me.$root.on('change', '#le-psp-template-sale-or-rent', function () {
            me.linkSelectElements(
                me.$root.find('#Template_SaleOrRent'),
                $(this)
            );
            me.updateSelectHeight($(this));
        });

        me.$root.on('change', '#Template_EventSubTypeId', function () {
            me.linkSelectElements(
                me.$root.find('#le-psp-template-event-subtype-id'),
                $(this)
            );
        });
        me.$root.on('change', '#le-psp-template-event-subtype-id', function () {
            me.linkSelectElements(
                me.$root.find('#Template_EventSubTypeId'),
                $(this)
            );
            me.updateSelectHeight($(this));
        });

        me.$root.on('change', '#LTEStatusActiveSelected', function () {
            var el = me.$root.find('#le-psp-template-lte-status');
            el.prop('checked', $(this).prop('checked'));
            el.parent().toggleClass('ticked');
        });
        me.$root.on('change', '#le-psp-template-lte-status', function () {
            var el = me.$root.find('#LTEStatusActiveSelected');
            el.prop('checked', $(this).prop('checked'));
            el.parent().toggleClass('ticked');
        });

        // Only set up e-sign change handler if feature is enabled
        if (me.isESignFeatureEnabled()) {
            var initialESignState = me.isESignEnabled();

            var $preTickedContainer = me.$root.find(me.CONSTANTS.SELECTOR.PRE_TICKED_CHECKBOX);
            if (initialESignState) {
                $preTickedContainer.hide();
            } else {
                $preTickedContainer.show();
            }
            
            me.$root.on('change', me.CONSTANTS.SELECTOR.ESIGN_ENABLED_ELEMENT, function () {
                var $this = $(this);
                var isChecked = $this.prop('checked');
                
                var $preTickedContainer = me.$root.find(me.CONSTANTS.SELECTOR.PRE_TICKED_CHECKBOX);
                if (isChecked) {
                    $preTickedContainer.hide();
                } else {
                    $preTickedContainer.show();
                }
                
                // If turning OFF, check for e-sign elements and show warning modal
                if (!isChecked) {
                    var eSignElements = me.detectESignElements();
                    
                    // If e-sign elements exist, show warning modal
                    if (eSignElements.hasElements) {
                        // Revert toggle state immediately (before modal)
                        $this.prop('checked', true);
                        
                        showDialog({
                            zIndex: 9999999,
                            type: 'question',
                            title: 'Remove E-sign Features?',
                            msg: 'This will delete any signers and interactive areas you\'ve added for e-signing and can\'t be undone. Would you like to continue?',
                            buttons: {
                                'Yes, continue': function () {
                                    // Remove all e-sign elements
                                    me.removeESignElements();
                                    
                                    // Now proceed with turning off e-sign
                                    $this.prop('checked', false);
                                    
                                    // Update the hidden field value (used for form submission)
                                    var hiddenField = me.$root.find('input[name="Template.ESignEnabled"][type="hidden"]');
                                    if (hiddenField.length > 0) {
                                        hiddenField.val(false);
                                    }
                                    
                                    // Update menu items visibility using CSS
                                    me.updateESignMenuItemsVisibility();

                                    // Update e-sign data attributes on toolbar buttons for Pendo tracking
                                    if (me.updateESignDataAttributes) {
                                        me.updateESignDataAttributes();
                                    }
                                    
                                    // If merge code autocomplete is currently open, refresh it with filtered list
                                    if (me.currentMergeCodeInput && me.currentMergeCodeInput.length > 0 && me.currentMergeCodeAc && me.currentMergeCodeAc.is(':visible')) {
                                        var $input = me.currentMergeCodeInput;
                                        var currentValue = $input.val();
                                        
                                        // Destroy existing typeahead
                                        if ($input.data('typeahead')) {
                                            $input.typeahead('destroy');
                                        }
                                        
                                        // Get filtered merge codes based on new e-sign state
                                        var filteredMergeCodes = me.getFilteredMergeCodes();
                                        
                                        // Ensure we have a proper array (create a new array to avoid reference issues)
                                        var mergeCodesArray = Array.isArray(filteredMergeCodes) ? filteredMergeCodes.slice(0) : [];
                                        
                                        // Use a unique dataset name to avoid typeahead's internal caching
                                        var datasetName = 'documentMergeCodes_' + Date.now();
                                        
                                        // Reinitialise typeahead with filtered list
                                        $input.typeahead({
                                            name: datasetName,
                                            local: mergeCodesArray,
                                            limit: 250,
                                            template: [
                                                '<p class="mergecode-ac-item-name">{{name}}</p>',
                                                '<p class="mergecode-ac-item-description">{{description}}</p>',
                                                '<p class="mergecode-ac-item-example">{{example}}</p>'
                                            ].join(''),
                                            engine: Hogan
                                        });
                                        
                                        // Restore the input value
                                        $input.val(currentValue);
                                    }
                                    
                                    $(this).dialog('close');
                                },
                                Cancel: function () {
                                    // Toggle is already reverted, just close the dialog
                                    $(this).dialog('close');
                                }
                            }
                        });
                        
                        return;
                    }
                }
                
                // Normal flow: turning ON or turning OFF with no elements
                // Update the hidden field value (used for form submission)
                // The hidden field is created by @Html.HiddenFor(m => m.Template.ESignEnabled)
                var hiddenField = me.$root.find('input[name="Template.ESignEnabled"][type="hidden"]');
                if (hiddenField.length > 0) {
                    hiddenField.val(isChecked);
                }
                // Update menu items visibility using CSS
                me.updateESignMenuItemsVisibility();

                // Update e-sign data attributes on toolbar buttons for Pendo tracking
                if (me.updateESignDataAttributes) {
                    me.updateESignDataAttributes();
                }
                
                // If merge code autocomplete is currently open, refresh it with filtered list
                if (me.currentMergeCodeInput && me.currentMergeCodeInput.length > 0 && me.currentMergeCodeAc && me.currentMergeCodeAc.is(':visible')) {
                    var $input = me.currentMergeCodeInput;
                    var currentValue = $input.val();
                    
                    // Destroy existing typeahead
                    if ($input.data('typeahead')) {
                        $input.typeahead('destroy');
                    }
                    
                    // Get filtered merge codes based on new e-sign state
                    var filteredMergeCodes = me.getFilteredMergeCodes();
                    
                    // Ensure we have a proper array (create a new array to avoid reference issues)
                    var mergeCodesArray = Array.isArray(filteredMergeCodes) ? filteredMergeCodes.slice(0) : [];
                    
                    // Use a unique dataset name to avoid typeahead's internal caching
                    var datasetName = 'documentMergeCodes_' + Date.now();
                    
                    // Reinitialize typeahead with filtered list
                    $input.typeahead({
                        name: datasetName,
                        local: mergeCodesArray,
                        limit: 250,
                        template: [
                            '<p class="mergecode-ac-item-name">{{name}}</p>',
                            '<p class="mergecode-ac-item-description">{{description}}</p>',
                            '<p class="mergecode-ac-item-example">{{example}}</p>'
                        ].join(''),
                        engine: Hogan
                    });
                    
                    // Restore the input value
                    $input.val(currentValue);
                }
            });
        }

        me.$root.on('change', '#Template_TenancyTerm', function () {
            me.linkSelectElements(
                me.$root.find('#le-psp-template-tenancy-term'),
                $(this)
            );
        });
        me.$root.on('change', '#le-psp-template-tenancy-term', function () {
            me.linkSelectElements(
                me.$root.find('#Template_TenancyTerm'),
                $(this)
            );
            me.updateSelectHeight($(this));
        });
    },

    updateSelectHeight: function (element) {
        var me = this;
        var parent = element.parent();
        var customSelect = parent.find('.customStyleSelectBox');
        var defaultHeight = me.CONSTANTS.DEFAULT.SELECT_HEIGHT;
        var customSelectHeight = customSelect.outerHeight();
        if (customSelectHeight < defaultHeight) {
            customSelectHeight = defaultHeight;
        }
        element.height(customSelectHeight);
    },

    setupPreviewSidePanel: function (me) {
        me.$root.on('click', '.le-preview-refresh', function () {
            me.updateSidePanels(true);
        });
        me.$root.on('click', '.le-preview-full-screen', function () {
            me.togglePreview();
        });
    },

    updateESignMenuItemsVisibility: function () {
        var me = this;
        var $esignEnabledToggle = me.$root.find(me.CONSTANTS.SELECTOR.ESIGN_ENABLED_ELEMENT);

        if ($esignEnabledToggle.length === 0) {
            return;
        }
        
        var isEnabled = me.isESignEnabled();
        
        me._esignMenuItemsHidden = !isEnabled;
              
        // Trigger editor node change to refresh toolbar button state
        if (me.editor && me.editor.getEditorInstance) {
            var editorInstance = me.editor.getEditorInstance();
            if (editorInstance) {
                editorInstance.nodeChanged();
            }
        }
    },

    linkSelectElements: function (el1, el2) {
        el1.val(el2.val());
        el1.parent()
            .find('.customStyleSelectBoxInner')
            .text($('option:selected', el2).text());
    },

    fixWinmanTags: function (evt, me) {
        //winman tag conversion as <<TAG>> isnt liked by CK Editor
        // find all <<TAG>> and if found, replace with Alto equivalents
        var re = me.CONSTANTS.REGEX.WINMAN_TAG;

        // eslint-disable-next-line no-unused-vars
        evt.data.dataValue = evt.data.dataValue.replace(re, function (match, text, urlId) {
                match = match
                    .replace(/&lt;/gi, '<')
                    .replace(/&gt;/gi, '>')
                    .replace('<<&amp;', '<<');

                var altoMatch = $.grep(me.mergeCodeTranslations, function (e) {
                    return (
                        e.SourceMergeCode.toUpperCase() === match.toUpperCase()
                    );
                });

                if (altoMatch.length == 1) {
                    match = altoMatch[0].DestinationMergeCode;
                } else {
                    match =
                        '<span data-id="alto-codingerror" style="color:red;">' +
                        match.toUpperCase().replace(/[<>]/gi, '') +
                        '</span>';
                }

                return match;
            }
        );
    },

    getMergeCodeTranslations: function () {
        return new gmgps.cloud.http(
            "lettertemplateeditor-getMergeCodeTranslations"
        ).ajax({
            args: {},
            complex: true,
            dataType: 'json',
            type: 'post',
            url: '/Document/GetMergeCodeTranslations'
        });
    },

    // Helper: Check if e-sign is enabled (uses hidden field as source of truth)
    isESignEnabled: function () {
        var me = this;
        // Use hidden field as source of truth since it's always in DOM (not in sidebar)
        var hiddenField = me.$root.find(me.CONSTANTS.SELECTOR.ESIGN_HIDDEN_FIELD);
        var isESignEnabled = false;
        
        if (hiddenField.length > 0) {
            // Hidden field exists, use it as source of truth
            var hiddenValue = hiddenField.val();
            isESignEnabled = hiddenValue === 'true' || hiddenValue === 'True';
        } else {
            // Fallback if hidden field not found (shouldn't happen normally)
            var $esignEnabledToggle = me.$root.find(me.CONSTANTS.SELECTOR.ESIGN_ENABLED_ELEMENT);
            if ($esignEnabledToggle.length === 0) {
                $esignEnabledToggle = $(me.CONSTANTS.SELECTOR.ESIGN_ENABLED_ELEMENT);
            }
            if ($esignEnabledToggle.length > 0) {
                isESignEnabled = $esignEnabledToggle.is(':checked') || $esignEnabledToggle.prop('checked') === true;
            }
        }
        
        return isESignEnabled;
    },

    getFilteredMergeCodes: function () {
        var me = this;
        var mergeCodes = me.documentMergeCodesOriginal || me.documentMergeCodes || [];
        
        if (!mergeCodes || mergeCodes.length === 0) {
            return mergeCodes;
        }
        
        // Check if e-sign feature is enabled
        var isESignEnabled = me.isESignEnabled();
        
        // If feature not enabled, return all merge codes
        if (!me.isESignFeatureEnabled()) {
            return mergeCodes;
        }
        
        // If e-sign is disabled, filter out e-signature merge codes
        if (!isESignEnabled) {
            return mergeCodes.filter(function(code) {
                if (!code || !code.name) {
                    return true; // Keep codes without names
                }
                var name = String(code.name || '').toLowerCase();
                // Filter out merge codes that contain "esignature" in the name
                // e.g., "#esignature_landlord#" should be filtered out
                return name.indexOf('esignature') === -1;
            });
        }
        
        // If e-sign is enabled, return all merge codes
        return mergeCodes;
    },

    detectESignElements: function () {
        var me = this;
        var checkboxCount = 0;
        var mergeCodeCount = 0;
        var hasElements = false;
        
        try {
            // Get editor instance
            var editor = me.editor.getEditorInstance();
            if (!editor) {
                return { checkboxCount: 0, mergeCodeCount: 0, hasElements: false };
            }
            
            // Get editor body to search for checkboxes
            var body = editor.getBody();
            var $body = $(body);
            
            // Count e-sign checkboxes (tables containing data-esign-table="true")
            var $checkboxTables = $body.find('table').filter(function() {
                return $(this).find('[data-esign-table="true"]').length > 0;
            });
            checkboxCount = $checkboxTables.length;
            
            // Get editor content to search for merge codes
            var content = editor.getContent();
            
            // Count e-signature merge codes using regex pattern #esignature_\w+#
            // This matches patterns like #esignature_landlord#, #esignature_tenant#, etc.
            var mergeCodePattern = me.CONSTANTS.REGEX.ESIGNATURE_MERGE_CODE;
            var mergeCodeMatches = content.match(mergeCodePattern);
            if (mergeCodeMatches) {
                mergeCodeCount = mergeCodeMatches.length;
            }
            
            hasElements = checkboxCount > 0 || mergeCodeCount > 0;
        } catch (e) {
            // If there's an error, assume no elements exist
            console.error('Error detecting e-sign elements:', e);
        }
        
        return {
            checkboxCount: checkboxCount,
            mergeCodeCount: mergeCodeCount,
            hasElements: hasElements
        };
    },

    removeESignElements: function () {
        var me = this;
        
        try {
            // Get editor instance
            var editor = me.editor.getEditorInstance();
            if (!editor) {
                return;
            }
            
            // Get editor body
            var body = editor.getBody();
            var $body = $(body);
            
            // Remove all e-sign checkbox tables
            var $checkboxTables = $body.find('table').filter(function() {
                return $(this).find('[data-esign-table="true"]').length > 0;
            });
            
            $checkboxTables.each(function() {
                var tableElement = this;
                editor.dom.remove(tableElement);
            });
            
            // Remove all e-sign textbox tables
            var $textboxTables = $body.find('table').filter(function() {
                return $(this).hasClass('signature-block-textbox') || $(this).attr('data-esign-type') === 'textbox';
            });
                        
            $textboxTables.each(function() {
                var tableElement = this;
                editor.dom.remove(tableElement);
            });
            
            // Get current content and remove e-signature merge codes
            var content = editor.getContent();
            
            // Remove all e-signature merge codes using regex pattern #esignature_\w+#
            var mergeCodePattern = me.CONSTANTS.REGEX.ESIGNATURE_MERGE_CODE;
            content = content.replace(mergeCodePattern, '');
            
            // Set the cleaned content back
            editor.setContent(content);
            
            // Fire change event to mark as dirty
            editor.dispatch('change');
            
            // Mark the template as dirty
            me.setDirty(true);
        } catch (e) {
            console.error('Error removing e-sign elements:', e);
        }
    },

    promptForMergeCode: function (args) {
        var me = args.me;

        var $ac = $(
            '<div class="document-merge-code-ac"><div class="container"><div class="close-mergecode-section-button btn bgg-grey">Cancel</div><div class="prompt">Describe the merge code you need (e.g. "applicant mobile", "property street" or "lease years"):</div><input type="text" class="typeahead"/></div></div>'
        );
        me.$root.append($ac);
        $ac.show();

        me.$root.on('click', '.close-mergecode-section-button', function () {
            // Clear references when autocomplete is closed
            me.currentMergeCodeInput = null;
            me.currentMergeCodeAc = null;
            me.editor.unselectMergeCodeButton();
        });

        var $input = $ac.find('.typeahead');
        
        // Store reference to autocomplete input for potential refresh
        me.currentMergeCodeInput = $input;
        me.currentMergeCodeAc = $ac;

        // Destroy any existing typeahead instance first
        if ($input.data('typeahead')) {
            $input.typeahead('destroy');
        }
        
        // Get filtered merge codes based on e-sign toggle state
        var filteredMergeCodes = me.getFilteredMergeCodes();
        
        // Ensure we have a proper array (create a new array to avoid reference issues)
        var mergeCodesArray = Array.isArray(filteredMergeCodes) ? filteredMergeCodes.slice(0) : [];
        
        // Use a unique dataset name to avoid typeahead's internal caching
        // This ensures we always get fresh data with the current filter applied
        var datasetName = 'documentMergeCodes_' + Date.now();

        $input.typeahead({
            name: datasetName,
            local: mergeCodesArray,
            limit: me.CONSTANTS.DEFAULT.MERGE_CODE_LIMIT,
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
                
                // Clear references when autocomplete is closed
                me.currentMergeCodeInput = null;
                me.currentMergeCodeAc = null;

                me.editor.focusEditor();
            }
        });

        $input.on('typeahead:selected', function (object, datum) {
            $ac.remove();
            
            // Clear references when autocomplete is closed
            me.currentMergeCodeInput = null;
            me.currentMergeCodeAc = null;

            if (args.callback) {
                args.callback(datum.name);
            }

            setTimeout(function () {
                var text = datum.synonymousWith || datum.name;
                var textToInsert = '{0} '.format(text);
                me.editor.insertTextInEditor(
                    me.hashWasInserted == true
                        ? textToInsert.substr(1)
                        : textToInsert
                );
                me.editor.unselectMergeCodeButton();
            }, me.CONSTANTS.TIMEOUT.MERGE_CODE_INSERT);
        });

        setTimeout(function () {
            $input.val('').focus();
        }, me.CONSTANTS.TIMEOUT.MERGE_CODE_FOCUS);
    },

    saveTemplate: function (callback, self) {
        var me = this;
        if (self) {
            me = self;
        }

        //Update the textarea with the contents of the editor. #req?
        me.editor.updateEditor();

        //Set computed fields.
        me.$root
            .find(me.CONSTANTS.SELECTOR.TEMPLATE_STATUS)
            .val(
                me.$root.find(me.CONSTANTS.SELECTOR.LTE_STATUS_ACTIVE).prop('checked')
                    ? C.DocumentTemplateStatus.ActiveSelected
                    : C.DocumentTemplateStatus.ActiveUnselected
            );

        //Save the template.
        me.http.postForm(
            createForm(me.$root, '/Publisher/UpdateLetterTemplate'),
            function (response) {
                if (me.templateCanBeDeleted() === true) {
                    me.editor.resetDirty('delete');
                }

                if (response.Data !== 0) {
                    me.id = response.Data;
                    me.$root.find(me.CONSTANTS.SELECTOR.TEMPLATE_ID).val(me.id);
                    me.$window
                        .find(me.CONSTANTS.SELECTOR.ATTACHMENTS_BUTTON)
                        .removeClass('disabled');
                    me.$window.find(me.CONSTANTS.SELECTOR.DELETE_BUTTON).removeClass('disabled');
                    if (callback) callback(true);
                }

                me.setDirty(false);
            },
            function () {
                if (callback) callback(true);
            }
        );
    },

    cancel: function (closeCallback) {
        var me = this;

        //If the preview is on, then the close button closes the preview rather than the whole form.
        if (me.$window.find(me.CONSTANTS.SELECTOR.PREVIEW_BUTTON).hasClass('on')) {
            me.$window.find(me.CONSTANTS.SELECTOR.PREVIEW_BUTTON).trigger('click');

            //Exit early.
            return true;
        }

        //Decided what to do when the close button is clicked, depending on whether or not there are unsaved changes.
        if (me.isDirty) {
            showDialog({
                zIndex: 9999999,
                type: 'question',
                title: 'Unsaved Changes',
                msg: 'You have unsaved changes on this template.',
                buttons: {
                    Save: function () {
                        if (me.$root.find('#Template_Name').val() == '') {
                            closeCallback(false);
                            $(this).dialog('close');
                            showInfo('Please give the template a name.');
                            $('#letterTemplateEditorModal').css({ opacity: 1 });
                        } else {
                            me.saveTemplate(function () {
                                $('#letterTemplateEditorModal').css({
                                    opacity: 0
                                });
                                me.editor.closeEditor();
                                closeCallback(true);
                                googleAnalytics.sendEvent(
                                    'tools.newadhoclettertemplate',
                                    'button_click',
                                    'close_save'
                                );
                            });
                            $(this).dialog('close');
                        }
                    },
                    'Discard Changes': function () {
                        $('#letterTemplateEditorModal').css({ opacity: 0 });
                        me.editor.closeEditor();
                        closeCallback(true);
                        googleAnalytics.sendEvent(
                            'tools.newadhoclettertemplate',
                            'button_click',
                            'close_discard'
                        );
                        $(this).dialog('close');
                    },
                    Cancel: function () {
                        $('#letterTemplateEditorModal').css({ opacity: 1 });
                        closeCallback(false);
                        googleAnalytics.sendEvent(
                            'tools.newadhoclettertemplate',
                            'button_click',
                            'close_cancel'
                        );
                        $(this).dialog('close');
                    }
                }
            });

            return true; //prevent the window from closing
        }
        me.editor.closeEditor();
    },

    setDirty: function (isDirty, self) {
        var me = this;
        if (self) {
            me = self;
        }

        if (isDirty != me.isDirty) {
            me.isDirty = isDirty;

            var $actionButton = me.$window.find('.action-button');
            var $saveButton = me.$window.find('.le-save-btn');
            // eslint-disable-next-line no-unused-vars
            var $closeButton = me.$window.find('.cancel-button');

            if (isDirty) {
                $actionButton.removeClass('disabled').prop('disabled', false);
                $saveButton.removeClass('disabled').prop('disabled', false);
            } else {
                $actionButton.addClass('disabled').prop('disabled', true);
                $saveButton.addClass('disabled').prop('disabled', true);
            }
        }
    }
};

//all available buttons listed here for reference.
//toolbar: [
//	{ name: 'document', groups: ['mode', 'document', 'doctools'], items: ['Source', '-', 'Save', 'NewPage', 'Preview', 'Print', '-', 'Templates'] },
//	{ name: 'clipboard', groups: ['clipboard', 'undo'], items: ['Cut', 'Copy', 'Paste', 'PasteText', 'PasteFromWord', '-', 'Undo', 'Redo'] },
//	{ name: 'editing', groups: ['find', 'selection', 'spellchecker'], items: ['Find', 'Replace', '-', 'SelectAll', '-', 'Scayt'] },
//	{ name: 'forms', items: ['Form', 'Checkbox', 'Radio', 'TextField', 'Textarea', 'Select', 'Button', 'ImageButton', 'HiddenField'] },
//	'/',
//	{ name: 'basicstyles', groups: ['basicstyles', 'cleanup'], items: ['Bold', 'Italic', 'Underline', 'Strike', 'Subscript', 'Superscript', '-', 'RemoveFormat'] },
//	{ name: 'paragraph', groups: ['list', 'indent', 'blocks', 'align', 'bidi'], items: ['NumberedList', 'BulletedList', '-', 'Outdent', 'Indent', '-', 'Blockquote', 'CreateDiv', '-', 'JustifyLeft', 'JustifyCenter', 'JustifyRight', 'JustifyBlock', '-', 'BidiLtr', 'BidiRtl'] },
//	{ name: 'links', items: ['Link', 'Unlink', 'Anchor'] },
//	{ name: 'insert', items: ['Image', 'Flash', 'Table', 'HorizontalRule', 'Smiley', 'SpecialChar', 'PageBreak', 'Iframe'] },
//	'/',
//	{ name: 'styles', items: ['Styles', 'Format', 'Font', 'FontSize'] },
//	{ name: 'colors', items: ['TextColor', 'BGColor'] },
//	{ name: 'tools', items: ['Maximize', 'ShowBlocks'] },
//	{ name: 'others', items: ['-'] },
//	{ name: 'about', items: ['About'] }
//]
