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
require([
        'esri/Map',
        'esri/Camera',
        'esri/Graphic',
        'esri/geometry/SpatialReference',
        'esri/geometry/ScreenPoint',
        'esri/geometry/Extent',
        'esri/layers/ImageryLayer',
        'esri/symbols/SimpleFillSymbol',
        'esri/views/SceneView',
        'esri/views/3d/externalRenderers',
        'esri/tasks/QueryTask',
        'esri/tasks/support/Query',
        'esri/widgets/Home',
        'esri/widgets/Search',
        'dojo/string',
        'dojo/request',
        'dojo/domReady!'
    ],
    function (
        Map,
        Camera,
        Graphic,
        SpatialReference,
        ScreenPoint,
        Extent,
        ImageryLayer,
        SimpleFillSymbol,
        SceneView,
        ExternalRenderers,
        QueryTask,
        Query,
        Home,
        Search,
        string,
        request
    ) {
        // Enforce strict mode
        'use strict';

        $(document).ready(function () {
            // Constants
            var THREE = window.THREE;
            //var RADIUS = 6378137;
            var SIZE = 256;
            //var SPACING = 10000;

            //
            var _page = 1;

            //
            var IMAGERY = [{
                name: 'USGS',
                url: 'https://landsatlook.usgs.gov/arcgis/rest/services/LandsatLook/ImageServer',
                function: null,
                date: 'acquisitionDate',
                sensor: 'sensor',
                cloud: 'cloudCover',
                sun: 'sunElevation'
            }, {
                name: 'ESRI',
                url: 'https://landsat2.arcgis.com/arcgis/rest/services/Landsat/PS/ImageServer',
                function: 'Pansharpened Natural Color',
                date: 'AcquisitionDate',
                sensor: 'SensorName',
                cloud: 'CloudCover',
                sun: 'SunElevation'
            }];

            // Drag object
            var _drag = {
                enabled: false,
                start: null,
                graphic: null
            };

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
                popup: {
                    dockEnabled: false,
                    dockOptions: {
                        buttonEnabled: false
                    }
                },
                container: 'map',
                ui: {
                    components: [
                        'compass',
                        'zoom'
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
            _view.ui.add(new Search({
                view: _view
            }), {
                position: "top-left",
                index: 0
            });

            // Perform display setup once the map is located.
            _view.then(function () {
                // Continue to refresh the display even if stationary.
                _view._stage.setRenderParams({
                    idleSuspend: false
                });

                // Load satellite layer
                ExternalRenderers.add(
                    _view,
                    _landsat
                );
            });

            // Handle drag operations.
            _view.on('drag', function (e) {
                // Exit if draw not enabled.
                if (!_drag.enabled) {
                    return;
                }

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
                        if (!update) {
                            return;
                        }

                        var extent = new Extent({
                            xmin: Math.min(_drag.start.x, update.x),
                            ymin: Math.min(_drag.start.y, update.y),
                            xmax: Math.max(_drag.start.x, update.x),
                            ymax: Math.max(_drag.start.y, update.y),
                            spatialReference: _view.spatialReference
                        });

                        var symbol = null;

                        if (_drag.graphic) {
                            _view.graphics.remove(_drag.graphic);
                            symbol = _drag.graphic.symbol.clone();
                        } else {
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
                        // Disable dragging.
                        _drag.enabled = false;
                        _drag.start = null;
                        
                        // Update page ui.
                        pageUpdates();

                        break;
                }
            });

            // Update page visiblity.
            pageUpdates();            

            // Button clicks.
            $('#button-previous').click(function () {
                // Invalid page
                if (_page === 1) { return; }
                
                // Peform actions and update page.
                _page--;
                pageUpdates();
            });
            $('#button-next').click(function () {
                // Invalid page
                if (_page === 4) { return; }
                
                // Peform actions and update page.
                _page++;
                pageUpdates();
            });
            $('#button-draw').click(function () {
                _drag.enabled = true;
            });
            $('#button-start-download').click(function () {
                // Commence download
                _landsat.download(
                    IMAGERY[1],
                    _drag.graphic.geometry,
                    function(e){
                        // Progress event.
                        $('#download-progress > p').html(function(){
                            // Update progress text.
                            return string.substitute('Processing ${i} in ${l}', {
                                i: e.index,
                                l: e.length
                            });
                            
                            
                        });
                        
                        // Update progress bar.
                        $('#download-progress .progress-bar').width(function(){
                            var ss = 100 * e.index / e.length;
                            var tt = ss.toFixed();
                            return tt + '%';
                        });
                    },
                    function(){
                        // Completed event.
                        pageUpdates();
                    }
                );
                
                // Update UI.
                pageUpdates();
            });
            $('#button-cancel-download').click(function () {
                _landsat.cancelDownload();
                pageUpdates();
            });
            
            function pageUpdates(){
                // Show current page.
                $('.rc-page').hide();
                $('.rc-page[data-value=' + _page + ']').show();
                
                // Per page 
                switch (_page) {
                    case 1:
                        // Update navigation buttons.
                        $('#button-previous').hide();
                        
                        _drag.graphic ? 
                            $('#button-next').show() :
                            $('#button-next').hide();
                        
                        break;
                    case 2:
                        // Update navigation buttons.
                        $('#button-previous').show();
                        $('#button-next').show();
                        
                        //
                        if (_landsat.isDownloading()){
                            $('#button-start-download').hide();
                            $('#button-cancel-download').show();
                            $('#download-progress').show();
                        } else {
                            $('#button-start-download').show();      
                            $('#button-cancel-download').hide();
                            $('#download-progress').hide();
                        }
                        
                        // Sliders
                        if (!$("#slider-date-internal").length) {
                            $('#slider-date').slider({
                                id: 'slider-date-internal',
                                min: 1975,
                                max: 2020,
                                step: 1,
                                ticks: [1960, 1980, 2000, 2020],
                                ticks_labels: ['1960', '1980', '2000', '2020'],
                                range: true,
                                value: [2014, 2020]
                            });
                        }
                        if (!$("#slider-cloud-internal").length) {
                            $('#slider-cloud').slider({
                                id: 'slider-cloud-internal',
                                min: 0,
                                max: 40,
                                step: 1,
                                ticks: [0, 10, 20, 30, 40],
                                ticks_labels: ['0%', '10%', '20%', '30%', '40%'],
                                range: false,
                                value: 10
                            });
                        }
                        if (!$("#slider-resolution-internal").length) {
                            $('#slider-resolution').slider({
                                id: 'slider-resolution-internal',
                                min: 1,
                                max: 4,
                                step: 1,
                                ticks: [1, 2, 3, 4],
                                ticks_labels: ['128', '256', '512', '1024'],
                                range: false,
                                tooltip: 'hide',
                                value: 2
                            });
                        }
                        break;
                    case 3:
                        // Order/Filter page.
                        if (!$("#slider-swipe-internal").length) {
                            $('#slider-swipe').slider({
                                id: 'slider-swipe-internal',
                                min: 0,
                                max: 100,
                                step: 1,
                                ticks: [0, 100],
                                ticks_labels: ['All', 'None'],
                                range: true,
                                tooltip: 'hide',
                                orientation: "vertical",
                                value: [0, 100]
                            });
                        }
                        break;
                    case 4:
                        // Order/Purchase/Download page.
                        break;
                }
            }

            // Definition of external renderer.
            var _landsat = {
                HEIGHT_MIN: 10000,
                HEIGHT_MAX: 1000000,
                setup: function (context) {
                    //
                    this._cancelDownload = true;
                    this._isDownloading = false;
                    
                    // Store view
                    this.view = context.view;

                    // Create the THREE.js webgl renderer
                    this.renderer = new THREE.WebGLRenderer({
                        context: context.gl,
                        premultipliedAlpha: false
                    });

                    //
                    this.renderer.setPixelRatio(window.devicePixelRatio);
                    this.renderer.setSize(
                        this.view.size[0],
                        this.view.size[1]
                    );

                    // Make sure it does not clear anything before rendering
                    //this.renderer.autoClear = false;
                    this.renderer.autoClearDepth = false;
                    this.renderer.autoClearColor = false;
                    this.renderer.autoClearStencil = false;

                    // The ArcGIS JS API renders to custom offscreen buffers, and not to the default framebuffers.
                    // We have to inject this bit of code into the three.js runtime in order for it to bind those
                    // buffers instead of the default ones.
                    var originalSetRenderTarget = this.renderer.setRenderTarget.bind(this.renderer);
                    this.renderer.setRenderTarget = function (target) {
                        originalSetRenderTarget(target);
                        if (target === null) {
                            context.bindRenderTarget();
                        }
                    };

                    // Instanciate scene and camera
                    this.scene = new THREE.Scene();
                    this.camera = new THREE.PerspectiveCamera();

                    // Create both a directional light, as well as an ambient light
                    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
                    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
                    this.scene.add(
                        this.directionalLight,
                        this.ambientLight
                    );

                    // cleanup after ourselfs
                    //context.resetWebGLState();
                },
                render: function (context) {
                    // Get Esri's camera
                    var c = context.camera;

                    // Update three.js camera
                    this.camera.position.set(c.eye[0], c.eye[1], c.eye[2]);
                    this.camera.up.set(c.up[0], c.up[1], c.up[2]);
                    this.camera.lookAt(new THREE.Vector3(c.center[0], c.center[1], c.center[2]));
                    this.camera.projectionMatrix.fromArray(c.projectionMatrix);

                    // Get Esri's current sun settings
                    this.view.environment.lighting.date = this.date;

                    // Update lighting
                    var direction = context.sunLight.direction;
                    var diffuse = context.sunLight.diffuse;
                    var ambient = context.sunLight.ambient;

                    // Update the directional light color, intensity and position
                    this.directionalLight.color.setRGB(diffuse.color[0], diffuse.color[1], diffuse.color[2]);
                    this.directionalLight.intensity = diffuse.intensity;
                    this.directionalLight.position.set(direction[0], direction[1], direction[2]);

                    // Update the ambient light color and intensity
                    this.ambientLight.color.setRGB(ambient.color[0], ambient.color[1], ambient.color[2]);
                    this.ambientLight.intensity = ambient.intensity;

                    // Update objects
                    this._updateObjects(context);

                    // Render the scene
                    this.renderer.resetGLState();
                    this.renderer.render(this.scene, this.camera);

                    // as we want to smoothly animate the ISS movement, immediately request a re-render
                    //externalRenderers.requestRender(view);

                    // cleanup
                    context.resetWebGLState();
                },
                _updateObjects: function (context) {

                },
                cancelDownload: function(){
                    this._cancelDownload = true;
                },
                isDownloading: function(){
                    return this._isDownloading;
                },
                download: function (setting, extent, progress, completed) {
                    // Get a new references to view
                    var view = this.view;
                    var scene = this.scene;
                    
                    // Initialized user cancellation flag.
                    this._cancelDownload = false;
                    this._isDownloading = true;
                    var that = this;

                    // Instanciate image layer
                    var layer = new ImageryLayer({
                        url: setting.url
                    });

                    //var h = 0;

                    // Load layer. Required to get objectid field.
                    layer.load().then(function () {
                        // Get objectid field
                        var oidField = layer.objectIdField;

                        // Query 
                        var query = new Query({
                            geometry: extent,
                            returnGeometry: true,
                            outFields: [
                                setting.date,
                                setting.sensor,
                                setting.cloud
                            ],
                            outSpatialReference: view.spatialReference,
                            where: 'CloudCover <= 0.1'
                        });

                        // Query task
                        var queryTask = new QueryTask({
                            url: setting.url
                        });
                        queryTask.execute(query).then(function (e) {
                            // Get min/max
                            var values = e.features.map(function(f){
                                return f.attributes[setting.date];
                            });
                            var min = Math.min.apply(null, values);
                            var max = Math.max.apply(null, values);
                            
                            // Zoom to full extent
                            view.goTo({
                                target: extent.clone().set({
                                    zmin: 0,
                                    zmax: that.HEIGHT_MAX * 1.5 // e.features.length * SPACING * 1.5
                                }),
                                heading: 0,
                                tilt: 25
                            }, {
                                animate: true,
                                duration: 2000
                            });
                            
                            // The number of images processed.
                            var index = 0;
                            var length = e.features.length;

                            e.features.forEach(function (f) {
                                // Footprint extent
                                var extent = f.geometry.extent;
                                var id = f.attributes[oidField];

                                // Construct url to lock raster image
                                var url = setting.url;
                                url += '/exportImage?f=image';
                                url += string.substitute('&bbox=${xmin},${ymin},${xmax},${ymax}', {
                                    xmin: extent.xmin,
                                    ymin: extent.ymin,
                                    xmax: extent.xmax,
                                    ymax: extent.ymax
                                });
                                url += '&bboxSR=' + view.spatialReference.wkid;
                                url += '&imageSR=' + view.spatialReference.wkid;
                                url += string.substitute('&size=${w},${h}', {
                                    w: SIZE,
                                    h: SIZE
                                });
                                url += '&format=' + 'png';
                                url += '&interpolation=' + 'RSP_BilinearInterpolation';
                                url += '&mosaicRule=' + string.substitute('{mosaicMethod:"esriMosaicLockRaster",lockRasterIds:[${id}]}', {
                                    id: id
                                });
                                if (setting.function){
                                    url += '&renderingRule=' + string.substitute('{rasterFunction:\'${fxn}\'}', {
                                        fxn: setting.function
                                    });
                                }

                                var loader = new THREE.TextureLoader();
                                loader.setCrossOrigin('');
                                loader.load(
                                    url,
                                    function (texture) {
                                        // Exit if user cancelled image loading.
                                        if (that._cancelDownload){
                                            that._isDownloading = false;
                                            if (completed){
                                                completed();
                                            }
                                            return; 
                                        }
                                        
                                        // Calculate height
                                        //var h = // *************************
                                        var v = f.attributes[setting.date];
                                        var h = that.HEIGHT_MIN + (that.HEIGHT_MAX - that.HEIGHT_MIN) * (v - min) / (max - min);
                                        
                                        // Center coordinate array
                                        var coordinates = [
                                            extent.center.x,
                                            extent.center.y,
                                            h
                                        ];

                                        // Transform to internal rendering space
                                        var transform = ExternalRenderers.renderCoordinateTransformAt(
                                            view,
                                            coordinates,
                                            f.geometry.spatialReference,
                                            new Float64Array(16)
                                        );
                                        var matrix = new THREE.Matrix4();
                                        matrix.fromArray(transform);

                                        // Create three.js object
                                        var geometry = new THREE.PlaneBufferGeometry(
                                            extent.width,
                                            extent.height,
                                            1,
                                            1
                                        );

                                        // Do something with the texture
                                        var material = new THREE.MeshBasicMaterial({
                                            map: texture,
                                            side: THREE.DoubleSide,
                                            transparent: true
                                        });

                                        var plane = new THREE.Mesh(geometry, material);
                                        plane.position.fromArray(coordinates);
                                        plane.applyMatrix(matrix);

                                        // Add to scene
                                        scene.add(plane);
                                        
                                        // Increment progressed counter.
                                        index++;
                                        
                                        // Fire progress event.
                                        if (progress){
                                            progress({
                                                index: index,
                                                length: length
                                            });
                                        }
                                        
                                        // Fire completed event.
                                        if (index === length){
                                            that._isDownloading = false;
                                            if (completed){
                                                completed();
                                            }
                                        }
                                    }
                                );
                            });
                        });
                    });
                }
            };
        });
    }
);
