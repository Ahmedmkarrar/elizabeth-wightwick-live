'use strict';
alto.integration.helpers.LetterEditorFactory = function (args) {
    var groupId = args.groupId;

    function getEditor(args) {
        var shouldUseTinyMCEEditor =
            alto.optimizelyClient.isFeatureEnabledForGroup(
                'use_tiny_mce_editor',
                groupId
            );
        if (shouldUseTinyMCEEditor) {
            return new alto.integration.TinyMce(args);
        } else {
            return new alto.integration.CKEditor(args);
        }
    }

    return {
        getEditor: getEditor
    };
};
