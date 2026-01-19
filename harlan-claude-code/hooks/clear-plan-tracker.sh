#!/bin/bash
# SessionStart: Clear active plan tracker for new session

input=$(cat)
session_id=$(echo "$input" | jq -r '.session_id // empty')
[ -z "$session_id" ] && exit 0

# Clean up stale tracking files (older than 4h - sessions rarely last that long)
# Note: Don't clear current session files - session-start may have just set them
find .claude/sessions -maxdepth 1 -type f -mmin +240 -delete 2>/dev/null
# Remove empty sessions dir
rmdir .claude/sessions 2>/dev/null || true
