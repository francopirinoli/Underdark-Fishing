/**
 * js/ui/pause_ui.js
 * Manages the Pause Screen and Audio Sliders.
 */

import { AudioEngine } from '../audio/audio_engine.js';
import { SFX } from '../audio/sfx_generator.js';

export const PauseUI = {
    callbacks: null,

    init(callbacks) {
        this.callbacks = callbacks;

        const sliderMusic = document.getElementById('slider-vol-music');
        const lblMusic = document.getElementById('lbl-vol-music');
        const sliderSfx = document.getElementById('slider-vol-sfx');
        const lblSfx = document.getElementById('lbl-vol-sfx');

        // Load saved volume settings or default to 50%
        const savedMusicVol = localStorage.getItem('uf_vol_music') || 50;
        const savedSfxVol = localStorage.getItem('uf_vol_sfx') || 50;

        sliderMusic.value = savedMusicVol;
        lblMusic.innerText = `${savedMusicVol}%`;
        
        sliderSfx.value = savedSfxVol;
        lblSfx.innerText = `${savedSfxVol}%`;

        // Live Volume Updates
        sliderMusic.addEventListener('input', (e) => {
            const val = e.target.value;
            lblMusic.innerText = `${val}%`;
            AudioEngine.setMusicVolume(val / 100);
            localStorage.setItem('uf_vol_music', val);
        });

        sliderSfx.addEventListener('input', (e) => {
            const val = e.target.value;
            lblSfx.innerText = `${val}%`;
            AudioEngine.setSfxVolume(val / 100);
            localStorage.setItem('uf_vol_sfx', val);
        });

        // Feedback sound when adjusting SFX slider
        sliderSfx.addEventListener('change', () => SFX.playUISelect());

        // Buttons
        document.getElementById('btn-resume-game').onclick = () => {
            SFX.playUISelect();
            if (this.callbacks.onResume) this.callbacks.onResume();
        };

        document.getElementById('btn-quit-to-menu').onclick = () => {
            SFX.playError();
            if (this.callbacks.onQuit) this.callbacks.onQuit();
        };
    },

    open() {
        document.getElementById('z150-pause').style.display = 'flex';
    },

    close() {
        document.getElementById('z150-pause').style.display = 'none';
    }
};