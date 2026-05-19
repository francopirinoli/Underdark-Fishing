/**
 * js/exploration/exploration_engine.js
 * The Physics and Collision Engine for Local Map Exploration.
 * Handles boat momentum, turning, wall collisions, NPC boat collisions, damage, zone transitions, and Stealth/Noise.
 */

import { TILE, LOCAL_MAP_SIZE } from './local_map.js';
import { clamp, getRandomInRange } from '../util/utils.js'; // <-- Added getRandomInRange

export const ExplorationEngine = {
    // --- State ---
    x: 256,
    y: 256,
    velocity: 0,
    heading: -Math.PI / 2, 
    currentNoise: 0, 
    npcBoats:[], // <-- REPLACED fishermanPos with an array
    
    // --- Hazard State ---
    biomeId: null,
    weather: null,
    volcanicTimer: 0,
    crystalTimer: 0,
    isWarping: false,
    
    // --- Data References ---
    boatStats: null,
    localMap: null,
    
    // --- Engine Constants ---
    collisionRadius: 6, 
    waterFriction: 1.5, 
    
    // --- Event Callbacks ---
    onDamage: null,
    onZoneTransition: null,
    onDockInteract: null,

    init(startX, startY, effectiveExplorationStats, localMapData, heading = -Math.PI / 2, velocity = 0, npcBoats =[], biomeId = null, weather = null) {
        this.x = startX;
        this.y = startY;
        this.velocity = velocity; 
        this.heading = heading;   
        this.currentNoise = 0;    
        this.npcBoats = npcBoats; // <-- UPDATED
        
        this.biomeId = biomeId;
        this.weather = weather;
        this.volcanicTimer = 5.0; 
        this.crystalTimer = getRandomInRange(5.0, 15.0);
        this.isWarping = false; 
        
        this.boatStats = effectiveExplorationStats; 
        this.localMap = localMapData;
    },

    update(dt, input) {
        if (!this.boatStats || !this.localMap) return;

        const imm = this.boatStats.immunities || {};
        let envSpeedMult = 1.0;
        let envTurnMult = 1.0;
        if (this.biomeId === 'frozen' && !imm.frozen) {
            envSpeedMult = 0.5; 
            envTurnMult = 0.5;  
        }

        // --- 1. ROTATION ---
        const turnRate = (this.boatStats.turnSpeed * envTurnMult * (Math.PI / 180)) * dt;
        if (input.left)  this.heading -= turnRate;
        if (input.right) this.heading += turnRate;

        // --- 2. MOMENTUM PHYSICS (Acceleration & Friction) ---
        // A standard reference mass is 50. 
        // Skiff (Mass 20) = 2.5x acceleration, 2.5x friction (Stops instantly).
        // Dreadnought (Mass 150) = 0.33x acceleration, 0.33x friction (Glides like a train).
        const massFactor = 50 / Math.max(10, this.boatStats.mass);
        const frictionRate = 1.5 * massFactor;

        let thrust = 0;
        if (input.forward) thrust = this.boatStats.acceleration * envSpeedMult * massFactor;
        if (input.backward) thrust = -this.boatStats.acceleration * envSpeedMult * massFactor * 0.5;

        this.velocity += thrust * dt;
        
        // Apply friction
        let drag = this.velocity * frictionRate * dt;
        
        // Softly cap the top speed
        const maxSpeed = this.boatStats.speed * envSpeedMult;
        if (this.velocity > maxSpeed) drag += (this.velocity - maxSpeed) * 5 * dt;
        if (this.velocity < -maxSpeed * 0.4) drag += (this.velocity + maxSpeed * 0.4) * 5 * dt;

        this.velocity -= drag;

        // --- 3. MOVEMENT & HAZARD: ABYSSAL WHIRLPOOL ---
        let moveX = Math.cos(this.heading) * this.velocity * dt;
        let moveY = Math.sin(this.heading) * this.velocity * dt;

        if (this.weather === 'whirlpool' && !imm.abyssal) {
            const cx = LOCAL_MAP_SIZE / 2;
            const cy = LOCAL_MAP_SIZE / 2;
            const dist = Math.hypot(cx - this.x, cy - this.y);
            
            if (dist > 3) {
                const pullStrength = 8.0 + (80 / Math.max(5, dist)); 
                moveX += ((cx - this.x) / dist) * pullStrength * dt;
                moveY += ((cy - this.y) / dist) * pullStrength * dt;
            } else {
                if (!this.isWarping && this.onWhirlpoolWarp) {
                    this.isWarping = true;
                    this.onWhirlpoolWarp();
                }
            }
        }

        this.x += moveX;
        this.y += moveY;

        // --- 4. COLLISION DETECTION ---
        this._checkCollisions();

        // --- HAZARD: VOLCANIC BOILING WATER ---
        if (this.biomeId === 'volcanic' && !imm.volcanic) {
            this.volcanicTimer -= dt;
            if (this.volcanicTimer <= 0) {
                this.volcanicTimer = 20.0; 
                if (this.onDamage) this.onDamage(1, "Boiling Water");
            }
        }

        // --- 5. ZONE TRANSITIONS & DOCK ---
        this._checkZoneTransitions();
        if (input.action) this._checkDock();

        // --- 6. STEALTH & HAZARD: CRYSTAL SHATTER-STORMS ---
        let thrustNoise = (input.forward || input.backward) ? 60 : 0;
        let speedNoise = (Math.abs(this.velocity) / this.boatStats.speed) * 40;
        
        let rawNoise = thrustNoise + speedNoise;
        let targetNoise = rawNoise / Math.max(0.1, this.boatStats.stealth);
        
        if (targetNoise > this.currentNoise) this.currentNoise += (targetNoise - this.currentNoise) * 5.0 * dt;
        else this.currentNoise += (targetNoise - this.currentNoise) * 0.3 * dt;

        if (this.weather === 'shatter' && !imm.crystal) {
            this.crystalTimer -= dt;
            if (this.crystalTimer <= 0) {
                this.crystalTimer = getRandomInRange(5.0, 12.0); 
                this.currentNoise += getRandomInRange(50, 100);  
                
                if (Math.random() < 0.40) {
                    if (Math.random() > this.boatStats.evasion) {
                        // Apply Damage Reduction to the crystal shatter!
                        const rawDmg = Math.floor(getRandomInRange(5, 15));
                        const finalDmg = Math.max(0, Math.floor(rawDmg * (1 - this.boatStats.damageReduction)));
                        if (this.onDamage) this.onDamage(finalDmg, "Falling Crystal");
                    } else {
                        if (this.onDamage) this.onDamage(0, "Dodge");
                    }
                }
            }
        }

        this.currentNoise = clamp(this.currentNoise, 0, 100);
    },

    _checkCollisions() {
        const minX = Math.max(0, Math.floor(this.x - this.collisionRadius));
        const maxX = Math.min(LOCAL_MAP_SIZE - 1, Math.ceil(this.x + this.collisionRadius));
        const minY = Math.max(0, Math.floor(this.y - this.collisionRadius));
        const maxY = Math.min(LOCAL_MAP_SIZE - 1, Math.ceil(this.y + this.collisionRadius));

        let hit = false;
        let impactVelocity = Math.abs(this.velocity);

        // A. Check against rock/land tiles
        for (let ty = minY; ty <= maxY; ty++) {
            for (let tx = minX; tx <= maxX; tx++) {
                const tileId = this.localMap.grid[ty][tx];
                
                if (tileId === TILE.LAND || tileId === TILE.ROCK) {
                    const distX = this.x - (tx + 0.5);
                    const distY = this.y - (ty + 0.5);
                    const distance = Math.hypot(distX, distY);
                    const minSafeDistance = this.collisionRadius + 0.5;

                    if (distance < minSafeDistance) {
                        hit = true;
                        const overlap = minSafeDistance - distance;
                        this.x += (distX / distance) * overlap;
                        this.y += (distY / distance) * overlap;
                    }
                }
            }
        }

        // B. Check against Array of NPC Boats
        if (this.npcBoats && this.npcBoats.length > 0) {
            for (const npc of this.npcBoats) {
                const distX = this.x - npc.x;
                const distY = this.y - npc.y;
                const distance = Math.hypot(distX, distY);
                const minSafeDistance = this.collisionRadius + 6;

                if (distance < minSafeDistance) {
                    hit = true;
                    const overlap = minSafeDistance - distance;
                    this.x += (distX / distance) * overlap;
                    this.y += (distY / distance) * overlap;
                }
            }
        }

        // Apply bounce and damage
        if (hit) {
            // High mass boats barely bounce backwards when they hit something!
            const bounceFactor = Math.max(0.1, 0.4 * (50 / this.boatStats.mass));
            this.velocity = -this.velocity * bounceFactor; 

            if (impactVelocity > 15 && this.onDamage) {
                // 1. Check for Evasion
                if (Math.random() < this.boatStats.evasion) {
                    this.onDamage(0, "Dodge");
                } else {
                    // 2. Apply Damage Reduction (Armor)
                    let rawDmg = impactVelocity * 0.4;
                    rawDmg *= this.boatStats.collisionDamageMult; // Icebreaker Prow
                    
                    const finalDmg = Math.floor(rawDmg * (1.0 - this.boatStats.damageReduction));
                    this.onDamage(finalDmg, "Collision");
                }
            }
        }
    },

    _checkCollisions() {
        const minX = Math.max(0, Math.floor(this.x - this.collisionRadius));
        const maxX = Math.min(LOCAL_MAP_SIZE - 1, Math.ceil(this.x + this.collisionRadius));
        const minY = Math.max(0, Math.floor(this.y - this.collisionRadius));
        const maxY = Math.min(LOCAL_MAP_SIZE - 1, Math.ceil(this.y + this.collisionRadius));

        let hit = false;
        let impactVelocity = Math.abs(this.velocity);

        // A. Check against rock/land tiles
        for (let ty = minY; ty <= maxY; ty++) {
            for (let tx = minX; tx <= maxX; tx++) {
                const tileId = this.localMap.grid[ty][tx];
                
                if (tileId === TILE.LAND || tileId === TILE.ROCK) {
                    const distX = this.x - (tx + 0.5);
                    const distY = this.y - (ty + 0.5);
                    const distance = Math.hypot(distX, distY);
                    const minSafeDistance = this.collisionRadius + 0.5;

                    if (distance < minSafeDistance) {
                        hit = true;
                        const overlap = minSafeDistance - distance;
                        this.x += (distX / distance) * overlap;
                        this.y += (distY / distance) * overlap;
                    }
                }
            }
        }

        // B. NEW: Check against Array of NPC Boats
        if (this.npcBoats && this.npcBoats.length > 0) {
            for (const npc of this.npcBoats) {
                const distX = this.x - npc.x;
                const distY = this.y - npc.y;
                const distance = Math.hypot(distX, distY);
                
                // NPC boats have roughly a 6 grid-tile radius
                const minSafeDistance = this.collisionRadius + 6;

                if (distance < minSafeDistance) {
                    hit = true;
                    const overlap = minSafeDistance - distance;
                    this.x += (distX / distance) * overlap;
                    this.y += (distY / distance) * overlap;
                }
            }
        }

        // Apply bounce and damage
        if (hit) {
            this.velocity = -this.velocity * 0.4; 

            if (impactVelocity > 20 && this.onDamage) {
                if (Math.random() < this.boatStats.hazardDodgeChance) {
                    console.log("Dodged collision damage!");
                } else {
                    const damage = Math.floor(impactVelocity * 0.1);
                    this.onDamage(damage, "Collision");
                }
            }
        }
    },

    _checkZoneTransitions() {
        const edgeThreshold = 2; 
        if (this.x < edgeThreshold && this.onZoneTransition) this.onZoneTransition('w');
        else if (this.x > LOCAL_MAP_SIZE - edgeThreshold && this.onZoneTransition) this.onZoneTransition('e');
        else if (this.y < edgeThreshold && this.onZoneTransition) this.onZoneTransition('n');
        else if (this.y > LOCAL_MAP_SIZE - edgeThreshold && this.onZoneTransition) this.onZoneTransition('s');
    },

    _checkDock() {
        const gx = Math.floor(this.x);
        const gy = Math.floor(this.y);
        if (gx >= 0 && gx < LOCAL_MAP_SIZE && gy >= 0 && gy < LOCAL_MAP_SIZE) {
            const tileId = this.localMap.grid[gy][gx];
            if (tileId === TILE.DOCK && this.onDockInteract) {
                this.velocity = 0; 
                this.onDockInteract();
            }
        }
    }
};

window.ExplorationEngine = ExplorationEngine;