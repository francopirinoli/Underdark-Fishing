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
            prefix: ['Ald', 'Gar', 'Tor', 'Bran', 'Kael', 'Sil', 'Cor', 'Fen', 'Mar', 'Val', 'Row', 'Der', 'Jal', 'Cas', 'Thom', 'Ed', 'Bal', 'Ric', 'Gal', 'Perr', 'Hal', 'Ul', 'Rey', 'Kev', 'Dav', 'Jon', 'Mat', 'Rob', 'Sam', 'Wil'],
            suffix: ['ric', 'in', 'on', 'is', 'as', 'ok', 'en', 'ar', 'us', 'ian', 'ard', 'ock', 'eth', 'am', 'or', 'ul', 'ys', 'id', 'ik', 'os', 'an', 'el', 'ald', 'er', 'ley', 'son', 'man', 'well', 'ton', 'ford']
        },
        Female: {
            prefix: ['El', 'Ar', 'Mir', 'Lir', 'Sel', 'Val', 'Kae', 'Ly', 'Syr', 'Is', 'Mar', 'Jes', 'Cat', 'Ros', 'Lin', 'Ael', 'Sar', 'Ann', 'Bet', 'Car', 'Dor', 'Ele', 'Fay', 'Gwe', 'Hel', 'Ily', 'Jan', 'Kla', 'Lys', 'Mel'],
            suffix: ['ena', 'is', 'a', 'ia', 'ina', 'wen', 'lys', 'ra', 'elle', 'ana', 'eth', 'lyn', 'bel', 'wyn', 'yss', 'ah', 'ine', 'ice', 'ith', 'ari', 'ora', 'y', 'ie', 'elle', 'anne', 'ette', 'ia', 'isa', 'ita', 'sea']
        }
    },
    Dwarf: {
        Male: {
            prefix: ['Thor', 'Bram', 'Durg', 'Grim', 'Garr', 'Thra', 'Kran', 'Bro', 'Hroth', 'Or', 'Bal', 'Dain', 'Farg', 'Gim', 'Kild', 'Mor', 'Nof', 'Orik', 'Rur', 'Tord', 'Ulf', 'Vond', 'Yar', 'Zan', 'Bof', 'Dor', 'Glov', 'Har', 'Kor', 'Mag'],
            suffix: ['in', 'or', 'ur', 'ak', 'ar', 'ek', 'im', 'ir', 'ok', 'ik', 'uk', 'am', 'us', 'as', 'i', 'o', 'un', 'ond', 'and', 'end', 'ath', 'eth', 'ith', 'oth', 'uth', 'dar', 'dor', 'dur', 'gar', 'gor']
        },
        Female: {
            prefix: ['Hel', 'Dis', 'Brin', 'Kov', 'Thal', 'Dag', 'Gim', 'Nyr', 'Run', 'Sig', 'Aud', 'Bav', 'Dov', 'Eld', 'Fren', 'Gerd', 'Hild', 'Irg', 'Karg', 'Lif', 'Marn', 'Nald', 'Olv', 'Tir', 'Urd', 'Vig', 'Ylf', 'Zil', 'Brog', 'Gund'],
            suffix: ['ga', 'a', 'ia', 'ra', 'da', 'na', 'dis', 'run', 'gret', 'va', 'hild', 'gild', 'frid', 'rid', 'lin', 'rin', 'gin', 'din', 'tha', 'dha', 'la', 'ma', 'sa', 'za', 'sha', 'cha', 'nya', 'mya', 'rya', 'lya']
        }
    },
    Elf: {
        Male: {
            prefix: ['Fae', 'Syl', 'Aer', 'Luc', 'Mith', 'Ith', 'Cae', 'Lor', 'Zan', 'Tae', 'Ael', 'Bae', 'Cor', 'Dae', 'Eil', 'Fela', 'Gae', 'Hae', 'Ili', 'Jae', 'Kae', 'Lia', 'Nae', 'Olo', 'Pae', 'Qin', 'Ria', 'Sia', 'Ume', 'Vae'],
            suffix: ['lar', 'in', 'on', 'ian', 'rel', 'el', 'ir', 'is', 'orn', 'thil', 'dil', 'fin', 'lin', 'mion', 'nion', 'rion', 'sion', 'tion', 'vion', 'wion', 'xion', 'yion', 'zion', 'las', 'mas', 'nas', 'pas', 'ras', 'tas', 'vas']
        },
        Female: {
            prefix: ['Ael', 'Thal', 'Ily', 'Loe', 'Xil', 'Mae', 'Syr', 'Nym', 'Vae', 'Lyr', 'Aria', 'Cae', 'Dae', 'Ea', 'Fae', 'Gae', 'Hae', 'Iaa', 'Jae', 'Kae', 'Lae', 'Nae', 'Oae', 'Pae', 'Qae', 'Rae', 'Sae', 'Tae', 'Uae', 'Zae'],
            suffix: ['iana', 'ia', 'en', 'ra', 'ys', 'a', 'elle', 'wen', 'wyn', 'ria', 'sia', 'tia', 'via', 'wia', 'xia', 'yia', 'zia', 'lea', 'mea', 'nea', 'pea', 'rea', 'sea', 'tea', 'vea', 'wea', 'xea', 'yea', 'zea', 'bella']
        }
    },
    Orc: {
        Male: {
            prefix: ['Grom', 'Urz', 'Thrak', 'Kha', 'Mog', 'Ghash', 'Bru', 'Drog', 'Gru', 'Skum', 'Az', 'Bok', 'Crug', 'Dakk', 'Gar', 'Hok', 'Ig', 'Jok', 'Krug', 'Lug', 'Mak', 'Nok', 'Ogg', 'Pug', 'Qok', 'Ruk', 'Snag', 'Tug', 'Ug', 'Vok'],
            suffix: ['ak', 'ul', 'ka', 'arg', 'or', 'uk', 'at', 'mash', 'nak', 'gash', 'og', 'ug', 'ig', 'ag', 'eg', 'ash', 'ish', 'osh', 'ush', 'esh', 'bak', 'dak', 'gak', 'hak', 'jak', 'lak', 'mak', 'rak', 'sak', 'tak']
        },
        Female: {
            prefix: ['Maz', 'Ruz', 'Ghar', 'Shag', 'Zog', 'Baga', 'Nar', 'Mor', 'Gral', 'Ur', 'Aga', 'Bula', 'Carg', 'Dura', 'Gash', 'Hura', 'Iga', 'Jura', 'Karg', 'Luga', 'Mura', 'Narga', 'Oga', 'Pura', 'Qura', 'Raga', 'Sura', 'Taga', 'Uga', 'Vura'],
            suffix: ['ga', 'ra', 'ba', 'na', 'ma', 'za', 'gash', 'ub', 'at', 'ka', 'da', 'fa', 'ha', 'ja', 'la', 'pa', 'qa', 'sa', 'ta', 'va', 'wa', 'xa', 'ya', 'bu', 'du', 'gu', 'hu', 'ku', 'mu', 'nu']
        }
    }
};

const SURNAMES = {
    Civilized: { // Human, Dwarf
        prefix: ['Iron', 'Stone', 'Gloom', 'Deep', 'Shadow', 'Cave', 'Rust', 'Mud', 'Ash', 'Slate', 'Copper', 'Brass', 'Gold', 'Silver', 'Dark', 'Light', 'Stout', 'Hard', 'Swift', 'Black', 'White', 'Red', 'Blue', 'Water', 'Lake', 'River', 'Rock', 'Coal', 'Salt', 'Brine', 'Hook', 'Line', 'Bait', 'Net'],
        suffix: ['breaker', 'walker', 'forge', 'weaver', 'born', 'shield', 'fist', 'river', 'skipper', 'heart', 'smith', 'worker', 'hand', 'foot', 'beard', 'helm', 'brow', 'fall', 'stream', 'fisher', 'hook', 'line', 'caster', 'tide', 'water', 'lake', 'boat', 'ship', 'sail', 'mast']
    },
    Sylvan: { // Elf
        prefix: ['Night', 'Moon', 'Star', 'Cave', 'Glow', 'Void', 'Dusk', 'Abyss', 'Silver', 'Silk', 'Lichen', 'Spore', 'Fern', 'Moss', 'Pearl', 'Shell', 'Coral', 'Deep', 'Fae', 'Dream', 'Glimmer', 'Shimmer', 'Whisper', 'Silent', 'Still', 'Dark', 'Blind', 'Echo', 'Tide', 'Wave'],
        suffix: ['shade', 'whisper', 'weaver', 'bloom', 'fall', 'song', 'breeze', 'leaf', 'tide', 'glimmer', 'glow', 'spark', 'dust', 'pool', 'ripple', 'drift', 'wing', 'eye', 'beam', 'tear', 'water', 'lake', 'stream', 'river', 'sea', 'ocean', 'depth', 'abyss', 'void', 'shadow']
    },
    Brutal: { // Orc (Usually Titles instead of surnames)
        titles: [
            'the Brutal', 'Skull-Crusher', 'the Scarred', 'the Pale', 'Blood-Drinker', 'Bone-Snapper', 'the Fierce', 'Trench-Walker', 'the Broken',
            'the Mad', 'Spine-Breaker', 'the Red', 'Meat-Cleaver', 'the Vile', 'Hook-Jaw', 'the Blind', 'Rock-Smasher', 'the Bloated', 'Deep-Lurker', 'the Cruel',
            'Net-Tearer', 'the Unyielding', 'Gore-Splattered', 'the Putrid', 'Iron-Hide', 'the Mangled', 'Shark-Bait', 'the Drowned', 'Cave-Stalker', 'the Grim'
        ]
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