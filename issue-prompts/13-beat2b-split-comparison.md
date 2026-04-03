# Issue 13: Beat 2b — FGSM vs Gradient Split Comparison

## Goal

Build the split-view comparison that teaches WHY the sign function matters. A draggable vertical divider splits the image: left shows the FGSM sign map (uniform tiles), right shows the raw gradient attack (variable-size tiles). Status badges show FGSM succeeds while the gradient attack fails — the "dumber" equal-vote strategy beats the "smart" proportional strategy. The G key toggles a full-image blink comparison.

## Dependencies

- **Issue 1** (Precomputed Data): sign maps, gradient magnitudes, `raw_gradient_flipped` array
- **Issue 4** (Beat Navigation): Beat container
- **Issue 5** (ε Slider): `EpsilonSlider` — slider remains active
- **Issue 8** (Sign Map Renderer): `SignMapCanvas` in both `uniform` and `variable` modes

## Context

Beat 2b is "Equal vs. Proportional." It follows immediately from Beat 2a (The Ghost). The sign map is already visible. Now a vertical split divider slides in from the right edge, revealing a side-by-side comparison: FGSM (left, uniform tiles) vs. raw gradient attack (right, variable-size tiles).

The visual density contrast — uniform-and-dense vs. concentrated-and-sparse — is self-explanatory from the back row. The professor says: "The 'dumber' strategy that treats every pixel equally works better than the 'smart' one that focuses on important pixels. Why? Because it recruits ALL pixels."

## Deliverables

### 1. Beat2bSplit Component (`src/beats/Beat2bSplit.tsx`)

```tsx
interface Beat2bProps {
  imageData: ImageData;
  epsilon: number;
  onEpsilonChange: (eps: number) => void;
  isActive: boolean;
}
```

### 2. Split View Layout

```
┌─────────────────────────────────────────────────┐
│  [Beat dots]                          [Settings]│
│                                                 │
│         [Probability bars + logit margin]        │
│                                                 │
│    ┌──────────────┬───┬──────────────┐          │
│    │              │   │              │          │
│    │   FGSM       │ | │  Gradient    │          │
│    │   Sign Map   │ | │  Sign Map    │          │
│    │   (uniform)  │ | │  (variable)  │          │
│    │              │ | │              │          │
│    │              │   │              │          │
│    └──────────────┴───┴──────────────┘          │
│                                                 │
│    "FGSM — FLIPPED ✓"  |  "Gradient — HELD ✗"  │  <- Status badges
│                                                 │
│    [Gauge meter + readout]                      │
│    [ε slider]                                   │
└─────────────────────────────────────────────────┘
```

The image area (480×480) is split by a vertical divider. Both halves show sign maps overlaid on the dimmed MNIST digit.

### 3. Vertical Split Divider

**Visual spec:**
- 2px white vertical line spanning the full height of the image area
- A 20px × 40px rounded pill handle centered on the line (white fill, rounded 10px)
- Draggable horizontally within the image bounds

**Behavior:**
- Draggable range: 20% to 80% of image width (96px to 384px at 480px size)
- Default position: 50%
- Cursor: `col-resize` on hover/drag
- The divider position determines the CSS `clip-path` or `overflow` masking of each sign map canvas

**Entry animation:**
When Beat 2b becomes active, the divider slides in from the right edge:
- Start: positioned at 100% (fully right — only FGSM visible)
- End: 50% (centered)
- Duration: 400ms, ease-out

**Implementation:**
Both `SignMapCanvas` instances render at full 480×480px. The left canvas is clipped to `[0, dividerPosition]` and the right canvas to `[dividerPosition, 480]`. Use CSS `clip-path: inset(0 ${480 - pos}px 0 0)` for left and `clip-path: inset(0 0 0 ${pos}px)` for right.

### 4. Two Sign Map Canvases

**Left half (FGSM):**
```tsx
<SignMapCanvas
  signMap={imageData.loss_grad_sign}
  deadPixelMask={imageData.dead_pixel_mask}
  mode="uniform"
  size={480}
  highContrast={highContrast}
  opacity={1}
/>
```

**Right half (Raw gradient):**
```tsx
<SignMapCanvas
  signMap={imageData.loss_grad_sign}  // Same signs
  deadPixelMask={imageData.dead_pixel_mask}
  gradMagnitude={imageData.grad_magnitude}
  mode="variable"
  size={480}
  highContrast={highContrast}
  opacity={1}
/>
```

Both use the same sign map (same colors, same spatial pattern) — the ONLY difference is tile size. This makes the comparison fair and the lesson clear: FGSM discards magnitude information, keeping only the sign.

### 5. MNIST Image Behind

Behind both sign map canvases, render the `MnistCanvas` at 35% opacity (dimmed), so the ghosted digit is visible through the gaps. Same as Beat 2a.

### 6. Status Badges

Below the split image area, two status badges showing whether each attack flipped the classification at the current ε:

**Left badge (FGSM):**
- Text: `"FGSM — FLIPPED ✓"` when flipped, `"FGSM — HELD"` when not
- Color: emerald `#34d399` when flipped, muted `#94a3b8` when held
- Font: DM Sans 16px Bold

**Right badge (Gradient):**
- Text: `"Gradient — FLIPPED ✓"` when flipped, `"Gradient — HELD ✗"` when not
- Color: emerald `#34d399` when flipped, pink `#f472b6` with ✗ when held
- Font: DM Sans 16px Bold

**Flip detection:**
- FGSM flip: use the same flip detection as Beat 1 (from `logits_at_eps`)
- Gradient flip: use `imageData.raw_gradient_flipped[epsilonIndex]` — a boolean array precomputed for each ε step
- To get `epsilonIndex`: `Math.round(epsilon / 0.0035)`, clamped to [0, 99]

At moderate ε, typically FGSM is flipped while gradient is held — this is the core lesson. At very high ε (>0.25), both may flip, which is itself a lesson: "Even the weaker attack works with enough budget."

The badges update live as ε changes.

### 7. G Key — Full-Image Blink Toggle

An alternative comparison mode: instead of the split view, show the FULL image alternating between FGSM and gradient views.

- **`G` key:** Toggle between split view and blink mode
- In blink mode: the full 480×480 area shows either the FGSM sign map or the gradient sign map
- Pressing `G` swaps which one is shown with a 150ms crossfade
- The status badges still show below, for both attacks
- Pressing `G` again swaps back

**Implementation:**
```tsx
const [blinkMode, setBlinkMode] = useState<'split' | 'fgsm' | 'gradient'>('split');
```

- `split`: normal split view with draggable divider
- `fgsm`: full-image showing FGSM uniform tiles
- `gradient`: full-image showing gradient variable tiles
- `G` key cycles: `split → fgsm → gradient → split` (or just toggles between fgsm/gradient when in blink mode)

Simpler: First `G` press enters blink mode showing gradient (since FGSM was already visible). Each subsequent `G` press toggles between fgsm and gradient with 150ms crossfade. Press `Escape` or navigate away to return to split mode.

### 8. Shared State

Like Beat 2a, this beat shares `epsilon` with the parent. Probability bars, gauge, and logit readout remain active and update as ε changes.

### 9. Responsive Behavior

- **Default** (≥1440px): 480×480 split area, divider draggable
- **Compact** (768-1439px): 360×360 split area
- **Mobile** (<768px): Stack vertically instead of splitting. Show FGSM sign map above gradient sign map, each at full width, with badges between them. No draggable divider on mobile — use G key toggle instead.

## File Structure

```
src/
└── beats/
    └── Beat2bSplit.tsx
```

## Verification

- Navigating to Beat 2b: divider slides in from right edge, settling at 50% (400ms)
- Left side shows FGSM uniform tiles, right shows gradient variable tiles
- The visual contrast is immediately obvious: left is dense/uniform, right is sparse/concentrated
- Dragging the divider: smoothly reveals more of one side, less of the other
- Divider snaps to 20%-80% range (doesn't disappear off edges)
- Status badges update correctly as ε changes: FGSM typically flips first
- G key: switches to full-image blink mode with 150ms crossfade between FGSM/gradient views
- ε slider remains active — both sign maps and badges update
- The dimmed MNIST digit is visible behind both sign maps
- Responsive: mobile stacks vertically
- No console errors
