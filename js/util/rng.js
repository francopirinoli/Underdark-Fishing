/**
 * js/util/rng.js
 * Seeded PRNG (mulberry32) + helpers.
 */

export function mulberry32(seed) {
    let a = (seed | 0) >>> 0 || 0x9e3779b9;
    return function () {
        a |= 0;
        a = (a + 0x6d2b79f5) | 0;
        let t = a;
        t = Math.imul(t ^ (t >>> 15), t | 1);
        t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export function createRng(seed) {
    const base = seed === undefined || seed === null ? null : mulberry32(seed);
    const next = base || Math.random;
    
    return {
        next: () => next(),
        int: (lo, hi) => Math.floor(next() * (hi - lo + 1)) + lo,
        float: (lo, hi) => next() * (hi - lo) + lo,
        pick: (arr) => arr[Math.floor(next() * arr.length)],
        chance: (p) => next() < p,
        weighted: (entries) => {
            let total = 0;
            for (const [w] of entries) total += w;
            let r = next() * total;
            for (const[w, v] of entries) {
                r -= w;
                if (r < 0) return v;
            }
            return entries[entries.length - 1][1];
        },
        gaussian: (mean = 0, stddev = 1) => {
            const u = 1 - next();
            const v = 1 - next();
            const z = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
            return z * stddev + mean;
        },
        seed: seed ?? null
    };
}

// A global unseeded RNG for generic UI things
export const defaultRng = createRng(null);