/**
 * js/data/fish_dissection.js
 * Handles extracting lure components and knowledge from a caught fish.
 */

import { createRng } from '../util/rng.js';
import { generateLurePart } from '../art/lure_generator.js'; // <-- NEW IMPORT

// Base budgets based on fish rarity
const RARITY_BUDGETS = {
    'Common': 30,
    'Uncommon': 40,
    'Rare': 50,
    'Legendary': 75,
    'Boss': 100
};

// Maps fish families to the types of visual components they might drop
const FAMILY_DROPS = {
    'fish': ['fish_gut', 'bone_dust', 'spinner'],
    'ray': ['fish_gut', 'bone_dust', 'wraith_silk'],
    'shark':['bone_dust', 'rat_tail', 'iron_sinker'],
    'cephalopod':['wraith_silk', 'jelly_bell', 'glow_bulb'],
    'crustacean':['cave_crawler_leg', 'lead_sinker', 'bone_dust'],
    'deepsea':['glow_bulb', 'rattler_bells', 'bone_dust', 'wraith_silk'],
    'eel':['rat_tail', 'chilifish_oil', 'wraith_silk'],
    'jellyfish':['jelly_bell', 'phosphor_cap', 'myconid_spore']
};

export const DissectionEngine = {
    
    /**
     * Dissects a fish, yielding parts and knowledge.
     * @param {Object} fish - The fish data object.
     * @param {number} lureCraftingLevel - Player stat (1 to 5).
     * @param {number} seed - RNG seed for determinism.
     */
    dissect(fish, lureCraftingLevel = 1, seed = Date.now()) {
        const rng = createRng(seed);
        
        // 1. Calculate Knowledge Gain (XP towards unlocking this fish's stats)
        const knowledgeGain = {
            'Common': 10, 'Uncommon': 20, 'Rare': 40, 'Legendary': 70, 'Boss': 100
        }[fish.identity.rarity];

        // 2. Determine Part Yield (Massive fish drop more parts)
        let numParts = 1;
        const size = fish.physical.sizeTier;
        if (size === 'Medium') numParts = rng.pick([1, 2]);
        if (size === 'Large') numParts = rng.pick([2, 3]);
        if (size === 'Massive') numParts = rng.pick([3, 4]);

        const parts =[];
        
        for (let i = 0; i < numParts; i++) {
            // Calculate base budget and apply LureCrafting multiplier (+10% per level)
            const baseBudget = RARITY_BUDGETS[fish.identity.rarity];
            const multiplier = 1 + (lureCraftingLevel * 0.1);
            let totalBudget = Math.floor(baseBudget * multiplier);

            // Determine visual ID
            const visualId = rng.pick(FAMILY_DROPS[fish.identity.family]);

            // Distribute the budget across 1 to 3 random stats
            const statsToBoost = rng.int(1, 3);
            const partStats = { color: 0, sound: 0, light: 0, weight: 0 };
            const statKeys = rng.pick([
                ['color', 'weight'], ['sound', 'light'],['weight'], 
                ['light', 'color', 'sound'], ['weight', 'sound']
            ]); // Random pairings of stats to apply budget to

            // Allocate budget points
            for (let j = 0; j < statKeys.length; j++) {
                const key = statKeys[j];
                // Give it a chunk of the remaining budget
                const allocation = (j === statKeys.length - 1) ? totalBudget : rng.int(Math.floor(totalBudget * 0.3), Math.floor(totalBudget * 0.7));
                totalBudget -= allocation;
                
                // Determine polarity (+ or -). We loosely base this on the fish's own preferences
                // so a deep-sea horror naturally drops dark/heavy parts.
                const polarity = fish.lurePrefs[key] < 0 ? -1 : 1;
                partStats[key] = allocation * polarity;
            }

            // --- NEW: Calculate Part Value ---
            const PART_PRICES = { 'Common': 10, 'Uncommon': 25, 'Rare': 60, 'Legendary': 150, 'Boss': 300 };

            parts.push({
                id: `part_${rng.int(10000, 99999)}`,
                name: `${fish.identity.rarity} ${visualId.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}`,
                visualId: visualId,
                rarity: fish.identity.rarity,
                stats: partStats,
                basePrice: PART_PRICES[fish.identity.rarity],
                imageDataUrl: generateLurePart({ visualId: visualId, rng: rng }) // <-- GENERATES ART HERE
            });
        }

        return {
            knowledgeGain,
            parts
        };
    }
};