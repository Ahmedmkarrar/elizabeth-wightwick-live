//Select
(function ($) {
    $.fn.extend({
        customSelect: function (locked) {
            return this.each(function () {
                var $this = $(this);
                $this.off(
                    'keyup.customSelect change.customSelect mirror-change.customSelect prog-change.customSelect'
                );

                var currentSelected = $this.find(':selected');
                var isCustomised = $this.hasClass('is-customised');

                var text = $this.hasClass('opt-useVal')
                    ? currentSelected.val()
                    : currentSelected.text(); //initial text.

                var customClassForSpan = $this.attr('data-additional-customstyleselectbox-class');

                if (!isCustomised) {
                    $this
                        .after(
                            '<span class="customStyleSelectBox"><span class="customStyleSelectBoxInner">' +
                                text +
                                '</span></span>'
                        )
                        .css({
                            position: 'absolute',
                            opacity: 0,
                            fontSize: $this.next().css('font-size')
                        });

                    $this.next('span.customStyleSelectBox').addClass(customClassForSpan);

                } else {
                    $this
                        .next('span.customStyleSelectBox')
                        .find('span.customStyleSelectBoxInner')
                        .text(text);
                }

                if (!isCustomised) {
                    $this.addClass('is-customised');
                }
                if (locked) {
                    $this.find('option:not(:selected)').prop('disabled', true);
                    $this.next().addClass('locked');
                } else {
                    $this.find('option:not(:selected)').prop('disabled', false);
                    $this.next().removeClass('locked');
                }

                var $outer = $this.next();
                var $inner = $outer.find(':first-child');
                var selectBoxWidth =
                    parseInt($(this).width()) -
                    parseInt($outer.css('padding-left')) -
                    parseInt($outer.css('padding-right'));
                var selectBoxHeight =
                    parseInt($outer.height()) +
                    parseInt($outer.css('padding-top')) +
                    parseInt($outer.css('padding-bottom'));

                $this.height(selectBoxHeight);
                $outer.width(selectBoxWidth + 6); //try this value of 6 with all browsers...

                //Update the visible selected text for change, mirror-change, prog-change and keyup events.
                $this.on('keyup.customSelect', function () {
                    $this.trigger('change');
                    return;
                });
                $this.on(
                    'change.customSelect mirror-change.customSelect prog-change.customSelect',
                    function () {
                        if ($this.hasClass('opt-useVal')) {
                            $inner.text($this.find('option:selected').val());
                        } else {
                            $inner.text($this.find('option:selected').text());
                        }
                        $inner.prop('selected', true);
                    }
                );
            });
        }
    });
})(jQuery);

//Tickbox
(function ($) {
    $.fn.tickbox = function (options) {
        options = options || {};
        var defaultOpt = {
            checkboxCls: options.checkboxCls || 'tickbox',
            radioCls: options.radioCls || 'ez-radio',
            checkedCls: options.checkedCls || 'ticked',
            selectedCls: options.selectedCls || 'ez-selected',
            hideCls: 'tickbox-hidden'
        };
        return this.each(function () {
            var $this = $(this);

            var isCustomised = $this.hasClass('is-customised');

            if (isCustomised)
                if ($this.attr('type') === 'radio') {
                    $this.change(function () {
                        // radio button may contain groups! - so check for group
                        $('input[name="' + $this.attr('name') + '"]').each(
                            function () {
                                if ($this.is(':checked')) {
                                    $this
                                        .parent()
                                        .addClass(defaultOpt.selectedCls);
                                } else {
                                    $this
                                        .parent()
                                        .removeClass(defaultOpt.selectedCls);
                                }
                            }
                        );
                    });

                    if ($this.is(':checked')) {
                        $this.parent().addClass(defaultOpt.selectedCls);
                    }
                }

            $this.addClass('is-customised');
        });
    };
})(jQuery);
