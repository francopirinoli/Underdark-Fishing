/**
 * js/economy/merchant_generator.js
 * Generates dynamic shop inventories for settlements.
 * Handles consumables, randomized lure components, and equipment generation.
 * V2 - Expanded Boat Upgrades with strict slot assignments and hazard immunities.
 */

import { createRng } from '../util/rng.js';
import { generateRodData } from '../data/rod_data_generator.js';
import { generateBoatData } from '../data/boat_data_generator.js';
import { generateLurePart } from '../art/lure_generator.js';

// --- INVENTORY DATABASES ---

const CONSUMABLES =[
    { id: 'cons_ration', name: 'Cave Rations', type: 'consumable', basePrice: 5, desc: 'Restores food. Prevents starvation while traveling.' },
    { id: 'cons_fuel_oil', name: 'Flask of Oil', type: 'consumable', basePrice: 8, desc: 'Refuels standard lanterns.' },
    { id: 'cons_repair_kit', name: 'Hull Repair Kit', type: 'consumable', basePrice: 25, desc: 'Restores 25 HP to your boat in the field.' }
];

// NEW: Expanded Upgrades with strict Slot assignments and Hazard Immunities
const BOAT_UPGRADES =[
    { id: 'upg_lantern_kero', name: 'Kerosene Lantern', slot: 'lantern', type: 'upgrade', basePrice: 500, desc: 'Increases light radius to 350px.' },
    { id: 'upg_lantern_magic', name: 'Magic Orb Lantern', slot: 'lantern', type: 'upgrade', basePrice: 1500, desc: 'Increases light radius to 500px.' },
    { id: 'upg_cargo_net', name: 'Cargo Netting', slot: 'storage', type: 'upgrade', basePrice: 300, desc: 'Increases boat storage by +10 slots.' },
    { id: 'upg_iron_plating', name: 'Iron Plating', slot: 'plating', type: 'upgrade', basePrice: 800, desc: '+50 Hull HP. Grants immunity to Volcanic boiling waters.' },
    { id: 'upg_acoustic_dampening', name: 'Acoustic Dampening', slot: 'plating', type: 'upgrade', basePrice: 900, desc: '+30% Stealth. Grants immunity to Crystal shatter-storms.' },
    { id: 'upg_overclocked_motor', name: 'Overclocked Motor', slot: 'engine', type: 'upgrade', basePrice: 1200, desc: '+20% Top Speed. Grants immunity to Abyssal whirlpools.' },
    { id: 'upg_alchemical_filter', name: 'Alchemical Filter', slot: 'engine', type: 'upgrade', basePrice: 1100, desc: '+15% Acceleration. Grants immunity to Fungal spore storms.' },
    { id: 'upg_icebreaker_prow', name: 'Icebreaker Prow', slot: 'prow', type: 'upgrade', basePrice: 1000, desc: '-50% Collision Damage. Grants immunity to Frozen ice floes.' }
];

// Master list of all lure parts available to be sold (No Boss/Legendary items allowed in shops)
const LURE_PARTS_POOL =[
    { id: 'part_fish_gut', name: 'Fresh Fish Gut', visualId: 'fish_gut', rarity: 'Common', basePrice: 15 },
    { id: 'part_bone_dust', name: 'Bone Dust', visualId: 'bone_dust', rarity: 'Common', basePrice: 15 },
    { id: 'part_iron_sinker', name: 'Iron Sinker', visualId: 'iron_sinker', rarity: 'Common', basePrice: 20 },
    { id: 'part_cave_crawler', name: 'Cave-Crawler Leg', visualId: 'cave_crawler_leg', rarity: 'Uncommon', basePrice: 45 },
    { id: 'part_lead_sinker', name: 'Lead Sinker', visualId: 'lead_sinker', rarity: 'Uncommon', basePrice: 50 },
    { id: 'part_spinner', name: 'Tin Spinner', visualId: 'spinner', rarity: 'Uncommon', basePrice: 60 },
    { id: 'part_phosphor_cap', name: 'Phosphorescent Cap', visualId: 'phosphor_cap', rarity: 'Rare', basePrice: 150 },
    { id: 'part_wraith_silk', name: 'Wraith Silk', visualId: 'wraith_silk', rarity: 'Rare', basePrice: 200 }
];

export const MerchantGenerator = {
    
    /**
     * Generates a complete store inventory.
     * @param {number} seed - RNG seed for daily restocks.
     * @param {string} biomeId - Current biome (can influence pricing).
     * @param {number} playerBarterLevel - Modifies final pricing (1-10).
     */
    generateInventory(seed, biomeId, playerBarterLevel = 1) {
        const rng = createRng(seed);
        const inventory =[];

        // Base discount based on bartering stat (5% per level, max 50%)
        const discountMultiplier = Math.max(0.5, 1.0 - (playerBarterLevel * 0.05));

        // Helper to format an item for the shop
        const formatItem = (item, stock) => {
            // Add a little RNG fuzz to the base price before discount
            const fuzzedPrice = item.basePrice * rng.float(0.9, 1.1);
            const finalPrice = Math.max(1, Math.round(fuzzedPrice * discountMultiplier));
            
            return {
                ...item,
                price: finalPrice,
                stock: stock
            };
        };

        // 1. Guaranteed Consumables (Infinite or high stock)
        CONSUMABLES.forEach(c => {
            inventory.push(formatItem(c, 99)); // 99 represents infinite stock
        });

        // 2. Randomized Lure Parts
        const numParts = rng.int(3, 6);
        // Shuffle the pool
        const shuffledParts =[...LURE_PARTS_POOL].sort(() => rng.float(-1, 1));
        
        for (let i = 0; i < numParts; i++) {
            const part = shuffledParts[i];
            const stock = part.rarity === 'Common' ? rng.int(3, 8) : 
                          part.rarity === 'Uncommon' ? rng.int(1, 3) : 1;
            
            // Generate standard merchant formatting
            const formattedPart = formatItem(part, stock);
            
            // Assign dummy stats to the merchant parts
            formattedPart.stats = { 
                color: rng.int(-20, 20), sound: rng.int(-20, 20), 
                light: rng.int(-20, 20), weight: rng.int(-20, 20) 
            };
            
            // Generate Art!
            formattedPart.imageDataUrl = generateLurePart({ visualId: part.visualId, rng });

            inventory.push(formattedPart);
        }

        // 3. Equipment (Rods)
        const numRods = rng.int(1, 3);
        for (let i = 0; i < numRods; i++) {
            const rodData = generateRodData({ seed: rng.next() * 100000 });
            // Force merchants to rarely sell Legendary gear
            if (rodData.identity.rarity === 'Legendary' && !rng.chance(0.05)) continue; 
            
            inventory.push({
                id: rodData.id,
                name: rodData.identity.name,
                type: 'rod',
                itemData: rodData, // Stores the full object for equipping
                price: Math.max(1, Math.round(rodData.economy.value * discountMultiplier)),
                stock: 1,
                desc: `Power: ${rodData.stats.power}x | Tension: ${rodData.stats.maxTension}`
            });
        }

        // 4. Equipment (Boats) - Very rare to find boats at standard merchants, maybe 1
        if (rng.chance(0.4)) {
            const boatData = generateBoatData({ seed: rng.next() * 100000 });
            if (boatData.identity.rarity !== 'Legendary') { // Never sell legendary boats
                inventory.push({
                    id: boatData.id,
                    name: boatData.identity.name,
                    type: 'boat',
                    itemData: boatData,
                    price: Math.max(1, Math.round(boatData.economy.value * discountMultiplier)),
                    stock: 1,
                    desc: `Type: ${boatData.art.boatType.toUpperCase()} | HP: ${boatData.stats.hp}`
                });
            }
        }

        // 5. Boat Upgrades (Increased to 2-4 available per shop for better access to hazard immunities)
        const numUpgrades = rng.int(2, 4);
        const shuffledUpgrades = [...BOAT_UPGRADES].sort(() => rng.float(-1, 1));
        for (let i = 0; i < numUpgrades; i++) {
            inventory.push(formatItem(shuffledUpgrades[i], 1));
        }

        return inventory;
    }
};