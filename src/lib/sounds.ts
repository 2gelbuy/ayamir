// Ambient sounds — each uses a DIFFERENT synthesis method, no shared noise base
let audioCtx: AudioContext | null = null;
let currentNodes: AudioNode[] = [];
let isPlaying = false;
let currentType = 'none';

function ctx(): AudioContext {
    if (!audioCtx || audioCtx.state === 'closed') audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
}
function t(...n: AudioNode[]) { currentNodes.push(...n); }

// ═══════════════════════════════════════════════
// RAIN — individual water drops at random intervals, NO continuous noise
// ═══════════════════════════════════════════════
function rain(c: AudioContext, out: GainNode) {
    // Gentle background patter (very soft pink noise, barely audible)
    const len = c.sampleRate * 2;
    const buf = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
        const d = buf.getChannelData(ch);
        let p = 0;
        for (let i = 0; i < len; i++) {
            p = p * 0.9 + (Math.random() * 2 - 1) * 0.1;
            d[i] = p * 0.3;
        }
    }
    const bg = c.createBufferSource(); bg.buffer = buf; bg.loop = true;
    const bgG = c.createGain(); bgG.gain.value = 0.25;
    const bgF = c.createBiquadFilter(); bgF.type = 'lowpass'; bgF.frequency.value = 1500;
    bg.connect(bgF).connect(bgG).connect(out); bg.start(); t(bg, bgF, bgG);

    // Individual drops — short sine bursts at high frequency
    function makeDrop() {
        if (!isPlaying) return;
        const freq = 2500 + Math.random() * 4000;
        const osc = c.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        osc.frequency.exponentialRampToValueAtTime(freq * 0.3, c.currentTime + 0.05);
        const g = c.createGain();
        g.gain.setValueAtTime(0.08 + Math.random() * 0.06, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.04 + Math.random() * 0.03);
        const pan = c.createStereoPanner();
        pan.pan.value = Math.random() * 2 - 1;
        osc.connect(g).connect(pan).connect(out);
        osc.start();
        osc.stop(c.currentTime + 0.08);
        setTimeout(makeDrop, 30 + Math.random() * 120);
    }
    // Start multiple drop streams
    for (let i = 0; i < 5; i++) setTimeout(makeDrop, i * 50);
}

// ═══════════════════════════════════════════════
// OCEAN — sine oscillators simulating wave rhythm, NO noise
// ═══════════════════════════════════════════════
function ocean(c: AudioContext, out: GainNode) {
    // Two detuned low oscillators = deep rumble
    [55, 58].forEach(freq => {
        const osc = c.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq;
        const g = c.createGain();
        g.gain.value = 0.15;
        // Slow swell: volume fades in and out like waves
        const lfo = c.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.08 + Math.random() * 0.04;
        const lg = c.createGain(); lg.gain.value = 0.12;
        lfo.connect(lg).connect(g.gain);
        osc.connect(g).connect(out);
        osc.start(); lfo.start(); t(osc, g, lfo, lg);
    });

    // Surf hiss: filtered noise with strong wave rhythm
    const len = c.sampleRate * 3;
    const buf = c.createBuffer(2, len, c.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
        const d = buf.getChannelData(ch);
        for (let i = 0; i < len; i++) {
            // Wave-shaped amplitude envelope
            const wave = Math.pow(Math.sin(Math.PI * i / len), 2);
            d[i] = (Math.random() * 2 - 1) * wave * 0.4;
        }
    }
    const src = c.createBufferSource(); src.buffer = buf; src.loop = true;
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 600;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 3000;
    const sg = c.createGain(); sg.gain.value = 0.35;
    src.connect(hp).connect(lp).connect(sg).connect(out); src.start(); t(src, hp, lp, sg);
}

// ═══════════════════════════════════════════════
// FIRE — crackle pops + deep rumble oscillator, distinct from noise
// ═══════════════════════════════════════════════
function fire(c: AudioContext, out: GainNode) {
    // Deep warm rumble from oscillator
    const osc = c.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = 80;
    const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 120;
    const og = c.createGain(); og.gain.value = 0.06;
    // Slow flicker
    const lfo = c.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.5;
    const lg = c.createGain(); lg.gain.value = 0.03;
    lfo.connect(lg).connect(og.gain);
    osc.connect(lp).connect(og).connect(out); osc.start(); lfo.start(); t(osc, lp, og, lfo, lg);

    // Crackle: individual pop sounds at random intervals
    function makePop() {
        if (!isPlaying) return;
        const freq = 800 + Math.random() * 2000;
        const o = c.createOscillator(); o.type = 'square';
        o.frequency.value = freq;
        const g = c.createGain();
        g.gain.setValueAtTime(0.04 + Math.random() * 0.06, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.01 + Math.random() * 0.02);
        const f = c.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = 5;
        o.connect(f).connect(g).connect(out);
        o.start(); o.stop(c.currentTime + 0.04);
        setTimeout(makePop, 50 + Math.random() * 200);
    }
    for (let i = 0; i < 3; i++) setTimeout(makePop, i * 80);
}

// ═══════════════════════════════════════════════
// CAFE — speech-like modulated tones + distinct clinks
// ═══════════════════════════════════════════════
function cafe(c: AudioContext, out: GainNode) {
    // "Voices": multiple oscillators in speech range with random modulation
    [180, 220, 300, 400].forEach((freq, i) => {
        const osc = c.createOscillator(); osc.type = 'sawtooth'; osc.frequency.value = freq;
        const bp = c.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = 3;
        // Random volume modulation = "conversation" feel
        const lfo = c.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.3 + i * 0.15 + Math.random() * 0.2;
        const lg = c.createGain(); lg.gain.value = 0.03;
        const g = c.createGain(); g.gain.value = 0.04;
        lfo.connect(lg).connect(g.gain);
        osc.connect(bp).connect(g).connect(out);
        osc.start(); lfo.start(); t(osc, bp, lfo, lg, g);
    });

    // Clinks: short high-pitched sine taps
    function makeClink() {
        if (!isPlaying) return;
        const freq = 4000 + Math.random() * 4000;
        const o = c.createOscillator(); o.type = 'sine'; o.frequency.value = freq;
        const g = c.createGain();
        g.gain.setValueAtTime(0.05, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.06);
        o.connect(g).connect(out); o.start(); o.stop(c.currentTime + 0.08);
        setTimeout(makeClink, 800 + Math.random() * 3000);
    }
    setTimeout(makeClink, 500);
}

// ═══════════════════════════════════════════════
// LO-FI — warm chord + vinyl crackle (oscillator-based, NO noise)
// ═══════════════════════════════════════════════
function lofi(c: AudioContext, out: GainNode) {
    // Jazz chord: Cmaj7 low octave
    [130.81, 164.81, 196.00, 246.94].forEach((freq, i) => {
        const osc = c.createOscillator(); osc.type = 'triangle'; osc.frequency.value = freq;
        // Vibrato
        const lfo = c.createOscillator(); lfo.frequency.value = 0.15 + i * 0.1;
        const lg = c.createGain(); lg.gain.value = 1.2;
        lfo.connect(lg).connect(osc.frequency); lfo.start();
        const lp = c.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500;
        const g = c.createGain(); g.gain.value = 0.1;
        osc.connect(lp).connect(g).connect(out); osc.start(); t(osc, lfo, lg, lp, g);
    });

    // Crackle pops
    function makeCrackle() {
        if (!isPlaying) return;
        const o = c.createOscillator(); o.type = 'square'; o.frequency.value = 6000 + Math.random() * 4000;
        const g = c.createGain();
        g.gain.setValueAtTime(0.015, c.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, c.currentTime + 0.003);
        o.connect(g).connect(out); o.start(); o.stop(c.currentTime + 0.005);
        setTimeout(makeCrackle, 20 + Math.random() * 100);
    }
    makeCrackle();
}

// ═══════════════════════════════════════════════
// WIND — pitch-modulated oscillator "howl", NO noise buffer
// ═══════════════════════════════════════════════
function wind(c: AudioContext, out: GainNode) {
    // Main howl: sine oscillator with slow random pitch sweeps
    const osc = c.createOscillator(); osc.type = 'sine'; osc.frequency.value = 300;
    // Pitch LFO — slow sweep creates howling effect
    const lfo1 = c.createOscillator(); lfo1.type = 'sine'; lfo1.frequency.value = 0.07;
    const lg1 = c.createGain(); lg1.gain.value = 200; // ±200Hz sweep
    lfo1.connect(lg1).connect(osc.frequency); lfo1.start();
    // Volume LFO — gusts
    const lfo2 = c.createOscillator(); lfo2.type = 'sine'; lfo2.frequency.value = 0.12;
    const lg2 = c.createGain(); lg2.gain.value = 0.08;
    const g = c.createGain(); g.gain.value = 0.1;
    lfo2.connect(lg2).connect(g.gain);
    osc.connect(g).connect(out); osc.start(); lfo2.start(); t(osc, lfo1, lg1, lfo2, lg2, g);

    // Second howl layer, different speed
    const osc2 = c.createOscillator(); osc2.type = 'sine'; osc2.frequency.value = 500;
    const lfo3 = c.createOscillator(); lfo3.type = 'sine'; lfo3.frequency.value = 0.05;
    const lg3 = c.createGain(); lg3.gain.value = 250;
    lfo3.connect(lg3).connect(osc2.frequency); lfo3.start();
    const g2 = c.createGain(); g2.gain.value = 0.06;
    osc2.connect(g2).connect(out); osc2.start(); t(osc2, lfo3, lg3, g2);

    // Soft rustle: very gentle filtered noise
    const len = c.sampleRate;
    const buf = c.createBuffer(1, len, c.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * 0.15;
    const rs = c.createBufferSource(); rs.buffer = buf; rs.loop = true;
    const hp = c.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 2000;
    const rg = c.createGain(); rg.gain.value = 0.15;
    rs.connect(hp).connect(rg).connect(out); rs.start(); t(rs, hp, rg);
}

// ═══════════════════════════════════════════════
export function playAmbientSound(type: string): void {
    stopAmbientSound();
    if (type === 'none') return;
    const c2 = ctx();
    const master = c2.createGain();
    master.gain.value = 0.3;
    master.connect(c2.destination);
    t(master);
    currentType = type;
    isPlaying = true;

    switch (type) {
        case 'rain': rain(c2, master); break;
        case 'ocean': ocean(c2, master); break;
        case 'fire': fire(c2, master); break;
        case 'cafe': cafe(c2, master); break;
        case 'lofi': lofi(c2, master); break;
        case 'wind': wind(c2, master); break;
    }
}

export function stopAmbientSound(): void {
    isPlaying = false;
    currentType = 'none';
    for (const n of currentNodes) {
        try {
            if ('stop' in n && typeof (n as any).stop === 'function') (n as any).stop();
            n.disconnect();
        } catch {}
    }
    currentNodes = [];
}

export function isAmbientPlaying(): boolean { return isPlaying; }
export function getCurrentSound(): string { return currentType; }
