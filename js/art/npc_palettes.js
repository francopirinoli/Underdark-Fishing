/**
 * js/art/npc_palettes.js
 * Comprehensive color dictionary for NPC Portrait generation.
 */

export const SKIN_TONES = {
    // Human / General
    PORCELAIN:    { name: 'Porcelain',      base: '#FFE4E1', shadow: '#D4A373', highlight: '#FFFFFF' },
    FAIR:         { name: 'Fair',           base: '#FFDFC4', shadow: '#C8936A', highlight: '#FFF0E0' },
    TANNED:       { name: 'Tanned',         base: '#E0AC69', shadow: '#8B5A2B', highlight: '#F4D0A4' },
    OLIVE:        { name: 'Olive',          base: '#C68642', shadow: '#7A4B24', highlight: '#DCA26A' },
    WARM_BROWN:   { name: 'Warm Brown',     base: '#8D5524', shadow: '#4A2E15', highlight: '#B87A47' },
    DEEP_ONYX:    { name: 'Deep Onyx',      base: '#3D2314', shadow: '#1E100A', highlight: '#5E3A24' },
    
    // Dwarf Specific
    RUDDY:        { name: 'Ruddy',          base: '#D99A7A', shadow: '#965241', highlight: '#F2C0A2' },
    COPPER:       { name: 'Copper',         base: '#B85D19', shadow: '#662F09', highlight: '#D98443' },
    ASH_GREY:     { name: 'Ash Grey',       base: '#8F9396', shadow: '#4F5357', highlight: '#BCC1C4' },

    // Elf Specific
    MOON_PALE:    { name: 'Moon Pale',      base: '#E2E8F0', shadow: '#94A3B8', highlight: '#F8FAFC' },
    TWILIGHT:     { name: 'Twilight Blue',  base: '#7C8CBE', shadow: '#46537A', highlight: '#A8B5DB' },
    AMETHYST:     { name: 'Amethyst Pale',  base: '#9D8CB3', shadow: '#594C6B', highlight: '#C5B7D6' },

    // Orc Specific
    MOSS_GREEN:   { name: 'Moss Green',     base: '#6B7F4F', shadow: '#3D4B2A', highlight: '#A8BF7F' },
    SWAMP_GREEN:  { name: 'Swamp Green',    base: '#4A5D23', shadow: '#243011', highlight: '#738C40' },
    BILE_YELLOW:  { name: 'Bile Yellow',    base: '#94914B', shadow: '#575424', highlight: '#C4C276' },
    BLOOD_MUD:    { name: 'Blood Mud',      base: '#6E3A3A', shadow: '#361515', highlight: '#995959' },

    // Tiefling Specific (New)
    INFERNAL_RED: { name: 'Infernal Red',   base: '#991B1B', shadow: '#450A0A', highlight: '#EF4444' },
    BRIMSTONE:    { name: 'Brimstone',      base: '#B45309', shadow: '#78350F', highlight: '#F59E0B' },
    INDIGO:       { name: 'Deep Indigo',    base: '#312E81', shadow: '#1E1B4B', highlight: '#4F46E5' },

    // Myconid Specific (New)
    PALE_SPORE:   { name: 'Pale Spore',     base: '#E5E7EB', shadow: '#9CA3AF', highlight: '#F9FAFB' },
    TOXIC_CAP:    { name: 'Toxic Flesh',    base: '#84CC16', shadow: '#3F6212', highlight: '#BEF264' }
};

export const HAIR_COLORS = {
    // Natural
    RAVEN:        { name: 'Raven Black',    base: '#171717', shadow: '#0A0A0A', highlight: '#3F3F46' },
    MUD_BROWN:    { name: 'Mud Brown',      base: '#451A03', shadow: '#270E01', highlight: '#78350F' },
    CHESTNUT:     { name: 'Chestnut',       base: '#7A3B12', shadow: '#4A2006', highlight: '#B55A20' },
    AUBURN:       { name: 'Auburn',         base: '#8B2500', shadow: '#4F1100', highlight: '#C44111' },
    DIRTY_BLONDE: { name: 'Dirty Blonde',   base: '#D97706', shadow: '#92400E', highlight: '#FBBF24' },
    ASH_BLONDE:   { name: 'Ash Blonde',     base: '#C4B59D', shadow: '#8E826F', highlight: '#E8DCC8' },
    SILVER:       { name: 'Silver Grey',    base: '#71717A', shadow: '#3F3F46', highlight: '#D4D4D8' },
    SNOW_WHITE:   { name: 'Snow White',     base: '#F4F4F5', shadow: '#A1A1AA', highlight: '#FFFFFF' },

    // Exotic / Myconid Caps
    SPORE_VIOLET: { name: 'Spore Violet',   base: '#6B21A8', shadow: '#4C1D95', highlight: '#A78BFA' },
    ALGAE_GREEN:  { name: 'Algae Green',    base: '#14532D', shadow: '#064E3B', highlight: '#65A30D' },
    MAGMA_RED:    { name: 'Magma Red',      base: '#991B1B', shadow: '#7F1D1D', highlight: '#EF4444' },
    CYAN_GLOW:    { name: 'Cyan Glow',      base: '#0891B2', shadow: '#164E63', highlight: '#22D3EE' }
};

export const EYE_COLORS = {
    BROWN:        { name: 'Dark Brown',     color: '#451A03' },
    BLUE:         { name: 'Ice Blue',       color: '#60A5FA' },
    GREEN:        { name: 'Murky Green',    color: '#166534' },
    GREY:         { name: 'Clouded Grey',   color: '#94A3B8' },
    HAZEL:        { name: 'Hazel',          color: '#B45309' },
    RED:          { name: 'Ember Red',      color: '#DC2626' },
    GOLD:         { name: 'Piercing Gold',  color: '#FBBF24' },
    VIOLET:       { name: 'Deep Violet',    color: '#7C3AED' },
    BLIND:        { name: 'Blind / White',  color: '#F8FAFC' },
    // Tiefling / Myconid Extras
    HELLFIRE:     { name: 'Hellfire (Solid)', color: '#EF4444' },
    SOLID_GOLD:   { name: 'Gold (Solid)',     color: '#FBBF24' },
    VOID:         { name: 'Void Black',       color: '#000000' },
    CYAN_GLOW:    { name: 'Cyan (Glowing)',   color: '#22D3EE' }
};

export const CLOTHING_COLORS = {
    CANVAS:       { name: 'Rough Canvas',   base: '#A8A29E', shadow: '#57534E', highlight: '#D6D3D1' },
    BURLAP:       { name: 'Burlap Sack',    base: '#854D0E', shadow: '#422006', highlight: '#A16207' },
    MUD_RAGS:     { name: 'Mud Rags',       base: '#451A03', shadow: '#270e01', highlight: '#78350F' },
    LEATHER:      { name: 'Boiled Leather', base: '#78350F', shadow: '#451A03', highlight: '#92400E' },
    IRON_STUD:    { name: 'Iron Studded',   base: '#475569', shadow: '#1E293B', highlight: '#94A3B8' },
    MOSS_CLOAK:   { name: 'Moss Cloak',     base: '#14532D', shadow: '#064E3B', highlight: '#166534' },
    MERCHANT:     { name: 'Merchant Plum',  base: '#5B21B6', shadow: '#3B1285', highlight: '#7C3AED' },
    ROYAL_CRIMSON:{ name: 'Deep Crimson',   base: '#7F1D1D', shadow: '#450A0A', highlight: '#991B1B' },
    SILK_BLACK:   { name: 'Shadow Silk',    base: '#111827', shadow: '#030712', highlight: '#1F2937' },
    ABYSSAL_BLUE: { name: 'Abyssal Blue',   base: '#1E3A8A', shadow: '#172554', highlight: '#2563EB' }
};

export const RACE_PROFILES = {
    Human: { skins:['PORCELAIN', 'FAIR', 'TANNED', 'OLIVE', 'WARM_BROWN', 'DEEP_ONYX'], hairs:['RAVEN', 'MUD_BROWN', 'CHESTNUT', 'AUBURN', 'DIRTY_BLONDE', 'ASH_BLONDE', 'SILVER', 'SNOW_WHITE'], eyes:['BROWN', 'BLUE', 'GREEN', 'GREY', 'HAZEL', 'BLIND'] },
    Dwarf: { skins:['FAIR', 'TANNED', 'RUDDY', 'COPPER', 'WARM_BROWN', 'ASH_GREY'], hairs:['RAVEN', 'MUD_BROWN', 'CHESTNUT', 'AUBURN', 'SILVER', 'SNOW_WHITE', 'MAGMA_RED'], eyes:['BROWN', 'GREEN', 'BLUE', 'HAZEL', 'GREY', 'BLIND'] },
    Elf:   { skins:['PORCELAIN', 'FAIR', 'MOON_PALE', 'TWILIGHT', 'AMETHYST'], hairs:['RAVEN', 'ASH_BLONDE', 'SILVER', 'SNOW_WHITE', 'SPORE_VIOLET', 'ALGAE_GREEN'], eyes:['BLUE', 'GREEN', 'GREY', 'GOLD', 'VIOLET', 'BLIND'] },
    Orc:   { skins:['MOSS_GREEN', 'SWAMP_GREEN', 'BILE_YELLOW', 'BLOOD_MUD', 'DEEP_ONYX', 'ASH_GREY'], hairs:['RAVEN', 'MUD_BROWN', 'SILVER', 'MAGMA_RED'], eyes:['BROWN', 'RED', 'GOLD', 'GREY', 'BLIND'] },
    
    // New Races
    Tiefling: { skins:['INFERNAL_RED', 'BRIMSTONE', 'INDIGO', 'ASH_GREY', 'DEEP_ONYX'], hairs:['RAVEN', 'ASH_BLONDE', 'SILVER', 'SNOW_WHITE', 'MAGMA_RED'], eyes:['HELLFIRE', 'SOLID_GOLD', 'VOID', 'BROWN'] },
    Myconid:  { skins:['PALE_SPORE', 'TOXIC_CAP', 'SWAMP_GREEN', 'MOSS_GREEN'], hairs:['SPORE_VIOLET', 'ALGAE_GREEN', 'MAGMA_RED', 'CYAN_GLOW', 'SNOW_WHITE'], eyes:['CYAN_GLOW', 'BLIND', 'VOID', 'SOLID_GOLD'] }
};