#!/bin/bash

# Stop hook - Grind pattern for autonomous iteration
# Continues agent until workfile contains DONE or max iterations reached
#
# Uses session-tracked plan (.claude/plans/*.md) if active, else .claude/scratchpad.md
# Mark '## DONE' when complete or '## BLOCKED' if stuck

# Source config checker
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/check-config.sh"

# Check if disabled
is_hook_disabled "grind" && exit 0

# Read input from stdin
INPUT=$(cat)

# Parse stop hook fields
STATUS=$(echo "$INPUT" | jq -r '.stop_hook_status // .status // "completed"')
LOOP_COUNT=$(echo "$INPUT" | jq -r '.loop_count // 0')
SESSION_ID=$(get_session_id "$INPUT")

MAX_ITERATIONS=10

# Check for session-tracked plan first, fall back to scratchpad
ACTIVE_PLAN=""
[ -n "$SESSION_ID" ] && ACTIVE_PLAN=$(cat ".claude/sessions/.active-plan-${SESSION_ID}" 2>/dev/null || echo "")
if [ -n "$ACTIVE_PLAN" ] && [ -f "$ACTIVE_PLAN" ]; then
  WORKFILE="$ACTIVE_PLAN"
  WORKFILE_TYPE="plan"
else
  WORKFILE=".claude/scratchpad.md"
  WORKFILE_TYPE="scratchpad"
fi

# Only continue if completed normally (not aborted/error)
if [ "$STATUS" != "completed" ]; then
  echo '{}'
  exit 0
fi

# Check max iterations
if [ "$LOOP_COUNT" -ge "$MAX_ITERATIONS" ]; then
  echo "{\"message\": \"⚠️ Max iterations reached. Review ${WORKFILE_TYPE} for status.\"}"
  exit 0
fi

# Check if workfile exists
if [ ! -f "$WORKFILE" ]; then
  # First stop without workfile - suggest creating one for complex tasks
  if [ "$LOOP_COUNT" -eq 0 ]; then
    jq -n '{"message": "💡 Tip: For multi-step tasks, create .claude/scratchpad.md or .claude/plans/[name].md to enable autonomous iteration."}'
  else
    echo '{}'
  fi
  exit 0
fi

# Read workfile content
CONTENT=$(cat "$WORKFILE")

# Check for DONE marker (using shared pattern)
if is_work_done "$CONTENT"; then
  cleanup_session_files "$SESSION_ID"

  if [ "$WORKFILE_TYPE" = "scratchpad" ]; then
    rm "$WORKFILE"
    echo '{"message": "✅ Grind complete - scratchpad cleared"}'
  else
    echo '{"message": "✅ Grind complete - plan marked done"}'
  fi
  exit 0
fi

# Check for explicit BLOCKED marker (using shared pattern)
if is_work_blocked "$CONTENT"; then
  echo "{\"message\": \"❌ Grind stopped - ${WORKFILE_TYPE} marked BLOCKED\"}"
  exit 0
fi

# Check for active goals/tasks (using shared pattern)
if has_active_work "$CONTENT"; then
  # Has incomplete work, continue
  ITERATION=$((LOOP_COUNT + 1))

  # Check for repeated failure patterns
  FAILURE_COUNT=$(echo "$CONTENT" | grep -ci "fail\|error\|❌" || echo "0")
  FAILURE_HINT=""
  if [ "$FAILURE_COUNT" -gt 3 ]; then
    FAILURE_HINT=" Note: Multiple failures detected - consider marking '## BLOCKED' if stuck on same issue."
  fi

  # Build context from workfile
  CONTEXT=$(echo "$CONTENT" | head -20 | tr '\n' ' ' | cut -c1-200)

  FOLLOWUP="[Iteration ${ITERATION}/${MAX_ITERATIONS}] Continue working on the task. Update ${WORKFILE} with progress. Mark '## DONE' when complete or '## BLOCKED' if stuck.${FAILURE_HINT}

Current ${WORKFILE_TYPE} context: ${CONTEXT}..."

  # Return followup message to continue agent
  jq -n --arg msg "$FOLLOWUP" '{"followup_message": $msg}'
  exit 0
fi

# No active work detected
echo '{}'
exit 0
