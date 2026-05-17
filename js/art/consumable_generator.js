/**
 * js/art/consumable_generator.js
 * Generates pixel art for standard consumables (Repair Kits, Rations, Fuel).
 */

import { drawScaledRect } from '../util/utils.js';
import { MATERIALS } from './equipment_palettes.js';
import { createRng } from '../util/rng.js';

const GRID_SIZE = 64;
const DISPLAY_SCALE = 4;
const CANVAS_SIZE = GRID_SIZE * DISPLAY_SCALE;

export function generateConsumable(options = {}) {
    const seed = options.seed || Date.now();
    const rng = options.rng || createRng(seed);
    const id = options.id || 'cons_repair_kit';

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

    const cx = 32;
    const cy = 40;

    // --- 1. REPAIR KIT ---
    if (id === 'cons_repair_kit') {
        const boxMat = MATERIALS[rng.pick(['OAK', 'PINE', 'DARK_WOOD'])];
        const bandMat = MATERIALS[rng.pick(['IRON', 'STEEL', 'RUST'])];
        const boxW = rng.int(10, 14);
        const boxH = rng.int(8, 12);
        
        // Back wall of the box
        for (let y = 0; y < boxH; y++) {
            for (let x = -boxW; x <= boxW; x++) {
                overPixel(cx + x, cy - y, boxMat.shadow);
            }
        }
        
        // Random Tools sticking out!
        // 1. Hammer
        if (rng.chance(0.8)) {
            const hx = cx - rng.int(2, 6);
            for (let i = 0; i < 10; i++) overPixel(hx - Math.floor(i/2), cy - i, MATERIALS.PINE.base); // Handle
            overPixel(hx - 5, cy - 9, bandMat.highlight); overPixel(hx - 4, cy - 9, bandMat.base); overPixel(hx - 3, cy - 9, bandMat.base); // Head
            overPixel(hx - 5, cy - 10, bandMat.base); overPixel(hx - 4, cy - 10, bandMat.shadow); overPixel(hx - 3, cy - 10, bandMat.shadow);
        }
        // 2. Wrench
        if (rng.chance(0.7)) {
            const wx = cx + rng.int(2, 6);
            for (let i = 0; i < 8; i++) overPixel(wx + Math.floor(i/3), cy - i, MATERIALS.STEEL.base); // Handle
            overPixel(wx + 2, cy - 8, MATERIALS.STEEL.highlight); overPixel(wx + 4, cy - 8, MATERIALS.STEEL.base); // C-Head
            overPixel(wx + 1, cy - 9, MATERIALS.STEEL.base);      overPixel(wx + 4, cy - 9, MATERIALS.STEEL.shadow);
            overPixel(wx + 2, cy - 10, MATERIALS.STEEL.base);     overPixel(wx + 4, cy - 10, MATERIALS.STEEL.shadow);
        }
        // 3. Wood Planks
        if (rng.chance(0.6)) {
            for (let i = 0; i < 8; i++) {
                overPixel(cx + i, cy - 4 - i, MATERIALS.OAK.highlight);
                overPixel(cx + i + 1, cy - 4 - i, MATERIALS.OAK.base);
            }
        }

        // Front wall of the box
        for (let y = 0; y < Math.floor(boxH * 0.6); y++) {
            for (let x = -boxW; x <= boxW; x++) {
                let c = boxMat.base;
                if (x % 5 === 0) c = boxMat.shadow; // Wood planks
                if (x === -boxW || x === boxW) c = bandMat.base; // Iron edges
                if (y === 0 || y === Math.floor(boxH * 0.6) - 1) c = bandMat.shadow; // Iron bands
                overPixel(cx + x, cy - y, c);
            }
        }
        // Box Handle
        for (let x = -6; x <= 6; x++) {
            overPixel(cx + x, cy - boxH - 4, bandMat.base);
            if (x === -6 || x === 6) {
                overPixel(cx + x, cy - boxH - 3, bandMat.base);
                overPixel(cx + x, cy - boxH - 2, bandMat.shadow);
            }
        }
    } 
    
    // --- 2. CAVE RATIONS ---
    else if (id === 'cons_ration') {
        const wrap = { base: '#4ADE80', shadow: '#166534', highlight: '#86EFAC' }; // Green leaf wrap
        const string = MATERIALS.PINE;
        const meat = MATERIALS.FLESH;
        
        // Jerky sticking out
        for (let x = -3; x <= 4; x++) {
            for (let y = 0; y < 14; y++) {
                if ((x+y)%3===0) overPixel(cx + x + Math.floor(y/3), cy - y, meat.shadow);
                else overPixel(cx + x + Math.floor(y/3), cy - y, meat.base);
            }
        }
        // Leaf Wrapping
        for (let y = 0; y < 10; y++) {
            const w = 8 - Math.abs(y - 5);
            for (let x = -w; x <= w; x++) {
                let c = wrap.base;
                if (x === w || x === -w) c = wrap.shadow;
                if (y === 5 || x === 0) c = string.highlight; // Tied string
                overPixel(cx + x, cy - y, c);
            }
        }
    } 
    
    // --- 3. FUEL OIL ---
    else if (id === 'cons_fuel_oil') {
        const canMat = MATERIALS.IRON;
        const oilMat = { base: '#0F172A', highlight: '#334155', shadow: '#020617' };
        
        // Canister Body
        for (let y = 0; y < 12; y++) {
            const w = y > 9 ? 4 : 7;
            for (let x = -w; x <= w; x++) {
                let c = canMat.base;
                if (x === w || y === 0) c = canMat.shadow;
                if (x === -w + 1) c = canMat.highlight;
                if (x > -3 && x < 3 && y > 2 && y < 8) c = oilMat.base; // Glass window showing oil
                overPixel(cx + x, cy - y, c);
            }
        }
        // Oil drop on the window
        overPixel(cx, cy - 4, oilMat.highlight);
        
        // Spout
        overPixel(cx + 4, cy - 11, canMat.base); overPixel(cx + 5, cy - 12, canMat.base);
        overPixel(cx + 6, cy - 13, canMat.highlight); overPixel(cx + 7, cy - 14, canMat.shadow);
        overPixel(cx + 8, cy - 13, oilMat.highlight); // Dripping oil
    }

    // --- OUTLINE PASS ---
    const outlineGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            if (grid[y][x] === null) {
                if ((y > 0 && grid[y - 1][x] !== null) || (y < GRID_SIZE - 1 && grid[y + 1][x] !== null) || 
                    (x > 0 && grid[y][x - 1] !== null) || (x < GRID_SIZE - 1 && grid[y][x + 1] !== null)) {
                    outlineGrid[y][x] = '#020617'; 
                }
            }
        }
    }

    // --- RENDER ---
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            let colorCode = outlineGrid[y][x] || grid[y][x];
            if (colorCode) drawScaledRect(ctx, x, y, 1, 1, colorCode, DISPLAY_SCALE);
        }
    }

    return {
        imageDataUrl: offscreenCanvas.toDataURL()
    };
}