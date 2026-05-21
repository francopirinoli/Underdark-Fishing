/**
 * js/art/tiefling_male.js
 * Generates highly varied Tiefling Male portraits.
 * Features procedural horns, fangs, glowing/solid eyes, and sharp angular features.
 */

import { drawScaledRect } from '../util/utils.js';

const GRID_SIZE = 64;
const DISPLAY_SCALE = 4;
const CANVAS_SIZE = GRID_SIZE * DISPLAY_SCALE;

export function generateTieflingMale(options = {}) {
    const rng = options.rng;
    const skin = options.skin;
    const hair = options.hair;
    const eye = options.eye;
    const cloth = options.cloth;

    // Color Blending Helpers
    const hex2rgb = h => [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)];
    const rgb2hex = ([r,g,b]) => `#${(1<<24|(r<<16)|(g<<8)|b).toString(16).slice(1).padStart(6, '0')}`;
    const blend = (c1, c2, t) => rgb2hex(hex2rgb(c1).map((v,i) => Math.round(v + (hex2rgb(c2)[i]-v)*t)));
    
    const hairSoftHigh = blend(hair.base, hair.highlight, 0.4);
    const lipDark = blend(skin.shadow, '#000000', 0.3); // Darker, black-tinted lips
    const stubbleColor = blend(skin.shadow, hair.base, 0.4); 

    // Horn Materials (Bone, Obsidian, or Ash)
    const hornPalettes = [
        { base: '#E7E5E4', shadow: '#A8A29E', highlight: '#FAFAF9' }, // Bone
        { base: '#1F2937', shadow: '#030712', highlight: '#4B5563' }, // Obsidian
        { base: '#451A03', shadow: '#270E01', highlight: '#78350F' }  // Dark Wood/Ash
    ];
    const hornMat = rng.pick(hornPalettes);

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
    const noseY = 38;
    const mouthY = 44;
    const chinY = 51; // Angular, long face

    // --- 1. PROCEDURAL PARAMETERS ---
    const jawShape = rng.pick(['angular', 'pointed', 'chiseled', 'broad_chin']);
    const noseShape = rng.pick(['straight', 'aquiline', 'sharp']);
    const eyeShape = rng.pick(['glowing_orbs', 'slits', 'solid_black', 'piercing']);
    
    const hornStyle = rng.pick(['swept_back', 'ram_curled', 'short_spikes', 'broken']);
    const hairStyle = rng.pick(['long_straight', 'slick_back', 'undercut', 'wild_mane', 'bald']);
    const beardStyle = rng.pick(['goatee', 'chops', 'none', 'stubble']);
    
    const clothStyle = rng.pick(['leather_armor', 'noble', 'tunic', 'cowl']);
    const feature = rng.pick(['none', 'demonic_tattoos', 'scar', 'scales', 'earrings']); 

    // --- 2. FACIAL CONTOUR MAP ---
    const faceW = Array(GRID_SIZE).fill(0);
    const maxW = rng.pick([9, 10]); // Lean, sharp skull

    for (let y = headTopY; y <= chinY; y++) {
        let w = 0;
        if (y <= eyeY) {
            const dy = (eyeY - y) / (eyeY - headTopY); 
            w = maxW * Math.pow(1 - Math.pow(dy, 2), 0.4); 
        } else {
            const dy = (y - eyeY) / (chinY - eyeY); 
            if (jawShape === 'angular') w = maxW - 4.0 * dy; 
            else if (jawShape === 'pointed') w = maxW - 5.5 * Math.pow(dy, 1.2); 
            else if (jawShape === 'chiseled') w = maxW - (dy < 0.4 ? dy * 1.5 : 1.5 + (dy - 0.4) * 6); 
            else if (jawShape === 'broad_chin') w = maxW - 2.5 * Math.pow(dy, 1.8);
        }
        faceW[y] = Math.max(3, Math.round(w)); 
    }

    // --- 3. BACKGROUND HAIR ---
    if (['long_straight', 'wild_mane'].includes(hairStyle)) {
        for (let y = eyeY; y < GRID_SIZE; y++) {
            let spread = maxW + 2;
            if (hairStyle === 'wild_mane') spread += (y - eyeY) * 0.3 + (Math.sin(y * 0.5) * 2);
            if (hairStyle === 'long_straight') spread += (y - eyeY) * 0.15;
            spread = Math.floor(spread);
            
            for (let x = -spread; x <= spread; x++) {
                if (Math.abs(x) > 3) setPixel(cx + x, y, hair.shadow); 
            }
        }
    }

    // --- 4. NECK & SHOULDERS ---
    const neckW = 4; 
    for (let y = chinY - 4; y <= chinY + 5; y++) {
        for (let x = -neckW; x <= neckW; x++) {
            let c = skin.shadow;
            if (x < -neckW + 2) c = skin.base; 
            overPixel(cx + x, y, c);
        }
    }

    for (let y = chinY + 5; y < GRID_SIZE; y++) {
        const shoulderWidth = 8 + (y - (chinY + 5)) * 1.6; 
        for (let x = -Math.floor(shoulderWidth); x <= Math.floor(shoulderWidth); x++) {
            let c = cloth.base;
            if (x > shoulderWidth * 0.4) c = cloth.shadow;
            if (x < -shoulderWidth * 0.4) c = cloth.highlight;
            
            const isCenter = Math.abs(x) <= neckW;
            
            if (clothStyle === 'tunic' && isCenter && y < chinY + 7) continue;
            if (clothStyle === 'cowl' && Math.abs(x) < 8 && y < chinY + 8) c = cloth.highlight; 
            if (clothStyle === 'leather_armor' && (x - y) % 4 === 0) c = cloth.shadow; 
            if (clothStyle === 'noble') {
                if (isCenter && y < chinY + 11) c = '#F59E0B'; // Gold ascot
                if (Math.abs(x) === neckW + 2 && y > chinY + 6) c = '#B45309'; 
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
            
            // Heavy, angular cheekbones
            if (y > noseY + 1 && y < mouthY && Math.abs(x) >= w - 3) {
                if (jawShape === 'chiseled' || (x+y)%2 === 0) c = skin.shadow; 
            }
            overPixel(cx + x, y, c);
        }
    }

    // --- 6. POINTED EARS ---
    const earLength = rng.int(6, 9);
    for (let side of [-1, 1]) {
        let earBaseY = eyeY;
        let earBaseX = faceW[earBaseY];
        for (let e = 1; e <= earLength; e++) {
            let ex = cx + side * (earBaseX + e);
            let ey = earBaseY - Math.floor(e * 0.5); // Swept up slightly

            overPixel(ex, ey, skin.highlight);
            overPixel(ex, ey + 1, skin.base);
            overPixel(ex, ey + 2, skin.shadow);
            
            if (e === earLength) {
                overPixel(ex, ey + 1, skin.shadow);
                overPixel(ex, ey + 2, null); 
            }
        }
        if (feature === 'earrings') {
            const ex = cx + side * (earBaseX + Math.floor(earLength/2));
            const ey = earBaseY - Math.floor(earLength/4) + 3;
            overPixel(ex, ey, '#FBBF24');
        }
    }

    // --- 7. FACIAL FEATURES (Demonic Eyes & Fangs) ---
    for (let side of [-1, 1]) {
        const ex = cx + (side * 4); 
        
        // Sharp, angled brows
        let browY = eyeY - 2;
        overPixel(ex - side, browY + 1, hair.base); 
        overPixel(ex, browY, hair.base); 
        overPixel(ex + side, browY - 1, hair.base);
        overPixel(ex + side*2, browY - 1, hair.base); 
        
        // Eyes
        overPixel(ex - 1, eyeY - 1, '#020617');
        overPixel(ex, eyeY - 1, '#020617');
        overPixel(ex + 1, eyeY - 1, '#020617');
        overPixel(ex + side * 2, eyeY - 2, '#020617'); // Sharp wing
        
        if (eyeShape === 'glowing_orbs' || eyeShape === 'piercing') {
            const ec = eye.color;
            overPixel(ex - 1, eyeY, ec); overPixel(ex + 1, eyeY, ec); overPixel(ex, eyeY, ec);
            if (eyeShape === 'piercing') overPixel(ex, eyeY, '#FFFFFF'); // Hot center
        } else if (eyeShape === 'slits') {
            overPixel(ex - 1, eyeY, eye.color); overPixel(ex + 1, eyeY, eye.color);
            overPixel(ex, eyeY, '#000000'); // Vertical pupil
        } else if (eyeShape === 'solid_black') {
            overPixel(ex - 1, eyeY, '#000000'); overPixel(ex + 1, eyeY, '#000000'); overPixel(ex, eyeY, '#000000');
        }
        
        overPixel(ex, eyeY + 1, skin.shadow); // Heavy eye bags
    }

    // Nose
    for (let y = eyeY + 1; y < noseY; y++) {
        overPixel(cx, y, skin.highlight); 
        if (noseShape === 'aquiline' && y > eyeY + 2 && y < noseY - 2) overPixel(cx + 1, y, skin.shadow);
    }
    if (noseShape === 'aquiline') {
        overPixel(cx, noseY, skin.highlight); 
        overPixel(cx + 1, noseY, skin.shadow); overPixel(cx + 1, noseY - 1, skin.shadow);
        overPixel(cx - 1, noseY + 1, skin.shadow); overPixel(cx + 1, noseY + 1, skin.shadow);
    } else {
        overPixel(cx, noseY, skin.highlight); overPixel(cx + 1, noseY, skin.shadow);
        overPixel(cx - 1, noseY + 1, skin.shadow); overPixel(cx + 1, noseY + 1, skin.shadow);
    }

    // Mouth & Fangs
    const mw = 2;
    for (let x = -mw; x <= mw; x++) overPixel(cx + x, mouthY, lipDark);
    overPixel(cx, mouthY + 1, skin.shadow); // Crease under lip
    overPixel(cx, mouthY + 2, skin.highlight); // Chin tip

    // Tiny Fangs overlapping bottom lip
    overPixel(cx - 1, mouthY, '#F8FAFC'); 
    overPixel(cx + 1, mouthY, '#F8FAFC');

    // --- 8. FOREGROUND HAIR ---
    const hairLineY = headTopY + 3; 
    
    if (hairStyle !== 'bald') {
        for (let y = headTopY - 6; y <= chinY; y++) {
            let skullW = (y <= chinY) ? (faceW[y] || 0) : (faceW[chinY] || 0);
            if (y < headTopY) skullW = faceW[headTopY] - (headTopY - y) * 1.5; 
            if (skullW < 0) skullW = 0;
            
            for (let x = -skullW - 3; x <= skullW + 3; x++) {
                let draw = false;

                if (hairStyle === 'slick_back') {
                    if (y < hairLineY && Math.abs(x) <= skullW + 1) draw = true;
                    if (y >= headTopY - 4 && y < headTopY && Math.abs(x) <= skullW) draw = true;
                } else if (hairStyle === 'undercut') {
                    if (y < hairLineY && Math.abs(x) <= skullW) draw = true;
                    if (y >= headTopY - 4 && y < headTopY && Math.abs(x) <= skullW) draw = true;
                    if (y >= hairLineY && y < eyeY && Math.abs(x) >= skullW - 1) overPixel(cx + x, y, stubbleColor); 
                } else if (hairStyle === 'wild_mane' || hairStyle === 'long_straight') {
                    if (y < hairLineY && Math.abs(x) <= skullW + 2) draw = true;
                    if (y >= hairLineY && y < chinY && Math.abs(x) >= skullW - 1 && Math.abs(x) <= skullW + 3) draw = true;
                }

                if (y >= hairLineY && Math.abs(x) < skullW - 1) draw = false;

                if (draw) {
                    let c = hair.base;
                    if (hairStyle === 'slick_back' && x % 3 === 0) c = hair.shadow; 
                    if (y > headTopY - 3 && x < 0 && x % 4 === 0) c = hairSoftHigh; 
                    if (x > skullW) c = hair.shadow; 
                    overPixel(cx + x, y, c);
                }
            }
        }
    }

    // --- 9. BEARD ---
    if (beardStyle !== 'none') {
        for (let y = noseY + 2; y <= chinY + 4; y++) {
            let jawW = faceW[y] || faceW[chinY]; 
            for (let x = -jawW - 1; x <= jawW + 1; x++) {
                let draw = false;
                
                if (beardStyle === 'stubble' && y >= noseY + 3 && y <= chinY && Math.abs(x) <= jawW) {
                    if (y < mouthY && Math.abs(x) < jawW - 2) continue;
                    if (y === mouthY && Math.abs(x) <= mw) continue; 
                    overPixel(cx + x, y, stubbleColor);
                    continue;
                }
                
                if (beardStyle === 'goatee') {
                    if (y >= mouthY && y <= chinY + 3 && Math.abs(x) <= 2) draw = true;
                } else if (beardStyle === 'chops') {
                    if (Math.abs(x) >= jawW - 2 && Math.abs(x) <= jawW) draw = true;
                }

                if (y === mouthY && Math.abs(x) <= mw) draw = false; 

                if (draw) {
                    let c = hair.base;
                    if ((x+y)%3===0) c = hairSoftHigh; 
                    if (x > jawW - 1 || y > chinY + 1) c = hair.shadow; 
                    overPixel(cx + x, y, c);
                }
            }
        }
    }

    // --- 10. PROCEDURAL HORNS (Drawn on top of hair/face) ---
    const drawHornBase = (hx, hy) => {
        // Blends the root of the horn into the forehead/hair
        overPixel(hx - 1, hy, skin.shadow); overPixel(hx + 1, hy, skin.shadow);
        overPixel(hx, hy + 1, skin.shadow); overPixel(hx, hy - 1, skin.shadow);
    };

    const drawHornSegment = (hx, hy, width) => {
        for (let dx = -Math.floor(width/2); dx <= Math.floor(width/2); dx++) {
            for (let dy = -Math.floor(width/2); dy <= Math.floor(width/2); dy++) {
                if (Math.abs(dx) + Math.abs(dy) <= width - 1) {
                    let c = hornMat.base;
                    if (dx > 0 || dy > 0) c = hornMat.shadow;
                    if (dx < 0 && dy < 0) c = hornMat.highlight;
                    
                    // Texture ridges (horizontal lines across the horn)
                    if (hy % 3 === 0) c = hornMat.shadow;
                    
                    overPixel(hx + dx, hy + dy, c);
                }
            }
        }
    };

    for (let side of [-1, 1]) {
        const rootX = cx + (side * 4);
        const rootY = headTopY + 1;
        drawHornBase(rootX, rootY);

        const isBroken = hornStyle === 'broken' && side === 1; // Right horn breaks

        if (hornStyle === 'swept_back' || hornStyle === 'broken') {
            const steps = isBroken ? rng.int(4, 7) : rng.int(12, 18);
            for (let i = 0; i <= steps; i++) {
                const t = i / 18; 
                // Curves up and backwards
                const hx = Math.round(rootX + side * (t * 12));
                const hy = Math.round(rootY - (t * 20) + (t * t * 15)); 
                const width = Math.max(1, Math.floor(4 * (1 - t)));
                
                drawHornSegment(hx, hy, width);
                
                if (isBroken && i === steps) {
                    // Jagged tip
                    overPixel(hx, hy - 1, hornMat.highlight);
                    overPixel(hx + side, hy - 2, hornMat.shadow);
                }
            }
        } else if (hornStyle === 'ram_curled') {
            const steps = 24;
            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                // Complex parametric loop: out, down, forward
                const angle = t * Math.PI * 1.8; // Almost a full circle
                const radius = 3 + t * 6;
                const hx = Math.round(rootX + side * (radius * Math.sin(angle)));
                const hy = Math.round(rootY - (radius * Math.cos(angle)) + t * 8);
                const width = Math.max(1, Math.floor(4 * (1 - (t * 0.8)))); // Keeps some thickness
                
                drawHornSegment(hx, hy, width);
            }
        } else if (hornStyle === 'short_spikes') {
            for (let i = 0; i <= 5; i++) {
                const width = Math.max(1, Math.floor(3 * (1 - i/5)));
                drawHornSegment(rootX + (side * i), rootY - i * 2, width);
            }
        }
    }

    // --- 11. DETAILS (Demonic Tattoos / Scars) ---
    if (feature === 'demonic_tattoos') {
        const ink = blend(skin.shadow, '#000000', 0.6);
        // Geometric lines under the eyes and on forehead
        overPixel(cx, headTopY + 3, ink); overPixel(cx, headTopY + 4, ink);
        overPixel(cx - 1, headTopY + 5, ink); overPixel(cx + 1, headTopY + 5, ink);
        
        for (let side of [-1, 1]) {
            overPixel(cx + side*3, eyeY + 2, ink);
            overPixel(cx + side*4, eyeY + 3, ink);
            overPixel(cx + side*3, eyeY + 4, ink);
        }
    } else if (feature === 'scales') {
        for (let y = jawShape === 'chiseled' ? noseY : mouthY; y <= chinY + 2; y++) {
            const w = faceW[y];
            for (let x = -w; x <= w; x++) {
                if (Math.abs(x) >= w - 2 && (x+y)%2 === 0 && grid[y][cx+x] === skin.base) {
                    overPixel(cx+x, y, skin.shadow);
                }
            }
        }
    }

    // --- 12. OUTLINE PASS ---
    const outlineGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            if (grid[y][x] === null) {
                if ((y > 0 && grid[y - 1][x] !== null) || 
                    (y < GRID_SIZE - 1 && grid[y + 1][x] !== null) || 
                    (x > 0 && grid[y][x - 1] !== null) || 
                    (x < GRID_SIZE - 1 && grid[y][x + 1] !== null)) {
                    outlineGrid[y][x] = '#020617'; 
                }
            }
        }
    }

    // --- 13. RENDER ---
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            let colorCode = grid[y][x] || outlineGrid[y][x];
            // Glowing eyes punch through outlines
            if (eyeShape === 'glowing_orbs' && grid[y][x] === eye.color) colorCode = eye.color; 
            if (colorCode) drawScaledRect(ctx, x, y, 1, 1, colorCode, DISPLAY_SCALE);
        }
    }

    return {
        imageDataUrl: offscreenCanvas.toDataURL(),
        data: { jawShape, hornStyle, eyeShape, hairStyle, beardStyle, clothStyle, feature }
    };
}