/**
 * js/util/save_manager.js
 * Handles serializing the game state to browser localStorage with 3 Save Slots.
 */

const PREFIX = 'underdark_fishing_save_';

export const SaveManager = {
    
    getSaveInfo(slot) {
        try {
            const dataStr = localStorage.getItem(PREFIX + slot);
            if (!dataStr) return null;
            const data = JSON.parse(dataStr);
            return {
                day: data.gameDay || 1,
                gold: data.player?.vitals?.gold || 0,
                name: data.player?.identity?.name || "Unknown Angler",
                portrait: data.player?.identity?.portraitData || ""
            };
        } catch (e) {
            return null;
        }
    },

    saveGame(slot, player, worldSeed, globalX, globalY, gameDay, gameTimeMinutes, discoveredNodes =[], nodeEcology = {}) {
        const saveData = {
            version: '1.2',
            player: player,
            worldSeed: worldSeed,
            globalX: globalX,
            globalY: globalY,
            gameDay: gameDay,
            gameTimeMinutes: gameTimeMinutes,
            discoveredNodes: discoveredNodes,
            nodeEcology: nodeEcology // NEW: Tracks fish discovered per node
        };
        
        try {
            localStorage.setItem(PREFIX + slot, JSON.stringify(saveData));
            console.log(`💾 Game Saved Successfully to Slot ${slot}.`);
            return true;
        } catch (e) {
            console.error("Failed to save game:", e);
            return false;
        }
    },

    loadGame(slot) {
        try {
            const dataStr = localStorage.getItem(PREFIX + slot);
            if (!dataStr) return null;
            const data = JSON.parse(dataStr);
            
            // Backwards compatibility
            if (!data.discoveredNodes) data.discoveredNodes = [`${data.globalX},${data.globalY}`];
            if (!data.nodeEcology) data.nodeEcology = {};
            
            return data;
        } catch (e) {
            console.error("Failed to load game:", e);
            return null;
        }
    },

    deleteSave(slot) {
        localStorage.removeItem(PREFIX + slot);
    }
};