/**
 * js/fishing/fishing_engine.js
 * The core physics and AI state machine for the fishing minigame.
 * V5 - Stamina Economy Rebalance & Exhaustion Penalty.
 */

import { getRandomInRange, clamp } from '../util/utils.js';

// [FIX]: Added selfDrain to behaviors. Negative means regen, positive means burning energy.
const BEHAVIORS = {
    HOLD:   { pullMult: 0.2, catchable: true,  stamDrainMult: 1.0, selfDrain: -6 }, 
    RUN:    { pullMult: 1.0, catchable: true,  stamDrainMult: 1.2, selfDrain: 6 }, 
    THRASH: { pullMult: 1.8, catchable: false, stamDrainMult: 3.5, selfDrain: 18 }, 
    BURST:  { pullMult: 3.5, catchable: false, stamDrainMult: 1.0, selfDrain: 12 }  
};

export const FishingEngine = {
    phase: 'IDLE', 

    playerStats: null,
    fishPool:[],
    fishData: null, 
    lureStats: null,

    // Depth & Physics Mechanics
    currentDepth: 0,
    targetDepth: 0,
    maxDepth: 20,
    waterCurrent: 0, 

    tension: 0,
    maxTension: 100,
    fishStamina: 0,
    maxFishStamina: 0,
    playerStamina: 0,
    maxPlayerStamina: 0,
    playerStaminaRegen: 0, 
    catchProgress: 0, 
    
    hookTimerMs: 0, 
    fightTimer: 0,    
    maxFightTimer: 0,
    
    ai: { state: 'HOLD', timer: 0, aggression: 0 },

    startCast(effectivePlayerStats, rawPlayerStaminaStat, fishPool, maxDepth) {
        this.playerStats = effectivePlayerStats;
        this.lureStats = effectivePlayerStats.activeLure;
        this.fishPool = fishPool;
        this.fishData = null;

        this.maxDepth = maxDepth;
        this.currentDepth = 0; 
        this.targetDepth = 0;
        this.waterCurrent = 0;

        this.maxPlayerStamina = this.playerStats.minigame.stamina;
        this.playerStamina = this.maxPlayerStamina;
        this.playerStaminaRegen = 10 + (rawPlayerStaminaStat * 8); 

        this.maxTension = this.playerStats.minigame.maxTension;
        this.tension = 0;
        this.catchProgress = 0;
        this.phase = 'SINKING';
    },

    scrollDepth(delta) {
        if (this.phase === 'SINKING') {
            this.targetDepth = clamp(this.targetDepth + delta, 0, this.maxDepth);
        }
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
        let validCandidates =[];

        for (const fish of this.fishPool) {
            if (fish.environment.depthPref !== currentZone) continue;

            const prefs = fish.lurePrefs;
            const diffColor = Math.abs(prefs.color - lure.color);
            const diffSound = Math.abs(prefs.sound - lure.sound);
            const diffLight = Math.abs(prefs.light - lure.light);
            const diffWeight = Math.abs(prefs.weight - lure.weight);
            
            const totalDiff = diffColor + diffSound + diffLight + diffWeight;
            const maxAllowedDiff = prefs.tolerance * 800;

            if (totalDiff <= maxAllowedDiff) {
                const matchScore = 1.0 - (totalDiff / maxAllowedDiff);
                validCandidates.push({ fish, matchScore });
            }
        }

        if (validCandidates.length === 0) {
            this.phase = 'IDLE'; 
            return false;
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
            
            this.maxFightTimer = 20 + ((100 - this.fishData.combat.speed) * 0.2) + (this.fishData.combat.stamina * 0.05);
            this.fightTimer = this.maxFightTimer;

            this.ai.aggression = this.fishData.combat.aggression;
            this.ai.state = 'RUN';
            this.ai.timer = 1.5; 
            
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

        if (this.playerStamina <= 0) isReeling = false;

        this._updateFishAI(dt);
        this._applyPhysics(dt, isReeling);
        this._checkEndConditions();
    },

    _updateFishAI(dt) {
        if (this.fishStamina <= 0) {
            this.ai.state = 'HOLD';
            this.ai.timer = 1.0;
            return;
        }

        this.ai.timer -= dt;
        if (this.ai.timer <= 0) {
            const roll = Math.random();
            const aggro = this.ai.aggression; 

            if (roll < 0.05 * aggro) {
                this.ai.state = 'BURST';
                this.ai.timer = getRandomInRange(0.4, 0.8);
            } else if (roll < 0.3 * aggro) {
                this.ai.state = 'THRASH';
                this.ai.timer = getRandomInRange(1.0, 1.8);
            } else if (roll < 0.5 + (0.2 * aggro)) {
                this.ai.state = 'RUN';
                this.ai.timer = getRandomInRange(1.5, 3.0);
            } else {
                this.ai.state = 'HOLD';
                this.ai.timer = getRandomInRange(1.0, 2.0);
            }
        }
    },

    _applyPhysics(dt, isReeling) {
        const behavior = BEHAVIORS[this.ai.state];
        const fishSpeed = this.fishData.combat.speed;
        const rodPower = this.playerStats.minigame.power;
        const flex = this.playerStats.minigame.flexibility;

        let fishPullForce = (this.fishStamina > 0) ? (fishSpeed * behavior.pullMult) : 0;
        
        // 1. TENSION & EXHAUSTION
        if (isReeling) {
            const reelFriction = 30 * rodPower; 
            this.tension += (fishPullForce + reelFriction) * dt;
        } else {
            // [FIX]: EXHAUSTION PENALTY. If stamina is 0, tension decay is crippled!
            const baseDecay = 50 * flex;
            const decay = (this.playerStamina <= 0) ? (baseDecay * 0.1) : baseDecay;
            
            this.tension -= (decay - (fishPullForce * 0.4)) * dt; 
        }
        this.tension = clamp(this.tension, 0, this.maxTension + 10); 

        // 2. PLAYER STAMINA (Doubled Drain)
        if (isReeling) {
            const drain = 50 * behavior.stamDrainMult; 
            this.playerStamina -= drain * dt;
        } else {
            this.playerStamina += this.playerStaminaRegen * dt;
        }
        this.playerStamina = clamp(this.playerStamina, 0, this.maxPlayerStamina);

        // 3. FISH STAMINA (Reel Damage + Inherent AI Behavior Drain)
        if (isReeling && behavior.catchable) {
            this.fishStamina -= (12 * rodPower) * dt;
        }
        this.fishStamina -= behavior.selfDrain * dt; // Active Drain/Regen
        this.fishStamina = clamp(this.fishStamina, 0, this.maxFishStamina);

        // 4. CATCH PROGRESS
        if (isReeling && behavior.catchable) {
            const exhaustMult = (this.fishStamina <= 0) ? 3.0 : (1.5 - (this.fishStamina / this.maxFishStamina)); 
            this.catchProgress += (8 * rodPower * exhaustMult) * dt;
        }
        this.catchProgress = clamp(this.catchProgress, 0, 100);
    },

    _checkEndConditions() {
        if (this.tension >= this.maxTension) this.phase = 'SNAPPED';
        else if (this.catchProgress >= 100) this.phase = 'CAUGHT';
    }
};