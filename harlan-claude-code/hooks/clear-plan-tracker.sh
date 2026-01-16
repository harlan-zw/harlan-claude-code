#!/bin/bash
# SessionStart: Clear active plan tracker for new session

input=$(cat)
session_id=$(echo "$input" | jq -r '.session_id // empty')
[ -z "$session_id" ] && exit 0

# Clean up stale tracking files (older than 24h)
# Note: Don't clear current session files - session-start may have just set them
find .claude -maxdepth 1 -name ".active-plan-*" -mtime +1 -delete 2>/dev/null
find .claude -maxdepth 1 -name ".edit-count-*" -mtime +1 -delete 2>/dev/null
