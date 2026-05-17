/**
 * js/economy/quest_generator.js
 * Procedural Quest Generator for Settlements.
 * V4 - Overhauled Bounty Quests to provide actionable intel and scalable difficulty.
 */

import { createRng } from '../util/rng.js';
import { getFishPoolForNode } from '../data/fish_data_generator.js';

const BASE_GOLD_PER_DIFFICULTY = 50;
const BASE_XP_PER_DIFFICULTY = 25;

export const QuestGenerator = {

    generateQuestBoard(seed, playerLevel = 1, world) {
        const rng = createRng(seed);
        const numQuests = rng.int(2, 4);
        const quests = [];

        for (let i = 0; i < numQuests; i++) {
            // Pick a random node on the map to be the target location!
            const targetX = rng.int(0, world.width - 1);
            const targetY = rng.int(0, world.height - 1);
            const targetNode = world.nodes[targetY][targetX];

            // Get the TRUE ecosystem for that specific node
            const speciesPool = getFishPoolForNode(world.seed, targetX, targetY, targetNode.biomeId);
            
            const typePool = ['hunt', 'hunt', 'trophy', 'research'];
            // Bounties are now more accessible since difficulty scales properly
            if (playerLevel >= 2 || rng.chance(0.2)) typePool.push('bounty');
            
            const questType = rng.pick(typePool);
            let quest = null;

            if (questType === 'hunt') quest = this._generateHunt(rng, speciesPool, playerLevel, targetNode);
            else if (questType === 'trophy') quest = this._generateTrophy(rng, speciesPool, playerLevel, targetNode);
            else if (questType === 'research') quest = this._generateResearch(rng, speciesPool, playerLevel, targetNode);
            else if (questType === 'bounty') quest = this._generateBounty(rng, speciesPool, playerLevel, targetNode); // <-- UPDATED

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
        const difficulty = Math.max(1, Math.round((amount * 0.5) + (playerLevel * 0.2)));

        return {
            type: 'hunt',
            title: `Hunt: ${targetFish.identity.name}`,
            desc: `The town requires a steady supply of ${targetFish.identity.name} from ${targetNode.name}. Bring back ${amount}.`,
            targetSpeciesId: targetFish.id,
            targetName: targetFish.identity.name,
            targetNode: { x: targetNode.x, y: targetNode.y }, 
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

    // --- NEW: MONSTER HUNTER BOUNTY LOGIC ---
    _generateBounty(rng, speciesPool, playerLevel, targetNode) {
        const targetFish = rng.pick(speciesPool);
        
        // 1. Scale Rarity based on Player Level
        let rarity = 'Rare';
        let titlePrefix = 'Rogue';
        let difficulty = 4;
        
        if (playerLevel >= 8) {
            rarity = 'Boss';
            titlePrefix = 'Mythic';
            difficulty = 10;
        } else if (playerLevel >= 4) {
            rarity = 'Legendary';
            titlePrefix = 'Terror';
            difficulty = 7;
        }

        // 2. Generate Actionable Lore/Hints for the description
        const depthHint = targetFish.environment.depthPref.toLowerCase();
        
        let timeHint = 'any time of day';
        if (targetFish.environment.activeHours === 'Diurnal') timeHint = 'during the day';
        else if (targetFish.environment.activeHours === 'Nocturnal') timeHint = 'in the dead of night';
        else if (targetFish.environment.activeHours === 'Crepuscular') timeHint = 'at dawn or dusk';
        
        // 3. Find the two strongest lure preferences to give the player a clue
        const prefs = targetFish.lurePrefs;
        const stats = [
            { key: 'color', val: prefs.color, words: ['cold/blue', 'warm/red'] },
            { key: 'sound', val: prefs.sound, words: ['silent', 'loud/rattling'] },
            { key: 'light', val: prefs.light, words: ['dark', 'glowing'] },
            { key: 'weight', val: prefs.weight, words: ['lightweight', 'heavy/sinking'] }
        ];
        
        // Sort by absolute intensity descending (so we pick the things the fish cares about most)
        stats.sort((a, b) => Math.abs(b.val) - Math.abs(a.val));
        
        const hint1 = stats[0].val < 0 ? stats[0].words[0] : stats[0].words[1];
        const hint2 = stats[1].val < 0 ? stats[1].words[0] : stats[1].words[1];

        return {
            type: 'bounty',
            title: `Bounty: ${titlePrefix} ${targetFish.identity.name}`,
            desc: `A massive, frenzied ${targetFish.identity.name} is tearing up boats in ${targetNode.name}. Witnesses say it strikes near the <b>${depthHint}</b>, mostly <b>${timeHint}</b>, and seems drawn to <b>${hint1}</b> and <b>${hint2}</b> lures.`,
            targetSpeciesId: targetFish.id,
            targetName: targetFish.identity.name,
            targetNode: { x: targetNode.x, y: targetNode.y },
            targetRarity: rarity,
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
            const rareParts = ['part_phosphor_cap', 'part_wraith_silk', 'part_myconid_spore', 'part_jelly_bell'];
            item = { id: rng.pick(rareParts), qty: rng.int(1, Math.max(1, Math.floor(difficulty / 3))) };
        }
        return { gold: gold, xp: xp, item: item };
    }
};