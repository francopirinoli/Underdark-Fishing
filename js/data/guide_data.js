/**
 * js/data/guide_data.js
 * Contains all the text and formatting for the Grimoire's Angler's Guide.
 */

export const GUIDE_CHAPTERS = [
    {
        id: 'vitals',
        title: 'Vitals & Survival',
        content: `
            <h2 style="color: var(--cyan-glow); margin-top: 0;">Survival in the Darklake</h2>
            <p>The Underdark is unforgiving. Keep a close eye on your vitals located on the right-side HUD.</p>
            
            <h3 style="color: var(--green-safe);">Hull (HP)</h3>
            <p>If your Hull Integrity reaches zero, your boat sinks. You will be rescued by scavengers, but you will lose <span style="color:var(--red-danger);">half your gold and cargo</span>. Repair your hull at a Settlement's <b>Boatwright</b>, or carry <b>Repair Kits</b> in your cargo.</p>
            
            <h3 style="color: var(--gold-warn);">Fuel</h3>
            <p>Your lantern consumes Fuel over time, faster if your Intelligence stat is low. If you run out of fuel, you won't be able to see hazards or cast your line very far. Restore it by using <b>Oil Flasks</b>.</p>
            
            <h3 style="color: var(--accent-2);">Food (Rations)</h3>
            <p>You consume 1 Ration every time you travel to a new map node. If you run out, you will starve and take massive Hull damage. Buy Rations at the Merchant, or click <b style="color:var(--warn);">🔥 Cook</b> on a caught fish in your Cargo Hold.</p>
        `
    },
    {
        id: 'sailing',
        title: 'Sailing & Hazards',
        content: `
            <h2 style="color: var(--cyan-glow); margin-top: 0;">Navigating the Waters</h2>
            
            <h3 style="color: var(--gold-warn);">Momentum & Armor</h3>
            <p>Boats follow realistic momentum physics. <b style="color:var(--text-main);">Heavy boats (Dreadnoughts)</b> take time to accelerate, but have high <b>Armor (Damage Reduction)</b>, allowing them to smash through rocks unharmed. <b style="color:var(--text-main);">Light boats (Skiffs)</b> turn on a dime and have high <b>Evasion</b>, but take massive damage if you crash.</p>
            
            <h3 style="color: var(--green-safe);">Noise & Stealth</h3>
            <p>Driving fast generates Noise. <span style="color:var(--red-danger);">High Noise</span> will scare away rare, timid fish (watch for white splashes!), but will attract aggressive Bosses and Predators. Drift slowly to fishing spots to keep the waters undisturbed.</p>
            
            <h3 style="color: var(--accent-2);">Biome Hazards</h3>
            <p>Watch for red warning signs (⚠) on the global map indicating active weather.</p>
            <ul style="line-height: 1.6;">
                <li><b>Volcanic Boiling Water:</b> Damages hull over time. (Counter: <i>Iron Plating</i>)</li>
                <li><b>Frozen Pack Ice:</b> Slows your boat to a crawl. (Counter: <i>Icebreaker Prow</i>)</li>
                <li><b>Crystal Shatter-Storms:</b> Massive noise spikes and falling rocks. (Counter: <i>Acoustic Dampening</i>)</li>
                <li><b>Abyssal Whirlpools:</b> Sucks you into the void. (Counter: <i>Overclocked Motor</i>)</li>
            </ul>
        `
    },
    {
        id: 'fishing',
        title: 'The Art of Fishing',
        content: `
            <h2 style="color: var(--cyan-glow); margin-top: 0;">The Tug-of-War</h2>
            <p>Fishing is a battle of endurance. Do not just hold the reel button, or your line will snap!</p>
            
            <h3 style="color: var(--gold-warn);">The Drag Dial (Sweet Spot)</h3>
            <p>Use your <b style="color:var(--cyan-glow);">Mouse Scroll Wheel</b> to adjust your Reel Power. You must try to keep your power inside the golden <b>Sweet Spot</b>. If you miss the sweet spot, tension builds exponentially.</p>
            
            <h3 style="color: var(--green-safe);">Reading the Fish</h3>
            <ul style="line-height: 1.6;">
                <li><b>Holding (Resting):</b> The fish is resting to regain stamina. Scroll your drag to 100% and Reel!</li>
                <li><b>Running (Fleeing):</b> The fish is swimming away. <span style="color:var(--red-danger);">Drop your drag below 30% and LET GO of the reel</span>, or your line will snap. The fish will tire itself out while running.</li>
                <li><b>Thrashing/Bursting:</b> The fish is panicking. Lower your drag to survive the violent tension spikes.</li>
            </ul>

            <h3 style="color: #A855F7;">Second Wind</h3>
            <p>Fish Stamina acts as <b>Armor</b>. A fresh fish is incredibly heavy to pull. When a Boss hits 0% stamina, it may enter a <b>Second Wind</b>. It becomes temporarily invincible and rapidly regenerates health. However, its "Armor" drops to zero—this is your frantic window to haul it into the boat before it wakes up!</p>
        `
    },
    {
        id: 'gear',
        title: 'Gear & Lures',
        content: `
            <h2 style="color: var(--cyan-glow); margin-top: 0;">Tackle & Equipment</h2>
            
            <h3 style="color: var(--gold-warn);">Fishing Rods</h3>
            <p>Rods determine your baseline pulling power, tension limit, and sensitivity. Legendary rods may also possess <b>Magical Traits</b> (e.g., permanent glowing lines, or bonus power against Abyssal horrors).</p>
            
            <h3 style="color: var(--green-safe);">Lure Preferences</h3>
            <p>Every fish species has specific preferences for <b style="color:var(--cyan-glow);">Color, Sound, Light, and Weight</b>. Check your <b>Bestiary</b> to see what a fish likes. If your equipped lure doesn't closely match their preferences, they simply won't bite.</p>
            
            <h3 style="color: #A855F7;">Target Baits</h3>
            <p>Equip Bait in your Loadout to rig the ecosystem. Bait forces specific families of fish (like Sharks or Crustaceans) to spawn, and artificially boosts their rarity. Bait is consumed slightly with every cast.</p>
        `
    },
    {
        id: 'towns',
        title: 'Towns, Quests & Events',
        content: `
            <h2 style="color: var(--cyan-glow); margin-top: 0;">Settlements & The World</h2>
            
            <h3 style="color: var(--gold-warn);">The Three Vendors</h3>
            <ul style="line-height: 1.6;">
                <li><b>General Merchant:</b> Sells Rods, Consumables, and pre-crafted Lures/Potions.</li>
                <li><b>Fishmonger:</b> Buys your fish and sells raw organic parts.</li>
                <li><b>Boatwright:</b> Repairs your hull, sells new Boats, and sells Upgrades.</li>
            </ul>
            
            <h3 style="color: var(--green-safe);">The Notice Board</h3>
            <p>Check the Tavern for Quests. <b>Bounty Quests</b> are special: the quest text gives you hints about the monster's depth, time of day, and lure preferences. If you cast your line using those exact clues at the target map node, the monster is guaranteed to appear.</p>
            
            <h3 style="color: #A855F7;">Global Events</h3>
            <p>Look for icons on your Global Map. Golden cups (🏆) mean an active Fishing Tournament. Red warning signs (⚠) mean severe weather. Wandering boats on the local water are traveling merchants.</p>
        `
    },
    {
        id: 'alchemy',
        title: 'Dissection & Alchemy',
        content: `
            <h2 style="color: var(--cyan-glow); margin-top: 0;">Crafting System</h2>
            
            <h3 style="color: var(--gold-warn);">Cargo vs. Reagents</h3>
            <p>Caught fish take up valuable space in your <b>Cargo Hold</b>. If you click <b style="color:var(--red-danger);">🔪 Dissect</b> on a fish, it is destroyed, but yields crafting Parts. Parts go into your bottomless <b>Reagents Pouch (Tackle Box)</b>.</p>
            
            <h3 style="color: var(--green-safe);">The Crafting Bench</h3>
            <p>In the Tackle Box tab, select 3 to 5 parts to craft. <b style="color:var(--cyan-glow);">The FIRST part you select dictates what you make:</b></p>
            <ul style="line-height: 1.6;">
                <li><b>Sinkers / Spinners</b> ➔ Crafts a <b style="color:var(--cyan-glow);">Lure</b>.</li>
                <li><b>Spores / Guts / Tails</b> ➔ Crafts a <b style="color:var(--gold-warn);">Target Bait</b>.</li>
                <li><b>Oils / Silks / Bulbs</b> ➔ Brews a <b style="color:#A855F7;">Stat Potion</b>.</li>
            </ul>

            <h3 style="color: var(--accent-2);">The Artisan's Profit</h3>
            <p>Raw parts sell for very little gold. However, crafted Lures, Baits, and Potions sell for a massive <b>Value-Added markup</b>. A dedicated alchemist can buy cheap parts from the Fishmonger, craft them into potions, and sell them to the Merchant for a huge profit.</p>
        `
    },
    {
        id: 'progression',
        title: 'Progression & Safehouses',
        content: `
            <h2 style="color: var(--cyan-glow); margin-top: 0;">Building Your Legacy</h2>
            
            <h3 style="color: var(--gold-warn);">Leveling Up & Stats</h3>
            <p>You gain XP from catching fish and completing quests. Spend Stat Points wisely:</p>
            <ul style="line-height: 1.6; font-size: 0.95rem;">
                <li><b>Fishing:</b> Increases Reeling Power and Hook Reaction Window.</li>
                <li><b>Stamina:</b> Increases Max Stamina and recovery rate.</li>
                <li><b>Driving:</b> Increases Boat Speed, Stealth, Armor, and Evasion.</li>
                <li><b>Crafting:</b> Better dissection yields, higher durability, and stronger potions.</li>
                <li><b>Bartering:</b> Better shop prices. Extremely high bartering forces merchants to sell Legendary gear.</li>
                <li><b>Intelligence:</b> Boosts XP gain and makes your Lantern fuel last longer.</li>
            </ul>
            
            <h3 style="color: var(--green-safe);">Safehouses</h3>
            <p>You can purchase the Abandoned Warehouse in any settlement for 1,000g. This gives you a permanent <b>Stash</b> to hoard items, a <b>Dry Dock</b> to install boat upgrades and swap hulls, and a customizable <b>Aquarium</b> to display your favorite catches.</p>
        `
    }
];