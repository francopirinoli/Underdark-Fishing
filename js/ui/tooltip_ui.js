/**
 * js/ui/tooltip_ui.js
 * Centralized Tooltip System for rendering item stats and comparisons.
 */

import { getItemColor, buildStatSlider } from '../util/utils.js';

export const TooltipUI = {
    
    // Ensures the tooltip exists in the DOM and is at the root level
    _getTooltipEl() {
        let tt = document.getElementById('shop-tooltip');
        const container = document.getElementById('game-container');
        
        if (!tt) {
            tt = document.createElement('div');
            tt.id = 'shop-tooltip';
            container.appendChild(tt);
        } else if (tt.parentNode !== container) {
            // SELF-REPAIR: If trapped in a hidden div (like the main menu), break it out!
            container.appendChild(tt);
        }
        
        return tt;
    },

    bind(domElement, item, playerGear = null) {
        if (!domElement) return;
        domElement.addEventListener('mouseenter', (e) => this.show(item, e, playerGear));
        domElement.addEventListener('mousemove', (e) => this.move(e));
        domElement.addEventListener('mouseleave', () => this.hide());
    },

    show(item, e, playerGear) {
        const tt = this._getTooltipEl();
        
        try {
            const isShopWrapper = item.itemData !== undefined && item.price !== undefined;
            const target = isShopWrapper ? item.itemData : item; 
            const invType = item.type || target.invType || 'unknown';
            
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

            html += `<div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 0.5rem; border-bottom: 1px solid var(--panel-border); padding-bottom: 0.3rem;">${subtitle}</div>`;

            if (invType === 'rod') {
                const eq = (playerGear && playerGear.rod) ? playerGear.rod.stats : { power: 0, maxTension: 0, flexibility: 0, sensitivity: 0 };
                const ns = target.stats || { power: 0, maxTension: 0, flexibility: 0, sensitivity: 0 };
                html += `
                    <div class="tt-row"><span>Power:</span> <span>${ns.power}x ${this.formatDelta(ns.power, eq.power)}</span></div>
                    <div class="tt-row"><span>Tension:</span> <span>${ns.maxTension} ${this.formatDelta(ns.maxTension, eq.maxTension)}</span></div>
                    <div class="tt-row"><span>Flex:</span> <span>${ns.flexibility}x ${this.formatDelta(ns.flexibility, eq.flexibility)}</span></div>
                    <div class="tt-row"><span>Sensitivity:</span> <span>${ns.sensitivity}ms ${this.formatDelta(ns.sensitivity, eq.sensitivity)}</span></div>
                `;
                if (target.traits && target.traits.length > 0) {
                    html += `<div style="margin-top:0.5rem; border-top:1px dashed var(--panel-border); padding-top:0.3rem;">`;
                    target.traits.forEach(t => {
                        html += `<div style="color:#A855F7; font-size:0.9rem; font-weight:bold;">✨ ${t.name}</div>
                                 <div style="color:var(--text-muted); font-size:0.8rem; line-height:1.2; margin-bottom:0.3rem;">${t.desc}</div>`;
                    });
                    html += `</div>`;
                }
            } 
            else if (invType === 'boat') {
                const eq = (playerGear && playerGear.boat) ? playerGear.boat.stats : { maxHp: 0, speed: 0, stealth: 0, cargoSpace: 0 };
                const ns = target.stats || { maxHp: 0, speed: 0, stealth: 0, cargoSpace: 0 };
                html += `
                    <div class="tt-row"><span>Hull HP:</span> <span>${ns.maxHp} ${this.formatDelta(ns.maxHp, eq.maxHp)}</span></div>
                    <div class="tt-row"><span>Speed:</span> <span>${ns.speed} ${this.formatDelta(ns.speed, eq.speed)}</span></div>
                    <div class="tt-row"><span>Stealth:</span> <span>${ns.stealth}x ${this.formatDelta(ns.stealth, eq.stealth)}</span></div>
                    <div class="tt-row"><span>Cargo:</span> <span>${ns.cargoSpace} ${this.formatDelta(ns.cargoSpace, eq.cargoSpace)}</span></div>
                `;
            } 
            else if (invType === 'part' || invType === 'lure') {
                html += `<div class="loadout-details" style="margin-top: 0.2rem;">`;
                if (invType === 'lure') {
                    const eqDur = (playerGear && playerGear.lure) ? playerGear.lure.maxDurability : 0;
                    html += `
                        <div class="tt-row" style="margin-bottom:0.5rem; border-bottom:1px solid var(--panel-border); padding-bottom:0.3rem;">
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
                html += `
                    <div class="tt-row"><span>Size:</span> <span style="color:var(--text-main);">${target.physical?.sizeTier || '?'}</span></div>
                    <div class="tt-row"><span>Weight:</span> <span style="color:var(--text-main);">${target.actualWeight || 0}kg</span></div>
                    <div class="tt-row"><span>Habitat:</span> <span style="text-transform:capitalize; color:var(--text-main);">${target.environment?.depthPref || '?'}</span></div>
                    <div class="tt-row" style="margin-top:0.3rem;"><span>Value:</span> <span style="color:var(--gold-warn);">${target.economy?.baseValue || 0}g</span></div>
                `;
            } 
            else if (invType === 'potion') {
                const buff = target.buff || { durationMins: 0, amount: 0, statName: '?' };
                const hrs = Math.floor(buff.durationMins / 60);
                const mins = buff.durationMins % 60;
                html += `
                    <div class="tt-row" style="margin-top:0.2rem;"><span>Effect:</span> <span style="color:var(--cyan-glow); font-weight:bold;">+${buff.amount} ${buff.statName}</span></div>
                    <div class="tt-row"><span>Duration:</span> <span style="color:var(--text-main);">${hrs}h ${mins}m</span></div>
                `;
            } 
            else if (invType === 'bait') {
                html += `
                    <div class="tt-row" style="margin-top:0.2rem;"><span>Attracts:</span> <span style="color:var(--gold-warn); font-weight:bold;">${target.targetFamily || '?'}</span></div>
                    <div class="tt-row"><span>Charges:</span> <span style="color:var(--text-main);">${target.charges || 0} Casts</span></div>
                    <div class="tt-row"><span>Rarity Boost:</span> <span style="color:var(--green-safe);">+${target.rarityBoostPct || 0}%</span></div>
                `;
            } 
            else if (invType === 'upgrade') {
                html += `
                    <div class="tt-row" style="margin-top:0.2rem; margin-bottom:0.5rem;"><span>Slot:</span> <span style="color:var(--cyan-glow); text-transform:uppercase;">${target.slot || '?'}</span></div>
                    <p style="margin:0; color:var(--text-main); font-size:0.95rem; line-height:1.4;">${target.desc || item.desc || ''}</p>
                `;
            } 
            else if (invType === 'consumable') {
                html += `<p style="margin:0; color:var(--text-main); font-size:0.95rem; line-height:1.4;">${target.desc || item.desc || ''}</p>`;
            } 
            else if (invType === 'chest' || invType === 'chest_encounter') {
                html += `<p style="margin:0; color:var(--text-main); font-size:0.95rem;">A heavy, waterlogged chest.</p>`;
            } 
            else {
                html += `<p style="margin:0; color:var(--text-main);">${target.desc || item.desc || ''}</p>`;
            }

            tt.innerHTML = html;
            tt.style.display = 'block';
            this.move(e);
            
        } catch (err) {
            console.error("[TooltipUI Render Error]:", err);
            tt.style.display = 'none';
        }
    },

    move(e) {
        const tt = this._getTooltipEl();
        if (tt.style.display === 'none') return;
        
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
        if (diff === 0) return `<span style="color:var(--text-muted); font-size: 0.85em; margin-left: 0.5rem;">(+0)</span>`;
        
        let color = 'var(--green-safe)';
        if ((diff > 0 && invertGoodBad) || (diff < 0 && !invertGoodBad)) color = 'var(--red-danger)';
        
        const sign = diff > 0 ? '+' : '';
        const formattedDiff = Number.isInteger(diff) ? diff : diff.toFixed(2);
        return `<span style="color:${color}; font-size: 0.85em; margin-left: 0.5rem;">(${sign}${formattedDiff})</span>`;
    }
};