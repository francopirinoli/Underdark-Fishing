/**
 * js/exploration/local_map.js
 * Generates the massive 512x512 local tile grid.
 * Uses Warped Distance Fields and Heavy Erosion to create highly organic, 
 * varying lakes with winding paths, dead-ends, and accurate depth mapping.
 */

import { createRng } from '../util/rng.js';
import { createNoise2D } from './noise.js';

export const LOCAL_MAP_SIZE = 512; 

export const TILE = {
    WATER: 0,
    DEEP_WATER: 1,
    LAND: 2,
    ROCK: 3,
    FLORA: 4,
    DOCK: 5
};

// Math helper: Shortest distance from a point (px,py) to a line segment (x1,y1)-(x2,y2)
function distToSegment(px, py, x1, y1, x2, y2) {
    const l2 = (x1 - x2)**2 + (y1 - y2)**2;
    if (l2 === 0) return Math.hypot(px - x1, py - y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    return Math.hypot(px - (x1 + t * (x2 - x1)), py - (y1 + t * (y2 - y1)));
}

export function generateLocalMap(globalNode, globalSeed) {
    const nodeSeed = (globalSeed + (globalNode.x * 7919) + (globalNode.y * 104729)) >>> 0;
    const rng = createRng(nodeSeed);
    
    const warpNoise = createNoise2D(nodeSeed);
    const elevNoise = createNoise2D(nodeSeed ^ 0x12345678);
    const detailNoise = createNoise2D(nodeSeed ^ 0xDEADBEEF);

    const grid = Array(LOCAL_MAP_SIZE).fill(null).map(() => Array(LOCAL_MAP_SIZE).fill(TILE.LAND));
    
    const cx = LOCAL_MAP_SIZE / 2;
    const cy = LOCAL_MAP_SIZE / 2;

    // --- LAKE ARCHETYPES ---
    const lakeType = rng.pick(['open_water', 'winding_caves', 'flooded_archipelago', 'fractured_chasms']);
    
    let centralRadius = 60;   
    let warpAmp = 60;         // Distortion of the coordinate grid
    let erosionAmp = 50;      // How wildly the width of the caves vary
    let pathWobble = 80;      // How much the paths meander left/right

    if (lakeType === 'open_water') {
        centralRadius = 140;
        warpAmp = 40;
        erosionAmp = 70;
        pathWobble = 40;
    } else if (lakeType === 'winding_caves') {
        centralRadius = 15;   // Barely a central lake, mostly just the paths
        warpAmp = 90;        
        erosionAmp = 35;
        pathWobble = 140;     // Extreme meandering
    } else if (lakeType === 'flooded_archipelago') {
        centralRadius = 110;
        erosionAmp = 80;      // High erosion punches holes (islands) in the water
        pathWobble = 60;
    } else if (lakeType === 'fractured_chasms') {
        centralRadius = 30;
        warpAmp = 20;         // Less coordinate warp to keep edges jagged and sharp
        erosionAmp = 60;
        pathWobble = 30;
    }

    // --- 1. GENERATE SKELETON PATHS ---
    const paths =[];
    const segments = 6; 
    
    // Generates a meandering river spline from A to B
    function buildWindingPath(startX, startY, endX, endY, wobbleAmount) {
        const pts =[];
        // Calculate perpendicular vector for wobbling
        let dx = endX - startX;
        let dy = endY - startY;
        const len = Math.hypot(dx, dy);
        if (len > 0) { dx /= len; dy /= len; }
        const perpX = -dy;
        const perpY = dx;

        for (let i = 0; i <= segments; i++) {
            const t = i / segments;
            // Envelope ensures wobble is 0 at the start and end points so they connect perfectly
            const envelope = Math.sin(t * Math.PI); 
            // -0.5 to 0.5 noise
            const noiseVal = warpNoise.fbm(t * 3, startX * 0.01, 2) - 0.5; 
            
            let px = startX + (endX - startX) * t + (perpX * noiseVal * wobbleAmount * envelope);
            let py = startY + (endY - startY) * t + (perpY * noiseVal * wobbleAmount * envelope);
            
            pts.push({ x: px, y: py });
        }
        return pts;
    }

    // Connect Active Exits
    if (globalNode.exits.n) paths.push(buildWindingPath(cx, cy, cx, 0, pathWobble));
    if (globalNode.exits.s) paths.push(buildWindingPath(cx, cy, cx, LOCAL_MAP_SIZE, pathWobble));
    if (globalNode.exits.e) paths.push(buildWindingPath(cx, cy, LOCAL_MAP_SIZE, cy, pathWobble));
    if (globalNode.exits.w) paths.push(buildWindingPath(cx, cy, 0, cy, pathWobble));

    // Add "Blind" dead-end branches to break the cross shape
    const numBlind = rng.int(2, 4);
    for (let i = 0; i < numBlind; i++) {
        const angle = rng.float(0, Math.PI * 2);
        const dist = rng.int(100, 220); // They stop before hitting the wall
        paths.push(buildWindingPath(cx, cy, cx + Math.cos(angle) * dist, cy + Math.sin(angle) * dist, pathWobble));
    }

    // --- 2. EVALUATE DISTANCE FIELD & EROSION ---
    for (let y = 0; y < LOCAL_MAP_SIZE; y++) {
        for (let x = 0; x < LOCAL_MAP_SIZE; x++) {
            
            // Domain Warping (shifts the coordinates slightly to make everything wavy)
            let warpX = (warpNoise.fbm(x * 0.015, y * 0.015, 3) - 0.5) * warpAmp;
            let warpY = (warpNoise.fbm(x * 0.015 + 1000, y * 0.015 + 1000, 3) - 0.5) * warpAmp;

            // Fade the warp out near the edges to guarantee the exit channels align with the grid perfectly
            const edgeDist = Math.min(x, y, LOCAL_MAP_SIZE - 1 - x, LOCAL_MAP_SIZE - 1 - y);
            const edgeFade = Math.min(1, Math.max(0, edgeDist / 40.0));
            
            const wx = x + (warpX * edgeFade);
            const wy = y + (warpY * edgeFade);

            // Distance to Central Lake
            let minDist = Math.max(0, Math.hypot(wx - cx, wy - cy) - centralRadius);
            
            // Distance to Path Network
            for (const path of paths) {
                for (let i = 0; i < path.length - 1; i++) {
                    const d = distToSegment(wx, wy, path[i].x, path[i].y, path[i+1].x, path[i+1].y);
                    if (d < minDist) minDist = d;
                }
            }

            // Erosion Noise (Subtracts from the distance, creating wide areas and narrow choke points)
            let erosion;
            if (lakeType === 'fractured_chasms') {
                // Ridged noise creates sharp, jagged cuts
                erosion = Math.abs(elevNoise.fbm(x * 0.015, y * 0.015, 4) - 0.5) * 2.0 * erosionAmp; 
            } else {
                erosion = elevNoise.fbm(x * 0.012, y * 0.012, 4) * erosionAmp;
            }

            let elevation = minDist - erosion;

            // Archipelago islands
            if (lakeType === 'flooded_archipelago') {
                elevation += Math.pow(detailNoise.fbm(x * 0.03, y * 0.03, 4), 2) * 50;
            }

            // Force Exits Open (Guarantees the boat can leave the map)
            let exitMask = 999;
            if (globalNode.exits.n) exitMask = Math.min(exitMask, Math.hypot(x - cx, y - 0));
            if (globalNode.exits.s) exitMask = Math.min(exitMask, Math.hypot(x - cx, y - LOCAL_MAP_SIZE));
            if (globalNode.exits.w) exitMask = Math.min(exitMask, Math.hypot(x - 0, y - cy));
            if (globalNode.exits.e) exitMask = Math.min(exitMask, Math.hypot(x - LOCAL_MAP_SIZE, y - cy));
            
            if (exitMask < 26) {
                // Smoothly force the elevation into Deep Water at the exact exit point
                elevation = Math.min(elevation, exitMask - 26); 
            }

            // --- 3. THRESHOLDING (Tile Assignment) ---
            const dVal = detailNoise.fbm(x * 0.05, y * 0.05, 3); // High frequency detail

            // Deep water forms the core of the lake/rivers
            if (elevation < -12) {
                grid[y][x] = TILE.DEEP_WATER;
            } 
            // Shallow water lines the shores
            else if (elevation < 16) {
                grid[y][x] = TILE.WATER;
                
                // Flora (Moss) likes to grow in SHALLOW water near the shores
                if (dVal > 0.65 && dVal <= 0.85) {
                    grid[y][x] = TILE.FLORA;
                }
                // Small jagged rocks piercing the shallow water
                else if (dVal > 0.88) {
                    grid[y][x] = TILE.ROCK;
                }
            } 
            // Land borders the water
            else {
                grid[y][x] = TILE.LAND;
                // Add jagged rocks slightly inland
                if (dVal > 0.6 || elevation > 35) {
                    grid[y][x] = TILE.ROCK;
                }
            }
        }
    }

    // --- 4. PLACE SETTLEMENT DOCK ---
    let dockPlaced = false;
    let dockPos = { x: cx, y: cy };

    if (globalNode.hasSettlement) {
        let searchRadius = 15;
        // Spiral outward looking for shallow water near land
        while (!dockPlaced && searchRadius < LOCAL_MAP_SIZE / 2 - 20) {
            for (let a = 0; a < Math.PI * 2; a += 0.05) {
                const sx = Math.floor(cx + Math.cos(a) * searchRadius);
                const sy = Math.floor(cy + Math.sin(a) * searchRadius);
                
                if (grid[sy][sx] === TILE.WATER) {
                    if (grid[sy-3][sx] === TILE.LAND || grid[sy+3][sx] === TILE.LAND || 
                        grid[sy][sx-3] === TILE.LAND || grid[sy][sx+3] === TILE.LAND) {
                        
                        // Build a large 6x6 wooden pier
                        for(let py = -3; py <= 2; py++) {
                            for(let px = -3; px <= 2; px++) {
                                grid[sy+py][sx+px] = TILE.DOCK;
                            }
                        }
                        dockPos = { x: sx, y: sy };
                        dockPlaced = true;
                        break;
                    }
                }
            }
            searchRadius += 3;
        }
    }

    return { grid, width: LOCAL_MAP_SIZE, height: LOCAL_MAP_SIZE, dockPlaced, dockPos, lakeType };
}