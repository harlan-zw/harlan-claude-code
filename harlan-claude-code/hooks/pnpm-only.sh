#!/bin/bash
input=$(cat)
command=$(echo "$input" | jq -r '.tool_input.command // empty')

# block npm/yarn install/add commands
if [[ "$command" =~ ^(npm|yarn)[[:space:]]+(install|add|remove|uninstall|i[[:space:]]|ci) ]]; then
  echo '{"decision": "block", "reason": "Use pnpm instead of npm/yarn. Run: pnpm install or pnpm add <pkg>"}'
  exit 0
fi

# block npx -> use pnpx/pnpm dlx
if [[ "$command" =~ ^npx[[:space:]] ]]; then
  echo '{"decision": "block", "reason": "Use pnpx or pnpm dlx instead of npx"}'
  exit 0
fi
