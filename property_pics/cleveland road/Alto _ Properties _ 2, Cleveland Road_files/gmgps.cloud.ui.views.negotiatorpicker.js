gmgps.cloud.ui.views.negotiatorPicker = function (args) {
    var me = this;

    me.cfg = args;
    me.$root = args.$root;
    me.$window = null;
    me.viewMode = null;

    me.ContactIds = me.cfg.data.ContactIds;
    me.PropertyId = me.cfg.data.PropertyId;
    me.SavedMatchListId = me.cfg.data.MatchListId;
    me.CurrentListOwner = me.cfg.data.CurrentListOwner;
    me.NegsAlreadyWithLists = me.cfg.data.CurrentLists;
    me.CallBack = me.cfg.data.CallBack;

    me.maxListGeneration = 4;

    me.init();

    return this;
};

gmgps.cloud.ui.views.negotiatorPicker.prototype = {
    init: function () {
        var me = this;

        me.$window = me.$root.closest('.window');

        // Change the Action button to BLUE
        me.$window
            .find('.action-button')
            .addClass('disabled')
            .removeClass('grey')
            .addClass('bgg-property');

        // Event Handlers
        me.$window.on('click', '.negotiator-outer', function () {
            if (!$(this).hasClass('disabled')) {
                $(this).toggleClass('selected');
                me.setListShareStatus();
            }
        });

        me.$window.on('click', '.search-close', function () {
            me.clearSearchTerm();
        });

        me.$window.on('keyup', '#searchtext', function () {
            var searchterm = $(this).val();
            me.searchForNegotiator(searchterm);
        });

        //me.hideCurrentListOwner(me.CurrentListOwner);
        me.highlightNegotiatorsWithLists(me.NegsAlreadyWithLists);
    },

    hideCurrentListOwner: function (negId) {
        var me = this;
        if (negId > 0) {
            me.$window.find('.negotiator-outer').each(function () {
                if (parseInt($(this).attr('data-neg-id')) == negId) {
                    $(this).remove();
                }
            });
        }
    },

    highlightNegotiatorsWithLists: function (negs) {
        var me = this;

        me.$window.find('.negotiator-outer').each(function () {
            var thisNegId = parseInt($(this).attr('data-neg-id'));
            if (negs.indexOf(thisNegId) >= 0) {
                $(this).find('.has-list').addClass('active');
            }
        });
    },

    clearSearchTerm: function () {
        var me = this;
        me.$window.find('#searchtext').val('');
        me.$window
            .find('.picker-outer > .negotiator-outer')
            .removeClass('hidden');
        me.$window.find('.search-close').fadeOut(200);
    },

    searchForNegotiator: function (input) {
        var me = this;

        var cleanSearch = input.replace(/\W/g, '');
        cleanSearch = cleanSearch.toUpperCase();

        if (cleanSearch.length > 0) {
            me.$window
                .find('.picker-outer > .negotiator-outer')
                .each(function () {
                    var cleanNegName = $(this).attr('data-clean-search');
                    if (cleanNegName.indexOf(cleanSearch) >= 0) {
                        $(this).removeClass('hidden');
                    } else {
                        $(this).addClass('hidden');
                    }
                    me.$window.find('.search-close').fadeIn(300);
                });
        } else {
            me.$window
                .find('.picker-outer > .negotiator-outer')
                .each(function () {
                    me.clearSearchTerm();
                });
        }
    },

    DisableAdditionalNegSelection: function (disableFurtherSelection) {
        var me = this;
        if (disableFurtherSelection) {
            me.$window.find('.negotiator-outer').each(function () {
                if (!$(this).hasClass('selected')) {
                    $(this).addClass('disabled');
                }
            });
        } else {
            me.$window.find('.negotiator-outer').removeClass('disabled');
        }
    },

    calculateShares: function (selectedNegsCount) {
        var me = this;
        var shares = [];

        var modulus = me.ContactIds.length % selectedNegsCount;

        for (var s = 0; s < selectedNegsCount; s++) {
            var contactsCount = Math.floor(
                me.ContactIds.length / selectedNegsCount
            );
            shares.push(contactsCount);
        }

        shares[0] += modulus;

        return shares;
    },

    setListShareStatus: function () {
        var me = this;

        var selectedNegsCount = me.$window.find('.selected').length;
        var totalNumberOfNegotiatorsAllocated =
            selectedNegsCount + me.NegsAlreadyWithLists.length - 1;
        var contactsCount = me.ContactIds.length;

        var allocations = me.calculateShares(selectedNegsCount);

        if (
            selectedNegsCount >= contactsCount ||
            selectedNegsCount >= me.maxListGeneration ||
            totalNumberOfNegotiatorsAllocated >= me.maxListGeneration
        ) {
            me.DisableAdditionalNegSelection(true);
        } else {
            me.DisableAdditionalNegSelection(false);
        }

        if (selectedNegsCount == 0) {
            me.$window.find('.action-button').addClass('disabled');
        } else {
            me.$window.find('.action-button').removeClass('disabled');
        }

        if (me.SavedMatchListId == 0) {
            if (selectedNegsCount > 1) {
                me.$window.find('.action-button').text('Create Lists');
            } else {
                me.$window.find('.action-button').text('Create List');
            }
        }

        me.$window.find('.liststatus').text('');
        me.$window.find('.selected').each(function (ix, el) {
            $(el)
                .find('.liststatus')
                .text('+{0} Contacts'.format(allocations[ix]));
        });
    },

    getSelectedNegotiatorIds: function () {
        var me = this;
        var selectedNegs = [];
        me.$window.find('.selected').each(function () {
            var id = parseInt($(this).attr('data-neg-id'));
            selectedNegs.push(id);
        });

        return selectedNegs;
    },

    action: function () {
        var me = this;

        if (me.CallBack) {
            var NegIds = me.getSelectedNegotiatorIds();
            me.CallBack(
                me.PropertyId,
                me.ContactIds,
                NegIds,
                me.SavedMatchListId,
                me.CurrentListOwner
            );
        }
    },

    cancel: function (onComplete) {
        var me = this;
        me.$root.find('form').validationEngine('hideAll');

        onComplete();
    },

    destroy: function () {
        var me = this;
        me.$root.empty().unbind();
    }
};
