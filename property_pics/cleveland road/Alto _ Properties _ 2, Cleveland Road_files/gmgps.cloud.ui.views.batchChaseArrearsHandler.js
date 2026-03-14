gmgps.cloud.ui.views.batchChaseArrearsHandler = function (args) {
    var me = this;

    me.branchIds = args.branchIds;
    me.userId = args.userId;

    me.sectionId = args.sectionId;
    me.sourceId = args.sourceId;

    me.onComplete = args.onComplete;
    me.onCancel = args.onCancel;

    me.title = args.title;

    me.includeHidden = args.includeHidden;

    return me.init();
};

gmgps.cloud.ui.views.batchChaseArrearsHandler.prototype = {
    init: function () {
        var me = this;

        return me;
    },

    controller: function (args) {
        var me = this;

        me.documentService = new gmgps.cloud.ui.publishing.DocumentService();

        me.closeWindowHandler = args.closeMyWindow;

        me.paymentsMadeIds = [];
        me.singlePayDialogVisible = false;

        me.params = args.data;
        me.$root = args.$root;
        me.$window = args.$window;

        me.includeHidden = args.data.includeHidden;

        me.$window.find('.top').css('background-color', '#3399ff !important');
        me.$window.find('.middle').css('background-color', '#ffffff');

        me.$window
            .find('.bottom .buttons .action-button')
            .after(
                '<div class="payment-counts"><span class="payments">0</span> Recipients</div>'
            );

        me.$window
            .find('.top .title')
            .after(
                '<div class="cancel-payments-screen"><span class="fa fa-times"></span></div>'
            );

        me.$window.on('click', '.cancel-payments-screen', function () {
            me.closeWindowHandler();
        });

        (this.initContent = function () {
            me.$root.find('select').customSelect();

            me.$root.find('#ArrearsChasingLoadedTable').bootstrapTable({
                onPostBody: function () {
                    me.setupSnazzyCheckboxes();
                    me.updateCounts();
                    me.resizeTableScrollRegion();
                }
            });
        }),
            (this.searchWithinRows = function (searchTerm) {
                if (searchTerm.length > 0) {
                    var $rows = me.$root.find('.arrears-payment-row');

                    $rows.each(function () {
                        var searchIndex = $(this).attr('data-search-index');

                        if (searchIndex.indexOf(searchTerm) < 0) {
                            $(this).addClass('hidden-by-search');
                        } else {
                            $(this).removeClass('hidden-by-search');
                        }
                    });
                } else {
                    me.$root
                        .find('.arrears-payment-row')
                        .removeClass('hidden-by-search');
                }
            }),
            (this.setWindowTitle = function () {
                var dateRange = '';
                switch (args.data.sectionId) {
                    case 4: {
                        dateRange = ' : Any Date';
                        break;
                    }
                    case 0: {
                        dateRange = ' : 0 - 7 Days';
                        break;
                    }
                    case 1: {
                        dateRange = ' : 8 - 14 Days';
                        break;
                    }
                    case 2: {
                        dateRange = ' : 15 - 30 Days';
                        break;
                    }
                    case 3: {
                        dateRange = ' : 31+ Days';
                        break;
                    }
                }

                var arrearsType =
                    args.data.sourceId === 0 ? 'Tenancy' : 'Contact';

                me.$window
                    .find('.title')
                    .text(arrearsType + ' Arrears ' + dateRange);
            }),
            (this.setupSnazzyCheckboxes = function () {
                me.$root
                    .find('.arrear-selected')
                    .checkboxpicker({
                        html: true,
                        offLabel: '<span class="glyphicon glyphicon-remove">',
                        onLabel: '<span class="glyphicon glyphicon-ok">'
                    })
                    .on('change', function () {
                        var checked =
                            $(this).prop('checked') === true;

                        var $row;

                        if (checked) {
                            $row = $(this).closest('tr');
                            $row.addClass('tr-selected');
                        } else {
                            $row = $(this).closest('tr');
                            $row.removeClass('tr-selected');
                        }

                        me.updateCounts();
                    });

                me.$root
                    .find('#sel-all-payments')
                    .checkboxpicker({
                        html: true,
                        offLabel: '<span class="glyphicon glyphicon-remove">',
                        onLabel: '<span class="glyphicon glyphicon-ok">'
                    })
                    .on('change', function () {
                        var masterChecked =
                            $(this).prop('checked') === true;

                        if (masterChecked) {
                            me.$root
                                .find('tr:not(.hidden-by-search) input.arrear-selected')
                                .prop('checked', true)
                                .closest('tr')
                                .addClass('tr-selected');
                        } else {
                            me.$root
                                .find('.arrear-selected')
                                .prop('checked', false)
                                .closest('tr')
                                .removeClass('tr-selected');
                        }

                        me.updateCounts();
                    });
            }),
            (this.resizeTableScrollRegion = function () {
                var initialHeight = $(window).height() - 120;
                me.$window.css('height', initialHeight);

                var initialWidth = $(window).width() - 60;
                me.$window.css('width', initialWidth);

                me.$window.css('top', '40px');
                me.$window.css('left', '25px');

                var windowHeight = me.$window.height();

                var widgetWindowHeight = windowHeight - 40;
                widgetWindowHeight += 'px';

                var scrollRegionHeight = windowHeight - 110;
                if (me.includeHidden) {
                    scrollRegionHeight -= 40;
                }
                scrollRegionHeight += 'px';

                var tableContainerHeight = windowHeight - 100;
                if (me.includeHidden) {
                    tableContainerHeight -= 40;
                }
                tableContainerHeight += 'px';

                me.$root.find('.widget-body').css('height', widgetWindowHeight);
                me.$root.find('.widget-body').css('margin-top', '-10px');
                me.$root
                    .find('.fixed-table-body')
                    .css('height', scrollRegionHeight);
                me.$root
                    .find('.fixed-table-container')
                    .css('height', tableContainerHeight)
                    .css('overflow', 'hidden');

                me.$root
                    .find('#ArrearsChasingLoadedTable')
                    .bootstrapTable('refresh');
            }),
            (this.paySingleItem = function ($row) {
                if (!me.singlePayDialogVisible) {
                    me.singlePayDialogVisible = true;

                    var linkedTypeId =
                        args.data.sourceId === 0
                            ? C.ModelType.Tenancy
                            : C.ModelType.Contact;
                    var linkedId =
                        args.data.sourceId === 0
                            ? $row.attr('data-tenancyid')
                            : $row.attr('data-contactid');

                    var address = $row.attr('data-address');

                    new gmgps.cloud.ui.views.receiptsHandler({
                        linkedTypeId: linkedTypeId,
                        linkedId: linkedId,
                        title: 'Receipt : ' + address,
                        onComplete: function () {
                            // Remove row from selected items prior to table re-load
                            $row.removeClass('tr-selected');
                            me.refreshData();
                            me.singlePayDialogVisible = false;
                        },
                        onCancel: function () {
                            me.singlePayDialogVisible = false;
                        }
                    }).show();
                }
            }),
            (this.updateCounts = function () {
                var selectedLandlords = me.$root.find(
                    '.arrear-selected:checked'
                ).length;
                me.updateActionButton(selectedLandlords);
                me.updatePayableItems(selectedLandlords);
            }),
            (this.updateActionButton = function (counter) {
                if (counter > 0) {
                    me.$window
                        .find('.bottom .buttons .action-button')
                        .text('Create Document(s)')
                        .removeClass('grey')
                        .addClass('bgg-property');
                } else {
                    me.$window
                        .find('.bottom .buttons .action-button')
                        .text('Create Document(s)')
                        .addClass('grey')
                        .removeClass('bgg-property');
                }
            }),
            (this.updatePayableItems = function (counter) {
                if (counter > 0) {
                    me.$window
                        .find('.bottom .buttons .payment-counts .payments')
                        .text(counter);
                    me.$window.find('.bottom .buttons .payment-counts').show();
                } else {
                    me.$window.find('.bottom .buttons .payment-counts').hide();
                }
            }),
            (this.action = function (onComplete, $btn) {
                $btn.lock();

                if (!$btn.hasClass('bgg-property')) {
                    $btn.unlock();
                    return false;
                } else {
                    if (me.validate() === false) {
                        $btn.unlock();
                        return false;
                    }

                    me.processSelectedArrears().done(function (r) {
                        if (r && r.Data) {
                            if (r.Data.length > 0) {
                                me.documentService.print(r.Data, true);
                            }

                            onComplete(false);
                        }

                        $btn.unlock();
                    });
                }

                return false;
            }),
            (this.validate = function () {
                var $selectedTemplate = me.$root.find('#SelectedTemplateId');
                var selectedTemplateId = parseInt($selectedTemplate.val());

                if (isNaN(selectedTemplateId)) {
                    $selectedTemplate.validationEngine(
                        'showPrompt',
                        'Please choose a letter template.',
                        'x',
                        'bottomLeft',
                        true
                    );
                    return false;
                }

                return true;
            }),
            (this.clearSearchBeforePosting = function () {
                me.$root
                    .find('#PMHomeLoadedTable')
                    .bootstrapTable('resetSearch', '');
            }),
            (this.processSelectedArrears = function () {
                var linkedTypeId = me.$root.find('#LinkedTypeId').val();

                var arrearsItems = [];

                $.each(
                    me.$root.find('#ArrearsChasingLoadedTable TR.tr-selected'),
                    function (index, value) {
                        var $v = $(value);

                        arrearsItems.push({
                            RecipientContactId: $v.data('contactid'),
                            LinkedId: $v.data('modelid'),
                            LinkedTypeId: linkedTypeId
                        });
                    }
                );

                var model = {
                    SelectedArrearsSectionId: me.$root
                        .find('#SelectedArrearsSectionId')
                        .val(),
                    SelectedTemplateId: me.$root
                        .find('#SelectedTemplateId')
                        .val(),
                    SentByUserId: me.$root.find('#SentByUserId').val(),
                    DeliveryMethod: me.$root
                        .find('input[name=ContactDeliveryMethod]:checked')
                        .val(),
                    LinkedTypeId: linkedTypeId,
                    ArrearsItems: arrearsItems
                };

                return new gmgps.cloud.http(
                    "batchChaseArrearsHandler-processSelectedArrears"
                ).ajax({
                    args: {
                        model: model
                    },
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: '/PMHome/GenerateArrearsDocuments'
                });
            }),
            (this.currencyWithCommas = function (x) {
                return '£' + x.toFixed(2).replace(/(\d)(?=(\d{3})+\.)/g, '$1,');
            }),
            (this.refreshData = function () {
                new gmgps.cloud.http(
                    "batchChaseArrearsHandler-refreshData"
                ).ajax(
                    {
                        args: {
                            branchIds: me.params.branchIds,
                            userId: me.params.userId,
                            section: args.data.sectionId,
                            source: args.data.sourceId
                        },
                        complex: true,
                        dataType: 'html',
                        type: 'post',
                        url: '/PMHome/GetArrearsToChaseDetail'
                    },
                    function (response) {
                        me.$root
                            .find('#batch-pay-arrears .arrears-list')
                            .html('')
                            .append(response);

                        me.initContent();
                    }
                );
            }),
            (this.displayInfoMessage = function () {
                var me = this;

                if (me.includeHidden) {
                    me.$window.find('.info-message').show();
                }
            }),
            me.$root.on('click', 'tr .checkbox-item', function (e) {
                e.stopPropagation();
                return false;
            });

        me.$root.on('keyup', '#SearchTerm', function () {
            var inputVal = $(this).val().replace(/[\s',-]/g, '').toUpperCase();
            me.searchWithinRows(inputVal);
        });

        me.$root.on('click', '.detail-toggle', function (e) {
            e.stopPropagation();
            var $detailrow = $(this).closest('tr').next('tr');

            var thisRowExpanded = $detailrow.hasClass('show-detail');

            if (thisRowExpanded) {
                $detailrow.removeClass('show-detail');
            } else {
                me.$root.find('tr').removeClass('show-detail');
                $detailrow.addClass('show-detail');
            }
        });

        $(window).on('resize', function () {
            me.resizeTableScrollRegion();
        });

        me.$root.on('click', '.arrears-payment-row', function () {
            me.paySingleItem($(this));
        });

        // Delay table resize due to Window fade in effect
        setTimeout(function () {
            me.initContent();
        }, 100);

        me.updateCounts();

        me.setWindowTitle();

        me.displayInfoMessage();
    },

    show: function () {
        var me = this;

        var initialWidth = $(window).width() - 60;

        new gmgps.cloud.ui.controls.window({
            title: me.title,
            controller: me.controller,
            url: 'PMHome/GetArrearsChasingSummary',
            urlArgs: {
                branchIds: me.branchIds,
                userId: me.userId,
                section: me.sectionId,
                source: me.sourceId,
                includeHidden: me.includeHidden
            },
            data: me,
            post: true,
            complex: true,
            width: initialWidth,
            draggable: true,
            modal: true,
            cancelButton: 'Close',
            actionButton: 'Create Document(s)',
            //onAction: me.onComplete || function () {
            //	return false;
            //},
            onCancel:
                me.onCancel ||
                function () {
                    return false;
                }
        });
    }
};
