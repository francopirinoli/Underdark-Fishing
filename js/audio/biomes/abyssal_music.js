/**
 * js/audio/biomes/abyssal_music.js
 * The Abyssal Trench
 * Vibe: Surreal, unnerving, high-pressure horror, mysterious.
 * Instruments: Deep Choir, Sub-Drone, Ghostly Flute, Liquid Arps, Cavernous Clangs.
 */

export function compose(engine, rng, theory) {
    const { getNoteInScale, SCALES, safeVel } = theory;

    // 1. Core Atmosphere Setup
    // Oppressively slow tempo
    Tone.Transport.bpm.value = rng.int(38, 48); 
    const root = rng.int(0, 11); 
    
    // Double Harmonic is extremely exotic/creepy. Diminished is standard horror.
    const scale = rng.pick([SCALES.double_harmonic, SCALES.diminished]); 

    // Heavy "cavern rumble" brown noise
    engine.synths.noiseTape.volume.value = -25; 

    const leadSynth = 'leadFlute';
    const padSynth = 'padChoir';

    // --- 2. THE VOID FOUNDATION (16 Measure Loop) ---
    // Chords shift only once every 4 measures, creating a sense of massive scale.
    const chordProgressions = [
        [0, 1, 0, 1], // Tension between Root and Minor 2nd
        [0, 4, 5, 1], // Wide, unsettling jumps
        [0, 0, 1, 1]  // Extremely static and heavy
    ];
    const prog = rng.pick(chordProgressions);
    
    const padEvents = []; 
    const bassEvents =[];

    for (let i = 0; i < 4; i++) {
        const time = `${i * 4}:0:0`; // Every 4 measures
        const deg = prog[i];
        
        // Massive, ultra-low sub-drone
        bassEvents.push({ 
            time, 
            note: getNoteInScale(root, 1, scale, deg), 
            duration: "4m", 
            velocity: safeVel(0.9) 
        });

        // Hollow, dissonant choir voicing (Root + Tritone + Minor 2nd)
        const voicing = [deg, deg + 1, deg + 4];
        padEvents.push({ 
            time, 
            note: voicing.map(d => getNoteInScale(root, 2, scale, d)), 
            duration: "4m", 
            velocity: safeVel(0.4) 
        });
    }
    
    engine.scheduleTrack('pad', padSynth, padEvents, "16m");
    engine.scheduleTrack('bass', 'bassDrone', bassEvents, "16m");


    // --- 3. SURREAL GHOST MELODY (11 Measure Loop) ---
    // Mournful, long notes that drift in and out of the echo
    const leadEvents =[];
    for (let m = 0; m < 11; m++) {
        if (rng.chance(0.4)) { // Sparse melody
            const startBeat = rng.pick([0, 1, 2]);
            const degree = rng.pick([0, 1, 4, 5, 7, 8]);
            
            leadEvents.push({ 
                time: `${m}:${startBeat}:0`, 
                note: getNoteInScale(root, 4, scale, degree), 
                duration: rng.pick(["1m", "2m"]), 
                velocity: safeVel(rng.float(0.3, 0.6)) 
            });

            // Occasional octave jump (The "Abyssal Leap")
            if (rng.chance(0.3)) {
                leadEvents.push({ 
                    time: `${m}:${startBeat}:2`, 
                    note: getNoteInScale(root, 5, scale, degree), 
                    duration: "4n", 
                    velocity: safeVel(0.3) 
                });
            }
        }
    }
    engine.scheduleTrack('lead', leadSynth, leadEvents, "11m");


    // --- 4. METALLIC HULL CLANGS (13 Measure Loop) ---
    // Simulates the groaning of the boat or distant shifting rocks
    const clangEvents = [];
    for (let m = 0; m < 13; m++) {
        if (rng.chance(0.3)) {
            const beat = rng.int(0, 3);
            const pitch = rng.pick(["C1", "C#1", "D1"]); // Deep, low impact
            
            clangEvents.push({ 
                time: `${m}:${beat}:0`, 
                note: pitch, 
                duration: "2n", 
                velocity: safeVel(rng.float(0.4, 0.7)) 
            });
        }
    }
    engine.scheduleTrack('clangs', 'kickCavern', clangEvents, "13m");


    // --- 5. LIQUID BUBBLES (7 Measure Loop) ---
    // Tiny, rapid blips that sound like bioluminescent fish or rising gas
    const bubbleEvents = [];
    for (let m = 0; m < 7; m++) {
        if (rng.chance(0.6)) {
            const startBeat = rng.int(0, 3);
            const burstLen = rng.int(2, 6);
            for(let i = 0; i < burstLen; i++) {
                bubbleEvents.push({ 
                    time: `${m}:${startBeat}:${i}`, 
                    note: getNoteInScale(root, 6, scale, rng.int(0, 10)), 
                    duration: "32n", 
                    velocity: safeVel(rng.float(0.1, 0.4)) 
                });
            }
        }
    }
    engine.scheduleTrack('bubbles', 'arpHarpsichord', bubbleEvents, "7m");


    // --- 6. ABYSSAL SHRIEKS (19 Measure Loop) ---
    // Sudden, high-pitched dissonant clusters
    const shriekEvents = [];
    for (let m = 0; m < 19; m += rng.int(5, 9)) {
        const time = `${m}:0:0`;
        const baseDeg = rng.pick([1, 4, 8]);
        
        // Two notes 1 semitone apart = Dissonant rub
        shriekEvents.push({ 
            time: time, 
            note: [
                getNoteInScale(root, 5, scale, baseDeg),
                getNoteInScale(root, 6, scale, baseDeg + 1)
            ], 
            duration: "1n", 
            velocity: safeVel(0.5) 
        });
    }
    engine.scheduleTrack('shrieks', 'chimesGlass', shriekEvents, "19m");
}