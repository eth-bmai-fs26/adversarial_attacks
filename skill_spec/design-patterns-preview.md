# Math Visualization Design Patterns

A library of proven patterns for interactive math visualizations, organized by topic. Use these as starting points and inspiration — don't copy them rigidly, but understand why they work and adapt them to the specific concept.

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

### SVD Decomposition
**Pattern**: Build-Up + Comparison Split  
**Concept**: SVD breaks a transformation into rotate → stretch → rotate.  
**Visualization**: Show a unit circle being transformed in three explicit steps. Each step is a separate panel or an animated sequence. Label each step with U, Σ, Vᵀ.  
**Controls**: Matrix entries, step-through (show one step at a time vs all at once), animation toggle.

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

### Gradient Descent
**Pattern**: Particle Drop + Comparison Split  
**Concept**: Optimization on a loss surface.  
**Visualization**: A 2D contour plot (or 3D surface) of a loss function. Drop a "ball" at a starting point and watch it roll downhill. Path is traced. Multiple panels compare different optimizers (SGD, momentum, Adam).  
**Controls**: Starting point (click to place), learning rate slider, optimizer selector, momentum slider, reset, step-by-step mode.

### Decision Boundary
**Pattern**: Drag-to-Discover + Comparison Split  
**Concept**: How different models carve up the feature space.  
**Visualization**: A 2D canvas where the student draws/places data points in two classes. The background fills with the decision boundary colors. Toggle between models to see how the boundary changes.  
**Controls**: Draw/place points (click), class selector, model type toggle, regularization slider, clear points.

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
