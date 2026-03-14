((gmgps.cloud.ui.views.receiptImportsFileUploadWindowHander = function (args) {
    var me = this;

    me.title = args.title;

    me.accountId = args.accountId;

    me.onComplete = args.onComplete;
    me.onCancel = args.onCancel;

    return me.init();
})),
    (gmgps.cloud.ui.views.receiptImportsFileUploadWindowHander.prototype = {
        init: function () {
            var me = this;
            return me;
        },

        controller: function (args) {
            var me = this;
            var droppedFiles = false;

            me.params = args.data;
            me.$root = args.$root;
            me.$window = args.$window;

            me.$root = args.$root;
            me.$window = args.$window;

            me.$window
                .find('.top')
                .css('background-color', '#3399ff !important');
            me.$window.find('.middle').css('background-color', '#ffffff');

            me.$window.find('.bottom .action-button').hide();

            me.$root.find('.box').each(function () {
                var $form = $(this);
                var $input = $form.find('input[type="file"]');

                $input.on('change', function (e) {
                    ShowFiles(e.target.files);
                    droppedFiles = e.target.files;
                });

                $form
                    .addClass('has-advanced-upload')
                    .on(
                        'drag dragstart dragend dragover dragenter dragleave drop',
                        function (e) {
                            e.preventDefault();
                            e.stopPropagation();
                        }
                    )
                    .on('dragover dragenter', function () {
                        $form.addClass('is-dragover');
                    })
                    .on('dragleave dragend drop', function () {
                        $form.removeClass('is-dragover');
                    })
                    .on('drop', function (e) {
                        droppedFiles = e.originalEvent.dataTransfer.files;
                        ShowFiles(droppedFiles);
                    });
            });

            me.$root.find('#import_all').on('click', function () {
                SetImportOptionAndPost(C.ReceiptImportFileImportOption.All);
            });

            me.$root.find('#import_except').on('click', function () {
                SetImportOptionAndPost(
                    C.ReceiptImportFileImportOption.ExceptDuplicates
                );
            });

            me.$root.find('#import_cancel').on('click', function () {
                $('.cancel-button').trigger('click');
            });

            me.$root
                .find('#receipt-import-upload-file-dialog .submit_form')
                .on('click', function () {
                    if ($(this).hasClass('disabled')) {
                        return false;
                    }

                    PostFile();
                });

            function ShowFiles(files) {
                var $form = me.$root.find('.box');
                var $label = $form.find('label');
                $label.text(files[0].name);
                var $btn = me.$root.find('.submit_form');

                if (files.length > 0) {
                    $btn.removeClass('disabled');
                } else {
                    $btn.addClass('disabled');
                }
            }

            function PostFile() {
                var $form = me.$root.find('.box');
                if ($form.hasClass('is-uploading')) return false;

                me.$root
                    .find('#upload_progress .icon .fa-check-circle-o')
                    .hide();
                me.$root
                    .find('#upload_progress .icon .fa-times-circle-o')
                    .hide();
                me.$root.find('#upload_progress .icon .fa-warning').hide();
                me.$root.find('#upload_progress .duplicates').hide();

                $form.addClass('is-uploading').removeClass('is-error');

                var formData = new FormData();

                var accountId = me.$root.find('#accountId').val();
                formData.append('accountId', accountId);
                var importOption = me.$root.find('#ImportOption').val();
                formData.append('ImportOption', importOption);

                var file = droppedFiles[0];
                formData.append('File', file);

                $.Fileajax = new XMLHttpRequest();
                $.Fileajax.upload.addEventListener(
                    'progress',
                    progressHandler,
                    false
                );
                $.Fileajax.addEventListener('load', completeHandler, false);
                $.Fileajax.open('POST', '/Accounts/UploadReceiptImportFile');
                $.Fileajax.send(formData);
            }

            function progressHandler(event) {
                var percent = (event.loaded / event.total) * 100;
                me.$root
                    .find('#upload_progress .progress')
                    .text(percent + '% Complete');
            }

            function completeHandler(event) {
                var result = JSON.parse(event.currentTarget.response);

                me.$root.find('#upload_progress .progress').text('Finished');
                me.$root.find('#upload_progress .icon .fa-upload').hide();
                me.$root.find('#upload_progress .box__button').hide();

                // SUCCESS
                if (result.Status === C.ReceiptImportFileImportStatus.Success) {
                    me.$root.find("input[type='file']").val('');
                    me.$root
                        .find('#upload_progress .icon .fa-check-circle-o')
                        .show();
                    var message =
                        parseInt(result.ImportedReceipts) > 1
                            ? ' Receipts Imported'
                            : ' Receipt Imported';
                    me.$root
                        .find('#upload_progress .progress')
                        .text(result.ImportedReceipts + message);
                    me.$window.find('.bottom .cancel-button').hide();
                    me.$window.find('.bottom .action-button').show();
                }

                // ERROR
                if (result.Status === C.ReceiptImportFileImportStatus.Error) {
                    me.$root.find("input[type='file']").val('');
                    me.$root
                        .find('#upload_progress .icon .fa-times-circle-o')
                        .show();
                    me.$root
                        .find('#upload_progress .progress')
                        .text(result.Error);
                }

                // DUPLICATES DETECTED
                if (
                    result.Status ===
                    C.ReceiptImportFileImportStatus.DuplicateWarning
                ) {
                    me.$root.find('#upload_progress .icon .fa-warning').show();
                    me.$root
                        .find('#upload_progress .progress')
                        .html(
                            'Duplicate receipts have been detected.<br/>How would you like to proceed?'
                        );
                    me.$root.find('#upload_progress .duplicates').show();
                }
            }

            function SetImportOptionAndPost(importOption) {
                me.$root.find('#ImportOption').val(importOption);
                var $form = me.$root.find('.box');
                $form.removeClass('is-uploading').removeClass('is-error');
                PostFile();
            }

            this.action = function (onComplete) {
                onComplete();
            };
        },

        show: function () {
            var me = this;

            new gmgps.cloud.ui.controls.window({
                title: me.title,
                windowId: 'receiptImportFileUpload',
                controller: me.controller,
                url: 'Accounts/GetReceiptImportFileUploadDialog',
                urlArgs: {
                    accountId: me.accountId
                },
                data: me,
                post: true,
                complex: true,
                width: 510,
                draggable: true,
                modal: true,
                cancelButton: 'Close',
                onCancel:
                    me.onCancel ||
                    function () {
                        return true;
                    },
                actionButton: 'Refresh',
                postActionCallback:
                    me.onComplete ||
                    function () {
                        return false;
                    }
            });
        }
    });
