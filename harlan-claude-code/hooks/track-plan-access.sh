#!/bin/bash
# PostToolUse(Read|Write|Edit): Track active plan file

source "$(dirname "$0")/check-config.sh"
is_hook_disabled "track-plan-access" && exit 0

# Read hook input from stdin
input=$(cat)
session_id=$(echo "$input" | jq -r '.session_id // empty')
[ -z "$session_id" ] && exit 0

# Get file path from tool input
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty')
[ -z "$file_path" ] && exit 0

# Check if it's a plan file
[[ "$file_path" == *".claude/plans/"*".md" ]] || exit 0

# Store as active plan for this session
mkdir -p .claude/sessions
echo "$file_path" > ".claude/sessions/.active-plan-${session_id}"
