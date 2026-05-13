/**
 * js/audio/biomes/volcanic_music.js
 * Sulphur Springs (Volcanic)
 * Vibe: Aggressive, fiery, driving, hostile, tribal.
 * Instruments: War drums, Galloping Bass, Brassy Pads, Sweeping Arpeggios.
 */

export function compose(engine, rng, theory) {
    const { getNoteInScale, SCALES, safeVel } = theory;

    // Fast, urgent tempo
    Tone.Transport.bpm.value = rng.int(105, 120); 
    const root = rng.int(0, 11); 
    
    // Expanded scales for more variance
    const scale = rng.pick([SCALES.harmonic_minor, SCALES.phrygian_dominant, SCALES.double_harmonic, SCALES.minor]); 

    engine.synths.noiseTape.volume.value = -22; 
    const padSynth = rng.pick(['padBrass', 'padStrings']);
    const leadSynth = 'leadOboe'; 

    // --- 1. AGGRESSIVE CHORDS (8 Measure Loop) ---
    // Expanded chord dictionaries
    const chordProgressions = [
        [0, 5, 4, 0], // i, VI, V, i 
        [0, 1, 4, 5], // i, II, V, VI 
        [0, 3, 7, 4], // i, iv, VII, V
        [0, 7, 6, 5], // Descending tension
        [0, 2, 5, 4]  // i, III, VI, V
    ];
    const prog = rng.pick(chordProgressions);
    
    const padEvents =[]; 
    const bassEvents =[];

    for (let i = 0; i < 4; i++) {
        // Stretch chords across 2 measures for a grander feel
        const time = `${i * 2}:0:0`; 
        const deg = prog[i];
        
        const voicing = [deg, deg + 4]; 
        if (rng.chance(0.6)) voicing.push(deg + rng.pick([2, 3])); // Add minor/major 3rd
        
        padEvents.push({ 
            time, 
            note: voicing.map(d => getNoteInScale(root, 3, scale, d)), 
            duration: "2m", 
            velocity: safeVel(rng.float(0.5, 0.7)) 
        });
        
        // Dynamic Galloping Bassline
        const bNote1 = getNoteInScale(root, 2, scale, deg);
        const bNote2 = getNoteInScale(root, 2, scale, deg + rng.pick([0, 4, 7])); 
        
        for (let mOffset = 0; mOffset < 2; mOffset++) {
            const m = (i * 2) + mOffset;
            for (let beat = 0; beat < 4; beat++) {
                bassEvents.push({ time: `${m}:${beat}:0`, note: bNote1, duration: "8n", velocity: safeVel(0.9) });
                // Groove variance: Don't hammer every single 16th note
                if (rng.chance(0.6)) {
                    bassEvents.push({ time: `${m}:${beat}:2`, note: rng.chance(0.7) ? bNote1 : bNote2, duration: "16n", velocity: safeVel(0.7) });
                }
            }
        }
    }
    
    engine.scheduleTrack('pad', padSynth, padEvents, "8m");
    engine.scheduleTrack('bass', 'bassDrone', bassEvents, "8m");

    // --- 2. TRIBAL WAR DRUMS (2 Measure Loop) ---
    const kickEvents = [];
    const percEvents =[];
    
    for (let m = 0; m < 2; m++) {
        kickEvents.push({ time: `${m}:0:0`, note: "C1", duration: "8n", velocity: safeVel(1.0) });
        kickEvents.push({ time: `${m}:1:2`, note: "C1", duration: "8n", velocity: safeVel(0.8) }); 
        kickEvents.push({ time: `${m}:2:0`, note: "C1", duration: "8n", velocity: safeVel(1.0) });
        
        if (rng.chance(0.6)) kickEvents.push({ time: `${m}:3:2`, note: "C1", duration: "8n", velocity: safeVel(0.8) });

        percEvents.push({ time: `${m}:1:0`, note: "G2", duration: "16n", velocity: safeVel(0.6) });
        percEvents.push({ time: `${m}:2:2`, note: "C3", duration: "16n", velocity: safeVel(0.5) });
        percEvents.push({ time: `${m}:3:0`, note: "D2", duration: "16n", velocity: safeVel(0.6) });
        
        if (m === 1 && rng.chance(0.8)) {
            percEvents.push({ time: `${m}:3:1`, note: "G2", duration: "16n", velocity: safeVel(0.4) });
            percEvents.push({ time: `${m}:3:2`, note: "C3", duration: "16n", velocity: safeVel(0.5) });
            percEvents.push({ time: `${m}:3:3`, note: "D3", duration: "16n", velocity: safeVel(0.6) });
        }
    }
    engine.scheduleTrack('kick', 'kickCavern', kickEvents, "2m");
    engine.scheduleTrack('perc', 'percToms', percEvents, "2m");

    // --- 3. MAGMA BURST ARPEGGIOS (4 Measure Loop) ---
    // Drastically optimized. Generates sweeping runs instead of a relentless 16th-note wall.
    const arpEvents =[];
    for (let m = 0; m < 4; m++) {
        const bursts = rng.int(1, 2); // 1 or 2 bursts per measure
        for (let b = 0; b < bursts; b++) {
            const startBeat = rng.int(0, 3);
            const runLength = rng.int(4, 9); // Run of 4 to 9 notes
            let currentDeg = rng.pick([0, 4, 5, 7]);
            const dir = rng.pick([1, -1]); // Sweep up or down

            for (let i = 0; i < runLength; i++) {
                currentDeg += dir;
                arpEvents.push({ 
                    time: `${m}:${startBeat}:${i}`, // 16th note spacing
                    note: getNoteInScale(root, 5, scale, currentDeg), 
                    duration: "32n", 
                    velocity: safeVel(0.4 + (Math.sin(i * 0.5) * 0.2)) // Humanized swelling volume
                });
            }
        }
    }
    engine.scheduleTrack('arp', 'arpLute', arpEvents, "4m");

    // --- 4. STRUCTURED WAR MOTIF (16 Measure Loop) ---
    // Creates a hummable, aggressive melody using an A-B-A-C structure
    function generateWarMotif(baseDeg) {
        const events =[];
        let beat = 0;
        let currentDeg = baseDeg + rng.pick([0, 4, 7]);

        while (beat < 8) { // 2 measure motif
            if (rng.chance(0.6)) {
                currentDeg += rng.pick([1, -1, 2, -2, 0]);
                events.push({
                    time: `0:${Math.floor(beat)}:${Math.floor((beat % 1) * 4)}`,
                    note: getNoteInScale(root, 4, scale, currentDeg),
                    duration: rng.pick(["8n", "16n", "4n"]),
                    velocity: safeVel(rng.float(0.7, 0.9))
                });
            }
            beat += rng.pick([0.5, 0.5, 1.0]); // Fast, syncopated steps
        }
        return events;
    }

    const motifA = generateWarMotif(prog[0]);
    const motifB = generateWarMotif(prog[1]);
    const motifC = generateWarMotif(prog[3]);

    const shiftMotif = (motif, targetMeasure) => {
        return motif.map(e => {
            const parts = e.time.split(':');
            return { ...e, time: `${parseInt(parts[0]) + targetMeasure}:${parts[1]}:${parts[2]}` };
        });
    };

    const leadEvents =[];
    leadEvents.push(...shiftMotif(motifA, 0));
    leadEvents.push(...shiftMotif(motifB, 4));
    leadEvents.push(...shiftMotif(motifA, 8));
    leadEvents.push(...shiftMotif(motifC, 12));

    engine.scheduleTrack('lead', leadSynth, leadEvents, "16m");

    // --- 5. SPARKS & CINDERS (5 Measure Loop) ---
    const chimeEvents =[];
    for (let m = 0; m < 5; m++) {
        if (rng.chance(0.3)) { // Reduced frequency to save CPU
            const beat = rng.int(0, 3);
            const sixteenth = rng.pick([0, 2]);
            
            chimeEvents.push({ 
                time: `${m}:${beat}:${sixteenth}`, 
                note:[
                    getNoteInScale(root, 6, scale, rng.pick([0, 4])), 
                    getNoteInScale(root, 6, scale, rng.pick([1, 5]))
                ], 
                duration: "16n", 
                velocity: safeVel(rng.float(0.5, 0.8)) 
            });
        }
    }
    engine.scheduleTrack('chimes', 'chimesGlass', chimeEvents, "5m");
}