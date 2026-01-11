#!/bin/bash
source "$(dirname "$0")/check-config.sh" 2>/dev/null
is_hook_disabled "eslint" && exit 0

input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty')

# skip non-lintable files
[[ ! "$file_path" =~ \.(js|jsx|ts|tsx|vue|mjs|cjs|md|json|yaml|yml)$ ]] && exit 0

# skip node_modules and dist
[[ "$file_path" =~ node_modules|/dist/|\.nuxt ]] && exit 0

# find eslint - prefer local
if [ -f "node_modules/.bin/eslint" ]; then
  ./node_modules/.bin/eslint "$file_path" --fix 2>&1 || true
elif command -v eslint &>/dev/null; then
  eslint "$file_path" --fix 2>&1 || true
fi
