/**
 * FGSM Adversarial Attack Visualization
 *
 * A self-contained React component that teaches how adversarial examples work
 * by visualizing FGSM (Fast Gradient Sign Method) on a 2D decision manifold.
 * Built from agents A–F of the adversarial-attacks pipeline.
 *
 * No local imports required — everything is inlined.
 */
import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';

// ── Font & KaTeX Loading ────────────────────────────────────────────────────

if (typeof document !== 'undefined') {
  const fontLink = document.createElement('link');
  fontLink.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;700&family=JetBrains+Mono:wght@400;700&display=swap';
  fontLink.rel = 'stylesheet';
  document.head.appendChild(fontLink);

  const katexCss = document.createElement('link');
  katexCss.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';
  katexCss.rel = 'stylesheet';
  document.head.appendChild(katexCss);

  const katexScript = document.createElement('script');
  katexScript.src = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.js';
  katexScript.async = true;
  document.head.appendChild(katexScript);
}

// ═══════════════════════════════════════════════════════════════════════════
// 1. CONSTANTS (Agent A)
// ═══════════════════════════════════════════════════════════════════════════

const COLORS = {
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

const AXIS_RANGE = [-3, 3];
const START_POS = { x: -0.8, y: 1.2 };

const rawGrad = { x: 0.6, y: -1.0 };
const gradNorm = Math.sqrt(rawGrad.x ** 2 + rawGrad.y ** 2);
const GRADIENT = { x: rawGrad.x / gradNorm, y: rawGrad.y / gradNorm };

const PERTURBATION_SCALE = 54;

const FGSM_EQUATION =
  'x_{\\text{adv}} = \\text{clip}(x + \\varepsilon \\cdot \\text{sign}(\\nabla_x L(\\theta, x, y)),\\, 0,\\, 1)';

const DIM_CALLOUT = {
  twoDDirections: '4',
  imageDirections: '2^{150{,}528}',
  fullText:
    'In 2D, the sign vector has 4 possible directions. For a 224×224×3 image: 2^{150,528} — more than atoms in the observable universe. The model cannot defend against all of them.',
};

const BOUNDARY_SLOPE = 0.6;
const BOUNDARY_INTERCEPT = 0.3;

// ═══════════════════════════════════════════════════════════════════════════
// 2. UTILITY FUNCTIONS (Agent A)
// ═══════════════════════════════════════════════════════════════════════════

function clamp(v, min, max) {
  return Math.max(min, Math.min(max, v));
}

function decisionBoundary(x) {
  return BOUNDARY_SLOPE * x + BOUNDARY_INTERCEPT;
}

function classify(point) {
  return point.y >= decisionBoundary(point.x) ? 'panda' : 'gibbon';
}

function getLossAtEpsilon(epsilon) {
  const eps = Math.max(0, epsilon);
  const anchors = [
    [0, 0.3],
    [0.02, 1.5],
    [0.03, 4.2],
    [0.1, 6.5],
    [0.3, 7.8],
  ];
  if (eps >= anchors[anchors.length - 1][0]) return anchors[anchors.length - 1][1];
  let i = 0;
  while (i < anchors.length - 1 && eps > anchors[i + 1][0]) i++;
  const [x0, y0] = anchors[i];
  const [x1, y1] = anchors[i + 1];
  const t = (eps - x0) / (x1 - x0);
  const s = t * t * (3 - 2 * t);
  return y0 + (y1 - y0) * s;
}

function getConfidences(epsilon) {
  const eps = Math.max(0, epsilon);
  const pandaAnchors = [[0, 0.95], [0.03, 0.08], [0.3, 0.01]];
  const gibbonAnchors = [[0, 0.02], [0.03, 0.87], [0.3, 0.96]];

  function interpAnchors(anchors, e) {
    if (e >= anchors[anchors.length - 1][0]) return anchors[anchors.length - 1][1];
    let idx = 0;
    while (idx < anchors.length - 1 && e > anchors[idx + 1][0]) idx++;
    const [xa, ya] = anchors[idx];
    const [xb, yb] = anchors[idx + 1];
    const t = (e - xa) / (xb - xa);
    const ss = t * t * (3 - 2 * t);
    return ya + (yb - ya) * ss;
  }

  return {
    panda: clamp(interpAnchors(pandaAnchors, eps), 0, 1),
    gibbon: clamp(interpAnchors(gibbonAnchors, eps), 0, 1),
  };
}

function getAdversarialPosition(startPos, gradient, epsilon) {
  const eps = Math.max(0, epsilon);
  return {
    x: clamp(startPos.x + eps * Math.sign(gradient.x) * PERTURBATION_SCALE, AXIS_RANGE[0], AXIS_RANGE[1]),
    y: clamp(startPos.y + eps * Math.sign(gradient.y) * PERTURBATION_SCALE, AXIS_RANGE[0], AXIS_RANGE[1]),
  };
}

function mulberry32(seed) {
  let s = seed | 0;
  return function () {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function getRandomPerturbation(startPos, epsilon, seed = 42) {
  const eps = Math.max(0, epsilon);
  const rng = mulberry32(seed);
  const angle = rng() * 2 * Math.PI;
  const dx = Math.cos(angle);
  const dy = Math.sin(angle);

  function posAtScale(sc) {
    return {
      x: clamp(startPos.x + eps * dx * PERTURBATION_SCALE * sc, AXIS_RANGE[0], AXIS_RANGE[1]),
      y: clamp(startPos.y + eps * dy * PERTURBATION_SCALE * sc, AXIS_RANGE[0], AXIS_RANGE[1]),
    };
  }

  const startClass = classify(startPos);
  const clamped = posAtScale(1.0);

  if (classify(clamped) !== startClass) {
    let lo = 0, hi = 1.0;
    for (let iter = 0; iter < 20; iter++) {
      const mid = (lo + hi) / 2;
      if (classify(posAtScale(mid)) === startClass) lo = mid;
      else hi = mid;
    }
    return posAtScale(lo * 0.95);
  }
  return clamped;
}

// ── Easing helpers ──────────────────────────────────────────────────────────

function easeOut(t) {
  return 1 - (1 - t) ** 3;
}

function cubicOvershoot(t) {
  if (t >= 1) return 1;
  return 1 - Math.pow(1 - t, 3) + 0.15 * Math.sin(t * Math.PI);
}

// ── Coordinate helpers (manifold SVG) ───────────────────────────────────────

const DOMAIN = { xMin: -3, yMin: -3, xMax: 3, yMax: 3 };
const RANGE = { w: DOMAIN.xMax - DOMAIN.xMin, h: DOMAIN.yMax - DOMAIN.yMin };

function toSVG(pt, width, height) {
  return {
    x: ((pt.x - DOMAIN.xMin) / RANGE.w) * width,
    y: ((DOMAIN.yMax - pt.y) / RANGE.h) * height,
  };
}

function boundaryY(x) {
  return BOUNDARY_SLOPE * x + BOUNDARY_INTERCEPT;
}

// ═══════════════════════════════════════════════════════════════════════════
// 3. SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════

// ── Perturbation Heatmap (Agent C) ──────────────────────────────────────────

function seededRandom(seed) {
  let s = seed;
  return () => {
    s = (s * 16807 + 0) % 2147483647;
    return (s - 1) / 2147483646;
  };
}

function PerturbationHeatmap() {
  const cells = [];
  const rand = seededRandom(42);
  const size = 8;
  const cellPx = 200 / size;

  for (let r = 0; r < size; r++) {
    for (let c = 0; c < size; c++) {
      const v = rand() * 2 - 1;
      let color;
      if (v > 0.15) {
        const t = Math.min(v / 1, 1);
        color = `rgba(255, 123, 114, ${0.3 + t * 0.7})`;
      } else if (v < -0.15) {
        const t = Math.min(-v / 1, 1);
        color = `rgba(88, 166, 255, ${0.3 + t * 0.7})`;
      } else {
        color = '#0D1117';
      }
      cells.push(
        <rect key={`${r}-${c}`} x={c * cellPx} y={r * cellPx}
          width={cellPx} height={cellPx} fill={color} />
      );
    }
  }
  return (
    <svg width="200" height="200" viewBox="0 0 200 200">
      <rect width="200" height="200" fill="#0D1117" />
      {cells}
    </svg>
  );
}

// ── Equation Display (Agent C) ──────────────────────────────────────────────

function EquationDisplay() {
  const ref = useRef(null);
  const [usedKatex, setUsedKatex] = useState(false);

  useEffect(() => {
    function tryRender() {
      if (typeof window !== 'undefined' && window.katex && ref.current) {
        try {
          window.katex.render(FGSM_EQUATION, ref.current, { throwOnError: false });
          setUsedKatex(true);
        } catch { /* fallback */ }
      }
    }
    tryRender();
    // Retry after KaTeX script loads
    const timer = setTimeout(tryRender, 1000);
    return () => clearTimeout(timer);
  }, []);

  if (usedKatex) {
    return <div ref={ref} style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 24, color: COLORS.text, overflowX: 'auto' }} />;
  }
  return (
    <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 24, color: COLORS.text, overflowX: 'auto' }}>
      x<sub>adv</sub> = clip(x + &epsilon; &middot; sign(&nabla;<sub>x</sub>L(&theta;, x, y)), 0, 1)
    </div>
  );
}

// ── Confidence Bar (Agent C) ────────────────────────────────────────────────

function ConfidenceBar({ label, value, color, animate }) {
  const [barWidth, setBarWidth] = useState(0);

  useEffect(() => {
    if (animate) {
      setBarWidth(0);
      const raf = requestAnimationFrame(() => setBarWidth(value * 100));
      return () => cancelAnimationFrame(raf);
    }
    setBarWidth(value * 100);
  }, [value, animate]);

  return (
    <div style={{ width: 200, marginTop: 4 }}>
      <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, color: COLORS.text, textAlign: 'right', marginTop: 4 }}>
        {label}: {Math.round(value * 100)}%
      </div>
      <div style={{ height: 8, borderRadius: 4, background: '#1B2332', width: '100%', marginTop: 6 }}>
        <div style={{ height: '100%', borderRadius: 4, transition: 'width 300ms ease-out', width: `${barWidth}%`, background: color }} />
      </div>
    </div>
  );
}

// ── ManifoldPlot (Agent B) ──────────────────────────────────────────────────

function ManifoldPlot({ step = 1, epsilon = 0.03, width = 800, height = 600 }) {
  const [gradientOpacity, setGradientOpacity] = useState(0);
  const [snapProgress, setSnapProgress] = useState({ x: 0, y: 0 });
  const [componentPhase, setComponentPhase] = useState('hidden');
  const [pathProgress, setPathProgress] = useState(0);
  const prevStepRef = useRef(step);
  const rafRef = useRef(null);

  const startSVG = useMemo(() => toSVG(START_POS, width, height), [width, height]);
  const advPos = useMemo(() => getAdversarialPosition(START_POS, GRADIENT, epsilon), [epsilon]);
  const advSVG = useMemo(() => toSVG(advPos, width, height), [advPos, width, height]);
  const pointSVG = step >= 4 ? advSVG : startSVG;

  const gradientLen = 80;
  const gNorm = Math.sqrt(GRADIENT.x ** 2 + GRADIENT.y ** 2) || 1;
  const gradEndSVG = {
    x: startSVG.x + (GRADIENT.x / gNorm) * gradientLen,
    y: startSVG.y - (GRADIENT.y / gNorm) * gradientLen,
  };

  const compScale = 40;
  const compXLen = epsilon * Math.sign(GRADIENT.x) * compScale;
  const compYLen = epsilon * Math.sign(GRADIENT.y) * compScale;

  // Step transition animations
  useEffect(() => {
    const prev = prevStepRef.current;
    prevStepRef.current = step;

    if (step >= 2 && prev < 2) {
      setGradientOpacity(0);
      const start = performance.now();
      const animate = (now) => {
        const t = Math.min((now - start) / 600, 1);
        setGradientOpacity(easeOut(t));
        if (t < 1) rafRef.current = requestAnimationFrame(animate);
      };
      rafRef.current = requestAnimationFrame(animate);
    }

    if (step >= 3 && prev < 3) {
      setComponentPhase('gradient');
      setTimeout(() => {
        setComponentPhase('snapping');
        const start = performance.now();
        const animate = (now) => {
          const elapsed = now - start;
          const tx = Math.min(elapsed / 400, 1);
          const ty = Math.min(Math.max((elapsed - 200) / 400, 0), 1);
          setSnapProgress({ x: cubicOvershoot(tx), y: cubicOvershoot(ty) });
          if (tx < 1 || ty < 1) {
            rafRef.current = requestAnimationFrame(animate);
          } else {
            setComponentPhase('snapped');
          }
        };
        rafRef.current = requestAnimationFrame(animate);
      }, 300);
    }

    if (step >= 4 && prev < 4) {
      setPathProgress(0);
      const start = performance.now();
      const animate = (now) => {
        const t = Math.min((now - start) / 800, 1);
        setPathProgress(easeOut(t));
        if (t < 1) rafRef.current = requestAnimationFrame(animate);
      };
      rafRef.current = requestAnimationFrame(animate);
    }

    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [step]);

  // Grid lines
  const gridLines = useMemo(() => {
    const lines = [];
    for (let v = Math.ceil(DOMAIN.xMin); v <= Math.floor(DOMAIN.xMax); v++) {
      const sx = ((v - DOMAIN.xMin) / RANGE.w) * width;
      lines.push(<line key={`vg${v}`} x1={sx} y1={0} x2={sx} y2={height} stroke={COLORS.grid} strokeWidth={0.5} />);
    }
    for (let v = Math.ceil(DOMAIN.yMin); v <= Math.floor(DOMAIN.yMax); v++) {
      const sy = ((DOMAIN.yMax - v) / RANGE.h) * height;
      lines.push(<line key={`hg${v}`} x1={0} y1={sy} x2={width} y2={sy} stroke={COLORS.grid} strokeWidth={0.5} />);
    }
    return lines;
  }, [width, height]);

  // Region paths
  const regionPaths = useMemo(() => {
    const xL = DOMAIN.xMin, xR = DOMAIN.xMax;
    const yL = boundaryY(xL), yR = boundaryY(xR);
    const bL = toSVG({ x: xL, y: yL }, width, height);
    const bR = toSVG({ x: xR, y: yR }, width, height);
    const pandaPath = `M 0 0 L ${width} 0 L ${bR.x} ${bR.y} L ${bL.x} ${bL.y} Z`;
    const gibbonPath = `M 0 ${height} L ${width} ${height} L ${bR.x} ${bR.y} L ${bL.x} ${bL.y} Z`;
    return { pandaPath, gibbonPath, bL, bR };
  }, [width, height]);

  const pandaLabelPos = toSVG({ x: -1.0, y: 2.2 }, width, height);
  const gibbonLabelPos = toSVG({ x: 1.0, y: -1.8 }, width, height);

  const pathLen = Math.sqrt((advSVG.x - startSVG.x) ** 2 + (advSVG.y - startSVG.y) ** 2);
  const showArrows = epsilon > 0.001;

  const eqText = 'x_adv = clip(x + \u03B5 \u00B7 sign(\u2207\u2093L), 0, 1)';

  return (
    <svg width="100%" height="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet"
      style={{ fontFamily: "'Inter', sans-serif" }}>
      <defs>
        <filter id="glow">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
        <marker id="arrowGrad" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 Z" fill={COLORS.gradientArrow} />
        </marker>
        <marker id="arrowSnap" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 Z" fill={COLORS.snappedComponent} />
        </marker>
        <marker id="arrowGradPartial" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 Z" fill={COLORS.gradientArrow} />
        </marker>
      </defs>

      <rect x={0} y={0} width={width} height={height} fill={COLORS.background} />
      {gridLines}

      <path d={regionPaths.pandaPath} fill={COLORS.catRegion} fillOpacity={0.15} stroke={COLORS.catRegion} strokeWidth={2} />
      <path d={regionPaths.gibbonPath} fill={COLORS.dogRegion} fillOpacity={0.15} stroke={COLORS.dogRegion} strokeWidth={2} />

      <text x={pandaLabelPos.x} y={pandaLabelPos.y} fill={COLORS.catRegion} fontSize={42} fontWeight="bold"
        textAnchor="middle" dominantBaseline="middle" opacity={0.7}>panda</text>
      <text x={gibbonLabelPos.x} y={gibbonLabelPos.y} fill={COLORS.dogRegion} fontSize={42} fontWeight="bold"
        textAnchor="middle" dominantBaseline="middle" opacity={0.7}>gibbon</text>

      {/* Step 2: Gradient arrow */}
      {step >= 2 && (
        <line x1={startSVG.x} y1={startSVG.y} x2={gradEndSVG.x} y2={gradEndSVG.y}
          stroke={COLORS.gradientArrow} strokeWidth={3.5} markerEnd="url(#arrowGrad)"
          opacity={step >= 3 ? 0.2 : gradientOpacity}
          strokeDasharray={step >= 3 ? '6 4' : 'none'}
          style={{ transition: step >= 3 ? 'opacity 400ms ease' : 'none' }} />
      )}

      {/* Step 3: Component arrows */}
      {step >= 3 && (() => {
        const xProg = snapProgress.x;
        const yProg = snapProgress.y;
        const gradCompX = (GRADIENT.x / gNorm) * gradientLen;
        const gradCompY = -(GRADIENT.y / gNorm) * gradientLen;
        const snapCompX = (compXLen / RANGE.w) * width;
        const snapCompY = -(compYLen / RANGE.h) * height;
        const curX = gradCompX + (snapCompX - gradCompX) * xProg;
        const curY = gradCompY + (snapCompY - gradCompY) * yProg;
        const colorX = xProg >= 1 ? COLORS.snappedComponent : COLORS.gradientArrow;
        const colorY = yProg >= 1 ? COLORS.snappedComponent : COLORS.gradientArrow;
        const markerX = xProg >= 1 ? 'url(#arrowSnap)' : 'url(#arrowGradPartial)';
        const markerY = yProg >= 1 ? 'url(#arrowSnap)' : 'url(#arrowGradPartial)';

        return (
          <g>
            {showArrows && (
              <>
                <line x1={startSVG.x} y1={startSVG.y} x2={startSVG.x + curX} y2={startSVG.y}
                  stroke={colorX} strokeWidth={3} markerEnd={markerX} />
                <line x1={startSVG.x} y1={startSVG.y} x2={startSVG.x} y2={startSVG.y + curY}
                  stroke={colorY} strokeWidth={3} markerEnd={markerY} />
                <text x={startSVG.x + curX / 2} y={startSVG.y - 12} fill={colorX} fontSize={22}
                  textAnchor="middle" fontWeight="bold">{'\u00B1\u03B5'}</text>
                <text x={startSVG.x + 16} y={startSVG.y + curY / 2} fill={colorY} fontSize={22}
                  textAnchor="start" fontWeight="bold">{'\u00B1\u03B5'}</text>
              </>
            )}
            {!showArrows && (
              <>
                <circle cx={startSVG.x} cy={startSVG.y} r={4} fill={COLORS.snappedComponent} />
                <text x={startSVG.x + 14} y={startSVG.y - 8} fill={COLORS.snappedComponent} fontSize={20}>{'\u03B5 = 0'}</text>
              </>
            )}
          </g>
        );
      })()}

      {/* Step 4: Perturbation path */}
      {step >= 4 && epsilon > 0.001 && (
        <line x1={startSVG.x} y1={startSVG.y} x2={advSVG.x} y2={advSVG.y}
          stroke={COLORS.perturbationTrail} strokeWidth={2} strokeDasharray="6 4"
          strokeDashoffset={pathLen * (1 - pathProgress)} opacity={0.8} />
      )}

      {/* Data point */}
      {step >= 1 && (
        <circle cx={pointSVG.x} cy={pointSVG.y} r={18} fill={COLORS.dataPoint} filter="url(#glow)"
          style={{ transition: 'cx 600ms ease-out, cy 600ms ease-out' }} />
      )}

      {/* Original position ghost */}
      {step >= 4 && epsilon > 0.001 && (
        <circle cx={startSVG.x} cy={startSVG.y} r={10} fill="none" stroke={COLORS.dataPoint}
          strokeWidth={1.5} strokeDasharray="4 3" opacity={0.4} />
      )}

      {/* FGSM equation in SVG */}
      {step >= 3 && (
        <text x={width / 2} y={height - 28} fill={COLORS.text} fontSize={24}
          textAnchor="middle" fontFamily="'JetBrains Mono', monospace" opacity={0.85}>
          {eqText}
        </text>
      )}
    </svg>
  );
}

// ── Random vs FGSM Inset (Agent E — created inline) ─────────────────────────

function RandomVsFgsmInset({ epsilon }) {
  const insetW = 200;
  const insetH = 150;
  const advPos = getAdversarialPosition(START_POS, GRADIENT, epsilon);
  const randPos = getRandomPerturbation(START_POS, epsilon);

  const origin = toSVG(START_POS, insetW, insetH);
  const fgsmPt = toSVG(advPos, insetW, insetH);
  const randPt = toSVG(randPos, insetW, insetH);

  // Decision boundary for the inset
  const bL = toSVG({ x: DOMAIN.xMin, y: boundaryY(DOMAIN.xMin) }, insetW, insetH);
  const bR = toSVG({ x: DOMAIN.xMax, y: boundaryY(DOMAIN.xMax) }, insetW, insetH);

  return (
    <div style={{ background: COLORS.cardBg, borderRadius: 8, padding: 12, border: `1px solid ${COLORS.border}` }}>
      <div style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, color: '#94A3B8', marginBottom: 8 }}>
        Random vs FGSM
      </div>
      <svg width={insetW} height={insetH} viewBox={`0 0 ${insetW} ${insetH}`}>
        <rect width={insetW} height={insetH} fill={COLORS.background} rx={4} />
        {/* Decision boundary */}
        <line x1={bL.x} y1={bL.y} x2={bR.x} y2={bR.y} stroke={COLORS.text} strokeWidth={1} opacity={0.3} strokeDasharray="4 3" />
        {/* Random displacement vector */}
        <line x1={origin.x} y1={origin.y} x2={randPt.x} y2={randPt.y}
          stroke="#94A3B8" strokeWidth={2} />
        <circle cx={randPt.x} cy={randPt.y} r={5} fill="#94A3B8" />
        {/* FGSM displacement vector */}
        <line x1={origin.x} y1={origin.y} x2={fgsmPt.x} y2={fgsmPt.y}
          stroke={COLORS.snappedComponent} strokeWidth={2} />
        <circle cx={fgsmPt.x} cy={fgsmPt.y} r={5} fill={COLORS.snappedComponent} />
        {/* Origin */}
        <circle cx={origin.x} cy={origin.y} r={6} fill={COLORS.dataPoint} />
        {/* Labels */}
        <text x={randPt.x + 8} y={randPt.y - 6} fill="#94A3B8" fontSize={14} fontFamily="'Inter', sans-serif">random</text>
        <text x={fgsmPt.x + 8} y={fgsmPt.y - 6} fill={COLORS.snappedComponent} fontSize={14} fontFamily="'Inter', sans-serif">FGSM</text>
      </svg>
    </div>
  );
}

// ── Epsilon Slider (Agent E — created inline) ───────────────────────────────

const SLIDER_TICKS = [0, 0.01, 0.03, 0.1, 0.3];

function EpsilonSlider({ epsilon, onEpsilonChange }) {
  // Logarithmic-feel mapping: use a power curve for the slider
  const toSlider = (eps) => {
    if (eps <= 0) return 0;
    return Math.pow(eps / 0.3, 0.4);
  };
  const fromSlider = (val) => {
    if (val <= 0) return 0;
    return 0.3 * Math.pow(val, 1 / 0.4);
  };

  const sliderVal = toSlider(epsilon);

  const handleChange = (e) => {
    const raw = parseFloat(e.target.value);
    const eps = Math.round(fromSlider(raw) * 10000) / 10000;
    onEpsilonChange(clamp(eps, 0, 0.3));
  };

  return (
    <div style={{ background: COLORS.cardBg, borderRadius: 8, padding: 16, border: `1px solid ${COLORS.border}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginBottom: 8 }}>
        <span style={{ fontFamily: "'Inter', sans-serif", fontSize: 20, color: '#94A3B8' }}>
          Perturbation &epsilon;
        </span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 28, color: COLORS.text, fontWeight: 'bold' }}>
          {epsilon.toFixed(3)}
        </span>
      </div>
      <input
        type="range" min="0" max="1" step="0.001"
        value={sliderVal}
        onChange={handleChange}
        style={{
          width: '100%', height: 6, appearance: 'none', background: '#1B2332',
          borderRadius: 3, outline: 'none', cursor: 'pointer',
          accentColor: COLORS.dataPoint,
        }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
        {SLIDER_TICKS.map((tick) => (
          <span key={tick} style={{
            fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: '#94A3B8',
            cursor: 'pointer', userSelect: 'none',
          }} onClick={() => onEpsilonChange(tick)}>
            {tick}
          </span>
        ))}
      </div>
    </div>
  );
}

// ── RightPanel (Agent C) ────────────────────────────────────────────────────

const fadeStyle = (step, minStep) =>
  step >= minStep
    ? { opacity: 1, transform: 'translateY(0)', transition: 'opacity 400ms ease, transform 400ms ease' }
    : { opacity: 0, transform: 'translateY(12px)', transition: 'opacity 400ms ease, transform 400ms ease', pointerEvents: 'none' };

function RightPanel({ step = 1, epsilon = 0, loss = 0.3, confidences = { panda: 0.95, gibbon: 0.02 } }) {
  const prevLossRef = useRef(loss);
  const [lossFlash, setLossFlash] = useState(null);
  const [step5Entered, setStep5Entered] = useState(false);

  useEffect(() => {
    const prev = prevLossRef.current;
    prevLossRef.current = loss;
    if (prev === loss) return;
    setLossFlash(loss > prev ? '#FF7B72' : '#2EA043');
    const timer = setTimeout(() => setLossFlash(null), 300);
    return () => clearTimeout(timer);
  }, [loss]);

  useEffect(() => {
    if (step >= 5 && !step5Entered) setStep5Entered(true);
  }, [step, step5Entered]);

  return (
    <div style={{
      height: '100%', width: '100%', background: COLORS.background, padding: 24, boxSizing: 'border-box',
      fontFamily: "'Inter', sans-serif", display: 'flex', flexDirection: 'column', gap: 24, overflow: 'auto',
    }}>
      {/* Loss readout (step >= 1) */}
      <div style={fadeStyle(step, 1)}>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 20, color: '#94A3B8', margin: 0 }}>Loss</p>
        <p style={{
          fontFamily: "'JetBrains Mono', monospace", fontSize: 36, color: lossFlash || COLORS.text,
          margin: 0, transition: 'color 300ms ease',
        }}>
          {loss.toFixed(2)}
        </p>
      </div>

      {/* FGSM Equation (step >= 3) */}
      <div style={fadeStyle(step, 3)}>
        <EquationDisplay />
      </div>

      {/* Image Triplet (step >= 5) */}
      <div style={fadeStyle(step, 5)}>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <div>
            <div style={{ width: 200, border: `1px solid ${COLORS.border}`, borderRadius: 8, overflow: 'hidden', textAlign: 'center' }}>
              <div style={{ width: '100%', height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1E293B' }}>
                <span style={{ fontSize: 80 }}>&#x1F43C;</span>
              </div>
            </div>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, color: '#94A3B8', padding: '8px 0', margin: 0 }}>Original</p>
            <ConfidenceBar label="panda" value={confidences.panda} color="#2EA043" animate={step5Entered} />
          </div>

          <div>
            <div style={{ width: 200, border: `1px solid ${COLORS.border}`, borderRadius: 8, overflow: 'hidden', textAlign: 'center' }}>
              <div style={{ width: '100%', height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1E293B', padding: 0 }}>
                <PerturbationHeatmap />
              </div>
            </div>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, color: '#94A3B8', padding: '8px 0', margin: 0 }}>Perturbation (&times;10)</p>
          </div>

          <div>
            <div style={{ width: 200, border: `1px solid ${COLORS.border}`, borderRadius: 8, overflow: 'hidden', textAlign: 'center' }}>
              <div style={{ width: '100%', height: 200, display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#1E293B', position: 'relative' }}>
                <span style={{ fontSize: 80 }}>&#x1F43C;</span>
                <div style={{ position: 'absolute', inset: 0, background: 'rgba(255, 123, 114, 0.06)', pointerEvents: 'none' }} />
              </div>
            </div>
            <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 16, color: '#94A3B8', padding: '8px 0', margin: 0 }}>Adversarial</p>
            <ConfidenceBar label="gibbon" value={confidences.gibbon} color="#F85149" animate={step5Entered} />
          </div>
        </div>
      </div>

      {/* Citation (step >= 5) */}
      <div style={fadeStyle(step, 5)}>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 14, fontStyle: 'italic', color: '#94A3B8', margin: 0 }}>
          Goodfellow et al., 2015
        </p>
      </div>

      {/* Dimensionality Callout (step >= 6) */}
      <div style={{
        background: COLORS.cardBg, borderRadius: 12, padding: 32,
        transition: 'opacity 600ms ease, transform 600ms ease',
        ...(step >= 6
          ? { opacity: 1, transform: 'translateY(0)' }
          : { opacity: 0, transform: 'translateY(12px)', pointerEvents: 'none' }),
      }}>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 24, color: COLORS.text, margin: 0, lineHeight: 1.5 }}>
          In 2D, the sign vector has{' '}
          <span style={{ fontSize: 32, color: COLORS.snappedComponent, fontWeight: 700 }}>{DIM_CALLOUT.twoDDirections}</span>{' '}
          possible directions.
        </p>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 24, color: COLORS.text, margin: 0, lineHeight: 1.5 }}>
          For a 224&times;224&times;3 image:{' '}
          <span style={{ fontSize: 32, color: COLORS.snappedComponent, fontWeight: 700 }}>
            2<sup>150,528</sup>
          </span>
        </p>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 24, color: COLORS.text, margin: 0, lineHeight: 1.5 }}>
          &mdash; more than atoms in the observable universe.
        </p>
        <p style={{ fontFamily: "'Inter', sans-serif", fontSize: 24, color: COLORS.text, margin: 0, lineHeight: 1.5 }}>
          The model cannot defend against all of them.
        </p>
      </div>
    </div>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// 4. MAIN COMPONENT (Agent D + integration)
// ═══════════════════════════════════════════════════════════════════════════

const DURATIONS = { 1: 600, 2: 400, 3: 800, 4: 300, 5: 600 };

const STEP_DESCRIPTIONS = {
  1: 'A correctly classified image in feature space',
  2: 'The gradient points toward higher loss',
  3: 'Each dimension independently chooses \u00B1\u03B5',
  4: 'The perturbation crosses the decision boundary',
  5: 'The images look identical to us',
  6: 'High dimensions make this unavoidable',
};

export default function AdversarialAttackViz() {
  const [step, setStep] = useState(1);
  const [animationPhase, setAnimationPhase] = useState('active');
  const [epsilon, setEpsilon] = useState(0.03);
  const timerRef = useRef(null);

  const canAdvance = animationPhase !== 'entering';

  // Derived data
  const loss = useMemo(() => getLossAtEpsilon(epsilon), [epsilon]);
  const confidences = useMemo(() => getConfidences(epsilon), [epsilon]);

  const advanceStep = useCallback(() => {
    if (!canAdvance || step >= 6) return;
    setAnimationPhase('entering');
    const duration = DURATIONS[step] || 500;
    setStep((s) => s + 1);
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setAnimationPhase('active');
      timerRef.current = null;
    }, duration);
  }, [canAdvance, step]);

  const resetToStep = useCallback((n) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setStep(clamp(n, 1, 6));
    setAnimationPhase('active');
  }, []);

  useEffect(() => {
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, []);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      switch (e.key) {
        case 'ArrowRight':
        case ' ':
          e.preventDefault();
          if (step === 6) resetToStep(1);
          else advanceStep();
          break;
        case 'ArrowLeft':
          e.preventDefault();
          if (step > 1) resetToStep(step - 1);
          break;
        case 'r':
        case 'R':
          e.preventDefault();
          resetToStep(1);
          break;
        default: break;
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, advanceStep, resetToStep]);

  const handleButtonClick = useCallback(() => {
    if (step === 6) resetToStep(1);
    else advanceStep();
  }, [step, advanceStep, resetToStep]);

  const isDisabled = !canAdvance;
  const buttonText = step === 6 ? 'Reset \u21BA' : 'Next Step \u2192';

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100vh', background: COLORS.background, position: 'relative' }}>
      {/* Main content area */}
      <div style={{ display: 'flex', flex: 1, minHeight: 0 }}>
        {/* Left panel: manifold visualization (60%) */}
        <div style={{ width: '60%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
          <div style={{ flex: 1, minHeight: 0 }}>
            <ManifoldPlot step={step} epsilon={epsilon} width={800} height={600} />
          </div>
          {/* Epsilon slider + Random vs FGSM inset (step >= 4) */}
          {step >= 4 && (
            <div style={{
              padding: '12px 24px', display: 'flex', gap: 16, alignItems: 'flex-start',
              opacity: 1, transition: 'opacity 400ms ease',
            }}>
              <div style={{ flex: 1 }}>
                <EpsilonSlider epsilon={epsilon} onEpsilonChange={setEpsilon} />
              </div>
              <RandomVsFgsmInset epsilon={epsilon} />
            </div>
          )}
        </div>

        {/* Right panel: info (40%) */}
        <div style={{ width: '40%', overflow: 'auto' }}>
          <RightPanel step={step} epsilon={epsilon} loss={loss} confidences={confidences} />
        </div>
      </div>

      {/* Bottom bar */}
      <div style={{
        height: 80, background: COLORS.cardBg, borderTop: `1px solid ${COLORS.grid}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 32,
        fontFamily: "'Inter', sans-serif", flexShrink: 0,
      }}>
        {/* Step indicator dots */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {[1, 2, 3, 4, 5, 6].map((s) => (
            <div key={s} style={{
              width: 12, height: 12, borderRadius: '50%',
              background: s === step ? COLORS.dataPoint : s < step ? 'transparent' : COLORS.grid,
              border: s <= step ? `2px solid ${COLORS.dataPoint}` : `2px solid ${COLORS.grid}`,
              transition: 'all 300ms ease',
            }} />
          ))}
        </div>

        {/* Next Step / Reset button */}
        <button onClick={handleButtonClick} disabled={isDisabled} style={{
          background: COLORS.grid, color: COLORS.text, border: 'none',
          padding: '16px 32px', borderRadius: 8, fontFamily: "'Inter', sans-serif",
          fontSize: 20, fontWeight: 'bold',
          cursor: isDisabled ? 'not-allowed' : 'pointer',
          opacity: isDisabled ? 0.5 : 1,
          transition: 'background 200ms ease, opacity 200ms ease',
        }}
          onMouseEnter={(e) => { if (!isDisabled) e.currentTarget.style.background = '#2D3748'; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = COLORS.grid; }}
        >
          {buttonText}
        </button>

        {/* Step description */}
        <div style={{ fontSize: 16, color: '#94A3B8', maxWidth: 300, fontFamily: "'Inter', sans-serif" }}>
          {STEP_DESCRIPTIONS[step]}
        </div>
      </div>
    </div>
  );
}
