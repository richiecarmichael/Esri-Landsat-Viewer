/*
    Copyright 2017 Esri

    Licensed under the Apache License, Version 2.0 (the 'License');
    you may not use this file except in compliance with the License.
    You may obtain a copy of the License at:
    https://www.apache.org/licenses/LICENSE-2.0

    Unless required by applicable law or agreed to in writing, software
    distributed under the License is distributed on an 'AS IS' BASIS,
    WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
    See the License for the specific language governing permissions and
    limitations under the License.
*/

require({
        packages: [{
            name: 'dojo-bootstrap',
            location: '/js/dojo-bootstrap'
      }, {
            name: 'calcite-maps',
            location: '/js/calcite-maps'
      }, {
            name: 'image-renderer',
            location: '/js/image-renderer'
        }]
    }, [
        'image-renderer/Landsat',
        'esri/Map',
        'esri/Graphic',
        'esri/geometry/ScreenPoint',
        'esri/geometry/Extent',
        'esri/symbols/SimpleFillSymbol',
        'esri/views/SceneView',
        'esri/views/3d/externalRenderers',
        'esri/tasks/QueryTask',
        'esri/tasks/support/Query',
        'esri/widgets/Home',
        'esri/widgets/Search',
        'dojo-bootstrap/Collapse',
        'dojo-bootstrap/Dropdown',
        'calcite-maps/calcitemaps-v0.4',
        'dojo/domReady!'
    ],
    function (
        Landsat,
        Map,
        Graphic,
        ScreenPoint,
        Extent,
        SimpleFillSymbol,
        SceneView,
        ExternalRenderers,
        QueryTask,
        Query,
        Home,
        Search
    ) {
        // Enforce strict mode
        'use strict';

        //
        var IMAGERY = [
            {
                name: 'USGS',
                url: 'https://landsatlook.usgs.gov/arcgis/rest/services/LandsatLook/ImageServer',
                function: null,
                date: 'acquisitionDate',
                sensor: 'sensor',
                cloud: 'cloudCover',
                sun: 'sunElevation'
                },
            {
                name: 'ESRI',
                url: 'https://landsat2.arcgis.com/arcgis/rest/services/Landsat/PS/ImageServer',
                function: 'Pansharpened Natural Color',
                date: 'AcquisitionDate',
                sensor: 'SensorName',
                cloud: 'CloudCover',
                sun: 'SunElevation'
                }
            ];

        //
        var _start = null;
        var _isDrawingBox = true;

        // Entry point to the three.js rendering framework
        var _landsat = null;

        // Define map
        var _view = new SceneView({
            camera: {
                position: {
                    x: -11141653,
                    y: 1178945,
                    z: 6491147,
                    spatialReference: {
                        wkid: 102100
                    }
                },
                heading: 0,
                tilt: 23
            },
            padding: {
                top: 50,
                bottom: 0
            },
            popup: {
                dockEnabled: false,
                dockOptions: {
                    buttonEnabled: false
                }
            },
            container: 'map',
            ui: {
                components: [
                        //'zoom',
                        'compass'
                    ]
            },
            map: new Map({
                basemap: 'satellite'
            }),
            environment: {
                lighting: {
                    directShadowsEnabled: false,
                    ambientOcclusionEnabled: false,
                    cameraTrackingEnabled: true
                },
                atmosphereEnabled: true,
                atmosphere: {
                    quality: 'low'
                },
                starsEnabled: true
            }
        });

        // Add home
        _view.ui.add(new Home({
            view: _view
        }), 'top-left');

        // Perform display setup once the map is located.
        _view.then(function () {
            // Continue to refresh the display even if stationary.
            _view._stage.setRenderParams({
                idleSuspend: false
            });

            // Load satellite layer
            _landsat = new Landsat();
            ExternalRenderers.add(
                _view,
                _landsat
            );
        });

        //
        _view.on('click', function (e) {
            var extent = new Extent({
                xmin: e.mapPoint.x - 100,
                ymin: e.mapPoint.y - 100,
                xmax: e.mapPoint.x + 100,
                ymax: e.mapPoint.y + 100,
                spatialReference: e.mapPoint.spatialReference
            });
            _landsat.downloadLandsat(IMAGERY[1], extent);
            //console.log(_view.camera.toJSON());
        });

        //
        _view.on('drag', function (e) {
            // Exit if draw box not enabled.
            if (!_isDrawingBox) {
                return;
            }

            // prevents panning with the mouse drag event
            e.stopPropagation();

            switch (e.action) {
                case 'start':
                    _start = null;
                    _view.hitTest({
                        x: e.x,
                        y: e.y
                    }).then(function (f) {
                        if (f && f.results && f.results.length > 0 && f.results[0].mapPoint) {
                            _start = f.results[0].mapPoint;
                        }
                    });
                    if (!_start) {
                        _isDrawingBox = false;
                    }
                    break;
                case 'update':
                    var update = null;
                    _view.hitTest({
                        x: e.x,
                        y: e.y
                    }).then(function (f) {
                        if (f && f.results && f.results.length > 0 && f.results[0].mapPoint) {
                            update = f.results[0].mapPoint;
                        }
                    });
                    if (!update) {
                        return;
                    }

                    _view.graphics.removeAll();
                    _view.graphics.add(new Graphic({
                        geometry: new Extent({
                            xmin: Math.min(_start.x, update.x),
                            ymin: Math.min(_start.y, update.y),
                            xmax: Math.max(_start.x, update.x),
                            ymax: Math.max(_start.y, update.y),
                            spatialReference: _view.spatialReference
                        }),
                        symbol: new SimpleFillSymbol({
                            color: [0, 0, 0, 0.25],
                            style: 'none',
                            outline: {
                                color: [255, 0, 0, 0.9],
                                width: 1
                            }
                        })
                    }));

                    break;
                case 'end':
                    _isDrawingBox = false;

                    break;
            }
        });
    
        //
        var searchWidget = new Search({
            container: 'searchWidgetDiv',
            view: _view
        });
    }
);
