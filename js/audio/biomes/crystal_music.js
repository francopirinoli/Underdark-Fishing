/**
 * js/audio/biomes/crystal_music.js
 * Shimmering Grottos (Crystal)
 * Vibe: Ethereal, floating, bright, twinkling.
 * Instruments: High Strings, Light Bass, Flute Lead, Cascading Lute Arps, Glass Chimes.
 */

export function compose(engine, rng, theory) {
    const { getNoteInScale, SCALES, safeVel } = theory;

    // 1. Core Atmosphere Setup
    // Slightly faster tempo, but feels slow because of the long chords
    Tone.Transport.bpm.value = rng.int(75, 95); 
    const root = rng.int(0, 11); 
    
    // Lydian is dreamy, floating, and ethereal. Major is triumphant/safe.
    const scale = rng.pick([SCALES.lydian, SCALES.major]); 

    // Gentle tape hiss for cavern air
    engine.synths.noiseTape.volume.value = -30; 

    const padSynth = rng.pick(['padStrings', 'padChoir']);
    const leadSynth = 'leadFlute'; // Flute sounds breathy and light
    const arpSynth = 'arpLute';

    // --- 2. CHORDS & BASS (8 Measure Loop) ---
    // Floating progressions that rarely resolve to the root heavily
    const chordProgressions = [[0, 4, 5, 1], // I, V, vi, II (Very Lydian feel)[0, 1, 4, 5], // I, II, V, vi
        [0, 3, 4, 0], // I, iv, V, I
        [5, 4, 0, 1]  // vi, V, I, II
    ];
    const prog = rng.pick(chordProgressions);
    
    const padEvents = []; 
    const bassEvents =[];

    for (let i = 0; i < 4; i++) {
        const time = `${i * 2}:0:0`; // Every 2 measures
        const deg = prog[i];
        
        // High-octave, wide, airy chords
        const voicing = [deg, deg + 2, deg + 4];
        if (rng.chance(0.6)) voicing.push(deg + 6); // Add a 7th for a jazzy/dreamy feel
        
        padEvents.push({ 
            time, 
            note: voicing.map(d => getNoteInScale(root, 4, scale, d)), // Octave 4 (High)
            duration: "2m", 
            velocity: safeVel(rng.float(0.3, 0.5)) 
        });
        
        // Bass is short and soft, so it doesn't ground the track too much
        bassEvents.push({ 
            time, 
            note: getNoteInScale(root, 2, scale, deg), 
            duration: "1m", // Only lasts half the chord length
            velocity: safeVel(0.5) 
        });
    }
    
    engine.scheduleTrack('pad', padSynth, padEvents, "8m");
    engine.scheduleTrack('bass', 'bassDrone', bassEvents, "8m");


    // --- 3. CASCADING CRYSTAL SWEEPS (5 Measure Loop) ---
    // Rapid bursts of notes sweeping up or down
    const arpEvents = [];
    const dir = rng.pick([1, -1]); // Sweep direction
    
    for (let m = 0; m < 5; m++) {
        for (let b = 0; b < 4; b++) {
            // 35% chance to trigger a sweep on any beat
            if (rng.chance(0.35)) {
                const startNote = rng.pick([0, 2, 4]); // Start on root, 3rd, or 5th
                
                // Burst of 5 rapid notes
                for(let i = 0; i < 5; i++) {
                    // Velocity fades out as the sweep happens
                    let vel = safeVel(rng.float(0.4, 0.6) - (i * 0.05));
                    // Octave jumps up/down as the sweep progresses
                    let oct = 5 + Math.floor(i / 3) * dir; 
                    
                    arpEvents.push({ 
                        time: `${m}:${b}:${i * 0.5}`, // Very fast spacing (32nd note equivalent)
                        note: getNoteInScale(root, oct, scale, startNote + (i * dir)), 
                        duration: "32n", 
                        velocity: vel 
                    });
                }
            }
        }
    }
    engine.scheduleTrack('arp', arpSynth, arpEvents, "5m");


    // --- 4. FLOATING MELODY (11 Measure Loop) ---
    // Very sparse, slow, breathing melody
    const leadEvents =[];
    for (let m = 0; m < 11; m += rng.int(2, 3)) {
        if (rng.chance(0.8)) {
            const startBeat = rng.pick([0, 2]);
            const startDeg = rng.pick([0, 2, 4]);
            
            // Long, soaring note
            leadEvents.push({ 
                time: `${m}:${startBeat}:0`, 
                note: getNoteInScale(root, 5, scale, startDeg), 
                duration: rng.pick(["1m", "2n."]), 
                velocity: safeVel(0.5) 
            });
            
            // Sometimes resolves to a second note
            if (rng.chance(0.5)) {
                leadEvents.push({ 
                    time: `${m + 1}:0:0`, 
                    note: getNoteInScale(root, 5, scale, startDeg + rng.pick([1, -1, 2])), 
                    duration: "2n", 
                    velocity: safeVel(0.4) 
                });
            }
        }
    }
    engine.scheduleTrack('lead', leadSynth, leadEvents, "11m");


    // --- 5. GLASS CHIMES (7 Measure Loop) ---
    // Pure, ethereal ringing echoing in the huge reverb
    const chimeEvents =[];
    for (let m = 0; m < 7; m += rng.int(1, 3)) {
        const beat = rng.pick([0, 1, 2, 3]);
        
        chimeEvents.push({ 
            time: `${m}:${beat}:0`, 
            // Very high octave (6 or 7)
            note: getNoteInScale(root, rng.pick([6, 7]), scale, rng.pick([0, 2, 4, 6])), 
            duration: "1n", 
            velocity: safeVel(rng.float(0.3, 0.6)) 
        });
    }
    engine.scheduleTrack('chimes', 'chimesGlass', chimeEvents, "7m");
}