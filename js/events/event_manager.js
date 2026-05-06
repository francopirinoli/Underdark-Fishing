/**
 * js/events/event_manager.js
 * The master controller for all time-based events.
 */
import { TreasureEvent } from './treasure_event.js';
import { FishermanEvent } from './fisherman_event.js'; // <-- NEW

export const EventManager = {
    Treasure: TreasureEvent,
    Fisherman: FishermanEvent, // <-- NEW

    onNewDay(day, worldSeed) {
        this.Treasure.onNewDay(day, worldSeed);
        this.Fisherman.onNewDay(day, worldSeed); // <-- NEW
    },

    getSaveData() {
        return { 
            treasure: this.Treasure.getSaveData(),
            fisherman: this.Fisherman.getSaveData() // <-- NEW
        };
    },

    loadSaveData(data) {
        if (!data) return;
        if (data.treasure) this.Treasure.loadSaveData(data.treasure);
        if (data.fisherman) this.Fisherman.loadSaveData(data.fisherman); // <-- NEW
    }
};