// Ambient sound generator using Web Audio API (no external files needed)
let audioCtx: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;
let currentGain: GainNode | null = null;
let isPlaying = false;

function getContext(): AudioContext {
    if (!audioCtx || audioCtx.state === 'closed') {
        audioCtx = new AudioContext();
    }
    return audioCtx;
}

interface SoundResult {
    source: AudioBufferSourceNode;
    output: AudioNode; // final node to connect to gain
}

function createBrownNoise(ctx: AudioContext): SoundResult {
    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    let lastOut = 0;
    for (let i = 0; i < bufferSize; i++) {
        const white = Math.random() * 2 - 1;
        data[i] = (lastOut + (0.02 * white)) / 1.02;
        lastOut = data[i];
        data[i] *= 3.5;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    return { source, output: source };
}

function createRain(ctx: AudioContext): SoundResult {
    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.3;
        if (Math.random() < 0.001) {
            data[i] += (Math.random() - 0.5) * 0.8;
        }
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 800;
    filter.Q.value = 0.7;
    source.connect(filter);
    return { source, output: filter };
}

function createLofi(ctx: AudioContext): SoundResult {
    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        const t = i / ctx.sampleRate;
        const beat = Math.sin(2 * Math.PI * 1.5 * t) * 0.1;
        const warmNoise = (Math.random() * 2 - 1) * 0.15;
        data[i] = warmNoise + beat * 0.05;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 600;
    source.connect(filter);
    return { source, output: filter };
}

function createCafe(ctx: AudioContext): SoundResult {
    const bufferSize = 3 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        data[i] = (Math.random() * 2 - 1) * 0.2;
        if (Math.random() < 0.0003) {
            const clink = Math.sin(i * 0.5) * 0.4 * Math.exp(-((i % 1000) / 200));
            data[i] += clink;
        }
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = 500;
    filter.Q.value = 0.5;
    source.connect(filter);
    return { source, output: filter };
}

export function playAmbientSound(type: string): void {
    stopAmbientSound();
    if (type === 'none') return;

    const ctx = getContext();
    if (ctx.state === 'suspended') {
        ctx.resume();
    }

    const gain = ctx.createGain();
    gain.gain.value = 0.2;
    gain.connect(ctx.destination);

    let result: SoundResult;

    switch (type) {
        case 'rain': result = createRain(ctx); break;
        case 'lofi': result = createLofi(ctx); break;
        case 'cafe': result = createCafe(ctx); break;
        case 'whitenoise': result = createBrownNoise(ctx); break;
        default: return;
    }

    result.output.connect(gain);
    result.source.start();

    currentSource = result.source;
    currentGain = gain;
    isPlaying = true;
}

export function stopAmbientSound(): void {
    try {
        if (currentSource) {
            currentSource.stop();
            currentSource.disconnect();
        }
        if (currentGain) {
            currentGain.disconnect();
        }
    } catch {
        // already stopped
    }
    currentSource = null;
    currentGain = null;
    isPlaying = false;
}

export function isAmbientPlaying(): boolean {
    return isPlaying;
}
