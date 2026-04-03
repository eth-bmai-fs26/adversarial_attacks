interface GaugeMeterProps {
  attackStrength: number;
  actualMargin: number;
  initialMargin: number;
  epsilon: number;
  fgsmMarginDot: number;
}

export default function GaugeMeter({
  attackStrength,
  actualMargin,
  initialMargin,
  epsilon,
  fgsmMarginDot,
}: GaugeMeterProps) {
  const maxVal = initialMargin * 1.5;
  const fillFraction = Math.min(Math.max(attackStrength / maxVal, 0), 1);
  const thresholdFraction = initialMargin / maxVal;
  const actualFraction = Math.min(
    Math.max((initialMargin - actualMargin) / maxVal, 0),
    1,
  );
  const crossed = attackStrength >= initialMargin;
  const perPixelEffect = fgsmMarginDot / 784;

  return (
    <div className="flex flex-col items-center w-full gap-2">
      {/* Gauge rail */}
      <div className="relative w-[320px] compact:w-[240px] mobile:w-[calc(100%-32px)]">
        {/* Threshold label above */}
        <div
          className="absolute -top-6 flex flex-col items-center"
          style={{ left: `${thresholdFraction * 100}%`, transform: 'translateX(-50%)' }}
        >
          <span
            className="whitespace-nowrap"
            style={{
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 14,
              color: '#94a3b8',
            }}
          >
            m(x) = {initialMargin.toFixed(1)}
          </span>
        </div>

        {/* Rail container */}
        <div className="relative h-3 rounded-full bg-tile-dormant overflow-hidden">
          {/* Fill bar */}
          <div
            className="absolute inset-y-0 left-0 rounded-full transition-all duration-100 ease-out"
            style={{
              width: `${fillFraction * 100}%`,
              backgroundColor: crossed ? '#f472b6' : '#38bdf8',
            }}
          />
        </div>

        {/* Threshold dashed line */}
        <div
          className="absolute top-1/2 -translate-y-1/2 w-0.5 h-5"
          style={{
            left: `${thresholdFraction * 100}%`,
            transform: `translateX(-50%) translateY(-50%)`,
            borderLeft: '2px dashed #94a3b8',
          }}
        />

        {/* Actual margin notch (pink triangle) */}
        <div
          className="absolute transition-all duration-100 ease-out"
          style={{
            left: `${actualFraction * 100}%`,
            top: '100%',
            transform: 'translateX(-50%)',
            width: 0,
            height: 0,
            borderLeft: '4px solid transparent',
            borderRight: '4px solid transparent',
            borderBottom: '6px solid #f472b6',
          }}
        />

        {/* Decision boundary label below */}
        <div
          className="absolute flex flex-col items-center"
          style={{
            left: `${thresholdFraction * 100}%`,
            top: 'calc(100% + 8px)',
            transform: 'translateX(-50%)',
          }}
        >
          <span
            className="whitespace-nowrap"
            style={{
              fontFamily: "'DM Sans', system-ui, sans-serif",
              fontSize: 12,
              color: '#94a3b8',
            }}
          >
            Decision boundary
          </span>
        </div>
      </div>

      {/* Dimensional scaling readout */}
      <p
        className="text-mono-sm text-center mt-4"
        style={{ color: '#94a3b8' }}
      >
        Per pixel: ±{epsilon.toFixed(3)} ({perPixelEffect.toFixed(3)}/px) · All 784 pixels: combined effect ≈{' '}
        {attackStrength.toFixed(1)} (margin: {initialMargin.toFixed(1)})
      </p>
    </div>
  );
}
