gmgps.cloud.helpers.viewing = {
    refreshReviewNotes: function (id, $viewingForm) {
        new gmgps.cloud.http("viewing-refreshReviewNotes").ajax(
            {
                args: {
                    id: id
                },
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/Viewing/GetViewingNotes'
            },
            function (r) {
                if (r && r.Data) {
                    $viewingForm
                        .find('#Viewing_VersionNumber')
                        .val(r.Data.versionNumber);
                    $viewingForm
                        .find('#Viewing_ViewingVersionNumber')
                        .val(r.Data.viewingVersionNumber);
                    $viewingForm
                        .find('.postevent-notes')
                        .replaceWith(r.Data.postEventNotes);
                }
            }
        );
    }
};
