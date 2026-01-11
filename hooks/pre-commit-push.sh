#!/bin/bash
input=$(cat)
command=$(echo "$input" | jq -r '.tool_input.command // empty')

# run on git commit, push, or gh pr create
[[ ! "$command" =~ ^git[[:space:]]+(commit|push) ]] && [[ ! "$command" =~ ^gh[[:space:]]+pr[[:space:]]+create ]] && exit 0

errors=""

# eslint
if [ -f "node_modules/.bin/eslint" ]; then
  if ! ./node_modules/.bin/eslint . --fix 2>&1; then
    errors+="eslint failed\n"
  fi
fi

# typecheck
if [ -f "package.json" ] && grep -q '"typecheck"' package.json 2>/dev/null; then
  if ! pnpm typecheck 2>&1; then
    errors+="typecheck failed\n"
  fi
fi

# test
if [ -f "package.json" ] && grep -q '"test"' package.json 2>/dev/null; then
  if ! pnpm test 2>&1; then
    errors+="tests failed\n"
  fi
fi

if [ -n "$errors" ]; then
  echo "{\"decision\": \"block\", \"reason\": \"Pre-push checks failed:\\n${errors}Fix issues before pushing.\"}"
  exit 0
fi
