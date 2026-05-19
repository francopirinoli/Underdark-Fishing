/**
 * js/art/upgrade_generator.js
 * Generates pixel art icons for Boat Upgrades (Plating, Engines, Prows, Lanterns, Storage).
 */

import { drawScaledRect } from '../util/utils.js';
import { MATERIALS } from './equipment_palettes.js';
import { createRng } from '../util/rng.js';

const GRID_SIZE = 64;
const DISPLAY_SCALE = 4;
const CANVAS_SIZE = GRID_SIZE * DISPLAY_SCALE;

export function generateUpgrade(options = {}) {
    const seed = options.seed || Date.now();
    const rng = options.rng || createRng(seed);
    const id = options.id || 'upg_cargo_net';

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
    const cy = 32;

    // --- 1. PLATING: Iron Plating ---
    if (id === 'upg_iron_plating') {
        const mat = MATERIALS.IRON;
        for (let y = -14; y <= 16; y++) {
            // Shield shape
            const w = y < 2 ? 14 : Math.max(1, 14 - Math.pow((y - 2) / 14, 2) * 14);
            for (let x = -w; x <= w; x++) {
                let c = mat.base;
                if (x === Math.floor(w) || x === -Math.floor(w)) c = mat.shadow;
                if (y === -14 || y === 16) c = mat.shadow;
                if (x > -w + 1 && x < -w + 3 && y > -12) c = mat.highlight; // Edge glint
                
                // Rivets
                if ((x === -8 || x === 8 || x === 0) && (y === -10 || y === 0 || y === 10)) {
                    if (Math.abs(x) < w - 2) c = '#FFFFFF';
                }
                overPixel(cx + x, cy + y, c);
            }
        }
    } 
    // --- 2. PLATING: Acoustic Dampening ---
    else if (id === 'upg_acoustic_dampening') {
        const base = '#1E293B';
        const dark = '#0F172A';
        const stitch = '#334155';
        for (let y = -12; y <= 12; y++) {
            for (let x = -14; x <= 14; x++) {
                let c = base;
                // Quilted diamond pattern
                if ((Math.abs(x) + Math.abs(y)) % 6 === 0) c = stitch;
                if (x === -14 || x === 14 || y === -12 || y === 12) c = dark; // Border
                overPixel(cx + x, cy + y, c);
            }
        }
    }
    // --- 3. ENGINE: Overclocked Motor ---
    else if (id === 'upg_overclocked_motor') {
        const metal = MATERIALS.IRON;
        const brass = MATERIALS.GOLD;
        // Central Block
        for (let y = -8; y <= 10; y++) {
            for (let x = -10; x <= 10; x++) {
                let c = metal.base;
                if (x % 4 === 0) c = metal.shadow; // Vents
                if (y === -8 || y === 10) c = metal.highlight;
                overPixel(cx + x, cy + y, c);
            }
        }
        // Twin Propellers / Exhausts
        for (let side of [-1, 1]) {
            const px = cx + side * 14;
            for (let y = 0; y <= 12; y++) {
                for (let x = -3; x <= 3; x++) {
                    overPixel(px + x, cy + y, (x===3 || x===-3) ? brass.shadow : brass.base);
                }
            }
        }
        // Smoke stack
        for (let y = -16; y < -8; y++) {
            overPixel(cx - 2, cy + y, brass.base);
            overPixel(cx + 2, cy + y, brass.base);
            for (let x = -1; x <= 1; x++) overPixel(cx + x, cy + y, '#020617'); // Hollow
        }
    }
    // --- 4. ENGINE: Alchemical Filter ---
    else if (id === 'upg_alchemical_filter') {
        const brass = MATERIALS.GOLD;
        // Glass Tube
        for (let y = -12; y <= 12; y++) {
            for (let x = -8; x <= 8; x++) {
                let c = '#166534'; // Dark green fluid
                if (x > -6 && x < 6 && y > -10 && y < 10) c = '#22C55E'; // Bright green
                if (x === -4 && y > -8 && y < 8) c = '#86EFAC'; // Glass reflection
                if (rng.chance(0.1)) c = '#BEF264'; // Bubbles
                overPixel(cx + x, cy + y, c);
            }
        }
        // Brass Caps
        for (let y of [-14, -13, 13, 14]) {
            for (let x = -10; x <= 10; x++) {
                overPixel(cx + x, cy + y, x === -10 || x === 10 ? brass.shadow : brass.base);
            }
        }
    }
    // --- 5. PROW: Icebreaker Prow ---
    else if (id === 'upg_icebreaker_prow') {
        const rust = MATERIALS.RUST;
        const steel = MATERIALS.STEEL;
        // Heavy Wedge Shape
        for (let y = -12; y <= 12; y++) {
            const w = Math.floor(14 - ((y + 12) / 24) * 12); // Wider at top, narrow at bottom
            for (let x = -w; x <= w; x++) {
                let c = rust.base;
                if (Math.abs(x) > w - 2) c = rust.shadow;
                // Center cutting edge is polished steel
                if (Math.abs(x) <= 2) c = steel.base;
                if (x === 0) c = steel.highlight;
                overPixel(cx + x, cy + y, c);
            }
        }
    }
    // --- 6. LANTERN: Kerosene ---
    else if (id === 'upg_lantern_kero') {
        const brass = MATERIALS.GOLD;
        // Glow
        for (let y = -6; y <= 6; y++) {
            for (let x = -6; x <= 6; x++) {
                if (Math.hypot(x, y) < 5) overPixel(cx + x, cy + y, '#FBBF24');
                if (Math.hypot(x, y) < 2) overPixel(cx + x, cy + y, '#FEF08A');
            }
        }
        // Base & Roof
        for (let x = -8; x <= 8; x++) {
            overPixel(cx + x, cy + 7, brass.base); overPixel(cx + x, cy + 8, brass.shadow);
            overPixel(cx + x, cy - 7, brass.base);
            if (Math.abs(x) < 6) overPixel(cx + x, cy - 8, brass.highlight);
            if (Math.abs(x) < 3) overPixel(cx + x, cy - 9, brass.base);
        }
        // Handle
        for (let a = 180; a <= 360; a += 10) {
            const rad = a * (Math.PI / 180);
            overPixel(cx + Math.cos(rad) * 10, cy - 6 + Math.sin(rad) * 6, brass.shadow);
        }
    }
    // --- 7. LANTERN: Magic Orb ---
    else if (id === 'upg_lantern_magic') {
        const iron = MATERIALS.IRON;
        // Floating Purple Gem
        for (let y = -6; y <= 6; y++) {
            const w = 6 - Math.abs(y);
            for (let x = -w; x <= w; x++) {
                let c = '#A855F7';
                if (x === 0) c = '#E9D5FF'; // Center shine
                if (x === w || x === -w) c = '#7E22CE';
                overPixel(cx + x, cy + y - 2, c);
            }
        }
        // Iron Bracket (claws coming from below)
        for (let x = -8; x <= 8; x++) overPixel(cx + x, cy + 10, iron.base);
        overPixel(cx - 8, cy + 8, iron.base); overPixel(cx - 7, cy + 6, iron.highlight); overPixel(cx - 5, cy + 4, iron.highlight);
        overPixel(cx + 8, cy + 8, iron.base); overPixel(cx + 7, cy + 6, iron.highlight); overPixel(cx + 5, cy + 4, iron.highlight);
    }
    // --- 8. STORAGE: Cargo Netting ---
    else if (id === 'upg_cargo_net') {
        const wood = MATERIALS.OAK;
        const rope = '#D97706';
        // Box
        for (let y = -10; y <= 10; y++) {
            for (let x = -12; x <= 12; x++) {
                let c = wood.base;
                if (x === -12 || y === -10) c = wood.highlight;
                if (x === 12 || y === 10) c = wood.shadow;
                // Netting criss-cross
                if ((x + y) % 6 === 0 || (x - y) % 6 === 0) c = rope;
                overPixel(cx + x, cy + y, c);
            }
        }
    }
    // --- FALLBACK ---
    else {
        for (let y = -10; y <= 10; y++) {
            for (let x = -10; x <= 10; x++) overPixel(cx + x, cy + y, MATERIALS.STEEL.base);
        }
    }

    // --- OUTLINE PASS ---
    const outlineGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            if (grid[y][x] === null) {
                // Don't outline glows
                if ((y > 0 && grid[y - 1][x] !== null && !['#FBBF24', '#FEF08A', '#E9D5FF'].includes(grid[y - 1][x])) || 
                    (y < GRID_SIZE - 1 && grid[y + 1][x] !== null && !['#FBBF24', '#FEF08A', '#E9D5FF'].includes(grid[y + 1][x])) || 
                    (x > 0 && grid[y][x - 1] !== null && !['#FBBF24', '#FEF08A', '#E9D5FF'].includes(grid[y][x - 1])) || 
                    (x < GRID_SIZE - 1 && grid[y][x + 1] !== null && !['#FBBF24', '#FEF08A', '#E9D5FF'].includes(grid[y][x + 1]))) {
                    outlineGrid[y][x] = '#020617'; 
                }
            }
        }
    }

    // --- RENDER ---
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            let colorCode = outlineGrid[y][x] || grid[y][x];
            // Glows punch through outlines
            if (['#FBBF24', '#FEF08A', '#E9D5FF'].includes(grid[y][x])) colorCode = grid[y][x];
            if (colorCode) drawScaledRect(ctx, x, y, 1, 1, colorCode, DISPLAY_SCALE);
        }
    }

    return {
        imageDataUrl: offscreenCanvas.toDataURL()
    };
}