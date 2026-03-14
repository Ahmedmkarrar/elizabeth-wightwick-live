gmgps.cloud.ui.views.workorder = function (args) {
    var me = this;
    me.preventDoubleSubmit = true;
    me.cfg = args;
    me.$root = args.$root;

    me.$window = args.$window;

    // input containing workorder mask
    me.$workorder = me.$root.find('.opt-workorder');

    me.isSharingFunctionalityAvailable =
        me.$root
            .find('#SharingConfiguration_IsSharingFunctionalityAvailable')
            .val() === 'True';
    me.isWorkOrderSharingConfigurationEnabled =
        me.$root
            .find(
                '#SharingConfiguration_IsWorkOrderSharingConfigurationEnabled'
            )
            .val() === 'True';
    me.workOrderSharingState = me.$root
        .find('#SharingConfiguration_WorkOrderSharingState')
        .val();
    me.workOrderSharingStateAsString = me.$root
        .find('#SharingConfiguration_WorkOrderSharingStateAsString')
        .val();

    me.init(args);

    return this;
};

gmgps.cloud.ui.views.workorder.prototype = {
    init: function (args) {
        var me = this;

        me.params = args.data;

        me.isDirty = false;

        me.workOrderId = parseInt(me.$root.find('#WorkOrder_Id').val());

        me.$saveButton = me.$window.find('.bottom .buttons .action-button');

        me.$window
            .find('.bottom .buttons')
            .prepend(
                '<div id="email-btn" class="btn bgg-property" style="min-width: 100px; float: left;display:none;">Email Selected...</div>'
            );

        me.$root.on('keyup', 'input, textarea', function () {
            me.setDirty(true);
        });

        me.$root.on('change', 'select', function () {
            me.setDirty(true);
        });

        me.setupSharingFunctionality();

        me.$window
            .find('.bottom .buttons .action-button')
            .after(
                '<div class="preview-button btn fr hidden">Preview [OFF]</div>'
            );
        // add a print button
        me.$window
            .find('.bottom .buttons .preview-button')
            .before(
                '<div class="print-button bgg-property btn hidden" style="float:left">Print Document</div>'
            );

        me.$window.on('click', '.print-button', function () {
            me.printWorkOrderPreview(me.$root);
        });

        me.$window.on('click', '.preview-button', function () {
            if ($(this).hasClass('on')) {
                //Turn off preview mode.
                $(this).removeClass('on bgg-green').text('Preview [OFF]');
                me.$window
                    .find('.buttons .btn')
                    .not($(this))
                    .removeClass('disabled');

                me.$window.find('.buttons .btn.print-button').hide();

                me.$root
                    .find('#workorder-preview-layer')
                    .fadeOut(250, function () {
                        me.$root
                            .find('#workorder-preview-frame')
                            .contents()
                            .find('body')
                            .html('');
                    });
            } else {
                me.$window
                    .find('.buttons .btn:not(.hidden)')
                    .not($(this))
                    .addClass('disabled');
                //Turn on preview mode.
                $(this).addClass('on bgg-green').text('Preview [ON]');
                me.$window.find('.buttons .btn.print-button').show();

                me.$root.find('#workorder-preview-layer').show();

                me.previewWorkOrder(me.$root).done(function (r) {
                    var entityMap = {
                        '&': '&amp;',
                        '<': '&lt;',
                        '>': '&gt;',
                        '"': '&quot;',
                        "'": '&#39;',
                        '/': '&#x2F;'
                    };

                    var escapeHtml = function (string) {
                        // eslint-disable-next-line no-useless-escape
                        return String(string).replace(/[&<>"'\/]/g,
                            function (s) {
                                return entityMap[s];
                            }
                        );
                    };

                    if (r && r.Data) {
                        gmgps.cloud.helpers.general.openPublisher({
                            $target: me.$root.find('#workorder-preview-frame'),
                            settings: {
                                brandId: r.Data.BrandId,
                                branchId: r.Data.BranchId,
                                createNew: false,
                                isPreview: true,
                                forPrint: true,
                                forThumb: false,
                                isDraft: false,
                                testMode: true,
                                designMode: C.PublisherDesignMode.Document,
                                templateType:
                                    C.DocumentTemplateType.PublisherStationery,
                                templateId: r.Data.TemplateId,
                                printFormat: 0,
                                sampleDocumentContent: escapeHtml(
                                    r.Data.Content
                                )
                            }
                        });
                    }
                });
            }
        });

        me.$root.find('select').customSelect();

        me.$root.find('.date-picker').each(function (i, v) {
            $(v).datepicker({
                numberOfMonths: 2,
                showButtonPanel: true,
                dateFormat: 'dd/mm/yy',
                minDate:
                    $(v).attr('data-datePickerMode') == 'future'
                        ? new Date()
                        : null
            });
        });

        var $top = me.$window.find('.top');

        $top.css('border', 'none');

        var hasAsbestos =
            me.$window.find('#Property_HasAsbestos').val() === 'True';

        if (hasAsbestos) {
            var $warn = $(
                '<div class="bg-hazzard" style="top: 1px; width: 200px; text-align: right; right: 1px; position: absolute"><div class="fl icon-warning-small bg-white"></div><div class="fl fg-black ml5" style="line-height: 30px; font-size: 17px;"><span style="font-weight: bold;font-size: 18px">Warning</span> Asbestos</div></div>'
            );
            $top.append($warn);
        }

        me.$root.find('.opt-inputmask-numeric.currency').inputmask('currency', {
            radixPoint: '.',
            groupSeparator: ',',
            digits: 2,
            autoGroup: true,
            prefix: '£',
            rightAlign: false
        });

        me.$workorder.inputmask();

        me.$root.on('change', '.selected-mail', function () {
            var selected = me.$root.find(
                '.files-panel .selected-mail:checked'
            ).length;
            if (selected) {
                me.$window.find('#email-btn').show();
            } else {
                me.$window.find('#email-btn').hide();
            }
        });
        me.$window.on('click', '#email-btn', function () {
            var medias = me.$root
                .find('.files-panel .selected-mail:checked')
                .map(function (i, v) {
                    var $v = $(v).closest('.file-panel');

                    return {
                        ModelTypeId: C.ModelType.WorkOrder,
                        Id: $v.attr('data-id'),
                        Name: $v.find('#File_FileName').val(),
                        Caption: $v.find('#File_Caption').val(),
                        Category: 'WorkOrder',
                        FileTypeId: $v.find('#File_FileTypeId').val()
                    };
                })
                .get();

            gmgps.cloud.helpers.general.createEmail({
                Medias: medias,
                PropertyId: parseInt(
                    me.$root.find('#WorkOrder_PropertyId').val()
                ),
                WorkorderId: parseInt(me.$root.find('#WorkOrder_Id').val())
            });
        });

        me.$root.on('click', '.charge-btn:not(.disabled)', function () {
            $(this).lock();
            if (me.isDirty) {
                saveFirst($.proxy(createCharge, this));
                return;
            }
            createCharge.call(this);
        });

        me.$root.on('click', '.action-btn:not(.disabled)', function () {
            if (me.isDirty) {
                saveFirst(changeStatus);
                return;
            }
            changeStatus();
        });
        me.$root.on('click', '.instruct-btn:not(.disabled)', function () {
            if (me.isDirty) {
                saveFirst(supplierInstucted);
                return;
            }
            supplierInstucted();
        });

        me.$root.on('click', '.remove-media', function () {
            var $panel = $(this).closest('.file-panel');

            var confirmedClose = function () {
                $panel.remove();
                me.setDirty(true);
            };

            var itemId = parseInt($panel.attr('data-uploaded'));

            if (itemId !== 0) {
                // if upload worked this will be set to true, so ask to confirm to remove

                showDialog({
                    type: 'question',
                    title: 'Remove document from Works Order',
                    msg: 'Are you sure you would like to remove this document ?',
                    buttons: {
                        Yes: function () {
                            confirmedClose();
                            $(this).dialog('close');
                        },
                        No: function () {
                            $(this).dialog('close');
                        }
                    }
                });
            } else {
                confirmedClose();
            }
        });

        me.$root.on('click', '.cancel-supplier', function () {
            me.$root.find('#WorkOrder_ContactId').val(0);

            $(this).hide();

            me.$root.find('.select-supplier').show();
            me.$root.find('.chosen-supplier').attr('data-id', 0).text('');

            me.setActionButtonState();
            me.setChargeButtonState();

            me.setDirty(true);
        });

        me.$root.on('click', '.select-supplier', function () {
            var $this = $(this);

            var selectSupplier = new gmgps.cloud.ui.views.contactSelector({
                $root: me.$root,
                args: {
                    settings: {
                        categoryId: C.ContactCategory.Supplier,
                        selectedIdList: [],
                        allowAddContact: true,
                        selectByProvidedService: false,
                        serviceIdList: [],
                        serviceCategory:
                            C.ContactSelectorServiceType.Unspecified,
                        PreferredSupplierIdList: me.preferredSupplierIdList,
                        OrderByPreferredSupplierIdList: true,
                        Archived: C.ArchivedSelectionType.ActiveRecordsOnly
                    }
                }
            });

            selectSupplier.show({
                title: 'Select a Supplier',
                callback: function (contactId, selectedServiceId, contactName) {
                    // if  selected

                    if (contactId) {
                        var after = function () {
                            $this.hide();

                            me.$root
                                .find('#WorkOrder_ContactId')
                                .val(contactId);
                            me.$root.find('.cancel-supplier').show();
                            me.$root
                                .find('.chosen-supplier')
                                .attr('data-id', contactId)
                                .text(contactName)
                                .show();

                            me.setActionButtonState();
                            me.setChargeButtonState();

                            me.setDirty(true);
                        };

                        me.checkSupplierLiabilityInsuranceValid(
                            contactId,
                            function () {
                                after();
                            }
                        );
                    }
                }
            });
        });

        me.$root.on(
            'focus',
            '.ui-autocomplete-input:not(.property-ac):not(.contact-ac)',
            function () {
                $(this).autocomplete('search', '');
            }
        );

        me.$root.on('change', '#WorkOrder_Status', function () {
            me.setActionButtonState();
        });

        me.$root.find('.property-ac').autoCompleteEx({
            modelType: C.ModelType.Property,
            search: {
                Archived: C.ArchivedSelectionType.ActiveRecordsOnly,
                RecordType: C.PropertyRecordType.Rent,
                StatusIdList: [],
                ApplyFurtherFilteringtoIds: true
            },
            placeholder: 'Search for Property...',
            onSelected: function (res) {
                me.updatePropertyFields(res);
                me.setDirty(true);
            },
            onRemoved: function () {
                me.resetPropertyFields();
            }
        });

        // request initial values for property
        me.updatePropertyFields({
            id: parseInt(me.$root.find('#WorkOrder_PropertyId').val())
        });

        //ALTPM-425 lock supplier if Status is CompleteInvoicingReceived
        var statusId = parseInt(me.$root.find('#WorkOrder_Status').val());

        if (statusId === C.WorkOrderStatus.CompleteInvoicingReceived) {
            me.$root.find('.cancel-supplier').css('visibility', 'hidden');
        }

        me.initUploader(me.$root.find('.upload-file'));

        function saveFirst(callback) {
            showDialog({
                type: 'info',
                title: 'Information',
                msg: 'The works order needs to be saved to complete this action, save now?',
                buttons: {
                    Yes: function () {
                        var $this = $(this);

                        me.save(function (hasErrors, result) {
                            $this.dialog('close');
                            if (hasErrors === false) {
                                //successful save: create returns id, update returns boolean
                                var id = result.Data.worksOrderId;
                                var worksOrderSaved = result.Data.saved;
                                if (worksOrderSaved && id !== 0) {
                                    me.workOrderId = id;
                                    me.$root.find('#WorkOrder_Id').val(id);

                                    me.setDirty(false);
                                    if (callback) {
                                        callback();
                                    }
                                    return;
                                }
                            } //else window control will show error.
                        });
                    },
                    No: function () {
                        $(this).dialog('close');
                    }
                }
            });
        }

        function createCharge() {
            var $el = $(this);
            var workOrderId = parseInt(me.$root.find('#WorkOrder_Id').val());
            var propertyId = parseInt(
                me.$root.find('#WorkOrder_PropertyId').val()
            );
            var chargeId = parseInt($el.attr('data-chargeid'));
            chargeId = chargeId === undefined || isNaN(chargeId) ? 0 : chargeId;
            var showAsReadOnly = $el.attr('data-readonly') === 'True';
            var title = $el.data('chargetodesc');

            new gmgps.cloud.ui.views.editChargeHandler({
                linkedTypeId: C.ModelType.WorkOrder,
                linkedId: workOrderId,
                propertyId: propertyId,
                chargeType: C.ChargeType.SupplierExpense,
                chargeId: chargeId,
                readOnly: showAsReadOnly,
                chargeRaised: false,
                chargeCancelled: false,
                isWorkOrderCharge: true,
                title:
                    (chargeId > 0 && showAsReadOnly
                        ? 'View'
                        : chargeId > 0
                        ? 'Edit'
                        : 'Add') +
                    ' Charge for ' +
                    title,
                windowId: 'workorder_Charge',
                onCancel: function () {
                    $el.unlock();
                },
                onComplete: function (r) {
                    var chargeButton = me.$root.find('.charge-btn');
                    if (r.chargeId > 0) {
                        chargeButton.attr('data-chargeid', r.chargeId);
                        chargeButton.text('Edit charge');
                        me.$root
                            .find('.cancel-supplier')
                            .css('visibility', 'hidden');
                        me.$root
                            .find('#WorkOrder_Status')
                            .val(C.WorkOrderStatus.CompleteInvoicingReceived)
                            .trigger('change');
                        //.next('.customStyleSelectBox').find('span').html($('#WorkOrder_Status option:selected').text());
                    }
                    if (this.chargeRaised) {
                        chargeButton.attr('data-readonly', 'True');
                        chargeButton.text('View charge');
                    } else if (this.chargeCancelled) {
                        chargeButton.attr('data-readonly', 'False');
                        chargeButton.attr('data-chargeid', '0');
                        chargeButton.text('Add charge');
                    }

                    $el.unlock();
                }
            }).show();
        }

        function changeStatus() {
            var statusId = parseInt(me.$root.find('#WorkOrder_Status').val());
            var newStatusId = C.WorkOrderStatus.Unspecified;

            switch (statusId) {
                case C.WorkOrderStatus.NewRequest:
                    newStatusId = C.WorkOrderStatus.QuoteRequested;
                    break;

                case C.WorkOrderStatus.QuoteRequested:
                    newStatusId = C.WorkOrderStatus.SupplierInstructed;
                    break;
            }
            postStatus(newStatusId);
        }

        function supplierInstucted() {
            postStatus(C.WorkOrderStatus.SupplierInstructed);
        }

        function postStatus(newStatusId) {
            if (newStatusId) {
                var propertyId = parseInt(
                    me.$root.find('#WorkOrder_PropertyId').val()
                );
                var contactId = parseInt(
                    me.$root.find('#WorkOrder_ContactId').val()
                );

                var actionHandler =
                    new gmgps.cloud.ui.views.workorderActionsHandler({
                        newStatusId: newStatusId,
                        contactId: contactId,
                        propertyId: propertyId,
                        workOrderId: me.workOrderId
                    });

                actionHandler.updateStatus(function (r) {
                    me.cfg.closeMyWindow();

                    if (r && r.Data) {
                        gmgps.cloud.helpers.general.generateAccountingDocuments(
                            r.DocumentRequestIdList
                        );
                        gmgps.cloud.helpers.general.promptForLetters({
                            eventHeaders: r.UpdatedEvents
                        });
                    }
                });
            }
        }

        me.setUiForMaintenanceRequest();
        me.setSharingButtonState(me.getPropertyId());
    },

    unbindSharingButton: function () {
        var me = this;
        var sharingButtonElement = me.$window.find('#sharing-button');

        var sharingButton =
            new gmgps.cloud.ui.controls.WorkOrderSharingPreferencesButton(
                sharingButtonElement,
                {}
            );
        sharingButton.unbind();
    },

    setSharingButtonState: function (propertyId) {
        var me = this;

        var sharingButtonElement = me.$window.find('#sharing-button');
        if (propertyId !== 0) {
            sharingButtonElement.removeClass(
                'workorder-sharing-allowed workorder-sharing-notallowed workorder-sharing-none'
            );
            sharingButtonElement.addClass(
                'workorder-sharing-' +
                    me.workOrderSharingStateAsString.toLowerCase()
            );
            var desiredButtonText =
                me.workOrderSharingStateAsString === 'Allowed'
                    ? 'Shared'
                    : 'Share';
            sharingButtonElement
                .find('span[id=workorder-sharing-text]')
                .text(desiredButtonText);

            if (
                me.workOrderSharingStateAsString === 'Allowed' ||
                me.workOrderSharingStateAsString === 'NotAllowed'
            ) {
                sharingButtonElement.unlock();
            } else {
                sharingButtonElement.lock();
            }

            me.bindSharingButton();
        } else {
            sharingButtonElement.lock();
            me.unbindSharingButton();
        }
    },

    selectedTenancyHasChanged: function (updatedTenancyId) {
        var me = this;
        var selectedTenancy = me.$window
            .find('#WorkOrder_FirstTermTenancyId')
            .val();

        if (selectedTenancy && updatedTenancyId) {
            return selectedTenancy !== updatedTenancyId;
        }

        return false;
    },

    getPropertyId: function () {
        var me = this;
        return parseInt(me.$window.find('#WorkOrder_PropertyId').val());
    },

    setSharingButtonStyleAndText: function (updateModel, sharingButtonElement) {
        var me = this;
        var sharingPreferencesText = me.$window.find('#workorder-sharing-text');

        var sharingAllowedClass = 'workorder-sharing-allowed';
        var sharingNotAllowedClass = 'workorder-sharing-notallowed';

        if (!updateModel.sharedForLandlords && !updateModel.sharedForTenants) {
            sharingButtonElement.removeClass(sharingAllowedClass);
            sharingButtonElement.addClass(sharingNotAllowedClass);
            sharingPreferencesText.html('Share');
        } else {
            sharingButtonElement.removeClass(sharingNotAllowedClass);
            sharingButtonElement.addClass(sharingAllowedClass);
            sharingPreferencesText.html('Shared');
        }
    },

    bindSharingButton: function () {
        var me = this;
        var sharingButtonElement = me.$window.find('#sharing-button');

        var sharingDialogArgs = {
            id: me.workOrderId,
            isWorkOrderSharingConfigurationEnabled:
                me.isWorkOrderSharingConfigurationEnabled,
            getPropertyId: function () {
                return parseInt(me.$root.find('#WorkOrder_PropertyId').val());
            }
        };

        if (me.workOrderId === 0) {
            sharingDialogArgs.onSave = function (updateModel, onSuccess) {
                var selectedTenancyHasChanged = me.selectedTenancyHasChanged(
                    updateModel.selectedTenancyId
                );
                sharingDialogArgs.selectedTenancyHasChanged =
                    selectedTenancyHasChanged;
                sharingDialogArgs.updatedModel = updateModel;

                var sharingPreferences = me.$root.find(
                    '#WorkOrderSharingPreferences'
                );
                sharingPreferences.val(JSON.stringify(updateModel));

                me.setSharingButtonStyleAndText(
                    updateModel,
                    sharingButtonElement
                );

                var sharingButton =
                    new gmgps.cloud.ui.controls.WorkOrderSharingPreferencesButton(
                        sharingButtonElement,
                        sharingDialogArgs
                    );
                sharingButton.bind();

                if (onSuccess) {
                    onSuccess();
                }
            };
        } else {
            sharingDialogArgs.onSuccess = function (
                selectedTenancy,
                onSuccess
            ) {
                var selectedTenancyField = me.$root.find(
                    '#WorkOrder_FirstTermTenancyId'
                );
                selectedTenancyField.val(selectedTenancy);

                if (onSuccess) {
                    onSuccess();
                }
            };
        }

        var sharingButton =
            new gmgps.cloud.ui.controls.WorkOrderSharingPreferencesButton(
                sharingButtonElement,
                sharingDialogArgs
            );
        sharingButton.bind();
    },

    propertyHasBeenSelected: function () {
        var me = this;
        var propertyId = me.getPropertyId();
        if (propertyId !== 0) {
            return true;
        }

        return false;
    },

    setupSharingFunctionality: function () {
        var me = this;

        if (me.isSharingFunctionalityAvailable) {
            var buttonText =
                me.workOrderSharingState === 'Allowed' ? 'Shared' : 'Share';

            me.$window
                .find('.bottom .buttons')
                .prepend(
                    '<div id="sharing-button" class="btn sharing-button workorder-sharing-{0}" data-workorder-id="{2}" style="min-width: 70px; float: left;"><div class="icon"></div><span id="workorder-sharing-text">{1}</span></div>'.format(
                        me.workOrderSharingState.toLowerCase(),
                        buttonText,
                        me.workOrderId
                    )
                );
        }
    },

    setUiForMaintenanceRequest: function () {
        var me = this;

        var workOrderStatus = me.$window.find('#OriginalStatus').val();
        var isRejectedMaintenanceRequest =
            workOrderStatus === C.WorkOrderStatus.Rejected.toString();
        var isUnacknowledgedMaintenanceRequest =
            workOrderStatus ===
            C.WorkOrderStatus.UnacknowledgedRequest.toString();

        if (
            !isUnacknowledgedMaintenanceRequest &&
            !isRejectedMaintenanceRequest
        ) {
            return;
        }

        me.$root.find('.action-btn').hide();
        me.$window.find('.preview-button').hide();
        me.$root.find('.instruct-btn').hide();
        me.$root.find('.charge-btn').hide();

        if (me.cfg.windowConfiguration) {
            me.cfg.windowConfiguration.actionButton = 'Accept';
            me.cfg.windowConfiguration.onAction = function () {
                return false;
            };

            if (isUnacknowledgedMaintenanceRequest) {
                me.cfg.windowConfiguration.thirdButton = 'Reject';

                // move reject button to left of buttons row
                setTimeout(function () {
                    var $buttonsContainer = me.$window.find('.buttons');
                    var $thirdButton = me.$window.find('.third-button');
                    if (
                        $thirdButton.length > 0 &&
                        $buttonsContainer.length > 0
                    ) {
                        $buttonsContainer.prepend();
                        $thirdButton.css('float', 'left');
                    }
                }, 1);
            }
        }
    },

    setDirty: function (setDirty) {
        var me = this;

        if (setDirty) {
            if (!me.isDirty) {
                me.isDirty = true;
            }
        } else {
            if (me.isDirty) {
                me.isDirty = false;
            }
        }

        me.setSaveButtonState();
    },

    setSaveButtonState: function () {
        var me = this;

        if (me.isDirty) {
            me.$saveButton.removeClass('grey').addClass('bgg-property');
        } else {
            me.$saveButton.addClass('grey').removeClass('bgg-property');
        }
    },

    checkSupplierLiabilityInsuranceValid: function (contactId, onContinue) {
        var dateEventSearcher =
            new gmgps.cloud.ui.views.managementDatesSearcher({
                linkedTypeId: C.ModelType.Contact,
                linkedId: contactId
            });

        dateEventSearcher
            .find(C.ManagementDateType.PublicLiabilityInsurance)
            .done(function (d) {
                if (!d.Data) {
                    // no valid liability insurance found

                    showDialog({
                        type: 'info',
                        title: 'No Valid Public Liability Insurance',
                        msg: 'This supplier does not have an active Public Liability Insurance. Are you sure you would like to use this supplier ?',
                        buttons: {
                            Yes: function () {
                                onContinue();
                                $(this).dialog('close');
                            },
                            No: function () {
                                $(this).dialog('close');
                            }
                        }
                    });
                } else {
                    onContinue();
                }
            });
    },

    setActionButtonState: function () {
        var me = this;

        var originalStatusId = parseInt(me.$root.find('#OriginalStatus').val());
        var statusId = parseInt(me.$root.find('#WorkOrder_Status').val());
        var propertyId = parseInt(me.$root.find('#WorkOrder_PropertyId').val());
        var contactId = parseInt(me.$root.find('#WorkOrder_ContactId').val());

        var $actionButton = me.$root.find('.action-btn');
        var previewButton = me.$window.find('.preview-button');
        var $instructButton = me.$root.find('.instruct-btn');

        var text = '';
        var disabled = false;

        if (contactId === 0 || propertyId === 0) {
            disabled = true;
        }

        switch (statusId) {
            case C.WorkOrderStatus.NewRequest:
                text = 'Request Quote...';
                break;
            case C.WorkOrderStatus.Cancelled:
            case C.WorkOrderStatus.CompleteAwaitingInvoice:
            case C.WorkOrderStatus.CompleteInvoicingReceived:
            case C.WorkOrderStatus.OnHold:
                text = 'Instruct Supplier...';
                disabled = true;
                break;
            case C.WorkOrderStatus.SupplierInstructed:
                text = 'Instruct Supplier...';
                disabled = true;
                break;
            case C.WorkOrderStatus.QuoteRequested:
                text = 'Instruct Supplier...';
                break;
        }

        $actionButton.text(text);

        if (disabled) {
            $actionButton.addClass('disabled');
            $instructButton.addClass('disabled');
        } else {
            $actionButton.removeClass('disabled');
            $instructButton.removeClass('disabled');
        }

        if (statusId === C.WorkOrderStatus.QuoteRequested) {
            if (originalStatusId !== statusId) {
                previewButton.show();
            } else {
                previewButton.hide();
            }
        } else if (statusId === C.WorkOrderStatus.SupplierInstructed) {
            if (originalStatusId !== statusId) {
                previewButton.show();
            } else {
                previewButton.hide();
            }
        } else {
            previewButton.hide();
        }
    },

    setChargeButtonState: function () {
        var me = this;
        var historyEventId = parseInt(
            me.$root.find('#WorkOrder_HistoryEventId').val()
        );
        var propertyId = parseInt(me.$root.find('#WorkOrder_PropertyId').val());
        var contactId = parseInt(me.$root.find('#WorkOrder_ContactId').val());

        var $chargeButton = me.$root.find('.charge-btn');

        var text = 'Add Charge...';
        var disabled = false;

        if (contactId === 0 || propertyId === 0) {
            disabled = true;
        }

        if (historyEventId > 0) {
            text = 'Show Charge...';
        }

        $chargeButton.text(text);

        if (disabled) {
            $chargeButton.addClass('disabled');
        } else {
            $chargeButton.removeClass('disabled');
        }
    },

    resetPropertyFields: function () {
        var me = this;
        me.$root.find('#WorkOrder_PropertyId').val(0);
        me.$root.find('.tenant-names').text('');
        me.$root.find('#MaintenanceTypeDescription').text('');

        me.$root.find('#WorkOrder_ReportedByName').val('').autocomplete({
            source: []
        });
        me.$root.find('#WorkOrder_AccessByName').val('').autocomplete({
            source: []
        });
        me.$root.find('#WorkOrder_ChargeToName').val('').autocomplete({
            source: []
        });

        me.preferredSupplierIdList.length = 0;

        me.setDirty(true);

        me.setSharingButtonState(me.getPropertyId());
    },

    updatePropertyFields: function (args) {
        var me = this;

        if (args && args.id) {
            me.getPropertyDetails(args.id).done(handlePropertyDetails);
        } else {
            me.setActionButtonState();
        }

        function handlePropertyDetails(r) {
            if (r && r.Data) {
                var reportedByName, accessByName, chargeToName;

                me.$root.find('#WorkOrder_PropertyId').val(r.Data.Property.Id);
                me.$root
                    .find('#MaintenanceTypeDescription')
                    .text(r.Data.MaintenanceTypeDescription);
                me.preferredSupplierIdList = r.Data.PreferredSupplierIdList;

                if (r.Data.CurrentTenantNames) {
                    me.$root
                        .find('.tenant-names')
                        .text(r.Data.CurrentTenantNames);
                } else {
                    me.$root.find('.tenant-names').text('');
                }

                reportedByName = me.$root.find('#WorkOrder_ReportedByName');
                reportedByName.autocomplete(
                    autoCompleteOptions(
                        addExistingParty(
                            reportedByName,
                            r.Data.ReportingPartiesList
                        )
                    )
                );

                accessByName = me.$root.find('#WorkOrder_AccessByName');
                accessByName.autocomplete(
                    autoCompleteOptions(
                        addExistingParty(accessByName, r.Data.AccessPartiesList)
                    )
                );
                setDefaultValue(accessByName, {
                    modelId: r.Data.DefaultAccessPartyId,
                    modelType: r.Data.DefaultAccessPartyType
                });

                chargeToName = me.$root.find('#WorkOrder_ChargeToName');
                chargeToName.autocomplete(
                    autoCompleteOptions(
                        addExistingParty(
                            chargeToName,
                            r.Data.ChargeToPartiesList
                        )
                    )
                );
                setDefaultValue(chargeToName, {
                    modelId: r.Data.DefaultChargeToPartyId,
                    modelType: r.Data.DefaultChargeToPartyType
                });

                me.setActionButtonState();
                me.isWorkOrderSharingConfigurationEnabled =
                    r.Data.SharingConfiguration.IsWorkOrderSharingConfigurationEnabled;
                me.isSharingFunctionalityAvailable =
                    r.Data.SharingConfiguration.IsSharingFunctionalityAvailable;
                me.workOrderSharingState =
                    r.Data.SharingConfiguration.WorkOrderSharingState;
                me.workOrderSharingStateAsString =
                    r.Data.SharingConfiguration.WorkOrderSharingStateAsString;

                me.setSharingButtonState(r.Data.Property.Id);
            }
            return r;
        }

        function setDefaultValue($el, defaultValue) {
            if (
                me.workOrderId === 0 &&
                $el.val() === '' &&
                defaultValue.modelId
            ) {
                $.each($el.autocomplete('option', 'source'), function (i, s) {
                    var exists =
                        s.modelId === defaultValue.modelId &&
                        s.modelType === defaultValue.modelType;
                    if (exists) {
                        $el.val(s.value);
                        autoComplete_Selected(
                            { target: $el.get(0) },
                            { item: s }
                        );
                        return false;
                    }
                });
            }
        }

        function addExistingParty(element, list) {
            // add the existing entered text to the lists to allow it to be re-selectable via the autocomplete
            var input = element.val(),
                modelid,
                modeltype;
            if (input === '') return list;
            var exist = $.grep(list, function (obj) {
                return (
                    obj.Value.trim().toLowerCase() ===
                    input.trim().toLowerCase()
                );
            });

            if (exist.length === 0) {
                list.push({
                    Key: -1,
                    Value: input,
                    ContactRelationship: 0,
                    Active: true
                });
            } else {
                if (exist.length === 1 && exist[0].TypeId) {
                    modelid = element.siblings('.modelid');
                    modeltype = element.siblings('.modeltype');
                    if (!(modelid.val() && modeltype.val())) {
                        modelid.val(exist[0].Key);
                        modeltype.val(exist[0].TypeId);
                    }
                }
            }

            return list;
        }
        function autoCompleteOptions(datalist) {
            return {
                source: $.map(datalist, autoComplete_MapData),
                minLength: 0,
                select: autoComplete_Selected,
                close: autoComplete_Close,
                create: function () {
                    $(this).data('ui-autocomplete')._renderItem = function (
                        ul,
                        item
                    ) {
                        var title = '';
                        var vacated = '';
                        switch (item.relationship) {
                            case C.ContactRelationshipCategoryType.Landlord:
                                title = 'Landlord: ';
                                break;
                            case C.ContactRelationshipCategoryType.Tenant:
                                switch (item.status) {
                                    case C.TenancyStatus.Vacate:
                                        title = 'Vacating tenant: ';
                                        vacated = 'tenant-vacating';
                                        break;
                                    case C.TenancyStatus.Ended:
                                        title = 'Vacated tenant: ';
                                        vacated = 'tenant-vacated';
                                        break;
                                    default:
                                        title = 'Tenant: ';
                                        break;
                                }
                                break;
                        }

                        return $(
                            '<li class="model-{0} {3} ui-menu-item" title="{2}{1}"><a>{1}</a></li>'.format(
                                item.relationship,
                                item.label,
                                title,
                                vacated
                            )
                        )
                            .data('item.autocomplete', item)
                            .appendTo(ul);
                    };
                }
            };
        }

        function autoComplete_Close(e, ui) {
            var $el = $(e.target),
                exists = false;
            if (e.originalEvent && e.originalEvent.type === 'menuselect') {
                return;
            }
            if (ui && ui.item) {
                autoComplete_Selected(e, ui);
            } else {
                $.each($el.autocomplete('option', 'source'), function (i, s) {
                    exists = s.value === $el.val();
                    if (exists) {
                        autoComplete_Selected(e, { item: s });
                        return false;
                    }
                });
                if (!exists) {
                    autoComplete_Selected(e, { item: {} });
                }
            }
        }

        function autoComplete_Selected(e, d) {
            var $el = $(e.target);
            $el.siblings('.modelid').val(d.item.modelId);
            $el.siblings('.modeltype').val(d.item.modelType);
        }
        function autoComplete_MapData(dataItem) {
            return {
                value: dataItem.Value,
                label: dataItem.Value,
                modelId: dataItem.Key,
                modelType: dataItem.TypeId,
                relationship: dataItem.ContactRelationship,
                status: dataItem.Status
            };
        }
    },

    save: function (onComplete, specificUrl) {
        var url = null;

        var me = this;

        me.validate(function (success) {
            if (!success) {
                onComplete(true);
                return;
            }

            if (specificUrl) {
                url = specificUrl;
            } else {
                url = 'WorksOrder/Save';
            }

            var $form = createForm(me.$root, url);

            var sharingPreferencesStore = me.$root.find(
                '#WorkOrderSharingPreferences'
            );
            if (sharingPreferencesStore.val().length > 0) {
                var sharingPreferences = JSON.parse(
                    sharingPreferencesStore.val()
                );
                _.forOwn(sharingPreferences, function (value, key) {
                    $form.append(
                        '<input type="hidden" name="Sharing.{0}" value="{1}" />'.format(
                            key,
                            value
                        )
                    );
                });
            }

            me.reindexMedias($form);

            new gmgps.cloud.http("workorder-save").postForm(
                $form,
                function (r) {
                    // success

                    if (onComplete) {
                        onComplete(false, r);
                    }
                },
                function (f) {
                    //error
                    if (onComplete) {
                        onComplete(f);
                    }
                }
            );
        });
    },

    accept: function (onComplete) {
        var me = this;
        me.save(function () {
            var cancelCloseOfWindow = true; //handled below - don't want to call OnCancel handler
            onComplete(cancelCloseOfWindow);
            me.cfg.closeMyWindow();
        }, 'MaintenanceRequest/Accept');
    },

    reject: function (onComplete) {
        var me = this;
        me.save(function () {
            var cancelCloseOfWindow = true; //handled below - don't want to call OnCancel handler
            onComplete(cancelCloseOfWindow);
            me.cfg.closeMyWindow();
        }, 'MaintenanceRequest/Reject');
    },

    validate: function (onComplete) {
        var me = this;
        //Init validation engine.
        me.$root.addClass('opt-validate').validationEngine({
            scroll: false
        });
        if (!me.$root.validationEngine('validate')) {
            onComplete(false);
            return;
        }

        // only required when adding workorder

        var workorderId = parseInt(me.$root.find('#WorkOrder_Id').val());
        var branchId = parseInt(me.$root.find('#WorkOrder_BranchId').val());

        if (workorderId === 0) {
            // cant increase the value - only in admin
            var digits = parseInt(me.$workorder.inputmask('unmaskedvalue'));
            var allocatedDigits = parseInt(
                me.$root.find('#WorkOrder_WorkOrderSequenceNumber_LastId').val()
            );

            if (digits > allocatedDigits) {
                showInfo(
                    'You cannot increase the next allocated work order number here. Please do this in the admin section.',
                    'Next Workorder Number'
                );
                onComplete(false);
                return;
            }
            me.workorderAlreadyExists(branchId, me.$workorder.val()).done(
                function (r) {
                    if (r.Data) {
                        // already used

                        showDialog({
                            type: 'question',
                            title: 'Works order number already exists',
                            msg: 'This works order number already exists. Are you sure you would like to re-use it ?',
                            buttons: {
                                Yes: function () {
                                    onComplete(true);
                                    $(this).dialog('close');
                                },
                                No: function () {
                                    onComplete(false);
                                    $(this).dialog('close');
                                }
                            }
                        });
                    } else {
                        onComplete(true);
                    }
                }
            );
        } else {
            onComplete(true);
        }
    },

    action: function (onComplete) {
        var me = this;
        me.$window.find('.action-button').lock();

        var callback = function (res) {
            me.$window.find('.action-button').unlock();
            if (onComplete) {
                onComplete(res);
            }
        };

        var workOrderStatus = me.$window.find('#OriginalStatus').val();
        var isRejectedMaintenanceRequest =
            workOrderStatus === C.WorkOrderStatus.Rejected.toString();
        var isUnacknowledgedMaintenanceRequest =
            workOrderStatus ===
            C.WorkOrderStatus.UnacknowledgedRequest.toString();

        if (
            isRejectedMaintenanceRequest ||
            isUnacknowledgedMaintenanceRequest
        ) {
            me.accept(callback);
        } else {
            me.save(callback);
        }
    },

    action2: function (onComplete) {
        var me = this;
        me.$window.find('.third-button').lock();

        var callback = function (res) {
            me.$window.find('.third-button').unlock();
            if (onComplete) {
                onComplete(res);
            }
        };

        me.reject(callback);
    },

    reindexMedias: function ($form) {
        var subscript = 0;
        var groups = ['.files-panel .file-panel'];
        for (var group in groups) {
            var orderIndex = 1;
            $form.find(groups[group]).each(function (arrayIndex, value) {
                $(value)
                    .find('input.forindex')
                    .each(function (inputIndex, value) {
                        var name = $(value).attr('name');
                        name = name.replace('[]', '[' + subscript + ']');
                        $(value).attr('name', name);

                        if (name.indexOf('OrderIndex') !== -1) {
                            $(value).val(orderIndex);
                            orderIndex++;
                        }
                    });
                subscript++;
            });
        }
    },

    getPropertyDetails: function (id) {
        var me = this;

        return new gmgps.cloud.http("workorder-getPropertyDetails").ajax({
            args: {
                propertyId: id,
                worksOrderId: me.workOrderId
            },
            complex: true,
            dataType: 'json',
            type: 'post',
            url: '/WorksOrder/GetWorkOrderPropertyDetails'
        });
    },

    initUploader: function ($addButton) {
        var me = this;

        var branchId = parseInt(me.$root.find('#WorkOrder_BranchId').val());

        var uploader = new plupload.Uploader({
            runtimes: 'html5,flash,silverlight,html4',
            browse_button: $addButton.attr('id'),
            max_file_size: '2048mb',
            multipart: true,
            multi_selection: false,
            unique_names: false,
            url: '/Upload/AcceptFile',
            flash_swf_url: '/scripts/jquery/plugins/plupload/moxie.swf',
            silverlight_xap_url: '/scripts/jquery/plugins/plupload/moxie.xap',
            filters: [
                {
                    title: 'Document files',
                    extensions:
                        'doc,pdf,docx,rtf,txt,jpg,png,gif,xls,xlsx,xlw,jpeg,msg'
                }
            ]
        });

        uploader.init();

        uploader.bind('FilesAdded', function (up, files) {
            me.$root.find('.documents .upload-file').addClass('disabled');
            me.$saveButton.addClass('disabled');

            me.getFileUploadPanel(
                me.workOrderId,
                files[0].name,
                files[0].size
            ).done(function (r) {
                var $uploadPanel = $(r.Data);

                me.$root.find('.documents .files-panel').append($uploadPanel);

                up.settings.multipart_params = {
                    modelTypeId: C.ModelType.WorkOrder,
                    mediaTypeId: C.MediaType.Document, // ensures everything goes into private storage
                    branchId: branchId,
                    entityId: me.workOrderId,
                    originalFileName: files[0].name
                };

                up.$uploadPanel = $uploadPanel;

                //ensure new item visible
                me.$root.find('.documents .files-panel').animate(
                    {
                        scrollLeft: me.$root.find('.documents .files-panel')[0]
                            .scrollWidth
                    },
                    1000
                );

                setTimeout(function () {
                    up.start();
                }, 1000);
            });
        });

        uploader.bind('UploadProgress', function (up, file) {
            if (up.$uploadPanel) {
                up.$uploadPanel
                    .find('.progress .percent')
                    .css('width', file.percent + '%');
                up.$uploadPanel
                    .find('.progress .label')
                    .text(file.percent + '%');

                if (file.percent === 100) {
                    up.$uploadPanel.find('.progress').hide();
                    up.$uploadPanel.find('.processing').show();
                }
            }
        });

        uploader.bind('UploadComplete', function () {
            me.$root.find('.documents .upload-file').removeClass('disabled');
            me.$saveButton.removeClass('disabled');
        });

        uploader.bind('FileUploaded', function (up, file, info) {
            if (info.status !== 200) {
                var $info = $.parseJSON(info.response);

                if ($info.error) {
                    file.status = 4; // set pl upload STATUS.FAILED so we can exclude from completed successfully count
                    $.jGrowl($info.error, {
                        header: 'Error uploading a file',
                        theme: 'growl-contact',
                        sticky: true
                    });
                }
            }

            if (up.$uploadPanel) {
                if (info.status === 200) {
                    up.$uploadPanel.find('.remove-media').removeClass('hidden'); // let them cancel the selection always
                    up.$uploadPanel.find('.processing').hide();

                    var $html = $(info.response);

                    // indicate successful transfer
                    up.$uploadPanel.attr('data-uploaded', '1');

                    // update hiddens
                    up.$uploadPanel.find('.media-info').empty().html($html);
                    // set the temp url to allow link to new item
                    up.$uploadPanel
                        .find('.file-link')
                        .attr(
                            'href',
                            $html
                                .find(
                                    'input[name="WorkOrder.MediaItems[].Url"]'
                                )
                                .val()
                        );

                    up.$uploadPanel.find('.file-info').show();
                } else {
                    up.$uploadPanel.remove();
                }
            }
        });

        uploader.bind('Error', function (up, err) {
            // need to allow the close btn if we got as far as adding a new panel
            if (up.$uploadPanel) {
                up.$uploadPanel.find('.remove-media').removeClass('hidden');
            }

            switch (err.code) {
                case plupload.FILE_SIZE_ERROR:
                    alert('File is too large to upload.');
                    break;
                case plupload.FAILED:
                case plupload.FILE_DUPLICATE_ERROR:
                case plupload.FILE_EXTENSION_ERROR:
                case plupload.GENERIC_ERROR:
                case plupload.IO_ERROR:
                case plupload.SECURITY_ERROR:
                    alert(err.message);
                    break;

                case plupload.HTTP_ERROR: // progress bar will be visible here
                    if (up.$uploadPanel) {
                        up.$uploadPanel
                            .find('.progress .percent')
                            .css('width', '100%')
                            .addClass('error');
                        up.$uploadPanel
                            .find('.progress .label')
                            .addClass('err');
                        up.$uploadPanel.find('.processing').hide();
                        up.$uploadPanel
                            .find('.upload-failed')
                            .text(err.message + ':' + err.status)
                            .show();
                        break;
                    }
            }
        });
        return uploader;
    },

    getFileUploadPanel: function (id, fileName, fileSizeBytes) {
        return new gmgps.cloud.http("workorder-getFileUploadPanel").ajax({
            args: {
                workOrderId: id,
                fileName: fileName,
                fileSizeBytes: fileSizeBytes
            },
            complex: true,
            dataType: 'json',
            type: 'post',
            url: '/Property/GetWorkOrderUploadPanel'
        });
    },

    workorderAlreadyExists: function (branchId, workordernumber) {
        return new gmgps.cloud.http("workorder-workorderAlreadyExists").ajax({
            args: {
                branchId: branchId,
                workordernumber: workordernumber
            },
            complex: true,
            dataType: 'json',
            type: 'post',
            url: '/Property/WorkorderAlreadyAllocated'
        });
    },

    previewWorkOrder: function ($root) {
        var me = this;
        var url = '';

        switch (me.params.linkedTypeId) {
            case C.ModelType.Property:
                url = 'Property/PreviewWorkOrder';
                break;
            case C.ModelType.Contact:
                url = 'Contact/PreviewWorkOrder';
                break;
        }

        var $form = createForm($root, url);

        return new gmgps.cloud.http("workorder-previewWorkOrder").ajax({
            args: createForm($form).serializeObject(),
            complex: true,
            dataType: 'json',
            type: 'post',
            url: url
        });
    },

    printWorkOrderPreview: function ($root) {
        var me = this;
        var url = '';

        switch (me.params.linkedTypeId) {
            case C.ModelType.Property:
                url = 'Property/PrintWorkOrderPreview';
                break;
            case C.ModelType.Contact:
                url = 'Contact/PrintWorkOrderPreview';
                break;
        }

        var $form = createForm($root, url);

        return new gmgps.cloud.http("workorder-printWorkOrderPreview").ajax({
            args: createForm($form).serializeObject(),
            complex: true,
            dataType: 'json',
            type: 'post',
            url: url
        });
    }
};
