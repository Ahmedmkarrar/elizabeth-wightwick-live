((function() {
    'use strict';

    angular
        .module('diary.export')
        .controller('DiaryExportController', DiaryExportController);

    DiaryExportController.$inject = [
        'ApiService',
        'GrowlService',
        '$scope',
        '$timeout'
    ];

    function DiaryExportController(apiService, growlService, $scope, $timeout) {
        var diaryExport = this;

        diaryExport.enabled = false;
        diaryExport.emailDisabled = true;
        diaryExport.smsDisabled = true;
        diaryExport.copyDisabled = true;
        diaryExport.isOpened = false;

        diaryExport.exportButton = $scope.$parent.targetElement; // TODO yuck
        diaryExport.qtip = $scope.$parent.tip;
        diaryExport.error = null;
        diaryExport.user = {
            mobileNumber: '',
            emailAddress: '',
            hasMobile: function () {
                return this.mobileNumber.length > 0;
            },
            hasEmailAddress: function () {
                return this.emailAddress.length > 0;
            }
        };

        function updateUiState() {
            if (diaryExport.enabled) {
                diaryExport.exportButton.addClass('activated');
            } else {
                diaryExport.exportButton.removeClass('activated');
            }

            diaryExport.copyDisabled = !diaryExport.enabled;
            diaryExport.emailDisabled =
                !diaryExport.user.hasEmailAddress() || !diaryExport.enabled;
            diaryExport.smsDisabled =
                !diaryExport.user.hasMobile() || !diaryExport.enabled;
        }

        function updateLocalStateFromServer(viewmodel) {
            diaryExport.error = null;

            if (viewmodel != null) {
                diaryExport.url = viewmodel.Url;
            } else {
                diaryExport.url = null;
            }

            diaryExport.enabled =
                diaryExport.url != null && diaryExport.url.length > 0;

            updateUiState();
        }

        function showError(ex, action) {
            if (ex.status == 403) {
                diaryExport.error = 'You do not have permission to ' + action;
            } else {
                diaryExport.error = ex.data.ExceptionMessage;
            }

            $timeout(function () {
                diaryExport.error = null;
            }, 2000);
        }

        var $g = apiService
            .get.bind({componentName: 'DiaryExportController-diaryExport'});

        $g('userdiary', 'settings')
            .then(updateLocalStateFromServer);

        $g('userdiary', 'contactdetails').then(function (data) {
            diaryExport.user.mobileNumber = data.mobileNumber;
            diaryExport.user.emailAddress = data.emailAddress;
            updateUiState();
        });

        diaryExport.exportButton.on('click', function () {
            if (!diaryExport.isOpened) {
                diaryExport.isOpened = true;
                googleAnalytics.sendEvent(
                    'diaries',
                    'button_click',
                    'diary_export - Open'
                );
            }
        });

        diaryExport.close = function () {
            diaryExport.isOpened = false;

            diaryExport.exportButton.qtip('hide');

            googleAnalytics.sendEvent(
                'diaries',
                'button_click',
                'diary_export - Close'
            );
        };

        diaryExport.copy = function () {
            var urlBox = document.getElementById('diary-export-url');

            var textarea = angular.element('<textarea/>');
            textarea.css({
                position: 'fixed',
                opacity: '0'
            });
            textarea.val(urlBox.innerText);

            var body = angular.element(document.body);
            body.append(textarea);
            textarea[0].select();
            var copied = document.execCommand('copy');
            textarea.remove();

            if (copied) {
                growlService.growl({
                    title: 'Clipboard',
                    message: 'Diary URL copied to clipboard'
                });
            } else {
                growlService.growl({
                    title: 'Clipboard',
                    message: 'Diary URL not copied to clipboard'
                });
            }

            googleAnalytics.sendEvent('diaries', 'button_click', 'copy_link');
        };

        diaryExport.change = function () {
            diaryExport.error = null;
            var isEnabled = diaryExport.enabled;
            var $p = apiService.post.bind({componentName: "diaryExport-change"});

            if (isEnabled) {
                $p('userdiary', 'deactivate')
                    .then(updateLocalStateFromServer)
                    .catch(showError);
            } else {
                $p('userdiary', 'activate')
                    .then(updateLocalStateFromServer)
                    .catch(showError);
            }

            updateUiState();

            var getStatus = function (isDiaryExportEnabled) {
                return isDiaryExportEnabled ? 'False' : 'True';
            };

            googleAnalytics.sendEvent(
                'diaries',
                'change',
                'diary_export - ' + getStatus(isEnabled)
            );
        };

        diaryExport.sendSms = function () {
            var $p = apiService.post.bind({componentName: "diaryExport-sendSms"});
            $p('userdiary', 'sendsms')
                .then(function () {
                    growlService.growl({
                        title: 'SMS',
                        message: 'Your SMS has been sent'
                    });
                })
                .catch(function (ex) {
                    showError(ex, 'send SMS messages');
                });

            googleAnalytics.sendEvent('diaries', 'button_click', 'send_sms');
        };

        diaryExport.sendEmail = function () {
            var $p = apiService.post.bind({componentName: "diaryExport-sendEmail"});
            $p('userdiary', 'sendemail')
                .then(function () {
                    growlService.growl({
                        title: 'Email',
                        message: 'Your email has been sent'
                    });
                })
                .catch(function (ex) {
                    showError(ex, 'send email');
                });

            googleAnalytics.sendEvent('diaries', 'button_click', 'send_email');
        };
    }
}))();
