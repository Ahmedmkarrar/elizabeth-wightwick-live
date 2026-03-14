'use strict';

alto.integration.CKEditor = function (args) {
    var instance = null;
    var groupFonts = args.groupFonts;
    var container = args.container;
    var setupCallback = args.setupCallback;
    var setupArgs = args.setupArgs;
    var documentId = args.documentId;
    var width = args.width;
    var height = args.height;
    var resizeEnabled =
        args.resizeEnabled !== undefined ? args.resizeEnabled : true;

    function init() {
        var config = getConfig();
        instance = getCKEditorFromObject(container.ckeditor(config));
        addFontReferences();
        instance.on('instanceReady', function () {
            setEditorTimestamp();
            setupCallback(setupArgs);
        });
    }

    function getConfig() {
        var config = {
            enterMode: CKEDITOR.ENTER_BR,
            font_names: getFontList(),
            language: 'en-gb',
            width: width,
            height: height,
            skin: 'moono',
            toolbar: [
                {
                    name: 'editing',
                    items: ['Find', 'Replace', '-', 'SelectAll']
                },
                { name: 'forms', items: ['Checkbox', 'Radio', 'TextField'] },
                {
                    name: 'insert',
                    items: [
                        'Image',
                        'Table',
                        'HorizontalRule',
                        'SpecialChar',
                        'xcustompagebreak'
                    ]
                },
                { name: 'tools', items: ['ShowBlocks'] },
                {
                    name: 'paragraph',
                    items: [
                        'NumberedList',
                        'BulletedList',
                        '-',
                        'Outdent',
                        'Indent',
                        '-',
                        'Blockquote',
                        'CreateDiv',
                        '-',
                        'JustifyLeft',
                        'JustifyCenter',
                        'JustifyRight',
                        'JustifyBlock'
                    ]
                },
                { name: 'mergecodes', items: ['xmergecodedropdown'] }, // doesn't work
                { name: 'spell', items: ['spellchecker'] }, // doesn't work
                '/',
                {
                    name: 'basicstyles',
                    items: [
                        'Bold',
                        'Italic',
                        'Underline',
                        'Strike',
                        'Subscript',
                        'Superscript',
                        '-',
                        'RemoveFormat'
                    ]
                },
                {
                    name: 'clipboard',
                    items: [
                        'Cut',
                        'Copy',
                        'Paste',
                        'PasteText',
                        'PasteFromWord',
                        '-',
                        'Undo',
                        'Redo'
                    ]
                },
                { name: 'styles', items: ['Format', 'Font', 'FontSize'] },
                { name: 'colors', items: ['TextColor', 'BGColor'] },
                { name: 'document', items: ['Source'] }
            ],
            enableTabKeyTools: true,
            tabSpaces: 4,
            resize_enabled: resizeEnabled,
            extraPlugins: 'xcustompagebreak,xmergecodeac' //xmergecodedropdown
        };
        return config;
    }

    function setMergeCodePrompt(callback, args) {
        instance.document.on('keypress', function (e) {
            if (e.data.$.charCode == 35 || e.data.$.key == '#') {
                setTimeout(function () {
                    args.me.hashWasInserted = true;
                    callback(args);
                }, 50);
            }
        });
    }

    function getCKEditorFromObject(CKObject) {
        if (CKObject.editor !== undefined) {
            return CKObject.editor;
        }
        return CKObject;
    }

    function setEditorTimestamp() {
        CKEDITOR.timestamp = Math.random().toString(36).substr(2, 5);
    }

    function setContent(content) {
        instance.document.getBody().setHtml(content);
    }

    function resizeEditor() {
        try {
            instance.resize($(window).width() - 50, $(window).height() - 130);
        } catch (e) {
            console.debug('failed to resize editor - no element instance');
        }
    }

    function getEditorContainer() {
        return instance.container.$;
    }

    function getEditorContent() {
        instance.updateElement();
        return instance.getData();
    }

    function closeEditor() {
        instance.destroy(true);
    }

    function getEditorInstance(documentId) {
        return $(
            '.editor .tabs .tab-content-container .tabcontent[data-id="' +
                documentId +
                '"]'
        )
            .find('textarea.ckeditor')
            .ckeditorGet();
    }

    function insertTextInEditor(text) {
        instance.insertText(text);
    }

    function focusEditor() {
        setTimeout(function () {
            instance.focus();
        }, 50);
    }

    function getFontList() {
        //Fetch the publisher fonts for the group.
        var fonts = groupFonts.split(';');
        var fontStringList = '';
        $.each(fonts, function (i, v) {
            var fontParts = v.split('|');
            if (fontParts[1] != 0) {
                //only interested in custom fonts.
                fontStringList += '{0};'.format(fontParts[0]);
            }
        });

        fontStringList =
            'Default;' +
            fontStringList +
            'Arial/Arial, Helvetica, sans-serif;' +
            'Comic Sans MS/comic sans ms,cursive;' +
            'Courier New/courier new,courier,monospace;' +
            'Georgia/georgia,serif;' +
            'Lucida Sans/lucida sans unicode,lucida grande,sans-serif;' +
            'Tahoma/tahoma,geneva,sans-serif;' +
            'Times New Roman/Times New Roman, Times, serif;' +
            'Trebuchet MS/trebuchet ms,helvetica,sans-serif;' +
            'Verdana/verdana,geneva,sans-serif;';

        return fontStringList;
    }

    function addFontReferences() {
        //Fetch the publisher fonts for the group.
        var fonts = groupFonts.split(';');

        //Add font references to the editor.
        $.each(fonts, function (i, v) {
            var fontParts = v.split('|');
            if (fontParts[1] != 0) {
                //only interested in custom fonts
                var fontCss =
                    '@font-face {font-family: "{0}"; src: url(/publisher/getfont/{1}); font-weight: normal;}'.format(
                        fontParts[0],
                        fontParts[1]
                    );

                CKEDITOR.addCss(fontCss);
            }
        });
    }

    function attachChangeListener(callback, arg1, arg2) {
        instance.on('change', function () {
            callback(arg1, arg2);
        });
    }

    function attachPasteListener(callback, args) {
        instance.on('paste', function (evt) {
            callback(evt, args);
        });
    }

    function resetDirty() {
        instance.resetDirty();
    }

    function updateEditor() {
        instance.updateElement();
    }

    function updatePageSize() {
        return;
    }

    function getEditorWidth() {
        return 1;
    }

    function unselectMergeCodeButton() {
        return;
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
