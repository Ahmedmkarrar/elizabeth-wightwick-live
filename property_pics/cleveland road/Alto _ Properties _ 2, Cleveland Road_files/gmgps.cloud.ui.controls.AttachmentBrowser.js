gmgps.cloud.ui.controls.AttachmentBrowser = function (args) {
    var me = this;

    me.container = args.container;
};

gmgps.cloud.ui.controls.AttachmentBrowser.typeName =
    'gmgps.cloud.ui.controls.AttachmentBrowser';

gmgps.cloud.ui.controls.AttachmentBrowser.prototype = {
    open: function (contacts, property, tenancy) {
        var me = this;

        var sources = new Array();

        if (property != null) {
            sources.push({
                Type: 'Property',
                Id: property.id,
                Name: property.name
            });
        }

        if (tenancy != null) {
            sources.push({
                Type: 'Tenancy',
                Id: tenancy.id
            });
        }

        $.each(contacts, function (i, contact) {
            sources.push({ Type: 'Contact', Id: contact.id });
        });

        if (sources.length === 0) {
            showInfo(
                'There is no property or contacts available to attach documents from, please select some contacts as recipients first.'
            );
            return false;
        }

        gmgps.cloud.helpers.general.createDocumentBrowser(
            {
                sources: JSON.stringify({ sources: sources }),
                sourceZIndex: me.container.closest('.window').css('z-index')
            },
            me.addFilesToAttachmentSection(me)
        );
    },

    addFilesToAttachmentSection: (me) => (e) => {
        var existing = new Array();
        var currents = me.container.find('.attachments .attachment');
        for (var y = 0; y < currents.length; y++) {
            var current = $(currents[y]).find('.attachmentIds');
            for (var x = 0; x < current.length; x++) {
                existing.push($(current[x]).val());
            }
        }

        var duplicateAttachmentFound = false;
        for (var n = 0; n < e.length; n++) {
            var attachmentId = e[n][0];
            if (existing.indexOf(attachmentId) == -1) {
                me.addAttachmentRow(e[n]);
                existing.push(attachmentId);
            } else {
                duplicateAttachmentFound = true;
            }
        }

        if (duplicateAttachmentFound) {
            showInfo(
                'One or more attachments was not added as it is already attached to this email.'
            );
        }

        me.showAttachments();
    },

    showAttachments: function () {
        var me = this;
        if (me.container.find('.attachments .attachment').length > 0) {
            me.container.find('.attachments').show();
        }
    },

    isAttachmentDuplicate: function (attachmentId) {
        var me = this;

        var attachmentIds = new Array();
        var attachments = me.container.find(
            '.attachments .attachment .attachmentIds'
        );
        attachments.each(function (i, e) {
            var id = $(e).val();
            attachmentIds.push(parseInt(id));
        });

        var present = attachmentIds.indexOf(attachmentId) != -1;
        return present;
    },

    addAttachmentRow: function (item) {
        var me = this;

        var attachment = me.createAttachmentFromHtml(item);

        var isDuplicate = me.isAttachmentDuplicate(attachment.id);

        if (!isDuplicate) {
            me.addAttachment(attachment);
        } else {
            showInfo(
                'The attachment was not added as it is already attached to this email.'
            );
        }
    },

    addAttachmentRowFromData: function (data) {
        var me = this;

        if (data != null) {
            var attachment = me.createAttachmentFromObject(data);

            var isDuplicate = me.isAttachmentDuplicate(attachment.id);

            if (!isDuplicate) {
                me.addAttachment(attachment);
            } else {
                showInfo(
                    'The attachment was not added as it is already attached to this email.'
                );
            }
        }
    },

    addAttachment: function (attachment) {
        var me = this;

        if (attachment.url.indexOf('[1]') >= 0)
            attachment.url = attachment.url.replace('[1]', '[3]');

        //clone a template row
        var $clone = me.container.find('.templates .attachment:first').clone();

        //replace hidden fields
        $clone.find('.attachmentTemplate').val(0);
        $clone.find('.attachmentIds').val(attachment.id);
        $clone.find('.attachmentName').val(attachment.name);
        $clone.find('.attachmentTypeId').val(attachment.modelType);
        $clone.find('.attachmentFileTypeId').val(attachment.fileType);
        $clone.find('.attachmentCategory').val(attachment.category);

        //replace visible values
        if (attachment.url.length > 0) {
            $clone
                .find('.name')
                .html(
                    '<a href="{0}" target="_blank">{1}<br/>{2}</a>'.format(
                        attachment.url,
                        attachment.name,
                        attachment.type
                    )
                );
        } else {
            $clone
                .find('.name')
                .html('{0}<br/>{1}'.format(attachment.name, attachment.type));
        }
        $clone.find('.icon img').attr('src', attachment.icon);

        //add the new row
        me.container.find('.attachments').append($clone);
    },

    createAttachmentFromHtml: function (item) {
        var attachment = {
            id: item[0],
            name: item[1],
            type: item[2],
            icon: item[3],
            url: item[4] || '',
            modelType: item[5],
            fileType: item[6],
            category: item[7]
        };

        return attachment;
    },

    createAttachmentFromObject: function (data) {
        var attachment = {
            id: data.Id,
            name: data.Name,
            type: data.Type,
            icon: data.IconUrl,
            url: data.Url || '',
            modelType: data.ModelTypeId,
            fileType: data.FileTypeId,
            category: data.Category
        };

        return attachment;
    }
};
