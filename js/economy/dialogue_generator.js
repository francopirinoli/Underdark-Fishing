/**
 * js/economy/dialogue_generator.js
 * Procedural Dialogue Engine for NPCs.
 * Generates thematic greetings, haggling responses, lore, and gameplay hints.
 */

import { createRng } from '../util/rng.js';

const GREETINGS = {
    'Merchant':[
        "Hooks, line, and sinkers. What do you need?",
        "The dark waters take their toll. Buy some spares.",
        "Got fresh stock from the upper caves today."
    ],
    'Fishmonger':[
        "Let's see the catch. No rotten ones, I hope.",
        "I pay fair gold for heavy fish.",
        "The tavern needs meat. What did you pull from the depths?"
    ],
    'Tavern Keeper':[
        "Pull up a stool. The ale is warm, but the fire is bright.",
        "Rest your bones, angler. The lake isn't going anywhere.",
        "Need a drink? Or just looking for work?"
    ],
    'Boatwright':[
        "A cracked hull is a watery grave. Let me fix her up.",
        "Got some new plating in. Interested?",
        "Your vessel looks battered. Need repairs?"
    ],
    'Default':[
        "Watch the waters, friend.",
        "The Darklake hides many secrets.",
        "Safe travels."
    ]
};

const HAGGLE_RESPONSES = {
    success:[
        "A tough bargain, but fair enough.",
        "You drive a hard bargain. Done.",
        "Fine, fine. Take the gold.",
        "I'm losing coin on this, but alright."
    ],
    fail:[
        "Do I look like a fool? No deal.",
        "That's an insult. Try again or walk away.",
        "Not a chance. Take it or leave it.",
        "My prices are final for that."
    ]
};

const LORE_SNIPPETS =[
    "They say the Abyssal Trench has no bottom. Just endless dark.",
    "Don't sail into the Sulphur Springs without iron plating. The magma fish will tear right through canvas.",
    "I saw a glow in the water last night. Too big to be a jellyfish. Too fast to be a ray.",
    "The Myconids in the Rot Garden are peaceful, but the waters around them are toxic.",
    "Legend speaks of a crystal rod that resonates with the singing stones.",
    "If your tension meter hits the red, let go of the reel! Better to lose ground than snap your line."
];

const RUMOR_TEMPLATES =[
    "If you're hunting the {fish}, make sure your lure is {trait}.",
    "I lost a finger to a {fish} once. They only strike if you throw something {trait} at them.",
    "You heading to the {biome}? Watch out for the {fish}. I hear it hates {anti_trait} bait.",
    "Old Baelar caught a {fish} yesterday. Said the trick was keeping the lure {trait}.",
    "Trying to catch a {fish}? The secret is {trait} lures."
];

// Helper to translate a numerical stat (-100 to 100) into a conversational adjective
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
        if (value < -40) return "pitch black";
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

// Get the exact opposite for "It hates [anti_trait] bait" rumors
function translateStatToAntiAdjective(statType, value) {
    // If the fish likes heavy (> 40), it hates light.
    if (statType === 'weight') return value > 0 ? "lightweight" : "heavy";
    if (statType === 'light') return value > 0 ? "dark" : "glowing";
    if (statType === 'sound') return value > 0 ? "silent" : "noisy";
    if (statType === 'color') return value > 0 ? "blue" : "red";
    return "weird";
}

export const DialogueGenerator = {

    getGreeting(archetype, rng) {
        const pool = GREETINGS[archetype] || GREETINGS['Default'];
        return rng.pick(pool);
    },

    getHaggleResponse(isSuccess, rng) {
        const pool = isSuccess ? HAGGLE_RESPONSES.success : HAGGLE_RESPONSES.fail;
        return rng.pick(pool);
    },

    getLore(rng) {
        return rng.pick(LORE_SNIPPETS);
    },

    /**
     * Reads a fish's hidden stats and generates a gameplay hint.
     */
    generateRumor(fishData, rng) {
        if (!fishData) return this.getLore(rng);

        const template = rng.pick(RUMOR_TEMPLATES);
        
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
     * Attaches flavor text to a procedurally generated quest.
     */
    getQuestFlavor(quest, rng) {
        const openers =[
            "I have a task, if your hands aren't shaking.",
            "The town needs a favor.",
            "There's gold in it for you if you can handle this.",
            "Listen closely, angler."
        ];
        
        let hook = "";
        if (quest.type === 'hunt') hook = `We're running low on ${quest.targetName}. Restock us.`;
        if (quest.type === 'trophy') hook = `Some braggart thinks no one can catch a ${quest.targetName} that big. Show them.`;
        //[FIX]: Change targetFamily to targetName
        if (quest.type === 'research') hook = `The Guild needs fresh data on ${quest.targetName} anatomy. Start dissecting.`;
        if (quest.type === 'bounty') hook = `A monster is tearing up nets in the ${quest.targetBiome}. End it.`;

        return `${rng.pick(openers)} ${hook}`;
    }

};