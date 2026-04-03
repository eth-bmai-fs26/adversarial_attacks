# Issue 6: Probability Bars & Gauge Meter

## Goal

Build two connected display components: (a) the probability bars showing true-class and runner-up confidence, and (b) the gauge meter showing the dimensional scaling "attack budget" — both driven by precomputed data via props, updating in real-time as ε changes.

## Dependencies

- **Issue 3** (Project Scaffold): Design tokens, Tailwind config, types

## Context

These components sit above and below the central MNIST image in Beats 1-3. The probability bars show what the network thinks (class probabilities), while the gauge meter shows WHY it flips (the dimensional scaling argument: many tiny pushes overwhelm the decision margin). Together they answer: "What happened?" (bars) and "Why did it happen?" (gauge).

## Deliverables

### 1. ProbabilityBars Component (`src/components/ProbabilityBars.tsx`)

```tsx
interface ProbabilityBarsProps {
  probs: number[];             // [10] softmax probabilities for all classes
  trueClass: number;           // Ground truth label (0-9)
  epsilon: number;             // Current ε (for styling changes at flip)
  epsilonStar: number | null;  // ε* for flip detection
  flipped: boolean;            // Whether current prediction ≠ trueClass
}
```

**Layout:**
Two horizontal bars stacked vertically, centered above the image area, total height ~60px:

```
┌─ "7" — 93.2% ─────────────────────────┐  <- True class bar (sky blue)
└────────────────────────────────────────┘
┌─ "3" — 4.1% ──┐                         <- Runner-up bar (pink)
└────────────────┘
  Logit margin: +6.3                        <- Muted secondary readout
```

**True class bar:**
- Color: sky blue `#38bdf8`
- Width: proportional to P(true_class), max width = container width
- Height: 24px
- Border radius: 4px
- Label (inside bar, left-aligned, 8px padding): digit class + probability in JetBrains Mono 20px, white
- Example: `"7" — 93.2%`

**Runner-up bar:**
- Color: pink `#f472b6`
- Width: proportional to P(runner_up), same scale as true class bar
- Height: 24px
- Border radius: 4px
- Label: same format as true class bar
- The runner-up class is `argmax(probs)` excluding `trueClass`

**Runner-up hysteresis:**
The runner-up class label should NOT flicker when two non-true classes are close in probability. Implement hysteresis:
- Only change the displayed runner-up class when a NEW class exceeds the current runner-up by ≥5 percentage points
- When the runner-up class changes: pulse animation on the pink bar (opacity 1→0.5→1, scale 1→1.05→1, 200ms), label crossfades (200ms)
- Store the current displayed runner-up in component state (not just derived from props)

**Logit margin readout:**
- Below the bars: `"Logit margin: +6.3"` in JetBrains Mono 18px, muted `#94a3b8`
- The margin = logit[trueClass] - max(logit[k] for k ≠ trueClass)
- Positive values show `+`, negative show `-`
- This ticks down approximately linearly as ε increases (the "no avalanche in logit space" honesty)
- Accept `margin` as a prop:

```tsx
  margin: number;              // Logit margin, can be negative
```

**Flip state visual changes:**
When `flipped` is true (prediction ≠ trueClass):
- The true class bar color dims to `#38bdf8` at 40% opacity
- The runner-up bar gets a subtle glow: `box-shadow: 0 0 8px #f472b6`
- The margin readout turns pink `#f472b6` and shows the negative value

### 2. GaugeMeter Component (`src/components/GaugeMeter.tsx`)

```tsx
interface GaugeMeterProps {
  attackStrength: number;      // ε · fgsm_margin_dot (first-order predicted effect)
  actualMargin: number;        // The real logit margin at current ε (from precomputed data)
  initialMargin: number;       // Margin at ε=0 (the threshold line position)
  epsilon: number;             // Current ε
}
```

**Layout:**
Horizontal meter, 320px wide (centered), positioned below the image and above the ε slider.

```
├────────────────────╫───────────────────────────────┤
0            attackStrength   initialMargin        max
              (fill)          (threshold)
```

**Visual spec:**
- Container: 320px × 12px, rounded ends (6px radius), background `#131c2e` (dormant)
- Fill bar: grows from left, width proportional to `attackStrength / (initialMargin * 1.5)` (so the bar can overshoot the threshold)
  - Color: sky blue `#38bdf8` when below threshold, transitions to pink `#f472b6` when crossing
  - Smooth width transition: 100ms ease-out (so it doesn't lag the slider but doesn't jitter)
- Threshold line: dashed vertical line (2px wide, 20px tall, centered on rail) at `initialMargin / (initialMargin * 1.5)` position
  - Label above: `"m(x) = 9.5"` in JetBrains Mono 14px, muted
  - The label says "Decision boundary" in DM Sans 12px, muted, below the line
- Actual margin notch: a small pink triangle (6px) on the rail showing where the ACTUAL logit margin is (from precomputed data), so the gap between linear prediction and reality is visible

**Dimensional scaling readout:**
Below the gauge, in JetBrains Mono 18px, muted `#94a3b8`:

```
Per pixel: ±0.150 · All 784 pixels: combined effect ≈ 8.3 (margin: 9.5)
```

This sentence updates live as ε changes:
- `±{epsilon}` — current ε, 3 decimal places
- `≈ {attackStrength}` — ε × fgsm_margin_dot, 1 decimal place
- `(margin: {initialMargin})` — static, the initial margin at ε=0, 1 decimal place

Accept an additional prop for the text:
```tsx
  fgsmMarginDot: number;       // Per-unit-ε attack strength (for the readout formula)
```

### 3. Responsive Behavior

**Probability Bars:**
- **Default** (≥1440px): As described, bars side by side conceptually (stacked vertically but full width)
- **Compact** (768-1439px): Bars stack vertically, font sizes × 0.8
- **Mobile** (<768px): Replace bars with single-line text: `"7: 93.2% → 3: 4.1%"` in JetBrains Mono 16px. No bars, just text. Margin readout hidden.

**Gauge Meter:**
- **Default**: 320px wide, centered
- **Compact**: 240px wide
- **Mobile**: Full width (minus 32px padding), stacks below image

## Mock Data for Development

Use these hardcoded values to develop without precomputed data:

```ts
const MOCK_PROBS = [0.001, 0.002, 0.041, 0.003, 0.001, 0.002, 0.005, 0.932, 0.008, 0.005];
const MOCK_TRUE_CLASS = 7;
const MOCK_MARGIN = 6.3;
const MOCK_INITIAL_MARGIN = 9.5;
const MOCK_FGSM_DOT = 48.7;
```

## File Structure

```
src/
└── components/
    ├── ProbabilityBars.tsx
    └── GaugeMeter.tsx
```

## Verification

- Probability bars render with correct proportions (true class bar wider when confident)
- Runner-up bar shows the correct second-highest class
- Runner-up hysteresis: rapidly changing probabilities don't cause label flickering
- Logit margin readout shows positive values as `+X.X`, negative as `-X.X`
- Gauge fill bar grows as epsilon increases (pass different mock values to verify)
- Gauge color transitions from sky blue to pink when crossing the threshold
- Threshold line is visible with "Decision boundary" label
- Dimensional scaling readout updates with ε values
- Flip state: bars visually change when flipped=true (dimmed true class, glowing runner-up)
- Responsive: bars become text on mobile, gauge stretches full width
- No console errors
