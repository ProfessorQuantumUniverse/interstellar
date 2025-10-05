import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { GargantuaScene } from './GargantuaScene.js';

// --- Manager Klassen (vereinfacht für Übersicht) ---
class ShaderManager {
    constructor() { this.shaders = {}; }
    async load(name, url) {
        try {
            const res = await fetch(url);
            if (!res.ok) throw new Error(`Shader ${name} not found at ${url}`);
            this.shaders[name] = await res.text();
        } catch(e) { console.error(e); this.shaders[name] = 'void main() { gl_FragColor = vec4(1.0, 0.0, 1.0, 1.0); }'; }
    }
    get(name) { return this.shaders[name]; }
}

class WorldManager {
    constructor(scene) { this.scene = scene; this.objects = {}; }
    add(name, object) { this.objects[name] = object; this.scene.add(object); }
    get(name) { return this.objects[name]; }
    hideAll() { for (const obj of Object.values(this.objects)) obj.visible = false; }
    showAll() { for (const obj of Object.values(this.objects)) obj.visible = true; }
}

// --- Hauptanwendung ---
class App {
    constructor() {
        this.canvas = document.querySelector('#bg');
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 5000);
        this.renderer = new THREE.WebGLRenderer({ canvas: this.canvas, antialias: true, powerPreference: "high-performance" });
        
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping;

        this.world = new WorldManager(this.scene);
        this.shaders = new ShaderManager();
        this.clock = new THREE.Clock();
        gsap.registerPlugin(ScrollTrigger);

        this.activeScene = 'main'; // 'main', 'gargantua', 'wormhole', 'tesseract'
        this.init();
    }

    async init() {
        await this.loadAssets();
        
        this.gargantuaScene = new GargantuaScene(this.renderer);
        await this.gargantuaScene.init();

        this.createWorldObjects();
        this.setupScrollAnimations();
        this.setupPlanetInteraction();
        
        window.addEventListener('resize', this.onResize.bind(this));
        this.animate();
        gsap.to('#loading-screen', { opacity: 0, duration: 1.5, onComplete: (el) => el.style.display = 'none' });
        console.log("Interstellar Experience Initialized. All systems nominal.");
    }

    async loadAssets() {
        await Promise.all([
            this.shaders.load('wormhole', './glsl/wormhole_fragment.glsl'),
            this.shaders.load('tesseract_vertex', './glsl/tesseract_vertex.glsl'),
            this.shaders.load('tesseract_fragment', './glsl/tesseract_fragment.glsl')
        ]);
    }

    createWorldObjects() {
        // Lichter
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.3));
        const sun = new THREE.DirectionalLight(0xffffff, 2.0);
        sun.position.set(100, 10, 100);
        this.scene.add(sun);

        // Sternenfeld
        const starsGeometry = new THREE.BufferGeometry();
        const starsVertices = [];
        for (let i = 0; i < 20000; i++) starsVertices.push(THREE.MathUtils.randFloatSpread(4000));
        starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
        const stars = new THREE.Points(starsGeometry, new THREE.PointsMaterial({ color: 0xffffff, size: 0.9, blending: THREE.AdditiveBlending, transparent: true }));
        this.world.add('stars', stars);

        // Planeten
        const planets = [
            { name: 'miller', color: 0x0077ff, size: 15, pos: [-150, 50, -300] },
            { name: 'mann', color: 0xe0f7fa, size: 20, pos: [180, -80, -400] },
            { name: 'edmunds', color: 0xcf893d, size: 18, pos: [50, 120, -550] }
        ];
        planets.forEach(p => {
            const planet = new THREE.Mesh(new THREE.SphereGeometry(p.size, 64, 64), new THREE.MeshStandardMaterial({ color: p.color, roughness: 0.8 }));
            planet.position.set(...p.pos);
            this.world.add(p.name, planet);
        });

        // Shader Effekte als Meshes
        this.shaderScene = new THREE.Scene();
        this.shaderCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);

        const planeGeom = new THREE.PlaneGeometry(2, 2);
        this.wormholeEffect = new THREE.Mesh(planeGeom, new THREE.ShaderMaterial({ fragmentShader: this.shaders.get('wormhole'), uniforms: { u_time: { value: 0 }, u_progress: { value: 0 }, u_resolution: { value: new THREE.Vector2() } } }));
        this.tesseractEffect = new THREE.Mesh(planeGeom, new THREE.ShaderMaterial({ vertexShader: this.shaders.get('tesseract_vertex'), fragmentShader: this.shaders.get('tesseract_fragment'), uniforms: { u_time: { value: 0 }, u_progress: { value: 0 }, u_scale: { value: 1.0 } }, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
        
        this.shaderScene.add(this.wormholeEffect);
        this.shaderScene.add(this.tesseractEffect);
    }
    
    setupScrollAnimations() {
        const tl = gsap.timeline({
            scrollTrigger: { trigger: '#content', start: "top top", end: "bottom bottom", scrub: 1.5 }
        });

        // Erde -> Endurance
        tl.fromTo(this.camera.position, { z: 10 }, { z: 250 }, "start")
          .to(this.camera.position, { x: 50, y: 20, z: 150 }, "endurance")
          .to(this.camera.rotation, { y: Math.PI / 8 }, "endurance")
        
        // -> Wurmloch
          .to(this.camera.position, { x: 0, y: 0, z: 50 }, "wormhole_entry")
          .to(this.camera.rotation, { x: 0, y: 0 }, "wormhole_entry")
          .to(this.world.get('stars').material, { opacity: 0.1 }, "wormhole_entry")
          .call(() => this.activeScene = 'wormhole', [], "wormhole_entry")
          .to(this.wormholeEffect.material.uniforms.u_progress, { value: 1.0 }, "wormhole_flight")
          .call(() => this.activeScene = 'main', [], "wormhole_exit")
          .to(this.world.get('stars').material, { opacity: 1.0 }, "wormhole_exit")

        // -> Planeten
          .to(this.camera.position, { x: 0, y: 0, z: 0 }, "planets")
          .to(this.camera.rotation, { x: 0, y: 0, z: 0 }, "planets")
          .add("planet_view_end")

        // -> Gargantua
          .to(this.camera.position, { x: 0, y: 1.5, z: 8.0, ease: "power2.in" }, "gargantua_approach")
          .call(() => { this.world.hideAll(); this.activeScene = 'gargantua'; }, [], "gargantua_arrival")
          .to({}, { duration: 1.5 }) // Haltezeit

        // -> Tesserakt
          .call(() => { this.activeScene = 'tesseract'; }, [], "tesseract_entry")
          .to({}, { duration: 2.0 }) // Haltezeit
          
        // -> Epilog
          .call(() => { this.activeScene = 'main'; this.world.showAll(); }, [], "epilogue")
          .to(this.camera.position, { x: 0, y: 0, z: -500, ease: "power2.in" }, "epilogue")
          .to(this.world.get('stars').material, { opacity: 0.1 }, "epilogue");
    }

    setupPlanetInteraction() { /* Implementierung wie in vorheriger Antwort */ }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.gargantuaScene.onResize();
        this.wormholeEffect.material.uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const elapsedTime = this.clock.getElapsedTime();

        this.renderer.autoClear = false;
        this.renderer.clear();

        switch(this.activeScene) {
            case 'gargantua':
                this.gargantuaScene.animate();
                break;
            case 'wormhole':
                this.wormholeEffect.material.uniforms.u_time.value = elapsedTime;
                this.renderer.render(this.shaderScene, this.shaderCam);
                break;
            case 'tesseract':
                // Hier würde die Tesserakt-Logik (Shader-Updates) stehen
                // Vorerst ein Platzhalter-Effekt
                this.renderer.render(this.scene, this.camera); // Render placeholder
                break;
            default: // 'main'
                this.world.get('stars').rotation.y += 0.0001;
                this.renderer.render(this.scene, this.camera);
        }
    }
}

new App();