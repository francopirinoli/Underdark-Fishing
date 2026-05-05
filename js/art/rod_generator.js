/**
 * js/art/rod_generator.js
 * Procedural Fishing Rod Generator.
 * Generates diagonal fishing poles with varied grips, reels, eyelets, and magical lines.
 * V2 - Fixed undefined "metal" reference.
 */

import { drawScaledRect } from '../util/utils.js';
import { MATERIALS } from './equipment_palettes.js';

const GRID_SIZE = 64;
const DISPLAY_SCALE = 4;
const CANVAS_SIZE = GRID_SIZE * DISPLAY_SCALE;

export function generateRod(options = {}) {
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

    // --- 1. PROCEDURAL PARAMETERS ---
    
    // Core Material
    const materialCategory = rng.pick(['WOOD', 'WOOD', 'METAL', 'BONE', 'CRYSTAL']);
    let poleMatKey = 'OAK';
    if (materialCategory === 'WOOD') poleMatKey = rng.pick(['PINE', 'OAK', 'DARK_WOOD', 'DRIFTWOOD']);
    if (materialCategory === 'METAL') poleMatKey = rng.pick(['IRON', 'STEEL', 'RUST']);
    if (materialCategory === 'BONE') poleMatKey = 'BONE';
    if (materialCategory === 'CRYSTAL') poleMatKey = rng.pick(['GEM_RED', 'GEM_BLUE', 'GEM_GREEN', 'GEM_PURPLE']);
    
    const poleMat = MATERIALS[poleMatKey];
    
    // Grip & Accents
    const gripStyle = rng.pick(['leather_wrap', 'cork_smooth', 'banded_iron', 'bone_carved']);
    let gripMat = MATERIALS.DARK_WOOD; // Fallback cork
    if (gripStyle === 'leather_wrap') gripMat = MATERIALS.PINE;
    if (gripStyle === 'banded_iron') gripMat = MATERIALS.IRON;
    if (gripStyle === 'bone_carved') gripMat = MATERIALS.BONE;

    const reelType = rng.pick(['simple_spool', 'heavy_crank', 'magic_orb', 'drum']);
    // FIX: Properly define `metal` so the drawing loops can use it!
    const metal = MATERIALS[rng.pick(['IRON', 'STEEL', 'GOLD', 'SILVER', 'RUST'])];
    
    // Line & Eyelets
    const lineGlows = materialCategory === 'CRYSTAL' || reelType === 'magic_orb' || rng.chance(0.2);
    const lineColor = lineGlows ? rng.pick(['#22D3EE', '#A855F7', '#BEF264', '#FCA5A5']) : '#E2E8F0';
    
    const numGuides = rng.int(3, 5);

    // --- 2. THE POLE (Diagonal Line from bottom-left to top-right) ---
    const startX = 12;
    const startY = 52;
    const endX = rng.int(48, 56);
    const endY = rng.int(8, 16);
    
    const poleLength = Math.hypot(endX - startX, endY - startY);
    const steps = Math.floor(poleLength);

    for (let i = 0; i <= steps; i++) {
        const t = i / steps;
        const px = Math.round(startX + (endX - startX) * t);
        const py = Math.round(startY + (endY - startY) * t);
        
        // Taper the pole thickness
        let thickness = 2; // base
        if (t > 0.4) thickness = 1; // mid
        if (t > 0.8) thickness = 0; // tip
        
        for (let dx = 0; dx <= thickness; dx++) {
            for (let dy = 0; dy >= -thickness; dy--) {
                let c = poleMat.base;
                if (dx === thickness) c = poleMat.shadow;
                if (dx === 0 && dy === 0) c = poleMat.highlight;
                if (materialCategory === 'CRYSTAL' && rng.chance(0.3)) c = '#FFFFFF'; // Crystal sparkles
                
                overPixel(px + dx, py + dy, c);
            }
        }
    }

    // --- 3. THE GRIP ---
    const gripEndT = 0.25; // Grip takes up the bottom 25% of the rod
    const gripSteps = Math.floor(steps * gripEndT);
    
    for (let i = 0; i <= gripSteps; i++) {
        const t = i / steps;
        const px = Math.round(startX + (endX - startX) * t);
        const py = Math.round(startY + (endY - startY) * t);
        
        // Grip is thicker than the pole
        for (let dx = -1; dx <= 3; dx++) {
            for (let dy = 1; dy >= -3; dy--) {
                let c = gripMat.base;
                
                if (gripStyle === 'leather_wrap') {
                    if ((px + py) % 3 === 0) c = gripMat.shadow; // Criss-cross wrap texture
                    else c = gripMat.base;
                } else if (gripStyle === 'banded_iron') {
                    if (i % 4 === 0) c = MATERIALS.GOLD.base; // Gold rings on the iron
                    else c = gripMat.shadow;
                } else if (gripStyle === 'bone_carved') {
                    if (dx === 1 || dy === -1) c = gripMat.highlight;
                    else c = gripMat.shadow;
                } else {
                    // Cork smooth
                    if (dx === 3) c = gripMat.shadow;
                    if (dx === -1) c = gripMat.highlight;
                }
                
                overPixel(px + dx, py + dy, c);
            }
        }
    }

    // --- 4. THE REEL ---
    // Placed slightly above the handle
    const reelT = 0.18;
    const rx = Math.round(startX + (endX - startX) * reelT) + 2;
    const ry = Math.round(startY + (endY - startY) * reelT) + 2;

    if (reelType === 'simple_spool') {
        for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
                if (Math.abs(dx) + Math.abs(dy) <= 3) {
                    overPixel(rx + dx, ry + dy, metal.base);
                    if (dx === 0) overPixel(rx + dx, ry + dy, '#1E293B'); // Line wound inside
                }
            }
        }
        overPixel(rx, ry - 3, metal.highlight); overPixel(rx, ry + 3, metal.shadow); // Mount
    } 
    else if (reelType === 'drum') {
        // A wide horizontal drum/winch
        for (let dy = -1; dy <= 2; dy++) {
            for (let dx = -3; dx <= 4; dx++) {
                let c = metal.base;
                if (dx === 4 || dy === 2) c = metal.shadow;
                if (dx === -3 || dy === -1) c = metal.highlight;
                if (dx > -2 && dx < 3 && dy === 0) c = '#020617'; // Hollow center
                overPixel(rx + dx, ry + dy, c);
            }
        }
        // Crank handle
        overPixel(rx + 5, ry + 1, metal.base); overPixel(rx + 6, ry + 1, MATERIALS.DARK_WOOD.base);
    }
    else if (reelType === 'heavy_crank') {
        // Bulky baitcaster shape
        for (let dy = -3; dy <= 2; dy++) {
            for (let dx = -2; dx <= 3; dx++) {
                if (Math.hypot(dx, dy) < 3.5) {
                    let c = metal.base;
                    if (dx > 1) c = metal.shadow;
                    if (dy < -1) c = metal.highlight;
                    overPixel(rx + dx, ry + dy, c);
                }
            }
        }
        // Gears/Crank
        overPixel(rx + 1, ry + 1, metal.highlight);
        overPixel(rx + 2, ry + 2, metal.shadow);
        overPixel(rx + 3, ry + 3, MATERIALS.DARK_WOOD.base);
    }
    else if (reelType === 'magic_orb') {
        // Floating glowing sphere
        overPixel(rx - 1, ry - 1, metal.base); // Mount
        const orbX = rx + 3;
        const orbY = ry + 3;
        const glowPal = MATERIALS[rng.pick(['GEM_BLUE', 'GEM_PURPLE', 'GEM_GREEN'])];
        
        for (let dy = -2; dy <= 2; dy++) {
            for (let dx = -2; dx <= 2; dx++) {
                if (Math.abs(dx) + Math.abs(dy) <= 3) {
                    overPixel(orbX + dx, orbY + dy, glowPal.base);
                    if (dx === -1 && dy === -1) overPixel(orbX + dx, orbY + dy, glowPal.highlight);
                }
            }
        }
        // Magical floating particles
        if (rng.chance(0.5)) overPixel(orbX - 3, orbY + 2, glowPal.highlight);
        if (rng.chance(0.5)) overPixel(orbX + 2, orbY + 4, glowPal.highlight);
    }

    // --- 5. EYELETS (Line Guides) & FISHING LINE ---
    const guidePts =[];
    
    for (let i = 1; i <= numGuides; i++) {
        // Space them exponentially closer towards the tip
        const t = gripEndT + (1 - gripEndT) * Math.pow(i / numGuides, 0.8);
        const px = Math.round(startX + (endX - startX) * t);
        const py = Math.round(startY + (endY - startY) * t);
        
        // Draw the metal loop protruding UP and LEFT from the rod
        overPixel(px - 1, py - 1, metal.base);
        overPixel(px - 2, py - 2, metal.highlight);
        
        guidePts.push({ x: px - 2, y: py - 2 });
    }
    
    // Add the very tip of the rod as the final guide point
    guidePts.push({ x: endX - 1, y: endY - 1 });

    // Draw the Fishing Line connecting the guides
    let lastPt = { x: rx - 1, y: ry - 1 }; // Start line at the reel
    
    for (const pt of guidePts) {
        const dx = pt.x - lastPt.x;
        const dy = pt.y - lastPt.y;
        const dist = Math.hypot(dx, dy);
        
        for(let j = 0; j <= dist; j++) {
            const lx = Math.round(lastPt.x + (dx * (j/dist)));
            const ly = Math.round(lastPt.y + (dy * (j/dist)));
            // The line usually droops slightly between guides (gravity)
            const droop = Math.sin((j/dist) * Math.PI) * 1.5;
            overPixel(lx, Math.round(ly + droop), lineColor);
        }
        lastPt = pt;
    }

    // Dropping the line from the tip
    const dropLength = rng.int(10, 20);
    for (let i = 0; i < dropLength; i++) {
        overPixel(lastPt.x, lastPt.y + i, lineColor);
    }
    
    // Bobber / Hook / Lure at the end of the line
    const bobberY = lastPt.y + dropLength;
    if (rng.chance(0.5)) {
        // Simple Hook
        overPixel(lastPt.x, bobberY, metal.shadow);
        overPixel(lastPt.x, bobberY + 1, metal.shadow);
        overPixel(lastPt.x - 1, bobberY + 1, metal.shadow);
        overPixel(lastPt.x - 1, bobberY, metal.highlight); // Barb
    } else {
        // Bobber
        overPixel(lastPt.x, bobberY, '#DC2626'); // Red top
        overPixel(lastPt.x - 1, bobberY + 1, '#DC2626'); overPixel(lastPt.x + 1, bobberY + 1, '#DC2626');
        overPixel(lastPt.x, bobberY + 1, '#F8FAFC'); // White bottom
        overPixel(lastPt.x, bobberY + 2, '#F8FAFC'); 
    }

    // --- 6. OUTLINE PASS ---
    const outlineGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            if (grid[y][x] === null) {
                if ((y > 0 && grid[y - 1][x] !== null && grid[y - 1][x] !== lineColor) || 
                    (y < GRID_SIZE - 1 && grid[y + 1][x] !== null && grid[y + 1][x] !== lineColor) || 
                    (x > 0 && grid[y][x - 1] !== null && grid[y][x - 1] !== lineColor) || 
                    (x < GRID_SIZE - 1 && grid[y][x + 1] !== null && grid[y][x + 1] !== lineColor)) {
                    outlineGrid[y][x] = '#020617'; 
                }
            }
        }
    }

    // --- 7. RENDER ---
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            let colorCode = outlineGrid[y][x] || grid[y][x];
            // Ensure glowing line doesn't get crushed by outline
            if (grid[y][x] === lineColor && lineGlows) colorCode = lineColor; 
            if (colorCode) drawScaledRect(ctx, x, y, 1, 1, colorCode, DISPLAY_SCALE);
        }
    }

    // Naming
    const adjectives =['Sturdy', 'Heavy', 'Flexible', 'Masterwork', 'Cursed', 'Glowing', 'Ancient'];
    const nouns =['Caster', 'Pole', 'Rod', 'Puller', 'Spooler', 'Wand'];
    let finalName = `${poleMat.name} ${rng.pick(nouns)}`;
    if (rng.chance(0.5)) finalName = `${rng.pick(adjectives)} ${finalName}`;
    if (reelType === 'magic_orb') finalName = `Mystic ${finalName}`;

    return {
        name: finalName,
        imageDataUrl: offscreenCanvas.toDataURL(),
        data: { material: poleMatKey, grip: gripStyle, reel: reelType, glowingLine: lineGlows }
    };
}