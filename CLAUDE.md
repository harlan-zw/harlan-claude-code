# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Personal Claude Code plugin for Nuxt/Vue/TypeScript development. Provides hooks, skills, and commands for standardized workflow automation.

## Repository Structure

```
harlan-claude-code/           # The actual plugin (installed by marketplace)
  .claude-plugin/
    plugin.json               # Hook configuration, triggers on tool events
  hooks/                      # Bash scripts executed on lifecycle events
  skills/                     # Markdown prompts for complex tasks
  commands/                   # Slash commands
README.md                     # Marketplace listing
CLAUDE.md                     # This file
```

## Plugin Components

**Hooks** (`harlan-claude-code/hooks/`):
- `session-start.sh` - SessionStart: detect project type, show git status
- `pre-compact.sh` - PreCompact: save context to .claude/session-context.md
- `eslint.sh` - PostToolUse(Write|Edit): auto-lint changed files
- `typecheck.sh` - PostToolUse(Write|Edit): run vue-tsc/tsc
- `vitest.sh` - PostToolUse(Write|Edit): run related tests
- `pnpm-only.sh` - PreToolUse(Bash): block npm/yarn, suggest pnpm
- `pre-commit-push.sh` - PreToolUse(Bash): run lint/typecheck/test before commit/push
- `check-config.sh` - Shared config loader (checks .claude/hooks.json)

**Skills** (`harlan-claude-code/skills/`):
- `pkg-init/` - scaffold/sync npm packages
- `nuxt-module-init/` - scaffold/sync Nuxt modules
- `claude-plugin-init/` - scaffold/sync Claude Code plugins

**Commands** (`harlan-claude-code/commands/`):
- `pr.md` - create PR with conventional commit template

## Hook Patterns

**Input**: Hooks receive JSON via stdin with `tool_input.file_path` or `tool_input.command`

**Blocking**: PreToolUse hooks block with:
```json
{ "decision": "block", "reason": "Use pnpm instead of npm" }
```

**Per-project disable**: Target projects create `.claude/hooks.json`:
```json
{ "disabled": ["typecheck", "vitest"] }
```

## Testing

No build. Test via marketplace install:
```bash
/plugin marketplace add harlan-zw/harlan-claude-code
/plugin install harlan-claude-code
```
