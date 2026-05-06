/**
 * js/events/treasure_event.js
 * Manages the daily spawning of Sunken Chests across the global map.
 */
import { createRng } from '../util/rng.js';

export const TreasureEvent = {
    activeNodes: {}, // Dictionary of "x,y": true

    onNewDay(day, worldSeed) {
        this.activeNodes = {};
        const rng = createRng(worldSeed + day * 1337);
        
        // Spawn 10 chests randomly across the map
        let placed = 0;
        let attempts = 0;
        while(placed < 10 && attempts < 1000) {
            attempts++;
            const x = rng.int(0, 15);
            const y = rng.int(0, 15);
            const key = `${x},${y}`;
            if (!this.activeNodes[key]) {
                this.activeNodes[key] = true;
                placed++;
            }
        }
        console.log(`[Event] Sunken Chests spawned at ${placed} nodes.`);
    },

    hasChest(x, y) {
        return !!this.activeNodes[`${x},${y}`];
    },

    clearChest(x, y) {
        delete this.activeNodes[`${x},${y}`];
    },

    getSaveData() { return this.activeNodes; },
    loadSaveData(data) { this.activeNodes = data || {}; }
};