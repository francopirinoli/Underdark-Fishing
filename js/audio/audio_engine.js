/**
 * js/audio/audio_engine.js
 * The core Tone.js wrapper. Manages initialization and separated Audio Buses
 * for Music and SFX routing.
 */

export const AudioEngine = {
    isInitialized: false,
    masterVolume: null,
    musicNode: null,
    sfxNode: null,
    musicReverb: null,
    sfxReverb: null,

    async init() {
        if (this.isInitialized) return;
        await Tone.start();

        this.masterVolume = new Tone.Volume(0).toDestination();

        // Separate Routing Nodes
        this.musicNode = new Tone.Volume(0).connect(this.masterVolume);
        this.sfxNode = new Tone.Volume(0).connect(this.masterVolume);

        // Music Reverb (Long, cavernous)
        this.musicReverb = new Tone.Reverb({ decay: 3.5, preDelay: 0.05 });
        await this.musicReverb.generate(); 
        this.musicReverb.wet.value = 0.35; 
        this.musicReverb.connect(this.musicNode);

        // SFX Reverb (Slightly shorter, punchier)
        this.sfxReverb = new Tone.Reverb({ decay: 2.0, preDelay: 0.05 });
        await this.sfxReverb.generate();
        this.sfxReverb.wet.value = 0.3;
        this.sfxReverb.connect(this.sfxNode);

        this.isInitialized = true;
        console.log("🎵 Audio Engine Initialized (Dual Bus)");
    },

    setMusicVolume(val) {
        if (!this.isInitialized) return;
        if (val <= 0.01) this.musicNode.mute = true;
        else {
            this.musicNode.mute = false;
            const db = 20 * Math.log10(val); 
            this.musicNode.volume.value = Math.max(-40, db);
        }
    },

    setSfxVolume(val) {
        if (!this.isInitialized) return;
        if (val <= 0.01) this.sfxNode.mute = true;
        else {
            this.sfxNode.mute = false;
            const db = 20 * Math.log10(val); 
            this.sfxNode.volume.value = Math.max(-40, db);
        }
    }
};