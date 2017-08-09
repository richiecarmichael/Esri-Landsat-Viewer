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
        location: '/js'
    }, {
        name: 'image-renderer',
        location: '/js'
    }]
    }, [
        'image-renderer/landsat',
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
        'dojo/query',
        'dojo/dom',
        'dojo-bootstrap/Collapse',
        'dojo-bootstrap/Dropdown',
        'dojo-bootstrap/Modal',
        'dojo-bootstrap/Carousel',
        'dojo-bootstrap/Tab',
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
        Search,
        query,
        dom
    ) {
        // Enforce strict mode
        'use strict';

        //
        var IMAGERY = [{
            name: 'USGS',
            url: 'https://landsatlook.usgs.gov/arcgis/rest/services/LandsatLook/ImageServer',
            function: null,
            date: 'acquisitionDate',
            sensor: 'sensor',
            cloud: 'cloudCover',
            sun: 'sunElevation'
        },{
            name: 'ESRI',
            url: 'https://landsat2.arcgis.com/arcgis/rest/services/Landsat/PS/ImageServer',
            function: 'Pansharpened Natural Color',
            date: 'AcquisitionDate',
            sensor: 'SensorName',
            cloud: 'CloudCover',
            sun: 'SunElevation'
        }];

        //
        var _drag = {
            enabled: false,
            start: null,
            graphic: null
        };

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
        _view.on('drag', function (e) {
            // Exit if draw not enabled.
            if (!_drag.enabled) { return; }

            // Prevents panning with the mouse drag event.
            e.stopPropagation();

            switch (e.action) {
                case 'start':
                    // Initialize starting location.
                    _drag.start = null;
                    
                    // Get starting position from hit test.
                    _view.hitTest({
                        x: e.x,
                        y: e.y
                    }).then(function (f) {
                        if (f && f.results && f.results.length > 0 && f.results[0].mapPoint) {
                            _drag.start = f.results[0].mapPoint;
                        }
                    });
                    
                    // If nothing found disable drawing (start-over).
                    if (!_drag.start) {
                        _drag.enabled = false;
                    }
                    break;
                case 'update':
                    // Find current mouse location
                    var update = null;
                    _view.hitTest({
                        x: e.x,
                        y: e.y
                    }).then(function (f) {
                        if (f && f.results && f.results.length > 0 && f.results[0].mapPoint) {
                            update = f.results[0].mapPoint;
                        }
                    });
                    
                    // 
                    if (!update) {return;}
                    
                    var extent = new Extent({
                        xmin: Math.min(_drag.start.x, update.x),
                        ymin: Math.min(_drag.start.y, update.y),
                        xmax: Math.max(_drag.start.x, update.x),
                        ymax: Math.max(_drag.start.y, update.y),
                        spatialReference: _view.spatialReference
                    });
                    
                    var symbol = null;
                    
                    if (_drag.graphic){
                        _view.graphics.remove(_drag.graphic);
                        symbol = _drag.graphic.symbol.clone();
                    } else{
                        symbol = new SimpleFillSymbol({
                            color: [0, 0, 0, 0.25],
                            style: 'none',
                            outline: {
                                color: [255, 0, 0, 0.9],
                                width: 2
                            }
                        });
                    }
                       
                    _drag.graphic = new Graphic({
                        geometry: extent,
                        symbol: symbol
                    });

                    _view.graphics.add(_drag.graphic);

                    break;
                case 'end':
                    _drag.enabled = false;
                    _drag.start = null;

                    break;
            }
        });

        // Add search widget (located in menu bar).
        var searchWidget = new Search({
            container: 'searchWidgetDiv',
            view: _view
        });
    
        // Sync basemaps for map.
        query('#selectBasemapPanel').on('change', function(e){
            _view.map.basemap = e.target.options[e.target.selectedIndex].dataset.vector;         
        });
    
        // Clear AOI box
        query('#removeBox').on('click', function(e){
            if (_drag.graphic){
                _view.graphics.remove(_drag.graphic);
            }
        });
    
        // Add AOI box
        query('#addBox').on('click', function(e){
            _drag.enabled = true;
            
            //_landsat.downloadLandsat(IMAGERY[1], extent);      
        });
    
        // Download landsat preview images.
        query('#download').on('click', function(e){
            if (!_drag.graphic){
                // User has not picked an extent.
                return;
            }
            
            // Download imagery
            _landsat.downloadLandsat(
                IMAGERY[1],
                _drag.graphic.geometry
            );      
        });
        
        // Date slider
        var sliderDate = document.getElementById('sliderDate');
        sliderDate.style.margin = '10px 15px 0 15px'; // top, right, bottom, left
        noUiSlider.create(sliderDate, {
            start: [2014, 2020],
            connect: true,
            range: {
                min: 2000,
                max: 2020
            },
            behaviour: 'drag-tap',
            //tooltips: [formatter, formatter],
            orientation: 'horizontal',
            margin: 1,
            step: 1
        }).on('update', function(values) {
            var value1 = Number(values[0]);
            var value2 = Number(values[1]);
            dom.byId('dateReading').innerHTML = value1.toFixed() + '<br/>' + value2.toFixed();
        });
    
        // Cloud slider
        var sliderCloud = document.getElementById('sliderCloud');
        sliderCloud.style.margin = '10px 15px 0 15px'; // top, right, bottom, left
        noUiSlider.create(sliderCloud, {
            start: 10,
            connect: [true, false],
            range: {
                min: 0,
                max: 50
            },
            orientation: 'horizontal',
            step: 1
        }).on('update', function(values) {
            var value = Number(values[0]);
            dom.byId('cloudReading').innerHTML = value.toFixed() + '%';
        });
    
        // sliderSwipe
        var sliderSwipe = document.getElementById('sliderSwipe');
        sliderSwipe.style.height = '200px';
        sliderSwipe.style.margin = '20px 0 10px 5px'; // top, right, bottom, left
        noUiSlider.create(sliderSwipe, {
            start: 100,
            connect: [true, false],
            range: {
                min: 0,
                max: 100
            },
            direction: 'rtl',
            orientation: 'vertical',
            step: 1,
            pips: {
                mode: 'positions',
                values: [0, 100],
                density: 100,
                format: {
                    to: function(value){
                        switch(value){
                            case 0:
                                return 'Less';
                            case 100:
                                return 'More';
                        }
                    },
                    from: function(){}
                }
            }
        }).on('update', function(values) {
            //
        });
    }
);
