/**
 * js/events/fisherman_event.js
 * Manages the daily spawning of Wandering Fishermen across the global map.
 */
import { createRng } from '../util/rng.js';

export const FishermanEvent = {
    activeNodes: {}, // Dictionary of "x,y": true

    onNewDay(day, worldSeed) {
        this.activeNodes = {};
        const rng = createRng(worldSeed + day * 4242); // Different salt than treasure
        
        // Spawn ~25 fishermen randomly across the map
        let placed = 0;
        let attempts = 0;
        while(placed < 25 && attempts < 1000) {
            attempts++;
            const x = rng.int(0, 15);
            const y = rng.int(0, 15);
            const key = `${x},${y}`;
            if (!this.activeNodes[key]) {
                this.activeNodes[key] = true;
                placed++;
            }
        }
        console.log(`[Event] Wandering Fishermen spawned at ${placed} nodes.`);
    },

    hasFisherman(x, y) {
        return !!this.activeNodes[`${x},${y}`];
    },

    // We don't have a "clearFisherman" function because they stay all day!
    
    getSaveData() { return this.activeNodes; },
    loadSaveData(data) { this.activeNodes = data || {}; }
};