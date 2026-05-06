/**
 * js/game.js
 * The Master Shell & Core Game Loop.
 * V9 - Death Mechanics, Pause Menu, and Dual Audio Buses.
 */

import { createRng } from './util/rng.js';
import { SaveManager } from './util/save_manager.js';

// Audio
import { AudioEngine } from './audio/audio_engine.js';
import { MusicEngine } from './audio/music_engine.js';
import { SFX } from './audio/sfx_generator.js';

// Data & Generation
import { PlayerEngine } from './data/player_data.js';
import { generateNPCData } from './data/npc_data_generator.js';
import { generateGlobalMap } from './exploration/global_map.js';
import { generateLocalMap, TILE, LOCAL_MAP_SIZE } from './exploration/local_map.js';
import { BIOMES } from './exploration/biomes.js';
import { generateFishData, generateFishInstance, getFishPoolForNode } from './data/fish_data_generator.js';

// Engines & Renderers
import { ExplorationEngine } from './exploration/exploration_engine.js';
import { ExplorationRenderer } from './exploration/exploration_renderer.js';
import { renderGlobalMap } from './exploration/map_renderer.js'; 
import { FishingEngine } from './fishing/fishing_engine.js';
import { FishingRenderer } from './fishing/fishing_renderer.js';

// UI Modules
import { HUD } from './ui/hud_ui.js';
import { GrimoireUI } from './ui/grimoire_ui.js';
import { MenuUI } from './ui/menu_ui.js';
import { HubUI } from './ui/hub_ui.js';
import { PauseUI } from './ui/pause_ui.js';

// Events
import { EventManager } from './events/event_manager.js';
import { generateChest } from './art/chest_generator.js';

// --- GAME STATE ---
let currentSaveSlot = 1; // <-- ADD THIS LINE
const STATE = { MENU: 0, EXPLORATION: 1, FISHING: 2, GRIMOIRE: 3, HUB: 4, PAUSE: 5 };
let currentState = STATE.MENU;
let stateBeforePause = STATE.EXPLORATION;

let player;
let world;
let globalX, globalY;
let currentLocalMap, currentBiome;
let currentLocalFishPool =[];
let lastTime = 0;
let currentLocalChest = null; 

// World State
let discoveredNodes =[];
let gameDay = 1;
let gameTimeMinutes = 8 * 60; 

// Inputs
const keys = { forward: false, backward: false, left: false, right: false, action: false, actionJustPressed: false };
const mouse = { mouseX: 0, mouseY: 0, isCharging: false, chargePct: 0, maxDist: 100 };
let isReeling = false;

// --- INITIALIZATION ---

const startOverlay = document.createElement('div');
startOverlay.style.cssText = "position:absolute; inset:0; z-index:3000; background:rgba(2,6,23,0.95); display:flex; flex-direction:column; align-items:center; justify-content:center; color:#22D3EE; cursor:pointer;";
startOverlay.innerHTML = "<h1>SYSTEM INITIALIZATION</h1><p style='color:#64748B'>Click to connect Audio Context...</p>";
document.getElementById('game-container').appendChild(startOverlay);

startOverlay.addEventListener('click', async () => {
    startOverlay.remove();
    await initGameSystems();
});

async function initGameSystems() {
    await AudioEngine.init();
    
    // NEW: Load saved volumes immediately upon boot
    const savedMusicVol = localStorage.getItem('uf_vol_music') || 50;
    const savedSfxVol = localStorage.getItem('uf_vol_sfx') || 50;
    AudioEngine.setMusicVolume(savedMusicVol / 100);
    AudioEngine.setSfxVolume(savedSfxVol / 100);

    SFX.init();
    
    ExplorationRenderer.init(document.getElementById('z0-world'), 1280, 720);
    FishingRenderer.init(document.getElementById('z50-action'));

    const interactPrompt = document.createElement('div');
    interactPrompt.id = 'interact-prompt';
    // Center it in the 1024px playable area (1280 total - 256 sidebar). 1024 / 2 = 512px from left.
    interactPrompt.style.cssText = "position:absolute; bottom: 80px; left: 512px; transform: translateX(-50%); font-size: 1.6rem; color: var(--gold-warn); background: rgba(15, 23, 42, 0.9); padding: 0.5rem 1.5rem; border: 2px solid var(--panel-border); border-radius: 6px; display: none; z-index: 40; text-shadow: 0 0 10px rgba(251, 191, 36, 0.4); pointer-events: none;";
    
    // CRITICAL FIX: Append to game-container, NOT z10-hud!
    document.getElementById('game-container').appendChild(interactPrompt);

    MenuUI.init({
        onNewGame: (slot, playerData, stats, points) => startNewDescent(slot, playerData, stats, points),
        onLoadGame: (slot) => loadExistingDescent(slot)
    });

    GrimoireUI.init({
        onSave: () => saveCurrentState(),
        onDeath: () => handleDeath() // <-- NEW: Allow Grimoire to kill the player
    });

    HubUI.init({
        onSave: () => saveCurrentState(),
        onDepart: () => resumeFromHub()
    });

    // NEW: Init Pause UI
    PauseUI.init({
        onResume: () => togglePause(),
        onQuit: () => {
            saveCurrentState();
            location.reload(); // Instantly refreshes the browser to cleanly return to main menu
        }
    });

    setupInputListeners();
    MenuUI.showMainMenu();
}

// --- STATE MANAGEMENT (NEW/LOAD) ---

function startNewDescent(slot, identityData, stats, points) {
    currentSaveSlot = slot;
    player = PlayerEngine.createPlayer(identityData);
    player.stats = stats;
    player.availablePoints = points;
    player.inventory = [];
    player.activeQuests =[];
    player.bestiary = {}; 
    player.vitals.hp = player.gear.boat.stats.maxHp;

    // 1. GENERATE THE WORLD FIRST
    world = generateGlobalMap(Date.now(),[]);
    
    // 2. NOW WE CAN CALL THE EVENT MANAGER (because world.seed exists)
    EventManager.onNewDay(1, world.seed);
    
    let startNode = world.nodes.flat().find(n => n.hasSettlement) || world.nodes[world.startY][world.startX];
    
    globalX = startNode.x;
    globalY = startNode.y;
    gameDay = 1;
    gameTimeMinutes = 8 * 60;

    discoveredNodes =[`${globalX},${globalY}`];
    world.nodes[globalY][globalX].isDiscovered = true;

    saveCurrentState();
    enterWorld();
}

function loadExistingDescent(slot) {
    currentSaveSlot = slot;
    const data = SaveManager.loadGame(slot);
    if (!data) return;

    player = data.player;
    player.inventory = player.inventory ||[]; 
    player.activeQuests = player.activeQuests ||[];
    player.bestiary = player.bestiary || {};

    discoveredNodes = data.discoveredNodes || [`${data.globalX},${data.globalY}`];
    world = generateGlobalMap(data.worldSeed, discoveredNodes); 
    globalX = data.globalX;
    globalY = data.globalY;
    gameDay = data.gameDay;
    gameTimeMinutes = data.gameTimeMinutes;

    const nodeEcology = data.nodeEcology || {};
    for (const key in nodeEcology) {
        const [x, y] = key.split(',');
        if (world.nodes[y] && world.nodes[y][x]) {
            world.nodes[y][x].discoveredSpecies = nodeEcology[key];
        }
    }

    // Load the saved Treasure Chests
    EventManager.loadSaveData(data.eventData);

    enterWorld();
}

function enterWorld() {
    document.getElementById('z200-menus').style.display = 'none';
    ExplorationRenderer.loadBoat(player.gear.boat.art.topDownDataUrl);
    loadLocalNode(null);
    HUD.logAction("Descended into the Darklake.");
    
    currentState = STATE.EXPLORATION;
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

function saveCurrentState() {
    const nodeEcology = {};
    for (let y = 0; y < world.height; y++) {
        for (let x = 0; x < world.width; x++) {
            const node = world.nodes[y][x];
            if (node.discoveredSpecies && node.discoveredSpecies.length > 0) {
                nodeEcology[`${x},${y}`] = node.discoveredSpecies;
            }
        }
    }
    
    // Pass EventManager.getSaveData() into the save file!
    SaveManager.saveGame(
        currentSaveSlot, 
        player, 
        world.seed, 
        globalX, 
        globalY, 
        gameDay, 
        gameTimeMinutes, 
        discoveredNodes, 
        nodeEcology,
        EventManager.getSaveData() 
    );
}

// --- NODE LOADING ---

function loadLocalNode(entryDir) {
    const targetNode = world.nodes[globalY][globalX];
    currentBiome = BIOMES[targetNode.biomeId];
    currentLocalMap = generateLocalMap(targetNode, world.seed);

    // Ensure the node tracks its discovered fish species
    if (!targetNode.discoveredSpecies) targetNode.discoveredSpecies =[];

    // NEW: Generate the Local Ecosystem using the global helper
    // This replaces all the old manual loop logic!
    currentLocalFishPool = getFishPoolForNode(world.seed, globalX, globalY, currentBiome.id);

    let spawnX = LOCAL_MAP_SIZE / 2, spawnY = LOCAL_MAP_SIZE / 2;
    const EDGE_OFFSET = 15;
    if (entryDir === 'n') spawnY = LOCAL_MAP_SIZE - EDGE_OFFSET;
    else if (entryDir === 's') spawnY = EDGE_OFFSET;
    else if (entryDir === 'e') spawnX = EDGE_OFFSET;
    else if (entryDir === 'w') spawnX = LOCAL_MAP_SIZE - EDGE_OFFSET;

    const effStats = PlayerEngine.getEffectiveStats(player);
    const engineStats = {
        ...player.gear.boat.stats,
        speed: effStats.exploration.speed,
        hazardDodgeChance: effStats.exploration.hazardDodgeChance
    };

    ExplorationRenderer.buildMapCache(currentLocalMap, currentBiome);
    ExplorationEngine.init(spawnX, spawnY, engineStats, currentLocalMap, ExplorationEngine.heading, ExplorationEngine.velocity);
        // NEW: Check if this node has an active treasure event
    currentLocalChest = null;
    if (EventManager.Treasure.hasChest(globalX, globalY)) {
        const rng = createRng(world.seed + globalX * 10 + globalY * 100 + gameDay);
        const waterTiles =[];
        // Scan for a valid deep water spot
        for (let y = 10; y < LOCAL_MAP_SIZE - 10; y += 4) { 
            for (let x = 10; x < LOCAL_MAP_SIZE - 10; x += 4) {
                if (currentLocalMap.grid[y][x] === TILE.DEEP_WATER) waterTiles.push({x, y});
            }
        }
        if (waterTiles.length > 0) currentLocalChest = rng.pick(waterTiles);
    }

    HUD.cacheMinimap(currentLocalMap);

    ExplorationEngine.onDamage = (amount) => {
        player.vitals.hp -= amount;
        SFX.playLineSnap();
        HUD.logAction(`Collision! Hull took ${amount} damage.`, 'danger');
        if (player.vitals.hp <= 0) handleDeath();
    };

    ExplorationEngine.onZoneTransition = (dir) => {
        let moved = false;
        if (dir === 'n' && targetNode.exits.n && globalY > 0) { globalY--; moved = true; }
        if (dir === 's' && targetNode.exits.s && globalY < world.height - 1) { globalY++; moved = true; }
        if (dir === 'e' && targetNode.exits.e && globalX < world.width - 1) { globalX++; moved = true; }
        if (dir === 'w' && targetNode.exits.w && globalX > 0) { globalX--; moved = true; }

        if (moved) {
            player.vitals.rations--;
            if (player.vitals.rations < 0) {
                player.vitals.rations = 0;
                player.vitals.hp -= 20;
                HUD.logAction("Starving! Hull took 20 damage.", 'danger');
                if (player.vitals.hp <= 0) handleDeath();
            } else {
                HUD.logAction(`Sailed ${dir.toUpperCase()} into new region.`);
            }

            const nodeKey = `${globalX},${globalY}`;
            if (!discoveredNodes.includes(nodeKey)) {
                discoveredNodes.push(nodeKey);
                world.nodes[globalY][globalX].isDiscovered = true;
            }

            saveCurrentState();
            loadLocalNode(dir);
        } else {
            ExplorationEngine.velocity = -ExplorationEngine.velocity * 0.5;
        }
    };

    MusicEngine.playBiome(currentBiome.id, createRng(world.seed + globalX + globalY));
}

// --- HUB INTERACTION ---

function enterHub() {
    currentState = STATE.HUB;
    document.getElementById('interact-prompt').style.display = 'none';
    ExplorationEngine.velocity = 0; 
    keys.forward = keys.backward = keys.left = keys.right = false; 
    
    const targetNode = world.nodes[globalY][globalX];
    HUD.logAction("Docked at Settlement.");
    
    HubUI.open({ player, world, globalX, globalY, gameDay }, targetNode);
    saveCurrentState(); 
}

function resumeFromHub() {
    currentState = STATE.EXPLORATION;
    if (player.vitals.hp <= 0) player.vitals.hp = player.gear.boat.stats.maxHp;
    lastTime = performance.now();
    requestAnimationFrame(gameLoop);
}

// --- MASTER LOOP ---

function gameLoop(timestamp) {
    if (currentState === STATE.MENU || currentState === STATE.HUB || currentState === STATE.PAUSE) return;

    const dt = Math.min((timestamp - lastTime) / 1000, 0.1); 
    lastTime = timestamp;

    HUD.update(player, gameDay, gameTimeMinutes);

    if (currentState === STATE.EXPLORATION) {
        const effStats = PlayerEngine.getEffectiveStats(player);

        if (player.vitals.fuel > 0) {
            const fuelMult = effStats.exploration.fuelEfficiencyMult;
            player.vitals.fuel -= (player.gear.boat.upgrades.lantern.fuelDrainRate || 1.0) * fuelMult * dt * 0.1;
        }

        // --- NEW: TIME & DAY ROLLOVER (Events) ---
        gameTimeMinutes += dt; 
        if (gameTimeMinutes >= 24 * 60) { 
            gameTimeMinutes -= 24 * 60; 
            gameDay++; 
            EventManager.onNewDay(gameDay, world.seed);
            HUD.logAction("A new day begins. The Darklake shifts...", "safe");
        }

        if (mouse.isCharging) {
            mouse.chargePct = Math.min(1.0, mouse.chargePct + dt * 1.5);
            keys.forward = keys.backward = keys.left = keys.right = false; 
        }

        ExplorationEngine.update(dt, keys);
        
        // --- INTERACTION CHECK ---
        let canInteract = false;
        let interactMsg = "";
        const tx = Math.floor(ExplorationEngine.x);
        const ty = Math.floor(ExplorationEngine.y);
        
        const searchRadius = 3; 
        for (let y = Math.max(0, ty - searchRadius); y <= Math.min(LOCAL_MAP_SIZE - 1, ty + searchRadius); y++) {
            for (let x = Math.max(0, tx - searchRadius); x <= Math.min(LOCAL_MAP_SIZE - 1, tx + searchRadius); x++) {
                if (currentLocalMap.grid[y][x] === TILE.DOCK) {
                    canInteract = true;
                    interactMsg = "Press [E] to Dock";
                    break;
                }
            }
            if (canInteract) break;
        }

        const prompt = document.getElementById('interact-prompt');
        if (canInteract) {
            prompt.style.display = 'block';
            prompt.innerText = interactMsg;
            if (keys.actionJustPressed) {
                keys.actionJustPressed = false;
                enterHub();
            }
        } else {
            prompt.style.display = 'none';
        }
        
        keys.actionJustPressed = false;

        const lightRad = player.vitals.fuel > 0 ? player.gear.boat.upgrades.lantern.lightRadius : 40;
        
        // --- NEW: Pass currentLocalChest to Renderer ---
        ExplorationRenderer.render(ExplorationEngine, lightRad, mouse, false,[], currentLocalChest);
        HUD.drawMinimap(ExplorationEngine.x, ExplorationEngine.y);
    } 
    else if (currentState === STATE.FISHING) {
        const lightRad = player.vitals.fuel > 0 ? player.gear.boat.upgrades.lantern.lightRadius : 40;
        
        // --- NEW: Pass currentLocalChest to Renderer ---
        ExplorationRenderer.render(ExplorationEngine, lightRad, null, true,[], currentLocalChest);
        
        FishingEngine.update(dt, isReeling);
        FishingRenderer.update(FishingEngine, dt, isReeling);

        if (FishingEngine.phase === 'CAUGHT') {
            const effStats = PlayerEngine.getEffectiveStats(player);
            if (player.inventory.length < effStats.exploration.cargoSpace) {
                
                const caughtFish = FishingEngine.fishData; 
                
                // --- PROCESS TREASURE CHEST CATCH ---
                if (caughtFish.invType === 'chest_encounter') {
                    player.inventory.push({
                        id: `chest_${Date.now()}`,
                        instanceId: `inst_${Date.now()}`,
                        invType: 'chest',
                        name: 'Sunken Chest',
                        art: caughtFish.art, 
                        imageDataUrl: caughtFish.art.imageDataUrl,
                        chestSeed: caughtFish.chestSeed // <-- ADDED: Save it to the inventory item
                    });
                    
                    EventManager.Treasure.clearChest(globalX, globalY); 
                    currentLocalChest = null;
                    handleEndFishing("You hauled up a Sunken Chest!", "safe");
                    saveCurrentState();
                }

                // --- PROCESS NORMAL FISH CATCH ---
                else {
                    player.inventory.push(caughtFish);
                    
                    if (!player.bestiary[caughtFish.id]) {
                        const template = currentLocalFishPool.find(f => f.id === caughtFish.id) || caughtFish;
                        player.bestiary[caughtFish.id] = { xp: 0, caught: 0, speciesData: JSON.parse(JSON.stringify(template)) };
                    }
                    player.bestiary[caughtFish.id].caught++;

                    const targetNode = world.nodes[globalY][globalX];
                    if (!targetNode.discoveredSpecies.includes(caughtFish.id)) {
                        targetNode.discoveredSpecies.push(caughtFish.id);
                    }

                    player.activeQuests.forEach(q => {
                        if (q.targetSpeciesId === caughtFish.id) {
                            if (q.type === 'hunt' && q.currentAmount < q.requiredAmount) {
                                q.currentAmount++;
                            } else if (q.type === 'trophy' && caughtFish.actualWeight > q.currentBestWeight) {
                                q.currentBestWeight = caughtFish.actualWeight;
                            }
                        }
                        if (q.type === 'bounty' && !q.isComplete) {
                            if (caughtFish.identity.rarity === 'Boss' && globalX === q.targetNode.x && globalY === q.targetNode.y) {
                                q.isComplete = true;
                                HUD.logAction(`Bounty Complete: ${q.title}!`, "safe");
                            }
                        }
                    });

                    handleEndFishing(`Caught a ${caughtFish.identity.name} (${caughtFish.actualWeight}kg)!`, "safe");
                    saveCurrentState();
                }
            } else {
                handleEndFishing(`Cargo full! Released ${FishingEngine.fishData.identity.name}.`, "danger");
            }
        }
        else if (FishingEngine.phase === 'SNAPPED') handleEndFishing("Line snapped!", "danger");
        else if (FishingEngine.phase === 'ESCAPED') handleEndFishing("The fish escaped.", "danger");
    }

    requestAnimationFrame(gameLoop);
}

// --- ACTION HELPERS ---

function handleAttemptCast() {
    const effStats = PlayerEngine.getEffectiveStats(player);
    const screenBoatX = ExplorationRenderer.VIEW_W / 2;
    const screenBoatY = ExplorationRenderer.VIEW_H / 2;
    const dx = mouse.mouseX - screenBoatX, dy = mouse.mouseY - screenBoatY;
    const dist = Math.hypot(dx, dy);
    
    mouse.maxDist = 100 + (player.stats.fishing * 30);
    const finalDist = Math.min(dist, mouse.maxDist) * mouse.chargePct;
    const targetWorld = ExplorationRenderer.screenToWorld(screenBoatX + (dx / dist) * finalDist, screenBoatY + (dy / dist) * finalDist);
    
    const tx = Math.floor(targetWorld.x), ty = Math.floor(targetWorld.y);

    if (tx >= 0 && tx < LOCAL_MAP_SIZE && ty >= 0 && ty < LOCAL_MAP_SIZE) {
        const tId = currentLocalMap.grid[ty][tx];
        if ([TILE.WATER, TILE.DEEP_WATER, TILE.FLORA].includes(tId)) {
            ExplorationEngine.velocity = 0;
            
            const castRng = createRng(Date.now());
            let maxDepth = 20;
            if (tId === TILE.DEEP_WATER) maxDepth = castRng.int(50, 85);
            else if (tId === TILE.FLORA) maxDepth = castRng.int(20, 35);
            else maxDepth = castRng.int(12, 22);

            // 1. Generate Normal Fish Pool
            let castPool = Array.from({length: 10}, (_, i) => {
                let pool = currentLocalFishPool; 
                if (tId === TILE.DEEP_WATER) {
                    const ds = pool.filter(f => f.identity.family === 'deepsea');
                    if (ds.length > 0) pool = ds;
                }
                const template = castRng.pick(pool);
                return generateFishInstance(template, createRng(Date.now() + i));
            });

            // 2. Apply Stealth Filter
            const noiseLevel = ExplorationEngine.currentNoise || 0;
            const spookFactor = noiseLevel / 100;
            castPool = castPool.filter(fish => {
                const courage = fish.combat.aggression + (fish.identity.rarity === 'Boss' ? 2 : 0);
                return !(Math.random() < spookFactor && courage < 0.6);
            });

            // 3. Add Chest if in generous radius
            if (currentLocalChest) {
                const distToChest = Math.hypot(tx - currentLocalChest.x, ty - currentLocalChest.y);
                if (distToChest < 60) {
                    // NEW: Create a specific seed for this chest and save it
                    const chestSeed = Date.now();
                    const chestArt = generateChest({ rng: createRng(chestSeed), isMimic: false });
                    
                    castPool.push({
                        id: 'treasure_chest',
                        identity: { name: 'Sunken Chest', family: 'Treasure', rarity: 'Rare' },
                        art: chestArt, 
                        chestSeed: chestSeed, // <-- ADDED: Pass the seed forward
                        combat: { stamina: 120, speed: 60, aggression: 0, hookWindowMs: 2500 },
                        physical: { sizeTier: 'Medium', weightRange: {min: 50, max: 100} },
                        lurePrefs: { color: effStats.activeLure.color, sound: effStats.activeLure.sound, light: effStats.activeLure.light, weight: effStats.activeLure.weight, tolerance: 1.0 }, 
                        environment: { depthPref: 'Bottom-feeder' },
                        actualWeight: 75.0,
                        instanceId: `inst_${Date.now()}`,
                        invType: 'chest_encounter'
                    });
                }
            }

            if (castPool.length === 0) {
                HUD.logAction("Your boat was too noisy. All fish fled!", "danger");
                SFX.playError();
                mouse.isCharging = false;
                mouse.chargePct = 0;
                ExplorationEngine.velocity = 0;
                return; 
            }

            currentState = STATE.FISHING;
            document.getElementById('z50-action').style.display = 'flex';
            document.getElementById('z50-action').style.background = 'transparent';

            FishingEngine.startCast(effStats, player.stats.stamina, castPool, maxDepth);
            
            FishingRenderer.open({ lureDataUrl: player.gear.lure.imageDataUrl || '', biome: currentBiome, tileId: tId });
            HUD.logAction(`Line cast to ${maxDepth}m. Scroll to sink.`);

            setTimeout(() => {
                if (currentState === STATE.FISHING && FishingEngine.phase === 'SINKING') {
                    if (!FishingEngine.evaluateBite()) handleEndFishing("Nothing bit.", "danger");
                }
            }, 6000);
        } else {
            HUD.logAction("You hit land.");
        }
    }
}

function handleEndFishing(msg, type) {
    HUD.logAction(msg, type);
    FishingRenderer.close();
    document.getElementById('z50-action').style.display = 'none';
    currentState = STATE.EXPLORATION;

    // --- LURE DURABILITY DEGRADATION ---
    const lure = player.gear.lure;
    if (lure && lure.invType === 'lure' && lure.durability > 0) {
        
        // Line Snaps = -3 durability. Caught fish = -1 durability.
        if (FishingEngine.phase === 'SNAPPED') {
            lure.durability -= 3;
        } else if (FishingEngine.phase === 'CAUGHT') {
            lure.durability -= 1;
        }
        
        if (lure.durability <= 0) {
            HUD.logAction(`Your ${lure.name} broke!`, "danger");
            SFX.playLineSnap();
            // Revert to a basic bare hook fallback
            player.gear.lure = {
                name: 'Bare Hook',
                stats: { color: 0, sound: 0, light: 0, weight: 0 },
                durability: 0, maxDurability: 0,
                imageDataUrl: '' // Clears the image for the HUD
            };
        }
    }
}

function handleDeath() {
    // Prevent multiple triggers
    if (currentState === STATE.HUB || currentState === STATE.MENU) return;
    
    // Stop updates and movement immediately
    currentState = STATE.MENU; 
    ExplorationEngine.velocity = 0;
    keys.forward = keys.backward = keys.left = keys.right = false;
    mouse.isCharging = false;
    mouse.chargePct = 0;
    
    // Silence the music for dramatic effect
    MusicEngine.stop();

    // 1. Create Blackout Overlay
    const deathOverlay = document.createElement('div');
    deathOverlay.style.cssText = "position:absolute; inset:0; z-index:4000; background:#020617; display:flex; flex-direction:column; align-items:center; justify-content:center; opacity:0; transition: opacity 2s ease-in-out;";
    deathOverlay.innerHTML = `
        <h1 style="font-size:5rem; color:#EF4444; margin-bottom:1rem; text-shadow: 0 0 20px #EF4444;">HULL BREACHED</h1>
        <p style="color:#94A3B8; font-size:1.5rem; max-width:600px; text-align:center;">You black out as the freezing, dark waters rush in...</p>
    `;
    document.getElementById('game-container').appendChild(deathOverlay);
    
    // Trigger fade in
    setTimeout(() => { deathOverlay.style.opacity = '1'; }, 100);

    // 2. Process Penalties & Rescue Logic
    setTimeout(() => {
        // Cut gold in half
        const lostGold = Math.ceil(player.vitals.gold / 2);
        player.vitals.gold -= lostGold;
        
        // Discard ~50% of raw cargo (fish and parts), keep equipped gear/rods safe
        let lostItemsCount = 0;
        player.inventory = player.inventory.filter(item => {
            if (item.invType === 'fish' || item.invType === 'part') {
                if (Math.random() < 0.5) {
                    lostItemsCount++;
                    return false; // Discard it
                }
            }
            return true; // Keep it
        });

        // Restore HP to full
        player.vitals.hp = player.gear.boat.stats.maxHp;

        // Find Nearest Discovered Settlement
        let bestNode = world.nodes[world.startY][world.startX]; // Fallback to start node
        let minDistance = Infinity;

        for (let y = 0; y < world.height; y++) {
            for (let x = 0; x < world.width; x++) {
                const node = world.nodes[y][x];
                // Check if we have been there and it has a settlement
                if (node.isDiscovered && node.hasSettlement) {
                    // Calculate Manhattan distance grid-wise
                    const dist = Math.abs(x - globalX) + Math.abs(y - globalY);
                    if (dist < minDistance) {
                        minDistance = dist;
                        bestNode = node;
                    }
                }
            }
        }

        // Move player to the rescue settlement
        globalX = bestNode.x;
        globalY = bestNode.y;

        // 3. Update Overlay Message
        deathOverlay.innerHTML = `
            <h1 style="font-size:4rem; color:#FBBF24; margin-bottom:1rem; text-shadow: 0 0 20px rgba(251,191,36,0.5);">RESCUED</h1>
            <p style="color:#E2E8F0; font-size:1.5rem; max-width:600px; text-align:center; line-height: 1.5;">
                Scavengers dragged you to the docks of <b>${bestNode.settlementName}</b>.<br><br>
                <span style="color:#EF4444;">Lost <b>${lostGold}g</b> in rescue fees.</span><br>
                <span style="color:#EF4444;">Lost <b>${lostItemsCount}</b> cargo items to the depths.</span>
            </p>
        `;

        // Silently rebuild the background map for the new location
        loadLocalNode(null);
        
    }, 3000);

    // 4. Fade out and open Hub
    setTimeout(() => {
        deathOverlay.style.opacity = '0';
        setTimeout(() => {
            deathOverlay.remove();
            enterHub(); // Force opens the settlement UI
            saveCurrentState(); // Commit the penalties
        }, 2000);
    }, 9000);
}

function toggleGrimoire() {
    if (currentState === STATE.MENU || currentState === STATE.HUB) return;
    
    if (currentState === STATE.EXPLORATION) {
        currentState = STATE.GRIMOIRE;
        GrimoireUI.open({ player, world, globalX, globalY });
    } else if (currentState === STATE.GRIMOIRE) {
        currentState = STATE.EXPLORATION;
        GrimoireUI.close();
        lastTime = performance.now();
        requestAnimationFrame(gameLoop);
    }
}

function togglePause() {
    if (currentState === STATE.MENU || currentState === STATE.HUB) return;

    if (currentState === STATE.PAUSE) {
        currentState = stateBeforePause;
        PauseUI.close();
        Tone.Transport.start(); // Resumes generative music tracks
        lastTime = performance.now();
        requestAnimationFrame(gameLoop);
    } else {
        stateBeforePause = currentState;
        currentState = STATE.PAUSE;
        PauseUI.open();
        Tone.Transport.pause(); // Freezes music tracks dynamically
    }
}

// --- INPUT SETUP ---

function setupInputListeners() {
    window.onkeydown = (e) => {
        if (e.key === 'Tab') { e.preventDefault(); toggleGrimoire(); }
        if (e.key === 'Escape') { 
            e.preventDefault(); 
            if (currentState === STATE.GRIMOIRE) toggleGrimoire(); // Close grimoire first if open
            else togglePause(); 
        }
        if (currentState === STATE.EXPLORATION) {
            if (['w','ArrowUp'].includes(e.key)) keys.forward = true;
            if (['s','ArrowDown'].includes(e.key)) keys.backward = true;
            if (['a','ArrowLeft'].includes(e.key)) keys.left = true;
            if (['d','ArrowRight'].includes(e.key)) keys.right = true;
            if (['e','E'].includes(e.key)) {
                if (!keys.action) keys.actionJustPressed = true;
                keys.action = true;
            }
        } else if (currentState === STATE.FISHING && e.code === 'Space') isReeling = true;
    };

    window.onkeyup = (e) => {
        if (['w','ArrowUp'].includes(e.key)) keys.forward = false;
        if (['s','ArrowDown'].includes(e.key)) keys.backward = false;
        if (['a','ArrowLeft'].includes(e.key)) keys.left = false;
        if (['d','ArrowRight'].includes(e.key)) keys.right = false;
        if (['e','E'].includes(e.key)) {
            keys.action = false;
            keys.actionJustPressed = false;
        }
        if (e.code === 'Space') isReeling = false;
    };

    const container = document.getElementById('game-container');
    container.onmousemove = (e) => {
        const rect = container.getBoundingClientRect();
        mouse.mouseX = (e.clientX - rect.left) * (1280 / rect.width);
        mouse.mouseY = (e.clientY - rect.top) * (720 / rect.height);
    };

    container.onmousedown = () => {
        if (currentState === STATE.EXPLORATION) { mouse.isCharging = true; mouse.chargePct = 0; }
        else if (currentState === STATE.FISHING) {
            if (FishingEngine.phase === 'SINKING') handleEndFishing("Cast cancelled.", "normal");
            else { isReeling = true; if (FishingEngine.phase === 'BITE') FishingEngine.attemptHook(); }
        }
    };

    container.onmouseup = () => {
        if (currentState === STATE.EXPLORATION && mouse.isCharging) {
            mouse.isCharging = false;
            handleAttemptCast();
            mouse.chargePct = 0;
        }
        isReeling = false;
    };

    container.onwheel = (e) => {
        if (currentState === STATE.FISHING && FishingEngine.phase === 'SINKING') {
            FishingEngine.scrollDepth(e.deltaY / 15);
        }
    };
}