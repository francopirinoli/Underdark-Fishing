/**
 * js/events/event_manager.js
 * The master controller for all time-based events.
 */
import { TreasureEvent } from './treasure_event.js';

export const EventManager = {
    Treasure: TreasureEvent,

    onNewDay(day, worldSeed) {
        this.Treasure.onNewDay(day, worldSeed);
    },

    getSaveData() {
        return { treasure: this.Treasure.getSaveData() };
    },

    loadSaveData(data) {
        if (!data) return;
        if (data.treasure) this.Treasure.loadSaveData(data.treasure);
    }
};