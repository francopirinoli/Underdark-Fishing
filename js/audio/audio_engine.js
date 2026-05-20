/**
 * js/audio/audio_engine.js
 * The core Tone.js wrapper. Manages initialization and separated Audio Buses
 * for Music and SFX routing.
 * V3 - Localized, Offline-Ready, and CPU-Optimized Algorithmic Reverbs.
 */

export const AudioEngine = {
    isInitialized: false,
    masterVolume: null,
    musicNode: null,
    sfxNode: null,
    musicReverb: null,
    musicReverbFilter: null, // <-- NEW: Smooths out the algorithmic reverb
    sfxReverb: null,

    async init() {
        if (this.isInitialized) return;
        
        // Ensure Tone is ready (no longer needs to download assets)
        await Tone.start();

        this.masterVolume = new Tone.Volume(0).toDestination();

        // Separate Routing Nodes
        this.musicNode = new Tone.Volume(0).connect(this.masterVolume);
        this.sfxNode = new Tone.Volume(0).connect(this.masterVolume);

        // --- CPU OPTIMIZATION: Algorithmic Reverbs ---
        // We replace the heavy Tone.Reverb (Convolution) with Freeverb to stop CPU crashes.
        // We then route the reverb's wet signal through a Lowpass filter to kill the 
        // "metallic" ringing that Freeverb usually causes on long sustained synth pads.
        this.musicReverb = new Tone.Freeverb({ roomSize: 0.88, dampening: 2500 });
        this.musicReverb.wet.value = 0.35; 
        
        this.musicReverbFilter = new Tone.Filter(2000, "lowpass");
        
        // Route Music -> Reverb -> Filter -> Music Bus
        this.musicReverb.connect(this.musicReverbFilter);
        this.musicReverbFilter.connect(this.musicNode);

        // SFX Reverb (Kept lightweight and bright for splashes)
        this.sfxReverb = new Tone.Freeverb({ roomSize: 0.6, dampening: 4000 });
        this.sfxReverb.wet.value = 0.25;
        this.sfxReverb.connect(this.sfxNode);

        this.isInitialized = true;
        console.log("🎵 Audio Engine Initialized (Optimized CPU Reverbs)");
    },

    setMusicVolume(val) {
        if (!this.isInitialized) return;
        if (val <= 0.01) {
            this.musicNode.mute = true;
        } else {
            this.musicNode.mute = false;
            const db = 20 * Math.log10(val); 
            this.musicNode.volume.value = Math.max(-40, db);
        }
    },

    setSfxVolume(val) {
        if (!this.isInitialized) return;
        if (val <= 0.01) {
            this.sfxNode.mute = true;
        } else {
            this.sfxNode.mute = false;
            const db = 20 * Math.log10(val); 
            this.sfxNode.volume.value = Math.max(-40, db);
        }
    }
};