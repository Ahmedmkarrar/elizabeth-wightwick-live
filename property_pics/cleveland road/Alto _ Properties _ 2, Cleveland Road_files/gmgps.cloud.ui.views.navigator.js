gmgps.cloud.ui.views.navigator = function (args) {
    var me = this;
    me.cfg = args;
    me.$root = args.$root;
    me.contactId = args.$root.find('#ContactId').val();
    me.recordType = args.$root.find('#RecordType').val();
    me.contactDetails = args.data.contactDetails;
    me.init(args);

    return this;
};

gmgps.cloud.ui.views.navigator.prototype = {
    //-----------------------------------------------------------------------------------------------------------------------------------------
    init: function () {
        var me = this;

        me.Carousel = $('#property-carousel').jcarousel({
            autostart: false,
            scroll: 3
        });

        me.$root.on('click', '.book-viewing', function () {
            var $activeImage = me.$root
                .find(
                    '#property-carousel .jcarousel-item .preview-image.active'
                )
                .parent();

            if ($activeImage.length === 1) {
                gmgps.cloud.helpers.property.getViewing({
                    propertyId: parseInt($activeImage.data('id')),
                    contactId: parseInt(
                        me.$root.find('#navigator #ContactId').val()
                    )
                });
            } else {
                showInfo('Please select a property first');
            }
        });

        me.$root.on('click', '.jcarousel-item-text-container', function () {
            // set active status after removing previous
            me.$root
                .find('#property-carousel .jcarousel-item .preview-image')
                .removeClass('active');
            $(this).find('.preview-image').addClass('active');

            me.loadNewContent($(this).data('id'));
        });

        me.$root.on('click', '#nav-container .thumbs-up', function () {
            // get active image
            var $activeImage = me.$root
                .find(
                    '#property-carousel .jcarousel-item .preview-image.active'
                )
                .parent();

            if ($activeImage.length == 1) {
                // hide any visible thumb images and show thumbs up

                $activeImage.find('.thumbs').hide();
                $activeImage.find('.thumbs.thumb-up-image').show();
            }
        });

        me.$root.on('click', '#nav-container .thumbs-down', function () {
            // get active image
            var $activeImage = me.$root
                .find(
                    '#property-carousel .jcarousel-item .preview-image.active'
                )
                .parent();

            if ($activeImage.length == 1) {
                // hide any visible thumb images and show thumbs up

                $activeImage.find('.thumbs').hide();
                $activeImage.find('.thumbs.thumb-down-image').show();
            }
        });

        me.$root.on('click', '#navigator .galleria-image', function () {
            Galleria.get(0).pause();
            Galleria.get(0).enterFullscreen($(this).index());
        });

        me.$root.on('click', '#navigator .show-map', function () {
            me.$root.find('#navigator .rooms').hide();
            me.$root.find('#navigator .map').show();
            me.$root.find('#navigator .show-map').hide();
            me.$root.find('#navigator .show-rooms').show();
            google.maps.event.trigger(me.GoogleMap, 'resize');
        });

        me.$root.on('click', '#navigator .show-rooms', function () {
            me.$root.find('#navigator .map').hide();
            me.$root.find('#navigator .rooms').show();
            me.$root.find('#navigator .show-map').show();
            me.$root.find('#navigator .show-rooms').hide();
        });

        me.$root.on('click', '#navigator .play-slideshow', function () {
            Galleria.get(0).enterFullscreen();
            Galleria.get(0).show(0);
            Galleria.get(0).play(5000);
        });

        //doesnt like being loaded more than once
        if (!Galleria.classic) {
            Galleria.loadTheme(
                '/scripts/jquery/plugins/galleria/themes/classic/galleria.classic.js'
            );
            Galleria.classic = true;
        }

        Galleria.run('.carousel', {
            transition: 'fadeslide',
            trueFullscreen: false,
            autoplay: 5000,
            imageCrop: true,
            imagePan: false,
            wait: true,
            initialTransition: 'fade',
            lightbox: false,
            lightboxFadeSpeed: 500,
            extend: function () {
                var gallery = this;
                //var isiPad = navigator.userAgent.match(/iPad/i) !== null;

                this.addElement('exit').appendChild('container', 'exit');

                var btn = this.$('exit')
                    .hide()
                    .text('close')
                    .click(function () {
                        gallery.exitFullscreen();
                    });

                this.bind('fullscreen_enter', function () {
                    btn.show();
                });

                this.bind('fullscreen_exit', function () {
                    btn.hide();
                    $('.galleria-container').css('position', '');
                });

                this.bind('idle_exit', function () {
                    if (this.isFullscreen()) {
                        btn.fadeIn();
                    }
                });

                this.bind('idle_enter', function () {
                    if (this.isFullscreen()) {
                        btn.fadeOut();
                    }
                });
            }
        });

        $.when(loadGoogleMaps(3, shell.googleMapsApiKey, null)).then(
            function () {
                !!google.maps; // true

                // setup initial map view on center of uk
                var latLng = new google.maps.LatLng(54.39655, -2.103882);

                var options = {
                    backgroundColor: '#E7E7E7',
                    zoom: 15,
                    center: latLng,
                    mapTypeId: google.maps.MapTypeId.ROADMAP,
                    streetViewControl: false,
                    mapTypeControl: false
                };

                me.GoogleMap = new google.maps.Map(
                    me.$root.find('.map').get(0),
                    options
                );

                var imageUrl = '/content/media/images/gui/maps/home-sales.png';
                var markerImage = new google.maps.MarkerImage(
                    imageUrl,
                    new google.maps.Size(32, 37)
                );
                me.Marker = new google.maps.Marker({
                    position: latLng,
                    icon: markerImage,
                    map: me.GoogleMap
                });

                // once maps are loaded we can get going and trigger selection of first item in jcarousel
                me.$root
                    .find('.jcarousel-item-text-container')
                    .filter(':first')
                    .trigger('click');
            }
        );
    },

    loadNewContent: function (id) {
        var me = this;
        new gmgps.cloud.http("navigator-loadNewContent").getView({
            url: 'Property/GetPropertyNavigatorImages',
            args: { id: id },
            onSuccess: function (e) {
                me.updateMapVisibility(e.Data.HasMap, e.Data.LatLong);
                Galleria.get(0).load(e.Data.Images);
                me.showPropertyDetails(
                    id,
                    e.Data.Summary,
                    e.Data.Address,
                    e.Data.Price
                );
            },
            complex: true
        });
    },

    updateMapVisibility: function (hasMap, latLng) {
        var me = this;

        // First hide map and reset button

        me.$root.find('#navigator .show-rooms').hide();
        me.$root.find('#navigator .map').hide();
        me.$root.find('#navigator .rooms').show();

        if (hasMap === true) {
            me.$root.find('#navigator .show-map').show();

            var latLong = new google.maps.LatLng(latLng.Lat, latLng.Lng);
            me.GoogleMap.setCenter(latLong);
            me.Marker.setPosition(latLong);
        } else {
            me.$root.find('#navigator .show-map').hide();
        }
    },

    showPropertyDetails: function (id, summary, address, price) {
        var me = this;
        me.$root.find('#summary-text').text(summary);

        me.$root.find('#navigator .carousel-address').text(address);
        me.$root.find('#navigator .carousel-price').text(price);

        new gmgps.cloud.http("navigator-showPropertyDetails").getView({
            url: 'Property/GetPropertyNavigatorRooms',
            args: { id: id },
            onSuccess: function (e) {
                var $details = me.$root.find('#navigator .rooms');
                $details.empty().html(e.Data);
            },
            complex: true
        });
    },

    action: function (onComplete) {
        var me = this;
        var $selectedProps = me.$root
            .find('#property-carousel .thumbs.thumb-up-image')
            .filter(':visible');
        var $selectedRejectedProps = me.$root
            .find('#property-carousel .thumbs.thumb-down-image')
            .filter(':visible');

        if ($selectedRejectedProps.length > 0) {
            $selectedRejectedProps.each(async function (i, v) {
                var propertyId = $(v).parent().data('id');
                me.contactDetails.matching.rejectAContactPropertyMatch(
                    me.contactId,
                    propertyId
                );
            });

            me.contactDetails.matching.refreshMatches();
        }

        if ($selectedProps.length > 0) {
            showDialog({
                type: 'question',
                title: 'Generate Brochure?',
                msg: 'Would you like a brochure of the selected properties?',
                buttons: {
                    Yes: function () {
                        $(this).dialog('close');

                        var ids = [];
                        $selectedProps.each(function (i, v) {
                            ids.push($(v).parent().data('id'));
                        });

                        gmgps.cloud.helpers.property.openOutputWizard({
                            settings: {
                                outputWizardMode: C.OutputWizardMode.Standard,
                                contactIds: [me.contactId],
                                propertyIds: ids
                            }
                        });
                    },
                    No: function () {
                        $(this).dialog('close');
                    }
                }
            });
        }
        onComplete();
    },

    cancel: function (onComplete) {
        onComplete();
    },

    destroy: function () {
        var me = this;
        me.Carousel.data('jcarousel').reset();
        Galleria.get(0).destroy();
        me.$root.empty().unbind();
    }
};
