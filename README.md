# harlan-claude-code

Personal Claude Code plugin for Nuxt/Vue/TypeScript development.

## Installation

Already configured in `~/.claude/settings.json`:

```json
{
  "plugins": ["/home/harlan/pkg/harlan-claude-code"]
}
```

## Hooks

### SessionStart

| Hook | Purpose |
|------|---------|
| `session-start.sh` | Detect project type, show git status, warn about npm/yarn |

### PreCompact

| Hook | Purpose |
|------|---------|
| `pre-compact.sh` | Save context to `.claude/session-context.md` before compaction |

### PostToolUse (Write|Edit)

| Hook | Purpose |
|------|---------|
| `eslint.sh` | Auto-lint + fix JS/TS/Vue files |
| `typecheck.sh` | Run vue-tsc/tsc on changes |
| `vitest.sh` | Run related tests on file change |

### PreToolUse (Bash)

| Hook | Purpose |
|------|---------|
| `pnpm-only.sh` | Block npm/yarn, enforce pnpm |

## Skills

| Command | Description |
|---------|-------------|
| `/release` | Bump version, changelog, publish (bumpp) |
| `/typecheck` | Run TypeScript checking |
| `/test` | Run vitest |
| `/playground` | Start Nuxt dev for playground |
| `/build-module` | Build Nuxt module |
| `/pr` | Create GitHub pull request |
| `/stub` | Stub mode for module dev |
| `/update-deps` | Update deps with taze |
| `/check-exports` | Verify exports with attw |
| `/init-module` | Scaffold module or add CLAUDE.md |
| `/changelog` | Generate changelog from commits |
| `/context-prime` | Load comprehensive project context |

## Agents

| Agent | When to use |
|-------|-------------|
| `nuxt-module` | Nuxt module development (runtime vs build, hooks, options) |
| `unjs` | UnJS ecosystem packages (unbuild, defu, pathe patterns) |

## Per-Project Config

Disable hooks per-project by creating `.claude/hooks.json`:

```json
{
  "disabled": ["typecheck", "vitest"]
}
```

Available hook names: `eslint`, `typecheck`, `vitest`

## Structure

```
harlan-claude-code/
├── plugin.json
├── README.md
├── hooks/
│   ├── check-config.sh      # Shared config loader
│   ├── session-start.sh     # Project detection
│   ├── pre-compact.sh       # Context saving
│   ├── eslint.sh
│   ├── typecheck.sh
│   ├── vitest.sh
│   └── pnpm-only.sh
├── skills/
│   ├── release/
│   ├── typecheck/
│   ├── test/
│   ├── playground/
│   ├── build-module/
│   ├── pr/
│   ├── stub/
│   ├── update-deps/
│   ├── check-exports/
│   ├── init-module/
│   ├── changelog/
│   └── context-prime/
└── agents/
    ├── nuxt-module.md
    └── unjs.md
```

## Environment Variables

Disable all hooks for a session:

```bash
SKIP_LINT=1 claude
```

## Resources

- [awesome-claude-code](https://github.com/hesreallyhim/awesome-claude-code) - Community workflows
- [Claude Code Best Practices](https://www.anthropic.com/engineering/claude-code-best-practices)
- [Hooks Reference](https://docs.claude.com/en/docs/claude-code/hooks)
