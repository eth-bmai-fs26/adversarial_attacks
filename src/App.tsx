import { useState, useCallback, lazy, Suspense } from 'react';
import { useBeatNavigation } from './hooks/useBeatNavigation';
import BeatDots from './components/BeatDots';
import BeatContainer from './components/BeatContainer';
import TabBar from './components/TabBar';
import type { Beat } from './types';

const LabMode = lazy(() => import('./beats/LabMode'));

const BEAT_LABELS: Record<string, string> = {
  '0': 'Beat 0: Panda Cold Open',
  '1': 'Beat 1: The Crime',
  '2a': 'Beat 2a: The Ghost',
  '2b': 'Beat 2b: FGSM vs Gradient',
  '3': 'Beat 3: Adversarial Training',
};

function BeatPlaceholder({ beat }: { beat: Beat }) {
  return (
    <div className="text-label-main text-primary text-center">
      {BEAT_LABELS[String(beat)]}
    </div>
  );
}

export default function App() {
  const {
    currentBeat,
    goToBeat,
    isTransitioning,
  } = useBeatNavigation();

  const [activeTab, setActiveTab] = useState<'demo' | 'lab'>('demo');

  const handleTabChange = useCallback((tab: 'demo' | 'lab') => {
    setActiveTab(tab);
  }, []);

  const showSliderArea = activeTab === 'demo' && currentBeat !== 0;

  return (
    <div className="min-h-screen flex flex-col no-select">
      {/* Header — 40px (32px compact), hidden on mobile */}
      <header className="beat-header shrink-0 flex items-center justify-between relative">
        <TabBar activeTab={activeTab} onTabChange={handleTabChange} />
        {activeTab === 'demo' && (
          <div className="absolute left-1/2 -translate-x-1/2">
            <BeatDots currentBeat={currentBeat} onBeatClick={goToBeat} />
          </div>
        )}
        {/* Settings placeholder */}
        <button
          className="mr-4 text-muted hover:text-primary transition-colors"
          aria-label="Settings"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="10" cy="10" r="3" />
            <path d="M10 1v2m0 14v2M1 10h2m14 0h2m-2.9-6.4-1.4 1.4M5.3 14.7l-1.4 1.4m0-11.8 1.4 1.4m9.4 9.4 1.4 1.4" />
          </svg>
        </button>
      </header>

      {/* Content area with crossfade */}
      <div
        className="flex-1 flex flex-col relative"
        style={{ transition: 'opacity 200ms ease' }}
      >
        {activeTab === 'demo' ? (
          <>
            <BeatContainer currentBeat={currentBeat} isTransitioning={isTransitioning}>
              <BeatPlaceholder beat={currentBeat} />
            </BeatContainer>

            {showSliderArea && (
              <div className="beat-slider-area shrink-0" />
            )}
          </>
        ) : (
          <Suspense
            fallback={
              <div className="flex-1 flex items-center justify-center">
                <p className="text-body-md" style={{ color: '#94a3b8' }}>
                  Loading Lab Mode...
                </p>
              </div>
            }
          >
            <LabMode isActive={activeTab === 'lab'} />
          </Suspense>
        )}
      </div>

      {/* Mobile dots — shown only on <768px, demo tab only */}
      {activeTab === 'demo' && (
        <div className="beat-dots-mobile shrink-0 flex items-center justify-center">
          <BeatDots currentBeat={currentBeat} onBeatClick={goToBeat} />
        </div>
      )}
    </div>
  );
}
