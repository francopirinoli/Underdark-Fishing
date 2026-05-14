/**
 * js/fishing/fishing_renderer.js
 * The Visual and Audio Feedback bridge for the Fishing Minigame.
 * V5 - Optimized Rendering (Precomputed gradients, flora matrices, and offscreen filter caching).
 */

import { SFX } from '../audio/sfx_generator.js';
import { getRarityColor } from '../util/utils.js';

const TILE = { WATER: 0, DEEP_WATER: 1, LAND: 2, ROCK: 3, FLORA: 4, DOCK: 5 };

export const FishingRenderer = {
    container: null,
    elements: {},
    
    canvas: null,
    ctx: null,
    CW: 260,
    CH: 340,

    // Caches
    lureImg: null,
    fishImgNormal: null,
    fishImgBite: null,
    fishImgTired: null,
    bgGradientCanvas: null,
    floraCanvas: null,

    // Visual State
    lastPhase: 'IDLE',
    lastAiState: 'HOLD',
    reelAudioTimer: 0,
    particles:[],
    biomePal: null,
    tileId: 0,

    init(containerElement) {
        this.container = containerElement;
        
        // (Keep your exact same CSS injection block here, omitting for brevity)
        const style = document.createElement('style');
        style.textContent = `
            .fishing-modal {
                position: fixed; inset: 0; background: rgba(2, 6, 23, 0.85); backdrop-filter: blur(4px);
                display: flex; align-items: center; justify-content: center; z-index: 1000;
                font-family: 'Courier New', monospace; color: #E2E8F0;
            }
            .fishing-board {
                background: #0F172A; border: 2px solid #3B82F6; border-radius: 0.5rem;
                padding: 1.5rem; width: 640px; max-width: 95vw;
                box-shadow: 0 0 40px rgba(59, 130, 246, 0.2);
                position: relative; transition: border-color 0.2s, box-shadow 0.2s;
            }
            .fishing-board.danger { border-color: #EF4444; box-shadow: 0 0 50px rgba(239, 68, 68, 0.4); }
            .fishing-board.thrashing { border-color: #DC2626; box-shadow: inset 0 0 30px rgba(220, 38, 38, 0.5); }
            
            .fight-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 1rem; border-bottom: 1px solid #1E293B; padding-bottom: 0.5rem; }
            .fight-header h2 { margin: 0; color: #22D3EE; font-size: 1.2rem; }
            .escape-timer { color: #FCA5A5; font-weight: bold; font-size: 1.1rem; display: none; }

            .fishing-layout { display: grid; grid-template-columns: 260px 1fr; gap: 1.5rem; }
            
            .water-cam {
                background: #020617; border: 2px solid #1E293B; border-radius: 0.5rem;
                position: relative; overflow: hidden; height: 340px;
            }
            .water-cam canvas { display: block; width: 100%; height: 100%; image-rendering: pixelated; }
            
            .bite-alert {
                position: absolute; inset: 0; background: rgba(220, 38, 38, 0.4);
                display: flex; flex-direction: column; align-items: center; justify-content: center;
                font-weight: bold; font-size: 2rem; color: #FFF; text-shadow: 0 0 10px #DC2626;
                opacity: 0; pointer-events: none; transition: opacity 0.1s;
            }
            .hook-timer-bar { width: 80%; height: 8px; background: #000; border: 1px solid #FFF; margin-top: 1rem; }
            .hook-timer-fill { height: 100%; background: #22D3EE; width: 100%; }
            
            .bars-container { display: flex; flex-direction: column; gap: 0.8rem; justify-content: center;}
            .bar-row { display: flex; flex-direction: column; gap: 0.2rem; }
            .bar-labels { display: flex; justify-content: space-between; font-size: 0.85rem; text-transform: uppercase; font-weight: bold; }
            
            .bar-track { width: 100%; height: 16px; background: #020617; border: 1px solid #1E293B; border-radius: 4px; overflow: hidden; position: relative; }
            .bar-fill { height: 100%; transition: width 0.1s linear, background-color 0.2s; }
            
            /* Reel Power Overlay Styling */
            #track-reel-power { position: relative; }
            #bar-reel-power { position: absolute; left: 0; z-index: 1; opacity: 0.8; }
            #fm-sweet-spot { 
                position: absolute; height: 100%; top: 0; z-index: 2;
                background: rgba(251, 191, 36, 0.4); 
                border-left: 2px solid #FBBF24; border-right: 2px solid #FBBF24; 
                box-sizing: border-box; pointer-events: none; 
                transition: left 0.1s ease-out, width 0.1s ease-out; 
            }
            
            #bar-tension { background: #3B82F6; } 
            #bar-catch { background: #FBBF24; }
            #bar-p-stam { background: #22D3EE; }
            #bar-f-stam { background: #A855F7; }
            
            .behavior-text { margin-top: 1rem; text-align: center; font-size: 1.2rem; font-weight: bold; letter-spacing: 0.1em; transition: color 0.2s; }
            .depth-readout { text-align: center; font-size: 0.9rem; color: #22D3EE; margin-top: 0.5rem; font-weight: bold;}
            .controls-hint { text-align: center; font-size: 0.8rem; color: #64748B; margin-top: 0.5rem; }
        `;
        document.head.appendChild(style);

        this.container.innerHTML = `
            <div class="fishing-modal" style="display: none;" id="fm-modal">
                <div class="fishing-board" id="fm-board">
                    <div class="fight-header">
                        <h2 id="fm-title">Sinking Lure...</h2>
                        <div class="escape-timer" id="fm-timer-wrap">Escape: <span id="lbl-timer">0.0</span>s</div>
                    </div>
                    <div class="fishing-layout">
                        <div class="water-cam">
                            <canvas id="fm-canvas" width="${this.CW}" height="${this.CH}"></canvas>
                            <div class="bite-alert" id="fm-bite-alert">
                                <div>BITE! CLICK!</div>
                                <div class="hook-timer-bar"><div class="hook-timer-fill" id="fm-hook-fill"></div></div>
                            </div>
                        </div>
                        <div class="bars-container">
                            <div class="bar-row">
                                <div class="bar-labels"><span style="color:#94A3B8;">Line Tension</span> <span id="lbl-tension">0%</span></div>
                                <div class="bar-track"><div class="bar-fill" id="bar-tension" style="width: 0%;"></div></div>
                            </div>
                            <div class="bar-row">
                                <div class="bar-labels"><span style="color:#94A3B8;">Player Stamina</span> <span id="lbl-p-stam">100%</span></div>
                                <div class="bar-track"><div class="bar-fill" id="bar-p-stam" style="width: 100%;"></div></div>
                            </div>
                            <div class="bar-row">
                                <div class="bar-labels"><span style="color:#94A3B8;">Fish Stamina</span> <span id="lbl-f-stam">100%</span></div>
                                <div class="bar-track"><div class="bar-fill" id="bar-f-stam" style="width: 100%;"></div></div>
                            </div>
                            <div class="bar-row" style="margin-top: 0.5rem;">
                                <div class="bar-labels"><span style="color:#FBBF24;">Catch Progress</span> <span id="lbl-catch" style="color:#FBBF24;">0%</span></div>
                                <div class="bar-track" style="height: 24px; border-color: #B45309;"><div class="bar-fill" id="bar-catch" style="width: 0%;"></div></div>
                            </div>
                            <div class="bar-row" style="margin-top: 0.5rem; border-top: 1px dashed #1E293B; padding-top: 0.5rem;">
                                <div class="bar-labels"><span id="lbl-reel-text" style="color:#A5B4FC;">Reel Power & Target</span> <span id="lbl-reel-power" style="color:#A5B4FC;">50%</span></div>
                                <div class="bar-track" id="track-reel-power" style="height: 18px; border-color: #4F46E5;">
                                    <div class="bar-fill" id="bar-reel-power" style="width: 50%; background: #6366F1;"></div>
                                    <div id="fm-sweet-spot"></div>
                                </div>
                            </div>
                            <div class="depth-readout" id="lbl-depth">Depth: 0m (Surface)</div>
                        </div>
                    </div>
                    <div class="behavior-text" id="fm-behavior">WAITING...</div>
                    <div class="controls-hint">SCROLL: Depth (Sinking) / Reel Power (Fight). Hold CLICK/SPACE to Reel.</div>
                </div>
            </div>
        `;

        this.elements = {
            modal: document.getElementById('fm-modal'),
            board: document.getElementById('fm-board'),
            title: document.getElementById('fm-title'),
            timerWrap: document.getElementById('fm-timer-wrap'),
            lblTimer: document.getElementById('lbl-timer'),
            canvas: document.getElementById('fm-canvas'),
            biteAlert: document.getElementById('fm-bite-alert'),
            hookFill: document.getElementById('fm-hook-fill'),
            barTension: document.getElementById('bar-tension'),
            lblTension: document.getElementById('lbl-tension'),
            barPStam: document.getElementById('bar-p-stam'),
            lblPStam: document.getElementById('lbl-p-stam'),
            barFStam: document.getElementById('bar-f-stam'),
            lblFStam: document.getElementById('lbl-f-stam'),
            barCatch: document.getElementById('bar-catch'),
            lblCatch: document.getElementById('lbl-catch'),
            barReelPower: document.getElementById('bar-reel-power'),
            lblReelPower: document.getElementById('lbl-reel-power'),
            trackReelPower: document.getElementById('track-reel-power'),
            sweetSpot: document.getElementById('fm-sweet-spot'), // <-- ADD THIS LINE
            lblDepth: document.getElementById('lbl-depth'),
            behavior: document.getElementById('fm-behavior')
        };

        this.ctx = this.elements.canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;
    },

    open(config) {
        this.biomePal = config.biome.palette;
        this.tileId = config.tileId;
        
        // --- OPTIMIZATION 1: Precompute Gradient & Flora on Open ---
        this._precomputeBackground();
        if (this.tileId === TILE.FLORA) this._precomputeFlora();
        
        this.lureImg = new Image();
        this.lureImg.src = config.lureDataUrl;
        this.fishImgNormal = null; 
        
        this.elements.modal.style.display = 'flex';
        this.elements.title.innerText = "Sinking Lure...";
        this.elements.title.style.color = "#22D3EE";
        
        this.elements.timerWrap.style.display = 'none';
        this.elements.biteAlert.style.opacity = '0';
        this.elements.board.classList.remove('danger', 'thrashing');
        
        this.lastPhase = 'SINKING';
        this.lastAiState = 'HOLD';
        this.elements.behavior.innerText = "Sinking line...";
        this.elements.behavior.style.color = "#64748B";

        // Reset UI
        this.elements.barTension.style.width = '0%';
        this.elements.lblTension.innerText = '0%';
        this.elements.barTension.style.background = '#3B82F6';
        this.elements.barCatch.style.width = '0%';
        this.elements.lblCatch.innerText = '0%';
        this.elements.barPStam.style.width = '100%';
        this.elements.lblPStam.innerText = '100%';
        this.elements.barPStam.style.background = '#22D3EE';
        this.elements.barFStam.style.width = '100%';
        this.elements.lblFStam.innerText = '100%';
        
        this._initParticles();
        SFX.playCast();
    },

    close() {
        this.elements.modal.style.display = 'none';
        SFX.updateTension(0); 
        SFX.updateReel(false); // <-- NEW: Ensure continuous reel sound shuts off
    },

// Caches
    lureImg: null,
    fishImgNormal: null,
    fishImgBite: null,
    fishImgTired: null,
    
    bgGradientCanvas: null,
    _lastBgPal: null, // NEW: Tracks biome colors to avoid re-rendering
    
    floraFrames: null,
    _lastFloraPal: null, // NEW: Tracks biome colors to avoid re-rendering

    // ... (Keep init, open, close, etc.)

    // --- PRECOMPUTATION ENGINES ---
    _precomputeBackground() {
        // OPTIMIZATION: Only regenerate if we don't have one, or if we changed biomes
        if (this.bgGradientCanvas && this._lastBgPal === this.biomePal.water) return;
        this._lastBgPal = this.biomePal.water;

        const totalH = this.CH + 1200; 
        if (!this.bgGradientCanvas) {
            this.bgGradientCanvas = document.createElement('canvas');
        }
        // FAST: Match canvas width exactly to avoid stretch interpolation during rendering
        this.bgGradientCanvas.width = this.CW; 
        this.bgGradientCanvas.height = totalH;
        const ctx = this.bgGradientCanvas.getContext('2d');
        
        const grad = ctx.createLinearGradient(0, 0, 0, totalH);
        grad.addColorStop(0, this.biomePal.water);
        grad.addColorStop(1, '#000000'); 
        
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.CW, totalH);
    },

    _precomputeFlora() {
        // OPTIMIZATION: Only regenerate if we don't have one, or if we changed biomes
        if (this.floraFrames && this._lastFloraPal === this.biomePal.flora) return;
        this._lastFloraPal = this.biomePal.flora;

        const width = this.CW;
        const height = 60; // Max visual height of flora
        this.floraFrames =[];
        const numFrames = 7; // 7 frames of animation

        for (let frame = 0; frame < numFrames; frame++) {
            const c = document.createElement('canvas');
            c.width = width; 
            c.height = height;
            const ctx = c.getContext('2d');
            
            ctx.fillStyle = this.biomePal.flora;
            
            // Map frame 0 to 6 into sway values of -6 to 6
            const baseSway = ((frame / (numFrames - 1)) * 2 - 1) * 6;
            
            for(let i = 0; i < 8; i++) {
                const baseX = 20 + i * 35;
                for (let s = 0; s < 3; s++) {
                    const h = 15 + ((i * 7 + s * 13) % 30);
                    const stalkX = baseX + s * 5;
                    for (let seg = 0; seg < h; seg += 4) {
                        const swayAmt = (seg / h) * baseSway * (s + 1);
                        ctx.fillRect(stalkX + swayAmt, height - seg - 4, 3, 4);
                        if (seg > 4 && (seg + s) % 3 !== 0) {
                            const leafDir = (seg % 8 === 0) ? -3 : 3;
                            ctx.fillRect(stalkX + swayAmt + leafDir, height - seg - 2, 3, 2);
                        }
                    }
                }
            }
            this.floraFrames.push(c);
        }
    },

    _precomputeFishStates(engine) {
        this.fishImgNormal = new Image();
        this.fishImgNormal.onload = () => {
            const w = this.fishImgNormal.width;
            const h = this.fishImgNormal.height;
            
            // OPTIMIZATION: Reuse offscreen canvases instead of re-creating them
            if (!this.fishImgBite) this.fishImgBite = document.createElement('canvas');
            this.fishImgBite.width = w; this.fishImgBite.height = h;
            const bCtx = this.fishImgBite.getContext('2d');
            bCtx.clearRect(0, 0, w, h);
            bCtx.filter = 'brightness(0) blur(2px)';
            bCtx.drawImage(this.fishImgNormal, 0, 0);
            
            if (!this.fishImgTired) this.fishImgTired = document.createElement('canvas');
            this.fishImgTired.width = w; this.fishImgTired.height = h;
            const tCtx = this.fishImgTired.getContext('2d');
            tCtx.clearRect(0, 0, w, h);
            tCtx.filter = 'grayscale(1) brightness(1.5)';
            tCtx.drawImage(this.fishImgNormal, 0, 0);
        };
        this.fishImgNormal.src = engine.fishData.art.imageDataUrl;
    },

    _initParticles() {
        this.particles =[];
        let pColors = ['#FFFFFF', '#94A3B8']; 
        if (this.biomePal.water === '#162e1a') pColors =['#86EFAC', '#4ADE80']; 
        if (this.biomePal.water === '#5e1313') pColors =['#F59E0B', '#EF4444']; 

        for (let i = 0; i < 30; i++) {
            this.particles.push({
                x: Math.random() * this.CW,
                y: Math.random() * 800, 
                speed: Math.random() * 1.5 + 0.5,
                size: Math.random() * 2 + 1,
                wobble: Math.random() * Math.PI * 2,
                color: pColors[Math.floor(Math.random() * pColors.length)]
            });
        }
    },

    update(engine, dt, isReeling) {
        this._handlePhaseTransitions(engine);
        this._updateUIBars(engine, dt, isReeling);
        this._renderWaterColumn(engine, dt);
    },

    _handlePhaseTransitions(engine) {
        if (engine.phase !== this.lastPhase) {
            if (engine.phase === 'BITE') {
                SFX.playSplash();
                this.elements.title.innerText = "!! BITE !!";
                this.elements.title.style.color = "#EF4444";
                this.elements.biteAlert.style.opacity = '1';
                
                // OPTIMIZATION 2: Precompute CPU-heavy filters once
                this._precomputeFishStates(engine);
            } 
            else if (engine.phase === 'FIGHT') {
                this.elements.biteAlert.style.opacity = '0';
                this.elements.title.innerText = `Fighting: ${engine.fishData.identity.name}`;
                this.elements.title.style.color = getRarityColor(engine.fishData.identity.rarity);
                this.elements.timerWrap.style.display = 'block';
            }
            else if (engine.phase === 'CAUGHT') SFX.playCatchSuccess();
            else if (engine.phase === 'SNAPPED') SFX.playLineSnap();
            else if (engine.phase === 'ESCAPED') SFX.playError();
            
            this.lastPhase = engine.phase;
        }
    },

    _updateUIBars(engine, dt, isReeling) {
        this.elements.lblDepth.innerText = `Depth: ${Math.round(engine.currentDepth)}m (${engine.getDepthZone()})`;

        if (engine.phase === 'BITE') {
            const totalTime = engine.fishData.combat.hookWindowMs + engine.playerStats.minigame.hookWindowMs;
            const pct = Math.max(0, (engine.hookTimerMs / totalTime) * 100);
            this.elements.hookFill.style.width = `${pct}%`;
            this.elements.hookFill.style.background = pct > 50 ? '#22D3EE' : '#EF4444';
            return; 
        }

        if (engine.phase !== 'FIGHT') {
            SFX.updateReel(false); // <-- NEW: Safely kill the sound if line snaps or fish is caught
            return;
        }

        this.elements.lblTimer.innerText = Math.max(0, engine.fightTimer).toFixed(1);
        if (engine.fightTimer <= 5.0) this.elements.timerWrap.style.color = "#DC2626"; 

        // --- OPTIMIZED: Continuous Reel SFX ---
        // Replaces the CPU-heavy timer with a single continuous modulation call
        const actuallyReeling = isReeling && engine.playerStamina > 0;
        SFX.updateReel(actuallyReeling, engine.reelPower);

        const tensionPct = Math.round((engine.tension / engine.maxTension) * 100);
        this.elements.barTension.style.width = `${Math.min(100, tensionPct)}%`;
        this.elements.lblTension.innerText = `${tensionPct}%`;
        SFX.updateTension(tensionPct); 
        
        if (tensionPct < 50) {
            this.elements.barTension.style.background = '#3B82F6'; 
            this.elements.board.classList.remove('danger');
        } else if (tensionPct < 85) {
            this.elements.barTension.style.background = '#F59E0B'; 
            this.elements.board.classList.remove('danger');
        } else {
            this.elements.barTension.style.background = '#EF4444'; 
            this.elements.board.classList.add('danger'); 
        }

        const pStamPct = Math.round((engine.playerStamina / engine.maxPlayerStamina) * 100);
        this.elements.barPStam.style.width = `${pStamPct}%`;
        this.elements.lblPStam.innerText = `${pStamPct}%`;
        this.elements.barPStam.style.background = pStamPct < 5 ? '#EF4444' : '#22D3EE';

        const fStamPct = Math.round((engine.fishStamina / engine.maxFishStamina) * 100);
        this.elements.barFStam.style.width = `${fStamPct}%`;
        this.elements.lblFStam.innerText = `${fStamPct}%`;
        
        const catchPct = Math.round(engine.catchProgress);
        this.elements.barCatch.style.width = `${catchPct}%`;
        this.elements.lblCatch.innerText = `${catchPct}%`;

        const reelPower = engine.reelPower || 50; 
        const inSweetSpot = engine.inSweetSpot || false;
        
        // --- NEW: Position and Scale the Sweet Spot Target Zone ---
        const tol = engine.playerStats.minigame.sweetSpotTolerance;
        const leftLimit = Math.max(0, engine.currentSweetSpot - tol);
        const rightLimit = Math.min(100, engine.currentSweetSpot + tol);
        const dynamicWidth = rightLimit - leftLimit;

        this.elements.sweetSpot.style.left = `${leftLimit}%`;
        this.elements.sweetSpot.style.width = `${dynamicWidth}%`;
        
        this.elements.barReelPower.style.width = `${Math.round(reelPower)}%`;
        this.elements.lblReelPower.innerText = `${Math.round(reelPower)}%`;
        
        if (inSweetSpot) {
            this.elements.barReelPower.style.background = '#FBBF24';
            this.elements.trackReelPower.style.borderColor = '#F59E0B';
            this.elements.lblReelPower.style.color = '#FBBF24';
            document.getElementById('lbl-reel-text').style.color = '#FBBF24';
        } else {
            this.elements.barReelPower.style.background = '#6366F1';
            this.elements.trackReelPower.style.borderColor = '#4F46E5';
            this.elements.lblReelPower.style.color = '#A5B4FC';
            document.getElementById('lbl-reel-text').style.color = '#A5B4FC';
        }

        const state = engine.ai.state;
        let behaviorText = "";
        let behaviorColor = "";

        if (state === 'HOLD') {
            behaviorText = fStamPct <= 0 ? "The fish is exhausted..." : "The fish is holding steady.";
            behaviorColor = fStamPct <= 0 ? '#64748B' : '#3B82F6';
        } else if (state === 'RUN') {
            behaviorText = "The fish is running!";
            behaviorColor = '#F59E0B';
        } else if (state === 'THRASH') {
            behaviorText = "It's thrashing wildly!";
            behaviorColor = '#EF4444';
        } else if (state === 'BURST') {
            behaviorText = "A sudden violent burst!";
            behaviorColor = '#DC2626';
        } else if (state === 'INANIMATE') {
            behaviorText = "Heavy dead weight...";
            behaviorColor = '#94A3B8';
        }

        this.elements.behavior.innerText = behaviorText;
        this.elements.behavior.style.color = behaviorColor;

        if (state === 'THRASH' && this.lastAiState !== 'THRASH') {
            SFX.playThrash();
            this.elements.board.classList.add('thrashing');
        } else if (state !== 'THRASH') {
            this.elements.board.classList.remove('thrashing');
        }
        
        this.lastAiState = state;
    },

    _renderWaterColumn(engine, dt) {
        const ctx = this.ctx;
        ctx.clearRect(0, 0, this.CW, this.CH);

        const PX_PER_METER = 12; 
        const LURE_Y = this.CH * 0.45; 
        
        const surfaceY = LURE_Y - (engine.currentDepth * PX_PER_METER);
        const bottomY = LURE_Y + ((engine.maxDepth - engine.currentDepth) * PX_PER_METER);

        // OPTIMIZATION 3: Draw Cached Gradient Slice without horizontal stretching
        const startDrawY = Math.max(0, surfaceY);
        const sliceHeight = this.CH - startDrawY;
        const gradStartY = engine.currentDepth * PX_PER_METER;
        
        if (this.bgGradientCanvas && sliceHeight > 0) {
            // FIX: Removed the '1' parameter. Directly matches canvas width.
            ctx.drawImage(this.bgGradientCanvas, 0, gradStartY, this.CW, sliceHeight, 0, startDrawY, this.CW, sliceHeight);
        } else {
            ctx.fillStyle = this.biomePal.water;
            ctx.fillRect(0, 0, this.CW, this.CH);
        }


        // 2. Draw Particles
        ctx.fillStyle = '#FFFFFF';
        this.particles.forEach(p => {
            p.y -= p.speed * dt * 40; 
            p.wobble += 0.05;
            if (p.y < 0) p.y = bottomY;

            const drawY = surfaceY + p.y;
            const drawX = p.x + Math.sin(p.wobble) * 2 + (engine.waterCurrent * 5);
            
            if (drawY > surfaceY && drawY < bottomY) {
                ctx.fillStyle = p.color;
                ctx.fillRect(drawX, drawY, p.size, p.size);
            }
        });

        // 3. Draw Sea Floor & Flora
        if (bottomY < this.CH + 50) {
            ctx.fillStyle = this.biomePal.land;
            ctx.fillRect(0, bottomY, this.CW, this.CH - bottomY);
            
            ctx.fillStyle = this.biomePal.rock;
            for(let i=0; i<5; i++) {
                ctx.beginPath();
                ctx.moveTo(i * 60, bottomY);
                ctx.lineTo(i * 60 + 30, bottomY - 30 + (i%2*10));
                ctx.lineTo(i * 60 + 60, bottomY);
                ctx.fill();
            }

        // OPTIMIZATION 4: Render Precomputed Flora Frames instead of using Matrix Transforms
            if (this.tileId === TILE.FLORA && this.floraFrames && this.floraFrames.length > 0) {
                // engine.waterCurrent bounces between approx -1.5 and 1.5
                let normalized = (engine.waterCurrent + 1.5) / 3.0;
                normalized = Math.max(0, Math.min(1, normalized));
                
                // Select the correct animation frame (0 to 6) based on current water speed
                const frameIdx = Math.floor(normalized * (this.floraFrames.length - 1));
                
                ctx.drawImage(this.floraFrames[frameIdx], 0, bottomY - 60);
            }
        }

        // 4. Draw Surface
        if (surfaceY > 0) {
            ctx.fillStyle = '#020617'; 
            ctx.fillRect(0, 0, this.CW, surfaceY);
            ctx.fillStyle = '#1E293B'; 
            ctx.fillRect(0, surfaceY, this.CW, 4);
        }

        // 5. Draw Fishing Line
        const lureW = this.lureImg ? this.lureImg.width * 0.5 : 10;
        const lureH = this.lureImg ? this.lureImg.height * 0.5 : 10;
        const lureX = this.CW / 2;
        
        const lineStartX = this.CW / 2;
        const lineStartY = Math.max(0, surfaceY);
        const lineEndY = LURE_Y + (lureH * 0.1); 
        
        ctx.strokeStyle = '#E2E8F0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(lineStartX, lineStartY);

        const swayForce = engine.waterCurrent * 25;
        const cp1x = lineStartX + swayForce;
        const cp1y = lineStartY + (lineEndY - lineStartY) * 0.33;
        const cp2x = lineStartX + swayForce * 1.2;
        const cp2y = lineStartY + (lineEndY - lineStartY) * 0.66;

        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, lureX, lineEndY);
        ctx.stroke();

        // 6. Draw Lure
        if (this.lureImg && engine.phase !== 'SNAPPED') {
            const lSway = engine.waterCurrent * 2;
            ctx.drawImage(this.lureImg, lureX - (lureW / 2) + lSway, LURE_Y, lureW, lureH);
        }

        // 7. Draw Fish (Using Precomputed Filter Canvases)
        if (this.fishImgNormal && engine.phase !== 'SINKING') {
            ctx.save();
            const fw = this.fishImgNormal.width * 0.6; 
            const fh = this.fishImgNormal.height * 0.6;
            
            let fx = lureX;
            let fy = LURE_Y + (fh / 2) - 10; 
            let rotation = 0;
            
            // Swap active canvas based on state
            let activeFishImg = this.fishImgNormal;

            if (engine.phase === 'BITE') {
                activeFishImg = this.fishImgBite || this.fishImgNormal;
                fx += Math.sin(Date.now() / 200) * 20; 
            } 
            else if (engine.phase === 'FIGHT') {
                if (engine.fishStamina <= 0) activeFishImg = this.fishImgTired || this.fishImgNormal;
                
                if (engine.ai.state === 'HOLD' || engine.ai.state === 'INANIMATE') {
                    fy += Math.sin(Date.now() / 300) * 5;
                } else if (engine.ai.state === 'RUN') {
                    fx += (Math.random() - 0.5) * 8;
                    fy += 15; 
                    rotation = Math.PI * 0.05; 
                } else if (engine.ai.state === 'THRASH') {
                    fx += (Math.random() - 0.5) * 25;
                    fy += (Math.random() - 0.5) * 25;
                    rotation = (Math.random() - 0.5) * 0.3;
                } else if (engine.ai.state === 'BURST') {
                    fy += 25; 
                }
            }
            else if (engine.phase === 'CAUGHT') {
                fy = LURE_Y; 
                rotation = -Math.PI / 2; 
            } 
            else if (engine.phase === 'ESCAPED' || engine.phase === 'SNAPPED') {
                ctx.globalAlpha = 0.4; // Fade out instead of blur filter
                fy += 60; 
            }

            ctx.translate(fx, fy);
            ctx.rotate(rotation);
            ctx.drawImage(activeFishImg, -fw / 2, -fh / 2, fw, fh);
            ctx.restore();
        }
    }
};