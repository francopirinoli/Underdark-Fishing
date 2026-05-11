/**
 * js/art/orc_male.js
 * Generates highly varied Orc Male portraits.
 * V5 - Complete Overhaul: Fixed hair collapse bug, removed noisy dithering, 
 * applied squircle skull math, solid beard structures, and clean shading.
 */

import { drawScaledRect } from '../util/utils.js';

const GRID_SIZE = 64;
const DISPLAY_SCALE = 4;
const CANVAS_SIZE = GRID_SIZE * DISPLAY_SCALE;

export function generateOrcMale(options = {}) {
    const rng = options.rng;
    const skin = options.skin;
    const hair = options.hair;
    const eye = options.eye;
    const cloth = options.cloth;

    const metals =[
        { base: '#475569', high: '#94A3B8' }, // Iron
        { base: '#3F3F46', high: '#71717A' }, // Dark Steel
        { base: '#7C2D12', high: '#B45309' }  // Rusted/Bronze
    ];
    const metal = rng.pick(metals);

    // Color Blending Helpers for clean, natural shading
    const hex2rgb = h =>[parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
    const rgb2hex = ([r,g,b]) => `#${(1<<24|(r<<16)|(g<<8)|b).toString(16).slice(1).padStart(6, '0')}`;
    const blend = (c1, c2, t) => rgb2hex(hex2rgb(c1).map((v,i) => Math.round(v + (hex2rgb(c2)[i]-v)*t)));
    
    const hairSoftHigh = blend(hair.base, hair.highlight, 0.4);
    const lipDark = blend(skin.shadow, '#7F1D1D', 0.4);
    const stubbleColor = blend(skin.shadow, hair.base, 0.4); // Clean 5 o'clock shadow
    const lashColor = '#020617';

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
    const headTopY = 16; 
    const eyeY = 29;
    const noseY = 38;
    const mouthY = 45;
    const chinY = 51; // Heavy, long lower jaw

    // --- 1. PROCEDURAL PARAMETERS ---
    const jawShape = rng.pick(['underbite', 'heavy_jowls', 'blocky']);
    const noseShape = rng.pick(['flat', 'snub', 'broken', 'broad']);
    const mouthShape = rng.pick(['snarl', 'frown', 'grimace']);
    const eyeShape = rng.pick(['fierce', 'deep_set', 'squint', 'glowing']);
    
    const tuskStyle = rng.pick(['large', 'broken', 'asymmetric', 'small']);
    const browStyle = rng.pick(['heavy', 'unibrow', 'scarred', 'angled']);
    
    const hairStyle = rng.pick(['bald', 'mohawk', 'top_knot', 'dreadlocks', 'undercut', 'messy_tuft']);
    const beardStyle = rng.pick(['none', 'stubble', 'braided_goatee', 'chops', 'rough_beard']);
    
    const clothStyle = rng.pick(['furs', 'spiked_armor', 'leather', 'bare_chested']);
    const feature = rng.pick(['none', 'none', 'scar', 'war_paint', 'eyepatch', 'torn_ear']); 

    // --- 2. FACIAL CONTOUR MAP ---
    const faceW = Array(GRID_SIZE).fill(0);
    const maxW = rng.pick([11, 12]); // Base skull width

    for (let y = headTopY; y <= chinY; y++) {
        let w = 0;
        if (y <= eyeY) {
            const dy = (eyeY - y) / (eyeY - headTopY); 
            // V5 FIX: Broad squircle dome instead of sharp angle
            w = maxW * Math.pow(1 - Math.pow(dy, 2.5), 0.35); 
        } else {
            const dy = (y - eyeY) / (chinY - eyeY); 
            // ORC JAW MATH: Expands OUTWARD or drops straight down heavily
            if (jawShape === 'underbite') w = maxW + (dy * 2.5); 
            else if (jawShape === 'heavy_jowls') w = maxW + Math.pow(dy, 2) * 3;
            else if (jawShape === 'blocky') w = maxW + 0.5;
        }
        faceW[y] = Math.max(7, Math.round(w)); 
    }

    // --- 3. BACKGROUND HAIR ---
    if (hairStyle === 'dreadlocks') {
        for (let y = eyeY - 2; y < GRID_SIZE; y++) {
            // Smoothly expand from skull width
            let spread = (faceW[y] || faceW[chinY]) + 2; 
            if (y >= chinY) spread += (y - chinY) * 0.25;
            spread = Math.floor(spread);
            
            for (let x = -spread; x <= spread; x++) {
                if (Math.abs(x) > maxW - 1) overPixel(cx + x, y, hair.shadow);
            }
        }
    }

    // --- 4. MASSIVE NECK & SHOULDERS ---
    const neckW = faceW[chinY]; // Neck is literally as wide as the jaw
    for (let y = chinY - 4; y <= chinY + 5; y++) {
        for (let x = -neckW; x <= neckW; x++) {
            let c = skin.shadow;
            if (x < -neckW + 3) c = skin.base; 
            overPixel(cx + x, y, c);
        }
    }

    for (let y = chinY + 4; y < GRID_SIZE; y++) {
        const shoulderWidth = 12 + (y - (chinY + 4)) * 2.0; 
        for (let x = -Math.floor(shoulderWidth); x <= Math.floor(shoulderWidth); x++) {
            let c = cloth.base;
            
            if (clothStyle === 'bare_chested') {
                c = skin.base;
                if (x > shoulderWidth * 0.4) c = skin.shadow;
                if (x < -shoulderWidth * 0.4) c = skin.highlight;
                // V5 FIX: Clean Collarbone and Pectoral lines
                if (Math.abs(x) < neckW && y > chinY + 5 && y < chinY + 8 && Math.abs(x) > 2) c = skin.shadow;
                if (x === 0 && y > chinY + 8) c = skin.shadow; // Sternum cleft
                if (y === chinY + 12 && Math.abs(x) < 7 && Math.abs(x) > 1) c = skin.shadow; // Pectoral bottom
            } else {
                if (x > shoulderWidth * 0.4) c = cloth.shadow;
                if (x < -shoulderWidth * 0.4) c = cloth.highlight;
                
                const isCenter = Math.abs(x) <= neckW - 1;
                if (clothStyle === 'leather' && isCenter && y < chinY + 7) continue; 
                
                if (clothStyle === 'spiked_armor') {
                    if ((x + y) % 4 === 0) c = metal.base; 
                    if (Math.abs(x) === neckW + 3 && y % 3 === 0) c = metal.high; // Spikes on shoulders
                }
                if (clothStyle === 'furs' && (x*y)%3 !== 0) c = cloth.shadow; 
            }
            
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
            if (y > chinY - 2) c = skin.shadow;     
            
            // Heavy sunken cheeks
            if (y > noseY + 2 && y < mouthY && Math.abs(x) >= w - 3) {
                if ((x+y) % 2 === 0) c = skin.shadow; 
            }
            
            overPixel(cx + x, y, c);
        }
    }

    // --- 6. EARS (Pointed, but rugged/torn) ---
    for (let side of [-1, 1]) {
        for (let e = 1; e <= 4; e++) {
            const y = eyeY + Math.floor(e * 0.5);
            const ex = cx + side * (faceW[y] + e);
            
            if (feature === 'torn_ear' && side === 1 && e === 3) continue; // Chunk missing
            
            overPixel(ex, y, skin.shadow);
            overPixel(ex, y + 1, skin.base);
            overPixel(ex, y + 2, skin.shadow);
            if (side === -1) overPixel(ex, y, skin.highlight);
        }
    }

    // --- 7. FACIAL FEATURES ---
    
    // Eyes & Heavy Brows
    for (let side of [-1, 1]) {
        const ex = cx + (side * 4); 
        
        let browY = eyeY - 2;
        overPixel(ex - side*2, browY, hair.base); overPixel(ex - side, browY, hair.base); 
        overPixel(ex, browY, hair.base); overPixel(ex + side, browY, hair.base);
        overPixel(ex + side*2, browY + 1, hair.base); // Slopes down heavily
        
        if (browStyle === 'unibrow') {
            overPixel(cx, browY, hair.base); overPixel(cx - 1, browY, hair.base); overPixel(cx + 1, browY, hair.base);
        } else if (browStyle === 'angled') {
            overPixel(ex - side, browY + 1, hair.base); 
            overPixel(ex, browY + 1, hair.base); // Low over the eye
        } else if (browStyle === 'heavy') {
            overPixel(ex - side, browY - 1, hair.base); overPixel(ex, browY - 1, hair.base); 
            overPixel(ex + side, browY - 1, hair.base);
        } else if (browStyle === 'scarred' && side === 1) {
            overPixel(ex, browY, skin.base); 
        }

        if (feature === 'eyepatch' && side === 1) {
            for(let dx = -faceW[eyeY]; dx <= faceW[eyeY]; dx++) if (dx > 0) overPixel(cx + dx, eyeY - 1, '#111827');
            for(let dy=-1; dy<=2; dy++) for(let dx=1; dx<=5; dx++) if(Math.abs(dx-3)+Math.abs(dy-0.5)<=2.5) overPixel(cx+dx, eyeY+dy, '#111827');
        } else {
            if (eyeShape === 'glowing') {
                overPixel(ex, eyeY, eye.color); overPixel(ex + side, eyeY, eye.color);
                overPixel(ex, eyeY - 1, eye.color);
            } else if (eyeShape === 'squint') {
                overPixel(ex - 1, eyeY, skin.shadow); overPixel(ex + 1, eyeY, skin.shadow);
                overPixel(ex, eyeY, eye.color);
            } else if (eyeShape === 'fierce') {
                overPixel(ex - 1, eyeY, '#F8FAFC'); overPixel(ex + 1, eyeY, skin.shadow);
                overPixel(ex, eyeY, eye.color);
            } else {
                // Deep set
                overPixel(ex - 1, eyeY, '#F8FAFC'); overPixel(ex + 1, eyeY, '#F8FAFC');
                overPixel(ex, eyeY, eye.color);
                overPixel(ex - 1, eyeY - 1, skin.shadow); overPixel(ex + 1, eyeY - 1, skin.shadow); 
            }
            overPixel(ex, eyeY + 1, skin.shadow); // Heavy bags
        }
    }

    // Wide, flat nose
    for (let y = eyeY + 1; y < noseY; y++) {
        overPixel(cx, y, skin.highlight); 
        overPixel(cx + 1, y, skin.shadow);
    }
    
    if (noseShape === 'flat' || noseShape === 'broad') {
        overPixel(cx - 2, noseY, skin.shadow); overPixel(cx - 1, noseY, skin.base);
        overPixel(cx, noseY, skin.highlight); overPixel(cx + 1, noseY, skin.base); overPixel(cx + 2, noseY, skin.shadow);
        overPixel(cx - 2, noseY + 1, skin.shadow); overPixel(cx + 2, noseY + 1, skin.shadow); // Flared nostrils
    } else if (noseShape === 'snub') {
        overPixel(cx, noseY - 1, skin.highlight); 
        overPixel(cx - 1, noseY, skin.shadow); overPixel(cx + 1, noseY, skin.shadow);
        overPixel(cx, noseY + 1, skin.shadow); // Pig-like upturn
    } else if (noseShape === 'broken') {
        overPixel(cx + 1, noseY - 2, skin.highlight); 
        overPixel(cx - 1, noseY, skin.shadow); overPixel(cx, noseY, skin.highlight); 
        overPixel(cx + 1, noseY, skin.base); overPixel(cx + 2, noseY, skin.shadow);
    }

    // Mouth
    const mw = 4; // Very wide mouth
    
    if (mouthShape === 'snarl') {
        for (let x = -mw; x <= mw; x++) overPixel(cx + x, mouthY, lipDark);
        overPixel(cx - mw, mouthY - 1, lipDark); overPixel(cx + mw, mouthY - 1, lipDark); 
    } else if (mouthShape === 'grimace') {
        for (let x = -mw; x <= mw; x++) {
            overPixel(cx + x, mouthY, lipDark);
            if (x % 2 === 0) overPixel(cx + x, mouthY, '#F8FAFC'); // Gritted teeth showing
        }
    } else {
        for (let x = -mw + 1; x <= mw - 1; x++) overPixel(cx + x, mouthY, lipDark);
        overPixel(cx - mw, mouthY + 1, lipDark); overPixel(cx + mw, mouthY + 1, lipDark);
    }
    overPixel(cx, mouthY + 1, skin.base); 

    // --- 8. THE TUSKS ---
    for (let side of [-1, 1]) {
        let tuskH = 4;
        if (tuskStyle === 'small') tuskH = 2;
        if (tuskStyle === 'broken' && side === 1) tuskH = 1;
        if (tuskStyle === 'asymmetric' && side === -1) tuskH = 5;
        
        const tx = cx + (side * 3);
        for(let ty = 0; ty <= tuskH; ty++) {
            const py = mouthY - ty;
            if (ty === tuskH) {
                overPixel(tx, py, '#FFFFFF'); // Sharp tip
            } else {
                overPixel(tx, py, '#F5F5F4'); // Tusk body
                overPixel(tx + side, py, '#D6D3D1'); // Tusk shadow
            }
        }
    }

    // --- 9. FOREGROUND HAIR ---
    const hairLineY = headTopY + 2; 
    
    if (hairStyle !== 'bald') {
        for (let y = headTopY - 6; y <= chinY; y++) {
            // FIX: Lock width below chin to prevent hair collapse
            let skullW = (y <= chinY) ? (faceW[y] || 0) : (faceW[chinY] || 0);
            if (y < headTopY) {
                const dy = (headTopY - y) / 6.0; 
                if (dy >= 1) skullW = 0;
                else skullW = (faceW[headTopY] + 1) * Math.pow(1 - dy * dy, 0.5); 
            }
            if (skullW < 0) skullW = 0;
            
            for (let x = -skullW - 2; x <= skullW + 2; x++) {
                let draw = false;
                let isStubble = false;

                if (hairStyle === 'mohawk') {
                    if (y < hairLineY && Math.abs(x) <= 3) draw = true;
                    if (y >= headTopY - 6 && y < headTopY && Math.abs(x) <= 2) draw = true; 
                    if (y >= hairLineY && y < eyeY && Math.abs(x) >= 4 && Math.abs(x) <= skullW) isStubble = true;
                } 
                else if (hairStyle === 'undercut') {
                    if (y < hairLineY && Math.abs(x) <= skullW + 1) draw = true;
                    if (y >= headTopY - 4 && y < headTopY && Math.abs(x) <= skullW) draw = true;
                    if (y >= hairLineY && y < eyeY && Math.abs(x) >= skullW - 1) isStubble = true;
                } 
                else if (hairStyle === 'top_knot') {
                    if (y < hairLineY && Math.abs(x) <= skullW) isStubble = true;
                    if (y >= headTopY - 6 && y <= headTopY && Math.abs(x) <= 3) draw = true; 
                } 
                else if (hairStyle === 'messy_tuft') {
                    if (y < hairLineY + 2 && Math.abs(x) <= skullW) {
                        const drop = Math.abs(x) % 3;
                        if (y <= hairLineY + drop) draw = true;
                    }
                } 
                else if (hairStyle === 'dreadlocks') {
                    if (y < hairLineY && Math.abs(x) <= skullW + 1) draw = true;
                    if (y >= hairLineY && y < chinY && Math.abs(x) >= skullW - 1 && Math.abs(x) <= skullW + 2) draw = true;
                }

                if (y >= hairLineY && Math.abs(x) < skullW - 1 && hairStyle !== 'messy_tuft') draw = false;

                if (isStubble) {
                    overPixel(cx + x, y, stubbleColor);
                } else if (draw) {
                    let c = hair.base;
                    
                    if (hairStyle === 'dreadlocks') {
                        if (Math.abs(x) % 3 === 2) c = hair.shadow; 
                    } else {
                        if (y > headTopY - 3 && x < 0 && x % 3 === 0) c = hairSoftHigh; 
                    }
                    
                    if (x > skullW - 1) c = hair.shadow; 
                    overPixel(cx + x, y, c);
                }
            }
        }
    }

    // --- 10. BEARD / JAW HAIR ---
    if (beardStyle !== 'none') {
        for (let y = mouthY + 1; y <= chinY + 4; y++) {
            let jawW = faceW[y]; 
            if (!jawW) jawW = faceW[chinY];

            for (let x = -jawW - 2; x <= jawW + 2; x++) {
                let draw = false;
                
                if (beardStyle === 'stubble') {
                    if (Math.abs(x) <= jawW && (x+y)%2===0) overPixel(cx + x, y, stubbleColor); 
                    continue;
                }
                
                if (beardStyle === 'braided_goatee') {
                    if (y > chinY - 1 && y < chinY + 5 && Math.abs(x) <= 2) draw = true;
                    if (y === chinY + 3 && Math.abs(x) <= 2) overPixel(cx + x, y, metal.base); // Tie ring
                } else if (beardStyle === 'chops') {
                    if (Math.abs(x) >= jawW - 3 && Math.abs(x) <= jawW) draw = true;
                } else if (beardStyle === 'rough_beard') {
                    if (y >= mouthY + 1 && Math.abs(x) <= jawW) draw = true;
                    if (y > chinY && y < chinY + 4 && Math.abs(x) <= jawW - (y-chinY)*1.5) draw = true;
                }

                // Keep mouth opening clear (Expose tusks)
                if (Math.abs(x) <= 3 && y < chinY && beardStyle !== 'braided_goatee') draw = false; 

                if (draw) {
                    let c = hair.base;
                    if ((x+y)%3===0) c = hairSoftHigh; // Solid structured shading
                    if (x > jawW - 1 || y > chinY + 1) c = hair.shadow; 
                    overPixel(cx + x, y, c);
                }
            }
        }
    }

    // --- 11. DETAILS & WAR PAINT ---
    if (feature === 'scar') {
        overPixel(cx - 4, eyeY + 2, '#7F1D1D'); overPixel(cx - 5, eyeY + 1, '#7F1D1D');
    }
    
    if (feature === 'war_paint') {
        const paintBase = rng.pick(['#7F1D1D', '#020617', '#B45309']); // Blood, Black, Ochre
        const paintShadow = blend(paintBase, '#000000', 0.4); 
        const paintStyle = rng.pick(['jaw_line', 'eye_band', 'hand_print']);
        
        for (let y = eyeY - 2; y <= chinY; y++) {
            const w = faceW[y];
            for (let x = -w; x <= w; x++) {
                const currentC = grid[y][cx+x];
                let isSkin = (currentC === skin.base || currentC === skin.highlight);
                let isShadow = (currentC === skin.shadow);
                
                if (!isSkin && !isShadow) continue;
                
                let drawPaint = false;
                if (paintStyle === 'jaw_line' && y > mouthY && Math.abs(x) > 3) drawPaint = true;
                if (paintStyle === 'eye_band' && y >= eyeY - 1 && y <= eyeY + 1) drawPaint = true;
                if (paintStyle === 'hand_print' && Math.abs(x) < 4 && y >= noseY && y <= mouthY && (x+y)%2 === 0) drawPaint = true;
                
                if (drawPaint) overPixel(cx+x, y, isShadow ? paintShadow : paintBase);
            }
        }
    }

    // --- 12. OUTLINE PASS ---
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

    // --- 13. RENDER ---
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            let colorCode = grid[y][x] || outlineGrid[y][x];
            if (grid[y][x] === '#111827') colorCode = grid[y][x]; 
            if (colorCode) drawScaledRect(ctx, x, y, 1, 1, colorCode, DISPLAY_SCALE);
        }
    }

    return {
        imageDataUrl: offscreenCanvas.toDataURL(),
        data: { jawShape, noseShape, eyeShape, hairStyle, beardStyle, tuskStyle, clothStyle, feature }
    };
}