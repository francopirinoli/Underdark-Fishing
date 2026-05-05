/**
 * js/exploration/noise.js
 * Seeded 2D Value Noise and Fractal Brownian Motion (FBM).
 * Used for both global biome distribution and local cave-lake carving.
 */

import { mulberry32 } from '../util/rng.js';

export function createNoise2D(seed) {
    const rand = mulberry32(seed);
    const TABLE_SIZE = 256;
    
    // Generate a seeded permutation table
    const grad = Array(TABLE_SIZE).fill(0).map(() => rand());
    const perm = Array(TABLE_SIZE).fill(0).map((_, i) => i);
    
    // Shuffle permutation table
    for (let i = TABLE_SIZE - 1; i > 0; i--) {
        const j = Math.floor(rand() * (i + 1));
        [perm[i], perm[j]] = [perm[j], perm[i]];
    }
    
    // Duplicated table to avoid overflow wrapping checks
    const p = new Array(512);
    for (let i = 0; i < 512; i++) {
        p[i] = perm[i % 256];
    }

    // Smoothstep function to ease interpolation
    const fade = t => t * t * t * (t * (t * 6 - 15) + 10);

    function val(ix, iy) {
        return grad[p[(ix + p[iy & 255]) & 255]];
    }

    /**
     * Returns a noise value roughly between 0.0 and 1.0
     */
    function noise(x, y) {
        const ix = Math.floor(x) & 255;
        const iy = Math.floor(y) & 255;
        
        const tx = x - Math.floor(x);
        const ty = y - Math.floor(y);
        
        const u = fade(tx);
        const v = fade(ty);
        
        const a = val(ix, iy);
        const b = val(ix + 1, iy);
        const c = val(ix, iy + 1);
        const d = val(ix + 1, iy + 1);
        
        const i1 = a + u * (b - a);
        const i2 = c + u * (d - c);
        
        return i1 + v * (i2 - i1);
    }

    /**
     * Fractal Brownian Motion
     * Layers multiple octaves of noise for organic, natural shapes.
     * @param octaves - How many layers of detail (e.g., 4-6 for terrain)
     * @param persistence - How much amplitude decreases per octave (usually 0.5)
     * @param lacunarity - How much frequency increases per octave (usually 2.0)
     */
    function fbm(x, y, octaves = 4, persistence = 0.5, lacunarity = 2.0) {
        let total = 0;
        let amplitude = 1.0;
        let frequency = 1.0;
        let maxValue = 0; // Used to normalize the result to 0.0 - 1.0

        for (let i = 0; i < octaves; i++) {
            total += noise(x * frequency, y * frequency) * amplitude;
            maxValue += amplitude;
            amplitude *= persistence;
            frequency *= lacunarity;
        }

        return total / maxValue;
    }

    return { noise, fbm };
}