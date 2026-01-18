#!/bin/bash
# PostToolUse: Log tool usage for pattern analysis
# Only logs Skill/Write/Edit/Task - the signals that matter for improvement

source "$(dirname "$0")/check-config.sh"
is_hook_disabled "usage-log" && exit 0

input=$(cat)
session_id=$(echo "$input" | jq -r '.session_id // empty')
[ -z "$session_id" ] && exit 0

tool_name=$(echo "$input" | jq -r '.tool_name // empty')

# Only log tools that reveal improvement opportunities
case "$tool_name" in
  Skill)
    context=$(echo "$input" | jq -c '{skill: .tool_input.skill}')
    ;;
  Write|Edit)
    file=$(basename "$(echo "$input" | jq -r '.tool_input.file_path // empty')")
    context=$(jq -nc --arg f "$file" '{file: $f}')
    ;;
  Task)
    agent=$(echo "$input" | jq -r '.tool_input.subagent_type // empty')
    context=$(jq -nc --arg a "$agent" '{agent: $a}')
    ;;
  *)
    exit 0
    ;;
esac

# Only log if session was initialized
log_file="$HOME/.claude/logs/sessions/${session_id}.jsonl"
[ -f "$log_file" ] || exit 0

# Append event
jq -nc \
  --arg t "$tool_name" \
  --argjson ts "$(date +%s)" \
  --argjson ctx "$context" \
  '{tool: $t, ts: $ts, ctx: $ctx}' >> "$log_file"
