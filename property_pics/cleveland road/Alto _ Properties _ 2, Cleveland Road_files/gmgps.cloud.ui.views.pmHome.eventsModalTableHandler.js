gmgps.cloud.ui.views.eventsModalTableHandler = function (initValues) {
    var me = this;
    me.table = $('#PMHomeLoadedTable').bootstrapTable();
    me.$statusFilter = $('#StatusesFilter');
    me.$startDateFilter = $('#EventsStartDateFilter');
    me.$endDateFilter = $('#EventsEndDateFilter');
    me.$tenancyOrPropertyStatusFilter = $(
        '#EventsTenancyOrPropertyStatusesFilter'
    );
    me.$eventsStatusesFilter = $('#EventsStatusesFilter');
    me.$managementTypeFilter = $('#ManagementTypeFilter');
    me.$branchFilter = $('#EventsBranchIdsFilter');
    me.$propertyManagerFilter = $('#EventsPropertyManagerIdsFilter');
    me.$tenantEmailStatusFilter = $('#TenantEmailStatusFilter');
    me.$landlordEmailStatusFilter = $('#LandlordEmailStatusFilter');
    me.$supplierEmailStatusFilter = $('#SupplierEmailStatusFilter');

    me.allValue = '0';
    me.statusValues = [];
    me.tenancyOrPropertyStatusValues = [];
    me.eventStatusValues = [];
    me.managementTypeValues = [];
    me.branchValues = [];
    me.propertyManagerValues = [];
    me.tenantEmailStatusValues = [];
    me.landlordEmailStatusValues = [];
    me.supplierEmailStatusValues = [];
    return me.init(initValues);
};

gmgps.cloud.ui.views.eventsModalTableHandler.prototype = {
    init: function (initValues) {
        const me = this;
        me.table = $('#PMHomeLoadedTable').bootstrapTable();

        $('#date-event-filters .selectpicker').selectpicker({
            style: 'bg-blue fg-white',
            'live-search': true
        });

        $('input.date-picker').datepicker({
            dateFormat: 'dd/mm/yy'
        });

        me.$startDateFilter.change(function () {
            var startDateValue = me.$startDateFilter.val();
            me.$endDateFilter.datepicker(
                'option',
                'minDate',
                Date.parse(startDateValue)
            );
        });

        $('#EventsPropertyManagerIdsFilter, #EventsBranchIdsFilter, #StatusesFilter, #EventsTenancyOrPropertyStatusesFilter, ' +
            '#EventsStatusesFilter, #ManagementTypeFilter, #EventsStartDateFilter, #EventsEndDateFilter, ' +
            '#TenantEmailStatusFilter, #LandlordEmailStatusFilter, #SupplierEmailStatusFilter').change(function () {
                me.statusValues = handleDropdownSelection(me.$statusFilter, me.statusValues);
                me.tenancyOrPropertyStatusValues = handleDropdownSelection(me.$tenancyOrPropertyStatusFilter, me.tenancyOrPropertyStatusValues);
                me.eventStatusValues = handleDropdownSelection(me.$eventsStatusesFilter, me.eventStatusValues);
                me.managementTypeValues = handleDropdownSelection(me.$managementTypeFilter, me.managementTypeValues);
                me.branchValues = handleDropdownSelection(me.$branchFilter, me.branchValues);
                me.propertyManagerValues = handleDropdownSelection(me.$propertyManagerFilter, me.propertyManagerValues)
                var startDateValue = me.$startDateFilter.val();
                var endDateValue = me.$endDateFilter.val();
                me.tenantEmailStatusValues = handleDropdownSelection(me.$tenantEmailStatusFilter, me.tenantEmailStatusValues)
                me.landlordEmailStatusValues = handleDropdownSelection(me.$landlordEmailStatusFilter, me.landlordEmailStatusValues)
                me.supplierEmailStatusValues = handleDropdownSelection(me.$supplierEmailStatusFilter, me.supplierEmailStatusValues)

                me.table.bootstrapTable('filterBy', {
                    statuses: me.statusValues,
                    tenancyOrPropertyStatuses: me.tenancyOrPropertyStatusValues,
                    eventStatuses: me.eventStatusValues,
                    managementTypes: me.managementTypeValues,
                    startDate: startDateValue,
                    endDate: endDateValue,
                    branches: me.branchValues,
                    propertyManagers: me.propertyManagerValues,
                    tenantEmailStatuses: me.tenantEmailStatusValues,
                    landlordEmailStatuses: me.landlordEmailStatusValues,
                    supplierEmailStatuses: me.supplierEmailStatusValues
                }, {
                    'filterAlgorithm': (row, filters) => {
                        if (!filters) return true;
                        return includedRowByStatuses(row, filters) &&
                            isRowIncludedByTenancyOrPropertyStatuses(row, filters) &&
                            isRowIncludedByEventStatuses(row, filters) &&
                            isRowIncludedByManagementTypes(row, filters) &&
                            isRowIncludedByStartEndDate(row, filters) &&
                            isRowIncludedByBranch(row, filters) &&
                            isRowIncludedByPropertyManager(row, filters) &&
                            isRowIncludedByTenantEmailStatus(row, filters) &&
                            isRowIncludedByLandlordEmailStatus(row, filters) &&
                            isRowIncludedBySupplierEmailStatus(row, filters);
                    }
                })
                updateRowCount();
                disableSendEmail();
            })

        $('table').on('search.bs.table', function () {
            updateRowCount();
            disableSendEmail();
        })

        const includedRow = () => true;
        const notIncludedRow = () => false;

        function includedRowByStatuses(row, filters) {
            const statusIsIncludedInTheRow = (status) =>
                row.status.toLowerCase().includes(status.toLowerCase());

            if (
                filters.statuses.length === 1 &&
                filters.statuses[0] === me.allValue
            )
                return includedRow();
            if (filters.statuses.length && row.status) {
                return filters.statuses.some(statusIsIncludedInTheRow)
                    ? includedRow()
                    : notIncludedRow();
            }
            return includedRow();
        }

        function isRowIncludedByTenancyOrPropertyStatuses(row, filters) {
            const statusIsIncludedInTheRow = (status) =>
                row.tenancyOrPropertyStatus.toLowerCase() ===
                status.toLowerCase();

            if (
                filters.tenancyOrPropertyStatuses.length === 1 &&
                filters.tenancyOrPropertyStatuses[0] === me.allValue
            )
                return includedRow();
            if (
                filters.tenancyOrPropertyStatuses.length &&
                row.tenancyOrPropertyStatus
            ) {
                return filters.tenancyOrPropertyStatuses.some(
                    statusIsIncludedInTheRow
                )
                    ? includedRow()
                    : notIncludedRow();
            }
            return includedRow();
        }

        function isRowIncludedByEventStatuses(row, filters) {
            const statusIsIncludedInTheRow = (status) =>
                row.eventStatus.toLowerCase() === status.toLowerCase();

            if (
                filters.eventStatuses.length === 1 &&
                filters.eventStatuses[0] === me.allValue
            )
                return includedRow();
            if (filters.eventStatuses.length && row.eventStatus) {
                return filters.eventStatuses.some(statusIsIncludedInTheRow)
                    ? includedRow()
                    : notIncludedRow();
            }
            return includedRow();
        }

        function isRowIncludedByManagementTypes(row, filters) {
            const managementTypeIsIncludedInTheRow = (managementType) =>
                row.managementType.toLowerCase() ===
                managementType.toLowerCase();

            if (
                filters.managementTypes.length === 1 &&
                filters.managementTypes[0] === me.allValue
            )
                return includedRow();
            if (filters.managementTypes.length && row.managementType) {
                return filters.managementTypes.some(
                    managementTypeIsIncludedInTheRow
                )
                    ? includedRow()
                    : notIncludedRow();
            }
            return includedRow();
        }

        function isRowIncludedByStartEndDate(row, filters) {
            if (row.dueDate) {
                var rowDate = Date.parse(row.dueDate);
                var fromDate = filters.startDate
                    ? Date.parse(filters.startDate)
                    : null;
                var toDate = filters.endDate
                    ? Date.parse(filters.endDate)
                    : null;

                const isRowDateGreaterThanStartDate = () =>
                    rowDate.getTime() >= fromDate.getTime();
                if (fromDate && !toDate) {
                    return isRowDateGreaterThanStartDate()
                        ? includedRow()
                        : notIncludedRow();
                }

                const isRowDateLowerThanEndDate = () =>
                    rowDate.getTime() <= toDate.getTime();
                if (toDate && !fromDate) {
                    return isRowDateLowerThanEndDate()
                        ? includedRow()
                        : notIncludedRow();
                }

                if (fromDate && toDate) {
                    return (
                        isRowDateGreaterThanStartDate() &&
                        isRowDateLowerThanEndDate()
                    );
                }
            }

            return includedRow();
        }

        function isRowIncludedByBranch(row, filters) {
            const rowBranchId = row._branch_data.value;
            const branchIsIncludedInTheRow = (branch) =>
                rowBranchId === parseInt(branch);
            if (
                filters.branches.length === 1 &&
                filters.branches[0] === me.allValue
            )
                return includedRow();
            if (filters.branches.length && rowBranchId) {
                return filters.branches.some(branchIsIncludedInTheRow)
                    ? includedRow()
                    : notIncludedRow();
            }
            return includedRow();
        }

        function isRowIncludedByPropertyManager(row, filters) {
            const rowPropertyManagerId =
                row._propertyManager_data && row._propertyManager_data.value;
            const propertyManagerIsIncludedInTheRow = (propertyManager) =>
                rowPropertyManagerId === parseInt(propertyManager);
            if (
                filters.propertyManagers?.length === 1 &&
                filters.propertyManagers[0] === me.allValue
            )
                return includedRow();
            if (filters.propertyManagers?.length && rowPropertyManagerId) {
                return filters.propertyManagers.some(
                    propertyManagerIsIncludedInTheRow
                )
                    ? includedRow()
                    : notIncludedRow();
            }
            return includedRow();
        }

        function isRowIncludedByTenantEmailStatus(row, filters) {
            const tenantEmailStatusIsIncludedInTheRow = (status) =>
                row.tenantEmailStatus
                    .toLowerCase()
                    .includes(status.toLowerCase());

            if (
                filters.tenantEmailStatuses?.length === 1 &&
                filters.tenantEmailStatuses[0] === me.allValue
            )
                return includedRow();
            if (filters.tenantEmailStatuses?.length && row.tenantEmailStatus) {
                return filters.tenantEmailStatuses.some(
                    tenantEmailStatusIsIncludedInTheRow
                )
                    ? includedRow()
                    : notIncludedRow();
            }
            return includedRow();
        }

        function isRowIncludedByLandlordEmailStatus(row, filters) {
            const landlordEmailStatusIsIncludedInTheRow = (status) =>
                row.landlordEmailStatus
                    .toLowerCase()
                    .includes(status.toLowerCase());

            if (
                filters.landlordEmailStatuses?.length === 1 &&
                filters.landlordEmailStatuses[0] === me.allValue
            )
                return includedRow();
            if (
                filters.landlordEmailStatuses?.length &&
                row.landlordEmailStatus
            ) {
                return filters.landlordEmailStatuses.some(
                    landlordEmailStatusIsIncludedInTheRow
                )
                    ? includedRow()
                    : notIncludedRow();
            }
            return includedRow();
        }

        function isRowIncludedBySupplierEmailStatus(row, filters) {
            const supplierEmailStatusIsIncludedInTheRow = (status) =>
                row.supplierEmailStatus
                    .toLowerCase()
                    .includes(status.toLowerCase());

            if (
                filters.supplierEmailStatuses?.length === 1 &&
                filters.supplierEmailStatuses[0] === me.allValue
            )
                return includedRow();
            if (
                filters.supplierEmailStatuses?.length &&
                row.supplierEmailStatus
            ) {
                return filters.supplierEmailStatuses.some(
                    supplierEmailStatusIsIncludedInTheRow
                )
                    ? includedRow()
                    : notIncludedRow();
            }
            return includedRow();
        }

        function handleDropdownSelection(selector, selectedValue) {
            var selectedOptions = $(selector).val();
            var all = $(selector).find('option:first');
            const isAllPreviouslySelected =
                selectedOptions?.length === 1 &&
                selectedOptions[0] === me.allValue;
            const isAllSelected =
                all.is(':selected') && selectedValue.length > 0;
            if (isAllPreviouslySelected || isAllSelected) {
                var allText = all.html();
                $(selector).val([me.allValue]);
                $(selector)
                    .next()
                    .find('ul.dropdown-menu > li')
                    .removeClass('selected');
                $(selector)
                    .next()
                    .find('ul.dropdown-menu > li:first')
                    .addClass('selected');
                all.prop('selected', true);
                $(selector).next().find('span.filter-option').html(allText);
            } else {
                $(selector)
                    .next()
                    .find('ul.dropdown-menu > li:first')
                    .removeClass('selected');
                all.prop('selected', false);
                $(selector).selectpicker('refresh');
            }

            return all.is(':selected') ? [] : $(selector).val();
        }

        function updateRowCount() {
            var itemCount = me.table.bootstrapTable('getData').length;
            var eventTitle = $('#eventTitle').text();
            $('#modal-row').find('.widget-caption').text('Date Events (' + eventTitle + ') : ' + itemCount + ' items');
        }

        function disableSendEmail() {
            if (me.table.bootstrapTable('getData').length == 0) {
                $('.table-options-container').find(".batch-email-btn").addClass("disabled");
            }
            else {
                $('.table-options-container').find(".batch-email-btn").removeClass("disabled");
            }
        }

        if (initValues) {
            if (initValues.sortName && initValues.sortOrder) {
                me.table.bootstrapTable('refreshOptions', {
                    sortName: initValues.sortName,
                    sortOrder: initValues.sortOrder
                });
            }

            if (initValues.statusFilter && me.$statusFilter.length) {
                me.$statusFilter.val(initValues.statusFilter).change();
            }

            if (initValues.startDateFilter && me.$startDateFilter.length) {
                me.$startDateFilter.val(initValues.startDateFilter).change();
            }

            if (initValues.endDateFilter && me.$endDateFilter.length) {
                me.$endDateFilter.val(initValues.endDateFilter).change();
            }

            if (initValues.tenancyOrPropertyStatusFilter && me.$tenancyOrPropertyStatusFilter.length) {
                me.$tenancyOrPropertyStatusFilter.val(initValues.tenancyOrPropertyStatusFilter).change();
            }

            if (initValues.eventsStatusesFilter && me.$eventsStatusesFilter.length) {
                me.$eventsStatusesFilter.val(initValues.eventsStatusesFilter).change();
            }

            if (initValues.managementTypeFilter && me.$managementTypeFilter.length) {
                me.$managementTypeFilter.val(initValues.managementTypeFilter).change();
            }

            if (initValues.branchFilter && me.$branchFilter.length) {
                me.$branchFilter.val(initValues.branchFilter).change();
            }

            if (initValues.propertyManagerFilter && me.$propertyManagerFilter.length) {
                me.$propertyManagerFilter.val(initValues.propertyManagerFilter).change();
            }

            if (initValues.tenantEmailStatusFilter && me.$tenantEmailStatusFilter.length) {
                me.$tenantEmailStatusFilter.val(initValues.tenantEmailStatusFilter).change();
            }

            if (initValues.landlordEmailStatusFilter && me.$landlordEmailStatusFilter.length) {
                me.$landlordEmailStatusFilter.val(initValues.landlordEmailStatusFilter).change();
            }

            if (initValues.supplierEmailStatusFilter && me.$supplierEmailStatusFilter.length) {
                me.$supplierEmailStatusFilter.val(initValues.supplierEmailStatusFilter).change();
            }

            if (initValues.showFilters) {
                $('#date-event-filters').collapse('toggle');
            }
        }
    }
};
