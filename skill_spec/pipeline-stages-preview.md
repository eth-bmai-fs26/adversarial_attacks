# Pipeline Stages — Reference

Phase 1 (multi-agent discussion) is handled by `orchestrate.sh`. This document covers Phases 2 and 3.

---

## Phase 2: Specification Document

**Input**: The `converged-concept.md` file produced by the discussion orchestrator.
**Output**: A detailed specification document saved to `/mnt/user-data/outputs/viz-spec-[topic].md`.

### What to do

Read the converged concept and expand it into a complete, implementation-ready specification. The concept gives you the "what" and "why" — the spec adds the precise "how." Every number, color, layout dimension, and animation timing should be nailed down so the implementation phase has zero ambiguity.

### Specification Template

Use this structure for the spec document:

```markdown
# [Visualization Title] — Specification

## Overview
One paragraph: what this is, who it is for, what insight it delivers.

## Pedagogical Goals
- Primary goal: [the "aha" moment from the converged concept]
- Secondary goals: [additional understanding]
- Misconception addressed: [from the converged concept]

## Mathematical Model
- Core equations (use Unicode math symbols: ×, ÷, √, π, Σ, ∫, ∂, ∇, θ, α, β, λ)
- Input parameters with valid ranges and defaults
- Computed outputs with formulas
- Edge cases and how to handle each one
- Numerical precision: what data types, what thresholds for degenerate cases

## Narrative Arc (Beat Structure)

Structure the visualization as a sequence of beats:

### Beat 0 — The Hook (5-10s, non-interactive)
What dramatic visual or fact creates initial shock or curiosity?
- Exact timed sequence (t=0s, t=1.5s, t=3s, ...)
- Use JS setTimeout — NOT CSS animation-delay chains (must be skippable/resettable)
- "Skip intro" link for professors who've seen it

### Beat 1 — The Exploration (30-60s, one primary interaction)
The main interactive beat. One slider, one drag, one build-up.
- What is the primary control? What range? What default?
- What changes as the control moves?
- Where is the dramatic moment (threshold, flip, convergence)?

### Beat 2 — The Reveal (20-30s)
Show the hidden structure underneath.
- What overlay/visualization materializes?
- What is the trigger (keyboard key + button)?
- Animation timing: dim → reveal → stabilize

### Beat 3 — The Comparison (20-30s)
Method A vs Method B, or baseline vs modified.
- Split view with draggable divider? Full-image toggle?
- Status badges showing which method succeeds/fails
- What insight does the comparison teach?

### Beat 4 — The Implication (20-30s)
Toggle showing the consequence or defense.
- What changes between the two states?
- What does the professor say?
- How does this set up the next lecture topic?

### Post-Lecture Modes
- Gallery/browser for exploring variations
- Lab mode for student-driven exploration (live computation)

## Layout & Composition

Describe the spatial layout precisely:
- Overall structure
- Visual hierarchy — what the eye sees first, second, third
- Minimum useful viewport size

Recommended layout patterns:
- **Beat-Based + Bottom Slider**: Full-screen beats with a persistent control bar at the bottom. The slider carries state across beats. Beat dots in the header.
- **3D Scene + Sidebar**: Three.js canvas 65-70%, controls + info panels 30-35%
- **3D Scene + Overlay**: Full-viewport 3D with semi-transparent controls in a corner
- **3D Scene + 2D Panel**: 3D left, synchronized 2D right
- **Canvas + Bottom Bar**: Full-width viz, control strip below (64px)
- **Split View**: Two panels 50/50 for comparison modes

## 3D Scene Specification (if applicable)

If the visualization uses Three.js / React Three Fiber:
- Camera: type, fov, default position, lookAt target
- Orbit controls: auto-rotate speed, min/max distance, damping
- Lighting: types, positions, colors, intensities, shadows
- Ground plane: grid style, size, position
- Post-processing: bloom threshold/intensity, anti-aliasing (SMAA, not FXAA)
- Key 3D objects: geometry, material properties, emissive values
- Camera-angle-triggered captions: what text appears at what viewing angle

## Components

List every UI element with full detail:

| Component | Type | Position | Size/Proportion | Behavior |
|-----------|------|----------|-----------------|----------|
| ... | ... | ... | ... | ... |

## Controls

For each control, specify ALL of:
- Type: slider / toggle / dropdown / drag-handle / button / number-input / keyboard-key
- Label text (descriptive)
- Range or options
- Default value
- Step size
- What it affects
- Whether change triggers animation or is instant
- Magnetic snap zones (if applicable)

## Keyboard Shortcuts

| Key | Context | Action |
|-----|---------|--------|
| ←/→ | Global | Navigate beats |
| 1-4 | Global | Jump to specific beat |
| Escape | Global | Reset to Beat 0 / close overlay |
| Space/Enter | Beat 0 | Advance from cold open |
| R | Reveal beat | Toggle overlay |
| G | Comparison beat | Toggle blink comparison |

## Animations
- What animates, what triggers it, duration in ms, easing function
- Whether continuous or triggered
- Label shatter spec (if used): fragment count, duration, trigger condition
- Transition between beats: duration, style (crossfade, slide)

## Visual Design

### Color Palette
Exact hex values. Default to Dark Lecture palette:
- Background: #0f172a
- Primary safe: #38bdf8 (sky blue)
- Danger: #f472b6 (pink)
- Success: #34d399 (emerald)
- Warm accent: #fbbf24 (amber)
- Cool accent: #22d3ee (cyan)
- Text primary: #f1f5f9
- Text muted: #94a3b8

### Typography
- Display: font, weight, size (minimum 44px)
- Numbers: font, size (minimum 20px, monospace)
- Body: font, size (minimum 14px)
- Self-hosted via @fontsource (no CDN dependency)

### Visual Effects
- Glow/shadow specifications with exact CSS or Three.js values
- High-contrast projector mode: what changes (wider gaps, no glow, solid blocks)
- Canvas rendering at 2× for Retina

## Responsive Breakpoints
Three tiers:
- Default (≥1440px): full design
- Compact (768-1439px): reduced sizes, fonts ×0.8
- Mobile (<768px): stacked layout, touch-friendly controls

## Data Schema (for precomputed visualizations)
Exact JSON structure with field names, types, and sizes.
Per-item fields, array dimensions, total size budget.

## Precomputation Pipeline (if applicable)
- What model/algorithm generates the data
- What quantities to store per item
- How many items (images, data points, etc.)
- Output file paths and size targets
- Numerical precision requirements

## Scope Boundaries
What is explicitly NOT included. This prevents scope creep.

## Unresolved Tensions
Remaining tradeoffs the implementer should be aware of.
Risks that need prototyping to resolve.

## Demo Script
A step-by-step 2-3 minute walkthrough:
1. "Here we see..." — starting state
2. "Now watch what happens when I..." — first interaction
3. "Notice how..." — the key insight
4. "And look at this..." — the reveal/comparison
5. "What does this mean?" — the implication
```

### Key Principles

- **Be exact about numbers**: "slider for ε, range [0, 0.35], default 0, step 0.005, coarse step 0.05" not "a slider for ε"
- **Be exact about positions**: "full-width bottom bar, 64px tall, 32px padding each side" not "at the bottom"
- **Name colors by hex**: "`#38bdf8` (sky blue), 2px stroke" not "a blue line"
- **Describe animations**: "300ms ease-out on release, 500ms fade-in with 100ms delay" not "it animates"
- **Anticipate edge cases**: what happens at min/max, at the threshold, when data is missing
- **Specify keyboard shortcuts**: every interactive action should have a keyboard binding for wireless clickers

---

## Phase 3: Implementation

**Input**: The specification document from Phase 2.
**Output**: A working application — either a multi-file React project or a single `.jsx`/`.html` file.

### Architecture Decision

For complex visualizations (3+ beats, multiple components, precomputed data):

**Multi-file React project** with tiered issue decomposition:
```
Tier 0 (parallel, no deps):
  - Precomputation pipeline (Python)
  - Project scaffold (React + Vite + Tailwind + fonts + types)

Tier 1 (parallel, after scaffold):
  - Each reusable component as a separate issue
  - Each component buildable with mock data (no data pipeline dependency)

Tier 2 (parallel, after Tier 1 + data):
  - Each beat/view composes Tier 1 components
  - Each beat is a separate issue with explicit component dependencies
  - Independent tracks (Lab Mode, 3D Mode) can start as soon as their deps are ready

Tier 3 (after all):
  - Integration, responsive audit, accessibility, performance optimization
```

Each issue gets a detailed prompt in `issue-prompts/XX-name.md` containing:
- Goal (one sentence)
- Dependencies (which issues must complete first)
- Context (why this component exists in the narrative)
- Exact visual spec (sizes, colors, timings)
- Interface (props, events, state)
- Mock data for standalone development
- File paths for deliverables
- Verification checklist

A `CLAUDE.md` file provides shared context for all agents: architecture overview, design tokens, data schema, conventions, dependency graph, and "what NOT to do" guardrails.

For simpler visualizations (single concept, few controls):

**Single-file React (.jsx)** or **HTML (.html)** — all styles inline, no build step.

### Framework Decision

- **React + Vite + Tailwind (multi-file)**: Complex visualizations with beats, precomputed data, multiple views. This is the default for production-quality lecture tools.
- **React + React Three Fiber (.jsx)**: 3D-primary concepts — surfaces, manifolds, loss landscapes. Use `@react-three/fiber` + `@react-three/drei` + `@react-three/postprocessing`.
- **React (.jsx)**: 2D-only concepts with multiple controls and complex state.
- **HTML (.html)**: Single-canvas demos with minimal controls.

### Code Quality Requirements

**For multi-file projects:**
- TypeScript for all source files
- React hooks for state (useState, useEffect, useMemo, useCallback)
- Custom hooks for shared logic (e.g., `useImageState` for derived computations)
- `React.memo` with identity checks on array props for canvas components
- Lazy-load heavy dependencies: `const LabMode = lazy(() => import('./LabMode'))`
- Error boundaries around each major section
- All design tokens from CLAUDE.md — never hardcode a color or font that's in the token system

**For single-file projects:**
- All styles inline or in a style block
- Memoize expensive math with useMemo
- requestAnimationFrame for continuous animations
- Default export, no required props

### Canvas Rendering Conventions

- **Always render at 2× for Retina**: `canvas.width = cssSize * 2`, CSS `width = cssSize`
- **Nearest-neighbor upscaling** for pixel-art-like data (MNIST, heatmaps): crisp blocks, no blur. Use `image-rendering: pixelated` or render each pixel as a filled rectangle at full resolution.
- **Color mapping**: don't use pure black (`#000000`) as minimum — use the background color (e.g., `#0f172a`) so the visualization blends with the theme
- **Performance target**: <2ms per canvas redraw during slider drag. 784 pixels of math is trivial. Profile to verify.

### 3D Implementation Requirements

- `<Canvas>` from `@react-three/fiber` as the 3D container
- `<OrbitControls>` from Drei with `enableDamping`, `autoRotate`, constrained zoom
- Always include "Reset View" button with smooth camera lerp
- `<Grid>` or `GridHelper` for spatial reference
- `MeshPhysicalMaterial` for surfaces (transparency, roughness, emissive)
- `InstancedMesh` for >50 identical objects
- `BufferGeometry` with typed arrays for custom surfaces
- `<EffectComposer>` with `<Bloom>` for emissive glow + `<SMAA>` for anti-aliasing
- `useFrame` for per-frame animations (not `requestAnimationFrame`)
- Lazy-load: do NOT import R3F or Three.js at the top level
- Target 60fps on a 100×100 mesh

### Responsive Requirements

Every component must work at three breakpoints:
- **Default** (≥1440px): Full design — largest images, all visual details
- **Compact** (768-1439px): Reduced sizes, fonts ×0.8, stacked bars. This is the **most common lecture laptop resolution** (1366×768).
- **Mobile** (<768px): Full-width stacked layout, touch-friendly controls (larger touch targets), swipe for navigation

### Accessibility Requirements

- `aria-label` on all interactive elements
- `role="slider"` with `aria-valuemin`/`aria-valuemax`/`aria-valuenow` for sliders
- Visible focus rings (2px primary color outline)
- Focus trapped in overlays
- WCAG AA contrast (4.5:1) for all text
- `prefers-reduced-motion`: disable all animations, use instant state changes
- Color vision deficiency safe: test amber/cyan pair, blue/pink pair under deuteranopia simulation

### Lecture-Friendly Requirements

- Dark mode default (designed for projectors)
- Text large enough to read from 10-15 meters (minimum 20px for critical numbers)
- **High-contrast projector mode**: toggle that drops glow effects, increases gaps/borders, uses solid blocks. This is essential — glow effects that look beautiful on a Retina laptop collapse into colored mud on a 1080p projector at 15m.
- Keyboard-first: every action accessible via keyboard (professors use wireless clickers that send arrow keys)
- Self-hosted fonts via `@fontsource` (lecture halls often have flaky WiFi)
- Step-forward / step-back mode for guided demos

### Precomputation Pipeline Requirements (when applicable)

- Python + PyTorch (or TensorFlow) for model-based precomputation
- Output: JSON files in `public/data/`, loaded by the frontend via `fetch()`
- Round floats to 4 decimal places to reduce size
- Size budget: <1MB gzipped for core data, <5MB for extended data (3D surfaces)
- Store gradients, logits, and derived quantities at discrete parameter steps (e.g., 100 ε values)
- The frontend interpolates between grid points for smooth slider interaction
- Handle edge cases in precomputation: sign(0), clipping asymmetry, numerical precision
- Print a verification summary after generation (accuracy, size, ranges, statistics)

### Pre-Delivery Checklist

Before presenting to the user, verify:

**Core functionality:**
- [ ] Renders without errors in Chrome, Firefox, Safari
- [ ] All controls work and visibly affect the visualization
- [ ] The "aha moment" comes through in the interaction
- [ ] Math is correct (formulas match the spec)
- [ ] Edge cases handled (min/max, zero, empty, missing data)
- [ ] Animations run smoothly at 60fps
- [ ] Error boundaries catch crashes without killing the app

**Visual quality:**
- [ ] Color palette matches the spec exactly
- [ ] Labels readable at distance (large, high contrast)
- [ ] Canvas renders at 2× for Retina sharpness
- [ ] The signature visual is genuinely striking

**Lecture readiness:**
- [ ] Keyboard shortcuts all work without conflicts
- [ ] High-contrast projector mode toggle exists and works
- [ ] Fonts load without FOUT (self-hosted, not CDN)
- [ ] Core demo runs with zero network requests after initial load
- [ ] Production build is <200KB gzipped for the main chunk

**3D-specific (if applicable):**
- [ ] Orbit controls work with smooth damping
- [ ] Auto-rotate when idle
- [ ] "Reset View" returns camera smoothly
- [ ] Lighting reveals surface structure
- [ ] Bloom on key elements only (not everything)
- [ ] Scene looks good from multiple angles
- [ ] 60fps on a 100×100 mesh
- [ ] R3F and Three.js are lazy-loaded

**Responsive:**
- [ ] Works at 1366×768 (most common lecture laptop)
- [ ] Works at 375px width (mobile)
- [ ] Touch interactions work (drag, swipe)

**Accessibility:**
- [ ] Focus rings visible on all interactive elements
- [ ] `prefers-reduced-motion` respected
- [ ] Color-safe under deuteranopia simulation
