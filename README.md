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
| `session-start.sh` | Detect project type, warn about npm/yarn, suggest CLAUDE.md |

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

## Agents

| Agent | When to use |
|-------|-------------|
| `nuxt-module` | Nuxt module development (runtime vs build, hooks, options) |
| `unjs` | UnJS ecosystem packages (unbuild, defu, pathe patterns) |

## Structure

```
harlan-claude-code/
├── plugin.json
├── README.md
├── hooks/
│   ├── session-start.sh
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
│   └── init-module/
└── agents/
    ├── nuxt-module.md
    └── unjs.md
```

## Customization

### Disabling hooks temporarily

```bash
# In hook script
[ "$SKIP_LINT" = "1" ] && exit 0
```

Then run: `SKIP_LINT=1 claude`

### Hook JSON input

All hooks receive JSON via stdin:

```json
{
  "tool_name": "Write",
  "tool_input": {
    "file_path": "/path/to/file.ts",
    "content": "..."
  }
}
```

### Blocking actions

Return JSON to block a tool call:

```bash
echo '{"decision": "block", "reason": "Reason here"}'
```
