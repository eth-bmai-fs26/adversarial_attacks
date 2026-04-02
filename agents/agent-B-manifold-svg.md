# Agent B — Manifold SVG Component

## Role
You build the left-panel 2D manifold plot as a standalone React component. This is the main visual — the SVG canvas showing class regions, decision boundary, data point, gradient arrow, component arrows, and perturbation path.

## Output
Write a single file: `agents/output/manifold-svg.jsx`

Export a React component `<ManifoldPlot>` that accepts these props:

```ts
{
  step: number,           // 1–6, controls what's visible
  epsilon: number,        // 0–0.3, controls perturbation magnitude
  width: number,          // pixel width of the SVG
  height: number,         // pixel height of the SVG
}
```

## Read first
Read `agents/output/data-layer.js` (from Agent A) before implementing to understand the data API. If it doesn't exist yet, use the constants and function signatures described in `agents/agent-A-data-math.md`.

## What to build

### SVG Structure
- `viewBox` covering the coordinate range (e.g., `-3 -3 6 6`, or use pixel coords with transforms)
- Background rect: `#0D1117`
- Grid lines: `#1B2332`, thin (0.5px), spaced at 1-unit intervals

### Class Regions
- **"Panda" region** (the "correct" side of the boundary): filled path with `#2EA043` at 15% opacity, 2px boundary stroke at full `#2EA043`
- **"Gibbon" region** (the "wrong" side): filled path with `#F85149` at 15% opacity, 2px boundary stroke at full `#F85149`
- Class name labels: "panda" and "gibbon" (or "cat" and "dog" — use "panda" and "gibbon" to match the narrative), 42px bold Inter, placed inside their respective regions
- Decision boundary: the line/curve separating regions, drawn as the region borders (no separate line needed)

### Data Point (visible from step ≥ 1)
- Circle at the starting position, radius 18px (in screen coords), fill `#58A6FF`
- Soft glow effect: use an SVG `<filter>` with `<feGaussianBlur>` + `<feMerge>`
- At step ≥ 4: the point's position is computed from `getAdversarialPosition(startPos, gradient, epsilon)` — it moves when ε changes

### Gradient Arrow (visible from step ≥ 2)
- Arrow from data point in the gradient direction
- Stroke `#FFA657`, 3–4px, with arrowhead marker
- **Animation**: fade in over 600ms ease-out when step transitions to 2

### Component Arrows (visible from step ≥ 3)
- Two arrows from the data point: one horizontal (∂L/∂x₁), one vertical (∂L/∂x₂)
- Initial state: show as continuous gradient components
- **Snap animation**: each arrow independently snaps to length ±ε
  - x₁ arrow snaps at 0ms, x₂ at 200ms (staggered by 200ms)
  - Color transitions from `#FFA657` to `#FF7B72` during snap
  - Easing: `cubic-bezier(0.34, 1.56, 0.64, 1)` — slight overshoot
  - Total animation: 400ms
- The original gradient arrow (step 2) should fade out or become dashed when components appear
- Label each component with small text: "±ε"

### Perturbation Path (visible from step ≥ 4)
- Dotted/dashed line from original position to adversarial position
- Color `#58A6FF`, animated drawing over 800ms
- The data point follows this path to its new position

### FGSM Equation (visible from step ≥ 3)
- Render the FGSM equation below or above the plot area
- Use KaTeX if available, or a styled text approximation:
  `x_adv = clip(x + ε · sign(∇ₓL), 0, 1)`

## Animation Implementation
- Use React state + CSS transitions for simple property animations (opacity, transform)
- Use `useEffect` + `requestAnimationFrame` for the path-drawing animation
- Track animation state with `useRef` to avoid re-triggering on unrelated renders
- Key technique: when `step` changes, start a timer/RAF loop for that step's animation

## SVG Filters (define in `<defs>`)
```xml
<filter id="glow">
  <feGaussianBlur stdDeviation="4" result="blur"/>
  <feMerge>
    <feMergeNode in="blur"/>
    <feMergeNode in="SourceGraphic"/>
  </feMerge>
</filter>
```

## Constraints
- All colors from the palette in data-layer.js (import COLORS)
- The SVG must look good at 800×600 minimum
- No external images — everything is drawn in SVG
- Text must be large enough for a lecture hall (42px class names, 28px+ labels)
- Handle ε=0 edge case: point stays in place, arrows have zero length (render as dots or hide)
