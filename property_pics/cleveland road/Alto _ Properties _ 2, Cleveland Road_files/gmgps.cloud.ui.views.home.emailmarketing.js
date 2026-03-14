gmgps.cloud.ui.views.home.emailmarketing = function (args) {
    var me = this;
    me.initialised = false;
    me.forceRefreshOnNextActivation = false;

    me.header = 'Email Marketing';
    me.$root = args.$root;
    me.$header = args.$root.find('#emailmarketing-header');

    me.parentListDefaultSize = 20;
    me.childListDefaultSize = 20;

    me.$modeDropdown = args.$root.find('#emailmarketing-mode');
    me.$userContextDropdown = args.$root.find('#emailmarketing-usercontext');
    me.$periodDropdown = args.$root.find('#emailmarketing-period');
    me.$noEmailsTemplate = args.$root.find('.no-emails-template');

    me.mode = parseInt(me.$modeDropdown.val());
    me.userContext = parseInt(me.$userContextDropdown.val());
    me.period = parseInt(me.$periodDropdown.val());
    me.userId = args.userId;

    me.dateRangeSider = null;

    me.branchId = 0 || args.branchId;

    me.init();

    return true;
};

gmgps.cloud.ui.views.home.emailmarketing.prototype = {
    init: function () {
        var me = this;

        me.$modeDropdown.selectpicker({
            'live-search': false,
            width: '155px'
        });

        me.$userContextDropdown.selectpicker({
            'live-search': false,
            width: '155px'
        });

        me.$periodDropdown.selectpicker({
            'live-search': false,
            width: '108px'
        });

        //Mode > Change
        me.$modeDropdown.on('change', function () {
            me.mode = parseInt(me.$modeDropdown.val());
            me.refreshAll();
        });

        //User Context > Change
        me.$userContextDropdown.on('change', function () {
            me.userContext = parseInt(me.$userContextDropdown.val());
            me.refreshAll();
        });

        //Period Context > Change
        me.$periodDropdown.on('change', function () {
            me.period = parseInt(me.$periodDropdown.val());
            me.refreshAll();
        });

        // paging contacts

        me.$root.on(
            'click',
            '.emailmarketing-contact-footer .controls .page-button:not(.disabled)',
            function () {
                me.refreshList(parseInt($(this).attr('data-page')));
            }
        );

        // paging contact marketing properties
        me.$root.on(
            'click',
            '.emailmarketing-forcontact-footer .controls .page-button:not(.disabled)',
            function () {
                var $this = $(this);
                var contactId = parseInt(
                    $this
                        .closest('.emailmarketing-forcontact-footer')
                        .attr('data-contactid')
                );
                me.getContactDetail(
                    contactId,
                    parseInt($this.attr('data-page'))
                );
            }
        );

        //Contact ListItem > Click
        me.$root.on('click', '.emailmarketing-contact-listitem', function (e) {
            var $row = $(this);
            me.selectContactListItem(
                $row,
                $(e.target).hasClass('preview-link')
            );
        });

        //Property ListItem > Click
        me.$root.on('click', '.emailmarketing-property-listitem', function (e) {
            var $row = $(this);
            me.selectPropertyListItem(
                $row,
                $(e.target).hasClass('preview-link')
            );
        });

        //Reject Property > Click
        me.$root.on('click', '.btn-thumbdown', function () {
            alert('Sell it more, work it.');
        });

        //TodoFollowUp > Click
        me.$root.on('click', '.btn-todo', function () {
            var $row = $(this).closest('.row');
            var title = $row.find('.preview-link').text();
            var followUpId = $(this).data('todo-followup-id');

            if (followUpId) {
                gmgps.cloud.helpers.followUp.editFollowUp(
                    followUpId,
                    C.FollowUpType.Todo
                );
            } else {
                gmgps.cloud.helpers.followUp.createFollowUp(
                    C.FollowUpType.Todo,
                    'Email Marketing Todo - {0}'.format(title),
                    '',
                    C.ModelType.User,
                    shell.userId,
                    shell.branchId,
                    $row.data('contact-id'),
                    $row.data('property-id'),
                    function () {}
                );
            }
        });

        //TodoFollowUp Link > Click
        me.$root.on('click', '.todofollowup-link', function () {
            gmgps.cloud.helpers.followUp.editFollowUp(
                $(this).data('id'),
                C.FollowUpType.Todo
            );
        });

        //Viewing > Click
        me.$root.on('click', '.btn-book-viewing', function () {
            var $row = $(this).closest('.row');

            gmgps.cloud.helpers.property.getViewing({
                contextModelType: C.ModelType.Contact,
                viewingId: $(this).data('viewing-id'),
                contactId: $row.data('contact-id'),
                propertyId: $row.data('property-id')
            });
        });

        //Remove > Click
        me.$root.on('click', '.btn-remove', function () {
            me.completeFollowUp($(this).closest('.row'));
        });

        //Note > Click
        me.$root.on('click', '.btn-note', function () {
            me.toggleNotes($(this).closest('.row'));
        });

        //Note > KeyPress
        me.$root.on('keydown', '.notes', function () {
            me.setNoteDirty($(this));
        });

        //Note > Undo > click
        me.$root.on('click', '.notes-undo-button', function () {
            me.undoNotes($(this).closest('.row'));
        });

        //Note > Save > click
        me.$root.on('click', '.notes-save-button', function () {
            me.saveNotes($(this).closest('.row'));
        });

        //Email > Click
        me.$root.on('click', '.btn-send-email:not(.disabled)', function () {
            var category = $(this).attr('ga-category');
            var $row = $(this).closest('.row');
            gmgps.cloud.helpers.general.createEmail({
                propertyId: $row.data('property-id'),
                contactIds: [$row.data('contact-id')],
                category: category
            });
        });

        //SMS > Click
        me.$root.on('click', '.btn-send-sms:not(.disabled)', function () {
            var $row = $(this).closest('.row');
            gmgps.cloud.helpers.general.createSMS({
                contentPropertyIds: [$row.data('property-id')],
                recipientContactIds: [$row.data('contact-id')],
                templateId: 1
            });
        });

        //Applicant Complete > Click
        me.$root.on(
            'click',
            '.emailmarketing-contact-listitem .complete-button',
            function (e) {
                e.stopPropagation();
                me.completeApplicant($(this).closest('.row'));
            }
        );
    },

    lockUI: function (lock) {
        glass(lock);
    },

    activate: function (forceRefresh) {
        var me = this;

        if (forceRefresh || !me.initialised) {
            me.refreshAll();
        }
    },

    selectContactListItem: function ($row, isPreviewLinkClick) {
        var me = this;

        var isSelectedRow = $row.hasClass('on');
        var $selectedRow = me.$root.find('.emailmarketing-contact-listitem.on');

        if (isSelectedRow && isPreviewLinkClick) return true;

        var selectRow = function () {
            $row.addClass('on');

            me.getContactDetail($row.data('contact-id')).then(function () {
                $row.find('.parent-item-ops').slideDown('fast');
            });
        };

        if ($selectedRow.length > 0 && !isSelectedRow) {
            selectRow();
            $selectedRow
                .removeClass('on')
                .find('.parent-item-ops')
                .slideUp('fast');
        } else {
            selectRow();
        }

        //For the selected item, show preview on preview-link clicks.  Else, treat as a row click.
        if (!isSelectedRow && isPreviewLinkClick) {
            return false;
        }
    },

    selectPropertyListItem: function ($row, isPreviewLinkClick) {
        var me = this;

        var isSelectedRow = $row.hasClass('on');
        var $selectedRow = me.$root.find(
            '.emailmarketing-property-listitem.on'
        );

        if (isSelectedRow && isPreviewLinkClick) return true;

        var selectRow = function () {
            $row.addClass('on');

            me.getPropertyDetail($row.data('property-id')).then(function () {
                $row.find('.parent-item-ops').slideDown('fast');
            });
        };

        if ($selectedRow.length > 0 && !isSelectedRow) {
            selectRow();
            $selectedRow
                .removeClass('on')
                .find('.parent-item-ops')
                .slideUp('fast');
        } else {
            selectRow();
        }

        //For the selected item, show preview on preview-link clicks.  Else, treat as a row click.
        if (!isSelectedRow && isPreviewLinkClick) {
            return false;
        }
    },

    completeApplicant: function ($row) {
        var me = this;

        var mode = parseInt(me.$modeDropdown.val());

        var $list = me.$root.find(
            '.emailmarketing-forcontact-body.emailmarketing-list-body'
        );
        var childCount = parseInt(
            me.$root.find('#EmailMarketingForContactListItems_TotalRows').val()
        );
        var modelName = childCount === 1 ? 'property' : 'properties';
        var msg =
            'You are about to set the Marketing Follow-Ups complete for {0} {1} for {2}.'.format(
                childCount,
                modelName,
                $row.find('.name').text()
            );

        $list.find('.row').addClass('selected');

        var $notes = $list.find('textarea').filter(function () {
            return $(this).val() !== '';
        });

        var updateCount = function () {
            var $headerCount = me.$root.find(
                '.emailmarketing-contact-header .count'
            );
            var $footerCount = me.$root.find(
                '.emailmarketing-contact-footer .count'
            );
            var count = parseInt($headerCount.text());
            $headerCount.text(count - 1);
            $footerCount.text(count - 1);
        };

        var buttons;
        if ($notes.length > 0) {
            //Offer to save any comments.
            msg += '<br/><br/>';
            msg +=
                $notes.length === 1
                    ? 'There is a property'
                    : 'There are {0} properties'.format($notes.length);

            msg +=
                ' for which you have added comments.  Would you like to create file notes from those to appear on timelines? '.format(
                    $notes.length
                );
            buttons = {
                'Complete Only': function () {
                    var $this = $(this);
                    me.updateKeepInformedStatus(false).then(function () {
                        updateCount();
                        $list.find('.row').removeClass('selected');
                        $this.dialog('close');
                        $row.slideUp('fast', function () {
                            $row.remove();
                            me.selectFirstParentOrShowEmpty(mode);
                        });
                    });
                },
                'Complete & Create File Notes': function () {
                    var $this = $(this);

                    me.updateKeepInformedStatus(true).then(function () {
                        updateCount();
                        $list.find('.row').removeClass('selected');
                        $this.dialog('close');
                        $row.slideUp('fast', function () {
                            $row.remove();
                            me.selectFirstParentOrShowEmpty(mode);
                        });
                    });
                },
                Cancel: function () {
                    $list.find('.row').removeClass('selected');
                    $(this).dialog('close');
                }
            };
        } else {
            buttons = {
                'Mark all Complete': function () {
                    var $this = $(this);

                    me.updateKeepInformedStatus(false).then(function () {
                        updateCount();
                        $list.find('.row').removeClass('selected');
                        $this.dialog('close');
                        $row.slideUp('fast', function () {
                            $row.remove();
                            me.selectFirstParentOrShowEmpty(mode);
                        });
                    });
                },
                Cancel: function () {
                    $list.find('.row').removeClass('selected');
                    $(this).dialog('close');
                }
            };
        }

        showDialog({
            type: 'question',
            title: 'Complete Applicant Marketing Follow-Ups',
            msg: msg,
            buttons: buttons
        });
    },

    updateKeepInformedStatus: function (createFileNotes) {
        var me = this;
        var deferred = new $.Deferred();
        var items = [];

        var $list = me.$root.find(
            '.emailmarketing-forcontact-body.emailmarketing-list-body'
        );

        $list.find('.row').each(function (i, v) {
            var $v = $(v);

            items.push({
                propertyId: $v.data('property-id'),
                contactId: $v.data('contact-id'),
                comment: createFileNotes
                    ? $.trim($v.find('.notes').val())
                    : null,
                partyKeepInformedStatus:
                    C.PartyKeepInformedStatus.NotInterestedAtAll //Phase 2 - Ability to Keep Informed based on a row toggle icon.
            });
        });

        new gmgps.cloud.http("emailmarketing-updateKeepInformedStatus").ajax(
            {
                args: {
                    data: items
                },
                background: true,
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/homeemailmarketing/updatemarketingeventpropertysetkeepinformedstatus'
            },
            function () {
                glass(false);
                deferred.resolve();
            },
            function () {
                glass(false);
            }
        );

        return deferred.promise();
    },

    updateKeepInformedStatusChild: function ($row, createFileNotes) {
        var deferred = new $.Deferred();
        var items = [];

        items.push({
            propertyId: $row.data('property-id'),
            contactId: $row.data('contact-id'),
            comment: createFileNotes ? $.trim($row.find('.notes').val()) : null,
            partyKeepInformedStatus:
                C.PartyKeepInformedStatus.NotInterestedAtAll //Phase 2 - Ability to Keep Informed based on a row toggle icon.
        });

        new gmgps.cloud.http(
            "emailmarketing-updateKeepInformedStatusChild"
        ).ajax(
            {
                args: {
                    data: items
                },
                background: true,
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/homeemailmarketing/updatemarketingeventpropertysetkeepinformedstatus'
            },
            function () {
                glass(false);
                deferred.resolve();
            },
            function () {
                glass(false);
            }
        );

        return deferred.promise();
    },

    getNotesElements: function ($row) {
        return {
            $container: $row.find('.notes-container'),
            $textbox: $row.find('.notes'),
            $saveButton: $row.find('.notes-save-button '),
            $undoButton: $row.find('.notes-undo-button '),
            $ops: $row.find('.notes-ops')
        };
    },

    toggleNotes: function ($row) {
        var me = this;
        var e = me.getNotesElements($row);

        if (e.$container.hasClass('on')) {
            e.$container.slideUp('fast', function () {
                e.$container.removeClass('on');
                e.$ops.hide();
            });
        } else {
            e.$container.slideDown('fast', function () {
                e.$container.addClass('on');
                e.$textbox.focus();
                e.$textbox[0].setSelectionRange(
                    e.$textbox[0].value.length,
                    e.$textbox[0].value.length
                );
            });
        }
    },

    setNoteDirty: function ($notesTextbox) {
        if (!$notesTextbox.data('dirty')) {
            $notesTextbox.data('dirty', true);
            $notesTextbox.data('original', $notesTextbox.val());

            var $row = $notesTextbox.closest('.row');
            $row.find('.notes-ops').slideDown('fast');
        }
    },

    undoNotes: function ($row) {
        var me = this;
        var e = me.getNotesElements($row);

        e.$textbox.val(e.$textbox.data('original'));
        e.$textbox.data('dirty', false);

        window.setTimeout(function () {
            if (e.$textbox.data('original').length === 0) {
                me.toggleNotes($row);
            } else {
                e.$ops.slideUp('fast');
            }
        }, 50);
    },

    saveNotes: function ($row) {
        var me = this;
        glass(true);

        var e = me.getNotesElements($row);

        var propertyId = parseInt($row.data('property-id'));
        var contactId = parseInt($row.data('contact-id'));
        var comments = $.trim($row.find('.notes').val());

        new gmgps.cloud.http("emailmarketing-saveNotes").ajax(
            {
                args: {
                    propertyId: propertyId,
                    contactId: contactId,
                    comments: comments
                },
                background: true,
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/homeemailmarketing/updatemarketingeventpropertysetcomments'
            },
            function () {
                e.$textbox.data('original', comments);
                e.$textbox.data('dirty', false);
                e.$ops.slideUp('fast');
                glass(false);

                if (comments.length === 0) {
                    me.toggleNotes($row);
                }
            },
            function () {
                glass(false);
            }
        );
    },

    completeFollowUp: function ($row) {
        var me = this;

        var $notes = $row.find('textarea').filter(function () {
            return $(this).val() !== '';
        });

        var updateCount = function () {
            var $headerCount = me.$root.find(
                '.emailmarketing-forcontact-header .count'
            );
            var $footerCount = me.$root.find(
                '.emailmarketing-forcontact-footer .count'
            );
            var count = parseInt($headerCount.text());
            $headerCount.text(count - 1);
            $footerCount.text(count - 1);
        };

        if ($notes.length > 0) {
            //Offer to save any comments.
            showDialog({
                type: 'question',
                title: 'Complete Applicant Marketing Follow-Ups',
                msg: 'Would you like to create a file note from your notes on this row, to appear on timelines?',
                buttons: {
                    'Complete Only': function () {
                        var $this = $(this);

                        me.updateKeepInformedStatusChild($row, false).then(
                            function () {
                                updateCount();
                                $this.dialog('close');
                                $row.slideUp('fast', function () {
                                    $row.remove();
                                });
                            }
                        );
                    },
                    'Complete & Create File Notes': function () {
                        var $this = $(this);

                        me.updateKeepInformedStatusChild($row, true).then(
                            function () {
                                updateCount();
                                $this.dialog('close');
                                $row.slideUp('fast', function () {
                                    $row.remove();
                                });
                            }
                        );
                    },
                    Cancel: function () {
                        $(this).dialog('close');
                    }
                }
            });
        } else {
            me.updateKeepInformedStatusChild($row, true).then(function () {
                updateCount();
                $row.removeClass('selected');
                $row.slideUp('fast', function () {
                    $row.remove();
                });
            });
        }
    },

    getContactDetail: function (contactId, pageNo) {
        var me = this;

        var deferred = new $.Deferred();

        me.$root
            .find('.emailmarketing-detail .emailmarketing-list-body')
            .html('<div class="home-spinner"></div>');

        new gmgps.cloud.http("emailmarketing-getContactDetail").ajax(
            {
                args: {
                    contactId: contactId,
                    period: me.period,
                    branchId: me.branchId,
                    userId: me.userId,
                    userContext: me.userContext,
                    searchPage: {
                        index: pageNo || 1,
                        size: me.childListDefaultSize
                    }
                },
                background: true,
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/homeemailmarketing/getemailmarketinglistforcontact'
            },
            function (response) {
                deferred.resolve();

                var $detail = me.$root.find('.emailmarketing-detail');
                $detail.html(response.Data);
                $detail
                    .find('.list-name .count')
                    .text(
                        $detail
                            .find(
                                '#EmailMarketingForContactListItems_TotalRows'
                            )
                            .val()
                    );
            }
        );

        return deferred.promise();
    },

    getPropertyDetail: function (propertyId) {
        var me = this;

        var deferred = new $.Deferred();

        me.$root
            .find('.emailmarketing-detail .emailmarketing-list-body')
            .html('<div class="home-spinner"></div>');

        new gmgps.cloud.http("emailmarketing-getPropertyDetail").ajax(
            {
                args: {
                    propertyId: propertyId,
                    branchId: me.branchId,
                    userId: me.userId,
                    userContext: me.userContext,
                    period: me.period,
                    searchPage: {
                        index: 1,
                        size: me.childListDefaultSize
                    }
                },
                background: true,
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/homeemailmarketing/getemailmarketinglistforproperty'
            },
            function (response) {
                deferred.resolve();

                var $detail = me.$root.find('.emailmarketing-detail');
                $detail.html(response.Data);
                $detail
                    .find('.list-name .count')
                    .text(
                        $detail
                            .find(
                                '#EmailMarketingForPropertyListItems_TotalRows'
                            )
                            .val()
                    );
            }
        );

        return deferred.promise();
    },

    selectFirstParentOrShowEmpty: function (mode) {
        var me = this;

        var $row = me.$root.find(
            '.emailmarketing-list .emailmarketing-list-body .row:first'
        );
        var $list = me.$root.find('.emailmarketing-list');

        if ($row.length > 0) {
            switch (mode) {
                case C.HomeEmailMarketingMode.Contact:
                    me.selectContactListItem($row, false);
                    break;
                case C.HomeEmailMarketingMode.Property:
                    me.selectPropertyListItem($row, false);
                    break;
                case C.HomeEmailMarketingMode.Email:
                    break;
            }
        } else {
            var $detail = me.$root.find('.emailmarketing-detail');

            me.showNoEmails(
                $list.find('.emailmarketing-list-body'),
                'There are no e-mail marketing followups to display during the chosen period for the selected Negotiator / Branch'
            );

            $detail.empty();
        }
    },

    refreshAll: function (triggeredByInterval) {
        //This layer does not refresh via the home interval.
        if (triggeredByInterval) return true;

        var me = this;

        var deferred = new $.Deferred();

        me.initialised = true;
        me.refreshStats();
        me.lockUI(true);

        //Refreshing everything means a top-level change or initial load, so everything which wants a spinner gets one.  As each section completes, these get replaced.
        me.$root.find('.opt-spinner').html('<div class="home-spinner"></div>');

        $.when(me.refreshList())
            .done(function () {
                deferred.resolve();
                me.lockUI(false);
            })
            .fail(function () {
                me.lockUI(false);
            });

        return deferred.promise();
    },

    refreshList: function (pageNo) {
        var me = this;

        var deferred = new $.Deferred();
        var url = '';

        var mode = parseInt(me.$modeDropdown.val());
        //Mode
        switch (mode) {
            case C.HomeEmailMarketingMode.Contact:
                url = '/homeemailmarketing/getemailmarketinglistbycontact';
                break;
            case C.HomeEmailMarketingMode.Property:
                url = '/homeemailmarketing/getemailmarketinglistbyproperty';
                break;
            case C.HomeEmailMarketingMode.Email:
                url = '/homeemailmarketing/getemailmarketinglistbyemail';
                break;
        }

        var $caption = me.$root.find('#emailmarketing-body .widget-caption');
        $caption.text(
            'Awaiting Follow-Up from {0}'.format(
                me.$periodDropdown.find('option:selected').text()
            )
        );

        new gmgps.cloud.http("emailmarketing-refreshList").ajax(
            {
                args: {
                    branchId: me.branchId,
                    userId: me.userId,
                    userContext: me.userContext,
                    period: me.period,
                    searchPage: {
                        index: pageNo || 1,
                        size: me.parentListDefaultSize
                    }
                },
                background: true,
                complex: true,
                dataType: 'json',
                type: 'post',
                url: url
            },
            function (response) {
                deferred.resolve();

                var $list = me.$root.find('.emailmarketing-list');
                $list.html(response.Data);
                $list
                    .find('.list-name .count')
                    .text($list.find('.total-rows').val());

                me.selectFirstParentOrShowEmpty(mode);
            }
        );

        return deferred.promise();
    },

    refreshParentListItem: function (linkedId) {
        var me = this;

        var deferred = new $.Deferred();
        var url = '';

        var mode = parseInt(me.$modeDropdown.val());

        var args = {
            branchId: me.branchId,
            userId: me.userId,
            userContext: me.userContext,
            period: me.period
        };

        var replaceFn;
        var $e = null;

        //Mode
        switch (mode) {
            case C.HomeEmailMarketingMode.Contact:
                url = '/homeemailmarketing/getemailmarketinglistbycontactitem';
                args.contactId = linkedId;
                $e = me.$root.find(
                    '#emailmarketing-parent-list .row[data-contact-id="{0}"]'.format(
                        linkedId
                    )
                );
                replaceFn = function (html) {
                    var $new = $(html);
                    var isOn = $e.hasClass('on');
                    $e.replaceWith($new);
                    if (isOn)
                        $new.addClass('on').find('.parent-item-ops').show();
                };
                break;
        }

        if ($e && $e.length > 0) {
            new gmgps.cloud.http("emailmarketing-refreshParentListItem").ajax(
                {
                    args: args,
                    background: true,
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: url
                },
                function (response) {
                    if (response.Data) {
                        replaceFn(response.Data);
                        // eslint-disable-next-line no-undef
                        $list.find('.list-name .count').text($list.find('.total-rows').val());
                    }

                    deferred.resolve();
                }
            );
        } else {
            deferred.resolve();
        }

        return deferred.promise();
    },

    refreshChildListItem: function (linkedId, linkedParentId) {
        var me = this;

        var deferred = new $.Deferred();
        var url = '';

        var mode = parseInt(me.$modeDropdown.val());

        var args = {
            branchId: me.branchId,
            userId: me.userId,
            userContext: me.userContext,
            period: me.period
        };

        var replaceFn;
        var $e = null;

        //Mode
        switch (mode) {
            case C.HomeEmailMarketingMode.Contact:
                url = '/homeemailmarketing/getemailmarketinglistforcontactitem';
                args.contactId = linkedParentId;
                args.propertyId = linkedId;
                $e = me.$root.find(
                    '#emailmarketing-child-list .row[data-contact-id="{0}"][data-property-id="{1}"]'.format(
                        linkedParentId,
                        linkedId
                    )
                );
                replaceFn = function (html) {
                    var $new = $(html);
                    $e.replaceWith($new);
                };
                break;
        }

        if ($e && $e.length > 0) {
            new gmgps.cloud.http("emailmarketing-refreshChildListItem").ajax(
                {
                    args: args,
                    background: true,
                    complex: true,
                    dataType: 'json',
                    type: 'post',
                    url: url
                },
                function (response) {
                    if (response.Data) {
                        replaceFn(response.Data);
                        // eslint-disable-next-line no-undef
                        $list.find('.list-name .count').text($list.find('.total-rows').val());
                    }

                    deferred.resolve();
                }
            );
        } else {
            deferred.resolve();
        }

        return deferred.promise();
    },

    showNoEmails: function ($e, msg) {
        var me = this;

        var $x = me.$noEmailsTemplate.clone();

        $x.find('.message').html(msg);
        $e.closest('.emailmarketing-list').find('.badge').text('0');

        $e.append($x);
        $x.fadeIn('fast');
    },

    refreshStats: function (noAnimation) {
        var me = this;

        var period = parseInt(me.$periodDropdown.val());
        var $caption = me.$root.find('#emailmarketing-stats .widget-caption');

        $caption.text(
            'All Tracked E-Mail Stats for {0}'.format(
                me.$periodDropdown.find('option:selected').text()
            )
        );

        me.getStats(me.branchId, me.userId, me.userContext, period).done(
            function (response) {
                if (response && response.Data) {
                    me.$header.find('.count').each(function (i, v) {
                        var $count = $(v);
                        var name = $count.data('name');

                        if (noAnimation) {
                            var val =
                                response.Data[name] +
                                (name.indexOf('Percent') >= 0 ? '%' : '');
                            $count[0].innerHTML = val;
                        } else {
                            var counter = new CountUp(
                                $count[0],
                                0,
                                response.Data[name],
                                0,
                                0.7,
                                {
                                    useEasing: true,
                                    useGrouping: true,
                                    separator: ',',
                                    suffix:
                                        name.indexOf('Percent') >= 0 ? '%' : ''
                                }
                            );

                            counter.start();
                        }
                    });
                }
            }
        );
    },

    getStats: function (branchId, userId, userContext, period) {
        var actionSuffix = '';

        switch (userContext) {
            case C.HomeEmailMarketingUserContext.EmailSender:
                actionSuffix = 'sender';
                break;
            case C.HomeEmailMarketingUserContext.ApplicantOwner:
                actionSuffix = 'applicantowner';
                break;
            case C.HomeEmailMarketingUserContext.PropertyOwner:
                actionSuffix = 'propertyowner';
                break;
        }

        return new gmgps.cloud.http("emailmarketing-getStats").ajax({
            args: {
                period: period,
                branchId: branchId,
                userId: userId,
                propertyRecordType: C.PropertyRecordType.Unspecified
            },
            background: true,
            complex: true,
            dataType: 'json',
            type: 'post',
            url: '/homeemailmarketing/getemailmarketingstatsby{0}'.format(
                actionSuffix
            )
        });
    },

    pnUpdate: function (pn) {
        var me = this;

        setTimeout(function () {
            me.processPn(pn);
        }, 100);
    },

    processPn: function (pn) {
        var me = this;
        var contactIds;

        //Notification can't be ignored.  Proceed to update.
        switch (pn.ModelType) {
            case C.ModelType.DiaryEvent:
                switch (pn.Data.EventTypeId) {
                    case C.EventType.Viewing:
                        //Exclusions
                        if (
                            me.canEventBeIgnored_EventIsViewingAndPropertyNotVisible(
                                pn
                            )
                        )
                            return false;

                        //Proceed
                        var propertyId = me.getModelIdFromPnEventParties(
                            pn.Data.Parties,
                            C.ModelType.Property
                        );
                        if (!propertyId) return false;

                        contactIds = me.getModelIdsFromPnEventParties(
                            pn.Data.Parties,
                            C.ModelType.Contact,
                            C.EventPartyRoleType.Viewer
                        );
                        if (!contactIds.length > 0) return true;

                        $.each(contactIds, function (i, contactId) {
                            me.refreshChildListItem(propertyId, contactId);
                        });
                        break;
                }
                break;

            case C.ModelType.FollowUp:
                //Exclusions
                if (
                    me.canEventBeIgnored_EventIsFollowUpAndPropertyNotVisible(
                        pn
                    )
                )
                    return false;

                //Proceed
                if (pn.Data.PropertyId && pn.Data.ContactId)
                    me.refreshChildListItem(
                        pn.Data.PropertyId,
                        pn.Data.ContactId
                    );

                break;

            case C.ModelType.MarketingEvent:
                //Exclusions
                if (!pn.Data.EmailTracking) return false;
                if (me.canEventBeIgnored_FallsOutsideOfSelectedPeriod(pn))
                    return false;

                //Proceed
                if (pn.Data.ContactId)
                    me.refreshParentListItem(pn.Data.ContactId);
                if (pn.Data.PropertyId)
                    me.refreshChildListItem(
                        pn.Data.PropertyId,
                        pn.Data.ContactId
                    );
                me.refreshStats(true);
                break;

            default:
                break;
        }
    },

    canEventBeIgnored_EventIsFollowUpAndPropertyNotVisible: function (pn) {
        var me = this;

        //For us to be interested in this, there must be a property and a contact involved and the followup must be a user todo.
        if (
            pn.Data.Type !== C.FollowUpType.Todo ||
            !pn.Data.PropertyId ||
            !pn.Data.ContactId
        )
            return true;

        //For us to be interested in this, the property needs to be on display.  Ignore if it is not.
        if (
            me.$root.find(
                '#emailmarketing-child-list .row[data-contact-id="{0}"][data-property-id="{1}"]'.format(
                    pn.Data.ContactId,
                    pn.Data.PropertyId
                )
            ).length === 0
        )
            return true;

        return false;
    },

    canEventBeIgnored_EventIsViewingAndPropertyNotVisible: function (pn) {
        var me = this;

        //Ensure pn event parties contain a property and at least one contact.
        var propertyId = me.getModelIdFromPnEventParties(
            pn.Data.Parties,
            C.ModelType.Property
        );
        if (!propertyId) return true;

        var contactIds = me.getModelIdsFromPnEventParties(
            pn.Data.Parties,
            C.ModelType.Contact,
            C.EventPartyRoleType.Viewer
        );
        if (!contactIds.length > 0) return true;

        //For us to be interested in this, the property needs to be on display for an applicant existing in the party list.  Ignore if it is not.
        $.each(contactIds, function (i, contactId) {
            if (
                me.$root.find(
                    '#emailmarketing-child-list .row[data-contact-id="{0}"][data-property-id="{1}"]'.format(
                        contactId,
                        propertyId
                    )
                ).length === 0
            )
                return true;
        });

        return false;
    },

    getModelIdFromPnEventParties: function (parties, modelType) {
        var modelId;

        $.each(parties, function (i, v) {
            if (v.ContextModelTypeId !== modelType) return true;
            modelId = v.ModelId;
            return false;
        });

        return modelId;
    },

    getModelIdsFromPnEventParties: function (parties, modelType, roleType) {
        var modelIds = [];

        $.each(parties, function (i, v) {
            if (
                !(v.ContextModelTypeId === modelType && v.RoleType === roleType)
            )
                return true;
            modelIds.push(v.ModelId);
            return false;
        });

        return modelIds;
    },

    //canEventBeIgnored_IsOutsideScopeOfCurrentToolbarToggles: function (pn) {

    //    var me = this;

    //    if (pn.Data.IsRecurring && !me.searchFilters.recurring) {
    //        return false;
    //    }

    //    switch (pn.Data.EventTypeId) {
    //        case C.EventType.General:
    //            return !me.searchFilters.general;
    //        case C.EventType.Viewing:
    //            return !(me.searchFilters.viewingsA || me.searchFilters.viewingsU);
    //        case C.EventType.Valuation:
    //            return !me.searchFilters.appraisals;
    //        default:
    //            return false;
    //    }
    //},

    canEventBeIgnored_FallsOutsideOfSelectedPeriod: function (pn) {
        var me = this;

        //Ignore when no EffectiveDate exists.
        if (!pn.Data.EffectiveDate) return true;

        //Is the event outside of the range of the current period?
        var toDate = new Date(shell.getApproxServerDateTime()).add(1).minutes(); //Add 1 minute to allow for the approx server time being updated via system/ping.
        var fromDate = me.getFromDateTimeViaToDateTime(toDate);
        var effectiveDate = new Date(pn.Data.EffectiveDate);

        if (effectiveDate < fromDate || effectiveDate > toDate) {
            return true; //Out of range.
        }

        return false;
    },

    getFromDateTimeViaToDateTime: function (toDateTime) {
        var me = this;

        var fromDate = new Date(toDateTime.valueOf());

        switch (me.period) {
            case C.HomeEmailMarketingPeriod.Past24Hrs:
                fromDate.add(-24).hours();
                break;
            case C.HomeEmailMarketingPeriod.Past48Hrs:
                fromDate.add(-48).hours();
                break;
            case C.HomeEmailMarketingPeriod.PastWeek:
                fromDate.add(-7).days();
                break;
            case C.HomeEmailMarketingPeriod.PastMonth:
                fromDate.add(-1).months();
                break;
        }

        return fromDate;
    }
};
