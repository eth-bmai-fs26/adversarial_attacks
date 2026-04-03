# Math Visualization Design Patterns

A library of proven patterns for interactive math visualizations, organized by topic. Use these as starting points and inspiration — don't copy them rigidly, but understand why they work and adapt them to the specific concept.

## Philosophy — What Makes a Great Lecture Visualization

### Visual ambition: Default to Wow
Every visualization should aim to be **visually stunning and memorable**. A lecture demo that looks like a homework widget fails even if the math is correct. The goal is to make students think "I want to play with that" the moment it appears on the projector.

### Tell a story, not a dashboard
The best visualizations are **narrative arcs**, not control panels. They have a beginning (hook), a middle (exploration), and a climax (the "aha" moment). Structure the visualization as a sequence of "beats" (like slides) with a story thread — not as a Swiss Army knife with 13 toggles.

A dashboard says "here are some tools." A story says "watch this... now try this... see why?" The professor is a narrator, not a console operator.

### One signature moment
Every visualization needs **one visual beat so striking it becomes the thing people remember**. This is the "screenshot moment" — a single still composition that would work as a poster. Design backwards from this moment: what visual, at what state, would make someone take a photo of the projector?

### Mathematical honesty over visual flash
Never build a visualization that teaches a wrong mental model, even if it looks cool. If a visual metaphor contradicts the math (e.g., a "spring snap-back" implying elastic restoring force where none exists, or a sequential animation of a parallel operation), **kill it**. The right visual is one where the math and the picture say the same thing. When in doubt, the Math Agent is right.

### Precompute everything for lectures, add live exploration separately
Lecture demos must be **bulletproof** — zero dependence on WebGL compilation, network requests, or GPU availability. Precompute all data as static JSON. Then, as a separate mode (behind a tab), offer live computation for student exploration. This "hybrid architecture" gives professors reliability and students genuine interactivity.

### Default to 3D when the concept is spatial
Surfaces, manifolds, vector fields, loss landscapes, decision boundaries in feature space, transformations — these are 3D concepts flattened into 2D in textbooks. Our job is to unflatten them. Use Three.js / React Three Fiber with orbit controls so the instructor can rotate the view live.

**When to use 3D:**
- Loss surfaces and optimization landscapes → 3D surface with a ball rolling on it
- Data manifolds → 3D surface embedded in space, with data points as glowing spheres
- Decision boundaries → 3D volume rendering or sliceable 3D regions
- Vector fields and gradients → 3D arrows on a surface
- Transformations (matrix, SVD) → 3D shapes morphing in space
- Any concept where "rotating to see it from another angle" would add insight

**When 2D is genuinely better:**
- 1D function plots (derivative, integral, Taylor series)
- Probability distributions (PDFs, histograms)
- Tree/graph structures (neural network diagrams, Bayesian networks)
- Concepts where the key insight is in pixel-level detail (perturbation maps, heatmaps)
- Concepts that are fundamentally about 2D slices (epsilon-delta bands)

**When both:** Use 3D as the primary view with a 2D companion panel showing a projection, cross-section, or synchronized 2D readout. The 3D builds spatial intuition; the 2D connects to familiar textbook representations.

---

## Structural Patterns (How to organize the whole app)

### The Beat-Based Presentation
**What**: A sequence of "beats" (like slides) each revealing one layer of the concept, with navigation between them.
**Why it works**: Controls cognitive load. Each beat answers one question, raised by the previous beat. The professor advances when ready — no auto-play stress.
**Structure**:
1. **Cold open** (5-10s, non-interactive): A dramatic hook that creates shock or curiosity
2. **Exploration** (30-60s): The main interactive beat — one primary control (slider, drag)
3. **Reveal** (20-30s): A visual reveal showing the underlying mechanism (sign map, gradient field, decomposition)
4. **Comparison** (20-30s): Side-by-side of method A vs B, or before vs after
5. **Implication** (20-30s): A toggle showing the consequence (robust vs standard, trained vs untrained)
6. **Gallery / Lab** (post-lecture): Browse variations, try your own input

**Key details**:
- Each beat is independently reachable (keyboard 1-4, clickable dots)
- A persistent control (e.g., parameter slider) carries across beats
- Transitions are 400ms crossfades, not distracting page animations
- Keyboard-first: the professor uses a wireless clicker that sends ←→ arrow keys

### The Hybrid Architecture (Precomputed + Live)
**What**: Core demo runs on precomputed static JSON. A separate "Lab Mode" tab loads a live ML model for student exploration.
**Why it works**: The lecture path is bulletproof (works on a 2019 MacBook Air with no WiFi). The lab path gives genuine interactivity (students explore their own inputs, see novel results).
**Key details**:
- Core beats: zero live inference, all canvas rendering from precomputed arrays
- Lab mode: lazy-loaded ML framework (TF.js, ONNX.js), clearly labeled "Results may vary — live computation"
- Data loading: core JSON on startup (~1MB), heavy data (3D surfaces, robust models) lazy-loaded when first needed
- The core demo is pedagogically complete WITHOUT lab mode. Lab mode is a bonus, not a crutch.

---

## Interaction Patterns (Individual controls and gestures)

### The Slider Reveal
**What**: A parameter slider that smoothly transitions between states.
**Why it works**: The act of dragging creates ownership. The student controls the pace.
**Best for**: Anything with a continuous parameter (ε, learning rate, n terms, sample size).
**Key details**:
- Show the parameter value prominently (large, monospace, 3+ decimal places for small values)
- Animate transitions — don't snap
- **Magnetic snap**: if there's a critical threshold, add a ±zone where the slider snaps to the exact value on release (300ms ease-out). This lets the professor reliably find the dramatic moment.
- Color-code the rail: safe zone in one color, danger zone in another, flash at the threshold

### The Comparison Split
**What**: Two side-by-side panels showing the same concept under different conditions, with a draggable divider.
**Why it works**: Comparison is the strongest tool for building intuition. Side-by-side removes the need to remember.
**Best for**: Before/after, method A vs B, different parameter regimes, standard vs robust.
**Key details**:
- Sync interactions — dragging in one panel updates both
- The divider is draggable (20%-80% range) with a visible handle
- Status badges below each side ("Method A — WORKS ✓" / "Method B — FAILS ✗") in contrasting colors
- Keyboard toggle (e.g., G key) for full-image blink comparison (150ms crossfade) as an alternative to the split

### The Reveal Animation
**What**: A hidden layer of information materializes over the primary view (e.g., a gradient map over an image).
**Why it works**: The "before" builds anticipation. The "after" is the aha moment. The transition between them is dramatic.
**Best for**: Showing underlying structure (sign maps, attention maps, gradient fields, feature activations).
**Key details**:
- Trigger: keyboard key (R for reveal) + visible button with shortcut hint
- Animation: primary view dims to 30-40% opacity (300ms), overlay fades in (500ms, slightly delayed)
- The overlay should be visually striking — this is often the "screenshot moment"
- Toggle back: same animation in reverse

### The Build-Up
**What**: Start with nothing and add elements one at a time (terms, data points, layers).
**Why it works**: Prevents overwhelm. Each addition is a small, digestible step.
**Best for**: Series, sums, constructive proofs, neural network layers.
**Key detail**: Have a clear "add one more" button AND a slider for jumping to any count.

### The Particle Drop
**What**: Drop a point/particle into a system and watch where it goes.
**Why it works**: Makes abstract vector fields, gradient landscapes, and flows tangible.
**Best for**: Vector fields, gradient descent, dynamical systems, probability flows.
**Key detail**: Leave trails so students can see the path. Allow multiple particles simultaneously.

### The Drag-to-Discover
**What**: Let the student drag a point and watch dependent quantities update in real time.
**Why it works**: Direct manipulation is the most intuitive interaction.
**Best for**: Function exploration, geometric constructions, constraint systems.
**Key detail**: Constrain the drag to valid regions. Show dependent values as large, updating numbers.

### The Orbitable Scene (3D)
**What**: A Three.js scene with orbit controls.
**Why it works**: Rotation is the killer feature of 3D. The ability to orbit transforms understanding.
**Best for**: Surfaces, manifolds, loss landscapes, decision boundaries.
**Key details**: Good default camera angle, `autoRotate` at 0.5 when idle, damping for smooth feel, always include "Reset View" button. Camera-angle-triggered captions ("from this angle, notice how...") add narrative to rotation.
**Implementation**: React Three Fiber + Drei helpers.

### The 3D Surface Explorer
**What**: A parametric or data-driven surface rendered as a mesh with interactive elements on it.
**Best for**: Loss landscapes, probability surfaces, potential fields, data manifolds.
**Key detail**: Use translucent material so objects behind are visible. Color-code by height. Add a ground plane grid. Use wireframe overlay for depth perception.

### The Animated Trajectory (3D)
**What**: A point moves along a path on a 3D surface, leaving a glowing trail.
**Best for**: Gradient descent on loss surfaces, adversarial perturbation paths, dynamical systems.
**Key detail**: Trail should glow and fade. Show current position as a bright sphere. Multiple comparison paths (different optimizers, different attacks) in different colors.

### The Shatter/Transform Label
**What**: A text label shatters into fragments and reassembles as new text with a new color.
**Why it works**: Communicates "something just broke/changed" viscerally. More memorable than a text swap.
**Best for**: Classification flips, phase transitions, threshold crossings.
**Key details**: 12 CSS clip-path polygon fragments, 300ms total. Use as a recurring motif — introduce it in the cold open, call back to it in later beats.

---

## Topic-Specific Patterns

### Calculus / Analysis

**Limit Explorer**: Drag-to-Discover + Slider Reveal. Point approaching a limit with zooming window.
**Derivative as Slope**: Tangent line following a dragged point, derivative "painted" below.
**Integral as Area**: Riemann sum rectangles with n slider (1-200). Sum converges as n grows.
**Taylor Series**: Build-Up. Polynomial "chases" the function term by term.
**Epsilon-Delta**: Slider Reveal. ε-band and δ-band with color-coded valid/invalid regions.

### Linear Algebra

**Matrix Transformation (3D)**: Orbitable Scene + Drag-to-Discover. 3D shape deforms as matrix entries change. Eigenvectors shown as persistent arrows.
**SVD Decomposition (3D)**: Orbitable Scene + Build-Up. Unit sphere → rotate → stretch → rotate, animated in 3D steps.
**Eigenvector Anatomy**: Comparison Split. Left: all vectors transform. Right: eigenvectors stay on their span.
**Span and Independence**: Drag-to-Discover. Draggable vectors with colored span region. Dependent vectors "snap" into existing span.

### Statistics / Probability

**Distribution Explorer**: Slider Reveal. PDF morphs with parameters. Key statistics update as numbers.
**Central Limit Theorem**: Build-Up + Particle Drop. Sample means accumulate into a histogram → bell curve.
**Bayes' Theorem**: Slider Reveal + Visual Encoding. Population grid filtered by evidence.
**Regression**: Drag-to-Discover. Draggable points, live regression line, visible residuals.
**Hypothesis Testing**: Slider Reveal + Comparison Split. Null distribution with rejection regions.

### Machine Learning

**Gradient Descent on 3D Loss Surface**: Orbitable Scene + Animated Trajectory + Comparison Split. Multiple optimizer paths (SGD, momentum, Adam) as colored trails on a 3D surface.
**Decision Boundary (3D)**: Orbitable Scene + 3D Slice View. Data points as glowing spheres, decision boundary as translucent surface, model toggle (linear → SVM → neural net).
**Adversarial Attacks**: Beat-Based Presentation + Reveal Animation + Comparison Split. Beat structure: clean input → slider perturbation → sign map reveal → attack comparison → defense toggle. Precomputed data for reliability.
**Neural Network Forward Pass**: Build-Up. Activations propagate layer by layer. Edges show weights.
**Bias-Variance Tradeoff**: Comparison Split + Build-Up. Training fit vs test performance as complexity grows.
**Dimensionality Reduction (3D)**: Orbitable Scene + Animated Trajectory. Point cloud animated from scattered → clustered projections.

---

## Color Palettes

### Dark Lecture (Default)
Best for projectors and lecture halls. Tested for WCAG AA contrast and common color vision deficiencies.
- Background: `#0f172a` (deep navy)
- Surface: `#1e293b` (slate)
- Primary safe: `#38bdf8` (sky blue) — correct, true, baseline
- Danger/adversarial: `#f472b6` (pink) — wrong, adversarial, out-of-bounds
- Success: `#34d399` (emerald) — flipped, confirmed, achieved
- Warm accent: `#fbbf24` (amber) — positive direction, highlighted
- Cool accent: `#22d3ee` (cyan) — negative direction, complementary
- Text primary: `#f1f5f9` (near white)
- Text muted: `#94a3b8` (slate gray)
- Dormant/grid: `#131c2e` / `#334155`

Pair amber + cyan for dichromatic-safe binary encoding (e.g., +1/-1 directions). Pair sky blue + pink for safe/danger semantics.

### Light Academic
For printed handouts or bright rooms.
- Background: `#fafaf9`, Primary: `#2563eb`, Secondary: `#dc2626`, Accent: `#16a34a`, Text: `#1c1917`

### Vibrant Math
For engaging younger audiences.
- Background: `#18181b`, Primary: `#a78bfa`, Secondary: `#fb923c`, Accent: `#22d3ee`, Text: `#fafafa`

---

## Typography

### For Modern/Bold (Recommended)
- **Display/hero labels**: Syne Bold 44-52px — striking, geometric
- **Numbers/readouts**: JetBrains Mono 18-28px — monospace for alignment, technical feel
- **Body/microcopy**: DM Sans 11-18px — clean, readable, neutral
- Load via `@fontsource` packages (self-hosted, no CDN dependency)

### For Lecture Slides
- Title: Space Mono or JetBrains Mono 32-48px
- Labels: DM Sans or Outfit 16-20px
- Values: JetBrains Mono 20-28px

### For Elegant/Academic
- Title: Playfair Display or Libre Baskerville 28-36px
- Labels: Source Sans 3 14-18px
- Values: IBM Plex Mono 18-24px

**Minimum projector-legible size for any critical number: 20px.**

---

## 3D Scene Defaults

When building 3D visualizations with Three.js / React Three Fiber:

### Lighting
- Hemisphere light: sky `#38bdf8`, ground `#0f172a`, intensity 0.6
- Directional light: white, intensity 0.8, position `(5, 10, 5)`, castShadow
- Optional: point light at camera position, intensity 0.3

### Materials
- Surfaces: `MeshPhysicalMaterial`, `roughness: 0.4`, `metalness: 0.1`, `transparent: true`, `opacity: 0.7`, `side: DoubleSide`
- Data points: `MeshPhysicalMaterial` with `emissive` at 0.3 intensity + `<Bloom>` post-processing
- Wireframes: `MeshBasicMaterial` with `wireframe: true`, `opacity: 0.15` overlay for depth cues
- Trails/paths: `Line2` with `LineMaterial`, `linewidth: 3`, gradient opacity

### Camera & Controls
- Default: `PerspectiveCamera`, fov 50, position `(3, 3, 3)`, lookAt `(0, 0, 0)`
- OrbitControls: `enableDamping: true`, `dampingFactor: 0.05`, `autoRotate: true`, `autoRotateSpeed: 0.5`
- Min distance: 2, max distance: 20
- Always include "Reset View" button with smooth 500ms camera lerp

### Post-Processing
- `<EffectComposer>` with `<Bloom luminanceThreshold={0.6} intensity={0.5} />`
- `<SMAA />` for anti-aliasing (not FXAA — cleaner mesh edges)
- Use sparingly — bloom on data points and trails, not on everything

### Performance
- `InstancedMesh` for >50 identical objects
- `BufferGeometry` with typed arrays for custom surfaces
- 100×100 vertex grid is usually sufficient for surfaces
- Target 60fps — profile with `<Stats />` from Drei
- Lazy-load R3F and Three.js — don't include in main bundle

---

## Design Principles Checklist

Before finalizing any visualization concept, verify:

- [ ] **Story, not dashboard**: Is there a narrative arc (hook → explore → reveal → implication)?
- [ ] **One signature moment**: Can you describe the screenshot in one sentence?
- [ ] **Mathematically honest**: Does every visual element teach the correct mental model?
- [ ] **Minimal controls**: Can a professor use it with a wireless clicker (←→ + number keys)?
- [ ] **Precomputed core**: Could the main demo run from a static JSON file with zero network/GPU?
- [ ] **Back-row legible**: Is every critical number ≥20px? Is the signature visual readable at 15m on a 1080p projector?
- [ ] **High-contrast fallback**: Is there a projector mode that drops glow effects and increases contrast?
- [ ] **Honest about limitations**: Does the visualization clearly label what it's showing vs. hiding (e.g., "782 other dimensions not shown")?
