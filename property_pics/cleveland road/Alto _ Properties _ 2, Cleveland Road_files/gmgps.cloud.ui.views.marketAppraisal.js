gmgps.cloud.ui.views.marketAppraisalAppointment = function (args) {
    var me = this;

    me.$root = args.$root;
    me.config = args;

    me.id = parseInt(me.$root.find('#ValuationDiaryEventId').val());
    me.isDirty = me.id === 0;
    me.$window = null;

    me.init();

    return true;
};

gmgps.cloud.ui.views.marketAppraisalAppointment.typeName =
    'gmgps.cloud.ui.views.marketAppraisalAppointment';

gmgps.cloud.ui.views.marketAppraisalAppointment.prototype = {
    init: function () {
        var me = this;

        //Select boxes.
        me.$root.find('select').customSelect();

        //Setup mini diary.
        me.setupMiniDiary(me.$root.find('.mini-diary-placeholder'));

        me.$window = me.$root.closest('.window');

        var buttonTemplate =
            '<div class="btn cancel-event-button bgg-grey" style="min-width: 100px; float: left;">{0}</div>';
        //If the event is existing and cancellation is allowed, inject a cancellation button.
        // - Cancellation is not allowed when opening this form from a property (it has it's own cancel button).
        // - Cancellation is allowed from elsewhere - the diary, home page, etc.
        if (
            me.id !== 0 &&
            me.$root.find('#AllowCancel').val().toUpperCase() === 'TRUE'
        ) {
            me.$window
                .find('.bottom .buttons')
                .prepend(buttonTemplate.format('Cancel Appointment'));
        }

        // ALT-3064 - Print appraisal from initial booking and edit window
        buttonTemplate =
            '<div class="btn print-market-appraisal-form bgg-grey" style="min-width: 100px;float:left;">{0}</div>';
        me.$window
            .find('.bottom .buttons .clear')
            .before(buttonTemplate.format('Print Appraisal'));

        //Negotiator dropdown > Change
        me.$root.on('change', '#NegotiatorId', function () {
            //Update the userId specified in the userId attribute of the mini-diary input.
            me.$root
                .find('.mini-diary-input')
                .attr('data-userId', parseInt($(this).val()))
                .attr('data-userName', $(this).find('option:selected').text());

            var valuationEventStatus = parseInt(
                me.$root.find('#ValuationEventStatus').val()
            );

            if (valuationEventStatus === C.EventStatus.NotYetBooked) {
                //Change working followups (owner changed) b
                me.resetChaseInstructionFollowUps($(this).val());
            }

            me.setDirty(true);
        });

        //Negotiator2 dropdown > Change (for setting dirty only)
        me.$root.on('change', '#Negotiator2Id', function () {
            me.setDirty(true);
        });

        //Post-op-prompts > Change
        me.$root.on('change', '#post-op-prompts', function () {
            me.setDirty($(this).prop('checked'));
        });

        //ReminderMins Dropdown > Change
        me.$root.on('change', '#ReminderMins', function () {
            var mins = parseInt($(this).val());
            if (mins === 0) {
                me.$root.find('.reminder-method').hide();
            } else {
                me.$root.find('.reminder-method').show();
            }
        });

        //Print Appraisal Form   print-market-appraisal-form
        me.$window.on('click', '.print-market-appraisal-form', function () {
            var recordTypeId = parseInt(
                me.$root.find('#Property_RecordTypeId').val()
            );
            var propertyId = parseInt(me.$root.find('#Property_Id').val());
            var diaryEventId = parseInt(
                me.$root.find('#ValuationDiaryEventId').val()
            );

            new gmgps.cloud.http("marketAppraisal-init").ajax(
                {
                    async: false,
                    args: {
                        propertyId: propertyId,
                        diaryEventId:
                            diaryEventId !== undefined ? diaryEventId : 0,
                        templateType:
                            C.DocumentTemplateType.MarketAppraisalForm,
                        templateTypeData: recordTypeId
                    },
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: '/Document/CreateMarketAppraisalForm'
                },
                function (response) {
                    if (response.Data != 0) {
                        var id = response.Data;
                        gmgps.cloud.helpers.docshelper.edit([id]);
                    }
                }
            );
        });

        //Cancel Button > Click
        me.$window.on('click', '.cancel-event-button', function () {
            showDialog({
                type: 'question',
                title: 'Cancel Market Appraisal Appointment',
                msg: 'Are you sure you want to cancel this Market Appraisal appointment? <br /><br />All pending tasks associated to this Market Appraisal appointment will be removed.',
                buttons: {
                    Yes: function () {
                        //Cancel the diary event.
                        var id = parseInt(
                            me.$root.find('#ValuationDiaryEventId').val()
                        );

                        new gmgps.cloud.http("marketAppraisal-Yes").ajax(
                            {
                                args: {
                                    diaryEventId: id
                                },
                                dataType: 'json',
                                type: 'post',
                                url: 'Diary/CancelDiaryEvent'
                            },
                            function (response) {
                                if (response.Data === true) {
                                    me.$window
                                        .find('.cancel-button')
                                        .trigger('click');
                                } else {
                                    showError(
                                        'Cancellation of the Market Appraisal appointment failed.'
                                    );
                                }
                            }
                        );

                        $(this).dialog('close');
                    },
                    No: function () {
                        $(this).dialog('close');
                        return false;
                    }
                }
            });
        });

        me.$window.find('.cancel-event-button').show();

        me.$followUps = me.$root.find('.followups').followUpDropdown({
            linkedType: C.ModelType.DiaryEvent,
            linkedId: me.id,
            display: 'normal'
        });
    },

    setupMiniDiary: function ($target) {
        var me = this;

        $target.miniDiary({
            userId: shell.userId,
            mode: C.CalendarMode.Me,
            allowCreate: false,
            allowEdit: true,
            $start: me.$root.find('#StartDate'),
            $end: me.$root.find('#EndDate'),
            highlightedEventIds: [me.id],
            useStartForFirstHour: true,
            onPeriodSelected: function (req, authoriseCallback) {
                //Use the period.
                authoriseCallback(true);

                me.setDirty(true);
            },
            onChanged: function () {
                me.refreshFollowUpsValuationDateChanged(
                    Date.parse(
                        me.$root
                            .find('.mini-diary-input')
                            .attr('data-startdatetime')
                    )
                );
                me.setDirty(true);
            },
            ghostEvents: []
        });
    },

    refreshFollowUpsValuationDateChanged: function (newValuationDate) {
        var me = this;

        var $followUps = me.$root.find('.followups');

        $followUps
            .data('followUpDropdown')
            .refreshWithAdjustedDueDates(newValuationDate);
    },

    setDirty: function (dirty) {
        var me = this;

        if (dirty === me.isDirty) return;

        me.isDirty = dirty;
        me.$root
            .find('#post-op-prompts')
            .prop('checked', dirty)
            .trigger('prog-change');
    },

    resetChaseInstructionFollowUps: function (targetUserId) {
        var me = this;

        var $dropdown = me.$followUps.data('followUpDropdown');

        $dropdown
            .cancelFollowUps({
                types: [C.FollowUpType.PostAppraisalFollowUpOwner]
            })
            .done(function () {
                $dropdown
                    .refreshWithAdjustedTargetUserId(targetUserId, [
                        C.FollowUpType.Todo
                    ])
                    .done(function () {
                        me.addChaseInstructionFollowUp(targetUserId);
                    });
            });
    },

    chaseInstructionFollowUpRequired: function () {
        var me = this;

        var days = me.$root
            .find('#NegotiatorId option:selected')
            .attr('data-followupdays');
        if (days === undefined || days === '') return false;

        return true;
    },

    addChaseInstructionFollowUp: function (targetUserid) {
        var me = this;

        if (me.chaseInstructionFollowUpRequired()) {
            var branchId = parseInt(
                me.$root
                    .find('#NegotiatorId option:selected')
                    .attr('data-branchid')
            );
            var propertyId = parseInt(me.$root.find('#Property_Id').val());
            var diaryEventId = parseInt(
                me.$root.find('#ValuationDiaryEventId').val()
            );

            var addedfollowUps = [];

            $.each(me.getOwnerIdList(), function (i, contactId) {
                addedfollowUps.push({
                    branchId: branchId,
                    targetUserId: targetUserid,
                    type: C.FollowUpType.PostAppraisalFollowUpOwner,
                    linkedType: C.ModelType.DiaryEvent,
                    linkedId: diaryEventId,
                    propertyId: propertyId,
                    contactId: contactId
                });
            });

            me.$followUps
                .data('followUpDropdown')
                .addFollowUps(
                    addedfollowUps,
                    Date.parse(
                        me.$root
                            .find('.mini-diary-input')
                            .attr('data-startdatetime')
                    )
                );
        }
    },

    getOwnerIdList: function () {
        var me = this;

        return $.map(
            me.$root.find('input[name^="OwnerId"][type="hidden"]'),
            function (e) {
                return parseInt($(e).val());
            }
        );
    }
};
