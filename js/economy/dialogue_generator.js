/**
 * js/economy/dialogue_generator.js
 * Procedural Dialogue Engine for NPCs.
 * Generates thematic greetings, haggling responses, lore, and gameplay hints
 * tailored specifically to the speaker's species and background.
 */

import { createRng } from '../util/rng.js';

// ==========================================
// 1. MASTER SPECIES DIALECT DICTIONARY
// ==========================================
export const SPECIES_DIALECTS = {
    Human: {
        greetings: {
            Merchant: [
                "Hooks, line, and standard sinkers. What do you need, angler?",
                "The darklake is particularly weary today. Stock up on fuel before you depart.",
                "Grounded goods from the upper levels. Pay the coin, take the gear, survive the tide."
            ],
            Fishmonger: [
                "Let's see what you pulled from the black. No rot-tails, I hope.",
                "I pay fair coppers for solid weight. Hand over your catch.",
                "The settlement is hungry. What kind of meat did you haul up?"
            ],
            Boatwright: [
                "A leaky hull is a short trip to the bottom. Let me patch those seams.",
                "Got some iron reinforcing plates in. Interested, or do you like taking damage?",
                "Your vessel looks like it fought a rock and lost. Let's get to work."
            ],
            TavernKeeper: [
                "Pull up a stool. The ale is thin, but the hearth is warm.",
                "Rest your bones, angler. The lake isn't going anywhere, but your health is.",
                "Need a drink? Or are you just staring at the notice board for coppers?"
            ],
            Default: [
                "Keep your lantern bright, friend. The dark has a habit of biting back.",
                "Safe sailing and clear horizons, angler.",
                "Damp air, cold water. Just another shift in the deep."
            ]
        },
        haggling: {
            success: [
                "A tough bargain, but fair enough. We both have to eat.",
                "Done. Try to keep your boat in one piece with that.",
                "Fine, fine. Take the gold and let me get back to my inventory."
            ],
            fail: [
                "Do I look like a fool? The price is the price.",
                "That's a fast way to get kicked out of my shop. No deal.",
                "I can't let it go for a pittance. Try again when you've got real gold."
            ]
        },
        lore: [
            "The old-timers say the Abyssal Trench has no bottom. Just cold pressure and things with too many teeth.",
            "They say the crystal storms in the grottos can shatter glass lanterns. Keep an acoustic buffer handy.",
            "Don't cook your rations near fungal spores. They'll rot your whole supply in minutes.",
            "If your tension gauge hits the red, let go of the reel. A lost fish is cheaper than a snapped line."
        ],
        rumors: [
            "If you're hunting the {fish}, my guess is you'll need a lure that's {trait}.",
            "Lost a good line to a {fish} once. They only strike if you drop something {trait} near them.",
            "Heading to the {biome}? Watch out for the {fish}. Word is it absolutely despises {anti_trait} bait.",
            "Old Baelar swears the trick to catching a {fish} is keeping the lure {trait}."
        ],
        questFlavors: {
            hunt: "We're running short on freshwater meat. Bring us some {target}.",
            trophy: "Some braggart in the tavern thinks no one can catch a {target} larger than {weight}kg. Go prove him wrong.",
            research: "The local scholars are writing a tract on the {target}. Go dissect a few so we can study their organs.",
            bounty: "A rogue {target} is breaking lines and destroying traps. Track it down near the {depth} in the {biome}.",
            courier: "Take this package to {destination}. It's highly perishable, so don't let your fuel run dry.",
            crafting: "An old friend of mine needs a custom lure. It has to be crafted with {reqs}."
        }
    },

    Dwarf: {
        greetings: {
            Merchant: [
                "Iron, gold, and stone. I sell gear built to last. What are you buying?",
                "You won't find better craftsmanship in these damp holes. Speak your business.",
                "Strap your pack and show your gold. I don't trade on empty promises."
            ],
            Fishmonger: [
                "Bring the scales closer. If it’s mushy cave-meat, I’m docking your pay.",
                "Solid fish make for solid meals. Show me what you hauled from the deep-wells.",
                "Let’s see the take. I’ve a heavy cleaver and a heavy purse for honest weight."
            ],
            Boatwright: [
                "Cracked plates and leaking hulls are a stone-dead end. Let me weld those seams.",
                "Want to reinforce your prow or upgrade that drafty lantern? I’ve got the iron.",
                "She’s taken a beating. Bring her to the hoist, and let’s see the damage."
            ],
            TavernKeeper: [
                "Warm fire and cold stout, lad. Pull up a bench.",
                "A hard shift on the water deserves a heavy mug. Sit down.",
                "The board is full of heavy labor. If you’ve got the grit, take a contract."
            ],
            Default: [
                "May your line run straight and your anvil stay true.",
                "By the deep-forge, the draft is freezing today.",
                "Move along, unless you’ve got coin to clink."
            ]
        },
        haggling: {
            success: [
                "You’ve a grip like a mountain vice. Fine, take it.",
                "By the forge, you're a stubborn one. Done.",
                "I'm losing coppers on this, but I respect a firm trade."
            ],
            fail: [
                "My metal has a fixed weight, and so does my price. No.",
                "I’d sooner melt this down for scrap than sell it for that.",
                "You insult my craft. Walk away and think on a real offer."
            ]
        },
        lore: [
            "Boats built of heavy iron can smash right through rocks, but don't expect them to turn on a copper coin.",
            "The pack ice in the frozen fjords will seize your engine solid. You need an icebreaker prow to split it.",
            "Sulphur water eats through canvas hulls like acid. Keep your plating thick, or sink in the red springs.",
            "True dwarven rods don't flex like cheap reeds. They hold the tension like a structural support beam."
        ],
        rumors: [
            "If you want to drag up a {fish}, you'll need a heavy, solid rig—something {trait}.",
            "A {fish} won't look at your hook unless you present something {trait}. It's the stone-cold truth.",
            "Do not use {anti_trait} bait in the {biome} if you're after the {fish}. It'll scare them straight into the rock fissures.",
            "Caught a massive {fish} near the deep-shelf. The only trick was keeping the lure strictly {trait}."
        ],
        questFlavors: {
            hunt: "Our mining crews need heavy rations. Haul in {amount} of those {target} beasts.",
            trophy: "A loudmouth claims he pulled a {target} out of the deep-well that weighs {weight}kg. Find a heavier one and break his pride.",
            research: "Our smiths need to analyze the scales of the {target}. Bring them to the dissection table.",
            bounty: "A ravenous {target} is smashing our support pylons. Put an end to it near the {depth} of the {biome}.",
            courier: "Deliver this iron-bound chest to {destination}. Move like a rockslide—no stopping.",
            crafting: "The shipyard needs a highly specific lure to test. Craft one with {reqs}."
        }
    },

    Elf: {
        greetings: {
            Merchant: [
                "Luminous threads and quiet instruments. What does your journey require?",
                "The deep waters are ancient and silent. Take our light to guide your path.",
                "Select your tools with grace, traveler. The grotto does not tolerate crude hands."
            ],
            Fishmonger: [
                "Show me the glittering treasures you have drawn from the silent pools.",
                "Every fish carries the colors of the deep caverns. Let us appraise your harvest.",
                "What silver scales have you gathered from the forgotten depths?"
            ],
            Boatwright: [
                "Your vessel’s lines are frayed and weary. Let us restore her elegance.",
                "We have quiet engines and starlit lanterns. Would you see your boat run silent?",
                "The stone has carved deep wounds into your bow. Bring her to rest, and we shall heal her."
            ],
            TavernKeeper: [
                "Welcome to our sanctuary, traveler. Sip our moss-wine and rest your mind.",
                "The silence of the grotto is sweet, but here we share the tales of the deep currents.",
                "The notice board holds many delicate tasks. Perhaps one aligns with your path?"
            ],
            Default: [
                "May the starlit currents run true beneath your bow.",
                "The grotto whispers of many ancient secrets today.",
                "Walk gracefully through the shadows, traveler."
            ]
        },
        haggling: {
            success: [
                "An elegant compromise. The trade is harmonious.",
                "You possess a sharp mind for exchange. The bargain is sealed.",
                "May this tool serve your journey well. The price is accepted."
            ],
            fail: [
                "That is a crude offer. It offends the harmony of our trade.",
                "We do not barter our finest works for mere pebbles. No.",
                "The price must reflect the elegance of the craft. I cannot accept."
            ]
        },
        lore: [
            "The grottos are filled with singing crystals. If you do not dampen your boat's noise, the resonance will crack your glass.",
            "The ancient whirlpools are not mere water; they are gravity wells torn into the fabric of the deep. Avoid their center.",
            "Lures that glow with starlight can draw ancient species from the blackest trenches.",
            "A delicate rod of crystal does not rely on brute strength; it feels the vibration of the water like a harp string."
        ],
        rumors: [
            "The silent currents whisper of the {fish}. It seeks only that which is {trait}.",
            "The {fish} is a creature of high grace; it will ignore your hook unless it is {trait}.",
            "Should you enter the {biome}, beware. The {fish} will flee if your bait smells of {anti_trait}.",
            "A traveler from the glistening pools spoke of a {fish} that only strikes when the lure is held {trait}."
        ],
        questFlavors: {
            hunt: "We require the delicate essence of the {target} for our rituals. Bring us {amount}.",
            trophy: "The scholars seek a legendary, giant {target} of at least {weight}kg. Seek it out.",
            research: "The biology of the {target} is still a mystery to our circle. Dissect them to reveal their secrets.",
            bounty: "An ancient, twisted {target} is disturbing the harmony of the {biome}. Lay it to rest near the {depth}.",
            courier: "Carry this delicate, glowing prism to {destination}. Treat it as you would a fragile dream.",
            crafting: "We must study the vibrational resonance of a custom lure. Craft one with {reqs}."
        }
    },

    Orc: {
        greetings: {
            Merchant: [
                "Heavy lines. Strong hooks. Buy. Fight the water.",
                "Water eats weak gear. Buy strong iron here.",
                "Speak. I have no time for small talk. Show gold."
            ],
            Fishmonger: [
                "Show fish. The city needs meat.",
                "Heavy catch? Good. Weak catch? No gold.",
                "Bring the flesh to the hooks. I pay for muscle."
            ],
            Boatwright: [
                "Smashed wood is useless. I weld iron plates here.",
                "You want to ram the rocks? Get a heavier prow.",
                "She’s broken. I fix. Pay gold."
            ],
            TavernKeeper: [
                "Drink the grog. Eat the meat. Sit.",
                "Tavern is warm. Outside is cold water. Stay.",
                "The board has blood-contracts. Take one if you are strong."
            ],
            Default: [
                "Keep your grip tight. The deep-beasts are hungry.",
                "Damp caves. Good hunting.",
                "Speak your business or move."
            ]
        },
        haggling: {
            success: [
                "Your gold is heavy enough. Take it.",
                "Good trade. No more words.",
                "Done. Go use it to kill a beast."
            ],
            fail: [
                "Weak gold. No trade.",
                "You insult my strength. Get out.",
                "The price is iron-final. Pay or walk."
            ]
        },
        lore: [
            "Heavy boats don't run from the rocks. They smash them. Get iron plating.",
            "The big maws in the volcanic springs will bite through weak lines. Use a steel rod.",
            "The ice is a coward's trap. It stops your boat. Get a heavy prow and crush it.",
            "Noise brings the monsters. If you want a fight, run your engine loud."
        ],
        rumors: [
            "You hunt {fish}? It wants {trait} lure. Weak colors fail.",
            "The {fish} is a fighter. It only strikes if your hook looks {trait}.",
            "The {fish} in the {biome} hates {anti_trait} bait. It will snap your line if you use it.",
            "Old hunter told me: {fish} wants {trait} lure. No exceptions."
        ],
        questFlavors: {
            hunt: "Our warriors need meat. Bring us {amount} of those heavy {target} beasts.",
            trophy: "A weakling says he caught a {target} of {weight}kg. Catch a bigger one to prove he is a liar.",
            research: "Show us how the {target} is built. Dissect them at our tables.",
            bounty: "A killer {target} is nesting in the {biome}. Kill it near the {depth}.",
            courier: "Take this skull-chest to {destination}. Run fast. Let no one stop you.",
            crafting: "We need a heavy, jagged lure to catch a monster. Craft one with {reqs}."
        }
    },

    Tiefling: {
        greetings: {
            Merchant: [
                "Wares of brass and bone. What little bargain are we making today?",
                "The darklake is freezing, but my stock is quite warm. Take a look.",
                "A clever angler always has a trick in their pocket. I sell those tricks."
            ],
            Fishmonger: [
                "What slithering treasures do you have tucked in that cargo hold?",
                "I adore exotic scales. Let's see what you've pulled from the dark recesses.",
                "Trade your catch for warm gold. Don't let it rot in the damp."
            ],
            Boatwright: [
                "Your ship is looking rather singed around the edges. Let me repair those plates.",
                "Want a motor with a bit of infernal kick? Or perhaps a brighter lantern?",
                "That's a nasty breach. Let me patch her up before the lake claims its cut."
            ],
            TavernKeeper: [
                "Welcome to the hearth, friend. Sip something hot and let's talk secrets.",
                "The notice board has some rather lucrative, delicate contracts today. Interested?",
                "Relax. The shadows can't reach you in here. What's your pleasure?"
            ],
            Default: [
                "May your line hook a fortune and your shadows stay behind you.",
                "Brimstone and damp moss... quite the aroma today, isn't it?",
                "Keep a lucky hand on your wheel, traveler."
            ]
        },
        haggling: {
            success: [
                "A delightfully sly bargain. We both win.",
                "You’ve a silver tongue, angler. The trade is made.",
                "Perfect. A little profit for me, a little luck for you."
            ],
            fail: [
                "Oh, I'm clever, but I'm not that generous. No deal.",
                "That’s a fast way to turn our little friendship cold. Try again.",
                "I need a bigger cut than that. Let's talk real coin."
            ]
        },
        lore: [
            "The boiling volcanic springs are lovely and warm, but they'll melt a skiff's hull in minutes without iron plating.",
            "Whirlpools are just the lake's way of trying to drag you into a bad bargain. An overclocked motor will pull you free.",
            "A glowing lure is like a beacon in the abyss. It draws the rarest predators, so make sure your drag is set tight.",
            "A flexible bone rod is perfect for tricking those serpentine eels. It bends just enough to keep them from snapping the line."
        ],
        rumors: [
            "A little secret: the {fish} is quite fond of things that are rather {trait}.",
            "If you're looking to snare a {fish}, make sure your lure looks exceptionally {trait}.",
            "Don't let your bait smell like {anti_trait} in the {biome}, or the {fish} will leave your hook empty.",
            "I heard a rumor from a very reliable shadow-strider: the {fish} only bites if the lure is kept {trait}."
        ],
        questFlavors: {
            hunt: "I have a client who pays heavily for fresh {target}. Bring me {amount}.",
            trophy: "There’s a little wager going on. Bring me a giant {target} of at least {weight}kg to secure my win.",
            research: "The alchemy guilds are paying handsomely for {target} organs. Dissect them and let's cash in.",
            bounty: "A very annoying {target} is disrupting our smuggling routes in the {biome}. End it near the {depth}.",
            courier: "Deliver this sealed parcel to {destination}. Don't ask what's inside, just move quickly.",
            crafting: "I need a highly deceptive, custom lure for a private client. Craft it with {reqs}."
        }
    },

    Myconid: {
        greetings: {
            Merchant: [
                "Spores drift. We have compiled minerals and fibers. What do you seek?",
                "The mycelium provides. Take our glowing caps and bound fibers.",
                "Our circle trades in quiet things. Show us your mineral tokens."
            ],
            Fishmonger: [
                "What organic matter have you harvested from the water-veins?",
                "We accept the damp flesh of the lake. It will make fine compost.",
                "Bring the cold scales to our circle. We shall return mineral gold."
            ],
            Boatwright: [
                "Your floating husk is decaying. We can bind it with resin and iron.",
                "Our alchemical filters can purify your engines. Would you see them run clean?",
                "The stone has ruptured your shell. Let us patch the breach with our moss-seal."
            ],
            TavernKeeper: [
                "Enter our circle. Rest in the damp warmth. The spores hum.",
                "We have compiled notice-board requests from the mycelium. What will you harvest?",
                "Our ferments are deep. Rest your fibers and listen to our collective."
            ],
            Default: [
                "May your spores drift far and find rich soil.",
                "The collective hums with quiet growth today.",
                "We feel your ripples in the damp dark."
            ]
        },
        haggling: {
            success: [
                "The exchange is balanced. The circle is satisfied.",
                "A fair division of matter. Take it.",
                "Our spores agree to this value. The gold is received."
            ],
            fail: [
                "Your offering lacks the proper mineral density. No.",
                "That value is decayed. We cannot accept.",
                "The collective rejects this trade. Offer more sustenance."
            ]
        },
        lore: [
            "The Rot Garden is peaceful, but the spore-storms will rot your food unless your boat has an alchemical filter.",
            "Whirlpools are wounds in the water-veins. They pull our spores into the void. Avoid their center.",
            "Myconid spores can be mashed into powerful baits. They force specific water-dwellers to rise to your hook.",
            "A hollow wooden rod is alive. It breathes with the water-currents, letting you feel the softest plucks."
        ],
        rumors: [
            "Our circle feels the {fish} pulsing. It drifts toward that which is {trait}.",
            "The {fish} resides in the deep-veins. It will only sprout near a hook that is {trait}.",
            "Do not cast {anti_trait} bait into the damp waters of the {biome}. The {fish} will rot the line before striking.",
            "The spores whisper: the {fish} is drawn solely to lures that are kept {trait}."
        ],
        questFlavors: {
            hunt: "Our compost requires the rich nutrients of the {target}. Harvest {amount} for us.",
            trophy: "A giant, ancient {target} of {weight}kg is decaying the local water-veins. Retrieve it.",
            research: "We must merge our knowledge with the biology of the {target}. Dissect them to feed our circle.",
            bounty: "A parasitic {target} is infecting our mycelium in the {biome}. Excise it near the {depth}.",
            courier: "Carry our dormant spore-pod to {destination}. Keep it safe from the dry air.",
            crafting: "We require a specialized lure to test fish-spore reactions. Craft one with {reqs}."
        }
    }
};

// ==========================================
// 2. BACKWARD-COMPATIBLE ACCESSOR ENGINE
// ==========================================
export const DialogueGenerator = {

    /**
     * Resolves the species greeting based on Role and NPC race.
     * Supports both getGreeting(npc, role, rng) and legacy getGreeting(role, rng)
     */
    getGreeting(npcOrRole, roleOrRng, optionalRng) {
        let race = 'Human';
        let role = 'Default';
        let rng;

        if (npcOrRole && typeof npcOrRole === 'object') {
            race = npcOrRole.race || 'Human';
            role = roleOrRng || 'Default';
            rng = optionalRng;
        } else {
            role = npcOrRole || 'Default';
            rng = roleOrRng;
            race = 'Human'; // Legacy fallback
        }

        const roleMap = {
            'Merchant': 'Merchant',
            'Fishmonger': 'Fishmonger',
            'Boatwright': 'Boatwright',
            'Tavern Keeper': 'TavernKeeper',
            'TavernKeeper': 'TavernKeeper',
        };
        const mappedRole = roleMap[role] || 'Default';

        const raceDialect = SPECIES_DIALECTS[race] || SPECIES_DIALECTS['Human'];
        const pool = raceDialect.greetings[mappedRole] || raceDialect.greetings['Default'] || SPECIES_DIALECTS['Human'].greetings['Default'];

        return rng.pick(pool);
    },

    /**
     * Resolves the species haggling complete dialogue.
     * Supports both getHaggleResponse(npc, isSuccess, rng) and legacy getHaggleResponse(isSuccess, rng)
     */
    getHaggleResponse(npcOrIsSuccess, isSuccessOrRng, optionalRng) {
        let race = 'Human';
        let isSuccess = true;
        let rng;

        if (npcOrIsSuccess && typeof npcOrIsSuccess === 'object') {
            race = npcOrIsSuccess.race || 'Human';
            isSuccess = !!isSuccessOrRng;
            rng = optionalRng;
        } else {
            isSuccess = !!npcOrIsSuccess;
            rng = isSuccessOrRng;
            race = 'Human'; // Legacy fallback
        }

        const raceDialect = SPECIES_DIALECTS[race] || SPECIES_DIALECTS['Human'];
        const pool = isSuccess ? raceDialect.haggling.success : raceDialect.haggling.fail;

        return rng.pick(pool);
    },

    /**
     * Resolves local lore.
     * Supports both getLore(npc, rng) and legacy getLore(rng)
     */
    getLore(npcOrRng, optionalRng) {
        let race = 'Human';
        let rng;

        if (npcOrRng && typeof npcOrRng === 'object') {
            race = npcOrRng.race || 'Human';
            rng = optionalRng;
        } else {
            rng = npcOrRng;
            race = 'Human'; // Legacy fallback
        }

        const raceDialect = SPECIES_DIALECTS[race] || SPECIES_DIALECTS['Human'];
        const pool = raceDialect.lore || SPECIES_DIALECTS['Human'].lore;

        return rng.pick(pool);
    },

    /**
     * Reads a fish's hidden stats and generates a species-specific gameplay hint.
     * Supports both generateRumor(fish, rng, npc) and legacy generateRumor(fish, rng)
     */
    generateRumor(fishData, rng, npc = null) {
        let race = 'Human';
        if (npc && typeof npc === 'object') {
            race = npc.race || 'Human';
        }

        if (!fishData) return this.getLore(npc || rng, npc ? rng : undefined);

        const raceDialect = SPECIES_DIALECTS[race] || SPECIES_DIALECTS['Human'];
        const template = rng.pick(raceDialect.rumors);
        
        // Pick one of the 4 stats to hint at
        const statToHint = rng.pick(['color', 'sound', 'light', 'weight']);
        const statValue = fishData.lurePrefs[statToHint];

        const traitPhrase = translateStatToAdjective(statToHint, statValue);
        const antiTraitPhrase = translateStatToAntiAdjective(statToHint, statValue);
        const biome = fishData.environment.biomes[0];

        // Replace template tags
        let rumor = template
            .replace('{fish}', fishData.identity.name)
            .replace('{trait}', traitPhrase)
            .replace('{anti_trait}', antiTraitPhrase)
            .replace('{biome}', biome.replace('_', ' '));

        return rumor;
    },

    /**
     * Attaches species-specific flavor text to a procedurally generated quest.
     * Supports both getQuestFlavor(quest, rng, npc) and legacy getQuestFlavor(quest, rng)
     */
    getQuestFlavor(quest, rng, npc = null) {
        let race = 'Human';
        if (npc && typeof npc === 'object') {
            race = npc.race || 'Human';
        } else if (npc && typeof npc === 'string') {
            race = npc;
        }

        const raceDialect = SPECIES_DIALECTS[race] || SPECIES_DIALECTS['Human'];
        const template = raceDialect.questFlavors[quest.type];

        if (!template) {
            return `We require assistance with this task: ${quest.desc || 'No details provided.'}`;
        }

        // Map requirements to a human-readable list for crafting quests
        let reqsText = 'specific stats';
        if (quest.requirements) {
            reqsText = quest.requirements.map(r => {
                const statNameCap = r.stat.charAt(0).toUpperCase() + r.stat.slice(1);
                let adjective = "Balanced";
                if (r.stat === 'color') adjective = r.min < -20 ? "Cold/Blue" : r.min > 20 ? "Warm/Red" : "Neutral";
                else if (r.stat === 'sound') adjective = r.min < -20 ? "Silent" : r.min > 20 ? "Loud" : "Quiet";
                else if (r.stat === 'light') adjective = r.min < -20 ? "Dark" : r.min > 20 ? "Glowing" : "Dim";
                else if (r.stat === 'weight') adjective = r.min < -20 ? "Floating" : r.min > 20 ? "Sinking" : "Medium";
                return `[${adjective} ${statNameCap}]`;
            }).join(' and ');
        }

        let flavor = template
            .replace('{target}', quest.targetName || 'the target')
            .replace('{weight}', quest.requiredWeight || '0')
            .replace('{amount}', quest.requiredAmount || '0')
            .replace('{depth}', (quest.depthHint || 'depth').toLowerCase())
            .replace('{biome}', (quest.targetBiome || 'waters').replace('_', ' '))
            .replace('{destination}', quest.turnInName || 'the destination')
            .replace('{reqs}', reqsText);

        return flavor;
    }
};

// ==========================================
// 3. DIALECT TEXT FORMATTING HELPERS
// ==========================================

function translateStatToAdjective(statType, value) {
    if (statType === 'color') {
        if (value < -40) return "cold and blue";
        if (value > 40) return "warm and red";
        return "neutral colored";
    }
    if (statType === 'sound') {
        if (value < -40) return "dead silent";
        if (value > 40) return "loud and rattling";
        return "quiet";
    }
    if (statType === 'light') {
        if (value < -40) return "pitch dark";
        if (value > 40) return "brightly glowing";
        return "dimly lit";
    }
    if (statType === 'weight') {
        if (value < -40) return "feather-light";
        if (value > 40) return "heavy and sinking";
        return "perfectly balanced";
    }
    return "standard";
}

function translateStatToAntiAdjective(statType, value) {
    if (statType === 'weight') return value > 0 ? "lightweight" : "heavy";
    if (statType === 'light') return value > 0 ? "dark" : "glowing";
    if (statType === 'sound') return value > 0 ? "silent" : "noisy";
    if (statType === 'color') return value > 0 ? "blue" : "red";
    return "weird";
}