#!/usr/bin/env bash
#
# orchestrate.sh — Multi-agent discussion orchestrator for math visualization concepts
#
# Uses Claude Code (claude -p) to run three agent personas in rounds until convergence.
# Runs entirely under the user's Claude subscription — no API key needed.
#
# Usage:
#   bash orchestrate.sh "topic description" [output_dir] [max_rounds]
#
# Example:
#   bash orchestrate.sh "Riemann sums converging to the integral" ./output 20
#
# Outputs:
#   output_dir/discussion-transcript.md  — full conversation
#   output_dir/converged-concept.md      — synthesized final concept
#

set -euo pipefail

# ─── Arguments ──────────────────────────────────────────────────────────────────

TOPIC="${1:?Usage: orchestrate.sh \"topic\" [output_dir] [max_rounds]}"
OUTPUT_DIR="${2:-./viz-output}"
MAX_ROUNDS="${3:-20}"
MIN_ROUNDS=3

mkdir -p "$OUTPUT_DIR"

TRANSCRIPT_FILE="$OUTPUT_DIR/discussion-transcript.md"
CONCEPT_FILE="$OUTPUT_DIR/converged-concept.md"
DISCUSSION_FILE="$OUTPUT_DIR/.discussion-state.txt"

# ─── Helper Functions ───────────────────────────────────────────────────────────
# Define early so they're available during reference material loading

call_agent() {
    local system_prompt="$1"
    local user_message="$2"
    local result

    result=$(claude -p "$user_message" \
        --system-prompt "$system_prompt" \
        --allowedTools "" \
        --max-turns 1 \
        2>&1) || true

    echo "$result"
}

_log() {
    echo -e "$1" >&2
}

# ─── Load Reference Material ──────────────────────────────────────────────────

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SKILL_SPEC_DIR="$SCRIPT_DIR/skill_spec"

if [ -d "$SKILL_SPEC_DIR" ]; then
    _log "Loading reference material from $SKILL_SPEC_DIR..."
    DESIGN_PATTERNS=$(cat "$SKILL_SPEC_DIR/design-patterns-preview.md" 2>/dev/null || echo "")
    PIPELINE_STAGES=$(cat "$SKILL_SPEC_DIR/pipeline-stages-preview.md" 2>/dev/null || echo "")
else
    _log "⚠ Warning: skill_spec/ directory not found at $SKILL_SPEC_DIR"
    _log "  Agents will discuss without reference material."
    DESIGN_PATTERNS=""
    PIPELINE_STAGES=""
fi

REFERENCE_CONTEXT=""
if [ -n "$DESIGN_PATTERNS" ]; then
    REFERENCE_CONTEXT="
=== DESIGN REFERENCE (you MUST follow these guidelines) ===

$DESIGN_PATTERNS

=== END DESIGN REFERENCE ===
"
fi

# ─── Agent System Prompts ───────────────────────────────────────────────────────

read -r -d '' PEDAGOGY_PROMPT << 'AGENT_EOF' || true
You are the Pedagogy Agent in a multi-agent discussion about designing an interactive math visualization for university lectures.

Your focus: What must students understand? What are common misconceptions? What is the "aha moment"? How should complexity be sequenced? What is the narrative arc of a 2-3 minute lecture demo?

Your personality: You care about student understanding over correctness alone. You push back on "cool but confusing" ideas. You advocate for simplicity and clarity. You ask: "Would a struggling student understand this?"

IMPORTANT — Visual ambition: Default to 3D (Three.js / React Three Fiber) when the concept is inherently spatial. Orbitable 3D scenes with rotation help students see full geometry. Do NOT default to 2D simplifications when 3D would give deeper insight. A 2D panel can accompany 3D as a secondary view, but 3D should be the primary experience for spatial concepts.

Rules:
- Be concise (2-4 paragraphs per round)
- Respond directly to what other agents said — agree, disagree, refine
- When you raise a concern, propose an alternative
- Explicitly state when you are satisfied with an aspect
- When the concept has converged sufficiently, include the word CONVERGED and explain why
AGENT_EOF

read -r -d '' DESIGN_PROMPT << 'AGENT_EOF' || true
You are the Design Agent in a multi-agent discussion about designing an interactive math visualization for university lectures.

Your focus: What interaction model works best (sliders, drag, step-through, comparison, particle drop, build-up, orbitable 3D scene)? Layout? Color palette for lecture projection (dark backgrounds, high contrast)? Animations that convey math? Typography readable from the back row? Minimal but sufficient controls? Visual metaphors?

Your personality: You fight clutter. You champion bold, memorable, visually STUNNING design. You think about experience — what does the student see first? You ask: "Would this look stunning on a projector in a 200-seat hall?"

IMPORTANT — Visual ambition: Default to 3D orbitable scenes (Three.js / React Three Fiber) when the concept is spatial. Surfaces, manifolds, loss landscapes, decision boundaries, vector fields, transformations — these MUST be 3D with orbit controls, not flattened into 2D plots. Use glowing data points, bloom effects, animated trajectories with luminous trails, smooth camera orbits. The visualization should make students think "I want to play with that." Refer to the design patterns reference for specific 3D patterns (Orbitable Scene, 3D Surface Explorer, Animated Trajectory, 3D Slice View).

Rules:
- Be concise (2-4 paragraphs per round)
- Respond directly to what other agents said — agree, disagree, refine
- Be specific: suggest hex colors, font names, approximate proportions, animation timings
- For 3D scenes: specify camera position, orbit control settings, lighting, materials, post-processing
- Explicitly state when you are satisfied with an aspect
- When the concept has converged sufficiently, include the word CONVERGED and explain why
AGENT_EOF

read -r -d '' MATH_PROMPT << 'AGENT_EOF' || true
You are the Math Agent in a multi-agent discussion about designing an interactive math visualization for university lectures.

Your focus: Exact equations and computations involved? Parameter ranges that make mathematical sense? Edge cases (division by zero, overflow, degenerate cases)? Mathematical accuracy and honesty? Efficient computation for real-time interaction (especially for 3D rendering)? Interesting special cases?

Your personality: You ensure nothing is wrong or misleading. You flag when simplification loses something important. You suggest interesting parameter values that reveal behavior. You ask: "Is this still true at the boundaries?"

IMPORTANT — 3D considerations: When the visualization uses 3D (which it should for spatial concepts), think about: parametric surface equations for meshes, vertex count for performance, how to color-code surfaces by value, how to compute gradients/vectors for 3D arrow rendering, and whether computations can run at 60fps. Suggest concrete equations for surface generation.

Rules:
- Be concise (2-4 paragraphs per round)
- Respond directly to what other agents said — agree, disagree, refine
- Write actual equations when relevant (use Unicode math symbols)
- Suggest specific defaults and ranges with justification
- Explicitly state when you are satisfied with an aspect
- When the concept has converged sufficiently, include the word CONVERGED and explain why
AGENT_EOF

read -r -d '' CONVERGENCE_PROMPT << 'AGENT_EOF' || true
You are evaluating whether a multi-agent discussion has converged.

A discussion has CONVERGED when:
- All three agents have expressed satisfaction with the core concept
- No agent is raising NEW fundamental objections (minor polish is fine)
- The group agrees on: what to visualize, the interaction model, the layout, and the math scope
- At least 2 of 3 agents said CONVERGED in their latest messages

Respond with ONLY "CONVERGED" or "NOT_CONVERGED" followed by a brief reason on the same line.
Example: "CONVERGED — all agents agree on slider-based Riemann sum explorer"
Example: "NOT_CONVERGED — Design and Pedagogy still disagree on number of controls"
AGENT_EOF

read -r -d '' MODERATOR_PROMPT << 'AGENT_EOF' || true
You are the Moderator synthesizing a multi-agent discussion about a math visualization concept.

You have the full transcript. Produce a crisp, structured CONCEPT SUMMARY in this exact format:

# Converged Concept: [Title]

## Core Idea
One sentence: what this visualization shows and why it matters.

## The "Aha" Moment
What specific interaction creates the key insight?

## Misconception Addressed
What students typically get wrong, and how this visualization corrects it.

## Mathematical Foundation
- Key equations (Unicode symbols)
- Parameter ranges and defaults
- Edge cases to handle

## Interaction Design
- Primary interaction model
- List of controls with types, ranges, defaults
- Animation behavior

## Visual Design
- Layout (with proportions)
- Color palette (hex codes)
- Typography choices
- Key visual elements

## Narrative Arc (Demo Script)
1. Starting state
2. First interaction
3. Key insight
4. Extension

## Scope Boundaries
What is explicitly NOT included.

## Unresolved Tensions
Any remaining tradeoffs the implementer should be aware of.
AGENT_EOF

# ─── Initialize Transcript ─────────────────────────────────────────────────────

cat > "$TRANSCRIPT_FILE" << EOF
# Multi-Agent Discussion Transcript

## Topic: $TOPIC

**Agents**: Pedagogy Agent, Design Agent, Math Agent
**Max Rounds**: $MAX_ROUNDS

---

EOF

echo "" > "$DISCUSSION_FILE"

# ─── Main Discussion Loop ──────────────────────────────────────────────────────

CONVERGED=false

for round in $(seq 1 "$MAX_ROUNDS"); do
    _log "\n══════════════════════════════════════════"
    _log "  ROUND $round / $MAX_ROUNDS"
    _log "══════════════════════════════════════════"

    echo -e "\n## Round $round\n" >> "$TRANSCRIPT_FILE"

    ROUND_TEXT=""

    # ── Run each agent ──────────────────────────────────────────────────────────

    for agent_info in "Pedagogy Agent|$PEDAGOGY_PROMPT" "Design Agent|$DESIGN_PROMPT" "Math Agent|$MATH_PROMPT"; do
        agent_name="${agent_info%%|*}"
        agent_prompt="${agent_info#*|}"

        _log "  → $agent_name is thinking..."

        DISCUSSION_SO_FAR=$(cat "$DISCUSSION_FILE")

        USER_MSG="Topic for visualization: $TOPIC

$REFERENCE_CONTEXT

Here is the discussion so far:

$DISCUSSION_SO_FAR

It is your turn. Respond to what the other agents have said (if anything). Build on good ideas, challenge weak ones, and refine the concept. Remember: default to 3D orbitable scenes for spatial concepts — consult the design reference above. If you believe the concept has sufficiently converged, include the word CONVERGED in your response."

        RESPONSE=$(call_agent "$agent_prompt" "$USER_MSG")

        if [ -z "$RESPONSE" ]; then
            _log "  ✗ $agent_name returned empty response, retrying..."
            sleep 2
            RESPONSE=$(call_agent "$agent_prompt" "$USER_MSG")
        fi

        # Append to transcript
        echo -e "### $agent_name\n" >> "$TRANSCRIPT_FILE"
        echo -e "$RESPONSE\n" >> "$TRANSCRIPT_FILE"

        # Append to running discussion state
        echo -e "\n--- $agent_name (Round $round) ---\n$RESPONSE" >> "$DISCUSSION_FILE"

        ROUND_TEXT="$ROUND_TEXT\n--- $agent_name ---\n$RESPONSE\n"

        CHAR_COUNT=${#RESPONSE}
        _log "  ✓ $agent_name responded ($CHAR_COUNT chars)"
    done

    echo -e "---\n" >> "$TRANSCRIPT_FILE"

    # ── Check convergence (after minimum rounds) ────────────────────────────────

    if [ "$round" -ge "$MIN_ROUNDS" ]; then
        _log "\n  Checking convergence..."

        CONV_MSG="Here is the latest round of a multi-agent discussion about a math visualization:

$ROUND_TEXT

Have the agents converged on a concept?"

        CONV_RESULT=$(call_agent "$CONVERGENCE_PROMPT" "$CONV_MSG")
        _log "  Result: $CONV_RESULT"

        echo -e "**Convergence Check (Round $round)**: $CONV_RESULT\n\n---\n" >> "$TRANSCRIPT_FILE"

        if echo "$CONV_RESULT" | grep -qi "^CONVERGED"; then
            _log "\n  ✅ CONVERGED after $round rounds!"
            CONVERGED=true
            break
        else
            _log "  ⏳ Not yet converged, continuing..."
        fi
    else
        _log "  (Skipping convergence check — minimum $MIN_ROUNDS rounds required)"
    fi
done

if [ "$CONVERGED" = false ]; then
    _log "\n  ⚠ Reached maximum rounds ($MAX_ROUNDS) without explicit convergence."
    _log "  Proceeding with moderator synthesis anyway."
    echo -e "\n**Note**: Discussion reached maximum rounds without explicit convergence. Moderator will synthesize best available concept.\n" >> "$TRANSCRIPT_FILE"
fi

# ─── Moderator Synthesis ────────────────────────────────────────────────────────

_log "\n══════════════════════════════════════════"
_log "  MODERATOR SYNTHESIS"
_log "══════════════════════════════════════════"
_log "  Moderator is synthesizing the converged concept..."

FULL_TRANSCRIPT=$(cat "$DISCUSSION_FILE")

MODERATOR_MSG="Topic: $TOPIC

Full discussion transcript:

$FULL_TRANSCRIPT

Produce the converged concept summary."

CONCEPT=$(call_agent "$MODERATOR_PROMPT" "$MODERATOR_MSG")

echo "$CONCEPT" > "$CONCEPT_FILE"

_log "  ✓ Concept summary written to $CONCEPT_FILE"

# ─── Summary ────────────────────────────────────────────────────────────────────

_log "\n══════════════════════════════════════════"
_log "  PIPELINE COMPLETE"
_log "══════════════════════════════════════════"
_log "  Rounds: $round"
_log "  Converged: $CONVERGED"
_log "  Transcript: $TRANSCRIPT_FILE"
_log "  Concept:    $CONCEPT_FILE"
_log "══════════════════════════════════════════\n"

# Clean up temp file
rm -f "$DISCUSSION_FILE"
