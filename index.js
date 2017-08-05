require({
    packages: [{
            name: "bootstrap",
            location: "https://esri.github.io/calcite-maps/dist/vendor/dojo-bootstrap"
      },
        {
            name: "calcite-maps",
            location: "https://esri.github.io/calcite-maps/dist/js/dojo"
      }]
}, [
      "esri/WebMap",
      "esri/views/MapView",
      "esri/widgets/BasemapGallery",
      "esri/widgets/Search",
      "esri/widgets/Legend",
      "esri/widgets/LayerList",
      "esri/widgets/Print",
      "esri/widgets/BasemapToggle",
      "esri/widgets/ScaleBar",
      "bootstrap/Collapse",
      "bootstrap/Dropdown",
      "calcite-maps/calcitemaps-v0.4",
      "dojo/domReady!"
    ], function (
    WebMap,
    MapView,
    Basemaps,
    Search,
    Legend,
    LayerList,
    Print,
    BasemapToggle,
    ScaleBar
) {

    // Map
    var map = new WebMap({
        portalItem: {
            id: "9f91f911f58540ceaac0300c55e18fbb"
        }
    });

    // View
    var mapView = new MapView({
        container: "map",
        map: map,
        padding: {
            top: 50,
            bottom: 0
        }
    });

    // Popup
    mapView.then(function () {
        mapView.popup.dockEnabled = false;
        mapView.popup.dockOptions = {
            buttonEnabled: false
        }
    });

    // Basemaps
    var basemaps = new Basemaps({
        container: "basemapGalleryDiv",
        view: mapView
    })

    // Search - add to navbar
    var searchWidget = new Search({
        container: "searchWidgetDiv",
        view: mapView
    });

    // Legend
    var legendWidget = new Legend({
        container: "legendDiv",
        view: mapView
    });

    // LayerList
    var layerWidget = new LayerList({
        container: "layersDiv",
        view: mapView
    });

    // Print
    var printWidget = new Print({
        container: "printDiv",
        view: mapView,
        printServiceUrl: "https://utility.arcgisonline.com/arcgis/rest/services/Utilities/PrintingTools/GPServer/Export%20Web%20Map%20Task"
    });

    // BasemapToggle
    var basemapToggle = new BasemapToggle({
        view: mapView,
        secondBasemap: "satellite"
    });
    mapView.ui.add(basemapToggle, "bottom-right");

    // Scalebar
    var scaleBar = new ScaleBar({
        view: mapView
    });
    mapView.ui.add(scaleBar, "bottom-left");

});

//require({
//    packages: [{
//        name: "bootstrap",
//        location: "https://esri.github.io/calcite-maps/dist/vendor/dojo-bootstrap"
//        }, {
//        name: "calcite-maps",
//        location: "https://esri.github.io/calcite-maps/dist/js/dojo"
//        }]
//}, [
//      "esri/Map",
//      "esri/views/MapView",
//      "esri/widgets/Search",
//      "esri/widgets/Popup",
//      "dojo/query",
//      "bootstrap/Collapse",
//      "bootstrap/Dropdown",
//      "calcite-maps/calcitemaps-v0.4",
//      "dojo/domReady!"
//    ], function (
//    Map,
//    MapView,
//    Search,
//    Popup,
//    query
//) {
//    // Map
//    var map = new Map({
//        basemap: "streets-navigation-vector"
//    });
//
//    // View
//    var mapView = new MapView({
//        container: "map",
//        map: map,
//        center: [-40, 40],
//        zoom: 2,
//        padding: {
//            top: 50,
//            bottom: 0
//        },
//        breakpoints: {
//            xsmall: 768,
//            small: 769,
//            medium: 992,
//            large: 1200
//        }
//    });
//
//    // Change basemaps with panel
//    query("#selectBasemapPanel").on("change", function (e) {
//        mapView.map.basemap = e.target.value;
//    });
//    
//    // Synchronize popup and Bootstrap panels
//    // Popup - dock top-right desktop, bottom for mobile
//    mapView.watch("widthBreakpoint", function (breakPoint) {
//        if (breakPoint === "medium" || breakPoint === "large" || breakPoint === "xlarge") {
//            mapView.popup.dockOptions.position = "top-right";
//        } else {
//            mapView.popup.dockOptions.position = "bottom-center";
//        }
//    });
//
//    // Popup - show/hide panels when popup is docked
//    mapView.popup.watch(["visible", "currentDockPosition"], function () {
//        var docked = mapView.popup.visible && mapView.popup.currentDockPosition;
//        if (docked) {
//            query(".calcite-panels").addClass("invisible");
//        } else {
//            query(".calcite-panels").removeClass("invisible");
//        }
//    });
//    
//    // Panels - undock popup when panel shows
//    query(".calcite-panels .panel").on("show.bs.collapse", function (e) {
//        if (mapView.popup.currentDockPosition) {
//            mapView.popup.dockEnabled = false;
//        }
//    });
//    
//    
//});
//
//



///*
//    Copyright 2017 Esri
//
//    Licensed under the Apache License, Version 2.0 (the 'License');
//    you may not use this file except in compliance with the License.
//    You may obtain a copy of the License at:
//    https://www.apache.org/licenses/LICENSE-2.0
//
//    Unless required by applicable law or agreed to in writing, software
//    distributed under the License is distributed on an 'AS IS' BASIS,
//    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
//    See the License for the specific language governing permissions and
//    limitations under the License.
//*/
//
//require(
//    {
//        packages: [{
//            name: 'app',
//            location: document.location.pathname + '/..'
//        }]
//    },
//    [
//        'app/LandsatRenderer',
//        'esri/Map',
//        'esri/Graphic',
//        'esri/geometry/ScreenPoint',
//        'esri/geometry/Extent',
//        'esri/symbols/SimpleFillSymbol',
//        'esri/views/SceneView',
//        'esri/views/3d/externalRenderers',
//        'esri/tasks/QueryTask',
//        'esri/tasks/support/Query',
//        'esri/widgets/Home',
//        'dojo/domReady!'
//    ],
//    function (
//        LandsatRenderer,
//        Map,
//        Graphic,
//        ScreenPoint,
//        Extent,
//        SimpleFillSymbol,
//        SceneView,
//        ExternalRenderers,
//        QueryTask,
//        Query,
//        Home
//    ) {
//        $(document).ready(function () {
//            // Enforce strict mode
//            'use strict';
//
//            //
//            var IMAGERY = [
//                {
//                    name: 'USGS',
//                    url: 'https://landsatlook.usgs.gov/arcgis/rest/services/LandsatLook/ImageServer',
//                    function: null,
//                    date: 'acquisitionDate',
//                    sensor: 'sensor',
//                    cloud: 'cloudCover',
//                    sun: 'sunElevation'
//                },
//                {
//                    name: 'ESRI',
//                    url: 'https://landsat2.arcgis.com/arcgis/rest/services/Landsat/PS/ImageServer',
//                    function: 'Pansharpened Natural Color',
//                    date: 'AcquisitionDate',
//                    sensor: 'SensorName',
//                    cloud: 'CloudCover',
//                    sun: 'SunElevation'
//                }
//            ];
//
//            //
//            var _start = null;
//            var _isDrawingBox = true;
//
//            // Entry point to the three.js rendering framework
//            var _landsatRenderer = null;
//
//            // Define map
//            var _view = new SceneView({
//                camera: {
//                    position: {
//                        x: -12826086,
//                        y: 4055161,
//                        z: 81190,
//                        spatialReference: {
//                            wkid: 102100
//                        }
//                    },
//                    heading: 0,
//                    tilt: 71
//                },
//                container: 'map',
//                ui: {
//                    components: [
//                        //'zoom',
//                        'compass'
//                    ]
//                },
//                map: new Map({
//                    basemap: 'satellite'
//                }),
//                environment: {
//                    lighting: {
//                        directShadowsEnabled: false,
//                        ambientOcclusionEnabled: false,
//                        cameraTrackingEnabled: true
//                    },
//                    atmosphereEnabled: true,
//                    atmosphere: {
//                        quality: 'low'
//                    },
//                    starsEnabled : true
//                }
//            });
//
//            // Add home
//            _view.ui.add(new Home({ view: _view }), "top-left");
//
//            // Perform display setup once the map is located.
//            _view.then(function () {
//                // Continue to refresh the display even if stationary.
//                _view._stage.setRenderParams({
//                    idleSuspend: false
//                });
//
//                // Load satellite layer
//                _landsatRenderer = new LandsatRenderer();
//                ExternalRenderers.add(
//                    _view,
//                    _landsatRenderer
//                );
//            });
//
//            //
//            _view.on('click', function (e) {
//                //
//                //var h = e.native.target.height;
//                //var s = _view._stage.pick([e.x, h - e.y], [], false);
//                //var r = _view._computeMapPointFromIntersectionResult.call(_view, s.minResult);
//
//                //
//                //_landsatRenderer.addBox(e.mapPoint);
//                var extent = new Extent({
//                    xmin: e.mapPoint.x - 100,
//                    ymin: e.mapPoint.y - 100,
//                    xmax: e.mapPoint.x + 100,
//                    ymax: e.mapPoint.y + 100,
//                    spatialReference: e.mapPoint.spatialReference
//                });
//                _landsatRenderer.downloadLandsat(IMAGERY[1], extent);
//
//            });
//
//            //
//            _view.on('drag', function (e) {
//                // Exit if draw box not enabled.
//                if (!_isDrawingBox) { return; }
//
//                // prevents panning with the mouse drag event
//                e.stopPropagation();
//
//                switch (e.action) {
//                    case 'start':
//                        _start = null;
//                        //var screenPoint1 = new ScreenPoint({
//                        //    x: e.x,
//                        //    y: e.y
//                        //});
//                        _view.hitTest({ x: e.x, y: e.y }).then(function (f) {
//                            if (f && f.results && f.results.length > 0 && f.results[0].mapPoint) {
//                                _start = f.results[0].mapPoint;
//                            }
//                        });
//                        if (!_start) {
//                            _isDrawingBox = false;
//                        }
//                        break;
//                    case 'update':
//                        var update = null;
//                        //var screenPoint2 = new ScreenPoint({
//                        //    x: e.x,
//                        //    y: e.y
//                        //});
//                        _view.hitTest({ x: e.x, y: e.y }).then(function (f) {
//                            if (f && f.results && f.results.length > 0 && f.results[0].mapPoint) {
//                                update = f.results[0].mapPoint;
//                            }
//                        });
//                        if (!update) { return; }
//
//                        _view.graphics.removeAll();
//                        _view.graphics.add(new Graphic({
//                            geometry: new Extent({
//                                xmin: Math.min(_start.x, update.x),
//                                ymin: Math.min(_start.y, update.y),
//                                xmax: Math.max(_start.x, update.x),
//                                ymax: Math.max(_start.y, update.y),
//                                spatialReference: _view.spatialReference
//                            }),
//                            symbol: new SimpleFillSymbol({
//                                color: [0, 0, 0, 0.25],
//                                style: 'none',
//                                outline: {
//                                    color: [255, 0, 0, 0.9],
//                                    width: 1
//                                }
//                            })
//                        }));
//
//                        break;
//                    case 'end':
//                        _isDrawingBox = false;
//
//                        break;
//                }
//            });
//        });
//    }
//);
