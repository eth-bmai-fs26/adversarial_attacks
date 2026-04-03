# Issue 9: MNIST Image Canvas

## Goal

Build a canvas component that renders a 28×28 MNIST digit at 480×480px, applies real-time FGSM perturbation as ε changes, and supports a dim-to-35% opacity animation for the Ghost reveal (Beat 2a). This is the central image that sits at the heart of every beat.

## Dependencies

- **Issue 3** (Project Scaffold): Design tokens, types (`ImageData`)

## Context

The MNIST image is the protagonist of the visualization. It starts as a clean digit (white on deep navy), and as the professor drags the ε slider, the pixel values shift in real-time — the actual clipped perturbation is applied, not a simulation. At ε* the classification flips, but the image looks nearly identical. This imperceptibility gap is the core lesson.

In Beat 2a ("The Ghost"), the digit dims to 35% opacity so the stained-glass sign map can overlay it. The dimmed digit should remain visible through the transparent gaps in the mosaic.

## Deliverables

### 1. MnistCanvas Component (`src/components/MnistCanvas.tsx`)

```tsx
interface MnistCanvasProps {
  pixels: number[];               // [784], original image, values in [0, 1]
  signMap: number[];              // [784], values -1, 0, +1
  epsilon: number;                // Current perturbation magnitude [0, 0.35]
  dimmed: boolean;                // true = dim to 35% opacity (for Ghost reveal)
  size: number;                   // CSS width/height in pixels (default 480)
  className?: string;
}
```

### 2. Rendering Pipeline

**Step 1: Compute perturbed pixels**

For each pixel index `i` (0-783):
```
perturbed[i] = clamp(pixels[i] + epsilon * signMap[i], 0, 1)
```

This is the honest FGSM perturbation with clipping. Note the clipping asymmetry: background pixels near 0 with sign=-1 get `clamp(0.01 + ε×(-1), 0, 1) = clamp(0.01 - ε, 0, 1) ≈ 0` — barely affected. Stroke pixels near 1 with sign=+1 get `clamp(0.95 + ε, 0, 1) = 1.0` — also clipped. The perturbation is most visible on pixels in the mid-range.

**Step 2: Map to grayscale**

Each perturbed pixel value (0-1) maps to a grayscale byte (0-255). But we don't want pure black for 0 — the background should be the deep navy canvas color `#0f172a` (RGB: 15, 23, 42), and full white `#f1f5f9` (RGB: 241, 245, 249) for value 1.

```
r = lerp(15, 241, perturbed[i])
g = lerp(23, 245, perturbed[i])
b = lerp(42, 249, perturbed[i])
```

where `lerp(a, b, t) = a + (b - a) * t`

This means the digit renders as warm white on deep navy, matching the overall dark theme.

**Step 3: Render to canvas**

- Canvas resolution: `size * 2` × `size * 2` (2× for Retina)
- CSS dimensions: `size` × `size`
- Each MNIST pixel maps to a `(size * 2 / 28)` × `(size * 2 / 28)` block of canvas pixels
- At 480px CSS / 960px canvas: each MNIST pixel is ~34.3 × 34.3 canvas pixels
- Use `ctx.fillRect` for each pixel (faster than `putImageData` for 784 rects)
- OR use `ImageData` + `putImageData` for the full canvas (may be faster — benchmark both)

**Step 4: Apply dim overlay (if `dimmed = true`)**

When the Ghost sign map overlays the image, the digit needs to dim:
- Transition: current opacity → 35% over 300ms, ease-in-out
- Implementation: CSS `opacity` on the canvas element, transitioned via CSS `transition: opacity 300ms ease-in-out`
- When `dimmed` changes from false to true, the canvas smoothly fades to 35%
- When `dimmed` changes back to false, it smoothly fades back to 100%
- The dim is a CSS opacity on the `<canvas>` element itself — NOT a change to pixel values

### 3. Performance

The canvas must redraw whenever `epsilon` changes (which happens during slider drag — potentially 60fps).

Optimizations:
- **Pre-compute signMap contribution:** `delta[i] = signMap[i]` is constant. Only `epsilon` changes. So `perturbed[i] = clamp(pixels[i] + epsilon * delta[i], 0, 1)` — one multiply + one add + one clamp per pixel.
- **Use ImageData for bulk pixel writes:** Create an `ImageData(size*2, size*2)`, fill it, then `putImageData` once — this is faster than 784 `fillRect` calls for large canvases.
- **React.memo:** The component should only re-render when `pixels`, `signMap`, `epsilon`, `dimmed`, or `size` change. Use `React.memo` with a custom comparator that checks array identity (not deep equality) for `pixels` and `signMap`.
- **requestAnimationFrame:** If the parent calls `onChange` at >60fps, throttle redraws to animation frames.

Target: <1ms for the canvas redraw (784 pixels, trivial math).

### 4. Nearest-Neighbor Upscaling

The 28×28 → 480×480 upscale must use nearest-neighbor interpolation (no anti-aliasing). Each MNIST pixel should render as a crisp, sharp block — not blurred. This is critical for the "digital" aesthetic.

If using `putImageData` at 28×28 and then CSS scaling: set `image-rendering: pixelated` on the canvas. However, this may not work consistently across browsers.

Preferred approach: render at full resolution (960×960 canvas pixels) by filling each MNIST pixel as a 34×34 block. Handle the rounding (28 × 34 = 952, not 960) by making the last column/row 36px to fill the remaining space.

### 5. Responsive Behavior

The `size` prop controls everything:
- **Default**: `size={480}`
- **Compact** (768-1439px): `size={360}`
- **Mobile** (<768px): `size={Math.min(windowWidth - 32, 480)}`

All internal calculations scale with `size`.

### 6. Exports

```tsx
/** Compute perturbed pixel values (useful for other components) */
export function computePerturbedPixels(
  pixels: number[],
  signMap: number[],
  epsilon: number
): number[] {
  return pixels.map((p, i) => Math.max(0, Math.min(1, p + epsilon * signMap[i])));
}
```

## Mock Data for Development

```ts
// Generate a mock "7" digit
function generateMockDigit(): number[] {
  const pixels = new Array(784).fill(0.02); // Near-black background
  // Horizontal stroke at top
  for (let j = 6; j <= 22; j++) {
    for (let i = 5; i <= 7; i++) {
      pixels[i * 28 + j] = 0.9 + Math.random() * 0.1;
    }
  }
  // Diagonal stroke
  for (let i = 7; i <= 22; i++) {
    const j = Math.round(22 - (i - 7) * 0.7);
    for (let dj = -1; dj <= 1; dj++) {
      if (j + dj >= 0 && j + dj < 28) {
        pixels[i * 28 + j + dj] = 0.85 + Math.random() * 0.15;
      }
    }
  }
  return pixels;
}

// Mock sign map (random for non-zero pixels)
function generateMockSignMap(pixels: number[]): number[] {
  return pixels.map(p => p > 0.1 ? (Math.random() > 0.5 ? 1 : -1) : 0);
}
```

## File Structure

```
src/
└── components/
    └── MnistCanvas.tsx
```

## Verification

- Renders a 28×28 digit as a large crisp image (no blur between pixels)
- White strokes on deep navy background (not pure black)
- As epsilon increases from 0 to 0.35: the image subtly shifts (barely visible at 0.15, noticeable at 0.30)
- Background pixels near 0 with negative sign don't go below 0 (clipping works)
- Stroke pixels near 1 with positive sign don't go above 1 (clipping works)
- The `dimmed` prop smoothly transitions opacity to 35% over 300ms
- Undimming (dimmed=false) smoothly returns to 100%
- Responsive: looks good at 480px, 360px, and 280px
- Canvas is sharp on Retina displays (2× resolution)
- Performance: drag the epsilon slider rapidly — no janky frames, <1ms redraw
- No console errors
