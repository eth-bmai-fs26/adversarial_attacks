import { lazy, Suspense, useEffect, useState, useCallback } from 'react';
import type { SurfaceData, SurfaceImageData } from '../types';
import { loadSurfaceData } from '../lib/data';

const AdvancedMode3DScene = lazy(() => import('./AdvancedMode3DScene'));

export interface AdvancedMode3DProps {
  imageId: number;
  isOpen: boolean;
  onClose: () => void;
}

export default function AdvancedMode3D({ imageId, isOpen, onClose }: AdvancedMode3DProps) {
  const [surfaceData, setSurfaceData] = useState<SurfaceData | null>(null);
  const [imageData, setImageData] = useState<SurfaceImageData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [playing, setPlaying] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    loadSurfaceData()
      .then(data => {
        if (cancelled) return;
        setSurfaceData(data);
        const img = data.images.find(i => i.id === imageId) ?? data.images[0];
        setImageData(img);
      })
      .catch(() => {
        if (!cancelled) setError('Failed to load 3D surface data');
      });
    return () => { cancelled = true; };
  }, [isOpen, imageId]);

  useEffect(() => {
    if (!isOpen) return;
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [isOpen, onClose]);

  // Reset play state when closing
  useEffect(() => {
    if (!isOpen) setPlaying(false);
  }, [isOpen]);

  const handlePlay = useCallback(() => setPlaying(true), []);
  const handleReset = useCallback(() => setPlaying(false), []);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center"
      style={{ backgroundColor: 'rgba(15, 23, 42, 0.9)' }}
    >
      <div className="relative w-[700px] max-w-[95vw] max-h-[95vh] bg-canvas rounded-xl border border-white/10 shadow-2xl flex flex-col overflow-hidden
        compact:w-[560px] mobile:w-full mobile:h-full mobile:max-w-none mobile:max-h-none mobile:rounded-none"
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-3 border-b border-white/10">
          <button
            onClick={onClose}
            className="text-text-muted hover:text-text-primary transition-colors font-body text-sm"
          >
            ✕ Close
          </button>
          <span className="font-body text-sm text-text-primary">
            Advanced: Compare Attacks
          </span>
          <div className="w-16" /> {/* Spacer for centering */}
        </div>

        {/* Content */}
        <div className="flex-1 flex flex-col items-center px-5 py-4 min-h-0">
          {error ? (
            <div className="flex-1 flex items-center justify-center text-text-muted font-body text-sm">
              {error}
            </div>
          ) : !imageData ? (
            <div className="flex-1 flex items-center justify-center text-text-muted font-body text-sm">
              Loading 3D surface…
            </div>
          ) : (
            <Suspense fallback={
              <div className="flex-1 flex items-center justify-center text-text-muted font-body text-sm">
                Loading 3D engine…
              </div>
            }>
              <div className="w-[600px] h-[400px] compact:w-[500px] compact:h-[350px] mobile:w-full mobile:flex-1 rounded-lg overflow-hidden relative">
                <AdvancedMode3DScene
                  imageData={imageData}
                  gridRange={surfaceData!.subspace_info.grid_range}
                  gridSize={surfaceData!.subspace_info.grid_size}
                  playing={playing}
                  onAnimationComplete={handleReset}
                />
                {/* Legend */}
                <div className="absolute bottom-3 left-3 bg-canvas/80 rounded px-3 py-2 font-body text-xs text-text-muted space-y-1 pointer-events-none">
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-4 h-0.5 bg-[#fbbf24]" />
                    <span>FGSM (1 step)</span>
                  </div>
                  {imageData.pgd_path_visible && (
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-4 h-0.5 bg-[#22d3ee]" />
                      <span>PGD (20 steps)</span>
                    </div>
                  )}
                  {imageData.cw_path_visible && (
                    <div className="flex items-center gap-2">
                      <span className="inline-block w-4 h-0.5 bg-[#f472b6]" />
                      <span>C&W (optimized)</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <span className="inline-block w-4 h-0.5 bg-white" />
                    <span>Decision boundary</span>
                  </div>
                </div>
              </div>
            </Suspense>
          )}

          {/* Degenerate path notices */}
          {imageData && !imageData.pgd_path_visible && (
            <p className="font-body text-xs text-text-muted mt-1">
              PGD path not visible in this cross-section
            </p>
          )}
          {imageData && !imageData.cw_path_visible && (
            <p className="font-body text-xs text-text-muted mt-1">
              C&W path not visible in this cross-section
            </p>
          )}

          {/* Disclaimer */}
          <p className="font-body text-sm text-text-muted mt-3 text-center">
            Cross-section through FGSM direction — 782 other directions not shown
          </p>

          {/* Controls */}
          <div className="flex gap-3 mt-3 pb-1">
            <button
              onClick={handlePlay}
              disabled={playing || !imageData}
              className="px-4 py-1.5 rounded font-body text-sm text-text-primary bg-white/10 hover:bg-white/20 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Play paths
            </button>
            <button
              data-reset-camera
              disabled={!imageData}
              className="px-4 py-1.5 rounded font-body text-sm text-text-muted bg-white/5 hover:bg-white/10 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
            >
              Reset camera
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
