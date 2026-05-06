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

export function showStatTooltip(title, desc, e) {
    const tt = document.getElementById('stat-tooltip');
    if (!tt) return;
    document.getElementById('tt-stat-name').innerText = title;
    document.getElementById('tt-stat-desc').innerText = desc;
    tt.style.display = 'block';
    moveStatTooltip(e);
}

export function moveStatTooltip(e) {
    const tt = document.getElementById('stat-tooltip');
    if (!tt || tt.style.display === 'none') return;
    
    const container = document.getElementById('game-container');
    const rect = container.getBoundingClientRect();
    const scaleX = 1280 / rect.width;
    const scaleY = 720 / rect.height;
    
    let x = (e.clientX - rect.left) * scaleX + 15;
    let y = (e.clientY - rect.top) * scaleY + 15;
    
    tt.style.left = `${x}px`;
    tt.style.top = `${y}px`;
}

export function hideStatTooltip() {
    const tt = document.getElementById('stat-tooltip');
    if (tt) tt.style.display = 'none';
}