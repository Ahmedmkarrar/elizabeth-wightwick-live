/* eslint-disable no-unused-vars */

gmgps.cloud.ui.controls.uploader = function (args) {
    var me = this;

    window.tempUploaderInstance = me;

    me.init(args);
    me.uploaderEmbedded = false;
    me.onUploadComplete = new gmgps.cloud.common.event();
    return this;
};

gmgps.cloud.ui.controls.uploader.prototype = {
    init: function (args) {
        var params = {
            BGcolor: '#ffffff',
            wmode: 'transparent'
        };

        var attributes = {
            id: 'EAFlashUpload',
            name: 'EAFlashUpload'
        };

        var flashvars = new Object();
        flashvars['uploader.uploadUrl'] = '/Upload/Create';
        flashvars['viewFile'] = '/scripts/flash/eafupload/ImageView.swf';
        flashvars['uploader.uploadResizedImages'] = args.uploadResizedImages;
        flashvars['uploader.uploadOriginalImages'] = args.uploadOriginalImages;
        flashvars['uploader.resizedImageMaxWidth'] = args.maxWidth;
        flashvars['uploader.resizedImageMaxHeight'] = args.maxHeight;
        flashvars['view.imagesList.cellStyle.maxImageWidth'] =
            args.maxThumbnailWidth;
        flashvars['view.imagesList.cellStyle.maxImageHeight'] =
            args.maxThumbnailHeight;
        flashvars['view.imagesList.rowCount'] = args.rowCount;
        flashvars['view.imagesList.columnCount'] = args.columnCount;
        flashvars['view.imagesList.cellStyle.enableDescription'] =
            args.enableDescription;

        //GUI Configuration
        flashvars['view.imagesListStatusLabelOnReadyText'] = '';
        flashvars['view.backgroundColor'] = '#ffffff';
        flashvars['view.borderColor'] = '#ffffff';

        //ImageList
        flashvars['view.imagesList.backgroundColor'] = '#ffffff';

        //ImageList Items
        flashvars['view.imagesList.cellStyle.emptyDescriptionText'] =
            'Set Caption...';
        flashvars['view.imagesList.cellStyle.backgroundColor'] = '#c0c0c0';
        flashvars['view.imagesList.cellStyle.selectedBackgroundColor'] =
            '#C4EA88';
        flashvars['view.imagesList.cellStyle.selectedBorderColor'] = '#C4EA88';

        flashvars['view.imagesList.cellStyle.nameLblFontColor'] = '#ffffff';

        flashvars['view.imagesList.cellStyle.nameLblFontName'] = 'Tahoma';
        flashvars['view.imagesList.cellStyle.descLblFontName'] = 'Tahoma';
        flashvars['view.imagesList.cellStyle.notImageLblFontName'] = 'Tahoma';

        flashvars['view.imagesList.cellStyle.descLblFontSize'] = '11';
        flashvars['view.imagesList.cellStyle.nameLblFontSize'] = '11';

        flashvars['view.imagesList.cellStyle.descLblFontColor'] = '#ffffff';
        flashvars['view.imagesList.descLblFontColor'] = '#ffffff';

        //Buttons
        flashvars['view.addButton.fontColor'] = '#ffffff';
        flashvars['view.addButton.fontName'] = 'Tahoma';
        flashvars['view.addButton.upColor'] = '#828487|#B3B5B7';
        flashvars['view.addButton.overColor'] = '#A3A5A7|#E3E3E4';
        flashvars['view.addButton.downColor'] = '#A3A5A7|#E3E3E4';
        flashvars['view.addButton.borderUpColor'] = '#a0a0a0';
        flashvars['view.addButton.borderDownColor'] = '#a0a0a0';
        flashvars['view.addButton.borderOverColor'] = '#a0a0a0';

        flashvars['view.clearButton.fontColor'] = '#ffffff';
        flashvars['view.addButton.fontName'] = 'Tahoma';
        flashvars['view.clearButton.upColor'] = '#828487|#B3B5B7';
        flashvars['view.clearButton.overColor'] = '#A3A5A7|#E3E3E4';
        flashvars['view.clearButton.downColor'] = '#A3A5A7|#E3E3E4';
        flashvars['view.clearButton.borderUpColor'] = '#a0a0a0';
        flashvars['view.clearButton.borderDownColor'] = '#a0a0a0';
        flashvars['view.clearButton.borderOverColor'] = '#a0a0a0';

        flashvars['view.uploadButton.fontColor'] = '#ffffff';
        flashvars['view.addButton.fontName'] = 'tahoma';
        flashvars['view.uploadButton.upColor'] = '#828487|#B3B5B7';
        flashvars['view.uploadButton.overColor'] = '#A3A5A7|#E3E3E4';
        flashvars['view.uploadButton.downColor'] = '#A3A5A7|#E3E3E4';
        flashvars['view.uploadButton.borderUpColor'] = '#a0a0a0';
        flashvars['view.uploadButton.borderDownColor'] = '#a0a0a0';
        flashvars['view.uploadButton.borderOverColor'] = '#a0a0a0';

        flashvars['view.cancelButton.fontColor'] = '#ffffff';
        flashvars['view.addButton.fontName'] = 'Tahoma';
        flashvars['view.cancelButton.upColor'] = '#828487|#B3B5B7';
        flashvars['view.cancelButton.overColor'] = '#A3A5A7|#E3E3E4';
        flashvars['view.cancelButton.downColor'] = '#A3A5A7|#E3E3E4';
        flashvars['view.cancelButton.borderUpColor'] = '#a0a0a0';
        flashvars['view.cancelButton.borderDownColor'] = '#a0a0a0';
        flashvars['view.cancelButton.borderOverColor'] = '#a0a0a0';

        swfobject.embedSWF(
            '/scripts/flash/eafupload/EAFUpload.swf',
            'EAFlashUpload_holder',
            '640',
            '400',
            '10.0.0',
            '/scripts/misc/swfobject/expressInstall.swf',
            flashvars,
            params,
            attributes
        );
    }
};

function EAFlashUpload_onFileLoadEnd(fileObj) {
    var imageObj;
    var uniqueId;

    $('.photos').append(fileObj.serverResponse);
}

function EAFlashUpload_onUploadEnd() {
    //as above (context)
    $('.content-container .details .layer').hide();
    $('.content-container .details .layer[data-id="media"]').show();

    $('.photos').sortable({
        helper: 'clone',
        scroll: true,
        delay: 50,
        revert: 200,
        handle: $('.photos .drag-handle'),
        update: function () {}
    });

    window.tempUploaderInstance.onUploadComplete.raise();

    EAFlashUpload.removeFiles();
}

function EAFlashUpload_onSystemError(msg) {
    alert(msg);
}

function EAFlashUpload_onFilesAdded(filesIds) {
    var customProperty = {
        name: 'entityId',
        value: $('.content-container #Id').val(), //Forced to do this because we have no context.  Could say onFilesAdded = me.func, perhaps...
        isPublic: false
    };

    EAFlashUpload.setCustomProperty(customProperty);
}

function EAFlashUpload_onUploadError(errorObj) {
    alert(errorObj.message);
}

function EAFlashUpload_onMovieLoad(errors) {
    if (errors != '') alert(errors);
}

function EAFlashUpload_onImageViewResize(width, height) {
    EAFlashUpload.style.width = width;
    EAFlashUpload.style.height = height;
}

function EAFlashUpload_onUploadProgress() {}
