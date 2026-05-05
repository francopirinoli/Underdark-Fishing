/**
 * js/audio/music_engine.js
 * The Dungeon Synth Master Engine.
 * Houses a vast rack of pre-configured retro synthesizers and music theory math.
 */

import { AudioEngine } from './audio_engine.js';

const NOTES =["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export const SCALES = {
    major:[0, 2, 4, 5, 7, 9, 11],
    minor:[0, 2, 3, 5, 7, 8, 10], 
    dorian:[0, 2, 3, 5, 7, 9, 10], 
    phrygian:[0, 1, 3, 5, 7, 8, 10], 
    locrian:[0, 1, 3, 5, 6, 8, 10], 
    lydian:[0, 2, 4, 6, 7, 9, 11], 
    mixolydian:[0, 2, 4, 5, 7, 9, 10], 
    harmonic_minor:[0, 2, 3, 5, 7, 8, 11], 
    phrygian_dominant:[0, 1, 4, 5, 7, 8, 10], 
    double_harmonic:[0, 1, 4, 5, 7, 8, 11], 
    diminished:[0, 2, 3, 5, 6, 8, 9, 11]
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


export const MusicEngine = {
    synths: {},
    parts: {},
    currentBiome: null,
    echoDelay: null,
    longDelay: null,
    tapeChorus: null,
    warmFilter: null,

    init() {
        if (!AudioEngine.isInitialized || this.synths.padChoir) return;

         // Change globalReverb to musicReverb for these three:
        this.echoDelay = new Tone.FeedbackDelay("8n.", 0.4).connect(AudioEngine.musicReverb);
        this.longDelay = new Tone.FeedbackDelay("2n", 0.6).connect(AudioEngine.musicReverb);

        this.tapeChorus = new Tone.Chorus(4, 2.5, 0.5).start();
        this.warmFilter = new Tone.Filter(2500, "lowpass", -12);
        this.tapeChorus.connect(this.warmFilter);
        this.warmFilter.connect(AudioEngine.musicReverb);

        // --- NORMALIZED VOLUMES ---
        this.synths.padChoir = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: "fatcustom", partials:[1, 0.4, 0.1], spread: 30, count: 3 },
            envelope: { attack: 2.5, decay: 1, sustain: 0.8, release: 4 }
        }).connect(this.tapeChorus);
        this.synths.padChoir.volume.value = -16;

        this.synths.padStrings = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: "sawtooth" },
            envelope: { attack: 1.5, decay: 1, sustain: 0.5, release: 3 },
            filterEnvelope: { attack: 1.5, decay: 1, sustain: 0.5, release: 2, baseFrequency: 300, octaves: 2 }
        }).connect(this.tapeChorus);
        this.synths.padStrings.volume.value = -16;

        this.synths.bassDrone = new Tone.PolySynth(Tone.MonoSynth, {
            oscillator: { type: "square" },
            envelope: { attack: 0.5, decay: 2, sustain: 0.6, release: 3 },
            filterEnvelope: { attack: 0.2, decay: 1, sustain: 0.4, release: 2, baseFrequency: 60, octaves: 3 },
        }).connect(this.warmFilter);
        this.synths.bassDrone.volume.value = -12;

        const vibrato = new Tone.Vibrato(4, 0.05).connect(this.echoDelay);
        
        this.synths.leadFlute = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: "triangle" },
            envelope: { attack: 0.2, decay: 0.3, sustain: 0.6, release: 1.5 }
        }).connect(vibrato);
        this.synths.leadFlute.volume.value = -12;

        this.synths.leadOboe = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: "sawtooth" },
            envelope: { attack: 0.1, decay: 0.2, sustain: 0.5, release: 1 }
        }).connect(vibrato);
        this.synths.leadOboe.volume.value = -14;

        this.synths.arpLute = new Tone.PolySynth(Tone.FMSynth, {
            harmonicity: 1.5, modulationIndex: 2,
            oscillator: { type: "triangle" },
            envelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.2 }
        }).connect(this.echoDelay);
        this.synths.arpLute.volume.value = -14;

        this.synths.chimesGlass = new Tone.PolySynth(Tone.FMSynth, {
            harmonicity: 3.5, modulationIndex: 5,
            oscillator: { type: "sine" },
            envelope: { attack: 0.05, decay: 1, sustain: 0, release: 3 }
        }).connect(this.longDelay);
        this.synths.chimesGlass.volume.value = -16;

        this.synths.kickCavern = new Tone.MembraneSynth({
            pitchDecay: 0.05, octaves: 2, oscillator: { type: "sine" },
            envelope: { attack: 0.01, decay: 1.0, sustain: 0, release: 1 }
        }).connect(this.warmFilter);
        this.synths.kickCavern.volume.value = -10;

        this.synths.percToms = new Tone.MembraneSynth({
            pitchDecay: 0.1, octaves: 4, oscillator: { type: "square" },
            envelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.2 }
        }).connect(this.echoDelay);
        this.synths.percToms.volume.value = -14;

        // Vintage rumble
        this.synths.noiseTape = new Tone.NoiseSynth({
            noise: { type: "brown" },
            envelope: { attack: 2, decay: 0, sustain: 1, release: 2 }
        }).connect(this.warmFilter);
        this.synths.noiseTape.volume.value = -40; 

        console.log("🎹 Dungeon Synth Rack Initialized");
    },

    clearTracks() {
        // FIX for RangeError: Do NOT call part.stop(). Just safely dispose of it directly.
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
        
        // Hard cancel all queued events on the timeline
        try { Tone.Transport.cancel(0); } catch(e){} 
    },

    scheduleTrack(trackName, synthName, noteEvents, loopLength = "16m") {
        const synth = this.synths[synthName];
        if (!synth || noteEvents.length === 0) return;

        const part = new Tone.Part((time, event) => {
            synth.triggerAttackRelease(event.note, event.duration, time, event.velocity);
        }, noteEvents);

        part.loop = true;
        part.loopStart = 0;
        part.loopEnd = loopLength;
        part.start(0);

        this.parts[trackName] = part;
    },

    stop() {
        Tone.Transport.stop(0); // Safely stop transport at absolute 0
        this.clearTracks();
        this.currentBiome = null;
    },

    async playBiome(biomeId, rng) {
        if (!AudioEngine.isInitialized) return;
        this.init();
        this.stop();

        this.currentBiome = biomeId;
        console.log(`🎶 Orchestrating Music for Biome: ${biomeId}`);

        this.synths.noiseTape.triggerAttack(Tone.now());

        try {
            const biomeModule = await import(`./biomes/${biomeId}_music.js`);
            biomeModule.compose(this, rng, { getNoteInScale, SCALES, safeVel });
            Tone.Transport.start();
        } catch (err) {
            console.error(`Error loading music for biome ${biomeId}:`, err);
        }
    }
};