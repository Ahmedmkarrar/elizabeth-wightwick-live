gmgps.cloud.ui.views.carousel = function (
    $slides,
    $container,
    autoplay,
    startImageUrl
) {
    var me = this;

    me.init($slides, $container, autoplay, startImageUrl);

    return true;
};

gmgps.cloud.ui.views.carousel.prototype = {
    init: function ($slides, $container, autoplay, startImageUrl) {
        $slides.appendTo($container);
        $container.show();

        // doesnt like being loaded more than once
        if (!Galleria.classic) {
            Galleria.loadTheme(
                '/scripts/jquery/plugins/galleria/themes/classic/galleria.classic.js'
            );
            Galleria.classic = true;
        }

        Galleria.run('#galleria', {
            transition: 'fadeslide',
            trueFullscreen: false,
            autoplay: autoplay || 5000,
            imageCrop: false,
            imagePan: false,
            wait: true,
            queue: false,
            initialTransition: 'fade',
            lightbox: false,
            lightboxFadeSpeed: 500,
            extend: function () {
                var isiPad = navigator.userAgent.match(/iPad/i) !== null;

                var gallery = this;

                this.addElement('exit').appendChild('container', 'exit');

                var btn = this.$('exit')
                    .hide()
                    .text('Close')
                    .attr('title', 'Close Slideshow')
                    .click(function () {
                        gallery.destroy();
                        $container.hide();
                        $container.empty();
                    });

                if (!isiPad) {
                    this.bind('idle_exit', function () {
                        btn.fadeIn();
                    });

                    this.bind('idle_enter', function () {
                        btn.fadeOut();
                    });

                    this.attachKeyboard({
                        escape: function () {
                            gallery.destroy();
                            $container.hide();
                            $container.empty();
                        }
                    });
                } else {
                    btn.show();
                }

                if (startImageUrl !== undefined) {
                    for (var x = 0; x < this._data.length; x++) {
                        if (this._data[x].image === startImageUrl) {
                            gallery.pause();
                            gallery.show(x);
                            break;
                        }
                    }
                }
            }
        });
    },

    destroy: function () {},

    action: function (onComplete) {
        onComplete();
    },

    cancel: function (onComplete) {
        onComplete();
    }
};
