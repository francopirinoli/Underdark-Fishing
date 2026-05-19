/**
 * js/util/art_rehydrator.js
 * Automatically rebuilds procedural pixel art from mathematical seeds upon loading a save.
 */

import { generateBoatData } from '../data/boat_data_generator.js';
import { generateRodData } from '../data/rod_data_generator.js';
import { generateFishData } from '../data/fish_data_generator.js';
import { generateLure, generateLurePart } from '../art/lure_generator.js';
import { generateChest } from '../art/chest_generator.js';
import { generateNPCData } from '../data/npc_data_generator.js';
import { generatePotion } from '../art/potion_generator.js'; // <-- NEW
import { generateBait } from '../art/bait_generator.js';     // <-- NEW
import { createRng } from './rng.js';
import { generateConsumable } from '../art/consumable_generator.js'; // <-- ADD THIS LINE
import { generateUpgrade } from '../art/upgrade_generator.js'; // <-- ADD THIS LINE

export const ArtRehydrator = {
    rehydratePlayer(player) {
        if (!player) return;

        if (player.identity && player.identity.portraitSeed) {
            const npc = generateNPCData({ 
                seed: player.identity.portraitSeed, 
                race: player.identity.race, 
                gender: player.identity.gender 
            });
            player.identity.portraitData = npc.imageDataUrl;
        }

        if (player.gear) {
            if (player.gear.boat) this.rehydrateItem(player.gear.boat);
            if (player.gear.rod) this.rehydrateItem(player.gear.rod);
            if (player.gear.lure) this.rehydrateItem(player.gear.lure);
            if (player.gear.bait) this.rehydrateItem(player.gear.bait); // <-- NEW
        }

        if (player.inventory) player.inventory.forEach(item => this.rehydrateItem(item));
        if (player.reagents) player.reagents.forEach(item => this.rehydrateItem(item)); // <-- NEW

        if (player.safehouses) {
            for (const key in player.safehouses) {
                const sh = player.safehouses[key];
                if (sh.stash) sh.stash.forEach(item => this.rehydrateItem(item));
                if (sh.hangar) sh.hangar.forEach(item => this.rehydrateItem(item));
                if (sh.aquarium) sh.aquarium.forEach(item => this.rehydrateItem(item));
            }
        }

        if (player.bestiary) {
            for (const id in player.bestiary) {
                const entry = player.bestiary[id];
                if (entry.speciesData) this.rehydrateItem(entry.speciesData);
            }
        }
    },

    rehydrateItem(item) {
        if (!item) return;
        const safeSeed = item.seed || item.chestSeed || Date.now();

        try {
            if (item.invType === 'boat' || (item.art && item.art.boatType)) {
                const b = generateBoatData({ seed: safeSeed });
                if (!item.art) item.art = {};
                item.art.profileDataUrl = b.art.profileDataUrl;
                item.art.topDownDataUrl = b.art.topDownDataUrl;
            } 
            else if (item.invType === 'rod' || (item.art && item.art.reel)) {
                const r = generateRodData({ seed: safeSeed });
                if (!item.art) item.art = {};
                item.art.imageDataUrl = r.art.imageDataUrl;
            } 
            else if (item.invType === 'lure') {
                const rng = createRng(safeSeed);
                const l = generateLure({ rng, components: item.components || [] });
                item.imageDataUrl = l.imageDataUrl;
            } 
            // --- NEW: CONSUMABLE REHYDRATION ---
            else if (item.invType === 'consumable') {
                const rng = createRng(safeSeed);
                // Rebuild using the exact ID (e.g., 'cons_repair_kit')
                const c = generateConsumable({ id: item.id, rng, seed: safeSeed });
                item.imageDataUrl = c.imageDataUrl;
            }
            // --- NEW: UPGRADE REHYDRATION ---
            else if (item.invType === 'upgrade') {
                const rng = createRng(safeSeed);
                const u = generateUpgrade({ id: item.id, rng, seed: safeSeed });
                item.imageDataUrl = u.imageDataUrl;
            }

            // --- NEW: POTION REHYDRATION ---
            else if (item.invType === 'potion') {
                const rng = createRng(safeSeed);
                let effectType = 'vigor';
                if (item.components && item.components.length > 0) {
                    const primaryComp = item.components[0];
                    if (['glow_bulb', 'phosphor_cap', 'jelly_bell'].includes(primaryComp)) effectType = 'focus'; 
                    else if (['wraith_silk', 'cave_crawler_leg'].includes(primaryComp)) effectType = 'shadow'; 
                    else if (['rattler_bells', 'spinner'].includes(primaryComp)) effectType = 'silver_tongue'; 
                    else if (['myconid_spore', 'mushroom_stalk'].includes(primaryComp)) effectType = 'insight'; 
                    else if (['bone_dust', 'iron_sinker', 'lead_sinker'].includes(primaryComp)) effectType = 'artisan'; 
                }
                const p = generatePotion({ rng, seed: safeSeed, effectType });
                item.imageDataUrl = p.imageDataUrl;
            }
            // --- NEW: BAIT REHYDRATION ---
            else if (item.invType === 'bait') {
                const rng = createRng(safeSeed);
                const b = generateBait({ rng, seed: safeSeed, components: item.components || [] });
                item.imageDataUrl = b.imageDataUrl;
            }
            else if (item.invType === 'part') {
                const rng = createRng(safeSeed);
                item.imageDataUrl = generateLurePart({ visualId: item.visualId, rng });
            } 
            else if (item.invType === 'chest' || item.invType === 'chest_encounter') {
                const rng = createRng(safeSeed);
                const c = generateChest({ rng, isMimic: false });
                if (!item.art) item.art = {};
                item.art.imageDataUrl = c.imageDataUrl;
                item.imageDataUrl = c.imageDataUrl;
            } 
            else if (item.invType === 'fish' || (item.identity && item.identity.family && !item.invType)) {
                const f = generateFishData({ seed: safeSeed, family: item.identity.family });
                if (!item.art) item.art = {};
                item.art.imageDataUrl = f.art.imageDataUrl;
            }
        } catch (e) {
            console.error(`Failed to rehydrate item: ${item.name}`, e);
        }
    }
};