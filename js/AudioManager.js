export class AudioManager {
    constructor() {
        this.ctx = null;
        this.master = null;
        this.layers = {};
        this.isEnabled = false;
        this.targetIntensity = 0.5;
        this.currentScene = 'main';
    }

    enable() {
        if (this.isEnabled) return;
        this.ctx = new (window.AudioContext || window.webkitAudioContext)();
        this.master = this.ctx.createGain();
        this.master.gain.value = 0.7;
        this.master.connect(this.ctx.destination);

        // Layers: low drone, mid pad, high shimmer
        this.layers.low = this.createDrone(48, 0.15);   // C2
        this.layers.mid = this.createDrone(55, 0.08);   // G2
        this.layers.high = this.createDrone(64, 0.04);  // E3

        this.isEnabled = true;
    }

    createDrone(midiNote, gainValue) {
        const osc = this.ctx.createOscillator();
        const gain = this.ctx.createGain();
        const filt = this.ctx.createBiquadFilter();

        const freq = 440 * Math.pow(2, (midiNote - 69) / 12);
        osc.type = 'sawtooth';
        osc.frequency.value = freq;

        filt.type = 'lowpass';
        filt.frequency.value = 600;
        filt.Q.value = 0.3;

        gain.gain.value = 0.0;

        // gentle slow LFO on filter for movement
        const lfo = this.ctx.createOscillator();
        const lfoGain = this.ctx.createGain();
        lfo.frequency.value = 0.05;
        lfoGain.gain.value = 80;
        lfo.connect(lfoGain).connect(filt.frequency);
        lfo.start();

        osc.connect(filt).connect(gain).connect(this.master);
        osc.start();

        return { osc, gain, filt, baseGain: gainValue };
    }

    setScene(scene) {
        this.currentScene = scene;
        // Target intensities per scene
        const map = {
            main: 0.35,
            wormhole: 0.9,
            gargantua: 0.8,
            tesseract: 0.7,
            epilogue: 0.2
        };
        this.targetIntensity = map[scene] ?? 0.5;
    }

    setProgress(p) {
        // subtle swell by progress
        this.targetIntensity = Math.min(1.0, Math.max(0.05, this.targetIntensity * (0.8 + 0.4 * p)));
    }

    update(dt) {
        if (!this.isEnabled) return;
        // Smoothly approach target intensity
        const smoothing = 0.5;
        for (const key of Object.keys(this.layers)) {
            const layer = this.layers[key];
            const desired = layer.baseGain * this.targetIntensity;
            layer.gain.gain.value = layer.gain.gain.value * (1 - smoothing * dt) + desired * (smoothing * dt);
        }
    }
}