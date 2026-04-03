# Issue 18: Integration, Responsive & Accessibility Polish

## Goal

Wire all beats, components, and feature tracks into a unified application. Ensure responsive behavior works across all breakpoints, add the high-contrast projector mode toggle, verify accessibility, and optimize performance. This is the final pass that turns 17 independently built pieces into a shipped product.

## Dependencies

**All previous issues:** #1-#17. This issue is the final integration layer.

## Context

At this point, all beats (0-3), reusable components (slider, bars, gauge, sign map, MNIST canvas, shatter), gallery, Lab Mode, and 3D Advanced Mode exist as independent components. They've been tested with mock data and within their own beat containers. This issue connects everything: shared state flows correctly across beats, data loads on startup, the tab system works, responsive breakpoints are consistent, and the high-contrast projector mode propagates to all components.

## Deliverables

### 1. Root App Wiring (`src/App.tsx`)

The App component is the orchestrator. It must:

**a) Load precomputed data on startup:**
```tsx
const [standardData, setStandardData] = useState<ModelData | null>(null);
const [robustData, setRobustData] = useState<ModelData | null>(null);
const [loading, setLoading] = useState(true);
const [error, setError] = useState<string | null>(null);

useEffect(() => {
  Promise.all([loadStandardModel(), loadRobustModel()])
    .then(([std, rob]) => { setStandardData(std); setRobustData(rob); })
    .catch(err => setError(err.message))
    .finally(() => setLoading(false));
}, []);
```

Show a loading screen while data loads:
- Dark background `#0f172a`
- Centered: "Loading visualization..." in DM Sans 18px, muted, with a subtle pulsing opacity animation
- If error: "Failed to load data. Please refresh." in DM Sans 18px, pink `#f472b6`

**b) Manage shared state:**
```tsx
const [selectedImageId, setSelectedImageId] = useState(0);
const [epsilon, setEpsilon] = useState(0);
const [highContrast, setHighContrast] = useState(false);
const [activeTab, setActiveTab] = useState<'demo' | 'lab'>('demo');
const beatNav = useBeatNavigation();
```

`epsilon` is shared across Beats 1, 2a, 2b, and 3. When the user changes image (via gallery), epsilon resets to 0.

**c) Route to the correct view:**
```tsx
if (activeTab === 'lab') return <LabMode />;
// else render the beat system:
switch (beatNav.currentBeat) {
  case 0: return <Beat0ColdOpen ... />;
  case 1: return <Beat1Crime ... />;
  case '2a': return <Beat2aGhost ... />;
  case '2b': return <Beat2bSplit ... />;
  case 3: return <Beat3Adversarial ... />;
}
```

**d) Pass `highContrast` to all components that need it:**
- `SignMapCanvas` (all instances across Beats 2a, 2b, 3, gallery hover)
- The setting is stored in `App.tsx` state and passed via props or React context

### 2. Settings Gear Menu

The `[Settings]` placeholder in the top-right header becomes functional:

**Trigger:** A gear icon (⚙) button, 24×24px, muted `#94a3b8`, top-right corner of the 40px header.

**Dropdown (on click):**
```
┌──────────────────────────┐
│ ☐ High-contrast mode     │  <- Toggle
│   (for projectors)       │
│                          │
│ ☐ Auto-advance beats     │  <- Toggle (auto-play, future)
│                          │
│ About this visualization │  <- Link/info
└──────────────────────────┘
```

- Background: `#131c2e`, border 1px `#94a3b8` at 30%, rounded 8px, shadow
- Font: DM Sans 14px
- Toggles: custom checkboxes with sky blue `#38bdf8` fill when active
- Click outside closes the dropdown

**High-contrast mode** sets `highContrast` state to true. This propagates to:
- `SignMapCanvas`: 3px gaps, no glow, solid blocks, more visible dormant tiles
- Any other component that uses glow effects (slider thumb glow could be removed)

### 3. Tab Bar (Demo / Lab Mode)

Integrate the tab navigation from Issue 16:

```
┌─────────────────────────────────────────────────┐
│  [Demo]  [Try it yourself]    [● ● ●─● ○]  [⚙]│
│                                                 │
```

- Tabs on the left: "Demo" and "Try it yourself"
- Beat dots in the center (visible only when Demo tab is active)
- Settings gear on the right
- All within the 40px header

When switching from Lab Mode back to Demo: restore the previous beat and epsilon state (don't reset).

### 4. Image Selection Flow

The gallery (Issue 15) updates `selectedImageId`. This must propagate to all beats:

```tsx
const selectedImage = standardData?.images.find(img => img.id === selectedImageId);
const selectedRobustImage = robustData?.images.find(img => img.id === selectedImageId);
```

When `selectedImageId` changes:
- Reset `epsilon` to 0
- Reset beat-specific state (sign map visibility in Beat 2a, split divider position in Beat 2b, model toggle in Beat 3)
- The new image loads into all beats immediately

### 5. Responsive Audit

Verify every component respects the three breakpoints consistently:

**Default (≥1440px):**
- Image: 480×480
- Slider: 64px tall, 28px ε readout
- Gauge: 320px wide
- Probability bars: horizontal, full font sizes
- Header: 40px with tabs + dots + settings

**Compact (768-1439px):**
- Image: 360×360
- Slider: 48px tall, 22px ε readout
- Gauge: 240px wide
- Probability bars: stacked vertically, fonts × 0.8
- Header: 32px

**Mobile (<768px):**
- Image: full width - 32px padding
- Slider: full width, 48px tall
- Gauge: full width, stacked below image
- Probability bars: single-line text readout
- Beat dots: move below content, above slider
- Gallery: full-screen (not overlay), 4 columns
- Lab Mode: panels stack vertically
- Swipe gesture for beat navigation

**Test on actual devices/emulators:**
- iPhone SE (375×667) — smallest common mobile
- iPad (768×1024) — compact breakpoint boundary
- 1366×768 laptop — most common lecture laptop resolution
- 1920×1080 — standard desktop/projector

### 6. Keyboard Shortcut Audit

Ensure no conflicts between the various keyboard handlers:

| Key | Context | Action | Handler |
|-----|---------|--------|---------|
| `←` / `→` | Global (slider not focused) | Navigate beats | useBeatNavigation |
| `←` / `→` | Slider focused | Adjust ε | EpsilonSlider |
| `1-4` | Global | Jump to beat | useBeatNavigation |
| `Escape` | Global | Reset to Beat 0 | useBeatNavigation |
| `Escape` | Gallery open | Close gallery | ImageGallery |
| `Escape` | 3D mode open | Close 3D overlay | AdvancedMode3D |
| `R` | Beat 2a | Toggle sign map | Beat2aGhost |
| `G` | Beat 2b | Toggle FGSM/gradient blink | Beat2bSplit |
| `Space` | Beat 0 | Advance to Beat 1 | Beat0ColdOpen |

**Priority rules:**
- Overlays (gallery, 3D mode) capture Escape first — it closes the overlay, not the beat
- Slider captures arrow keys when focused — they don't navigate beats
- Beat-specific keys (R, G) only fire when that beat is active
- Tab key cycles focus between interactive elements (slider, buttons, gallery items)

### 7. Performance Optimization

**a) Bundle splitting:**
- TF.js (`@tensorflow/tfjs`): lazy-loaded only when Lab Mode tab is activated
- React Three Fiber + Three.js: lazy-loaded only when 3D Advanced mode is opened
- Core demo bundle (Beats 0-3 + gallery) should be <200KB gzipped

```tsx
const LabMode = lazy(() => import('./beats/LabMode'));
const AdvancedMode3D = lazy(() => import('./beats/AdvancedMode3D'));
```

**b) Data loading:**
- `standard_model.json` (~500KB gzipped): loaded on startup (required for core demo)
- `robust_model.json` (~500KB gzipped): lazy-loaded when Beat 3 is first visited
- `3d_surface_data.json` (~3MB gzipped): lazy-loaded when 3D mode is opened

**c) Canvas rendering:**
- Verify MnistCanvas redraws in <1ms during slider drag
- Verify SignMapCanvas renders in <2ms
- Use `React.memo` on all canvas components with identity checks on array props
- No unnecessary re-renders of probability bars or gauge during slider drag (use `useMemo` for derived values)

**d) 60fps audit:**
- Open Chrome DevTools Performance tab
- Drag the ε slider rapidly for 5 seconds
- Verify: no frames > 16ms, no layout thrashing, no GC pauses > 5ms

### 8. Accessibility

**a) Screen reader support:**
- All interactive elements have `aria-label`
- ε slider: `role="slider"` with `aria-valuemin`, `aria-valuemax`, `aria-valuenow`
- Beat dots: `role="tablist"` with `role="tab"` on each dot
- Gallery: `role="grid"` with `role="gridcell"` on thumbnails
- Toggle buttons: `aria-pressed` state

**b) Focus management:**
- Visible focus rings on all interactive elements (2px `#38bdf8` outline)
- Focus trapped within overlays (gallery, 3D mode) when open
- Focus returns to trigger element when overlay closes

**c) Color contrast:**
- Verify WCAG AA contrast (4.5:1) for all text against `#0f172a` background:
  - `#f1f5f9` on `#0f172a` → 13.5:1 ✓
  - `#94a3b8` on `#0f172a` → 5.2:1 ✓
  - `#38bdf8` on `#0f172a` → 6.8:1 ✓
  - `#f472b6` on `#0f172a` → 6.1:1 ✓
  - `#fbbf24` on `#0f172a` → 8.9:1 ✓
  - `#22d3ee` on `#0f172a` → 8.2:1 ✓

**d) Reduced motion:**
- Respect `prefers-reduced-motion: reduce` media query
- When active: disable all animations (shatter, fade, slide, auto-rotate)
- Instant state changes instead of transitions
- CSS: `@media (prefers-reduced-motion: reduce) { *, *::before, *::after { animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; } }`

**e) Deuteranopia verification:**
- The amber `#fbbf24` / cyan `#22d3ee` pair was chosen to be safe for color vision deficiencies
- Verify using Chrome DevTools → Rendering → Emulate vision deficiencies
- Check: deuteranopia, protanopia, tritanopia
- The sign map tiles should remain distinguishable in all modes

### 9. Error Boundaries

Wrap major sections in React error boundaries:

```tsx
<ErrorBoundary fallback={<BeatErrorFallback />}>
  <Beat1Crime ... />
</ErrorBoundary>
```

If a beat crashes (e.g., malformed data, canvas error), show:
- "Something went wrong with this view. Try refreshing." in DM Sans 16px, muted
- A "Refresh" button
- Don't crash the entire app — other beats should still work

### 10. Build & Deploy Verification

```bash
npm run build
```

Verify:
- Zero TypeScript errors
- Zero build warnings (or only minor ones)
- Main chunk < 200KB gzipped (excluding lazy-loaded TF.js and R3F)
- Total initial load: < 1MB (HTML + JS + CSS + fonts + standard_model.json)
- Lazy chunks: TF.js (~1.5MB), R3F + Three.js (~500KB), 3D data (~3MB)

Test the production build:
```bash
npx serve dist
```
- Open in Chrome, Firefox, Safari
- Verify all beats work
- Verify no CORS issues with data loading
- Verify fonts load correctly (no FOUT/FOIT issues with self-hosted @fontsource)

## File Structure (modifications)

```
src/
├── App.tsx                    (major rewrite — full wiring)
├── components/
│   ├── Settings.tsx           (new — gear menu dropdown)
│   ├── TabBar.tsx             (new — Demo/Lab tab navigation)
│   ├── LoadingScreen.tsx      (new — data loading state)
│   └── ErrorBoundary.tsx      (new — error boundary wrapper)
├── hooks/
│   └── useHighContrast.ts     (new — or use React context)
└── index.css                  (add reduced-motion media query)
```

## Verification Checklist

- [ ] App loads with loading screen → transitions to Beat 0 when data is ready
- [ ] All beats render correctly with real precomputed data
- [ ] ε state persists across Beats 1, 2a, 2b, 3
- [ ] Changing image via gallery resets ε and beat-specific state
- [ ] Tab switching (Demo ↔ Lab Mode) preserves state in each tab
- [ ] High-contrast mode toggle propagates to all sign map instances
- [ ] Settings gear dropdown opens/closes correctly
- [ ] All keyboard shortcuts work without conflicts
- [ ] Responsive: correct layout at 375px, 768px, 1366px, 1920px
- [ ] No frame drops during slider drag (60fps)
- [ ] TF.js and R3F are lazy-loaded (check network tab)
- [ ] `robust_model.json` loads only when Beat 3 is first visited
- [ ] `3d_surface_data.json` loads only when 3D mode is opened
- [ ] Error boundary catches beat crashes without killing the app
- [ ] `prefers-reduced-motion` disables all animations
- [ ] Color contrast passes WCAG AA for all text
- [ ] Deuteranopia simulation: sign map tiles remain distinguishable
- [ ] Focus management: focus rings visible, focus trapped in overlays
- [ ] Production build: zero errors, <200KB main chunk
- [ ] Works in Chrome, Firefox, Safari (latest versions)
- [ ] No console errors
