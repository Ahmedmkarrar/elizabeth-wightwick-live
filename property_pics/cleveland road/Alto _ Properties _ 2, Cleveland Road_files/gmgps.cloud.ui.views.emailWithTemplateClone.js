gmgps.cloud.ui.views.emailWithTemplateClone = function (args) {
    var me = this;
    me.cfg = args;
    me.$root = args.$root;
    me.$window = me.$root.closest('.window');
    me.templateId = 0;
    me.emailHelpUrl = me.$root.find('#EmailHelpUrl').val();
    me.init(args);

    return this;
};

gmgps.cloud.ui.views.emailWithTemplateClone.typeName =
    'gmgps.cloud.ui.views.emailWithTemplateClone';

gmgps.cloud.ui.views.emailWithTemplateClone.prototype = {
    init: function () {
        var me = this;
        me.$window = me.$root.closest('.window');
        
        var nextButton =
            '<div class="btn grey sml next-button" id="use-template-btn">Create New Template</div>';
        me.$window.find('.cancel-button').after(nextButton);

        me.$window.on('click', '.next-button', function () {
            
            gmgps.cloud.helpers.general.openEmailTemplateEditor({
                title: 'Clone Email Template',
                settings: {
                    templateId: 0,
                    templateType: C.DocumentTemplateType.AdHocLetter,
                    isNew: true
                },
                data: {
                    beTemplateIdToClone: me.templateId
                },
                callback: function () {
                    me.cfg.closeMyWindow();
                }
            });
        });
        
        me.$window.find('.cancel-button').css('float', 'left');
        
        me.$window.on('change', '.template-selector', function () {
            me.templateId = $(this).val() || 0;
        });

        var templateSelector = me.$root.find('select.template-selector');
        var defaultTemplateId = me.$root.find('input#DefaultTemplateId').val();
        
        templateSelector.val(defaultTemplateId);
        me.templateId = defaultTemplateId;

        me.$root.find('select').customSelect();

        me.setupHelpLink();
        me.showTemplateSelection();
    },

    setupHelpLink: function () {
        var me = this;
        //Inject link into title bar.
        me.$helpLink = $(
            '<div class="branding" title="Help...">What\'s this<i class="ml7 fa fa-info-circle fa-lg"></i></div>'
        );
        me.$window.find('.top').append(me.$helpLink);

        //link > Click
        me.$helpLink.on('click', function () {
            // open link to support page.  It's confirmed that this url is static and will not change
            window.open(me.emailHelpUrl);
        });
    },
    
    cancel: function (onComplete) {
        var me = this;
        me.$root.find('form').validationEngine('hideAll');
        onComplete(false);
    },
    

    moveWindow: function (moveUpPercent) {
        var me = this;
        var moveUpPixels = 0;

        if (moveUpPercent) {
            moveUpPixels = ($(window).height() / 100) * moveUpPercent;
        }

        var newTop =
            $(window).height() / 2 - me.$window.height() / 2 - moveUpPixels;

        // set a minimum to stop the modal going off the screen
        newTop = newTop < 0 ? 10 : newTop;

        me.$window.css('top', newTop);
    },

    showTemplateSelection: function () {
        var me = this;

        me.$window.find('.back-button').hide();
        me.$window.find('.action-button').hide();
        me.$window.find('.email-form').hide();
        me.$window.find('.next-button').show();
        me.$window.find('.template-panel').show();
        me.$window
            .find('.title')
            .replaceWith(
                '<div class="title">Select a template to duplicate</div>'
            );
        me.moveWindow(me.cfg.windowConfiguration.percentHigher);
    }
};
