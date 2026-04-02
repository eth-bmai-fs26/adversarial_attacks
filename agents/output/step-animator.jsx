import React, { useState, useCallback, useEffect, useRef, useMemo } from 'react';

// ── Import sibling outputs ───────────────────────────────────────────────────
// Agent A
import {
  COLORS,
  START_POS,
  GRADIENT,
  getLossAtEpsilon,
  getConfidences,
} from './data-layer.js';

// Agent B
import ManifoldPlot from './manifold-svg.jsx';

// Agent C (may not exist yet — guarded at render time)
let RightPanel;
try {
  RightPanel = require('./right-panel.jsx').default;
} catch {
  RightPanel = null;
}

// ── Animation durations per transition (ms) ──────────────────────────────────
const DURATIONS = {
  1: 600, // step 1→2: gradient arrow fade-in
  2: 400, // step 2→3: component snap
  3: 800, // step 3→4: perturbation path
  4: 300, // step 4→5: image fade-in
  5: 600, // step 5→6: callout card fade-in
};

// ── Step descriptions ────────────────────────────────────────────────────────
const STEP_DESCRIPTIONS = {
  1: 'A correctly classified image in feature space',
  2: 'The gradient points toward higher loss',
  3: 'Each dimension independently chooses ±ε',
  4: 'The perturbation crosses the decision boundary',
  5: 'The images look identical to us',
  6: 'High dimensions make this unavoidable',
};

// ── useStepAnimator Hook ─────────────────────────────────────────────────────

export function useStepAnimator() {
  const [step, setStep] = useState(1);
  const [animationPhase, setAnimationPhase] = useState('active'); // 'idle' | 'entering' | 'active'
  const timerRef = useRef(null);

  const canAdvance = animationPhase !== 'entering';

  const advanceStep = useCallback(() => {
    if (!canAdvance) return;
    if (step >= 6) return;

    setAnimationPhase('entering');
    const duration = DURATIONS[step] || 500;
    setStep((s) => s + 1);

    // Clear any pending timer
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      setAnimationPhase('active');
      timerRef.current = null;
    }, duration);
  }, [canAdvance, step]);

  const resetToStep = useCallback((n) => {
    if (timerRef.current) clearTimeout(timerRef.current);
    timerRef.current = null;
    setStep(Math.max(1, Math.min(6, n)));
    setAnimationPhase('active');
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  return { step, animationPhase, advanceStep, resetToStep, canAdvance };
}

// ── StepController Component ─────────────────────────────────────────────────

export default function StepController() {
  const { step, animationPhase, advanceStep, resetToStep, canAdvance } =
    useStepAnimator();
  const [epsilon] = useState(0.03); // default; Agent E will provide slider

  // Derived data from Agent A
  const loss = useMemo(() => getLossAtEpsilon(epsilon), [epsilon]);
  const confidences = useMemo(() => getConfidences(epsilon), [epsilon]);

  // ── Keyboard navigation ──────────────────────────────────────────────────
  useEffect(() => {
    function handleKeyDown(e) {
      // Ignore if user is typing in an input
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

      switch (e.key) {
        case 'ArrowRight':
        case ' ':
          e.preventDefault();
          if (step === 6) {
            resetToStep(1);
          } else {
            advanceStep();
          }
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
        default:
          break;
      }
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [step, advanceStep, resetToStep]);

  // ── Button handler ───────────────────────────────────────────────────────
  const handleButtonClick = useCallback(() => {
    if (step === 6) {
      resetToStep(1);
    } else {
      advanceStep();
    }
  }, [step, advanceStep, resetToStep]);

  // ── Render ───────────────────────────────────────────────────────────────
  const isDisabled = !canAdvance;
  const buttonText = step === 6 ? 'Reset ↺' : 'Next Step →';

  return (
    <div style={{ display: 'flex', height: '100vh', background: COLORS.background, position: 'relative' }}>
      {/* Left panel: manifold visualization (60%) */}
      <div style={{ width: '60%', height: 'calc(100vh - 80px)' }}>
        <ManifoldPlot
          step={step}
          epsilon={epsilon}
          width={800}
          height={600}
        />
      </div>

      {/* Right panel: info (40%) */}
      <div style={{ width: '40%', height: 'calc(100vh - 80px)', overflow: 'auto' }}>
        {RightPanel ? (
          <RightPanel
            step={step}
            epsilon={epsilon}
            loss={loss}
            confidences={confidences}
          />
        ) : (
          <div style={{ padding: 24, color: COLORS.text, fontFamily: "'Inter', sans-serif" }}>
            <div style={{ color: '#94A3B8', fontSize: 20 }}>Loss</div>
            <div style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 36, color: COLORS.text }}>
              {loss.toFixed(2)}
            </div>
            <div style={{ marginTop: 24, color: '#94A3B8', fontSize: 16 }}>
              Step {step}/6 — Right panel (Agent C) not yet available.
            </div>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div
        style={{
          position: 'fixed',
          bottom: 0,
          left: 0,
          width: '100%',
          height: 80,
          background: '#161B22',
          borderTop: '1px solid #1B2332',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 32,
          zIndex: 100,
          fontFamily: "'Inter', sans-serif",
        }}
      >
        {/* Step indicator dots */}
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          {[1, 2, 3, 4, 5, 6].map((s) => (
            <div
              key={s}
              style={{
                width: 12,
                height: 12,
                borderRadius: '50%',
                background: s === step ? '#58A6FF' : s < step ? 'transparent' : '#1B2332',
                border: s <= step ? '2px solid #58A6FF' : '2px solid #1B2332',
                transition: 'all 300ms ease',
              }}
            />
          ))}
        </div>

        {/* Next Step / Reset button */}
        <button
          onClick={handleButtonClick}
          disabled={isDisabled}
          style={{
            background: '#1B2332',
            color: '#E6EDF3',
            border: 'none',
            padding: '16px 32px',
            borderRadius: 8,
            fontFamily: "'Inter', sans-serif",
            fontSize: 20,
            fontWeight: 'bold',
            cursor: isDisabled ? 'not-allowed' : 'pointer',
            opacity: isDisabled ? 0.5 : 1,
            transition: 'background 200ms ease, opacity 200ms ease',
          }}
          onMouseEnter={(e) => {
            if (!isDisabled) e.currentTarget.style.background = '#2D3748';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#1B2332';
          }}
        >
          {buttonText}
        </button>

        {/* Step description */}
        <div
          style={{
            fontSize: 16,
            color: '#94A3B8',
            maxWidth: 300,
            fontFamily: "'Inter', sans-serif",
          }}
        >
          {STEP_DESCRIPTIONS[step]}
        </div>
      </div>
    </div>
  );
}
