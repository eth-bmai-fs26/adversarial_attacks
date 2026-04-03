const COLOR_SWATCHES = [
  { name: 'bg', color: '#0f172a' },
  { name: 'tile-pos', color: '#fbbf24' },
  { name: 'tile-neg', color: '#22d3ee' },
  { name: 'true-class', color: '#38bdf8' },
  { name: 'adversarial', color: '#f472b6' },
  { name: 'success', color: '#34d399' },
  { name: 'tile-dormant', color: '#131c2e' },
  { name: 'tile-gap', color: '#0a0f1a' },
  { name: 'text-primary', color: '#f1f5f9' },
  { name: 'text-muted', color: '#94a3b8' },
];

export default function App() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center px-4">
      <div className="w-full max-w-[1200px] mx-auto flex flex-col items-center gap-12">
        {/* Title */}
        <h1 className="text-label-main text-center text-primary">
          FGSM Adversarial Attack Visualization
        </h1>

        {/* Font samples */}
        <div className="flex flex-col gap-4 w-full">
          <p className="text-label-hero text-primary">Syne Bold 52px</p>
          <p className="text-label-main text-primary">Syne Bold 44px</p>
          <p className="text-mono-lg text-primary">JetBrains Mono 28px — ε = 0.15</p>
          <p className="text-mono-md text-primary">JetBrains Mono 20px — P(7) = 0.93</p>
          <p className="text-mono-sm text-muted">JetBrains Mono 18px — margin: 4.2</p>
          <p className="text-body-lg text-primary">DM Sans 18px — Drag the slider to increase ε</p>
          <p className="text-body-md text-muted">DM Sans 16px — Standard vs Robust</p>
          <p className="text-body-sm text-muted">DM Sans 14px — Disclaimer text</p>
          <p className="text-body-xs text-muted">DM Sans 11px — Attribution</p>
        </div>

        {/* Color swatches */}
        <div className="flex flex-wrap gap-3 justify-center">
          {COLOR_SWATCHES.map(({ name, color }) => (
            <div key={name} className="flex flex-col items-center gap-1">
              <div
                className="w-12 h-12 rounded border border-white/20"
                style={{ backgroundColor: color }}
              />
              <span className="text-body-xs text-muted">{name}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
