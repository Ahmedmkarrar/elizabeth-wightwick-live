gmgps.cloud.ui.views.planup = function (args) {
    var me = this;

    me.$window = null;

    if (args !== undefined) {
        me.$root = args.$root;
        me.init(args);
    }

    return true;
};

gmgps.cloud.ui.views.planup.prototype = {
    init: function () {
        var me = this;

        // only accept numeric plans
        me.$root.find('#planId').numeric({ negative: false, decimal: false });

        me.$window = me.$root.closest('.window');

        me.$window
            .find('.action-button')
            .removeClass('grey')
            .addClass('disabled bgg-green');

        me.$root.find('.searchbtn').on('click', function () {
            var $btn = $(this);

            var $planid = me.$root.find('#planId');

            if ($planid.val().length === 0) {
                $planid.focus();
                showInfo('Please supply a Plan Id.');
                return;
            }

            if ($planid.val().length < 8) {
                $planid.focus();
                showInfo(
                    'A valid Plan Id contains 8 or more numbers. Please supply a valid Plan Id.',
                    undefined,
                    100
                );
                return;
            }

            me.$root.find('.results').empty();

            $btn.hide();

            me.download($planid.val(), function () {
                $btn.show();

                me.$root.find('.results').show();

                if (me.$root.find('#PlanIdExists').val() === 'True') {
                    me.$window.find('.action-button').removeClass('disabled');
                } else {
                    me.$window.find('.action-button').addClass('disabled');
                }

                me.$root
                    .find('.plancontainer .thumb, .image IMG')
                    .on('click', function () {
                        var url = $(this).data('fullimage');
                        window.open(url, '_blank');
                    });

                me.$root.find('.combine-images').on('click', function () {
                    var checked = $(this).prop('checked');

                    if (checked === true) {
                        me.$root.find('.planthumbcontainer').hide();
                        me.$root.find('.image').show();
                    } else {
                        me.$root.find('.planthumbcontainer').show();
                        me.$root.find('.image').hide();
                    }
                });

                me.$root.find('#import-rooms').on('click', function () {
                    var checked = $(this).prop('checked');
                    var $container = me.$root.find('.floorcontainer');

                    if (checked === true) {
                        $container.slideDown();
                    } else {
                        $container.slideUp();
                    }
                });
                me.$root.find('#import-floorplans').on('click', function () {
                    var checked = $(this).prop('checked');
                    var $container = me.$root.find('.plancontainer');
                    var $combiner = me.$root.find('.combinecontainer');

                    if (checked === true) {
                        $container.slideDown();
                        $combiner.show();
                    } else {
                        $container.slideUp();
                        $combiner.hide();
                    }
                });
                me.$root
                    .find('.floorcontainer table .select-all')
                    .on('click', function () {
                        var $this = $(this);
                        var checked = $this.prop('checked');
                        $(this)
                            .closest('table')
                            .find('.select-room input')
                            .prop('checked', checked)
                            .trigger('prog-change');
                    });
            });
        });
    },

    action: function (onComplete) {
        var me = this;

        if (
            me.$root.find('#import-rooms').prop('checked') === false &&
            me.$root.find('#import-floorplans').prop('checked') === false
        ) {
            showInfo('There is nothing selected to import');
            return;
        }

        new gmgps.cloud.http("planup-action").postForm(
            me.createForm(),
            function () {
                onComplete(false);
            }
        );
    },

    createForm: function () {
        var me = this;

        var $form = $('<form action="PlanUp/ImportPlan"></form>');

        var propertyId = me.$root.find('#PropertyId').val();

        $('<input>')
            .attr({
                type: 'hidden',
                name: 'PropertyId',
                value: propertyId
            })
            .appendTo($form);

        var planId = me.$root.find('#planId').val();

        $('<input>')
            .attr({
                type: 'hidden',
                name: 'PlanId',
                value: planId
            })
            .appendTo($form);

        if (me.$root.find('#import-rooms').prop('checked') === true) {
            var $selectedRooms = me.$root.find(
                '.floorcontainer .select-room.ticked'
            );

            $selectedRooms.each(function (i, v) {
                var name = $(v).closest('tr').find('#Name').val();
                var desc = $(v).closest('tr').find('#Description').val();
                var sizeMetric = $(v).closest('tr').find('#SizeMetric').val();
                var sizeImperial = $(v)
                    .closest('tr')
                    .find('#SizeImperial')
                    .val();
                var sizeMixed = $(v).closest('tr').find('#SizeMixed').val();
                var orderIndex = $(v).closest('tr').find('#OrderIndex').val();

                $('<input>')
                    .attr({
                        type: 'hidden',
                        name: 'Rooms[' + i + '].Name',
                        value: name
                    })
                    .appendTo($form);

                $('<input>')
                    .attr({
                        type: 'hidden',
                        name: 'Rooms[' + i + '].Description',
                        value: desc
                    })
                    .appendTo($form);

                $('<input>')
                    .attr({
                        type: 'hidden',
                        name: 'Rooms[' + i + '].SizeImperial',
                        value: sizeImperial
                    })
                    .appendTo($form);

                $('<input>')
                    .attr({
                        type: 'hidden',
                        name: 'Rooms[' + i + '].SizeMixed',
                        value: sizeMixed
                    })
                    .appendTo($form);

                $('<input>')
                    .attr({
                        type: 'hidden',
                        name: 'Rooms[' + i + '].SizeMetric',
                        value: sizeMetric
                    })
                    .appendTo($form);

                $('<input>')
                    .attr({
                        type: 'hidden',
                        name: 'Rooms[' + i + '].OrderIndex',
                        value: orderIndex
                    })
                    .appendTo($form);

                $('<input>')
                    .attr({
                        type: 'hidden',
                        name: 'Rooms[' + i + '].PropertyId',
                        value: propertyId
                    })
                    .appendTo($form);

                $('<input>')
                    .attr({
                        type: 'hidden',
                        name: 'Rooms[' + i + '].RecordType',
                        value: C.RoomRecordType.Room
                    })
                    .appendTo($form);
            });
        }

        if (me.$root.find('#import-floorplans').prop('checked') === true) {
            if (me.$root.find('.combine-images').prop('checked') === true) {
                $('<input>')
                    .attr({
                        type: 'hidden',
                        name: 'IsCombinedFloorPlan',
                        value: true
                    })
                    .appendTo($form);
            } else {
                var $selectedPlans = me.$root.find(
                    '.plancontainer .select-plan[checked="checked"]'
                );
                var idx = 0;

                $selectedPlans.each(function (i, v) {
                    if ($(v).prop('checked') === true) {
                        var floorNo = $(v)
                            .closest('.plan-image')
                            .find('img')
                            .attr('data-floor');
                        var floorName = $(v)
                            .closest('.plan-image')
                            .find('#FloorName')
                            .val();

                        $('<input>')
                            .attr({
                                type: 'hidden',
                                name: 'Floorplans[' + idx + '].Key',
                                value: floorNo
                            })
                            .appendTo($form);

                        $('<input>')
                            .attr({
                                type: 'hidden',
                                name: 'Floorplans[' + idx + '].Value',
                                value: floorName
                            })
                            .appendTo($form);

                        idx++;
                    }
                });
            }
        }

        return $form;
    },

    download: function (planId, onComplete) {
        var me = this;

        me.$root.find('.downloading').show();

        new gmgps.cloud.http("planup-download").ajax(
            {
                args: {
                    planId: planId
                },
                dataType: 'json',
                complex: true,
                type: 'post',
                url: 'PlanUp/GetPlan'
            },
            function (response) {
                // success
                me.$root.find('.downloading').hide();
                me.$root.find('.results').clear().html(response.Data);
                onComplete();
            },
            function () {
                // failure
                me.$root.find('.downloading').hide();
                onComplete();
            }
        );
    }
};
