'use strict';

gmgps.cloud.services.ViewingEnquiriesCommandApi = function (api) {
    var _api = api || new gmgps.cloud.services.ApiService();

    this.decline = function (viewingEnquiryId) {
        var $p = _api.post.bind({componentName: "ViewingEnquiriesCommandApi-decline"});
        return $p('ViewingEnquiries', 'Decline', viewingEnquiryId);
    };

    this.accept = function (
        viewingEnquiryIds,
        userId,
        viewingEnquiryIdsToSkipDuplicateContactCheckFor
    ) {
        var $p = _api.post.bind({componentName: "ViewingEnquiriesCommandApi-accept"});
        return $p('ViewingEnquiries', 'Accept', {
            viewingEnquiryIds: viewingEnquiryIds,
            viewingEnquiryIdsToSkipDuplicateContactCheckFor:
                viewingEnquiryIdsToSkipDuplicateContactCheckFor,
            userId: userId
        });
    };

    this.merge = function (viewingEnquiryId, contactId) {
        var $p = _api.post.bind({componentName: "ViewingEnquiriesCommandApi-merge"});
        return $p('ViewingEnquiries', 'Merge', {
            viewingEnquiryId: viewingEnquiryId,
            contactId: contactId
        });
    };

    return this;
};
