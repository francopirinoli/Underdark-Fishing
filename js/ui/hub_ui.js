/**
 * js/ui/hub_ui.js
 * Manages the Settlement Hub UI: Panoramic backgrounds, NPCs, Shops, and Dialogue.
 * V6 - Buy/Sell Modes, Shipyard Split, and Tooltip Integration.
 */

import { SFX } from '../audio/sfx_generator.js';
import { createRng } from '../util/rng.js';

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

    init(callbacks) {
        this.callbacks = callbacks;

        document.getElementById('btn-hub-depart').addEventListener('click', () => {
            SFX.playUISelect();
            if (this.typewriterTimer) clearInterval(this.typewriterTimer);
            if (this.callbacks.onSave) this.callbacks.onSave(); 
            this.hideShopTooltip(); // Safety cleanup
            this.close();
        });

        const tabs = document.querySelectorAll('.hub-tab-btn');
        tabs.forEach(tab => {
            tab.addEventListener('click', (e) => {
                tabs.forEach(t => t.classList.remove('active'));
                e.target.classList.add('active');
                SFX.playUISelect();
                
                this.activeTab = e.target.getAttribute('data-tab');
                this.marketMode = 'buy'; // Reset mode when switching tabs
                this.hideShopTooltip();
                
                this.renderActiveTab();
                this.triggerTabDialogue();
            });
        });
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
        this.localFishPool = Array.from({length: 5}, (_, i) => generateFishData({ seed: dailySeed + i }));
        this.currentQuests = QuestGenerator.generateQuestBoard(dailySeed, player.vitals.level, this.localFishPool, Object.keys(BIOMES));
        
        this.activeTab = 'market';
        this.marketMode = 'buy';
        document.querySelectorAll('.hub-tab-btn').forEach(t => t.classList.remove('active'));
        document.querySelector('.hub-tab-btn[data-tab="market"]').classList.add('active');
        
        this.renderActiveTab();
        this.triggerTabDialogue();
    },

    close() {
        document.getElementById('z75-hub').style.display = 'none';
        this.gameState = null;
        if (this.callbacks.onDepart) this.callbacks.onDepart();
    },

    triggerTabDialogue() {
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
        
        if (this.activeTab === 'market') this.renderMarket(content);
        else if (this.activeTab === 'fishmonger') this.renderFishmonger(content);
        else if (this.activeTab === 'boatwright') this.renderBoatwright(content);
        else if (this.activeTab === 'tavern') this.renderTavern(content);
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
                
                row.innerHTML = `
                    <div class="shop-item-info">
                        <b>${item.name}</b> <span style="font-size:0.85rem; color:var(--text-muted); text-transform:uppercase;">[${item.type || item.rarity}]</span>
                        <p>${item.desc || `Stock: ${item.stock === 99 ? 'Infinite' : item.stock}`}</p>
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

                row.innerHTML = `
                    <div style="display:flex; gap: 1rem; align-items:center;">
                        ${imgHtml}
                        <div class="shop-item-info">
                            <b>${item.name || (item.identity ? item.identity.name : 'Item')}</b> <span style="font-size:0.85rem; color:var(--text-muted); text-transform:uppercase;">[${item.invType || 'part'}]</span>
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
                            <b>${fish.identity.name}</b> <span style="font-size:0.85rem; color:var(--text-muted); text-transform:uppercase;">[${fish.physical.sizeTier}]</span>
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

            row.innerHTML = `
                <div class="shop-item-info">
                    <b>${item.name}</b> <span style="font-size:0.85rem; color:var(--text-muted); text-transform:uppercase;">[${item.type || item.rarity}]</span>
                    <p>${item.desc || `Stock: ${item.stock === 99 ? 'Infinite' : item.stock}`}</p>
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
                            <b>${oldB.identity.name}</b> <span style="font-size:0.85rem; color:var(--text-muted); text-transform:uppercase;">[BOAT]</span>
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
        player.activeQuests.forEach((q, index) => {
            let isComplete = false;
            if (q.type === 'hunt') isComplete = q.currentAmount >= q.requiredAmount;
            else if (q.type === 'trophy') isComplete = q.currentBestWeight >= q.requiredWeight;
            else if (q.type === 'research') {
                const curLvl = q.currentKnowledgeLevel || 1;
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

                    player.activeQuests.splice(index, 1);
                    this.triggerDialogue(this.currentNPCs.tavern, "Well done! The guild sends their regards.");
                    
                    if (this.callbacks.onSave) this.callbacks.onSave();
                    this.renderActiveTab();
                };
                turnInList.appendChild(card);
            }
        });

        if (this.currentQuests.length === 0) {
            list.innerHTML = `<p style="color:var(--text-muted); font-size:1.2rem; grid-column: span 2; text-align: center;">No jobs posted today.</p>`;
            return;
        }

        this.currentQuests.forEach(q => {
            const rng = createRng(Date.now() + q.difficulty);
            const flavor = DialogueGenerator.getQuestFlavor(q, rng);
            const isAccepted = player.activeQuests.some(aq => aq.id === q.id);

            const card = document.createElement('div');
            card.style.cssText = "background: var(--bg-void); border: 1px solid var(--panel-border); padding: 1rem; border-radius: 4px; display: flex; flex-direction: column;";
            
            let rewardItemText = '';
            if (q.rewards.item) {
                const itemName = q.rewards.item.id.replace('part_', '').split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                rewardItemText = `<br/><span style="color:var(--cyan-glow); font-weight:bold;">+ ${q.rewards.item.qty}x ${itemName}</span>`;
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
                
                <button class="menu-btn btn-accept" style="width:100%; padding:0.4rem; margin:0; font-size:1.1rem; ${isAccepted ? 'border-color:var(--green-safe); color:var(--green-safe);' : ''}" ${isAccepted ? 'disabled' : ''}>
                    ${isAccepted ? 'Accepted' : 'Accept Quest'}
                </button>
            `;
            
            card.querySelector('.btn-accept').onclick = (e) => {
                SFX.playUISelect();
                player.activeQuests.push(q);
                e.target.innerText = 'Accepted';
                e.target.disabled = true;
                e.target.style.borderColor = 'var(--green-safe)';
                e.target.style.color = 'var(--green-safe)';
                if (this.callbacks.onSave) this.callbacks.onSave();
                this.renderActiveTab();
            };
            
            list.appendChild(card);
        });
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
        let html = `<b>${item.name}</b>`;
        
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
        } else {
            html += `<p style="margin:0; color:var(--text-main);">${item.desc}</p>`;
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
        
        tt.style.left = `${x}px`;
        tt.style.top = `${y}px`;
    },

    hideShopTooltip() {
        const tt = document.getElementById('shop-tooltip');
        if (tt) tt.style.display = 'none';
    }
};