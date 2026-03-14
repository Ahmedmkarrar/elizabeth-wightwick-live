gmgps.cloud.ui.views.contactperiodstatement = function (args) {
    var me = this;
    me.cfg = args;
    me.$root = args.$root;
    me.$window = null;
    me.init(args);
    me.closeMyWindow = args.closeMyWindow;

    return true;
};

gmgps.cloud.ui.views.contactperiodstatement.prototype = {
    init: function () {
        var me = this;

        me.$window = me.$root.closest('.window');

        me.hideError();

        me.$root.find('.date-picker').each(function (i, v) {
            $(v).datepicker({
                numberOfMonths: 2,
                showButtonPanel: true,
                dateFormat: 'dd/mm/yy',
                maxDate: new Date(),
                onSelect: function () {
                    $(this).change();
                }
            });
        });

        me.$window
            .find('.bottom .buttons')
            .prepend(
                '<div class="btn bgg-grey print-report" style="min-width: 100px; float: left;"><div class="fa fa-print"></div>Print Preview</div>'
            );

        me.$window
            .find('.action-button')
            .addClass('bgg-property')
            .addClass('disabled');
        me.$window.find('.print-report').hide();

        me.$window.on('click', '.print-report', function () {
            if (me.validate()) {
                me.printReport();
            }
        });

        me.$window.on('change', '.date-picker', function () {
            if (me.validate()) {
                me.previewReport();
            } else {
                me.removeStatementPreview();
            }
        });

        me.$window.on('change', '.tickbox-hidden', function () {
            if (me.validate()) {
                me.previewReport();
            } else {
                me.removeStatementPreview();
            }
        });
    },

    action: function () {
        var me = this;

        if (
            me.validate() &&
            !me.$window.find('.action-button').hasClass('disabled')
        ) {
            me.createReport();
        } else {
            return false;
        }
    },

    cancel: function (onComplete) {
        onComplete();
    },

    getFieldValues: function () {},

    validate: function () {
        var me = this;
        var $root = me.$root.find('.controls-area');

        var fromDate = $root.find('#adhoc-fromdate').datepicker('getDate');
        var toDate = $root.find('#adhoc-todate').datepicker('getDate');

        if ($root.find('#adhoc-fromdate').val().length === 0) {
            me.showError('Please supply a From Date for the report');
            return false;
        }

        if ($root.find('#adhoc-todate').val().length === 0) {
            me.showError('Please supply a To Date for the report');
            return false;
        }

        if (fromDate > toDate) {
            me.showError('The From Date can not be after the To Date');
            return false;
        }

        me.hideError();
        return true;
    },

    showError: function (message) {
        var me = this;
        me.$root.find('.error-info > .message').text(message);
        me.$root.find('.error-info').fadeIn(300);
    },

    hideError: function () {
        var me = this;
        me.$root.find('.error-info').fadeOut(200);
    },

    previewReport: function () {
        var me = this;

        var groupId = parseInt(
            me.$root.find('#form-root').attr('data-groupid')
        );
        var branchId = parseInt(
            me.$root.find('#form-root').attr('data-branchid')
        );
        var contactId = parseInt(
            me.$root.find('#form-root').attr('data-contactid')
        );

        var fromDate = me.$root.find('#adhoc-fromdate').val();
        var toDate = me.$root.find('#adhoc-todate').val();
        var includenrltax = me.$root
            .find('#adhoc-includenrltax')
            .is(':checked');

        new gmgps.cloud.http("contactperiodstatement-previewReport").ajax(
            {
                args: {
                    groupId: groupId,
                    branchId: branchId,
                    contactId: contactId,
                    DateFrom: fromDate,
                    DateTo: toDate,
                    IncludeNrlTax: includenrltax
                },
                dataType: 'json',
                complex: true,
                type: 'post',
                url: '/Accounting/PreviewPeriodStatementHtml'
            },
            function (response) {
                if (response.Data && response.Data.Content.length > 0) {
                    me.presentStatementPreview(response);
                } else {
                    me.showError(
                        'Report not available for the selected date range'
                    );
                    me.removeStatementPreview();
                }
            }
        );
    },

    presentStatementPreview: function (r) {
        var me = this;
        me.$root.find('.preview-ready').hide();

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
            return String(string).replace(/[&<>"'\/]/g, function (s) {
                return entityMap[s];
            });
        };

        if (r && r.Data) {
            gmgps.cloud.helpers.general.openPublisher({
                $target: me.$window.find(
                    '#contact-period-report-preview-frame'
                ),
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
                    templateType: C.DocumentTemplateType.PublisherStationery,
                    templateId: r.Data.TemplateId,
                    printFormat: 0,
                    sampleDocumentContent: escapeHtml(r.Data.Content)
                }
            });
        }

        me.$window.find('.print-report').show();
        me.$window.find('.action-button').removeClass('disabled');
    },

    removeStatementPreview: function () {
        var me = this;
        me.$root
            .find('#contact-period-report-preview-frame')
            .contents()
            .find('html')
            .html('');
        me.$root.find('.preview-ready').show();
        me.$window.find('.action-button').addClass('disabled');
        me.$window.find('.print-report').hide();
    },

    createReport: function () {
        var me = this;

        var groupId = parseInt(
            me.$root.find('#form-root').attr('data-groupid')
        );
        var branchId = parseInt(
            me.$root.find('#form-root').attr('data-branchid')
        );
        var contactId = parseInt(
            me.$root.find('#form-root').attr('data-contactid')
        );

        var fromDate = me.$root.find('#adhoc-fromdate').val();
        var toDate = me.$root.find('#adhoc-todate').val();
        var includenrltax = me.$root
            .find('#adhoc-includenrltax')
            .is(':checked');

        new gmgps.cloud.http("contactperiodstatement-createReport")
            .ajax({
                args: {
                    groupId: groupId,
                    branchId: branchId,
                    contactId: contactId,
                    DateFrom: fromDate,
                    DateTo: toDate,
                    IncludeNrlTax: includenrltax
                },
                dataType: 'json',
                complex: true,
                type: 'post',
                url: '/Accounting/PeriodStatement'
            })
            .done(function (r) {
                if (r && r.Data) {
                    gmgps.cloud.helpers.general.generateAccountingDocuments(
                        r.DocumentRequestIdList
                    );
                    gmgps.cloud.helpers.general.promptForLetters({
                        eventHeaders: r.UpdatedEvents
                    });
                    return true;
                } else {
                    return false;
                }
            });
    },

    printReport: function () {
        var me = this;

        var groupId = parseInt(
            me.$root.find('#form-root').attr('data-groupid')
        );
        var branchId = parseInt(
            me.$root.find('#form-root').attr('data-branchid')
        );
        var contactId = parseInt(
            me.$root.find('#form-root').attr('data-contactid')
        );

        var fromDate = me.$root.find('#adhoc-fromdate').val();
        var toDate = me.$root.find('#adhoc-todate').val();
        var includenrltax = me.$root
            .find('#adhoc-includenrltax')
            .is(':checked');

        var formObj = {
            groupId: groupId,
            branchId: branchId,
            contactId: contactId,
            DateFrom: fromDate,
            DateTo: toDate,
            IncludeNrlTax: includenrltax
        };

        var $form = $(
            '<form method="POST" action="/Accounting/PreviewPeriodStatementDocument/"></form>'
        );

        $.each(formObj, function (key, value) {
            $("<input type='text' value='" + value + "' >")
                .attr('id', key)
                .attr('name', key)
                .appendTo($form);
        });

        var ua = window.navigator.userAgent;
        var isIE = ua.indexOf('MSIE ') > -1 || ua.indexOf('Trident/') > -1;
        if (!isIE) {
            $form.attr('target', '_blank');
        }

        $form.appendTo('body').submit().remove();
    }
};
