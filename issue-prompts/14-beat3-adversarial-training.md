# Issue 14: Beat 3 — Adversarial Training Comparison

## Goal

Build the final core beat: a toggle between the standard model and a robust (adversarially trained) model. Same digit, same ε, but the robust model's sign map is dramatically sparser and its gauge barely reaches the decision threshold. This visually answers "What can we do about it?" and sets up adversarial training as the next lecture topic.

## Dependencies

- **Issue 1** (Precomputed Data): Standard model data
- **Issue 2** (Precomputed Data): Robust model data (`robust_model.json`)
- **Issue 4** (Beat Navigation): Beat container
- **Issue 6** (Probability Bars & Gauge): `ProbabilityBars`, `GaugeMeter`
- **Issue 8** (Sign Map Renderer): `SignMapCanvas`

## Context

Beat 3 is "The Implication." The professor toggles between standard and robust models. The visual contrast is immediate and dramatic: the standard model's dense stained-glass mosaic (hundreds of active amber/cyan tiles) becomes a sparse scatter of tiles on the robust model. The gauge meter that confidently crossed the threshold on the standard model barely budges on the robust one. The professor says: "Same attack. Trained to resist. The sign map has nothing to grab onto."

This beat does NOT explain how adversarial training works — it only shows the CONTRAST. The mechanism is the professor's next lecture topic.

## Deliverables

### 1. Beat3Adversarial Component (`src/beats/Beat3Adversarial.tsx`)

```tsx
interface Beat3Props {
  standardImageData: ImageData;   // From standard_model.json
  robustImageData: ImageData;     // From robust_model.json (same image ID)
  epsilon: number;
  onEpsilonChange: (eps: number) => void;
  isActive: boolean;
}
```

### 2. Layout

Same core layout as other beats, with a model toggle added:

```
┌─────────────────────────────────────────────────┐
│  [Beat dots]                          [Settings]│
│                                                 │
│         [Probability bars + logit margin]        │
│                                                 │
│   ┌─ Standard model ─┐  ┌─ Robust model ──┐    │  <- Toggle
│   └──────────────────┘  └─────────────────┘    │
│                                                 │
│              ┌──────────────┐                   │
│              │   MnistCanvas│  <- dimmed        │
│              │   + SignMap   │  <- overlaid      │
│              │   (480×480)  │                   │
│              └──────────────┘                   │
│                                                 │
│    ~187 active pixels · ~597 dormant            │  <- Pixel count
│                                                 │
│    [Gauge meter + readout]                      │
│    [ε slider]                                   │
└─────────────────────────────────────────────────┘
```

### 3. Model Toggle

A segmented control (two buttons side by side) centered above the image:

**Visual spec:**
- Two buttons: `"Standard model"` and `"Robust model"`
- Container: pill-shaped (rounded 24px), background `#131c2e`
- Active button: filled with sky blue `#38bdf8` (standard) or emerald `#34d399` (robust), white text
- Inactive button: transparent, muted text `#94a3b8`
- Font: DM Sans 16px Bold
- Padding: 8px 20px per button
- Transition: 200ms background-color and text-color on toggle

**Behavior:**
- Clicking toggles between standard and robust model data
- The sign map, probability bars, gauge, and pixel count all update to reflect the selected model
- The MNIST image (digit pixels) stays the same — it's the same input image
- The ε value persists across toggles

```tsx
const [modelType, setModelType] = useState<'standard' | 'robust'>('standard');
const activeImageData = modelType === 'standard' ? standardImageData : robustImageData;
```

### 4. Sign Map Display

The sign map is shown by default in Beat 3 (unlike Beat 2a where it's hidden until R is pressed). The digit is dimmed to 35%, sign map overlaid at 100%.

When toggling between models, the sign map crossfades (200ms):
1. Current sign map fades to 0% over 100ms
2. New sign map fades in from 0% to 100% over 100ms
3. The MNIST canvas stays at 35% throughout (same image, no change needed)

The visual impact: the standard model's dense mosaic suddenly becomes sparse. The professor can toggle back and forth to emphasize the contrast.

### 5. Gauge Meter Contrast

The gauge meter is the quantitative complement to the visual sign map contrast:
- **Standard model at ε=0.15:** gauge fill confidently crosses the threshold line
- **Robust model at ε=0.15:** gauge fill barely moves toward the threshold
- **Robust model at ε=0.30:** gauge fill approaches but may not reach the threshold (many images resist even at max ε)

Compute gauge values from the active model's data:
```tsx
const attackStrength = epsilon * activeImageData.fgsm_margin_dot;
const initialMargin = activeImageData.margin_at_eps[0];
```

The robust model's `fgsm_margin_dot` will be much smaller (the gradients are smoother, less aligned), and its `initialMargin` may be similar. So the ratio is unfavorable for the attacker.

### 6. Handling Robust Model Edge Cases

The robust model may NOT flip within [0, 0.35] for many images:
- `robustImageData.epsilon_star` may be `null`
- `robustImageData.adversarial_class` may be `null`

When ε* is null:
- The ε slider has no magnetic snap (pass `epsilonStar={null}`)
- The slider rail stays sky blue across the entire range
- No label shatter occurs
- Status: show `"Attack FAILED — model resisted"` in emerald `#34d399`, DM Sans 16px Bold, below the gauge

When ε* exists but is very high (e.g., 0.30+):
- The magnetic snap works normally, but the professor has to drag much further
- This is itself the lesson: "The robust model needs 2× the perturbation to fool"

### 7. Active Pixel Count

Display below the image (same as Beat 2a):
- `"~350 active pixels · ~430 dormant"` for standard model
- `"~187 active pixels · ~597 dormant"` for robust model
- The dramatic drop in active pixels reinforces "the sign map has nothing to grab onto"

### 8. Shared State

This beat shares `epsilon` with the parent. The `modelType` state is local to this beat — it resets to 'standard' when the beat becomes active (so the professor always starts with the standard model and toggles to robust as the reveal).

### 9. Responsive Behavior

- **Default** (≥1440px): As described, toggle above image, full layout
- **Compact** (768-1439px): Image 360×360, toggle text × 0.8
- **Mobile** (<768px): Toggle spans full width, image full width - 32px

## File Structure

```
src/
└── beats/
    └── Beat3Adversarial.tsx
```

## Verification

- Beat 3 shows the standard model's sign map by default (dense mosaic)
- Clicking "Robust model": sign map crossfades to a dramatically sparser mosaic
- Clicking "Standard model": crossfades back to dense
- The gauge meter shows the contrast: standard easily crosses threshold, robust barely moves
- Probability bars update for the selected model
- When robust model doesn't flip (ε* is null): "Attack FAILED" message, no magnetic snap, rail stays blue
- ε slider works across both models
- Active pixel count updates on toggle
- Toggle resets to "Standard" when navigating to this beat
- Responsive at all breakpoints
- No console errors
