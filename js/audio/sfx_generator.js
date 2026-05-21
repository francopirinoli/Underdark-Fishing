/**
 * js/audio/sfx_generator.js
 * Procedural Sound Effects synthesizer.
 * V4 - Throttled continuous stream updates to stop WebAudio buffer crashes.
 */

import { AudioEngine } from './audio_engine.js';
import { getRandomInRange } from '../util/utils.js';

const SYNTHS = {};
let isTensionPlaying = false;
let isReelingPlaying = false;
let speechTimeout = null;

// Throttling trackers
const LOOKAHEAD = 0.05; 
let _lastReelTime = 0;    // <-- NEW
let _lastTensionTime = 0; // <-- NEW

export const SFX = {
    _lastTension: 0,
    _lastReelPower: 0,

    init() {
        if (!AudioEngine.isInitialized) return;

        SYNTHS.uiHover = new Tone.MembraneSynth({
            pitchDecay: 0.01, envelope: { attack: 0.001, decay: 0.1, sustain: 0, release: 0.1 }
        }).connect(AudioEngine.sfxNode);
        SYNTHS.uiHover.volume.value = -18; 

        SYNTHS.uiSelect = new Tone.FMSynth({
            harmonicity: 3, modulationIndex: 2, envelope: { attack: 0.01, decay: 0.3, sustain: 0, release: 0.2 }
        }).connect(AudioEngine.sfxReverb);
        SYNTHS.uiSelect.volume.value = -14; 

        SYNTHS.error = new Tone.MembraneSynth({
            pitchDecay: 0.05, octaves: 1, envelope: { attack: 0.01, decay: 0.2, sustain: 0, release: 0.1 }
        }).connect(AudioEngine.sfxNode);
        SYNTHS.error.volume.value = -2;

        SYNTHS.gold = new Tone.MetalSynth({
            frequency: 1500, envelope: { attack: 0.001, decay: 0.4, release: 0.2 },
            harmonicity: 5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5
        }).connect(AudioEngine.sfxNode);
        SYNTHS.gold.volume.value = -16;

        SYNTHS.cast = new Tone.Synth({
            oscillator: { type: 'sine' }, envelope: { attack: 0.01, decay: 0.4, sustain: 0, release: 0.4 }
        }).connect(AudioEngine.sfxReverb);
        SYNTHS.cast.volume.value = -6;

        SYNTHS.splashFilter = new Tone.Filter(1000, "lowpass").connect(AudioEngine.sfxReverb);
        SYNTHS.splash = new Tone.NoiseSynth({
            noise: { type: "white" }, envelope: { attack: 0.01, decay: 0.4, sustain: 0, release: 0.5 }
        }).connect(SYNTHS.splashFilter);
        SYNTHS.splash.volume.value = -8; 

        SYNTHS.rippleFilter = new Tone.Filter(400, "bandpass").connect(AudioEngine.sfxNode);
        SYNTHS.ripple = new Tone.NoiseSynth({
            noise: { type: "pink" }, envelope: { attack: 0.2, decay: 0.5, sustain: 0, release: 0.5 }
        }).connect(SYNTHS.rippleFilter);
        SYNTHS.ripple.volume.value = -8;

        SYNTHS.snap = new Tone.Synth({
            oscillator: { type: 'sawtooth' }, envelope: { attack: 0.001, decay: 0.2, sustain: 0, release: 0.1 }
        }).connect(AudioEngine.sfxReverb);
        SYNTHS.snap.volume.value = -2;

        SYNTHS.catch = new Tone.PolySynth(Tone.Synth, {
            oscillator: { type: "triangle" }, envelope: { attack: 0.05, decay: 0.2, sustain: 0.2, release: 1 }
        }).connect(AudioEngine.sfxReverb);
        SYNTHS.catch.volume.value = -10;

        SYNTHS.levelUp = new Tone.PolySynth(Tone.FMSynth, {
            harmonicity: 2, modulationIndex: 5, envelope: { attack: 0.1, decay: 0.3, sustain: 0.4, release: 2 }
        }).connect(AudioEngine.sfxReverb);
        SYNTHS.levelUp.volume.value = -10;

        SYNTHS.dialogue = new Tone.Synth({
            oscillator: { type: 'triangle' }, envelope: { attack: 0.01, decay: 0.05, sustain: 0, release: 0.02 }
        }).connect(AudioEngine.sfxNode);
        SYNTHS.dialogue.volume.value = -16;

        // --- CONTINUOUS STREAM SYNTHS ---
        SYNTHS.reelOsc = new Tone.Oscillator({ type: 'square' }).start();
        SYNTHS.reelFilter = new Tone.Filter(1000, "bandpass", -24);
        SYNTHS.reelVol = new Tone.Volume(-Infinity).connect(AudioEngine.sfxNode);
        SYNTHS.reelTremolo = new Tone.Tremolo({ frequency: 10, type: "square", depth: 1, spread: 0 }).start();
        
        SYNTHS.reelOsc.connect(SYNTHS.reelFilter);
        SYNTHS.reelFilter.connect(SYNTHS.reelTremolo);
        SYNTHS.reelTremolo.connect(SYNTHS.reelVol);

        SYNTHS.tensionNoise = new Tone.NoiseSynth({
            noise: { type: 'brown' },
            envelope: { attack: 0.5, decay: 0, sustain: 1, release: 0.5 }
        });
        SYNTHS.tensionFilter = new Tone.Filter(300, "bandpass", -24);
        SYNTHS.tensionVol = new Tone.Volume(-Infinity).connect(AudioEngine.sfxNode);
        SYNTHS.tensionTremolo = new Tone.Tremolo({ frequency: 2, type: "square", depth: 1, spread: 180 }).start();

        SYNTHS.tensionNoise.connect(SYNTHS.tensionFilter);
        SYNTHS.tensionFilter.connect(SYNTHS.tensionTremolo);
        SYNTHS.tensionTremolo.connect(SYNTHS.tensionVol);
    },

    playUIHover() { try { if (SYNTHS.uiHover) SYNTHS.uiHover.triggerAttackRelease("C3", "32n", Tone.now() + LOOKAHEAD); } catch(e){} },
    playUISelect() { try { if (SYNTHS.uiSelect) SYNTHS.uiSelect.triggerAttackRelease("E6", "16n", Tone.now() + LOOKAHEAD); } catch(e){} },
    playError() { try { if (SYNTHS.error) SYNTHS.error.triggerAttackRelease("C2", "8n", Tone.now() + LOOKAHEAD); } catch(e){} },
    playGold() { try { if (SYNTHS.gold) SYNTHS.gold.triggerAttackRelease("16n", Tone.now() + LOOKAHEAD); } catch(e){} },
    
    playCast() {
        if (!SYNTHS.cast) return;
        const now = Tone.now() + LOOKAHEAD;
        SYNTHS.cast.frequency.setValueAtTime("A3", now);
        SYNTHS.cast.frequency.exponentialRampToValueAtTime("A6", now + 0.4);
        SYNTHS.cast.triggerAttackRelease("4n", now);
    },
    
    playSplash() {
        if (!SYNTHS.splash) return;
        const now = Tone.now() + LOOKAHEAD;
        SYNTHS.splashFilter.frequency.setValueAtTime(getRandomInRange(600, 1500), now);
        SYNTHS.splash.triggerAttackRelease("8n", now);
    },

    playThrash() {
        if (!SYNTHS.splash) return;
        const now = Tone.now() + LOOKAHEAD;
        SYNTHS.splashFilter.frequency.setValueAtTime(getRandomInRange(300, 800), now);
        SYNTHS.splash.triggerAttackRelease("4n", now);
    },
    
    playBoatMove() {
        if (!SYNTHS.ripple) return;
        const now = Tone.now() + LOOKAHEAD;
        SYNTHS.rippleFilter.frequency.setValueAtTime(150, now);
        SYNTHS.rippleFilter.frequency.exponentialRampToValueAtTime(600, now + 0.3);
        SYNTHS.ripple.triggerAttackRelease("4n", now);
    },
    
    playLineSnap() {
        if (!SYNTHS.snap) return;
        const now = Tone.now() + LOOKAHEAD;
        SYNTHS.snap.frequency.setValueAtTime("C3", now);
        SYNTHS.snap.frequency.exponentialRampToValueAtTime("C1", now + 0.2);
        SYNTHS.snap.triggerAttackRelease("8n", now);
    },
    
    playCatchSuccess() {
        if (!SYNTHS.catch) return;
        const now = Tone.now() + LOOKAHEAD;
        SYNTHS.catch.triggerAttackRelease("C5", "8n", now);
        SYNTHS.catch.triggerAttackRelease("E5", "8n", now + 0.1);
        SYNTHS.catch.triggerAttackRelease("G5", "4n", now + 0.2);
        SYNTHS.catch.triggerAttackRelease("C6", "2n", now + 0.3);
    },
    
    playLevelUp() {
        if (!SYNTHS.levelUp) return;
        const now = Tone.now() + LOOKAHEAD;
        SYNTHS.levelUp.triggerAttackRelease(["C4", "G4", "D5"], "2n", now);
        SYNTHS.levelUp.triggerAttackRelease(["E4", "B4", "G5"], "1n", now + 0.2);
    },

    speakText(text, race, gender, baseSpeedMs = 50) {
        if (!SYNTHS.dialogue) return;
        if (speechTimeout) clearTimeout(speechTimeout);

        // Define default base parameters
        let baseFreq = 220;
        let oscType = 'triangle';
        let targetVol = -16;
        let decay = 0.05;
        let release = 0.02;

        // Custom property matrix to normalize perceived loudness (RMS) and vocal texture
        if (race === 'Orc') {
            oscType = 'square';
            baseFreq = gender === 'Male' ? 90 : 120;
            targetVol = -22; // Heavy attenuation on loud, buzzing square waves
            decay = 0.04;
            release = 0.01; // Tight, blunt, percussive chops
            baseSpeedMs = 60; // Slower, heavier cadence
        } else if (race === 'Dwarf') {
            oscType = 'sawtooth';
            baseFreq = gender === 'Male' ? 130 : 170;
            targetVol = -18; // Sawtooth cuts through easily, moderate cut
            decay = 0.08;
            release = 0.04; // Deep, grunting, slightly warm decay
            baseSpeedMs = 55;
        } else if (race === 'Human') {
            oscType = 'triangle';
            baseFreq = gender === 'Male' ? 220 : 290;
            targetVol = -5; // Triangle needs a massive boost to match saw/square volume
            decay = 0.06;
            release = 0.03; // Warm, natural spoken cadence
            baseSpeedMs = 50;
        } else if (race === 'Elf') {
            // Lyrical, high-pitched flutey voice using triangle with a singing release
            oscType = 'triangle';
            baseFreq = gender === 'Male' ? 340 : 440;
            targetVol = -10; // Mild cut for high frequencies that naturally pierce the mix
            decay = 0.14;
            release = 0.10; // Longer, flowing, ethereal trail
            baseSpeedMs = 45; // Slightly faster, musical flow
        } else if (race === 'Tiefling') {
            oscType = 'sawtooth';
            baseFreq = gender === 'Male' ? 110 : 150;
            targetVol = -18;
            decay = 0.03;
            release = 0.01; // Rapid, chattering clicks with zero sustain
            baseSpeedMs = 42; // Fast, chattering speed
        } else if (race === 'Myconid') {
            // Lethargic, wet, organic bubble-pop voice
            oscType = 'triangle'; 
            baseFreq = 105; // Balanced deep anchor
            targetVol = -4; // Massive boost to project low-frequency sweeps clearly
            decay = 0.15;
            release = 0.08; // Slower bubble-pop expansion trail
            baseSpeedMs = 100; // Speaks with an extremely slow, dripping tempo
        }

        // Apply global synthesis properties to clear out any leftover state from the previous speaker
        SYNTHS.dialogue.oscillator.type = oscType;
        SYNTHS.dialogue.volume.value = targetVol;
        SYNTHS.dialogue.envelope.decay = decay;
        SYNTHS.dialogue.envelope.release = release;

        // Introduce a subtle random frequency drift per sentence to humanize the speech
        baseFreq += getRandomInRange(-15, 15);

        let index = 0;

        function playNextCharacter() {
            if (index >= text.length) return;
            const char = text[index];
            let delay = baseSpeedMs;

            if (char.match(/[a-zA-Z0-9]/)) {
                // Character-specific pitch inflection offsets
                const charCodeOffset = (char.charCodeAt(0) % 15) * 4; 
                const inflection = (index % 2 === 0) ? charCodeOffset : -charCodeOffset;
                const finalFreq = Math.max(65, baseFreq + inflection);
                
                const now = Tone.now() + LOOKAHEAD;
                
                if (race === 'Myconid') {
                    // Custom upward pitch sweep for wet, bubbling spore pops
                    SYNTHS.dialogue.triggerAttack(finalFreq, now);
                    SYNTHS.dialogue.frequency.setValueAtTime(finalFreq, now);
                    SYNTHS.dialogue.frequency.exponentialRampToValueAtTime(finalFreq * 2.5, now + 0.06);
                    SYNTHS.dialogue.triggerRelease(now + 0.06);
                } else {
                    // Standard trigger for all other species
                    SYNTHS.dialogue.triggerAttackRelease(finalFreq, "32n", now);
                }
            } 
            else if (char === '.' || char === '!' || char === '?') delay += 250;
            else if (char === ',') delay += 100;
            else if (char === ' ') delay += 20; 

            index++;
            speechTimeout = setTimeout(playNextCharacter, delay);
        }
        playNextCharacter();
    },

    // --- OPTIMIZED CONTINUOUS REEL UPDATE ---
    updateReel(isReeling, powerPct = 50) {
        if (!SYNTHS.reelOsc) return;

        if (isReeling) {
            if (!isReelingPlaying) {
                SYNTHS.reelVol.volume.rampTo(-14, 0.05);
                isReelingPlaying = true;
            }

            // --- CPU THROTTLE: Only update WebAudio queue every 100ms ---
            const now = Date.now();
            if (now - _lastReelTime < 100) return;
            _lastReelTime = now;

            if (Math.abs(powerPct - this._lastReelPower) < 1.0) return;
            this._lastReelPower = powerPct;

            const speed = 5 + (powerPct / 100) * 20;
            SYNTHS.reelTremolo.frequency.rampTo(speed, 0.1); // Perfect 100ms ramp

            const pitch = 300 + (powerPct * 5);
            SYNTHS.reelOsc.frequency.rampTo(pitch, 0.1);

        } else {
            if (isReelingPlaying) {
                SYNTHS.reelVol.volume.rampTo(-Infinity, 0.05);
                isReelingPlaying = false;
                this._lastReelPower = 0;
            }
        }
    },

    playReel(powerPct = 50) {
        this.updateReel(true, powerPct);
    },

    // --- OPTIMIZED TENSION CONTINUOUS UPDATE ---
    updateTension(tensionValue) {
        if (!SYNTHS.tensionNoise) return;

        if (tensionValue > 50) {
            if (!isTensionPlaying) {
                SYNTHS.tensionNoise.triggerAttack(Tone.now());
                isTensionPlaying = true;
            }
            
            // --- CPU THROTTLE: Only update WebAudio queue every 100ms ---
            const now = Date.now();
            if (now - _lastTensionTime < 100) return;
            _lastTensionTime = now;

            if (Math.abs(tensionValue - this._lastTension) < 1.0) return;
            this._lastTension = tensionValue;

            const vol = -20 + ((tensionValue - 50) / 50) * 15;
            SYNTHS.tensionVol.volume.rampTo(vol, 0.1); // Perfect 100ms ramp
            
            const tremFreq = 3 + ((tensionValue - 50) / 50) * 15; 
            SYNTHS.tensionTremolo.frequency.rampTo(tremFreq, 0.1);
            
            const cutoff = 300 + ((tensionValue - 50) / 50) * 800;
            SYNTHS.tensionFilter.frequency.rampTo(cutoff, 0.1);

        } else {
            if (isTensionPlaying) {
                SYNTHS.tensionNoise.triggerRelease(Tone.now());
                SYNTHS.tensionVol.volume.rampTo(-Infinity, 0.1); 
                isTensionPlaying = false;
                this._lastTension = 0;
            }
        }
    }
};