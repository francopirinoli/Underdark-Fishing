/**
 * js/events/tournament_event.js
 * Manages the daily spawning and persistence of Fishing Tournaments.
 */
import { createRng } from '../util/rng.js';
import { generateName } from '../data/npc_data_generator.js';
import { getFishPoolForNode } from '../data/fish_data_generator.js';

export const TournamentEvent = {
    activeNodes: {}, // Dictionary mapping "x,y" to tournament data

    onNewDay(day, world) {
        const rng = createRng(world.seed + day * 8888);
        const newNodes = {};

        // 1. Persist active tournaments the player hasn't fully completed yet.
        // If the day rolls over but you are still competing or haven't claimed your prize, the event stays.
        for (const key in this.activeNodes) {
            const t = this.activeNodes[key];
            if (t.isPlayerParticipating && !t.hasClaimedReward) {
                newNodes[key] = t;
            }
        }

        // 2. Find valid nodes (Must have 3 or 4 exits, not abyssal, and not already persisted)
        const validNodes =[];
        for (let y = 0; y < world.height; y++) {
            for (let x = 0; x < world.width; x++) {
                const node = world.nodes[y][x];
                if (node.biomeId === 'abyssal') continue;
                
                let exitCount = 0;
                if (node.exits.n) exitCount++;
                if (node.exits.s) exitCount++;
                if (node.exits.e) exitCount++;
                if (node.exits.w) exitCount++;

                if (exitCount >= 3 && !newNodes[`${x},${y}`]) {
                    validNodes.push(node);
                }
            }
        }

        // 3. Spawn 2 to 4 new tournaments randomly
        const numToSpawn = Math.min(validNodes.length, rng.int(2, 4));
        let spawned = 0;

        // Shuffle the valid nodes deterministically
        for (let i = validNodes.length - 1; i > 0; i--) {
            const j = rng.int(0, i);
            [validNodes[i], validNodes[j]] = [validNodes[j], validNodes[i]];
        }

        for (let i = 0; i < numToSpawn; i++) {
            const node = validNodes[i];
            const key = `${node.x},${node.y}`;
            newNodes[key] = this._generateTournament(node, world.seed, rng);
            spawned++;
        }

        this.activeNodes = newNodes;
        console.log(`[Event] ${spawned} Fishing Tournaments spawned.`);
    },

    _generateTournament(node, worldSeed, rng) {
        const objectives = ['heavyweight', 'trophy', 'specialist', 'high_roller'];
        const objectiveType = rng.pick(objectives);
        
        // Entry fee between 100g and 250g
        const entryFee = rng.int(10, 25) * 10; 
        
        let targetSpeciesId = null;
        let targetSpeciesName = null;
        
        // If it's a Specialist tournament, pick a random fish native to THIS specific cave
        if (objectiveType === 'specialist') {
            const pool = getFishPoolForNode(worldSeed, node.x, node.y, node.biomeId);
            const target = rng.pick(pool);
            targetSpeciesId = target.id;
            targetSpeciesName = target.identity.name;
        }

        // Generate 3 AI Competitors
        const competitors =[];
        for (let i = 0; i < 3; i++) {
            const race = rng.pick(['Human', 'Dwarf', 'Elf', 'Orc']);
            const gender = rng.pick(['Male', 'Female']);
            const name = generateName(race, gender, rng);
            
            // Base score scaling depending on objective
            let finalScore = 0;
            if (objectiveType === 'heavyweight') finalScore = rng.float(20, 150); // Total kg
            else if (objectiveType === 'trophy') finalScore = rng.float(15, 60); // Single heaviest kg
            else if (objectiveType === 'specialist') finalScore = rng.int(2, 8); // Total count
            else if (objectiveType === 'high_roller') finalScore = rng.int(150, 800); // Total gold value
            
            // Format decimal scores to 2 places for cleanliness
            if (objectiveType === 'heavyweight' || objectiveType === 'trophy') {
                finalScore = Number(finalScore.toFixed(2));
            }

            // currentScore will be linearly interpolated over the 5 minutes in game.js
            competitors.push({ name, race, gender, finalScore, currentScore: 0 });
        }
        
        // Sort competitors by final score descending so we always know the threshold to beat
        competitors.sort((a, b) => b.finalScore - a.finalScore);

        return {
            x: node.x,
            y: node.y,
            objectiveType,
            targetSpeciesId,
            targetSpeciesName,
            entryFee,
            competitors,
            // Live player state
            isPlayerParticipating: false,
            playerScore: 0,
            timeRemaining: 300, // 5 minutes (in seconds)
            isFinished: false,
            hasClaimedReward: false
        };
    },

getTournament(x, y) {
        return this.activeNodes[`${x},${y}`] || null;
    },

    // --- NEW HELPER ---
    getLiveCompetitors(tournament) {
        const totalDuration = 300; // 5 minutes
        const elapsed = Math.max(0, totalDuration - tournament.timeRemaining);
        const progress = elapsed / totalDuration;
        
        // Calculate current interpolated scores
        return tournament.competitors.map(c => {
            let current = c.finalScore * progress;
            if (tournament.objectiveType === 'heavyweight' || tournament.objectiveType === 'trophy') {
                current = Number(current.toFixed(2));
            } else {
                current = Math.floor(current);
            }
            return { ...c, currentScore: current };
        }).sort((a, b) => b.currentScore - a.currentScore);
    },

    getSaveData() { return this.activeNodes; },
    loadSaveData(data) { this.activeNodes = data || {}; }
};