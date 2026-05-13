/**
 * js/fishing/fishing_engine.js
 * The core physics and AI state machine for the fishing minigame.
 * V5 - Stamina Economy Rebalance & Exhaustion Penalty.
 */

import { getRandomInRange, clamp } from '../util/utils.js';

// [FIX]: Added selfDrain to behaviors. Negative means regen, positive means burning energy.
const BEHAVIORS = {
    HOLD:     { pullMult: 0.2, catchable: true,  stamDrainMult: 1.0, selfDrain: -6,  dragSlip: 0 }, 
    RUN:      { pullMult: 1.0, catchable: true,  stamDrainMult: 1.2, selfDrain: 6,   dragSlip: -15 }, // Steals 15% power per second
    THRASH:   { pullMult: 1.8, catchable: false, stamDrainMult: 3.5, selfDrain: 18,  dragSlip: 'shake' }, // Violently vibrates the dial
    BURST:    { pullMult: 3.5, catchable: false, stamDrainMult: 1.0, selfDrain: 12,  dragSlip: -40 }, // Rips drag out rapidly
    INANIMATE:{ pullMult: 0.8, catchable: true,  stamDrainMult: 0.8, selfDrain: 0,   dragSlip: 0 } 
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
    reelPower: 50,      // <-- NEW
    inSweetSpot: false, // <-- NEW
    currentTimeMins: 480, // <-- NEW
    hookTimerMs: 0,
    fightTimer: 0,    
    maxFightTimer: 0,
    
    ai: { state: 'HOLD', timer: 0, aggression: 0 },

    startCast(effectivePlayerStats, rawPlayerStaminaStat, fishPool, maxDepth, currentTimeMins = 480) {
        this.playerStats = effectivePlayerStats;
        this.lureStats = effectivePlayerStats.activeLure;
        this.fishPool = fishPool;
        this.fishData = null;

        this.maxDepth = maxDepth;
        this.currentDepth = 0; 
        this.targetDepth = 0;
        this.waterCurrent = 0;
        this.currentTimeMins = currentTimeMins; // <-- NEW

        this.maxPlayerStamina = this.playerStats.minigame.stamina;
        this.playerStamina = this.maxPlayerStamina;
        this.playerStaminaRegen = 10 + (rawPlayerStaminaStat * 8); 

        this.maxTension = this.playerStats.minigame.maxTension;
        this.tension = 0;
        this.catchProgress = 0;
        this.reelPower = 50;      // <-- NEW
        this.inSweetSpot = false; // <-- NEW
        this.phase = 'SINKING';
    },

    scrollDepth(delta) {
        if (this.phase === 'SINKING') {
            this.targetDepth = clamp(this.targetDepth + delta, 0, this.maxDepth);
        }
    },

    scrollReelPower(delta) {
        // Base increment is 1% per standard wheel notch.
        const baseIncrement = 1.0; 
        
        // Rod sensitivity determines how fast the player can physically adjust the drag
        const speedMult = this.playerStats.minigame.reelScrollSpeed || 1.0;
        
        // Normalize delta: Standard mouse wheel click = 100 delta. 
        // This ensures smooth trackpads and clicky wheels both scale perfectly to 1% chunks.
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
        const currentHour = this.currentTimeMins / 60; // <-- NEW
        let validCandidates =[];

        for (const fish of this.fishPool) {
            if (fish.environment.depthPref !== currentZone) continue;

            // --- NEW: Time of Day Activity Check ---
            const activeHours = fish.environment.activeHours;
            let isActive = false;
            
            if (activeHours === 'Always Active') {
                isActive = true;
            } else if (activeHours === 'Diurnal') {
                isActive = (currentHour >= 6 && currentHour < 18); // 6am to 6pm
            } else if (activeHours === 'Nocturnal') {
                isActive = (currentHour >= 18 || currentHour < 6); // 6pm to 6am
            } else if (activeHours === 'Crepuscular') {
                isActive = ((currentHour >= 4 && currentHour <= 8) || (currentHour >= 16 && currentHour <= 20)); // Dawn & Dusk
            }

            const prefs = fish.lurePrefs;
            const diffColor = Math.abs(prefs.color - lure.color);
            const diffSound = Math.abs(prefs.sound - lure.sound);
            const diffLight = Math.abs(prefs.light - lure.light);
            const diffWeight = Math.abs(prefs.weight - lure.weight);
            
            const totalDiff = diffColor + diffSound + diffLight + diffWeight;
            
            // Inactive fish are asleep/lethargic: they demand a much more accurate lure to be tempted
            const maxAllowedDiff = prefs.tolerance * 800 * (isActive ? 1.0 : 0.5);

            if (totalDiff <= maxAllowedDiff) {
                let matchScore = 1.0 - (totalDiff / maxAllowedDiff);
                
                // Inactive fish are severely out-competed by active fish for the bait
                if (!isActive) matchScore *= 0.15; 
                
                validCandidates.push({ fish, matchScore });
            }
        }

        if (validCandidates.length === 0) {
            this.phase = 'IDLE'; 
            return false;
        }

        // --- ABSOLUTE PRIORITY FOR CHESTS ---
        const chestCandidate = validCandidates.find(c => c.fish.invType === 'chest_encounter');
        if (chestCandidate) {
            this.fishData = chestCandidate.fish;
            this.phase = 'BITE';
            this.hookTimerMs = this.fishData.combat.hookWindowMs + this.playerStats.minigame.hookWindowMs;
            return true;
        }

        // Normal Fish Selection
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
        // NEW: Inanimate objects like chests never change state
        if (this.fishData.combat.aggression === 0) {
            this.ai.state = 'INANIMATE';
            return;
        }

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

        // --- NEW: FISH FIGHTS THE DRAG DIAL ---
        // If the fish has stamina and is fighting back, it alters the Reel Power
        if (this.fishStamina > 0 && this.fishData.combat.aggression > 0) {
            if (behavior.dragSlip === 'shake') {
                // Erratic shaking (-40% to +40% per second)
                const shake = (Math.random() - 0.5) * 80 * dt;
                this.reelPower += shake;
            } else if (behavior.dragSlip !== 0) {
                // Consistent pull (loosens drag)
                // Faster, more aggressive fish slip the drag significantly harder
                const pullPower = behavior.dragSlip * (this.fishData.combat.speed / 50) * (this.fishData.combat.aggression + 0.5) * dt;
                this.reelPower += pullPower;
            }
            this.reelPower = clamp(this.reelPower, 10, 100);
        }

        // --- SWEET SPOT CHECK ---
        if (this.fishData.combat.aggression === 0) {
            this.inSweetSpot = false;
        } else {
            const opt = this.fishData.combat.optimalReel;
            const tol = this.playerStats.minigame.sweetSpotTolerance;
            this.inSweetSpot = Math.abs(this.reelPower - opt) <= tol;
        }

        const fishSpeed = this.fishData.combat.speed;
        const rodPower = this.playerStats.minigame.power;
        const flex = this.playerStats.minigame.flexibility;

        const powerMult = this.reelPower / 50; // 50% is baseline 1.0x

        let fishPullForce = (this.fishStamina > 0) ? (fishSpeed * behavior.pullMult) : 0;
        
        // 1. TENSION & EXHAUSTION
        if (isReeling) {
            const reelFriction = 30 * rodPower * powerMult; 
            const rawTensionIncrease = (fishPullForce + reelFriction) * dt;
            this.tension += this.inSweetSpot ? (rawTensionIncrease * 0.7) : rawTensionIncrease;
        } else {
            const baseDecay = 50 * flex;
            const decay = (this.playerStamina <= 0) ? (baseDecay * 0.1) : baseDecay;
            this.tension -= (decay - (fishPullForce * 0.4)) * dt; 
        }
        this.tension = clamp(this.tension, 0, this.maxTension + 10); 

        // 2. PLAYER STAMINA
        if (isReeling) {
            const drain = 50 * behavior.stamDrainMult * Math.pow(powerMult, 1.5); 
            this.playerStamina -= drain * dt;
        } else {
            this.playerStamina += this.playerStaminaRegen * dt;
        }
        this.playerStamina = clamp(this.playerStamina, 0, this.maxPlayerStamina);

        // 3. FISH STAMINA
        if (isReeling && behavior.catchable) {
            this.fishStamina -= (12 * rodPower * powerMult) * dt;
        }
        this.fishStamina -= behavior.selfDrain * dt; 
        this.fishStamina = clamp(this.fishStamina, 0, this.maxFishStamina);

        // 4. CATCH PROGRESS
        if (isReeling && behavior.catchable) {
            const exhaustMult = (this.fishStamina <= 0) ? 3.0 : (1.5 - (this.fishStamina / this.maxFishStamina)); 
            const sweetSpotMult = this.inSweetSpot ? 1.5 : 1.0; 
            this.catchProgress += (8 * rodPower * exhaustMult * powerMult * sweetSpotMult) * dt;
        }
        this.catchProgress = clamp(this.catchProgress, 0, 100);
    },

    _checkEndConditions() {
        if (this.tension >= this.maxTension) this.phase = 'SNAPPED';
        else if (this.catchProgress >= 100) this.phase = 'CAUGHT';
    }
};