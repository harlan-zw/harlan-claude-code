#!/bin/bash
input=$(cat)
command=$(echo "$input" | jq -r '.tool_input.command // empty')

deny() {
  cat <<EOF
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"$1"}}
EOF
  exit 0
}

# run on git commit, push, or gh pr create
[[ ! "$command" =~ ^git[[:space:]]+(commit|push) ]] && [[ ! "$command" =~ ^gh[[:space:]]+pr[[:space:]]+create ]] && exit 0

errors=""

# eslint
if [ -f "node_modules/.bin/eslint" ]; then
  if ! ./node_modules/.bin/eslint . --fix 2>&1; then
    errors+="eslint failed; "
  fi
fi

# typecheck
if [ -f "package.json" ] && grep -q '"typecheck"' package.json 2>/dev/null; then
  if ! pnpm typecheck 2>&1; then
    errors+="typecheck failed; "
  fi
fi

# test
if [ -f "package.json" ] && grep -q '"test"' package.json 2>/dev/null; then
  if ! pnpm test 2>&1; then
    errors+="tests failed; "
  fi
fi

if [ -n "$errors" ]; then
  deny "Pre-push checks failed: ${errors}Fix issues before pushing."
fi
