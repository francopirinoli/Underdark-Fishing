/**
 * js/art/human_female.js
 * Generates highly varied Human Female portraits.
 * V3 - Solid-color hair layers, structured lighting (no noise), 
 * improved skull proportions, and clean, expressive facial features.
 */

import { drawScaledRect } from '../util/utils.js';

const GRID_SIZE = 64;
const DISPLAY_SCALE = 4;
const CANVAS_SIZE = GRID_SIZE * DISPLAY_SCALE;

export function generateHumanFemale(options = {}) {
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

    function setPixel(x, y, hexColor) {
        x = Math.round(x); y = Math.round(y);
        if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
            if (!grid[y][x]) grid[y][x] = hexColor; 
        }
    }

    function overPixel(x, y, hexColor) {
        x = Math.round(x); y = Math.round(y);
        if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
            grid[y][x] = hexColor; 
        }
    }

    const cx = 32; 
    const headTopY = 15; // Lowered slightly to reduce extreme tall heads
    const eyeY = 29; 
    const noseY = 37;
    const mouthY = 42;
    const chinY = 48; 

    // --- 1. PROCEDURAL PARAMETERS ---
    const jawShape = rng.pick(['oval', 'heart', 'round', 'pointed', 'soft_square']);
    const noseShape = rng.pick(['delicate', 'straight', 'button', 'snub']);
    const mouthShape = rng.pick(['neutral', 'full', 'smile', 'pout']);
    const eyeShape = rng.pick(['almond', 'doe', 'sharp', 'heavy_lashes']);
    
    // Decoupled Hair Math
    const hairBody = rng.pick(['long_straight', 'wavy', 'bob', 'pixie', 'ponytail', 'bun', 'twin_buns', 'braid']);
    const bangStyle = rng.pick(['swept', 'fringe', 'parted', 'none']);
    
    const clothStyle = rng.pick(['tunic', 'v_neck', 'dress', 'cowl', 'high_collar']);
    const feature = rng.pick(['none', 'none', 'earrings', 'freckles', 'scar']); 

    const lipDark = '#7F1D1D'; 
    const lipLight = '#BE123C'; 
    const lashColor = '#020617'; 

    // --- 2. FACIAL CONTOUR MAP ---
    const faceW = Array(GRID_SIZE).fill(0);
    const maxW = 10; 

    for (let y = headTopY; y <= chinY; y++) {
        let w = 0;
        if (y <= eyeY) {
            const dy = (eyeY - y) / (eyeY - headTopY); 
            // Squircle math creates a beautifully rounded, natural human skull
            w = maxW * Math.pow(1 - Math.pow(dy, 2), 0.4); 
        } else {
            const dy = (y - eyeY) / (chinY - eyeY); 
            if (jawShape === 'oval') w = maxW * Math.sqrt(1 - dy * dy * 0.85);
            else if (jawShape === 'heart') w = maxW - 4.5 * Math.pow(dy, 1.4);
            else if (jawShape === 'round') w = maxW - 3.0 * Math.pow(dy, 1.8);
            else if (jawShape === 'pointed') w = maxW - 5.5 * dy;
            else if (jawShape === 'soft_square') w = maxW - 1.5 * Math.pow(dy, 4);
        }
        faceW[y] = Math.max(3, Math.round(w)); 
    }

    // --- 3. BACKGROUND HAIR (Flat shaded behind neck) ---
    if (['long_straight', 'wavy', 'ponytail', 'braid'].includes(hairBody)) {
        for (let y = eyeY; y < GRID_SIZE; y++) {
            let spread = 0;
            if (hairBody === 'long_straight') spread = 12 + (y - eyeY) * 0.15;
            else if (hairBody === 'wavy') spread = 13 + Math.sin(y * 0.4) * 2 + (y - eyeY) * 0.2;
            else if (hairBody === 'ponytail') spread = 8 + (y - eyeY) * 0.2; 
            else if (hairBody === 'braid') spread = 10; // Fills left side, braid on right

            spread = Math.floor(spread);
            for (let x = -spread; x <= spread; x++) {
                if (hairBody === 'braid' && x > 2) continue; // Leave room on right for the braid
                
                if (Math.abs(x) > 4) { // Don't draw over the neck area
                    setPixel(cx + x, y, hair.shadow); // Solid flat shadow color
                }
            }
        }
    }

    // --- 4. NECK & SHOULDERS ---
    const neckW = 3; 
    for (let y = chinY - 3; y <= chinY + 5; y++) {
        for (let x = -neckW; x <= neckW; x++) {
            let c = skin.shadow;
            if (x < -neckW + 1) c = skin.base; 
            overPixel(cx + x, y, c);
        }
    }

    for (let y = chinY + 4; y < GRID_SIZE; y++) {
        const shoulderWidth = 7 + (y - (chinY + 4)) * 1.6; 
        for (let x = -Math.floor(shoulderWidth); x <= Math.floor(shoulderWidth); x++) {
            let c = cloth.base;
            if (x > shoulderWidth * 0.4) c = cloth.shadow;
            if (x < -shoulderWidth * 0.4) c = cloth.highlight;
            
            const isCenter = Math.abs(x) <= neckW + 1;
            if (clothStyle === 'v_neck' && isCenter && y < chinY + 9 + Math.abs(x)) continue;
            if (clothStyle === 'dress' && isCenter && y < chinY + 10) continue; 
            if (clothStyle === 'tunic' && isCenter && y < chinY + 6) continue;
            
            if (clothStyle === 'high_collar' && Math.abs(x) <= neckW + 2 && y < chinY + 7) c = cloth.highlight;
            if (clothStyle === 'cowl' && Math.abs(x) < 8 && y < chinY + 8) {
                c = cloth.highlight; 
                if ((x+y)%3===0) c = cloth.base;
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
            if (y > chinY - 1) c = skin.shadow;     
            
            // Clean structured blush
            if ((jawShape === 'heart' || jawShape === 'pointed' || jawShape === 'oval') && y > noseY && y < mouthY && Math.abs(x) > w - 3) {
                if ((x+y) % 2 === 0) c = skin.shadow; 
            }
            
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
            overPixel(ex, earLobeY, '#FBBF24'); 
            overPixel(ex, earLobeY + 1, '#22D3EE'); 
        }
    }

    // --- 7. FACIAL FEATURES ---
    
    // Eyes & Eyelashes (Clean and compact)
    for (let side of [-1, 1]) {
        const ex = cx + (side * 4);
        
        // Eyebrows
        let browY = eyeY - 3;
        overPixel(ex - side*2, browY + 1, hair.base); 
        overPixel(ex - side, browY, hair.base); 
        overPixel(ex, browY, hair.base); 
        overPixel(ex + side, browY + 1, hair.base);
        
        // Eyeliner (Top)
        overPixel(ex - 1, eyeY - 1, lashColor);
        overPixel(ex, eyeY - 1, lashColor);
        overPixel(ex + 1, eyeY - 1, lashColor);

        // Sweeping Lashes (Outer Corner)
        if (eyeShape === 'almond') {
            overPixel(ex + side * 2, eyeY - 1, lashColor);
            overPixel(ex + side * 3, eyeY - 2, lashColor); 
        } else if (eyeShape === 'heavy_lashes') {
            overPixel(ex + side * 2, eyeY - 1, lashColor);
            overPixel(ex + side * 2, eyeY - 2, lashColor); 
        } else if (eyeShape === 'doe') {
            overPixel(ex + side * 2, eyeY - 1, lashColor); 
        } else {
            overPixel(ex + side * 2, eyeY - 1, lashColor); 
        }

        // Whites & Pupil 
        if (eyeShape === 'doe') {
            // Larger, softer eye
            overPixel(ex - 1, eyeY, '#F8FAFC'); overPixel(ex + 1, eyeY, '#F8FAFC');
            overPixel(ex, eyeY, eye.color); overPixel(ex, eyeY + 1, eye.color); 
        } else if (eyeShape === 'almond') {
            overPixel(ex - 1, eyeY, '#F8FAFC'); overPixel(ex + 1, eyeY, '#F8FAFC');
            overPixel(ex, eyeY, eye.color);
        } else if (eyeShape === 'sharp') {
            overPixel(ex - 1, eyeY, '#F8FAFC'); overPixel(ex + 1, eyeY, '#F8FAFC');
            overPixel(ex, eyeY, eye.color);
            overPixel(ex - 1, eyeY + 1, skin.shadow); 
        } else {
            overPixel(ex - 1, eyeY, '#F8FAFC'); overPixel(ex + 1, eyeY, '#F8FAFC');
            overPixel(ex, eyeY, eye.color);
        }
    }

    // Delicate Nose
    for (let y = eyeY + 1; y < noseY; y++) {
        overPixel(cx, y, skin.highlight); 
        if (noseShape === 'straight') overPixel(cx + 1, y, skin.shadow); 
    }
    
    if (noseShape === 'button') {
        overPixel(cx, noseY, skin.highlight); 
        overPixel(cx - 1, noseY + 1, skin.shadow); overPixel(cx + 1, noseY + 1, skin.shadow);
    } else if (noseShape === 'snub') {
        overPixel(cx, noseY - 1, skin.highlight); overPixel(cx, noseY, skin.shadow);
        overPixel(cx - 1, noseY, skin.shadow); overPixel(cx + 1, noseY, skin.shadow);
    } else {
        overPixel(cx, noseY, skin.highlight); 
        overPixel(cx, noseY + 1, skin.shadow); 
    }

    // Mouth (Solid shapes, no noisy shading underneath)
    const mw = mouthShape === 'wide' ? 3 : (mouthShape === 'thin' ? 1 : 2);
    
    // Top Lip
    for (let x = -mw + 1; x <= mw - 1; x++) overPixel(cx + x, mouthY, lipDark);
    // Bottom Lip
    for (let x = -mw; x <= mw; x++) overPixel(cx + x, mouthY + 1, lipLight);
    
    if (mouthShape === 'smile') {
        overPixel(cx - mw - 1, mouthY, lipDark); overPixel(cx + mw + 1, mouthY, lipDark);
        overPixel(cx, mouthY + 1, '#F8FAFC'); // Teeth hint
    } else if (mouthShape === 'pout') {
        overPixel(cx, mouthY - 1, lipDark); // Cupid's bow
        overPixel(cx, mouthY + 2, lipLight); // Extra plump
    }
    
    // Single spec of gloss
    if (mouthShape !== 'thin') overPixel(cx - 1, mouthY + 1, '#F8FAFC'); 

// --- 8. FOREGROUND HAIR (Solid blocks with structured highlights) ---
    const hairLineY = headTopY + 2; 
    
    for (let y = headTopY - 6; y <= chinY + 6; y++) {
        // FIX: Lock the skull width to the chin's width when drawing below the face.
        // This prevents the hair from collapsing to x=0 and forming a "beard".
        let skullW = (y <= chinY) ? (faceW[y] || 0) : (faceW[chinY] || 0);
        if (y < headTopY) skullW = faceW[headTopY] - (headTopY - y) * 1.5; 
        if (skullW < 0) skullW = 0;
        
        for (let x = -skullW - 8; x <= skullW + 8; x++) {
            let draw = false;

            // Base top volume
            if (y < hairLineY && Math.abs(x) <= skullW + 2) draw = true;

            // HAIRSTYLES
            if (hairBody === 'pixie') {
                if (y < hairLineY + 2 && Math.abs(x) <= skullW + 2) draw = true;
                if (y >= hairLineY && y < eyeY + 1 && Math.abs(x) >= skullW - 1 && Math.abs(x) <= skullW + 2) draw = true; 
            } 
            else if (hairBody === 'bob') {
                if (y < chinY && Math.abs(x) >= skullW - 1 && Math.abs(x) <= skullW + 3) draw = true;
            } 
            else if (hairBody === 'long_straight') {
                if (y < chinY + 8 && Math.abs(x) >= skullW - 1 && Math.abs(x) <= skullW + 3) draw = true;
            } 
            else if (hairBody === 'wavy') {
                const wave = Math.sin(y * 0.6) * 1.5;
                if (y < chinY + 8 && Math.abs(x) >= skullW - 1 && Math.abs(x) <= skullW + 3 + wave) draw = true;
            }
            else if (hairBody === 'bun') {
                if (y >= headTopY && y < eyeY && Math.abs(x) >= skullW - 1 && Math.abs(x) <= skullW + 1) draw = true;
                if (y < headTopY) {
                    if (Math.hypot(x, y - (headTopY - 4)) < 5) draw = true; // Perfect round bun
                }
            }
            else if (hairBody === 'twin_buns') {
                if (y >= headTopY && y < eyeY && Math.abs(x) >= skullW - 1 && Math.abs(x) <= skullW + 1) draw = true;
                if (y < headTopY + 2) {
                    if (Math.hypot(x + 7, y - (headTopY - 2)) < 4 || Math.hypot(x - 7, y - (headTopY - 2)) < 4) draw = true;
                }
            }
            else if (hairBody === 'braid') {
                if (y < chinY + 2 && Math.abs(x) <= skullW + 2) draw = true;
                if (x > skullW - 1 && x < skullW + 5 && y >= eyeY && y < GRID_SIZE - 2) {
                    if ((x+y)%4 !== 0) draw = true; // Distinct braided gaps
                }
            }
            else if (hairBody === 'ponytail') {
                if (y >= headTopY && y < eyeY && Math.abs(x) >= skullW - 1 && Math.abs(x) <= skullW + 1) draw = true;
            }

            // BANGS
            if (y >= hairLineY && y < eyeY) {
                if (bangStyle === 'fringe' && Math.abs(x) <= skullW) draw = true;
                if (bangStyle === 'swept' && x > -skullW && x < skullW && y < eyeY - 1 + (x * 0.3)) draw = true;
                if (bangStyle === 'parted' && Math.abs(x) <= skullW && Math.abs(x) > 1 + (y - hairLineY)*0.5) draw = true;
            }

            // MASK FACE (Erase hair covering the face unless it is bangs)
            if (y >= hairLineY && Math.abs(x) < skullW - 1) {
                let isBangs = false;
                if (y < eyeY) {
                    if (bangStyle === 'fringe') isBangs = true;
                    if (bangStyle === 'swept' && y < eyeY - 1 + (x * 0.3)) isBangs = true;
                    if (bangStyle === 'parted' && Math.abs(x) > 1 + (y - hairLineY)*0.5) isBangs = true;
                }
                if (!isBangs) draw = false;
            }

            if (draw) {
                let c = hair.base;
                
                // Structured Halo Highlight (Top left)
                if (y > headTopY - 5 && y < headTopY + 2 && x > -skullW - 2 && x < 0) {
                    if ((x + y) % 3 === 0) c = hair.highlight;
                }
                
                // Solid shadow edge for 3D depth (Right side)
                if (x > skullW + 1) c = hair.shadow;
                
                // Inner rim shadow where hair meets skin
                if (y >= hairLineY && Math.abs(x) === skullW - 1) c = hair.shadow;
                
                overPixel(cx + x, y, c);
            }
        }
    }

    // --- 9. DETAILS ---
    if (feature === 'freckles') {
        // Helper to dynamically calculate a color 15% darker than the base skin
        const darkenHex = (hex, factor) => {
            const r = Math.floor(parseInt(hex.slice(1, 3), 16) * factor);
            const g = Math.floor(parseInt(hex.slice(3, 5), 16) * factor);
            const b = Math.floor(parseInt(hex.slice(5, 7), 16) * factor);
            return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        };
        const freckleColor = darkenHex(skin.base, 0.85);

        for (let i = 0; i < 8; i++) {
            const dx = rng.int(-5, 5);
            const dy = rng.int(eyeY + 1, noseY + 1);
            // Only draw freckles over base skin or highlights
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
        data: { jawShape, eyeShape, hairBody, bangStyle, clothStyle, feature }
    };
}