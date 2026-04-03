# Issue 10: Beat 0 — Panda Cold Open

## Goal

Build the opening beat of the visualization: a cinematic, non-interactive 8-second sequence showing the famous Goodfellow panda example. A "Giant Panda — 99.3%" label appears, then shatters and reassembles as "Gibbon — 99.7%". This hooks the audience and establishes the visual language (label shatter = classification broke) that Beat 1 will call back to.

## Dependencies

- **Issue 4** (Beat Navigation): `useBeatNavigation` hook, beat container system
- **Issue 7** (Label Shatter): `ShatterLabel` component

## Context

Beat 0 is a cold open — the professor opens the URL and the panda sequence plays automatically. No sliders, no controls. It's a hook: "Look, a neural network thinks this is a panda. Every pixel was changed by less than 0.7%. Now it thinks it's a gibbon." Then "Same math, simpler image — let's see why" bridges to the MNIST interactive.

The panda images are static JPEGs — no live computation. This beat has zero data dependencies on the precomputation pipeline.

## Deliverables

### 1. Beat0ColdOpen Component (`src/beats/Beat0ColdOpen.tsx`)

```tsx
interface Beat0Props {
  onComplete: () => void;     // Called when "Continue →" is clicked or sequence finishes
  isActive: boolean;          // Whether this beat is currently displayed
}
```

### 2. Assets

Source two images and place them in `public/assets/`:
- `panda_clean.jpg` — the original panda image (from Goodfellow et al. 2015). Use a high-quality version, at least 800×800px. The famous image of a giant panda from ImageNet.
- `panda_adversarial.jpg` — the adversarial panda (with imperceptible perturbation). Visually identical to the clean version.

Since we can't generate these from the pipeline (they're ImageNet, not MNIST), include placeholder instructions:
- Create a `public/assets/README.md` explaining that the professor should place their own panda images here, OR
- Use a simple gradient placeholder (a green-tinted square) with a label "Place panda_clean.jpg here" during development
- The component should gracefully handle missing images by showing a colored placeholder

### 3. Timed Animation Sequence

When `isActive` becomes true, start the sequence:

| Time | Action | Visual |
|------|--------|--------|
| 0s | Show panda image | Full-bleed image on `#0f172a`, vignetted edges |
| 1.5s | Fade in label | `"Giant Panda — 99.3%"` in Syne 52px Bold, sky blue `#38bdf8`. Fade: opacity 0→1, 400ms ease-out |
| 3.5s | Fade in subtitle | `"Every pixel changed by less than 0.7%"` in DM Sans 22px, muted `#94a3b8`. Fade: 400ms ease-out |
| 5.0s | Label shatters | Use `ShatterLabel` component. "Giant Panda — 99.3%" shatters → reassembles as "Gibbon — 99.7%" in pink `#f472b6`. Duration: 300ms |
| 5.5s | Swap image | Crossfade from clean panda to adversarial panda (300ms). In practice the images look identical — the swap is for mathematical honesty |
| 7.0s | Fade in bridge text | `"Same math, simpler image — let's see why."` in DM Sans 18px, muted. Fade: 400ms |
| 8.0s | Show continue prompt | `"Continue →"` appears, DM Sans 18px, primary text `#f1f5f9`, subtle pulse animation (opacity 0.6→1→0.6, 2s loop) |

### 4. Image Layout

```
┌─────────────────────────────────────────────────┐
│                                                 │
│                                                 │
│         ┌───────────────────────────┐           │
│         │                           │           │
│         │     Panda Image           │           │
│         │     (max 600×600,         │           │
│         │      centered)            │           │
│         │                           │           │
│         └───────────────────────────┘           │
│                                                 │
│       "Giant Panda — 99.3%"  (or Gibbon)       │  <- ShatterLabel
│       "Every pixel changed by less than 0.7%"   │  <- Subtitle
│                                                 │
│       "Same math, simpler image — let's see why"│  <- Bridge (after shatter)
│                                                 │
│                                  "Continue →"   │  <- Bottom-right
│              "Skip intro"                       │  <- Bottom-left, muted
└─────────────────────────────────────────────────┘
```

**Vignette:** The panda image has a CSS vignette effect — edges fade to the background color `#0f172a`. Implement with a `box-shadow: inset 0 0 100px 40px #0f172a` on the image container, or a radial gradient overlay.

**Image sizing:** The panda image should be `max-width: 600px`, `max-height: 60vh`, `object-fit: contain`, centered horizontally and vertically in the available space (between the 40px header and the bottom area).

### 5. Skip & Advance Controls

- **"Skip intro"**: small link in bottom-left, DM Sans 14px, muted `#94a3b8`. Clicking skips directly to Beat 1 (calls `onComplete()`).
- **"Continue →"**: appears at t=8s. Click or any key press advances to Beat 1.
- **ArrowRight / Space / Enter / Click anywhere**: at any point during the sequence, advances to Beat 1 (skips remaining animation).
- When advancing mid-sequence: fade out current state over 200ms, then transition to Beat 1.

### 6. Replay Behavior

If the user navigates back to Beat 0 (via beat dots or keyboard `1`), the sequence should replay from the beginning. Reset all animation timers.

### 7. Responsive Behavior

- **Default** (≥1440px): Image max 600×600px, Syne 52px, DM Sans 22px
- **Compact** (768-1439px): Image max 450×450px, Syne 42px, DM Sans 18px
- **Mobile** (<768px): Image full-width minus 32px padding, Syne 32px, DM Sans 16px. "Skip intro" moves to top-right.

## Implementation Notes

- Use `useEffect` with `setTimeout` for the timed sequence. Clean up timeouts on unmount or when `isActive` becomes false.
- Store animation state as a single `phase` value: `'image' | 'label' | 'subtitle' | 'shatter' | 'bridge' | 'continue'`
- The component should be a controlled animation — no CSS `animation-delay` chains. Use JS timers so we can skip/reset cleanly.

## File Structure

```
src/
├── beats/
│   └── Beat0ColdOpen.tsx
public/
└── assets/
    ├── panda_clean.jpg       (placeholder or real)
    ├── panda_adversarial.jpg (placeholder or real)
    └── README.md             (instructions for sourcing images)
```

## Verification

- Opening the app shows the panda sequence playing automatically
- Each animation step fires at the correct time (1.5s, 3.5s, 5s, 7s, 8s)
- The ShatterLabel animation plays at t=5s — "Giant Panda" shatters to "Gibbon"
- "Continue →" appears at t=8s with a pulse animation
- Clicking "Skip intro" at any time jumps to Beat 1
- Pressing arrow right / space at any time jumps to Beat 1
- Navigating back to Beat 0 replays the sequence
- Vignette effect fades image edges to the dark background
- Gracefully handles missing panda images (shows placeholder)
- No console errors
