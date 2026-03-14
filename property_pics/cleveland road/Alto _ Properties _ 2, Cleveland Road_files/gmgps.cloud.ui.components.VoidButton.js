gmgps.cloud.ui.components.VoidButton = function (element, model) {
    var voidBtn = element;
    var signingRequestId = model.signingRequestId;

    this.api = new gmgps.cloud.services.EsignaturesCommandApi();

    this.void = function (onVoided) {
        var component = this;

        showDialog({
            type: 'question',
            title: 'Reason for voiding',
            dialogClass: '',
            msg:
                '<div><label>' +
                'Please provide a reason for voiding. This text will be sent to all signatories.' +
                '<textarea id="voiding-reason" class="countable" rows="3" cols="100" style="width: 100%; height: 100px; padding: 5px; "></textarea></label></div>' +
                '<div class="textarea-counter"></div>',
            create: function (event) {
                var $el = $(event.target);

                var counter = new gmgps.cloud.ui.controls.CharacterCounter(
                    255,
                    true
                );
                counter.apply($el);
            },
            buttons: {
                OK: function () {
                    var $el = $(this);

                    var reason = $el.find('#voiding-reason').val();

                    ShowAreYouSure(
                        'Void Signing Request',
                        'Are you sure you want to void this request? The text you entered will be emailed to all signatories.',
                        function () {
                            component.api
                                .void(signingRequestId, reason)
                                .then(function () {
                                    $el.dialog('close');
                                    $.jGrowl(
                                        'We have requested the voiding of your document.',
                                        {
                                            header: 'Electronic Signing',
                                            theme: 'growl-system'
                                        }
                                    );

                                    if (onVoided) {
                                        onVoided();
                                    } else {
                                        voidBtn
                                            .prop('disabled', true)
                                            .addClass('disabled');
                                    }
                                })
                                .catch(function (err) {
                                    $el.dialog('close');
                                    showInfo(err.responseJSON.ExceptionMessage);
                                    if (onVoided) {
                                        onVoided();
                                    } else {
                                        voidBtn
                                            .prop('disabled', true)
                                            .addClass('disabled');
                                    }
                                });
                        },
                        function () {
                            $el.dialog('close');
                        }
                    );
                },
                Cancel: function () {
                    var $el = $(this);
                    $el.dialog('close');
                }
            }
        });
    };

    return this;
};
