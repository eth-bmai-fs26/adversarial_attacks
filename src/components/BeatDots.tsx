import { useEffect, useRef } from 'react';
import type { Beat } from '../types';

const BEATS: Beat[] = [0, 1, '2a', '2b', 3];

interface BeatDotsProps {
  currentBeat: Beat;
  onBeatClick: (beat: Beat) => void;
}

export default function BeatDots({ currentBeat, onBeatClick }: BeatDotsProps) {
  const activeRef = useRef<HTMLButtonElement | null>(null);

  // Pulse animation on beat change
  useEffect(() => {
    const el = activeRef.current;
    if (!el) return;
    el.animate(
      [
        { transform: 'scale(1)' },
        { transform: 'scale(1.2)' },
        { transform: 'scale(1)' },
      ],
      { duration: 300, easing: 'ease-out' }
    );
  }, [currentBeat]);

  return (
    <div className="flex items-center gap-0" role="navigation" aria-label="Beat navigation">
      {BEATS.map((beat, i) => {
        const isActive = currentBeat === beat;
        const showConnector = beat === '2a'; // connector between 2a and 2b

        return (
          <div key={String(beat)} className="flex items-center">
            <button
              ref={isActive ? activeRef : null}
              onClick={() => onBeatClick(beat)}
              aria-label={`Beat ${beat}`}
              aria-current={isActive ? 'step' : undefined}
              className="beat-dot"
              style={{
                width: 'var(--dot-size)',
                height: 'var(--dot-size)',
                borderRadius: '50%',
                border: isActive ? 'none' : '1.5px solid var(--color-text-muted)',
                backgroundColor: isActive ? 'var(--color-text-primary)' : 'transparent',
                cursor: 'pointer',
                padding: 0,
                flexShrink: 0,
              }}
            />
            {showConnector && (
              <div
                style={{
                  width: '12px',
                  height: '1.5px',
                  backgroundColor: 'var(--color-text-muted)',
                  flexShrink: 0,
                }}
              />
            )}
            {!showConnector && i < BEATS.length - 1 && beat !== '2b' && (
              <div style={{ width: 'var(--dot-gap)', flexShrink: 0 }} />
            )}
            {beat === '2b' && i < BEATS.length - 1 && (
              <div style={{ width: 'var(--dot-gap)', flexShrink: 0 }} />
            )}
          </div>
        );
      })}
    </div>
  );
}
