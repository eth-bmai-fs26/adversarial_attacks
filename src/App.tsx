import { useState, useEffect, useCallback } from 'react';
import { useBeatNavigation } from './hooks/useBeatNavigation';
import BeatDots from './components/BeatDots';
import BeatContainer from './components/BeatContainer';
import Beat0ColdOpen from './beats/Beat0ColdOpen';
import Beat1Crime from './beats/Beat1Crime';
import Beat2aGhost from './beats/Beat2aGhost';
import Beat2bSplit from './beats/Beat2bSplit';
import ImageGallery from './components/ImageGallery';
import { loadStandardModel, getImageById } from './lib/data';
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
    goNext,
    isTransitioning,
  } = useBeatNavigation();

  const [standardModel, setStandardModel] = useState<ModelData | null>(null);
  const [selectedImageId, setSelectedImageId] = useState(0);
  const [epsilon, setEpsilon] = useState(0);
  const [galleryOpen, setGalleryOpen] = useState(false);

  // Load standard model data on mount
  useEffect(() => {
    loadStandardModel().then(setStandardModel).catch(console.error);
  }, []);

  // Reset epsilon when navigating to beat 0 (Escape key reset)
  useEffect(() => {
    if (currentBeat === 0) {
      setEpsilon(0);
    }
  }, [currentBeat]);

  const selectedImage = standardModel
    ? getImageById(standardModel, selectedImageId) ?? standardModel.images[0]
    : null;

  const handleSelectImage = useCallback((id: number) => {
    setSelectedImageId(id);
    setEpsilon(0);
  }, []);

  const handleGalleryToggle = useCallback(() => {
    setGalleryOpen(prev => !prev);
  }, []);

  const showSliderArea = currentBeat !== 0 && currentBeat !== 1;

  function renderBeat() {
    if (currentBeat === 0) {
      return <Beat0ColdOpen isActive={currentBeat === 0} onComplete={goNext} />;
    }
    if (currentBeat === 1 && selectedImage) {
      return (
        <Beat1Crime
          imageData={selectedImage}
          isActive={currentBeat === 1 && !isTransitioning}
          epsilon={epsilon}
          onEpsilonChange={setEpsilon}
        />
      );
    }
    if (currentBeat === '2a' && selectedImage) {
      return (
        <Beat2aGhost
          imageData={selectedImage}
          epsilon={epsilon}
          onEpsilonChange={setEpsilon}
          isActive={currentBeat === '2a' && !isTransitioning}
        />
      );
    }
    if (currentBeat === '2b' && selectedImage) {
      return (
        <Beat2bSplit
          imageData={selectedImage}
          epsilon={epsilon}
          onEpsilonChange={setEpsilon}
          isActive={currentBeat === '2b' && !isTransitioning}
        />
      );
    }
    return <BeatPlaceholder beat={currentBeat} />;
  }

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
        {renderBeat()}
      </BeatContainer>

      {/* Epsilon slider area — reserved for beats that don't embed their own slider */}
      {showSliderArea && currentBeat !== '2a' && currentBeat !== '2b' && (
        <div className="beat-slider-area shrink-0 flex items-center justify-end px-6">
          {/* Gallery trigger */}
          {standardModel && (
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
      {standardModel && (
        <ImageGallery
          images={standardModel.images}
          selectedImageId={selectedImageId}
          onSelectImage={handleSelectImage}
          isOpen={galleryOpen}
          onToggle={handleGalleryToggle}
        />
      )}
    </div>
  );
}
