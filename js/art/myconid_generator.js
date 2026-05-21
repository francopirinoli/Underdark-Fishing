/**
 * js/art/myconid_generator.js
 * Generates highly detailed, organic, and visually distinct Myconid (Mushroom-folk) portraits.
 * V4 - Volumetric 3D shading, realistic bust silhouettes, and beautifully defined details.
 */

import { drawScaledRect } from '../util/utils.js';

const GRID_SIZE = 64;
const DISPLAY_SCALE = 4;
const CANVAS_SIZE = GRID_SIZE * DISPLAY_SCALE;

export function generateMyconid(options = {}) {
    const rng = options.rng;
    const skin = options.skin;   // Stalk (Body/Face)
    const hair = options.hair;   // Mushroom Cap
    const eye = options.eye;     // Spores & Glows
    const cloth = options.cloth; // Moss, Frills, Veils
    const gender = options.gender || 'Female'; // Used for subtle proportion shifts

    // Color Blending Helpers for rich, organic shading transitions
    const hex2rgb = h => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
    const rgb2hex = ([r,g,b]) => `#${(1<<24|(r<<16)|(g<<8)|b).toString(16).slice(1).padStart(6, '0')}`;
    const blend = (c1, c2, t) => rgb2hex(hex2rgb(c1).map((v,i) => Math.round(v + (hex2rgb(c2)[i]-v)*t)));

    // Intermediate Palettes
    const stalkHigh = blend(skin.highlight, '#FFFFFF', 0.2);
    const stalkShadow = blend(skin.shadow, '#000000', 0.3);
    const stalkDark = blend(skin.shadow, '#000000', 0.6);
    
    const capSoftHigh = blend(hair.base, hair.highlight, 0.4);
    const capShadow = blend(hair.shadow, '#000000', 0.4);
    
    const gillColor = blend(hair.shadow, skin.shadow, 0.4);
    const gillDark = blend(gillColor, '#000000', 0.5);

    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = CANVAS_SIZE;
    offscreenCanvas.height = CANVAS_SIZE;
    const ctx = offscreenCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));

    // --- CRASH-PROOF READ/WRITE HELPERS ---
    function overPixel(x, y, hexColor) {
        x = Math.round(x); y = Math.round(y);
        if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) grid[y][x] = hexColor;
    }

    function getPixel(x, y) {
        x = Math.round(x); y = Math.round(y);
        if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) return grid[y][x];
        return null;
    }

    const cx = 32; 
    const eyeY = 32;    
    const mouthY = 40;  
    const frillY = 44;  // Base of the neck
    let capBaseY = rng.int(22, 25); 

    // --- 1. PROCEDURAL PARAMETERS ---
    const capShape = rng.pick(['parasol', 'dome', 'bell']);
    const bodyType = rng.pick(['slender', 'hulking', 'root_bound']);
    const eyeShape = rng.pick(['spore_clusters', 'void_pits', 'alien_slits']);
    const capTexture = rng.pick(['spotted', 'warty', 'glowing_veins', 'shaggy']);
    const frillStyle = rng.pick(['annulus_ring', 'moss_draped', 'clean']);
    const extraFeature = rng.pick(['none', 'sprouting_mushrooms', 'dripping_ooze']); 

    // Proportional modifiers
    let capWidthMod = gender === 'Male' ? 3 : 0;
    let capHeightMod = gender === 'Female' ? 4 : 0;

    if (capShape === 'parasol') { capWidthMod += 6; capHeightMod -= 4; capBaseY -= 2; }
    if (capShape === 'bell') { capWidthMod -= 2; capHeightMod += 6; }
    if (capShape === 'dome') { capWidthMod += 1; capHeightMod += 2; }

    const maxCapW = rng.int(16, 20) + capWidthMod;
    const capTopY = Math.max(2, capBaseY - rng.int(10, 14) - capHeightMod);

    // --- 2. THE BUST SILHOUETTE (STALK) ---
    // Instead of a cylinder, this carves out a neck flaring into solid shoulders
    const stalkW = Array(GRID_SIZE).fill(0);
    const neckWidth = rng.int(6, 7);
    const shoulderWidth = bodyType === 'hulking' ? rng.int(16, 20) : rng.int(12, 15);

    for (let y = capBaseY - 4; y < GRID_SIZE; y++) {
        let w = neckWidth;
        if (y > frillY) {
            // Flare out into shoulders
            const progress = (y - frillY) / (GRID_SIZE - frillY);
            w = neckWidth + (shoulderWidth - neckWidth) * Math.sin(progress * Math.PI / 2);
        } else if (y < eyeY) {
            // Flare slightly under the cap gills
            const progress = (eyeY - y) / (eyeY - (capBaseY - 4));
            w = neckWidth + progress * 2;
        }
        
        // Add organic micro-wobble to make it look biological
        w += Math.sin(y * 0.4) * 0.7;
        stalkW[y] = Math.max(3, Math.round(w));
    }

    // --- 3. RENDER VOLUMETRIC STALK ---
    for (let y = capBaseY - 4; y < GRID_SIZE; y++) {
        let w = stalkW[y];
        for (let x = -w; x <= w; x++) {
            let c = skin.base;
            let nx = x / w; // Normalized x from -1.0 to 1.0

            // Smooth Cylindrical 3D Shading
            if (nx < -0.3) c = skin.highlight;
            if (nx < -0.7) c = stalkHigh;
            if (nx > 0.3) c = skin.shadow;
            if (nx > 0.7) c = stalkShadow;
            if (nx > 0.85) c = stalkDark;

            // Subtle vertical organic fibers
            if (Math.abs(x - Math.round(w * 0.2)) < 1 && y > 28 && y < 54) {
                c = blend(c, stalkShadow, 0.3);
            }

            overPixel(cx + x, y, c);
        }
    }

    // --- 4. RENDER GILLS (UNDER THE CAP) ---
    const gillDrop = capShape === 'parasol' ? 3 : 5;
    for (let y = capBaseY - 2; y <= capBaseY + gillDrop; y++) {
        const progress = (y - (capBaseY - 2)) / (gillDrop + 2);
        const gw = Math.floor(maxCapW * (1.0 - progress * 0.2));

        for (let x = -gw; x <= gw; x++) {
            // Only draw where the gills extend past the neck
            if (Math.abs(x) >= (stalkW[y] || 0) - 1) {
                let c = (Math.abs(x) % 3 === 0) ? gillDark : gillColor;
                if (progress > 0.8 || Math.abs(x) > gw - 2) c = stalkDark;
                overPixel(cx + x, y, c);
            }
        }
    }

    // --- 5. FRILLS & VEILS (CLOTH) ---
    if (frillStyle === 'annulus_ring') {
        // A structured ruffed collar wrapping organically around the neck
        const w = stalkW[frillY];
        for (let dy = 0; dy < 4; dy++) {
            const fy = frillY + dy;
            const fw = w + 3 - dy; 
            for (let x = -fw; x <= fw; x++) {
                let c = cloth.base;
                if (x < -fw + 2) c = cloth.highlight;
                if (x > fw - 2 || dy === 3) c = cloth.shadow;
                if (x % 3 === 0) c = blend(c, cloth.shadow, 0.4); // Ruffled segment lines
                overPixel(cx + x, fy, c);
            }
        }
    } else if (frillStyle === 'moss_draped') {
        // Mossy mycelium draping down the shoulders
        for (let y = frillY; y < GRID_SIZE - 2; y++) {
            const fw = stalkW[y] + 1;
            for (let x = -fw; x <= fw; x++) {
                if (y < frillY + 5 + Math.abs(x) * 1.3) {
                    let c = cloth.base;
                    if (x % 3 === 0) c = cloth.shadow;
                    if (x % 3 === 1 && x < 0) c = cloth.highlight;
                    overPixel(cx + x, y, c);
                }
            }
        }
    }

    // --- 6. RENDER THE CAP ---
    for (let y = capTopY; y <= capBaseY; y++) {
        let w = 0;
        let p = (y - capTopY) / (capBaseY - capTopY || 1); // 0.0 to 1.0
        
        if (capShape === 'parasol') w = maxCapW * Math.sin(p * Math.PI / 1.8);
        else if (capShape === 'bell') w = maxCapW * Math.pow(p, 1.3);
        else /* dome */ w = maxCapW * Math.sqrt(1 - Math.pow(1 - p, 2));

        w = Math.max(1, Math.round(w));

        for (let x = -w; x <= w; x++) {
            let nx = x / w;
            let c = hair.base;

            // Spherical Dome Shading
            if (nx < -0.3) c = capSoftHigh;
            if (nx < -0.7) c = hair.highlight;
            if (nx > 0.3) c = hair.shadow;
            if (nx > 0.8 || p > 0.85) c = capShadow;

            // Clean specular highlight on top-left
            if (nx < -0.2 && nx > -0.5 && p < 0.4 && p > 0.1) {
                c = hair.highlight;
            }

            // Shaggy fibers
            if (capTexture === 'shaggy') {
                if ((x + y * 2) % 6 === 0) c = capShadow;
                if ((x + y * 2 + 1) % 6 === 0) c = hair.highlight;
            }

            overPixel(cx + x, y, c);
        }
    }

    // --- 7. CAP DECORATIONS (Warts, Spots, Veins) ---
    if (capTexture === 'warty' || capTexture === 'spotted') {
        const numSpots = rng.int(10, 18);
        for (let i = 0; i < numSpots; i++) {
            const sx = rng.int(-maxCapW + 3, maxCapW - 3);
            const sy = rng.int(capTopY + 3, capBaseY - 3);
            
            const currentC = getPixel(cx + sx, sy);
            if (currentC && currentC !== stalkDark && currentC !== gillColor && currentC !== gillDark) {
                const sColor = capTexture === 'spotted' ? cloth.highlight : skin.base;
                const sShad = capTexture === 'spotted' ? cloth.base : skin.shadow;
                
                // 3D Circular Wart generation (highlight on top-left, shadow on bottom-right)
                const size = rng.int(1, 2); 
                for (let dy = -1; dy <= size - 1; dy++) {
                    for (let dx = -1; dx <= size - 1; dx++) {
                        const px = cx + sx + dx;
                        const py = sy + dy;
                        if (dx === -1 && dy === -1) overPixel(px, py, capTexture === 'warty' ? skin.highlight : cloth.highlight);
                        else if (dx === size - 1 || dy === size - 1) overPixel(px, py, sShad);
                        else overPixel(px, py, sColor);
                    }
                }
            }
        }
    } else if (capTexture === 'glowing_veins') {
        for (let y = capTopY + 2; y < capBaseY; y++) {
            for (let x = -maxCapW; x <= maxCapW; x++) {
                const currentC = getPixel(cx + x, y);
                if (currentC && currentC !== stalkDark && currentC !== gillColor) {
                    // Sinuous glowing lines branching out
                    if (Math.sin(x * 0.4 + y * 0.8) > 0.85) {
                        overPixel(cx + x, y, eye.color);
                    }
                }
            }
        }
    }

    // --- 8. FACIAL FEATURES ---
    if (eyeShape === 'spore_clusters') {
        for (let side of [-1, 1]) {
            const ex = cx + side * 4;
            const ey = eyeY;
            // Clean, clustered spores
            overPixel(ex, ey, eye.color);
            overPixel(ex - 1, ey + 1, eye.color);
            overPixel(ex + 1, ey - 1, '#FFFFFF');
            overPixel(ex + (side * 2), ey + 1, eye.color);
        }
    } else if (eyeShape === 'void_pits') {
        for (let side of [-1, 1]) {
            const ex = cx + side * 4;
            const ey = eyeY;
            // 3x3 dark recess
            for (let dy = -1; dy <= 1; dy++) {
                for (let dx = -1; dx <= 1; dx++) {
                    if (Math.abs(dx) + Math.abs(dy) <= 2) {
                        overPixel(ex + dx, ey + dy, '#020617');
                    }
                }
            }
            // Glowing pupil
            overPixel(ex, ey, eye.color);
            overPixel(ex - 1, ey - 1, '#FFFFFF'); // Soft edge glint
        }
    } else if (eyeShape === 'alien_slits') {
        for (let side of [-1, 1]) {
            const ex = cx + side * 4;
            const ey = eyeY;
            overPixel(ex, ey - 1, eye.color);
            overPixel(ex + side, ey, '#FFFFFF'); 
            overPixel(ex + side * 2, ey + 1, eye.color);
        }
    }

    // Mouth / Spore Vent
    if (rng.chance(0.5) && eyeShape !== 'blind') {
        overPixel(cx, mouthY - 1, stalkDark);
        overPixel(cx, mouthY, '#000000');
        overPixel(cx, mouthY + 1, '#000000');
        overPixel(cx, mouthY + 2, eye.color); // Glowing spore leak
        overPixel(cx, mouthY + 3, stalkDark);
    }

    // --- 9. EXTRA FEATURES & AMBIENCE ---
    if (extraFeature === 'sprouting_mushrooms') {
        for (let side of [-1, 1]) {
            if (rng.chance(0.6)) {
                const mx = cx + side * rng.int(8, 11);
                const my = rng.int(52, 56);
                // Tiny stalk
                overPixel(mx, my, skin.highlight);
                overPixel(mx, my - 1, skin.base);
                overPixel(mx, my - 2, skin.shadow);
                // Mini Cap
                for (let dx = -2; dx <= 2; dx++) overPixel(mx + dx, my - 3, hair.base);
                overPixel(mx - 1, my - 4, hair.highlight); overPixel(mx, my - 4, hair.base); overPixel(mx + 1, my - 4, hair.shadow);
            }
        }
    } else if (extraFeature === 'dripping_ooze') {
        const oozeColor = eye.color;
        for (let x = -maxCapW + 2; x <= maxCapW - 2; x++) {
            if (rng.chance(0.15)) {
                const drop = rng.int(2, 5);
                for (let dy = 0; dy < drop; dy++) {
                    overPixel(cx + x, capBaseY + dy, oozeColor);
                }
                overPixel(cx + x, capBaseY + drop, '#FFFFFF'); // Drip highlights
            }
        }
    }

    // Ambient floating spores (Adds magic to the portrait frame)
    for (let i = 0; i < 15; i++) {
        const sx = rng.int(4, GRID_SIZE - 4);
        const sy = rng.int(4, GRID_SIZE - 4);
        if (!getPixel(sx, sy)) {
            overPixel(sx, sy, eye.color);
            if (rng.chance(0.3)) {
                overPixel(sx - 1, sy, blend(eye.color, '#000000', 0.5));
                overPixel(sx + 1, sy, blend(eye.color, '#000000', 0.5));
            }
        }
    }

    // --- 10. OUTLINE PASS ---
    const outlineGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            const current = getPixel(x, y);
            if (current === null) {
                const n = getPixel(x, y - 1);
                const s = getPixel(x, y + 1);
                const w = getPixel(x - 1, y);
                const e = getPixel(x + 1, y);
                
                if ((n !== null && n !== eye.color && n !== '#FFFFFF') ||
                    (s !== null && s !== eye.color && s !== '#FFFFFF') ||
                    (w !== null && w !== eye.color && w !== '#FFFFFF') ||
                    (e !== null && e !== eye.color && e !== '#FFFFFF')) {
                    outlineGrid[y][x] = '#020617';
                }
            }
        }
    }

    // --- 11. RENDER ---
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            let colorCode = grid[y][x] || outlineGrid[y][x];
            if (grid[y][x] === eye.color || grid[y][x] === '#FFFFFF') colorCode = grid[y][x];
            
            if (colorCode) drawScaledRect(ctx, x, y, 1, 1, colorCode, DISPLAY_SCALE);
        }
    }

    return {
        imageDataUrl: offscreenCanvas.toDataURL(),
        data: { capShape, bodyType, eyeShape, capTexture, frillStyle, extraFeature }
    };
}