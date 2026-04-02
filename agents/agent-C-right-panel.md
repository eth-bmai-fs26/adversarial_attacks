# Agent C — Right Panel Component

## Role
You build the right 40% of the layout: the info panel containing the loss readout, image triplet with confidence bars, and the dimensionality callout card.

## Output
Write a single file: `agents/output/right-panel.jsx`

Export a React component `<RightPanel>` that accepts these props:

```ts
{
  step: number,           // 1–6, controls what's visible
  epsilon: number,        // 0–0.3, for updating loss/confidence values
  loss: number,           // current loss value (from data layer)
  confidences: { panda: number, gibbon: number },  // from data layer
}
```

## Read first
Read `agents/output/data-layer.js` (from Agent A) if available, otherwise refer to `agents/agent-A-data-math.md` for the data API.

## What to build

### Layout
- Full height of the visualization, 40% width (passed via CSS from parent or prop)
- Background: `#0D1117` (same as main bg — appears "dark/blank" until content appears)
- Padding: 24px

### 1. Loss Readout (visible from step ≥ 1)
- Position: top of the right panel
- Label: "Loss" in Inter 20px, color `#94A3B8` (muted)
- Value: the loss number, displayed in JetBrains Mono 36px, color `#E6EDF3`
- Format: 2 decimal places, e.g., "0.30" or "4.21"
- The value updates live when ε changes (at step ≥ 4)
- **Animation**: when loss value changes, briefly flash the text color to `#FF7B72` if loss increased, `#2EA043` if decreased, then return to `#E6EDF3` over 300ms

### 2. FGSM Equation (visible from step ≥ 3)
- Below the loss readout, with 24px gap
- Render using KaTeX: `x_{\text{adv}} = \text{clip}(x + \varepsilon \cdot \text{sign}(\nabla_x L(\theta, x, y)),\, 0,\, 1)`
- If KaTeX is not loaded, fall back to styled HTML:
  `x_adv = clip(x + ε · sign(∇ₓL(θ, x, y)), 0, 1)`
- Font size: ~24px, color `#E6EDF3`

### 3. Image Triplet (visible from step ≥ 5)
- Three cards arranged horizontally, each ~200×200
- Cards have 1px border `#30363D`, slight border-radius (8px)
- **Card 1 — "Original"**: A placeholder panda image. Since we can't embed real images, create a stylized SVG representation: a simple colored rectangle with "🐼" emoji at 80px and label "panda" below. Or use a gradient fill that suggests an image. Background `#1E293B`.
- **Card 2 — "Perturbation (×10)"**: A heatmap visualization using the diverging colormap (`#58A6FF` → `#0D1117` → `#FF7B72`). Create a small grid (e.g., 8×8) of colored cells representing amplified perturbation values. Use a procedural pattern (some cells blue, some red, some dark) that looks like a structured perturbation heatmap.
- **Card 3 — "Adversarial"**: Similar to Card 1 but labeled "gibbon" — same visual (to emphasize imperceptibility), maybe with a very subtle overlay tint.
- Labels below each card: "Original", "Perturbation (×10)", "Adversarial" — Inter 16px, `#94A3B8`

### 4. Confidence Bars (below image triplet, visible from step ≥ 5)
- Below each image card, show a horizontal confidence bar
- **Card 1 bar**: "panda: 95%" — bar filled in `#2EA043`, width proportional to confidence
- **Card 3 bar**: "gibbon: 87%" — bar filled in `#F85149`
- Card 2 has no confidence bar (it's the perturbation, not a classification)
- Bar height: 8px, border-radius 4px, background track `#1B2332`
- Confidence percentage label: JetBrains Mono 16px, right-aligned
- **Animation**: bars animate width from 0 to final value over 300ms ease-out when step 5 is entered
- Values update when ε changes (at step ≥ 5)

### 5. Citation (visible from step ≥ 5)
- Small text below the image triplet
- "Goodfellow et al., 2015" — Inter 14px italic, `#94A3B8`

### 6. Dimensionality Callout Card (visible from step ≥ 6)
- A card that appears below everything else (or replaces the image area — use judgment)
- Background: `#161B22`, border-radius 12px, padding 32px
- Text content (use the DIM_CALLOUT from data layer):
  - Line 1: "In 2D, the sign vector has **4** possible directions."
  - Line 2: "For a 224×224×3 image: **2¹⁵⁰'⁵²⁸**"
  - Line 3: "— more than atoms in the observable universe."
  - Line 4: "The model cannot defend against all of them."
- Typography: Inter 24px, `#E6EDF3`. Bold numbers should be 32px and color `#FF7B72` for emphasis.
- **Animation**: fade in over 600ms when step 6 is entered

## Animation Implementation
- Use CSS transitions with `opacity` and `transform: translateY` for fade-in effects
- Confidence bars: transition `width` property with 300ms ease-out
- Loss flash: use `useEffect` watching the loss value, set a CSS class briefly

## Constraints
- All colors from the converged concept palette
- Fonts: Inter for text, JetBrains Mono for numbers — loaded via Google Fonts `@import`
- No external image files — all visuals are CSS/SVG/emoji
- Text sizes: minimum 16px for any text, 36px for loss readout
- Component must work standalone for testing (provide default prop values)
