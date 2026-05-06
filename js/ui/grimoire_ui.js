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
import { showStatTooltip, moveStatTooltip, hideStatTooltip } from '../util/utils.js';

// --- NEW IMPORTS ---
import { createRng } from '../util/rng.js'; 
import { generateChest } from '../art/chest_generator.js'; 
import { generateLurePart } from '../art/lure_generator.js'; 
import { generateRodData } from '../data/rod_data_generator.js';

export const GrimoireUI = {
    selectedMapNode: null,
    activeTab: 'map',
    gameState: null, 
    callbacks: null, 

    craftingBench:[], 

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
        else if (this.activeTab === 'inventory') this.renderInventory();
        else if (this.activeTab === 'loadout') this.renderLoadout();
        else if (this.activeTab === 'bestiary') this.renderBestiary();
        else if (this.activeTab === 'quests') this.renderQuests();
    },

    // --- MAP ---
    renderMap() {
        const canvas = document.getElementById('grim-map-canvas');
        const world = this.gameState.world;
        const player = this.gameState.player;

        // Filter for quests that are NOT complete yet
        const incompleteQuests = player.activeQuests.filter(q => {
            if (q.type === 'hunt') return q.currentAmount < q.requiredAmount;
            if (q.type === 'trophy') return q.currentBestWeight < q.requiredWeight;
            if (q.type === 'bounty') return !q.isComplete;
            if (q.type === 'research') {
                const entry = player.bestiary[q.targetSpeciesId];
                let curLvl = 0;
                if (entry) {
                    if (entry.xp >= 250) curLvl = 3;
                    else if (entry.xp >= 100) curLvl = 2;
                    else curLvl = 1;
                }
                return curLvl < q.requiredKnowledgeLevel;
            }
            return true;
        });
        
        // Pass the incomplete quests to the map renderer
        renderGlobalMap(canvas, world, BIOMES, this.selectedMapNode, incompleteQuests);

        document.getElementById('grim-map-coords').innerText = `[${this.selectedMapNode.x}, ${this.selectedMapNode.y}]`;

        const ecoContainer = document.getElementById('grim-map-ecology');
        ecoContainer.innerHTML = '';
        
        if (this.selectedMapNode.isDiscovered) {
            document.getElementById('grim-map-title').innerText = this.selectedMapNode.name;
            const b = BIOMES[this.selectedMapNode.biomeId];
            document.getElementById('grim-map-biome').innerText = b.name;
            document.getElementById('grim-map-biome').style.color = b.globalColor;

            // [FIX]: Look exactly at the species discovered in THIS specific node
            const discoveredIds = this.selectedMapNode.discoveredSpecies ||[];
            
            // Map those IDs to the actual Bestiary entries
            const knownSpecies = discoveredIds
                .map(id => this.gameState.player.bestiary[id])
                .filter(Boolean); // Filter out any undefined just in case

            if (knownSpecies.length > 0) {
                knownSpecies.forEach(entry => {
                    const fish = entry.speciesData;
                    ecoContainer.innerHTML += `
                        <div style="display: flex; align-items: center; gap: 0.8rem; font-size: 1.1rem; padding-bottom: 0.2rem; border-bottom: 1px dashed var(--panel-border);">
                            <img src="${fish.art.imageDataUrl}" style="width: 28px; height: 28px; background: #000; border: 1px solid var(--panel-border); border-radius: 2px; image-rendering: pixelated;" />
                            <span style="color: var(--cyan-glow);">${fish.identity.name}</span>
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
            lureCrafting: "Lure Crafting", bartering: "Bartering", intelligence: "Intelligence"
        };

        for (const [key, val] of Object.entries(player.stats)) {
            const row = document.createElement('div');
            row.className = 'grim-stat-row';
            row.innerHTML = `
                <span class="grim-stat-name">${displayNames[key]}</span>
                <div class="grim-stat-controls">
                    <span class="grim-stat-val">${val}</span>
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

    renderInventory() {
        const player = this.gameState.player;
        const effStats = PlayerEngine.getEffectiveStats(player);
        const maxCargo = effStats.exploration.cargoSpace;
        
        const benchGrid = document.getElementById('grim-craft-slots');
        benchGrid.innerHTML = '';
        
        for (let i = 0; i < 5; i++) {
            const slot = document.createElement('div');
            slot.className = 'craft-slot';
            
            if (i < this.craftingBench.length) {
                const part = this.craftingBench[i];
                slot.innerHTML = `<img src="${part.imageDataUrl || '../assets/placeholder.png'}" onerror="this.style.display='none';"/>`;
                slot.style.borderColor = 'var(--cyan-glow)';
                
                slot.onclick = () => {
                    SFX.playUIHover();
                    this.craftingBench.splice(i, 1);
                    player.inventory.push(part);
                    this.renderInventory();
                };
            }
            benchGrid.appendChild(slot);
        }

        document.getElementById('grim-inv-count').innerText = player.inventory.length;
        document.getElementById('grim-inv-max').innerText = maxCargo;
        
        const grid = document.getElementById('grim-inv-grid');
        grid.innerHTML = '';
        
        for (let i = 0; i < maxCargo; i++) {
            const slot = document.createElement('div');
            slot.className = 'inv-slot';
            
            if (i < player.inventory.length) {
                const item = player.inventory[i];
                let imgSrc = "";
                
                if (item.invType === 'fish') imgSrc = item.art.imageDataUrl;
                else if (item.invType === 'part' || item.invType === 'lure' || item.invType === 'chest') imgSrc = item.imageDataUrl || '';
                else if (item.invType === 'rod') imgSrc = item.art.imageDataUrl;
                else if (item.invType === 'boat') imgSrc = item.art.profileDataUrl;

                if (imgSrc) {
                    slot.innerHTML = `<img src="${imgSrc}" />`;
                } else {
                    slot.innerHTML = `<span style="font-size: 0.6rem; color: #555;">${item.name.substring(0,6)}</span>`;
                }
                
                slot.onclick = () => this.showInventoryDetails(item, i, slot);
            }
            grid.appendChild(slot);
        }
        
        this.showBenchPreview();
    },

    showInventoryDetails(item, invIndex, slotEl) {
        document.querySelectorAll('.inv-slot').forEach(el => el.classList.remove('selected'));
        slotEl.classList.add('selected');
        
        document.getElementById('grim-inv-empty').style.display = 'none';
        document.getElementById('grim-inv-details').style.display = 'flex';
        
        const btnAction = document.getElementById('btn-inv-action');
        const btnEquip = document.getElementById('btn-inv-equip');
        btnAction.style.display = 'none';
        btnEquip.style.display = 'none';
        
        const player = this.gameState.player;

        // 1. FISH
        if (item.invType === 'fish') {
            document.getElementById('grim-item-img').src = item.art.imageDataUrl;
            document.getElementById('grim-item-name').innerText = item.identity.name;
            document.getElementById('grim-item-name').style.color = 'var(--cyan-glow)';
            document.getElementById('grim-item-sub').innerText = `${item.identity.rarity} ${item.identity.family}`;
            
            document.getElementById('grim-item-stats').innerHTML = `
                <div style="display:flex; justify-content:space-between;"><span>Size:</span> <span>${item.physical.sizeTier}</span></div>
                <div style="display:flex; justify-content:space-between;"><span>Weight:</span> <span>${item.actualWeight} kg</span></div>
                <div style="display:flex; justify-content:space-between;"><span>Value:</span> <span style="color:var(--gold-warn);">${item.economy.baseValue}g</span></div>
            `;
            
            btnAction.style.display = 'block';
            btnAction.innerText = '🔪 Dissect';
            btnAction.style.borderColor = 'var(--red-danger)';
            btnAction.style.color = 'var(--red-danger)';
            
            btnAction.onclick = () => {
                SFX.playLineSnap(); 
                const result = DissectionEngine.dissect(item, player.stats.lureCrafting, Date.now());
                
                player.inventory.splice(invIndex, 1);
                
                if (!player.bestiary[item.id]) {
                    player.bestiary[item.id] = { xp: 0, caught: 0, speciesData: item };
                }
                const effStats = PlayerEngine.getEffectiveStats(player);
                const finalXpGain = Math.round(result.knowledgeGain * effStats.economy.knowledgeXpMult);
                player.bestiary[item.id].xp += finalXpGain;
                
                const currentXp = player.bestiary[item.id].xp;
                let knowledgeLevel = 1;
                if (currentXp >= 250) knowledgeLevel = 3;
                else if (currentXp >= 100) knowledgeLevel = 2;
                
                result.parts.forEach(p => {
                    p.invType = 'part';
                    player.inventory.push(p);
                });
                
                if (this.callbacks.onSave) this.callbacks.onSave();
                this.renderInventory();
            };
        } 
        // 2. PARTS
        else if (item.invType === 'part') {
            document.getElementById('grim-item-img').src = item.imageDataUrl || '';
            document.getElementById('grim-item-img').style.display = item.imageDataUrl ? 'block' : 'none';
            document.getElementById('grim-item-name').innerText = item.name;
            document.getElementById('grim-item-name').style.color = 'var(--text-main)';
            document.getElementById('grim-item-sub').innerText = `${item.rarity} Component`;
            
            const fmt = v => v > 0 ? `<span class="dash-pos">+${v}</span>` : (v < 0 ? `<span class="dash-neg">${v}</span>` : `0`);
            
            document.getElementById('grim-item-stats').innerHTML = `
                <div style="display:flex; justify-content:space-between;"><span>Color:</span> <span>${fmt(item.stats.color)}</span></div>
                <div style="display:flex; justify-content:space-between;"><span>Sound:</span> <span>${fmt(item.stats.sound)}</span></div>
                <div style="display:flex; justify-content:space-between;"><span>Light:</span> <span>${fmt(item.stats.light)}</span></div>
                <div style="display:flex; justify-content:space-between;"><span>Weight:</span> <span>${fmt(item.stats.weight)}</span></div>
            `;
            
            if (this.craftingBench.length < 5) {
                btnAction.style.display = 'block';
                btnAction.innerText = '⬆ Add to Bench';
                btnAction.style.borderColor = 'var(--cyan-glow)';
                btnAction.style.color = 'var(--cyan-glow)';
                
                btnAction.onclick = () => {
                    SFX.playUIHover();
                    const part = player.inventory.splice(invIndex, 1)[0];
                    this.craftingBench.push(part);
                    this.renderInventory();
                };
            }
        }
        // 3. LURES
        else if (item.invType === 'lure') {
            const eqLure = player.gear.lure || { stats: {color:0, sound:0, light:0, weight:0}, durability: 0, maxDurability: 0 };
            
            document.getElementById('grim-item-img').src = item.imageDataUrl;
            document.getElementById('grim-item-img').style.display = 'block';
            document.getElementById('grim-item-name').innerText = item.name;
            document.getElementById('grim-item-name').style.color = 'var(--gold-warn)';
            document.getElementById('grim-item-sub').innerText = `Custom Lure (${item.componentsUsed} Parts)`;
            
            // Lures are subjective, so we use Neutral formatting for differences
            document.getElementById('grim-item-stats').innerHTML = `
                <div style="display:flex; justify-content:space-between;"><span>Durability:</span> <span>${item.durability}/${item.maxDurability} ${this.formatDelta(item.maxDurability, eqLure.maxDurability)}</span></div>
                <hr style="border: 1px solid var(--panel-border); width: 100%; margin: 0.5rem 0;" />
                <div style="display:flex; justify-content:space-between;"><span>Color:</span> <span>${item.stats.color} ${this.formatDelta(item.stats.color, eqLure.stats.color)}</span></div>
                <div style="display:flex; justify-content:space-between;"><span>Sound:</span> <span>${item.stats.sound} ${this.formatDelta(item.stats.sound, eqLure.stats.sound)}</span></div>
                <div style="display:flex; justify-content:space-between;"><span>Light:</span> <span>${item.stats.light} ${this.formatDelta(item.stats.light, eqLure.stats.light)}</span></div>
                <div style="display:flex; justify-content:space-between;"><span>Weight:</span> <span>${item.stats.weight} ${this.formatDelta(item.stats.weight, eqLure.stats.weight)}</span></div>
            `;
            
            btnEquip.style.display = 'block';
            btnEquip.innerText = 'Equip Lure';
            btnEquip.onclick = () => {
                SFX.playUISelect();
                const oldLure = player.gear.lure;
                player.gear.lure = player.inventory.splice(invIndex, 1)[0];
                if (oldLure && oldLure.invType === 'lure') player.inventory.push(oldLure);
                if (this.callbacks.onSave) this.callbacks.onSave();
                this.renderInventory();
            };
        }
        // 4. RODS
        else if (item.invType === 'rod') {
            const eqRod = player.gear.rod;
            
            document.getElementById('grim-item-img').src = item.art.imageDataUrl;
            document.getElementById('grim-item-img').style.display = 'block';
            document.getElementById('grim-item-name').innerText = item.identity.name;
            document.getElementById('grim-item-name').style.color = 'var(--cyan-glow)';
            document.getElementById('grim-item-sub').innerText = `${item.identity.rarity} Rod`;
            
            document.getElementById('grim-item-stats').innerHTML = `
                <div style="display:flex; justify-content:space-between;"><span>Power:</span> <span>${item.stats.power}x ${this.formatDelta(item.stats.power, eqRod.stats.power)}</span></div>
                <div style="display:flex; justify-content:space-between;"><span>Max Tension:</span> <span>${item.stats.maxTension} ${this.formatDelta(item.stats.maxTension, eqRod.stats.maxTension)}</span></div>
                <div style="display:flex; justify-content:space-between;"><span>Flexibility:</span> <span>${item.stats.flexibility}x ${this.formatDelta(item.stats.flexibility, eqRod.stats.flexibility)}</span></div>
                <div style="display:flex; justify-content:space-between;"><span>Hook Window:</span> <span>${item.stats.sensitivity}ms ${this.formatDelta(item.stats.sensitivity, eqRod.stats.sensitivity)}</span></div>
            `;
            
            btnEquip.style.display = 'block';
            btnEquip.innerText = 'Equip Rod';
            btnEquip.onclick = () => {
                SFX.playUISelect();
                const oldRod = player.gear.rod;
                player.gear.rod = player.inventory.splice(invIndex, 1)[0];
                if (oldRod) player.inventory.push(oldRod);
                if (this.callbacks.onSave) this.callbacks.onSave();
                this.renderInventory();
            };
        }
        // 5. BOATS
        else if (item.invType === 'boat') {
            const eqBoat = player.gear.boat;
            
            document.getElementById('grim-item-img').src = item.art.profileDataUrl;
            document.getElementById('grim-item-img').style.display = 'block';
            document.getElementById('grim-item-name').innerText = item.identity.name;
            document.getElementById('grim-item-name').style.color = 'var(--cyan-glow)';
            document.getElementById('grim-item-sub').innerText = `${item.identity.rarity} ${item.art.boatType.toUpperCase()}`;
            
            document.getElementById('grim-item-stats').innerHTML = `
                <div style="display:flex; justify-content:space-between;"><span>Hull HP:</span> <span>${item.stats.maxHp} ${this.formatDelta(item.stats.maxHp, eqBoat.stats.maxHp)}</span></div>
                <div style="display:flex; justify-content:space-between;"><span>Speed:</span> <span>${item.stats.speed} ${this.formatDelta(item.stats.speed, eqBoat.stats.speed)}</span></div>
                <div style="display:flex; justify-content:space-between;"><span>Stealth:</span> <span>${item.stats.stealth}x ${this.formatDelta(item.stats.stealth, eqBoat.stats.stealth, true)}</span></div>
                <div style="display:flex; justify-content:space-between;"><span>Base Cargo:</span> <span>${item.stats.cargoSpace} ${this.formatDelta(item.stats.cargoSpace, eqBoat.stats.cargoSpace)}</span></div>
            `;
            
            btnEquip.style.display = 'block';
            
            // Check Capacity Before Swapping
            const oldUpgrades = player.gear.boat.upgrades;
            let newCargoLimit = item.stats.cargoSpace;
            if (oldUpgrades && oldUpgrades.storage) newCargoLimit += 10;
            
            if (player.inventory.length > newCargoLimit) {
                btnEquip.innerText = 'Hold Too Full To Swap';
                btnEquip.disabled = true;
                btnEquip.style.opacity = '0.5';
                btnEquip.style.cursor = 'not-allowed';
            } else {
                btnEquip.innerText = 'Equip Boat';
                btnEquip.disabled = false;
                btnEquip.style.opacity = '1';
                btnEquip.style.cursor = 'pointer';
                
                btnEquip.onclick = () => {
                    SFX.playUISelect();
                    
                    const newBoat = player.inventory.splice(invIndex, 1)[0];
                    const oldBoat = player.gear.boat;
                    
                    // Transfer Upgrades
                    newBoat.upgrades = oldUpgrades;
                    if (oldUpgrades.storage) newBoat.stats.cargoSpace += 10;
                    if (oldUpgrades.plating) newBoat.stats.maxHp += 50;
                    
                    player.gear.boat = newBoat;
                    player.vitals.hp = Math.min(player.vitals.hp, newBoat.stats.maxHp);
                    
                    // Reset old boat before storing
                    oldBoat.upgrades = { lantern: { id: 'lantern_basic', name: 'Basic Lantern', lightRadius: 100, fuelDrainRate: 1.0 }, plating: null, engine: null, storage: null };
                    if (oldUpgrades.storage) oldBoat.stats.cargoSpace -= 10;
                    if (oldUpgrades.plating) oldBoat.stats.maxHp -= 50;
                    
                    player.inventory.push(oldBoat);
                    
                    if (this.callbacks.onSave) this.callbacks.onSave();
                    this.renderInventory();
                };
            }
        }

        // 6. CHESTS (Treasure & Mimics)
        else if (item.invType === 'chest') {
            document.getElementById('grim-item-img').src = item.imageDataUrl;
            document.getElementById('grim-item-img').style.display = 'block';
            document.getElementById('grim-item-name').innerText = item.name;
            document.getElementById('grim-item-name').style.color = 'var(--gold-warn)';
            document.getElementById('grim-item-sub').innerText = `Unknown Contents`;
            
            document.getElementById('grim-item-stats').innerHTML = `
                <div style="color:var(--text-muted); font-size:1.2rem; text-align:center; padding: 2rem 0;">
                    A heavy, waterlogged chest pulled from the depths.<br><br>What could be inside?
                </div>
            `;
            
            btnAction.style.display = 'block';
            btnAction.innerText = '🔓 Open Chest';
            btnAction.style.borderColor = 'var(--gold-warn)';
            btnAction.style.color = 'var(--gold-warn)';
            
            btnAction.onclick = () => {
                const rng = createRng(Date.now());
                const isMimic = rng.chance(0.3); // 30% chance for a mimic
                
                // Remove the chest from inventory immediately
                player.inventory.splice(invIndex, 1);
                btnAction.style.display = 'none';

                if (isMimic) {
                    SFX.playLineSnap(); // Crunch!
                    
                    // NEW: Use the original seed so the Mimic matches the chest perfectly!
                    const mimicSeed = item.chestSeed || Date.now();
                    const mimicArt = generateChest({ rng: createRng(mimicSeed), isMimic: true });
                    
                    document.getElementById('grim-item-img').src = mimicArt.imageDataUrl;
                    document.getElementById('grim-item-name').innerText = 'Mimic!';
                    document.getElementById('grim-item-name').style.color = 'var(--red-danger)';
                    document.getElementById('grim-item-stats').innerHTML = `<div style="color:var(--red-danger); font-size:1.4rem; text-align:center; padding: 2rem 0;">It bit you!<br><br>Hull took 20 damage!</div>`;
                    
                    player.vitals.hp -= 20;
                    
                    if (this.callbacks.onSave) this.callbacks.onSave();
                    this._refreshInventoryGridOnly();
                    
                    // If the mimic killed the player, wait 1.5s for them to read the text, then trigger death
                    if (player.vitals.hp <= 0 && this.callbacks.onDeath) {
                        setTimeout(() => {
                            this.close();
                            this.callbacks.onDeath();
                        }, 1500); 
                    }
                } else {
                    SFX.playGold();
                    
                    const goldFound = rng.int(150, 400);
                    player.vitals.gold += goldFound;
                    
                    let lootHtml = `<div style="color:var(--green-safe); font-size:1.4rem; text-align:center; margin-bottom:1rem;">Found ${goldFound}g!</div>`;
                    
                    // Generate 2-3 Rare Parts
                    const rareParts =['phosphor_cap', 'wraith_silk', 'myconid_spore', 'jelly_bell'];
                    const numParts = rng.int(2, 3);
                    for(let i=0; i<numParts; i++) {
                        const pId = rng.pick(rareParts);
                        const pName = pId.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                        player.inventory.push({
                            id: `part_${rng.int(10000,99999)}`,
                            invType: 'part',
                            name: pName,
                            visualId: pId,
                            rarity: 'Rare',
                            stats: { color: rng.int(-20,20), sound: rng.int(-20,20), light: rng.int(-20,20), weight: rng.int(-20,20) },
                            imageDataUrl: generateLurePart({ visualId: pId, rng })
                        });
                        lootHtml += `<div style="color:var(--cyan-glow); font-size:1.2rem; text-align:center; margin-bottom:0.2rem;">+1x ${pName}</div>`;
                    }
                    
                    // 15% Chance to find a Fishing Rod
                    if (rng.chance(0.15)) {
                        const rod = generateRodData({ seed: Date.now() });
                        rod.invType = 'rod';
                        player.inventory.push(rod);
                        lootHtml += `<div style="color:var(--gold-warn); font-size:1.2rem; text-align:center; margin-top:0.8rem;">+ ${rod.identity.name}!</div>`;
                    }
                    
                    document.getElementById('grim-item-stats').innerHTML = lootHtml;
                    document.getElementById('grim-item-name').innerText = 'Treasure!';
                    
                    if (this.callbacks.onSave) this.callbacks.onSave();
                    this._refreshInventoryGridOnly();
                }
            };
        }
        
        SFX.playUISelect();
    },

    showBenchPreview() {
        document.querySelectorAll('.inv-slot').forEach(el => el.classList.remove('selected'));
        
        if (this.craftingBench.length === 0) {
            document.getElementById('grim-inv-details').style.display = 'none';
            document.getElementById('grim-inv-empty').style.display = 'flex';
            document.getElementById('grim-inv-empty').innerHTML = "Select an item in your cargo,<br>or add parts to the Bench.";
            return;
        }

        document.getElementById('grim-inv-empty').style.display = 'none';
        document.getElementById('grim-inv-details').style.display = 'flex';
        
        document.getElementById('grim-item-img').style.display = 'none'; 
        document.getElementById('grim-item-name').innerText = "Crafting Preview";
        document.getElementById('grim-item-name').style.color = 'var(--text-main)';
        document.getElementById('grim-item-sub').innerText = `${this.craftingBench.length} / 5 Parts Selected`;

        let tc = 0, ts = 0, tl = 0, tw = 0;
        this.craftingBench.forEach(p => {
            tc += p.stats.color; ts += p.stats.sound;
            tl += p.stats.light; tw += p.stats.weight;
        });
        
        const fmt = v => v > 0 ? `<span class="dash-pos">+${v}</span>` : (v < 0 ? `<span class="dash-neg">${v}</span>` : `0`);

        document.getElementById('grim-item-stats').innerHTML = `
            <div style="display:flex; justify-content:space-between;"><span>Net Color:</span> <span>${fmt(tc)}</span></div>
            <div style="display:flex; justify-content:space-between;"><span>Net Sound:</span> <span>${fmt(ts)}</span></div>
            <div style="display:flex; justify-content:space-between;"><span>Net Light:</span> <span>${fmt(tl)}</span></div>
            <div style="display:flex; justify-content:space-between;"><span>Net Weight:</span> <span>${fmt(tw)}</span></div>
        `;

        const btnAction = document.getElementById('btn-inv-action');
        document.getElementById('btn-inv-equip').style.display = 'none';
        
        if (this.craftingBench.length >= 3) {
            btnAction.style.display = 'block';
            btnAction.innerText = '🔨 Craft Lure';
            btnAction.style.borderColor = 'var(--gold-warn)';
            btnAction.style.color = 'var(--gold-warn)';
            
            btnAction.onclick = () => {
                const player = this.gameState.player;
                const finalLure = LureCrafter.craft(this.craftingBench, player.stats.lureCrafting, Date.now());
                if (finalLure) {
                    SFX.playCatchSuccess(); 
                    finalLure.invType = 'lure';
                    player.inventory.push(finalLure);
                    this.craftingBench =[]; 
                    if (this.callbacks.onSave) this.callbacks.onSave();
                    this.renderInventory();
                    
                    const newIndex = player.inventory.length - 1;
                    const slots = document.querySelectorAll('.inv-slot');
                    this.showInventoryDetails(player.inventory[newIndex], newIndex, slots[slots.length-1]);
                }
            };
        } else {
            btnAction.style.display = 'none';
        }
    },

    _refreshInventoryGridOnly() {
        const player = this.gameState.player;
        const effStats = PlayerEngine.getEffectiveStats(player);
        const maxCargo = effStats.exploration.cargoSpace;
        
        document.getElementById('grim-inv-count').innerText = player.inventory.length;
        document.getElementById('grim-inv-max').innerText = maxCargo;
        
        const grid = document.getElementById('grim-inv-grid');
        grid.innerHTML = '';
        
        for (let i = 0; i < maxCargo; i++) {
            const slot = document.createElement('div');
            slot.className = 'inv-slot';
            
            if (i < player.inventory.length) {
                const item = player.inventory[i];
                let imgSrc = "";
                
                if (item.invType === 'fish') imgSrc = item.art.imageDataUrl;
                else if (item.invType === 'part' || item.invType === 'lure' || item.invType === 'chest') imgSrc = item.imageDataUrl || ''; 
                else if (item.invType === 'rod') imgSrc = item.art.imageDataUrl;
                else if (item.invType === 'boat') imgSrc = item.art.profileDataUrl;

                if (imgSrc) {
                    slot.innerHTML = `<img src="${imgSrc}" />`;
                } else {
                    slot.innerHTML = `<span style="font-size: 0.6rem; color: #555;">${item.name.substring(0,6)}</span>`;
                }
                
                slot.onclick = () => this.showInventoryDetails(item, i, slot);
            }
            grid.appendChild(slot);
        }
    },

    // --- LOADOUT ---

    renderLoadout() {
        const player = this.gameState.player;
        const effStats = PlayerEngine.getEffectiveStats(player);
        const boat = player.gear.boat;
        const rod = player.gear.rod;
        const lure = player.gear.lure;
        
        let upgHtml = `<div style="font-size:1rem; color:var(--text-muted); margin-top:0.5rem; line-height: 1.4;">`;
        upgHtml += `Lantern: <span style="color:var(--cyan-glow)">${boat.upgrades.lantern ? boat.upgrades.lantern.name : 'Basic'}</span><br>`;
        if (boat.upgrades.plating) upgHtml += `Plating: <span style="color:var(--cyan-glow)">${boat.upgrades.plating.name}</span><br>`;
        if (boat.upgrades.storage) upgHtml += `Storage: <span style="color:var(--cyan-glow)">${boat.upgrades.storage.name}</span>`;
        upgHtml += `</div>`;

        document.querySelector('#loadout-boat .slot-content').innerHTML = `
            <img src="${boat.art.profileDataUrl}" />
            <div class="loadout-details">
                <b>${boat.identity.name}</b>
                <span>Type: ${boat.art.boatType.toUpperCase()} | HP: ${boat.stats.maxHp} | Space: ${boat.stats.cargoSpace}</span>
                ${upgHtml}
            </div>
        `;
        
        document.querySelector('#loadout-rod .slot-content').innerHTML = `
            <img src="${rod.art.imageDataUrl}" />
            <div class="loadout-details">
                <b>${rod.identity.name}</b>
                <span>Power: ${rod.stats.power}x | Tension: ${rod.stats.maxTension}</span>
            </div>
        `;
        
        const lureImg = lure.imageDataUrl ? `<img src="${lure.imageDataUrl}" />` : `<div style="width:96px;height:96px;background:#000;border:1px solid var(--panel-border);display:flex;align-items:center;justify-content:center;color:var(--text-muted);">Bare Hook</div>`;
        const durText = lure.maxDurability > 0 ? `Durability: ${lure.durability}/${lure.maxDurability}` : `Durability: ∞`;

        const fmtP = v => v > 0 ? `<span class="dash-pos">+${v}</span>` : (v < 0 ? `<span class="dash-neg">${v}</span>` : `0`);
        document.querySelector('#loadout-lure .slot-content').innerHTML = `
            ${lureImg}
            <div class="loadout-details">
                <b>${lure.name}</b>
                <span style="color:var(--text-main); margin-bottom:0.2rem; display:block;">${durText}</span>
                <span>Color:${fmtP(lure.stats.color)} Sound:${fmtP(lure.stats.sound)} Light:${fmtP(lure.stats.light)} Weight:${fmtP(lure.stats.weight)}</span>
            </div>
        `;

        const fmt = (v, isBonus=false) => {
            if (typeof v === 'number' && isBonus) {
                if (v > 1) return `<span class="dash-pos">${v}x</span>`;
                if (v < 1) return `<span class="dash-neg">${v}x</span>`;
            }
            return `<span style="color:var(--text-main); font-weight:bold;">${v}</span>`;
        }
        
        document.getElementById('grim-dashboard-content').innerHTML = `
            <div class="dashboard-group">
                <h3>🎣 Minigame Physics</h3>
                <div class="grim-stat-row" style="font-size:1.3rem; padding:0.4rem 0;"><span>Reeling Power</span> ${fmt(effStats.minigame.power, true)}</div>
                <div class="grim-stat-row" style="font-size:1.3rem; padding:0.4rem 0;"><span>Hook Window</span> <span style="color:var(--cyan-glow); font-weight:bold;">${effStats.minigame.hookWindowMs}ms</span></div>
                <div class="grim-stat-row" style="font-size:1.3rem; padding:0.4rem 0;"><span>Stamina Pool</span> <span style="color:var(--text-main); font-weight:bold;">${effStats.minigame.stamina}</span></div>
                <div class="grim-stat-row" style="font-size:1.3rem; padding:0.4rem 0;"><span>Max Line Tension</span> <span style="color:var(--text-main); font-weight:bold;">${effStats.minigame.maxTension}</span></div>
            </div>
            <div class="dashboard-group">
                <h3>🗺️ Exploration & Survival</h3>
                <div class="grim-stat-row" style="font-size:1.3rem; padding:0.4rem 0;"><span>Boat Speed</span> ${fmt(effStats.exploration.speed, true)}</div>
                <div class="grim-stat-row" style="font-size:1.3rem; padding:0.4rem 0;"><span>Boat Stealth</span> ${fmt(effStats.exploration.stealth, true)}</div>
                <div class="grim-stat-row" style="font-size:1.3rem; padding:0.4rem 0;"><span>Hazard Dodge Chance</span> <span class="dash-pos">${Math.round(effStats.exploration.hazardDodgeChance * 100)}%</span></div>
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
            slot.onclick = () => this.showBestiaryDetails(entry, slot);
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
        // FIXED: Replaced undefined rarity with 'Species' text
        document.getElementById('grim-bestiary-sub').innerText = `Species: ${fish.identity.family}`;
        
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
                    <h3>Habitat (Lv.2)</h3>
                    <div style="display:flex; justify-content:space-between; margin-bottom:0.4rem;"><span>Native Biomes:</span> <span style="color:var(--cyan-glow); font-weight:bold;">${biomes}</span></div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:0.4rem;"><span>Depth:</span> <span style="color:var(--text-main); font-weight:bold;">${fish.environment.depthPref}</span></div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:0.4rem;"><span>Active:</span> <span style="color:var(--text-main); font-weight:bold;">${fish.environment.activeHours}</span></div>
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
            const fmt = v => v > 0 ? `<span class="dash-pos">+${v}</span>` : (v < 0 ? `<span class="dash-neg">${v}</span>` : `0`);
            statsHtml += `
                <div class="dashboard-group">
                    <h3>Lure Preferences (Lv.3)</h3>
                    <div style="display:flex; justify-content:space-between; margin-bottom:0.4rem;"><span>Color (Cold - Warm):</span> <span>${fmt(fish.lurePrefs.color)}</span></div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:0.4rem;"><span>Sound (Quiet - Loud):</span> <span>${fmt(fish.lurePrefs.sound)}</span></div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:0.4rem;"><span>Light (Dark - Glow):</span> <span>${fmt(fish.lurePrefs.light)}</span></div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:0.4rem;"><span>Weight (Float - Sink):</span> <span>${fmt(fish.lurePrefs.weight)}</span></div>
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

    renderQuests() {
        const player = this.gameState.player;
        const list = document.getElementById('grim-quests-list');
        list.innerHTML = '';
        
        // NEW: Update Header to show the 8 quest cap
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
                isComplete = q.currentAmount >= q.requiredAmount;
                progressHtml = `
                    <div style="margin-top: 1rem;">
                        <div style="display:flex; justify-content:space-between; margin-bottom: 0.2rem;"><span>Progress</span> <span style="color:${isComplete ? 'var(--green-safe)' : 'var(--cyan-glow)'}">${q.currentAmount} / ${q.requiredAmount} Caught</span></div>
                        <div style="width:100%; height:10px; background:#000; border-radius:5px; overflow:hidden;"><div style="height:100%; width:${Math.min(100, (q.currentAmount/q.requiredAmount)*100)}%; background:${isComplete ? 'var(--green-safe)' : 'var(--cyan-glow)'}"></div></div>
                    </div>
                `;
            } else if (q.type === 'trophy') {
                isComplete = q.currentBestWeight >= q.requiredWeight;
                progressHtml = `
                    <div style="margin-top: 1rem;">
                        <div style="display:flex; justify-content:space-between; margin-bottom: 0.2rem;"><span>Record Weight</span> <span style="color:${isComplete ? 'var(--green-safe)' : 'var(--cyan-glow)'}">${q.currentBestWeight}kg / ${q.requiredWeight}kg</span></div>
                        <div style="width:100%; height:10px; background:#000; border-radius:5px; overflow:hidden;"><div style="height:100%; width:${Math.min(100, (q.currentBestWeight/q.requiredWeight)*100)}%; background:${isComplete ? 'var(--green-safe)' : 'var(--cyan-glow)'}"></div></div>
                    </div>
                `;
            } else if (q.type === 'research') {
                // Dynamically calculate current knowledge from the bestiary
                let curLvl = 0;
                const bestiaryEntry = player.bestiary[q.targetSpeciesId];
                if (bestiaryEntry) {
                    if (bestiaryEntry.xp >= 250) curLvl = 3;
                    else if (bestiaryEntry.xp >= 100) curLvl = 2;
                    else curLvl = 1; // Caught at least once
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
            }

            let rewardItemText = '';
            if (q.rewards.item) {
                const itemName = q.rewards.item.id.replace('part_', '').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                rewardItemText = `<br/><span style="color:var(--cyan-glow); font-weight:bold;">+ ${q.rewards.item.qty}x ${itemName}</span>`;
            }

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
                
                ${isComplete ? '<div style="margin-top:1.5rem; color:var(--green-safe); font-weight:bold; font-size:1.4rem; text-align:center;">Return to a Settlement Notice Board to claim!</div>' : ''}
            `;

            card.querySelector('.btn-abandon').onclick = () => {
                SFX.playError();
                player.activeQuests.splice(index, 1);
                if (this.callbacks.onSave) this.callbacks.onSave();
                this.renderQuests();
            };

            list.appendChild(card);
        });
    }
};