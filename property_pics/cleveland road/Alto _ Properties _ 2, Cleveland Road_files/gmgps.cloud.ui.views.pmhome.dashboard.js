// eslint-disable-next-line no-unused-vars
function numericSorter(a, b) {
    if (a.numeric < b.numeric) return -1;
    if (a.numeric > b.numeric) return 1;
    return 0;
}

// eslint-disable-next-line no-unused-vars
function numSorter(a, b) {
    var af = parseFloat(a.num);
    var bf = parseFloat(b.num);

    if (af < bf) return -1;
    if (af > bf) return 1;
    return 0;
}

// eslint-disable-next-line no-unused-vars
function nameSorter(a, b) {
    return $(b).data('name') < $(a).data('name') ? -1 : 1;
}

// eslint-disable-next-line no-unused-vars
function genericSorter(a, b) {
    var result;

    var asc = true;

    if (a.sortval === null) return 1;
    if (b.sortval === null) return -1;
    if (a.sortval === null && b.sortval === null) return 0;

    result = a.sortval - b.sortval;

    if (isNaN(result)) {
        return asc
            ? a.sortval.toString().localeCompare(b.sortval.toString())
            : b.sortval.toString().localeCompare(a.sortval.toString());
    } else {
        return asc ? result : -result;
    }
}

var waitForUIResizeComplete = (function () {
    var timer = 0;
    return function (callback, ms) {
        clearTimeout(timer);
        timer = setTimeout(callback, ms);
    };
})();

gmgps.cloud.ui.views.pmhomeDashboard = function (args) {
    var me = this;

    me.$root = args.$root;

    me.branchIds = args.branchIds || [0];
    me.userId = args.userId || 0;
    me.propertyManagerIds = args.propertyManagerIds || [];

    me.selectedLetterRackItemIds = [];
    me.allLettersSelected = false;

    me.ArrearsListSource = {
        Tenancy: 0,
        Contact: 1
    };

    me.ArrearsActions = {
        Batch: 0,
        Arrears: 1
    };

    me.$suppliersToPayRefreshButton = me.$root.find(
        '.suppliers-to-pay-refresh'
    );

    me.init();

    return true;
};

gmgps.cloud.ui.views.pmhomeDashboard.Messages = {
    ChargeReviewedOnRefundScreen:
        'Please review this charge on the refund screen.',
    ChargeReviewedOnAccountsOpeningBalanceScreen:
        'Please review this charge via Accounts > Opening Balance.',
    ChargeReviewedOnAccountsOpeningBalanceArrearsScreen:
        'Please review this charge via Accounts > Opening Balances > Arrears.'
};

//For Barry:  ##+ = added / ##- = removed

gmgps.cloud.ui.views.pmhomeDashboard.prototype = {
    init: function () {
        var me = this;

        // Load the charts API
        //google.charts.setOnLoadCallback(function () { me.drawHomeCharts(); }); ##-
        me.initHomeCharts(); //##+

        me.$root.off(); // something is currently firing this init twice... revisit when post-perf

        me.$root.find('.opt-spinner').html('<div class="home-spinner"></div>');

        //UI Sizing
        $(window).on('resize', function () {
            if (me.$root.is(':visible')) {
                me.sizeUI();
            }
        });

        me.$root.on('click', '.widget-buttons > a', function () {
            if ($(this).attr('data-toggle') == 'dispose') {
                me.$root.find('#modal-row').hide().html('').show();
                me.$root.find('.modal-row-container').fadeOut(300);

                setTimeout(function () {
                    me.$root.find('.modal-row-container').hide(0);
                    $('#pmhome').css('overflow', '');
                    me.lockUI(false);
                }, 300);
            }

            //me.reDrawPieCharts();
            // ** Need to target refresh of targeted widget
            me.refreshWidgetAfterTabledDismissed();
        });

        const extractFollowUpIdsFromTable = () =>
            $('#PMHomeLoadedTable tr.date-event-row-detail')
                .map(function () {
                    return parseInt($(this).attr('data-followupid'));
                })
                .get();

        function showMailMessangerModal(recipients, eventDatesType) {
            gmgps.cloud.ui.views.eventDatesEmailModal.getMailMessager({
                title: 'Send Batch Emails',
                settings: {
                    Recipients: recipients,
                    EventModelType: eventDatesType
                },
                onComplete: function () {}
            });
        }

        const getRecipientsFromTableEvents = (url) => {
            var eventDatesRecipientsSearch = new Object();
            eventDatesRecipientsSearch.FollowUpIds =
                extractFollowUpIdsFromTable();

            if (eventDatesRecipientsSearch.FollowUpIds.length === 0) {
                showInfo('No matching records found.');
                return;
            }

            return new gmgps.cloud.http("dashboard-init").ajax({
                args: eventDatesRecipientsSearch,
                complex: true,
                dataType: 'json',
                type: 'post',
                url
            });
        };

        function ValidateEmailAddresses(
            recipients,
            eventDatesType,
            modelTypeDesc
        ) {
            let emailAddresses = recipients.filter(
                (recipient) => recipient.Email !== null
            ).length;
            let noEmailMessage = `All of the selected events are missing ${modelTypeDesc} email addresses.`;
            let partialEmailMessage = `One or more of the selected events are missing ${modelTypeDesc} email addresses.`;

            if (emailAddresses === 0) {
                showInfo(noEmailMessage);
                return;
            } else if (emailAddresses !== recipients.length) {
                showDialog({
                    type: 'info',
                    title: 'Information',
                    msg: partialEmailMessage,
                    buttons: {
                        Ok: function () {
                            $(this).dialog('close');
                            showMailMessangerModal(recipients, eventDatesType);
                        }
                    }
                });
            } else {
                showMailMessangerModal(recipients, eventDatesType);
            }
        }

        me.$root.on('click', '#send-batch-emails-tenancy', async function () {
            if ($('.table-options-container').find(".batch-email-btn").hasClass("disabled")) {
                return;
            }
            const response = await getRecipientsFromTableEvents('/EventDates/GetFollowUpsTenancyRecipients');
            const recipients = response.Data;
            const modelTypeDesc = "tenants'";
            ValidateEmailAddresses(
                recipients,
                this.getAttribute('data-event-model-type'),
                modelTypeDesc
            );
        });

        me.$root.on('click', '#send-batch-emails-property', async function () {
            if ($('.table-options-container').find(".batch-email-btn").hasClass("disabled")) {
                return;
            }
            const contactsResult = await getRecipientsFromTableEvents('/EventDates/GetFollowUpsPropertyRecipients')
            const recipients = contactsResult.Data;
            const modelTypeDesc = "tenants'";
            ValidateEmailAddresses(
                recipients,
                this.getAttribute('data-event-model-type'),
                modelTypeDesc
            );
        });

        me.$root.on('click', '#send-batch-emails-propertyinsurance', async function () {
            if ($('.table-options-container').find(".batch-email-btn").hasClass("disabled")) {
                return;
            }
            const contactsResult = await getRecipientsFromTableEvents('/EventDates/GetFollowUpsPropertyInsuranceRecipients')
            const recipients = contactsResult.Data;
            const modelTypeDesc = "tenants'";
            ValidateEmailAddresses(recipients, this.getAttribute("data-event-model-type"), modelTypeDesc);
        });

        me.$root.on('click', '#send-batch-emails-tenant', async function () {
            if ($('.table-options-container').find(".batch-email-btn").hasClass("disabled")) {
                return;
            }
            const contactsResult = await getRecipientsFromTableEvents('/EventDates/GetFollowUpsTenantRecipients')
            const recipients = contactsResult.Data;
            const modelTypeDesc = "tenants'";
            ValidateEmailAddresses(
                recipients,
                this.getAttribute('data-event-model-type'),
                modelTypeDesc
            );
        });

        me.$root.on('click', '.databox-headline', function () {
            if (!$(this).hasClass('disabled') && !me.widgetDisabled($())) {
                me.loadModalReportTable(
                    parseInt($(this).attr('data-report-id')),
                    -1,
                    $(this).attr('data-row-css')
                );
            }
        });

        me.$root.on('click', '#send-landlord-emails-tenancy', async function () {
            if ($('.table-options-container').find(".batch-email-btn").hasClass("disabled")) {
                return;
            }
            const response = await getRecipientsFromTableEvents('/EventDatesLandlordRecipients/GetTenancyRecipients');
            const recipients = response.Data;
            const modelTypeDesc = "landlords'";

                ValidateEmailAddresses(
                    recipients,
                    this.getAttribute('data-event-model-type'),
                    modelTypeDesc
                );
            }
        );

        me.$root.on('click', '#send-landlord-emails-property', async function () {
            if ($('.table-options-container').find(".batch-email-btn").hasClass("disabled")) {
                return;
            }
            const response = await getRecipientsFromTableEvents('/EventDatesLandlordRecipients/GetPropertyRecipients');
            const recipients = response.Data;
            const modelTypeDesc = "landlords'";

                ValidateEmailAddresses(
                    recipients,
                    this.getAttribute('data-event-model-type'),
                    modelTypeDesc
                );
            }
        );

        me.$root.on('click', '#send-landlord-emails-propertyinsurance', async function () {
            if ($('.table-options-container').find(".batch-email-btn").hasClass("disabled")) {
                return;
            } 
            const response = await getRecipientsFromTableEvents('/EventDatesLandlordRecipients/GetPropertyInsuranceRecipients');
            const recipients = response.Data;
            const modelTypeDesc = "landlords'";

                ValidateEmailAddresses(
                    recipients,
                    this.getAttribute('data-event-model-type'),
                    modelTypeDesc
                );
            }
        );

        me.$root.on('click', '#send-landlord-emails-landlord', async function () {
            if ($('.table-options-container').find(".batch-email-btn").hasClass("disabled")) {
                return;
            }
            const response = await getRecipientsFromTableEvents('/EventDatesLandlordRecipients/GetLandlordRecipients');
            const recipients = response.Data;
            const modelTypeDesc = "landlords'";

                ValidateEmailAddresses(
                    recipients,
                    this.getAttribute('data-event-model-type'),
                    modelTypeDesc
                );
            }
        );

        me.$root.on('click', '#send-supplier-emails', async function () {
            if ($('.table-options-container').find(".batch-email-btn").hasClass("disabled")) {
                return;
            }
            const response = await getRecipientsFromTableEvents('/EventDatesSupplierRecipients/GetSupplierRecipients');
            const recipients = response.Data;
            const modelTypeDesc = "suppliers'";

            ValidateEmailAddresses(
                recipients,
                this.getAttribute('data-event-model-type'),
                modelTypeDesc
            );
        });

        me.$root.on('click', '#closePMModalButton', function () {
            me.$root.find('#modal-row').hide().html('').show();
            me.$root.find('.modal-row-container').fadeOut(300);

            setTimeout(function () {
                me.$root.find('.modal-row-container').hide(0);
                $('#pmhome').css('overflow', '');
                me.lockUI(false);
            }, 300);

            //me.reDrawPieCharts();
            // ** Need to target refresh of targeted widget
            me.refreshWidgetAfterTabledDismissed();
        });

        me.$root.on('click', '.new-letting-property', function () {
            var eventId = parseInt($(this).attr('data-historyeventid'));

            gmgps.cloud.helpers.property.gotoProgression({
                $row: $(
                    '<span data-modelType="{0}"></span>'.format(
                        C.ModelType.ChainLink
                    )
                ),
                id: 0,
                recordType: C.PropertyRecordType.Rent,
                secondaryId: eventId
            });
        });

        me.$root.on(
            'click',
            '.arrears-action-arrears:not(.disabled)',
            function () {
                var $row = $(this).closest('.databox-row');
                var sectionId = $(this)
                    .closest('.legend-root')
                    .find('.databox-row')
                    .index($row);
                var source = $(this)
                    .closest('.legend-root')
                    .hasClass('tenancy-legend')
                    ? me.ArrearsListSource.Tenancy
                    : me.ArrearsListSource.Contact;

                var includeHidden = me.$root
                    .find('#includeHiddenChargesOption')
                    .is(':checked');

                new gmgps.cloud.ui.views.batchChaseArrearsHandler({
                    branchIds: me.branchIds,
                    userId: me.userId,
                    sectionId: sectionId,
                    sourceId: source,
                    includeHidden: includeHidden
                }).show();
            }
        );

        me.$root.on(
            'click',
            '.arrears-action-batch:not(.disabled)',
            function () {
                var sectionId = 5; // BatchReceipts
                var source = $(this).hasClass('tenancy')
                    ? me.ArrearsListSource.Tenancy
                    : me.ArrearsListSource.Contact;

                me.displayArrearsTable(
                    source,
                    sectionId,
                    me.ArrearsActions.Batch
                );
            }
        );

        me.$root.on(
            'click',
            '#works-orders-outer-priority .calc-total',
            function () {
                if (
                    !$(this).hasClass('disabled') &&
                    !me.widgetDisabled($('#new-works-root'))
                ) {
                    me.loadModalReportTable(
                        $('#dashboard-pie-chart-outstanding-works-orders').attr(
                            'data-report-id'
                        ),
                        9,
                        'workorder-row'
                    );
                }
            }
        );

        me.$root.on(
            'click',
            '#works-orders-outer-status .calc-total',
            function () {
                if (
                    !$(this).hasClass('disabled') &&
                    !me.widgetDisabled($('#new-works-root'))
                ) {
                    me.loadModalReportTable(
                        $('#dashboard-pie-chart-new-works-orders').attr(
                            'data-report-id'
                        ),
                        10,
                        'workorder-row'
                    );
                }
            }
        );

        me.$root.on(
            'click',
            '#dashboard-pie-chart-outstanding-works-orders-legend > .databox-row',
            function () {
                if (
                    !$(this).hasClass('disabled') &&
                    !me.widgetDisabled($('#new-works-root'))
                ) {
                    var sectionId = $(this).data('workorderstatusid');
                    me.loadModalReportTable(
                        $('#dashboard-pie-chart-outstanding-works-orders').attr(
                            'data-report-id'
                        ),
                        sectionId,
                        'workorder-row'
                    );
                }
            }
        );

        me.$root.on(
            'click',
            '#dashboard-pie-chart-new-workd-legend > .databox-row',
            function () {
                if (
                    !$(this).hasClass('disabled') &&
                    !me.widgetDisabled($('#new-works-root'))
                ) {
                    var sectionId =
                        $('#dashboard-pie-chart-new-workd-legend')
                            .find('.databox-row')
                            .index($(this)) + 5;
                    me.loadModalReportTable(
                        $('#dashboard-pie-chart-new-works-orders').attr(
                            'data-report-id'
                        ),
                        sectionId,
                        'workorder-row'
                    );
                }
            }
        );

        me.$root.on('click', '#landlords-to-pay', function () {
            if (!$(this).hasClass('disabled')) {
                me.batchLandlordPayments();
            }
        });

        me.$root.on('click', '#unallocated-credits', function () {
            var count = $(this).attr('data-value-count');

            if (count > 0) {
                var rowCSS = $(this).attr('id') + '-row';
                me.loadModalReportTable(
                    $(this).attr('data-report-id'),
                    -1,
                    rowCSS
                );
            }
        });

        me.$root.on('click', '#suppliers-supplier-count', function () {
            if (!$(this).hasClass('disabled')) {
                me.loadSuppliersToPay();
            }
        });

        me.$root.on('click', '#suppliers-payment-amount', function () {
            if (!$(this).hasClass('disabled')) {
                me.loadSuppliersToPay();
            }
        });

        me.$root.on('click', '.suppliers-to-pay-refresh', function () {
            if (me.$suppliersToPayRefreshButton.hasClass('on')) {
                return false;
            }

            me.$suppliersToPayRefreshButton
                .addClass('on')
                .find('.fa')
                .addClass('fa-spin');
            me.refreshSupplierToPay();
        });

        me.$root.on('click', '.works-switcher', function () {
            var target = $(this);

            // Only switch if not currently active
            if (target.hasClass('inactive-chart')) {
                var arrow = target.parent().find('.status-arrow');
                target
                    .parent()
                    .find('.chart-switcher')
                    .removeClass('active-chart')
                    .addClass('inactive-chart');
                target.removeClass('inactive-chart').addClass('active-chart');
                arrow.toggleClass('point-right');

                if (target.attr('data-chart') == 'status') {
                    $('#works-orders-outer-priority').fadeOut(100, function () {
                        $('#works-orders-outer-status').fadeIn(200);
                        $('#works-orders-outer-status').show();
                        me.drawNewWorksOrdersPie();
                    });
                } else {
                    $('#works-orders-outer-status').fadeOut(100, function () {
                        $('#works-orders-outer-priority').fadeIn(200);
                        me.drawOutstandingWorksOrdersPie();
                    });
                }
            }
        });

        me.$root.on('click', '.arrears-switcher', function () {
            var target = $(this);
            // Only switch if not currently active
            if (target.hasClass('inactive-chart')) {
                var arrow = target.parent().find('.status-arrow');
                target
                    .parent()
                    .find('.chart-switcher')
                    .removeClass('active-chart')
                    .addClass('inactive-chart');
                target.removeClass('inactive-chart').addClass('active-chart');
                arrow.toggleClass('point-right');

                if (target.attr('data-chart') == 'contact') {
                    $('#arrears-tenancy').fadeOut(100, function () {
                        $('#arrears-contact').fadeIn(200);
                        $('#arrears-contact').show();
                        me.drawArrearsPieContact();
                    });
                } else {
                    $('#arrears-contact').fadeOut(100, function () {
                        $('#arrears-tenancy').fadeIn(200);
                        me.drawArrearsPie();
                    });
                }
            }
        });

        me.$root.on('click', '.date-event-row', function () {
            var eventType = parseInt($(this).attr('data-event-type'));
            var counterVal = parseInt($(this).attr('data-total'));
            const modelType = $(this).attr('data-event-model-type');
            var eventTitle = $(this).attr('data-title');

            if (counterVal > 0) {
                if (
                    eventType == C.ManagementDateType.GasSafetyCheckCertificate
                ) {
                    me.loadGasSafetyWidgetTable(eventTitle);
                } else {
                    me.lastLoadedReportId = 1;
                    me.loadModalDateEvents(eventType, eventTitle, modelType);
                }
            }
        });

        me.$root.on('click', '.workorder-row', function () {
            var propertyId = $(this).attr('data-propertyid');
            var contactId = $(this).attr('data-contactid');
            var workOrderId = $(this).attr('data-workorder');

            var linkedTypeId =
                propertyId > 0 ? C.ModelType.Property : C.ModelType.Contact;
            var recordId =
                linkedTypeId == C.ModelType.Property ? propertyId : contactId;

            new gmgps.cloud.helpers.property.openWorkOrder(
                linkedTypeId,
                recordId,
                parseInt(workOrderId),
                function () {
                    me.reloadModalReportTable();
                }
            );
        });

        me.$root.on('click', '.arrears-row', function () {
            var tenancyId = $(this).attr('data-tenancyid');
            var contactId = $(this).attr('data-contactid');

            var linkedId = tenancyId > 0 ? tenancyId : contactId;

            var linkedTypeId =
                tenancyId > 0 ? C.ModelType.Tenancy : C.ModelType.Contact;

            new gmgps.cloud.ui.views.receiptsHandler({
                linkedTypeId: linkedTypeId,
                linkedId: linkedId,
                title: 'Receipt from this tenancy',
                onComplete: function () {
                    // Refresh modal list?
                }
            }).show();
        });

        me.$root.on('click', '.held-receipt-row', function () {
            var tenancyId = $(this).attr('data-tenancyid');
            var contactId = $(this).attr('data-contactid');

            var linkedId = tenancyId > 0 ? tenancyId : contactId;
            var linkedTypeId =
                tenancyId > 0 ? C.ModelType.Tenancy : C.ModelType.Contact;

            var contactName = '';
            var onComplete = function () {
                me.reloadModalReportTable();
            };

            new gmgps.cloud.ui.views.receiptsHandler({
                linkedTypeId: linkedTypeId,
                linkedId: linkedId,
                title: 'Receive From: ' + contactName,
                onComplete: onComplete
            }).show();
        });

        me.$root.on(
            'click',
            '.suppliers-awaiting-payment-row, .suppliers-overdue-payment-row',
            function () {
                var contactId = $(this).attr('data-contactid');

                if (!contactId > 0) {
                    contactId = $(this).next('tr').attr('data-contactid');
                }

                var suppliersName = '';

                new gmgps.cloud.ui.views.paySupplierHandler({
                    id: contactId,
                    title: 'Payments For This Supplier: ' + suppliersName,
                    onComplete: function () {
                        // Refresh modal list?
                    }
                }).show();
            }
        );

        me.$root.on('click', '.landlords-to-pay-row', function () {
            var contactId = $(this).attr('data-contactid');

            if (!contactId > 0) {
                contactId = $(this)
                    .next('.landlords-to-pay-row')
                    .attr('data-contactid');
            }

            var landlordName = '';

            new gmgps.cloud.ui.views.payLandlordHandler({
                id: contactId,
                title: 'Payments For This Landlord: ' + landlordName,
                onComplete: function () {}
            }).show();
        });

        me.$root.on('click', '.vacated-tenancy-charges-row', function () {
            var chargeToPostUsageType = parseInt(
                $(this).attr('data-chargetopostusagetype')
            );

            switch (chargeToPostUsageType) {
                case C.ChargeToPostUsageType.RefundItem:
                case C.ChargeToPostUsageType.RefundCharge:
                    showInfo(
                        gmgps.cloud.ui.views.pmhomeDashboard.Messages
                            .ChargeReviewedOnRefundScreen
                    );
                    return;
                case C.ChargeToPostUsageType.OpeningBalanceCharge:
                    showInfo(
                        gmgps.cloud.ui.views.pmhomeDashboard.Messages
                            .ChargeReviewedOnAccountsOpeningBalanceScreen
                    );
                    return;
                case C.ChargeToPostUsageType.ArrearsCharge:
                    showInfo(
                        gmgps.cloud.ui.views.pmhomeDashboard.Messages
                            .ChargeReviewedOnAccountsOpeningBalanceArrearsScreen
                    );
                    return;
            }

            var tenancyId = $(this).attr('data-tenancyid');
            var linkedTypeId = C.ModelType.Tenancy;

            var onComplete = function () {
                me.reloadModalReportTable();
            };
            new gmgps.cloud.ui.views.chargesHandler({
                linkedTypeId: linkedTypeId,
                linkedId: tenancyId,
                title: 'Charges For This Tenancy',
                subject: 'This Tenancy',
                onComplete: onComplete
            }).show();
        });

        me.$root.on('click', '.outstanding-refunds-row', function () {
            var contactId = $(this).attr('data-contactid');
            var tenancyId = $(this).attr('data-tenancyid');

            var contactName = $(this).find('td:nth-child(3)').text();

            var linkedId = tenancyId > 0 ? tenancyId : contactId;
            var linkedTypeId =
                tenancyId > 0 ? C.ModelType.Tenancy : C.ModelType.Contact;

            var onComplete = function () {
                me.reloadModalReportTable();
            };

            new gmgps.cloud.ui.views.refundsHandler({
                linkedTypeId: linkedTypeId,
                linkedId: linkedId,
                title: 'Refunds for: ' + contactName,
                onComplete: onComplete
            }).show();
        });

        me.$root.on('click', '.date-event-row-detail', function () {
            var recordId = $(this).attr('data-followupid');
            var tenancyId = $(this).attr('data-tenancyid');
            var contactId = $(this).attr('data-contactid');
            var propertyId = $(this).attr('data-propertyid');
            var eventSubTypeId = $(this).attr('data-subtypeid');

            var linkedId = tenancyId > 0 ? tenancyId : contactId;
            var linkedTypeId =
                tenancyId > 0 ? C.ModelType.Tenancy : C.ModelType.Contact;

            if (linkedId == null) {
                linkedId = propertyId;
                linkedTypeId = C.ModelType.Property;
            }

            var onComplete = function () {
                me.reloadModalDateEvents();
            };

            if (eventSubTypeId != C.ManagementDateType.PropertyInspection) {
                return gmgps.cloud.helpers.diary.getManagementDate(
                    linkedId,
                    linkedTypeId,
                    recordId,
                    null,
                    onComplete
                );
            }

            var contactElement = $(this).find('td[data-linkedtype="Contact"]');
            var contactIdForDiary = contactElement.attr('data-linkedid');

            var tenancyElement = $(this).find('td[data-linkedtype="Tenancy"]');
            var tenancyIdForDiary = tenancyElement.attr('data-linkedid');

            var propertyElement = $(this).find('td[data-linkedtype="Property"]');
            var propertyIdForDiary = propertyElement.attr('data-linkedid');
            var propertyLocationForDiary = propertyElement.text();

            var managementData = {
                subtypeId: eventSubTypeId,
                propertyId: propertyIdForDiary,
                propertyLocation: propertyLocationForDiary
            }
            
            gmgps.cloud.helpers.diary.getDiaryEvent(recordId).then(function (diaryEvent) {
                managementData.existingPropertyInspectionDiaryId = diaryEvent?.Id;
                managementData.existingPropertyInspectionDiaryStartDate = new Date(diaryEvent?.StartDate).toString();
                managementData.existingPropertyInspectionDiaryEndDate = new Date(diaryEvent?.EndDate).toString();

                function getTenancyContacts() {
                    return new Promise((resolve, reject) => {
                        if (contactIdForDiary === undefined || contactIdForDiary == 0) {
                            var searchArgs = {
                                Ids: tenancyIdForDiary,
                                SearchPage: { Size: 0 },
                                Query: '',
                                ReturnFirstTermId: true,
                                UseLatestTerm: true,
                                IncludeLandlords: false,
                                IncludeTenants: true
                            };

                            new gmgps.cloud.http("tenancy-getSelectedTenancyContactIds").ajax({
                                args: searchArgs,
                                complex: true,
                                dataType: 'json',
                                type: 'post',
                                url: '/Tenancy/GetTenancyContacts'
                            }, function (response) {
                                var contactIdForDiary = response.Data[0]
                                managementData.contactId = contactIdForDiary
                                resolve();
                            }, function (error) {
                                reject(error);
                            })
                        } else {
                            resolve();
                        }
                    });
                }

                getTenancyContacts().then(() => {
                    gmgps.cloud.helpers.diary.getManagementDate(
                        linkedId,
                        linkedTypeId,
                        recordId,
                        null,
                        onComplete,
                        managementData
                    );
                }).catch((error) => {
                    console.error("Error fetching tenancy contacts:", error);
                    gmgps.cloud.helpers.diary.getManagementDate(
                        linkedId,
                        linkedTypeId,
                        recordId,
                        null,
                        onComplete
                    );
                });
            });
        });

        me.$root.on('click', '.date-event-record-link', function (e) {
            var linkedId = $(this).attr('data-linkedid');

            if (linkedId > 0) {
                e.stopPropagation();
            }

            var linkedType = $(this).attr('data-linkedtype');

            if (linkedId > 0) {
                switch (linkedType) {
                    case 'Tenancy': {
                        gmgps.cloud.helpers.tenancy.gotoTenancy({
                            id: parseInt(linkedId),
                            tabColumn: 'tenancyinfo'
                        });
                        break;
                    }

                    case 'Property': {
                        gmgps.cloud.helpers.property.editProperty({
                            id: parseInt(linkedId)
                        });
                        break;
                    }

                    case 'Contact': {
                        gmgps.cloud.helpers.contact.editContact({
                            id: parseInt(linkedId)
                        });
                        break;
                    }
                }
            }
        });

        me.$root.on('click', '.unallocated-credits-row', function () {
            var linkedId = $(this).attr('data-linkedid');
            var linkedTypeId = $(this).attr('data-linkedtypeid');

            var onComplete = function () {
                me.reloadModalReportTable();
            };

            new gmgps.cloud.ui.views.receiptsHandler({
                linkedTypeId: linkedTypeId,
                linkedId: linkedId,
                title: 'Unallocated Credit',
                onComplete: onComplete
            }).show();
        });

        me.$root.on('click', '.deposits-to-be-refunded', function () {
            var linkedId = $(this).attr('data-tenancyid');
            var linkedTypeId = C.ModelType.Tenancy;

            var onComplete = function () {
                me.reloadModalReportTable();
            };
            new gmgps.cloud.ui.views.refundsHandler({
                linkedTypeId: linkedTypeId,
                linkedId: linkedId,
                title: 'Deposit Refund',
                onComplete: onComplete
            }).show();
        });

        me.$root.on(
            'click',
            '.deposits-in-dispute .btn-charge-dispute-refund',
            function () {
                var linkedId = $(this).closest('tr').attr('data-tenancyid');
                var linkedTypeId = C.ModelType.Tenancy;

                var onComplete = function () {
                    me.reloadModalReportTable();
                };

                new gmgps.cloud.ui.views.refundsHandler({
                    linkedTypeId: linkedTypeId,
                    linkedId: linkedId,
                    title: 'Deposit Refund',
                    onComplete: onComplete
                }).show();
            }
        );

        me.$root.on('click', '.expired-charges-row', function () {
            var chargeToPostId = $(this)
                .closest('tr')
                .attr('data-chargetoPostid');
            var linkedId = $(this).closest('tr').attr('data-linkedid');
            var linkedTypeId = $(this).closest('tr').attr('data-linkedtypeid');

            var onComplete = function () {
                me.reloadModalReportTable();
            };

            new gmgps.cloud.ui.views.editChargeHandler({
                linkedTypeId: linkedTypeId,
                linkedId: linkedId,
                chargeId: chargeToPostId,
                title: 'Edit Expired Charge',
                onComplete: onComplete
            }).show();
        });

        me.$root.on('click', '.deposits-in-dispute', function () {
            new gmgps.cloud.ui.views.refundsHandler({
                linkedTypeId: C.ModelType.Tenancy,
                linkedId: parseInt($(this).attr('data-tenancyid')),
                title: 'Refunds For This Tenancy',
                onComplete: function () {}
            }).show();
        });

        me.$root.on('click', '.deposits-not-registered', function (e) {
            if (
                $(e.target).hasClass('tds-failed') ||
                $(e.target).parent().hasClass('tds-failed')
            ) {
                e.stopPropagation();
                new gmgps.cloud.helpers.tds.DataCapture({
                    tenancyId: $(this).data('tenancyid'),
                    onComplete: function () {
                        me.reloadModalReportTable();
                    }
                }).show();
                return false;
            }

            // Jump to Tenancy > Tenancy > Deposit
            // Cannot drill down to the Deposit sub-tab
            gmgps.cloud.helpers.tenancy.gotoTenancy({
                id: parseInt($(this).attr('data-tenancyid')),
                tabColumn: 'tenancyinfo',
                tabName: 'deposit-tab'
            });
        });

        //News Feed > Change
        me.$root.on('change keyup', '#pm-dashboard-rssNewsUrl', function () {
            me.saveNewsFeedUrl(
                $(this).val(),
                $(this).find('option:selected').text(),
                function () {
                    me.refreshNews();
                }
            );
        });

        //News Feed > refresh
        me.$root.on('click', '.refresh-news', function () {
            me.refreshNews();
        });

        //List Paging
        me.$root.on(
            'click',
            '.dashboard-list .pagination li:not(.disabled)',
            function () {
                me.refreshList($(this));
            }
        );

        //Add general task button > Click
        me.$root.on('click', '#dashboard-add-generaltask-button', function () {
            alert('todo');
        });

        //List filtering (checkboxes) > Change
        me.$root.on('change', '.dashboard-list-options-filter', function () {
            me.refreshList($(this));
        });

        //List sort order > Change
        me.$root.on('change', '.dashboard-list-options-sortorder', function () {
            me.refreshList($(this));
        });

        me.$root.on('change', '#new-lettings-picker', function () {
            var listSubType = $(this).val();
            $('#new-lettings')
                .find('.dashboard-list')
                .attr('data-listsubtype', listSubType);
            me.loadNewLettings(1, listSubType);
        });

        me.$root.on(
            'change',
            '#includeHiddenChargesOption, #includeHiddenChargesOptionContact',
            function () {
                var checked = $(this).is(':checked');
                $('#includeHiddenChargesOption').prop('checked', checked);
                $('#includeHiddenChargesOptionContact').prop(
                    'checked',
                    checked
                );

                me.refreshArrearsPie();
            }
        );

        me.refreshNews();

        InitiateEasyPieChart.init();

        me.animatePieCharts();

        me.detectNewLettingsWidgetWidth();

        me.$root.on(
            'click',
            '#includeProposedTenancies .switcher',
            function (e) {
                e.stopPropagation();

                var target = $(this);

                if (target.hasClass('darkgray')) {
                    var arrow = me.$root.find(
                        '#includeProposedTenancies .status-arrow'
                    );
                    me.$root
                        .find('#includeProposedTenancies .switcher')
                        .removeClass('magenta')
                        .removeClass('selected-option')
                        .addClass('darkgray');
                    target
                        .removeClass('darkgray')
                        .addClass('magenta')
                        .addClass('selected-option');
                    arrow.toggleClass('point-right');

                    var includeProposedTenancies = me.$root
                        .find('#includeProposedTenancies .include-proposed')
                        .hasClass('selected-option');

                    new gmgps.cloud.http("dashboard-init").ajax(
                        {
                            args: {
                                key: C.UiPersonalisation
                                    .PMHomeIncludeProposedTenancies,
                                data: includeProposedTenancies
                            },
                            background: true,
                            complex: true,
                            dataType: 'json',
                            type: 'post',
                            url: '/user/PutUiPersonalisation'
                        },
                        function () {
                            me.refreshHeadlineFigures();
                        }
                    );
                }
            }
        );

        me.$root.on(
            'change',
            '.includeProposedTenancies #incProposed',
            function () {
                var includeProposedTenancies = $(this).is(':checked');

                new gmgps.cloud.http("dashboard-init").ajax(
                    {
                        args: {
                            key: C.UiPersonalisation
                                .PMHomeIncludeProposedTenancies,
                            data: includeProposedTenancies
                        },
                        background: true,
                        complex: true,
                        dataType: 'json',
                        type: 'post',
                        url: '/user/PutUiPersonalisation'
                    },
                    function () {
                        me.reloadModalReportTable();
                        me.$root
                            .find('#includeProposedTenancies .switcher')
                            .toggleClass('magenta')
                            .toggleClass('darkgray')
                            .toggleClass('selected-option');
                        me.$root
                            .find('#includeProposedTenancies .status-arrow')
                            .toggleClass('point-right');
                    }
                );
            }
        );
    },

    widgetDisabled: function ($widgetItem) {
        if ($widgetItem.hasClass('widget-root')) {
            return $widgetItem.hasClass('access-disabled') ? true : false;
        } else {
            var $widgetRoot = $widgetItem.closest('.widget-root');
            return $widgetRoot.hasClass('access-disabled') ? true : false;
        }
    },

    refreshList: function ($source) {
        //This is a general refresh function which will refresh any list following paging/filtering/etc.
        var me = this;

        //Determine list type and current page index.
        var $list = $source.closest('.dashboard-list');
        var listType = $list.attr('data-listType');
        var pageIndex = parseInt($list.attr('data-pageindex'));

        //Paging (adjust pageindex if required)
        if ($source.hasClass('next') || $source.hasClass('prev')) {
            var dir = $source.hasClass('next') ? 'next' : 'prev';
            pageIndex = dir == 'next' ? pageIndex + 1 : pageIndex - 1;
        }

        //Sorting
        var sortOrderId = parseInt(
            $list.find('.dashboard-list-options-sortorder').val()
        );

        //Filtering
        var listOptionExclusionIds = me.getListOptionExclusionIds($list);

        if (listType == 'FollowUps') {
            //The followup box contains many lists which are serviced by the same refresh function, so get the followup type.
            var dashboardFollowUpTypeId = parseInt(
                $list.attr('data-dashboardFollowUpTypeId')
            );
            me.refreshFollowUpList(
                pageIndex,
                dashboardFollowUpTypeId,
                listOptionExclusionIds,
                sortOrderId
            );
        } else if (listType == 'New-Lettings') {
            //New Lettings
            var listSubType = $list.attr('data-listsubtype');
            me.loadNewLettings(pageIndex, listSubType);
        } else {
            //Any other type of list.
            me['refresh{0}'.format(listType)](
                pageIndex,
                listOptionExclusionIds,
                sortOrderId
            );
        }
    },

    getListOptionExclusionIds: function ($list) {
        var ids = [];

        var $options = $list.find('.dashboard-list-options');
        var $uncheckedCheckboxes = $options.find(
            '.dashboard-list-options-filter:not(:checked)'
        );

        $uncheckedCheckboxes.each(function (i, v) {
            ids.push(parseInt($(v).attr('data-filterId')));
        });

        return ids;
    },

    detectNewLettingsWidgetWidth: function () {
        var widthAtWhichToSplitColumn = 400;

        var width = $('#new-lettings').width();

        if (width > widthAtWhichToSplitColumn) {
            $('#new-lettings').addClass('split');
        } else {
            $('#new-lettings').removeClass('split');
        }
    },

    reloadModalDateEvents: function () {
        var me = this;
        if (!me.lastDateEventTypeId) return;

        if (
            me.lastDateEventTypeId !=
            parseInt(C.ManagementDateType.GasSafetyCheckCertificate)
        ) {
            if (!me.lastEventModelType) return;
            me.loadModalDateEvents(
                me.lastDateEventTypeId,
                me.lastDateEventTitle,
                me.lastEventModelType
            );
        } else {
            me.loadGasSafetyWidgetTable('Gas Safe Check/Cert');
        }
    },

    loadGasSafetyWidgetTable: function (title) {
        var me = this;

        me.lastDateEventTypeId = parseInt(
            C.ManagementDateType.GasSafetyCheckCertificate
        );
        me.lastDateEventTitle = 'Gas Safe Check/Cert';

        new gmgps.cloud.http("dashboard-loadGasSafetyWidgetTable").ajax(
            {
                args: {
                    branchIds: me.branchIds,
                    propertyManagerIds: me.propertyManagerIds
                },
                complex: true,
                dataType: 'html',
                background: true,
                type: 'post',
                url: '/PMHome/GetGasSafetyList'
            },
            function (response) {
                me.$root.find('#modal-row').html('').append(response);

                var itemCount = me.$root.find('#modal-row').find('.date-event-row-detail').length;
                me.$root.find('#eventTitle').text(title)
                me.$root.find('#modal-row').find('.widget-caption').text('Date Events (' + title + ') : ' + itemCount + ' items');

                new gmgps.cloud.ui.views.eventsModalTableHandler();

                $('#pmhome').css('overflow', 'hidden');
                me.$root.find('.modal-row-container').show();

                me.resizeTableScrollRegion();
            }
        );
    },

    loadModalDateEvents: function (eventTypeId, title, modelType) {
        var me = this;
        me.lastDateEventTypeId = eventTypeId;
        me.lastEventModelType = modelType;
        me.lastDateEventTitle = title;

        var $table = $('#PMHomeLoadedTable');
        var $dateEventFilters = $('#date-event-filters');
        var initValues = {};

        if ($dateEventFilters.length == 1 && $table.length == 1)
        {
            var tableOptions = $table.bootstrapTable('getOptions')

            initValues = {
                sortName: tableOptions.sortName,
                sortOrder: tableOptions.sortOrder,
                showFilters: $dateEventFilters.attr('aria-expanded') === 'true',
                statusFilter: $('#StatusesFilter').val(),
                startDateFilter: $('#EventsStartDateFilter').val(),
                endDateFilter: $('#EventsEndDateFilter').val(),
                tenancyOrPropertyStatusFilter: $('#EventsTenancyOrPropertyStatusesFilter').val(),
                eventsStatusesFilter: $('#EventsStatusesFilter').val(),
                managementTypeFilter: $('#ManagementTypeFilter').val(),
                branchFilter: $('#EventsBranchIdsFilter').val(),
                propertyManagerFilter: $('#EventsPropertyManagerIdsFilter').val(),
                tenantEmailStatusFilter: $('#TenantEmailStatusFilter').val(),
                landlordEmailStatusFilter: $('#LandlordEmailStatusFilter').val(),
                supplierEmailStatusFilter: $('#SupplierEmailStatusFilter').val()
            };
        }

        new gmgps.cloud.http("dashboard-loadModalDateEvents").ajax(
            {
                args: {
                    branchIds: me.branchIds,
                    propertyManagerIds: me.propertyManagerIds,
                    eventTypeId,
                    modelType
                },
                complex: true,
                dataType: 'html',
                background: true,
                type: 'post',
                url: '/PMHome/GetDateEventsList'
            },
            function (response) {
                me.$root.find('#modal-row').html('').append(response);

                var itemCount = me.$root.find('#modal-row').find('.date-event-row-detail').length;
                me.$root.find('#eventTitle').text(title)
                me.$root.find('#modal-row').find('.widget-caption').text('Date Events (' + title + ') : ' + itemCount + ' items');

                new gmgps.cloud.ui.views.eventsModalTableHandler(initValues);

                $('#pmhome').css('overflow', 'hidden');
                me.$root.find('.modal-row-container').show();

                me.resizeTableScrollRegion();
            }
        );
    },

    reloadModalReportTable: function () {
        var me = this;

        if (!me.lastLoadedReportId) return;
        me.loadModalReportTable(
            me.lastLoadedReportId,
            me.lastLoadedReportSection,
            me.lastLoadedReportCSS
        );
    },

    refreshWidgetAfterTabledDismissed: function () {
        var me = this;

        if (!me.lastLoadedReportId) return;

        var lastWidget = parseInt(me.lastLoadedReportId);

        switch (lastWidget) {
            // Works orders / priority and status
            case 99: {
                me.refreshNewWorksPie();
                me.refreshOutstandingWorksPie();
                break;
            }

            // Unallocated Credits
            case 130: {
                me.refreshUnallocatedCredits();
                break;
            }

            // Date events , reportId 1 not used elsewhere
            case 1: {
                me.refreshDateEvents();
                break;
            }

            // Outstanding refunds & ALL others
            default: {
                me.refreshHeadlineFigures();
                break;
            }
        }
    },

    loadModalReportTable: function (reportId, section, rowCSS) {
        var me = this;
        var requestedSection;

        me.lastLoadedReportId = reportId;
        me.lastLoadedReportSection = section;
        me.lastLoadedReportCSS = rowCSS;

        if (section === 'undefined' || section === null) {
            requestedSection = -1;
        } else {
            requestedSection = section;
        }

        new gmgps.cloud.http("dashboard-loadModalReportTable").ajax(
            {
                args: {
                    branchIds: me.branchIds,
                    propertyManagerIds: me.propertyManagerIds,
                    requestedReport: reportId,
                    rowCss: rowCSS,
                    requestedSection: requestedSection
                },
                complex: true,
                dataType: 'html',
                type: 'post',
                url: '/PMHome/GetReportHtml'
            },
            function (response) {
                me.$root.find('#modal-row').html('').append(response);

                $('#PMHomeLoadedTable').bootstrapTable();

                $('#pmhome').css('overflow', 'hidden');
                me.$root.find('.modal-row-container').show();

                me.resizeTableScrollRegion();
            }
        );
    },

    resizeTableScrollRegion: function () {
        var windowHeight = $('#modal-row-container').height();

        var widgetWindowHeight = windowHeight - 130; // 40
        widgetWindowHeight += 'px';

        var scrollRegionHeight = widgetWindowHeight - 550; // 450
        scrollRegionHeight += 'px';

        var tableContainerHeight = windowHeight - 250; // 220
        tableContainerHeight += 'px';

        $('#modal-row-container')
            .not('.window')
            .find('.widget-body')
            .css('height', widgetWindowHeight);
        $('#modal-row-container')
            .not('.window')
            .find('.fixed-table-body')
            .css('height', scrollRegionHeight);
        $('#modal-row-container')
            .not('.window')
            .find('.fixed-table-container')
            .css('height', tableContainerHeight)
            .css('overflow', 'hidden');

        $('#PMHomeLoadedTable').bootstrapTable('refresh');
    },

    lockUI: function (lock) {
        glass(lock);
    },

    refreshAll: function () {
        var me = this;

        me.lockUI(true);

        //Refreshing everything means a top-level change or initial load, so everything which wants a spinner gets one.  As each section completes, these get replaced.
        me.$root
            .find('.opt-spinner')
            .not('.opt-refresh-all-exclude')
            .html('<div class="home-spinner"></div>');

        $.when(
            me.refreshHomeCharts(),
            me.loadNewLettings(1, me.$root.find('#new-lettings-picker').val())
        )
            .done(function () {
                me.lockUI(false);
            })
            .fail(function () {
                me.lockUI(false);
            });
    },

    reDrawPieCharts: function () {
        var me = this;

        me.drawWorksOrderPies();
        me.drawArrearsPie();
        me.addQtipInfo();
    },

    drawWorksOrderPies: function () {
        //hmmm pie !

        var me = this;

        me.refreshNewWorksPie();
        me.refreshOutstandingWorksPie();
    },

    sizeUI: function () {
        var me = this;

        waitForUIResizeComplete(function () {
            google.charts.setOnLoadCallback(function () {
                me.resizeTableScrollRegion();
                me.reDrawPieCharts();
                me.detectNewLettingsWidgetWidth();
                me.reflowHeadlineFigures();
            });
        }, 500);
    },

    animatePieCharts: function () {
        $('#new-lettings .chart').easyPieChart({
            animate: 500,
            size: 50,
            scaleColor: false,
            lineWidth: 5,
            trackColor: '#ff725d',
            barColor: '#ffffff',
            lineCap: 'square'
        });
        // trackColor 84c4ff
    },

    //Add qtip info
    addQtipInfo: function () {
        var me = this;

        me.$root.find('.branch-data-widget-tooltip').qtip({
            content: {
                text: "<div style='text-align:center; padding: 5px;'><div style='font-size:16px;margin-top:2px'>This widget displays branch data only.</div> <br /><div style='font-size:12px;'>No property manager filters will be applied.</div></div>"
            },
            position: {
                viewport: $(window),
                my: 'top center',
                at: 'bottom center',
                effect: function () {
                    $(this).fadeIn('slow');
                }
            },
            style: {
                width: 320,
                classes: 'qtip-dark',
                tip: {
                    height: 14,
                    width: 24
                }
            }
        });
    },

    animateNumberCounts: function () {
        var me = this;

        me.$root.find('.summary-num').each(function () {
            var sel = $(this).attr('id');
            var $target = $('#' + sel);
            var target_val = $(this).attr('data-counter');
            var prefix = $(this).attr('data-prefix');
            var decimals = parseInt($(this).attr('data-decimals'));

            var $badge = $(this).parent().find('.badge');
            var badge_sel = '#' + $(this).attr('id') + '-counter';
            var badge_val = $badge.attr('data-counter');

            $target.html('<div class="fa fa-cog fa-spin"></div>');
            $badge.fadeOut(0);
            $badge.html(badge_val);

            var options = {
                useEasing: true,
                useGrouping: true,
                separator: ',',
                decimal: '.',
                prefix: prefix,
                suffix: ''
            };

            var cnt = new CountUp(sel, 0, target_val, decimals, 1, options);
            cnt.start();

            if ($badge.lengh > 0) {
                var badge_cnt = new CountUp(
                    badge_sel,
                    0,
                    badge_val,
                    0,
                    1,
                    options
                );
                badge_cnt.start();
            }

            $badge.fadeIn(500);
        });

        setTimeout(function () {
            me.reflowHeadlineFigures();
        }, 500);
    },

    // Inital Draw
    drawHomeCharts: function () {
        var me = this;

        setTimeout(function () {
            me.drawArrearsPie();
            me.drawNewWorksOrdersPie();
            me.drawOutstandingWorksOrdersPie();
            me.detectNewLettingsWidgetWidth();
        }, 300);

        me.drawLandlordsToPay();
        me.drawUnallocatedCredits();
        me.drawHeadlineFigures();
        me.detectNewLettingsWidgetWidth();
    },

    // Init, called when main page is loaded.
    initHomeCharts: function () {
        var me = this;

        me.detectNewLettingsWidgetWidth();

        // Refresh charts not already configured on page load.
        me.refreshArrearsPie();
        me.refreshUnallocatedCredits();
        me.refreshNewWorksPie();
        me.refreshOutstandingWorksPie();
        me.refreshHeadlineFigures();
        me.refreshDateEvents();

        // Draw any charts that are already configured.
        me.drawLandlordsToPay();
    },

    // Refresh > Draw
    refreshHomeCharts: function () {
        var me = this;

        me.detectNewLettingsWidgetWidth();

        me.refreshArrearsPie();
        me.refreshLandlordsToPay();
        me.refreshUnallocatedCredits();
        me.refreshNewWorksPie();
        me.refreshOutstandingWorksPie();
        me.refreshHeadlineFigures();
        me.refreshDateEvents();
    },

    // DATE EVENTS
    refreshDateEvents: function () {
        var me = this;

        new gmgps.cloud.http("dashboard-refreshDateEvents").getView({
            url: '/PMHome/GetDateEvents',
            post: true,
            args: {
                userid: me.userId,
                branchIds: me.branchIds,
                propertyManagerIds: me.propertyManagerIds
            },
            onSuccess: function (response) {
                var $listBody = $('#date-events-list');
                $listBody.html(response.Data);
            }
        });
    },

    // ARREARS CHART(s)
    refreshArrearsPie: function () {
        var me = this;

        // Currently using the jQuery Ajax call because our gmgps version redirects to
        // the logon page every time for some reason. Minor changes here once time to resolve.

        var IncludeHiddenCharges = $('#includeHiddenChargesOption').is(
            ':checked'
        );

        $.ajax({
            url: '/PMHome/GetArrearsChartData',
            data: {
                branchIds: me.branchIds,
                userId: me.userId,
                includeHidden: IncludeHiddenCharges
            },
            type: 'post',
            dataType: 'json',
            cache: false,
            headers: {
                'X-Component-Name': 'pmHome-dashboard-refreshArrearsPie',
                'Alto-Version': alto.version
            },
            success: function (response) {
                if (!response) {
                    return;
                }

                $('#dashboard-pie-chart-arrears').attr(
                    'data-7-days',
                    response.tenancyChart.days_7
                );
                $('#dashboard-pie-chart-arrears').attr(
                    'data-14-days',
                    response.tenancyChart.days_14
                );
                $('#dashboard-pie-chart-arrears').attr(
                    'data-30-days',
                    response.tenancyChart.days_30
                );
                $('#dashboard-pie-chart-arrears').attr(
                    'data-31-days-plus',
                    response.tenancyChart.days_31_plus
                );
                $('#dashboard-pie-chart-arrears').attr(
                    'data-calc-total',
                    response.tenancyChart.CalculatedTotal
                );

                $('#dashboard-pie-chart-arrears-contact').attr(
                    'data-7-days',
                    response.contactChart.days_7
                );
                $('#dashboard-pie-chart-arrears-contact').attr(
                    'data-14-days',
                    response.contactChart.days_14
                );
                $('#dashboard-pie-chart-arrears-contact').attr(
                    'data-30-days',
                    response.contactChart.days_30
                );
                $('#dashboard-pie-chart-arrears-contact').attr(
                    'data-31-days-plus',
                    response.contactChart.days_31_plus
                );
                $('#dashboard-pie-chart-arrears-contact').attr(
                    'data-calc-total',
                    response.contactChart.CalculatedTotal
                );

                me.drawArrearsPie();
                me.drawArrearsPieContact();
            }
        });
    },

    drawArrearsPie: function () {
        var me = this;

        var pie = $('#dashboard-pie-chart-arrears');
        if (!pie.is(':visible')) return;

        var days_7 = parseFloat(
            $('#dashboard-pie-chart-arrears').attr('data-7-days')
        );
        var days_14 = parseFloat(
            $('#dashboard-pie-chart-arrears').attr('data-14-days')
        );
        var days_30 = parseFloat(
            $('#dashboard-pie-chart-arrears').attr('data-30-days')
        );
        var days_31_plus = parseFloat(
            $('#dashboard-pie-chart-arrears').attr('data-31-days-plus')
        );
        var calc_total = parseFloat(
            $('#dashboard-pie-chart-arrears').attr('data-calc-total')
        );
        var IncludeHiddenCharges = $('#includeHiddenChargesOption').is(
            ':checked'
        );
        var anySectionIsPositive =
            days_7 > 0 || days_14 > 0 || days_30 > 0 || days_31_plus > 0
                ? true
                : false;
        var allSectionsAreNegative =
            days_7 <= 0 && days_14 <= 0 && days_30 <= 0 && days_31_plus <= 0
                ? true
                : false;

        $('#dashboard-pie-chart-arrears-legend')
            .find('.days_7')
            .text(me.currencyWithCommas(days_7));
        $('#dashboard-pie-chart-arrears-legend')
            .find('.days_14')
            .text(me.currencyWithCommas(days_14));
        $('#dashboard-pie-chart-arrears-legend')
            .find('.days_30')
            .text(me.currencyWithCommas(days_30));
        $('#dashboard-pie-chart-arrears-legend')
            .find('.days_31_plus')
            .text(me.currencyWithCommas(days_31_plus));
        $('#dashboard-pie-chart-arrears-legend')
            .parent()
            .find('.calc-total')
            .text(me.currencyWithCommas(calc_total));

        if (
            calc_total != 0 &&
            (anySectionIsPositive || allSectionsAreNegative)
        ) {
            $('#arrears-no-data-pie').hide();
        } else {
            $('#arrears-no-data-pie').show(300);
        }

        if (days_7 == 0) {
            $('#dashboard-pie-chart-arrears-legend')
                .find('.days_7')
                .parent()
                .find('.btn')
                .addClass('disabled');
        } else {
            $('#dashboard-pie-chart-arrears-legend')
                .find('.days_7')
                .parent()
                .find('.btn')
                .removeClass('disabled');
        }

        if (days_14 == 0) {
            $('#dashboard-pie-chart-arrears-legend')
                .find('.days_14')
                .parent()
                .find('.btn')
                .addClass('disabled');
        } else {
            $('#dashboard-pie-chart-arrears-legend')
                .find('.days_14')
                .parent()
                .find('.btn')
                .removeClass('disabled');
        }

        if (days_30 == 0) {
            $('#dashboard-pie-chart-arrears-legend')
                .find('.days_30')
                .parent()
                .find('.btn')
                .addClass('disabled');
        } else {
            $('#dashboard-pie-chart-arrears-legend')
                .find('.days_30')
                .parent()
                .find('.btn')
                .removeClass('disabled');
        }

        if (days_31_plus == 0) {
            $('#dashboard-pie-chart-arrears-legend')
                .find('.days_31_plus')
                .parent()
                .find('.btn')
                .addClass('disabled');
        } else {
            $('#dashboard-pie-chart-arrears-legend')
                .find('.days_31_plus')
                .parent()
                .find('.btn')
                .removeClass('disabled');
        }

        if (calc_total == 0) {
            $('#dashboard-pie-chart-arrears-legend')
                .find('.calc-total')
                .parent()
                .find('.arrears-action-arrears')
                .addClass('disabled');
        } else {
            $('#dashboard-pie-chart-arrears-legend')
                .find('.calc-total')
                .parent()
                .find('.arrears-action-arrears')
                .removeClass('disabled');
        }

        if (calc_total == 0) {
            $('#dashboard-pie-chart-arrears-legend')
                .find('.calc-total')
                .parent()
                .find('.arrears-action-batch')
                .addClass('disabled');
        } else {
            $('#dashboard-pie-chart-arrears-legend')
                .find('.calc-total')
                .parent()
                .find('.arrears-action-batch')
                .removeClass('disabled');
        }

        // Truns out that when all values are -ve, pie charts will render.
        // But ONLY if all are -ve
        if (!allSectionsAreNegative) {
            if (days_7 < 0) {
                days_7 = 0;
            }
            if (days_14 < 0) {
                days_14 = 0;
            }
            if (days_30 < 0) {
                days_30 = 0;
            }
            if (days_31_plus < 0) {
                days_31_plus = 0;
            }
        }

        var data = [
            { label: '0 - 7 Days', data: days_7, color: '#5db2ff' },
            { label: '8 - 14 Days', data: days_14, color: '#fb6e52' },
            { label: '15 - 30 Days', data: days_30, color: '#a0d468' },
            { label: '31+ Days', data: days_31_plus, color: '#ffce55' }
        ];

        $.plot('#dashboard-pie-chart-arrears', data, {
            series: {
                pie: {
                    innerRadius: 0.5,
                    show: true,
                    label: {
                        show: false,
                        threshold: 1
                    }
                }
            },
            grid: {
                hoverable: !IncludeHiddenCharges,
                clickable: !IncludeHiddenCharges
            },
            legend: {
                show: false
            }
        });

        $('#dashboard-pie-chart-arrears')
            .off('plotclick')
            .on('plotclick', function (event, pos, obj) {
                if (!obj) {
                    return;
                }

                var series = obj.series.label;
                var sectionId = 0;

                switch (series) {
                    case '0 - 7 Days': {
                        sectionId = 0;
                        break;
                    }

                    case '8 - 14 Days': {
                        sectionId = 1;
                        break;
                    }

                    case '15 - 30 Days': {
                        sectionId = 2;
                        break;
                    }

                    case '31+ Days': {
                        sectionId = 3;
                        break;
                    }
                }

                new gmgps.cloud.ui.views.batchChaseArrearsHandler({
                    branchIds: me.branchIds,
                    userId: me.userId,
                    sectionId: sectionId,
                    sourceId: me.ArrearsListSource.Tenancy
                }).show();
            });
        $('#dashboard-pie-chart-arrears').css('cursor', 'pointer');
        me.addQtipInfo();
    },

    drawArrearsPieContact: function () {
        var me = this;

        var pie = $('#dashboard-pie-chart-arrears-contact');
        if (!pie.is(':visible')) return;

        var days_7 = parseFloat(
            $('#dashboard-pie-chart-arrears-contact').attr('data-7-days')
        );
        var days_14 = parseFloat(
            $('#dashboard-pie-chart-arrears-contact').attr('data-14-days')
        );
        var days_30 = parseFloat(
            $('#dashboard-pie-chart-arrears-contact').attr('data-30-days')
        );
        var days_31_plus = parseFloat(
            $('#dashboard-pie-chart-arrears-contact').attr('data-31-days-plus')
        );
        var calc_total = parseFloat(
            $('#dashboard-pie-chart-arrears-contact').attr('data-calc-total')
        );
        var IncludeHiddenCharges = $('#includeHiddenChargesOptionContact').is(
            ':checked'
        );
        var anySectionIsPositive =
            days_7 > 0 || days_14 > 0 || days_30 > 0 || days_31_plus > 0
                ? true
                : false;
        var allSectionsAreNegative =
            days_7 <= 0 && days_14 <= 0 && days_30 <= 0 && days_31_plus <= 0
                ? true
                : false;

        $('#dashboard-pie-chart-arrears-legend-contact')
            .find('.days_7')
            .text(me.currencyWithCommas(days_7));
        $('#dashboard-pie-chart-arrears-legend-contact')
            .find('.days_14')
            .text(me.currencyWithCommas(days_14));
        $('#dashboard-pie-chart-arrears-legend-contact')
            .find('.days_30')
            .text(me.currencyWithCommas(days_30));
        $('#dashboard-pie-chart-arrears-legend-contact')
            .find('.days_31_plus')
            .text(me.currencyWithCommas(days_31_plus));
        $('#dashboard-pie-chart-arrears-legend-contact')
            .parent()
            .find('.calc-total')
            .text(me.currencyWithCommas(calc_total));

        if (
            calc_total != 0 &&
            (anySectionIsPositive || allSectionsAreNegative)
        ) {
            $('#arrears-no-data-pie-contact').hide();
        } else {
            $('#arrears-no-data-pie-contact').show(300);
        }

        if (days_7 == 0) {
            $('#dashboard-pie-chart-arrears-legend-contact')
                .find('.days_7')
                .parent()
                .find('.btn')
                .addClass('disabled');
        } else {
            $('#dashboard-pie-chart-arrears-legend-contact')
                .find('.days_7')
                .parent()
                .find('.btn')
                .removeClass('disabled');
        }

        if (days_14 == 0) {
            $('#dashboard-pie-chart-arrears-legend-contact')
                .find('.days_14')
                .parent()
                .find('.btn')
                .addClass('disabled');
        } else {
            $('#dashboard-pie-chart-arrears-legend-contact')
                .find('.days_14')
                .parent()
                .find('.btn')
                .removeClass('disabled');
        }

        if (days_30 == 0) {
            $('#dashboard-pie-chart-arrears-legend-contact')
                .find('.days_30')
                .parent()
                .find('.btn')
                .addClass('disabled');
        } else {
            $('#dashboard-pie-chart-arrears-legend-contact')
                .find('.days_30')
                .parent()
                .find('.btn')
                .removeClass('disabled');
        }

        if (days_31_plus == 0) {
            $('#dashboard-pie-chart-arrears-legend-contact')
                .find('.days_31_plus')
                .parent()
                .find('.btn')
                .addClass('disabled');
        } else {
            $('#dashboard-pie-chart-arrears-legend-contact')
                .find('.days_31_plus')
                .parent()
                .find('.btn')
                .removeClass('disabled');
        }

        if (calc_total == 0) {
            $('#dashboard-pie-chart-arrears-legend-contact')
                .find('.calc-total')
                .parent()
                .find('.arrears-action-arrears')
                .addClass('disabled');
        } else {
            $('#dashboard-pie-chart-arrears-legend-contact')
                .find('.calc-total')
                .parent()
                .find('.arrears-action-arrears')
                .removeClass('disabled');
        }

        if (calc_total == 0) {
            $('#dashboard-pie-chart-arrears-legend-contact')
                .find('.calc-total')
                .parent()
                .find('.arrears-action-batch')
                .addClass('disabled');
        } else {
            $('#dashboard-pie-chart-arrears-legend-contact')
                .find('.calc-total')
                .parent()
                .find('.arrears-action-batch')
                .removeClass('disabled');
        }

        // Truns out that when all values are -ve, pie charts will render.
        // But ONLY if all are -ve
        if (!allSectionsAreNegative) {
            if (days_7 < 0) {
                days_7 = 0;
            }
            if (days_14 < 0) {
                days_14 = 0;
            }
            if (days_30 < 0) {
                days_30 = 0;
            }
            if (days_31_plus < 0) {
                days_31_plus = 0;
            }
        }

        var data = [
            { label: '0 - 7 Days', data: days_7, color: '#5db2ff' },
            { label: '8 - 14 Days', data: days_14, color: '#fb6e52' },
            { label: '15 - 30 Days', data: days_30, color: '#a0d468' },
            { label: '31+ Days', data: days_31_plus, color: '#ffce55' }
        ];

        $.plot('#dashboard-pie-chart-arrears-contact', data, {
            series: {
                pie: {
                    innerRadius: 0.5,
                    show: true,
                    label: {
                        show: false,
                        threshold: 1
                    }
                }
            },
            grid: {
                hoverable: !IncludeHiddenCharges,
                clickable: !IncludeHiddenCharges
            },
            legend: {
                show: false
            }
        });

        $('#dashboard-pie-chart-arrears-contact')
            .off('plotclick')
            .on('plotclick', function (event, pos, obj) {
                if (!obj) {
                    return;
                }

                var series = obj.series.label;
                var sectionId = 0;

                switch (series) {
                    case '0 - 7 Days': {
                        sectionId = 0;
                        break;
                    }

                    case '8 - 14 Days': {
                        sectionId = 1;
                        break;
                    }

                    case '15 - 30 Days': {
                        sectionId = 2;
                        break;
                    }

                    case '31+ Days': {
                        sectionId = 3;
                        break;
                    }
                }

                new gmgps.cloud.ui.views.batchChaseArrearsHandler({
                    branchIds: me.branchIds,
                    userId: me.userId,
                    sectionId: sectionId,
                    sourceId: me.ArrearsListSource.Contact
                }).show();
            });
        $('#dashboard-pie-chart-arrears-contact').css('cursor', 'pointer');
    },

    displayArrearsTable: function (arrearsSource, sectionId) {
        var me = this;

        new gmgps.cloud.ui.views.batchPayArrearsHandler({
            branchIds: me.branchIds,
            userId: me.userId,
            sectionId: sectionId,
            sourceId: arrearsSource,
            title: 'Arrears',
            onComplete: function () {
                me.refreshAll();
            },
            onCancel: function () {
                me.refreshAll();
            }
        }).show();
    },

    // NEW WORKS ORDERS CHART
    refreshNewWorksPie: function () {
        var me = this;

        // Currently using the jQuery Ajax call because our gmgps version redirects to
        // the logon page every time for some reason. Minor changes here once time to resolve.

        $.ajax({
            url: '/PMHome/GetNewWorksOrdersChartData',
            data: {
                branchIds: me.branchIds,
                propertyManagerIds: me.propertyManagerIds
            },
            type: 'post',
            cache: false,
            dataType: 'json',
            headers: {
                'X-Component-Name': 'pmHome-dashboard-refreshNewWorksPie',
                'Alto-Version': alto.version
            },
            success: function (response) {
                if (!response) {
                    return;
                }

                $('#dashboard-pie-chart-new-works-orders').attr(
                    'data-urgent',
                    response.Urgent
                );
                $('#dashboard-pie-chart-new-works-orders').attr(
                    'data-high',
                    response.High
                );
                $('#dashboard-pie-chart-new-works-orders').attr(
                    'data-non-urgent',
                    response.NonUrgent
                );
                $('#dashboard-pie-chart-new-works-orders').attr(
                    'data-low',
                    response.Low
                );
                $('#dashboard-pie-chart-new-works-orders').attr(
                    'data-calc-total',
                    response.CalculatedTotal
                );

                me.drawNewWorksOrdersPie();
            }
        });
    },

    drawNewWorksOrdersPie: function () {
        var me = this;

        var urgent = parseInt(
            $('#dashboard-pie-chart-new-works-orders').attr('data-urgent')
        );
        var high = parseInt(
            $('#dashboard-pie-chart-new-works-orders').attr('data-high')
        );
        var low = parseInt(
            $('#dashboard-pie-chart-new-works-orders').attr('data-low')
        );
        var nonUrgent = parseInt(
            $('#dashboard-pie-chart-new-works-orders').attr('data-non-urgent')
        );
        var calc_total = parseInt(
            $('#dashboard-pie-chart-new-works-orders').attr('data-calc-total')
        );

        if (calc_total != 0) {
            $('#works-orders-no-data-pie').hide();
        } else {
            $('#works-orders-no-data-pie').show(300);
        }

        $('#dashboard-pie-chart-new-workd-legend').find('.high').text(high);
        $('#dashboard-pie-chart-new-workd-legend').find('.low').text(low);
        $('#dashboard-pie-chart-new-workd-legend').find('.urgent').text(urgent);
        $('#dashboard-pie-chart-new-workd-legend')
            .find('.non-urgent')
            .text(nonUrgent);
        $('#dashboard-pie-chart-new-workd-legend')
            .parent()
            .find('.calc-total')
            .text(calc_total);

        var $worksorders = me.$root.find(
            '#dashboard-pie-chart-new-workd-legend'
        );

        var $urgent = $worksorders.find('.urgent-row');
        var $high = $worksorders.find('.high-row');
        var $low = $worksorders.find('.low-row');
        var $nonurgent = $worksorders.find('.nonurgent-row');

        urgent ? $urgent.removeClass('disabled') : $urgent.addClass('disabled');
        high ? $high.removeClass('disabled') : $high.addClass('disabled');
        low ? $low.removeClass('disabled') : $low.addClass('disabled');
        nonUrgent
            ? $nonurgent.removeClass('disabled')
            : $nonurgent.addClass('disabled');

        var data = [
            { label: 'Urgent', data: urgent, color: '#d01a00' },
            { label: 'High', data: high, color: '#fb6e52' },
            { label: 'Low', data: low, color: '#ffce55' },
            { label: 'Non Urgent', data: nonUrgent, color: '#a0d468' }
        ];

        $.plot('#dashboard-pie-chart-new-works-orders', data, {
            series: {
                pie: {
                    innerRadius: 0.5,
                    show: true,
                    label: {
                        show: false,
                        threshold: 1
                    }
                }
            },
            grid: {
                hoverable: true,
                clickable: true
            },
            legend: {
                show: false
            }
        });

        $('#dashboard-pie-chart-new-works-orders')
            .off('plotclick')
            .on('plotclick', function (event, pos, obj) {
                if (!obj) {
                    return;
                }

                var series = obj.series.label;
                var sectionId = 0;

                switch (series) {
                    case 'Urgent': {
                        sectionId = 5;
                        break;
                    }

                    case 'High': {
                        sectionId = 6;
                        break;
                    }

                    case 'Low': {
                        sectionId = 7;
                        break;
                    }

                    case 'Non Urgent': {
                        sectionId = 8;
                        break;
                    }
                }

                me.loadModalReportTable(
                    $('#dashboard-pie-chart-new-works-orders').attr(
                        'data-report-id'
                    ),
                    sectionId,
                    'workorder-row'
                );
            });
    },

    // OUTSTANDING WORKS ORDERS CHART
    refreshOutstandingWorksPie: function () {
        var me = this;

        // Currently using the jQuery Ajax call because our gmgps version redirects to
        // the logon page every time for some reason. Minor changes here once time to resolve.

        $.ajax({
            url: '/PMHome/GetOutstandingwWorksOrdersChartData',
            data: {
                branchIds: me.branchIds,
                propertyManagerIds: me.propertyManagerIds
            },
            type: 'post',
            cache: false,
            dataType: 'json',
            headers: {
                'X-Component-Name': 'pmHome-dashboard-refreshOutstandingWorksPie',
                'Alto-Version': alto.version
            },
            success: function (response) {
                if (!response) {
                    return;
                }

                $('#dashboard-pie-chart-outstanding-works-orders').attr(
                    'data-unacknowledged',
                    response.Unacknowledged
                );
                $('#dashboard-pie-chart-outstanding-works-orders').attr(
                    'data-new-requests',
                    response.New
                );
                $('#dashboard-pie-chart-outstanding-works-orders').attr(
                    'data-quote-requested',
                    response.Requested
                );
                $('#dashboard-pie-chart-outstanding-works-orders').attr(
                    'data-supplier-instructed',
                    response.Instructed
                );
                $('#dashboard-pie-chart-outstanding-works-orders').attr(
                    'data-awaiting-invoice',
                    response.AwaitingInvoice
                );
                $('#dashboard-pie-chart-outstanding-works-orders').attr(
                    'data-on-hold',
                    response.OnHold
                );
                $('#dashboard-pie-chart-outstanding-works-orders').attr(
                    'data-calc-total',
                    response.CalculatedTotal
                );

                me.drawOutstandingWorksOrdersPie();
            }
        });
    },

    drawOutstandingWorksOrdersPie: function () {
        var me = this;

        var unacknowledged = parseInt(
            $('#dashboard-pie-chart-outstanding-works-orders').attr(
                'data-unacknowledged'
            )
        );
        var newRequests = parseInt(
            $('#dashboard-pie-chart-outstanding-works-orders').attr(
                'data-new-requests'
            )
        );
        var quoteRequested = parseInt(
            $('#dashboard-pie-chart-outstanding-works-orders').attr(
                'data-quote-requested'
            )
        );
        var supplierInstructed = parseInt(
            $('#dashboard-pie-chart-outstanding-works-orders').attr(
                'data-supplier-instructed'
            )
        );
        var awaitingInvoice = parseInt(
            $('#dashboard-pie-chart-outstanding-works-orders').attr(
                'data-awaiting-invoice'
            )
        );
        var onHold = parseInt(
            $('#dashboard-pie-chart-outstanding-works-orders').attr(
                'data-on-hold'
            )
        );
        var calc_total = parseInt(
            $('#dashboard-pie-chart-outstanding-works-orders').attr(
                'data-calc-total'
            )
        );

        if (calc_total != 0) {
            $('#outstanding-works-orders-no-data-pie').hide();
        } else {
            $('#outstanding-works-orders-no-data-pie').show(300);
        }

        var $worksorders = me.$root.find(
            '#dashboard-pie-chart-outstanding-works-orders-legend'
        );

        var $unacknowledged = $worksorders.find('.unacknowledged-row');
        var $newRequest = $worksorders.find('.new-row');
        var $quoteRequested = $worksorders.find('.requested-row');
        var $supplierInstructed = $worksorders.find('.instructed-row');
        var $awaitingInvoice = $worksorders.find('.awaiting-row');
        var $onHold = $worksorders.find('.hold-row');
        var $total = me.$root.find('#works-orders-outer-priority .total-row');

        if ($unacknowledged.length !== 0) {
            unacknowledged !== 0
                ? $unacknowledged.removeClass('disabled')
                : $unacknowledged.addClass('disabled');
            $unacknowledged.find('.unacknowledged').text(unacknowledged);
        }

        newRequests !== 0
            ? $newRequest.removeClass('disabled')
            : $newRequest.addClass('disabled');

        $newRequest.find('.new').text(newRequests);

        quoteRequested !== 0
            ? $quoteRequested.removeClass('disabled')
            : $quoteRequested.addClass('disabled');

        $quoteRequested.find('.requested').text(quoteRequested);

        supplierInstructed !== 0
            ? $supplierInstructed.removeClass('disabled')
            : $supplierInstructed.addClass('disabled');

        $supplierInstructed.find('.instructed').text(supplierInstructed);

        awaitingInvoice !== 0
            ? $awaitingInvoice.removeClass('disabled')
            : $awaitingInvoice.addClass('disabled');

        $awaitingInvoice.find('.awaiting').text(awaitingInvoice);

        onHold !== 0
            ? $onHold.removeClass('disabled')
            : $onHold.addClass('disabled');

        $onHold.find('.hold').text(onHold);

        calc_total !== 0
            ? $total.removeClass('disabled')
            : $total.addClass('disabled');

        $total.find('.calc-total').text(calc_total);

        var data;
        if ($unacknowledged.length !== 0) {
            data = [
                {
                    label: 'Unacknowledged',
                    data: unacknowledged,
                    color: '#7e3794'
                },
                { label: 'New Requests', data: newRequests, color: '#5db2ff' },
                {
                    label: 'Quote Requested',
                    data: quoteRequested,
                    color: '#fb6e52'
                },
                {
                    label: 'Supplier Instructed',
                    data: supplierInstructed,
                    color: '#e75b8d'
                },
                {
                    label: 'Awaiting Invoice',
                    data: awaitingInvoice,
                    color: '#a0d468'
                },
                { label: 'On Hold', data: onHold, color: '#ffce55' }
            ];
        } else {
            data = [
                { label: 'New Requests', data: newRequests, color: '#5db2ff' },
                {
                    label: 'Quote Requested',
                    data: quoteRequested,
                    color: '#fb6e52'
                },
                {
                    label: 'Supplier Instructed',
                    data: supplierInstructed,
                    color: '#e75b8d'
                },
                {
                    label: 'Awaiting Invoice',
                    data: awaitingInvoice,
                    color: '#a0d468'
                },
                { label: 'On Hold', data: onHold, color: '#ffce55' }
            ];
        }

        if ($('#dashboard-pie-chart-outstanding-works-orders').is(':visible')) {
            $.plot('#dashboard-pie-chart-outstanding-works-orders', data, {
                series: {
                    pie: {
                        innerRadius: 0.5,
                        show: true,
                        label: {
                            show: false,
                            threshold: 1
                        }
                    }
                },
                grid: {
                    hoverable: true,
                    clickable: true
                },
                legend: {
                    show: false
                }
            });
        }

        $('#dashboard-pie-chart-outstanding-works-orders')
            .off('plotclick')
            .on('plotclick', function (event, pos, obj) {
                if (!obj) {
                    return;
                }

                var series = obj.series.label;
                var sectionId = 0;

                switch (series) {
                    case 'New Requests': {
                        sectionId = 0;
                        break;
                    }

                    case 'Quote Requested': {
                        sectionId = 1;
                        break;
                    }

                    case 'Supplier Instructed': {
                        sectionId = 2;
                        break;
                    }

                    case 'Awaiting Invoice': {
                        sectionId = 3;
                        break;
                    }

                    case 'On Hold': {
                        sectionId = 4;
                        break;
                    }

                    case 'Unacknowledged': {
                        sectionId = 11;
                        break;
                    }
                }

                me.loadModalReportTable(
                    $('#dashboard-pie-chart-outstanding-works-orders').attr(
                        'data-report-id'
                    ),
                    sectionId,
                    'workorder-row'
                );
            });
    },

    // LANDLORDS TO PAY
    refreshLandlordsToPay: function () {
        var me = this;

        $.ajax({
            url: '/PMHome/GetLandlordsToPayData',
            data: {
                branchIds: me.branchIds,
                userId: me.userId
            },
            type: 'post',
            dataType: 'json',
            cache: false,
            headers: {
                'X-Component-Name': 'pmHome-dashboard-refreshLandlordsToPay',
                'Alto-Version': alto.version
            },
            success: function (response) {
                if (!response) {
                    return;
                }

                $('#landlords-to-pay').attr(
                    'data-value-currency',
                    response.ToPayCurrency
                );
                $('#landlords-to-pay').attr(
                    'data-value-count',
                    response.ToPayCount
                );

                me.drawLandlordsToPay();
            }
        });
    },

    drawLandlordsToPay: function () {
        var me = this;
        var value_currency = parseFloat(
            $('#landlords-to-pay').attr('data-value-currency')
        );
        var value_count = parseInt(
            $('#landlords-to-pay').attr('data-value-count')
        );

        if (value_count > 0) {
            $('#landlords-to-pay').removeClass('disabled');
        } else {
            $('#landlords-to-pay').addClass('disabled');
        }

        $('#landlords-to-pay').find('.value-count').text(value_count);
        $('#landlords-to-pay')
            .find('.value-currency')
            .text(me.currencyWithCommas(value_currency));
    },

    // UNALLOCATED CREDITS
    refreshUnallocatedCredits: function () {
        var me = this;

        $.ajax({
            url: '/PMHome/GetUnallocatedCreditsData',
            data: {
                branchIds: me.branchIds,
                propertyManagerIds: me.propertyManagerIds
            },
            type: 'post',
            cache: false,
            dataType: 'json',
            headers: {
                'X-Component-Name': 'pmHome-dashboard-refreshUnallocatedCredits',
                'Alto-Version': alto.version
            },
            success: function (response) {
                if (!response) {
                    return;
                }

                $('#unallocated-credits').attr(
                    'data-value-currency',
                    response.CreditsCurrency
                );
                $('#unallocated-credits').attr(
                    'data-value-count',
                    response.CreditsCount
                );

                me.drawUnallocatedCredits();
            }
        });
    },

    drawUnallocatedCredits: function () {
        var me = this;
        var value_currency = parseFloat(
            $('#unallocated-credits').attr('data-value-currency')
        );
        var value_count = parseInt(
            $('#unallocated-credits').attr('data-value-count')
        );

        if (value_count > 0) {
            $('#unallocated-credits').removeClass('disabled');
        } else {
            $('#unallocated-credits').addClass('disabled');
        }

        $('#unallocated-credits').find('.value-count').text(value_count);
        $('#unallocated-credits')
            .find('.value-currency')
            .text(me.currencyWithCommas(value_currency));
    },

    // HEADLINE FIGURES
    refreshHeadlineFigures: function () {
        var me = this;

        var includeProposedTenancies = me.$root
            .find('#includeProposedTenancies .include-proposed')
            .hasClass('magenta');
        $.ajax({
            url: '/PMHome/GetHeadlineFiguresChart',
            data: {
                branchIds: me.branchIds,
                propertyManagerIds: me.propertyManagerIds,
                includeProposedTenancies: includeProposedTenancies
            },
            cache: false,
            type: 'post',
            dataType: 'json',
            headers: {
                'X-Component-Name': 'pmHome-dashboard-refreshHeadlineFigures',
                'Alto-Version': alto.version
            },
            success: function (response) {
                if (!response) {
                    return;
                }

                $('#summary-vacated-tenancy-charges').attr(
                    'data-counter',
                    response.VacatedTenancyCharges
                );
                $('#summary-expired-charges').attr(
                    'data-counter',
                    response.ExpiredCharges
                );
                $('#summary-monies-held').attr(
                    'data-counter',
                    response.MoniesHeldCurrency
                );
                $('#summary-monies-held-counter').attr(
                    'data-counter',
                    response.MoniesHeldCounter
                );
                $('#summary-outstanding-refunds').attr(
                    'data-counter',
                    response.OutstandingRefundsCurrency
                );
                $('#summary-outstanding-refunds-counter').attr(
                    'data-counter',
                    response.OutstandingRefundsCounter
                );
                $('#summary-deposits-not-registered').attr(
                    'data-counter',
                    response.DepositsNotRegistered
                );
                $('#summary-deposits-to-be-refunded').attr(
                    'data-counter',
                    response.DepositsNotRefunded
                );
                $('#summary-deposits-in-dispute').attr(
                    'data-counter',
                    response.DepositsInDispute
                );

                if (response.VacatedTenancyCharges > 0) {
                    $('#summary-vacated-tenancy-charges')
                        .closest('.databox-headline')
                        .removeClass('disabled');
                } else {
                    $('#summary-vacated-tenancy-charges')
                        .closest('.databox-headline')
                        .addClass('disabled');
                }

                if (response.ExpiredCharges > 0) {
                    $('#summary-expired-charges')
                        .closest('.databox-headline')
                        .removeClass('disabled');
                } else {
                    $('#summary-expired-charges')
                        .closest('.databox-headline')
                        .addClass('disabled');
                }

                if (response.MoniesHeldCounter > 0) {
                    $('#summary-monies-held-counter')
                        .closest('.databox-headline')
                        .removeClass('disabled');
                } else {
                    $('#summary-monies-held-counter')
                        .closest('.databox-headline')
                        .addClass('disabled');
                }

                if (response.OutstandingRefundsCounter > 0) {
                    $('#summary-outstanding-refunds-counter')
                        .closest('.databox-headline')
                        .removeClass('disabled');
                } else {
                    $('#summary-outstanding-refunds-counter')
                        .closest('.databox-headline')
                        .addClass('disabled');
                }

                if (response.DepositsNotRegistered > 0) {
                    $('#summary-deposits-not-registered')
                        .closest('.databox-headline')
                        .removeClass('disabled');
                } else {
                    $('#summary-deposits-not-registered')
                        .closest('.databox-headline')
                        .addClass('disabled');
                }

                if (response.DepositsNotRefunded > 0) {
                    $('#summary-deposits-to-be-refunded')
                        .closest('.databox-headline')
                        .removeClass('disabled');
                } else {
                    $('#summary-deposits-to-be-refunded')
                        .closest('.databox-headline')
                        .addClass('disabled');
                }

                if (response.DepositsInDispute > 0) {
                    $('#summary-deposits-in-dispute')
                        .closest('.databox-headline')
                        .removeClass('disabled');
                } else {
                    $('#summary-deposits-in-dispute')
                        .closest('.databox-headline')
                        .addClass('disabled');
                }

                me.drawHeadlineFigures();
                me.reflowHeadlineFigures();
            }
        });
    },

    drawHeadlineFigures: function () {
        var me = this;

        me.animateNumberCounts();
    },

    reflowHeadlineFigures: function () {
        var me = this;
        me.adjustHeadlineFontSize(me.$root.find('#summary-monies-held'));
        me.adjustHeadlineFontSize(
            me.$root.find('#summary-outstanding-refunds')
        );
    },

    adjustHeadlineFontSize: function ($target) {
        var iconWidth = 26; // inc padding
        var minFontSize = 10;
        var lockIconWidth =
            $target.closest('.databox-number .fa-lock').css('display') != 'none'
                ? 26
                : 0;

        $target.css('letter-spacing', 'inherit'); // reset letter spacing
        $target.css('font-size', '20px'); // reset font size

        var containerWidth = $target.closest('.databox-number').width();
        var currentFontSize = parseInt($target.css('font-size'), 10);

        var counterWidth =
            $target.closest('.databox-number').find('.pm-badge').outerWidth() +
            5; // 5px for margin
        var headlineWidth =
            $target.outerWidth() + iconWidth + counterWidth + lockIconWidth;
        var requiresReize = containerWidth < headlineWidth;

        if (requiresReize) {
            $target.css('letter-spacing', '-1px');
            headlineWidth =
                $target.outerWidth() + iconWidth + counterWidth + lockIconWidth;
            requiresReize = containerWidth < headlineWidth;
        }

        while (requiresReize && currentFontSize >= minFontSize) {
            currentFontSize--;
            $target.css('font-size', currentFontSize + 'px');
            headlineWidth = $target.outerWidth() + iconWidth + counterWidth;
            requiresReize = containerWidth < headlineWidth;
        }
    },

    // SUPPLIERS TO PAY
    refreshSupplierToPay: function () {
        var me = this;

        $.ajax({
            url: '/PMHome/GetSuppliersToPayData',
            data: {
                branchIds: me.branchIds,
                userId: me.userId
            },
            type: 'post',
            dataType: 'json',
            cache: false,
            headers: {
                'X-Component-Name': 'pmHome-dashboard-refreshSupplierToPay',
                'Alto-Version': alto.version
            },
            success: function (response) {
                if (!response) {
                    return;
                }

                $('#suppliers-to-pay').attr(
                    'data-supplier-count',
                    response.SupplierCount
                );
                $('#suppliers-to-pay').attr(
                    'data-payment-amount',
                    response.PaymentAmount
                );

                $('#suppliers-to-pay')
                    .find('.value-supplier-count')
                    .text(response.SupplierCount);
                var paymentAmount = parseFloat(response.PaymentAmount);

                $('#suppliers-to-pay')
                    .find('.value-payment-amount')
                    .text(me.currencyWithCommas(paymentAmount));

                if (response.SupplierCount > 0) {
                    $('#suppliers-supplier-count').removeClass('disabled');
                } else {
                    $('#suppliers-supplier-count').addClass('disabled');
                }

                if (response.PaymentAmount > 0) {
                    $('#suppliers-payment-amount').removeClass('disabled');
                } else {
                    $('#suppliers-payment-amount').addClass('disabled');
                }

                me.$root.find('.suppliers-to-pay-refresh').addClass('hidden');
                me.$root
                    .find('#suppliers-to-pay-caption')
                    .text('SUPPLIERS TO PAY');
                me.$root
                    .find('#suppliers-supplier-count')
                    .removeClass('hidden');
                me.$root
                    .find('#suppliers-payment-amount')
                    .removeClass('hidden');

                me.$suppliersToPayRefreshButton
                    .removeClass('on')
                    .find('.fa')
                    .removeClass('fa-spin');
            }
        });
    },

    currencyWithCommas: function (x) {
        return '£' + x.toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, '$1,');
    },


    getChartConfig: function (chartConfigId) {
        var me = this;
        return me.ChartConfigs[chartConfigId];
    },

    getDatePeriod: function (id, dateFrom, dateTo) {
        var from = new Date();
        from.setHours(0, 0, 0, 0);
        var to = new Date();
        to.setHours(23, 59, 59, 0);
        var dateRange = '';

        switch (id) {
            case C.ReportPeriodType.Unspecified: //Custom Date Range
                dateRange = '- {0} to {1}'.format(
                    dateFrom.toString('dd/MM/yy'),
                    dateTo.toString('dd/MM/yy')
                );
                from = dateFrom;
                to = dateTo;
                break;
            case C.ReportPeriodType.Today:
                dateRange = ' - Today';
                // from = from;
                // to = to;
                break;
            case C.ReportPeriodType.Yesterday:
                dateRange = ' - Yesterday';
                from = from.add({ days: -1 });
                to = from;
                break;
            case C.ReportPeriodType.Last2Days:
                dateRange = ' - Last 2 days';
                from = from.add({ days: -1 });
                // to = to;
                break;
            case C.ReportPeriodType.Last7Days:
                dateRange = ' - Last 7 days';
                from = from.add({ days: -6 });
                // to = to;
                break;
            case C.ReportPeriodType.Last14Days:
                dateRange = ' - Last 14 days';
                from = from.add({ days: -13 });
                // to = to;
                break;
            case C.ReportPeriodType.Last30Days:
                dateRange = ' - Last 30 days';
                from = from.add({ days: -29 });
                // to = to;
                break;
            case C.ReportPeriodType.Last3Months:
                dateRange = ' - Last 3 months';
                from = from.add({ months: -3 });
                // to = to;
                break;
            case C.ReportPeriodType.Last6Months:
                dateRange = ' - Last 6 months';
                from = from.add({ months: -6 });
                // to = to;
                break;
            case C.ReportPeriodType.Last12Months:
                dateRange = ' - Last 12 months';
                from = from.add({ months: -12 });
                // to = to;
                break;
            case C.ReportPeriodType.Last2Years:
                dateRange = ' - Last 2 years';
                from = from.add({ years: -2 });
                // to = to;
                break;
            case C.ReportPeriodType.LastCalendarMonth:
                var now = new Date();
                var month = now.getMonth();
                var year = now.getFullYear();

                if (month == 0) {
                    year += -1;
                    month = 12;
                }

                from = Date.parse(month + '/1/' + year);
                to = from.clone();
                to = to.moveToLastDayOfMonth();
                dateRange = ' - {0}'.format(to.toString('MMMM'));
                break;
            case C.ReportPeriodType.MonthToDate:
                from = from.moveToFirstDayOfMonth();
                // to = to;
                break;
            case C.ReportPeriodType.SaturdayToFriday:
                var day = (from.getDay() + 1) % 7; // make saturday = 0
                from = from.add({ days: -day });
                to = to.add({ days: 6 - day });
                break;
        }
        return { dateFrom: from, dateTo: to, dateRange: dateRange };
    },

    refreshNews: function () {
        var me = this;

        return (async function () {
            const getPersonalisationDataAsync = () =>
                new Promise((resolve) => {
                    gmgps.cloud.helpers.user.getPersonalisationData('pm-home-news-widget.rss', resolve);
                });

            const getRssFeedAsync = (feedId) =>
                new Promise((resolve) => {
                    new gmgps.cloud.http("dashboard-refreshNews").getView({
                        url: '/rss/getrssfeedbyid',
                        background: true,
                        args: { feedId },
                        onSuccess: resolve
                    });
                });

            var settings = await getPersonalisationDataAsync();
            var preselected = settings?.feed;
            var $select = me.$root.find('#pm-dashboard-rssNewsUrl');
            var $options = me.$root.find('#pm-dashboard-rssNewsUrl option');
            var $widgetBody = me.$root.find('#pmdashboard #dashboard-news-widget .list-container');

            if ($options.length === 0) {
                $widgetBody[0].innerHTML = "";
                return;
            }

            var feedId = $options.filter((i, o) => o.value === preselected).length
                ? preselected
                : $select.val();

            if (!feedId || isNaN(parseInt(feedId))) {
                feedId = 1;
            }

            var response = await getRssFeedAsync(feedId);
            $select.val(feedId);
            $widgetBody[0].innerHTML = response.Data;
            $widgetBody.scrollTop(0);
            $widgetBody.find('a').attr('target', '_blank');
        })();
    },

    saveNewsFeedUrl: function (id, title, callback) {
        gmgps.cloud.helpers.user.putPersonalisationData(
            'pm-home-news-widget.rss',
            {
                feed: id,
                name: title,
                interval: 0
            },
            false,
            callback
        );
    },

    refreshFollowUps: function () {
        var me = this;

        new gmgps.cloud.http("dashboard-refreshFollowUps").ajax(
            {
                args: {
                    branchIds: me.branchIds,
                    userId: me.userId,
                    dashboardFollowUpTypes: [
                        C.DashboardFollowUpType.GeneralTask,
                        C.DashboardFollowUpType.Appraisal,
                        C.DashboardFollowUpType.Viewing,
                        C.DashboardFollowUpType.Offer,
                        C.DashboardFollowUpType.Review,
                        C.DashboardFollowUpType.FinancialReferral
                    ],
                    dashboardFollowUpSubTypeExclusions: [],
                    sortOrder: C.SearchOrderType.Ascending,
                    searchPage: {
                        pageIndex: 1,
                        pageSize: 10
                    },
                    propertyRecordType: C.PropertyRecordType.Rent
                },
                background: true,
                cache: false,
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/pmhome/getdashboardfollowups'
            },
            function (response) {
                var total_followups = 0;

                $.each(response.Data, function (i, pagedList) {
                    var $container = me.$root.find(
                        '#dashboard-followups .list-container[data-dashboardfollowuptypeid="{0}"]'.format(
                            pagedList.DashboardFollowUpType
                        )
                    );
                    var $totalRows = me.$root.find(
                        '#dashboard-followups .list-totalrows[data-dashboardfollowuptypeid="{0}"]'.format(
                            pagedList.DashboardFollowUpType
                        )
                    );

                    total_followups += pagedList.PageInfo.TotalRows;

                    $container[0].innerHTML = pagedList.Html;

                    if (pagedList.PageInfo.TotalRows == 0) {
                        $totalRows.hide();
                    } else {
                        $totalRows
                            .show()
                            .removeClass('badge-info badge-danger')
                            .text(pagedList.PageInfo.TotalRows);
                    }
                });

                if (total_followups > 0) {
                    $('#pm-followups-total').text(total_followups).show();
                } else {
                    $('#pm-followups-total').hide().text('');
                }
            }
        );
    },

    refreshFollowUpList: function (
        pageIndex,
        dashboardFollowUpTypeId,
        exclusionOptionIds,
        sortOrderId
    ) {
        var me = this;

        new gmgps.cloud.http("dashboard-refreshFollowUpList").ajax(
            {
                args: {
                    branchIds: me.branchIds,
                    userId: me.userId,
                    dashboardFollowUpTypes: [dashboardFollowUpTypeId],
                    dashboardFollowUpSubTypeExclusions: exclusionOptionIds,
                    sortOrder: sortOrderId,
                    cache: false,
                    searchPage: {
                        pageIndex: pageIndex,
                        pageSize: 10
                    },
                    propertyRecordType: C.PropertyRecordType.Rent
                },
                background: true,
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/pmhome/getdashboardfollowups'
            },
            function (response) {
                var $container = me.$root.find(
                    '#dashboard-followups .list-container[data-dashboardfollowuptypeid="{0}"]'.format(
                        dashboardFollowUpTypeId
                    )
                );
                var $totalRows = me.$root.find(
                    '#dashboard-followups .list-totalrows[data-dashboardfollowuptypeid="{0}"]'.format(
                        dashboardFollowUpTypeId
                    )
                );

                var $body = $container.find('.dashboard-list-body');
                var $footer = $container.find('.dashboard-list-footer');

                var $new = $(response.Data[0].Html);
                var $newBody = $new.find('.dashboard-list-body');
                var $newFooter = $new.find('.dashboard-list-footer');

                $body.replaceWith($newBody);
                $footer.replaceWith($newFooter);

                if (response.Data[0].PageInfo.TotalRows == 0) {
                    $totalRows.hide();
                } else {
                    $totalRows
                        .show()
                        .removeClass('badge-info badge-danger')
                        .text(response.Data[0].PageInfo.TotalRows);
                }

                $container.find('.selectpicker').selectpicker();
            }
        );
    },

    loadNewLettings: function (page, listSubType) {
        var me = this;

        new gmgps.cloud.http("dashboard-loadNewLettings").getView({
            url: '/PMHome/GetTenancyList',
            post: true,
            args: {
                userid: me.userId,
                branchIds: me.branchIds,
                page: page,
                listSubType: listSubType,
                propertyManagerIds: me.propertyManagerIds
            },
            onSuccess: function (response) {
                var $listBody = $('#new-lettings').find('.dashboard-list-body');
                var $listContainer = $('#new-lettings').find('.dashboard-list');
                var $footer = $('#new-lettings').find('.dashboard-list-footer');

                $listBody.html(response.Data.Html);
                $listContainer.attr(
                    'data-pageindex',
                    parseInt(response.Data.PageInfo.PageIndex)
                );
                $footer.html(response.Data.NewPagerHtml);

                // $('#new-lettings-picker').val(listSubType);

                me.detectNewLettingsWidgetWidth();

                $listBody.scrollTop(0);

                me.animatePieCharts();
            }
        });
    },

    //BATCH PAY LANDLORDS
    batchLandlordPayments: function () {
        var me = this;
        new gmgps.cloud.ui.views.batchPayLandlordHandler({
            branchIds: me.branchIds,
            userId: me.userId,
            title: 'Landlord Payments',
            onComplete: function () {
                me.refreshLandlordsToPay();
                me.reDrawPieCharts();
            },
            onCancel: function () {
                setTimeout(function () {
                    me.refreshLandlordsToPay();
                    me.reDrawPieCharts();
                }, 2000);
            }
        }).show();
    },

    loadSuppliersToPay: function () {
        var me = this;

        new gmgps.cloud.ui.views.batchPaySuppliersHandler({
            branchIds: me.branchIds,
            userId: me.userId,
            title: 'Supplier Payments',
            onComplete: function () {
                setTimeout(function () {
                    me.refreshSupplierToPay();
                    me.reDrawPieCharts();
                }, 2000);
            },
            onCancel: function () {
                setTimeout(function () {
                    me.refreshSupplierToPay();
                    me.reDrawPieCharts();
                }, 2000);
            }
        }).show();
    }
};
