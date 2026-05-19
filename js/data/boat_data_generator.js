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
    { name: 'Common',    weight: 50, statMult: 1.0, valBase: 300  },
    { name: 'Uncommon',  weight: 30, statMult: 1.2, valBase: 900  },
    { name: 'Rare',      weight: 15, statMult: 1.5, valBase: 2800 },
    { name: 'Legendary', weight: 5,  statMult: 2.0, valBase: 8500 }
];

// --- HULL ARCHETYPES (Base Stats) ---
// Mass & Speed setup for the "Momentum" physics update in Step 2.
const HULL_STATS = {
    'skiff': {
        hp: 50, speed: 60, acceleration: 120, turnSpeed: 90, 
        cargo: 20, stealth: 1.2, mass: 20, dr: 0.0, evasion: 0.40
    },
    'trawler': {
        hp: 120, speed: 70, acceleration: 125, turnSpeed: 55, 
        cargo: 35, stealth: 0.8, mass: 70, dr: 0.35, evasion: 0.10
    },
    'runner': {
        hp: 70, speed: 90, acceleration: 160, turnSpeed: 85, 
        cargo: 15, stealth: 1.8, mass: 35, dr: 0.10, evasion: 0.35
    },
    'corvette': {
        hp: 90, speed: 110, acceleration: 190, turnSpeed: 65, 
        cargo: 25, stealth: 1.0, mass: 55, dr: 0.20, evasion: 0.20
    },
    'barge': {
        hp: 150, speed: 50, acceleration: 100, turnSpeed: 45, 
        cargo: 60, stealth: 0.7, mass: 120, dr: 0.45, evasion: 0.05
    },
    'dreadnought': {
        hp: 200, speed: 85, acceleration: 150, turnSpeed: 35, 
        cargo: 50, stealth: 0.5, mass: 150, dr: 0.60, evasion: 0.00
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
    let finalSpeed = base.speed * Math.pow(rarityObj.statMult, 0.8);
    let finalAccel = base.acceleration * Math.pow(rarityObj.statMult, 0.8);
    let finalTurn = base.turnSpeed * Math.pow(rarityObj.statMult, 0.8);
    let finalCargo = Math.floor(base.cargo * rarityObj.statMult);
    let finalStealth = base.stealth; 
    let finalMass = base.mass;

    // Higher rarity slightly boosts DR and Evasion, but caps them to prevent invincibility
    let finalDR = clamp(base.dr * (1 + (rarityObj.statMult - 1) * 0.3), 0.0, 0.85); 
    let finalEvasion = clamp(base.evasion * (1 + (rarityObj.statMult - 1) * 0.5), 0.0, 0.70);

    // Apply minor visual physics modifiers
    if (hasSail) {
        finalSpeed *= 1.1; 
        finalAccel *= 1.15;
    }
    if (hasSpikes) {
        finalHp *= 1.15; 
        finalTurn *= 0.95; 
        finalDR += 0.05; // Spikes add 5% damage reduction
    }
    if (hasSmoke) {
        finalStealth *= 0.85; 
    }

    // 4. Set Base Upgrades
    const upgrades = {
        plating: null, engine: null, prow: null,
        lantern: { id: 'lantern_oil', name: 'Oil Lantern', lightRadius: 250, fuelDrainRate: 1.0 },
        storage: null 
    };

    // 5. Calculate Economy Value
    let finalValue = rarityObj.valBase * rng.float(0.9, 1.1);
    finalValue = Math.round(finalValue);

    return {
        id: `boat_${rng.int(100000, 999999)}`,
        seed: seed,
        identity: {
            name: artResult.name, 
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
            stealth: Number(clamp(finalStealth, 0.1, 3.0).toFixed(2)),
            mass: finalMass,
            damageReduction: Number(finalDR.toFixed(2)),
            evasion: Number(finalEvasion.toFixed(2))
        },
        upgrades: upgrades,
        economy: {
            value: finalValue
        }
    };
}