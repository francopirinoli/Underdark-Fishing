/**
 * js/audio/music_engine.js
 * The Dungeon Synth Master Engine.
 * V6 - DYNAMIC SOUNDFONT BAKER (Sequential Baking to prevent AudioContext crashes).
 */

import { AudioEngine } from './audio_engine.js';

const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export const SCALES = {
    major: [0, 2, 4, 5, 7, 9, 11],
    minor: [0, 2, 3, 5, 7, 8, 10], 
    dorian: [0, 2, 3, 5, 7, 9, 10], 
    phrygian: [0, 1, 3, 5, 7, 8, 10], 
    locrian: [0, 1, 3, 5, 6, 8, 10], 
    lydian: [0, 2, 4, 6, 7, 9, 11], 
    mixolydian: [0, 2, 4, 5, 7, 9, 10], 
    harmonic_minor: [0, 2, 3, 5, 7, 8, 11], 
    phrygian_dominant: [0, 1, 4, 5, 7, 8, 10], 
    double_harmonic: [0, 1, 4, 5, 7, 8, 11], 
    diminished: [0, 2, 3, 5, 6, 8, 9, 11]
};

export function getNoteInScale(rootIndex, baseOctave, scaleArr, degree) {
    if (!scaleArr) return `${NOTES[0]}4`; 
    const scaleLen = scaleArr.length;
    const wrappedDegree = ((degree % scaleLen) + scaleLen) % scaleLen;
    const octaveShift = Math.floor(degree / scaleLen);
    const semitoneOffset = rootIndex + scaleArr[wrappedDegree];
    const noteIndex = semitoneOffset % 12;
    const finalOctave = baseOctave + octaveShift + Math.floor(semitoneOffset / 12);
    return `${NOTES[noteIndex]}${finalOctave}`;
}

export const safeVel = (v) => Math.max(0.01, Math.min(1.0, Number(v.toFixed(3))));

// --- THE BAKER FUNCTION ---
// Renders a single note of a heavy synth into an AudioBuffer offline instantly.
async function bakeSynth(Ctor, options, note, duration, triggerDur) {
    return await Tone.Offline(() => {
        const synth = new Ctor(options).toDestination();
        synth.triggerAttackRelease(note, triggerDur, 0);
    }, duration);
}

export const MusicEngine = {
    synths: {},
    parts: {},
    currentBiome: null,
    isInitialized: false,
    
    echoDelay: null,
    longDelay: null,
    tapeChorus: null,
    warmFilter: null,

    async init() {
        if (!AudioEngine.isInitialized || this.isInitialized) return;
        this.isInitialized = true;
        
        console.log("🎹 Baking Dynamic Soundfonts sequentially...");

        this.echoDelay = new Tone.FeedbackDelay("8n.", 0.4).connect(AudioEngine.musicReverb);
        this.longDelay = new Tone.FeedbackDelay("2n", 0.6).connect(AudioEngine.musicReverb);

        this.tapeChorus = new Tone.Chorus(4, 2.5, 0.5).start();
        this.warmFilter = new Tone.Filter(2500, "lowpass", -12);
        this.tapeChorus.connect(this.warmFilter);
        this.warmFilter.connect(AudioEngine.musicReverb);

        // --- PHASE 1: BAKE HEAVY SYNTHS TO RAM ---
        // FIX: Await each bake sequentially to prevent exceeding the browser's 6 AudioContext limit!
        try {
            const bufChoir = await bakeSynth(Tone.Synth, { oscillator: { type: "fatcustom", partials: [1, 0.4, 0.1], spread: 30, count: 3 }, envelope: { attack: 2.5, decay: 1, sustain: 0.8, release: 0.8 } }, "C4", 12, 10);
            const bufStrings = await bakeSynth(Tone.Synth, { oscillator: { type: "sawtooth" }, envelope: { attack: 1.5, decay: 1, sustain: 0.5, release: 0.8 } }, "C4", 12, 10);
            const bufBass = await bakeSynth(Tone.MonoSynth, { oscillator: { type: "square" }, envelope: { attack: 0.5, decay: 2, sustain: 0.6, release: 1.0 }, filterEnvelope: { attack: 0.2, decay: 1, sustain: 0.4, release: 1.0, baseFrequency: 60, octaves: 3 } }, "C2", 12, 10);
            const bufFlute = await bakeSynth(Tone.Synth, { oscillator: { type: "triangle" }, envelope: { attack: 0.2, decay: 0.3, sustain: 0.6, release: 0.8 } }, "C4", 6, 4);
            const bufOboe = await bakeSynth(Tone.Synth, { oscillator: { type: "sawtooth" }, envelope: { attack: 0.1, decay: 0.2, sustain: 0.5, release: 0.5 } }, "C4", 6, 4);
            const bufLute = await bakeSynth(Tone.FMSynth, { harmonicity: 1.5, modulationIndex: 2, oscillator: { type: "triangle" }, envelope: { attack: 0.01, decay: 0.15, sustain: 0, release: 0.05 } }, "C4", 2, 1);
            const bufChimes = await bakeSynth(Tone.FMSynth, { harmonicity: 3.5, modulationIndex: 5, oscillator: { type: "sine" }, envelope: { attack: 0.05, decay: 1, sustain: 0, release: 0.5 } }, "C5", 4, 2);
            const bufKick = await bakeSynth(Tone.MembraneSynth, { pitchDecay: 0.05, octaves: 2, oscillator: { type: "sine" }, envelope: { attack: 0.01, decay: 1.0, sustain: 0, release: 1 } }, "C1", 2, 1);
            const bufToms = await bakeSynth(Tone.MembraneSynth, { pitchDecay: 0.1, octaves: 4, oscillator: { type: "square" }, envelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.1 } }, "C2", 1, 0.5);

            const vibrato = new Tone.Vibrato(4, 0.05).connect(this.echoDelay);

            // --- PHASE 2: MOUNT SAMPLERS ---
            this.synths.padChoir = new Tone.Sampler({ urls: { "C4": bufChoir }, release: 0.8 }).connect(this.tapeChorus);
            this.synths.padChoir.volume.value = -14; 

            this.synths.padStrings = new Tone.Sampler({ urls: { "C4": bufStrings }, release: 0.8 }).connect(this.tapeChorus);
            this.synths.padStrings.volume.value = -14;

            this.synths.bassDrone = new Tone.Sampler({ urls: { "C2": bufBass }, release: 1.0 }).connect(this.warmFilter);
            this.synths.bassDrone.volume.value = -10;

            this.synths.leadFlute = new Tone.Sampler({ urls: { "C4": bufFlute }, release: 0.8 }).connect(vibrato);
            this.synths.leadFlute.volume.value = -10;

            this.synths.leadOboe = new Tone.Sampler({ urls: { "C4": bufOboe }, release: 0.5 }).connect(vibrato);
            this.synths.leadOboe.volume.value = -12;

            this.synths.arpLute = new Tone.Sampler({ urls: { "C4": bufLute }, release: 0.1 }).connect(this.echoDelay);
            this.synths.arpLute.volume.value = -12;

            this.synths.chimesGlass = new Tone.Sampler({ urls: { "C5": bufChimes }, release: 0.8 }).connect(this.longDelay);
            this.synths.chimesGlass.volume.value = -14;

            this.synths.kickCavern = new Tone.Sampler({ urls: { "C1": bufKick }, release: 0.5 }).connect(this.warmFilter);
            this.synths.kickCavern.volume.value = -8;

            this.synths.percToms = new Tone.Sampler({ urls: { "C2": bufToms }, release: 0.2 }).connect(this.echoDelay);
            this.synths.percToms.volume.value = -12;

            // Noise Tape remains live (Cheap)
            this.synths.noiseTape = new Tone.NoiseSynth({
                noise: { type: "brown" },
                envelope: { attack: 2, decay: 0, sustain: 1, release: 2 }
            }).connect(this.warmFilter);
            this.synths.noiseTape.volume.value = -40; 

            console.log("🎹 Sampler Rack Online. CPU Saved!");

        } catch (error) {
            console.error("❌ Audio Baker Failed! Ensure Tone.js is loaded properly.", error);
        }
    },

    clearTracks() {
        Object.values(this.parts).forEach(part => {
            if (part) {
                try { part.dispose(); } catch(e){} 
            }
        });
        this.parts = {};
        
        Object.values(this.synths).forEach(synth => {
            if (synth.releaseAll) {
                try { synth.releaseAll(); } catch(e){}
            } else if (synth.triggerRelease) {
                try { synth.triggerRelease(); } catch(e){}
            }
        });
        
        try { Tone.Transport.cancel(0); } catch(e){} 
    },

    scheduleTrack(trackName, synthName, noteEvents, loopLength = "16m") {
        const synth = this.synths[synthName];
        if (!synth || noteEvents.length === 0) return;

        const processedEvents = noteEvents.map(e => ({
            ...e,
            tickTime: Tone.Time(e.time).toTicks()
        }));

        processedEvents.sort((a, b) => a.tickTime - b.tickTime);

        const mergedEvents = [];
        processedEvents.forEach(evt => {
            if (mergedEvents.length > 0) {
                const last = mergedEvents[mergedEvents.length - 1];
                if (last.tickTime === evt.tickTime) {
                    if (!Array.isArray(last.note)) last.note = [last.note];
                    if (Array.isArray(evt.note)) {
                        last.note.push(...evt.note);
                    } else {
                        last.note.push(evt.note);
                    }
                    return; 
                }
            }
            mergedEvents.push(evt);
        });

        const part = new Tone.Part((time, event) => {
            synth.triggerAttackRelease(event.note, event.duration, time, event.velocity);
        }, mergedEvents);

        part.loop = true;
        part.loopStart = 0;
        part.loopEnd = loopLength;
        part.start(0);

        this.parts[trackName] = part;
    },

    stop() {
        Tone.Transport.stop(0); 
        this.clearTracks();
        this.currentBiome = null;
    },

    async playBiome(biomeId, rng) {
        if (!AudioEngine.isInitialized) return;
        
        await this.init(); 
        
        this.stop();
        this.currentBiome = biomeId;
        console.log(`🎶 Orchestrating Music for Biome: ${biomeId}`);

        if (this.synths.noiseTape) this.synths.noiseTape.triggerAttack(Tone.now());

        try {
            const biomeModule = await import(`./biomes/${biomeId}_music.js`);
            biomeModule.compose(this, rng, { getNoteInScale, SCALES, safeVel });
            Tone.Transport.start();
        } catch (err) {
            console.error(`Error loading music for biome ${biomeId}:`, err);
        }
    }
};