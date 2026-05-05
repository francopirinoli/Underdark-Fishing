/**
 * js/data/npc_data_generator.js
 * Master factory for generating NPCs.
 * Combines procedural pixel art with flavor data (Names, Ages, Archetypes).
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

const ART_GENERATORS = {
    'Human_Male': generateHumanMale,
    'Human_Female': generateHumanFemale,
    'Dwarf_Male': generateDwarfMale,
    'Dwarf_Female': generateDwarfFemale,
    'Elf_Male': generateElfMale,
    'Elf_Female': generateElfFemale,
    'Orc_Male': generateOrcMale,
    'Orc_Female': generateOrcFemale
};

// --- FLAVOR TABLES ---

const NAMES = {
    Human: {
        Male: {
            prefix:['Ald', 'Gar', 'Tor', 'Bran', 'Kael', 'Sil', 'Cor', 'Fen', 'Mar', 'Val'],
            suffix:['ric', 'in', 'on', 'is', 'as', 'ok', 'en', 'ar', 'us', 'ian']
        },
        Female: {
            prefix:['El', 'Ar', 'Mir', 'Lir', 'Sel', 'Val', 'Kae', 'Ly', 'Syr', 'Is'],
            suffix:['ena', 'is', 'a', 'ia', 'ina', 'wen', 'lys', 'ra', 'elle', 'ana']
        }
    },
    Dwarf: {
        Male: {
            prefix:['Thor', 'Bram', 'Durg', 'Grim', 'Garr', 'Thra', 'Kran', 'Bro', 'Hroth', 'Or'],
            suffix:['in', 'or', 'ur', 'ak', 'ar', 'ek', 'im', 'ir', 'ok', 'ik']
        },
        Female: {
            prefix:['Hel', 'Dis', 'Brin', 'Kov', 'Thal', 'Dag', 'Gim', 'Nyr', 'Run', 'Sig'],
            suffix:['ga', 'a', 'ia', 'ra', 'da', 'na', 'dis', 'run', 'gret', 'va']
        }
    },
    Elf: {
        Male: {
            prefix:['Fae', 'Syl', 'Aer', 'Luc', 'Mith', 'Ith', 'Cae', 'Lor', 'Zan', 'Tae'],
            suffix:['lar', 'in', 'on', 'ian', 'rel', 'el', 'ir', 'is', 'orn', 'thil']
        },
        Female: {
            prefix:['Ael', 'Thal', 'Ily', 'Loe', 'Xil', 'Mae', 'Syr', 'Nym', 'Vae', 'Lyr'],
            suffix:['iana', 'ia', 'en', 'ra', 'ys', 'a', 'elle', 'wen', 'wyn', 'ria']
        }
    },
    Orc: {
        Male: {
            prefix:['Grom', 'Urz', 'Thrak', 'Kha', 'Mog', 'Ghash', 'Bru', 'Drog', 'Gru', 'Skum'],
            suffix:['ak', 'ul', 'ka', 'arg', 'or', 'uk', 'at', 'mash', 'nak', 'gash']
        },
        Female: {
            prefix:['Maz', 'Ruz', 'Ghar', 'Shag', 'Zog', 'Baga', 'Nar', 'Mor', 'Gral', 'Ur'],
            suffix:['ga', 'ra', 'ba', 'na', 'ma', 'za', 'gash', 'ub', 'at', 'ka']
        }
    }
};

const SURNAMES = {
    Civilized: { // Human, Dwarf
        prefix:['Iron', 'Stone', 'Gloom', 'Deep', 'Shadow', 'Cave', 'Rust', 'Mud', 'Ash', 'Slate'],
        suffix:['breaker', 'walker', 'forge', 'weaver', 'born', 'shield', 'fist', 'river', 'skipper', 'heart']
    },
    Sylvan: { // Elf
        prefix:['Night', 'Moon', 'Star', 'Cave', 'Glow', 'Void', 'Dusk', 'Abyss', 'Silver', 'Silk'],
        suffix:['shade', 'whisper', 'weaver', 'bloom', 'fall', 'song', 'breeze', 'leaf', 'tide', 'glimmer']
    },
    Brutal: { // Orc (Usually Titles instead of surnames)
        titles:['the Brutal', 'Skull-Crusher', 'the Scarred', 'the Pale', 'Blood-Drinker', 'Bone-Snapper', 'the Fierce', 'Trench-Walker', 'the Broken']
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
    Orc:   { min: 16, max: 60 }
};

// --- DATA GENERATION FUNCTIONS ---

export function generateName(race, gender, rng) {
    const rNames = NAMES[race][gender];
    const firstName = rng.pick(rNames.prefix) + rng.pick(rNames.suffix);
    
    let lastName = '';
    if (race === 'Orc') {
        lastName = rng.pick(SURNAMES.Brutal.titles);
        return `${firstName} ${lastName}`; // Gromak the Brutal
    } else if (race === 'Elf') {
        const sNames = SURNAMES.Sylvan;
        lastName = rng.pick(sNames.prefix) + rng.pick(sNames.suffix);
    } else {
        const cNames = SURNAMES.Civilized;
        lastName = rng.pick(cNames.prefix) + rng.pick(cNames.suffix);
    }

    return `${firstName} ${lastName}`;
}

export function generateNPCData(options = {}) {
    const seed = options.seed || Date.now();
    const rng = createRng(seed);

    // 1. Determine Identity
    const race = options.race && options.race !== 'Any' ? options.race : rng.pick(['Human', 'Dwarf', 'Elf', 'Orc']);
    const gender = options.gender && options.gender !== 'Any' ? options.gender : rng.pick(['Male', 'Female']);
    const generatorKey = `${race}_${gender}`;

    // 2. Generate Flavor Text
    const name = generateName(race, gender, rng);
    const age = rng.int(AGE_RANGES[race].min, AGE_RANGES[race].max);
    const archetype = rng.pick(ARCHETYPES);

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
        artResult = generator({ rng, skin, hair, eye, cloth });
    }

    // 5. Return Master NPC Object
    return {
        id: `npc_${rng.int(10000, 99999)}`,
        seed: seed,
        name: name,
        race: race,
        gender: gender,
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