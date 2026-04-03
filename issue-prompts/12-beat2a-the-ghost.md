# Issue 12: Beat 2a — The Ghost (Sign Map Reveal)

## Goal

Build the "screenshot moment" beat: the professor presses R and the MNIST digit dims to 35% while a luminous stained-glass mosaic of the sign map materializes over it. This is the visual climax of the entire visualization — the static composition should be striking enough to work as a poster.

## Dependencies

- **Issue 1** (Precomputed Data): sign maps, dead pixel masks
- **Issue 4** (Beat Navigation): Beat container
- **Issue 8** (Sign Map Renderer): `SignMapCanvas` component
- **Issue 9** (MNIST Canvas): `MnistCanvas` component with `dimmed` prop

## Context

Beat 2a ("The Ghost") reveals what FGSM actually computes: `sign(∇_x J)`. The sign map is rendered as a stained-glass mosaic — uniform amber/cyan tiles with gaps between them. The key insight is visual: every tile is the same size (FGSM perturbs every pixel by ±ε equally), but the pattern is structured (it follows the digit's stroke edges). The professor says: "Every colored square is the same size. The only thing that varies is direction: push brighter, or push darker."

The ε slider remains active in this beat — the probability bars and gauge still update. The sign map overlay is an ADDITION to the Beat 1 view, not a replacement.

## Deliverables

### 1. Beat2aGhost Component (`src/beats/Beat2aGhost.tsx`)

```tsx
interface Beat2aProps {
  imageData: ImageData;
  epsilon: number;
  onEpsilonChange: (eps: number) => void;
  isActive: boolean;
}
```

### 2. Layout

Same layout as Beat 1, but with the sign map overlaid on the MNIST image:

```
┌─────────────────────────────────────────────────┐
│  [Beat dots]                          [Settings]│
│                                                 │
│         ┌─ Probability bars ─────────────┐      │
│         └────────────────────────────────┘      │
│         Logit margin: +X.X                      │
│                                                 │
│              ┌──────────────┐                   │
│              │   MnistCanvas│ <- dimmed to 35%  │
│              │   (480×480)  │                   │
│              │ ┌──────────┐ │                   │
│              │ │ SignMap   │ │ <- overlaid       │
│              │ │ (480×480) │ │    at 100%        │
│              │ └──────────┘ │                   │
│              └──────────────┘                   │
│                                                 │
│    [Show the attack] or [Hide the attack]       │  <- Toggle button/R key
│                                                 │
│    [Gauge meter + readout]                      │
│    [ε slider]                                   │
└─────────────────────────────────────────────────┘
```

The `MnistCanvas` and `SignMapCanvas` are stacked absolutely within a `position: relative` container, both at 480×480px. The MNIST canvas is behind (z-index: 0), the sign map is in front (z-index: 1).

### 3. Reveal Animation

**Trigger:** Professor presses `R` key OR clicks the "Show the attack" button.

**Animation sequence (500ms total):**
1. **0-300ms:** `MnistCanvas` dims from 100% → 35% opacity (ease-in-out). Set `dimmed={true}` — the MnistCanvas handles this with CSS transition.
2. **100-500ms:** `SignMapCanvas` fades in from 0% → 100% opacity (ease-out). Use the `opacity` prop on SignMapCanvas, animated via CSS transition or a `requestAnimationFrame` interpolation.

Note: the sign map fade starts 100ms AFTER the dim starts, creating a brief "the digit is fading... into what?" moment.

**Hide (toggle back):**
When the professor presses `R` again or clicks "Hide the attack":
1. Sign map fades out 100% → 0% over 300ms
2. MNIST canvas undims 35% → 100% over 300ms (simultaneous)

### 4. State Management

```tsx
const [signMapVisible, setSignMapVisible] = useState(false);
const [signMapOpacity, setSignMapOpacity] = useState(0);
```

The reveal is a toggle controlled by `signMapVisible`. The opacity animation can be driven by CSS transitions on a wrapper div:

```tsx
<div style={{
  opacity: signMapVisible ? 1 : 0,
  transition: 'opacity 400ms ease-out',
  transitionDelay: signMapVisible ? '100ms' : '0ms',
}}>
  <SignMapCanvas ... />
</div>
```

### 5. Reveal Button

Below the image stack, centered:
- **Before reveal:** `"Show the attack (R)"` — DM Sans 18px, primary text `#f1f5f9`, with a subtle border (1px `#94a3b8`, rounded 8px, padding 8px 16px)
- **After reveal:** `"Hide the attack (R)"` — same style but muted text
- The `(R)` hint tells the professor the keyboard shortcut

### 6. Keyboard Handler

- **`R` key:** Toggle sign map visibility (only when Beat 2a is active)
- Register this as a beat-specific keyboard handler that activates when `isActive` is true
- Must not conflict with other keyboard handlers

### 7. ε Slider Remains Active

The ε slider and all Beat 1 displays (probability bars, gauge, image perturbation) remain functional. Changing ε while the sign map is visible:
- The MNIST canvas underneath updates (but it's at 35% opacity, so the change is subtle)
- The probability bars and gauge update normally
- The sign map itself does NOT change with ε — it's the sign of the gradient, which is computed at the clean image and is constant across all ε values

### 8. Shared State with Beat 1

Beat 2a shares `epsilon` state with Beat 1. When navigating from Beat 1 → Beat 2a, the current epsilon value persists. The beat receives epsilon as a prop from the parent (which manages it across beats).

The probability bars, gauge meter, and MNIST canvas props are computed the same way as in Beat 1 — use the same `interpolateLogits` / `softmax` logic. Consider extracting this into a shared hook:

```tsx
// src/hooks/useImageState.ts
function useImageState(imageData: ImageData, epsilon: number) {
  const logits = interpolateLogits(imageData, epsilon);
  const probs = softmax(logits);
  const margin = logits[imageData.true_class] - Math.max(...logits.filter((_, i) => i !== imageData.true_class));
  const predictedClass = logits.indexOf(Math.max(...logits));
  const flipped = predictedClass !== imageData.true_class;
  const attackStrength = epsilon * imageData.fgsm_margin_dot;
  const initialMargin = imageData.margin_at_eps[0];
  return { logits, probs, margin, predictedClass, flipped, attackStrength, initialMargin };
}
```

This hook should be created in this issue if it doesn't already exist from Issue 11. It avoids duplicating the computation logic.

### 9. Active Pixel Count Display

When the sign map is visible, show an additional readout below the image:
- `"~350 active pixels · ~430 dormant"` in DM Sans 14px, muted
- Computed from `imageData.dead_pixel_mask`: count true (dead) and false (active) values
- This reinforces that not all pixels participate equally in the gradient

### 10. Responsive Behavior

- **Default** (≥1440px): Image 480×480, button below image
- **Compact** (768-1439px): Image 360×360, button text size × 0.8
- **Mobile** (<768px): Image full-width - 32px, button full-width

## File Structure

```
src/
├── beats/
│   └── Beat2aGhost.tsx
└── hooks/
    └── useImageState.ts    (shared computation hook)
```

## Verification

- Beat 2a shows the same MNIST image + slider + bars as Beat 1
- Pressing R: digit dims to 35% (300ms), then sign map fades in (400ms, 100ms delayed)
- The sign map shows as a stained-glass mosaic of amber/cyan tiles over the ghosted digit
- The ghost of the digit is visible through the transparent dead-pixel gaps
- Pressing R again: sign map fades out, digit returns to full opacity
- The "Show the attack (R)" / "Hide the attack (R)" button toggles correctly
- ε slider still works — probability bars and gauge update
- The sign map does NOT change when ε changes (it's constant)
- Active/dormant pixel count is displayed
- Navigating to this beat from Beat 1 preserves the current ε value
- Responsive at all breakpoints
- No console errors
