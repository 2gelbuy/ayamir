// Ambient sound generator using Web Audio API — no external files
let audioCtx: AudioContext | null = null;
let currentNodes: AudioNode[] = [];
let isPlaying = false;
let currentType: string = 'none';

function getCtx(): AudioContext {
    if (!audioCtx || audioCtx.state === 'closed') {
        audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
}

function noise(ctx: AudioContext, sec: number, stereo = true): AudioBuffer {
    const ch = stereo ? 2 : 1;
    const len = sec * ctx.sampleRate;
    const buf = ctx.createBuffer(ch, len, ctx.sampleRate);
    for (let c = 0; c < ch; c++) {
        const d = buf.getChannelData(c);
        for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    }
    return buf;
}

function track(...nodes: AudioNode[]) { currentNodes.push(...nodes); }

function src(ctx: AudioContext, buf: AudioBuffer): AudioBufferSourceNode {
    const s = ctx.createBufferSource();
    s.buffer = buf;
    s.loop = true;
    return s;
}

// ── RAIN: pink noise base + droplet transients ──
function startRain(ctx: AudioContext, out: GainNode) {
    // Pink noise (smoothed white)
    const buf = noise(ctx, 2);
    for (let c = 0; c < 2; c++) {
        const d = buf.getChannelData(c);
        let prev = 0;
        for (let i = 0; i < d.length; i++) { d[i] = prev = prev * 0.82 + d[i] * 0.18; }
    }
    const s = src(ctx, buf);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 2000;
    const g = ctx.createGain(); g.gain.value = 0.5;
    s.connect(lp).connect(g).connect(out); s.start(); track(s, lp, g);

    // Droplets
    const db = ctx.createBuffer(1, 3 * ctx.sampleRate, ctx.sampleRate);
    const dd = db.getChannelData(0);
    for (let i = 0; i < dd.length; i++) {
        if (Math.random() < 0.0004) {
            const f = 3000 + Math.random() * 4000;
            for (let j = 0; j < 80 && i + j < dd.length; j++)
                dd[i + j] += Math.sin(2 * Math.PI * f * j / ctx.sampleRate) * Math.exp(-j / 15) * 0.2;
        }
    }
    const ds = src(ctx, db);
    const dg = ctx.createGain(); dg.gain.value = 0.3;
    ds.connect(dg).connect(out); ds.start(); track(ds, dg);
}

// ── OCEAN: brown noise with slow wave LFO ──
function startOcean(ctx: AudioContext, out: GainNode) {
    const buf = noise(ctx, 3);
    for (let c = 0; c < 2; c++) {
        const d = buf.getChannelData(c);
        let prev = 0;
        for (let i = 0; i < d.length; i++) { d[i] = prev = prev * 0.95 + d[i] * 0.05; d[i] *= 3; }
    }
    const s = src(ctx, buf);
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 800;

    // Wave rhythm: slow amplitude modulation
    const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.12;
    const lfoG = ctx.createGain(); lfoG.gain.value = 0.3;
    lfo.connect(lfoG);

    const g = ctx.createGain(); g.gain.value = 0.4;
    lfoG.connect(g.gain); // modulate volume

    s.connect(lp).connect(g).connect(out);
    s.start(); lfo.start(); track(s, lp, g, lfo, lfoG);
}

// ── LO-FI: warm chord + vinyl crackle ──
function startLofi(ctx: AudioContext, out: GainNode) {
    [130.81, 164.81, 196.00, 233.08].forEach((freq, i) => {
        const osc = ctx.createOscillator(); osc.type = 'triangle'; osc.frequency.value = freq;
        const lfo = ctx.createOscillator(); lfo.frequency.value = 0.2 + i * 0.12;
        const lfg = ctx.createGain(); lfg.gain.value = 1.5;
        lfo.connect(lfg).connect(osc.frequency); lfo.start();
        const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 400;
        const g = ctx.createGain(); g.gain.value = 0.12;
        osc.connect(lp).connect(g).connect(out); osc.start();
        track(osc, lfo, lfg, lp, g);
    });
    // Crackle
    const cb = ctx.createBuffer(1, 2 * ctx.sampleRate, ctx.sampleRate);
    const cd = cb.getChannelData(0);
    for (let i = 0; i < cd.length; i++) { if (Math.random() < 0.002) cd[i] = (Math.random() - 0.5) * 0.5; }
    const cs = src(ctx, cb);
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 4000;
    const cg = ctx.createGain(); cg.gain.value = 0.12;
    cs.connect(hp).connect(cg).connect(out); cs.start(); track(cs, hp, cg);
}

// ── CAFE: speech-band murmur + clinks + machine hum ──
function startCafe(ctx: AudioContext, out: GainNode) {
    const mb = noise(ctx, 3);
    for (let c = 0; c < 2; c++) {
        const d = mb.getChannelData(c);
        for (let i = 0; i < d.length; i++)
            d[i] *= 0.4 + 0.6 * Math.sin(2 * Math.PI * (0.3 + c * 0.2) * i / ctx.sampleRate);
    }
    const ms = src(ctx, mb);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 1000; bp.Q.value = 0.4;
    const mg = ctx.createGain(); mg.gain.value = 0.3;
    ms.connect(bp).connect(mg).connect(out); ms.start(); track(ms, bp, mg);

    // Clinks
    const clb = ctx.createBuffer(1, 4 * ctx.sampleRate, ctx.sampleRate);
    const cld = clb.getChannelData(0);
    for (let i = 0; i < cld.length; i++) {
        if (Math.random() < 0.00015) {
            const f = 4000 + Math.random() * 4000;
            for (let j = 0; j < 150 && i + j < cld.length; j++)
                cld[i + j] += Math.sin(2 * Math.PI * f * j / ctx.sampleRate) * Math.exp(-j / 30) * 0.1;
        }
    }
    const cls = src(ctx, clb); cls.connect(out); cls.start(); track(cls);

    // Machine hum
    const hum = ctx.createOscillator(); hum.type = 'sawtooth'; hum.frequency.value = 110;
    const hlp = ctx.createBiquadFilter(); hlp.type = 'lowpass'; hlp.frequency.value = 180;
    const hg = ctx.createGain(); hg.gain.value = 0.02;
    hum.connect(hlp).connect(hg).connect(out); hum.start(); track(hum, hlp, hg);
}

// ── FIRE: crackle + low rumble + amplitude wobble ──
function startFire(ctx: AudioContext, out: GainNode) {
    // Base crackle
    const fb = noise(ctx, 2, false);
    const fd = fb.getChannelData(0);
    for (let i = 0; i < fd.length; i++) {
        if (Math.random() < 0.005) fd[i] *= 3; else fd[i] *= 0.15;
    }
    const fs = src(ctx, fb);
    const bp = ctx.createBiquadFilter(); bp.type = 'bandpass'; bp.frequency.value = 2000; bp.Q.value = 0.3;

    // Slow wobble
    const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.4;
    const lfg = ctx.createGain(); lfg.gain.value = 0.15;
    lfo.connect(lfg);

    const g = ctx.createGain(); g.gain.value = 0.35;
    lfg.connect(g.gain);

    fs.connect(bp).connect(g).connect(out); fs.start(); lfo.start(); track(fs, bp, g, lfo, lfg);

    // Deep rumble
    const rb = noise(ctx, 2, false);
    const rd = rb.getChannelData(0);
    let prev = 0;
    for (let i = 0; i < rd.length; i++) { rd[i] = prev = prev * 0.97 + rd[i] * 0.03; rd[i] *= 4; }
    const rs = src(ctx, rb);
    const rlp = ctx.createBiquadFilter(); rlp.type = 'lowpass'; rlp.frequency.value = 200;
    const rg = ctx.createGain(); rg.gain.value = 0.2;
    rs.connect(rlp).connect(rg).connect(out); rs.start(); track(rs, rlp, rg);
}

// ── WIND: highpass noise with LFO on filter ──
function startWind(ctx: AudioContext, out: GainNode) {
    const buf = noise(ctx, 2);
    const s2 = src(ctx, buf);
    const hp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = 400;

    // Wind gusts: LFO on filter frequency
    const lfo = ctx.createOscillator(); lfo.type = 'sine'; lfo.frequency.value = 0.15;
    const lfg = ctx.createGain(); lfg.gain.value = 300;
    lfo.connect(lfg).connect(hp.frequency);

    const g = ctx.createGain(); g.gain.value = 0.25;
    s2.connect(hp).connect(g).connect(out); s2.start(); lfo.start(); track(s2, hp, g, lfo, lfg);
}

// ── PUBLIC API ──

export function playAmbientSound(type: string): void {
    stopAmbientSound();
    if (type === 'none') return;

    const ctx = getCtx();
    const master = ctx.createGain();
    master.gain.value = 0.25; // 25% master — comfortable background level
    master.connect(ctx.destination);
    track(master);

    switch (type) {
        case 'rain': startRain(ctx, master); break;
        case 'ocean': startOcean(ctx, master); break;
        case 'lofi': startLofi(ctx, master); break;
        case 'cafe': startCafe(ctx, master); break;
        case 'fire': startFire(ctx, master); break;
        case 'wind': startWind(ctx, master); break;
        default: return;
    }

    currentType = type;
    isPlaying = true;
}

export function stopAmbientSound(): void {
    for (const node of currentNodes) {
        try {
            if ('stop' in node && typeof (node as any).stop === 'function') (node as any).stop();
            node.disconnect();
        } catch { /* ok */ }
    }
    currentNodes = [];
    isPlaying = false;
    currentType = 'none';
}

export function isAmbientPlaying(): boolean { return isPlaying; }
export function getCurrentSound(): string { return currentType; }
