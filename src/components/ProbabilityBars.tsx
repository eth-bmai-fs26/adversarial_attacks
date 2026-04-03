import { useState, useEffect, useRef } from 'react';

interface ProbabilityBarsProps {
  probs: number[];
  trueClass: number;
  epsilon: number;
  epsilonStar: number | null;
  flipped: boolean;
  margin: number;
}

export default function ProbabilityBars({
  probs,
  trueClass,
  flipped,
  margin,
}: ProbabilityBarsProps) {
  const [displayedRunnerUp, setDisplayedRunnerUp] = useState<number>(-1);
  const [isPulsing, setIsPulsing] = useState(false);
  const prevRunnerUpRef = useRef<number>(-1);

  // Compute actual runner-up (argmax excluding trueClass)
  const actualRunnerUp = probs.reduce(
    (best, p, i) => (i !== trueClass && p > probs[best] ? i : best),
    trueClass === 0 ? 1 : 0,
  );

  // Hysteresis: only switch displayed runner-up if new class exceeds current by ≥5pp
  useEffect(() => {
    if (displayedRunnerUp === -1) {
      setDisplayedRunnerUp(actualRunnerUp);
      prevRunnerUpRef.current = actualRunnerUp;
      return;
    }

    if (actualRunnerUp === displayedRunnerUp) return;

    const currentProb = probs[displayedRunnerUp] ?? 0;
    const newProb = probs[actualRunnerUp] ?? 0;

    if (newProb - currentProb >= 0.05) {
      prevRunnerUpRef.current = displayedRunnerUp;
      setDisplayedRunnerUp(actualRunnerUp);
      setIsPulsing(true);
    }
  }, [probs, actualRunnerUp, displayedRunnerUp, trueClass]);

  // Clear pulse after animation
  useEffect(() => {
    if (!isPulsing) return;
    const timer = setTimeout(() => setIsPulsing(false), 200);
    return () => clearTimeout(timer);
  }, [isPulsing]);

  const trueProb = probs[trueClass] ?? 0;
  const runnerProb = probs[displayedRunnerUp] ?? 0;

  const formatProb = (p: number) => `${(p * 100).toFixed(1)}%`;
  const formatMargin = (m: number) => (m >= 0 ? `+${m.toFixed(1)}` : m.toFixed(1));

  return (
    <div className="flex flex-col items-center w-full gap-1.5">
      {/* Desktop/compact: bars. Mobile: single-line text */}
      <div className="hidden mobile:block">
        <span className="text-mono-md text-primary">
          {trueClass}: {formatProb(trueProb)} → {displayedRunnerUp}: {formatProb(runnerProb)}
        </span>
      </div>

      <div className="mobile:hidden w-full max-w-[480px] compact:max-w-[360px] flex flex-col gap-1.5">
        {/* True class bar */}
        <div className="relative h-6 w-full rounded bg-tile-dormant overflow-hidden">
          <div
            className="h-full rounded transition-all duration-100 ease-out"
            style={{
              width: `${Math.max(trueProb * 100, 2)}%`,
              backgroundColor: flipped
                ? 'rgba(56, 189, 248, 0.4)'
                : '#38bdf8',
            }}
          />
          <span className="absolute inset-y-0 left-2 flex items-center text-mono-md text-white whitespace-nowrap">
            "{trueClass}" — {formatProb(trueProb)}
          </span>
        </div>

        {/* Runner-up bar */}
        <div className="relative h-6 w-full rounded bg-tile-dormant overflow-hidden">
          <div
            className={`h-full rounded transition-all duration-100 ease-out ${
              isPulsing ? 'animate-runner-pulse' : ''
            }`}
            style={{
              width: `${Math.max(runnerProb * 100, 2)}%`,
              backgroundColor: '#f472b6',
              boxShadow: flipped ? '0 0 8px #f472b6' : 'none',
            }}
          />
          <span
            className={`absolute inset-y-0 left-2 flex items-center text-mono-md text-white whitespace-nowrap transition-opacity duration-200`}
          >
            "{displayedRunnerUp}" — {formatProb(runnerProb)}
          </span>
        </div>

        {/* Logit margin readout */}
        <p
          className="text-mono-sm text-center"
          style={{ color: flipped ? '#f472b6' : '#94a3b8' }}
        >
          Logit margin: {formatMargin(margin)}
        </p>
      </div>
    </div>
  );
}
