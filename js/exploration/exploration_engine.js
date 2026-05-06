/**
 * js/exploration/exploration_engine.js
 * The Physics and Collision Engine for Local Map Exploration.
 * Handles boat momentum, turning, wall collisions, NPC boat collisions, damage, zone transitions, and Stealth/Noise.
 */

import { TILE, LOCAL_MAP_SIZE } from './local_map.js';
import { clamp } from '../util/utils.js';

export const ExplorationEngine = {
    // --- State ---
    x: 256,
    y: 256,
    velocity: 0,
    heading: -Math.PI / 2, // Facing North (Up)
    currentNoise: 0, 
    fishermanPos: null, // NEW: Tracks the NPC boat location
    
    // --- Data References ---
    boatStats: null,
    localMap: null,
    
    // --- Engine Constants ---
    collisionRadius: 6, // Radius of the boat's hitbox in grid pixels
    waterFriction: 1.5, // How quickly the boat glides to a stop
    
    // --- Event Callbacks ---
    onDamage: null,
    onZoneTransition: null,
    onDockInteract: null,

    init(startX, startY, effectiveExplorationStats, localMapData, heading = -Math.PI / 2, velocity = 0, fishermanPos = null) {
        this.x = startX;
        this.y = startY;
        this.velocity = velocity; 
        this.heading = heading;   
        this.currentNoise = 0;    
        this.fishermanPos = fishermanPos; // Assign the fisherman object
        
        this.boatStats = effectiveExplorationStats; 
        this.localMap = localMapData;
        
        console.log("🧭 Exploration Engine Initialized at", startX, startY);
    },

    update(dt, input) {
        if (!this.boatStats || !this.localMap) return;

        // --- 1. ROTATION ---
        const turnRate = (this.boatStats.turnSpeed * (Math.PI / 180)) * dt;
        if (input.left)  this.heading -= turnRate;
        if (input.right) this.heading += turnRate;

        // --- 2. ACCELERATION & THRUST ---
        let thrust = 0;
        if (input.forward) thrust = this.boatStats.acceleration;
        if (input.backward) thrust = -this.boatStats.acceleration * 0.5;

        this.velocity += thrust * dt;
        this.velocity -= this.velocity * this.waterFriction * dt;

        const maxSpeed = this.boatStats.speed;
        this.velocity = clamp(this.velocity, -maxSpeed * 0.4, maxSpeed);

        // --- 3. MOVEMENT ---
        const dx = Math.cos(this.heading) * this.velocity * dt;
        const dy = Math.sin(this.heading) * this.velocity * dt;

        this.x += dx;
        this.y += dy;

        // --- 4. COLLISION DETECTION ---
        this._checkCollisions();

        // --- 5. ZONE TRANSITIONS ---
        this._checkZoneTransitions();

        // --- 6. DOCK INTERACTION ---
        if (input.action) this._checkDock();

        // --- 7. STEALTH & NOISE CALCULATION ---
        let thrustNoise = (input.forward || input.backward) ? 60 : 0;
        let speedNoise = (Math.abs(this.velocity) / this.boatStats.speed) * 40;
        
        let rawNoise = thrustNoise + speedNoise;
        let targetNoise = rawNoise / Math.max(0.1, this.boatStats.stealth);
        targetNoise = clamp(targetNoise, 0, 100);
        
        if (targetNoise > this.currentNoise) {
            this.currentNoise += (targetNoise - this.currentNoise) * 5.0 * dt;
        } else {
            this.currentNoise += (targetNoise - this.currentNoise) * 0.3 * dt;
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

        // B. NEW: Check against Fisherman Boat
        if (this.fishermanPos) {
            const distX = this.x - this.fishermanPos.x;
            const distY = this.y - this.fishermanPos.y;
            const distance = Math.hypot(distX, distY);
            
            // The fisherman's boat has roughly a 6 grid-tile radius
            const minSafeDistance = this.collisionRadius + 6;

            if (distance < minSafeDistance) {
                hit = true;
                const overlap = minSafeDistance - distance;
                this.x += (distX / distance) * overlap;
                this.y += (distY / distance) * overlap;
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