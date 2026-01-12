#!/bin/bash
input=$(cat)
command=$(echo "$input" | jq -r '.tool_input.command // empty')

deny() {
  cat <<EOF
{"hookSpecificOutput":{"hookEventName":"PreToolUse","permissionDecision":"deny","permissionDecisionReason":"$1"}}
EOF
  exit 0
}

# block npm/yarn install/add commands
if [[ "$command" =~ ^(npm|yarn)[[:space:]]+(install|add|remove|uninstall|i[[:space:]]|ci) ]]; then
  deny "Use pnpm instead of npm/yarn. Run: pnpm install or pnpm add <pkg>"
fi

# block npx -> use pnpx/pnpm dlx
if [[ "$command" =~ ^npx[[:space:]] ]]; then
  deny "Use pnpx or pnpm dlx instead of npx"
fi
