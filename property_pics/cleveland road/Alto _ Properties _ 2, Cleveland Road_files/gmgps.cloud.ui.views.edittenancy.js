gmgps.cloud.ui.views.edittenancy = function (args) {
    var me = this;

    me.$root = args.$root;
    me.$window = null;
    me.data = args.data;
    me.init(args);

    return this;
};

gmgps.cloud.ui.views.edittenancy.prototype = {
    init: function (args) {
        var me = this;

        me.$window = me.$root.closest('.window');
        me.$thirdButton = me.$window.find('.bottom .buttons .third-button');
        var propertyId = me.$window.find('#PropertyId').val();
        var appsDomain = me.$root.find('#_AppDomain').val();

        var status = parseInt(me.$root.find('#TenancyStatus').val());

        var enforceRequiredFields =
            me.$window.find('#EnforceRequiredFields').val().toLowerCase() ===
            'true';

        var locked = false;

        // cant save cancelled, ended tenancies, and active
        if (
            status === C.TenancyStatus.Cancelled ||
            status === C.TenancyStatus.Ended ||
            (status === C.TenancyStatus.Active && !enforceRequiredFields)
        ) {
            me.lock({
                all: true
            });
            me.$thirdButton.hide();
        } else if (status === C.TenancyStatus.Vacate) {
            // disable all inputs and selects, except the vacate date box
            me.$window
                .find('input,textarea,select')
                .not('.vacate')
                .removeClass('date-picker')
                .prop('readonly', 'readonly');
            locked = true;
            var openVoidSwitchingSettings = function () {
                window.open(appsDomain + '/properties/' + propertyId + '/void-switching/settings');
            };
            me.$window.find('.void-switching-link').on('click', openVoidSwitchingSettings);
            me.$thirdButton.on('click', openVoidSwitchingSettings);
        }

        // remove border from title bar
        var $top = me.$window.find('.top');

        $top.css('border', 'none');

        var hasAsbestos =
            me.$window.find('#Property_HasAsbestos').val().toLowerCase() ===
            'true';

        var requiresFixup =
            me.$window.find('#RequiresDataFixup').val().toLowerCase() ===
            'true';
        var notConvertedToPM =
            me.$window.find('#Tenancy_ConvertedToPM').val().toLowerCase() ===
            'false';

        if (requiresFixup && notConvertedToPM) {
            me.$window
                .find('.bottom .buttons .action-button')
                .after(
                    '<div class="finalise-button grey btn fr">Finalise</div>'
                );
            me.$window.on('click', '.finalise-button', function () {
                var $this = $(this);

                me.validate(function (success) {
                    if (success) {
                        me.$window.find('#Tenancy_ConvertedToPM').val('True');
                        $this.addClass('disabled');
                        setTimeout(function () {
                            me.$window.find('.action-button').trigger('click');
                        }, 250);
                    }
                });
            });
            me.promptDateRecalculate();
        }

        var finalising = args.data.finalise;

        var raisingCharges = args.data.raiseCharges;

        if (hasAsbestos) {
            var $warn = $(
                '<div class="bg-hazzard" style="top: 1px; width: 200px; text-align: right; right: 1px; position: absolute"><div class="fl icon-warning-small bg-white"></div><div class="fl fg-black ml5" style="line-height: 30px; font-size: 17px;"><span style="font-weight: bold;font-size: 18px">Warning</span> Asbestos</div></div>'
            );
            $top.append($warn);
        }

        var $status;

        if (finalising) {
            $status = $(
                '<div class="status fg-white" style="background-color: limegreen;">Finalise Let</div>'
            );
            me.$window.find('.top').append($status);
        } else if (raisingCharges) {
            $status = $(
                '<div class="status fg-white bg-tenancy" style="width: 90px;">Initial Invoice</div>'
            );
            me.$window.find('.top').append($status);
        }

        me.$root.find('select').customSelect(locked);

        // "Assured Periodic Tenancy" contract type UI toggle
        if (me.$root.find('#Tenancy_ContractType').length) {

            var $rowTerm = me.$root.find('.opt-inputmask-term-month').closest('.row');
            var $rowEndDate = me.$root.find('.end-date').closest('.row');
            var $rowRenewalDate = me.$root.find('.renewal-date').closest('.row');
            var $rowNoticeDate = me.$root.find('.notice-date').closest('.row');

            var applyPeriodicUI = function () {
                var contractTypeId = parseInt(me.$root.find('#Tenancy_ContractType').val(), 10);
                var enabled = contractTypeId === C.PropertyContractType.AssuredPeriodicTenancy ||
                              status === C.TenancyStatus.Periodic;

                $rowTerm.toggle(!enabled);
                $rowEndDate.toggle(!enabled);
                $rowRenewalDate.toggle(!enabled);
                $rowNoticeDate.toggle(!enabled);
                
                if (enabled) {
                    me.$root.find('#Tenancy_TermMonths').val('');
                    me.$root.find('#Tenancy_TermYears').val('');
                    me.$root.find('#Tenancy_EndDate').val('');
                    me.$root.find('#Tenancy_RenewalDate').val('');
                    me.$root.find('#Tenancy_NoticeDate').val('');
                }

                me.$root.find('#Tenancy_Rent').toggleClass(' validate[funcCall[validateRentalAmountForAPT[Property_PropertyRental_Price,Property_PropertyRental_RentalFrequency,Tenancy_RentalFrequency]]] ', contractTypeId === C.PropertyContractType.AssuredPeriodicTenancy);
            };

            me.$root
                .off('change.assuredPeriodic prog-change.assuredPeriodic', '#Tenancy_ContractType')
                .on('change.assuredPeriodic prog-change.assuredPeriodic', '#Tenancy_ContractType', applyPeriodicUI);

            applyPeriodicUI();
        }

        //Date Pickers
        me.$root.find('.date-picker').each(function (i, v) {
            $(v).datepicker({
                numberOfMonths: 2,
                showButtonPanel: true,
                dateFormat: 'dd/mm/yy',
                minDate:
                    $(v).attr('data-datePickerMode') === 'future'
                        ? new Date()
                        : null
            });
        });

        var symbol = me.$root.find('#CurrencySymbol').val();

        if (!locked || enforceRequiredFields) {
            me.$root.find('.opt-inputmask-numeric').inputmask('currency', {
                radixPoint: '.',
                groupSeparator: ',',
                digits: 2,
                autoGroup: true,
                prefix: symbol,
                rightAlign: false,
                allowMinus: false
            });

            me.$root.find('.opt-inputmask-term-month').inputmask('integer', {
                mask: '99',
                integerDigits: 2,
                rightAlign: false,
                clearIncomplete: false,
                repeat: 1,
                clearMaskOnLostFocus: false,
                integerOptional: false,
                insertMode: false,
                min: 0,
                max: 12,
                allowPlus: false,
                allowMinus: false
            });

            me.$root.find('.opt-inputmask-term-year').inputmask('integer', {
                mask: '99',
                integerDigits: 2,
                rightAlign: false,
                clearIncomplete: false,
                repeat: 1,
                clearMaskOnLostFocus: false,
                integerOptional: false,
                min: 0,
                max: 99,
                allowPlus: false,
                allowMinus: false
            });

            me.initTenantAC(me.$root.find('.tenant-ac'));

            me.$root.on(
                'click',
                '.tenants .tenant-list .tenant .remove',
                function () {
                    var $self = $(this);

                    var removeTenant = function () {
                        $self.closest('.tenant').remove();
                        me.updateTenancyAgreementName();
                    };

                    showDialog({
                        type: 'question',
                        title: 'Remove Tenant ?',
                        msg: 'Are you sure you would you like to remove this tenant ?',
                        buttons: {
                            Yes: function () {
                                removeTenant();
                                $(this).dialog('close');
                            },
                            No: function () {
                                $(this).dialog('close');
                            }
                        }
                    });
                }
            );

            me.$root.on('change', '.start-date.date-picker', function () {
                var startDate = me.$root
                    .find('.start-date.date-picker')
                    .datepicker('getDate');
                if (startDate) {
                    me.$root
                        .find('.first-rent-date .date-picker')
                        .datepicker('setDate', startDate);
                }
            });

            me.$root.on('change', '#Tenancy_RentalFrequency', function () {
                me.setRentItems();
                me.setDepositWarningStatus();
            });

            me.$root.on('keyup', '#Tenancy_Rent', function () {
                me.setRentItems();
                me.setDepositWarningStatus();
            });

            me.$root.on('click', '.amend-button', function () {
                me.$root
                    .find('#Tenancy_DepositRequested')
                    .prop('disabled', false);

                if (status !== C.TenancyStatus.Periodic) {
                    me.$root
                        .find('#Tenancy_DepositScheme')
                        .data('disabled', false)
                        .customSelect();
                }
            });

            me.$root.on('keyup', '#Tenancy_DepositRequested', function () {
                // eslint-disable-next-line no-useless-escape
                var deposit = parseFloat(me.$root.find('#Tenancy_DepositRequested').val().replace(/[^\d\.]/g, ''));
                me.$root.find('#DepositRequested').val(deposit);
                me.setDepositWarningStatus();
            });

            me.$root.on('change', '#Tenancy_DepositScheme', function (e) {
                var scheme = parseInt(e.target.value, 10);
                me.setUpDepositRequest(scheme);
                if (scheme === C.DepositSchemeType.HeldByLandlord) {
                    me.showLandlordDepositSchemePrompt();
                }
            });

            me.$root.on('click', '.info, .fa-warning', function () {
                new gmgps.cloud.ui.controls.window({
                    title: 'Deposit Information',
                    windowId: 'tenancyDepositInfoModal',
                    $content: me.$window.find('.deposit-popup'),
                    width: 400,
                    draggable: true,
                    modal: true,
                    cancelButton: 'Close',
                    onAction:
                        me.onComplete ||
                        function () {
                            return false;
                        },
                    onCancel:
                        me.onComplete ||
                        function () {
                            return false;
                        }
                });
            });

            me.$root.on(
                'click',
                '#deposit-calculator.fa-calculator',
                function () {
                    var rent =
                        gmgps.cloud.accounting.RentalCalculator.parseRent(
                            me.$root.find('#Tenancy_Rent').val()
                        );

                    new gmgps.cloud.ui.controls.window({
                        title: 'Deposit Calculator',
                        windowId: 'depositCalculatorModal',
                        controller: gmgps.cloud.ui.views.depositCalculator,
                        url: 'Tenancy/DepositCalculator',
                        urlArgs: {
                            rent: rent,
                            rentPerWeek: me.$root.find('#RentPerWeek').val(),
                            rentPerMonth: me.$root.find('#RentPerMonth').val(),
                            rentalFrequency: me.$root
                                .find('#Tenancy_RentalFrequency')
                                .val(),
                            currencySymbol: me.$root
                                .find('#CurrencySymbol')
                                .val()
                        },
                        post: true,
                        width: 300,
                        draggable: true,
                        modal: true,
                        cancelButton: 'Close',
                        actionButton: 'Update',
                        callback: function (calculatedDeposit) {
                            if (calculatedDeposit) {
                                me.$root
                                    .find('#Tenancy_DepositRequested')
                                    .val(calculatedDeposit);
                                me.$root
                                    .find('#DepositRequested')
                                    .val(calculatedDeposit);
                                me.setDepositWarningStatus();
                            }
                        },
                        onAction:
                            me.onComplete ||
                            function () {
                                return true;
                            },
                        onCancel:
                            me.onComplete ||
                            function () {
                                return false;
                            }
                    });
                }
            );

            me.$root.on('change', '.tenants .tenant .head-tenant', function () {
                var $this = $(this);
                var $tenants = me.$root.find('.tenants .tenant');

                // update the hidden for each
                $tenants.find('.leadTenantHidden').val('false');

                if ($this.prop('checked')) {
                    $tenants
                        .find('.head-tenant')
                        .not($this)
                        .prop('checked', false)
                        .trigger('prog-change');
                    $this
                        .closest('.tenant')
                        .find('.leadTenantHidden')
                        .val('true');
                }

                me.updateTenancyAgreementName();
            });

            me.$root.on('change', '.tenancy .datechange', function () {
                me.promptDateRecalculate();
            });

            me.setUpDepositRequest(
                me.$root.find('#Tenancy_DepositScheme').asNumber()
            );
        }

        me.setDepositWarningStatus();
    },

    promptDateRecalculate: function () {
        var me = this;

        // never recalc replacement terms, the inherit end dates from the last term instead
        if (me.$root.find('#Tenancy_IsReplacementTerm').val() === 'True')
            return;

        var $endDate = me.$root.find('#Tenancy_EndDate');
        var $noticeDate = me.$root.find('#Tenancy_NoticeDate');
        var $renewalDate = me.$root.find('#Tenancy_RenewalDate');

        var dates = me.getEndDates();

        if (dates != null) {
            if (
                $endDate.val() !== '' ||
                $noticeDate.val() !== '' ||
                $renewalDate.val() !== ''
            ) {
                showDialog({
                    type: 'question',
                    title: 'Tenancy Term Details Changed',
                    msg:
                        '<p>You already have dates for the Renewal, Notice to quit and Term end dates. Do you wish to change these dates as follows ?</p>' +
                        '<table>' +
                        '<tr><td class="bold">Date</td><td class="bold">From</td><td class="bold">To</td>' +
                        '<tr><td>{0}</td><td>{1}</td><td>{2}</td></tr>'.format(
                            'Renewal date',
                            $renewalDate.val(),
                            dates.renewalDate
                        ) +
                        '<tr><td>{0}</td><td>{1}</td><td>{2}</td></tr>'.format(
                            'Notice to quit date',
                            $noticeDate.val(),
                            dates.noticeDate
                        ) +
                        '<tr><td>{0}</td><td>{1}</td><td>{2}</td></tr>'.format(
                            'End date',
                            $endDate.val(),
                            dates.endDate
                        ) +
                        '</table>',
                    buttons: {
                        Yes: function () {
                            $(this).dialog('close');
                            me.recalculateEndDates(dates);
                        },
                        No: function () {
                            $(this).dialog('close');
                        }
                    }
                });
            } else {
                me.recalculateEndDates(dates);
            }
        } else {
            me.recalculateEndDates(null);
        }
    },

    getEndDates: function () {
        var me = this;

        var $months = me.$root.find('#Tenancy_TermMonths');
        var $years = me.$root.find('#Tenancy_TermYears');
        var $start = me.$root.find('#Tenancy_StartDate');

        var adjustmentDays = parseInt(
            me.$root.find('#RenewalDateAdjustmentDays').val()
        );
        var offsetEndDate =
            me.$root
                .find('#CalculateEndDate')
                .val()
                .toString()
                .toLowerCase() === 'true';

        var monthsInt = parseInt($months.val(), 10) || 0;
        var yearsInt = parseInt($years.val(), 10) || 0;

        var startDate = $start.val();

        if (monthsInt === 0 && yearsInt === 0) return null;

        return gmgps.cloud.helpers.tenancy.getTenancyDates(
            startDate,
            monthsInt,
            yearsInt,
            adjustmentDays,
            offsetEndDate
        );
    },

    recalculateEndDates: function (dates) {
        var me = this;

        if (dates != null) {
            me.$root.find('.renewal-date').val(dates.renewalDate);
            me.$root.find('.end-date').val(dates.endDate);
            me.$root.find('.notice-date').val(dates.noticeDate);
        } else {
            me.$root.find('.renewal-date').val('');
            me.$root.find('.end-date').val('');
            me.$root.find('.notice-date').val('');
        }
    },

    setUpDepositRequest: function (scheme) {
        var me = this;

        var isNoDepositHeld = scheme === C.DepositSchemeType.NoDepositHeld || scheme === C.DepositSchemeType.ZeroDeposit || scheme === C.DepositSchemeType.Reposit;
        var flatfairNoDeposit = scheme === C.DepositSchemeType.FlatfairNoDeposit;

        var depositRequested = me.$root.find('#Tenancy_DepositRequested');
        var depositScheme = me.$root.find('#Tenancy_DepositScheme');

        if (depositScheme.data('disabled') === true) {
            depositScheme.customSelect(true);
        }

        depositRequested.prop('readonly', isNoDepositHeld);
        depositRequested.prop('no_readonly_null', flatfairNoDeposit);

        if (isNoDepositHeld) {
            depositRequested.val(0);
        }
    },

    lock: function (args) {
        var me = this;

        //Whole form.
        if (args.all === true) {
            me.$window.find('.middle .read-only').show();
            me.$window.find('.bottom .action-button').hide();
        }
    },

    getTenantListItem: function (contactId) {
        var deferred = $.Deferred();

        new gmgps.cloud.http("editTenancy-getTenantListItem").ajax(
            {
                args: {
                    contactId: contactId
                },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/tenancy/gettenantlistitem'
            },
            function (response) {
                deferred.resolve(response.Data);
            },
            function () {
                deferred.resolve(false);
            }
        );

        return deferred;
    },

    getTenantEditAllowed: function (tenancyId) {
        var deferred = $.Deferred();

        new gmgps.cloud.http("editTenancy-getTenantEditAllowed").ajax(
            {
                args: {
                    tenancyId: tenancyId
                },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/tenancy/CanEditTenant'
            },
            function (response) {
                deferred.resolve(response.Data);
            },
            function () {
                deferred.resolve(false);
            }
        );

        return deferred;
    },

    addTenant: function (contactId) {
        var me = this;

        var $existingTenant = me.$root.find(
            '.tenants .tenant-list .tenant[data-id="{0}"]'.format(contactId)
        );

        if ($existingTenant.length > 0) {
            showInfo('The selected contact is already a tenant');
            return false;
        }

        $.when(me.getTenantListItem(contactId)).done(function (d) {
            if (d) {
                var $item = $(d);
                me.$root.find('.tenants .tenant-list').append($item);

                me.updateTenancyAgreementName();
            }
        });

        return true;
    },

    updateTenancyAgreementName: function () {
        var me = this;

        var leadTenant = null;
        var otherTenants = [];

        me.$root.find("input[name='TenancyAgreementName']").each(function () {
            var isLeadTenant = $(this).siblings("input[name='Tenancy.Tenants[].LeadTenant']").val().toLowerCase();
            if (isLeadTenant === 'true') {
                leadTenant = $(this).val();
            } else {
                otherTenants.push($(this).val());
            }
        });

        var agreementName = [leadTenant, ...otherTenants].join(', ');

        me.$root.find('#Tenancy_AgreementName').val(agreementName);
    },

    initTenantAC: function ($e) {
        var me = this;

        var contactCreator = new gmgps.cloud.ui.views.quickCreateContact({
            settings: {
                Title: 'Create Tenant',
                CategoryId: C.ContactCategory.Client,
                NameDetails: true,
                AddressDetails: true,
                IntentionType: C.PropertyRecordType.Rent
            },
            onComplete: function (contactId) {
                if (contactId) {
                    me.addTenant(contactId);
                    return true;
                }
            }
        });

        $e.autoCompleteEx({
            modelType: C.ModelType.Contact,
            includeContacts: true,
            closeAfterSelect: false,
            includeUsers: false,
            allowCreate: true,
            search: {
                CategoryIdList: [C.ContactCategory.Client],
                ApplyFurtherFilteringtoIds: true
            },
            placeholder: 'Search for Tenant...',
            onSelected: function (args) {
                me.addTenant(args.id);
                return false;
            },
            createButtonHandler: function () {
                contactCreator.show(me.$window, { top: 107, left: 508 });
            }
        });
    },

    checkRenewalStartDate: function () {
        var me = this;

        var $deferred = $.Deferred();

        var isReplacementTerm =
            me.$root.find('#Tenancy_IsReplacementTerm').val() === 'True';
        var isRenewal =
            parseInt(me.$root.find('#Tenancy_StatusId').val()) ===
            C.TenancyStatus.Renewal;
        var previousTermEndDate = me.$root.find('#PreviousTermEndDate').val();

        if (isReplacementTerm) return $deferred.resolve(true);
        if (!isRenewal) return $deferred.resolve(true);
        if (!previousTermEndDate) return $deferred.resolve(true);

        var newStartDate = me.$root.find('#Tenancy_StartDate').val();

        if (
            !moment(newStartDate, 'DD-MM-YYYY').isBefore(
                moment(previousTermEndDate, 'DD-MM-YYYY')
            )
        ) {
            return $deferred.resolve(true);
        }

        showDialog({
            type: 'question',
            title: 'Tenancy Renewal Start Date',
            msg: 'Start date is before previous term end date! Is this a replacement term ?',
            buttons: {
                Yes: function () {
                    $(this).dialog('close');
                    me.$root.find('#Tenancy_IsReplacementTerm').val('True');
                    $deferred.resolve(true);
                },
                No: function () {
                    $(this).dialog('close');
                    $deferred.resolve(true);
                }
            }
        });

        return $deferred.promise();
    },

    displayFeesOrDepositWarning: function () {
        var me = this;
        var $deferred = $.Deferred();

        var statusId = parseInt(me.$root.find('#Tenancy_StatusId').val());

        if (
            statusId == C.TenancyStatus.Pending ||
            statusId == C.TenancyStatus.Periodic
        ) {
            if (me.needToDisplayFeesOrDepositDialog()) {
                var dialogData = me.getFeesAndDepositWarningDialogTitles(
                    C.TenancyEventStatus.RaiseInitalCharges
                );

                showDialog({
                    type: dialogData.DialogType,
                    title: dialogData.Title,
                    msg: dialogData.Message,
                    buttons: {
                        Continue: function () {
                            $(this).dialog('close');
                            $deferred.resolve(true);
                        },
                        Cancel: function () {
                            $(this).dialog('close');
                            $deferred.resolve(false);
                        }
                    }
                });
            } else {
                return $deferred.resolve(true);
            }
        } else {
            return $deferred.resolve(true);
        }

        return $deferred.promise();
    },

    validate: function (onValidated) {
        var me = this;

        var $tenants = me.$root.find('.tenant-list .tenant');
        //Check that at least one applicant has been selected.
        // look for a row that isnt hidden that contains a data-id that isnt zero means we have at least one tenant
        if ($tenants.length === 0) {
            showInfo(
                'Please specify at least one tenant for the proposed tenancy.'
            );
            onValidated(false);
            return;
        }

        var allowTenantChanges =
            me.$root.find('#AllowTenantChanges').val().toLowerCase() === 'true';

        if (shell.pmInstalled && allowTenantChanges) {
            var tenancyId = parseInt(me.$root.find('#Tenancy_Id').val());
            allowTenantChanges = me.getTenantEditAllowed(tenancyId);
        }

        if (allowTenantChanges) {
            if ($tenants.find('.head-tenant:checked').length !== 1) {
                showInfo('Please specify the Lead Tenant.');
                onValidated(false);
                return;
            }
        }

        //Init validation engine.
        me.$root.addClass('opt-validate').validationEngine({ scroll: false });
        var valid = me.$root.validationEngine('validate');

        if (!valid) {
            onValidated(false);
            return;
        }

        var startDate = me.$root
            .find('.start-date.date-picker')
            .datepicker('getDate');
        var endDate = me.$root
            .find('.end-date.date-picker')
            .datepicker('getDate');
        var firstRentDate = me.$root
            .find('.first-rent-date .date-picker')
            .datepicker('getDate');
        if (
            firstRentDate !== null &&
            startDate !== null &&
            endDate !== null &&
            (firstRentDate < startDate || firstRentDate > endDate)
        ) {
            showInfo(
                'First Full Rent Date cannot be earlier than the Tenancy Start Date or after the End Date.'
            );
            onValidated(false);
            return;
        }

        me.checkRenewalStartDate().then(function (success) {
            if (success) {
                me.displayFeesOrDepositWarning().then(function (success) {
                    onValidated(success);
                    return;
                });
            } else {
                onValidated(false);
                return;
            }
        });
    },

    action: function (onComplete) {
        var me = this;

        me.validate(function (success) {
            if (!success) return true;

            //Func to save the tenancy form.
            var save = function () {
                me.$window.find('.action-button').lock();

                // Use Assured Periodic Tenancy contract type to save tenancy as periodic from the start.
                var createAsPeriodic =
                    me.data &&
                    me.data.finalise &&
                    me.$root.find('#Tenancy_ContractType').length &&
                    parseInt(me.$root.find('#Tenancy_ContractType').val(), 10) === C.PropertyContractType.AssuredPeriodicTenancy;

                var postUrl = createAsPeriodic
                    ? '/tenancy/createassuredperiodictenancy'
                    : '/tenancy/updatetenancy';

                var $form = createForm(me.$root, postUrl);

                if (
                    $form.find('#Tenancy_DepositScheme').asNumber() ===
                        C.DepositSchemeType.HeldByLandlord &&
                    me.landlordScheme
                ) {
                    var notes = $form.find('#LandlordDepositSchemeNotes');
                    notes.val(notes.val() + '\n' + me.landlordScheme);
                }

                reindexHtmlArray($form, '.tenant-list .tenant');

                // remove any disabled inputs so they get posted
                $form.find('input').prop('disabled', false);

                new gmgps.cloud.http("editTenancy-action").postForm(
                    $form,
                    function (response) {
                        me.$window.find('.action-button').unlock();

                        if (onComplete) {
                            onComplete();
                        }

                        if (me.data && me.data.onComplete) {
                            me.data.onComplete();
                        }

                        if (me.data && me.data.onFinalised) {
                            me.data.onFinalised(true);
                        }
                        // here we merge together any events returned from saving the tenancy with any events
                        // that were passed in from the Let-Agreed dialog, so we cant present them all at once

                        var combinedEvents = response.UpdatedEvents || [];

                        if (me.data && me.data.updatedEvents) {
                            combinedEvents = combinedEvents.concat(
                                me.data.updatedEvents
                            );
                        }
                        //Prompt for letters.
                        gmgps.cloud.helpers.general.promptForLetters({
                            eventHeaders: combinedEvents
                        });

                        // Display Change to Periodic UI
                        var status = parseInt(
                            me.$root.find('#TenancyStatus').val()
                        );

                        if (status === C.TenancyStatus.Periodic) {
                            //var firstTermTenancyId = parseInt(me.$root.find('#Tenancy_FirstTermTenancyId').val());
                            var newTermTenancyId = response.Data.TenancyId;
                            gmgps.cloud.ui.views.progression.prototype.updateTenancyEventProgression(
                                {
                                    action: 'change-periodic',
                                    historyEventId: 0,
                                    tenancyId: newTermTenancyId
                                }
                            );
                        }
                    },
                    function () {
                        me.$window.find('.action-button').unlock();
                    }
                );
            };

            save();
        });

        return true;
    },

    cancel: function (onComplete) {
        var me = this;

        me.$root.removeClass('opt-validate');
        onComplete();
    },

    setRentItems: function () {
        var me = this;

        var rentPerWeek =
            gmgps.cloud.accounting.RentalCalculator.calculateRentPerWeek(
                me.$root.find('#Tenancy_RentalFrequency').val(),
                me.$root.find('#Tenancy_Rent').val()
            );
        var rentPerMonth =
            gmgps.cloud.accounting.RentalCalculator.calculateRentPerMonth(
                me.$root.find('#Tenancy_RentalFrequency').val(),
                me.$root.find('#Tenancy_Rent').val()
            );

        if (
            parseInt(me.$root.find('#Tenancy_RentalFrequency').val()) ===
                C.Frequency.Weekly ||
            rentPerWeek === 0
        ) {
            me.$root.find('.rent-per-week').text('');
        } else {
            var symbol = me.$root.find('#CurrencySymbol').val();
            me.$root
                .find('.rent-per-week')
                .text(symbol + rentPerWeek.toFixed(2) + ' (Weekly)');
        }

        me.$root.find('#RentPerWeek').val(rentPerWeek);
        me.$root.find('#RentPerMonth').val(rentPerMonth);
    },

    showLandlordDepositSchemePrompt: function () {
        var me = this;
        showDialog({
            type: 'question',
            title: "Landlord's Deposit Scheme",
            dialogClass: 'monies-held-dialog',
            msg: '<label>Please provide details of the deposit scheme the landlord is using below:<textarea id="DepositSchemeDetails" rows="6" cols="100" style="width: 100%; height:100px; padding:5px;"></textarea></label>',
            buttons: {
                OK: function () {
                    var $el = $(this);
                    var description = $el.find('#DepositSchemeDetails');
                    me.landlordScheme = description.val();

                    $el.dialog('close');
                }
            },
            create: function (event) {
                var el = $(event.target);
                el.find('#DepositSchemeDetails').val(me.landlordScheme || '');
            }
        });
    },

    setDepositWarningStatus: function () {
        var me = this;

        if (
            me.needToDisplayFeesOrDepositDialog() &&
            me.heldDepositExceedsMaxPermitted()
        ) {
            me.$root
                .find('#deposit-info')
                .addClass('fa-warning')
                .addClass('fa')
                .removeClass('info');
            me.$root.find('#deposit-warning').show();

            var currencySymbol = me.$root.find('#CurrencySymbol').val();
            var maxDeposit = currencySymbol + me.getMaxPermittedDeposit();
            me.$root.find('#max-deposit-allowed').text(maxDeposit);
        } else {
            me.$root
                .find('#deposit-info')
                .removeClass('fa-warning')
                .removeClass('fa')
                .addClass('info');
            me.$root.find('#deposit-warning').hide();
        }
    },

    needToDisplayFeesOrDepositDialog: function () {
        var me = this;
        var requiresFeesWarning = getBoolean(
            me.$root.find('#RequiresFeesWarning')
        );
        var requiresDepositWarning =
            getBoolean(me.$root.find('#RequiresDepositWarning')) &&
            me.heldDepositExceedsMaxPermitted();
        return requiresDepositWarning || requiresFeesWarning;
    },

    getMaxPermittedDeposit: function () {
        var me = this;
        var weeklyRent =
            gmgps.cloud.accounting.RentalCalculator.calculateRentPerWeek(
                me.$root.find('#Tenancy_RentalFrequency').val(),
                me.$root.find('#Tenancy_Rent').val()
            );
        var maxPermitted =
            gmgps.cloud.accounting.RentalCalculator.calculateMaxPermittedDeposit(
                weeklyRent
            );
        return gmgps.cloud.accounting.RentalCalculator.roundDownDeposit(
            maxPermitted
        );
    },

    heldDepositExceedsMaxPermitted: function () {
        var me = this;
        var depositHeld = parseFloat(me.$root.find('#DepositRequested').val());
        return depositHeld > me.getMaxPermittedDeposit();
    },

    getFeesAndDepositWarningDialogTitles: function () {
        var me = this;

        var requiresFeesWarning = getBoolean(
            me.$root.find('#RequiresFeesWarning')
        );
        var requiresDepositWarning =
            getBoolean(me.$root.find('#RequiresDepositWarning')) &&
            me.heldDepositExceedsMaxPermitted();

        var currencySymbol = me.$root.find('#CurrencySymbol').val();
        var maxDeposit = currencySymbol + me.getMaxPermittedDeposit();

        var depositOnlyMessage =
            'In accordance with the Tenant Fees Act 2019, and based on the rent amount recorded on the tenancy details, you should not hold more than ' +
            maxDeposit +
            ' total deposit for this tenancy. Do you wish to continue?';
        var feesOnlyMessage =
            'You should ensure fees charged to the tenancy are in accordance with the Tenant Fees Act 2019. Do you wish to continue?';
        var combinedMessage =
            'In accordance with the Tenant Fees Act 2019:<br/><ul><li><b>&bull;</b> Based on the rent amount recorded on the tenancy details, you should not hold more than ' +
            maxDeposit +
            ' total deposit for this tenancy</li><li><b>&bull;</b> You should ensure tenancy fees comply</li></ul>';

        var message =
            requiresDepositWarning && requiresFeesWarning
                ? combinedMessage
                : requiresDepositWarning
                ? depositOnlyMessage
                : feesOnlyMessage;

        var dialogData = {
            Title: 'Tenant Fees Act 2019',
            Message: message,
            DialogType: 'warning'
        };

        return dialogData;
    }
};
