import { useState, useEffect, useCallback, useMemo } from 'react';
import type { ImageData } from '../types';
import { useImageState } from '../hooks/useImageState';
import MnistCanvas from '../components/MnistCanvas';
import SignMapCanvas from '../components/SignMapCanvas';
import { countActivePixels } from '../components/SignMapCanvas';
import ProbabilityBars from '../components/ProbabilityBars';
import GaugeMeter from '../components/GaugeMeter';
import EpsilonSlider from '../components/EpsilonSlider';

interface Beat2aProps {
  imageData: ImageData;
  epsilon: number;
  onEpsilonChange: (eps: number) => void;
  isActive: boolean;
}

export default function Beat2aGhost({
  imageData,
  epsilon,
  onEpsilonChange,
  isActive,
}: Beat2aProps) {
  const [signMapVisible, setSignMapVisible] = useState(false);

  const { probs, margin, flipped, attackStrength, initialMargin } =
    useImageState(imageData, epsilon);

  // Toggle sign map with R key
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isActive) return;
      if (e.key === 'r' || e.key === 'R') {
        // Don't trigger if user is typing in an input
        if (
          e.target instanceof HTMLInputElement ||
          e.target instanceof HTMLTextAreaElement
        )
          return;
        setSignMapVisible((v) => !v);
      }
    },
    [isActive],
  );

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [handleKeyDown]);

  // Active / dormant pixel counts
  const { activeCount, dormantCount } = useMemo(() => {
    const active = countActivePixels(imageData.dead_pixel_mask);
    return { activeCount: active, dormantCount: 784 - active };
  }, [imageData.dead_pixel_mask]);

  return (
    <div className="flex flex-col items-center justify-center gap-4 w-full h-full px-4">
      {/* Probability bars */}
      <ProbabilityBars
        probs={probs}
        trueClass={imageData.true_class}
        epsilon={epsilon}
        epsilonStar={imageData.epsilon_star}
        flipped={flipped}
        margin={margin}
      />

      {/* Image stack: MNIST + SignMap overlay */}
      <div
        className="relative"
        style={{
          width: 480,
          height: 480,
        }}
      >
        {/* MNIST canvas (behind) */}
        <MnistCanvas
          pixels={imageData.pixels}
          signMap={imageData.loss_grad_sign}
          epsilon={epsilon}
          dimmed={signMapVisible}
          size={480}
          className="absolute inset-0"
        />

        {/* Sign map overlay (in front) */}
        <div
          className="absolute inset-0 pointer-events-none"
          style={{
            opacity: signMapVisible ? 1 : 0,
            transition: 'opacity 400ms ease-out',
            transitionDelay: signMapVisible ? '100ms' : '0ms',
          }}
        >
          <SignMapCanvas
            signMap={imageData.loss_grad_sign}
            deadPixelMask={imageData.dead_pixel_mask}
            mode="uniform"
            size={480}
            highContrast={false}
          />
        </div>
      </div>

      {/* Reveal button */}
      <button
        onClick={() => setSignMapVisible((v) => !v)}
        className="px-4 py-2 rounded-lg border transition-colors compact:text-[0.8em]"
        style={{
          fontFamily: "'DM Sans', system-ui, sans-serif",
          fontSize: 18,
          color: signMapVisible ? '#94a3b8' : '#f1f5f9',
          borderColor: '#94a3b8',
        }}
      >
        {signMapVisible ? 'Hide the attack (R)' : 'Show the attack (R)'}
      </button>

      {/* Active pixel count (shown when sign map visible) */}
      {signMapVisible && (
        <p
          style={{
            fontFamily: "'DM Sans', system-ui, sans-serif",
            fontSize: 14,
            color: '#94a3b8',
          }}
        >
          ~{activeCount} active pixels · ~{dormantCount} dormant
        </p>
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
