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

define([
    'esri/Camera',
    'esri/geometry/SpatialReference',
    'esri/geometry/support/webMercatorUtils',
    'esri/geometry/Extent',
    'esri/core/declare',
    'esri/layers/ImageryLayer',
    'esri/views/3d/externalRenderers',
    'esri/tasks/support/Query',
    'esri/tasks/QueryTask',
    'esri/request',
    'dojo/_base/lang',
    'dojo/string',
    'dojo/request'
], function (
    Camera,
    SpatialReference,
    webMercatorUtils,
    Extent,
    declare,
    ImageryLayer,
    externalRenderers,
    Query,
    QueryTask,
    esriRequest,
    lang,
    string,
    request
) {
        // Enforce strict mode
        'use strict';

        // Constants
        var THREE = window.THREE;
        var RADIUS = 6378137;
        var SIZE = 256;

        return declare([], {
            constructor: function () {
                //
            },
            setup: function (context) {
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

                // Create objects and add them to the scene
                this._createObjects();

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
            dispose: function (content) { },
            _createObjects: function () {
                //// Add to scene
                //this.scene.add(
                //    this.normal,
                //    this.selected,
                //    this.hover,
                //    this.trajectory,
                //    this.identified
                //);
            },
            _updateObjects: function (context) {
                //// Code to update all satellite positions every cycle.
                //var positions = this.normal.geometry.getAttribute('position');
                //for (var i = 0; i < this.index.length; i++) {
                //    var index = this.index[i];
                //    var satellite = this.satellites[index];
                //    var eci = this._getSatelliteLocation(satellite.satrec, new Date());
                //    if (eci === null || eci === undefined || isNaN(eci.x) || isNaN(eci.y) || isNaN(eci.z)) {
                //        continue;
                //    }
                //    positions.setXYZ(
                //        this.refreshIndex,
                //        eci.x * 1000,
                //        eci.y * 1000,
                //        eci.z * 1000
                //    );
                //}
                //positions.needsUpdate = true;
            },
            downloadLandsat: function (setting, extent) {
                // Get a new references to view
                var view = this.view;
                var scene = this.scene;

                // Instanciate image layer
                var layer = new ImageryLayer({
                    url: setting.url
                });

                var h = 0;

                // Load layer. Required to get objectid field.
                layer.load().then(function (e) {
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
                        where: 'CloudCover <= 20'//,
                        //num: 1
                    });

                    // Query task
                    var queryTask = new QueryTask({
                        url: setting.url
                    });
                    queryTask.execute(query).then(function (e) {
                        e.features.forEach(function (f) {
                            // Footprint extent
                            var extent = f.geometry.extent;
                            var id = f.attributes[oidField];

                            // Construct url to lock raster image
                            var url = setting.url;
                            url += '/exportImage?f=json';
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
                            url += '&renderingRule=' + string.substitute('{rasterFunction:\'${fxn}\'}', {
                                fxn: setting.function
                            });

                            // 
                            request(url, {
                                handleAs: 'json',
                                headers: {
                                    // Required for CORS
                                    'X-Requested-With': null
                                }
                            }).then(function (json) {
                                // Get corrected extent
                                var extent2 = Extent.fromJSON(json.extent);

                                // Instantiate a loader
                                var loader = new THREE.TextureLoader();
                                loader.setCrossOrigin('');
                                loader.load(
                                    json.href,
                                    function (texture) {
                                        // Center coordinate array
                                        var coordinates = [
                                            extent2.center.x,
                                            extent2.center.y,
                                            ++h * 10000
                                        ];

                                        // Transform to internal rendering space
                                        var transform = externalRenderers.renderCoordinateTransformAt(
                                            view,
                                            coordinates,
                                            f.geometry.spatialReference,
                                            new Float64Array(16)
                                        );
                                        var matrix = new THREE.Matrix4();
                                        matrix.fromArray(transform);

                                        // Create three.js object
                                        var geometry = new THREE.PlaneBufferGeometry(
                                            extent2.width,
                                            extent2.height,
                                            1,
                                            1
                                        );

                                        // do something with the texture
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
                                    }
                                );
                            });
                        });
                    });
                });
            }
        });
    }
);
