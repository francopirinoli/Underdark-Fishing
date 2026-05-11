/**
 * js/data/rod_data_generator.js
 * The Master Fishing Rod Data Factory.
 * Wraps procedural rod pixel art in a mathematically balanced RPG stat block,
 * applying material modifiers, rarity scaling, and special traits.
 */

import { createRng } from '../util/rng.js';
import { generateRod } from '../art/rod_generator.js';

// --- RARITY SCALING ---
const RARITY_TIERS =[
    { name: 'Common',    weight: 50, statMult: 1.0, valBase: 40,   maxTraits: 0 },
    { name: 'Uncommon',  weight: 30, statMult: 1.3, valBase: 180,  maxTraits: 0 },
    { name: 'Rare',      weight: 15, statMult: 1.8, valBase: 750,  maxTraits: 1 },
    { name: 'Legendary', weight: 5,  statMult: 2.8, valBase: 2800, maxTraits: 2 }
];

// --- MATERIAL BASE STATS ---
const MATERIAL_STATS = {
    // Woods: Balanced
    'PINE':      { power: 1.0, maxTension: 100, flex: 1.1, sens: 50 },
    'OAK':       { power: 1.1, maxTension: 110, flex: 1.0, sens: 0 },
    'DARK_WOOD': { power: 1.2, maxTension: 115, flex: 0.9, sens: 0 },
    'DRIFTWOOD': { power: 0.9, maxTension: 95,  flex: 1.2, sens: 100 },
    
    // Metals: Brute strength, terrible flexibility
    'IRON':      { power: 1.4, maxTension: 140, flex: 0.7, sens: -100 },
    'STEEL':     { power: 1.5, maxTension: 160, flex: 0.6, sens: -100 },
    'RUST':      { power: 1.3, maxTension: 125, flex: 0.5, sens: -150 },
    
    // Bone: Incredible flexibility for erratic fish, low raw power
    'BONE':      { power: 0.8, maxTension: 90,  flex: 1.6, sens: 150 },
    
    // Crystal: Magic wand, extreme sensitivity, very brittle
    'GEM_RED':   { power: 1.4, maxTension: 80,  flex: 1.0, sens: 300 },
    'GEM_BLUE':  { power: 1.2, maxTension: 85,  flex: 1.1, sens: 350 },
    'GEM_GREEN': { power: 1.1, maxTension: 90,  flex: 1.2, sens: 300 },
    'GEM_PURPLE':{ power: 1.3, maxTension: 75,  flex: 1.0, sens: 400 }
};

// --- REEL & GRIP MODIFIERS ---
const REEL_MODS = {
    'simple_spool': { power: 0.0, maxTension: 0, flex: 0.0, sens: 0 },
    'heavy_crank':  { power: 0.2, maxTension: 10, flex: -0.1, sens: -50 },
    'drum':         { power: 0.1, maxTension: 20, flex: 0.0, sens: -20 },
    'magic_orb':    { power: 0.0, maxTension: -10, flex: 0.15, sens: 150 }
};

const GRIP_MODS = {
    'cork_smooth':  { power: 0.0, maxTension: 0, flex: 0.0, sens: 0 },
    'leather_wrap': { power: 0.0, maxTension: 0, flex: 0.1, sens: 20 },
    'banded_iron':  { power: 0.0, maxTension: 15, flex: -0.05, sens: -20 },
    'bone_carved':  { power: 0.1, maxTension: -5, flex: 0.05, sens: 50 }
};

// --- SPECIAL TRAITS ---
const TRAIT_POOL = {
    'abyssal_bane':     { name: 'Abyssal Bane', desc: '+20% Reeling Power against Deep Sea Horrors.', valueMult: 1.3 },
    'leviathan_hunter': { name: 'Leviathan Hunter', desc: 'Max Tension increases by +50 when fighting Massive fish.', valueMult: 1.4 },
    'feather_cast':     { name: 'Feather Cast', desc: 'Fish stamina drains 15% faster while you are resting.', valueMult: 1.25 },
    'shark_tamer':      { name: 'Shark Tamer', desc: 'Reduces the massive tension spike of "Burst" behaviors by half.', valueMult: 1.5 },
    'lucky_strike':     { name: 'Lucky Strike', desc: '10% chance to haul up a sunken treasure instead of a fish.', valueMult: 1.6 },
    'crystal_resonance':{ name: 'Crystal Resonance', desc: 'Hook Window is permanently doubled.', valueMult: 1.4 },
    'iron_grip':        { name: 'Iron Grip', desc: 'Tension never rises passively while resting.', valueMult: 1.3 }
};

// Helper
const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

export function generateRodData(options = {}) {
    const seed = options.seed || Date.now();
    const rng = createRng(seed);

    // 1. Determine Rarity
    let rarityObj;
    let roll = rng.int(1, 100);
    let cumulative = 0;
    for (const tier of RARITY_TIERS) {
        cumulative += tier.weight;
        if (roll <= cumulative) {
            rarityObj = tier;
            break;
        }
    }

    // 2. Generate Pixel Art
    // Pass the RNG to ensure the visual components match the seed deterministically
    const artResult = generateRod({ rng });
    const matKey = artResult.data.material;
    const reelKey = artResult.data.reel;
    const gripKey = artResult.data.grip;
    const isGlowing = artResult.data.glowingLine;

    // 3. Calculate Base Stats
    const base = MATERIAL_STATS[matKey] || MATERIAL_STATS['OAK'];
    const reelMod = REEL_MODS[reelKey];
    const gripMod = GRIP_MODS[gripKey];

    // Combine Base + Reel + Grip, then apply Rarity Multiplier
    let finalPower = (base.power + reelMod.power + gripMod.power) * rarityObj.statMult;
    let finalTension = (base.maxTension + reelMod.maxTension + gripMod.maxTension) * rarityObj.statMult;
    let finalFlex = (base.flex + reelMod.flex + gripMod.flex) * Math.pow(rarityObj.statMult, 0.5); // Flex scales slower to prevent unlosable fights
    let finalSens = (base.sens + reelMod.sens + gripMod.sens) * rarityObj.statMult;

    // Clamp values to sane gameplay limits
    finalPower = Number(clamp(finalPower, 0.5, 4.0).toFixed(2));
    finalTension = Math.round(clamp(finalTension, 60, 400));
    finalFlex = Number(clamp(finalFlex, 0.3, 3.0).toFixed(2));
    finalSens = Math.round(clamp(finalSens, -300, 1500)); // Negative means harder to hook!

    // 4. Assign Special Traits
    const traits =[];
    let traitValueMultiplier = 1.0;

    // Inherent visual trait
    if (isGlowing) {
        traits.push({
            id: 'glowing_line',
            name: 'Luminescent Thread',
            desc: 'Grants a passive +20 Light to any attached lure. Essential for Abyssal fishing.',
            valueMult: 1.15
        });
        traitValueMultiplier *= 1.15;
    }

    // Rarity-based random traits
    const availableTraits = Object.keys(TRAIT_POOL);
    // Shuffle pool deterministically
    for (let i = availableTraits.length - 1; i > 0; i--) {
        const j = rng.int(0, i);
        [availableTraits[i], availableTraits[j]] =[availableTraits[j], availableTraits[i]];
    }

    const numTraitsToApply = (rarityObj.name === 'Legendary') ? rng.int(1, 2) : 
                             (rarityObj.name === 'Rare' && rng.chance(0.6)) ? 1 : 0;

    for (let i = 0; i < numTraitsToApply; i++) {
        const tKey = availableTraits[i];
        const tData = TRAIT_POOL[tKey];
        traits.push({ id: tKey, ...tData });
        traitValueMultiplier *= tData.valueMult;
    }

    // 5. Calculate Economy Value
    // Base value * Trait Multipliers * slight RNG fuzz
    let finalValue = rarityObj.valBase * traitValueMultiplier * rng.float(0.9, 1.1);
    finalValue = Math.round(finalValue);

    return {
        id: `rod_${rng.int(100000, 999999)}`,
        seed: seed,
        identity: {
            name: artResult.name, // Rarity prefix removed!
            baseName: artResult.name,
            rarity: rarityObj.name
        },
        art: {
            imageDataUrl: artResult.imageDataUrl,
            material: matKey,
            reel: reelKey,
            grip: gripKey
        },
        stats: {
            power: finalPower,           // Multiplier on catch speed
            maxTension: finalTension,    // Absolute snapping point
            flexibility: finalFlex,      // Multiplier on tension decay when resting
            sensitivity: finalSens       // Millisecond bonus/penalty to the bite reaction window
        },
        traits: traits,
        economy: {
            value: finalValue
        }
    };
}