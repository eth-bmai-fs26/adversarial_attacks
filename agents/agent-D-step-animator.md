# Agent D — Step Animator & Controller

## Role
You build the step controller: the "Next Step" button UI and the state machine that orchestrates which animations trigger when. This is the central coordination logic.

## Output
Write a single file: `agents/output/step-animator.jsx`

Export a React component `<StepController>` and a custom hook `useStepAnimator`.

## Read first
Read ALL of these files before implementing:
- `agents/output/data-layer.js` (Agent A)
- `agents/output/manifold-svg.jsx` (Agent B)
- `agents/output/right-panel.jsx` (Agent C)

Understand the props each component expects and how `step` drives their behavior.

## What to build

### 1. `useStepAnimator` Hook

```js
function useStepAnimator() {
  // Returns:
  // step: number (1-6)
  // animationPhase: string (e.g., 'idle', 'entering', 'active')
  // advanceStep: () => void
  // resetToStep: (n: number) => void
  // canAdvance: boolean
}
```

**State machine per step:**

When `advanceStep()` is called:
1. Set `animationPhase = 'entering'`
2. Increment `step`
3. After the step's animation duration completes, set `animationPhase = 'active'`

Animation durations per step:
- Step 1 → 2: 600ms (gradient arrow fade-in)
- Step 2 → 3: 400ms (component snap)
- Step 3 → 4: 800ms (perturbation path)
- Step 4 → 5: 300ms (image fade-in)
- Step 5 → 6: 600ms (callout card fade-in)

`canAdvance` is `false` during 'entering' phase (prevents clicking Next too fast).

### 2. `<StepController>` Component

A bottom bar or floating control area containing:

- **"Next Step" button**:
  - Always visible
  - Text: "Next Step →" (steps 1–5) or "Reset ↺" (step 6, resets to step 1)
  - Style: background `#1B2332`, hover `#2D3748`, text `#E6EDF3`, padding 16px 32px, border-radius 8px, Inter 20px bold
  - Disabled state (during animation): opacity 0.5, cursor not-allowed
  - Keyboard shortcut: right arrow key or spacebar also advances

- **Step indicator**:
  - Six small dots/circles showing progress
  - Current step: `#58A6FF` filled
  - Completed steps: `#58A6FF` outline
  - Future steps: `#1B2332`
  - 12px diameter, 8px gap between dots

- **Step description text**:
  - Small text below the button showing what just happened or what's next
  - Step 1: "A correctly classified image in feature space"
  - Step 2: "The gradient points toward higher loss"
  - Step 3: "Each dimension independently chooses ±ε"
  - Step 4: "The perturbation crosses the decision boundary"
  - Step 5: "The images look identical to us"
  - Step 6: "High dimensions make this unavoidable"
  - Inter 16px, `#94A3B8`

### 3. Layout Orchestration

The `<StepController>` also serves as the top-level layout wrapper. It renders:

```jsx
<div style={{ display: 'flex', height: '100vh', background: '#0D1117' }}>
  <div style={{ width: '60%' }}>
    <ManifoldPlot step={step} epsilon={epsilon} width={...} height={...} />
  </div>
  <div style={{ width: '40%' }}>
    <RightPanel step={step} epsilon={epsilon} loss={loss} confidences={conf} />
  </div>
  <BottomBar>
    {/* Next Step button, step indicator, epsilon slider (from Agent E) */}
  </BottomBar>
</div>
```

The bottom bar is positioned fixed at the bottom, 80px height, full width, background `#161B22` with a top border `1px solid #1B2332`.

### 4. Keyboard Navigation
- **Right arrow** or **Space**: advance step
- **Left arrow**: go back one step (reset animations for the un-done step)
- **R key**: reset to step 1
- Use `useEffect` with `keydown` event listener

## Constraints
- The step controller must not re-trigger animations when epsilon changes (only when step changes)
- Use `useCallback` and `useMemo` to prevent unnecessary re-renders
- The animation lock (`canAdvance = false`) is critical — without it, rapid clicking breaks the sequence
- All colors and fonts from the converged concept palette
