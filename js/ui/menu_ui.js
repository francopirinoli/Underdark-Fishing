/**
 * js/ui/menu_ui.js
 * Manages the Main Menu and Character Creation screens.
 */

import { SFX } from '../audio/sfx_generator.js';
import { generateNPCData, generateName } from '../data/npc_data_generator.js'; // <-- Updated
import { SaveManager } from '../util/save_manager.js';
import { createRng } from '../util/rng.js'; // <-- Added

export const MenuUI = {
    ccStats: { fishing: 1, stamina: 1, driving: 1, lureCrafting: 1, bartering: 1, intelligence: 1 },
    ccPoints: 3,
    ccIdentity: null,
    callbacks: null,

    /**
     * Wires up the Main Menu UI events.
     * @param {Object} callbacks - Contains onNewGame(playerData, stats) and onLoadGame()
     */
    init(callbacks) {
        this.callbacks = callbacks;

        // Start Screen Buttons
        const btnLoad = document.getElementById('btn-load-game');
        if (SaveManager.hasSave()) {
            btnLoad.disabled = false;
            btnLoad.onclick = () => {
                SFX.playUISelect();
                this.callbacks.onLoadGame();
            };
        }

        document.getElementById('btn-new-game').onclick = () => {
            SFX.playUISelect();
            this.showCharacterCreator();
        };

        document.getElementById('cc-race').onchange = () => this.updateCCPortrait();
        document.getElementById('cc-gender').onchange = () => this.updateCCPortrait();
        document.getElementById('btn-cc-reroll').onclick = () => { 
            SFX.playUIHover(); 
            this.updateCCPortrait(); 
        };
        
        // --- NEW: Random Name Button ---
        document.getElementById('btn-cc-random-name').onclick = () => {
            SFX.playUIHover();
            const race = document.getElementById('cc-race').value;
            const gender = document.getElementById('cc-gender').value;
            const rng = createRng(Date.now());
            document.getElementById('cc-name').value = generateName(race, gender, rng);
        };
        
        document.getElementById('btn-embark').onclick = () => {
            SFX.playCatchSuccess();
            
            const playerData = {
                name: document.getElementById('cc-name').value,
                race: document.getElementById('cc-race').value,
                gender: document.getElementById('cc-gender').value,
                portraitData: this.ccIdentity.imageDataUrl
            };
            
            // [FIX]: Pass the remaining unspent points
            this.callbacks.onNewGame(playerData, { ...this.ccStats }, this.ccPoints);
        };
    },

    /**
     * Displays the initial Start Screen.
     */
    showMainMenu() {
        const menus = document.getElementById('z200-menus');
        const screenStart = document.getElementById('screen-start');
        const screenChar = document.getElementById('screen-char-create');
        
        menus.style.display = 'flex';
        screenStart.style.display = 'flex';
        screenChar.style.display = 'none';
    },

    /**
     * Hides the Start Screen and shows the Character Creator.
     */
    showCharacterCreator() {
        document.getElementById('screen-start').style.display = 'none';
        document.getElementById('screen-char-create').style.display = 'flex';
        
        this.renderCCStats();
        this.updateCCPortrait();
    },

    /**
     * Generates a new NPC portrait based on the selected Race and Gender.
     */
    updateCCPortrait() {
        const race = document.getElementById('cc-race').value;
        const gender = document.getElementById('cc-gender').value;
        
        this.ccIdentity = generateNPCData({ seed: Date.now(), race, gender });
        document.getElementById('cc-portrait').src = this.ccIdentity.imageDataUrl;
        
        // Auto-fill a name if it hasn't been heavily customized
        const nameInput = document.getElementById('cc-name');
        if (nameInput.value === 'Angler' || nameInput.value === '') {
            nameInput.value = this.ccIdentity.name;
        }
    },

    /**
     * Renders the + / - stat allocation buttons.
     */
    renderCCStats() {
        document.getElementById('cc-pts').innerText = this.ccPoints;
        const list = document.getElementById('cc-stats-list');
        list.innerHTML = '';
        
        const displayNames = {
            fishing: "Fishing", stamina: "Stamina", driving: "Driving", 
            lureCrafting: "Lure Crafting", bartering: "Bartering", intelligence: "Intelligence"
        };

        for (const [key, val] of Object.entries(this.ccStats)) {
            const row = document.createElement('div');
            row.className = 'stat-row';
            row.innerHTML = `
                <span>${displayNames[key]}</span>
                <div class="stat-controls">
                    <button class="btn-minus" data-stat="${key}" ${val <= 1 ? 'disabled' : ''}>-</button>
                    <span class="stat-val">${val}</span>
                    <button class="btn-plus" data-stat="${key}" ${(this.ccPoints <= 0 || val >= 5) ? 'disabled' : ''}>+</button>
                </div>
            `;
            
            row.querySelector('.btn-minus').onclick = () => {
                if (this.ccStats[key] > 1) { 
                    this.ccStats[key]--; 
                    this.ccPoints++; 
                    SFX.playUIHover(); 
                    this.renderCCStats(); 
                }
            };
            row.querySelector('.btn-plus').onclick = () => {
                if (this.ccPoints > 0 && this.ccStats[key] < 5) { 
                    this.ccStats[key]++; 
                    this.ccPoints--; 
                    SFX.playUISelect(); 
                    this.renderCCStats(); 
                }
            };
            
            list.appendChild(row);
        }
    }
};