gmgps.cloud.ui.controls.chargeFileUploader = function (args) {
    var me = this;
    me.cfg = args;
    me.$root = args.$root;
    me.$fileNameField = args.fileNameField;
    me.$MediaIdField = args.mediaIdField;
    me.$addButton = args.uploadButton;
    me.linkedId = args.linkedId;
    me.linkedType = args.linkedType;
    me.branchId = args.branchId;
    me.init(args);

    return this;
};

gmgps.cloud.ui.controls.chargeFileUploader.prototype = {
    init: function (args) {
        var me = this;

        me.params = args.data;

        me.$fileNameField.addClass('chargeFileUploader');

        var uploader = new plupload.Uploader({
            runtimes: 'html5,flash,silverlight,html4',
            browse_button: me.$addButton.attr('id'),
            max_file_size: '2048mb',
            multipart: true,
            multi_selection: false,
            unique_names: false,
            max_file_count: 1,
            url: '/Upload/AcceptFile',
            flash_swf_url: '/scripts/jquery/plugins/plupload/moxie.swf',
            silverlight_xap_url: '/scripts/jquery/plugins/plupload/moxie.xap',
            filters: [
                {
                    title: 'PDF Documents',
                    extensions: 'pdf'
                }
            ]
        });

        uploader.settings.multipart_params = {
            modelTypeId: me.linkedType,
            mediaTypeId: C.MediaType.Document, // ensures everything goes into private storage
            branchId: me.branchId,
            entityId: me.linkedId
        };

        uploader.init();

        uploader.bind('QueueChanged', function (up) {
            if (up.files.length === 1 && uploader.state !== 2) {
                uploader.start();
            }
        });

        uploader.bind('FilesAdded', function (up, files) {
            if (up.files.length > 1) {
                uploader.splice(0, 1);
                return;
            }

            me.$fileNameField.addClass('disabled');
            me.$addButton.addClass('disabled');

            me.getFileUploadPanel(
                me.linkedId,
                me.linkedType,
                files[0].name,
                files[0].size
            ).done(function (r) {
                var $uploadPanel = $(r.Data);

                me.$fileNameField.append($uploadPanel);

                up.$uploadPanel = $uploadPanel;

                setTimeout(function () {
                    up.start();
                }, 1000);
            });
        });

        uploader.bind('UploadProgress', function (up, file) {
            if (up.$uploadPanel) {
                up.$uploadPanel
                    .find('.progress .percent')
                    .css('width', file.percent + '%');
                up.$uploadPanel
                    .find('.progress .label')
                    .text(file.percent + '%');

                if (file.percent === 100) {
                    up.$uploadPanel.find('.progress').hide();
                    up.$uploadPanel.find('.processing').show();
                }
            }
        });

        uploader.bind('UploadComplete', function () {
            me.$fileNameField.removeClass('disabled');
            me.$addButton.removeClass('disabled');
        });

        uploader.bind('FileUploaded', function (up, file, info) {
            if (info.status !== 200) {
                var $info = $.parseJSON(info.response);

                if (up.$uploadPanel) {
                    up.$uploadPanel.remove();
                }

                if ($info.error) {
                    file.status = 4; // set pl upload STATUS.FAILED so we can exclude from completed successfully count
                    $.jGrowl($info.error, {
                        header: 'Error uploading a file',
                        theme: 'growl-contact',
                        sticky: true
                    });
                    return void 0;
                }
            }

            var $html = $(info.response);

            $.jGrowl('The file has been uploaded successfully.', {
                header: 'File upload',
                theme: 'growl-system',
                life: 2000
            });

            if (up.$uploadPanel) {
                up.$uploadPanel.find('.remove-media').removeClass('hidden'); // let them cancel the selection always
                up.$uploadPanel.find('.processing').hide();

                // indicate successful transfer
                up.$uploadPanel.attr('data-uploaded', '1');

                // update hiddens
                up.$uploadPanel.find('.media-info').empty().html($html);
                // set the temp url to allow link to new item
                up.$uploadPanel
                    .find('.file-link')
                    .attr('href', $html.find('input[name$=".Url"]').val());

                up.$uploadPanel.find('.file-info').show();
            }

            me.$addButton.prop('disabled', true).css('visibility', 'hidden');
        });

        uploader.bind('Error', function (up, err) {
            // need to allow the close btn if we got as far as adding a new panel
            if (up.$uploadPanel) {
                up.$uploadPanel.find('.remove-media').removeClass('hidden');
            }

            switch (err.code) {
                case plupload.FILE_SIZE_ERROR:
                    alert('File is too large to upload.');
                    break;
                case plupload.FAILED:
                case plupload.FILE_DUPLICATE_ERROR:
                case plupload.FILE_EXTENSION_ERROR:
                case plupload.GENERIC_ERROR:
                case plupload.IO_ERROR:
                case plupload.SECURITY_ERROR:
                    alert(err.message);
                    break;

                case plupload.HTTP_ERROR: // progress bar will be visible here
                    if (up.$uploadPanel) {
                        up.$uploadPanel
                            .find('.progress .percent')
                            .css('width', '100%')
                            .addClass('error');
                        up.$uploadPanel
                            .find('.progress .label')
                            .addClass('err');
                        //up.$uploadPanel.find('.file-info').hide();
                        up.$uploadPanel.find('.processing').hide();
                        up.$uploadPanel
                            .find('.upload-failed')
                            .text(err.message + ':' + err.status)
                            .show();
                        break;
                    }
            }
        });

        me.$root.on('click', '.remove-media', function () {
            var $panel = $(this).closest('.file-panel');

            var confirmedClose = function () {
                $panel.remove();
                me.$fileNameField.html('');
                me.$MediaIdField.val('0');
                me.$root.find('.chargeFileUploader .media-info').empty();
            };

            var itemId = parseInt($panel.attr('data-uploaded'));

            if (itemId !== 0) {
                // if upload worked this will be set to true, so ask to confirm to remove
                showDialog({
                    type: 'question',
                    title: 'Remove document from Charge',
                    msg: 'Are you sure you would like to remove this document ?',
                    buttons: {
                        Yes: function () {
                            uploader.splice();
                            confirmedClose();
                            me.$addButton
                                .prop('disabled', false)
                                .css('visibility', 'visible');
                            $(this).dialog('close');
                        },
                        No: function () {
                            $(this).dialog('close');
                        }
                    }
                });
            } else {
                me.$addButton
                    .prop('disabled', false)
                    .css('visibility', 'visible');
                confirmedClose();
            }
        });
    },

    getFileUploadPanel: function (id, linkedType, fileName, fileSizeBytes) {
        return new gmgps.cloud.http(
            "chargeFileUploader-getFileUploadPanel"
        ).ajax({
            args: {
                linkedId: id,
                linkedType: linkedType,
                fileName: fileName,
                fileSizeBytes: fileSizeBytes
            },
            complex: true,
            dataType: 'json',
            type: 'post',
            url: '/Tools/GetFileUploadPanel'
        });
    }
};
