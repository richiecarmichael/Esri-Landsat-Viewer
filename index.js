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

/*
    LANDSATLOOK SAMPLE FOOTPRINT QUERY
    ----------------------------------
    
    https://landsatlook.usgs.gov/arcgis/rest/services/LandsatLook/ImageServer/query
    f:json
    where:(acquisitionDate >= date'2013-01-01' AND
           acquisitionDate <= date'2017-12-31') AND 
           (dayOfYear >= 1 AND  dayOfYear <= 365) AND 
           (sensor = 'OLI') AND 
           (cloudCover <= 20) AND 
           (dayOrNight = 'DAY')
    returnGeometry:true
    spatialRel:esriSpatialRelIntersects
    geometry:{'xmin':-10758372.309998687,
              'ymin':4537971.325052022,
              'xmax':-10224841.852568414,
              'ymax':4808558.405181416,
              'spatialReference':{'wkid':102100}}
    geometryType:esriGeometryEnvelope
    inSR:102100
    outFields:sceneID,sensor,acquisitionDate,CenterX,CenterY,
              PR,OBJECTID,dayOrNight,path,row,cloudCover,
              sunElevation,sunAzimuth,receivingStation,sceneStartTime,
              month,year,dayOfYear
    orderByFields:acquisitionDate DESC
    outSR:102100
    
    LANDSATLOOK SAMPLE IMAGE EXPORT
    -------------------------------
    
    https://landsatlook.usgs.gov/arcgis/rest/services/LandsatLook/ImageServer/exportImage
    f:image
    format:jpg
    renderingRule:{'rasterFunction':'Stretch',
                   'rasterFunctionArguments':{'StretchType':0},
                   'variableName':'Raster'}
    mosaicRule:{'mosaicMethod':'esriMosaicLockRaster',
                'ascending':true,
                'lockRasterIds':[3578800,3580067,3583249,3587733,3587734,3590088,3590089],
                'mosaicOperation':'MT_FIRST'}
    bbox:-10758372.309998687,4537971.325052022,-10224841.852568414,4808558.405181416
    imageSR:102100
    bboxSR:102100
    size:1745,885
    _ts:1499904055307
    
    ESRI LANDSAT SERVICE DETAILS
    ----------------------------
    
    https://landsat2.arcgis.com/arcgis/rest/services/Landsat/PS/ImageServer
    raster function: Pansharpened Natural Color
    fields: AcquisitionDate/DayOfYear/SensorName/CloudCover
    where:((AcquisitionDate > timestamp '2017-08-16 04:59:59') AND (AcquisitionDate < timestamp '2018-08-23 05:00:00')) AND (1=1)
    
    ESRI AND USGS SENSOR NAMING
    ---------------------------
    
    SENSOR                                   LANDSAT LOOK             ESRI
    Landsat 8 OLI (2013-present):            sensor = 'OLI'           SensorName = 'Landsat 8'
    Landsat 7 ETM+ SLC-off (2003-present):   sensor = 'ETM_SLC_OFF'   ?
    Landsat 7 ETM+ SLC-on (1999-2003):       sensor = 'ETM'           SensorName = 'LANDSAT-7-ETM+'
    Landsat 4-5 TM (1982-2011):              sensor = 'TM'            n/a
    Landsat 1-5 MSS (1972-2013):             sensor = 'MSS'           n/a
    
*/

require([
    'esri/Map',
    'esri/Camera',
    'esri/Graphic',
    'esri/geometry/SpatialReference',
    'esri/geometry/Extent',
    'esri/layers/ImageryLayer',
    'esri/layers/support/MosaicRule',
    'esri/layers/support/RasterFunction',
    'esri/symbols/SimpleFillSymbol',
    'esri/views/SceneView',
    'esri/views/3d/externalRenderers',
    'esri/tasks/QueryTask',
    'esri/tasks/support/Query',
    'esri/widgets/Home',
    'esri/widgets/Search',
    'dojo/string',
    'dojo/request',
    'dojo/number',
    'dojo/domReady!'
],
    function (
        Map,
        Camera,
        Graphic,
        SpatialReference,
        Extent,
        ImageryLayer,
        MosaicRule,
        RasterFunction,
        SimpleFillSymbol,
        SceneView,
        ExternalRenderers,
        QueryTask,
        Query,
        Home,
        Search,
        string,
        request,
        number
    ) {
        // Enforce strict mode
        'use strict';

        $(document).ready(function () {
            // Constants
            var THREE = window.THREE;

            // Current UI page.
            var _page = 1;

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
                    dockEnabled: true,
                    dockOptions: {
                        buttonEnabled: true
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
                    basemap: 'satellite',
                    ground: 'world-elevation'
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

            // Load satellite layer
            _view.then(function () {
                // Load external renderer
                ExternalRenderers.add(
                    _view,
                    _landsat
                );

                // Add custom popup actions
                _view.popup.actions.removeAll();
                _view.popup.actions.push({
                    title: 'Add to Scene',
                    id: 'add-to-scene',
                    className: 'esri-icon-plus'
                }, {
                    title: 'Download',
                    id: 'download',
                    className: 'esri-icon-download'
                });
                _view.popup.on('trigger-action', function (e) {
                    switch (e.action.id) {
                        case 'add-to-scene':
                            // Exit if no referencec to landsat.
                            if (!_landsat || !_landsat._selected) {
                                return;
                            }

                            // Add lock raster imagery layer.
                            _view.map.add(new ImageryLayer({
                                url: _landsat._setting.url,
                                mosaicRule: new MosaicRule({
                                    method: 'lock-raster',
                                    lockRasterIds: [_landsat._selected.userData.attributes.id]
                                }),
                                renderingRule: new RasterFunction(
                                    _landsat._setting.rasterFunction
                                )
                            }));

                            break;
                        case 'download':
                            // Show download modal dialog.
                            $('#modal-download .modal-body').empty();
                            $('#modal-download .modal-body').append(
                                $(
                                    string.substitute(
                                        '<p><img class="rc-center" src="${thumbnail}" width="256" /></p>' +
                                        '<p>Click <a target="_blank" href="${download}">here</a> to download a high resolution photo.</p>',
                                        {
                                            thumbnail: _landsat._selected.userData.attributes.thumbnail,
                                            download: _landsat._selected.userData.attributes.download
                                        }
                                    )
                                )
                            );
                            $('#modal-download').modal('show');
                            break;
                    }
                });
            });

            // Add home button.
            _view.ui.add(new Home({
                view: _view
            }), 'top-left');

            // Add search button.
            _view.ui.add(new Search({
                view: _view
            }), {
                    position: 'top-left',
                    index: 0
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

            // Handle click operations.
            _view.on('click', function (e) {
                _landsat.click(e);
            });

            // Update page visiblity.
            pageUpdates();

            // Button clicks.
            $('#button-previous').click(function () {
                if (_page === 1) { return; }
                _page--;
                pageUpdates();
            });
            $('#button-next').click(function () {
                if (_page === 3) { return; }
                _page++;
                pageUpdates();
            });
            $('#button-draw').click(function () {
                _drag.enabled = true;
            });
            $('#button-start-download').click(function () {
                // Remove previous images.
                $('#download-progress > p').empty();
                $('#download-progress .progress-bar').width('0%');
                _landsat.clear();

                // Disable UI.
                $('.rc-host button').addClass('disabled');
                $('#slider-date, #slider-cloud, #slider-resolution').slider('disable');
                $('#satellites .checkbox').addClass('disabled');

                // Get settings
                var settings = null;
                switch ($('.rc-host li.active').attr('data-host')) {
                    case 'esri':
                        settings = _landsat.ESRI;
                        break;
                    case 'usgs':
                        settings = _landsat.USGS;
                        break;
                }

                // Get parameters.
                var parameters = {
                    extent: _drag.graphic.geometry,
                    date: {
                        from: $('#slider-date').slider('getValue')[0],
                        to: $('#slider-date').slider('getValue')[1]
                    },
                    cloud: $('#slider-cloud').slider('getValue'),
                    resolution: Math.pow(2, $('#slider-resolution').slider('getValue')),
                    sensors: {
                        oli: $('#satellites input[data-sensor=oli]').prop('checked'),
                        etm: $('#satellites input[data-sensor=etm]').prop('checked'),
                        tm: $('#satellites input[data-sensor=tm]').prop('checked'),
                        mss: $('#satellites input[data-sensor=mss]').prop('checked')
                    }
                };

                // Commence download
                _landsat.download(
                    settings,
                    parameters,
                    function (e) {
                        // Progress event.
                        $('#download-progress > p').html(function () {
                            // Update progress text.
                            return string.substitute('Processing ${i} in ${l}', {
                                i: e.index,
                                l: e.length
                            });
                        });

                        // Update progress bar.
                        $('#download-progress .progress-bar').width(function () {
                            var ss = 100 * e.index / e.length;
                            var tt = ss.toFixed();
                            return tt + '%';
                        });

                        // Show next button if one or more image downloaded.
                        if (_landsat.images.children.length === 0) {
                            $('#button-next').hide();
                        } else {
                            $('#button-next').show();
                        }
                    },
                    function () {
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
            $('#button-clear').click(function () {
                _landsat.clear();
                $('#button-start-download').show();
                $('#button-cancel-download').hide();
                $('#button-clear').hide();
                $('#button-next').hide();

                $('.rc-host button').removeClass('disabled');
                $('#slider-date, #slider-cloud, #slider-resolution').slider('enable');
                $('#satellites .checkbox').removeClass('disabled');
                $('#satellites input').prop('disabled', false);
            });
            $('.rc-sort-button').click(function () {
                // Exit if already checked.
                if ($(this).hasClass('rc-active')) {
                    return;
                }

                // Reset swipe slider.
                $('#slider-swipe').slider('setValue', [
                    $('#slider-swipe').slider('getAttribute', 'min'),
                    $('#slider-swipe').slider('getAttribute', 'max')
                ]);

                // 
                $('.rc-sort-button').removeClass('rc-active');
                $(this).addClass('rc-active');

                // Get new field and older.
                var field = $(this).attr('data-field');
                var order = $(this).attr('data-order');

                // Reorder landsat images.
                _landsat.sort(field, order);
            });
            $('.rc-host a').click(function () {
                // Exit if already checked.
                if ($(this).parent().hasClass('active')) { return; }

                // Toggle active class.
                $(this).parent().addClass('active').siblings().removeClass('active');

                // 
                $('.rc-host button').html(
                    $(this).html() + ' <span class=\'caret\'></span>'
                );
            });

            //
            $('#modal-help').on('hidden.bs.modal', function () {
                var vid = $('#player').prop('src');
                $('#player').prop('src', '');
                $('#player').prop('src', vid);
            })

            function pageUpdates() {
                // Show current page.
                $('.rc-page').hide();
                $('.rc-page[data-value=' + _page + ']').show();

                // Per page 
                switch (_page) {
                    case 1:
                        // Update navigation buttons.
                        $('#button-previous').hide();

                        if (_drag.graphic) {
                            $('#button-next').show();
                        }
                        else {
                            $('#button-next').hide();
                        }

                        break;
                    case 2:
                        // Update navigation buttons.
                        $('#button-previous').show();

                        // Show next only if images downloaded.
                        if (_landsat.images.children.length === 0) {
                            $('#button-next').hide();
                        } else {
                            $('#button-next').show();
                        }

                        // Sliders
                        if (!$('#slider-date-internal').length) {
                            $('#slider-date').slider({
                                id: 'slider-date-internal',
                                min: 1975,
                                max: 2020,
                                step: 1,
                                ticks: [1960, 1980, 2000, 2020],
                                ticks_labels: ['1960', '1980', '2000', '2020'],
                                range: true,
                                value: [2000, 2020]
                            });
                        }
                        if (!$('#slider-cloud-internal').length) {
                            $('#slider-cloud').slider({
                                id: 'slider-cloud-internal',
                                min: 0,
                                max: 0.4,
                                step: 0.01,
                                ticks: [0, 0.1, 0.2, 0.3, 0.4],
                                ticks_labels: ['0%', '10%', '20%', '30%', '40%'],
                                range: false,
                                value: 0.1,
                                formatter: function (e) {
                                    return e * 100 + '%';
                                }
                            });
                        }
                        if (!$('#slider-resolution-internal').length) {
                            $('#slider-resolution').slider({
                                id: 'slider-resolution-internal',
                                min: 7,
                                max: 10,
                                step: 1,
                                ticks: [7, 8, 9, 10],
                                ticks_labels: ['128', '256', '512', '1024'],
                                range: false,
                                tooltip: 'hide',
                                value: 9
                            });
                        }

                        // Show progress dialog if downloading.
                        if (_landsat.isDownloading) {
                            $('#download-progress').show();
                            $('#button-start-download').hide();
                            $('#button-cancel-download').show();
                            $('#button-clear').hide();

                            $('.rc-host button').addClass('disabled');
                            $('#slider-date, #slider-cloud, #slider-resolution').slider('disable');
                            $('#satellites .checkbox').addClass('disabled');
                            $('#satellites input').prop('disabled', true);
                        } else {
                            $('#download-progress').hide();
                            $('#button-cancel-download').hide();
                            if (_landsat.images.children.length === 0) {
                                $('#button-start-download').show();
                                $('#button-clear').hide();

                                $('.rc-host button').removeClass('disabled');
                                $('#slider-date, #slider-cloud, #slider-resolution').slider('enable');
                                $('#satellites .checkbox').removeClass('disabled');
                                $('#satellites input').prop('disabled', false);
                            } else {
                                $('#button-start-download').hide();
                                $('#button-clear').show();

                                $('.rc-host button').addClass('disabled');
                                $('#slider-date, #slider-cloud, #slider-resolution').slider('disable');
                                $('#satellites .checkbox').addClass('disabled');
                                $('#satellites input').prop('disabled', true);
                            }
                        }

                        break;
                    case 3:
                        // Update navigation buttons.
                        $('#button-previous').show();
                        $('#button-next').hide();

                        // Order/Filter page.
                        if (!$('#slider-swipe-internal').length) {
                            $('#slider-swipe').slider({
                                id: 'slider-swipe-internal',
                                min: 0,
                                max: 1,
                                step: 0.01,
                                ticks: [0, 1],
                                ticks_labels: ['Bottom', 'Top'],
                                range: true,
                                tooltip: 'hide',
                                orientation: 'vertical',
                                reversed: true,
                                value: [0, 1]
                            }).on('change', function (e) {
                                _landsat.filter(
                                    e.value.newValue[0],
                                    e.value.newValue[1]
                                );
                            });
                        }
                        break;
                }
            }

            function deg_to_dms(deg) {
                var d = Math.floor(deg);
                var minfloat = (deg - d) * 60;
                var m = Math.floor(minfloat);
                var secfloat = (minfloat - m) * 60;
                var s = Math.round(secfloat);
                if (s === 60) {
                    m++;
                    s = 0;
                }
                if (m === 60) {
                    d++;
                    m = 0;
                }
                return string.substitute('${d}°${m}\'${s}"', {
                    d: d,
                    m: string.pad(m, 2),
                    s: string.pad(s, 2)
                });
            }

            // Definition of external renderer.
            var _landsat = {
                // Preset landsat services.
                USGS: {
                    host: 'USGS',
                    url: 'https://landsatlook.usgs.gov/arcgis/rest/services/LandsatLook/ImageServer',
                    rasterFunction: {
                        functionName: 'Stretch',
                        functionArguments: {
                            StretchType: 0
                        },
                        variableName: 'Raster'
                    },
                    name: 'Name',
                    date: 'acquisitionDate',
                    sensor: 'sensor',
                    sensors: {
                        oli: 'OLI',
                        etm: 'ETM',
                        tm: 'TM',
                        mss: 'MSS'
                    },
                    cloud: 'cloudCover',
                    cloudFactor: 100,
                    sunAlt: 'sunElevation',
                    sunAz: 'sunAzimuth',
                    downloadSize: 10000 
                },
                ESRI: {
                    host: 'ESRI',
                    url: 'https://landsat2.arcgis.com/arcgis/rest/services/Landsat/PS/ImageServer',
                    rasterFunction: {
                        functionName: 'Pansharpened Natural Color'
                    },
                    name: 'Name',
                    date: 'AcquisitionDate',
                    sensor: 'SensorName',
                    sensors: {
                        oli: 'Landsat 8',
                        etm: 'LANDSAT-7-ETM+',
                        tm: null,
                        mss: null
                    },
                    cloud: 'CloudCover',
                    cloudFactor: 1,
                    sunAlt: 'SunElevation',
                    sunAz: 'SunAzimuth',
                    downloadSize: 2000 
                },

                // Height limits and offset off the ground.
                RADIUS: 6378137,
                OFFSET: 20000,
                HEIGHT: 2000000,

                // Downloading state and cancel flag.
                _cancelDownload: true,
                isDownloading: false,

                // Curent sorting properties
                _setting: null,
                _sortField: 'date',
                _sortOrder: 'descending', // or 'ascending'/'descending'

                // The image current under the mouse.
                _intersected: null,
                _selected: null,

                // Webgl setup.
                setup: function (context) {
                    // Store view
                    this.view = context.view;

                    // Create the THREE.js webgl renderer
                    this.renderer = new THREE.WebGLRenderer({
                        context: context.gl,
                        premultipliedAlpha: false
                    });

                    // Define renderer size and ratio.
                    this.renderer.setPixelRatio(window.devicePixelRatio);
                    this.renderer.setSize(
                        this.view.size[0],
                        this.view.size[1]
                    );

                    // Make sure it does not clear anything before rendering
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

                    // Instanciate scene and camera.
                    this.scene = new THREE.Scene();
                    this.images = new THREE.Group();
                    this.box = new THREE.Group();
                    this.camera = new THREE.PerspectiveCamera();

                    // Create both a directional light, as well as an ambient light.
                    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
                    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
                    this.scene.add(
                        this.directionalLight,
                        this.ambientLight,
                        this.images,
                        this.box
                    );

                    // Initialize the raycaster used for highlighting images.
                    this.raycaster = new THREE.Raycaster();

                    // Animation environment
                    this.mixer = new THREE.AnimationMixer(this.scene);
                    this.clock = new THREE.Clock(true);

                    // cleanup after ourselves
                    context.resetWebGLState();

                    // Update renderer size and ratio on window resize.
                    this.view.on('resize', function (e) {
                        this.camera.aspect = e.width / e.height;
                        this.camera.updateProjectionMatrix();
                        this.renderer.setSize(e.width, e.height);
                    }.bind(this));

                    // Perform raycasting on mouse move.
                    this.mouse = new THREE.Vector2();
                    this.view.on('pointer-move', function (e) {
                        this.mouse.x = (e.x / this.view.width) * 2 - 1;
                        this.mouse.y = -(e.y / this.view.height) * 2 + 1;
                    }.bind(this));
                },
                click: function (e) {
                    // Stop event propogation
                    e.stopPropagation();

                    // Find intersecting image.
                    this.raycaster.setFromCamera(this.mouse, this.camera);
                    var intersects = this.raycaster.intersectObjects(this.images.children);
                    if (intersects.length === 0) {
                        if (this._selected !== null) {
                            this._selected.material.emissive.setHex(0);
                        }
                        this._selected = null;
                        this.view.popup.close();
                        return;
                    }

                    // Get plane and store plane.
                    var plane = intersects[0].object;
                    if (this._selected === plane) {
                        return;
                    }
                    if (this._selected !== null && this._selected !== plane) {
                        this._selected.material.emissive.setHex(0);
                    }
                    this._selected = plane;
                    this._selected.material.emissive.setHex(0xffa500);

                    // Get intersection in geographic coordinates.
                    var internal = [
                        intersects[0].point.x,
                        intersects[0].point.y,
                        intersects[0].point.z
                    ];
                    var geographic = new Array(3);
                    ExternalRenderers.fromRenderCoordinates(
                        this.view,
                        internal,
                        0,
                        geographic,
                        0,
                        SpatialReference.WGS84,
                        1
                    );

                    //
                    var content = string.substitute(
                        '<div>' +
                        '<div><div class="rc-popup-heading">Name</div><div class="rc-popup-value">${name}</div></div>' +
                        '<div><div class="rc-popup-heading">Id</div><div class="rc-popup-value">${id}</div></div>' +
                        '<div><div class="rc-popup-heading">Date</div><div class="rc-popup-value">${date} ${time}</div></div>' +
                        '<div><div class="rc-popup-heading">Sensor</div><div class="rc-popup-value">${sensor}</div></div>' +
                        '<div><div class="rc-popup-heading">Cloud</div><div class="rc-popup-value">${cloud}</div></div>' +
                        '<div><div class="rc-popup-heading">Sun Alt</div><div class="rc-popup-value">${sunalt}</div></div>' +
                        '<div><div class="rc-popup-heading">Sun Az</div><div class="rc-popup-value">${sunaz}</div></div>' +
                        '</div>', {
                            name: plane.userData.attributes.name,
                            id: plane.userData.attributes.id,
                            date: (new Date(plane.userData.attributes.date)).toLocaleDateString(),
                            time: (new Date(plane.userData.attributes.date)).toLocaleTimeString(),
                            sensor: plane.userData.attributes.sensor,
                            cloud: number.format(plane.userData.attributes.cloud / this._setting.cloudFactor, {
                                type: 'percent',
                                places: 0
                            }),
                            sunalt: deg_to_dms(plane.userData.attributes.sunAlt),
                            sunaz: deg_to_dms(plane.userData.attributes.sunAz)
                        });

                    //
                    this.view.popup.open({
                        content: $(content)[0],
                        location: geographic,
                        title: 'Landsat Scene'
                    });

                    this.view.popup.watch('visible', function (v) {
                        if (!v) {
                            if (this._selected) {
                                this._selected.material.emissive.setHex(0);
                            }
                            this._selected = null;
                        }
                    }.bind(this));
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
                    if (this.mixer) {
                        this.mixer.update(this.clock.getDelta());
                    }

                    // Highlight images under mouse.
                    this.raycaster.setFromCamera(this.mouse, this.camera);
                    var intersects = this.raycaster.intersectObjects(this.images.children);
                    if (intersects.length > 0) {
                        if (this._intersected !== intersects[0].object) {
                            // Remove highlight from previous image (if any).
                            if (this._intersected) {
                                if (this._intersected !== this._selected) {
                                    this._intersected.material.emissive.setHex(0);
                                }
                                // Remove boxing graphics.
                                this.box.children.slice().forEach(function (e) {
                                    this.box.remove(e);
                                }.bind(this));
                            }

                            // Highlight image.
                            this._intersected = intersects[0].object;
                            if (this._intersected !== this._selected) {
                                this._intersected.material.emissive.setHex(0x00ffff);
                            }
                            // Draw box to Earth.
                            var v = this._intersected.position;
                            var p = this._intersected.geometry.getAttribute('position');
                            var m = this._intersected.matrixWorld;

                            // Add box around image.
                            /*
                                  5____4
                                1/___0/|
                                | 6__|_7
                                2/___3/
                                0: max.x, max.y, max.z
                                1: min.x, max.y, max.z
                                2: min.x, min.y, max.z
                                3: max.x, min.y, max.z
                                4: max.x, max.y, min.z
                                5: min.x, max.y, min.z
                                6: min.x, min.y, min.z
                                7: max.x, min.y, min.z
                            */

                            var min = new THREE.Vector3(p.array[6], p.array[7], this.RADIUS + this.OFFSET - v.length());
                            var max = new THREE.Vector3(p.array[3], p.array[4], 0);
                            var indices = new Uint16Array([0, 1, 1, 2, 2, 3, 3, 0, 4, 5, 5, 6, 6, 7, 7, 4, 0, 4, 1, 5, 2, 6, 3, 7]);
                            var positions = new Float32Array([
                                [max.x], [max.y], [max.z],
                                [min.x], [max.y], [max.z],
                                [min.x], [min.y], [max.z],
                                [max.x], [min.y], [max.z],
                                [max.x], [max.y], [min.z],
                                [min.x], [max.y], [min.z],
                                [min.x], [min.y], [min.z],
                                [max.x], [min.y], [min.z]
                            ]);
                            var geometry = new THREE.BufferGeometry();
                            geometry.setIndex(new THREE.BufferAttribute(indices, 1));
                            geometry.addAttribute('position', new THREE.BufferAttribute(positions, 3));
                            var linesegment = new THREE.LineSegments(
                                geometry,
                                new THREE.LineBasicMaterial({
                                    color: 0xffffff,
                                    linewidth: 1,
                                    opacity: 0.5,
                                    transparent: true
                                })
                            );

                            linesegment.applyMatrix(m);
                            this.box.add(linesegment);
                        }
                    } else {
                        if (this._intersected) {
                            // Remove highlight from image.
                            if (this._intersected !== this._selected) {
                                this._intersected.material.emissive.setHex(0);
                            }
                            // Remove boxing graphics.
                            this.box.children.length = 0;
                        }
                        this._intersected = null;
                    }

                    // Render the scene
                    this.renderer.resetGLState();
                    this.renderer.render(this.scene, this.camera);

                    // as we want to smoothly animate the ISS movement, immediately request a re-render
                    ExternalRenderers.requestRender(this.view);

                    // cleanup
                    context.resetWebGLState();
                },
                cancelDownload: function () {
                    // If user clicked the Cancel button then enable cancellation flag.
                    this._cancelDownload = true;
                },
                clear: function () {
                    this.box.children.slice().forEach(function (e) {
                        this.box.remove(e);
                    }.bind(this));
                    this.images.children.slice().forEach(function (e) {
                        this.images.remove(e);
                    }.bind(this));
                    this._intersected = null;
                    this._selected = null;
                    this.view.popup.close();
                },
                filter: function (bottom, top) {
                    var min = bottom * this.HEIGHT + this.OFFSET + this.RADIUS;
                    var max = top * this.HEIGHT + this.OFFSET + this.RADIUS;
                    this.images.children.forEach(function (plane) {
                        var length = plane.position.length();
                        var visible = length >= min && length <= max;
                        if (plane.visible !== visible) {
                            plane.visible = visible;
                        }
                    });

                },
                sort: function (field, order) {
                    //
                    this._sortField = field;
                    this._sortOrder = order;

                    //
                    this.mixer.stopAllAction();

                    //
                    this.images.children.forEach(function (plane) {
                        // Remove previous actions associated with this root.
                        this.mixer.uncacheRoot(plane);

                        // Just in case the plane is semi-transparent.
                        plane.material.opacity = 1;

                        //
                        var action = this.mixer.clipAction(
                            new THREE.AnimationClip('action', 1, [
                                new THREE.VectorKeyframeTrack(
                                    '.position', [0, 1], [
                                        plane.position.x,
                                        plane.position.y,
                                        plane.position.z,
                                        plane.userData.positions[field][order].x,
                                        plane.userData.positions[field][order].y,
                                        plane.userData.positions[field][order].z
                                    ],
                                    THREE.InterpolateSmooth
                                )
                            ]),
                            plane
                        );
                        action.setDuration(1);
                        action.setLoop(THREE.LoopOnce);
                        action.startAt(this.mixer.time + Math.random() * 0.5);
                        action.clampWhenFinished = true;
                        action.play();
                    }.bind(this));
                },
                download: function (setting, parameters, progress, completed) {
                    // Initialized user cancellation flag.
                    this.isDownloading = true;
                    this._cancelDownload = false;
                    this._setting = setting;

                    // Instanciate image layer
                    var layer = new ImageryLayer({
                        url: setting.url
                    });

                    // Load layer. Required to get objectid field.
                    layer.load().then(function () {
                        // Get objectid field
                        var oidField = layer.objectIdField;

                        // Compile list of sensors.
                        var sensors = '';
                        if (parameters.sensors.oli && setting.sensors.oli) {
                            if (sensors != '') { sensors += ',' }
                            sensors += '\'' + setting.sensors.oli + '\'';
                        }
                        if (parameters.sensors.etm && setting.sensors.etm) {
                            if (sensors != '') { sensors += ',' }
                            sensors += '\'' + setting.sensors.etm + '\'';
                        }
                        if (parameters.sensors.tm && setting.sensors.tm) {
                            if (sensors != '') { sensors += ',' }
                            sensors += '\'' + setting.sensors.tm + '\'';
                        }
                        if (parameters.sensors.mss && setting.sensors.mss) {
                            if (sensors != '') { sensors += ',' }
                            sensors += '\'' + setting.sensors.mss + '\'';
                        }

                        // Build where clause.
                        var where = string.substitute(
                            '(${fieldDate} >= date\'${dateFrom}-01-01\' AND ' +
                            '${fieldDate} <= date\'${dateTo}-01-01\') AND ' +
                            '(${fieldCloud} <= ${cloud}) AND ' +
                            '(${fieldSensor} in (${sensors}))', {
                                fieldDate: setting.date,
                                fieldCloud: setting.cloud,
                                fieldSensor: setting.sensor,
                                dateFrom: parameters.date.from,
                                dateTo: parameters.date.to,
                                cloud: parameters.cloud * setting.cloudFactor,
                                sensors: sensors
                            });

                        // Query 
                        var query = new Query({
                            geometry: parameters.extent,
                            returnGeometry: true,
                            outFields: [
                                setting.name,
                                setting.date,
                                setting.sensor,
                                setting.cloud,
                                setting.sunAlt,
                                setting.sunAz
                            ],
                            orderByFields: [
                                setting.date + ' ASC'
                            ],
                            outSpatialReference: this.view.spatialReference,
                            where: where,
                            start: 0,
                            num: 1000
                        });

                        // Query task
                        var queryTask = new QueryTask({
                            url: setting.url
                        });
                        queryTask.execute(query).then(function (e) {
                            // Zoom to full extent
                            this.view.goTo({
                                target: parameters.extent.clone().set({
                                    zmin: 0,
                                    zmax: this.HEIGHT * 2
                                }),
                                heading: 0,
                                tilt: 25
                            }, {
                                    animate: true,
                                    duration: 2000
                                });

                            // Sortable fields.
                            var fields = [
                                'date',
                                'cloud',
                                'sunAlt',
                                'sunAz'
                            ];

                            // Get min/max for all variables
                            var bounds = {};
                            fields.forEach(function (field) {
                                var values = e.features.map(function (f) {
                                    return f.attributes[setting[field]];
                                });
                                bounds[field] = {
                                    min: Math.min.apply(null, values),
                                    max: Math.max.apply(null, values)
                                };
                            });

                            //
                            if (e.features.length === 0) {
                                // Nothing to download!
                                this.isDownloading = false;
                                if (completed) {
                                    completed();
                                }
                            }
                            else {
                                // Download and animate a preview image for every footprint.
                                e.features.forEach(function (f) {
                                    // Footprint extent
                                    var extent = f.geometry.extent;
                                    var id = f.attributes[oidField];
                                    var rf = new RasterFunction(setting.rasterFunction);
                                    var wkid = this.view.spatialReference.wkid;

                                    // Construct url to lock raster image
                                    function getUrl(size, format) {
                                        var url = setting.url;
                                        url += string.substitute('/${id}/image?f=image', {
                                            id: id
                                        });
                                        url += string.substitute('&bbox=${xmin},${ymin},${xmax},${ymax}', {
                                            xmin: extent.xmin,
                                            ymin: extent.ymin,
                                            xmax: extent.xmax,
                                            ymax: extent.ymax
                                        });
                                        url += '&bboxSR=' + wkid;
                                        url += '&imageSR=' + wkid;
                                        url += '&format=' + format;
                                        url += '&interpolation=' + 'RSP_BilinearInterpolation';
                                        url += string.substitute('&size=${w},${h}', {
                                            w: size,
                                            h: size
                                        });
                                        url += '&renderingRule=' + JSON.stringify(rf.toJSON());
                                        return url;
                                    }

                                    // Get thumbnail and download urls
                                    var thumbnail = getUrl(parameters.resolution, 'png');
                                    var download = getUrl(setting.downloadSize, 'jpg');

                                    //
                                    var loader = new THREE.TextureLoader();
                                    loader.setCrossOrigin('');
                                    loader.load(
                                        thumbnail,
                                        function (texture) {
                                            // Exit if user cancelled image loading.
                                            if (this._cancelDownload) {
                                                this.isDownloading = false;
                                                if (completed) {
                                                    completed();
                                                }
                                                return;
                                            }

                                            // Center coordinate array
                                            var coordinates = [
                                                extent.center.x,
                                                extent.center.y,
                                                0
                                            ];

                                            // Transform to internal rendering space
                                            var transform = ExternalRenderers.renderCoordinateTransformAt(
                                                this.view,
                                                coordinates,
                                                f.geometry.spatialReference,
                                                new Float64Array(16)
                                            );
                                            var matrix = new THREE.Matrix4();
                                            matrix.fromArray(transform);

                                            // Create plane geometry.
                                            var geometry = new THREE.PlaneBufferGeometry(
                                                extent.width,
                                                extent.height,
                                                1,
                                                1
                                            );

                                            // Create textured material.
                                            var material = new THREE.MeshLambertMaterial({
                                                map: texture,
                                                side: THREE.DoubleSide,
                                                transparent: true,
                                                opacity: 0,
                                                emissiveIntensity: 0.5
                                            });

                                            // Create a plane mesh from the geometry and material.
                                            var plane = new THREE.Mesh(geometry, material);
                                            plane.position.fromArray(coordinates);
                                            plane.applyMatrix(matrix);
                                            plane.userData.attributes = {
                                                id: id,
                                                name: f.attributes[setting.name],
                                                date: f.attributes[setting.date],
                                                sensor: f.attributes[setting.sensor],
                                                cloud: f.attributes[setting.cloud],
                                                sunAlt: f.attributes[setting.sunAlt],
                                                sunAz: f.attributes[setting.sunAz],
                                                thumbnail: thumbnail,
                                                download: download
                                            };

                                            // Pre-calculate all heights.
                                            var positions = {};
                                            var normal = plane.position.clone().normalize();
                                            fields.forEach(function (field) {
                                                var val = f.attributes[setting[field]];
                                                var min = bounds[field].min;
                                                var max = bounds[field].max;
                                                var asc = null;
                                                var dsc = null;
                                                if (min === max) {
                                                    asc = this.OFFSET;
                                                    dsc = this.OFFSET;
                                                }
                                                else {
                                                    var fac = min === max ? 0 : (val - min) / (max - min);
                                                    asc = (1 - fac) * this.HEIGHT + this.OFFSET;
                                                    dsc = fac * this.HEIGHT + this.OFFSET;
                                                }

                                                var ascending = plane.position.clone();
                                                var descending = plane.position.clone();
                                                ascending.addScaledVector(normal, asc);
                                                descending.addScaledVector(normal, dsc);

                                                positions[field] = {
                                                    ascending: ascending,
                                                    descending: descending
                                                };
                                            }.bind(this));
                                            plane.userData.positions = positions;

                                            // Add to scene
                                            this.images.add(plane);

                                            // For the first animation 
                                            var end = plane.userData.positions[this._sortField][this._sortOrder];
                                            var start = end.clone();
                                            start.addScaledVector(normal, -this.HEIGHT / 5);

                                            // Create an animation action to move preview image into place.
                                            var action = this.mixer.clipAction(
                                                new THREE.AnimationClip('action', 1, [
                                                    new THREE.VectorKeyframeTrack(
                                                        '.position', [0, 1], [
                                                            start.x,
                                                            start.y,
                                                            start.z,
                                                            end.x,
                                                            end.y,
                                                            end.z
                                                        ],
                                                        THREE.InterpolateSmooth
                                                    ),
                                                    new THREE.NumberKeyframeTrack(
                                                        '.material[opacity]', [0, 1], [0, 1]
                                                    )
                                                ]),
                                                plane
                                            );
                                            action.setDuration(1);
                                            action.setLoop(THREE.LoopOnce);
                                            action.startAt(this.mixer.time);
                                            action.clampWhenFinished = true;
                                            action.play();

                                            // Increment progressed counter.
                                            var processed = this.images.children.length;
                                            var total = e.features.length;

                                            // Fire progress event.
                                            if (progress) {
                                                progress({
                                                    index: processed,
                                                    length: total
                                                });
                                            }

                                            // Fire completed event.
                                            if (processed === total) {
                                                this.isDownloading = false;
                                                if (completed) {
                                                    completed();
                                                }
                                            }
                                        }.bind(this)
                                    );
                                }.bind(this));
                            }
                        }.bind(this));
                    }.bind(this));
                }
            };
        });
    }
);
