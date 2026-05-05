/**
 * js/art/orc_female.js
 * Generates highly varied Orc Female portraits.
 * V3 - Fixed "Collapse to Zero" hair bug causing fake beards, 
 * overhauled war paint to respect 3D shading, and improved textures.
 */

import { drawScaledRect } from '../util/utils.js';

const GRID_SIZE = 64;
const DISPLAY_SCALE = 4;
const CANVAS_SIZE = GRID_SIZE * DISPLAY_SCALE;

export function generateOrcFemale(options = {}) {
    const rng = options.rng;
    const skin = options.skin;
    const hair = options.hair;
    const eye = options.eye;
    const cloth = options.cloth;

    const metals =[
        { base: '#475569', high: '#94A3B8' }, // Iron
        { base: '#3F3F46', high: '#71717A' }, // Dark Steel
        { base: '#7C2D12', high: '#B45309' }, // Rusted
        { base: '#F59E0B', high: '#FEF08A' }  // Gold/Brass
    ];
    const metal = rng.pick(metals);

    // Color Blending Helpers
    const hex2rgb = h =>[parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
    const rgb2hex = ([r,g,b]) => `#${(1<<24|(r<<16)|(g<<8)|b).toString(16).slice(1).padStart(6, '0')}`;
    const blend = (c1, c2, t) => rgb2hex(hex2rgb(c1).map((v,i) => Math.round(v + (hex2rgb(c2)[i]-v)*t)));
    
    const hairSoftHigh = blend(hair.base, hair.highlight, 0.4);

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
    const mouthY = 44;
    const chinY = 50; 

    // --- 1. PROCEDURAL PARAMETERS ---
    const jawShape = rng.pick(['underbite', 'strong_square', 'wide_round']);
    const noseShape = rng.pick(['flat', 'snub', 'broad']);
    const mouthShape = rng.pick(['full', 'smirk', 'frown', 'pout']);
    const eyeShape = rng.pick(['fierce', 'almond', 'slanted', 'heavy_lashes']);
    
    const tuskStyle = rng.pick(['small', 'medium', 'broken', 'asymmetric']);
    const hairStyle = rng.pick(['wild_braids', 'dreadlocks', 'war_hawk', 'shaved_sides', 'messy_long', 'high_ponytail']);
    const bangStyle = rng.pick(['none', 'swept', 'fringe']);
    
    const clothStyle = rng.pick(['furs', 'spiked_armor', 'leather', 'tunic']);
    const feature = rng.pick(['none', 'none', 'scar', 'war_paint', 'earrings', 'torn_ear']); 

    const lipDark = '#7F1D1D'; 
    const lipLight = '#9F1239'; 
    const lashColor = '#020617'; 

    // --- 2. FACIAL CONTOUR MAP ---
    const faceW = Array(GRID_SIZE).fill(0);
    const maxW = rng.pick([10, 11]); 

    for (let y = headTopY; y <= chinY; y++) {
        let w = 0;
        if (y <= eyeY) {
            const dy = (eyeY - y) / (eyeY - headTopY); 
            w = maxW * Math.pow(1 - Math.pow(dy, 2), 0.45); 
        } else {
            const dy = (y - eyeY) / (chinY - eyeY); 
            if (jawShape === 'underbite') w = maxW + (dy * 1.5); 
            else if (jawShape === 'strong_square') w = maxW - 0.5 * Math.pow(dy, 4); 
            else if (jawShape === 'wide_round') w = maxW + Math.sin(dy * Math.PI) * 1.2; 
        }
        faceW[y] = Math.max(6, Math.round(w)); 
    }

    // --- 3. BACKGROUND HAIR ---
    if (['wild_braids', 'dreadlocks', 'messy_long', 'high_ponytail'].includes(hairStyle)) {
        for (let y = eyeY; y < GRID_SIZE; y++) {
            let spread = faceW[chinY] + 3 + (y - eyeY) * 0.25;
            if (hairStyle === 'high_ponytail') spread -= (y - eyeY) * 0.15;
            spread = Math.floor(spread);
            
            for (let x = -spread; x <= spread; x++) {
                if (Math.abs(x) > maxW - 1) overPixel(cx + x, y, hair.shadow);
            }
        }
    }

    // --- 4. THICK NECK & SHOULDERS ---
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
            
            const isCenter = Math.abs(x) <= neckW - 1;
            if (clothStyle === 'tunic' && isCenter && y < chinY + 7) continue; 
            if (clothStyle === 'leather' && isCenter && y < chinY + 8) continue; 
            
            if (clothStyle === 'spiked_armor') {
                if ((x + y) % 4 === 0) c = metal.base; 
                if (Math.abs(x) === neckW + 3 && y % 4 === 0) c = metal.high; 
            }
            if (clothStyle === 'furs' && (x*y)%3 !== 0) c = cloth.shadow; 
            
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

    // --- 6. EARS (Pointed, Torn, Earrings) ---
    for (let side of [-1, 1]) {
        for (let e = 1; e <= 4; e++) {
            const y = eyeY + Math.floor(e * 0.5);
            const ex = cx + side * (faceW[y] + e);
            
            if (feature === 'torn_ear' && side === 1 && e === 2) continue; 
            
            overPixel(ex, y, skin.shadow);
            overPixel(ex, y + 1, skin.base);
            overPixel(ex, y + 2, skin.shadow);
            if (side === -1) overPixel(ex, y, skin.highlight);
        }
        if (feature === 'earrings') {
            const ex = cx + side * (faceW[noseY - 1] + 1);
            overPixel(ex, noseY - 1, metal.base);
            overPixel(ex, noseY, metal.high);
        }
    }

    // --- 7. FACIAL FEATURES ---
    for (let side of [-1, 1]) {
        const ex = cx + (side * 4); 
        
        let browY = eyeY - 3;
        overPixel(ex - side*2, browY + 1, hair.base); overPixel(ex - side, browY, hair.base); 
        overPixel(ex, browY, hair.base); overPixel(ex + side, browY, hair.base);
        
        if (eyeShape === 'fierce' || eyeShape === 'slanted') {
            overPixel(ex - side, browY + 1, hair.base); 
        } else {
            overPixel(ex + side*2, browY + 1, hair.base); 
        }

        overPixel(ex - 1, eyeY - 1, lashColor);
        overPixel(ex, eyeY - 1, lashColor);
        overPixel(ex + 1, eyeY - 1, lashColor);

        overPixel(ex + side * 2, eyeY - 1, lashColor);
        if (eyeShape === 'heavy_lashes') {
            overPixel(ex + side * 2, eyeY - 2, lashColor);
            overPixel(ex + side * 3, eyeY - 2, lashColor);
        } else if (eyeShape === 'slanted' || eyeShape === 'almond') {
            overPixel(ex + side * 3, eyeY - 2, lashColor); 
        }

        if (eyeShape === 'fierce') {
            overPixel(ex - 1, eyeY, '#F8FAFC'); overPixel(ex + 1, eyeY, skin.shadow);
            overPixel(ex, eyeY, eye.color);
        } else if (eyeShape === 'doe') {
            overPixel(ex - 1, eyeY, '#F8FAFC'); overPixel(ex + 1, eyeY, '#F8FAFC');
            overPixel(ex - 1, eyeY + 1, '#F8FAFC'); overPixel(ex + 1, eyeY + 1, '#F8FAFC');
            overPixel(ex, eyeY, eye.color); overPixel(ex, eyeY + 1, eye.color); 
        } else {
            overPixel(ex - 1, eyeY, '#F8FAFC'); overPixel(ex + 1, eyeY, '#F8FAFC');
            overPixel(ex, eyeY, eye.color);
        }
    }

    for (let y = eyeY + 1; y < noseY; y++) {
        overPixel(cx, y, skin.highlight); 
        overPixel(cx + 1, y, skin.shadow);
    }
    
    if (noseShape === 'flat' || noseShape === 'broad') {
        overPixel(cx - 2, noseY, skin.shadow); overPixel(cx - 1, noseY, skin.base);
        overPixel(cx, noseY, skin.highlight); overPixel(cx + 1, noseY, skin.base); overPixel(cx + 2, noseY, skin.shadow);
        overPixel(cx - 2, noseY + 1, skin.shadow); overPixel(cx + 2, noseY + 1, skin.shadow); 
    } else if (noseShape === 'snub') {
        overPixel(cx, noseY - 1, skin.highlight); 
        overPixel(cx - 1, noseY, skin.shadow); overPixel(cx + 1, noseY, skin.shadow);
        overPixel(cx, noseY + 1, skin.shadow); 
    }

    const mw = mouthShape === 'pout' || mouthShape === 'full' ? 3 : 4;
    
    for (let x = -mw + 1; x <= mw - 1; x++) overPixel(cx + x, mouthY, lipDark);
    for (let x = -mw; x <= mw; x++) overPixel(cx + x, mouthY + 1, lipLight);
    
    if (mouthShape === 'smile' || mouthShape === 'smirk') {
        overPixel(cx - mw - 1, mouthY, lipDark); overPixel(cx + mw + 1, mouthY, lipDark);
    } else if (mouthShape === 'frown') {
        overPixel(cx - mw, mouthY + 1, lipDark); overPixel(cx + mw, mouthY + 1, lipDark);
    }
    
    overPixel(cx, mouthY + 3, skin.highlight); 

    for (let side of[-1, 1]) {
        let tuskH = 3; 
        if (tuskStyle === 'small') tuskH = 1;
        if (tuskStyle === 'broken' && side === 1) tuskH = 0;
        if (tuskStyle === 'asymmetric' && side === -1) tuskH = 4;
        
        const tx = cx + (side * (mw - 1)); 
        for(let ty = 0; ty <= tuskH; ty++) {
            const py = mouthY + 1 - ty; 
            if (ty === tuskH) {
                overPixel(tx, py, '#FFFFFF'); 
            } else {
                overPixel(tx, py, '#F5F5F4'); 
                overPixel(tx + side, py, '#D6D3D1'); 
            }
        }
    }

    // --- 9. FOREGROUND HAIR ---
    const hairLineY = headTopY + 2; 
    
    for (let y = headTopY - 6; y <= chinY + 12; y++) {
        // FIX: The "Beard" bug is fixed here!
        // Lock the width to the chin width if we go below the chin.
        let skullW = (y <= chinY) ? (faceW[y] || 0) : (faceW[chinY] || 0);
        
        if (y < headTopY) {
            const dy = (headTopY - y) / 6.0; 
            if (dy >= 1) skullW = 0;
            else skullW = (faceW[headTopY] + 1) * Math.pow(1 - dy * dy, 0.5); 
        }
        if (skullW < 0) skullW = 0;
        
        for (let x = -skullW - 6; x <= skullW + 6; x++) {
            let draw = false;
            let isStubble = false;
            let isBraid = false;

            if (y < eyeY && Math.abs(x) <= skullW + 1) draw = true;

            if (hairStyle === 'war_hawk') {
                if (y < hairLineY && Math.abs(x) <= 3) draw = true;
                if (y >= headTopY - 6 && y < headTopY && Math.abs(x) <= 2) draw = true; 
            } 
            else if (hairStyle === 'shaved_sides') {
                if (y < hairLineY && Math.abs(x) <= skullW) draw = true;
                if (y >= hairLineY && Math.abs(x) >= skullW - 1 && y < eyeY) {
                    overPixel(cx + x, y, skin.shadow); 
                    continue;
                }
            } 
            else if (hairStyle === 'messy_long') {
                if (y >= hairLineY && y < chinY + 5 && Math.abs(x) >= skullW - 1 && Math.abs(x) <= skullW + 4) {
                    if (rng.chance(0.85)) draw = true; 
                }
            }
            else if (hairStyle === 'high_ponytail') {
                if (y >= headTopY - 7 && y <= headTopY && Math.abs(x) <= 4) draw = true; 
            }
            else if (hairStyle === 'dreadlocks' || hairStyle === 'wild_braids') {
                if (y >= hairLineY && y < chinY + 8 && Math.abs(x) >= skullW - 1 && Math.abs(x) <= skullW + 4) {
                    draw = true;
                    if (hairStyle === 'wild_braids') isBraid = true;
                }
            }

            if (y >= hairLineY && y < eyeY) {
                if (bangStyle === 'fringe' && Math.abs(x) <= skullW) draw = true;
                if (bangStyle === 'swept' && x > -skullW && x < skullW && y < eyeY - 1 + (x * 0.3)) draw = true;
            }

            if (y >= hairLineY && Math.abs(x) < skullW - 1) {
                let isBangs = false;
                if (y < eyeY) {
                    if (bangStyle === 'fringe') isBangs = true;
                    if (bangStyle === 'swept' && y < eyeY - 1 + (x * 0.3)) isBangs = true;
                }
                if (!isBangs && !isBraid && !isStubble) draw = false;
                if (isBraid && y > eyeY && y < mouthY + 2 && Math.abs(x) < skullW - 1) draw = false; 
            }

            if (draw) {
                let c = hair.base;
                if (isStubble) {
                    c = skin.shadow; 
                } 
                else if (isBraid) {
                    if ((x+y)%4 === 0) c = hair.shadow; 
                } 
                else if (hairStyle === 'dreadlocks') {
                    if (Math.abs(x) % 3 !== 2) c = hair.shadow; 
                } 
                else {
                    if (y > headTopY - 3 && x < 0 && x % 4 === 0) c = hairSoftHigh; 
                }
                
                if (x > skullW + 1 && !isStubble) c = hair.shadow; 
                overPixel(cx + x, y, c);
            }
        }
    }

    // --- 10. CLEAN WAR PAINT ---
    if (feature === 'war_paint') {
        const paintBase = rng.pick(['#7F1D1D', '#020617', '#1E3A8A']); 
        const paintShadow = blend(paintBase, '#000000', 0.4); 
        const paintStyle = rng.pick(['jaw_stripes', 'eye_mask', 'war_tears']);
        
        for (let y = eyeY - 2; y <= chinY; y++) {
            const w = faceW[y];
            for (let x = -w; x <= w; x++) {
                const currentC = grid[y][cx+x];
                let isSkin = (currentC === skin.base || currentC === skin.highlight);
                let isShadow = (currentC === skin.shadow);
                
                // Only paint over skin/shadows (protects teeth, eyes, hair)
                if (!isSkin && !isShadow) continue;
                
                let drawPaint = false;
                
                if (paintStyle === 'jaw_stripes') {
                    if (y > noseY && Math.abs(x) > w - 4 && (x+y)%3 === 0) drawPaint = true;
                } else if (paintStyle === 'eye_mask') {
                    if (y >= eyeY - 1 && y <= eyeY + 1) drawPaint = true;
                } else if (paintStyle === 'war_tears') {
                    if (y >= eyeY + 1 && y <= noseY + 2 && (Math.abs(x) === 2 || Math.abs(x) === 4)) drawPaint = true;
                }
                
                if (drawPaint) {
                    overPixel(cx+x, y, isShadow ? paintShadow : paintBase);
                }
            }
        }
    }

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

    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            let colorCode = grid[y][x] || outlineGrid[y][x];
            if (colorCode) drawScaledRect(ctx, x, y, 1, 1, colorCode, DISPLAY_SCALE);
        }
    }

    return {
        imageDataUrl: offscreenCanvas.toDataURL(),
        data: { jawShape, noseShape, eyeShape, tuskStyle, hairStyle, bangStyle, clothStyle, feature }
    };
}