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
require(
    {
        packages: [{
            name: 'app',
            location: document.location.pathname + '/..'
        }]
    },
    [
        'app/LandsatRenderer',
        'esri/Map',
        'esri/geometry/ScreenPoint',
        'esri/geometry/Extent',
        'esri/views/SceneView',
        'esri/views/3d/externalRenderers',
        'esri/tasks/QueryTask',
        'esri/tasks/support/Query',
        'dojo/domReady!'
    ],
    function (
        LandsatRenderer,
        Map,
        ScreenPoint,
        Extent,
        SceneView,
        ExternalRenderers,
        QueryTask,
        Query
    ) {
        $(document).ready(function () {
            // Enforce strict mode
            'use strict';

            //
            var IMAGERY = [
                {
                    provider: 'USGS',
                    url: 'https://landsatlook.usgs.gov/arcgis/rest/services/LandsatLook/ImageServer',
                    //objectid: 'OBJECTID',
                    date: 'acquisitionDate',
                    sensor: 'sensor',
                    cloud: 'cloudCover'
                },
                {
                    provider: 'ESRI',
                    url: 'https://landsat2.arcgis.com/arcgis/rest/services/Landsat/PS/ImageServer',
                    //objectid: 'OBJECTID',
                    date: 'AcquisitionDate',
                    sensor: 'SensorName',
                    cloud: 'CloudCover'
                }
            ];

            // Entry point to the three.js rendering framework
            var _landsatRenderer = null;

            // Define map
            var _view = new SceneView({
                camera: {
                    position: {
                        x: -12826086,
                        y: 4055161,
                        z: 81190,
                        spatialReference: {
                            wkid: 102100
                        }
                    },
                    heading: 0,
                    tilt: 71
                },
                container: 'map',
                ui: {
                    components: [
                        'zoom',
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
                    starsEnabled : true
                }
            });

            // Perform display setup once the map is located.
            _view.then(function () {
                // Continue to refresh the display even if stationary.
                _view._stage.setRenderParams({
                    idleSuspend: false
                });

                // Load satellite layer
                _landsatRenderer = new LandsatRenderer();
                ExternalRenderers.add(
                    _view,
                    _landsatRenderer
                );
            });

            _view.on('click', function (e) {
                //
                //var h = e.native.target.height;
                //var s = _view._stage.pick([e.x, h - e.y], [], false);
                //var r = _view._computeMapPointFromIntersectionResult.call(_view, s.minResult);

                //
                //_landsatRenderer.addBox(e.mapPoint);
                var extent = new Extent({
                    xmin: e.mapPoint.x - 100,
                    ymin: e.mapPoint.y - 100,
                    xmax: e.mapPoint.x + 100,
                    ymax: e.mapPoint.y + 100,
                    spatialReference: e.mapPoint.spatialReference
                });
                _landsatRenderer.downloadLandsat(IMAGERY[1], extent);

            });
            //_view.on('drag', function (e) {
            //    // prevents panning with the mouse drag event
            //    e.stopPropagation();
            //});

        });
    }
);
