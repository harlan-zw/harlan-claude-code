#!/bin/bash
# Shared config loader for hooks
# Source this in other hooks: source "$(dirname "$0")/check-config.sh"

# Check for project-level hook config
HOOK_CONFIG=".claude/hooks.json"

is_hook_disabled() {
  local hook_name="$1"
  if [ -f "$HOOK_CONFIG" ]; then
    disabled=$(jq -r ".disabled // [] | index(\"$hook_name\") // empty" "$HOOK_CONFIG" 2>/dev/null)
    [ -n "$disabled" ] && return 0
  fi
  return 1
}

# Helper: extract session_id from hook input JSON
get_session_id() { echo "$1" | jq -r '.session_id // empty'; }

# Helper: cleanup session tracking files
cleanup_session_files() {
  local sid="$1"
  [ -z "$sid" ] && return
  rm -f ".claude/sessions/.active-plan-${sid}" ".claude/sessions/.edit-count-${sid}" 2>/dev/null
  rmdir .claude/sessions 2>/dev/null || true
}

# Shared workfile status patterns (unified across all hooks)
is_work_done() {
  echo "$1" | grep -qi "^## *DONE\|^DONE\|status:.*done\|✅.*done\|done.*✅"
}

is_work_blocked() {
  echo "$1" | grep -qi "^## *BLOCKED\|^BLOCKED\|status:.*blocked\|❌.*blocked"
}

has_active_work() {
  # Unchecked checkboxes are definitive active work
  echo "$1" | grep -q "\- \[ \]" && return 0
  # "In Progress" or "Current Task" headers indicate active work
  echo "$1" | grep -qi "## *in.progress\|## *current.task\|status:.*in.progress" && return 0
  return 1
}

# Usage in other hooks:
# source "$(dirname "$0")/check-config.sh"
# is_hook_disabled "eslint" && exit 0
