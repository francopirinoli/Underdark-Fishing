/**
 * js/art/jellyfish_generator.js
 * Generates stylized, outlined, soft-bodied sprites (Jellyfish, Anemones, Siphonophores).
 */

import { drawScaledRect } from '../util/utils.js';
import { getRandomPalette } from './palettes.js';

const GRID_SIZE = 64;
const DISPLAY_SCALE = 4;
const CANVAS_SIZE = GRID_SIZE * DISPLAY_SCALE;

export function generateJellyfish(options = {}) {
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
            if (!grid[y][x]) grid[y][x] = colorCode;
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
                if (radius >= 1 && colorCode === 'B') {
                    if ((x * shadowDirX + y * shadowDirY) > radius * 0.4) c = 'S';
                    else if ((x * shadowDirX + y * shadowDirY) < -radius * 0.4) c = 'H';
                }
                forcePixel(cx + x, cy + y, c);
            }
        }
    }

    const cx = 32; 
    let cy = 20; 
    
    const type = rng.pick(['jellyfish', 'anemone', 'comb_jelly', 'siphonophore']);
    const patternType = rng.pick(['glowing_core', 'pulsing_veins', 'starlit', 'nebula', 'none']);
    
    const bellShape = type === 'jellyfish' ? rng.pick(['dome', 'mushroom', 'bell', 'box']) : 'none';
    const hasBulbTips = type === 'anemone' && rng.chance(0.5);

    // 1. JELLYFISH
    if (type === 'jellyfish') {
        const bellRadiusX = bellShape === 'box' ? rng.int(9, 12) : rng.int(11, 16);
        const bellRadiusY = bellShape === 'box' ? rng.int(10, 14) : rng.int(9, 14);
        const numTentacles = bellShape === 'box' ? 4 : rng.int(8, 16);
        const tentacleLength = rng.int(25, 40);
        
        if (patternType !== 'none') {
            const coreRx = Math.floor(bellRadiusX * 0.45);
            const coreRy = Math.floor(bellRadiusY * 0.55);
            for (let y = -coreRy; y <= coreRy; y++) {
                const w = Math.floor(coreRx * Math.sqrt(1 - Math.pow(y / coreRy, 2)));
                for (let x = -w; x <= w; x++) {
                    if (patternType === 'nebula') {
                        if (rng.chance(0.4)) setPixel(cx + x, cy + y - 2, rng.chance(0.5) ? 'G' : 'H');
                    } else {
                        if ((x+y)%2 === 0) setPixel(cx + x, cy + y - 2, 'G');
                        else setPixel(cx + x, cy + y - 2, 'H');
                    }
                }
            }
        }

        const numArms = bellShape === 'box' ? rng.int(1, 2) : rng.int(3, 5);
        for (let i = 0; i < numArms; i++) {
            const spread = (i - (numArms/2)) * 3;
            let tx = cx + spread;
            let ty = cy + Math.floor(bellRadiusY * 0.2);
            const armLen = Math.floor(tentacleLength * 0.6);
            const waveFreq = rng.float(0.2, 0.4);
            const wavePhase = rng.float(0, Math.PI);
            
            for (let t = 0; t < armLen; t++) {
                const wave = Math.sin(t * waveFreq + wavePhase) * 3;
                const r = Math.max(1, (bellShape === 'box' ? 2 : 3) * (1 - t/armLen));
                drawFilledCircle(tx + wave, ty + t, Math.floor(r), 'B', 1, 1);
                if (t % 4 === 0) forcePixel(tx + wave, ty + t, 'G'); 
            }
        }

        for (let i = 0; i < numTentacles; i++) {
            let attachX, attachY;
            
            if (bellShape === 'box') {
                attachX = cx + (i % 2 === 0 ? -bellRadiusX : bellRadiusX) + rng.int(-1, 1);
                attachY = cy + Math.floor(bellRadiusY * 0.2);
            } else {
                const angle = Math.PI * (i / (numTentacles - 1)); 
                attachX = cx + Math.cos(angle) * (bellRadiusX * 0.85);
                attachY = cy + Math.floor(bellRadiusY * 0.2); 
            }
            
            let tX = attachX, tY = attachY;
            const wavePhase = rng.float(0, Math.PI * 2);
            const tLen = tentacleLength + rng.int(-5, 8);
            
            for (let t = 0; t < tLen; t++) {
                const wave = Math.sin(t * 0.15 + wavePhase) * 1.5;
                tX += wave; tY += 1;
                setPixel(tX, tY, (bellShape === 'box' && t % 3 === 0) ? 'G' : ((i % 2 === 0) ? 'B' : 'H'));
            }
        }

        const ruffleFreq = rng.int(3, 6);
        const ruffleAmp = bellShape === 'box' ? 0 : rng.int(1, 3);
        const bellBottomY = Math.floor(bellRadiusY * 0.3);

        for (let y = -bellRadiusY; y <= bellBottomY + ruffleAmp; y++) {
            let w = 0;
            if (bellShape === 'box') {
                const normalizedY = y / bellRadiusY;
                w = bellRadiusX * Math.pow(1 - Math.pow(Math.abs(normalizedY), 4), 0.25);
            } else {
                w = bellRadiusX * Math.sqrt(1 - Math.pow(y / bellRadiusY, 2));
                if (bellShape === 'mushroom' && y > -bellRadiusY * 0.3) w += Math.sin(y * 0.4) * 2; 
                if (bellShape === 'bell' && y > 0) w += y * 0.4; 
            }
            w = Math.floor(w);

            for (let x = -w; x <= w; x++) {
                const isBottomEdge = y >= bellBottomY - 1;
                const ruffle = isBottomEdge ? Math.sin((x / (w||1)) * Math.PI * ruffleFreq) * ruffleAmp : 0;
                if (isBottomEdge && y > bellBottomY + ruffle) continue;

                let c = null; 
                if (Math.abs(x) >= w - 1 || y <= -bellRadiusY + 1 || (isBottomEdge && y >= bellBottomY - 1 + ruffle)) {
                    c = 'B';
                    if (y < -bellRadiusY * 0.4 && x < 0) c = 'H'; 
                    if (Math.abs(x) === w && x > 0) c = 'S'; 
                    if (isBottomEdge) c = 'H'; 
                }
                
                if (patternType === 'pulsing_veins' && x % 4 === 0 && y % 3 === 0 && Math.abs(x) < w - 1) c = 'G';
                if (patternType === 'starlit' && rng.chance(0.05) && Math.abs(x) < w - 1) c = 'H';

                if (c) forcePixel(cx + x, cy + y, c); 
            }
        }
    } 
    
    // 2. ANEMONE
    else if (type === 'anemone') {
        cy = 44; 
        const baseWidth = rng.int(9, 13);
        const baseHeight = rng.int(10, 16);
        const numTentacles = rng.int(25, 40);
        const tentacleLength = rng.int(15, 22);
        
        const tentacles =[];
        for (let i = 0; i < numTentacles; i++) {
            const tRadius = Math.random(); 
            const tAngle = rng.float(0, Math.PI * 2);
            const attachX = cx + Math.cos(tAngle) * (baseWidth * 0.85 * tRadius);
            const attachY = cy - baseHeight + Math.sin(tAngle) * (baseWidth * 0.3 * tRadius); 
            tentacles.push({ attachX, attachY, isFront: Math.sin(tAngle) > 0, angle: tAngle, radius: tRadius });
        }
        
        tentacles.sort((a, b) => a.attachY - b.attachY);

        tentacles.forEach(tent => {
            let tX = tent.attachX, tY = tent.attachY;
            const waveFreq = rng.float(0.1, 0.2);
            const wavePhase = rng.float(0, Math.PI * 2);
            const outwardSplay = Math.cos(tent.angle) * (tent.radius * 1.2); 

            for (let t = 0; t < tentacleLength; t++) {
                const progress = t / tentacleLength;
                const wave = Math.sin(t * waveFreq + wavePhase) * 1.5;
                
                tX += outwardSplay + wave; tY -= 1; 
                
                let thick = Math.max(1, Math.round(3.5 * (1 - progress))); 
                const baseColor = tent.isFront ? 'B' : 'S'; 
                
                if (hasBulbTips && t >= tentacleLength - 3) {
                    thick = 4; 
                    drawFilledCircle(tX, tY, Math.floor(thick/2), 'G', 1, 1);
                    if (t === tentacleLength - 1) forcePixel(tX-1, tY-1, 'H'); 
                } else {
                    drawFilledCircle(tX, tY, Math.floor(thick/2), baseColor, 1, 1);
                }
            }
        });

        for (let y = -baseHeight; y <= 4; y++) {
            let progress = (y + baseHeight) / (baseHeight + 4);
            let w = baseWidth;
            if (progress < 0.3) w += (0.3 - progress) * 6; 
            if (progress > 0.7) w += (progress - 0.7) * 8; 
            w = Math.floor(w);

            for (let x = -w; x <= w; x++) {
                let c = 'B';
                if (x > w * 0.4) c = 'S';
                if (x < -w * 0.4) c = 'H';
                if ((x + 20) % 4 === 0 && c === 'B') c = 'S'; 
                if (patternType === 'pulsing_veins' && rng.chance(0.08) && c === 'B') c = 'G';
                forcePixel(cx + x, cy + y, c);
            }
        }
    }

    // 3. COMB JELLY
    else if (type === 'comb_jelly') {
        const bodyWidth = rng.int(10, 14);
        const bodyLength = rng.int(16, 24);
        const numCombs = 4; 
        
        for (let y = -bodyLength; y <= bodyLength; y++) {
            const progress = (y + bodyLength) / (bodyLength * 2);
            const shapeFactor = Math.sin(Math.pow(progress, 0.8) * Math.PI);
            const w = Math.max(2, Math.floor(bodyWidth * shapeFactor));
            
            for (let x = -w; x <= w; x++) {
                let c = null; 
                if (Math.abs(x) >= w - 1) c = 'H';
                if (Math.abs(x) === w) c = 'B';

                for (let i = 0; i < numCombs; i++) {
                    const combXPos = Math.floor((i / (numCombs - 1)) * (w * 2)) - w;
                    const adjustedCombX = Math.floor(combXPos * Math.sqrt(1 - Math.pow(x/w, 2) * 0.5));
                    
                    if (Math.abs(x - adjustedCombX) < 1) c = (y % 3 === 0) ? 'G' : 'H';
                }
                
                if (Math.abs(x) < bodyWidth * 0.3 && Math.abs(y) < bodyLength * 0.4) {
                    if (!c && rng.chance(0.4)) c = 'S';
                }
                if (c) forcePixel(cx + x, cy + y, c);
            }
        }

        for (let side of[-1, 1]) {
            let tX = cx + (side * bodyWidth * 0.5);
            let tY = cy + Math.floor(bodyLength * 0.5);
            const tLen = rng.int(20, 30);
            
            for (let t = 0; t < tLen; t++) {
                tX += side * Math.sin(t * 0.2) + rng.float(-0.5, 0.5); tY += 1.5;
                forcePixel(tX, tY, (t % 3 === 0) ? 'G' : 'H'); 
            }
        }
    }

    // 4. SIPHONOPHORE
    else if (type === 'siphonophore') {
        cy = 8; 
        const colonyLength = rng.int(45, 55);
        const numBells = rng.int(6, 10);
        const bellSpacing = 4;
        
        for(let i = 0; i < colonyLength; i++) {
            const wave = Math.sin(i * 0.1) * 2;
            forcePixel(cx + Math.floor(wave), cy + i, 'H');
        }

        for (let i = 0; i < numBells; i++) {
            const bY = cy + 2 + (i * bellSpacing);
            const wave = Math.floor(Math.sin(bY * 0.1) * 2);
            const bWidth = rng.int(3, 5);
            
            for (let side of [-1, 1]) {
                for (let bx = 1; bx <= bWidth; bx++) {
                    let c = 'B';
                    if (bx === bWidth) c = 'S';
                    if (bx < 2) c = 'H';
                    forcePixel(cx + wave + (side * bx), bY - Math.floor(bx/2), c);
                    forcePixel(cx + wave + (side * bx), bY - Math.floor(bx/2) + 1, c);
                }
            }
        }

        const netStartY = cy + 4 + (numBells * bellSpacing);
        for(let i = netStartY; i < cy + colonyLength; i += 3) {
            const wave = Math.floor(Math.sin(i * 0.1) * 2);
            forcePixel(cx + wave - 1, i, 'G'); forcePixel(cx + wave + 1, i, 'G');
            
            let tX = cx + wave + rng.pick([-1, 1]);
            let tY = i;
            const tLen = rng.int(10, 25);
            for(let t = 0; t < tLen; t++) {
                tX += Math.sin(t * 0.3) > 0 ? 1 : -1; tY += 1;
                forcePixel(tX, tY, t % 2 === 0 ? 'G' : 'S');
            }
        }
    }

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
        'G': palette.glow, 'O': palette.outline
    };

    for (let y = 0; y < GRID_SIZE; y++) {
        for (let x = 0; x < GRID_SIZE; x++) {
            let colorCode = grid[y][x] || outlineGrid[y][x];
            if (colorCode) drawScaledRect(ctx, x, y, 1, 1, colorMap[colorCode], DISPLAY_SCALE);
        }
    }

    const regions =["Darklake", "Whisper-Chasm", "Rot-Garden", "Sunless-Sea", "Grog-Mud", "Deep-Whorl", "Abyssal-Trench", "Void-Grotto", "Glimmer-Shoals"];
    const colors =["Ghostly", "Neon", "Amethyst", "Obsidian", "Sulphur", "Crimson", "Veridian", "Luminescent", "Opal", "Pearl"];
    const traits =["Drifting", "Venomous", "Stinging", "Pulsing", "Floating", "Glass", "Ethereal", "Star-Touched", "Colonial", "Webbed"];

    let nouns =[];
    if (type === 'jellyfish') nouns =["Jelly", "Medusa", "Floater", "Stinger", "Dome", "Sea-Wasp"];
    else if (type === 'anemone') nouns =["Anemone", "Polyp", "Bloom", "Snare", "Maw"];
    else if (type === 'comb_jelly') nouns =["Comb-Jelly", "Phantom", "Ribbon", "Prism", "Walnut"];
    else if (type === 'siphonophore') nouns =["Siphonophore", "Colony", "String-Jelly", "Net-Weaver", "Thread"];

    const localNames =["Void-Drifter", "Gloom-Float", "Abyss-Lace", "Ghost-Net", "Trench-Bloom", "Shadow-Bell", "Depth-Weaver"];

    let creatureName = "";
    const nameRoll = rng.next();
    
    if (nameRoll < 0.25) creatureName = `${rng.pick(traits)} ${rng.pick(nouns)}`;
    else if (nameRoll < 0.5) creatureName = `${rng.pick(colors)} ${rng.pick(traits)} ${rng.pick(nouns)}`;
    else if (nameRoll < 0.7) creatureName = `${rng.pick(localNames)} of the ${rng.pick(regions)}`;
    else if (nameRoll < 0.85) creatureName = `${rng.pick(regions)} ${rng.pick(nouns)}`;
    else creatureName = `${rng.pick(colors)} ${rng.pick(localNames)}`;

    if (type === 'siphonophore' && !creatureName.includes("Colony")) creatureName = "Colonial " + creatureName;
    if (bellShape === 'box') creatureName = "Box " + creatureName;
    if (hasBulbTips) creatureName = "Bulb-Tipped " + creatureName;
    if (patternType === 'nebula') creatureName = "Nebula " + creatureName;

    return {
        name: creatureName,
        family: "Amorphous / Cnidarian",
        imageDataUrl: offscreenCanvas.toDataURL(),
        data: { palette: palette.name, type, pattern: patternType, bellShape, hasBulbTips }
    };
}