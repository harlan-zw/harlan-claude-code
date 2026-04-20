#!/usr/bin/env bash
set -e
cd "$(dirname "$0")"
if [ -d node_modules ]; then exit 0; fi
if command -v pnpm &>/dev/null; then pnpm install --silent
elif command -v npm &>/dev/null; then npm install --silent
else echo "no package manager found" >&2; exit 1
fi
