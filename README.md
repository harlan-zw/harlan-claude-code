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

### Skills

| Command | Description |
|---------|-------------|
| `/release` | Bump version, changelog, publish (bumpp) |
| `/typecheck` | Run TypeScript checking |
| `/test` | Run vitest |
| `/playground` | Start Nuxt dev for playground |
| `/build-module` | Build Nuxt module |
| `/stub` | Stub mode for fast dev iteration |
| `/pr` | Create GitHub pull request |
| `/update-deps` | Update deps with taze |
| `/check-exports` | Verify exports with attw |
| `/init-module` | Scaffold module or add CLAUDE.md |
| `/changelog` | Generate changelog from commits |
| `/context-prime` | Load comprehensive project context |

### Agents

| Agent | When to use |
|-------|-------------|
| `nuxt-module` | Nuxt module development - runtime vs build context, hooks, options |
| `unjs` | UnJS packages - unbuild, defu, pathe, consola patterns |

## Per-Project Config

Disable specific hooks by creating `.claude/hooks.json`:

```json
{
  "disabled": ["typecheck", "vitest"]
}
```

## License

MIT
