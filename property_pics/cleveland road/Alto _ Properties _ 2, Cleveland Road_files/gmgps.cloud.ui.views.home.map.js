gmgps.cloud.ui.views.home.propertyMap = function (args) {
    var me = this;
    me.initialised = false;
    me.forceRefreshOnNextActivation = false;

    me.header = 'Property Map';

    me.googleMapInitialised = false;

    me.map = null;
    me.infobox = null;
    me.bounds = null;
    me.userZooming = false;
    me.userZoomLevel = 18;
    me.markers = [];
    me.markerClusters = null;

    me.$root = $('#propertymap-container');

    me.branchId = args.branchId;
    me.userId = args.userId;
    me.$mapOptionsMenu = args.$mapOptionsMenu;

    me.persistenceKey = 'home.propertyMap';

    $.when(loadGoogleMaps(3, shell.googleMapsApiKey, null)).then(function () {
        $.getScript('/Scripts/App/Views/Home/googleInfoBox.js', function () {
            me.init();
        });
    });

    me.ajaxCounter = 0;

    return this;
};

gmgps.cloud.ui.views.home.propertyMap.prototype = {
    init: function () {
        var me = this;

        //Property map > View Button
        me.$root.on('click', '.home-map-link-button', function (e) {
            e.stopPropagation();
            var id = parseInt($(this).data('id'));
            gmgps.cloud.helpers.property.editProperty({ id: id });
        });

        //Map filtering (checkboxes) > Change
        me.$mapOptionsMenu.on('click', '.opt-outer', function (e) {
            e.stopPropagation();
            $(this).toggleClass('active');
            $(this).find('.label').toggleClass('active');
            $(this)
                .find('.fa')
                .toggleClass('fa-check')
                .toggleClass('fa-remove');

            me.loadMapProperties();
        });

        $(window).on('resize', function () {
            if (me.mapActive()) {
                me.showMap();
            }
        });
    },

    activate: function () {
        var me = this;

        me.refreshAll(); //map has it's own code to decide whether to load/refresh, etc.
    },

    refreshAll: function () {
        var me = this;

        var deferred = new $.Deferred();

        me.initialised = true;
        me.lockUI(true);

        me.showMap();

        $.when(me.loadMapProperties())
            .done(function () {
                me.lockUI(false);
                deferred.resolve();
            })
            .fail(function () {
                me.lockUI(false);
            });

        return deferred.promise();
    },

    reloadMapData: function () {
        var me = this;
        me.setMapContainerHeight();
        me.loadMapProperties();
    },

    mapActive: function () {
        var me = this;
        return me.$root.css('display') == 'block' ? true : false;
    },

    getMapOptionIds: function () {
        var me = this;
        var ids = [];

        var $options = me.$mapOptionsMenu;
        var $checkedCheckboxes = $options.find('.opt-outer.active');

        $checkedCheckboxes.each(function (i, v) {
            ids.push(parseInt($(v).attr('data-filterId')));
        });

        return ids;
    },

    initGoogleMap: function () {
        var me = this;

        var $mapRoot = $('#home-map')[0];

        var mapTypeIds = [];

        mapTypeIds.push('OSM');
        mapTypeIds.push(google.maps.MapTypeId.HYBRID);

        var options = {
            backgroundColor: '#FFF',
            zoom: 5,
            center: new google.maps.LatLng(54.39655, -2.103882),
            streetViewControl: false,
            mapTypeControl: false,
            mapTypeId: 'OSM',
            fullscreenControl: false
        };

        $('#home-map').removeClass('hidden');

        me.map = new google.maps.Map($mapRoot, options);

        me.map.mapTypes.set(
            'OSM',
            new google.maps.ImageMapType({
                getTileUrl: function (coord, zoom) {
                    return (
                        'https://tile.openstreetmap.org/' +
                        zoom +
                        '/' +
                        coord.x +
                        '/' +
                        coord.y +
                        '.png'
                    );
                },
                tileSize: new google.maps.Size(256, 256),
                name: 'Street',
                maxZoom: 18
            })
        );

        me.bounds = new google.maps.LatLngBounds();

        me.infobox = new InfoBox({
            content: '',
            disableAutoPan: true,
            enableEventPropagation: true,
            maxWidth: 290,
            pixelOffset: new google.maps.Size(-140, -288),
            zIndex: null,
            boxStyle: {
                opacity: 1,
                width: '290px'
            },
            closeBoxMargin: '15px 6px 5px 5px',
            closeBoxURL: '/Content/Styles/images/close2.png',
            infoBoxClearance: new google.maps.Size(1, 1)
        });

        google.maps.event.addListener(me.map, 'zoom_changed', function () {
            var zoom = me.map.getZoom();
            if (zoom > 11) {
                if (zoom < 17) {
                    me.map.setMapTypeId('OSM');
                } else {
                    me.map.setMapTypeId(google.maps.MapTypeId.HYBRID);
                }
            } else {
                me.map.setMapTypeId(google.maps.MapTypeId.TERRAIN);
            }

            if (me.userZooming) {
                me.userZoomLevel = zoom;
            }
            me.userZooming = true;
        });

        google.maps.event.addListener(me.map, 'idle', function () {
            me.userZooming = true;
        });

        google.maps.event.addListener(me.infobox, 'closeclick', function () {
            me.userZooming = false;
            me.map.setZoom(me.userZoomLevel);
            $('#street-view').hide(0);
        });

        me.googleMapInitialised = true;
    },

    displayStreetView: function (id, position) {
        var me = this;

        new gmgps.cloud.http("map-displayStreetView").getView({
            url: '/Home/GetPropertyStreetViewValues',
            args: {
                propertyId: id
            },
            onSuccess: function (response) {
                var panorama;

                if (response.Data.LatLng.Lat) {
                    var storedPosition = new google.maps.LatLng(
                        response.Data.LatLng.Lat,
                        response.Data.LatLng.Lng
                    );

                    $('#street-view').show(0);
                    panorama = new google.maps.StreetViewPanorama(
                        document.getElementById('street-view'),
                        {
                            position: storedPosition,
                            pov: {
                                heading: response.Data.Heading,
                                pitch: response.Data.Pitch
                            }
                        }
                    );
                } else {
                    $('#street-view').show(0);
                    panorama = new google.maps.StreetViewPanorama(
                        document.getElementById('street-view'),
                        {
                            position: position,
                            pov: {
                                heading: 34,
                                pitch: 10
                            }
                        }
                    );
                }

                me.map.setStreetView(panorama);
            }
        });
    },

    processData: function (response) {
        var me = this;

        var styles = [
            {
                url: '/content/styles/images/cluster.png',
                height: 50,
                width: 50,
                anchor: [0, 0],
                textColor: '#FFF',
                textSize: 11
            }
        ];

        // Clear previously loaded markers
        if (me.markers) {
            for (var i = 0; i < me.markers.length; i++) {
                me.markers[i].setMap(null);
            }
            me.markers = [];
        } else {
            me.markers = [];
        }

        if (me.markerClusters) {
            me.markerClusters.clearMarkers();
        }

        if (response.Data.MapProperties.length > 0) {
            me.setNoDataScreen(false);
        } else {
            me.setNoDataScreen(true);
        }

        me.infobox.close();
        $('#street-view').hide(0);

        me.bounds = new google.maps.LatLngBounds();

        for (var x = 0, y = response.Data.MapProperties.length; x < y; x++) {
            var imageSalesUrl = '/content/media/images/gui/maps/home-sales.png';
            var imageRentalsUrl =
                '/content/media/images/gui/maps/home-rentals.png';

            var markerSalesImage = new google.maps.MarkerImage(
                imageSalesUrl,
                new google.maps.Size(32, 37)
            );
            var markerLettingsImage = new google.maps.MarkerImage(
                imageRentalsUrl,
                new google.maps.Size(32, 37)
            );

            var latLng = new google.maps.LatLng(
                response.Data.MapProperties[x].LatLng.Lat,
                response.Data.MapProperties[x].LatLng.Lng
            );
            var marker = new google.maps.Marker({
                position: latLng,
                icon:
                    response.Data.MapProperties[x].PropertyRecordType ==
                    C.PropertyRecordType.Sale
                        ? markerSalesImage
                        : markerLettingsImage
            });
            marker.map = me.map;

            var parkingGarage =
                response.Data.MapProperties[x].ParkingGarage > 0
                    ? response.Data.MapProperties[x].ParkingGarage
                    : 0;
            var parkingOffRoad =
                response.Data.MapProperties[x].ParkingOffRoad > 0
                    ? response.Data.MapProperties[x].ParkingOffRoad
                    : 0;
            var totalParkingSpaces = parkingGarage + parkingOffRoad;

            marker.cssColour =
                response.Data.MapProperties[x].PropertyRecordType ==
                C.PropertyRecordType.Sale
                    ? 'red'
                    : 'blue';

            marker.addressText = response.Data.MapProperties[x].AddressText;
            marker.thumbNailUrl = response.Data.MapProperties[x].MidPhotoUrl;
            marker.propertyId = response.Data.MapProperties[x].Id;

            marker.subType = response.Data.MapProperties[x].SubType;
            marker.price = response.Data.MapProperties[x].Price;
            marker.beds = response.Data.MapProperties[x].Bedrooms;
            marker.baths = response.Data.MapProperties[x].Bathrooms;
            marker.receptions = response.Data.MapProperties[x].Receptions;
            marker.parking = totalParkingSpaces;
            marker.status = response.Data.MapProperties[x].Status;

            marker.propertySummary =
                marker.price + ' - ' + marker.beds + ' Bed ' + marker.subType;

            me.markers.push(marker);
            me.bounds.extend(latLng);

            marker.addListener('click', function () {
                var currentMarker = this;
                me.userZooming = false;
                me.map.setCenter(currentMarker.position);
                me.map.setZoom(17);
                me.infobox.setContent(
                    '<div id="infobox" class="infobox"><div class="infobox-pointer"></div><div class="status {8}">{3}</div><div class="photo-cropper"><img src="{0}" class="photo" /></div><div class="summary">{1}</div><div class="addressline">{2}</div><div class="bbrline"><div class="fl icon-24 mr2 icon-white-bed"></div><div class="num">{4}</div><div class="fl icon-24 mr2 icon-white-bath"></div><div class="num">{5}</div><div class="fl icon-24 mr2 icon-white-sofa"></div><div class="num">{6}</div><div class="fl icon-24 mr2 icon-white-car"></div><div class="num">{7}</div></div><div id="homemaplinkbutton" class="home-map-link-button linkbutton {8}" data-id="{9}">View Property</div></div>'.format(
                        this.thumbNailUrl,
                        this.propertySummary,
                        this.addressText,
                        this.status,
                        this.beds,
                        this.baths,
                        this.receptions,
                        this.parking,
                        this.cssColour,
                        this.propertyId
                    )
                );
                me.infobox.open(me.map, currentMarker);
                me.displayStreetView(
                    currentMarker.propertyId,
                    currentMarker.position
                );
            });
        }

        var mcOptions = { gridSize: 50, maxZoom: 15, styles: styles };
        me.markerClusters = new MarkerClusterer(me.map, me.markers, mcOptions);

        setTimeout(function () {
            me.map.fitBounds(me.bounds);
            google.maps.event.trigger(me.map, 'resize');
        }, 300);
    },

    loadMapProperties: function () {
        var me = this;

        var deferred = new $.Deferred();

        var selectedIds = me.getMapOptionIds();
        var ajaxId = me.getAjaxCounter();

        new gmgps.cloud.http("map-loadMapProperties").getView({
            url: '/Home/GetHomeProperties',
            background: true,
            args: {
                userid: me.userId,
                branchid: me.branchId,
                propertyStatusIdList: selectedIds
            },
            onSuccess: function (response) {
                deferred.resolve();

                if (!me.googleMapInitialised) {
                    me.initGoogleMap();
                }

                if (me.ajaxCounter == ajaxId) {
                    me.processData(response);
                }
            }
        });

        return deferred.promise();
    },

    getAjaxCounter: function () {
        var me = this;
        me.ajaxCounter++;
        return me.ajaxCounter;
    },

    setNoDataScreen: function (status) {
        var $mapScreen = $('#map-no-data-screen');

        if (status) {
            $mapScreen.fadeIn(300);
        } else {
            $mapScreen.fadeOut(100);
        }
    },

    setMapContainerHeight: function () {
        var $mapContainer = $('.map-container');
        var marginForMap = 40;
        var targetMapHeght = $('.page-sidebar').height() - marginForMap;
        $mapContainer.css('height', targetMapHeght);

        var $mapScreen = $('#map-no-data-screen');
        $mapScreen.css('height', targetMapHeght);

        $('#street-view').css('height', targetMapHeght - 2);
    },

    showMap: function () {
        var me = this;

        var deferred = new $.Deferred();

        me.setMapContainerHeight();

        setTimeout(function () {
            if (me.googleMapInitialised) {
                me.map.fitBounds(me.bounds);
                google.maps.event.trigger(me.map, 'resize');
                me.infobox.close();
                $('#street-view').hide(0);

                deferred.resolve();
            }
        }, 250);

        return deferred.promise();
    },

    lockUI: function (lock) {
        glass(lock);
    }
};
