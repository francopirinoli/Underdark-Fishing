/**
 * js/exploration/map_renderer.js
 * Takes the raw data from global_map and local_map and paints them to Canvas.
 */

import { TILE } from './local_map.js';

export function renderGlobalMap(canvas, globalMap, biomes, selectedNode, activeQuests =[]) {
    const ctx = canvas.getContext('2d');
    const tileW = canvas.width / globalMap.width;
    const tileH = canvas.height / globalMap.height;
    
    // Extract a Set of exact Node strings "x,y" that contain active quest targets
    const questNodes = new Set();
    activeQuests.forEach(q => {
        if (q.targetNode) questNodes.add(`${q.targetNode.x},${q.targetNode.y}`);
    });

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    // Pass 1: Backgrounds, Fog of War, & Quest Borders
    for (let y = 0; y < globalMap.height; y++) {
        for (let x = 0; x < globalMap.width; x++) {
            const node = globalMap.nodes[y][x];
            const isQuestTarget = questNodes.has(`${x},${y}`);
            
            if (node.isDiscovered) {
                ctx.fillStyle = biomes[node.biomeId].globalColor;
            } else {
                ctx.fillStyle = '#000000'; // Pure black for undiscovered space
            }
            
            ctx.fillRect(x * tileW, y * tileH, tileW, tileH);
            
            // Grid border
            if (isQuestTarget) {
                ctx.strokeStyle = 'rgba(251, 191, 36, 0.8)'; // Golden border for quests
                ctx.lineWidth = 2;
                ctx.strokeRect(x * tileW + 1, y * tileH + 1, tileW - 2, tileH - 2);
            } else {
                ctx.strokeStyle = 'rgba(2, 6, 23, 0.4)'; 
                ctx.lineWidth = 1;
                ctx.strokeRect(x * tileW, y * tileH, tileW, tileH);
            }
        }
    }
    
    // Pass 2: Exits, Settlements & Question Marks
    ctx.lineWidth = 2;
    for (let y = 0; y < globalMap.height; y++) {
        for (let x = 0; x < globalMap.width; x++) {
            const node = globalMap.nodes[y][x];
            const cx = x * tileW + tileW / 2;
            const cy = y * tileH + tileH / 2;
            const isQuestTarget = questNodes.has(`${x},${y}`);
            
            if (node.isDiscovered) {
                // Draw Exits
                ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
                ctx.beginPath();
                if (node.exits.n) { ctx.moveTo(cx, cy); ctx.lineTo(cx, cy - tileH / 2); }
                if (node.exits.s) { ctx.moveTo(cx, cy); ctx.lineTo(cx, cy + tileH / 2); }
                if (node.exits.w) { ctx.moveTo(cx, cy); ctx.lineTo(cx - tileW / 2, cy); }
                if (node.exits.e) { ctx.moveTo(cx, cy); ctx.lineTo(cx + tileW / 2, cy); }
                ctx.stroke();

                // Draw Settlement
                if (node.hasSettlement) {
                    ctx.fillStyle = '#FBBF24'; 
                    ctx.beginPath();
                    ctx.arc(cx, cy, tileW * 0.25, 0, Math.PI * 2);
                    ctx.fill();
                }

                // Discovered Quest Marker (Top Right Corner)
                if (isQuestTarget) {
                    ctx.fillStyle = '#FBBF24';
                    ctx.font = `bold ${tileH * 0.5}px "Courier New", monospace`;
                    ctx.textAlign = 'right';
                    ctx.textBaseline = 'top';
                    ctx.fillText('!', x * tileW + tileW - 4, y * tileH + 4);
                }
            } else {
                if (isQuestTarget) {
                    // Undiscovered Quest Marker (Centered Gold !)
                    ctx.fillStyle = '#FBBF24';
                    ctx.font = `bold ${tileH * 0.6}px "Courier New", monospace`; 
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('!', cx, cy + 2);
                } else {
                    // Standard Fog of War (?)
                    ctx.fillStyle = 'rgba(255, 255, 255, 0.1)';
                    ctx.font = `${tileH * 0.6}px "Courier New", monospace`; 
                    ctx.textAlign = 'center';
                    ctx.textBaseline = 'middle';
                    ctx.fillText('?', cx, cy + 2); 
                }
            }
        }
    }
    
    // Pass 3: Selected Node Highlight
    if (selectedNode) {
        ctx.strokeStyle = '#22D3EE'; 
        ctx.lineWidth = 3;
        ctx.strokeRect(selectedNode.x * tileW, selectedNode.y * tileH, tileW, tileH);
    }
}

// Helper: Converts hex color strings into RGB array for byte-level injection
function hexToRgb(hex) {
    const bigint = parseInt(hex.replace('#', ''), 16);
    return[(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
}

export function renderLocalMap(canvas, localMap, biome) {
    const ctx = canvas.getContext('2d');
    const w = localMap.width;
    const h = localMap.height;
    
    if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
    }

    const imgData = ctx.createImageData(w, h);
    const data = imgData.data;
    
    const pal = biome.palette;
    const colors = {
        [TILE.WATER]: hexToRgb(pal.water),[TILE.DEEP_WATER]: hexToRgb(pal.deepWater),
        [TILE.LAND]: hexToRgb(pal.land), [TILE.ROCK]: hexToRgb(pal.rock),[TILE.FLORA]: hexToRgb(pal.flora), [TILE.DOCK]: hexToRgb('#78350F')
    };
    const errColor =[255, 0, 255]; 

    let i = 0;
    for (let y = 0; y < h; y++) {
        for (let x = 0; x < w; x++) {
            const tileId = localMap.grid[y][x];
            const[r, g, b] = colors[tileId] || errColor;
            data[i++] = r; data[i++] = g; data[i++] = b; data[i++] = 255;
        }
    }
    ctx.putImageData(imgData, 0, 0);
}