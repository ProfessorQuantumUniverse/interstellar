import * as THREE from 'three';

export class GargantuaScene {
    constructor(renderer) {
        this.renderer = renderer;
        this.scene = new THREE.Scene();
        this.camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        this.clock = new THREE.Clock();
        this.mouse = new THREE.Vector2(0, 0);

        this.uniforms = {
            u_time: { value: 0.0 },
            u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) },
            u_camera_pos: { value: new THREE.Vector3(0, 1.5, 8.0) },
            u_camera_mat: { value: new THREE.Matrix3() }
        };
        
        this.isInitialized = false;
    }

    async init() {
        if (this.isInitialized) return;
        try {
            const fragmentShader = await this.loadShader('./glsl/gargantua_fragment.glsl');
            this.createScreenQuad(fragmentShader);
            this.addEventListeners();
            this.onResize();
            this.isInitialized = true;
            console.log("Gargantua Module Initialized.");
        } catch (error) {
            console.error("Gargantua module initialization failed:", error);
        }
    }

    async loadShader(url) {
        const response = await fetch(url);
        if (!response.ok) throw new Error(`Failed to load shader: ${response.statusText}`);
        return response.text();
    }

    createScreenQuad(fragmentShader) {
        const geometry = new THREE.PlaneGeometry(2, 2);
        const material = new THREE.ShaderMaterial({ fragmentShader, uniforms: this.uniforms });
        const quad = new THREE.Mesh(geometry, material);
        this.scene.add(quad);
    }

    addEventListeners() {
        if (!this.listenersAdded) {
            window.addEventListener('resize', this.onResize.bind(this));
            window.addEventListener('mousemove', this.onMouseMove.bind(this));
            this.listenersAdded = true;
        }
    }

    onResize() {
        this.uniforms.u_resolution.value.set(this.renderer.domElement.width, this.renderer.domElement.height);
    }

    onMouseMove(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }

    updateCameraMatrix() {
        const tempCam = new THREE.PerspectiveCamera();
        const target = new THREE.Vector3(0, 0, 0);
        const lookAroundOffset = new THREE.Vector3(this.mouse.x * 0.2, this.mouse.y * 0.2, 0);
        tempCam.position.copy(this.uniforms.u_camera_pos.value);
        tempCam.lookAt(target.add(lookAroundOffset));
        tempCam.updateMatrixWorld();
        this.uniforms.u_camera_mat.value.setFromMatrix4(tempCam.matrixWorld);
    }

    animate() {
        if (!this.isInitialized) return;
        this.uniforms.u_time.value = this.clock.getElapsedTime();
        this.updateCameraMatrix();
        this.renderer.render(this.scene, this.camera);
    }
}