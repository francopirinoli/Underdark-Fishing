/**
 * js/data/boat_data_generator.js
 * The Master Boat Data Factory.
 * Wraps procedural boat pixel art in a balanced RPG stat block.
 * Establishes the base chassis which players will upgrade at settlements.
 */

import { createRng } from '../util/rng.js';
import { generateBoat } from '../art/boat_generator.js';

// --- RARITY SCALING ---
// Higher rarity represents better base craftsmanship and materials
const RARITY_TIERS =[
    { name: 'Common',    weight: 50, statMult: 1.0, valBase: 500  },
    { name: 'Uncommon',  weight: 30, statMult: 1.2, valBase: 1200 },
    { name: 'Rare',      weight: 15, statMult: 1.5, valBase: 3500 },
    { name: 'Legendary', weight: 5,  statMult: 2.0, valBase: 8000 }
];

// --- HULL ARCHETYPES (Base Stats) ---
const HULL_STATS = {
    'skiff': {
        hp: 50, speed: 60, acceleration: 80, turnSpeed: 90, 
        cargo: 20, stealth: 1.2 // 1.2x stealth means 20% harder for fish to hear you
    },
    'trawler': {
        hp: 100, speed: 50, acceleration: 50, turnSpeed: 50, 
        cargo: 30, stealth: 0.8 // Noisy industrial boat
    },
    'runner': {
        hp: 70, speed: 85, acceleration: 70, turnSpeed: 80, 
        cargo: 15, stealth: 1.8 // Drow stealth tech, incredibly quiet
    },
    'dreadnought': {
        hp: 150, speed: 40, acceleration: 40, turnSpeed: 40, 
        cargo: 50, stealth: 0.6 // A floating fortress, wakes everything up
    }
};

// Helper
const clamp = (val, min, max) => Math.max(min, Math.min(max, val));

export function generateBoatData(options = {}) {
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
    const artResult = generateBoat({ rng });
    const bType = artResult.data.boatType;
    const hasSail = artResult.data.hasSail;
    const hasSpikes = artResult.data.hasSpikes;
    const hasSmoke = artResult.data.hasSmoke;

    // 3. Calculate Base Stats
    const base = HULL_STATS[bType];

    let finalHp = base.hp * rarityObj.statMult;
    let finalSpeed = base.speed * rarityObj.statMult;
    let finalAccel = base.acceleration * Math.pow(rarityObj.statMult, 0.8);
    let finalTurn = base.turnSpeed * Math.pow(rarityObj.statMult, 0.8);
    let finalCargo = Math.floor(base.cargo * rarityObj.statMult);
    let finalStealth = base.stealth; // Stealth is inherent to the design, rarity affects it minimally

    // Apply minor visual physics modifiers
    if (hasSail) {
        finalSpeed *= 1.1; // 10% speed boost from wind
        finalAccel *= 1.15;
    }
    if (hasSpikes) {
        finalHp *= 1.15; // 15% more collision durability
        finalTurn *= 0.95; // Slightly heavier steering
    }
    if (hasSmoke) {
        finalStealth *= 0.85; // Engine smoke makes you slightly louder
    }

    // 4. Set Base Upgrades & Modules
    // Players will buy better versions of these at the Docks and install them at their Safehouse
    const upgrades = {
        plating: null, // Armor / Dampening
        engine: null,  // Speed / Air Filters
        prow: null,    // Collision / Icebreakers
        lantern: {
            id: 'lantern_oil',
            name: 'Oil Lantern',
            lightRadius: 250,
            fuelDrainRate: 1.0 
        },
        storage: null  // Cargo nets
    };

    // 5. Calculate Economy Value
    // Base value * slight RNG fuzz
    let finalValue = rarityObj.valBase * rng.float(0.9, 1.1);
    finalValue = Math.round(finalValue);

    return {
        id: `boat_${rng.int(100000, 999999)}`,
        seed: seed,
        identity: {
            name: artResult.name, // Rarity prefix removed!
            baseName: artResult.name,
            rarity: rarityObj.name
        },
        art: {
            profileDataUrl: artResult.imageDataUrl,
            topDownDataUrl: artResult.topDownDataUrl,
            boatType: bType,
            palette: artResult.data.palette
        },
        stats: {
            hp: Math.round(finalHp),
            maxHp: Math.round(finalHp),
            speed: Math.round(clamp(finalSpeed, 10, 200)),
            acceleration: Math.round(clamp(finalAccel, 10, 200)),
            turnSpeed: Math.round(clamp(finalTurn, 10, 200)),
            cargoSpace: finalCargo,
            stealth: Number(clamp(finalStealth, 0.1, 3.0).toFixed(2))
        },
        upgrades: upgrades,
        economy: {
            value: finalValue
        }
    };
}