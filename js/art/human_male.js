/**
 * js/art/human_male.js
 * Generates highly varied Human Male portraits.
 * V5 - Complete Overhaul: Advanced anatomical contouring, color blending, 
 * structured hair texturing, 3D facial shading, and expressive eyes.
 */

import { drawScaledRect } from '../util/utils.js';

const GRID_SIZE = 64;
const DISPLAY_SCALE = 4;
const CANVAS_SIZE = GRID_SIZE * DISPLAY_SCALE;

export function generateHumanMale(options = {}) {
    const rng = options.rng;
    const skin = options.skin;
    const hair = options.hair;
    const eye = options.eye;
    const cloth = options.cloth;

    // Color Blending Helpers for natural shading
    const hex2rgb = h =>[parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
    const rgb2hex = ([r,g,b]) => `#${(1<<24|(r<<16)|(g<<8)|b).toString(16).slice(1).padStart(6, '0')}`;
    const blend = (c1, c2, t) => rgb2hex(hex2rgb(c1).map((v,i) => Math.round(v + (hex2rgb(c2)[i]-v)*t)));
    
    const hairSoftHigh = blend(hair.base, hair.highlight, 0.4);
    const lipDark = blend(skin.shadow, '#7F1D1D', 0.25); // Natural lip tone
    const lipLight = skin.base;
    const stubbleColor = blend(skin.shadow, hair.base, 0.35); // Realistic 5 o'clock shadow
    const buzzcutColor = blend(skin.shadow, hair.base, 0.65); // NEW: Solid buzzcut color

    const metals =[
        { base: '#475569', high: '#94A3B8' }, // Iron
        { base: '#94A3B8', high: '#E2E8F0' }, // Steel
        { base: '#D97706', high: '#FBBF24' }  // Bronze/Gold
    ];
    const metal = rng.pick(metals);

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
    const headTopY = 13;
    const eyeY = 28;
    const noseY = 37;
    const mouthY = 43;
    const chinY = 49;

    // --- 1. PROCEDURAL PARAMETERS ---
    const jawShape = rng.pick(['square', 'round', 'chiseled', 'long', 'broad']);
    const noseShape = rng.pick(['straight', 'broad', 'aquiline', 'button']);
    const mouthShape = rng.pick(['neutral', 'smirk', 'frown', 'wide']);
    const eyeShape = rng.pick(['neutral', 'deep_set', 'tired', 'sharp', 'large', 'squint']);
    const hairStyle = rng.pick(['bald', 'buzzcut', 'messy', 'slick_back', 'flowing', 'dreadlocks']);
    const beardStyle = rng.pick(['none', 'stubble', 'mustache', 'goatee', 'mutton_chops', 'full_beard']);
    const clothStyle = rng.pick(['tunic', 'v_neck', 'armor', 'noble']);
    const feature = rng.pick(['none', 'none', 'none', 'scar', 'eyepatch', 'freckles']);

    // --- 2. FACIAL CONTOUR MAP ---
    const faceW = Array(GRID_SIZE).fill(0);
    let maxW = 10;
    if (jawShape === 'long') maxW = 9;
    if (jawShape === 'broad') maxW = 11;

    for (let y = headTopY; y <= chinY; y++) {
        let w = 0;
        if (y <= eyeY) {
            const dy = (eyeY - y) / (eyeY - headTopY); 
            w = maxW * Math.pow(1 - Math.pow(dy, 2), 0.45); // Smooth natural skull dome
        } else {
            const dy = (y - eyeY) / (chinY - eyeY); 
            if (jawShape === 'square') w = maxW - 1.5 * Math.pow(dy, 6); // Hard corner
            else if (jawShape === 'round') w = maxW - 3.5 * Math.pow(dy, 1.5);
            else if (jawShape === 'chiseled') w = maxW - (dy < 0.5 ? dy * 1.5 : 1 + (dy-0.5)*5); // Sharp cheekbone indent
            else if (jawShape === 'long') w = maxW - 3.0 * dy;
            else if (jawShape === 'broad') w = maxW - 1.5 * Math.pow(dy, 2);
        }
        faceW[y] = Math.max(4, Math.round(w)); 
    }

    // --- 3. BACKGROUND HAIR ---
    if (hairStyle === 'flowing' || hairStyle === 'dreadlocks') {
        for (let y = eyeY; y < GRID_SIZE; y++) {
            let spread = maxW + 2 + (y - eyeY) * 0.2;
            spread = Math.floor(spread);
            for (let x = -spread; x <= spread; x++) {
                if (Math.abs(x) > 4) overPixel(cx + x, y, hair.shadow);
            }
        }
    }

    // --- 4. NECK & SHOULDERS ---
    const neckW = (jawShape === 'broad' || jawShape === 'square') ? 5 : 4;
    for (let y = chinY - 4; y <= chinY + 7; y++) {
        for (let x = -neckW; x <= neckW; x++) {
            let c = skin.shadow;
            if (x < -neckW + 2) c = skin.base; 
            overPixel(cx + x, y, c);
        }
    }
    // Adam's apple
    overPixel(cx, chinY + 3, skin.base);
    overPixel(cx, chinY + 4, skin.highlight);

    for (let y = chinY + 5; y < GRID_SIZE; y++) {
        const shoulderWidth = 9 + (y - (chinY + 5)) * 1.8;
        for (let x = -Math.floor(shoulderWidth); x <= Math.floor(shoulderWidth); x++) {
            let c = cloth.base;
            if (x > shoulderWidth * 0.4) c = cloth.shadow;
            if (x < -shoulderWidth * 0.4) c = cloth.highlight;
            
            const isCenter = Math.abs(x) <= neckW + 1;
            
            // Necklines
            if (clothStyle === 'v_neck' && isCenter && y < chinY + 7 + Math.abs(x)) {
                overPixel(cx + x, y, skin.shadow);
                continue;
            }
            if (clothStyle === 'tunic' && isCenter && y < chinY + 6) continue;
            
            // Details
            if (clothStyle === 'armor') {
                if ((x + y) % 4 === 0) c = cloth.shadow;
                // Pauldrons
                if (Math.abs(x) >= neckW + 2 && y < chinY + 9) {
                    c = metal.base;
                    if (y === chinY + 6) c = metal.high;
                }
            }
            if (clothStyle === 'noble') {
                if (isCenter && y < chinY + 10) c = cloth.highlight; // Cravat
                if (Math.abs(x) === neckW + 2 && y > chinY + 5) c = '#FBBF24'; // Gold Trim
            }
            
            overPixel(cx + x, y, c);
        }
    }

// --- 5. THE FACE ---
    for (let y = headTopY; y <= chinY; y++) {
        const w = faceW[y];
        for (let x = -w; x <= w; x++) {
            let c = skin.base;
            
            // Edge shadows
            if (x > w - 2) c = skin.shadow;         
            if (x < -w + 2 && y < noseY) c = skin.highlight; 
            if (y > chinY - 1) c = skin.shadow;     
            
            // Dynamic Cheekbones
            if (y > noseY && y < mouthY && Math.abs(x) >= w - 2) {
                if (jawShape === 'chiseled' || jawShape === 'square') c = skin.shadow;
                else if ((x+y)%2 === 0) c = skin.shadow; // Soft shading for others
            }
            
            // (Removed the blocky forehead highlight from here!)
            
            overPixel(cx + x, y, c);
        }
    }

    // --- 6. EARS ---
    for (let side of [-1, 1]) {
        for (let y = eyeY; y <= noseY - 2; y++) {
            const w = faceW[y];
            const ex = cx + (side * (w + 1));
            overPixel(ex, y, skin.shadow);
            overPixel(ex + side, y + 1, skin.shadow);
            overPixel(ex, y + 1, skin.base);
            if (side === -1) overPixel(ex, y, skin.highlight);
        }
    }

    // --- 7. FACIAL FEATURES ---
    
    // Eyes & Brows
    for (let side of[-1, 1]) {
        const ex = cx + (side * 4);
        
        // Structured Brows
        let browY = eyeY - 2;
        overPixel(ex - side, browY, hair.base); 
        overPixel(ex, browY, hair.base); 
        overPixel(ex + side, browY, hair.base);
        
        if (eyeShape === 'sharp') overPixel(ex - side, browY + 1, hair.base); // Angled down
        else if (eyeShape === 'tired') overPixel(ex + side, browY + 1, hair.base); // Angled up
        else overPixel(ex + side*2, browY + 1, hair.base); // Natural taper

        if (feature === 'eyepatch' && side === 1) {
            // Strap
            drawScaledRect(ctx, cx-4, eyeY-1, 10, 1, '#111827', 1); // Temp direct draw bypass
            for(let dx=-2; dx<=2; dx++) for(let dy=-1; dy<=2; dy++) if(Math.abs(dx)+Math.abs(dy)<4) overPixel(ex+dx, eyeY+dy, '#111827');
        } else {
            // Eye Whites & Pupil
            overPixel(ex - 1, eyeY, '#F8FAFC'); 
            overPixel(ex + 1, eyeY, '#F8FAFC');
            overPixel(ex, eyeY, eye.color);
            
            // Eyelids & Shaping
            overPixel(ex - 1, eyeY - 1, '#020617'); // Top lash line
            overPixel(ex, eyeY - 1, '#020617');
            overPixel(ex + 1, eyeY - 1, '#020617');

            if (eyeShape === 'deep_set') {
                overPixel(ex - 1, eyeY - 1, skin.shadow); 
                overPixel(ex + 1, eyeY - 1, skin.shadow); 
            } else if (eyeShape === 'tired') {
                overPixel(ex, eyeY + 1, skin.shadow); 
                overPixel(ex - 1, eyeY + 1, skin.shadow); 
            } else if (eyeShape === 'squint') {
                overPixel(ex - 1, eyeY, skin.shadow); 
                overPixel(ex + 1, eyeY, skin.shadow);
                overPixel(ex, eyeY + 1, skin.shadow);
            } else if (eyeShape === 'large') {
                overPixel(ex, eyeY + 1, '#F8FAFC'); // Extra white below
            }
        }
    }

    // 3D Nose
    for (let y = eyeY + 1; y < noseY; y++) {
        overPixel(cx, y, skin.highlight); // Bridge
        overPixel(cx + 1, y, skin.shadow); // Side shadow
        if (noseShape === 'aquiline' && y === Math.floor((eyeY + noseY)/2)) {
            overPixel(cx + 1, y, skin.highlight); // Bump
            overPixel(cx + 2, y, skin.shadow);
        }
    }
    
    // Nostrils and Tip
    if (noseShape === 'broad') {
        overPixel(cx - 2, noseY, skin.shadow); overPixel(cx - 1, noseY, skin.base);
        overPixel(cx, noseY, skin.highlight); overPixel(cx + 1, noseY, skin.base); overPixel(cx + 2, noseY, skin.shadow);
        overPixel(cx - 1, noseY + 1, skin.shadow); overPixel(cx + 1, noseY + 1, skin.shadow);
    } else if (noseShape === 'button') {
        overPixel(cx, noseY, skin.highlight);
        overPixel(cx - 1, noseY, skin.shadow); overPixel(cx + 1, noseY, skin.base);
    } else {
        // Straight / Aquiline
        overPixel(cx, noseY, skin.highlight); 
        overPixel(cx + 1, noseY, skin.shadow);
        overPixel(cx - 1, noseY, skin.shadow); 
        overPixel(cx, noseY + 1, skin.shadow); // Under tip
    }

    // Mouth
    const mw = mouthShape === 'wide' ? 3 : 2;
    
    // Top Lip
    for (let x = -mw + 1; x <= mw - 1; x++) overPixel(cx + x, mouthY, lipDark);
    
    // Expressions
    if (mouthShape === 'smirk') {
        overPixel(cx + mw, mouthY - 1, lipDark); 
        overPixel(cx + mw + 1, mouthY - 1, lipDark);
    } else if (mouthShape === 'frown') {
        overPixel(cx - mw, mouthY + 1, lipDark); 
        overPixel(cx + mw, mouthY + 1, lipDark);
    } else if (mouthShape === 'wide') {
        overPixel(cx - mw, mouthY, lipDark); 
        overPixel(cx + mw, mouthY, lipDark);
    }
    
    // Bottom Lip highlight
    overPixel(cx, mouthY + 1, lipLight); 
    overPixel(cx, mouthY + 2, skin.highlight); // Chin pop

    // --- 8. FOREGROUND HAIR ---
    const hairLineY = headTopY + 3; 
    
    if (hairStyle !== 'bald') {
        for (let y = headTopY - 5; y <= chinY + 5; y++) {
            // Prevent beard collapse bug
            let skullW = (y <= chinY) ? (faceW[y] || 0) : (faceW[chinY] || 0);
            if (y < headTopY) skullW = faceW[headTopY] - (headTopY - y) * 1.5; 
            if (skullW < 0) skullW = 0;
            
            for (let x = -skullW - 4; x <= skullW + 4; x++) {
                let draw = false;

                if (hairStyle === 'buzzcut') {
                    if (y < hairLineY + 1 && Math.abs(x) <= skullW) draw = true;
                } else if (hairStyle === 'slick_back') {
                    if (y < hairLineY && Math.abs(x) <= skullW + 2) draw = true;
                    if (y >= headTopY - 4 && y < headTopY && Math.abs(x) <= skullW) draw = true;
                } else if (hairStyle === 'messy') {
                    if (y < hairLineY && Math.abs(x) <= skullW + 2) draw = true;
                    if (y >= hairLineY && y < eyeY && Math.abs(x) >= skullW - 2 && Math.abs(x) <= skullW + 3) draw = true; 
                    
                    // STRUCTURED BANGS: Jagged triangular points instead of random noise
                    if (y >= hairLineY && y < eyeY - 1 && x > -skullW + 1 && x < skullW - 1) {
                        const drop = Math.abs(x) % 3; 
                        if (y <= hairLineY + drop) draw = true;
                    }
                } else if (hairStyle === 'flowing') {
                    if (y < hairLineY && Math.abs(x) <= skullW + 2) draw = true; 
                    if (y >= hairLineY && y < chinY + 4 && Math.abs(x) >= skullW - 1 && Math.abs(x) <= skullW + 3) draw = true;
                } else if (hairStyle === 'dreadlocks') {
                    if (y < hairLineY && Math.abs(x) <= skullW + 2) draw = true;
                    if (y >= hairLineY && y < chinY + 5 && Math.abs(x) >= skullW - 1 && Math.abs(x) <= skullW + 4) draw = true;
                }

                if (y >= hairLineY && Math.abs(x) < skullW - 1 && hairStyle !== 'messy') draw = false;

                if (draw) {
                    let c = hair.base;
                    
                    // Texture
                    if (hairStyle === 'dreadlocks' && Math.abs(x) % 3 === 2) c = hair.shadow; 
                    else if (hairStyle === 'slick_back' && x % 3 === 0) c = hair.shadow; 
                    else if (hairStyle === 'buzzcut') c = buzzcutColor; // Solid color, no checkerboard
                    
                    // Structured Halo Highlight
                    if (hairStyle !== 'buzzcut' && y > headTopY - 4 && y < headTopY + 2 && x > -skullW - 1 && x < 0 && (x+y)%3===0) {
                        c = hairSoftHigh; 
                    }
                    
                    // Core Shadow
                    if (x > skullW && hairStyle !== 'buzzcut') c = hair.shadow;
                    
                    overPixel(cx + x, y, c);
                }
            }
        }
    }

// --- 9. BEARD ---
    if (beardStyle !== 'none') {
        for (let y = noseY + 1; y <= chinY + 6; y++) {
            const w = faceW[y] || faceW[chinY]; 
            for (let x = -w - 2; x <= w + 2; x++) {
                let draw = false;
                
                if (beardStyle === 'stubble') {
                    // Solid structured block for a 5 o'clock shadow
                    if (y >= noseY + 3 && y <= chinY && Math.abs(x) <= w) {
                        if (y < mouthY && Math.abs(x) < w - 2) continue; // Clear cheeks
                        if (y === mouthY && Math.abs(x) <= mw) continue; // Clear mouth
                        overPixel(cx + x, y, stubbleColor);
                    }
                    continue;
                }
                
                if (beardStyle === 'mustache' && y === noseY + 2 && Math.abs(x) <= 3) draw = true;
                if (beardStyle === 'goatee') {
                    if (y === noseY + 2 && Math.abs(x) <= 3) draw = true; // Mustache portion connects
                    if (y >= mouthY && y <= chinY + 2 && Math.abs(x) <= 3) {
                        if (y > chinY && Math.abs(x) > 1) draw = false; // Tapers into a point below the chin
                        else draw = true;
                    }
                }
                if (beardStyle === 'mutton_chops' && y >= eyeY && y < chinY && Math.abs(x) >= w - 3 && Math.abs(x) <= w + 1) draw = true;
                
                if (beardStyle === 'full_beard') {
                    if (y >= noseY + 4 && y <= chinY && Math.abs(x) >= w - 3 && Math.abs(x) <= w + 1) draw = true; 
                    if (y >= mouthY && Math.abs(x) <= w) draw = true; 
                    if (y > chinY && y < chinY + 4 && Math.abs(x) <= w - (y - chinY)*1.5) draw = true; // Tapered hang
                }

                // Keep mouth opening clear
                if (y === mouthY && Math.abs(x) <= mw && beardStyle !== 'mustache') draw = false;

                if (draw) {
                    let c = hair.base;
                    if ((x+y)%3===0) c = hairSoftHigh; // Texture
                    if (x > w - 1 || y > chinY + 2) c = hair.shadow; // Depth
                    overPixel(cx + x, y, c);
                }
            }
        }
    }

    // --- 10. DETAILS ---
    if (feature === 'scar') {
        overPixel(cx - 3, eyeY + 2, '#7F1D1D'); overPixel(cx - 4, eyeY + 1, '#7F1D1D');
    }
    if (feature === 'freckles') {
        const freckleColor = blend(skin.base, '#000000', 0.15);
        for (let i = 0; i < 10; i++) {
            const dx = rng.int(-5, 5);
            const dy = rng.int(eyeY + 1, noseY + 1);
            if (grid[dy][cx + dx] === skin.base || grid[dy][cx + dx] === skin.highlight) {
                overPixel(cx + dx, dy, freckleColor); 
            }
        }
    }

    // --- 11. OUTLINE PASS ---
    const outlineGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            if (grid[y][x] === null) {
                if ((y > 0 && grid[y - 1][x] !== null && grid[y - 1][x] !== '#111827') || // Exclude eyepatch strap from causing outlines
                    (y < GRID_SIZE - 1 && grid[y + 1][x] !== null && grid[y + 1][x] !== '#111827') || 
                    (x > 0 && grid[y][x - 1] !== null && grid[y][x - 1] !== '#111827') || 
                    (x < GRID_SIZE - 1 && grid[y][x + 1] !== null && grid[y][x + 1] !== '#111827')) {
                    outlineGrid[y][x] = '#020617'; 
                }
            }
        }
    }

    // --- 12. RENDER ---
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            let colorCode = grid[y][x] || outlineGrid[y][x];
            if (grid[y][x] === '#111827') colorCode = grid[y][x]; // Eyepatch strap overrides outline
            if (colorCode) drawScaledRect(ctx, x, y, 1, 1, colorCode, DISPLAY_SCALE);
        }
    }

    return {
        imageDataUrl: offscreenCanvas.toDataURL(),
        data: { jawShape, noseShape, mouthShape, eyeShape, hairStyle, beardStyle, clothStyle, feature }
    };
}