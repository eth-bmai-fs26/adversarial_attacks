import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// ── Import from Agent A's data layer ────────────────────────────────────────
let getLossAtEpsilon, getRandomPerturbation, getAdversarialPosition,
    GRADIENT, START_POS, COLORS;

try {
  const dataLayer = require('./data-layer.js');
  getLossAtEpsilon = dataLayer.getLossAtEpsilon;
  getRandomPerturbation = dataLayer.getRandomPerturbation;
  getAdversarialPosition = dataLayer.getAdversarialPosition;
  GRADIENT = dataLayer.GRADIENT;
  START_POS = dataLayer.START_POS;
  COLORS = dataLayer.COLORS;
} catch {
  COLORS = {
    background: '#0D1117',
    grid: '#1B2332',
    dataPoint: '#58A6FF',
    snappedComponent: '#FF7B72',
    text: '#E6EDF3',
    cardBg: '#161B22',
  };
  START_POS = { x: -0.8, y: 1.2 };
  GRADIENT = { x: 0.5145, y: -0.8575 };
  getLossAtEpsilon = (eps) => {
    const anchors = [[0, 0.3], [0.02, 1.5], [0.03, 4.2], [0.1, 6.5], [0.3, 7.8]];
    if (eps >= 0.3) return 7.8;
    let i = 0;
    while (i < anchors.length - 1 && eps > anchors[i + 1][0]) i++;
    const [x0, y0] = anchors[i];
    const [x1, y1] = anchors[i + 1];
    const t = (eps - x0) / (x1 - x0);
    const s = t * t * (3 - 2 * t);
    return y0 + (y1 - y0) * s;
  };
  getAdversarialPosition = (startPos, gradient, epsilon) => ({
    x: startPos.x + epsilon * Math.sign(gradient.x) * 54,
    y: startPos.y + epsilon * Math.sign(gradient.y) * 54,
  });
  getRandomPerturbation = (startPos, epsilon, seed = 42) => ({
    x: startPos.x + epsilon * Math.cos(2.1) * 54,
    y: startPos.y + epsilon * Math.sin(2.1) * 54,
  });
}

// ── Logarithmic mapping helpers ─────────────────────────────────────────────

/** Slider position [0,1] → epsilon [0, 0.3] using power curve */
function positionToEpsilon(position) {
  return 0.3 * Math.pow(Math.max(0, Math.min(1, position)), 2.5);
}

/** Epsilon [0, 0.3] → slider position [0,1] (inverse of above) */
function epsilonToPosition(epsilon) {
  return Math.pow(Math.max(0, Math.min(0.3, epsilon)) / 0.3, 1 / 2.5);
}

// ── EpsilonSlider Component ─────────────────────────────────────────────────

const TICK_VALUES = [0, 0.01, 0.03, 0.1, 0.3];
const TRACK_WIDTH = 300;
const TRACK_HEIGHT = 6;
const THUMB_SIZE = 20;

export function EpsilonSlider({ epsilon, onChange, visible }) {
  const [hasAppeared, setHasAppeared] = useState(false);
  const [animating, setAnimating] = useState(false);
  const [dragging, setDragging] = useState(false);
  const trackRef = useRef(null);

  // Animate on first appearance
  useEffect(() => {
    if (visible && !hasAppeared) {
      setAnimating(true);
      setHasAppeared(true);
      const timer = setTimeout(() => setAnimating(false), 400);
      return () => clearTimeout(timer);
    }
  }, [visible, hasAppeared]);

  const position = epsilonToPosition(epsilon);
  const filledWidth = position * TRACK_WIDTH;

  // Pointer event handling for custom slider
  const handlePointerDown = useCallback((e) => {
    e.preventDefault();
    setDragging(true);
    e.target.setPointerCapture(e.pointerId);
    updateFromPointer(e);
  }, [onChange]);

  const handlePointerMove = useCallback((e) => {
    if (!dragging) return;
    updateFromPointer(e);
  }, [dragging, onChange]);

  const handlePointerUp = useCallback(() => {
    setDragging(false);
  }, []);

  const updateFromPointer = useCallback((e) => {
    if (!trackRef.current) return;
    const rect = trackRef.current.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;
    const clamped = Math.max(0, Math.min(1, x));
    const newEps = positionToEpsilon(clamped);
    // Round to step of 0.001
    const rounded = Math.round(newEps * 1000) / 1000;
    onChange(Math.max(0, Math.min(0.3, rounded)));
  }, [onChange]);

  if (!visible) return null;

  const eightBit = Math.round(epsilon * 255);

  return (
    <div
      style={{
        opacity: animating ? 0 : 1,
        transform: animating ? 'translateY(20px)' : 'translateY(0)',
        transition: 'opacity 400ms ease-out, transform 400ms ease-out',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        userSelect: 'none',
      }}
    >
      {/* Value display */}
      <div style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 28,
        color: '#E6EDF3',
        marginBottom: 4,
      }}>
        ε = {epsilon.toFixed(3)}
      </div>
      <div style={{
        fontFamily: "'Inter', sans-serif",
        fontSize: 16,
        color: '#94A3B8',
        marginBottom: 16,
      }}>
        ≈ {eightBit}/255
      </div>

      {/* Slider track */}
      <div
        ref={trackRef}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        style={{
          width: TRACK_WIDTH,
          height: TRACK_HEIGHT,
          borderRadius: 3,
          background: '#1B2332',
          position: 'relative',
          cursor: 'pointer',
          touchAction: 'none',
        }}
      >
        {/* Filled portion */}
        <div style={{
          width: filledWidth,
          height: '100%',
          borderRadius: 3,
          background: 'linear-gradient(to right, #58A6FF, #FF7B72)',
          pointerEvents: 'none',
        }} />

        {/* Thumb */}
        <div style={{
          position: 'absolute',
          top: '50%',
          left: filledWidth,
          transform: 'translate(-50%, -50%)',
          width: THUMB_SIZE,
          height: THUMB_SIZE,
          borderRadius: '50%',
          background: '#E6EDF3',
          border: '2px solid #58A6FF',
          cursor: dragging ? 'grabbing' : 'grab',
          pointerEvents: 'none',
          boxSizing: 'border-box',
        }} />
      </div>

      {/* Tick marks */}
      <div style={{
        width: TRACK_WIDTH,
        position: 'relative',
        height: 40,
        marginTop: 8,
      }}>
        {TICK_VALUES.map((val) => {
          const tickPos = epsilonToPosition(val) * TRACK_WIDTH;
          const isDefault = val === 0.03;
          return (
            <div key={val} style={{
              position: 'absolute',
              left: tickPos,
              transform: 'translateX(-50%)',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}>
              {isDefault && (
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 11,
                  color: '#58A6FF',
                  marginBottom: 2,
                }}>default</span>
              )}
              <div style={{
                width: 1,
                height: 8,
                background: '#94A3B8',
                marginBottom: 4,
              }} />
              <span style={{
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 14,
                color: '#94A3B8',
                whiteSpace: 'nowrap',
              }}>
                {val}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── RandomVsFgsmInset Component ─────────────────────────────────────────────

const INSET_SVG_SIZE = 120;
const MAX_ARROW_LEN = 45;

export function RandomVsFgsmInset({ epsilon, visible, width = 220 }) {
  const [hasAppeared, setHasAppeared] = useState(false);
  const [animating, setAnimating] = useState(false);

  useEffect(() => {
    if (visible && !hasAppeared) {
      setAnimating(true);
      setHasAppeared(true);
      const timer = setTimeout(() => setAnimating(false), 400);
      return () => clearTimeout(timer);
    }
  }, [visible, hasAppeared]);

  // Compute FGSM and random displacement vectors
  const fgsmPos = useMemo(
    () => getAdversarialPosition(START_POS, GRADIENT, epsilon),
    [epsilon]
  );
  const randomPos = useMemo(
    () => getRandomPerturbation(START_POS, epsilon, 42),
    [epsilon]
  );

  const fgsmDx = fgsmPos.x - START_POS.x;
  const fgsmDy = fgsmPos.y - START_POS.y;
  const randomDx = randomPos.x - START_POS.x;
  const randomDy = randomPos.y - START_POS.y;

  // Normalize to fit in SVG, preserving relative magnitudes
  const fgsmMag = Math.sqrt(fgsmDx * fgsmDx + fgsmDy * fgsmDy);
  const randomMag = Math.sqrt(randomDx * randomDx + randomDy * randomDy);
  const maxMag = Math.max(fgsmMag, randomMag, 0.001);
  const scale = Math.min(MAX_ARROW_LEN / maxMag, MAX_ARROW_LEN);

  const fgsmVec = { x: fgsmDx * scale, y: -fgsmDy * scale }; // flip y for SVG
  const randomVec = { x: randomDx * scale, y: -randomDy * scale };

  // Loss values
  const baseLoss = getLossAtEpsilon(0);
  const fgsmLoss = getLossAtEpsilon(epsilon);
  const fgsmDeltaL = Math.max(0, fgsmLoss - baseLoss);

  // Random perturbation loss: much smaller effect
  // Approximate as ~10% of FGSM effect
  const randomDeltaL = fgsmDeltaL * 0.05;

  // Bar chart sizing
  const barMaxWidth = width - 80;
  const maxDelta = Math.max(fgsmDeltaL, 0.1);
  const fgsmBarW = (fgsmDeltaL / maxDelta) * barMaxWidth;
  const randomBarW = (randomDeltaL / maxDelta) * barMaxWidth;
  const barHeight = 14;

  const cx = INSET_SVG_SIZE / 2;
  const cy = INSET_SVG_SIZE / 2;

  const isZero = epsilon < 0.0005;

  if (!visible) return null;

  return (
    <div style={{
      width,
      background: '#161B22',
      borderRadius: 8,
      padding: 16,
      opacity: animating ? 0 : 1,
      transition: 'opacity 400ms ease-out',
    }}>
      {/* Title */}
      <div style={{
        fontFamily: "'Inter', sans-serif",
        fontSize: 16,
        fontWeight: 'bold',
        color: '#E6EDF3',
        marginBottom: 12,
      }}>
        Random vs FGSM
      </div>

      {/* Vector comparison SVG */}
      <svg
        width={INSET_SVG_SIZE}
        height={INSET_SVG_SIZE}
        viewBox={`0 0 ${INSET_SVG_SIZE} ${INSET_SVG_SIZE}`}
        style={{ display: 'block', margin: '0 auto 12px' }}
      >
        <defs>
          <marker id="arrowFgsm" viewBox="0 0 10 10" refX="9" refY="5"
            markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 Z" fill="#FF7B72" />
          </marker>
          <marker id="arrowRandom" viewBox="0 0 10 10" refX="9" refY="5"
            markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 Z" fill="#94A3B8" />
          </marker>
        </defs>

        {/* Magnitude circle (dotted) */}
        {!isZero && (
          <circle
            cx={cx} cy={cy}
            r={Math.min(fgsmMag * scale, MAX_ARROW_LEN)}
            fill="none"
            stroke="#30363D"
            strokeWidth={1}
            strokeDasharray="4 3"
            opacity={0.6}
          />
        )}

        {/* Origin point */}
        <circle cx={cx} cy={cy} r={6} fill="#58A6FF" />

        {/* FGSM vector */}
        {!isZero && (
          <>
            <line
              x1={cx} y1={cy}
              x2={cx + fgsmVec.x} y2={cy + fgsmVec.y}
              stroke="#FF7B72" strokeWidth={2.5}
              markerEnd="url(#arrowFgsm)"
            />
            <text
              x={cx + fgsmVec.x + 4}
              y={cy + fgsmVec.y - 4}
              fill="#FF7B72" fontSize={12}
              fontFamily="'Inter', sans-serif"
              fontWeight="bold"
            >
              FGSM
            </text>
          </>
        )}

        {/* Random vector */}
        {!isZero && (
          <>
            <line
              x1={cx} y1={cy}
              x2={cx + randomVec.x} y2={cy + randomVec.y}
              stroke="#94A3B8" strokeWidth={2}
              markerEnd="url(#arrowRandom)"
            />
            <text
              x={cx + randomVec.x + 4}
              y={cy + randomVec.y + 12}
              fill="#94A3B8" fontSize={12}
              fontFamily="'Inter', sans-serif"
            >
              random
            </text>
          </>
        )}

        {/* Zero state */}
        {isZero && (
          <text
            x={cx} y={cy + 20}
            fill="#94A3B8" fontSize={12}
            fontFamily="'JetBrains Mono', monospace"
            textAnchor="middle"
          >
            ε = 0
          </text>
        )}
      </svg>

      {/* Mini bar chart */}
      <div style={{ marginTop: 8 }}>
        {/* FGSM bar */}
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: 6 }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 14,
            color: '#FF7B72',
            width: 28,
            textAlign: 'right',
            marginRight: 8,
          }}>ΔL</span>
          <div style={{
            height: barHeight,
            width: Math.max(isZero ? 0 : 2, fgsmBarW),
            background: '#FF7B72',
            borderRadius: 2,
            transition: 'width 150ms ease-out',
          }} />
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 14,
            color: '#FF7B72',
            marginLeft: 8,
          }}>
            {fgsmDeltaL.toFixed(1)}
          </span>
        </div>

        {/* Random bar */}
        <div style={{ display: 'flex', alignItems: 'center' }}>
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 14,
            color: '#94A3B8',
            width: 28,
            textAlign: 'right',
            marginRight: 8,
          }}>ΔL</span>
          <div style={{
            height: barHeight,
            width: Math.max(isZero ? 0 : 2, randomBarW),
            background: '#94A3B8',
            borderRadius: 2,
            transition: 'width 150ms ease-out',
          }} />
          <span style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 14,
            color: '#94A3B8',
            marginLeft: 8,
          }}>
            {randomDeltaL.toFixed(1)}
          </span>
        </div>
      </div>
    </div>
  );
}
