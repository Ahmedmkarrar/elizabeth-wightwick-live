gmgps.cloud.queries.property = {
    applicantDoesNotHaveExistingOffer: function (args) {
        var deferred = Q.defer();

        new gmgps.cloud.http("property-applicantDoesNotHaveExistingOffer").ajax(
            {
                args: args,
                complex: true,
                dataType: 'json',
                type: 'post',
                url: '/offer/getlatestoffer'
            },
            function (response) {
                if (!response.Data) {
                    deferred.resolve(true);
                } else {
                    var d = response.Data;
                    var msg = `The applicant has an offer dated ${d.EffectiveDate} for ${d.Amount} with a status of ${d.Status}.`;

                    showDialog({
                        type: 'warning',
                        title: 'Existing Offer Found',
                        msg: msg,

                        buttons: {
                            Continue: function () {
                                $(this).dialog('close');
                                deferred.resolve(true);
                            },
                            Cancel: function () {
                                $(this).dialog('close');
                                deferred.reject();
                            }
                        }
                    });
                }
            }
        );

        return deferred.promise;
    }
};
