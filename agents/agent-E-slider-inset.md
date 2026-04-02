# Agent E — Epsilon Slider & Random-vs-FGSM Inset

## Role
You build the ε slider control and the random-vs-FGSM comparison inset that appears at step 4. These are the interactive elements that let students explore the attack parameter.

## Output
Write a single file: `agents/output/slider-inset.jsx`

Export two React components: `<EpsilonSlider>` and `<RandomVsFgsmInset>`.

## Read first
Read these files before implementing:
- `agents/output/data-layer.js` (Agent A) — for `getLossAtEpsilon`, `getConfidences`, `getAdversarialPosition`, `getRandomPerturbation`
- `agents/output/manifold-svg.jsx` (Agent B) — to understand coordinate system

## What to build

### 1. `<EpsilonSlider>` Component

Props:
```ts
{
  epsilon: number,
  onChange: (value: number) => void,
  visible: boolean,  // only shown at step >= 4
}
```

**Design:**
- A custom-styled range slider (not browser default)
- Track: 300px wide, 6px tall, border-radius 3px, background `#1B2332`
- Filled portion: gradient from `#58A6FF` to `#FF7B72` (blue to red, indicating danger)
- Thumb: 20px circle, `#E6EDF3` fill, 2px `#58A6FF` border, cursor grab
- Range: [0, 0.3], default 0.03, step 0.001

**Tick marks:**
- Five labeled ticks below the slider at: 0, 0.01, 0.03, 0.1, 0.3
- These are NOT linearly spaced — use logarithmic positioning on the track
- Tick labels: JetBrains Mono 14px, `#94A3B8`
- The 0.03 tick should have a small "default" label above it in `#58A6FF`

**Value display:**
- Above the slider, show the current ε value: "ε = 0.030"
- JetBrains Mono 28px, `#E6EDF3`
- Below, show the equivalent in 8-bit: "≈ 8/255" (computed as `Math.round(epsilon * 255)` + "/255")
- Inter 16px, `#94A3B8`

**Logarithmic mapping:**
Since the perceptually important range is 0–0.03 (where the boundary crossing happens), use a logarithmic or piecewise-linear mapping so the left 60% of the slider covers 0–0.03 and the right 40% covers 0.03–0.3.

Implementation: convert slider position (0–1) to epsilon using a power curve:
```js
// slider position → epsilon
epsilon = 0.3 * Math.pow(position, 2.5)
// epsilon → slider position
position = Math.pow(epsilon / 0.3, 1/2.5)
```
This gives finer control at small ε values.

**Animation on appear:**
- Fade in from below (translateY(20px) → translateY(0)) over 400ms ease-out
- Only plays once, when `visible` transitions from false to true

### 2. `<RandomVsFgsmInset>` Component

Props:
```ts
{
  epsilon: number,
  visible: boolean,  // only shown at step >= 4
  width: number,     // ~15% of canvas width
}
```

**Design:**
- A small comparison panel showing two displacement vectors from the same origin point
- Background: `#161B22`, border-radius 8px, padding 16px
- Contains a small SVG showing:
  - Origin point: small `#58A6FF` circle (6px radius)
  - **FGSM vector**: arrow in `#FF7B72`, pointing in the sign(gradient) direction, length proportional to ε. Label "FGSM" at 16px.
  - **Random vector**: arrow in `#94A3B8` (muted gray), pointing in a fixed random direction (deterministic), same magnitude. Label "random" at 16px.
  - Optional: a small arc or dotted circle showing they have equal magnitude
- Below the SVG: a mini bar chart showing the loss increase caused by each:
  - FGSM bar: `#FF7B72`, shows large loss increase (e.g., ΔL = 3.9)
  - Random bar: `#94A3B8`, shows small loss increase (e.g., ΔL = 0.2)
  - Labels: "ΔL" and the values, JetBrains Mono 14px
- Title: "Random vs FGSM" — Inter 16px bold, `#E6EDF3`

**Reactivity:**
- When ε changes, both vectors scale proportionally
- The loss-increase values update (random stays low, FGSM stays high)

**Animation on appear:**
- Fade in over 400ms when `visible` becomes true

## Constraints
- Custom slider must work with pointer events (not just mouse) for touch support
- The logarithmic mapping must be invertible (slider → ε and ε → slider position)
- Handle ε=0: both vectors have zero length, show as dots, ΔL = 0 for both
- Handle ε=0.3: vectors are long but stay within the inset's SVG bounds (clamp arrow length)
- All colors from the converged concept palette
- No external dependencies beyond React
