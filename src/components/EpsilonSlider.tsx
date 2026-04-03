import { useRef, useState, useCallback, useEffect } from 'react';

interface EpsilonSliderProps {
  value: number;
  onChange: (epsilon: number) => void;
  epsilonStar: number | null;
  min?: number;
  max?: number;
  step?: number;
  coarseStep?: number;
  disabled?: boolean;
}

const MAGNETIC_ZONE = 0.01;
const SNAP_DURATION = 300;
const FLASH_HALF_WIDTH = 0.01;

export default function EpsilonSlider({
  value,
  onChange,
  epsilonStar,
  min = 0,
  max = 0.35,
  step = 0.005,
  coarseStep = 0.05,
  disabled = false,
}: EpsilonSliderProps) {
  const railRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isSnapping, setIsSnapping] = useState(false);
  const [displayValue, setDisplayValue] = useState(value);
  const animFrameRef = useRef<number>(0);

  // Keep displayValue in sync with external value when not snapping
  useEffect(() => {
    if (!isSnapping) {
      setDisplayValue(value);
    }
  }, [value, isSnapping]);

  const clamp = (v: number) => Math.min(max, Math.max(min, v));

  const pointerToEpsilon = useCallback(
    (clientX: number) => {
      const rail = railRef.current;
      if (!rail) return value;
      const rect = rail.getBoundingClientRect();
      const ratio = (clientX - rect.left) / rect.width;
      return clamp(min + ratio * (max - min));
    },
    [min, max, value]
  );

  const snapToStar = useCallback(
    (fromValue: number) => {
      if (epsilonStar === null) return;
      if (Math.abs(fromValue - epsilonStar) > MAGNETIC_ZONE) return;

      setIsSnapping(true);
      const startTime = performance.now();
      const startVal = fromValue;
      const endVal = epsilonStar;

      const animate = (now: number) => {
        const elapsed = now - startTime;
        const t = Math.min(elapsed / SNAP_DURATION, 1);
        // ease-out: 1 - (1-t)^3
        const eased = 1 - Math.pow(1 - t, 3);
        const current = startVal + (endVal - startVal) * eased;
        setDisplayValue(current);

        if (t < 1) {
          animFrameRef.current = requestAnimationFrame(animate);
        } else {
          setDisplayValue(endVal);
          onChange(endVal);
          setIsSnapping(false);
        }
      };
      animFrameRef.current = requestAnimationFrame(animate);
    },
    [epsilonStar, onChange]
  );

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, []);

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      if (disabled || isSnapping) return;
      e.preventDefault();
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
      setIsDragging(true);
      const eps = pointerToEpsilon(e.clientX);
      onChange(eps);
    },
    [disabled, isSnapping, pointerToEpsilon, onChange]
  );

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || disabled || isSnapping) return;
      const eps = pointerToEpsilon(e.clientX);
      onChange(eps);
    },
    [isDragging, disabled, isSnapping, pointerToEpsilon, onChange]
  );

  const handlePointerUp = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging) return;
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      setIsDragging(false);
      snapToStar(value);
    },
    [isDragging, value, snapToStar]
  );

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (disabled || isSnapping) return;

      let newValue: number | null = null;

      switch (e.key) {
        case 'ArrowRight':
        case 'ArrowUp': {
          const s = e.shiftKey ? coarseStep : step;
          newValue = clamp(value + s);
          break;
        }
        case 'ArrowLeft':
        case 'ArrowDown': {
          const s = e.shiftKey ? coarseStep : step;
          newValue = clamp(value - s);
          break;
        }
        case 'Home':
          newValue = min;
          break;
        case 'End':
          newValue = max;
          break;
        default:
          return; // Don't stop propagation for non-slider keys
      }

      e.preventDefault();
      e.stopPropagation();

      if (newValue !== null) {
        // Snap to ε* if keyboard step lands in magnetic zone
        if (
          epsilonStar !== null &&
          Math.abs(newValue - epsilonStar) <= MAGNETIC_ZONE
        ) {
          newValue = epsilonStar;
        }
        onChange(newValue);
      }
    },
    [disabled, isSnapping, value, step, coarseStep, min, max, epsilonStar, onChange]
  );

  // Derived values
  const currentEps = isSnapping ? displayValue : value;
  const ratio = (currentEps - min) / (max - min);
  const isAboveStar = epsilonStar !== null && currentEps >= epsilonStar;
  const glowColor = isAboveStar ? '#f472b6' : '#38bdf8';

  // Rail gradient: hard edges at ε* ± flash half-width
  const railBackground = (() => {
    if (epsilonStar === null) {
      return '#38bdf8';
    }
    const flashLeft = Math.max(0, ((epsilonStar - FLASH_HALF_WIDTH) - min) / (max - min)) * 100;
    const flashRight = Math.min(1, ((epsilonStar + FLASH_HALF_WIDTH) - min) / (max - min)) * 100;
    return `linear-gradient(to right, #38bdf8 ${flashLeft}%, #ffffff ${flashLeft}%, #ffffff ${flashRight}%, #f472b6 ${flashRight}%)`;
  })();

  // ε* marker position
  const starRatio = epsilonStar !== null ? (epsilonStar - min) / (max - min) : null;

  // Clamp label position so it doesn't overflow
  const labelLeft = `clamp(2rem, ${ratio * 100}%, calc(100% - 2rem))`;

  return (
    <div
      className={`
        w-full px-8 mobile:px-4 select-none
        h-16 compact:h-12 mobile:h-12
        flex flex-col justify-center relative
        ${disabled ? 'opacity-50 pointer-events-none' : ''}
      `}
    >
      {/* Rail + Thumb area */}
      <div
        ref={railRef}
        className="relative w-full cursor-pointer"
        style={{ height: '24px' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerCancel={handlePointerUp}
        tabIndex={0}
        role="slider"
        aria-valuemin={min}
        aria-valuemax={max}
        aria-valuenow={Math.round(currentEps * 1000) / 1000}
        aria-label="Perturbation epsilon"
        onKeyDown={handleKeyDown}
      >
        {/* Rail */}
        <div
          className="absolute left-0 right-0 rounded-full"
          style={{
            top: '50%',
            transform: 'translateY(-50%)',
            height: '6px',
            background: railBackground,
          }}
        />

        {/* ε* tick marker */}
        {starRatio !== null && (
          <div
            className="absolute pointer-events-none"
            style={{
              left: `${starRatio * 100}%`,
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: '2px',
              height: '16px',
              backgroundColor: 'rgba(255, 255, 255, 0.5)',
            }}
          />
        )}

        {/* Thumb */}
        <div
          className={`
            absolute top-1/2 -translate-y-1/2 -translate-x-1/2 rounded-full
            w-6 h-6 compact:w-5 compact:h-5 mobile:w-8 mobile:h-8
            ${isDragging ? 'cursor-grabbing' : 'cursor-grab'}
            transition-shadow duration-150
          `}
          style={{
            left: `${ratio * 100}%`,
            backgroundColor: '#ffffff',
            boxShadow: `0 0 12px ${glowColor}`,
          }}
        />

        {/* Focus ring style */}
        <style>{`
          [role="slider"]:focus-visible {
            outline: 2px solid #38bdf8;
            outline-offset: 2px;
            border-radius: 4px;
          }
          [role="slider"]:focus:not(:focus-visible) {
            outline: none;
          }
        `}</style>
      </div>

      {/* Labels row */}
      <div className="relative w-full mt-1" style={{ height: '32px' }}>
        {/* Min label */}
        <span className="absolute left-0 text-mono-sm text-text-muted" style={{ fontSize: '14px' }}>
          0
        </span>

        {/* ε readout below thumb */}
        <span
          className="absolute -translate-x-1/2 text-mono-lg compact:text-mono-md text-text-primary whitespace-nowrap"
          style={{ left: labelLeft }}
        >
          ε = {currentEps.toFixed(3)}
        </span>

        {/* Max label */}
        <span className="absolute right-0 text-mono-sm text-text-muted" style={{ fontSize: '14px' }}>
          0.35
        </span>
      </div>
    </div>
  );
}
