/**
 * js/data/player_data.js
 * The Player Factory and Progression Engine.
 * V7 - Added Reagents bag, Active Buffs, Bait slot, and renamed 'crafting' stat.
 */

import { generateBoatData } from './boat_data_generator.js';
import { generateRodData } from './rod_data_generator.js';
import { generateLure } from '../art/lure_generator.js'; 
import { createRng } from '../util/rng.js';
import { clamp } from '../util/utils.js'; 

const MAX_LEVEL = 10;
const MAX_STAT_VALUE = 5; 

export const STAT_DESCRIPTIONS = {
    fishing: "Increases Reeling Power, Reaction Window, and Cast Distance.",
    stamina: "Increases Max Stamina and Stamina Regeneration while resting.",
    driving: "Improves Boat Speed, Boat Stealth, and Collision Evasion chance.",
    crafting: "Increases Point Budget when dissecting parts, Lure Durability, and Alchemy potency.", // <-- RENAMED
    bartering: "Improves prices at settlements. Buy items for cheaper, and Sell items for more profit.",
    intelligence: "Increases general XP, Bestiary XP, and improves Lantern Fuel efficiency."
};

const XP_CURVE = {
    1: 100, 2: 250, 3: 450, 4: 700, 5: 1000,
    6: 1400, 7: 1900, 8: 2500, 9: 3200, 10: Infinity
};

export const PlayerEngine = {

    createPlayer(options = {}) {
        let starterBoat, starterRod;
        let attempts = 0;
        
        do { starterBoat = generateBoatData({ seed: Date.now() + ++attempts }); } 
        while (starterBoat.identity.rarity !== 'Common');
        starterBoat.invType = 'boat'; 

        do { starterRod = generateRodData({ seed: Date.now() + ++attempts }); } 
        while (starterRod.identity.rarity !== 'Common');
        starterRod.invType = 'rod';   

        const starterLureSeed = Date.now();
        const starterComponents = ['iron_sinker', 'fish_gut'];
        const starterLureArt = generateLure({ rng: createRng(starterLureSeed), components: starterComponents });
        
        const starterLure = {
            id: 'lure_starter',
            seed: starterLureSeed,
            components: starterComponents,
            name: 'Basic Jig',
            invType: 'lure',  
            basePrice: 15,    
            imageDataUrl: starterLureArt.imageDataUrl,
            stats: { color: 10, sound: 0, light: 0, weight: 10 },
            durability: 15,
            maxDurability: 15
        };

        return {
            identity: {
                name: options.name || "Unknown Angler",
                race: options.race || "Human",
                gender: options.gender || "Female",
                portraitData: options.portraitData || null,
                portraitSeed: options.portraitSeed || Date.now()
            },
            vitals: {
                level: 1,
                xp: 0,
                gold: 100,
                rations: 10,
                fuel: 100,
                hp: starterBoat.stats.maxHp
            },
            stats: {
                fishing: 1,
                stamina: 1,
                driving: 1,
                crafting: 1, // <-- RENAMED
                bartering: 1,
                intelligence: 1
            },
            availablePoints: 3,
            activeQuests: [],
            completedQuests: [],
            activeBuffs: [], // <-- NEW: Tracks potion effects
            bestiary: {},
            inventory: [], // Cargo Hold
            reagents: [],  // <-- NEW: Tackle box for fish parts
            safehouses: {},
            gear: {
                boat: starterBoat,
                rod: starterRod,
                lure: starterLure,
                bait: null // <-- NEW: Active target bait
            }
        };
    },

    allocateStat(player, statKey) {
        if (player.availablePoints > 0 && player.stats[statKey] !== undefined) {
            if (player.stats[statKey] < MAX_STAT_VALUE) {
                player.stats[statKey]++;
                player.availablePoints--;
                return true;
            }
        }
        return false;
    },

    addXp(player, amount) {
        if (player.vitals.level >= MAX_LEVEL) return false;

        player.vitals.xp += amount;
        let leveledUp = false;

        while (player.vitals.level < MAX_LEVEL && player.vitals.xp >= XP_CURVE[player.vitals.level]) {
            player.vitals.xp -= XP_CURVE[player.vitals.level];
            player.vitals.level++;
            player.availablePoints += 1; 
            leveledUp = true;
        }

        return leveledUp;
    },

    equipItem(player, type, itemData) {
        if (['boat', 'rod', 'lure', 'bait'].includes(type)) { // <-- ADDED BAIT
            player.gear[type] = itemData;
            return true;
        }
        return false;
    },

    getEffectiveStats(player) {
        // --- NEW: Apply Active Potion Buffs ---
        const buffedStats = { ...player.stats };
        if (player.activeBuffs) {
            player.activeBuffs.forEach(buff => {
                if (buffedStats[buff.stat] !== undefined) {
                    buffedStats[buff.stat] += buff.amount;
                }
            });
        }

        const rod = player.gear.rod;
        const boat = player.gear.boat;
        const lure = player.gear.lure;

        // --- 1. MINIGAME PHYSICS STATS ---
        const rodPower = rod ? rod.stats.power : 0.5;
        const rodTension = rod ? rod.stats.maxTension : 50;
        const rodFlex = rod ? rod.stats.flexibility : 0.5;
        const rodSens = rod ? rod.stats.sensitivity : 0;
        
        let effectivePower = rodPower * (1 + (buffedStats.fishing * 0.2));
        let effectiveHookWindow = rodSens + (buffedStats.fishing * 100);
        
        // BALANCE FIX: Buffed base stamina from 50 to 60.
        // A level 1 player now has 90 Stamina instead of 80.
        let effectiveStamina = 60 + (buffedStats.stamina * 30); 
        
        let effectiveMaxTension = rodTension;
        let effectiveFlexibility = rodFlex;
        let effectiveSweetSpotTolerance = Math.max(3, Math.min(25, 8 + (rodSens / 100))); 
        
        // BALANCE FIX: Bumped base scroll speed from 1.0 to 1.8. 
        // It now scales slightly faster with Sensitivity as well.
        let effectiveReelScrollSpeed = Math.max(0.8, 1.8 + (rodSens / 400));

        if (rod && rod.traits) {
            rod.traits.forEach(t => {
                if (t.id === 'iron_grip') effectiveFlexibility *= 1.2; 
                if (t.id === 'crystal_resonance') effectiveHookWindow += 500; 
            });
        }

// --- 2. EXPLORATION & BOAT UPGRADES ---
        let effectiveMaxHp = boat ? boat.stats.maxHp : 50;
        let effectiveSpeed = boat ? boat.stats.speed : 10; 
        let effectiveAccel = boat ? boat.stats.acceleration : 10;
        let effectiveTurn = boat ? boat.stats.turnSpeed : 50;
        let effectiveStealth = boat ? boat.stats.stealth : 0.5;
        let effectiveCargo = boat ? boat.stats.cargoSpace : 10; 
        
        let effectiveMass = boat ? boat.stats.mass : 50;
        let effectiveDR = boat ? boat.stats.damageReduction : 0;
        let effectiveEvasion = boat ? boat.stats.evasion : 0;
        let collisionDamageMult = 1.0;
        
        const immunities = { volcanic: false, crystal: false, abyssal: false, fungal: false, frozen: false };

        if (boat && boat.upgrades) {
            const upg = boat.upgrades;
            if (upg.plating) {
                if (upg.plating.id === 'upg_iron_plating') { 
                    effectiveMaxHp += 50; 
                    effectiveMass += 25; // Iron is heavy!
                    effectiveDR += 0.15; // +15% DR
                    immunities.volcanic = true; 
                } 
                else if (upg.plating.id === 'upg_acoustic_dampening') { 
                    effectiveStealth *= 1.30; 
                    immunities.crystal = true; 
                }
            }
            if (upg.engine) {
                if (upg.engine.id === 'upg_overclocked_motor') { effectiveSpeed *= 1.20; immunities.abyssal = true; } 
                else if (upg.engine.id === 'upg_alchemical_filter') { effectiveAccel *= 1.15; immunities.fungal = true; }
            }
            if (upg.prow) {
                if (upg.prow.id === 'upg_icebreaker_prow') { 
                    collisionDamageMult = 0.5; 
                    effectiveMass += 15;
                    effectiveDR += 0.10;
                    immunities.frozen = true; 
                }
            }
            if (upg.storage && upg.storage.id === 'upg_cargo_net') effectiveCargo += 10;
        }

        // Apply Player "Driving" Stat Modifiers
        effectiveSpeed *= (1 + (buffedStats.driving * 0.1));
        effectiveAccel *= (1 + (buffedStats.driving * 0.1));
        effectiveTurn *= (1 + (buffedStats.driving * 0.1));
        effectiveStealth *= (1 + (buffedStats.driving * 0.1));
        
        // Driving stat buffs DR and Evasion, but caps them to prevent literal invincibility
        effectiveDR = clamp(effectiveDR + (buffedStats.driving * 0.05), 0, 0.85);
        effectiveEvasion = clamp(effectiveEvasion + (buffedStats.driving * 0.04), 0, 0.85);

// --- 3. ECONOMY & CRAFTING STATS ---
        let storeDiscount = buffedStats.bartering * 0.08; 
        // ECONOMY FIX: Sell multiplier now scales from 0.6x (Base) to 1.0x (Max Level)
        let sellMultiplier = 0.5 + (buffedStats.bartering * 0.1); 
        let fuelEfficiencyMult = 1 - (buffedStats.intelligence * 0.10);
        let dissectionBudgetMult = 1 + (buffedStats.crafting * 0.2); // <-- UPDATED
        let lureDurabilityMult = 1 + (buffedStats.crafting * 0.2);   // <-- UPDATED
        let knowledgeXpMult = 1 + (buffedStats.intelligence * 0.2);
        let generalXpMult = 1 + (buffedStats.intelligence * 0.1);

        // --- 4. LURE PROPERTIES ---
        let activeLureStats = { color: 0, sound: 0, light: 0, weight: 0 };
        if (lure && lure.stats) {
            activeLureStats = { ...lure.stats };
            if (rod && rod.traits && rod.traits.find(t => t.id === 'glowing_line')) {
                activeLureStats.light = Math.min(100, activeLureStats.light + 20);
            }
        }

        return {
            minigame: {
                power: Number(effectivePower.toFixed(2)),
                hookWindowMs: Math.round(effectiveHookWindow),
                stamina: effectiveStamina,
                maxTension: effectiveMaxTension,
                flexibility: Number(effectiveFlexibility.toFixed(2)),
                sweetSpotTolerance: Number(effectiveSweetSpotTolerance.toFixed(1)),
                reelScrollSpeed: Number(effectiveReelScrollSpeed.toFixed(2))
            },
            exploration: {
                maxHp: Math.round(effectiveMaxHp),
                speed: Number(effectiveSpeed.toFixed(2)),
                acceleration: Number(effectiveAccel.toFixed(2)),
                turnSpeed: Number(effectiveTurn.toFixed(2)),
                stealth: Number(effectiveStealth.toFixed(2)),
                mass: Math.round(effectiveMass),
                damageReduction: Number(effectiveDR.toFixed(2)),
                evasion: Number(effectiveEvasion.toFixed(2)),
                // FIX: Re-map the old name so game.js and grimoire_ui.js don't crash!
                hazardDodgeChance: Number(effectiveEvasion.toFixed(2)), 
                collisionDamageMult: Number(collisionDamageMult.toFixed(2)),
                cargoSpace: effectiveCargo,
                fuelEfficiencyMult: Number(Math.max(0.1, fuelEfficiencyMult).toFixed(2)),
                immunities: immunities 
            },
            economy: {
                discountMultiplier: Number((1 - storeDiscount).toFixed(2)), 
                sellMultiplier: Number(sellMultiplier.toFixed(2)), 
                knowledgeXpMult: Number(knowledgeXpMult.toFixed(2)),
                generalXpMult: Number(generalXpMult.toFixed(2)),
                dissectionBudgetMult: Number(dissectionBudgetMult.toFixed(2)),
                lureDurabilityMult: Number(lureDurabilityMult.toFixed(2))
            },
            activeLure: activeLureStats
        };
    }
};