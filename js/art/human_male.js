/**
 * js/art/human_male.js
 * Generates highly varied Human Male portraits.
 * V4 - Standardized flat shading, squircle heads, decoupled hair/beard layers.
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

    function setPixel(x, y, hexColor) {
        x = Math.round(x); y = Math.round(y);
        if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE && !grid[y][x]) grid[y][x] = hexColor;
    }

    const cx = 32; 
    const headTopY = 14;
    const eyeY = 28;
    const noseY = 38;
    const mouthY = 44;
    const chinY = 50;

    // --- 1. PROCEDURAL PARAMETERS ---
    const jawShape = rng.pick(['square', 'round', 'chiseled', 'long', 'broad']);
    const noseShape = rng.pick(['straight', 'broad', 'aquiline', 'button']);
    const mouthShape = rng.pick(['neutral', 'smirk', 'frown', 'wide', 'thin']);
    const eyeShape = rng.pick(['neutral', 'deep_set', 'tired', 'sharp', 'large', 'squint']);
    const hairStyle = rng.pick(['bald', 'buzzcut', 'messy', 'slick_back', 'flowing', 'dreadlocks']);
    const beardStyle = rng.pick(['none', 'stubble', 'mustache', 'goatee', 'mutton_chops', 'full_beard']);
    const clothStyle = rng.pick(['tunic', 'v_neck', 'armor', 'noble']);
    const feature = rng.pick(['none', 'none', 'scar', 'eyepatch', 'freckles']);

    // --- 2. FACIAL CONTOUR MAP ---
    const faceW = Array(GRID_SIZE).fill(0);
    let maxW = 11;
    if (jawShape === 'long') maxW = 9;
    if (jawShape === 'broad') maxW = 12;

    for (let y = headTopY; y <= chinY; y++) {
        let w = 0;
        if (y <= eyeY) {
            const dy = (eyeY - y) / (eyeY - headTopY); 
            w = maxW * Math.pow(1 - Math.pow(dy, 2), 0.4); // Natural skull dome
        } else {
            const dy = (y - eyeY) / (chinY - eyeY); 
            if (jawShape === 'square') w = maxW - 1.5 * Math.pow(dy, 5); 
            else if (jawShape === 'round') w = maxW - 3.5 * Math.pow(dy, 1.2);
            else if (jawShape === 'chiseled') w = maxW - 4.5 * dy; 
            else if (jawShape === 'long') w = maxW - 3.5 * dy;
            else if (jawShape === 'broad') w = maxW - 2.5 * Math.pow(dy, 2);
        }
        faceW[y] = Math.max(4, Math.round(w)); 
    }

    // --- 3. BACKGROUND HAIR (Flowing back) ---
    if (hairStyle === 'flowing' || hairStyle === 'dreadlocks') {
        for (let y = eyeY; y < GRID_SIZE; y++) {
            let spread = 12 + (y - eyeY) * 0.2;
            spread = Math.floor(spread);
            for (let x = -spread; x <= spread; x++) {
                if (Math.abs(x) > 5) setPixel(cx + x, y, hair.shadow); // Solid shadow background
            }
        }
    }

    // --- 4. NECK & SHOULDERS ---
    const neckW = (jawShape === 'broad' || jawShape === 'square') ? 6 : 5;
    for (let y = chinY - 4; y <= chinY + 7; y++) {
        for (let x = -neckW; x <= neckW; x++) {
            let c = skin.shadow;
            if (x < -neckW + 2) c = skin.base; 
            overPixel(cx + x, y, c);
        }
    }
    overPixel(cx, chinY + 4, skin.base);

    for (let y = chinY + 5; y < GRID_SIZE; y++) {
        const shoulderWidth = 10 + (y - (chinY + 5)) * 1.8;
        for (let x = -Math.floor(shoulderWidth); x <= Math.floor(shoulderWidth); x++) {
            let c = cloth.base;
            if (x > shoulderWidth * 0.4) c = cloth.shadow;
            if (x < -shoulderWidth * 0.4) c = cloth.highlight;
            
            const isCenter = Math.abs(x) <= neckW + 1;
            if (clothStyle === 'v_neck' && isCenter && y < chinY + 7 + Math.abs(x)) continue;
            if (clothStyle === 'tunic' && isCenter && y < chinY + 6) continue;
            
            if (clothStyle === 'armor' && (x + y) % 4 === 0) c = cloth.highlight;
            if (clothStyle === 'noble' && Math.abs(x) > 6 && Math.abs(x) < 9 && y < chinY + 11) c = '#FBBF24';
            
            overPixel(cx + x, y, c);
        }
    }

    // --- 5. THE FACE ---
    for (let y = headTopY; y <= chinY; y++) {
        const w = faceW[y];
        for (let x = -w; x <= w; x++) {
            let c = skin.base;
            if (x > w - 2) c = skin.shadow;         
            if (x < -w + 2 && y < noseY) c = skin.highlight; 
            if (y > chinY - 1) c = skin.shadow;     
            
            if ((jawShape === 'chiseled' || jawShape === 'long') && y > noseY && y < mouthY && Math.abs(x) > w - 3) {
                c = skin.shadow;
            }
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
    for (let side of[-1, 1]) {
        const ex = cx + (side * 4);
        
        let browY = eyeY - 2;
        overPixel(ex - side, browY, hair.base); overPixel(ex, browY, hair.base); overPixel(ex + side, browY, hair.base);
        if (eyeShape === 'sharp') overPixel(ex - side, browY + 1, hair.base); 
        if (eyeShape === 'tired') overPixel(ex + side, browY + 1, hair.base); 

        if (feature === 'eyepatch' && side === 1) {
            for(let dx=-2; dx<=2; dx++) for(let dy=-1; dy<=2; dy++) if(Math.abs(dx)+Math.abs(dy)<4) overPixel(ex+dx, eyeY+dy, '#111827');
            overPixel(ex-4, eyeY-1, '#111827'); overPixel(ex+4, eyeY+1, '#111827'); 
        } else {
            if (eyeShape === 'large') {
                overPixel(ex - 1, eyeY, '#F8FAFC'); overPixel(ex + 1, eyeY, '#F8FAFC');
                overPixel(ex - 1, eyeY - 1, '#F8FAFC'); overPixel(ex + 1, eyeY - 1, '#F8FAFC');
                overPixel(ex, eyeY, eye.color); overPixel(ex, eyeY - 1, eye.color);
            } else if (eyeShape === 'squint') {
                overPixel(ex - 1, eyeY, skin.shadow); overPixel(ex + 1, eyeY, skin.shadow);
                overPixel(ex, eyeY, eye.color);
            } else {
                overPixel(ex - 1, eyeY, '#F8FAFC'); overPixel(ex + 1, eyeY, '#F8FAFC');
                overPixel(ex, eyeY, eye.color);
                if (eyeShape === 'deep_set') { overPixel(ex - 1, eyeY - 1, skin.shadow); overPixel(ex + 1, eyeY - 1, skin.shadow); }
                if (eyeShape === 'tired') { overPixel(ex, eyeY + 1, skin.shadow); overPixel(ex - 1, eyeY + 1, skin.shadow); }
                if (eyeShape === 'sharp') { overPixel(ex - 1, eyeY, skin.base); overPixel(ex + 2, eyeY - 1, '#F8FAFC'); }
            }
        }
    }

    for (let y = eyeY + 1; y < noseY; y++) {
        overPixel(cx, y, skin.highlight); 
        overPixel(cx + 1, y, skin.shadow);
        if (noseShape === 'aquiline' && y === Math.floor((eyeY + noseY)/2)) {
            overPixel(cx + 1, y, skin.highlight); overPixel(cx + 2, y, skin.shadow);
        }
    }
    overPixel(cx, noseY, skin.highlight); 
    overPixel(cx + 1, noseY, skin.shadow);
    overPixel(cx, noseY + 1, skin.shadow); 
    
    if (noseShape === 'broad') {
        overPixel(cx - 2, noseY, skin.shadow); overPixel(cx - 1, noseY, skin.base);
        overPixel(cx + 1, noseY, skin.base); overPixel(cx + 2, noseY, skin.shadow);
        overPixel(cx - 1, noseY + 1, skin.shadow); overPixel(cx + 1, noseY + 1, skin.shadow);
    } else if (noseShape === 'button') {
        overPixel(cx - 1, noseY, skin.shadow); overPixel(cx + 1, noseY, skin.base);
    } else {
        overPixel(cx - 1, noseY, skin.shadow); 
    }

    const mw = mouthShape === 'wide' ? 4 : (mouthShape === 'thin' ? 2 : 3);
    const lipDark = skin.shadow;
    if (mouthShape === 'neutral' || mouthShape === 'wide' || mouthShape === 'thin') {
        for (let x = -mw; x <= mw; x++) overPixel(cx + x, mouthY, lipDark);
    } else if (mouthShape === 'smirk') {
        for (let x = -mw; x <= mw; x++) overPixel(cx + x, mouthY, lipDark);
        overPixel(cx + mw, mouthY - 1, lipDark); overPixel(cx + mw + 1, mouthY - 1, lipDark);
    } else if (mouthShape === 'frown') {
        for (let x = -mw+1; x <= mw-1; x++) overPixel(cx + x, mouthY, lipDark);
        overPixel(cx - mw, mouthY + 1, lipDark); overPixel(cx + mw, mouthY + 1, lipDark);
    }
    overPixel(cx, mouthY + 1, skin.base); overPixel(cx, mouthY + 2, skin.highlight);

    // --- 8. FOREGROUND HAIR ---
    if (hairStyle !== 'bald') {
        const hairLineY = headTopY + 3; 
        
        for (let y = headTopY - 5; y <= chinY + 5; y++) {
            let skullW = faceW[y] || 0;
            if (y < headTopY) skullW = faceW[headTopY] - (headTopY - y) * 1.5; 
            if (skullW < 0) skullW = 0;
            
            for (let x = -skullW - 4; x <= skullW + 4; x++) {
                let draw = false;

                if (hairStyle === 'buzzcut') {
                    if (y < hairLineY && Math.abs(x) <= skullW + 1) draw = true;
                } else if (hairStyle === 'slick_back') {
                    if (y < hairLineY && Math.abs(x) <= skullW + 2) draw = true;
                    if (y >= headTopY - 4 && y < headTopY && Math.abs(x) <= skullW) draw = true;
                } else if (hairStyle === 'messy') {
                    if (y < hairLineY && Math.abs(x) <= skullW + 2) draw = true;
                    // Messy bangs and sides
                    if (y >= hairLineY && y < eyeY && Math.abs(x) >= skullW - 2 && Math.abs(x) <= skullW + 3) draw = true; 
                    if (y >= hairLineY && y < eyeY - 1 && x > -2 && x < skullW - 1) draw = true;
                } else if (hairStyle === 'flowing') {
                    if (y < hairLineY && Math.abs(x) <= skullW + 2) draw = true; 
                    if (y >= hairLineY && y < chinY + 4 && Math.abs(x) >= skullW - 1 && Math.abs(x) <= skullW + 3) draw = true;
                } else if (hairStyle === 'dreadlocks') {
                    if (y < hairLineY && Math.abs(x) <= skullW + 2) draw = true;
                    if (y >= hairLineY && y < chinY + 5 && Math.abs(x) >= skullW - 1 && Math.abs(x) <= skullW + 4) {
                        if (Math.abs(x) % 3 !== 2) draw = true; 
                    }
                }

                if (y >= hairLineY && Math.abs(x) < skullW - 1 && hairStyle !== 'messy') draw = false;

                if (draw) {
                    let c = hair.base;
                    // Halo Highlight
                    if (y > headTopY - 4 && y < headTopY + 2 && x > -skullW - 1 && x < 0 && (x+y)%3===0) c = hair.highlight; 
                    // Solid shadow
                    if (x > skullW) c = hair.shadow;
                    
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
                    if (y > mouthY && Math.abs(x) <= w && rng.chance(0.3)) overPixel(cx + x, y, skin.shadow); 
                    continue;
                }
                
                if (beardStyle === 'mustache' && y === noseY + 2 && Math.abs(x) <= 4) draw = true;
                if (beardStyle === 'goatee' && y > mouthY && Math.abs(x) <= 3) draw = true;
                if (beardStyle === 'mutton_chops' && y >= eyeY && y < chinY && Math.abs(x) >= w - 3 && Math.abs(x) <= w + 1) draw = true;
                if (beardStyle === 'full_beard') {
                    if (y >= noseY + 4 && y <= chinY && Math.abs(x) >= w - 3 && Math.abs(x) <= w + 1) draw = true; 
                    if (y >= mouthY && Math.abs(x) <= w) draw = true; 
                    if (y > chinY && y < chinY + 5 && Math.abs(x) <= w - (y - chinY)*1.2) draw = true; 
                }

                if (y === mouthY && Math.abs(x) <= 3 && beardStyle !== 'mustache') draw = false;

                if (draw) {
                    let c = hair.base;
                    if ((x+y)%3===0) c = hair.highlight; // Solid texture, no noise
                    if (x > w - 1 || y > chinY + 2) c = hair.shadow; // Solid shade
                    overPixel(cx + x, y, c);
                }
            }
        }
    }

    if (feature === 'scar') {
        overPixel(cx - 3, eyeY + 2, '#7F1D1D'); overPixel(cx - 4, eyeY + 1, '#7F1D1D');
    }
    if (feature === 'freckles') {
        const darkenHex = (hex, factor) => {
            const r = Math.floor(parseInt(hex.slice(1, 3), 16) * factor);
            const g = Math.floor(parseInt(hex.slice(3, 5), 16) * factor);
            const b = Math.floor(parseInt(hex.slice(5, 7), 16) * factor);
            return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        };
        const freckleColor = darkenHex(skin.base, 0.85);

        for (let i = 0; i < 10; i++) {
            const dx = rng.int(-6, 6);
            const dy = rng.int(eyeY + 1, noseY + 1);
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
        data: { jawShape, noseShape, mouthShape, eyeShape, hairStyle, beardStyle, clothStyle, feature }
    };
}