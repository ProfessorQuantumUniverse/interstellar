import * as THREE from 'three';

// Wir benötigen die Shader-Texte. In einem echten Build-System würde man dies anders lösen,
// aber für unsere Struktur laden wir sie hier direkt.
const TESSERACT_VERTEX_SHADER = `
// Uniforms vom JavaScript
uniform float u_time;       // Globale Zeit für kontinuierliche Animation
uniform float u_progress;   // Scroll-Fortschritt (0-1) zur Steuerung der Intensität
uniform float u_scale;      // Gesamtgröße des Tesserakts

// Attribute von der Geometrie
attribute vec3 center; // Das Zentrum des Cubes, zu dem dieser Vertex gehört

// Noise-Funktion für organische Verzerrungen
// Simplex Noise (vereinfacht)
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute(permute(permute(
                i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857; // 1.0/7.0
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;
    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

void main() {
    // Startposition des Vertex
    vec3 pos = position;

    // --- Zeit-Verzerrung ---
    // Noise basierend auf der Cube-Position und Zeit
    float time_distortion = snoise(center * 0.1 + u_time * 0.05);

    // Der Scroll-Fortschritt steuert die Stärke der Verzerrung
    // Die 'pos' wird entlang ihres Normalenvektors vom Zentrum des Cubes verschoben
    float stretch_factor = 1.0 + u_progress * time_distortion * 5.0;
    pos = center + (pos - center) * stretch_factor;

    // --- Globale Wellen-Verzerrung ---
    // Eine langsame, globale Welle, die durch den gesamten Tesserakt läuft
    float wave = sin(pos.y * 0.5 + u_time * 0.5) * u_progress * 2.0;
    pos.x += wave;
    pos.z += wave;

    // --- Finale Transformation ---
    // Skaliere die finale Position und projiziere sie auf den Bildschirm
    vec4 modelPosition = modelMatrix * vec4(pos * u_scale, 1.0);
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;

    gl_Position = projectedPosition;
    
    // Punktgröße basierend auf der Entfernung zur Kamera anpassen
    gl_PointSize = 10.0 / -viewPosition.z;
}
`;

const TESSERACT_FRAGMENT_SHADER = `
uniform float u_progress;

void main() {
    // Erzeugt einen weichen, runden Punkt
    if (length(gl_PointCoord - vec2(0.5)) > 0.5) {
        discard;
    }

    // Die Farbe leuchtet stärker in der Mitte der Animation
    float glow = u_progress * (1.0 - u_progress) * 4.0;
    
    gl_FragColor = vec4(0.8, 0.9, 1.0, 0.5 + glow);
}
`;


export class TesseractEffect {
    constructor() {
        this.uniforms = {
            u_time: { value: 0 },
            u_progress: { value: 0 },
            u_scale: { value: 100.0 }
        };

        const geometry = this.createTesseractGeometry();
        const material = new THREE.ShaderMaterial({
            vertexShader: TESSERACT_VERTEX_SHADER,
            fragmentShader: TESSERACT_FRAGMENT_SHADER,
            uniforms: this.uniforms,
            blending: THREE.AdditiveBlending,
            depthWrite: false,
            transparent: true,
        });

        this.points = new THREE.Points(geometry, material);
    }

    createTesseractGeometry() {
        const geometry = new THREE.BufferGeometry();
        const positions = [];
        const centers = [];

        const cubeCount = 50;
        const cubeSize = 5;
        const pointDensity = 200; // Punkte pro Würfel

        for (let i = 0; i < cubeCount; i++) {
            const center = new THREE.Vector3(
                (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 20,
                (Math.random() - 0.5) * 20
            );

            for (let j = 0; j < pointDensity; j++) {
                positions.push(
                    center.x + (Math.random() - 0.5) * cubeSize,
                    center.y + (Math.random() - 0.5) * cubeSize,
                    center.z + (Math.random() - 0.5) * cubeSize
                );
                centers.push(center.x, center.y, center.z);
            }
        }

        geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
        geometry.setAttribute('center', new THREE.Float32BufferAttribute(centers, 3));
        return geometry;
    }

    update(time) {
        this.uniforms.u_time.value = time;
    }
}