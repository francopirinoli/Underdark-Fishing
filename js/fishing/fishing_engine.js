/**
 * js/fishing/fishing_engine.js
 * The core physics and AI state machine for the fishing minigame.
 * V9 - Second Wind, Self-Preservation AI, and Fixed Stamina Math.
 */

import { getRandomInRange, clamp } from '../util/utils.js';

// Define how the fish behaves physically in each state
const BEHAVIORS = {
    // targetSweet: The required Drag setting (Reel Power) to avoid line snaps.
    HOLD:        { pullMult: 0.1, drainMult: -0.8, targetSweet: [80, 100], invincible: false }, // Resting: Recovers stamina. Crank drag and pull!
    RUN:         { pullMult: 1.4, drainMult: 1.8,  targetSweet: [15, 35],  invincible: false }, // Fleeing: Burns stamina fast. Drop drag or line snaps!
    THRASH:      { pullMult: 0.8, drainMult: 1.2,  targetSweet: 'wobble',  invincible: false }, // Panicking: Unpredictable jerks.
    BURST:       { pullMult: 2.5, drainMult: 2.5,  targetSweet: [10, 20],  invincible: false }, // Violent jerk: Drop drag immediately!
    INANIMATE:   { pullMult: 0.0, drainMult: 0.0,  targetSweet: [50, 60],  invincible: false }, // For treasure chests
    SECOND_WIND: { pullMult: 0.4, drainMult: 0.0,  targetSweet: [40, 60],  invincible: true  }  // Special 0 HP state. Massive regen, immune to reel damage.
};

export const FishingEngine = {
    phase: 'IDLE', 

    playerStats: null,
    fishPool: [],
    fishData: null, 
    lureStats: null,

    // Depth & Physics Mechanics
    currentDepth: 0,
    targetDepth: 0,
    maxDepth: 20,
    waterCurrent: 0, 
    
    // Core Minigame Vitals
    tension: 0,
    maxTension: 100,
    fishStamina: 0,
    maxFishStamina: 0,
    playerStamina: 0,
    maxPlayerStamina: 0,
    playerStaminaRegen: 0, 
    playerStaminaDelayTimer: 0, 
    catchProgress: 0, 
    
    // Dynamic Sweet Spot Mechanics (The Drag Dial)
    reelPower: 50,      
    currentSweetSpot: 50, 
    targetSweetSpot: 50,  
    inSweetSpot: false, 
    
    currentTimeMins: 480, 
    hookTimerMs: 0,
    fightTimer: 0,    
    maxFightTimer: 0,
    
    ai: { state: 'HOLD', timer: 0, aggression: 0, isResting: false },

    startCast(effectivePlayerStats, rawPlayerStaminaStat, fishPool, maxDepth, currentTimeMins = 480) {
        this.playerStats = effectivePlayerStats;
        this.lureStats = effectivePlayerStats.activeLure;
        this.fishPool = fishPool;
        this.fishData = null;

        this.maxDepth = maxDepth;
        this.currentDepth = 0; 
        this.targetDepth = 0;
        this.waterCurrent = 0;
        this.currentTimeMins = currentTimeMins; 

        this.maxPlayerStamina = this.playerStats.minigame.stamina;
        this.playerStamina = this.maxPlayerStamina;
        
        // Base regeneration
        this.playerStaminaRegen = 15 + (rawPlayerStaminaStat * 5); 
        this.playerStaminaDelayTimer = 0;

        this.maxTension = this.playerStats.minigame.maxTension;
        this.tension = 0;
        this.catchProgress = 0;
        
        this.reelPower = 50;      
        this.currentSweetSpot = 50; 
        this.targetSweetSpot = 50;  
        this.inSweetSpot = false; 
        
        this.phase = 'SINKING';
        this.ai.isResting = false;
    },

    scrollDepth(delta) {
        if (this.phase === 'SINKING') {
            this.targetDepth = clamp(this.targetDepth + delta, 0, this.maxDepth);
        }
    },

    scrollReelPower(delta) {
        const baseIncrement = 1.0; 
        const speedMult = this.playerStats.minigame.reelScrollSpeed || 1.0;
        const normalizedDelta = delta / 100; 
        const scrollAmount = -normalizedDelta * baseIncrement * speedMult;
        this.reelPower = clamp(this.reelPower + scrollAmount, 10, 100);
    },

    getDepthZone() {
        const pct = this.currentDepth / this.maxDepth;
        if (pct < 0.33) return 'Surface';
        if (pct < 0.66) return 'Mid-water';
        return 'Bottom-feeder';
    },

    evaluateBite() {
        if (this.phase !== 'SINKING') return false;

        const currentZone = this.getDepthZone();
        const lure = this.lureStats;
        const currentHour = this.currentTimeMins / 60; 
        let validCandidates = [];

        for (const fish of this.fishPool) {
            if (fish.environment.depthPref !== currentZone) continue;

            const activeHours = fish.environment.activeHours;
            let isActive = false;
            
            if (activeHours === 'Always Active') isActive = true;
            else if (activeHours === 'Diurnal') isActive = (currentHour >= 6 && currentHour < 18); 
            else if (activeHours === 'Nocturnal') isActive = (currentHour >= 18 || currentHour < 6); 
            else if (activeHours === 'Crepuscular') isActive = ((currentHour >= 4 && currentHour <= 8) || (currentHour >= 16 && currentHour <= 20)); 

            const prefs = fish.lurePrefs;
            const totalDiff = Math.abs(prefs.color - lure.color) + Math.abs(prefs.sound - lure.sound) + Math.abs(prefs.light - lure.light) + Math.abs(prefs.weight - lure.weight);
            const maxAllowedDiff = prefs.tolerance * 800 * (isActive ? 1.0 : 0.5);

            if (totalDiff <= maxAllowedDiff) {
                let matchScore = 1.0 - (totalDiff / maxAllowedDiff);
                if (!isActive) matchScore *= 0.15; 
                validCandidates.push({ fish, matchScore });
            }
        }

        if (validCandidates.length === 0) {
            this.phase = 'IDLE'; 
            return false;
        }

        const chestCandidate = validCandidates.find(c => c.fish.invType === 'chest_encounter');
        if (chestCandidate) {
            this.fishData = chestCandidate.fish;
            this.phase = 'BITE';
            this.hookTimerMs = this.fishData.combat.hookWindowMs + this.playerStats.minigame.hookWindowMs;
            return true;
        }

        validCandidates.sort((a, b) => b.matchScore - a.matchScore);

        let selectedCandidate = validCandidates[0];
        for (const candidate of validCandidates) {
            if (Math.random() < 0.7) {
                selectedCandidate = candidate;
                break;
            }
        }

        this.fishData = selectedCandidate.fish;
        this.phase = 'BITE';
        this.hookTimerMs = this.fishData.combat.hookWindowMs + this.playerStats.minigame.hookWindowMs;
        
        return true;
    },

    attemptHook() {
        if (this.phase === 'BITE') {
            this.phase = 'FIGHT';
            this.fishStamina = this.fishData.combat.stamina;
            this.maxFishStamina = this.fishData.combat.stamina;
            
            // Battles now last longer, scaled properly to endurance mechanics
            this.maxFightTimer = 25 + ((100 - this.fishData.combat.speed) * 0.3) + (this.fishData.combat.stamina * 0.1);
            this.fightTimer = this.maxFightTimer;

            this.ai.aggression = this.fishData.combat.aggression;
            this.ai.state = 'RUN';
            this.ai.timer = 2.0; 
            this.ai.isResting = false;
            
            this.tension = this.maxTension * 0.2; 
            return true;
        }
        return false;
    },

    update(dt, isReeling) {
        this.waterCurrent = Math.sin(Date.now() / 1500) * 1.5;

        if (this.phase === 'SINKING') {
            const lerpSpeed = 3.0; 
            this.currentDepth += (this.targetDepth - this.currentDepth) * lerpSpeed * dt;
            return;
        }

        if (this.phase === 'BITE') {
            this.hookTimerMs -= (dt * 1000);
            if (this.hookTimerMs <= 0) this.phase = 'ESCAPED';
            return;
        }

        if (this.phase !== 'FIGHT') return;

        this.fightTimer -= dt;
        if (this.fightTimer <= 0) {
            this.phase = 'ESCAPED';
            return;
        }

        this._updateFishAI(dt, isReeling);
        this._applyPhysics(dt, isReeling);
        this._checkEndConditions();
    },

    _updateFishAI(dt, isReeling) {
        if (this.fishData.combat.aggression === 0) {
            this.ai.state = 'INANIMATE';
            return;
        }

        // --- NEW 1: SECOND WIND (0% Stamina Preservation) ---
        if (this.fishStamina <= 0 && this.ai.state !== 'SECOND_WIND') {
            this.ai.state = 'SECOND_WIND';
            // Duration scales slightly with fish base stamina (Bosses get longer second winds)
            this.ai.timer = 1.5 + (this.fishData.combat.stamina / 250);
            this.targetSweetSpot = getRandomInRange(40, 60);
            return;
        }

        this.ai.timer -= dt;
        if (this.ai.timer <= 0) {
            const aggro = this.fishData.combat.aggression;
            const tensionPct = this.tension / this.maxTension;
            const slack = (!isReeling && this.reelPower < 30);
            const fishStamPct = this.fishStamina / this.maxFishStamina;

            // --- NEW 2: SELF PRESERVATION (The 30% -> 50% Rule) ---
            if (fishStamPct <= 0.3) this.ai.isResting = true;
            if (fishStamPct >= 0.5) this.ai.isResting = false;

            let nextState = 'HOLD';
            let duration = getRandomInRange(1.0, 2.5);

            if (this.ai.state === 'SECOND_WIND') {
                // Coming out of second wind, fish is desperate
                nextState = Math.random() < 0.5 ? 'THRASH' : 'RUN';
                duration = getRandomInRange(1.0, 2.0);
            }
            else if (this.ai.isResting) {
                // Desperately trying to rest
                if (tensionPct > 0.8) {
                    // Panic if pulled too hard while trying to recover
                    nextState = 'THRASH'; 
                    duration = getRandomInRange(0.5, 1.0);
                } else {
                    // Refuses to run, just holds steady to regain energy
                    nextState = 'HOLD'; 
                    duration = getRandomInRange(1.5, 3.0);
                }
            } 
            else if (tensionPct > 0.85) {
                // High tension: Panic!
                nextState = Math.random() < 0.6 ? 'THRASH' : 'BURST';
                duration = getRandomInRange(0.5, 1.2);
            } 
            else if (slack) {
                // Slack line: Seize the chance to run
                nextState = 'RUN';
                duration = getRandomInRange(2.0, 4.0);
            } 
            else {
                // Standard behavior cycle based on aggression stat
                const roll = Math.random();
                if (roll < 0.1 * aggro) nextState = 'BURST';
                else if (roll < 0.4 * aggro) nextState = 'THRASH';
                else if (roll < 0.7 + (0.2 * aggro)) nextState = 'RUN';
                else nextState = 'HOLD';
            }

            this.ai.state = nextState;
            this.ai.timer = duration;
        }

        // Set the Sweet Spot (Target Drag) based on the current AI state
        if (this.ai.state === 'THRASH') {
            if (Math.random() < 10 * dt) this.targetSweetSpot = getRandomInRange(20, 90);
        } else {
            const range = BEHAVIORS[this.ai.state].targetSweet;
            if (range && range !== 'wobble') {
                this.targetSweetSpot = getRandomInRange(range[0], range[1]);
            }
        }
    },

    _applyPhysics(dt, isReeling) {
        const behavior = BEHAVIORS[this.ai.state];
        const fishSpeed = this.fishData.combat.speed;
        const fishStamPct = this.fishStamina / this.maxFishStamina;

        // --- 1. SWEET SPOT (DRAG) INTERPOLATION ---
        const shiftSpeed = (this.ai.state === 'BURST') ? 15.0 : 4.0;
        this.currentSweetSpot += (this.targetSweetSpot - this.currentSweetSpot) * shiftSpeed * dt;
        this.currentSweetSpot = clamp(this.currentSweetSpot, 10, 100);

        const tol = this.playerStats.minigame.sweetSpotTolerance;
        const powerDiff = this.reelPower - this.currentSweetSpot;
        this.inSweetSpot = Math.abs(powerDiff) <= tol;

        const dragNorm = clamp(this.reelPower / 100, 0.1, 1.0);

        // --- 2. PLAYER EXHAUSTION MECHANIC ---
        const playerExhausted = this.playerStamina <= 0;
        const effectiveRodPower = playerExhausted ? (this.playerStats.minigame.power * 0.25) : this.playerStats.minigame.power;
        const tensionPenalty = playerExhausted ? 2.0 : 1.0;

// --- 3. ELASTIC TENSION MATH ---
        let tensionDelta = 0;
        const baseFishPull = fishSpeed * behavior.pullMult;

        if (isReeling) {
            this.playerStaminaDelayTimer = 1.0; 
            
            // BALANCE FIX: Lowered base tension build rate (was 1.5 and 0.5)
            let tensionBuild = (baseFishPull * dragNorm * 1.3) + (this.reelPower * 0.35);
            
            if (!this.inSweetSpot) {
                const overpull = Math.max(0, Math.abs(powerDiff) - tol) / 50;
                // BALANCE FIX: Softened the penalty for missing the sweet spot (was 3.0, now 2.2)
                tensionBuild *= (1.0 + Math.pow(overpull, 1.5) * 2.2); 
            } else {
                tensionBuild *= 0.6; 
            }

            tensionDelta = tensionBuild * tensionPenalty;
        } else {
            this.playerStaminaDelayTimer -= dt;
            const flex = this.playerStats.minigame.flexibility;
            
            // BALANCE FIX: Increased base tension decay (was 40, now 60). 
            // Tension now drops 50% faster when you let go of the reel!
            const tensionDecay = 60 * flex * (1.1 - dragNorm);
            const passivePullTension = baseFishPull * dragNorm * 0.5;
            
            tensionDelta = passivePullTension - tensionDecay;
        }

        const maxTensionDelta = this.maxTension * 0.8;
        tensionDelta = clamp(tensionDelta, -maxTensionDelta, maxTensionDelta);
        this.tension = clamp(this.tension + tensionDelta * dt, 0, this.maxTension + 5);

        // --- 4. STAMINA DRAIN ---
        
        // Player (FIXED: Now properly calculates based on line resistance)
        if (isReeling) {
            const resistance = Math.max(1.0, behavior.pullMult); 
            const drainRate = 25 * resistance * Math.pow(dragNorm + 0.2, 1.2); 
            this.playerStamina -= drainRate * dt;
        } else if (this.playerStaminaDelayTimer <= 0) {
            this.playerStamina += this.playerStaminaRegen * dt;
        }
        this.playerStamina = clamp(this.playerStamina, 0, this.maxPlayerStamina);

        // Fish (The "Armor" & "Second Wind" mechanics)
        let fishDrain = 0;
        
        if (behavior.invincible) {
            // SECOND WIND: Massive 15% Max HP regen per second!
            fishDrain = -(this.maxFishStamina * 0.15); 
        } else if (behavior.drainMult > 0) {
            // Running against drag
            fishDrain = behavior.drainMult * 12 * dragNorm; 
        } else {
            // Normal Rest
            fishDrain = behavior.drainMult * 5; 
            const regenBoost = (this.maxFishStamina * 0.03);
            fishDrain -= regenBoost; // Additional passive regen based on max health
        }
        
        // Reeling in the sweet spot damages fish stamina (if not invincible)
        if (isReeling && this.inSweetSpot && !behavior.invincible) {
            fishDrain += 18 * effectiveRodPower;
        }

        this.fishStamina -= fishDrain * dt;
        this.fishStamina = clamp(this.fishStamina, 0, this.maxFishStamina);


        // --- 5. CATCH PROGRESS (The True Tug-of-War) ---
        const escapeSpeed = baseFishPull * (1.1 - dragNorm) * 0.25;
        
        if (!isReeling) {
            this.catchProgress -= escapeSpeed * dt;
            if (this.catchProgress <= 5) this.fightTimer -= dt * 2.0;
        } else {
            // Fish Stamina acts as Armor. 
            // FIX: During Second Wind, the fish is limp and easy to pull, but it is regenerating rapidly!
            // This gives you a frantic window to haul it in before it fully wakes up.
            const armorFactor = behavior.invincible ? 1.0 : 1.0 + (fishStamPct * 4.0);
            
            let pullSpeed = (20 * effectiveRodPower * dragNorm) / armorFactor;
            
            if (this.inSweetSpot) pullSpeed *= 1.5;
            else pullSpeed *= 0.5;

            this.catchProgress += (pullSpeed - (escapeSpeed * 0.5)) * dt;
        }

        this.catchProgress = clamp(this.catchProgress, 0, 100);

    },

    _checkEndConditions() {
        if (this.tension >= this.maxTension) this.phase = 'SNAPPED';
        else if (this.catchProgress >= 100) this.phase = 'CAUGHT';
    }
};