# Issue 17: 3D Advanced Mode — Compare Attacks

## Goal

Build an optional 3D visualization showing a cross-section of the loss/margin landscape with three attack paths (FGSM, PGD, C&W) animated on top. Uses React Three Fiber. The student can orbit the 3D surface and see how different attacks navigate toward the decision boundary. Hidden behind an "Advanced" button — not part of the core lecture flow.

## Dependencies

- **Issue 2** (Precomputed Data): `3d_surface_data.json` with 80×80 margin surface + attack paths
- **Issue 3** (Project Scaffold): Design tokens

## Context

The 3D mode earns its existence because orbiting reveals surface topology that a 2D projection hides. From one angle, FGSM's straight-line path looks fine. Orbit 90 degrees and the overshoot is obvious — C&W's curved path finds the actual minimum while FGSM blasts past it. The professor (or curious student) sees this by rotating the view.

This is explicitly NOT part of the core demo. It's behind an "Advanced: Compare Attacks" button accessible from Beat 3 or the gallery. It loads additional data (the 3D surface JSON) only when activated.

## Deliverables

### 1. AdvancedMode3D Component (`src/beats/AdvancedMode3D.tsx`)

```tsx
interface AdvancedMode3DProps {
  imageId: number;
  isOpen: boolean;
  onClose: () => void;
}
```

### 2. Trigger

An "Advanced: Compare Attacks" button, accessible from Beat 3:
- DM Sans 14px, muted text, with a small 3D cube icon
- Position: below the main beat content
- Clicking opens the 3D mode as an overlay

### 3. Overlay Layout

```
┌─────────────────────────────────────────────────┐
│  [✕ Close]       Advanced: Compare Attacks      │
│                                                 │
│  ┌─────────────────────────────────────────┐    │
│  │                                         │    │
│  │          3D Surface                     │    │
│  │          (600×400)                      │    │
│  │          Orbit controls                 │    │
│  │                                         │    │
│  │     ── FGSM (straight, amber)           │    │
│  │     ── PGD (stepped, cyan)              │    │
│  │     ── C&W (curved, pink)               │    │
│  │                                         │    │
│  └─────────────────────────────────────────┘    │
│                                                 │
│  "Cross-section through FGSM direction —        │
│   782 other directions not shown"               │
│                                                 │
│  [Play paths]  [Reset camera]                   │
└─────────────────────────────────────────────────┘
```

The overlay is 700×550px (or viewport-capped), centered, with a semi-transparent `#0f172a` backdrop at 90% opacity.

### 4. 3D Surface Mesh

**Data:** Load from `public/data/3d_surface_data.json` (lazy-loaded when the overlay opens).

**Mesh construction:**
- 80×80 grid of vertices
- Grid range: α ∈ [-0.4, 0.4], β ∈ [-0.4, 0.4]
- X axis: α (FGSM direction), Z axis: β (orthogonal gradient direction)
- Y axis: margin value (height)
- Each vertex: `(α, margin(α, β), β)`

**Material:**
- `MeshStandardMaterial` with vertex colors
- Color by margin value:
  - Positive margin (correct class): sky blue `#38bdf8` gradient (darker at high margin, brighter near zero)
  - Negative margin (flipped): pink `#f472b6` gradient
  - At margin = 0: white `#ffffff`
- Opacity: 0.85 (slightly transparent to see paths behind the surface)
- Side: `THREE.DoubleSide` (visible from below too)
- Wireframe: subtle wireframe overlay at 10% opacity for depth perception

**Decision boundary contour:**
- A line at height y = 0 (margin = 0), following the contour from precomputed data
- `TubeGeometry` or `Line` with white color, 2px apparent width
- Slight emissive glow

### 5. Attack Path Animations

Three animated paths on the surface:

**FGSM path (straight line):**
- Color: amber `#fbbf24`
- Start: origin (clean image point)
- End: (ε*, 0, margin at ε*) — a straight line along the α axis
- Geometry: `TubeGeometry` with radius 0.008
- Animation: a glowing sphere (radius 0.015) travels along the path over 1.5s

**PGD path (stepped):**
- Color: cyan `#22d3ee`
- Points: 20 steps from precomputed data, each (α_k, margin_k, β_k)
- Geometry: `TubeGeometry` through all points, radius 0.006
- The stepped nature should be visible (sharp turns at each iteration)
- Animation: sphere travels along the path over 3s, pausing briefly at each step

**C&W path (curved):**
- Color: pink `#f472b6`
- Points: 50 optimization steps from precomputed data
- Geometry: smooth `CatmullRomCurve3` through points, then `TubeGeometry` radius 0.006
- Animation: sphere travels smoothly over 4s

**Path animation controls:**
- "Play paths" button: starts all three animations simultaneously
- Each path draws progressively (like a snake) — the tube extends from start to the sphere's current position
- At the end, all three paths are fully visible for comparison

### 6. Camera & Controls

**Initial camera position:** `[3, 2.5, 3.5]` (looking down at the surface from a 45° angle)

**OrbitControls:**
- Auto-rotate: speed 0.4 (slow ambient rotation when not interacting)
- Auto-rotate pauses on user interaction, resumes after 3s of inactivity
- Damping: enabled, factor 0.1
- Min distance: 1.5, max distance: 8
- Min polar angle: 10° (prevent going exactly top-down)
- Max polar angle: 85° (prevent going exactly side-on — surface becomes invisible)

**"Reset camera" button:** Animates camera back to initial position over 500ms.

**Camera-angle-triggered captions:**
When the camera reaches certain angles, show contextual captions:
- Front view (looking along α axis): `"FGSM takes the shortest path — but overshoots the optimal point"`
- Side view (looking along β axis): `"C&W finds the true minimum in the margin valley"`
- Top view: `"The decision boundary (white line) — cross it and the classification flips"`

Implementation: check camera spherical coordinates on each frame, show/hide captions based on angle ranges.

### 7. Lighting

- Ambient light: intensity 0.4, white
- Directional light: position `[5, 10, 5]`, intensity 0.8, white
- A subtle hemisphere light: sky `#38bdf8` at 0.2, ground `#f472b6` at 0.1 (matches the color theme)

### 8. Post-processing

Minimal post-processing for visual quality:
- SMAA anti-aliasing (not FXAA — cleaner edges on the mesh)
- Subtle bloom on the attack path spheres (threshold 0.8, strength 0.3, radius 0.4)
- Do NOT add heavy bloom — the surface should be clearly readable

### 9. Legend

A small legend in the bottom-left corner of the 3D viewport:
```
── FGSM (1 step)     [amber line]
── PGD (20 steps)    [cyan line]
── C&W (optimized)   [pink line]
── Decision boundary [white line]
```
Font: DM Sans 12px, semi-transparent background `#0f172a` at 80%.

### 10. Disclaimer

Below the 3D viewport:
```
"Cross-section through FGSM direction — 782 other directions not shown"
```
DM Sans 14px, muted. This is mathematically honest — the surface is a 2D slice of a 784-dimensional space.

### 11. Degenerate Path Handling

If `pgd_path_visible` or `cw_path_visible` is false in the precomputed data:
- Hide the degenerate path
- Show a note: `"PGD path not visible in this cross-section"` in DM Sans 12px, muted
- This can happen because PGD's later steps move in directions orthogonal to the displayed subspace

### 12. npm Dependencies

```bash
npm install @react-three/fiber @react-three/drei @react-three/postprocessing three
npm install -D @types/three
```

React Three Fiber and Three.js should be lazy-loaded (dynamic import) only when the Advanced mode is opened:
```tsx
const Scene = lazy(() => import('./AdvancedMode3DScene'));
```

### 13. Responsive Behavior

- **Default** (≥1440px): 600×400 viewport in centered overlay
- **Compact** (768-1439px): 500×350 viewport
- **Mobile** (<768px): Full-screen overlay, viewport fills available space. Touch orbit controls enabled.

## File Structure

```
src/
└── beats/
    ├── AdvancedMode3D.tsx        (overlay wrapper, data loading)
    └── AdvancedMode3DScene.tsx   (R3F Canvas, surface, paths, controls)
```

## Verification

- "Advanced: Compare Attacks" button opens a 3D overlay
- The margin surface renders as a colored mesh (blue = correct, pink = flipped, white = boundary)
- Orbit controls: drag to rotate, scroll to zoom, the surface is explorable
- "Play paths": three attack paths animate simultaneously
  - FGSM: straight amber line
  - PGD: stepped cyan line with visible direction changes
  - C&W: smooth curved pink line finding the minimum
- Camera auto-rotates slowly when not interacting
- Camera-angle captions appear at appropriate viewing angles
- Decision boundary contour is visible as a white line on the surface
- Legend shows in the bottom-left corner
- "Close" button exits the overlay
- Disclaimer about 782 hidden dimensions is displayed
- Degenerate paths handled gracefully (hidden with explanation)
- R3F and Three.js are lazy-loaded (not in main bundle)
- Performance: 60fps orbit on the 80×80 mesh
- Responsive at all breakpoints
- No console errors
