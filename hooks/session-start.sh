#!/bin/bash

# Detect project type and show relevant info

show_info() {
  echo -e "\033[36m$1\033[0m"
}

# Check for package.json
if [ -f "package.json" ]; then
  name=$(jq -r '.name // "unnamed"' package.json)

  # Detect project type
  if [ -f "src/module.ts" ] || grep -q "nuxt-module-build" package.json 2>/dev/null; then
    show_info "Nuxt Module: $name"
  elif [ -f "nuxt.config.ts" ]; then
    show_info "Nuxt App: $name"
  elif [ -f "build.config.ts" ]; then
    show_info "UnJS Package: $name"
  elif grep -q '"vue"' package.json 2>/dev/null; then
    show_info "Vue Project: $name"
  else
    show_info "Node Project: $name"
  fi

  # Check package manager
  if [ -f "pnpm-lock.yaml" ]; then
    :  # good, pnpm
  elif [ -f "package-lock.json" ]; then
    echo -e "\033[33mWarning: npm detected, consider using pnpm\033[0m"
  elif [ -f "yarn.lock" ]; then
    echo -e "\033[33mWarning: yarn detected, consider using pnpm\033[0m"
  fi
fi

# Check for CLAUDE.md
if [ ! -f ".claude/CLAUDE.md" ] && [ ! -f "CLAUDE.md" ]; then
  echo -e "\033[90mTip: Add .claude/CLAUDE.md for project context\033[0m"
fi
