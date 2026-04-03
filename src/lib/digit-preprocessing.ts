/**
 * Preprocessing pipeline: 280×280 drawing canvas → 28×28 MNIST-compatible input.
 *
 * Steps:
 * 1. Extract grayscale from canvas (use red channel — stroke is white on dark bg)
 * 2. Find bounding box of non-zero pixels
 * 3. Crop & scale to fit 20×20 (MNIST convention) with bilinear interpolation
 * 4. Center in 28×28 frame using center of mass
 * 5. Apply 3×3 Gaussian blur (σ=0.5) to match MNIST anti-aliasing
 * 6. Normalize to [0, 1]
 */

const CANVAS_SIZE = 280;
const MNIST_SIZE = 28;
const INNER_SIZE = 20;

/** Gaussian kernel σ=0.5, 3×3 */
const GAUSS_KERNEL = [
  0.0625, 0.125, 0.0625,
  0.125,  0.25,  0.125,
  0.0625, 0.125, 0.0625,
];

export function preprocessDrawnDigit(canvas: HTMLCanvasElement): Float32Array | null {
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;

  const imageData = ctx.getImageData(0, 0, CANVAS_SIZE, CANVAS_SIZE);
  const { data } = imageData;

  // Step 1: Extract grayscale [0,1] — average RGB (stroke is white on dark bg)
  const gray = new Float32Array(CANVAS_SIZE * CANVAS_SIZE);
  for (let i = 0; i < CANVAS_SIZE * CANVAS_SIZE; i++) {
    gray[i] = (data[i * 4] + data[i * 4 + 1] + data[i * 4 + 2]) / (3 * 255);
  }

  // Step 2: Find bounding box
  let minR = CANVAS_SIZE, maxR = -1, minC = CANVAS_SIZE, maxC = -1;
  let massX = 0, massY = 0, totalMass = 0;
  for (let r = 0; r < CANVAS_SIZE; r++) {
    for (let c = 0; c < CANVAS_SIZE; c++) {
      const v = gray[r * CANVAS_SIZE + c];
      if (v > 0.01) {
        if (r < minR) minR = r;
        if (r > maxR) maxR = r;
        if (c < minC) minC = c;
        if (c > maxC) maxC = c;
        massX += c * v;
        massY += r * v;
        totalMass += v;
      }
    }
  }

  // Empty canvas check
  if (maxR < 0 || totalMass < 0.01) return null;

  // Step 3: Crop bounding box
  const bboxW = maxC - minC + 1;
  const bboxH = maxR - minR + 1;

  // Scale to fit within 20×20 maintaining aspect ratio
  const scale = INNER_SIZE / Math.max(bboxW, bboxH);

  const scaledW = Math.round(bboxW * scale);
  const scaledH = Math.round(bboxH * scale);

  // Step 4: Bilinear interpolation downscale
  const scaled = new Float32Array(scaledH * scaledW);
  for (let r = 0; r < scaledH; r++) {
    for (let c = 0; c < scaledW; c++) {
      // Map back to source coordinates
      const srcR = minR + r / scale;
      const srcC = minC + c / scale;

      const r0 = Math.floor(srcR);
      const c0 = Math.floor(srcC);
      const r1 = Math.min(r0 + 1, CANVAS_SIZE - 1);
      const c1 = Math.min(c0 + 1, CANVAS_SIZE - 1);
      const dr = srcR - r0;
      const dc = srcC - c0;

      const v =
        gray[r0 * CANVAS_SIZE + c0] * (1 - dr) * (1 - dc) +
        gray[r0 * CANVAS_SIZE + c1] * (1 - dr) * dc +
        gray[r1 * CANVAS_SIZE + c0] * dr * (1 - dc) +
        gray[r1 * CANVAS_SIZE + c1] * dr * dc;

      scaled[r * scaledW + c] = v;
    }
  }

  // Center in 28×28 using center of mass
  const comX = (massX / totalMass - minC) * scale;
  const comY = (massY / totalMass - minR) * scale;
  const offsetC = Math.round(MNIST_SIZE / 2 - comX);
  const offsetR = Math.round(MNIST_SIZE / 2 - comY);

  const result28 = new Float32Array(MNIST_SIZE * MNIST_SIZE);
  for (let r = 0; r < scaledH; r++) {
    for (let c = 0; c < scaledW; c++) {
      const destR = r + offsetR;
      const destC = c + offsetC;
      if (destR >= 0 && destR < MNIST_SIZE && destC >= 0 && destC < MNIST_SIZE) {
        result28[destR * MNIST_SIZE + destC] = scaled[r * scaledW + c];
      }
    }
  }

  // Step 5: Gaussian blur σ=0.5
  const blurred = new Float32Array(MNIST_SIZE * MNIST_SIZE);
  for (let r = 0; r < MNIST_SIZE; r++) {
    for (let c = 0; c < MNIST_SIZE; c++) {
      let sum = 0;
      for (let kr = -1; kr <= 1; kr++) {
        for (let kc = -1; kc <= 1; kc++) {
          const sr = Math.max(0, Math.min(MNIST_SIZE - 1, r + kr));
          const sc = Math.max(0, Math.min(MNIST_SIZE - 1, c + kc));
          sum += result28[sr * MNIST_SIZE + sc] * GAUSS_KERNEL[(kr + 1) * 3 + (kc + 1)];
        }
      }
      blurred[r * MNIST_SIZE + c] = sum;
    }
  }

  // Step 6: Clamp to [0, 1]
  for (let i = 0; i < 784; i++) {
    blurred[i] = Math.max(0, Math.min(1, blurred[i]));
  }

  return blurred;
}
