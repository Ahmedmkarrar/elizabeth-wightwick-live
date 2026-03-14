gmgps.cloud.ui.controls.CalendarCollection = function () {
    var me = this;
    me.calendarViews = [];
    me.loaded = false;
    me.calendars = [];
};
gmgps.cloud.ui.controls.CalendarCollection.typeName =
    'gmgps.cloud.ui.controls.CalendarCollection';

gmgps.cloud.ui.controls.CalendarCollection.prototype = {
    push: function (cal) {
        var me = this;
        me.calendars.push(cal);
    },

    getCalendarViews: function () {
        var me = this;
        if (!me.loaded) {
            var slotScrollers = $('div.slot-scroller');
            slotScrollers.each(function (ix, el) {
                var $el = $(el);
                var v = {
                    container: $el.find('> div > div'),
                    calendar: me.calendars[ix],
                    left: $el.position().left,
                    right: $el.position().left + $el.width(),
                    contains: function (position) {
                        return (
                            position.left >= v.left && position.left <= v.right
                        );
                    }
                };
                me.calendarViews.push(v);
            });
            me.loaded = true;
        }

        return me.calendarViews;
    },

    beginTransfer: function (movingElement, dragHelper) {
        var calendarScrollers = $('div.slot-scroller');
        var sampleCalendarScroller = calendarScrollers.filter(':first');

        var configureDraggable = function (gridColumnWidth) {
            var grid = movingElement.draggable('option', 'grid');
            movingElement
                .data('originalContainer', movingElement.parent())
                .data('originalGrid', grid)
                .data(
                    'originalRevertDuration',
                    movingElement.draggable('option', 'revertDuration')
                );

            movingElement
                .draggable('option', 'axis', false)
                .draggable('option', 'grid', [gridColumnWidth, grid[1]])
                .draggable('option', 'revertDuration', 0);

            var agenda = $('div.agenda.fc-agenda');
            var offsetFromEdgeOfAgenda =
                dragHelper.offset.left - agenda.offset().left;
            movingElement.css('left', offsetFromEdgeOfAgenda + 'px');

            var rectifyPositionOnDrag = function (event, ui) {
                var adjustedPosition =
                    ui.position.left +
                    (offsetFromEdgeOfAgenda - ui.originalPosition.left);
                if (adjustedPosition >= ui.originalPosition.left) {
                    ui.position.left = adjustedPosition;
                } else {
                    ui.position.left = ui.originalPosition.left;
                }
            };

            movingElement.on('drag.calendar', rectifyPositionOnDrag);
        };

        var createDragArea = function (sampleScroller) {
            var scrollContainer = sampleScroller.parent();

            var dragArea = $('<div class="temp dragarea"></div>');
            dragArea
                .height(sampleScroller.height())
                .width(sampleScroller.width() * calendarScrollers.length)
                .css({
                    position: 'absolute',
                    top: '0',
                    left: '0',
                    'z-index': 10
                })
                .click(function () {
                    $(this).remove();
                })
                .appendTo(scrollContainer);

            return dragArea;
        };

        configureDraggable(sampleCalendarScroller.width());

        var draggingArea = createDragArea(sampleCalendarScroller);
        draggingArea.append(movingElement);
    },

    getCalendar: function (ui) {
        var me = this;

        var calendarViews = me.getCalendarViews();

        var calendarView = null;
        $.each(calendarViews, function (ix, view) {
            if (view.contains(ui.position)) {
                calendarView = view;
            }
        });

        return calendarView
            ? {
                  calendar: calendarView.calendar,
                  container: calendarView.container
              }
            : null;
    },

    resetMovedElementAfterDragAndDrop: function ($eventElement) {
        $eventElement.draggable('option', 'axis', 'y');
        $eventElement.draggable(
            'option',
            'grid',
            $eventElement.data('originalGrid')
        );
        $eventElement.draggable(
            'option',
            'revertDuration',
            $eventElement.data('originalRevertDuration')
        );
        $eventElement.off('drag.calendar');

        $eventElement.data('originalGrid', null);
        $eventElement.data('originalContainer', null);
        $eventElement.data('originalRevertDuration', null);

        $('div.temp.dragarea').remove();
    },

    completeTransfer: function (movedElement, calendarView, ui) {
        var me = this;
        movedElement.data('handledByCompleteTransferEvent', true);
        var originalContainer = movedElement.data('originalContainer');
        var originalPosition = ui.originalPosition;

        if (calendarView != null) {
            movedElement.css('left', originalPosition.left + 'px');
            movedElement.css('top', ui.position.top + 'px');
            calendarView.container.append(movedElement);
        } else {
            movedElement.css(originalPosition);
            originalContainer.append(movedElement);
        }

        me.resetMovedElementAfterDragAndDrop(movedElement);

        return {
            revert: function () {
                originalContainer.append(movedElement);
                movedElement.css(originalPosition);
            }
        };
    },

    addCheckForUnhandledTransfer: function ($eventElement, ui) {
        var me = this;
        //adds a check after this code has finished to see if has been handled by complete transfer event - if not will revert element to prevent it getting lost elsewhere on page
        setTimeout(function () {
            if (!$eventElement.data('handledByCompleteTransferEvent')) {
                if (ui && ui.originalPosition) {
                    $eventElement.css(ui.originalPosition);
                }

                if (
                    $eventElement &&
                    $eventElement.data('originalContainer') &&
                    $eventElement.data('originalContainer').length === 1
                ) {
                    $eventElement
                        .data('originalContainer')
                        .append($eventElement);
                }

                me.resetMovedElementAfterDragAndDrop($eventElement);
            }
            $eventElement.data('handledByCompleteTransferEvent', false);
        });
    }
};
