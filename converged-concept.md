

# Converged Concept: FGSM Adversarial Attack on the Data Manifold

## Core Idea
This visualization teaches how adversarial examples are crafted by performing gradient ascent on the *input* (rather than gradient descent on the *weights*), showing that a tiny, structured perturbation can cross a decision boundary and fool a trained classifier — and that high dimensionality makes this fundamentally unavoidable.

## The "Aha" Moment
The staggered component-arrow animation at step 3: students watch each input dimension *independently* choose ±ε to maximally increase the loss, then see the resulting perturbation slide the data point across the decision boundary. The realization clicks — **"We're doing gradient ascent on the input instead of gradient descent on the weights."** The same math, aimed at a different variable.

## Misconception Addressed
**"The perturbation is random noise."** Students assume any noise could fool a model. The random-vs-FGSM inset at step 4 kills this visually: a random perturbation of equal magnitude barely moves the loss, while the FGSM perturbation crosses the boundary. The structured, gradient-aligned nature of the attack is the entire point. Secondary misconceptions addressed: "bigger ε is always better" (the slider reveals the imperceptibility tradeoff) and "this is a 2D trick" (the dimensionality callout at step 6 corrects this).

## Mathematical Foundation
- **Core equation:** x_adv = clip(x + ε · sign(∇ₓ L(θ, x, y)), 0, 1)
- **Loss function:** L = −log(p_y) (cross-entropy), where p_y is the softmax probability of the true class
- **Why sign():** Under L∞ constraint ‖δ‖∞ ≤ ε, the linear approximation L(x+δ) ≈ L(x) + δᵀ∇ₓL is maximized when δᵢ = ε · sign(∂L/∂xᵢ). This is the dual norm argument: the dual of L∞ is L₁, so the optimal perturbation achieves ε · ‖∇ₓL‖₁.
- **Parameter ranges:** ε ∈ [0, 0.3], pixel values ∈ [0, 1], input is pre-normalized (perturbation added in pixel space, not feature space)
- **Default:** ε = 0.03 (≈ 8/255, the standard robustness benchmark value)
- **Edge cases:**
  - ε = 0 → no perturbation, original classification, zero-length arrows (avoid NaN from sign of zero gradient)
  - ε ≥ 0.3 → visibly corrupted image, pixel clamping to [0,1] is mandatory
  - Expected loss range: ~0.1–0.5 at ε=0, ~3–8 at ε=0.03 for a well-trained ResNet

## Interaction Design
- **Primary model:** Staged reveal — a "Next Step" button walks through six steps. The instructor controls pacing for a lecture hall; students see the same thing at the same time.
- **Controls:**
  - "Next Step" button (visible at all times, advances through steps 1–6)
  - ε slider: appears only at step 4. Continuous, range [0, 0.3], default 0.03, logarithmic tick marks at 0 / 0.01 / 0.03 / 0.1 / 0.3
- **Animation behavior:**
  - Step 2: Gradient arrow fades in from data point, 600ms ease-out
  - Step 3: Two component arrows (horizontal ∂L/∂x₁, vertical ∂L/∂x₂) appear, then stagger-snap to ±ε (x₁ at 0ms, x₂ at 200ms, 400ms total), color shifts from `#FFA657` to `#FF7B72` on snap. Easing: `cubic-bezier(0.34, 1.56, 0.64, 1)` (slight overshoot)
  - Step 4: Perturbation path animates as dotted trail in `#58A6FF` over 800ms; loss readout updates live
  - Step 5: Image triplet cards fade in simultaneously, confidence bars animate width at 300ms ease-out

## Visual Design
- **Layout:** 60% left for 2D manifold plot, 40% right for image triplet + confidence bars (right panel blank/dark until step 5)
- **Color palette:**
  - Background: `#0D1117`
  - Grid: `#1B2332`
  - "Cat" region: `#2EA043` at 15% opacity, 2px boundary at full saturation
  - "Dog" region: `#F85149` at 15% opacity, 2px boundary at full saturation
  - Data point: `#58A6FF`, 18px radius, soft glow
  - Gradient arrow: `#FFA657`, 3–4px stroke
  - Snapped components: `#FF7B72`
  - Text: `#E6EDF3`
  - Step 6 card background: `#161B22`
  - Perturbation heatmap diverging colormap: `#58A6FF` → `#0D1117` → `#FF7B72`
- **Typography:**
  - Labels/UI: Inter, minimum 28px
  - Class names ("cat", "dog"): 42px bold, placed inside their regions
  - Math: KaTeX rendering
  - Loss readout: JetBrains Mono 36px, top-right corner (monospace prevents digit-width jitter)
  - Dimensionality callout: `#E6EDF3` on `#161B22` card, no decoration
- **Key visual elements:**
  - Random-vs-FGSM inset at step 4: 15% canvas width, below manifold plot, showing both displacement vectors from the same origin; labels "random" and "FGSM" at 24px
  - Image triplet at step 5: Original | Perturbation (×10, diverging heatmap) | Adversarial, each 200×200 with 1px `#30363D` border, horizontal confidence bars below each card using region colors

## Narrative Arc (Demo Script)
1. **Starting state (~20s):** A correctly classified panda image shown as a blue dot inside the "panda" region of the 2D manifold. Loss readout shows a low value (~0.3). *"Here's an image our trained model classifies correctly with high confidence."*
2. **First interaction (~20s):** The gradient ∇ₓL appears as an amber arrow. *"The gradient of the loss with respect to the input tells us: which direction would make the model more wrong?"*
3. **Key mechanism (~30s):** The arrow decomposes into two component arrows that independently snap to ±ε. *"Each pixel makes its own greedy decision — plus or minus epsilon — to maximally increase the loss. That's all FGSM is."*
4. **The attack (~20s):** The point slides across the boundary. Loss jumps. Classification flips. The ε slider appears — students explore the tradeoff. The random-vs-FGSM inset shows why structured noise succeeds where random noise fails.
5. **The reveal (~20s):** Image triplet appears: the panda, the structured perturbation (amplified), and the adversarial image classified as "gibbon." *"You can't see the difference. The model is certain it's a gibbon."* (Cite Goodfellow et al., 2015 on screen.)
6. **The gut-punch (~30s):** Typographic card: *"In 2D, the sign vector has 4 possible directions. For a 224×224×3 image: 2¹⁵⁰,⁵²⁸ — more than atoms in the observable universe. The model cannot defend against all of them."* The 2D intuition recalibrates to a fundamental vulnerability.

## Scope Boundaries
- **No defenses.** Adversarial training, certified robustness, and input preprocessing are out of scope.
- **No iterative attacks.** PGD, C&W, and multi-step methods are not shown — this is FGSM only.
- **No targeted attacks.** Only untargeted misclassification (maximizing loss of true class).
- **No 3D or high-dimensional geometric visualizations.** Dimensionality is communicated typographically, not geometrically.
- **No free-exploration mode.** This is a lecture demo, not a homework sandbox (a separate exploratory version is noted as possible future work).
- **No non-image modalities.** The concept is mentioned verbally ("the math applies to any differentiable model") but not demonstrated.

## Unresolved Tensions
1. **2D simplification vs. high-D reality.** The 2D manifold plot is necessary for intuition but inherently misleading — adversarial attacks are *easier* in high dimensions, not harder. The step 6 callout mitigates this, but some students may still leave with a 2D mental model. The implementer should ensure step 6 lands with sufficient pause and emphasis.
2. **Manifold hypothesis is not a theorem.** The visualization implies adversarial examples "leave the data manifold," but this is an empirical hypothesis. The softened language (*"likely moves off the manifold… a region the model never learned to handle"*) is adopted, but the implementer should not add visual elements that imply a crisp manifold boundary.
3. **Pre-normalized vs. normalized input space.** The gradient must be computed with respect to pre-normalized pixel values [0,1], not the model's internal normalized features. This is a silent implementation bug that produces valid but pedagogically misleading ε values. The implementer must verify this carefully.
4. **Precomputed vs. live inference.** Running a real ResNet in-browser may be infeasible. The implementer may need to precompute gradients and outputs for the canonical panda example at sampled ε values and interpolate, rather than running live inference. This tradeoff affects how responsive the ε slider feels.
