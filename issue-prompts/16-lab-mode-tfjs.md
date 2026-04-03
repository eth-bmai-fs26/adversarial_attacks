# Issue 16: Lab Mode — TF.js Live Inference

## Goal

Build a "Try it yourself" lab mode where students draw their own MNIST digit on a canvas, the LeNet-5 runs live in the browser via TensorFlow.js, and FGSM attacks their own drawing. This is the only genuinely interactive part of the visualization — every other beat uses precomputed data.

## Dependencies

- **Issue 3** (Project Scaffold): Design tokens, types
- **Issue 8** (Sign Map Renderer): `SignMapCanvas` for the live sign map overlay

Note: This issue does NOT depend on the precomputation pipeline (#1, #2). It loads its own TF.js model. It CAN be built in parallel with the precomputation work.

## Context

Lab Mode solves the "animated GIF" critique from the discussion — the core demo is precomputed, but Lab Mode gives students genuine exploration. A student draws a "7" with their mouse, the network classifies it live, they press "ATTACK" and see their own digit get fooled. The perturbation pattern follows THEIR stroke edges. This is personal and memorable.

Lab Mode is behind a clearly labeled tab ("Try it yourself") separate from the core demo. It's explicitly labeled "Results may vary — live computation."

## Deliverables

### 1. LabMode Component (`src/beats/LabMode.tsx`)

```tsx
interface LabModeProps {
  isActive: boolean;
}
```

### 2. Tab Navigation

Lab Mode is accessed via a tab in the top navigation (separate from beat dots):

```
┌─────────────────────────────────────────────────┐
│  [Demo]  [Try it yourself]          [Settings]  │  <- Tab bar
│   ^^^^    ^^^^^^^^^^^^^^^^                      │
│   active  lab mode                              │
└─────────────────────────────────────────────────┘
```

- Two tabs: "Demo" (the core beats) and "Try it yourself" (Lab Mode)
- Active tab: underlined with sky blue `#38bdf8`, 2px bottom border
- Inactive tab: muted text `#94a3b8`
- Font: DM Sans 16px Bold
- Switching tabs transitions with a 200ms crossfade

### 3. Lab Mode Layout

```
┌─────────────────────────────────────────────────┐
│  [Demo]  [Try it yourself]          [Settings]  │
│                                                 │
│  "Results may vary — live computation"          │  <- Disclaimer
│                                                 │
│  ┌──────────────┐    ┌──────────────┐           │
│  │              │    │              │           │
│  │  DRAW HERE   │    │  RESULT      │           │
│  │  (280×280)   │    │  (280×280)   │           │
│  │              │    │  + sign map   │           │
│  │              │    │  overlay      │           │
│  └──────────────┘    └──────────────┘           │
│                                                 │
│  [Clear]  [ATTACK]     "7" — 96.2%             │
│                        ε slider [0, 0.35]       │
│                                                 │
│  Classification: "7" → "3" (flipped at ε=0.14) │
│                                                 │
└─────────────────────────────────────────────────┘
```

Two panels side by side: drawing canvas (left) and result canvas (right).

### 4. Drawing Canvas

A 280×280px HTML canvas where the student draws a digit with mouse or touch:

**Visual spec:**
- Background: `#0f172a` (dark canvas)
- Stroke color: white `#f1f5f9`
- Stroke width: 16px (approximately MNIST stroke width scaled to 280px)
- Line cap: round
- Line join: round
- Border: 1px solid `#94a3b8`, rounded 4px
- Cursor: crosshair

**Interaction:**
- Mouse: `mousedown` starts drawing, `mousemove` draws, `mouseup` stops
- Touch: `touchstart`, `touchmove`, `touchend` (prevent scroll)
- Each stroke is drawn using `ctx.lineTo()` for smooth connected lines (not individual dots)

**Clear button:** Erases the canvas. DM Sans 16px, muted border, bottom-left of canvas.

### 5. Digit Preprocessing Pipeline

When the student finishes drawing (on `mouseup`/`touchend`), preprocess the drawn image to match MNIST input distribution:

```ts
function preprocessDrawnDigit(canvas: HTMLCanvasElement): Float32Array {
  // 1. Get the drawn pixels as grayscale
  const ctx = canvas.getContext('2d')!;
  const imageData = ctx.getImageData(0, 0, 280, 280);

  // 2. Convert to grayscale float [0, 1]
  const gray = new Float32Array(280 * 280);
  for (let i = 0; i < 280 * 280; i++) {
    gray[i] = imageData.data[i * 4 + 3] / 255; // Use alpha channel (stroke is white on transparent)
    // OR: gray[i] = (imageData.data[i*4] + imageData.data[i*4+1] + imageData.data[i*4+2]) / (3 * 255);
  }

  // 3. Find bounding box of non-zero pixels
  // 4. Crop to bounding box
  // 5. Resize to fit within 20×20 pixels (maintaining aspect ratio)
  // 6. Center in a 28×28 frame (4px padding each side)
  // 7. Apply Gaussian blur with σ=0.5 to approximate MNIST anti-aliasing
  // 8. Normalize pixel values to [0, 1]

  return result; // Float32Array of length 784
}
```

**Step 3-6 detail (centering):**
- Find the bounding box of all non-zero pixels in the 280×280 canvas
- Compute the center of mass of the drawn stroke
- Scale the bounding box to fit within a 20×20 pixel area (MNIST convention)
- Place this 20×20 region centered in a 28×28 frame
- Use bilinear interpolation for the downscale

**Step 7 (Gaussian blur):**
Apply a 3×3 Gaussian kernel with σ=0.5 to the 28×28 image. This softens the aliased edges to match MNIST's anti-aliased strokes. The kernel:
```
[0.0625, 0.125, 0.0625]
[0.125,  0.25,  0.125 ]
[0.0625, 0.125, 0.0625]
```

This preprocessing is critical — without it, the LeNet-5 misclassifies ~40% of drawn digits. With it, accuracy should be ~85-90%.

### 6. TF.js Model Loading

Load a LeNet-5 model in TensorFlow.js format:

```ts
import * as tf from '@tensorflow/tfjs';

let model: tf.LayersModel | null = null;

async function loadModel(): Promise<tf.LayersModel> {
  if (!model) {
    model = await tf.loadLayersModel('/models/lenet5_tfjs/model.json');
  }
  return model;
}
```

**Model conversion:** The precomputation pipeline (Issue 1) trains a PyTorch LeNet-5. This issue needs to convert it to TF.js format. Add a conversion script:

```python
# precompute/convert_to_tfjs.py
# 1. Load the PyTorch model
# 2. Export to ONNX
# 3. Convert ONNX to TF SavedModel using onnx-tf
# 4. Convert SavedModel to TF.js using tensorflowjs_converter

# OR: retrain a Keras LeNet-5 directly and export with tensorflowjs_converter
```

The simpler approach: train a Keras LeNet-5 in `precompute/train_keras_lenet5.py` and convert directly:
```bash
tensorflowjs_converter --input_format keras model.h5 public/models/lenet5_tfjs/
```

Place the TF.js model files in `public/models/lenet5_tfjs/` (model.json + weight shards).

### 7. Live Forward + Backward Pass

**Classification (on draw or preprocessing):**
```ts
async function classify(pixels: Float32Array): Promise<{ logits: number[], probs: number[], predictedClass: number }> {
  const model = await loadModel();
  const input = tf.tensor4d(Array.from(pixels), [1, 28, 28, 1]);
  const logits = model.predict(input) as tf.Tensor;
  const logitsArr = Array.from(await logits.data());
  const probs = softmax(logitsArr);
  const predictedClass = logitsArr.indexOf(Math.max(...logitsArr));
  input.dispose();
  logits.dispose();
  return { logits: logitsArr, probs, predictedClass };
}
```

**Gradient computation (for FGSM):**
```ts
async function computeGradient(pixels: Float32Array, trueClass: number): Promise<Float32Array> {
  const model = await loadModel();
  const input = tf.tensor4d(Array.from(pixels), [1, 28, 28, 1]);

  const gradFn = tf.grad((x: tf.Tensor) => {
    const logits = model.predict(x) as tf.Tensor;
    return tf.losses.softmaxCrossEntropy(
      tf.oneHot(tf.tensor1d([trueClass], 'int32'), 10),
      logits
    );
  });

  const grad = gradFn(input);
  const gradArr = new Float32Array(await grad.data());
  input.dispose();
  grad.dispose();
  return gradArr;
}
```

**FGSM attack:**
```ts
function fgsmAttack(pixels: Float32Array, gradient: Float32Array, epsilon: number): {
  adversarial: Float32Array,
  signMap: number[],
  deadPixelMask: boolean[]
} {
  const signMap = Array.from(gradient).map(g => Math.abs(g) < 1e-4 ? 0 : (g > 0 ? 1 : -1));
  const deadPixelMask = gradient.map(g => Math.abs(g) < 0.01 * Math.max(...gradient.map(Math.abs)));
  const adversarial = new Float32Array(784);
  for (let i = 0; i < 784; i++) {
    adversarial[i] = Math.max(0, Math.min(1, pixels[i] + epsilon * signMap[i]));
  }
  return { adversarial, signMap, deadPixelMask: Array.from(deadPixelMask).map(v => v < 1) };
}
```

### 8. Attack Flow

1. Student draws a digit → preprocessing runs → forward pass classifies it → show `"7" — 96.2%"`
2. Student presses "ATTACK" button or adjusts ε slider
3. Backward pass computes gradient (~15ms)
4. Sign map computed, adversarial image generated
5. Result canvas shows: adversarial image + sign map overlay
6. New classification shown: `"3" — 84.1%" (flipped)`

**ε slider:** A simplified version of the EpsilonSlider (from Issue 5), or reuse it directly. No magnetic snap (we don't know ε* in advance for drawn digits). Range [0, 0.35].

**Performance:** Forward pass ~5ms, backward pass ~15ms on modern hardware. Debounce ε slider updates to 30fps to avoid GPU contention on slow devices.

### 9. Result Canvas

Right panel (280×280px):
- Shows the adversarial image (MNIST canvas at 280px with perturbation applied)
- Sign map overlay (at 35% image opacity, 100% sign map) — reuse `SignMapCanvas` at `size={280}`
- Below: classification result in Syne 32px Bold — sky blue if correct, pink if flipped

### 10. Error Handling

- **Model loading failure:** Show "Model failed to load. Check your connection." in DM Sans 16px, pink
- **WebGL not available:** TF.js falls back to CPU. Show a warning: "Running on CPU — may be slower." in DM Sans 14px, muted
- **Empty canvas:** If the student presses ATTACK without drawing, show "Draw a digit first!" hint
- **Misclassification of clean image:** If the model classifies the drawn digit incorrectly BEFORE any attack, show: `"Network thinks this is a 3 (you drew a 7?)"` — this is honest and educational

### 11. Responsive Behavior

- **Default** (≥1440px): Two panels side by side, 280×280 each
- **Compact** (768-1439px): Two panels, 240×240 each
- **Mobile** (<768px): Stack vertically. Drawing canvas full width, result canvas below, ε slider below that.

## File Structure

```
src/
├── beats/
│   └── LabMode.tsx
├── lib/
│   ├── tfjs-model.ts         (model loading + inference)
│   └── digit-preprocessing.ts (canvas → 28×28 pipeline)
public/
└── models/
    └── lenet5_tfjs/
        ├── model.json
        └── group1-shard1of1.bin
precompute/
└── train_keras_lenet5.py     (or convert_to_tfjs.py)
```

## npm Dependencies

```bash
npm install @tensorflow/tfjs
```

TF.js is ~1.5MB gzipped. It should be lazy-loaded (dynamic import) only when the Lab Mode tab is activated — don't include it in the main bundle.

```tsx
const tf = await import('@tensorflow/tfjs');
```

## Verification

- Lab Mode tab opens a drawing canvas
- Drawing with mouse produces smooth white strokes on dark background
- After drawing: forward pass classifies the digit, result shown within 20ms
- "ATTACK" button or ε slider: backward pass runs, sign map + adversarial image shown
- The sign map on the drawn digit follows the stroke edges
- Classification often flips at moderate ε (0.10-0.20) — the attack works on user-drawn digits
- "Clear" resets the canvas
- "Results may vary — live computation" disclaimer is visible
- Handles edge cases: empty canvas, misclassified clean image, missing model
- TF.js is lazy-loaded (not in main bundle)
- Performance: <20ms for forward+backward pass combined (on modern hardware)
- Responsive at all breakpoints
- No console errors
