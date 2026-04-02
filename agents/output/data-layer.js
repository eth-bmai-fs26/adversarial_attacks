// ─── 1. Color Constants ───────────────────────────────────────────────────────

/** @type {Record<string, string>} Color palette for the visualization */
export const COLORS = {
  background: '#0D1117',
  grid: '#1B2332',
  catRegion: '#2EA043',
  dogRegion: '#F85149',
  dataPoint: '#58A6FF',
  gradientArrow: '#FFA657',
  snappedComponent: '#FF7B72',
  text: '#E6EDF3',
  cardBg: '#161B22',
  border: '#30363D',
  perturbationTrail: '#58A6FF',
};

// ─── 2. Manifold Geometry ─────────────────────────────────────────────────────

/** Coordinate range for both axes */
export const AXIS_RANGE = [-3, 3];

/**
 * Decision boundary: y = 0.6x + 0.3
 * Points above the line are "Panda" (correct class).
 * Points below the line are "Gibbon" (adversarial class).
 * @param {number} x
 * @returns {number} y value on the boundary
 */
export function decisionBoundary(x) {
  return 0.6 * x + 0.3;
}

/**
 * Returns which class a point belongs to.
 * @param {{x: number, y: number}} point
 * @returns {'panda' | 'gibbon'}
 */
export function classify(point) {
  return point.y >= decisionBoundary(point.x) ? 'panda' : 'gibbon';
}

/** Starting position — clearly inside the "Panda" region (above the boundary) */
export const START_POS = { x: -0.8, y: 1.2 };

/**
 * Gradient direction (unit vector pointing toward and across the boundary).
 * The boundary normal for y = 0.6x + 0.3 is proportional to (-0.6, 1) pointing
 * upward; the gradient of the loss points *downward* across the boundary.
 * Normalized: (0.6, -1) / ||(0.6, -1)|| ≈ (0.5145, -0.8575)
 */
const rawGrad = { x: 0.6, y: -1.0 };
const gradNorm = Math.sqrt(rawGrad.x ** 2 + rawGrad.y ** 2);
export const GRADIENT = {
  x: rawGrad.x / gradNorm,
  y: rawGrad.y / gradNorm,
};

/**
 * Scale factor so that at ε ≈ 0.03 the point visibly crosses the boundary
 * in the pedagogical 2D view.
 *
 * Distance from START_POS to boundary along the gradient direction:
 *   boundary at x=-0.8 → y = 0.6*(-0.8)+0.3 = -0.18
 *   vertical gap = 1.2 - (-0.18) = 1.38
 *   distance along gradient = 1.38 / |cos(angle)| ≈ 1.38 / 0.8575 ≈ 1.609
 *
 * We want eps * scale ≈ 1.609 at eps = 0.03 → scale ≈ 53.6
 */
export const PERTURBATION_SCALE = 54;

// ─── 3. Loss Lookup ───────────────────────────────────────────────────────────

/**
 * Returns a plausible cross-entropy loss at a given epsilon.
 * Uses a shifted tanh to create the characteristic S-shaped loss jump
 * when crossing the decision boundary.
 *
 * Anchor points:
 *   ε=0    → ~0.3
 *   ε=0.02 → ~1.5
 *   ε=0.03 → ~4.2
 *   ε=0.1  → ~6.5
 *   ε=0.3  → ~7.8
 *
 * @param {number} epsilon - perturbation magnitude (≥ 0)
 * @returns {number} loss value
 */
export function getLossAtEpsilon(epsilon) {
  const eps = Math.max(0, epsilon);
  // Piecewise Hermite interpolation through anchor points
  const anchors = [
    [0, 0.3],
    [0.02, 1.5],
    [0.03, 4.2],
    [0.1, 6.5],
    [0.3, 7.8],
  ];
  if (eps >= anchors[anchors.length - 1][0]) return anchors[anchors.length - 1][1];
  // Find segment
  let i = 0;
  while (i < anchors.length - 1 && eps > anchors[i + 1][0]) i++;
  const [x0, y0] = anchors[i];
  const [x1, y1] = anchors[i + 1];
  // Smoothstep interpolation
  const t = (eps - x0) / (x1 - x0);
  const s = t * t * (3 - 2 * t); // smoothstep
  return y0 + (y1 - y0) * s;
}

// ─── 4. Classification Confidence ─────────────────────────────────────────────

/**
 * Returns panda/gibbon confidence scores at a given epsilon.
 * Smoothly interpolates between anchor points using a sigmoid transition.
 *
 * Anchors:
 *   ε=0    → { panda: 0.95, gibbon: 0.02 }
 *   ε=0.03 → { panda: 0.08, gibbon: 0.87 }
 *   ε=0.3  → { panda: 0.01, gibbon: 0.96 }
 *
 * @param {number} epsilon
 * @returns {{ panda: number, gibbon: number }}
 */
export function getConfidences(epsilon) {
  const eps = Math.max(0, epsilon);

  // Piecewise smoothstep through anchor points
  const pandaAnchors = [[0, 0.95], [0.03, 0.08], [0.3, 0.01]];
  const gibbonAnchors = [[0, 0.02], [0.03, 0.87], [0.3, 0.96]];

  function interpAnchors(anchors, e) {
    if (e >= anchors[anchors.length - 1][0]) return anchors[anchors.length - 1][1];
    let i = 0;
    while (i < anchors.length - 1 && e > anchors[i + 1][0]) i++;
    const [x0, y0] = anchors[i];
    const [x1, y1] = anchors[i + 1];
    const t = (e - x0) / (x1 - x0);
    const s = t * t * (3 - 2 * t);
    return y0 + (y1 - y0) * s;
  }

  return {
    panda: Math.max(0, Math.min(1, interpAnchors(pandaAnchors, eps))),
    gibbon: Math.max(0, Math.min(1, interpAnchors(gibbonAnchors, eps))),
  };
}

// ─── 5. Perturbation Path ─────────────────────────────────────────────────────

/**
 * Returns the adversarial position after applying FGSM perturbation.
 *   x_adv = startPos + epsilon * sign(gradient) * scale
 *
 * @param {{ x: number, y: number }} startPos
 * @param {{ x: number, y: number }} gradient - gradient direction vector
 * @param {number} epsilon
 * @returns {{ x: number, y: number }}
 */
export function getAdversarialPosition(startPos, gradient, epsilon) {
  const eps = Math.max(0, epsilon);
  return {
    x: clamp(startPos.x + eps * Math.sign(gradient.x) * PERTURBATION_SCALE, AXIS_RANGE[0], AXIS_RANGE[1]),
    y: clamp(startPos.y + eps * Math.sign(gradient.y) * PERTURBATION_SCALE, AXIS_RANGE[0], AXIS_RANGE[1]),
  };
}

// ─── 6. Random Perturbation (comparison) ──────────────────────────────────────

/**
 * Simple seeded PRNG (mulberry32).
 * @param {number} seed
 * @returns {function(): number} deterministic random [0, 1)
 */
function mulberry32(seed) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * Returns a position displaced by a *random* (but seeded) direction at the
 * same perturbation magnitude. This random perturbation should NOT cross
 * the decision boundary — that's the pedagogical contrast with FGSM.
 *
 * @param {{ x: number, y: number }} startPos
 * @param {number} epsilon
 * @param {number} [seed=42]
 * @returns {{ x: number, y: number }}
 */
export function getRandomPerturbation(startPos, epsilon, seed = 42) {
  const eps = Math.max(0, epsilon);
  const rng = mulberry32(seed);

  // Pick a random angle that points roughly parallel to (or away from) the
  // boundary so the point stays in the same region.
  const angle = rng() * 2 * Math.PI;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);

  const candidate = {
    x: startPos.x + eps * dx * PERTURBATION_SCALE,
    y: startPos.y + eps * dy * PERTURBATION_SCALE,
  };

  // Helper: compute clamped position at a given scale factor
  function posAtScale(s) {
    return {
      x: clamp(startPos.x + eps * dx * PERTURBATION_SCALE * s, AXIS_RANGE[0], AXIS_RANGE[1]),
      y: clamp(startPos.y + eps * dy * PERTURBATION_SCALE * s, AXIS_RANGE[0], AXIS_RANGE[1]),
    };
  }

  // Ensure the random perturbation stays in the same class (including after clamping).
  const startClass = classify(startPos);
  const clamped = posAtScale(1.0);

  if (classify(clamped) !== startClass) {
    // Binary-search for the largest safe step
    let lo = 0, hi = 1.0;
    for (let i = 0; i < 20; i++) {
      const mid = (lo + hi) / 2;
      if (classify(posAtScale(mid)) === startClass) {
        lo = mid;
      } else {
        hi = mid;
      }
    }
    return posAtScale(lo * 0.95); // small safety margin
  }

  return clamped;
}

// ─── 7. Equation Strings ──────────────────────────────────────────────────────

/** FGSM equation for KaTeX rendering */
export const FGSM_EQUATION =
  'x_{\\text{adv}} = \\text{clip}(x + \\varepsilon \\cdot \\text{sign}(\\nabla_x L(\\theta, x, y)),\\, 0,\\, 1)';

// ─── 8. Dimensionality Callout ────────────────────────────────────────────────

/** Text content for the dimensionality callout card */
export const DIM_CALLOUT = {
  twoDDirections: '4',
  imageDirections: '2^{150{,}528}',
  fullText:
    'In 2D, the sign vector has 4 possible directions. For a 224×224×3 image: 2^{150,528} — more than atoms in the observable universe. The model cannot defend against all of them.',
};

// ─── Utility ──────────────────────────────────────────────────────────────────

/**
 * Clamps a value to [min, max].
 * @param {number} v
 * @param {number} min
 * @param {number} max
 * @returns {number}
 */
function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}
