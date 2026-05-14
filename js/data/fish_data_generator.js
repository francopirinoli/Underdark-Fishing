/**
 * js/data/fish_data_generator.js
 * The Master Fish Data Factory.
 * Wraps procedural pixel art in a comprehensive, mathematically balanced gameplay stat block.
 * V3 - Flattened Rarity Scaling (Stamina Sponges instead of Speed Demons), Buffed Easy Fish.
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
// V4: Slightly bumped Speed Multipliers to make higher rarities punchier, 
// and tightened hook/tolerance windows for a sharper challenge.
const RARITY_TIERS =[
    { name: 'Common',    weight: 50, stamMult: 1.0, speedMult: 1.0,  weightMult: 1.0, valBase: 10,  xpBase: 5,   tolerance: 0.75, hookMod: 1.0 },
    { name: 'Uncommon',  weight: 30, stamMult: 1.5, speedMult: 1.15, weightMult: 1.4, valBase: 35,  xpBase: 10,  tolerance: 0.55, hookMod: 0.8 },
    { name: 'Rare',      weight: 14, stamMult: 2.5, speedMult: 1.3,  weightMult: 2.2, valBase: 120, xpBase: 25,  tolerance: 0.35, hookMod: 0.6 },
    { name: 'Legendary', weight: 5,  stamMult: 4.0, speedMult: 1.45, weightMult: 3.5, valBase: 500, xpBase: 50,  tolerance: 0.2,  hookMod: 0.4 },
    { name: 'Boss',      weight: 1,  stamMult: 6.0, speedMult: 1.65, weightMult: 6.0, valBase: 2500,xpBase: 100, tolerance: 0.1,  hookMod: 0.25 }
];

// --- FAMILY ARCHETYPES (Base Stats before Rarity scaling) ---
const ARCHETYPES = {
    'fish': {
        sizes:['Tiny', 'Small', 'Medium', 'Large'], depths:['Surface', 'Mid-water', 'Bottom-feeder'],
        baseStamina: 60, baseSpeed: 55, baseAggro: 0.4, // Buffed all-around
        optimalReelRange: [40, 60],
        prefBias: { color: 0, sound: 0, light: 0, weight: 0 } 
    },
    'shark': {
        sizes: ['Medium', 'Large', 'Massive'], depths:['Surface', 'Mid-water'],
        baseStamina: 55, baseSpeed: 105, baseAggro: 0.90, // Extremely fast and aggressive
        optimalReelRange: [75, 95], 
        prefBias: { color: 70, sound: 80, light: 10, weight: 20 } 
    },
    'eel': {
        sizes: ['Small', 'Medium', 'Large'], depths:['Bottom-feeder'],
        baseStamina: 130, baseSpeed: 45, baseAggro: 0.3, // Massive stamina sponge
        optimalReelRange:[25, 45], 
        prefBias: { color: -40, sound: -80, light: -50, weight: 60 } 
    },
    'ray': {
        sizes: ['Medium', 'Large', 'Massive'], depths:['Bottom-feeder'],
        baseStamina: 95, baseSpeed: 55, baseAggro: 0.4, 
        optimalReelRange:[30, 50],
        prefBias: { color: 0, sound: -40, light: 0, weight: 80 } 
    },
    'crustacean': {
        sizes: ['Tiny', 'Small', 'Medium'], depths:['Bottom-feeder'],
        baseStamina: 140, baseSpeed: 35, baseAggro: 0.6, // Very high stamina, fights back more often
        optimalReelRange:[15, 30], 
        prefBias: { color: -20, sound: 0, light: -20, weight: 90 } 
    },
    'jellyfish': {
        sizes: ['Tiny', 'Small', 'Medium'], depths:['Surface', 'Mid-water'],
        baseStamina: 55, baseSpeed: 40, baseAggro: 0.3, // No longer a free catch
        optimalReelRange:[10, 30], 
        prefBias: { color: 0, sound: -90, light: 80, weight: -80 } 
    },
    'cephalopod': {
        sizes: ['Small', 'Medium', 'Large'], depths:['Mid-water', 'Bottom-feeder'],
        baseStamina: 85, baseSpeed: 70, baseAggro: 0.6, // Smart, tricky fighters
        optimalReelRange:[45, 65],
        prefBias: { color: -60, sound: -50, light: 0, weight: 10 } 
    },
    'deepsea': {
        sizes:['Medium', 'Large', 'Massive'], depths: ['Bottom-feeder'],
        baseStamina: 125, baseSpeed: 85, baseAggro: 0.8, // Terrifying baseline
        optimalReelRange:[50, 85], 
        prefBias: { color: -80, sound: 50, light: -90, weight: 70 } 
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
    const rng = createRng(seed);

    let availableFamilies = Object.keys(ART_GENERATORS);
    if (options.biomeId && options.biomeId !== 'abyssal') {
        availableFamilies = availableFamilies.filter(f => f !== 'deepsea');
    }
    const family = options.family || rng.pick(availableFamilies);
    const arch = ARCHETYPES[family];

    const artResult = ART_GENERATORS[family]({ rng });

    let biomes =[];
    if (family === 'deepsea') {
        biomes.push('abyssal');
    } else if (options.biomeId) {
        biomes.push(options.biomeId);
        if (rng.chance(0.3)) {
            const sec = rng.pick(Object.keys(BIOME_TEMPS));
            if (sec !== options.biomeId) biomes.push(sec);
        }
    } else {
        biomes.push(rng.pick(Object.keys(BIOME_TEMPS)));
    }

    const primaryBiome = biomes[0];
    const tempPref = rng.int(BIOME_TEMPS[primaryBiome].min, BIOME_TEMPS[primaryBiome].max);
    const depthPref = rng.pick(arch.depths);
    const activeHours = rng.pick(['Diurnal', 'Nocturnal', 'Crepuscular', 'Always Active']);

    const prefColor = clamp(Math.round(arch.prefBias.color + rng.float(-30, 30)), -100, 100);
    const prefSound = clamp(Math.round(arch.prefBias.sound + rng.float(-30, 30)), -100, 100);
    const prefLight = clamp(Math.round(arch.prefBias.light + rng.float(-30, 30)), -100, 100);
    const prefWeight = clamp(Math.round(arch.prefBias.weight + rng.float(-30, 30)), -100, 100);

    const sizeTier = rng.pick(arch.sizes);
    const weightBrackets = {
        'Tiny': { min: 0.1, max: 2.5 }, 'Small': { min: 2.0, max: 8.0 },
        'Medium': { min: 7.0, max: 25.0 }, 'Large': { min: 20.0, max: 150.0 }, 'Massive': { min: 120.0, max: 800.0 }
    };
    
    // Set base biological weights
    let minW = weightBrackets[sizeTier].min;
    let maxW = weightBrackets[sizeTier].max;

    // Base Combat stats (Unscaled)
    const stamina = Math.round(arch.baseStamina * rng.float(1, 1.5));
    const speed = Math.round(arch.baseSpeed * rng.float(0.85, 1.15));
    let aggression = Number(clamp(arch.baseAggro * rng.float(0.9, 1.2), 0.05, 1.0).toFixed(2));
    
    // TIGHTENED: Base generic window dropped from 1000ms to 850ms to demand faster reflexes
    const hookWindowMs = 850; 
    
    const optimalReel = rng.int(arch.optimalReelRange[0], arch.optimalReelRange[1]);

    // Base Economy
    const sizeEconMod = { 'Tiny': 0.5, 'Small': 0.8, 'Medium': 1.0, 'Large': 1.5, 'Massive': 2.5 };
    const baseValue = Math.round(10 * sizeEconMod[sizeTier]); // Base value of a common
    const baseXp = Math.round(10 * sizeEconMod[sizeTier]);

    return {
        id: `sp_${family}_${seed}`, 
        seed: seed,
        identity: {
            name: artResult.name,
            family: family
        },
        art: { imageDataUrl: artResult.imageDataUrl, palette: artResult.data.palette, metadata: artResult.data },
        environment: { biomes, depthPref, tempPref, activeHours },
        lurePrefs: { color: prefColor, sound: prefSound, light: prefLight, weight: prefWeight, tolerance: 0.8 }, 
        physical: { sizeTier, weightRange: { min: minW, max: maxW } },
        combat: { stamina, speed, aggression, hookWindowMs, optimalReel },
        economy: { baseValue: Math.max(1, baseValue), baseXp: Math.max(5, baseXp) }
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

    instance.economy.baseValue = Math.round(instance.economy.baseValue * (rarityObj.valBase / 10));
    instance.economy.baseXp = Math.round((instance.economy.baseXp / 10) * rarityObj.xpBase);
    
    // Roll the specific weight for this catch (boosted by rarity's weight multiplier)
    const minW = instance.physical.weightRange.min * rarityObj.weightMult;
    const maxW = instance.physical.weightRange.max * rarityObj.weightMult;
    instance.actualWeight = Number(rng.float(minW, maxW).toFixed(2));
    
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