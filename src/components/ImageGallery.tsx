import React, { useRef, useEffect, useState, useCallback } from 'react';
import type { ImageData } from '../types';
import SignMapCanvas from './SignMapCanvas';

interface ImageGalleryProps {
  images: ImageData[];
  selectedImageId: number;
  onSelectImage: (id: number) => void;
  isOpen: boolean;
  onToggle: () => void;
}

// Small canvas to render an MNIST thumbnail at the given size
const MnistThumbnail: React.FC<{
  pixels: number[];
  size: number;
}> = React.memo(({ pixels, size }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const res = size * 2;
    if (canvas.width !== res || canvas.height !== res) {
      canvas.width = res;
      canvas.height = res;
    }

    const ctx = canvas.getContext('2d', { alpha: false });
    if (!ctx) return;

    const imgData = ctx.createImageData(res, res);
    const data = imgData.data;

    const BG_R = 15, BG_G = 23, BG_B = 42;
    const FG_R = 241, FG_G = 245, FG_B = 249;

    const baseBlock = Math.floor(res / 28);
    const remainder = res - baseBlock * 28;
    const blockStarts = new Int32Array(29);
    for (let k = 0; k < 28; k++) {
      blockStarts[k + 1] = blockStarts[k] + baseBlock + (k < remainder ? 1 : 0);
    }

    for (let row = 0; row < 28; row++) {
      const y0 = blockStarts[row];
      const y1 = blockStarts[row + 1];
      for (let col = 0; col < 28; col++) {
        const p = pixels[row * 28 + col];
        const r = BG_R + (FG_R - BG_R) * p;
        const g = BG_G + (FG_G - BG_G) * p;
        const b = BG_B + (FG_B - BG_B) * p;
        const x0 = blockStarts[col];
        const x1 = blockStarts[col + 1];
        for (let y = y0; y < y1; y++) {
          const yOff = y * res * 4;
          for (let x = x0; x < x1; x++) {
            const off = yOff + x * 4;
            data[off] = r;
            data[off + 1] = g;
            data[off + 2] = b;
            data[off + 3] = 255;
          }
        }
      }
    }

    ctx.putImageData(imgData, 0, 0);
  }, [pixels, size]);

  return (
    <canvas
      ref={canvasRef}
      style={{
        width: size,
        height: size,
        imageRendering: 'pixelated',
        display: 'block',
      }}
    />
  );
});
MnistThumbnail.displayName = 'MnistThumbnail';

function sortedByEpsilonStar(images: ImageData[]): ImageData[] {
  return [...images].sort((a, b) => {
    const ea = a.epsilon_star ?? Infinity;
    const eb = b.epsilon_star ?? Infinity;
    return ea - eb;
  });
}

const ImageGallery: React.FC<ImageGalleryProps> = ({
  images,
  selectedImageId,
  onSelectImage,
  isOpen,
  onToggle,
}) => {
  const [hoveredId, setHoveredId] = useState<number | null>(null);
  const [focusIdx, setFocusIdx] = useState<number>(0);
  const overlayRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);
  const [closing, setClosing] = useState(false);

  const sorted = React.useMemo(() => sortedByEpsilonStar(images), [images]);

  // Summary: easiest and hardest
  const easiest = sorted[0];
  const hardest = sorted[sorted.length - 1];

  // Focus the overlay when opened
  useEffect(() => {
    if (isOpen && overlayRef.current) {
      overlayRef.current.focus();
      // Set focus index to selected image
      const idx = sorted.findIndex(img => img.id === selectedImageId);
      if (idx >= 0) setFocusIdx(idx);
    }
  }, [isOpen, sorted, selectedImageId]);

  const handleClose = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onToggle();
    }, 200);
  }, [onToggle]);

  const handleSelect = useCallback((id: number) => {
    onSelectImage(id);
    setClosing(true);
    setTimeout(() => {
      setClosing(false);
      onToggle();
    }, 200);
  }, [onSelectImage, onToggle]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Escape') {
      e.preventDefault();
      handleClose();
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (sorted[focusIdx]) handleSelect(sorted[focusIdx].id);
      return;
    }

    // Compute columns from grid
    const grid = gridRef.current;
    let cols = 7;
    if (grid) {
      const style = getComputedStyle(grid);
      cols = style.gridTemplateColumns.split(' ').length;
    }

    let nextIdx = focusIdx;
    if (e.key === 'ArrowRight') nextIdx = Math.min(focusIdx + 1, sorted.length - 1);
    else if (e.key === 'ArrowLeft') nextIdx = Math.max(focusIdx - 1, 0);
    else if (e.key === 'ArrowDown') nextIdx = Math.min(focusIdx + cols, sorted.length - 1);
    else if (e.key === 'ArrowUp') nextIdx = Math.max(focusIdx - cols, 0);
    else return;

    e.preventDefault();
    setFocusIdx(nextIdx);

    // Scroll into view
    const el = grid?.children[nextIdx] as HTMLElement | undefined;
    el?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }, [focusIdx, sorted, handleClose, handleSelect]);

  const hoveredImage = hoveredId !== null ? images.find(img => img.id === hoveredId) : null;

  if (!isOpen && !closing) return null;

  const animClass = closing ? 'gallery-slide-down' : 'gallery-slide-up';

  return (
    <div
      ref={overlayRef}
      className={`gallery-overlay ${animClass}`}
      tabIndex={-1}
      onKeyDown={handleKeyDown}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-6 pt-4 pb-2">
        <button
          onClick={handleClose}
          className="text-body-md text-primary hover:text-true-class transition-colors"
        >
          &larr; Back to demo
        </button>
      </div>

      {/* Summary line */}
      {easiest && hardest && (
        <div className="px-6 pb-3 text-mono-sm text-muted">
          Easiest: &ldquo;{easiest.true_class}&rdquo; (&epsilon;* = {(easiest.epsilon_star ?? 0).toFixed(2)})
          {' '}&middot;{' '}
          Hardest: &ldquo;{hardest.true_class}&rdquo; (&epsilon;* = {(hardest.epsilon_star ?? 0).toFixed(2)})
        </div>
      )}

      {/* Grid */}
      <div className="gallery-scroll px-6 pb-6 overflow-y-auto flex-1">
        <div ref={gridRef} className="gallery-grid">
          {sorted.map((img, idx) => {
            const isSelected = img.id === selectedImageId;
            const isFocused = idx === focusIdx;
            return (
              <div
                key={img.id}
                className={`gallery-thumb ${isSelected ? 'gallery-thumb-selected' : ''} ${isFocused ? 'gallery-thumb-focused' : ''}`}
                onClick={() => handleSelect(img.id)}
                onMouseEnter={() => setHoveredId(img.id)}
                onMouseLeave={() => setHoveredId(null)}
              >
                <div className="gallery-thumb-image">
                  <MnistThumbnail pixels={img.pixels} size={80} />
                  {/* Hover preview: sign map overlay + zoom */}
                  {hoveredId === img.id && hoveredImage && (
                    <div className="gallery-hover-preview">
                      <div className="relative" style={{ width: 160, height: 160 }}>
                        <MnistThumbnail pixels={img.pixels} size={160} />
                        <div className="absolute inset-0" style={{ opacity: 0.35 }}>
                          <SignMapCanvas
                            signMap={img.loss_grad_sign}
                            deadPixelMask={img.dead_pixel_mask}
                            mode="uniform"
                            size={160}
                            highContrast={false}
                          />
                        </div>
                      </div>
                      <div className="text-body-xs text-primary mt-1 whitespace-nowrap text-center">
                        Digit {img.true_class} &middot; &epsilon;* = {(img.epsilon_star ?? 0).toFixed(3)}
                        {img.adversarial_class != null && <> &middot; Flips to {img.adversarial_class}</>}
                      </div>
                    </div>
                  )}
                </div>
                <div className="gallery-thumb-label">
                  <span className="font-display text-sm font-bold text-primary leading-none">
                    {img.true_class}
                  </span>
                  <span className="font-mono text-[11px] text-muted leading-none">
                    &epsilon;*={(img.epsilon_star ?? 0).toFixed(2)}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

ImageGallery.displayName = 'ImageGallery';

export default ImageGallery;
