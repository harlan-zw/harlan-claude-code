# harlan-claude-code

Personal [Claude Code](https://claude.com/code) plugin for Nuxt/Vue/TypeScript development.

## Installation

```bash
/plugin marketplace add harlan-zw/harlan-claude-code
/plugin install harlan-claude-code
```

## What's Included

### Hooks

| Event | Hook | What it does |
|-------|------|--------------|
| SessionStart | `session-start.sh` | Detect project type, show git status |
| PreCompact | `pre-compact.sh` | Save context before conversation compaction |
| PostToolUse | `eslint.sh` | Auto-lint + fix on file changes |
| PostToolUse | `typecheck.sh` | Run vue-tsc/tsc on TS/Vue changes |
| PostToolUse | `vitest.sh` | Run related tests on file changes |
| PreToolUse | `pnpm-only.sh` | Block npm/yarn commands |
| PreToolUse | `pre-commit-push.sh` | Run lint/typecheck/test before commit/push |

### Skills

| Command | Description |
|---------|-------------|
| `/pkg-init` | Initialize or sync npm package architecture |
| `/nuxt-module-init` | Initialize or sync Nuxt module architecture |
| `/claude-plugin-init` | Initialize or sync Claude Code plugin structure |

### Commands

| Command | Description |
|---------|-------------|
| `/pr` | Create GitHub PR with conventional commit template |

## Per-Project Config

Disable specific hooks by creating `.claude/hooks.json`:

```json
{
  "disabled": ["typecheck", "vitest"]
}
```

## License

MIT
