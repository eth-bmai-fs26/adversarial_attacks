import { useState, useCallback, useEffect, useRef } from 'react';
import type { Beat } from '../types';

const BEAT_ORDER: Beat[] = [0, 1, '2a', '2b', 3];
const TRANSITION_DURATION = 400;

// Number keys map to beats by position
const KEY_TO_BEAT: Record<string, Beat> = {
  '1': 0,
  '2': 1,
  '3': '2a',
  '4': 3,
};

export interface UseBeatNavigation {
  currentBeat: Beat;
  goToBeat: (beat: Beat) => void;
  goNext: () => void;
  goPrev: () => void;
  resetToStart: () => void;
  isTransitioning: boolean;
  transitionDirection: 'forward' | 'backward' | null;
}

function beatIndex(beat: Beat): number {
  return BEAT_ORDER.indexOf(beat);
}

export function useBeatNavigation(): UseBeatNavigation {
  const [currentBeat, setCurrentBeat] = useState<Beat>(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [transitionDirection, setTransitionDirection] = useState<'forward' | 'backward' | null>(null);
  const transitionTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isTransitioningRef = useRef(false);

  const startTransition = useCallback((direction: 'forward' | 'backward') => {
    isTransitioningRef.current = true;
    setTransitionDirection(direction);
    setIsTransitioning(true);
    if (transitionTimer.current) clearTimeout(transitionTimer.current);
    transitionTimer.current = setTimeout(() => {
      isTransitioningRef.current = false;
      setIsTransitioning(false);
      setTransitionDirection(null);
    }, TRANSITION_DURATION);
  }, []);

  const navigateTo = useCallback((target: Beat) => {
    if (isTransitioningRef.current) return;
    setCurrentBeat((prev) => {
      if (prev === target) return prev;
      const direction = beatIndex(target) > beatIndex(prev) ? 'forward' : 'backward';
      startTransition(direction);
      return target;
    });
  }, [startTransition]);

  const goNext = useCallback(() => {
    if (isTransitioningRef.current) return;
    setCurrentBeat((prev) => {
      const idx = beatIndex(prev);
      if (idx >= BEAT_ORDER.length - 1) return prev;
      startTransition('forward');
      return BEAT_ORDER[idx + 1];
    });
  }, [startTransition]);

  const goPrev = useCallback(() => {
    if (isTransitioningRef.current) return;
    setCurrentBeat((prev) => {
      const idx = beatIndex(prev);
      if (idx <= 0) return prev;
      startTransition('backward');
      return BEAT_ORDER[idx - 1];
    });
  }, [startTransition]);

  const resetToStart = useCallback(() => {
    navigateTo(0);
  }, [navigateTo]);

  // Keyboard handler
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      // Don't fire when typing in input fields
      const tag = (e.target as HTMLElement).tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return;
      if ((e.target as HTMLElement).isContentEditable) return;

      if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNext();
      } else if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrev();
      } else if (e.key === 'Escape') {
        e.preventDefault();
        resetToStart();
      } else if (e.key in KEY_TO_BEAT) {
        e.preventDefault();
        navigateTo(KEY_TO_BEAT[e.key]);
      }
    };

    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [goNext, goPrev, resetToStart, navigateTo]);

  // Mobile swipe navigation (50px horizontal threshold)
  useEffect(() => {
    let touchStartX = 0;
    let touchStartY = 0;

    const onTouchStart = (e: TouchEvent) => {
      touchStartX = e.touches[0].clientX;
      touchStartY = e.touches[0].clientY;
    };

    const onTouchEnd = (e: TouchEvent) => {
      const dx = e.changedTouches[0].clientX - touchStartX;
      const dy = e.changedTouches[0].clientY - touchStartY;
      // Only trigger if horizontal swipe is dominant and exceeds threshold
      if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
        if (dx < 0) goNext();
        else goPrev();
      }
    };

    window.addEventListener('touchstart', onTouchStart, { passive: true });
    window.addEventListener('touchend', onTouchEnd, { passive: true });
    return () => {
      window.removeEventListener('touchstart', onTouchStart);
      window.removeEventListener('touchend', onTouchEnd);
    };
  }, [goNext, goPrev]);

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (transitionTimer.current) clearTimeout(transitionTimer.current);
    };
  }, []);

  return {
    currentBeat,
    goToBeat: navigateTo,
    goNext,
    goPrev,
    resetToStart,
    isTransitioning,
    transitionDirection,
  };
}
