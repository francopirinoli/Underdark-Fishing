/**
 * js/ui/hud_ui.js
 * Manages the Heads-Up Display: Vitals, Clock, Action Log, and Minimap.
 * V2 - Optimized with Dirty Checking to prevent DOM Thrashing.
 */

import { TILE, LOCAL_MAP_SIZE } from '../exploration/local_map.js';

export const HUD = {
    minimapCacheCanvas: null,
    _cache: {}, // Stores previous values to prevent redundant DOM updates

    update(player, gameDay, gameTimeMinutes) {
        // OPTIMIZATION: Round percentages to integers to prevent sub-pixel DOM layout thrashing

        // 1. HP Bar
        const maxHp = player.gear.boat.stats.maxHp;
        const currentHp = Math.floor(player.vitals.hp);
        const hpPct = Math.round(Math.max(0, currentHp / maxHp * 100));
        if (this._cache.hpPct !== hpPct || this._cache.currentHp !== currentHp) {
            document.getElementById('hud-hp-bar').style.width = `${hpPct}%`;
            document.getElementById('hud-hp-text').innerText = `${currentHp}/${maxHp}`;
            this._cache.hpPct = hpPct;
            this._cache.currentHp = currentHp;
        }

        // 2. Fuel Bar
        const fuelPct = Math.round(Math.max(0, player.vitals.fuel));
        if (this._cache.fuelPct !== fuelPct) {
            document.getElementById('hud-fuel-bar').style.width = `${fuelPct}%`;
            document.getElementById('hud-fuel-text').innerText = `${fuelPct}%`;
            this._cache.fuelPct = fuelPct;
        }

        // 3. Rations Bar (Capped at 20)
        const rations = player.vitals.rations;
        if (this._cache.rations !== rations) {
            const rationPct = Math.round((rations / 20) * 100);
            document.getElementById('hud-ration-bar').style.width = `${rationPct}%`;
            document.getElementById('hud-ration-text').innerText = `${rations}/20`;
            this._cache.rations = rations;
        }

        // 4. Clock
        const hrs = Math.floor(gameTimeMinutes / 60);
        const mins = Math.floor(gameTimeMinutes % 60);
        
        let timeLabel = "NIGHT";
        if (hrs >= 4 && hrs < 8) timeLabel = "DAWN";
        else if (hrs >= 8 && hrs < 16) timeLabel = "DAY";
        else if (hrs >= 16 && hrs < 20) timeLabel = "DUSK";

        const hrsStr = hrs.toString().padStart(2, '0');
        const minsStr = mins.toString().padStart(2, '0');
        
        // Build an inset digital display format
        const timeHtml = `
            <span style="color:var(--text-muted); font-size:0.85rem; width:45px; text-align:left;">DAY ${gameDay}</span>
            <span style="font-size:1.3rem; letter-spacing:0.1em; font-weight:bold;">${hrsStr}:${minsStr}</span>
            <span style="color:var(--text-muted); font-size:0.85rem; width:45px; text-align:right;">${timeLabel}</span>
        `;
        
        if (this._cache.timeStr !== timeHtml) {
            document.getElementById('hud-clock').innerHTML = timeHtml; // Note: Use .innerHTML instead of .innerText now!
            this._cache.timeStr = timeHtml;
        }

        // NEW: Noise Meter
        const noiseLvl = window.ExplorationEngine ? window.ExplorationEngine.currentNoise : 0;
        const noisePct = Math.round(Math.min(100, Math.max(0, noiseLvl || 0)));
        
        if (this._cache.noisePct !== noisePct) {
            const bar = document.getElementById('hud-noise-bar');
            bar.style.width = `${noisePct}%`;
            
            // Color code the risk level
            if (noisePct < 40) bar.style.background = 'var(--green-safe)';
            else if (noisePct < 75) bar.style.background = 'var(--gold-warn)';
            else bar.style.background = 'var(--red-danger)';
            
            // FIX: Actually push the text to the UI overlay!
            document.getElementById('hud-noise-text').innerText = `${noisePct}%`;
            
            this._cache.noisePct = noisePct;
        }

        // 5. Gear Text, Images & Durability
        const rod = player.gear.rod;
        const rodName = rod ? rod.identity.name : "No Rod Equipped";
        const rodImg = rod ? rod.art.imageDataUrl : 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='; // Transparent pixel fallback

        if (this._cache.rodName !== rodName) {
            const nameEl = document.getElementById('hud-rod-name');
            nameEl.innerText = rodName;
            // Turn the text red to warn them they can't cast without a rod
            nameEl.style.color = rod ? 'var(--cyan-glow)' : 'var(--red-danger)';
            
            document.getElementById('hud-rod-img').src = rodImg;
            this._cache.rodName = rodName;
        }

        const lure = player.gear.lure;
        const lureName = lure.name || "Bare Hook";
        const lureImg = lure.imageDataUrl || ''; 
        const lureDurability = lure.maxDurability > 0 ? `Durability: ${lure.durability}/${lure.maxDurability}` : `Durability: ∞`;
        
        // Use a composite key to check if anything about the lure changed
        const lureCacheKey = `${lureName}_${lureDurability}`;
        if (this._cache.lureData !== lureCacheKey) {
            document.getElementById('hud-lure-name').innerText = lureName;
            document.getElementById('hud-lure-durability').innerText = lureDurability;
            
            const imgEl = document.getElementById('hud-lure-img');
            if (!lureImg) {
                // If it's a bare hook, just show a blank black square
                imgEl.src = 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs='; 
            } else {
                imgEl.src = lureImg;
            }
            
            this._cache.lureData = lureCacheKey;
        }

        // --- NEW: 6. Bait Tracker ---
        const bait = player.gear.bait;
        const baitName = bait ? bait.name : "No Bait";
        const baitImg = bait ? bait.imageDataUrl : 'data:image/gif;base64,R0lGODlhAQABAAD/ACwAAAAAAQABAAACADs=';
        const baitCharges = bait ? `Charges: ${bait.charges}/${bait.maxCharges}` : "Standard Pool";

        const baitCacheKey = `${baitName}_${bait ? bait.charges : 0}`;
        if (this._cache.baitData !== baitCacheKey) {
            document.getElementById('hud-bait-name').innerText = baitName;
            document.getElementById('hud-bait-name').style.color = bait ? 'var(--gold-warn)' : 'var(--text-muted)';
            document.getElementById('hud-bait-charges').innerText = baitCharges;
            document.getElementById('hud-bait-img').src = baitImg;
            this._cache.baitData = baitCacheKey;
        }

// --- 7. Active Buffs Tracker ---
        let buffCacheKey = player.activeBuffs ? player.activeBuffs.map(b => `${b.statName}_${Math.floor(b.durationMins)}`).join('|') : '';
        
        if (this._cache.buffData !== buffCacheKey) {
            const panel = document.getElementById('hud-buffs-panel');
            const list = document.getElementById('hud-buffs-list');
            
            if (!player.activeBuffs || player.activeBuffs.length === 0) {
                panel.style.display = 'none';
            } else {
                panel.style.display = 'flex';
                let html = '';
                player.activeBuffs.forEach(buff => {
                    const hrs = Math.floor(buff.durationMins / 60);
                    const mins = Math.floor(buff.durationMins % 60).toString().padStart(2, '0');
                    
                    // Progress Bar Math
                    const maxDur = buff.maxDurationMins || Math.max(buff.durationMins, 1);
                    const pct = Math.max(0, Math.min(100, (buff.durationMins / maxDur) * 100));
                    
                    html += `
                        <div style="display:flex; justify-content:space-between; align-items:center; font-size: 0.85rem; margin-bottom: 2px;">
                            <span style="color:var(--cyan-glow); font-weight:bold;">+${buff.amount} ${buff.statName}</span>
                            <span style="color:var(--text-main); font-size: 0.8rem;">${hrs}h ${mins}m</span>
                        </div>
                        <div style="width: 100%; height: 4px; background: #020617; border: 1px solid #1E293B; border-radius: 2px; overflow: hidden; margin-bottom: 4px;">
                            <div style="height: 100%; width: ${pct}%; background: #A855F7;"></div>
                        </div>
                    `;
                });
                list.innerHTML = html;
            }
            this._cache.buffData = buffCacheKey;
        }
    },
    
    cacheMinimap(localMap) {
        this.minimapCacheCanvas = document.createElement('canvas');
        this.minimapCacheCanvas.width = 160;  // <-- Shrunk from 200
        this.minimapCacheCanvas.height = 160; // <-- Shrunk from 200
        const ctx = this.minimapCacheCanvas.getContext('2d');
        
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, 160, 160);

        const ratio = 160 / LOCAL_MAP_SIZE; 
        ctx.fillStyle = '#1e293b'; 

        for (let y = 0; y < LOCAL_MAP_SIZE; y += 4) { 
            for (let x = 0; x < LOCAL_MAP_SIZE; x += 4) {
                const t = localMap.grid[y][x];
                if (t === TILE.LAND || t === TILE.ROCK) {
                    ctx.fillRect(x * ratio, y * ratio, 4 * ratio, 4 * ratio);
                }
            }
        }
    },

    drawMinimap(playerX, playerY) {
        const mmCanvas = document.getElementById('minimap-canvas');
        const ctx = mmCanvas.getContext('2d');
        
        if (this.minimapCacheCanvas) {
            ctx.drawImage(this.minimapCacheCanvas, 0, 0);
        } else {
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, 160, 160);
        }

        const ratio = 160 / LOCAL_MAP_SIZE;
        ctx.fillStyle = '#22D3EE';
        ctx.beginPath();
        ctx.arc(playerX * ratio, playerY * ratio, 2, 0, Math.PI * 2);
        ctx.fill();
    },

    logAction(msg, type = "normal") {
        const logBox = document.getElementById('hud-log');
        const div = document.createElement('div');
        div.className = "log-msg";
        div.innerText = msg;
        
        if (type === 'danger') div.style.color = 'var(--red-danger)';
        if (type === 'safe') div.style.color = 'var(--green-safe)';
        if (type === 'warn') div.style.color = 'var(--gold-warn)'; // <-- NEW
        
        logBox.appendChild(div);
        
        while (logBox.scrollHeight > logBox.clientHeight + 2 && logBox.children.length > 1) {
            logBox.removeChild(logBox.firstChild);
        }
    }
};