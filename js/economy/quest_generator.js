/**
 * js/economy/quest_generator.js
 * Procedural Quest Generator for Settlements.
 * V2 - Research quests now target specific local species.
 */

import { createRng } from '../util/rng.js';

// --- REWARD SCALING CONSTANTS ---
const BASE_GOLD_PER_DIFFICULTY = 50;
const BASE_XP_PER_DIFFICULTY = 25;

export const QuestGenerator = {

    /**
     * Generates a board of random quests for a settlement.
     * @param {number} seed - RNG seed for daily/settlement consistency.
     * @param {number} playerLevel - To scale difficulty (1-10).
     * @param {Array} availableSpecies - Array of generated fish data objects to pull targets from.
     * @param {Array} availableBiomes - Array of active biome IDs.
     * @returns {Array} List of Quest objects.
     */
    generateQuestBoard(seed, playerLevel = 1, availableSpecies =[], availableBiomes =[]) {
        const rng = createRng(seed);
        const numQuests = rng.int(2, 4); // 2 to 4 quests per town
        const quests =[];

        // Pool of valid target species (Exclude Bosses from normal pools)
        const standardSpecies = availableSpecies.filter(s => s.identity.rarity !== 'Boss');
        if (standardSpecies.length === 0) return quests; // Safety fallback

        for (let i = 0; i < numQuests; i++) {
            // Pick a quest type. Bounties only appear at higher levels or low RNG chance.
            const typePool =['hunt', 'hunt', 'trophy', 'research'];
            if (playerLevel >= 3 || rng.chance(0.1)) typePool.push('bounty');
            
            const questType = rng.pick(typePool);
            let quest = null;

            if (questType === 'hunt') quest = this._generateHunt(rng, standardSpecies, playerLevel);
            else if (questType === 'trophy') quest = this._generateTrophy(rng, standardSpecies, playerLevel);
            else if (questType === 'research') quest = this._generateResearch(rng, standardSpecies, playerLevel);
            else if (questType === 'bounty') quest = this._generateBounty(rng, availableBiomes, playerLevel);

            if (quest) {
                // Attach a unique ID for tracking
                quest.id = `quest_${rng.int(10000, 99999)}`;
                quests.push(quest);
            }
        }

        return quests;
    },

    // --- QUEST ARCHETYPES ---

    _generateHunt(rng, speciesPool, playerLevel) {
        const targetFish = rng.pick(speciesPool);
        
        // Quantity depends on rarity
        let amount = rng.int(3, 8);
        if (targetFish.identity.rarity === 'Uncommon') amount = rng.int(2, 5);
        if (targetFish.identity.rarity === 'Rare') amount = rng.int(1, 3);
        if (targetFish.identity.rarity === 'Legendary') amount = 1;

        // Difficulty calculation based on rarity and amount
        const diffMultiplier = { 'Common': 1, 'Uncommon': 1.5, 'Rare': 3, 'Legendary': 6 }[targetFish.identity.rarity];
        const difficulty = Math.max(1, Math.round((amount * diffMultiplier * 0.5) + (playerLevel * 0.2)));

        return {
            type: 'hunt',
            title: `Hunt: ${targetFish.identity.name}`,
            desc: `The town requires a steady supply of ${targetFish.identity.name}. Bring back ${amount} of them.`,
            targetSpeciesId: targetFish.id,
            targetName: targetFish.identity.name,
            requiredAmount: amount,
            currentAmount: 0,
            difficulty: difficulty,
            rewards: this._calculateRewards(rng, difficulty, false)
        };
    },

    _generateTrophy(rng, speciesPool, playerLevel) {
        const targetFish = rng.pick(speciesPool);
        
        // Target weight is between the mean and the absolute maximum
        const minW = targetFish.physical.weightRange.min;
        const maxW = targetFish.physical.weightRange.max;
        const meanW = minW + (maxW - minW) * 0.45;
        
        // Target is something quite large for its species (70% to 95% of max weight)
        const targetWeight = Number((meanW + (maxW - meanW) * rng.float(0.7, 0.95)).toFixed(2));

        const difficulty = Math.max(2, Math.round(3 + (playerLevel * 0.5)));

        return {
            type: 'trophy',
            title: `Trophy: Giant ${targetFish.identity.name}`,
            desc: `A local angler claims no one can catch a ${targetFish.identity.name} heavier than ${targetWeight}kg. Prove them wrong.`,
            targetSpeciesId: targetFish.id,
            targetName: targetFish.identity.name,
            requiredWeight: targetWeight,
            currentBestWeight: 0,
            difficulty: difficulty,
            rewards: this._calculateRewards(rng, difficulty, true) 
        };
    },

    _generateResearch(rng, speciesPool, playerLevel) {
        const targetFish = rng.pick(speciesPool);
        const targetLevel = rng.pick([2, 3]);
        const difficulty = targetLevel === 3 ? 4 : 2;

        return {
            type: 'research',
            title: `Research: ${targetFish.identity.name}`,
            desc: `The Scholar's Guild needs fresh data on the ${targetFish.identity.name}. Dissect them until you reach Bestiary Level ${targetLevel}.`,
            targetSpeciesId: targetFish.id,
            targetName: targetFish.identity.name,
            requiredKnowledgeLevel: targetLevel,
            currentKnowledgeLevel: 1, // <--- ADD THIS LINE (Fixes undefined)
            difficulty: difficulty,
            rewards: this._calculateRewards(rng, difficulty, true) 
        };
    },

    _generateBounty(rng, biomesPool, playerLevel) {
        const targetBiome = biomesPool.length > 0 ? rng.pick(biomesPool) : 'abyssal';
        
        // Bosses are fixed difficulty (very high)
        const difficulty = 8 + Math.floor(playerLevel * 0.5);

        return {
            type: 'bounty',
            title: `Bounty: Terror of the ${targetBiome.toUpperCase()}`,
            desc: `A massive, frenzied Boss is tearing up boats in the ${targetBiome}. Track it down and slay it.`,
            targetBiome: targetBiome,
            targetRarity: 'Boss',
            isComplete: false,
            difficulty: difficulty,
            rewards: this._calculateRewards(rng, difficulty, true) // Always massive rewards
        };
    },

    // --- HELPER: REWARD CALCULATOR ---

    _calculateRewards(rng, difficulty, prefersItemReward) {
        const gold = Math.round(BASE_GOLD_PER_DIFFICULTY * difficulty * rng.float(0.8, 1.2));
        const xp = Math.round(BASE_XP_PER_DIFFICULTY * difficulty * rng.float(0.9, 1.1));
        
        let item = null;
        
        if (difficulty >= 4 || (prefersItemReward && rng.chance(0.7))) {
            const rareParts =['part_phosphor_cap', 'part_wraith_silk', 'part_myconid_spore', 'part_jelly_bell'];
            item = {
                id: rng.pick(rareParts),
                qty: rng.int(1, Math.max(1, Math.floor(difficulty / 3)))
            };
        }

        return {
            gold: gold,
            xp: xp,
            item: item 
        };
    }
};