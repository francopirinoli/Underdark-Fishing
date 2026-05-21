/**
 * js/data/npc_data_generator.js
 * Master factory for generating NPCs.
 * Combines procedural pixel art with flavor data (Names, Ages, Archetypes).
 * V7 - Dynamic Tiefling Name Proxying & Combinatorial Myconid Circle Surnames.
 */

import { createRng } from '../util/rng.js';
import { RACE_PROFILES, SKIN_TONES, HAIR_COLORS, EYE_COLORS, CLOTHING_COLORS } from '../art/npc_palettes.js';

// Import Art Generators
import { generateHumanMale } from '../art/human_male.js';
import { generateHumanFemale } from '../art/human_female.js';
import { generateDwarfMale } from '../art/dwarf_male.js';
import { generateDwarfFemale } from '../art/dwarf_female.js';
import { generateElfMale } from '../art/elf_male.js';
import { generateElfFemale } from '../art/elf_female.js';
import { generateOrcMale } from '../art/orc_male.js';
import { generateOrcFemale } from '../art/orc_female.js';

// --- NEW GENERATOR IMPORTS ---
import { generateTieflingMale } from '../art/tiefling_male.js';
import { generateTieflingFemale } from '../art/tiefling_female.js';
import { generateMyconid } from '../art/myconid_generator.js';

const ART_GENERATORS = {
    'Human_Male': generateHumanMale,
    'Human_Female': generateHumanFemale,
    'Dwarf_Male': generateDwarfMale,
    'Dwarf_Female': generateDwarfFemale,
    'Elf_Male': generateElfMale,
    'Elf_Female': generateElfFemale,
    'Orc_Male': generateOrcMale,
    'Orc_Female': generateOrcFemale,
    
    // NEW RACES
    'Tiefling_Male': generateTieflingMale,
    'Tiefling_Female': generateTieflingFemale,
    'Myconid_Male': generateMyconid,   // Myconids use one unified generator
    'Myconid_Female': generateMyconid
};

// --- FLAVOR TABLES ---

const NAMES = {
    Human: {
        Male: { prefix: ['Ald', 'Gar', 'Tor', 'Bran', 'Kael', 'Sil', 'Cor', 'Fen', 'Mar', 'Val', 'Row', 'Der', 'Jal', 'Cas'], suffix: ['ric', 'in', 'on', 'is', 'as', 'ok', 'en', 'ar', 'us', 'ian', 'ard'] },
        Female: { prefix: ['El', 'Ar', 'Mir', 'Lir', 'Sel', 'Val', 'Kae', 'Ly', 'Syr', 'Is', 'Mar', 'Jes', 'Cat', 'Ros'], suffix: ['ena', 'is', 'a', 'ia', 'ina', 'wen', 'lys', 'ra', 'elle', 'ana', 'eth'] }
    },
    Dwarf: {
        Male: { prefix: ['Thor', 'Bram', 'Durg', 'Grim', 'Garr', 'Thra', 'Kran', 'Bro', 'Hroth', 'Or', 'Bal', 'Dain'], suffix: ['in', 'or', 'ur', 'ak', 'ar', 'ek', 'im', 'ir', 'ok', 'ik', 'uk', 'am'] },
        Female: { prefix: ['Hel', 'Dis', 'Brin', 'Kov', 'Thal', 'Dag', 'Gim', 'Nyr', 'Run', 'Sig', 'Aud', 'Bav'], suffix: ['ga', 'a', 'ia', 'ra', 'da', 'na', 'dis', 'run', 'gret', 'va', 'hild'] }
    },
    Elf: {
        Male: { prefix: ['Fae', 'Syl', 'Aer', 'Luc', 'Mith', 'Ith', 'Cae', 'Lor', 'Zan', 'Tae', 'Ael', 'Bae', 'Cor'], suffix: ['lar', 'in', 'on', 'ian', 'rel', 'el', 'ir', 'is', 'orn', 'thil', 'dil'] },
        Female: { prefix: ['Ael', 'Thal', 'Ily', 'Loe', 'Xil', 'Mae', 'Syr', 'Nym', 'Vae', 'Lyr', 'Aria', 'Cae'], suffix: ['iana', 'ia', 'en', 'ra', 'ys', 'a', 'elle', 'wen', 'wyn', 'ria', 'sia'] }
    },
    Orc: {
        Male: { prefix: ['Grom', 'Urz', 'Thrak', 'Kha', 'Mog', 'Ghash', 'Bru', 'Drog', 'Gru', 'Skum', 'Az', 'Bok'], suffix: ['ak', 'ul', 'ka', 'arg', 'or', 'uk', 'at', 'mash', 'nak', 'gash', 'og'] },
        Female: { prefix: ['Maz', 'Ruz', 'Ghar', 'Shag', 'Zog', 'Baga', 'Nar', 'Mor', 'Gral', 'Ur', 'Aga', 'Bula'], suffix: ['ga', 'ra', 'ba', 'na', 'ma', 'za', 'gash', 'ub', 'at', 'ka', 'da'] }
    },
    Myconid: {
        // Shared asexual prefixes and suffixes
        Male: { prefix: ['Basid', 'Aman', 'Phol', 'Cord', 'Bol', 'Myc', 'Agar', 'Mor', 'Cop'], suffix: ['i', 'ita', 'oli', 'yce', 'letus', 'ena', 'icus', 'ella', 'rin'] },
        Female: { prefix: ['Basid', 'Aman', 'Phol', 'Cord', 'Bol', 'Myc', 'Agar', 'Mor', 'Cop'], suffix: ['i', 'ita', 'oli', 'yce', 'letus', 'ena', 'icus', 'ella', 'rin'] }
    }
};

const SURNAMES = {
    Civilized: {
        prefix: ['Iron', 'Stone', 'Gloom', 'Deep', 'Shadow', 'Cave', 'Rust', 'Mud', 'Ash', 'Slate', 'Copper', 'Brass'],
        suffix: ['breaker', 'walker', 'forge', 'weaver', 'born', 'shield', 'fist', 'river', 'skipper', 'heart', 'smith']
    },
    Sylvan: {
        prefix: ['Night', 'Moon', 'Star', 'Cave', 'Glow', 'Void', 'Dusk', 'Abyss', 'Silver', 'Silk', 'Lichen', 'Spore'],
        suffix: ['shade', 'whisper', 'weaver', 'bloom', 'fall', 'song', 'breeze', 'leaf', 'tide', 'glimmer', 'glow']
    },
    Brutal: {
        titles: [
            'the Brutal', 'Skull-Crusher', 'the Scarred', 'the Pale', 'Blood-Drinker', 'Bone-Snapper', 'the Fierce', 'Trench-Walker',
            'the Mad', 'Spine-Breaker', 'the Red', 'Meat-Cleaver', 'the Vile', 'Hook-Jaw', 'the Blind', 'Rock-Smasher'
        ]
    },
    // NEW MYCONID CIRCLE FORMULAS (COMBINATORIAL)
    // 20 Adjectives * 20 Nouns = 400 possible unique, highly atmospheric circle surnames!
    Circle: {
        adjectives: ['Deep', 'Rot', 'Pale', 'Sunken', 'Grog', 'Still', 'Damp', 'Whispering', 'Abyssal', 'Glimmer', 'Moldy', 'Sinking', 'Spore', 'Fungal', 'Lichen', 'Mycelial', 'Gloom', 'Cavern', 'Sunless', 'Weeping'],
        nouns: ['Spore', 'Ring', 'Cap', 'Moss', 'Veil', 'Water', 'Grotto', 'Clump', 'Circle', 'Mycelium', 'Gills', 'Blight', 'Rot', 'Thicket', 'Shoal', 'Growth', 'Garden', 'Fringe', 'Pouch', 'Stalk']
    }
};

const ARCHETYPES =[
    'Lurecrafter', 'Fishmonger', 'Tavern Keeper', 'Deep Guide', 
    'Cave Scholar', 'Boatwright', 'Mercenary', 'Scavenger', 
    'Harbormaster', 'Fungus Farmer', 'Crystal Miner'
];

const AGE_RANGES = {
    Human: { min: 18, max: 75 },
    Dwarf: { min: 40, max: 250 },
    Elf:   { min: 100, max: 700 },
    Orc:   { min: 16, max: 60 },
    Tiefling: { min: 18, max: 120 },
    Myconid: { min: 5, max: 50 } 
};

// --- DATA GENERATION FUNCTIONS ---

export function generateName(race, gender, rng) {
    // --- FIX: TIEFLING NAME PROXYING ---
    // Tieflings draw organically from both Elven and Human cultures
    if (race === 'Tiefling') {
        const proxyRace = rng.chance(0.5) ? 'Human' : 'Elf';
        return generateName(proxyRace, gender, rng);
    }

    const rNames = NAMES[race][gender];
    const firstName = rng.pick(rNames.prefix) + rng.pick(rNames.suffix);
    
    let lastName = '';
    
    if (race === 'Orc') {
        lastName = rng.pick(SURNAMES.Brutal.titles);
        return `${firstName} ${lastName}`;
    } 
    else if (race === 'Elf') {
        lastName = rng.pick(SURNAMES.Sylvan.prefix) + rng.pick(SURNAMES.Sylvan.suffix);
    } 
    // --- FIX: COMBINATORIAL MYCONID SURNAMES ---
    else if (race === 'Myconid') {
        const adj = rng.pick(SURNAMES.Circle.adjectives);
        const noun = rng.pick(SURNAMES.Circle.nouns);
        return `${firstName} of the ${adj} ${noun}`;
    }
    else {
        lastName = rng.pick(SURNAMES.Civilized.prefix) + rng.pick(SURNAMES.Civilized.suffix);
    }

    return `${firstName} ${lastName}`;
}

export function generateNPCData(options = {}) {
    const seed = options.seed || Date.now();
    const rng = createRng(seed);

    // 1. Determine Identity (Included new races)
    const race = options.race && options.race !== 'Any' ? options.race : rng.pick(['Human', 'Dwarf', 'Elf', 'Orc', 'Tiefling', 'Myconid']);
    
    // Myconids are technically genderless, but we roll it for internal structural reasons
    const gender = options.gender && options.gender !== 'Any' ? options.gender : rng.pick(['Male', 'Female']);
    
    const generatorKey = `${race}_${gender}`;

    // 2. Generate Flavor Text
    const name = generateName(race, gender, rng);
    const age = rng.int(AGE_RANGES[race].min, AGE_RANGES[race].max);
    
    let archetype = rng.pick(ARCHETYPES);
    // Overrides to make Myconids fit better in the world
    if (race === 'Myconid') archetype = rng.pick(['Spore Tender', 'Rot Farmer', 'Cave Scholar', 'Deep Guide']);

    // 3. Select Palettes
    const profile = RACE_PROFILES[race];
    const skin = SKIN_TONES[rng.pick(profile.skins)];
    const hair = HAIR_COLORS[rng.pick(profile.hairs)];
    const eye = EYE_COLORS[rng.pick(profile.eyes)];
    const cloth = CLOTHING_COLORS[rng.pick(Object.keys(CLOTHING_COLORS))];

    // 4. Generate Art
    let artResult = null;
    const generator = ART_GENERATORS[generatorKey];
    
    if (generator) {
        artResult = generator({ rng, skin, hair, eye, cloth, gender }); // Passed gender down for Myconid shape variance
    }

    // 5. Return Master NPC Object
    return {
        id: `npc_${rng.int(10000, 99999)}`,
        seed: seed,
        name: name,
        race: race,
        gender: race === 'Myconid' ? 'Spore-Spawn' : gender, // Aesthetic override for Myconid
        age: age,
        archetype: archetype,
        artData: artResult ? artResult.data : null,
        imageDataUrl: artResult ? artResult.imageDataUrl : null,
        palettes: {
            skin: skin.name,
            hair: hair.name,
            eye: eye.name,
            cloth: cloth.name
        }
    };
}