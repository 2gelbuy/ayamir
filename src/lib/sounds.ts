// Ambient sound generator using Web Audio API (no external files needed)
let audioCtx: AudioContext | null = null;
let currentNodes: AudioNode[] = [];
let isPlaying = false;

function getContext(): AudioContext {
    if (!audioCtx || audioCtx.state === 'closed') {
        audioCtx = new AudioContext();
    }
    if (audioCtx.state === 'suspended') {
        audioCtx.resume();
    }
    return audioCtx;
}

// ── Rain: filtered noise + random droplet clicks ──
function startRain(ctx: AudioContext, gain: GainNode) {
    // Base: pink-ish noise for constant rain wash
    const noiseLen = 2 * ctx.sampleRate;
    const noiseBuf = ctx.createBuffer(2, noiseLen, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
        const d = noiseBuf.getChannelData(ch);
        let b0 = 0, b1 = 0, b2 = 0, b3 = 0, b4 = 0, b5 = 0, b6 = 0;
        for (let i = 0; i < noiseLen; i++) {
            const white = Math.random() * 2 - 1;
            b0 = 0.99886 * b0 + white * 0.0555179;
            b1 = 0.99332 * b1 + white * 0.0750759;
            b2 = 0.96900 * b2 + white * 0.1538520;
            b3 = 0.86650 * b3 + white * 0.3104856;
            b4 = 0.55000 * b4 + white * 0.5329522;
            b5 = -0.7616 * b5 - white * 0.0168980;
            d[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + white * 0.5362) * 0.06;
            b6 = white * 0.115926;
        }
    }
    const noise = ctx.createBufferSource();
    noise.buffer = noiseBuf;
    noise.loop = true;

    const lpf = ctx.createBiquadFilter();
    lpf.type = 'lowpass';
    lpf.frequency.value = 1200;

    noise.connect(lpf);
    lpf.connect(gain);
    noise.start();
    currentNodes.push(noise, lpf);

    // Droplets: periodic random clicks at varying pitches
    const dropLen = ctx.sampleRate * 4;
    const dropBuf = ctx.createBuffer(1, dropLen, ctx.sampleRate);
    const dd = dropBuf.getChannelData(0);
    for (let i = 0; i < dropLen; i++) {
        if (Math.random() < 0.0008) {
            const freq = 2000 + Math.random() * 4000;
            const decay = 80 + Math.random() * 120;
            for (let j = 0; j < decay && i + j < dropLen; j++) {
                dd[i + j] += Math.sin(2 * Math.PI * freq * j / ctx.sampleRate) *
                             Math.exp(-j / (decay * 0.3)) * (0.02 + Math.random() * 0.03);
            }
        }
    }
    const drops = ctx.createBufferSource();
    drops.buffer = dropBuf;
    drops.loop = true;

    const hpf = ctx.createBiquadFilter();
    hpf.type = 'highpass';
    hpf.frequency.value = 2000;

    drops.connect(hpf);
    hpf.connect(gain);
    drops.start();
    currentNodes.push(drops, hpf);
}

// ── Lo-fi: warm chords with vinyl crackle feel ──
function startLofi(ctx: AudioContext, gain: GainNode) {
    // Warm pad: layered detuned oscillators (C major 7th chord)
    const notes = [261.63, 329.63, 392.00, 493.88]; // C4, E4, G4, B4
    notes.forEach((freq, idx) => {
        const osc = ctx.createOscillator();
        osc.type = 'sine';
        osc.frequency.value = freq * 0.5; // one octave lower for warmth

        const oscGain = ctx.createGain();
        oscGain.gain.value = 0.04;

        // Slow vibrato for lo-fi feel
        const lfo = ctx.createOscillator();
        lfo.type = 'sine';
        lfo.frequency.value = 0.3 + idx * 0.1;
        const lfoGain = ctx.createGain();
        lfoGain.gain.value = 1.5;
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfo.start();

        // Low-pass for warmth
        const lpf = ctx.createBiquadFilter();
        lpf.type = 'lowpass';
        lpf.frequency.value = 400;

        osc.connect(lpf);
        lpf.connect(oscGain);
        oscGain.connect(gain);
        osc.start();
        currentNodes.push(osc, oscGain, lfo, lfoGain, lpf);
    });

    // Vinyl crackle: sparse high-frequency clicks
    const crackleLen = 3 * ctx.sampleRate;
    const crackleBuf = ctx.createBuffer(1, crackleLen, ctx.sampleRate);
    const cd = crackleBuf.getChannelData(0);
    for (let i = 0; i < crackleLen; i++) {
        if (Math.random() < 0.002) {
            cd[i] = (Math.random() - 0.5) * 0.15;
        }
    }
    const crackle = ctx.createBufferSource();
    crackle.buffer = crackleBuf;
    crackle.loop = true;

    const crackleFilter = ctx.createBiquadFilter();
    crackleFilter.type = 'highpass';
    crackleFilter.frequency.value = 3000;

    const crackleGain = ctx.createGain();
    crackleGain.gain.value = 0.3;

    crackle.connect(crackleFilter);
    crackleFilter.connect(crackleGain);
    crackleGain.connect(gain);
    crackle.start();
    currentNodes.push(crackle, crackleFilter, crackleGain);
}

// ── Cafe: layered murmur + clinking + ambient hum ──
function startCafe(ctx: AudioContext, gain: GainNode) {
    // Murmur: bandpass-filtered noise at speech frequencies
    const murmurLen = 3 * ctx.sampleRate;
    const murmurBuf = ctx.createBuffer(2, murmurLen, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
        const d = murmurBuf.getChannelData(ch);
        for (let i = 0; i < murmurLen; i++) {
            d[i] = (Math.random() * 2 - 1) * 0.3;
            // Slow amplitude modulation for "conversation" feel
            d[i] *= 0.5 + 0.5 * Math.sin(2 * Math.PI * (0.5 + ch * 0.3) * i / ctx.sampleRate);
        }
    }
    const murmur = ctx.createBufferSource();
    murmur.buffer = murmurBuf;
    murmur.loop = true;

    // Speech-range bandpass (300-3000 Hz)
    const bp1 = ctx.createBiquadFilter();
    bp1.type = 'bandpass';
    bp1.frequency.value = 800;
    bp1.Q.value = 0.5;

    const bp2 = ctx.createBiquadFilter();
    bp2.type = 'bandpass';
    bp2.frequency.value = 2000;
    bp2.Q.value = 0.8;

    const murmurGain = ctx.createGain();
    murmurGain.gain.value = 0.4;

    murmur.connect(bp1);
    murmur.connect(bp2);
    bp1.connect(murmurGain);
    bp2.connect(murmurGain);
    murmurGain.connect(gain);
    murmur.start();
    currentNodes.push(murmur, bp1, bp2, murmurGain);

    // Clinking: periodic glass/ceramic sounds
    const clinkLen = 4 * ctx.sampleRate;
    const clinkBuf = ctx.createBuffer(1, clinkLen, ctx.sampleRate);
    const cd = clinkBuf.getChannelData(0);
    for (let i = 0; i < clinkLen; i++) {
        if (Math.random() < 0.00015) {
            const freq = 3000 + Math.random() * 5000;
            const len = 400 + Math.random() * 600;
            for (let j = 0; j < len && i + j < clinkLen; j++) {
                cd[i + j] += Math.sin(2 * Math.PI * freq * j / ctx.sampleRate) *
                             Math.exp(-j / (len * 0.15)) * 0.06;
            }
        }
    }
    const clink = ctx.createBufferSource();
    clink.buffer = clinkBuf;
    clink.loop = true;
    clink.connect(gain);
    clink.start();
    currentNodes.push(clink);

    // Low ambient hum (espresso machine feel)
    const hum = ctx.createOscillator();
    hum.type = 'sawtooth';
    hum.frequency.value = 120;
    const humGain = ctx.createGain();
    humGain.gain.value = 0.008;
    const humFilter = ctx.createBiquadFilter();
    humFilter.type = 'lowpass';
    humFilter.frequency.value = 200;
    hum.connect(humFilter);
    humFilter.connect(humGain);
    humGain.connect(gain);
    hum.start();
    currentNodes.push(hum, humGain, humFilter);
}

// ── White noise: pure unfiltered ──
function startWhiteNoise(ctx: AudioContext, gain: GainNode) {
    const len = 2 * ctx.sampleRate;
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let ch = 0; ch < 2; ch++) {
        const d = buf.getChannelData(ch);
        for (let i = 0; i < len; i++) {
            d[i] = (Math.random() * 2 - 1) * 0.5;
        }
    }
    const source = ctx.createBufferSource();
    source.buffer = buf;
    source.loop = true;
    source.connect(gain);
    source.start();
    currentNodes.push(source);
}

export function playAmbientSound(type: string): void {
    stopAmbientSound();
    if (type === 'none') return;

    const ctx = getContext();
    const gain = ctx.createGain();
    gain.gain.value = 0.15;
    gain.connect(ctx.destination);
    currentNodes.push(gain);

    switch (type) {
        case 'rain': startRain(ctx, gain); break;
        case 'lofi': startLofi(ctx, gain); break;
        case 'cafe': startCafe(ctx, gain); break;
        case 'whitenoise': startWhiteNoise(ctx, gain); break;
        default: return;
    }

    isPlaying = true;
}

export function stopAmbientSound(): void {
    currentNodes.forEach(node => {
        try {
            if ('stop' in node && typeof (node as any).stop === 'function') {
                (node as any).stop();
            }
            node.disconnect();
        } catch {
            // already stopped
        }
    });
    currentNodes = [];
    isPlaying = false;
}

export function isAmbientPlaying(): boolean {
    return isPlaying;
}
