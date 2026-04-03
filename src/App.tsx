import { useState, useEffect, useCallback } from 'react';
import { useBeatNavigation } from './hooks/useBeatNavigation';
import BeatDots from './components/BeatDots';
import BeatContainer from './components/BeatContainer';
import ImageGallery from './components/ImageGallery';
import { loadStandardModel } from './lib/data';
import type { Beat, ModelData } from './types';

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

  const [modelData, setModelData] = useState<ModelData | null>(null);
  const [selectedImageId, setSelectedImageId] = useState<number>(0);
  const [galleryOpen, setGalleryOpen] = useState(false);

  // Load standard model data
  useEffect(() => {
    loadStandardModel().then(data => {
      setModelData(data);
      if (data.images.length > 0) {
        setSelectedImageId(data.images[0].id);
      }
    }).catch(() => {
      // Data not available yet (precompute not run)
    });
  }, []);

  const handleSelectImage = useCallback((id: number) => {
    setSelectedImageId(id);
  }, []);

  const handleGalleryToggle = useCallback(() => {
    setGalleryOpen(prev => !prev);
  }, []);

  const showSliderArea = currentBeat !== 0;

  return (
    <div className="min-h-screen flex flex-col no-select">
      {/* Header — 40px (32px compact), hidden on mobile */}
      <header className="beat-header shrink-0 flex items-center justify-center relative">
        <BeatDots currentBeat={currentBeat} onBeatClick={goToBeat} />
        {/* Settings placeholder */}
        <button
          className="absolute right-4 top-1/2 -translate-y-1/2 text-muted hover:text-primary transition-colors"
          aria-label="Settings"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="10" cy="10" r="3" />
            <path d="M10 1v2m0 14v2M1 10h2m14 0h2m-2.9-6.4-1.4 1.4M5.3 14.7l-1.4 1.4m0-11.8 1.4 1.4m9.4 9.4 1.4 1.4" />
          </svg>
        </button>
      </header>

      {/* Beat content area */}
      <BeatContainer currentBeat={currentBeat} isTransitioning={isTransitioning}>
        <BeatPlaceholder beat={currentBeat} />
      </BeatContainer>

      {/* Epsilon slider area — reserved for Beats 1-3 */}
      {showSliderArea && (
        <div className="beat-slider-area shrink-0 flex items-center justify-end px-6">
          {/* Gallery trigger */}
          {modelData && (
            <button
              onClick={handleGalleryToggle}
              className="text-body-md text-primary hover:text-true-class transition-colors"
            >
              Explore all images &rarr;
            </button>
          )}
        </div>
      )}

      {/* Mobile dots — shown only on <768px */}
      <div className="beat-dots-mobile shrink-0 flex items-center justify-center">
        <BeatDots currentBeat={currentBeat} onBeatClick={goToBeat} />
      </div>

      {/* Image Gallery overlay */}
      {modelData && (
        <ImageGallery
          images={modelData.images}
          selectedImageId={selectedImageId}
          onSelectImage={handleSelectImage}
          isOpen={galleryOpen}
          onToggle={handleGalleryToggle}
        />
      )}
    </div>
  );
}
