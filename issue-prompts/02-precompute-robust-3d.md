# Issue 2: Precomputation Pipeline — Robust Model + 3D Surface Data

## Goal

Write a Python script (`precompute/generate_robust_and_3d.py`) that trains an adversarially robust LeNet-5 and precomputes: (a) the same per-image data as Issue 1 but for the robust model, and (b) a 3D margin surface mesh with projected attack paths for the optional "Compare Attacks" 3D mode.

## Dependencies

**This issue depends on Issue 1.** It requires:
- The curated set of 50 images (same images, same IDs)
- The FGSM direction vectors from the standard model (used as v₁ for the 3D subspace)
- The standard model's `lenet5_standard.pt` weights

Read `public/data/standard_model.json` to get image IDs and pixel data. Read gradient data from it to construct the projection subspace.

## Part A: Robust Model

### Training

Train an adversarially robust LeNet-5 using PGD adversarial training (Madry et al., 2018):
- Same architecture as standard LeNet-5 (see Issue 1)
- PGD-AT with: ε_train = 0.3, step size α = 0.01, 40 PGD steps, L∞ norm
- Train for 50 epochs on MNIST
- Expected clean accuracy: ~98.0% (slightly lower than standard)
- Expected robust accuracy at ε=0.3: ~88-92%
- Save to `precompute/models/lenet5_robust.pt`

### Per-Image Precomputation

For the same 50 curated images, compute the identical fields as Issue 1:
- `pixels`, `true_class` — same as standard (the images are identical)
- `adversarial_class` — may differ from standard model (the robust model may flip to a different class, or not flip at all within [0, 0.35])
- `loss_grad_sign`, `margin_gradient`, `grad_magnitude` — recomputed with the robust model's gradients
- `dead_pixel_mask`, `dead_pixel_threshold` — recomputed (expect MUCH sparser active pixels)
- `logits_at_eps`, `margin_at_eps`, `probs_at_eps` — 100 epsilon values, same grid [0, 0.35]
- `epsilon_star` — will be much higher than standard model (many images may NOT flip within [0, 0.35])
- All dimensional scaling quantities

For images where ε* > 0.35 (robust model resists the attack): set `epsilon_star` to `null` and `adversarial_class` to `null`. These are pedagogically valuable — they show the robust model holding.

### Output

Write to `public/data/robust_model.json` with the same schema as `standard_model.json`, plus:
```json
{
  "model": "lenet5_robust",
  "model_accuracy": 0.980,
  "robust_accuracy_at_03": 0.89,
  "training": {
    "method": "PGD-AT",
    "epsilon_train": 0.3,
    "pgd_steps": 40,
    "step_size": 0.01
  },
  "images": [...]
}
```

## Part B: 3D Margin Surface + Attack Paths

This data powers an optional "Advanced: Compare Attacks" mode — a React Three Fiber 3D scene showing the loss landscape cross-section with three attack paths (FGSM, PGD, C&W) projected onto it.

### Subspace Construction

For each curated image, construct a 2D subspace in input space:
- **v₁** = sign(∇_x J_standard) — the FGSM direction from the standard model (normalized to unit L2 norm)
- **v₂** = component of ∇_x J_standard orthogonal to v₁ (Gram-Schmidt), normalized to unit L2 norm
- This subspace captures the FGSM attack direction and the "wasted" gradient component

### Margin Surface Mesh

For each curated image, compute an 80×80 grid of margin values:
- Grid coordinates: α ∈ [-0.4, 0.4], β ∈ [-0.4, 0.4] (80 steps each)
- At each (α, β): x_perturbed = clip(x + α·v₁ + β·v₂, 0, 1)
- Forward pass through the **standard** model to get logits
- Compute margin: m = z_y - max_{k≠y} z_k
- Store as `surface_margin`: float array [80][80]
- Also store `surface_prediction`: int array [80][80] — the predicted class at each point

The mesh will be rendered as a 3D surface where height = margin value, colored by predicted class.

### Attack Path Projections

For each curated image, compute and project three attack paths:

**1. FGSM path** (trivial — a straight line):
- Start: origin (0, 0) — the clean image
- End: (ε*, 0) in the (α, β) coordinate system (FGSM moves purely along v₁)
- Store as 2 points: `fgsm_path`: [[0, 0, m(0,0)], [ε*, 0, m(ε*,0)]]

**2. PGD path** (20 steps):
- Run PGD-20 with step size α=0.01, ε=0.3, L∞ constraint
- At each step k, compute the perturbation δ_k
- Project onto subspace: (α_k, β_k) = (δ_k · v₁, δ_k · v₂)
- Evaluate margin at the actual (projected) point: m_k
- Store as `pgd_path`: float array [21][3] — (α, β, margin) at each step including start

**3. C&W path** (simplified Carlini-Wagner L2 attack, 50 optimization steps):
- Minimize ‖δ‖₂ + c · max(z_y - max_{k≠y} z_k, -κ) where κ=0, c found by binary search
- Use Adam optimizer, 50 steps, learning rate 0.01
- At each step, project δ onto subspace and record (α, β, margin)
- Store as `cw_path`: float array [51][3]

### Path Degeneracy Check

After computing paths, verify they're visually useful:
- `pgd_path_visible`: boolean — true if the PGD path has max |β| > 0.02 (it moves off the v₁ axis)
- `cw_path_visible`: boolean — true if the C&W path stays within [-0.5, 0.5] in both dimensions
- Flag degenerate cases so the frontend can show a warning or skip that image in 3D mode

### 3D Output

Write to `public/data/3d_surface_data.json`:

```json
{
  "subspace_info": {
    "description": "v1 = normalized FGSM direction, v2 = orthogonal gradient component",
    "grid_range": [-0.4, 0.4],
    "grid_size": 80
  },
  "images": [
    {
      "id": 0,
      "surface_margin": [[8.2, 7.9, ...], ...],
      "surface_prediction": [[7, 7, ...], ...],
      "fgsm_path": [[0, 0, 8.2], [0.152, 0, -0.3]],
      "pgd_path": [[0, 0, 8.2], [0.01, 0.002, 7.8], ...],
      "cw_path": [[0, 0, 8.2], [0.008, 0.005, 7.6], ...],
      "pgd_path_visible": true,
      "cw_path_visible": true,
      "decision_boundary_contour": [[0.12, -0.05], [0.13, -0.03], ...]
    }
  ]
}
```

The `decision_boundary_contour` is the zero-crossing contour of the margin surface (where m=0) — extract using `skimage.measure.find_contours` or equivalent on the 80×80 grid. This renders as a line on the 3D surface showing where the decision boundary is.

## Size Budget

- Robust model data: ~1.7 MB (same as standard)
- 3D surface data: 80×80×4 bytes × 50 images ≈ 12.5 MB uncompressed for the surface alone
  - Round to 2 decimal places to reduce size
  - Store surface_prediction as uint8
  - Target: <4 MB gzipped total for 3d_surface_data.json
- Paths are tiny: ~50 points × 3 floats × 3 attacks × 50 images ≈ 90 KB

## Dependencies

```
torch>=2.0
torchvision
numpy
scikit-image  # for contour extraction
```

Plus: `public/data/standard_model.json` from Issue 1.

## Deliverables

1. `precompute/generate_robust_and_3d.py` — main script
2. `precompute/models/lenet5_robust.pt` — saved robust model weights
3. `public/data/robust_model.json` — robust model precomputed data
4. `public/data/3d_surface_data.json` — 3D surface + attack paths

## Verification

Print summary:
```
Robust LeNet-5 Precomputation Summary
========================================
Clean accuracy: 98.0%
Robust accuracy (ε=0.3): 89.2%
Images where attack fails (ε* > 0.35): 38/50
Images where attack succeeds: 12/50
  Mean ε* (successful): 0.284
Active pixels per image: 187 avg (23.9%) — vs 350 for standard

3D Surface Data Summary
========================================
Grid: 80×80, range [-0.4, 0.4]
PGD paths visible: 47/50
C&W paths visible: 43/50
Decision boundary contours extracted: 50/50
Output size: 11.2 MB (gzipped: 3.1 MB)
```
