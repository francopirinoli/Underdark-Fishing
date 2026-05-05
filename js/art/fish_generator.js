/**
 * js/art/fish_generator.js
 * Generates stylized, outlined, highly varied fish sprites.
 */

import { getRandomInt, getRandomElement, drawScaledRect } from '../util/utils.js';
import { getRandomPalette } from './palettes.js';

const GRID_SIZE = 64;
const DISPLAY_SCALE = 4;
const CANVAS_SIZE = GRID_SIZE * DISPLAY_SCALE;

export function generateStandardFish(options = {}) {
    const rng = options.rng || { next: Math.random, int: getRandomInt, float: (min, max) => Math.random() * (max - min) + min, chance: (p) => Math.random() < p };
    
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
            if (grid[y][x] !== 'P_H' && grid[y][x] !== 'P_S') grid[y][x] = colorCode;
        }
    }

    const cx = 32, cy = 32;
    const frontLength = rng.int(12, 20);
    const backLength = rng.int(14, 24);
    const baseBodyHeight = rng.int(6, 14);
    const bodyShape = getRandomElement(['torpedo', 'deep', 'sleek', 'humpback', 'needle'], rng);
    const tailType = getRandomElement(['forked', 'paddle', 'pointed', 'fan', 'ribbon'], rng);
    const tailLength = rng.int(8, 16);
    const tailSpread = rng.int(6, 14);
    const dorsalType = getRandomElement(['spiky', 'smooth', 'continuous', 'sail', 'none'], rng);
    const ventralType = getRandomElement(['smooth', 'spiky', 'fringed', 'none'], rng);
    const pectoralType = getRandomElement(['long', 'stubby', 'flowing', 'none'], rng);
    const patternType = getRandomElement(['countershade', 'stripes', 'spots', 'lateral_glow', 'tiger', 'skeleton', 'none'], rng);
    const mouthType = getRandomElement(['underbite', 'maw', 'normal', 'beak'], rng);
    const eyeType = getRandomElement(['normal', 'large', 'blind', 'glowing', 'multi'], rng);
    const hasBarbels = rng.chance(0.3);

    function getBodyHeightAtX(x) {
        if (x < cx - backLength || x > cx + frontLength) return 0;
        const isFront = x > cx;
        const lengthRef = isFront ? frontLength : backLength;
        const normalizedX = (x - cx) / lengthRef;
        let localHeight = baseBodyHeight;
        if (bodyShape === 'deep' && isFront) localHeight *= 1.3;
        if (bodyShape === 'sleek') localHeight *= 0.7;
        if (bodyShape === 'needle') localHeight *= 0.4;
        let curve = Math.sqrt(1 - Math.pow(normalizedX, 2));
        if (bodyShape === 'humpback' && isFront) curve = 1 - Math.pow(normalizedX - 0.2, 2);
        return Math.floor(localHeight * curve);
    }

    const tailStartX = cx - backLength + 3; 
    for (let t = 0; t <= tailLength; t++) {
        const x = tailStartX - t;
        let spread = 0;
        if (tailType === 'forked') {
            spread = Math.floor((t / tailLength) * tailSpread);
            for (let y = -spread; y <= spread; y++) {
                if (t > tailLength * 0.3 && Math.abs(y) < spread * 0.4) continue;
                setPixel(x, cy + y, y === -spread ? 'H' : 'S'); 
            }
        } else if (tailType === 'paddle') {
            spread = Math.floor(Math.sin((t / tailLength) * Math.PI) * tailSpread);
            for (let y = -spread; y <= spread; y++) setPixel(x, cy + y, y === -spread ? 'H' : 'S');
        } else if (tailType === 'pointed') {
            spread = Math.floor((1 - (t / tailLength)) * tailSpread);
            for (let y = -spread; y <= spread; y++) setPixel(x, cy + y, y === -spread ? 'H' : 'S');
        } else if (tailType === 'fan') {
            spread = Math.floor(Math.pow((t / tailLength), 0.5) * tailSpread); 
            for (let y = -spread; y <= spread; y++) setPixel(x, cy + y, y === -spread || Math.abs(y)%3===0 ? 'H' : 'S');
        } else if (tailType === 'ribbon') {
            const wave = Math.sin(t * 0.5) * 3;
            spread = Math.max(1, Math.floor((1 - (t / tailLength)) * 3));
            for (let y = -spread; y <= spread; y++) setPixel(x, cy + y + Math.floor(wave), 'S');
        }
    }

    if (dorsalType !== 'none') {
        const finStartX = cx - Math.floor(backLength * 0.8);
        const finEndX = dorsalType === 'sail' ? cx : cx + Math.floor(frontLength * 0.4);
        const finLength = finEndX - finStartX;
        const maxFinHeight = dorsalType === 'sail' ? rng.int(10, 16) : rng.int(4, 9);
        for (let f = 0; f <= finLength; f++) {
            const x = finStartX + f;
            let finH = 0;
            if (dorsalType === 'smooth' || dorsalType === 'continuous') finH = Math.floor(Math.sin((f / finLength) * Math.PI) * maxFinHeight);
            else if (dorsalType === 'spiky') finH = (f % 4 === 0) ? maxFinHeight : Math.floor(maxFinHeight / 2);
            else if (dorsalType === 'sail') finH = Math.floor(Math.pow(1 - Math.abs((f/finLength)-0.5)*2, 0.5) * maxFinHeight);
            const bodyTopY = cy - getBodyHeightAtX(x);
            for (let y = bodyTopY + 2; y >= bodyTopY - finH; y--) setPixel(x, y, y === bodyTopY - finH ? 'H' : 'S');
        }
    }

    if (ventralType !== 'none') {
        const finStartX = cx - Math.floor(backLength * 0.5);
        const finEndX = cx + Math.floor(frontLength * 0.1);
        const finLength = finEndX - finStartX;
        const maxFinHeight = rng.int(3, 7);
        for (let f = 0; f <= finLength; f++) {
            const x = finStartX + f;
            let finH = 0;
            if (ventralType === 'smooth') finH = Math.floor(Math.sin((f / finLength) * Math.PI) * maxFinHeight);
            else if (ventralType === 'spiky') finH = (f % 3 === 0) ? maxFinHeight : 2;
            else if (ventralType === 'fringed') finH = maxFinHeight - (f % 2 === 0 ? 0 : 2); 
            const bodyBottomY = cy + getBodyHeightAtX(x);
            for (let y = bodyBottomY - 2; y <= bodyBottomY + finH; y++) setPixel(x, y, 'S');
        }
    }

    for (let x = cx - backLength; x <= cx + frontLength; x++) {
        let hTop = getBodyHeightAtX(x);
        let hBot = getBodyHeightAtX(x);
        if (bodyShape === 'humpback') hBot = Math.floor(hBot * 0.6); 
        for (let y = -hTop; y <= hBot; y++) {
            let color = 'B';
            if (y < -hTop * 0.4) color = 'H';
            if (y > hBot * 0.4) color = 'S';
            if (patternType === 'countershade' && y > 0) color = 'S';
            if (patternType === 'stripes' && (x + y) % 6 < 2 && color === 'B') color = 'S';
            if (patternType === 'tiger' && x % 5 === 0 && Math.abs(y) < hTop*0.8) color = 'S'; 
            if (patternType === 'spots' && rng.chance(0.15) && color === 'B') color = 'G';
            if (patternType === 'lateral_glow' && Math.abs(y) <= 1 && x % 2 === 0) color = 'G';
            if (patternType === 'skeleton' && x % 4 === 0 && y > -hTop*0.6 && y < hBot*0.6) color = 'G'; 
            setPixel(x, cy + y, color);
        }
    }

    const mouthX = cx + frontLength;
    if (mouthType === 'underbite') {
        setPixel(mouthX + 1, cy + 1, 'B'); setPixel(mouthX + 2, cy + 1, 'B'); setPixel(mouthX + 2, cy, 'W'); 
    } else if (mouthType === 'maw') {
        setPixel(mouthX, cy, null); setPixel(mouthX - 1, cy, null); 
        setPixel(mouthX - 1, cy - 1, 'W'); setPixel(mouthX - 1, cy + 1, 'W'); 
    } else if (mouthType === 'beak') {
        setPixel(mouthX, cy, 'H'); setPixel(mouthX, cy + 1, 'S'); setPixel(mouthX + 1, cy, 'H');
    }

    if (hasBarbels) {
        const barbelY = cy + getBodyHeightAtX(mouthX - 2);
        setPixel(mouthX - 2, barbelY + 1, 'H'); setPixel(mouthX - 3, barbelY + 2, 'H'); setPixel(mouthX - 4, barbelY + 3, 'H');
    }

    const eyeX = cx + Math.floor(frontLength * 0.6);
    const eyeY = cy - Math.floor(getBodyHeightAtX(eyeX) * 0.5);
    if (eyeType === 'normal') setPixel(eyeX, eyeY, 'D');
    else if (eyeType === 'large') { setPixel(eyeX, eyeY, 'D'); setPixel(eyeX + 1, eyeY, 'D'); setPixel(eyeX, eyeY + 1, 'D'); setPixel(eyeX + 1, eyeY + 1, 'D'); setPixel(eyeX + 1, eyeY, 'W'); }
    else if (eyeType === 'glowing') { setPixel(eyeX, eyeY, 'G'); setPixel(eyeX + 1, eyeY, 'G'); }
    else if (eyeType === 'blind') setPixel(eyeX, eyeY, 'H'); 
    else if (eyeType === 'multi') { setPixel(eyeX, eyeY, 'D'); setPixel(eyeX - 2, eyeY + 1, 'D'); setPixel(eyeX + 1, eyeY - 2, 'D'); }

    if (pectoralType !== 'none') {
        const pecX = cx + Math.floor(frontLength * 0.2);
        const pecY = cy + Math.floor(baseBodyHeight * 0.2);
        if (pectoralType === 'long') for (let i = 0; i < 7; i++) setPixel(pecX - i, pecY + Math.floor(i / 2), 'P_H'); 
        else if (pectoralType === 'stubby') for (let i = 0; i < 3; i++) { setPixel(pecX - i, pecY, 'P_H'); setPixel(pecX - i, pecY + 1, 'P_S'); }
        else if (pectoralType === 'flowing') for (let i = 0; i < 9; i++) { const wave = Math.sin(i * 0.5); setPixel(pecX - i, pecY + Math.floor(wave) + i - 3, 'P_H'); }
    }

    const outlineGrid = Array(GRID_SIZE).fill(null).map(() => Array(GRID_SIZE).fill(null));
    for (let y = 0; y < GRID_SIZE; y++) for (let x = 0; x < GRID_SIZE; x++) {
        if (grid[y][x] === null) {
            if ((y > 0 && grid[y - 1][x] !== null) || (y < GRID_SIZE - 1 && grid[y + 1][x] !== null) || (x > 0 && grid[y][x - 1] !== null) || (x < GRID_SIZE - 1 && grid[y][x + 1] !== null)) {
                outlineGrid[y][x] = 'O';
            }
        }
    }

    const colorMap = {
        'B': palette.base, 'S': palette.shadow, 'H': palette.highlight, 'G': palette.glow, 'O': palette.outline,
        'D': '#030712', 'W': '#F9FAFB', 'P_H': palette.highlight, 'P_S': palette.shadow 
    };

    for (let y = 0; y < GRID_SIZE; y++) for (let x = 0; x < GRID_SIZE; x++) {
        let colorCode = grid[y][x] || outlineGrid[y][x];
        if (colorCode) drawScaledRect(ctx, x, y, 1, 1, colorMap[colorCode], DISPLAY_SCALE);
    }

    const regions =["Darklake", "Whisper-Chasm", "Rot-Garden", "Black-Reach", "Glimmer-Pool", "Abyssal-Trench", "Sunless-Sea", "Grog-Mud", "Crystal-Spire", "Deep-Whorl", "Sulphur-Vent", "Blingden-Stream", "Shadow-Shoals"];
    const colors =["Ghostly", "Neon", "Azure", "Sulphur", "Amber", "Veridian", "Crimson", "Inky", "Pale", "Obsidian", "Opal", "Amethyst", "Bone-White", "Rust"];
    const traits =["Whisker-Gilled", "Spined", "Lesser", "Greater", "Bulbous", "Sleek", "Mud-Dwelling", "Stone-Scale", "Iron-Hide", "Blind", "Glowing", "Fungal", "Armored", "Venomous", "Three-Eyed", "Jagged"];
    const nouns =["Guppy", "Bass", "Trout", "Snapper", "Carp", "Minnow", "Dace", "Loach", "Cisco", "Shiner", "Chub", "Darter", "Glider", "Lurker", "Grouper", "Pike"];
    const localNames =["Cave-Karp", "Fungal-Feeder", "Rock-Lurker", "Gloom-Swimmer", "Deep-Darter", "Stink-Fin", "Shadow-Tail", "Grotto-Glider", "Muck-Belly", "Void-Fin"];

    let fishName = "";
    const nameRoll = rng.next();
    if (nameRoll < 0.25) fishName = `${getRandomElement(colors, rng)} ${getRandomElement(nouns, rng)}`;
    else if (nameRoll < 0.5) fishName = `${getRandomElement(traits, rng)} ${getRandomElement(nouns, rng)}`;
    else if (nameRoll < 0.7) fishName = `${getRandomElement(colors, rng)} ${getRandomElement(traits, rng)} ${getRandomElement(nouns, rng)}`;
    else if (nameRoll < 0.85) fishName = `${getRandomElement(localNames, rng)} of ${getRandomElement(regions, rng)}`;
    else fishName = `${getRandomElement(regions, rng)} ${getRandomElement(nouns, rng)}`;

    if (bodyShape === 'needle') fishName = "Needle " + fishName;
    if (bodyShape === 'humpback') fishName = "Humpback " + fishName;
    if (hasBarbels && !fishName.includes("Whisker")) fishName = "Bearded " + fishName;
    if (patternType === 'skeleton') fishName = "Bone-Marked " + fishName;

    return {
        name: fishName,
        family: "Standard Fish",
        imageDataUrl: offscreenCanvas.toDataURL(),
        data: { palette: palette.name, bodyShape, tailType, dorsalType, pattern: patternType, eyeType, mouthType }
    };
}