/**
 * js/exploration/biomes.js
 * Defines the 5 distinct Underdark biomes, including their specific
 * color palettes for local map rendering and gameplay hazards.
 */

export const BIOMES = {
    fungal: {
        id: 'fungal', name: 'Rot Garden', description: 'Murky waters choked with toxic glowing algae and fleshy fungal shores.',
        globalColor: '#365314', textColor: '#86EFAC', 
        palette: { water: '#162e1a', deepWater: '#0b1a0d', land: '#5c4a3d', rock: '#3d3126', flora: '#86EFAC', waterGleam: '#10B981' },
        hazardChance: 0.05, stealthPenalty: 0.2, reelMultiplier: 1.0
    },
    crystal: {
        id: 'crystal', name: 'Shimmering Grottos', description: 'Jagged crystal shoals beneath clear, sapphire waters.',
        globalColor: '#1E40AF', textColor: '#93C5FD', 
        palette: { water: '#0c2b5e', deepWater: '#051433', land: '#1e293b', rock: '#0f172a', flora: '#22D3EE', waterGleam: '#0EA5E9' },
        hazardChance: 0.02, stealthPenalty: 0.0, reelMultiplier: 1.0
    },
    abyssal: {
        id: 'abyssal', name: 'Abyssal Trench', description: 'Lightless, fathomless depths. A hunting ground for ancient horrors.',
        globalColor: '#030712', textColor: '#C084FC', 
        palette: { water: '#050510', deepWater: '#000000', land: '#14132b', rock: '#0b0a1a', flora: '#a855f7', waterGleam: '#312E81' },
        hazardChance: 0.12, stealthPenalty: 0.0, reelMultiplier: 0.9
    },
    volcanic: {
        id: 'volcanic', name: 'Sulphur Springs', description: 'Boiling crimson waters and ash-choked shores. Beware magma fish.',
        globalColor: '#7F1D1D', textColor: '#FCA5A5', 
        palette: { water: '#5e1313', deepWater: '#330707', land: '#2b2727', rock: '#171515', flora: '#f59e0b', waterGleam: '#DC2626' },
        hazardChance: 0.20, stealthPenalty: 0.0, reelMultiplier: 1.05
    },
    frozen: {
        id: 'frozen', name: 'Frozen Fjord', description: 'A pocket of unnatural cold. Ice floes can rip through fragile hulls.',
        globalColor: '#0F172A', textColor: '#E0E7FF', 
        palette: { water: '#1e3a5f', deepWater: '#0d1e36', land: '#94a3b8', rock: '#64748b', flora: '#e0e7ff', waterGleam: '#38BDF8' },
        hazardChance: 0.15, stealthPenalty: 0.0, reelMultiplier: 0.70
    }
};

export const BIOME_IDS = Object.keys(BIOMES);