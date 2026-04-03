import type { ImageData, ModelData, SurfaceData } from '../types';

let standardData: ModelData | null = null;
let robustData: ModelData | null = null;
let surfaceData: SurfaceData | null = null;

export async function loadStandardModel(): Promise<ModelData> {
  if (!standardData) {
    const res = await fetch('/data/standard_model.json');
    standardData = await res.json();
  }
  return standardData!;
}

export async function loadRobustModel(): Promise<ModelData> {
  if (!robustData) {
    const res = await fetch('/data/robust_model.json');
    robustData = await res.json();
  }
  return robustData!;
}

export async function loadSurfaceData(): Promise<SurfaceData> {
  if (!surfaceData) {
    const res = await fetch('/data/3d_surface_data.json');
    surfaceData = await res.json();
  }
  return surfaceData!;
}

export function getImageById(data: ModelData, id: number) {
  return data.images.find(img => img.id === id);
}

/** Interpolate logits at arbitrary epsilon using the precomputed grid */
export function interpolateLogits(
  image: ImageData,
  epsilon: number
): number[] {
  const { epsilon_values, logits_at_eps } = image;
  const step = epsilon_values[1] - epsilon_values[0];
  const idx = epsilon / step;
  const lo = Math.floor(idx);
  const hi = Math.min(lo + 1, epsilon_values.length - 1);
  const t = idx - lo;
  return logits_at_eps[lo].map((v, i) => v * (1 - t) + logits_at_eps[hi][i] * t);
}

/** Compute softmax from logits */
export function softmax(logits: number[]): number[] {
  const max = Math.max(...logits);
  const exps = logits.map(l => Math.exp(l - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map(e => e / sum);
}
