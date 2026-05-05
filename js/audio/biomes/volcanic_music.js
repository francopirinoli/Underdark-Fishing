/**
 * js/audio/biomes/volcanic_music.js
 * Sulphur Springs (Volcanic)
 * Vibe: Aggressive, fiery, driving, hostile, tribal.
 * Instruments: War drums (Kick/Toms), Galloping Bass, Brassy Pads, Blazing Arpeggios.
 */

export function compose(engine, rng, theory) {
    const { getNoteInScale, SCALES, safeVel } = theory;

    // Fast, urgent tempo to simulate boiling rapids and danger
    Tone.Transport.bpm.value = rng.int(100, 115); 
    const root = rng.int(0, 11); 
    
    // Harmonic Minor gives a gothic, boss-fight feel. 
    // Phrygian Dominant gives a fiery, exotic, desert/volcano feel.
    const scale = rng.pick([SCALES.harmonic_minor, SCALES.phrygian_dominant]); 

    // Turn up the tape hiss to simulate roaring steam vents
    engine.synths.noiseTape.volume.value = -22; 

    // Use brassy or saw-wave pads for a harsh, aggressive texture
    const padSynth = rng.pick(['padBrass', 'padStrings']);
    const leadSynth = 'leadOboe'; // Oboe cuts through the mix with an aggressive bite

    // --- 1. AGGRESSIVE CHORDS & GALLOPING BASS (4 Measure Loop) ---
    // Fast chord changes driving the tension
    const chordProgressions = [[0, 5, 4, 0], // i, VI, V, i (Classic boss-fight progression)[0, 2, 5, 4], // i, III, VI, V[0, 1, 4, 5], // i, II, V, VI (Very Phrygian Dominant)[0, 7, 5, 4]  // i, vii, VI, V (Descending)
    ];
    const prog = rng.pick(chordProgressions);
    
    const padEvents =[]; 
    const bassEvents =[];

    for (let i = 0; i < 4; i++) {
        const time = `${i}:0:0`; // Chord changes every measure
        const deg = prog[i];
        
        // Power chords (Root + 5th) for an aggressive, heavy sound, sometimes adding the minor/major 3rd
        const voicing = [deg, deg + 4]; 
        if (rng.chance(0.6)) voicing.push(deg + 2); 
        
        padEvents.push({ 
            time, 
            note: voicing.map(d => getNoteInScale(root, 3, scale, d)), 
            duration: "1m", 
            velocity: safeVel(rng.float(0.5, 0.7)) 
        });
        
        // The Galloping Bassline
        // Uses a relentless driving rhythm: ONE-and-a-TWO-and-a...
        const bNote1 = getNoteInScale(root, 2, scale, deg);
        const bNote2 = getNoteInScale(root, 2, scale, deg + rng.pick([0, 0, 4])); // Occasionally bounces to the 5th
        
        for (let beat = 0; beat < 4; beat++) {
            // Downbeat
            bassEvents.push({ time: `${i}:${beat}:0`, note: bNote1, duration: "8n", velocity: safeVel(0.9) });
            // Syncopated 16th notes
            if (rng.chance(0.8)) {
                bassEvents.push({ time: `${i}:${beat}:2`, note: bNote2, duration: "16n", velocity: safeVel(0.7) });
                bassEvents.push({ time: `${i}:${beat}:3`, note: bNote1, duration: "16n", velocity: safeVel(0.6) });
            }
        }
    }
    
    engine.scheduleTrack('pad', padSynth, padEvents, "4m");
    engine.scheduleTrack('bass', 'bassDrone', bassEvents, "4m");


    // --- 2. TRIBAL WAR DRUMS (2 Measure Loop) ---
    // A heavy, repeating syncopated drum groove that drives the entire track
    const kickEvents = [];
    const percEvents =[];
    
    for (let m = 0; m < 2; m++) {
        // Core Kick Pattern
        kickEvents.push({ time: `${m}:0:0`, note: "C1", duration: "8n", velocity: safeVel(1.0) });
        kickEvents.push({ time: `${m}:1:2`, note: "C1", duration: "8n", velocity: safeVel(0.8) }); // Syncopated hit
        kickEvents.push({ time: `${m}:2:0`, note: "C1", duration: "8n", velocity: safeVel(1.0) });
        
        if (rng.chance(0.5)) kickEvents.push({ time: `${m}:3:2`, note: "C1", duration: "8n", velocity: safeVel(0.8) });

        // Tom/Click Fills
        percEvents.push({ time: `${m}:1:0`, note: "G2", duration: "16n", velocity: safeVel(0.6) });
        percEvents.push({ time: `${m}:2:2`, note: "C3", duration: "16n", velocity: safeVel(0.5) });
        percEvents.push({ time: `${m}:3:0`, note: "D2", duration: "16n", velocity: safeVel(0.6) });
        
        // Fast 16th note rolling fill at the end of the 2nd measure
        if (m === 1 && rng.chance(0.7)) {
            percEvents.push({ time: `${m}:3:1`, note: "G2", duration: "16n", velocity: safeVel(0.4) });
            percEvents.push({ time: `${m}:3:2`, note: "C3", duration: "16n", velocity: safeVel(0.5) });
            percEvents.push({ time: `${m}:3:3`, note: "D3", duration: "16n", velocity: safeVel(0.6) });
        }
    }
    engine.scheduleTrack('kick', 'kickCavern', kickEvents, "2m");
    engine.scheduleTrack('perc', 'percToms', percEvents, "2m");


    // --- 3. BUBBLING MAGMA ARPEGGIOS (3 Measure Loop) ---
    // Fast, repeating motifs (pedal points) mimicking spitting fire and bubbling lava
    const arpEvents =[];
    const pedalNote = rng.pick([0, 4]); // Anchors on Root or 5th
    const topNote = pedalNote + rng.pick([2, 3, 5]); // Trills up to a higher scale degree
    
    for (let m = 0; m < 3; m++) {
        for (let beat = 0; beat < 4; beat++) {
            if (rng.chance(0.8)) { // 80% chance to play a blazing 16th-note run this beat
                arpEvents.push({ time: `${m}:${beat}:0`, note: getNoteInScale(root, 5, scale, topNote), duration: "16n", velocity: safeVel(0.7) });
                arpEvents.push({ time: `${m}:${beat}:1`, note: getNoteInScale(root, 4, scale, pedalNote), duration: "16n", velocity: safeVel(0.5) });
                arpEvents.push({ time: `${m}:${beat}:2`, note: getNoteInScale(root, 5, scale, topNote - 1), duration: "16n", velocity: safeVel(0.6) });
                arpEvents.push({ time: `${m}:${beat}:3`, note: getNoteInScale(root, 4, scale, pedalNote), duration: "16n", velocity: safeVel(0.4) });
            }
        }
    }
    engine.scheduleTrack('arp', 'arpLute', arpEvents, "3m");


    // --- 4. FRANTIC LEAD MELODY (7 Measure Loop) ---
    // A wandering, aggressive melody that cuts through the chaos
    const leadEvents =[];
    for (let m = 0; m < 7; m++) {
        if (rng.chance(0.65)) {
            const startBeat = rng.pick([0, 1, 2]);
            const startDeg = rng.pick([0, 2, 4, 7]); 
            
            leadEvents.push({ 
                time: `${m}:${startBeat}:0`, 
                note: getNoteInScale(root, 4, scale, startDeg), 
                duration: "8n", 
                velocity: safeVel(0.8) 
            });
            
            leadEvents.push({ 
                time: `${m}:${startBeat}:2`, 
                note: getNoteInScale(root, 4, scale, startDeg + rng.pick([1, 2, -1])), 
                duration: "8n", 
                velocity: safeVel(0.7) 
            });
            
            // Sustained bending note
            if (rng.chance(0.5)) {
                leadEvents.push({ 
                    time: `${m}:${startBeat + 1}:0`, 
                    note: getNoteInScale(root, 4, scale, startDeg + rng.pick([3, 4])), 
                    duration: rng.pick(["4n", "2n"]), 
                    velocity: safeVel(0.8) 
                });
            }
        }
    }
    engine.scheduleTrack('lead', leadSynth, leadEvents, "7m");


    // --- 5. SPARKS & CINDERS (5 Measure Loop) ---
    // Sudden, sharp glass pings that sound like rocks shattering in the heat
    const chimeEvents =[];
    for (let m = 0; m < 5; m++) {
        if (rng.chance(0.4)) {
            const beat = rng.int(0, 3);
            const sixteenth = rng.pick([0, 2]);
            
            // Sharp, dissonant cluster
            chimeEvents.push({ 
                time: `${m}:${beat}:${sixteenth}`, 
                note:[
                    getNoteInScale(root, 6, scale, rng.pick([0, 4])), 
                    getNoteInScale(root, 6, scale, rng.pick([1, 5]))
                ], 
                duration: "16n", 
                velocity: safeVel(rng.float(0.6, 0.9)) 
            });
        }
    }
    engine.scheduleTrack('chimes', 'chimesGlass', chimeEvents, "5m");
}