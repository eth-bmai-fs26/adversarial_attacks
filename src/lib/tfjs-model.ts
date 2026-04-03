/**
 * TF.js model loading, classification, gradient computation, and FGSM attack.
 * Lazy-loads TensorFlow.js only when Lab Mode is activated.
 */

import { softmax } from './data';

type TF = typeof import('@tensorflow/tfjs');
type LayersModel = import('@tensorflow/tfjs').LayersModel;

let tf: TF | null = null;
let model: LayersModel | null = null;
let backendReady = false;

async function ensureTF(): Promise<TF> {
  if (!tf) {
    tf = await import('@tensorflow/tfjs');
  }
  if (!backendReady) {
    await tf.ready();
    backendReady = true;
  }
  return tf;
}

export async function loadModel(): Promise<LayersModel> {
  const tfjs = await ensureTF();
  if (!model) {
    model = await tfjs.loadLayersModel('/models/lenet5_tfjs/model.json');
  }
  return model;
}

/** Check if WebGL backend is active (vs CPU fallback) */
export async function getBackendInfo(): Promise<{ backend: string; isGPU: boolean }> {
  const tfjs = await ensureTF();
  const backend = tfjs.getBackend();
  return { backend, isGPU: backend === 'webgl' || backend === 'webgpu' };
}

export interface ClassifyResult {
  logits: number[];
  probs: number[];
  predictedClass: number;
  confidence: number;
}

export async function classify(pixels: Float32Array): Promise<ClassifyResult> {
  const tfjs = await ensureTF();
  const m = await loadModel();
  const input = tfjs.tensor4d(Array.from(pixels), [1, 28, 28, 1]);

  try {
    const logitsTensor = m.predict(input) as import('@tensorflow/tfjs').Tensor;
    const logits = Array.from(await logitsTensor.data());
    logitsTensor.dispose();

    const probs = softmax(logits);
    const predictedClass = logits.indexOf(Math.max(...logits));
    const confidence = probs[predictedClass];

    return { logits, probs, predictedClass, confidence };
  } finally {
    input.dispose();
  }
}

export async function computeGradient(
  pixels: Float32Array,
  trueClass: number
): Promise<Float32Array> {
  const tfjs = await ensureTF();
  const m = await loadModel();
  const input = tfjs.tensor4d(Array.from(pixels), [1, 28, 28, 1]);

  try {
    const gradFn = tfjs.grad((x: import('@tensorflow/tfjs').Tensor) => {
      const logits = m.predict(x) as import('@tensorflow/tfjs').Tensor;
      const oneHot = tfjs.oneHot(
        tfjs.tensor1d([trueClass], 'int32'),
        10
      );
      return tfjs.losses.softmaxCrossEntropy(oneHot, logits);
    });

    const grad = gradFn(input);
    const gradArr = new Float32Array(await grad.data());
    grad.dispose();
    return gradArr;
  } finally {
    input.dispose();
  }
}

export interface FGSMResult {
  adversarial: Float32Array;
  signMap: number[];
  deadPixelMask: boolean[];
}

export function fgsmAttack(
  pixels: Float32Array,
  gradient: Float32Array,
  epsilon: number
): FGSMResult {
  // Compute sign map
  const signMap = new Array<number>(784);
  for (let i = 0; i < 784; i++) {
    const g = gradient[i];
    signMap[i] = Math.abs(g) < 1e-4 ? 0 : (g > 0 ? 1 : -1);
  }

  // Dead pixel mask: gradient magnitude < 1% of max
  let maxAbs = 0;
  for (let i = 0; i < 784; i++) {
    const a = Math.abs(gradient[i]);
    if (a > maxAbs) maxAbs = a;
  }
  const threshold = 0.01 * maxAbs;
  const deadPixelMask = new Array<boolean>(784);
  for (let i = 0; i < 784; i++) {
    deadPixelMask[i] = Math.abs(gradient[i]) < threshold;
  }

  // Apply perturbation with clipping
  const adversarial = new Float32Array(784);
  for (let i = 0; i < 784; i++) {
    adversarial[i] = Math.max(0, Math.min(1, pixels[i] + epsilon * signMap[i]));
  }

  return { adversarial, signMap, deadPixelMask };
}
