'use strict';
alto.integration.helpers.LetterEditor = {
    defaultPageWidth: 794,

    waitForAvailable: function (name, tries) {
        var start = Date.now();
        var now = start;
        var ms = 500;
        if (!tries) {
            tries = 1;
        }
        while (!window[name] && now - start < ms) {
            now = Date.now();
        }
        start = Date.now();
        now = start;
        ms = 5;
        while (now - start < ms) {
            now = Date.now();
        }
        if (!window[name]) {
            if (tries < 5) {
                return this.waitForAvailable(name, tries + 1);
            }
            console.log('TinyMCE: there was an error loading the JS library!');
            return false;
        }
        return true;
    },

    truncateDecimal: function (numToTruncate, decimalPlaces) {
        var power = Math.pow(10, decimalPlaces);
        return ~~(numToTruncate * power) / power;
    },

    mmToConventionalPts: function (mm) {
        var me = this;

        var pt = 0;

        if (mm != undefined) {
            var ratio = 2.83464567;
            var at2Dp = me.truncateDecimal(mm * ratio, 2);
            var integralPart = Math.floor(at2Dp);
            var mantissa = at2Dp - integralPart;
            var even = integralPart % 2 == 0;
            if (even || mantissa < 0.5) {
                pt = Math.floor(at2Dp);
            } else {
                pt = Math.ceil(at2Dp);
            }
        }
        return pt;
    },

    mmToPxForConventionalPageSize: function (mm, round) {
        //Convert millimetres to pixels via points.
        var me = this;

        var px = 0;

        if (mm != undefined) {
            var pt = me.mmToConventionalPts(mm);
            if (round) {
                px = Math.round((pt / 72) * 96);
            } else {
                px = (pt / 72) * 96;
            }
        }

        return px;
    },

    isPageValid: function (page, noOfPages) {
        if (
            page.type == C.PublisherPageType.Repeating ||
            (page.type == C.PublisherPageType.Static && noOfPages == 1)
        ) {
            return true;
        }
        return false;
    },

    isPageSizeValid: function (pageSize) {
        if (pageSize == C.PublisherPageSize.A4) {
            return true;
        }
        return false;
    },

    defaultEditorPageSize: function (editor) {
        var me = this;
        editor.updatePageSize(me.defaultPageWidth, 10, 10, 10, 10);
    },

    updateEditorWithStationeryDetails: function (editor, params) {
        var me = this;
        me.http = new gmgps.cloud.http(
            "LetterEditor-updateEditorWithStationeryDetails"
        );

        var getPublisherPackageUrl = '/publisher/getpublisherpackage';

        me.http.ajax(
            {
                args: params,
                dataType: 'json',
                type: 'post',
                url: getPublisherPackageUrl
            },
            function (response) {
                var found = false;
                if (response.Data.Template) {
                    var content = JSON.parse(response.Data.Template.Content);
                    var widthInPixels;
                    if (
                        content.pageWidth &&
                        me.isPageSizeValid(content.pageSize)
                    ) {
                        widthInPixels = me.mmToPxForConventionalPageSize(
                            content.pageWidth
                        );
                    } else {
                        widthInPixels = me.defaultPageWidth;
                    }
                    if (me.isPageSizeValid(content.pageSize) && content.pages) {
                        var foundSection = null;
                        $.each(content.pages, function (i, page) {
                            if (me.isPageValid(page, content.pages.length)) {
                                var noOfValidSections = 0;
                                $.each(page.sections, function (i, section) {
                                    if (
                                        section.type ==
                                            C.PublisherSectionType.DataFlow &&
                                        parseInt(section.scope) ==
                                            C.PublisherDataField.LetterContent
                                    ) {
                                        ++noOfValidSections;
                                        if (noOfValidSections > 1) {
                                            foundSection = null;
                                            found = false;
                                            return false;
                                        }
                                        foundSection = section;
                                        found = true;
                                    }
                                });
                                if (found) {
                                    return false;
                                }
                            }
                        });
                        if (found) {
                            var ratio = widthInPixels / content.pageWidth;
                            var topPadding = Math.round(
                                foundSection.position.top * ratio
                            );
                            var rightPadding = Math.round(
                                (content.pageWidth -
                                    foundSection.position.left -
                                    foundSection.dimensions.width) *
                                    ratio
                            );
                            var bottomPadding = 10;
                            var leftPadding = Math.round(
                                foundSection.position.left * ratio
                            );

                            editor.updatePageSize(
                                widthInPixels,
                                topPadding,
                                rightPadding,
                                bottomPadding,
                                leftPadding
                            );
                        }
                    }
                }
                if (!found) {
                    me.defaultEditorPageSize(editor);
                }
            },
            function () {
                me.defaultEditorPageSize(editor);
            }
        );
    }
};
