gmgps.cloud.ui.views.tdsAdmin = function (args) {
    var me = this;
    me.$root = args.$root;
    me.url = args.url;
    me.http = new gmgps.cloud.http("tdsAdmin-tdsAdmin");
    me.init(args);
};

gmgps.cloud.ui.views.tdsAdmin.prototype = {
    init: function () {
        var me = this;
        var $members = me.$root.find('.tds-member');
        me.$newMemberId = me.$root.find('.member-id-control');

        me.allocatedBranches = me.$root.find('.allocated .branch');
        me.unallocatedBranches = me.$root.find('.unallocated .branch');
        me.accountId = me.$root.find('#AccountId').val();

        me.tdsMemberData = {};
        $members.each(function () {
            var data = $(this).data();
            me.tdsMemberData[data.tdsmemberid] = data;
        });

        window.tdsAccountAuthorized = function () {
            me.$root.trigger('authorized');
        };
        window.tdsAccountUnauthorized = function (msg) {
            console.log(msg);
            me.$root.trigger('unauthorized', msg);
        };

        me.initEvents();
        gmgps.cloud.helpers.ui.initInputs(me.$root);
        me.$root.find('.customStyleSelectBox').css('width', '');

        me.refreshBranches();
        me.setBranchSelects();
        me.updateAllocationCounts();
    },
    initEvents: function () {
        var me = this;

        me.accountId = me.$root.find('#AccountId').val();

        me.$root.on('click', '#addTdsAccount', signIn);
        me.$root.on('click', 'button.tds-account-test', verifyAccess);

        function signIn() {
            var accountId = me.$root.find('#AccountId').val();
            new gmgps.cloud.ui.controls.window({
                title: 'Enter your TDS SFTP account credentials',
                windowId: 'sftpAccountCredentialsModal',
                url: 'TDSSetup/GetSftpAccountCredentialsModal',
                urlArgs: {
                    tdsAccountId: accountId
                },
                post: false,
                width: 400,
                draggable: true,
                modal: true,
                actionButton: 'OK',
                cancelButton: 'Cancel',
                onCancel: function () {
                    return false;
                },
                onAction: function ($window, closeWindow) {
                    var myForm = $window.find('form');
                    me.http.ajax(
                        {
                            url: 'TDSSetup/GetSftpAccountCredentialsModal',
                            dataType: 'json',
                            type: 'post',
                            silentErrors: true,
                            args: myForm.serialize()
                        },
                        function () {
                            closeWindow(true);
                            me.refreshData();
                        },
                        function (err, response) {
                            failSignIn(err, response.Data.modelErrors[1]);
                        }
                    );
                    return false;
                }
            });
        }

        function failSignIn(e, msg) {
            me.$root.find('#addTdsAccount').prop('disabled', false);
            showInfo('' + msg + '');
        }

        function verifyAccess(e) {
            e.preventDefault();
            var $link = $(this);
            var href = $link.data('testuri');
            var ajax = me.http.ajax({
                url: href,
                type: 'post',
                dataType: 'json'
            });
            ajax.done(function (result) {
                if (result.Data.success) {
                    showInfo(
                        'Verified TDS SFTP account access',
                        'TDS SFTP Account Test'
                    );
                } else {
                    showDialog({
                        type: 'info',
                        zIndex: 10000,
                        title: 'TDS SFTP Account Test',
                        msg: 'Could not sign-in to TDS SFTP account. Sign-in again?',
                        buttons: {
                            Yes: function () {
                                $(this).dialog('close');
                                signIn();
                            },
                            No: function () {
                                $(this).dialog('close');
                            }
                        }
                    });
                }
            });
        }

        me.$root.on('click', 'button.tds-account-add-member', function (e) {
            e.preventDefault();
            var $this = $(this);
            var $root = $this.closest('.tds-members');
            var $memberControl = $root.find('.member-id-control');
            var tdsMemberId = $.trim($memberControl.val());
            if (tdsMemberId === '') {
                return;
            }

            // eslint-disable-next-line no-prototype-builtins
            if (me.tdsMemberData.hasOwnProperty(tdsMemberId)) {
                showInfo('This member id has already been added to alto');
                return;
            }

            me.tdsMemberData[tdsMemberId] = {
                tdsmemberid: tdsMemberId
            };
            me.refreshBranches(tdsMemberId);

            me.tdsMemberData[tdsMemberId].branches
                .then(
                    function (r) {
                        return me.http
                            .ajax({
                                url: 'TDSSetup/CreateTdsAccountMember',
                                dataType: 'json',
                                type: 'post',
                                args: {
                                    tdsaccountid: me.accountId,
                                    tdsmemberid: tdsMemberId
                                }
                            })
                            .then(function (response) {
                                if (response.Data > 0) {
                                    var template = $(
                                        $('#newMemberTemplate').html()
                                    );
                                    $root
                                        .find('.tds-account-member-info')
                                        .append(template);
                                    template
                                        .data({
                                            tdsmemberid: tdsMemberId,
                                            memberid: response.Data
                                        })
                                        .attr({
                                            'data-tdsmemberid': tdsMemberId,
                                            'data-memberid': response.Data
                                        })
                                        .find('.member-id-text')
                                        .text(tdsMemberId);

                                    me.tdsMemberData[tdsMemberId].memberid =
                                        response.Data;
                                    me.refreshBranchAdmin();
                                    return r;
                                }
                                me.removeMember(tdsMemberId);
                                showInfo(
                                    'Member Id {0} is an invalid identity and cannot be located'.format(
                                        tdsMemberId
                                    )
                                );
                                return 0;
                            });
                    },
                    function () {
                        me.removeMember(tdsMemberId);
                        showInfo(
                            'Member Id {0} is an invalid identity'.format(
                                tdsMemberId
                            )
                        );
                    }
                )
                .done(function () {});

            $memberControl.val('');
        });

        me.$root.on('click', '.delete-member', function () {
            var $this = $(this);
            var $root = $this.closest('.tds-member');
            showDialog({
                type: 'question',
                title: 'Delete Member Id',
                msg:
                    'Do you want to delete Member Id: ' +
                    $root.data('tdsmemberid') +
                    '.  Proceed?',
                buttons: {
                    Yes: function () {
                        $(this).dialog('close');

                        me.http
                            .ajax({
                                args: {
                                    tdsAccountMemberId: $root.data('memberid')
                                },
                                type: 'post',
                                dataType: 'json',
                                url: 'TDSSetup/DeleteTdsAccountMember'
                            })
                            .then(function (r) {
                                if (r.ErrorData) {
                                    return r;
                                }
                                me.removeMember($root.data('tdsmemberid'));
                                $root.fadeOut(function () {
                                    $root.remove();
                                });
                                me.refreshBranchAdmin();
                                return r;
                            });

                        //todo: server request to remove member id and branch mappings
                        //todo: update ui;
                    },
                    No: function () {
                        $(this).dialog('close');
                    }
                }
            });
        });

        me.$root.on('click', '.delete-branch-map', function () {
            var $this = $(this);
            var $root = $this.closest('.branch');
            var data = me.getMappingData($root);
            showDialog({
                type: 'question',
                title: 'Delete Mapping info',
                msg:
                    'Do you want to delete mapping information for branch: ' +
                    $root.find('.branch-name').text() +
                    '.  Proceed?',
                buttons: {
                    Yes: function () {
                        $(this).dialog('close');
                        me.http
                            .ajax({
                                args: {
                                    tdsAccountBranchMappingId: data.id
                                },
                                type: 'post',
                                dataType: 'json',
                                url: 'TDSSetup/DeleteTdsAccountBranchMapping'
                            })
                            .then(function (r) {
                                if (r.ErrorData) {
                                    return r;
                                }
                                me.deAllocateBranch($root);
                                return r;
                            });
                    },
                    No: function () {
                        $(this).dialog('close');
                    }
                }
            });
        });

        me.$root.on('click', 'button.save-map', function () {
            var $el = $(this);
            var $branch = $el.closest('.branch');
            var args = me.getMappingData($branch);

            if (!args.tdsMemberId) {
                showInfo('Select a Member Id');
                return;
            }
            if (!args.tdsBranchId) {
                showInfo('Select a Branch');
                return;
            }

            me.http
                .ajax({
                    url: 'TDSSetup/CreateTdsAccountBranchMapping',
                    dataType: 'json',
                    type: 'post',
                    args: args
                })
                .then(function (response) {
                    if (!args.id) {
                        $branch
                            .data('mapid', response.Data)
                            .appendTo(me.$root.find('.allocated .list-group'));
                        $branch
                            .find('.save-map')
                            .after(
                                '<button class="btn btn-delete btn-sq delete-branch-map"><span class="fa fa-trash"></span></button>'
                            );
                    }

                    setModified($branch, false);
                    me.updateAllocationCounts();
                    return response;
                });
        });

        me.$root.on('change', '.member-list-control', function () {
            var $this = $(this);
            var id = $this.val();
            var $root = $this.closest('.branch');
            var $branches = $root.find('.tds-branches-control');
            if (!id) {
                me.clearBranches($branches);
                me.removeAlert($root);
                setModified($root, false);
            } else {
                me.tdsMemberData[id].branches.then(
                    function (data) {
                        $branches.val('').html(data).trigger('prog-change');
                        setModified($root, !!$branches.val());
                        me.removeAlert($root);
                    },
                    function () {
                        me.addAlert(
                            $root,
                            'There is a problem with this member id'
                        );
                        me.clearBranches($branches);
                        setModified($root, false);
                    }
                );
            }
        });

        me.$root.on('change', '.tds-branches-control', function () {
            var $this = $(this);
            setModified($this, !!$this.val());
        });

        function isBranchSetToOriginalValues($branch) {
            var originalMemberId = $branch.data('originalmemberid');
            var originalBranchid = $branch.data('originalbranchid');
            var currentMemberId = $branch.find('.member-list-control').val();
            var currentBranchId = $branch.find('.tds-branches-control').val();
            console.log(originalMemberId);
            console.log(originalBranchid);
            console.log(currentMemberId);
            console.log(currentBranchId);
            return (
                originalMemberId == currentMemberId &&
                originalBranchid == currentBranchId
            );
        }

        function setModified($branch, isModified) {
            var $root = $branch.closest('.branch');
            if (isModified && !isBranchSetToOriginalValues($root)) {
                $root.addClass('modified');
                me.removeAlert($root);
            } else {
                $root.removeClass('modified');
            }
        }
    },
    clearBranches: function ($branches) {
        $branches
            .val('')
            .trigger('prog-change')
            .find('option[value!=""]')
            .remove();
    },
    deAllocateBranch: function ($branch) {
        var me = this;
        $branch.find('.member-list-control').val('').trigger('prog-change');
        me.clearBranches($branch.find('.tds-branches-control'));
        $branch.find('.delete-branch-map').remove();
        $branch.appendTo('.unallocated .list-group');
        $branch.data('mapid', 0);
    },
    updateAllocationCounts: function () {
        var branchesAssigned = {};
        var me = this;

        me.$root.find('.allocated .member-list-control').each(function () {
            var id = $(this).val();
            if (id) {
                // eslint-disable-next-line no-prototype-builtins
                if (!branchesAssigned.hasOwnProperty(id)) {
                    branchesAssigned[id] = 0;
                }
                branchesAssigned[id]++;
            }
        });

        me.$root.find('.tds-member').each(function () {
            var $member = $(this);
            var id = $member.data('tdsmemberid');
            var count = 0;
            var plural = 'es';

            // eslint-disable-next-line no-prototype-builtins
            if (branchesAssigned.hasOwnProperty(id)) {
                count = branchesAssigned[id];
                if (count === 1) {
                    plural = '';
                }
            }
            $member
                .find('small')
                .text('Assigned to {0} branch{1}'.format(count, plural));
        });
    },

    refreshData: function () {
        var me = this;
        return me.http.getView({
            url: me.url,
            post: true,
            onSuccess: function (response) {
                var newContainer = $(response.Data);
                me.$root.replaceWith(newContainer);
                me.$root = newContainer;
                me.init();
            }
        });
    },

    removeMember: function (id) {
        var me = this;
        delete me.tdsMemberData[id];
    },
    addAlert: function ($root, msg) {
        $root
            .closest('.branch')
            .find('.branch-icon')
            .removeClass('fa-group')
            .addClass('text-danger fa-exclamation-triangle')
            .prop('title', msg);
    },
    removeAlert: function ($root) {
        $root
            .closest('.branch')
            .find('.branch-icon')
            .removeClass('fa-exclamation-triangle text-danger')
            .addClass('fa-group')
            .prop('title', '');
    },

    refreshBranches: function (id) {
        var me = this;
        var ids;
        if (id) {
            ids = [id];
        } else {
            ids = Object.keys(me.tdsMemberData);
        }
        $.each(ids, function (i, e) {
            // eslint-disable-next-line no-prototype-builtins
            if (!me.tdsMemberData[e].hasOwnProperty('branches')) {
                me.tdsMemberData[e].branches = $.Deferred();
                me.tdsMemberData[e].branches.fail(function () {
                    //todo: select allocated and show alert
                    me.$root
                        .find('.allocated .member-list-control')
                        .each(function () {
                            var $this = $(this);
                            if ($this.val() === e) {
                                me.addAlert(
                                    $this,
                                    'There is a problem with this member id'
                                );
                                $this
                                    .closest('.branch')
                                    .find('.tds-branches-control')
                                    .val('')
                                    .trigger('prog-change')
                                    .find('option[value!=""]')
                                    .remove();
                            }
                        });
                });
                var request = {
                    url: 'TDSSetup/GetTdsBranches',
                    type: 'post',
                    dataType: 'json',
                    args: {
                        id: me.accountId,
                        tdsMemberId: e
                    },
                    silentErrors: true
                };
                var ajax = me.http.ajax(
                    request,
                    function (response) {
                        var options = $.map(response.Data, function (branch) {
                            return '<option value="{0}">{0}</option>'.format(
                                branch.branch_id
                            );
                        });
                        options.unshift(
                            '<option value="">Select Branch</option>'
                        );
                        me.tdsMemberData[e].branches.resolve(options.join(''));
                        return response;
                    },
                    function (err, response) {
                        //todo: this might change. at the moment errors from the api are not handled on the server.

                        if (response.Data && response.Data.ServerErrors) {
                            me.http.processHandledErrors(
                                { url: request.url, args: request.args },
                                response,
                                ajax
                            );
                        } else {
                            me.tdsMemberData[e].branches.reject(err);
                        }

                        return err;
                    }
                );
            }
        });
    },
    refreshBranchAdmin: function () {
        var me = this;
        var options = ['<option value="">Select Member...</option>'];
        $.each(me.tdsMemberData, function (key) {
            options.push('<option value="{0}">{0}</option>'.format(key));
        });
        options = options.join('');
        me.$root.find('.member-list-control').each(function () {
            var $this = $(this);

            var val = $this.val();
            $this.html(options);
            // eslint-disable-next-line no-prototype-builtins
            if (!me.tdsMemberData.hasOwnProperty(val)) {
                me.deAllocateBranch($this.closest('.branch'));
            } else {
                $this.val(val);
            }
        });
    },
    setBranchSelects: function () {
        var me = this;
        me.$root.find('.branch').each(function (i, e) {
            var $branch = $(e);
            var data = me.getMappingData($branch);
            if (data.tdsMemberId) {
                if (me.tdsMemberData[data.tdsMemberId].branches) {
                    me.tdsMemberData[data.tdsMemberId].branches.then(function (
                        result
                    ) {
                        var $branches = $branch.find('.tds-branches-control');
                        $branches.html(result);
                        $branches.val(data.tdsBranchId).trigger('prog-change');
                        if (!$branches.val()) {
                            me.addAlert($branch, 'Invalid branch ID');
                        }
                        return result;
                    });
                }
            }
        });
    },
    getMappingData: function ($root) {
        var me = this;
        var tdsMemberId = $root.find('.member-list-control').val();
        var memberId = 0;
        // eslint-disable-next-line no-prototype-builtins
        if (me.tdsMemberData.hasOwnProperty(tdsMemberId)) {
            memberId = me.tdsMemberData[tdsMemberId].memberid;
        }
        return {
            memberId: memberId,
            tdsMemberId: tdsMemberId,
            tdsAccountMemberId: me.accountId,
            tdsBranchId: $root.find('.tds-branches-control').val(),
            branchId: $root.data('id'),
            id: $root.data('mapid')
        };
    }
};
