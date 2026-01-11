#!/bin/bash
input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty')

# skip if no vitest
[ ! -f "node_modules/.bin/vitest" ] && exit 0

# skip node_modules/dist
[[ "$file_path" =~ node_modules|/dist/|\.nuxt ]] && exit 0

# only run on test files or source files with matching tests
if [[ "$file_path" =~ \.(test|spec)\.(ts|js)$ ]]; then
  ./node_modules/.bin/vitest run "$file_path" --reporter=verbose 2>&1 || true
elif [[ "$file_path" =~ \.(ts|js|vue)$ ]]; then
  # check if related test exists
  base="${file_path%.*}"
  for ext in ".test.ts" ".spec.ts" ".test.js" ".spec.js"; do
    if [ -f "${base}${ext}" ]; then
      ./node_modules/.bin/vitest run "${base}${ext}" --reporter=verbose 2>&1 || true
      exit 0
    fi
  done
fi
