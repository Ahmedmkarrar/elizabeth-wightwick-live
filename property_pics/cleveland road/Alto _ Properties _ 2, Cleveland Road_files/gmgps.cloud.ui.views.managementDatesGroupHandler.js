gmgps.cloud.ui.views.managementDatesGroupHandler = function (args) {
    var me = this;
    me.cfg = args;
    me.$root = args.$root;
    me.$window = null;
    me.isDirty = false;
    me.init(args);

    return true;
};

gmgps.cloud.ui.views.managementDatesGroupHandler.prototype = {
    init: function () {
        var me = this;

        me.$window = me.$root.closest('.window');

        //Group > Click
        me.$root.on('click', '.group', function () {
            if (me.isDirty) {
                me.showSavePrompt();
                return;
            }

            //Change the selection to this one.
            me.$root
                .find('.group.bgg-diary')
                .removeClass('bgg-diary selected')
                .addClass('bgg-grey');
            $(this).removeClass('bgg-grey').addClass('bgg-diary selected');

            //Get the user group.
            var id = parseInt($(this).attr('data-id'));
            me.getUserGroup(id);
        });

        //Select the first group.
        me.$root.find('.group:first').trigger('click');

        //User Node > Click
        me.$root.on('click', '.user', function () {
            var $box = $(this).closest('.users');
            $box.find('.user.on').removeClass('on');
            $(this).addClass('on');
        });

        //Member Row > Click
        me.$root.on('click', '.user', function () {
            var $box = $(this).closest('.users');
            $box.find('.user.on').removeClass('on');
            $(this).addClass('on');
        });

        //Group > Undo button > click
        me.$root.on('click', '.undo-button', function () {
            me.setDirty(false);

            //Move any "was-member" users from non-member tree to member list.
            me.$root
                .find('#non-members .user.was-member')
                .each(function (i, v) {
                    me.moveNonMember(parseInt($(v).attr('data-userId')), true);
                });

            //Move any "was-non-member" users from member tree to non-member list.
            me.$root
                .find('#members .user.was-non-member')
                .each(function (i, v) {
                    me.moveMember(parseInt($(v).attr('data-userId')), true);
                });

            //If this was a new group which had never been saved, ditch it entirely.
            var $group = me.$root.find('.group.selected');
            if ($group.hasClass('new')) {
                //New group.
                $group.remove();

                //Re-select the first group in the list (if available), else clear down.
                me.selectFirstGroup();
            }
        });

        //Group > Save button > Click
        me.$root.on('click', '.save-button', function () {
            me.saveUserGroup();
        });

        //Add Member button > Click
        me.$root.on('click', '.add-member-button', function () {
            var id = parseInt(
                me.$root.find('#non-members .user.on').attr('data-userId')
            );
            if (isNaN(id)) return;

            me.moveNonMember(id);
        });

        //Remove Member button > Click
        me.$root.on('click', '.remove-member-button', function () {
            var id = parseInt(
                me.$root.find('#members .user.on').attr('data-userId')
            );
            if (isNaN(id)) return;

            me.moveMember(id);
        });

        //Member Row > Double-Click
        me.$root.on('dblclick', '#members .user', function () {
            var id = parseInt($(this).attr('data-userId'));
            if (isNaN(id)) return;

            me.moveMember(id);
        });

        //Non-Member Node > Double-Click
        me.$root.on('dblclick', '#non-members .user', function () {
            var id = parseInt($(this).attr('data-userId'));
            if (isNaN(id)) return;

            me.moveNonMember(id);
        });

        //Add group button > Click
        me.$root.on('click', '.add-group-button', function () {
            if (me.isDirty) {
                me.showSavePrompt();
                return;
            }

            me.editManagementDateGroup(0);
        });

        //Edit group button > Click
        me.$root.on('click', '.edit-group-button', function () {
            var $group = me.$root.find('.group.selected');

            if ($group.data('systemdefined') === 1) {
                showInfo(
                    'System defined groups cannot be amended here',
                    'System Defined Group'
                );
                return;
            }

            me.editManagementDateGroup($group.data('id'));
        });

        //Remove group button > Click
        me.$root.on('click', '.delete-group-button', function () {
            var $group = me.$root.find('.group.selected');

            if ($group.length === 0) return false;

            if ($group.data('systemdefined') === 1) {
                showInfo(
                    'System defined groups cannot be removed here',
                    'System Defined Group'
                );
                return false;
            }

            showDialog({
                type: 'question',
                title: 'Delete Group?',
                msg:
                    'Are you sure you would you like to delete this group?<br/><br/>' +
                    $group.text(),
                buttons: {
                    Yes: function () {
                        me.deleteUserGroup();
                        $(this).dialog('close');
                    },
                    No: function () {
                        $(this).dialog('close');
                    }
                }
            });
        });
    },

    cancel: function (callback) {
        var me = this;
        if (me.isDirty) {
            me.showSavePrompt();
            callback(false);
        } else {
            callback(true);
        }
    },

    showSavePrompt: function () {
        showInfo(
            'There are unsaved changes to the current group.  Please save or undo the changes first.'
        );
    },

    selectFirstGroup: function () {
        var me = this;
        var $group = me.$root.find('.group:first');
        if ($group.length === 0) {
            me.getUserGroup(0);
        } else {
            $group.trigger('click');
        }
    },

    saveUserGroup: function (isDeletion) {
        var me = this;
        var $group = me.$root.find('.group.selected');

        //Build the list of members.
        var userIds = [];
        me.$root.find('#members .user').each(function (i, v) {
            userIds.push(parseInt($(v).attr('data-userId')));
        });

        //If there are no users in the group, exit early.
        if (!isDeletion && userIds.length === 0) {
            showInfo('Please add some users to the group before saving.');
            return false;
        }

        //Build a UserGroup object.
        var userGroup = {
            userIdList: userIds,
            description: $group.find('#Description').val(),
            groupId: $group.find('#GroupId').val(),
            isActive: $group.find('#IsActive').val(),
            name: $group.find('#Name').val(),
            orderIndex: $group.find('#OrderIndex').val(),
            owningBranchId: $group.find('#OwningBranchId').val(),
            recordId: $group.find('#RecordId').val(),
            searchId: $group.find('#SearchId').val(),
            searchOrder: {
                by: $group.find('#SearchOrder_By').val(),
                type: $group.find('#SearchOrder_Type').val()
            },
            userId: $group.find('#UserId').val(),
            selectionType: $group.find('#SelectionType').val()
        };

        new gmgps.cloud.http("managementDatesGroupHandler-saveUserGroup").ajax(
            {
                args: {
                    savedSearch: userGroup
                },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/SavedSearch/UpdateManagementDateGroupUsers'
            },
            function (response) {
                if (response && response.Data) {
                    if (isDeletion) {
                        //Remove the group.
                        $group.remove();

                        //Select first/clear down.
                        me.selectFirstGroup();
                    } else {
                        //Update the group with the returned data.
                        $group.find('#SearchId').val(response.Data.SearchId);
                        $group.find('#RecordId').val(response.Data.RecordId);
                        $group
                            .find('#OrderIndex')
                            .val(response.Data.OrderIndex);
                    }

                    //Clear the dirty flag.
                    me.setDirty(false);
                }
            }
        );
    },

    deleteUserGroup: function () {
        var me = this;
        var $group = me.$root.find('.group.selected');

        //Marke the group as inactive, then save.
        $group.find('#IsActive').val('False');

        me.saveUserGroup(true);
    },

    getUserGroup: function (id) {
        var me = this;
        new gmgps.cloud.http(
            "managementDatesGroupHandler-getUserGroup"
        ).getView({
            url: '/User/GetManagementDateUserGroup',
            post: true,
            complex: true,
            args: {
                id: id
            },
            onSuccess: function (response) {
                me.$root.find('#usergroup-container').html(response.Data);
                me.initUserGroup();
            }
        });
    },

    initUserGroup: function () {
        var me = this;

        //Show the non-member blanker whilst the tree goes nutty.
        me.$root.find('#non-members .dbox').css('position', 'relative');
        me.$root.find('#non-members .blanker').show();

        //Func to make users in the tree draggable and hide existing group members.
        var after = function () {
            //Hide any "hidden" items - the drawing of the tree turns them back into display: block;
            me.$root.find('#non-members li.hidden').hide();

            //Remove the blanker after 250ms via a fade-in of 250ms.
            setTimeout(function () {
                me.$root
                    .find('#non-members .blanker')
                    .fadeOut(250, function () {
                        me.$root
                            .find('#non-members .dbox')
                            .css('position', 'static');
                    });
            }, 100);
        };

        //Non-Members Tree
        me.$root
            .find('.users-tree')
            .jstree({
                plugins: ['themes', 'html_data'],
                themes: {
                    theme: 'default',
                    dots: true,
                    icons: false
                },
                core: {
                    animation: 0
                }
            })
            .bind('loaded.jstree', function () {
                after();
            });

        me.$root.find('#members table').sortable({
            items: 'tr',
            axis: 'y',
            containment: '#members',
            cursor: 'move',
            stop: function () {
                me.setDirty(true);
            }
        });
    },

    createMemberRow: function ($node) {
        var me = this;

        //Create a member row from a non-member node.
        var $row = $(
            '<tr class="user" data-userId="{0}" data-branchId="{1}"><td><div class="iw16" style="display: inline-block; vertical-align: middle;"><div class="i-black i-black-user_9x12" style="display: inline-block; padding-right: 1px;"></div></div> {2}</td><td>{3}</td></tr>'.format(
                $node.attr('data-userId'),
                $node.attr('data-branchId'),
                $node.attr('data-userName'),
                $node.attr('data-branchName')
            )
        );

        //Ensure that original "was-member" and "was-non-member" classes are preserved on the new row.
        if ($node.hasClass('was-member')) $row.addClass('was-member');
        if ($node.hasClass('was-non-member')) $row.addClass('was-non-member');

        me.$root.find('#members table').append($row);
        //        me.makeMemberRowDraggable($row);

        me.setDirty(true);

        return $row;
    },

    moveMember: function (id, noDirtyTrigger) {
        var me = this;

        var $memberRow = me.$root.find(
            '#members .user[data-userId="{0}"]'.format(id)
        );

        //Remove the member.
        $memberRow.remove();

        //Re-display the hidden non-member.
        me.$root
            .find('#non-members .user[data-userId="{0}"]'.format(id))
            .show();

        if (!noDirtyTrigger) {
            me.setDirty(true);
        }
    },

    moveNonMember: function (id, noDirtyTrigger) {
        var me = this;

        //Hide the non-member.
        var $node = me.$root.find(
            '#non-members .user[data-id="{0}"]'.format(id)
        );
        $node.removeClass('on').hide();

        //Get info from non-member node to create member row.
        me.createMemberRow($node);

        if (!noDirtyTrigger) {
            me.setDirty(true);
        }
    },

    showSaveBox: function () {
        var me = this;

        //Exit early if form is already known to be dirty.
        if (me.isDirty) return;

        var $saveBox = me.$root.find('.save-box').clone();
        var $group = me.$root.find('.group.selected');

        $group.find('.warn').fadeIn();

        $saveBox.insertAfter($group);
        $saveBox.fadeIn();
    },

    setDirty: function (dirty) {
        var me = this;

        if (!dirty) {
            //Remove save-box, etc.
            var $group = me.$root.find('.group.selected');
            $group.find('.warn').fadeOut();

            me.$root.find('.groups .save-box').remove();
        } else {
            me.showSaveBox();
        }

        me.isDirty = dirty;
    },

    editManagementDateGroup: function (id) {
        var me = this;
        new gmgps.cloud.ui.controls.window({
            title: id === 0 ? 'Add Management Date' : 'Edit Management Date',
            windowId: 'managementDateModal',
            controller: gmgps.cloud.ui.views.editManagementDatesGroupHandler,
            url: 'User/EditManagementDateGroup',
            urlArgs: {
                id: id
            },
            post: true,
            width: 650,
            draggable: true,
            modal: true,
            actionButton: 'Save',
            cancelButton: 'Cancel',
            callback: function (searchId) {
                if (searchId) {
                    me.freshGroupItem(searchId);
                    $('.nav-tabs .tab[data-tab="diary"]').trigger('click');
                }
            },
            onAction:
                me.onComplete ||
                function () {
                    return true;
                },
            onCancel:
                me.onComplete ||
                function () {
                    return false;
                }
        });
    },

    freshGroupItem: function (id) {
        var me = this;

        new gmgps.cloud.http("managementDatesGroupHandler-freshGroupItem").ajax(
            {
                args: {
                    searchId: id
                },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/SavedSearch/GetManagementDateGroupItem'
            },
            function (response) {
                if (response && response.Data) {
                    var $item = $(response.Data);

                    var $group = me.$root.find(
                        '.group[data-id="{0}"]'.format(id)
                    );

                    if ($group.length === 0) {
                        // new group, append to end
                        me.$root.find('.groups').append($item);
                        $item.scrollintoview({ direction: 'y' });
                    } else {
                        $group.replaceWith($item);
                    }

                    $item.trigger('click'); // refresh members list
                }
            }
        );
    }
};
