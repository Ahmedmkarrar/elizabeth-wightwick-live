gmgps.cloud.ui.views.savedMatchListPrintOptions = function (args) {
    var me = this;

    me.cfg = args;
    me.$root = args.$root;
    me.$window = null;
    me.viewMode = null;
    me.fontSize;
    me.CallBack = me.cfg.data.CallBack;

    me.init();

    return this;
};

gmgps.cloud.ui.views.savedMatchListPrintOptions.prototype = {
    init: function () {
        var me = this;

        me.$window = me.$root.closest('.window');

        // Change the Action button to BLUE
        me.$window
            .find('.action-button')
            .removeClass('grey')
            .addClass('bgg-property');

        me.$root.on('click', '.switch', function () {
            me.buildPreviewHTML();
        });

        me.setupFontSlider();
        me.buildPreviewHTML();
    },

    buildPreviewHTML: function () {
        var me = this;
        var options = me.buildOptionsObject();

        var $preview = $("<div class='row'></div>");

        // Items
        var $item_hot = $("<div class='row-item hot'>HOT</div>");
        var $item_favorite = $(
            "<div class='row-item favorite'><div class='star'></div></div>"
        );
        var $item_name = $("<div class='row-item name'>Mr John Smith</div>");
        var $item_position = $(
            "<div class='row-item position'>(Under Offer / Cash Buyer)</div>"
        );

        var $item_email = $(
            "<div class='row-item email'>johnsmith@propertysoftwaregroup.com</div>"
        );
        var $item_phone = $(
            "<div class='row-item phone'>01225 888012 (work), 07765 556619 (mobile)</div>"
        );

        var $item_summary_A = $(
            "<div class='row-line'><div class='row-item summary'>'Family Home' - Buy:£190K > £250K, 2+ Beds, Anstey (+13)</div></div>"
        );
        var $item_areas_A = $(
            "<div class='row-line'><div class='row-item areas'>Anstey, Beaumount, Balby, Coalville, Knighton, Rothley</div></div>"
        );
        var $item_features_A = $(
            "<div class='row-line'><div class='row-item features'>2+ Receptions, Character Property, Gas Central Heating, Double Glazing, House, Bungalow, Apartment</div></div>"
        );

        var $item_summary_B = $(
            "<div class='row-line'><div class='row-item summary'>'Investment Property' - Buy:£110K > £220K, 1+ Beds, Coalville (+5)</div></div>"
        );
        var $item_areas_B = $(
            "<div class='row-line'><div class='row-item areas'>Coalville, Knighton, Rothley, Rushley, Scrapford, Syston</div></div>"
        );
        var $item_features_B = $(
            "<div class='row-line'><div class='row-item features'>Gas Central Heating, Double Glazing, House, Bungalow, Apartment</div></div>"
        );

        var $item_matchlistnotes = $(
            "<div class='row-item matchlistnotes'><div class='row-item title'>Match List Notes:</div>Called on 21st May and left a message about this new instruction</div>"
        );
        var $item_contactnotes = $(
            "<div class='row-item contactnotes'><div class='row-item title'>Contact Notes:</div>Clients are selling though us! Looking to purchasea family home in the area and possibly an investment property with a view to rent it out. Looking to move within the next couple of months.</div>"
        );

        var $item_sendbrochure = $(
            "<div class='row-item sendbrochure'><div class='row-item title'>Send Brochure:</div>Email <span class='box'>&#9634;</span>  Post <span class='box'>&#9634;</span>  SMS <span class='box'>&#9634;</span></div>"
        );
        var $item_arrangeviewing = $(
            "<div class='row-item arrangeviewing'><div class='row-item title' style='margin-right:100px'>Arrange Viewing:</div></div>"
        );
        var $item_notes = $(
            "<div class='row-item notes'><div class='row-item title'>Notes:</div></div>"
        );

        var $list_status = $("<div class='rightblock'></div>");
        var $list_status_A = $(
            "<div class='icon phone'></div><div class='checkbox checked'></div>"
        );
        var $list_status_B = $(
            "<div class='icon notes'></div><div class='checkbox checked'>"
        );
        var $list_status_C = $(
            "<div class='icon calendar'></div><div class='checkbox'>"
        );
        var $list_status_D = $(
            "<div class='icon email'></div><div class='checkbox'>"
        );
        var $list_status_E = $(
            "<div class='icon sms'></div><div class='checkbox checked'>"
        );

        $list_status.prepend($list_status_A);
        $list_status.prepend($list_status_B);
        $list_status.prepend($list_status_C);
        $list_status.prepend($list_status_D);
        $list_status.prepend($list_status_E);

        // Name, status, email, phones
        var $block_name = $("<div class='row-block'></div>");
        var $line;

        if (options.HotStatus) {
            $block_name.append($item_hot);
        }
        if (options.FavoriteStatus) {
            $block_name.append($item_favorite);
        }

        $line = $("<div class='row-line narrower'></div>");
        $line.append($item_name);
        if (options.Position) {
            $line.append($item_position);
        }
        $block_name.append($line);

        $line = $("<div class='row-line narrower'></div>");
        if (options.EmailAddresses) {
            $line.append($item_email);
        }
        if (options.PhoneNumbers) {
            $line.append($item_phone);
        }
        $block_name.append($line);

        $preview.append($block_name);

        // Search Profiles
        if (
            options.SearchProfileSummary ||
            options.SearchProfileFeatures ||
            options.SearchProfileAreas
        ) {
            var $block_profile_A = $("<div class='row-block'></div>");

            if (options.SearchProfileSummary) {
                $block_profile_A.append($item_summary_A);
            }
            if (options.SearchProfileAreas) {
                $block_profile_A.append($item_areas_A);
            }
            if (options.SearchProfileFeatures) {
                $block_profile_A.append($item_features_A);
            }

            $preview.append($block_profile_A);

            if (options.AllSearchProfiles) {
                var $block_profile_B = $("<div class='row-block'></div>");

                if (options.SearchProfileSummary) {
                    $block_profile_B.append($item_summary_B);
                }
                if (options.SearchProfileAreas) {
                    $block_profile_B.append($item_areas_B);
                }
                if (options.SearchProfileFeatures) {
                    $block_profile_B.append($item_features_B);
                }

                $preview.append($block_profile_B);
            }
        }

        // Notes
        var $block_notes;

        if (options.MatchListNotes) {
            $block_notes = $("<div class='row-block'></div>");
            $line = $("<div class='row-line'></div>");
            $line.append($item_matchlistnotes);
            $block_notes.append($line);
            $preview.append($block_notes);
        }

        if (options.ContactNotes) {
            $block_notes = $("<div class='row-block'></div>");
            $line = $("<div class='row-line'></div>");
            $line.append($item_contactnotes);
            $block_notes.append($line);
            $preview.append($block_notes);
        }

        // Send brochure, arrange viewing, notes
        if (options.SendBrochure || options.ArrangeViewing || options.Notes) {
            var $block_actions = $("<div class='row-block'></div>");
            $line = $("<div class='row-line'></div>");

            if (options.SendBrochure) {
                $line.append($item_sendbrochure);
            }

            if (options.ArrangeViewing) {
                $line.append($item_arrangeviewing);
            }

            if (options.Notes) {
                $line.append($item_notes);
            }

            $block_actions.append($line);
            $preview.append($block_actions);
        }

        var $preview_right = $(
            "<div id='rightcolumn' class='row right'></div>"
        );
        $preview_right.append($list_status);

        $('.previewarea').html('').append($preview);

        if (options.MatchListStatus) {
            $('.previewarea').append($preview_right);
        }

        me.setFontSize(me.fontSize);
        me.setRightColumnHeight();
    },

    setRightColumnHeight: function () {
        var $target = $('#rightcolumn');
        var new_height = $('.previewarea').innerHeight() + 'px';

        $target.height(new_height);
    },

    getBooleanValue: function (target) {
        var me = this;
        var checkboxval = me.$window
            .find('.switch-input[name="' + target + '"]')
            .prop('checked');
        return checkboxval === true;
    },

    buildOptionsObject: function (previewMode) {
        var me = this;
        var $data_root = me.$window.find('#savedMatchListPrintOptions');

        var options = {
            SavedMatchListID: $data_root.attr('data-matchlistid'),
            PropertyID: $data_root.attr('data-propertyid'),
            NegotiatorID: $data_root.attr('data-negotiatorid'),
            ActiveBand: me.getBooleanValue('activeband'),
            CompletedBand: me.getBooleanValue('completedband'),
            RejectedBand: me.getBooleanValue('rejectedband'),
            MatchListStatus: me.getBooleanValue('matchliststatus'),
            PropertySummaryPage: me.getBooleanValue('propertysummarypage'),
            FontSize: me.fontSize,
            HotStatus: me.getBooleanValue('hotstatus'),
            FavoriteStatus: me.getBooleanValue('favoritestatus'),
            Position: me.getBooleanValue('position'),
            PhoneNumbers: me.getBooleanValue('phonenumbers'),
            EmailAddresses: me.getBooleanValue('emailaddresses'),
            AllSearchProfiles: me.getBooleanValue('allsearchprofiles'),
            SearchProfileSummary: me.getBooleanValue('searchprofilesummary'),
            SearchProfileAreas: me.getBooleanValue('searchprofileareas'),
            SearchProfileFeatures: me.getBooleanValue('searchprofilefeatures'),
            MatchListNotes: me.getBooleanValue('matchlistnotes'),
            ContactNotes: me.getBooleanValue('contactnotes'),
            SendBrochure: me.getBooleanValue('sendbrochure'),
            ArrangeViewing: me.getBooleanValue('arrangeviewing'),
            Notes: me.getBooleanValue('notes'),
            Preview: previewMode
        };

        return options;
    },

    setFontSize: function (size) {
        var me = this;

        me.$window
            .find('.row-item')
            .removeClass('compact')
            .removeClass('small')
            .removeClass('default')
            .removeClass('large');
        me.$window
            .find('.star')
            .removeClass('compact')
            .removeClass('small')
            .removeClass('default')
            .removeClass('large');

        switch (size) {
            case 6:
                me.$window
                    .find('.row-item')
                    .addClass('compact')
                    .find('.star')
                    .addClass('compact');
                break;
            case 7:
                me.$window
                    .find('.row-item')
                    .addClass('small')
                    .find('.star')
                    .addClass('small');
                break;
            case 8:
                me.$window
                    .find('.row-item')
                    .addClass('default')
                    .find('.star')
                    .addClass('default');
                break;
            case 9:
                me.$window
                    .find('.row-item')
                    .addClass('large')
                    .find('.star')
                    .addClass('large');
                break;
        }
    },

    setupFontSlider: function () {
        var me = this;
        var initialFontSize = parseInt(
            $('#text-size-slider').attr('data-initial-value')
        );

        me.fontSize = initialFontSize;

        $('#text-size-slider').slider({
            value: initialFontSize,
            min: 6,
            max: 9,
            step: 1,
            slide: function (event, ui) {
                var size = ui.value;
                me.fontSize = size;

                switch (size) {
                    case 6:
                        $('#text-size-label').text('Compact (6pt)');
                        break;
                    case 7:
                        $('#text-size-label').text('Small (7pt)');
                        break;
                    case 8:
                        $('#text-size-label').text('Default (8pt)');
                        break;
                    case 9:
                        $('#text-size-label').text('Large (9pt)');
                        break;
                }

                me.buildPreviewHTML();
            }
        });
    },

    action: function () {
        var me = this;

        if (me.CallBack) {
            var previewMode = window.event.shiftKey;
            me.CallBack(me.buildOptionsObject(previewMode));
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
