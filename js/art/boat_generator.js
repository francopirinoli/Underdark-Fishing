/**
 * js/art/boat_generator.js
 * Procedural Boat Generator.
 * V6 - Cleaned Deck, Added Engine Types, Sail Patterns, and expanded palettes.
 */

import { drawScaledRect } from '../util/utils.js';
import { BOAT_PALETTES } from './equipment_palettes.js';

const DISPLAY_SCALE = 4; 

// Grid sizes
const PROF_W = 96, PROF_H = 64;
const TOP_W = 48,  TOP_H = 48; 

export function generateBoat(options = {}) {
    const seed = options.seed || Date.now();
    const rng = options.rng || { 
        int: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min, 
        chance: (p) => Math.random() < p, pick: (arr) => arr[Math.floor(Math.random() * arr.length)] 
    };
    
    // --- 1. ROLL UNIFIED TRAITS ---
    const boatType = options.boatType || rng.pick(['skiff', 'trawler', 'runner', 'dreadnought', 'barge', 'corvette']);
    const paletteKey = rng.pick(Object.keys(BOAT_PALETTES));
    const p = BOAT_PALETTES[paletteKey];

    const hasSail = (['skiff', 'runner', 'corvette'].includes(boatType)) && rng.chance(0.8);
    const sailPattern = rng.pick(['solid', 'striped', 'emblem']);
    
    const hasSmoke = (['trawler', 'dreadnought', 'barge'].includes(boatType)) && rng.chance(0.8);
    
    const enginePool = ['propeller'];
    if (['dreadnought', 'barge', 'trawler'].includes(boatType)) enginePool.push('paddlewheel', 'twin_prop');
    if (['runner', 'corvette'].includes(boatType)) enginePool.push('arcane_thruster', 'twin_prop');
    const engineType = rng.pick(enginePool);

    const decorStyle = rng.pick(['clean', 'shielded', 'spiked']);
    const paintStyle = rng.pick(['solid', 'striped', 'two_tone', 'rimmed']);
    
    const lanternCount = (['dreadnought', 'barge', 'corvette'].includes(boatType)) ? rng.int(2, 4) : rng.int(1, 2);

    // Dimensions
    let bowSize = rng.int(6, 10);
    let profLen = PROF_W - 20;
    let topLen = rng.int(24, 30);
    let topWidth = rng.int(10, 14);
    
    if (boatType === 'skiff') { profLen = 35; topLen = rng.int(20, 26); topWidth = rng.int(8, 10); }
    if (boatType === 'trawler') { profLen = 45; topLen = rng.int(26, 32); topWidth = rng.int(12, 16); bowSize = rng.int(4, 8); }
    if (boatType === 'runner') { profLen = 50; bowSize = rng.int(12, 18); topLen = rng.int(32, 38); topWidth = rng.int(6, 10); }
    if (boatType === 'corvette') { profLen = 60; bowSize = rng.int(14, 20); topLen = rng.int(38, 44); topWidth = rng.int(10, 14); }
    if (boatType === 'barge') { profLen = 65; bowSize = rng.int(2, 5); topLen = rng.int(36, 42); topWidth = rng.int(18, 22); }
    if (boatType === 'dreadnought') { profLen = 70; topLen = rng.int(40, 46); topWidth = rng.int(16, 20); }

    const traits = { boatType, p, hasSail, sailPattern, hasSmoke, engineType, decorStyle, paintStyle, lanternCount, bowSize, profLen, topLen, topWidth };

    // --- 2. RENDER THE CANVASES ---
    const profileCanvas = renderProfile(traits, rng);
    const topDownCanvas = renderTopDown(traits, rng);

    // Naming
    const adjectives = ['Silent', 'Iron', 'Rusty', 'Sunken', 'Vengeful', 'Stalwart', 'Abyssal', 'Swift', 'Crimson', 'Midnight', 'Gilded'];
    const nouns = ['Voyager', 'Wake', 'Tide', 'Seeker', 'Galleon', 'Drifter', 'Wraith', 'Strider', 'Leviathan', 'Banshee'];
    let finalName = p.name;
    if (rng.chance(0.7)) finalName = `${rng.pick(adjectives)} ${rng.pick(nouns)}`;

    return {
        name: finalName,
        imageDataUrl: profileCanvas.toDataURL(),     
        topDownDataUrl: topDownCanvas.toDataURL(),   
        data: { boatType, palette: paletteKey, hasSail, hasSmoke, lanterns: lanternCount }
    };
}

// ==========================================
// RENDER ENGINE: PROFILE VIEW
// ==========================================
function renderProfile(traits, rng) {
    const { boatType, p, hasSail, sailPattern, hasSmoke, engineType, decorStyle, paintStyle, lanternCount, bowSize, profLen } = traits;
    const canvas = document.createElement('canvas');
    canvas.width = PROF_W * DISPLAY_SCALE; canvas.height = PROF_H * DISPLAY_SCALE;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const grid = Array(PROF_H).fill(null).map(() => Array(PROF_W).fill(null));
    
    function setPixel(x, y, c) { x = Math.round(x); y = Math.round(y); if (x >= 0 && x < PROF_W && y >= 0 && y < PROF_H) grid[y][x] = c; }
    function overPixel(x, y, c) { x = Math.round(x); y = Math.round(y); if (x >= 0 && x < PROF_W && y >= 0 && y < PROF_H && !grid[y][x]) grid[y][x] = c; }

    const hullY = PROF_H - 12; 
    let deckY = hullY - 8;
    if (boatType === 'dreadnought' || boatType === 'trawler') deckY = hullY - 12;
    if (boatType === 'runner' || boatType === 'barge') deckY = hullY - 6;

    const startX = Math.floor((PROF_W - profLen - bowSize) / 2);

    // --- 1. THE HULL ---
    for (let x = startX; x <= startX + profLen; x++) {
        const progress = (x - startX) / profLen;
        let curve = Math.min(1, progress * (1 - progress) * 6 + 0.2);
        
        if (boatType === 'runner' || boatType === 'corvette') curve = Math.min(1, progress * (1 - progress) * 4 + 0.1); 
        else if (boatType === 'barge') curve = 0.8; 
        else if (boatType === 'dreadnought') curve = Math.min(1, progress * (1 - progress) * 3 + 0.5); 

        const yBottom = hullY + Math.floor(curve * 12);
        
        for (let y = deckY; y <= yBottom; y++) {
            let c = p.hull;
            
            // Dynamic Paint Jobs
            if (paintStyle === 'striped' && (y % 4 === 0)) c = p.hullShadow;
            if (paintStyle === 'two_tone' && y > hullY - 3) c = p.hullShadow;
            if (paintStyle === 'rimmed' && (y === deckY || y === deckY + 1)) c = p.trim;

            if (y === yBottom) c = p.hullShadow;
            if (y === deckY && paintStyle !== 'rimmed') c = p.hullHigh;
            
            // Subtle Planking Texture
            if (boatType === 'skiff' && (x + y) % 6 === 0) c = p.hullShadow;
            if (boatType === 'dreadnought' && (x + y) % 5 === 0) c = p.hullShadow; 
            
            setPixel(x, y, c);
        }
    }

    // --- 2. BOW & STERN ---
    const bowRise = boatType === 'corvette' || boatType === 'runner' ? 0.3 : 0.8;
    for (let i = 0; i < bowSize; i++) {
        const bx = startX + profLen + i;
        const by = hullY - Math.floor(i * bowRise);
        setPixel(bx, by, p.hullHigh);
        for(let drop = 1; drop < 5; drop++) setPixel(bx, by + drop, p.hull);
        setPixel(bx, by + 5, p.hullShadow);
        
        if (decorStyle === 'spiked' && i % 3 === 0) {
            setPixel(bx, by - 1, p.trim); setPixel(bx + 1, by - 2, '#F8FAFC'); 
        }
    }

    const sternSize = boatType === 'barge' ? 2 : 5;
    for (let i = 0; i < sternSize; i++) {
        const sx = startX - i;
        const sy = deckY - Math.floor(i * 0.5);
        setPixel(sx, sy, p.hullHigh);
        for(let drop = 1; drop < 6; drop++) setPixel(sx, sy + drop, p.hull);
    }

    // --- 3. ENGINES (Profile) ---
    if (engineType === 'paddlewheel') {
        const px = startX + 5;
        for (let dy = -5; dy <= 5; dy++) {
            for (let dx = -5; dx <= 5; dx++) {
                if (Math.hypot(dx, dy) <= 5) setPixel(px + dx, hullY + dy, (dx===0 || dy===0 || Math.abs(dx)===Math.abs(dy)) ? p.trim : p.hullShadow);
            }
        }
    } else if (engineType === 'arcane_thruster') {
        setPixel(startX - 2, hullY + 2, p.accent);
        setPixel(startX - 3, hullY + 2, '#FFFFFF'); 
        setPixel(startX - 4, hullY + 1, p.accent); setPixel(startX - 4, hullY + 3, p.accent); 
    } else if (engineType === 'twin_prop' || engineType === 'propeller') {
        setPixel(startX - 1, hullY + 4, '#94A3B8');
        setPixel(startX - 2, hullY + 3, '#E2E8F0'); setPixel(startX - 2, hullY + 5, '#E2E8F0');
    }

    // --- 4. CABIN ARCHITECTURE ---
    let cabinW, cabinH, cabinStart;
    if (boatType === 'dreadnought') { cabinW = rng.int(25, 35); cabinH = rng.int(16, 22); cabinStart = startX + 10; } 
    else if (boatType === 'trawler') { cabinW = rng.int(15, 20); cabinH = rng.int(18, 24); cabinStart = startX + 6; } 
    else if (boatType === 'barge') { cabinW = rng.int(12, 18); cabinH = rng.int(8, 12); cabinStart = startX + 2; } 
    else if (boatType === 'corvette') { cabinW = rng.int(20, 28); cabinH = rng.int(10, 14); cabinStart = startX + profLen - cabinW - 12; } 
    else if (boatType === 'runner') { cabinW = rng.int(14, 20); cabinH = rng.int(8, 12); cabinStart = startX + 8; } 
    else { cabinW = rng.int(10, 14); cabinH = rng.int(8, 10); cabinStart = startX + Math.floor(profLen/2) - Math.floor(cabinW/2); }

    const cabinTopY = deckY - cabinH;

    for (let y = cabinTopY; y < deckY; y++) {
        for (let x = cabinStart; x < cabinStart + cabinW; x++) {
            let c = p.hullShadow;
            
            if ((boatType === 'corvette' || boatType === 'runner') && x > cabinStart + cabinW - (y - cabinTopY)) continue;

            if (y === cabinTopY) c = p.trim; 
            else if (x === cabinStart || x === cabinStart + cabinW - 1) c = p.hullShadow; 
            else if ((x + y) % 3 === 0) c = p.hull; 
            
            if (boatType === 'dreadnought' && y < cabinTopY + 8 && (x < cabinStart + 4 || x > cabinStart + cabinW - 4)) continue;

            setPixel(x, y, c);
        }
    }

    // Windows
    const numWindows = Math.max(1, Math.floor(cabinW / 6));
    for (let i = 0; i < numWindows; i++) {
        const wx = cabinStart + 3 + i * 6;
        const wy = cabinTopY + 3;
        if (boatType === 'runner' || boatType === 'corvette') {
            for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 5 - dy; dx++) setPixel(wx + dx, wy + dy, p.window);
        } else {
            for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) setPixel(wx + dx, wy + dy, p.window);
        }
    }

    // --- 5. CLEAN DECK DECORS ---
    if (decorStyle === 'shielded') {
        for (let x = startX + 8; x < startX + profLen - 8; x += 10) {
            for (let dy = -2; dy <= 2; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    setPixel(x + dx, deckY + dy, dx === 0 && dy === 0 ? p.trim : p.hullShadow);
                }
            }
        }
    }

    // Sail
    if (hasSail) {
        const mastX = boatType === 'corvette' ? cabinStart - 4 : cabinStart + Math.floor(cabinW / 2);
        const mastHeight = rng.int(20, 35);
        for (let y = deckY - mastHeight; y < deckY; y++) setPixel(mastX, y, p.hullShadow);
        
        for (let y = deckY - mastHeight + 2; y < deckY - 2; y++) {
            const spread = Math.floor((y - (deckY - mastHeight + 2)) / (boatType === 'runner' ? 1.0 : 1.5));
            for (let x = 1; x <= spread; x++) {
                let c = p.sail;
                // Sail Patterns
                if (sailPattern === 'striped' && Math.floor(y / 4) % 2 === 0) c = p.trim;
                if (sailPattern === 'emblem' && Math.abs(y - (deckY - Math.floor(mastHeight/2))) < 3 && x > spread/2 - 2 && x < spread/2 + 2) c = p.accent;
                
                if (x === spread) c = p.hullShadow; 
                setPixel(mastX + (boatType === 'runner' ? -x : x), y, c);
            }
        }
    }

    // Smoke Stack
    if (hasSmoke) {
        const stackX = cabinStart + cabinW - 6;
        const stackHeight = rng.int(8, 16);
        for (let y = cabinTopY - stackHeight; y < cabinTopY; y++) {
            setPixel(stackX, y, p.trim); setPixel(stackX + 1, y, p.hullShadow); setPixel(stackX + 2, y, p.trim);
        }
        for (let s = 0; s < 15; s++) {
            const smX = stackX + rng.int(-5, 5) - Math.floor(s * 0.8); 
            const smY = cabinTopY - stackHeight - rng.int(2, 8) - Math.floor(s * 1.5); 
            if (smY > 0) {
                const smokeColor = rng.pick(['#475569', '#334155', '#1E293B']);
                setPixel(smX, smY, smokeColor); setPixel(smX + 1, smY, smokeColor); setPixel(smX, smY + 1, smokeColor);
            }
        }
    }

    // Lanterns
    for (let i = 0; i < lanternCount; i++) {
        let lx, ly;
        if (i === 0) { lx = startX + profLen + Math.floor(bowSize / 2); ly = hullY - 6; } 
        else if (i === 1) { lx = cabinStart - 2; ly = cabinTopY + 2; }
        else { lx = cabinStart + rng.int(0, cabinW); ly = cabinTopY - rng.int(2, 6); }
        
        setPixel(lx, ly, p.accent); setPixel(lx + 1, ly, '#FFFFFF'); 
        setPixel(lx, ly - 1, p.trim); setPixel(lx + 1, ly - 1, p.trim);
        setPixel(lx, ly + 1, p.trim); setPixel(lx + 1, ly + 1, p.trim);
        for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (Math.abs(dx) + Math.abs(dy) < 5) overPixel(lx + dx, ly + dy, p.accent);
    }

    // --- 6. OUTLINE ---
    const outlineGrid = Array(PROF_H).fill(null).map(() => Array(PROF_W).fill(null));
    for (let y = 0; y < PROF_H; y++) for (let x = 0; x < PROF_W; x++) {
        if (grid[y][x] === null) {
            if ((y > 0 && grid[y - 1][x] !== null && grid[y - 1][x] !== p.accent) || 
                (y < PROF_H - 1 && grid[y + 1][x] !== null && grid[y + 1][x] !== p.accent) || 
                (x > 0 && grid[y][x - 1] !== null && grid[y][x - 1] !== p.accent) || 
                (x < PROF_W - 1 && grid[y][x + 1] !== null && grid[y][x + 1] !== p.accent)) {
                outlineGrid[y][x] = '#020617'; 
            }
        }
    }

    for (let y = 0; y < PROF_H; y++) for (let x = 0; x < PROF_W; x++) {
        let colorCode = outlineGrid[y][x] || grid[y][x];
        if (grid[y][x] === p.accent && !outlineGrid[y][x]) colorCode = grid[y][x]; 
        if (colorCode) drawScaledRect(ctx, x, y, 1, 1, colorCode, DISPLAY_SCALE);
    }

    return canvas;
}

// ==========================================
// RENDER ENGINE: TOP-DOWN VIEW (IN-GAME)
// ==========================================
function renderTopDown(traits, rng) {
    const { boatType, p, hasSail, sailPattern, engineType, decorStyle, lanternCount, topLen, topWidth } = traits;
    const canvas = document.createElement('canvas');
    canvas.width = TOP_W * DISPLAY_SCALE; canvas.height = TOP_H * DISPLAY_SCALE;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const grid = Array(TOP_H).fill(null).map(() => Array(TOP_W).fill(null));
    function setPixel(x, y, c) { x = Math.round(x); y = Math.round(y); if (x >= 0 && x < TOP_W && y >= 0 && y < TOP_H) grid[y][x] = c; }
    function overPixel(x, y, c) { x = Math.round(x); y = Math.round(y); if (x >= 0 && x < TOP_W && y >= 0 && y < TOP_H && !grid[y][x]) grid[y][x] = c; }

    const cx = 24, cy = 24; 
    const bowY = cy - Math.floor(topLen / 2);
    const sternY = cy + Math.floor(topLen / 2);

    // --- 1. BASE HULL ---
    for (let y = bowY; y <= sternY; y++) {
        let hw = topWidth / 2;
        
        if (boatType === 'runner' || boatType === 'corvette') {
            hw = (topWidth / 2) * Math.sin(Math.pow((y - bowY) / (sternY - bowY), 0.7) * Math.PI);
        } else if (boatType === 'barge') {
            hw = (topWidth / 2) * 0.95; 
        } else if (boatType === 'trawler' || boatType === 'dreadnought') {
            const progress = (y - bowY) / (sternY - bowY);
            if (progress < 0.2) hw = (topWidth / 2) * (progress / 0.2); 
            else if (progress > 0.9) hw = (topWidth / 2) * 0.8; 
        } else {
            hw = (topWidth / 2) * Math.sin(((y - bowY) / (sternY - bowY)) * Math.PI);
        }

        hw = Math.max(1, Math.floor(hw));

        for (let x = cx - hw; x <= cx + hw; x++) {
            let c = p.hull;
            if (Math.abs(x - cx) >= hw - 1 || y === bowY || y === sternY) c = p.hullHigh;
            if (c === p.hull && (y) % 4 === 0) c = p.hullShadow;
            setPixel(x, y, c);
        }
    }

    // --- 2. CABIN ---
    const cabinLen = boatType === 'dreadnought' || boatType === 'corvette' ? Math.floor(topLen * 0.5) : Math.floor(topLen * 0.3);
    const cabinY = boatType === 'corvette' ? cy - Math.floor(cabinLen/2) : sternY - cabinLen - 2;
    const cabinHw = Math.floor((topWidth / 2) * 0.7);

    for (let y = cabinY; y <= cabinY + cabinLen; y++) {
        for (let x = cx - cabinHw; x <= cx + cabinHw; x++) {
            let c = p.trim; 
            if ((boatType === 'runner' || boatType === 'corvette') && y < cabinY + 3) {
                if (Math.abs(x - cx) > cabinHw - (cabinY + 3 - y)) continue;
                c = p.window;
            }
            if (x === cx - cabinHw || x === cx + cabinHw || y === cabinY || y === cabinY + cabinLen) c = p.hullShadow; 
            setPixel(x, y, c);
        }
    }

    // --- 3. DECK DETAILS (Shields/Spikes) ---
    if (decorStyle === 'spiked') {
        setPixel(cx, bowY - 1, p.trim); setPixel(cx, bowY - 2, '#F8FAFC');
        setPixel(cx - 3, bowY + 2, p.trim); setPixel(cx - 3, bowY + 1, '#F8FAFC');
        setPixel(cx + 3, bowY + 2, p.trim); setPixel(cx + 3, bowY + 1, '#F8FAFC');
    } else if (decorStyle === 'shielded') {
        for (let y = bowY + 6; y < sternY - 6; y += 8) {
            const hx = Math.floor(topWidth/2);
            setPixel(cx - hx, y, p.trim); setPixel(cx - hx, y+1, p.trim);
            setPixel(cx + hx, y, p.trim); setPixel(cx + hx, y+1, p.trim);
        }
    }

    // --- 4. ENGINES (Top Down) ---
    if (engineType === 'paddlewheel') {
        // Large box at the stern
        const pw = Math.floor(topWidth/2) - 1;
        for (let y = sternY; y <= sternY + 4; y++) {
            for (let x = cx - pw; x <= cx + pw; x++) {
                setPixel(x, y, (x % 3 === 0 || y === sternY + 4) ? p.trim : p.hullShadow);
            }
        }
    } else if (engineType === 'twin_prop') {
        setPixel(cx - 3, sternY + 1, '#94A3B8'); setPixel(cx - 3, sternY + 2, '#E2E8F0');
        setPixel(cx + 3, sternY + 1, '#94A3B8'); setPixel(cx + 3, sternY + 2, '#E2E8F0');
    } else if (engineType === 'propeller') {
        setPixel(cx, sternY + 1, '#94A3B8'); setPixel(cx, sternY + 2, '#E2E8F0');
    } else if (engineType === 'arcane_thruster') {
        setPixel(cx, sternY + 1, p.accent); setPixel(cx, sternY + 2, '#FFFFFF');
        setPixel(cx - 1, sternY + 1, p.accent); setPixel(cx + 1, sternY + 1, p.accent);
    }

    // --- 5. SAIL ---
    if (hasSail) {
        const mastY = cy - 2;
        setPixel(cx, mastY, p.hullShadow);
        
        const sailW = topWidth + 3; 
        for (let x = cx - sailW; x <= cx + sailW; x++) {
            const sy = mastY - 2 + Math.floor(Math.abs(x - cx) * 0.4);
            let c = p.sail;
            
            if (sailPattern === 'striped' && Math.abs(x - cx) % 4 >= 2) c = p.trim;
            if (sailPattern === 'emblem' && Math.abs(x - cx) < 3) c = p.accent;
            if (Math.abs(x - cx) >= sailW - 1) c = p.hullShadow; 
            
            setPixel(x, sy, c);
            setPixel(x, sy + 1, c); 
        }
    }

    // --- 6. LANTERNS ---
    for (let i = 0; i < lanternCount; i++) {
        let lx = cx, ly = cy;
        if (i === 0) { lx = cx; ly = bowY + 2; }
        else if (i === 1) { lx = cx - cabinHw - 1; ly = cabinY + 2; }
        else if (i === 2) { lx = cx + cabinHw + 1; ly = cabinY + 2; }
        else if (i === 3) { lx = cx; ly = sternY - 2; }
        
        setPixel(lx, ly, '#FFFFFF'); 
        setPixel(lx, ly + 1, p.accent);
        
        for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
                if (Math.abs(dx) + Math.abs(dy) <= 3) overPixel(lx + dx, ly + dy, p.accent);
            }
        }
    }

    // --- OUTLINE PASS ---
    const outlineGrid = Array(TOP_H).fill(null).map(() => Array(TOP_W).fill(null));
    for (let y = 0; y < TOP_H; y++) for (let x = 0; x < TOP_W; x++) {
        if (grid[y][x] === null) {
            if ((y > 0 && grid[y - 1][x] !== null && grid[y - 1][x] !== p.accent && grid[y - 1][x] !== '#FFFFFF') || 
                (y < TOP_H - 1 && grid[y + 1][x] !== null && grid[y + 1][x] !== p.accent && grid[y + 1][x] !== '#FFFFFF') || 
                (x > 0 && grid[y][x - 1] !== null && grid[y][x - 1] !== p.accent && grid[y][x - 1] !== '#FFFFFF') || 
                (x < TOP_W - 1 && grid[y][x + 1] !== null && grid[y][x + 1] !== p.accent && grid[y][x + 1] !== '#FFFFFF')) {
                outlineGrid[y][x] = '#020617'; 
            }
        }
    }

    // RENDER
    for (let y = 0; y < TOP_H; y++) for (let x = 0; x < TOP_W; x++) {
        let colorCode = outlineGrid[y][x] || grid[y][x];
        if ((grid[y][x] === p.accent || grid[y][x] === '#FFFFFF') && !outlineGrid[y][x]) colorCode = grid[y][x]; 
        if (colorCode) drawScaledRect(ctx, x, y, 1, 1, colorCode, DISPLAY_SCALE);
    }

    return canvas;
}