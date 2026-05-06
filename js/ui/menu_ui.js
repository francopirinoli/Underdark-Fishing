/**
 * js/ui/menu_ui.js
 * Manages the Main Menu and Character Creation screens.
 */

import { SFX } from '../audio/sfx_generator.js';
import { generateNPCData, generateName } from '../data/npc_data_generator.js';
import { SaveManager } from '../util/save_manager.js';
import { createRng } from '../util/rng.js';
import { showStatTooltip, moveStatTooltip, hideStatTooltip } from '../util/utils.js'; // Added
import { STAT_DESCRIPTIONS } from '../data/player_data.js'; // Added

export const MenuUI = {
    ccStats: { fishing: 1, stamina: 1, driving: 1, lureCrafting: 1, bartering: 1, intelligence: 1 },
    ccPoints: 3,
    ccIdentity: null,
    callbacks: null,
    selectedSlot: 1, // NEW: Tracks which slot we are creating a character for

    init(callbacks) {
        this.callbacks = callbacks;

        document.getElementById('cc-race').onchange = () => this.updateCCPortrait();
        document.getElementById('cc-gender').onchange = () => this.updateCCPortrait();
        document.getElementById('btn-cc-reroll').onclick = () => { SFX.playUIHover(); this.updateCCPortrait(); };
        
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
            // Pass the selected slot back to game.js
            this.callbacks.onNewGame(this.selectedSlot, playerData, { ...this.ccStats }, this.ccPoints);
        };
    },

    showMainMenu() {
        const menus = document.getElementById('z200-menus');
        const screenStart = document.getElementById('screen-start');
        const screenChar = document.getElementById('screen-char-create');
        
        menus.style.display = 'flex';
        screenStart.style.display = 'flex';
        screenChar.style.display = 'none';

        // Render Save Slots dynamically
        const container = document.getElementById('save-slots-container');
        container.innerHTML = '';

        for (let i = 1; i <= 3; i++) {
            const info = SaveManager.getSaveInfo(i);
            const wrapper = document.createElement('div');
            wrapper.style.display = 'flex';
            wrapper.style.flexDirection = 'column';
            wrapper.style.gap = '0.5rem';

            const btn = document.createElement('button');
            btn.className = 'menu-btn';
            btn.style.width = '240px';
            btn.style.margin = '0';
            btn.style.padding = '1rem';

            if (info) {
                btn.innerHTML = `
                    <div style="display:flex; align-items:center; gap: 1rem; text-align: left;">
                        <img src="${info.portrait}" style="width: 48px; height: 48px; background: #000; border: 1px solid var(--panel-border); border-radius: 4px; image-rendering: pixelated;">
                        <div>
                            <span style="color:var(--cyan-glow); font-size:1.4rem;">${info.name}</span><br>
                            <span style="color:var(--gold-warn); font-size:1rem;">Day ${info.day} - ${info.gold}g</span><br>
                            <span style="color:var(--text-muted); font-size:0.9rem;">Slot ${i}</span>
                        </div>
                    </div>
                `;
                btn.onclick = () => { SFX.playUISelect(); this.callbacks.onLoadGame(i); };
                
                const delBtn = document.createElement('button');

                delBtn.className = 'menu-btn';
                delBtn.style.cssText = 'width: 100%; margin: 0; padding: 0.4rem; font-size: 1rem; border-color: var(--red-danger); color: var(--red-danger);';
                delBtn.innerText = 'Delete Save';
                delBtn.onclick = () => {
                    SFX.playError();
                    SaveManager.deleteSave(i);
                    this.showMainMenu();
                };
                
                wrapper.appendChild(btn);
                wrapper.appendChild(delBtn);
            } else {
                btn.innerHTML = `<span style="color:var(--text-main); font-size:1.6rem;">Slot ${i}</span><br><br><span style="color:var(--text-muted); font-size:1.1rem;">- Empty -</span>`;
                btn.onclick = () => { 
                    SFX.playUISelect(); 
                    this.selectedSlot = i;
                    this.showCharacterCreator(); 
                };
                wrapper.appendChild(btn);
            }
            container.appendChild(wrapper);
        }
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

            // Add Hover Events for Tooltips
            row.addEventListener('mouseenter', (e) => showStatTooltip(displayNames[key], STAT_DESCRIPTIONS[key], e));
            row.addEventListener('mousemove', moveStatTooltip);
            row.addEventListener('mouseleave', hideStatTooltip);
            
            list.appendChild(row);
        }
    }
};