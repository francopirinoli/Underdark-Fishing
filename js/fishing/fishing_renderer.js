/**
 * js/fishing/fishing_renderer.js
 * The Visual and Audio Feedback bridge for the Fishing Minigame.
 * V4 - Scaled sprites, Bezier curve fishing lines, water current swaying, 
 * Escape Timer UI, and smooth depth scrolling.
 */

import { SFX } from '../audio/sfx_generator.js';

// Local Map Tile IDs
const TILE = { WATER: 0, DEEP_WATER: 1, LAND: 2, ROCK: 3, FLORA: 4, DOCK: 5 };

export const FishingRenderer = {
    container: null,
    elements: {},
    
    // Canvas Contexts
    canvas: null,
    ctx: null,
    CW: 260,
    CH: 340,

    // Image Caches
    lureImg: null,
    fishImg: null,

    // Visual State
    lastPhase: 'IDLE',
    lastAiState: 'HOLD',
    reelAudioTimer: 0,
    particles:[],
    biomePal: null,
    tileId: 0,

    init(containerElement) {
        this.container = containerElement;
        
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
                            <div class="depth-readout" id="lbl-depth">Depth: 0m (Surface)</div>
                        </div>
                    </div>
                    
                    <div class="behavior-text" id="fm-behavior">WAITING...</div>
                    <div class="controls-hint">SCROLL to change depth. Hold CLICK/SPACE to Reel. Release to Rest.</div>
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
            
            lblDepth: document.getElementById('lbl-depth'),
            behavior: document.getElementById('fm-behavior')
        };

        this.ctx = this.elements.canvas.getContext('2d');
        this.ctx.imageSmoothingEnabled = false;
    },

    open(config) {
        this.biomePal = config.biome.palette;
        this.tileId = config.tileId;
        
        this.lureImg = new Image();
        this.lureImg.src = config.lureDataUrl;
        this.fishImg = null; 
        
        this.elements.modal.style.display = 'flex';
        this.elements.title.innerText = "Sinking Lure...";
        this.elements.title.style.color = "#22D3EE";
        
        this.elements.timerWrap.style.display = 'none';
        this.elements.biteAlert.style.opacity = '0';
        this.elements.board.classList.remove('danger', 'thrashing');
        
        this.lastPhase = 'SINKING';
        this.lastAiState = 'HOLD';
        
        // [FIX]: Reset behavior text on new cast
        this.elements.behavior.innerText = "Sinking line...";
        this.elements.behavior.style.color = "#64748B";
        
        this._initParticles();
        SFX.playCast();

    },

    close() {
        this.elements.modal.style.display = 'none';
        SFX.updateTension(0); 
    },

    _initParticles() {
        this.particles = [];
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
                
                this.fishImg = new Image();
                this.fishImg.src = engine.fishData.art.imageDataUrl;
            } 
            else if (engine.phase === 'FIGHT') {
                this.elements.biteAlert.style.opacity = '0';
                this.elements.title.innerText = `Fighting: ${engine.fishData.identity.name}`;
                this.elements.title.style.color = "#FBBF24";
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

        if (engine.phase !== 'FIGHT') return;

        // Escape Timer Countdown
        this.elements.lblTimer.innerText = Math.max(0, engine.fightTimer).toFixed(1);
        if (engine.fightTimer <= 5.0) this.elements.timerWrap.style.color = "#DC2626"; 

        if (isReeling && engine.playerStamina > 0) {
            this.reelAudioTimer -= dt;
            if (this.reelAudioTimer <= 0) {
                SFX.playReel();
                const speed = 0.15 * (engine.fishStamina / engine.maxFishStamina) + 0.05;
                this.reelAudioTimer = speed;
            }
        }

        const tensionPct = (engine.tension / engine.maxTension) * 100;
        this.elements.barTension.style.width = `${Math.min(100, tensionPct)}%`;
        this.elements.lblTension.innerText = `${Math.floor(tensionPct)}%`;
        
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

        const pStamPct = (engine.playerStamina / engine.maxPlayerStamina) * 100;
        this.elements.barPStam.style.width = `${pStamPct}%`;
        this.elements.lblPStam.innerText = `${Math.floor(pStamPct)}%`;
        this.elements.barPStam.style.background = pStamPct < 5 ? '#EF4444' : '#22D3EE';

        const fStamPct = (engine.fishStamina / engine.maxFishStamina) * 100;
        this.elements.barFStam.style.width = `${fStamPct}%`;
        this.elements.lblFStam.innerText = `${Math.floor(fStamPct)}%`;
        
        // CATCH PROGRESS
        this.elements.barCatch.style.width = `${engine.catchProgress}%`;
        this.elements.lblCatch.innerText = `${Math.floor(engine.catchProgress)}%`;

        // AI STATE & BORDER SHAKE
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
            // NEW: Handle the Treasure Chest state!
            behaviorText = "Heavy dead weight...";
            behaviorColor = '#94A3B8';
        }

        this.elements.behavior.innerText = behaviorText;
        this.elements.behavior.style.color = behaviorColor;

        // Audio and Visuals for Thrash
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

        // --- MATH: CAMERA TRACKS LURE ---
        const PX_PER_METER = 12; // Spacing multiplier for depth
        const LURE_Y = this.CH * 0.45; // Lure sits slightly above center screen
        
        const surfaceY = LURE_Y - (engine.currentDepth * PX_PER_METER);
        const bottomY = LURE_Y + ((engine.maxDepth - engine.currentDepth) * PX_PER_METER);

        // 1. Draw Water Gradient
        const grad = ctx.createLinearGradient(0, Math.max(0, surfaceY), 0, bottomY);
        grad.addColorStop(0, this.biomePal.water);
        grad.addColorStop(1, '#000000'); 
        
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, this.CW, this.CH);

        // 2. Draw Particles (Swaying with water current)
        ctx.fillStyle = '#FFFFFF';
        this.particles.forEach(p => {
            p.y -= p.speed * dt * 40; 
            p.wobble += 0.05;
            
            if (p.y < 0) p.y = bottomY;

            const drawY = surfaceY + p.y;
            // Particles sway with the global current!
            const drawX = p.x + Math.sin(p.wobble) * 2 + (engine.waterCurrent * 5);
            
            if (drawY > surfaceY && drawY < bottomY) {
                ctx.fillStyle = p.color;
                ctx.fillRect(drawX, drawY, p.size, p.size);
            }
        });

        // 3. Draw Sea Floor
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

            if (this.tileId === TILE.FLORA) {
                ctx.fillStyle = this.biomePal.flora;
                const sway = engine.waterCurrent * 8; // Flora bends with current
                for(let i=0; i<8; i++) {
                    ctx.fillRect(20 + i*30 + sway, bottomY - 20, 4, 20);
                    ctx.fillRect(18 + i*30 + sway, bottomY - 24, 8, 4); 
                }
            }
        }

        // 4. Draw Surface / Night Sky
        if (surfaceY > 0) {
            ctx.fillStyle = '#020617'; 
            ctx.fillRect(0, 0, this.CW, surfaceY);
            ctx.fillStyle = '#1E293B'; 
            ctx.fillRect(0, surfaceY, this.CW, 4);
        }

        // 5. DRAW FISHING LINE (Bezier Curve based on Water Current)
        const lureW = this.lureImg ? this.lureImg.width * 0.5 : 10;
        const lureH = this.lureImg ? this.lureImg.height * 0.5 : 10;
        const lureX = this.CW / 2;
        
        const lineStartX = this.CW / 2;
        const lineStartY = Math.max(0, surfaceY);
        const lineEndX = lureX;
        const lineEndY = LURE_Y + (lureH * 0.1); // Attaches slightly down into the eyelet
        
        ctx.strokeStyle = '#E2E8F0';
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(lineStartX, lineStartY);

        // Control points shift left/right based on current
        const swayForce = engine.waterCurrent * 25;
        const cp1x = lineStartX + swayForce;
        const cp1y = lineStartY + (lineEndY - lineStartY) * 0.33;
        const cp2x = lineStartX + swayForce * 1.2;
        const cp2y = lineStartY + (lineEndY - lineStartY) * 0.66;

        ctx.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, lineEndX, lineEndY);
        ctx.stroke();

        // 6. Draw Lure (SCALED DOWN)
        if (this.lureImg && engine.phase !== 'SNAPPED') {
            // Lure sways slightly with current
            const lSway = engine.waterCurrent * 2;
            ctx.drawImage(this.lureImg, lureX - (lureW / 2) + lSway, LURE_Y, lureW, lureH);
        }

        // 7. Draw Fish! (SCALED DOWN)
        if (this.fishImg && engine.phase !== 'SINKING') {
            ctx.save();
            const fw = this.fishImg.width * 0.6; // Smaller, realistic scale
            const fh = this.fishImg.height * 0.6;
            
            let fx = lureX;
            let fy = LURE_Y + (fh / 2) - 10; // Hangs just below the lure
            let rotation = 0;

            if (engine.phase === 'BITE') {
                ctx.filter = 'brightness(0) blur(2px)'; // Dark silhouette
                fx += Math.sin(Date.now() / 200) * 20; 
            } 
            else if (engine.phase === 'FIGHT') {
                const fStamPct = engine.fishStamina / engine.maxFishStamina;
                if (fStamPct <= 0) ctx.filter = 'grayscale(1) brightness(1.5)'; 
                else ctx.filter = 'none'; 
                
                // Shake Physics
                if (engine.ai.state === 'HOLD' || engine.ai.state === 'INANIMATE') {
                    // NEW: Included INANIMATE here so the chest bobs slowly
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
                ctx.filter = 'blur(2px) brightness(0.3)';
                fy += 60; 
            }

            ctx.translate(fx, fy);
            ctx.rotate(rotation);
            ctx.drawImage(this.fishImg, -fw / 2, -fh / 2, fw, fh);
            ctx.restore();
        }
    }
};