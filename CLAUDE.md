# CLAUDE.md

Claude Code plugin for Nuxt/Vue/TypeScript workflows.

## Structure

```
harlan-claude-code/
  .claude-plugin/plugin.json    # Hook config
  hooks/                        # Bash scripts
  skills/                       # Markdown prompts
  commands/                     # Slash commands
```

## Adding Hooks

1. Create `hooks/[name].sh`
2. Add to `plugin.json` under appropriate event (SessionStart, PreToolUse, PostToolUse, PreCompact, Stop)
3. Source `check-config.sh` for disable support

**Input**: JSON via stdin with `tool_input.*` fields

**Block** (PreToolUse only):
```json
{ "decision": "block", "reason": "message" }
```

**Continue** (Stop only):
```json
{ "decision": "followup_message", "message": "continue working" }
```

## Adding Commands

Create `commands/[name].md` with frontmatter:
```yaml
---
name: command-name
description: Short description
---
```

## Adding Skills

Create `skills/[name]/skill.md` with frontmatter:
```yaml
---
name: skill-name
description: When to use this skill
---
```

## Testing

No build. Install from local:
```bash
/plugin install /path/to/harlan-claude-code
```

Or via marketplace after push:
```bash
/plugin marketplace add harlan-zw/harlan-claude-code
```
