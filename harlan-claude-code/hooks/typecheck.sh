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

# suggest typecheck command - let Claude decide when to run
if [ -f "nuxt.config.ts" ] || [ -f "nuxt.config.js" ]; then
  echo "Run \`pnpm nuxt typecheck\` to typecheck after edits complete"
elif [ -f "node_modules/.bin/vue-tsc" ]; then
  echo "Run \`pnpm vue-tsc --noEmit\` to typecheck after edits complete"
elif [ -f "node_modules/.bin/tsc" ]; then
  echo "Run \`pnpm tsc --noEmit\` to typecheck after edits complete"
fi
