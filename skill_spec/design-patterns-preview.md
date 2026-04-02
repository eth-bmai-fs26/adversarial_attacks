# Math Visualization Design Patterns

A library of proven patterns for interactive math visualizations, organized by topic. Use these as starting points and inspiration — don't copy them rigidly, but understand why they work and adapt them to the specific concept.

## Visual Ambition — Default to Wow

**Every visualization should aim to be visually stunning and memorable.** A lecture demo that looks like a homework widget fails even if the math is correct. The goal is to make students think "I want to play with that" the moment it appears on the projector.

**Default to 3D when the concept is inherently spatial.** Surfaces, manifolds, vector fields, loss landscapes, decision boundaries in feature space, transformations — these are 3D concepts flattened into 2D diagrams in textbooks. Our job is to unflatten them. Use Three.js / React Three Fiber with orbit controls so the instructor can rotate the view live. 3D with rotation is always more engaging than a static 2D projection — it lets the audience see the full geometry.

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
- Concepts that are fundamentally about 2D slices (epsilon-delta bands)

**When in doubt, choose 3D.** It's always possible to add a "2D projection" view as a secondary panel. The reverse — making a 2D app feel 3D — is impossible.

---

## Universal Patterns

These patterns appear across many math topics:

### The Slider Reveal
**What**: A parameter slider that smoothly transitions between a simple and complex view.  
**Why it works**: Lets the student control the pace of complexity. The act of dragging creates ownership of the insight.  
**Best for**: Anything with a parameter that changes behavior (n terms, learning rate, sample size).  
**Key detail**: Always show the parameter value prominently. Animate the transition, don't snap.

### The Comparison Split
**What**: Two side-by-side panels showing the same concept under different conditions.  
**Why it works**: Comparison is one of the strongest tools for building intuition. Side-by-side removes the need to remember.  
**Best for**: Before/after, method A vs method B, different parameter regimes.  
**Key detail**: Sync the interactions — dragging in one panel should update both. Highlight differences with color.

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
**Why it works**: Direct manipulation is the most intuitive interaction. "What happens if I move this?" is a natural question.
**Best for**: Function exploration, geometric constructions, constraint systems.
**Key detail**: Constrain the drag to valid regions. Show the dependent values as large, updating numbers.

### The Orbitable Scene (3D)
**What**: A Three.js scene with orbit controls — the user can rotate, zoom, and pan a 3D visualization.
**Why it works**: Rotation is the killer feature of 3D. A static 3D render is no better than 2D; the ability to orbit transforms understanding. Students see the full geometry from any angle, and the instructor can dramatically rotate to reveal hidden structure.
**Best for**: Surfaces, manifolds, loss landscapes, decision boundaries, vector fields, any concept with spatial structure.
**Key detail**: Set a good default camera angle that shows the concept clearly. Use `autoRotate` with slow speed (0.5–1.0) when idle so the scene feels alive. Add damping to orbit controls for smooth feel. Always provide a "Reset View" button.
**Implementation**: React Three Fiber (`@react-three/fiber`) + Drei helpers (`@react-three/drei` for OrbitControls, Grid, Text, etc.). Prefer R3F over raw Three.js for React integration.

### The 3D Surface Explorer
**What**: A parametric or data-driven surface rendered as a mesh in 3D, with interactive elements on it (points, arrows, paths).
**Why it works**: Surfaces are the natural home of gradients, optimization, and manifold concepts. Seeing a surface from multiple angles builds geometric intuition that no 2D contour plot can match.
**Best for**: Loss landscapes, probability surfaces, potential fields, data manifolds.
**Key detail**: Use a translucent or wireframe surface so objects behind/inside are visible. Color-code the surface by height (value) using a gradient. Add a ground plane with grid for spatial reference. Lighting matters — use hemisphere light + one directional light with soft shadows.

### The 3D Slice View
**What**: A 3D volume or surface with a movable 2D slice plane. The user drags the slice plane through the volume and sees the cross-section update in a side panel.
**Why it works**: Bridges 3D and 2D understanding. Students see the full geometry in 3D, then see a familiar 2D cross-section — connecting what they know to the richer structure.
**Best for**: Decision boundaries in 3D feature space, multivariate distributions, high-dimensional concepts projected to 3D.
**Key detail**: The slice plane should be visible in the 3D scene as a semi-transparent quad. Animate the slice movement smoothly. Show the 2D cross-section in a synchronized side panel.

### The Animated Trajectory (3D)
**What**: A point or particle moves along a path on a 3D surface, leaving a glowing trail.
**Why it works**: Combines the Particle Drop with 3D spatial understanding. Students see the path *on* the surface, understanding how the geometry constrains movement.
**Best for**: Gradient descent on loss surfaces, adversarial perturbation paths, dynamical systems.
**Key detail**: The trail should glow and fade. Show the current position as a bright sphere. Optionally show velocity/gradient as a 3D arrow at the current position. Allow the user to rotate the scene while the animation plays.

---

## Calculus / Analysis Patterns

### Limit Explorer
**Pattern**: Drag-to-Discover + Slider Reveal  
**Concept**: Show a point approaching a limit from both sides.  
**Visualization**: Animated point on a curve, with a zooming window that magnifies the neighborhood. As the student drags closer to the limit point, the zoom increases and the function value readout shows convergence.  
**Controls**: Point position (drag), zoom level, show/hide limit value, epsilon band toggle.

### Derivative as Slope
**Pattern**: Drag-to-Discover  
**Concept**: A tangent line that follows a dragged point along a curve.  
**Visualization**: The curve is fixed; the tangent line rotates smoothly as the point moves. A second panel below shows the derivative function being "painted" by the tangent slope values.  
**Controls**: Point position (drag), show/hide derivative curve, function selector.

### Integral as Area
**Pattern**: Build-Up + Slider Reveal  
**Concept**: Riemann sums converging to the definite integral.  
**Visualization**: Colored rectangles under a curve. Slider controls n (number of rectangles). As n increases, rectangles get thinner and the sum value converges. Show the sum value and the true integral value side by side.  
**Controls**: n slider (1–200), method toggle (left/right/midpoint/trapezoidal), function selector, show/hide true integral value.

### Taylor Series Approximation
**Pattern**: Build-Up  
**Concept**: Polynomial approximation improving term by term.  
**Visualization**: The true function in one color, the Taylor polynomial in another. As terms are added, the polynomial "chases" the function. Show the polynomial equation updating in real time. Highlight the radius of convergence.  
**Controls**: Number of terms (build-up button + slider), center point (drag), function selector.

### Epsilon-Delta
**Pattern**: Slider Reveal + Drag-to-Discover  
**Concept**: The formal definition of a limit.  
**Visualization**: A function plot with horizontal ε-band around L and vertical δ-band around a. Color-code the regions: green where the condition holds, red where it fails. Let students drag ε and see that a valid δ can always be found (for continuous functions).  
**Controls**: ε slider, δ slider (or auto-compute δ), function selector, point selector.

---

## Linear Algebra Patterns

### Matrix Transformation
**Pattern**: Drag-to-Discover  
**Concept**: How a 2×2 matrix transforms space.  
**Visualization**: A grid of points (or a recognizable shape) in 2D. The matrix entries are editable. As entries change, the grid transforms in real time. Highlight: determinant = area factor, eigenvectors stay on their lines.  
**Controls**: 4 matrix entry inputs (or sliders), shape selector (grid/circle/letter), show/hide eigenvectors, show determinant value.

### Eigenvector Anatomy
**Pattern**: Comparison Split  
**Concept**: Eigenvectors are the directions that only get scaled, not rotated.  
**Visualization**: Left panel: all vectors get transformed (show a circle becoming an ellipse). Right panel: highlight the eigenvectors that stay on their span lines. Animate the transformation as a smooth morph.  
**Controls**: Matrix entries, animation speed, show/hide eigenvalue labels.

### Span and Linear Independence
**Pattern**: Drag-to-Discover  
**Concept**: What subspace a set of vectors spans.  
**Visualization**: 2D or 3D space with draggable vectors. The span fills in as a colored region (line in 2D, plane in 3D). When a vector becomes linearly dependent, it visually "snaps" into the existing span and the region doesn't grow.  
**Controls**: Drag vector endpoints, add/remove vectors, dimension toggle (2D/3D).

### SVD Decomposition (3D)
**Pattern**: Orbitable Scene + Build-Up
**Concept**: SVD breaks a transformation into rotate → stretch → rotate.
**Visualization**: **3D scene** showing a unit sphere being transformed in three animated steps. Step 1 (Vᵀ): the sphere rotates. Step 2 (Σ): the sphere stretches into an ellipsoid along axis-aligned directions. Step 3 (U): the ellipsoid rotates to its final orientation. Each step is a smooth animation. The user can orbit the scene to see the full 3D geometry. Eigenvectors shown as colored arrows through the ellipsoid.
**Controls**: 3×3 matrix entries (editable), step-through (one step at a time or all at once), animation speed, orbit controls, show/hide eigenvectors.
**3D Details**: Unit sphere as `SphereGeometry(1, 64, 64)` with wireframe overlay. Apply matrix transformations via vertex shader or geometry manipulation. Eigenvector arrows as `ArrowHelper`. Use `MeshPhysicalMaterial` with `wireframe: true` overlay on solid mesh for visual depth.

### 3D Matrix Transformation
**Pattern**: Orbitable Scene + Drag-to-Discover
**Concept**: How a 3×3 matrix transforms 3D space.
**Visualization**: **3D scene** with a recognizable shape (cube, letter, teapot) displayed with orbit controls. As the user edits the 3×3 matrix entries, the shape deforms in real time. Eigenvectors shown as persistent arrows that only scale, not rotate. The determinant is displayed as a scaling factor with a volume indicator.
**Controls**: 9 matrix entry inputs, shape selector, show/hide eigenvectors, show determinant, animation toggle between original and transformed, orbit controls.

---

## Statistics / Probability Patterns

### Distribution Explorer
**Pattern**: Slider Reveal  
**Concept**: How distribution shape changes with parameters.  
**Visualization**: A smooth PDF curve with shaded area under it. Parameter sliders morph the shape in real time. Show key statistics (mean, variance, skewness) updating as numbers.  
**Controls**: Distribution type selector, 2–3 parameter sliders (context-dependent), show/hide CDF overlay, show/hide mean/variance markers.

### Central Limit Theorem
**Pattern**: Build-Up + Particle Drop  
**Concept**: Sample means converge to normal regardless of source distribution.  
**Visualization**: Top panel: the source distribution (can be weird — uniform, exponential, bimodal). Bottom panel: histogram of sample means, initially empty. Each "drop" draws a sample, computes the mean, and adds it to the histogram. As samples accumulate, the histogram approaches a bell curve. Overlay the theoretical normal.  
**Controls**: Source distribution selector, sample size n, draw speed, draw-one vs auto-draw toggle, reset button.

### Bayes' Theorem
**Pattern**: Slider Reveal + Visual Encoding  
**Concept**: How prior and likelihood combine to form the posterior.  
**Visualization**: A population grid (e.g., 1000 dots) colored by category. Filter by evidence to show conditional probability visually. Numeric readouts show P(A), P(B|A), and P(A|B) updating.  
**Controls**: Prior probability slider, sensitivity slider, specificity slider, show/hide calculation steps.

### Regression
**Pattern**: Drag-to-Discover  
**Concept**: How data points determine the best-fit line.  
**Visualization**: Scatter plot with draggable points. The regression line updates instantly. Show residual lines connecting each point to the line. Display R², slope, intercept as large numbers. Dragging a point far away shows how outliers affect the fit.  
**Controls**: Add/remove/drag points, show/hide residuals, show/hide confidence band, toggle regression type (linear/polynomial).

### Hypothesis Testing
**Pattern**: Slider Reveal + Comparison Split  
**Concept**: The logic of null hypothesis testing.  
**Visualization**: A distribution curve (null distribution) with rejection regions shaded. A test statistic marker that the student can drag. When it enters the rejection region, a clear visual signal (color change, label) shows rejection. Side panel shows Type I and Type II error probabilities.  
**Controls**: Significance level α slider, sample size slider, effect size slider, one-tailed/two-tailed toggle.

---

## Machine Learning Patterns

### Gradient Descent on 3D Loss Surface
**Pattern**: Orbitable Scene + Animated Trajectory + Comparison Split
**Concept**: Optimization on a loss surface.
**Visualization**: A **3D surface mesh** rendered in Three.js/R3F with orbit controls. The loss function is color-coded by height (cool blues at minima, hot reds at maxima). A glowing sphere drops onto the surface and rolls downhill, leaving a luminous trail. The camera auto-rotates slowly to reveal the landscape. A side panel shows the 2D contour projection for reference. Multiple optimizer paths (SGD, momentum, Adam) rendered simultaneously as differently-colored trails.
**Controls**: Click on the surface to place starting point, learning rate slider, optimizer selector, momentum slider, reset, step-by-step mode, toggle between 3D surface view and 2D contour view.
**3D Details**: Surface mesh 100×100 vertices, `MeshStandardMaterial` with `vertexColors`, hemisphere lighting, soft shadow on ground plane. Ball: `MeshPhysicalMaterial` with emissive glow, 0.05 radius. Trail: `Line2` with gradient opacity (bright at head, fading).

### Decision Boundary in 3D Feature Space
**Pattern**: Orbitable Scene + 3D Slice View + Drag-to-Discover
**Concept**: How different models carve up the feature space.
**Visualization**: **3D scene** with data points as glowing spheres (two colors for two classes), floating in a 3D feature space. The decision boundary is rendered as a semi-transparent surface cutting through the space. Toggle between models (linear → flat plane, SVM → curved surface, neural net → complex warped surface). A movable slice plane shows the familiar 2D cross-section in a side panel.
**Controls**: Add points by clicking in 3D space, class toggle, model selector, regularization slider, slice plane height, orbit controls.
**3D Details**: Data points as `SphereGeometry` with `MeshPhysicalMaterial` (emissive, slight bloom). Decision surface as `MeshPhysicalMaterial` with `opacity: 0.3, transparent: true, side: DoubleSide`. Grid ground plane with `GridHelper`.

### Adversarial Attack on the Data Manifold (3D)
**Pattern**: Orbitable Scene + 3D Surface Explorer + Animated Trajectory
**Concept**: How FGSM crafts adversarial examples by following the gradient on the loss surface.
**Visualization**: **3D scene** with a curved data manifold surface. Data points sit on the manifold as glowing spheres. The decision boundary is a glowing line/ribbon on the manifold surface. The gradient is shown as a 3D arrow at the data point. The adversarial perturbation animates the point along the gradient direction, crossing the decision boundary. The loss value updates live. A side panel shows the image triplet (original, perturbation, adversarial). The user can orbit the entire scene to see the manifold from different angles.
**Controls**: Orbit/zoom/pan, epsilon slider, step-through animation, toggle gradient arrows, toggle manifold wireframe.
**3D Details**: Manifold as parametric surface with `MeshPhysicalMaterial` (translucent, vertex-colored by class region). Gradient arrow as `ArrowHelper` or custom `ConeGeometry` + `CylinderGeometry`. Perturbation path as animated `Line2` with glow. Decision boundary as `TubeGeometry` along the boundary curve.

### Neural Network Forward Pass
**Pattern**: Build-Up
**Concept**: How data flows through a neural network.
**Visualization**: Network diagram with nodes and edges. Input values propagate through, with each node showing its activation value. Edges show weights (thickness = magnitude, color = sign). Animate the forward pass layer by layer.
**Controls**: Input values (drag or slider), number of layers, nodes per layer, activation function selector, step-through mode.

### Bias-Variance Tradeoff
**Pattern**: Comparison Split + Build-Up
**Concept**: Underfitting vs overfitting as model complexity changes.
**Visualization**: Left panel: the fitted model on training data. Right panel: performance on test data. A complexity slider (e.g., polynomial degree) controls both. As complexity increases, training fit improves but test error eventually rises. Show train/test error curves below.
**Controls**: Complexity slider, generate new data button, show/hide true function, noise level slider.

### Dimensionality Reduction Theater (3D)
**Pattern**: Orbitable Scene + Animated Trajectory
**Concept**: How PCA/t-SNE projects high-dimensional data to lower dimensions.
**Visualization**: **3D scene** with data points as glowing spheres in a point cloud. Initially scattered in a high-dimensional-looking arrangement, then animated to their projected positions as clusters emerge. The principal components shown as 3D arrows. Orbit controls let the user explore the cluster structure from any angle.
**Controls**: Dataset selector, method toggle (PCA/t-SNE/UMAP), perplexity slider (for t-SNE), animate projection toggle, orbit controls.
**3D Details**: Points as instanced meshes for performance (`InstancedMesh`). Use `PointsMaterial` with size attenuation for large point clouds. Smooth `lerp` animation between original and projected positions over 2000ms.

---

## Color Palettes for Math Visualizations

### Dark Lecture (Default)
Best for projectors and lecture halls.
- Background: `#0f172a` (deep navy)
- Surface: `#1e293b` (slate)
- Primary: `#38bdf8` (sky blue)
- Secondary: `#f472b6` (pink)
- Accent: `#34d399` (emerald)
- Warning: `#fbbf24` (amber)
- Text: `#f1f5f9` (near white)
- Muted text: `#94a3b8` (slate gray)
- Grid: `#334155` (dark slate)

### Light Academic
For printed handouts or bright rooms.
- Background: `#fafaf9` (warm white)
- Surface: `#ffffff`
- Primary: `#2563eb` (royal blue)
- Secondary: `#dc2626` (red)
- Accent: `#16a34a` (green)
- Warning: `#d97706` (dark amber)
- Text: `#1c1917` (near black)
- Muted text: `#78716c` (stone)
- Grid: `#e7e5e4` (light stone)

### Vibrant Math
For engaging younger audiences or casual settings.
- Background: `#18181b` (zinc black)
- Surface: `#27272a` (zinc dark)
- Primary: `#a78bfa` (violet)
- Secondary: `#fb923c` (orange)
- Accent: `#22d3ee` (cyan)
- Warning: `#facc15` (yellow)
- Text: `#fafafa` (white)
- Muted text: `#a1a1aa` (zinc gray)
- Grid: `#3f3f46` (zinc mid)

---

## 3D Scene Defaults

When building 3D visualizations with Three.js / React Three Fiber, use these defaults unless the concept calls for something specific:

### Lighting
- **Hemisphere light**: sky `#38bdf8`, ground `#0f172a`, intensity 0.6 — provides ambient fill without harsh shadows
- **Directional light**: color `#ffffff`, intensity 0.8, position `(5, 10, 5)`, castShadow enabled
- **Optional**: Point light at camera position, intensity 0.3, for subtle fill on the front face

### Materials
- **Surfaces**: `MeshPhysicalMaterial` with `roughness: 0.4`, `metalness: 0.1`, `transparent: true`, `opacity: 0.7` for manifolds and decision boundaries. Use `side: DoubleSide` so surfaces are visible from behind
- **Data points**: `MeshPhysicalMaterial` with `emissive` matching the point color at 0.3 intensity — creates a subtle glow. Add `<Bloom>` post-processing for extra punch
- **Wireframes**: Overlay `MeshBasicMaterial` with `wireframe: true`, `opacity: 0.15` on solid surfaces for depth cues
- **Trails/paths**: `Line2` from `three/examples/jsm/lines` for thick, anti-aliased lines. Use `LineMaterial` with `linewidth: 3`

### Camera & Controls
- **Default camera**: `PerspectiveCamera`, fov 50, position `(3, 3, 3)`, lookAt `(0, 0, 0)`
- **Orbit controls**: `enableDamping: true`, `dampingFactor: 0.05`, `autoRotate: true`, `autoRotateSpeed: 0.5`, `minDistance: 2`, `maxDistance: 20`
- **Reset view button**: Always include — returns camera to default position with a smooth 500ms `lerp`

### Ground Plane & Grid
- `GridHelper(10, 20, '#334155', '#1e293b')` — provides spatial reference without visual clutter
- Position at y = lowest point of the visualization
- Optional: `ContactShadows` from Drei for soft ground shadows

### Post-Processing (for visual impact)
- `<EffectComposer>` from `@react-three/postprocessing`
- `<Bloom luminanceThreshold={0.6} intensity={0.5} />` — makes emissive elements glow
- `<SMAA />` — anti-aliasing for clean edges
- Use sparingly — bloom on data points and trails, not on everything

### Performance
- Use `InstancedMesh` for >50 identical objects (data points)
- Use `BufferGeometry` for custom surfaces (not `Geometry`)
- Target 60fps — profile with `<Stats />` from Drei during development
- For surfaces: 100×100 vertex grid is usually sufficient. Go to 200×200 only if visual quality demands it

---

## Typography Recommendations

### For Lecture Slides
- Title: **Space Mono** or **JetBrains Mono** at 32–48px (monospace feels "mathy")
- Labels: **DM Sans** or **Outfit** at 16–20px
- Values/Numbers: **JetBrains Mono** at 20–28px (monospace for alignment)

### For Elegant/Academic
- Title: **Playfair Display** or **Libre Baskerville** at 28–36px
- Labels: **Source Sans 3** at 14–18px
- Values/Numbers: **IBM Plex Mono** at 18–24px

### For Modern/Bold
- Title: **Syne** or **Clash Display** at 36–56px
- Labels: **General Sans** or **Satoshi** at 14–18px
- Values/Numbers: **Space Mono** at 20–28px
