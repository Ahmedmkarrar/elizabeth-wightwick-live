gmgps.cloud.ui.views.contactmtdincometaxcsv = function (args) {
    var me = this;
    me.cfg = args;
    me.$root = args.$root;
    me.$window = null;
    me.closeMyWindow = args.closeMyWindow;

    me.init(args);

    return true;
};

gmgps.cloud.ui.views.contactmtdincometaxcsv.prototype = {
    init: function () {
        var me = this;

        // 1. Cache Selectors
        me.$window = me.$root.closest('.window');
        me.$formRoot = me.$root.find('#form-root');
        me.$fromDate = me.$root.find('#mtd-fromdate');
        me.$toDate = me.$root.find('#mtd-todate');
        me.$errorInfo = me.$root.find('.mtd-error-info');
        me.$errorMessage = me.$errorInfo.find('.message');
        me.$actionButton = me.$window.find('.action-button');
        me.$previewHeader = me.$root.find('#mtd-income-tax-preview-header');
        me.$previewBody = me.$root.find('#mtd-income-tax-preview-body');

        // 2. State Setup
        me.isPreviewOnly = me.$formRoot.attr('data-preview-only') === 'true';
        me.hasRecipientEmail = me.$formRoot.attr('data-has-recipient-email') === 'true';
        me.hideError();

        // 3. UI Setup
        me.setupDatePickers();
        me.renderLayout();
        me.bindEvents();

        // 4. Initial Run
        if (me.isPreviewOnly && me.validate(false)) {
            me.previewAndDownload();
        }
    },

    setupDatePickers: function () {
        var me = this;
        me.$root.find('.mtd-date-picker').datepicker({
            numberOfMonths: 2,
            showButtonPanel: true,
            dateFormat: 'dd/mm/yy',
            maxDate: new Date(),
            onSelect: function () {
                $(this).change();
            }
        });
    },

    renderLayout: function () {
        var me = this;

        if (me.isPreviewOnly) {
            me.$root.find('.mtd-date-pickers, .mtd-info-message').hide();
            me.$actionButton.hide();
        } else {
            // Prepend Download Button
            var downloadBtnHtml = '<div class="btn bgg-grey download-preview" style="min-width: 150px; float: left;">' +
                '<div class="fa fa-download"></div>Download and preview</div>';
            me.$window.find('.bottom .buttons').prepend(downloadBtnHtml);
            me.$downloadButton = me.$window.find('.download-preview');
            me.updateDownloadButtonState(me.validate(false));
        }

        me.$actionButton.addClass('bgg-property');
        me.updateActionButtonState(me.validate(false) && me.hasRecipientEmail);
    },

    bindEvents: function () {
        var me = this;

        me.$window.on('click', '.download-preview', function () {
            if (me.$downloadButton && me.$downloadButton.hasClass('disabled')) return;
            if (me.validate()) {
                me.previewAndDownload();
            }
        });

        me.$root.on('change', '.mtd-date-picker', function () {
            var valid = me.validate(false);
            if (valid) {
                me.hideError();
            } else if (me.$errorInfo.is(':visible')) {
                me.validate(true);
            }
            me.updateActionButtonState(valid && me.hasRecipientEmail);
            me.updateDownloadButtonState(valid);
        });

        me.$root.on('click', '.mtd-add-email-link', function (e) {
            e.preventDefault();
            var contactId = me.$formRoot.attr('data-contactid');
            if (contactId) {
                // Navigate first so the Contact tab is selected before the modal closes
                window.location.hash = '#contacts/' + contactId + '/contact';
                me.closeMyWindow();
            }
        });
    },

    action: function () {
        if (this.validate() && this.hasRecipientEmail) {
            this.sendCsv();
        }
        return false;
    },

    cancel: function (onComplete) {
        onComplete();
    },

    validate: function (showErrors) {
        var me = this;
        if (showErrors === undefined) showErrors = true;

        var fromVal = me.$fromDate.val();
        var toVal = me.$toDate.val();

        if (!fromVal) {
            if (showErrors) return me.showError('Please supply a From Date for the export');
            return false;
        }
        if (!toVal) {
            if (showErrors) return me.showError('Please supply a To Date for the export');
            return false;
        }

        var fromDate = me.$fromDate.datepicker('getDate');
        var toDate = me.$toDate.datepicker('getDate');

        if (fromDate > toDate) {
            if (showErrors) return me.showError('The From Date can not be after the To Date');
            return false;
        }

        if (showErrors) me.hideError();
        return true;
    },

    updateActionButtonState: function (canSend) {
        this.$actionButton.toggleClass('disabled', !canSend);
    },

    updateDownloadButtonState: function (canDownload) {
        if (this.$downloadButton) {
            this.$downloadButton.toggleClass('disabled', !canDownload);
        }
    },

    showError: function (message) {
        this.$errorMessage.text(message);
        this.$errorInfo.fadeIn(300);
        return false;
    },

    hideError: function () {
        this.$errorInfo.fadeOut(200);
    },

    getFormData: function () {
        var me = this;
        var data = {
            groupId: parseInt(me.$formRoot.attr('data-groupid'), 10),
            branchId: parseInt(me.$formRoot.attr('data-branchid'), 10),
            contactId: parseInt(me.$formRoot.attr('data-contactid'), 10),
            DateFrom: me.$fromDate.val(),
            DateTo: me.$toDate.val()
        };

        if (me.isPreviewOnly) data.isPreviewOnly = true;
        return data;
    },

    previewAndDownload: function () {
        var me = this;
        var formData = me.getFormData();

        new gmgps.cloud.http("contactmtdincometaxcsv-preview").ajax({
            args: formData,
            dataType: 'json',
            complex: true,
            type: 'post',
            url: '/Contact/PreviewMtdIncomeTaxCsv'
        }, function (response) {
            if (response && response.Data && response.Data.Content) {
                me.$root.find('.mtd-preview-ready').hide();
                me.$root.find('.mtd-income-tax-preview-area').show();
                me.renderPreviewTable(response.Data.Content);
                if (!me.isPreviewOnly) {
                    me.downloadCsv(response.Data.Content, response.Data.FileName);
                }
            } else {
                me.showError('Report not available for the selected date range');
                me.clearPreviewAndShowPlaceholder();
            }
        });
    },

    clearPreviewAndShowPlaceholder: function () {
        var me = this;
        me.$previewHeader.empty();
        me.$previewBody.empty();
        me.$root.find('.mtd-income-tax-preview-area').hide();
        me.$root.find('.mtd-preview-ready').show();
    },

    renderPreviewTable: function (content) {
        var me = this;
        var lines = me.parseCsvLines(content);
        if (lines.length === 0) return;

        var header = me.parseCsvRow(lines[0]);
        var rows = lines.slice(1, 51).map(function (row) { return me.parseCsvRow(row); });

        me.$previewHeader.empty();
        me.$previewBody.empty();

        header.forEach(function (cell) {
            $('<th>').addClass('bgg-dark-grey').text(cell).appendTo(me.$previewHeader);
        });

        rows.forEach(function (row, index) {
            var $tr = $('<tr>').addClass('row ' + (index % 2 === 0 ? 'odd' : 'even'));
            row.forEach(function (cell) {
                $('<td>').text(cell).appendTo($tr);
            });
            me.$previewBody.append($tr);
        });
    },

    parseCsvLines: function (content) {
        return content.split(/\r?\n/).filter(function (l) { return l && l.trim(); });
    },

    parseCsvRow: function (line) {
        var result = [], current = '', inQuotes = false;
        for (var i = 0; i < line.length; i++) {
            var char = line[i];
            if (char === '"') {
                if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
                else { inQuotes = !inQuotes; }
            } else if (char === ',' && !inQuotes) {
                result.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        result.push(current);
        return result;
    },

    downloadCsv: function (content, fileName) {
        var safeFileName = fileName || 'contact-mtd-income-tax.csv';
        var blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });

        if (window.navigator && window.navigator.msSaveOrOpenBlob) {
            window.navigator.msSaveOrOpenBlob(blob, safeFileName);
            return;
        }

        var url = window.URL.createObjectURL(blob);
        var link = document.createElement('a');
        link.href = url;
        link.download = safeFileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        window.URL.revokeObjectURL(url);
    },

    sendCsv: function () {
        var me = this;
        new gmgps.cloud.http("contactmtdincometaxcsv-send").ajax({
            args: me.getFormData(),
            dataType: 'json',
            complex: true,
            type: 'post',
            url: '/Contact/SendMtdIncomeTaxCsv'
        }, function (response) {
            if (response && response.Data && response.Data.NoData) {
                me.showError('Report not available for the selected date range');
                return;
            }
            if (response && response.DocumentRequestIdList) {
                gmgps.cloud.helpers.general.generateAccountingDocuments(response.DocumentRequestIdList);
                gmgps.cloud.helpers.general.promptForLetters({ eventHeaders: response.UpdatedEvents });
                me.closeMyWindow();
            } else if (response && response.Data && response.Data.Success) {
                showInfo('MTD Income Tax CSV request submitted.');
                me.closeMyWindow();
            } else {
                me.showError('Unable to submit the MTD Income Tax CSV request');
            }
        });
    }
};