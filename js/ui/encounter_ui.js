/**
 * js/ui/encounter_ui.js
 * Manages the UI for wandering fishermen encounters.
 */

import { SFX } from '../audio/sfx_generator.js';
import { createRng } from '../util/rng.js';
import { DialogueGenerator } from '../economy/dialogue_generator.js';
import { PlayerEngine } from '../data/player_data.js';
import { getRarityColor, getItemColor, buildStatSlider } from '../util/utils.js';
import { TooltipUI } from './tooltip_ui.js'; // <-- ADD THIS IMPORT

export const EncounterUI = {
    gameState: null,
    fisherman: null,
    fishPool:[],
    callbacks: null,
    marketMode: 'buy',
    typewriterTimer: null,

    init(callbacks) {
        this.callbacks = callbacks;

        document.getElementById('btn-enc-leave').addEventListener('click', () => {
            SFX.playUISelect();
            if (this.typewriterTimer) clearInterval(this.typewriterTimer);
            TooltipUI.hide(); // <-- UPDATED
            this.close();
        });

        document.getElementById('btn-enc-buy').addEventListener('click', () => {
            SFX.playUISelect();
            this.marketMode = 'buy';
            TooltipUI.hide(); // <-- UPDATED
            this.renderMarket();
        });

        document.getElementById('btn-enc-sell').addEventListener('click', () => {
            SFX.playUISelect();
            this.marketMode = 'sell';
            TooltipUI.hide(); // <-- UPDATED
            this.renderMarket();
        });
    },

    open(state, fishermanData, localFishPool) {
        this.gameState = state;
        this.fisherman = fishermanData;
        this.fishPool = localFishPool;
        this.marketMode = 'buy';

        document.getElementById('z60-encounter').style.display = 'flex';
        document.getElementById('enc-dialogue-portrait').src = this.fisherman.npc.imageDataUrl;
        document.getElementById('enc-speaker').innerText = this.fisherman.npc.name + ":";
        
        // Generate a rumor specifically about the fish in THIS cave
        const rng = createRng(Date.now());
        let msg = "Quiet out here.";
        if (this.fishPool.length > 0) {
            msg = DialogueGenerator.generateRumor(rng.pick(this.fishPool), rng);
        }

        this.triggerDialogue(msg, this.fisherman.npc);
        this.renderMarket();
    },

    close() {
        document.getElementById('z60-encounter').style.display = 'none';
        if (this.callbacks.onSave) this.callbacks.onSave();
        if (this.callbacks.onLeave) this.callbacks.onLeave();
    },

    triggerDialogue(text, npc) {
        const textContainer = document.getElementById('enc-text');
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

    renderMarket() {
        const player = this.gameState.player;
        const effStats = PlayerEngine.getEffectiveStats(player);
        const maxCargo = effStats.exploration.cargoSpace;
        const currentInvCount = player.inventory.length;
        
        document.getElementById('enc-player-gold').innerText = player.vitals.gold;

        // Button Highlights
        document.getElementById('btn-enc-buy').style.borderColor = this.marketMode === 'buy' ? 'var(--cyan-glow)' : 'var(--panel-border)';
        document.getElementById('btn-enc-buy').style.color = this.marketMode === 'buy' ? 'var(--cyan-glow)' : 'var(--text-muted)';
        document.getElementById('btn-enc-sell').style.borderColor = this.marketMode === 'sell' ? 'var(--cyan-glow)' : 'var(--panel-border)';
        document.getElementById('btn-enc-sell').style.color = this.marketMode === 'sell' ? 'var(--cyan-glow)' : 'var(--text-muted)';

        const list = document.getElementById('enc-market-list');
        list.innerHTML = '';

        if (this.marketMode === 'buy') {
            const marketItems = this.fisherman.inventory;

            if (marketItems.length === 0) {
                list.innerHTML = `<p style="color:var(--text-muted); font-size:1.2rem; text-align:center;">I've got nothing left to sell.</p>`;
            }

            marketItems.forEach((item) => {
                const row = document.createElement('div');
                row.className = 'shop-item-row';
                
                let disableReason = null;
                const isCargoItem = ['rod', 'lure', 'bait', 'potion', 'consumable'].includes(item.type || item.invType);
                if (isCargoItem && currentInvCount >= maxCargo) disableReason = "Cargo Full";
                if (item.id === 'cons_ration' && player.vitals.rations >= 20) disableReason = "Rations Full";
                
                const canAfford = player.vitals.gold >= item.price;
                const hasStock = item.stock > 0;
                
                let btnText = "Buy";
                if (disableReason) btnText = disableReason;
                else if (!hasStock) btnText = "Sold Out";
                else if (!canAfford) btnText = "Too Expensive";

                const isDisabled = disableReason || !canAfford || !hasStock;
                
                // --- FIX: Universal Image Extraction ---
                const targetItem = (item.itemData && ['rod', 'boat', 'lure', 'potion', 'bait'].includes(item.type)) ? item.itemData : item;
                
                let imgSrc = targetItem.imageDataUrl || (targetItem.art ? (targetItem.art.profileDataUrl || targetItem.art.imageDataUrl) : '');
                let imgHtml = imgSrc ? `<img src="${imgSrc}" style="width:40px; height:40px; background:#000; border:1px solid var(--panel-border); border-radius:4px; image-rendering:pixelated; object-fit:contain;" />` : '';

                const itemName = item.name || (item.identity ? item.identity.name : 'Item');
                const nameColor = getItemColor(targetItem);

                row.innerHTML = `
                    <div style="display:flex; gap: 1rem; align-items:center;">
                        ${imgHtml}
                        <div class="shop-item-info">
                            <b style="color: ${nameColor};">${itemName}</b> <span style="font-size:0.85rem; color:var(--text-muted); text-transform:uppercase;">[${item.type || item.rarity}]</span>
                            <p>${item.desc || `Stock: ${item.stock}`}</p>
                        </div>
                    </div>
                    <div class="shop-buy">
                        <span class="shop-price">${item.price}g</span>
                        <button class="menu-btn btn-buy" style="width: auto; padding: 0.4rem 1rem; margin:0; font-size:1.2rem; ${isDisabled ? 'opacity:0.4; cursor:not-allowed; border-color:var(--panel-border); color:var(--text-muted);' : ''}" ${isDisabled ? 'disabled' : ''}>${btnText}</button>
                    </div>
                `;
                
                // --- NEW UNIFIED TOOLTIP BINDER ---
                TooltipUI.bind(row, item, player.gear);

                if (!isDisabled) {
                    row.querySelector('.btn-buy').onclick = () => {
                        SFX.playGold();
                        player.vitals.gold -= item.price;
                        item.stock--;
                        
                        // --- UPDATED: Split Inventory Routing ---
                        if (item.id === 'cons_ration') {
                            player.vitals.rations = Math.min(20, player.vitals.rations + 1);
                        } else if (item.id === 'cons_fuel_oil') {
                            player.vitals.fuel = 100;
                        } else if (item.id === 'cons_repair_kit') {
                            const itemToPush = { ...item, invType: 'consumable' };
                            player.inventory.push(itemToPush);
                        } else {
                            if (['rod', 'lure', 'bait', 'potion'].includes(item.type || item.invType)) {
                                const itemToPush = item.itemData ? { ...item.itemData } : { ...item };
                                itemToPush.invType = item.type || item.invType;
                                player.inventory.push(itemToPush);
                            } else {
                                // Raw fish parts go to the Reagents Pouch
                                player.reagents.push({ ...item, invType: 'part' }); 
                            }
                        }

                        TooltipUI.hide(); // <-- UPDATED
                        this.renderMarket(); 
                    };
                }
                list.appendChild(row);
            });
        } else {
            // SELL MODE: Wanderer buys Parts and Fish
            const sellableItems = [
                ...player.inventory.filter(i => i.invType === 'fish'),
                ...player.reagents
            ];
            
            if (sellableItems.length === 0) {
                list.innerHTML = `<p style="color:var(--text-muted); font-size:1.2rem; text-align:center;">You have no parts or fish to sell.</p>`;
            }

            sellableItems.forEach((item) => {
                const row = document.createElement('div');
                row.className = 'shop-item-row';
                
                const baseVal = item.economy ? (item.economy.baseValue || item.economy.value) : (item.basePrice || 10);
                const sellValue = Math.max(1, Math.round(baseVal * effStats.economy.sellMultiplier));
                
                const isReagent = player.reagents.includes(item);
                const realIndex = isReagent ? player.reagents.indexOf(item) : player.inventory.indexOf(item);
                
                let imgSrc = item.invType === 'fish' ? item.art.imageDataUrl : item.imageDataUrl;
                let imgHtml = imgSrc ? `<img src="${imgSrc}" style="width:40px; height:40px; background:#000; border:1px solid var(--panel-border); border-radius:4px; image-rendering:pixelated;" />` : '';

                const itemName = item.name || (item.identity ? item.identity.name : 'Item');
                const nameColor = getItemColor(item);

                row.innerHTML = `
                    <div style="display:flex; gap: 1rem; align-items:center;">
                        ${imgHtml}
                        <div class="shop-item-info">
                            <b style="color: ${nameColor};">${itemName}</b> <span style="font-size:0.85rem; color:var(--text-muted); text-transform:uppercase;">[${item.invType === 'fish' ? item.physical.sizeTier : 'PART'}]</span>
                            ${item.invType === 'fish' ? `<p>${item.actualWeight}kg</p>` : ''}
                        </div>
                    </div>
                    <div class="shop-buy">
                        <span class="shop-price" style="color:var(--green-safe);">+${sellValue}g</span>
                        <button class="menu-btn btn-sell" style="width: auto; padding: 0.4rem 1rem; margin:0; font-size:1.2rem;">Sell</button>
                    </div>
                `;

                // --- NEW UNIFIED TOOLTIP BINDER ---
                TooltipUI.bind(row, item, player.gear);

                row.querySelector('.btn-sell').onclick = () => {
                    SFX.playGold();
                    player.vitals.gold += sellValue;
                    if (isReagent) player.reagents.splice(realIndex, 1);
                    else player.inventory.splice(realIndex, 1);
                    TooltipUI.hide(); // <-- UPDATED
                    this.renderMarket();
                };
                list.appendChild(row);
            });
        }
    },
};