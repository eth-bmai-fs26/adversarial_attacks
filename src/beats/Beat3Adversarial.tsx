import { useState, useEffect, useMemo, useRef } from 'react';
import type { ImageData } from '../types';
import { interpolateLogits, softmax } from '../lib/data';

function useResponsiveImageSize(): number {
  const [size, setSize] = useState(() => {
    if (typeof window === 'undefined') return 480;
    if (window.innerWidth < 768) return Math.min(window.innerWidth - 32, 480);
    if (window.innerWidth < 1440) return 360;
    return 480;
  });
  useEffect(() => {
    const update = () => {
      if (window.innerWidth < 768) setSize(Math.min(window.innerWidth - 32, 480));
      else if (window.innerWidth < 1440) setSize(360);
      else setSize(480);
    };
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return size;
}
import MnistCanvas from '../components/MnistCanvas';
import SignMapCanvas, { countActivePixels } from '../components/SignMapCanvas';
import ProbabilityBars from '../components/ProbabilityBars';
import GaugeMeter from '../components/GaugeMeter';
import EpsilonSlider from '../components/EpsilonSlider';
import ShatterLabel from '../components/ShatterLabel';

interface Beat3Props {
  standardImageData: ImageData;
  robustImageData: ImageData | null;
  epsilon: number;
  onEpsilonChange: (eps: number) => void;
  isActive: boolean;
  highContrast?: boolean;
}

export default function Beat3Adversarial({
  standardImageData,
  robustImageData,
  epsilon,
  onEpsilonChange,
  isActive,
  highContrast = false,
}: Beat3Props) {
  const imageSize = useResponsiveImageSize();
  const [modelType, setModelType] = useState<'standard' | 'robust'>('standard');
  const [crossfadePhase, setCrossfadePhase] = useState<'idle' | 'out' | 'in'>('idle');
  const pendingModelRef = useRef<'standard' | 'robust' | null>(null);

  // Reset to standard when beat becomes active
  useEffect(() => {
    if (isActive) {
      setModelType('standard');
      setCrossfadePhase('idle');
    }
  }, [isActive]);

  const activeImageData = modelType === 'standard'
    ? standardImageData
    : (robustImageData ?? standardImageData);

  // Compute interpolated logits, probs, margin
  const logits = useMemo(
    () => interpolateLogits(activeImageData, epsilon),
    [activeImageData, epsilon]
  );
  const probs = useMemo(() => softmax(logits), [logits]);

  const margin = logits[activeImageData.true_class] - Math.max(
    ...logits.filter((_, i) => i !== activeImageData.true_class)
  );
  const flipped = margin < 0;

  const attackStrength = epsilon * activeImageData.fgsm_margin_dot;
  const initialMargin = activeImageData.margin_at_eps[0];

  // Active pixel counts
  const activePixels = useMemo(
    () => countActivePixels(activeImageData.dead_pixel_mask),
    [activeImageData.dead_pixel_mask]
  );
  const dormantPixels = 784 - activePixels;

  // Shatter label
  const shatterTarget = useMemo(() => {
    if (!flipped) return null;
    const advClass = activeImageData.adversarial_class;
    if (advClass === null) return null;
    return {
      text: `"${advClass}"`,
      color: '#f472b6',
    };
  }, [flipped, activeImageData.adversarial_class]);

  // Robust model: attack failed status
  const showAttackFailed = modelType === 'robust'
    && activeImageData.epsilon_star === null
    && epsilon > 0;

  // Handle toggle with crossfade
  const handleToggle = (newModel: 'standard' | 'robust') => {
    if (newModel === modelType || crossfadePhase !== 'idle') return;
    pendingModelRef.current = newModel;
    setCrossfadePhase('out');

    setTimeout(() => {
      setModelType(newModel);
      setCrossfadePhase('in');

      setTimeout(() => {
        setCrossfadePhase('idle');
        pendingModelRef.current = null;
      }, 100);
    }, 100);
  };

  // Sign map opacity for crossfade
  const signMapOpacity = crossfadePhase === 'out' ? 0 : 1;

  return (
    <div className="flex flex-col items-center w-full gap-4 px-4">
      {/* Probability bars */}
      <ProbabilityBars
        probs={probs}
        trueClass={activeImageData.true_class}
        epsilon={epsilon}
        epsilonStar={activeImageData.epsilon_star}
        flipped={flipped}
        margin={margin}
      />

      {/* Predicted label with shatter */}
      <ShatterLabel
        text={`"${activeImageData.true_class}"`}
        color="#38bdf8"
        className="text-label-main"
        shatterTo={shatterTarget}
      />

      {/* Model toggle */}
      <div
        className="flex rounded-3xl overflow-hidden"
        style={{ backgroundColor: '#131c2e' }}
      >
        <button
          onClick={() => handleToggle('standard')}
          className="transition-colors duration-200"
          style={{
            padding: '8px 20px',
            fontFamily: "'DM Sans', system-ui, sans-serif",
            fontSize: 16,
            fontWeight: 700,
            color: modelType === 'standard' ? '#ffffff' : '#94a3b8',
            backgroundColor: modelType === 'standard' ? '#38bdf8' : 'transparent',
            border: 'none',
            cursor: 'pointer',
            borderRadius: '24px 0 0 24px',
          }}
        >
          Standard model
        </button>
        <button
          onClick={() => handleToggle('robust')}
          className="transition-colors duration-200"
          style={{
            padding: '8px 20px',
            fontFamily: "'DM Sans', system-ui, sans-serif",
            fontSize: 16,
            fontWeight: 700,
            color: modelType === 'robust' ? '#ffffff' : '#94a3b8',
            backgroundColor: modelType === 'robust' ? '#34d399' : 'transparent',
            border: 'none',
            cursor: 'pointer',
            borderRadius: '0 24px 24px 0',
          }}
        >
          Robust model
        </button>
      </div>

      {/* Image stack: MNIST + Sign Map overlay */}
      <div className="relative" style={{ width: imageSize, height: imageSize }}>
        <MnistCanvas
          pixels={standardImageData.pixels}
          signMap={activeImageData.loss_grad_sign}
          epsilon={epsilon}
          dimmed={true}
          size={imageSize}
          className="absolute inset-0"
        />
        <div
          className="absolute inset-0"
          style={{
            opacity: signMapOpacity,
            transition: 'opacity 100ms ease-out',
          }}
        >
          <SignMapCanvas
            signMap={activeImageData.loss_grad_sign}
            deadPixelMask={activeImageData.dead_pixel_mask}
            mode="uniform"
            size={imageSize}
            highContrast={highContrast}
          />
        </div>
      </div>

      {/* Active pixel count */}
      <p
        style={{
          fontFamily: "'DM Sans', system-ui, sans-serif",
          fontSize: 14,
          color: '#94a3b8',
        }}
      >
        ~{activePixels} active pixels · ~{dormantPixels} dormant
      </p>

      {/* Attack failed status (robust model, no flip) */}
      {showAttackFailed && (
        <p
          style={{
            fontFamily: "'DM Sans', system-ui, sans-serif",
            fontSize: 16,
            fontWeight: 700,
            color: '#34d399',
          }}
        >
          Attack FAILED — model resisted
        </p>
      )}

      {/* Gauge meter */}
      <GaugeMeter
        attackStrength={attackStrength}
        actualMargin={margin}
        initialMargin={initialMargin}
        epsilon={epsilon}
        fgsmMarginDot={activeImageData.fgsm_margin_dot}
      />

      {/* Epsilon slider */}
      <EpsilonSlider
        value={epsilon}
        onChange={onEpsilonChange}
        epsilonStar={activeImageData.epsilon_star}
      />
    </div>
  );
}
