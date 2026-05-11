/**
 * js/art/elf_male.js
 * Generates highly varied Elf Male portraits.
 * V5 - Complete Overhaul: Removed all noisy dithering, implemented elegant
 * squircle skull math, sculpted cheekbones, refined tattoos, and sweeping hair.
 */

import { drawScaledRect } from '../util/utils.js';

const GRID_SIZE = 64;
const DISPLAY_SCALE = 4;
const CANVAS_SIZE = GRID_SIZE * DISPLAY_SCALE;

export function generateElfMale(options = {}) {
    const rng = options.rng;
    const skin = options.skin;
    const hair = options.hair;
    const eye = options.eye;
    const cloth = options.cloth;

    // Color Blending Helpers for ethereal, soft shading
    const hex2rgb = h =>[parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
    const rgb2hex = ([r,g,b]) => `#${(1<<24|(r<<16)|(g<<8)|b).toString(16).slice(1).padStart(6, '0')}`;
    const blend = (c1, c2, t) => rgb2hex(hex2rgb(c1).map((v,i) => Math.round(v + (hex2rgb(c2)[i]-v)*t)));
    
    const hairSoftHigh = blend(hair.base, hair.highlight, 0.4);
    const lipDark = blend(skin.shadow, '#7F1D1D', 0.2); // Subtle, natural lip
    const lipLight = skin.base;

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

    const cx = 32; 
    const headTopY = 12; 
    const eyeY = 28; 
    const noseY = 38;    
    const mouthY = 44;
    const chinY = 50; // Elegant long face

    // --- 1. PROCEDURAL PARAMETERS ---
    const jawShape = rng.pick(['angular', 'slender', 'soft_pointed', 'high_cheekbones']);
    const noseShape = rng.pick(['straight', 'aquiline', 'fine']);
    const mouthShape = rng.pick(['neutral', 'smirk', 'frown', 'thin']);
    const eyeShape = rng.pick(['almond', 'sharp', 'upturned', 'deep_set']);
    
    // Ear Varieties
    const earStyle = rng.pick(['high_elf', 'horizontal', 'swept_back', 'leaf_shaped']);
    const earLength = rng.int(5, 9);
    
    const hairStyle = rng.pick(['long_straight', 'flowing', 'half_up', 'braided', 'slick_back', 'short_elegant']);
    const bangStyle = rng.pick(['swept', 'parted', 'none']); 
    
    const clothStyle = rng.pick(['leather_armor', 'noble', 'tunic', 'cowl']);
    const feature = rng.pick(['none', 'none', 'earrings', 'scar', 'sylvan_tattoos', 'eyepatch']); 

    // --- 2. FACIAL CONTOUR MAP ---
    const faceW = Array(GRID_SIZE).fill(0);
    const maxW = rng.pick([8, 9]); // Aristocratic, slender skull

    for (let y = headTopY; y <= chinY; y++) {
        let w = 0;
        if (y <= eyeY) {
            const dy = (eyeY - y) / (eyeY - headTopY); 
            w = maxW * Math.pow(1 - Math.pow(dy, 2), 0.5); // Smooth squircle dome
        } else {
            const dy = (y - eyeY) / (chinY - eyeY); 
            if (jawShape === 'angular') w = maxW - 4.0 * dy; // Straight taper
            else if (jawShape === 'slender') w = maxW * Math.sqrt(1 - dy * dy * 0.9); // Smooth curve
            else if (jawShape === 'soft_pointed') w = maxW - 4.5 * Math.pow(dy, 1.2); // Pointy
            else if (jawShape === 'high_cheekbones') w = maxW - (dy < 0.4 ? dy * 1.5 : 1.5 + (dy - 0.4) * 5); // Sharp indent
        }
        faceW[y] = Math.max(2, Math.round(w)); 
    }

    // --- 3. BACKGROUND HAIR (Behind neck/ears) ---
    if (['long_straight', 'flowing', 'half_up', 'braided'].includes(hairStyle)) {
        for (let y = eyeY; y < GRID_SIZE; y++) {
            let spread = maxW + 2;
            if (hairStyle === 'flowing') spread += (y - eyeY) * 0.2;
            if (hairStyle === 'braided') spread = maxW + 1;
            spread = Math.floor(spread);
            
            for (let x = -spread; x <= spread; x++) {
                if (Math.abs(x) > 3) setPixel(cx + x, y, hair.shadow); // Solid backdrop, no noise
            }
        }
    }

    // --- 4. SLENDER NECK & SHOULDERS ---
    const neckW = 3; 
    for (let y = chinY - 3; y <= chinY + 5; y++) {
        for (let x = -neckW; x <= neckW; x++) {
            let c = skin.shadow;
            if (x < -neckW + 1) c = skin.base; 
            overPixel(cx + x, y, c);
        }
    }
    overPixel(cx, chinY + 3, skin.base); // Subtle Adam's Apple

    for (let y = chinY + 4; y < GRID_SIZE; y++) {
        const shoulderWidth = 8 + (y - (chinY + 4)) * 1.5; 
        for (let x = -Math.floor(shoulderWidth); x <= Math.floor(shoulderWidth); x++) {
            let c = cloth.base;
            if (x > shoulderWidth * 0.4) c = cloth.shadow;
            if (x < -shoulderWidth * 0.4) c = cloth.highlight;
            
            const isCenter = Math.abs(x) <= neckW + 1;
            
            if (clothStyle === 'tunic' && isCenter && y < chinY + 7) continue;
            if (clothStyle === 'cowl' && Math.abs(x) < 7 && y < chinY + 8) c = cloth.highlight; 
            
            if (clothStyle === 'leather_armor') {
                if ((x - y) % 5 === 0) c = cloth.shadow; // Clean diagonal stitching
            }
            if (clothStyle === 'noble') {
                if (isCenter && y < chinY + 11) c = '#FBBF24'; // Ascot / Gold Trim
                if (Math.abs(x) === neckW + 2 && y > chinY + 6) c = '#FBBF24'; 
            }
            
            overPixel(cx + x, y, c);
        }
    }

    // --- 5. THE FACE ---
    for (let y = headTopY; y <= chinY; y++) {
        const w = faceW[y];
        for (let x = -w; x <= w; x++) {
            let c = skin.base;
            if (x > w - 1) c = skin.shadow;         
            if (x < -w + 1 && y < noseY) c = skin.highlight; 
            if (y > chinY - 1) c = skin.shadow;     
            
            // Sculpted cheekbones
            if (y > noseY && y < mouthY && Math.abs(x) >= w - 2) {
                if (jawShape === 'high_cheekbones' || (x+y)%2===0) c = skin.shadow; 
            }
            
            overPixel(cx + x, y, c);
        }
    }

    // --- 6. THE DIVERSE ELVEN EARS ---
    for (let side of [-1, 1]) {
        let earBaseY = eyeY;
        let earBaseX = faceW[earBaseY];
        
        for (let e = 1; e <= earLength; e++) {
            let ex = cx + side * (earBaseX + e);
            let ey = earBaseY;

            // Ear Math based on Style
            if (earStyle === 'high_elf') ey -= Math.floor(e * 0.8);
            else if (earStyle === 'swept_back') ey -= Math.floor(e * 0.4);
            else if (earStyle === 'horizontal') ey -= Math.floor(e * 0.1);
            else if (earStyle === 'leaf_shaped') ey -= Math.floor(Math.sin((e/earLength)*Math.PI) * 2.5);

            overPixel(ex, ey, skin.highlight);
            overPixel(ex, ey + 1, skin.base);
            overPixel(ex, ey + 2, skin.shadow);
            
            // Leaf shapes are thicker in the middle
            if (earStyle === 'leaf_shaped' && e > 2 && e < earLength - 1) {
                overPixel(ex, ey + 3, skin.shadow);
            }
            
            // Taper tip
            if (e === earLength) {
                overPixel(ex, ey + 1, skin.shadow);
                overPixel(ex, ey + 2, null); 
            }

            // Earrings
            if (feature === 'earrings' && e === Math.floor(earLength/2)) {
                overPixel(ex, ey + 3, '#FBBF24');
                overPixel(ex, ey + 4, '#22D3EE');
            }
        }
    }

    // --- 7. FACIAL FEATURES ---
    
    for (let side of[-1, 1]) {
        const ex = cx + (side * 3); // Narrowly set eyes for slender face
        
        // Brows
        let browY = eyeY - 2;
        overPixel(ex - side, browY, hair.base); 
        overPixel(ex, browY - 1, hair.base); // High arch
        overPixel(ex + side, browY, hair.base);
        overPixel(ex + side*2, browY + 1, hair.base); 
        
        // Eyepatch overrides the eye rendering entirely
        if (feature === 'eyepatch' && side === 1) {
            // Clean strap
            for(let dx = -faceW[eyeY]; dx <= faceW[eyeY]; dx++) {
                if (dx > 0) overPixel(cx + dx, eyeY - 1, '#111827');
            }
            // Clean patch shape
            for(let dy = -1; dy <= 2; dy++) {
                for(let dx = 1; dx <= 5; dx++) {
                    if (Math.abs(dx - 3) + Math.abs(dy - 0.5) <= 2.5) overPixel(cx + dx, eyeY + dy, '#111827');
                }
            }
        } else {
            // Eye Whites & Eyeliner
            overPixel(ex - 1, eyeY, '#F8FAFC'); 
            overPixel(ex + 1, eyeY, '#F8FAFC');
            overPixel(ex, eyeY, eye.color);
            
            overPixel(ex - 1, eyeY - 1, '#020617');
            overPixel(ex, eyeY - 1, '#020617');
            overPixel(ex + 1, eyeY - 1, '#020617');
            
            // Eye Shaping
            overPixel(ex + side * 2, eyeY - 2, '#020617'); // Winged tip
            
            if (eyeShape === 'upturned') {
                overPixel(ex - side, eyeY + 1, '#F8FAFC'); 
                overPixel(ex + side, eyeY - 1, '#F8FAFC');
            } else if (eyeShape === 'sharp') {
                overPixel(ex - 1, eyeY + 1, skin.shadow); 
            } else if (eyeShape === 'deep_set') {
                overPixel(ex - 1, eyeY - 1, skin.shadow); 
                overPixel(ex + 1, eyeY - 1, skin.shadow);
            }
        }
    }

    // Refined Nose
    for (let y = eyeY + 2; y < noseY; y++) {
        overPixel(cx, y, skin.highlight); 
        if (noseShape === 'aquiline' && y > eyeY + 3 && y < noseY - 2) overPixel(cx + 1, y, skin.shadow);
    }
    
    if (noseShape === 'aquiline') {
        overPixel(cx, noseY, skin.highlight); 
        overPixel(cx + 1, noseY, skin.shadow); overPixel(cx + 1, noseY - 1, skin.shadow);
        overPixel(cx - 1, noseY + 1, skin.shadow); overPixel(cx + 1, noseY + 1, skin.shadow);
    } else if (noseShape === 'fine') {
        overPixel(cx, noseY, skin.highlight);
        overPixel(cx, noseY + 1, skin.shadow); 
    } else {
        // Straight
        overPixel(cx, noseY, skin.highlight); overPixel(cx + 1, noseY, skin.shadow);
        overPixel(cx - 1, noseY + 1, skin.shadow); overPixel(cx + 1, noseY + 1, skin.shadow);
    }

    // Mouth
    const mw = mouthShape === 'thin' ? 1 : 2;
    for (let x = -mw; x <= mw; x++) overPixel(cx + x, mouthY, lipDark);
    
    if (mouthShape === 'smirk') {
        overPixel(cx + mw, mouthY - 1, lipDark); 
    } else if (mouthShape === 'frown') {
        overPixel(cx - mw, mouthY + 1, lipDark); overPixel(cx + mw, mouthY + 1, lipDark);
    }
    overPixel(cx, mouthY + 1, lipLight); 
    overPixel(cx, mouthY + 2, skin.highlight);

    // --- 8. FOREGROUND HAIR ---
    const hairLineY = headTopY + 3; 
    
    if (hairStyle !== 'bald') {
        for (let y = headTopY - 5; y <= chinY + 8; y++) {
            // FIX: Lock width below chin to prevent beard collapse
            let skullW = (y <= chinY) ? (faceW[y] || 0) : (faceW[chinY] || 0);
            if (y < headTopY) {
                const dy = (headTopY - y) / 5.0; 
                if (dy >= 1) skullW = 0;
                else skullW = (faceW[headTopY] + 1) * Math.pow(1 - dy * dy, 0.5); 
            }
            if (skullW < 0) skullW = 0;
            
            for (let x = -skullW - 4; x <= skullW + 4; x++) {
                let draw = false;

                if (y < hairLineY && Math.abs(x) <= skullW + 1) draw = true;

                if (hairStyle === 'short_elegant') {
                    if (y >= hairLineY && y < chinY - 2 && Math.abs(x) >= skullW - 1 && Math.abs(x) <= skullW + 2) draw = true;
                } else if (hairStyle === 'slick_back') {
                    if (y < headTopY && Math.abs(x) <= skullW) draw = true;
                } else if (hairStyle === 'flowing') {
                    if (y >= hairLineY && y < chinY + 4 && Math.abs(x) >= skullW - 1 && Math.abs(x) <= skullW + 3) draw = true;
                } else if (hairStyle === 'half_up') {
                    // Organic rounded bun
                    if (y >= headTopY - 5 && y < headTopY && Math.abs(x) <= 3) {
                        if (Math.hypot(x, y - (headTopY - 2)) < 3.5) draw = true; 
                    }
                    if (y >= eyeY && y < chinY + 6 && Math.abs(x) >= skullW && Math.abs(x) <= skullW + 2) draw = true;
                } else if (hairStyle === 'braided') {
                    if (y >= eyeY && y < GRID_SIZE - 2 && Math.abs(x) >= skullW && Math.abs(x) <= skullW + 2) draw = true;
                }

                // BANGS
                if (y >= hairLineY && y < eyeY) {
                    if (bangStyle === 'swept' && x > -skullW && x < skullW && y < eyeY - 1 + (x * 0.3)) draw = true;
                    if (bangStyle === 'parted' && Math.abs(x) <= skullW && Math.abs(x) > 1 + (y - hairLineY)*0.6) draw = true;
                }

                // Protect Face & Ears
                if (y >= hairLineY && Math.abs(x) < skullW - 1) {
                    let isBangs = false;
                    if (y < eyeY) {
                        if (bangStyle === 'swept' && y < eyeY - 1 + (x * 0.3)) isBangs = true;
                        if (bangStyle === 'parted' && Math.abs(x) > 1 + (y - hairLineY)*0.6) isBangs = true;
                    }
                    if (!isBangs) draw = false;
                }
                
                // Never overwrite the ears
                if (y >= eyeY && y <= noseY && Math.abs(x) > skullW) draw = false;

                if (draw) {
                    let c = hair.base;
                    if (hairStyle === 'braided') {
                        if ((x+y)%3 === 0) c = hair.shadow; // Clean braid texture
                    } else {
                        // Smooth structured highlight swoops
                        if (y > headTopY - 3 && x < 0 && x % 3 === 0) c = hairSoftHigh; 
                    }
                    if (x > skullW + 1) c = hair.shadow; 
                    
                    overPixel(cx + x, y, c);
                }
            }
        }
    }

    // --- 9. DETAILS ---
    if (feature === 'scar') {
        overPixel(cx + 2, eyeY + 2, '#7F1D1D'); overPixel(cx + 3, eyeY + 1, '#7F1D1D');
    }
    
    // Elegant sweeping tattoos
    if (feature === 'sylvan_tattoos') {
        const inkColor = blend(skin.base, '#059669', 0.6); 
        for (let side of [-1, 1]) {
            // Sweeping line across the cheekbone
            overPixel(cx + side*2, eyeY + 2, inkColor); 
            overPixel(cx + side*3, eyeY + 2, inkColor);
            overPixel(cx + side*4, eyeY + 1, inkColor);
        }
        // Forehead crest
        overPixel(cx, headTopY + 4, inkColor);
        overPixel(cx, headTopY + 5, inkColor);
        overPixel(cx - 1, headTopY + 4, inkColor);
        overPixel(cx + 1, headTopY + 4, inkColor);
    }

    // --- 10. OUTLINE PASS ---
    const outlineGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            if (grid[y][x] === null) {
                if ((y > 0 && grid[y - 1][x] !== null && grid[y - 1][x] !== '#111827') || 
                    (y < GRID_SIZE - 1 && grid[y + 1][x] !== null && grid[y + 1][x] !== '#111827') || 
                    (x > 0 && grid[y][x - 1] !== null && grid[y][x - 1] !== '#111827') || 
                    (x < GRID_SIZE - 1 && grid[y][x + 1] !== null && grid[y][x + 1] !== '#111827')) {
                    outlineGrid[y][x] = '#020617'; 
                }
            }
        }
    }

    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            let colorCode = grid[y][x] || outlineGrid[y][x];
            if (grid[y][x] === '#111827') colorCode = grid[y][x]; // Eyepatch overrides outline
            if (colorCode) drawScaledRect(ctx, x, y, 1, 1, colorCode, DISPLAY_SCALE);
        }
    }

    return {
        imageDataUrl: offscreenCanvas.toDataURL(),
        data: { jawShape, noseShape, eyeShape, hairStyle, earStyle, bangStyle, clothStyle, feature }
    };
}