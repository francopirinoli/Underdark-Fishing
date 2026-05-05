/**
 * js/art/dwarf_male.js
 * Generates highly varied Dwarf Male portraits.
 * V2 - Decoupled mustaches, unibrows, structured hair texturing (no pixel scatter),
 * criss-cross braiding, and dynamic eye/face variations.
 */

import { drawScaledRect } from '../util/utils.js';

const GRID_SIZE = 64;
const DISPLAY_SCALE = 4;
const CANVAS_SIZE = GRID_SIZE * DISPLAY_SCALE;

export function generateDwarfMale(options = {}) {
    const rng = options.rng;
    const skin = options.skin;
    const hair = options.hair;
    const eye = options.eye;
    const cloth = options.cloth;

    const metals =[
        { base: '#F59E0B', high: '#FEF08A' }, // Gold
        { base: '#94A3B8', high: '#F1F5F9' }, // Silver
        { base: '#D97706', high: '#FDBA74' }, // Copper
        { base: '#475569', high: '#94A3B8' }  // Iron
    ];
    const metal = rng.pick(metals);

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

    const cx = 32; 
    const headTopY = 16;  
    const eyeY = 28;
    const noseY = 38;
    const mouthY = 44;
    const chinY = 49;     

    // --- 1. PROCEDURAL PARAMETERS ---
    const jawShape = rng.pick(['blocky', 'heavy_round', 'wide_anvil', 'square_chin']);
    const noseShape = rng.pick(['bulbous', 'flat', 'broken', 'hooked']);
    
    const eyeShape = rng.pick(['squint', 'deep_set', 'wide', 'fierce']);
    const browStyle = rng.pick(['unibrow', 'angled', 'thick', 'split']);
    
    const hairStyle = rng.pick(['bald', 'mohawk', 'slicked_back', 'top_knot', 'undercut', 'braided_crown', 'heavy_fringe']);
    
    const beardStyle = rng.pick(['anvil', 'long_braid', 'forked_braids', 'wild_bush', 'chops', 'noble_rings', 'none']);
    const mustacheStyle = rng.pick(['walrus', 'curled', 'trimmed', 'bare']);
    
    const clothStyle = rng.pick(['heavy_armor', 'furs', 'tunic', 'noble']);
    const feature = rng.pick(['none', 'none', 'scar', 'eyepatch', 'freckles']); 

    // --- 2. FACIAL CONTOUR MAP ---
    const faceW = Array(GRID_SIZE).fill(0);
    const maxW = rng.pick([13, 14, 15]); 

    for (let y = headTopY; y <= chinY; y++) {
        let w = 0;
        if (y <= eyeY) {
            const dy = (eyeY - y) / (eyeY - headTopY); 
            w = maxW * Math.pow(1 - Math.pow(dy, 2), 0.4); 
        } else {
            const dy = (y - eyeY) / (chinY - eyeY); 
            if (jawShape === 'blocky') w = maxW - 1.0 * Math.pow(dy, 4); 
            else if (jawShape === 'heavy_round') w = maxW - 2.5 * Math.pow(dy, 1.5);
            else if (jawShape === 'wide_anvil') w = maxW + (dy < 0.5 ? 0 : (dy - 0.5) * 3); 
            else if (jawShape === 'square_chin') w = maxW - 1.5 * dy;
        }
        faceW[y] = Math.max(7, Math.round(w)); 
    }

    // --- 3. BACKGROUND HAIR (Behind neck) ---
    if (hairStyle === 'slicked_back' || hairStyle === 'braided_crown') {
        for (let y = eyeY; y < chinY + 4; y++) {
            let spread = maxW + 2;
            for (let x = -spread; x <= spread; x++) {
                if (Math.abs(x) > maxW - 1) overPixel(cx + x, y, hair.shadow);
            }
        }
    }

    // --- 4. HEAVY NECK & SHOULDERS ---
    const neckW = faceW[chinY] - 1; 
    for (let y = chinY - 4; y <= chinY + 5; y++) {
        for (let x = -neckW; x <= neckW; x++) {
            let c = skin.shadow;
            if (x < -neckW + 3) c = skin.base; 
            overPixel(cx + x, y, c);
        }
    }

    for (let y = chinY + 4; y < GRID_SIZE; y++) {
        const shoulderWidth = 14 + (y - (chinY + 4)) * 2.2; 
        for (let x = -Math.floor(shoulderWidth); x <= Math.floor(shoulderWidth); x++) {
            let c = cloth.base;
            if (x > shoulderWidth * 0.4) c = cloth.shadow;
            if (x < -shoulderWidth * 0.4) c = cloth.highlight;
            
            const isCenter = Math.abs(x) <= neckW;
            if (clothStyle === 'tunic' && isCenter && y < chinY + 6) continue;
            
            if (clothStyle === 'heavy_armor') {
                if ((x + y) % 5 === 0) c = cloth.highlight; // Plating
                if (Math.abs(x) === neckW + 2 && y < chinY + 10) c = metal.base; 
            }
            if (clothStyle === 'furs' && x % 3 === 0) c = cloth.shadow; // Structured fur
            if (clothStyle === 'noble' && isCenter && y < chinY + 10) c = cloth.highlight;
            
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

    // --- 6. EARS ---
    for (let side of [-1, 1]) {
        for (let y = eyeY; y <= noseY - 1; y++) {
            const w = faceW[y];
            const ex = cx + (side * (w + 1));
            overPixel(ex, y, skin.shadow);
            overPixel(ex + side, y + 1, skin.shadow);
            overPixel(ex, y + 1, skin.base);
            if (side === -1) overPixel(ex, y, skin.highlight);
        }
    }

    // --- 7. FACIAL FEATURES ---
    
    // Eyebrows
    const browY = eyeY - 2;
    for (let side of [-1, 1]) {
        const ex = cx + (side * 5); 
        
        overPixel(ex - side*2, browY, hair.base); overPixel(ex - side, browY, hair.base); 
        overPixel(ex, browY, hair.base); overPixel(ex + side, browY, hair.base);

        if (browStyle === 'unibrow') {
            overPixel(cx, browY, hair.base); overPixel(cx - 1, browY, hair.base); overPixel(cx + 1, browY, hair.base);
        } else if (browStyle === 'angled') {
            overPixel(ex - side, browY + 1, hair.base); // Dips in middle
        } else if (browStyle === 'thick') {
            overPixel(ex - side, browY - 1, hair.base); overPixel(ex, browY - 1, hair.base); // Double height
        } else if (browStyle === 'split') {
            overPixel(ex, browY, skin.base); // Scar cuts through brow
        }
    }

    // Eyes
    for (let side of[-1, 1]) {
        const ex = cx + (side * 5); 
        
        if (feature === 'eyepatch' && side === 1) {
            for(let dx=-2; dx<=2; dx++) for(let dy=-1; dy<=2; dy++) if(Math.abs(dx)+Math.abs(dy)<4) overPixel(ex+dx, eyeY+dy, '#111827');
            overPixel(ex-5, eyeY-2, '#111827'); overPixel(ex+5, eyeY+2, '#111827'); 
        } else {
            if (eyeShape === 'squint') {
                overPixel(ex - 1, eyeY, skin.shadow); overPixel(ex + 1, eyeY, skin.shadow);
                overPixel(ex, eyeY, eye.color);
            } else if (eyeShape === 'wide') {
                overPixel(ex - 1, eyeY, '#F8FAFC'); overPixel(ex + 1, eyeY, '#F8FAFC');
                overPixel(ex, eyeY - 1, '#F8FAFC'); 
                overPixel(ex, eyeY, eye.color);
            } else if (eyeShape === 'fierce') {
                overPixel(ex - 1, eyeY, '#F8FAFC'); overPixel(ex + 1, eyeY, skin.shadow);
                overPixel(ex, eyeY, eye.color);
                overPixel(ex, eyeY - 1, skin.shadow); 
            } else {
                // Deep set
                overPixel(ex - 1, eyeY, '#F8FAFC'); overPixel(ex + 1, eyeY, '#F8FAFC');
                overPixel(ex, eyeY, eye.color);
                overPixel(ex - 1, eyeY - 1, skin.shadow); overPixel(ex + 1, eyeY - 1, skin.shadow); 
            }
            overPixel(ex, eyeY + 1, skin.shadow); // Heavy bags
        }
    }

    // Nose
    for (let y = eyeY + 1; y < noseY; y++) {
        overPixel(cx, y, skin.highlight); 
        overPixel(cx + 1, y, skin.shadow);
    }
    
    if (noseShape === 'bulbous') {
        overPixel(cx, noseY, skin.highlight); overPixel(cx + 1, noseY, skin.highlight);
        overPixel(cx - 2, noseY + 1, skin.shadow); overPixel(cx - 1, noseY + 1, skin.base);
        overPixel(cx, noseY + 1, skin.base); overPixel(cx + 1, noseY + 1, skin.shadow); overPixel(cx + 2, noseY + 1, skin.shadow);
    } else if (noseShape === 'broken') {
        overPixel(cx + 1, noseY - 2, skin.highlight); 
        overPixel(cx - 1, noseY, skin.shadow); overPixel(cx, noseY, skin.highlight); overPixel(cx + 1, noseY, skin.base); 
    } else if (noseShape === 'flat') {
        overPixel(cx - 2, noseY, skin.shadow); overPixel(cx - 1, noseY, skin.highlight);
        overPixel(cx, noseY, skin.highlight); overPixel(cx + 1, noseY, skin.base); overPixel(cx + 2, noseY, skin.shadow);
    } else {
        // Hooked
        overPixel(cx, noseY, skin.highlight); overPixel(cx, noseY + 1, skin.shadow); 
    }

    // Mouth (Drawn underneath mustache)
    for (let x = -3; x <= 3; x++) overPixel(cx + x, mouthY, skin.shadow);
    overPixel(cx, mouthY + 1, skin.base); 

    // --- 8. FOREGROUND HAIR ---
    const hairLineY = headTopY + 2; 
    
    if (hairStyle !== 'bald') {
        for (let y = headTopY - 6; y <= eyeY; y++) {
            let skullW = faceW[y] || 0;
            if (y < headTopY) skullW = faceW[headTopY] - (headTopY - y) * 2; 
            if (skullW < 0) skullW = 0;
            
            for (let x = -skullW - 2; x <= skullW + 2; x++) {
                let draw = false;

                if (hairStyle === 'mohawk') {
                    if (y < hairLineY && Math.abs(x) <= 3) draw = true;
                    if (y >= headTopY - 6 && y < headTopY && Math.abs(x) <= 2) draw = true; 
                } else if (hairStyle === 'undercut') {
                    if (y < hairLineY && Math.abs(x) <= skullW) draw = true;
                    if (y >= hairLineY && Math.abs(x) >= skullW - 1) draw = true; 
                } else if (hairStyle === 'slicked_back') {
                    if (y < hairLineY && Math.abs(x) <= skullW + 1) draw = true;
                } else if (hairStyle === 'braided_crown') {
                    if (y < hairLineY && Math.abs(x) <= skullW + 1) draw = true;
                    if (y === hairLineY || y === hairLineY + 1) {
                        // Criss-cross braided texture
                        if (Math.abs(x) <= skullW) draw = true;
                    }
                } else if (hairStyle === 'top_knot') {
                    if (y < hairLineY && y > headTopY - 1 && Math.abs(x) <= skullW) {
                        // Shaved sides, stubble
                        overPixel(cx + x, y, skin.shadow); continue;
                    }
                    if (y >= headTopY - 5 && y <= headTopY && Math.abs(x) <= 3) draw = true; // The knot
                } else if (hairStyle === 'heavy_fringe') {
                    if (y < hairLineY + 2 && Math.abs(x) <= skullW + 1) draw = true;
                    if (y >= hairLineY && y < eyeY - 1 && Math.abs(x) <= skullW) draw = true; // Drops over forehead
                }

                if (y >= hairLineY && Math.abs(x) < skullW - 1 && hairStyle !== 'heavy_fringe') draw = false;

                if (draw) {
                    let c = hair.base;
                    if (hairStyle === 'undercut' && y >= hairLineY) c = skin.shadow; 
                    else {
                        // Clean, structured highlights (no scatter)
                        if (x < -1 && x % 4 === 0 && y % 2 === 0) c = hair.highlight; 
                        if (hairStyle === 'braided_crown' && (x+y)%4===0 && (x-y)%4===0) c = hair.shadow;
                        if (x > skullW - 1) c = hair.shadow;
                    }
                    overPixel(cx + x, y, c);
                }
            }
        }
    }

    // --- 9. THE MASSIVE BEARD ---
    if (beardStyle !== 'none') {
        const beardStartY = eyeY + 2; 
        for (let y = beardStartY; y <= GRID_SIZE - 2; y++) {
            let jawW = faceW[y] || faceW[chinY]; 
            
            for (let x = -jawW - 6; x <= jawW + 6; x++) {
                let draw = false;
                let c = hair.base;
                
                if (beardStyle === 'chops') {
                    if (y < chinY + 2 && Math.abs(x) >= jawW - 4 && Math.abs(x) <= jawW + 2) draw = true;
                }
                else if (beardStyle === 'anvil') {
                    if (y < chinY && Math.abs(x) >= jawW - 4 && Math.abs(x) <= jawW + 2) draw = true; 
                    if (y >= chinY && y < chinY + 12 && Math.abs(x) <= faceW[chinY] + 1) draw = true; 
                }
                else if (beardStyle === 'wild_bush') {
                    if (y < chinY && Math.abs(x) >= jawW - 4 && Math.abs(x) <= jawW + 2) draw = true; 
                    if (y >= chinY && y < chinY + 10) {
                        const taper = faceW[chinY] + 4 - (y - chinY)*0.6;
                        if (Math.abs(x) <= taper) draw = true;
                    }
                }
                else if (beardStyle === 'long_braid') {
                    if (y < chinY && Math.abs(x) >= jawW - 4 && Math.abs(x) <= jawW + 1) draw = true; 
                    if (y >= chinY && y < chinY + 15) {
                        const taper = Math.max(3, faceW[chinY] - (y - chinY) * 0.8);
                        if (Math.abs(x) <= taper) {
                            draw = true;
                            // Clean criss-cross braid pattern
                            if (Math.abs(x) % 4 === (y % 4)) c = hair.shadow; 
                        }
                    }
                }
                else if (beardStyle === 'forked_braids') {
                    if (y < chinY && Math.abs(x) >= jawW - 4 && Math.abs(x) <= jawW + 2) draw = true; 
                    if (y >= chinY && y < chinY + 12) {
                        const outer = faceW[chinY] - (y - chinY)*0.2;
                        const inner = (y - chinY) * 0.6; 
                        if (Math.abs(x) <= outer && Math.abs(x) >= inner) {
                            draw = true;
                            if (Math.abs(x) % 4 === (y % 4)) c = hair.shadow;
                        }
                    }
                }
                else if (beardStyle === 'noble_rings') {
                    if (y < chinY && Math.abs(x) >= jawW - 4 && Math.abs(x) <= jawW + 1) draw = true; 
                    if (y >= chinY && y < chinY + 14) {
                        const width = Math.max(2, faceW[chinY] - (y - chinY) * 0.5);
                        if (Math.abs(x) <= width) draw = true;
                    }
                }

                // Protect face
                if (y < noseY + 1 && Math.abs(x) <= jawW - 5) draw = false;
                if (y >= noseY + 1 && y < mouthY + 2 && Math.abs(x) < 5) draw = false;

                if (draw) {
                    // Structured vertical strands for non-braids
                    if (c === hair.base && Math.abs(x) % 3 === 0 && x < 0) c = hair.highlight; 
                    if (x > jawW - 2) c = hair.shadow; // Right edge depth
                    overPixel(cx + x, y, c);
                }
            }
        }

        // Beard Metal Rings
        if (beardStyle === 'long_braid') {
            const ringY = chinY + 6;
            const w = Math.max(3, faceW[chinY] - 6 * 0.8);
            for (let x = -w; x <= w; x++) overPixel(cx + x, ringY, metal.base);
            overPixel(cx - 1, ringY, metal.high);
        } else if (beardStyle === 'forked_braids') {
            const ringY = chinY + 5;
            const outer = faceW[chinY];
            const inner = 5 * 0.6;
            for (let x = -outer; x <= outer; x++) {
                if (Math.abs(x) >= inner) {
                    overPixel(cx + x, ringY, metal.base);
                    if (x === -Math.floor((outer+inner)/2) || x === Math.floor((outer+inner)/2)) overPixel(cx + x, ringY, metal.high);
                }
            }
        } else if (beardStyle === 'noble_rings') {[chinY + 4, chinY + 9].forEach(ringY => {
                const w = Math.max(2, faceW[chinY] - (ringY - chinY) * 0.5);
                for (let x = -w - 1; x <= w + 1; x++) overPixel(cx + x, ringY, metal.base);
                overPixel(cx - 1, ringY, metal.high);
            });
        }
    }

    // --- 10. MUSTACHE (Decoupled, drawn ON TOP of beard) ---
    if (mustacheStyle !== 'bare') {
        for (let y = noseY + 1; y <= mouthY + 2; y++) {
            const dy = y - (noseY + 1);
            let spread = 0;
            
            if (mustacheStyle === 'trimmed') spread = (dy === 0) ? 3 : 0; 
            else if (mustacheStyle === 'walrus') spread = 4 + dy * 1.5;
            else if (mustacheStyle === 'curled') {
                spread = 3 + dy * 1.5;
                // Add curls
                if (y === mouthY) { overPixel(cx - spread - 1, y - 1, hair.base); overPixel(cx + spread + 1, y - 1, hair.base); }
            }

            for (let x = -Math.floor(spread); x <= Math.floor(spread); x++) {
                let c = hair.base;
                if (x % 3 === 0) c = hair.highlight; // Vertical comb lines
                if (x > spread - 2) c = hair.shadow;
                
                // Expose mouth center for trimmed/curled
                if (y === mouthY && Math.abs(x) < 2 && mustacheStyle !== 'walrus') continue;
                
                if (Math.abs(x) <= spread) overPixel(cx + x, y, c);
            }
        }
    }

    // --- 11. DETAILS & SCARS ---
    if (feature === 'scar') {
        overPixel(cx + 4, eyeY + 2, '#7F1D1D'); overPixel(cx + 5, eyeY + 1, '#7F1D1D');
    }
    if (feature === 'freckles') {
        const darkenHex = (hex, factor) => {
            const r = Math.floor(parseInt(hex.slice(1, 3), 16) * factor);
            const g = Math.floor(parseInt(hex.slice(3, 5), 16) * factor);
            const b = Math.floor(parseInt(hex.slice(5, 7), 16) * factor);
            return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
        };
        const soot = darkenHex(skin.base, 0.7); 
        for (let i = 0; i < 12; i++) {
            const dx = rng.int(-7, 7);
            const dy = rng.int(eyeY + 1, noseY + 2);
            if (grid[dy][cx + dx] === skin.base || grid[dy][cx + dx] === skin.highlight) {
                overPixel(cx + dx, dy, soot); 
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
        data: { jawShape, noseShape, eyeShape, browStyle, hairStyle, beardStyle, mustacheStyle, clothStyle, feature }
    };
}