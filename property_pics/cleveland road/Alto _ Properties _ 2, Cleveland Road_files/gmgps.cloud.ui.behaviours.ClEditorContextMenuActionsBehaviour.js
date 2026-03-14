((function() {
    function Behaviour() {}

    function isWebkitInsertReplacementTextEvent(e) {
        return (
            e.originalEvent &&
            e.originalEvent.inputType &&
            e.originalEvent.inputType === 'insertReplacementText'
        );
    }

    Behaviour.prototype = {
        apply: function (targetClEditor) {
            if (!targetClEditor) {
                return;
            }

            var targetDocument = targetClEditor.$frame[0].contentDocument;

            $(targetDocument).on('paste', function () {
                setTimeout(function () {
                    targetClEditor.updateTextArea();
                }, 250);
            });

            $(targetDocument).on('input', function (e) {
                if (isWebkitInsertReplacementTextEvent(e)) {
                    setTimeout(function () {
                        targetClEditor.updateTextArea();
                    }, 250);
                }
            });
        }
    };

    gmgps.cloud.ui.behaviours.ClEditorContextMenuActionsBehaviour = Behaviour;
}))();
