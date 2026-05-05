/**
 * js/art/crustacean_generator.js
 * Generates stylized, outlined, top-down crustacean sprites.
 */

import { drawScaledRect } from '../util/utils.js';
import { getRandomPalette } from './palettes.js';

const GRID_SIZE = 64;
const DISPLAY_SCALE = 4;
const CANVAS_SIZE = GRID_SIZE * DISPLAY_SCALE;

export function generateCrustacean(options = {}) {
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
            grid[y][x] = colorCode;
        }
    }

    function forcePixel(x, y, colorCode) {
        x = Math.round(x); y = Math.round(y);
        if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
            grid[y][x] = colorCode;
        }
    }

    function drawGridLine(x0, y0, x1, y1, colorCode, thickness = 1) {
        x0 = Math.round(x0); y0 = Math.round(y0);
        x1 = Math.round(x1); y1 = Math.round(y1);
        let dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
        let sx = (x0 < x1) ? 1 : -1, sy = (y0 < y1) ? 1 : -1;
        let err = dx - dy;

        while (true) {
            const offset = Math.floor(thickness / 2);
            for (let ty = -offset; ty <= offset + (thickness % 2 === 0 ? -1 : 0); ty++) {
                for (let tx = -offset; tx <= offset + (thickness % 2 === 0 ? -1 : 0); tx++) {
                    setPixel(x0 + tx, y0 + ty, colorCode);
                }
            }
            if (x0 === x1 && y0 === y1) break;
            let e2 = 2 * err;
            if (e2 > -dy) { err -= dy; x0 += sx; }
            if (e2 < dx) { err += dx; y0 += sy; }
        }
    }

    function drawGridEllipse(cx, cy, rx, ry, colorCode) {
        for (let y = -ry; y <= ry; y++) {
            const w = Math.floor(rx * Math.sqrt(1 - Math.pow(y / ry, 2)));
            for (let x = -w; x <= w; x++) setPixel(cx + x, cy + y, colorCode);
        }
    }

    const cx = 32; 
    let cy = 32; 
    
    const type = rng.pick(['crab', 'lobster', 'isopod', 'shrimp']);
    const patternType = rng.pick(['clean', 'spotted', 'banded', 'bioluminescent_joints']);
    const shellDecor = rng.pick(['smooth', 'barnacles', 'spikes']);
    
    const crabStyle = type === 'crab' ? rng.pick(['standard', 'spider', 'fiddler']) : 'none';
    
    // 1. LOBSTER & SHRIMP
    if (type === 'lobster' || type === 'shrimp') {
        const isShrimp = type === 'shrimp';
        cy = 25; 
        
        const headWidth = isShrimp ? rng.int(3, 5) : rng.int(5, 7);
        const headLength = isShrimp ? rng.int(6, 9) : rng.int(8, 11);
        const tailSegments = isShrimp ? rng.int(5, 7) : rng.int(4, 6);
        const tailSegLength = isShrimp ? 2 : 3;
        const clawType = isShrimp ? rng.pick(['pincer', 'mantis']) : rng.pick(['crusher', 'pincer']);
        
        for (let side of[-1, 1]) {
            const antLen = isShrimp ? rng.int(18, 24) : rng.int(14, 18);
            const antCurveX = cx + (side * Math.floor(antLen * (isShrimp ? 1.0 : 0.8)));
            const antEndY = cy - headLength - Math.floor(antLen * 0.5);
            drawGridLine(cx + (side * 2), cy - headLength, antCurveX, cy - headLength - (isShrimp?6:4), 'H', 1);
            drawGridLine(antCurveX, cy - headLength - (isShrimp?6:4), cx + (side * antLen), antEndY, 'S', 1);
        }

        for (let side of [-1, 1]) {
            const numLegs = isShrimp ? 3 : 4;
            for (let i = 0; i < numLegs; i++) {
                const legY = cy + (i * 3);
                const kneeX = cx + (side * (headWidth + (isShrimp ? 2 : 4) + i));
                const kneeY = legY - (isShrimp ? 1 : 3);
                const footX = kneeX + (side * (isShrimp ? 4 : 2));
                const footY = kneeY + (isShrimp ? 4 : 6);
                drawGridLine(cx, legY, kneeX, kneeY, 'S', 1);
                drawGridLine(kneeX, kneeY, footX, footY, 'B', 1);
                if (patternType === 'bioluminescent_joints') forcePixel(kneeX, kneeY, 'G');
            }
        }

        let currentTailY = cy + headLength - 2;
        let currentTailWidth = headWidth - 1;
        for (let i = 0; i < tailSegments; i++) {
            for (let y = 0; y < tailSegLength; y++) {
                const widthMod = isShrimp ? Math.floor(y / 2) : 0;
                for (let x = -currentTailWidth + widthMod; x <= currentTailWidth - widthMod; x++) {
                    let c = 'B';
                    if (y === tailSegLength - 1) c = 'S'; 
                    if (Math.abs(x) === currentTailWidth - widthMod) c = 'S'; 
                    if (Math.abs(x) < 2 && y < 2) c = 'H'; 
                    if (patternType === 'banded' && i % 2 === 0) c = 'S';
                    setPixel(cx + x, currentTailY + y, c);
                }
            }
            currentTailY += tailSegLength;
            if (i % 2 === 1 || isShrimp) currentTailWidth--; 
        }
        
        drawGridEllipse(cx, currentTailY + 2, currentTailWidth + 2, 3, 'B');
        for (let side of[-1, 0, 1]) {
            drawGridLine(cx, currentTailY, cx + (side * (currentTailWidth + 3)), currentTailY + (isShrimp?4:5), 'H', 1);
        }

        for (let side of [-1, 1]) {
            const armJointX = cx + (side * (headWidth + 2));
            const armJointY = cy - headLength + 6;
            
            if (clawType === 'mantis') {
                const elbowX = armJointX + (side * 5);
                const elbowY = armJointY - 4;
                const scytheTipX = armJointX + (side * 1);
                const scytheTipY = armJointY - 8;
                
                drawGridLine(cx, cy, armJointX, armJointY, 'S', 1);
                drawGridLine(armJointX, armJointY, elbowX, elbowY, 'B', 2); 
                drawGridLine(elbowX, elbowY, scytheTipX, scytheTipY, 'H', 2); 
                forcePixel(scytheTipX + side, scytheTipY + 2, 'W');
            } else {
                const clawBaseX = armJointX + (side * (isShrimp ? 3 : 4));
                const clawBaseY = armJointY - (isShrimp ? 5 : 7);
                const thick = clawType === 'crusher' ? 3 : 2;
                
                drawGridLine(cx, cy, armJointX, armJointY, 'S', 2);
                drawGridLine(armJointX, armJointY, clawBaseX, clawBaseY + 2, 'B', thick);
                drawGridEllipse(clawBaseX, clawBaseY, thick, thick, 'B');
                
                const pincerLen = clawType === 'crusher' ? 6 : 8;
                drawGridLine(clawBaseX + (side * 2), clawBaseY - 2, clawBaseX + (side * 1), clawBaseY - pincerLen, 'H', 2); 
                drawGridLine(clawBaseX - (side * 2), clawBaseY - 2, clawBaseX - (side * 1), clawBaseY - Math.floor(pincerLen * 0.6), 'B', 1); 
                drawGridLine(clawBaseX, clawBaseY - 2, clawBaseX, clawBaseY - pincerLen, null, 1); 
            }
        }

        drawGridEllipse(cx, cy, headWidth, headLength, 'B');
        for (let y = -headLength; y <= headLength; y++) {
            const w = Math.floor(headWidth * Math.sqrt(1 - Math.pow(y / headLength, 2)));
            for (let x = -w; x <= w; x++) {
                if (Math.abs(x) === w || y > headLength - 2) setPixel(cx + x, cy + y, 'S');
                if (Math.abs(x) < 2 && y < -headLength * 0.2) setPixel(cx + x, cy + y, 'H');
                
                if (patternType === 'spotted' && x % 3 === 0 && y % 4 === 0 && Math.abs(x) < w - 1) forcePixel(cx + x, cy + y, 'G');
                
                if (shellDecor === 'spikes' && (y % 4 === 0) && Math.abs(x) === w) forcePixel(cx + x + (x>0?1:-1), cy + y, 'H');
                if (shellDecor === 'barnacles' && rng.chance(0.05) && Math.abs(x) < w-1) {
                    forcePixel(cx + x, cy + y, 'S'); forcePixel(cx + x + 1, cy + y, 'W');
                }
            }
        }
        
        forcePixel(cx - (isShrimp?1:2), cy - headLength, 'D');
        forcePixel(cx + (isShrimp?1:2), cy - headLength, 'D');
    } 
    
    // 2. CRAB
    else if (type === 'crab') {
        const isSpider = crabStyle === 'spider';
        const isFiddler = crabStyle === 'fiddler';
        
        const bodyRadiusX = isSpider ? rng.int(5, 7) : rng.int(10, 15);
        const bodyRadiusY = isSpider ? rng.int(5, 7) : rng.int(6, 10);
        const bigClawSide = rng.pick([-1, 1]);

        const legSpread = isSpider ? rng.int(12, 18) : rng.int(4, 7);
        for (let side of [-1, 1]) {
            for (let i = -1; i <= 1; i++) {
                const startX = cx + (side * bodyRadiusX * 0.6);
                const startY = cy + (i * (isSpider?2:3));
                const kneeX = cx + (side * (bodyRadiusX + legSpread + Math.abs(i) * 2)); 
                const kneeY = startY - (isSpider?8:2) + (i * 2);
                const footX = kneeX + (side * (isSpider?4:2));
                const footY = kneeY + (isSpider?12:6);

                drawGridLine(startX, startY, kneeX, kneeY, 'B', isSpider?1:2);
                drawGridLine(kneeX, kneeY, footX, footY, 'S', 1);
                
                if (patternType === 'bioluminescent_joints') forcePixel(kneeX, kneeY, 'G');
            }
        }

        for (let side of [-1, 1]) {
            const isBig = isFiddler && side === bigClawSide;
            const isSmallSpider = isSpider; 

            const armThick = isBig ? 3 : (isSmallSpider ? 1 : 2);
            const clawSize = isBig ? 9 : (isSmallSpider ? 4 : 6);
            const pr = isBig ? 5 : (isSmallSpider ? 2 : 3); 
            
            const jointX = cx + (side * bodyRadiusX);
            const jointY = cy - bodyRadiusY + 3;
            const clawBaseX = jointX + (side * (isBig ? 8 : (isSmallSpider ? 10 : 5)));
            const clawBaseY = jointY - (isBig ? 7 : (isSmallSpider ? 8 : 5));

            drawGridLine(cx, cy, jointX, jointY, 'S', armThick);
            drawGridLine(jointX, jointY, clawBaseX, clawBaseY + 2, 'B', armThick);

            drawGridEllipse(clawBaseX, clawBaseY, pr, pr, 'B');
            drawGridEllipse(clawBaseX, clawBaseY, Math.max(1, pr - 1), Math.max(1, pr - 1), 'H');
            
            const outerX = clawBaseX + (side * (pr - 1));
            const innerX = clawBaseX - (side * Math.max(1, pr - 2));
            
            drawGridLine(outerX, clawBaseY - pr + 1, clawBaseX + (side * 1), clawBaseY - pr - clawSize, 'H', isBig ? 3 : 2);
            drawGridLine(innerX, clawBaseY - pr + 1, clawBaseX - (side * 1), clawBaseY - pr - Math.floor(clawSize * 0.6), 'B', isBig ? 2 : 1);
            drawGridLine(clawBaseX, clawBaseY - Math.floor(pr/2), clawBaseX, clawBaseY - pr - clawSize, null, isBig ? 2 : 1);
        }

        drawGridEllipse(cx, cy, bodyRadiusX, bodyRadiusY, 'B');
        
        for (let y = -bodyRadiusY; y <= bodyRadiusY; y++) {
            const w = Math.floor(bodyRadiusX * Math.sqrt(1 - Math.pow(y / bodyRadiusY, 2)));
            for (let x = -w; x <= w; x++) {
                if (y > bodyRadiusY * 0.4 || Math.abs(x) > w - 2) setPixel(cx + x, cy + y, 'S');
                if (y < -bodyRadiusY * 0.4 && Math.abs(x) < w - 2) setPixel(cx + x, cy + y, 'H');
                
                if (patternType === 'spotted' && (x + 10) % 5 === 0 && (y + 10) % 4 === 0) {
                    if (Math.abs(x) < w - 1 && Math.abs(y) < bodyRadiusY - 1) forcePixel(cx + x, cy + y, 'G');
                }
                if (patternType === 'banded' && Math.abs(x) % 6 < 2) {
                    if (Math.abs(x) < w - 1 && Math.abs(y) < bodyRadiusY - 1) forcePixel(cx + x, cy + y, 'S');
                }
                
                if (shellDecor === 'spikes' && Math.abs(x) === w && Math.abs(y) < bodyRadiusY - 2) {
                    forcePixel(cx + x + (x>0?1:-1), cy + y, 'H');
                    forcePixel(cx + x + (x>0?2:-2), cy + y, 'H'); 
                }
                if (shellDecor === 'barnacles' && rng.chance(0.08) && Math.abs(x) < w-2 && Math.abs(y) < bodyRadiusY-2) {
                    forcePixel(cx + x, cy + y, 'S'); forcePixel(cx + x + 1, cy + y, 'W');
                }
            }
        }

        for (let side of[-1, 1]) {
            const eyeBaseX = cx + (side * (isSpider ? 2 : 4));
            const eyeY = cy - bodyRadiusY - 1;
            drawGridLine(eyeBaseX, cy - bodyRadiusY + 1, eyeBaseX + side, eyeY, 'S', 1);
            forcePixel(eyeBaseX + side, eyeY - 1, 'D'); 
        }
    }

    // 3. ISOPOD
    else if (type === 'isopod') {
        const bodyRadiusX = rng.int(7, 11);
        const bodyRadiusY = rng.int(12, 17);
        const segmentCount = rng.int(6, 9);
        const segmentHeight = Math.floor((bodyRadiusY * 2) / segmentCount);

        for (let side of[-1, 1]) {
            for (let y = -bodyRadiusY + 4; y < bodyRadiusY - 2; y += 3) {
                const legX = cx + (side * (bodyRadiusX + 1));
                drawGridLine(cx, cy + y, legX, cy + y + 2, 'S', 1);
            }
        }

        for (let side of [-1, 1]) {
            drawGridLine(cx + (side * 2), cy - bodyRadiusY, cx + (side * 5), cy - bodyRadiusY - 5, 'B', 1);
        }

        for (let y = -bodyRadiusY; y <= bodyRadiusY; y++) {
            const w = Math.floor(bodyRadiusX * Math.sqrt(1 - Math.pow(y / bodyRadiusY, 2)));
            for (let x = -w; x <= w; x++) {
                let c = 'B';
                
                if (Math.abs(x) > w - 2) c = 'S';
                if (Math.abs(x) < 3 && y > -bodyRadiusY + 2) c = 'H';
                
                if ((y + bodyRadiusY) % segmentHeight === 0) c = 'S';
                if (patternType === 'banded' && (y + bodyRadiusY) % segmentHeight === 1 && Math.abs(x) < w - 2) c = 'G'; 
                
                if (shellDecor === 'spikes' && (y + bodyRadiusY) % segmentHeight === 0 && Math.abs(x) === w) {
                    forcePixel(cx + x + (x>0?1:-1), cy + y + 1, 'H'); 
                }
                if (shellDecor === 'barnacles' && rng.chance(0.05) && Math.abs(x) < w-1) {
                    c = 'S'; forcePixel(cx + x + 1, cy + y, 'W');
                }

                setPixel(cx + x, cy + y, c);
            }
        }
        
        forcePixel(cx - 3, cy - bodyRadiusY + 2, 'D');
        forcePixel(cx + 3, cy - bodyRadiusY + 2, 'D');
    }

    // OUTLINE
    const outlineGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            if (grid[y][x] === null) {
                if ((y > 0 && grid[y - 1][x] !== null) || (y < GRID_SIZE - 1 && grid[y + 1][x] !== null) || 
                    (x > 0 && grid[y][x - 1] !== null) || (x < GRID_SIZE - 1 && grid[y][x + 1] !== null)) {
                    outlineGrid[y][x] = 'O';
                }
            }
        }
    }

    const colorMap = {
        'B': palette.base, 'S': palette.shadow, 'H': palette.highlight,
        'G': palette.glow, 'O': palette.outline, 'D': '#030712', 'W': '#E5E7EB'  
    };

    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            let colorCode = grid[y][x] || outlineGrid[y][x];
            if (colorCode) {
                drawScaledRect(ctx, x, y, 1, 1, colorMap[colorCode], DISPLAY_SCALE);
            }
        }
    }

    // NAMING
    const regions =["Darklake", "Whisper-Chasm", "Rot-Garden", "Sunless-Sea", "Grog-Mud", "Deep-Whorl", "Abyssal-Trench", "Blingden-Stone", "Fungal-Shoals"];
    const colors =["Ghostly", "Neon", "Amethyst", "Obsidian", "Sulphur", "Crimson", "Veridian", "Pearl", "Rust", "Bone-White"];
    const traits =["Armored", "Blind", "Goliath", "Cave", "Fungal", "Abyssal", "Crystal", "Banded", "Deep", "Venomous", "Razor-Clawed", "Heavy"];

    let nouns =[];
    if (type === 'crab') nouns =["Crab", "Snap-Claw", "Pincer", "Crawler", "Scuttler", "Shell-Brute"];
    else if (type === 'lobster') nouns =["Lobster", "Crawdad", "Prawn", "Crusher", "Tail-Flicker"];
    else if (type === 'shrimp') nouns =["Shrimp", "Prawn", "Mantis", "Spear-Claw", "Darter"];
    else if (type === 'isopod') nouns =["Isopod", "Mite", "Woodlouse", "Pill-Bug", "Plated-Crawler"];

    const localNames =["Vault-Walker", "Cave-Crawl", "Deep-Tank", "Rock-Skitter", "Shell-Fiend", "Mud-Cracker", "Gloom-Pinch"];

    let creatureName = "";
    const nameRoll = rng.next();
    
    if (nameRoll < 0.25) creatureName = `${rng.pick(traits)} ${rng.pick(nouns)}`;
    else if (nameRoll < 0.5) creatureName = `${rng.pick(colors)} ${rng.pick(traits)} ${rng.pick(nouns)}`;
    else if (nameRoll < 0.7) creatureName = `${rng.pick(localNames)} of ${rng.pick(regions)}`;
    else if (nameRoll < 0.85) creatureName = `${rng.pick(regions)} ${rng.pick(nouns)}`;
    else creatureName = `${rng.pick(colors)} ${rng.pick(localNames)}`;

    if (crabStyle === 'spider' && !creatureName.includes("Spider")) creatureName = "Spider " + creatureName;
    if (crabStyle === 'fiddler') creatureName = "Asymmetric " + creatureName;
    if (shellDecor === 'barnacles') creatureName = "Barnacle-Encrusted " + creatureName;
    if (shellDecor === 'spikes' && !creatureName.includes("Spiked")) creatureName = "Spiked " + creatureName;
    if (type === 'shrimp' && !creatureName.includes("Mantis")) creatureName = "Mantis " + creatureName;

    return {
        name: creatureName,
        family: "Crustacean",
        imageDataUrl: offscreenCanvas.toDataURL(),
        data: { palette: palette.name, type, crabStyle, shellDecor, pattern: patternType }
    };
}