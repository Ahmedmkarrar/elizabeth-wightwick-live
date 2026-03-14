'use strict';

gmgps.cloud.ui.views.WorkOrderSharingDialog = function (data, http) {
    var controller = this;
    controller.http =
        http ||
        new gmgps.cloud.http("WorkOrderSharingDialog-WorkOrderSharingDialog");

    var savePreferences = function (updateModel, onSuccess) {
        var request = {
            args: updateModel,
            async: true,
            complex: true,
            dataType: 'json',
            type: 'post',
            url: '/WorkOrderSharing/Preferences'
        };

        controller.http.ajax(
            request,
            function (response) {
                if (response.Data) {
                    onSuccess();
                }
            },
            function () {
                controller.view.unlockActionButton();
            }
        );
    };

    var savePreferencesCallback = data.onSave || savePreferences;

    function View() {
        var _this = this;
        var _dialog = null;
        var _window = null;
        var _tenantsList = null;

        Object.defineProperty(_this, 'dialog', {
            get() {
                return _dialog;
            },
            set(value) {
                _dialog = value;
            }
        });

        Object.defineProperty(_this, 'window', {
            get() {
                return _window;
            },
            set(value) {
                _window = value;

                _tenantsList = _window.find('#TenantNameSelector');
                _tenantsList.customSelect();
                _tenantsList.on('change', _this.tenancyChangeListener);

                _this.processTenancies();

                _window
                    .find('#SharedForLandlords')
                    .on('change', _this.landlordChangeListener);
                _window
                    .find('#SharedForTenants')
                    .on('change', _this.tenantChangeListener);
            }
        });

        Object.defineProperty(_this, 'tenancyChangeListener', {
            value: function () {
                _this.checkAndSetTenantSharing();
                _this.onStateChanged();
            },
            writable: false
        });

        Object.defineProperty(_this, 'landlordChangeListener', {
            value: function () {
                _this.onStateChanged();
            },
            writable: false
        });

        Object.defineProperty(_this, 'tenantChangeListener', {
            value: function () {
                _this.onStateChanged();
            },
            writable: false
        });

        this.getSelectedTenancy = function () {
            var target = _tenantsList;
            var id = target.val();
            return id;
        };

        this.getLandlordSharing = function () {
            var target = _window.find('#SharedForLandlords').parent();
            return target.is('.ticked');
        };

        this.getTenantSharing = function () {
            var target = _window.find('#SharedForTenants').parent();
            return target.is('.ticked');
        };

        this.onStateChanged = function () {
            this.unlockActionButton();
        };

        this.lockActionButton = function () {
            _window.find('.action-button').lock();
        };

        this.unlockActionButton = function () {
            _window.find('.action-button').unlock();
        };

        this.processTenancies = function () {
            if (
                _tenantsList.length <= 0 ||
                (_tenantsList.length > 0 && _tenantsList[0].options.length <= 0)
            ) {
                _this.disableTenancySharing();
                return;
            }

            if (
                _tenantsList.length > 0 &&
                _tenantsList[0].options.length > 0 &&
                _tenantsList[0].options.selectedIndex === 0 &&
                _tenantsList[0].options[0].value === '0'
            ) {
                _this.deselectTenancySharing();
            }
        };

        this.disableTenancySharing = function () {
            var me = this;
            me.deselectTenancySharing();
            var tenantSharing = _window.find('#SharedForTenants').parent();
            tenantSharing.lock();
        };

        this.deselectTenancySharing = function () {
            var tenantSharing = _window.find('#SharedForTenants').parent();
            tenantSharing.removeClass('ticked');
        };

        this.checkAndSetTenantSharing = function () {
            var originalSelectedTenancyId = _window
                .find('#SelectedTenancyId')
                .val();
            var newlySelectedTenancyId = _this.getSelectedTenancy();
            if (
                originalSelectedTenancyId === '0' ||
                originalSelectedTenancyId !== newlySelectedTenancyId
            ) {
                var target = _window.find('#SharedForTenants').parent();

                if (newlySelectedTenancyId !== '0') {
                    target.addClass('ticked');
                } else {
                    target.removeClass('ticked');
                }
            }
        };

        this.setSelectedTenancy = function (window, selectedTenancyId) {
            window.find('#SelectedTenancyId').val(selectedTenancyId);
            var tenantsList = window.find('#TenantNameSelector');
            if (tenantsList && tenantsList[0] && selectedTenancyId) {
                tenantsList.val(selectedTenancyId);
                for (
                    var counter = 0;
                    counter < tenantsList[0].options.length;
                    counter++
                ) {
                    var currentOption = tenantsList[0].options[counter];
                    if (currentOption.value === selectedTenancyId) {
                        currentOption.selected = true;
                    } else {
                        currentOption.selected = false;
                    }
                }
            }
        };

        this.setSharingSelections = function (window, updatedModel) {
            var tenantTarget = window.find('#SharedForTenants').parent();
            var landlordTarget = window.find('#SharedForLandlords').parent();

            if (updatedModel.sharedForTenants) {
                tenantTarget.addClass('ticked');
            } else {
                tenantTarget.removeClass('ticked');
            }

            if (updatedModel.sharedForLandlords) {
                landlordTarget.addClass('ticked');
            } else {
                landlordTarget.removeClass('ticked');
            }
        };
    }

    this.view = new View();

    this.open = function () {
        controller.view.dialog = new gmgps.cloud.ui.controls.window({
            http: this.http,
            title: 'PropertyFile Sharing',
            windowId: 'propertyfile-sharing',
            controller: function () {
                return controller;
            },
            url: 'WorkOrderSharing/Preferences',
            urlArgs: { workOrderId: data.id, propertyId: data.propertyId },
            post: false,
            width: 500,
            draggable: true,
            modal: true,
            actionButton: 'Save',
            cancelButton: 'Close',
            postActionCallback: function () {
                if (data.onSuccess) {
                    data.onSuccess(controller.view.getSelectedTenancy());
                }
            },
            onBeforeDisplay: function ($window, next) {
                if (data.updatedModel) {
                    controller.view.setSelectedTenancy(
                        $window,
                        data.updatedModel.selectedTenancyId
                    );
                    controller.view.setSharingSelections(
                        $window,
                        data.updatedModel
                    );
                }

                controller.view.window = $window;
                controller.view.lockActionButton();
                next();
            }
        });
    };

    this.action = function (onSuccess) {
        controller.view.lockActionButton();

        var updateModel = {
            worksOrderId: data.id,
            selectedTenancyId: controller.view.getSelectedTenancy(),
            sharedForTenants: controller.view.getTenantSharing(),
            sharedForLandlords: controller.view.getLandlordSharing()
        };

        savePreferencesCallback(updateModel, onSuccess);
    };
};
