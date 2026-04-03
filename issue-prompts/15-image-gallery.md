# Issue 15: Image Gallery

## Goal

Build a gallery of 50 MNIST image thumbnails (5 per digit class) that lets the professor or student browse different digits, see their vulnerability at a glance (sorted by ε*), and click to load any image into the main visualization. Hover shows the stained-glass sign map preview.

## Dependencies

- **Issue 1** (Precomputed Data): `standard_model.json` with 50 images
- **Issue 3** (Project Scaffold): Design tokens, types
- **Issue 8** (Sign Map Renderer): `SignMapCanvas` for hover previews

## Context

The gallery lives behind an "Explore all images →" expander, accessible from any beat (Beats 1-3). It serves two purposes: (a) the professor picks a good demo image before the lecture, and (b) students explore variation across digits after the lecture. Sorting by ε* reveals that some digits are easy to attack ("7" at ε*=0.08) and others are hard ("1" at ε*=0.29).

## Deliverables

### 1. ImageGallery Component (`src/components/ImageGallery.tsx`)

```tsx
interface ImageGalleryProps {
  images: ImageData[];               // All 50 images from precomputed data
  selectedImageId: number;           // Currently active image ID
  onSelectImage: (id: number) => void;
  isOpen: boolean;
  onToggle: () => void;
}
```

### 2. Expander Trigger

A link/button accessible from the beat area:
- Text: `"Explore all images →"` in DM Sans 16px, primary text `#f1f5f9`
- Position: below the gauge meter area, right-aligned
- Clicking opens the gallery overlay
- When open, changes to `"← Back to demo"` to close

### 3. Gallery Layout

When expanded, the gallery shows as a panel overlaying the beat content:

```
┌─────────────────────────────────────────────────┐
│  [← Back to demo]                    [Settings] │
│                                                 │
│  Easiest: "7" (ε*=0.08) · Hardest: "1" (ε*=0.29)│
│                                                 │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐   │
│  │ 0 │ │ 0 │ │ 0 │ │ 0 │ │ 0 │ │ 1 │ │ 1 │   │
│  │.08│ │.10│ │.12│ │.14│ │.16│ │.18│ │.20│   │
│  └───┘ └───┘ └───┘ └───┘ └───┘ └───┘ └───┘   │
│  ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐ ┌───┐   │
│  │ 1 │ │ 1 │ │ 1 │ │ 2 │ │ 2 │ │ 2 │ │ 2 │   │
│  │.21│ │.22│ │.25│ │.09│ │.11│ │.13│ │.15│   │
│  └───┘ └───┘ └───┘ └───┘ └───┘ └───┘ └───┘   │
│  ... (50 thumbnails total, ~7 per row)          │
│                                                 │
└─────────────────────────────────────────────────┘
```

**Sorting:** Images sorted by ε* ascending (easiest to attack → hardest). This makes the gallery itself pedagogically interesting — easy digits cluster on the left, hard ones on the right.

**Summary line:** Above the grid, in JetBrains Mono 18px, muted:
```
Easiest: "7" (ε* = 0.08) · Hardest: "1" (ε* = 0.29)
```
These values come from the actual precomputed data (min and max ε* across all 50 images).

### 4. Thumbnail Spec

Each thumbnail is a card:
- Size: 80×100px (80×80 image area + 20px label area)
- Gap: 12px between thumbnails
- Grid: CSS Grid with `auto-fill`, `minmax(80px, 1fr)`

**Image area (80×80):**
- Render the MNIST digit at 80×80px using a small canvas (same technique as MnistCanvas but at thumbnail size)
- No perturbation applied — show the clean image
- Background: `#131c2e` (dormant color, slightly lighter than canvas)
- Border: 2px solid transparent normally; 2px solid `#38bdf8` (sky blue) for the selected image
- Border radius: 4px

**Label area (20px):**
- Digit class: Syne 14px Bold, primary text
- ε*: JetBrains Mono 11px, muted text
- Format: `"7"` on first line, `"ε*=0.08"` below
- OR as a single line: `"7 · 0.08"` — whichever fits better at 80px width

### 5. Hover Preview

On hover, show the stained-glass sign map preview:
- Scale up the thumbnail to 160×160px (2× zoom), floating above the grid
- Behind the zoomed digit (at 35% opacity), overlay the `SignMapCanvas` in uniform mode at 160×160px
- Use a CSS `transform: scale(2)` with `transform-origin` at the thumbnail's position
- Add a subtle border glow: `box-shadow: 0 0 16px rgba(251, 191, 36, 0.3)` (amber tint)
- Show below the preview: `"Digit 7 · ε* = 0.082 · Flips to 3"` in DM Sans 12px, primary text

**Performance:** Don't render 50 `SignMapCanvas` instances. Only render the one for the hovered thumbnail. Use `onMouseEnter` / `onMouseLeave` to track which thumbnail is hovered.

### 6. Click to Load

Clicking a thumbnail:
1. Sets `selectedImageId` to the clicked image's ID (via `onSelectImage`)
2. Closes the gallery (via `onToggle`)
3. The parent component loads the new image data into all beats
4. The ε slider resets to 0 (the professor starts fresh with the new image)

The currently selected image has a persistent sky blue border in the grid.

### 7. Keyboard Navigation

When the gallery is open:
- **Arrow keys:** Move selection highlight through the grid
- **Enter:** Select the highlighted image and close gallery
- **Escape:** Close gallery without changing selection

### 8. Animation

- **Open:** Gallery slides up from bottom over 300ms (transform: translateY(100%) → translateY(0))
- **Close:** Slides down over 200ms
- Background: semi-transparent `#0f172a` at 95% opacity (the beat content is barely visible behind)

### 9. Responsive Behavior

- **Default** (≥1440px): 7 columns, 80px thumbnails, gallery as overlay
- **Compact** (768-1439px): 5 columns, 72px thumbnails
- **Mobile** (<768px): 4 columns, 64px thumbnails, gallery takes full screen (not overlay)

## File Structure

```
src/
└── components/
    └── ImageGallery.tsx
```

## Verification

- "Explore all images →" opens the gallery with a slide-up animation
- 50 thumbnails displayed in a grid, sorted by ε* (ascending)
- Summary line shows correct easiest/hardest digit and ε*
- Hovering a thumbnail: zoomed preview appears with stained-glass sign map overlay
- Clicking a thumbnail: gallery closes, main visualization updates to the new image
- Selected image has a sky blue border
- Keyboard navigation works (arrows, Enter, Escape)
- "← Back to demo" closes the gallery
- Responsive: fewer columns at smaller breakpoints
- No console errors, no performance issues with 50 thumbnails
