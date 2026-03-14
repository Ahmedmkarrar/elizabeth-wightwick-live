((gmgps.cloud.ui.views.receiptImportsPinningHandler = function (args) {
    var me = this;

    me.title = args.title;
    me.$content = args.$content;

    me.branchId = args.branchId;
    me.userId = args.userId;
    me.amendReference = args.amendReference;
    me.pinnedUsingRef = args.pinnedUsingRef;
    me.pinnedToModelTypeId = args.pinnedToModelTypeId;
    me.disablePinningToCharge = args.disablePinningToCharge;

    me.onComplete = args.onComplete;
    me.onCancel = args.onCancel;

    return me.init();
})),
    (gmgps.cloud.ui.views.receiptImportsPinningHandler.prototype = {
        init: function () {
            var me = this;
            return me;
        },

        controller: function (args) {
            var me = this;
            var Namespace = '.ImportedReceiptsPinHandler';

            me.params = args.data;
            me.$root = args.$root;
            me.$window = args.$window;

            me.$root = args.$root;
            me.$window = args.$window;

            me.amendReference = me.params.amendReference;
            me.pinnedToModelTypeId = me.params.pinnedToModelTypeId;
            me.pinnedUsingRef = me.params.pinnedUsingRef;
            me.disablePinningToCharge = me.params.disablePinningToCharge;

            me.$window
                .find('.top')
                .css('background-color', '#5d5d5d !important');
            me.$window.find('.middle').css('background-color', '#ffffff');

            me.$window
                .find('.bottom')
                .find('.action-button')
                .addClass('disabled')
                .addClass('bgg-property');

            me.$window
                .find('#reference')
                .on('updateInfo mousemove mouseup', function () {
                    if (document.activeElement !== $(this)[0]) {
                        return;
                    }
                    processRefererenceSelection();
                });

            me.$root.on('click' + Namespace, '.pick-item', function () {
                var $this = $(this);
                var pickerSelector = '.banner.' + $this.attr('data-picker');
                var infoSelector = '.info.' + $this.attr('data-picker');

                me.$root
                    .find('.pick-item')
                    .removeClass('active')
                    .addClass('inactive');
                $this.addClass('active').removeClass('inactive');

                me.$root.find('.banner').addClass('hidden');
                me.$root.find(pickerSelector).removeClass('hidden');

                me.$root.find('.info').removeClass('active');
                me.$root.find(infoSelector).addClass('active');

                processRefererenceSelection();
            });

            var processRefererenceSelection = function () {
                var $refInput = me.$window.find('#reference');
                var range = $refInput.textrange();
                var ref = range.text;

                var hasSpecialCharacters = refHasSpecialCharacters(ref); // Bool
                var hasNumbers = refHasNumbers(ref); // Bool
                var meetsMinLength = refMeetsMinLengthReq(ref); // Bool

                var recordSelected =
                    me.$root.find('.pick-item.active').length > 0;
                var recordSelectedIsValid = !me.$root
                    .find('.pick-item.active')
                    .hasClass('chargedisabled');

                var inputCSS = getRefInputClass(
                    hasSpecialCharacters,
                    hasNumbers,
                    meetsMinLength
                );

                // Clear current strength css
                clearRefInputCSS($refInput);
                // Set new strength css
                setRefInputCSS($refInput, inputCSS);
                setComplexityMessage(inputCSS);
                setReferenceLengthMessage(ref.length);

                if (
                    recordSelected &&
                    recordSelectedIsValid &&
                    inputCSS !== 'invalid'
                ) {
                    setActionButtonState(true);
                } else {
                    setActionButtonState(false);
                }
            };

            var getRefInputClass = function (
                hasSpecialCharacters,
                hasNumbers,
                meetsMinLength
            ) {
                // unknown, poor, average, good

                if (meetsMinLength) {
                    if (hasSpecialCharacters && hasNumbers) {
                        return 'good';
                    }

                    if (hasSpecialCharacters || hasNumbers) {
                        return 'average';
                    } else {
                        return 'poor';
                    }
                } else {
                    return 'invalid';
                }
            };

            var clearRefInputCSS = function ($refInput) {
                $refInput
                    .removeClass('average')
                    .removeClass('good')
                    .removeClass('poor')
                    .removeClass('unknown');
            };

            var setRefInputCSS = function ($refInput, css) {
                $refInput.addClass(css);
            };

            var refMeetsMinLengthReq = function (ref) {
                return ref.length > 5;
            };

            var refHasSpecialCharacters = function (ref) {
                if (/^[a-zA-Z0-9- ]*$/.test(ref) === false) {
                    return true;
                } else {
                    return false;
                }
            };

            var refHasNumbers = function (ref) {
                if (/^[a-zA-Z- ]*$/.test(ref) === false) {
                    return true;
                } else {
                    return false;
                }
            };

            var setComplexityMessage = function (complexity) {
                me.$window.find('#complexity').html(complexity);
                me.$window
                    .find('.complexity-message .indicator')
                    .removeClass('good')
                    .removeClass('average')
                    .removeClass('poor')
                    .removeClass('unknown');
                me.$window
                    .find('.complexity-message .indicator')
                    .addClass(complexity);
            };

            var setReferenceLengthMessage = function (length) {
                if (length >= 6 && length <= 50) {
                    me.$window
                        .find('#ref-length')
                        .html(length + ' characters have been selected');
                    me.$window
                        .find('.length-message .indicator')
                        .removeClass('too-short')
                        .addClass('good')
                        .removeClass('too-long');
                    return;
                }

                if (length < 6) {
                    me.$window
                        .find('#ref-length')
                        .html(
                            'Pinned references must be at least 6 characters in length'
                        );
                    me.$window
                        .find('.length-message .indicator')
                        .addClass('too-short')
                        .removeClass('good')
                        .removeClass('too-long');
                } else {
                    me.$window
                        .find('#ref-length')
                        .html(
                            'Only the first 50 from the ' +
                                length +
                                ' selected characters will be used'
                        );
                    me.$window
                        .find('.length-message .indicator')
                        .removeClass('too-short')
                        .removeClass('good')
                        .addClass('too-long');
                }
            };

            var setActionButtonState = function (readyToPin) {
                if (readyToPin) {
                    me.$window
                        .find('.bottom')
                        .find('.action-button')
                        .removeClass('disabled');
                } else {
                    me.$window
                        .find('.bottom')
                        .find('.action-button')
                        .addClass('disabled');
                }
            };

            var prepareToAmendReference = function () {
                me.$window
                    .find('.top .title')
                    .html('Amending Pinned Reference');

                // 1) Set the already pinned record as active
                var pickItem = me.$root.find(
                    '.pick-item[data-modeltypeid="' +
                        me.pinnedToModelTypeId +
                        '"]'
                );
                pickItem.trigger('click');

                // 2) Select the pinned reference 'part'
                var $refInput = me.$window.find('#reference');
                var fullReference = $refInput.val().toLowerCase();

                var refPartLocation = fullReference.indexOf(
                    me.pinnedUsingRef.toLowerCase()
                );

                // Only set the selection to the 1st occurance of the ref
                if (refPartLocation > -1) {
                    $refInput.textrange(
                        'set',
                        refPartLocation,
                        me.pinnedUsingRef.length
                    );
                }

                // 3) Update UI
                var range = $refInput.textrange();
                processRefererenceSelection(range);
            };

            var disabledChargePinning = function () {
                me.$root.find('.pick-item.charge').addClass('hidden');
                me.$root
                    .find('.pick-item.chargedisabled')
                    .removeClass('hidden');
                me.$root.find('.banner.charge').addClass('hidden');
            };

            var updateChargePickItemToMulti = function () {
                var $pickItemCharge = me.$root.find('.pick-item.charge');
                // Change charge pick item header
                $pickItemCharge.find('.header').text('Multiple Charges');
                // Change charge pick icon to multi icons
                $pickItemCharge
                    .find('.icon')
                    .html(
                        '<span class="first fa fa-money"></span> <span class="second fa fa-money"></span> <span class="third fa fa-money"></span>'
                    );
            };

            if (me.amendReference) {
                prepareToAmendReference();
            }

            if (me.disablePinningToCharge) {
                // Multiple charge rows exist

                if (me.pinnedToModelTypeId !== C.ModelType.AccountTransation) {
                    // Not currently pinned to a charge
                    disabledChargePinning();
                } else {
                    updateChargePickItemToMulti();
                }
            }

            this.action = function (onComplete) {
                var range = $('#reference').textrange();
                var modelId = me.$window
                    .find('.pick-item.active')
                    .attr('data-modelid');
                var modelTypeId = me.$window
                    .find('.pick-item.active')
                    .attr('data-modeltypeid');
                var reference = range.text;

                var response = {
                    selectedRef: reference,
                    modelTypeId: modelTypeId,
                    modelId: modelId,
                    action: me.amendReference ? 'amendpin' : 'pin'
                };

                me.params.onComplete(response);
                onComplete();
                return false;
            };
        },

        show: function () {
            var me = this;

            new gmgps.cloud.ui.controls.window({
                title: 'Pin Reference',
                windowId: 'receiptImportPinReference',
                controller: me.controller,
                data: me,
                $content: me.$content,
                amendReference: me.amendReference,
                pinnedToModelTypeId: me.pinnedToModelTypeId,
                pinnedUsingRef: me.pinnedUsingRef,
                disablePinningToCharge: me.disablePinningToCharge,
                post: false,
                complex: false,
                width: 800,
                draggable: true,
                modal: true,
                actionButton: 'Pin Reference',
                cancelButton: 'Cancel',
                onAction:
                    me.onComplete ||
                    function () {
                        return false;
                    },
                onCancel:
                    me.onCancel ||
                    function () {
                        return true;
                    }
            });
        }
    });
