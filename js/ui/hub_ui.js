/**
 * js/ui/hub_ui.js
 * Manages the Settlement Hub UI: Panoramic backgrounds, NPCs, Shops, and Dialogue.
 * V6 - Buy/Sell Modes, Shipyard Split, and Tooltip Integration.
 */

import { SFX } from '../audio/sfx_generator.js';
import { createRng } from '../util/rng.js';
import { getRarityColor, getItemColor } from '../util/utils.js';
import { generateSettlementArt } from '../art/settlement_generator.js';
import { generateNPCData } from '../data/npc_data_generator.js';
import { generateFishData } from '../data/fish_data_generator.js';
import { MerchantGenerator } from '../economy/merchant_generator.js';
import { DialogueGenerator } from '../economy/dialogue_generator.js';
import { QuestGenerator } from '../economy/quest_generator.js';
import { BIOMES } from '../exploration/biomes.js';
import { PlayerEngine } from '../data/player_data.js';

export const HubUI = {
    gameState: null,
    currentNode: null,
    callbacks: null,
    
    currentNPCs: {},
    currentShopInv: [],
    currentQuests: [],
    localFishPool:[],
    activeTab: 'market',
    marketMode: 'buy', // 'buy' or 'sell'
    
    typewriterTimer: null, 
    
    // --- NEW: Safehouse State ---
    safehouseSubTab: 'drydock',
    aquariumAnimFrame: null,
    aquariumEntities:[],

    init(callbacks) {
        this.callbacks = callbacks;

        document.getElementById('btn-hub-depart').addEventListener('click', () => {
            SFX.playUISelect();
            if (this.typewriterTimer) clearInterval(this.typewriterTimer);
            if (this.callbacks.onSave) this.callbacks.onSave(); 
            this.hideShopTooltip(); 
            this.close();
        });

        // --- Full Screen Safehouse Buttons ---
        document.getElementById('btn-exit-safehouse').addEventListener('click', () => {
            SFX.playUISelect();
            this.closeSafehouse();
        });

        document.querySelectorAll('.sh-main-tab').forEach(tab => {
            tab.addEventListener('click', (e) => {
                document.querySelectorAll('.sh-main-tab').forEach(t => t.classList.remove('active'));
                
                // FIX: Use currentTarget
                e.currentTarget.classList.add('active');
                SFX.playUISelect();
                
                this.safehouseSubTab = e.currentTarget.getAttribute('data-shtab');
                this.renderSafehouseFullScreen();
            });
        });

        // --- Settlement Tabs ---
        const tabs = document.querySelectorAll('.hub-tab-btn');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                // FIX: Use currentTarget to guarantee we click the button, not the text
                const targetTab = e.currentTarget.getAttribute('data-tab');

                // Intercept Safehouse Click
                if (targetTab === 'safehouse') {
                    SFX.playUISelect();
                    const coords = `${this.gameState.globalX},${this.gameState.globalY}`;
                    if (this.gameState.player.safehouses && this.gameState.player.safehouses[coords]) {
                        this.openSafehouse();
                        return; // Stop here, keep the Hub unchanged behind it
                    }
                }

                tabs.forEach(t => t.classList.remove('active'));
                e.currentTarget.classList.add('active');
                SFX.playUISelect();
                
                this.activeTab = targetTab;
                this.marketMode = 'buy'; 
                this.hideShopTooltip();
                
                this.renderActiveTab();
                this.triggerTabDialogue();
            });
        });
    },

    // --- NEW: Full Screen Controllers ---
    openSafehouse() {
        document.getElementById('z80-safehouse').style.display = 'flex';
        this.safehouseSubTab = 'drydock';
        
        // Reset Visual Tabs
        document.querySelectorAll('.sh-main-tab').forEach(t => t.classList.remove('active'));
        document.querySelector('.sh-main-tab[data-shtab="drydock"]').classList.add('active');
        
        this.renderSafehouseFullScreen();
    },

    closeSafehouse() {
        document.getElementById('z80-safehouse').style.display = 'none';
        this.stopAquariumLoop();
        // Return active hub tab focus visually back to whatever it was behind the safehouse
        this.renderActiveTab(); 
    },

    open(state, node) {
        this.gameState = state;
        this.currentNode = node;
        const player = state.player;
        
        if (!player.activeQuests) player.activeQuests =[];

        const hubEl = document.getElementById('z75-hub');
        hubEl.style.display = 'flex';

        const townSeed = state.world.seed + node.x + node.y;
        const rng = createRng(townSeed);
        const art = generateSettlementArt({ rng: createRng(townSeed), biomeId: node.biomeId });
        
        document.getElementById('hub-title').innerText = node.settlementName;
        document.getElementById('hub-biome').innerText = BIOMES[node.biomeId].name;
        document.getElementById('hub-img').src = art.imageDataUrl;

        this.currentNPCs = {
            market: generateNPCData({ seed: rng.next() * 10000 }),
            fishmonger: generateNPCData({ seed: rng.next() * 10000 }),
            boatwright: generateNPCData({ seed: rng.next() * 10000 }),
            tavern: generateNPCData({ seed: rng.next() * 10000 })
        };

        const dailySeed = townSeed + state.gameDay;
        this.currentShopInv = MerchantGenerator.generateInventory(dailySeed, node.biomeId, player.stats.bartering);
        
        // Pass the entire world state so quests map perfectly to global nodes
        this.currentQuests = QuestGenerator.generateQuestBoard(dailySeed, player.vitals.level, state.world);
        
        this.activeTab = 'market';
        this.marketMode = 'buy';
        document.querySelectorAll('.hub-tab-btn').forEach(t => t.classList.remove('active'));
        document.querySelector('.hub-tab-btn[data-tab="market"]').classList.add('active');
        
        this.renderActiveTab();
        this.triggerTabDialogue();
    },

    close() {
        document.getElementById('z75-hub').style.display = 'none';
        this.stopAquariumLoop(); // <-- NEW
        this.gameState = null;
        if (this.callbacks.onDepart) this.callbacks.onDepart();
    },

    triggerTabDialogue() {
        // NEW: Intercept the Safehouse tab so it doesn't look for an NPC!
        if (this.activeTab === 'safehouse') {
            const player = this.gameState.player;
            document.getElementById('hub-dialogue-portrait').src = player.identity.portraitData;
            document.getElementById('hub-speaker').innerText = player.identity.name + ":";
            
            const msg = "My own private corner of the darklake. Time to get organized.";
            
            const textContainer = document.getElementById('hub-text');
            textContainer.innerText = '""'; 

            if (this.typewriterTimer) clearInterval(this.typewriterTimer);

            let index = 0;
            this.typewriterTimer = setInterval(() => {
                if (index < msg.length) {
                    textContainer.innerText = `"${msg.substring(0, index + 1)}"`;
                    index++;
                } else {
                    clearInterval(this.typewriterTimer);
                }
            }, 40); 
            return; // Exit early so it doesn't run the normal NPC logic!
        }

        const npc = this.currentNPCs[this.activeTab];
        let msg = "";
        const rng = createRng(Date.now());
        
        if (this.activeTab === 'tavern') {
            if (rng.chance(0.5) && this.localFishPool.length > 0) msg = DialogueGenerator.generateRumor(rng.pick(this.localFishPool), rng);
            else msg = DialogueGenerator.getLore(rng);
        } else {
            const roleName = this.activeTab === 'market' ? 'Merchant' : this.activeTab.charAt(0).toUpperCase() + this.activeTab.slice(1);
            msg = DialogueGenerator.getGreeting(roleName, rng);
        }
        
        this.triggerDialogue(npc, msg);
    },

    triggerDialogue(npc, text) {
        document.getElementById('hub-dialogue-portrait').src = npc.imageDataUrl;
        document.getElementById('hub-speaker').innerText = npc.name + ":";
        
        const textContainer = document.getElementById('hub-text');
        textContainer.innerText = '""'; 

        if (this.typewriterTimer) clearInterval(this.typewriterTimer);

        let index = 0;
        this.typewriterTimer = setInterval(() => {
            if (index < text.length) {
                textContainer.innerText = `"${text.substring(0, index + 1)}"`;
                index++;
            } else {
                clearInterval(this.typewriterTimer);
            }
        }, 40); 

        SFX.speakText(text, npc.race, npc.gender, 40);
    },

    renderActiveTab() {
        const content = document.getElementById('hub-content-area');
        content.innerHTML = ''; 
        
        // Stop aquarium animation if we navigate away from it
        if (this.activeTab !== 'safehouse' || this.safehouseSubTab !== 'aquarium') {
            this.stopAquariumLoop();
        }
        
        if (this.activeTab === 'market') this.renderMarket(content);
        else if (this.activeTab === 'fishmonger') this.renderFishmonger(content);
        else if (this.activeTab === 'boatwright') this.renderBoatwright(content);
        else if (this.activeTab === 'tavern') this.renderTavern(content);
        else if (this.activeTab === 'safehouse') this.renderSafehouse(content); // <-- NEW
    },

    // --- MARKET: BUY & SELL TOGGLE ---

    renderMarket(container) {
        const player = this.gameState.player;
        const effStats = PlayerEngine.getEffectiveStats(player);
        const maxCargo = effStats.exploration.cargoSpace;
        const currentInvCount = player.inventory.length;
        
        container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:baseline; border-bottom: 2px solid var(--panel-border); padding-bottom: 0.5rem; margin-bottom: 1rem;">
                <div style="display: flex; gap: 1rem; align-items: baseline;">
                    <h2 style="margin:0; color:var(--cyan-glow); font-size: 1.8rem;">General Market</h2>
                    <div style="display:flex; gap:0.5rem; margin-left: 1rem;">
                        <button class="menu-btn" id="btn-market-buy" style="padding: 0.2rem 0.8rem; font-size: 1.1rem; width: auto; margin: 0; border-color: ${this.marketMode === 'buy' ? 'var(--cyan-glow)' : 'var(--panel-border)'}; color: ${this.marketMode === 'buy' ? 'var(--cyan-glow)' : 'var(--text-muted)'};">Buy</button>
                        <button class="menu-btn" id="btn-market-sell" style="padding: 0.2rem 0.8rem; font-size: 1.1rem; width: auto; margin: 0; border-color: ${this.marketMode === 'sell' ? 'var(--cyan-glow)' : 'var(--panel-border)'}; color: ${this.marketMode === 'sell' ? 'var(--cyan-glow)' : 'var(--text-muted)'};">Sell</button>
                    </div>
                </div>
                <div style="font-size: 1.4rem; color:var(--gold-warn);">💰 ${player.vitals.gold}g</div>
            </div>
            <div id="hub-market-list"></div>
        `;
        
        document.getElementById('btn-market-buy').onclick = () => { SFX.playUISelect(); this.marketMode = 'buy'; this.hideShopTooltip(); this.renderActiveTab(); };
        document.getElementById('btn-market-sell').onclick = () => { SFX.playUISelect(); this.marketMode = 'sell'; this.hideShopTooltip(); this.renderActiveTab(); };

        const list = document.getElementById('hub-market-list');
        
        if (this.marketMode === 'buy') {
            // Filter OUT boats and boat upgrades
            const marketItems = this.currentShopInv.filter(i => i.type !== 'boat' && i.type !== 'upgrade');
            
            marketItems.forEach((item) => {
                const row = document.createElement('div');
                row.className = 'shop-item-row';
                
                let disableReason = null;
                const isCargoItem = (item.type === 'part' || item.visualId || item.type === 'rod' || item.type === 'lure');
                if (isCargoItem && currentInvCount >= maxCargo) disableReason = "Cargo Full";
                
                const canAfford = player.vitals.gold >= item.price;
                const hasStock = item.stock > 0;
                
                let btnText = "Buy";
                if (disableReason) btnText = disableReason;
                else if (!hasStock) btnText = "Sold Out";
                else if (!canAfford) btnText = "Too Expensive";

                const isDisabled = disableReason || !canAfford || !hasStock;
                
                // NEW: Grab the pixel art if it exists
                let imgSrc = '';
                if (item.type === 'rod') imgSrc = item.itemData.art.imageDataUrl;
                else if (item.type === 'boat') imgSrc = item.itemData.art.profileDataUrl;
                else if (item.type === 'part' || item.visualId) imgSrc = item.imageDataUrl;
                
                let imgHtml = imgSrc ? `<img src="${imgSrc}" style="width:48px; height:48px; background:#000; border:1px solid var(--panel-border); border-radius:4px; image-rendering:pixelated;" />` : '';

                const itemName = item.name || (item.identity ? item.identity.name : 'Item');
                const nameColor = getItemColor(item.itemData || item);

                row.innerHTML = `
                    <div style="display:flex; gap: 1rem; align-items:center;">
                        ${imgHtml}
                        <div class="shop-item-info">
                            <b style="color: ${nameColor};">${itemName}</b> <span style="font-size:0.85rem; color:var(--text-muted); text-transform:uppercase;">[${item.type || item.rarity}]</span>
                            <p>${item.desc || `Stock: ${item.stock === 99 ? 'Infinite' : item.stock}`}</p>
                        </div>
                    </div>
                    <div class="shop-buy">
                        <span class="shop-price">${item.price}g</span>
                        <button class="menu-btn btn-buy" style="width: auto; padding: 0.4rem 1rem; margin:0; font-size:1.2rem; ${isDisabled ? 'opacity:0.4; cursor:not-allowed; border-color:var(--panel-border); color:var(--text-muted);' : ''}" ${isDisabled ? 'disabled' : ''}>${btnText}</button>
                    </div>
                `;
                
                row.addEventListener('mouseenter', (e) => this.showShopTooltip(item, e));
                row.addEventListener('mousemove', (e) => this.moveShopTooltip(e));
                row.addEventListener('mouseleave', () => this.hideShopTooltip());

                if (!isDisabled) {
                    row.querySelector('.btn-buy').onclick = () => {
                        SFX.playGold();
                        player.vitals.gold -= item.price;
                        if (item.stock !== 99) item.stock--;
                        
                        if (item.id === 'cons_ration') player.vitals.rations += 1;
                        else if (item.id === 'cons_fuel_oil') player.vitals.fuel = 100;
                        else if (item.id === 'cons_repair_kit') player.vitals.hp = Math.min(player.gear.boat.stats.maxHp, player.vitals.hp + 25);
                        else if (isCargoItem) {
                            if (item.type === 'rod' || item.type === 'lure') player.inventory.push({ ...item.itemData, invType: item.type });
                            else player.inventory.push({ ...item, invType: 'part' }); 
                        }

                        const rng = createRng(Date.now());
                        if (rng.chance(0.3)) this.triggerDialogue(this.currentNPCs.market, DialogueGenerator.getHaggleResponse(true, rng));
                        
                        this.hideShopTooltip();
                        this.renderActiveTab(); 
                    };
                }
                list.appendChild(row);
            });
        } 
        else {
            // SELL MODE
            const sellableItems = player.inventory.filter(i => i.invType !== 'fish' && i.invType !== 'boat');
            
            if (sellableItems.length === 0) {
                list.innerHTML = `<p style="color:var(--text-muted); font-size:1.2rem; text-align:center;">You have no gear or parts to sell.</p>`;
            }

            sellableItems.forEach((item) => {
                const row = document.createElement('div');
                row.className = 'shop-item-row';
                
                const baseVal = item.economy ? item.economy.value : (item.basePrice || 10);
                const sellValue = Math.max(1, Math.round(baseVal * effStats.economy.sellMultiplier));
                const realIndex = player.inventory.findIndex(i => i === item);
                
                let imgSrc = item.imageDataUrl || (item.art ? item.art.imageDataUrl : '');
                let imgHtml = imgSrc ? `<img src="${imgSrc}" style="width:40px; height:40px; background:#000; border:1px solid var(--panel-border); border-radius:4px; image-rendering:pixelated;" />` : '';

                const itemName = item.name || (item.identity ? item.identity.name : 'Item');
                const nameColor = getItemColor(item);

                row.innerHTML = `
                    <div style="display:flex; gap: 1rem; align-items:center;">
                        ${imgHtml}
                        <div class="shop-item-info">
                            <b style="color: ${nameColor};">${itemName}</b> <span style="font-size:0.85rem; color:var(--text-muted); text-transform:uppercase;">[${item.invType || 'part'}]</span>
                        </div>
                    </div>
                    <div class="shop-buy">
                        <span class="shop-price" style="color:var(--green-safe);">+${sellValue}g</span>
                        <button class="menu-btn btn-sell" style="width: auto; padding: 0.4rem 1rem; margin:0; font-size:1.2rem;">Sell</button>
                    </div>
                `;

                row.querySelector('.btn-sell').onclick = () => {
                    SFX.playGold();
                    player.vitals.gold += sellValue;
                    player.inventory.splice(realIndex, 1);
                    this.renderActiveTab();
                };

                list.appendChild(row);
            });
        }
    },

    // --- FISHMONGER ---

    renderFishmonger(container) {
        const player = this.gameState.player;
        const fishInventory = player.inventory.filter(item => item.invType === 'fish');
        const effStats = PlayerEngine.getEffectiveStats(player);
        
        container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:baseline; border-bottom: 2px solid var(--panel-border); padding-bottom: 0.5rem; margin-bottom: 1rem;">
                <h2 style="margin:0; color:var(--cyan-glow); font-size: 1.8rem;">The Fishmonger</h2>
                <div style="display: flex; gap: 1rem; align-items: baseline;">
                    <button class="menu-btn" id="btn-sell-all" style="width: auto; padding: 0.4rem 1rem; margin:0; font-size: 1.2rem;" ${fishInventory.length === 0 ? 'disabled' : ''}>Sell All</button>
                    <div style="font-size: 1.4rem; color:var(--gold-warn);">💰 ${player.vitals.gold}g</div>
                </div>
            </div>
            <div id="hub-fish-list"></div>
        `;
        
        const list = document.getElementById('hub-fish-list');

        if (fishInventory.length === 0) {
            list.innerHTML = `<p style="color:var(--text-muted); font-size:1.2rem; margin-top:1rem; text-align:center;">Your cargo is empty. Go catch some fish!</p>`;
        } else {
            fishInventory.forEach((fish) => {
                const row = document.createElement('div');
                row.className = 'shop-item-row';
                const sellValue = Math.max(1, Math.round(fish.economy.baseValue * effStats.economy.sellMultiplier));
                
                row.innerHTML = `
                    <div style="display:flex; gap: 1rem; align-items:center;">
                        <img src="${fish.art.imageDataUrl}" style="width:48px; height:48px; background:#000; border:1px solid var(--panel-border); border-radius:4px; image-rendering:pixelated;" />
                        <div class="shop-item-info">
                            <b style="color: ${getItemColor(fish)};">${fish.identity.name}</b> <span style="font-size:0.85rem; color:var(--text-muted); text-transform:uppercase;">[${fish.physical.sizeTier}]</span>
                            <p>${fish.actualWeight}kg</p>
                        </div>
                    </div>
                    <div class="shop-buy">
                        <span class="shop-price" style="color:var(--green-safe);">+${sellValue}g</span>
                        <button class="menu-btn btn-sell" style="width: auto; padding: 0.4rem 1rem; margin:0; font-size:1.2rem;">Sell</button>
                    </div>
                `;
                
                row.querySelector('.btn-sell').onclick = () => {
                    SFX.playGold();
                    player.vitals.gold += sellValue;
                    const invIdx = player.inventory.findIndex(i => i.instanceId === fish.instanceId);
                    if (invIdx > -1) player.inventory.splice(invIdx, 1);
                    this.renderActiveTab();
                };
                list.appendChild(row);
            });
        }

        document.getElementById('btn-sell-all').onclick = () => {
            let totalGold = 0;
            fishInventory.forEach(fish => {
                totalGold += Math.max(1, Math.round(fish.economy.baseValue * effStats.economy.sellMultiplier));
            });
            if (totalGold > 0) {
                SFX.playGold();
                player.vitals.gold += totalGold;
                player.inventory = player.inventory.filter(item => item.invType !== 'fish');
                this.triggerDialogue(this.currentNPCs.fishmonger, "A fine haul! Here's your coin.");
                this.renderActiveTab();
            }
        };
    },

    // --- BOATWRIGHT & SHIPYARD ---

    renderBoatwright(container) {
        const player = this.gameState.player;
        const effStats = PlayerEngine.getEffectiveStats(player);
        const maxCargo = effStats.exploration.cargoSpace;
        const currentInvCount = player.inventory.length;

        const boat = player.gear.boat;
        const missingHp = boat.stats.maxHp - player.vitals.hp;
        const repairCost = Math.ceil(missingHp * 2); 
        const canAfford = player.vitals.gold >= repairCost;
        const isDamaged = missingHp > 0;

        container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:baseline; border-bottom: 2px solid var(--panel-border); padding-bottom: 0.5rem; margin-bottom: 1rem;">
                <h2 style="margin:0; color:var(--cyan-glow); font-size: 1.8rem;">The Boatwright</h2>
                <div style="font-size: 1.4rem; color:var(--gold-warn);">💰 ${player.vitals.gold}g</div>
            </div>
            
            <div style="background: var(--bg-void); border: 1px solid var(--panel-border); padding: 1.5rem; border-radius: 4px; display: flex; align-items: center; justify-content: space-between; margin-bottom: 1.5rem;">
                <div>
                    <h3 style="margin:0 0 0.5rem 0; color:var(--text-main); font-size: 1.4rem;">Hull Integrity</h3>
                    <div style="font-size:1.2rem; color: ${isDamaged ? 'var(--red-danger)' : 'var(--green-safe)'}; margin-bottom: 0.5rem;">
                        ${Math.floor(player.vitals.hp)} / ${boat.stats.maxHp} HP
                    </div>
                    <p style="margin:0; color:var(--text-muted); font-size: 1rem;">
                        ${isDamaged ? `It will cost 2g per point of damage to patch her up.` : `She's ship-shape and ready to sail.`}
                    </p>
                </div>
                <div style="text-align: right;">
                    <div style="color:var(--gold-warn); font-size:1.2rem; margin-bottom:0.5rem; font-weight:bold;">Cost: ${repairCost}g</div>
                    <button class="menu-btn" id="btn-repair" style="width: auto; padding: 0.5rem 1rem; margin:0; font-size: 1.2rem;" ${!isDamaged || !canAfford ? 'disabled' : ''}>Repair Hull</button>
                </div>
            </div>
            
            <h3 style="margin:0 0 0.5rem 0; color:var(--cyan-glow); font-size: 1.4rem; border-bottom: 1px solid var(--panel-border); padding-bottom:0.5rem;">Shipyard (Boats & Upgrades)</h3>
            <div id="hub-shipyard-list"></div>
            
            <div id="hub-old-boats" style="margin-top: 2rem;"></div>
        `;

        const btnRepair = document.getElementById('btn-repair');
        if (btnRepair) {
            btnRepair.onclick = () => {
                if (isDamaged && canAfford) {
                    SFX.playUIHover(); 
                    player.vitals.gold -= repairCost;
                    player.vitals.hp = boat.stats.maxHp;
                    this.triggerDialogue(this.currentNPCs.boatwright, "She'll hold water now. Try not to hit any more rocks.");
                    this.renderActiveTab();
                }
            };
        }

        // SHIPYARD INVENTORY (Buy Boats/Upgrades)
        const shipyardList = document.getElementById('hub-shipyard-list');
        const shipyardItems = this.currentShopInv.filter(item => item.type === 'boat' || item.type === 'upgrade');

        if (shipyardItems.length === 0) {
            shipyardList.innerHTML = `<p style="color:var(--text-muted); font-size:1.1rem; text-align:center;">No new hulls or parts in stock today.</p>`;
        }

        shipyardItems.forEach((item) => {
            const row = document.createElement('div');
            row.className = 'shop-item-row';
            
            let disableReason = null;
            if (item.type === 'boat') {
                let newCargoLimit = item.itemData.stats.cargoSpace;
                if (player.gear.boat.upgrades.storage) newCargoLimit += 10;
                if (currentInvCount > newCargoLimit) disableReason = "Cargo Too Full To Swap";
            } 
            else if (item.type === 'upgrade') {
                if (item.id.includes('lantern') && player.gear.boat.upgrades.lantern && player.gear.boat.upgrades.lantern.id === item.id) disableReason = "Owned";
                if (item.id === 'upg_cargo_net' && player.gear.boat.upgrades.storage) disableReason = "Owned";
                if (item.id === 'upg_iron_plating' && player.gear.boat.upgrades.plating) disableReason = "Owned";
            }

            const canAfford = player.vitals.gold >= item.price;
            const hasStock = item.stock > 0;
            
            let btnText = "Buy";
            if (disableReason) btnText = disableReason;
            else if (!hasStock) btnText = "Sold Out";
            else if (!canAfford) btnText = "Too Expensive";

            const isDisabled = disableReason || !canAfford || !hasStock;

            // NEW: Grab the pixel art if it exists
            let imgSrc = '';
            if (item.type === 'boat') imgSrc = item.itemData.art.profileDataUrl;
            
            let imgHtml = imgSrc ? `<img src="${imgSrc}" style="width:64px; height:64px; background:#000; border:1px solid var(--panel-border); border-radius:4px; image-rendering:pixelated; object-fit:contain;" />` : '';

            const itemName = item.name || (item.identity ? item.identity.name : 'Item');
            const nameColor = getItemColor(item.itemData || item);

                row.innerHTML = `
                    <div style="display:flex; gap: 1rem; align-items:center;">
                        ${imgHtml}
                        <div class="shop-item-info">
                            <b style="color: ${nameColor};">${itemName}</b> <span style="font-size:0.85rem; color:var(--text-muted); text-transform:uppercase;">[${item.type || item.rarity}]</span>
                            <p>${item.desc || `Stock: ${item.stock === 99 ? 'Infinite' : item.stock}`}</p>
                        </div>
                    </div>
                <div class="shop-buy">
                    <span class="shop-price">${item.price}g</span>
                    <button class="menu-btn btn-buy" style="width: auto; padding: 0.4rem 1rem; margin:0; font-size:1.2rem; ${isDisabled ? 'opacity:0.4; cursor:not-allowed; border-color:var(--panel-border); color:var(--text-muted);' : ''}" ${isDisabled ? 'disabled' : ''}>${btnText}</button>
                </div>
            `;
            
            row.addEventListener('mouseenter', (e) => this.showShopTooltip(item, e));
            row.addEventListener('mousemove', (e) => this.moveShopTooltip(e));
            row.addEventListener('mouseleave', () => this.hideShopTooltip());

            if (!isDisabled) {
                row.querySelector('.btn-buy').onclick = () => {
                    SFX.playGold();
                    player.vitals.gold -= item.price;
                    if (item.stock !== 99) item.stock--;
                    
                    if (item.type === 'upgrade') {
                        if (item.id.includes('lantern')) player.gear.boat.upgrades.lantern = item;
                        else if (item.id === 'upg_cargo_net') {
                            player.gear.boat.upgrades.storage = item;
                            player.gear.boat.stats.cargoSpace += 10;
                        } else if (item.id === 'upg_iron_plating') {
                            player.gear.boat.upgrades.plating = item;
                            player.gear.boat.stats.maxHp += 50;
                        }
                    } else if (item.type === 'boat') {
                        const oldUpgrades = player.gear.boat.upgrades;
                        const newBoat = item.itemData;
                        newBoat.invType = 'boat'; 
                        newBoat.upgrades = oldUpgrades; 
                        
                        if (oldUpgrades.storage) newBoat.stats.cargoSpace += 10;
                        if (oldUpgrades.plating) newBoat.stats.maxHp += 50;
                        
                        // Push old boat to inventory (safely reset its upgrades so they aren't duplicated)
                        const oldBoatCopy = JSON.parse(JSON.stringify(player.gear.boat));
                        oldBoatCopy.upgrades = { lantern: { id: 'lantern_basic', name: 'Basic Lantern', lightRadius: 100, fuelDrainRate: 1.0 }, plating: null, engine: null, storage: null };
                        if (oldUpgrades.storage) oldBoatCopy.stats.cargoSpace -= 10;
                        if (oldUpgrades.plating) oldBoatCopy.stats.maxHp -= 50;
                        player.inventory.push(oldBoatCopy);

                        player.gear.boat = newBoat;
                        player.vitals.hp = Math.min(player.vitals.hp, newBoat.stats.maxHp); 
                    }

                    this.hideShopTooltip();
                    this.renderActiveTab(); 
                };
            }
            shipyardList.appendChild(row);
        });

        // SELL OLD BOATS
        const ownedBoats = player.inventory.filter(i => i.invType === 'boat');
        if (ownedBoats.length > 0) {
            const oldBoatContainer = document.getElementById('hub-old-boats');
            oldBoatContainer.innerHTML = `<h3 style="margin:0 0 0.5rem 0; color:var(--text-muted); font-size: 1.4rem; border-bottom: 1px solid var(--panel-border); padding-bottom:0.5rem;">Scrap Old Hulls</h3>`;
            
            ownedBoats.forEach(oldB => {
                const row = document.createElement('div');
                row.className = 'shop-item-row';
                
                const baseVal = oldB.economy ? oldB.economy.value : 50;
                const sellValue = Math.max(1, Math.round(baseVal * effStats.economy.sellMultiplier));
                const realIndex = player.inventory.findIndex(i => i === oldB);

                row.innerHTML = `
                    <div style="display:flex; gap: 1rem; align-items:center;">
                        <img src="${oldB.art.profileDataUrl}" style="width:40px; height:40px; background:#000; border:1px solid var(--panel-border); border-radius:4px; image-rendering:pixelated;" />
                        <div class="shop-item-info">
                            <b style="color: ${getItemColor(oldB)};">${oldB.identity.name}</b> <span style="font-size:0.85rem; color:var(--text-muted); text-transform:uppercase;">[BOAT]</span>
                        </div>
                    </div>
                    <div class="shop-buy">
                        <span class="shop-price" style="color:var(--green-safe);">+${sellValue}g</span>
                        <button class="menu-btn btn-sell" style="width: auto; padding: 0.4rem 1rem; margin:0; font-size:1.2rem;">Scrap</button>
                    </div>
                `;

                row.querySelector('.btn-sell').onclick = () => {
                    SFX.playGold();
                    player.vitals.gold += sellValue;
                    player.inventory.splice(realIndex, 1);
                    this.renderActiveTab();
                };
                oldBoatContainer.appendChild(row);
            });
        }
    },

    // --- TAVERN / QUESTS ---

    renderTavern(container) {
        const player = this.gameState.player;
        
        container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:baseline; border-bottom: 2px solid var(--panel-border); padding-bottom: 0.5rem; margin-bottom: 1rem;">
                <h2 style="margin:0; color:var(--cyan-glow); font-size: 1.8rem;">The Notice Board</h2>
                <div style="font-size: 1.1rem; color:var(--text-muted);">Speak to the Patron for hints.</div>
            </div>
            
            <div id="hub-turnin-section" style="margin-bottom: 2rem; display: none;">
                <h3 style="color:var(--green-safe); font-size: 1.4rem; margin-bottom: 0.5rem;">Completed Quests (Ready to Turn In)</h3>
                <div id="hub-turnin-list" style="display: flex; flex-direction: column; gap: 0.5rem;"></div>
            </div>
            
            <h3 style="color:var(--text-main); font-size: 1.4rem; margin-bottom: 0.5rem;">Available Jobs</h3>
            <div id="hub-quest-list" style="display: grid; grid-template-columns: 1fr 1fr; gap: 1rem;"></div>
        `;

        const turnInSection = document.getElementById('hub-turnin-section');
        const turnInList = document.getElementById('hub-turnin-list');
        const list = document.getElementById('hub-quest-list');
        
        let hasTurnIns = false;
        
        // --- 1. TURN IN COMPLETED QUESTS ---
        player.activeQuests.forEach((q, index) => {
            let isComplete = false;
            if (q.type === 'hunt') isComplete = q.currentAmount >= q.requiredAmount;
            else if (q.type === 'trophy') isComplete = q.currentBestWeight >= q.requiredWeight;
            else if (q.type === 'research') {
                let curLvl = 0;
                const bestiaryEntry = player.bestiary[q.targetSpeciesId];
                if (bestiaryEntry) {
                    if (bestiaryEntry.xp >= 250) curLvl = 3;
                    else if (bestiaryEntry.xp >= 100) curLvl = 2;
                    else curLvl = 1;
                }
                isComplete = curLvl >= q.requiredKnowledgeLevel;
            }
            else if (q.type === 'bounty') isComplete = q.isComplete;

            if (isComplete) {
                hasTurnIns = true;
                turnInSection.style.display = 'block';
                
                const card = document.createElement('div');
                card.className = 'shop-item-row';
                card.style.borderColor = 'var(--green-safe)';
                
                let rewardText = `+${q.rewards.gold}g, +${q.rewards.xp} XP`;
                if (q.rewards.item) {
                    const itemName = q.rewards.item.id.replace('part_', '').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                    rewardText += `, +${q.rewards.item.qty}x ${itemName}`;
                }

                card.innerHTML = `
                    <div>
                        <b style="color:var(--cyan-glow); font-size: 1.2rem;">${q.title}</b>
                        <p style="color:var(--gold-warn); font-size: 1rem; margin-top:0.2rem;">Rewards: ${rewardText}</p>
                    </div>
                    <button class="menu-btn" style="width: auto; padding: 0.5rem 1rem; margin:0; font-size: 1.2rem; border-color: var(--green-safe); color: var(--green-safe);">Claim</button>
                `;

                card.querySelector('button').onclick = () => {
                    SFX.playCatchSuccess();
                    
                    player.vitals.gold += q.rewards.gold;
                    const leveledUp = PlayerEngine.addXp(player, q.rewards.xp);
                    if (leveledUp) SFX.playLevelUp();
                    
                    if (q.rewards.item) {
                        player.inventory.push({ 
                            id: `part_${Date.now()}`,
                            invType: 'part',
                            name: q.rewards.item.id.replace('part_', '').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '),
                            visualId: q.rewards.item.id.replace('part_', ''),
                            rarity: 'Rare',
                            stats: { color: 10, sound: 10, light: 10, weight: 10 }
                        });
                    }

                    // --- NEW: Consume Fish for Hunt Quests ---
                    if (q.type === 'hunt') {
                        let removed = 0;
                        for (let i = player.inventory.length - 1; i >= 0; i--) {
                            if (player.inventory[i].invType === 'fish' && player.inventory[i].id === q.targetSpeciesId) {
                                player.inventory.splice(i, 1);
                                removed++;
                                if (removed >= q.requiredAmount) break;
                            }
                        }
                    }

                    // Safely remove from Active Quests
                    const activeIdx = player.activeQuests.findIndex(aq => aq.id === q.id);
                    if (activeIdx > -1) player.activeQuests.splice(activeIdx, 1);

                    // --- NEW: Remove from the Town's board so it doesn't reappear ---
                    const boardIdx = this.currentQuests.findIndex(bq => bq.id === q.id);
                    if (boardIdx > -1) this.currentQuests.splice(boardIdx, 1);

                    this.triggerDialogue(this.currentNPCs.tavern, "Well done! The guild sends their regards.");
                    
                    if (this.callbacks.onSave) this.callbacks.onSave();
                    this.renderActiveTab();
                };
                turnInList.appendChild(card);
            }
        });

        // --- 2. RENDER AVAILABLE QUESTS ---
        if (this.currentQuests.length === 0) {
            list.innerHTML = `<p style="color:var(--text-muted); font-size:1.2rem; grid-column: span 2; text-align: center;">No jobs posted today.</p>`;
            return;
        }

        // CRITICAL FIX: The activeCount definition must exist here!
        const activeCount = player.activeQuests.length;

        this.currentQuests.forEach(q => {
            const rng = createRng(Date.now() + q.difficulty);
            const flavor = DialogueGenerator.getQuestFlavor(q, rng);
            
            const isAccepted = player.activeQuests.some(aq => aq.id === q.id);
            const isFull = !isAccepted && activeCount >= 8;

            const card = document.createElement('div');
            card.style.cssText = "background: var(--bg-void); border: 1px solid var(--panel-border); padding: 1rem; border-radius: 4px; display: flex; flex-direction: column;";
            
            let rewardItemText = '';
            if (q.rewards.item) {
                const itemName = q.rewards.item.id.replace('part_', '').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                rewardItemText = `<br/><span style="color:var(--cyan-glow); font-weight:bold;">+ ${q.rewards.item.qty}x ${itemName}</span>`;
            }

            let btnText = 'Accept Quest';
            let btnStyle = '';
            let btnDisabled = '';

            if (isAccepted) {
                btnText = 'Accepted';
                btnStyle = 'border-color:var(--green-safe); color:var(--green-safe);';
                btnDisabled = 'disabled';
            } else if (isFull) {
                btnText = 'Log Full (8/8)';
                btnStyle = 'opacity:0.5; cursor:not-allowed; border-color:var(--panel-border); color:var(--text-muted);';
                btnDisabled = 'disabled';
            }

            card.innerHTML = `
                <h3 style="margin:0 0 0.5rem 0; color:var(--cyan-glow); font-size:1.2rem;">${q.title}</h3>
                <p style="color:var(--text-muted); font-style:italic; font-size:0.9rem; margin-top:0;">"${flavor}"</p>
                <p style="color:var(--text-main); font-size:1rem; margin-bottom:1rem; flex: 1;">${q.desc}</p>
                
                <div style="border-top: 1px dashed var(--panel-border); padding-top: 0.5rem; font-size: 1rem; margin-bottom: 0.5rem;">
                    <span style="color:var(--gold-warn); font-weight:bold;">Reward: ${q.rewards.gold}g</span> | 
                    <span style="color:#A78BFA; font-weight:bold;">${q.rewards.xp} XP</span>
                    ${rewardItemText}
                </div>
                
                <button class="menu-btn btn-accept" style="width:100%; padding:0.4rem; margin:0; font-size:1.1rem; ${btnStyle}" ${btnDisabled}>
                    ${btnText}
                </button>
            `;
            
            if (!isAccepted && !isFull) {
                card.querySelector('.btn-accept').onclick = () => {
                    SFX.playUISelect();
                    player.activeQuests.push(q);
                    if (this.callbacks.onSave) this.callbacks.onSave();
                    this.renderActiveTab(); 
                };
            }
            
            list.appendChild(card);
        });
    },

    // ==========================================
    // SAFEHOUSE & REAL ESTATE
    // ==========================================

    renderSafehouse(container) {
        // This is only called when clicking the Hub Tab and the safehouse is NOT owned yet.
        const player = this.gameState.player;
        const coords = `${this.gameState.globalX},${this.gameState.globalY}`;

        container.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:baseline; border-bottom: 2px solid var(--panel-border); padding-bottom: 0.5rem; margin-bottom: 2rem;">
                <h2 style="margin:0; color:var(--gold-warn); font-size: 1.8rem;">Abandoned Warehouse</h2>
                <div style="font-size: 1.4rem; color:var(--gold-warn);">💰 ${player.vitals.gold}g</div>
            </div>
            <div style="text-align:center; padding: 3rem; background: var(--bg-void); border: 1px dashed var(--panel-border); border-radius: 8px;">
                <h3 style="font-size: 2.2rem; color: var(--text-main); margin-bottom: 1rem;">Prime Real Estate</h3>
                <p style="font-size: 1.3rem; color: var(--text-muted); max-width: 600px; margin: 0 auto 2rem auto; line-height: 1.5;">
                    A sturdy, if dusty, property located right on the docks. Includes a dry dock crane, a storage basement, and a cracked glass viewing tank.<br><br>
                    Purchasing this property unlocks permanent storage and boat customization in this settlement.
                </p>
                <button class="menu-btn" id="btn-buy-safehouse" style="font-size: 1.5rem; color: var(--gold-warn); border-color: var(--gold-warn);" ${player.vitals.gold < 1000 ? 'disabled' : ''}>
                    Purchase Deed (1,000g)
                </button>
            </div>
        `;
        
        const btn = document.getElementById('btn-buy-safehouse');
        if (btn && !btn.disabled) {
            btn.onclick = () => {
                SFX.playGold();
                player.vitals.gold -= 1000; // Restored original 1000g cost
                player.safehouses[coords] = {
                    stash: [], hangar: [], aquarium:[],
                    stashTier: 1, hangarTier: 1, aquariumTier: 1,
                    stashCapacity: 10, hangarCapacity: 1, aquariumCapacity: 3,
                    aquariumTheme: this.currentNode.biomeId,
                    unlockedThemes:[this.currentNode.biomeId] // NEW: Array of unlocked themes
                };
                if (this.callbacks.onSave) this.callbacks.onSave();
                
                // Immediately open the full screen and reset the Hub tab behind it
                document.querySelectorAll('.hub-tab-btn').forEach(t => t.classList.remove('active'));
                document.querySelector('.hub-tab-btn[data-tab="market"]').classList.add('active');
                this.activeTab = 'market';
                this.openSafehouse();
            };
        }
    },

    renderSafehouseFullScreen() {
        const player = this.gameState.player;
        const coords = `${this.gameState.globalX},${this.gameState.globalY}`;
        const safehouse = player.safehouses[coords];
        
        if (!safehouse) return;

        // Stop aquarium animation if we navigate away from it
        if (this.safehouseSubTab !== 'aquarium') this.stopAquariumLoop();

        document.getElementById('sh-gold-display').innerText = player.vitals.gold;
        const shContent = document.getElementById('safehouse-full-content');
        shContent.innerHTML = ''; // Clear it

        if (this.safehouseSubTab === 'drydock') this.renderSHDryDock(shContent, safehouse, player);
        else if (this.safehouseSubTab === 'stash') this.renderSHStash(shContent, safehouse, player);
        else if (this.safehouseSubTab === 'aquarium') this.renderSHAquarium(shContent, safehouse, player);
        else if (this.safehouseSubTab === 'realestate') this.renderSHRealEstate(shContent, safehouse, player);
    },

    // --- SUB-VIEW: DRY DOCK ---
    renderSHDryDock(container, safehouse, player) {
        const boat = player.gear.boat;
        const upg = boat.upgrades;

        const renderSlot = (slotKey, item, icon) => {
            if (!item) {
                return `<div class="upgrade-slot empty">
                            <div style="font-size:2rem; opacity:0.5;">${icon}</div>
                            <div><b style="color:var(--text-muted); font-size:1.2rem; text-transform:capitalize;">${slotKey}</b><br><span style="color:var(--text-muted); font-size:0.9rem;">Empty Slot</span></div>
                        </div>`;
            }
            return `<div class="upgrade-slot" style="border-color:var(--cyan-glow);">
                        <div style="font-size:2rem;">${icon}</div>
                        <div style="flex:1;">
                            <b style="color:var(--cyan-glow); font-size:1.2rem;">${item.name}</b><br>
                            <span style="color:var(--text-main); font-size:0.85rem;">${item.desc || 'Installed'}</span>
                        </div>
                        <button class="menu-btn btn-unequip" data-slot="${slotKey}" style="width:auto; padding:0.3rem 0.6rem; margin:0; font-size:1rem; border-color:var(--red-danger); color:var(--red-danger);">Remove</button>
                    </div>`;
        };

        container.innerHTML = `
            <div class="drydock-container" style="flex-shrink: 0; margin-bottom: 1.5rem;">
                <div class="drydock-boat-view">
                    <img src="${boat.art.profileDataUrl}" style="width: 200px; image-rendering: pixelated; margin-bottom: 1rem;" />
                    <h3 style="color:var(--cyan-glow); margin:0; font-size:1.6rem;">${boat.identity.name}</h3>
                    <p style="color:var(--text-muted); font-size:1rem; margin-top:0.2rem;">Active Vessel</p>
                </div>
                <div class="drydock-upgrades">
                    ${renderSlot('engine', upg.engine, '⚙️')}
                    ${renderSlot('plating', upg.plating, '🛡️')}
                    ${renderSlot('prow', upg.prow, '⛏️')}
                    ${renderSlot('storage', upg.storage, '📦')}
                    <div style="grid-column: span 2;">${renderSlot('lantern', upg.lantern, '🏮')}</div>
                </div>
            </div>
            
            <div style="display:flex; gap: 2rem; flex: 1; min-height: 0;">
                <div style="flex: 1; display:flex; flex-direction:column; overflow:hidden;">
                    <h3 style="color:var(--text-main); font-size: 1.3rem; border-bottom:1px solid var(--panel-border); padding-bottom:0.5rem; margin-top:0;">Available Upgrades (Stash & Cargo)</h3>
                    <div id="sh-upgrade-list" style="display:flex; flex-direction:column; gap:0.5rem; overflow-y:auto; padding-right:0.5rem;"></div>
                </div>
                <div style="flex: 1; display:flex; flex-direction:column; overflow:hidden;">
                    <h3 style="color:var(--text-main); font-size: 1.3rem; border-bottom:1px solid var(--panel-border); padding-bottom:0.5rem; margin-top:0;">Parked Hulls (Hangar: ${safehouse.hangar.length}/${safehouse.hangarCapacity})</h3>
                    <div id="sh-hangar-list" style="display:flex; flex-direction:column; gap:0.5rem; overflow-y:auto; padding-right:0.5rem;"></div>
                </div>
            </div>
        `;

        container.querySelectorAll('.btn-unequip').forEach(btn => {
            btn.onclick = (e) => {
                const slot = e.target.getAttribute('data-slot');
                const item = player.gear.boat.upgrades[slot];
                if (safehouse.stash.length < safehouse.stashCapacity) safehouse.stash.push(item);
                else player.inventory.push(item);

                if (slot === 'lantern') player.gear.boat.upgrades.lantern = { id: 'lantern_basic', name: 'Basic Lantern', lightRadius: 100, fuelDrainRate: 1.0 };
                else player.gear.boat.upgrades[slot] = null;

                SFX.playLineSnap();
                if (this.callbacks.onSave) this.callbacks.onSave();
                this.renderSafehouseFullScreen();
            };
        });

        const upgradeList = document.getElementById('sh-upgrade-list');
        const allAvailableUpgrades =[...safehouse.stash.filter(i=>i.type==='upgrade'), ...player.inventory.filter(i=>i.type==='upgrade')];
        
        if (allAvailableUpgrades.length === 0) {
            upgradeList.innerHTML = `<span style="color:var(--text-muted); font-style:italic;">No upgrades found in Stash or Cargo.</span>`;
        }

        allAvailableUpgrades.forEach(u => {
            const row = document.createElement('div');
            row.style.cssText = "background:var(--panel-base); border:1px solid var(--panel-border); padding:0.8rem; border-radius:4px; display:flex; justify-content:space-between; align-items:center; flex-shrink: 0;";
            row.innerHTML = `
                <div><b style="color:var(--text-main); font-size:1.1rem;">${u.name}</b><br><span style="color:var(--text-muted); font-size:0.85rem;">Slot: ${u.slot}</span></div>
                <button class="menu-btn btn-install" style="width:auto; padding:0.3rem 0.8rem; margin:0; font-size:1rem; border-color:var(--green-safe); color:var(--green-safe);">Install</button>
            `;
            row.querySelector('.btn-install').onclick = () => {
                const oldItem = player.gear.boat.upgrades[u.slot];
                if (oldItem && oldItem.id !== 'lantern_basic') {
                    if (safehouse.stash.length < safehouse.stashCapacity) safehouse.stash.push(oldItem);
                    else player.inventory.push(oldItem);
                }
                player.gear.boat.upgrades[u.slot] = u;
                
                const sIdx = safehouse.stash.findIndex(i => i.id === u.id);
                if (sIdx > -1) safehouse.stash.splice(sIdx, 1);
                else {
                    const cIdx = player.inventory.findIndex(i => i.id === u.id);
                    if (cIdx > -1) player.inventory.splice(cIdx, 1);
                }

                SFX.playCatchSuccess();
                if (this.callbacks.onSave) this.callbacks.onSave();
                this.renderSafehouseFullScreen();
            };
            upgradeList.appendChild(row);
        });

        const hangarList = document.getElementById('sh-hangar-list');
        if (safehouse.hangar.length === 0) {
            hangarList.innerHTML = `<span style="color:var(--text-muted); font-style:italic;">Hangar is empty.</span>`;
        }
        safehouse.hangar.forEach((h, index) => {
            const row = document.createElement('div');
            row.style.cssText = "background:var(--panel-base); border:1px solid var(--panel-border); padding:0.5rem; border-radius:4px; display:flex; gap: 1rem; align-items:center; flex-shrink: 0;";
            row.innerHTML = `
                <img src="${h.art.profileDataUrl}" style="width:40px; image-rendering:pixelated;" />
                <div style="flex:1;"><b style="color:var(--cyan-glow); font-size:1.1rem;">${h.identity.name}</b></div>
                <button class="menu-btn btn-swap" style="width:auto; padding:0.3rem 0.8rem; margin:0; font-size:1rem;">Swap</button>
            `;
            row.querySelector('.btn-swap').onclick = () => {
                SFX.playUISelect();
                const active = player.gear.boat;
                h.upgrades = active.upgrades;
                active.upgrades = { plating: null, engine: null, prow: null, storage: null, lantern: { id: 'lantern_basic', name: 'Basic Lantern', lightRadius: 100, fuelDrainRate: 1.0 } };
                
                player.gear.boat = h;
                player.vitals.hp = Math.min(player.vitals.hp, h.stats.maxHp);
                
                safehouse.hangar.splice(index, 1);
                safehouse.hangar.push(active);
                
                if (this.callbacks.onSave) this.callbacks.onSave();
                this.renderSafehouseFullScreen();
            };
            hangarList.appendChild(row);
        });
    },

    // --- SUB-VIEW: STASH ---
    renderSHStash(container, safehouse, player) {
        const effStats = PlayerEngine.getEffectiveStats(player);
        const maxCargo = effStats.exploration.cargoSpace;
        
        container.innerHTML = `
            <div style="display:flex; gap: 1rem; height: 100%;">
                <div class="stash-container">
                    <div style="background:var(--panel-base); padding: 1rem; border-bottom: 2px solid var(--panel-border);">
                        <h3 style="margin:0; color:var(--text-main); font-size: 1.4rem;">Boat Cargo (${player.inventory.length}/${maxCargo})</h3>
                        <span style="color:var(--text-muted); font-size:0.9rem;">Click item to send to Stash</span>
                    </div>
                    <div class="stash-grid" id="sh-cargo-grid"></div>
                </div>
                
                <div style="display:flex; align-items:center; justify-content:center; color:var(--cyan-glow); font-size: 2rem;">⮂</div>
                
                <div class="stash-container">
                    <div style="background:var(--panel-base); padding: 1rem; border-bottom: 2px solid var(--panel-border);">
                        <h3 style="margin:0; color:var(--text-main); font-size: 1.4rem;">Warehouse Stash (${safehouse.stash.length}/${safehouse.stashCapacity})</h3>
                        <span style="color:var(--text-muted); font-size:0.9rem;">Click item to send to Cargo</span>
                    </div>
                    <div class="stash-grid" id="sh-stash-grid"></div>
                </div>
            </div>
        `;

        const renderItem = (item, isCargo, index) => {
            const slot = document.createElement('div');
            slot.className = 'inv-slot';
            let imgSrc = item.imageDataUrl || (item.art ? item.art.imageDataUrl : '');
            if (imgSrc) slot.innerHTML = `<img src="${imgSrc}" />`;
            else slot.innerHTML = `<span style="font-size: 0.6rem; color: #555;">${item.name.substring(0,6)}</span>`;

            slot.addEventListener('mouseenter', (e) => this.showShopTooltip(item, e));
            slot.addEventListener('mousemove', (e) => this.moveShopTooltip(e));
            slot.addEventListener('mouseleave', () => this.hideShopTooltip());

            slot.onclick = () => {
                this.hideShopTooltip();
                if (isCargo) {
                    if (item.invType === 'fish' || item.invType === 'boat' || item.invType === 'chest') {
                        SFX.playError(); return; 
                    }
                    if (safehouse.stash.length < safehouse.stashCapacity) {
                        SFX.playUIHover();
                        safehouse.stash.push(player.inventory.splice(index, 1)[0]);
                        if (this.callbacks.onSave) this.callbacks.onSave();
                        this.renderSafehouseFullScreen();
                    } else SFX.playError();
                } else {
                    if (player.inventory.length < maxCargo) {
                        SFX.playUIHover();
                        player.inventory.push(safehouse.stash.splice(index, 1)[0]);
                        if (this.callbacks.onSave) this.callbacks.onSave();
                        this.renderSafehouseFullScreen();
                    } else SFX.playError();
                }
            };
            return slot;
        };

        const cargoGrid = document.getElementById('sh-cargo-grid');
        player.inventory.forEach((item, idx) => {
            const slot = renderItem(item, true, idx);
            if (item.invType === 'fish' || item.invType === 'boat' || item.invType === 'chest') slot.style.opacity = '0.3'; 
            cargoGrid.appendChild(slot);
        });

        const stashGrid = document.getElementById('sh-stash-grid');
        safehouse.stash.forEach((item, idx) => stashGrid.appendChild(renderItem(item, false, idx)));
    },

    // --- SUB-VIEW: REAL ESTATE UPGRADES ---
    renderSHRealEstate(container, safehouse, player) {
        const createUpgCard = (title, currentTier, maxTier, cost, desc, onBuy) => {
            const isMax = currentTier >= maxTier;
            const canAfford = player.vitals.gold >= cost;
            const btnHtml = isMax 
                ? `<button class="menu-btn" disabled style="width:100%; margin:0; padding:0.6rem; opacity:0.5;">Maximum Tier Reached</button>`
                : `<button class="menu-btn btn-buy-re" style="width:100%; margin:0; padding:0.6rem; border-color:var(--gold-warn); color:var(--gold-warn);" ${!canAfford ? 'disabled' : ''}>Upgrade (${cost}g)</button>`;
            
            const card = document.createElement('div');
            card.style.cssText = "background:var(--bg-void); border:1px solid var(--panel-border); padding:1.5rem; border-radius:6px; display:flex; flex-direction:column; gap:1rem;";
            card.innerHTML = `
                <div style="display:flex; justify-content:space-between; align-items:baseline;">
                    <h3 style="margin:0; color:var(--cyan-glow); font-size:1.6rem;">${title}</h3>
                    <span style="color:var(--text-muted); font-weight:bold;">Tier ${currentTier} / ${maxTier}</span>
                </div>
                <p style="margin:0; color:var(--text-main); font-size:1.1rem; flex:1;">${isMax ? 'Fully upgraded.' : desc}</p>
                ${btnHtml}
            `;
            if (!isMax && canAfford) {
                card.querySelector('.btn-buy-re').onclick = () => {
                    SFX.playGold();
                    player.vitals.gold -= cost;
                    onBuy();
                    if (this.callbacks.onSave) this.callbacks.onSave();
                    this.renderSafehouseFullScreen();
                };
            }
            return card;
        };

        // RESTORED ORIGINAL PRICING
        const costStash = safehouse.stashTier === 1 ? 750 : 2000; 
        const descStash = safehouse.stashTier === 1 ? "Expands Stash capacity to 25 slots." : "Expands Stash capacity to 50 slots.";
        const stashCard = createUpgCard("The Stash", safehouse.stashTier, 3, costStash, descStash, () => {
            safehouse.stashTier++;
            safehouse.stashCapacity = safehouse.stashTier === 2 ? 25 : 50;
        });

        const costHangar = safehouse.hangarTier === 1 ? 1200 : 3000; 
        const descHangar = safehouse.hangarTier === 1 ? "Expands Dry Dock to hold 2 parked hulls." : "Expands Dry Dock to hold 4 parked hulls.";
        const hangarCard = createUpgCard("The Dry Dock", safehouse.hangarTier, 3, costHangar, descHangar, () => {
            safehouse.hangarTier++;
            safehouse.hangarCapacity = safehouse.hangarTier === 2 ? 2 : 4;
        });

        const costAqua = safehouse.aquariumTier === 1 ? 1500 : 4000;
        const descAqua = safehouse.aquariumTier === 1 ? "A medium tank. Holds 6 swimming fish." : "A massive wall-to-wall tank. Holds 12 swimming fish.";
        const aquaCard = createUpgCard("The Aquarium", safehouse.aquariumTier, 3, costAqua, descAqua, () => {
            safehouse.aquariumTier++;
            safehouse.aquariumCapacity = safehouse.aquariumTier === 2 ? 6 : 12;
        });

        // --- NEW: THEME SELECTION CARD ---
        if (!safehouse.aquariumTheme) safehouse.aquariumTheme = this.currentNode.biomeId;
        if (!safehouse.unlockedThemes) safehouse.unlockedThemes = [this.currentNode.biomeId]; // Fallback for existing saves
        
        const themeCard = document.createElement('div');
        themeCard.style.cssText = "background:var(--bg-void); border:1px solid var(--panel-border); padding:1.5rem; border-radius:6px; display:flex; flex-direction:column; gap:1rem;";
        
        let themeListHtml = '<div style="display:flex; flex-direction:column; gap:0.5rem; overflow-y:auto; padding-right:0.5rem; flex: 1;">';
        
        Object.keys(BIOMES).forEach(themeId => {
            if (themeId === 'hub') return; // Skip hub theme for the tank
            
            const isUnlocked = safehouse.unlockedThemes.includes(themeId);
            const isActive = safehouse.aquariumTheme === themeId;
            const themeName = BIOMES[themeId].name;
            const themeColor = BIOMES[themeId].textColor || BIOMES[themeId].globalColor;
            
            let btnHtml = "";
            if (isActive) {
                btnHtml = `<span style="color:var(--cyan-glow); font-size:1rem; font-weight:bold; margin-right:0.5rem;">Active</span>`;
            } else if (isUnlocked) {
                btnHtml = `<button class="menu-btn btn-select-theme" data-theme="${themeId}" style="width:auto; padding:0.3rem 0.8rem; margin:0; font-size:1rem; border-color:var(--cyan-glow); color:var(--cyan-glow);">Select</button>`;
            } else {
                const canAfford = player.vitals.gold >= 100;
                btnHtml = `<button class="menu-btn btn-buy-theme" data-theme="${themeId}" style="width:auto; padding:0.3rem 0.8rem; margin:0; font-size:1rem; border-color:var(--gold-warn); color:var(--gold-warn);" ${!canAfford ? 'disabled' : ''}>Buy 100g</button>`;
            }

            themeListHtml += `
                <div style="display:flex; justify-content:space-between; align-items:center; background:var(--panel-base); padding:0.8rem; border-radius:4px; border:1px solid ${isActive ? 'var(--cyan-glow)' : 'var(--panel-border)'};">
                    <span style="color:${themeColor}; font-weight:bold; font-size:1.1rem;">${themeName}</span>
                    ${btnHtml}
                </div>
            `;
        });
        themeListHtml += '</div>';

        themeCard.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:baseline;">
                <h3 style="margin:0; color:var(--cyan-glow); font-size:1.6rem;">Tank Decor</h3>
            </div>
            <p style="margin:0 0 0.5rem 0; color:var(--text-main); font-size:1.1rem;">Unlock and select background environments.</p>
            ${themeListHtml}
        `;

        // Attach Button Logic for Themes
        themeCard.querySelectorAll('.btn-select-theme').forEach(btn => {
            btn.onclick = (e) => {
                SFX.playUISelect();
                safehouse.aquariumTheme = e.target.getAttribute('data-theme');
                if (this.callbacks.onSave) this.callbacks.onSave();
                this.renderSafehouseFullScreen();
            };
        });

        themeCard.querySelectorAll('.btn-buy-theme').forEach(btn => {
            btn.onclick = (e) => {
                SFX.playGold();
                player.vitals.gold -= 100;
                const newTheme = e.target.getAttribute('data-theme');
                safehouse.unlockedThemes.push(newTheme);
                safehouse.aquariumTheme = newTheme; // Auto-equip on purchase
                if (this.callbacks.onSave) this.callbacks.onSave();
                this.renderSafehouseFullScreen();
            };
        });

        // 2x2 Grid for the 4 Real Estate blocks
        container.innerHTML = `<div style="display:grid; grid-template-columns: 1fr 1fr; gap:1.5rem; flex: 1; min-height: 0;" id="sh-re-grid"></div>`;
        const grid = container.querySelector('#sh-re-grid');
        grid.appendChild(stashCard);
        grid.appendChild(hangarCard);
        grid.appendChild(aquaCard);
        grid.appendChild(themeCard);
    },

    // --- SUB-VIEW: THE AQUARIUM ---
    renderSHAquarium(container, safehouse, player) {
        container.innerHTML = `
            <div class="aquarium-wrapper" style="height: 380px;">
                <canvas id="aquarium-canvas"></canvas>
                <div class="aquarium-glass-overlay"></div>
            </div>
            <div style="display:flex; gap: 1rem; flex: 1; min-height: 0; margin-top: 1rem;">
                <div class="stash-container" style="flex: 1;">
                    <div style="background:var(--panel-base); padding: 0.8rem; border-bottom: 2px solid var(--panel-border);">
                        <h3 style="margin:0; color:var(--text-main); font-size: 1.2rem;">Live Cargo</h3>
                    </div>
                    <div class="stash-grid" id="sh-aqua-cargo"></div>
                </div>
                <div class="stash-container" style="flex: 1;">
                    <div style="background:var(--panel-base); padding: 0.8rem; border-bottom: 2px solid var(--panel-border);">
                        <h3 style="margin:0; color:var(--text-main); font-size: 1.2rem;">Aquarium (${safehouse.aquarium.length}/${safehouse.aquariumCapacity})</h3>
                    </div>
                    <div class="stash-grid" id="sh-aqua-tank"></div>
                </div>
            </div>
        `;

        const renderFishBtn = (fish, isCargo, index) => {
            const slot = document.createElement('div');
            slot.className = 'inv-slot';
            slot.innerHTML = `<img src="${fish.art.imageDataUrl}" />`;

            slot.addEventListener('mouseenter', (e) => this.showShopTooltip(fish, e));
            slot.addEventListener('mousemove', (e) => this.moveShopTooltip(e));
            slot.addEventListener('mouseleave', () => this.hideShopTooltip());

            slot.onclick = () => {
                this.hideShopTooltip();
                if (isCargo) {
                    if (safehouse.aquarium.length < safehouse.aquariumCapacity) {
                        SFX.playSplash();
                        safehouse.aquarium.push(player.inventory.splice(index, 1)[0]);
                        if (this.callbacks.onSave) this.callbacks.onSave();
                        this.renderSafehouseFullScreen(); 
                    } else SFX.playError();
                } else {
                    const effStats = PlayerEngine.getEffectiveStats(player);
                    if (player.inventory.length < effStats.exploration.cargoSpace) {
                        SFX.playSplash();
                        player.inventory.push(safehouse.aquarium.splice(index, 1)[0]);
                        if (this.callbacks.onSave) this.callbacks.onSave();
                        this.renderSafehouseFullScreen();
                    } else SFX.playError();
                }
            };
            return slot;
        };

        const cargoGrid = document.getElementById('sh-aqua-cargo');
        player.inventory.forEach((item, idx) => {
            if (item.invType === 'fish') cargoGrid.appendChild(renderFishBtn(item, true, idx));
        });

        const tankGrid = document.getElementById('sh-aqua-tank');
        safehouse.aquarium.forEach((fish, idx) => tankGrid.appendChild(renderFishBtn(fish, false, idx)));

        // Kick off the animation loop
        this.startAquariumLoop(safehouse.aquarium);
    },

    startAquariumLoop(aquariumFish) {
        this.stopAquariumLoop(); 
        
        const canvas = document.getElementById('aquarium-canvas');
        if (!canvas) return;
        
        const player = this.gameState.player;
        const coords = `${this.gameState.globalX},${this.gameState.globalY}`;
        const safehouse = player.safehouses[coords];
        const themeId = safehouse.aquariumTheme || this.currentNode.biomeId;
        const pal = BIOMES[themeId].palette;
        
        let pColors =['#FFFFFF', '#94A3B8']; 
        if (pal.water === '#162e1a') pColors =['#86EFAC', '#4ADE80']; 
        if (pal.water === '#5e1313') pColors = ['#F59E0B', '#EF4444']; 
        if (pal.water === '#050510') pColors =['#a855f7', '#c084fc'];

        const particles =[];
        for (let i = 0; i < 40; i++) {
            particles.push({
                x: Math.random() * 1000, 
                y: Math.random() * 500,
                speed: Math.random() * 0.5 + 0.1,
                size: Math.random() * 2 + 1,
                wobble: Math.random() * Math.PI * 2,
                color: pColors[Math.floor(Math.random() * pColors.length)]
            });
        }

        setTimeout(() => {
            if (!canvas.offsetParent) return; 
            canvas.width = canvas.clientWidth;
            canvas.height = canvas.clientHeight;
            const ctx = canvas.getContext('2d');
            ctx.imageSmoothingEnabled = false;

            // --- 1. INITIALIZE ENTITY STATE MACHINES ---
            this.aquariumEntities = aquariumFish.map(fish => {
                const img = new Image();
                img.src = fish.art.imageDataUrl;
                
                // NEW: Shrunk all fish by ~35% so the tank feels larger and less cluttered
                const sMap = { 'Tiny': 0.15, 'Small': 0.25, 'Medium': 0.4, 'Large': 0.65, 'Massive': 1 };
                const scale = sMap[fish.physical.sizeTier] || 0.6;
                const initialVx = (Math.random() > 0.5 ? 1 : -1) * (0.3 + Math.random() * 0.5);

                return {
                    fish: fish,
                    family: fish.identity.family, // e.g., 'crustacean', 'shark'
                    img: img,
                    x: Math.random() * canvas.width,
                    y: Math.random() * (canvas.height - 100) + 50,
                    baseY: Math.random() * (canvas.height - 150) + 50,
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

            const loop = (time) => {
                const dt = Math.min((time - lastTime) / 1000, 0.1); 
                lastTime = time;

                ctx.clearRect(0, 0, canvas.width, canvas.height);

                // --- 2. DRAW WATER & PARTICLES ---
                const grad = ctx.createLinearGradient(0, 0, 0, canvas.height);
                grad.addColorStop(0, pal.water);
                grad.addColorStop(1, pal.deepWater);
                ctx.fillStyle = grad;
                ctx.fillRect(0, 0, canvas.width, canvas.height);

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

                // --- 3. DRAW SEA FLOOR ---
                const floorY = canvas.height - 40;
                ctx.fillStyle = pal.land;
                ctx.fillRect(0, floorY, canvas.width, 40);
                
                ctx.fillStyle = pal.rock;
                for(let i = 0; i < canvas.width / 60 + 1; i++) {
                    ctx.beginPath();
                    ctx.moveTo(i * 60, floorY);
                    ctx.lineTo(i * 60 + 30, floorY - 30 + (i % 2 * 10));
                    ctx.lineTo(i * 60 + 60, floorY);
                    ctx.fill();
                }

                if (themeId !== 'abyssal') {
                    ctx.fillStyle = pal.flora;
                    const sway = Math.sin(time / 1000) * 4;
                    for(let i = 0; i < canvas.width / 50 + 1; i++) {
                        ctx.fillRect(20 + i*50 + sway, floorY - 20, 4, 20);
                        ctx.fillRect(18 + i*50 + sway, floorY - 24, 8, 4); 
                    }
                }

                // --- 4. FISH BEHAVIOR AI (FIXED STRING MATCHES) ---
                this.aquariumEntities.forEach(ent => {
                    const w = ent.img.complete ? ent.img.width * ent.scale : 20;
                    const h = ent.img.complete ? ent.img.height * ent.scale : 20;
                    let bobY = 0;

                    // AI: CRUSTACEANS
                    if (ent.family === 'crustacean') {
                        const targetY = floorY - (h / 2);
                        ent.y += (targetY - ent.y) * 2 * dt; 
                        ent.timer -= dt;
                        if (ent.timer <= 0) {
                            if (ent.state === 'scuttle') {
                                ent.state = 'rest';
                                ent.vx = 0;
                                ent.timer = Math.random() * 2 + 1;
                            } else {
                                ent.state = 'scuttle';
                                ent.vx = (Math.random() > 0.5 ? 1 : -1) * (0.2 + Math.random() * 0.3);
                                ent.timer = Math.random() * 3 + 1;
                            }
                        }
                        ent.x += ent.vx * 60 * dt;
                    } 
                    // AI: JELLYFISH
                    else if (ent.family === 'jellyfish') {
                        ent.timer -= dt;
                        if (ent.timer <= 0) {
                            ent.vy = -0.6 - Math.random() * 0.4; 
                            ent.vx = (Math.random() - 0.5) * 0.3; 
                            ent.timer = Math.random() * 1.5 + 1.0;
                        }
                        ent.vy += 0.4 * dt; 
                        ent.x += ent.vx * 60 * dt;
                        ent.y += ent.vy * 60 * dt;
                        bobY = Math.sin(ent.bobPhase) * 8; 
                        ent.bobPhase += dt * 3;
                    }
                    // AI: CEPHALOPOD
                    else if (ent.family === 'cephalopod') {
                        ent.timer -= dt;
                        if (ent.timer <= 0) {
                            if (ent.state === 'jet') {
                                ent.state = 'rest';
                                ent.timer = Math.random() * 2 + 1;
                            } else {
                                ent.state = 'jet';
                                ent.vx = (Math.random() > 0.5 ? 1 : -1) * (1.2 + Math.random() * 1.0); 
                                ent.vy = (Math.random() - 0.5) * 0.6;
                                ent.timer = 0.4 + Math.random() * 0.4; 
                            }
                        }
                        if (ent.state === 'rest') {
                            ent.vx *= 1 - (2 * dt); 
                            ent.vy *= 1 - (2 * dt);
                        }
                        ent.x += ent.vx * 60 * dt;
                        ent.y += ent.vy * 60 * dt;
                        bobY = Math.sin(ent.bobPhase) * 3;
                        ent.bobPhase += dt * 4;
                    }
                    // AI: SHARKS
                    else if (ent.family === 'shark') {
                        if (Math.random() < 0.005) ent.vx = -ent.vx; 
                        ent.y += (ent.baseY - ent.y) * 0.5 * dt; 
                        const speedX = Math.sign(ent.vx) * (0.8 + Math.abs(ent.vx)*0.2); 
                        ent.x += speedX * 60 * dt;
                    }
                    // AI: RAYS
                    else if (ent.family === 'ray') {
                        const targetY = floorY - 15 - (h / 2);
                        ent.y += (targetY - ent.y) * 0.8 * dt; 
                        if (Math.random() < 0.01) ent.vx = (Math.random() > 0.5 ? 1 : -1) * (0.4 + Math.random() * 0.3);
                        ent.x += ent.vx * 60 * dt;
                        bobY = Math.sin(ent.bobPhase) * 6; 
                        ent.bobPhase += dt * 1.5;
                    }
                    // AI: EELS
                    else if (ent.family === 'eel') {
                        if (Math.random() < 0.01) ent.vx = (Math.random() > 0.5 ? 1 : -1) * (0.4 + Math.random() * 0.4);
                        if (Math.random() < 0.02) ent.vy = (Math.random() - 0.5) * 0.5;
                        ent.x += ent.vx * 60 * dt;
                        ent.y += ent.vy * 60 * dt;
                        bobY = Math.sin(ent.bobPhase) * 12; 
                        ent.bobPhase += dt * 5;
                    }
                    // AI: DEFAULT WANDERER (Standard Fish / Deepsea Horrors)
                    else {
                        if (Math.random() < 0.01) ent.vx = (Math.random() > 0.5 ? 1 : -1) * (0.3 + Math.random() * 0.5);
                        if (Math.random() < 0.02) ent.vy = (Math.random() - 0.5) * 0.4;
                        ent.x += ent.vx * 60 * dt;
                        ent.y += ent.vy * 60 * dt;
                        bobY = Math.sin(ent.bobPhase) * 4;
                        ent.bobPhase += dt * 2;
                    }

                    // --- PHYSICS CONSTRAINTS & FACING ---
                    if (Math.abs(ent.vx) > 0.05) ent.facing = Math.sign(ent.vx);

                    if (ent.x < 50) { ent.x = 50; ent.vx = Math.abs(ent.vx) || 0.5; }
                    if (ent.x > canvas.width - 50) { ent.x = canvas.width - 50; ent.vx = -Math.abs(ent.vx) || -0.5; }
                    
                    if (ent.y < 50) { ent.y = 50; ent.vy = Math.abs(ent.vy); }
                    if (ent.y > floorY - (h/2)) { ent.y = floorY - (h/2); ent.vy = -Math.abs(ent.vy); }

                    // --- RENDER ---
                    if (ent.img.complete) {
                        ctx.save();
                        ctx.translate(ent.x, ent.y + bobY);
                        if (ent.facing < 0) ctx.scale(-1, 1);
                        ctx.drawImage(ent.img, -w/2, -h/2, w, h);
                        ctx.restore();
                    }
                });

                this.aquariumAnimFrame = requestAnimationFrame(loop);
            };

            this.aquariumAnimFrame = requestAnimationFrame(loop);
        }, 50); 
    },

    stopAquariumLoop() {
        if (this.aquariumAnimFrame) {
            cancelAnimationFrame(this.aquariumAnimFrame);
            this.aquariumAnimFrame = null;
        }
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

    showShopTooltip(item, e) {
        const tt = document.getElementById('shop-tooltip');
        if (!tt) return;
        
        const player = this.gameState.player;
        let itemName = item.name || (item.identity ? item.identity.name : 'Unknown Item');
        let nameColor = getItemColor(item.itemData || item);
        let html = `<b style="color: ${nameColor};">${itemName}</b>`;
        
        if (item.type === 'rod') {
            const eq = player.gear.rod.stats;
            const ns = item.itemData.stats;
            html += `<div class="tt-row"><span>Power:</span> <span>${ns.power}x ${this.formatDelta(ns.power, eq.power)}</span></div>
                     <div class="tt-row"><span>Tension:</span> <span>${ns.maxTension} ${this.formatDelta(ns.maxTension, eq.maxTension)}</span></div>
                     <div class="tt-row"><span>Flex:</span> <span>${ns.flexibility}x ${this.formatDelta(ns.flexibility, eq.flexibility)}</span></div>
                     <div class="tt-row"><span>Hook Win:</span> <span>${ns.sensitivity}ms ${this.formatDelta(ns.sensitivity, eq.sensitivity)}</span></div>`;
        } else if (item.type === 'boat') {
            const eq = player.gear.boat.stats;
            const ns = item.itemData.stats;
            html += `<div class="tt-row"><span>Hull HP:</span> <span>${ns.maxHp} ${this.formatDelta(ns.maxHp, eq.maxHp)}</span></div>
                     <div class="tt-row"><span>Speed:</span> <span>${ns.speed} ${this.formatDelta(ns.speed, eq.speed)}</span></div>
                     <div class="tt-row"><span>Stealth:</span> <span>${ns.stealth}x ${this.formatDelta(ns.stealth, eq.stealth, true)}</span></div>
                     <div class="tt-row"><span>Cargo:</span> <span>${ns.cargoSpace} ${this.formatDelta(ns.cargoSpace, eq.cargoSpace)}</span></div>`;
        } else if (item.type === 'part' || item.visualId) {
            const fmt = v => v > 0 ? `<span class="dash-pos">+${v}</span>` : (v < 0 ? `<span class="dash-neg">${v}</span>` : `0`);
            html += `<div class="tt-row"><span>Color:</span> <span>${fmt(item.stats.color)}</span></div>
                     <div class="tt-row"><span>Sound:</span> <span>${fmt(item.stats.sound)}</span></div>
                     <div class="tt-row"><span>Light:</span> <span>${fmt(item.stats.light)}</span></div>
                     <div class="tt-row"><span>Weight:</span> <span>${fmt(item.stats.weight)}</span></div>`;
        } else if (item.invType === 'fish') {
            // NEW: Enriched Fish Info
            const familyName = item.identity.family.charAt(0).toUpperCase() + item.identity.family.slice(1);
            html += `<div class="tt-row" style="margin-bottom:0.5rem; border-bottom:1px solid var(--panel-border); padding-bottom:0.3rem;">
                        <span style="color:var(--text-muted);">${item.identity.rarity} ${familyName}</span>
                     </div>
                     <div class="tt-row"><span>Size:</span> <span>${item.physical.sizeTier}</span></div>
                     <div class="tt-row"><span>Weight:</span> <span>${item.actualWeight}kg</span></div>
                     <div class="tt-row"><span>Habitat:</span> <span style="text-transform:capitalize;">${item.environment.depthPref}</span></div>`;
        } else if (item.invType === 'chest') {
            html += `<p style="margin:0; color:var(--text-main);">A heavy, waterlogged chest.</p>`;
        } else {
            html += `<p style="margin:0; color:var(--text-main);">${item.desc || ''}</p>`;
        }

        tt.innerHTML = html;
        tt.style.display = 'block';
        this.moveShopTooltip(e);
    },

    moveShopTooltip(e) {
        const tt = document.getElementById('shop-tooltip');
        if (!tt || tt.style.display === 'none') return;
        
        const container = document.getElementById('game-container');
        const rect = container.getBoundingClientRect();
        const scaleX = 1280 / rect.width;
        const scaleY = 720 / rect.height;
        
        let x = (e.clientX - rect.left) * scaleX + 15;
        let y = (e.clientY - rect.top) * scaleY + 15;
        
        // --- NEW: Bulletproof Off-Screen Clipping ---
        const ttW = tt.offsetWidth || 250;
        const ttH = tt.offsetHeight || 150;

        // If it breaches the right side, flip it completely to the left side of the cursor
        if (x + ttW > 1280) x = (e.clientX - rect.left) * scaleX - ttW - 15;
        // If it breaches the bottom, flip it completely above the cursor
        if (y + ttH > 720) y = (e.clientY - rect.top) * scaleY - ttH - 15;
        
        tt.style.left = `${x}px`;
        tt.style.top = `${y}px`;
    },

    hideShopTooltip() {
        const tt = document.getElementById('shop-tooltip');
        if (tt) tt.style.display = 'none';
    }
};