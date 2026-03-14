gmgps.cloud.ui.views.letters = function (args) {
    var me = this;
    me.cfg = args;
    me.$root = args.$root;
    me.$window = null;
    me.init(args);
    me.closeMyWindow = args.closeMyWindow;

    return this;
};

gmgps.cloud.ui.views.letters.typeName = 'gmgps.cloud.ui.views.letters';

gmgps.cloud.ui.views.letters.prototype = {
    //-----------------------------------------------------------------------------------------------------------------------------------------
    init: function () {
        var me = this;

        me.$window = me.$root.closest('.window');

        //Make the action button green.
        me.$window
            .find('.action-button')
            .removeClass('grey')
            .addClass('bgg-green');

        me.$root.find('select').customSelect();

        //Letter Name > Click
        me.$root.on('click', '.template-name', function () {
            $(this).closest('tr').find('input:checkbox').trigger('click');
        });

        //Add special buttons
        me.$window
            .find('.bottom .buttons')
            .prepend(
                '<div class="btn rack-button bgg-tools" style="min-width: 100px; float: left;">Place Letters in Letter Rack</div>'
            );

        me.$stationeryBranchSelect = me.$root.find('#StationaryBranchId');

        var disableStationaryBranch =
            me.$root.find('#DocumentHasBranchDefaultStationary').val() ==
            'False';
        if (disableStationaryBranch) {
            me.$stationeryBranchSelect.customSelect(true);
        }

        me.$stationeryBranchSelect.one('change', function () {
            me.showBranchDefaultStationeryTemplateWarning();
        });

        //Rack button (Send to) > Click
        me.$window.on('click', '.rack-button', function () {
            me.generateLetters(false, function (result) {
                if (result == true) {
                    me.closeMyWindow();
                }
            });
        });

        //Letters (Select All/None) > Click
        me.$root.on('click', '.selectall-button', function () {
            var $btn = $(this);
            if ($btn.hasClass('on')) {
                $btn.removeClass('on bg-grey');
                $btn.text('Select All');
                me.$root
                    .find('.letters .tickbox-hidden')
                    .prop('checked', false)
                    .trigger('prog-change');
                //me.$root.find('.letters .tickbox').removeClass('ticked');
            } else if (!$btn.hasClass('on')) {
                $btn.addClass('on bg-grey');
                $btn.text('Select None');
                me.$root
                    .find('.letters .tickbox-hidden')
                    .prop('checked', true)
                    .trigger('prog-change');
                //me.$root.find('.letters .tickbox').addClass('ticked');
            }
        });

        me.$root.on('mouseenter', '.letter-tooltip', function () {
            $(this).qtip({
                content: $(this).attr('data-tip'),
                position: {
                    my: 'left middle',
                    at: 'right middle'
                },
                show: {
                    event: 'mouseenter',
                    ready: true,
                    delay: 0,
                    effect: function () {
                        $(this).fadeIn(50);
                    }
                },
                hide: 'mouseout',
                style: {
                    tip: true,
                    classes: 'ui-tooltip-dark'
                }
            });
        });

        me.showConsents();
    },

    showConsents: function () {
        var me = this;

        var generalMarketingStatus =
            me.$root.find('input[name="GeneralMarketingConsentOkay"]').val() ===
            'True'
                ? C.ConsentOptInOption.Granted
                : C.ConsentOptInOption.Denied;

        var propertyMatchingStatus =
            me.$root.find('input[name="PropertyMatchingConsentOkay"]').val() ===
            'True'
                ? C.ConsentOptInOption.Granted
                : C.ConsentOptInOption.Denied;

        var consentControls = me.$root.find('.consent p.consent-bound');
        var visibleBinding = new gmgps.cloud.ui.binding.ConsentControlBinding(
            gmgps.cloud.ui.binding.ConsentControlBinding.VISIBLE
        );
        visibleBinding.bind(
            consentControls,
            'general-marketing',
            generalMarketingStatus
        );
        visibleBinding.bind(
            consentControls,
            'property-matching',
            propertyMatchingStatus
        );
    },

    showBranchDefaultStationeryTemplateWarning: function () {
        var me = this;

        me.$root
            .find('div.stationery-branch-applies-warning')
            .addClass('stationery-branch-selected');
        me.$root
            .find(
                "table.letters tr[data-useBranchDefaultStationery='True'] td.template-name"
            )
            .each(function () {
                this.firstChild.data = this.firstChild.data + '* ';
            });
    },

    generateLetters: function (open, onComplete) {
        var me = this;
        var templates = [];
        var generatedDocs = [];
        var $selectedLetters = me.$root.find('.letters .tickbox.ticked');
        var sentByUserId = me.$root.find('#SentByUserId').val();
        var branchId = me.$stationeryBranchSelect.val();

        if ($selectedLetters.length == 0) {
            showInfo('Please choose at least one letter to generate.');
            onComplete(false);
            return;
        }

        $selectedLetters.each(function (index, val) {
            var $row = $(val).closest('.row');
            var isHistoryEvent =
                parseInt($row.attr('data-eventCategoryId')) ==
                C.EventCategory.History;
            var isDiaryEvent =
                parseInt($row.attr('data-eventCategoryId')) ==
                C.EventCategory.Diary;
            var eventId = parseInt($row.attr('data-eventId'));
            var useDefaultBranchStationery = $row.attr(
                'data-useBranchDefaultStationery'
            );
            templates.push({
                TemplateId: $(val).attr('data-id'),
                PropertyId: $(val).attr('data-propertyid'),
                ContactId: $(val).attr('data-contactid'),
                PropertyIdList: $(val).attr('data-propertyIdList'),
                DiaryEventId: isDiaryEvent ? eventId : 0,
                HistoryEventId: isHistoryEvent ? eventId : 0,
                BranchId:
                    branchId && useDefaultBranchStationery == 'True'
                        ? branchId
                        : $(val).attr('data-branchid'),
                BrandId: $(val).attr('data-brandid'),
                TemplateTypeData: $(val).attr('data-propertyrecordtypeid'),
                TenancyId: $(val).attr('data-tenancyid'),
                SentByUserId: sentByUserId
            });
        });

        //Send the document request for each template to the server.
        for (var x = 0; x < templates.length; x++) {
            new gmgps.cloud.http("letters-generateLetters").ajax(
                {
                    async: false,
                    args: templates[x],
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: '/Document/CreateDocument'
                },
                function (response) {
                    if (response.Data != 0) {
                        generatedDocs.push(response.Data);
                    } else {
                        showError('One of your letters failed to generate.');
                    }
                }
            );
        }

        if (open && generatedDocs.length > 0) {
            gmgps.cloud.helpers.docshelper.edit(generatedDocs);
        } else {
            if (generatedDocs.length == templates.length) {
                $.jGrowl('Your letter(s) have been added to the letter rack.', {
                    header: generatedDocs.length + ' Letter(s) Created',
                    theme: 'growl-updater growl-system',
                    life: 5000
                });
            }
        }

        if (generatedDocs.length != templates.length) {
            showInfo('Generation of one or more letters failed.');
        }

        onComplete(true);
    },

    action: function (onComplete) {
        var me = this;
        me.generateLetters(true, function (result) {
            onComplete(result == false);
        });
    },

    cancel: function (onComplete) {
        onComplete();
    }
};
