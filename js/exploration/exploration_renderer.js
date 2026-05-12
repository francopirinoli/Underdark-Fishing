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

    // --- NEW: Atmospherics & Hazard State ---
    hazardParticles:[],
    wakeParticles:[],     // NEW
    ambientRipples:[],    // NEW
    currentBiome: null,    // NEW: Store the biome for colored effects
    currentWeather: null,

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
        this.currentBiome = biome; // Save biome for particles
        
        // --- NEW: REUSE OFFSCREEN CANVAS TO PREVENT MEMORY LEAKS ---
        if (!this.offscreenMap) {
            this.offscreenMap = document.createElement('canvas');
        }
        
        // Ensure dimensions match
        if (this.offscreenMap.width !== localMap.width * this.TILE_SIZE || 
            this.offscreenMap.height !== localMap.height * this.TILE_SIZE) {
            this.offscreenMap.width = localMap.width * this.TILE_SIZE;
            this.offscreenMap.height = localMap.height * this.TILE_SIZE;
        }

        const offCtx = this.offscreenMap.getContext('2d', { willReadFrequently: true });
        offCtx.imageSmoothingEnabled = false;

        this.dockPositions = []; 
        this.ambientRipples =[]; // Reset ripples for new map

        const pal = biome.palette;
        const hexToRgb = (hex) => {
            const bigint = parseInt(hex.replace('#', ''), 16);
            return[(bigint >> 16) & 255, (bigint >> 8) & 255, bigint & 255];
        };

        const colors = {
            [TILE.WATER]: hexToRgb(pal.water),[TILE.DEEP_WATER]: hexToRgb(pal.deepWater),
            [TILE.LAND]: hexToRgb(pal.land),
            [TILE.ROCK]: hexToRgb(pal.rock),
            [TILE.FLORA]: hexToRgb(pal.flora),
            [TILE.DOCK]: [120, 53, 15] 
        };

        const imgData = offCtx.createImageData(this.offscreenMap.width, this.offscreenMap.height);
        const data = imgData.data;

        for (let y = 0; y < localMap.height; y++) {
            for (let x = 0; x < localMap.width; x++) {
                const tileId = localMap.grid[y][x];
                let [r, g, b] = colors[tileId] || [255, 0, 255]; 

                if (tileId === TILE.DOCK) {
                    this.dockPositions.push({ x, y });
                }
                
                // Scatter Ambient Ripples
                if ((tileId === TILE.WATER || tileId === TILE.DEEP_WATER) && Math.random() < 0.02) {
                    this.ambientRipples.push({
                        wx: x * this.TILE_SIZE + Math.random() * this.TILE_SIZE,
                        wy: y * this.TILE_SIZE + Math.random() * this.TILE_SIZE,
                        phase: Math.random() * Math.PI * 2,
                        speed: Math.random() * 2 + 1,
                        width: Math.random() * 4 + 2
                    });
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

    initHazards(biomeId, weather) {
        this.currentBiomeId = biomeId;
        this.currentWeather = weather;
        this.hazardParticles =[];

        // Base Biome Particles
        if (biomeId === 'volcanic') {
            for (let i = 0; i < 60; i++) {
                this.hazardParticles.push({
                    x: Math.random() * this.VIEW_W, y: Math.random() * this.VIEW_H,
                    vx: (Math.random() - 0.5) * 20, vy: -(Math.random() * 50 + 20),
                    size: Math.random() * 2 + 1, color: Math.random() > 0.5 ? '#F59E0B' : '#EF4444' // Embers
                });
            }
        } else if (biomeId === 'frozen') {
            for (let i = 0; i < 100; i++) {
                this.hazardParticles.push({
                    x: Math.random() * this.VIEW_W, y: Math.random() * this.VIEW_H,
                    vx: Math.random() * 30 + 10, vy: Math.random() * 50 + 20,
                    size: Math.random() * 2 + 1, color: Math.random() > 0.3 ? '#FFFFFF' : '#93C5FD' // Snow
                });
            }
        }

        // Dynamic Weather Particles
        if (weather === 'spores') {
            for (let i = 0; i < 50; i++) {
                this.hazardParticles.push({
                    x: Math.random() * this.VIEW_W, y: Math.random() * this.VIEW_H,
                    vx: (Math.random() - 0.5) * 15, vy: Math.random() * 20 + 5,
                    size: Math.random() * 3 + 2, color: Math.random() > 0.5 ? '#4ADE80' : '#86EFAC' // Large spores
                });
            }
        } else if (weather === 'shatter') {
            for (let i = 0; i < 30; i++) {
                this.hazardParticles.push({
                    x: Math.random() * this.VIEW_W, y: Math.random() * this.VIEW_H,
                    vx: 0, vy: Math.random() * 300 + 200, // Very fast falling
                    size: Math.random() * 15 + 10, color: '#22D3EE' // Crystal shards (length)
                });
            }
        }
    },

    screenToWorld(screenX, screenY) {
        return {
            x: (this.camX + screenX) / this.TILE_SIZE,
            y: (this.camY + screenY) / this.TILE_SIZE
        };
    },

    _renderHazards(dt) {
        // Fungal Spore Tint
        if (this.currentWeather === 'spores') {
            this.ctx.fillStyle = 'rgba(22, 101, 52, 0.15)'; 
            this.ctx.fillRect(0, 0, this.VIEW_W, this.VIEW_H);
        }

        // Particles
        this.hazardParticles.forEach(p => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;

            // Screen wrap
            if (p.x < 0) p.x = this.VIEW_W;
            if (p.x > this.VIEW_W) p.x = 0;
            if (p.y < 0) p.y = this.VIEW_H;
            if (p.y > this.VIEW_H) p.y = 0;

            this.ctx.fillStyle = p.color;
            if (this.currentWeather === 'shatter') {
                // Draw shards as vertical lines
                this.ctx.fillRect(p.x, p.y, 2, p.size); 
            } else {
                // Draw embers, snow, and spores as squares
                this.ctx.fillRect(p.x, p.y, p.size, p.size);
            }
        });

// Abyssal Whirlpool (Anchored to the exact center of the map!)
        if (this.currentWeather === 'whirlpool') {
            const mapCenterPx = (512 / 2) * this.TILE_SIZE; // LOCAL_MAP_SIZE = 512
            const screenCX = mapCenterPx - this.camX;
            const screenCY = mapCenterPx - this.camY;

            // Only draw if it's currently on screen
            if (screenCX > -100 && screenCX < this.VIEW_W + 100 && screenCY > -100 && screenCY < this.VIEW_H + 100) {
                const time = Date.now() / 1000;
                const RADIUS = 70; // SCALED DOWN: Was 120
                
                // 1. The Dark Void (Event Horizon)
                const voidGrad = this.ctx.createRadialGradient(screenCX, screenCY, 0, screenCX, screenCY, RADIUS);
                voidGrad.addColorStop(0, '#000000');
                voidGrad.addColorStop(0.4, 'rgba(15, 23, 42, 0.9)'); 
                voidGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                this.ctx.fillStyle = voidGrad;
                this.ctx.fillRect(screenCX - RADIUS, screenCY - RADIUS, RADIUS * 2, RADIUS * 2);

                // 2. Rotating Spiral Arms
                this.ctx.lineWidth = 3;
                for (let i = 0; i < 6; i++) {
                    this.ctx.beginPath();
                    const startAngle = (i * Math.PI / 3) + (time * 3.5); 
                    
                    for (let r = 5; r < RADIUS; r += 4) {
                        const angle = startAngle - (r * 0.045); // Tighter twist
                        const px = screenCX + Math.cos(angle) * r;
                        const py = screenCY + Math.sin(angle) * r;
                        if (r === 5) this.ctx.moveTo(px, py);
                        else this.ctx.lineTo(px, py);
                    }
                    
                    const armGrad = this.ctx.createRadialGradient(screenCX, screenCY, 10, screenCX, screenCY, RADIUS);
                    armGrad.addColorStop(0, 'rgba(168, 85, 247, 0.9)'); 
                    armGrad.addColorStop(0.5, 'rgba(34, 211, 238, 0.5)'); 
                    armGrad.addColorStop(1, 'rgba(0, 0, 0, 0)');
                    
                    this.ctx.strokeStyle = armGrad;
                    this.ctx.stroke();
                }

                // 3. Debris / Particles getting sucked in
                this.ctx.fillStyle = '#E2E8F0';
                for(let i = 0; i < 15; i++) {
                    const angle = (i * Math.PI * 2 / 15) + (time * 4);
                    const r = RADIUS - ((time * 50 + i * 25) % RADIUS); 
                    const px = screenCX + Math.cos(angle - (r * 0.045)) * r;
                    const py = screenCY + Math.sin(angle - (r * 0.045)) * r;
                    
                    this.ctx.globalAlpha = Math.max(0, r / RADIUS); 
                    this.ctx.fillRect(px, py, 2, 2);
                }
                this.ctx.globalAlpha = 1.0;
            }
        }
    },

    _renderAtmospherics(engine, dt) {
        if (!this.currentBiome) return;
        
        const time = Date.now() / 1000;
        const gleamColor = this.currentBiome.palette.waterGleam;

        // --- 1. AMBIENT RIPPLES ---
        this.ctx.fillStyle = gleamColor;
        this.ambientRipples.forEach(r => {
            const screenX = r.wx - this.camX;
            const screenY = r.wy - this.camY;

            // Only draw if visible on screen
            if (screenX > 0 && screenX < this.VIEW_W && screenY > 0 && screenY < this.VIEW_H) {
                // Sine wave pulsing logic (0.0 to 1.0)
                const pulse = (Math.sin(time * r.speed + r.phase) + 1) / 2;
                if (pulse > 0.2) {
                    this.ctx.globalAlpha = pulse * 0.5; // Max 50% opacity so it's subtle
                    const currentWidth = r.width * pulse;
                    this.ctx.fillRect(screenX - currentWidth/2, screenY, currentWidth, 1);
                }
            }
        });
        this.ctx.globalAlpha = 1.0; // Reset alpha

        // --- 2. BOAT WAKE ---
        // Spawn new particles if moving fast enough
        const speed = Math.abs(engine.velocity);
        if (speed > 10) {
            // Calculate stern (back) of the boat
            const sternDistance = 12; // pixels from center to back
            const sternX = (engine.x * this.TILE_SIZE) - Math.cos(engine.heading) * sternDistance;
            const sternY = (engine.y * this.TILE_SIZE) - Math.sin(engine.heading) * sternDistance;
            
            // Spawn 1-2 particles per frame
            for(let i = 0; i < (speed > 40 ? 2 : 1); i++) {
                // Spread perpendicular to movement
                const spreadAngle = engine.heading + (Math.PI / 2);
                const spreadDist = (Math.random() - 0.5) * 8; 

                this.wakeParticles.push({
                    x: sternX + Math.cos(spreadAngle) * spreadDist,
                    y: sternY + Math.sin(spreadAngle) * spreadDist,
                    vx: -Math.cos(engine.heading) * (speed * 0.1) + (Math.random() - 0.5) * 5,
                    vy: -Math.sin(engine.heading) * (speed * 0.1) + (Math.random() - 0.5) * 5,
                    life: 1.0,
                    maxLife: 1.0
                });
            }
        }

        // Update and draw wake particles
        for (let i = this.wakeParticles.length - 1; i >= 0; i--) {
            const p = this.wakeParticles[i];
            p.life -= dt * 1.5; // Decay rate
            
            if (p.life <= 0) {
                this.wakeParticles.splice(i, 1);
                continue;
            }

            p.x += p.vx * dt;
            p.y += p.vy * dt;

            const screenX = p.x - this.camX;
            const screenY = p.y - this.camY;

            if (screenX > 0 && screenX < this.VIEW_W && screenY > 0 && screenY < this.VIEW_H) {
                const size = Math.max(1, 3 * (p.life / p.maxLife));
                this.ctx.fillStyle = gleamColor;
                this.ctx.globalAlpha = p.life * 0.6; // Fade out
                this.ctx.fillRect(screenX, screenY, size, size);
            }
        }
        this.ctx.globalAlpha = 1.0; // Reset alpha
    },

    render(engine, lightRadius, dt, castState = null, isFishingPhase = false, secondaryLights =[], chestPos = null, npcBoats =[]) {
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
        
        // Draw the map only within the visible area
        this.ctx.drawImage(
            this.offscreenMap, 
            this.camX, this.camY, VISIBLE_W, this.VIEW_H, 
            0, 0, VISIBLE_W, this.VIEW_H
        );

        // --- NEW: Draw water ripples and boat wake ---
        if (!isFishingPhase) {
            this._renderAtmospherics(engine, dt);
        }

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

// --- UPDATED: DRAW ALL NPC BOATS (Fishermen & Tournament Competitors) ---
        if (npcBoats && npcBoats.length > 0 && !isFishingPhase) {
            npcBoats.forEach(npc => {
                const fx = (npc.x * this.TILE_SIZE) - this.camX;
                const fy = (npc.y * this.TILE_SIZE) - this.camY;
                
                // Uniquely offset their bobbing so they don't all bounce in perfect sync
                const bob = Math.sin((Date.now() + npc.bobOffset) / 400) * 2;
                const rot = Math.sin((Date.now() + npc.bobOffset) / 800) * 0.05;
                
                const fbw = npc.img.width * BOAT_VISUAL_SCALE;
                const fbh = npc.img.height * BOAT_VISUAL_SCALE;

                this.ctx.save();
                this.ctx.translate(fx, fy + bob);
                this.ctx.rotate(rot);
                this.ctx.drawImage(npc.img, -fbw / 2, -fbh / 2, fbw, fbh);
                
                // --- NEW: Draw Golden Tournament Flags ---
                if (npc.isTournament) {
                    this.ctx.fillStyle = '#F59E0B'; // Gold flag
                    this.ctx.fillRect(-2, -fbh/2 - 12, 2, 12); // Flagpole
                    this.ctx.beginPath();
                    this.ctx.moveTo(0, -fbh/2 - 12);
                    this.ctx.lineTo(12, -fbh/2 - 8);
                    this.ctx.lineTo(0, -fbh/2 - 4);
                    this.ctx.fill();
                }
                
                this.ctx.restore();

                // Tournament boats get a Cyan glow, Fishermen get a Warm glow
                const glowColor = npc.isTournament ? 'rgba(34, 211, 238, 0.4)' : 'rgba(251, 191, 36, 0.4)';
                activeLights.push({ x: fx, y: fy + bob, radius: 100, color: glowColor });
            });
        }

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

        // --- NEW: Draw Hazards BEFORE Lighting (so they sit in the darkness) ---
        if (!isFishingPhase) {
            this._renderHazards(dt);
        }

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
        this.ctx.save(); // <-- NEW: Lock the canvas state

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

        this.ctx.restore(); // <-- NEW: Restore the canvas state so colors don't leak!
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