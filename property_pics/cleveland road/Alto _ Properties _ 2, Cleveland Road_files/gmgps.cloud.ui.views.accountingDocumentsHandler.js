gmgps.cloud.ui.views.accountingDocumentsHandler = function () {
    var me = this;
    return me;
};

gmgps.cloud.ui.views.accountingDocumentsHandler.prototype = {
    show: function () {
        var me = this;

        new gmgps.cloud.ui.controls.window({
            title: 'Accounting Documents Print Requests',
            windowId: 'accountingDocsModal',
            controller: me.controller,
            url: 'Accounting/GetAccountingDocuments',
            post: true,
            complex: true,
            width: 950,
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
    },

    controller: function (args) {
        var me = this;

        me.params = args.data;
        me.$root = args.$root;
        me.$window = args.$window;

        this.action = function (onComplete) {
            onComplete(false);
        };

        this.init = function () {
            me.$root.find('.tabs').tabs({
                beforeLoad: function (event, ui) {
                    if (parseInt(ui.tab.attr('data-loaded')) === 1) {
                        event.preventDefault();
                        return;
                    }

                    ui.jqXHR.done(function () {
                        ui.tab.attr('data-loaded', 1);
                    });

                    var excludePrinted = true;
                    var ownership = 0;
                    var runType = 0;

                    var $tab = ui.panel.find('.tab');

                    if ($tab.length === 1) {
                        excludePrinted =
                            parseInt($tab.attr('data-excludeprinted')) === 1
                                ? true
                                : false;
                        ownership = parseInt($tab.attr('data-ownership'));
                        runType = parseInt($tab.attr('data-runtypes'));
                    }

                    ui.ajaxSettings.url +=
                        '&ownership={0}&excludeprinted={1}&runtype={2}'.format(
                            ownership,
                            excludePrinted,
                            runType
                        );

                    ui.ajaxSettings.type = 'POST';
                    ui.ajaxSettings.dataTypes = ['html'];
                    ui.ajaxSettings.dataFilter = function (data) {
                        return JSON.parse(data).Data;
                    };
                },
                load: function (event, ui) {
                    me.initTabHandlers(
                        ui.tab,
                        ui.panel.find('.tab'),
                        parseInt(ui.tab.data('tab-id'))
                    );
                }
            });

            me.$root.find('select').customSelect();
        };

        this.initTabHandlers = function ($tab, $tabContent, tabIndex) {
            $tabContent.off();

            $tabContent.find('select').customSelect();

            $tabContent.on(
                'change',
                '.table-content input.tickbox-hidden',
                function () {
                    me.setDownloadButtonState($tabContent);
                }
            );

            $tabContent.on('change', '.request-owner', function () {
                $tabContent.attr('data-ownership', $(this).val());
                me.refreshTabContent($tab, tabIndex);
            });

            $tabContent.on('change', '.request-types', function () {
                $tabContent.attr('data-excludeprinted', $(this).val());
                me.refreshTabContent($tab, tabIndex);
            });

            $tabContent.on('change', '.request-runtype', function () {
                $tabContent.attr('data-runtypes', $(this).val());
                me.refreshTabContent($tab, tabIndex);
            });
            $tabContent.on(
                'change',
                '.table-content  input.subitem',
                function () {
                    var $this = $(this);
                    var $row = $this.closest('.items').prev('.expandable');
                    var $rowcheck = $row.find('input.tickbox-hidden');
                    var $subItemSelectedCount = $row
                        .next()
                        .find('input.subitem:checked').length;

                    if ($subItemSelectedCount === 0) {
                        $rowcheck.prop('checked', false).trigger('prog-change');
                    } else {
                        $rowcheck.prop('checked', true).trigger('prog-change');
                    }

                    me.setDownloadButtonState($tabContent);
                }
            );

            $tabContent.on('click', 'tr.expandable', function (e) {
                if (e.target.tagName === 'TD') {
                    $(this).next().find('.expand').slideToggle('fast');
                }
            });

            $tabContent.on(
                'click',
                'tbody tr:not(.expandable,.items)',
                function (e) {
                    if (e.target.tagName === 'TD') {
                        $(this)
                            .find('.tickbox-hidden')
                            .prop(
                                'checked',
                                !$(this).find('.tickbox-hidden').prop('checked')
                            )
                            .trigger('change');
                    }
                }
            );

            $tabContent.on(
                'change',
                'tbody tr.expandable input.tickbox-hidden',
                function () {
                    var $this = $(this);
                    $this
                        .closest('tr')
                        .next()
                        .find('.expand .tickbox-hidden')
                        .prop('checked', $this.prop('checked'))
                        .trigger('prog-change');
                    me.setDownloadButtonState($tabContent);
                }
            );

            $tabContent.on(
                'change',
                'thead tr th input.tickbox-hidden',
                function () {
                    $tabContent
                        .find('.table-content tbody tr .tickbox-hidden')
                        .prop('checked', $(this).prop('checked'))
                        .trigger('prog-change');
                    me.setDownloadButtonState($tabContent);
                }
            );

            $tabContent.on(
                'click',
                '.download-button:not(.disabled)',
                function () {
                    var requestIdList = [];

                    $.map(
                        $tabContent.find(
                            '.table-content .tickbox-hidden[data-requestid!="0"]:checked'
                        ),
                        function (v) {
                            requestIdList.push(
                                parseInt($(v).data('requestid'))
                            );
                        }
                    );

                    if (requestIdList.length > 0) {
                        me.getRequestedDocuments(requestIdList, $tab, tabIndex);
                    }
                }
            );

            me.setDownloadButtonState($tabContent);
        };

        this.setPrintRequested = function (requestIdList) {
            return new gmgps.cloud.http(
                "accountingDocumentsHandler-setPrintRequested"
            ).ajax({
                args: {
                    requestIdList: requestIdList
                },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/Accounting/SetDocumentsRequested'
            });
        };

        this.setDownloadButtonState = function ($tab) {
            var $downloadbtn = $tab.find('.download-button');
            var selectedDocumentCount = $tab.find(
                '.table-content .tickbox-hidden[data-requestid!="0"]:checked'
            ).length;

            selectedDocumentCount === 0
                ? $downloadbtn.addClass('disabled')
                : $downloadbtn.removeClass('disabled');

            $tab.find('.status-bar .doc-selectedcount').text(
                selectedDocumentCount
            );
        };

        this.getRequestedDocuments = function (requestIdList, $tab, tabIndex) {
            var ua = window.navigator.userAgent;

            var isIE = ua.indexOf('MSIE ') > -1 || ua.indexOf('Trident/') > -1;

            var $form = $(
                '<form action="Accounting/GetAccountingDocumentStream" method="post"></form>'
            );

            if (!isIE) {
                $form.attr('target', '_blank');
            }

            // dont supply target blank on IE - it leaves extra window open
            for (var x = 0; x < requestIdList.length; x++) {
                var $input =
                    '<input type="text" name="requestIdList[{0}]" value="{1}" />'.format(
                        x,
                        requestIdList[x]
                    );
                $form.append($input);
            }

            $form.appendTo('body').submit().remove();

            this.setPrintRequested(requestIdList).done(function () {
                me.refreshTabContent($tab, tabIndex);
            });
        };

        this.refreshTabContent = function ($tab, tabIndex) {
            $tab.attr('data-loaded', 0);
            me.refreshTab(tabIndex);
        };

        this.refreshTab = function (tabIndex) {
            me.$root.find('.tabs').tabs('load', tabIndex);
        };

        me.init();
    }
};
