# Issue 7: Label Shatter Animation

## Goal

Build a reusable "label shatter" animation component. A text label shatters into polygon fragments and reassembles as a new label with a new color. Used in Beat 0 (panda → gibbon) and Beat 1 (class flip at ε*).

## Dependencies

- **Issue 3** (Project Scaffold): Design tokens, fonts (Syne)

## Context

The label shatter is a recurring visual motif in the visualization. It communicates "the network's classification just broke" in a visceral, memorable way. The panda cold-open introduces the visual language (Beat 0), and Beat 1 calls back to it when the MNIST classification flips at ε*.

## Deliverables

### 1. ShatterLabel Component (`src/components/ShatterLabel.tsx`)

```tsx
interface ShatterLabelProps {
  text: string;                    // Current label text (e.g., "Giant Panda — 99.3%")
  color: string;                   // Current text color (hex)
  className?: string;              // Additional classes (for font size, etc.)
  shatterTo?: {                    // When set, triggers the shatter→reassemble animation
    text: string;                  // New label text (e.g., "Gibbon — 99.7%")
    color: string;                 // New text color
  } | null;
  onShatterComplete?: () => void;  // Callback when the full animation finishes
  duration?: number;               // Total animation duration in ms (default: 300)
}
```

### 2. Animation Spec

**Phase 1 — Shatter (0ms → 150ms):**
1. The current text label is split into 12 polygon fragments using CSS `clip-path: polygon(...)`
2. Each fragment is a rough triangle/quadrilateral — generate the clip paths by:
   - Divide the bounding box into a 4×3 grid (4 columns, 3 rows)
   - Each cell becomes a polygon fragment
   - Add ±5px random jitter to interior grid vertices for organic feel (seeded by text content for consistency)
3. Each fragment animates simultaneously:
   - Translate: random direction, 20-60px distance (fragments "fly apart")
   - Rotate: random ±15-45 degrees
   - Opacity: 1 → 0 over the 150ms
   - Scale: 1 → 0.8
   - Easing: `ease-out`
4. Each fragment should use `will-change: transform, opacity` for GPU acceleration

**Phase 2 — Reassemble (150ms → 300ms):**
1. The NEW text/color is rendered, split into the same 12 polygon fragments
2. Each fragment starts at a random offset (20-60px away, random direction — different offsets from Phase 1)
3. Each fragment animates:
   - Translate: from offset → original position (0, 0)
   - Rotate: from random ±15-45° → 0°
   - Opacity: 0 → 1
   - Scale: 0.8 → 1
   - Easing: `ease-in`
4. At 300ms: all fragments are at rest, showing the new text. Remove clip-paths and show the clean new label.

**Between phases:** A 0ms gap (Phase 2 starts immediately when Phase 1 ends). During the ~30ms around the midpoint, both sets of fragments are partially visible, creating a brief "mixed" moment.

### 3. Implementation Approach

Use CSS animations with `clip-path`, `transform`, and `opacity`. Do NOT use canvas or SVG — CSS transforms are GPU-accelerated and integrate naturally with the React text flow.

The 12 fragments are 12 `<span>` elements, each containing the full text but clipped to show only their polygon region. This ensures the text renders identically in each fragment (font metrics, kerning, etc.).

```tsx
// Pseudocode for a single fragment:
<span
  style={{
    clipPath: `polygon(${points})`,
    transform: `translate(${tx}px, ${ty}px) rotate(${rot}deg) scale(${s})`,
    opacity: opacity,
    position: 'absolute',
    inset: 0,
    transition: `all ${duration/2}ms ease-out`,
    willChange: 'transform, opacity',
    color: currentColor,
  }}
>
  {text}
</span>
```

### 4. Trigger Behavior

- When `shatterTo` changes from `null` to an object: trigger the animation
- When `shatterTo` is null: show the static `text` with `color`, no animation
- The component should be safe to re-trigger: setting `shatterTo` to null and then to a new value should work
- During animation (`isAnimating` internal state), ignore new `shatterTo` changes (queue them or ignore — don't interrupt mid-shatter)

### 5. Usage Examples

**Beat 0 (Panda cold-open):**
```tsx
<ShatterLabel
  text="Giant Panda — 99.3%"
  color="#38bdf8"
  className="font-display text-[52px] font-bold"
  shatterTo={showGibbon ? { text: "Gibbon — 99.7%", color: "#f472b6" } : null}
/>
```

**Beat 1 (MNIST class flip):**
```tsx
<ShatterLabel
  text={`"${trueClass}" — ${(trueProb * 100).toFixed(1)}%`}
  color="#38bdf8"
  className="font-display text-[44px] font-bold"
  shatterTo={flipped ? { text: `"${advClass}" — ${(advProb * 100).toFixed(1)}%`, color: "#f472b6" } : null}
  onShatterComplete={() => setShatterDone(true)}
/>
```

### 6. Responsive Behavior

The component inherits its font size from `className`, so it's naturally responsive. The fragment offsets (20-60px) should scale with font size:
- For font sizes ≥ 44px: use 20-60px offsets (default)
- For font sizes < 44px: use 10-30px offsets

Detect font size from the rendered element's `getBoundingClientRect` or accept an optional `size` prop.

## File Structure

```
src/
└── components/
    └── ShatterLabel.tsx
```

## Verification

- Render a label with a button that triggers the shatter
- Clicking the button: label shatters into 12 fragments flying outward, then reassembles as new text/color
- Total animation is ~300ms, feels snappy
- Fragments follow organic (slightly randomized) paths, not a uniform explosion
- The new label is perfectly positioned after reassembly (no sub-pixel drift)
- Triggering multiple shatters in sequence works (e.g., flip → flip back)
- Works at different font sizes (52px for panda, 44px for MNIST)
- Smooth on 60Hz displays (GPU-accelerated transforms)
- No layout shift during animation (the component maintains its bounding box)
- No console errors
