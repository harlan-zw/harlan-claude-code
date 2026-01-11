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
| `/release` | Bump version, changelog, publish |
| `/typecheck` | Run TypeScript checking |
| `/test` | Run vitest |
| `/playground` | Start Nuxt dev for playground |
| `/build-module` | Build Nuxt module |

## Agents

| Agent | Trigger |
|-------|---------|
| `nuxt-module` | Nuxt module dev context |

## Structure

```
harlan-claude-code/
├── plugin.json
├── hooks/
│   ├── eslint.sh
│   ├── typecheck.sh
│   ├── vitest.sh
│   └── pnpm-only.sh
├── skills/
│   ├── release/skill.md
│   ├── typecheck/skill.md
│   ├── test/skill.md
│   ├── playground/skill.md
│   └── build-module/skill.md
└── agents/
    └── nuxt-module.md
```

## Customization

Edit hooks in `hooks/` directory. All hooks receive JSON via stdin:

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

Return JSON to block:

```bash
echo '{"decision": "block", "reason": "Reason here"}'
```

### Disabling hooks temporarily

Comment out in `plugin.json` or use env var in hook:

```bash
[ "$SKIP_LINT" = "1" ] && exit 0
```
