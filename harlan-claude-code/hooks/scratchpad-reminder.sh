#!/bin/bash
# PostToolUse(Write|Edit): Remind to update workfile every N edits

source "$(dirname "$0")/check-config.sh"
is_hook_disabled "scratchpad-reminder" && exit 0

# Read hook input from stdin
input=$(cat)
session_id=$(echo "$input" | jq -r '.session_id // empty')
[ -z "$session_id" ] && exit 0

# Check for active plan (tracked via track-plan-access or session-start hooks)
active_plan=$(cat ".claude/.active-plan-${session_id}" 2>/dev/null || echo "")
has_scratchpad=false
[ -f ".claude/scratchpad.md" ] && has_scratchpad=true

# Exit if no workfile exists
[ -z "$active_plan" ] && [ "$has_scratchpad" = false ] && exit 0

# Determine which workfile to check and skip if already DONE
if [ -n "$active_plan" ] && [ -f "$active_plan" ]; then
  content=$(cat "$active_plan")
  is_work_done "$content" && exit 0
elif [ "$has_scratchpad" = true ]; then
  content=$(cat ".claude/scratchpad.md")
  is_work_done "$content" && exit 0
fi

# Track edits per session
count_file=".claude/.edit-count-${session_id}"
count=$(($(cat "$count_file" 2>/dev/null || echo 0) + 1))
echo "$count" > "$count_file"

# Remind every 10 edits
if [ $((count % 10)) -eq 0 ]; then
  if [ -n "$active_plan" ]; then
    echo "📝 Update $active_plan with progress (edit #$count)"
  else
    echo "📝 Update .claude/scratchpad.md with progress (edit #$count)"
  fi
fi
