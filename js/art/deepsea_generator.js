/**
 * js/art/deepsea_generator.js
 * Generates stylized, outlined deep-sea horrors.
 */

import { drawScaledRect } from '../util/utils.js';
import { getRandomPalette } from './palettes.js';

const GRID_SIZE = 64;
const DISPLAY_SCALE = 4;
const CANVAS_SIZE = GRID_SIZE * DISPLAY_SCALE;

export function generateDeepSea(options = {}) {
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
            if (!grid[y][x]) grid[y][x] = colorCode; // Don't overwrite anything to preserve layers
        }
    }

    function forcePixel(x, y, colorCode) {
        x = Math.round(x); y = Math.round(y);
        if (x >= 0 && x < GRID_SIZE && y >= 0 && y < GRID_SIZE) {
            grid[y][x] = colorCode;
        }
    }

    function drawToothLine(x0, y0, x1, y1) {
        x0 = Math.round(x0); y0 = Math.round(y0);
        x1 = Math.round(x1); y1 = Math.round(y1);
        let dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
        let sx = (x0 < x1) ? 1 : -1, sy = (y0 < y1) ? 1 : -1;
        let err = dx - dy;

        while (true) {
            if (x0 >= 0 && x0 < GRID_SIZE && y0 >= 0 && y0 < GRID_SIZE) {
                const current = grid[y0][x0];
                if (current === null || current === 'S') grid[y0][x0] = 'W';
            }
            if (x0 === x1 && y0 === y1) break;
            let e2 = 2 * err;
            if (e2 > -dy) { err -= dy; x0 += sx; }
            if (e2 < dx) { err += dx; y0 += sy; }
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
                    if (tx*tx + ty*ty <= offset*offset + 1) forcePixel(x0 + tx, y0 + ty, colorCode);
                }
            }
            if (x0 === x1 && y0 === y1) break;
            let e2 = 2 * err;
            if (e2 > -dy) { err -= dy; x0 += sx; }
            if (e2 < dx) { err += dx; y0 += sy; }
        }
    }

    const cx = 32; 
    let cy = 32; 
    
    const type = rng.pick(['angler', 'gulper', 'viperfish', 'hatchetfish']);
    const patternType = rng.pick(['mottled', 'scarred', 'glowing_spots', 'translucent', 'none']);
    const eyeType = rng.pick(['dead', 'glowing', 'slit', 'bulging']);
    
    const hasWartyTexture = rng.chance(0.4);
    const hasTailLure = rng.chance(0.5); 
    const lureStyle = rng.pick(['bulb', 'branching']); 

    // 1. ANGLERFISH
    if (type === 'angler') {
        const headRadius = rng.int(11, 15);
        const tailLength = rng.int(10, 14);
        
        for (let t = 0; t < tailLength; t++) {
            const x = cx - headRadius + 2 - t;
            const w = Math.max(1, Math.floor((1 - (t / tailLength)) * (headRadius * 0.7)));
            for (let y = -w; y <= w; y++) forcePixel(x, cy + y, y < 0 ? 'S' : 'B');
            if (t > tailLength - 4) {
                const spread = (t - (tailLength - 4)) * 2;
                for (let sy = -spread; sy <= spread; sy++) forcePixel(x, cy + sy, 'S');
            }
        }

        drawGridLine(cx - 2, cy + 4, cx - 8, cy + 10, 'S', 2);

        for (let y = -headRadius; y <= headRadius; y++) {
            for (let x = -headRadius; x <= headRadius; x++) {
                if (x*x + y*y <= headRadius*headRadius) {
                    const angle = Math.atan2(y, x);
                    if (angle > -0.4 && angle < 0.4 && x > 0) {
                        if (x*x + y*y < Math.pow(headRadius - 2, 2)) forcePixel(cx + x, cy + y, 'S');
                    } else {
                        let c = 'B';
                        if (y < -headRadius * 0.3) c = 'H';
                        if (y > headRadius * 0.4 || x < -headRadius * 0.5) c = 'S';
                        
                        if (patternType === 'mottled' && rng.chance(0.2)) c = 'S';
                        if (hasWartyTexture && rng.chance(0.08)) {
                            forcePixel(cx + x, cy + y, 'H'); forcePixel(cx + x, cy + y + 1, 'S');
                        }
                        if (patternType === 'translucent' && x < 0 && rng.chance(0.2)) c = 'G'; 
                        
                        setPixel(cx + x, cy + y, c);
                    }
                }
            }
        }

        drawGridLine(cx + 1, cy + 3, cx - 5, cy + 9, 'H', 2);

        const mouthEdgeX = cx + headRadius - 3;
        drawToothLine(mouthEdgeX, cy - Math.floor(headRadius * 0.3), mouthEdgeX + 2, cy); 
        drawToothLine(mouthEdgeX - 3, cy - Math.floor(headRadius * 0.35), mouthEdgeX - 1, cy);
        drawToothLine(mouthEdgeX, cy + Math.floor(headRadius * 0.3), mouthEdgeX + 2, cy); 
        drawToothLine(mouthEdgeX - 3, cy + Math.floor(headRadius * 0.35), mouthEdgeX - 1, cy);

        forcePixel(cx - 1, cy - Math.floor(headRadius * 0.5), eyeType === 'glowing' ? 'G' : 'D');
        if (eyeType === 'bulging') forcePixel(cx - 1, cy - Math.floor(headRadius * 0.5) - 1, 'H');

        let lX = cx - Math.floor(headRadius * 0.5);
        let lY = cy - headRadius;
        drawGridLine(lX, lY, lX + 6, lY - 8, 'H', 1);
        drawGridLine(lX + 6, lY - 8, lX + 14, lY - 4, 'H', 1);
        
        if (lureStyle === 'bulb') {
            forcePixel(lX + 14, lY - 4, 'G'); forcePixel(lX + 13, lY - 4, 'H');
            forcePixel(lX + 15, lY - 4, 'H'); forcePixel(lX + 14, lY - 5, 'H');
            forcePixel(lX + 14, lY - 3, 'H');
        } else if (lureStyle === 'branching') {
            drawGridLine(lX + 14, lY - 4, lX + 17, lY - 6, 'G', 1);
            drawGridLine(lX + 14, lY - 4, lX + 18, lY - 3, 'G', 1);
            drawGridLine(lX + 14, lY - 4, lX + 16, lY - 1, 'G', 1);
        }
    } 

    // 2. GULPER EEL
    else if (type === 'gulper') {
        cy = 24; 
        const tailLength = rng.int(25, 35);
        const jawDepth = rng.int(14, 18);
        const jawLength = rng.int(16, 20);

        let lastTX = cx - 4, lastTY = cy;
        for (let t = 0; t < tailLength; t++) {
            const wave = Math.sin(t * 0.3) * 2;
            const drop = (t / tailLength) * 8;
            const thick = Math.max(1, 3 - Math.floor(t / 8));
            lastTX = cx - 4 - t;
            lastTY = cy + wave + drop;
            for(let ty = -Math.floor(thick/2); ty <= Math.floor(thick/2); ty++) forcePixel(lastTX, lastTY + ty, ty < 0 ? 'H' : 'S');
        }
        
        if (hasTailLure) {
            forcePixel(lastTX, lastTY, 'G'); forcePixel(lastTX - 1, lastTY, 'G');
            forcePixel(lastTX, lastTY - 1, 'H'); forcePixel(lastTX, lastTY + 1, 'H');
        }

        for (let x = -3; x <= jawLength; x++) {
            const progress = (x + 3) / (jawLength + 3); 
            const topY = cy - 2 + (progress * 2);
            const pouchDrop = Math.sin(progress * Math.PI) * jawDepth;
            const botY = topY + pouchDrop;

            for (let y = Math.floor(topY); y <= Math.ceil(botY); y++) {
                let c = 'S'; 
                if (y === Math.floor(topY)) c = 'H';
                else if (y === Math.floor(topY) + 1) c = 'B';
                else if (y === Math.ceil(botY)) c = 'S';
                else if (y === Math.ceil(botY) - 1) c = 'B';
                else if (y === Math.ceil(botY) - 2 && x > 2) c = 'H'; 

                if (patternType === 'translucent' && c === 'S' && rng.chance(0.05) && y > topY + 4) c = 'G';
                forcePixel(cx + x, y, c);
            }
        }

        forcePixel(cx + 2, cy - 1, eyeType === 'glowing' ? 'G' : 'D');

        for (let i = 2; i < jawLength - 1; i += 3) {
            const topY = cy - 2 + ((i + 3) / (jawLength + 3) * 2);
            drawToothLine(cx + i, topY + 1, cx + i, topY + 3);
        }
    }

    // 3. VIPERFISH
    else if (type === 'viperfish') {
        const bodyLength = rng.int(22, 30);
        const headLength = 7;
        const bodyThickness = rng.int(3, 5);

        for (let i = 0; i < bodyLength; i++) {
            const x = cx - i;
            const wave = Math.sin(i * 0.3) * 1.5;
            const thick = Math.max(1, Math.floor(bodyThickness * Math.sqrt(1 - i/bodyLength)));
            for (let ty = -thick; ty <= thick; ty++) {
                let c = 'B';
                if (ty < -thick * 0.3) c = 'H';
                if (ty > thick * 0.3) c = 'S';
                forcePixel(x, cy + wave + ty, c);
            }
            if (i % 3 === 0 && thick > 1) forcePixel(x, cy + wave + thick, 'G');
        }

        drawGridLine(cx - bodyLength, cy, cx - bodyLength - 5, cy - 4, 'S', 1);
        drawGridLine(cx - bodyLength, cy, cx - bodyLength - 5, cy + 4, 'S', 1);
        drawGridLine(cx - bodyLength - 5, cy - 4, cx - bodyLength - 5, cy + 4, 'S', 1);

        drawGridLine(cx - 3, cy - bodyThickness, cx - 8, cy - bodyThickness - 10, 'H', 1);
        drawGridLine(cx - 8, cy - bodyThickness - 10, cx + 2, cy - bodyThickness - 14, 'H', 1);
        forcePixel(cx + 2, cy - bodyThickness - 14, 'G'); 

        const jawOpenAmount = rng.int(5, 8);
        drawGridLine(cx, cy - bodyThickness + 1, cx + headLength, cy - bodyThickness - 2, 'B', 3);
        drawGridLine(cx, cy - bodyThickness, cx + headLength, cy - bodyThickness - 3, 'H', 1);
        
        drawGridLine(cx, cy + bodyThickness - 1, cx + headLength - 1, cy + bodyThickness + jawOpenAmount, 'B', 2);
        drawGridLine(cx, cy + bodyThickness, cx + headLength - 1, cy + bodyThickness + jawOpenAmount + 1, 'S', 1);

        forcePixel(cx + 2, cy - bodyThickness, eyeType === 'glowing' ? 'G' : 'D');

        drawToothLine(cx + 2, cy - bodyThickness, cx + 3, cy + bodyThickness + Math.floor(jawOpenAmount/2));
        drawToothLine(cx + 5, cy - bodyThickness - 1, cx + 6, cy + bodyThickness + Math.floor(jawOpenAmount/2));
        drawToothLine(cx + 1, cy + bodyThickness + 1, cx - 2, cy - bodyThickness - 4); 
        drawToothLine(cx + 4, cy + bodyThickness + jawOpenAmount - 1, cx + 1, cy - bodyThickness - 3);
    }

    // 4. HATCHETFISH
    else if (type === 'hatchetfish') {
        const bodyLength = rng.int(12, 16);
        const maxDepth = rng.int(14, 20); 
        
        for (let x = -bodyLength; x <= 6; x++) {
            const normalizedX = (x + bodyLength) / (bodyLength + 6); 
            const topY = cy - 4 - Math.sin(normalizedX * Math.PI) * 2;
            let botY = cy;
            if (normalizedX > 0.3) {
                const bellyFactor = Math.sin(((normalizedX - 0.3) / 0.7) * Math.PI);
                botY = cy + (bellyFactor * maxDepth);
            } else {
                botY = cy + 2;
            }

            for (let y = Math.floor(topY); y <= Math.ceil(botY); y++) {
                let c = 'B';
                if (y < topY + 3) c = 'H';
                if (y > botY - 3) c = 'S';
                if (y === Math.ceil(botY) && x > -bodyLength + 4) c = 'G';
                if (patternType === 'glowing_spots' && rng.chance(0.1)) c = 'G';
                forcePixel(cx + x, y, c);
            }
        }

        drawGridLine(cx - bodyLength, cy - 1, cx - bodyLength - 6, cy - 5, 'S', 1);
        drawGridLine(cx - bodyLength, cy + 1, cx - bodyLength - 6, cy + 5, 'S', 1);
        drawGridLine(cx - bodyLength - 6, cy - 5, cx - bodyLength - 6, cy + 5, 'H', 1);

        const eyeX = cx + 2, eyeY = cy - 2;
        for (let dx = -1; dx <= 1; dx++) for (let dy = -1; dy <= 1; dy++) forcePixel(eyeX+dx, eyeY+dy, 'B');
        forcePixel(eyeX, eyeY, 'D'); forcePixel(eyeX + 1, eyeY, 'D');
        forcePixel(eyeX, eyeY - 1, eyeType === 'glowing' ? 'G' : 'W'); 
        
        forcePixel(cx + 6, cy + 2, 'B'); forcePixel(cx + 6, cy + 1, 'H');
        forcePixel(cx + 5, cy + 2, 'S'); 
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
        'G': palette.glow, 'O': palette.outline, 'D': '#030712', 'W': '#F9FAFB'
    };

    for (let y = 0; y < GRID_SIZE; y++) for (let x = 0; x < GRID_SIZE; x++) {
        let colorCode = grid[y][x] || outlineGrid[y][x];
        if (colorCode) drawScaledRect(ctx, x, y, 1, 1, colorMap[colorCode], DISPLAY_SCALE);
    }

    // 7. NAMING
    const regions =["Darklake", "Abyssal-Trench", "Hadal-Reach", "Sunless-Sea", "Grog-Mud", "Whisper-Chasm", "Void-Grotto", "Tear-Drop Deep"];
    const colors =["Ghostly", "Neon", "Obsidian", "Sulphur", "Crimson", "Void-Touched", "Ash", "Abyssal-Black", "Luminescent", "Pale"];
    const traits =["Lantern", "Toothed", "Gaping", "Blind", "Lurking", "Translucent", "Iron-Jaw", "Fleshy", "Starved", "Venomous", "Giant"];
    
    let nouns =[];
    if (type === 'angler') nouns =["Angler", "Devourer", "Trap-Maw", "Bulb-Fish", "Lure-Bringer"];
    else if (type === 'gulper') nouns =["Gulper", "Pelican-Eel", "Swallower", "Maw", "Gape-Demon"];
    else if (type === 'viperfish') nouns =["Viperfish", "Fang-Fish", "Needle-Mouth", "Stalker"];
    else if (type === 'hatchetfish') nouns =["Hatchetfish", "Blade-Fish", "Spectre", "Silver-Axe"];

    const localNames =["Trench-Lurker", "Light-Thief", "Gloom-Maw", "Abyss-Gazer", "Depth-Horror", "Soul-Eater", "Void-Spawn"];

    let creatureName = "";
    const nameRoll = rng.next();
    
    if (nameRoll < 0.25) creatureName = `${rng.pick(traits)} ${rng.pick(nouns)}`;
    else if (nameRoll < 0.5) creatureName = `${rng.pick(colors)} ${rng.pick(traits)} ${rng.pick(nouns)}`;
    else if (nameRoll < 0.7) creatureName = `${rng.pick(traits)} ${rng.pick(localNames)} of the ${rng.pick(regions)}`;
    else if (nameRoll < 0.85) creatureName = `${rng.pick(regions)} ${rng.pick(nouns)}`;
    else creatureName = `${rng.pick(colors)} ${rng.pick(localNames)}`;

    if (hasTailLure && type === 'gulper') creatureName = "Lure-Tailed " + creatureName;
    if (lureStyle === 'branching' && type === 'angler') creatureName = "Root-Lured " + creatureName;
    if (hasWartyTexture) creatureName = "Warty " + creatureName;
    if (type === 'hatchetfish' && !creatureName.includes("Hatchet")) creatureName = "Deep-Keel " + creatureName;
    if (eyeType === 'bulging') creatureName = "Bug-Eyed " + creatureName;

    return {
        name: creatureName,
        family: "Deep Sea Horror",
        imageDataUrl: offscreenCanvas.toDataURL(),
        data: { palette: palette.name, type, pattern: patternType, eyeType, hasWartyTexture, hasTailLure, lureStyle }
    };
}