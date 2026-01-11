#!/bin/bash
input=$(cat)
command=$(echo "$input" | jq -r '.tool_input.command // empty')

# block npm/yarn install/add commands
if [[ "$command" =~ ^(npm|yarn)[[:space:]]+(install|add|remove|uninstall|i[[:space:]]|ci) ]]; then
  echo '{"decision": "block", "reason": "Use pnpm instead of npm/yarn. Run: pnpm install or pnpm add <pkg>"}'
  exit 0
fi

# also catch npx when pnpm dlx should be used
if [[ "$command" =~ ^npx[[:space:]] ]]; then
  echo "Note: prefer 'pnpm dlx' over 'npx'"
fi
