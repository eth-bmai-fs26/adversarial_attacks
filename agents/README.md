# Agent Launch Order

Since this is a single-file React component, agents produce **module fragments** (exported functions/constants/JSX snippets) that a final integrator stitches together. Each agent writes to its own file in `agents/output/`.

## Dependency Graph

```
         ┌──────────────┐
         │   WAVE 1     │  (launch all 3 in parallel)
         └──────────────┘
    ┌─────────┼─────────────┐
    ▼         ▼             ▼
┌────────┐ ┌──────────┐ ┌──────────┐
│ Agent A│ │ Agent B  │ │ Agent C  │
│ Data & │ │ Manifold │ │ Right    │
│ Math   │ │ SVG      │ │ Panel    │
└───┬────┘ └────┬─────┘ └────┬─────┘
    │           │             │
    ▼           ▼             ▼
         ┌──────────────┐
         │   WAVE 2     │  (launch both in parallel, after Wave 1 completes)
         └──────────────┘
         ┌───────┼────────┐
         ▼                ▼
    ┌─────────┐    ┌──────────┐
    │ Agent D │    │ Agent E  │
    │ Step    │    │ Slider & │
    │ Animator│    │ Inset    │
    └────┬────┘    └────┬─────┘
         │              │
         ▼              ▼
         ┌──────────────┐
         │   WAVE 3     │  (launch after Wave 2 completes)
         └──────────────┘
              │
              ▼
         ┌─────────┐
         │ Agent F │
         │ Integra-│
         │ tor     │
         └─────────┘
```

## Kanban Board

### WAVE 1 — Launch in parallel
| Ticket     | Agent | Depends On | Output File |
|------------|-------|------------|-------------|
| FGSM-A     | Data & Math Engine | — | `agents/output/data-layer.js` |
| FGSM-B     | Manifold SVG | — | `agents/output/manifold-svg.jsx` |
| FGSM-C     | Right Panel | — | `agents/output/right-panel.jsx` |

### WAVE 2 — Launch in parallel (after Wave 1 done)
| Ticket     | Agent | Depends On | Output File |
|------------|-------|------------|-------------|
| FGSM-D     | Step Animator | A, B, C | `agents/output/step-animator.jsx` |
| FGSM-E     | Slider & Inset | A, B | `agents/output/slider-inset.jsx` |

### WAVE 3 — Launch alone (after Wave 2 done)
| Ticket     | Agent | Depends On | Output File |
|------------|-------|------------|-------------|
| FGSM-F     | Integrator | A, B, C, D, E | `adversarial-attack-viz.jsx` |
