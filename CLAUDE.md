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
  hooks/                      # Bash scripts
  commands/                   # Slash commands (markdown)
  skills/                     # Multi-file skills (skill.md + templates/)
.claude-plugin/marketplace.json  # Marketplace metadata (version synced on release)
scripts/release.ts            # Version bump script
```

## Architecture

**Dual-directory layout**: Root has workspace tooling (eslint, release script). Actual plugin lives in `harlan-claude-code/` subdirectory.

**Hook lifecycle**:
- `SessionStart`: Show project info, clear plan trackers
- `PreToolUse`: Block npm/yarn, run pre-commit checks
- `PostToolUse`: Lint, typecheck, run tests on Write/Edit
- `PreCompact`: Save context before compaction
- `Stop`: Grind hook continues incomplete scratchpad work

**Disable hooks per-project**: Create `.claude/hooks.json` with `{"disabled": ["typecheck", "vitest"]}`

## Adding Components

**Hook**: Create `hooks/[name].sh`, add to `plugin.json`. Source `check-config.sh` for disable support. Input via stdin JSON (`tool_input.*`). Block with `{"decision":"block","reason":"..."}`. Continue (Stop only) with `{"decision":"followup_message","message":"..."}`.

**Command**: Create `commands/[name].md` with `name` and `description` frontmatter.

**Skill**: Create `skills/[name]/skill.md` with frontmatter. Add `templates/` subdir for scaffolding files.

## Testing

No build needed. Install locally:
```bash
/plugin install /path/to/harlan-claude-code
```
