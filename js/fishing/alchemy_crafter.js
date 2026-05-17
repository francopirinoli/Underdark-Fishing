/**
 * js/fishing/alchemy_crafter.js
 * Calculates stats for Potions and Baits based on the ingredients used.
 */

import { generatePotion } from '../art/potion_generator.js';
import { generateBait } from '../art/bait_generator.js';
import { createRng } from '../util/rng.js';

const RARITY_VALUES = {
    'Common': 1, 'Uncommon': 2, 'Rare': 3, 'Legendary': 5, 'Boss': 8
};

export const AlchemyCrafter = {
    
    craftPotion(parts, craftingLevel = 1, seed = Date.now()) {
        if (parts.length < 3 || parts.length > 5) return null;
        
        const primaryComp = parts[0].visualId;
        const visualIds = parts.map(p => p.visualId);
        
        let totalRarity = 0;
        parts.forEach(p => totalRarity += RARITY_VALUES[p.rarity]);

        // 1. Determine Stat Buff based on Primary Ingredient
        let targetStat = 'stamina';
        let statName = 'Stamina';
        let effectType = 'vigor'; 

        if (['glow_bulb', 'phosphor_cap', 'jelly_bell'].includes(primaryComp)) { 
            targetStat = 'fishing'; statName = 'Fishing'; effectType = 'focus'; 
        }
        else if (['wraith_silk', 'cave_crawler_leg'].includes(primaryComp)) { 
            targetStat = 'driving'; statName = 'Driving'; effectType = 'shadow'; 
        }
        else if (['rattler_bells', 'spinner'].includes(primaryComp)) { 
            targetStat = 'bartering'; statName = 'Bartering'; effectType = 'silver_tongue'; 
        }
        else if (['myconid_spore', 'mushroom_stalk'].includes(primaryComp)) { 
            targetStat = 'intelligence'; statName = 'Intelligence'; effectType = 'insight'; 
        }
        else if (['bone_dust', 'iron_sinker', 'lead_sinker'].includes(primaryComp)) { 
            targetStat = 'crafting'; // <-- WAS lureCrafting
            statName = 'Crafting';   // <-- WAS Lure Crafting
            effectType = 'artisan'; 
        }
        // Fallback for fish_gut, rat_tail, chilifish_oil = Vigor (Stamina)

        // 2. Math for Duration & Potency
        const baseDuration = 1 + (totalRarity * 0.5);
        const durationMins = Math.floor(baseDuration * 60 * (1 + (craftingLevel * 0.1)));
        const potency = 1 + Math.floor(totalRarity / 4);

        const rng = createRng(seed);
        
        // Pass the effectType to the generator so it knows what color to make it
        const art = generatePotion({ rng, seed, effectType });

        const basePrice = Math.floor((parts.length * 15) + (totalRarity * 15) * (1 + craftingLevel * 0.1));

        return {
            id: `potion_${rng.int(10000, 99999)}`,
            invType: 'potion',
            seed: seed,
            components: visualIds,
            name: art.name,
            imageDataUrl: art.imageDataUrl,
            itemData: art.itemData,
            buff: {
                stat: targetStat,
                statName: statName,
                amount: potency,
                durationMins: durationMins,
                maxDurationMins: durationMins // <-- NEW: Stores the 100% value
            },
            basePrice: basePrice
        };
    },

    craftBait(parts, craftingLevel = 1, seed = Date.now()) {
        if (parts.length < 3 || parts.length > 5) return null;
        
        const visualIds = parts.map(p => p.visualId);
        
        let totalRarity = 0;
        parts.forEach(p => totalRarity += RARITY_VALUES[p.rarity]);

        // 1. Math for Charges & Rarity Boost
        // Charges: 5 base + 1 per rarity point + 10% per crafting level
        const charges = Math.floor((5 + totalRarity) * (1 + (craftingLevel * 0.1)));

        // Rarity Boost: Base 5% chance + 3% per rarity point
        const rarityBoostPct = Math.min(100, 5 + (totalRarity * 3));

        const rng = createRng(seed);
        
        // Pass components to bait generator so it picks the right container and target family
        const art = generateBait({ rng, seed, components: visualIds });

        const basePrice = Math.floor((parts.length * 15) + (totalRarity * 12) * (1 + craftingLevel * 0.1));

        return {
            id: `bait_${rng.int(10000, 99999)}`,
            invType: 'bait',
            seed: seed,
            components: visualIds,
            name: art.name,
            imageDataUrl: art.imageDataUrl,
            itemData: art.itemData,
            charges: charges,
            maxCharges: charges,
            rarityBoostPct: rarityBoostPct,
            targetFamily: art.itemData.targetFamily,
            targetFamilyIds: art.itemData.targetFamilyIds, // <-- ADDED THIS LINE
            basePrice: basePrice
        };
    }
};