/**
 * js/art/palettes.js
 * Defines 22 color palettes for Underdark fauna.
 */
import { getRandomElement } from '../util/utils.js';

export const FISH_PALETTES = {
    // --- ORIGINAL PALETTES ---
    PALE_CAVE: { name: 'Pale Cave', base: '#D1D5DB', shadow: '#9CA3AF', highlight: '#F3F4F6', glow: '#FCD34D', outline: '#1F2937' },
    ABYSSAL_DARK: { name: 'Abyssal Dark', base: '#374151', shadow: '#111827', highlight: '#4B5563', glow: '#EF4444', outline: '#030712' },
    TOXIC_FUNGAL: { name: 'Toxic Fungal', base: '#4ADE80', shadow: '#166534', highlight: '#86EFAC', glow: '#A855F7', outline: '#022C22' },
    DEEP_CRYSTAL: { name: 'Deep Crystal', base: '#3B82F6', shadow: '#1E40AF', highlight: '#93C5FD', glow: '#22D3EE', outline: '#172554' },
    BLOOD_FIN: { name: 'Blood Fin', base: '#991B1B', shadow: '#450A0A', highlight: '#EF4444', glow: '#FCA5A5', outline: '#2A0606' },
    GHOST_GLASS: { name: 'Ghost Glass', base: '#E0E7FF', shadow: '#A5B4FC', highlight: '#FFFFFF', glow: '#818CF8', outline: '#312E81' },
    MAGMA_VENT: { name: 'Magma Vent', base: '#B45309', shadow: '#78350F', highlight: '#F59E0B', glow: '#FEF08A', outline: '#451A03' },

    // --- EXPANDED UNDERDARK PALETTES ---
    VOID_STARLIGHT: { name: 'Void Starlight', base: '#1E1B4B', shadow: '#0F172A', highlight: '#312E81', glow: '#FDF2F8', outline: '#020617' },
    SULPHUR_SPRING: { name: 'Sulphur Spring', base: '#CA8A04', shadow: '#713F12', highlight: '#FDE047', glow: '#BEF264', outline: '#422006' },
    LICHEN_MOSS: { name: 'Lichen Moss', base: '#65A30D', shadow: '#365314', highlight: '#A3E635', glow: '#FEF08A', outline: '#1A2E05' },
    AMETHYST_GEODE: { name: 'Amethyst Geode', base: '#9333EA', shadow: '#581C87', highlight: '#C084FC', glow: '#F0ABFC', outline: '#2E1065' },
    SUNLESS_GOLD: { name: 'Sunless Gold', base: '#B45309', shadow: '#78350F', highlight: '#FBBF24', glow: '#FFF7ED', outline: '#451A03' },
    RUST_HUSK: { name: 'Rust Husk', base: '#9A3412', shadow: '#431407', highlight: '#FB923C', glow: '#FDBA74', outline: '#2D0601' },
    OBSIDIAN_FLOW: { name: 'Obsidian Flow', base: '#1F2937', shadow: '#030712', highlight: '#4B5563', glow: '#60A5FA', outline: '#000000' },
    VERIDIAN_SLIME: { name: 'Veridian Slime', base: '#0D9488', shadow: '#134E4A', highlight: '#2DD4BF', glow: '#CCFBF1', outline: '#042F2E' },
    PEARLY_SHELL: { name: 'Pearly Shell', base: '#F5F3FF', shadow: '#C4B5FD', highlight: '#FFFFFF', glow: '#DDD6FE', outline: '#4C1D95' },
    WARPED_MAGIC: { name: 'Warped Magic', base: '#DB2777', shadow: '#701A75', highlight: '#F472B6', glow: '#818CF8', outline: '#4A044E' },
    BONE_DRY: { name: 'Bone Dry', base: '#E7E5E4', shadow: '#A8A29E', highlight: '#FAFAF9', glow: '#57534E', outline: '#1C1917' },
    COBALT_SHALE: { name: 'Cobalt Shale', base: '#2563EB', shadow: '#1E3A8A', highlight: '#60A5FA', glow: '#DBEAFE', outline: '#172554' },
    MUD_MUCK: { name: 'Mud Muck', base: '#78350F', shadow: '#451A03', highlight: '#A16207', glow: '#D9F99D', outline: '#271714' },
    NEON_MYCONID: { name: 'Neon Myconid', base: '#C026D3', shadow: '#701A75', highlight: '#E879F9', glow: '#22C55E', outline: '#2D0630' },
    STYGIAN_BLUE: { name: 'Stygian Blue', base: '#1E40AF', shadow: '#1E1B4B', highlight: '#3B82F6', glow: '#67E8F9', outline: '#020617' }
};

export function getRandomPalette(rng) {
    const keys = Object.keys(FISH_PALETTES);
    return FISH_PALETTES[keys[Math.floor(rng.next() * keys.length)]];
}