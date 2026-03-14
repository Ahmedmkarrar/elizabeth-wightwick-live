gmgps.cloud.ui.views.pendingReportsHandler = function (args) {
    var me = this;
    me.$root = args.$root;
    me.control = args.control;

    return me;
};
gmgps.cloud.ui.views.pendingReportsHandler.prototype = {
    cancelPendingReport: function () {},

    openPendingReport: function (action, url) {
        if (action === 'post') {
            // eslint-disable-next-line no-undef
            var $form = this.createPostbackForm($root, url);

            var ua = window.navigator.userAgent;

            var isIE = ua.indexOf('MSIE ') > -1 || ua.indexOf('Trident/') > -1;

            if (!isIE) {
                $form.attr('target', '_blank');
            }

            $form.appendTo('body').submit().remove();
        } else if (action === 'get') {
            window.open(url);
        }
    },

    initHandlers: function () {
        var me = this;

        me.$list = $(document).find('#pending-documentlist');

        me.$list.off();

        me.$list.on('click', '.btn-action', function () {
            var $this = $(this);

            var url = $this.attr('data-targeturl');

            var id = parseInt($this.attr('data-pendingreportid'));
            var generationStatus = parseInt(
                $this.attr('data-generationstatus')
            );

            switch (generationStatus) {
                case C.GenerationStatusType.ReadyToGenerate:
                    me.remove(id, $this.closest('tr'));
                    break;
                case C.GenerationStatusType.Success:
                    window.open(url);
                    break;
            }
        });

        me.$list.on('click', '.removeItem', function () {
            var $this = $(this);
            me.remove(
                parseInt($this.attr('data-pendingreportid')),
                $this.closest('tr')
            );
        });

        me.$list.on('click', '.openItem', function () {
            var currentUserId = $('#_userid').val();
            var gaOptions = {};
            alto.optimizelyClient.trackEvent(
                'request_report_open_triggered',
                currentUserId
            );
            var isRequestReportDropdownFeatureEnabled =
                alto.optimizelyClient.isFeatureEnabled(
                    'request_report_dropdown',
                    currentUserId
                );
            if (isRequestReportDropdownFeatureEnabled) {
                var variationKey = alto.optimizelyClient.getVariation(
                    'request_report_dropdown_experiement',
                    currentUserId
                );
                gaOptions = {
                    Alto_AB_CustD: variationKey
                };
            }
            googleAnalytics.sendEvent(
                'navbar_tools',
                'button_click',
                'pending_reports_open',
                gaOptions
            );
        });
    },

    hideWhenEmpty: function () {
        var me = this;

        var rowCount = me.$list.find('table tr.detail').length;

        if (rowCount === 0) {
            var api = me.$root.qtip('api');
            api.hide();
            me.control.hide();
        }
    },

    show: function (highlightLatest) {
        var me = this;
        if (shell.isNavigationMfeEnabled) {
            me.initHandlers();
        } else {
            me.$root.qtip({
                show: {
                    ready: true
                },
                hide: 'unfocus',
                position: {
                    viewport: $(window),
                    effect: false,
                    my: 'top center',
                    at: 'bottom center',
                    adjust: {
                        y: 5
                    }
                },
                content: {
                    text: function (event, api) {
                        api.elements.content.html(
                            '<div style="background-image:url(/Content/Media/Images/Gui/Spinner/spin3.gif); width:36px; height:12px; margin:10px auto;background-color: transparent;"></div>'
                        );
                        api.set('content.title', 'Report Requests');

                        return $.ajax({
                            url: 'Property/GetPendingReports',
                            type: 'POST',
                            dataType: 'json',
                            headers: {
                                'X-Component-Name': 'pendingReportsHandler-GetPendingReports',
                                'Alto-Version': alto.version
                            },
                            data: {}
                        }).then(function (r) {
                            api.set(
                                'content.title',
                                '<div class="title-text">Report Requests</div><div title="Close" class="closeTip" ga-category="navbar_tools" ga-label="pending_reports_close"></div>'
                            );
                            api.elements.content.html(r.Data);

                            var tooltip = api.elements.tooltip;

                            tooltip.find('.closeTip').one('click', function () {
                                api.hide();
                            });

                            me.initHandlers();

                            if (highlightLatest) {
                                $(document)
                                    .find(
                                        '.qtip #pending-documentlist table tbody tr:first'
                                    )
                                    .effect(
                                        'highlight',
                                        { color: '#5db2ff' },
                                        1500
                                    );
                            }
                        });
                    }
                },
                style: {
                    classes: 'pending-documentqtip',
                    tip: {
                        corner: true,
                        height: 14,
                        width: 24
                    }
                },
                events: {
                    hide: function (e, a) {
                        a.destroy(true);
                    }
                }
            });
        }
    },

    remove: function (id, $row) {
        var me = this;

        return new gmgps.cloud.http("pendingReportsHandler-remove")
            .ajax({
                args: {
                    id: id
                },
                dataType: 'json',
                complex: true,
                type: 'post',
                url: 'Publisher/CompletePendingReportRequest'
            })
            .done(function () {
                $row.remove();
                me.hideWhenEmpty();
            });
    }
};
