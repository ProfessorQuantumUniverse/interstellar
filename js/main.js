import * as THREE from 'three';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { GargantuaScene } from './GargantuaScene.js';
import { AudioManager } from './AudioManager.js';

// Postprocessing
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { FilmPass } from 'three/addons/postprocessing/FilmPass.js';

gsap.registerPlugin(ScrollTrigger);

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

        this.activeScene = 'main'; // 'main', 'gargantua', 'wormhole', 'tesseract'

        // Audio
        this.audio = new AudioManager();

        // PostFX
        this.initComposer();

        this.init();
    }

    initComposer() {
        this.composer = new EffectComposer(this.renderer);
        this.renderPass = new RenderPass(this.scene, this.camera);
        this.bloomPass = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.8, 0.4, 0.85);
        this.filmPass = new FilmPass(0.35, 0.05, 648, false);
        this.composer.addPass(this.renderPass);
        this.composer.addPass(this.bloomPass);
        this.composer.addPass(this.filmPass);
    }

    async init() {
        await this.loadAssets();
        
        this.gargantuaScene = new GargantuaScene(this.renderer);
        await this.gargantuaScene.init();

        this.createWorldObjects();
        this.setupScrollAnimations();
        this.setupPlanetInteraction();
        this.setupAudioUI();
        
        window.addEventListener('resize', this.onResize.bind(this));
        this.animate();

        gsap.to('#loading-screen', { opacity: 0, duration: 1.5, onComplete: () => {
            const el = document.querySelector('#loading-screen');
            if (el) el.style.display = 'none';
        }});
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
        // Lights
        this.scene.add(new THREE.AmbientLight(0xffffff, 0.25));
        const sun = new THREE.DirectionalLight(0xffffff, 1.6);
        sun.position.set(100, 10, 100);
        this.scene.add(sun);

        // Stars
        const starsGeometry = new THREE.BufferGeometry();
        const starsVertices = [];
        for (let i = 0; i < 6667; i++) {
            starsVertices.push(
                THREE.MathUtils.randFloatSpread(4000),
                THREE.MathUtils.randFloatSpread(4000),
                THREE.MathUtils.randFloatSpread(4000)
            );
        }
        starsGeometry.setAttribute('position', new THREE.Float32BufferAttribute(starsVertices, 3));
        const stars = new THREE.Points(starsGeometry, new THREE.PointsMaterial({ color: 0xffffff, size: 0.9, blending: THREE.AdditiveBlending, transparent: true, opacity: 0.95 }));
        this.world.add('stars', stars);

        // Planets
        const planets = [
            { name: 'miller', color: 0x0077ff, size: 15, pos: [-150, 50, -300] },
            { name: 'mann', color: 0xe0f7fa, size: 20, pos: [180, -80, -400] },
            { name: 'edmunds', color: 0xcf893d, size: 18, pos: [50, 120, -550] }
        ];
        planets.forEach(p => {
            const planet = new THREE.Mesh(
                new THREE.SphereGeometry(p.size, 64, 64),
                new THREE.MeshStandardMaterial({ color: p.color, roughness: 0.8, metalness: 0.05 })
            );
            planet.position.set(...p.pos);
            this.world.add(p.name, planet);
        });

        // Wormhole full-screen pass
        this.shaderScene = new THREE.Scene();
        this.shaderCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
        const planeGeom = new THREE.PlaneGeometry(2, 2);
        this.wormholeEffect = new THREE.Mesh(
            planeGeom,
            new THREE.ShaderMaterial({
                fragmentShader: this.shaders.get('wormhole'),
                uniforms: {
                    u_time: { value: 0 },
                    u_progress: { value: 0 },
                    u_resolution: { value: new THREE.Vector2(window.innerWidth, window.innerHeight) }
                }
            })
        );
        this.shaderScene.add(this.wormholeEffect);

        // Tesseract points effect
        // Build dynamically so shaders are loaded; fallback simple points if fail
        this.tesseractGroup = new THREE.Group();
        this.world.add('tesseract', this.tesseractGroup);
        this.tesseractGroup.visible = false;
        this.buildTesseract();
    }

    async buildTesseract() {
        try {
            const module = await import('./TesseractEffect.js');
            this.tesseract = new module.TesseractEffect();
            this.tesseractGroup.add(this.tesseract.points);
        } catch (e) {
            console.warn('Tesseract effect failed to build, using placeholder.', e);
            const placeholder = new THREE.Points(
                new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute([0,0,0], 3)),
                new THREE.PointsMaterial({ color: 0xffffff, size: 4 })
            );
            this.tesseractGroup.add(placeholder);
        }
    }

    setupScrollAnimations() {
        const tl = gsap.timeline({
            scrollTrigger: { trigger: '#content', start: "top top", end: "bottom bottom", scrub: 1.5 }
        });

        // Earth -> Endurance
        tl.fromTo(this.camera.position, { z: 10 }, { z: 250 }, "start")
          .to(this.camera.position, { x: 50, y: 20, z: 150 }, "endurance")
          .to(this.camera.rotation, { y: Math.PI / 8 }, "endurance")
        
        // -> Wormhole
          .to(this.camera.position, { x: 0, y: 0, z: 50 }, "wormhole_entry")
          .to(this.camera.rotation, { x: 0, y: 0 }, "wormhole_entry")
          .to(this.world.get('stars').material, { opacity: 0.1 }, "wormhole_entry")
          .call(() => { this.activeScene = 'wormhole'; this.audio.setScene('wormhole'); }, [], "wormhole_entry")
          .to(this.wormholeEffect.material.uniforms.u_progress, { value: 1.0 }, "wormhole_flight")
          .call(() => { this.activeScene = 'main'; this.audio.setScene('main'); }, [], "wormhole_exit")
          .to(this.world.get('stars').material, { opacity: 1.0 }, "wormhole_exit")

        // -> Planets fly-through
          .to(this.camera.position, { x: 0, y: 0, z: 0 }, "planets")
          .to(this.camera.rotation, { x: 0, y: 0, z: 0 }, "planets")
          .add("planet_view_end")

        // -> Gargantua
          .to(this.camera.position, { x: 0, y: 1.5, z: 8.0, ease: "power2.in" }, "gargantua_approach")
          .call(() => { this.world.hideAll(); this.activeScene = 'gargantua'; this.audio.setScene('gargantua'); }, [], "gargantua_arrival")
          .to({}, { duration: 1.5 }) // hold

        // -> Tesseract
          .call(() => {
                this.activeScene = 'tesseract';
                if (this.world.get('stars')) this.world.get('stars').visible = false;
                if (this.tesseractGroup) this.tesseractGroup.visible = true;
                this.audio.setScene('tesseract');
            }, [], "tesseract_entry")
          .to({ p: 0 }, {
                duration: 2.0,
                p: 1.0,
                onUpdate: function() {
                    if (this.tesseract && this.tesseract.uniforms) {
                        this.tesseract.uniforms.u_progress.value = this.targets()[0].p;
                    }
                }.bind(this)
            })
          
        // -> Epilogue
          .call(() => {
                this.activeScene = 'main';
                this.world.showAll();
                if (this.tesseractGroup) this.tesseractGroup.visible = false;
                this.audio.setScene('epilogue');
            }, [], "epilogue")
          .to(this.camera.position, { x: 0, y: 0, z: -500, ease: "power2.in" }, "epilogue")
          .to(this.world.get('stars').material, { opacity: 0.1 }, "epilogue");
    }

    setupPlanetInteraction() {
        const idList = ['miller','mann','edmunds'];
        idList.forEach(id => {
            const el = document.getElementById(id);
            if (!el) return;
            el.style.cursor = 'pointer';
            el.addEventListener('mouseenter', () => el.classList.add('hover'));
            el.addEventListener('mouseleave', () => el.classList.remove('hover'));
            el.addEventListener('click', () => {
                const planet = this.world.get(id);
                if (!planet) return;
                // Tween camera towards planet
                const offset = new THREE.Vector3(0, 20, 60);
                const targetPos = planet.position.clone().add(offset);
                gsap.to(this.camera.position, { duration: 2, x: targetPos.x, y: targetPos.y, z: targetPos.z, ease: 'power2.out' });
                const look = planet.position.clone();
                gsap.to({}, { duration: 2, onUpdate: () => {
                    this.camera.lookAt(look);
                }});
            });
        });
    }

    setupAudioUI() {
        const btn = document.getElementById('audio-toggle');
        if (!btn) return;
        btn.addEventListener('click', async () => {
            if (!this.audio.isEnabled) {
                await this.audio.enable();
                btn.innerText = 'Audio: ON';
            } else {
                // simple mute toggle
                this.audio.master.gain.value = this.audio.master.gain.value > 0 ? 0 : 0.7;
                btn.innerText = this.audio.master.gain.value > 0 ? 'Audio: ON' : 'Audio: OFF';
            }
        });
    }

    onResize() {
        this.camera.aspect = window.innerWidth / window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.composer.setSize(window.innerWidth, window.innerHeight);
        this.bloomPass.setSize(window.innerWidth, window.innerHeight);

        if (this.gargantuaScene) this.gargantuaScene.onResize();
        if (this.wormholeEffect) this.wormholeEffect.material.uniforms.u_resolution.value.set(window.innerWidth, window.innerHeight);
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        const elapsedTime = this.clock.getElapsedTime();
        const dt = this.clock.getDelta();

        // audio update
        this.audio.update(dt);

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
                if (this.tesseract) {
                    this.tesseract.update(elapsedTime);
                }
                this.renderer.render(this.scene, this.camera);
                break;
            default: // 'main'
                const stars = this.world.get('stars');
                if (stars) stars.rotation.y += 0.0002;
                this.composer.render();
        }
    }
}

new App();