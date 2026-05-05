/**
 * js/art/orc_male.js
 * Generates highly varied Orc Male portraits.
 * V1 - Features heavy underbites, dynamic tusks, brutalist hairstyles, 
 * war paint, thick necks, and fierce deep-set eyes.
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

    // Color Blending Helper
    const hex2rgb = h =>[parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
    const rgb2hex = ([r,g,b]) => `#${(1<<24|(r<<16)|(g<<8)|b).toString(16).slice(1)}`;
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
    
    const hairStyle = rng.pick(['bald', 'mohawk', 'top_knot', 'dreadlocks', 'shaved_sides', 'messy_tuft']);
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
            w = maxW * Math.pow(1 - Math.pow(dy, 2), 0.4); // Sloped skull
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
        for (let y = eyeY; y < GRID_SIZE; y++) {
            let spread = faceW[chinY] + 1;
            for (let x = -spread; x <= spread; x++) {
                if (Math.abs(x) > maxW - 1) setPixel(cx + x, y, hair.shadow);
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
                // Pectoral / Collarbone lines
                if (Math.abs(x) < neckW && y > chinY + 6 && y < chinY + 9 && Math.abs(x) > 2) c = skin.shadow;
                if (x === 0 && y > chinY + 8) c = skin.shadow; // Sternum cleft
            } else {
                if (x > shoulderWidth * 0.4) c = cloth.shadow;
                if (x < -shoulderWidth * 0.4) c = cloth.highlight;
                
                const isCenter = Math.abs(x) <= neckW - 1;
                if (clothStyle === 'leather' && isCenter && y < chinY + 7) continue; // Neck opening
                
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
        
        // Brutal Heavy Brows
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
        } else if (browStyle === 'scarred' && side === 1) {
            overPixel(ex, browY, skin.base); 
        }

        if (feature === 'eyepatch' && side === 1) {
            for(let dx=-2; dx<=2; dx++) for(let dy=-1; dy<=2; dy++) if(Math.abs(dx)+Math.abs(dy)<4) overPixel(ex+dx, eyeY+dy, '#111827');
            overPixel(ex-4, eyeY-1, '#111827'); overPixel(ex+4, eyeY+1, '#111827'); 
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
    const lipDark = skin.shadow;
    
    if (mouthShape === 'snarl') {
        for (let x = -mw; x <= mw; x++) overPixel(cx + x, mouthY, lipDark);
        overPixel(cx - mw, mouthY - 1, lipDark); overPixel(cx + mw, mouthY - 1, lipDark); // Curled lips
    } else if (mouthShape === 'grimace') {
        for (let x = -mw; x <= mw; x++) {
            overPixel(cx + x, mouthY, lipDark);
            if (x % 2 === 0) overPixel(cx + x, mouthY, '#F8FAFC'); // Gritted teeth showing
        }
    } else {
        // Frown
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
            let skullW = faceW[y] || 0;
            if (y < headTopY) skullW = (faceW[headTopY] + 1) * Math.pow(1 - ((headTopY - y)/6.0)**2, 0.5); 
            if (skullW < 0) skullW = 0;
            
            for (let x = -skullW - 2; x <= skullW + 2; x++) {
                let draw = false;

                if (hairStyle === 'mohawk') {
                    if (y < hairLineY && Math.abs(x) <= 2) draw = true;
                    if (y >= headTopY - 6 && y < headTopY && Math.abs(x) <= 1) draw = true; 
                } else if (hairStyle === 'shaved_sides') {
                    if (y < hairLineY && Math.abs(x) <= skullW) draw = true;
                    if (y >= hairLineY && Math.abs(x) >= skullW - 1) overPixel(cx + x, y, skin.shadow); // Stubble
                } else if (hairStyle === 'top_knot') {
                    if (y >= headTopY - 5 && y <= headTopY && Math.abs(x) <= 3) draw = true; 
                } else if (hairStyle === 'messy_tuft') {
                    if (y < hairLineY + 2 && Math.abs(x) <= skullW && rng.chance(0.8)) draw = true;
                } else if (hairStyle === 'dreadlocks') {
                    if (y < hairLineY && Math.abs(x) <= skullW + 1) draw = true;
                    if (y >= hairLineY && y < chinY && Math.abs(x) >= skullW - 1 && Math.abs(x) <= skullW + 2) {
                        if (Math.abs(x) % 3 !== 2) draw = true; 
                    }
                }

                if (y >= hairLineY && Math.abs(x) < skullW - 1 && hairStyle !== 'messy_tuft') draw = false;

                if (draw) {
                    let c = hair.base;
                    if (y > headTopY - 3 && x < 0 && x % 2 === 0) c = hairSoftHigh; 
                    if (x > skullW - 1) c = hair.shadow; 
                    overPixel(cx + x, y, c);
                }
            }
        }
    }

    // --- 10. BEARD / JAW HAIR ---
    if (beardStyle !== 'none') {
        for (let y = mouthY + 1; y <= chinY + 3; y++) {
            let jawW = faceW[y]; 
            for (let x = -jawW - 2; x <= jawW + 2; x++) {
                let draw = false;
                
                if (beardStyle === 'stubble') {
                    if (Math.abs(x) <= jawW && rng.chance(0.4)) overPixel(cx + x, y, skin.shadow); 
                    continue;
                }
                
                if (beardStyle === 'braided_goatee') {
                    if (y > chinY - 1 && y < chinY + 4 && Math.abs(x) <= 2) draw = true;
                    if (y === chinY + 3 && Math.abs(x) <= 2) overPixel(cx + x, y, metal.base); // Tie ring
                } else if (beardStyle === 'chops') {
                    if (Math.abs(x) >= jawW - 3 && Math.abs(x) <= jawW) draw = true;
                } else if (beardStyle === 'rough_beard') {
                    if (y >= mouthY + 1 && Math.abs(x) <= jawW) draw = rng.chance(0.8);
                    if (y > chinY && Math.abs(x) <= jawW - 2) draw = rng.chance(0.6);
                }

                if (Math.abs(x) <= 3 && y < chinY && beardStyle !== 'braided_goatee' && beardStyle !== 'rough_beard') draw = false; // Expose tusks

                if (draw) {
                    let c = hair.base;
                    if ((x+y)%3===0) c = hair.shadow; 
                    if (x > jawW - 1) c = hair.shadow; 
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
        const paintColor = rng.pick(['#7F1D1D', '#020617', '#B45309']); // Blood, Black, Ochre
        const paintStyle = rng.pick(['jaw_line', 'eye_band', 'hand_print']);
        
        for (let y = eyeY - 2; y <= chinY; y++) {
            for (let x = -maxW; x <= maxW; x++) {
                if (grid[y][cx+x] === skin.base || grid[y][cx+x] === skin.highlight) {
                    if (paintStyle === 'jaw_line' && y > mouthY && Math.abs(x) > 3) overPixel(cx+x, y, paintColor);
                    if (paintStyle === 'eye_band' && y >= eyeY - 1 && y <= eyeY + 1) overPixel(cx+x, y, paintColor);
                    if (paintStyle === 'hand_print' && Math.abs(x) < 4 && y >= noseY && y <= mouthY && (x+y)%2 === 0) overPixel(cx+x, y, paintColor);
                }
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
            if (colorCode) drawScaledRect(ctx, x, y, 1, 1, colorCode, DISPLAY_SCALE);
        }
    }

    return {
        imageDataUrl: offscreenCanvas.toDataURL(),
        data: { jawShape, noseShape, eyeShape, hairStyle, beardStyle, tuskStyle, clothStyle, feature }
    };
}