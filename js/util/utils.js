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

export function buildStatSlider(label, value, leftText, rightText, deltaText = "") {
    // Convert -100 to 100 into a CSS percentage (0% to 100%)
    const percent = Math.max(0, Math.min(100, (value + 100) / 2));
    return `
        <div class="pref-container">
            <div class="pref-labels">
                <span style="flex:1; text-align:left;">${leftText}</span>
                <b style="flex:1; text-align:center;">${label} (${value})${deltaText}</b>
                <span style="flex:1; text-align:right;">${rightText}</span>
            </div>
            <div class="pref-track">
                <div class="pref-center"></div>
                <div class="pref-marker" style="left: ${percent}%;"></div>
            </div>
        </div>
    `;
}