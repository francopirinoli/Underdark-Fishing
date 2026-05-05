/**
 * js/audio/biomes/frozen_music.js
 * Frozen Fjord (Ice)
 * Vibe: Brittle, cold, lonely, expansive, glacial.
 * Instruments: High breathy pads, deep sustained bass, solitary flute, "cracking ice" staccato arps.
 */

export function compose(engine, rng, theory) {
    const { getNoteInScale, SCALES, safeVel } = theory;

    // Very slow, frozen tempo
    Tone.Transport.bpm.value = rng.int(45, 55); 
    const root = rng.int(0, 11); 
    
    // Minor (Aeolian) for classic sadness, Dorian for a slightly more majestic, starry-night cold
    const scale = rng.pick([SCALES.minor, SCALES.dorian]); 

    // Soft tape hiss to simulate a biting, freezing wind
    engine.synths.noiseTape.volume.value = -25; 

    // Smooth, breathy, glassy synths
    const padSynth = rng.pick(['padChoir', 'padStrings']);
    const leadSynth = rng.pick(['leadFlute', 'leadOboe']); // Flute is especially lonely

    // --- 1. SLOW GLACIAL CHORDS (8 Measure Loop) ---
    // Wide, slow progressions that take a long time to resolve
    const chordProgressions = [[0, 5, 2, 6], // i, VI, III, VII (Classic epic/sad minor progression)[0, 3, 4, 0], // i, iv, v, i (Bleak, unresolved)[0, 5, 4, 5], // i, VI, v, VI (Hovering, stuck in place)[0, 2, 5, 4]  // i, III, VI, v
    ];
    const prog = rng.pick(chordProgressions);
    
    const padEvents = []; 
    const bassEvents =[];

    for (let i = 0; i < 4; i++) {
        const time = `${i * 2}:0:0`; // Chord changes every 2 measures
        const deg = prog[i];
        
        // High, sparse voicings (Octave 4) to leave the middle empty and cold
        const voicing =[deg, deg + 2, deg + 4];
        if (rng.chance(0.4)) voicing.push(deg + 6); // Add a 7th for a slightly jazzier/dreamy chill
        
        padEvents.push({ 
            time, 
            note: voicing.map(d => getNoteInScale(root, 4, scale, d)), 
            duration: "2m", 
            velocity: safeVel(rng.float(0.3, 0.5)) // Very soft
        });
        
        // Bass sits deep and holds the root
        bassEvents.push({ 
            time, 
            note: getNoteInScale(root, 2, scale, deg), 
            duration: "2m", 
            velocity: safeVel(0.7) 
        });
    }
    
    engine.scheduleTrack('pad', padSynth, padEvents, "8m");
    engine.scheduleTrack('bass', 'bassDrone', bassEvents, "8m");


    // --- 2. ICE CRACKING ARPEGGIOS (5 Measure Loop) ---
    // Simulates the sudden, sharp sound of ice splintering
    const arpEvents =[];
    
    for (let m = 0; m < 5; m++) {
        if (rng.chance(0.55)) { // 55% chance to have a cracking sound this measure
            const beat = rng.int(0, 3);
            const startDeg = rng.pick([0, 2, 4, 7]);
            
            // Rapid burst of 2 to 4 ultra-fast notes
            const burstLen = rng.int(2, 4);
            const direction = rng.pick([1, -1]); // Crack sweeping up or down
            
            for(let i = 0; i < burstLen; i++) {
                arpEvents.push({ 
                    time: `${m}:${beat}:${i}`, // 16th note timing for a fast stutter
                    note: getNoteInScale(root, rng.pick([5, 6]), scale, startDeg + (i * direction)), 
                    duration: "32n", // Very short, staccato pop
                    velocity: safeVel(rng.float(0.5, 0.8)) 
                });
            }
        }
    }
    engine.scheduleTrack('arp', 'arpLute', arpEvents, "5m");


    // --- 3. LONELY, ECHOING MELODY (11 Measure Loop) ---
    // A melody with huge spaces between phrases, echoing in the cavern
    const leadEvents =[];
    
    for (let m = 0; m < 11; m += rng.int(2, 3)) { // Jumps forward 2-3 measures at a time
        if (rng.chance(0.8)) {
            const startBeat = rng.pick([0, 2]);
            const baseDeg = rng.pick([0, 2, 4]); // Anchored on the chord tones
            
            // A long, mournful breath
            leadEvents.push({ 
                time: `${m}:${startBeat}:0`, 
                note: getNoteInScale(root, 5, scale, baseDeg), 
                duration: rng.pick(["1m", "2n."]), 
                velocity: safeVel(rng.float(0.5, 0.7)) 
            });
            
            // A small trill or trailing note
            if (rng.chance(0.6)) {
                const trailBeat = startBeat === 0 ? 2 : 0;
                const trailMeasure = startBeat === 0 ? m : m + 1;
                
                leadEvents.push({ 
                    time: `${trailMeasure}:${trailBeat}:0`, 
                    note: getNoteInScale(root, 5, scale, baseDeg + rng.pick([1, -1])), 
                    duration: "2n", 
                    velocity: safeVel(0.4) 
                });
            }
        }
    }
    engine.scheduleTrack('lead', leadSynth, leadEvents, "11m");


    // --- 4. GLACIER SHIFTING (13 Measure Loop) ---
    // Deep, distant booms simulating shifting ice shelves
    const kickEvents =[];
    for (let m = 0; m < 13; m += rng.int(3, 5)) {
        kickEvents.push({ 
            time: `${m}:0:0`, 
            note: "C1", // Very low frequency
            duration: "1n", 
            velocity: safeVel(rng.float(0.5, 0.8)) 
        });
    }
    engine.scheduleTrack('kick', 'kickCavern', kickEvents, "13m");

    // --- 5. CRYSTAL WIND CHIMES (7 Measure Loop) ---
    // Sparkling, frozen ambient textures
    const chimeEvents =[];
    for (let m = 0; m < 7; m += rng.int(1, 3)) {
        const beat = rng.pick([0, 1, 2, 3]);
        chimeEvents.push({ 
            time: `${m}:${beat}:0`, 
            note: getNoteInScale(root, 6, scale, rng.pick([0, 2, 4, 7])), 
            duration: "2n", 
            velocity: safeVel(rng.float(0.3, 0.5)) 
        });
    }
    engine.scheduleTrack('chimes', 'chimesGlass', chimeEvents, "7m");
}