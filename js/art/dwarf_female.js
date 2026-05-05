/**
 * js/art/dwarf_female.js
 * Generates highly varied Dwarf Female portraits.
 * V4 - Fixed undefined skull width pulling braids to the center, removed buck-teeth, 
 * implemented smooth color blending for clean hair, and aligned output tags.
 */

import { drawScaledRect } from '../util/utils.js';

const GRID_SIZE = 64;
const DISPLAY_SCALE = 4;
const CANVAS_SIZE = GRID_SIZE * DISPLAY_SCALE;

export function generateDwarfFemale(options = {}) {
    const rng = options.rng;
    const skin = options.skin;
    const hair = options.hair;
    const eye = options.eye;
    const cloth = options.cloth;

    // Metal palettes for hair rings and armor
    const metals =[
        { base: '#F59E0B', high: '#FEF08A' }, // Gold
        { base: '#94A3B8', high: '#F1F5F9' }, // Silver
        { base: '#D97706', high: '#FDBA74' }, // Copper
        { base: '#475569', high: '#94A3B8' }  // Iron
    ];
    const metal = rng.pick(metals);

    // Color Blending Helper for smooth, low-contrast hair shading
    const hex2rgb = h =>[parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
    const rgb2hex = ([r,g,b]) => `#${(1<<24|(r<<16)|(g<<8)|b).toString(16).slice(1)}`;
    const blend = (c1, c2, t) => rgb2hex(hex2rgb(c1).map((v,i) => Math.round(v + (hex2rgb(c2)[i]-v)*t)));
    
    const hairSoftHigh = blend(hair.base, hair.highlight, 0.35);

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
    const headTopY = 15;
    const eyeY = 29; 
    const noseY = 38;
    const mouthY = 43;
    const chinY = 49; 

    // --- 1. PROCEDURAL PARAMETERS ---
    const jawShape = rng.pick(['round', 'soft_square', 'broad', 'heart']);
    const noseShape = rng.pick(['broad', 'button', 'straight', 'snub']);
    const mouthShape = rng.pick(['neutral', 'full', 'smile', 'pout']);
    const eyeShape = rng.pick(['almond', 'doe', 'fierce', 'deep_set', 'heavy_lashes']);
    
    const hairStyle = rng.pick(['twin_braids', 'crown_braid', 'thick_flowing', 'short_curls', 'high_bun', 'ponytail']);
    const bangStyle = rng.pick(['swept', 'fringe', 'parted', 'none']);
    
    const clothStyle = rng.pick(['heavy_armor', 'furs', 'tunic', 'noble', 'cowl']);
    const feature = rng.pick(['none', 'none', 'earrings', 'freckles', 'scar', 'war_paint']); 

    const lipDark = '#7F1D1D'; 
    const lipLight = '#BE123C'; 
    const lashColor = '#020617'; 

    // --- 2. FACIAL CONTOUR MAP ---
    const faceW = Array(GRID_SIZE).fill(0);
    const maxW = rng.pick([11, 12]); 

    for (let y = headTopY; y <= chinY; y++) {
        let w = 0;
        if (y <= eyeY) {
            const dy = (eyeY - y) / (eyeY - headTopY); 
            w = maxW * Math.pow(1 - Math.pow(dy, 2), 0.45); 
        } else {
            const dy = (y - eyeY) / (chinY - eyeY); 
            if (jawShape === 'round') w = maxW - 2.5 * Math.pow(dy, 1.8);
            else if (jawShape === 'soft_square') w = maxW - 1.2 * Math.pow(dy, 4);
            else if (jawShape === 'broad') w = maxW - 1.0 * Math.pow(dy, 2);
            else if (jawShape === 'heart') w = maxW - 4.0 * Math.pow(dy, 1.3);
        }
        faceW[y] = Math.max(6, Math.round(w)); 
    }

    // --- 3. BACKGROUND HAIR ---
    if (['thick_flowing', 'twin_braids'].includes(hairStyle)) {
        for (let y = eyeY; y < GRID_SIZE; y++) {
            let spread = 12 + (y - eyeY) * 0.25;
            spread = Math.floor(spread);
            for (let x = -spread; x <= spread; x++) {
                if (Math.abs(x) > 5) overPixel(cx + x, y, hair.shadow);
            }
        }
    }

    // --- 4. STOUT NECK & SHOULDERS ---
    const neckW = faceW[chinY] - 1; 
    for (let y = chinY - 3; y <= chinY + 5; y++) {
        for (let x = -neckW; x <= neckW; x++) {
            let c = skin.shadow;
            if (x < -neckW + 2) c = skin.base; 
            overPixel(cx + x, y, c);
        }
    }

    for (let y = chinY + 4; y < GRID_SIZE; y++) {
        const shoulderWidth = 10 + (y - (chinY + 4)) * 1.8; 
        for (let x = -Math.floor(shoulderWidth); x <= Math.floor(shoulderWidth); x++) {
            let c = cloth.base;
            if (x > shoulderWidth * 0.4) c = cloth.shadow;
            if (x < -shoulderWidth * 0.4) c = cloth.highlight;
            
            const isCenter = Math.abs(x) <= neckW;
            
            if (clothStyle === 'tunic' && isCenter && y < chinY + 6) continue;
            if (clothStyle === 'cowl' && Math.abs(x) < 8 && y < chinY + 8) c = cloth.highlight; 
            
            if (clothStyle === 'heavy_armor') {
                if (y % 4 === 0) c = cloth.highlight; 
                if (Math.abs(x) === neckW + 2 && y < chinY + 9) c = metal.base; 
            }
            if (clothStyle === 'furs' && (x*y)%3 !== 0) c = cloth.shadow; 
            if (clothStyle === 'noble' && isCenter && y < chinY + 9) c = '#FBBF24'; 
            
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
            overPixel(cx + x, y, c);
        }
    }

    // --- 6. EARS & EARRINGS ---
    for (let side of [-1, 1]) {
        for (let y = eyeY + 1; y <= noseY - 1; y++) {
            const w = faceW[y];
            const ex = cx + (side * (w + 1));
            overPixel(ex, y, skin.shadow);
            overPixel(ex, y + 1, skin.base);
        }
        if (feature === 'earrings') {
            const earLobeY = noseY;
            const ex = cx + (side * (faceW[earLobeY] + 1));
            overPixel(ex, earLobeY, metal.base); 
            overPixel(ex, earLobeY + 1, metal.high); 
        }
    }

    // --- 7. FACIAL FEATURES ---
    for (let side of [-1, 1]) {
        const ex = cx + (side * 4); 
        
        let browY = eyeY - 3;
        overPixel(ex - side*2, browY + 1, hair.base); 
        overPixel(ex - side, browY, hair.base); 
        overPixel(ex, browY, hair.base); 
        overPixel(ex + side, browY, hair.base);
        
        if (eyeShape === 'fierce') overPixel(ex - side, browY + 1, hair.base); 
        
        overPixel(ex - 1, eyeY - 1, lashColor);
        overPixel(ex, eyeY - 1, lashColor);
        overPixel(ex + 1, eyeY - 1, lashColor);

        overPixel(ex + side * 2, eyeY - 1, lashColor);
        if (eyeShape === 'almond') overPixel(ex + side * 3, eyeY - 2, lashColor); 
        else if (eyeShape === 'doe') overPixel(ex + side * 2, eyeY - 2, lashColor); 
        else if (eyeShape === 'heavy_lashes') {
            overPixel(ex + side * 2, eyeY - 2, lashColor);
            overPixel(ex + side * 3, eyeY - 2, lashColor);
        }
        
        if (eyeShape === 'doe' || eyeShape === 'heavy_lashes') {
            overPixel(ex - 1, eyeY, '#F8FAFC'); overPixel(ex + 1, eyeY, '#F8FAFC');
            overPixel(ex - 1, eyeY + 1, '#F8FAFC'); overPixel(ex + 1, eyeY + 1, '#F8FAFC');
            overPixel(ex, eyeY, eye.color); overPixel(ex, eyeY + 1, eye.color); 
        } else if (eyeShape === 'fierce') {
            overPixel(ex - 1, eyeY, '#F8FAFC'); overPixel(ex + 1, eyeY, skin.shadow);
            overPixel(ex, eyeY, eye.color);
        } else if (eyeShape === 'deep_set') {
            overPixel(ex - 1, eyeY, '#F8FAFC'); overPixel(ex + 1, eyeY, '#F8FAFC');
            overPixel(ex, eyeY, eye.color);
            overPixel(ex - 1, eyeY - 1, skin.shadow); overPixel(ex + 1, eyeY - 1, skin.shadow); 
        } else {
            overPixel(ex - 1, eyeY, '#F8FAFC'); overPixel(ex + 1, eyeY, '#F8FAFC');
            overPixel(ex, eyeY, eye.color);
        }
    }

    for (let y = eyeY + 1; y < noseY; y++) {
        overPixel(cx, y, skin.highlight); 
        if (noseShape !== 'button') overPixel(cx + 1, y, skin.shadow); 
    }
    
    if (noseShape === 'button') {
        overPixel(cx, noseY, skin.highlight); 
        overPixel(cx - 1, noseY + 1, skin.shadow); overPixel(cx + 1, noseY + 1, skin.shadow);
    } else if (noseShape === 'snub') {
        overPixel(cx, noseY - 1, skin.highlight); overPixel(cx, noseY, skin.shadow);
        overPixel(cx - 1, noseY, skin.shadow); overPixel(cx + 1, noseY, skin.shadow);
    } else if (noseShape === 'broad') {
        overPixel(cx - 2, noseY, skin.shadow); overPixel(cx - 1, noseY, skin.base);
        overPixel(cx, noseY, skin.highlight); overPixel(cx + 1, noseY, skin.base); overPixel(cx + 2, noseY, skin.shadow);
        overPixel(cx - 1, noseY + 1, skin.shadow); overPixel(cx + 1, noseY + 1, skin.shadow);
    } else {
        overPixel(cx, noseY, skin.highlight); 
        overPixel(cx, noseY + 1, skin.shadow); 
    }

    // Lips (Solid clean colors, zero white glints)
    const mw = mouthShape === 'wide' ? 4 : (mouthShape === 'thin' ? 2 : 3);
    for (let x = -mw + 1; x <= mw - 1; x++) overPixel(cx + x, mouthY, lipDark);
    for (let x = -mw; x <= mw; x++) overPixel(cx + x, mouthY + 1, lipLight);
    
    if (mouthShape === 'smile') {
        overPixel(cx - mw - 1, mouthY, lipDark); overPixel(cx + mw + 1, mouthY, lipDark);
    } else if (mouthShape === 'pout') {
        overPixel(cx, mouthY - 1, lipDark); 
        overPixel(cx, mouthY + 2, lipLight); 
    }
    
    overPixel(cx, mouthY + 3, skin.highlight); 

    // --- 8. FOREGROUND HAIR (Solid structured shapes) ---
    const hairLineY = headTopY + 2; 
    
    for (let y = headTopY - 8; y <= chinY + 12; y++) {
        // BUG FIX: If we are below the chin, lock the skull width to the jaw width!
        let skullW = (y <= chinY) ? (faceW[y] || 0) : (faceW[chinY] || 0);
        
        if (y < headTopY) {
            const dy = (headTopY - y) / 7.0; 
            if (dy >= 1) skullW = 0;
            else skullW = (faceW[headTopY] + 1) * Math.pow(1 - dy * dy, 0.5); 
        }
        if (skullW < 0) skullW = 0;
        
        for (let x = -skullW - 6; x <= skullW + 6; x++) {
            let draw = false;
            let isBraid = false;

            if (y < eyeY && Math.abs(x) <= skullW + 1) draw = true;

            if (hairStyle === 'short_curls') {
                if (y >= hairLineY && y < chinY && Math.abs(x) >= skullW - 1 && Math.abs(x) <= skullW + 3) draw = true; 
            } 
            else if (hairStyle === 'thick_flowing') {
                if (y >= hairLineY && y < chinY + 5 && Math.abs(x) >= skullW - 2 && Math.abs(x) <= skullW + 4) draw = true;
            } 
            else if (hairStyle === 'twin_braids') {
                // Braids perfectly aligned with the rings
                const braidCenter = skullW + 3;
                if (y >= eyeY && y < GRID_SIZE - 2 && Math.abs(x) >= braidCenter - 2 && Math.abs(x) <= braidCenter + 2) {
                    draw = true;
                    isBraid = true;
                }
            }
            else if (hairStyle === 'crown_braid') {
                if (y >= hairLineY - 1 && y <= hairLineY + 2 && Math.abs(x) <= skullW + 1) {
                    draw = true;
                    isBraid = true;
                }
            }
            else if (hairStyle === 'high_bun') {
                if (y >= headTopY - 7 && y < headTopY && Math.abs(x) <= 5) draw = true; 
            }
            else if (hairStyle === 'ponytail') {
                if (y >= hairLineY && y < eyeY - 1 && Math.abs(x) >= skullW - 1 && Math.abs(x) <= skullW + 1) draw = true;
            }

            // BANGS
            if (y >= hairLineY && y < eyeY) {
                if (bangStyle === 'fringe' && Math.abs(x) <= skullW) draw = true;
                if (bangStyle === 'swept' && x > -skullW && x < skullW && y < eyeY - 1 + (x * 0.3)) draw = true;
                if (bangStyle === 'parted' && Math.abs(x) <= skullW && Math.abs(x) > 1 + (y - hairLineY)*0.6) draw = true;
            }

            // MASK FACE
            if (y >= hairLineY && Math.abs(x) < skullW - 1) {
                let isBangs = false;
                if (y < eyeY) {
                    if (bangStyle === 'fringe') isBangs = true;
                    if (bangStyle === 'swept' && y < eyeY - 1 + (x * 0.3)) isBangs = true;
                    if (bangStyle === 'parted' && Math.abs(x) > 1 + (y - hairLineY)*0.6) isBangs = true;
                }
                if (!isBangs && !isBraid) draw = false;
                
                // Keep face clear of braids
                if (isBraid && y > eyeY && y < mouthY + 2 && Math.abs(x) < skullW) draw = false; 
            }

            if (draw) {
                let c = hair.base;
                
                if (isBraid) {
                    const braidCenter = x > 0 ? skullW + 3 : -skullW - 3;
                    if (Math.abs(x - braidCenter) === (y % 4)) c = hair.shadow; 
                } else {
                    // Smooth, solid vertical highlights
                    if (y > headTopY - 3 && x < 0 && x % 4 === 0) c = hairSoftHigh; 
                }
                
                if (x > skullW + 1) c = hair.shadow; 
                
                overPixel(cx + x, y, c);
            }
        }
    }

    // --- 9. BEARD RINGS (For Twin Braids) ---
    if (hairStyle === 'twin_braids') {
        const ringY1 = chinY + 2;
        const ringY2 = chinY + 8;[ringY1, ringY2].forEach(ry => {
            const w = faceW[chinY]; // Locked to the chin width!
            for (let side of[-1, 1]) {
                const bx = cx + (side * (w + 3)); 
                overPixel(bx - 2, ry, metal.base); 
                overPixel(bx - 1, ry, metal.base); 
                overPixel(bx, ry, metal.base); 
                overPixel(bx + 1, ry, metal.base);
                overPixel(bx + 2, ry, metal.base);
                overPixel(bx - 1, ry, metal.high); 
            }
        });
    }

    // --- 10. DETAILS ---
    if (feature === 'scar') {
        overPixel(cx - 4, eyeY + 2, '#7F1D1D'); overPixel(cx - 5, eyeY + 1, '#7F1D1D');
    }
    if (feature === 'war_paint') {
        const paintColor = '#1E3A8A'; 
        for (let x = -maxW; x <= maxW; x++) {
            if (grid[eyeY+3][cx+x] === skin.base || grid[eyeY+3][cx+x] === skin.highlight) overPixel(cx+x, eyeY+3, paintColor);
            if (Math.abs(x) % 3 === 0 && (grid[eyeY+4][cx+x] === skin.base || grid[eyeY+4][cx+x] === skin.highlight)) overPixel(cx+x, eyeY+4, paintColor);
        }
    }
    if (feature === 'freckles') {
        const darkenHex = (hex, factor) => {
            const r = Math.floor(parseInt(hex.slice(1, 3), 16) * factor);
            const g = Math.floor(parseInt(hex.slice(3, 5), 16) * factor);
            const b = Math.floor(parseInt(hex.slice(5, 7), 16) * factor);
            return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        };
        const soot = darkenHex(skin.base, 0.75); 
        for (let i = 0; i < 10; i++) {
            const dx = rng.int(-6, 6);
            const dy = rng.int(eyeY + 2, noseY + 1);
            if (grid[dy][cx + dx] === skin.base || grid[dy][cx + dx] === skin.highlight) {
                overPixel(cx + dx, dy, soot); 
            }
        }
    }

    // --- 11. OUTLINE PASS ---
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

    // --- 12. RENDER ---
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            let colorCode = grid[y][x] || outlineGrid[y][x];
            if (colorCode) drawScaledRect(ctx, x, y, 1, 1, colorCode, DISPLAY_SCALE);
        }
    }

    return {
        imageDataUrl: offscreenCanvas.toDataURL(),
        data: { jawShape, noseShape, eyeShape, hairStyle, bangStyle, clothStyle, feature }
    };
}