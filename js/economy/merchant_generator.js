/**
 * js/economy/merchant_generator.js
 * Generates dynamic shop inventories for settlements.
 * V4 - Split into Vendor Specializations and implemented Barter Luck Rarity Scaling.
 */

import { createRng } from '../util/rng.js';
import { generateRodData } from '../data/rod_data_generator.js';
import { generateBoatData } from '../data/boat_data_generator.js';
import { generateLurePart } from '../art/lure_generator.js';
import { generateConsumable } from '../art/consumable_generator.js';
import { AlchemyCrafter } from '../fishing/alchemy_crafter.js';
import { LureCrafter } from '../fishing/lure_crafter.js';

// --- INVENTORY DATABASES ---
const CONSUMABLES = [
    { id: 'cons_ration', name: 'Cave Rations', type: 'consumable', basePrice: 5, desc: 'Restores food. Prevents starvation while traveling.' },
    { id: 'cons_fuel_oil', name: 'Flask of Oil', type: 'consumable', basePrice: 8, desc: 'Refuels standard lanterns.' },
    { id: 'cons_repair_kit', name: 'Hull Repair Kit', type: 'consumable', basePrice: 50, desc: 'Restores 25 HP to your boat in the field.' }
];

const BOAT_UPGRADES = [
    { id: 'upg_lantern_kero', name: 'Kerosene Lantern', slot: 'lantern', type: 'upgrade', basePrice: 500, desc: 'Increases light radius to 350px.' },
    { id: 'upg_lantern_magic', name: 'Magic Orb Lantern', slot: 'lantern', type: 'upgrade', basePrice: 1500, desc: 'Increases light radius to 500px.' },
    { id: 'upg_cargo_net', name: 'Cargo Netting', slot: 'storage', type: 'upgrade', basePrice: 300, desc: 'Increases boat storage by +10 slots.' },
    { id: 'upg_iron_plating', name: 'Iron Plating', slot: 'plating', type: 'upgrade', basePrice: 800, desc: '+50 Hull HP. Grants immunity to Volcanic boiling waters.' },
    { id: 'upg_acoustic_dampening', name: 'Acoustic Dampening', slot: 'plating', type: 'upgrade', basePrice: 900, desc: '+30% Stealth. Grants immunity to Crystal shatter-storms.' },
    { id: 'upg_overclocked_motor', name: 'Overclocked Motor', slot: 'engine', type: 'upgrade', basePrice: 1200, desc: '+20% Top Speed. Grants immunity to Abyssal whirlpools.' },
    { id: 'upg_alchemical_filter', name: 'Alchemical Filter', slot: 'engine', type: 'upgrade', basePrice: 1100, desc: '+15% Acceleration. Grants immunity to Fungal spore storms.' },
    { id: 'upg_icebreaker_prow', name: 'Icebreaker Prow', slot: 'prow', type: 'upgrade', basePrice: 1000, desc: '-50% Collision Damage. Grants immunity to Frozen ice floes.' }
];

const LURE_PARTS_POOL = [
    { id: 'part_fish_gut', name: 'Fresh Fish Gut', visualId: 'fish_gut', rarity: 'Common', basePrice: 15 },
    { id: 'part_bone_dust', name: 'Bone Dust', visualId: 'bone_dust', rarity: 'Common', basePrice: 15 },
    { id: 'part_iron_sinker', name: 'Iron Sinker', visualId: 'iron_sinker', rarity: 'Common', basePrice: 20 },
    { id: 'part_rat_tail', name: 'Rat Tail', visualId: 'rat_tail', rarity: 'Common', basePrice: 20 },
    { id: 'part_mushroom_stalk', name: 'Mushroom Stalk', visualId: 'mushroom_stalk', rarity: 'Uncommon', basePrice: 35 },
    { id: 'part_cave_crawler', name: 'Cave-Crawler Leg', visualId: 'cave_crawler_leg', rarity: 'Uncommon', basePrice: 45 },
    { id: 'part_lead_sinker', name: 'Lead Sinker', visualId: 'lead_sinker', rarity: 'Uncommon', basePrice: 50 },
    { id: 'part_spinner', name: 'Tin Spinner', visualId: 'spinner', rarity: 'Uncommon', basePrice: 60 },
    { id: 'part_glow_bulb', name: 'Glow Bulb', visualId: 'glow_bulb', rarity: 'Uncommon', basePrice: 55 },
    { id: 'part_rattler_bells', name: 'Rattler Bells', visualId: 'rattler_bells', rarity: 'Uncommon', basePrice: 65 },
    { id: 'part_phosphor_cap', name: 'Phosphorescent Cap', visualId: 'phosphor_cap', rarity: 'Rare', basePrice: 150 },
    { id: 'part_wraith_silk', name: 'Wraith Silk', visualId: 'wraith_silk', rarity: 'Rare', basePrice: 200 },
    { id: 'part_myconid_spore', name: 'Myconid Spore', visualId: 'myconid_spore', rarity: 'Rare', basePrice: 160 },
    { id: 'part_jelly_bell', name: 'Jelly Bell', visualId: 'jelly_bell', rarity: 'Rare', basePrice: 180 }
];


export const MerchantGenerator = {

    // --- 1. THE MERCHANT (GENERAL STORE) ---
    getMerchantStock(seed, biomeId, playerBarterLevel = 1) {
        const rng = createRng(seed);
        const inventory = [];
        
        // ECONOMY FIX: Level 1 = 1.4x markup. Level 5 = 1.0x (No markup!)
        const buyMult = Math.max(1.0, 1.5 - (playerBarterLevel * 0.1));

        // A. Consumables
        CONSUMABLES.forEach((c, idx) => {
            const formatted = this._formatStoreItem(c, 99, buyMult, rng);
            formatted.imageDataUrl = generateConsumable({ id: c.id, rng: createRng(seed + idx) }).imageDataUrl;
            formatted.invType = 'consumable';
            inventory.push(formatted);
        });

        // B. Pre-Crafted Alchemy & Lures (Dynamically Generated)
        const craftLvl = Math.max(1, Math.floor(playerBarterLevel / 2) + 1);
        const types = ['lure', 'potion', 'bait'];
        types.forEach((t) => {
            const numToMake = rng.int(1, 2);
            for(let j = 0; j < numToMake; j++) {
                const item = this._createRandomCraftedItem(t, createRng(rng.next() * 1000000), craftLvl);
                if (item) {
                    const storeItem = this._formatStoreItem(item, 1, buyMult, rng);
                    storeItem.type = t;
                    // Add desc for the shop UI
                    if (t === 'potion') storeItem.desc = `Grants +${item.buff.amount} ${item.buff.statName}`;
                    else if (t === 'bait') storeItem.desc = `Attracts: ${item.targetFamily}`;
                    else if (t === 'lure') storeItem.desc = `Durability: ${item.durability} Casts`;
                    inventory.push(storeItem);
                }
            }
        });

        // C. Fishing Rods
        const numRods = rng.int(1, 3) + (playerBarterLevel >= 4 ? 1 : 0);
        let attempts = 0;
        let spawnedRods = 0;
        while(spawnedRods < numRods && attempts < 20) {
            attempts++;
            const rod = generateRodData({ seed: rng.next() * 100000 });
            
            // Barter Luck: Filters out Legendaries if barter is too low, and filters out Commons if barter is high
            if (rod.identity.rarity === 'Legendary' && (playerBarterLevel < 4 || !rng.chance(0.15))) continue;
            if (rod.identity.rarity === 'Common' && playerBarterLevel >= 3 && rng.chance(0.6)) continue;
            
            inventory.push({
                id: rod.id,
                name: rod.identity.name,
                type: 'rod',
                itemData: rod,
                price: Math.max(1, Math.round(rod.economy.value * buyMult)),
                stock: 1,
                desc: `Power: ${rod.stats.power}x | Tension: ${rod.stats.maxTension}`
            });
            spawnedRods++;
        }

        return inventory;
    },

// --- 2. THE FISHMONGER (ORGANIC PARTS) ---
    getFishmongerStock(seed, biomeId, playerBarterLevel = 1) {
        const rng = createRng(seed);
        const inventory = [];
        
        // ECONOMY FIX: Level 1 = 1.4x markup. Level 5 = 1.0x (No markup!)
        const buyMult = Math.max(1.0, 1.5 - (playerBarterLevel * 0.1));

        const numParts = rng.int(4, 8) + Math.floor(playerBarterLevel / 2);
        for (let i = 0; i < numParts; i++) {
            
            let rareChance = 10 + (playerBarterLevel * 6); 
            let uncChance = 30 + (playerBarterLevel * 4);  
            
            const roll = rng.int(1, 100);
            let targetRarity = 'Common';
            if (roll <= rareChance) targetRarity = 'Rare';
            else if (roll <= rareChance + uncChance) targetRarity = 'Uncommon';

            const candidates = LURE_PARTS_POOL.filter(p => p.rarity === targetRarity);
            const part = rng.pick(candidates.length > 0 ? candidates : LURE_PARTS_POOL);
            
            const stock = part.rarity === 'Common' ? rng.int(3, 8) : 
                          part.rarity === 'Uncommon' ? rng.int(1, 4) : rng.int(1, 2);

            const formattedPart = this._formatStoreItem(part, stock, buyMult, rng);
            formattedPart.stats = { 
                color: rng.int(-20, 20), sound: rng.int(-20, 20), 
                light: rng.int(-20, 20), weight: rng.int(-20, 20) 
            };
            formattedPart.imageDataUrl = generateLurePart({ visualId: part.visualId, rng: createRng(rng.next()*10000) });
            formattedPart.type = 'part';
            formattedPart.invType = 'part';
            
            inventory.push(formattedPart);
        }
        return inventory;
    },

    // --- 3. THE BOATWRIGHT (SHIPYARD) ---
    getBoatwrightStock(seed, biomeId, playerBarterLevel = 1) {
        const rng = createRng(seed);
        const inventory = [];
        
        const buyMult = Math.max(1.0, 1.5 - (playerBarterLevel * 0.1));

        // A. Boats
        const numBoats = rng.chance(0.5 + playerBarterLevel * 0.1) ? rng.int(1, 2) : 0;
        let attempts = 0;
        let spawnedBoats = 0;
        while(spawnedBoats < numBoats && attempts < 20) {
            attempts++;
            const boat = generateBoatData({ seed: rng.next() * 100000 });
            if (boat.identity.rarity === 'Legendary' && (playerBarterLevel < 5 || !rng.chance(0.1))) continue;
            
            inventory.push({
                id: boat.id,
                name: boat.identity.name,
                type: 'boat',
                itemData: boat,
                price: Math.max(1, Math.round(boat.economy.value * buyMult)),
                stock: 1,
                desc: `Type: ${boat.art.boatType.toUpperCase()} | HP: ${boat.stats.hp}`
            });
            spawnedBoats++;
        }

        // B. Upgrades
        const numUpgrades = rng.int(2, 4) + Math.floor(playerBarterLevel / 2);
        const shuffledUpgrades = [...BOAT_UPGRADES].sort(() => rng.float(-1, 1));
        for (let i = 0; i < Math.min(numUpgrades, shuffledUpgrades.length); i++) {
            const upg = this._formatStoreItem(shuffledUpgrades[i], 1, buyMult, rng);
            upg.invType = 'upgrade';
            inventory.push(upg);
        }

        return inventory;
    },

    // --- 4. THE WANDERING FISHERMAN (LOCAL MAP) ---
    getWanderingStock(seed, biomeId, playerBarterLevel = 1) {
        const merchantStock = this.getMerchantStock(seed, biomeId, playerBarterLevel);
        const partsStock = this.getFishmongerStock(seed + 1, biomeId, playerBarterLevel);
        
        // Grab a curated mix of parts, a rod, and a potion/bait
        const inv = [];
        inv.push(...merchantStock.filter(i => i.type === 'rod').slice(0, 1));
        inv.push(...merchantStock.filter(i => i.type === 'potion' || i.type === 'bait').slice(0, 2));
        inv.push(...partsStock.slice(0, 3));
        return inv;
    },

    // --- TEMPORARY SHIM (Prevents crashing until Step 2 is complete) ---
    generateInventory(seed, biomeId, playerBarterLevel = 1) {
        return [
            ...this.getMerchantStock(seed, biomeId, playerBarterLevel),
            ...this.getFishmongerStock(seed + 1, biomeId, playerBarterLevel),
            ...this.getBoatwrightStock(seed + 2, biomeId, playerBarterLevel)
        ];
    },

    // --- INTERNAL HELPERS ---
    _formatStoreItem(itemObj, stock, buyMultiplier, rng) {
        const base = itemObj.basePrice || (itemObj.economy ? itemObj.economy.value : 10);
        const fuzzed = base * rng.float(0.9, 1.1);
        return {
            ...itemObj,
            price: Math.max(1, Math.round(fuzzed * buyMultiplier)),
            stock: stock
        };
    },

    _createRandomCraftedItem(type, rng, craftLvl) {
        const numParts = rng.int(3, 5);
        const parts = [];
        for(let p = 0; p < numParts; p++) {
            const poolPart = rng.pick(LURE_PARTS_POOL);
            parts.push({
                visualId: poolPart.visualId,
                rarity: poolPart.rarity,
                stats: { color: rng.int(-20,20), sound: rng.int(-20,20), light: rng.int(-20,20), weight: rng.int(-20,20) }
            });
        }
        let item;
        if (type === 'potion') item = AlchemyCrafter.craftPotion(parts, craftLvl, rng.next()*100000);
        else if (type === 'bait') item = AlchemyCrafter.craftBait(parts, craftLvl, rng.next()*100000);
        else item = LureCrafter.craft(parts, craftLvl, rng.next()*100000);
        
        if (item) item.invType = type;
        return item;
    }
};