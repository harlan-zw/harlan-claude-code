#!/bin/bash
source "$(dirname "$0")/check-config.sh" 2>/dev/null
is_hook_disabled "eslint" && exit 0

input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty')

# skip non-lintable files
[[ ! "$file_path" =~ \.(js|jsx|ts|tsx|vue|mjs|cjs|md|json|yaml|yml|md)$ ]] && exit 0

# skip node_modules and dist
[[ "$file_path" =~ node_modules|/dist/|\.nuxt ]] && exit 0

# find eslint binary
ESLINT=""
if [ -f "node_modules/.bin/eslint" ]; then
  ESLINT="./node_modules/.bin/eslint"
elif command -v eslint &>/dev/null; then
  ESLINT="eslint"
fi
[ -z "$ESLINT" ] && exit 0

# run --fix with unused-imports disabled (don't auto-remove, code may be partial)
# prefer-const disabled - let vars may be reassigned in code not yet written
"$ESLINT" "$file_path" --fix \
  --rule 'unused-imports/no-unused-imports: off' \
  --rule 'unused-imports/no-unused-vars: off' \
  --rule 'prefer-const: off' 2>&1 | grep -v "could not find plugin" || true

# then report unused imports/vars as warnings only (no fix)
"$ESLINT" "$file_path" \
  --rule 'unused-imports/no-unused-imports: warn' \
  --rule 'unused-imports/no-unused-vars: warn' 2>&1 | grep -v "could not find plugin" || true
