/**
 * js/util/save_manager.js
 * Handles serializing the game state to browser localStorage with 3 Save Slots.
 */

import { ArtRehydrator } from './art_rehydrator.js';

const PREFIX = 'underdark_fishing_save_';

export const SaveManager = {
    
    getSaveInfo(slot) {
        try {
            const dataStr = localStorage.getItem(PREFIX + slot);
            if (!dataStr) return null;
            const data = JSON.parse(dataStr);
            
            // Rehydrate just the portrait for the main menu UI
            let portrait = data.player?.identity?.portraitData || "";
            if (!portrait && data.player?.identity?.portraitSeed) {
                const tempPlayer = { identity: { ...data.player.identity } };
                ArtRehydrator.rehydratePlayer(tempPlayer);
                portrait = tempPlayer.identity.portraitData;
            }

            return {
                day: data.gameDay || 1,
                gold: data.player?.vitals?.gold || 0,
                name: data.player?.identity?.name || "Unknown Angler",
                portrait: portrait
            };
        } catch (e) {
            console.error(`[SaveManager] Error reading Save Info for slot ${slot}:`, e);
            return null;
        }
    },

    saveGame(slot, player, worldSeed, globalX, globalY, gameDay, gameTimeMinutes, discoveredNodes =[], nodeEcology = {}, eventData = {}) {
        const saveData = {
            version: '1.4',
            player: player,
            worldSeed: worldSeed,
            globalX: globalX,
            globalY: globalY,
            gameDay: gameDay,
            gameTimeMinutes: gameTimeMinutes,
            discoveredNodes: discoveredNodes,
            nodeEcology: nodeEcology,
            eventData: eventData
        };
        
        // Strip out the massive Base64 Image URLs to prevent localStorage bloat!
        const replacer = (key, value) => {
            if (key === 'imageDataUrl' || key === 'profileDataUrl' || key === 'topDownDataUrl' || key === 'portraitData') {
                return undefined;
            }
            return value;
        };

        try {
            localStorage.setItem(PREFIX + slot, JSON.stringify(saveData, replacer));
            console.log(`💾 Game Saved Successfully to Slot ${slot}.`);
            return true;
        } catch (e) {
            console.error("[SaveManager] Failed to save game:", e);
            return false;
        }
    },

    loadGame(slot) {
        try {
            const dataStr = localStorage.getItem(PREFIX + slot);
            if (!dataStr) return null;
            
            const data = JSON.parse(dataStr);
            
            // Rebuild all pixel art from mathematical seeds
            if (data && data.player) {
                console.log("💧 Rehydrating Procedural Art...");
                ArtRehydrator.rehydratePlayer(data.player);
            }
            
            // Backwards compatibility
            if (!data.discoveredNodes) data.discoveredNodes = [`${data.globalX},${data.globalY}`];
            if (!data.nodeEcology) data.nodeEcology = {};
            
            return data;
        } catch (e) {
            console.error(`[SaveManager] Error loading game for slot ${slot}:`, e);
            return null;
        }
    },

    deleteSave(slot) {
        localStorage.removeItem(PREFIX + slot);
    }
};