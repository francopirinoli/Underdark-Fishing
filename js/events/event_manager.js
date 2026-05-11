/**
 * js/events/event_manager.js
 * The master controller for all time-based events.
 */
import { TreasureEvent } from './treasure_event.js';
import { FishermanEvent } from './fisherman_event.js'; 
import { WeatherEvent } from './weather_event.js'; // <-- NEW

export const EventManager = {
    Treasure: TreasureEvent,
    Fisherman: FishermanEvent, 
    Weather: WeatherEvent, // <-- NEW

    onNewDay(day, world) {
        // Pass world.seed to old events, and full world to Weather
        this.Treasure.onNewDay(day, world.seed);
        this.Fisherman.onNewDay(day, world.seed); 
        this.Weather.onNewDay(day, world); // <-- NEW
    },

    getSaveData() {
        return { 
            treasure: this.Treasure.getSaveData(),
            fisherman: this.Fisherman.getSaveData(),
            weather: this.Weather.getSaveData() // <-- NEW
        };
    },

    loadSaveData(data) {
        if (!data) return;
        if (data.treasure) this.Treasure.loadSaveData(data.treasure);
        if (data.fisherman) this.Fisherman.loadSaveData(data.fisherman);
        if (data.weather) this.Weather.loadSaveData(data.weather); // <-- NEW
    }
};