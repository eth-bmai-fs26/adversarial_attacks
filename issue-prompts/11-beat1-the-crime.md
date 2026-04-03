# Issue 11: Beat 1 — The Crime

## Goal

Build the core interactive beat where the professor drags the ε slider and watches a clean MNIST digit get fooled. This beat composes the MNIST image canvas, epsilon slider, probability bars, gauge meter, and label shatter into a single cohesive interactive experience. It is the most complex beat — the heart of the visualization.

## Dependencies

- **Issue 1** (Precomputed Data): `standard_model.json` with per-image logits, sign maps, etc.
- **Issue 4** (Beat Navigation): Beat container, `useBeatNavigation`
- **Issue 5** (ε Slider): `EpsilonSlider` component
- **Issue 6** (Probability Bars & Gauge): `ProbabilityBars`, `GaugeMeter` components
- **Issue 7** (Label Shatter): `ShatterLabel` component
- **Issue 9** (MNIST Canvas): `MnistCanvas` component

## Context

Beat 1 is "The Crime." The professor opens it and sees a clean MNIST "7" classified at 99.3% confidence. They drag the ε slider. The image barely changes, but the probability bars shift. The runner-up class changes. At ε*, the label shatters and the classification flips. The gauge meter shows WHY — 784 tiny pushes overwhelmed the decision margin.

The professor's narrative: "Every pixel changed by ε = 0.15. Imperceptible to us. Devastating to the network."

## Deliverables

### 1. Beat1Crime Component (`src/beats/Beat1Crime.tsx`)

```tsx
interface Beat1Props {
  imageData: ImageData;        // The currently selected image (from precomputed data)
  isActive: boolean;           // Whether this beat is currently displayed
}
```

### 2. Layout

```
┌─────────────────────────────────────────────────┐
│  [Beat dots: ● ● ●─● ○]              [Settings]│  <- 40px header (from Beat Nav)
│                                                 │
│         ┌─ "7" — 93.2% ────────────────┐       │
│         └──────────────────────────────┘        │  <- True class bar (sky blue)
│         ┌─ "3" — 4.1% ──┐                      │
│         └────────────────┘                      │  <- Runner-up bar (pink)
│         Logit margin: +6.3                      │  <- Muted readout
│                                                 │
│              ┌──────────────┐                   │
│              │              │                   │
│              │   480×480    │                   │
│              │   MNIST "7"  │                   │  <- MnistCanvas
│              │              │                   │
│              │              │                   │
│              └──────────────┘                   │
│                                                 │
│    ├────────────╫──────────────────────────┤    │  <- GaugeMeter (320px)
│    0        attackStrength    margin             │
│    Per pixel: ±0.150 · All 784: ≈ 8.3 (9.5)   │  <- Scaling readout
│                                                 │
│  ═══════════════╤═════════════════════════════  │  <- EpsilonSlider (full-width)
│  0         ε*  ▲                       0.35     │
│            ε = 0.150                            │
└─────────────────────────────────────────────────┘
```

The probability bars, image, gauge, and slider are stacked vertically, centered, with the image as the focal point.

### 3. State Management

The beat manages these state variables:

```tsx
const [epsilon, setEpsilon] = useState(0);
const [hasFlipped, setHasFlipped] = useState(false);
const [shatterTriggered, setShatterTriggered] = useState(false);
```

### 4. Data Flow (ε changes → everything updates)

When `epsilon` changes (from slider drag):

**a) Interpolate logits:**
```ts
import { interpolateLogits, softmax } from '../lib/data';
const logits = interpolateLogits(imageData, epsilon);
const probs = softmax(logits);
const margin = logits[imageData.true_class] - Math.max(...logits.filter((_, i) => i !== imageData.true_class));
```

**b) Determine flip state:**
```ts
const predictedClass = logits.indexOf(Math.max(...logits));
const flipped = predictedClass !== imageData.true_class;
```

**c) Compute gauge values:**
```ts
const attackStrength = epsilon * imageData.fgsm_margin_dot;
const initialMargin = imageData.margin_at_eps[0]; // margin at ε=0
```

**d) Pass to child components:**
- `MnistCanvas`: `pixels={imageData.pixels}`, `signMap={imageData.loss_grad_sign}`, `epsilon={epsilon}`, `dimmed={false}`
- `EpsilonSlider`: `value={epsilon}`, `epsilonStar={imageData.epsilon_star}`, `onChange={setEpsilon}`
- `ProbabilityBars`: `probs={probs}`, `trueClass={imageData.true_class}`, `epsilon={epsilon}`, `epsilonStar={imageData.epsilon_star}`, `flipped={flipped}`, `margin={margin}`
- `GaugeMeter`: `attackStrength={attackStrength}`, `actualMargin={margin}`, `initialMargin={initialMargin}`, `epsilon={epsilon}`, `fgsmMarginDot={imageData.fgsm_margin_dot}`

### 5. Label Shatter at ε*

When the classification flips (crossing ε*):
- Trigger the `ShatterLabel` animation on the classification label
- The label sits above the probability bars: shows `"7" — 99.3%` normally
- At flip: shatters → reassembles as `"3" — 87.2%"` (the adversarial class and its probability)
- Color transitions from sky blue `#38bdf8` to pink `#f472b6`
- This is a callback to the panda shatter in Beat 0 — same visual language

**Implementation:**
- Track previous flip state. When `flipped` transitions from false→true, set `shatterTriggered = true`
- When `flipped` transitions from true→false (dragging ε back below ε*), trigger a reverse shatter (back to true class, sky blue)
- Use a `useEffect` watching `flipped` to detect transitions

The label should be positioned above the probability bars, centered, in Syne 44px Bold.

### 6. Slider Rail Color Sync

The `EpsilonSlider` already handles the rail color transition (sky blue → white → pink at ε*). But this beat also needs to sync the overall mood:
- When `flipped`: the entire beat has a subtle danger atmosphere
- The probability bars handle their own flip styling (Issue 6)
- The gauge handles its own color transition (Issue 6)
- No additional beat-level styling needed — the components handle themselves

### 7. Initial State & Reset

When the beat becomes active (`isActive` transitions to true):
- Reset `epsilon` to 0
- Reset `hasFlipped` to false
- Reset `shatterTriggered` to false
- The slider starts at 0, image is clean, bars show full confidence

When navigating away from this beat: preserve `epsilon` so that returning shows the same state. Only reset on explicit reset (Escape key, which goes to Beat 0).

### 8. Keyboard Shortcuts (Beat-specific)

These keys are only active when Beat 1 is displayed:
- **Arrow keys** (when slider is focused): control ε (handled by EpsilonSlider)
- No other beat-specific keys — Beat 1 is purely slider-driven

### 9. Responsive Behavior

- **Default** (≥1440px): Layout as shown above. Image 480×480, gauge 320px, slider full-width
- **Compact** (768-1439px): Image 360×360, gauge 240px, all fonts ×0.8, probability bars stack
- **Mobile** (<768px): Image full-width - 32px, gauge full-width, probability bars become text readout, slider full-width 48px

### 10. Performance

This beat updates on every slider drag event (~60fps). Ensure:
- `MnistCanvas` redraws in <1ms (it only does 784 pixel calculations)
- `interpolateLogits` is O(1) lookup + interpolation (not a search)
- `softmax` is O(10) — trivial
- `ProbabilityBars` re-renders only when probs/margin actually change (use `React.memo`)
- `GaugeMeter` re-renders only when attackStrength/margin change
- No heavy computations in the render path

## File Structure

```
src/
└── beats/
    └── Beat1Crime.tsx
```

## Verification

- Beat 1 shows a clean MNIST digit with "7 — 99.3%" at the top
- Dragging the ε slider: image subtly shifts, probability bars update smoothly, gauge fills
- Runner-up class changes dynamically (e.g., "2" → "3") with hysteresis
- At ε*: slider snaps, label shatters → reassembles as adversarial class in pink
- Dragging back below ε*: label shatters back to true class in sky blue
- Gauge meter shows fill crossing the threshold at roughly the same ε as the flip
- Dimensional scaling readout updates: "Per pixel: ±0.150 · All 784 pixels: combined effect ≈ 8.3 (margin: 9.5)"
- Logit margin readout ticks down approximately linearly
- Responsive at all three breakpoints
- Smooth 60fps during slider drag
- No console errors
