# Issue 3: Project Scaffold & Design Tokens

## Goal

Set up the React project with Vite, Tailwind CSS, all fonts, the full color palette, dark theme, and responsive breakpoint infrastructure. The output is a working empty app shell that every other issue builds on top of.

## Tech Stack

- **React 18+** with TypeScript
- **Vite** as bundler
- **Tailwind CSS 3+** for utility-first styling
- **No component library** — all components built from scratch for full control

Initialize in the repo root as the frontend app (the `precompute/` folder is Python, everything else is the React app).

## Project Structure

```
├── precompute/           # Python (Issues 1 & 2, already exists)
├── public/
│   └── data/             # JSON from precompute pipeline (Issues 1 & 2)
│       └── .gitkeep
├── src/
│   ├── main.tsx
│   ├── App.tsx           # Root component, loads data, renders beat shell
│   ├── index.css         # Tailwind imports + global styles
│   ├── components/       # Shared UI components (Issues 4-9)
│   │   └── .gitkeep
│   ├── beats/            # Beat-specific views (Issues 10-14)
│   │   └── .gitkeep
│   ├── hooks/            # Custom hooks
│   │   └── .gitkeep
│   ├── lib/              # Utilities, data loading, math helpers
│   │   └── .gitkeep
│   ├── types/            # TypeScript type definitions
│   │   └── index.ts      # Core data types (ImageData, etc.)
│   └── styles/
│       └── tokens.css    # CSS custom properties for the design system
├── index.html
├── package.json
├── tsconfig.json
├── tailwind.config.ts
├── vite.config.ts
└── postcss.config.js
```

## Color Palette

Define as CSS custom properties in `src/styles/tokens.css` AND as Tailwind theme extensions:

| Token name | Hex | Usage |
|---|---|---|
| `--color-bg` | `#0f172a` | Full canvas background |
| `--color-tile-positive` | `#fbbf24` | Amber — sign +1 tiles |
| `--color-tile-negative` | `#22d3ee` | Cyan — sign -1 tiles |
| `--color-true-class` | `#38bdf8` | Sky blue — true class, slider rail safe zone |
| `--color-adversarial` | `#f472b6` | Pink — adversarial class, danger zone |
| `--color-success` | `#34d399` | Emerald — "FLIPPED ✓" badge |
| `--color-tile-dormant` | `#131c2e` | Ghostly dormant tiles |
| `--color-tile-gap` | `#0a0f1a` | Near-black tile leading |
| `--color-text-primary` | `#f1f5f9` | All primary labels |
| `--color-text-muted` | `#94a3b8` | Secondary readouts |
| `--color-slider-flash` | `#ffffff` | White zone at ε* |

In `tailwind.config.ts`, extend the theme:

```ts
theme: {
  extend: {
    colors: {
      canvas: '#0f172a',
      'tile-pos': '#fbbf24',
      'tile-neg': '#22d3ee',
      'true-class': '#38bdf8',
      adversarial: '#f472b6',
      success: '#34d399',
      'tile-dormant': '#131c2e',
      'tile-gap': '#0a0f1a',
    },
    textColor: {
      primary: '#f1f5f9',
      muted: '#94a3b8',
    },
  },
},
```

## Typography

Install three Google Fonts. Load them via `@fontsource` packages (self-hosted, no external requests — important for lecture halls with flaky WiFi):

```bash
npm install @fontsource/syne @fontsource/jetbrains-mono @fontsource/dm-sans
```

Import in `src/index.css`:
```css
@import '@fontsource/syne/700.css';       /* Bold only */
@import '@fontsource/jetbrains-mono/400.css'; /* Regular only */
@import '@fontsource/dm-sans/400.css';    /* Regular */
@import '@fontsource/dm-sans/700.css';    /* Bold */
```

Define Tailwind font families:
```ts
fontFamily: {
  display: ['Syne', 'system-ui', 'sans-serif'],
  mono: ['JetBrains Mono', 'monospace'],
  body: ['DM Sans', 'system-ui', 'sans-serif'],
},
```

Typography scale (define as Tailwind utilities or CSS classes):

| Class | Font | Size | Weight | Usage |
|---|---|---|---|---|
| `.text-label-hero` | Syne | 52px | Bold | Panda classification label |
| `.text-label-main` | Syne | 44px | Bold | MNIST classification label |
| `.text-mono-lg` | JetBrains Mono | 28px | Regular | ε readout |
| `.text-mono-md` | JetBrains Mono | 20px | Regular | Probabilities, scaling sentence |
| `.text-mono-sm` | JetBrains Mono | 18px | Regular | Logit margin |
| `.text-body-lg` | DM Sans | 18px | Regular | Beat prompts, microcopy |
| `.text-body-md` | DM Sans | 16px | Regular/Bold | Comparison labels |
| `.text-body-sm` | DM Sans | 14px | Regular | Disclaimers |
| `.text-body-xs` | DM Sans | 11px | Regular | Attribution |

Minimum projector-legible size for critical numbers: 20px.

## Responsive Breakpoints

Three tiers:

1. **Default** (≥1440px): Full design — 480px image, 64px slider, all font sizes as specified
2. **Compact** (1366×768 — 768px ≤ width < 1440px):
   - Image: 360px
   - Slider: 48px tall
   - All fonts: scale × 0.8
   - Probability bars: stack vertically instead of side-by-side
3. **Mobile** (<768px):
   - Image: full width - 32px padding
   - Gauge: stacks below image (full width)
   - Slider: full width, 48px
   - Probability bars: single-line text readout instead of bars

Define in Tailwind config:
```ts
screens: {
  'compact': { max: '1439px', min: '768px' },
  'mobile': { max: '767px' },
},
```

## Global Styles (`src/index.css`)

```css
@tailwind base;
@tailwind components;
@tailwind utilities;

@import './styles/tokens.css';

@layer base {
  html, body, #root {
    @apply bg-canvas text-primary min-h-screen;
    -webkit-font-smoothing: antialiased;
    -moz-osx-font-smoothing: grayscale;
  }

  /* Prevent text selection on interactive elements */
  .no-select {
    user-select: none;
    -webkit-user-select: none;
  }
}
```

## App Shell (`src/App.tsx`)

Create a minimal App component that:
1. Shows the dark `#0f172a` background full-screen
2. Has a centered container with max-width 1200px
3. Renders a placeholder: "FGSM Adversarial Attack Visualization" in Syne 44px, centered
4. Shows all 10 colors as a row of swatches at the bottom (temporary — for visual verification)
5. Shows the three fonts in their sizes (temporary — for visual verification)

This is just a proof-of-life. The beat system (Issue 4) will replace the placeholder.

## TypeScript Types (`src/types/index.ts`)

Define the core data types that match the JSON from Issues 1 & 2:

```ts
export interface ImageData {
  id: number;
  pixels: number[];              // [784]
  true_class: number;
  adversarial_class: number | null;
  loss_grad_sign: number[];      // [784], values -1, 0, 1
  margin_gradient: number[];     // [784]
  grad_magnitude: number[];      // [784]
  dead_pixel_mask: boolean[];    // [784]
  dead_pixel_threshold: number;
  epsilon_values: number[];      // [100]
  logits_at_eps: number[][];     // [100][10]
  margin_at_eps: number[];       // [100]
  probs_at_eps: number[][];      // [100][10]
  epsilon_star: number | null;
  epsilon_star_index: number | null;
  l1_margin_gradient: number;
  avg_pixel_sensitivity: number;
  fgsm_margin_dot: number;
  sign_disagreement_fraction: number;
  raw_gradient_attack_logits: number[][];  // [100][10]
  raw_gradient_flipped: boolean[];         // [100]
  multi_flip?: boolean;
}

export interface ModelData {
  model: string;
  model_accuracy: number;
  images: ImageData[];
}

export interface SurfaceImageData {
  id: number;
  surface_margin: number[][];    // [80][80]
  surface_prediction: number[][]; // [80][80]
  fgsm_path: number[][];         // [N][3] — (alpha, beta, margin)
  pgd_path: number[][];
  cw_path: number[][];
  pgd_path_visible: boolean;
  cw_path_visible: boolean;
  decision_boundary_contour: number[][];  // [N][2]
}

export interface SurfaceData {
  subspace_info: {
    description: string;
    grid_range: [number, number];
    grid_size: number;
  };
  images: SurfaceImageData[];
}

export type Beat = 0 | 1 | '2a' | '2b' | 3;

export interface AppState {
  currentBeat: Beat;
  selectedImageId: number;
  epsilon: number;
  showSignMap: boolean;
  comparisonMode: 'fgsm' | 'gradient';
  modelType: 'standard' | 'robust';
  highContrast: boolean;
}
```

## Data Loading Stub (`src/lib/data.ts`)

Create a stub data loader that will be used by all beats:

```ts
import type { ModelData, SurfaceData } from '../types';

let standardData: ModelData | null = null;
let robustData: ModelData | null = null;
let surfaceData: SurfaceData | null = null;

export async function loadStandardModel(): Promise<ModelData> {
  if (!standardData) {
    const res = await fetch('/data/standard_model.json');
    standardData = await res.json();
  }
  return standardData!;
}

export async function loadRobustModel(): Promise<ModelData> {
  if (!robustData) {
    const res = await fetch('/data/robust_model.json');
    robustData = await res.json();
  }
  return robustData!;
}

export async function loadSurfaceData(): Promise<SurfaceData> {
  if (!surfaceData) {
    const res = await fetch('/data/3d_surface_data.json');
    surfaceData = await res.json();
  }
  return surfaceData!;
}

export function getImageById(data: ModelData, id: number) {
  return data.images.find(img => img.id === id);
}

/** Interpolate logits at arbitrary epsilon using the precomputed grid */
export function interpolateLogits(
  image: ImageData,
  epsilon: number
): number[] {
  const { epsilon_values, logits_at_eps } = image;
  const step = epsilon_values[1] - epsilon_values[0];
  const idx = epsilon / step;
  const lo = Math.floor(idx);
  const hi = Math.min(lo + 1, epsilon_values.length - 1);
  const t = idx - lo;
  return logits_at_eps[lo].map((v, i) => v * (1 - t) + logits_at_eps[hi][i] * t);
}

/** Compute softmax from logits */
export function softmax(logits: number[]): number[] {
  const max = Math.max(...logits);
  const exps = logits.map(l => Math.exp(l - max));
  const sum = exps.reduce((a, b) => a + b, 0);
  return exps.map(e => e / sum);
}
```

## Deliverables

1. Working Vite + React + TypeScript + Tailwind project
2. All fonts installed and loaded (self-hosted via @fontsource)
3. Full color palette as CSS variables and Tailwind config
4. Typography scale classes
5. Responsive breakpoint config
6. `src/types/index.ts` with all data types
7. `src/lib/data.ts` with loader stubs and interpolation helpers
8. App shell showing the dark background with font/color verification
9. `npm run dev` starts the dev server with no errors
10. `npm run build` produces a production build with no errors

## Verification

Run `npm run dev` and confirm:
- Dark `#0f172a` background fills the viewport
- "FGSM Adversarial Attack Visualization" renders in Syne Bold 44px, white on dark
- Color swatches show all 10 colors correctly
- Font samples show Syne, JetBrains Mono, and DM Sans at their specified sizes
- No console errors
- `npm run build` succeeds with zero warnings
