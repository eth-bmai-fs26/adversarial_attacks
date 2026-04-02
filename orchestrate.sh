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
MIN_ROUNDS=10

mkdir -p "$OUTPUT_DIR"

TRANSCRIPT_FILE="$OUTPUT_DIR/discussion-transcript.md"
CONCEPT_FILE="$OUTPUT_DIR/converged-concept.md"
DISCUSSION_FILE="$OUTPUT_DIR/.discussion-state.txt"

# ─── Helper Functions ───────────────────────────────────────────────────────────
# Define early so they're available during reference material loading

# Resolve claude CLI path — it may not be on PATH in a regular terminal
CLAUDE_BIN=""
if command -v claude &>/dev/null; then
    CLAUDE_BIN="claude"
elif [ -x "$HOME/.npm/_npx/07a316d604ae9f81/node_modules/.bin/claude" ]; then
    CLAUDE_BIN="$HOME/.npm/_npx/07a316d604ae9f81/node_modules/.bin/claude"
else
    # Search common npm global/npx locations
    for candidate in \
        "$HOME/.local/bin/claude" \
        "$HOME/.npm-global/bin/claude" \
        "/usr/local/bin/claude" \
        $(find "$HOME/.npm/_npx" -name claude -type f 2>/dev/null | head -1); do
        if [ -x "$candidate" ]; then
            CLAUDE_BIN="$candidate"
            break
        fi
    done
fi

if [ -z "$CLAUDE_BIN" ]; then
    echo "ERROR: claude CLI not found. Install with: npm install -g @anthropic-ai/claude-code" >&2
    exit 1
fi

call_agent() {
    local system_prompt="$1"
    local user_message="$2"
    local result
    local exit_code

    result=$("$CLAUDE_BIN" -p "$user_message" \
        --system-prompt "$system_prompt" \
        --allowedTools "" \
        --max-turns 1 \
        2>/dev/null) || exit_code=$?

    if [ -z "$result" ]; then
        _log "  ⚠ claude -p returned empty (exit code: ${exit_code:-0})"
        return 1
    fi

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

Your personality: You care deeply about student understanding. You are SKEPTICAL by default — you challenge proposals that look flashy but might confuse students. You play devil's advocate. You poke holes in ideas. You ask: "Would a struggling student understand this? What could go wrong? What alternative approach might work better?"

IMPORTANT — Visual ambition: Default to 3D (Three.js / React Three Fiber) when the concept is inherently spatial. Orbitable 3D scenes with rotation help students see full geometry. Do NOT default to 2D simplifications when 3D would give deeper insight. A 2D panel can accompany 3D as a secondary view, but 3D should be the primary experience for spatial concepts.

CRITICAL RULES FOR DISCUSSION QUALITY:
- Do NOT say CONVERGED in the first 9 rounds. The concept needs more iteration.
- In early rounds (1-3), focus on PROBLEMS, ALTERNATIVES, and OPEN QUESTIONS — not agreement.
- In each round, you MUST raise at least one substantive concern, propose at least one alternative approach, or identify a gap that hasn't been addressed.
- Do not just validate what others said. Challenge assumptions. Ask "what if we did it completely differently?"
- Propose at least one WILD or UNCONVENTIONAL idea in the first 3 rounds — even if it gets rejected, it expands the solution space.
- Only say CONVERGED when you genuinely cannot think of any meaningful improvement AND every major concern has been addressed with a specific solution.

General rules:
- Be concise (2-4 paragraphs per round)
- Respond directly to what other agents said — agree, disagree, refine
- When you raise a concern, propose an alternative
- Explicitly state what you are NOT YET satisfied with
AGENT_EOF

read -r -d '' DESIGN_PROMPT << 'AGENT_EOF' || true
You are the Design Agent in a multi-agent discussion about designing an interactive math visualization for university lectures.

Your focus: What interaction model works best (sliders, drag, step-through, comparison, particle drop, build-up, orbitable 3D scene)? Layout? Color palette for lecture projection (dark backgrounds, high contrast)? Animations that convey math? Typography readable from the back row? Minimal but sufficient controls? Visual metaphors?

Your personality: You are a DEMANDING creative director. You have extremely high standards. You are never satisfied with the first idea — you push for something more original, more memorable, more visually striking. You ask: "Is this the BEST we can do? Have we seen this before? What would make someone screenshot this and share it?" You reject generic solutions.

IMPORTANT — Visual ambition: Default to 3D orbitable scenes (Three.js / React Three Fiber) when the concept is spatial. Surfaces, manifolds, loss landscapes, decision boundaries, vector fields, transformations — these MUST be 3D with orbit controls, not flattened into 2D plots. Use glowing data points, bloom effects, animated trajectories with luminous trails, smooth camera orbits. The visualization should make students think "I want to play with that." Refer to the design patterns reference for specific 3D patterns (Orbitable Scene, 3D Surface Explorer, Animated Trajectory, 3D Slice View).

CRITICAL RULES FOR DISCUSSION QUALITY:
- Do NOT say CONVERGED in the first 9 rounds. The design needs more iteration.
- In early rounds (1-3), propose MULTIPLE alternative design approaches — not just one. Explore the design space before narrowing.
- Challenge other agents' visual choices. If something feels generic, say so and propose something more original.
- In each round, you MUST either: propose a new visual element, challenge an existing choice, or suggest a completely different interaction model.
- Push for at least one "signature moment" — a visual beat so striking that it becomes the thing people remember about this visualization.
- Only say CONVERGED when the design is genuinely exceptional — not just "good enough."

General rules:
- Be concise (2-4 paragraphs per round)
- Respond directly to what other agents said — agree, disagree, refine
- Be specific: suggest hex colors, font names, approximate proportions, animation timings
- For 3D scenes: specify camera position, orbit control settings, lighting, materials, post-processing
- Explicitly state what you are NOT YET satisfied with
AGENT_EOF

read -r -d '' MATH_PROMPT << 'AGENT_EOF' || true
You are the Math Agent in a multi-agent discussion about designing an interactive math visualization for university lectures.

Your focus: Exact equations and computations involved? Parameter ranges that make mathematical sense? Edge cases (division by zero, overflow, degenerate cases)? Mathematical accuracy and honesty? Efficient computation for real-time interaction (especially for 3D rendering)? Interesting special cases?

Your personality: You are a RIGOROUS skeptic. You don't let things slide. If something is mathematically hand-wavy, you call it out. If a visualization could give students a wrong intuition, you flag it loudly. You actively look for ways the math could break, mislead, or oversimplify. You ask: "Is this actually true? What are we hiding? What would a professor object to?"

IMPORTANT — 3D considerations: When the visualization uses 3D (which it should for spatial concepts), think about: parametric surface equations for meshes, vertex count for performance, how to color-code surfaces by value, how to compute gradients/vectors for 3D arrow rendering, and whether computations can run at 60fps. Suggest concrete equations for surface generation.

CRITICAL RULES FOR DISCUSSION QUALITY:
- Do NOT say CONVERGED in the first 9 rounds. The math needs more scrutiny.
- In early rounds (1-3), focus on finding PROBLEMS: mathematical inaccuracies, misleading simplifications, missing edge cases, computations that won't work in real-time.
- Propose alternative mathematical formulations — don't just accept the first equation suggested. Compare tradeoffs.
- In each round, you MUST either: identify a mathematical concern, propose a different formulation, or stress-test an existing proposal with edge cases.
- Think about what a knowledgeable professor would critique. Anticipate objections and address them before they arise.
- Only say CONVERGED when every equation is specified, every edge case is handled, and no mathematical misleading remains.

General rules:
- Be concise (2-4 paragraphs per round)
- Respond directly to what other agents said — agree, disagree, refine
- Write actual equations when relevant (use Unicode math symbols)
- Suggest specific defaults and ranges with justification
- Explicitly state what you are NOT YET satisfied with
AGENT_EOF

read -r -d '' CONVERGENCE_PROMPT << 'AGENT_EOF' || true
You are evaluating whether a multi-agent discussion has TRULY converged — not just whether agents are being polite.

A discussion has CONVERGED ONLY when ALL of these are true:
- ALL THREE agents explicitly include the word CONVERGED in their latest message (not 2 of 3 — all 3)
- No agent has any remaining open questions, concerns, or "I'd like to see..." statements
- The agents have explored MULTIPLE alternative approaches and deliberately chosen one with clear justification
- The specification is detailed enough to implement without ambiguity (specific equations, hex colors, pixel sizes, animation timings)
- At least one significant design change or insight emerged AFTER round 2 (proving the discussion went deep enough)

A discussion has NOT converged if:
- Any agent expresses a remaining concern, even a small one
- Only 2 of 3 agents said CONVERGED
- The agents agreed too quickly without exploring alternatives (this suggests groupthink, not convergence)
- The spec still has vague language ("something like...", "perhaps...", "could be...")

Be STRICT. Err on the side of NOT_CONVERGED. It is much better to have one more round of discussion than to converge prematurely on a mediocre concept.

Respond with ONLY "CONVERGED" or "NOT_CONVERGED" followed by a brief reason on the same line.
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

    # ── Determine discussion phase ─────────────────────────────────────────────
    if [ "$round" -le 3 ]; then
        PHASE="diverge"
        PHASE_INSTRUCTION="PHASE: WILD EXPLORATION (rounds 1-3). Your job is to DIVERGE. Propose radically different approaches. Think of at least 2 completely different ways this could work. Challenge every assumption. Ask 'what if we threw this away and started from scratch?' No idea is too wild. Do NOT agree with other agents yet — push back, propose alternatives, explore the edges of the design space."
    elif [ "$round" -le 6 ]; then
        PHASE="stress_test"
        PHASE_INSTRUCTION="PHASE: STRESS TEST (rounds 4-6). The wild ideas are on the table. Now ATTACK them. Find the weaknesses in every proposal. What breaks? What confuses students? What's technically infeasible at 60fps? What would a skeptical professor tear apart? Be ruthless. For every flaw you find, propose a concrete fix or alternative."
    elif [ "$round" -le 9 ]; then
        PHASE="refine"
        PHASE_INSTRUCTION="PHASE: DEEP REFINEMENT (rounds 7-9). The concept is taking shape. Now make it EXCEPTIONAL. Nail down every detail: exact equations, specific hex colors, precise animation timings in ms, camera positions as [x,y,z]. Identify the ONE signature moment that makes this visualization unforgettable. Resolve remaining tensions with concrete tradeoff decisions, not hand-waving."
    else
        PHASE="converge"
        PHASE_INSTRUCTION="PHASE: CONVERGENCE (round 10+). You may now say CONVERGED — but ONLY if the concept is genuinely extraordinary. Ask yourself: 'Would I be proud to show this to 500 students?' If the answer is anything less than 'absolutely yes', keep pushing. If converging, your message must include a brief summary of what makes this concept exceptional."
    fi

    # ── Select Devil's Advocate ────────────────────────────────────────────────
    # Every 2 rounds (rounds 2, 4, 6, 8...), one agent is assigned to argue
    # AGAINST the current direction. Rotate which agent gets the role.
    AGENTS=("Pedagogy Agent" "Design Agent" "Math Agent")
    DEVILS_ADVOCATE=""
    if (( round % 2 == 0 )); then
        DA_INDEX=$(( (round / 2 - 1) % 3 ))
        DEVILS_ADVOCATE="${AGENTS[$DA_INDEX]}"
        _log "  🔥 Devil's Advocate this round: $DEVILS_ADVOCATE"
    fi

    # ── Run each agent ──────────────────────────────────────────────────────────

    for agent_info in "Pedagogy Agent|$PEDAGOGY_PROMPT" "Design Agent|$DESIGN_PROMPT" "Math Agent|$MATH_PROMPT"; do
        agent_name="${agent_info%%|*}"
        agent_prompt="${agent_info#*|}"

        _log "  → $agent_name is thinking..."

        DISCUSSION_SO_FAR=$(cat "$DISCUSSION_FILE")

        # Build Devil's Advocate injection if this agent is the DA this round
        DA_INJECTION=""
        if [ "$agent_name" = "$DEVILS_ADVOCATE" ]; then
            DA_INJECTION="

🔥 DEVIL'S ADVOCATE ASSIGNMENT: You have been selected as Devil's Advocate this round. Your SOLE JOB is to argue AGAINST the current direction. Even if you secretly like it, you MUST:
1. Identify the single biggest weakness in the current concept and argue it's a fatal flaw
2. Propose a COMPLETELY DIFFERENT approach that solves the same pedagogical goal
3. Challenge the other agents to defend their choices with specific evidence, not vibes
4. Ask at least one question that nobody has considered yet
Do NOT be polite about it. Be the tough critic that forces the best ideas to survive."
        fi

        USER_MSG="Topic for visualization: $TOPIC

$REFERENCE_CONTEXT

Here is the discussion so far:

$DISCUSSION_SO_FAR

It is now round $round of up to $MAX_ROUNDS.

$PHASE_INSTRUCTION
$DA_INJECTION

Do NOT say CONVERGED before round 10. Remember: default to 3D orbitable scenes for spatial concepts — consult the design reference above."

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

        FULL_DISCUSSION=$(cat "$DISCUSSION_FILE")
        CONV_MSG="Here is the FULL transcript of a multi-agent discussion about a math visualization (current round: $round):

$FULL_DISCUSSION

--- LATEST ROUND ($round) ---

$ROUND_TEXT

The discussion had 4 phases: Wild Exploration (1-3), Stress Test (4-6), Deep Refinement (7-9), Convergence (10+).
Every even round, one agent was assigned Devil's Advocate to argue against the current direction.

Have the agents converged on a concept? Remember: convergence requires ALL THREE agents saying CONVERGED, AND the concept must be genuinely exceptional — not just adequate."

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
