gmgps.cloud.ui.views.contact.paymentGroupHandler = function (args) {
    var me = this;
    me.id = args.id;
    me.$root = args.$root;
    me.defaultRemarks = null;
    me.init();
    return me;
};

gmgps.cloud.ui.views.contact.paymentGroupHandler.prototype = {
    init: function () {
        var me = this;

        me.$root.off();

        me.initSortable();

        me.$root.on('click', '.row .group-header .slideable', function () {
            me.rollUpDown($(this));
        });

        me.$root.on('click', '.row .configure:not(.disabled)', function () {
            var $row = $(this).closest('.row');
            openConfigureGroupWindow(
                $row.attr('data-linkedid'),
                $row.attr('data-id')
            );
        });

        me.$root.on('click', '.row .move', function () {
            var $row = $(this).closest('.property');

            me.movePropertyBetweenGroups({
                settings: {
                    contactId: me.id,
                    propertyId: parseInt($row.attr('data-id')),
                    paymentGroupId: parseInt($row.attr('data-paymentgroupid'))
                }
            });
        });

        me.$root.on('click', '.create-group:not(.disabled)', function () {
            openConfigureGroupWindow(me.id, 0);
        });

        function openConfigureGroupWindow(contactId, paymentGroupId) {
            me.configureGroup({
                settings: {
                    contactId: contactId,
                    paymentGroupId: paymentGroupId,
                    onComplete: function (success) {
                        if (success) {
                            me.refreshLayer();
                        }
                    }
                }
            });
        }
    },

    rollUpDown: function ($container) {
        var $img = $container.closest('.row').find('.arrow');

        var $content = $container.closest('.row').find('.group-detail');

        var minheight = $content.css('min-height');
        $content.css('min-height', '0px');

        if ($img.hasClass('on')) {
            $img.removeClass('on');
            $content
                .slideUp('fast')
                .promise()
                .done(function () {
                    $content.css('min-height', minheight);
                });
        } else {
            $img.addClass('on');
            $content
                .slideDown('fast')
                .promise()
                .done(function () {
                    $content.css('min-height', minheight);
                });
        }
    },

    initSortable: function () {
        var me = this;

        me.$root.find('.group-detail, .group-header').sortable({
            axis: 'y',
            handle: '.handle',
            scroll: true,
            containment: '.payment-groups',
            placeholder: '.placeholder',
            connectWith: '.group-detail, .group-header',
            revert: false,
            helper: function (e, li) {
                this.copyHelper = li
                    .clone()
                    .css('opacity', '0.5')
                    .insertAfter(li);
                $(this).data('copied', false);
                return li.clone();
            },
            stop: function () {
                var copied = $(this).data('copied');
                if (!copied) {
                    this.copyHelper.remove();
                }
                this.copyHelper = null;
            },
            create: function (event) {
                var $item = $(event.target);
                if ($item.hasClass('group-header')) {
                    return;
                }
                var propcount = $item.find('.property').length;

                if (propcount === 0) {
                    $item.css('height', '52px');
                } else {
                    if (propcount > 3) {
                        $item.css('max-height', '156px');
                    }
                }
            },
            receive: function (event, ui) {
                var fromRow = ui.sender.closest('.row');
                var toRow = ui.item.closest('.row');

                if (fromRow.get(0) === toRow.get(0)) {
                    ui.sender.sortable('cancel');
                    return;
                }
                if (ui.item.closest('.group-detail', '.row').length === 0) {
                    //correct the drop location.
                    ui.item.appendTo(toRow.find('.group-detail'));
                }
                var msg =
                    'Please confirm "{0}" is to be moved into payment group "{2}" from payment group "{1}"'.format(
                        ui.item.find('.address').text(),
                        fromRow.find('#GroupNameHidden').val(),
                        toRow.find('#GroupNameHidden').val()
                    );

                showDialog({
                    type: 'question',
                    title: 'Move Property Between Payment Groups',
                    msg: msg,
                    buttons: {
                        Yes: function () {
                            var self = this;

                            var ctrl = new me.movePropertyController({
                                $root: me.$root
                            });

                            var propertyId = parseInt(ui.item.attr('data-id'));

                            var sourceGroupId = parseInt(fromRow.data('id'));
                            var destinationGroupId = parseInt(toRow.data('id'));

                            ctrl.movePropertyToGroup(
                                me.id,
                                propertyId,
                                sourceGroupId,
                                destinationGroupId,
                                function (updatedRows) {
                                    $(self).dialog('close');
                                    me.refreshRows(updatedRows, false);
                                },
                                function () {}
                            );
                        },
                        No: function () {
                            ui.sender.sortable('cancel');
                            $(this).dialog('close');
                        }
                    }
                });
            }
        });
    },

    refreshRows: function (rows, headerOnly) {
        var me = this;

        $(rows).each(function (i, v) {
            var $row = $(v);

            var groupId = parseInt($row.attr('data-id'));

            var $src = headerOnly ? $row.find('.group-header') : $row;
            var $dest = headerOnly
                ? me.$root.find('.row[data-id="' + groupId + '"] .group-header')
                : me.$root.find('.row[data-id="' + groupId + '"]');

            $dest.empty().html($src.html());
        });

        me.initSortable();
    },

    deletePaymentGroup: function ($content, onComplete, onError) {
        var $form = createForm($content, '/Contact/DeletePaymentGroup');

        new gmgps.cloud.http("paymentGroupHandler-deletePaymentGroup").postForm(
            $form,
            function (s) {
                // success

                if (onComplete) {
                    onComplete(s);
                }
            },
            function (f) {
                //error

                if (onError) {
                    onError(f);
                }
            }
        );
    },

    configureGroupController: function (args) {
        var me = this;

        me.callContext = args.data;
        me.closeWindowHandler = args.closeMyWindow;
        me.$content = args.$window.find('.content');
        me.$root = args.$root;
        me.$window = args.$window;
        me.defaultRemarks = JSON.parse(
            me.$root.find('#StatementRemarksJson').val()
        );
        me.wasDefault =
            me.$root.find('#InitialIsDefaultValue').val().toLowerCase() ===
            'true';

        me.$root.on('change', '#PaymentGroup_PaymentMethodType', function () {
            if (
                me.$root.find('#PaymentGroup_PayToBankAccountId option')
                    .length === 0
            ) {
                return;
            }

            me.isPaymentGroupBacsEnabled($(this).asNumber()).done(function (r) {
                if (r.Data) {
                    me.$root
                        .find('#PaymentGroup_PayToBankAccountId')
                        .val(me.$root.find('#DefaultBankAccountId').asNumber())
                        .trigger('change');
                }
            });
        });

        me.$root.find('select').customSelect();

        me.$root
            .find('.opt-inputmask-numeric.amount-input')
            .inputmask('currency', {
                radixPoint: '.',
                groupSeparator: ',',
                digits: 2,
                autoGroup: true,
                prefix: '£',
                rightAlign: false
            });

        me.$root.on('change', '#PaymentGroup_RetainAll', function () {
            var $txt = me.$content.find('#PaymentGroup_RetentionTarget');

            if ($(this).prop('checked') === true) {
                $txt.attr('disabled', 'disabled');
            } else {
                $txt.removeAttr('disabled');
            }
        });

        me.$root.on('change', '#PaymentGroup_PaymentMethodType', function () {
            var methodTypeId = parseInt($(this).val());
            var $chequeRow = me.$root.find('.row.cheque-only');

            if (methodTypeId === C.PaymentMethodType.Cheque) {
                $chequeRow.show();
                me.$root
                    .find('#PaymentGroup_PayToBankAccountId')
                    .prop('disabled', true);
            } else {
                $chequeRow.hide();
                //disable pay to if non bacs payment method
                var bacsBankAccountList = me.$root
                    .find('#BacsEnabledBankAccounts')
                    .val()
                    .split(',');
                bacsBankAccountList.some(function (entry) {
                    if (entry != parseInt(methodTypeId)) {
                        me.$root
                            .find('#PaymentGroup_PayToBankAccountId')
                            .prop('disabled', true);
                        me.$root
                            .find('#PaymentGroup_PayToBankAccountId')
                            .next('.customStyleSelectBox')
                            .addClass('disabled');
                    } else {
                        me.$root
                            .find('#PaymentGroup_PayToBankAccountId')
                            .prop('disabled', false);
                        me.$root
                            .find('#PaymentGroup_PayToBankAccountId')
                            .next('.customStyleSelectBox')
                            .removeClass('disabled');
                        return true;
                    }
                }, this);
            }
        });

        this.action = function (onComplete) {
            var me = this;

            var saveForm = function () {
                var performSave = function () {
                    $.when(me.updatePaymentGroup(me.$content)).done(function (
                        obj
                    ) {
                        if (obj) {
                            onComplete(false);
                        } else {
                            onComplete(true);
                        }
                    });
                };

                var groupHasPropertyRetentions =
                    me.$root
                        .find('#GroupHasPropertyRetentions')
                        .val()
                        .toLowerCase() === 'true';
                var groupHasRetentionValue =
                    parseFloat(
                        me.$root.find('#PaymentGroup_RetentionTarget').val()
                    ) > 0;

                // warn if property in group have retention values - we're going to nuke them
                if (groupHasPropertyRetentions && groupHasRetentionValue) {
                    showDialog({
                        type: 'question',
                        title: 'Group AND property retentions are not allowed with a group',
                        msg: 'Please confirm you wish to delete any retention amounts for properties in this group and replace with a group retention?',
                        buttons: {
                            Yes: function () {
                                performSave();

                                $(this).dialog('close');
                            },
                            No: function () {
                                $(this).dialog('close');
                            }
                        }
                    });
                } else {
                    performSave();
                }
            };

            // add a warning if the isDefault has changed

            var isDefault = me.$root
                .find('#PaymentGroup_IsDefault')
                .prop('checked');

            // cant leave the payment groups without a default
            if (me.wasDefault && !isDefault) {
                showInfo(
                    'You cannot leave the contact without a default payment group. Set another payment group as the default instead'
                );
                return false;
            }

            if (me.$root.find('#PaymentGroup_PaymentMethodType').val() === '') {
                showInfo('Please select a payment method');
                return false;
            }
            if (isDefault && !me.wasDefault) {
                showDialog({
                    type: 'question',
                    title: 'Default Payment Group Set',
                    msg: 'You are making this the default payment group - are you sure you want to do this ?',
                    buttons: {
                        Yes: function () {
                            $(this).dialog('close');
                            saveForm();
                        },
                        No: function () {
                            $(this).dialog('close');
                        }
                    }
                });
            } else {
                saveForm();
            }
        };

        this.isPaymentGroupBacsEnabled = function (id) {
            return new gmgps.cloud.http(
                "paymentGroupHandler-isPaymentGroupBacsEnabled"
            ).ajax({
                args: {
                    paymentmethodId: id
                },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/Contact/IsPaymentMethodBacsEnabled'
            });
        };

        this.updatePaymentGroup = function ($form) {
            var deferred = $.Deferred();

            new gmgps.cloud.http(
                "paymentGroupHandler-updatePaymentGroup"
            ).postForm(
                createForm($form, '/Contact/UpdatePaymentGroupConfiguration'),
                function (response) {
                    // success
                    deferred.resolve(response.Data);
                },
                function () {
                    //error
                    deferred.resolve(false);
                }
            );

            return deferred;
        };
    },

    movePropertyController: function (args) {
        var me = this;
        me.callContext = args.data;
        me.$root = args.$root;

        me.$root.on('click', '.btn-container.selectable', function () {
            // remove selected state from anything that was previously selected

            var $others = me.$root.find('.choice .btn-container.selected');

            $others.removeClass('selected').addClass('selectable');
            $others.find('.state').text('SELECT');
            $others.find('.ticked').removeClass('ticked').addClass('select');

            var $this = $(this);

            // add selected state to this button
            $this.addClass('selected').removeClass('selectable');
            $this.find('.state').text('SELECTED');
            $this.find('.select').removeClass('select').addClass('ticked');

            // set text in header to reflect new destination payment group name
            me.$root
                .find('.destination')
                .text(
                    "'{0}'".format(
                        $this.closest('.choice').find('.text').text()
                    )
                );

            // save the selected value in the hidden

            me.$root.find('#SelectedPaymentGroupId').val($this.attr('data-id'));
        });

        this.action = function (onComplete) {
            var saveForm = function (
                contactId,
                propertyId,
                sourceGroupId,
                destinationGroupId
            ) {
                me.movePropertyToGroup(
                    contactId,
                    propertyId,
                    sourceGroupId,
                    destinationGroupId,
                    function (updatedRows) {
                        // success
                        me.callContext.refreshRows(updatedRows, false);
                        onComplete(false);
                    },
                    function () {
                        // failure
                        onComplete(true);
                    }
                );
            };

            var propertyId = parseInt(me.$root.find('#PropertyId').val());
            var sourceGroupId = parseInt(
                me.$root.find('#PaymentGroupId').val()
            );
            var destinationGroupId = parseInt(
                me.$root.find('#SelectedPaymentGroupId').val()
            );
            var contactId = parseInt(me.$root.find('#ContactId').val());

            if (!destinationGroupId) {
                showInfo('Please select the destination Payment Group');
                return false;
            }

            saveForm(contactId, propertyId, sourceGroupId, destinationGroupId);
        };

        this.movePropertyToGroup = function (
            contactId,
            propertyId,
            sourceGroupId,
            destinationGroupId,
            onComplete,
            onError
        ) {
            new gmgps.cloud.http(
                "paymentGroupHandler-movePropertyToGroup"
            ).ajax(
                {
                    args: {
                        model: {
                            contactId: contactId,
                            propertyId: propertyId,
                            paymentGroupId: sourceGroupId
                        },
                        destinationGroupId: destinationGroupId
                    },
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: '/Contact/MovePropertyToPaymentGroup'
                },
                function (response) {
                    onComplete(response.Data);
                },
                function () {
                    onError();
                }
            );
        };
    },

    movePropertyBetweenGroups: function (args) {
        var me = this;

        new gmgps.cloud.ui.controls.window({
            title: 'Change Payment Group',
            windowId: 'changePaymentGroupModal',
            controller: me.movePropertyController,
            data: me,
            url: '/Contact/GetMovePaymentGroupPropertyDialog',
            urlArgs: args.settings,
            post: true,
            complex: true,
            nopadding: true,
            width: 450,
            draggable: true,
            modal: true,
            actionButton: 'Move',
            cancelButton: 'Cancel',
            onAction:
                args.onComplete ||
                function () {
                    return false;
                },
            onCancel:
                args.onComplete ||
                function () {
                    return false;
                }
        });
    },

    configureGroup: function (args) {
        var me = this;

        new gmgps.cloud.ui.controls.window({
            title: 'Configure Payment Group',
            windowId: 'configPaymentGroupModal',
            controller: me.configureGroupController,
            data: me,
            url: '/Contact/GetPaymentGroupConfiguration',
            urlArgs: args.settings,
            post: true,
            complex: true,
            width: 450,
            draggable: true,
            modal: true,
            actionButton: 'Save',
            cancelButton: 'Cancel',
            onAction:
                args.onComplete ||
                function () {
                    return false;
                },
            onCancel:
                args.onComplete ||
                function () {
                    return false;
                }
        });
    },

    refreshLayer: function () {
        var deferred = $.Deferred();
        var me = this;

        new gmgps.cloud.http("paymentGroupHandler-refreshLayer").ajax(
            {
                args: {
                    contactId: me.id
                },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/Contact/GetPaymentGroupsLayer'
            },
            function (response) {
                me.$root.find('.container').empty().html(response.Data);
                me.init();

                deferred.resolve(response.Data);
                return response;
            },
            function () {
                deferred.resolve(false);
            }
        );

        return deferred;
    }
};
