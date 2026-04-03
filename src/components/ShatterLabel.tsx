import { useRef, useState, useEffect, useCallback, useMemo } from 'react';

interface ShatterLabelProps {
  text: string;
  color: string;
  className?: string;
  shatterTo?: {
    text: string;
    color: string;
  } | null;
  onShatterComplete?: () => void;
  duration?: number;
}

interface FragmentStyle {
  clipPath: string;
  tx: number;
  ty: number;
  rotate: number;
}

// Simple seeded PRNG for consistent randomness per text content
function seededRandom(seed: string): () => number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  }
  return () => {
    h = (h ^ (h >>> 16)) * 0x45d9f3b;
    h = (h ^ (h >>> 16)) * 0x45d9f3b;
    h = h ^ (h >>> 16);
    return (h >>> 0) / 4294967296;
  };
}

function generateFragments(seed: string, offsetScale: number): FragmentStyle[] {
  const rand = seededRandom(seed);
  const cols = 4;
  const rows = 3;
  const jitter = 5; // ±5px as percentage of bounding box (~5% jitter)

  // Generate jittered grid vertices (percentage-based)
  // Grid points: (cols+1) × (rows+1)
  const gridX: number[][] = [];
  const gridY: number[][] = [];
  for (let r = 0; r <= rows; r++) {
    gridX[r] = [];
    gridY[r] = [];
    for (let c = 0; c <= cols; c++) {
      const baseX = (c / cols) * 100;
      const baseY = (r / rows) * 100;
      // Only jitter interior vertices
      const isEdge = r === 0 || r === rows || c === 0 || c === cols;
      const jx = isEdge ? 0 : (rand() * 2 - 1) * jitter;
      const jy = isEdge ? 0 : (rand() * 2 - 1) * jitter;
      gridX[r][c] = Math.max(0, Math.min(100, baseX + jx));
      gridY[r][c] = Math.max(0, Math.min(100, baseY + jy));
    }
  }

  const fragments: FragmentStyle[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      // Quadrilateral: top-left, top-right, bottom-right, bottom-left
      const tl = `${gridX[r][c]}% ${gridY[r][c]}%`;
      const tr = `${gridX[r][c + 1]}% ${gridY[r][c + 1]}%`;
      const br = `${gridX[r + 1][c + 1]}% ${gridY[r + 1][c + 1]}%`;
      const bl = `${gridX[r + 1][c]}% ${gridY[r + 1][c]}%`;
      const clipPath = `polygon(${tl}, ${tr}, ${br}, ${bl})`;

      // Random direction and distance for fly-apart
      const angle = rand() * Math.PI * 2;
      const dist = (20 + rand() * 40) * offsetScale;
      const tx = Math.cos(angle) * dist;
      const ty = Math.sin(angle) * dist;
      const rotate = (15 + rand() * 30) * (rand() > 0.5 ? 1 : -1);

      fragments.push({ clipPath, tx, ty, rotate });
    }
  }
  return fragments;
}

type AnimPhase = 'idle' | 'shatter-out' | 'shatter-in';

export default function ShatterLabel({
  text,
  color,
  className = '',
  shatterTo = null,
  onShatterComplete,
  duration = 300,
}: ShatterLabelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [phase, setPhase] = useState<AnimPhase>('idle');
  const [displayText, setDisplayText] = useState(text);
  const [displayColor, setDisplayColor] = useState(color);
  const isAnimating = useRef(false);
  const halfDuration = duration / 2;

  // Determine offset scale based on container size
  const [offsetScale, setOffsetScale] = useState(1);
  useEffect(() => {
    if (!containerRef.current) return;
    const height = containerRef.current.getBoundingClientRect().height;
    setOffsetScale(height >= 40 ? 1 : 0.5);
  }, [text, displayText]);

  // Generate fragments with different seeds for out/in phases
  const outFragments = useMemo(
    () => generateFragments(`out-${displayText}`, offsetScale),
    [displayText, offsetScale]
  );
  const inFragments = useMemo(
    () => generateFragments(`in-${shatterTo?.text ?? ''}`, offsetScale),
    [shatterTo?.text, offsetScale]
  );

  const triggerShatter = useCallback(
    (target: { text: string; color: string }) => {
      if (isAnimating.current) return;
      isAnimating.current = true;

      // Phase 1: shatter out
      setPhase('shatter-out');

      setTimeout(() => {
        // Phase 2: swap text, shatter in
        setDisplayText(target.text);
        setDisplayColor(target.color);
        setPhase('shatter-in');

        setTimeout(() => {
          // Done
          setPhase('idle');
          isAnimating.current = false;
          onShatterComplete?.();
        }, halfDuration);
      }, halfDuration);
    },
    [halfDuration, onShatterComplete]
  );

  // Watch shatterTo prop
  const prevShatterTo = useRef(shatterTo);
  useEffect(() => {
    const prev = prevShatterTo.current;
    prevShatterTo.current = shatterTo;

    if (shatterTo && (!prev || prev.text !== shatterTo.text || prev.color !== shatterTo.color)) {
      triggerShatter(shatterTo);
    }
  }, [shatterTo, triggerShatter]);

  // Keep displayText in sync when not animating and shatterTo is null
  useEffect(() => {
    if (!isAnimating.current && !shatterTo) {
      setDisplayText(text);
      setDisplayColor(color);
    }
  }, [text, color, shatterTo]);

  const fragments = phase === 'shatter-in' ? inFragments : outFragments;
  const isOut = phase === 'shatter-out';
  const isIn = phase === 'shatter-in';
  const animating = isOut || isIn;

  return (
    <div
      ref={containerRef}
      className={`relative inline-block ${className}`}
      style={{ color: displayColor }}
    >
      {/* Static text (visible when idle) */}
      <span
        style={{
          visibility: animating ? 'hidden' : 'visible',
        }}
      >
        {displayText}
      </span>

      {/* Fragment overlays (visible during animation) */}
      {animating &&
        fragments.map((frag, i) => {
          // Out: start at rest, end scattered. In: start scattered, end at rest.
          const scattered = {
            transform: `translate(${frag.tx}px, ${frag.ty}px) rotate(${frag.rotate}deg) scale(0.8)`,
            opacity: 0,
          };
          const rest = {
            transform: 'translate(0, 0) rotate(0deg) scale(1)',
            opacity: 1,
          };

          const from = isOut ? rest : scattered;
          const to = isOut ? scattered : rest;

          return (
            <span
              key={`${phase}-${i}`}
              style={{
                position: 'absolute',
                inset: 0,
                clipPath: frag.clipPath,
                willChange: 'transform, opacity',
                color: isOut ? displayColor : (shatterTo?.color ?? displayColor),
                // Start at 'from' state, CSS animation moves to 'to' state
                animation: `shatter-frag ${halfDuration}ms ${isOut ? 'ease-out' : 'ease-in'} forwards`,
                // Pass custom properties for the animation
                '--from-transform': from.transform,
                '--from-opacity': String(from.opacity),
                '--to-transform': to.transform,
                '--to-opacity': String(to.opacity),
              } as React.CSSProperties}
            >
              {isOut ? displayText : (shatterTo?.text ?? displayText)}
            </span>
          );
        })}
    </div>
  );
}
