/**
 * js/data/player_data.js
 * The Player Factory and Progression Engine.
 * V5 - Added Bestiary tracking for specific species knowledge.
 */

import { generateBoatData } from './boat_data_generator.js';
import { generateRodData } from './rod_data_generator.js';
import { generateLure } from '../art/lure_generator.js'; 

const MAX_LEVEL = 10;
const MAX_STAT_VALUE = 5; 

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
        starterBoat.invType = 'boat'; // <--- NEW: Explicitly tag type

        do { starterRod = generateRodData({ seed: Date.now() + ++attempts }); } 
        while (starterRod.identity.rarity !== 'Common');
        starterRod.invType = 'rod';   // <--- NEW: Explicitly tag type

        // Generate a baseline lure with art so it appears during the fishing minigame
        const starterLureArt = generateLure({ components: ['iron_sinker', 'fish_gut'] });
        const starterLure = {
            id: 'lure_starter',
            name: 'Basic Jig',
            invType: 'lure',  // <--- NEW: Explicitly tag type
            basePrice: 15,    // <--- NEW: Give it a sell value
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
                portraitData: options.portraitData || null
            },
            vitals: {
                level: 1,
                xp: 0,
                gold: 100,
                rations: 10,
                fuel: 100,
                hp: starterBoat.stats.maxHp // Synced to the generated chassis
            },
            stats: {
                fishing: 1,
                stamina: 1,
                driving: 1,
                lureCrafting: 1,
                bartering: 1,
                intelligence: 1
            },
            availablePoints: 3,
            activeQuests:[],
            bestiary: {}, // NEW: Tracks Knowledge XP per specific Species ID
            inventory:[],
            gear: {
                boat: starterBoat,
                rod: starterRod,
                lure: starterLure
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
        if (type === 'boat' || type === 'rod' || type === 'lure') {
            player.gear[type] = itemData;
            return true;
        }
        return false;
    },

    getEffectiveStats(player) {
        const stats = player.stats;
        const rod = player.gear.rod;
        const boat = player.gear.boat;
        const lure = player.gear.lure;

        const rodPower = rod ? rod.stats.power : 0.5;
        const rodTension = rod ? rod.stats.maxTension : 50;
        const rodFlex = rod ? rod.stats.flexibility : 0.5;
        const rodSens = rod ? rod.stats.sensitivity : 0;
        
        const boatSpeed = boat ? boat.stats.speed : 10; 
        const boatStealth = boat ? boat.stats.stealth : 0.5;
        const boatCargo = boat ? boat.stats.cargoSpace : 10; 

        // --- 1. MINIGAME PHYSICS STATS ---
        let effectivePower = rodPower * (1 + (stats.fishing * 0.2));
        let effectiveHookWindow = rodSens + (stats.fishing * 100);
        let effectiveStamina = 50 + (stats.stamina * 30);
        let effectiveMaxTension = rodTension;
        let effectiveFlexibility = rodFlex;

        if (rod && rod.traits) {
            rod.traits.forEach(t => {
                if (t.id === 'iron_grip') effectiveFlexibility *= 1.2; 
                if (t.id === 'crystal_resonance') effectiveHookWindow += 500; 
            });
        }

        // --- 2. EXPLORATION & SURVIVAL STATS ---
        let effectiveBoatSpeed = boatSpeed * (1 + (stats.driving * 0.1));
        let effectiveBoatStealth = boatStealth * (1 + (stats.driving * 0.1));
        let hazardDodgeChance = stats.driving * 0.04;

        // --- 3. ECONOMY & CRAFTING STATS ---
        let storeDiscount = stats.bartering * 0.1; 
        let sellBonus = 1 + (stats.bartering * 0.1);
        let dissectionBudgetMult = 1 + (stats.lureCrafting * 0.2);
        let lureDurabilityMult = 1 + (stats.lureCrafting * 0.2);
        let knowledgeXpMult = 1 + (stats.intelligence * 0.2);
        let generalXpMult = 1 + (stats.intelligence * 0.1);

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
                flexibility: Number(effectiveFlexibility.toFixed(2))
            },
            exploration: {
                speed: Number(effectiveBoatSpeed.toFixed(2)),
                stealth: Number(effectiveBoatStealth.toFixed(2)),
                hazardDodgeChance: Number(hazardDodgeChance.toFixed(2)),
                cargoSpace: boatCargo 
            },
            economy: {
                discountMultiplier: Number((1 - storeDiscount).toFixed(2)), 
                sellMultiplier: Number(sellBonus.toFixed(2)),
                knowledgeXpMult: Number(knowledgeXpMult.toFixed(2)),
                generalXpMult: Number(generalXpMult.toFixed(2)),
                dissectionBudgetMult: Number(dissectionBudgetMult.toFixed(2)),
                lureDurabilityMult: Number(lureDurabilityMult.toFixed(2))
            },
            activeLure: activeLureStats
        };
    }
};