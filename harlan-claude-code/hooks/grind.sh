#!/bin/bash

# Stop hook - Grind pattern for autonomous iteration
# Continues agent until scratchpad contains DONE or max iterations reached
#
# Usage: Agent writes to .claude/scratchpad.md with status updates
# When done, agent writes "DONE" to scratchpad
# Hook checks and sends followup_message to continue if not done

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

MAX_ITERATIONS=10
SCRATCHPAD=".claude/scratchpad.md"

# Only continue if completed normally (not aborted/error)
if [ "$STATUS" != "completed" ]; then
  echo '{}'
  exit 0
fi

# Check max iterations
if [ "$LOOP_COUNT" -ge "$MAX_ITERATIONS" ]; then
  echo '{"message": "⚠️ Max iterations reached. Review scratchpad for status."}'
  exit 0
fi

# Check if scratchpad exists
if [ ! -f "$SCRATCHPAD" ]; then
  echo '{}'
  exit 0
fi

# Read scratchpad content
CONTENT=$(cat "$SCRATCHPAD")

# Check for DONE marker (case insensitive)
if echo "$CONTENT" | grep -qi "^## *DONE\|^DONE\|status:.*done\|✅.*done\|done.*✅"; then
  echo '{"message": "✅ Grind complete - scratchpad marked DONE"}'
  exit 0
fi

# Check for explicit BLOCKED marker
if echo "$CONTENT" | grep -qi "^## *BLOCKED\|^BLOCKED\|status:.*blocked\|❌.*blocked"; then
  echo '{"message": "❌ Grind stopped - scratchpad marked BLOCKED"}'
  exit 0
fi

# Check for active goals/tasks
if echo "$CONTENT" | grep -qi "## *current\|## *goal\|## *task\|- \[ \]"; then
  # Has incomplete work, continue
  ITERATION=$((LOOP_COUNT + 1))

  # Check for repeated failure patterns in scratchpad
  FAILURE_COUNT=$(echo "$CONTENT" | grep -ci "fail\|error\|❌" || echo "0")
  FAILURE_HINT=""
  if [ "$FAILURE_COUNT" -gt 3 ]; then
    FAILURE_HINT=" Note: Multiple failures detected - consider marking '## BLOCKED' if stuck on same issue."
  fi

  # Build context from scratchpad
  CONTEXT=$(echo "$CONTENT" | head -20 | tr '\n' ' ' | cut -c1-200)

  FOLLOWUP="[Iteration ${ITERATION}/${MAX_ITERATIONS}] Continue working on the task. Update .claude/scratchpad.md with progress. Mark '## DONE' when complete or '## BLOCKED' if stuck.${FAILURE_HINT}

Current scratchpad context: ${CONTEXT}..."

  # Return followup message to continue agent
  jq -n --arg msg "$FOLLOWUP" '{"followup_message": $msg}'
  exit 0
fi

# No active work detected
echo '{}'
exit 0
