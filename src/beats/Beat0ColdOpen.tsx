import { useState, useEffect, useRef, useCallback } from 'react';
import ShatterLabel from '../components/ShatterLabel';

interface Beat0Props {
  onComplete: () => void;
  isActive: boolean;
}

type Phase = 'image' | 'label' | 'subtitle' | 'shatter' | 'bridge' | 'continue';

const PHASE_DELAYS: Record<string, number> = {
  label: 1500,
  subtitle: 2000,   // 3500 - 1500
  shatter: 1500,     // 5000 - 3500
  bridge: 2000,      // 7000 - 5000
  continue: 1000,    // 8000 - 7000
};

const PHASE_ORDER: Phase[] = ['image', 'label', 'subtitle', 'shatter', 'bridge', 'continue'];

function phaseIndex(p: Phase): number {
  return PHASE_ORDER.indexOf(p);
}

export default function Beat0ColdOpen({ onComplete, isActive }: Beat0Props) {
  const [phase, setPhase] = useState<Phase>('image');
  const [fading, setFading] = useState(false);
  const [imageSwapped, setImageSwapped] = useState(false);
  const [cleanError, setCleanError] = useState(false);
  const [advError, setAdvError] = useState(false);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const shatterTarget = useRef<{ text: string; color: string } | null>(null);

  // Start/restart sequence when isActive becomes true
  useEffect(() => {
    if (!isActive) {
      // Reset everything
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
      setPhase('image');
      setFading(false);
      setImageSwapped(false);
      shatterTarget.current = null;
      return;
    }

    // Schedule phase transitions
    const timers: ReturnType<typeof setTimeout>[] = [];
    let elapsed = 0;

    for (let i = 1; i < PHASE_ORDER.length; i++) {
      const nextPhase = PHASE_ORDER[i];
      const key = nextPhase as string;
      elapsed += PHASE_DELAYS[key] ?? 0;
      const t = setTimeout(() => {
        setPhase(nextPhase);
        // Swap image at shatter time
        if (nextPhase === 'shatter') {
          setTimeout(() => setImageSwapped(true), 500); // 5.5s = 5.0s + 0.5s
        }
      }, elapsed);
      timers.push(t);
    }

    timersRef.current = timers;
    return () => {
      timers.forEach(clearTimeout);
    };
  }, [isActive]);

  const advance = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    setFading(true);
    setTimeout(() => onComplete(), 200);
  }, [onComplete]);

  // Global keyboard handler for skip
  useEffect(() => {
    if (!isActive) return;

    const handler = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if (e.key === 'ArrowRight' || e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        advance();
      }
    };

    // Use capture phase to intercept before useBeatNavigation
    window.addEventListener('keydown', handler, true);
    return () => window.removeEventListener('keydown', handler, true);
  }, [isActive, advance]);

  const reached = (p: Phase) => phaseIndex(phase) >= phaseIndex(p);

  // Compute shatterTo only when shatter phase is reached
  const shatterTo = reached('shatter')
    ? { text: 'Gibbon \u2014 99.7%', color: '#f472b6' }
    : null;

  return (
    <div
      className="flex-1 flex flex-col items-center justify-center relative px-4"
      style={{
        opacity: fading ? 0 : 1,
        transition: 'opacity 200ms ease-out',
      }}
      onClick={advance}
    >
      {/* Panda image with vignette */}
      <div className="relative mb-6">
        <div className="relative">
          {/* Clean panda */}
          {!cleanError ? (
            <img
              src="/assets/panda_clean.jpg"
              alt="Giant Panda"
              className="block mx-auto object-contain rounded"
              style={{
                maxWidth: '600px',
                maxHeight: '60vh',
                opacity: imageSwapped ? 0 : 1,
                transition: 'opacity 300ms ease',
                position: imageSwapped ? 'absolute' : 'relative',
                inset: 0,
                width: '100%',
              }}
              onError={() => setCleanError(true)}
            />
          ) : null}

          {/* Adversarial panda (crossfade) */}
          {!advError ? (
            <img
              src="/assets/panda_adversarial.jpg"
              alt="Adversarial Panda"
              className="block mx-auto object-contain rounded"
              style={{
                maxWidth: '600px',
                maxHeight: '60vh',
                opacity: imageSwapped ? 1 : 0,
                transition: 'opacity 300ms ease',
                position: !imageSwapped ? 'absolute' : 'relative',
                inset: 0,
                width: '100%',
              }}
              onError={() => setAdvError(true)}
            />
          ) : null}

          {/* Placeholder when images missing */}
          {cleanError && advError && (
            <div
              className="flex items-center justify-center rounded"
              style={{
                width: '400px',
                height: '400px',
                maxWidth: '80vw',
                maxHeight: '60vh',
                background: 'linear-gradient(135deg, #1a3a2a 0%, #0f2a1a 100%)',
                border: '2px dashed #94a3b8',
              }}
            >
              <span className="text-body-lg text-muted text-center px-4">
                Place panda_clean.jpg and<br />panda_adversarial.jpg in public/assets/
              </span>
            </div>
          )}

          {/* Vignette overlay */}
          <div
            className="absolute inset-0 pointer-events-none rounded"
            style={{
              boxShadow: 'inset 0 0 100px 40px #0f172a',
            }}
          />
        </div>
      </div>

      {/* Label area */}
      <div className="text-center mt-2">
        {/* ShatterLabel: Giant Panda → Gibbon */}
        <div
          style={{
            opacity: reached('label') ? 1 : 0,
            transition: 'opacity 400ms ease-out',
          }}
        >
          <ShatterLabel
            text="Giant Panda — 99.3%"
            color="#38bdf8"
            className="text-label-hero font-display font-bold"
            shatterTo={shatterTo}
          />
        </div>

        {/* Subtitle */}
        <p
          className="text-body-lg font-body mt-3"
          style={{
            color: '#94a3b8',
            opacity: reached('subtitle') ? 1 : 0,
            transition: 'opacity 400ms ease-out',
          }}
        >
          Every pixel changed by less than 0.7%
        </p>

        {/* Bridge text */}
        <p
          className="text-body-md font-body mt-4"
          style={{
            color: '#94a3b8',
            opacity: reached('bridge') ? 1 : 0,
            transition: 'opacity 400ms ease-out',
          }}
        >
          Same math, simpler image — let's see why.
        </p>
      </div>

      {/* Continue prompt — bottom right */}
      {reached('continue') && (
        <button
          className="absolute bottom-6 right-6 text-body-md font-body cursor-pointer bg-transparent border-none"
          style={{
            color: '#f1f5f9',
            animation: 'beat0-pulse 2s ease-in-out infinite',
          }}
          onClick={(e) => {
            e.stopPropagation();
            advance();
          }}
        >
          Continue →
        </button>
      )}

      {/* Skip intro — bottom left */}
      <button
        className="absolute bottom-6 left-6 text-body-sm font-body cursor-pointer bg-transparent border-none"
        style={{ color: '#94a3b8' }}
        onClick={(e) => {
          e.stopPropagation();
          advance();
        }}
      >
        Skip intro
      </button>

      {/* Pulse animation */}
      <style>{`
        @keyframes beat0-pulse {
          0%, 100% { opacity: 0.6; }
          50% { opacity: 1; }
        }
      `}</style>
    </div>
  );
}
