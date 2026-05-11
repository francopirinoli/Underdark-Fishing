/**
 * js/util/art_rehydrator.js
 * Automatically rebuilds procedural pixel art from mathematical seeds upon loading a save.
 * Prevents localStorage bloat by eliminating the need to save massive Base64 strings.
 */

import { generateBoatData } from '../data/boat_data_generator.js';
import { generateRodData } from '../data/rod_data_generator.js';
import { generateFishData } from '../data/fish_data_generator.js';
import { generateLure, generateLurePart } from '../art/lure_generator.js';
import { generateChest } from '../art/chest_generator.js';
import { generateNPCData } from '../data/npc_data_generator.js';
import { createRng } from './rng.js';

export const ArtRehydrator = {
    rehydratePlayer(player) {
        if (!player) return;

        // 1. Rehydrate Player Portrait
        if (player.identity && player.identity.portraitSeed) {
            const npc = generateNPCData({ 
                seed: player.identity.portraitSeed, 
                race: player.identity.race, 
                gender: player.identity.gender 
            });
            player.identity.portraitData = npc.imageDataUrl;
        }

        // 2. Rehydrate Equipped Gear (Added Safety Check)
        if (player.gear) {
            if (player.gear.boat) this.rehydrateItem(player.gear.boat);
            if (player.gear.rod) this.rehydrateItem(player.gear.rod);
            if (player.gear.lure) this.rehydrateItem(player.gear.lure);
        }

        // 3. Rehydrate Inventory
        if (player.inventory) {
            player.inventory.forEach(item => this.rehydrateItem(item));
        }

        // 4. Rehydrate Safehouses (Stash, Hangar, Aquarium)
        if (player.safehouses) {
            for (const key in player.safehouses) {
                const sh = player.safehouses[key];
                if (sh.stash) sh.stash.forEach(item => this.rehydrateItem(item));
                if (sh.hangar) sh.hangar.forEach(item => this.rehydrateItem(item));
                if (sh.aquarium) sh.aquarium.forEach(item => this.rehydrateItem(item));
            }
        }

        // 5. Rehydrate Bestiary
        if (player.bestiary) {
            for (const id in player.bestiary) {
                const entry = player.bestiary[id];
                if (entry.speciesData) this.rehydrateItem(entry.speciesData);
            }
        }
    },

    rehydrateItem(item) {
        if (!item) return;

        // Fallback for older saves
        const safeSeed = item.seed || Date.now();

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
                const l = generateLure({ rng, components: item.components ||[] });
                item.imageDataUrl = l.imageDataUrl;
            } 
            else if (item.invType === 'part') {
                const rng = createRng(safeSeed);
                item.imageDataUrl = generateLurePart({ visualId: item.visualId, rng });
            } 
            else if (item.invType === 'chest' || item.invType === 'chest_encounter') {
                const rng = createRng(item.chestSeed || safeSeed);
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