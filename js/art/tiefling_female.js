/**
 * js/art/tiefling_female.js
 * Generates highly varied Tiefling Female portraits.
 * Features slender demonic proportions, procedural horns integrating with feminine hairstyles, 
 * pupil-less/glowing eyes, fangs, and exotic skin tones.
 */

import { drawScaledRect } from '../util/utils.js';

const GRID_SIZE = 64;
const DISPLAY_SCALE = 4;
const CANVAS_SIZE = GRID_SIZE * DISPLAY_SCALE;

export function generateTieflingFemale(options = {}) {
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
    const lipDark = blend(skin.shadow, '#000000', 0.4); // Very dark, almost black lips
    const lipLight = blend(skin.base, '#000000', 0.2); 

    // Horn Materials
    const hornPalettes = [
        { base: '#E7E5E4', shadow: '#A8A29E', highlight: '#FAFAF9' }, // Bone
        { base: '#1F2937', shadow: '#030712', highlight: '#4B5563' }, // Obsidian
        { base: '#451A03', shadow: '#270E01', highlight: '#78350F' }  // Ash
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
    const headTopY = 14;
    const eyeY = 29;
    const noseY = 37;
    const mouthY = 43;
    const chinY = 50; // Slender, sharp chin

    // --- 1. PROCEDURAL PARAMETERS ---
    const jawShape = rng.pick(['heart', 'pointed', 'diamond', 'narrow_oval']);
    const noseShape = rng.pick(['delicate', 'straight', 'aquiline']);
    const eyeShape = rng.pick(['glowing_orbs', 'slits', 'solid_black', 'sharp_winged']);
    
    const hornStyle = rng.pick(['swept_back', 'ram_curled', 'crown_spikes', 'asymmetric']);
    const hairStyle = rng.pick(['long_straight', 'wavy', 'elegant_braid', 'pixie', 'half_up']);
    const bangStyle = rng.pick(['swept', 'parted', 'fringe', 'none']); 
    
    const clothStyle = rng.pick(['elegant_gown', 'leather_armor', 'tunic', 'cowl']);
    const feature = rng.pick(['none', 'demonic_tattoos', 'scar', 'scales', 'earrings']); 

    const lashColor = '#020617';

    // --- 2. FACIAL CONTOUR MAP ---
    const faceW = Array(GRID_SIZE).fill(0);
    const maxW = 9; // Slender skull

    for (let y = headTopY; y <= chinY; y++) {
        let w = 0;
        if (y <= eyeY) {
            const dy = (eyeY - y) / (eyeY - headTopY); 
            w = maxW * Math.pow(1 - Math.pow(dy, 2), 0.45); 
        } else {
            const dy = (y - eyeY) / (chinY - eyeY); 
            if (jawShape === 'heart') w = maxW - 4.5 * Math.pow(dy, 1.4);
            else if (jawShape === 'pointed') w = maxW - 5.5 * dy;
            else if (jawShape === 'diamond') w = maxW + (dy < 0.35 ? dy * 1.2 : -(dy - 0.35) * 4); 
            else if (jawShape === 'narrow_oval') w = maxW * Math.sqrt(1 - dy * dy * 0.95);
        }
        faceW[y] = Math.max(2, Math.round(w)); 
    }

    // --- 3. BACKGROUND HAIR ---
    if (['long_straight', 'wavy', 'elegant_braid', 'half_up'].includes(hairStyle)) {
        for (let y = eyeY; y < GRID_SIZE; y++) {
            let spread = maxW + 2;
            if (hairStyle === 'long_straight') spread += (y - eyeY) * 0.15;
            if (hairStyle === 'wavy') spread += Math.sin(y * 0.4) * 2 + (y - eyeY) * 0.2;
            if (hairStyle === 'elegant_braid') spread = maxW + 1; 
            
            spread = Math.floor(spread);
            for (let x = -spread; x <= spread; x++) {
                if (Math.abs(x) > 3) setPixel(cx + x, y, hair.shadow); 
            }
        }
    }

    // --- 4. SLENDER NECK & SHOULDERS ---
    const neckW = 3; 
    for (let y = chinY - 3; y <= chinY + 5; y++) {
        for (let x = -neckW; x <= neckW; x++) {
            let c = skin.shadow;
            if (x < -neckW + 1) c = skin.base; 
            overPixel(cx + x, y, c);
        }
    }

    for (let y = chinY + 4; y < GRID_SIZE; y++) {
        const shoulderWidth = 7 + (y - (chinY + 4)) * 1.5; 
        for (let x = -Math.floor(shoulderWidth); x <= Math.floor(shoulderWidth); x++) {
            let c = cloth.base;
            if (x > shoulderWidth * 0.4) c = cloth.shadow;
            if (x < -shoulderWidth * 0.4) c = cloth.highlight;
            
            const isCenter = Math.abs(x) <= neckW + 1;
            
            if (clothStyle === 'tunic' && isCenter && y < chinY + 7) continue;
            if (clothStyle === 'elegant_gown' && isCenter && y < chinY + 9) continue; 
            if (clothStyle === 'cowl' && Math.abs(x) < 7 && y < chinY + 8) c = cloth.highlight; 
            if (clothStyle === 'leather_armor' && (x - y) % 4 === 0) c = cloth.shadow; 
            
            if (clothStyle === 'elegant_gown' && Math.abs(x) > 5 && Math.abs(x) < 8 && y < chinY + 11) c = '#FBBF24'; // Gold accents
            
            overPixel(cx + x, y, c);
        }
    }

    // --- 5. THE FACE ---
    for (let y = headTopY; y <= chinY; y++) {
        const w = faceW[y];
        for (let x = -w; x <= w; x++) {
            let c = skin.base;
            if (x > w - 1) c = skin.shadow;         
            if (x < -w + 1 && y < noseY) c = skin.highlight; 
            if (y > chinY - 1) c = skin.shadow;     
            
            // Demonic sharp cheekbones
            if (y > noseY && y < mouthY && Math.abs(x) >= w - 2) {
                if ((x+y) % 2 === 0 || jawShape === 'diamond') c = skin.shadow; 
            }
            
            overPixel(cx + x, y, c);
        }
    }

    // --- 6. POINTED EARS & EARRINGS ---
    const earLength = rng.int(5, 8);
    for (let side of[-1, 1]) {
        let earBaseY = eyeY + 1;
        let earBaseX = faceW[earBaseY];
        
        for (let e = 1; e <= earLength; e++) {
            let ex = cx + side * (earBaseX + e);
            let ey = Math.floor(earBaseY - e * 0.6);

            overPixel(ex, ey, skin.highlight);
            overPixel(ex, ey + 1, skin.base);
            overPixel(ex, ey + 2, skin.shadow);
            
            if (e === earLength) {
                overPixel(ex, ey + 1, skin.shadow);
                overPixel(ex, ey + 2, null); 
            }

            if (feature === 'earrings' && e === Math.floor(earLength/2)) {
                overPixel(ex, ey + 3, '#FBBF24');
                overPixel(ex, ey + 4, '#EF4444'); // Ruby gem
            }
        }
    }

    // --- 7. FACIAL FEATURES ---
    
    // Eyes & Makeup
    for (let side of [-1, 1]) {
        const ex = cx + (side * 4); 
        
        // Brows (Sharply arched)
        let browY = eyeY - 3;
        overPixel(ex - side, browY + 1, hair.base); 
        overPixel(ex, browY, hair.base); // Arch
        overPixel(ex + side, browY, hair.base);
        overPixel(ex + side*2, browY + 1, hair.base); 
        
        // Eyeliner (Top)
        overPixel(ex - 1, eyeY - 1, lashColor);
        overPixel(ex, eyeY - 1, lashColor);
        overPixel(ex + 1, eyeY - 1, lashColor);
        overPixel(ex + side * 2, eyeY - 2, lashColor); // Winged tip

        // Demonic Eye Styling
        if (eyeShape === 'glowing_orbs') {
            const ec = eye.color;
            overPixel(ex - 1, eyeY, ec); overPixel(ex + 1, eyeY, ec); overPixel(ex, eyeY, ec);
            overPixel(ex, eyeY, '#FFFFFF'); // Hot center
        } else if (eyeShape === 'slits') {
            overPixel(ex - 1, eyeY, eye.color); overPixel(ex + 1, eyeY, eye.color);
            overPixel(ex, eyeY, '#000000'); // Vertical pupil
        } else if (eyeShape === 'solid_black') {
            overPixel(ex - 1, eyeY, '#000000'); overPixel(ex + 1, eyeY, '#000000'); overPixel(ex, eyeY, '#000000');
        } else {
            // Sharp winged (normal eyes but demonic colors)
            overPixel(ex - 1, eyeY, '#F8FAFC'); overPixel(ex + 1, eyeY, '#F8FAFC');
            overPixel(ex, eyeY, eye.color);
            overPixel(ex - 1, eyeY + 1, skin.shadow); // Sharp undereye
        }
    }

    // Delicate Nose
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

    // Mouth with Fangs
    const mw = 2;
    for (let x = -mw + 1; x <= mw - 1; x++) overPixel(cx + x, mouthY, lipDark);
    for (let x = -mw; x <= mw; x++) overPixel(cx + x, mouthY + 1, lipLight);
    
    // Fangs overlapping bottom lip
    overPixel(cx - 1, mouthY, '#F8FAFC'); 
    overPixel(cx + 1, mouthY, '#F8FAFC');
    
    overPixel(cx, mouthY + 3, skin.highlight); 

    // --- 8. FOREGROUND HAIR ---
    const hairLineY = headTopY + 3; 
    
    for (let y = headTopY - 6; y <= chinY + 10; y++) {
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
                    if (Math.hypot(x, y - (headTopY - 2)) < 4) draw = true; 
                }
                if (y >= eyeY && y < chinY + 6 && Math.abs(x) >= skullW && Math.abs(x) <= skullW + 2) draw = true;
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
            }

            // MASK EARS
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

    // --- 9. PROCEDURAL HORNS ---
    // Horns render on top of the hair to poke through
    const drawHornSegment = (hx, hy, width) => {
        for (let dx = -Math.floor(width/2); dx <= Math.floor(width/2); dx++) {
            for (let dy = -Math.floor(width/2); dy <= Math.floor(width/2); dy++) {
                if (Math.abs(dx) + Math.abs(dy) <= width - 1) {
                    let c = hornMat.base;
                    if (dx > 0 || dy > 0) c = hornMat.shadow;
                    if (dx < 0 && dy < 0) c = hornMat.highlight;
                    if (hy % 3 === 0) c = hornMat.shadow; // Ridges
                    
                    // Shadow root blending
                    if (hy >= headTopY - 1) c = hair.shadow; 
                    
                    overPixel(hx + dx, hy + dy, c);
                }
            }
        }
    };

    for (let side of [-1, 1]) {
        const rootX = cx + (side * 3); // Slightly closer together on female skull
        const rootY = headTopY + 2;
        
        const isBroken = hornStyle === 'asymmetric' && side === 1;

        if (hornStyle === 'swept_back' || hornStyle === 'asymmetric') {
            const steps = isBroken ? rng.int(4, 6) : rng.int(12, 16);
            for (let i = 0; i <= steps; i++) {
                const t = i / 16; 
                const hx = Math.round(rootX + side * (t * 10));
                const hy = Math.round(rootY - (t * 18) + (t * t * 10)); 
                const width = Math.max(1, Math.floor(3 * (1 - t)));
                
                drawHornSegment(hx, hy, width);
                
                if (isBroken && i === steps) {
                    overPixel(hx, hy - 1, hornMat.highlight);
                    overPixel(hx + side, hy - 2, hornMat.shadow);
                }
            }
        } else if (hornStyle === 'ram_curled') {
            const steps = 20;
            for (let i = 0; i <= steps; i++) {
                const t = i / steps;
                const angle = t * Math.PI * 1.6; 
                const radius = 2 + t * 5;
                const hx = Math.round(rootX + side * (radius * Math.sin(angle)));
                const hy = Math.round(rootY - (radius * Math.cos(angle)) + t * 6);
                const width = Math.max(1, Math.floor(3 * (1 - (t * 0.7)))); 
                
                drawHornSegment(hx, hy, width);
            }
        } else if (hornStyle === 'crown_spikes') {
            // A halo of small spikes across the crown
            for (let i = 0; i <= 3; i++) {
                const width = Math.max(1, Math.floor(2 * (1 - i/3)));
                drawHornSegment(cx + (side * 2) + (side * i), rootY - i * 1.5, width);
            }
            if (side === 1) { // Center spike drawn once
                for (let i = 0; i <= 3; i++) drawHornSegment(cx, rootY - 1 - i * 1.5, Math.max(1, Math.floor(2 * (1 - i/3))));
            }
        }
    }

    // --- 10. DETAILS (Demonic Tattoos / Scars) ---
    if (feature === 'demonic_tattoos') {
        const ink = blend(skin.shadow, '#000000', 0.6);
        // Delicate swept lines
        for (let side of [-1, 1]) {
            overPixel(cx + side*2, eyeY + 2, ink); 
            overPixel(cx + side*3, eyeY + 2, ink);
            overPixel(cx + side*4, eyeY + 1, ink);
        }
        overPixel(cx, headTopY + 4, ink);
        overPixel(cx, headTopY + 5, ink);
    } else if (feature === 'scales') {
        for (let y = noseY; y <= chinY + 2; y++) {
            const w = faceW[y];
            for (let x = -w; x <= w; x++) {
                if (Math.abs(x) >= w - 2 && (x+y)%2 === 0 && grid[y][cx+x] === skin.base) {
                    overPixel(cx+x, y, skin.shadow);
                }
            }
        }
    } else if (feature === 'scar') {
        overPixel(cx + 2, eyeY + 2, '#7F1D1D'); overPixel(cx + 3, eyeY + 1, '#7F1D1D');
    }

    // --- 11. OUTLINE PASS ---
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

    // --- 12. RENDER ---
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
        data: { jawShape, hornStyle, eyeShape, hairStyle, bangStyle, clothStyle, feature }
    };
}