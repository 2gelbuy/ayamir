// Ambient sound generator using Web Audio API
let audioCtx: AudioContext | null = null;
let currentNodes: AudioNode[] = [];
let isPlaying = false;

function getCtx(): AudioContext {
    if (!audioCtx || audioCtx.state === 'closed') {
        audioCtx = new AudioContext();
    }
    return audioCtx;
}

function makeNoise(ctx: AudioContext, seconds: number): AudioBuffer {
    const len = seconds * ctx.sampleRate;
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
        const d = buf.getChannelData(ch);
        for (let i = 0; i < len; i++) {
            d[i] = Math.random() * 2 - 1;
        }
    }
    return buf;
}

function track(...nodes: AudioNode[]) {
    currentNodes.push(...nodes);
}

// ── RAIN: pink noise + high-freq droplets ──
function startRain(ctx: AudioContext, master: GainNode) {
    const buf = makeNoise(ctx, 2);
    // Make it pink-ish
    for (let ch = 0; ch < 2; ch++) {
        const d = buf.getChannelData(ch);
        let prev = 0;
        for (let i = 0; i < d.length; i++) {
            d[i] = prev = prev * 0.85 + d[i] * 0.15;
        }
    }
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;

    const lp = ctx.createBiquadFilter();
    lp.type = 'lowpass';
    lp.frequency.value = 2500;

    const g = ctx.createGain();
    g.gain.value = 0.6;

    src.connect(lp).connect(g).connect(master);
    src.start();
    track(src, lp, g);

    // Droplets
    const dropBuf = ctx.createBuffer(1, 3 * ctx.sampleRate, ctx.sampleRate);
    const dd = dropBuf.getChannelData(0);
    for (let i = 0; i < dd.length; i++) {
        if (Math.random() < 0.0005) {
            const f = 3000 + Math.random() * 5000;
            for (let j = 0; j < 100 && i + j < dd.length; j++) {
                dd[i + j] += Math.sin(2 * Math.PI * f * j / ctx.sampleRate) * Math.exp(-j / 20) * 0.3;
            }
        }
    }
    const ds = ctx.createBufferSource();
    ds.buffer = dropBuf;
    ds.loop = true;
    const dg = ctx.createGain();
    dg.gain.value = 0.4;
    ds.connect(dg).connect(master);
    ds.start();
    track(ds, dg);
}

// ── LO-FI: warm detuned chords + crackle ──
function startLofi(ctx: AudioContext, master: GainNode) {
    // Chord: C3, E3, G3, Bb3 (jazzy)
    [130.81, 164.81, 196.00, 233.08].forEach((freq, i) => {
        const osc = ctx.createOscillator();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        // Slow detune wobble
        const lfo = ctx.createOscillator();
        lfo.frequency.value = 0.2 + i * 0.15;
        const lfoG = ctx.createGain();
        lfoG.gain.value = 2;
        lfo.connect(lfoG).connect(osc.frequency);
        lfo.start();

        const lp = ctx.createBiquadFilter();
        lp.type = 'lowpass';
        lp.frequency.value = 350;

        const g = ctx.createGain();
        g.gain.value = 0.15;

        osc.connect(lp).connect(g).connect(master);
        osc.start();
        track(osc, lfo, lfoG, lp, g);
    });

    // Vinyl crackle
    const cb = ctx.createBuffer(1, 2 * ctx.sampleRate, ctx.sampleRate);
    const cd = cb.getChannelData(0);
    for (let i = 0; i < cd.length; i++) {
        if (Math.random() < 0.003) cd[i] = (Math.random() - 0.5) * 0.8;
    }
    const cs = ctx.createBufferSource();
    cs.buffer = cb;
    cs.loop = true;
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 4000;
    const cg = ctx.createGain();
    cg.gain.value = 0.15;
    cs.connect(hp).connect(cg).connect(master);
    cs.start();
    track(cs, hp, cg);
}

// ── CAFE: murmur at speech freq + dish clinks + machine hum ──
function startCafe(ctx: AudioContext, master: GainNode) {
    // Murmur: bandpass noise modulated slowly
    const mb = makeNoise(ctx, 3);
    for (let ch = 0; ch < 2; ch++) {
        const d = mb.getChannelData(ch);
        for (let i = 0; i < d.length; i++) {
            d[i] *= 0.4 + 0.6 * Math.sin(2 * Math.PI * (0.3 + ch * 0.2) * i / ctx.sampleRate);
        }
    }
    const ms = ctx.createBufferSource();
    ms.buffer = mb;
    ms.loop = true;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = 1000;
    bp.Q.value = 0.4;

    const mg = ctx.createGain();
    mg.gain.value = 0.35;

    ms.connect(bp).connect(mg).connect(master);
    ms.start();
    track(ms, bp, mg);

    // Clinks
    const clb = ctx.createBuffer(1, 4 * ctx.sampleRate, ctx.sampleRate);
    const cld = clb.getChannelData(0);
    for (let i = 0; i < cld.length; i++) {
        if (Math.random() < 0.0002) {
            const f = 4000 + Math.random() * 4000;
            for (let j = 0; j < 200 && i + j < cld.length; j++) {
                cld[i + j] += Math.sin(2 * Math.PI * f * j / ctx.sampleRate) * Math.exp(-j / 40) * 0.15;
            }
        }
    }
    const cls = ctx.createBufferSource();
    cls.buffer = clb;
    cls.loop = true;
    cls.connect(master);
    cls.start();
    track(cls);

    // Espresso hum
    const hum = ctx.createOscillator();
    hum.type = 'sawtooth';
    hum.frequency.value = 110;
    const hlp = ctx.createBiquadFilter();
    hlp.type = 'lowpass';
    hlp.frequency.value = 180;
    const hg = ctx.createGain();
    hg.gain.value = 0.03;
    hum.connect(hlp).connect(hg).connect(master);
    hum.start();
    track(hum, hlp, hg);
}

// ── WHITE NOISE: pure stereo ──
function startWhite(ctx: AudioContext, master: GainNode) {
    const buf = makeNoise(ctx, 2);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const g = ctx.createGain();
    g.gain.value = 0.5;
    src.connect(g).connect(master);
    src.start();
    track(src, g);
}

export function playAmbientSound(type: string): void {
    stopAmbientSound();
    if (type === 'none') return;

    const ctx = getCtx();
    // Resume if suspended (Chrome requires user gesture)
    if (ctx.state === 'suspended') ctx.resume();

    const master = ctx.createGain();
    master.gain.value = 0.35; // Master volume
    master.connect(ctx.destination);
    track(master);

    switch (type) {
        case 'rain': startRain(ctx, master); break;
        case 'lofi': startLofi(ctx, master); break;
        case 'cafe': startCafe(ctx, master); break;
        case 'whitenoise': startWhite(ctx, master); break;
        default: return;
    }

    isPlaying = true;
}

export function stopAmbientSound(): void {
    for (const node of currentNodes) {
        try {
            if ('stop' in node && typeof (node as any).stop === 'function') {
                (node as any).stop();
            }
            node.disconnect();
        } catch { /* already stopped */ }
    }
    currentNodes = [];
    isPlaying = false;
}

export function isAmbientPlaying(): boolean {
    return isPlaying;
}
