gmgps.cloud.ui.views.raiseChargesHandler = function (args) {
    var me = this;
    me.showAccountBalance = args.showAccountBalance;
    me.linkedId = args.linkedId;
    me.linkedTypeId = args.linkedTypeId;
    me.chargeIdList = args.chargeIdList;
    me.onComplete = args.onComplete;
    me.title = args.title;
    return me.init(args);
};
gmgps.cloud.ui.views.raiseChargesHandler.prototype = {
    init: function () {
        var me = this;

        return me;
    },

    controller: function (args) {
        var me = this;

        me.$root = args.$root;
        me.params = args.data;
        me.$window = args.$window;

        me.$window
            .find('.bottom .buttons')
            .find('.action-button')
            .removeClass('grey')
            .addClass('bgg-property');

        me.$window
            .find('.bottom .buttons .action-button')
            .after(
                '<div class="preview-button html-preview btn fr">Preview</div>'
            );

        // add a print button
        me.$window
            .find('.bottom .buttons .preview-button')
            .before(
                '<div class="print-button bgg-property btn hidden" style="float:left">Print Invoices</div>'
            );

        me.$root.on('focus', '.ui-autocomplete-input', function () {
            $(this).autocomplete('search', '');
        });

        var anyChargesHaveSendDocs =
            me.$root.find('#AnySendDocs').val().toLowerCase() === 'true';

        if (!anyChargesHaveSendDocs) {
            me.$window
                .find('.bottom .buttons .preview-button')
                .addClass('disabled');
        }

        me.$root
            .find('#ShowAccountBalance')
            .prop('checked', args.data.showAccountBalance);

        if (args.data.showAccountBalance) {
            me.$root.find('#ShowAccountBalance').parent().addClass('ticked');
        } else {
            me.$root.find('#ShowAccountBalance').parent().removeClass('ticked');
        }

        me.$root.on('change', '#SendInvoice', function () {
            var enabled = false;

            var id = parseInt($(this).find('option:selected').val());

            switch (id) {
                case C.AdhocInvoiceSendType.PerItemSetting:
                    if (anyChargesHaveSendDocs === true) {
                        enabled = true;
                    } else {
                        enabled = false;
                    }
                    break;
                case C.AdhocInvoiceSendType.IncludeAll:
                    enabled = true;
                    break;
                case C.AdhocInvoiceSendType.NoDocument:
                    enabled = false;
                    break;
            }

            enabled
                ? me.$window
                      .find('.bottom .buttons .preview-button')
                      .removeClass('disabled')
                : me.$window
                      .find('.bottom .buttons .preview-button')
                      .addClass('disabled');
        });

        me.$root.on(
            'change',
            '#ShowAccountBalance, #InvoiceRemark',
            function () {
                if (me.$root.find('#alertshown').val() === '0') {
                    showInfo(
                        'Please note: changes only apply to charges raised now'
                    );
                    me.$root.find('#alertshown').val('1');
                }
            }
        );

        me.$window.on('click', '.print-button', function () {
            me.previewChargesDocument(me.$root.find('.raise-charges'));
        });

        me.$window.on('click', '.preview-button:not(.disabled)', function () {
            if ($(this).hasClass('preview-on')) {
                //Turn off preview mode.
                $(this).removeClass('preview-on').text('Preview');
                me.$window
                    .find('.buttons .btn')
                    .not($(this))
                    .removeClass('disabled');

                me.$window.find('.buttons .btn.print-button').hide();

                me.$root
                    .find('#charge-preview-layer')
                    .fadeOut(250, function () {
                        me.$root
                            .find('#charge-preview-layer .tabcontainer')
                            .tabs('destroy');
                        me.$root
                            .find(
                                '#charge-preview-layer .tabcontainer .tablist'
                            )
                            .empty();
                        me.$root
                            .find(
                                '#charge-preview-layer .tabcontainer .tab-content'
                            )
                            .remove();
                    });
            } else {
                me.$window
                    .find('.buttons .btn:not(.hidden)')
                    .not($(this))
                    .addClass('disabled');
                //Turn on preview mode.
                $(this).addClass('preview-on').text('Exit Preview');
                me.$window.find('.buttons .btn.print-button').show();

                me.$root.find('#charge-preview-layer').show();

                me.previewChargesHtml(me.$root).done(function (r) {
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

                    if (r.Data && r.Data.length > 0) {
                        //Generate the preview and send the output ($target) to tab iframe.
                        //create tab container
                        for (var x = 0; x < r.Data.length; x++) {
                            var $ul = $(
                                '<li><a href="#tab-{0}">{1}</a></li>'.format(
                                    x,
                                    'Invoice {0}'.format(x + 1)
                                )
                            );

                            var $content = $(
                                '<div id="tab-{0}" data-index="{0}" class="tab-content"><div style="margin-left:40px; height:400px;"><iframe id="charge-preview-frame-{0}" name="charge-preview-frame-{0}" style="margin-top:20px;height: 100%; width: 100%;"></iframe></div></div>'.format(
                                    x
                                )
                            );

                            me.$root
                                .find('#charge-preview-layer .tablist')
                                .append($ul);
                            me.$root
                                .find('#charge-preview-layer .tablist')
                                .after($content);
                        }

                        var loadContent = function (idx, $panel) {
                            gmgps.cloud.helpers.general.openPublisher({
                                $target: $panel.find(
                                    '#charge-preview-frame-{0}'.format(idx)
                                ),
                                settings: {
                                    brandId: r.Data[idx].BrandId,
                                    branchId: r.Data[idx].BranchId,
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
                                    templateId: r.Data[idx].TemplateId,
                                    printFormat: 0,
                                    sampleDocumentContent: escapeHtml(
                                        r.Data[idx].Content
                                    )
                                }
                            });
                        };

                        me.$root
                            .find('#charge-preview-layer .tabcontainer')
                            .tabs({
                                create: function (event, ui) {
                                    var idx = parseInt(ui.panel.data('index'));
                                    loadContent(idx, ui.panel);
                                },
                                beforeActivate: function (event, ui) {
                                    var idx = parseInt(
                                        ui.newPanel.data('index')
                                    );
                                    loadContent(idx, ui.newPanel);
                                }
                            });
                    }
                });
            }
        });

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

        me.$root.find('select').not('.opt-standard').customSelect();

        (this.action = function (onComplete, $btn) {
            if ($btn.hasClass('disabled')) {
                return true;
            }

            $btn.addClass('disabled');

            //Init validation engine.
            me.$root
                .addClass('opt-validate')
                .validationEngine({ scroll: false });

            var valid = me.$root.validationEngine('validate');

            if (valid) {
                valid =
                    me.$root.find('#Charge_MgmtFee_MgmtPercent').val() !==
                        '0' &&
                    me.$root.find('#Charge_MgmtFee_MgmtPercent').val() !== '0';
                if (!valid) {
                    me.$root
                        .find('.selecteditem')
                        .validationEngine(
                            'showPrompt',
                            'Please enter a commission percentage',
                            'x',
                            'topLeft',
                            true
                        );
                }
            }

            me.$root
                .find('#ShowAccountBalance')
                .val(me.$root.find('#ShowAccountBalance').is(':checked'));

            if (valid) {
                this.raiseCharges(me.$root.find('.raise-charges')).done(
                    function (r) {
                        if (r && r.Data) {
                            gmgps.cloud.helpers.general.generateAccountingDocuments(
                                r.DocumentRequestIdList
                            );
                            onComplete(false);
                            return true;
                        } else {
                            $btn.removeClass('disabled');
                        }
                    }
                );
            } else {
                $btn.removeClass('disabled');
            }
            return false;
        }),
            (this.raiseCharges = function ($root) {
                return new gmgps.cloud.http(
                    "raiseChargesHandler-raiseCharges"
                ).ajax({
                    args: {
                        chargeInvoiceViewModel:
                            createForm($root).serializeObject()
                    },
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: '/Accounting/RaiseCharges'
                });
            }),
            (this.previewChargesHtml = function ($root) {
                var $form = createForm($root);

                return new gmgps.cloud.http(
                    "raiseChargesHandler-previewChargesHtml"
                ).ajax({
                    args: $form.serializeObject(),
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: '/Accounting/PreviewChargeHtml'
                });
            });

        this.previewChargesDocument = function ($root) {
            var $form = createForm($root, '/Accounting/PreviewChargeDocuments');

            var ua = window.navigator.userAgent;

            var isIE = ua.indexOf('MSIE ') > -1 || ua.indexOf('Trident/') > -1;

            if (!isIE) {
                $form.attr('target', '_blank');
            }

            $form.appendTo('body').submit().remove();
        };
    },

    show: function () {
        var me = this;

        new gmgps.cloud.ui.controls.window({
            windowId: 'RaiseCharges',
            title: me.title,
            controller: me.controller,
            url: 'Accounting/GetRaisedCharges',
            urlArgs: {
                linkedTypeId: me.linkedTypeId,
                linkedId: me.linkedId,
                transactions: me.chargeIdList
            },
            data: me,
            post: true,
            complex: true,
            width: 950,
            draggable: true,
            modal: true,
            actionButton: 'Raise Selected...',
            cancelButton: 'Close',
            onAction:
                me.onComplete ||
                function () {
                    return false;
                },
            onCancel: function () {
                return false;
            },
            postActionCallback: function (r) {
                me.onComplete(r);
            }
        });
    }
};
