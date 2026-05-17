/**
 * js/art/bait_generator.js
 * Procedural Bait Generator.
 * Generates visual pixel art for Chum Buckets, Paste Jars, Sacks, and Skewers based on the primary ingredient.
 */

import { drawScaledRect } from '../util/utils.js';
import { MATERIALS } from './equipment_palettes.js';
import { createRng } from '../util/rng.js';

const GRID_SIZE = 64;
const DISPLAY_SCALE = 4;
const CANVAS_SIZE = GRID_SIZE * DISPLAY_SCALE;

export function generateBait(options = {}) {
    const seed = options.seed || Date.now();
    const rng = options.rng || createRng(seed);
    
    const components = options.components || ['fish_gut'];
    const primaryComp = components[0];

    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = CANVAS_SIZE;
    offscreenCanvas.height = CANVAS_SIZE;
    const ctx = offscreenCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));

    function overPixel(x, y, hexColor) {
        x = Math.round(x); y = Math.round(y);
        if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) grid[y][x] = hexColor;
    }

// --- 1. DETERMINE BAIT STYLE & PALETTES ---
    let baitType = 'chum_bucket';
    let baitName = 'Chum Bucket';
    let containerMat = MATERIALS.OAK;
    let fillMat = MATERIALS.FLESH;
    let targetFamily = 'Predators';
    let targetFamilyIds = ['shark', 'eel'];

    // Group 1: Sharks & Eels
    if (['fish_gut', 'rat_tail', 'chilifish_oil'].includes(primaryComp)) {
        baitType = rng.pick(['chum_bucket', 'meat_skewer']);
        containerMat = MATERIALS[rng.pick(['OAK', 'PINE'])];
        fillMat = MATERIALS.FLESH;
        baitName = baitType === 'chum_bucket' ? 'Chum Bucket' : 'Meat Skewer';
        targetFamily = 'Sharks & Eels';
        targetFamilyIds = ['shark', 'eel'];
    } 
    // Group 2: Deep Sea & Cephalopods
    else if (['glow_bulb', 'phosphor_cap', 'wraith_silk'].includes(primaryComp)) {
        baitType = 'paste_jar';
        containerMat = MATERIALS[rng.pick(['BONE', 'DARK_WOOD', 'STEEL'])]; 
        fillMat = primaryComp === 'wraith_silk' ? MATERIALS.GEM_PURPLE : MATERIALS.GEM_BLUE;
        baitName = 'Luminescent Paste';
        targetFamily = 'Deep Sea & Cephalopods';
        targetFamilyIds = ['deepsea', 'cephalopod'];
    } 
    // Group 3: Crustaceans & Rays
    else if (['bone_dust', 'cave_crawler_leg', 'mushroom_stalk'].includes(primaryComp)) {
        baitType = 'burlap_sack';
        containerMat = { base: '#A16207', shadow: '#713F12', highlight: '#CA8A04' }; 
        fillMat = MATERIALS.BONE;
        baitName = 'Sinking Meal Sack';
        targetFamily = 'Crustaceans & Rays';
        targetFamilyIds = ['crustacean', 'ray'];
    } 
    // Group 4: Jellyfish & Standard Fish
    else {
        // jelly_bell, myconid_spore, rattler_bells, iron_sinker, lead_sinker, spinner
        baitType = rng.pick(['paste_jar', 'burlap_sack']);
        containerMat = MATERIALS.STEEL;
        fillMat = MATERIALS.GEM_GREEN;
        baitName = 'Suspended Pellets';
        targetFamily = 'Jellyfish & Standard Fish';
        targetFamilyIds = ['jellyfish', 'fish'];
    }

    const cx = 32; 
    const cy = 36;

    // --- 2. DRAWING ROUTINES ---

    if (baitType === 'chum_bucket') {
        const topW = 10;
        const botW = 7;
        const h = 12;
        const iron = MATERIALS.IRON;

        // Draw handle (arch)
        for (let a = 0; a <= 180; a += 5) {
            const rad = a * (Math.PI / 180);
            const hx = cx + Math.cos(rad) * (topW + 1);
            const hy = cy - h + 2 - Math.sin(rad) * 6;
            overPixel(hx, hy, iron.base);
        }

        // Fill/Guts overflowing
        for (let y = cy - h - 3; y <= cy - h + 2; y++) {
            const w = topW - 1;
            for (let x = -w; x <= w; x++) {
                if (Math.hypot(x, y - (cy - h)) < topW - 1) {
                    let c = fillMat.base;
                    if (rng.chance(0.2)) c = fillMat.highlight;
                    if (rng.chance(0.2)) c = fillMat.shadow;
                    overPixel(cx + x, y, c);
                }
            }
        }
        // Drips
        for (let i = 0; i < 3; i++) {
            const dx = rng.int(-topW + 2, topW - 2);
            const dLen = rng.int(2, 6);
            for (let dy = 0; dy < dLen; dy++) {
                overPixel(cx + dx, cy - h + dy, fillMat.shadow);
            }
            overPixel(cx + dx, cy - h + dLen, fillMat.base);
        }

        // Draw Bucket Body
        for (let y = 0; y <= h; y++) {
            const progress = y / h;
            const w = Math.floor(topW - (topW - botW) * progress);
            for (let x = -w; x <= w; x++) {
                let c = containerMat.base;
                // Wood planks
                if (x % 4 === 0) c = containerMat.shadow;
                // 3D Cylinder shading
                if (x === w || x === w - 1) c = containerMat.shadow;
                if (x === -w + 1) c = containerMat.highlight;
                // Iron bands
                if (y === 2 || y === h - 2) c = iron.base;

                overPixel(cx + x, cy - h + y, c);
            }
        }
    } 
    
    else if (baitType === 'paste_jar') {
        const jw = 9;
        const jh = 10;
        
        // Fill / Glow spilling out
        for (let y = cy - jh - 5; y <= cy - jh; y++) {
            const w = rng.int(4, 7);
            for (let x = -w; x <= w; x++) {
                if (Math.hypot(x, y - (cy - jh)) < 6) {
                    let c = fillMat.base;
                    if (rng.chance(0.3)) c = fillMat.highlight;
                    overPixel(cx + x, y, c);
                }
            }
        }
        // Glowing Drips
        for (let i = 0; i < 4; i++) {
            const dx = rng.int(-jw + 1, jw - 1);
            const dLen = rng.int(3, 8);
            for (let dy = 0; dy < dLen; dy++) {
                overPixel(cx + dx, cy - jh + dy, fillMat.base);
            }
            overPixel(cx + dx, cy - jh + dLen, fillMat.highlight);
        }

        // Draw Jar
        for (let y = 0; y <= jh; y++) {
            const progress = y / jh;
            // Squat, round jar profile
            const w = Math.max(4, Math.floor(jw * Math.sin(Math.pow(progress, 0.5) * Math.PI)));
            for (let x = -w; x <= w; x++) {
                let c = containerMat.base;
                if (x === w || x === w - 1) c = containerMat.shadow;
                if (x === -w + 1) c = containerMat.highlight;
                
                overPixel(cx + x, cy - jh + y, c);
            }
        }
        
        // Jar Rim
        for (let x = -5; x <= 5; x++) {
            overPixel(cx + x, cy - jh, containerMat.highlight);
            overPixel(cx + x, cy - jh + 1, containerMat.base);
        }
    }

    else if (baitType === 'meat_skewer') {
        const metal = MATERIALS[rng.pick(['IRON', 'RUST'])];
        
        // Diagonal Skewer
        const startX = cx - 12;
        const startY = cy - 14;
        const endX = cx + 12;
        const endY = cy + 10;
        
        const steps = 35;
        for (let i = 0; i <= steps; i++) {
            const t = i / steps;
            const px = Math.round(startX + (endX - startX) * t);
            const py = Math.round(startY + (endY - startY) * t);
            
            overPixel(px, py, metal.base);
            overPixel(px - 1, py, metal.highlight);
            
            // Eyelet at the top
            if (i === 0) {
                for (let dy = -2; dy <= 1; dy++) {
                    for (let dx = -2; dx <= 1; dx++) {
                        if (Math.abs(dx) + Math.abs(dy) === 2) overPixel(px + dx - 2, py + dy - 2, metal.base);
                    }
                }
            }
            // Barb at the bottom
            if (i === steps) {
                overPixel(px - 1, py - 2, metal.shadow);
                overPixel(px - 2, py - 3, metal.shadow);
            }
        }

        // Meat Blob
        const blobR = rng.int(7, 10);
        for (let y = -blobR; y <= blobR; y++) {
            const w = Math.floor(blobR * Math.sqrt(1 - Math.pow(y / blobR, 2)));
            for (let x = -w; x <= w; x++) {
                // Irregular meat shape
                if (rng.chance(0.1) && Math.abs(x) === w) continue;
                
                let c = fillMat.base;
                if ((x+y)%3 === 0) c = fillMat.shadow; // Marbling/texture
                if (x < -blobR * 0.4 && y < -blobR * 0.4) c = fillMat.highlight;
                if (x > blobR * 0.5 || y > blobR * 0.5) c = fillMat.shadow;
                
                overPixel(cx + x, cy - 2 + y, c);
            }
        }
        
        // Blood drips
        for (let i = 0; i < 3; i++) {
            const dx = rng.int(-blobR + 2, blobR - 2);
            const dLen = rng.int(2, 6);
            for (let dy = 0; dy < dLen; dy++) {
                overPixel(cx + dx, cy - 2 + blobR + dy, fillMat.shadow);
            }
        }
    }

    else if (baitType === 'burlap_sack') {
        const sw = 10;
        const sh = 14;
        
        // Tie / Spilling contents
        const neckY = cy - sh;
        for (let y = neckY - 4; y <= neckY; y++) {
            const w = rng.int(2, 5);
            for (let x = -w; x <= w; x++) {
                // Spilling out
                if (y < neckY - 1) {
                    if (Math.hypot(x, y - (neckY - 2)) < 4 && rng.chance(0.7)) {
                        overPixel(cx + x, y, rng.chance(0.5) ? fillMat.base : fillMat.highlight);
                    }
                } else {
                    // Sack frills
                    overPixel(cx + x, y, containerMat.highlight);
                }
            }
        }
        // Rope Tie
        for (let x = -4; x <= 4; x++) overPixel(cx + x, neckY, MATERIALS.PINE.base);

        // Teardrop Sack Body
        for (let y = 0; y <= sh; y++) {
            const progress = y / sh;
            // Bulges at the bottom, pinches at the top
            const w = Math.floor(sw * Math.sin(Math.pow(progress, 0.6) * Math.PI)) + 2;
            for (let x = -w; x <= w; x++) {
                let c = containerMat.base;
                // Burlap texture (checkerboard)
                if ((x+y) % 2 === 0) c = containerMat.shadow;
                
                if (x === w || x === w - 1) c = containerMat.shadow;
                if (x === -w + 1) c = containerMat.highlight;
                
                overPixel(cx + x, neckY + 1 + y, c);
            }
        }
    }

    // --- 3. OUTLINE PASS ---
    const outlineGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            if (grid[y][x] === null) {
                // Don't outline glowing bits in the Paste Jar
                if ((y > 0 && grid[y - 1][x] !== null && grid[y - 1][x] !== fillMat.highlight && grid[y - 1][x] !== fillMat.base) || 
                    (y < GRID_SIZE - 1 && grid[y + 1][x] !== null && grid[y + 1][x] !== fillMat.highlight && grid[y + 1][x] !== fillMat.base) || 
                    (x > 0 && grid[y][x - 1] !== null && grid[y][x - 1] !== fillMat.highlight && grid[y][x - 1] !== fillMat.base) || 
                    (x < GRID_SIZE - 1 && grid[y][x + 1] !== null && grid[y][x + 1] !== fillMat.highlight && grid[y][x + 1] !== fillMat.base)) {
                    outlineGrid[y][x] = '#020617'; 
                }
            }
        }
    }

// --- 4. RENDER ---
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            let colorCode = outlineGrid[y][x] || grid[y][x];
            // Glow overrides outline
            if (grid[y][x] === fillMat.highlight || grid[y][x] === fillMat.base) {
                if (baitType === 'paste_jar') colorCode = grid[y][x];
            }
            if (colorCode) drawScaledRect(ctx, x, y, 1, 1, colorCode, DISPLAY_SCALE);
        }
    }

    return {
        name: baitName,
        invType: 'bait', 
        seed: seed,
        imageDataUrl: offscreenCanvas.toDataURL(),
        itemData: {
            baitType,
            targetFamily,      // UI friendly string (e.g. "Sharks & Eels")
            targetFamilyIds,   // Array of actual IDs for the engine (e.g. ['shark', 'eel'])
            components
        }
    };
}