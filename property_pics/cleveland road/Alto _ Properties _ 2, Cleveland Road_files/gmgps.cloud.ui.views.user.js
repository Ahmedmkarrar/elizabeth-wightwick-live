gmgps.cloud.ui.views.userGroupManager = function (args) {
    var me = this;
    me.cfg = args;
    me.$root = args.$root;
    me.isDirty = false;
    me.init(args);
    me.$window = null;
    return true;
};

gmgps.cloud.ui.views.userGroupManager.prototype = {
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
            } else {
                //Existing group.  If there is an old name being stored, reset it.
                var oldName = $group.attr('data-oldName');
                if (oldName) {
                    $group.find('span').text(oldName);
                    $group.find('#userGroup_Name').val(oldName);
                    $group.removeAttr('data-oldName');
                }
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

        //Add Watcher button > Click
        me.$root.on('click', '.add-watcher-button', function () {
            var id = parseInt(
                me.$root.find('#non-members .user.on').attr('data-userId')
            );
            if (isNaN(id)) return;

            me.moveWatcher(id);
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

            //Prompt for the name of the new group and mark it unsaved.
            gmgps.cloud.helpers.general.promptForString(
                'Name',
                'New Group',
                'Add Group',
                function (value) {
                    //Get a new group element and inject it.
                    var $group = me.getGroupTemplate(value);
                    me.$root.find('.groups').append($group);
                    $group.trigger('click');
                    setTimeout(function () {
                        me.setDirty(true);
                    }, 500);
                }
            );
        });

        //Rename group button > Click
        me.$root.on('click', '.rename-group-button', function () {
            var $group = me.$root.find('.group.selected');
            var $groupName = $group.find('span');
            var $groupNameInput = $group.find('#userGroup_Name');

            //Prompt for the new name of the new group and mark it unsaved.
            gmgps.cloud.helpers.general.promptForString(
                'Name',
                $groupName.text(),
                'Rename Group',
                function (value) {
                    //Save the old name in the group element in case undo is chosen later.
                    $groupName
                        .closest('.group')
                        .attr('data-oldName', $groupName.text());
                    $groupName.text(value);
                    $groupNameInput.val(value);
                    setTimeout(function () {
                        me.setDirty(true);
                    }, 500);
                }
            );
        });

        //Remove group button > Click
        me.$root.on('click', '.delete-group-button', function () {
            var $group = me.$root.find('.group.selected');
            if ($group.length === 0) return false;

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

        //If there are no groups, offer to create one.
        var count = me.$root.find('.groups .group').length;
        if (count === 0) {
            showDialog({
                type: 'question',
                title: 'Create a group?',
                msg: 'You have no groups defined, would you like to create one now?',
                buttons: {
                    Yes: function () {
                        me.$root.find('.add-group-button').trigger('click');
                        $(this).dialog('close');
                    },
                    No: function () {
                        $(this).dialog('close');
                    }
                }
            });
        }
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

    getGroupTemplate: function (name) {
        var me = this;

        var $group = $(
            '<div class="new group bgg-grey" data-id="0">' +
                '<div class="icon-32 icon-2people fl mr5"></div>' +
                '<span>{0}</span>'.format(name) +
                '<div class="clear"></div>' +
                '<div class="warn"></div>' +
                '</div>'
        );

        //Clone the hidden fields, set the chosen name for the group and inject.
        var $hiddenFields = me.$root
            .find('#usergroup-hidden-fields-template')
            .clone();
        $hiddenFields.find('#userGroup_Name').val(name);
        $group.append($hiddenFields);

        return $group;
    },

    saveUserGroup: function (isDeletion) {
        var me = this;
        var $group = me.$root.find('.group.selected');

        //Build the list of members.
        var userIds = [];
        me.$root.find('#members .user:not(.watcher)').each(function (i, v) {
            userIds.push(parseInt($(v).attr('data-userId')));
        });

        //Build the list of watchers.
        var watcherUserIds = [];
        me.$root.find('#members .watcher').each(function (i, v) {
            watcherUserIds.push(parseInt($(v).attr('data-userId')));
        });

        //If there are no users in the group, exit early.
        if (!isDeletion && userIds.length === 0) {
            showInfo('Please add some users to the group before saving.');
            return false;
        }

        //Build a UserGroup object.
        var userGroup = {
            userIdList: userIds,
            watcherUserIdList: watcherUserIds,
            description: $group.find('#userGroup_Description').val(),
            groupId: $group.find('#userGroup_GroupId').val(),
            isActive: $group.find('#userGroup_IsActive').val(),
            name: $group.find('#userGroup_Name').val(),
            orderIndex: $group.find('#userGroup_OrderIndex').val(),
            owningBranchId: $group.find('#userGroup_OwningBranchId').val(),
            recordId: $group.find('#userGroup_RecordId').val(),
            searchId: $group.find('#userGroup_SearchId').val(),
            searchOrder: {
                by: $group.find('#userGroup_SearchOrder_By').val(),
                type: $group.find('#userGroup_SearchOrder_Type').val()
            },
            userId: $group.find('#userGroup_UserId').val(),
            selectionType: $group.find('#userGroup_SelectionType').val()
        };

        //Remove any old name storage.
        $group.removeAttr('data-oldName');

        new gmgps.cloud.http("user-saveUserGroup").ajax(
            {
                args: {
                    savedSearch: userGroup
                },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/SavedSearch/UpdateUserGroup'
            },
            function (response) {
                if (isDeletion) {
                    //Remove the group.
                    $group.remove();

                    //Select first/clear down.
                    me.selectFirstGroup();
                } else {
                    //Update the group with the returned data.
                    $group
                        .find('#userGroup_SearchId')
                        .val(response.Data.SearchId);
                    $group
                        .find('#userGroup_RecordId')
                        .val(response.Data.RecordId);
                    $group
                        .find('#userGroup_OrderIndex')
                        .val(response.Data.OrderIndex);
                }

                //Clear the dirty flag.
                me.setDirty(false);
            }
        );
    },

    deleteUserGroup: function () {
        var me = this;

        var $group = me.$root.find('.group.selected');

        //Marke the group as inactive, then save.
        $group.find('#userGroup_IsActive').val('False');

        me.saveUserGroup(true);
    },

    getUserGroup: function (id) {
        var me = this;
        new gmgps.cloud.http("user-getUserGroup").getView({
            url: '/user/getusergroup',
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

            //            me.$root.find('.user').draggable({
            //                containment: me.$root.find('.usergroup'),
            //                delay: 100,
            //                revert: 'invalid', //revert unless the user was dropped into the members list.
            //                helper: function () {
            //                    var $e = $(this).clone();
            //                    $e.find('.jstree-icon').remove();
            //                    return $e;
            //                },
            //                start: function () {
            //                    //Before dragging, unselect the selected user (if any).
            //                    var $box = $(this).closest('.users');
            //                    $box.find('.user.on').removeClass('on');
            //                },
            //                stop: function () { }
            //            });

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

        //        //Set the members box up as a drop target for non-member items.
        //        me.$root.find('#members').droppable({
        //            accept: 'li.user',
        //            drop: function (event, ui) {

        //                //Move the non-member to a member.
        //                var userId = parseInt(ui.draggable.attr('data-userId'));
        //                me.moveNonMember(userId);
        //            }
        //        });

        //        //Set the non-members box up as a drop target for member items.
        //        me.$root.find('#non-members').droppable({
        //            accept: 'tr.user',
        //            drop: function (event, ui) {

        //                //Move the member to a non-member.
        //                var userId = parseInt(ui.draggable.attr('data-userId'));
        //                me.moveMember(userId);
        //            }
        //        });

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

    createMemberRow: function ($node, isWatcher) {
        var me = this;

        var $row;

        if (isWatcher) {
            //Create a watcher row from a non-member node.
            $row = $(
                '<tr class="user watcher" data-userId="{0}" data-branchId="{1}"><td><div class="iw16" style="display: inline-block; vertical-align: middle;"><div class="i-black i-black-eye_8x6" style="display: inline-block; padding-right: 1px; padding-bottom: 3px;"></div></div> {2}</td><td>{3}</td></tr>'.format(
                    $node.attr('data-userId'),
                    $node.attr('data-branchId'),
                    $node.attr('data-userName'),
                    $node.attr('data-branchName')
                )
            );
        } else {
            //Create a member row from a non-member node.
            $row = $(
                '<tr class="user" data-userId="{0}" data-branchId="{1}"><td><div class="iw16" style="display: inline-block; vertical-align: middle;"><div class="i-black i-black-user_9x12" style="display: inline-block; padding-right: 1px;"></div></div> {2}</td><td>{3}</td></tr>'.format(
                    $node.attr('data-userId'),
                    $node.attr('data-branchId'),
                    $node.attr('data-userName'),
                    $node.attr('data-branchName')
                )
            );
        }

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
        me.createMemberRow($node, false);

        if (!noDirtyTrigger) {
            me.setDirty(true);
        }
    },

    moveWatcher: function (id, noDirtyTrigger) {
        var me = this;

        //Hide the non-member.
        var $node = me.$root.find(
            '#non-members .user[data-id="{0}"]'.format(id)
        );
        $node.removeClass('on').hide();

        //Get info from non-member node to create member row.
        me.createMemberRow($node, true);

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
    }
};
