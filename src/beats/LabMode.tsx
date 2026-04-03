import { useRef, useState, useCallback, useEffect } from 'react';
import { preprocessDrawnDigit } from '../lib/digit-preprocessing';
import {
  loadModel,
  classify,
  computeGradient,
  fgsmAttack,
  getBackendInfo,
  type ClassifyResult,
  type FGSMResult,
} from '../lib/tfjs-model';
import MnistCanvas from '../components/MnistCanvas';
import SignMapCanvas from '../components/SignMapCanvas';
import EpsilonSlider from '../components/EpsilonSlider';

interface LabModeProps {
  isActive: boolean;
}

type Status = 'idle' | 'loading' | 'ready' | 'error';

const CANVAS_SIZE = 280;
const COMPACT_SIZE = 240;

function useCanvasSize() {
  const [size, setSize] = useState(CANVAS_SIZE);
  useEffect(() => {
    const update = () => {
      setSize(window.innerWidth < 1440 && window.innerWidth >= 768 ? COMPACT_SIZE : CANVAS_SIZE);
    };
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);
  return size;
}

export default function LabMode({ isActive }: LabModeProps) {
  const drawCanvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);
  const lastPosRef = useRef<{ x: number; y: number } | null>(null);
  const canvasSize = useCanvasSize();

  // State
  const [status, setStatus] = useState<Status>('idle');
  const [errorMsg, setErrorMsg] = useState('');
  const [isCPU, setIsCPU] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);
  const [epsilon, setEpsilon] = useState(0.15);

  // Classification state
  const [cleanResult, setCleanResult] = useState<ClassifyResult | null>(null);
  const [pixels, setPixels] = useState<Float32Array | null>(null);
  const [gradient, setGradient] = useState<Float32Array | null>(null);
  const [attackResult, setAttackResult] = useState<FGSMResult | null>(null);
  const [advResult, setAdvResult] = useState<ClassifyResult | null>(null);
  const [isAttacking, setIsAttacking] = useState(false);

  // Debounce timer for epsilon slider
  const epsTimerRef = useRef<ReturnType<typeof setTimeout>>(0 as unknown as ReturnType<typeof setTimeout>);

  // Load model when tab becomes active
  useEffect(() => {
    if (!isActive) return;
    if (status !== 'idle') return;

    setStatus('loading');
    (async () => {
      try {
        await loadModel();
        const info = await getBackendInfo();
        setIsCPU(!info.isGPU);
        setStatus('ready');
      } catch (e) {
        setErrorMsg('Model failed to load. Check your connection.');
        setStatus('error');
        console.error('TF.js model load error:', e);
      }
    })();
  }, [isActive, status]);

  // --- Drawing handlers ---
  const getCanvasPos = useCallback(
    (e: React.MouseEvent | React.TouchEvent) => {
      const canvas = drawCanvasRef.current;
      if (!canvas) return { x: 0, y: 0 };
      const rect = canvas.getBoundingClientRect();
      const scaleX = CANVAS_SIZE / rect.width;
      const scaleY = CANVAS_SIZE / rect.height;
      if ('touches' in e) {
        const touch = e.touches[0] || e.changedTouches[0];
        return {
          x: (touch.clientX - rect.left) * scaleX,
          y: (touch.clientY - rect.top) * scaleY,
        };
      }
      return {
        x: (e.clientX - rect.left) * scaleX,
        y: (e.clientY - rect.top) * scaleY,
      };
    },
    []
  );

  const startStroke = useCallback(
    (pos: { x: number; y: number }) => {
      isDrawingRef.current = true;
      lastPosRef.current = pos;
      const ctx = drawCanvasRef.current?.getContext('2d');
      if (!ctx) return;
      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
    },
    []
  );

  const continueStroke = useCallback(
    (pos: { x: number; y: number }) => {
      if (!isDrawingRef.current) return;
      const ctx = drawCanvasRef.current?.getContext('2d');
      if (!ctx) return;
      ctx.lineWidth = 16;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = '#f1f5f9';
      ctx.beginPath();
      ctx.moveTo(lastPosRef.current!.x, lastPosRef.current!.y);
      ctx.lineTo(pos.x, pos.y);
      ctx.stroke();
      lastPosRef.current = pos;
      setHasDrawn(true);
    },
    []
  );

  const endStroke = useCallback(async () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    lastPosRef.current = null;

    // Run preprocessing + classification
    const canvas = drawCanvasRef.current;
    if (!canvas || status !== 'ready') return;

    const processed = preprocessDrawnDigit(canvas);
    if (!processed) return;

    setPixels(processed);
    // Reset attack state on new stroke
    setGradient(null);
    setAttackResult(null);
    setAdvResult(null);

    try {
      const result = await classify(processed);
      setCleanResult(result);
    } catch (e) {
      console.error('Classification error:', e);
    }
  }, [status]);

  // Mouse handlers
  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault();
      startStroke(getCanvasPos(e));
    },
    [getCanvasPos, startStroke]
  );
  const onMouseMove = useCallback(
    (e: React.MouseEvent) => continueStroke(getCanvasPos(e)),
    [getCanvasPos, continueStroke]
  );
  const onMouseUp = useCallback(() => endStroke(), [endStroke]);

  // Touch handlers
  const onTouchStart = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      startStroke(getCanvasPos(e));
    },
    [getCanvasPos, startStroke]
  );
  const onTouchMove = useCallback(
    (e: React.TouchEvent) => {
      e.preventDefault();
      continueStroke(getCanvasPos(e));
    },
    [getCanvasPos, continueStroke]
  );
  const onTouchEnd = useCallback(() => endStroke(), [endStroke]);

  // Clear canvas
  const handleClear = useCallback(() => {
    const ctx = drawCanvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    }
    setHasDrawn(false);
    setCleanResult(null);
    setPixels(null);
    setGradient(null);
    setAttackResult(null);
    setAdvResult(null);
  }, []);

  // Initialize canvas background
  useEffect(() => {
    const ctx = drawCanvasRef.current?.getContext('2d');
    if (ctx) {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, CANVAS_SIZE, CANVAS_SIZE);
    }
  }, []);

  // Attack handler
  const handleAttack = useCallback(async () => {
    if (!pixels || !cleanResult || status !== 'ready') return;

    setIsAttacking(true);
    try {
      const grad = await computeGradient(pixels, cleanResult.predictedClass);
      setGradient(grad);
      const attack = fgsmAttack(pixels, grad, epsilon);
      setAttackResult(attack);
      const result = await classify(attack.adversarial);
      setAdvResult(result);
    } catch (e) {
      console.error('Attack error:', e);
    } finally {
      setIsAttacking(false);
    }
  }, [pixels, cleanResult, epsilon, status]);

  // Recompute attack when epsilon changes (if gradient is already computed)
  const handleEpsilonChange = useCallback(
    (newEps: number) => {
      setEpsilon(newEps);
      if (!pixels || !gradient) return;

      clearTimeout(epsTimerRef.current);
      epsTimerRef.current = setTimeout(async () => {
        const attack = fgsmAttack(pixels, gradient, newEps);
        setAttackResult(attack);
        try {
          const result = await classify(attack.adversarial);
          setAdvResult(result);
        } catch (e) {
          console.error('Reclassify error:', e);
        }
      }, 33); // ~30fps debounce
    },
    [pixels, gradient]
  );

  // Cleanup
  useEffect(() => {
    return () => clearTimeout(epsTimerRef.current);
  }, []);

  if (!isActive) return null;

  const flipped =
    cleanResult && advResult && cleanResult.predictedClass !== advResult.predictedClass;

  return (
    <div className="flex-1 flex flex-col items-center px-6 py-4 overflow-auto">
      {/* Disclaimer */}
      <p
        className="text-body-sm mb-4"
        style={{ color: '#94a3b8', fontStyle: 'italic' }}
      >
        Results may vary — live computation
      </p>

      {/* CPU warning */}
      {isCPU && status === 'ready' && (
        <p className="text-body-sm mb-2" style={{ color: '#94a3b8' }}>
          Running on CPU — may be slower
        </p>
      )}

      {/* Loading state */}
      {status === 'loading' && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-body-md" style={{ color: '#94a3b8' }}>
            Loading TF.js model...
          </p>
        </div>
      )}

      {/* Error state */}
      {status === 'error' && (
        <div className="flex-1 flex items-center justify-center">
          <p className="text-body-md" style={{ color: '#f472b6' }}>
            {errorMsg}
          </p>
        </div>
      )}

      {/* Main content */}
      {status === 'ready' && (
        <>
          {/* Two panels */}
          <div className="flex flex-col mobile:flex-col md:flex-row gap-6 items-center mb-4">
            {/* Left: Drawing Canvas */}
            <div className="flex flex-col items-center gap-2">
              <p className="text-body-sm" style={{ color: '#94a3b8' }}>
                Draw a digit
              </p>
              <canvas
                ref={drawCanvasRef}
                width={CANVAS_SIZE}
                height={CANVAS_SIZE}
                style={{
                  width: canvasSize,
                  height: canvasSize,
                  border: '1px solid #94a3b8',
                  borderRadius: 4,
                  cursor: 'crosshair',
                  touchAction: 'none',
                }}
                onMouseDown={onMouseDown}
                onMouseMove={onMouseMove}
                onMouseUp={onMouseUp}
                onMouseLeave={onMouseUp}
                onTouchStart={onTouchStart}
                onTouchMove={onTouchMove}
                onTouchEnd={onTouchEnd}
              />
              {/* Clean classification result */}
              {cleanResult && (
                <p className="text-mono-md" style={{ color: '#38bdf8' }}>
                  &ldquo;{cleanResult.predictedClass}&rdquo; — {(cleanResult.confidence * 100).toFixed(1)}%
                </p>
              )}
            </div>

            {/* Right: Result Canvas */}
            <div className="flex flex-col items-center gap-2">
              <p className="text-body-sm" style={{ color: '#94a3b8' }}>
                Adversarial result
              </p>
              <div
                className="relative"
                style={{
                  width: canvasSize,
                  height: canvasSize,
                  border: '1px solid #94a3b8',
                  borderRadius: 4,
                  overflow: 'hidden',
                  background: '#0f172a',
                }}
              >
                {attackResult && pixels ? (
                  <>
                    <MnistCanvas
                      pixels={Array.from(pixels)}
                      signMap={attackResult.signMap}
                      epsilon={epsilon}
                      dimmed={true}
                      size={canvasSize}
                      className="absolute inset-0"
                    />
                    <SignMapCanvas
                      signMap={attackResult.signMap}
                      deadPixelMask={attackResult.deadPixelMask}
                      mode="uniform"
                      size={canvasSize}
                      highContrast={false}
                      opacity={1}
                      className="absolute inset-0"
                    />
                  </>
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-body-sm" style={{ color: '#94a3b8' }}>
                      Press ATTACK to see result
                    </p>
                  </div>
                )}
              </div>
              {/* Adversarial classification */}
              {advResult && (
                <p
                  className="text-mono-md"
                  style={{
                    color: flipped ? '#f472b6' : '#38bdf8',
                  }}
                >
                  &ldquo;{advResult.predictedClass}&rdquo; — {(advResult.confidence * 100).toFixed(1)}%
                  {flipped && (
                    <span
                      className="ml-2 text-body-sm"
                      style={{
                        color: '#34d399',
                        fontWeight: 700,
                      }}
                    >
                      FLIPPED
                    </span>
                  )}
                </p>
              )}
            </div>
          </div>

          {/* Controls row */}
          <div className="flex flex-wrap items-center justify-center gap-4 mb-4">
            <button
              onClick={handleClear}
              className="text-body-md px-4 py-1.5 rounded transition-colors"
              style={{
                border: '1px solid #94a3b8',
                color: '#94a3b8',
                background: 'transparent',
              }}
            >
              Clear
            </button>
            <button
              onClick={handleAttack}
              disabled={!hasDrawn || isAttacking}
              className="text-body-md px-6 py-1.5 rounded font-bold transition-colors"
              style={{
                background: hasDrawn && !isAttacking ? '#f472b6' : '#334155',
                color: hasDrawn && !isAttacking ? '#0f172a' : '#64748b',
                cursor: hasDrawn && !isAttacking ? 'pointer' : 'not-allowed',
              }}
            >
              {isAttacking ? 'Attacking...' : 'ATTACK'}
            </button>
            {!hasDrawn && (
              <span className="text-body-sm" style={{ color: '#f472b6' }}>
                Draw a digit first!
              </span>
            )}
          </div>

          {/* Epsilon slider */}
          <div className="w-full max-w-lg">
            <EpsilonSlider
              value={epsilon}
              onChange={handleEpsilonChange}
              epsilonStar={null}
              min={0}
              max={0.35}
            />
          </div>

          {/* Flip summary */}
          {cleanResult && advResult && (
            <p className="text-body-md mt-2" style={{ color: '#94a3b8' }}>
              {flipped ? (
                <>
                  Classification:{' '}
                  <span style={{ color: '#38bdf8' }}>
                    &ldquo;{cleanResult.predictedClass}&rdquo;
                  </span>
                  {' → '}
                  <span style={{ color: '#f472b6' }}>
                    &ldquo;{advResult.predictedClass}&rdquo;
                  </span>
                  {' (flipped at ε = '}
                  {epsilon.toFixed(3)}
                  {')'}
                </>
              ) : (
                <>
                  Classification holds:{' '}
                  <span style={{ color: '#38bdf8' }}>
                    &ldquo;{cleanResult.predictedClass}&rdquo;
                  </span>
                  {' at ε = '}
                  {epsilon.toFixed(3)}
                </>
              )}
            </p>
          )}
        </>
      )}
    </div>
  );
}
