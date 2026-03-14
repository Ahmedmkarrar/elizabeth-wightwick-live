'use strict';
/*global tinymce*/
alto.integration.TinyMce = function (args) {
    var instance = null;
    var editorInitialised = false;
    var canBeDeleted = false;
    var groupFonts = args.groupFonts;
    var containerId = args.containerId;
    var setupCallback = args.setupCallback;
    var setupArgs = args.setupArgs;
    var documentId = args.documentId;
    var parentContainerId = args.parentContainerId;
    var addFileMenu = args.addFileMenu;
    var saveCallback = args.saveCallback;
    var renameCallback = args.renameCallback;
    var deleteCallback = args.deleteCallback;
    var attachmentsCallback = args.attachmentsCallback;
    var isNewCallback = args.isNewCallback;
    var customPlugins = args.customPlugins;
    var customPluginsNames = args.customPluginsNames;
    var initCallback = args.initCallback;
    var mergeCodeCallback = args.mergeCodeCallback;
    var launchFullScreen = args.launchFullScreen;
    var showCustomFormButtons = args.showCustomFormButtons;

    // ***************************************************************
    // IMPORTANT! - the following plugins are forbidden for GDPR compliance reasons:
    // 'tinydrive', 'imagetools', 'tinymcespellchecker', 'mediaembed', 'linkchecker'
    // DO NOT include them in config without consulting Product!
    // There is a jasmine unit test enforcing this rule!
    // ***************************************************************
    var plugins =
        'powerpaste casechange importcss searchreplace autolink directionality advcode visualblocks visualchars fullscreen link table charmap pagebreak nonbreaking insertdatetime advlist lists checklist wordcount a11ychecker help formatpainter charmap quickbars advtable';

    // ****************************************************************

    function init() {
        var result =
            alto.integration.helpers.LetterEditor.waitForAvailable('tinymce');
        if (!result) {
            showInfo(
                'There was an issue loading the letter editor. Please refresh the page and try again!'
            );
        }
        var config = getConfig();
        tinymce.init(config);
    }

    function getSetup() {
        var setup = function (editor) {
            instance = editor;

            if (showCustomFormButtons) {
                editor.ui.registry.addButton('customCheckboxButton', {
                    icon: 'selected',
                    tooltip: 'Insert Checkbox',
                    onAction: function () {
                        editor.insertContent(
                            '&nbsp;<input type="Checkbox" />&nbsp;'
                        );
                    }
                });

                editor.ui.registry.addButton('customTextboxButton', {
                    icon: 'format',
                    tooltip: 'Insert Text Box',
                    onAction: function () {
                        // Using a styled table instead of <textarea> to avoid TinyMCE parsing issues
                        var textboxHtml = '<table class="textbox-block" width="100%" style="margin-top:4px;margin-bottom:4px;border:1px solid #000000;">' +
                            '<tbody>' +
                            '<tr style="height:18px;">' +
                            '<td style="padding:2px;vertical-align:top;border:none;">&nbsp;</td>' +
                            '</tr>' +
                            '</tbody>' +
                            '</table>';
                        editor.insertContent(textboxHtml);
                    }
                });

                editor.ui.registry.addMenuItem('checkbox', {
                    text: 'Checkbox',
                    icon: 'selected',
                    onAction: function () {
                        editor.insertContent(
                            '&nbsp;<input type="Checkbox" />&nbsp;'
                        );
                    }
                });

                editor.ui.registry.addMenuItem('textbox', {
                    text: 'Text Box',
                    icon: 'format',
                    onAction: function () {
                        // Using a styled table instead of <textarea> to avoid TinyMCE parsing issues
                        var textboxHtml = '<table class="textbox-block" width="100%" style="margin-top:4px;margin-bottom:4px;border:1px solid #000000;">' +
                            '<tbody>' +
                            '<tr style="height:18px;">' +
                            '<td style="padding:2px;vertical-align:top;border:none;">&nbsp;</td>' +
                            '</tr>' +
                            '</tbody>' +
                            '</table>';
                        editor.insertContent(textboxHtml);
                    }
                });
            }

            editor.on('init', function () {
                editorInitialised = true;

                if (launchFullScreen) {
                    instance.execCommand('mceFullScreen');
                }

                $('.tox-tbtn[title="Fullscreen"]')
                    .attr('ga-category', 'tools.newadhoclettertemplate')
                    .attr('ga-action', 'button_click')
                    .attr('ga-label', 'fullscreen');
                resizeEditor();

                if (initCallback) {
                    initCallback();
                }

                setupCallback(setupArgs);

                $(editor.getBody()).on('change', ':checkbox', function (el) {
                    if (el.target.checked) {
                        $(el.target).attr('checked', 'checked');
                    } else {
                        $(el.target).removeAttr('checked');
                    }
                });
            });

            if (customPlugins) {
                customPlugins();
            }

            if (addFileMenu) {
                editor.ui.registry.addMenuItem('save', {
                    text: 'Save',
                    onAction: function () {
                        saveCallback(function () {});
                    }
                });

                editor.ui.registry.addMenuItem('rename', {
                    text: 'Rename',
                    onAction: function () {
                        renameCallback();
                    }
                });

                editor.ui.registry.addMenuItem('attachments', {
                    text: 'Attachments',
                    onAction: function () {
                        attachmentsCallback();
                    },
                    onSetup: function (api) {
                        api.setEnabled(!isNewCallback());
                    }
                });

                editor.ui.registry.addMenuItem('delete', {
                    text: 'Delete',
                    onAction: function () {
                        deleteCallback();
                    },
                    onSetup: function (api) {
                        api.setEnabled(canBeDeleted);
                    }
                });

                editor.ui.registry.addMenuItem('mergecode', {
                    text: 'Merge Code',
                    icon: 'addmergecode',
                    onAction: function () {
                        selectMergeCodeButton();
                        mergeCodeCallback();
                    }
                });
            }
        };
        return setup;
    }

    function getConfig() {
        var menubar = 'edit view insert format tools table help';
        var menu = {
            edit: {
                title: 'Edit',
                items: 'undo redo | cut copy paste | selectall | searchreplace'
            },
            view: {
                title: 'View',
                items: 'code | visualaid visualchars visualblocks'
            },
            insert: {
                title: 'Insert',
                items: 'mergecode checkbox textbox link inserttable | pagebreak charmap hr emoticons | nonbreaking | insertdatetime'
            },
            format: {
                title: 'Format',
                items: 'bold italic underline strikethrough superscript subscript | styles blocks fontfamily fontsize align lineheight | forecolor backcolor | removeformat formatpainter'
            },
            tools: { title: 'Tools', items: 'code wordcount' },
            table: {
                title: 'Table',
                items: 'inserttable | cell row column | tableprops deletetable'
            },
            help: { title: 'Help', items: 'help' }
        };
        if (addFileMenu) {
            menubar = 'file ' + menubar;
            menu.file = {
                title: 'File',
                items: 'save rename attachments delete'
            };
        }
        if (customPluginsNames) {
            plugins += ' ' + customPluginsNames;
        }
        var formButtons = showCustomFormButtons ? 'customCheckboxButton customTextboxButton' : '';
        var config = {
            selector: containerId,
            branding: false,
            plugins: plugins,
            menubar: menubar,
            menu: menu,
            toolbar: [
                `casechange insertfile link table pagebreak charmap hr numlist bullist ${formButtons} outdent indent blockquote alignleft aligncenter alignright alignjustify a11ycheck code configtoolbtn previewtoolbtn mergetoolbtn`,
                'bold italic underline strikethrough superscript subscript removeformat undo redo blocks fontfamily fontsize forecolor backcolor '
            ],
            importcss_append: true,
            height: 400,
            /*  TinyMCE 7 security options for backward compatibility
            setting to false is required for backward compatibility with TinyMCE 6.
            https://www.tiny.cloud/docs/tinymce/latest/migration-from-6x/#sandbox-iframes-option
            https://www.tiny.cloud/docs/tinymce/latest/migration-from-6x/#convert-unsafe-embeds-option
            */
            sandbox_iframes: false,
            convert_unsafe_embeds: false,
            /*
            highlight_on_focus is used to highlight the text when the editor is focused.
            Setting to false is required for visual backward compatibility with TinyMCE 6.
            https://www.tiny.cloud/docs/tinymce/latest/migration-from-6x/#highlight-on-focus
            */
            highlight_on_focus: false,
            quickbars_selection_toolbar:
                'bold italic | quicklink h2 h3 blockquote quicktable',
            quickbars_image_toolbar: false,
            quickbars_insert_toolbar: false,
            noneditable_class: 'mceNonEditable',
            toolbar_mode: 'sliding',
            content_style: 'body { padding: 10px; } ' +
                getFontStyleCSS(),
            font_family_formats: getFontList(),
            font_size_formats:
                '8px 9px 10px 11px 12px 14px 16px 18px 20px 22px 24px 26px 28px 36px 48px 72px',
            block_formats:
                'Paragraph=p; Heading 1=h1; Heading 2=h2; Heading 3=h3; Preformatted=pre',
            browser_spellcheck: true,
            contextmenu: false,
            a11y_advanced_options: true,
            content_css: 'document',
            pagebreak_separator: '#page_break#',
            setup: getSetup(),
            insertdatetime_formats: ['%d/%m/%Y', '%I:%M:%S %p'],
            smart_paste: false,
            image_file_types: 'jpeg,jpg,jpe,jfi,jfif,png,gif,bmp,webp,svn',
            relative_urls: false,
            table_sizing_mode: 'relative',
            forced_root_block_attrs: {
                style: 'margin-top: 0; margin-bottom: 0;'
            },
            invalid_styles: {
                table: 'height',
                td: 'height'
            },
            text_patterns: [
                { start: '*', end: '*', format: 'italic' },
                { start: '**', end: '**', format: 'bold' },
                /* The following text patterns require the `lists` plugin
                We need to set the trigger to 'space' to ensure that the list is inserted when the user presses the space key.
                https://www.tiny.cloud/docs/tinymce/latest/migration-from-6x/#changes-to-text-pattern-defaults-to-trigger-on-space-key-press
                */
                { start: '1. ', cmd: 'InsertOrderedList', trigger: 'space' },
                { start: '* ', cmd: 'InsertUnorderedList', trigger: 'space' },
                { start: '- ', cmd: 'InsertUnorderedList', trigger: 'space' }
            ]
        };

        return config;
    }

    function setMergeCodePrompt(callback, args) {
        function run() {
            setTimeout(function () {
                callback(args);
            }, 50);
        }

        if (typeof args.me.originMergeCodeButtonAction !== 'undefined') {
            args.me.hashWasInserted = false;
            run();
        }

        instance.on('keyup', function (e) {
            if (e.charCode == 35 || e.key == '#') {
                selectMergeCodeButton();
                args.me.hashWasInserted = true;
                run();
            }
        });
    }

    function selectMergeCodeButton() {
        $(getEditorContainer())
            .find("[aria-label='Merge code']")
            .addClass('tox-tbtn--enabled');
    }

    function unselectMergeCodeButton() {
        $(getEditorContainer())
            .find("[aria-label='Merge code']")
            .removeClass('tox-tbtn--enabled');
    }

    function setEditorTimestamp() {
        return;
    }

    function setContent(content) {
        instance.setContent(content);
    }

    function resizeEditor() {
        if (instance && getEditorContainer()) {
            var parentHeight = $(parentContainerId).height();
            var verticalOffset = getEditorContainer().offsetTop;
            getEditorContainer().style.height =
                parentHeight - verticalOffset + 'px';
        }
        return;
    }

    function getEditorContainer() {
        return instance.getContainer();
    }

    function getEditorContent() {
        return instance.getContent();
    }

    function closeEditor() {
        if (editorInitialised) {
            instance.remove();
        }
    }

    function getEditorInstance() {
        return tinymce.activeEditor;
    }

    function insertTextInEditor(text) {
        instance.insertContent(text);
    }

    function focusEditor() {
        instance.focus();
    }

    function getFontList() {
        //Fetch the publisher fonts for the group.
        var fonts = groupFonts.split(';');
        var fontStringList = '';
        $.each(fonts, function (i, v) {
            var fontParts = v.split('|');
            if (fontParts[1] != 0) {
                //only interested in custom fonts.
                fontStringList += '{0}={0};'.format(fontParts[0]);
            }
        });

        fontStringList +=
            'Arial=arial,helvetica,sans-serif; Arial Black=arial black,avant garde; Calibri=calibri; Comic Sans MS=comic sans ms,sans-serif,cursive;';
        fontStringList +=
            'Courier New = courier new, courier, monospace; Georgia = georgia, serif; Lucida Sans=lucida sans unicode,lucida grande,sans-serif;';
        fontStringList +=
            'Tahoma = tahoma, geneva, sans-serif; Times New Roman = times new roman, times, serif; Trebuchet MS = trebuchet ms, helvetica, sans-serif; Verdana = verdana, geneva, sans-serif;';

        return fontStringList;
    }

    function getFontStyleCSS() {
        //Fetch the publisher fonts for the group.
        var fonts = groupFonts.split(';');
        var tinyMCEFontStyleCSS = '';

        $.each(fonts, function (i, v) {
            var fontParts = v.split('|');
            if (fontParts[1] != 0) {
                //only interested in custom fonts.
                tinyMCEFontStyleCSS +=
                    "@font-face {font-family: '{0}'; src: url('/publisher/getfont/{1}')} ".format(
                        fontParts[0],
                        fontParts[1]
                    );
            }
        });

        return tinyMCEFontStyleCSS;
    }

    function attachChangeListener(callback, arg1, arg2) {
        instance.on('change input', function () {
            callback(arg1, arg2);
            instance.save();
        });
        $(instance.getBody()).on('change', ':checkbox', function () {
            callback(arg1, arg2);
            instance.save();
        });
    }

    function attachPasteListener(callback, args) {
        instance.on('paste', function (evt) {
            callback(evt, args);
        });
    }

    function resetDirty(menu) {
        switch (menu) {
            case 'delete':
                canBeDeleted = true;
                break;
            default:
        }
    }

    function updateEditor() {
        instance.save();
    }

    function updatePageSize(
        pageWidth,
        topPadding,
        rightPadding,
        bottomPadding,
        leftPadding
    ) {
        if (topPadding < 0) topPadding = 0;
        if (rightPadding < 0) rightPadding = 0;
        if (leftPadding < 0) leftPadding = 0;
        getEditorInstance().iframeElement.contentDocument.getElementsByTagName(
            'style'
        )[0].innerHTML =
            'body { width: ' +
            pageWidth +
            'px; padding: ' +
            topPadding +
            'px ' +
            rightPadding +
            'px ' +
            bottomPadding +
            'px ' +
            leftPadding +
            'px; } ' +
            getFontStyleCSS();
    }

    function getEditorWidth() {
        return getEditorInstance().iframeElement.contentDocument.getElementsByTagName(
            'body'
        )[0].offsetWidth;
    }

    return {
        init: init,
        setMergeCodePrompt: setMergeCodePrompt,
        setEditorTimestamp: setEditorTimestamp,
        setContent: setContent,
        resizeEditor: resizeEditor,
        getEditorContainer: getEditorContainer,
        getEditorContent: getEditorContent,
        closeEditor: closeEditor,
        getEditorInstance: getEditorInstance,
        insertTextInEditor: insertTextInEditor,
        focusEditor: focusEditor,
        attachChangeListener: attachChangeListener,
        attachPasteListener: attachPasteListener,
        resetDirty: resetDirty,
        updateEditor: updateEditor,
        documentId: documentId,
        updatePageSize: updatePageSize,
        getEditorWidth: getEditorWidth,
        unselectMergeCodeButton: unselectMergeCodeButton
    };
};
