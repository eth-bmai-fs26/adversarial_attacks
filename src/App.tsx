import { useState, useEffect, useCallback, useRef, lazy, Suspense } from 'react';
import { useBeatNavigation } from './hooks/useBeatNavigation';
import BeatDots from './components/BeatDots';
import BeatContainer from './components/BeatContainer';
import TabBar from './components/TabBar';
import Settings from './components/Settings';
import LoadingScreen from './components/LoadingScreen';
import ErrorBoundary from './components/ErrorBoundary';
import Beat0ColdOpen from './beats/Beat0ColdOpen';
import Beat1Crime from './beats/Beat1Crime';
import Beat2aGhost from './beats/Beat2aGhost';
import Beat2bSplit from './beats/Beat2bSplit';
import Beat3Adversarial from './beats/Beat3Adversarial';
import ImageGallery from './components/ImageGallery';
import { loadStandardModel, loadRobustModel, getImageById } from './lib/data';
import type { ModelData } from './types';

const LabMode = lazy(() => import('./beats/LabMode'));
const AdvancedMode3D = lazy(() => import('./beats/AdvancedMode3D'));

export default function App() {
  const {
    currentBeat,
    goToBeat,
    goNext,
    isTransitioning,
  } = useBeatNavigation();

  // Data loading state
  const [standardModel, setStandardModel] = useState<ModelData | null>(null);
  const [robustModel, setRobustModel] = useState<ModelData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Shared state
  const [activeTab, setActiveTab] = useState<'demo' | 'lab'>('demo');
  const [selectedImageId, setSelectedImageId] = useState(0);
  const [epsilon, setEpsilon] = useState(0);
  const [highContrast, setHighContrast] = useState(false);
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [advancedModeOpen, setAdvancedModeOpen] = useState(false);

  // Lazy-load robust model on first Beat 3 visit
  const robustLoadedRef = useRef(false);
  const [robustLoading, setRobustLoading] = useState(false);

  // Load standard model on startup
  useEffect(() => {
    loadStandardModel()
      .then(setStandardModel)
      .catch(err => setError(err.message))
      .finally(() => setLoading(false));
  }, []);

  // Lazy-load robust model when Beat 3 is first visited
  useEffect(() => {
    if (currentBeat === 3 && !robustLoadedRef.current && !robustModel) {
      robustLoadedRef.current = true;
      setRobustLoading(true);
      loadRobustModel()
        .then(setRobustModel)
        .catch(err => console.error('Failed to load robust model:', err))
        .finally(() => setRobustLoading(false));
    }
  }, [currentBeat, robustModel]);

  // Reset epsilon when navigating to Beat 0
  useEffect(() => {
    if (currentBeat === 0) {
      setEpsilon(0);
    }
  }, [currentBeat]);

  const selectedImage = standardModel
    ? getImageById(standardModel, selectedImageId) ?? standardModel.images[0]
    : null;

  const robustImage = robustModel
    ? getImageById(robustModel, selectedImageId) ?? robustModel.images[0]
    : null;

  const handleSelectImage = useCallback((id: number) => {
    setSelectedImageId(id);
    setEpsilon(0);
  }, []);

  const handleGalleryToggle = useCallback(() => {
    setGalleryOpen(prev => !prev);
  }, []);

  const handleTabChange = useCallback((tab: 'demo' | 'lab') => {
    setActiveTab(tab);
  }, []);

  // Loading / error screens
  if (loading) return <LoadingScreen />;
  if (error) return <LoadingScreen error={error} />;

  function renderBeat() {
    if (currentBeat === 0) {
      return (
        <ErrorBoundary>
          <Beat0ColdOpen isActive={currentBeat === 0} onComplete={goNext} />
        </ErrorBoundary>
      );
    }
    if (currentBeat === 1 && selectedImage) {
      return (
        <ErrorBoundary>
          <Beat1Crime
            imageData={selectedImage}
            isActive={currentBeat === 1 && !isTransitioning}
            epsilon={epsilon}
            onEpsilonChange={setEpsilon}
          />
        </ErrorBoundary>
      );
    }
    if (currentBeat === '2a' && selectedImage) {
      return (
        <ErrorBoundary>
          <Beat2aGhost
            imageData={selectedImage}
            epsilon={epsilon}
            onEpsilonChange={setEpsilon}
            isActive={currentBeat === '2a' && !isTransitioning}
            highContrast={highContrast}
          />
        </ErrorBoundary>
      );
    }
    if (currentBeat === '2b' && selectedImage) {
      return (
        <ErrorBoundary>
          <Beat2bSplit
            imageData={selectedImage}
            epsilon={epsilon}
            onEpsilonChange={setEpsilon}
            isActive={currentBeat === '2b' && !isTransitioning}
          />
        </ErrorBoundary>
      );
    }
    if (currentBeat === 3 && selectedImage) {
      return (
        <ErrorBoundary>
          <Beat3Adversarial
            standardImageData={selectedImage}
            robustImageData={robustImage ?? null}
            epsilon={epsilon}
            onEpsilonChange={setEpsilon}
            isActive={currentBeat === 3 && !isTransitioning}
            highContrast={highContrast}
          />
          {robustLoading && (
            <p className="text-body-sm text-muted text-center mt-2 animate-pulse">
              Loading robust model...
            </p>
          )}
        </ErrorBoundary>
      );
    }
    return null;
  }

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
        <Settings
          highContrast={highContrast}
          onHighContrastChange={setHighContrast}
        />
      </header>

      {/* Content area */}
      <div className="flex-1 flex flex-col relative">
        {activeTab === 'demo' ? (
          <>
            <BeatContainer currentBeat={currentBeat} isTransitioning={isTransitioning}>
              {renderBeat()}
            </BeatContainer>

            {/* Gallery trigger for beats that don't have their own */}
            {currentBeat !== 0 && standardModel && (
              <div className="beat-slider-area shrink-0 flex items-center justify-end px-6">
                <button
                  onClick={handleGalleryToggle}
                  className="text-body-md text-primary hover:text-true-class transition-colors"
                  aria-label="Open image gallery"
                >
                  Explore all images &rarr;
                </button>
              </div>
            )}
          </>
        ) : (
          <Suspense
            fallback={
              <div className="flex-1 flex items-center justify-center">
                <p className="text-body-md animate-pulse" style={{ color: '#94a3b8' }}>
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

      {/* 3D Advanced Mode overlay (lazy-loaded) */}
      {advancedModeOpen && (
        <Suspense
          fallback={
            <div className="fixed inset-0 z-50 flex items-center justify-center" style={{ backgroundColor: 'rgba(15, 23, 42, 0.95)' }}>
              <p className="text-body-md animate-pulse" style={{ color: '#94a3b8' }}>
                Loading 3D mode...
              </p>
            </div>
          }
        >
          <AdvancedMode3D
            imageId={selectedImageId}
            isOpen={advancedModeOpen}
            onClose={() => setAdvancedModeOpen(false)}
          />
        </Suspense>
      )}
    </div>
  );
}
