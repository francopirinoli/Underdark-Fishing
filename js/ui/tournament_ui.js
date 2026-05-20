/**
 * js/ui/tournament_ui.js
 * Handles the Fishing Tournament Modal and the Floating Tracker.
 */

import { SFX } from '../audio/sfx_generator.js';
import { EventManager } from '../events/event_manager.js';
import { createRng } from '../util/rng.js';
import { generateRodData } from '../data/rod_data_generator.js';
import { generateLurePart } from '../art/lure_generator.js';
import { PlayerEngine } from '../data/player_data.js';
import { HUD } from './hud_ui.js'; 

export const TournamentUI = {
    gameState: null,
    tournament: null,
    npc: null,
    callbacks: null,
    typewriterTimer: null,

    init(callbacks) {
        this.callbacks = callbacks;

        document.getElementById('btn-tourn-leave').addEventListener('click', () => {
            SFX.playUISelect();
            if (this.typewriterTimer) clearInterval(this.typewriterTimer);
            this.close();
        });
    },

    open(state, npcBoat, tournamentData) {
        this.gameState = state;
        this.npc = npcBoat;
        this.tournament = tournamentData;

        document.getElementById('z65-tournament').style.display = 'flex';
        document.getElementById('tourn-dialogue-portrait').src = this.npc.npc.imageDataUrl; 
        document.getElementById('tourn-speaker').innerText = this.npc.npc.name + ":";

        this.renderContent();
    },

    close() {
        document.getElementById('z65-tournament').style.display = 'none';
        if (this.callbacks.onSave) this.callbacks.onSave();
        if (this.callbacks.onLeave) this.callbacks.onLeave();
    },

    triggerDialogue(text) {
        const textContainer = document.getElementById('tourn-text');
        textContainer.innerText = '""'; 

        if (this.typewriterTimer) clearInterval(this.typewriterTimer);

        let index = 0;
        this.typewriterTimer = setInterval(() => {
            if (index < text.length) {
                textContainer.innerText = `"${text.substring(0, index + 1)}"`;
                index++;
            } else {
                clearInterval(this.typewriterTimer);
            }
        }, 40); 

        SFX.speakText(text, this.npc.npc.race, this.npc.npc.gender, 40);
    },

    getObjectiveText() {
        const t = this.tournament;
        if (t.objectiveType === 'heavyweight') return "Heavyweight Haul (Total kg)";
        if (t.objectiveType === 'trophy') return "Trophy Hunter (Heaviest Fish kg)";
        if (t.objectiveType === 'specialist') return `Species Specialist (Most ${t.targetSpeciesName})`;
        if (t.objectiveType === 'high_roller') return "High Roller (Total Gold Value)";
        return "Unknown Objective";
    },

    renderContent() {
        const content = document.getElementById('tourn-content-area');
        const t = this.tournament;
        const player = this.gameState.player;

// 1. NOT YET PARTICIPATING (Sign Up)
        if (!t.isPlayerParticipating) {
            this.triggerDialogue(`Are you here for the tournament? The objective is ${this.getObjectiveText()}. Entry fee is ${t.entryFee}g.`);
            
            const hasFish = player.inventory.some(item => item.invType === 'fish');
            const canAfford = player.vitals.gold >= t.entryFee;
            
            // --- NEW: Time Restriction Check ---
            const currentMins = this.gameState.gameTimeMinutes || 0;
            const isTooLate = currentMins >= 18 * 60; // 18:00 PM
            
            let btnState = '';
            let btnText = `Pay Entry Fee (${t.entryFee}g)`;
            let warningHtml = '';

            if (isTooLate) {
                btnState = 'disabled';
                btnText = 'Too Late To Enter';
                warningHtml = `<div style="color:var(--red-danger); font-size: 1.1rem; margin-bottom: 1rem; text-align: center;">⚠ It's past 18:00. Tournament registration is closed for today. Come back tomorrow!</div>`;
            } else if (hasFish) {
                btnState = 'disabled';
                btnText = 'Empty Fish from Cargo';
                warningHtml = `<div style="color:var(--red-danger); font-size: 1.1rem; margin-bottom: 1rem; text-align: center;">⚠ You must empty your cargo of all fish before entering!</div>`;
            } else if (!canAfford) {
                btnState = 'disabled';
            }

            content.innerHTML = `
                <div style="background: var(--bg-void); border: 1px solid var(--panel-border); padding: 1.5rem; border-radius: 6px;">
                    <h3 style="margin: 0 0 1rem 0; color: var(--cyan-glow);">Tournament Rules</h3>
                    <ul style="color: var(--text-main); font-size: 1.2rem; line-height: 1.5; padding-left: 1.5rem; margin-bottom: 1.5rem;">
                        <li><b>Objective:</b> ${this.getObjectiveText()}</li>
                        <li><b>Time Limit:</b> 5 Hours</li> <!-- UPDATED -->
                        <li><b>Delivery:</b> You must bring your catches back to a competitor boat BEFORE time runs out to score points!</li>
                    </ul>
                    ${warningHtml}
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        <span style="font-size: 1.4rem; color:var(--gold-warn);">💰 You have: ${player.vitals.gold}g</span>
                        <button class="menu-btn" id="btn-pay-entry" style="width: auto; padding: 0.5rem 2rem; margin: 0; border-color: var(--gold-warn); color: var(--gold-warn);" ${btnState}>${btnText}</button>
                    </div>
                </div>
            `;

            const btnPay = document.getElementById('btn-pay-entry');
            if (btnPay && !btnPay.disabled) {
                btnPay.onclick = () => {
                    SFX.playGold();
                    player.vitals.gold -= t.entryFee;
                    t.isPlayerParticipating = true;
                    if (this.callbacks.onSave) this.callbacks.onSave();
                    this.renderContent();
                };
            }
        }
        
        // 2. ACTIVE TOURNAMENT (Deliver Catch)
        else if (t.isPlayerParticipating && !t.isFinished) {
            this.triggerDialogue(`Time is ticking! Deliver your haul to update your score.`);
            
            // Check inventory for valid fish
            let validFish = [];
            player.inventory.forEach(item => {
                if (item.invType === 'fish') {
                    if (t.objectiveType === 'specialist' && item.id !== t.targetSpeciesId) return;
                    validFish.push(item);
                }
            });

            // Calculate potential points
            let potentialPoints = 0;
            const effStats = PlayerEngine.getEffectiveStats(player);

            validFish.forEach(fish => {
                if (t.objectiveType === 'heavyweight') potentialPoints += fish.actualWeight;
                else if (t.objectiveType === 'trophy') potentialPoints = Math.max(potentialPoints, fish.actualWeight);
                else if (t.objectiveType === 'specialist') potentialPoints += 1;
                else if (t.objectiveType === 'high_roller') potentialPoints += Math.max(1, Math.round(fish.economy.baseValue * effStats.economy.sellMultiplier));
            });

            if (t.objectiveType === 'heavyweight' || t.objectiveType === 'trophy') {
                potentialPoints = Number(potentialPoints.toFixed(2));
            }

            content.innerHTML = `
                <div style="background: var(--bg-void); border: 1px solid var(--panel-border); padding: 1.5rem; border-radius: 6px; text-align: center;">
                    <h3 style="margin: 0 0 0.5rem 0; color: var(--cyan-glow);">${this.getObjectiveText()}</h3>
                    <div style="font-size: 1.2rem; color: var(--text-muted); margin-bottom: 1.5rem;">Current Score: <span style="color:var(--green-safe); font-weight:bold;">${t.playerScore}</span></div>
                    
                    <div style="font-size: 1.3rem; color: var(--text-main); margin-bottom: 1rem;">Valid Fish in Cargo: <b>${validFish.length}</b></div>
                    <div style="font-size: 1.1rem; color: var(--gold-warn); margin-bottom: 1.5rem;">Potential Points: +${potentialPoints}</div>
                    
                    <button class="menu-btn" id="btn-deliver" style="width: 100%; padding: 0.8rem; margin: 0; border-color: var(--green-safe); color: var(--green-safe);" ${validFish.length === 0 ? 'disabled' : ''}>Deliver Catch</button>
                </div>
            `;

            const btnDeliver = document.getElementById('btn-deliver');
            if (btnDeliver && !btnDeliver.disabled) {
                btnDeliver.onclick = () => {
                    SFX.playCatchSuccess();
                    
                    if (t.objectiveType === 'trophy') t.playerScore = Math.max(t.playerScore, potentialPoints);
                    else t.playerScore += potentialPoints;

                    // --- NEW: Calculate market value of delivered fish ---
                    t.playerDeliveredValue = t.playerDeliveredValue || 0; // Fallback for older saves
                    let deliveredGold = 0;
                    validFish.forEach(fish => {
                        const baseVal = fish.economy ? (fish.economy.baseValue || fish.economy.value) : 10;
                        deliveredGold += Math.max(1, Math.round(baseVal * effStats.economy.sellMultiplier));
                    });
                    t.playerDeliveredValue += deliveredGold;

                    // Remove delivered fish from inventory
                    player.inventory = player.inventory.filter(item => !validFish.includes(item));
                    
                    if (this.callbacks.onSave) this.callbacks.onSave();
                    this.renderContent();
                };
            }
        }

// 3. TOURNAMENT FINISHED (Results & Payout)
        else if (t.isFinished && !t.hasClaimedReward) {
            this.triggerDialogue(`Time's up! Let's look at the final standings.`);
            
            // Generate final leaderboard
            const leaderboard = EventManager.Tournament.getLiveCompetitors(t);
            leaderboard.push({ name: player.identity.name, currentScore: t.playerScore, isPlayer: true });
            leaderboard.sort((a, b) => b.currentScore - a.currentScore);

            const playerRank = leaderboard.findIndex(c => c.isPlayer) + 1;
            
            let html = `<div style="background: var(--bg-void); border: 1px solid var(--panel-border); padding: 1.5rem; border-radius: 6px;">
                            <h3 style="margin: 0 0 1rem 0; color: var(--gold-warn); text-align:center;">Final Results</h3>
                            <div style="display:flex; flex-direction:column; gap:0.5rem; margin-bottom: 1.5rem;">`;
            
            leaderboard.forEach((c, index) => {
                const color = c.isPlayer ? 'var(--green-safe)' : 'var(--text-main)';
                const rankColors = ['#FBBF24', '#94A3B8', '#B45309', 'var(--text-muted)'];
                html += `<div style="display:flex; justify-content:space-between; font-size:1.3rem; color:${color}; padding:0.4rem; background:rgba(15,23,42,0.5); border-radius:4px;">
                            <span><b style="color:${rankColors[index] || 'var(--text-muted)'}; width:30px; display:inline-block;">#${index+1}</b> ${c.name}</span>
                            <b>${c.currentScore}</b>
                         </div>`;
            });

            const deliveredVal = t.playerDeliveredValue || 0;

            html += `</div>
                     <div style="margin-bottom: 1.5rem; text-align: center; font-size: 1.2rem; color: var(--text-main);">
                         Market Value of Delivered Catch: <span style="color:var(--green-safe); font-weight:bold;">${deliveredVal}g</span>
                     </div>
                     <button class="menu-btn" id="btn-claim" style="width: 100%; padding: 0.8rem; margin: 0; border-color: var(--cyan-glow); color: var(--cyan-glow);">Claim Payout</button>
                     </div>`;
                     
            content.innerHTML = html;

            document.getElementById('btn-claim').onclick = () => {
                t.hasClaimedReward = true;
                
                // EVERYONE gets their fish market value back
                if (deliveredVal > 0) {
                    player.vitals.gold += deliveredVal;
                    HUD.logAction(`Earned ${deliveredVal}g from delivered fish.`, "safe");
                }
                
                if (playerRank === 1) {
                    SFX.playLevelUp(); 
                    const winnings = t.entryFee * createRng(Date.now()).int(3, 5);
                    player.vitals.gold += winnings;
                    HUD.logAction(`1st Place! Won ${winnings}g!`, "safe");

                    // 25% chance for rare loot
                    if (Math.random() < 0.25) {
                        const rng = createRng(Date.now());
                        if (rng.chance(0.5)) {
                            const rod = generateRodData({ seed: Date.now() });
                            rod.invType = 'rod';
                            player.inventory.push(rod);
                            HUD.logAction(`Bonus Prize: ${rod.identity.name}!`, "safe");
                        } else {
                            const rareParts =['phosphor_cap', 'wraith_silk', 'myconid_spore', 'jelly_bell'];
                            const pId = rng.pick(rareParts);
                            const pName = pId.split('_').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ');
                            player.inventory.push({
                                id: `part_${rng.int(10000,99999)}`, invType: 'part', name: pName, visualId: pId, rarity: 'Rare',
                                stats: { color: rng.int(-20,20), sound: rng.int(-20,20), light: rng.int(-20,20), weight: rng.int(-20,20) },
                                imageDataUrl: generateLurePart({ visualId: pId, rng })
                            });
                            HUD.logAction(`Bonus Prize: ${pName}!`, "safe");
                        }
                    }
                } else if (playerRank === 2) {
                    SFX.playGold();
                    player.vitals.gold += t.entryFee;
                    HUD.logAction(`2nd Place. Recouped ${t.entryFee}g entry fee.`, "normal");
                } else {
                    SFX.playError();
                    HUD.logAction(`You placed #${playerRank}. Better luck next time!`, "danger");
                }

                if (this.callbacks.onSave) this.callbacks.onSave();
                this.renderContent(); 
            };
        }

        // 4. ALREADY COMPLETED & CLAIMED
        else if (t.hasClaimedReward) {
            this.triggerDialogue(`The tournament is over for today. Come back tomorrow for another round!`);
            
            content.innerHTML = `
                <div style="background: var(--bg-void); border: 1px solid var(--panel-border); padding: 1.5rem; border-radius: 6px; text-align: center;">
                    <h3 style="margin: 0 0 0.5rem 0; color: var(--text-muted);">Tournament Concluded</h3>
                    <p style="font-size: 1.2rem; color: var(--text-main);">The results are locked in and prizes have been distributed.</p>
                </div>
            `;
        }
    },

// --- TRACKER HUD UPDATES ---
    updateTracker(tournament) {
        const tracker = document.getElementById('tournament-tracker');
        if (!tournament.isPlayerParticipating || tournament.hasClaimedReward) {
            tracker.style.display = 'none';
            return;
        }

        tracker.style.display = 'flex';
        document.getElementById('tt-objective').innerText = this.getObjectiveText.call({tournament});

        // --- NEW: Format as In-Game Hours & Minutes ---
        const totalMinsRemaining = Math.floor(tournament.timeRemaining);
        const hrs = Math.floor(totalMinsRemaining / 60);
        const mins = (totalMinsRemaining % 60).toString().padStart(2, '0');
        
        document.getElementById('tt-time').innerText = `${hrs}h ${mins}m`;
        // Turns red when less than 1 in-game hour remains (60 real-time seconds)
        document.getElementById('tt-time').style.color = tournament.timeRemaining <= 60 ? 'var(--red-danger)' : 'var(--text-main)';

        // Dynamic 1st/2nd Place text based on who is winning
        const leaderboard = EventManager.Tournament.getLiveCompetitors(tournament);
        const topRivalScore = leaderboard[0].currentScore;
        const firstPlaceLabel = document.getElementById('tt-first').previousElementSibling;

        if (tournament.playerScore >= topRivalScore) {
            firstPlaceLabel.innerText = "2nd Place:";
        } else {
            firstPlaceLabel.innerText = "1st Place:";
        }

        document.getElementById('tt-first').innerText = topRivalScore;
        document.getElementById('tt-player').innerText = tournament.playerScore;
    },

    hideTracker() {
        document.getElementById('tournament-tracker').style.display = 'none';
    }
};