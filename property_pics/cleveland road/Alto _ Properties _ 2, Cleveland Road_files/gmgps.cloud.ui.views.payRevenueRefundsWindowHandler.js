((function() {
    gmgps.cloud.ui.views.payRevenueRefundsWindowHandler = CreateWindow;

    function CreateWindow(args) {
        var me = this;
        me.contactId = args.contactId;
        me.groupBankAccountId = args.groupBankAccountId || 0;
        me.title = args.title;
        me.windowId = args.windowId;
        me.defaultItemDate = args.defaultItemDate || undefined;
    }
    $.extend(CreateWindow.prototype, {
        show: function (success, error) {
            var me = this;
            var defer = $.Deferred();
            if (success) {
                defer.done(success);
            }
            if (error) {
                defer.fail(error);
            }

            new gmgps.cloud.ui.controls.window({
                title: me.title,
                windowId: me.windowId,
                controller: WindowController,
                url: 'Accounts/GetPayRevenueRefundItems',
                urlArgs: {
                    groupBankAccountId: me.groupBankAccountId,
                    contactId: me.contactId
                },
                data: me,
                post: true,
                complex: true,
                nopadding: true,
                draggable: true,
                modal: true,
                actionButton: 'Update',
                cancelButton: 'Close',
                //todo: what???
                //onAction: function () {
                //    defer.done();
                //},
                onCancel: function () {
                    defer.reject({ cancel: true });
                },
                postActionCallback: function () {
                    defer.resolve();
                }
            });
            return defer.promise();
        }
    });

    function WindowController(args) {
        this.init(args);
    }
    $.extend(WindowController.prototype, {
        init: function (args) {
            var me = this;
            me.params = args.data;

            me.$root = args.$root;
            me.$window = args.$window;

            me.currencySymbol = me.$root.find('.out-currencysymbol').val();

            me.$root.find('.customStyleSelectBox').css('width', '');
            me.initControls();
            me.initEvents();
            updateTotal(me);
        },
        initControls: function () {
            var me = this;
            gmgps.cloud.helpers.ui.initDatePickers(me.$root);
            gmgps.cloud.helpers.ui.initInputs(me.$root);

            var controls = {
                buttons: me.$window.find('.bottom .buttons'),
                bankReference: me.$root.find('.in-bankreference'),
                paymentMethod: me.$root.find('.in-paymentmethod'),
                totalAllocated: me.$root.find('.out-refunddue'),
                form: me.$root
                    .find('.opt-validate')
                    .validationEngine({ scroll: false })
            };
            me.controls = controls;

            me.$root
                .find(
                    '.opt-inputmask-numeric.in-allocate-amount, .out-refunddue'
                )
                .inputmask('currency', {
                    radixPoint: '.',
                    groupSeparator: ',',
                    digits: 2,
                    autoGroup: true,
                    prefix: me.currencySymbol,
                    rightAlign: false,
                    allowMinus: true
                });

            controls.actionButton = controls.buttons
                .find('.action-button')
                .removeClass('grey')
                .addClass('bgg-property');
            controls.cancelButton = controls.buttons.find('.cancel-button');
            controls.previewButton = $(
                '<div class="preview-button html-preview btn fr">Preview</div>'
            );
            controls.printButton = $(
                '<div class="print-button bgg-property btn hidden" style="float:left">Print Document</div>'
            );
            controls.documentPreview = me.$root.find('.document-preview');
            me.$window
                .find('.bottom .buttons .action-button')
                .after(controls.printButton)
                .after(controls.previewButton);
        },
        initEvents: function () {
            var me = this,
                namespace = '.refundswindow';
            me.$root
                .off(namespace)
                .on('change' + namespace, '.in-paymentmethod', function (e) {
                    if (
                        e.currentTarget.value ===
                        C.PaymentMethodType.Bacs.toString()
                    ) {
                        me.controls.bankReference
                            .val('Bacs')
                            .attr('readonly', true);
                    } else {
                        me.controls.bankReference
                            .val('')
                            .removeAttr('readonly');
                    }
                })
                .on('change', '#SelectAllNone', function () {
                    me.$root
                        .find(
                            '.quarter-row .tickbox:visible .tickbox-hidden:not(.exclude-tick)'
                        )
                        .prop('checked', $(this).prop('checked'))
                        .trigger('prog-change');
                    var $rows = me.$root.find('.quarter-row');
                    $rows.each(function () {
                        var $row = $(this);
                        if ($row.data('max') > 0) {
                            var rowTicked = $row
                                .find('.tickbox')
                                .hasClass('ticked');
                            allocate(
                                $row,
                                rowTicked ? parseFloat($row.data('max')) : 0
                            );
                            updateTotal(me);
                        }
                    });
                })
                .on('change' + namespace, '.in-allocate', function (e) {
                    var $el = $(e.currentTarget);
                    var $row = $el.closest('tr');
                    allocate($row, $el.prop('checked') ? $el.data('value') : 0);
                    updateTotal(me);
                })
                .on('keyup' + namespace, '.in-allocate-amount', function (e) {
                    var $el = $(e.currentTarget);
                    var $row = $el.closest('tr');
                    if ($el.asNumber() > $el.attr('max')) {
                        $el.val($el.attr('max'));
                    }
                    updateState($row, $el.asNumber());
                    updateTotal(me);
                });

            me.$window
                .off(namespace)
                .on(
                    'click' + namespace,
                    '.preview-button:not(.disabled)',
                    function () {
                        if (!me.isValid()) {
                            return;
                        }
                        var $this = $(this);
                        if ($this.hasClass('preview-on')) {
                            //Turn off preview mode.
                            $this.removeClass('preview-on').text('Preview');
                            closePreviewRefundHtml();
                        } else {
                            //Turn on preview mode.
                            $this.addClass('preview-on').text('Exit Preview');
                            previewRefundHtml();
                        }
                    }
                )
                .on(
                    'click' + namespace,
                    '.print-button:not(.disabled)',
                    function () {
                        previewRefundDocument();
                    }
                );

            function previewRefundHtml() {
                me.controls.documentPreview
                    .show()
                    .addClass('active')
                    .append(
                        '<iframe id="refund-preview-frame" name="refund-preview-frame"></iframe>'
                    );
                me.controls.printButton.show();
                me.$window
                    .find('.buttons .btn:not(.hidden, .preview-button)')
                    .addClass('disabled');

                return new gmgps.cloud.http(
                    "payRevenueRefundsWindowHandler-initEvents"
                )
                    .ajax({
                        args: me.createForm().serializeObject(),
                        complex: true,
                        dataType: 'json',
                        type: 'post',
                        url: '/Accounts/PreviewPayRevenueRefundHtml'
                    })
                    .done(function (r) {
                        if (r && r.Data) {
                            gmgps.cloud.helpers.general.generateAccountingDocuments(
                                r.DocumentRequestIdList
                            );
                        }
                        return r;
                    })
                    .done(function (r) {
                        if (r && r.Data) {
                            gmgps.cloud.helpers.general.openPublisher({
                                $target:
                                    me.controls.documentPreview.find('iframe'), // me.$root.find('#refund-preview-frame'),
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
                                        C.DocumentTemplateType
                                            .PublisherStationery,
                                    templateId: r.Data.TemplateId,
                                    printFormat: 0,
                                    sampleDocumentContent:
                                        gmgps.cloud.helpers.general.escapeHtml(
                                            r.Data.Content
                                        )
                                }
                            });
                        }
                        return r;
                    });
            }
            function closePreviewRefundHtml() {
                me.$window.find('.buttons .btn').removeClass('disabled');
                me.controls.printButton.hide();
                me.controls.documentPreview.fadeOut(250, function () {
                    me.controls.documentPreview.removeClass('active').empty();
                });
            }
            function previewRefundDocument() {
                var $form = me.createForm(
                    '/Accounts/PreviewPayRevenueRefundDocument'
                );

                var ua = window.navigator.userAgent;

                var isIE =
                    ua.indexOf('MSIE ') > -1 || ua.indexOf('Trident/') > -1;

                if (!isIE) {
                    $form.attr('target', '_blank');
                }

                $form.appendTo('body').submit().remove();
            }
        },
        action: function (onComplete, $btn) {
            var me = this;

            if (me.isValid()) {
                $btn.lock();

                new gmgps.cloud.http("payRevenueRefundsWindowHandler-action")
                    .ajax({
                        args: me.createForm().serializeObject(),
                        complex: true,
                        dataType: 'json',
                        type: 'post',
                        url: '/Accounts/PostPayRevenueRefundItems'
                    })
                    .done(function (r) {
                        if (r && r.Data) {
                            gmgps.cloud.helpers.general.generateAccountingDocuments(
                                r.DocumentRequestIdList
                            );
                            onComplete();
                        } else {
                            $btn.unlock();
                        }
                        return r;
                    });
            }
            return false;
        },

        createForm: function createRefundForm(url) {
            var me = this;
            var $form;
            var $root = me.$root.clone();
            $root
                .find('.in-allocate')
                .not(':checked')
                .closest('.quarter-row')
                .remove();
            $root.find('.exclude-post').remove();
            $root.find('.quarter-row').each(function (i, el) {
                $(el)
                    .find('input[name^=RefundItems]')
                    .each(function (j, box) {
                        var $box = $(box);
                        $box.prop(
                            'name',
                            $box.prop('name').replace(/\[\d\]/, '[' + i + ']')
                        );
                    });
            });

            $form = createForm($root, url);
            return $form;
        },

        isValid: function () {
            return this.controls.form.validationEngine('validate', {
                scroll: false
            });
        }
    });

    function allocate($row, value) {
        updateState($row, value);
    }

    function updateState($row, value) {
        var uitickbox = $row.find('.tickbox').removeClass('amber');
        var tickbox = uitickbox.find('.tickbox-hidden');
        var allocate = $row
            .find('.in-allocate-amount')
            .removeClass('partial full');
        var max = allocate.prop('max');

        if (value > 0) {
            if (value < max) {
                allocate.addClass('partial');
                uitickbox.addClass('amber');
            } else {
                allocate.addClass('full');
            }

            if (!tickbox.prop('checked')) {
                tickbox.prop('checked', true).trigger('prog-change');
            }
            $row.find('.in-allocate-amount').validationEngine('hide');
        } else {
            tickbox.prop('checked', false).trigger('prog-change');
            if (value < 0) {
                $row.find('.in-allocate-amount').validationEngine(
                    'showPrompt',
                    'Negative values are not allowed',
                    'x',
                    'topRight',
                    true
                );
            }
        }
    }

    function sum(values) {
        var result = 0;
        $.each(values, function (i, v) {
            result += v;
        });
        return result;
    }
    function updateTotal(me) {
        var totalAllocated = sum(
            me.$root.find('.in-allocate-amount:visible').map(function (i, e) {
                return $(e).asNumber();
            })
        );
        me.controls.totalAllocated.val(totalAllocated);
        me.controls.actionButton
            .add(me.controls.previewButton)[totalAllocated <= 0 ? 'addClass' : 'removeClass']('disabled');
    }
}))();
