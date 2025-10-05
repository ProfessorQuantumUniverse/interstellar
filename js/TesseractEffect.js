import * as THREE from 'three';

export class TesseractEffect {
    constructor() {
        this.uniforms = {
            u_time: { value: 0 },
            u_progress: { value: 0 },
            u_scale: { value: 1.0 },
        };
        this.points = this.createPoints();
    }

    async createPoints() {
        // Build many small cubes as point clouds; each vertex gets a 'center' attribute for shader deformations
        const cubes = [];
        const grid = 3;              // 3x3x3 small cubes
        const spacing = 6;           // distance between cube centers
        const cubeSize = 2.2;        // size of each small cube
        const faceRes = 8;           // points per face dimension

        for (let x = -1; x <= 1; x++) {
            for (let y = -1; y <= 1; y++) {
                for (let z = -1; z <= 1; z++) {
                    cubes.push(new THREE.Vector3(x * spacing, y * spacing, z * spacing));
                }
            }
        }

        const positions = [];
        const centers = [];

        const pushFaceGrid = (plane, sign) => {
            // plane: 'x','y','z'; sign: -1 | +1
            for (let i = 0; i < faceRes; i++) {
                for (let j = 0; j < faceRes; j++) {
                    const u = -0.5 + (i / (faceRes - 1));
                    const v = -0.5 + (j / (faceRes - 1));
                    let px = 0, py = 0, pz = 0;
                    if (plane === 'x') {
                        px = sign * 0.5; py = u; pz = v;
                    } else if (plane === 'y') {
                        px = u; py = sign * 0.5; pz = v;
                    } else {
                        px = u; py = v; pz = sign * 0.5;
                    }
                    positions.push(px * cubeSize, py * cubeSize, pz * cubeSize);
                }
            }
        };

        const unitCubeFacePositions = [];
        // Build unit cube face point distribution once
        const tmpPos = [];
        const planes = ['x', 'x', 'y', 'y', 'z', 'z'];
        const signs = [1, -1, 1, -1, 1, -1];
        for (let k = 0; k < 6; k++) {
            const plane = planes[k];
            const sign = signs[k];
            // accumulate into global positions builder
            pushFaceGrid(plane, sign);
        }
        // Now positions contains one unit cube faces point cloud
        // We'll replicate it per cube center, offset + center

        const unitCount = positions.length / 3;

        const finalPositions = [];
        const finalCenters = [];

        for (const c of cubes) {
            for (let i = 0; i < unitCount; i++) {
                const ix = positions[3 * i + 0] + c.x;
                const iy = positions[3 * i + 1] + c.y;
                const iz = positions[3 * i + 2] + c.z;
                finalPositions.push(ix, iy, iz);
                finalCenters.push(c.x, c.y, c.z);
            }
        }

        const geom = new THREE.BufferGeometry();
        geom.setAttribute('position', new THREE.Float32BufferAttribute(finalPositions, 3));
        geom.setAttribute('center', new THREE.Float32BufferAttribute(finalCenters, 3));

        const material = new THREE.ShaderMaterial({
            vertexShader: await this.loadText('./glsl/tesseract_vertex.glsl'),
            fragmentShader: await this.loadText('./glsl/tesseract_fragment.glsl'),
            uniforms: this.uniforms,
            transparent: true,
            blending: THREE.AdditiveBlending,
            depthWrite: false
        });

        return new THREE.Points(geom, material);
    }

    async loadText(url) {
        const res = await fetch(url);
        if (!res.ok) throw new Error(`Failed to load shader: ${url}`);
        return res.text();
    }

    update(time) {
        this.uniforms.u_time.value = time;
    }

    setProgress(p) {
        this.uniforms.u_progress.value = p;
    }
}