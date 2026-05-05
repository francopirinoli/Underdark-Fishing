/**
 * js/ui/hud_ui.js
 * Manages the Heads-Up Display: Vitals, Clock, Action Log, and Minimap.
 */

import { TILE, LOCAL_MAP_SIZE } from '../exploration/local_map.js';

export const HUD = {
    minimapCacheCanvas: null,

    /**
     * Updates the vital bars, clock, and loadout text.
     */
    update(player, gameDay, gameTimeMinutes) {
        document.getElementById('hud-hp-bar').style.width = `${Math.max(0, player.vitals.hp / player.gear.boat.stats.maxHp * 100)}%`;
        document.getElementById('hud-fuel-bar').style.width = `${Math.max(0, player.vitals.fuel / 100 * 100)}%`;
        document.getElementById('hud-rations').innerText = player.vitals.rations;

        const hrs = Math.floor(gameTimeMinutes / 60).toString().padStart(2, '0');
        const mins = Math.floor(gameTimeMinutes % 60).toString().padStart(2, '0');
        document.getElementById('hud-clock').innerText = `Day ${gameDay} - ${hrs}:${mins}`;

        document.getElementById('hud-rod-name').innerText = player.gear.rod.identity.name;
        document.getElementById('hud-lure-name').innerText = player.gear.lure.name || "Bare Hook";
    },

    /**
     * Caches the static landmasses of the minimap when entering a new zone.
     */
    cacheMinimap(localMap) {
        this.minimapCacheCanvas = document.createElement('canvas');
        this.minimapCacheCanvas.width = 150;
        this.minimapCacheCanvas.height = 150;
        const ctx = this.minimapCacheCanvas.getContext('2d');
        
        ctx.fillStyle = '#000';
        ctx.fillRect(0, 0, 150, 150);

        const ratio = 150 / LOCAL_MAP_SIZE;
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

    /**
     * Draws the cached minimap and overlays the player's current position.
     */
    drawMinimap(playerX, playerY) {
        const mmCanvas = document.getElementById('minimap-canvas');
        const ctx = mmCanvas.getContext('2d');
        
        if (this.minimapCacheCanvas) {
            ctx.drawImage(this.minimapCacheCanvas, 0, 0);
        } else {
            ctx.fillStyle = '#000';
            ctx.fillRect(0, 0, 150, 150);
        }

        const ratio = 150 / LOCAL_MAP_SIZE;
        ctx.fillStyle = '#22D3EE';
        ctx.beginPath();
        ctx.arc(playerX * ratio, playerY * ratio, 2, 0, Math.PI * 2);
        ctx.fill();
    },

    /**
     * Pushes a message to the bottom-left Action Log.
     */
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