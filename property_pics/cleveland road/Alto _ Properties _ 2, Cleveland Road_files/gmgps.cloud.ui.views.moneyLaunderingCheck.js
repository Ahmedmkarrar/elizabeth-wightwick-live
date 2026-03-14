gmgps.cloud.ui.views.moneyLaunderingCheck = function (args) {
    var me = this;

    me.propertyId = args.propertyId;
    me.historyEventId = args.historyEventId;
    me.applicantIds = args.applicantIds;
    me.callbackfunction = args.callBack;
    me.callBackForm = args.callBackForm;
    me.pendoTag = args.pendoTag;
    me.contactIdsLackingIdCheck = [];
    me.excludeApplicantFromChecks = args.excludeApplicantFromChecks == 'True';
    me.checkType = args.checkType;
    me.offerView = args.offerView || false;
    me.isAcceptAction = args.isAcceptAction || false;
    me.statusChangeView = args.statusChangeView
    me.init(args);

    return true;
};

gmgps.cloud.ui.views.moneyLaunderingCheck.prototype = {
    constructor: gmgps.cloud.ui.views.moneyLaunderingCheck,

    init: function () {
        var me = this;
        var hideCloseButton = false;

        if (me.checkType == C.MoneyLaunderingCheckOptions.None) {
            me.callbackfunction(me.callBackForm);
            return;
        }

        me.checkContactsHavePassedMoneyLaunderingChecks();
        if (me.contactIdsLackingIdCheck.length === 0) {
            me.callbackfunction(me.callBackForm);
            return;
        }

        var dialogMessage = 'Money laundering checks have not been completed for all contacts, do you want to continue?';
        var dialogButtons = {
            Yes: function () {
                $(this).dialog('close');
                me.callbackfunction(me.callBackForm);
            },
            No: function () {
                $(this).dialog('close');
            }
        };
        
        if (me.checkType == C.MoneyLaunderingCheckOptions.Mandatory) {

            dialogMessage = 'Money laundering checks have not been completed for all the Contacts, please correct this before continuing';

            dialogButtons = {
                OK: function () {
                    $(this).dialog('close');
                }
            };
        }

        const isIdcheckModuleEnabled = me.constructor.isIdCheckModuleEnabled();

        let addPendoTag = false;
        var isNewOffer = me.offerView.id === 0;        

        if (isIdcheckModuleEnabled) {

            hideCloseButton = true;
            const contactIds = me.contactIdsLackingIdCheck.join(',');
            const url = `${me.constructor.getContactIdCheckAppsUrl(me.propertyId)}?contactId=${contactIds}`;

            addPendoTag = true;

            if (me.statusChangeView && me.checkType == C.MoneyLaunderingCheckOptions.Show) {
                dialogMessage = '<p>ID and money laundering checks have not been completed for all contacts.</p> <p>Click <i>order checks</i> to do them now, <i>cancel</i> to keep the current status or <i>change status</i> to proceed without completing checks.</p>';

                dialogButtons = {
                    'Change status': function () {
                        $(this).dialog('close');
                        me.callbackfunction(me.callBackForm)
                    },
                    'Close': function () {
                        $(this).dialog('close');
                        me.callbackfunction('CANCEL')
                    },
                    'Order checks': {
                        text: 'Order checks',
                        class: 'contact-checks-window-order-checks',
                        click: function () {
                            window.open(url, '_blank');
                            $(this).dialog('close');
                        }
                    }
                }
            }
            if (me.isAcceptAction) {
                if (isNewOffer) {
                    if (me.checkType == C.MoneyLaunderingCheckOptions.Show) {
                        dialogMessage = 'ID and money laundering checks have not been completed for all contacts.<br>Click <i>order checks</i> to do them now, <i>save</i> to keep the offer without accepting it yet or <i>accept</i> offer without completing checks.';
                        dialogButtons = {
                            'Accept': function () {
                                $(this).dialog('close');
                                me.callbackfunction(me.callBackForm);
                            },
                            'Save': function () {
                                $(this).dialog('close');
                                //Save the offer, don't proceed with acceptance
                                if (me.offerView && typeof me.offerView.action === 'function') {
                                    me.offerView.$root.find('#ProgressionStatus').val(C.OfferStatus.Unspecified);
                                    me.offerView.action(function () {
                                        me.offerView.closeMyWindow();
                                    }, "amlPopupAlreadyDisplayed", false);
                                }
                            },
                            'Order checks': function () {
                                window.open(url, '_blank');
                                $(this).dialog('close');
                            }
                        };
                    } else { // Mandatory
                        dialogMessage = 'ID and money laundering checks have not been completed for all contacts.<br>Click <i>order checks</i> to do them now or <i>save</i> to keep the offer without accepting it yet.';
                        dialogButtons = {
                            'Save': function () {
                                $(this).dialog('close');
                                //Save the offer, don't proceed with acceptance
                                if (me.offerView && typeof me.offerView.action === 'function') {
                                    me.offerView.$root.find('#ProgressionStatus').val(C.OfferStatus.Unspecified);
                                    me.offerView.action(function () {
                                        me.offerView.closeMyWindow();
                                    }, "amlPopupAlreadyDisplayed", false);
                                }
                            },
                            'Order checks': function () {
                                window.open(url, '_blank');
                                $(this).dialog('close');
                            }
                        };
                    }
                } else {
                    //same check, but when working with an existing offer, not a new one
                    if (me.checkType == C.MoneyLaunderingCheckOptions.Show) {
                        dialogMessage = 'ID and money laundering checks have not been completed for all contacts.<br>Click <i>order checks</i> to do them now or <i>accept</i> offer without completing checks.';
                        dialogButtons = {
                            'Accept': function () {
                                $(this).dialog('close');
                                me.callbackfunction(me.callBackForm);
                            },
                            'Order checks': function () {
                                window.open(url, '_blank');
                                $(this).dialog('close');
                            }
                        };
                    } else { // Mandatory
                        dialogMessage = 'ID and money laundering checks have not been completed for all contacts.<br>Click <i>order checks</i> to do them now or keep offer without accepting yet.';
                        dialogButtons = {
                            'Cancel': function () {
                                $(this).dialog('close');
                            },
                            'Order checks': function () {
                                window.open(url, '_blank');
                                $(this).dialog('close');
                            }
                        };
                    }

                }
            } else {
                    //Save action (original logic)
                    dialogMessage = 'ID and money laundering checks have not been completed for all contacts.<br><br>Click <i>order checks</i> to do them now or <i>close</i> to dismiss this alert.';                    
                    dialogButtons = {
                        'Close': function () {                            
                            $(this).dialog('close');
                            me.callbackfunction(me.callBackForm);
                        },
                        'Order checks': function () {
                            window.open(url, '_blank');
                            $(this).dialog('close');
                        }
                    }
                }
            }
        
        let dialog = showDialog({
            type: 'warning',
            title: 'Contact checks',
            msg: dialogMessage,
            buttons: dialogButtons,
            hideCloseButton: hideCloseButton
        });

        if (addPendoTag) {
            var $buttons = dialog.parent().find(".ui-dialog-buttonpane button");
            $buttons.eq(0).attr({
                "data-pendo": me.pendoTag
            });


            var $orderChecksButton = $buttons.filter(function () {
                return $(this).text() === 'Order checks';
            });
            $orderChecksButton.addClass('bgg-property');
            $orderChecksButton.append('<span class="fa-external-link fa ml5"</span>');
            dialog.find('.icon.warning').hide();            
        }
    },

    checkContactsHavePassedMoneyLaunderingChecks: function () {
        var me = this;
        var url = '/Property/CheckAllVendorsPassedMoneyLaunderingCheck';
        var args = { propertyId: me.propertyId };

        if (
            !me.excludeApplicantFromChecks &&
            me.applicantIds != null &&
            me.applicantIds.length > 0
        ) {
            url = '/Property/CheckAllContactsPassedMoneyLaunderingCheck';
            args = { contactIds: me.applicantIds, propertyId: me.propertyId };
        }

        new gmgps.cloud.http(
            "moneyLaunderingCheck-checkContactsHavePassedMoneyLaunderingChecks"
        ).ajax(
            {
                args: args,
                complex: true,
                dataType: 'json',
                type: 'post',
                url: url,
                async: false
            },
            function (response) {
                if (response.ErrorData == null) {
                    me.contactIdsLackingIdCheck = response.Data;
                } else me.contactIdsLackingIdCheck = [];
            }
        );
    },
};

gmgps.cloud.ui.views.moneyLaunderingCheck.isIdCheckModuleEnabled = function () {
    const ID_CHECK_MODULE_NAME = 'IdChecks';
    let result = false;

    $.ajax({
        type: 'get',
        url: '/api/1/keyflo/Modules',
        async: false,
        cache: false,
        dataType: 'json',
        headers: {
            'X-Component-Name': 'moneyLaunderingCheck-IdCheckModuleEnabled',
            'Alto-Version': alto.version
        },
        success: function (response) {
            result = response.includes(ID_CHECK_MODULE_NAME);
        }
    });

    return result;
};

gmgps.cloud.ui.views.moneyLaunderingCheck.getContactIdCheckAppsUrl = function (propertyId) {

    let url = '';

    $.ajax({
        type: 'get',
        url: `/ContactAml/GetContactIdCheckAppsUrl?propertyId=${propertyId}`,
        async: false,
        cache: false,
        dataType: 'json',
        headers: {
            'X-Component-Name': 'moneyLaunderingCheck-GetContactIdCheckAppsUrl',
            'Alto-Version': alto.version
        },
        success: function (response) {
            url = response.url;
        }
    });

    return url;
};