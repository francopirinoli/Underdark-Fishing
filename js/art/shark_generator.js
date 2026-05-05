/**
 * js/art/shark_generator.js
 * Generates stylized, outlined, predatory fish sprites (Sharks, Placoderms, Sawfish).
 */

import { drawScaledRect } from '../util/utils.js';
import { getRandomPalette } from './palettes.js';

const GRID_SIZE = 64;
const DISPLAY_SCALE = 4;
const CANVAS_SIZE = GRID_SIZE * DISPLAY_SCALE;

export function generateShark(options = {}) {
    const rng = options.rng || { 
        next: Math.random, int: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min, 
        chance: (p) => Math.random() < p, pick: (arr) => arr[Math.floor(Math.random() * arr.length)]
    };

    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = CANVAS_SIZE;
    offscreenCanvas.height = CANVAS_SIZE;
    const ctx = offscreenCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const palette = options.palette || getRandomPalette(rng);
    const grid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));

    function setPixel(x, y, colorCode) {
        x = Math.round(x); y = Math.round(y);
        if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
            // Protect foreground pectoral fins from being overwritten
            if (grid[y][x] !== 'F' && grid[y][x] !== 'H_F') { 
                grid[y][x] = colorCode;
            }
        }
    }

    function drawSweptFin(tipX, tipY, baseX1, baseX2, baseY, baseColor, leadingEdgeColor, isRagged = false) {
        const minY = Math.min(tipY, baseY);
        const maxY = Math.max(tipY, baseY);
        for (let y = minY; y <= maxY; y++) {
            const progress = (y - tipY) / (baseY - tipY || 1); 
            const p = Math.max(0, Math.min(1, progress));
            const x1 = tipX + (baseX1 - tipX) * p;
            const x2 = tipX + (baseX2 - tipX) * p;
            const minX = Math.floor(Math.min(x1, x2));
            const maxX = Math.ceil(Math.max(x1, x2));
            for (let x = minX; x <= maxX; x++) {
                if (isRagged && x === minX && y % 3 === 0 && y < maxY - 2) continue; 
                setPixel(x, y, x === maxX ? leadingEdgeColor : baseColor);
            }
        }
    }

    const cx = 32, cy = 32; 
    
    const bodyShape = rng.pick(['standard', 'bulky', 'slender']);
    let frontLength = rng.int(16, 22); 
    let backLength = rng.int(18, 24);  
    let bodyHeight = rng.int(6, 10);   
    
    if (bodyShape === 'bulky') bodyHeight += rng.int(2, 4);
    if (bodyShape === 'slender') bodyHeight -= rng.int(1, 2);
    
    const headType = rng.pick(['pointed', 'blunt', 'hammerhead', 'armored', 'goblin', 'sawshark']);
    const tailType = rng.pick(['heterocercal', 'crescent', 'thresher']);
    const dorsalType = rng.pick(['standard', 'tall', 'ragged']);
    
    const tailLength = tailType === 'thresher' ? rng.int(18, 26) : rng.int(10, 15);
    const dorsalHeight = dorsalType === 'tall' ? rng.int(10, 14) : rng.int(6, 10);
    
    const patternType = rng.pick(['countershade', 'tiger_stripes', 'mottled', 'glowing_spots', 'scarred', 'none']);
    const eyeType = rng.pick(['dead', 'glowing', 'slit']);
    const hasGlowGills = rng.chance(0.4);

    // 1. TAIL & PELVIC FIN
    const tailBaseX1 = cx - backLength + 6; 
    const tailBaseX2 = cx - backLength + 1;
    
    const topTipX = cx - backLength - (tailType === 'thresher' ? Math.floor(tailLength * 0.8) : tailLength) + rng.int(0, 3);
    const topTipY = cy - (tailType === 'thresher' ? rng.int(16, 22) : rng.int(8, 14));
    drawSweptFin(topTipX, topTipY, tailBaseX1, tailBaseX2, cy, 'S', 'B', dorsalType === 'ragged');

    let botTipX = cx - backLength - Math.floor(tailLength * 0.6);
    let botTipY = cy + rng.int(5, 9);
    if (tailType === 'crescent') {
        botTipX = topTipX + rng.int(-1, 2); 
        botTipY = cy + (cy - topTipY) - rng.int(0, 2);
    } else if (tailType === 'thresher') {
        botTipX = cx - backLength - 4; 
        botTipY = cy + 4;
    }
    drawSweptFin(botTipX, botTipY, tailBaseX1, tailBaseX2, cy, 'S', 'H', dorsalType === 'ragged');

    const pelvicTipX = cx - Math.floor(backLength * 0.5) - rng.int(1, 3);
    const pelvicTipY = cy + Math.floor(bodyHeight * 0.6) + rng.int(2, 4);
    const pelvicBase1 = cx - Math.floor(backLength * 0.4);
    const pelvicBase2 = cx - Math.floor(backLength * 0.2);
    drawSweptFin(pelvicTipX, pelvicTipY, pelvicBase1, pelvicBase2, cy + Math.floor(bodyHeight * 0.4), 'S', 'S');

    // 2. DORSAL FIN
    const dorsalTipX = cx - rng.int(2, 8);
    const dorsalTipY = cy - bodyHeight - dorsalHeight + 2;
    const dorsalBase1 = cx - 2;
    const dorsalBase2 = cx + 5;
    drawSweptFin(dorsalTipX, dorsalTipY, dorsalBase1, dorsalBase2, cy - Math.floor(bodyHeight * 0.5), 'S', 'B', dorsalType === 'ragged');

    // 3. MAIN BODY & JAW
    for (let x = cx - backLength; x <= cx + frontLength; x++) {
        const isFront = x > cx;
        const lengthRef = isFront ? frontLength : backLength;
        const normalizedX = (x - cx) / lengthRef;
        
        let hTop = bodyHeight * Math.sqrt(1 - Math.pow(normalizedX, 2));
        if (isFront && (headType === 'pointed' || headType === 'goblin')) {
            hTop = bodyHeight * (1 - Math.pow(normalizedX, 1.5)); 
        }
        hTop = Math.max(2, Math.floor(hTop));

        let hBot = bodyHeight * Math.sqrt(1 - Math.pow(normalizedX, 2));
        hBot = Math.max(1, Math.floor(hBot));

        let isMouthArea = false;
        let jawStartOffset = headType === 'goblin' ? 0.25 : 0.45;

        if (isFront && x > cx + frontLength * jawStartOffset) {
            const jawProgress = (x - (cx + frontLength * jawStartOffset)) / (frontLength * (1 - jawStartOffset));
            hBot = hBot - Math.floor(Math.pow(jawProgress, 1.2) * bodyHeight * (headType === 'goblin' ? 1.2 : 0.8)); 
            isMouthArea = true;
        }
        hBot = Math.max(0, Math.floor(hBot)); 

        for (let y = -hTop; y <= hBot; y++) {
            let color = 'B';
            if (y < -hTop * 0.2) color = 'S'; 
            if (y > Math.max(1, hBot * 0.2)) color = 'H';  

            if (headType === 'armored' && x > cx - 4) {
                 if (Math.abs(y) > hTop * 0.7 || x === cx - 4 || x === cx + 4 || (x%3===0 && y<0)) color = 'S'; 
                 else color = 'B'; 
            }

            if (patternType === 'tiger_stripes' && x % 5 === 0 && y < 0) color = 'B'; 
            if (patternType === 'mottled' && rng.chance(0.15) && color === 'S') color = 'B';
            if (patternType === 'glowing_spots' && rng.chance(0.1) && y > -hTop*0.5 && y < 0) color = 'G';
            if (patternType === 'scarred' && rng.chance(0.02)) {
                setPixel(x, cy + y, 'H'); setPixel(x+1, cy + y-1, 'H');
            }

            setPixel(x, cy + y, color);
        }

        if (isMouthArea && hBot > 0) {
            if (headType === 'goblin') {
                if (x % 2 === 0) setPixel(x, cy + hBot + 1, 'W');
                if (x % 3 === 0) setPixel(x, cy + hBot + 2, 'W');
                setPixel(x, cy + hBot, 'D'); 
            } else {
                if (x % 2 === 1 && x < cx + frontLength - 1) {
                    setPixel(x, cy + hBot, 'W');     
                    setPixel(x, cy + hBot - 1, 'D'); 
                }
            }
        }
    }

    // 4. SAWSHARK ROSTRUM
    let snoutX = cx + frontLength;
    if (headType === 'sawshark') {
        const sawLength = rng.int(8, 12);
        for (let i = 0; i < sawLength; i++) {
            const sx = snoutX + i;
            setPixel(sx, cy - 1, 'S'); 
            setPixel(sx, cy, 'H');     
            if (i % 2 === 1) {
                setPixel(sx, cy - 2, 'W'); 
                setPixel(sx, cy + 1, 'W'); 
            }
        }
        snoutX += sawLength; 
    }

    // 5. PECTORAL FIN
    const pecBaseStartX = cx + Math.floor(frontLength * 0.1);
    const pecBaseEndX = pecBaseStartX + rng.int(3, 6); 
    const pecLength = rng.int(6, 10); 
    const pecSweep = rng.int(2, 6); 
    const pecTipX = pecBaseStartX - pecSweep;
    const pecBaseY = cy + Math.floor(bodyHeight * 0.4); 
    const pecTipY = pecBaseY + pecLength;
    
    for (let y = pecBaseY; y <= pecTipY; y++) {
        const progress = (y - pecBaseY) / (pecTipY - pecBaseY || 1);
        const x1 = pecBaseStartX + (pecTipX - pecBaseStartX) * progress;
        const x2 = pecBaseEndX + (pecTipX - pecBaseEndX) * progress;
        const minX = Math.floor(Math.min(x1, x2));
        const maxX = Math.ceil(Math.max(x1, x2));
        
        for (let x = minX; x <= maxX; x++) {
            if (dorsalType === 'ragged' && x === minX && y % 3 === 0 && y < pecTipY - 1) continue;
            grid[y][x] = (x === maxX) ? 'H_F' : 'F'; 
        }
    }

    // 6. HEAD DETAILS
    const actualSnoutX = cx + frontLength; 
    const numGills = rng.int(3, 5);
    const gillStartX = cx + Math.floor(frontLength * 0.15);
    for (let g = 0; g < numGills; g++) {
        const x = gillStartX + (g * 2);
        const gillYStart = cy - 2 + Math.floor(g * 0.5); 
        for (let y = 0; y < 4; y++) {
            const currentC = grid[gillYStart + y][x];
            if (currentC === 'B' || currentC === 'H' || currentC === 'S') grid[gillYStart + y][x] = hasGlowGills ? 'G' : 'D';
        }
    }

    let eyeX = actualSnoutX - Math.floor(frontLength * 0.25);
    let eyeY = cy - Math.floor(bodyHeight * 0.3);
    
    if (headType === 'hammerhead') {
        const hammerWidth = rng.int(5, 9);
        const hammerX = actualSnoutX - 3;
        for (let hy = -hammerWidth; hy <= hammerWidth; hy++) {
            for (let hx = 0; hx < 4; hx++) {
                let c = 'B';
                if (hy < -hammerWidth * 0.6) c = 'S';
                if (hy > hammerWidth * 0.6) c = 'H';
                setPixel(hammerX + hx, cy + hy, c);
            }
        }
        eyeX = actualSnoutX;
        eyeY = cy - hammerWidth; 
        setPixel(actualSnoutX, cy + hammerWidth, eyeType === 'glowing' ? 'G' : 'D'); 
    }

    if (eyeType === 'dead') setPixel(eyeX, eyeY, 'D'); 
    else if (eyeType === 'glowing') { setPixel(eyeX, eyeY, 'G'); setPixel(eyeX - 1, eyeY, 'G'); } 
    else if (eyeType === 'slit') { setPixel(eyeX, eyeY, 'D'); setPixel(eyeX, eyeY - 1, 'H'); }

    // 7. OUTLINE
    const outlineGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
    for (let y = 0; y < GRID_SIZE; y++) for (let x = 0; x < GRID_SIZE; x++) {
        if (grid[y][x] === null) {
            if ((y > 0 && grid[y - 1][x] !== null) || (y < GRID_SIZE - 1 && grid[y + 1][x] !== null) || 
                (x > 0 && grid[y][x - 1] !== null) || (x < GRID_SIZE - 1 && grid[y][x + 1] !== null)) {
                outlineGrid[y][x] = 'O';
            }
        }
    }

    // 8. RENDER
    const colorMap = {
        'B': palette.base, 'S': palette.shadow, 'H': palette.highlight,
        'G': palette.glow, 'O': palette.outline, 'D': '#030712', 'W': '#F9FAFB',
        'F': palette.shadow, 'H_F': palette.base
    };

    for (let y = 0; y < GRID_SIZE; y++) for (let x = 0; x < GRID_SIZE; x++) {
        let colorCode = grid[y][x] || outlineGrid[y][x];
        if (colorCode) drawScaledRect(ctx, x, y, 1, 1, colorMap[colorCode], DISPLAY_SCALE);
    }

    // 9. NAMING
    const regions =["Darklake", "Blingdenstone", "Whisper-Chasm", "Grog-Mud", "Crystal-Spire", "Rot-Garden", "Sunless-Sea", "Black-Reach", "Deep-Whorl", "Abyssal-Trench"];
    const colors =["Ghostly", "Neon", "Crimson", "Obsidian", "Bone-White", "Rust", "Ash", "Void", "Iron", "Pale"];
    const traits =["Savage", "Ravenous", "Blind", "Gloom", "Abyssal", "Stygian", "Fungal", "Runic", "Echoing", "Scarred", "Ancient", "Vengeful", "Silent", "Twisted", "Iron-Hide"];
    const nouns =["Ripper", "Maw", "Thresher", "Stalker", "Hulk", "Slayer", "Butcher", "Ravager", "Biter", "Gnasher", "Fin", "Terror", "Predator", "Dreadnought", "Shark", "Hunter"];
    const localNames =["Cave-Ripper", "Blood-Hunter", "Gloom-Maw", "Trench-Terror", "Abyss-Walker", "Bone-Crusher", "Flesh-Tearer", "Depth-Slayer"];

    let fishName = "";
    const nameRoll = rng.next();
    
    if (nameRoll < 0.25) fishName = `${rng.pick(traits)} ${rng.pick(nouns)}`;
    else if (nameRoll < 0.5) fishName = `${rng.pick(colors)} ${rng.pick(traits)} ${rng.pick(nouns)}`;
    else if (nameRoll < 0.7) fishName = `${rng.pick(localNames)} of ${rng.pick(regions)}`;
    else if (nameRoll < 0.85) fishName = `${rng.pick(regions)} ${rng.pick(nouns)}`;
    else fishName = `${rng.pick(traits)} ${rng.pick(localNames)}`;

    if (headType === 'hammerhead') fishName = "Hammer-Headed " + fishName;
    if (headType === 'armored') fishName = "Plated " + fishName;
    if (headType === 'sawshark') fishName = "Saw-Toothed " + fishName;
    if (headType === 'goblin') fishName = "Goblin " + fishName;
    if (tailType === 'thresher' && !fishName.includes("Thresh")) fishName = "Whip-Tailed " + fishName;

    return {
        name: fishName,
        family: "Predatory / Shark",
        imageDataUrl: offscreenCanvas.toDataURL(),
        data: { palette: palette.name, bodyShape, headType, tailType, dorsalType, pattern: patternType, eyeType }
    };
}