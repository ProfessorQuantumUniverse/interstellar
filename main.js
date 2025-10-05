import * as THREE from 'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.module.js';
import { gsap } from 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.9.1/gsap.min.js';
import { ScrollTrigger } from 'https://cdnjs.cloudflare.com/ajax/libs/gsap/3.9.1/ScrollTrigger.min.js';

// --- Manager-Klassen für saubere Architektur ---

class WorldManager {
    constructor(scene) {
        this.scene = scene;
        this.objects = {}; // Hält alle 3D-Objekte wie Endurance, Planeten etc.
    }

    add(name, object) {
        this.objects[name] = object;
        this.scene.add(object);
    }

    // ... weitere Methoden zum Verwalten der Welt
}

class SoundManager {
    constructor(camera) {
        this.listener = new THREE.AudioListener();
        camera.add(this.listener);
        this.sounds = {};
        // ... Logik zum Laden und Steuern von Sounds
    }
    
    play(name, loop = false) {
        // ...
    }
}

class ShaderManager {
    constructor() {
        this.materials = {};
        // Hier laden wir die GLSL-Dateien für Wurmloch, Gargantua etc.
    }
}

class App {
    constructor() {
        this.scene = new THREE.Scene();
        this.camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 5000);
        this.renderer = new THREE.WebGLRenderer({
            canvas: document.querySelector('#bg'),
            antialias: true, // Wichtig für Qualität
            powerPreference: "high-performance"
        });
        
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.toneMapping = THREE.ACESFilmicToneMapping; // Für kinoreifen Look
        this.renderer.outputEncoding = THREE.sRGBEncoding;

        this.world = new WorldManager(this.scene);
        this.sound = new SoundManager(this.camera);
        this.shaders = new ShaderManager();
        
        gsap.registerPlugin(ScrollTrigger);

        this.init();
    }

    init() {
        this.addLights();
        this.createStars();
        this.setupSmoothScrolling();
        this.setupScrollAnimations();
        
        // Lade 3D-Modelle (z.B. Endurance)
        // Lade Shader, Sounds etc.
        
        this.animate();
        this.hideLoadingScreen();
    }

    addLights() {
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.2);
        this.scene.add(ambientLight);
        // ... spezifischere Lichter für Szenen
    }

    createStars() {
        // Verwendung von Points statt Meshes für bessere Performance
        const vertices = [];
        for (let i = 0; i < 10000; i++) {
            vertices.push(THREE.MathUtils.randFloatSpread(2000)); // x
            vertices.push(THREE.MathUtils.randFloatSpread(2000)); // y
            vertices.push(THREE.MathUtils.randFloatSpread(2000)); // z
        }
        const geometry = new THREE.BufferGeometry();
        geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
        const material = new THREE.PointsMaterial({ color: 0xffffff, size: 0.1 });
        const stars = new THREE.Points(geometry, material);
        this.scene.add(stars);
    }

    setupSmoothScrolling() {
        // Implementierung des virtuellen Scrollings für butterweiche Übergänge
    }

    setupScrollAnimations() {
        // Hier kommt die Magie: Eine Master-GSAP-Timeline, die die gesamte
        // Reise steuert. Sie bewegt die Kamera, blendet Objekte ein/aus,
        // und wechselt die Shader-Materialien.
        
        const masterTimeline = gsap.timeline({
            scrollTrigger: {
                trigger: document.body,
                start: "top top",
                end: "bottom bottom",
                scrub: 1.5,
            }
        });

        // Beispiel: Kamerafahrt zur Endurance
        masterTimeline.to(this.camera.position, { x: 0, y: 0, z: 50 }, "start");
        // ... unzählige weitere Einträge für jede Szene
    }

    animate() {
        requestAnimationFrame(() => this.animate());
        
        // Update von Simulationen (Partikel, Physik)
        
        this.renderer.render(this.scene, this.camera);
    }
    
    hideLoadingScreen() {
        // ... Logik zum Ausblenden des Ladebildschirms
    }
}

new App();