/**
 * js/art/chest_generator.js
 * Generates procedural chests and mimics.
 * Adapted to Grid-based rendering for automatic outlining and deterministic seeding.
 */

import { drawScaledRect } from '../util/utils.js';
import { MATERIALS } from './equipment_palettes.js';

const GRID_SIZE = 64;
const DISPLAY_SCALE = 4;
const CANVAS_SIZE = GRID_SIZE * DISPLAY_SCALE;

export function generateChest(options = {}) {
    const rng = options.rng;
    const isMimic = options.isMimic || false;

    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = CANVAS_SIZE;
    offscreenCanvas.height = CANVAS_SIZE;
    const ctx = offscreenCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));

    function setPixel(x, y, hexColor) {
        x = Math.round(x); y = Math.round(y);
        if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) grid[y][x] = hexColor;
    }

    // Helper to adapt the old rect-drawing logic to the new grid array
    function fillGridRect(startX, startY, w, h, color) {
        for (let y = startY; y < startY + h; y++) {
            for (let x = startX; x < startX + w; x++) setPixel(x, y, color);
        }
    }

    // --- 1. PROCEDURAL PARAMETERS (Determined before mimic check for stability) ---
    const chestWidth = rng.int(26, 34);
    const chestHeight = rng.int(22, 26);
    const lidIsRounded = rng.chance(0.5);
    
    // Choose Materials
    const mainMaterial = rng.pick(['OAK', 'PINE', 'DARK_WOOD', 'DRIFTWOOD', 'IRON', 'RUST']);
    const mainPalette = MATERIALS[mainMaterial];
    
    const trimMaterial = rng.pick(['IRON', 'STEEL', 'GOLD', 'SILVER']);
    const trimPalette = MATERIALS[trimMaterial];
    
    const lockPalette = MATERIALS[rng.chance(0.5) ? 'STEEL' : 'GOLD'];

    // --- 2. DIMENSIONS ---
    const startX = Math.floor((GRID_SIZE - chestWidth) / 2);
    const startY = Math.floor((GRID_SIZE - chestHeight) / 2) + 2;
    const lidHeight = Math.floor(chestHeight * 0.4);
    const bodyHeight = chestHeight - lidHeight;

    // --- 3. MAIN BODY ---
    const bodyY = startY + lidHeight;
    fillGridRect(startX, bodyY, chestWidth, bodyHeight, mainPalette.base);
    
    // Shading on front face
    fillGridRect(startX, bodyY, chestWidth, 1, mainPalette.highlight); 
    fillGridRect(startX, bodyY + bodyHeight - 1, chestWidth, 1, mainPalette.shadow); 

    // Vertical Trim
    fillGridRect(startX, bodyY, 2, bodyHeight, trimPalette.base);
    fillGridRect(startX + chestWidth - 2, bodyY, 2, bodyHeight, trimPalette.base);
    fillGridRect(startX + 1, bodyY, 1, bodyHeight, trimPalette.highlight);
    fillGridRect(startX + chestWidth - 2, bodyY, 1, bodyHeight, trimPalette.shadow);

    // Horizontal Bands
    fillGridRect(startX, bodyY + Math.floor(bodyHeight * 0.1), chestWidth, 2, trimPalette.base);
    fillGridRect(startX, bodyY + bodyHeight - 2 - Math.floor(bodyHeight * 0.1), chestWidth, 2, trimPalette.base);

    // --- 4. LID & MIMIC FEATURES ---
    if (isMimic) {
        // --- OPEN LID (Mimic) ---
        const lidRotationPointY = startY + lidHeight - 2;
        const lidOpenHeight = lidHeight + 4;

        // Draw the open lid, angled back
        for (let i = 0; i < lidOpenHeight; i++) {
            const progress = i / (lidOpenHeight - 1);
            const currentWidth = chestWidth + Math.floor(progress * 4);
            const currentX = startX - Math.floor(progress * 2);
            let color = mainPalette.base;

            if (i < 2) color = mainPalette.shadow;
            else if (i > lidOpenHeight - 3) color = mainPalette.highlight;

            fillGridRect(currentX, lidRotationPointY - i, currentWidth, 1, color);
        }
        
        // Lid Trim
        fillGridRect(startX - 2, lidRotationPointY - lidOpenHeight, 2, lidOpenHeight, trimPalette.base);
        fillGridRect(startX + chestWidth, lidRotationPointY - lidOpenHeight, 2, lidOpenHeight, trimPalette.base);

        // --- MOUTH ---
        const mouthY = lidRotationPointY;
        fillGridRect(startX, mouthY, chestWidth, 1, '#111827'); // Deep dark mouth

        // Tongue (Bezier curve adaptation)
        const tongueTipY = mouthY + 8 + rng.int(0, 4);
        const tongueTipX = startX + chestWidth / 2 + rng.int(-4, 4);
        let cp1X = startX + chestWidth / 2 - 10;
        let cp1Y = mouthY + 2;
        
        for (let t = 0; t <= 1; t += 0.05) {
            const x = Math.pow(1 - t, 2) * (startX + chestWidth / 2) + 2 * (1 - t) * t * cp1X + Math.pow(t, 2) * tongueTipX;
            const y = Math.pow(1 - t, 2) * mouthY + 2 * (1 - t) * t * cp1Y + Math.pow(t, 2) * tongueTipY;
            fillGridRect(Math.round(x) - 1, Math.round(y), 3, 2, MATERIALS.TONGUE.base);
            fillGridRect(Math.round(x), Math.round(y), 1, 1, MATERIALS.TONGUE.highlight);
        }

        // Teeth
        for (let t = 2; t < chestWidth - 2; t += 3) {
            fillGridRect(startX + t, mouthY - 1, 2, 2, MATERIALS.BONE.base); // Top teeth
            fillGridRect(startX + t + 1, mouthY + 1, 2, 2, MATERIALS.BONE.base); // Bottom teeth
        }

        // --- EYE ---
        const eyeSize = 4;
        const eyeX = startX + Math.floor((chestWidth - eyeSize) / 2) + rng.int(-5, 5);
        const eyeY = bodyY + Math.floor(bodyHeight * 0.3);
        const eyePalette = MATERIALS[rng.pick(['GEM_RED', 'GEM_YELLOW', 'GEM_GREEN', 'GEM_PURPLE'])];
        
        fillGridRect(eyeX, eyeY, eyeSize, eyeSize, eyePalette.base);
        fillGridRect(eyeX + 1, eyeY + 1, eyeSize - 2, eyeSize - 2, eyePalette.highlight);
        fillGridRect(eyeX + Math.floor(eyeSize/2), eyeY + Math.floor(eyeSize/2), 1, 1, '#020617'); // Pupil

    } else {
        // --- CLOSED LID (Normal Chest) ---
        if (lidIsRounded) {
            for (let y = 0; y < lidHeight; y++) {
                const heightProgress = y / (lidHeight - 1);
                const currentWidth = Math.floor(chestWidth * Math.sqrt(1 - Math.pow(heightProgress, 2)));
                const x = startX + Math.floor((chestWidth - currentWidth) / 2);
                
                fillGridRect(x, startY + lidHeight - 1 - y, currentWidth, 1, mainPalette.base);
                if (y > lidHeight * 0.6) fillGridRect(x, startY + lidHeight - 1 - y, currentWidth, 1, mainPalette.highlight);
            }
        } else {
            fillGridRect(startX, startY, chestWidth, lidHeight, mainPalette.base);
            fillGridRect(startX, startY, chestWidth, 2, mainPalette.highlight);
        }
        // Lid Trim
        fillGridRect(startX, startY + lidHeight - 2, chestWidth, 2, trimPalette.base);

        // Lock (Only on closed chests)
        const lockWidth = 6;
        const lockHeight = 5;
        const lockX = startX + Math.floor((chestWidth - lockWidth) / 2);
        const lockY = bodyY - Math.floor(lockHeight / 2) + 1;
        fillGridRect(lockX, lockY, lockWidth, lockHeight, lockPalette.highlight);
        fillGridRect(lockX + 1, lockY + 1, lockWidth - 2, lockHeight - 2, lockPalette.base);
        fillGridRect(lockX + 2, lockY + 2, lockWidth - 4, 1, lockPalette.shadow); // Keyhole
    }

    // --- 5. OUTLINE PASS ---
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

    // --- 6. RENDER ---
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            let colorCode = grid[y][x] || outlineGrid[y][x];
            if (colorCode) drawScaledRect(ctx, x, y, 1, 1, colorCode, DISPLAY_SCALE);
        }
    }

    return {
        name: isMimic ? `Mimic` : `Sunken Chest`,
        imageDataUrl: offscreenCanvas.toDataURL(),
        data: { material: mainMaterial, trim: trimMaterial, isMimic }
    };
}