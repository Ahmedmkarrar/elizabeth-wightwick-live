((function($, undefined) {
    'use strict';

    var pluginName = 'simpleInfiniteScroll';
    var defaults = {
        offset: 0,
        ajaxOptions: {},
        callback: null
    };

    function Plugin(element, options) {
        this.element = element;
        this.options = $.extend({}, defaults, options);
        this._defaults = defaults;
        this._name = pluginName;
        this.loading = false;

        this.init();
    }

    Plugin.prototype = {
        init: function () {
            $(this.element)
                .scroll(this.checkPage(this.element, this.options))
                .data('pagesloaded', 1)
                .data('totalpages', this.options.totalPages);
        },

        checkPage: function (element, options) {
            return function () {
                var that = this;

                if (!that.loading) {
                    var e = $(element);

                    if (e.data('pagesloaded') > e.data('totalpages')) {
                        return false;
                    }

                    if (
                        e.scrollTop() >=
                        e[0].scrollHeight - e.height() - options.offset
                    ) {
                        that.loading = true;

                        var ajaxSuccess = {
                            success: function (data, textStatus, jqXHR) {
                                e.data(
                                    'pagesloaded',
                                    e.data('pagesloaded') + 1
                                );

                                if (typeof options.callback === 'function') {
                                    options.callback.call(
                                        that,
                                        data,
                                        textStatus,
                                        jqXHR
                                    );
                                }
                                that.loading = false;
                            }
                        };

                        $.extend(options.ajaxOptions, ajaxSuccess);

                        options.ajaxOptions.data.search.searchPage.index =
                            e.data('pagesloaded') + 1;

                        $.ajax(options.ajaxOptions);
                    }
                }
            };
        }
    };

    $.fn[pluginName] = function (options, callback) {
        return this.each(function () {
            if (!$.data(this, 'plugin_' + pluginName)) {
                //New
                $.data(this, 'plugin_' + pluginName, new Plugin(this, options));
            } else {
                //Self destroy/replace
                $.removeData(this, 'plugin_' + pluginName);
                $(this).off();
                $.data(this, 'plugin_' + pluginName, new Plugin(this, options));
            }
        });
    };
}))(jQuery);
