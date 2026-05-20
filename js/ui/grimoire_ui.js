/**
 * js/ui/grimoire_ui.js
 * Manages the Grimoire (Pause Menu): Map, Character, Inventory, and Loadout.
 * V4 - Delta Comparison Math, Gear Swapping, and Upgrade Visualization.
 */

import { SFX } from '../audio/sfx_generator.js';
import { PlayerEngine, STAT_DESCRIPTIONS } from '../data/player_data.js';
import { renderGlobalMap } from '../exploration/map_renderer.js';
import { BIOMES } from '../exploration/biomes.js';
import { DissectionEngine } from '../data/fish_dissection.js';
import { LureCrafter } from '../fishing/lure_crafter.js';
import { AlchemyCrafter } from '../fishing/alchemy_crafter.js';
import { showStatTooltip, moveStatTooltip, hideStatTooltip, buildStatSlider, getRarityColor, getItemColor } from '../util/utils.js';
import { createRng } from '../util/rng.js'; 
import { generateChest } from '../art/chest_generator.js'; 
import { generateLurePart } from '../art/lure_generator.js'; 
import { generateRodData } from '../data/rod_data_generator.js';
import { EventManager } from '../events/event_manager.js';
import { GUIDE_CHAPTERS } from '../data/guide_data.js';
import { TooltipUI } from './tooltip_ui.js'; // <-- ADD THIS IMPORT
import { MerchantGenerator } from '../economy/merchant_generator.js'; // <-- ADD THIS IMPORT

export const GrimoireUI = {
    selectedMapNode: null,
    activeTab: 'map',
    gameState: null, 
    callbacks: null, 

    craftingBench: [], 
    craftingMode: 'lure', // <-- NEW: Tracks which preview mode is active

    setCraftMode(mode) {
        this.craftingMode = mode;
        SFX.playUISelect();
        this.showBenchPreview();
    },

    init(callbacks) {
        this.callbacks = callbacks;
        
        const tabs = document.querySelectorAll('.grim-tab');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                tabs.forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                SFX.playUISelect();
                
                document.querySelectorAll('.grim-page').forEach(page => page.style.display = 'none');

                this.activeTab = e.target.getAttribute('data-tab');
                const activePage = document.getElementById(`grim-page-${this.activeTab}`);
                if (activePage) activePage.style.display = 'flex'; 

                this.renderActiveTab();
            });
        });

        const grimMapCanvas = document.getElementById('grim-map-canvas');
        grimMapCanvas.addEventListener('mousedown', (e) => {
            if (!this.gameState) return;
            const world = this.gameState.world;

            const rect = grimMapCanvas.getBoundingClientRect();
            const scaleX = grimMapCanvas.width / rect.width;
            const scaleY = grimMapCanvas.height / rect.height;
            const px = (e.clientX - rect.left) * scaleX;
            const py = (e.clientY - rect.top) * scaleY;
            
            const tileW = grimMapCanvas.width / world.width;
            const tileH = grimMapCanvas.height / world.height;
            
            const gx = Math.floor(px / tileW);
            const gy = Math.floor(py / tileH);
            
            if (gx >= 0 && gx < world.width && gy >= 0 && gy < world.height) {
                this.selectedMapNode = world.nodes[gy][gx];
                SFX.playUIHover();
                this.renderMap();
            }
        });
    },

    open(state) {
        this.gameState = state;
        document.getElementById('z100-grimoire').style.display = 'flex';
        this.selectedMapNode = this.gameState.world.nodes[this.gameState.globalY][this.gameState.globalX];
        
        // --- NEW: Force reset to Map tab ---
        this.activeTab = 'map';
        
        // Reset Tab Buttons
        document.querySelectorAll('.grim-tab').forEach(t => t.classList.remove('active'));
        const mapTabBtn = document.querySelector('.grim-tab[data-tab="map"]');
        if (mapTabBtn) mapTabBtn.classList.add('active');
        
        // Reset Pages
        document.querySelectorAll('.grim-page').forEach(page => page.style.display = 'none');
        const mapPage = document.getElementById('grim-page-map');
        if (mapPage) mapPage.style.display = 'flex'; 
        
        this.renderActiveTab();
    },

    close() {
        document.getElementById('z100-grimoire').style.display = 'none';
        
        if (this.craftingBench.length > 0) {
            this.gameState.player.inventory.push(...this.craftingBench);
            this.craftingBench =[];
        }

        this.gameState = null; 
    },

    renderActiveTab() {
        if (!this.gameState) return;
        if (this.activeTab === 'map') this.renderMap();
        else if (this.activeTab === 'character') this.renderCharacter();
        else if (this.activeTab === 'cargo') this.renderCargo();     
        else if (this.activeTab === 'tackle') this.renderTackle();   
        else if (this.activeTab === 'loadout') this.renderLoadout();
        else if (this.activeTab === 'bestiary') this.renderBestiary();
        else if (this.activeTab === 'quests') this.renderQuests();
        else if (this.activeTab === 'guide') this.renderGuide(); // <-- ADD THIS LINE
    },

    // --- MAP ---
    renderMap() {
        const canvas = document.getElementById('grim-map-canvas');
        const world = this.gameState.world;
        const player = this.gameState.player;

        const incompleteQuests = [];
        const completeQuests = [];

        player.activeQuests.forEach(q => {
            let isComplete = false;
            if (q.type === 'hunt') {
                const count = player.inventory.filter(i => i.invType === 'fish' && i.id === q.targetSpeciesId).length;
                isComplete = count >= q.requiredAmount;
            } else if (q.type === 'trophy') {
                const maxW = player.inventory.filter(i => i.invType === 'fish' && i.id === q.targetSpeciesId).reduce((max, f) => Math.max(max, f.actualWeight), 0);
                isComplete = maxW >= q.requiredWeight;
            } else if (q.type === 'research') {
                let curLvl = 0;
                const bestiaryEntry = player.bestiary[q.targetSpeciesId];
                if (bestiaryEntry) {
                    if (bestiaryEntry.xp >= 250) curLvl = 3;
                    else if (bestiaryEntry.xp >= 100) curLvl = 2;
                    else curLvl = 1;
                }
                isComplete = curLvl >= q.requiredKnowledgeLevel;
            } else if (q.type === 'bounty') {
                isComplete = q.isComplete;
            } else if (q.type === 'courier') {
                // Courier is "Complete" (ready to turn in) if you are alive and at the destination
                isComplete = !q.isFailed; 
            } else if (q.type === 'crafting') {
                isComplete = player.inventory.some(item => {
                    if (item.invType !== 'lure') return false;
                    return q.requirements.every(req => item.stats[req.stat] >= req.min && item.stats[req.stat] <= req.max);
                });
            }

            if (isComplete) completeQuests.push(q);
            else incompleteQuests.push(q);
        });
        
        const activeWeather = EventManager.Weather.activeNodes;
        const activeTournaments = EventManager.Tournament.activeNodes;

        // Pass BOTH lists to the global map renderer!
        renderGlobalMap(canvas, world, BIOMES, this.selectedMapNode, incompleteQuests, completeQuests, activeWeather, activeTournaments);

        // Calculate Detail Text for the info panel
        const weather = EventManager.Weather.getWeather(this.selectedMapNode.x, this.selectedMapNode.y);
        const tournament = EventManager.Tournament.getTournament(this.selectedMapNode.x, this.selectedMapNode.y);
        let infoHtml = '';
        
        // Only reveal hazards/events if the player has actually discovered the node!
        if (this.selectedMapNode.isDiscovered) {
            // Permanent Hazards
            if (this.selectedMapNode.biomeId === 'volcanic') infoHtml += `<div style="color:var(--red-danger); font-size:1.1rem; margin-top:0.3rem;">⚠ Boiling Waters</div>`;
            if (this.selectedMapNode.biomeId === 'frozen') infoHtml += `<div style="color:var(--cyan-glow); font-size:1.1rem; margin-top:0.3rem;">⚠ Pack Ice</div>`;
            
            // Dynamic Hazards
            if (weather === 'spores') infoHtml += `<div style="color:#86EFAC; font-size:1.1rem; margin-top:0.3rem;">⚠ Toxic Spore Storm</div>`;
            else if (weather === 'shatter') infoHtml += `<div style="color:#93C5FD; font-size:1.1rem; margin-top:0.3rem;">⚠ Crystal Shatter-Storm</div>`;
            else if (weather === 'whirlpool') infoHtml += `<div style="color:#A855F7; font-size:1.1rem; margin-top:0.3rem;">⚠ Void Whirlpool</div>`;

            // Active Events
            if (tournament && !tournament.isFinished) {
                infoHtml += `<div style="color:var(--gold-warn); font-size:1.1rem; margin-top:0.3rem;">🏆 Fishing Tournament Active</div>`;
            }
        }

        document.getElementById('grim-map-coords').innerHTML = `[${this.selectedMapNode.x}, ${this.selectedMapNode.y}] ${infoHtml}`;

        const ecoContainer = document.getElementById('grim-map-ecology');
        ecoContainer.innerHTML = '';
        
        if (this.selectedMapNode.isDiscovered) {
            document.getElementById('grim-map-title').innerText = this.selectedMapNode.name;
            const b = BIOMES[this.selectedMapNode.biomeId];
            document.getElementById('grim-map-biome').innerText = b.name;
            document.getElementById('grim-map-biome').style.color = b.textColor || b.globalColor;

            const discoveredIds = this.selectedMapNode.discoveredSpecies ||[];
            const knownSpecies = discoveredIds.map(id => this.gameState.player.bestiary[id]).filter(Boolean);

            if (knownSpecies.length > 0) {
                knownSpecies.forEach(entry => {
                    const fish = entry.speciesData;
                    ecoContainer.innerHTML += `
                        <div style="display: flex; align-items: center; gap: 0.8rem; font-size: 1.1rem; padding-bottom: 0.2rem; border-bottom: 1px dashed var(--panel-border);">
                            <img src="${fish.art.imageDataUrl}" style="width: 28px; height: 28px; background: #000; border: 1px solid var(--panel-border); border-radius: 2px; image-rendering: pixelated;" />
                            <span style="color: var(--cyan-glow); font-weight: bold;">${fish.identity.name}</span>
                        </div>
                    `;
                });
            } else {
                ecoContainer.innerHTML = `<span style="color: var(--text-muted); font-style: italic;">No species cataloged here yet.</span>`;
            }
        } else {
            document.getElementById('grim-map-title').innerText = "???";
            document.getElementById('grim-map-biome').innerText = "Undiscovered Region";
            document.getElementById('grim-map-biome').style.color = "var(--text-muted)";
            ecoContainer.innerHTML = `<span style="color: var(--text-muted); font-style: italic;">Unknown Ecology</span>`;
        }

        const legend = document.getElementById('grim-map-legend');
        legend.innerHTML = '';
        for (const key in BIOMES) {
            if (key === 'hub') continue; // Skip hub in legend to save space
            const b = BIOMES[key];
            legend.innerHTML += `
                <div class="legend-item">
                    <div class="legend-color" style="background: ${b.globalColor};"></div>
                    <span>${b.name}</span>
                </div>
            `;
        }
    },

    // --- CHARACTER ---
    renderCharacter() {
        const player = this.gameState.player;

        document.getElementById('grim-char-portrait').src = player.identity.portraitData;
        document.getElementById('grim-char-name').innerText = player.identity.name;
        document.getElementById('grim-char-lore').innerText = `${player.identity.race} ${player.identity.gender}`;

        document.getElementById('grim-char-level').innerText = player.vitals.level;
        document.getElementById('grim-char-xp').innerText = player.vitals.xp;
        
        const XP_CURVE = { 1: 100, 2: 250, 3: 450, 4: 700, 5: 1000, 6: 1400, 7: 1900, 8: 2500, 9: 3200, 10: 99999 };
        const maxXP = XP_CURVE[player.vitals.level] || 99999;
        document.getElementById('grim-char-max-xp').innerText = maxXP;
        
        const xpPct = Math.min(100, (player.vitals.xp / maxXP) * 100);
        document.getElementById('grim-char-xp-fill').style.width = `${xpPct}%`;

        document.getElementById('grim-char-gold').innerText = player.vitals.gold;
        document.getElementById('grim-char-rations').innerText = player.vitals.rations;
        document.getElementById('grim-char-pts').innerText = player.availablePoints;

        const statsList = document.getElementById('grim-char-stats');
        statsList.innerHTML = '';
        
        const displayNames = {
            fishing: "Fishing", stamina: "Stamina", driving: "Driving", 
            crafting: "Crafting", bartering: "Bartering", intelligence: "Intelligence" // <-- UPDATED
        };

        for (const [key, val] of Object.entries(player.stats)) {
            const row = document.createElement('div');
            row.className = 'grim-stat-row';
            
            const buff = (player.activeBuffs || []).find(b => b.stat === key);
            
            // --- FIX: Use a fixed-width container so the '+' buttons stay perfectly aligned! ---
            let valHtml = `
                <div style="width: 90px; display: flex; justify-content: flex-end; align-items: center;">
                    <span class="grim-stat-val">${val}</span>
                </div>
            `;
            
            if (buff) {
                // Base stat in parenthesis, purple buff indicator to the side
                valHtml = `
                <div style="width: 90px; display: flex; justify-content: flex-end; align-items: center;">
                    <span class="grim-stat-val" style="width: auto; margin-right: 0.5rem;">(${val})</span>
                    <span style="color: #A855F7; font-weight: bold; font-size: 1.5rem;">+${buff.amount}</span>
                </div>
                `;
            }

            row.innerHTML = `
                <span class="grim-stat-name">${displayNames[key]}</span>
                <div class="grim-stat-controls">
                    ${valHtml}
                    <button class="grim-stat-btn" data-stat="${key}" ${(player.availablePoints <= 0 || val >= 5) ? 'disabled' : ''}>+</button>
                </div>
            `;
            
            row.querySelector('button').onclick = () => {
                if (PlayerEngine.allocateStat(player, key)) {
                    SFX.playUISelect();
                    this.renderCharacter(); 
                    if (this.callbacks.onSave) this.callbacks.onSave(); 
                }
            };

            // Add Hover Events for Tooltips
            row.addEventListener('mouseenter', (e) => showStatTooltip(displayNames[key], STAT_DESCRIPTIONS[key], e));
            row.addEventListener('mousemove', moveStatTooltip);
            row.addEventListener('mouseleave', hideStatTooltip);
            
            statsList.appendChild(row);
        }
    },

    // --- INVENTORY, CRAFTING & DELTA MATH ---

    // HELPER: Calculates the (+X) or (-Y) string with proper colors
    formatDelta(newVal, oldVal, invertGoodBad = false) {
        if (newVal === undefined || oldVal === undefined) return '';
        const diff = newVal - oldVal;
        
        if (diff === 0) return `<span style="color:var(--text-muted); font-size: 0.85em; margin-left: 0.5rem;">(+0)</span>`;
        
        let color = 'var(--green-safe)';
        // If lower is better (invertGoodBad), negative is green, positive is red
        if ((diff > 0 && invertGoodBad) || (diff < 0 && !invertGoodBad)) {
            color = 'var(--red-danger)';
        }
        
        const sign = diff > 0 ? '+' : '';
        const formattedDiff = Number.isInteger(diff) ? diff : diff.toFixed(2);
        return `<span style="color:${color}; font-size: 0.85em; margin-left: 0.5rem;">(${sign}${formattedDiff})</span>`;
    },

// --- CARGO HOLD ---
    renderCargo() {
        const player = this.gameState.player;
        const effStats = PlayerEngine.getEffectiveStats(player);
        const maxCargo = effStats.exploration.cargoSpace;
        
        document.getElementById('grim-cargo-count').innerText = player.inventory.length;
        document.getElementById('grim-cargo-max').innerText = maxCargo;
        
        const grid = document.getElementById('grim-cargo-grid');
        grid.innerHTML = '';
        
        // ---> FIX: Hide the details panel whenever the cargo is refreshed <---
        document.getElementById('grim-cargo-details').style.display = 'none';
        document.getElementById('grim-cargo-empty').style.display = 'flex';
        
        for (let i = 0; i < maxCargo; i++) {
            const slot = document.createElement('div');
            slot.className = 'inv-slot';
            
            if (i < player.inventory.length) {
                const item = player.inventory[i];
                let imgSrc = item.imageDataUrl || (item.art ? (item.art.profileDataUrl || item.art.imageDataUrl) : '');

                if (imgSrc) {
                    slot.innerHTML = `<img src="${imgSrc}" />`;
                } else {
                    const safeName = item.name || (item.identity ? item.identity.name : 'Unknown');
                    slot.innerHTML = `<span style="font-size: 0.6rem; color: #555;">${safeName.substring(0,6)}</span>`;
                }
                
                // --- NEW: Add Hover Tooltip ---
                TooltipUI.bind(slot, item, player.gear);

                slot.onclick = () => {
                    TooltipUI.hide(); // Hide tooltip when clicking to open details pane
                    this.showCargoDetails(item, i, slot);
                };
            }
            grid.appendChild(slot);
        }

        // Sorting Logic
        const sortSelect = document.getElementById('grim-cargo-sort');
        if (!sortSelect.onchange) {
            sortSelect.onchange = () => {
                const mode = sortSelect.value;
                SFX.playUISelect();

                if (mode === 'type') {
                    const typeOrder = { 'boat': 1, 'rod': 2, 'lure': 3, 'bait': 4, 'potion': 5, 'consumable': 6, 'chest': 7, 'fish': 8 };
                    player.inventory.sort((a, b) => (typeOrder[a.invType] || 99) - (typeOrder[b.invType] || 99));
                } 
                else if (mode === 'name') {
                    player.inventory.sort((a, b) => (a.name || a.identity?.name || '').localeCompare(b.name || b.identity?.name || ''));
                } 
                else if (mode === 'value') {
                    player.inventory.sort((a, b) => {
                        const valA = a.economy ? a.economy.baseValue : (a.basePrice || 0);
                        const valB = b.economy ? b.economy.baseValue : (b.basePrice || 0);
                        return valB - valA;
                    });
                }
                
                this.renderCargo();
                if (this.callbacks.onSave) this.callbacks.onSave();
            };
        }
    },

    showCargoDetails(item, invIndex, slotEl) {
        // --- NEW: Safety fallback to fix lures crafted before the patch! ---
        if (!item.invType && item.maxDurability !== undefined) item.invType = 'lure';

        document.querySelectorAll('#grim-cargo-grid .inv-slot').forEach(el => el.classList.remove('selected'));
        slotEl.classList.add('selected');
        
        document.getElementById('grim-cargo-empty').style.display = 'none';
        document.getElementById('grim-cargo-details').style.display = 'flex';
        
        const btnAction = document.getElementById('btn-cargo-action');
        const btnEquip = document.getElementById('btn-cargo-equip');
        
        btnAction.style.display = 'none';
        btnEquip.style.display = 'none';
        
        const player = this.gameState.player;
        const itemName = item.name || (item.identity ? item.identity.name : 'Item');
        
        document.getElementById('grim-cargo-img').src = item.imageDataUrl || (item.art ? (item.art.profileDataUrl || item.art.imageDataUrl) : '');
        document.getElementById('grim-cargo-name').innerText = itemName;
        document.getElementById('grim-cargo-name').style.color = getItemColor(item);
        
        // --- RESTORED: Dynamic Subtitles (With Safety Fallback) ---
        let subtitle = (item.invType || 'BROKEN ITEM').toUpperCase();
        if (item.invType === 'fish') subtitle = `${item.identity.rarity} ${item.identity.family.charAt(0).toUpperCase() + item.identity.family.slice(1)}`;
        else if (item.invType === 'lure') subtitle = `Custom Lure (${item.componentsUsed || '?'} Parts)`;
        else if (item.invType === 'rod') subtitle = `${item.identity.rarity} Fishing Rod`;
        else if (item.invType === 'boat') subtitle = `${item.identity.rarity} ${item.art.boatType.toUpperCase()}`;
        else if (item.invType === 'chest' || item.invType === 'chest_encounter') subtitle = `Unknown Contents`;
        else if (item.invType === 'potion') subtitle = `Alchemical Draught`;
        else if (item.invType === 'bait') subtitle = `Targeted Bait`;
        else if (item.invType === 'consumable') subtitle = `Survival Supply`;
        else if (item.invType === 'upgrade') subtitle = `Boat Upgrade [${item.slot.toUpperCase()}]`;
        
        document.getElementById('grim-cargo-sub').innerText = subtitle;
        
        const statsEl = document.getElementById('grim-cargo-stats');
        statsEl.innerHTML = '';

        // 1. FISH
        if (item.invType === 'fish') {
            statsEl.innerHTML = `
                <div style="display:flex; justify-content:space-between;"><span>Size:</span> <span>${item.physical.sizeTier}</span></div>
                <div style="display:flex; justify-content:space-between;"><span>Weight:</span> <span>${item.actualWeight} kg</span></div>
                <div style="display:flex; justify-content:space-between;"><span>Habitat:</span> <span style="text-transform:capitalize;">${item.environment.depthPref}</span></div>
                <div style="display:flex; justify-content:space-between;"><span>Value:</span> <span style="color:var(--gold-warn);">${item.economy.baseValue}g</span></div>
            `;
            
            btnAction.style.display = 'block';
            btnAction.innerText = '🔪 Dissect';
            btnAction.style.borderColor = 'var(--red-danger)';
            btnAction.style.color = 'var(--red-danger)';
            btnAction.onclick = () => {
                SFX.playLineSnap(); 
                const result = DissectionEngine.dissect(item, player.stats.crafting, Date.now());
                player.inventory.splice(invIndex, 1);
                
                if (!player.bestiary[item.id]) player.bestiary[item.id] = { xp: 0, caught: 0, speciesData: item };
                const effStats = PlayerEngine.getEffectiveStats(player);
                player.bestiary[item.id].xp += Math.round(result.knowledgeGain * effStats.economy.knowledgeXpMult);
                
                result.parts.forEach(p => { p.invType = 'part'; player.reagents.push(p); });
                
                if (this.callbacks.onSave) this.callbacks.onSave();
                this.renderCargo();
            };

            const rationsGained = { 'Tiny': 1, 'Small': 2, 'Medium': 4, 'Large': 8, 'Massive': 16 }[item.physical.sizeTier] || 1;
            const isFull = player.vitals.rations >= 20;

            btnEquip.style.display = 'block';
            btnEquip.innerText = isFull ? 'Rations Full' : `🔥 Cook (+${rationsGained})`;
            btnEquip.style.borderColor = isFull ? 'var(--panel-border)' : 'var(--warn)';
            btnEquip.style.color = isFull ? 'var(--text-muted)' : 'var(--warn)';
            btnEquip.disabled = isFull;

            btnEquip.onclick = () => {
                if (isFull) return;
                SFX.playUISelect(); 
                player.vitals.rations = Math.min(20, player.vitals.rations + rationsGained);
                player.inventory.splice(invIndex, 1);
                if (this.callbacks.onSave) this.callbacks.onSave();
                this.renderCargo(); 
            };
        } 
// 2. POTIONS
        else if (item.invType === 'potion') {
            const buff = item.buff || { durationMins: 0, amount: 0, statName: '?' };
            statsEl.innerHTML = `<div style="text-align:center; padding: 1rem 0;">Grants <b style="color:var(--cyan-glow);">+${buff.amount} ${buff.statName}</b><br>for ${Math.floor(buff.durationMins / 60)}h ${buff.durationMins % 60}m.</div>`;
            btnAction.style.display = 'block';
            
            // --- NEW: Check for Existing Buffs on this specific stat ---
            const existingBuffIndex = player.activeBuffs ? player.activeBuffs.findIndex(b => b.stat === buff.stat) : -1;
            const existingBuff = existingBuffIndex > -1 ? player.activeBuffs[existingBuffIndex] : null;

            // Block consumption if a stronger buff is already running
            if (existingBuff && existingBuff.amount > buff.amount) {
                btnAction.innerText = 'Stronger Buff Active';
                btnAction.style.borderColor = 'var(--panel-border)';
                btnAction.style.color = 'var(--text-muted)';
                btnAction.onclick = () => { SFX.playError(); };
            } 
            // Standard 3-buff limit
            else if (!existingBuff && player.activeBuffs && player.activeBuffs.length >= 3) {
                btnAction.innerText = 'Max Buffs Reached';
                btnAction.style.borderColor = 'var(--panel-border)';
                btnAction.style.color = 'var(--text-muted)';
                btnAction.onclick = () => { SFX.playError(); };
            } 
            // Allow drinking (replaces old buff if it exists)
            else {
                btnAction.innerText = existingBuff ? '🧪 Drink Potion (Refresh)' : '🧪 Drink Potion';
                btnAction.style.borderColor = '#A855F7';
                btnAction.style.color = '#A855F7';
                btnAction.onclick = () => {
                    SFX.playUISelect();
                    if (!item.buff.maxDurationMins) item.buff.maxDurationMins = item.buff.durationMins;
                    
                    // If an older/weaker buff for this stat exists, remove it before applying the new one
                    if (existingBuff) {
                        player.activeBuffs.splice(existingBuffIndex, 1);
                    }
                    
                    player.activeBuffs.push(item.buff);
                    player.inventory.splice(invIndex, 1);
                    if (this.callbacks.onSave) this.callbacks.onSave();
                    this.renderCargo();
                };
            }
        }

// 3. BAITS
        else if (item.invType === 'bait') {
            // FIX: Safely fallback variables so corrupted items don't crash the UI
            const targetFam = item.targetFamily || 'Unknown';
            const charges = item.charges || 0;
            const maxC = item.maxCharges || 0;
            const rarityB = item.rarityBoostPct || 0;

            statsEl.innerHTML = `<div style="text-align:center; padding: 1rem 0;">Attracts: <b style="color:var(--gold-warn);">${targetFam}</b><br>Charges: ${charges}/${maxC}<br>Rarity Boost: <span style="color:var(--green-safe);">+${rarityB}%</span></div>`;
            
            btnEquip.style.display = 'block';
            btnEquip.innerText = charges > 0 ? 'Equip Bait' : 'Discard Broken Item';
            btnEquip.style.borderColor = charges > 0 ? 'var(--green-safe)' : 'var(--red-danger)';
            btnEquip.style.color = charges > 0 ? 'var(--green-safe)' : 'var(--red-danger)';
            
            btnEquip.onclick = () => {
                SFX.playUISelect();
                if (charges > 0) {
                    const oldBait = player.gear.bait;
                    player.gear.bait = player.inventory.splice(invIndex, 1)[0];
                    if (oldBait) player.inventory.push(oldBait);
                } else {
                    // It's a broken item, delete it to clean the inventory
                    player.inventory.splice(invIndex, 1);
                }
                if (this.callbacks.onSave) this.callbacks.onSave();
                this.renderCargo();
            };
        }

        // --- RESTORED: 4. LURES ---
        else if (item.invType === 'lure') {
            const eqLure = player.gear.lure || { stats: {color:0, sound:0, light:0, weight:0}, durability: 0, maxDurability: 0 };
            
            statsEl.innerHTML = `
                <div style="display:flex; justify-content:space-between; margin-bottom:1.5rem; border-bottom: 1px solid var(--panel-border); padding-bottom: 1rem;">
                    <span>Durability:</span> <span>${item.durability}/${item.maxDurability} ${TooltipUI.formatDelta(item.maxDurability, eqLure.maxDurability)}</span>
                </div>
                ${buildStatSlider('Color', item.stats.color, 'Cold', 'Warm', TooltipUI.formatDelta(item.stats.color, eqLure.stats.color))}
                ${buildStatSlider('Sound', item.stats.sound, 'Silent', 'Loud', TooltipUI.formatDelta(item.stats.sound, eqLure.stats.sound))}
                ${buildStatSlider('Light', item.stats.light, 'Dark', 'Glow', TooltipUI.formatDelta(item.stats.light, eqLure.stats.light))}
                ${buildStatSlider('Weight', item.stats.weight, 'Float', 'Sink', TooltipUI.formatDelta(item.stats.weight, eqLure.stats.weight))}
            `;
            
            btnEquip.style.display = 'block';
            btnEquip.innerText = 'Equip Lure';
            btnEquip.style.borderColor = 'var(--green-safe)';
            btnEquip.style.color = 'var(--green-safe)';
            btnEquip.onclick = () => {
                SFX.playUISelect();
                const oldLure = player.gear.lure;
                player.gear.lure = player.inventory.splice(invIndex, 1)[0];
                if (oldLure && oldLure.maxDurability > 0) player.inventory.push(oldLure);
                if (this.callbacks.onSave) this.callbacks.onSave();
                this.renderCargo();
            };
        }
        // --- RESTORED: 5. RODS ---
        else if (item.invType === 'rod') {
            const eqRod = player.gear.rod || { stats: { power: 0, maxTension: 0, flexibility: 0, sensitivity: 0 } };
            
            statsEl.innerHTML = `
                <div style="display:flex; justify-content:space-between;"><span>Power:</span> <span>${item.stats.power}x ${TooltipUI.formatDelta(item.stats.power, eqRod.stats.power)}</span></div>
                <div style="display:flex; justify-content:space-between;"><span>Max Tension:</span> <span>${item.stats.maxTension} ${TooltipUI.formatDelta(item.stats.maxTension, eqRod.stats.maxTension)}</span></div>
                <div style="display:flex; justify-content:space-between;"><span>Flexibility:</span> <span>${item.stats.flexibility}x ${TooltipUI.formatDelta(item.stats.flexibility, eqRod.stats.flexibility)}</span></div>
                <div style="display:flex; justify-content:space-between;"><span>Sensitivity:</span> <span>${item.stats.sensitivity}ms ${TooltipUI.formatDelta(item.stats.sensitivity, eqRod.stats.sensitivity)}</span></div>
            `;
            
            btnEquip.style.display = 'block';
            btnEquip.innerText = 'Equip Rod';
            btnEquip.style.borderColor = 'var(--green-safe)';
            btnEquip.style.color = 'var(--green-safe)';
            btnEquip.onclick = () => {
                SFX.playUISelect();
                const oldRod = player.gear.rod;
                player.gear.rod = player.inventory.splice(invIndex, 1)[0];
                if (oldRod) player.inventory.push(oldRod);
                if (this.callbacks.onSave) this.callbacks.onSave();
                this.renderCargo();
            };
        }
        // --- RESTORED: 6. BOATS ---
        else if (item.invType === 'boat') {
            const eqBoat = player.gear.boat;
            statsEl.innerHTML = `
                <div style="display:flex; justify-content:space-between;"><span>Hull HP:</span> <span>${item.stats.maxHp} ${TooltipUI.formatDelta(item.stats.maxHp, eqBoat.stats.maxHp)}</span></div>
                <div style="display:flex; justify-content:space-between;"><span>Speed:</span> <span>${item.stats.speed} ${TooltipUI.formatDelta(item.stats.speed, eqBoat.stats.speed)}</span></div>
                <div style="display:flex; justify-content:space-between;"><span>Stealth:</span> <span>${item.stats.stealth}x ${TooltipUI.formatDelta(item.stats.stealth, eqBoat.stats.stealth)}</span></div>
                <div style="display:flex; justify-content:space-between;"><span>Base Cargo:</span> <span>${item.stats.cargoSpace} ${TooltipUI.formatDelta(item.stats.cargoSpace, eqBoat.stats.cargoSpace)}</span></div>
                <div style="margin-top:1.5rem; text-align:center; color:var(--gold-warn); font-style:italic; font-size:1.1rem;">
                    Boats cannot be carried in your backpack.<br>Access your Safehouse Dry Dock to manage hulls.
                </div>
            `;
        }
        // --- RESTORED: 7. UPGRADES ---
        else if (item.invType === 'upgrade') {
            statsEl.innerHTML = `
                <div style="color:var(--text-main); font-size:1.2rem; text-align:center; padding: 1rem 0;">
                    ${item.desc}
                </div>
                <div style="margin-top:1rem; text-align:center; color:var(--gold-warn); font-style:italic; font-size:1.1rem;">
                    Upgrades must be installed using the crane at a Safehouse Dry Dock.
                </div>
            `;
        }
        // 8. CONSUMABLES
        else if (item.invType === 'consumable') {
            statsEl.innerHTML = `<div style="text-align:center; padding:1rem 0;">${item.desc}</div>`;
            btnAction.style.display = 'block';
            btnAction.innerText = 'Use Item';
            btnAction.style.borderColor = 'var(--cyan-glow)';
            btnAction.style.color = 'var(--cyan-glow)';
            btnAction.onclick = () => {
                SFX.playUISelect();
                if (item.id === 'cons_repair_kit') player.vitals.hp = Math.min(player.gear.boat.stats.maxHp, player.vitals.hp + 25);
                else if (item.id === 'cons_ration') player.vitals.rations = Math.min(20, player.vitals.rations + 1);
                else if (item.id === 'cons_fuel_oil') player.vitals.fuel = 100;
                
                player.inventory.splice(invIndex, 1);
                if (this.callbacks.onSave) this.callbacks.onSave();
                this.renderCargo();
            };
        }
// 9. CHESTS
        else if (item.invType === 'chest' || item.invType === 'chest_encounter') {
            statsEl.innerHTML = `<div style="text-align:center; padding: 2rem 0;">A heavy, waterlogged chest.</div>`;
            btnAction.style.display = 'block';
            btnAction.innerText = '🔓 Open Chest';
            btnAction.style.borderColor = 'var(--gold-warn)';
            btnAction.style.color = 'var(--gold-warn)';
            btnAction.onclick = () => {
                const rng = createRng(item.chestSeed || Date.now());
                const isMimic = rng.chance(0.3); 
                player.inventory.splice(invIndex, 1);
                btnAction.style.display = 'none';

                if (isMimic) {
                    SFX.playLineSnap(); 
                    document.getElementById('grim-cargo-img').src = generateChest({ rng: createRng(item.chestSeed), isMimic: true }).imageDataUrl;
                    document.getElementById('grim-cargo-name').innerText = 'Mimic!';
                    document.getElementById('grim-cargo-name').style.color = 'var(--red-danger)';
                    statsEl.innerHTML = `<div style="color:var(--red-danger); font-size:1.4rem; text-align:center; padding: 2rem 0;">It bit you!<br>Hull took 20 damage!</div>`;
                    player.vitals.hp -= 20;
                    if (this.callbacks.onSave) this.callbacks.onSave();
                    this._refreshCargoGridOnly();
                    if (player.vitals.hp <= 0 && this.callbacks.onDeath) {
                        setTimeout(() => { this.close(); this.callbacks.onDeath(); }, 1500); 
                    }
                } else {
                    SFX.playGold();
                    const goldFound = rng.int(150, 400);
                    player.vitals.gold += goldFound;
                    let lootHtml = `<div style="color:var(--green-safe); font-size:1.4rem; text-align:center; margin-bottom:1rem;">Found ${goldFound}g!</div>`;
                    
                    // 1. Rare Parts
                    const rareParts =['phosphor_cap', 'wraith_silk', 'myconid_spore', 'jelly_bell'];
                    const numParts = rng.int(1, 2);
                    for(let i=0; i<numParts; i++) {
                        const pId = rng.pick(rareParts);
                        const pName = pId.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                        player.reagents.push({
                            id: `part_${rng.int(10000,99999)}`, invType: 'part', name: pName, visualId: pId, rarity: 'Rare',
                            stats: { color: rng.int(-20,20), sound: rng.int(-20,20), light: rng.int(-20,20), weight: rng.int(-20,20) },
                            // FIX: use a unique sub-seed so the parts don't all look identical
                            imageDataUrl: generateLurePart({ visualId: pId, rng: createRng(Date.now() + i) }) 
                        });
                        lootHtml += `<div style="color:var(--cyan-glow); font-size:1.2rem; text-align:center; margin-bottom:0.2rem;">+1x ${pName} (To Reagents)</div>`;
                    }
                    
                    // --- NEW: 2. Crafted Item (Lure, Potion, Bait) ---
                    // 75% chance to find a high-quality crafted item
                    if (rng.chance(0.75)) {
                        const craftType = rng.pick(['lure', 'potion', 'bait']);
                        // Generates a masterwork item (Level 3 to 5 crafting strength)
                        const craftedItem = MerchantGenerator._createRandomCraftedItem(craftType, createRng(rng.next() * 100000), rng.int(3, 5));
                        
                        if (craftedItem) {
                            craftedItem.invType = craftType;
                            player.inventory.push(craftedItem);
                            const cColor = craftType === 'potion' ? '#A855F7' : (craftType === 'bait' ? 'var(--gold-warn)' : 'var(--cyan-glow)');
                            lootHtml += `<div style="color:${cColor}; font-size:1.2rem; text-align:center; margin-top:0.8rem;">+ ${craftedItem.name}!</div>`;
                        }
                    }

                    // 3. Rod
                    if (rng.chance(0.15)) {
                        const rod = generateRodData({ seed: Date.now() });
                        rod.invType = 'rod';
                        player.inventory.push(rod);
                        lootHtml += `<div style="color:var(--gold-warn); font-size:1.2rem; text-align:center; margin-top:0.8rem;">+ ${rod.identity.name}!</div>`;
                    }
                    
                    statsEl.innerHTML = lootHtml;
                    document.getElementById('grim-cargo-name').innerText = 'Treasure!';
                    if (this.callbacks.onSave) this.callbacks.onSave();
                    this._refreshCargoGridOnly();
                }
            };
        }
        SFX.playUISelect();
    },

    _refreshCargoGridOnly() {
        const player = this.gameState.player;
        const maxCargo = PlayerEngine.getEffectiveStats(player).exploration.cargoSpace;
        document.getElementById('grim-cargo-count').innerText = player.inventory.length;
        document.getElementById('grim-cargo-max').innerText = maxCargo;
        
        const grid = document.getElementById('grim-cargo-grid');
        grid.innerHTML = '';
        
        for (let i = 0; i < maxCargo; i++) {
            const slot = document.createElement('div');
            slot.className = 'inv-slot';
            if (i < player.inventory.length) {
                const item = player.inventory[i];
                let imgSrc = item.imageDataUrl || (item.art ? (item.art.profileDataUrl || item.art.imageDataUrl) : '');
                
                if (imgSrc) {
                    slot.innerHTML = `<img src="${imgSrc}" />`;
                } else {
                    // FIX: Safely fallback if name is undefined
                    const safeName = item.name || (item.identity ? item.identity.name : 'Unknown');
                    slot.innerHTML = `<span style="font-size: 0.6rem; color: #555;">${safeName.substring(0,6)}</span>`;
                }
                
                slot.onclick = () => this.showCargoDetails(item, i, slot);
            }
            grid.appendChild(slot);
        }
    },

    // --- TACKLE BOX & CRAFTING ---
    renderTackle() {
        const player = this.gameState.player;
        const benchGrid = document.getElementById('grim-craft-slots');
        benchGrid.innerHTML = '';
        
        // Render Crafting Bench
        for (let i = 0; i < 5; i++) {
            const slot = document.createElement('div');
            slot.className = 'craft-slot';
            if (i < this.craftingBench.length) {
                const part = this.craftingBench[i];
                slot.innerHTML = `<img src="${part.imageDataUrl}" />`;
                slot.style.borderColor = 'var(--cyan-glow)';
                
                // --- NEW: Add Hover Tooltip ---
                TooltipUI.bind(slot, part, player.gear);

                slot.onclick = () => {
                    TooltipUI.hide();
                    SFX.playUIHover();
                    player.reagents.push(this.craftingBench.splice(i, 1)[0]);
                    this.renderTackle();
                };
            }
            benchGrid.appendChild(slot);
        }

        document.getElementById('grim-tackle-count').innerText = player.reagents.length;
        
        const grid = document.getElementById('grim-tackle-grid');
        grid.innerHTML = '';
        
        player.reagents.forEach((item, i) => {
            const slot = document.createElement('div');
            slot.className = 'inv-slot';
            slot.innerHTML = `<img src="${item.imageDataUrl}" />`;
            
            // --- NEW: Add Hover Tooltip ---
            TooltipUI.bind(slot, item, player.gear);

            slot.onclick = () => {
                TooltipUI.hide();
                this.showTackleDetails(item, i, slot);
            };
            grid.appendChild(slot);
        });
        
        this.showBenchPreview();
    },

    showTackleDetails(item, invIndex, slotEl) {
        document.querySelectorAll('#grim-tackle-grid .inv-slot').forEach(el => el.classList.remove('selected'));
        slotEl.classList.add('selected');
        
        document.getElementById('grim-tackle-empty').style.display = 'none';
        document.getElementById('grim-tackle-details').style.display = 'flex';
        document.getElementById('btn-group-craft').style.display = 'none';
        
        const btnAction = document.getElementById('btn-tackle-action');
        
        document.getElementById('grim-tackle-img').src = item.imageDataUrl;
        document.getElementById('grim-tackle-img').style.display = 'block';
        document.getElementById('grim-tackle-name').innerText = item.name;
        document.getElementById('grim-tackle-name').style.color = getItemColor(item);
        document.getElementById('grim-tackle-sub').innerText = `${item.rarity} Reagent`;
        
        document.getElementById('grim-tackle-stats').innerHTML = `
            ${buildStatSlider('Color', item.stats.color, 'Cold', 'Warm')}
            ${buildStatSlider('Sound', item.stats.sound, 'Silent', 'Loud')}
            ${buildStatSlider('Light', item.stats.light, 'Dark', 'Glow')}
            ${buildStatSlider('Weight', item.stats.weight, 'Float', 'Sink')}
        `;
        
        if (this.craftingBench.length < 5) {
            btnAction.style.display = 'block';
            btnAction.innerText = '⬆ Add to Bench';
            btnAction.style.borderColor = 'var(--cyan-glow)';
            btnAction.style.color = 'var(--cyan-glow)';
            
            btnAction.onclick = () => {
                SFX.playUIHover();
                this.craftingBench.push(this.gameState.player.reagents.splice(invIndex, 1)[0]);
                this.renderTackle();
            };
        } else {
            btnAction.style.display = 'none';
        }
        SFX.playUISelect();
    },

    showBenchPreview() {
        document.querySelectorAll('#grim-tackle-grid .inv-slot').forEach(el => el.classList.remove('selected'));
        
        if (this.craftingBench.length === 0) {
            document.getElementById('grim-tackle-details').style.display = 'none';
            document.getElementById('grim-tackle-empty').style.display = 'flex';
            return;
        }

        if (!this.craftingMode) this.craftingMode = 'lure';

        document.getElementById('grim-tackle-empty').style.display = 'none';
        document.getElementById('grim-tackle-details').style.display = 'flex';
        
        document.getElementById('grim-tackle-img').style.display = 'none'; 
        document.getElementById('grim-tackle-name').innerText = "Alchemy & Crafting";
        document.getElementById('grim-tackle-name').style.color = 'var(--text-main)';
        document.getElementById('grim-tackle-sub').innerText = `${this.craftingBench.length} / 5 Parts Selected`;

        // 1. Build the Category Selection Tabs (Flex-wrap prevents horizontal scrolling)
        let modeTabs = `
            <div style="display:flex; gap:0.5rem; margin-bottom: 1.5rem; flex-wrap: wrap;">
                <button id="btn-preview-lure" class="menu-btn" style="flex:1; padding:0.4rem; font-size:1rem; margin:0; border-color:${this.craftingMode==='lure'?'var(--cyan-glow)':'var(--panel-border)'}; color:${this.craftingMode==='lure'?'var(--cyan-glow)':'var(--text-muted)'}">🪝 Lure</button>
                <button id="btn-preview-potion" class="menu-btn" style="flex:1; padding:0.4rem; font-size:1rem; margin:0; border-color:${this.craftingMode==='potion'?'#A855F7':'var(--panel-border)'}; color:${this.craftingMode==='potion'?'#A855F7':'var(--text-muted)'}">🧪 Potion</button>
                <button id="btn-preview-bait" class="menu-btn" style="flex:1; padding:0.4rem; font-size:1rem; margin:0; border-color:${this.craftingMode==='bait'?'var(--gold-warn)':'var(--panel-border)'}; color:${this.craftingMode==='bait'?'var(--gold-warn)':'var(--text-muted)'}">🪱 Bait</button>
            </div>
        `;

        let previewHtml = '';
        let craftFunc = null;
        const player = this.gameState.player;
        const lvl = player.stats.crafting;
        
        // Hide the old hardcoded HTML buttons to clean up the UI
        const btnGroup = document.getElementById('btn-group-craft');
        if (btnGroup) btnGroup.style.display = 'none'; 
        
        const btnAction = document.getElementById('btn-tackle-action');

        // 2. Generate the dynamic preview based on the mode selected
        if (this.craftingBench.length < 3) {
            previewHtml = `<div style="text-align:center; color:var(--text-muted); font-size:1.2rem; padding: 2rem 0;">Need at least 3 parts to see preview.</div>`;
            btnAction.style.display = 'none';
        } else {
            // -- LURE PREVIEW --
            if (this.craftingMode === 'lure') {
                let tc = 0, ts = 0, tl = 0, tw = 0;
                let baseDurability = 0;
                const RARITY_DURABILITY = { 'Common': 2, 'Uncommon': 3, 'Rare': 5, 'Legendary': 8, 'Boss': 12 };
                
                this.craftingBench.forEach(p => { 
                    tc += p.stats.color; ts += p.stats.sound; tl += p.stats.light; tw += p.stats.weight; 
                    baseDurability += (RARITY_DURABILITY[p.rarity] || 2);
                });
                
                const dur = Math.floor(baseDurability * (1 + lvl * 0.1));

                previewHtml = `
                    <div style="font-size: 1.1rem; color: var(--text-main); margin-bottom: 1rem; text-align: center;">
                        Expected Durability: <span style="color:var(--cyan-glow); font-weight:bold;">${dur} Casts</span>
                    </div>
                    ${buildStatSlider('Net Color', tc, 'Cold', 'Warm')}
                    ${buildStatSlider('Net Sound', ts, 'Silent', 'Loud')}
                    ${buildStatSlider('Net Light', tl, 'Dark', 'Glow')}
                    ${buildStatSlider('Net Weight', tw, 'Float', 'Sink')}
                `;
                
                craftFunc = () => LureCrafter.craft(this.craftingBench, lvl, Date.now());
                btnAction.innerText = '🔨 Craft Lure';
                btnAction.style.borderColor = 'var(--cyan-glow)';
                btnAction.style.color = 'var(--cyan-glow)';
            } 
            // -- POTION PREVIEW --
            else if (this.craftingMode === 'potion') {
                const dummy = AlchemyCrafter.craftPotion(this.craftingBench, lvl, 0);
                if (dummy) {
                    previewHtml = `
                        <div style="text-align: center; margin-bottom: 1rem;">
                            <div style="color: var(--text-muted); font-size: 1rem; text-transform: uppercase;">Expected Result</div>
                            <div style="color: #A855F7; font-size: 1.6rem; font-weight: bold; margin: 0.5rem 0;">${dummy.name}</div>
                        </div>
                        <div class="dashboard-group">
                            <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem; font-size:1.1rem;"><span>Buffs Stat:</span> <span style="color:var(--cyan-glow); font-weight:bold;">${dummy.buff.statName}</span></div>
                            <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem; font-size:1.1rem;"><span>Potency:</span> <span style="color:var(--green-safe); font-weight:bold;">+${dummy.buff.amount}</span></div>
                            <div style="display:flex; justify-content:space-between; font-size:1.1rem;"><span>Duration:</span> <span style="color:var(--text-main); font-weight:bold;">${Math.floor(dummy.buff.durationMins / 60)}h ${dummy.buff.durationMins % 60}m</span></div>
                        </div>
                    `;
                }
                craftFunc = () => AlchemyCrafter.craftPotion(this.craftingBench, lvl, Date.now());
                btnAction.innerText = '🧪 Brew Potion';
                btnAction.style.borderColor = '#A855F7';
                btnAction.style.color = '#A855F7';
            } 
            // -- BAIT PREVIEW --
            else if (this.craftingMode === 'bait') {
                const dummy = AlchemyCrafter.craftBait(this.craftingBench, lvl, 0);
                if (dummy) {
                    previewHtml = `
                        <div style="text-align: center; margin-bottom: 1rem;">
                            <div style="color: var(--text-muted); font-size: 1rem; text-transform: uppercase;">Expected Result</div>
                            <div style="color: var(--gold-warn); font-size: 1.6rem; font-weight: bold; margin: 0.5rem 0;">${dummy.name}</div>
                        </div>
                        <div class="dashboard-group">
                            <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem; font-size:1.1rem;"><span>Attracts:</span> <span style="color:var(--gold-warn); font-weight:bold;">${dummy.targetFamily}</span></div>
                            <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem; font-size:1.1rem;"><span>Charges:</span> <span style="color:var(--text-main); font-weight:bold;">${dummy.charges} Casts</span></div>
                            <div style="display:flex; justify-content:space-between; font-size:1.1rem;"><span>Rarity Boost:</span> <span style="color:var(--green-safe); font-weight:bold;">+${dummy.rarityBoostPct}%</span></div>
                        </div>
                    `;
                }
                craftFunc = () => AlchemyCrafter.craftBait(this.craftingBench, lvl, Date.now());
                btnAction.innerText = '🪱 Mash Bait';
                btnAction.style.borderColor = 'var(--gold-warn)';
                btnAction.style.color = 'var(--gold-warn)';
            }

            // Bind the actual commit action to the button
            btnAction.style.display = 'block';
            btnAction.onclick = () => {
                if (!craftFunc) return;
                const result = craftFunc();
                if (result) {
                    SFX.playCatchSuccess(); 
                    this.gameState.player.inventory.push(result); // Sent to Cargo Hold!
                    this.craftingBench = []; 
                    if (this.callbacks.onSave) this.callbacks.onSave();
                    this.renderTackle();
                }
            };
        }

        // Inject the HTML into the panel
        document.getElementById('grim-tackle-stats').innerHTML = modeTabs + previewHtml;

        // Attach listeners to the dynamically generated mode tabs
        document.getElementById('btn-preview-lure').onclick = () => this.setCraftMode('lure');
        document.getElementById('btn-preview-potion').onclick = () => this.setCraftMode('potion');
        document.getElementById('btn-preview-bait').onclick = () => this.setCraftMode('bait');
    },

    // --- LOADOUT ---

    renderLoadout() {
        const player = this.gameState.player;
        const effStats = PlayerEngine.getEffectiveStats(player);
        const boat = player.gear.boat;
        const rod = player.gear.rod;
        const lure = player.gear.lure;
        
        // Ensure player has space in their cargo to unequip items
        const canUnequip = player.inventory.length < effStats.exploration.cargoSpace;

        // Compacted grid for boat upgrades
        let upgHtml = `<div style="display:grid; grid-template-columns: 1fr 1fr; gap: 0.2rem; font-size:0.9rem; color:var(--text-muted); margin-top:0.4rem; line-height: 1.2;">`;
        upgHtml += `<div>Lantern: <span style="color:var(--cyan-glow)">${boat.upgrades.lantern ? boat.upgrades.lantern.name : 'Basic'}</span></div>`;
        upgHtml += `<div>Plating: <span style="color:var(--cyan-glow)">${boat.upgrades.plating ? boat.upgrades.plating.name : 'Empty'}</span></div>`;
        upgHtml += `<div>Engine:  <span style="color:var(--cyan-glow)">${boat.upgrades.engine ? boat.upgrades.engine.name : 'Empty'}</span></div>`;
        upgHtml += `<div>Prow:    <span style="color:var(--cyan-glow)">${boat.upgrades.prow ? boat.upgrades.prow.name : 'Empty'}</span></div>`;
        upgHtml += `<div style="grid-column: span 2;">Storage: <span style="color:var(--cyan-glow)">${boat.upgrades.storage ? boat.upgrades.storage.name : 'Empty'}</span></div>`;
        upgHtml += `</div>`;

        document.querySelector('#loadout-boat .slot-content').innerHTML = `
            <img src="${boat.art.profileDataUrl}" />
            <div class="loadout-details" style="flex:1;">
                <b style="color: ${getItemColor(boat)}">${boat.identity.name}</b>
                <span style="display:block; font-size:0.9rem;">Type: ${boat.art.boatType.toUpperCase()} | HP: ${boat.stats.maxHp} | Space: ${boat.stats.cargoSpace}</span>
                ${upgHtml}
            </div>
        `;
        
        document.querySelector('#loadout-rod .slot-content').innerHTML = `
            <img src="${rod ? rod.art.imageDataUrl : ''}" style="display:${rod ? 'block' : 'none'};"/>
            <div class="loadout-details" style="flex:1;">
                ${rod ? `
                    <b style="color: ${getItemColor(rod)}">${rod.identity.name}</b>
                    <span style="display:block; font-size:1rem; margin-bottom:0.1rem;">Power: ${rod.stats.power}x | Tension: ${rod.stats.maxTension}</span>
                    <span style="display:block; font-size:0.9rem; color:var(--text-muted);">Flex: ${rod.stats.flexibility}x | Sensitivity: ${rod.stats.sensitivity}ms</span>
                ` : `<b style="color:var(--text-muted);">No Rod Equipped</b><span style="display:block; font-size:0.9rem; color:var(--red-danger);">Cannot Cast</span>`}
            </div>
            <button class="menu-btn btn-unequip-rod" style="padding: 0.4rem 0.8rem; font-size: 1rem; width: auto; margin:0;" ${!canUnequip || !rod ? 'disabled' : ''}>Unequip</button>
        `;
        
        const isBareHook = lure.maxDurability === 0;
        const lureImg = lure.imageDataUrl ? `<img src="${lure.imageDataUrl}" />` : `<div style="width:50px;height:50px;background:#000;border:1px solid var(--panel-border);display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:0.9rem;">Bare Hook</div>`;
        const durText = !isBareHook ? `Durability: ${lure.durability}/${lure.maxDurability}` : `Durability: ∞`;

        document.querySelector('#loadout-lure .slot-content').innerHTML = `
            ${lureImg}
            <div class="loadout-details" style="flex: 1;">
                <b style="font-size: 1.3rem;">${lure.name}</b>
                <span style="color:var(--text-main); margin-bottom:0.2rem; display:block; border-bottom:1px dashed var(--panel-border); padding-bottom:0.3rem; font-size: 0.9rem;">${durText}</span>
                ${buildStatSlider('Color', lure.stats.color, 'Cold', 'Warm')}
                ${buildStatSlider('Sound', lure.stats.sound, 'Silent', 'Loud')}
                ${buildStatSlider('Light', lure.stats.light, 'Dark', 'Glow')}
                ${buildStatSlider('Weight', lure.stats.weight, 'Float', 'Sink')}
            </div>
            <button class="menu-btn btn-unequip-lure" style="padding: 0.4rem 0.8rem; font-size: 1rem; width: auto; margin:0;" ${!canUnequip || isBareHook ? 'disabled' : ''}>Unequip</button>
        `;

        // --- Attach Unequip Button Logic ---
        const btnRod = document.querySelector('.btn-unequip-rod');
        if (btnRod && !btnRod.disabled) {
            btnRod.onclick = () => {
                SFX.playUISelect();
                player.inventory.push(player.gear.rod);
                player.gear.rod = null; // Unequip
                if (this.callbacks.onSave) this.callbacks.onSave();
                this.renderLoadout();
            };
        }

        const btnLure = document.querySelector('.btn-unequip-lure');
        if (btnLure && !btnLure.disabled) {
            btnLure.onclick = () => {
                SFX.playUISelect();
                player.inventory.push(player.gear.lure);
                player.gear.lure = {
                    name: 'Bare Hook',
                    stats: { color: 0, sound: 0, light: 0, weight: 0 },
                    durability: 0, maxDurability: 0,
                    imageDataUrl: ''
                };
                if (this.callbacks.onSave) this.callbacks.onSave();
                this.renderLoadout();
            };
        }

        const fmt = (v, isBonus=false) => {
            if (typeof v === 'number' && isBonus) {
                if (v > 1) return `<span class="dash-pos">${v}x</span>`;
                if (v < 1) return `<span class="dash-neg">${v}x</span>`;
            }
            return `<span style="color:var(--text-main); font-weight:bold;">${v}</span>`;
        };

        // --- NEW: Render Bait Slot ---
        const bait = player.gear.bait;
        if (bait) {
            document.querySelector('#loadout-bait .slot-content').innerHTML = `
                <img src="${bait.imageDataUrl}" />
                <div class="loadout-details" style="flex: 1;">
                    <b style="font-size: 1.3rem; color:var(--gold-warn);">${bait.name}</b>
                    <span style="color:var(--text-main); font-size: 0.9rem; display:block;">Attracts: ${bait.targetFamily}</span>
                    <span style="color:var(--text-muted); font-size: 0.9rem; display:block;">Charges: ${bait.charges}/${bait.maxCharges} | Rarity Boost: +${bait.rarityBoostPct}%</span>
                </div>
                <button class="menu-btn btn-unequip-bait" style="padding: 0.4rem 0.8rem; font-size: 1rem; width: auto; margin:0;" ${!canUnequip ? 'disabled' : ''}>Unequip</button>
            `;
            const btnBait = document.querySelector('.btn-unequip-bait');
            if (btnBait && !btnBait.disabled) {
                btnBait.onclick = () => {
                    SFX.playUISelect();
                    player.inventory.push(player.gear.bait);
                    player.gear.bait = null;
                    if (this.callbacks.onSave) this.callbacks.onSave();
                    this.renderLoadout();
                };
            }
        } else {
            document.querySelector('#loadout-bait .slot-content').innerHTML = `
                <div style="width:50px;height:50px;background:#000;border:1px solid var(--panel-border);display:flex;align-items:center;justify-content:center;color:var(--text-muted);font-size:0.9rem;">Empty</div>
                <div class="loadout-details" style="flex: 1;">
                    <b style="color:var(--text-muted);">No Bait Equipped</b>
                    <span style="display:block; font-size:0.9rem; color:var(--text-muted);">Standard spawn pool active.</span>
                </div>
            `;
        }
        
        document.getElementById('grim-dashboard-content').innerHTML = `
            <div class="dashboard-group">
                <h3>🎣 Minigame Physics</h3>
                <div class="grim-stat-row" style="font-size:1.2rem; padding:0.3rem 0;"><span>Reeling Power</span> ${fmt(effStats.minigame.power, true)}</div>
                <div class="grim-stat-row" style="font-size:1.2rem; padding:0.3rem 0;"><span>Hook Window</span> <span style="color:var(--cyan-glow); font-weight:bold;">${effStats.minigame.hookWindowMs}ms</span></div>
                <div class="grim-stat-row" style="font-size:1.2rem; padding:0.3rem 0;"><span>Sweet Spot Tol.</span> <span class="dash-pos">±${effStats.minigame.sweetSpotTolerance}%</span></div>
                <div class="grim-stat-row" style="font-size:1.2rem; padding:0.3rem 0;"><span>Reel Scroll Speed</span> ${fmt(effStats.minigame.reelScrollSpeed, true)}</div>
                <div class="grim-stat-row" style="font-size:1.2rem; padding:0.3rem 0;"><span>Stamina Pool</span> <span style="color:var(--text-main); font-weight:bold;">${effStats.minigame.stamina}</span></div>
                <div class="grim-stat-row" style="font-size:1.2rem; padding:0.3rem 0;"><span>Max Line Tension</span> <span style="color:var(--text-main); font-weight:bold;">${effStats.minigame.maxTension}</span></div>
            </div>
            <div class="dashboard-group">
                <h3>🗺️ Exploration & Survival</h3>
                <div class="grim-stat-row" style="font-size:1.2rem; padding:0.3rem 0;"><span>Boat Speed</span> ${fmt(effStats.exploration.speed, true)}</div>
                <div class="grim-stat-row" style="font-size:1.2rem; padding:0.3rem 0;"><span>Boat Stealth</span> ${fmt(effStats.exploration.stealth, true)}</div>
                <div class="grim-stat-row" style="font-size:1.2rem; padding:0.3rem 0;"><span>Hazard Dodge Chance</span> <span class="dash-pos">${Math.round(effStats.exploration.hazardDodgeChance * 100)}%</span></div>
            </div>
        `;
    },

    // --- BESTIARY & QUESTS ---
    
renderBestiary() {
        const player = this.gameState.player;
        let bestiaryEntries = Object.values(player.bestiary);
        
        document.getElementById('grim-bestiary-count').innerText = bestiaryEntries.length;
        
        // SORTING LOGIC
        const sortMode = document.getElementById('grim-bestiary-sort').value;
        if (sortMode === 'alpha') {
            bestiaryEntries.sort((a, b) => a.speciesData.identity.name.localeCompare(b.speciesData.identity.name));
        } else if (sortMode === 'family') {
            bestiaryEntries.sort((a, b) => a.speciesData.identity.family.localeCompare(b.speciesData.identity.family));
        } else if (sortMode === 'caught') {
            bestiaryEntries.sort((a, b) => b.caught - a.caught);
        }
        
        const grid = document.getElementById('grim-bestiary-grid');
        grid.innerHTML = '';
        
        bestiaryEntries.forEach(entry => {
            const slot = document.createElement('div');
            slot.className = 'inv-slot';
            slot.innerHTML = `<img src="${entry.speciesData.art.imageDataUrl}" />`;
            
            // --- NEW: Add Hover Tooltip (Binds to the template speciesData) ---
            TooltipUI.bind(slot, entry.speciesData, player.gear);

            slot.onclick = () => {
                TooltipUI.hide();
                this.showBestiaryDetails(entry, slot);
            };
            grid.appendChild(slot);
        });
        
        document.getElementById('grim-bestiary-details').style.display = 'none';
        document.getElementById('grim-bestiary-empty').style.display = 'flex';

        // Attach event listener to dropdown
        const sortSelect = document.getElementById('grim-bestiary-sort');
        if (!sortSelect.onchange) {
            sortSelect.onchange = () => this.renderBestiary();
        }
    },

    showBestiaryDetails(entry, slotEl) {
        document.querySelectorAll('#grim-bestiary-grid .inv-slot').forEach(el => el.classList.remove('selected'));
        slotEl.classList.add('selected');
        
        document.getElementById('grim-bestiary-empty').style.display = 'none';
        document.getElementById('grim-bestiary-details').style.display = 'flex';
        
        const fish = entry.speciesData;
        
        document.getElementById('grim-bestiary-img').src = fish.art.imageDataUrl;
        document.getElementById('grim-bestiary-name').innerText = fish.identity.name;
        
        // FIX: Revert to Cyan (Base Species) and fix undefined subtitle!
        document.getElementById('grim-bestiary-name').style.color = 'var(--cyan-glow)';
        document.getElementById('grim-bestiary-sub').innerText = `Family: ${fish.identity.family}`;
        
        const xp = entry.xp;

        let level = 1;
        let nextXp = 100;
        
        if (xp >= 250) { level = 3; nextXp = 250; } 
        else if (xp >= 100) { level = 2; nextXp = 250; }

        document.getElementById('grim-bestiary-lvl').innerText = level;
        document.getElementById('grim-bestiary-xp').innerText = xp;
        document.getElementById('grim-bestiary-next-xp').innerText = level === 3 ? "MAX" : nextXp;
        
        const xpPct = level === 3 ? 100 : Math.min(100, (xp / nextXp) * 100);
        document.getElementById('grim-bestiary-xp-fill').style.width = `${xpPct}%`;
        
        const unlocksText = level === 1 ? "Dissect to unlock Habitat and Lure Preferences." :
                            level === 2 ? "Dissect to unlock precise Lure Preferences." :
                            "Complete Biology Unlocked.";
        document.getElementById('grim-bestiary-unlocks').innerText = unlocksText;

        let statsHtml = `
            <div class="dashboard-group">
                <h3>Base Profile</h3>
                <div style="display:flex; justify-content:space-between; margin-bottom:0.4rem;"><span>Total Caught:</span> <span style="color:var(--text-main); font-weight:bold;">${entry.caught}</span></div>
                <div style="display:flex; justify-content:space-between; margin-bottom:0.4rem;"><span>Size Tier:</span> <span style="color:var(--text-main); font-weight:bold;">${fish.physical.sizeTier}</span></div>
                <div style="display:flex; justify-content:space-between; margin-bottom:0.4rem;"><span>Weight Range:</span> <span style="color:var(--text-main); font-weight:bold;">${fish.physical.weightRange.min} - ${fish.physical.weightRange.max}kg</span></div>
                <div style="display:flex; justify-content:space-between; margin-bottom:0.4rem;"><span>Combat Speed:</span> <span style="color:var(--text-main); font-weight:bold;">${fish.combat.speed}</span></div>
                <div style="display:flex; justify-content:space-between; margin-bottom:0.4rem;"><span>Combat Stamina:</span> <span style="color:var(--text-main); font-weight:bold;">${fish.combat.stamina}</span></div>
            </div>
        `;

        if (level >= 2) {
            const biomes = fish.environment.biomes.map(b => b.charAt(0).toUpperCase() + b.slice(1)).join(', ');
            statsHtml += `
                <div class="dashboard-group">
                    <h3>Habitat & Behavior (Lv.2)</h3>
                    <div style="display:flex; justify-content:space-between; margin-bottom:0.4rem;"><span>Native Biomes:</span> <span style="color:var(--cyan-glow); font-weight:bold;">${biomes}</span></div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:0.4rem;"><span>Depth:</span> <span style="color:var(--text-main); font-weight:bold;">${fish.environment.depthPref}</span></div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:0.4rem;"><span>Active:</span> <span style="color:var(--text-main); font-weight:bold;">${fish.environment.activeHours}</span></div>
                    
                    <div style="display:flex; justify-content:space-between; margin-bottom:0.4rem; border-top: 1px dashed var(--panel-border); padding-top: 0.4rem; margin-top: 0.4rem;">
                        <span>Optimal Reel Speed:</span> <span style="color:var(--gold-warn); font-weight:bold;">~${fish.combat.optimalReel}%</span>
                    </div>
                </div>
            `;
        } else {
            statsHtml += `
                <div class="dashboard-group" style="opacity: 0.5;">
                    <h3>Habitat (Lv.2)</h3>
                    <div style="text-align:center; color:var(--text-muted); font-style:italic;">???</div>
                </div>
            `;
        }

        if (level >= 3) {
            statsHtml += `
                <div class="dashboard-group">
                    <h3 style="margin-bottom: 1rem;">Lure Preferences (Lv.3)</h3>
                    ${buildStatSlider('Color', fish.lurePrefs.color, 'Cold', 'Warm')}
                    ${buildStatSlider('Sound', fish.lurePrefs.sound, 'Silent', 'Loud')}
                    ${buildStatSlider('Light', fish.lurePrefs.light, 'Dark', 'Glow')}
                    ${buildStatSlider('Weight', fish.lurePrefs.weight, 'Float', 'Sink')}
                    <div style="text-align:center; font-size:0.9rem; color:var(--text-muted); margin-top:1rem;">
                        Preference Tolerance: ±${Math.round(fish.lurePrefs.tolerance * 100)}%
                    </div>
                </div>
            `;
        } else {
            statsHtml += `
                <div class="dashboard-group" style="opacity: 0.5;">
                    <h3>Lure Preferences (Lv.3)</h3>
                    <div style="text-align:center; color:var(--text-muted); font-style:italic;">???</div>
                </div>
            `;
        }

        document.getElementById('grim-bestiary-stats').innerHTML = statsHtml;
        SFX.playUISelect();
    },

    // --- TOOLTIP HELPERS ---
    formatDelta(newVal, oldVal, invertGoodBad = false) {
        if (newVal === undefined || oldVal === undefined) return '';
        const diff = newVal - oldVal;
        if (diff === 0) return `<span style="color:var(--text-muted); font-size: 0.85em; margin-left: 0.5rem;">(+0)</span>`;
        
        let color = 'var(--green-safe)';
        if ((diff > 0 && invertGoodBad) || (diff < 0 && !invertGoodBad)) color = 'var(--red-danger)';
        
        const sign = diff > 0 ? '+' : '';
        const formattedDiff = Number.isInteger(diff) ? diff : diff.toFixed(2);
        return `<span style="color:${color}; font-size: 0.85em; margin-left: 0.5rem;">(${sign}${formattedDiff})</span>`;
    },

    renderQuests() {
        const player = this.gameState.player;
        const list = document.getElementById('grim-quests-list');
        list.innerHTML = '';
        
        const header = document.querySelector('#grim-page-quests h1');
        if (header) {
            header.innerText = `Active Quests (${player.activeQuests.length}/8)`;
        }

        if (!player.activeQuests || player.activeQuests.length === 0) {
            document.getElementById('grim-quests-empty').style.display = 'flex';
            list.style.display = 'none';
            return;
        }
        
        document.getElementById('grim-quests-empty').style.display = 'none';
        list.style.display = 'flex';
        
        player.activeQuests.forEach((q, index) => {
            const card = document.createElement('div');
            card.style.cssText = "background: var(--panel-base); border: 1px solid var(--panel-border); padding: 1.5rem; border-radius: 6px; display: flex; flex-direction: column;";
            
            let progressHtml = "";
            let isComplete = false;

            if (q.type === 'hunt') {
                const count = player.inventory.filter(i => i.invType === 'fish' && i.id === q.targetSpeciesId).length;
                isComplete = count >= q.requiredAmount;
                progressHtml = `
                    <div style="margin-top: 1rem;">
                        <div style="display:flex; justify-content:space-between; margin-bottom: 0.2rem;"><span>Progress</span> <span style="color:${isComplete ? 'var(--green-safe)' : 'var(--cyan-glow)'}">${count} / ${q.requiredAmount} Caught</span></div>
                        <div style="width:100%; height:10px; background:#000; border-radius:5px; overflow:hidden;"><div style="height:100%; width:${Math.min(100, (count/q.requiredAmount)*100)}%; background:${isComplete ? 'var(--green-safe)' : 'var(--cyan-glow)'}"></div></div>
                    </div>
                `;
            } else if (q.type === 'trophy') {
                const maxW = player.inventory.filter(i => i.invType === 'fish' && i.id === q.targetSpeciesId).reduce((max, f) => Math.max(max, f.actualWeight), 0);
                isComplete = maxW >= q.requiredWeight;
                progressHtml = `
                    <div style="margin-top: 1rem;">
                        <div style="display:flex; justify-content:space-between; margin-bottom: 0.2rem;"><span>Record Weight</span> <span style="color:${isComplete ? 'var(--green-safe)' : 'var(--cyan-glow)'}">${maxW}kg / ${q.requiredWeight}kg</span></div>
                        <div style="width:100%; height:10px; background:#000; border-radius:5px; overflow:hidden;"><div style="height:100%; width:${Math.min(100, (maxW/q.requiredWeight)*100)}%; background:${isComplete ? 'var(--green-safe)' : 'var(--cyan-glow)'}"></div></div>
                    </div>
                `;
            } else if (q.type === 'research') {
                let curLvl = 0;
                const bestiaryEntry = player.bestiary[q.targetSpeciesId];
                if (bestiaryEntry) {
                    if (bestiaryEntry.xp >= 250) curLvl = 3;
                    else if (bestiaryEntry.xp >= 100) curLvl = 2;
                    else curLvl = 1;
                }
                
                isComplete = curLvl >= q.requiredKnowledgeLevel;
                
                progressHtml = `
                    <div style="margin-top: 1rem;">
                        <div style="display:flex; justify-content:space-between; margin-bottom: 0.2rem;"><span>Knowledge Level</span> <span style="color:${isComplete ? 'var(--green-safe)' : 'var(--cyan-glow)'}">Lv. ${curLvl} / Lv. ${q.requiredKnowledgeLevel}</span></div>
                        <div style="width:100%; height:10px; background:#000; border-radius:5px; overflow:hidden;"><div style="height:100%; width:${Math.min(100, (curLvl/q.requiredKnowledgeLevel)*100)}%; background:${isComplete ? 'var(--green-safe)' : 'var(--cyan-glow)'}"></div></div>
                    </div>
                `;
            } else if (q.type === 'bounty') {
                isComplete = q.isComplete;
                progressHtml = `<div style="margin-top: 1rem; color:${isComplete ? 'var(--green-safe)' : 'var(--gold-warn)'}; font-weight:bold;">${isComplete ? 'Bounty Slain' : 'Target still at large...'}</div>`;
            } else if (q.type === 'courier') {
                if (q.isFailed) {
                    isComplete = false;
                    progressHtml = `<div style="margin-top: 1rem; color:var(--red-danger); font-weight:bold; font-size: 1.4rem;">Delivery Failed: Package Expired</div>`;
                } else {
                    const mins = Math.max(0, Math.floor(q.timeRemaining));
                    const pct = Math.max(0, (q.timeRemaining / q.maxTime) * 100);
                    const color = q.timeRemaining < 60 ? 'var(--red-danger)' : 'var(--cyan-glow)';
                    
                    isComplete = this.gameState.globalX === q.targetNode.x && this.gameState.globalY === q.targetNode.y;
                    
                    progressHtml = `
                        <div style="margin-top: 1rem;">
                            <div style="display:flex; justify-content:space-between; margin-bottom: 0.2rem;">
                                <span>Time Remaining</span> 
                                <span style="color:${color}; font-weight:bold;">${mins} Mins</span>
                            </div>
                            <div style="width:100%; height:10px; background:#000; border-radius:5px; overflow:hidden;">
                                <div style="height:100%; width:${pct}%; background:${color};"></div>
                            </div>
                            <div style="margin-top: 0.5rem; color:var(--text-muted); font-size: 1.1rem;">Deliver to: [${q.targetNode.x}, ${q.targetNode.y}]</div>
                        </div>
                    `;
                }
            } else if (q.type === 'crafting') {
                const hasMatch = player.inventory.some(item => {
                    if (item.invType !== 'lure') return false;
                    return q.requirements.every(req => item.stats[req.stat] >= req.min && item.stats[req.stat] <= req.max);
                });
                isComplete = hasMatch;
                progressHtml = `
                    <div style="margin-top: 1rem;">
                        <div style="display:flex; justify-content:space-between; margin-bottom: 0.2rem;">
                            <span>Status</span> 
                            <span style="color:${isComplete ? 'var(--green-safe)' : 'var(--gold-warn)'}">${isComplete ? 'Lure Crafted (In Cargo)' : 'Awaiting Crafting'}</span>
                        </div>
                        <div style="width:100%; height:10px; background:#000; border-radius:5px; overflow:hidden;">
                            <div style="height:100%; width:${isComplete ? '100' : '0'}%; background:${isComplete ? 'var(--green-safe)' : 'var(--gold-warn)'}"></div>
                        </div>
                    </div>
                `;
            }

            // GUARANTEED SAFE INITIALIZATION
            let rewardItemText = '';
            if (q.rewards && q.rewards.item) {
                const itemName = q.rewards.item.id.replace('part_', '').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                rewardItemText = `<br/><span style="color:var(--cyan-glow); font-weight:bold;">+ ${q.rewards.item.qty}x ${itemName}</span>`;
            }

            const returnText = q.turnInName ? `Return to ${q.turnInName} to claim!` : `Return to a Settlement Notice Board to claim!`;

            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:flex-start;">
                    <h3 style="margin:0 0 0.5rem 0; color:var(--cyan-glow); font-size:1.8rem;">${q.title}</h3>
                    <button class="btn-abandon" style="background:none; border:none; color:var(--text-muted); cursor:pointer; font-family:inherit; font-size:1.2rem; text-decoration:underline;">Abandon</button>
                </div>
                <p style="color:var(--text-main); font-size:1.3rem; margin:0 0 1rem 0;">${q.desc}</p>
                
                <div style="background:var(--bg-void); border:1px solid var(--panel-border); padding:1rem; border-radius:4px; font-size: 1.3rem;">
                    <span style="color:var(--gold-warn); font-weight:bold;">Reward: ${q.rewards.gold}g</span> | 
                    <span style="color:#A78BFA; font-weight:bold;">${q.rewards.xp} XP</span>
                    ${rewardItemText}
                </div>
                
                ${progressHtml}
                
                ${isComplete ? `<div style="margin-top:1.5rem; color:var(--green-safe); font-weight:bold; font-size:1.4rem; text-align:center;">${returnText}</div>` : ''}
            `;

            card.querySelector('.btn-abandon').onclick = () => {
                SFX.playError();
                player.activeQuests.splice(index, 1);
                if (this.callbacks.onSave) this.callbacks.onSave();
                this.renderQuests();
            };

            list.appendChild(card);
        });
    },

    // --- GUIDE (TUTORIAL) ---
    guideActiveChapterId: 'vitals', // State tracker for the sub-menu

    renderGuide() {
        const navContainer = document.getElementById('grim-guide-nav');
        const contentContainer = document.getElementById('grim-guide-content');
        
        navContainer.innerHTML = '';
        
        // Build the Left Navigation Menu
        GUIDE_CHAPTERS.forEach(chapter => {
            const btn = document.createElement('button');
            const isActive = this.guideActiveChapterId === chapter.id;
            
            btn.className = 'menu-btn';
            btn.style.cssText = `
                width: 100%; text-align: left; padding: 1rem; margin: 0; font-size: 1.2rem;
                border-color: ${isActive ? 'var(--cyan-glow)' : 'var(--panel-border)'};
                color: ${isActive ? 'var(--cyan-glow)' : 'var(--text-muted)'};
                background: ${isActive ? 'var(--panel-base)' : 'transparent'};
            `;
            btn.innerText = chapter.title;
            
            btn.onclick = () => {
                SFX.playUISelect();
                this.guideActiveChapterId = chapter.id;
                this.renderGuide(); // Re-render to update active states
            };
            
            navContainer.appendChild(btn);
        });

        // Inject the Right Content Pane
        const activeChapter = GUIDE_CHAPTERS.find(c => c.id === this.guideActiveChapterId) || GUIDE_CHAPTERS[0];
        contentContainer.innerHTML = activeChapter.content;
    }
};