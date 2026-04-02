# Agent F — Integrator

## Role
You combine all agent outputs into a single, self-contained React component file. You are the final agent — your output is the deliverable.

## Output
Write a single file: `adversarial-attack-viz.jsx`

This must be a **single self-contained file** with no imports from local modules. Everything is inlined.

## Read first
Read ALL agent outputs in this order:
1. `agents/output/data-layer.js` (Agent A) — data constants and functions
2. `agents/output/manifold-svg.jsx` (Agent B) — left panel SVG component
3. `agents/output/right-panel.jsx` (Agent C) — right panel component
4. `agents/output/step-animator.jsx` (Agent D) — step controller and layout
5. `agents/output/slider-inset.jsx` (Agent E) — epsilon slider and inset

Also read:
- `converged-concept.md` — the authoritative design spec
- `skill_spec/pipeline-stages-preview.md` — implementation requirements checklist

## What to do

### 1. Merge all code into one file
- Inline all constants, functions, and components from agents A–E
- Remove all inter-file imports — everything lives in one file
- Resolve any naming conflicts (prefix if needed)
- Order: constants → utility functions → sub-components → main component → default export

### 2. Add font loading
At the top of the file, add a style block or useEffect that loads Google Fonts:
```js
const fontLink = document.createElement('link');
fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=JetBrains+Mono:wght@400;700&display=swap';
fontLink.rel = 'stylesheet';
document.head.appendChild(fontLink);
```

### 3. Add KaTeX loading
Load KaTeX CSS and JS from CDN for math rendering:
```js
// KaTeX CSS
const katexCss = document.createElement('link');
katexCss.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';
katexCss.rel = 'stylesheet';
document.head.appendChild(katexCss);
```
Use `katex.renderToString()` for inline math if the global `katex` is available, otherwise fall back to Unicode math strings.

### 4. Wire up the data flow
The main component should:
```
step (useState, 1–6)
epsilon (useState, 0.03)
  └── loss = getLossAtEpsilon(epsilon)
  └── confidences = getConfidences(epsilon)
  └── adversarialPos = getAdversarialPosition(startPos, gradient, epsilon)
```

Pass these computed values to `<ManifoldPlot>`, `<RightPanel>`, `<EpsilonSlider>`, and `<RandomVsFgsmInset>`.

### 5. Verify against the converged concept

Cross-check every element:

- [ ] **Background**: `#0D1117` everywhere
- [ ] **Layout**: 60% left (manifold), 40% right (panel)
- [ ] **Step 1**: Blue data point + loss readout ~0.3
- [ ] **Step 2**: Amber gradient arrow, 600ms ease-out fade-in
- [ ] **Step 3**: Component arrows snap to ±ε, stagger 200ms, overshoot easing, color `#FFA657` → `#FF7B72`
- [ ] **Step 4**: Dotted perturbation path in `#58A6FF`, 800ms; ε slider appears; random-vs-FGSM inset appears
- [ ] **Step 5**: Image triplet (200×200 cards, 1px `#30363D` border), confidence bars animate 300ms ease-out
- [ ] **Step 6**: Dimensionality callout card on `#161B22`, text about 2^150,528
- [ ] **Typography**: Inter 28px+ for labels, 42px bold for class names, JetBrains Mono 36px for loss
- [ ] **ε slider**: range [0, 0.3], default 0.03, logarithmic feel, tick marks at 0/0.01/0.03/0.1/0.3
- [ ] **Keyboard**: right arrow / space to advance, left arrow to go back
- [ ] **Edge cases**: ε=0 works (no NaN), ε=0.3 works (large perturbation)

### 6. Final cleanup
- Remove any dead code, console.logs, TODO comments
- Ensure the default export is the main component with no required props
- Add a brief comment at the top: title, description, authorship

### 7. Pre-delivery checklist (from pipeline-stages)
- [ ] Renders without errors
- [ ] All controls work and visibly affect the visualization
- [ ] Labels are readable at distance (large, high contrast)
- [ ] The "aha moment" comes through in the interaction
- [ ] Math is correct
- [ ] Edge cases handled
- [ ] Animations run smoothly
- [ ] Color palette matches the spec

## Constraints
- **Single file** — no imports from local files (React itself can be imported)
- All styles inline (no separate CSS file)
- Default export, no required props
- Must work in a standard React 18 environment (e.g., Vite, CRA, or artifact preview)
- Total file should be under ~1500 lines (if it's getting longer, refactor for conciseness)
