import React, { useRef, useEffect, useCallback } from 'react';

// --- Constants (at default 480px size) ---
const BASE_SIZE = 480;
const GRID = 28;

// Uniform mode defaults
const TILE_SIZE = 15;
const GAP_SIZE = 2;
// High-contrast mode
const HC_TILE_SIZE = 14;
const HC_GAP_SIZE = 3;

// Colors
const COLOR_GAP = '#0a0f1a';
const COLOR_DORMANT = '#131c2e';
const COLOR_AMBER = '#fbbf24';
const COLOR_CYAN = '#22d3ee';

// --- Exported helpers ---

/** Compute the max gradient magnitude for normalization in variable mode */
export function computeMaxGradMagnitude(gradMagnitude: number[]): number {
  let max = 0;
  for (let i = 0; i < gradMagnitude.length; i++) {
    const abs = Math.abs(gradMagnitude[i]);
    if (abs > max) max = abs;
  }
  return max;
}

/** Count active (non-dead) pixels */
export function countActivePixels(deadPixelMask: boolean[]): number {
  let count = 0;
  for (let i = 0; i < deadPixelMask.length; i++) {
    if (!deadPixelMask[i]) count++;
  }
  return count;
}

// --- Props ---

interface SignMapCanvasProps {
  signMap: number[];              // [784], values -1, 0, +1
  deadPixelMask: boolean[];       // [784], true = dead pixel
  gradMagnitude?: number[];       // [784], for variable-size mode (Beat 2b)
  mode: 'uniform' | 'variable';
  size: number;                   // CSS pixels (default 480)
  highContrast: boolean;
  opacity?: number;               // 0-1 (default 1)
  className?: string;
}

const SignMapCanvas: React.FC<SignMapCanvasProps> = React.memo(({
  signMap,
  deadPixelMask,
  gradMagnitude,
  mode,
  size,
  highContrast,
  opacity = 1,
  className,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const scale = size / BASE_SIZE;
    const dpr = 2; // Always 2× for Retina

    // Set canvas resolution
    canvas.width = size * dpr;
    canvas.height = size * dpr;
    ctx.scale(dpr, dpr);

    // Determine tile/gap/cell sizes based on mode
    const tileSize = highContrast
      ? HC_TILE_SIZE * scale
      : TILE_SIZE * scale;
    const gapSize = highContrast
      ? HC_GAP_SIZE * scale
      : GAP_SIZE * scale;
    const cellSize = tileSize + gapSize;
    const gridTotal = GRID * cellSize - gapSize;
    const margin = (size - gridTotal) / 2;

    // Precompute max gradient magnitude for variable mode
    let maxGrad = 1;
    if (mode === 'variable' && gradMagnitude) {
      maxGrad = computeMaxGradMagnitude(gradMagnitude) || 1;
    }

    // Apply global opacity
    ctx.globalAlpha = opacity;

    // Step 1: Fill canvas with gap color
    ctx.fillStyle = COLOR_GAP;
    ctx.fillRect(0, 0, size, size);

    // Step 2: Draw all tiles
    for (let i = 0; i < GRID; i++) {
      for (let j = 0; j < GRID; j++) {
        const idx = i * GRID + j;
        const sign = signMap[idx];
        const isDead = deadPixelMask[idx] || sign === 0;

        const cellX = margin + j * cellSize;
        const cellY = margin + i * cellSize;

        if (mode === 'variable' && !isDead && gradMagnitude) {
          // Variable-size tile: centered within cell
          const norm = Math.abs(gradMagnitude[idx]) / maxGrad;
          const varTileSize = Math.max(3 * scale, Math.floor(tileSize * Math.sqrt(norm)));
          const offset = (tileSize - varTileSize) / 2;

          ctx.fillStyle = sign > 0 ? COLOR_AMBER : COLOR_CYAN;
          ctx.fillRect(cellX + offset, cellY + offset, varTileSize, varTileSize);
        } else if (isDead) {
          // Dead / zero-gradient pixel
          if (highContrast) {
            ctx.globalAlpha = opacity * 0.5;
            ctx.fillStyle = COLOR_DORMANT;
            ctx.fillRect(cellX, cellY, tileSize, tileSize);
            ctx.globalAlpha = opacity;
          } else {
            ctx.fillStyle = COLOR_DORMANT;
            ctx.fillRect(cellX, cellY, tileSize, tileSize);
          }
        } else {
          // Active pixel — uniform tile
          ctx.fillStyle = sign > 0 ? COLOR_AMBER : COLOR_CYAN;
          ctx.fillRect(cellX, cellY, tileSize, tileSize);
        }
      }
    }

    // Step 3: Glow pass (skip in high-contrast mode)
    if (!highContrast) {
      ctx.shadowBlur = 6 * scale;
      for (let i = 0; i < GRID; i++) {
        for (let j = 0; j < GRID; j++) {
          const idx = i * GRID + j;
          const sign = signMap[idx];
          const isDead = deadPixelMask[idx] || sign === 0;
          if (isDead) continue;

          const cellX = margin + j * cellSize;
          const cellY = margin + i * cellSize;
          const color = sign > 0 ? COLOR_AMBER : COLOR_CYAN;

          // Shadow color at 30% opacity
          ctx.shadowColor = color + '4D'; // 4D ≈ 30% in hex

          if (mode === 'variable' && gradMagnitude) {
            const norm = Math.abs(gradMagnitude[idx]) / maxGrad;
            const varTileSize = Math.max(3 * scale, Math.floor(tileSize * Math.sqrt(norm)));
            const offset = (tileSize - varTileSize) / 2;
            ctx.fillStyle = color;
            ctx.fillRect(cellX + offset, cellY + offset, varTileSize, varTileSize);
          } else {
            ctx.fillStyle = color;
            ctx.fillRect(cellX, cellY, tileSize, tileSize);
          }
        }
      }
      // Reset shadow
      ctx.shadowColor = 'transparent';
      ctx.shadowBlur = 0;
    }
  }, [signMap, deadPixelMask, gradMagnitude, mode, size, highContrast, opacity]);

  useEffect(() => {
    draw();
  }, [draw]);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: size, height: size }}
      className={className}
    />
  );
});

SignMapCanvas.displayName = 'SignMapCanvas';

export default SignMapCanvas;
