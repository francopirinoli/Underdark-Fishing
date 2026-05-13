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

        // REVERT: Bring back Tone.Reverb (Convolution) for music. 
        // Freeverb's comb filters cause metallic "tremolo" ringing on long sustained pads.
        this.musicReverb = new Tone.Reverb({ decay: 3.5, preDelay: 0.05 });
        await this.musicReverb.generate(); 
        this.musicReverb.wet.value = 0.35; 
        this.musicReverb.connect(this.musicNode);

        // KEEP: Freeverb for SFX. It's cheap and fine for short sounds like splashes and clicks.
        this.sfxReverb = new Tone.Freeverb({ roomSize: 0.6, dampening: 4000 });
        this.sfxReverb.wet.value = 0.25;
        this.sfxReverb.connect(this.sfxNode);

        this.isInitialized = true;
        console.log("🎵 Audio Engine Initialized (Hybrid Reverbs)");
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