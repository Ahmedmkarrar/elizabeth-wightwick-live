gmgps.cloud.ui.views.boardChange = function (args) {
    var me = this;

    me.$root = args.$root;
    me.$window = null;
    me.settings = args;
    me.init(args);

    return true;
};

gmgps.cloud.ui.views.boardChange.prototype = {
    init: function () {
        var me = this;

        me.$window = me.$root.closest('.window');
        me.$root.find('select').customSelect();

        me.$root.on('change', '#BoardChange_BoardType', function () {
            me.refreshUI();
        });

        me.refreshUI();

        //gmgps.cloud.helpers.board.setupInlineInstructions(me.$root);
    },

    refreshUI: function () {
        var me = this;

        var newBoardTypeId = parseInt(
            me.$root.find('#BoardChange_BoardType').val()
        );
        var currentBoardTypeId = parseInt(
            me.$root.find('#CurrentBoardTypeId').val()
        );

        if (
            newBoardTypeId == C.BoardType.NoBoard &&
            currentBoardTypeId == C.BoardType.NoBoard
        ) {
            me.$root.find('.x-board-specific').hide();
        } else if (newBoardTypeId == -1) {
            // "No board change" selected - hide board-specific fields
            me.$root.find('.x-board-specific').hide();
        } else {
            me.$root.find('.x-board-specific').show();
        }

        //Remove the current board from the available options.
        me.$root
            .find(
                '#BoardChange_BoardType option[value="{0}"]'.format(
                    currentBoardTypeId
                )
            )
            .remove();

        switch (currentBoardTypeId) {
            case C.BoardType.NoBoard:
                //me.$root.find('#BoardChange_BoardType option[value="{0}"]'.format(C.BoardType.NoBoard)).remove();
                break;
        }

        if (me.$root.find('#HiddenBecauseOfNoSetup').val() === 'True') {
            me.$window.find('.action-button').addClass('disabled');
        } else {
            me.$window.find('.action-button').removeClass('disabled');
        }
    },

    validate: function () {
        return true;
    },

    destroy: function () {
        var me = this;
        me.$root.empty().unbind();
    },

    action: function (onComplete) {
        var me = this;

        me.$window.find('.action-button').lock();

        new gmgps.cloud.http("boardChange-action").postForm(
            createForm(me.$root, 'Board/SaveBoardChange'),
            function () {
                if (me.settings.callback) {
                    var boardTypeId = parseInt(
                        me.$root.find('#BoardChange_BoardType').val()
                    );
                    var sent = me.$root.find('#SendNow').prop('checked');

                    // Handle "No board change" option (ID -1)
                    var boardRequired = null;
                    if (boardTypeId !== -1) {
                        boardRequired = !sent
                            ? null
                            : boardTypeId !== C.BoardType.TakeDownBoard;
                    }

                    me.settings.callback(boardRequired, boardTypeId, sent);
                }

                onComplete();
            },
            function (error) {
                me.$window.find('.action-button').unlock();
                alert(error);
            }
        );
    },

    cancel: function (onComplete) {
        onComplete();
    }
};
