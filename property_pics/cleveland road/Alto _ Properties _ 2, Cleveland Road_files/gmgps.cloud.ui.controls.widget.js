//-----------------------------------------------------------------------------------------------------------------------------------------
gmgps.cloud.ui.controls.widget = function (args) {
    var me = this;
    me.cfg = args;
    me.intervalTimer;
    me.$root = me.cfg.$root;
    me.isDirty = false;
    me.init(args);
    return this;
};

gmgps.cloud.ui.controls.widget.prototype = {
    init: function (args) {
        var me = this;

        me.settingsPanel = null;

        me.cfg = args;

        me.$root.on('click', '.widget-settings', function () {
            me.settingsPanel = me.showSettings();
        });

        me.$root.on('click', '.ok-button', function () {
            me.cancelled = false;
            me.settingsPanel.revertFlip();
        });

        me.$root.on('click', '.cancel-button', function () {
            me.cancelled = true;
            me.settingsPanel.revertFlip();
        });

        if (typeof me.cfg.initialise == 'function') {
            me.cfg.initialise(me.$root);
        }

        me.settitle();
    },

    settitle: function () {
        var me = this;
        if (typeof me.cfg.titletext == 'function') {
            var title = me.cfg.titletext();
            me.$root.find('.titlebar .titletext h2').html(title);
            me.$root.find('.titlebar .titletext').attr('title', title);
        }
    },
    refresh: function (force) {
        var me = this;
        if (typeof me.cfg.refresh == 'function') {
            me.cfg.refresh(force);

            var interval = me.cfg.settings().interval;

            if (interval !== undefined && interval > 0) {
                me.killTimer();

                me.intervalTimer = setInterval(function () {
                    me.refresh();
                }, interval);
            }
        }

        return me;
    },

    destroy: function () {
        this.killTimer();
    },

    killTimer: function () {
        if (this.intervalTimer !== undefined) {
            clearInterval(this.intervalTimer);
        }
    },
    showSettings: function () {
        var me = this;
        var $item = this.$root;

        me.flipped = false;
        me.cancelled = false;

        var $settings = me.$root.find('.settings');

        $item.flip({
            direction: 'rl',
            content: $settings,
            speed: 150,
            bgColor: 'transparent',
            color: 'transparent',
            onBefore: function () {
                // flipping back so save changes
                if (me.flipped == true && !me.cancelled) {
                    if (typeof me.cfg.persist == 'function') {
                        me.cfg.persist($item);
                    }
                }
            },
            onAnimation: function () {},
            onEnd: function () {
                if (me.flipped == false) {
                    // loading settings

                    // load settings panel data
                    if (typeof me.cfg.retrieve == 'function') {
                        me.cfg.retrieve($item);
                    }

                    $item.find(':input:enabled:visible:first').focus();

                    me.flipped = true;
                } else {
                    me.flipped = false;
                    me.settitle();
                    me.refresh();
                }
            }
        });

        return $item;
    },
    setDirty: function (dirty) {
        var me = this;
        if (dirty != undefined) {
            me.isDirty = dirty;
        } else {
            me.isDirty = true;
        }
    }
};
