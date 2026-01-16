<p align="center">
  <a href="https://github.com/harlan-zw/harlan-claude-code">
    <img src=".github/banner.png" alt="harlan-claude-code banner" width="100%">
  </a>
</p>

# harlan-claude-code

Personal [Claude Code](https://claude.com/code) plugin for Nuxt/Vue/TypeScript workflows.

> [!IMPORTANT]
> This is a personal plugin with opinionated defaults. Use as inspiration or fork for your own setup.

## Features

- **Auto-linting** - ESLint runs on file changes with auto-fix
- **Type checking** - vue-tsc/tsc validation on TypeScript/Vue changes
- **Test runner** - Vitest runs related tests automatically
- **pnpm enforcer** - Blocks npm/yarn commands
- **Pre-commit checks** - Validates lint/types/tests before commits
- **Session context** - Shows project info and git status on start
- **Grind mode** - Auto-continues incomplete scratchpad work

## Quick Start

```bash
/plugin marketplace add harlan-zw/harlan-claude-code
/plugin install harlan-claude-code
```

## Hooks

| Event | Hook | Description |
|-------|------|-------------|
| SessionStart | `session-start.sh` | Detect project type, show git status |
| PreCompact | `pre-compact.sh` | Save context before conversation compaction |
| PostToolUse | `eslint.sh` | Auto-lint + fix on file changes |
| PostToolUse | `typecheck.sh` | Run vue-tsc/tsc on TS/Vue changes |
| PostToolUse | `vitest.sh` | Run related tests on file changes |
| PreToolUse | `pnpm-only.sh` | Block npm/yarn commands |
| PreToolUse | `pre-commit-push.sh` | Run lint/typecheck/test before commit/push |
| Stop | `grind.sh` | Continue incomplete scratchpad work |

## Skills

| Command | Description |
|---------|-------------|
| `/pkg-init` | Initialize or sync npm package architecture |
| `/nuxt-module-init` | Initialize or sync Nuxt module architecture |
| `/claude-plugin-init` | Initialize or sync Claude Code plugin structure |
| `/tdd` | Test-driven development workflow |

## Commands

| Command | Description |
|---------|-------------|
| `/pr` | Create GitHub PR with conventional commit template |
| `/save-plan` | Save current plan to `.claude/plans/` |
| `/resume` | Resume interrupted work from scratchpad |
| `/review` | Review recent changes for issues |
| `/debug` | Hypothesis-driven debugging |
| `/diagram` | Generate architecture diagrams |
| `/fix-issue` | Fetch GitHub issue, implement fix, create PR |
| `/issue-triage` | Triage open issues by difficulty |

## Configuration

Disable specific hooks per-project by creating `.claude/hooks.json`:

```json
{
  "disabled": ["typecheck", "vitest"]
}
```

## License

Licensed under the [MIT license](https://github.com/harlan-zw/harlan-claude-code/blob/main/LICENSE).
