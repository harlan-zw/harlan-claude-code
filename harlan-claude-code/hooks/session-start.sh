#!/bin/bash

# Context-aware session start
# Detects project type, shows relevant info, primes context

source "$(dirname "$0")/check-config.sh"

# Read session_id from stdin for plan tracking
input=$(cat)
session_id=$(echo "$input" | jq -r '.session_id // empty')

show() { echo -e "\033[36m$1\033[0m"; }
dim() { echo -e "\033[90m$1\033[0m"; }
warn() { echo -e "\033[33m$1\033[0m"; }

# Check for package.json
if [ -f "package.json" ]; then
  name=$(jq -r '.name // "unnamed"' package.json 2>/dev/null)

  # Detect project type
  if [ -f "src/module.ts" ] || grep -q "nuxt-module-build" package.json 2>/dev/null; then
    show "Nuxt Module: $name"
  elif [ -f "nuxt.config.ts" ]; then
    show "Nuxt App: $name"
  elif [ -f "build.config.ts" ]; then
    show "UnJS Package: $name"
  elif grep -q '"vue"' package.json 2>/dev/null; then
    show "Vue Project: $name"
  else
    show "Node Project: $name"
  fi

  # Git info
  if git rev-parse --git-dir > /dev/null 2>&1; then
    branch=$(git branch --show-current 2>/dev/null)
    if ! git diff-index --quiet HEAD -- 2>/dev/null; then
      dim "Branch: $branch (dirty)"
    else
      dim "Branch: $branch"
    fi

    # Last commit
    last=$(git log -1 --format="%s" 2>/dev/null | head -c 50)
    [ -n "$last" ] && dim "Last: $last"
  fi

  # Package manager check
  if [ -f "pnpm-lock.yaml" ]; then
    :
  elif [ -f "package-lock.json" ]; then
    warn "npm detected - use pnpm"
  elif [ -f "yarn.lock" ]; then
    warn "yarn detected - use pnpm"
  fi
fi

# CLAUDE.md hint
if [ ! -f ".claude/CLAUDE.md" ] && [ ! -f "CLAUDE.md" ]; then
  dim "Tip: /init-module to add CLAUDE.md"
fi

# Check for incomplete work (grind pattern) - plans preferred over scratchpad
active_plan_found=""
if [ -d ".claude/plans" ]; then
  # Find most recent non-DONE plan (portable: works on macOS and Linux)
  for plan in $(find .claude/plans -name "*.md" -mtime -30 2>/dev/null | xargs ls -t 2>/dev/null); do
    if [ -f "$plan" ]; then
      content=$(cat "$plan")
      if ! is_work_done "$content"; then
        plan_name=$(basename "$plan" .md)
        active_plan_found="$plan"

        # Write active plan tracker so grind.sh can continue it
        if [ -n "$session_id" ]; then
          mkdir -p .claude
          echo "$plan" > ".claude/.active-plan-${session_id}"
        fi

        if is_work_blocked "$content"; then
          warn "Plan '$plan_name': BLOCKED - needs attention"
        else
          goal=$(grep -A1 "## Goal\|## Current\|## Objective" "$plan" 2>/dev/null | tail -1 | head -c 60)
          warn "Resume plan '$plan_name': $goal..."
        fi
        break
      fi
    fi
  done
fi

# Only show scratchpad if no active plan (prefer plans)
if [ -z "$active_plan_found" ] && [ -f ".claude/scratchpad.md" ]; then
  content=$(cat .claude/scratchpad.md)
  if is_work_blocked "$content"; then
    warn "Scratchpad: BLOCKED"
  elif ! is_work_done "$content"; then
    goal=$(grep -A1 "## Goal\|## Current" .claude/scratchpad.md 2>/dev/null | tail -1 | head -c 50)
    [ -n "$goal" ] && warn "Scratchpad: $goal..."
  fi
elif [ -z "$active_plan_found" ]; then
  dim "Tip: For complex tasks, use .claude/scratchpad.md for autonomous iteration"
fi
