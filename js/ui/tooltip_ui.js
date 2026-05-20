/**
 * js/ui/tooltip_ui.js
 * Centralized Tooltip System for rendering item stats and comparisons.
 */

import { getItemColor, buildStatSlider } from '../util/utils.js';

export const TooltipUI = {
    
    _getTooltipEl() {
        let tt = document.getElementById('shop-tooltip');
        const container = document.getElementById('game-container');
        
        if (!tt) {
            tt = document.createElement('div');
            tt.id = 'shop-tooltip';
            container.appendChild(tt);
        } else if (tt.parentNode !== container) {
            container.appendChild(tt);
        }
        return tt;
    },

    // --- FIX: Now accepts the entire `player` object ---
    bind(domElement, item, player = null) {
        if (!domElement) return;
        domElement.addEventListener('mouseenter', (e) => this.show(item, e, player));
        domElement.addEventListener('mousemove', (e) => this.move(e));
        domElement.addEventListener('mouseleave', () => this.hide());
    },

    show(item, e, player) {
        const tt = this._getTooltipEl();
        const playerGear = player ? player.gear : null;
        
        try {
            const isShopWrapper = item.itemData !== undefined && item.price !== undefined;
            const target = isShopWrapper ? item.itemData : item; 
            
            // --- FIX: Safely detect fish templates from the Bestiary ---
            let invType = item.type || target.invType;
            if (!invType && target.identity && target.combat) invType = 'fish';
            if (!invType) invType = 'unknown';
            
            let itemName = item.name || target.identity?.name || 'Unknown Item';
            let nameColor = getItemColor(target);
            let html = `<b style="color: ${nameColor}; font-size: 1.2rem; display: block; margin-bottom: 0.2rem;">${itemName}</b>`;
            
            let subtitle = invType.toUpperCase();
            if (invType === 'fish') subtitle = `${target.identity?.rarity || 'Common'} ${target.identity?.family ? target.identity.family.charAt(0).toUpperCase() + target.identity.family.slice(1) : 'Fish'}`;
            else if (invType === 'rod') subtitle = `${target.identity?.rarity || 'Common'} Fishing Rod`;
            else if (invType === 'boat') subtitle = `${target.identity?.rarity || 'Common'} Boat Hull`;
            else if (invType === 'upgrade') subtitle = `Boat Upgrade`;
            else if (invType === 'potion') subtitle = `Alchemical Draught`;
            else if (invType === 'bait') subtitle = `Targeted Bait`;
            else if (invType === 'lure') subtitle = `Custom Lure`;
            else if (invType === 'part') subtitle = `${target.rarity || 'Common'} Reagent`;

            html += `<div style="font-size: 0.85rem; color: #64748B; margin-bottom: 0.5rem; border-bottom: 1px solid #1E293B; padding-bottom: 0.3rem;">${subtitle}</div>`;

            if (invType === 'rod') {
                const eq = (playerGear && playerGear.rod) ? playerGear.rod.stats : { power: 0, maxTension: 0, flexibility: 0, sensitivity: 0 };
                const ns = target.stats || { power: 0, maxTension: 0, flexibility: 0, sensitivity: 0 };
                html += `
                    <div style="display:flex; justify-content:space-between; margin-bottom:2px;"><span>Power:</span> <span>${ns.power}x ${this.formatDelta(ns.power, eq.power)}</span></div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:2px;"><span>Tension:</span> <span>${ns.maxTension} ${this.formatDelta(ns.maxTension, eq.maxTension)}</span></div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:2px;"><span>Flex:</span> <span>${ns.flexibility}x ${this.formatDelta(ns.flexibility, eq.flexibility)}</span></div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:2px;"><span>Sensitivity:</span> <span>${ns.sensitivity}ms ${this.formatDelta(ns.sensitivity, eq.sensitivity)}</span></div>
                `;
                if (target.traits && target.traits.length > 0) {
                    html += `<div style="margin-top:0.5rem; border-top:1px dashed #1E293B; padding-top:0.3rem;">`;
                    target.traits.forEach(t => {
                        html += `<div style="color:#A855F7; font-size:0.9rem; font-weight:bold;">✨ ${t.name}</div>
                                 <div style="color:#64748B; font-size:0.8rem; line-height:1.2; margin-bottom:0.3rem;">${t.desc}</div>`;
                    });
                    html += `</div>`;
                }
            } 
            else if (invType === 'boat') {
                const eq = (playerGear && playerGear.boat) ? playerGear.boat.stats : { maxHp: 0, speed: 0, stealth: 0, cargoSpace: 0 };
                const ns = target.stats || { maxHp: 0, speed: 0, stealth: 0, cargoSpace: 0 };
                html += `
                    <div style="display:flex; justify-content:space-between; margin-bottom:2px;"><span>Hull HP:</span> <span>${ns.maxHp} ${this.formatDelta(ns.maxHp, eq.maxHp)}</span></div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:2px;"><span>Speed:</span> <span>${ns.speed} ${this.formatDelta(ns.speed, eq.speed)}</span></div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:2px;"><span>Stealth:</span> <span>${ns.stealth}x ${this.formatDelta(ns.stealth, eq.stealth)}</span></div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:2px;"><span>Cargo:</span> <span>${ns.cargoSpace} ${this.formatDelta(ns.cargoSpace, eq.cargoSpace)}</span></div>
                `;
            } 
            else if (invType === 'part' || invType === 'lure') {
                html += `<div class="loadout-details" style="margin-top: 0.2rem;">`;
                if (invType === 'lure') {
                    const eqDur = (playerGear && playerGear.lure) ? playerGear.lure.maxDurability : 0;
                    html += `
                        <div style="display:flex; justify-content:space-between; margin-bottom:0.5rem; border-bottom:1px solid #1E293B; padding-bottom:0.3rem;">
                            <span>Durability:</span> <span>${target.durability || 0}/${target.maxDurability || 0} ${this.formatDelta(target.maxDurability, eqDur)}</span>
                        </div>
                    `;
                }
                const st = target.stats || { color: 0, sound: 0, light: 0, weight: 0 };
                html += `
                    ${buildStatSlider('Color', st.color, 'Cold', 'Warm')}
                    ${buildStatSlider('Sound', st.sound, 'Silent', 'Loud')}
                    ${buildStatSlider('Light', st.light, 'Dark', 'Glow')}
                    ${buildStatSlider('Weight', st.weight, 'Float', 'Sink')}
                </div>`;
            } 
            else if (invType === 'fish') {
                // --- FIX: BESTIARY KNOWLEDGE CHECK ---
                const xp = (player && player.bestiary && player.bestiary[target.id]) ? player.bestiary[target.id].xp : 0;
                let bLevel = 1;
                if (xp >= 250) bLevel = 3;
                else if (xp >= 100) bLevel = 2;

                const sizeStr = target.physical?.sizeTier || '?';
                const isInstance = !!target.actualWeight; // Only caught fish in the cargo hold have exact weights
                const weightStr = isInstance ? `${target.actualWeight}kg` : `${target.physical?.weightRange?.min} - ${target.physical?.weightRange?.max}kg`;
                
                html += `
                    <div style="display:flex; justify-content:space-between; margin-bottom:2px;"><span>Size:</span> <span>${sizeStr}</span></div>
                    <div style="display:flex; justify-content:space-between; margin-bottom:2px;"><span>Weight:</span> <span>${weightStr}</span></div>
                `;

                if (bLevel >= 2) {
                    html += `<div style="display:flex; justify-content:space-between; margin-bottom:2px;"><span>Habitat:</span> <span style="text-transform:capitalize;">${target.environment?.depthPref || '?'}</span></div>`;
                    html += `<div style="display:flex; justify-content:space-between; margin-bottom:2px;"><span>Active:</span> <span style="text-transform:capitalize;">${target.environment?.activeHours || '?'}</span></div>`;
                } else {
                    html += `<div style="text-align:center; color:#64748B; font-style:italic; margin-top:0.3rem;">Habitat: ??? (Requires Lv.2)</div>`;
                }

                if (isInstance) {
                    html += `<div style="display:flex; justify-content:space-between; margin-top:0.3rem;"><span>Value:</span> <span style="color:#FBBF24;">${target.economy?.baseValue || 0}g</span></div>`;
                }

                if (bLevel >= 3) {
                    const st = target.lurePrefs || { color: 0, sound: 0, light: 0, weight: 0 };
                    html += `<div class="loadout-details" style="margin-top: 0.5rem; border-top: 1px dashed #1E293B; padding-top: 0.3rem;">
                        ${buildStatSlider('Color', st.color, 'Cold', 'Warm')}
                        ${buildStatSlider('Sound', st.sound, 'Silent', 'Loud')}
                        ${buildStatSlider('Light', st.light, 'Dark', 'Glow')}
                        ${buildStatSlider('Weight', st.weight, 'Float', 'Sink')}
                    </div>`;
                } else if (bLevel === 2) {
                    html += `<div style="text-align:center; color:#64748B; font-style:italic; margin-top:0.3rem;">Lure Prefs: ??? (Requires Lv.3)</div>`;
                }
            } 
            else if (invType === 'potion') {
                const buff = target.buff || { durationMins: 0, amount: 0, statName: '?' };
                const hrs = Math.floor(buff.durationMins / 60);
                const mins = buff.durationMins % 60;
                html += `
                    <div style="display:flex; justify-content:space-between; margin-top:0.2rem;"><span>Effect:</span> <span style="color:#22D3EE; font-weight:bold;">+${buff.amount} ${buff.statName}</span></div>
                    <div style="display:flex; justify-content:space-between;"><span>Duration:</span> <span>${hrs}h ${mins}m</span></div>
                `;
            } 
            else if (invType === 'bait') {
                html += `
                    <div style="display:flex; justify-content:space-between; margin-top:0.2rem;"><span>Attracts:</span> <span style="color:#FBBF24; font-weight:bold;">${target.targetFamily || '?'}</span></div>
                    <div style="display:flex; justify-content:space-between;"><span>Charges:</span> <span>${target.charges || 0} Casts</span></div>
                    <div style="display:flex; justify-content:space-between;"><span>Rarity Boost:</span> <span style="color:#22C55E;">+${target.rarityBoostPct || 0}%</span></div>
                `;
            } 
            else if (invType === 'upgrade') {
                html += `
                    <div style="display:flex; justify-content:space-between; margin-top:0.2rem; margin-bottom:0.5rem;"><span>Slot:</span> <span style="color:#22D3EE; text-transform:uppercase;">${target.slot || '?'}</span></div>
                    <p style="margin:0; font-size:0.95rem; line-height:1.4;">${target.desc || item.desc || ''}</p>
                `;
            } 
            else if (invType === 'consumable' || invType === 'chest' || invType === 'chest_encounter') {
                html += `<p style="margin:0; font-size:0.95rem; line-height:1.4;">${target.desc || item.desc || 'A mysterious object.'}</p>`;
            } 
            else {
                html += `<p style="margin:0;">${target.desc || item.desc || ''}</p>`;
            }

            tt.innerHTML = html;
            tt.style.display = 'block';
            this.move(e); 
            
        } catch (err) {
            console.error("[TooltipUI] RENDER ERROR:", err);
            tt.style.display = 'none';
        }
    },

    move(e) {
        const tt = document.getElementById('shop-tooltip');
        if (!tt || tt.style.display === 'none') return;
        
        const container = document.getElementById('game-container');
        if (!container) return;

        const rect = container.getBoundingClientRect();
        if (rect.width === 0 || rect.height === 0) return;

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

    hide() {
        const tt = document.getElementById('shop-tooltip');
        if (tt) tt.style.display = 'none';
    },

    formatDelta(newVal, oldVal, invertGoodBad = false) {
        if (newVal === undefined || oldVal === undefined) return '';
        const diff = newVal - oldVal;
        if (diff === 0) return `<span style="color:#64748B; font-size: 0.85em; margin-left: 0.5rem;">(+0)</span>`;
        
        let color = '#22C55E'; 
        if ((diff > 0 && invertGoodBad) || (diff < 0 && !invertGoodBad)) color = '#EF4444'; 
        
        const sign = diff > 0 ? '+' : '';
        const formattedDiff = Number.isInteger(diff) ? diff : diff.toFixed(2);
        return `<span style="color:${color}; font-size: 0.85em; margin-left: 0.5rem;">(${sign}${formattedDiff})</span>`;
    }
};