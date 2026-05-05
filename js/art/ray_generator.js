/**
 * js/art/ray_generator.js
 * Generates top-down stylized, outlined ray/flatfish sprites.
 */

import { drawScaledRect } from '../util/utils.js';
import { getRandomPalette } from './palettes.js';

const GRID_SIZE = 64;
const DISPLAY_SCALE = 4;
const CANVAS_SIZE = GRID_SIZE * DISPLAY_SCALE;

export function generateRay(options = {}) {
    // Fallback RNG if none provided
    const rng = options.rng || { 
        next: Math.random, 
        int: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min, 
        float: (min, max) => Math.random() * (max - min) + min, 
        chance: (p) => Math.random() < p,
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
            grid[y][x] = colorCode;
        }
    }

    const cx = 32, cy = 24; // Shifted up for long tails
    
    const rayShape = rng.pick(['kite', 'manta', 'round', 'diamond', 'bat']);
    const bodyLengthFront = rng.int(8, 14);
    const bodyLengthBack = rng.int(10, 18);
    const wingSpan = rng.int(16, 28); 
    
    const tailType = rng.pick(['whip', 'stinger', 'club', 'ribbon']);
    const tailLength = tailType === 'ribbon' ? rng.int(20, 32) : rng.int(18, 28);
    const tailWhip = rng.int(0, 6); 
    
    const hasMantaHorns = rayShape === 'manta' || rng.chance(0.2);
    const hasSpinedRidge = rng.chance(0.4); 
    
    const patternType = rng.pick(['spots', 'mottled', 'glowing_edges', 'striped', 'starry', 'none']);
    const eyeType = rng.pick(['normal', 'glowing', 'blind', 'slit']);

    function getWingWidthAtY(yOffset) {
        if (yOffset < -bodyLengthFront || yOffset > bodyLengthBack) return 0;
        let width = 0;
        if (yOffset < 0) {
            const progress = 1 - (Math.abs(yOffset) / bodyLengthFront);
            if (rayShape === 'kite' || rayShape === 'diamond' || rayShape === 'bat') width = progress * wingSpan;
            else if (rayShape === 'manta') width = Math.pow(progress, 0.5) * wingSpan;
            else if (rayShape === 'round') width = Math.sqrt(1 - Math.pow(1 - progress, 2)) * wingSpan;
        } else {
            const progress = 1 - (yOffset / bodyLengthBack);
            if (rayShape === 'kite') width = progress * wingSpan;
            else if (rayShape === 'diamond') width = progress * wingSpan * 0.8; 
            else if (rayShape === 'bat') {
                const baseWidth = progress * wingSpan;
                const scallop = Math.abs(Math.sin(progress * Math.PI * 3)) * 4;
                width = Math.max(0, baseWidth - scallop);
            }
            else if (rayShape === 'manta') width = Math.pow(progress, 2) * wingSpan; 
            else if (rayShape === 'round') width = Math.sqrt(1 - Math.pow(1 - progress, 2)) * wingSpan;
        }
        return Math.floor(width);
    }

    // 1. TAIL
    for (let t = 0; t <= tailLength; t++) {
        const progress = t / tailLength;
        const wave = Math.sin(progress * Math.PI * 2) * tailWhip;
        const tx = cx + wave;
        const ty = cy + bodyLengthBack - 2 + t;

        let thickness = t < tailLength * 0.3 ? 2 : 1;
        if (tailType === 'ribbon') thickness = Math.max(1, 3 - Math.floor(progress * 3));

        for (let w = 0; w < thickness; w++) setPixel(tx + w, ty, 'S');

        if (t === tailLength - 2) {
            if (tailType === 'stinger') {
                setPixel(tx, ty, 'G'); setPixel(tx + 1, ty + 1, 'H'); setPixel(tx + 2, ty + 2, 'H'); 
            } else if (tailType === 'club') {
                setPixel(tx - 1, ty, 'H'); setPixel(tx + 1, ty, 'H');
                setPixel(tx - 1, ty + 1, 'B'); setPixel(tx + 1, ty + 1, 'B');
                setPixel(tx, ty + 2, 'H');
            }
        }
    }

    // 2. PELVIC FINS
    const pelvicLength = rng.int(3, 7);
    const pelvicWidth = rng.int(3, 6);
    for (let py = 0; py < pelvicLength; py++) {
        for (let px = 0; px < pelvicWidth - py * 0.5; px++) {
            setPixel(cx - 2 - px, cy + bodyLengthBack - 2 + py, 'S');
            setPixel(cx + 2 + px, cy + bodyLengthBack - 2 + py, 'S');
        }
    }

    // 3. MAIN DISC
    for (let y = -bodyLengthFront; y <= bodyLengthBack; y++) {
        const hWidth = getWingWidthAtY(y);

        for (let x = -hWidth; x <= hWidth; x++) {
            let color = 'B';
            const normalizedDistX = Math.abs(x) / (hWidth || 1);
            
            if (normalizedDistX > 0.75) color = 'S'; 
            
            if (y > -bodyLengthFront * 0.7 && y < bodyLengthBack * 0.5) {
                const highlightRadiusX = 2.5; 
                const highlightRadiusY = (bodyLengthFront + bodyLengthBack) * 0.35; 
                if ((x * x) / (highlightRadiusX * highlightRadiusX) + (y * y) / (highlightRadiusY * highlightRadiusY) <= 1) color = 'H';
            }

            if (patternType === 'spots' && rng.chance(0.1) && color === 'B') color = 'G';
            if (patternType === 'mottled' && rng.chance(0.3) && color === 'B') color = 'S';
            if (patternType === 'glowing_edges' && normalizedDistX > 0.8) color = 'G'; 
            if (patternType === 'striped' && (Math.abs(x) + y) % 6 < 2 && color === 'B') color = 'S';
            if (patternType === 'starry' && rng.chance(0.05) && color !== 'H') color = 'G';

            setPixel(cx + x, cy + y, color);
        }

        if (hasSpinedRidge && y > -bodyLengthFront * 0.5 && y < bodyLengthBack * 0.7) {
            if (y % 3 === 0) setPixel(cx, cy + y, 'H'); 
            else if (y % 3 === 1) setPixel(cx, cy + y, 'S'); 
        }
    }

    // 4. MANTA HORNS
    if (hasMantaHorns) {
        const hornLength = rng.int(3, 7);
        for (let hy = 0; hy < hornLength; hy++) {
            const hx = Math.floor(wingSpan * 0.2); 
            setPixel(cx - hx, cy - bodyLengthFront - hy + 1, 'S'); setPixel(cx - hx + 1, cy - bodyLengthFront - hy + 1, 'H');
            setPixel(cx + hx, cy - bodyLengthFront - hy + 1, 'S'); setPixel(cx + hx - 1, cy - bodyLengthFront - hy + 1, 'H');
        }
    }

    // 5. EYES
    const eyeDistX = Math.floor(wingSpan * 0.15) + 1;
    const eyeY = cy - Math.floor(bodyLengthFront * 0.5);

    if (eyeType !== 'blind') {
        const eyeColor = eyeType === 'glowing' ? 'G' : 'D';
        setPixel(cx - eyeDistX, eyeY, eyeColor); setPixel(cx + eyeDistX, eyeY, eyeColor);
        
        if (eyeType === 'slit') {
            setPixel(cx - eyeDistX, eyeY - 1, 'H'); setPixel(cx + eyeDistX, eyeY - 1, 'H');
        } else if (eyeType !== 'glowing') {
            setPixel(cx - eyeDistX - 1, eyeY - 1, 'H'); setPixel(cx + eyeDistX + 1, eyeY - 1, 'H'); 
        }
    }

    // 6. OUTLINE
    const outlineGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
    for (let y = 0; y < GRID_SIZE; y++) for (let x = 0; x < GRID_SIZE; x++) {
        if (grid[y][x] === null) {
            if ((y > 0 && grid[y - 1][x] !== null) || (y < GRID_SIZE - 1 && grid[y + 1][x] !== null) || 
                (x > 0 && grid[y][x - 1] !== null) || (x < GRID_SIZE - 1 && grid[y][x + 1] !== null)) {
                outlineGrid[y][x] = 'O';
            }
        }
    }

    // 7. RENDER
    const colorMap = {
        'B': palette.base, 'S': palette.shadow, 'H': palette.highlight,
        'G': palette.glow, 'O': palette.outline, 'D': '#030712'
    };

    for (let y = 0; y < GRID_SIZE; y++) for (let x = 0; x < GRID_SIZE; x++) {
        let colorCode = grid[y][x] || outlineGrid[y][x];
        if (colorCode) drawScaledRect(ctx, x, y, 1, 1, colorMap[colorCode], DISPLAY_SCALE);
    }

    // 8. NAMING
    const regions =["Darklake", "Whisper-Chasm", "Rot-Garden", "Black-Reach", "Glimmer-Pool", "Abyssal-Trench", "Sunless-Sea", "Grog-Mud", "Crystal-Spire", "Deep-Whorl"];
    const colors =["Ghostly", "Neon", "Azure", "Sulphur", "Amber", "Veridian", "Crimson", "Inky", "Pale", "Obsidian", "Opal", "Amethyst", "Bone-White", "Rust"];
    const traits =["Gliding", "Venomous", "Electric", "Mottled", "Spotted", "Blind", "Spined", "Horned", "Armored", "Lurking", "Abyssal", "Fungal", "Crystal", "Broad-Winged", "Whiptail", "Silent"];
    const nouns =["Ray", "Skate", "Manta", "Glider", "Stinger", "Drifter", "Flounder", "Carpet", "Disc", "Wraith-Wing", "Shadow-Float", "Skitter"];
    const localNames =["Cave-Kite", "Abyss-Wing", "Shadow-Disc", "Gloom-Skate", "Muck-Glider", "Deep-Drifter", "Stone-Carpet", "Void-Ray"];

    let fishName = "";
    const nameRoll = rng.next();
    
    if (nameRoll < 0.25) fishName = `${rng.pick(colors)} ${rng.pick(nouns)}`;
    else if (nameRoll < 0.5) fishName = `${rng.pick(traits)} ${rng.pick(nouns)}`;
    else if (nameRoll < 0.7) fishName = `${rng.pick(colors)} ${rng.pick(traits)} ${rng.pick(nouns)}`;
    else if (nameRoll < 0.85) fishName = `${rng.pick(localNames)} of ${rng.pick(regions)}`;
    else fishName = `${rng.pick(regions)} ${rng.pick(nouns)}`;

    if (tailType === 'stinger' && !fishName.includes("Sting")) fishName = "Sting-" + fishName;
    if (tailType === 'club') fishName = "Club-Tailed " + fishName;
    if (hasMantaHorns && !fishName.includes("Manta")) fishName = "Horned " + fishName;
    if (hasSpinedRidge && !fishName.includes("Spined")) fishName = "Ridge-Backed " + fishName;
    if (rayShape === 'bat') fishName = "Vampire " + fishName;

    return {
        name: fishName,
        family: "Flat Fish / Ray",
        imageDataUrl: offscreenCanvas.toDataURL(),
        data: { palette: palette.name, rayShape, pattern: patternType, tailType, hasMantaHorns, hasSpinedRidge, eyeType }
    };
}