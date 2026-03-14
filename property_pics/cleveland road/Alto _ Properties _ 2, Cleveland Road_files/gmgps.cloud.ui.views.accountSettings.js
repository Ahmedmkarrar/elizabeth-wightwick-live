gmgps.cloud.ui.views.accountSettings = function (args) {
    var me = this;
    me.$root = args.$root.closest('.window');
    me.apiService = args.apiService || new gmgps.cloud.services.ApiService();
    me.init();
    me.closeMyWindow = args.closeMyWindow;

    me.PasswordChangeResult = {
        InvalidCurrentPassword: 0,
        WeakNewPassword: 1,
        Success: 2,
        Error: 3
    };

    return true;
};

gmgps.cloud.ui.views.accountSettings.prototype.init = function () {
    var me = this;
    me.$verificationStatus = me.$root.find('#verificationStatus');
    me.verificationStatus = me.$verificationStatus.val() === 'True';
    me.$editTwoStepVerification = me.$root.find('.editTwoStepVerification');

    $(function () {
        if (!me.verificationStatus) {
            me.$editTwoStepVerification.removeClass('on');
        }
    });

    me.$root.find('.editTwoStepVerification').on('click', function () {
        if (!me.verificationStatus) {
            me.closeMyWindow();
            me.showTwoStepVerification();
        } else {
            me.showTurnOffVerification();
        }
    });

    me.$root.find('.editTwoStepVerificationAuth0').on('click', function () {
        me.closeMyWindow();
        if (!me.verificationStatus) {
            me.showEnableTwoStepVerificationAuth0();
        } else {
            me.showDisableTwoStepVerificationAuth0();
        }
    });

    me.$root.find('#changeMobilePhoneNumberAuth0').on('click', function () {
        me.closeMyWindow();
        me.showChangeMobilePhoneNumberAuth0();
    });

    me.$root.on('click', '#logout-link-external', function () {
        shell.startLogout(true);
    });

    me.$root.find('#account-settings-password').on('click', function () {
        me.showChangePassword();
    });

    me.$root.find('#account-settings-reset-password').on('click', function () {
        me.showResetPassword();
    });

    me.$root.find('.editMobilePhoneNumber').on('click', function () {
        me.showChangeMobilePhoneNumber();
    });

    me.$root
        .find('#account-settings-exchange-credentials')
        .on('click', function (e) {
            e.preventDefault();
            me.showChangeExchangeCredentials();
        });

    var lastCamsActivityDate = moment.utc(
        me.$root.find('#lastCamsActivityDate').val()
    );
    if (lastCamsActivityDate.isValid()) {
        me.$root.find('#lastCamsActivity').text(lastCamsActivityDate.fromNow());
    }
};

gmgps.cloud.ui.views.accountSettings.prototype.showTurnOffVerification =
    function () {
        var me = this;

        me.confirmPasswordBeforeAction(function () {
            me.turnOffVerification(me, this);
        });
    };

gmgps.cloud.ui.views.accountSettings.prototype.confirmPasswordBeforeAction =
    function (callBack) {
        var me = this;
        me.closeMyWindow();

        showDialog({
            type: 'question',
            title: 'Turn Off Verification',
            msg: '<div class="accountSettingsTurnOffVerificationInstructions">Before you can proceed, we need you to confirm your password. </div><div class="turnOffVerificationDialog"><label for="password">Password:</label><input type="password" id="password" /></div><div class="accountSettingError turnOffVerficiationError"></div>',
            create: function (event) {
                me.$dialogRoot = $(event.target);

                setTimeout(function () {
                    me.$dialogRoot.find('#password').focus();
                }, 100);

                me.$dialogRoot.find('#password').on('keydown', function (e) {
                    if (e.keyCode == 13) {
                        me.validatePasswordWithCallBack(me, callBack);
                    }
                });
            },
            buttons: {
                Close: function () {
                    $(this).dialog('close');
                    gmgps.cloud.helpers.user.openAccountSettings();
                    return false;
                },

                Submit: function () {
                    me.validatePasswordWithCallBack(me, callBack);
                }
            }
        });
    };

gmgps.cloud.ui.views.accountSettings.prototype.validatePasswordWithCallBack =
    function (me, callBack) {
        if (me.$dialogRoot.find('#password').val() == '') {
            me.validationDialogError('Please enter a password');
            return;
        }

        new gmgps.cloud.http(
            "accountSettings-validatePasswordWithCallBack"
        ).ajax(
            {
                args: { password: me.$dialogRoot.find('#password').val() },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/AccountSettings/ConfirmPassword'
            },
            function (response) {
                if (!response.Data) {
                    me.validationDialogError('Incorrect Password.');
                    return;
                }

                $('.dialog').dialog('close');
                return callBack(me, this);
            }
        );
    };

gmgps.cloud.ui.views.accountSettings.prototype.turnOffVerification =
    function () {
        new gmgps.cloud.http("accountSettings-turnOffVerification").ajax(
            {
                args: null,
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/AccountSettings/ToggleTwoStepSetting'
            },
            function () {
                $('.dialog').dialog('close');
                gmgps.cloud.helpers.user.openAccountSettings();
            }
        );
    };

gmgps.cloud.ui.views.accountSettings.prototype.showTwoStepVerification =
    function () {
        var me = this;
        me.closeMyWindow();

        new gmgps.cloud.ui.controls.window({
            title: '2-Step Verification',
            windowId: 'twostepModal',
            controller: gmgps.cloud.ui.views.twoStepVerification,
            url: 'AccountSettings/TwoStepVerification',
            post: true,
            width: 1000,
            draggable: true,
            modal: true,
            actionButton: 'Next >>',
            cancelButton: 'Cancel',
            onAction: function (e, twoStepVerfication) {
                twoStepVerfication.loadStartTwoStepSetup();
            },
            onCancel: function () {
                gmgps.cloud.helpers.user.openAccountSettings();
            }
        });
    };

gmgps.cloud.ui.views.accountSettings.prototype.setMfaAuth0 = function (
    enable,
    callback
) {
    var me = this;
    var spinner = showSpinner();

    me.apiService
        .post('MultiFactorAuthToggle', 'toggle', {
            enroll: enable
        })
        .then(function () {
            spinner.hide();
            if (callback) {
                callback();
            }
        })
        .catch(function (reason) {
            spinner.hide();
            console.log('Error', reason);
            showError(
                'There was a problem performing this action. Please try again.'
            );
        });
};

gmgps.cloud.ui.views.accountSettings.prototype.resetMfaAuth0 = function (
    callback
) {
    var me = this;
    // perform reset (toggle off, then toggle on), then call any passed callback
    me.setMfaAuth0(false, function () {
        me.setMfaAuth0(true, function () {
            if (callback) {
                callback();
            }
        });
    });
};

gmgps.cloud.ui.views.accountSettings.prototype.showEnableTwoStepVerificationAuth0 =
    function () {
        var me = this;

        new gmgps.cloud.ui.controls.window({
            title: 'Turn on 2-Step Verification',
            windowId: 'two-step-verification-enable-instructions-auth0',
            controller: gmgps.cloud.ui.views.twoStepVerification,
            $content: $(
                '<h1>Log out of Alto to turn on 2-step verification.</h1><br/><p>When you next log in, you&#39;ll need to enter your mobile phone number to finish the process.</p>'
            ),
            width: 350,
            draggable: true,
            modal: true,
            actionButton: 'Log out now',
            thirdButton: 'Log out later',
            cancelButton: 'Cancel',
            onAction: function () {
                me.setMfaAuth0(true, function () {
                    shell.startLogout(true);
                });
                return true;
            },
            onCancel: function () {
                gmgps.cloud.helpers.user.openAccountSettings();
            },
            onThirdButton: function () {
                // Log out later functionality
                me.setMfaAuth0(true, function () {
                    gmgps.cloud.helpers.user.openAccountSettings();
                });
                return true;
            }
        });
    };

gmgps.cloud.ui.views.accountSettings.prototype.showDisableTwoStepVerificationAuth0 =
    function () {
        var me = this;

        new gmgps.cloud.ui.controls.window({
            title: 'Turn off 2-Step Verification',
            windowId: 'two-step-verification-disable-instructions-auth0',
            controller: gmgps.cloud.ui.views.twoStepVerification,
            $content: $(
                '<h1>Turning this off makes your account less secure.</h1><br/><p>2-step verification helps to keep your account safe from online attacks.</p>'
            ),
            width: 350,
            draggable: true,
            modal: true,
            actionButton: 'Keep my account secure',
            cancelButton: 'Turn off 2-step verification',
            onAction: function () {
                gmgps.cloud.helpers.user.openAccountSettings();
                return true;
            },
            onCancel: function () {
                me.setMfaAuth0(false, function () {
                    gmgps.cloud.helpers.user.openAccountSettings();
                });
            }
        });
    };

gmgps.cloud.ui.views.accountSettings.prototype.showChangeMobilePhoneNumberAuth0 =
    function () {
        var me = this;

        new gmgps.cloud.ui.controls.window({
            title: 'Change mobile phone number',
            windowId: 'two-step-verification-change-mobile-instructions-auth0',
            controller: gmgps.cloud.ui.views.twoStepVerification,
            $content: $(
                '<h1>Log out of Alto to change your number.</h1><br/><p>When you next log in, you&#39;ll need to enter your new number through 2-step verification.</p>'
            ),
            width: 350,
            draggable: true,
            modal: true,
            actionButton: 'Log out now',
            thirdButton: 'Log out later',
            cancelButton: 'Cancel',
            onAction: function () {
                //call method to reset mobile number via auth0, passing callback to logout
                me.resetMfaAuth0(function () {
                    shell.startLogout(true);
                });
                return true;
            },
            onCancel: function () {
                gmgps.cloud.helpers.user.openAccountSettings();
            },
            onThirdButton: function () {
                // Log out later functionality
                //call method to reset mobile number via auth0, passing callback to openAccountSettings
                me.resetMfaAuth0(function () {
                    gmgps.cloud.helpers.user.openAccountSettings();
                });
                return true;
            }
        });
    };

gmgps.cloud.ui.views.accountSettings.prototype.showChangeMobilePhoneNumber =
    function () {
        var me = this;

        me.confirmPasswordBeforeAction(function () {
            showDialog({
                type: 'question',
                title: 'Change Mobile Phone Number',
                msg: '<div class="accountSettingError mobileSettingError"></div><div class="mobilePhoneChangeDialog"><label for="mobile">Mobile:</label><input type="text" id="mobile" /></div>',
                create: function (event) {
                    me.$dialogRoot = $(event.target);

                    setTimeout(function () {
                        me.$dialogRoot.find('#mobile').focus();
                    }, 100);

                    me.$dialogRoot.find('#mobile').on('keydown', function (e) {
                        if (e.keyCode == 13) {
                            me.changeMobileNumber(me, this);
                        }
                    });
                },
                buttons: {
                    Close: function () {
                        $(this).dialog('close');
                        gmgps.cloud.helpers.user.openAccountSettings();
                        return false;
                    },

                    Submit: function () {
                        return me.changeMobileNumber(this);
                    }
                }
            });
        });
    };

gmgps.cloud.ui.views.accountSettings.prototype.changeMobileNumber =
    function () {
        var me = this;
        var mobileVal = me.$dialogRoot.find('#mobile').val();
        var matchPattern = /07\d{9}$/;

        if (mobileVal == '' || !matchPattern.test(mobileVal)) {
            me.validationDialogError(
                'Please enter a valid UK mobile telephone number.'
            );
            return false;
        }

        new gmgps.cloud.http("accountSettings-changeMobileNumber").ajax(
            {
                args: { mobileNumber: mobileVal },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/AccountSettings/ChangeMobileNumber'
            },
            function () {
                $('.dialog').dialog('close');
                gmgps.cloud.helpers.user.openAccountSettings();
            }
        );

        return true;
    };

gmgps.cloud.ui.views.accountSettings.prototype.showResetPassword = function () {
    var me = this;
    me.closeMyWindow();

    var emailAddress = me.$root.find('#LoginName').val();
    var groupId = me.$root.find('#GroupId').val();

    me.apiService
        .post('password', 'reset', {
            userId: shell.userId,
            groupId: groupId,
            loginName: emailAddress
        })
        .catch(function (reason) {
            var msg =
                '<p>Something went wrong when attempting to send an email to allow you to reset your password.</p>' +
                '<br/><p>' +
                reason.statusText +
                '.</p><br/>' +
                '<p>Please contact your administrator.</p>';

            $.jGrowl(msg, {
                header: 'Reset Password Email Sending Failed',
                theme: 'growl-system',
                life: 5000
            });
        });

    showDialog({
        type: 'info',
        title: 'Reset Password',
        hideCloseButton: true,
        msg:
            '<div id="reset-password-info" class="changePasswordDialog fields labels-110">' +
            '<div>' +
            "<p>We've emailed " +
            emailAddress +
            ' a link to reset this password.</p>' +
            '<p>The link needs to be used within 5 days.</p>' +
            '<p>Need further support? Visit our <a style="font-size:inherit" target="_blank" rel="noopener noreferrer" href="https://support.altosoftware.co.uk/hc/en-gb/articles/360017748857-How-to-manage-your-passwords-effectively-">help centre</a>.</p>' +
            '</div>' +
            '</div>',
        buttons: {
            Close: function () {
                $(this).dialog('close');
                gmgps.cloud.helpers.user.openAccountSettings();
                return false;
            }
        }
    });
};

gmgps.cloud.ui.views.accountSettings.prototype.showChangePassword =
    function () {
        var me = this;
        me.closeMyWindow();

        showDialog({
            type: 'question',
            title: 'Change Password',
            msg:
                '<div id="two-step-verification-setup-start" class="changePasswordDialog fields labels-110">' +
                '<div id="passwordChange" >' +
                '<h1 class="line">Change Password</h1>' +
                '<div class="row">' +
                '<div class="col-1"><label for="currentPassword">Current Password:</label></div>' +
                '<div class="col-2"><input type="password" id="currentPassword" name="currentPassword" /></div>' +
                '<div class="clear"></div>' +
                '</div>' +
                '<div class="instructions">Please enter and confirm your new password below. It must contain the following:</div>' +
                '<ul class="password-rules">' +
                '<li id="pwd-length">a minimum of 6 characters</li>' +
                '<li id="pwd-upper">an uppercase character</li>' +
                '<li id="pwd-lower">a lowercase character</li>' +
                '<li id="pwd-number">a number</li>' +
                '<li id="pwd-symbol">a non-alphanumeric character</li>' +
                '</ul>' +
                '<div class="row">' +
                '<div class="col-1"><label for="newPassword">New Password:</label></div>' +
                '<div class="col-2"><input type="password" id="newPassword" name="newPassword" /></div>' +
                '<div class="clear"></div>' +
                '</div>' +
                '<div class="row">' +
                '<div class="col-1"><label for="confirmPassword">Confirm Password:</label></div>' +
                '<div class="col-2"><input type="password" id="confirmPassword" name="confirmPassword" /></div>' +
                '<div class="clear"><div class="accountSettingError passwordSettingError"></div>' +
                '</div>' +
                '</div>' +
                '</div>',
            create: function (event) {
                me.$dialogRoot = $(event.target);

                $(function () {
                    me.$dialogRoot.find('#currentPassword').focus();
                }, 100);

                me.$dialogRoot
                    .find('.changePasswordDialog input')
                    .on('keydown', function (e) {
                        if (e.keyCode == 13) {
                            me.changePassword(me, this);
                        }

                        return true;
                    });
            },
            buttons: {
                Close: function () {
                    $(this).dialog('close');
                    gmgps.cloud.helpers.user.openAccountSettings();
                    return false;
                },

                Submit: function () {
                    return me.changePassword(me, this);
                }
            }
        });

        me.$dialogRoot.find('#newPassword').on('keyup', function (e) {
            if (e.keyCode === 13 || e.keyCode === 9) return;

            me.validatePasswordStrength();
        });

        me.$dialogRoot.find('#newPassword').on('focusout', function () {
            me.validatePasswordStrength();
        });

        me.$dialogRoot.find('#confirmPassword').on('focusout', function () {
            var newPassword = me.$dialogRoot.find('#newPassword').val();
            var confirmPassword = me.$dialogRoot.find('#confirmPassword').val();

            if (newPassword !== confirmPassword) {
                me.validationDialogError(
                    'Your new password does not match the confirm password.'
                );
            }
        });
    };

gmgps.cloud.ui.views.accountSettings.prototype.validatePasswordStrength =
    function () {
        var me = this;
        var newPasswordVal = me.$dialogRoot.find('#newPassword').val();

        var validator = new PasswordValidator();
        var valid = validator.validate(newPasswordVal);

        var allValid = true;

        $.each(valid, function (index, isValid) {
            if (isValid) {
                $('#pwd-' + index).addClass('valid');
            } else {
                $('#pwd-' + index).removeClass('valid');
                allValid = false;
            }
        });

        return allValid;
    };

gmgps.cloud.ui.views.accountSettings.prototype.changePassword = function () {
    var me = this;
    me.currentPassword = me.$dialogRoot.find('#currentPassword').val();
    me.newPassword = me.$dialogRoot.find('#newPassword').val();
    me.confirmPassword = me.$dialogRoot.find('#confirmPassword').val();

    if (me.currentPassword === '') {
        me.validationDialogError('Please enter your current password');
        return false;
    }

    if (me.newPassword === '') {
        me.validationDialogError('Please enter your new password');
        return false;
    }

    if (me.confirmPassword === '') {
        me.validationDialogError('Please confirm your new password');
        return false;
    }

    if (me.newPassword != me.confirmPassword) {
        me.validationDialogError(
            'Your new password does not match the confirmed password.'
        );
        return false;
    }

    if (me.currentPassword == me.newPassword) {
        me.validationDialogError(
            'Your new password must differ from your current password.'
        );
        return false;
    }

    if (!me.validatePasswordStrength()) {
        me.validationDialogError(
            'Your new password does not meet complexity requirements.'
        );
        return false;
    }

    new gmgps.cloud.http("accountSettings-changePassword").ajax(
        {
            args: {
                existingPassword: me.currentPassword,
                newPassword: me.newPassword
            },
            complex: true,
            dataType: 'json',
            type: 'post',
            url: '/AccountSettings/ChangePassword'
        },
        function (response) {
            if (response.Data.Success) {
                $('.dialog').dialog('close');
                gmgps.cloud.helpers.user.openAccountSettings();
                return true;
            } else {
                var errorResponse = response.Data.Error || 'An error occured';
                me.validationDialogError(errorResponse);
                return false;
            }
        }
    );

    return true;
};

gmgps.cloud.ui.views.accountSettings.prototype.validationError = function (
    error
) {
    var me = this;
    if (!error) error = '';
    me.$root.find('.accountSettingError').text(error);
};

gmgps.cloud.ui.views.accountSettings.prototype.validationDialogError =
    function (error) {
        var me = this;
        if (!error) error = '';
        me.$dialogRoot.find('.accountSettingError').text(error);
    };

gmgps.cloud.ui.views.accountSettings.prototype.validateExchangeCredentialsForm =
    function (thisDialog, e, hasPasswordChanged) {
        var me = this;
        me.userName = me.$dialogRoot.find('#userName').val();
        me.password = me.$dialogRoot.find('#newPassword').val();
        me.confirmPassword = me.$dialogRoot.find('#confirmPassword').val();
        me.serverUrl = me.$dialogRoot.find('#serverUrl').val();
        me.isAutodiscoverEnabled = me.$dialogRoot
            .find('#isAutodiscoverEnabled')
            .hasClass('on');
        me.isGroupOAuthEnabled =
            (
                me.$root.find('#camsIsGroupOAuthEnabled').val() + ''
            ).toLowerCase() == 'true';

        if (me.userName === '') {
            me.validationDialogError(
                'Please enter your Exchange User Name/email address'
            );
            return false;
        }

        if (hasPasswordChanged) {
            if (me.password === '') {
                me.validationDialogError('Please enter your password');
                return false;
            }

            if (me.confirmPassword === '') {
                me.validationDialogError('Please confirm your password');
                return false;
            }

            if (me.password != me.confirmPassword) {
                me.validationDialogError(
                    'Your new password does not match the confirmed password.'
                );
                return false;
            }
        }

        if (
            !me.isGroupOAuthEnabled &&
            !me.isAutodiscoverEnabled &&
            me.serverUrl === ''
        ) {
            me.validationDialogError('Please enter a server URL');
            return false;
        }

        me.validationDialogError();
        return true;
    };

gmgps.cloud.ui.views.accountSettings.prototype.showChangeExchangeCredentials =
    function () {
        var me = this,
            userName = me.$root.find('#camsUserName').val() || '',
            autodiscover =
                (
                    me.$root.find('#camsIsAutodiscoverEnabled').val() + ''
                ).toLowerCase() == 'true',
            isGroupOAuthEnabled =
                (
                    me.$root.find('#camsIsGroupOAuthEnabled').val() + ''
                ).toLowerCase() == 'true',
            serverUrl = me.$root.find('#camsServerUrl').val() || '',
            hasPasswordChanged = false,
            isFormDirty = false;

        me.closeMyWindow();

        showDialog({
            type: 'question',
            title: 'Change Exchange Credentials',
            msg:
                '<div class="accountSettingError passwordSettingError"></div><div class="changeExchangeCredentialsDialog fields labels-110">' +
                '<div class="dialog-help-text">Update your Exchange or Office 365 credentials.</div>' +
                '<div class="row">' +
                '<div class="col-1"><label for="userName">User Name:</label></div>' +
                '<div class="col-2"><input type="text" id="userName" name="userName" value="' +
                userName +
                '" /></div>' +
                '<div class="clear"></div>' +
                '</div>' +
                (isGroupOAuthEnabled
                    ? ''
                    : '<div class="row">' +
                      '<div class="col-1"><label for="newPassword">Password:</label></div>' +
                      '<div class="col-2"><input type="password" id="newPassword" autocomplete="off" name="newPassword" value="" /></div>' +
                      '<div class="clear"></div>' +
                      '</div>' +
                      '<div class="row">' +
                      '<div class="col-1"><label for="confirmPassword">Retype Password:</label></div>' +
                      '<div class="col-2"><input type="password" id="confirmPassword" autocomplete="off" name="confirmPassword" value="" /></div>' +
                      '<div class="clear"></div>' +
                      '</div>' +
                      '<div class="row">' +
                      '<div class="col-1"><label for="autodiscover">Use Autodiscover:</label></div>' +
                      '<div class="col-2"><div id="isAutodiscoverEnabled" class="toggle ' +
                      (autodiscover ? 'on' : 'off') +
                      '"></div></div>' +
                      '<div class="clear"></div>' +
                      '</div>' +
                      '<div class="row">' +
                      '<div class="col-1"><label for="serverUrl">Server address:</label></div>' +
                      '<div class="col-2"><input type="text" id="serverUrl" name="serverUrl" value="' +
                      serverUrl +
                      '" ' +
                      (autodiscover ? 'disabled' : '') +
                      '/></div>' +
                      '<div class="clear"></div>' +
                      '</div>' +
                      '</div>' +
                      '</div>'),
            create: function (event) {
                me.$dialogRoot = $(event.target);
            },
            onClosed: function () {
                gmgps.cloud.helpers.user.openAccountSettings();
            },
            buttons: {
                'Remove Profile': function () {
                    return me.deleteExchangeCredentials(me, this);
                },
                'Check Settings': function () {
                    return me.checkExchangeCredentials(
                        me,
                        this,
                        hasPasswordChanged
                    );
                },
                Close: function () {
                    $(this).dialog('close');
                    return false;
                },
                Save: function () {
                    var result = me.changeExchangeCredentials(
                        me,
                        this,
                        hasPasswordChanged
                    );
                    if (result) {
                        setFormClean();
                    }
                    return result;
                }
            }
        });

        setFormClean();

        me.$dialogRoot
            .find('input')
            .on('propertychange change input paste', function () {
                setFormDirty();
            });

        me.$dialogRoot.find('#isAutodiscoverEnabled').on('click', function (e) {
            var current = $(e.target).hasClass('on');

            if (current) {
                me.$dialogRoot.find('#serverUrl').prop('disabled', false);
            } else {
                me.$dialogRoot.find('#serverUrl').prop('disabled', true);
            }

            setFormDirty();
        });

        me.$dialogRoot.find('#newPassword').on('click', function (e) {
            if (!hasPasswordChanged) {
                var newPassword = $(e.target);
                newPassword.select();
            }
        });

        me.$dialogRoot.find('#newPassword').on('change', function () {
            hasPasswordChanged = true;
            var confirmPassword = me.$dialogRoot.find('#confirmPassword');
            confirmPassword.val('');
        });

        me.$dialogRoot
            .find('.changeExchangeCredentialsDialog input')
            .on('keydown', function (e) {
                if (e.keyCode == 13) {
                    if (!isFormDirty) return false;
                    me.changeExchangeCredentials(me, this);
                }

                return true;
            });

        me.$dialogRoot
            .find('button:contains("Check Settings")')
            .prop('disabled', 'disabled');

        function setFormClean() {
            var checkSettingsButton = me.$dialogRoot
                .closest('.ui-dialog')
                .find(".ui-dialog-buttonset button:contains('Check Settings')");
            checkSettingsButton.removeAttr('disabled');

            var saveSettingsButton = me.$dialogRoot
                .closest('.ui-dialog')
                .find(".ui-dialog-buttonset button:contains('Save')");
            saveSettingsButton.attr('disabled', 'disabled');

            isFormDirty = false;
        }

        function setFormDirty() {
            if (isFormDirty) return;

            var checkSettingsButton = me.$dialogRoot
                .closest('.ui-dialog')
                .find(".ui-dialog-buttonset button:contains('Check Settings')");
            checkSettingsButton.attr('disabled', 'disabled');

            var saveSettingsButton = me.$dialogRoot
                .closest('.ui-dialog')
                .find(".ui-dialog-buttonset button:contains('Save')");
            saveSettingsButton.removeAttr('disabled');

            isFormDirty = true;
        }
    };

gmgps.cloud.ui.views.accountSettings.prototype.checkExchangeCredentials =
    function (thisDialog) {
        var me = this;

        if (!me.validateExchangeCredentialsForm(thisDialog)) {
            return false;
        }

        new gmgps.cloud.http("accountSettings-checkExchangeCredentials").ajax(
            {
                args: {},
                dataType: 'json',
                complex: true,
                type: 'post',
                url: '/AccountSettings/ValidateExchangeCredentials'
            },
            function (result) {
                if (result.Data && result.Data.Succeeded) {
                    showDialog({
                        type: 'info',
                        title: 'Check Exchange Settings',
                        msg: 'Connected to Exchange server successfully',
                        buttons: {
                            OK: function () {
                                $(this).dialog('close');
                                shell.notificationTray.show();
                                return false;
                            }
                        }
                    });
                } else {
                    showDialog({
                        type: 'warning',
                        title: 'Check Exchange Settings',
                        msg:
                            'Unable to validate Exchange settings: ' +
                            result.Data.Errors[0],
                        buttons: {
                            OK: function () {
                                $(this).dialog('close');
                                return false;
                            }
                        }
                    });
                }
            }
        );

        return false;
    };

gmgps.cloud.ui.views.accountSettings.prototype.changeExchangeCredentials =
    function (thisDialog, e, hasPasswordChanged) {
        var me = this;

        if (
            !me.validateExchangeCredentialsForm(
                thisDialog,
                e,
                hasPasswordChanged
            )
        ) {
            return false;
        }

        new gmgps.cloud.http("accountSettings-changeExchangeCredentials").ajax(
            {
                args: {
                    userName: me.userName,
                    isAutodiscoverEnabled: me.isAutodiscoverEnabled,
                    serverUrl: me.serverUrl,
                    password: hasPasswordChanged ? me.password : null,
                    confirmPassword: hasPasswordChanged
                        ? me.confirmPassword
                        : null,
                    hasPasswordChanged: hasPasswordChanged
                },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/AccountSettings/ChangeExchangeCredentials'
            },
            function (httpResult) {
                if (httpResult.Data && httpResult.Data.Succeeded) {
                    shell.notificationTray.show();

                    showDialog({
                        type: 'info',
                        title: 'Save Exchange Settings',
                        msg: 'Settings updated successfully',
                        buttons: {
                            OK: function () {
                                $(this).dialog('close');
                                return false;
                            }
                        }
                    });
                } else {
                    showDialog({
                        type: 'warning',
                        title: 'Save Exchange Settings',
                        msg:
                            'Unable to update Exchange settings: ' +
                            httpResult.Data.Errors[0],
                        buttons: {
                            OK: function () {
                                $(this).dialog('close');
                                return false;
                            }
                        }
                    });
                }
            }
        );

        return true;
    };

gmgps.cloud.ui.views.accountSettings.prototype.deleteExchangeCredentials = function (thisDialog) {
        new gmgps.cloud.http("accountSettings-deleteExchangeCredentials").ajax(
            {
                args: {},
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/AccountSettings/DeleteExchangeCredentials '
            },
            function (httpResult) {
                if (httpResult.Data && httpResult.Data.Succeeded) {
                    showDialog({
                        type: 'info',
                        title: 'Delete Exchange Settings',
                        msg: 'Exchange profile deleted',
                        buttons: {
                            OK: function () {
                                $(this).dialog('close');

                                var settingsDialog = thisDialog.$dialogRoot;

                                settingsDialog.find('#userName').val('');
                                settingsDialog.find('#newPassword').val('');
                                settingsDialog.find('#confirmPassword').val('');
                                settingsDialog.find('#serverUrl').val('');
                                settingsDialog
                                    .find('#isAutodiscoverEnabled')
                                    .removeClass('on');

                                shell.notificationTray.hide();

                                return false;
                            }
                        }
                    });
                } else {
                    showDialog({
                        type: 'warning',
                        title: 'Delete Exchange Settings',
                        msg:
                            'Unable to delete Exchange profile: ' +
                            httpResult.Data.Errors[0],
                        buttons: {
                            OK: function () {
                                $(this).dialog('close');
                                return false;
                            }
                        }
                    });
                }
            }
        );

        return true;
    };
