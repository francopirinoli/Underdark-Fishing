/**
 * js/fishing/fishing_engine.js
 * The core physics and AI state machine for the fishing minigame.
 * V7 - Reactive AI: Drag-Linked Exhaustion, Desperation, and Active Recovery.
 */

import { getRandomInRange, clamp } from '../util/utils.js';

const BEHAVIORS = {
    // selfDrain: Negative means resting (regaining stamina), positive means burning energy.
    HOLD:     { pullMult: 0.2, catchable: true,  stamDrainMult: 1.0, selfDrain: -6,  dragSlip: 0 }, 
    RUN:      { pullMult: 1.0, catchable: true,  stamDrainMult: 1.2, selfDrain: 6,   dragSlip: -15 }, 
    THRASH:   { pullMult: 1.8, catchable: false, stamDrainMult: 3.5, selfDrain: 18,  dragSlip: 'shake' }, 
    BURST:    { pullMult: 3.5, catchable: false, stamDrainMult: 1.0, selfDrain: 12,  dragSlip: -40 }, 
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
    playerStaminaDelayTimer: 0, 
    catchProgress: 0, 
    
    // Dynamic Sweet Spot Mechanics
    reelPower: 50,      
    currentSweetSpot: 50, 
    targetSweetSpot: 50,  
    inSweetSpot: false, 
    
    currentTimeMins: 480, 
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
        this.currentTimeMins = currentTimeMins; 

        this.maxPlayerStamina = this.playerStats.minigame.stamina;
        this.playerStamina = this.maxPlayerStamina;
        this.playerStaminaRegen = 20 + (rawPlayerStaminaStat * 10); 
        this.playerStaminaDelayTimer = 0;

        this.maxTension = this.playerStats.minigame.maxTension;
        this.tension = 0;
        this.catchProgress = 0;
        this.reelPower = 50;      
        this.currentSweetSpot = 50; 
        this.targetSweetSpot = 50;  
        this.inSweetSpot = false; 
        this.phase = 'SINKING';
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
        let validCandidates =[];

        for (const fish of this.fishPool) {
            if (fish.environment.depthPref !== currentZone) continue;

            const activeHours = fish.environment.activeHours;
            let isActive = false;
            
            if (activeHours === 'Always Active') {
                isActive = true;
            } else if (activeHours === 'Diurnal') {
                isActive = (currentHour >= 6 && currentHour < 18); 
            } else if (activeHours === 'Nocturnal') {
                isActive = (currentHour >= 18 || currentHour < 6); 
            } else if (activeHours === 'Crepuscular') {
                isActive = ((currentHour >= 4 && currentHour <= 8) || (currentHour >= 16 && currentHour <= 20)); 
            }

            const prefs = fish.lurePrefs;
            const diffColor = Math.abs(prefs.color - lure.color);
            const diffSound = Math.abs(prefs.sound - lure.sound);
            const diffLight = Math.abs(prefs.light - lure.light);
            const diffWeight = Math.abs(prefs.weight - lure.weight);
            
            const totalDiff = diffColor + diffSound + diffLight + diffWeight;
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

        this._updateFishAI(dt, isReeling); // <-- PASS isReeling TO AI
        this._applyPhysics(dt, isReeling);
        this._checkEndConditions();
    },

    _updateFishAI(dt, isReeling) {
        if (this.fishData.combat.aggression === 0) {
            this.ai.state = 'INANIMATE';
            return;
        }

        if (this.fishStamina <= 0) {
            this.ai.state = 'HOLD';
            this.ai.timer = 1.0;
            this.targetSweetSpot = this.fishData.combat.optimalReel;
            return;
        }

        this.ai.timer -= dt;
        if (this.ai.timer <= 0) {
            const roll = Math.random();
            let aggro = this.fishData.combat.aggression; 
            const baseOpt = this.fishData.combat.optimalReel;
            const speed = this.fishData.combat.speed;

            // --- REACTIVE AI MODIFIERS ---
            
            // 1. Desperation: If close to being caught, fight much harder
            if (this.catchProgress > 75) {
                aggro = Math.min(1.0, aggro + 0.3);
            }

            // 2. Self-Preservation: If stamina is low, try to rest unless provoked
            const staminaPct = this.fishStamina / this.maxFishStamina;
            if (staminaPct < 0.3) {
                if (isReeling && Math.random() < 0.6) {
                    // Panic
                    this.ai.state = Math.random() < 0.5 ? 'THRASH' : 'BURST';
                    this.ai.timer = getRandomInRange(0.5, 1.2);
                    this.targetSweetSpot = Math.max(10, baseOpt - (speed * 0.8 * aggro));
                    return;
                } else {
                    // Rest
                    this.ai.state = 'HOLD';
                    this.ai.timer = getRandomInRange(1.5, 2.5);
                    this.targetSweetSpot = baseOpt;
                    return;
                }
            }

            // 3. Reacting to Reeling: Higher chance to Bolt if actively reeled
            if (isReeling) {
                aggro = Math.min(1.0, aggro + 0.15);
            }

            // 4. Slack Line Punish: If player drops drag to nothing and waits, steal line
            const isSlack = (!isReeling && this.reelPower < 20);

            // --- STATE SELECTION ---
            if (roll < 0.05 * aggro) {
                this.ai.state = 'BURST';
                this.ai.timer = getRandomInRange(0.4, 0.8);
                this.targetSweetSpot = Math.max(10, baseOpt - (speed * 0.8 * aggro));
            } else if (roll < 0.3 * aggro) {
                this.ai.state = 'THRASH';
                this.ai.timer = getRandomInRange(1.0, 1.8);
            } else if (isSlack || roll < 0.5 + (0.2 * aggro)) {
                this.ai.state = 'RUN';
                this.ai.timer = getRandomInRange(1.5, 3.0);
                this.targetSweetSpot = Math.max(10, baseOpt - (speed * 0.4 * aggro));
            } else {
                this.ai.state = 'HOLD';
                this.ai.timer = getRandomInRange(1.0, 2.0);
                this.targetSweetSpot = baseOpt;
            }
        }
    },

    _applyPhysics(dt, isReeling) {
        const behavior = BEHAVIORS[this.ai.state];

        // --- 0. FISH FIGHTS THE DRAG DIAL ---
        if (this.fishStamina > 0 && this.fishData.combat.aggression > 0) {
            if (behavior.dragSlip === 'shake') {
                const shake = (Math.random() - 0.5) * 80 * dt;
                this.reelPower += shake;
            } else if (behavior.dragSlip !== 0) {
                const pullPower = behavior.dragSlip * (this.fishData.combat.speed / 50) * (this.fishData.combat.aggression + 0.5) * dt;
                this.reelPower += pullPower;
            }
            this.reelPower = clamp(this.reelPower, 10, 100);
        }

        // --- 1. DYNAMIC SWEET SPOT MOVEMENT ---
        if (this.fishStamina > 0 && this.fishData.combat.aggression > 0) {
            const shiftSpeed = (this.ai.state === 'BURST') ? 12.0 : (2.0 + (this.fishData.combat.speed / 50));
            this.currentSweetSpot += (this.targetSweetSpot - this.currentSweetSpot) * shiftSpeed * dt;
            
            if (this.ai.state === 'THRASH' && Math.random() < 15 * dt) {
                this.targetSweetSpot = clamp(this.fishData.combat.optimalReel + (Math.random() - 0.5) * 60 * this.fishData.combat.aggression, 10, 100);
            }
        } else {
            this.targetSweetSpot = this.fishData.combat.optimalReel;
            this.currentSweetSpot += (this.targetSweetSpot - this.currentSweetSpot) * 2.0 * dt;
        }
        this.currentSweetSpot = clamp(this.currentSweetSpot, 10, 100);

        // --- 2. CALCULATE PLAYER ACCURACY & NORMALIZED DRAG ---
        const powerDiff = this.reelPower - this.currentSweetSpot;
        const tol = this.playerStats.minigame.sweetSpotTolerance;
        this.inSweetSpot = Math.abs(powerDiff) <= tol;

        const dragNorm = clamp((this.reelPower - 10) / 90, 0.0, 1.0);

        const fishSpeed = this.fishData.combat.speed;
        const rodPower = this.playerStats.minigame.power;
        const flex = this.playerStats.minigame.flexibility;

        const thrashSpike = (this.ai.state === 'THRASH') ? getRandomInRange(0.8, 1.5) : 1.0;
        const rawFishPull = (this.fishStamina > 0) ? (fishSpeed * behavior.pullMult * thrashSpike) : 0;
        const tensionPullForce = rawFishPull * Math.pow(dragNorm, 1.5);

// --- 3. TENSION & EXHAUSTION ---
        let tensionDelta = 0;

        if (isReeling) {
            this.playerStaminaDelayTimer = 0.5; 
            const reelFriction = 30 * rodPower * dragNorm;
            
            // BALANCE: Increased base tension generation by 25%. You must respect your max tension!
            let rawTensionIncrease = (tensionPullForce * 1.875) + (reelFriction * 1.25);

            if (powerDiff > tol) {
                const overpull = (powerDiff - tol) / 50; 
                rawTensionIncrease *= (1.0 + overpull * 2.5); 
            } else if (this.inSweetSpot) {
                rawTensionIncrease *= 0.5; 
            }
            
            tensionDelta = rawTensionIncrease;
        } else {
            this.playerStaminaDelayTimer -= dt;
            const baseDecay = 60 * flex;
            const decay = (this.playerStamina <= 0) ? (baseDecay * 0.2) : baseDecay;
            tensionDelta = tensionPullForce - decay;
        }

        const maxTensionDelta = this.maxTension * 0.6;
        tensionDelta = clamp(tensionDelta, -maxTensionDelta, maxTensionDelta);
        this.tension = clamp(this.tension + tensionDelta * dt, 0, this.maxTension + 5);

        // --- 4. PLAYER STAMINA ---
        if (isReeling) {
            // BALANCE: Increased player stamina drain from 15 to 22. You can't just hold click forever now.
            const drain = 22 * behavior.stamDrainMult * Math.pow(dragNorm + 0.2, 1.2); 
            this.playerStamina -= drain * dt;
        } else if (this.playerStaminaDelayTimer <= 0) {
            this.playerStamina += this.playerStaminaRegen * dt;
        }
        this.playerStamina = clamp(this.playerStamina, 0, this.maxPlayerStamina);

        // --- 5. FISH STAMINA ---
        if (isReeling && behavior.catchable) {
            const efficiency = (powerDiff > tol) ? 0.6 : (this.inSweetSpot ? 1.5 : 1.0);
            this.fishStamina -= (18 * rodPower * (dragNorm + 0.2) * efficiency) * dt;
        }
        
        if (behavior.selfDrain > 0) {
            const dragResistance = Math.max(0.2, dragNorm * 2.0); 
            this.fishStamina -= (behavior.selfDrain * 1.5) * dragResistance * dt; 
        } else {
            // BALANCE: Doubled fish stamina recovery from 1.5% to 3%. 
            // If you rest too long, the fish will catch its breath and fight back.
            const regenBoost = (this.maxFishStamina * 0.03);
            this.fishStamina += (Math.abs(behavior.selfDrain) + regenBoost) * dt;
        }
        this.fishStamina = clamp(this.fishStamina, 0, this.maxFishStamina);

// --- 6. CATCH PROGRESS (Tug of War) ---
        if (isReeling && behavior.catchable) {
            if (powerDiff < -tol) {
                const underpull = (Math.abs(powerDiff) - tol) / 50;
                // FORGIVENESS: Reduced underpull penalty from 10 to 4. 
                // The fish won't rip the line away as aggressively if your drag is too low.
                this.catchProgress -= (4 * (fishSpeed / 50) * underpull) * dt;
            } else {
                const exhaustMult = (this.fishStamina <= 0) ? 3.0 : (1.5 - (this.fishStamina / this.maxFishStamina)); 
                const sweetSpotMult = this.inSweetSpot ? 2.0 : 0.5; 
                // BOOST: Increased base catch progress rate from 8 to 10.
                // Makes the bar climb slightly faster when you are doing things right.
                this.catchProgress += (10 * rodPower * exhaustMult * (dragNorm + 0.2) * sweetSpotMult) * dt;
            }
        } 
        
        if (this.fishStamina > 0 && behavior.pullMult > 0) {
            // FORGIVENESS: Slashed the line loss rate in half (from 0.3 to 0.15).
            // When you let go to rest your stamina, the progress bar will now drop much, much slower.
            const lineLossRate = rawFishPull * (1.0 - dragNorm) * 0.15; 
            if (!isReeling) {
                this.catchProgress -= lineLossRate * dt;
                
                // Escape Penalty: If the fish is running with a slack line, you lose time quickly
                if (this.catchProgress <= 5) {
                    this.fightTimer -= dt * 2.0; 
                }
            }
        }
        
        this.catchProgress = clamp(this.catchProgress, 0, 100);
    },

    _checkEndConditions() {
        if (this.tension >= this.maxTension) this.phase = 'SNAPPED';
        else if (this.catchProgress >= 100) this.phase = 'CAUGHT';
    }
};