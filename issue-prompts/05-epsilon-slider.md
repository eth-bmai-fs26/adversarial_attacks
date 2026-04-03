# Issue 5: ε Slider Component

## Goal

Build a custom epsilon slider component — the single most-used interactive control in the visualization. It must be visually striking (color-transitioning rail, glowing thumb), physically precise (magnetic snap at ε*), and keyboard-accessible.

## Dependencies

- **Issue 3** (Project Scaffold): Design tokens, Tailwind config, color palette

## Context

The ε slider controls the perturbation magnitude across Beats 1-3. It spans the full width of the viewport at the bottom (64px tall). As ε increases, the slider rail transitions from "safe" (sky blue) to "danger" (pink), with a white flash zone at the critical epsilon ε* where classification flips.

The slider is the primary interaction for the entire demo. It must feel responsive, look polished, and give the professor a "magnetic" snap at the exact epsilon that causes the flip — so they can reliably find the dramatic moment without fumbling.

## Deliverables

### 1. EpsilonSlider Component (`src/components/EpsilonSlider.tsx`)

```tsx
interface EpsilonSliderProps {
  value: number;                    // Current ε, [0, 0.35]
  onChange: (epsilon: number) => void;
  epsilonStar: number | null;       // Critical ε where classification flips
  min?: number;                     // Default: 0
  max?: number;                     // Default: 0.35
  step?: number;                    // Default: 0.005 (keyboard fine step)
  coarseStep?: number;              // Default: 0.05 (Shift+keyboard step)
  disabled?: boolean;               // During transitions or Beat 0
}
```

### 2. Visual Spec

**Overall layout:**
- Full-width minus 32px padding each side
- 64px total height (rail + labels + padding)
- Rail height: 6px, centered vertically with 24px thumb overlapping

**Rail coloring (the key visual feature):**
- From 0 to `ε* - 0.01`: sky blue `#38bdf8`
- From `ε* - 0.01` to `ε* + 0.01`: white `#ffffff` flash zone (20px wide at ε* position)
- From `ε* + 0.01` to 0.35: pink `#f472b6`
- If `epsilonStar` is null (no flip): entire rail is sky blue
- The transition between colors should be a hard edge, not a gradient — this communicates the decision boundary

**Thumb:**
- 24px diameter circle
- Fill: white `#ffffff`
- Glow: `box-shadow: 0 0 12px #38bdf8` when ε < ε*, `0 0 12px #f472b6` when ε ≥ ε*
- Position tracks the current ε value along the rail
- Cursor: `grab` on hover, `grabbing` on drag

**Labels:**
- Left end: "0" in JetBrains Mono 14px, muted `#94a3b8`
- Right end: "0.35" in JetBrains Mono 14px, muted
- Below thumb (follows thumb position): `"ε = 0.150"` in JetBrains Mono 28px, primary text `#f1f5f9`
  - Always show 3 decimal places
  - This label must not overflow the container edges — clamp position so text stays within bounds

**ε* marker:**
- A thin vertical tick mark (2px wide, 16px tall) at the ε* position on the rail
- Color: white `#ffffff` with 50% opacity
- Subtle enough not to spoil the discovery, but visible once you know where to look

### 3. Magnetic Snap Behavior

When the user releases the thumb (mouseup/touchend) within the magnetic zone:
- Magnetic zone: `|ε - ε*| ≤ 0.01`
- On release: animate the thumb to exactly ε* over 300ms with `ease-out` easing
- Fire `onChange(epsilonStar)` after the animation completes
- During the 300ms animation, the slider is "locked" — drag doesn't work
- If the user releases OUTSIDE the magnetic zone, the value stays where it is (no snapping)

Keyboard arrows should also snap: if stepping with arrow keys would land within the magnetic zone, step exactly to ε* instead.

### 4. Interaction Handlers

**Mouse/touch drag:**
- Track `mousedown` → `mousemove` → `mouseup` on the rail and thumb
- Map pointer X position to ε value using rail bounds
- Clamp to [min, max]
- Fire `onChange` on every move (for real-time updates to image/bars)
- Also support clicking anywhere on the rail to jump to that ε

**Keyboard (when slider is focused):**
- `ArrowRight` / `ArrowUp`: increase by `step` (0.005)
- `ArrowLeft` / `ArrowDown`: decrease by `step` (0.005)
- `Shift + ArrowRight`: increase by `coarseStep` (0.05)
- `Shift + ArrowLeft`: decrease by `coarseStep` (0.05)
- `Home`: set to min (0)
- `End`: set to max (0.35)

**Important:** The slider must capture keyboard events only when focused (via `tabIndex={0}` and `onKeyDown`). It must NOT interfere with the beat navigation keys (1-4, ←→ for beats). The beat navigation system (Issue 4) handles global keys; this slider only handles keys when it has focus.

To avoid conflict: the slider should call `event.stopPropagation()` on arrow key events when focused, so they don't bubble up to the beat navigation handler.

### 5. Accessibility

- Role: `slider`
- `aria-valuemin`, `aria-valuemax`, `aria-valuenow`, `aria-label="Perturbation epsilon"`
- `tabIndex={0}` for keyboard focus
- Focus ring: 2px `#38bdf8` outline offset 2px (visible but not intrusive)

### 6. Responsive Behavior

- **Default** (≥1440px): 64px tall, 28px ε readout, 24px thumb
- **Compact** (768-1439px): 48px tall, 22px ε readout, 20px thumb
- **Mobile** (<768px): 48px tall, full width (no side padding beyond 16px), 22px readout, touch-friendly 32px thumb (larger for fingers)

## File Structure

```
src/
└── components/
    └── EpsilonSlider.tsx
```

## Mock Data for Development

While developing without precomputed data, use a hardcoded `epsilonStar = 0.152` to test all visual behaviors (rail coloring, magnetic snap, thumb glow transition).

## Verification

- Dragging the thumb smoothly updates the ε value
- Rail colors transition at the ε* boundary (sky blue → white flash → pink)
- Thumb glow changes color at ε*
- Releasing within ±0.01 of ε* snaps the thumb to ε* with 300ms animation
- Releasing outside the magnetic zone stays put
- Keyboard arrows step by 0.005, Shift+arrows by 0.05
- Keyboard steps snap to ε* when entering the magnetic zone
- The ε readout below the thumb shows 3 decimal places and doesn't overflow
- Clicking the rail jumps to that position
- The slider doesn't interfere with beat navigation arrow keys (when not focused)
- Works on touch devices (drag with finger)
- No console errors
