((function($) {
    var oldHTML = $.fn.html;

    $.fn.formhtml = function () {
        if (arguments.length) return oldHTML.apply(this, arguments);

        //Ensure the correct value is set for every input element.
        $('input,button', this).each(function () {
            this.setAttribute('value', this.value);
        });

        //Ensure the correct value is set for every textarea element.
        $('textarea', this).each(function () {
            // updated - thanks Raja!
            this.innerHTML = this.value;
        });

        //Ensure the correct value is set for every checkbox/radio element.
        $('input:radio,input:checkbox', this).each(function () {
            if (this.checked) {
                this.setAttribute('checked', 'checked');
            } else {
                this.removeAttribute('checked');
            }
        });

        //Ensure the correct value is set for every select->option element.
        $('option', this).each(function () {
            if (this.selected) {
                this.setAttribute('selected', 'selected');
            } else {
                this.selected = false;
                this.removeAttribute('selected');
            }
        });

        //Remove any phantom selected option attributes (e.g. selected="")
        //else IE tends to leave them in, resulting in the jQuery form serializer thinking that an item is selected when it isn't.
        //this[0].innerHTML = this[0].innerHTML.replace(/selected=""/g, '');

        //Call the standard html() func on the resulting form.
        return oldHTML.apply(this);
    };

    //optional to override real .html() if you want
    // $.fn.html = $.fn.formhtml;
}))(jQuery);
