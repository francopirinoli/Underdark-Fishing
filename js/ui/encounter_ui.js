/**
 * js/ui/encounter_ui.js
 * Manages the UI for wandering fishermen encounters.
 */

import { SFX } from '../audio/sfx_generator.js';
import { createRng } from '../util/rng.js';
import { DialogueGenerator } from '../economy/dialogue_generator.js';
import { PlayerEngine } from '../data/player_data.js';
import { getRarityColor, getItemColor, buildStatSlider } from '../util/utils.js';

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
                
                row.addEventListener('mouseenter', (e) => this.showShopTooltip(item, e));
                row.addEventListener('mousemove', (e) => this.moveShopTooltip(e));
                row.addEventListener('mouseleave', () => this.hideShopTooltip());

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

                        this.hideShopTooltip();
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

                row.querySelector('.btn-sell').onclick = () => {
                    SFX.playGold();
                    player.vitals.gold += sellValue;
                    if (isReagent) player.reagents.splice(realIndex, 1);
                    else player.inventory.splice(realIndex, 1);
                    this.renderMarket();
                };
                list.appendChild(row);
            });
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
        
        // --- FIX: Prevent Potion/Bait art metadata from overriding the actual item ---
        const isShopWrapper = item.itemData && ['rod', 'boat', 'lure', 'potion', 'bait'].includes(item.type);
        const target = isShopWrapper ? item.itemData : item;
        
        const invType = item.type || target.invType || 'unknown';
        
        let itemName = item.name || target.identity?.name || 'Unknown Item';
        let nameColor = getItemColor(target);
        let html = `<b style="color: ${nameColor}; font-size: 1.2rem;">${itemName}</b>`;
        
        // Dynamic Subtitles
        let subtitle = invType.toUpperCase();
        if (invType === 'fish') subtitle = `${target.identity.rarity} ${target.identity.family.charAt(0).toUpperCase() + target.identity.family.slice(1)}`;
        else if (invType === 'rod') subtitle = `${target.identity.rarity} Fishing Rod`;
        else if (invType === 'boat') subtitle = `${target.identity.rarity} Boat Hull`;
        else if (invType === 'upgrade') subtitle = `Boat Upgrade`;
        else if (invType === 'potion') subtitle = `Alchemical Draught`;
        else if (invType === 'bait') subtitle = `Targeted Bait`;
        else if (invType === 'lure') subtitle = `Custom Lure`;
        else if (invType === 'part') subtitle = `${target.rarity} Reagent`;

        html += `<div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.5rem; border-bottom: 1px solid var(--panel-border); padding-bottom: 0.3rem;">${subtitle}</div>`;

        if (invType === 'rod') {
            const eq = player.gear.rod ? player.gear.rod.stats : { power: 0, maxTension: 0, flexibility: 0, sensitivity: 0 };
            const ns = target.stats;
            html += `<div class="tt-row"><span>Power:</span> <span>${ns.power}x ${this.formatDelta(ns.power, eq.power)}</span></div>
                     <div class="tt-row"><span>Tension:</span> <span>${ns.maxTension} ${this.formatDelta(ns.maxTension, eq.maxTension)}</span></div>
                     <div class="tt-row"><span>Flex:</span> <span>${ns.flexibility}x ${this.formatDelta(ns.flexibility, eq.flexibility)}</span></div>
                     <div class="tt-row"><span>Sensitivity:</span> <span>${ns.sensitivity}ms ${this.formatDelta(ns.sensitivity, eq.sensitivity)}</span></div>`;
            
            if (target.traits && target.traits.length > 0) {
                html += `<div style="margin-top:0.5rem; border-top:1px dashed var(--panel-border); padding-top:0.3rem;">`;
                target.traits.forEach(t => {
                    html += `<div style="color:#A855F7; font-size:0.9rem; font-weight:bold;">✨ ${t.name}</div>
                             <div style="color:var(--text-muted); font-size:0.8rem; line-height:1.2; margin-bottom:0.3rem;">${t.desc}</div>`;
                });
                html += `</div>`;
            }
        } else if (invType === 'boat') {
            const eq = player.gear.boat ? player.gear.boat.stats : { maxHp: 0, speed: 0, stealth: 0, cargoSpace: 0 };
            const ns = target.stats;
            html += `<div class="tt-row"><span>Hull HP:</span> <span>${ns.maxHp} ${this.formatDelta(ns.maxHp, eq.maxHp)}</span></div>
                     <div class="tt-row"><span>Speed:</span> <span>${ns.speed} ${this.formatDelta(ns.speed, eq.speed)}</span></div>
                     <div class="tt-row"><span>Stealth:</span> <span>${ns.stealth}x ${this.formatDelta(ns.stealth, eq.stealth)}</span></div>
                     <div class="tt-row"><span>Cargo:</span> <span>${ns.cargoSpace} ${this.formatDelta(ns.cargoSpace, eq.cargoSpace)}</span></div>`;
        } else if (invType === 'part' || invType === 'lure') {
            html += `<div class="loadout-details" style="margin-top: 0.2rem;">`;
            if (invType === 'lure') {
                const eqDur = player.gear.lure ? player.gear.lure.maxDurability : 0;
                html += `<div class="tt-row" style="margin-bottom:0.5rem; border-bottom:1px solid var(--panel-border); padding-bottom:0.3rem;">
                            <span>Durability:</span> <span>${target.durability}/${target.maxDurability} ${this.formatDelta(target.maxDurability, eqDur)}</span>
                         </div>`;
            }
            html += `
                ${buildStatSlider('Color', target.stats.color, 'Cold', 'Warm')}
                ${buildStatSlider('Sound', target.stats.sound, 'Silent', 'Loud')}
                ${buildStatSlider('Light', target.stats.light, 'Dark', 'Glow')}
                ${buildStatSlider('Weight', target.stats.weight, 'Float', 'Sink')}
            </div>`;
        } else if (invType === 'fish') {
            html += `<div class="tt-row"><span>Size:</span> <span style="color:var(--text-main);">${target.physical.sizeTier}</span></div>
                     <div class="tt-row"><span>Weight:</span> <span style="color:var(--text-main);">${target.actualWeight}kg</span></div>
                     <div class="tt-row"><span>Habitat:</span> <span style="text-transform:capitalize; color:var(--text-main);">${target.environment.depthPref}</span></div>
                     <div class="tt-row" style="margin-top:0.3rem;"><span>Value:</span> <span style="color:var(--gold-warn);">${target.economy.baseValue}g</span></div>`;
        } else if (invType === 'potion') {
            const buff = target.buff;
            const hrs = Math.floor(buff.durationMins / 60);
            const mins = buff.durationMins % 60;
            html += `<div class="tt-row" style="margin-top:0.2rem;"><span>Effect:</span> <span style="color:var(--cyan-glow); font-weight:bold;">+${buff.amount} ${buff.statName}</span></div>
                     <div class="tt-row"><span>Duration:</span> <span style="color:var(--text-main);">${hrs}h ${mins}m</span></div>`;
        } else if (invType === 'bait') {
            html += `<div class="tt-row" style="margin-top:0.2rem;"><span>Attracts:</span> <span style="color:var(--gold-warn); font-weight:bold;">${target.targetFamily}</span></div>
                     <div class="tt-row"><span>Charges:</span> <span style="color:var(--text-main);">${target.charges} Casts</span></div>
                     <div class="tt-row"><span>Rarity Boost:</span> <span style="color:var(--green-safe);">+${target.rarityBoostPct}%</span></div>`;
        } else if (invType === 'upgrade') {
            html += `<div class="tt-row" style="margin-top:0.2rem; margin-bottom:0.5rem;"><span>Slot:</span> <span style="color:var(--cyan-glow); text-transform:uppercase;">${target.slot}</span></div>
                     <p style="margin:0; color:var(--text-main); font-size:0.95rem; line-height:1.4;">${target.desc || item.desc}</p>`;
        } else if (invType === 'consumable') {
            html += `<p style="margin:0; color:var(--text-main); font-size:0.95rem; line-height:1.4;">${target.desc || item.desc}</p>`;
        } else if (invType === 'chest' || invType === 'chest_encounter') {
            html += `<p style="margin:0; color:var(--text-main); font-size:0.95rem;">A heavy, waterlogged chest.</p>`;
        } else {
            html += `<p style="margin:0; color:var(--text-main);">${target.desc || item.desc || ''}</p>`;
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