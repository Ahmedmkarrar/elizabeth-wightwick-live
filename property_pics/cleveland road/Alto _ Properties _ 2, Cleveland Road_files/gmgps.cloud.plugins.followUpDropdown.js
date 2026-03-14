((function($) {
    /*
        Usage:
        You can either supply a parent like this:

            <div id="my-container"></div>

        ...or you can build the html on the server and then point this plugin at that.  When using the first method, the plugin will
        fetch and build out the html for you.

        New tasks generated server-side on a new, unsaved parent:
            - Update:
    */

    $.followUpDropdown = function (element, options) {
        var plugin = this;
        var $container = $(element);
        var $select = $(element).children('.followUpDropdown');
        var $expandButton = $container.find('.expand-button');

        // Default options
        var defaults = {
            allowCreate: true,
            display: 'slide',
            linkedType: C.ModelType.Unknown,
            linkedId: 0,
            windowTitle: 'Follow Up',
            reInitialise: false,
            followUpSettings: {},
            someCallback: function () {}
        };

        // this will hold the merged default, and user-provided options
        // plugin's properties will be available through this object like:
        // plugin.settings.propertyName from inside the plugin or
        // element.data('pluginName').settings.propertyName from outside the plugin
        plugin.settings = {};

        plugin.init = function () {
            var deferred = $.Deferred();

            plugin.settings = $.extend({}, defaults, options);

            if ($select.length === 0) {
                //No initial population of the list from the server, so request the list now.
                plugin.autoInit(plugin.settings).then(function () {
                    deferred.resolve($container);
                });
            } else {
                deferred.resolve($container);
            }

            //Dropper > Click
            $container.on('click', '.dropper:not(.empty)', function () {
                plugin.toggle();
            });

            //Adder > Click
            $container.on('click', '.adder', function () {
                plugin.promptForFollowUpType(function (
                    followUpType,
                    typeDescription
                ) {
                    plugin.createFollowUp(followUpType, typeDescription);
                });
            });

            //FollowUp > Click
            $container.on('click', '.followUpDropdownItem', function () {
                plugin.editFollowUp($(this), plugin.settings.followUpSettings);
            });

            //Complete/Undo > Click
            $container.on('click', '.action-button-container', function (e) {
                e.stopPropagation();

                var $btn = $(this).find('.complete-button');

                if ($btn.closest('.list').find('.busy').length !== 0)
                    return false;

                var $followUp = $btn.closest('.followUpDropdownItem');
                var followUp = plugin.getFollowUpObject($followUp);
                var completedTarget = !$btn.hasClass('on');
     
                var proceed = function () {
                    if (followUp.Id !== 0) {
                        $btn.addClass('busy');
                        $btn.find('i').removeClass('fa-check').addClass('fa-cog fa-spin busy');
                    }
                    plugin.quickComplete($followUp, followUp, completedTarget);
                };

                if (plugin.settings.onBeforeQuickComplete) {
                    var gate = plugin.settings.onBeforeQuickComplete();

                    if (gate && typeof gate.then === 'function') {
                        gate.then(proceed, function () {});
                        return;
                    }

                    if (gate === false) return;
                }

                proceed();
            });

            return deferred.promise();
        };

        plugin.destroy = function () {
            // in cases of reinitialisation of plugin
            $container.off();
            // clean out the rest
            $container.removeData();
            $container.empty();
        };

        plugin.getFollowUpObject = function ($followUp) {
            var $serializedInstance = $followUp.find('#SerializedInstance');
            var json = $serializedInstance.val();
            var followUp = JSON.parse(json);

            //Preserve dates
            if (followUp.DueDate) {
                followUp.TempDueDate = followUp.DueDate; //until coverting dates back and forth is resolved here, preserve date in anticipation of setFollowUpObject() call
                followUp.DueDate = new Date(followUp.DueDate);
            }
            if (followUp.CompletionDate) {
                followUp.TempCompletionDate = followUp.CompletionDate; //until coverting dates back and forth is resolved here, preserve date in anticipation of setFollowUpObject() call
                followUp.CompletionDate = new Date(followUp.CompletionDate);
            }

            followUp.$serializedInstance = $serializedInstance;

            return followUp;
        };

        plugin.setFollowUpObject = function (followUp, $followUp) {
            var $serializedInstance = $followUp.find('#SerializedInstance');

            //Restore dates
            if (followUp.TempDueDate) {
                followUp.DueDate = followUp.TempDueDate;
            }
            if (followUp.TempCompletionDate) {
                followUp.CompletionDate = followUp.TempCompletionDate;
            }

            var json = JSON.stringify(followUp);
            $serializedInstance.val(json);

            return json;
        };

        plugin.removeFollowUps = function (
            linkedId,
            linkedType,
            followUpTypes
        ) {
            var $existingFollowUps = plugin.getFollowUpObjects();

            var $followUps = $.grep($existingFollowUps, function (f) {
                return (
                    followUpTypes.indexOf(f.Type) > -1 &&
                    f.LinkedId === linkedId &&
                    f.LinkedType === linkedType
                );
            });

            $.each($followUps, function (i, f) {
                f.$serializedInstance
                    .closest('.followUpDropdownItem-container')
                    .remove();
            });
        };

        plugin.updateFollowUpsTargetUserAndBranch = function (args) {
            var $existingFollowUps = plugin.getFollowUpObjects();

            var $followUps = $.grep($existingFollowUps, function (f) {
                return args.types.indexOf(f.Type) > -1;
            });

            $.each($followUps, function (i, f) {
                f.TargetUserId = args.targetUserId;
                f.BranchId = args.branchId;
                plugin.updateFollowUpObject(f);
            });
        };

        plugin.updateFollowUpObject = function (followUp) {
            var $serializedInstance = followUp.$serializedInstance;

            //Restore dates
            if (followUp.TempDueDate) {
                followUp.DueDate = followUp.TempDueDate;
            }
            if (followUp.TempCompletionDate) {
                followUp.CompletionDate = followUp.TempCompletionDate;
            }

            var json = JSON.stringify(followUp);
            $serializedInstance.val(json);

            return json;
        };

        plugin.promptForFollowUpType = function (callback) {
            new gmgps.cloud.http("followUpDropdown-promptForFollowUpType").ajax(
                {
                    args: {
                        linkedType: plugin.settings.linkedType,
                        linkedId: plugin.settings.linkedId
                    },
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: '/FollowUp/GetNewFollowUpTypesForEntity',
                    background: true
                },
                function (response) {
                    if (response.Data.length === 1) {
                        callback(response.Data[0].Id, response.Data[0].Value);
                        return;
                    }

                    var optionsHtml = '';
                    $.each(response.Data, function (i, v) {
                        optionsHtml +=
                            '<div class="radio-and-label mb5"><input type="radio" name="followUpType" data-typedescription="{3}" id="opt{0}" value="{1}" {2} /><label class="ml5" for="opt{0}">{3}</label></div>'.format(
                                i + 1,
                                v.Id,
                                i === 0 ? 'checked="checked"' : '',
                                v.Value
                            );
                    });

                    showDialog({
                        type: 'question',
                        title: 'Create Task',
                        msg:
                            'Choose the type of task to create:<br/><br/><div class="ml20 mb5"><form>' +
                            optionsHtml +
                            '</form></div></br>',
                        buttons: {
                            Next: function () {
                                var $selected = $(this)
                                    .closest('.dialog')
                                    .find('input[name="followUpType"]:checked');

                                callback(
                                    parseInt($selected.val()),
                                    $selected.attr('data-typedescription')
                                );
                                $(this).dialog('close');
                            },
                            Cancel: function () {
                                $(this).dialog('close');
                                return false;
                            }
                        }
                    });
                }
            );
        };

        plugin.setPropertyIds = function (id) {
            var me = this;
            var $followUpDropdownItems = $select.find(
                '.followUpDropdownItem[data-id="0"]'
            );

            $followUpDropdownItems.each(function (i, v) {
                var $followUp = $(v);
                var followUp = me.getFollowUpObject($followUp);
                followUp.PropertyId = id;
                me.setFollowUpObject(followUp, $followUp);
            });
        };

        plugin.setBranchIds = function (id) {
            var me = this;
            var $followUpDropdownItems = $select.find(
                '.followUpDropdownItem[data-id="0"]'
            );

            $followUpDropdownItems.each(function (i, v) {
                var $followUp = $(v);
                var followUp = me.getFollowUpObject($followUp);
                followUp.BranchId = id;
                me.setFollowUpObject(followUp, $followUp);
            });
        };

        plugin.setContactIds = function (id) {
            var me = this;
            var $followUpDropdownItems = $select.find(
                '.followUpDropdownItem[data-id="0"]'
            );

            $followUpDropdownItems.each(function (i, v) {
                var $followUp = $(v);
                var followUp = me.getFollowUpObject($followUp);
                followUp.ContactId = id;
                me.setFollowUpObject(followUp, $followUp);
            });
        };

        plugin.getFollowUpObjects = function (newOnly) {
            var me = this;
            var followUps = [];

            var $followUpDropdownItems = newOnly
                ? $select.find('.followUpDropdownItem[data-id="0"]')
                : $select.find('.followUpDropdownItem');

            $followUpDropdownItems.each(function (i, v) {
                var followUp = me.getFollowUpObject($(v));
                followUps.push(followUp);
            });

            return followUps;
        };

        plugin.getNewFollowUp = function (
            partialFollowUp,
            linkedDate,
            callback
        ) {
            new gmgps.cloud.http("followUpDropdown-getNewFollowUp").ajax(
                {
                    async: false,
                    args: {
                        partialFollowUp: partialFollowUp,
                        linkedDate: linkedDate
                    },
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: '/FollowUp/GetNewFollowUp',
                    background: true
                },
                function (response) {
                    if (callback) {
                        callback(response.Data);
                    }
                }
            );
        };

        plugin.refresh = function () {
            var existingFollowUps = plugin.getFollowUpObjects();

            return new gmgps.cloud.http("followUpDropdown-refresh").ajax(
                {
                    async: false,
                    args: {
                        settings: plugin.settings,
                        existingFollowUps: existingFollowUps
                    },
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: '/FollowUp/GetFollowUpDropdownWithFollowUps',
                    background: true
                },
                function (response) {
                    plugin.replaceHtml(response.Data);
                }
            );
        };

        plugin.refreshWithAdjustedDueDates = function (
            newLinkedDate,
            excludedTypeIdList
        ) {
            //Refreshes the select and any working followups will have their due date adjusted (e.g. because of the source event date changing before being saved for the first time)

            var existingFollowUps = plugin.getFollowUpObjects();

            new gmgps.cloud.http(
                "followUpDropdown-refreshWithAdjustedDueDates"
            ).ajax(
                {
                    async: false,
                    args: {
                        settings: plugin.settings,
                        existingFollowUps: existingFollowUps,
                        newLinkedDate: newLinkedDate,
                        excludeTypesFromDateChange: excludedTypeIdList
                    },
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: '/FollowUp/GetFollowUpDropdownWithAdjustedDueDateFollowUps',
                    background: true
                },
                function (response) {
                    plugin.replaceHtml(response.Data);
                }
            );
        };

        plugin.refreshWithAdjustedTargetUserId = function (
            newTargetUserId,
            excludedTypeIdList
        ) {
            //Refreshes the select and any working followups will have their targetUserId adjusted (e.g. because of the source event date changing before being saved for the first time)

            var existingFollowUps = plugin.getFollowUpObjects();

            return new gmgps.cloud.http(
                "followUpDropdown-refreshWithAdjustedTargetUserId"
            ).ajax(
                {
                    async: false,
                    args: {
                        settings: plugin.settings,
                        existingFollowUps: existingFollowUps,
                        newTargetUserId: newTargetUserId,
                        excludeTypesFromTargetUserChange: excludedTypeIdList
                    },
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: '/FollowUp/GetFollowUpDropdownWithAdjustedTargetUserFollowUps',
                    background: true
                },
                function (response) {
                    plugin.replaceHtml(response.Data);
                }
            );
        };

        plugin.refreshWithNewFollowUps = function (
            existingFollowUps,
            newFollowUps
        ) {
            new gmgps.cloud.http(
                "followUpDropdown-refreshWithNewFollowUps"
            ).ajax(
                {
                    async: false,
                    args: {
                        settings: plugin.settings,
                        existingFollowUps: existingFollowUps,
                        newFollowUps: newFollowUps
                    },
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: '/FollowUp/GetFollowUpDropdownWithNewFollowUps',
                    background: true
                },
                function (response) {
                    plugin.replaceHtml(response.Data);
                }
            );
        };

        //Adds a new followup to the select on-demand (e.g. as viewing applicants change).
        plugin.addFollowUps = function (
            partialFollowUps,
            linkedDate,
            callback
        ) {
            //Get any existing working followups
            var existingFollowUps = plugin.getFollowUpObjects();

            var newFollowUps = [];

            $.each(partialFollowUps, function (i, partialFollowUp) {
                plugin.getNewFollowUp(
                    partialFollowUp,
                    linkedDate,
                    function (newFollowUp) {
                        newFollowUps.push(newFollowUp);
                    }
                );
            });

            plugin.refreshWithNewFollowUps(
                existingFollowUps,
                newFollowUps,
                function () {
                    if (callback) {
                        callback(true);
                    }
                }
            );
        };

        plugin.cancelFollowUps = function (args) {
            //Note: If the followup is a working followup, just remove from the client side.  Otherwise, cancel and remove server-side.

            var $deferred = $.Deferred();

            var followUps = plugin.getFollowUpObjects();

            var clientRefreshRequired = false;
            var serverRefreshRequired = false;

            $.each(followUps, function (i, followUp) {
                //Removal where type(s) were specified only.
                if (
                    $.inArray(followUp.Type, args.types) !== -1 &&
                    !args.contactId &&
                    !args.propertyId
                ) {
                    if (followUp.Id === 0) {
                        //Client
                        followUp.$serializedInstance
                            .closest('.followUpDropdownItem-container')
                            .remove();
                        clientRefreshRequired = true;
                    } else {
                        //Server
                        plugin.cancelFollowUp(followUp.Id);
                        serverRefreshRequired = true;
                    }

                    return true;
                }

                if (
                    followUp.ContactId === args.contactId &&
                    (!args.types || $.inArray(followUp.Type, args.types) !== -1)
                ) {
                    if (followUp.Id === 0) {
                        //Client
                        followUp.$serializedInstance
                            .closest('.followUpDropdownItem-container')
                            .remove();
                        clientRefreshRequired = true;
                    } else {
                        //Server
                        plugin.cancelFollowUp(followUp.Id);
                        serverRefreshRequired = true;
                    }
                }
                if (
                    followUp.PropertyId === args.propertyId &&
                    (!args.types || $.inArray(followUp.Type, args.types) !== -1)
                ) {
                    if (followUp.Id === 0) {
                        //Client
                        followUp.$serializedInstance
                            .closest('.followUpDropdownItem-container')
                            .remove();
                        clientRefreshRequired = true;
                    } else {
                        //Server
                        plugin.cancelFollowUp(followUp.Id);
                        serverRefreshRequired = true;
                    }
                }
            });

            if (clientRefreshRequired && !serverRefreshRequired) {
                //Any server side update will by nature, trigger a refresh.
                return plugin.refresh();
            }

            return $deferred.resolve();
        };

        plugin.countActiveFollowUps = function (followUpType) {
            var followUps = plugin.getFollowUpObjects();
            var count = 0;

            $.each(followUps, function (i, followUp) {
                if (
                    followUp.Type === followUpType &&
                    (followUp.Status === C.FollowUpStatus.InProgress ||
                        followUp.Status === C.FollowUpStatus.Pending)
                ) {
                    count++;
                }
            });

            return count;
        };

        plugin.cancelFollowUp = function (id, callback) {
            //Server-side cancellation of followup
            new gmgps.cloud.http("followUpDropdown-cancelFollowUp").ajax(
                {
                    async: false,
                    args: {
                        id: id
                    },
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: '/FollowUp/CancelFollowUp',
                    background: true
                },
                // eslint-disable-next-line no-unused-vars
                function (response) {
                    if (callback) {
                        callback();
                    }
                }
            );
        };

        plugin.saveFollowUp = function ($followUp) {
            var me = this;
            var followUp = me.getFollowUpObject($followUp);

            // eslint-disable-next-line no-undef
            followUp.LinkedId = linkedId;

            new gmgps.cloud.http("followUpDropdown-saveFollowUp").ajax(
                {
                    async: false,
                    args: { viewModel: { followUp: followUp } },
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: '/FollowUp/UpdateFollowUp',
                    background: true
                },
                function () {
                    return true;
                },
                function () {
                    showError('One or more followups failed to save.');
                }
            );

            return true;
        };

        plugin.saveFollowUpsByModelType = function (modelTypeIdList, callback) {
            var followUps = plugin.getFollowUpObjects();

            if (followUps.length === 0) {
                return true;
            }

            if (modelTypeIdList) {
                $.each(modelTypeIdList, function (i, model) {
                    var followUpList = $.grep(followUps, function (f) {
                        return f.LinkedType === model.linkedType;
                    });

                    $.each(followUpList, function (i, followUp) {
                        followUp.LinkedId = model.linkedId;
                    });
                });
            }

            plugin.saveFollowUpList(followUps, callback);
        };

        plugin.saveFollowUps = function (linkedId, callback) {
            var followUps = plugin.getFollowUpObjects();

            if (followUps.length === 0) {
                if (callback) callback();
                return true;
            }

            //Apply any supplied linkedId (the parent of these followups will be known at this stage)
            if (linkedId) {
                $.each(followUps, function (i, followUp) {
                    followUp.LinkedId = linkedId;
                });
            }

            plugin.saveFollowUpList(followUps, callback);
        };

        plugin.saveFollowUpList = function (followUps, callback) {
            new gmgps.cloud.http("followUpDropdown-saveFollowUpList").ajax(
                {
                    async: false,
                    args: {
                        followUps: followUps,
                        settings: plugin.settings.followUpSettings
                    },
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: '/FollowUp/SaveFollowUps',
                    background: true
                },
                // eslint-disable-next-line no-unused-vars
                function (response) {
                    if (callback) {
                        callback();
                    }
                }
            );
        };

        plugin.createFollowUp = function (followUpType, typeDescription) {
            var contactId =
                plugin.settings.linkedType === C.ModelType.Contact
                    ? plugin.settings.linkedId
                    : 0;
            var propertyId =
                plugin.settings.linkedType === C.ModelType.Property
                    ? plugin.settings.linkedId
                    : 0;

            var callback = function (response) {
                var followup = response.Data.FollowUp;

                if (plugin.settings.linkedId === 0) {
                    if (followup.DueDate) {
                        followup.DueDate = new Date(followup.DueDate);
                    }

                    if (followup.CompletionDate) {
                        followup.CompletionDate = new Date(
                            followup.CompletionDate
                        );
                    }

                    new gmgps.cloud.http(
                        "followUpDropdown-createFollowUp"
                    ).ajax(
                        {
                            args: {
                                followUp: followup
                            },
                            complex: true,
                            dataType: 'json',
                            type: 'post',
                            url: '/FollowUp/GetFollowUpDropdownItem',
                            background: true
                        },
                        function (response) {
                            $select.find('.list').append(response.Data);
                            plugin.refresh();
                        }
                    );
                }
            };

            gmgps.cloud.helpers.followUp.createFollowUp(
                followUpType,
                'Create ' + typeDescription,
                '',
                plugin.settings.linkedType,
                plugin.settings.linkedId,
                0,
                contactId,
                propertyId,
                callback
            );
        };

        (plugin.quickComplete = function ($followUp, followUp, completed) {
            var me = this;

            if (followUp.Id === 0) {
                var $completeButton = $followUp.find('.complete-button');
                if (completed) {
                    $completeButton.addClass('on');
                } else {
                    $completeButton.removeClass('on');
                }

                followUp.Status = completed
                    ? C.FollowUpStatus.Complete
                    : C.FollowUpStatus.Pending;

                me.setFollowUpObject(followUp, $followUp);

                me.refresh();

                return false;
            }

            new gmgps.cloud.http("followUpDropdown-quickComplete").ajax(
                {
                    args: {
                        id: followUp.Id,
                        completed: completed
                    },
                    background: true,
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: '/FollowUp/UpdateFollowUpSetCompleted'
                },
                function (response) {
                    if (response && response.Data) {
                        gmgps.cloud.helpers.followUp.manageFollowUpUpdate(
                            response.Data.Id,
                            response.Data.Type,
                            response.Data.LinkedType,
                            response.Data.LinkedId,
                            response.Data.Status === C.FollowUpStatus.Complete
                        );
                    }
                }
            );
        }),
            // Edits a followup by first getting the working object and passing it to the server in return for an editing window.
            (plugin.editFollowUp = function ($followUp, followUpSettings) {
                var data = {
                    excludeCancel: false
                };

                var followUp = plugin.getFollowUpObject($followUp);

                if (followUp.Id !== 0) {
                    if (
                        gmgps.cloud.helpers.followUp.activateFollowUpDialog(
                            followUp.Id
                        )
                    ) {
                        return true;
                    }
                }

                data = gmgps.cloud.helpers.followUp.followUpNotesArgs(
                    followUp.Type,
                    data
                );

                var windowCfg = {
                    title: $followUp.attr('data-action'),
                    post: true,
                    controller: gmgps.cloud.ui.views.followUp,
                    data: data,
                    width: 525,
                    draggable: true,
                    modal: true,
                    actionButton: 'Save',
                    cancelButton: 'Close',
                    onBeforeDisplay: function ($f, onBeforeDisplayCallback) {
                        onBeforeDisplayCallback();
                    },
                    onReady: function ($f) {
                        $f.find('#FollowUp_CustomTitle').focus();
                    },
                    onAction: function ($f) {
                        var linkedId = parseInt(
                            $f.find('#FollowUp_LinkedId').val()
                        );

                        if (linkedId === 0) {
                            //Save - the parent is new and unsaved.
                            new gmgps.cloud.http(
                                "followUpDropdown-onAction"
                            ).postForm(
                                createForm(
                                    $f,
                                    'FollowUp/GetFollowUpDropdownItem'
                                ),
                                function (response) {
                                    $followUp.replaceWith(
                                        $(response.Data).html()
                                    );

                                    plugin.refresh(function () {
                                        // eslint-disable-next-line no-undef
                                        if (callback) {
                                            // eslint-disable-next-line no-undef
                                            callback(true);
                                        }
                                    });
                                }
                            );
                        } else {
                            //Save - the parent exists.
                            new gmgps.cloud.http(
                                "followUpDropdown-onAction"
                            ).postForm(
                                createForm($f, 'FollowUp/UpdateFollowUp'),
                                function (response) {
                                    var manageFollowUpUpdate = function () {
                                        gmgps.cloud.helpers.followUp.manageFollowUpUpdate(
                                            response.Data.FollowUp.Id,
                                            response.Data.FollowUp.Type,
                                            response.Data.FollowUp.LinkedType,
                                            response.Data.FollowUp.LinkedId,
                                            response.Data.FollowUp.Status ===
                                                C.FollowUpStatus.Complete
                                        );
                                    };

                                    if (plugin.settings.onFollowupUpdated) {
                                        plugin.settings
                                            .onFollowupUpdated(
                                                response.Data.FollowUp.Type,
                                                response.Data.FollowUp.Status
                                            )
                                            .done(function () {
                                                manageFollowUpUpdate();
                                            });
                                    } else {
                                        manageFollowUpUpdate();
                                    }
                                }
                            );
                        }
                    },
                    onCancel: function ($f) {
                        // remove item if directed and refresh
                        if ($f.is('[data-remove-item]')) {
                            $followUp.remove();
                            plugin.refresh();
                        }
                    }
                };

                windowCfg.url = '/FollowUp/GetFollowUp';
                windowCfg.urlArgs = {
                    id: followUp.Id,
                    followUp: followUp,
                    settings: followUpSettings
                };

                new gmgps.cloud.ui.controls.window(windowCfg);
            });

        plugin.toggle = function () {
            var $list = $select.find('.list');

            var listWidth = $select.width();
            $list.css('width', listWidth);

            if (!$select.hasClass('expanded')) {
                //Show
                $expandButton
                    .removeClass('fa-chevron-down')
                    .addClass('fa-chevron-up');
                $select.addClass('expanded');

                var selectBottom = $select.offset().top + $select.height();
                var outOfBounds =
                    selectBottom + $list.height() > $(window).height();
                var listHeight = '';
                if (outOfBounds) {
                    listHeight = $(window).height() - selectBottom + 'px';
                }

                $list
                    .css('height', listHeight)
                    .css('box-shadow', '0 4px 4px -4px black')
                    .show('slide', { direction: 'up', duration: 125 });
            } else {
                //Hide
                $expandButton
                    .removeClass('fa-chevron-up')
                    .addClass('fa-chevron-down');
                $select.removeClass('expanded');
                $list.hide('slide', { direction: 'up', duration: 125 });
            }
        };

        plugin.processPushNotification = function (settings) {
            var deferred = $.Deferred();

            new gmgps.cloud.http(
                "followUpDropdown-processPushNotification"
            ).ajax(
                {
                    async: false,
                    args: {
                        settings: settings
                    },
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: '/FollowUp/GetFollowUpDropdown',
                    background: true
                },
                function (response) {
                    plugin.replaceHtml(response.Data);
                    deferred.resolve();
                }
            );

            return deferred.promise();
        };

        plugin.autoInit = function (settings) {
            //to init the plugin without any server generated content already in position

            var deferred = $.Deferred();

            plugin.processPushNotification(settings).then(function () {
                deferred.resolve();
            });

            return deferred.promise();
        };

        plugin.replaceHtml = function (html) {
            var isEmpty =
                $select.find('.list .followUpDropdownItem').length === 0;

            if (isEmpty) {
                //New (empty)
                $container.html(html);
                $select = $container.children('.followUpDropdown');
            } else {
                //Update (not empty)
                //$container.html(html);

                var $newDropdown = $(html);

                var $newList = $newDropdown.find('.list');
                var $oldList = $container.find('.list');

                var $newDropper = $newDropdown.find('.dropper');
                var $oldDropper = $container.find('.dropper');

                $oldList.html($newList.html());

                $oldDropper
                    .find('.desc')
                    .replaceWith($newDropper.find('.desc'));
                $oldDropper
                    .find('.info')
                    .replaceWith($newDropper.find('.info'));

                if (
                    $oldDropper.hasClass('overdue') &&
                    !$newDropper.hasClass('overdue')
                )
                    $oldDropper.removeClass('overdue');
                if (
                    !$oldDropper.hasClass('overdue') &&
                    $newDropper.hasClass('overdue')
                )
                    $oldDropper.addClass('overdue');

                if (
                    $oldDropper.hasClass('complete') &&
                    !$newDropper.hasClass('complete')
                )
                    $oldDropper.removeClass('complete');
                if (
                    !$oldDropper.hasClass('complete') &&
                    $newDropper.hasClass('complete')
                )
                    $oldDropper.addClass('complete');

                $select = $container.children('.followUpDropdown');
            }

            if (isEmpty && plugin.settings.display === 'slide') {
                $select.hide().fadeIn();
            }

            $expandButton = $container.find('.expand-button');
        };

        plugin.init().then(function ($dropdown) {
            if (plugin.settings.onReady) {
                plugin.settings.onReady($dropdown);
            }
        });
    };

    $.fn.followUpDropdown = function (options) {
        return this.each(function () {
            var $this = $(this);

            if (options && options.reInitialise) {
                if (undefined !== $this.data('followUpDropdown')) {
                    $this.data('followUpDropdown').destroy();
                }
            }
            if (undefined === $this.data('followUpDropdown')) {
                var plugin = new $.followUpDropdown($this, options);
                $this.data('followUpDropdown', plugin);
            }
        });
    };
}))(jQuery);
