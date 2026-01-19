#!/bin/bash
# Stop: Clean up session tracking files and log session end

source "$(dirname "$0")/check-config.sh"

input=$(cat)
session_id=$(echo "$input" | jq -r '.session_id // empty')
[ -z "$session_id" ] && exit 0

# Always clean up session tracking files
rm -f ".claude/sessions/.active-plan-${session_id}" ".claude/sessions/.edit-count-${session_id}" 2>/dev/null
rmdir .claude/sessions 2>/dev/null

# Log session end (if logging enabled)
is_hook_disabled "usage-log" && exit 0

log_file="$HOME/.claude/logs/sessions/${session_id}.jsonl"
[ -f "$log_file" ] || exit 0

event_count=$(wc -l < "$log_file")
jq -nc \
  --argjson ts "$(date +%s)" \
  --argjson events "$event_count" \
  '{type: "session_end", ts: $ts, events: $events}' >> "$log_file"
