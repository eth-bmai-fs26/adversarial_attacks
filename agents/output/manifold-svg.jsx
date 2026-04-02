import React, { useState, useEffect, useRef, useMemo } from 'react';

// ── Import from Agent A's data layer (fallback constants inline) ────────────
let COLORS, START_POS, GRADIENT, BOUNDARY_SLOPE, BOUNDARY_INTERCEPT,
    getAdversarialPosition, getRandomPerturbation, FGSM_EQUATION;

try {
  const dataLayer = require('./data-layer.js');
  COLORS = dataLayer.COLORS;
  START_POS = dataLayer.START_POS;
  GRADIENT = dataLayer.GRADIENT;
  BOUNDARY_SLOPE = dataLayer.BOUNDARY_SLOPE;
  BOUNDARY_INTERCEPT = dataLayer.BOUNDARY_INTERCEPT;
  getAdversarialPosition = dataLayer.getAdversarialPosition;
  getRandomPerturbation = dataLayer.getRandomPerturbation;
  FGSM_EQUATION = dataLayer.FGSM_EQUATION;
} catch {
  // Fallback: use Agent A spec values if data-layer.js not yet available
  COLORS = {
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
  START_POS = { x: -0.8, y: 1.2 };
  GRADIENT = { x: 0.6, y: -0.8 }; // unit-ish, pointing toward boundary
  BOUNDARY_SLOPE = 0.6;
  BOUNDARY_INTERCEPT = 0.3;

  getAdversarialPosition = (startPos, gradient, epsilon) => {
    const scale = 40; // tuned so ε=0.03 crosses the boundary in 2D view
    return {
      x: startPos.x + epsilon * Math.sign(gradient.x) * scale,
      y: startPos.y + epsilon * Math.sign(gradient.y) * scale,
    };
  };

  getRandomPerturbation = (startPos, epsilon, seed = 42) => {
    // Deterministic pseudo-random angle from seed
    const angle = ((seed * 9301 + 49297) % 233280) / 233280 * Math.PI * 2;
    const scale = 40;
    return {
      x: startPos.x + epsilon * Math.cos(angle) * scale,
      y: startPos.y + epsilon * Math.sin(angle) * scale,
    };
  };

  FGSM_EQUATION = 'x_{\\text{adv}} = \\text{clip}(x + \\varepsilon \\cdot \\text{sign}(\\nabla_x L(\\theta, x, y)),\\, 0,\\, 1)';
}

// ── Coordinate helpers ──────────────────────────────────────────────────────
const DOMAIN = { xMin: -3, yMin: -3, xMax: 3, yMax: 3 };
const RANGE = { w: DOMAIN.xMax - DOMAIN.xMin, h: DOMAIN.yMax - DOMAIN.yMin };

function toSVG(pt, width, height) {
  return {
    x: ((pt.x - DOMAIN.xMin) / RANGE.w) * width,
    y: ((DOMAIN.yMax - pt.y) / RANGE.h) * height, // flip y
  };
}

// Decision boundary: y = slope*x + intercept
function boundaryY(x) {
  return BOUNDARY_SLOPE * x + BOUNDARY_INTERCEPT;
}

function isInPandaRegion(pt) {
  return pt.y > boundaryY(pt.x);
}

// ── Main Component ──────────────────────────────────────────────────────────
export default function ManifoldPlot({ step = 1, epsilon = 0.03, width = 800, height = 600 }) {
  // Animation states
  const [gradientOpacity, setGradientOpacity] = useState(0);
  const [componentPhase, setComponentPhase] = useState('hidden'); // hidden | gradient | snapping | snapped
  const [snapProgress, setSnapProgress] = useState({ x: 0, y: 0 }); // 0→1 for each axis
  const [pathProgress, setPathProgress] = useState(0); // 0→1 for perturbation path
  const prevStepRef = useRef(step);
  const rafRef = useRef(null);

  // ── Derived positions ───────────────────────────────────────────────────
  const startSVG = useMemo(() => toSVG(START_POS, width, height), [width, height]);

  const advPos = useMemo(
    () => getAdversarialPosition(START_POS, GRADIENT, epsilon),
    [epsilon]
  );
  const advSVG = useMemo(() => toSVG(advPos, width, height), [advPos, width, height]);

  // Current data point position (moves at step >= 4)
  const pointSVG = step >= 4 ? advSVG : startSVG;

  // Gradient arrow endpoint (for step 2)
  const gradientLen = 80; // px length of the gradient arrow
  const gradNorm = Math.sqrt(GRADIENT.x ** 2 + GRADIENT.y ** 2) || 1;
  const gradEndSVG = {
    x: startSVG.x + (GRADIENT.x / gradNorm) * gradientLen,
    y: startSVG.y - (GRADIENT.y / gradNorm) * gradientLen, // flip y
  };

  // Component arrow endpoints (for step 3)
  const scale = 40;
  const compXLen = epsilon * Math.sign(GRADIENT.x) * scale;
  const compYLen = epsilon * Math.sign(GRADIENT.y) * scale;
  const compXEndSVG = {
    x: startSVG.x + (compXLen / RANGE.w) * width,
    y: startSVG.y,
  };
  const compYEndSVG = {
    x: startSVG.x,
    y: startSVG.y - (compYLen / RANGE.h) * height, // flip y
  };

  // ── Step transition animations ──────────────────────────────────────────
  useEffect(() => {
    const prev = prevStepRef.current;
    prevStepRef.current = step;

    if (step >= 2 && prev < 2) {
      // Animate gradient arrow fade-in
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
      // Animate component arrows
      setComponentPhase('gradient');
      setTimeout(() => {
        setComponentPhase('snapping');
        const start = performance.now();
        const animate = (now) => {
          const elapsed = now - start;
          const tx = Math.min(elapsed / 400, 1);
          const ty = Math.min(Math.max((elapsed - 200) / 400, 0), 1);
          setSnapProgress({
            x: cubicOvershoot(tx),
            y: cubicOvershoot(ty),
          });
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
      // Animate perturbation path
      setPathProgress(0);
      const start = performance.now();
      const animate = (now) => {
        const t = Math.min((now - start) / 800, 1);
        setPathProgress(easeOut(t));
        if (t < 1) rafRef.current = requestAnimationFrame(animate);
      };
      rafRef.current = requestAnimationFrame(animate);
    }

    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [step]);

  // ── Grid lines ──────────────────────────────────────────────────────────
  const gridLines = useMemo(() => {
    const lines = [];
    for (let v = Math.ceil(DOMAIN.xMin); v <= Math.floor(DOMAIN.xMax); v++) {
      const sx = ((v - DOMAIN.xMin) / RANGE.w) * width;
      lines.push(
        <line key={`vg${v}`} x1={sx} y1={0} x2={sx} y2={height}
          stroke={COLORS.grid} strokeWidth={0.5} />
      );
    }
    for (let v = Math.ceil(DOMAIN.yMin); v <= Math.floor(DOMAIN.yMax); v++) {
      const sy = ((DOMAIN.yMax - v) / RANGE.h) * height;
      lines.push(
        <line key={`hg${v}`} x1={0} y1={sy} x2={width} y2={sy}
          stroke={COLORS.grid} strokeWidth={0.5} />
      );
    }
    return lines;
  }, [width, height]);

  // ── Class region paths ──────────────────────────────────────────────────
  const regionPaths = useMemo(() => {
    // Boundary crosses from left edge to right edge
    const xL = DOMAIN.xMin;
    const xR = DOMAIN.xMax;
    const yL = boundaryY(xL);
    const yR = boundaryY(xR);
    const bL = toSVG({ x: xL, y: yL }, width, height);
    const bR = toSVG({ x: xR, y: yR }, width, height);

    // Panda region: above boundary line
    // Path: top-left → top-right → boundary-right → boundary-left → close
    const pandaPath = `M 0 0 L ${width} 0 L ${bR.x} ${bR.y} L ${bL.x} ${bL.y} Z`;
    // Gibbon region: below boundary line
    const gibbonPath = `M 0 ${height} L ${width} ${height} L ${bR.x} ${bR.y} L ${bL.x} ${bL.y} Z`;

    return { pandaPath, gibbonPath, bL, bR };
  }, [width, height]);

  // ── Label positions (center of each region) ─────────────────────────────
  const pandaLabelPos = toSVG({ x: -1.0, y: 2.2 }, width, height);
  const gibbonLabelPos = toSVG({ x: 1.0, y: -1.8 }, width, height);

  // ── Perturbation path ───────────────────────────────────────────────────
  const pathD = `M ${startSVG.x} ${startSVG.y} L ${advSVG.x} ${advSVG.y}`;
  const pathLen = Math.sqrt((advSVG.x - startSVG.x) ** 2 + (advSVG.y - startSVG.y) ** 2);

  // ── Equation text (fallback if no KaTeX) ────────────────────────────────
  const eqText = 'x_adv = clip(x + \u03B5 \u00B7 sign(\u2207\u2093L), 0, 1)';

  return (
    <svg
      width={width}
      height={height}
      viewBox={`0 0 ${width} ${height}`}
      style={{ fontFamily: "'Inter', sans-serif" }}
    >
      <defs>
        {/* Glow filter */}
        <filter id="glow">
          <feGaussianBlur stdDeviation="4" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        {/* Arrowhead markers */}
        <marker id="arrowGrad" viewBox="0 0 10 10" refX="9" refY="5"
          markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 Z" fill={COLORS.gradientArrow} />
        </marker>
        <marker id="arrowSnap" viewBox="0 0 10 10" refX="9" refY="5"
          markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 Z" fill={COLORS.snappedComponent} />
        </marker>
        <marker id="arrowGradPartial" viewBox="0 0 10 10" refX="9" refY="5"
          markerWidth="8" markerHeight="8" orient="auto-start-reverse">
          <path d="M 0 0 L 10 5 L 0 10 Z" fill={COLORS.gradientArrow} />
        </marker>
      </defs>

      {/* Background */}
      <rect x={0} y={0} width={width} height={height} fill={COLORS.background} />

      {/* Grid */}
      {gridLines}

      {/* Class regions */}
      <path d={regionPaths.pandaPath}
        fill={COLORS.catRegion} fillOpacity={0.15}
        stroke={COLORS.catRegion} strokeWidth={2} />
      <path d={regionPaths.gibbonPath}
        fill={COLORS.dogRegion} fillOpacity={0.15}
        stroke={COLORS.dogRegion} strokeWidth={2} />

      {/* Class labels */}
      <text x={pandaLabelPos.x} y={pandaLabelPos.y}
        fill={COLORS.catRegion} fontSize={42} fontWeight="bold"
        textAnchor="middle" dominantBaseline="middle" opacity={0.7}>
        panda
      </text>
      <text x={gibbonLabelPos.x} y={gibbonLabelPos.y}
        fill={COLORS.dogRegion} fontSize={42} fontWeight="bold"
        textAnchor="middle" dominantBaseline="middle" opacity={0.7}>
        gibbon
      </text>

      {/* ── Step 2: Gradient arrow ─────────────────────────────────── */}
      {step >= 2 && (
        <line
          x1={startSVG.x} y1={startSVG.y}
          x2={gradEndSVG.x} y2={gradEndSVG.y}
          stroke={COLORS.gradientArrow}
          strokeWidth={3.5}
          markerEnd="url(#arrowGrad)"
          opacity={step >= 3 ? 0.2 : gradientOpacity}
          strokeDasharray={step >= 3 ? '6 4' : 'none'}
          style={{ transition: step >= 3 ? 'opacity 400ms ease' : 'none' }}
        />
      )}

      {/* ── Step 3: Component arrows ───────────────────────────────── */}
      {step >= 3 && (() => {
        const xProg = snapProgress.x;
        const yProg = snapProgress.y;
        // Interpolate from gradient-component length to snapped length
        const gradCompX = (GRADIENT.x / gradNorm) * gradientLen;
        const gradCompY = -(GRADIENT.y / gradNorm) * gradientLen;
        const snapCompX = (compXLen / RANGE.w) * width;
        const snapCompY = -(compYLen / RANGE.h) * height;

        const curX = gradCompX + (snapCompX - gradCompX) * xProg;
        const curY = gradCompY + (snapCompY - gradCompY) * yProg;

        const colorX = xProg >= 1 ? COLORS.snappedComponent : COLORS.gradientArrow;
        const colorY = yProg >= 1 ? COLORS.snappedComponent : COLORS.gradientArrow;
        const markerX = xProg >= 1 ? 'url(#arrowSnap)' : 'url(#arrowGradPartial)';
        const markerY = yProg >= 1 ? 'url(#arrowSnap)' : 'url(#arrowGradPartial)';

        const showArrows = epsilon > 0.001;

        return (
          <g>
            {/* X component arrow (horizontal) */}
            {showArrows && (
              <line
                x1={startSVG.x} y1={startSVG.y}
                x2={startSVG.x + curX} y2={startSVG.y}
                stroke={colorX} strokeWidth={3} markerEnd={markerX}
              />
            )}
            {/* Y component arrow (vertical) */}
            {showArrows && (
              <line
                x1={startSVG.x} y1={startSVG.y}
                x2={startSVG.x} y2={startSVG.y + curY}
                stroke={colorY} strokeWidth={3} markerEnd={markerY}
              />
            )}
            {/* Labels */}
            {showArrows && (
              <>
                <text
                  x={startSVG.x + curX / 2}
                  y={startSVG.y - 12}
                  fill={colorX} fontSize={22} textAnchor="middle"
                  fontWeight="bold">
                  {'\u00B1\u03B5'}
                </text>
                <text
                  x={startSVG.x + 16}
                  y={startSVG.y + curY / 2}
                  fill={colorY} fontSize={22} textAnchor="start"
                  fontWeight="bold">
                  {'\u00B1\u03B5'}
                </text>
              </>
            )}
            {/* Epsilon = 0: render dots instead of arrows */}
            {!showArrows && (
              <>
                <circle cx={startSVG.x} cy={startSVG.y} r={4}
                  fill={COLORS.snappedComponent} />
                <text x={startSVG.x + 14} y={startSVG.y - 8}
                  fill={COLORS.snappedComponent} fontSize={20}>
                  \u03B5 = 0
                </text>
              </>
            )}
          </g>
        );
      })()}

      {/* ── Step 4: Perturbation path ──────────────────────────────── */}
      {step >= 4 && epsilon > 0.001 && (
        <line
          x1={startSVG.x} y1={startSVG.y}
          x2={advSVG.x} y2={advSVG.y}
          stroke={COLORS.perturbationTrail}
          strokeWidth={2}
          strokeDasharray="6 4"
          strokeDashoffset={pathLen * (1 - pathProgress)}
          opacity={0.8}
        />
      )}

      {/* ── Step 1+: Data point ────────────────────────────────────── */}
      {step >= 1 && (
        <circle
          cx={pointSVG.x} cy={pointSVG.y} r={18}
          fill={COLORS.dataPoint}
          filter="url(#glow)"
          style={{
            transition: 'cx 600ms ease-out, cy 600ms ease-out',
          }}
        />
      )}

      {/* Original position ghost (when point has moved) */}
      {step >= 4 && epsilon > 0.001 && (
        <circle
          cx={startSVG.x} cy={startSVG.y} r={10}
          fill="none" stroke={COLORS.dataPoint} strokeWidth={1.5}
          strokeDasharray="4 3" opacity={0.4}
        />
      )}

      {/* ── Step 3+: FGSM equation ─────────────────────────────────── */}
      {step >= 3 && (
        <text
          x={width / 2} y={height - 28}
          fill={COLORS.text} fontSize={24}
          textAnchor="middle" fontFamily="'JetBrains Mono', monospace"
          opacity={0.85}>
          {eqText}
        </text>
      )}
    </svg>
  );
}

// ── Easing helpers ────────────────────────────────────────────────────────
function easeOut(t) {
  return 1 - (1 - t) ** 3;
}

function cubicOvershoot(t) {
  // Approximation of cubic-bezier(0.34, 1.56, 0.64, 1)
  if (t >= 1) return 1;
  return 1 - Math.pow(1 - t, 3) + 0.15 * Math.sin(t * Math.PI);
}
