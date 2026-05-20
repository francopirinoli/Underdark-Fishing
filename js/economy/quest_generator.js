/**
 * js/economy/quest_generator.js
 * Procedural Quest Generator for Settlements.
 * V7 - Fixed Target Node logic and added Origin/Turn-In Tracking.
 */

import { createRng } from '../util/rng.js';
import { getFishPoolForNode } from '../data/fish_data_generator.js';
import { DialogueGenerator } from './dialogue_generator.js';

const BASE_GOLD_PER_DIFFICULTY = 50;
const BASE_XP_PER_DIFFICULTY = 25;

export const QuestGenerator = {

    generateQuestBoard(seed, playerLevel = 1, world, originNode) {
        // Fallback for older saves that didn't pass originNode
        if (!originNode) originNode = world.nodes[world.startY][world.startX];

        const masterRng = createRng(seed);
        const numQuests = masterRng.int(2, 4);
        const quests = [];

        for (let i = 0; i < numQuests; i++) {
            const qRng = createRng(seed + i * 1111);

            const targetX = qRng.int(0, world.width - 1);
            const targetY = qRng.int(0, world.height - 1);
            const targetNode = world.nodes[targetY][targetX];

            const speciesPool = getFishPoolForNode(world.seed, targetX, targetY, targetNode.biomeId);
            
            const typePool = ['hunt', 'hunt', 'trophy', 'research', 'courier', 'crafting'];
            
            const rollBounty = qRng.chance(0.2);
            if (playerLevel >= 2 || rollBounty) {
                typePool.push('bounty');
            }
            
            const questType = qRng.pick(typePool);
            let quest = null;

            if (questType === 'hunt') quest = this._generateHunt(qRng, speciesPool, playerLevel, targetNode, originNode);
            else if (questType === 'trophy') quest = this._generateTrophy(qRng, speciesPool, playerLevel, targetNode, originNode);
            else if (questType === 'research') quest = this._generateResearch(qRng, speciesPool, playerLevel, targetNode, originNode);
            else if (questType === 'bounty') quest = this._generateBounty(qRng, speciesPool, playerLevel, targetNode, originNode);
            else if (questType === 'courier') quest = this._generateCourier(qRng, playerLevel, originNode, world);
            else if (questType === 'crafting') quest = this._generateCrafting(qRng, playerLevel, originNode);

            if (quest) {
                quest.id = `quest_${seed}_${i}`;
                quest.flavorText = DialogueGenerator.getQuestFlavor(quest, qRng);
                quests.push(quest);
            }
        }
        return quests;
    },

    _generateHunt(rng, speciesPool, playerLevel, targetNode, originNode) {
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
            turnInNode: { x: originNode.x, y: originNode.y }, // <-- NEW
            turnInName: originNode.settlementName,            // <-- NEW
            requiredAmount: amount,
            currentAmount: 0,
            difficulty: difficulty,
            rewards: this._calculateRewards(rng, difficulty, false)
        };
    },

    _generateTrophy(rng, speciesPool, playerLevel, targetNode, originNode) {
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
            turnInNode: { x: originNode.x, y: originNode.y },
            turnInName: originNode.settlementName,
            requiredWeight: targetWeight,
            currentBestWeight: 0,
            difficulty: difficulty,
            rewards: this._calculateRewards(rng, difficulty, true) 
        };
    },

    _generateResearch(rng, speciesPool, playerLevel, targetNode, originNode) {
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
            turnInNode: { x: originNode.x, y: originNode.y },
            turnInName: originNode.settlementName,
            requiredKnowledgeLevel: targetLevel,
            difficulty: difficulty,
            rewards: this._calculateRewards(rng, difficulty, true) 
        };
    },

    _generateBounty(rng, speciesPool, playerLevel, targetNode, originNode) {
        const targetFish = rng.pick(speciesPool);
        let rarity = 'Rare', titlePrefix = 'Rogue', difficulty = 4;
        
        if (playerLevel >= 8) { rarity = 'Boss'; titlePrefix = 'Mythic'; difficulty = 10; } 
        else if (playerLevel >= 4) { rarity = 'Legendary'; titlePrefix = 'Terror'; difficulty = 7; }

        const depthHint = targetFish.environment.depthPref.toLowerCase();
        let timeHint = 'any time of day';
        if (targetFish.environment.activeHours === 'Diurnal') timeHint = 'during the day';
        else if (targetFish.environment.activeHours === 'Nocturnal') timeHint = 'in the dead of night';
        else if (targetFish.environment.activeHours === 'Crepuscular') timeHint = 'at dawn or dusk';
        
        const prefs = targetFish.lurePrefs;
        const stats = [
            { key: 'color', val: prefs.color, words: ['cold/blue', 'warm/red'] },
            { key: 'sound', val: prefs.sound, words: ['silent', 'loud/rattling'] },
            { key: 'light', val: prefs.light, words: ['dark', 'glowing'] },
            { key: 'weight', val: prefs.weight, words: ['lightweight', 'heavy/sinking'] }
        ].sort((a, b) => Math.abs(b.val) - Math.abs(a.val));
        
        const hint1 = stats[0].val < 0 ? stats[0].words[0] : stats[0].words[1];
        const hint2 = stats[1].val < 0 ? stats[1].words[0] : stats[1].words[1];

        return {
            type: 'bounty',
            title: `Bounty: ${titlePrefix} ${targetFish.identity.name}`,
            desc: `A massive, frenzied ${targetFish.identity.name} is tearing up boats in ${targetNode.name}. Witnesses say it strikes near the <b>${depthHint}</b>, mostly <b>${timeHint}</b>, and seems drawn to <b>${hint1}</b> and <b>${hint2}</b> lures.`,
            targetSpeciesId: targetFish.id,
            targetName: targetFish.identity.name,
            targetNode: { x: targetNode.x, y: targetNode.y },
            turnInNode: { x: originNode.x, y: originNode.y },
            turnInName: originNode.settlementName,
            targetRarity: rarity,
            isComplete: false,
            difficulty: difficulty,
            rewards: this._calculateRewards(rng, difficulty, true)
        };
    },

    _generateCourier(rng, playerLevel, originNode, world) {
        const validDests = [];
        for (let y = 0; y < world.height; y++) {
            for (let x = 0; x < world.width; x++) {
                const node = world.nodes[y][x];
                if (node.hasSettlement && (node.x !== originNode.x || node.y !== originNode.y)) {
                    validDests.push(node);
                }
            }
        }
        
        if (validDests.length === 0) return null; 

        const destNode = rng.pick(validDests);
        const distance = Math.abs(destNode.x - originNode.x) + Math.abs(destNode.y - originNode.y);
        
        const timeLimitMins = (distance * 25) + 30; 
        const difficulty = Math.max(2, Math.floor(distance / 2) + 1);

        return {
            type: 'courier',
            title: `Express Delivery: ${destNode.settlementName}`,
            desc: `Deliver a sealed, highly perishable package to the Tavern in <b>${destNode.settlementName}</b>.<br><br><span style="color:var(--gold-warn);">Time Limit: ${timeLimitMins} Minutes. The timer will start ticking the moment you depart.</span>`,
            targetName: `package to ${destNode.settlementName}`,
            targetNode: { x: destNode.x, y: destNode.y }, 
            turnInNode: { x: destNode.x, y: destNode.y }, // Destination is the turn-in!
            turnInName: destNode.settlementName,
            timeRemaining: timeLimitMins,
            maxTime: timeLimitMins,
            isFailed: false,
            difficulty: difficulty,
            rewards: this._calculateRewards(rng, difficulty, false)
        };
    },

    _generateCrafting(rng, playerLevel, originNode) {
        const stats = ['color', 'sound', 'light', 'weight'];
        const numStatsToCheck = rng.pick([1, 2]); 
        const requirements = [];
        const descParts = [];

        for (let i = stats.length - 1; i > 0; i--) {
            const j = rng.int(0, i);
            [stats[i], stats[j]] = [stats[j], stats[i]];
        }

        for (let i = 0; i < numStatsToCheck; i++) {
            const stat = stats[i];
            const targetVal = rng.int(-40, 40); 
            const minVal = Math.max(-100, targetVal - 20);
            const maxVal = Math.min(100, targetVal + 20);
            
            requirements.push({ stat: stat, min: minVal, max: maxVal });
            
            let adjective = "";
            if (stat === 'color') adjective = targetVal < 0 ? "Cold/Blue" : "Warm/Red";
            else if (stat === 'sound') adjective = targetVal < 0 ? "Silent" : "Loud";
            else if (stat === 'light') adjective = targetVal < 0 ? "Dark" : "Glowing";
            else if (stat === 'weight') adjective = targetVal < 0 ? "Lightweight" : "Heavy";

            const statNameCap = stat.charAt(0).toUpperCase() + stat.slice(1);
            descParts.push(`<b>${adjective} ${statNameCap}</b> (${minVal} to ${maxVal})`);
        }

        const difficulty = numStatsToCheck === 1 ? 2 : 4; 

        return {
            type: 'crafting',
            title: `Artisan Request: Custom Lure`,
            desc: `A picky local angler lacks the alchemy skills to make the right lure. Use the Crafting Bench to build them a custom lure that has:<br><br><span style="color:var(--cyan-glow);">${descParts.join(' <br>AND ')}</span>.`,
            targetName: `Custom Lure`,
            targetNode: { x: originNode.x, y: originNode.y }, // Yellow ! marker stays on settlement
            turnInNode: { x: originNode.x, y: originNode.y }, // Green ✓ marker on settlement
            turnInName: originNode.settlementName,
            requirements: requirements,
            difficulty: difficulty,
            rewards: this._calculateRewards(rng, difficulty, false)
        };
    },

    _calculateRewards(rng, difficulty, prefersItemReward) {
        const gold = Math.round(BASE_GOLD_PER_DIFFICULTY * difficulty * rng.float(0.8, 1.2));
        const xp = Math.round(BASE_XP_PER_DIFFICULTY * difficulty * rng.float(0.9, 1.1));
        let item = null;
        const rollItem = rng.chance(0.7); 
        if (difficulty >= 4 || (prefersItemReward && rollItem)) {
            const rareParts = ['part_phosphor_cap', 'part_wraith_silk', 'part_myconid_spore', 'part_jelly_bell'];
            item = { id: rng.pick(rareParts), qty: rng.int(1, Math.max(1, Math.floor(difficulty / 3))) };
        }
        return { gold: gold, xp: xp, item: item };
    }
};