gmgps.cloud.ui.views.fileUploaderFromComputer = function (
    button,
    getContacts,
    attachmentBrowser
) {
    var me = this;
    me.attachmentBrowser = attachmentBrowser;
    me.init(button, getContacts);
    return this;
};

gmgps.cloud.ui.views.fileUploaderFromComputer.typeName =
    'gmgps.cloud.ui.views.fileUploaderFromComputer';

gmgps.cloud.ui.views.fileUploaderFromComputer.prototype = {
    init: function (button, getContacts) {
        var me = this;
        var uploader = new plupload.Uploader({
            runtimes: 'html5,flash,silverlight,html4',
            browse_button: button,
            max_file_size: '50mb',
            multipart: true,
            multi_selection: false,
            unique_names: false,
            url: '/Upload/UploadFileForContact',
            flash_swf_url: '/scripts/jquery/plugins/plupload/moxie.swf',
            silverlight_xap_url: '/scripts/jquery/plugins/plupload/moxie.xap',
            filters: [
                {
                    title: 'Document files',
                    extensions:
                        'doc,pdf,docx,rtf,txt,jpg,png,gif,xls,xlsx,xlw,jpeg,msg'
                }
            ]
        });

        uploader.init();

        uploader.bind('FilesAdded', function (up, files) {
            var contact = getContacts().shift();
            if (contact) {
                up.settings.multipart_params = {
                    modelTypeId: C.ModelType.Contact,
                    mediaTypeId: C.MediaType.Document,
                    entityId: contact.id,
                    originalFileName: files[0].name
                };
                up.start();
            } else {
                up.removeFile(files[0]);
                $.jGrowl(
                    'You need to have at least one contact selected to attach a new file',
                    {
                        header: 'Error uploading a file',
                        theme: 'growl-contact',
                        sticky: true
                    }
                );
            }
        });

        uploader.bind('BeforeUpload', function () {
            var html = `<img src="/content/media/images/gui/panel/icons/panel.icon.spinner.gif" alt="loading image spinner"/>`;
            $('.action-button').html(html).addClass('disabled');
        });

        uploader.bind('FileUploaded', function (up, file, info) {
            if (info.status == 200) {
                var selection = $(info.response).find('.selector');
                var items = selection.map(function () {
                    return [
                        [
                            $(this).attr('data-id'),
                            $(this).attr('data-name'),
                            $(this).attr('data-type'),
                            $(this).attr('data-icon'),
                            $(this).attr('data-url'),
                            $(this).attr('data-modeltypeid'),
                            $(this).attr('data-fileyypeid'),
                            $(this).attr('data-category')
                        ]
                    ];
                });

                me.attachmentBrowser.addFilesToAttachmentSection(
                    me.attachmentBrowser
                )(items);
                me.attachmentBrowser.showAttachments();
            } else {
                var $info = $.parseJSON(info.response);
                if ($info.error) {
                    file.status = 4; // set pl upload STATUS.FAILED so we can exclude from completed successfully count
                    $.jGrowl($info.error, {
                        header: 'Error uploading a file',
                        theme: 'growl-contact',
                        sticky: true
                    });
                }
            }
        });

        uploader.bind('UploadComplete', function () {
            $('.action-button').html('Send').removeClass('disabled');
        });
    }
};
