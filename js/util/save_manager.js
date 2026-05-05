/**
 * js/util/save_manager.js
 * Handles serializing the game state to browser localStorage.
 */

const SAVE_KEY = 'underdark_fishing_save';

export const SaveManager = {
    /**
     * Checks if a save file exists.
     * @returns {boolean}
     */
    hasSave() {
        return localStorage.getItem(SAVE_KEY) !== null;
    },

    /**
     * Saves the entire game state.
     */
    saveGame(player, worldSeed, globalX, globalY, gameDay, gameTimeMinutes, discoveredNodes =[]) {
        const saveData = {
            version: '1.1', // Bumped version
            player: player,
            worldSeed: worldSeed,
            globalX: globalX,
            globalY: globalY,
            gameDay: gameDay,
            gameTimeMinutes: gameTimeMinutes,
            discoveredNodes: discoveredNodes // NEW: Fog of War tracking
        };
        
        try {
            localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
            console.log("💾 Game Saved Successfully.");
            return true;
        } catch (e) {
            console.error("Failed to save game:", e);
            return false;
        }
    },

    /**
     * Loads the game state.
     * @returns {Object|null}
     */
    loadGame() {
        try {
            const dataStr = localStorage.getItem(SAVE_KEY);
            if (!dataStr) return null;
            
            const data = JSON.parse(dataStr);
            
            // Backwards compatibility for older saves
            if (!data.discoveredNodes) {
                data.discoveredNodes = [`${data.globalX},${data.globalY}`];
            }
            
            return data;
        } catch (e) {
            console.error("Failed to load game:", e);
            return null;
        }
    },

    /**
     * Wipes the current save.
     */
    deleteSave() {
        localStorage.removeItem(SAVE_KEY);
    }
};