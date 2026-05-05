/**
 * js/exploration/biomes.js
 * Defines the 5 distinct Underdark biomes, including their specific
 * color palettes for local map rendering and gameplay hazards.
 */

export const BIOMES = {
    fungal: {
        id: 'fungal',
        name: 'Rot Garden',
        description: 'Murky waters choked with toxic glowing algae and fleshy fungal shores.',
        globalColor: '#365314', // Color shown on the zoomed-out world map
        
        // Colors for rendering the local 2D boat-driving map
        palette: {
            water: '#162e1a',       // Murky green
            deepWater: '#0b1a0d',
            land: '#5c4a3d',        // Fleshy brown/grey
            rock: '#3d3126',
            flora: '#86EFAC'        // Toxic bright green algae/moss
        },
        
        // Gameplay modifiers
        hazardChance: 0.05,
        stealthPenalty: 0.2,        // Noisy boats scare fish easily here
        reelMultiplier: 1.0
    },

    crystal: {
        id: 'crystal',
        name: 'Shimmering Grottos',
        description: 'Jagged crystal shoals beneath clear, sapphire waters.',
        globalColor: '#1E40AF',
        
        palette: {
            water: '#0c2b5e',       // Clear dark blue
            deepWater: '#051433',
            land: '#1e293b',        // Dark slate
            rock: '#0f172a',
            flora: '#22D3EE'        // Glowing cyan crystals
        },
        
        hazardChance: 0.02,
        stealthPenalty: 0.0,
        reelMultiplier: 1.0
    },

    abyssal: {
        id: 'abyssal',
        name: 'Abyssal Trench',
        description: 'Lightless, fathomless depths. A hunting ground for ancient horrors.',
        globalColor: '#030712',
        
        palette: {
            water: '#050510',       // Almost pitch black
            deepWater: '#000000',
            land: '#14132b',        // Dark, eerie purple/black stone
            rock: '#0b0a1a',
            flora: '#a855f7'        // Faint, eerie violet bioluminescence
        },
        
        hazardChance: 0.12,         // Dangerous to navigate
        stealthPenalty: 0.0,
        reelMultiplier: 0.9         // Harder to reel fish in deep pressure
    },

    volcanic: {
        id: 'volcanic',
        name: 'Sulphur Springs',
        description: 'Boiling crimson waters and ash-choked shores. Beware magma fish.',
        globalColor: '#7F1D1D',
        
        palette: {
            water: '#5e1313',       // Blood red / crimson
            deepWater: '#330707',
            land: '#2b2727',        // Charcoal / ash
            rock: '#171515',
            flora: '#f59e0b'        // Bright orange/yellow thermal vents
        },
        
        hazardChance: 0.20,         // Very high chance of boat damage
        stealthPenalty: 0.0,
        reelMultiplier: 1.05
    },

    frozen: {
        id: 'frozen',
        name: 'Frozen Fjord',
        description: 'A pocket of unnatural cold. Ice floes can rip through fragile hulls.',
        globalColor: '#0F172A',
        
        palette: {
            water: '#1e3a5f',       // Frosty blue
            deepWater: '#0d1e36',
            land: '#94a3b8',        // Pale ice/snow
            rock: '#64748b',        // Darker ice
            flora: '#e0e7ff'        // Pale, glowing frost-kelp
        },
        
        hazardChance: 0.15,
        stealthPenalty: 0.0,
        reelMultiplier: 0.70        // Ice severely jams up the fishing reel
    }
};

export const BIOME_IDS = Object.keys(BIOMES);