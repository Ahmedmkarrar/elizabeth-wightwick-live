gmgps.cloud.ui.views.documentTemplateAttachments = function (args) {
    var me = this;
    me.cfg = args.data;
    me.$root = args.$root;

    me.init();

    return true;
};

gmgps.cloud.ui.views.documentTemplateAttachments.prototype = {
    init: function () {
        var me = this;

        me.$root.find('select').customSelect();

        me.loadAttachments();
    },

    loadAttachments: function () {
        var me = this;

        var setUpAttachments = function (response) {
            me.setupAttachmentForm(response);
        };

        if (me.cfg.loadContent) {
            new gmgps.cloud.http(
                "documentTemplateAttachments-loadAttachments"
            ).getView({
                url: '/Document/DocumentTemplateAttachments',
                args: { documentTemplateId: me.cfg.templateId },
                onSuccess: setUpAttachments,
                post: true,
                complex: true
            });
        } else setUpAttachments();
    },

    setupAttachmentForm: function (response) {
        var me = this;

        if (me.cfg.loadContent && response) me.$root.html(response.Data);

        //select attachment
        me.$root.off('change', '#Attach');
        me.$root.on('change', '#Attach', function () {
            var dropdown = $(this);
            var currentList = me.$root.find('.current');
            var template = me.$root.find('.current-template').clone();
            var selected = dropdown.find('option:selected');

            new gmgps.cloud.http(
                "documentTemplateAttachments-setupAttachmentForm"
            ).ajax(
                {
                    args: {
                        DocumentTemplateId: me.cfg.templateId,
                        MediaId: selected.val()
                    },
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: '/Document/CreateDocumentTemplateAttachment',
                    timeout: 6000
                },
                function (createResponse) {
                    if (createResponse.Status == C.ResponseStatusType.Success) {
                        var noAttachments =
                            currentList.find('li.noattachments');
                        if (noAttachments.length > 0) {
                            noAttachments.hide();
                        }

                        //add to current list
                        $(template)
                            .find('li')
                            .attr('data-id', createResponse.Data);
                        $(template)
                            .find('li')
                            .attr('data-media-id', selected.val());
                        $(template).find('.title').html(selected.text());
                        currentList.append(template.html());

                        //remove from dropdown
                        selected.remove();

                        //reset dropdown to first item selected
                        dropdown.val(0);

                        //set up remove event on item we just added
                        me.setUpAttachmentEvents();
                    }
                }
            );
        });

        me.setUpAttachmentEvents(me.$root);
    },

    setUpAttachmentEvents: function () {
        var me = this;

        //remove attachment
        me.$root.off('click', '.remove');
        me.$root.on('click', '.remove', function () {
            var dropdown = me.$root.find('#Attach');
            var currentListItem = $(this).closest('li');

            new gmgps.cloud.http(
                "documentTemplateAttachments-setUpAttachmentEvents"
            ).ajax(
                {
                    args: {
                        DocumentTemplateAttachmentId:
                            currentListItem.attr('data-id')
                    },
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: '/Document/DeleteDocumentTemplateAttachment',
                    timeout: 6000
                },
                function (createResponse) {
                    if (createResponse.Status == C.ResponseStatusType.Success) {
                        //add back to dropdown
                        var newOption = $('<option></option>');
                        newOption.val(currentListItem.attr('data-media-id'));
                        newOption.text(currentListItem.find('.title').text());
                        dropdown.append(newOption);

                        //remove from current list
                        currentListItem.remove();

                        if (me.$root.find('li.attachment').length <= 1) {
                            me.$root.find('li.noattachments').show();
                        }
                    }
                }
            );
        });
    }
};
