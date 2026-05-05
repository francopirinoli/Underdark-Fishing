/**
 * js/audio/sfx_generator.js
 * Procedural Sound Effects synthesizer.
 * V2 - Adjusted volume balancing across the board and completely redesigned
 * the Tension sound to simulate physical rope strain and creaking.
 */

import { AudioEngine } from './audio_engine.js';
import { getRandomInRange, getRandomInt } from '../util/utils.js';

const SYNTHS = {};
let isTensionPlaying = false;
let speechTimeout = null;

export const SFX = {
    init() {
        if (!AudioEngine.isInitialized) return;

        // UI: Soft wooden thock
        SYNTHS.uiHover = new Tone.MembraneSynth({
            pitchDecay: 0.01, envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 }
        }).connect(AudioEngine.sfxNode);
        SYNTHS.uiHover.volume.value = -18; 

        // UI: Crystal ping
        SYNTHS.uiSelect = new Tone.FMSynth({
            harmonicity: 3, modulationIndex: 2, envelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 0.2 }
        }).connect(AudioEngine.sfxReverb);
        SYNTHS.uiSelect.volume.value = -14; 

        // UI: Error / Deny (Dull thud) - VOL BOOSTED
        SYNTHS.error = new Tone.MembraneSynth({
            pitchDecay: 0.05, octaves: 1, envelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.1 }
        }).connect(AudioEngine.sfxNode);
        SYNTHS.error.volume.value = -2; // Was -12

        // Coins / Gold
        SYNTHS.gold = new Tone.MetalSynth({
            frequency: 1500, envelope: { attack: 0.001, decay: 0.4, release: 0.2 },
            harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5
        }).connect(AudioEngine.sfxNode);
        SYNTHS.gold.volume.value = -16;

        // Fishing Cast (Sine sweep) - VOL BOOSTED
        SYNTHS.cast = new Tone.Synth({
            oscillator: { type: 'sine' }, envelope: { attack: 0.01, decay: 0.4, sustain: 0, release: 0.4 }
        }).connect(AudioEngine.sfxReverb);
        SYNTHS.cast.volume.value = -6; // Was -14

        // Splash (Filtered noise burst)
        SYNTHS.splashFilter = new Tone.Filter(1000, "lowpass").connect(AudioEngine.sfxReverb);
        SYNTHS.splash = new Tone.NoiseSynth({
            noise: { type: "white" }, envelope: { attack: 0.01, decay: 0.4, sustain: 0, release: 0.5 }
        }).connect(SYNTHS.splashFilter);
        SYNTHS.splash.volume.value = -8; 

        // Boat Move / Water Ripple - VOL BOOSTED
        SYNTHS.rippleFilter = new Tone.Filter(400, "bandpass").connect(AudioEngine.sfxNode);
        SYNTHS.ripple = new Tone.NoiseSynth({
            noise: { type: "pink" }, envelope: { attack: 0.2, decay: 0.5, sustain: 0, release: 0.5 }
        }).connect(SYNTHS.rippleFilter);
        SYNTHS.ripple.volume.value = -8; // Was -20

        // Reeling Ratchet (Square wave clicks)
        SYNTHS.reel = new Tone.Synth({
            oscillator: { type: 'square' }, envelope: { attack: 0.001, decay: 0.05, sustain: 0, release: 0.01 }
        }).connect(AudioEngine.sfxNode);
        SYNTHS.reel.volume.value = -16;

        // Line Snap (Harsh Sawtooth) - VOL BOOSTED
        SYNTHS.snap = new Tone.Synth({
            oscillator: { type: 'sawtooth' }, envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.1 }
        }).connect(AudioEngine.sfxReverb);
        SYNTHS.snap.volume.value = -2; // Was -8

        // Success / Catch (PolySynth Arpeggio)
        SYNTHS.catch = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: "triangle" }, envelope: { attack: 0.05, decay: 0.2, sustain: 0.2, release: 1 }
        }).connect(AudioEngine.sfxReverb);
        SYNTHS.catch.volume.value = -10;

        // Level Up (FM Sweeps)
        SYNTHS.levelUp = new Tone.PolySynth(Tone.FMSynth, {
            harmonicity: 2, modulationIndex: 5, envelope: { attack: 0.1, decay: 0.3, sustain: 0.4, release: 2 }
        }).connect(AudioEngine.sfxReverb);
        SYNTHS.levelUp.volume.value = -10;

        // Dialogue Blip 
        SYNTHS.dialogue = new Tone.Synth({
            oscillator: { type: 'triangle' }, envelope: { attack: 0.01, decay: 0.05, sustain: 0, release: 0.02 }
        }).connect(AudioEngine.sfxNode);
        SYNTHS.dialogue.volume.value = -16;

        // --- NEW: TENSION ROPE CREAK ---
        // Uses Brown noise (deep rumble) filtered tightly and chopped by a Tremolo
        SYNTHS.tensionNoise = new Tone.NoiseSynth({
            noise: { type: 'brown' },
            envelope: { attack: 0.5, decay: 0, sustain: 1, release: 0.5 }
        });
        SYNTHS.tensionFilter = new Tone.Filter(300, "bandpass", -24);
        SYNTHS.tensionVol = new Tone.Volume(-Infinity).connect(AudioEngine.sfxNode);
        
        SYNTHS.tensionTremolo = new Tone.Tremolo({
            frequency: 2, type: "square", depth: 1, spread: 180
        }).start();

        SYNTHS.tensionNoise.connect(SYNTHS.tensionFilter);
        SYNTHS.tensionFilter.connect(SYNTHS.tensionTremolo);
        SYNTHS.tensionTremolo.connect(SYNTHS.tensionVol);
    },

    playUIHover() { if (SYNTHS.uiHover) SYNTHS.uiHover.triggerAttackRelease("C3", "32n"); },
    playUISelect() { if (SYNTHS.uiSelect) SYNTHS.uiSelect.triggerAttackRelease("E6", "16n"); },
    playError() { if (SYNTHS.error) SYNTHS.error.triggerAttackRelease("C2", "8n"); },
    playGold() { if (SYNTHS.gold) SYNTHS.gold.triggerAttackRelease("16n"); },
    
    playCast() {
        if (!SYNTHS.cast) return;
        SYNTHS.cast.frequency.setValueAtTime("A3", Tone.now());
        SYNTHS.cast.frequency.exponentialRampToValueAtTime("A6", Tone.now() + 0.4);
        SYNTHS.cast.triggerAttackRelease("4n");
    },
    
    playSplash() {
        if (!SYNTHS.splash) return;
        SYNTHS.splashFilter.frequency.value = getRandomInRange(600, 1500);
        SYNTHS.splash.triggerAttackRelease("8n");
    },

    playThrash() {
        // A heavier, lower, longer splash for when the fish fights back
        if (!SYNTHS.splash) return;
        SYNTHS.splashFilter.frequency.value = getRandomInRange(300, 800);
        SYNTHS.splash.triggerAttackRelease("4n");
    },
    
    playBoatMove() {
        if (!SYNTHS.ripple) return;
        SYNTHS.rippleFilter.frequency.setValueAtTime(150, Tone.now());
        SYNTHS.rippleFilter.frequency.exponentialRampToValueAtTime(600, Tone.now() + 0.3);
        SYNTHS.ripple.triggerAttackRelease("4n");
    },
    
    playReel() {
        if (!SYNTHS.reel) return;
        const notes =["C5", "C#5", "D5"];
        SYNTHS.reel.triggerAttackRelease(notes[Math.floor(Math.random()*notes.length)], "64n");
    },
    
    playLineSnap() {
        if (!SYNTHS.snap) return;
        SYNTHS.snap.frequency.setValueAtTime("C3", Tone.now());
        SYNTHS.snap.frequency.exponentialRampToValueAtTime("C1", Tone.now() + 0.2);
        SYNTHS.snap.triggerAttackRelease("8n");
    },
    
    playCatchSuccess() {
        if (!SYNTHS.catch) return;
        const now = Tone.now();
        SYNTHS.catch.triggerAttackRelease("C5", "8n", now);
        SYNTHS.catch.triggerAttackRelease("E5", "8n", now + 0.1);
        SYNTHS.catch.triggerAttackRelease("G5", "4n", now + 0.2);
        SYNTHS.catch.triggerAttackRelease("C6", "2n", now + 0.3);
    },
    
    playLevelUp() {
        if (!SYNTHS.levelUp) return;
        const now = Tone.now();
        SYNTHS.levelUp.triggerAttackRelease(["C4", "G4", "D5"], "2n", now);
        SYNTHS.levelUp.triggerAttackRelease(["E4", "B4", "G5"], "1n", now + 0.2);
    },

    speakText(text, race, gender, baseSpeedMs = 50) {
        if (!SYNTHS.dialogue) return;
        if (speechTimeout) clearTimeout(speechTimeout);

        let baseFreq = 300;
        let oscType = 'triangle';

        if (race === 'Orc') {
            oscType = 'square'; 
            baseFreq = gender === 'Male' ? 90 : 130;
        } else if (race === 'Dwarf') {
            oscType = 'sawtooth'; 
            baseFreq = gender === 'Male' ? 140 : 180;
        } else if (race === 'Human') {
            oscType = 'triangle'; 
            baseFreq = gender === 'Male' ? 200 : 280;
        } else if (race === 'Elf') {
            oscType = 'sine'; 
            baseFreq = gender === 'Male' ? 300 : 400;
        }

        SYNTHS.dialogue.oscillator.type = oscType;
        baseFreq += getRandomInRange(-20, 20);

        let index = 0;

        function playNextCharacter() {
            if (index >= text.length) return;
            const char = text[index];
            let delay = baseSpeedMs;

            if (char.match(/[a-zA-Z0-9]/)) {
                const charCodeOffset = (char.charCodeAt(0) % 15) * 5; 
                const inflection = (index % 2 === 0) ? charCodeOffset : -charCodeOffset;
                SYNTHS.dialogue.triggerAttackRelease(baseFreq + inflection, "32n");
            } 
            else if (char === '.' || char === '!' || char === '?') delay += 250;
            else if (char === ',') delay += 100;
            else if (char === ' ') delay += 20; 

            index++;
            speechTimeout = setTimeout(playNextCharacter, delay);
        }
        playNextCharacter();
    },

    updateTension(tensionValue) {
        if (!SYNTHS.tensionNoise) return;

        if (tensionValue > 50) {
            if (!isTensionPlaying) {
                SYNTHS.tensionNoise.triggerAttack(Tone.now());
                isTensionPlaying = true;
            }
            
            // Map tension (50-100) to Volume (-20dB to -5dB)
            const vol = -20 + ((tensionValue - 50) / 50) * 15;
            SYNTHS.tensionVol.volume.rampTo(vol, 0.1);
            
            // Map tension to stutter speed (Rope creaks faster)
            const tremFreq = 3 + ((tensionValue - 50) / 50) * 15; // 3Hz to 18Hz
            SYNTHS.tensionTremolo.frequency.rampTo(tremFreq, 0.1);
            
            // Map tension to filter pitch (Creak gets tighter/higher pitched)
            const cutoff = 300 + ((tensionValue - 50) / 50) * 800; // 300Hz to 1100Hz
            SYNTHS.tensionFilter.frequency.rampTo(cutoff, 0.1);

        } else {
            if (isTensionPlaying) {
                SYNTHS.tensionNoise.triggerRelease();
                SYNTHS.tensionVol.volume.rampTo(-Infinity, 0.2); // Fade out safely
                isTensionPlaying = false;
            }
        }
    }
};