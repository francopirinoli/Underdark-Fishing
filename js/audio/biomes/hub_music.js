/**
 * js/audio/biomes/hub_music.js
 * Settlement Dock (Hub)
 * Vibe: Safe, warm, cozy, acoustic folk, tavern.
 * Instruments: Finger-picked Lute (Arp), Bouncing Bass, Frame Drum, Singing Lead, Warm Pads.
 */

export function compose(engine, rng, theory) {
    const { getNoteInScale, SCALES, safeVel } = theory;

    // Upbeat, walking tempo
    Tone.Transport.bpm.value = rng.int(75, 88); 
    const root = rng.int(0, 11); 
    
    // Mixolydian/Major = Happy tavern. Dorian = Adventurous/Nostalgic tavern.
    const scale = rng.pick([SCALES.mixolydian, SCALES.major, SCALES.dorian]); 

    // Very quiet tape hiss, just for warmth
    engine.synths.noiseTape.volume.value = -30; 

    const padSynth = rng.pick(['padChoir', 'padStrings']);
    const leadSynth = rng.pick(['leadFlute', 'leadOboe']); 

    // --- 1. FOLK CHORD PROGRESSIONS (8 Measure Loop) ---
    // Grounded, cyclic progressions that feel like a song structure
    const chordProgressions = [[0, 3, 4, 0], // I, IV, V, I (Classic Folk)[0, 5, 3, 4], // I, vi, IV, V (Heartwarming)[0, 4, 5, 3], // I, V, vi, IV (Adventurous)
        [0, 2, 4, 0], // I, iii, V, I (Nostalgic)
        [0, 6, 3, 4]  // I, bVII, IV, V (Very Mixolydian/Tavern)
    ];
    const prog = rng.pick(chordProgressions);
    
    const padEvents =[]; 
    const bassEvents =[];

    for (let i = 0; i < 4; i++) {
        // We stretch each chord to last 2 measures for a relaxed pace
        const time = `${i * 2}:0:0`; 
        const deg = prog[i];
        
        // Warm triad voicings
        const voicing =[deg, deg + 2, deg + 4];
        
        padEvents.push({ 
            time, 
            note: voicing.map(d => getNoteInScale(root, 3, scale, d)), 
            duration: "2m", 
            velocity: safeVel(rng.float(0.3, 0.5)) 
        });
        
        // Bouncing Bassline (Root on beat 1, Fifth on beat 3)
        // Measure 1 of the chord
        bassEvents.push({ time: `${i * 2}:0:0`, note: getNoteInScale(root, 2, scale, deg), duration: "4n", velocity: safeVel(0.8) });
        bassEvents.push({ time: `${i * 2}:2:0`, note: getNoteInScale(root, 2, scale, deg + 4), duration: "4n", velocity: safeVel(0.6) });
        
        // Measure 2 of the chord (Sometimes adds a walking note)
        bassEvents.push({ time: `${i * 2 + 1}:0:0`, note: getNoteInScale(root, 2, scale, deg), duration: "4n", velocity: safeVel(0.7) });
        const walkDeg = rng.chance(0.5) ? deg + 4 : deg + rng.pick([1, -1]);
        bassEvents.push({ time: `${i * 2 + 1}:2:0`, note: getNoteInScale(root, 2, scale, walkDeg), duration: "4n", velocity: safeVel(0.5) });
    }
    
    engine.scheduleTrack('pad', padSynth, padEvents, "8m");
    engine.scheduleTrack('bass', 'bassDrone', bassEvents, "8m");


    // --- 2. LUTE FINGERPICKING (8 Measure Loop) ---
    // Generates a steady, rolling acoustic guitar/lute pattern that follows the chords perfectly
    const arpEvents =[];
    
    for (let i = 0; i < 4; i++) {
        const deg = prog[i];
        
        // Generate a 1-measure picking pattern, then repeat it twice for the 2-measure chord
        const pattern =[
            deg,             // Root
            deg + 4,         // 5th
            deg + 2,         // 3rd
            deg + 4 + 7,     // High 5th
            deg + 7,         // Octave
            deg + 4,         // 5th
            deg + 2,         // 3rd
            deg + rng.pick([1, 4]) // Flourish
        ];

        for (let mOffset = 0; mOffset < 2; mOffset++) {
            const measure = (i * 2) + mOffset;
            for (let eigth = 0; eigth < 8; eigth++) {
                // Occasional rests for human feel
                if (rng.chance(0.9)) {
                    arpEvents.push({ 
                        time: `${measure}:0:${eigth * 2}`, // 8th note spacing
                        note: getNoteInScale(root, 4, scale, pattern[eigth]), 
                        duration: "8n", 
                        velocity: safeVel(rng.float(0.5, 0.7)) 
                    });
                }
            }
        }
    }
    engine.scheduleTrack('arp', 'arpLute', arpEvents, "8m");


    // --- 3. BARDIC MELODY (16 Measure Loop) ---
    // A structured, hummable melody. We use an A-B-A-C format so it feels like a real song.
    
    function generateLyricalMotif(chordDeg) {
        const events =[];
        let beat = 0;
        let currentDeg = chordDeg + rng.pick([0, 2, 4]); // Start on a chord tone
        
        while (beat < 8) { // 2 measures long
            if (rng.chance(0.75)) {
                // Smooth step-wise motion for singability
                currentDeg += rng.pick([1, -1, 0, 2, -2]); 
                
                events.push({
                    time: `0:${Math.floor(beat)}:${Math.floor((beat % 1) * 4)}`,
                    note: getNoteInScale(root, 4, scale, currentDeg),
                    duration: rng.pick(["8n", "4n", "4n."]),
                    velocity: safeVel(rng.float(0.6, 0.8))
                });
            }
            // Classic folk rhythms (quarters, eighths, dotted)
            beat += rng.pick([0.5, 1, 1.5]); 
        }
        return events;
    }

    const motifA = generateLyricalMotif(prog[0]);
    const motifB = generateLyricalMotif(prog[1]);
    const motifC = generateLyricalMotif(prog[3]);

    const shiftMotif = (motif, targetMeasure) => {
        return motif.map(e => {
            const parts = e.time.split(':');
            return { ...e, time: `${parseInt(parts[0]) + targetMeasure}:${parts[1]}:${parts[2]}` };
        });
    };

    const leadEvents =[];
    // Measure 0-7: A - B
    leadEvents.push(...shiftMotif(motifA, 0));
    leadEvents.push(...shiftMotif(motifB, 4));
    // Measure 8-15: A - C
    leadEvents.push(...shiftMotif(motifA, 8));
    leadEvents.push(...shiftMotif(motifC, 12));

    engine.scheduleTrack('lead', leadSynth, leadEvents, "16m");


    // --- 4. TAVERN FRAME DRUM (2 Measure Loop) ---
    // A warm, steady acoustic beat
    const kickEvents =[];
    const percEvents =[];
    
    for (let m = 0; m < 2; m++) {
        // Kick on 1 and 3 (Heartbeat)
        kickEvents.push({ time: `${m}:0:0`, note: "C1", duration: "8n", velocity: safeVel(0.7) });
        kickEvents.push({ time: `${m}:2:0`, note: "C1", duration: "8n", velocity: safeVel(0.6) });
        
        // Subtle ghost kick
        if (rng.chance(0.5)) kickEvents.push({ time: `${m}:3:2`, note: "C1", duration: "8n", velocity: safeVel(0.4) });

        // Toms acting like hand-slaps on a wooden drum (Beat 2 and 4)
        percEvents.push({ time: `${m}:1:0`, note: "G2", duration: "8n", velocity: safeVel(0.6) });
        percEvents.push({ time: `${m}:3:0`, note: "G2", duration: "8n", velocity: safeVel(0.7) });
        
        // Syncopated acoustic shuffle
        if (rng.chance(0.7)) percEvents.push({ time: `${m}:1:2`, note: "C3", duration: "16n", velocity: safeVel(0.4) });
        if (rng.chance(0.5)) percEvents.push({ time: `${m}:2:2`, note: "D3", duration: "16n", velocity: safeVel(0.3) });
    }
    
    engine.scheduleTrack('kick', 'kickCavern', kickEvents, "2m");
    engine.scheduleTrack('perc', 'percToms', percEvents, "2m");

    // --- 5. RARE WIND CHIMES (13 Measure Loop) ---
    // Occasional twinkling, like windchimes hanging from the settlement roof
    const chimeEvents =[];
    for (let m = 0; m < 13; m += rng.int(4, 6)) {
        chimeEvents.push({ 
            time: `${m}:0:0`, 
            note: getNoteInScale(root, 6, scale, rng.pick([0, 2, 4])), 
            duration: "2n", 
            velocity: safeVel(0.3) 
        });
    }
    engine.scheduleTrack('chimes', 'chimesGlass', chimeEvents, "13m");
}