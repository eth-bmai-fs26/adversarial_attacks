import { useState, useRef, useEffect, useCallback } from 'react';

interface SettingsProps {
  highContrast: boolean;
  onHighContrastChange: (value: boolean) => void;
}

export default function Settings({ highContrast, onHighContrastChange }: SettingsProps) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleClickOutside = useCallback((e: MouseEvent) => {
    if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
      setOpen(false);
    }
  }, []);

  useEffect(() => {
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [open, handleClickOutside]);

  return (
    <div ref={containerRef} className="relative mr-4">
      <button
        onClick={() => setOpen(v => !v)}
        className="text-muted hover:text-primary transition-colors"
        aria-label="Settings"
        aria-expanded={open}
      >
        <svg width="20" height="20" viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.5">
          <circle cx="10" cy="10" r="3" />
          <path d="M10 1v2m0 14v2M1 10h2m14 0h2m-2.9-6.4-1.4 1.4M5.3 14.7l-1.4 1.4m0-11.8 1.4 1.4m9.4 9.4 1.4 1.4" />
        </svg>
      </button>

      {open && (
        <div
          className="absolute right-0 top-full mt-2 z-50"
          style={{
            backgroundColor: '#131c2e',
            border: '1px solid rgba(148, 163, 184, 0.3)',
            borderRadius: 8,
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
            minWidth: 240,
            padding: '12px 16px',
          }}
        >
          {/* High-contrast toggle */}
          <label
            className="flex items-start gap-3 cursor-pointer"
            style={{ fontFamily: "'DM Sans', system-ui, sans-serif", fontSize: 14 }}
          >
            <input
              type="checkbox"
              checked={highContrast}
              onChange={e => onHighContrastChange(e.target.checked)}
              className="mt-0.5 accent-true-class"
              style={{ width: 16, height: 16, accentColor: '#38bdf8' }}
            />
            <div>
              <div style={{ color: '#f1f5f9' }}>High-contrast mode</div>
              <div style={{ color: '#94a3b8', fontSize: 12, marginTop: 2 }}>
                For projectors
              </div>
            </div>
          </label>

          <div style={{ borderTop: '1px solid rgba(148, 163, 184, 0.15)', margin: '10px 0' }} />

          {/* About */}
          <div
            style={{
              fontFamily: "'DM Sans', system-ui, sans-serif",
              fontSize: 13,
              color: '#94a3b8',
              lineHeight: 1.5,
            }}
          >
            FGSM Adversarial Attack Visualization — a lecture demo showing how imperceptible perturbations fool neural networks.
          </div>
        </div>
      )}
    </div>
  );
}
