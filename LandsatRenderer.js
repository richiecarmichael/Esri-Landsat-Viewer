define([
    'esri/Camera',
    'esri/geometry/SpatialReference',
    'esri/geometry/support/webMercatorUtils',
    'esri/core/declare',
    'esri/views/3d/externalRenderers'
], function (
    Camera,
    SpatialReference,
    webMercatorUtils,
    declare,
    externalRenderers
) {
        // Enforce strict mode
        'use strict';

        // Constants
        var THREE = window.THREE;
        var RADIUS = 6378137;

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

                //
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
            addBox: function (point) {

                var coordinates = [
                    point.x,
                    point.y,
                    point.z
                ];

                // Allocate storage for the result
                var renderCoordinates = new Array(
                    coordinates.length
                );

                externalRenderers.toRenderCoordinates(
                    this.view,
                    coordinates,
                    0,
                    SpatialReference.WebMercator,
                    renderCoordinates,
                    0,
                    coordinates.length / 3
                );

                //var geometry = new THREE.SphereGeometry(500, 32, 32);
                var geometry = new THREE.SphereBufferGeometry(12 * 1000, 16, 16);
                var material = new THREE.MeshBasicMaterial({ color: 0xffff00 });
                var sphere = new THREE.Mesh(geometry, material);
                sphere.position.set(
                    renderCoordinates[0],
                    renderCoordinates[1],
                    renderCoordinates[2]
                );
                //sphere.translateX = renderCoordinates[0];
                //sphere.translateY = renderCoordinates[1];
                //sphere.translateZ = renderCoordinates[2];
                this.scene.add(sphere);
            }
        });
    }
);
