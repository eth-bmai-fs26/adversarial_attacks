import React, { useRef, useEffect } from 'react';

/** Compute perturbed pixel values (useful for other components) */
export function computePerturbedPixels(
  pixels: number[],
  signMap: number[],
  epsilon: number
): number[] {
  return pixels.map((p, i) => Math.max(0, Math.min(1, p + epsilon * signMap[i])));
}

interface MnistCanvasProps {
  pixels: number[];       // [784], original image, values in [0, 1]
  signMap: number[];      // [784], values -1, 0, +1
  epsilon: number;        // Current perturbation magnitude [0, 0.35]
  dimmed: boolean;        // true = dim to 35% opacity (for Ghost reveal)
  size?: number;          // CSS width/height in pixels (default 480)
  className?: string;
}

// Background: #0f172a → (15, 23, 42)
// Foreground: #f1f5f9 → (241, 245, 249)
const BG_R = 15, BG_G = 23, BG_B = 42;
const FG_R = 241, FG_G = 245, FG_B = 249;

const MnistCanvas: React.FC<MnistCanvasProps> = React.memo(
  ({ pixels, signMap, epsilon, dimmed, size = 480, className }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const rafRef = useRef<number>(0);

    useEffect(() => {
      const canvas = canvasRef.current;
      if (!canvas) return;

      // Cancel any pending frame
      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      rafRef.current = requestAnimationFrame(() => {
        const res = size * 2;
        if (canvas.width !== res || canvas.height !== res) {
          canvas.width = res;
          canvas.height = res;
        }

        const ctx = canvas.getContext('2d', { alpha: false });
        if (!ctx) return;

        const imgData = ctx.createImageData(res, res);
        const data = imgData.data;

        // Precompute block sizes for nearest-neighbor upscaling
        // 28 pixels → res canvas pixels. Base block = floor(res/28), remainder distributed.
        const baseBlock = Math.floor(res / 28);
        const remainder = res - baseBlock * 28;

        // Build a lookup: for each of 28 rows/cols, the start pixel and block size
        const blockStarts = new Int32Array(29);
        for (let k = 0; k < 28; k++) {
          const extra = k < remainder ? 1 : 0;
          blockStarts[k + 1] = blockStarts[k] + baseBlock + extra;
        }

        for (let row = 0; row < 28; row++) {
          const y0 = blockStarts[row];
          const y1 = blockStarts[row + 1];
          const rowOffset = row * 28;

          for (let col = 0; col < 28; col++) {
            const idx = rowOffset + col;
            const perturbed = Math.max(0, Math.min(1, pixels[idx] + epsilon * signMap[idx]));

            const r = BG_R + (FG_R - BG_R) * perturbed;
            const g = BG_G + (FG_G - BG_G) * perturbed;
            const b = BG_B + (FG_B - BG_B) * perturbed;

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
      });

      return () => {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
      };
    }, [pixels, signMap, epsilon, size]);

    return (
      <canvas
        ref={canvasRef}
        className={className}
        style={{
          width: size,
          height: size,
          imageRendering: 'pixelated',
          opacity: dimmed ? 0.35 : 1,
          transition: 'opacity 300ms ease-in-out',
        }}
      />
    );
  },
  (prev, next) =>
    prev.pixels === next.pixels &&
    prev.signMap === next.signMap &&
    prev.epsilon === next.epsilon &&
    prev.dimmed === next.dimmed &&
    prev.size === next.size &&
    prev.className === next.className
);

MnistCanvas.displayName = 'MnistCanvas';

export default MnistCanvas;
