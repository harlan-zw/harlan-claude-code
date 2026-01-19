#!/bin/bash

# PreCompact hook - save context before conversation compaction
# Writes a summary to .claude/session-context.md for reference

# Only if .claude dir exists (project is claude-aware)
[ ! -d ".claude" ] && exit 0

# Get session_id from stdin
input=$(cat)
session_id=$(echo "$input" | jq -r '.session_id // empty')

SESSION_FILE=".claude/session-context.md"

# Create/update session context
{
  echo "# Session Context"
  echo ""
  echo "Last updated: $(date '+%Y-%m-%d %H:%M')"
  echo ""

  # Git status
  if git rev-parse --git-dir > /dev/null 2>&1; then
    echo "## Git State"
    echo "\`\`\`"
    echo "Branch: $(git branch --show-current)"
    git status --short 2>/dev/null | head -20
    echo "\`\`\`"
    echo ""

    echo "## Recent Commits"
    echo "\`\`\`"
    git log -5 --oneline 2>/dev/null
    echo "\`\`\`"
    echo ""
  fi

  # Recently modified files
  echo "## Recently Modified"
  echo "\`\`\`"
  find . -type f -name "*.ts" -o -name "*.vue" -o -name "*.js" 2>/dev/null | \
    xargs ls -lt 2>/dev/null | head -10 | awk '{print $NF}'
  echo "\`\`\`"
  echo ""

  # Include scratchpad if exists (for grind pattern continuity)
  if [ -f ".claude/scratchpad.md" ]; then
    echo "## Scratchpad State"
    echo ""
    cat ".claude/scratchpad.md"
    echo ""
  fi

  # Include active plan if tracked for this session
  ACTIVE_PLAN=""
  [ -n "$session_id" ] && ACTIVE_PLAN=$(cat ".claude/sessions/.active-plan-${session_id}" 2>/dev/null || echo "")
  if [ -n "$ACTIVE_PLAN" ] && [ -f "$ACTIVE_PLAN" ]; then
    echo "## Active Plan"
    echo ""
    echo "File: $ACTIVE_PLAN"
    echo ""
    head -50 "$ACTIVE_PLAN"
    echo ""
  fi
} > "$SESSION_FILE" 2>/dev/null

exit 0
