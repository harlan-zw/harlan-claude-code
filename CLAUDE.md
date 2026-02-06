# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Overview

Claude Code plugin for Nuxt/Vue/TypeScript workflows. No build step - pure bash hooks and markdown skills.

## Commands

```bash
pnpm lint          # ESLint check
pnpm lint:fix      # ESLint autofix
pnpm release patch|minor|major  # Bump version, tag, push
```

## Structure

```
harlan-claude-code/           # Plugin root (nested to allow workspace tooling)
  .claude-plugin/plugin.json  # Manifest with hook config
  hooks/                      # Bash scripts (7 hooks)
  skills/                     # Skills (SKILL.md + optional templates/)
.claude-plugin/marketplace.json  # Marketplace metadata (version synced on release)
scripts/release.ts            # Version bump script (syncs plugin.json, marketplace.json, skill frontmatter)
```

## Architecture

**Dual-directory layout**: Root has workspace tooling (eslint, release script). Actual plugin lives in `harlan-claude-code/` subdirectory.

**Hook lifecycle**:
- `SessionStart`: Detect project type (Nuxt Module/App, UnJS, Vue, Node), show git info, warn if not pnpm
- `PreToolUse` (Bash): Block npm/yarn/npx (`pnpm-only.sh`), run parallel lint+typecheck+test on commit/push (`pre-commit-push.sh`)
- `PostToolUse` (Write|Edit): Auto-fix eslint, suggest typecheck, run related vitest

**Disable hooks per-project**: Create `.claude/hooks.json` with `{"disabled": ["typecheck", "vitest"]}`

**Skills**: `pkg-init` (scaffold/sync packages), `issue-triage` (batch analyze GitHub issues), `pr` (conventional commit PRs), `tweet` (draft + screenshot wrapper)

## Adding Components

**Hook**: Create `hooks/[name].sh`, add to `plugin.json`. Source `check-config.sh` for disable support. Input via stdin JSON (`tool_input.*`). Block with `{"decision":"block","reason":"..."}`. Continue (Stop only) with `{"decision":"followup_message","message":"..."}`.

**Skill**: Create `skills/[name]/SKILL.md` with frontmatter (`description`, `user_invocable: true`). Add `templates/` subdir for scaffolding files.

## Testing

No build needed. Install locally:
```bash
/plugin install /path/to/harlan-claude-code
```
