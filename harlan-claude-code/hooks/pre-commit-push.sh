#!/bin/bash
input=$(cat)
command=$(echo "$input" | jq -r '.tool_input.command // empty')

deny() {
  cat <<EOF
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"$1"}}
EOF
  exit 0
}

# Inject commit guidelines for git commit (additionalContext doesn't block)
if [[ "$command" =~ ^git[[:space:]]+commit ]]; then
  cat <<EOF
{"additionalContext": "Commit format: type(scope): description. Types: feat/fix/docs/refactor/test/chore. Scope: monorepo folder or treeshakable export name, omit if neither applies. Subject <72 chars."}
EOF
fi

# run checks only on push/pr
[[ ! "$command" =~ ^git[[:space:]]+push ]] && [[ ! "$command" =~ ^gh[[:space:]]+pr[[:space:]]+create ]] && exit 0

# Run checks in parallel for speed
tmpdir=$(mktemp -d)
trap 'rm -rf "$tmpdir"' EXIT

# eslint (background)
if [ -f "node_modules/.bin/eslint" ]; then
  (./node_modules/.bin/eslint . --fix 2>&1 || echo "FAILED" > "$tmpdir/eslint") &
fi

# typecheck (background)
if [ -f "package.json" ] && grep -q '"typecheck"' package.json 2>/dev/null; then
  (pnpm typecheck 2>&1 || echo "FAILED" > "$tmpdir/typecheck") &
fi

# test (background)
if [ -f "package.json" ] && grep -q '"test"' package.json 2>/dev/null; then
  (pnpm test 2>&1 || echo "FAILED" > "$tmpdir/test") &
fi

wait

# Collect errors
errors=""
[ -f "$tmpdir/eslint" ] && errors+="eslint failed; "
[ -f "$tmpdir/typecheck" ] && errors+="typecheck failed; "
[ -f "$tmpdir/test" ] && errors+="tests failed; "

if [ -n "$errors" ]; then
  deny "Pre-push checks failed: ${errors}Fix issues before pushing."
fi
