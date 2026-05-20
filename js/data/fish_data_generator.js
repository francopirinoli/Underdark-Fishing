/**
 * js/data/fish_data_generator.js
 * The Master Fish Data Factory.
 * Wraps procedural pixel art in a comprehensive, mathematically balanced gameplay stat block.
 * V4 - The "Goldilocks" Balance: Firm but fair rarity scaling and aggression metrics.
 */

import { createRng } from '../util/rng.js';

// Import all 8 art generators
import { generateStandardFish } from '../art/fish_generator.js';
import { generateRay } from '../art/ray_generator.js';
import { generateShark } from '../art/shark_generator.js';
import { generateCephalopod } from '../art/cephalopod_generator.js';
import { generateCrustacean } from '../art/crustacean_generator.js';
import { generateDeepSea } from '../art/deepsea_generator.js';
import { generateEel } from '../art/eel_generator.js';
import { generateJellyfish } from '../art/jellyfish_generator.js';

const ART_GENERATORS = {
    'fish': generateStandardFish,
    'ray': generateRay,
    'shark': generateShark,
    'cephalopod': generateCephalopod,
    'crustacean': generateCrustacean,
    'deepsea': generateDeepSea,
    'eel': generateEel,
    'jellyfish': generateJellyfish
};

// --- RARITY MULTIPLIERS ---
// V5: Softened Stamina multipliers so rare fish aren't endurance sponges
const RARITY_TIERS =[
    { name: 'Common',    weight: 50, stamMult: 1.0, speedMult: 1.0,  weightMult: 1.0, valBase: 10,  xpBase: 5,   tolerance: 0.80, hookMod: 1.0 },
    { name: 'Uncommon',  weight: 30, stamMult: 1.2, speedMult: 1.1,  weightMult: 1.4, valBase: 35,  xpBase: 10,  tolerance: 0.60, hookMod: 0.8 }, 
    { name: 'Rare',      weight: 14, stamMult: 1.8, speedMult: 1.2,  weightMult: 2.2, valBase: 120, xpBase: 25,  tolerance: 0.40, hookMod: 0.6 }, 
    { name: 'Legendary', weight: 5,  stamMult: 2.5, speedMult: 1.3,  weightMult: 3.5, valBase: 500, xpBase: 50,  tolerance: 0.25, hookMod: 0.45 },
    { name: 'Boss',      weight: 1,  stamMult: 3.5, speedMult: 1.4,  weightMult: 6.0, valBase: 2500,xpBase: 100, tolerance: 0.15, hookMod: 0.30 } 
];

// --- FAMILY ARCHETYPES (Base Stats before Rarity scaling) ---
// V5: Lowered base stamina across all families
const ARCHETYPES = {
    'fish': {
        sizes:['Tiny', 'Small', 'Medium', 'Large'], depths:['Surface', 'Mid-water', 'Bottom-feeder'],
        baseStamina: 45, baseSpeed: 50, baseAggro: 0.35, optimalReelRange: [40, 60],
        baseValueMod: 1.0, prefBias: { color: 0, sound: 0, light: 0, weight: 0 } 
    },
    'shark': {
        sizes: ['Medium', 'Large', 'Massive'], depths:['Surface', 'Mid-water'],
        baseStamina: 40, baseSpeed: 100, baseAggro: 0.85, optimalReelRange: [75, 95], 
        baseValueMod: 1.4, prefBias: { color: 70, sound: 80, light: 10, weight: 20 } 
    },
    'eel': {
        sizes: ['Small', 'Medium', 'Large'], depths:['Bottom-feeder'],
        baseStamina: 90, baseSpeed: 40, baseAggro: 0.25, optimalReelRange:[25, 45], 
        baseValueMod: 0.9, prefBias: { color: -40, sound: -80, light: -50, weight: 60 } 
    },
    'ray': {
        sizes: ['Medium', 'Large', 'Massive'], depths:['Bottom-feeder'],
        baseStamina: 65, baseSpeed: 50, baseAggro: 0.35, optimalReelRange:[30, 50],
        baseValueMod: 1.1, prefBias: { color: 0, sound: -40, light: 0, weight: 80 } 
    },
    'crustacean': {
        sizes: ['Tiny', 'Small', 'Medium'], depths:['Bottom-feeder'],
        baseStamina: 95, baseSpeed: 30, baseAggro: 0.55, optimalReelRange:[15, 30], 
        baseValueMod: 1.4, prefBias: { color: -20, sound: 0, light: -20, weight: 90 } 
    },
    'jellyfish': {
        sizes: ['Tiny', 'Small', 'Medium'], depths:['Surface', 'Mid-water'],
        baseStamina: 35, baseSpeed: 35, baseAggro: 0.25, optimalReelRange:[10, 30], 
        baseValueMod: 0.6, prefBias: { color: 0, sound: -90, light: 80, weight: -80 } 
    },
    'cephalopod': {
        sizes: ['Small', 'Medium', 'Large'], depths:['Mid-water', 'Bottom-feeder'],
        baseStamina: 60, baseSpeed: 65, baseAggro: 0.55, optimalReelRange:[45, 65],
        baseValueMod: 1.2, prefBias: { color: -60, sound: -50, light: 0, weight: 10 } 
    },
    'deepsea': {
        sizes:['Medium', 'Large', 'Massive'], depths: ['Bottom-feeder'],
        baseStamina: 80, baseSpeed: 75, baseAggro: 0.75, optimalReelRange:[50, 85], 
        baseValueMod: 1.6, prefBias: { color: -80, sound: 50, light: -90, weight: 70 } 
    }
};

// --- BIOME TEMPERATURE MAPPING ---
const BIOME_TEMPS = {
    'frozen':   { min: -100, max: -40 },
    'abyssal':  { min: -80,  max: -10 },
    'crystal':  { min: -30,  max: 20 },
    'fungal':   { min: 10,   max: 50 },
    'volcanic': { min: 60,   max: 100 }
};

const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

/**
 * Generates the BASE SPECIES archetype.
 * This represents the biological template, completely decoupled from Rarity.
 */
export function generateFishData(options = {}) {
    const seed = options.seed || Date.now();
    
    // --- BUG 1 FIX: Isolate RNGs so rehydration never desyncs the sequence ---
    const metaRng = createRng(seed + 1); // Used for Family & Biome
    const artRng = createRng(seed + 2);  // Used strictly for pixel art
    const statRng = createRng(seed + 3); // Used for combat & economy stats

    let availableFamilies = Object.keys(ART_GENERATORS);
    if (options.biomeId && options.biomeId !== 'abyssal') {
        availableFamilies = availableFamilies.filter(f => f !== 'deepsea');
    }
    const family = options.family || metaRng.pick(availableFamilies);
    const arch = ARCHETYPES[family];

    const artResult = ART_GENERATORS[family]({ rng: artRng });

    let biomes =[];
    if (family === 'deepsea') {
        biomes.push('abyssal');
    } else if (options.biomeId) {
        biomes.push(options.biomeId);
        if (metaRng.chance(0.3)) {
            const sec = metaRng.pick(Object.keys(BIOME_TEMPS));
            if (sec !== options.biomeId) biomes.push(sec);
        }
    } else {
        biomes.push(metaRng.pick(Object.keys(BIOME_TEMPS)));
    }

    const primaryBiome = biomes[0];
    const tempPref = statRng.int(BIOME_TEMPS[primaryBiome].min, BIOME_TEMPS[primaryBiome].max);
    const depthPref = statRng.pick(arch.depths);
    const activeHours = statRng.pick(['Diurnal', 'Nocturnal', 'Crepuscular', 'Always Active']);

    const prefColor = clamp(Math.round(arch.prefBias.color + statRng.float(-30, 30)), -100, 100);
    const prefSound = clamp(Math.round(arch.prefBias.sound + statRng.float(-30, 30)), -100, 100);
    const prefLight = clamp(Math.round(arch.prefBias.light + statRng.float(-30, 30)), -100, 100);
    const prefWeight = clamp(Math.round(arch.prefBias.weight + statRng.float(-30, 30)), -100, 100);

    const sizeTier = statRng.pick(arch.sizes);
    const weightBrackets = {
        'Tiny': { min: 0.1, max: 2.5 }, 'Small': { min: 2.0, max: 8.0 },
        'Medium': { min: 7.0, max: 25.0 }, 'Large': { min: 20.0, max: 150.0 }, 'Massive': { min: 120.0, max: 800.0 }
    };
    
    let minW = weightBrackets[sizeTier].min;
    let maxW = weightBrackets[sizeTier].max;

    const stamina = Math.round(arch.baseStamina * statRng.float(1, 1.5));
    const speed = Math.round(arch.baseSpeed * statRng.float(0.85, 1.15));
    let aggression = Number(clamp(arch.baseAggro * statRng.float(0.9, 1.2), 0.05, 1.0).toFixed(2));
    const hookWindowMs = 950; 
    const optimalReel = statRng.int(arch.optimalReelRange[0], arch.optimalReelRange[1]); 

    // --- ECONOMY FIX: Dynamic Size-Based Price Per Kg ---
    // Tiny fish are delicacies (high value/kg), massive fish are bulk meat (low value/kg)
    const sizePricePerKg = { 'Tiny': 15.0, 'Small': 5.0, 'Medium': 2.0, 'Large': 0.6, 'Massive': 0.15 };
    const speciesDesirability = statRng.float(0.7, 1.4); 
    const pricePerKg = Number((sizePricePerKg[sizeTier] * arch.baseValueMod * speciesDesirability).toFixed(2));
    
    // XP still scales loosely on size tier
    const sizeXpMod = { 'Tiny': 0.8, 'Small': 1.0, 'Medium': 1.5, 'Large': 2.5, 'Massive': 4.0 };
    const baseXp = Math.round(10 * sizeXpMod[sizeTier]);

    return {
        id: `sp_${family}_${seed}`, 
        seed: seed,
        identity: { name: artResult.name, family: family },
        art: { imageDataUrl: artResult.imageDataUrl, palette: artResult.data.palette, metadata: artResult.data },
        environment: { biomes, depthPref, tempPref, activeHours },
        lurePrefs: { color: prefColor, sound: prefSound, light: prefLight, weight: prefWeight, tolerance: 0.8 }, 
        physical: { sizeTier, weightRange: { min: minW, max: maxW } },
        combat: { stamina, speed, aggression, hookWindowMs, optimalReel },
        economy: { pricePerKg: Math.max(0.5, pricePerKg), baseValue: 0, baseXp: Math.max(5, baseXp) }
    };

}

/**
 * Generates an INDIVIDUAL caught fish. 
 * Rolls a specific Rarity, applying heavy combat and economy multipliers.
 */
export function generateFishInstance(speciesData, rng) {
    const instance = JSON.parse(JSON.stringify(speciesData));
    
    // Roll Rarity Dynamically
    let rarityObj;
    let roll = rng.int(1, 100);
    let cumulative = 0;
    for (const tier of RARITY_TIERS) {
        cumulative += tier.weight;
        if (roll <= cumulative) { rarityObj = tier; break; }
    }
    
    // Apply Rarity Multipliers to the Instance
    instance.identity.rarity = rarityObj.name;
    instance.identity.name = speciesData.identity.name; 
    
    // V3: Separated Speed and Stamina multipliers to fix physics snaps
    instance.combat.stamina = Math.round(instance.combat.stamina * rarityObj.stamMult);
    instance.combat.speed = Math.round(instance.combat.speed * rarityObj.speedMult);
    
    instance.combat.aggression = rarityObj.name === 'Boss' ? 1.0 : instance.combat.aggression;
    instance.combat.hookWindowMs = Math.max(250, Math.round(instance.combat.hookWindowMs * rarityObj.hookMod));
    
    instance.lurePrefs.tolerance = rarityObj.tolerance;

    instance.economy.baseXp = Math.round((instance.economy.baseXp / 10) * rarityObj.xpBase);
    
    // Roll the specific weight for this catch (boosted by rarity's weight multiplier)
    const minW = instance.physical.weightRange.min * rarityObj.weightMult;
    const maxW = instance.physical.weightRange.max * rarityObj.weightMult;
    instance.actualWeight = Number(rng.float(minW, maxW).toFixed(2));
    
    // --- ECONOMY FIX: Controlled Rarity Multipliers ---
    // Because higher rarity fish are physically heavier, multiplying by weight already acts as a huge value boost. 
    // We use a much smaller, controlled rarity multiplier here to prevent exponential inflation!
    const rarityValMult = { 'Common': 1.0, 'Uncommon': 2.0, 'Rare': 4.5, 'Legendary': 10.0, 'Boss': 20.0 }[rarityObj.name];
    
    instance.economy.baseValue = Math.max(1, Math.round(instance.actualWeight * speciesData.economy.pricePerKg * rarityValMult));
    
    instance.instanceId = `inst_${rng.int(1000000, 9999999)}`;
    instance.invType = 'fish';

    return instance;
}

/**
 * Predictably generates the exact ecosystem of species for a specific Map Node.
 */
export function getFishPoolForNode(worldSeed, nodeX, nodeY, biomeId) {
    const poolRng = createRng(worldSeed + nodeX * 100 + nodeY * 1000);
    const numSpecies = poolRng.int(6, 12);
    const pool =[];
    let hasDeepsea = false;
    for (let i = 0; i < numSpecies; i++) {
        let opts = { seed: poolRng.next() * 1000000, biomeId: biomeId };
        if (biomeId === 'abyssal' && !hasDeepsea) {
            opts.family = 'deepsea';
            hasDeepsea = true;
        }
        pool.push(generateFishData(opts));
    }
    return pool;
}