/**
 * js/art/elf_female.js
 * Generates highly varied Elf Female portraits.
 * V5 - Complete Overhaul: Fixed hair collapse (beard bug), removed dithering, 
 * implemented organic squircle skull math, sculpted cheekbones, and sweeping tattoos.
 */

import { drawScaledRect } from '../util/utils.js';

const GRID_SIZE = 64;
const DISPLAY_SCALE = 4;
const CANVAS_SIZE = GRID_SIZE * DISPLAY_SCALE;

export function generateElfFemale(options = {}) {
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
    const lipDark = blend(skin.shadow, '#7F1D1D', 0.25); // Subtle, natural dark lip
    const lipLight = blend(skin.base, '#BE123C', 0.15); // Soft rosy tint for the bottom lip

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
    const chinY = 51; // Elegant long face

    // --- 1. PROCEDURAL PARAMETERS ---
    const jawShape = rng.pick(['v_shape', 'pointed', 'diamond', 'narrow_oval']);
    const noseShape = rng.pick(['delicate', 'straight', 'aquiline', 'button']);
    const mouthShape = rng.pick(['neutral', 'full', 'smile', 'pout']);
    const eyeShape = rng.pick(['almond', 'doe', 'upturned', 'sharp_winged']);
    
    // Ear Varieties
    const earStyle = rng.pick(['high_elf', 'horizontal', 'swept_back', 'leaf_shaped']);
    const earLength = rng.int(5, 8);
    
    const hairStyle = rng.pick(['long_straight', 'wavy', 'half_up', 'elegant_braid', 'pixie', 'high_bun']);
    const bangStyle = rng.pick(['swept', 'parted', 'fringe', 'none']); 
    
    const clothStyle = rng.pick(['elegant_gown', 'leather_armor', 'tunic', 'cowl', 'high_collar']);
    const feature = rng.pick(['none', 'none', 'earrings', 'freckles', 'scar', 'sylvan_tattoos']); 

    const lashColor = '#020617'; 

    // --- 2. FACIAL CONTOUR MAP ---
    const faceW = Array(GRID_SIZE).fill(0);
    const maxW = rng.pick([8, 9]); // Slender, elegant faces

    for (let y = headTopY; y <= chinY; y++) {
        let w = 0;
        if (y <= eyeY) {
            const dy = (eyeY - y) / (eyeY - headTopY); 
            w = maxW * Math.pow(1 - Math.pow(dy, 2), 0.5); // Smooth organic dome
        } else {
            const dy = (y - eyeY) / (chinY - eyeY); 
            if (jawShape === 'v_shape') w = maxW - (maxW - 3) * Math.pow(dy, 1.3);
            else if (jawShape === 'pointed') w = maxW - (maxW - 2) * Math.pow(dy, 1.1); 
            else if (jawShape === 'diamond') w = maxW + (dy < 0.35 ? dy * 1.2 : -(dy - 0.35) * 4); 
            else if (jawShape === 'narrow_oval') w = maxW * Math.sqrt(1 - dy * dy * 0.95);
        }
        faceW[y] = Math.max(2, Math.round(w)); // Pointy chins taper smoothly
    }

    // --- 3. BACKGROUND HAIR ---
    if (['long_straight', 'wavy', 'half_up', 'elegant_braid'].includes(hairStyle)) {
        for (let y = eyeY; y < GRID_SIZE; y++) {
            let spread = maxW + 2;
            if (hairStyle === 'long_straight') spread += (y - eyeY) * 0.15;
            if (hairStyle === 'wavy') spread += Math.sin(y * 0.4) * 2 + (y - eyeY) * 0.2;
            if (hairStyle === 'elegant_braid') spread = maxW + 1; // Kept tight
            
            spread = Math.floor(spread);
            for (let x = -spread; x <= spread; x++) {
                if (Math.abs(x) > 3) setPixel(cx + x, y, hair.shadow); // Solid shadow backdrop
            }
        }
    }

    // --- 4. SLENDER NECK & SHOULDERS ---
    const neckW = faceW[chinY] >= 3 ? 3 : 2; // Very slender, graceful neck
    for (let y = chinY - 3; y <= chinY + 5; y++) {
        for (let x = -neckW; x <= neckW; x++) {
            let c = skin.shadow;
            if (x < -neckW + 1) c = skin.base; 
            overPixel(cx + x, y, c);
        }
    }

    for (let y = chinY + 4; y < GRID_SIZE; y++) {
        const shoulderWidth = 6 + (y - (chinY + 4)) * 1.4; // Graceful, sloping shoulders
        for (let x = -Math.floor(shoulderWidth); x <= Math.floor(shoulderWidth); x++) {
            let c = cloth.base;
            if (x > shoulderWidth * 0.4) c = cloth.shadow;
            if (x < -shoulderWidth * 0.4) c = cloth.highlight;
            
            const isCenter = Math.abs(x) <= neckW + 1;
            
            if (clothStyle === 'tunic' && isCenter && y < chinY + 7) continue;
            if (clothStyle === 'elegant_gown' && isCenter && y < chinY + 9) continue; // Deep scoop neck
            if (clothStyle === 'high_collar' && isCenter && y < chinY + 7) c = cloth.highlight;
            if (clothStyle === 'cowl' && Math.abs(x) < 7 && y < chinY + 8) c = cloth.highlight; 
            
            if (clothStyle === 'leather_armor' && (x - y) % 5 === 0) c = cloth.shadow; 
            if (clothStyle === 'elegant_gown' && Math.abs(x) > 5 && Math.abs(x) < 8 && y < chinY + 11) c = '#FBBF24'; // Gold accents
            
            overPixel(cx + x, y, c);
        }
    }

    // --- 5. THE ELEGANT POINTED EARS ---
    const earRise = rng.float(0.3, 0.6); 
    
    for (let side of[-1, 1]) {
        let earBaseY = eyeY + 1;
        let earBaseX = faceW[earBaseY];
        
        for (let e = 1; e <= earLength; e++) {
            let ex = cx + side * (earBaseX + e);
            let ey = Math.floor(earBaseY - e * earRise);

            if (earStyle === 'high_elf') ey -= Math.floor(e * 0.7);
            else if (earStyle === 'swept_back') ey -= Math.floor(e * 0.3);
            else if (earStyle === 'horizontal') ey -= Math.floor(e * 0.05);
            else if (earStyle === 'leaf_shaped') ey -= Math.floor(Math.sin((e/earLength)*Math.PI) * 2.5);

            overPixel(ex, ey, skin.highlight);
            overPixel(ex, ey + 1, skin.base);
            overPixel(ex, ey + 2, skin.shadow);
            
            if (earStyle === 'leaf_shaped' && e > 2 && e < earLength - 1) overPixel(ex, ey + 3, skin.shadow);
            
            if (e === earLength) {
                overPixel(ex, ey + 1, skin.shadow);
                overPixel(ex, ey + 2, null); 
            }

            if (feature === 'earrings' && e === Math.floor(earLength/2)) {
                overPixel(ex, ey + 3, '#FBBF24');
                if (rng.chance(0.5)) overPixel(ex, ey + 4, '#22D3EE'); // Gemstone
            }
        }
    }

    // --- 6. THE FACE ---
    for (let y = headTopY; y <= chinY; y++) {
        const w = faceW[y];
        for (let x = -w; x <= w; x++) {
            let c = skin.base;
            if (x > w - 1) c = skin.shadow;         
            if (x < -w + 1 && y < noseY) c = skin.highlight; 
            if (y > chinY - 1) c = skin.shadow;     
            
            // Elegant cheekbone blush/contour
            if (y > noseY && y < mouthY && Math.abs(x) >= w - 2) {
                if ((x+y) % 2 === 0) c = skin.shadow; 
            }
            
            overPixel(cx + x, y, c);
        }
    }

    // --- 7. FACIAL FEATURES ---
    
    // Slanted / Feminine Eyes
    for (let side of [-1, 1]) {
        const ex = cx + (side * 3); // Close set on slender face
        
        // Brows (Sharply arched and elegant)
        let browY = eyeY - 3;
        overPixel(ex - side, browY + 1, hair.base); 
        overPixel(ex, browY, hair.base); // Arch
        overPixel(ex + side, browY, hair.base);
        overPixel(ex + side*2, browY + 1, hair.base); 
        
        // Eyeliner (Top)
        overPixel(ex - 1, eyeY - 1, lashColor);
        overPixel(ex, eyeY - 1, lashColor);
        overPixel(ex + 1, eyeY - 1, lashColor);
        
        // Sweeping Lashes 
        overPixel(ex + side * 2, eyeY - 1, lashColor);
        if (eyeShape === 'almond' || eyeShape === 'sharp_winged') {
            overPixel(ex + side * 3, eyeY - 2, lashColor); // Long dramatic wing
        } else if (eyeShape === 'upturned') {
            overPixel(ex + side * 2, eyeY - 2, lashColor); 
        }

        // Whites & Pupil
        if (eyeShape === 'doe') {
            overPixel(ex - 1, eyeY, '#F8FAFC'); overPixel(ex + 1, eyeY, '#F8FAFC');
            overPixel(ex - 1, eyeY + 1, '#F8FAFC'); overPixel(ex + 1, eyeY + 1, '#F8FAFC');
            overPixel(ex, eyeY, eye.color); overPixel(ex, eyeY + 1, eye.color);
        } else if (eyeShape === 'upturned') {
            overPixel(ex - side, eyeY + 1, '#F8FAFC'); 
            overPixel(ex, eyeY, eye.color);
            overPixel(ex + side, eyeY - 1, '#F8FAFC');
        } else if (eyeShape === 'sharp_winged') {
            overPixel(ex - 1, eyeY, '#F8FAFC'); overPixel(ex + 1, eyeY, '#F8FAFC');
            overPixel(ex, eyeY, eye.color);
            overPixel(ex - 1, eyeY + 1, skin.shadow); // Sharp undereye
        } else {
            // Almond
            overPixel(ex - 1, eyeY, '#F8FAFC'); overPixel(ex + 1, eyeY, '#F8FAFC');
            overPixel(ex, eyeY, eye.color);
        }
    }

    // Delicate Nose
    for (let y = eyeY + 1; y < noseY; y++) {
        overPixel(cx, y, skin.highlight); 
        if (noseShape === 'aquiline' && y > eyeY + 3 && y < noseY - 2) overPixel(cx + 1, y, skin.shadow);
        if (noseShape === 'straight') overPixel(cx + 1, y, skin.shadow);
    }
    
    if (noseShape === 'button') {
        overPixel(cx, noseY, skin.highlight); 
        overPixel(cx - 1, noseY + 1, skin.shadow); overPixel(cx + 1, noseY + 1, skin.shadow);
    } else if (noseShape === 'aquiline') {
        overPixel(cx, noseY, skin.highlight); 
        overPixel(cx + 1, noseY, skin.shadow); overPixel(cx + 1, noseY - 1, skin.shadow);
        overPixel(cx - 1, noseY + 1, skin.shadow); overPixel(cx + 1, noseY + 1, skin.shadow);
    } else {
        // Delicate / Straight
        overPixel(cx, noseY, skin.highlight); 
        overPixel(cx, noseY + 1, skin.shadow); 
    }

    // Mouth (Two-tone plump lips, narrow width)
    const mw = mouthShape === 'full' ? 3 : (mouthShape === 'thin' ? 1 : 2);
    
    for (let x = -mw + 1; x <= mw - 1; x++) overPixel(cx + x, mouthY, lipDark);
    for (let x = -mw; x <= mw; x++) overPixel(cx + x, mouthY + 1, lipLight);
    
    if (mouthShape === 'smile') {
        overPixel(cx - mw - 1, mouthY, lipDark); overPixel(cx + mw + 1, mouthY, lipDark);
    } else if (mouthShape === 'pout') {
        overPixel(cx, mouthY - 1, lipDark); 
        overPixel(cx, mouthY + 2, lipLight); 
    }
    
    if (mouthShape !== 'thin') overPixel(cx - 1, mouthY + 1, '#F8FAFC'); // Lip gloss
    overPixel(cx, mouthY + 3, skin.highlight); // Chin highlight

    // --- 8. FOREGROUND HAIR ---
    const hairLineY = headTopY + 3; 
    
    for (let y = headTopY - 7; y <= chinY + 10; y++) {
        // FIX: The neck collapse bug!
        let skullW = (y <= chinY) ? (faceW[y] || 0) : (faceW[chinY] || 0);
        if (y < headTopY) {
            const dy = (headTopY - y) / 6.0; 
            if (dy >= 1) skullW = 0;
            else skullW = (faceW[headTopY] + 1) * Math.pow(1 - dy * dy, 0.5); 
        }
        if (skullW < 0) skullW = 0;
        
        for (let x = -skullW - 5; x <= skullW + 5; x++) {
            let draw = false;
            let isBraid = false;

            if (y < eyeY && Math.abs(x) <= skullW + 1) draw = true;

            if (hairStyle === 'pixie') {
                if (y >= hairLineY && y < noseY && Math.abs(x) >= skullW - 1 && Math.abs(x) <= skullW + 2) draw = true;
            } 
            else if (hairStyle === 'long_straight') {
                if (y >= hairLineY && y < chinY + 8 && Math.abs(x) >= skullW - 1 && Math.abs(x) <= skullW + 3) draw = true;
            }
            else if (hairStyle === 'wavy') {
                if (y >= hairLineY && y < chinY + 8 && Math.abs(x) >= skullW - 1 && Math.abs(x) <= skullW + 4) {
                    const wave = Math.sin(y * 0.5) * 1.5;
                    if (Math.abs(x) <= skullW + 2 + wave) draw = true;
                }
            } 
            else if (hairStyle === 'elegant_braid') {
                if (y >= hairLineY && y < eyeY && Math.abs(x) >= skullW - 1 && Math.abs(x) <= skullW + 2) draw = true;
                if (x > skullW - 1 && x < skullW + 4 && y >= eyeY && y < GRID_SIZE - 2) {
                    draw = true;
                    isBraid = true;
                }
            } 
            else if (hairStyle === 'half_up') {
                if (y >= headTopY - 6 && y < headTopY && Math.abs(x) <= 3) {
                    if (Math.hypot(x, y - (headTopY - 2)) < 4) draw = true; // Perfect round bun
                }
                if (y >= eyeY && y < chinY + 6 && Math.abs(x) >= skullW && Math.abs(x) <= skullW + 2) draw = true;
            }
            else if (hairStyle === 'high_bun') {
                if (y >= headTopY - 7 && y < headTopY && Math.abs(x) <= 4) {
                    if (Math.hypot(x, y - (headTopY - 3)) < 4.5) draw = true; // Perfect round bun
                }
            }

            // BANGS
            if (y >= hairLineY && y < eyeY) {
                if (bangStyle === 'fringe' && Math.abs(x) <= skullW) draw = true;
                if (bangStyle === 'swept' && x > -skullW && x < skullW && y < eyeY - 1 + (x * 0.3)) draw = true;
                if (bangStyle === 'parted' && Math.abs(x) <= skullW && Math.abs(x) > 1 + (y - hairLineY)*0.6) draw = true;
            }

            // MASK FACE & EARS 
            if (y >= hairLineY && Math.abs(x) < skullW - 1) {
                let isBangs = false;
                if (y < eyeY) {
                    if (bangStyle === 'fringe') isBangs = true;
                    if (bangStyle === 'swept' && y < eyeY - 1 + (x * 0.3)) isBangs = true;
                    if (bangStyle === 'parted' && Math.abs(x) > 1 + (y - hairLineY)*0.6) isBangs = true;
                }
                if (!isBangs && !isBraid) draw = false;
            }
            // Ear Masking
            if (y >= eyeY && y <= noseY && Math.abs(x) > skullW) draw = false;

            if (draw) {
                let c = hair.base;
                if (isBraid) {
                    if ((x+y)%4 === 0) c = hair.shadow; 
                } else {
                    if (y > headTopY - 4 && y < headTopY + 2 && x > -skullW && x < 0 && x % 3 === 0) c = hairSoftHigh; 
                }
                if (x > skullW + 1) c = hair.shadow; 
                overPixel(cx + x, y, c);
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
            overPixel(cx + side*2, eyeY + 2, inkColor); 
            overPixel(cx + side*3, eyeY + 2, inkColor);
            overPixel(cx + side*4, eyeY + 1, inkColor);
        }
        overPixel(cx, headTopY + 4, inkColor);
        overPixel(cx, headTopY + 5, inkColor);
        overPixel(cx - 1, headTopY + 4, inkColor);
        overPixel(cx + 1, headTopY + 4, inkColor);
    }
    
    if (feature === 'freckles') {
        const freckleColor = blend(skin.base, '#000000', 0.15); 
        for (let i = 0; i < 6; i++) {
            const dx = rng.int(-4, 4);
            const dy = rng.int(eyeY + 2, noseY + 1);
            if (grid[dy][cx + dx] === skin.base || grid[dy][cx + dx] === skin.highlight) {
                overPixel(cx + dx, dy, freckleColor); 
            }
        }
    }

    // --- 10. OUTLINE PASS ---
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

    // --- 11. RENDER ---
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            let colorCode = grid[y][x] || outlineGrid[y][x];
            if (colorCode) drawScaledRect(ctx, x, y, 1, 1, colorCode, DISPLAY_SCALE);
        }
    }

    return {
        imageDataUrl: offscreenCanvas.toDataURL(),
        data: { jawShape, noseShape, eyeShape, earStyle, hairStyle, bangStyle, clothStyle, feature }
    };
}