# Issue 8: Stained-Glass Sign Map Renderer

## Goal

Build a canvas-based renderer that draws the FGSM sign map as a luminous stained-glass mosaic — uniform amber and cyan tiles with gaps between them, overlaid on the dimmed digit. This is the signature visual of the entire visualization ("The Ghost"). It must also support a variable-tile-size mode for the gradient comparison (Beat 2b).

## Dependencies

- **Issue 3** (Project Scaffold): Design tokens, color palette

## Context

The stained-glass sign map is the visual climax — "the screenshot moment." It encodes the mathematical content of `sign(∇_x J)` directly: every colored tile is the same size (because FGSM perturbs every pixel by exactly ±ε), only the color varies (amber = push brighter, cyan = push darker). Dead pixels (near-zero gradient) show as faint dormant tiles. The spatial pattern traces the digit's stroke edges — clearly structured, not random.

This is the single highest-risk visual element. It must look stunning at close range (laptop) AND be legible at projection distance (10-15m on a 1080p projector). The high-contrast mode is the fallback for projectors.

## Deliverables

### 1. SignMapCanvas Component (`src/components/SignMapCanvas.tsx`)

```tsx
interface SignMapCanvasProps {
  signMap: number[];              // [784], values -1, 0, +1 (FGSM sign)
  deadPixelMask: boolean[];       // [784], true = dead pixel
  gradMagnitude?: number[];       // [784], for variable-size mode (Beat 2b)
  mode: 'uniform' | 'variable';  // uniform = FGSM, variable = raw gradient
  size: number;                   // Canvas width/height in CSS pixels (default 480)
  highContrast: boolean;          // Projector mode
  opacity?: number;               // 0-1, for fade-in animation (default 1)
  className?: string;
}
```

### 2. Uniform Mode (FGSM Sign Map) — "The Ghost"

This is the primary rendering mode, used in Beats 2a and the left half of Beat 2b.

**Grid math:**
- Input: 28×28 sign values
- Canvas size: `size` × `size` CSS pixels (default 480×480)
- Tile size: 15px per tile
- Gap size: 2px between tiles
- Cell size: 15 + 2 = 17px per cell
- Grid total: 28 × 17 - 2 = 474px (fits within 480px, centered with 3px margin each side)
- Canvas resolution: render at 2× for Retina displays (`canvas.width = size * 2`, CSS `width = size`)

**Tile rendering:**
For each pixel (i, j) where i is row (0-27), j is column (0-27):

1. Compute tile position: `x = margin + j * cellSize`, `y = margin + i * cellSize`
2. Look up `signMap[i * 28 + j]` and `deadPixelMask[i * 28 + j]`

3. If **dead pixel** (mask = true):
   - Fill tile with dormant color `#131c2e`
   - No glow effect
   - This creates the faint ghost lattice showing the grid structure

4. If **active pixel, sign = +1** (push brighter):
   - Fill tile with amber `#fbbf24`
   - Apply glow (see below)

5. If **active pixel, sign = -1** (push darker):
   - Fill tile with cyan `#22d3ee`
   - Apply glow (see below)

6. If **sign = 0** (exactly zero gradient — rare):
   - Treat as dead pixel

**Gaps:** The 2px gaps between tiles should show `#0a0f1a` (tile-gap color). Achieve this by filling the entire canvas with `#0a0f1a` first, then painting tiles on top.

**Glow effect (default mode):**
After rendering all tiles, apply a glow pass:
- Use `ctx.shadowColor` with the tile's color at 30% opacity
- `ctx.shadowBlur = 6` (CSS pixels, so 12 at 2× canvas resolution)
- Re-draw each active tile to apply the shadow
- This creates the soft atmospheric glow that makes adjacent same-colored tiles' halos merge slightly

Alternative approach if `shadowBlur` performance is poor: render to a second offscreen canvas, apply a Gaussian blur (CSS `filter: blur(3px)`) at 30% opacity, composite behind the sharp tiles.

**High-contrast mode (`highContrast = true`):**
For projector legibility:
- Gap size: 3px (cell size = 18px, grid = 28 × 18 - 3 = 501px — must reduce tile to 14px to fit: 28 × (14+3) - 3 = 473px)
- No glow/shadow effects
- Tiles rendered as solid blocks with sharp edges
- Dormant tiles: same `#131c2e` but at 50% opacity (more visible lattice)

### 3. Variable Mode (Gradient Magnitude) — Beat 2b Right Half

Used in the FGSM-vs-gradient split comparison. The raw gradient attack doesn't use `sign()` — it preserves gradient magnitude, so the perturbation concentrates on high-gradient pixels.

**Tile sizing:**
For each active pixel (i, j):
- Compute normalized magnitude: `norm = |grad_magnitude[idx]| / max(grad_magnitude)`
- Tile dimension: `max(3, floor(15 × norm^0.5))` CSS pixels
- This creates variable-size tiles: a few large ones (high gradient), most are tiny specks
- Center each tile within its cell

**Colors:** Same amber/cyan for sign, same dormant for dead pixels. Same glow rules.

The visual contrast between uniform mode (left) and variable mode (right) is the core lesson of Beat 2b: FGSM treats all pixels equally (uniform tiles), raw gradient concentrates on "important" pixels (variable tiles).

### 4. Canvas Rendering Pipeline

```
1. Fill canvas with gap color (#0a0f1a)
2. For each cell (i, j):
   a. Compute tile position and size
   b. Determine fill color (amber, cyan, or dormant)
   c. Fill tile rectangle
3. Glow pass (if !highContrast):
   a. For each active tile, re-draw with shadowBlur
4. Apply opacity (if opacity < 1):
   a. Set canvas globalAlpha = opacity
```

**Performance:** The canvas has at most 784 tiles. A full redraw should complete in <2ms on any modern device. The canvas should only re-render when props change (use `React.memo` and compare prop values). Use `requestAnimationFrame` for the glow pass if it's expensive.

### 5. Responsive Behavior

The `size` prop controls the canvas dimensions:
- **Default**: `size={480}`
- **Compact**: `size={360}`
- **Mobile**: `size={windowWidth - 32}`

The tile sizes, gaps, and margins scale proportionally with `size / 480`.

### 6. Exports

Also export a helper for computing derived data:

```tsx
/** Compute the max gradient magnitude for normalization in variable mode */
export function computeMaxGradMagnitude(gradMagnitude: number[]): number;

/** Count active (non-dead) pixels */
export function countActivePixels(deadPixelMask: boolean[]): number;
```

## Mock Data for Development

Generate mock data to develop without the precomputation pipeline:

```ts
// Generate a mock sign map that looks like a "7" digit
function generateMockSignMap(): { signMap: number[], deadPixelMask: boolean[], gradMagnitude: number[] } {
  const signMap = new Array(784).fill(0);
  const deadPixelMask = new Array(784).fill(true);
  const gradMagnitude = new Array(784).fill(0);

  // Draw a rough "7" pattern: horizontal stroke at top (rows 5-7), diagonal stroke (rows 7-22)
  for (let i = 0; i < 28; i++) {
    for (let j = 0; j < 28; j++) {
      const idx = i * 28 + j;
      const isTopStroke = i >= 5 && i <= 7 && j >= 6 && j <= 22;
      const isDiag = i >= 7 && i <= 22 && Math.abs(j - (22 - (i - 7) * 0.7)) < 2;
      if (isTopStroke || isDiag) {
        signMap[idx] = Math.random() > 0.5 ? 1 : -1;
        deadPixelMask[idx] = false;
        gradMagnitude[idx] = Math.random() * 0.8 + 0.2;
      }
    }
  }
  return { signMap, deadPixelMask, gradMagnitude };
}
```

## File Structure

```
src/
└── components/
    └── SignMapCanvas.tsx
```

## Verification

- Renders a 28×28 grid of colored tiles on the dark canvas
- Active tiles are amber (#fbbf24) or cyan (#22d3ee) with correct sign mapping
- Dead tiles show as faint #131c2e with visible grid structure
- Gaps between tiles are #0a0f1a, creating the stained-glass "leading" effect
- Glow effect: active tiles have a soft colored halo that bleeds slightly into gaps
- High-contrast mode: wider gaps (3px), no glow, solid blocks, more visible dormant tiles
- Variable mode: tiles vary in size based on gradient magnitude (a few large, most tiny)
- Uniform mode: ALL active tiles are the same 15×15px — this is the mathematical point
- The component re-renders efficiently when props change (no flicker, <2ms draw time)
- Looks good at 480px, 360px, and 280px (responsive test)
- Canvas renders at 2× for Retina sharpness
- No console errors
