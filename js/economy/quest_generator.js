/**
 * js/economy/quest_generator.js
 * Procedural Quest Generator for Settlements.
 * V3 - Fixes NaN bugs and points quests to specific map nodes.
 */

import { createRng } from '../util/rng.js';
import { getFishPoolForNode } from '../data/fish_data_generator.js';

const BASE_GOLD_PER_DIFFICULTY = 50;
const BASE_XP_PER_DIFFICULTY = 25;

export const QuestGenerator = {

    generateQuestBoard(seed, playerLevel = 1, world) {
        const rng = createRng(seed);
        const numQuests = rng.int(2, 4);
        const quests =[];

        for (let i = 0; i < numQuests; i++) {
            // Pick a random node on the map to be the target location!
            const targetX = rng.int(0, world.width - 1);
            const targetY = rng.int(0, world.height - 1);
            const targetNode = world.nodes[targetY][targetX];

            // Get the TRUE ecosystem for that specific node
            const speciesPool = getFishPoolForNode(world.seed, targetX, targetY, targetNode.biomeId);
            
            const typePool = ['hunt', 'hunt', 'trophy', 'research'];
            if (playerLevel >= 3 || rng.chance(0.1)) typePool.push('bounty');
            
            const questType = rng.pick(typePool);
            let quest = null;

            if (questType === 'hunt') quest = this._generateHunt(rng, speciesPool, playerLevel, targetNode);
            else if (questType === 'trophy') quest = this._generateTrophy(rng, speciesPool, playerLevel, targetNode);
            else if (questType === 'research') quest = this._generateResearch(rng, speciesPool, playerLevel, targetNode);
            else if (questType === 'bounty') quest = this._generateBounty(rng, playerLevel, targetNode);

            if (quest) {
                quest.id = `quest_${rng.int(10000, 99999)}`;
                quests.push(quest);
            }
        }
        return quests;
    },

    _generateHunt(rng, speciesPool, playerLevel, targetNode) {
        const targetFish = rng.pick(speciesPool);
        const amount = rng.int(2, 6);
        // Difficulty now relies on amount requested and player level, avoiding undefined rarities
        const difficulty = Math.max(1, Math.round((amount * 0.5) + (playerLevel * 0.2)));

        return {
            type: 'hunt',
            title: `Hunt: ${targetFish.identity.name}`,
            desc: `The town requires a steady supply of ${targetFish.identity.name} from ${targetNode.name}. Bring back ${amount}.`,
            targetSpeciesId: targetFish.id,
            targetName: targetFish.identity.name,
            targetNode: { x: targetNode.x, y: targetNode.y }, // Attach exact node!
            requiredAmount: amount,
            currentAmount: 0,
            difficulty: difficulty,
            rewards: this._calculateRewards(rng, difficulty, false)
        };
    },

    _generateTrophy(rng, speciesPool, playerLevel, targetNode) {
        const targetFish = rng.pick(speciesPool);
        const minW = targetFish.physical.weightRange.min;
        const maxW = targetFish.physical.weightRange.max;
        const meanW = minW + (maxW - minW) * 0.45;
        const targetWeight = Number((meanW + (maxW - meanW) * rng.float(0.7, 0.95)).toFixed(2));
        
        const difficulty = Math.max(2, Math.round(3 + (playerLevel * 0.5)));

        return {
            type: 'trophy',
            title: `Trophy: Giant ${targetFish.identity.name}`,
            desc: `An angler claims no one can catch a ${targetFish.identity.name} heavier than ${targetWeight}kg in ${targetNode.name}. Prove them wrong.`,
            targetSpeciesId: targetFish.id,
            targetName: targetFish.identity.name,
            targetNode: { x: targetNode.x, y: targetNode.y },
            requiredWeight: targetWeight,
            currentBestWeight: 0,
            difficulty: difficulty,
            rewards: this._calculateRewards(rng, difficulty, true) 
        };
    },

    _generateResearch(rng, speciesPool, playerLevel, targetNode) {
        const targetFish = rng.pick(speciesPool);
        const targetLevel = rng.pick([2, 3]);
        const difficulty = targetLevel === 3 ? 4 : 2;

        return {
            type: 'research',
            title: `Research: ${targetFish.identity.name}`,
            desc: `The Scholar's Guild needs fresh data on the ${targetFish.identity.name} living in ${targetNode.name}. Dissect them until Bestiary Level ${targetLevel}.`,
            targetSpeciesId: targetFish.id,
            targetName: targetFish.identity.name,
            targetNode: { x: targetNode.x, y: targetNode.y },
            requiredKnowledgeLevel: targetLevel,
            difficulty: difficulty,
            rewards: this._calculateRewards(rng, difficulty, true) 
        };
    },

    _generateBounty(rng, playerLevel, targetNode) {
        const difficulty = 8 + Math.floor(playerLevel * 0.5);

        return {
            type: 'bounty',
            title: `Bounty: Terror of ${targetNode.name}`,
            desc: `A massive, frenzied Boss is tearing up boats in ${targetNode.name}. Track it down and slay it.`,
            targetBiome: targetNode.biomeId,
            targetNode: { x: targetNode.x, y: targetNode.y },
            targetRarity: 'Boss',
            isComplete: false,
            difficulty: difficulty,
            rewards: this._calculateRewards(rng, difficulty, true)
        };
    },

    _calculateRewards(rng, difficulty, prefersItemReward) {
        const gold = Math.round(BASE_GOLD_PER_DIFFICULTY * difficulty * rng.float(0.8, 1.2));
        const xp = Math.round(BASE_XP_PER_DIFFICULTY * difficulty * rng.float(0.9, 1.1));
        let item = null;
        if (difficulty >= 4 || (prefersItemReward && rng.chance(0.7))) {
            const rareParts =['part_phosphor_cap', 'part_wraith_silk', 'part_myconid_spore', 'part_jelly_bell'];
            item = { id: rng.pick(rareParts), qty: rng.int(1, Math.max(1, Math.floor(difficulty / 3))) };
        }
        return { gold: gold, xp: xp, item: item };
    }
};