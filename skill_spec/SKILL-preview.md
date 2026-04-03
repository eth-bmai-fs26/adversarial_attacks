---
name: math-viz-pipeline
description: Multi-agent pipeline for creating interactive math visualizations for lectures. Use this skill whenever the user wants to create a math visualization, interactive math demo, educational math widget, or lecture visual for topics like calculus, linear algebra, statistics, probability, machine learning, or any mathematical concept. Also trigger when the user says things like "visualize this math concept," "make an interactive demo of," "create a lecture visual for," "build a math widget," "animate this equation," or gives a brief math topic and wants a polished interactive result. This skill handles the full pipeline from rough idea — through a multi-round agent discussion that converges on a concept — to a detailed specification document, issue decomposition, and multi-agent implementation. Even if the user just names a math concept casually (e.g., "eigenvalues" or "gradient descent"), trigger this skill.
---

# Math Visualization Pipeline

A multi-agent pipeline that turns brief math topic descriptions into fully specified, visually stunning interactive visualizations for lectures — with narrative-driven beat structures, precomputed data for reliability, and optional live exploration modes.

The user provides a rough idea. Three AI agents (Pedagogy, Design, Math) then discuss the concept across multiple rounds of structured adversarial debate (wild exploration → stress testing → deep refinement → convergence) until they converge on a unified vision. The converged concept is decomposed into parallel implementation issues, and then built by multiple agents working concurrently.

## Prerequisites

This skill requires **Claude Code** (`claude` CLI) to be installed and authenticated. The user must have a Claude Pro or Max subscription. Claude Code is used in non-interactive mode (`claude -p`) to run each agent as a separate invocation under the user's subscription — no API key needed.

If Claude Code is not installed, tell the user:
- Install: `npm install -g @anthropic-ai/claude-code`
- Authenticate: `claude` (opens browser login)
- Verify: `claude -p "hello"` should return a response

## Pipeline Overview

```
User's brief topic
       │
       ▼
┌─────────────────────────────────────────┐
│  PHASE 1: Multi-Agent Discussion        │
│                                         │
│  ┌───────────┐  ┌───────────┐           │
│  │ Pedagogy  │◄►│  Design   │           │
│  │   Agent   │  │   Agent   │           │
│  └─────┬─────┘  └─────┬─────┘           │
│        └──────┬───────┘                 │
│        ┌──────┴──────┐                  │
│        │    Math     │                  │
│        │    Agent    │                  │
│        └─────────────┘                  │
│                                         │
│  4 phases: Explore → Stress-test →      │
│  Refine → Converge (min 10 rounds)      │
│  Devil's Advocate every 2nd round       │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  PHASE 2: Specification & Decomposition │
│  Moderator synthesizes concept.         │
│  Decompose into tiered parallel issues  │
│  with detailed agent prompts.           │
│  Write CLAUDE.md for shared context.    │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  PHASE 3: Parallel Implementation       │
│  Multiple agents work on independent    │
│  issues concurrently (Tier 0 → 1 → 2)  │
│  Final integration pass (Tier 3)        │
└─────────────────────────────────────────┘
```

## How to Run the Pipeline

### Step 1: Run the discussion orchestrator

```bash
bash orchestrate.sh "the user's topic description" ./viz-output 20
```

This produces:
- `discussion-transcript.md` — full multi-round agent conversation
- `converged-concept.md` — the synthesized concept from the moderator

The script runs 10-15 rounds with structured phases (wild exploration, stress testing, deep refinement, convergence) and rotating Devil's Advocate assignments. It takes several minutes to converge.

### Step 2: Decompose into issues

Read `converged-concept.md` and decompose into tiered parallel issues:
- **Tier 0**: Precomputation pipeline (Python) + project scaffold (React/Vite/Tailwind) — start immediately
- **Tier 1**: Reusable UI components (slider, bars, canvas renderers) — after scaffold, build with mock data
- **Tier 2**: Beat assembly + feature tracks — compose Tier 1 components with real data
- **Tier 3**: Integration, responsive, accessibility — after all above

Write a detailed prompt for each issue in `issue-prompts/XX-name.md`. Write a `CLAUDE.md` with shared context for all agents.

### Step 3: Implement in parallel

Launch agents on Tier 0 issues simultaneously. As each tier completes, launch the next tier. Each agent reads `CLAUDE.md` for shared context and its specific issue prompt for detailed instructions.

### Step 4: Present outputs

Present to the user:
1. The discussion transcript (so they can see the agents' reasoning)
2. The converged concept spec
3. The working visualization

## Output Summary

Every run produces:
1. **Discussion Transcript** — full adversarial multi-agent conversation showing how the concept evolved through structured friction
2. **Converged Concept** — detailed spec (narrative arc, math, visual design, interaction design, edge cases, unresolved tensions)
3. **Issue Prompts** — one detailed prompt per implementation issue, organized by dependency tier
4. **CLAUDE.md** — shared project context for all implementation agents
5. **Working Application** — a functional React app with precomputed data, beat-based navigation, and optional live modes

## Design Philosophy

Read `design-patterns-preview.md` for the full pattern library. Key principles:

- **Tell a story, not a dashboard** — structure as a narrative arc (hook → explore → reveal → comparison → implication), not a control panel with 13 toggles
- **One signature moment** — every visualization needs one visual so striking it works as a poster. Design backwards from this moment.
- **Mathematically honest always** — never build a visual that teaches a wrong mental model, even if it looks cool. Kill ideas that contradict the math.
- **Precompute for reliability** — the core lecture demo runs from static JSON with zero live computation. Add live exploration (TF.js, WebGL) as a separate "Lab Mode" behind a tab.
- **Default to 3D when spatial** — surfaces, manifolds, loss landscapes, decision boundaries, transformations. Use R3F with orbit controls. Only use 2D for fundamentally 1D/2D concepts.
- **Projector-first** — dark backgrounds, high contrast, ≥20px numbers, high-contrast mode toggle, self-hosted fonts (no WiFi dependency)
- **Keyboard-first** — professors use wireless clickers that send arrow keys. Every action must have a keyboard shortcut.
- **Component architecture** — build reusable pieces first (with mock data), compose into beats later. This enables parallel agent implementation.
