# Agent A — Data & Math Engine

## Role
You produce the precomputed data layer for the FGSM adversarial attack visualization. No UI — just pure data, constants, and computation functions.

## Output
Write a single file: `agents/output/data-layer.js`

This file should export plain JavaScript (no React, no JSX). It will be imported by other agents.

## What to produce

### 1. Constants
```js
export const COLORS = {
  background: '#0D1117',
  grid: '#1B2332',
  catRegion: '#2EA043',
  dogRegion: '#F85149',
  dataPoint: '#58A6FF',
  gradientArrow: '#FFA657',
  snappedComponent: '#FF7B72',
  text: '#E6EDF3',
  cardBg: '#161B22',
  border: '#30363D',
  perturbationTrail: '#58A6FF',
};
```

### 2. Manifold geometry
Define the 2D manifold coordinate system and decision boundary. Use a coordinate space of roughly [-3, 3] on both axes.

- **Decision boundary**: A function `y = f(x)` that separates the two class regions. Use something visually clear — e.g., a slightly curved line like `y = 0.6x + 0.3` or a gentle sigmoid. The boundary should cross the canvas diagonally so both regions are large and visible.
- **Data point start position**: A point clearly inside the "correct" class region (e.g., `{x: -0.8, y: 1.2}` if that's in the "Panda/Cat" region).
- **Gradient direction**: A unit vector pointing toward (and across) the decision boundary. This represents ∇ₓL. Choose it so that applying sign(∇ₓL) * ε moves the point across the boundary at ε ≈ 0.03 (in the 2D simplified view, you'll need to scale this so the crossing is visible — the 2D plot is pedagogical, not physically accurate).

### 3. Loss lookup table
Create a function `getLossAtEpsilon(epsilon)` that returns a plausible loss value.
- At ε=0: loss ≈ 0.3 (low, correctly classified)
- At ε≈0.02: loss ≈ 1.5 (rising)
- At ε≈0.03: loss ≈ 4.2 (crossed boundary, high loss)
- At ε≈0.1: loss ≈ 6.5
- At ε≈0.3: loss ≈ 7.8

Use smooth interpolation (e.g., a piecewise cubic or a simple function like `a * tanh(b * epsilon) + c`). The sigmoid shape reflects the rapid loss jump when crossing the boundary.

### 4. Classification confidence
Create a function `getConfidences(epsilon)` returning `{ panda: number, gibbon: number }` where both are in [0, 1] and sum roughly to 1.
- At ε=0: `{ panda: 0.95, gibbon: 0.02 }`
- At ε=0.03: `{ panda: 0.08, gibbon: 0.87 }`
- At ε=0.3: `{ panda: 0.01, gibbon: 0.96 }`

Smooth interpolation between these anchor points.

### 5. Perturbation path computation
Create a function `getAdversarialPosition(startPos, gradient, epsilon)` that returns the position of the data point after perturbation:
```
x_adv = startPos + epsilon * sign(gradient) * scale
```
The `scale` factor should be tuned so that at ε=0.03 the point has clearly crossed the boundary in the 2D view.

### 6. Random perturbation (for comparison)
Create a function `getRandomPerturbation(startPos, epsilon, seed)` that returns a position displaced by a random direction at the same magnitude. The random direction should be deterministic (seeded) so it's consistent across renders. This random perturbation should NOT cross the boundary — that's the pedagogical point.

### 7. Equation strings
Export the core FGSM equation as a string constant for KaTeX rendering:
```js
export const FGSM_EQUATION = 'x_{\\text{adv}} = \\text{clip}(x + \\varepsilon \\cdot \\text{sign}(\\nabla_x L(\\theta, x, y)),\\, 0,\\, 1)';
```

### 8. Dimensionality callout text
```js
export const DIM_CALLOUT = {
  twoDDirections: '4',
  imageDirections: '2^{150{,}528}',
  fullText: 'In 2D, the sign vector has 4 possible directions. For a 224×224×3 image: 2^{150,528} — more than atoms in the observable universe. The model cannot defend against all of them.'
};
```

## Constraints
- No React, no DOM, no side effects — pure functions and constants
- All functions must handle ε=0 gracefully (no NaN, no division by zero)
- All functions must clamp outputs to reasonable ranges
- Use descriptive JSDoc comments on each export
