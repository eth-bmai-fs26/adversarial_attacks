# Pipeline Stages — Reference

Phase 1 (multi-agent discussion) is handled by `scripts/orchestrate.sh`. This document covers Phases 2 and 3.

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

## Layout & Composition

Describe the spatial layout precisely:
- Overall structure (e.g., "Canvas occupies left 65%, control panel right 35%")
- Visual hierarchy — what the eye sees first, second, third
- Minimum useful viewport size
- Padding, margins, gaps between sections

Recommended layout patterns:
- **3D Scene + Sidebar**: Three.js canvas 65-70%, controls + info panels 30-35% on right. The 3D scene is the hero — it should dominate the viewport.
- **3D Scene + Overlay**: Full-viewport 3D scene with semi-transparent control overlay in a corner. Best for immersive demos.
- **3D Scene + 2D Panel**: 3D scene on left, synchronized 2D projection/cross-section on right. Bridges 3D and 2D understanding.
- **Canvas + Sidebar**: Main 2D viz 65-70%, controls 30-35% on right (for 2D-only concepts)
- **Canvas + Bottom Bar**: Full-width viz, control strip below (64px height)
- **Split View**: Two panels 50/50 for comparison modes
- **Stacked**: Viz on top, data/info below (good for mobile)

## 3D Scene Specification (if applicable)

If the visualization uses Three.js / React Three Fiber, specify:
- **Camera**: type (perspective/orthographic), fov, default position, lookAt target
- **Orbit controls**: enabled, auto-rotate speed, min/max distance, damping
- **Lighting**: types, positions, colors, intensities, shadows
- **Ground plane**: grid style, size, position
- **Post-processing**: bloom, anti-aliasing, ambient occlusion
- **Key 3D objects**: geometry type, material properties, emissive values
- **Reset view**: default camera position for the "Reset View" button

## Components

List every UI element with full detail:

| Component | Type | Position | Size/Proportion | Behavior |
|-----------|------|----------|-----------------|----------|
| ... | ... | ... | ... | ... |

## Controls

For each control, specify ALL of:
- Type: slider / toggle / dropdown / drag-handle / button / number-input
- Label text (descriptive, e.g., "Number of rectangles (n)" not just "n")
- Range or options
- Default value
- Step size (for sliders)
- What it affects (be specific about which visual element changes)
- Whether change triggers animation or is instant

## Animations
- What animates and what triggers it (slider change, button press, page load)
- Duration in ms and easing function (e.g., "300ms ease-out")
- Whether continuous or triggered
- Frame rate considerations for heavy computations

## Visual Design

### Color Palette
Specify exact hex values. Default to the Dark Lecture palette unless the concept calls for something else:
- Background: #0f172a
- Surface/panels: #1e293b
- Primary accent: #38bdf8
- Secondary accent: #f472b6
- Tertiary accent: #34d399
- Warning/highlight: #fbbf24
- Text primary: #f1f5f9
- Text muted: #94a3b8
- Grid/axes: #334155

### Typography
- Title: font family, weight, size (minimum 32px)
- Axis labels: font family, size (minimum 16px)
- Value displays: font family, size (minimum 20px, monospace recommended)
- Control labels: font family, size (minimum 14px)
- Load fonts via @import from Google Fonts

### Visual Effects
- Grid lines: style, opacity, spacing
- Gradients, glows, or shadows
- Hover states for interactive elements
- Active/drag states

## Demo Script
A step-by-step 2-minute walkthrough:
1. "Here we see..." — describe starting state and what is visible
2. "Now watch what happens when I..." — first interaction
3. "Notice how..." — point out the key insight
4. "And if we push it further..." — edge case or advanced view

## Technical Notes
- Recommended framework: React Three Fiber (.jsx) for 3D concepts, React (.jsx) for 2D, HTML for simpler demos
- Key libraries: `@react-three/fiber`, `@react-three/drei`, `@react-three/postprocessing` for 3D; d3, recharts, plotly for 2D; mathjs for computation
- 3D: camera setup, orbit control constraints, lighting rig, post-processing pipeline
- Performance: estimated vertex/object count, instancing strategy, target frame rate
- State management approach
```

### Key Principles

- **Be exact about numbers**: "slider for n, range 1–200, default 10, step 1" not "a slider for n"
- **Be exact about positions**: "left 65% of viewport, 24px padding" not "on the left"
- **Name colors by hex**: "#38bdf8 (sky blue), 2px stroke" not "a blue line"
- **Describe animations**: "300ms ease-out on slider change" not "it animates"
- **Anticipate edge cases**: what happens at min/max values, zero, negative

---

## Phase 3: Implementation

**Input**: The specification document from Phase 2.
**Output**: A working `.jsx` or `.html` file saved to `/mnt/user-data/outputs/[topic]-viz.jsx` (or `.html`).

### Framework Decision

- **React + React Three Fiber (.jsx)** when: the concept is inherently spatial — surfaces, manifolds, loss landscapes, 3D transformations, vector fields, decision boundaries in feature space, data point clouds. **This should be the default for most ML and linear algebra visualizations.** Use `@react-three/fiber` for the 3D scene and `@react-three/drei` for helpers (OrbitControls, Grid, Text, etc.). Use `@react-three/postprocessing` for visual effects (bloom, SMAA).
- **React (.jsx)** when: 2D-only concepts with multiple interactive controls, complex state, real-time computation, recharts/d3 integration needed.
- **HTML (.html)** when: single canvas animation, minimal controls, CSS-only animation, simpler interaction model.

**Default to 3D (React Three Fiber) unless the concept is fundamentally 1D/2D** (function plots, distributions, histograms). When in doubt, use 3D — it always looks more impressive and can include a 2D panel as a secondary view.

### Code Quality Requirements

- Single file — all styles inline or in a style block, no separate CSS
- React hooks for state (useState, useEffect, useMemo, useCallback)
- Memoize expensive math with useMemo
- requestAnimationFrame for continuous animations (never setInterval)
- Default export, no required props
- All values from the spec (colors, sizes, ranges) hardcoded exactly as specified

### 3D Implementation Requirements (when using React Three Fiber)

- Use `<Canvas>` from `@react-three/fiber` as the main 3D container
- Use `<OrbitControls>` from `@react-three/drei` with `enableDamping`, `autoRotate` (slow), and constrained zoom range
- Always include a "Reset View" button that smoothly returns the camera to its default position
- Use `<Grid>` or `GridHelper` for spatial reference on the ground plane
- Use `MeshPhysicalMaterial` for surfaces (supports transparency, roughness, emissive glow)
- Use `InstancedMesh` for repeated objects (data points) — never create >50 individual mesh components
- Use `BufferGeometry` with typed arrays for custom surfaces
- Add `<EffectComposer>` with `<Bloom>` for emissive glow on key elements (data points, trails, highlighted objects)
- Add `<SMAA>` for anti-aliasing
- Use `useFrame` hook for per-frame animations (camera lerp, object movement), not `requestAnimationFrame`
- Set `<Canvas shadows camera={{ fov: 50, position: [3, 3, 3] }}>` as defaults
- Lighting: hemisphere light (sky + ground) + one directional light with shadows
- Responsive: use `style={{ width: '100%', height: '100%' }}` on the Canvas and let the parent div control sizing
- Text in 3D scenes: use `<Text>` from Drei (SDF text rendering) or `<Html>` for DOM overlays
- Performance: target 60fps, use `<Stats>` from Drei during development, remove in production

### Math Rendering

- Simple labels: Unicode symbols (×, ÷, √, π, Σ, ∫, ∂, ∇, θ, α, β, λ, ε, δ)
- Subscripts/superscripts: SVG text with tspan, or HTML sup/sub tags
- No heavy LaTeX renderers unless the spec explicitly requires them

### Visual Execution

- Follow the spec's color palette exactly (copy hex values)
- Load fonts from Google Fonts via @import
- CSS transitions for smooth state changes
- Subtle grid lines at low opacity for mathematical plots
- Large readable labels (minimum 16px labels, 24px+ titles)
- All sliders show their current value prominently next to them

### Interactivity

- Use pointer events (not mouse events) for drag interactions
- Visual feedback on hover/active (subtle glow, color shift, cursor change)
- Include a "Reset" button to return to defaults
- Constrain draggable points to valid mathematical regions
- Debounce expensive recomputations if needed (but prefer keeping it real-time)

### Lecture-Friendly Features

- Dark mode default (designed for projectors)
- Text large enough to read from 10 meters
- Consider step-forward / step-back mode for guided demos
- Bold, updating value displays help the back row follow
- Descriptive control labels: "Number of rectangles (n)" not "n"

### Pre-Delivery Checklist

Before presenting to the user, verify:
- [ ] Renders without errors
- [ ] All controls work and visibly affect the visualization
- [ ] Labels are readable at distance (large, high contrast)
- [ ] The "aha moment" from the spec comes through in the interaction
- [ ] Math is correct (double-check formulas against the spec)
- [ ] Edge cases handled (n=0, n=1, division by zero, empty states)
- [ ] Animations run smoothly
- [ ] Reset button works
- [ ] Color palette matches the spec

**Additional checks for 3D visualizations:**
- [ ] Orbit controls work (rotate, zoom, pan) with smooth damping
- [ ] Auto-rotate is on when idle (subtle, slow)
- [ ] "Reset View" button returns camera to default angle smoothly
- [ ] Lighting reveals surface structure (not flat-looking)
- [ ] Emissive glow / bloom on key elements (data points, trails)
- [ ] Ground plane grid is visible for spatial reference
- [ ] Scene looks good from multiple camera angles (not just the default)
- [ ] Performance is 60fps (check with Stats component)
- [ ] Transparent surfaces are visible from both sides (`side: DoubleSide`)
