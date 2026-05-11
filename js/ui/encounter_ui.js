/**
 * js/ui/encounter_ui.js
 * Manages the UI for wandering fishermen encounters.
 */

import { SFX } from '../audio/sfx_generator.js';
import { createRng } from '../util/rng.js';
import { DialogueGenerator } from '../economy/dialogue_generator.js';
import { PlayerEngine } from '../data/player_data.js';
import { getRarityColor, getItemColor } from '../util/utils.js';

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
            this.hideShopTooltip();
            this.close();
        });

        document.getElementById('btn-enc-buy').addEventListener('click', () => {
            SFX.playUISelect();
            this.marketMode = 'buy';
            this.hideShopTooltip();
            this.renderMarket();
        });

        document.getElementById('btn-enc-sell').addEventListener('click', () => {
            SFX.playUISelect();
            this.marketMode = 'sell';
            this.hideShopTooltip();
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
                const isCargoItem = (item.type === 'part' || item.visualId || item.type === 'rod' || item.type === 'lure');
                if (isCargoItem && currentInvCount >= maxCargo) disableReason = "Cargo Full";
                
                const canAfford = player.vitals.gold >= item.price;
                const hasStock = item.stock > 0;
                
                let btnText = "Buy";
                if (disableReason) btnText = disableReason;
                else if (!hasStock) btnText = "Sold Out";
                else if (!canAfford) btnText = "Too Expensive";

                const isDisabled = disableReason || !canAfford || !hasStock;
                
                let imgSrc = item.imageDataUrl || (item.itemData ? item.itemData.art.imageDataUrl : '');
                let imgHtml = imgSrc ? `<img src="${imgSrc}" style="width:40px; height:40px; background:#000; border:1px solid var(--panel-border); border-radius:4px; image-rendering:pixelated;" />` : '';

                const itemName = item.name || (item.identity ? item.identity.name : 'Item');
                const nameColor = getItemColor(item.itemData || item);

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
                
                row.addEventListener('mouseenter', (e) => this.showShopTooltip(item, e));
                row.addEventListener('mousemove', (e) => this.moveShopTooltip(e));
                row.addEventListener('mouseleave', () => this.hideShopTooltip());

                if (!isDisabled) {
                    row.querySelector('.btn-buy').onclick = () => {
                        SFX.playGold();
                        player.vitals.gold -= item.price;
                        item.stock--;
                        
                        if (item.id === 'cons_ration') player.vitals.rations += 1;
                        else if (item.id === 'cons_fuel_oil') player.vitals.fuel = 100;
                        else if (item.id === 'cons_repair_kit') player.vitals.hp = Math.min(player.gear.boat.stats.maxHp, player.vitals.hp + 25);
                        else if (isCargoItem) {
                            if (item.type === 'rod' || item.type === 'lure') player.inventory.push({ ...item.itemData, invType: item.type });
                            else player.inventory.push({ ...item, invType: 'part' }); 
                        }

                        this.hideShopTooltip();
                        this.renderMarket(); 
                    };
                }
                list.appendChild(row);
            });
        } else {
            // SELL MODE (Wanderers buy Parts and Fish)
            const sellableItems = player.inventory.filter(i => i.invType === 'part' || i.invType === 'fish');
            
            if (sellableItems.length === 0) {
                list.innerHTML = `<p style="color:var(--text-muted); font-size:1.2rem; text-align:center;">You have no parts or fish to sell.</p>`;
            }

            sellableItems.forEach((item) => {
                const row = document.createElement('div');
                row.className = 'shop-item-row';
                
                const baseVal = item.invType === 'fish' ? item.economy.baseValue : (item.basePrice || 10);
                const sellValue = Math.max(1, Math.round(baseVal * effStats.economy.sellMultiplier));
                const realIndex = player.inventory.findIndex(i => i === item);
                
                let imgSrc = item.invType === 'fish' ? item.art.imageDataUrl : item.imageDataUrl;
                let imgHtml = imgSrc ? `<img src="${imgSrc}" style="width:40px; height:40px; background:#000; border:1px solid var(--panel-border); border-radius:4px; image-rendering:pixelated;" />` : '';

                const itemName = item.name || (item.identity ? item.identity.name : 'Item');
                const nameColor = getItemColor(item);

                row.innerHTML = `
                    <div style="display:flex; gap: 1rem; align-items:center;">
                        ${imgHtml}
                        <div class="shop-item-info">
                            <b style="color: ${nameColor};">${itemName}</b> <span style="font-size:0.85rem; color:var(--text-muted); text-transform:uppercase;">[${item.invType}]</span>
                            ${item.invType === 'fish' ? `<p>${item.actualWeight}kg</p>` : ''}
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
                    this.renderMarket();
                };
                list.appendChild(row);
            });
        }
    },

    // --- TOOLTIPS ---
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
        } else if (item.type === 'part' || item.visualId) {
            const fmt = v => v > 0 ? `<span class="dash-pos">+${v}</span>` : (v < 0 ? `<span class="dash-neg">${v}</span>` : `0`);
            html += `<div class="tt-row"><span>Color:</span> <span>${fmt(item.stats.color)}</span></div>
                     <div class="tt-row"><span>Sound:</span> <span>${fmt(item.stats.sound)}</span></div>
                     <div class="tt-row"><span>Light:</span> <span>${fmt(item.stats.light)}</span></div>
                     <div class="tt-row"><span>Weight:</span> <span>${fmt(item.stats.weight)}</span></div>`;
        } else if (item.invType === 'fish') {
            const familyName = item.identity.family.charAt(0).toUpperCase() + item.identity.family.slice(1);
            html += `<div class="tt-row" style="margin-bottom:0.5rem; border-bottom:1px solid var(--panel-border); padding-bottom:0.3rem;">
                        <span style="color:var(--text-muted);">${item.identity.rarity} ${familyName}</span>
                     </div>
                     <div class="tt-row"><span>Size:</span> <span>${item.physical.sizeTier}</span></div>
                     <div class="tt-row"><span>Weight:</span> <span>${item.actualWeight}kg</span></div>
                     <div class="tt-row"><span>Habitat:</span> <span style="text-transform:capitalize;">${item.environment.depthPref}</span></div>`;
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
        
        const ttW = tt.offsetWidth || 250;
        const ttH = tt.offsetHeight || 150;

        if (x + ttW > 1280) x = (e.clientX - rect.left) * scaleX - ttW - 15;
        if (y + ttH > 720) y = (e.clientY - rect.top) * scaleY - ttH - 15;
        
        tt.style.left = `${x}px`;
        tt.style.top = `${y}px`;
    },

    hideShopTooltip() {
        const tt = document.getElementById('shop-tooltip');
        if (tt) tt.style.display = 'none';
    }
};