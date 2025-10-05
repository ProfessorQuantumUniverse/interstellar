import * as THREE from 'three';

// Da die Shader-Dateien bereits existieren, laden wir sie hier.
// In einem komplexeren Build-System würde man dies anders handhaben, aber für unsere Struktur ist dies effizient.
const [vertexShader, fragmentShader] = await Promise.all([
    fetch('../glsl/tesseract_vertex.glsl').then(res => res.text()),
    fetch('../glsl/tesseract_fragment.glsl').then(res => res.text())
]);

export class TesseractEffect {
    constructor() {
        this.uniforms = {
            u_time: { value: 0 },
            u_progress: { value: 0 },
            u_scale: { value: 100.0 }
        };

        const geometry = this.createTesseractGeometry();
        const material = new THREE.ShaderMaterial({
            vertexShader: vertexShader,
            fragmentShader: fragmentShader,
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
        const centers = []; // Dieses Attribut wird vom Vertex-Shader benötigt

        const cubeCount = 50; // Anzahl der "Zeitlinien"-Stränge
        const cubeSize = 5;
        const pointDensity = 200; // Punkte pro Strang

        for (let i = 0; i < cubeCount; i++) {
            // Das Zentrum jedes Stranges, um das herum die Verzerrung stattfindet
            const center = new THREE.Vector3(
                (Math.random() - 0.5) * 25, // Breitere Streuung
                (Math.random() - 0.5) * 25,
                (Math.random() - 0.5) * 25
            );

            for (let j = 0; j < pointDensity; j++) {
                // Erzeuge Punkte innerhalb des Stranges
                positions.push(
                    center.x + (Math.random() - 0.5) * cubeSize,
                    center.y + (Math.random() - 0.5) * cubeSize,
                    center.z + (Math.random() - 0.5) * cubeSize
                );
                // Jeder Vertex kennt sein Zentrum
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