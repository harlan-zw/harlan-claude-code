#!/bin/bash
input=$(cat)
command=$(echo "$input" | jq -r '.tool_input.command // empty')

deny() {
  jq -nc --arg reason "$1" '{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":$reason}}'
  exit 0
}

# Inject commit guidelines for git commit (additionalContext doesn't block)
if [[ "$command" =~ ^git[[:space:]]+commit ]]; then
  cat <<EOF
{"additionalContext": "Commit format: type(scope): description. Types: feat/fix/docs/refactor/test/chore. Scope: monorepo folder or treeshakable export name, omit if neither applies. Subject <72 chars."}
EOF
fi

# run checks only on push
[[ ! "$command" =~ ^git[[:space:]]+push ]] && exit 0

# Run all checks in parallel via check.sh
check_output=$("$(dirname "$0")/check.sh" 2>&1)
check_exit=$?

if [ $check_exit -ne 0 ]; then
  deny "Pre-push checks failed: ${check_output}"
fi
