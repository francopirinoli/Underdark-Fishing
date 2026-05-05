/**
 * js/art/equipment_palettes.js
 * Color dictionary for inanimate objects (Chests, Boats, Rods, Lures).
 */

export const MATERIALS = {
    // Woods
    PINE:       { name: 'Pine Wood',      base: '#D97706', shadow: '#92400E', highlight: '#FBBF24' },
    OAK:        { name: 'Oak Wood',       base: '#78350F', shadow: '#451A03', highlight: '#92400E' },
    DARK_WOOD:  { name: 'Dark Wood',      base: '#451A03', shadow: '#270E01', highlight: '#78350F' },
    DRIFTWOOD:  { name: 'Driftwood',      base: '#94A3B8', shadow: '#475569', highlight: '#CBD5E1' },
    
    // Metals
    IRON:       { name: 'Iron',           base: '#475569', shadow: '#1E293B', highlight: '#94A3B8' },
    STEEL:      { name: 'Steel',          base: '#94A3B8', shadow: '#475569', highlight: '#E2E8F0' },
    GOLD:       { name: 'Gold',           base: '#D97706', shadow: '#92400E', highlight: '#FBBF24' },
    SILVER:     { name: 'Silver',         base: '#CBD5E1', shadow: '#64748B', highlight: '#F8FAFC' },
    RUST:       { name: 'Rusted Iron',    base: '#7C2D12', shadow: '#450A0A', highlight: '#9A3412' },
    
    // Organics / Mimics
    BONE:       { name: 'Bone',           base: '#E7E5E4', shadow: '#A8A29E', highlight: '#FAFAF9' },
    FLESH:      { name: 'Flesh',          base: '#9F1239', shadow: '#4C0519', highlight: '#E11D48' },
    TONGUE:     { name: 'Tongue',         base: '#BE123C', shadow: '#7F1D1D', highlight: '#F43F5E' },
    
    // Gems
    GEM_RED:    { name: 'Ruby',           base: '#DC2626', shadow: '#7F1D1D', highlight: '#FCA5A5' },
    GEM_GREEN:  { name: 'Emerald',        base: '#16A34A', shadow: '#064E3B', highlight: '#86EFAC' },
    GEM_BLUE:   { name: 'Sapphire',       base: '#2563EB', shadow: '#172554', highlight: '#93C5FD' },
    GEM_PURPLE: { name: 'Amethyst',       base: '#7C3AED', shadow: '#4C1D95', highlight: '#C4B5FD' },
    GEM_YELLOW: { name: 'Topaz',          base: '#EAB308', shadow: '#A16207', highlight: '#FEF08A' } // <-- FIX HERE
};

export const BOAT_PALETTES = {
    SKIFF:   { name: 'Canvas Skiff',  hull: '#78350F', hullShadow: '#451A03', hullHigh: '#A16207', trim: '#0369A1', sail: '#FEF3C7', accent: '#F59E0B', window: '#FEF08A' },
    TRAWLER: { name: 'Iron Trawler',  hull: '#334155', hullShadow: '#0F172A', hullHigh: '#64748B', trim: '#B91C1C', sail: '#334155', accent: '#EAB308', window: '#67E8F9' },
    RUNNER:  { name: 'Shadow Runner', hull: '#1E1B4B', hullShadow: '#020617', hullHigh: '#4338CA', trim: '#C084FC', sail: '#312E81', accent: '#F0ABFC', window: '#A855F7' },
    DREAD:   { name: 'Dreadnought',   hull: '#0F172A', hullShadow: '#000000', hullHigh: '#1E293B', trim: '#DC2626', sail: '#1F2937', accent: '#F97316', window: '#EF4444' }
};