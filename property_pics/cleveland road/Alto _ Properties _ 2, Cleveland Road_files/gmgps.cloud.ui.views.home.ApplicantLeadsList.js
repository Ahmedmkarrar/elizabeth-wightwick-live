gmgps.cloud.ui.views.home.ApplicantLeadsList = function (args) {
    this.$root = args.$root;
    this.leadSearches = [];
    // eslint-disable-next-line no-undef
    this.dashboard = dashboard;
    this.branchId = args.branchId;
    this.userId = args.userId || shell.userId;
    this.leadsController = {};
};

gmgps.cloud.ui.views.home.ApplicantLeadsList.typeName =
    'gmgps.cloud.ui.views.home.ApplicantLeadsList';

gmgps.cloud.ui.views.home.ApplicantLeadsList.prototype = {
    activate: function () {
        var me = this;

        var args = {
            $root: this.$root.find('#home\\/enquiries\\/leads .list-container'),
            BranchIds: [this.branchId],
            DateFilter: me.dateFilter,
            BeforeOrAfterDate: me.beforeOrAfterDate,
            DuplicateFilter: me.duplicateFilter,
            $leadsTab: me.$root
        };

        me.leadsController = new gmgps.cloud.ui.views.tools.leads(args);
        me.leadsController.loadView().then(function () {
            var total = me.leadsController.list.totalRows;
            me.refreshTotal(total, C.LeadType.PortalLead);
        });
    },

    refresh: function () {
        var me = this;
        me.leadsController.branchId = me.branchId;
        me.leadsController.dateFilter = me.dateFilter;
        me.leadsController.beforeOrAfterDate = me.beforeOrAfterDate;
        me.leadsController.duplicateFilter = me.duplicateFilter;
        me.leadsController.sourceFilters = me.sourceFilters;

        me.leadsController.refreshTable().then(function () {
            var total = me.leadsController.list.totalRows;
            me.refreshTotal(total, C.LeadType.PortalLead);
        });
    },

    refreshTotal: function (total, tabType) {
        var me = this;

        var leadsEnabledForSelectedBranch =
            me.$root.find('#IsLeadsEnabledForSelectedBranch').val() == 'True';
        var $totalRows = me.$root.find(
            '#dashboard-leads .list-totalrows[data-leadtypeid="{0}"]'.format(
                tabType
            )
        );
        var $leadOwner = me.$root.find('.lead-owner');

        if (!total && tabType === C.LeadType.MarketAppraisalEnquiry) {
            var maTotal = parseInt($totalRows[0].innerHTML);
            if (!isNaN(maTotal)) {
                total = maTotal - 1;
            }
        }

        if (!leadsEnabledForSelectedBranch) {
            var message =
                'Portal Applicant Enquiries not enabled for ' +
                (me.branchId !== 0 ? 'the selected branch' : 'any branches');
            var formattedMessage =
                '<div class="no-leads-data-to-display no-items-to-display"><div class="outer"><div class="icon fa fa-ban"></div><div class="message">' +
                message +
                '</div></div></div>';
            me.$root.find('div.tablex.lead').html(formattedMessage);
            $totalRows
                .addClass('nothing')
                .html('<i class="fa fa-ban fg-dark-grey"></i>');
            me.$root.find('.leads-header .btn').hide();
            me.$root.find('.leads-header .filters').hide();
            me.$root.find('.lead-owner-dialog .name').empty();
            $leadOwner.css('visibility', 'hidden');
            return;
        }

        $leadOwner.css('visibility', 'visible');

        $totalRows
            .removeClass('nothing')
            .css('display', 'inline-block')
            .removeClass('badge-info badge-danger')
            .text(total);
    }
};
