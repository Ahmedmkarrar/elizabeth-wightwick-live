((function() {
    var _this;

    function Control(wordCount, truncateText) {
        _this = this;
        _this.wordCount = wordCount;
        _this.truncateText = truncateText;
    }

    Control.prototype = {
        apply: function ($target) {
            if ($target.length === 0) {
                return;
            }

            _this.container = $target;

            var counter = $target.find('.textarea-counter');

            counter.append(
                '<div class="count"></div><div class="barbox"><div class="progressbar"></div></div>'
            );

            _this.barbox = _this.container.find('.barbox');
            _this.progressBar = _this.container.find('.progressbar');
            _this.counter = _this.container.find('.count');
            _this.textarea = _this.container.find('textarea.countable');

            _this.textarea.on('keyup', _onkeyup);

            count();

            return function off() {
                $target.off('keyup', 'textarea.countable', _onkeyup);
            };
        }
    };

    function count() {
        _this.barbox.show();

        var text = _this.textarea.val();
        if (!text) {
            return;
        }

        var main = text.length * 100;

        var value = main / _this.wordCount;
        var count = _this.wordCount - text.length;

        if (text.length <= _this.wordCount) {
            _this.progressBar.css('background-color', '#aaef97');
            _this.counter.html(count);
            _this.progressBar.animate(
                {
                    width: value + '%'
                },
                1
            );
        } else {
            _this.progressBar.css('background-color', 'red');
            if (_this.truncateText) {
                _this.textarea.val(text.substr(0, _this.wordCount));
            }
            _this.counter.html(0);

            _this.progressBar.animate(
                {
                    width: 100 + '%'
                },
                1
            );
        }
    }

    function _onkeyup() {
        count();
    }

    gmgps.cloud.ui.controls.CharacterCounter = Control;
}))();
