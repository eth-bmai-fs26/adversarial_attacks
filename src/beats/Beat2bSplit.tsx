import { useState, useEffect, useCallback, useRef } from 'react';
import type { ImageData } from '../types';
import { interpolateLogits, softmax } from '../lib/data';
import SignMapCanvas from '../components/SignMapCanvas';
import MnistCanvas from '../components/MnistCanvas';
import ProbabilityBars from '../components/ProbabilityBars';
import GaugeMeter from '../components/GaugeMeter';
import EpsilonSlider from '../components/EpsilonSlider';

interface Beat2bProps {
  imageData: ImageData;
  epsilon: number;
  onEpsilonChange: (eps: number) => void;
  isActive: boolean;
}

type ViewMode = 'split' | 'fgsm' | 'gradient';

/** Get the epsilon index into the precomputed arrays, clamped to [0, 99] */
function epsilonToIndex(epsilon: number): number {
  return Math.min(99, Math.max(0, Math.round(epsilon / 0.0035)));
}

export default function Beat2bSplit({
  imageData,
  epsilon,
  onEpsilonChange,
  isActive,
}: Beat2bProps) {
  // --- State ---
  const [dividerFraction, setDividerFraction] = useState(1); // 0-1, starts at 1 (right edge)
  const [isDragging, setIsDragging] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [blinkTarget, setBlinkTarget] = useState<'fgsm' | 'gradient'>('fgsm');
  const containerRef = useRef<HTMLDivElement>(null);
  const entryAnimRef = useRef<number>(0);

  // --- Derived values ---
  const logits = interpolateLogits(imageData, epsilon);
  const probs = softmax(logits);
  const predictedClass = logits.indexOf(Math.max(...logits));
  const flipped = predictedClass !== imageData.true_class;
  const margin = imageData.margin_at_eps[epsilonToIndex(epsilon)] ?? 0;
  const initialMargin = imageData.margin_at_eps[0] ?? 0;
  const attackStrength = epsilon * imageData.fgsm_margin_dot;

  // Gradient attack flip detection
  const epsIdx = epsilonToIndex(epsilon);
  const gradientFlipped = imageData.raw_gradient_flipped[epsIdx] ?? false;

  // --- Responsive image size ---
  const [imageSize, setImageSize] = useState(480);
  useEffect(() => {
    const update = () => {
      const w = window.innerWidth;
      if (w < 768) setImageSize(Math.min(w - 32, 480));
      else if (w < 1440) setImageSize(360);
      else setImageSize(480);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const isMobile = imageSize < 360 || window.innerWidth < 768;

  // --- Entry animation: slide divider from 100% to 50% ---
  useEffect(() => {
    if (!isActive) {
      setDividerFraction(1);
      setViewMode('split');
      return;
    }

    const startTime = performance.now();
    const animate = (now: number) => {
      const elapsed = now - startTime;
      const t = Math.min(elapsed / 400, 1);
      const eased = 1 - Math.pow(1 - t, 3); // ease-out cubic
      setDividerFraction(1 - eased * 0.5); // 1 → 0.5
      if (t < 1) {
        entryAnimRef.current = requestAnimationFrame(animate);
      }
    };
    entryAnimRef.current = requestAnimationFrame(animate);

    return () => {
      if (entryAnimRef.current) cancelAnimationFrame(entryAnimRef.current);
    };
  }, [isActive]);

  // --- G key handler ---
  useEffect(() => {
    if (!isActive) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'g' || e.key === 'G') {
        e.preventDefault();
        setViewMode(prev => {
          if (prev === 'split') return 'gradient'; // First G: show gradient (FGSM was dominant in split)
          if (prev === 'gradient') return 'fgsm';
          return 'split'; // fgsm → split
        });
      }
      if (e.key === 'Escape') {
        setViewMode('split');
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [isActive]);

  // Update blink target when viewMode changes
  useEffect(() => {
    if (viewMode === 'fgsm' || viewMode === 'gradient') {
      setBlinkTarget(viewMode);
    }
  }, [viewMode]);

  // --- Divider drag handlers ---
  const handleDividerPointerDown = useCallback((e: React.PointerEvent) => {
    e.preventDefault();
    e.stopPropagation();
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
    setIsDragging(true);
  }, []);

  const handleDividerPointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const ratio = (e.clientX - rect.left) / rect.width;
      // Clamp to 20%-80%
      setDividerFraction(Math.min(0.8, Math.max(0.2, ratio)));
    },
    [isDragging],
  );

  const handleDividerPointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      setIsDragging(false);
    },
    [isDragging],
  );

  // --- Clip positions in pixels ---
  const dividerPx = dividerFraction * imageSize;

  // --- Render ---
  const inBlinkMode = viewMode !== 'split';

  return (
    <div className="flex flex-col items-center gap-4 w-full px-4">
      {/* Probability bars */}
      <ProbabilityBars
        probs={probs}
        trueClass={imageData.true_class}
        epsilon={epsilon}
        epsilonStar={imageData.epsilon_star}
        flipped={flipped}
        margin={margin}
      />

      {/* Split image area */}
      {isMobile ? (
        // Mobile: stacked layout
        <div className="flex flex-col items-center gap-3">
          <div className="relative" style={{ width: imageSize, height: imageSize }}>
            <MnistCanvas
              pixels={imageData.pixels}
              signMap={imageData.loss_grad_sign}
              epsilon={epsilon}
              dimmed
              size={imageSize}
              className="absolute inset-0"
            />
            <SignMapCanvas
              signMap={imageData.loss_grad_sign}
              deadPixelMask={imageData.dead_pixel_mask}
              mode="uniform"
              size={imageSize}
              highContrast={false}
              opacity={1}
              className="absolute inset-0"
            />
          </div>
          <StatusBadge label="FGSM" flipped={flipped} type="fgsm" />

          <div className="relative" style={{ width: imageSize, height: imageSize }}>
            <MnistCanvas
              pixels={imageData.pixels}
              signMap={imageData.loss_grad_sign}
              epsilon={epsilon}
              dimmed
              size={imageSize}
              className="absolute inset-0"
            />
            <SignMapCanvas
              signMap={imageData.loss_grad_sign}
              deadPixelMask={imageData.dead_pixel_mask}
              gradMagnitude={imageData.grad_magnitude}
              mode="variable"
              size={imageSize}
              highContrast={false}
              opacity={1}
              className="absolute inset-0"
            />
          </div>
          <StatusBadge label="Gradient" flipped={gradientFlipped} type="gradient" />
        </div>
      ) : (
        // Desktop: split view or blink mode
        <>
          <div
            ref={containerRef}
            className="relative select-none"
            style={{
              width: imageSize,
              height: imageSize,
              cursor: isDragging ? 'col-resize' : undefined,
            }}
            onPointerMove={handleDividerPointerMove}
            onPointerUp={handleDividerPointerUp}
            onPointerCancel={handleDividerPointerUp}
          >
            {/* Dimmed MNIST behind */}
            <MnistCanvas
              pixels={imageData.pixels}
              signMap={imageData.loss_grad_sign}
              epsilon={epsilon}
              dimmed
              size={imageSize}
              className="absolute inset-0"
            />

            {/* FGSM sign map (left / full in blink mode) */}
            <div
              className="absolute inset-0"
              style={{
                clipPath: inBlinkMode
                  ? undefined
                  : `inset(0 ${imageSize - dividerPx}px 0 0)`,
                opacity: inBlinkMode && blinkTarget !== 'fgsm' ? 0 : 1,
                transition: inBlinkMode ? 'opacity 150ms ease' : undefined,
              }}
            >
              <SignMapCanvas
                signMap={imageData.loss_grad_sign}
                deadPixelMask={imageData.dead_pixel_mask}
                mode="uniform"
                size={imageSize}
                highContrast={false}
                opacity={1}
              />
            </div>

            {/* Gradient sign map (right / full in blink mode) */}
            <div
              className="absolute inset-0"
              style={{
                clipPath: inBlinkMode
                  ? undefined
                  : `inset(0 0 0 ${dividerPx}px)`,
                opacity: inBlinkMode && blinkTarget !== 'gradient' ? 0 : 1,
                transition: inBlinkMode ? 'opacity 150ms ease' : undefined,
              }}
            >
              <SignMapCanvas
                signMap={imageData.loss_grad_sign}
                deadPixelMask={imageData.dead_pixel_mask}
                gradMagnitude={imageData.grad_magnitude}
                mode="variable"
                size={imageSize}
                highContrast={false}
                opacity={1}
              />
            </div>

            {/* Draggable divider (split mode only) */}
            {!inBlinkMode && (
              <div
                className="absolute top-0 bottom-0"
                style={{
                  left: dividerPx,
                  transform: 'translateX(-50%)',
                  width: 24,
                  cursor: 'col-resize',
                  zIndex: 10,
                }}
                onPointerDown={handleDividerPointerDown}
              >
                {/* White line */}
                <div
                  className="absolute left-1/2 -translate-x-1/2 top-0 bottom-0"
                  style={{
                    width: 2,
                    backgroundColor: 'rgba(255, 255, 255, 0.8)',
                  }}
                />
                {/* Pill handle */}
                <div
                  className="absolute left-1/2 -translate-x-1/2 top-1/2 -translate-y-1/2"
                  style={{
                    width: 20,
                    height: 40,
                    borderRadius: 10,
                    backgroundColor: '#ffffff',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
                  }}
                />
              </div>
            )}
          </div>

          {/* Status badges */}
          <div className="flex items-center justify-center gap-8">
            <StatusBadge label="FGSM" flipped={flipped} type="fgsm" />
            <StatusBadge label="Gradient" flipped={gradientFlipped} type="gradient" />
          </div>

          {/* View mode hint */}
          {inBlinkMode && (
            <p className="text-body-sm text-text-muted text-center">
              Showing: {blinkTarget === 'fgsm' ? 'FGSM (uniform)' : 'Gradient (variable)'} — press G to toggle, Esc for split
            </p>
          )}
        </>
      )}

      {/* Gauge meter */}
      <GaugeMeter
        attackStrength={attackStrength}
        actualMargin={margin}
        initialMargin={initialMargin}
        epsilon={epsilon}
        fgsmMarginDot={imageData.fgsm_margin_dot}
      />

      {/* Epsilon slider */}
      <EpsilonSlider
        value={epsilon}
        onChange={onEpsilonChange}
        epsilonStar={imageData.epsilon_star}
      />
    </div>
  );
}

// --- Status Badge sub-component ---

function StatusBadge({
  label,
  flipped,
  type,
}: {
  label: string;
  flipped: boolean;
  type: 'fgsm' | 'gradient';
}) {
  const text = flipped ? `${label} — FLIPPED ✓` : `${label} — HELD${type === 'gradient' ? ' ✗' : ''}`;

  const color = flipped
    ? '#34d399' // emerald
    : type === 'gradient'
      ? '#f472b6' // pink for gradient held
      : '#94a3b8'; // muted for fgsm held

  return (
    <span
      style={{
        color,
        fontFamily: "'DM Sans', system-ui, sans-serif",
        fontSize: 16,
        fontWeight: 700,
        transition: 'color 150ms ease',
      }}
    >
      {text}
    </span>
  );
}
