import React, { useEffect, useRef, useState } from 'react';

/**
 * Try to import data layer constants; fall back to inline defaults.
 */
let FGSM_EQUATION, DIM_CALLOUT;
try {
  const dataLayer = require('./data-layer.js');
  FGSM_EQUATION = dataLayer.FGSM_EQUATION;
  DIM_CALLOUT = dataLayer.DIM_CALLOUT;
} catch {
  FGSM_EQUATION = 'x_{\\text{adv}} = \\text{clip}(x + \\varepsilon \\cdot \\text{sign}(\\nabla_x L(\\theta, x, y)),\\, 0,\\, 1)';
  DIM_CALLOUT = {
    twoDDirections: '4',
    imageDirections: '2^{150{,}528}',
    fullText: 'In 2D, the sign vector has 4 possible directions. For a 224×224×3 image: 2^{150,528} — more than atoms in the observable universe. The model cannot defend against all of them.',
  };
}

/* ─── Styles ────────────────────────────────────────────── */

const styles = {
  container: {
    height: '100%',
    width: '100%',
    background: '#0D1117',
    padding: 24,
    boxSizing: 'border-box',
    fontFamily: "'Inter', sans-serif",
    display: 'flex',
    flexDirection: 'column',
    gap: 24,
    overflow: 'auto',
  },

  /* Loss readout */
  lossLabel: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 20,
    color: '#94A3B8',
    margin: 0,
  },
  lossValue: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 36,
    color: '#E6EDF3',
    margin: 0,
    transition: 'color 300ms ease',
  },

  /* Equation */
  equation: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 24,
    color: '#E6EDF3',
    overflowX: 'auto',
  },

  /* Image triplet */
  tripletRow: {
    display: 'flex',
    gap: 12,
    justifyContent: 'center',
    flexWrap: 'wrap',
  },
  card: {
    width: 200,
    border: '1px solid #30363D',
    borderRadius: 8,
    overflow: 'hidden',
    textAlign: 'center',
    flexShrink: 0,
  },
  cardImage: {
    width: '100%',
    height: 200,
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    background: '#1E293B',
  },
  cardLabel: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 16,
    color: '#94A3B8',
    padding: '8px 0',
    margin: 0,
  },

  /* Confidence bar */
  barTrack: {
    height: 8,
    borderRadius: 4,
    background: '#1B2332',
    width: '100%',
    marginTop: 6,
  },
  barFill: {
    height: '100%',
    borderRadius: 4,
    transition: 'width 300ms ease-out',
  },
  barLabel: {
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: 16,
    color: '#E6EDF3',
    textAlign: 'right',
    marginTop: 4,
  },

  /* Citation */
  citation: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 14,
    fontStyle: 'italic',
    color: '#94A3B8',
    margin: 0,
  },

  /* Dimensionality callout */
  calloutCard: {
    background: '#161B22',
    borderRadius: 12,
    padding: 32,
    transition: 'opacity 600ms ease, transform 600ms ease',
  },
  calloutText: {
    fontFamily: "'Inter', sans-serif",
    fontSize: 24,
    color: '#E6EDF3',
    margin: 0,
    lineHeight: 1.5,
  },
  calloutBold: {
    fontSize: 32,
    color: '#FF7B72',
    fontWeight: 700,
  },

  /* Fade-in helper */
  hidden: {
    opacity: 0,
    transform: 'translateY(12px)',
    transition: 'opacity 400ms ease, transform 400ms ease',
    pointerEvents: 'none',
  },
  visible: {
    opacity: 1,
    transform: 'translateY(0)',
    transition: 'opacity 400ms ease, transform 400ms ease',
  },
};

/* ─── Perturbation heatmap SVG ──────────────────────────── */

// Deterministic pseudo-random for heatmap cells
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
      const v = rand() * 2 - 1; // -1..1
      let color;
      if (v > 0.15) {
        // red tones
        const t = Math.min(v / 1, 1);
        color = `rgba(255, 123, 114, ${0.3 + t * 0.7})`;
      } else if (v < -0.15) {
        const t = Math.min(-v / 1, 1);
        color = `rgba(88, 166, 255, ${0.3 + t * 0.7})`;
      } else {
        color = '#0D1117';
      }
      cells.push(
        <rect
          key={`${r}-${c}`}
          x={c * cellPx}
          y={r * cellPx}
          width={cellPx}
          height={cellPx}
          fill={color}
        />
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

/* ─── Equation rendering ────────────────────────────────── */

function EquationDisplay() {
  const ref = useRef(null);
  const [usedKatex, setUsedKatex] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined' && window.katex && ref.current) {
      try {
        window.katex.render(FGSM_EQUATION, ref.current, { throwOnError: false });
        setUsedKatex(true);
      } catch {
        setUsedKatex(false);
      }
    }
  }, []);

  if (usedKatex) {
    return <div ref={ref} style={styles.equation} />;
  }

  // HTML fallback
  return (
    <div style={styles.equation}>
      x<sub>adv</sub> = clip(x + &epsilon; &middot; sign(&nabla;<sub>x</sub>L(&theta;, x, y)), 0, 1)
    </div>
  );
}

/* ─── Confidence bar ────────────────────────────────────── */

function ConfidenceBar({ label, value, color, animate }) {
  const [width, setWidth] = useState(0);

  useEffect(() => {
    if (animate) {
      // Trigger animation from 0
      setWidth(0);
      const raf = requestAnimationFrame(() => setWidth(value * 100));
      return () => cancelAnimationFrame(raf);
    }
    setWidth(value * 100);
  }, [value, animate]);

  return (
    <div style={{ width: 200, marginTop: 4 }}>
      <div style={styles.barLabel}>
        {label}: {Math.round(value * 100)}%
      </div>
      <div style={styles.barTrack}>
        <div
          style={{
            ...styles.barFill,
            width: `${width}%`,
            background: color,
          }}
        />
      </div>
    </div>
  );
}

/* ─── Main component ────────────────────────────────────── */

export default function RightPanel({
  step = 1,
  epsilon = 0,
  loss = 0.3,
  confidences = { panda: 0.95, gibbon: 0.02 },
}) {
  const prevLossRef = useRef(loss);
  const [lossFlash, setLossFlash] = useState(null);
  const [step5Entered, setStep5Entered] = useState(false);

  // Loss flash animation
  useEffect(() => {
    const prev = prevLossRef.current;
    prevLossRef.current = loss;
    if (prev === loss) return;

    if (loss > prev) {
      setLossFlash('#FF7B72');
    } else {
      setLossFlash('#2EA043');
    }
    const timer = setTimeout(() => setLossFlash(null), 300);
    return () => clearTimeout(timer);
  }, [loss]);

  // Track first entry into step 5 for bar animation
  useEffect(() => {
    if (step >= 5 && !step5Entered) setStep5Entered(true);
  }, [step, step5Entered]);

  const fadeStyle = (minStep) =>
    step >= minStep ? styles.visible : styles.hidden;

  return (
    <div style={styles.container}>
      {/* 1. Loss Readout (step >= 1) */}
      <div style={fadeStyle(1)}>
        <p style={styles.lossLabel}>Loss</p>
        <p
          style={{
            ...styles.lossValue,
            color: lossFlash || '#E6EDF3',
          }}
        >
          {loss.toFixed(2)}
        </p>
      </div>

      {/* 2. FGSM Equation (step >= 3) */}
      <div style={fadeStyle(3)}>
        <EquationDisplay />
      </div>

      {/* 3. Image Triplet (step >= 5) */}
      <div style={fadeStyle(5)}>
        <div style={styles.tripletRow}>
          {/* Card 1 — Original */}
          <div>
            <div style={styles.card}>
              <div style={styles.cardImage}>
                <span style={{ fontSize: 80 }}>&#x1F43C;</span>
              </div>
            </div>
            <p style={styles.cardLabel}>Original</p>
            <ConfidenceBar
              label="panda"
              value={confidences.panda}
              color="#2EA043"
              animate={step5Entered}
            />
          </div>

          {/* Card 2 — Perturbation */}
          <div>
            <div style={styles.card}>
              <div style={{ ...styles.cardImage, padding: 0 }}>
                <PerturbationHeatmap />
              </div>
            </div>
            <p style={styles.cardLabel}>Perturbation (&times;10)</p>
          </div>

          {/* Card 3 — Adversarial */}
          <div>
            <div style={styles.card}>
              <div
                style={{
                  ...styles.cardImage,
                  position: 'relative',
                }}
              >
                <span style={{ fontSize: 80 }}>&#x1F43C;</span>
                {/* Subtle overlay tint to hint at perturbation */}
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'rgba(255, 123, 114, 0.06)',
                    pointerEvents: 'none',
                  }}
                />
              </div>
            </div>
            <p style={styles.cardLabel}>Adversarial</p>
            <ConfidenceBar
              label="gibbon"
              value={confidences.gibbon}
              color="#F85149"
              animate={step5Entered}
            />
          </div>
        </div>
      </div>

      {/* 5. Citation (step >= 5) */}
      <div style={fadeStyle(5)}>
        <p style={styles.citation}>Goodfellow et al., 2015</p>
      </div>

      {/* 6. Dimensionality Callout (step >= 6) */}
      <div
        style={{
          ...styles.calloutCard,
          ...(step >= 6
            ? { opacity: 1, transform: 'translateY(0)' }
            : { opacity: 0, transform: 'translateY(12px)', pointerEvents: 'none' }),
        }}
      >
        <p style={styles.calloutText}>
          In 2D, the sign vector has{' '}
          <span style={styles.calloutBold}>{DIM_CALLOUT.twoDDirections}</span>{' '}
          possible directions.
        </p>
        <p style={styles.calloutText}>
          For a 224&times;224&times;3 image:{' '}
          <span style={styles.calloutBold}>
            2<sup>150,528</sup>
          </span>
        </p>
        <p style={styles.calloutText}>
          &mdash; more than atoms in the observable universe.
        </p>
        <p style={styles.calloutText}>
          The model cannot defend against all of them.
        </p>
      </div>
    </div>
  );
}
