#!/bin/bash

# PreCompact hook - save context before conversation compaction
# Writes a summary to .claude/session-context.md for reference

SESSION_FILE=".claude/session-context.md"

# Only if .claude dir exists (project is claude-aware)
[ ! -d ".claude" ] && exit 0

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

  # Include active plan if exists
  ACTIVE_PLAN=$(find .claude/plans -name "*.md" -mmin -60 2>/dev/null | head -1)
  if [ -n "$ACTIVE_PLAN" ]; then
    echo "## Active Plan"
    echo ""
    echo "File: $ACTIVE_PLAN"
    echo ""
    head -50 "$ACTIVE_PLAN"
    echo ""
  fi
} > "$SESSION_FILE" 2>/dev/null

exit 0
