/**
 * js/art/lure_generator.js
 * Procedural Lure Generator.
 * Physically stacks crafting components along a hook shank to visualize the exact custom lure built by the player.
 */

import { drawScaledRect } from '../util/utils.js';
import { MATERIALS } from './equipment_palettes.js';

const GRID_SIZE = 64;
const DISPLAY_SCALE = 4;
const CANVAS_SIZE = GRID_SIZE * DISPLAY_SCALE;

export function generateLure(options = {}) {
    const rng = options.rng || { 
        next: Math.random, int: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min, 
        chance: (p) => Math.random() < p, pick: (arr) => arr[Math.floor(Math.random() * arr.length)] 
    };

    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = CANVAS_SIZE;
    offscreenCanvas.height = CANVAS_SIZE;
    const ctx = offscreenCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));

    function setPixel(x, y, hexColor) {
        x = Math.round(x); y = Math.round(y);
        if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE && !grid[y][x]) grid[y][x] = hexColor;
    }

    function overPixel(x, y, hexColor) {
        x = Math.round(x); y = Math.round(y);
        if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) grid[y][x] = hexColor;
    }

    // List of all possible crafting components
    const ALL_COMPONENTS =[
        'phosphor_cap', 'bone_dust', 'iron_sinker', 'lead_sinker', 
        'glow_bulb', 'rattler_bells', 'wraith_silk', 'chilifish_oil', 
        'spinner', 'cave_crawler_leg', 'mushroom_stalk', 'myconid_spore', 
        'jelly_bell', 'rat_tail', 'fish_gut'
    ];

    // Pick 2 to 4 random components if none are provided
    const numComps = rng.int(2, 4);
    const components = options.components || Array.from({length: numComps}, () => rng.pick(ALL_COMPONENTS));

    const cx = 32;
    let currentY = 16; // Start stacking below the eyelet

    const hookMat = MATERIALS[rng.pick(['IRON', 'STEEL', 'RUST', 'BONE'])];

    // --- 1. DRAW THE HOOK BASE ---
    // Eyelet
    overPixel(cx, 8, hookMat.base); overPixel(cx, 12, hookMat.base);
    overPixel(cx - 1, 9, hookMat.base); overPixel(cx - 2, 10, hookMat.base); overPixel(cx - 1, 11, hookMat.base);
    overPixel(cx + 1, 9, hookMat.base); overPixel(cx + 2, 10, hookMat.base); overPixel(cx + 1, 11, hookMat.base);
    
    // Shank
    const shankEnd = 45;
    for (let y = 13; y <= shankEnd; y++) {
        overPixel(cx, y, hookMat.base);
        if (y % 3 === 0) overPixel(cx - 1, y, hookMat.highlight); // Glint
    }

    // Bend and Barb (Treble or Single)
    const isTreble = rng.chance(0.4);
    if (isTreble) {
        for (let side of [-1, 1]) {
            overPixel(cx + side * 1, shankEnd + 1, hookMat.base);
            overPixel(cx + side * 2, shankEnd + 2, hookMat.base);
            overPixel(cx + side * 3, shankEnd + 2, hookMat.base);
            overPixel(cx + side * 4, shankEnd + 1, hookMat.base);
            overPixel(cx + side * 4, shankEnd, hookMat.highlight); // Point
            overPixel(cx + side * 3, shankEnd + 1, hookMat.shadow); // Barb
        }
        overPixel(cx, shankEnd + 1, hookMat.base); overPixel(cx, shankEnd + 2, hookMat.base); overPixel(cx, shankEnd + 3, hookMat.highlight); // Center point
    } else {
        // Single hook curving left
        overPixel(cx - 1, shankEnd + 1, hookMat.base); overPixel(cx - 2, shankEnd + 2, hookMat.base);
        overPixel(cx - 3, shankEnd + 3, hookMat.base); overPixel(cx - 4, shankEnd + 3, hookMat.base);
        overPixel(cx - 5, shankEnd + 2, hookMat.base); overPixel(cx - 6, shankEnd + 1, hookMat.base);
        overPixel(cx - 6, shankEnd, hookMat.highlight); // Point
        overPixel(cx - 5, shankEnd + 1, hookMat.shadow); // Barb
    }

    // --- 2. DRAW COMPONENTS ---
    // Rendering sub-routines for each specific component shape
    for (const comp of components) {
        let compH = 0; // Height this component consumes on the shank
        
        switch (comp) {
            case 'phosphor_cap':
                // Glowing green mushroom dome
                compH = 6;
                for (let y = 0; y < compH; y++) {
                    const w = y < 2 ? 2 + y : 5 - Math.floor((y-2)*1.5);
                    for(let x = -w; x <= w; x++) {
                        let c = '#65A30D'; // Base green
                        if (x > w - 1 || y === compH - 1) c = '#365314';
                        if (x < -w + 1) c = '#A3E635';
                        if ((x+y)%3 === 0) c = '#FEF08A'; // Glowing spots
                        overPixel(cx + x, currentY + y, c);
                    }
                }
                break;

            case 'iron_sinker':
            case 'lead_sinker':
                // Heavy metal cylinder
                compH = 7;
                const isIron = comp === 'iron_sinker';
                const mat = isIron ? MATERIALS.IRON : MATERIALS.STEEL;
                const w = isIron ? 3 : 4; // Iron is denser/thinner
                for (let y = 0; y < compH; y++) {
                    for(let x = -w; x <= w; x++) {
                        let c = mat.base;
                        if (x > w - 1 || y === 0 || y === compH - 1) c = mat.shadow;
                        if (x === -w + 1) c = mat.highlight;
                        overPixel(cx + x, currentY + y, c);
                    }
                }
                break;

            case 'glow_bulb':
                // Cyan glass sphere
                compH = 8;
                for (let y = 0; y < compH; y++) {
                    const bw = Math.floor(4 * Math.sin((y / (compH-1)) * Math.PI));
                    for(let x = -bw; x <= bw; x++) {
                        let c = '#22D3EE';
                        if (x > bw - 1 || y > compH - 2) c = '#0369A1';
                        if (x === -1 && y === 2) c = '#FFFFFF'; // Bright glint
                        overPixel(cx + x, currentY + y, c);
                    }
                }
                break;

            case 'rattler_bells':
                // Twin golden bells
                compH = 5;
                for(let side of [-1, 1]) {
                    const bx = cx + (side * 3);
                    overPixel(bx, currentY, MATERIALS.GOLD.highlight);
                    overPixel(bx - 1, currentY + 1, MATERIALS.GOLD.base); overPixel(bx + 1, currentY + 1, MATERIALS.GOLD.base); overPixel(bx, currentY + 1, MATERIALS.GOLD.base);
                    overPixel(bx - 1, currentY + 2, MATERIALS.GOLD.base); overPixel(bx + 1, currentY + 2, MATERIALS.GOLD.base);
                    overPixel(bx, currentY + 2, '#000000'); // Bell slit
                    overPixel(bx - 1, currentY + 3, MATERIALS.GOLD.shadow); overPixel(bx + 1, currentY + 3, MATERIALS.GOLD.shadow); overPixel(bx, currentY + 3, MATERIALS.GOLD.shadow);
                }
                overPixel(cx, currentY, hookMat.base); // Keeps the shank visible
                break;

            case 'chilifish_oil':
                // Dripping red coating over the shank
                compH = 5;
                for (let y = 0; y < compH; y++) {
                    for(let x = -1; x <= 1; x++) overPixel(cx + x, currentY + y, '#DC2626');
                    if (rng.chance(0.5)) overPixel(cx + 2, currentY + y, '#991B1B'); // Drips
                }
                break;

            case 'spinner':
                // Silver rotating spoon attached to the side
                compH = 2; // Takes very little vertical space, sticks out
                const sx = cx + rng.pick([-4, 4]); // Left or right
                for (let y = 0; y < 7; y++) {
                    const spoonW = y < 2 || y > 5 ? 0 : 1;
                    for (let x = -spoonW; x <= spoonW; x++) {
                        let c = MATERIALS.SILVER.base;
                        if (x === spoonW) c = MATERIALS.SILVER.shadow;
                        if (x === -spoonW && y === 3) c = '#FFFFFF'; // Shiny glint
                        overPixel(sx + x, currentY + y, c);
                    }
                }
                // Wire connecting to shank
                overPixel(cx + (sx > cx ? 1 : -1), currentY, MATERIALS.STEEL.base);
                overPixel(cx + (sx > cx ? 2 : -2), currentY, MATERIALS.STEEL.base);
                overPixel(cx + (sx > cx ? 3 : -3), currentY, MATERIALS.STEEL.base);
                break;

            case 'cave_crawler_leg':
                // Jagged brown spikes
                compH = 4;
                for (let side of [-1, 1]) {
                    overPixel(cx + side * 1, currentY + 1, '#78350F');
                    overPixel(cx + side * 2, currentY + 2, '#78350F');
                    overPixel(cx + side * 3, currentY + 1, '#451A03'); // Joint
                    overPixel(cx + side * 4, currentY, '#FBBF24'); // Sharp tip
                }
                break;

            case 'mushroom_stalk':
            case 'bone_dust':
            case 'myconid_spore':
            case 'jelly_bell':
            case 'fish_gut':
                // Generic organic blob variations
                compH = 5;
                const pal = 
                    comp === 'mushroom_stalk' ? { b: '#C084FC', s: '#7E22CE', h: '#E9D5FF' } :
                    comp === 'bone_dust' ? { b: '#E7E5E4', s: '#A8A29E', h: '#FAFAF9' } :
                    comp === 'myconid_spore' ? { b: '#4ADE80', s: '#166534', h: '#A3E635' } :
                    comp === 'jelly_bell' ? { b: '#F472B6', s: '#BE185D', h: '#FBCFE8' } :
                    { b: '#E11D48', s: '#881337', h: '#FDA4AF' }; // fish gut
                    
                for (let y = 0; y < compH; y++) {
                    const blobW = rng.int(2, 4);
                    for(let x = -blobW; x <= blobW; x++) {
                        let c = pal.b;
                        if (x > blobW - 1 || y === compH - 1) c = pal.s;
                        if (x === -blobW + 1 && y === 1) c = pal.h;
                        // Spore/dust dots
                        if ((comp === 'bone_dust' || comp === 'myconid_spore') && rng.chance(0.3)) c = pal.s;
                        overPixel(cx + x, currentY + y, c);
                    }
                }
                break;
        }

        // Add trailing elements at the very bottom
        if (comp === 'wraith_silk' || comp === 'rat_tail') {
            const isSilk = comp === 'wraith_silk';
            const trailLen = isSilk ? 12 : 8;
            const trailCol = isSilk ? '#818CF8' : '#A1A1AA';
            const trailShad = isSilk ? '#3730A3' : '#3F3F46';
            
            let tx = cx;
            for(let y = 0; y < trailLen; y++) {
                tx += rng.pick([-1, 0, 1]);
                if (isSilk) {
                    overPixel(tx - 1, shankEnd + 2 + y, trailCol);
                    overPixel(tx, shankEnd + 2 + y, trailShad);
                    overPixel(tx + 1, shankEnd + 2 + y, trailCol);
                } else {
                    // Rat tail tapers
                    if (y < 4) overPixel(tx - 1, shankEnd + 2 + y, trailShad);
                    overPixel(tx, shankEnd + 2 + y, trailCol);
                }
            }
        }
        
        currentY += compH + 1; // Move down the shank for the next component
    }

    // --- 3. OUTLINE PASS ---
    const outlineGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            if (grid[y][x] === null) {
                if ((y > 0 && grid[y - 1][x] !== null && grid[y - 1][x] !== '#22D3EE') || // Exclude glowing parts from outlines
                    (y < GRID_SIZE - 1 && grid[y + 1][x] !== null && grid[y + 1][x] !== '#22D3EE') || 
                    (x > 0 && grid[y][x - 1] !== null && grid[y][x - 1] !== '#22D3EE') || 
                    (x < GRID_SIZE - 1 && grid[y][x + 1] !== null && grid[y][x + 1] !== '#22D3EE')) {
                    outlineGrid[y][x] = '#020617'; 
                }
            }
        }
    }

    // --- 4. RENDER ---
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            let colorCode = outlineGrid[y][x] || grid[y][x];
            // Ensure glow punches through outline
            if (grid[y][x] === '#22D3EE' || grid[y][x] === '#FEF08A') colorCode = grid[y][x]; 
            if (colorCode) drawScaledRect(ctx, x, y, 1, 1, colorCode, DISPLAY_SCALE);
        }
    }

    // --- 5. PROCEDURAL NAMING ---
    const nameMap = {
        'phosphor_cap': 'Glowing', 'iron_sinker': 'Heavy', 'lead_sinker': 'Dull',
        'glow_bulb': 'Luminescent', 'rattler_bells': 'Rattling', 'wraith_silk': 'Ghostly',
        'chilifish_oil': 'Spicy', 'spinner': 'Flashy', 'cave_crawler_leg': 'Spiked',
        'mushroom_stalk': 'Fungal', 'myconid_spore': 'Toxic', 'jelly_bell': 'Pulsing',
        'rat_tail': 'Scavenger', 'fish_gut': 'Bloody', 'bone_dust': 'Bone'
    };

    const nouns = ['Jig', 'Spoon', 'Plug', 'Fly', 'Bait', 'Hook', 'Spinner'];
    
    // Pick the adjective from the first component
    const adj = nameMap[components[0]] || 'Strange';
    // If a spinner is present, call it a Spinner. If treble, call it a Plug.
    let noun = rng.pick(nouns);
    if (components.includes('spinner')) noun = 'Spinner';
    else if (isTreble) noun = 'Plug';
    else if (components.includes('wraith_silk')) noun = 'Fly';

    return {
        name: `${adj} ${noun}`,
        imageDataUrl: offscreenCanvas.toDataURL(),
        data: { components: components }
    };
}