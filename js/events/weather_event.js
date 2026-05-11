/**
 * js/events/weather_event.js
 * Manages the daily spawning of Dynamic Weather Hazards across the global map.
 */
import { createRng } from '../util/rng.js';

export const WeatherEvent = {
    activeNodes: {}, // Dictionary of "x,y": "storm_type"

    onNewDay(day, world) {
        this.activeNodes = {};
        const rng = createRng(world.seed + day * 777); // Unique salt
        
        let stormCount = 0;

        for (let y = 0; y < world.height; y++) {
            for (let x = 0; x < world.width; x++) {
                const node = world.nodes[y][x];
                
                // Only Fungal, Crystal, and Abyssal have dynamic weather
                if (['fungal', 'crystal', 'abyssal'].includes(node.biomeId)) {
                    if (rng.chance(0.15)) { // 15% chance per eligible node
                        if (node.biomeId === 'fungal') this.activeNodes[`${x},${y}`] = 'spores';
                        else if (node.biomeId === 'crystal') this.activeNodes[`${x},${y}`] = 'shatter';
                        else if (node.biomeId === 'abyssal') this.activeNodes[`${x},${y}`] = 'whirlpool';
                        
                        stormCount++;
                    }
                }
            }
        }
        console.log(`[Event] ${stormCount} Weather Hazards spawned.`);
    },

    getWeather(x, y) {
        return this.activeNodes[`${x},${y}`] || null;
    },

    getSaveData() { return this.activeNodes; },
    loadSaveData(data) { this.activeNodes = data || {}; }
};