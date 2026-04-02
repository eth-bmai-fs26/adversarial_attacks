---
name: math-viz-pipeline
description: Multi-agent pipeline for creating interactive math visualizations for lectures. Use this skill whenever the user wants to create a math visualization, interactive math demo, educational math widget, or lecture visual for topics like calculus, linear algebra, statistics, probability, machine learning, or any mathematical concept. Also trigger when the user says things like "visualize this math concept," "make an interactive demo of," "create a lecture visual for," "build a math widget," "animate this equation," or gives a brief math topic and wants a polished interactive result. This skill handles the full pipeline from rough idea — through a multi-round agent discussion that converges on a concept — to a detailed specification document and working prototype. Even if the user just names a math concept casually (e.g., "eigenvalues" or "gradient descent"), trigger this skill.
---

# Math Visualization Pipeline

A multi-agent pipeline that turns brief math topic descriptions into fully specified, visually stunning interactive visualizations for lectures — with 3D orbitable scenes (Three.js / React Three Fiber) as the default for spatial concepts.

The user provides a rough idea. Three AI agents (Pedagogy, Design, Math) then discuss the concept across multiple rounds until they converge on a unified vision. The converged concept is written up as a detailed specification document, and then built as a working interactive prototype.

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
│  PHASE 1: Multi-Agent Discussion Loop   │
│                                         │
│  ┌───────────┐  ┌───────────┐           │
│  │ Pedagogy  │◄►│  Design   │           │
│  │   Agent   │  │   Agent   │           │
│  └─────┬─────┘  └─────┬─────┘           │
│        │              │                 │
│        └──────┬───────┘                 │
│               │                         │
│        ┌──────┴──────┐                  │
│        │    Math     │                  │
│        │    Agent    │                  │
│        └─────────────┘                  │
│                                         │
│  Rounds repeat until convergence        │
│  (min 3 rounds, max 8 rounds)           │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  PHASE 2: Specification Document        │
│  Moderator synthesizes converged        │
│  concept into detailed spec             │
└────────────────┬────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────┐
│  PHASE 3: Implementation                │
│  Build working .jsx or .html artifact   │
│  from the spec                          │
└─────────────────────────────────────────┘
```

## How to Run the Pipeline

### Step 1: Run the discussion orchestrator

Copy `scripts/orchestrate.sh` to a writable directory and run it:

```bash
cp /path/to/skill/scripts/orchestrate.sh /home/claude/orchestrate.sh
chmod +x /home/claude/orchestrate.sh
bash /home/claude/orchestrate.sh "the user's topic description" /home/claude/viz-output
```

This produces two files in the output directory:
- `discussion-transcript.md` — full multi-round agent conversation
- `converged-concept.md` — the synthesized concept from the moderator

The script will print progress to stderr as each agent thinks and each round completes. It takes 3–8 rounds (typically 4–5) and several minutes to converge.

### Step 2: Generate the specification document

After the discussion converges, read `converged-concept.md` and expand it into a full specification document using the template in `references/pipeline-stages.md`. Save as a markdown file to `/mnt/user-data/outputs/viz-spec-[topic].md`.

### Step 3: Build the visualization

Read the spec and `references/design-patterns.md` for implementation guidance. Build the interactive visualization as a `.jsx` or `.html` artifact. Follow the implementation guidelines in `references/pipeline-stages.md` (Stage 3).

### Step 4: Present outputs

Present to the user:
1. The discussion transcript (so they can see the agents' reasoning)
2. The specification document
3. The working visualization

## Output Summary

Every run produces THREE deliverables:
1. **Discussion Transcript** — full multi-agent conversation showing how the concept evolved
2. **Specification Document** — detailed markdown spec (layout, colors, interactions, math, demo script)
3. **Working Prototype** — a functional `.jsx` or `.html` interactive visualization

## Design Philosophy

Read `references/design-patterns.md` for the full pattern library. Key principles:

- **Default to 3D when the concept is spatial** — surfaces, manifolds, loss landscapes, decision boundaries, transformations, vector fields. Use Three.js / React Three Fiber with orbit controls. A rotatable 3D scene is always more engaging and insightful than a flat 2D diagram. Only use 2D when the concept is fundamentally 1D/2D (function plots, distributions, histograms).
- **Visually stunning first, pedagogically sound always** — the visualization should make students think "I want to play with that." Visual ambition is not optional. Glowing data points, smooth camera orbits, bloom effects, animated trajectories with luminous trails — these are the baseline, not extras.
- **Immediately legible** from the back of a lecture hall
- **Pedagogically sequenced** — reveal complexity gradually
- **Interactive but focused** — controls illuminate the math, not distract
- **Dark backgrounds** with vibrant accents for projection
- **Orbitable and explorable** — for 3D scenes, the instructor can rotate live to reveal structure from different angles. Always include auto-rotate when idle and a "Reset View" button.
