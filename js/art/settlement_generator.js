/**
 * js/art/settlement_generator.js
 * Generates panoramic, biome-specific underground settlement pixel art.
 * V3 - Fixed upside-down roofs, implemented structured floors for clean window 
 * placement, and refined architectural shapes.
 */

import { drawScaledRect } from '../util/utils.js';

const GRID_W = 320;
const GRID_H = 80;
const DISPLAY_SCALE = 4; // Renders out to a massive 768x320 image

// Biome-specific architectural palettes and styles
const SETTLEMENT_THEMES = {
    fungal: {
        bg: '#0F172A', bgWall: '#1E293B', bgLight: '#334155',
        water: '#064E3B', waterGleam: '#10B981',
        dock: '#451A03', dockTrim: '#78350F',
        buildBase: '#D97706', buildTrim: '#B45309', 
        roofBase: '#B91C1C', roofHigh: '#EF4444', // Red mushroom caps
        light: '#BEF264', arch: 'mushroom'
    },
    crystal: {
        bg: '#020617', bgWall: '#0F172A', bgLight: '#1E3A8A',
        water: '#082F49', waterGleam: '#0EA5E9',
        dock: '#1E293B', dockTrim: '#334155',
        buildBase: '#312E81', buildTrim: '#1E1B4B', 
        roofBase: '#2563EB', roofHigh: '#60A5FA', // Cyan crystal spires
        light: '#A5B4FC', arch: 'spire'
    },
    abyssal: {
        bg: '#000000', bgWall: '#09090B', bgLight: '#18181B',
        water: '#020617', waterGleam: '#312E81',
        dock: '#1C1917', dockTrim: '#292524',
        buildBase: '#18181B', buildTrim: '#000000', 
        roofBase: '#3F3F46', roofHigh: '#52525B', // Dark gothic stone
        light: '#A855F7', arch: 'gothic'
    },
    volcanic: {
        bg: '#1C1917', bgWall: '#450A0A', bgLight: '#7F1D1D',
        water: '#450A0A', waterGleam: '#DC2626',
        dock: '#292524', dockTrim: '#44403C',
        buildBase: '#27272A', buildTrim: '#09090B', 
        roofBase: '#451A03', roofHigh: '#78350F', // Iron & Ash
        light: '#F59E0B', arch: 'bunker'
    },
    frozen: {
        bg: '#020617', bgWall: '#0F172A', bgLight: '#1E293B',
        water: '#0F172A', waterGleam: '#38BDF8',
        dock: '#475569', dockTrim: '#64748B',
        buildBase: '#94A3B8', buildTrim: '#64748B', 
        roofBase: '#E2E8F0', roofHigh: '#FFFFFF', // Snow-capped
        light: '#93C5FD', arch: 'sloped'
    },
    hub: {
        // The Starter Town - Uses classic surface wood/stone architecture
        bg: '#0F172A', bgWall: '#1E293B', bgLight: '#334155',
        water: '#0F172A', waterGleam: '#3B82F6',
        dock: '#78350F', dockTrim: '#92400E',
        buildBase: '#A8A29E', buildTrim: '#57534E', 
        roofBase: '#7C2D12', roofHigh: '#9A3412', // Classic shingles
        light: '#FDE047', arch: 'classic'
    }
};

export function generateSettlementArt(options = {}) {
    const rng = options.rng || { 
        int: (min, max) => Math.floor(Math.random() * (max - min + 1)) + min, 
        chance: (p) => Math.random() < p, pick: (arr) => arr[Math.floor(Math.random() * arr.length)] 
    };

    const biomeId = options.biomeId || rng.pick(Object.keys(SETTLEMENT_THEMES));
    const t = SETTLEMENT_THEMES[biomeId] || SETTLEMENT_THEMES.hub;

    const canvas = document.createElement('canvas');
    canvas.width = GRID_W * DISPLAY_SCALE;
    canvas.height = GRID_H * DISPLAY_SCALE;
    const ctx = canvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    // Use Three Layers for Parallax depth
    const bgGrid = Array(GRID_H).fill(null).map(() => Array(GRID_W).fill(null)); 
    const mgGrid = Array(GRID_H).fill(null).map(() => Array(GRID_W).fill(null)); 
    const fgGrid = Array(GRID_H).fill(null).map(() => Array(GRID_W).fill(null)); 

    function setBg(x, y, color) { if (x >= 0 && x < GRID_W && y >= 0 && y < GRID_H) bgGrid[y][x] = color; }
    function setMg(x, y, color) { if (x >= 0 && x < GRID_W && y >= 0 && y < GRID_H) mgGrid[y][x] = color; }
    function setFg(x, y, color) { if (x >= 0 && x < GRID_W && y >= 0 && y < GRID_H) fgGrid[y][x] = color; }
    function overFg(x, y, color) { if (x >= 0 && x < GRID_W && y >= 0 && y < GRID_H && !fgGrid[y][x]) fgGrid[y][x] = color; }

    const horizonY = 60; 

    // --- 1. BACKGROUND CAVE WALLS & CEILING ---
    for (let y = 0; y < horizonY; y++) {
        for (let x = 0; x < GRID_W; x++) {
            let c = t.bgWall;
            if (y > 45 && rng.chance((y - 45) / 15)) c = t.bg; 
            if (y < 25 && rng.chance((25 - y) / 25)) c = t.bgLight; 
            setBg(x, y, c);
        }
    }

    // Draw ceiling stalactites
    for (let x = 0; x < GRID_W; x += rng.int(8, 20)) {
        const len = rng.int(5, 20);
        const w = rng.int(2, 5);
        for (let y = 0; y < len; y++) {
            const currentW = Math.max(1, w - Math.floor((y / len) * w));
            for (let dx = -currentW; dx <= currentW; dx++) {
                setBg(x + dx, y, t.bgLight);
                if (dx === currentW) setBg(x + dx, y, t.bg);
            }
        }
    }

    // --- 2. THE WATER ---
    for (let y = horizonY; y < GRID_H; y++) {
        for (let x = 0; x < GRID_W; x++) {
            let c = t.water;
            if (rng.chance(0.05 + (y - horizonY) * 0.02) && x % 3 === 0) c = t.waterGleam;
            setBg(x, y, c);
        }
    }

    // --- 3. ARCHITECTURE GENERATION (HELPER) ---
    const drawBuilding = (startX, startY, width, height, layerFn, isBackground = false) => {
        const bBase = isBackground ? t.bgLight : t.buildBase;
        const bTrim = isBackground ? t.bgWall : t.buildTrim;
        const rBase = isBackground ? t.bgWall : t.roofBase;
        const rHigh = isBackground ? t.bgLight : t.roofHigh;
        const winColor = isBackground ? t.bg : t.light;

        const doorX = startX + Math.floor(width / 2) - 4;
        const doorY = startY - 9;

        // 3a. Walls
        if (t.arch === 'mushroom') {
            const stemWidth = Math.floor(width * 0.6);
            const stemStart = startX + Math.floor((width - stemWidth) / 2);
            for (let y = startY - height; y <= startY; y++) {
                for (let x = stemStart; x < stemStart + stemWidth; x++) {
                    layerFn(x, y, x % 3 === 0 ? bTrim : bBase);
                }
            }
        } else if (t.arch === 'spire' || t.arch === 'gothic') {
            for (let y = startY - height; y <= startY; y++) {
                const taper = Math.floor((startY - y) * 0.15); 
                for (let x = startX + taper; x < startX + width - taper; x++) {
                    layerFn(x, y, (x+y)%4 === 0 ? bTrim : bBase);
                }
            }
        } else {
            // Classic, Sloped, Bunker
            for (let y = startY - height; y <= startY; y++) {
                for (let x = startX; x < startX + width; x++) {
                    layerFn(x, y, x % 2 === 0 ? bTrim : bBase);
                }
            }
        }

        // 3b. Roofs (FIXED: Drawn bottom-up so widest part sits on the wall)
        if (t.arch === 'mushroom') {
            const capY = startY - height + 2;
            for (let dy = 0; dy < 14; dy++) {
                // Sine curve for perfect round mushroom cap
                const w = Math.floor(width * 0.6 * Math.sin(((dy+2) / 16) * Math.PI));
                const ry = capY - dy;
                for (let x = -w; x <= w; x++) {
                    let c = rBase;
                    if (dy > 9) c = rHigh;
                    if (!isBackground && rng.chance(0.08)) c = t.light; // Spores
                    layerFn(startX + width/2 + x, ry, c);
                }
            }
        } 
        else if (t.arch === 'spire' || t.arch === 'gothic') {
            const numPeaks = rng.int(1, 3);
            for(let p = 0; p < numPeaks; p++) {
                const px = startX + Math.floor((width / (numPeaks+1)) * (p+1));
                const ph = rng.int(15, 25);
                for(let dy = 0; dy < ph; dy++) {
                    const pw = Math.max(0, 3 - Math.floor(dy/6)); // Shrinks as it goes up
                    const ry = startY - height - dy + 2; // Overlap wall slightly
                    for(let x = -pw; x <= pw; x++) {
                        layerFn(px + x, ry, x < 0 ? rHigh : rBase);
                    }
                }
            }
        } 
        else {
            // Classic Sloped Roof or Bunker Roof
            const roofH = t.arch === 'bunker' ? 4 : Math.floor(width / 2) + 2;
            for (let dy = 0; dy < roofH; dy++) {
                const rx = t.arch === 'bunker' ? startX - 2 : startX - 2 + dy; // Moves inward
                const rw = t.arch === 'bunker' ? width + 4 : Math.max(1, width + 4 - (dy * 2)); // Shrinks width
                const ry = startY - height - dy + 1; // Base sits exactly on the wall top
                for (let x = 0; x < rw; x++) {
                    layerFn(rx + x, ry, (x+dy)%3 === 0 ? rHigh : rBase);
                }
            }
        }

        // 3c. Doors and Windows (Structured Floors)
        if (!isBackground) {
            // Door
            for (let y = doorY; y <= startY; y++) {
                for (let x = doorX; x < doorX + 8; x++) setFg(x, y, '#020617'); 
            }
            
            // Windows
            const drawWindow = (wx, wy) => {
                for(let y = wy; y < wy + 5; y++) {
                    for(let x = wx; x < wx + 4; x++) {
                        setFg(x, y, winColor);
                        if (x === wx+1 || y === wy + 2) setFg(x, y, '#020617'); // Panes
                    }
                }
                // Light reflection on water below
                setBg(wx + 1, horizonY + rng.int(1, 6), winColor);
                setBg(wx + 2, horizonY + rng.int(1, 6), winColor);
            };

            const floorHeight = 14;
            const numFloors = Math.floor((height - 5) / floorHeight); // -5 to leave room for door

            for (let f = 1; f <= numFloors; f++) {
                const wy = startY - (f * floorHeight) + 4;
                const hasDoor = (f === 1); // Only check door overlap on the first floor
                
                const winCount = rng.chance(0.6) ? 1 : 2;
                
                if (winCount === 1) {
                    const wx = startX + Math.floor(width / 2) - 2;
                    // Check door overlap
                    if (!(hasDoor && wx > doorX - 5 && wx < doorX + 9)) {
                        drawWindow(wx, wy);
                    }
                } else {
                    const wx1 = startX + Math.floor(width * 0.25) - 2;
                    const wx2 = startX + Math.floor(width * 0.75) - 2;
                    if (!(hasDoor && wx1 > doorX - 5 && wx1 < doorX + 9)) drawWindow(wx1, wy);
                    if (!(hasDoor && wx2 > doorX - 5 && wx2 < doorX + 9)) drawWindow(wx2, wy);
                }
            }
        }
    };

    // --- 4. BACKGROUND BUILDINGS (Silhouette Layer) ---
    const numBgBuildings = rng.int(3, 5);
    let currentX = rng.int(-10, 10);
    for (let i = 0; i < numBgBuildings; i++) {
        const w = rng.int(20, 45);
        const h = rng.int(40, 60); // Taller than foreground
        drawBuilding(currentX, horizonY - 4, w, h, setMg, true);
        currentX += w + rng.int(-5, 15);
    }

    // --- 5. THE DOCK / FOUNDATION ---
    const dockTopY = horizonY - 4;
    const dockThickness = 5;

    for (let y = dockTopY; y < dockTopY + dockThickness; y++) {
        for (let x = 0; x < GRID_W; x++) {
            if (x > GRID_W - 30) continue; // Gap for boats to park
            let c = t.dock;
            if (y === dockTopY) c = t.dockTrim; 
            if (x % 6 === 0 && y > dockTopY) c = t.dockTrim; 
            setFg(x, y, c);
        }
    }

    // Pylons
    for (let x = 10; x < GRID_W - 35; x += rng.int(15, 25)) {
        for (let y = dockTopY + dockThickness; y < GRID_H; y++) {
            setFg(x, y, t.dockTrim);
            setFg(x + 1, y, t.dock);
            setFg(x + 2, y, t.dockTrim);
        }
    }

    // --- 6. FOREGROUND BUILDINGS ---
    const numFgBuildings = rng.int(3, 4);
    currentX = rng.int(5, 15);
    
    for (let i = 0; i < numFgBuildings; i++) {
        const w = rng.int(24, 38);
        const h = rng.int(25, 45);
        
        // Draw Stall / Market occasionally
        if (i === 1 || rng.chance(0.2)) {
            for (let y = dockTopY - 7; y <= dockTopY; y++) {
                for (let x = currentX; x < currentX + w; x++) setFg(x, y, t.dockTrim); 
            }
            for(let y = dockTopY - 22; y < dockTopY - 7; y++) {
                setFg(currentX + 2, y, t.dock); setFg(currentX + w - 3, y, t.dock); 
            }
            for (let y = dockTopY - 26; y <= dockTopY - 20; y++) {
                for (let x = currentX - 2; x < currentX + w + 2; x++) {
                    const color = Math.floor(x / 4) % 2 === 0 ? t.roofHigh : t.roofBase;
                    setFg(x, y, color);
                }
            }
            for (let y = dockTopY - 20; y <= dockTopY - 7; y++) {
                for (let x = currentX + 3; x < currentX + w - 3; x++) setMg(x, y, '#020617');
            }
        } else {
            drawBuilding(currentX, dockTopY - 1, w, h, setFg, false);
        }
        
        currentX += w + rng.int(2, 8);
    }

    // --- 7. PROPS (Crates, Barrels, Lanterns) ---
    for(let i=0; i < rng.int(3, 6); i++) {
        const cx = rng.int(10, GRID_W - 40);
        const isCrate = rng.chance(0.5);
        if (isCrate) {
            for(let y = dockTopY - 8; y <= dockTopY - 1; y++) {
                for(let x = cx; x < cx + 8; x++) {
                    if (!fgGrid[y][x]) setFg(x, y, (x+y)%2 === 0 ? t.dock : t.dockTrim);
                }
            }
        } else {
            for(let y = dockTopY - 15; y <= dockTopY - 1; y++) overFg(cx, y, t.dockTrim); // Post
            overFg(cx - 2, dockTopY - 16, t.dockTrim); overFg(cx + 2, dockTopY - 16, t.dockTrim); // Crossbar
            for(let y = dockTopY - 15; y <= dockTopY - 13; y++) {
                overFg(cx - 2, y, t.light); overFg(cx + 2, y, t.light); // Glow bulbs
            }
            setBg(cx - 2, horizonY + rng.int(1, 4), t.light);
            setBg(cx + 2, horizonY + rng.int(1, 4), t.light);
        }
    }

    // --- 8. OUTLINE PASS & FINAL RENDER ---
    const outlineGrid = Array(GRID_H).fill(null).map(() => Array(GRID_W).fill(null));
    for (let y = 0; y < GRID_H; y++) {
        for (let x = 0; x < GRID_W; x++) {
            if (fgGrid[y][x] === null) {
                if ((y > 0 && fgGrid[y - 1][x] !== null && fgGrid[y - 1][x] !== t.light) || 
                    (y < GRID_H - 1 && fgGrid[y + 1][x] !== null && fgGrid[y + 1][x] !== t.light) || 
                    (x > 0 && fgGrid[y][x - 1] !== null && fgGrid[y][x - 1] !== t.light) || 
                    (x < GRID_W - 1 && fgGrid[y][x + 1] !== null && fgGrid[y][x + 1] !== t.light)) {
                    outlineGrid[y][x] = '#020617'; 
                }
            }
        }
    }

    for (let y = 0; y < GRID_H; y++) {
        for (let x = 0; x < GRID_W; x++) {
            let c = bgGrid[y][x]; 
            if (mgGrid[y][x]) c = mgGrid[y][x]; 
            if (outlineGrid[y][x]) c = outlineGrid[y][x]; 
            if (fgGrid[y][x]) c = fgGrid[y][x]; 
            
            if (c) drawScaledRect(ctx, x, y, 1, 1, c, DISPLAY_SCALE);
        }
    }

    return {
        imageDataUrl: canvas.toDataURL(),
        data: { biomeId, architecture: t.arch }
    };
}