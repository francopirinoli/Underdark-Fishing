/**
 * js/fishing/lure_crafter.js
 * Combines Lure Parts into a final, usable Lure.
 */

import { generateLure } from '../art/lure_generator.js';
import { createRng } from '../util/rng.js';

const RARITY_DURABILITY = {
    'Common': 2, 'Uncommon': 3, 'Rare': 5, 'Legendary': 8, 'Boss': 12
};

export const LureCrafter = {
    
    /**
     * @param {Array} parts - Array of LurePart objects (must be 3 to 5 parts).
     * @param {number} lureCraftingLevel - Player stat (1 to 5).
     * @param {number} seed - RNG seed.
     */
    craft(parts, craftingLevel = 1, seed = Date.now()) {
        if (parts.length < 3 || parts.length > 5) {
            console.error("Lures must be crafted with 3 to 5 parts.");
            return null;
        }

        let totalColor = 0;
        let totalSound = 0;
        let totalLight = 0;
        let totalWeight = 0;
        let baseDurability = 0;

        const visualIds =[];

        // 1. Sum all stats from parts
        for (const part of parts) {
            totalColor += part.stats.color;
            totalSound += part.stats.sound;
            totalLight += part.stats.light;
            totalWeight += part.stats.weight;
            
            baseDurability += RARITY_DURABILITY[part.rarity];
            visualIds.push(part.visualId);
        }

        // 2. Strict Clamping[-100, 100]
        const clamp = (val) => Math.max(-100, Math.min(100, val));
        const finalStats = {
            color: clamp(totalColor),
            sound: clamp(totalSound),
            light: clamp(totalLight),
            weight: clamp(totalWeight)
        };

        // 3. Calculate Durability (+10% per LureCrafting level)
        const multiplier = 1 + (craftingLevel * 0.1);
        const finalDurability = Math.floor(baseDurability * multiplier);

        // --- NEW: Calculate Lure Value ---
        // --- ECONOMY FIX: Value-Added Crafting ---
        let totalPartValue = 0;
        parts.forEach(p => totalPartValue += (p.basePrice || 5));
        
        // FIX: Changed lureCraftingLevel to craftingLevel
        const finalValue = Math.floor(totalPartValue * 1.5 * (1 + craftingLevel * 0.1));

// 4. Generate Pixel Art
        const rng = createRng(seed);
        const art = generateLure({ rng: rng, components: visualIds });

        return {
            id: `lure_${rng.int(10000, 99999)}`,
            invType: 'lure',             // <-- ADD THIS LINE
            seed: seed,                  
            components: visualIds,       
            name: art.name,
            imageDataUrl: art.imageDataUrl,
            stats: finalStats,
            durability: finalDurability,
            maxDurability: finalDurability,
            componentsUsed: parts.length,
            basePrice: finalValue
        };
    }
};