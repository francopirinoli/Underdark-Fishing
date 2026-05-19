/**
 * js/ui/menu_ui.js
 * Manages the Main Menu, Character Creation, and "Living" Title Screen.
 */

import { SFX } from '../audio/sfx_generator.js';
import { generateNPCData, generateName } from '../data/npc_data_generator.js';
import { SaveManager } from '../util/save_manager.js';
import { createRng } from '../util/rng.js';
import { showStatTooltip, moveStatTooltip, hideStatTooltip } from '../util/utils.js';
import { STAT_DESCRIPTIONS } from '../data/player_data.js';

// --- NEW IMPORTS FOR TITLE SCREEN ---
import { BIOMES } from '../exploration/biomes.js';
import { generateFishData, generateFishInstance } from '../data/fish_data_generator.js';
import { MusicEngine } from '../audio/music_engine.js';
import { generateBoatData } from '../data/boat_data_generator.js'; // <-- ADD THIS LINE

export const MenuUI = {
    ccStats: { fishing: 1, stamina: 1, driving: 1, crafting: 1, bartering: 1, intelligence: 1 },
    ccPoints: 3,
    ccIdentity: null,
    callbacks: null,
    selectedSlot: 1,
    ccBoat: null, 
    // Background Animation State
    bgAnimFrame: null,
    bgThemeId: null,
    bgEntities: [],
    currentThemeColor: '#22D3EE', // <-- NEW: Tracks the active biome color

    init(callbacks) {
        this.callbacks = callbacks;

        // --- AUDIO UNLOCK & TRANSITION ---
        document.getElementById('menu-start-prompt').onclick = async () => {
            document.getElementById('menu-start-prompt').style.display = 'none';
            if (this.callbacks.onStartClick) await this.callbacks.onStartClick();
            document.getElementById('menu-save-select').style.display = 'flex';
            if (this.bgThemeId) MusicEngine.playBiome(this.bgThemeId, createRng(Date.now()));
        };

        // Identity Listeners
        document.getElementById('cc-race').onchange = () => this.updateCCPortrait();
        document.getElementById('cc-gender').onchange = () => this.updateCCPortrait();
        document.getElementById('btn-cc-reroll').onclick = () => { SFX.playUIHover(); this.updateCCPortrait(); };
        
        // --- NEW: Boat Listeners ---
        document.getElementById('cc-boat-type').onchange = () => { SFX.playUISelect(); this.updateCCBoat(); };
        document.getElementById('btn-cc-reroll-boat').onclick = () => { SFX.playUIHover(); this.updateCCBoat(); };
        
        document.getElementById('btn-cc-random-name').onclick = () => {
            SFX.playUIHover();
            const race = document.getElementById('cc-race').value;
            const gender = document.getElementById('cc-gender').value;
            document.getElementById('cc-name').value = generateName(race, gender, createRng(Date.now()));
        };
        
        document.getElementById('btn-embark').onclick = () => {
            SFX.playCatchSuccess();
            const playerData = {
                name: document.getElementById('cc-name').value,
                race: document.getElementById('cc-race').value,
                gender: document.getElementById('cc-gender').value,
                portraitData: this.ccIdentity.imageDataUrl,
                portraitSeed: this.ccIdentity.seed 
            };
            this.stopBackgroundLoop(); 
            // --- FIX: Pass this.ccBoat as the 5th parameter! ---
            this.callbacks.onNewGame(this.selectedSlot, playerData, { ...this.ccStats }, this.ccPoints, this.ccBoat);
        };
    },

    showMainMenu() {
        const menus = document.getElementById('z200-menus');
        const screenStart = document.getElementById('screen-start');
        const screenChar = document.getElementById('screen-char-create');
        
        menus.style.display = 'flex';
        screenStart.style.display = 'flex';
        screenChar.style.display = 'none';

        // Reset Prompt Visibility
        document.getElementById('menu-start-prompt').style.display = 'flex';
        document.getElementById('menu-save-select').style.display = 'none';

        this.startBackgroundLoop();
        this.renderSaveSlots(); // <-- Use the new extracted function
    },

    renderSaveSlots() {
        const container = document.getElementById('save-slots-container');
        container.innerHTML = '';
        
        // Grab the active theme color we set in the background loop
        const themeColor = this.currentThemeColor || 'var(--cyan-glow)';

        for (let i = 1; i <= 3; i++) {
            const info = SaveManager.getSaveInfo(i);
            const wrapper = document.createElement('div');
            wrapper.style.display = 'flex';
            wrapper.style.flexDirection = 'column';
            wrapper.style.gap = '0.5rem';

            const btn = document.createElement('button');
            btn.className = 'menu-btn';
            
            // Stylize the button to look like a thick retro panel
            btn.style.width = '260px';
            btn.style.margin = '0';
            btn.style.padding = '1.2rem';
            btn.style.background = 'rgba(15, 23, 42, 0.85)'; 
            btn.style.border = `2px solid ${themeColor}`; 
            btn.style.boxShadow = `0 4px 15px rgba(0,0,0,0.6), inset 0 0 15px ${themeColor}30`;
            btn.style.transition = 'all 0.2s';
            // FIX: Override default CSS to force sharp, pixelated corners!
            btn.style.borderRadius = '0'; 
            
            // Dynamic JS hover effects to bypass rigid CSS rules
            btn.onmouseenter = () => { 
                btn.style.background = 'rgba(30, 41, 59, 0.95)'; 
                btn.style.transform = 'translateY(-3px)'; 
                btn.style.boxShadow = `0 6px 20px rgba(0,0,0,0.8), inset 0 0 20px ${themeColor}60`; 
            };
            btn.onmouseleave = () => { 
                btn.style.background = 'rgba(15, 23, 42, 0.85)'; 
                btn.style.transform = 'translateY(0)'; 
                btn.style.boxShadow = `0 4px 15px rgba(0,0,0,0.6), inset 0 0 15px ${themeColor}30`; 
            };

            if (info) {
                btn.innerHTML = `
                    <div style="display:flex; align-items:center; gap: 1rem; text-align: left;">
                        <!-- FIX: Removed border-radius from portrait -->
                        <img src="${info.portrait}" style="width: 64px; height: 64px; background: #000; border: 2px solid ${themeColor}; border-radius: 0; image-rendering: pixelated;">
                        <div>
                            <span style="color:${themeColor}; font-size:1.6rem; text-shadow: 1px 1px 3px #000; font-weight:bold;">${info.name}</span><br>
                            <span style="color:var(--text-main); font-size:1.1rem; text-shadow: 1px 1px 2px #000;">Day ${info.day} - <span style="color:var(--gold-warn);">${info.gold}g</span></span><br>
                            <span style="color:var(--text-muted); font-size:0.95rem;">Slot ${i}</span>
                        </div>
                    </div>
                `;
                btn.onclick = () => { 
                    SFX.playUISelect(); 
                    this.stopBackgroundLoop(); 
                    this.callbacks.onLoadGame(i); 
                };
                
                const delBtn = document.createElement('button');
                delBtn.className = 'menu-btn';
                // FIX: Added border-radius: 0 to the delete button CSS string
                delBtn.style.cssText = `width: 100%; margin: 0; padding: 0.5rem; font-size: 1.1rem; border: 1px solid var(--red-danger); color: var(--red-danger); background: rgba(15, 23, 42, 0.85); transition: all 0.2s; border-radius: 0;`;
                delBtn.innerText = 'Delete Save';
                
                delBtn.onmouseenter = () => { delBtn.style.background = 'rgba(153, 27, 27, 0.8)'; delBtn.style.color = '#FFF'; };
                delBtn.onmouseleave = () => { delBtn.style.background = 'rgba(15, 23, 42, 0.85)'; delBtn.style.color = 'var(--red-danger)'; };
                
                delBtn.onclick = () => {
                    SFX.playError();
                    SaveManager.deleteSave(i);
                    this.renderSaveSlots(); 
                };
                
                wrapper.appendChild(btn);
                wrapper.appendChild(delBtn);
            } else {
                btn.innerHTML = `<span style="color:${themeColor}; font-size:1.8rem; text-shadow: 1px 1px 3px #000;">Slot ${i}</span><br><br><span style="color:var(--text-muted); font-size:1.2rem;">- Empty -</span>`;
                btn.onclick = () => { 
                    SFX.playUISelect(); 
                    this.selectedSlot = i;
                    this.showCharacterCreator(); 
                };
                wrapper.appendChild(btn);
            }
            container.appendChild(wrapper);
        }
    },

    showCharacterCreator() {
        document.getElementById('screen-start').style.display = 'none';
        document.getElementById('screen-char-create').style.display = 'flex';
        
        this.renderCCStats();
        this.updateCCPortrait();
        this.updateCCBoat(); // <-- NEW: Generate the initial vessel
    },

    updateCCPortrait() {
        const race = document.getElementById('cc-race').value;
        const gender = document.getElementById('cc-gender').value;
        
        this.ccIdentity = generateNPCData({ seed: Date.now(), race, gender });
        document.getElementById('cc-portrait').src = this.ccIdentity.imageDataUrl;
        
        const nameInput = document.getElementById('cc-name');
        if (nameInput.value === 'Angler' || nameInput.value === '') {
            nameInput.value = this.ccIdentity.name;
        }
    },

    updateCCBoat() {
        const selectedType = document.getElementById('cc-boat-type').value;
        
        let newBoat;
        let attempts = 0;
        
        // Force it to be Common rarity to preserve early-game balance
        do { 
            newBoat = generateBoatData({ seed: Date.now() + ++attempts, boatType: selectedType }); 
        } while (newBoat.identity.rarity !== 'Common');
        
        newBoat.invType = 'boat';
        this.ccBoat = newBoat;

        document.getElementById('cc-boat-img').src = newBoat.art.profileDataUrl;
        document.getElementById('cc-boat-name').innerText = newBoat.identity.name;
        
        const s = newBoat.stats;
        document.getElementById('cc-boat-stats').innerHTML = `
            <div style="display:flex; justify-content:space-between; padding-bottom: 0.1rem; border-bottom: 1px dashed var(--panel-border);"><span>Hull HP:</span> <span style="font-weight:bold; color:var(--ink);">${s.maxHp}</span></div>
            <div style="display:flex; justify-content:space-between; padding-bottom: 0.1rem; border-bottom: 1px dashed var(--panel-border);"><span>Top Speed:</span> <span style="font-weight:bold; color:var(--ink);">${s.speed}</span></div>
            <div style="display:flex; justify-content:space-between; padding-bottom: 0.1rem; border-bottom: 1px dashed var(--panel-border);"><span>Acceleration:</span> <span style="font-weight:bold; color:var(--ink);">${s.acceleration}</span></div>
            <div style="display:flex; justify-content:space-between; padding-bottom: 0.1rem; border-bottom: 1px dashed var(--panel-border);"><span>Handling:</span> <span style="font-weight:bold; color:var(--ink);">${s.turnSpeed}</span></div>
            <div style="display:flex; justify-content:space-between; padding-bottom: 0.1rem; border-bottom: 1px dashed var(--panel-border);"><span>Cargo Space:</span> <span style="font-weight:bold; color:var(--ink);">${s.cargoSpace}</span></div>
            <div style="display:flex; justify-content:space-between; padding-bottom: 0.1rem; border-bottom: 1px dashed var(--panel-border);"><span>Base Mass:</span> <span style="font-weight:bold; color:var(--ink);">${s.mass}</span></div>
            <div style="display:flex; justify-content:space-between; padding-bottom: 0.1rem; border-bottom: 1px dashed var(--panel-border);"><span>Armor (DR):</span> <span style="font-weight:bold; color:var(--green-safe);">${Math.round(s.damageReduction * 100)}%</span></div>
            <div style="display:flex; justify-content:space-between;"><span>Evasion:</span> <span style="font-weight:bold; color:var(--cyan-glow);">${Math.round(s.evasion * 100)}%</span></div>
        `;
    },

    renderCCStats() {
        document.getElementById('cc-pts').innerText = this.ccPoints;
        const list = document.getElementById('cc-stats-list');
        list.innerHTML = '';
        
        const displayNames = {
            fishing: "Fishing", stamina: "Stamina", driving: "Driving", 
            crafting: "Crafting", bartering: "Bartering", intelligence: "Intelligence"
        };

        for (const [key, val] of Object.entries(this.ccStats)) {
            const row = document.createElement('div');
            row.className = 'stat-row';
            row.innerHTML = `
                <span style="text-shadow: 0 2px 4px rgba(0,0,0,0.8);">${displayNames[key]}</span>
                <div class="stat-controls">
                    <button class="btn-minus" data-stat="${key}" ${val <= 1 ? 'disabled' : ''}>-</button>
                    <span class="stat-val" style="text-shadow: 0 2px 4px rgba(0,0,0,0.8);">${val}</span>
                    <button class="btn-plus" data-stat="${key}" ${(this.ccPoints <= 0 || val >= 5) ? 'disabled' : ''}>+</button>
                </div>
            `;
            
            row.querySelector('.btn-minus').onclick = () => {
                if (this.ccStats[key] > 1) { 
                    this.ccStats[key]--; this.ccPoints++; SFX.playUIHover(); this.renderCCStats(); 
                }
            };
            row.querySelector('.btn-plus').onclick = () => {
                if (this.ccPoints > 0 && this.ccStats[key] < 5) { 
                    this.ccStats[key]++; this.ccPoints--; SFX.playUISelect(); this.renderCCStats(); 
                }
            };

            row.addEventListener('mouseenter', (e) => showStatTooltip(displayNames[key], STAT_DESCRIPTIONS[key], e));
            row.addEventListener('mousemove', moveStatTooltip);
            row.addEventListener('mouseleave', hideStatTooltip);
            
            list.appendChild(row);
        }
    },

    // ==========================================
    // THE "LIVING" BACKGROUND ENGINE
    // ==========================================
    startBackgroundLoop() {
        if (this.bgAnimFrame) return; // Already running
        
        const canvas = document.getElementById('menu-bg-canvas');
        if (!canvas) return;
        
        // Use a fixed virtual resolution that scales to the window via CSS to prevent slowdowns
        canvas.width = 1280;
        canvas.height = 720;
        const ctx = canvas.getContext('2d');
        ctx.imageSmoothingEnabled = false;
        
        const rng = createRng(Date.now());
        const wildBiomes = Object.keys(BIOMES).filter(b => b !== 'hub');
        this.bgThemeId = rng.pick(wildBiomes);
        const pal = BIOMES[this.bgThemeId].palette;
        
        // --- NEW: Dynamically color the Title and Text to match the Biome! ---
        const themeColor = BIOMES[this.bgThemeId].textColor || BIOMES[this.bgThemeId].globalColor;
        this.currentThemeColor = themeColor; // <-- ADD THIS LINE
        
        const titleEl = document.getElementById('menu-title-text');
        const promptEl = document.getElementById('menu-prompt-text');
        const watermarkEl = document.getElementById('menu-watermark');
        
        // The hex string is appended with '80' or '60' to add alpha transparency to the glowing shadow!
        if (titleEl) {
            titleEl.style.color = themeColor;
            titleEl.style.textShadow = `0 5px 20px rgba(0,0,0,0.8), 0 0 20px ${themeColor}80`;
        }
        if (promptEl) {
            promptEl.style.color = themeColor;
            promptEl.style.textShadow = `0 2px 10px rgba(0,0,0,0.8), 0 0 15px ${themeColor}80`;
        }
        if (watermarkEl) {
            watermarkEl.style.color = themeColor;
            watermarkEl.style.textShadow = `0 2px 10px rgba(0,0,0,0.8), 0 0 10px ${themeColor}60`;
        }
        
        // 1. Generate 3 Random Fish
        const fishInstances = [];
        for(let i=0; i<3; i++) {
            let opts = { seed: rng.next() * 1000000, biomeId: this.bgThemeId };
            // Ensure an abyssal horror spawns if it's the Abyssal Trench
            if (this.bgThemeId === 'abyssal' && i === 0) opts.family = 'deepsea';
            
            const template = generateFishData(opts);
            const instance = generateFishInstance(template, createRng(rng.next() * 1000000));
            fishInstances.push(instance);
        }
        
        // 2. Setup Particles
        let pColors = ['#FFFFFF', '#94A3B8']; 
        if (pal.water === '#162e1a') pColors = ['#86EFAC', '#4ADE80']; 
        if (pal.water === '#5e1313') pColors = ['#F59E0B', '#EF4444']; 
        if (pal.water === '#050510') pColors = ['#a855f7', '#c084fc'];

        const particles = [];
        for (let i = 0; i < 60; i++) {
            particles.push({
                x: Math.random() * canvas.width, 
                y: Math.random() * canvas.height,
                speed: Math.random() * 0.5 + 0.1,
                size: Math.random() * 3 + 1,
                wobble: Math.random() * Math.PI * 2,
                color: pColors[Math.floor(Math.random() * pColors.length)]
            });
        }

        // 3. Load Entity State Machines
        this.bgEntities = fishInstances.map(fish => {
            const img = new Image();
            img.src = fish.art.imageDataUrl;
            
            const sMap = { 'Tiny': 0.3, 'Small': 0.5, 'Medium': 0.7, 'Large': 1.1, 'Massive': 1.6 };
            const scale = sMap[fish.physical.sizeTier] || 0.8;
            const initialVx = (Math.random() > 0.5 ? 1 : -1) * (0.3 + Math.random() * 0.5);

            return {
                fish: fish,
                family: fish.identity.family,
                img: img,
                x: Math.random() * canvas.width,
                y: Math.random() * (canvas.height - 200) + 100,
                baseY: Math.random() * (canvas.height - 250) + 100,
                vx: initialVx,
                vy: (Math.random() - 0.5) * 0.2,
                facing: Math.sign(initialVx),
                scale: scale,
                bobPhase: Math.random() * Math.PI * 2,
                timer: Math.random() * 2,
                state: 'roam'
            };
        });

        let lastTime = performance.now();

        // 4. The Render Loop
        const loop = (time) => {
            if (!document.getElementById('z200-menus') || document.getElementById('z200-menus').style.display === 'none') {
                this.stopBackgroundLoop();
                return;
            }

            const dt = Math.min((time - lastTime) / 1000, 0.1); 
            lastTime = time;

            ctx.clearRect(0, 0, canvas.width, canvas.height);

            // Water Gradient
            const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
            grad.addColorStop(0, pal.water);
            grad.addColorStop(1, pal.deepWater);
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            // Particles
            ctx.fillStyle = '#FFFFFF';
            particles.forEach(p => {
                p.y -= p.speed * dt * 40; 
                p.wobble += 0.02;
                if (p.y < 0) {
                    p.y = canvas.height;
                    p.x = Math.random() * canvas.width;
                }
                const drawX = p.x + Math.sin(p.wobble) * 2;
                ctx.fillStyle = p.color;
                ctx.fillRect(drawX, p.y, p.size, p.size);
            });

            // Sea Floor & Flora
            const floorY = canvas.height - 80;
            ctx.fillStyle = pal.land;
            ctx.fillRect(0, floorY, canvas.width, 80);
            
            ctx.fillStyle = pal.rock;
            for(let i = 0; i < canvas.width / 60 + 1; i++) {
                ctx.beginPath();
                ctx.moveTo(i * 60, floorY);
                ctx.lineTo(i * 60 + 30, floorY - 30 + (i % 2 * 10));
                ctx.lineTo(i * 60 + 60, floorY);
                ctx.fill();
            }

            if (this.bgThemeId !== 'abyssal') {
                ctx.fillStyle = pal.flora;
                const baseSway = Math.sin(time / 1000) * 3;
                for(let i = 0; i < canvas.width / 40 + 1; i++) {
                    const baseX = 10 + i * 40;
                    for (let s = 0; s < 3; s++) {
                        const height = 15 + ((i * 7 + s * 13) % 30);
                        const stalkX = baseX + s * 6;
                        for (let seg = 0; seg < height; seg += 4) {
                            const sway = (seg / height) * baseSway * (s + 1.5);
                            ctx.fillRect(stalkX + sway, floorY - seg - 4, 3, 4);
                            if (seg > 4 && (seg + s) % 3 !== 0) {
                                const leafDir = (seg % 8 === 0) ? -3 : 3;
                                ctx.fillRect(stalkX + sway + leafDir, floorY - seg - 2, 3, 2);
                            }
                        }
                    }
                }
            }

// Fish AI (Wraparound bounds instead of bouncing)
            this.bgEntities.forEach(ent => {
                const w = ent.img.complete ? ent.img.width * ent.scale : 20;
                const h = ent.img.complete ? ent.img.height * ent.scale : 20;
                let bobY = 0;

                if (ent.family === 'crustacean') {
                    // FIX: Adjusted targetY so the visual feet touch the floor line
                    const targetY = floorY - (h * 0.2); 
                    ent.y += (targetY - ent.y) * 2 * dt; 
                    ent.timer -= dt;
                    if (ent.timer <= 0) {
                        if (ent.state === 'scuttle') { ent.state = 'rest'; ent.vx = 0; ent.timer = Math.random() * 2 + 1; } 
                        else { ent.state = 'scuttle'; ent.vx = (Math.random() > 0.5 ? 1 : -1) * (0.2 + Math.random() * 0.3); ent.timer = Math.random() * 3 + 1; }
                    }
                    ent.x += ent.vx * 60 * dt;
                } else if (ent.family === 'jellyfish') {
                    ent.timer -= dt;
                    if (ent.timer <= 0) {
                        ent.vy = -0.6 - Math.random() * 0.4; ent.vx = (Math.random() - 0.5) * 0.3; ent.timer = Math.random() * 1.5 + 1.0;
                    }
                    ent.vy += 0.4 * dt; 
                    ent.x += ent.vx * 60 * dt; ent.y += ent.vy * 60 * dt;
                    bobY = Math.sin(ent.bobPhase) * 8; ent.bobPhase += dt * 3;
                } else if (ent.family === 'cephalopod') {
                    ent.timer -= dt;
                    if (ent.timer <= 0) {
                        if (ent.state === 'jet') { ent.state = 'rest'; ent.timer = Math.random() * 2 + 1; } 
                        else { ent.state = 'jet'; ent.vx = (Math.random() > 0.5 ? 1 : -1) * (1.2 + Math.random() * 1.0); ent.vy = (Math.random() - 0.5) * 0.6; ent.timer = 0.4 + Math.random() * 0.4; }
                    }
                    if (ent.state === 'rest') { ent.vx *= 1 - (2 * dt); ent.vy *= 1 - (2 * dt); }
                    ent.x += ent.vx * 60 * dt; ent.y += ent.vy * 60 * dt;
                    bobY = Math.sin(ent.bobPhase) * 3; ent.bobPhase += dt * 4;
                } else if (ent.family === 'shark') {
                    if (Math.random() < 0.005) ent.vx = -ent.vx; 
                    ent.y += (ent.baseY - ent.y) * 0.5 * dt; 
                    const speedX = Math.sign(ent.vx) * (0.8 + Math.abs(ent.vx)*0.2); 
                    ent.x += speedX * 60 * dt;
                } else if (ent.family === 'ray') {
                    // FIX: Skim just above the rocks
                    const targetY = floorY - (h * 0.3); 
                    ent.y += (targetY - ent.y) * 0.8 * dt; 
                    if (Math.random() < 0.01) ent.vx = (Math.random() > 0.5 ? 1 : -1) * (0.4 + Math.random() * 0.3);
                    ent.x += ent.vx * 60 * dt;
                    bobY = Math.sin(ent.bobPhase) * 6; ent.bobPhase += dt * 1.5;
                } else if (ent.family === 'eel') {
                    if (Math.random() < 0.01) ent.vx = (Math.random() > 0.5 ? 1 : -1) * (0.4 + Math.random() * 0.4);
                    if (Math.random() < 0.02) ent.vy = (Math.random() - 0.5) * 0.5;
                    ent.x += ent.vx * 60 * dt; ent.y += ent.vy * 60 * dt;
                    bobY = Math.sin(ent.bobPhase) * 12; ent.bobPhase += dt * 5;
                } else {
                    if (Math.random() < 0.01) ent.vx = (Math.random() > 0.5 ? 1 : -1) * (0.3 + Math.random() * 0.5);
                    if (Math.random() < 0.02) ent.vy = (Math.random() - 0.5) * 0.4;
                    ent.x += ent.vx * 60 * dt; ent.y += ent.vy * 60 * dt;
                    bobY = Math.sin(ent.bobPhase) * 4; ent.bobPhase += dt * 2;
                }

                if (Math.abs(ent.vx) > 0.05) ent.facing = Math.sign(ent.vx);
                
                // Wraparound Screen Edge
                if (ent.x < -w) { ent.x = canvas.width + w; ent.y = Math.random() * (canvas.height - 200) + 50; }
                if (ent.x > canvas.width + w) { ent.x = -w; ent.y = Math.random() * (canvas.height - 200) + 50; }
                
                if (ent.y < 50) { ent.y = 50; ent.vy = Math.abs(ent.vy); }
                
                // FIX: Relaxed the bottom boundary to allow fish to visually overlap the floor
                if (ent.y > floorY - (h * 0.2)) { ent.y = floorY - (h * 0.2); ent.vy = -Math.abs(ent.vy); }

                if (ent.img.complete) {
                    ctx.save();
                    ctx.translate(ent.x, ent.y + bobY);
                    if (ent.facing < 0) ctx.scale(-1, 1);
                    ctx.drawImage(ent.img, -w/2, -h/2, w, h);
                    ctx.restore();
                }
            });

            this.bgAnimFrame = requestAnimationFrame(loop);
        };

        this.bgAnimFrame = requestAnimationFrame(loop);
    },

    stopBackgroundLoop() {
        if (this.bgAnimFrame) {
            cancelAnimationFrame(this.bgAnimFrame);
            this.bgAnimFrame = null;
        }
    }
};