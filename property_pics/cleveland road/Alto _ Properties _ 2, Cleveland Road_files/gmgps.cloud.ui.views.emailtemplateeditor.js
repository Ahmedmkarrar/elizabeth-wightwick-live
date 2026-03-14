gmgps.cloud.ui.views.emailTemplateEditor = function (args) {
    var me = this;
    me.cfg = args;

    me.beTemplateIdToClone = null;
    if (args.data && args.data.beTemplateIdToClone) {
        var beTemplateIdToClone = parseInt(args.data.beTemplateIdToClone, 10);
        if (!isNaN(beTemplateIdToClone)) {
            me.beTemplateIdToClone = beTemplateIdToClone;
        }
    }
    
    me.$root = args.$root;
    me.$window = null;
    me.http =
        args.http ||
        new gmgps.cloud.http("emailtemplateeditor-emailTemplateEditor");
    me.editor = null;
    me.id = parseInt(me.$root.find('#Template_Id').val());
    me.isSuperseded = false;
    me.documentMergeCodes = null;
    me.isDirty = false;
    me.mergeCodeTranslations = null;
    me.beePlugin = null;
    me.saveCallback = null;
    me.beePluginContainerId = 'bee-plugin-editor-container';
    me.emailHelpUrl = me.$root.find('#EmailHelpUrl').val();
    me.init(args);

    return this;
};

gmgps.cloud.ui.views.emailTemplateEditor.prototype = {
    //Note:  The usage of setTimeout within this object is to cater for the differences between browsers when it comes to dealing with the target of keypress events.

    init: function () {
        var me = this;

        me.$window = me.$root.closest('.window');

        //add buttons
        var canBeDeleted =
            me.$root.find('#Template_CannotBeDeleted').val() !== 'True';
        if (canBeDeleted) {
            me.$window
                .find('.bottom .buttons')
                .prepend(
                    '<div class="btn delete-button bgg-grey" style="min-width: 110px; float: left;">Delete Template</div>'
                );
            me.$window.find('.delete-button').removeClass('disabled');
        }

        if (me.id != 0) {
            // Existing template, start off non-dirty.
            me.$window.find('.action-button').addClass('disabled');
        } else {
            //New template, allow save from the get go but don't allow delete
            me.$window.find('.delete-button').addClass('disabled');
            me.setDirty(true);
        }

        //UI init.
        me.$root.find('select').customSelect();
        me.initBeeEditor();

        //Set focus on the name field if this is a new template.
        if (me.id === 0) {
            me.$root.find('#Template_Name').focus();
        }

        //Delete Button > Click
        me.$window.on('click', '.delete-button', function () {
            showDialog({
                zIndex: 9999999,
                type: 'question',
                title: 'Delete Template',
                msg: 'Are you sure you would like to delete this template?',
                buttons: {
                    Yes: function () {
                        new gmgps.cloud.http("emailtemplateeditor-Yes").ajax(
                            {
                                args: {
                                    templateId: me.id,
                                    propertyId: 0,
                                    templateTypeId: 0
                                },
                                complex: true,
                                dataType: 'json',
                                type: 'post',
                                url: '/publisher/deletepublishertemplate'
                            },
                            function () {
                                me.cfg.closeMyWindow();
                            }
                        );

                        $(this).dialog('close');
                    },
                    No: function () {
                        $(this).dialog('close');
                    }
                }
            });
        });

        me.attachDirtyListeners();
    },

    attachDirtyListeners: function () {
        var me = this;

        me.$root.on('change', 'select, input', function () {
            me.setDirty(true);
        });
    },

    saveTemplate: function (json, html, beeTemplateId) {
        var me = this;
        
        // We need reset beeTemplateId if this is clone of the template
        if (me.beTemplateIdToClone) {
            beeTemplateId = 0;
        }
        
        //Set computed fields.
        me.$root
            .find('#Template_Status')
            .val(
                me.$root.find('#LTEStatusActiveSelected').prop('checked')
                    ? C.DocumentTemplateStatus.ActiveSelected
                    : C.DocumentTemplateStatus.ActiveUnselected
            );

        //Save the template.
        var postbackForm = createForm(
            me.$root,
            '/EmailTemplate/UpdateEmailTemplate'
        );

        $('<input>')
            .attr({
                type: 'hidden',
                name: 'Template.Content'
            })
            .val(html)
            .appendTo(postbackForm);

        $('<input>')
            .attr({
                type: 'hidden',
                name: 'BeePluginTemplate.Content'
            })
            .val(json)
            .appendTo(postbackForm);

        $('<input>')
            .attr({
                type: 'hidden',
                name: 'BeePluginTemplate.Id'
            })
            .val(beeTemplateId)
            .appendTo(postbackForm);

        me.http.postForm(
            postbackForm,
            function (response) {
                if (response.Data !== 0) {
                    me.beePlugin.setBeeTemplateId(response.Data.BeeTemplateId);
                    me.id = response.Data.TemplateId;
                    me.$root.find('#Template_Id').val(me.id);
                    me.$window.find('.delete-button').removeClass('disabled');
                    if (me.saveCallback) {
                        me.saveCallback(true);
                        me.saveCallback = null;
                    }
                }

                me.setDirty(false);
            },
            function () {
                if (me.saveCallback) {
                    me.saveCallback(true);
                    me.saveCallback = null;
                }
            }
        );
    },

    action: function (callback) {
        var me = this;

        me.saveCallback = callback;

        if (me.$root.find('#Template_Name').val() == '') {
            showInfo('Please give the template a name.');
            return false;
        }
        me.beePlugin.save();
    },

    cancel: function (closeCallback) {
        var me = this;

        //Decided what to do when the close button is clicked, depending on whether or not there are unsaved changes.
        if (me.isDirty) {
            showDialog({
                zIndex: 9999999,
                type: 'question',
                title: 'Unsaved Changes',
                msg: 'You have unsaved changes on this template.',
                buttons: {
                    Save: function () {
                        $(this).dialog('close');
                        me.action(function () {
                            closeCallback(true);
                        });
                    },
                    'Discard Changes': function () {
                        closeCallback(true);
                        $(this).dialog('close');
                    },
                    Cancel: function () {
                        closeCallback(false);
                        $(this).dialog('close');
                    }
                }
            });

            return true; //prevent the window from closing
        }
    },

    setDirty: function (isDirty) {
        var me = this;

        if (isDirty != me.isDirty) {
            me.isDirty = isDirty;

            var $actionButton = me.$window.find('.action-button');

            if (isDirty) {
                $actionButton.removeClass('disabled').prop('disabled', false);
            } else {
                $actionButton.addClass('disabled').prop('disabled', true);
            }
        }
    },

    initBeeEditor: function () {
        var me = this;
        var uid = me.$root.find('#Uid').val();
        var beePluginTemplateId = me.$root.find('#bee-template-id').val();
        
        // If we are cloning existing template we want to set beePluginTemplateId
        if (me.beTemplateIdToClone) {
            beePluginTemplateId = me.beTemplateIdToClone;
        }
        
        me.beePlugin = new gmgps.cloud.integration.BeePluginGateway(
            me.$root.get(0).ownerDocument,
            {
                templateId: beePluginTemplateId,
                uid: uid,
                containerId: me.beePluginContainerId,
                helpUrl: me.emailHelpUrl,
                roleHash: '4jkl3k00f891jkkj2323',
                onSave: function (json, html, beeTemplateId) {
                    me.saveTemplate(json, html, beeTemplateId);
                },
                onChange: function () {
                    me.setDirty(true);
                }
            }
        );

        me.beePlugin.load();
    }
};
