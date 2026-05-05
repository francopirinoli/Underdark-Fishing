/**
 * js/art/cephalopod_generator.js
 * Generates highly detailed, stylized cephalopods.
 */

import { drawScaledRect } from '../util/utils.js';
import { getRandomPalette } from './palettes.js';

const GRID_SIZE = 64;
const DISPLAY_SCALE = 4;
const CANVAS_SIZE = GRID_SIZE * DISPLAY_SCALE;

export function generateCephalopod(options = {}) {
    const rng = options.rng || { 
        next: Math.random, int: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min, 
        float: (min, max) => Math.random() * (max - min) + min, chance: (p) => Math.random() < p, 
        pick: (arr) => arr[Math.floor(Math.random() * arr.length)] 
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
            if (!grid[y][x] || colorCode === 'S' || colorCode === 'O') {
                grid[y][x] = colorCode;
            }
        }
    }

    function forcePixel(x, y, colorCode) {
        x = Math.round(x); y = Math.round(y);
        if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
            grid[y][x] = colorCode;
        }
    }

    function drawFilledCircle(cx, cy, radius, colorCode, shadowDirX = 0, shadowDirY = 0) {
        for (let y = -radius; y <= radius; y++) {
            const w = Math.floor(radius * Math.sqrt(1 - Math.pow(y / (radius || 1), 2)));
            for (let x = -w; x <= w; x++) {
                let c = colorCode;
                if (radius > 1 && colorCode === 'B') {
                    if ((x * shadowDirX + y * shadowDirY) > radius * 0.3) c = 'S';
                }
                setPixel(cx + x, cy + y, c);
            }
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
            for (let ty = -offset; ty <= offset; ty++) {
                for (let tx = -offset; tx <= offset; tx++) {
                    if (tx*tx + ty*ty <= offset*offset + 1) setPixel(x0 + tx, y0 + ty, colorCode);
                }
            }
            if (x0 === x1 && y0 === y1) break;
            let e2 = 2 * err;
            if (e2 > -dy) { err -= dy; x0 += sx; }
            if (e2 < dx) { err += dx; y0 += sy; }
        }
    }

    const cx = 32; 
    let cy = 20; 
    
    const type = rng.pick(['octopus', 'squid', 'nautilus', 'cuttlefish']);
    const patternType = rng.pick(['clean', 'spotted', 'ringed', 'glowing_veins', 'striped', 'starry']);
    const eyeType = rng.pick(['slit', 'round', 'alien', 'blind', 'w_shaped']);
    
    const hasDumboFins = type === 'octopus' && rng.chance(0.3);
    const hasWartyTexture = (type === 'octopus' || type === 'cuttlefish') && rng.chance(0.4);
    const hasWebbing = type === 'squid' && rng.chance(0.3);

    // 1. OCTOPUS
    if (type === 'octopus') {
        const headShape = rng.pick(['bulbous', 'tall', 'wide']);
        const headRadiusX = headShape === 'wide' ? rng.int(10, 14) : rng.int(7, 10);
        const headRadiusY = headShape === 'tall' ? rng.int(12, 16) : rng.int(8, 12);
        
        const pose = rng.pick(['splayed', 'trailing', 'curled']);
        const tentacleBaseThick = rng.int(4, 6);
        const tentacleLength = rng.int(25, 38);
        const numTentacles = 8;
        
        const drawOrder =[0, 7, 1, 6, 2, 5, 3, 4]; 
        for (let i of drawOrder) {
            const progressI = i / (numTentacles - 1); 
            const isBackTentacle = i < 2 || i > 5;
            
            let baseAngle, curlDir, waveFreq, waveAmp;
            if (pose === 'splayed') {
                baseAngle = Math.PI * 0.15 + (Math.PI * 0.7 * progressI); 
                curlDir = (i < 4) ? -1.5 : 1.5; 
                waveFreq = rng.float(0.05, 0.1);
                waveAmp = rng.float(3, 6);
            } else if (pose === 'trailing') {
                baseAngle = Math.PI * 0.4 + (Math.PI * 0.2 * progressI); 
                curlDir = rng.chance(0.5) ? -0.5 : 0.5; 
                waveFreq = rng.float(0.15, 0.25);
                waveAmp = rng.float(4, 8);
            } else { 
                baseAngle = Math.PI * 0.2 + (Math.PI * 0.6 * progressI); 
                curlDir = (i < 4) ? 2.5 : -2.5; 
                waveFreq = 0.05;
                waveAmp = 2;
            }

            const attachX = cx + (-0.8 + 1.6 * progressI) * headRadiusX * 0.7;
            const attachY = cy + (headRadiusY * 0.5);
            
            for (let t = 0; t < tentacleLength; t++) {
                const progress = t / tentacleLength;
                const currentAngle = baseAngle + (progress * curlDir);
                const waveOffset = Math.sin(t * waveFreq) * waveAmp * (1 - progress); 
                
                const px = attachX + (Math.cos(currentAngle) * t) + (Math.cos(currentAngle + Math.PI/2) * waveOffset);
                const py = attachY + (Math.sin(currentAngle) * t) + (Math.sin(currentAngle + Math.PI/2) * waveOffset);
                const radius = Math.max(0.5, (tentacleBaseThick / 2) * Math.pow(1 - progress, 0.8));
                
                const shadowDirX = Math.cos(currentAngle - Math.PI/4);
                const shadowDirY = Math.sin(currentAngle - Math.PI/4);
                const baseColor = isBackTentacle ? 'S' : 'B';
                
                drawFilledCircle(px, py, Math.ceil(radius), baseColor, shadowDirX, shadowDirY);
                
                if (t % 4 === 0 && radius > 1 && !isBackTentacle) {
                    forcePixel(px - curlDir * radius, py, 'H'); 
                    forcePixel(px + curlDir * radius, py + 1, 'S'); 
                    if (patternType === 'spotted' && rng.chance(0.5)) forcePixel(px + curlDir * radius, py, 'G');
                    if (patternType === 'ringed' && t % 8 === 0) drawFilledCircle(px, py, radius, 'S');
                }
            }
        }

        if (hasDumboFins) {
            for (let side of [-1, 1]) {
                const finX = cx + (side * headRadiusX);
                const finY = cy - headRadiusY * 0.2;
                for(let f = 0; f < 8; f++) {
                    const fw = Math.floor(Math.sin((f/8) * Math.PI) * 6);
                    for(let fx = 0; fx < fw; fx++) {
                        setPixel(finX + (side * fx), finY - f, 'S');
                        if (fx === fw - 1) forcePixel(finX + (side * fx), finY - f, 'H');
                    }
                }
            }
        }

        for (let y = -headRadiusY; y <= headRadiusY * 0.7; y++) {
            const w = Math.floor(headRadiusX * Math.sqrt(1 - Math.pow(y / headRadiusY, 2)));
            for (let x = -w; x <= w; x++) {
                let c = 'B';
                if (Math.abs(x) > w - 2 || y > headRadiusY * 0.3) c = 'S';
                if (Math.abs(x) < 3 && y < -headRadiusY * 0.3) c = 'H';
                
                if (patternType === 'spotted' && rng.chance(0.15) && c !== 'H') c = 'G';
                if (patternType === 'ringed' && (x*x + y*y) % 20 < 3 && c === 'B') c = 'S';
                if (patternType === 'glowing_veins' && rng.chance(0.1) && c !== 'H') c = 'G';
                if (patternType === 'striped' && Math.abs(y) % 4 < 2 && c === 'B') c = 'S';

                if (hasWartyTexture && rng.chance(0.1) && c === 'B') {
                    forcePixel(cx + x, cy + y, 'H'); forcePixel(cx + x, cy + y + 1, 'S');
                } else {
                    setPixel(cx + x, cy + y, c);
                }
            }
        }
    } 
    
    // 2. SQUID & CUTTLEFISH
    else if (type === 'squid' || type === 'cuttlefish') {
        const isCuttle = type === 'cuttlefish';
        const mantleShape = isCuttle ? 'shield' : rng.pick(['torpedo', 'arrow', 'bell']);
        const mantleWidth = isCuttle ? rng.int(10, 14) : rng.int(6, 9);
        const mantleLength = isCuttle ? rng.int(12, 16) : rng.int(14, 20); 
        
        const finShape = isCuttle ? 'skirt' : rng.pick(['diamond', 'arrow', 'rounded']);
        const finSpan = isCuttle ? mantleWidth + 4 : rng.int(12, 18);
        const finHeight = isCuttle ? mantleLength * 1.5 : rng.int(6, 10);
        const tentacleLength = isCuttle ? 0 : rng.int(22, 32); 
        
        if (hasWebbing && !isCuttle) {
            drawFilledCircle(cx, cy + mantleLength * 0.5 + 4, mantleWidth + 2, 'S');
            drawFilledCircle(cx, cy + mantleLength * 0.5 + 4, mantleWidth - 1, 'B');
        }

        if (!isCuttle) {
            for (let side of [-1, 1]) {
                let tX = cx + (side * 3);
                let tY = cy + mantleLength * 0.5;
                for (let t = 0; t < tentacleLength; t++) {
                    const nextX = tX + (side * Math.sin(t * 0.15) * 2);
                    const nextY = tY + 1.2;
                    drawGridLine(tX, tY, nextX, nextY, 'S', 1);
                    tX = nextX; tY = nextY;
                }
                drawFilledCircle(tX, tY + 3, 2, 'B');
                forcePixel(tX, tY + 3, 'H'); forcePixel(tX + side, tY + 3, 'G'); 
            }
        }

        const armLen = isCuttle ? rng.int(6, 10) : rng.int(10, 16);
        for (let i = 0; i < 8; i++) {
            const side = (i % 2 === 0) ? -1 : 1;
            const spread = isCuttle ? (i / 8) * 4 : (i / 8) * 8; 
            let aX = cx + (side * (isCuttle ? 3 : 2));
            let aY = cy + mantleLength * 0.5;
            
            for (let a = 0; a < armLen; a++) {
                const progress = a / armLen;
                const curve = side * Math.sin(progress * Math.PI) * (isCuttle ? 1 : 3);
                const px = aX + (spread * a * 0.5) + curve;
                const py = aY + a;
                const radius = Math.max(0.5, 1.5 * (1 - progress));
                drawFilledCircle(px, py, Math.ceil(radius), 'B', side, 1);
            }
        }

        const finTopY = isCuttle ? cy - mantleLength : cy - mantleLength + 2;
        for (let y = 0; y < finHeight; y++) {
            let w = 0;
            const progress = y / finHeight;
            if (finShape === 'skirt') {
                w = finSpan * Math.sin(progress * Math.PI);
                w += Math.sin(progress * Math.PI * 6) * 1.5; 
            } else if (finShape === 'diamond') w = progress < 0.5 ? progress * 2 * finSpan : (1 - progress) * 2 * finSpan;
            else if (finShape === 'arrow') w = progress * finSpan;
            else if (finShape === 'rounded') w = Math.sin(progress * Math.PI) * finSpan;
            w = Math.floor(w);
            
            for (let x = -w; x <= w; x++) setPixel(cx + x, finTopY + y, Math.abs(x) > w - 2 ? 'H' : 'S');
        }

        for (let y = -mantleLength; y <= mantleLength * 0.5; y++) {
            const progress = (y + mantleLength) / (mantleLength * 1.5); 
            let w = mantleWidth;
            
            if (mantleShape === 'torpedo') { if (progress < 0.3) w = mantleWidth * (progress / 0.3); }
            else if (mantleShape === 'shield') { w = mantleWidth * Math.sin(Math.pow(progress, 0.7) * Math.PI); } 
            else if (mantleShape === 'arrow') { w = mantleWidth * Math.pow(progress, 0.5); }
            else if (mantleShape === 'bell') { w = mantleWidth * Math.sin(progress * Math.PI * 0.7); }
            w = Math.max(2, Math.floor(w));

            for (let x = -w; x <= w; x++) {
                let c = 'B';
                if (Math.abs(x) === w || y > mantleLength * 0.2) c = 'S';
                if (Math.abs(x) < 2 && y > -mantleLength * 0.5) c = 'H';
                
                if (patternType === 'glowing_veins' && rng.chance(0.15) && Math.abs(x) < w - 1) c = 'G';
                if (patternType === 'striped' && y % 3 === 0 && Math.abs(x) < w - 1) c = 'S'; 
                if (patternType === 'starry' && rng.chance(0.1) && c === 'B') c = 'G';
                
                if (hasWartyTexture && isCuttle && rng.chance(0.1) && c === 'B') {
                    forcePixel(cx + x, cy + y, 'H'); forcePixel(cx + x, cy + y + 1, 'S');
                } else {
                    setPixel(cx + x, cy + y, c);
                }
            }
        }
    }

    // 3. NAUTILUS
    else if (type === 'nautilus') {
        const shellRadius = rng.int(12, 16);
        const shellStyle = rng.pick(['smooth', 'ridged', 'spiked']);
        
        const hoodX = cx + Math.floor(shellRadius * 0.4);
        const hoodY = cy + Math.floor(shellRadius * 0.4);

        const numTentacles = rng.int(12, 20);
        const tLength = rng.int(8, 14);
        for (let i = 0; i < numTentacles; i++) {
            const angle = Math.PI * rng.float(-0.2, 0.7); 
            const curl = rng.pick([-1, 1]);
            for (let t = 0; t < tLength; t++) {
                const progress = t / tLength;
                const currentAngle = angle + (progress * curl * 1.5);
                const tx = hoodX + (Math.cos(currentAngle) * t * 1.5);
                const ty = hoodY + (Math.sin(currentAngle) * t * 1.5);
                const tRad = Math.max(0.5, 2 * (1 - progress));
                drawFilledCircle(tx, ty, Math.ceil(tRad), 'B', 0, 1);
                if (t === tLength - 1 && rng.chance(0.6)) forcePixel(tx, ty, 'G'); 
            }
        }
        
        drawFilledCircle(hoodX, hoodY, Math.floor(shellRadius * 0.45), 'B', 1, 1);
        drawFilledCircle(hoodX, hoodY, Math.floor(shellRadius * 0.35), 'H'); 

        const eyeX = hoodX - 1;
        const eyeY = hoodY - 2;
        drawFilledCircle(eyeX, eyeY, 1, 'D');
        if (eyeType !== 'blind') forcePixel(eyeX, eyeY, 'G'); 

        for (let y = -shellRadius; y <= shellRadius; y++) {
            for (let x = -shellRadius; x <= shellRadius; x++) {
                const distSq = x*x + y*y;
                if (distSq <= shellRadius * shellRadius) {
                    const dist = Math.sqrt(distSq);
                    let c = 'B';
                    if (x > shellRadius * 0.1 && y > shellRadius * 0.1) {
                        const cutDist = Math.sqrt(Math.pow(x - shellRadius * 0.2, 2) + Math.pow(y - shellRadius * 0.2, 2));
                        if (cutDist < shellRadius * 0.7) continue; 
                    }
                    if (dist > shellRadius * 0.8) c = 'S';
                    if (x < -shellRadius * 0.3 && y < -shellRadius * 0.3) c = 'H';
                    
                    const angle = Math.atan2(y, x);
                    const spiralPhase = (dist - angle * (shellRadius / Math.PI)) % (shellRadius * 0.4);
                    
                    if (shellStyle === 'ridged' && spiralPhase < shellRadius * 0.15) c = 'S';
                    if (shellStyle === 'spiked' && spiralPhase < shellRadius * 0.1 && dist > shellRadius * 0.8) {
                        forcePixel(cx + x + Math.cos(angle)*2, cy + y + Math.sin(angle)*2, 'H');
                    }
                    if (patternType === 'glowing_veins' && spiralPhase < shellRadius * 0.1) c = 'G';
                    if (patternType === 'striped' && angle % 0.5 < 0.2) c = 'S'; 

                    setPixel(cx + x, cy + y, c);
                }
            }
        }
    }

    // 4. DRAW EYES
    if (type !== 'nautilus') {
        let eY = cy;
        let eXOffset = 0;
        if (type === 'octopus') { eY = cy + 2; eXOffset = 4; } 
        else if (type === 'squid' || type === 'cuttlefish') { eY = cy + 4; eXOffset = type === 'cuttlefish' ? 5 : 4; }

        for (let side of [-1, 1]) {
            const ex = cx + (side * eXOffset);
            drawFilledCircle(ex, eY, type === 'cuttlefish' ? 2 : 1, 'B'); 
            if (eyeType !== 'blind') {
                if (eyeType === 'glowing') { forcePixel(ex, eY, 'G'); forcePixel(ex+side, eY, 'G'); } 
                else if (eyeType === 'slit') { forcePixel(ex, eY, 'G'); forcePixel(ex, eY-1, 'D'); forcePixel(ex, eY+1, 'D'); } 
                else if (eyeType === 'w_shaped') {
                    forcePixel(ex, eY, 'G'); forcePixel(ex+side, eY, 'G'); forcePixel(ex, eY+1, 'G'); forcePixel(ex+side, eY+1, 'G');
                    forcePixel(ex, eY, 'D'); forcePixel(ex+side, eY-1, 'D'); forcePixel(ex-side, eY-1, 'D'); 
                } 
                else if (eyeType === 'alien') { forcePixel(ex, eY, 'D'); forcePixel(ex, eY-1, 'D'); forcePixel(ex, eY+1, 'D'); } 
                else forcePixel(ex, eY, 'D'); 
                forcePixel(ex, eY - 2, 'H'); 
            } else forcePixel(ex, eY, 'H'); 
        }
    }

    // 5. OUTLINE
    const outlineGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
    for (let y = 0; y < GRID_SIZE; y++) for (let x = 0; x < GRID_SIZE; x++) {
        if (grid[y][x] === null) {
            if ((y > 0 && grid[y - 1][x] !== null) || (y < GRID_SIZE - 1 && grid[y + 1][x] !== null) || 
                (x > 0 && grid[y][x - 1] !== null) || (x < GRID_SIZE - 1 && grid[y][x + 1] !== null)) {
                outlineGrid[y][x] = 'O';
            }
        }
    }

    // 6. RENDER
    const colorMap = {
        'B': palette.base, 'S': palette.shadow, 'H': palette.highlight,
        'G': palette.glow, 'O': palette.outline, 'D': '#030712' 
    };

    for (let y = 0; y < GRID_SIZE; y++) for (let x = 0; x < GRID_SIZE; x++) {
        let colorCode = grid[y][x] || outlineGrid[y][x];
        if (colorCode) drawScaledRect(ctx, x, y, 1, 1, colorMap[colorCode], DISPLAY_SCALE);
    }

    // 7. NAMING
    const regions =["Darklake", "Whisper-Chasm", "Rot-Garden", "Sunless-Sea", "Grog-Mud", "Deep-Whorl", "Abyssal-Trench", "Void-Grotto", "Ink-Wells"];
    const colors =["Ghostly", "Neon", "Amethyst", "Obsidian", "Sulphur", "Crimson", "Veridian", "Luminescent", "Ash", "Pale"];
    const traits =["Grasping", "Venomous", "Mind-Bending", "Blind", "Cave", "Armored", "Webbed", "Spiked", "Fungal", "Giant", "Ethereal", "Warty"];
    
    let nouns = [];
    if (type === 'octopus') nouns =["Octopus", "Krakeling", "Grasper", "Mind-Flayer", "Strangler", "Weaver"];
    else if (type === 'squid') nouns =["Squid", "Dart", "Lancer", "Calamari", "Jet", "Arrow"];
    else if (type === 'nautilus') nouns =["Nautilus", "Ammonite", "Shell", "Drifter", "Spiral", "Coil"];
    else if (type === 'cuttlefish') nouns =["Cuttlefish", "Reaper", "Shapeshifter", "Hover-Squid", "Broad-Mantle"];

    const localNames =["Abyss-Lurker", "Ink-Demon", "Cave-Kraken", "Void-Drifter", "Gloom-Weaver", "Trench-Terror", "Shadow-Lash"];

    let creatureName = "";
    const nameRoll = rng.next();
    
    if (nameRoll < 0.25) creatureName = `${rng.pick(traits)} ${rng.pick(nouns)}`;
    else if (nameRoll < 0.5) creatureName = `${rng.pick(colors)} ${rng.pick(traits)} ${rng.pick(nouns)}`;
    else if (nameRoll < 0.7) creatureName = `${rng.pick(localNames)} of ${rng.pick(regions)}`;
    else if (nameRoll < 0.85) creatureName = `${rng.pick(regions)} ${rng.pick(nouns)}`;
    else creatureName = `${rng.pick(colors)} ${rng.pick(localNames)}`;

    if (hasDumboFins && type === 'octopus') creatureName = "Winged " + creatureName;
    if (hasWebbing && type === 'squid' && !creatureName.includes("Vampire")) creatureName = "Vampire " + creatureName;
    if (hasWartyTexture) creatureName = "Warty " + creatureName;

    return {
        name: creatureName,
        family: "Cephalopod",
        imageDataUrl: offscreenCanvas.toDataURL(),
        data: { palette: palette.name, type, pattern: patternType, eyeType, hasDumboFins, hasWebbing, hasWartyTexture }
    };
}