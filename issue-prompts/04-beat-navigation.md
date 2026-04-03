# Issue 4: Beat Navigation System

## Goal

Build a beat-based navigation system that manages which "beat" (slide) of the visualization is active, handles keyboard shortcuts, renders beat-dot indicators, and animates transitions between beats. This is the backbone that all beat-specific views plug into.

## Dependencies

- **Issue 3** (Project Scaffold): React + Vite + Tailwind project, design tokens, types

## Context

The FGSM visualization is structured as a beat-based presentation (like slides, not a movie). Each beat is independently reachable. The beats are:

| Beat | Name | Description |
|------|------|-------------|
| 0 | "The Cold Open" | Panda animation, non-interactive |
| 1 | "The Crime" | MNIST image + ε slider exploration |
| 2a | "The Ghost" | Sign map reveal |
| 2b | "Equal vs. Proportional" | FGSM vs gradient split comparison |
| 3 | "The Implication" | Adversarial training comparison |

Beats 2a and 2b are sub-beats — navigating forward from Beat 1 goes to 2a, then 2b, then 3. The beat dots show 2a and 2b as a connected pair (●─●).

## Deliverables

### 1. Beat State Machine (`src/hooks/useBeatNavigation.ts`)

A custom React hook that manages beat state:

```ts
interface UseBeatNavigation {
  currentBeat: Beat;           // 0 | 1 | '2a' | '2b' | 3
  goToBeat: (beat: Beat) => void;
  goNext: () => void;
  goPrev: () => void;
  resetToStart: () => void;
  isTransitioning: boolean;    // true during transition animation
  transitionDirection: 'forward' | 'backward' | null;
}
```

Beat ordering for next/prev: `0 → 1 → 2a → 2b → 3`. Going next from 3 does nothing. Going prev from 0 does nothing.

### 2. Keyboard Handler

Register global keyboard listeners (in the hook or a separate `useKeyboardNav` hook):

| Key | Action |
|-----|--------|
| `→` (ArrowRight) | Go to next beat |
| `←` (ArrowLeft) | Go to previous beat |
| `1` | Jump to Beat 0 |
| `2` | Jump to Beat 1 |
| `3` | Jump to Beat 2a |
| `4` | Jump to Beat 3 |
| `Escape` | Reset to Beat 0 |

Important:
- Keys `1-4` map to beats by position, not by beat ID (so `3` = Beat 2a, not Beat 3)
- Keyboard events should NOT fire when the user is typing in an input field (check `event.target`)
- During Beat 0's timed animation, `→` and click should advance to Beat 1 (skipping remaining animation)
- The keyboard handler must not conflict with beat-specific keys (R for reveal, G for toggle, etc.) — those are handled by the beat components themselves

### 3. Beat Dot Indicators (`src/components/BeatDots.tsx`)

A row of clickable dots displayed at top center of the viewport, inside the 40px header area.

Visual spec:
- Dots are 10px diameter circles
- Active dot: filled `#f1f5f9` (primary text color)
- Inactive dot: outlined `#94a3b8` (muted), 1.5px stroke, no fill
- Spacing: 16px between dots
- Beats 2a and 2b are connected with a 12px horizontal line between them (the ●─● pattern)
- Total: 5 dots — [Beat 0] [Beat 1] [Beat 2a]─[Beat 2b] [Beat 3]
- Clicking a dot navigates to that beat
- The active dot has a subtle scale animation (1.0 → 1.2 → 1.0, 300ms, on beat change)

Position: centered horizontally in the 40px header bar. Use `font-body` (DM Sans) for any labels.

### 4. Beat Container (`src/components/BeatContainer.tsx`)

A wrapper component that:
- Renders the active beat's content
- Handles transition animations between beats
- Transition: 400ms crossfade (outgoing fades to 0, incoming fades from 0)
- During transition, `isTransitioning` is true (prevents interaction with beat content)
- Uses CSS `opacity` + `transition` for the fade, not React unmount/mount (to avoid layout shift)

```tsx
interface BeatContainerProps {
  currentBeat: Beat;
  isTransitioning: boolean;
  children: React.ReactNode; // The active beat's content
}
```

### 5. App Shell Integration (`src/App.tsx`)

Update `App.tsx` to:
- Use the `useBeatNavigation` hook
- Render `BeatDots` in a fixed 40px header
- Render `BeatContainer` in the main content area
- For now, render placeholder content for each beat:
  - Beat 0: "Beat 0: Panda Cold Open" in Syne 44px
  - Beat 1: "Beat 1: The Crime" in Syne 44px
  - Beat 2a: "Beat 2a: The Ghost" in Syne 44px
  - Beat 2b: "Beat 2b: FGSM vs Gradient" in Syne 44px
  - Beat 3: "Beat 3: Adversarial Training" in Syne 44px
- Each placeholder should be centered on the dark canvas
- Remove the color/font verification swatches from Issue 3

### 6. Layout Structure

```
┌─────────────────────────────────────────────────┐
│  [Beat dots: ● ● ●─● ○ ]           [Settings] │  <- 40px header, fixed
│                                                 │
│                                                 │
│                                                 │
│              [Beat Content Area]                │  <- flex-1, centered
│                                                 │
│                                                 │
│                                                 │
│                                                 │
│                                                 │
│  [ε slider area — reserved, 64px]              │  <- fixed bottom (Beats 1-3 only)
└─────────────────────────────────────────────────┘
```

The header (40px) is always visible. The bottom slider area (64px) is reserved for Beats 1-3 but hidden during Beat 0. The beat content fills the remaining vertical space.

The `[Settings]` gear icon in the top-right is a placeholder button (no functionality yet — Issue 18 adds the high-contrast toggle there).

## Responsive Behavior

- **Default** (≥1440px): As described above
- **Compact** (768-1439px): Header shrinks to 32px, dots to 8px diameter, spacing to 12px
- **Mobile** (<768px): Dots move to bottom of screen above the slider. Header removed. Swipe left/right to navigate beats (use touch events with a 50px horizontal threshold).

## File Structure

```
src/
├── hooks/
│   └── useBeatNavigation.ts
├── components/
│   ├── BeatDots.tsx
│   └── BeatContainer.tsx
├── App.tsx  (updated)
└── types/
    └── index.ts  (Beat type already defined)
```

## Verification

- `npm run dev` shows the beat navigation working
- Arrow keys navigate between beats with 400ms crossfade
- Number keys 1-4 jump to specific beats
- Escape resets to Beat 0
- Beat dots update correctly, with the connected 2a─2b pair visible
- Clicking dots navigates to the correct beat
- Transitions don't allow double-navigation (clicking fast doesn't break state)
- No console errors
