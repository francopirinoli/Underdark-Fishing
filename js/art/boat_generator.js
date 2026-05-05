/**
 * js/art/boat_generator.js
 * Procedural Boat Generator.
 * Simultaneously generates a Cinematic Profile View and a clean In-Game Top-Down View.
 * V4 - Removed top-down cargo clutter, perfectly centered top-down lanterns for lighting alignment.
 */

import { drawScaledRect } from '../util/utils.js';
import { BOAT_PALETTES } from './equipment_palettes.js';

const DISPLAY_SCALE = 4; 

// Grid sizes
const PROF_W = 96, PROF_H = 64;
const TOP_W = 48,  TOP_H = 48; // Square grid for perfect in-game rotation

export function generateBoat(options = {}) {
    const rng = options.rng || { 
        int: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min, 
        chance: (p) => Math.random() < p, pick: (arr) => arr[Math.floor(Math.random() * arr.length)] 
    };
    
    // --- 1. ROLL UNIFIED TRAITS ---
    const boatType = options.boatType || rng.pick(['skiff', 'trawler', 'runner', 'dreadnought']);
    
    let paletteKey = 'SKIFF';
    if (boatType === 'trawler') paletteKey = 'TRAWLER';
    if (boatType === 'runner') paletteKey = 'RUNNER';
    if (boatType === 'dreadnought') paletteKey = 'DREAD';
    const p = BOAT_PALETTES[paletteKey];

    const hasSail = (boatType === 'skiff' || boatType === 'runner') && rng.chance(0.85);
    const hasSmoke = (boatType === 'trawler' || boatType === 'dreadnought');
    const hasSpikes = boatType === 'dreadnought' || rng.chance(0.2);
    const lanternCount = boatType === 'dreadnought' ? rng.int(2, 4) : rng.int(1, 2);

    // Profile-specific dimensions
    const bowSize = boatType === 'runner' ? rng.int(10, 16) : rng.int(6, 10);
    let profLen = PROF_W - 20;
    if (boatType === 'skiff') profLen = 35;
    if (boatType === 'runner') profLen = 50;

    // Top-down specific dimensions
    let topLen = rng.int(24, 30);
    let topWidth = rng.int(10, 14);
    if (boatType === 'runner') { topLen = rng.int(30, 36); topWidth = rng.int(6, 8); }
    if (boatType === 'dreadnought') { topLen = rng.int(34, 40); topWidth = rng.int(14, 18); }

    const traits = { boatType, p, hasSail, hasSmoke, hasSpikes, lanternCount, bowSize, profLen, topLen, topWidth };

    // --- 2. RENDER THE CANVASES ---
    const profileCanvas = renderProfile(traits, rng);
    const topDownCanvas = renderTopDown(traits, rng);

    const adjectives =['Silent', 'Iron', 'Rusty', 'Sunken', 'Vengeful', 'Stalwart', 'Abyssal', 'Swift'];
    const nouns =['Voyager', 'Wake', 'Tide', 'Seeker', 'Galleon', 'Drifter', 'Wraith'];
    let finalName = p.name;
    if (rng.chance(0.6)) finalName = `${rng.pick(adjectives)} ${rng.pick(nouns)}`;

    return {
        name: finalName,
        imageDataUrl: profileCanvas.toDataURL(),     
        topDownDataUrl: topDownCanvas.toDataURL(),   
        data: { boatType, palette: paletteKey, hasSail, hasSmoke, hasSpikes, lanterns: lanternCount }
    };
}

// ==========================================
// RENDER ENGINE: PROFILE VIEW
// ==========================================
function renderProfile(traits, rng) {
    const { boatType, p, hasSail, hasSmoke, hasSpikes, lanternCount, bowSize, profLen } = traits;
    const canvas = document.createElement('canvas');
    canvas.width = PROF_W * DISPLAY_SCALE; canvas.height = PROF_H * DISPLAY_SCALE;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const grid = Array(PROF_H).fill(null).map(() => Array(PROF_W).fill(null));
    
    function setPixel(x, y, c) { 
        x = Math.round(x); y = Math.round(y); 
        if (x >= 0 && x < PROF_W && y >= 0 && y < PROF_H) grid[y][x] = c; 
    }
    function overPixel(x, y, c) { 
        x = Math.round(x); y = Math.round(y); 
        if (x >= 0 && x < PROF_W && y >= 0 && y < PROF_H && !grid[y][x]) grid[y][x] = c; 
    }

    const sternSize = 4;
    const hullY = PROF_H - 14; 
    const deckY = hullY - (boatType === 'dreadnought' ? rng.int(14, 18) : rng.int(8, 12));
    const startX = Math.floor((PROF_W - profLen - bowSize) / 2);

    // Hull Base
    for (let x = startX; x <= startX + profLen; x++) {
        const progress = (x - startX) / profLen;
        let curve = Math.min(1, progress * (1 - progress) * 6 + 0.2);
        
        if (boatType === 'runner') curve = Math.min(1, progress * (1 - progress) * 4 + 0.1); 
        else if (boatType === 'dreadnought') curve = Math.min(1, progress * (1 - progress) * 3 + 0.6); 

        const yBottom = hullY + Math.floor(curve * 12);
        
        for (let y = hullY; y <= yBottom; y++) {
            let c = p.hull;
            if (y === yBottom) c = p.hullShadow;
            if (y === hullY) c = p.hullHigh;
            
            if (boatType === 'skiff' && (x + y) % 6 === 0) c = p.hullShadow;
            if (boatType === 'trawler' && x % 8 === 0) c = p.trim; 
            if (boatType === 'dreadnought' && (x + y) % 5 === 0) c = p.hullShadow; 
            
            setPixel(x, y, c);
        }
    }

    // Bow (Front) & Spikes
    for (let i = 0; i < bowSize; i++) {
        const bx = startX + profLen + i;
        const by = hullY - Math.floor(i * (boatType === 'runner' ? 0.3 : 0.8));
        setPixel(bx, by, p.hullHigh);
        for(let drop = 1; drop < 5; drop++) setPixel(bx, by + drop, p.hull);
        setPixel(bx, by + 5, p.hullShadow);
        
        if (hasSpikes && i === bowSize - 1) {
            setPixel(bx + 1, by, p.trim); setPixel(bx + 2, by, p.trim);
            setPixel(bx + 3, by, '#F8FAFC'); 
        }
    }

    // Stern (Back)
    for (let i = 0; i < sternSize; i++) {
        setPixel(startX - i, hullY - Math.floor(i * 0.5), p.hullHigh);
        setPixel(startX - i, hullY - Math.floor(i * 0.5) + 1, p.hullShadow);
    }

    // Deck
    for (let x = startX + 2; x < startX + profLen - 2; x++) setPixel(x, hullY - 1, p.hullHigh);

    // Cabin
    const cabinW = boatType === 'dreadnought' ? rng.int(25, 40) : (boatType === 'trawler' ? rng.int(18, 25) : rng.int(10, 16));
    const cabinStart = startX + rng.int(4, profLen - cabinW - 6);

    for (let y = deckY; y < hullY - 1; y++) {
        for (let x = cabinStart; x < cabinStart + cabinW; x++) {
            let c = p.hullShadow;
            if (y === deckY) c = p.trim; 
            if (x === cabinStart || x === cabinStart + cabinW - 1) c = p.hullShadow; 
            if ((x + y) % 2 === 0 && y > deckY + 1 && y < hullY - 2) c = p.hull; 
            setPixel(x, y, c);
        }
    }

    // Windows
    const numWindows = boatType === 'dreadnought' ? rng.int(3, 5) : rng.int(1, 3);
    for (let i = 0; i < numWindows; i++) {
        const wx = cabinStart + 4 + i * Math.floor((cabinW - 6) / numWindows);
        for (let dy = 0; dy < 3; dy++) for (let dx = 0; dx < 3; dx++) setPixel(wx + dx, deckY + 3 + dy, p.window);
    }

    // Sail
    if (hasSail) {
        const mastX = cabinStart + Math.floor(cabinW / 2);
        const mastHeight = rng.int(20, 30);
        for (let y = deckY - mastHeight; y < deckY; y++) setPixel(mastX, y, p.hullShadow);
        for (let y = deckY - mastHeight + 2; y < deckY - 2; y++) {
            const spread = Math.floor((y - (deckY - mastHeight + 2)) / (boatType === 'runner' ? 1.0 : 1.5));
            for (let x = 1; x <= spread; x++) {
                let c = p.sail;
                if (x === spread) c = p.hullShadow; 
                if (rng.chance(0.05)) c = p.hullShadow; 
                setPixel(mastX + (boatType === 'runner' ? -x : x), y, c);
            }
        }
    }

    // Smoke
    if (hasSmoke) {
        const stackX = cabinStart + cabinW - rng.int(4, 8);
        const stackHeight = rng.int(6, 12);
        for (let y = deckY - stackHeight; y < deckY; y++) {
            setPixel(stackX, y, p.trim); setPixel(stackX + 1, y, p.hullShadow); setPixel(stackX + 2, y, p.trim);
        }
        for (let s = 0; s < 15; s++) {
            const smX = stackX + rng.int(-5, 5) - Math.floor(s * 0.5); 
            const smY = deckY - stackHeight - rng.int(2, 8) - Math.floor(s * 1.5); 
            if (smY > 0) {
                const smokeColor = rng.pick(['#475569', '#334155', '#1E293B']);
                setPixel(smX, smY, smokeColor); setPixel(smX + 1, smY, smokeColor); setPixel(smX, smY + 1, smokeColor);
            }
        }
    }

    // Lanterns
    for (let i = 0; i < lanternCount; i++) {
        let lx, ly;
        if (i === 0) { lx = startX + profLen + Math.floor(bowSize / 2); ly = hullY - 4; } 
        else { lx = cabinStart + rng.int(0, cabinW); ly = deckY - rng.int(2, 6); }
        setPixel(lx, ly, p.accent); setPixel(lx + 1, ly, '#FFFFFF'); 
        setPixel(lx, ly - 1, p.trim); setPixel(lx + 1, ly - 1, p.trim);
        setPixel(lx, ly + 1, p.trim); setPixel(lx + 1, ly + 1, p.trim);
        for (let dy = -3; dy <= 3; dy++) for (let dx = -3; dx <= 3; dx++) if (Math.abs(dx) + Math.abs(dy) < 5) overPixel(lx + dx, ly + dy, p.accent);
    }

    // Outline
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
    const { boatType, p, hasSail, hasSpikes, lanternCount, topLen, topWidth } = traits;
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
    const bowEnd = bowY + Math.floor(topLen * 0.35); 

    // 1. Base Hull
    for (let y = bowY; y <= sternY; y++) {
        let hw = topWidth / 2;
        
        if (boatType === 'runner') {
            hw = (topWidth / 2) * Math.sin(Math.pow((y - bowY) / (sternY - bowY), 0.7) * Math.PI);
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
            if (c === p.hull && (x+y) % 4 === 0) c = p.hullShadow;
            setPixel(x, y, c);
        }
    }

    // 2. Cabin / Deck Structures
    const cabinLen = boatType === 'dreadnought' ? Math.floor(topLen * 0.5) : Math.floor(topLen * 0.3);
    const cabinY = sternY - cabinLen;
    const cabinHw = Math.floor((topWidth / 2) * 0.8);

    for (let y = cabinY; y <= sternY - 1; y++) {
        for (let x = cx - cabinHw; x <= cx + cabinHw; x++) {
            let c = p.trim; 
            if (x === cx - cabinHw || x === cx + cabinHw || y === cabinY) c = p.hullShadow; 
            setPixel(x, y, c);
        }
    }

    // 3. Spikes 
    if (hasSpikes) {
        setPixel(cx, bowY - 1, p.trim); setPixel(cx, bowY - 2, '#F8FAFC');
        setPixel(cx - 2, bowY, p.trim); setPixel(cx - 2, bowY - 1, '#F8FAFC');
        setPixel(cx + 2, bowY, p.trim); setPixel(cx + 2, bowY - 1, '#F8FAFC');
    }

    // 4. Sail (Curved across the boat, billowing FORWARD)
    if (hasSail) {
        const mastY = bowEnd + 2;
        setPixel(cx, mastY, p.hullShadow);
        
        const sailW = topWidth + 2; 
        for (let x = cx - sailW; x <= cx + sailW; x++) {
            // MATH FIX: Billows forward (lower Y) in the middle, and trails back (higher Y) at the edges
            const sy = mastY - 2 + Math.floor(Math.abs(x - cx) * 0.5);
            let c = p.sail;
            if (Math.abs(x - cx) === sailW) c = p.hullShadow; 
            setPixel(x, sy, c);
            setPixel(x, sy + 1, c); 
        }
    }

    // 5. Lanterns (Perfectly centered longitudinally for lighting alignment)
    for (let i = 0; i < lanternCount; i++) {
        let lx = cx;
        let ly = cy;
        
        // Spread additional lanterns vertically along the center axis
        if (i === 1) ly = cy - 4;
        else if (i === 2) ly = cy + 4;
        else if (i === 3) ly = cy - 8;
        
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
            if ((y > 0 && grid[y - 1][x] !== null && grid[y - 1][x] !== p.accent && grid[y - 1][x] !== '#0369A1') || 
                (y < TOP_H - 1 && grid[y + 1][x] !== null && grid[y + 1][x] !== p.accent && grid[y + 1][x] !== '#0369A1') || 
                (x > 0 && grid[y][x - 1] !== null && grid[y][x - 1] !== p.accent && grid[y][x - 1] !== '#0369A1') || 
                (x < TOP_W - 1 && grid[y][x + 1] !== null && grid[y][x + 1] !== p.accent && grid[y][x + 1] !== '#0369A1')) {
                outlineGrid[y][x] = '#020617'; 
            }
        }
    }

    // RENDER
    for (let y = 0; y < TOP_H; y++) for (let x = 0; x < TOP_W; x++) {
        let colorCode = outlineGrid[y][x] || grid[y][x];
        if ((grid[y][x] === p.accent || grid[y][x] === '#0369A1') && !outlineGrid[y][x]) colorCode = grid[y][x]; 
        if (colorCode) drawScaledRect(ctx, x, y, 1, 1, colorCode, DISPLAY_SCALE);
    }

    return canvas;
}