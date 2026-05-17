/**
 * js/art/potion_generator.js
 * Procedural Potion Generator.
 * Adapted for Underdark Fishing's seeded RNG and color palettes.
 */

import { drawScaledRect } from '../util/utils.js';
import { MATERIALS } from './equipment_palettes.js';
import { createRng } from '../util/rng.js';

const LOGICAL_GRID_WIDTH = 64;
const LOGICAL_GRID_HEIGHT = 64;
const DISPLAY_SCALE = 4;
const CANVAS_WIDTH = LOGICAL_GRID_WIDTH * DISPLAY_SCALE;   
const CANVAS_HEIGHT = LOGICAL_GRID_HEIGHT * DISPLAY_SCALE; 
const CANVAS_PADDING = 4;

// --- Internal helper functions for drawing potion components ---

function drawFlaskShape(ctx, flaskDetails, flaskCenterX, flaskBottomY) {
    const {
        shape, bodyWidth, bodyHeight, neckWidth, neckHeight, palette, baseStyle
    } = flaskDetails;

    const flaskOutlineThickness = 1;
    const flaskKeyPoints = {
        topOfBodyY: flaskBottomY - bodyHeight,
        neckTopY: flaskBottomY - bodyHeight - neckHeight,
        innerWidthAtLevel: [],
        bodyBaseY: flaskBottomY,
        neckBaseY: flaskBottomY - bodyHeight,
        bodyWidthAtBase: bodyWidth,
        neckWidthAtTop: neckWidth,
        flaskCenterX: flaskCenterX,
        flaskBottomY: flaskBottomY,
        bodyHeight: bodyHeight
    };

    // --- Draw Body ---
    for (let yRel = 0; yRel < bodyHeight; yRel++) {
        const currentY = flaskBottomY - 1 - yRel;
        let currentSegmentWidth = bodyWidth;
        let segmentCenterX = flaskCenterX;

        if (shape === 'round_flask') {
            const progressY = (yRel - bodyHeight / 2) / (bodyHeight / 2);
            currentSegmentWidth = Math.max(neckWidth, Math.floor(bodyWidth * Math.sqrt(Math.max(0, 1 - progressY * progressY * 0.95))));
        } else if (shape === 'conical_flask') {
            const progressY = yRel / (bodyHeight -1 || 1);
            currentSegmentWidth = Math.max(neckWidth, Math.floor(neckWidth + (bodyWidth - neckWidth) * (1 - progressY)));
        } else if (shape === 'bulbous_pot') {
            const progressY = yRel / (bodyHeight -1 || 1);
            if (yRel < bodyHeight * 0.4) {
                 currentSegmentWidth = bodyWidth;
            } else {
                const taperProgress = (yRel - bodyHeight * 0.4) / (bodyHeight * 0.6 || 1);
                currentSegmentWidth = Math.max(neckWidth, Math.floor(neckWidth + (bodyWidth - neckWidth) * (1 - taperProgress*taperProgress)));
            }
        } else if (shape === 'test_tube') {
            currentSegmentWidth = bodyWidth;
        }

        currentSegmentWidth = Math.max(1, currentSegmentWidth);
        const segmentStartX = segmentCenterX - Math.floor(currentSegmentWidth / 2);

        drawScaledRect(ctx, segmentStartX, currentY, currentSegmentWidth, 1, palette.base, DISPLAY_SCALE);
        if (currentSegmentWidth > 1) {
            drawScaledRect(ctx, segmentStartX, currentY, 1, 1, palette.highlight, DISPLAY_SCALE);
            drawScaledRect(ctx, segmentStartX + currentSegmentWidth - 1, currentY, 1, 1, palette.shadow, DISPLAY_SCALE);
        }
        flaskKeyPoints.innerWidthAtLevel.push({
            y: currentY,
            xStart: segmentStartX + flaskOutlineThickness,
            width: Math.max(0, currentSegmentWidth - flaskOutlineThickness * 2)
        });
    }
    flaskKeyPoints.bodyWidthAtBase = flaskKeyPoints.innerWidthAtLevel[0] ? flaskKeyPoints.innerWidthAtLevel[0].width : neckWidth;

    if (neckHeight > 0) {
        const neckBaseY = flaskBottomY - bodyHeight;
        for (let yRel = 0; yRel < neckHeight; yRel++) {
            const currentY = neckBaseY - 1 - yRel;
            const segmentStartX = flaskCenterX - Math.floor(neckWidth / 2);
            drawScaledRect(ctx, segmentStartX, currentY, neckWidth, 1, palette.base, DISPLAY_SCALE);
            if (neckWidth > 1) {
                drawScaledRect(ctx, segmentStartX, currentY, 1, 1, palette.highlight, DISPLAY_SCALE);
                drawScaledRect(ctx, segmentStartX + neckWidth - 1, currentY, 1, 1, palette.shadow, DISPLAY_SCALE);
            }
            flaskKeyPoints.innerWidthAtLevel.push({
                y: currentY,
                xStart: segmentStartX + flaskOutlineThickness,
                width: Math.max(0, neckWidth - flaskOutlineThickness * 2)
            });
        }
    }
    flaskKeyPoints.neckWidthAtTop = Math.max(0, neckWidth - flaskOutlineThickness * 2);

    if (baseStyle === 'rounded' || baseStyle === 'bulb_bottom' || baseStyle === 'test_tube_rounded') {
        const baseCurveHeight = (shape === 'test_tube') ? Math.floor(bodyWidth/2) + 1 : Math.min(5, Math.floor(bodyHeight * 0.2));
        const bottomCenterY = flaskBottomY - 1;
        const widthAtBaseForCurve = (shape === 'test_tube') ? bodyWidth : flaskKeyPoints.bodyWidthAtBase;

        for(let yOffset = 0; yOffset < baseCurveHeight; yOffset++) {
            const y = bottomCenterY + yOffset;
            const progress = yOffset / (baseCurveHeight -1 || 1);
            let currentWidth;
            if (shape === 'test_tube') {
                currentWidth = Math.max(1, Math.floor(widthAtBaseForCurve * Math.cos(progress * Math.PI / 2)));
            } else {
                 currentWidth = Math.max(1, Math.floor(widthAtBaseForCurve * (1 - progress * progress * 0.7)));
            }

            const x = flaskCenterX - Math.floor(currentWidth/2);
            if (currentWidth > 0) {
                drawScaledRect(ctx, x, y, currentWidth, 1, palette.base, DISPLAY_SCALE);
                if(yOffset === baseCurveHeight -1 || currentWidth <=2 ) {
                    drawScaledRect(ctx, x, y, currentWidth, 1, palette.shadow, DISPLAY_SCALE);
                } else if (currentWidth > 1) {
                    drawScaledRect(ctx, x, y, 1, 1, palette.highlight, DISPLAY_SCALE);
                    drawScaledRect(ctx, x + currentWidth - 1, y, 1, 1, palette.shadow, DISPLAY_SCALE);
                }
            }
        }
        if (shape === 'test_tube' || baseStyle === 'rounded' || baseStyle === 'bulb_bottom') {
            flaskKeyPoints.bodyBaseY += baseCurveHeight -1;
            for(let yOffset = 0; yOffset < baseCurveHeight; yOffset++) {
                 const y = bottomCenterY + yOffset;
                 const progress = yOffset / (baseCurveHeight -1 || 1);
                 let currentWidth;
                 if (shape === 'test_tube') {
                    currentWidth = Math.max(1, Math.floor(widthAtBaseForCurve * Math.cos(progress * Math.PI / 2)));
                 } else {
                    currentWidth = Math.max(1, Math.floor(widthAtBaseForCurve * (1 - progress * progress * 0.7)));
                 }
                 const x = flaskCenterX - Math.floor(currentWidth/2);
                 let level = flaskKeyPoints.innerWidthAtLevel.find(l => l.y === y);
                 if(level){
                     level.xStart = x + flaskOutlineThickness;
                     level.width = Math.max(0, currentWidth - flaskOutlineThickness * 2);
                 } else if (currentWidth - flaskOutlineThickness * 2 > 0) {
                     flaskKeyPoints.innerWidthAtLevel.push({
                         y: y,
                         xStart: x + flaskOutlineThickness,
                         width: Math.max(0, currentWidth - flaskOutlineThickness * 2)
                     });
                 }
            }
        }
    }
    return flaskKeyPoints;
}

function drawLiquid(ctx, liquidDetails, flaskKeyPoints, rng) {
    const { liquidPalette, liquidPalette2, mixStyle, fillLevel, hasBubbles } = liquidDetails;

    const minY = flaskKeyPoints.neckTopY;
    const maxY = flaskKeyPoints.bodyBaseY - 1;
    const liquidColumnHeight = Math.max(0, maxY - minY);
    const liquidTopOverallY = maxY - Math.floor(liquidColumnHeight * fillLevel);

    flaskKeyPoints.innerWidthAtLevel.sort((a,b) => a.y - b.y);

    for (const level of flaskKeyPoints.innerWidthAtLevel) {
        if (level.y >= liquidTopOverallY && level.y <= maxY && level.width > 0) {
            let primaryColor = liquidPalette.base;
            let highlightColor = liquidPalette.highlight;
            let shadowColor = liquidPalette.shadow;

            if (liquidPalette2 && mixStyle === 'layered') {
                const layerInterfaceY = maxY - Math.floor(liquidColumnHeight * fillLevel * 0.5);
                if (level.y < layerInterfaceY) { // Top layer
                    primaryColor = liquidPalette2.base;
                    highlightColor = liquidPalette2.highlight;
                    shadowColor = liquidPalette2.shadow;
                } else { // Bottom layer
                    primaryColor = liquidPalette.base;
                    highlightColor = liquidPalette.highlight;
                    shadowColor = liquidPalette.shadow;
                }
            }

            drawScaledRect(ctx, level.xStart, level.y, level.width, 1, primaryColor, DISPLAY_SCALE);

            // Meniscus
            if (level.y === liquidTopOverallY && level.width > 1 && fillLevel < 0.98 && !liquidPalette2) {
                 drawScaledRect(ctx, level.xStart, level.y, level.width, 1, highlightColor, DISPLAY_SCALE);
            } else if (liquidPalette2 && mixStyle === 'layered') {
                 const layerInterfaceY = maxY - Math.floor(liquidColumnHeight * fillLevel * 0.5);
                 if (level.y === liquidTopOverallY && level.y < layerInterfaceY && level.width > 1) {
                     drawScaledRect(ctx, level.xStart, level.y, level.width, 1, liquidPalette2.highlight, DISPLAY_SCALE);
                 } else if (level.y === layerInterfaceY && level.width > 1 && liquidTopOverallY < layerInterfaceY) {
                     drawScaledRect(ctx, level.xStart, level.y, level.width, 1, liquidPalette.highlight, DISPLAY_SCALE);
                 }
            }
            else if (level.width > 2 && level.y < maxY - 1 && level.y > liquidTopOverallY) {
                 drawScaledRect(ctx, level.xStart, level.y, 1, 1, highlightColor, DISPLAY_SCALE);
                 drawScaledRect(ctx, level.xStart + level.width - 1, level.y, 1, 1, shadowColor, DISPLAY_SCALE);
            }

            if (hasBubbles && rng.chance(0.15) && level.width > 2 && level.y < maxY - 2 && level.y > liquidTopOverallY + 2) {
                const bubbleX = level.xStart + 1 + rng.int(0, level.width - 3);
                drawScaledRect(ctx, bubbleX, level.y, 1, 1, highlightColor, DISPLAY_SCALE);
            }
        }
    }
}

function drawStopper(ctx, stopperDetails, neckTopX, neckTopY, neckInnerWidth, neckHeight, rng) {
    const { type, palette, gemPalette } = stopperDetails;
    const stopperHeight = rng.int(5, 9);
    let stopperWidth = Math.max(1, neckInnerWidth + 2);

    if (type === 'cork') {
        stopperWidth = Math.max(1, neckInnerWidth + rng.int(0, 1));
        const corkTopVisible = Math.floor(stopperHeight * 0.6);
        const corkInNeck = stopperHeight - corkTopVisible;
        const corkTopY = neckTopY - corkTopVisible;

        for(let yRel=0; yRel < stopperHeight; yRel++){
            const y = corkTopY + yRel;
            const currentWidth = (yRel < corkTopVisible) ? stopperWidth : neckInnerWidth;
            const x = neckTopX - Math.floor(currentWidth/2);
            if (currentWidth > 0) {
                drawScaledRect(ctx, x, y, currentWidth, 1, palette.base, DISPLAY_SCALE);
                if (yRel === 0) drawScaledRect(ctx, x, y, currentWidth, 1, palette.highlight, DISPLAY_SCALE);
                else if (yRel > 1 && yRel < stopperHeight - 1 && yRel % 2 === 0) drawScaledRect(ctx, x, y, currentWidth, 1, palette.shadow, DISPLAY_SCALE);
            }
        }

    } else if (type === 'glass_stopper' || type === 'gem_stopper') {
        const handleHeight = Math.floor(stopperHeight * (type === 'gem_stopper' ? 0.4 : 0.65));
        const plugHeight = stopperHeight - handleHeight;
        const handleWidth = Math.max(2, neckInnerWidth + rng.int(3, 6));
        const plugWidth = Math.max(1, neckInnerWidth);

        if (plugWidth > 0 && plugHeight > 0) {
            drawScaledRect(ctx, neckTopX - Math.floor(plugWidth/2), neckTopY, plugWidth, plugHeight, palette.base, DISPLAY_SCALE);
        }
        if (handleWidth > 0 && handleHeight > 0) {
            const handleTopY = neckTopY - handleHeight;
            if (type === 'gem_stopper' && gemPalette) {
                const gemBaseHeight = Math.floor(handleHeight * 0.5);
                const gemActualHeight = handleHeight - gemBaseHeight;
                drawScaledRect(ctx, neckTopX - Math.floor(handleWidth/2), handleTopY, handleWidth, gemBaseHeight, palette.base, DISPLAY_SCALE);

                const gemSize = Math.min(handleWidth - 2, gemActualHeight - 1);
                if (gemSize > 0) {
                    const gemRadius = Math.floor(gemSize/2);
                    for(let dy = -gemRadius; dy <= gemRadius; dy++) {
                        for(let dx = -gemRadius; dx <= gemRadius; dx++) {
                            if(dx*dx + dy*dy <= gemRadius*gemRadius) {
                                drawScaledRect(ctx, neckTopX + dx, handleTopY + gemBaseHeight + dy, 1, 1, gemPalette.base, DISPLAY_SCALE);
                            }
                        }
                    }
                     drawScaledRect(ctx, neckTopX, handleTopY + gemBaseHeight - gemRadius + 1, 1, 1, gemPalette.highlight, DISPLAY_SCALE);
                }
            } else {
                drawScaledRect(ctx, neckTopX - Math.floor(handleWidth/2), handleTopY, handleWidth, handleHeight, palette.base, DISPLAY_SCALE);
                drawScaledRect(ctx, neckTopX - Math.floor(handleWidth/2), handleTopY, handleWidth, 1, palette.highlight, DISPLAY_SCALE);
                if (handleHeight > 1) drawScaledRect(ctx, neckTopX - Math.floor(handleWidth/2), handleTopY + handleHeight - 1, handleWidth, 1, palette.shadow, DISPLAY_SCALE);
            }
        }

    } else if (type === 'wax_seal') {
        const sealRadiusX = Math.floor(neckInnerWidth / 2) + rng.int(2, 5);
        const sealRadiusY = Math.floor(neckInnerWidth / 2) + rng.int(1, 4);
        const sealCenterY = neckTopY - Math.floor(sealRadiusY * 0.2);
        const sealMaxThickness = Math.max(2, Math.floor(sealRadiusY * 0.5));

        if (sealRadiusX > 0 && sealRadiusY > 0) {
             for (let yRel = -Math.floor(sealMaxThickness/2); yRel <= Math.floor(sealMaxThickness/2); yRel++) {
                const layerProgress = Math.abs(yRel) / (sealMaxThickness/2 || 1);
                const currentLayerRadiusX = sealRadiusX * (1 - layerProgress * 0.3);
                const currentLayerRadiusY = sealRadiusY * (1 - layerProgress * 0.3);

                for (let xRelDraw = -Math.floor(currentLayerRadiusX); xRelDraw <= Math.floor(currentLayerRadiusX); xRelDraw++) {
                    const yExtentAtX = Math.floor(currentLayerRadiusY * Math.sqrt(Math.max(0, 1 - (xRelDraw*xRelDraw) / (currentLayerRadiusX*currentLayerRadiusX || 1) )));
                    for(let yRelDraw = -yExtentAtX; yRelDraw <= yExtentAtX; yRelDraw++){
                         if (rng.chance(0.85)) { // inverted random check to match original logic `Math.random() > 0.15`
                            let color = palette.base;
                            if(yRel < -sealMaxThickness * 0.1) color = palette.highlight;
                            else if (yRel > sealMaxThickness * 0.1) color = palette.shadow;
                            drawScaledRect(ctx, neckTopX + xRelDraw, sealCenterY + yRelDraw + yRel, 1, 1, color, DISPLAY_SCALE);
                         }
                    }
                }
            }
            if (rng.chance(0.65)) {
                const stampR = Math.max(1, Math.floor(Math.min(sealRadiusX, sealRadiusY) * 0.4));
                drawScaledRect(ctx, neckTopX - Math.floor(stampR/2), sealCenterY - Math.floor(stampR/2), stampR, stampR, palette.shadow, DISPLAY_SCALE);
            }
        }
    } else if (type === 'metal_cap') {
        const capHeight = Math.max(2, Math.floor(neckHeight * 0.6) + 1);
        const capTopY = neckTopY - capHeight;
        const capWidth = Math.max(2, neckInnerWidth + 2);
        if (capWidth > 0 && capHeight > 0) {
            drawScaledRect(ctx, neckTopX - Math.floor(capWidth/2), capTopY, capWidth, capHeight, palette.base, DISPLAY_SCALE);
            drawScaledRect(ctx, neckTopX - Math.floor(capWidth/2), capTopY, capWidth, 1, palette.highlight, DISPLAY_SCALE);
            if (capHeight > 1) {
                drawScaledRect(ctx, neckTopX - Math.floor(capWidth/2), capTopY + capHeight - 1, capWidth, 1, palette.shadow, DISPLAY_SCALE);
                drawScaledRect(ctx, neckTopX - Math.floor(capWidth/2), capTopY + 1, 1, capHeight - 2, palette.highlight, DISPLAY_SCALE);
                drawScaledRect(ctx, neckTopX + Math.floor(capWidth/2) - 1, capTopY + 1, 1, capHeight - 2, palette.shadow, DISPLAY_SCALE);
            }
        }
    } else if (type === 'cloth_tied_top') {
        const clothActualHeight = Math.max(3, neckHeight + 2);
        const clothTopY = neckTopY - Math.floor(clothActualHeight * 0.6);
        const clothWidth = Math.max(2, neckInnerWidth + 4);
        if (clothWidth > 0) {
            for(let y=0; y < Math.floor(clothActualHeight * 0.6); y++){
                const w = Math.max(1, Math.floor(clothWidth * (1 - Math.pow(y/(clothActualHeight*0.6-1||1), 1.5)) * rng.float(0.8, 1.1) ));
                drawScaledRect(ctx, neckTopX - Math.floor(w/2), clothTopY + y, w, 1, palette.base, DISPLAY_SCALE);
                if (y < 2) drawScaledRect(ctx, neckTopX - Math.floor(w/2), clothTopY + y, w, 1, palette.highlight, DISPLAY_SCALE);
            }
        }
        const tiePalette = MATERIALS[rng.pick(['OAK', 'SILVER', 'GOLD'])]; // Using oak as fallback leather
        const tieY = neckTopY - rng.int(0, 1);
        if (neckInnerWidth > 0) {
             drawScaledRect(ctx, neckTopX - Math.floor(neckInnerWidth/2) - 1, tieY, neckInnerWidth + 2, 2, tiePalette.base, DISPLAY_SCALE);
             drawScaledRect(ctx, neckTopX - Math.floor(neckInnerWidth/2) - 1, tieY, 1, 2, tiePalette.highlight, DISPLAY_SCALE);
        }
    }
}

function drawPotionLabel(ctx, labelDetails, flaskKeyPoints, rng) {
    const { palette, textSimColor } = labelDetails;
    const bodyLevels = flaskKeyPoints.innerWidthAtLevel.filter(lvl => lvl.y >= flaskKeyPoints.topOfBodyY && lvl.y < flaskKeyPoints.neckBaseY);
    if (bodyLevels.length < 5) return;

    let bestLevelIndex = -1;
    let maxPossibleLabelWidth = 0;

    for(let i = Math.floor(bodyLevels.length * 0.25); i < Math.floor(bodyLevels.length * 0.75); i++) {
        if (bodyLevels[i] && bodyLevels[i].width > maxPossibleLabelWidth) {
            maxPossibleLabelWidth = bodyLevels[i].width;
            bestLevelIndex = i;
        }
    }

    if (bestLevelIndex === -1 || maxPossibleLabelWidth < 5) return;

    const labelHeight = Math.max(4, Math.min(12, Math.floor(flaskKeyPoints.bodyHeight * rng.float(0.2, 0.35))));
    const labelY = bodyLevels[bestLevelIndex].y - Math.floor(labelHeight/2) + Math.floor(rng.float(-0.5, 0.5) * flaskKeyPoints.bodyHeight * 0.1);

    const finalLabelY = Math.max(flaskKeyPoints.topOfBodyY + 1, Math.min(labelY, flaskKeyPoints.neckBaseY - labelHeight - 1));
    if (finalLabelY + labelHeight >= flaskKeyPoints.neckBaseY - 1) return;

    const labelWidth = Math.floor(maxPossibleLabelWidth * rng.float(0.6, 0.9));
    const labelX = flaskKeyPoints.flaskCenterX - Math.floor(labelWidth/2);

    if (labelWidth < 3 || labelHeight < 3) return;

    drawScaledRect(ctx, labelX, finalLabelY, labelWidth, labelHeight, palette.base, DISPLAY_SCALE);
    drawScaledRect(ctx, labelX, finalLabelY, labelWidth, 1, palette.shadow, DISPLAY_SCALE);
    drawScaledRect(ctx, labelX, finalLabelY + labelHeight - 1, labelWidth, 1, palette.shadow, DISPLAY_SCALE);
    drawScaledRect(ctx, labelX, finalLabelY + 1, 1, labelHeight - 2, palette.shadow, DISPLAY_SCALE);
    drawScaledRect(ctx, labelX + labelWidth - 1, finalLabelY + 1, 1, labelHeight - 2, palette.shadow, DISPLAY_SCALE);

    if (textSimColor && labelWidth > 4 && labelHeight > 3) {
        for (let ly = finalLabelY + 1; ly < finalLabelY + labelHeight - 1; ly += 2) {
            const lineXOff = rng.int(0, 1);
            drawScaledRect(ctx, labelX + 1 + lineXOff, ly, labelWidth - 2 - lineXOff, 1, textSimColor, DISPLAY_SCALE);
        }
    }
}

/**
 * Generates a procedural potion using the seeded RNG and unified Materials palette.
 */
export function generatePotion(options = {}) {
    const seed = options.seed || Date.now();
    const rng = options.rng || createRng(seed);

    const offscreenCanvas = document.createElement('canvas');
    offscreenCanvas.width = CANVAS_WIDTH;
    offscreenCanvas.height = CANVAS_HEIGHT;
    const ctx = offscreenCanvas.getContext('2d');
    ctx.imageSmoothingEnabled = false;

    const flaskShapes = ['round_flask', 'flat_bottom_cylinder', 'conical_flask', 'bulbous_pot', 'tall_slender', 'test_tube'];
    const flaskShape = rng.pick(flaskShapes);

    // Glass palette
    const glassPalette = {
        base: 'rgba(173, 216, 230, 0.35)',
        highlight: 'rgba(224, 255, 255, 0.55)',
        shadow: 'rgba(135, 206, 250, 0.35)'
    };

    let bodyWidth, bodyHeight, neckWidth, neckHeight, baseStyle;

    if (flaskShape === 'tall_slender') {
        bodyWidth = rng.int(10, 16);
        bodyHeight = rng.int(LOGICAL_GRID_HEIGHT * 0.55, LOGICAL_GRID_HEIGHT * 0.75);
        neckWidth = Math.max(3, Math.floor(bodyWidth * rng.float(0.5, 0.8)));
        neckHeight = rng.int(Math.floor(bodyHeight * 0.12), Math.floor(bodyHeight * 0.22));
        baseStyle = 'flat';
    } else if (flaskShape === 'round_flask') {
        bodyWidth = rng.int(18, 30);
        bodyHeight = bodyWidth * rng.float(0.85, 1.15);
        neckWidth = Math.max(4, Math.floor(bodyWidth * rng.float(0.25, 0.4)));
        neckHeight = rng.int(Math.floor(bodyHeight * 0.18), Math.floor(bodyHeight * 0.3));
        baseStyle = 'rounded';
    } else if (flaskShape === 'conical_flask') {
        bodyWidth = rng.int(20, 32);
        bodyHeight = rng.int(LOGICAL_GRID_HEIGHT * 0.45, LOGICAL_GRID_HEIGHT * 0.65);
        neckWidth = Math.max(4, Math.floor(bodyWidth * rng.float(0.2, 0.3)));
        neckHeight = rng.int(Math.floor(bodyHeight * 0.22), Math.floor(bodyHeight * 0.32));
        baseStyle = 'flat';
    } else if (flaskShape === 'test_tube') {
        bodyWidth = rng.int(8, 14);
        bodyHeight = rng.int(LOGICAL_GRID_HEIGHT * 0.6, LOGICAL_GRID_HEIGHT * 0.8);
        neckWidth = bodyWidth;
        neckHeight = rng.int(2, 4);
        baseStyle = 'test_tube_rounded';
    } else { // flat_bottom_cylinder, bulbous_pot
        bodyWidth = rng.int(16, 26);
        bodyHeight = rng.int(LOGICAL_GRID_HEIGHT * 0.35, LOGICAL_GRID_HEIGHT * 0.6);
        neckWidth = Math.max(4, Math.floor(bodyWidth * rng.float(0.3, 0.55)));
        neckHeight = rng.int(Math.floor(bodyHeight * 0.25), Math.floor(bodyHeight * 0.45));
        baseStyle = (flaskShape === 'bulbous_pot') ? 'bulb_bottom' : 'flat';
    }

    const effectType = options.effectType || 'vigor';
    let chosenLiquid = { name: 'Vigor', palette: MATERIALS.GEM_RED };
    let potionName = "Draught of Vigor";

    if (effectType === 'focus') {
        chosenLiquid = { name: 'Focus', palette: MATERIALS.GEM_BLUE };
        potionName = "Clarity Extract";
    } else if (effectType === 'shadow') {
        chosenLiquid = { name: 'Shadow', palette: { base: '#1E293B', highlight: '#475569', shadow: '#0F172A' } };
        potionName = "Liquid Shadow";
    } else if (effectType === 'silver_tongue') {
        chosenLiquid = { name: 'Silver-Tongue', palette: MATERIALS.GEM_YELLOW };
        potionName = "Gilded Syrup";
    } else if (effectType === 'insight') {
        chosenLiquid = { name: 'Insight', palette: MATERIALS.GEM_GREEN };
        potionName = "Mind-Haze Potion";
    } else if (effectType === 'artisan') {
        chosenLiquid = { name: 'Artisan', palette: { base: '#F1F5F9', highlight: '#FFFFFF', shadow: '#94A3B8' } };
        potionName = "Artisan's Brew";
    }

    // 25% chance for layered secondary liquids to add visual flair
    let chosenLiquid2 = null;
    let liquidMixStyle = 'single';
    let actualLiquidPalette2 = null;

    if (rng.chance(0.25)) {
        const secondaryColors = [MATERIALS.GEM_PURPLE, { base: '#F1F5F9', highlight: '#FFFFFF', shadow: '#94A3B8' }, MATERIALS.GEM_RED];
        chosenLiquid2 = { name: 'Catalyst', palette: rng.pick(secondaryColors) };
        actualLiquidPalette2 = chosenLiquid2.palette;
        liquidMixStyle = 'layered';
    }

    const liquidFillLevel = rng.float(0.4, 0.9);
    const hasBubbles = rng.chance(0.3);

    const stopperTypes = ['cork', 'glass_stopper', 'wax_seal', 'metal_cap', 'gem_stopper', 'cloth_tied_top'];
    const stopperType = (flaskShape === 'test_tube' && rng.chance(0.2)) ? 'cork' : rng.pick(stopperTypes);
    let stopperPalette = null;
    let stopperGemPalette = null;

    if (stopperType === 'cork') stopperPalette = MATERIALS.PINE;
    else if (stopperType === 'glass_stopper') stopperPalette = glassPalette;
    else if (stopperType === 'wax_seal') stopperPalette = MATERIALS[rng.pick(['GEM_RED', 'GEM_BLUE', 'GEM_PURPLE'])];
    else if (stopperType === 'metal_cap') stopperPalette = MATERIALS[rng.pick(['IRON', 'STEEL', 'SILVER', 'GOLD'])];
    else if (stopperType === 'gem_stopper') {
        stopperPalette = MATERIALS[rng.pick(['GOLD', 'SILVER', 'STEEL'])];
        stopperGemPalette = MATERIALS[rng.pick(['GEM_RED', 'GEM_BLUE', 'GEM_PURPLE', 'GEM_YELLOW'])];
    } else if (stopperType === 'cloth_tied_top') {
        // Fallback for fabric using light colored palettes
        stopperPalette = { base: '#E2E8F0', shadow: '#94A3B8', highlight: '#F8FAFC' }; 
    }

    const hasLabel = rng.chance(0.45) && flaskShape !== 'round_flask' && flaskShape !== 'test_tube' && flaskShape !== 'bulbous_pot';
    let labelPalette = null;
    let labelTextSimColor = null;
    
    if (hasLabel) {
        labelPalette = { base: '#FDE047', shadow: '#CA8A04', highlight: '#FEF08A' }; // Parchment
        labelTextSimColor = '#171717'; // Black Ink
    }

    const stopperHeightEstimate = (stopperType !== 'none' && stopperType !== 'wax_seal') ? rng.int(5, 9) : (stopperType === 'wax_seal' ? 3 : 0);
    const totalVisualHeight = bodyHeight + neckHeight + stopperHeightEstimate;
    
    let flaskBottomY = CANVAS_PADDING + Math.floor((LOGICAL_GRID_HEIGHT - CANVAS_PADDING*2 - totalVisualHeight)/2) + totalVisualHeight;
    flaskBottomY = Math.min(flaskBottomY, LOGICAL_GRID_HEIGHT - CANVAS_PADDING - (baseStyle.includes('rounded') ? Math.floor(bodyWidth/2) : 2));
    const flaskCenterX = Math.floor(LOGICAL_GRID_WIDTH / 2);

    const flaskDetails = { shape: flaskShape, bodyWidth, bodyHeight, neckWidth, neckHeight, palette: glassPalette, baseStyle };
    const flaskKeyPoints = drawFlaskShape(ctx, flaskDetails, flaskCenterX, flaskBottomY);

    if (hasLabel && labelPalette) {
        drawPotionLabel(ctx, { palette: labelPalette, textSimColor: labelTextSimColor }, flaskKeyPoints, rng);
    }
    
    const liquidDetailsToDraw = { liquidPalette: chosenLiquid.palette, liquidPalette2: actualLiquidPalette2, mixStyle: liquidMixStyle, fillLevel: liquidFillLevel, hasBubbles };
    drawLiquid(ctx, liquidDetailsToDraw, flaskKeyPoints, rng);

    if (stopperPalette) {
        const stopperDetails = { type: stopperType, palette: stopperPalette, gemPalette: stopperGemPalette };
        const effectiveNeckInnerWidth = Math.max(1, flaskKeyPoints.neckWidthAtTop);
        if (effectiveNeckInnerWidth > 0 || stopperType === 'wax_seal') {
            drawStopper(ctx, stopperDetails, flaskCenterX, flaskKeyPoints.neckTopY, effectiveNeckInnerWidth, neckHeight, rng);
        }
    }

    let itemName = chosenLiquid.name;
    if (chosenLiquid2) potionName = `Layered ${potionName}`;

    return {
        name: potionName,
        invType: 'potion', 
        seed: seed,
        imageDataUrl: offscreenCanvas.toDataURL(),
        itemData: {
            flaskShape,
            liquidColorName: chosenLiquid.name,
            liquidMixStyle: chosenLiquid2 ? liquidMixStyle : null,
            stopperType,
            hasLabel
        }
    };
}