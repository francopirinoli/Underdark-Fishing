/**
 * js/util/utils.js
 * Shared utility functions for math and canvas drawing.
 */

import { defaultRng } from './rng.js';

export function getRandomInt(lo, hi, rng = defaultRng) {
    return rng.int(lo, hi);
}

export function getRandomInRange(lo, hi, rng = defaultRng) {
    return rng.float(lo, hi);
}

export function getRandomElement(arr, rng = defaultRng) {
    if (!arr || arr.length === 0) return undefined;
    return arr[Math.floor(rng.next() * arr.length)];
}

export function drawScaledRect(ctx, x, y, w, h, color, scale) {
    if (!color) return;
    ctx.fillStyle = color;
    ctx.fillRect(Math.floor(x * scale), Math.floor(y * scale), Math.floor(w * scale), Math.floor(h * scale));
}

export function clamp(v, a, b) {
    return v < a ? a : v > b ? b : v;
}