#!/bin/bash
source "$(dirname "$0")/check-config.sh" 2>/dev/null
is_hook_disabled "typecheck" && exit 0

input=$(cat)
file_path=$(echo "$input" | jq -r '.tool_input.file_path // empty')

# only check ts/vue files
[[ ! "$file_path" =~ \.(ts|tsx|vue)$ ]] && exit 0

# skip node_modules/dist
[[ "$file_path" =~ node_modules|/dist/|\.nuxt ]] && exit 0

# check if tsconfig exists
[ ! -f "tsconfig.json" ] && [ ! -f "tsconfig.app.json" ] && exit 0

# nuxt projects use nuxt typecheck, not vue-tsc/tsc
if [ -f "nuxt.config.ts" ] || [ -f "nuxt.config.js" ]; then
  pnpm nuxt typecheck 2>&1 | head -30 || true
elif [ -f "node_modules/.bin/vue-tsc" ]; then
  ./node_modules/.bin/vue-tsc --noEmit 2>&1 | head -30 || true
elif [ -f "node_modules/.bin/tsc" ]; then
  ./node_modules/.bin/tsc --noEmit 2>&1 | head -30 || true
fi
