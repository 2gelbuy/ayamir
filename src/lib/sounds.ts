// Ambient sounds — plays real WAV files from /sounds/ directory
let audioCtx: AudioContext | null = null;
let currentSource: AudioBufferSourceNode | null = null;
let currentGain: GainNode | null = null;
let isPlaying = false;
let currentType = 'none';
const bufferCache: Record<string, AudioBuffer> = {};

function getCtx(): AudioContext {
    if (!audioCtx || audioCtx.state === 'closed') audioCtx = new AudioContext();
    if (audioCtx.state === 'suspended') audioCtx.resume();
    return audioCtx;
}

async function loadBuffer(ctx: AudioContext, name: string): Promise<AudioBuffer> {
    if (bufferCache[name]) return bufferCache[name];
    const url = chrome.runtime.getURL(`/sounds/${name}.wav`);
    const response = await fetch(url);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await ctx.decodeAudioData(arrayBuffer);
    bufferCache[name] = audioBuffer;
    return audioBuffer;
}

export async function playAmbientSound(type: string, volume = 0.5): Promise<void> {
    stopAmbientSound();
    if (type === 'none') return;

    const ctx = getCtx();
    try {
        const buffer = await loadBuffer(ctx, type);
        const source = ctx.createBufferSource();
        source.buffer = buffer;
        source.loop = true;

        const gain = ctx.createGain();
        gain.gain.value = volume;
        gain.connect(ctx.destination);
        source.connect(gain);
        source.start();

        currentSource = source;
        currentGain = gain;
        currentType = type;
        isPlaying = true;
    } catch (e) {
        console.error('Failed to play ambient sound:', e);
    }
}

export function stopAmbientSound(): void {
    try {
        if (currentSource) { currentSource.stop(); currentSource.disconnect(); }
        if (currentGain) { currentGain.disconnect(); }
    } catch { /* already stopped */ }
    currentSource = null;
    currentGain = null;
    isPlaying = false;
    currentType = 'none';
}

export function isAmbientPlaying(): boolean { return isPlaying; }
export function getCurrentSound(): string { return currentType; }
