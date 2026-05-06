/**
 * js/exploration/exploration_renderer.js
 * The Visual Camera and Lighting Engine for Local Map Exploration.
 * V5 - Optimized Lighting Engine (Downscaled lighting canvas for massive FPS boost).
 */

import { TILE } from './local_map.js';

export const ExplorationRenderer = {
    TILE_SIZE: 2, 
    VIEW_W: 800,
    VIEW_H: 600,

    container: null,
    mainCanvas: null,
    ctx: null,
    
    lightCanvas: null,
    lightCtx: null,
    lightScale: 0.5, // OPTIMIZATION: Process lighting at 50% resolution (75% fewer pixels)

    offscreenMap: null,
    boatImage: null,

    camX: 0,
    camY: 0,
    dockPositions:[], 

    init(containerElement, width = 800, height = 600) {
        this.container = containerElement;
        this.VIEW_W = width;
        this.VIEW_H = height;

        this.container.style.position = 'relative';
        this.container.innerHTML = ''; 

        this.mainCanvas = document.createElement('canvas');
        this.mainCanvas.width = this.VIEW_W;
        this.mainCanvas.height = this.VIEW_H;
        this.mainCanvas.style.backgroundColor = "#020617";
        this.mainCanvas.style.imageRendering = "pixelated";
        this.mainCanvas.style.display = "block";
        
        this.ctx = this.mainCanvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;

        this.lightCanvas = document.createElement('canvas');
        this.lightCanvas.width = this.VIEW_W * this.lightScale;
        this.lightCanvas.height = this.VIEW_H * this.lightScale;
        this.lightCtx = this.lightCanvas.getContext('2d');

        this.container.appendChild(this.mainCanvas);
        console.log("🎥 Exploration Renderer V5 Initialized (Optimized).");
    },

    loadBoat(topDownDataUrl) {
        this.boatImage = new Image();
        this.boatImage.src = topDownDataUrl;
    },

    buildMapCache(localMap, biome) {
        this.offscreenMap = document.createElement('canvas');
        this.offscreenMap.width = localMap.width * this.TILE_SIZE;
        this.offscreenMap.height = localMap.height * this.TILE_SIZE;
        const offCtx = this.offscreenMap.getContext('2d');
        offCtx.imageSmoothingEnabled = false;

        this.dockPositions =[]; 

        const pal = biome.palette;
        const hexToRgb = (hex) => {
            const bigint = parseInt(hex.replace('#', ''), 16);
            return[(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
        };

        const colors = {[TILE.WATER]: hexToRgb(pal.water),
            [TILE.DEEP_WATER]: hexToRgb(pal.deepWater),
            [TILE.LAND]: hexToRgb(pal.land),
            [TILE.ROCK]: hexToRgb(pal.rock),[TILE.FLORA]: hexToRgb(pal.flora),
            [TILE.DOCK]:[120, 53, 15] 
        };

        const imgData = offCtx.createImageData(this.offscreenMap.width, this.offscreenMap.height);
        const data = imgData.data;

        for (let y = 0; y < localMap.height; y++) {
            for (let x = 0; x < localMap.width; x++) {
                const tileId = localMap.grid[y][x];
                let [r, g, b] = colors[tileId] ||[255, 0, 255]; 

                if (tileId === TILE.DOCK) {
                    this.dockPositions.push({ x, y });
                }

                for (let dy = 0; dy < this.TILE_SIZE; dy++) {
                    for (let dx = 0; dx < this.TILE_SIZE; dx++) {
                        const px = (x * this.TILE_SIZE) + dx;
                        const py = (y * this.TILE_SIZE) + dy;
                        const i = (py * this.offscreenMap.width + px) * 4;

                        let finalR = r, finalG = g, finalB = b;

                        if (tileId === TILE.DOCK) {
                            if (dx === 0 || dy === 0) { finalR -= 20; finalG -= 10; finalB -= 5; } 
                            if (dx === 1 && dy === 1) { finalR += 20; finalG += 10; } 
                        }

                        data[i] = finalR;
                        data[i+1] = finalG;
                        data[i+2] = finalB;
                        data[i+3] = 255;
                    }
                }
            }
        }
        offCtx.putImageData(imgData, 0, 0);
    },

    screenToWorld(screenX, screenY) {
        return {
            x: (this.camX + screenX) / this.TILE_SIZE,
            y: (this.camY + screenY) / this.TILE_SIZE
        };
    },

    render(engine, lightRadius, castState = null, isFishingPhase = false, secondaryLights =[], chestPos = null) {
        if (!this.offscreenMap || !this.boatImage) return;

        const playerPxX = engine.x * this.TILE_SIZE;
        const playerPxY = engine.y * this.TILE_SIZE;

        // The UI sidebar takes up exactly 256px on the right.
        const VISIBLE_W = this.VIEW_W - 256; 

        // Center the camera on the boat within the visible space
        this.camX = playerPxX - (VISIBLE_W / 2);
        this.camY = playerPxY - (this.VIEW_H / 2);

        // Clamp camera so we don't draw outside the bounds of the generated map
        const maxCamX = Math.max(0, this.offscreenMap.width - VISIBLE_W);
        const maxCamY = Math.max(0, this.offscreenMap.height - this.VIEW_H);
        
        this.camX = Math.max(0, Math.min(this.camX, maxCamX));
        this.camY = Math.max(0, Math.min(this.camY, maxCamY));

        this.ctx.clearRect(0, 0, this.VIEW_W, this.VIEW_H);
        
        // Draw the map only within the visible area, leaving the right side empty for the UI
        this.ctx.drawImage(
            this.offscreenMap, 
            this.camX, this.camY, VISIBLE_W, this.VIEW_H, 
            0, 0, VISIBLE_W, this.VIEW_H
        );

        const screenBoatX = playerPxX - this.camX;
        const screenBoatY = playerPxY - this.camY;

        if (castState && !isFishingPhase) {
            this._drawCastingReticle(screenBoatX, screenBoatY, castState);
        }

        this.ctx.save();
        this.ctx.translate(screenBoatX, screenBoatY);
        this.ctx.rotate(engine.heading + (Math.PI / 2)); 
        
        const BOAT_VISUAL_SCALE = 0.4; 
        const bw = this.boatImage.width * BOAT_VISUAL_SCALE;
        const bh = this.boatImage.height * BOAT_VISUAL_SCALE;
        
        this.ctx.drawImage(this.boatImage, -bw / 2, -bh / 2, bw, bh);
        this.ctx.restore();

        const activeLights =[];
        activeLights.push({ x: screenBoatX, y: screenBoatY, radius: lightRadius });

        if (this.dockPositions.length > 0) {
            const firstDock = this.dockPositions[0];
            const dx = (firstDock.x * this.TILE_SIZE + (this.TILE_SIZE * 3)) - this.camX;
            const dy = (firstDock.y * this.TILE_SIZE + (this.TILE_SIZE * 3)) - this.camY;
            activeLights.push({ x: dx, y: dy, radius: 120, color: 'rgba(251, 191, 36, 0.4)' });
        }

        secondaryLights.forEach(L => {
            activeLights.push({
                x: (L.x * this.TILE_SIZE) - this.camX,
                y: (L.y * this.TILE_SIZE) - this.camY,
                radius: L.radius
            });
        });

        this._drawLighting(activeLights);

        // --- NEW: Draw Subtle Treasure Glint ---
        if (chestPos && !isFishingPhase) {
            const cx = (chestPos.x * this.TILE_SIZE) - this.camX;
            const cy = (chestPos.y * this.TILE_SIZE) - this.camY;
            
            // Using a high power of sine makes it stay at 0 mostly, then sharply spike to 1
            const time = Date.now() / 400; // Speed of the cycle
            const glint = Math.pow(Math.sin(time), 20); 
            
            if (glint > 0.1) {
                this.ctx.fillStyle = `rgba(255, 255, 255, ${glint})`;
                this.ctx.beginPath();
                this.ctx.arc(cx, cy, 1 + glint * 2, 0, Math.PI * 2);
                this.ctx.fill();
                
                // Add a tiny cross sparkle effect when it peaks
                if (glint > 0.6) {
                    this.ctx.fillStyle = `rgba(255, 255, 255, ${glint * 0.8})`;
                    this.ctx.fillRect(cx - 3, cy, 6, 1);
                    this.ctx.fillRect(cx, cy - 3, 1, 6);
                }
            }
        }
    },

    _drawCastingReticle(boatX, boatY, castState) {
        const { mouseX, mouseY, isCharging, chargePct, maxDist } = castState;
        
        let dx = mouseX - boatX;
        let dy = mouseY - boatY;
        const dist = Math.hypot(dx, dy);
        
        let aimedX = mouseX;
        let aimedY = mouseY;

        if (dist > maxDist) {
            aimedX = boatX + (dx / dist) * maxDist;
            aimedY = boatY + (dy / dist) * maxDist;
        }

        this.ctx.beginPath();
        this.ctx.setLineDash([4, 4]);
        this.ctx.moveTo(boatX, boatY);
        this.ctx.lineTo(aimedX, aimedY);
        this.ctx.strokeStyle = isCharging ? 'rgba(251, 191, 36, 0.5)' : 'rgba(34, 211, 238, 0.4)';
        this.ctx.lineWidth = 1.5;
        this.ctx.stroke();
        this.ctx.setLineDash([]); 

        let targetX = aimedX;
        let targetY = aimedY;

        if (isCharging) {
            const actualAimedDist = Math.min(dist, maxDist);
            const currentDist = actualAimedDist * chargePct;
            targetX = boatX + (dx / dist) * currentDist;
            targetY = boatY + (dy / dist) * currentDist;
            this.ctx.fillStyle = '#FBBF24'; 
        } else {
            this.ctx.fillStyle = '#22D3EE'; 
        }

        this.ctx.beginPath();
        this.ctx.arc(targetX, targetY, 4, 0, Math.PI * 2);
        this.ctx.fill();
        this.ctx.strokeStyle = '#FFF';
        this.ctx.lineWidth = 1;
        this.ctx.stroke();
    },

    lightCache: {}, // NEW: Cache pre-rendered light circles

    _getLightCanvas(radius) {
        const key = radius.toString();
        if (this.lightCache[key]) return this.lightCache[key];

        const c = document.createElement('canvas');
        c.width = radius * 2;
        c.height = radius * 2;
        const ctx = c.getContext('2d');

        const gradient = ctx.createRadialGradient(radius, radius, 0, radius, radius, radius);
        gradient.addColorStop(0, 'rgba(0, 0, 0, 1.0)');   
        gradient.addColorStop(0.4, 'rgba(0, 0, 0, 0.7)'); 
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0.0)');   
        
        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(radius, radius, radius, 0, Math.PI * 2);
        ctx.fill();

        this.lightCache[key] = c;
        return c;
    },

    _drawLighting(sources) {
        const lw = this.lightCanvas.width;
        const lh = this.lightCanvas.height;
        const ls = this.lightScale;

        // CRITICAL FIX: Clear the canvas first so the darkness doesn't stack every frame!
        this.lightCtx.clearRect(0, 0, lw, lh);

        this.lightCtx.globalCompositeOperation = 'source-over';
        this.lightCtx.fillStyle = 'rgba(2, 6, 23, 0.95)'; 
        this.lightCtx.fillRect(0, 0, lw, lh);

        this.lightCtx.globalCompositeOperation = 'destination-out';
        
        sources.forEach(src => {
            const r = src.radius * ls;
            const x = src.x * ls;
            const y = src.y * ls;

            if (r > 0 && isFinite(x) && isFinite(y) && isFinite(r)) {
                const img = this._getLightCanvas(r);
                this.lightCtx.drawImage(img, x - r, y - r);
            }
        });

        this.lightCtx.globalCompositeOperation = 'source-over';
        this.ctx.drawImage(this.lightCanvas, 0, 0, lw, lh, 0, 0, this.VIEW_W, this.VIEW_H);
    }
};