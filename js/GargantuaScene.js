import * as THREE from 'three';

class GargantuaSimulation {
    constructor() {
        this.canvas = document.getElementById('gl-canvas');
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

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

        this.init();
    }

    async init() {
        try {
            const fragmentShader = await this.loadShader('/glsl/gargantua_fragment.glsl');
            this.createScreenQuad(fragmentShader);
            this.addEventListeners();
            this.animate();
            console.log("Gargantua Simulation Initialized. Status: Nominal.");
        } catch (error) {
            console.error("Fatal error during simulation initialization:", error);
            document.getElementById('info').innerHTML = `<p style="color: red;"><strong>FATAL ERROR:</strong> ${error.message}</p>`;
        }
    }

    async loadShader(url) {
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Failed to load shader: ${response.statusText}`);
        }
        return response.text();
    }

    createScreenQuad(fragmentShader) {
        const geometry = new THREE.PlaneGeometry(2, 2);
        const material = new THREE.ShaderMaterial({
            fragmentShader,
            uniforms: this.uniforms,
        });
        const quad = new THREE.Mesh(geometry, material);
        this.scene.add(quad);
    }

    addEventListeners() {
        window.addEventListener('resize', this.onResize.bind(this));
        window.addEventListener('mousemove', this.onMouseMove.bind(this));
    }

    onResize() {
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
    }

    onMouseMove(event) {
        this.mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
        this.mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
    }

    updateCameraMatrix() {
        // Erzeuge eine temporäre Kamera, um die Rotationsmatrix zu berechnen
        const tempCam = new THREE.PerspectiveCamera();
        const target = new THREE.Vector3(0, 0, 0);

        // Die Mausbewegung steuert eine leichte "Look-Around"-Bewegung
        const lookAroundOffset = new THREE.Vector3(this.mouse.x * 0.2, this.mouse.y * 0.2, 0);
        tempCam.position.copy(this.uniforms.u_camera_pos.value);
        tempCam.lookAt(target.add(lookAroundOffset));
        tempCam.updateMatrixWorld();
        
        // Extrahiere die 3x3 Rotationsmatrix und übergebe sie an den Shader
        this.uniforms.u_camera_mat.value.setFromMatrix4(tempCam.matrixWorld);
    }

    animate() {
        requestAnimationFrame(this.animate.bind(this));

        this.uniforms.u_time.value = this.clock.getElapsedTime();
        this.updateCameraMatrix();
        
        this.renderer.render(this.scene, this.camera);
    }
}

// Simulation starten
new GargantuaSimulation();
