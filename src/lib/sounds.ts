// Ambient sound generator using Web Audio API (no external files needed)
let audioCtx: AudioContext | null = null;
let currentNodes: AudioNode[] = [];
let isPlaying = false;

function getContext(): AudioContext {
    if (!audioCtx) {
        audioCtx = new AudioContext();
    }
    return audioCtx;
}

function createBrownNoise(ctx: AudioContext): AudioNode {
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
    return source;
}

function createRain(ctx: AudioContext): AudioNode {
    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        // Pink-ish noise for rain
        data[i] = (Math.random() * 2 - 1) * 0.3;
        if (Math.random() < 0.001) {
            // Occasional "drop" clicks
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
    return filter;
}

function createLofi(ctx: AudioContext): AudioNode {
    const bufferSize = 2 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    // Create a warm, filtered noise with slight rhythm
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
    return filter;
}

function createCafe(ctx: AudioContext): AudioNode {
    const bufferSize = 3 * ctx.sampleRate;
    const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) {
        // Background murmur
        data[i] = (Math.random() * 2 - 1) * 0.2;
        // Occasional clinking
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
    return filter;
}

export function playAmbientSound(type: string): void {
    stopAmbientSound();
    if (type === 'none') return;

    const ctx = getContext();
    const gain = ctx.createGain();
    gain.gain.value = 0.15; // Low volume
    gain.connect(ctx.destination);

    let sourceNode: AudioNode;

    switch (type) {
        case 'rain':
            sourceNode = createRain(ctx);
            break;
        case 'lofi':
            sourceNode = createLofi(ctx);
            break;
        case 'cafe':
            sourceNode = createCafe(ctx);
            break;
        case 'whitenoise':
            sourceNode = createBrownNoise(ctx);
            break;
        default:
            return;
    }

    sourceNode.connect(gain);
    if ('start' in sourceNode) {
        (sourceNode as AudioBufferSourceNode).start();
    }

    currentNodes = [sourceNode, gain];
    isPlaying = true;
}

export function stopAmbientSound(): void {
    currentNodes.forEach(node => {
        try {
            node.disconnect();
            if ('stop' in node) {
                (node as AudioBufferSourceNode).stop();
            }
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
