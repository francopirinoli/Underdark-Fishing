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
        // 1. HP Bar
        const hpPct = Math.max(0, player.vitals.hp / player.gear.boat.stats.maxHp * 100).toFixed(1);
        if (this._cache.hpPct !== hpPct) {
            document.getElementById('hud-hp-bar').style.width = `${hpPct}%`;
            this._cache.hpPct = hpPct;
        }

        // 2. Fuel Bar
        const fuelPct = Math.max(0, player.vitals.fuel).toFixed(1);
        if (this._cache.fuelPct !== fuelPct) {
            document.getElementById('hud-fuel-bar').style.width = `${fuelPct}%`;
            this._cache.fuelPct = fuelPct;
        }

        // 3. Rations
        if (this._cache.rations !== player.vitals.rations) {
            document.getElementById('hud-rations').innerText = player.vitals.rations;
            this._cache.rations = player.vitals.rations;
        }

        // 4. Clock
        const hrs = Math.floor(gameTimeMinutes / 60).toString().padStart(2, '0');
        const mins = Math.floor(gameTimeMinutes % 60).toString().padStart(2, '0');
        const timeStr = `Day ${gameDay} - ${hrs}:${mins}`;
        if (this._cache.timeStr !== timeStr) {
            document.getElementById('hud-clock').innerText = timeStr;
            this._cache.timeStr = timeStr;
        }

        // NEW: Noise Meter
        // Grab currentNoise from the exploration engine (defaults to 0 if fishing)
        const noiseLvl = window.ExplorationEngine ? window.ExplorationEngine.currentNoise : 0;
        const noisePct = Math.min(100, Math.max(0, noiseLvl || 0)).toFixed(1);
        
        if (this._cache.noisePct !== noisePct) {
            const bar = document.getElementById('hud-noise-bar');
            bar.style.width = `${noisePct}%`;
            
            // Color code the risk level
            if (noisePct < 40) bar.style.background = 'var(--green-safe)';
            else if (noisePct < 75) bar.style.background = 'var(--gold-warn)';
            else bar.style.background = 'var(--red-danger)';
            
            this._cache.noisePct = noisePct;
        }

        // 5. Gear Text, Images & Durability
        const rodName = player.gear.rod.identity.name;
        const rodImg = player.gear.rod.art.imageDataUrl;
        if (this._cache.rodName !== rodName) {
            document.getElementById('hud-rod-name').innerText = rodName;
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
    },

    cacheMinimap(localMap) {
        this.minimapCacheCanvas = document.createElement('canvas');
        this.minimapCacheCanvas.width = 200; // Updated
        this.minimapCacheCanvas.height = 200; // Updated
        const ctx = this.minimapCacheCanvas.getContext('2d');
        
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, 200, 200); // Updated

        const ratio = 200 / LOCAL_MAP_SIZE; // Updated
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
            ctx.fillRect(0, 0, 200, 200); // Updated
        }

        const ratio = 200 / LOCAL_MAP_SIZE; // Updated
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
        
        logBox.appendChild(div);
        if (logBox.children.length > 3) logBox.removeChild(logBox.firstChild);
    }
};