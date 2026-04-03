import { useState, useEffect, useRef, useMemo } from 'react';
import MnistCanvas from '../components/MnistCanvas';
import EpsilonSlider from '../components/EpsilonSlider';
import ProbabilityBars from '../components/ProbabilityBars';
import GaugeMeter from '../components/GaugeMeter';
import ShatterLabel from '../components/ShatterLabel';
import { interpolateLogits, softmax } from '../lib/data';
import type { ImageData } from '../types';

interface Beat1Props {
  imageData: ImageData;
  isActive: boolean;
  epsilon: number;
  onEpsilonChange: (epsilon: number) => void;
}

export default function Beat1Crime({
  imageData,
  isActive,
  epsilon,
  onEpsilonChange,
}: Beat1Props) {
  const [shatterTarget, setShatterTarget] = useState<{
    text: string;
    color: string;
  } | null>(null);
  const prevFlippedRef = useRef(false);
  const hasInitializedRef = useRef(false);

  // Interpolate logits and compute probs at current epsilon
  const logits = useMemo(
    () => interpolateLogits(imageData, epsilon),
    [imageData, epsilon],
  );
  const probs = useMemo(() => softmax(logits), [logits]);

  // Margin: true class logit minus max of all other logits
  const margin = useMemo(() => {
    const trueLogit = logits[imageData.true_class];
    let maxOther = -Infinity;
    for (let i = 0; i < logits.length; i++) {
      if (i !== imageData.true_class && logits[i] > maxOther) {
        maxOther = logits[i];
      }
    }
    return trueLogit - maxOther;
  }, [logits, imageData.true_class]);

  // Flip detection
  const predictedClass = useMemo(() => {
    let maxIdx = 0;
    for (let i = 1; i < logits.length; i++) {
      if (logits[i] > logits[maxIdx]) maxIdx = i;
    }
    return maxIdx;
  }, [logits]);
  const flipped = predictedClass !== imageData.true_class;

  // Gauge values
  const attackStrength = epsilon * imageData.fgsm_margin_dot;
  const initialMargin = imageData.margin_at_eps[0];

  // Current display label
  const topProb = probs[predictedClass];
  const labelText = `"${predictedClass}" — ${(topProb * 100).toFixed(1)}%`;
  const labelColor = flipped ? '#f472b6' : '#38bdf8';

  // Shatter trigger on flip transitions
  useEffect(() => {
    // Skip the very first render to avoid spurious shatter
    if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      prevFlippedRef.current = flipped;
      return;
    }

    if (flipped !== prevFlippedRef.current) {
      prevFlippedRef.current = flipped;
      const newPredicted = flipped
        ? imageData.adversarial_class ?? predictedClass
        : imageData.true_class;
      const newProb = probs[newPredicted];
      setShatterTarget({
        text: `"${newPredicted}" — ${(newProb * 100).toFixed(1)}%`,
        color: flipped ? '#f472b6' : '#38bdf8',
      });
    }
  }, [flipped, predictedClass, probs, imageData]);

  // Reset when becoming active with a new image
  useEffect(() => {
    hasInitializedRef.current = false;
    prevFlippedRef.current = false;
    setShatterTarget(null);
  }, [imageData.id]);

  return (
    <div className="flex flex-col items-center w-full h-full justify-center gap-4 compact:gap-3 mobile:gap-2 px-4">
      {/* Classification label with shatter */}
      <ShatterLabel
        text={labelText}
        color={labelColor}
        className="text-label-main text-center"
        shatterTo={shatterTarget}
        onShatterComplete={() => setShatterTarget(null)}
      />

      {/* Probability bars */}
      <ProbabilityBars
        probs={probs}
        trueClass={imageData.true_class}
        epsilon={epsilon}
        epsilonStar={imageData.epsilon_star}
        flipped={flipped}
        margin={margin}
      />

      {/* MNIST image */}
      <MnistCanvas
        pixels={imageData.pixels}
        signMap={imageData.loss_grad_sign}
        epsilon={epsilon}
        dimmed={false}
        className="max-w-full"
      />

      {/* Gauge meter */}
      <div className="mt-2 compact:mt-1">
        <GaugeMeter
          attackStrength={attackStrength}
          actualMargin={margin}
          initialMargin={initialMargin}
          epsilon={epsilon}
          fgsmMarginDot={imageData.fgsm_margin_dot}
        />
      </div>

      {/* Epsilon slider */}
      <EpsilonSlider
        value={epsilon}
        onChange={onEpsilonChange}
        epsilonStar={imageData.epsilon_star}
        disabled={!isActive}
      />
    </div>
  );
}
