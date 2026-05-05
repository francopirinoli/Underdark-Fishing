/**
 * js/art/eel_generator.js
 * Generates stylized, outlined, serpentine sprites.
 */

import { drawScaledRect } from '../util/utils.js';
import { getRandomPalette } from './palettes.js';

const GRID_SIZE = 64;
const DISPLAY_SCALE = 4;
const CANVAS_SIZE = GRID_SIZE * DISPLAY_SCALE;

export function generateEel(options = {}) {
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
            if (!grid[y][x] || colorCode === 'S' || colorCode === 'O') grid[y][x] = colorCode;
        }
    }

    function forcePixel(x, y, colorCode) {
        x = Math.round(x); y = Math.round(y);
        if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) grid[y][x] = colorCode;
    }

    const cx = 32, cy = 32;
    
    const type = rng.pick(['eel', 'lamprey', 'sea_snake', 'oarfish', 'hagfish']);
    const patternType = rng.pick(['clean', 'banded', 'spotted', 'glowing_lateral', 'electric_sparks', 'slime_coat']);
    const pose = rng.pick(['s_curve', 'tight_coil', 'lazy_wave']);
    
    const bodyLength = type === 'oarfish' ? rng.int(45, 55) : rng.int(35, 48);
    const maxThickness = type === 'hagfish' || type === 'lamprey' ? rng.int(3, 5) : rng.int(4, 7);
    
    let waveAmplitude = 8;
    let waveFrequency = 0.2;
    if (pose === 'tight_coil') { waveAmplitude = 12; waveFrequency = 0.35; }
    if (pose === 'lazy_wave') { waveAmplitude = 4; waveFrequency = 0.12; }
    
    const startPhase = rng.float(0, Math.PI * 2); 

    const path =[];
    const headX = Math.min(56, cx + Math.floor(bodyLength / 2)); 
    
    for (let i = 0; i < bodyLength; i++) {
        const t = i / bodyLength; 
        const x = headX - i;
        const y = cy + Math.sin(i * waveFrequency + startPhase) * waveAmplitude;

        let thick = maxThickness;
        if (t < 0.08) thick = Math.max(2, maxThickness * (t / 0.08)); 
        if (t > 0.6) thick = Math.max(1, maxThickness * (1 - ((t - 0.6) / 0.4))); 
        if (type === 'sea_snake' && t > 0.9) thick = Math.max(1, thick + Math.sin((t-0.9)*10) * 2);

        path.push({ x, y, thick, index: i, t });
    }

    path.reverse(); // Draw tail to head

    const hasDorsal = type === 'eel' || type === 'oarfish';
    if (hasDorsal) {
        for (let pt of path) {
            if (pt.t > 0.05 && pt.t < 0.95) {
                const r = Math.max(1, Math.floor(pt.thick / 2));
                const finHeight = type === 'oarfish' ? rng.int(3, 5) : rng.int(2, 3);
                
                for (let f = 1; f <= finHeight; f++) {
                    setPixel(pt.x, pt.y - r - f, type === 'oarfish' ? 'G' : (f === finHeight ? 'H' : 'S'));
                    if (type === 'eel' && pt.t > 0.4) setPixel(pt.x, pt.y + r + f, 'S');
                }
            }
        }
    }

    for (let pt of path) {
        const r = Math.max(1, Math.floor(pt.thick / 2));
        
        for (let dy = -r; dy <= r; dy++) {
            const w = Math.floor(r * Math.sqrt(1 - Math.pow(dy / r, 2)));
            for (let dx = -w; dx <= w; dx++) {
                let color = 'B';

                if (dy < -r * 0.3) color = 'H';
                if (dy > r * 0.3) color = 'S';

                if (patternType === 'banded' && Math.floor(pt.index / 5) % 2 === 0) {
                    if (color === 'B' || color === 'H') color = 'S'; 
                }
                if (patternType === 'spotted' && pt.index % 6 === 0 && dx === 0 && dy === 0) color = 'G'; 
                if (patternType === 'glowing_lateral' && dy === 0) color = (pt.index % 4 < 2) ? 'G' : 'B'; 
                if (patternType === 'slime_coat') {
                    if (rng.chance(0.15) && color === 'B') color = 'H'; 
                    if (rng.chance(0.05) && dy === r) setPixel(pt.x + dx, pt.y + dy + 1, 'S'); 
                }

                setPixel(pt.x + dx, pt.y + dy, color);
            }
        }

        if (patternType === 'electric_sparks' && pt.index % 8 === 0) {
            const dir = rng.chance(0.5) ? 1 : -1;
            forcePixel(pt.x, pt.y + (r * dir) + dir, 'H');
            forcePixel(pt.x + 1, pt.y + (r * dir) + (dir * 2), 'G');
            forcePixel(pt.x, pt.y + (r * dir) + (dir * 3), 'H');
        }
    }

    const head = path[path.length - 1]; 
    const eyeX = head.x - 2, eyeY = head.y - 1;

    if (type === 'lamprey' || type === 'hagfish') {
        forcePixel(eyeX, eyeY, 'H'); 
    } else {
        forcePixel(eyeX, eyeY, 'D'); 
        if (rng.chance(0.5)) forcePixel(eyeX - 1, eyeY, 'G'); 
    }

    if (type === 'lamprey') {
        const mouthR = Math.max(2, Math.floor(head.thick / 2));
        for (let dy = -mouthR; dy <= mouthR; dy++) {
            forcePixel(head.x + 1, head.y + dy, 'S'); 
            if (Math.abs(dy) < mouthR) forcePixel(head.x + 2, head.y + dy, 'W'); 
        }
    } else if (type === 'sea_snake') {
        const tongueY = head.y + 1;
        forcePixel(head.x + 1, tongueY, 'H'); forcePixel(head.x + 2, tongueY, 'G');
        forcePixel(head.x + 3, tongueY - 1, 'G'); forcePixel(head.x + 3, tongueY + 1, 'G'); 
    } else if (type === 'eel') {
        forcePixel(head.x, head.y + 1, null); forcePixel(head.x + 1, head.y + 2, 'B'); 
        forcePixel(head.x + 1, head.y + 1, 'W'); forcePixel(head.x, head.y, 'W'); 
    } else if (type === 'oarfish') {
        forcePixel(head.x, head.y + 1, 'S'); 
        const crestBaseX = head.x - 3, crestBaseY = head.y - Math.floor(head.thick/2);
        for(let c = 0; c < 3; c++) {
            const h = rng.int(5, 9);
            for(let y = 1; y <= h; y++) forcePixel(crestBaseX - c*2 + Math.floor(y/2), crestBaseY - y, 'H');
            forcePixel(crestBaseX - c*2 + Math.floor(h/2), crestBaseY - h, 'G'); 
        }
    } else if (type === 'hagfish') {
        forcePixel(head.x, head.y, 'S'); 
        forcePixel(head.x + 1, head.y - 1, 'H'); forcePixel(head.x + 2, head.y - 2, 'H'); 
        forcePixel(head.x + 1, head.y + 1, 'H'); forcePixel(head.x + 2, head.y + 2, 'H'); 
        forcePixel(head.x + 1, head.y, 'H'); forcePixel(head.x + 3, head.y, 'H'); 
    }

    const outlineGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
    for (let y = 0; y < GRID_SIZE; y++) for (let x = 0; x < GRID_SIZE; x++) {
        if (grid[y][x] === null) {
            if ((y > 0 && grid[y - 1][x] !== null) || (y < GRID_SIZE - 1 && grid[y + 1][x] !== null) || 
                (x > 0 && grid[y][x - 1] !== null) || (x < GRID_SIZE - 1 && grid[y][x + 1] !== null)) {
                outlineGrid[y][x] = 'O';
            }
        }
    }

    const colorMap = {
        'B': palette.base, 'S': palette.shadow, 'H': palette.highlight,
        'G': palette.glow, 'O': palette.outline, 'D': '#030712', 'W': '#F9FAFB'  
    };

    for (let y = 0; y < GRID_SIZE; y++) for (let x = 0; x < GRID_SIZE; x++) {
        let colorCode = grid[y][x] || outlineGrid[y][x];
        if (colorCode) drawScaledRect(ctx, x, y, 1, 1, colorMap[colorCode], DISPLAY_SCALE);
    }

    const regions =["Darklake", "Slime-Trench", "Whisper-Chasm", "Rot-Garden", "Black-Reach", "Sunless-Sea", "Abyssal-Rift", "Grog-Mud", "Coil-Caves"];
    const colors =["Ghostly", "Neon", "Volt", "Crimson", "Veridian", "Obsidian", "Sulphur", "Bone", "Abyssal-Black", "Opal"];
    const traits =["Slithering", "Venomous", "Blind", "Cave", "Electric", "Banded", "Blood", "Crowned", "Fungal", "Writhing", "Grasping"];

    let nouns =[];
    if (type === 'eel') nouns =["Eel", "Moray", "Ribbon-Fish", "Gulper", "Coil"];
    else if (type === 'lamprey') nouns =["Lamprey", "Sucker", "Leech", "Bloodsucker", "Borer"];
    else if (type === 'sea_snake') nouns =["Viper", "Sea-Snake", "Serpent", "Adder", "Fang"];
    else if (type === 'oarfish') nouns =["Oarfish", "King-Eel", "Crest-Fish", "Ribbon-Lord"];
    else if (type === 'hagfish') nouns =["Hagfish", "Slime-Eel", "Snot-Fish", "Scavenger"];
    
    const localNames =["Cave-Serpent", "Abyss-Whip", "Trench-Crawler", "Gloom-Slider", "Mud-Coil", "Blood-Drinker", "Shadow-Snake"];

    let creatureName = "";
    const nameRoll = rng.next();
    
    if (nameRoll < 0.25) creatureName = `${rng.pick(traits)} ${rng.pick(nouns)}`;
    else if (nameRoll < 0.5) creatureName = `${rng.pick(colors)} ${rng.pick(traits)} ${rng.pick(nouns)}`;
    else if (nameRoll < 0.7) creatureName = `${rng.pick(localNames)} of the ${rng.pick(regions)}`;
    else if (nameRoll < 0.85) creatureName = `${rng.pick(regions)} ${rng.pick(nouns)}`;
    else creatureName = `${rng.pick(colors)} ${rng.pick(localNames)}`;

    if (type === 'oarfish' && !creatureName.includes("Crown")) creatureName = "Crowned " + creatureName;
    if (type === 'hagfish' && !creatureName.includes("Slime")) creatureName = "Slimy " + creatureName;
    if (patternType === 'electric_sparks' && !creatureName.includes("Volt") && !creatureName.includes("Electric")) creatureName = "Volt-Scaled " + creatureName;
    if (patternType === 'slime_coat') creatureName = "Oozing " + creatureName;
    if (pose === 'tight_coil') creatureName = "Coiled " + creatureName;

    return {
        name: creatureName,
        family: "Serpentine",
        imageDataUrl: offscreenCanvas.toDataURL(),
        data: { palette: palette.name, type, pattern: patternType, pose, length: bodyLength * 2 }
    };
}