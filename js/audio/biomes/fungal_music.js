/**
 * js/audio/biomes/fungal_music.js
 * The Rot Garden
 * Vibe: Damp, toxic, sluggish, organic, mysterious.
 */

export function compose(engine, rng, theory) {
    const { getNoteInScale, SCALES, safeVel } = theory;

    Tone.Transport.bpm.value = rng.int(45, 58); 
    const root = rng.int(0, 11); 
    const scale = rng.pick([SCALES.phrygian, SCALES.locrian, SCALES.harmonic_minor]); 

    const padSynth = rng.pick(['padChoir', 'padStrings']);
    const leadSynth = rng.pick(['leadOboe', 'leadFlute']);
    const arpSynth = 'arpLute';

    // --- 1. CHORDS & BASS (8 Measure Loop) ---
    const chordProgressions = [[0, 1, 0, 4],       
        [0, 3, 4, 1],[0, 0, 3, 1],       
        [0, 5, 4, 1],[3, 0, 1, 0]        
    ];
    const prog = rng.pick(chordProgressions);
    
    const padEvents = []; 
    const bassEvents =[];

    for (let i = 0; i < 4; i++) {
        const time = `${i * 2}:0:0`; 
        const deg = prog[i];
        
        const voicing =[deg, deg + 2, deg + 4];
        if (rng.chance(0.5)) voicing.push(deg + rng.pick([1, 6])); 
        
        padEvents.push({ 
            time, 
            note: voicing.map(d => getNoteInScale(root, 3, scale, d)), 
            duration: "2m", 
            velocity: safeVel(0.5) 
        });
        
        bassEvents.push({ time, note: getNoteInScale(root, 2, scale, deg), duration: "2m", velocity: safeVel(0.8) });
    }
    
    engine.scheduleTrack('pad', padSynth, padEvents, "8m");
    engine.scheduleTrack('bass', 'bassDrone', bassEvents, "8m");

    // --- 2. WANDERING LEAD MELODY (12 Measure Loop) ---
    function generateMotif(measureOffset, density) {
        const events =[];
        let beat = 0;
        let currentDeg = rng.pick([0, 2, 4, 7]); 
        
        while (beat < 4) { 
            if (rng.chance(density)) {
                currentDeg += rng.pick([1, -1, 2, -2]); 
                if (currentDeg < 0) currentDeg += 2;
                if (currentDeg > 8) currentDeg -= 2;

                events.push({
                    time: `${measureOffset}:${Math.floor(beat)}:${Math.floor((beat % 1) * 4)}`,
                    note: getNoteInScale(root, 4, scale, currentDeg),
                    duration: rng.pick(["8n", "4n", "2n"]),
                    velocity: safeVel(rng.float(0.5, 0.7))
                });
            }
            beat += rng.pick([0.5, 1, 1.5]); 
        }
        return events;
    }

    const motifA = generateMotif(0, 0.7); 
    const motifB = generateMotif(0, 0.4); 
    const motifC = generateMotif(0, 0.8); 

    const shiftMotif = (motif, targetMeasure) => {
        return motif.map(e => {
            const parts = e.time.split(':');
            return { ...e, time: `${parseInt(parts[0]) + targetMeasure}:${parts[1]}:${parts[2]}` };
        });
    };

    const leadEvents =[];
    leadEvents.push(...shiftMotif(motifA, 0));
    leadEvents.push(...shiftMotif(motifB, 3));
    leadEvents.push(...shiftMotif(motifA, 6));
    leadEvents.push(...shiftMotif(motifC, 9));

    engine.scheduleTrack('lead', leadSynth, leadEvents, "12m");

    // --- 3. SPORE DROPS (5 Measure Loop) ---
    const arpEvents =[];
    const numDrips = rng.int(2, 4); 
    
    for (let i = 0; i < numDrips; i++) {
        const startMeasure = rng.int(0, 4);
        const startBeat = rng.int(0, 3);
        const dir = rng.pick([1, -1]);
        const startDeg = rng.pick([0, 1, 3, 5, 7]);
        
        const burstLen = rng.int(3, 5);
        for(let j = 0; j < burstLen; j++) {
            arpEvents.push({ 
                time: `${startMeasure}:${startBeat}:${j * 1.5}`, 
                note: getNoteInScale(root, rng.pick([4, 5]), scale, startDeg + (j * dir)), 
                duration: "32n", 
                velocity: safeVel(0.4) 
            });
        }
    }
    engine.scheduleTrack('arp', arpSynth, arpEvents, "5m");

    // --- 4. HOLLOW PERCUSSION (3 Measure Loop) ---
    if (rng.chance(0.8)) {
        const percEvents =[];
        percEvents.push({ time: `0:${rng.pick([0, 1])}:0`, note: "C2", duration: "8n", velocity: safeVel(0.5) });
        if (rng.chance(0.5)) percEvents.push({ time: `1:${rng.pick([2, 3])}:2`, note: "G2", duration: "16n", velocity: safeVel(0.3) });
        if (rng.chance(0.5)) percEvents.push({ time: `2:0:0`, note: "C3", duration: "16n", velocity: safeVel(0.3) });
        
        engine.scheduleTrack('perc', 'percToms', percEvents, "3m");
    }
}