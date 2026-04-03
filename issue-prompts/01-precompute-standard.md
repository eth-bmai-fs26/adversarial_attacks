# Issue 1: Precomputation Pipeline — Standard LeNet-5

## Goal

Write a Python script (`precompute/generate_data.py`) that trains (or loads) a standard LeNet-5 on MNIST and precomputes all data needed by the browser visualization. The output is a single JSON file that the React frontend will fetch at load time.

## Context

This data powers an interactive FGSM adversarial attack visualization for university lectures. The browser app shows how imperceptible perturbations fool classifiers. Everything in the core demo is precomputed — zero live inference. The frontend will interpolate between precomputed epsilon values for smooth slider interaction.

## Model

Standard LeNet-5 architecture:
- Conv2d(1, 6, 5) → ReLU → MaxPool(2)
- Conv2d(6, 16, 5) → ReLU → MaxPool(2)
- Flatten → Linear(256, 120) → ReLU → Linear(120, 84) → ReLU → Linear(84, 10)
- ~44K parameters
- Loss: cross-entropy J = -log P_y
- Train on MNIST train set, standard SGD, to ≥98.5% test accuracy
- Save model weights to `precompute/models/lenet5_standard.pt`

If a pretrained checkpoint already exists at that path, load it instead of retraining.

## Image Curation

Select 50 images from the MNIST test set (5 per digit class 0-9) with these criteria:
- The model classifies them correctly with high confidence (P_true > 0.95)
- Their critical epsilon (ε* where the classification flips) falls in [0.08, 0.25] — this range gives a good demo
- They produce clean single-class flips (one dominant adversarial class, not a messy multi-class transition)
- Prefer images with visually clear digit strokes (not ambiguous handwriting)

To find ε*: binary search over ε in [0, 0.35] with tolerance 0.001. At each ε, compute x_adv = clip(x + ε·sign(∇_x J), 0, 1) and check if argmax changes.

## Per-Image Precomputation

For each of the 50 curated images, compute and store:

### 1. Raw image data
- `pixels`: float array [784], the original image flattened, values in [0, 1]
- `true_class`: int, the ground truth label
- `adversarial_class`: int, the class it flips to at ε*

### 2. Gradient data
- `loss_grad_sign`: int array [784], values in {-1, 0, +1} — sign(∇_x J(θ, x, y))
- `margin_gradient`: float array [784] — ∇_x m(x) where m(x) = z_y - max_{k≠y} z_k
- `grad_magnitude`: float array [784] — |∂J/∂x_i| (absolute gradient magnitudes)

### 3. Dead-pixel mask
- `dead_pixel_mask`: boolean array [784]
- A pixel is "dead" if |∂J/∂x_i| < τ where τ = 0.01 × max_i |∂J/∂x_i|
- After applying τ, verify that sign coherence among adjacent active pixels > 0.65
- If not, adjust τ to approximately percentile 55 of |∂J/∂x_i|, retaining ~350 of 784 active pixels
- Store the τ value used: `dead_pixel_threshold`: float

### 4. Logits at 100 epsilon values
- `epsilon_values`: float array [100], linearly spaced from 0 to 0.35 (step ~0.00354)
- `logits_at_eps`: float array [100][10] — all 10 logits at each epsilon
  - At each ε: x_adv = clip(x + ε·sign(∇_x J), 0, 1), then forward pass to get logits
- `margin_at_eps`: float array [100] — logit margin m = z_y - max_{k≠y} z_k at each ε
- `probs_at_eps`: float array [100][10] — softmax probabilities at each epsilon

### 5. Critical epsilon
- `epsilon_star`: float — the precise ε where classification flips (from binary search)
- `epsilon_star_index`: int — nearest index in epsilon_values array
- Verify: interpolating logits around epsilon_star_index gives margin crossing zero

### 6. Dimensional scaling quantities
- `l1_margin_gradient`: float — ‖∇_x m‖_1 = Σ|∂m/∂x_i|
- `avg_pixel_sensitivity`: float — mean(|∂m/∂x_i|) across all 784 pixels
- `fgsm_margin_dot`: float — Σ (∂m/∂x_i · sign(∂J/∂x_i)), the actual first-order margin change per unit ε
- `sign_disagreement_fraction`: float — fraction of pixels where sign(∂J/∂x_i) ≠ sign(∂m/∂x_i) (should be ~0.10-0.15)

### 7. Gradient comparison data (for Beat 2b: FGSM vs raw gradient)
- `raw_gradient_attack_logits`: float array [100][10] — logits when using δ = ε·∇_x J / ‖∇_x J‖_∞ instead of ε·sign(∇_x J)
- `raw_gradient_flipped`: boolean array [100] — whether the raw gradient attack flips the class at each ε

## Output Format

Write to `public/data/standard_model.json`:

```json
{
  "model": "lenet5_standard",
  "model_accuracy": 0.987,
  "images": [
    {
      "id": 0,
      "pixels": [0.0, 0.0, ..., 0.0],
      "true_class": 7,
      "adversarial_class": 3,
      "loss_grad_sign": [0, 0, ..., 1, -1, ...],
      "margin_gradient": [0.0, 0.0, ..., 0.023, -0.041, ...],
      "grad_magnitude": [0.0, 0.0, ..., 0.023, 0.041, ...],
      "dead_pixel_mask": [true, true, ..., false, false, ...],
      "dead_pixel_threshold": 0.00045,
      "epsilon_values": [0.0, 0.00354, ..., 0.35],
      "logits_at_eps": [[12.1, -3.2, ...], ...],
      "margin_at_eps": [8.2, 7.9, ..., -4.1],
      "probs_at_eps": [[0.993, 0.001, ...], ...],
      "epsilon_star": 0.152,
      "epsilon_star_index": 43,
      "l1_margin_gradient": 52.3,
      "avg_pixel_sensitivity": 0.0668,
      "fgsm_margin_dot": 48.7,
      "sign_disagreement_fraction": 0.12,
      "raw_gradient_attack_logits": [[12.1, -3.2, ...], ...],
      "raw_gradient_flipped": [false, false, ..., true, true]
    }
  ]
}
```

## Size Budget

- ~35KB per image uncompressed, ~1.7MB total for 50 images
- The JSON should gzip to under 500KB
- Round floats to 4 decimal places to reduce size
- Store `loss_grad_sign` as int8 (-1, 0, 1) — the JSON will just have integers
- Store `dead_pixel_mask` as a list of active pixel indices (shorter than 784 booleans) if it saves space

## Numerical Precision

- Use float32 for all PyTorch computations (standard)
- The dead-pixel threshold τ must be well above float32 epsilon (~1.2e-7). With τ = 0.01 × max|grad|, this is guaranteed since max|grad| >> 1e-5
- When computing sign(∂J/∂x_i): pixels with |∂J/∂x_i| < τ get sign = 0 (not randomly ±1)
- Verify: at ε = epsilon_star, the margin_at_eps value should be close to 0 (within ±0.5)

## Edge Cases to Handle

- **Clipping asymmetry**: near-zero background pixels (~40% of MNIST) with sign=-1 get effective perturbation of only -x_i ≈ -0.02, not -ε. The precomputed logits already account for this since we compute clip(x + ε·sign, 0, 1) honestly.
- **sign(0)**: handled by dead-pixel mask — these pixels are masked out
- **Multiple class flips**: some images may flip to class A at ε=0.1, then to class B at ε=0.2. `adversarial_class` should be the FIRST class it flips to. Flag images with multiple flips in a `multi_flip` boolean field.
- **No flip in range**: if an image doesn't flip before ε=0.35, exclude it from the curated set and pick another

## Dependencies

```
torch>=2.0
torchvision
numpy
```

## Deliverables

1. `precompute/generate_data.py` — main script, runnable with `python generate_data.py`
2. `precompute/models/lenet5_standard.pt` — saved model weights
3. `public/data/standard_model.json` — the precomputed data file
4. `precompute/requirements.txt` — Python dependencies

## Verification

After generating, print a summary:
```
Standard LeNet-5 Precomputation Summary
========================================
Model accuracy: 98.7%
Images curated: 50 (5 per class)
Epsilon range: [0.0, 0.35], 100 steps
Epsilon* range: [0.08, 0.25]
  Mean ε*: 0.156
  Easiest: image #23 (digit "7", ε*=0.082)
  Hardest: image #41 (digit "1", ε*=0.247)
Sign disagreement (loss vs margin): 11.3% avg
Dead pixels per image: 434 avg (55.4%)
Output size: 1.68 MB (gzipped: 412 KB)
```
